from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.push_subscription import PushSubscription
from app.services.push_service import push_enabled
from app.config import settings

router = APIRouter(prefix="/push", tags=["Push"], redirect_slashes=False)


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: PushKeys


class PushUnsubscribe(BaseModel):
    endpoint: str


@router.get("/vapid-public-key")
def vapid_public_key():
    """Public key the browser needs to subscribe. `enabled` is false when push
    isn't configured on the server, so the client can hide the UI."""
    return {"enabled": push_enabled(), "public_key": settings.VAPID_PUBLIC_KEY or None}


@router.post("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
def subscribe(
    data: PushSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save (or refresh) this device's push subscription for the current user."""
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == data.endpoint).first()
    if existing:
        existing.user_id = current_user.id
        existing.p256dh = data.keys.p256dh
        existing.auth = data.keys.auth
    else:
        db.add(PushSubscription(
            user_id=current_user.id,
            endpoint=data.endpoint,
            p256dh=data.keys.p256dh,
            auth=data.keys.auth,
        ))
    db.commit()


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe(
    data: PushUnsubscribe,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove this device's subscription."""
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == data.endpoint,
        PushSubscription.user_id == current_user.id,
    ).delete()
    db.commit()
