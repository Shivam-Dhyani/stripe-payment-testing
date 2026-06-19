from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime


class PaymentEventResponse(BaseModel):
    id: str
    order_id: str
    event_type: str
    message: Optional[str] = None
    event_data: Optional[Any] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
