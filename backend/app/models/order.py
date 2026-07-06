import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Numeric, JSON, Text
from sqlalchemy.orm import relationship
from app.database import Base


VALID_PAYMENT_STATUSES = {"pending", "paid", "failed", "refunded", "partially_refunded"}


def recompute_payment_status(order) -> None:
    """Derive payment_status from how much of the order total has been refunded."""
    refunded = order.refunded_amount or Decimal("0")
    total = order.total or Decimal("0")
    if refunded <= 0:
        return
    order.payment_status = "refunded" if refunded >= total else "partially_refunded"


# Quick-commerce order lifecycle:
#   placed (paid) -> accepted -> picking -> packed -> out_for_delivery -> delivered
# with cancellation allowed until the order leaves the store.
VALID_ORDER_STATUSES = {
    "placed", "accepted", "picking", "packed", "out_for_delivery",
    "delivered", "cancelled", "refunded",
}

VALID_TRANSITIONS = {
    "placed": {"accepted", "cancelled"},
    "accepted": {"picking", "cancelled"},
    "picking": {"packed", "cancelled"},
    "packed": {"out_for_delivery", "cancelled"},
    "out_for_delivery": {"delivered"},
    "delivered": set(),
    "cancelled": set(),
    "refunded": set(),
}

# Orders can be cancelled while still inside the store (before dispatch).
CANCELLABLE_STATUSES = {"placed", "accepted", "picking", "packed"}

# A warehouse / delivery partner can only be (re)assigned while the order is
# still inside the store (before dispatch). Once it is out for delivery,
# delivered, cancelled or refunded, the assignment is locked.
ASSIGNABLE_STATUSES = {"placed", "accepted", "picking", "packed"}


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Short human-friendly order number (e.g. ZP-1042), assigned at creation.
    order_number = Column(Integer, nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    warehouse_id = Column(String(36), ForeignKey("warehouses.id"), nullable=True)
    delivery_partner_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    address_snapshot = Column(JSON, nullable=True)
    # Item subtotal + delivery/handling fee + tax = total.
    delivery_fee = Column(Numeric(10, 2), default=0, nullable=False)
    tax = Column(Numeric(10, 2), default=0, nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), default="placed", nullable=False)
    # Payment lifecycle, tracked independently of fulfillment status.
    payment_status = Column(String(20), default="pending", nullable=False)
    refunded_amount = Column(Numeric(10, 2), default=0, nullable=False)
    receipt_url = Column(String(500), nullable=True)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="orders", foreign_keys=[user_id])
    delivery_partner = relationship("User", back_populates="deliveries", foreign_keys=[delivery_partner_id])
    warehouse = relationship("Warehouse", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment_events = relationship("PaymentEvent", back_populates="order", cascade="all, delete-orphan", order_by="PaymentEvent.created_at")
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan", order_by="OrderStatusHistory.created_at")
    cancellation_requests = relationship("CancellationRequest", back_populates="order", cascade="all, delete-orphan")
    return_requests = relationship("ReturnRequest", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=True)
    product_name = Column(String(255), nullable=False)
    product_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
    return_items = relationship("ReturnRequestItem", back_populates="order_item")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False)
    from_status = Column(String(20), nullable=True)
    to_status = Column(String(20), nullable=False)
    changed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="status_history")
    user = relationship("User", foreign_keys=[changed_by])

    @property
    def changed_by_name(self):
        """Name of the person who made this transition (for timelines)."""
        if not self.user:
            return None
        name = f"{self.user.first_name or ''} {self.user.last_name or ''}".strip()
        return name or self.user.email

    @property
    def changed_by_role(self):
        """Role of the person who made this transition (admin/warehouse/rider)."""
        return self.user.role if self.user else None
