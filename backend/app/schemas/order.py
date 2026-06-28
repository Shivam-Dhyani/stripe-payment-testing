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
    returned_quantity: int = 0
    returnable_quantity: int = 0

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def resolve_related_fields(cls, data: Any) -> Any:
        if not hasattr(data, '__dict__'):
            return data
        d = {k: v for k, v in data.__dict__.items() if not k.startswith('_')}

        product = getattr(data, 'product', None)
        if product:
            d['is_returnable'] = getattr(product, 'is_returnable', False) or False
            d['return_window_days'] = getattr(product, 'return_window_days', None)

        # Quantity already claimed by non-rejected return requests is no longer
        # eligible to be returned/refunded again.
        ordered = getattr(data, 'quantity', 0) or 0
        returned = 0
        for ri in getattr(data, 'return_items', None) or []:
            rr = getattr(ri, 'return_request', None)
            if rr is not None and rr.status != 'rejected':
                returned += ri.quantity or 0
        d['returned_quantity'] = returned
        d['returnable_quantity'] = max(ordered - returned, 0)
        return d


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
