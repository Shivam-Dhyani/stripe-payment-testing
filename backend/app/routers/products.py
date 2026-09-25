import random
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models.product import Product
from app.models.subcategory import SubCategory
from app.models.product_variant import ProductVariant
from app.models.cart import CartItem
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, GenerateImageRequest, VariantCreate, VariantUpdate, VariantResponse
from app.middleware.auth import get_admin_user
from app.models.user import User

router = APIRouter(prefix="/products", tags=["Products"], redirect_slashes=False)


@router.post("/generate-image", response_model=dict)
def generate_product_image(
    data: GenerateImageRequest,
    admin: User = Depends(get_admin_user),
):
    """Generate a quick-commerce style product image URL from the product name.

    Uses a keyless AI image service (Pollinations) so it works out of the box.
    Swap the URL builder for OpenAI/Stability + object storage for production.
    """
    name = (data.name or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a product name first")

    descriptor = name if not data.category else f"{name}, {data.category}"
    prompt = (
        f"professional product packshot photo of {descriptor}, "
        "single item centered on a clean white seamless background, soft studio lighting, "
        "sharp focus, high detail, e-commerce grocery product listing, no text, no watermark"
    )
    seed = random.randint(1, 9_999_999)
    url = (
        "https://image.pollinations.ai/prompt/"
        f"{quote(prompt, safe='')}"
        f"?width=600&height=600&nologo=true&model=flux&seed={seed}"
    )
    return {"image_url": url, "prompt": prompt}


@router.get("")
def list_products(
    category_id: Optional[str] = Query(None, description="Filter by category ID"),
    sub_category_id: Optional[str] = Query(None, description="Filter by subcategory ID"),
    brand_id: Optional[str] = Query(None, description="Filter by brand ID"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    search: Optional[str] = Query(None, description="Search by product name"),
    sort_by: Optional[str] = Query("created_at", description="Sort field"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    include_inactive: bool = Query(False, description="Include inactive products (admin use)"),
    db: Session = Depends(get_db),
):
    """List products with pagination, filtering, and search."""
    base_query = db.query(Product)
    if not include_inactive:
        base_query = base_query.filter(Product.is_active == True)

    if sub_category_id:
        base_query = base_query.filter(Product.sub_category_id == sub_category_id)
    elif category_id:
        subcat_ids = [
            s.id for s in db.query(SubCategory).filter(SubCategory.category_id == category_id).all()
        ]
        base_query = base_query.filter(Product.sub_category_id.in_(subcat_ids))

    if brand_id:
        base_query = base_query.filter(Product.brand_id == brand_id)
    if min_price is not None:
        base_query = base_query.filter(Product.price >= min_price)
    if max_price is not None:
        base_query = base_query.filter(Product.price <= max_price)

    if search:
        base_query = base_query.filter(Product.name.ilike(f"%{search}%"))

    if sort_by and hasattr(Product, sort_by):
        col = getattr(Product, sort_by)
        base_query = base_query.order_by(col.desc() if sort_order == "desc" else col.asc())

    total = base_query.count()
    offset = (page - 1) * size
    products = (
        base_query.options(
            joinedload(Product.subcategory).joinedload(SubCategory.category),
            joinedload(Product.brand),
            joinedload(Product.variants),
        )
        .offset(offset)
        .limit(size)
        .all()
    )
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
        .options(
            joinedload(Product.subcategory).joinedload(SubCategory.category),
            joinedload(Product.brand),
            joinedload(Product.variants),
        )
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


# ---------------------------------------------------------------------------
# Product variants (admin-managed). Variants are optional: a product with none
# is bought directly; a product with active variants requires choosing one.
# ---------------------------------------------------------------------------

@router.get("/{product_id}/variants", response_model=List[VariantResponse])
def list_variants(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return sorted(product.variants or [], key=lambda v: (v.sort_order, v.label))


@router.post("/{product_id}/variants", response_model=VariantResponse, status_code=status.HTTP_201_CREATED)
def create_variant(
    product_id: str,
    data: VariantCreate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    variant = ProductVariant(product_id=product_id, **data.model_dump())
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant


@router.put("/{product_id}/variants/{variant_id}", response_model=VariantResponse)
def update_variant(
    product_id: str,
    variant_id: str,
    data: VariantUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.id == variant_id, ProductVariant.product_id == product_id)
        .first()
    )
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(variant, field, value)
    db.commit()
    db.refresh(variant)
    return variant


@router.delete("/{product_id}/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(
    product_id: str,
    variant_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Delete a variant. Past orders keep their snapshot (variant_label)."""
    variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.id == variant_id, ProductVariant.product_id == product_id)
        .first()
    )
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    # Drop it from live carts so nobody checks out a vanished option.
    db.query(CartItem).filter(CartItem.variant_id == variant_id).delete(synchronize_session=False)
    db.delete(variant)
    db.commit()
