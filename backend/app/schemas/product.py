from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal


class ProductCreate(BaseModel):
    sub_category_id: str
    name: str
    description: Optional[str] = None
    price: Decimal
    stock: int = 0
    image_url: Optional[str] = None


class ProductUpdate(BaseModel):
    sub_category_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    stock: Optional[int] = None
    image_url: Optional[str] = None


class SubCategoryInfo(BaseModel):
    id: str
    name: str
    category_id: str

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    id: str
    sub_category_id: str
    name: str
    description: Optional[str] = None
    price: Decimal
    stock: int
    image_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    subcategory: Optional[SubCategoryInfo] = None

    model_config = ConfigDict(from_attributes=True)
