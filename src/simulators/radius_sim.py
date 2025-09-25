#!/usr/bin/env python3
"""
RadiusForge RADIUS Simulator - TEST ONLY
Hermetic and deterministic RADIUS server for testing
"""

import os

if os.getenv("ALLOW_SIMULATORS") != "1":
    raise ImportError("Simulators are test-only.")

import asyncio
import struct
import logging
from typing import Dict
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class SimRADIUSCode(Enum):
    """RADIUS packet codes for simulator"""

    ACCESS_REQUEST = 1
    ACCESS_ACCEPT = 2
    ACCESS_REJECT = 3
    ACCOUNTING_REQUEST = 4
    ACCOUNTING_RESPONSE = 5


@dataclass
class SimRADIUSPacket:
    """Simplified RADIUS packet for simulator"""

    code: SimRADIUSCode
    identifier: int
    authenticator: bytes
    attributes: Dict[int, bytes]

    @classmethod
    def from_bytes(cls, data: bytes) -> "SimRADIUSPacket":
        """Parse packet from bytes"""
        if len(data) < 20:
            raise ValueError("RADIUS packet too short")

        code, identifier, length, authenticator = struct.unpack("!BBH16s", data[:20])

        # Parse attributes
        attributes = {}
        offset = 20
        while offset < len(data):
            if offset + 2 > len(data):
                break

            attr_type, attr_length = struct.unpack("!BB", data[offset : offset + 2])
            if attr_length < 2 or offset + attr_length > len(data):
                break

            attr_value = data[offset + 2 : offset + attr_length]
            attributes[attr_type] = attr_value
            offset += attr_length

        return cls(code=SimRADIUSCode(code), identifier=identifier, authenticator=authenticator, attributes=attributes)

    def to_bytes(self, secret: str = "testing123") -> bytes:
        """Convert packet to bytes"""
        # Build attributes
        attr_data = b""
        for attr_type, attr_value in self.attributes.items():
            attr_length = len(attr_value) + 2
            attr_data += struct.pack("!BB", attr_type, attr_length) + attr_value

        # Calculate total length
        total_length = 20 + len(attr_data)

        packet = struct.pack("!BBH16s", self.code.value, self.identifier, total_length, self.authenticator)
        packet += attr_data

        return packet


class RADIUSSimulator:
    """Deterministic RADIUS server simulator for testing"""

    def __init__(
        self,
        host: str = "127.0.0.1",
        auth_port: int = 11812,  # Non-standard port for testing
        acct_port: int = 11813,
        secret: str = "testing123",
    ):
        self.host = host
        self.auth_port = auth_port
        self.acct_port = acct_port
        self.secret = secret

        self.user_database = {
            "testuser": {"password": "testpass", "accept": True},
            "validuser": {"password": "password", "accept": True},
            "invaliduser": {"password": "wrongpass", "accept": False},
            "rejectuser": {"password": "anypass", "accept": False},
        }

        self.auth_server = None
        self.acct_server = None
        self.is_running = False
        self.request_count = 0
        self.response_delay = 0.01  # 10ms deterministic delay

    async def start(self):
        """Start the simulator servers"""
        self.is_running = True

        self.auth_server = await asyncio.start_server(self._handle_auth_connection, self.host, self.auth_port)

        self.acct_server = await asyncio.start_server(self._handle_acct_connection, self.host, self.acct_port)

        logger.info(f"RADIUS Simulator started on {self.host}:{self.auth_port}/{self.acct_port}")

    async def stop(self):
        """Stop the simulator servers"""
        self.is_running = False

        if self.auth_server:
            self.auth_server.close()
            await self.auth_server.wait_closed()

        if self.acct_server:
            self.acct_server.close()
            await self.acct_server.wait_closed()

        logger.info("RADIUS Simulator stopped")

    async def _handle_auth_connection(self, reader, writer):
        """Handle authentication connection"""
        try:
            while self.is_running:
                data = await reader.read(4096)
                if not data:
                    break

                request = SimRADIUSPacket.from_bytes(data)
                self.request_count += 1

                response = await self._process_auth_request(request)

                await asyncio.sleep(self.response_delay)

                response_data = response.to_bytes(self.secret)
                writer.write(response_data)
                await writer.drain()

        except Exception as e:
            logger.error(f"RADIUS auth handler error: {e}")
        finally:
            writer.close()

    async def _handle_acct_connection(self, reader, writer):
        """Handle accounting connection"""
        try:
            while self.is_running:
                data = await reader.read(4096)
                if not data:
                    break

                request = SimRADIUSPacket.from_bytes(data)
                self.request_count += 1

                response = await self._process_acct_request(request)

                await asyncio.sleep(self.response_delay)

                response_data = response.to_bytes(self.secret)
                writer.write(response_data)
                await writer.drain()

        except Exception as e:
            logger.error(f"RADIUS acct handler error: {e}")
        finally:
            writer.close()

    async def _process_auth_request(self, request: SimRADIUSPacket) -> SimRADIUSPacket:
        """Process authentication request deterministically"""
        username = ""
        if 1 in request.attributes:  # User-Name
            username = request.attributes[1].decode("utf-8", errors="ignore")

        if username in self.user_database:
            user_info = self.user_database[username]
            if user_info["accept"]:
                response_code = SimRADIUSCode.ACCESS_ACCEPT
                attributes = {18: b"Welcome"}  # Reply-Message
            else:
                response_code = SimRADIUSCode.ACCESS_REJECT
                attributes = {18: b"Access denied"}
        else:
            response_code = SimRADIUSCode.ACCESS_REJECT
            attributes = {18: b"User not found"}

        return SimRADIUSPacket(
            code=response_code,
            identifier=request.identifier,
            authenticator=request.authenticator,  # Will be recalculated in to_bytes
            attributes=attributes,
        )

    async def _process_acct_request(self, request: SimRADIUSPacket) -> SimRADIUSPacket:
        """Process accounting request deterministically"""
        return SimRADIUSPacket(
            code=SimRADIUSCode.ACCOUNTING_RESPONSE,
            identifier=request.identifier,
            authenticator=request.authenticator,
            attributes={},
        )

    def get_stats(self) -> Dict:
        """Get simulator statistics"""
        return {
            "request_count": self.request_count,
            "is_running": self.is_running,
            "auth_port": self.auth_port,
            "acct_port": self.acct_port,
            "user_count": len(self.user_database),
        }

    def add_user(self, username: str, password: str, accept: bool = True):
        """Add user to simulator database"""
        self.user_database[username] = {"password": password, "accept": accept}

    def remove_user(self, username: str):
        """Remove user from simulator database"""
        if username in self.user_database:
            del self.user_database[username]

    def set_response_delay(self, delay_seconds: float):
        """Set deterministic response delay"""
        self.response_delay = delay_seconds
