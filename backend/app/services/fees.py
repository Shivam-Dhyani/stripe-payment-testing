from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from app.config import settings as app_settings
from app.models.store_settings import StoreSettings


def get_settings(db: Session) -> StoreSettings:
    """Return the singleton store settings, creating it (from config defaults)
    on first use."""
    row = db.query(StoreSettings).filter(StoreSettings.id == "default").first()
    if not row:
        row = StoreSettings(
            id="default",
            delivery_fee=Decimal(str(app_settings.DELIVERY_FEE)),
            free_delivery_threshold=Decimal(str(app_settings.FREE_DELIVERY_THRESHOLD)),
            small_cart_fee=Decimal(str(app_settings.SMALL_CART_FEE)),
            small_cart_threshold=Decimal(str(app_settings.SMALL_CART_THRESHOLD)),
            tax_percent=Decimal("5"),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def compute_delivery_fee(subtotal: Decimal, s: StoreSettings) -> Decimal:
    """Delivery + small-cart handling fee from the store settings."""
    fee = Decimal("0")
    if subtotal < s.free_delivery_threshold:
        fee += s.delivery_fee
    if subtotal < s.small_cart_threshold:
        fee += s.small_cart_fee
    return fee


def compute_tax(subtotal: Decimal, s: StoreSettings) -> Decimal:
    """Tax on the item subtotal, rounded to 2 decimals."""
    tax = (subtotal * s.tax_percent / Decimal("100"))
    return tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
