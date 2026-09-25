from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_admin_user
from app.models.user import User
from app.models.brand import Brand
from app.models.product import Product
from app.schemas.brand import BrandCreate, BrandUpdate, BrandResponse

router = APIRouter(prefix="/brands", tags=["Brands"], redirect_slashes=False)


def _with_counts(db: Session, brands: List[Brand]) -> List[BrandResponse]:
    """Attach the number of active products per brand (for admin + filters)."""
    counts = dict(
        db.query(Product.brand_id, func.count(Product.id))
        .filter(Product.is_active == True)  # noqa: E712
        .group_by(Product.brand_id)
        .all()
    )
    out = []
    for b in brands:
        resp = BrandResponse.model_validate(b)
        resp.product_count = counts.get(b.id, 0)
        out.append(resp)
    return out


@router.get("", response_model=List[BrandResponse])
def list_brands(include_inactive: bool = False, db: Session = Depends(get_db)):
    """Public: brands for storefront filtering (admins can include inactive)."""
    query = db.query(Brand)
    if not include_inactive:
        query = query.filter(Brand.is_active == True)  # noqa: E712
    brands = query.order_by(Brand.name.asc()).all()
    return _with_counts(db, brands)


@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create_brand(
    data: BrandCreate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    if db.query(Brand).filter(func.lower(Brand.name) == data.name.strip().lower()).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A brand with that name already exists")
    brand = Brand(name=data.name.strip(), description=data.description, logo_url=data.logo_url)
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return _with_counts(db, [brand])[0]


@router.put("/{brand_id}", response_model=BrandResponse)
def update_brand(
    brand_id: str,
    data: BrandUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    payload = data.model_dump(exclude_unset=True)
    if "name" in payload and payload["name"]:
        clash = (
            db.query(Brand)
            .filter(func.lower(Brand.name) == payload["name"].strip().lower(), Brand.id != brand_id)
            .first()
        )
        if clash:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A brand with that name already exists")
        payload["name"] = payload["name"].strip()
    for field, value in payload.items():
        setattr(brand, field, value)
    db.commit()
    db.refresh(brand)
    return _with_counts(db, [brand])[0]


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(
    brand_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Delete a brand. Products keep existing but become brand-less."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    db.query(Product).filter(Product.brand_id == brand_id).update(
        {Product.brand_id: None}, synchronize_session=False
    )
    db.delete(brand)
    db.commit()
