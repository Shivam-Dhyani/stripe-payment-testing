"""Web Push (VAPID) delivery.

Best-effort and completely optional: if VAPID keys aren't configured or the
`pywebpush` package isn't installed, every function no-ops so the rest of the
app keeps working. Expired/invalid subscriptions are pruned automatically.
"""
import json
import logging

from sqlalchemy.orm import Session

from app.config import settings
from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)

try:
    from pywebpush import webpush, WebPushException
    _HAS_PYWEBPUSH = True
except Exception:  # noqa: BLE001 - library optional
    _HAS_PYWEBPUSH = False


def push_enabled() -> bool:
    return bool(_HAS_PYWEBPUSH and settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def _send_one(sub: PushSubscription, payload: dict) -> bool:
    """Send to a single subscription. Returns False if the subscription is dead."""
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
            timeout=10,
        )
        return True
    except WebPushException as e:  # type: ignore[misc]
        status_code = getattr(getattr(e, "response", None), "status_code", None)
        if status_code in (404, 410):
            return False  # subscription gone — caller should delete it
        logger.warning("Web push failed (%s): %s", status_code, e)
        return True  # transient; keep the subscription
    except Exception as e:  # noqa: BLE001
        logger.warning("Web push error: %s", e)
        return True


def send_to_user(db: Session, user_id: str, title: str, body: str, url: str = "/") -> None:
    """Push a notification to every device a user has subscribed. Best-effort."""
    if not push_enabled():
        return
    subs = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
    if not subs:
        return
    payload = {"title": title, "body": body, "url": url}
    dead = []
    for sub in subs:
        if not _send_one(sub, payload):
            dead.append(sub)
    if dead:
        for sub in dead:
            db.delete(sub)
        db.commit()


def notify_user_safe(db: Session, user_id: str, title: str, body: str, url: str = "/") -> None:
    """Wrapper that never raises — safe to call inline in request handlers."""
    try:
        send_to_user(db, user_id, title, body, url)
    except Exception as e:  # noqa: BLE001
        logger.warning("notify_user_safe swallowed error: %s", e)
