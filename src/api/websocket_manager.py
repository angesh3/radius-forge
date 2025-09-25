"""WebSocket manager for real-time telemetry"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set, Any
import json
import asyncio
import random
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[WebSocket, Set[str]] = {}
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

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = set()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]

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
        """Generate mock telemetry data"""
        while True:
            # Simulate telemetry updates
            self.telemetry_data["rps"] = random.randint(1000, 5000)
            self.telemetry_data["latency_p50"] = random.randint(10, 30)
            self.telemetry_data["latency_p95"] = random.randint(30, 60)
            self.telemetry_data["latency_p99"] = random.randint(60, 100)
            self.telemetry_data["error_rate"] = round(random.uniform(0, 2), 2)
            self.telemetry_data["active_connections"] = random.randint(50, 200)
            self.telemetry_data["cpu_usage"] = random.randint(20, 80)
            self.telemetry_data["memory_usage"] = random.randint(30, 70)
            self.telemetry_data["network_throughput"] = f"{round(random.uniform(0.5, 5), 1)} Gbps"
            self.telemetry_data["timestamp"] = datetime.now().isoformat()

            # Add test results
            self.telemetry_data["test_results"] = {
                "total_tests": random.randint(100, 1000),
                "passed": random.randint(90, 100),
                "failed": random.randint(0, 10),
                "in_progress": random.randint(1, 5),
            }

            # Add alert if error rate is high
            if self.telemetry_data["error_rate"] > 1.5:
                self.telemetry_data["alert"] = {
                    "level": "warning",
                    "message": f"High error rate detected: {self.telemetry_data['error_rate']}%",
                    "timestamp": datetime.now().isoformat(),
                }
            else:
                self.telemetry_data.pop("alert", None)

            # Broadcast to all connected clients
            await self.broadcast(json.dumps(self.telemetry_data))

            # Wait before next update
            await asyncio.sleep(2)


WebSocketManager = ConnectionManager

manager = ConnectionManager()
