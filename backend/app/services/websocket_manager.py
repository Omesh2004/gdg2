from dataclasses import dataclass

from fastapi import WebSocket

from app.core.rbac import Role


@dataclass
class ConnectionContext:
    websocket: WebSocket
    role: Role
    user_id: str

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[ConnectionContext] = []

    async def connect(self, websocket: WebSocket, role: Role, user_id: str):
        await websocket.accept()
        self.active_connections.append(ConnectionContext(websocket=websocket, role=role, user_id=user_id))

    def disconnect(self, websocket: WebSocket):
        self.active_connections = [conn for conn in self.active_connections if conn.websocket is not websocket]

    async def broadcast(self, message: dict):
        await self.broadcast_to_roles(message=message, allowed_roles=set(Role))

    async def broadcast_to_roles(self, message: dict, allowed_roles: set[Role]):
        stale_connections: list[WebSocket] = []
        for connection in self.active_connections:
            if connection.role not in allowed_roles:
                continue

            try:
                await connection.websocket.send_json(message)
            except Exception:
                stale_connections.append(connection.websocket)

        for websocket in stale_connections:
            self.disconnect(websocket)

manager = ConnectionManager()
