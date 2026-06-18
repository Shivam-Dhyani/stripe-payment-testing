from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal


class CartItemCreate(BaseModel):
    product_id: str
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartProductInfo(BaseModel):
    id: str
    name: str
    price: Decimal
    image_url: Optional[str] = None
    stock: int

    model_config = ConfigDict(from_attributes=True)


class CartItemResponse(BaseModel):
    id: str
    user_id: str
    product_id: str
    quantity: int
    created_at: datetime
    product: Optional[CartProductInfo] = None

    model_config = ConfigDict(from_attributes=True)
