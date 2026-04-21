from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.core.dependencies import get_redis
from app.core.rbac_middleware import require_permission, require_at_least_role
from app.core.rbac import Permission, Role
from app.services.auth_service import AuthProfile
from app.core.auth import get_current_user

router = APIRouter()

class LocationUpdate(BaseModel):
    device_mac: str
    floor: int
    x: float = Field(..., ge=-180, le=180, description="X coordinate")
    y: float = Field(..., ge=-90, le=90, description="Y coordinate")

@router.post("/update", dependencies=[Depends(require_permission(Permission.LOCATION_UPDATE_SELF))])
async def update_location(
    loc: LocationUpdate,
    redis=Depends(get_redis),
    user: AuthProfile = Depends(get_current_user),
):
    """
    Update user location (WiFi/BLE gateway data).
    
    Requires: LOCATION_UPDATE_SELF permission
    Allowed Roles: All authenticated users
    """
    # Use Redis hashes for tracking fast-moving data
    key = f"user:loc:{loc.device_mac}"
    await redis.hset(key, mapping={
        "floor": loc.floor,
        "x": str(loc.x),
        "y": str(loc.y),
        "user_id": user.id,
        "updated_by": user.id,
    })
    await redis.expire(key, 3600)  # Expire location data after 1 hour
    
    return {"status": "Location updated", "device_mac": loc.device_mac}

@router.get("/heatmap", dependencies=[Depends(require_permission(Permission.LOCATION_VIEW_ALL))])
async def get_location_heatmap(
    redis=Depends(get_redis),
    user: AuthProfile = Depends(get_current_user),
):
    """
    Get building occupancy heatmap (aggregated location data).
    
    Requires: LOCATION_VIEW_ALL permission
    Allowed Roles: Admin, Security only
    """
    # Get all location keys
    keys = await redis.keys("user:loc:*")
    locations = []
    
    for key in keys:
        data = await redis.hgetall(key)
        if data:
            locations.append(data)
    
    return {"locations": locations, "total_occupancy": len(locations)}
