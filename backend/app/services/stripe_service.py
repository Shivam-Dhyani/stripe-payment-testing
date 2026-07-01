import stripe
from app.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_payment_intent(amount: int, currency: str = "usd", metadata: dict = None,
                          idempotency_key: str = None) -> dict:
    """
    Create a Stripe PaymentIntent.

    Args:
        amount: Amount in cents (e.g., 1000 for $10.00)
        currency: Currency code (default: "usd")
        metadata: Optional metadata dict to attach to the PaymentIntent
        idempotency_key: Optional key so retries don't create duplicate intents

    Returns:
        Dictionary with payment intent details including client_secret
    """
    try:
        kwargs = {}
        if idempotency_key:
            kwargs["idempotency_key"] = idempotency_key
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            metadata=metadata or {},
            automatic_payment_methods={"enabled": True},
            **kwargs,
        )
        return {
            "id": intent.id,
            "client_secret": intent.client_secret,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": intent.status,
        }
    except stripe.StripeError as e:
        raise Exception(f"Stripe error: {str(e)}")


def create_refund(payment_intent_id: str, amount_cents: int = None, idempotency_key: str = None) -> dict:
    """
    Refund a PaymentIntent (full or partial), idempotently.

    Args:
        payment_intent_id: The PaymentIntent to refund
        amount_cents: Amount to refund in cents; None refunds the full amount
        idempotency_key: Key so the same logical refund isn't issued twice

    Returns:
        Dict with refund id, amount (cents), and status.
    """
    params = {"payment_intent": payment_intent_id}
    if amount_cents is not None:
        params["amount"] = amount_cents
    kwargs = {}
    if idempotency_key:
        kwargs["idempotency_key"] = idempotency_key
    refund = stripe.Refund.create(**params, **kwargs)
    return {"id": refund.id, "amount": refund.amount, "status": refund.status}
