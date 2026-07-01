from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class ReturnRequestItemCreate(BaseModel):
    order_item_id: str
    quantity: int


class ReturnRequestCreate(BaseModel):
    order_id: str
    reason: str
    items: List[ReturnRequestItemCreate]


class ReturnRequestResolve(BaseModel):
    status: str  # admin actions: "approved", "rejected", "received", "refunded"
    admin_notes: Optional[str] = None
    pickup_date: Optional[datetime] = None
    pickup_address: Optional[str] = None


class SchedulePickupRequest(BaseModel):
    pickup_date: datetime
    pickup_address: Optional[str] = None  # defaults to the order's delivery address


class ReturnAssignRider(BaseModel):
    delivery_partner_id: str


class ReturnRequestItemResponse(BaseModel):
    id: str
    order_item_id: str
    quantity: int
    product_name: Optional[str] = None
    product_price: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class ReturnRequestResponse(BaseModel):
    id: str
    order_id: str
    user_id: str
    reason: str
    status: str
    admin_notes: Optional[str] = None
    pickup_date: Optional[datetime] = None
    pickup_address: Optional[str] = None
    refund_amount: Optional[float] = None
    delivery_partner_id: Optional[str] = None
    delivery_partner_name: Optional[str] = None
    resolved_by: Optional[str] = None
    resolver_name: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    order_total: Optional[float] = None
    order_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[ReturnRequestItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
