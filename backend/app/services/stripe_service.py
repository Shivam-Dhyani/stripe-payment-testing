import stripe
from app.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_payment_intent(amount: int, currency: str = "usd", metadata: dict = None) -> dict:
    """
    Create a Stripe PaymentIntent.

    Args:
        amount: Amount in cents (e.g., 1000 for $10.00)
        currency: Currency code (default: "usd")
        metadata: Optional metadata dict to attach to the PaymentIntent

    Returns:
        Dictionary with payment intent details including client_secret
    """
    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            metadata=metadata or {},
            automatic_payment_methods={"enabled": True},
        )
        return {
            "id": intent.id,
            "client_secret": intent.client_secret,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": intent.status,
        }
    except stripe.error.StripeError as e:
        raise Exception(f"Stripe error: {str(e)}")
