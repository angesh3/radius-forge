"""WebSocket manager for real-time telemetry"""

from fastapi import WebSocket
from typing import Dict, List, Set, Any, Optional
import json
import asyncio
import logging
from datetime import datetime
import uuid
import threading
from .database import get_db_context
from .models import TestMetric, TestRun
from sqlalchemy import select

logger = logging.getLogger(__name__)


class WebSocketConnection:
    """Individual WebSocket connection wrapper"""
    
    def __init__(self, websocket: WebSocket, client_id: Optional[str] = None):
        self.websocket = websocket
        self.client_id = client_id or str(uuid.uuid4())
        self.subscriptions: Set[str] = set()
        self.last_ping = datetime.now()
        self.connected_at = datetime.now()
        self.metadata: Dict[str, Any] = {}

    async def send_json(self, data: dict):
        """Send JSON data to the connection"""
        try:
            await self.websocket.send_json(data)
        except Exception as e:
            logger.error(f"Failed to send JSON to {self.client_id}: {e}")
            raise

    async def send_text(self, message: str):
        """Send text message to the connection"""
        try:
            await self.websocket.send_text(message)
        except Exception as e:
            logger.error(f"Failed to send text to {self.client_id}: {e}")
            raise

    def subscribe(self, topics):
        """Subscribe to topics"""
        if isinstance(topics, str):
            self.subscriptions.add(topics)
        else:
            self.subscriptions.update(topics)

    def unsubscribe(self, topics):
        """Unsubscribe from topics"""
        if isinstance(topics, str):
            self.subscriptions.discard(topics)
        else:
            self.subscriptions.difference_update(topics)

    def update_ping(self):
        """Update last ping timestamp"""
        self.last_ping = datetime.now()

    def is_subscribed_to(self, topic: str) -> bool:
        """Check if connection is subscribed to a topic"""
        return topic in self.subscriptions

    def is_subscribed(self, topic: str) -> bool:
        """Check if connection is subscribed to a topic (test compatibility)"""
        return topic in self.subscriptions

    def is_subscribe_to(self, topic: str) -> bool:
        """Legacy method name for backward compatibility"""
        return self.is_subscribed_to(topic)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connections: Dict[str, WebSocketConnection] = {}
        self.subscriptions: Dict[WebSocket, Set[str]] = {}
        self.topic_subscriptions: Dict[str, Set[str]] = {}
        self.topic_subscribers: Dict[str, Set[str]] = {}
        self._lock = threading.Lock()
        self.telemetry_data = {
            "rps": 0,
            "latency_p50": 0,
            "latency_p95": 0,
            "latency_p99": 0,
            "error_rate": 0,
            "active_connections": 0,
            "cpu_usage": 0,
            "memory_usage": 0,
            "network_throughput": "0 Gbps",
        }

    async def connect(self, websocket: WebSocket, client_id: Optional[str] = None):
        await websocket.accept()
        connection = WebSocketConnection(websocket, client_id)
        self.active_connections.append(websocket)
        self.connections[connection.client_id] = connection
        self.subscriptions[websocket] = set()
        return connection

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]
        to_remove = None
        for client_id, conn in self.connections.items():
            if conn.websocket == websocket:
                to_remove = client_id
                break
        if to_remove:
            del self.connections[to_remove]

    async def disconnect_all(self):
        """Disconnect all active connections"""
        connections_copy = self.active_connections.copy()
        for connection in connections_copy:
            try:
                await connection.close()
            except Exception as e:
                logger.warning(f"Error closing WebSocket connection: {e}")

        self.active_connections.clear()
        self.subscriptions.clear()

    async def subscribe(self, websocket: WebSocket, metrics: List[str]):
        """Subscribe websocket to specific metrics"""
        if websocket in self.subscriptions:
            self.subscriptions[websocket].update(metrics)
        else:
            self.subscriptions[websocket] = set(metrics)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message):
        """Broadcast message to all active connections"""
        if isinstance(message, dict):
            message = json.dumps(message)
        elif not isinstance(message, str):
            message = str(message)

        connections_copy = self.active_connections.copy()

        for connection in connections_copy:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send message to WebSocket connection: {e}")
                if connection in self.active_connections:
                    self.active_connections.remove(connection)

    async def generate_telemetry(self):
        """Generate real telemetry data from database"""
        
        while True:
            try:
                async with get_db_context() as db:
                    recent_metrics = await db.execute(
                        select(TestMetric).order_by(TestMetric.timestamp.desc()).limit(10)
                    )
                    metrics = recent_metrics.scalars().all()
                    
                    if metrics:
                        latest = metrics[0]
                        self.telemetry_data.update({
                            "rps": latest.requests_per_second,
                            "latency_p50": latest.latency_p50,
                            "latency_p95": latest.latency_p95,
                            "latency_p99": latest.latency_p99,
                            "error_rate": latest.error_rate,
                            "active_connections": latest.active_connections,
                            "cpu_usage": latest.cpu_usage,
                            "memory_usage": latest.memory_usage,
                            "network_throughput": f"{latest.network_throughput:.1f} Gbps",
                            "timestamp": latest.timestamp.isoformat()
                        })
                    else:
                        self.telemetry_data.update({
                            "rps": 0, "latency_p50": 0, "latency_p95": 0, "latency_p99": 0,
                            "error_rate": 0.0, "active_connections": 0, "cpu_usage": 0,
                            "memory_usage": 0, "network_throughput": "0.0 Gbps",
                            "timestamp": datetime.now().isoformat()
                        })
                    
                    # Get real test results
                    active_runs = await db.execute(
                        select(TestRun).where(TestRun.status.in_(['running', 'completed', 'failed']))
                    )
                    runs = active_runs.scalars().all()
                    
                    self.telemetry_data["test_results"] = {
                        "total_tests": len(runs),
                        "passed": len([r for r in runs if r.status == 'completed']),
                        "failed": len([r for r in runs if r.status == 'failed']),
                        "in_progress": len([r for r in runs if r.status == 'running']),
                    }
                    
                    # Add alert if error rate is high (only if we have real data)
                    if metrics and self.telemetry_data["error_rate"] > 1.5:
                        self.telemetry_data["alert"] = {
                            "level": "warning",
                            "message": f"High error rate detected: {self.telemetry_data['error_rate']}%",
                            "timestamp": datetime.now().isoformat(),
                        }
                    else:
                        self.telemetry_data.pop("alert", None)
                    
            except Exception as e:
                logger.error(f"Error generating telemetry: {e}")
                self.telemetry_data.update({
                    "rps": 0, "latency_p50": 0, "latency_p95": 0, "latency_p99": 0,
                    "error_rate": 0.0, "active_connections": 0, "cpu_usage": 0,
                    "memory_usage": 0, "network_throughput": "0.0 Gbps",
                    "timestamp": datetime.now().isoformat(),
                    "test_results": {"total_tests": 0, "passed": 0, "failed": 0, "in_progress": 0}
                })
            
            # Broadcast to all connected clients
            await self.broadcast(json.dumps(self.telemetry_data))
            
            # Wait before next update
            await asyncio.sleep(2)


WebSocketManager = ConnectionManager

manager = ConnectionManager()
