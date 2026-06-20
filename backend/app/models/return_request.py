import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Numeric, Text
from sqlalchemy.orm import relationship
from app.database import Base


VALID_RETURN_STATUSES = {"requested", "approved", "rejected", "pickup_scheduled", "received", "refunded"}


class ReturnRequest(Base):
    __tablename__ = "return_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="requested", nullable=False)
    admin_notes = Column(Text, nullable=True)
    pickup_date = Column(DateTime, nullable=True)
    pickup_address = Column(Text, nullable=True)  # JSON string or plain text of address
    refund_amount = Column(Numeric(10, 2), nullable=True)
    resolved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="return_requests")
    user = relationship("User", foreign_keys=[user_id])
    resolver = relationship("User", foreign_keys=[resolved_by])
    items = relationship("ReturnRequestItem", back_populates="return_request", cascade="all, delete-orphan")


class ReturnRequestItem(Base):
    __tablename__ = "return_request_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    return_request_id = Column(String(36), ForeignKey("return_requests.id"), nullable=False)
    order_item_id = Column(String(36), ForeignKey("order_items.id"), nullable=False)
    quantity = Column(Integer, nullable=False)

    return_request = relationship("ReturnRequest", back_populates="items")
    order_item = relationship("OrderItem")
