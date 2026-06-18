from pydantic import BaseModel
from typing import Optional


class DashboardStats(BaseModel):
    total_revenue: float
    total_orders: int
    total_products: int
    total_customers: int


class RevenueData(BaseModel):
    date: str
    revenue: float


class TopProduct(BaseModel):
    name: str
    total_sold: int
    revenue: float


class CategoryDistribution(BaseModel):
    name: str
    value: int


class OrderTrend(BaseModel):
    date: str
    orders: int
