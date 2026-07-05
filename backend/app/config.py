from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://ecommerce:ecommerce123@localhost/ecommerce_db"
    SECRET_KEY: str = "f3a7c9b2e1d4056789abcdef0123456789abcdef0123456789abcdef01234567"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    STRIPE_SECRET_KEY: str = "sk_test_placeholder"
    STRIPE_WEBHOOK_SECRET: str = "whsec_placeholder"
    STRIPE_PUBLISHABLE_KEY: str = "pk_test_placeholder"
    # Payment currency (INR for the Indian quick-commerce catalog). Set to
    # "usd" in .env if your Stripe test account can't charge INR.
    STRIPE_CURRENCY: str = "inr"

    # Delivery / handling fees (quick-commerce). Free delivery above the
    # threshold; a small-cart handling fee below the small-cart threshold.
    DELIVERY_FEE: float = 25.0
    FREE_DELIVERY_THRESHOLD: float = 199.0
    SMALL_CART_FEE: float = 15.0
    SMALL_CART_THRESHOLD: float = 99.0

    # Web Push (VAPID). Generate a keypair locally and set these in .env:
    #   pip install pywebpush && vapid --gen   (or: npx web-push generate-vapid-keys)
    # Leave blank to disable push notifications — the app no-ops gracefully.
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_SUBJECT: str = "mailto:admin@zippy.app"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
