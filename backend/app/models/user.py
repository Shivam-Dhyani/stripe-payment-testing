import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    customer = "customer"
    delivery_partner = "delivery_partner"
    warehouse_operator = "warehouse_operator"


# Roles that represent internal staff (not customers).
STAFF_ROLES = {UserRole.admin, UserRole.delivery_partner, UserRole.warehouse_operator}


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    # Stored as plain text so new roles can be added without a DB enum migration.
    role = Column(String(20), default=UserRole.customer.value, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan")
    orders = relationship(
        "Order", back_populates="user", foreign_keys="Order.user_id", cascade="all, delete-orphan"
    )
    deliveries = relationship(
        "Order", back_populates="delivery_partner", foreign_keys="Order.delivery_partner_id"
    )
