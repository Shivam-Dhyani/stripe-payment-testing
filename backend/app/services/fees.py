from decimal import Decimal
from app.config import settings


def compute_delivery_fee(subtotal: Decimal) -> Decimal:
    """Delivery + small-cart handling fee for a given item subtotal.

    - Free delivery at/above FREE_DELIVERY_THRESHOLD.
    - A small-cart handling fee below SMALL_CART_THRESHOLD.
    """
    fee = Decimal("0")
    if subtotal < Decimal(str(settings.FREE_DELIVERY_THRESHOLD)):
        fee += Decimal(str(settings.DELIVERY_FEE))
    if subtotal < Decimal(str(settings.SMALL_CART_THRESHOLD)):
        fee += Decimal(str(settings.SMALL_CART_FEE))
    return fee
