from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartItemResponse, AdminCartUserResponse, AdminCartItemResponse
from app.middleware.auth import get_current_user, get_admin_user

router = APIRouter(prefix="/cart", tags=["Cart"], redirect_slashes=False)


@router.get("/admin/all", response_model=List[AdminCartUserResponse])
def get_all_carts(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get all users' cart items grouped by user (admin only)."""
    users_with_carts = (
        db.query(User)
        .join(CartItem, CartItem.user_id == User.id)
        .options(joinedload(User.cart_items).joinedload(CartItem.product))
        .distinct()
        .all()
    )
    result = []
    for user in users_with_carts:
        if not user.cart_items:
            continue
        cart_total = sum(
            (float(item.product.price) * item.quantity) if item.product else 0
            for item in user.cart_items
        )
        result.append(AdminCartUserResponse(
            user_id=user.id,
            email=user.email,
            first_name=user.first_name or "",
            last_name=user.last_name or "",
            cart_items=[
                AdminCartItemResponse(
                    id=item.id,
                    product_id=item.product_id,
                    product_name=item.product.name if item.product else "Deleted Product",
                    product_price=float(item.product.price) if item.product else 0,
                    product_image=item.product.image_url if item.product else None,
                    quantity=item.quantity,
                    stock=item.product.stock if item.product else 0,
                    created_at=item.created_at,
                )
                for item in user.cart_items
            ],
            total_items=len(user.cart_items),
            cart_total=cart_total,
        ))
    return result


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
