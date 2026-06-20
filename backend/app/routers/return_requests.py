from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from datetime import datetime
from decimal import Decimal
from app.database import get_db
from app.models.user import User, UserRole
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.product import Product
from app.models.return_request import ReturnRequest, ReturnRequestItem
from app.models.payment_event import PaymentEvent, PaymentEventType
from app.schemas.return_request import (
    ReturnRequestCreate, ReturnRequestResolve, ReturnRequestResponse, ReturnRequestItemResponse
)
from app.middleware.auth import get_current_user, get_admin_user
from app.config import settings
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/return-requests", tags=["Return Requests"], redirect_slashes=False)


def _build_response(req, db: Session) -> ReturnRequestResponse:
    """Build a ReturnRequestResponse with computed fields from related models."""
    user = db.query(User).filter(User.id == req.user_id).first()
    order = db.query(Order).filter(Order.id == req.order_id).first()
    resolver = db.query(User).filter(User.id == req.resolved_by).first() if req.resolved_by else None

    resp = ReturnRequestResponse.model_validate(req)
    resp.customer_name = f"{user.first_name} {user.last_name}" if user else None
    resp.customer_email = user.email if user else None
    resp.order_total = float(order.total) if order else None
    resp.order_status = order.status if order else None
    resp.resolver_name = f"{resolver.first_name} {resolver.last_name}" if resolver else None

    for item_resp in resp.items:
        order_item = db.query(OrderItem).filter(OrderItem.id == item_resp.order_item_id).first()
        if order_item:
            item_resp.product_name = order_item.product_name
            item_resp.product_price = float(order_item.product_price)

    return resp


@router.get("/pending/count", response_model=dict)
def get_pending_count(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get count of pending return requests (non-terminal, non-completed) for sidebar badge."""
    count = db.query(func.count(ReturnRequest.id)).filter(
        ReturnRequest.status.in_(["requested", "approved", "pickup_scheduled"])
    ).scalar()
    return {"count": count}


@router.post("", response_model=ReturnRequestResponse)
def create_return_request(
    data: ReturnRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer creates a return request for a delivered order."""
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if order.status != "delivered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot request return for order with status '{order.status}'. "
                   f"Only delivered orders can be returned.",
        )

    # Find delivery date from order status history
    delivery_entry = (
        db.query(OrderStatusHistory)
        .filter(
            OrderStatusHistory.order_id == order.id,
            OrderStatusHistory.to_status == "delivered",
        )
        .order_by(OrderStatusHistory.created_at.desc())
        .first()
    )
    delivery_date = delivery_entry.created_at if delivery_entry else order.updated_at

    refund_amount = Decimal("0.00")

    for item_data in data.items:
        order_item = db.query(OrderItem).filter(OrderItem.id == item_data.order_item_id).first()
        if not order_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order item '{item_data.order_item_id}' not found",
            )

        if order_item.order_id != order.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order item '{item_data.order_item_id}' does not belong to this order",
            )

        product = db.query(Product).filter(Product.id == order_item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product for order item '{item_data.order_item_id}' not found",
            )

        if not product.is_returnable:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{product.name}' is not returnable",
            )

        if product.return_window_days is not None:
            days_since_delivery = (datetime.utcnow() - delivery_date).days
            if days_since_delivery > product.return_window_days:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Return window of {product.return_window_days} days has expired "
                           f"for product '{product.name}'",
                )

        if item_data.quantity > order_item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Return quantity ({item_data.quantity}) exceeds ordered quantity "
                       f"({order_item.quantity}) for '{order_item.product_name}'",
            )

        refund_amount += order_item.product_price * item_data.quantity

    return_request = ReturnRequest(
        order_id=data.order_id,
        user_id=current_user.id,
        reason=data.reason,
        status="requested",
        refund_amount=refund_amount,
    )
    db.add(return_request)
    db.flush()

    for item_data in data.items:
        return_item = ReturnRequestItem(
            return_request_id=return_request.id,
            order_item_id=item_data.order_item_id,
            quantity=item_data.quantity,
        )
        db.add(return_item)

    db.commit()
    db.refresh(return_request)

    return _build_response(return_request, db)


@router.get("", response_model=List[ReturnRequestResponse])
def list_return_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List return requests. Admins see all, customers see their own."""
    query = db.query(ReturnRequest)
    if current_user.role != UserRole.admin:
        query = query.filter(ReturnRequest.user_id == current_user.id)

    requests = query.options(joinedload(ReturnRequest.items)).order_by(ReturnRequest.created_at.desc()).all()
    return [_build_response(req, db) for req in requests]


@router.get("/{request_id}", response_model=ReturnRequestResponse)
def get_return_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single return request by ID."""
    req = db.query(ReturnRequest).options(joinedload(ReturnRequest.items)).filter(ReturnRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return request not found")

    if current_user.role != UserRole.admin and req.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    return _build_response(req, db)


VALID_RETURN_TRANSITIONS = {
    "requested": {"approved", "rejected"},
    "approved": {"pickup_scheduled"},
    "pickup_scheduled": {"received"},
    "received": {"refunded"},
}


@router.put("/{request_id}/resolve", response_model=ReturnRequestResponse)
def resolve_return_request(
    request_id: str,
    data: ReturnRequestResolve,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Admin updates return request status through the return workflow."""
    req = db.query(ReturnRequest).filter(ReturnRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return request not found")

    allowed = VALID_RETURN_TRANSITIONS.get(req.status, set())
    if data.status not in allowed:
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Return request is '{req.status}' which is a terminal status and cannot be changed",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change return status from '{req.status}' to '{data.status}'. "
                   f"Allowed: {sorted(allowed)}",
        )

    if data.status == "pickup_scheduled":
        if not data.pickup_date or not data.pickup_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="pickup_date and pickup_address are required when scheduling pickup",
            )
        req.pickup_date = data.pickup_date
        req.pickup_address = data.pickup_address

    if data.status == "refunded":
        order = db.query(Order).filter(Order.id == req.order_id).first()
        if order and order.stripe_payment_intent_id:
            try:
                refund_amount_cents = int(req.refund_amount * 100)
                stripe.Refund.create(
                    payment_intent=order.stripe_payment_intent_id,
                    amount=refund_amount_cents,
                )
            except stripe.StripeError:
                pass

        payment_event = PaymentEvent(
            order_id=req.order_id,
            event_type=PaymentEventType.refunded,
            message=f"Refund issued for return request: {req.reason}",
            event_data={"refund_amount": float(req.refund_amount)},
        )
        db.add(payment_event)

    req.status = data.status
    if data.admin_notes:
        req.admin_notes = data.admin_notes
    req.resolved_by = admin.id

    db.commit()
    db.refresh(req)

    return _build_response(req, db)
