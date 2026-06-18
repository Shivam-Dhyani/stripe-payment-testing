from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models.product import Product
from app.models.subcategory import SubCategory
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.middleware.auth import get_admin_user
from app.models.user import User

router = APIRouter(prefix="/products", tags=["Products"], redirect_slashes=False)


@router.get("")
def list_products(
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    sub_category_id: Optional[str] = Query(None, description="Filter by subcategory ID"),
    search: Optional[str] = Query(None, description="Search by product name"),
    sort_by: Optional[str] = Query("created_at", description="Sort field"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """List products with pagination, filtering, and search."""
    base_query = db.query(Product).filter(Product.is_active == True)

    if sub_category_id:
        base_query = base_query.filter(Product.sub_category_id == sub_category_id)
    elif category_id:
        subcat_ids = [
            s.id for s in db.query(SubCategory).filter(SubCategory.category_id == category_id).all()
        ]
        base_query = base_query.filter(Product.sub_category_id.in_(subcat_ids))

    if search:
        base_query = base_query.filter(Product.name.ilike(f"%{search}%"))

    if sort_by and hasattr(Product, sort_by):
        col = getattr(Product, sort_by)
        base_query = base_query.order_by(col.desc() if sort_order == "desc" else col.asc())

    total = base_query.count()
    offset = (page - 1) * size
    products = base_query.options(joinedload(Product.subcategory)).offset(offset).limit(size).all()
    pages = (total + size - 1) // size

    return {
        "items": [ProductResponse.model_validate(p) for p in products],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: str, db: Session = Depends(get_db)):
    """Get a single product by ID."""
    product = (
        db.query(Product)
        .options(joinedload(Product.subcategory))
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Create a new product (admin only)."""
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Update a product (admin only)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Soft delete a product (admin only)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product.is_active = False
    db.commit()
