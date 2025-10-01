#!/usr/bin/env python3
"""
RadiusForge pxGrid Client
Cisco pxGrid protocol implementation for token issuance and subscriptions
"""

import asyncio
import aiohttp
import json
import ssl
import time
import logging
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum
import websockets
from urllib.parse import urljoin

logger = logging.getLogger(__name__)


class pxGridStatus(Enum):
    """pxGrid connection status"""

    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    AUTHENTICATED = "authenticated"
    SUBSCRIBED = "subscribed"
    ERROR = "error"


@dataclass
class pxGridMetrics:
    """pxGrid test metrics"""

    connection_attempts: int = 0
    successful_connections: int = 0
    failed_connections: int = 0
    tokens_requested: int = 0
    tokens_received: int = 0
    subscriptions_created: int = 0
    events_received: int = 0
    errors: int = 0
    total_latency_ms: float = 0.0
    min_latency_ms: float = float("inf")
    max_latency_ms: float = 0.0
    latencies: Optional[List[float]] = None

    def __post_init__(self):
        if self.latencies is None:
            self.latencies = []

    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        if self.connection_attempts == 0:
            return 0.0
        return (self.successful_connections / self.connection_attempts) * 100

    @property
    def error_rate(self) -> float:
        """Calculate error rate percentage"""
        total_operations = self.connection_attempts + self.tokens_requested + self.subscriptions_created
        if total_operations == 0:
            return 0.0
        return (self.errors / total_operations) * 100

    @property
    def avg_latency_ms(self) -> float:
        """Calculate average latency"""
        if not self.latencies:
            return 0.0
        return sum(self.latencies) / len(self.latencies)


class PxGridClient:
    """pxGrid client for Cisco ISE integration"""

    def __init__(
        self,
        server_host: str,
        server_port: int = 8910,
        client_name: str = "RadiusForge",
        username: str = "pxgrid_client",
        password: str = "password",
        verify_ssl: bool = False,
    ):
        self.server_host = server_host
        self.server_port = server_port
        self.client_name = client_name
        self.username = username
        self.password = password
        self.verify_ssl = verify_ssl

        self.base_url = f"https://{server_host}:{server_port}/pxgrid"
        self.control_url = urljoin(self.base_url, "control")

        self.status = pxGridStatus.DISCONNECTED
        self.session_id = None
        self.access_token = None
        self.websocket = None
        self.metrics = pxGridMetrics()
        self.is_running = False

        # Callbacks
        self.on_event_received: Optional[Callable] = None
        self.on_status_changed: Optional[Callable] = None
        self.on_metrics_update: Optional[Callable] = None

        self.ssl_context = ssl.create_default_context()
        if not verify_ssl:
            self.ssl_context.check_hostname = False
            self.ssl_context.verify_mode = ssl.CERT_NONE

    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Optional[Dict]:
        """Make HTTP request to pxGrid API"""
        url = urljoin(self.control_url, endpoint)

        try:
            start_time = time.time()

            async with aiohttp.ClientSession(
                connector=aiohttp.TCPConnector(ssl=self.ssl_context), timeout=aiohttp.ClientTimeout(total=30)
            ) as session:

                auth = aiohttp.BasicAuth(self.username, self.password)
                headers = {"Content-Type": "application/json", "Accept": "application/json"}

                if self.access_token:
                    headers["Authorization"] = f"Bearer {self.access_token}"

                async with session.request(method, url, json=data, headers=headers, auth=auth) as response:

                    end_time = time.time()
                    latency_ms = (end_time - start_time) * 1000

                    if self.metrics.latencies is not None:
                        self.metrics.latencies.append(latency_ms)
                    self.metrics.total_latency_ms += latency_ms
                    self.metrics.min_latency_ms = min(self.metrics.min_latency_ms, latency_ms)
                    self.metrics.max_latency_ms = max(self.metrics.max_latency_ms, latency_ms)

                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.error(f"pxGrid API error: {response.status} - {await response.text()}")
                        self.metrics.errors += 1
                        return None

        except Exception as e:
            logger.error(f"pxGrid request error: {e}")
            self.metrics.errors += 1
            return None

    async def connect(self) -> bool:
        """Connect to pxGrid controller"""
        self.metrics.connection_attempts += 1
        self._set_status(pxGridStatus.CONNECTING)

        try:
            account_data = {"nodeName": self.client_name, "description": "RadiusForge AAA Testing Platform"}

            response = await self._make_request("POST", "AccountActivate", account_data)
            if not response:
                self._set_status(pxGridStatus.ERROR)
                return False

            status_response = await self._make_request("POST", "AccountActivate", account_data)
            if not status_response or status_response.get("accountState") != "ENABLED":
                logger.warning("pxGrid account not enabled, may need manual approval")

            self.metrics.successful_connections += 1
            self._set_status(pxGridStatus.CONNECTED)
            return True

        except Exception as e:
            logger.error(f"pxGrid connection error: {e}")
            self.metrics.failed_connections += 1
            self._set_status(pxGridStatus.ERROR)
            return False

    async def get_access_token(self) -> bool:
        """Get access token for API calls"""
        try:
            self.metrics.tokens_requested += 1

            token_data = {"description": "RadiusForge access token"}

            response = await self._make_request("POST", "AccessSecret", token_data)
            if response and "secret" in response:
                self.access_token = response["secret"]
                self.metrics.tokens_received += 1
                self._set_status(pxGridStatus.AUTHENTICATED)
                return True

            return False

        except Exception as e:
            logger.error(f"pxGrid token error: {e}")
            self.metrics.errors += 1
            return False

    async def get_service_lookup(self, service_name: str) -> Optional[Dict]:
        """Lookup service information"""
        try:
            lookup_data = {"name": service_name}

            response = await self._make_request("POST", "ServiceLookup", lookup_data)
            return response

        except Exception as e:
            logger.error(f"pxGrid service lookup error: {e}")
            self.metrics.errors += 1
            return None

    async def subscribe_to_service(self, service_name: str) -> bool:
        """Subscribe to a pxGrid service"""
        try:
            service_info = await self.get_service_lookup(service_name)
            if not service_info or "services" not in service_info:
                return False

            services = service_info["services"]
            if not services:
                return False

            ws_service = None
            for service in services:
                if service.get("name") == service_name and "wsPubsubService" in service.get("properties", {}):
                    ws_service = service
                    break

            if not ws_service:
                logger.error(f"WebSocket service not found for {service_name}")
                return False

            ws_url = ws_service["properties"]["wsPubsubService"]

            await self._subscribe_websocket(ws_url, service_name)

            self.metrics.subscriptions_created += 1
            self._set_status(pxGridStatus.SUBSCRIBED)
            return True

        except Exception as e:
            logger.error(f"pxGrid subscription error: {e}")
            self.metrics.errors += 1
            return False

    async def _subscribe_websocket(self, ws_url: str, service_name: str):
        """Subscribe to WebSocket events"""
        try:
            headers = {}
            if self.access_token:
                headers["Authorization"] = f"Bearer {self.access_token}"

            self.websocket = await websockets.connect(ws_url, extra_headers=headers, ssl=self.ssl_context)

            logger.info(f"Connected to pxGrid WebSocket for {service_name}")

            async for message in self.websocket:
                try:
                    event_data = json.loads(message)
                    self.metrics.events_received += 1

                    if self.on_event_received:
                        await self.on_event_received(service_name, event_data)

                    logger.debug(f"Received pxGrid event: {event_data}")

                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON in pxGrid event: {message}")
                except Exception as e:
                    logger.error(f"Error processing pxGrid event: {e}")

        except Exception as e:
            logger.error(f"pxGrid WebSocket error: {e}")
            self.metrics.errors += 1

    async def test_session_service(self) -> bool:
        """Test session service subscription (smoke test)"""
        try:
            if self.status == pxGridStatus.DISCONNECTED:
                if not await self.connect():
                    return False

            if self.status == pxGridStatus.CONNECTED:
                if not await self.get_access_token():
                    return False

            return await self.subscribe_to_service("com.cisco.ise.session")

        except Exception as e:
            logger.error(f"pxGrid session service test error: {e}")
            return False

    async def test_identity_service(self) -> bool:
        """Test identity service subscription (smoke test)"""
        try:
            if self.status == pxGridStatus.DISCONNECTED:
                if not await self.connect():
                    return False

            if self.status == pxGridStatus.CONNECTED:
                if not await self.get_access_token():
                    return False

            return await self.subscribe_to_service("com.cisco.ise.config.profiler")

        except Exception as e:
            logger.error(f"pxGrid identity service test error: {e}")
            return False

    async def run_smoke_test(self, duration_seconds: int = 30) -> pxGridMetrics:
        """Run pxGrid smoke test"""
        self.is_running = True
        self.metrics = pxGridMetrics()

        logger.info(f"Starting pxGrid smoke test for {duration_seconds}s")

        try:
            start_time = time.time()

            if await self.connect() and await self.get_access_token():

                tasks = [self.test_session_service(), self.test_identity_service()]

                results = await asyncio.gather(*tasks, return_exceptions=True)

                elapsed = 0
                while elapsed < duration_seconds and self.is_running:
                    await asyncio.sleep(1)
                    elapsed = time.time() - start_time

                    if self.on_metrics_update:
                        await self.on_metrics_update(self.metrics)

            return self.metrics

        except Exception as e:
            logger.error(f"pxGrid smoke test error: {e}")
            return self.metrics
        finally:
            self.is_running = False
            await self.disconnect()

    async def disconnect(self):
        """Disconnect from pxGrid"""
        try:
            if self.websocket:
                await self.websocket.close()
                self.websocket = None

            self._set_status(pxGridStatus.DISCONNECTED)
            self.access_token = None

        except Exception as e:
            logger.error(f"pxGrid disconnect error: {e}")

    def _set_status(self, status: pxGridStatus):
        """Set connection status and notify callback"""
        old_status = self.status
        self.status = status

        if self.on_status_changed and old_status != status:
            asyncio.create_task(self.on_status_changed(old_status, status))

    def stop_test(self):
        """Stop running test"""
        self.is_running = False

    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics as dictionary"""
        return {
            "connection_attempts": self.metrics.connection_attempts,
            "successful_connections": self.metrics.successful_connections,
            "failed_connections": self.metrics.failed_connections,
            "tokens_requested": self.metrics.tokens_requested,
            "tokens_received": self.metrics.tokens_received,
            "subscriptions_created": self.metrics.subscriptions_created,
            "events_received": self.metrics.events_received,
            "errors": self.metrics.errors,
            "success_rate": self.metrics.success_rate,
            "error_rate": self.metrics.error_rate,
            "avg_latency_ms": self.metrics.avg_latency_ms,
            "min_latency_ms": self.metrics.min_latency_ms if self.metrics.min_latency_ms != float("inf") else 0.0,
            "max_latency_ms": self.metrics.max_latency_ms,
            "total_latency_ms": self.metrics.total_latency_ms,
            "status": self.status.value,
        }
