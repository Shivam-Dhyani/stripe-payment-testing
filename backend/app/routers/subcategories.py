from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.subcategory import SubCategory
from app.schemas.subcategory import SubCategoryCreate, SubCategoryUpdate, SubCategoryResponse
from app.middleware.auth import get_admin_user
from app.models.user import User

router = APIRouter(prefix="/subcategories", tags=["SubCategories"], redirect_slashes=False)


@router.get("", response_model=List[SubCategoryResponse])
def list_subcategories(
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    include_inactive: bool = Query(False, description="Include inactive subcategories (admin use)"),
    db: Session = Depends(get_db),
):
    """List subcategories, optionally filtered by category."""
    query = db.query(SubCategory)
    if not include_inactive:
        query = query.filter(SubCategory.is_active == True)
    if category_id:
        query = query.filter(SubCategory.category_id == category_id)
    return query.all()


@router.post("", response_model=SubCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_subcategory(
    data: SubCategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Create a new subcategory (admin only)."""
    subcategory = SubCategory(**data.model_dump())
    db.add(subcategory)
    db.commit()
    db.refresh(subcategory)
    return subcategory


@router.put("/{subcategory_id}", response_model=SubCategoryResponse)
def update_subcategory(
    subcategory_id: str,
    data: SubCategoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Update a subcategory (admin only)."""
    subcategory = db.query(SubCategory).filter(SubCategory.id == subcategory_id).first()
    if not subcategory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SubCategory not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(subcategory, key, value)
    db.commit()
    db.refresh(subcategory)
    return subcategory


@router.delete("/{subcategory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subcategory(
    subcategory_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Soft delete a subcategory (admin only)."""
    subcategory = db.query(SubCategory).filter(SubCategory.id == subcategory_id).first()
    if not subcategory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SubCategory not found")
    subcategory.is_active = False
    db.commit()
