#!/usr/bin/env python3
"""
RadiusForge Telemetry Server
Dedicated service for collecting and broadcasting real-time metrics
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .database import get_db
from .models import TestMetric, TestRun
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RadiusForge Telemetry Service", version="1.4.5")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TelemetryManager:
    """Manages real-time telemetry data collection and broadcasting"""
    
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.telemetry_data: Dict[str, Any] = {}
        self.running = False
    
    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New telemetry connection. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"Telemetry connection closed. Total: {len(self.active_connections)}")
    
    async def broadcast(self, data: Dict[str, Any]):
        """Broadcast data to all connected clients"""
        if not self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.append(connection)
        
        for connection in disconnected:
            self.disconnect(connection)
    
    async def collect_real_telemetry(self):
        """Collect real telemetry data from database"""
        try:
            async with get_db() as db:
                recent_metrics = await db.execute(
                    select(TestMetric).order_by(TestMetric.timestamp.desc()).limit(10)
                )
                metrics = recent_metrics.scalars().all()
                
                active_runs = await db.execute(
                    select(TestRun).where(TestRun.status == 'running')
                )
                runs = active_runs.scalars().all()
                
                if metrics:
                    latest = metrics[0]
                    self.telemetry_data = {
                        "type": "telemetry",
                        "timestamp": datetime.now().isoformat(),
                        "rps": latest.requests_per_second,
                        "latency_p50": latest.latency_p50,
                        "latency_p95": latest.latency_p95,
                        "latency_p99": latest.latency_p99,
                        "error_rate": latest.error_rate,
                        "active_connections": latest.active_connections,
                        "cpu_usage": latest.cpu_usage,
                        "memory_usage": latest.memory_usage,
                        "active_tests": len(runs),
                        "test_results": {
                            "total_tests": len(runs),
                            "running": len([r for r in runs if r.status == 'running']),
                            "completed": len([r for r in runs if r.status == 'completed']),
                            "failed": len([r for r in runs if r.status == 'failed'])
                        }
                    }
                else:
                    self.telemetry_data = {
                        "type": "telemetry",
                        "timestamp": datetime.now().isoformat(),
                        "rps": 0,
                        "latency_p50": 0,
                        "latency_p95": 0,
                        "latency_p99": 0,
                        "error_rate": 0,
                        "active_connections": 0,
                        "cpu_usage": 0,
                        "memory_usage": 0,
                        "active_tests": len(runs),
                        "test_results": {
                            "total_tests": len(runs),
                            "running": len([r for r in runs if r.status == 'running']),
                            "completed": len([r for r in runs if r.status == 'completed']),
                            "failed": len([r for r in runs if r.status == 'failed'])
                        }
                    }
                
        except Exception as e:
            logger.error(f"Error collecting telemetry: {e}")
            self.telemetry_data = {
                "type": "telemetry",
                "timestamp": datetime.now().isoformat(),
                "rps": 0,
                "latency_p50": 0,
                "latency_p95": 0,
                "latency_p99": 0,
                "error_rate": 0,
                "active_connections": 0,
                "cpu_usage": 0,
                "memory_usage": 0,
                "active_tests": 0,
                "test_results": {"total_tests": 0, "running": 0, "completed": 0, "failed": 0}
            }
    
    async def start_telemetry_loop(self):
        """Start the telemetry collection and broadcasting loop"""
        self.running = True
        logger.info("Starting telemetry collection loop")
        
        while self.running:
            try:
                await self.collect_real_telemetry()
                await self.broadcast(self.telemetry_data)
                await asyncio.sleep(2)  # Update every 2 seconds
            except Exception as e:
                logger.error(f"Error in telemetry loop: {e}")
                await asyncio.sleep(5)  # Wait longer on error
    
    def stop(self):
        """Stop the telemetry loop"""
        self.running = False
        logger.info("Stopping telemetry collection loop")

telemetry_manager = TelemetryManager()

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """WebSocket endpoint for real-time telemetry"""
    await telemetry_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        telemetry_manager.disconnect(websocket)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "telemetry",
        "active_connections": len(telemetry_manager.active_connections),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/metrics")
async def get_current_metrics():
    """Get current telemetry metrics"""
    return telemetry_manager.telemetry_data

@app.on_event("startup")
async def startup_event():
    """Start telemetry collection on startup"""
    asyncio.create_task(telemetry_manager.start_telemetry_loop())

@app.on_event("shutdown")
async def shutdown_event():
    """Stop telemetry collection on shutdown"""
    telemetry_manager.stop()

if __name__ == "__main__":
    import os
    port = int(os.getenv("TELEMETRY_PORT", 8921))
    logger.info(f"🚀 Starting RadiusForge Telemetry Server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)
