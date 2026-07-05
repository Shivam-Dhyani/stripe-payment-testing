from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from datetime import datetime
from app.database import get_db
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatusHistory, recompute_payment_status
from app.models.cancellation_request import CancellationRequest
from app.models.payment_event import PaymentEvent, PaymentEventType
from app.services.stripe_service import create_refund
from app.schemas.cancellation_request import (
    CancellationRequestCreate, CancellationRequestResolve, CancellationRequestResponse
)
from app.middleware.auth import get_current_user, get_admin_user
from app.realtime import notify_order_change
from app.config import settings
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/cancellation-requests", tags=["Cancellation Requests"], redirect_slashes=False)

# Orders that are still inside the store (pre-dispatch) may be cancelled.
from app.models.order import CANCELLABLE_STATUSES as CANCELLABLE_ORDER_STATUSES


def _build_response(req, db: Session) -> CancellationRequestResponse:
    """Build a CancellationRequestResponse with computed fields from related models."""
    user = db.query(User).filter(User.id == req.user_id).first()
    order = db.query(Order).filter(Order.id == req.order_id).first()
    resolver = db.query(User).filter(User.id == req.resolved_by).first() if req.resolved_by else None
    resp = CancellationRequestResponse.model_validate(req)
    resp.customer_name = f"{user.first_name} {user.last_name}" if user else None
    resp.customer_email = user.email if user else None
    resp.order_total = float(order.total) if order else None
    resp.order_status = order.status if order else None
    resp.resolver_name = f"{resolver.first_name} {resolver.last_name}" if resolver else None
    return resp


@router.get("/pending/count", response_model=dict)
def get_pending_count(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get count of pending cancellation requests (for sidebar badge)."""
    count = db.query(func.count(CancellationRequest.id)).filter(
        CancellationRequest.status == "pending"
    ).scalar()
    return {"count": count}


@router.post("", response_model=CancellationRequestResponse)
def create_cancellation_request(
    data: CancellationRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer creates a cancellation request for a pre-delivery order."""
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if order.status not in CANCELLABLE_ORDER_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot request cancellation for order with status '{order.status}'. "
                   f"Only pre-delivery orders can be cancelled.",
        )

    existing = db.query(CancellationRequest).filter(
        CancellationRequest.order_id == data.order_id,
        CancellationRequest.status == "pending",
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pending cancellation request already exists for this order",
        )

    cancellation_request = CancellationRequest(
        order_id=data.order_id,
        user_id=current_user.id,
        reason=data.reason,
        status="pending",
    )
    db.add(cancellation_request)
    db.commit()
    db.refresh(cancellation_request)

    # New cancellation request -> refresh admin views in real time.
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if order:
        notify_order_change(order)

    return _build_response(cancellation_request, db)


@router.get("", response_model=List[CancellationRequestResponse])
def list_cancellation_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List cancellation requests. Admins see all, customers see their own."""
    query = db.query(CancellationRequest)
    if current_user.role != UserRole.admin:
        query = query.filter(CancellationRequest.user_id == current_user.id)

    requests = query.order_by(CancellationRequest.created_at.desc()).all()
    return [_build_response(req, db) for req in requests]


@router.get("/{request_id}", response_model=CancellationRequestResponse)
def get_cancellation_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single cancellation request by ID."""
    req = db.query(CancellationRequest).filter(CancellationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cancellation request not found")

    if current_user.role != UserRole.admin and req.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    return _build_response(req, db)


@router.put("/{request_id}/resolve", response_model=CancellationRequestResponse)
def resolve_cancellation_request(
    request_id: str,
    data: CancellationRequestResolve,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Admin resolves a cancellation request (approve or reject)."""
    req = db.query(CancellationRequest).filter(CancellationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cancellation request not found")

    if req.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cancellation request is already '{req.status}' and cannot be resolved",
        )

    if data.status == "approved":
        order = db.query(Order).filter(Order.id == req.order_id).first()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        # Approving a cancellation request may cancel any pre-delivery order
        # (confirmed/processing/shipped) — the same statuses a request is allowed for.
        if order.status not in CANCELLABLE_ORDER_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order status '{order.status}' can no longer be cancelled "
                       f"(it may already be delivered or cancelled)",
            )

        old_status = order.status
        order.status = "cancelled"
        order.cancellation_reason = req.reason

        payment_event = PaymentEvent(
            order_id=order.id,
            event_type=PaymentEventType.cancelled,
            message=f"Order cancelled via cancellation request: {req.reason}",
        )
        db.add(payment_event)

        history = OrderStatusHistory(
            order_id=order.id,
            from_status=old_status,
            to_status="cancelled",
            changed_by=admin.id,
            notes=f"Cancellation request approved: {req.reason}",
        )
        db.add(history)

        if order.stripe_payment_intent_id and order.payment_status == "paid":
            try:
                create_refund(
                    order.stripe_payment_intent_id,
                    idempotency_key=f"refund_cancel_{order.id}",
                )
                order.refunded_amount = order.total
                recompute_payment_status(order)
                db.add(PaymentEvent(
                    order_id=order.id,
                    event_type=PaymentEventType.refunded,
                    message="Full refund issued for cancelled order",
                    event_data={"refund_amount": float(order.total)},
                ))
            except stripe.StripeError:
                pass

    req.status = data.status
    req.admin_notes = data.admin_notes
    req.resolved_by = admin.id
    req.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(req)

    resolved_order = db.query(Order).filter(Order.id == req.order_id).first()
    if resolved_order:
        notify_order_change(resolved_order)

    return _build_response(req, db)
