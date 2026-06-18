from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


class ProductCreate(BaseModel):
    sub_category_id: str
    name: str
    description: Optional[str] = None
    price: float
    stock: int = 0
    image_url: Optional[str] = None


class ProductUpdate(BaseModel):
    sub_category_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
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
    price: float
    stock: int
    image_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    sub_category: Optional[SubCategoryInfo] = Field(default=None, validation_alias="subcategory")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
