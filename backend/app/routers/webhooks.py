from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.order import Order
from app.models.payment_event import PaymentEvent, PaymentEventType
from app.config import settings
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/webhooks", tags=["Webhooks"], redirect_slashes=False)


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events for payment lifecycle tracking."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data_object = event["data"]["object"]

    event_map = {
        "payment_intent.processing": (PaymentEventType.processing, "Payment is being processed"),
        "payment_intent.succeeded": (PaymentEventType.succeeded, "Payment succeeded"),
        "payment_intent.payment_failed": (PaymentEventType.failed, None),
        "payment_intent.canceled": (PaymentEventType.cancelled, "Payment was cancelled"),
        "charge.refunded": (PaymentEventType.refunded, "Payment was refunded"),
    }

    if event_type not in event_map:
        return {"status": "ignored"}

    payment_intent_id = data_object.get("id")
    if event_type == "charge.refunded":
        payment_intent_id = data_object.get("payment_intent")

    if not payment_intent_id:
        return {"status": "ignored"}

    db = SessionLocal()
    try:
        order = db.query(Order).filter(
            Order.stripe_payment_intent_id == payment_intent_id
        ).first()

        if not order:
            return {"status": "order_not_found"}

        pe_type, default_message = event_map[event_type]

        message = default_message
        event_data = {"stripe_event_id": event["id"]}

        if event_type == "payment_intent.payment_failed":
            last_error = data_object.get("last_payment_error", {})
            message = last_error.get("message", "Payment failed")
            event_data["error_code"] = last_error.get("code")
            event_data["decline_code"] = last_error.get("decline_code")
            event_data["error_type"] = last_error.get("type")

        payment_event = PaymentEvent(
            order_id=order.id,
            event_type=pe_type,
            message=message,
            event_data=event_data,
        )
        db.add(payment_event)
        db.commit()
    finally:
        db.close()

    return {"status": "processed"}
