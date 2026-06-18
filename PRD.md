# E-Commerce Platform - Product Requirements Document

## Tech Stack
- **Backend:** Python FastAPI, SQLAlchemy ORM, PostgreSQL, Stripe Python SDK
- **Frontend:** React 18, Redux Toolkit + Thunk, TypeScript, Vite
- **UI Libraries:** Tailwind CSS, AG Grid (tables), React Hook Form + Zod (forms), Recharts (charts)
- **Payment:** Stripe SDK (test mode)
- **Auth:** JWT (access + refresh tokens)

## Modules

### 1. Authentication Module
- **Roles:** Super Admin, Customer
- Register (customers only, admin seeded)
- Login / Logout with JWT
- Profile management
- Address CRUD (multiple addresses per user, one default)

### 2. Inventory Module (Super Admin Only)
- **Categories:** CRUD with name, description, image
- **Sub-Categories:** CRUD linked to parent category
- **Products:** CRUD with name, description, price, stock, images, category/subcategory linkage
- AG Grid tables for all inventory management
- Stock tracking (decrement on order)

### 3. Cart & Orders Module
- Add/remove/update cart items
- Cart persistence (server-side for logged-in users)
- Checkout flow: Cart → Address selection → Stripe payment → Order confirmation
- Order status workflow: Pending → Processing → Shipped → Delivered → (Cancelled)
- Order history for customers
- Order management for admin (update status, view all orders)

### 4. Admin Dashboard
- Revenue chart (daily/weekly/monthly) - Recharts area chart
- Order trends - Recharts line chart
- Top selling products - Recharts bar chart
- Category distribution - Recharts pie chart
- KPI cards: Total Revenue, Total Orders, Total Products, Total Customers
- Recent orders table

## Database Schema
- **users:** id, email, password_hash, first_name, last_name, role, is_active, created_at
- **addresses:** id, user_id, label, street, city, state, zip_code, country, is_default
- **categories:** id, name, description, image_url, is_active, created_at
- **sub_categories:** id, category_id, name, description, is_active, created_at
- **products:** id, sub_category_id, name, description, price, stock, image_url, is_active, created_at
- **cart_items:** id, user_id, product_id, quantity
- **orders:** id, user_id, address_snapshot, total, status, stripe_payment_intent_id, created_at
- **order_items:** id, order_id, product_id, product_name, product_price, quantity

## API Endpoints
- POST /api/auth/register, /api/auth/login, GET /api/auth/me
- CRUD /api/addresses
- CRUD /api/categories, /api/sub-categories, /api/products
- CRUD /api/cart
- POST /api/orders/checkout, GET /api/orders, PATCH /api/orders/{id}/status
- POST /api/payments/create-intent, POST /api/payments/webhook
- GET /api/dashboard/stats, /api/dashboard/revenue-chart, /api/dashboard/top-products

## Frontend Pages
- **Public:** Home/Landing, Product Listing, Product Detail, Login, Register
- **Customer:** Cart, Checkout, Order History, Profile/Addresses
- **Admin:** Dashboard, Categories, SubCategories, Products, Orders
