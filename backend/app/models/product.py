import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Numeric, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sub_category_id = Column(String(36), ForeignKey("subcategories.id"), nullable=False)
    brand_id = Column(String(36), ForeignKey("brands.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    # Pack size shown on the card, e.g. "500 g", "1 L", "6 pcs", "200 g pack".
    unit = Column(String(50), nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    # Compare-at / list price. When higher than `price`, the storefront shows a
    # strikethrough MRP and a "% off" badge.
    mrp = Column(Numeric(10, 2), nullable=True)
    stock = Column(Integer, default=0, nullable=False)
    # Primary image (cards, cart, search). `images` holds extra gallery shots.
    image_url = Column(Text, nullable=True)
    images = Column(JSON, nullable=True)
    # List of {"label": str, "value": str} rows rendered as a spec table.
    specifications = Column(JSON, nullable=True)
    # Ordered option names for variants, e.g. ["Size"] or ["Colour", "Size"].
    variant_options = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_returnable = Column(Boolean, default=False, nullable=False)
    return_window_days = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    subcategory = relationship("SubCategory", back_populates="products")
    brand = relationship("Brand", back_populates="products")
    variants = relationship(
        "ProductVariant", back_populates="product",
        cascade="all, delete-orphan", order_by="ProductVariant.sort_order",
    )
    cart_items = relationship("CartItem", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")

    @property
    def has_variants(self) -> bool:
        return any(v.is_active for v in (self.variants or []))

    @property
    def gallery(self) -> list:
        """Primary image first, then any extra gallery images (deduped)."""
        out = []
        for url in [self.image_url, *(self.images or [])]:
            if url and url not in out:
                out.append(url)
        return out

    @property
    def discount_percent(self) -> int:
        """Whole-number discount off MRP, or 0 when there's no saving."""
        try:
            if self.mrp and self.price and self.mrp > self.price:
                return int(round((self.mrp - self.price) / self.mrp * 100))
        except Exception:  # noqa: BLE001
            pass
        return 0
