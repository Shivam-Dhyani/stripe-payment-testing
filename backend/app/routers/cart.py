from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartItemResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/cart", tags=["Cart"], redirect_slashes=False)


@router.get("", response_model=List[CartItemResponse])
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all items in the current user's cart."""
    return (
        db.query(CartItem)
        .options(joinedload(CartItem.product))
        .filter(CartItem.user_id == current_user.id)
        .all()
    )


@router.post("", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    data: CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add an item to the cart. If product already in cart, increase quantity."""
    product = db.query(Product).filter(Product.id == data.product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if product.stock < data.quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")

    existing = db.query(CartItem).filter(
        CartItem.user_id == current_user.id,
        CartItem.product_id == data.product_id,
    ).first()

    if existing:
        existing.quantity += data.quantity
        db.commit()
        db.refresh(existing)
        return existing

    cart_item = CartItem(
        user_id=current_user.id,
        product_id=data.product_id,
        quantity=data.quantity,
    )
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)
    # Eagerly load product
    db.refresh(cart_item, ["product"])
    return cart_item


@router.put("/{item_id}", response_model=CartItemResponse)
def update_cart_item(
    item_id: str,
    data: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update quantity of a cart item."""
    cart_item = db.query(CartItem).filter(
        CartItem.id == item_id, CartItem.user_id == current_user.id
    ).first()
    if not cart_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    if data.quantity <= 0:
        db.delete(cart_item)
        db.commit()
        return cart_item
    product = db.query(Product).filter(Product.id == cart_item.product_id).first()
    if product and product.stock < data.quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")
    cart_item.quantity = data.quantity
    db.commit()
    db.refresh(cart_item)
    return cart_item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cart_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove an item from the cart."""
    cart_item = db.query(CartItem).filter(
        CartItem.id == item_id, CartItem.user_id == current_user.id
    ).first()
    if not cart_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    db.delete(cart_item)
    db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clear all items from the cart."""
    db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()
    db.commit()
