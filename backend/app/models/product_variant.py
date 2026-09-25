import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Numeric, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class ProductVariant(Base):
    """A buyable variation of a product (e.g. 500 g / 1 kg, Red / Blue).

    Variants are OPTIONAL: a product with no variants is bought directly and
    keeps using its own price/stock. When a product has variants, the selected
    variant supplies price, MRP, stock and image, and one must be chosen.
    """
    __tablename__ = "product_variants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False, index=True)
    sku = Column(String(64), nullable=True)
    # {"Size": "500 g", "Colour": "Red"} — keys come from Product.variant_options
    option_values = Column(JSON, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    mrp = Column(Numeric(10, 2), nullable=True)
    stock = Column(Integer, default=0, nullable=False)
    image_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="variants")

    @property
    def label(self) -> str:
        """Human label like '500 g · Red' used in cart/order snapshots."""
        values = self.option_values or {}
        parts = [str(v) for v in values.values() if v]
        return " · ".join(parts) if parts else (self.sku or "")

    @property
    def discount_percent(self) -> int:
        try:
            if self.mrp and self.price and self.mrp > self.price:
                return int(round((self.mrp - self.price) / self.mrp * 100))
        except Exception:  # noqa: BLE001
            pass
        return 0
