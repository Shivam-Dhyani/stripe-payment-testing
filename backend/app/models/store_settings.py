from datetime import datetime
from sqlalchemy import Column, String, Numeric, DateTime
from app.database import Base


class StoreSettings(Base):
    """Singleton store configuration editable by admins (fees, thresholds, tax)."""
    __tablename__ = "store_settings"

    id = Column(String(36), primary_key=True, default="default")
    delivery_fee = Column(Numeric(10, 2), default=25, nullable=False)
    free_delivery_threshold = Column(Numeric(10, 2), default=199, nullable=False)
    small_cart_fee = Column(Numeric(10, 2), default=15, nullable=False)
    small_cart_threshold = Column(Numeric(10, 2), default=99, nullable=False)
    tax_percent = Column(Numeric(5, 2), default=5, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
