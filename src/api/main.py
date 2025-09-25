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
        # Generate mock telemetry data
        telemetry = {
            "type": "telemetry",
            "timestamp": datetime.now().isoformat(),
            "metrics": {
                "current_rps": 5000,
                "target_rps": 5000,
                "delivered_percent": 100.0,
                "active_sockets": 100,
                "p50_latency": 45,
                "p95_latency": 120,
                "p99_latency": 250,
                "success_rate": 99.5,
                "error_rate": 0.5,
                "timeout_rate": 0.1,
            },
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
