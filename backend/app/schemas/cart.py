from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class CartItemCreate(BaseModel):
    product_id: str
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartProductInfo(BaseModel):
    id: str
    name: str
    price: float
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


class AdminCartItemResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_price: float
    product_image: Optional[str] = None
    quantity: int
    stock: int
    created_at: datetime


class AdminCartUserResponse(BaseModel):
    user_id: str
    email: str
    first_name: str
    last_name: str
    cart_items: list[AdminCartItemResponse]
    total_items: int
    cart_total: float
