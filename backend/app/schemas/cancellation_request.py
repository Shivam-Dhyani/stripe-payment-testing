from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class CancellationRequestCreate(BaseModel):
    order_id: str
    reason: str


class CancellationRequestResolve(BaseModel):
    status: str  # "approved" or "rejected"
    admin_notes: Optional[str] = None


class CancellationRequestResponse(BaseModel):
    id: str
    order_id: str
    user_id: str
    reason: str
    status: str
    admin_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolver_name: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    order_total: Optional[float] = None
    order_status: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
