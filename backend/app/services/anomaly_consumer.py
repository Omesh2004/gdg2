import asyncio
from datetime import datetime, timezone

from app.core.rbac import Role
from app.services.kafka_client import kafka_client
from app.services.websocket_manager import manager

async def process_anomaly_event(topic: str, message: dict):
    """
    Callback function to handle incoming raw anomalies from Kafka.
    """
    print(f"Consumed event from topic {topic}: {message}")
    
    # 1. Filter out low confidence noise
    if message.get("confidence", 0) < 0.8:
        print("Ignoring low confidence anomaly.")
        return
        
    # 2. Process High confidence
    print(f"High confidence anomaly detected: {message.get('anomaly_type')}")
    
    # 3. Escalate to critical alerts topic
    await kafka_client.produce_event("alerts.critical", message)

    # 4. Push real-time alert stream to connected operator dashboards
    await manager.broadcast_to_roles(
        {
            "event_type": "CRITICAL_ALERT",
            "details": message,
            "source": "anomaly_consumer",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        allowed_roles={Role.ADMIN, Role.SECURITY, Role.STAFF, Role.MAINTENANCE},
    )
    
    # Note: In a production setting, this logic could also call Neo4j here
    # to update Graph edge weights and push safe evcuation paths via WebSockets.

async def start_anomaly_consumer():
    """
    Starts the Kafka consumer looping in the background.
    """
    await kafka_client.start_consumer(["anomalies.raw"], process_anomaly_event)
