#!/usr/bin/env python3
"""
RadiusForge RADIUS Packet Generator
Generates RADIUS authentication and accounting packets for load testing
"""

import asyncio
import socket
import struct
import hashlib
import secrets
import time
import logging
from typing import Dict, List, Optional, Tuple, Any, Callable
from dataclasses import dataclass
from enum import Enum
import ipaddress

from ..config import settings

logger = logging.getLogger(__name__)


class RADIUSCode(Enum):
    """RADIUS packet codes"""

    ACCESS_REQUEST = 1
    ACCESS_ACCEPT = 2
    ACCESS_REJECT = 3
    ACCOUNTING_REQUEST = 4
    ACCOUNTING_RESPONSE = 5
    ACCESS_CHALLENGE = 11
    COA_REQUEST = 40
    COA_ACK = 41
    COA_NAK = 42
    DISCONNECT_REQUEST = 43
    DISCONNECT_ACK = 44
    DISCONNECT_NAK = 45


class RADIUSAttribute(Enum):
    """Common RADIUS attributes"""

    USER_NAME = 1
    USER_PASSWORD = 2
    CHAP_PASSWORD = 3
    NAS_IP_ADDRESS = 4
    NAS_PORT = 5
    SERVICE_TYPE = 6
    FRAMED_PROTOCOL = 7
    FRAMED_IP_ADDRESS = 8
    FRAMED_IP_NETMASK = 9
    FRAMED_ROUTING = 10
    FILTER_ID = 11
    FRAMED_MTU = 12
    FRAMED_COMPRESSION = 13
    LOGIN_IP_HOST = 14
    LOGIN_SERVICE = 15
    LOGIN_TCP_PORT = 16
    REPLY_MESSAGE = 18
    CALLBACK_NUMBER = 19
    CALLBACK_ID = 20
    FRAMED_ROUTE = 22
    FRAMED_IPX_NETWORK = 23
    STATE = 24
    CLASS = 25
    VENDOR_SPECIFIC = 26
    SESSION_TIMEOUT = 27
    IDLE_TIMEOUT = 28
    TERMINATION_ACTION = 29
    CALLED_STATION_ID = 30
    CALLING_STATION_ID = 31
    NAS_IDENTIFIER = 32
    PROXY_STATE = 33
    LOGIN_LAT_SERVICE = 34
    LOGIN_LAT_NODE = 35
    LOGIN_LAT_GROUP = 36
    FRAMED_APPLETALK_LINK = 37
    FRAMED_APPLETALK_NETWORK = 38
    FRAMED_APPLETALK_ZONE = 39
    ACCT_STATUS_TYPE = 40
    ACCT_DELAY_TIME = 41
    ACCT_INPUT_OCTETS = 42
    ACCT_OUTPUT_OCTETS = 43
    ACCT_SESSION_ID = 44
    ACCT_AUTHENTIC = 45
    ACCT_SESSION_TIME = 46
    ACCT_INPUT_PACKETS = 47
    ACCT_OUTPUT_PACKETS = 48
    ACCT_TERMINATE_CAUSE = 49
    ACCT_MULTI_SESSION_ID = 50
    ACCT_LINK_COUNT = 51
    CHAP_CHALLENGE = 60
    NAS_PORT_TYPE = 61
    PORT_LIMIT = 62
    LOGIN_LAT_PORT = 63


@dataclass
class RADIUSPacket:
    """RADIUS packet structure"""

    code: RADIUSCode
    identifier: int
    length: int
    authenticator: bytes
    attributes: Dict[int, bytes]

    def to_bytes(self, secret: str) -> bytes:
        """Convert packet to bytes"""
        # Build attributes
        attr_data = b""
        for attr_type, attr_value in self.attributes.items():
            attr_length = len(attr_value) + 2
            attr_data += struct.pack("!BB", attr_type, attr_length) + attr_value

        # Calculate total length
        total_length = 20 + len(attr_data)

        # Build packet header
        packet = struct.pack("!BBH16s", self.code.value, self.identifier, total_length, self.authenticator)

        # Add attributes
        packet += attr_data

        # Calculate response authenticator if needed
        if self.code in [RADIUSCode.ACCESS_ACCEPT, RADIUSCode.ACCESS_REJECT, RADIUSCode.ACCESS_CHALLENGE]:
            # Response authenticator = MD5(Code + ID + Length + Request Auth + Attributes + Secret)
            hash_input = packet[:4] + self.authenticator + attr_data + secret.encode("utf-8")
            response_auth = hashlib.md5(hash_input).digest()
            packet = packet[:4] + response_auth + packet[20:]

        return packet

    @classmethod
    def from_bytes(cls, data: bytes, secret: Optional[str] = None) -> "RADIUSPacket":
        """Parse packet from bytes"""
        if len(data) < 20:
            raise ValueError("RADIUS packet too short")

        # Parse header
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

        return cls(
            code=RADIUSCode(code),
            identifier=identifier,
            length=length,
            authenticator=authenticator,
            attributes=attributes,
        )


@dataclass
class RADIUSMetrics:
    """RADIUS test metrics"""

    packets_sent: int = 0
    packets_received: int = 0
    access_accepts: int = 0
    access_rejects: int = 0
    access_challenges: int = 0
    timeouts: int = 0
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
        if self.packets_sent == 0:
            return 0.0
        return (self.access_accepts / self.packets_sent) * 100

    @property
    def error_rate(self) -> float:
        """Calculate error rate percentage"""
        if self.packets_sent == 0:
            return 0.0
        return ((self.access_rejects + self.errors) / self.packets_sent) * 100

    @property
    def timeout_rate(self) -> float:
        """Calculate timeout rate percentage"""
        if self.packets_sent == 0:
            return 0.0
        return (self.timeouts / self.packets_sent) * 100

    @property
    def avg_latency_ms(self) -> float:
        """Calculate average latency"""
        if not self.latencies:
            return 0.0
        return sum(self.latencies) / len(self.latencies)

    @property
    def p95_latency_ms(self) -> float:
        """Calculate 95th percentile latency"""
        if not self.latencies:
            return 0.0
        sorted_latencies = sorted(self.latencies)
        index = int(0.95 * len(sorted_latencies))
        return sorted_latencies[min(index, len(sorted_latencies) - 1)]

    @property
    def p99_latency_ms(self) -> float:
        """Calculate 99th percentile latency"""
        if not self.latencies:
            return 0.0
        sorted_latencies = sorted(self.latencies)
        index = int(0.99 * len(sorted_latencies))
        return sorted_latencies[min(index, len(sorted_latencies) - 1)]


class RADIUSGenerator:
    """RADIUS packet generator for load testing"""

    def __init__(
        self,
        server_host: str,
        server_port: int,
        secret: str,
        nas_ip: str = "192.168.1.100",
        nas_identifier: str = "RadiusForge-NAS",
    ):
        self.server_host = server_host
        self.server_port = server_port
        self.secret = secret
        self.nas_ip = nas_ip
        self.nas_identifier = nas_identifier

        # State tracking
        self.metrics = RADIUSMetrics()
        self.active_sessions: Dict[str, Dict] = {}
        self.socket_pool: List[socket.socket] = []
        self.identifier_counter = 0
        self.is_running = False

        # Callbacks
        self.on_packet_sent: Optional[Callable] = None
        self.on_packet_received: Optional[Callable] = None
        self.on_metrics_update: Optional[Callable] = None

    def get_next_identifier(self) -> int:
        """Get next packet identifier"""
        self.identifier_counter = (self.identifier_counter + 1) % 256
        return self.identifier_counter

    def create_request_authenticator(self) -> bytes:
        """Create request authenticator (16 random bytes)"""
        return secrets.token_bytes(16)

    def encode_password(self, password: str, authenticator: bytes) -> bytes:
        """Encode password using RADIUS PAP method"""
        # Pad password to multiple of 16 bytes
        padded_password = password.encode("utf-8")
        while len(padded_password) % 16 != 0:
            padded_password += b"\x00"

        # XOR with MD5(secret + authenticator)
        encoded = b""
        hash_input = self.secret.encode("utf-8") + authenticator

        for i in range(0, len(padded_password), 16):
            hash_value = hashlib.md5(hash_input).digest()
            chunk = padded_password[i : i + 16]
            encoded_chunk = bytes(a ^ b for a, b in zip(chunk, hash_value))
            encoded += encoded_chunk
            hash_input = self.secret.encode("utf-8") + encoded_chunk

        return encoded

    def create_access_request(self, username: str, password: str, nas_port: int = 1) -> RADIUSPacket:
        """Create Access-Request packet"""
        identifier = self.get_next_identifier()
        authenticator = self.create_request_authenticator()

        # Encode password
        encoded_password = self.encode_password(password, authenticator)

        # Build attributes
        attributes = {
            RADIUSAttribute.USER_NAME.value: username.encode("utf-8"),
            RADIUSAttribute.USER_PASSWORD.value: encoded_password,
            RADIUSAttribute.NAS_IP_ADDRESS.value: socket.inet_aton(self.nas_ip),
            RADIUSAttribute.NAS_PORT.value: struct.pack("!I", nas_port),
            RADIUSAttribute.NAS_IDENTIFIER.value: self.nas_identifier.encode("utf-8"),
            RADIUSAttribute.SERVICE_TYPE.value: struct.pack("!I", 2),  # Framed-User
            RADIUSAttribute.NAS_PORT_TYPE.value: struct.pack("!I", 15),  # Ethernet
        }

        return RADIUSPacket(
            code=RADIUSCode.ACCESS_REQUEST,
            identifier=identifier,
            length=0,  # Will be calculated in to_bytes()
            authenticator=authenticator,
            attributes=attributes,
        )

    def create_accounting_request(
        self, username: str, session_id: str, status_type: int, nas_port: int = 1
    ) -> RADIUSPacket:
        """Create Accounting-Request packet"""
        identifier = self.get_next_identifier()
        authenticator = self.create_request_authenticator()

        # Build attributes
        attributes = {
            RADIUSAttribute.USER_NAME.value: username.encode("utf-8"),
            RADIUSAttribute.ACCT_STATUS_TYPE.value: struct.pack("!I", status_type),
            RADIUSAttribute.ACCT_SESSION_ID.value: session_id.encode("utf-8"),
            RADIUSAttribute.NAS_IP_ADDRESS.value: socket.inet_aton(self.nas_ip),
            RADIUSAttribute.NAS_PORT.value: struct.pack("!I", nas_port),
            RADIUSAttribute.NAS_IDENTIFIER.value: self.nas_identifier.encode("utf-8"),
        }

        # Add session data for interim/stop packets
        if status_type in [3, 2]:  # Interim-Update or Stop
            session = self.active_sessions.get(session_id, {})
            attributes[RADIUSAttribute.ACCT_SESSION_TIME.value] = struct.pack("!I", session.get("duration", 0))
            attributes[RADIUSAttribute.ACCT_INPUT_OCTETS.value] = struct.pack("!I", session.get("input_octets", 0))
            attributes[RADIUSAttribute.ACCT_OUTPUT_OCTETS.value] = struct.pack("!I", session.get("output_octets", 0))
            attributes[RADIUSAttribute.ACCT_INPUT_PACKETS.value] = struct.pack("!I", session.get("input_packets", 0))
            attributes[RADIUSAttribute.ACCT_OUTPUT_PACKETS.value] = struct.pack("!I", session.get("output_packets", 0))

            if status_type == 2:  # Stop
                attributes[RADIUSAttribute.ACCT_TERMINATE_CAUSE.value] = struct.pack("!I", 1)  # User-Request

        return RADIUSPacket(
            code=RADIUSCode.ACCOUNTING_REQUEST,
            identifier=identifier,
            length=0,
            authenticator=authenticator,
            attributes=attributes,
        )

    async def create_socket(self) -> socket.socket:
        """Create UDP socket for RADIUS communication"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(5.0)  # 5 second timeout
        return sock

    async def send_packet(self, packet: RADIUSPacket, sock: Optional[socket.socket] = None) -> Optional[RADIUSPacket]:
        """Send RADIUS packet and wait for response"""
        if sock is None:
            sock = await self.create_socket()
            should_close = True
        else:
            should_close = False

        try:
            # Convert packet to bytes
            packet_data = packet.to_bytes(self.secret)

            # Send packet
            start_time = time.time()
            sock.sendto(packet_data, (self.server_host, self.server_port))
            self.metrics.packets_sent += 1

            if self.on_packet_sent:
                await self.on_packet_sent(packet)

            # Wait for response
            try:
                response_data, addr = sock.recvfrom(4096)
                end_time = time.time()
                latency_ms = (end_time - start_time) * 1000

                # Parse response
                response = RADIUSPacket.from_bytes(response_data, self.secret)

                # Update metrics
                self.metrics.packets_received += 1
                self.metrics.latencies.append(latency_ms)
                self.metrics.total_latency_ms += latency_ms
                self.metrics.min_latency_ms = min(self.metrics.min_latency_ms, latency_ms)
                self.metrics.max_latency_ms = max(self.metrics.max_latency_ms, latency_ms)

                if response.code == RADIUSCode.ACCESS_ACCEPT:
                    self.metrics.access_accepts += 1
                elif response.code == RADIUSCode.ACCESS_REJECT:
                    self.metrics.access_rejects += 1
                elif response.code == RADIUSCode.ACCESS_CHALLENGE:
                    self.metrics.access_challenges += 1

                if self.on_packet_received:
                    await self.on_packet_received(response, latency_ms)

                return response

            except socket.timeout:
                self.metrics.timeouts += 1
                logger.warning(f"RADIUS packet timeout for identifier {packet.identifier}")
                return None

        except Exception as e:
            self.metrics.errors += 1
            logger.error(f"RADIUS packet send error: {e}")
            return None

        finally:
            if should_close and sock:
                sock.close()

    async def authenticate_user(self, username: str, password: str, nas_port: int = 1) -> bool:
        """Authenticate a single user"""
        packet = self.create_access_request(username, password, nas_port)
        response = await self.send_packet(packet)

        if response and response.code == RADIUSCode.ACCESS_ACCEPT:
            return True
        return False

    async def start_session(self, username: str, session_id: str, nas_port: int = 1) -> bool:
        """Start accounting session"""
        packet = self.create_accounting_request(username, session_id, 1, nas_port)  # Start
        response = await self.send_packet(packet)

        if response and response.code == RADIUSCode.ACCOUNTING_RESPONSE:
            self.active_sessions[session_id] = {
                "username": username,
                "start_time": time.time(),
                "nas_port": nas_port,
                "input_octets": 0,
                "output_octets": 0,
                "input_packets": 0,
                "output_packets": 0,
            }
            return True
        return False

    async def stop_session(self, session_id: str) -> bool:
        """Stop accounting session"""
        if session_id not in self.active_sessions:
            return False

        session = self.active_sessions[session_id]
        session["duration"] = int(time.time() - session["start_time"])

        packet = self.create_accounting_request(session["username"], session_id, 2)  # Stop
        response = await self.send_packet(packet)

        if response and response.code == RADIUSCode.ACCOUNTING_RESPONSE:
            del self.active_sessions[session_id]
            return True
        return False

    async def run_load_test(
        self,
        target_rps: int,
        duration_seconds: int,
        username_pattern: str = "user{:06d}",
        password: str = "password",
        ramp_up_seconds: int = 30,
    ) -> RADIUSMetrics:
        """Run load test with specified RPS"""
        self.is_running = True
        self.metrics = RADIUSMetrics()

        logger.info(f"Starting RADIUS load test: {target_rps} RPS for {duration_seconds}s")

        try:
            start_time = time.time()
            user_counter = 0

            while self.is_running and (time.time() - start_time) < duration_seconds:
                loop_start = time.time()
                elapsed = time.time() - start_time

                # Calculate current RPS (ramp up)
                if elapsed < ramp_up_seconds:
                    current_rps = int(target_rps * (elapsed / ramp_up_seconds))
                else:
                    current_rps = target_rps

                if current_rps > 0:
                    # Calculate delay between packets
                    packet_delay = 1.0 / current_rps

                    # Send authentication requests
                    for _ in range(min(current_rps, 100)):  # Limit burst size
                        if not self.is_running:
                            break

                        user_counter += 1
                        username = username_pattern.format(user_counter)

                        # Send packet asynchronously
                        asyncio.create_task(self.authenticate_user(username, password, user_counter % 1000))

                        # Rate limiting
                        await asyncio.sleep(packet_delay / 100)  # Distribute within the second

                # Metrics callback
                if self.on_metrics_update:
                    await self.on_metrics_update(self.metrics)

                # Wait for next second
                loop_duration = time.time() - loop_start
                if loop_duration < 1.0:
                    await asyncio.sleep(1.0 - loop_duration)

            # Wait for remaining responses
            await asyncio.sleep(5)

        except Exception as e:
            logger.error(f"Load test error: {e}")

        finally:
            self.is_running = False

        logger.info(
            f"Load test completed. Sent: {self.metrics.packets_sent}, "
            f"Received: {self.metrics.packets_received}, "
            f"Success rate: {self.metrics.success_rate:.1f}%"
        )

        return self.metrics

    def stop_test(self):
        """Stop running test"""
        self.is_running = False

    def get_metrics(self) -> dict:
        """Get current metrics as dictionary"""
        return {
            "packets_sent": self.metrics.packets_sent,
            "packets_received": self.metrics.packets_received,
            "access_accepts": self.metrics.access_accepts,
            "access_rejects": self.metrics.access_rejects,
            "access_challenges": self.metrics.access_challenges,
            "timeouts": self.metrics.timeouts,
            "errors": self.metrics.errors,
            "success_rate": self.metrics.success_rate,
            "error_rate": self.metrics.error_rate,
            "timeout_rate": self.metrics.timeout_rate,
            "avg_latency_ms": self.metrics.avg_latency_ms,
            "min_latency_ms": self.metrics.min_latency_ms if self.metrics.min_latency_ms != float("inf") else 0,
            "max_latency_ms": self.metrics.max_latency_ms,
            "p95_latency_ms": self.metrics.p95_latency_ms,
            "p99_latency_ms": self.metrics.p99_latency_ms,
            "active_sessions": len(self.active_sessions),
        }
