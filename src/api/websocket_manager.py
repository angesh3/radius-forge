"""WebSocket manager for real-time telemetry"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import asyncio
import random
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.telemetry_data = {
            "rps": 0,
            "latency_p50": 0,
            "latency_p95": 0,
            "latency_p99": 0,
            "error_rate": 0,
            "active_connections": 0,
            "cpu_usage": 0,
            "memory_usage": 0,
            "network_throughput": "0 Gbps"
        }
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
        
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Connection is closed, remove it
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
                "in_progress": random.randint(1, 5)
            }
            
            # Add alert if error rate is high
            if self.telemetry_data["error_rate"] > 1.5:
                self.telemetry_data["alert"] = {
                    "level": "warning",
                    "message": f"High error rate detected: {self.telemetry_data['error_rate']}%",
                    "timestamp": datetime.now().isoformat()
                }
            else:
                self.telemetry_data.pop("alert", None)
            
            # Broadcast to all connected clients
            await self.broadcast(json.dumps(self.telemetry_data))
            
            # Wait before next update
            await asyncio.sleep(2)

manager = ConnectionManager()