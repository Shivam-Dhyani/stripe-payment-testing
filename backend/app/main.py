from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect
from app.database import engine, Base, SessionLocal
from app.models import (
    User, Address, Category, SubCategory, Product, CartItem, Order, OrderItem, OrderStatusHistory, PaymentEvent
)
from app.seed import seed_database
from app.routers import auth, categories, subcategories, products, addresses, cart, orders, dashboard, webhooks


def run_migrations(db):
    """Run database migrations for schema changes."""
    inspector = inspect(engine)

    if "orders" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("orders")]

        if "cancellation_reason" not in columns:
            db.execute(text("ALTER TABLE orders ADD COLUMN cancellation_reason TEXT"))
            print("Added cancellation_reason column to orders table")

        # Change status column from enum to varchar if needed
        status_col = next((col for col in inspector.get_columns("orders") if col["name"] == "status"), None)
        if status_col and "VARCHAR" not in str(status_col["type"]).upper() and "TEXT" not in str(status_col["type"]).upper():
            db.execute(text("ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(20) USING status::text"))
            print("Changed status column type to VARCHAR(20)")

        # Migrate 'pending' statuses to 'confirmed'
        db.execute(text("UPDATE orders SET status = 'confirmed' WHERE status = 'pending'"))

        db.commit()
        print("Database migrations completed.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler: create tables and seed data on startup."""
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")

    db = SessionLocal()
    try:
        run_migrations(db)
        seed_database(db)
    except Exception as e:
        print(f"Startup error: {e}")
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


@app.get("/")
def root():
    return {"message": "E-Commerce API is running", "version": "1.0.0"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
