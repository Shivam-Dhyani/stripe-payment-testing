from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from decimal import Decimal
from app.database import get_db
from app.models.user import User, UserRole
from app.models.cart import CartItem
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus
from app.models.address import Address
from app.models.payment_event import PaymentEvent, PaymentEventType
from app.schemas.order import OrderResponse, OrderStatusUpdate, CheckoutRequest, ConfirmPaymentRequest, PaymentFailureReport
from app.middleware.auth import get_current_user, get_admin_user
from app.services.stripe_service import create_payment_intent

router = APIRouter(prefix="/orders", tags=["Orders"], redirect_slashes=False)


@router.post("/checkout", response_model=dict)
def checkout(
    data: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an order from the cart, create Stripe PaymentIntent, and decrement stock."""
    # Get user's cart items
    cart_items = (
        db.query(CartItem)
        .options(joinedload(CartItem.product))
        .filter(CartItem.user_id == current_user.id)
        .all()
    )
    if not cart_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    # Validate address
    address = db.query(Address).filter(
        Address.id == data.address_id, Address.user_id == current_user.id
    ).first()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

    # Validate stock and calculate total
    total = Decimal("0.00")
    order_items_data = []
    for item in cart_items:
        product = item.product
        if not product or not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{item.product_id}' is no longer available",
            )
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for '{product.name}'",
            )
        item_total = product.price * item.quantity
        total += item_total
        order_items_data.append({
            "product_id": product.id,
            "product_name": product.name,
            "product_price": product.price,
            "quantity": item.quantity,
        })

    # Create address snapshot
    address_snapshot = {
        "label": address.label,
        "street": address.street,
        "city": address.city,
        "state": address.state,
        "zip_code": address.zip_code,
        "country": address.country,
    }

    # Create Stripe PaymentIntent
    try:
        amount_cents = int(total * 100)
        payment_intent = create_payment_intent(
            amount=amount_cents,
            currency="usd",
            metadata={"user_id": current_user.id},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment processing error: {str(e)}",
        )

    # Create order
    order = Order(
        user_id=current_user.id,
        address_snapshot=address_snapshot,
        total=total,
        status=OrderStatus.pending,
        stripe_payment_intent_id=payment_intent["id"],
    )
    db.add(order)
    db.flush()

    # Create order items and decrement stock
    for item_data in order_items_data:
        order_item = OrderItem(order_id=order.id, **item_data)
        db.add(order_item)
        product = db.query(Product).filter(Product.id == item_data["product_id"]).first()
        product.stock -= item_data["quantity"]

    # Record payment created event
    payment_event = PaymentEvent(
        order_id=order.id,
        event_type=PaymentEventType.created,
        message="Payment intent created",
        event_data={"payment_intent_id": payment_intent["id"], "amount_cents": amount_cents, "currency": "usd"},
    )
    db.add(payment_event)

    # Clear cart
    db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()
    db.commit()
    db.refresh(order)

    return {
        "order_id": order.id,
        "total": float(order.total),
        "client_secret": payment_intent["client_secret"],
        "payment_intent_id": payment_intent["id"],
    }


@router.post("/confirm", response_model=OrderResponse)
def confirm_payment(
    data: ConfirmPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirm payment and update order status to processing."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.payment_events))
        .filter(
            Order.stripe_payment_intent_id == data.payment_intent_id,
            Order.user_id == current_user.id,
        )
        .first()
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    order.status = OrderStatus.processing
    payment_event = PaymentEvent(
        order_id=order.id,
        event_type=PaymentEventType.succeeded,
        message="Payment confirmed successfully",
        event_data={"payment_intent_id": data.payment_intent_id},
    )
    db.add(payment_event)
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/confirm", response_model=OrderResponse)
def confirm_payment_by_order(
    order_id: str,
    data: ConfirmPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirm payment by order ID and update order status to processing."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.payment_events))
        .filter(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
        .first()
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    order.status = OrderStatus.processing
    payment_event = PaymentEvent(
        order_id=order.id,
        event_type=PaymentEventType.succeeded,
        message="Payment confirmed successfully",
        event_data={"payment_intent_id": data.payment_intent_id},
    )
    db.add(payment_event)
    db.commit()
    db.refresh(order)
    return order


@router.post("/payment-failed", response_model=dict)
def report_payment_failure(
    data: PaymentFailureReport,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Report a payment failure from the frontend (card decline, etc.)."""
    order = db.query(Order).filter(
        Order.id == data.order_id,
        Order.user_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    payment_event = PaymentEvent(
        order_id=order.id,
        event_type=PaymentEventType.failed,
        message=data.error_message,
        event_data={
            "error_code": data.error_code,
            "decline_code": data.decline_code,
        },
    )
    db.add(payment_event)
    db.commit()
    return {"status": "recorded"}


@router.get("/all", response_model=List[OrderResponse])
def list_all_orders(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """List all orders (admin only)."""
    return (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.payment_events))
        .order_by(Order.created_at.desc())
        .all()
    )


@router.get("", response_model=List[OrderResponse])
def list_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List orders. Admins see all orders, customers see their own."""
    query = db.query(Order).options(joinedload(Order.items), joinedload(Order.payment_events))
    if current_user.role != UserRole.admin:
        query = query.filter(Order.user_id == current_user.id)
    return query.order_by(Order.created_at.desc()).all()


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single order by ID."""
    query = db.query(Order).options(joinedload(Order.items), joinedload(Order.payment_events)).filter(Order.id == order_id)
    if current_user.role != UserRole.admin:
        query = query.filter(Order.user_id == current_user.id)
    order = query.first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderResponse)
@router.put("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Update order status (admin only)."""
    order = db.query(Order).options(joinedload(Order.items), joinedload(Order.payment_events)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    try:
        new_status = OrderStatus(data.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {[s.value for s in OrderStatus]}",
        )
    event_type_map = {
        OrderStatus.cancelled: PaymentEventType.cancelled,
        OrderStatus.shipped: PaymentEventType.processing,
        OrderStatus.delivered: PaymentEventType.succeeded,
    }
    if new_status in event_type_map:
        event = PaymentEvent(
            order_id=order.id,
            event_type=event_type_map[new_status],
            message=f"Order status changed to {new_status.value}",
        )
        db.add(event)
    order.status = new_status
    db.commit()
    db.refresh(order)
    return order
