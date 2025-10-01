#!/usr/bin/env python3
"""
RadiusForge FastAPI Backend
Main API server with REST endpoints and WebSocket support
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from contextlib import asynccontextmanager
from typing import List, Dict, Optional, Any
import asyncio
import json
import os
from datetime import datetime
from pathlib import Path

# Import routers
from .routers import runs, topology

# Import WebSocket manager
from .websocket_manager import ConnectionManager

# Import database
from .database import init_db, get_db

# Import settings
from .config import settings


# WebSocket manager instance
ws_manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    print("🚀 Starting RadiusForge API Server...")
    await init_db()

    # Start background tasks
    asyncio.create_task(telemetry_broadcaster())

    yield

    # Shutdown
    print("🛑 Shutting down RadiusForge API Server...")
    await ws_manager.disconnect_all()


# Create FastAPI app
app = FastAPI(
    title="RadiusForge API", description="AAA Traffic Load Testing Platform", version="1.0.0", lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(runs.router, prefix="/api/runs", tags=["Test Runs"])
app.include_router(topology.router, prefix="/api/topology", tags=["Topology"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {"name": "RadiusForge API", "version": "1.0.0", "status": "online", "timestamp": datetime.now().isoformat()}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {"api": "online", "database": "connected", "websocket": "active", "generators": "ready"},
    }


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """WebSocket endpoint for real-time telemetry"""
    await ws_manager.connect(websocket)

    try:
        # Send initial connection message
        await websocket.send_json(
            {"type": "connection", "status": "connected", "timestamp": datetime.now().isoformat()}
        )

        # Keep connection alive and handle messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Handle different message types
            if message.get("type") == "subscribe":
                # Subscribe to specific metrics
                await ws_manager.subscribe(websocket, message.get("metrics", []))
            elif message.get("type") == "ping":
                # Respond to ping
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)


async def telemetry_broadcaster():
    """Background task to broadcast telemetry to connected clients"""
    while True:
        # Generate real telemetry data from database
        from .database import get_db
        from .models import TestMetric
        from sqlalchemy import select
        
        try:
            async with get_db() as db:
                recent_metrics = await db.execute(
                    select(TestMetric).order_by(TestMetric.timestamp.desc()).limit(1)
                )
                latest_metric = recent_metrics.scalar_one_or_none()
                
                if latest_metric:
                    telemetry = {
                        "type": "telemetry",
                        "timestamp": latest_metric.timestamp.isoformat(),
                        "rps": latest_metric.requests_per_second,
                        "latency_p50": latest_metric.latency_p50,
                        "latency_p95": latest_metric.latency_p95,
                        "latency_p99": latest_metric.latency_p99,
                        "error_rate": latest_metric.error_rate,
                        "active_connections": latest_metric.active_connections,
                        "cpu_usage": latest_metric.cpu_usage,
                        "memory_usage": latest_metric.memory_usage
                    }
                else:
                    telemetry = {
                        "type": "telemetry",
                        "timestamp": datetime.now().isoformat(),
                        "rps": 0,
                        "latency_p50": 0,
                        "latency_p95": 0,
                        "latency_p99": 0,
                        "error_rate": 0,
                        "active_connections": 0,
                        "cpu_usage": 0,
                        "memory_usage": 0
                    }
        except Exception as e:
            import logging
            logging.error(f"Error fetching telemetry data: {e}")
            telemetry = {
                "type": "telemetry",
                "timestamp": datetime.now().isoformat(),
                "rps": 0,
                "latency_p50": 0,
                "latency_p95": 0,
                "latency_p99": 0,
                "error_rate": 0,
                "active_connections": 0,
                "cpu_usage": 0,
                "memory_usage": 0
            }

        # Broadcast to all connected clients
        await ws_manager.broadcast(telemetry)

        # Wait before next broadcast
        await asyncio.sleep(1)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code, content={"error": exc.detail, "timestamp": datetime.now().isoformat()}
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.API_HOST, port=settings.API_PORT, reload=settings.DEBUG, log_level="info")
