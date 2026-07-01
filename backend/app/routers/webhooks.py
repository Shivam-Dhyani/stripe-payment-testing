from decimal import Decimal
from fastapi import APIRouter, Request, HTTPException
from app.database import SessionLocal
from app.models.order import Order, recompute_payment_status
from app.models.payment_event import PaymentEvent, PaymentEventType
from app.models.webhook_event import WebhookEvent
from app.config import settings
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/webhooks", tags=["Webhooks"], redirect_slashes=False)

# When no real webhook secret is configured (local dev), skip signature checks.
_WEBHOOK_SECRET_CONFIGURED = bool(
    settings.STRIPE_WEBHOOK_SECRET and settings.STRIPE_WEBHOOK_SECRET != "whsec_placeholder"
)


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events for payment lifecycle tracking (idempotently)."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if _WEBHOOK_SECRET_CONFIGURED:
        if not sig_header:
            raise HTTPException(status_code=400, detail="Missing stripe-signature header")
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # Dev fallback: parse without verifying the signature.
        import json
        try:
            event = json.loads(payload)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")

    event_id = event.get("id")
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
        # Idempotency: skip events we've already processed.
        if event_id and db.query(WebhookEvent).filter(WebhookEvent.id == event_id).first():
            return {"status": "duplicate"}

        order = db.query(Order).filter(
            Order.stripe_payment_intent_id == payment_intent_id
        ).first()

        if not order:
            # Still record the event id so Stripe stops retrying it.
            if event_id:
                db.add(WebhookEvent(id=event_id, event_type=event_type))
                db.commit()
            return {"status": "order_not_found"}

        pe_type, default_message = event_map[event_type]
        message = default_message
        event_data = {"stripe_event_id": event_id}

        if event_type == "payment_intent.succeeded":
            order.payment_status = "paid"
            charges = (data_object.get("charges") or {}).get("data") or []
            if charges and charges[0].get("receipt_url"):
                order.receipt_url = charges[0]["receipt_url"]

        elif event_type == "payment_intent.payment_failed":
            order.payment_status = "failed"
            last_error = data_object.get("last_payment_error") or {}
            message = last_error.get("message", "Payment failed")
            event_data["error_code"] = last_error.get("code")
            event_data["decline_code"] = last_error.get("decline_code")
            event_data["error_type"] = last_error.get("type")

        elif event_type == "charge.refunded":
            # amount_refunded is the authoritative cumulative total (in cents).
            amount_refunded = data_object.get("amount_refunded")
            if amount_refunded is not None:
                order.refunded_amount = Decimal(amount_refunded) / Decimal(100)
            recompute_payment_status(order)
            event_data["amount_refunded"] = float(order.refunded_amount or 0)

        db.add(PaymentEvent(
            order_id=order.id,
            event_type=pe_type,
            message=message,
            event_data=event_data,
        ))

        if event_id:
            db.add(WebhookEvent(id=event_id, event_type=event_type))

        db.commit()
    finally:
        db.close()

    return {"status": "processed"}
