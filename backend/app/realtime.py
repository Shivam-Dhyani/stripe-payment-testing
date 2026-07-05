"""Real-time order events over WebSockets.

A single-process, in-memory connection manager. Request handlers (sync) call
`manager.publish(...)`, which schedules the async send on the server event loop.
Recipients are targeted by user id and/or role so a client only hears about
events relevant to it.

Note: for a multi-instance deployment this would need a shared broker (e.g.
Redis pub/sub); it's in-memory here, which is fine for a single web service.
"""
import asyncio
import logging
from typing import Optional, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        # websocket -> (user_id, role)
        self._active: dict[WebSocket, tuple[str, str]] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    async def connect(self, ws: WebSocket, user_id: str, role: str) -> None:
        await ws.accept()
        self._active[ws] = (user_id, role)
        self._loop = asyncio.get_running_loop()

    def disconnect(self, ws: WebSocket) -> None:
        self._active.pop(ws, None)

    def publish(self, payload: dict, user_ids: Optional[Set[str]] = None,
                roles: Optional[Set[str]] = None) -> None:
        """Send `payload` to every connection matching a user id or role.
        Safe to call from sync request handlers."""
        if not self._loop or not self._active:
            return
        user_ids = user_ids or set()
        roles = roles or set()
        for ws, (uid, role) in list(self._active.items()):
            if uid in user_ids or role in roles:
                try:
                    asyncio.run_coroutine_threadsafe(ws.send_json(payload), self._loop)
                except Exception as e:  # noqa: BLE001
                    logger.debug("ws send failed: %s", e)


manager = ConnectionManager()


def notify_order_change(order, event: str = "order_update") -> None:
    """Notify the order's customer, its assigned rider, and all admins +
    warehouse operators that an order changed."""
    user_ids: Set[str] = {order.user_id}
    if getattr(order, "delivery_partner_id", None):
        user_ids.add(order.delivery_partner_id)
    manager.publish(
        {"type": event, "order_id": order.id, "status": order.status},
        user_ids=user_ids,
        roles={"admin", "warehouse_operator"},
    )


def notify_return_change(req) -> None:
    """Notify everyone involved in a return (customer, pickup rider, admins,
    warehouse operators) that it changed."""
    user_ids: Set[str] = set()
    try:
        if getattr(req, "order", None):
            user_ids.add(req.order.user_id)
    except Exception:  # noqa: BLE001
        pass
    if getattr(req, "delivery_partner_id", None):
        user_ids.add(req.delivery_partner_id)
    manager.publish(
        {"type": "order_update", "return_id": req.id, "status": req.status},
        user_ids=user_ids,
        roles={"admin", "warehouse_operator"},
    )
