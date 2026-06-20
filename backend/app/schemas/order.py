from pydantic import BaseModel, ConfigDict, model_validator
from typing import Optional, List, Any
from datetime import datetime
from app.schemas.payment_event import PaymentEventResponse


class OrderItemResponse(BaseModel):
    id: str
    order_id: str
    product_id: Optional[str] = None
    product_name: str
    product_price: float
    quantity: int
    is_returnable: bool = False
    return_window_days: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def resolve_product_fields(cls, data: Any) -> Any:
        if hasattr(data, 'product') and data.product:
            product = data.product
            if hasattr(data, '__dict__'):
                d = {k: v for k, v in data.__dict__.items() if not k.startswith('_')}
                d['is_returnable'] = getattr(product, 'is_returnable', False) or False
                d['return_window_days'] = getattr(product, 'return_window_days', None)
                return d
        return data


class OrderStatusHistoryResponse(BaseModel):
    id: str
    order_id: str
    from_status: Optional[str] = None
    to_status: str
    changed_by: Optional[str] = None
    changed_by_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: str
    user_id: str
    address_snapshot: Optional[Any] = None
    total: float
    status: str
    stripe_payment_intent_id: Optional[str] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []
    payment_events: List[PaymentEventResponse] = []
    status_history: List[OrderStatusHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None

    @model_validator(mode='after')
    def validate_cancellation_reason(self):
        if self.status == 'cancelled' and not self.cancellation_reason:
            raise ValueError('Cancellation reason is required when cancelling an order')
        return self


class CheckoutRequest(BaseModel):
    address_id: str


class ConfirmPaymentRequest(BaseModel):
    payment_intent_id: str


class PaymentFailureReport(BaseModel):
    order_id: str
    error_code: Optional[str] = None
    error_message: str
    decline_code: Optional[str] = None
