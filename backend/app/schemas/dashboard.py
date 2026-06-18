from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class DashboardStats(BaseModel):
    total_revenue: float
    total_orders: int
    total_products: int
    total_customers: int


class RevenueData(BaseModel):
    date: str
    revenue: float


class TopProduct(BaseModel):
    product_name: str
    total_sold: int
    revenue: float


class CategoryDistribution(BaseModel):
    category: str
    order_count: int


class OrderTrend(BaseModel):
    date: str
    count: int
