import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect
from sqlalchemy.exc import OperationalError
from app.database import engine, Base, SessionLocal
from app.models import (
    User, Address, Category, SubCategory, Product, CartItem, Order, OrderItem, OrderStatusHistory, PaymentEvent,
    CancellationRequest, ReturnRequest, ReturnRequestItem
)
from app.seed import seed_database
from app.routers import auth, categories, subcategories, products, addresses, cart, orders, dashboard, webhooks, cancellation_requests, return_requests


def run_migrations(db):
    """Run database migrations for schema changes."""
    inspector = inspect(engine)

    if "orders" not in inspector.get_table_names():
        return

    # Step 1: Convert status column from enum to varchar if the enum type exists
    row = db.execute(text("SELECT 1 FROM pg_type WHERE typname = 'orderstatus'")).fetchone()
    if row:
        db.execute(text("ALTER TABLE orders ALTER COLUMN status DROP DEFAULT"))
        db.execute(text("ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(20) USING status::text"))
        db.execute(text("ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'confirmed'"))
        db.execute(text("DROP TYPE IF EXISTS orderstatus"))
        db.commit()
        print("Converted status column from enum to VARCHAR(20)")

    # Step 2: Add cancellation_reason column if missing
    columns = [col["name"] for col in inspector.get_columns("orders")]
    if "cancellation_reason" not in columns:
        db.execute(text("ALTER TABLE orders ADD COLUMN cancellation_reason TEXT"))
        db.commit()
        print("Added cancellation_reason column to orders table")

    # Step 3: Migrate any remaining 'pending' statuses to 'confirmed'
    db.execute(text("UPDATE orders SET status = 'confirmed' WHERE status = 'pending'"))
    db.commit()

    # Step 4: Add returnable fields to products table
    if "products" in inspector.get_table_names():
        product_columns = [col["name"] for col in inspector.get_columns("products")]
        if "is_returnable" not in product_columns:
            db.execute(text("ALTER TABLE products ADD COLUMN is_returnable BOOLEAN DEFAULT FALSE NOT NULL"))
            db.execute(text("ALTER TABLE products ADD COLUMN return_window_days INTEGER"))
            db.commit()
            print("Added returnable fields to products table")

    print("Database migrations completed.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler: create tables and seed data on startup."""
    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as e:
        masked_url = str(engine.url).split("@")[-1] if "@" in str(engine.url) else str(engine.url)
        print("\n" + "=" * 70)
        print("  DATABASE CONNECTION FAILED")
        print("=" * 70)
        print(f"  Could not connect to the database at: {masked_url}")
        print()
        print("  The server cannot start without a database. Common causes:")
        print("    1. Supabase project is PAUSED  -> resume it in the dashboard")
        print("    2. Wrong DATABASE_URL in backend/.env")
        print("       Supabase now requires the connection POOLER host, e.g.:")
        print("       postgresql://postgres.<ref>:<pw>@aws-0-<region>"
              ".pooler.supabase.com:5432/postgres")
        print("    3. No internet / DNS or firewall blocking the host")
        print()
        print(f"  Underlying error: {e.orig}")
        print("=" * 70 + "\n")
        sys.stdout.flush()
        # Exit immediately so Starlette/uvicorn doesn't re-raise and dump the
        # full traceback on top of our readable message.
        os._exit(1)
    print("Database tables created.")

    db = SessionLocal()
    try:
        run_migrations(db)
    except Exception as e:
        print(f"Migration error: {e}")
        db.rollback()
    try:
        seed_database(db)
    except Exception as e:
        print(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()

    yield


app = FastAPI(
    title="E-Commerce API",
    description="Full-featured e-commerce backend with Stripe integration",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(subcategories.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(addresses.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")
app.include_router(cancellation_requests.router, prefix="/api")
app.include_router(return_requests.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "E-Commerce API is running", "version": "1.0.0"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
