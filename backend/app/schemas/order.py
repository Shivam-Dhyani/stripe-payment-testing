from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal


class OrderItemResponse(BaseModel):
    id: str
    order_id: str
    product_id: Optional[str] = None
    product_name: str
    product_price: Decimal
    quantity: int

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: str
    user_id: str
    address_snapshot: Optional[Any] = None
    total: Decimal
    status: str
    stripe_payment_intent_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    status: str


class CheckoutRequest(BaseModel):
    address_id: str


class ConfirmPaymentRequest(BaseModel):
    payment_intent_id: str
