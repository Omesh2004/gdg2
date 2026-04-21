from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.core.dependencies import get_mongo_db
from app.core.rbac_middleware import (
    require_permission,
    require_roles,
    require_at_least_role,
    get_user_role,
)
from app.core.rbac import Permission, Role
from app.services.auth_service import AuthProfile
from app.core.auth import get_current_user
from app.services.kafka_client import kafka_client
from app.services.websocket_manager import manager
from typing import List

router = APIRouter()

class MLInferenceEvent(BaseModel):
    camera_id: str
    anomaly_type: str = Field(..., description="Fire, Smoke, Intrusion, etc.")
    confidence: float
    timestamp: str

@router.post("/", dependencies=[Depends(require_permission(Permission.ANOMALY_REPORT))])
async def receive_anomaly(
    event: MLInferenceEvent,
    db=Depends(get_mongo_db),
    user: AuthProfile = Depends(get_current_user),
):
    """
    Endpoint for Edge AI to post detected anomalies (Fire, Smoke, Intrusion).
    
    Requires: ANOMALY_REPORT permission
    Allowed Roles: Admin, Security
    """
    event_dict = event.dict()
    event_dict["reported_by"] = user.id  # Track who reported
    event_dict["reported_at"] = None  # Will be set by MongoDB
    
    # 1. Log to Database (MongoDB)
    result = await db["anomaly_events"].insert_one(event_dict.copy())
    
    # 2. Add to Streaming Queue (Kafka)
    await kafka_client.produce_event("anomalies.raw", event_dict)
    
    # 3. Broadcast to dashboard
    alert_payload = {
        "event_type": "CRITICAL_ALERT",
        "details": event_dict,
        "anomaly_id": str(result.inserted_id),
    }
    await manager.broadcast_to_roles(
        alert_payload,
        allowed_roles={Role.ADMIN, Role.SECURITY, Role.STAFF, Role.MAINTENANCE},
    )
    
    return {"status": "Event received and queued", "anomaly_id": str(result.inserted_id)}

@router.get("/active", dependencies=[Depends(require_permission(Permission.ANOMALY_VIEW))])
async def get_active_anomalies(
    db=Depends(get_mongo_db),
    user: AuthProfile = Depends(get_current_user),
):
    """
    Fetch all active (unresolved) emergencies.
    
    Requires: ANOMALY_VIEW permission
    Allowed Roles: Admin, Security, Staff, Maintenance
    """
    cursor = db["anomaly_events"].find({"resolved": {"$ne": True}})
    anomalies = await cursor.to_list(length=100)
    
    # Convert ObjectId to string for JSON serialization
    for anomaly in anomalies:
        anomaly["_id"] = str(anomaly["_id"])
        
    return {"active_anomalies": anomalies, "count": len(anomalies)}

@router.patch("/{anomaly_id}/resolve", dependencies=[Depends(require_permission(Permission.ANOMALY_RESOLVE))])
async def resolve_anomaly(
    anomaly_id: str,
    db=Depends(get_mongo_db),
    user: AuthProfile = Depends(get_current_user),
):
    """
    Mark an anomaly as resolved.
    
    Requires: ANOMALY_RESOLVE permission
    Allowed Roles: Admin, Security
    """
    from bson.objectid import ObjectId
    
    result = await db["anomaly_events"].update_one(
        {"_id": ObjectId(anomaly_id)},
        {"$set": {"resolved": True, "resolved_by": user.id, "resolved_at": None}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anomaly not found")

    await manager.broadcast_to_roles(
        {
            "event_type": "ALERT_RESOLVED",
            "anomaly_id": anomaly_id,
            "details": {"resolved_by": user.id},
        },
        allowed_roles={Role.ADMIN, Role.SECURITY, Role.STAFF, Role.MAINTENANCE},
    )
    
    return {"status": "Anomaly resolved", "anomaly_id": anomaly_id}

@router.delete("/{anomaly_id}", dependencies=[Depends(require_permission(Permission.ANOMALY_DELETE))])
async def delete_anomaly(
    anomaly_id: str,
    db=Depends(get_mongo_db),
    user: AuthProfile = Depends(get_current_user),
):
    """
    Delete an anomaly (admin only).
    
    Requires: ANOMALY_DELETE permission
    Allowed Roles: Admin only
    """
    from bson.objectid import ObjectId
    
    result = await db["anomaly_events"].delete_one({"_id": ObjectId(anomaly_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anomaly not found")
    
    return {"status": "Anomaly deleted", "anomaly_id": anomaly_id}
