#!/usr/bin/env python3
"""
RadiusForge pxGrid Simulator - TEST ONLY
Hermetic and deterministic pxGrid server for testing
"""

import os

if os.getenv("ALLOW_SIMULATORS") != "1":
    raise ImportError("Simulators are test-only.")

import asyncio
import json
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass
from aiohttp import web, WSMsgType
import ssl
import time

logger = logging.getLogger(__name__)


@dataclass
class SimpxGridEvent:
    """Simulated pxGrid event"""

    service: str
    event_type: str
    data: Dict
    timestamp: str


class pxGridSimulator:
    """Deterministic pxGrid server simulator for testing"""

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 18910,  # Non-standard port for testing
        username: str = "pxgrid_client",
        password: str = "password",
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password

        self.app = None
        self.runner = None
        self.site = None
        self.is_running = False
        self.request_count = 0
        self.websocket_connections = []
        self.response_delay = 0.01  # 10ms deterministic delay

        self.accounts = {"RadiusForge": {"state": "ENABLED", "description": "RadiusForge AAA Testing Platform"}}

        self.services = {
            "com.cisco.ise.session": {
                "name": "com.cisco.ise.session",
                "properties": {"wsPubsubService": f"wss://{host}:{port}/pxgrid/ws/session"},
            },
            "com.cisco.ise.config.profiler": {
                "name": "com.cisco.ise.config.profiler",
                "properties": {"wsPubsubService": f"wss://{host}:{port}/pxgrid/ws/profiler"},
            },
        }

        self.access_tokens = {}

    async def start(self):
        """Start the pxGrid simulator server"""
        self.is_running = True

        self.app = web.Application()

        self.app.router.add_post("/pxgrid/control/AccountActivate", self._handle_account_activate)
        self.app.router.add_post("/pxgrid/control/AccessSecret", self._handle_access_secret)
        self.app.router.add_post("/pxgrid/control/ServiceLookup", self._handle_service_lookup)
        self.app.router.add_get("/pxgrid/ws/session", self._handle_websocket)
        self.app.router.add_get("/pxgrid/ws/profiler", self._handle_websocket)

        self.runner = web.AppRunner(self.app)
        await self.runner.setup()

        self.site = web.TCPSite(self.runner, self.host, self.port)
        await self.site.start()

        logger.info(f"pxGrid Simulator started on {self.host}:{self.port}")

        asyncio.create_task(self._generate_events())

    async def stop(self):
        """Stop the pxGrid simulator server"""
        self.is_running = False

        for ws in self.websocket_connections:
            if not ws.closed:
                await ws.close()

        if self.site:
            await self.site.stop()

        if self.runner:
            await self.runner.cleanup()

        logger.info("pxGrid Simulator stopped")

    async def _handle_account_activate(self, request):
        """Handle account activation request"""
        await asyncio.sleep(self.response_delay)
        self.request_count += 1

        try:
            data = await request.json()
            node_name = data.get("nodeName", "unknown")

            if node_name not in self.accounts:
                self.accounts[node_name] = {"state": "ENABLED", "description": data.get("description", "")}

            account_info = self.accounts[node_name]

            return web.json_response({"accountState": account_info["state"], "version": "2.0.0.0"})

        except Exception as e:
            logger.error(f"Account activate error: {e}")
            return web.json_response({"error": str(e)}, status=400)

    async def _handle_access_secret(self, request):
        """Handle access secret request"""
        await asyncio.sleep(self.response_delay)
        self.request_count += 1

        try:
            token = f"sim_token_{int(time.time())}"
            self.access_tokens[token] = {"created": time.time()}

            return web.json_response({"secret": token, "peerNodeName": "ise-simulator"})

        except Exception as e:
            logger.error(f"Access secret error: {e}")
            return web.json_response({"error": str(e)}, status=400)

    async def _handle_service_lookup(self, request):
        """Handle service lookup request"""
        await asyncio.sleep(self.response_delay)
        self.request_count += 1

        try:
            data = await request.json()
            service_name = data.get("name", "")

            if service_name in self.services:
                service_info = self.services[service_name]
                return web.json_response({"services": [service_info]})
            else:
                return web.json_response({"services": []})

        except Exception as e:
            logger.error(f"Service lookup error: {e}")
            return web.json_response({"error": str(e)}, status=400)

    async def _handle_websocket(self, request):
        """Handle WebSocket connection"""
        ws = web.WebSocketResponse()
        await ws.prepare(request)

        self.websocket_connections.append(ws)
        logger.info("pxGrid WebSocket client connected")

        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    await ws.send_str(f"Echo: {msg.data}")
                elif msg.type == WSMsgType.ERROR:
                    logger.error(f"WebSocket error: {ws.exception()}")
                    break
        except Exception as e:
            logger.error(f"WebSocket handler error: {e}")
        finally:
            if ws in self.websocket_connections:
                self.websocket_connections.remove(ws)
            logger.info("pxGrid WebSocket client disconnected")

        return ws

    async def _generate_events(self):
        """Generate deterministic events for testing"""
        event_counter = 0

        while self.is_running:
            await asyncio.sleep(5)  # Generate event every 5 seconds

            if not self.websocket_connections:
                continue

            event_counter += 1

            session_event = {
                "eventType": "sessionStart",
                "timestamp": time.time(),
                "sessionId": f"sim_session_{event_counter}",
                "userName": f"sim_user_{event_counter % 10}",
                "nasIpAddress": "192.168.1.100",
                "nasPortId": f"GigabitEthernet0/{event_counter % 48}",
                "endpointMacAddress": f"00:11:22:33:44:{event_counter % 256:02x}",
                "endpointIpAddress": f"10.0.1.{event_counter % 254 + 1}",
                "authenticationMethod": "dot1x",
                "authenticationStatus": "PASSED" if event_counter % 4 != 0 else "FAILED",
            }

            for ws in self.websocket_connections.copy():
                try:
                    if not ws.closed:
                        await ws.send_str(json.dumps(session_event))
                except Exception as e:
                    logger.error(f"Error sending event: {e}")
                    if ws in self.websocket_connections:
                        self.websocket_connections.remove(ws)

    def get_stats(self) -> Dict:
        """Get simulator statistics"""
        return {
            "request_count": self.request_count,
            "is_running": self.is_running,
            "port": self.port,
            "websocket_connections": len(self.websocket_connections),
            "accounts": len(self.accounts),
            "services": len(self.services),
            "access_tokens": len(self.access_tokens),
        }

    def add_service(self, name: str, ws_url: str):
        """Add service to simulator"""
        self.services[name] = {"name": name, "properties": {"wsPubsubService": ws_url}}

    def set_response_delay(self, delay_seconds: float):
        """Set deterministic response delay"""
        self.response_delay = delay_seconds
