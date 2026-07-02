import uuid
from datetime import datetime, timedelta
from decimal import Decimal
import random
import bcrypt
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.user import User, UserRole
from app.models.address import Address
from app.models.warehouse import Warehouse
from app.models.category import Category
from app.models.subcategory import SubCategory
from app.models.product import Product
from app.models.order import Order, OrderItem


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# ---------------------------------------------------------------------------
# Quick-commerce grocery catalog (Blinkit / Instamart style).
# Each product is (name, unit/pack-size, price, stock).
# `returnable` is set per sub-category: perishables & consumables are not
# returnable; sealed personal-care / household / baby items are (7-day window).
# ---------------------------------------------------------------------------
CATALOG = {
    "Fruits & Vegetables": {
        "description": "Fresh fruits, vegetables & herbs — sourced daily",
        "subcategories": {
            "Fresh Fruits": {
                "returnable": False,
                "products": [
                    ("Banana (Robusta)", "6 pcs", 1.49, 120),
                    ("Royal Gala Apple", "1 kg", 3.99, 90),
                    ("Nagpur Orange", "1 kg", 2.99, 80),
                    ("Pomegranate", "500 g", 3.49, 60),
                    ("Alphonso Mango", "1 kg", 5.99, 40),
                ],
            },
            "Fresh Vegetables": {
                "returnable": False,
                "products": [
                    ("Tomato (Local)", "1 kg", 1.29, 150),
                    ("Onion", "1 kg", 1.19, 160),
                    ("Potato", "1 kg", 0.99, 200),
                    ("Baby Spinach", "250 g", 1.49, 70),
                    ("Green Capsicum", "500 g", 1.79, 65),
                ],
            },
            "Herbs & Seasonings": {
                "returnable": False,
                "products": [
                    ("Fresh Coriander", "100 g", 0.59, 90),
                    ("Ginger", "200 g", 0.99, 85),
                    ("Green Chilli", "100 g", 0.49, 95),
                    ("Garlic", "200 g", 1.29, 80),
                ],
            },
        },
    },
    "Dairy, Bread & Eggs": {
        "description": "Milk, bread, eggs & everyday essentials",
        "subcategories": {
            "Milk": {
                "returnable": False,
                "products": [
                    ("Whole Milk", "1 L", 1.29, 130),
                    ("Toned Milk", "1 L", 1.09, 140),
                    ("Almond Milk (Unsweetened)", "1 L", 3.49, 55),
                    ("Lactose-Free Milk", "1 L", 2.29, 50),
                ],
            },
            "Bread & Pav": {
                "returnable": False,
                "products": [
                    ("White Sandwich Bread", "400 g", 1.19, 100),
                    ("Whole Wheat Bread", "400 g", 1.49, 95),
                    ("Burger Buns", "6 pcs", 1.39, 70),
                ],
            },
            "Eggs": {
                "returnable": False,
                "products": [
                    ("Farm Fresh Eggs", "6 pcs", 1.79, 110),
                    ("Farm Fresh Eggs", "12 pcs", 3.29, 90),
                    ("Free-Range Brown Eggs", "6 pcs", 2.49, 60),
                ],
            },
            "Butter & Cheese": {
                "returnable": False,
                "products": [
                    ("Salted Butter", "500 g", 4.49, 65),
                    ("Cheese Slices", "200 g", 2.99, 80),
                    ("Fresh Paneer", "200 g", 2.49, 75),
                    ("Greek Yogurt", "400 g", 2.19, 85),
                ],
            },
        },
    },
    "Snacks & Munchies": {
        "description": "Chips, biscuits, namkeen & more",
        "subcategories": {
            "Chips & Crisps": {
                "returnable": False,
                "products": [
                    ("Classic Salted Potato Chips", "52 g", 0.99, 200),
                    ("Cream & Onion Chips", "52 g", 0.99, 180),
                    ("Tortilla Nachos", "150 g", 2.49, 90),
                ],
            },
            "Biscuits & Cookies": {
                "returnable": False,
                "products": [
                    ("Choco Chip Cookies", "200 g", 1.89, 120),
                    ("Digestive Biscuits", "250 g", 1.59, 130),
                    ("Cream Sandwich Biscuits", "120 g", 0.89, 150),
                ],
            },
            "Namkeen": {
                "returnable": False,
                "products": [
                    ("Classic Mixture", "200 g", 1.49, 100),
                    ("Salted Peanuts", "200 g", 1.29, 110),
                    ("Aloo Bhujia", "200 g", 1.39, 105),
                ],
            },
        },
    },
    "Cold Drinks & Juices": {
        "description": "Soft drinks, juices & water",
        "subcategories": {
            "Soft Drinks": {
                "returnable": False,
                "products": [
                    ("Cola", "750 ml", 1.19, 160),
                    ("Lemon-Lime Soda", "750 ml", 1.19, 150),
                    ("Orange Fizz", "750 ml", 1.19, 140),
                ],
            },
            "Juices": {
                "returnable": False,
                "products": [
                    ("100% Orange Juice", "1 L", 2.99, 90),
                    ("Mixed Fruit Juice", "1 L", 2.79, 95),
                    ("Cranberry Juice", "1 L", 3.29, 60),
                ],
            },
            "Water & Sparkling": {
                "returnable": False,
                "products": [
                    ("Mineral Water", "1 L", 0.79, 220),
                    ("Sparkling Water", "750 ml", 1.29, 100),
                ],
            },
        },
    },
    "Instant & Frozen Food": {
        "description": "Noodles, frozen snacks & ready meals",
        "subcategories": {
            "Instant Noodles": {
                "returnable": False,
                "products": [
                    ("Masala Instant Noodles", "70 g", 0.69, 200),
                    ("Cup Noodles (Chicken)", "70 g", 1.19, 140),
                    ("Hakka Noodles", "150 g", 1.49, 110),
                ],
            },
            "Frozen Snacks": {
                "returnable": False,
                "products": [
                    ("Crinkle French Fries", "500 g", 2.99, 85),
                    ("Veg Nuggets", "300 g", 2.79, 80),
                    ("Chicken Spring Rolls", "300 g", 3.49, 70),
                ],
            },
            "Ready to Eat": {
                "returnable": False,
                "products": [
                    ("Rajma Masala", "300 g", 2.49, 90),
                    ("Ready Poha", "200 g", 1.29, 100),
                    ("Pav Bhaji", "300 g", 2.59, 85),
                ],
            },
        },
    },
    "Tea, Coffee & Health Drinks": {
        "description": "Tea, coffee & health drinks",
        "subcategories": {
            "Tea": {
                "returnable": False,
                "products": [
                    ("Green Tea Bags", "25 bags", 3.49, 120),
                    ("Premium Black Tea", "250 g", 2.99, 110),
                    ("Masala Chai", "250 g", 3.19, 90),
                ],
            },
            "Coffee": {
                "returnable": False,
                "products": [
                    ("Instant Coffee", "100 g", 4.99, 100),
                    ("Filter Coffee Powder", "200 g", 3.99, 80),
                    ("Cold Brew Concentrate", "500 ml", 5.49, 45),
                ],
            },
            "Health Drinks": {
                "returnable": False,
                "products": [
                    ("Chocolate Malt Drink", "500 g", 4.49, 85),
                    ("Protein Shake Mix", "400 g", 8.99, 40),
                ],
            },
        },
    },
    "Household & Cleaning": {
        "description": "Cleaning, laundry & home care",
        "subcategories": {
            "Cleaning Essentials": {
                "returnable": True,
                "products": [
                    ("Dishwash Gel (Lemon)", "500 ml", 1.99, 110),
                    ("Floor Cleaner (Citrus)", "1 L", 2.49, 95),
                    ("Glass Cleaner", "500 ml", 2.19, 80),
                ],
            },
            "Laundry": {
                "returnable": True,
                "products": [
                    ("Detergent Powder", "1 kg", 3.99, 100),
                    ("Fabric Softener", "1 L", 3.49, 75),
                    ("Liquid Detergent", "1 L", 4.49, 70),
                ],
            },
            "Paper & Disposables": {
                "returnable": True,
                "products": [
                    ("Kitchen Paper Towels", "2 rolls", 2.29, 130),
                    ("Aluminium Foil", "72 m", 2.99, 90),
                    ("Garbage Bags (Medium)", "30 pcs", 2.49, 100),
                ],
            },
        },
    },
    "Personal Care": {
        "description": "Bath, oral & hair care",
        "subcategories": {
            "Bath & Body": {
                "returnable": True,
                "products": [
                    ("Moisturising Body Wash", "250 ml", 3.49, 90),
                    ("Bath Soap (Pack of 4)", "4 x 100 g", 2.99, 110),
                    ("Body Lotion", "200 ml", 3.99, 80),
                ],
            },
            "Oral Care": {
                "returnable": True,
                "products": [
                    ("Cavity Protection Toothpaste", "150 g", 2.19, 120),
                    ("Toothbrush (Soft, Pack of 2)", "2 pcs", 1.99, 100),
                    ("Antiseptic Mouthwash", "250 ml", 3.29, 70),
                ],
            },
            "Hair Care": {
                "returnable": True,
                "products": [
                    ("Anti-Dandruff Shampoo", "340 ml", 4.99, 85),
                    ("Smooth & Silky Conditioner", "180 ml", 4.49, 75),
                    ("Hair Oil", "200 ml", 3.79, 90),
                ],
            },
        },
    },
    "Baby Care": {
        "description": "Diapers, wipes & baby food",
        "subcategories": {
            "Diapers & Wipes": {
                "returnable": True,
                "products": [
                    ("Baby Diapers (Medium)", "30 pcs", 8.99, 60),
                    ("Baby Diapers (Large)", "28 pcs", 9.49, 55),
                    ("Baby Wipes", "72 pcs", 2.99, 100),
                ],
            },
            "Baby Food": {
                "returnable": True,
                "products": [
                    ("Baby Cereal (Wheat & Apple)", "300 g", 5.49, 50),
                    ("Baby Formula (Stage 1)", "400 g", 12.99, 35),
                ],
            },
        },
    },
}


def _seed_catalog(db: Session):
    """Create the quick-commerce catalog and return the flat list of products."""
    all_products = []
    for cat_name, cat_info in CATALOG.items():
        category = Category(
            id=str(uuid.uuid4()),
            name=cat_name,
            description=cat_info["description"],
            image_url=None,
        )
        db.add(category)
        for sub_name, sub_info in cat_info["subcategories"].items():
            sub = SubCategory(
                id=str(uuid.uuid4()),
                category_id=category.id,
                name=sub_name,
                description=f"{sub_name} in {cat_name}",
            )
            db.add(sub)
            returnable = sub_info["returnable"]
            for prod_name, unit, price, stock in sub_info["products"]:
                product = Product(
                    id=str(uuid.uuid4()),
                    sub_category_id=sub.id,
                    name=prod_name,
                    description=f"{prod_name} — {unit}. Delivered fresh in minutes.",
                    unit=unit,
                    price=Decimal(str(price)),
                    stock=stock,
                    image_url=None,
                    is_returnable=returnable,
                    return_window_days=7 if returnable else None,
                )
                db.add(product)
                all_products.append(product)
    db.flush()
    return all_products


def _seed_demo_orders(db: Session, customers, addresses, all_products):
    """Create sample orders across the last 30 days for dashboard data."""
    statuses = ["picking", "packed", "out_for_delivery", "delivered", "delivered"]
    now = datetime.utcnow()

    for day_offset in range(30):
        order_date = now - timedelta(days=day_offset)
        num_orders = random.randint(1, 4)

        for _ in range(num_orders):
            customer = random.choice(customers)
            address_idx = customers.index(customer)
            address = addresses[address_idx]

            num_items = random.randint(2, 6)
            selected_products = random.sample(all_products, min(num_items, len(all_products)))

            order_total = Decimal("0.00")
            order_items = []
            for prod in selected_products:
                qty = random.randint(1, 3)
                item_total = prod.price * qty
                order_total += item_total
                order_items.append({
                    "product_id": prod.id,
                    "product_name": prod.name,
                    "product_price": prod.price,
                    "quantity": qty,
                })

            order = Order(
                id=str(uuid.uuid4()),
                user_id=customer.id,
                address_snapshot={
                    "label": address.label,
                    "street": address.street,
                    "city": address.city,
                    "state": address.state,
                    "zip_code": address.zip_code,
                    "country": address.country,
                },
                total=order_total,
                status=random.choice(statuses),
                stripe_payment_intent_id=f"pi_demo_{uuid.uuid4().hex[:16]}",
                created_at=order_date,
                updated_at=order_date,
            )
            db.add(order)
            db.flush()

            for item_data in order_items:
                db.add(OrderItem(id=str(uuid.uuid4()), order_id=order.id, **item_data))


def ensure_operational_data(db: Session):
    """Idempotent setup that must exist even on already-seeded databases:
    a default warehouse, demo staff accounts, and a warehouse on every order."""
    warehouse = db.query(Warehouse).first()
    if not warehouse:
        warehouse = Warehouse(
            id=str(uuid.uuid4()),
            name="Central Dark Store",
            code="DS-001",
            street="100 Fulfillment Way",
            city="New York",
            state="NY",
            zip_code="10001",
            country="US",
            phone="+1-555-0100",
            is_active=True,
        )
        db.add(warehouse)
        db.flush()
        print("Created default warehouse: Central Dark Store")

    # Backfill any orders missing a warehouse.
    db.query(Order).filter(Order.warehouse_id.is_(None)).update(
        {Order.warehouse_id: warehouse.id}, synchronize_session=False
    )

    # Demo staff accounts (password123).
    demo_staff = [
        ("rider@ecommerce.com", "Ravi", "Kumar", UserRole.delivery_partner),
        ("warehouse@ecommerce.com", "Wendy", "House", UserRole.warehouse_operator),
    ]
    for email, first, last, role in demo_staff:
        if not db.query(User).filter(User.email == email).first():
            db.add(User(
                id=str(uuid.uuid4()),
                email=email,
                password_hash=hash_password("password123"),
                first_name=first,
                last_name=last,
                role=role.value,
                is_active=True,
            ))
            print(f"Created demo {role.value}: {email} / password123")

    db.commit()


def seed_database(db: Session):
    """Seed the database with initial data for demo purposes."""
    existing_admin = db.query(User).filter(User.email == "admin@ecommerce.com").first()
    if existing_admin:
        print("Database already seeded, skipping.")
        return

    print("Seeding database...")

    # --- Create Admin User ---
    admin = User(
        id=str(uuid.uuid4()),
        email="admin@ecommerce.com",
        password_hash=hash_password("admin123"),
        first_name="Admin",
        last_name="User",
        role=UserRole.admin,
        is_active=True,
    )
    db.add(admin)

    # --- Create Sample Customers ---
    customers = []
    customer_data = [
        ("john@example.com", "John", "Doe"),
        ("jane@example.com", "Jane", "Smith"),
        ("bob@example.com", "Bob", "Johnson"),
        ("alice@example.com", "Alice", "Williams"),
        ("charlie@example.com", "Charlie", "Brown"),
    ]
    for email, first, last in customer_data:
        customer = User(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=hash_password("password123"),
            first_name=first,
            last_name=last,
            role=UserRole.customer,
            is_active=True,
        )
        db.add(customer)
        customers.append(customer)

    # --- Create Addresses for Customers ---
    addresses = []
    address_data = [
        ("Home", "123 Main St", "New York", "NY", "10001"),
        ("Work", "456 Office Blvd", "Los Angeles", "CA", "90001"),
        ("Home", "789 Oak Ave", "Chicago", "IL", "60601"),
        ("Home", "321 Pine Rd", "Houston", "TX", "77001"),
        ("Home", "654 Elm St", "Phoenix", "AZ", "85001"),
    ]
    for i, (label, street, city, state, zip_code) in enumerate(address_data):
        addr = Address(
            id=str(uuid.uuid4()),
            user_id=customers[i].id,
            label=label,
            street=street,
            city=city,
            state=state,
            zip_code=zip_code,
            country="US",
            is_default=True,
        )
        db.add(addr)
        addresses.append(addr)

    all_products = _seed_catalog(db)
    _seed_demo_orders(db, customers, addresses, all_products)

    db.commit()
    print("Database seeded successfully!")
    print("  - 1 admin user (admin@ecommerce.com / admin123)")
    print(f"  - {len(customers)} sample customers")
    print(f"  - {len(CATALOG)} categories")
    print(f"  - {len(all_products)} products")
    print("  - Sample orders for the last 30 days")


def reset_and_seed_catalog(db: Session):
    """Wipe all catalog + transactional data and reseed the quick-commerce
    catalog and demo orders. Keeps users, addresses and warehouses.

    Use this to convert an already-seeded (old e-commerce) database to the
    quick-commerce catalog. Run via `python -m app.reseed` from backend/.
    """
    print("Resetting catalog and transactional data...")
    # Delete in FK-safe order. Some tables may not exist on older schemas,
    # so guard each statement.
    for stmt in [
        "DELETE FROM return_status_history",
        "DELETE FROM return_request_items",
        "DELETE FROM return_requests",
        "DELETE FROM cancellation_requests",
        "DELETE FROM order_status_history",
        "DELETE FROM payment_events",
        "DELETE FROM order_items",
        "DELETE FROM orders",
        "DELETE FROM cart_items",
        "DELETE FROM products",
        "DELETE FROM subcategories",
        "DELETE FROM categories",
    ]:
        try:
            db.execute(text(stmt))
            db.commit()
        except Exception as e:  # noqa: BLE001
            db.rollback()
            print(f"  (skipped) {stmt}: {e}")

    customers = db.query(User).filter(User.role == UserRole.customer.value).all()
    addresses = []
    for c in customers:
        addr = db.query(Address).filter(Address.user_id == c.id).first()
        addresses.append(addr)

    all_products = _seed_catalog(db)
    if customers and all(addresses):
        _seed_demo_orders(db, customers, addresses, all_products)
    db.commit()
    print(f"Reseeded {len(CATALOG)} categories and {len(all_products)} products.")
