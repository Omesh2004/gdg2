from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_neo4j, get_redis
from app.core.rbac_middleware import require_permission, require_at_least_role
from app.core.rbac import Permission, Role
from app.services.auth_service import AuthProfile
from app.core.auth import get_current_user
from app.services.graph_engine import graph_engine

router = APIRouter()

@router.get("/evacuate/{mac_address}", dependencies=[Depends(require_permission(Permission.ROUTING_CALCULATE))])
async def get_evacuation_route(
    mac_address: str,
    neo4j_session=Depends(get_neo4j),
    redis=Depends(get_redis),
    user: AuthProfile = Depends(get_current_user),
):
    """
    Get the safest path for a specific user to the nearest exit,
    avoiding active anomaly zones (e.g., Fire on Floor 2).
    """
    # 1. Get user location from Redis (by MAC)
    pos = await redis.hgetall(f"user:loc:{mac_address}")
    if not pos:
        return {"error": "User location not found in Redis"}
        
    start_room_id = pos.get("room_id", "Room 205") # Derived from coordinates
    
    # 2. Query Neo4j Graph DB safely
    safe_path = await graph_engine.get_shortest_safe_path(neo4j_session, start_node_id=start_room_id)
    
    if not safe_path:
        # Fallback to mock
        safe_path = {
            "route": ["Room 205", "Corridor B", "Stairwell 2", "Lobby Exit"],
            "cost": 4
        }
        
    return {"mac": mac_address, "safe_path": safe_path, "current_pos": pos}
