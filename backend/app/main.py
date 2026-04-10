from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.dependencies import db_client
from app.services.kafka_client import kafka_client
from app.services.anomaly_consumer import start_anomaly_consumer
from app.api.v1.api import api_router
from app.api.v1.routers.websockets import router as ws_router

# Lifespan context to handle startup/shutdown of connections (e.g. Kafka/Redis)
@asynccontextmanager
async def lifespan(app: FastAPI):
    consumer_task = None
    if settings.ENABLE_INFRA_ON_STARTUP:
        print("Starting up Connections (Kafka, Redis, MongoDB, Neo4j)...")
        try:
            await db_client.connect_to_databases()
        except Exception as exc:
            print(f"[startup-warning] Failed to connect to databases: {exc}")

        try:
            await kafka_client.start_producer()
            # Start consumer tasks in the background
            consumer_task = asyncio.create_task(start_anomaly_consumer())
        except Exception as exc:
            print(f"[startup-warning] Failed to start Kafka producer: {exc}")
    else:
        print("Skipping infra startup. Set ENABLE_INFRA_ON_STARTUP=true to enable it.")
    
    yield
    
    if settings.ENABLE_INFRA_ON_STARTUP:
        print("Shutting down Connections...")
        if consumer_task:
            consumer_task.cancel()
        try:
            await kafka_client.stop_producer()
        except Exception:
            pass
        try:
            await db_client.close_database_connections()
        except Exception:
            pass

app = FastAPI(
    title="Smart Building Safety Platform",
    description="Real-time event processing for CCTV anomalies and indoor tracking",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_router, prefix="/ws")
