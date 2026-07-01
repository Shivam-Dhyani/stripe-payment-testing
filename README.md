# E-Commerce Application (React + FastAPI + Stripe)

A full-stack e-commerce application with admin dashboard, inventory management, cart/checkout with Stripe payments, and order tracking.

## Tech Stack

**Backend:** Python, FastAPI, SQLAlchemy ORM, PostgreSQL, Stripe SDK, JWT Auth, Pydantic v2

**Frontend:** React 18, TypeScript, Vite, Redux Toolkit, Tailwind CSS v4, AG Grid, React Hook Form + Zod, Recharts, Stripe Elements

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (local or hosted via Supabase)
- Stripe account (for payment processing)

## Project Structure

```
stripe-payment-testing/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── config.py          # Environment settings
│   │   ├── database.py        # SQLAlchemy engine & session
│   │   ├── seed.py            # Demo data seeder
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── routers/           # API route handlers
│   │   ├── services/          # Business logic (Stripe)
│   │   └── middleware/        # JWT auth middleware
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/             # Route pages (admin + user)
│   │   ├── components/        # Shared components
│   │   ├── store/slices/      # Redux Toolkit slices
│   │   ├── services/          # Axios API services
│   │   ├── types/             # TypeScript interfaces
│   │   └── hooks/             # Custom hooks
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Setup

### 1. Database

Create a PostgreSQL database:

```sql
CREATE USER ecommerce WITH PASSWORD 'ecommerce123';
CREATE DATABASE ecommerce_db OWNER ecommerce;
```

Or use a hosted PostgreSQL (e.g., Supabase) and update `DATABASE_URL` accordingly.

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://ecommerce:ecommerce123@localhost/ecommerce_db
SECRET_KEY=your-secret-key-min-32-chars-long-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

Start the backend:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The server starts at `http://localhost:8000`. On first run it automatically creates tables and seeds demo data.

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8000/api
VITE_STRIPE_PK=pk_test_your_stripe_publishable_key
```

Start the dev server:

```bash
npm run dev
```

The app starts at `http://localhost:3000`.

## Commands Reference

### Backend

| Command | Description |
|---------|-------------|
| `uvicorn app.main:app --reload` | Start dev server with hot reload |
| `uvicorn app.main:app --host 0.0.0.0 --port 8000` | Start production server |
| `pip install -r requirements.txt` | Install Python dependencies |
| `pip freeze > requirements.txt` | Update dependency lock |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## API Documentation

Once the backend is running, interactive API docs are available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new customer |
| `/api/auth/login` | POST | Login (returns JWT) |
| `/api/auth/me` | GET | Current user profile |
| `/api/categories` | GET | List categories |
| `/api/subcategories` | GET | List subcategories |
| `/api/products` | GET | List products (paginated) |
| `/api/cart` | GET/POST/DELETE | Cart operations |
| `/api/addresses` | GET/POST/PUT/DELETE | Address management |
| `/api/orders/checkout` | POST | Create order + Stripe PaymentIntent |
| `/api/orders/{id}/confirm` | POST | Confirm payment |
| `/api/orders` | GET | User's orders |
| `/api/orders/all` | GET | All orders (admin only) |
| `/api/dashboard/stats` | GET | Dashboard KPIs (admin only) |

## Demo Accounts

Seeded automatically on first successful startup. Every password is `password123`
except the admin (`admin123`). After login each role lands on its own home:
admin → `/admin/dashboard`, warehouse → `/warehouse`, rider → `/rider`, customer → `/`.

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@ecommerce.com` | `admin123` |
| Warehouse operator | `warehouse@ecommerce.com` | `password123` |
| Delivery partner (rider) | `rider@ecommerce.com` | `password123` |
| Customer | `john@example.com` | `password123` |
| Customer | `jane@example.com` | `password123` |
| Customer | `bob@example.com` | `password123` |
| Customer | `alice@example.com` | `password123` |
| Customer | `charlie@example.com` | `password123` |

## Features

**Customer Portal:**
- Browse products with category/subcategory filters
- Product detail pages
- Shopping cart with quantity management
- Multi-step checkout (Address > Review > Stripe Payment)
- Order history with expandable details
- Profile and address management

**Admin Dashboard:**
- KPI cards (revenue, orders, products, customers)
- Revenue chart, order trends, category distribution (Recharts)
- Top-selling products
- Full CRUD for categories, subcategories, and products (AG Grid)
- Order management with status updates
