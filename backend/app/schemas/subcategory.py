from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class SubCategoryCreate(BaseModel):
    category_id: str
    name: str
    description: Optional[str] = None


class SubCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None


class SubCategoryResponse(BaseModel):
    id: str
    category_id: str
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
