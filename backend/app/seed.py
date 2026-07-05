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


import urllib.parse
import hashlib


def _product_image(name: str) -> str:
    """A free, keyless product image generated from the item name (Pollinations).
    Loads client-side in the shopper's browser; a stable seed keeps it fixed."""
    prompt = (
        f"photorealistic product packshot of {name}, indian grocery product, "
        "clean white background, studio lighting, e-commerce catalogue photo, centered"
    )
    seed = int(hashlib.md5(name.encode()).hexdigest(), 16) % 100000
    return (
        "https://image.pollinations.ai/prompt/"
        + urllib.parse.quote(prompt)
        + f"?width=500&height=500&nologo=true&seed={seed}"
    )


# ---------------------------------------------------------------------------
# Indian quick-commerce catalog (Blinkit / Instamart / Zepto style).
# Each product is (name, pack-size, price in Rupees, stock).
# `returnable` is per sub-category: fresh/food is non-returnable; sealed
# personal-care / household / baby items are returnable (7-day window).
# ---------------------------------------------------------------------------
CATALOG = {
    "Fruits & Vegetables": {
        "description": "Farm-fresh fruits, vegetables & herbs",
        "subcategories": {
            "Fresh Vegetables": {"returnable": False, "products": [
                ("Onion", "1 kg", 39, 200),
                ("Tomato (Local)", "1 kg", 32, 180),
                ("Potato", "1 kg", 29, 220),
                ("Ginger", "200 g", 25, 120),
                ("Green Chilli", "100 g", 12, 140),
                ("Fresh Coriander", "100 g", 10, 130),
            ]},
            "Fresh Fruits": {"returnable": False, "products": [
                ("Banana (Robusta)", "1 dozen", 49, 150),
                ("Shimla Apple", "1 kg", 149, 90),
                ("Pomegranate", "500 g", 89, 70),
                ("Nagpur Orange", "1 kg", 79, 80),
            ]},
        },
    },
    "Dairy, Bread & Eggs": {
        "description": "Milk, bread, eggs & everyday dairy",
        "subcategories": {
            "Milk": {"returnable": False, "products": [
                ("Amul Gold Full Cream Milk", "500 ml", 34, 200),
                ("Mother Dairy Toned Milk", "500 ml", 27, 200),
                ("Amul Taaza Toned Milk", "1 L", 66, 150),
            ]},
            "Bread & Eggs": {"returnable": False, "products": [
                ("Britannia Brown Bread", "400 g", 45, 120),
                ("Harvest Gold White Bread", "400 g", 40, 120),
                ("Farm Fresh Eggs", "6 pcs", 42, 140),
            ]},
            "Curd, Paneer & Butter": {"returnable": False, "products": [
                ("Amul Masti Dahi", "400 g", 35, 110),
                ("Amul Malai Paneer", "200 g", 89, 90),
                ("Amul Butter", "100 g", 56, 130),
            ]},
        },
    },
    "Atta, Rice & Dal": {
        "description": "Staples — atta, rice, dal & pulses",
        "subcategories": {
            "Atta & Flours": {"returnable": False, "products": [
                ("Aashirvaad Shudh Chakki Atta", "5 kg", 265, 80),
                ("Fortune Chakki Fresh Atta", "5 kg", 245, 80),
            ]},
            "Rice": {"returnable": False, "products": [
                ("India Gate Basmati Rice", "1 kg", 119, 100),
                ("Daawat Rozana Gold Rice", "5 kg", 320, 60),
            ]},
            "Dal & Pulses": {"returnable": False, "products": [
                ("Tata Sampann Toor Dal", "1 kg", 145, 90),
                ("Moong Dal", "500 g", 79, 100),
                ("Rajma (Kidney Beans)", "500 g", 89, 90),
            ]},
        },
    },
    "Masala, Oil & More": {
        "description": "Cooking oil, ghee, spices & essentials",
        "subcategories": {
            "Oil & Ghee": {"returnable": False, "products": [
                ("Fortune Sunflower Oil", "1 L", 145, 100),
                ("Saffola Gold Oil", "1 L", 175, 90),
                ("Amul Pure Ghee", "1 L", 599, 50),
            ]},
            "Spices & Salt": {"returnable": False, "products": [
                ("Everest Garam Masala", "100 g", 72, 120),
                ("MDH Chana Masala", "100 g", 65, 120),
                ("Tata Salt", "1 kg", 28, 200),
            ]},
            "Sugar & Jaggery": {"returnable": False, "products": [
                ("Sugar", "1 kg", 45, 160),
                ("Organic Jaggery (Gud)", "500 g", 40, 120),
            ]},
        },
    },
    "Snacks & Munchies": {
        "description": "Chips, namkeen & biscuits",
        "subcategories": {
            "Chips & Namkeen": {"returnable": False, "products": [
                ("Lay's Classic Salted Chips", "52 g", 20, 200),
                ("Kurkure Masala Munch", "90 g", 20, 200),
                ("Haldiram's Aloo Bhujia", "200 g", 52, 130),
            ]},
            "Biscuits & Cookies": {"returnable": False, "products": [
                ("Parle-G Original Glucose Biscuits", "250 g", 30, 220),
                ("Britannia Good Day Cashew", "100 g", 30, 180),
                ("Cadbury Oreo Vanilla", "120 g", 35, 160),
            ]},
        },
    },
    "Cold Drinks & Juices": {
        "description": "Soft drinks, juices & water",
        "subcategories": {
            "Soft Drinks": {"returnable": False, "products": [
                ("Coca-Cola", "750 ml", 40, 180),
                ("Thums Up", "750 ml", 40, 180),
                ("Sprite", "750 ml", 40, 170),
            ]},
            "Juices & Water": {"returnable": False, "products": [
                ("Real Mixed Fruit Juice", "1 L", 110, 100),
                ("Tropicana Orange Juice", "1 L", 120, 90),
                ("Bisleri Mineral Water", "1 L", 20, 250),
            ]},
        },
    },
    "Tea, Coffee & Health Drinks": {
        "description": "Chai, coffee & health drinks",
        "subcategories": {
            "Tea": {"returnable": False, "products": [
                ("Brooke Bond Red Label Tea", "250 g", 140, 120),
                ("Tata Tea Gold", "250 g", 155, 110),
                ("Taj Mahal Tea", "100 g", 90, 100),
            ]},
            "Coffee": {"returnable": False, "products": [
                ("Bru Instant Coffee", "50 g", 145, 90),
                ("Nescafe Classic Coffee", "50 g", 160, 90),
            ]},
            "Health Drinks": {"returnable": False, "products": [
                ("Cadbury Bournvita", "500 g", 235, 80),
                ("Horlicks Classic Malt", "500 g", 260, 80),
            ]},
        },
    },
    "Instant & Frozen Food": {
        "description": "Noodles, ready-to-eat & frozen snacks",
        "subcategories": {
            "Noodles & Pasta": {"returnable": False, "products": [
                ("Maggi 2-Minute Masala Noodles", "70 g", 14, 250),
                ("Maggi Masala Noodles (Pack of 6)", "420 g", 84, 120),
                ("Sunfeast Yippee Magic Masala", "70 g", 13, 200),
            ]},
            "Ready to Eat": {"returnable": False, "products": [
                ("MTR Poha", "200 g", 45, 110),
                ("Gits Gulab Jamun Mix", "200 g", 75, 90),
            ]},
            "Frozen Snacks": {"returnable": False, "products": [
                ("McCain French Fries", "420 g", 99, 80),
                ("McCain Aloo Tikki", "400 g", 110, 80),
            ]},
        },
    },
    "Sweet Tooth": {
        "description": "Chocolates & ice cream",
        "subcategories": {
            "Chocolates": {"returnable": False, "products": [
                ("Cadbury Dairy Milk", "50 g", 40, 200),
                ("Nestle KitKat 4 Finger", "37.3 g", 45, 190),
                ("Cadbury Perk", "26 g", 20, 210),
            ]},
            "Ice Cream": {"returnable": False, "products": [
                ("Amul Vanilla Ice Cream Tub", "1 L", 199, 70),
                ("Kwality Wall's Cornetto", "120 ml", 45, 120),
            ]},
        },
    },
    "Cleaning & Household": {
        "description": "Detergents, cleaners & home care",
        "subcategories": {
            "Detergent": {"returnable": True, "products": [
                ("Surf Excel Easy Wash Detergent", "1 kg", 135, 100),
                ("Ariel Matic Front Load", "1 kg", 145, 90),
                ("Vim Dishwash Bar", "200 g", 20, 200),
            ]},
            "Cleaners": {"returnable": True, "products": [
                ("Harpic Power Plus Toilet Cleaner", "500 ml", 92, 110),
                ("Lizol Disinfectant Floor Cleaner", "500 ml", 99, 100),
                ("Colin Glass Cleaner", "500 ml", 89, 100),
            ]},
        },
    },
    "Personal Care": {
        "description": "Bath, oral & hair care",
        "subcategories": {
            "Bath & Body": {"returnable": True, "products": [
                ("Dettol Original Soap", "125 g", 48, 150),
                ("Dove Cream Beauty Bar", "100 g", 55, 140),
                ("Lifebuoy Total Soap (Pack of 4)", "4 x 125 g", 130, 100),
            ]},
            "Oral Care": {"returnable": True, "products": [
                ("Colgate MaxFresh Toothpaste", "150 g", 95, 130),
                ("Sensodyne Fresh Mint", "70 g", 95, 110),
                ("Colgate ZigZag Toothbrush (2 pcs)", "2 pcs", 60, 120),
            ]},
            "Hair Care": {"returnable": True, "products": [
                ("Clinic Plus Strong & Long Shampoo", "175 ml", 99, 110),
                ("Head & Shoulders Anti-Dandruff", "180 ml", 165, 90),
            ]},
        },
    },
    "Baby Care": {
        "description": "Diapers, wipes & baby food",
        "subcategories": {
            "Diapers & Wipes": {"returnable": True, "products": [
                ("Pampers All Round Protection (M)", "30 pcs", 399, 60),
                ("Huggies Baby Wipes", "72 pcs", 199, 90),
            ]},
            "Baby Food": {"returnable": True, "products": [
                ("Nestle Cerelac Wheat", "300 g", 245, 55),
            ]},
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
            image_url=_product_image(cat_name),
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
                    description=f"{prod_name} — {unit}. Delivered to your door in minutes.",
                    unit=unit,
                    price=Decimal(str(price)),
                    stock=stock,
                    image_url=_product_image(prod_name),
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
    order_seq = 1000

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

            order_seq += 1
            order = Order(
                id=str(uuid.uuid4()),
                order_number=order_seq,
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
