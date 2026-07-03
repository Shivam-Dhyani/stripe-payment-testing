from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from datetime import datetime
from decimal import Decimal
from app.database import get_db
from app.models.user import User, UserRole
from app.models.order import Order, OrderItem, OrderStatusHistory, recompute_payment_status
from app.models.product import Product
from app.models.return_request import ReturnRequest, ReturnRequestItem, ReturnStatusHistory
from app.models.payment_event import PaymentEvent, PaymentEventType
from app.schemas.return_request import (
    ReturnRequestCreate, ReturnRequestResolve, ReturnRequestResponse, ReturnRequestItemResponse,
    SchedulePickupRequest, ReturnAssignRider, ReturnStatusHistoryResponse,
)
from app.middleware.auth import get_current_user, get_admin_user
from app.services.stripe_service import create_refund
from app.services.push_service import notify_user_safe
from app.config import settings
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/return-requests", tags=["Return Requests"], redirect_slashes=False)


# Returns in these statuses no longer reserve item quantity (the units are free to return again).
INACTIVE_RETURN_STATUSES = ("rejected", "withdrawn")


def _already_returned_qty(db: Session, order_item_id: str) -> int:
    """Total quantity of an order item already claimed by active (non-cancelled) return requests."""
    rows = (
        db.query(ReturnRequestItem.quantity)
        .join(ReturnRequest, ReturnRequest.id == ReturnRequestItem.return_request_id)
        .filter(
            ReturnRequestItem.order_item_id == order_item_id,
            ReturnRequest.status.notin_(INACTIVE_RETURN_STATUSES),
        )
        .all()
    )
    return sum(r.quantity for r in rows)


def _format_address(addr) -> str:
    """Build a single-line address string from an order's address snapshot."""
    if not addr:
        return ""
    parts = [addr.get("street"), addr.get("city"), addr.get("state"), addr.get("zip_code"), addr.get("country")]
    return ", ".join(p for p in parts if p)


def _record_history(db: Session, req: ReturnRequest, status_value: str, user_id) -> None:
    """Append a return status-transition entry (timestamped, with the acting user)."""
    db.add(ReturnStatusHistory(return_request_id=req.id, status=status_value, changed_by=user_id))


def _build_status_history(req, db: Session, hide_actors: bool):
    """Build the timeline entries. Falls back to created/updated timestamps for
    returns that predate the history table so their timeline isn't blank."""
    rows = list(req.status_history or [])
    if not rows:
        history = [ReturnStatusHistoryResponse(status="requested", created_at=req.created_at)]
        if req.status != "requested":
            history.append(ReturnStatusHistoryResponse(status=req.status, created_at=req.updated_at))
        return history

    history = []
    for h in sorted(rows, key=lambda x: x.created_at):
        actor = db.query(User).filter(User.id == h.changed_by).first() if h.changed_by else None
        history.append(ReturnStatusHistoryResponse(
            status=h.status,
            changed_by=h.changed_by,
            actor_name=None if hide_actors or not actor else f"{actor.first_name} {actor.last_name}".strip(),
            actor_role=None if hide_actors or not actor else str(actor.role),
            created_at=h.created_at,
        ))
    return history


def _build_response(req, db: Session, hide_actors: bool = False) -> ReturnRequestResponse:
    """Build a ReturnRequestResponse with computed fields from related models.

    hide_actors=True omits staff names (used for customer-facing responses).
    """
    user = db.query(User).filter(User.id == req.user_id).first()
    order = db.query(Order).filter(Order.id == req.order_id).first()
    resolver = db.query(User).filter(User.id == req.resolved_by).first() if req.resolved_by else None

    rider = db.query(User).filter(User.id == req.delivery_partner_id).first() if req.delivery_partner_id else None

    resp = ReturnRequestResponse.model_validate(req)
    resp.customer_name = f"{user.first_name} {user.last_name}" if user else None
    resp.customer_email = user.email if user else None
    resp.order_total = float(order.total) if order else None
    resp.order_status = order.status if order else None
    resp.resolver_name = None if hide_actors else (f"{resolver.first_name} {resolver.last_name}" if resolver else None)
    resp.delivery_partner_name = None if hide_actors else (f"{rider.first_name} {rider.last_name}" if rider else None)
    resp.status_history = _build_status_history(req, db, hide_actors)

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
        ReturnRequest.status.in_(["requested", "approved", "pickup_scheduled", "handed_over", "received"])
    ).scalar()
    return {"count": count}


@router.get("/pickups", response_model=List[ReturnRequestResponse])
def rider_pickups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return pickups assigned to the current delivery partner."""
    if current_user.role not in (UserRole.admin, UserRole.delivery_partner):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Delivery partner access required")
    query = db.query(ReturnRequest).options(joinedload(ReturnRequest.items)).filter(
        ReturnRequest.status.in_(["approved", "pickup_scheduled", "handed_over"])
    )
    if current_user.role == UserRole.delivery_partner:
        query = query.filter(ReturnRequest.delivery_partner_id == current_user.id)
    requests = query.order_by(ReturnRequest.created_at.desc()).all()
    return [_build_response(r, db) for r in requests]


@router.get("/inbound", response_model=List[ReturnRequestResponse])
def warehouse_inbound(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns in transit to the warehouse, awaiting receipt."""
    if current_user.role not in (UserRole.admin, UserRole.warehouse_operator):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Warehouse access required")
    requests = (
        db.query(ReturnRequest)
        .options(joinedload(ReturnRequest.items))
        .filter(ReturnRequest.status == "handed_over")
        .order_by(ReturnRequest.created_at.desc())
        .all()
    )
    return [_build_response(r, db) for r in requests]


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

        if item_data.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Return quantity must be at least 1 for '{order_item.product_name}'",
            )

        remaining = order_item.quantity - _already_returned_qty(db, order_item.id)
        if remaining <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{order_item.product_name}' has already been returned and cannot be returned again",
            )
        if item_data.quantity > remaining:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only {remaining} unit(s) of '{order_item.product_name}' are still "
                       f"eligible for return",
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

    _record_history(db, return_request, "requested", current_user.id)

    db.commit()
    db.refresh(return_request)

    return _build_response(return_request, db, hide_actors=True)


@router.get("", response_model=List[ReturnRequestResponse])
def list_return_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List return requests. Admins see all, customers see their own."""
    query = db.query(ReturnRequest)
    if current_user.role != UserRole.admin:
        query = query.filter(ReturnRequest.user_id == current_user.id)

    requests = (
        query.options(joinedload(ReturnRequest.items), joinedload(ReturnRequest.status_history))
        .order_by(ReturnRequest.created_at.desc())
        .all()
    )
    hide = current_user.role != UserRole.admin
    return [_build_response(req, db, hide_actors=hide) for req in requests]


@router.get("/{request_id}", response_model=ReturnRequestResponse)
def get_return_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single return request by ID."""
    req = (
        db.query(ReturnRequest)
        .options(joinedload(ReturnRequest.items), joinedload(ReturnRequest.status_history))
        .filter(ReturnRequest.id == request_id)
        .first()
    )
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return request not found")

    if current_user.role != UserRole.admin and req.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    return _build_response(req, db, hide_actors=current_user.role != UserRole.admin)


# Admin-driven transitions. Scheduling pickup and confirming hand-over are
# customer-driven (see the dedicated endpoints below).
VALID_RETURN_TRANSITIONS = {
    "requested": {"approved", "rejected"},
    "handed_over": {"received"},
    "received": {"refunded"},
}


@router.put("/{request_id}/resolve", response_model=ReturnRequestResponse)
def resolve_return_request(
    request_id: str,
    data: ReturnRequestResolve,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Admin updates return request status (approve/reject, mark received, process refund)."""
    req = db.query(ReturnRequest).filter(ReturnRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return request not found")

    allowed = VALID_RETURN_TRANSITIONS.get(req.status, set())
    if data.status not in allowed:
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Return request is '{req.status}' and is either awaiting a customer "
                       f"action or in a terminal state",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change return status from '{req.status}' to '{data.status}'. "
                   f"Allowed: {sorted(allowed)}",
        )

    if data.status == "refunded":
        order = db.query(Order).filter(Order.id == req.order_id).first()
        refund_amount = req.refund_amount or Decimal("0")

        # Never refund more than the order total across all refunds.
        already = order.refunded_amount or Decimal("0") if order else Decimal("0")
        remaining = (order.total - already) if order else Decimal("0")
        if order and refund_amount > remaining:
            refund_amount = max(remaining, Decimal("0"))

        if order and order.stripe_payment_intent_id and refund_amount > 0:
            try:
                create_refund(
                    order.stripe_payment_intent_id,
                    amount_cents=int(refund_amount * 100),
                    idempotency_key=f"refund_return_{req.id}",
                )
                order.refunded_amount = already + refund_amount
                recompute_payment_status(order)
            except stripe.StripeError:
                pass

        db.add(PaymentEvent(
            order_id=req.order_id,
            event_type=PaymentEventType.refunded,
            message=f"Refund issued for return request: {req.reason}",
            event_data={"refund_amount": float(refund_amount)},
        ))

    req.status = data.status
    if data.admin_notes:
        req.admin_notes = data.admin_notes
    req.resolved_by = admin.id
    _record_history(db, req, data.status, admin.id)

    db.commit()
    db.refresh(req)

    return _build_response(req, db)


def _get_own_return(request_id: str, current_user: User, db: Session) -> ReturnRequest:
    """Fetch a return request and ensure it belongs to the current customer."""
    req = (
        db.query(ReturnRequest)
        .options(joinedload(ReturnRequest.items), joinedload(ReturnRequest.status_history))
        .filter(ReturnRequest.id == request_id)
        .first()
    )
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return request not found")
    if req.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return req


@router.post("/{request_id}/schedule-pickup", response_model=ReturnRequestResponse)
def schedule_pickup(
    request_id: str,
    data: SchedulePickupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer schedules the pickup after the return has been approved."""
    req = _get_own_return(request_id, current_user, db)

    if req.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pickup can only be scheduled once the return is approved (current status: '{req.status}')",
        )

    order = db.query(Order).filter(Order.id == req.order_id).first()
    req.pickup_date = data.pickup_date
    req.pickup_address = data.pickup_address or _format_address(order.address_snapshot if order else None)
    req.status = "pickup_scheduled"
    _record_history(db, req, "pickup_scheduled", current_user.id)

    db.commit()
    db.refresh(req)
    return _build_response(req, db, hide_actors=True)


@router.post("/{request_id}/withdraw", response_model=ReturnRequestResponse)
def withdraw_return(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer withdraws their own return before the item is handed over."""
    req = _get_own_return(request_id, current_user, db)

    if req.status not in {"requested", "approved", "pickup_scheduled"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A return that is '{req.status}' can no longer be withdrawn",
        )

    req.status = "withdrawn"
    _record_history(db, req, "withdrawn", current_user.id)
    db.commit()
    db.refresh(req)
    return _build_response(req, db, hide_actors=True)


def _get_return_or_404(request_id: str, db: Session) -> ReturnRequest:
    req = (
        db.query(ReturnRequest)
        .options(joinedload(ReturnRequest.items), joinedload(ReturnRequest.status_history))
        .filter(ReturnRequest.id == request_id)
        .first()
    )
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return request not found")
    return req


@router.put("/{request_id}/assign-rider", response_model=ReturnRequestResponse)
def assign_return_rider(
    request_id: str,
    data: ReturnAssignRider,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Admin assigns a delivery partner to collect the returned item."""
    req = _get_return_or_404(request_id, db)
    if req.status not in {"approved", "pickup_scheduled", "handed_over"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A rider can only be assigned before the item is received",
        )
    rider = db.query(User).filter(User.id == data.delivery_partner_id).first()
    if not rider or rider.role != UserRole.delivery_partner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="delivery_partner_id must reference a delivery partner",
        )
    previous_rider = req.delivery_partner_id
    req.delivery_partner_id = data.delivery_partner_id
    db.commit()
    db.refresh(req)

    if data.delivery_partner_id != previous_rider:
        notify_user_safe(
            db, data.delivery_partner_id,
            "New return pickup 📦",
            "A return is ready to collect from a customer.",
            url="/rider",
        )

    return _build_response(req, db)


@router.post("/{request_id}/mark-picked-up", response_model=ReturnRequestResponse)
def mark_picked_up(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delivery partner confirms collecting the returned item from the customer."""
    if current_user.role not in (UserRole.admin, UserRole.delivery_partner):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Delivery partner access required")
    req = _get_return_or_404(request_id, db)
    if current_user.role == UserRole.delivery_partner and req.delivery_partner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This return is not assigned to you")
    if req.status != "pickup_scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pickup can only be confirmed once scheduled (current status: '{req.status}')",
        )
    req.status = "handed_over"
    _record_history(db, req, "handed_over", current_user.id)
    db.commit()
    db.refresh(req)
    return _build_response(req, db, hide_actors=current_user.role != UserRole.admin)


@router.post("/{request_id}/mark-received", response_model=ReturnRequestResponse)
def mark_received(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Warehouse operator confirms the returned item arrived at the warehouse."""
    if current_user.role not in (UserRole.admin, UserRole.warehouse_operator):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Warehouse access required")
    req = _get_return_or_404(request_id, db)
    if req.status != "handed_over":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only in-transit returns can be received (current status: '{req.status}')",
        )
    req.status = "received"
    _record_history(db, req, "received", current_user.id)
    db.commit()
    db.refresh(req)
    return _build_response(req, db, hide_actors=current_user.role != UserRole.admin)
