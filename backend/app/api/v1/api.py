from fastapi import APIRouter
from app.api.v1.routers import anomalies, auth, positioning, routing, sms

api_router = APIRouter()

api_router.include_router(auth.router, tags=["Auth"])
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["Anomalies"])
api_router.include_router(positioning.router, prefix="/location", tags=["Positioning"])
api_router.include_router(routing.router, prefix="/routing", tags=["Routing"])
api_router.include_router(sms.router, prefix="/sms", tags=["SMS"])
