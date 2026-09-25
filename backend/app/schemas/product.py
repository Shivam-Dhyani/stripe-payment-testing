from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class GenerateImageRequest(BaseModel):
    name: str
    category: Optional[str] = None


class VariantBase(BaseModel):
    sku: Optional[str] = None
    option_values: Optional[dict] = None
    price: float
    mrp: Optional[float] = None
    stock: int = 0
    image_url: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0


class VariantCreate(VariantBase):
    pass


class VariantUpdate(BaseModel):
    sku: Optional[str] = None
    option_values: Optional[dict] = None
    price: Optional[float] = None
    mrp: Optional[float] = None
    stock: Optional[int] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class VariantResponse(VariantBase):
    id: str
    product_id: str
    label: str = ""
    discount_percent: int = 0

    model_config = ConfigDict(from_attributes=True)


class SpecRow(BaseModel):
    label: str
    value: str


class BrandInfo(BaseModel):
    id: str
    name: str
    logo_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProductCreate(BaseModel):
    sub_category_id: str
    brand_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    unit: Optional[str] = None
    price: float
    mrp: Optional[float] = None
    stock: int = 0
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    specifications: Optional[List[SpecRow]] = None
    variant_options: Optional[List[str]] = None
    is_returnable: bool = False
    return_window_days: Optional[int] = None


class ProductUpdate(BaseModel):
    sub_category_id: Optional[str] = None
    brand_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    mrp: Optional[float] = None
    stock: Optional[int] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    specifications: Optional[List[SpecRow]] = None
    variant_options: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_returnable: Optional[bool] = None
    return_window_days: Optional[int] = None


class CategoryInfo(BaseModel):
    id: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class SubCategoryInfo(BaseModel):
    id: str
    name: str
    category_id: str
    category: Optional[CategoryInfo] = None

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    id: str
    sub_category_id: str
    brand_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    unit: Optional[str] = None
    price: float
    mrp: Optional[float] = None
    discount_percent: int = 0
    stock: int
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    gallery: List[str] = []
    specifications: Optional[List[SpecRow]] = None
    brand: Optional[BrandInfo] = None
    variant_options: Optional[List[str]] = None
    variants: List[VariantResponse] = []
    has_variants: bool = False
    is_active: bool
    is_returnable: bool
    return_window_days: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    sub_category: Optional[SubCategoryInfo] = Field(default=None, validation_alias="subcategory")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
