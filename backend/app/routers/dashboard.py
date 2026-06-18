from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User, UserRole
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.subcategory import SubCategory
from app.models.category import Category
from app.schemas.dashboard import DashboardStats, RevenueData, TopProduct, CategoryDistribution, OrderTrend
from app.schemas.order import OrderResponse
from app.middleware.auth import get_admin_user
from typing import List

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get KPI dashboard statistics (admin only)."""
    total_revenue = db.query(func.coalesce(func.sum(Order.total), 0)).filter(
        Order.status != OrderStatus.cancelled
    ).scalar()
    total_orders = db.query(func.count(Order.id)).scalar()
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar()
    total_customers = db.query(func.count(User.id)).filter(User.role == UserRole.customer).scalar()

    return DashboardStats(
        total_revenue=float(total_revenue),
        total_orders=total_orders,
        total_products=total_products,
        total_customers=total_customers,
    )


@router.get("/revenue-chart", response_model=List[RevenueData])
def get_revenue_chart(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get revenue data grouped by day for the last 30 days (admin only)."""
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    results = (
        db.query(
            func.date(Order.created_at).label("date"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
        )
        .filter(Order.created_at >= thirty_days_ago, Order.status != OrderStatus.cancelled)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )
    return [RevenueData(date=str(r.date), revenue=float(r.revenue)) for r in results]


@router.get("/top-products", response_model=List[TopProduct])
def get_top_products(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get top 10 best-selling products (admin only)."""
    results = (
        db.query(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("total_sold"),
            func.sum(OrderItem.product_price * OrderItem.quantity).label("revenue"),
        )
        .group_by(OrderItem.product_name)
        .order_by(desc("total_sold"))
        .limit(10)
        .all()
    )
    return [
        TopProduct(
            product_name=r.product_name,
            total_sold=int(r.total_sold),
            revenue=float(r.revenue),
        )
        for r in results
    ]


@router.get("/recent-orders", response_model=List[OrderResponse])
def get_recent_orders(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get the 10 most recent orders (admin only)."""
    orders = (
        db.query(Order)
        .order_by(Order.created_at.desc())
        .limit(10)
        .all()
    )
    return orders


@router.get("/category-distribution", response_model=List[CategoryDistribution])
def get_category_distribution(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get order count by category (admin only)."""
    results = (
        db.query(
            Category.name.label("category"),
            func.count(OrderItem.id).label("order_count"),
        )
        .join(SubCategory, SubCategory.category_id == Category.id)
        .join(Product, Product.sub_category_id == SubCategory.id)
        .join(OrderItem, OrderItem.product_id == Product.id)
        .group_by(Category.name)
        .order_by(desc("order_count"))
        .all()
    )
    return [CategoryDistribution(category=r.category, order_count=r.order_count) for r in results]


@router.get("/order-trends", response_model=List[OrderTrend])
def get_order_trends(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get orders per day for the last 30 days (admin only)."""
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    results = (
        db.query(
            func.date(Order.created_at).label("date"),
            func.count(Order.id).label("count"),
        )
        .filter(Order.created_at >= thirty_days_ago)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )
    return [OrderTrend(date=str(r.date), count=r.count) for r in results]
