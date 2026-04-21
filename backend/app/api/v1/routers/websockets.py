import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from app.core.config import settings
from app.core.rbac import Permission, Role, has_permission
from app.services.auth_service import decode_signed_token, resolve_user_role_by_email
from app.services.websocket_manager import manager

router = APIRouter()


async def _resolve_ws_identity(websocket: WebSocket) -> tuple[Role, str]:
    token = websocket.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        raise ValueError("Missing session cookie")

    payload = decode_signed_token(token)
    email = str(payload.get("email", "")).strip().lower()
    fallback_role = str(payload.get("role", Role.GUEST.value))
    try:
        resolved_role = await asyncio.to_thread(resolve_user_role_by_email, email, fallback_role)
    except Exception:
        resolved_role = fallback_role

    try:
        role = Role(resolved_role)
    except ValueError as exc:
        raise ValueError("Invalid role") from exc

    user_id = str(payload.get("sub") or email or "anonymous")
    return role, user_id

@router.websocket("/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for the Admin God-View Dashboard.
    Pushes real-time anomalies and crowd density updates.
    """
    try:
        role, user_id = await _resolve_ws_identity(websocket)
    except Exception:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    if not has_permission(role, Permission.WEBSOCKET_CONNECT):
        await websocket.close(code=1008, reason="Insufficient permissions")
        return

    await manager.connect(websocket, role=role, user_id=user_id)

    await websocket.send_json(
        {
            "event_type": "WS_READY",
            "details": {"role": role.value, "user_id": user_id},
        }
    )

    try:
        while True:
            data = await websocket.receive_text()
            print(f"Received from Dashboard: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close(code=1011)
