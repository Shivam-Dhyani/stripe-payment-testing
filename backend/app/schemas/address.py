from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class AddressCreate(BaseModel):
    label: Optional[str] = None
    street: str
    city: str
    state: str
    zip_code: str
    country: str = "US"
    is_default: bool = False


class AddressUpdate(BaseModel):
    label: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    is_default: Optional[bool] = None


class AddressResponse(BaseModel):
    id: str
    user_id: str
    label: Optional[str] = None
    street: str
    city: str
    state: str
    zip_code: str
    country: str
    is_default: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
