from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.database import Base


class WebhookEvent(Base):
    """Records processed Stripe webhook event IDs so events are handled once."""

    __tablename__ = "webhook_events"

    id = Column(String(255), primary_key=True)  # Stripe event id (evt_...)
    event_type = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
