#!/usr/bin/env python3
"""
RadiusForge TACACS+ Simulator - TEST ONLY
Hermetic and deterministic TACACS+ server for testing
"""

import os

if os.getenv("ALLOW_SIMULATORS") != "1":
    raise ImportError("Simulators are test-only.")

import asyncio
import struct
import hashlib
import logging
from typing import Dict
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class SimTACACSType(Enum):
    """TACACS+ packet types for simulator"""

    AUTHENTICATION = 1
    AUTHORIZATION = 2
    ACCOUNTING = 3


class SimTACACSStatus(Enum):
    """TACACS+ status codes for simulator"""

    PASS = 1
    FAIL = 2
    ERROR = 7


@dataclass
class SimTACACSPacket:
    """Simplified TACACS+ packet for simulator"""

    version: int = 0xC0
    type: SimTACACSType = SimTACACSType.AUTHENTICATION
    seq_no: int = 1
    flags: int = 0
    session_id: int = 0
    body: bytes = b""

    @classmethod
    def from_bytes(cls, data: bytes, secret: str = "testing123") -> "SimTACACSPacket":
        """Parse TACACS+ packet from bytes"""
        if len(data) < 12:
            raise ValueError("TACACS+ packet too short")

        version, type_val, seq_no, flags, session_id, length = struct.unpack("!BBBBII", data[:12])
        body = data[12 : 12 + length] if len(data) >= 12 + length else b""

        packet = cls(
            version=version, type=SimTACACSType(type_val), seq_no=seq_no, flags=flags, session_id=session_id, body=body
        )

        if secret and body:
            packet.body = packet._decrypt_body(body, secret, session_id, version, seq_no)

        return packet

    def _decrypt_body(self, body: bytes, secret: str, session_id: int, version: int, seq_no: int) -> bytes:
        """Simplified TACACS+ body decryption"""
        if not body or not secret:
            return body

        pad = self._generate_pad(secret.encode("utf-8"), session_id, version, seq_no, len(body))

        decrypted = bytearray()
        for i, byte in enumerate(body):
            decrypted.append(byte ^ pad[i])

        return bytes(decrypted)

    def _generate_pad(self, secret: bytes, session_id: int, version: int, seq_no: int, length: int) -> bytes:
        """Generate decryption pad"""
        pad = bytearray()
        session_bytes = struct.pack("!I", session_id)
        version_bytes = struct.pack("!B", version)
        seq_bytes = struct.pack("!B", seq_no)

        i = 0
        while len(pad) < length:
            hash_input = secret + session_bytes + version_bytes + seq_bytes + struct.pack("!B", i)
            hash_result = hashlib.md5(hash_input).digest()
            pad.extend(hash_result)
            i += 1

        return bytes(pad[:length])

    def to_bytes(self, secret: str = "testing123") -> bytes:
        """Convert packet to bytes"""
        encrypted_body = self._encrypt_body(self.body, secret) if secret else self.body

        header = struct.pack("!BBBBI", self.version, self.type.value, self.seq_no, self.flags, self.session_id)
        header += struct.pack("!I", len(encrypted_body))

        return header + encrypted_body

    def _encrypt_body(self, body: bytes, secret: str) -> bytes:
        """Encrypt TACACS+ body"""
        if not body or not secret:
            return body

        pad = self._generate_pad(secret.encode("utf-8"), self.session_id, self.version, self.seq_no, len(body))

        encrypted = bytearray()
        for i, byte in enumerate(body):
            encrypted.append(byte ^ pad[i])

        return bytes(encrypted)


class TACACSSimulator:
    """Deterministic TACACS+ server simulator for testing"""

    def __init__(
        self, host: str = "127.0.0.1", port: int = 1049, secret: str = "testing123"  # Non-standard port for testing
    ):
        self.host = host
        self.port = port
        self.secret = secret

        self.user_database = {
            "testuser": {"password": "testpass", "auth": True, "authz": True},
            "validuser": {"password": "password", "auth": True, "authz": True},
            "invaliduser": {"password": "wrongpass", "auth": False, "authz": False},
            "rejectuser": {"password": "anypass", "auth": False, "authz": False},
            "authzfail": {"password": "password", "auth": True, "authz": False},
        }

        self.server = None
        self.is_running = False
        self.request_count = 0
        self.response_delay = 0.01  # 10ms deterministic delay

    async def start(self):
        """Start the TACACS+ simulator server"""
        self.is_running = True

        self.server = await asyncio.start_server(self._handle_connection, self.host, self.port)

        logger.info(f"TACACS+ Simulator started on {self.host}:{self.port}")

    async def stop(self):
        """Stop the TACACS+ simulator server"""
        self.is_running = False

        if self.server:
            self.server.close()
            await self.server.wait_closed()

        logger.info("TACACS+ Simulator stopped")

    async def _handle_connection(self, reader, writer):
        """Handle TACACS+ connection"""
        try:
            while self.is_running:
                header_data = await reader.read(12)
                if not header_data or len(header_data) < 12:
                    break

                _, _, _, _, _, length = struct.unpack("!BBBBII", header_data)

                body_data = await reader.read(length) if length > 0 else b""

                request_data = header_data + body_data
                request = SimTACACSPacket.from_bytes(request_data, self.secret)
                self.request_count += 1

                response = await self._process_request(request)

                await asyncio.sleep(self.response_delay)

                response_data = response.to_bytes(self.secret)
                writer.write(response_data)
                await writer.drain()

        except Exception as e:
            logger.error(f"TACACS+ handler error: {e}")
        finally:
            writer.close()

    async def _process_request(self, request: SimTACACSPacket) -> SimTACACSPacket:
        """Process TACACS+ request deterministically"""
        if request.type == SimTACACSType.AUTHENTICATION:
            return await self._process_auth_request(request)
        elif request.type == SimTACACSType.AUTHORIZATION:
            return await self._process_authz_request(request)
        elif request.type == SimTACACSType.ACCOUNTING:
            return await self._process_acct_request(request)
        else:
            return SimTACACSPacket(
                type=request.type,
                seq_no=request.seq_no + 1,
                session_id=request.session_id,
                body=struct.pack("!B", SimTACACSStatus.ERROR.value),
            )

    async def _process_auth_request(self, request: SimTACACSPacket) -> SimTACACSPacket:
        """Process authentication request"""
        username = self._extract_username(request.body)

        if username in self.user_database:
            user_info = self.user_database[username]
            if user_info["auth"]:
                status = SimTACACSStatus.PASS.value
                msg = b"Authentication successful"
            else:
                status = SimTACACSStatus.FAIL.value
                msg = b"Authentication failed"
        else:
            status = SimTACACSStatus.FAIL.value
            msg = b"User not found"

        response_body = struct.pack("!BBB", status, 0, len(msg)) + msg

        return SimTACACSPacket(
            type=SimTACACSType.AUTHENTICATION,
            seq_no=request.seq_no + 1,
            session_id=request.session_id,
            body=response_body,
        )

    async def _process_authz_request(self, request: SimTACACSPacket) -> SimTACACSPacket:
        """Process authorization request"""
        username = self._extract_username(request.body)

        if username in self.user_database:
            user_info = self.user_database[username]
            if user_info["authz"]:
                status = SimTACACSStatus.PASS.value
                msg = b"Authorization successful"
            else:
                status = SimTACACSStatus.FAIL.value
                msg = b"Authorization failed"
        else:
            status = SimTACACSStatus.FAIL.value
            msg = b"User not found"

        response_body = struct.pack("!BBB", status, 0, len(msg)) + msg

        return SimTACACSPacket(
            type=SimTACACSType.AUTHORIZATION,
            seq_no=request.seq_no + 1,
            session_id=request.session_id,
            body=response_body,
        )

    async def _process_acct_request(self, request: SimTACACSPacket) -> SimTACACSPacket:
        """Process accounting request"""
        response_body = struct.pack("!BBBB", 0, 0, SimTACACSStatus.PASS.value, 0)

        return SimTACACSPacket(
            type=SimTACACSType.ACCOUNTING, seq_no=request.seq_no + 1, session_id=request.session_id, body=response_body
        )

    def _extract_username(self, body: bytes) -> str:
        """Extract username from TACACS+ body (simplified)"""
        if len(body) < 8:
            return ""

        try:
            user_len = body[4] if len(body) > 4 else 0
            if user_len > 0 and len(body) >= 8 + user_len:
                username_bytes = body[8 : 8 + user_len]
                return username_bytes.decode("utf-8", errors="ignore")
        except Exception:
            pass

        return ""

    def get_stats(self) -> Dict:
        """Get simulator statistics"""
        return {
            "request_count": self.request_count,
            "is_running": self.is_running,
            "port": self.port,
            "user_count": len(self.user_database),
        }

    def add_user(self, username: str, password: str, auth: bool = True, authz: bool = True):
        """Add user to simulator database"""
        self.user_database[username] = {"password": password, "auth": auth, "authz": authz}

    def remove_user(self, username: str):
        """Remove user from simulator database"""
        if username in self.user_database:
            del self.user_database[username]

    def set_response_delay(self, delay_seconds: float):
        """Set deterministic response delay"""
        self.response_delay = delay_seconds
