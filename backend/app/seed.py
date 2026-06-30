import uuid
from datetime import datetime, timedelta
from decimal import Decimal
import random
import bcrypt
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.address import Address
from app.models.warehouse import Warehouse
from app.models.category import Category
from app.models.subcategory import SubCategory
from app.models.product import Product
from app.models.order import Order, OrderItem


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


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
    # Check if already seeded
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

    # --- Create Categories ---
    categories_info = {
        "Electronics": "Gadgets, devices, and electronic accessories",
        "Clothing": "Fashion apparel for men, women, and kids",
        "Home & Kitchen": "Furniture, decor, and kitchen essentials",
        "Books": "Fiction, non-fiction, educational, and more",
        "Sports": "Sports equipment, fitness gear, and outdoor accessories",
    }
    categories = {}
    for name, desc in categories_info.items():
        cat = Category(
            id=str(uuid.uuid4()),
            name=name,
            description=desc,
            image_url=f"/images/categories/{name.lower().replace(' & ', '-').replace(' ', '-')}.jpg",
        )
        db.add(cat)
        categories[name] = cat

    # --- Create SubCategories ---
    subcategories_info = {
        "Electronics": [
            ("Smartphones", "Latest smartphones and mobile devices"),
            ("Laptops", "Notebooks and laptop computers"),
            ("Audio", "Headphones, speakers, and audio equipment"),
        ],
        "Clothing": [
            ("Men's Wear", "Clothing for men"),
            ("Women's Wear", "Clothing for women"),
            ("Accessories", "Fashion accessories and jewelry"),
        ],
        "Home & Kitchen": [
            ("Furniture", "Home furniture and decor"),
            ("Kitchen Appliances", "Small and large kitchen appliances"),
            ("Bedding", "Sheets, pillows, and comforters"),
        ],
        "Books": [
            ("Fiction", "Novels and fiction books"),
            ("Non-Fiction", "Biographies, self-help, and educational"),
            ("Technology", "Programming, science, and technology books"),
        ],
        "Sports": [
            ("Fitness", "Gym and fitness equipment"),
            ("Outdoor", "Camping, hiking, and outdoor gear"),
            ("Team Sports", "Equipment for team sports"),
        ],
    }
    subcategories = {}
    for cat_name, subs in subcategories_info.items():
        subcategories[cat_name] = []
        for sub_name, sub_desc in subs:
            sub = SubCategory(
                id=str(uuid.uuid4()),
                category_id=categories[cat_name].id,
                name=sub_name,
                description=sub_desc,
            )
            db.add(sub)
            subcategories[cat_name].append(sub)

    # --- Create Products ---
    products_info = {
        "Electronics": {
            "Smartphones": [
                ("iPhone 15 Pro", "Latest Apple smartphone with A17 Pro chip", 999.99, 50),
                ("Samsung Galaxy S24", "Samsung flagship with AI features", 849.99, 45),
                ("Google Pixel 8", "Pure Android experience with amazing camera", 699.99, 30),
                ("OnePlus 12", "Flagship killer with Snapdragon 8 Gen 3", 799.99, 25),
            ],
            "Laptops": [
                ("MacBook Pro 14\"", "Apple M3 Pro chip, 18GB RAM", 1999.99, 20),
                ("Dell XPS 15", "Intel Core i7, 16GB RAM, OLED display", 1499.99, 15),
                ("ThinkPad X1 Carbon", "Business ultrabook with great keyboard", 1349.99, 18),
            ],
            "Audio": [
                ("AirPods Pro 2", "Active noise cancellation, spatial audio", 249.99, 100),
                ("Sony WH-1000XM5", "Premium noise-cancelling headphones", 349.99, 40),
                ("JBL Flip 6", "Portable Bluetooth speaker", 129.99, 60),
            ],
        },
        "Clothing": {
            "Men's Wear": [
                ("Classic Fit Polo", "100% cotton polo shirt in navy blue", 49.99, 200),
                ("Slim Fit Jeans", "Stretch denim jeans in dark wash", 69.99, 150),
                ("Wool Blend Blazer", "Professional blazer for office wear", 189.99, 40),
            ],
            "Women's Wear": [
                ("Floral Maxi Dress", "Elegant floral print summer dress", 79.99, 80),
                ("High-Rise Yoga Pants", "Comfortable stretch yoga leggings", 59.99, 120),
                ("Silk Blouse", "Luxurious silk blouse in ivory", 129.99, 50),
                ("Denim Jacket", "Classic blue denim jacket", 89.99, 70),
            ],
            "Accessories": [
                ("Leather Watch", "Minimalist analog watch with leather strap", 149.99, 60),
                ("Designer Sunglasses", "UV protection polarized sunglasses", 199.99, 45),
                ("Cashmere Scarf", "Soft cashmere scarf in charcoal", 89.99, 35),
            ],
        },
        "Home & Kitchen": {
            "Furniture": [
                ("Ergonomic Office Chair", "Mesh back with lumbar support", 349.99, 25),
                ("Standing Desk", "Electric height-adjustable desk", 499.99, 15),
                ("Bookshelf", "5-tier wooden bookshelf in walnut", 159.99, 30),
            ],
            "Kitchen Appliances": [
                ("Instant Pot Duo", "7-in-1 electric pressure cooker", 89.99, 80),
                ("Vitamix Blender", "Professional-grade blender", 449.99, 20),
                ("Air Fryer XL", "Large capacity air fryer, 5.8 qt", 119.99, 55),
                ("Espresso Machine", "Semi-automatic espresso maker", 299.99, 25),
            ],
            "Bedding": [
                ("Egyptian Cotton Sheet Set", "1000 thread count, queen", 149.99, 40),
                ("Memory Foam Pillow", "Cooling gel memory foam pillow", 59.99, 90),
                ("Down Comforter", "All-season goose down comforter", 229.99, 30),
            ],
        },
        "Books": {
            "Fiction": [
                ("The Great Adventure", "A thrilling tale of exploration", 14.99, 200),
                ("Mystery at Midnight", "A gripping detective novel", 12.99, 180),
                ("Love in Paris", "A romantic story set in France", 11.99, 150),
            ],
            "Non-Fiction": [
                ("The Power of Habits", "Transform your life with better habits", 16.99, 250),
                ("History of Tomorrow", "A look at the future of humanity", 19.99, 120),
                ("Mindful Living", "Guide to meditation and mindfulness", 13.99, 100),
            ],
            "Technology": [
                ("Python Mastery", "Complete guide to Python programming", 39.99, 80),
                ("Cloud Architecture", "Designing scalable cloud systems", 44.99, 50),
                ("AI & Machine Learning", "Introduction to AI concepts", 49.99, 60),
                ("Web Dev Bootcamp", "Full-stack web development guide", 34.99, 75),
            ],
        },
        "Sports": {
            "Fitness": [
                ("Adjustable Dumbbells", "5-52.5 lb adjustable dumbbell set", 299.99, 30),
                ("Yoga Mat Premium", "Extra thick non-slip yoga mat", 39.99, 100),
                ("Resistance Bands Set", "Set of 5 resistance bands", 24.99, 150),
                ("Pull-Up Bar", "Doorway pull-up bar, no screws needed", 34.99, 60),
            ],
            "Outdoor": [
                ("Camping Tent 4P", "4-person waterproof camping tent", 189.99, 25),
                ("Hiking Backpack 50L", "Large capacity hiking backpack", 129.99, 35),
                ("Trekking Poles", "Lightweight carbon fiber trekking poles", 69.99, 45),
            ],
            "Team Sports": [
                ("Basketball Official", "NBA official size basketball", 29.99, 80),
                ("Soccer Ball Pro", "FIFA approved match soccer ball", 39.99, 70),
                ("Football Gloves", "Receiver gloves with grip technology", 44.99, 55),
            ],
        },
    }

    all_products = []
    for cat_name, sub_products in products_info.items():
        sub_list = subcategories[cat_name]
        for sub in sub_list:
            if sub.name in sub_products:
                for prod_name, prod_desc, price, stock in sub_products[sub.name]:
                    slug = prod_name.lower().replace(' ', '-').replace('"', '').replace('&', 'and')
                    product = Product(
                        id=str(uuid.uuid4()),
                        sub_category_id=sub.id,
                        name=prod_name,
                        description=prod_desc,
                        price=Decimal(str(price)),
                        stock=stock,
                        image_url=f"/images/products/{slug}.jpg",
                    )
                    db.add(product)
                    all_products.append(product)

    db.flush()

    # --- Create Sample Orders for Dashboard Data ---
    statuses = ["processing", "shipped", "delivered"]
    now = datetime.utcnow()

    for day_offset in range(30):
        order_date = now - timedelta(days=day_offset)
        num_orders = random.randint(1, 4)

        for _ in range(num_orders):
            customer = random.choice(customers)
            address_idx = customers.index(customer)
            address = addresses[address_idx]

            # Pick 1-4 random products for this order
            num_items = random.randint(1, 4)
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
                oi = OrderItem(
                    id=str(uuid.uuid4()),
                    order_id=order.id,
                    **item_data,
                )
                db.add(oi)

    db.commit()
    print("Database seeded successfully!")
    print(f"  - 1 admin user (admin@ecommerce.com / admin123)")
    print(f"  - {len(customers)} sample customers")
    print(f"  - {len(categories)} categories")
    print(f"  - {sum(len(v) for v in subcategories.values())} subcategories")
    print(f"  - {len(all_products)} products")
    print(f"  - Sample orders for the last 30 days")
