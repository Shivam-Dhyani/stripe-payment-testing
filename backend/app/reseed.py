"""Convert an already-seeded database to the quick-commerce catalog.

Wipes catalog + transactional data (products, categories, orders, carts,
returns) and reseeds the grocery catalog and demo orders. Users, addresses,
warehouses and staff accounts are preserved.

Usage (from the backend/ directory):

    python -m app.reseed

This is destructive for order/return history — intended for demo/test data.
"""
from app.database import SessionLocal
from app.seed import reset_and_seed_catalog, ensure_operational_data


def main():
    db = SessionLocal()
    try:
        reset_and_seed_catalog(db)
        ensure_operational_data(db)
        print("Reseed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
