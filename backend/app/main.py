import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect
from sqlalchemy.exc import OperationalError
from app.database import engine, Base, SessionLocal
from app.models import (
    User, Address, Warehouse, Category, SubCategory, Product, CartItem, Order, OrderItem, OrderStatusHistory,
    PaymentEvent, CancellationRequest, ReturnRequest, ReturnRequestItem
)
from app.seed import seed_database, ensure_operational_data
from app.routers import (
    auth, categories, subcategories, products, addresses, cart, orders, dashboard, webhooks,
    cancellation_requests, return_requests, warehouses, push, ws
)


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

    # Step 5: Convert users.role from enum to VARCHAR so new roles can be added freely
    role_enum = db.execute(text("SELECT 1 FROM pg_type WHERE typname = 'userrole'")).fetchone()
    if role_enum:
        db.execute(text("ALTER TABLE users ALTER COLUMN role DROP DEFAULT"))
        db.execute(text("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20) USING role::text"))
        db.execute(text("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'customer'"))
        db.execute(text("DROP TYPE IF EXISTS userrole"))
        db.commit()
        print("Converted users.role from enum to VARCHAR(20)")

    # Step 6: Add warehouse_id and delivery_partner_id to orders (quick-commerce wiring)
    order_columns = [col["name"] for col in inspector.get_columns("orders")]
    if "warehouse_id" not in order_columns:
        db.execute(text("ALTER TABLE orders ADD COLUMN warehouse_id VARCHAR(36)"))
        db.commit()
        print("Added warehouse_id column to orders table")
    if "delivery_partner_id" not in order_columns:
        db.execute(text("ALTER TABLE orders ADD COLUMN delivery_partner_id VARCHAR(36)"))
        db.commit()
        print("Added delivery_partner_id column to orders table")

    # Step 7: Remap legacy order statuses to the quick-commerce lifecycle
    status_map = {"confirmed": "placed", "processing": "picking", "shipped": "out_for_delivery"}
    remapped = False
    for old, new in status_map.items():
        r1 = db.execute(text("UPDATE orders SET status = :new WHERE status = :old"), {"new": new, "old": old})
        db.execute(text("UPDATE order_status_history SET to_status = :new WHERE to_status = :old"), {"new": new, "old": old})
        db.execute(text("UPDATE order_status_history SET from_status = :new WHERE from_status = :old"), {"new": new, "old": old})
        if r1.rowcount:
            remapped = True
    db.execute(text("ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'placed'"))
    db.commit()
    if remapped:
        print("Remapped legacy order statuses to quick-commerce lifecycle")

    # Step 8: Add payment tracking columns to orders
    order_columns = [col["name"] for col in inspector.get_columns("orders")]
    if "payment_status" not in order_columns:
        db.execute(text("ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending' NOT NULL"))
        db.execute(text("ALTER TABLE orders ADD COLUMN refunded_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL"))
        db.execute(text("ALTER TABLE orders ADD COLUMN receipt_url VARCHAR(500)"))
        # Existing orders with a payment intent are considered paid.
        db.execute(text(
            "UPDATE orders SET payment_status = 'paid' "
            "WHERE stripe_payment_intent_id IS NOT NULL AND status NOT IN ('cancelled', 'refunded')"
        ))
        db.execute(text("UPDATE orders SET payment_status = 'refunded' WHERE status = 'refunded'"))
        db.commit()
        print("Added payment tracking columns to orders table")

    # Step 9: Add delivery partner (rider) to return requests for pickup
    if "return_requests" in inspector.get_table_names():
        rr_columns = [col["name"] for col in inspector.get_columns("return_requests")]
        if "delivery_partner_id" not in rr_columns:
            db.execute(text("ALTER TABLE return_requests ADD COLUMN delivery_partner_id VARCHAR(36)"))
            db.commit()
            print("Added delivery_partner_id column to return_requests table")

    # Step 10: Widen products.image_url to TEXT (holds long generated-image URLs)
    if "products" in inspector.get_table_names():
        img_col = next((c for c in inspector.get_columns("products") if c["name"] == "image_url"), None)
        if img_col is not None and "VARCHAR" in str(img_col["type"]).upper():
            db.execute(text("ALTER TABLE products ALTER COLUMN image_url TYPE TEXT"))
            db.commit()
            print("Widened products.image_url to TEXT")

    # Step 11: Add pack-size unit to products (quick-commerce catalog)
    if "products" in inspector.get_table_names():
        product_cols = [c["name"] for c in inspector.get_columns("products")]
        if "unit" not in product_cols:
            db.execute(text("ALTER TABLE products ADD COLUMN unit VARCHAR(50)"))
            db.commit()
            print("Added unit column to products table")

    # Step 12: Add order_number + delivery_fee to orders; backfill numbers.
    if "orders" in inspector.get_table_names():
        order_cols = [c["name"] for c in inspector.get_columns("orders")]
        if "delivery_fee" not in order_cols:
            db.execute(text("ALTER TABLE orders ADD COLUMN delivery_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL"))
            db.commit()
            print("Added delivery_fee column to orders table")
        if "order_number" not in order_cols:
            db.execute(text("ALTER TABLE orders ADD COLUMN order_number INTEGER"))
            db.commit()
            # Backfill sequential numbers starting at 1001, oldest first.
            db.execute(text(
                "UPDATE orders o SET order_number = r.rn FROM ("
                "SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at)) + 1000 AS rn FROM orders"
                ") r WHERE o.id = r.id"
            ))
            db.commit()
            print("Added + backfilled order_number column on orders table")

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
    try:
        ensure_operational_data(db)
    except Exception as e:
        print(f"Operational data setup error: {e}")
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
app.include_router(warehouses.router, prefix="/api")
app.include_router(push.router, prefix="/api")
app.include_router(ws.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "E-Commerce API is running", "version": "1.0.0"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
