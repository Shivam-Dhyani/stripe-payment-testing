from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class StoreSettingsResponse(BaseModel):
    delivery_fee: float
    free_delivery_threshold: float
    small_cart_fee: float
    small_cart_threshold: float
    tax_percent: float

    model_config = ConfigDict(from_attributes=True)


class StoreSettingsUpdate(BaseModel):
    delivery_fee: Optional[float] = Field(default=None, ge=0)
    free_delivery_threshold: Optional[float] = Field(default=None, ge=0)
    small_cart_fee: Optional[float] = Field(default=None, ge=0)
    small_cart_threshold: Optional[float] = Field(default=None, ge=0)
    tax_percent: Optional[float] = Field(default=None, ge=0, le=100)
