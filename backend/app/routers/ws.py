from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.config import settings
from app.database import SessionLocal
from app.models.user import User
from app.realtime import manager

router = APIRouter(tags=["Realtime"])


@router.websocket("/ws")
async def orders_ws(websocket: WebSocket):
    """Real-time channel. Authenticate with ?token=<JWT>. The client receives
    JSON events like {"type":"order_update","order_id":...,"status":...} and
    refetches the data it's allowed to see."""
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        await websocket.close(code=1008)
        return
    if not user_id:
        await websocket.close(code=1008)
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            await websocket.close(code=1008)
            return
        role = user.role
    finally:
        db.close()

    await manager.connect(websocket, user_id, role)
    try:
        while True:
            # We don't expect client messages; this keeps the socket open and
            # detects disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:  # noqa: BLE001
        manager.disconnect(websocket)
