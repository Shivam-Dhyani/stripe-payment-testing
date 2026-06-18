from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.models import (
    User, Address, Category, SubCategory, Product, CartItem, Order, OrderItem
)
from app.seed import seed_database
from app.routers import auth, categories, subcategories, products, addresses, cart, orders, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler: create tables and seed data on startup."""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")

    # Seed initial data
    db = SessionLocal()
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

# CORS configuration - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(subcategories.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(addresses.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.get("/")
def root():
    """Health check endpoint."""
    return {"message": "E-Commerce API is running", "version": "1.0.0"}


@app.get("/api/health")
def health_check():
    """API health check."""
    return {"status": "healthy"}
