import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    variant_id = Column(String(36), ForeignKey("product_variants.id"), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")
    variant = relationship("ProductVariant")

    # Effective line values — the variant wins when one is selected, so the
    # client never has to decide between product and variant pricing.
    @property
    def unit_price(self):
        if self.variant:
            return self.variant.price
        return self.product.price if self.product else 0

    @property
    def available_stock(self) -> int:
        if self.variant:
            return self.variant.stock
        return self.product.stock if self.product else 0

    @property
    def variant_label(self):
        return self.variant.label if self.variant else None

    @property
    def image_url(self):
        if self.variant and self.variant.image_url:
            return self.variant.image_url
        return self.product.image_url if self.product else None
