#!/usr/bin/env python3
"""
RadiusForge TACACS+ Client
TCP-based TACACS+ protocol implementation for AuthN/AuthZ/Acct
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

logger = logging.getLogger(__name__)


class TACACSType(Enum):
    """TACACS+ packet types"""

    AUTHENTICATION = 1
    AUTHORIZATION = 2
    ACCOUNTING = 3


class TACACSAction(Enum):
    """TACACS+ actions"""

    LOGIN = 1
    CHPASS = 2
    SENDPASS = 3
    SENDAUTH = 4


class TACACSPrivLevel(Enum):
    """TACACS+ privilege levels"""

    USER = 1
    ADMIN = 15


class TACACSService(Enum):
    """TACACS+ services"""

    NONE = 0
    LOGIN = 1
    ENABLE = 2
    PPP = 3
    ARAP = 4
    PT = 5
    RCMD = 6
    X25 = 7
    NASI = 8
    FWPROXY = 9


class TACACSStatus(Enum):
    """TACACS+ status codes"""

    PASS = 1
    FAIL = 2
    GETDATA = 3
    GETUSER = 4
    GETPASS = 5
    RESTART = 6
    ERROR = 7
    FOLLOW = 21


@dataclass
class TACACSPacket:
    """TACACS+ packet structure"""

    version: int = 0xC0  # TACACS+ version 1.0
    type: TACACSType = TACACSType.AUTHENTICATION
    seq_no: int = 1
    flags: int = 0
    session_id: int = 0
    length: int = 0
    body: bytes = b""

    def to_bytes(self, secret: str) -> bytes:
        """Convert packet to bytes with encryption"""
        header = struct.pack("!BBBBI", self.version, self.type.value, self.seq_no, self.flags, self.session_id)
        header += struct.pack("!I", len(self.body))

        encrypted_body = self._encrypt_body(self.body, secret) if secret else self.body

        return header + encrypted_body

    def _encrypt_body(self, body: bytes, secret: str) -> bytes:
        """Encrypt TACACS+ body using MD5-based encryption"""
        if not body or not secret:
            return body

        encrypted = bytearray()
        secret_bytes = secret.encode("utf-8")

        pad = self._generate_pad(secret_bytes, len(body))

        for i, byte in enumerate(body):
            encrypted.append(byte ^ pad[i])

        return bytes(encrypted)

    def _generate_pad(self, secret: bytes, length: int) -> bytes:
        """Generate encryption pad for TACACS+"""
        pad = bytearray()
        session_bytes = struct.pack("!I", self.session_id)
        version_bytes = struct.pack("!B", self.version)
        seq_bytes = struct.pack("!B", self.seq_no)

        i = 0
        while len(pad) < length:
            hash_input = secret + session_bytes + version_bytes + seq_bytes + struct.pack("!B", i)
            hash_result = hashlib.md5(hash_input).digest()
            pad.extend(hash_result)
            i += 1

        return bytes(pad[:length])

    @classmethod
    def from_bytes(cls, data: bytes, secret: Optional[str] = None) -> "TACACSPacket":
        """Parse TACACS+ packet from bytes"""
        if len(data) < 12:
            raise ValueError("TACACS+ packet too short")

        # Parse header
        version, type_val, seq_no, flags, session_id, length = struct.unpack("!BBBBII", data[:12])

        body = data[12 : 12 + length] if len(data) >= 12 + length else b""

        packet = cls(
            version=version,
            type=TACACSType(type_val),
            seq_no=seq_no,
            flags=flags,
            session_id=session_id,
            length=length,
            body=body,
        )

        if secret and body:
            packet.body = packet._encrypt_body(body, secret)  # XOR is symmetric

        return packet


@dataclass
class TACACSMetrics:
    """TACACS+ test metrics"""

    packets_sent: int = 0
    packets_received: int = 0
    auth_pass: int = 0
    auth_fail: int = 0
    auth_error: int = 0
    authz_pass: int = 0
    authz_fail: int = 0
    acct_success: int = 0
    acct_error: int = 0
    timeouts: int = 0
    connection_errors: int = 0
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
        total_responses = self.auth_pass + self.auth_fail + self.authz_pass + self.authz_fail + self.acct_success
        if total_responses == 0:
            return 0.0
        successful = self.auth_pass + self.authz_pass + self.acct_success
        return (successful / total_responses) * 100

    @property
    def error_rate(self) -> float:
        """Calculate error rate percentage"""
        if self.packets_sent == 0:
            return 0.0
        errors = self.auth_error + self.acct_error + self.connection_errors
        return (errors / self.packets_sent) * 100

    @property
    def avg_latency_ms(self) -> float:
        """Calculate average latency"""
        if not self.latencies:
            return 0.0
        return sum(self.latencies) / len(self.latencies)


class TacacsClient:
    """TACACS+ client for authentication, authorization, and accounting"""

    def __init__(self, server_host: str, server_port: int = 49, secret: str = "testing123", timeout: float = 5.0):
        self.server_host = server_host
        self.server_port = server_port
        self.secret = secret
        self.timeout = timeout

        # State tracking
        self.metrics = TACACSMetrics()
        self.session_counter = 0
        self.is_running = False

        # Callbacks
        self.on_packet_sent: Optional[Callable] = None
        self.on_packet_received: Optional[Callable] = None
        self.on_metrics_update: Optional[Callable] = None

    def get_next_session_id(self) -> int:
        """Get next session ID"""
        self.session_counter = (self.session_counter + 1) % 0xFFFFFFFF
        return self.session_counter

    async def create_connection(self) -> Tuple[asyncio.StreamReader, asyncio.StreamWriter]:
        """Create TCP connection to TACACS+ server"""
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(self.server_host, self.server_port), timeout=self.timeout
            )
            return reader, writer
        except Exception as e:
            self.metrics.connection_errors += 1
            logger.error(f"TACACS+ connection failed: {e}")
            raise

    async def send_packet(self, packet: TACACSPacket) -> Optional[TACACSPacket]:
        """Send TACACS+ packet and wait for response"""
        reader = None
        writer = None

        try:
            start_time = time.time()
            reader, writer = await self.create_connection()

            # Send packet
            packet_data = packet.to_bytes(self.secret)
            writer.write(packet_data)
            await writer.drain()

            self.metrics.packets_sent += 1

            if self.on_packet_sent:
                await self.on_packet_sent(packet)

            # Wait for response
            try:
                header_data = await asyncio.wait_for(reader.read(12), timeout=self.timeout)
                if len(header_data) < 12:
                    raise ValueError("Incomplete TACACS+ header")

                _, _, _, _, _, length = struct.unpack("!BBBBII", header_data)

                body_data = await asyncio.wait_for(reader.read(length), timeout=self.timeout)

                end_time = time.time()
                latency_ms = (end_time - start_time) * 1000

                # Parse response
                response_data = header_data + body_data
                response = TACACSPacket.from_bytes(response_data, self.secret)

                # Update metrics
                self.metrics.packets_received += 1
                if self.metrics.latencies is not None:
                    self.metrics.latencies.append(latency_ms)
                self.metrics.total_latency_ms += latency_ms
                self.metrics.min_latency_ms = min(self.metrics.min_latency_ms, latency_ms)
                self.metrics.max_latency_ms = max(self.metrics.max_latency_ms, latency_ms)

                if self.on_packet_received:
                    await self.on_packet_received(response, latency_ms)

                return response

            except asyncio.TimeoutError:
                self.metrics.timeouts += 1
                logger.warning(f"TACACS+ packet timeout for session {packet.session_id}")
                return None

        except Exception as e:
            self.metrics.connection_errors += 1
            logger.error(f"TACACS+ packet send error: {e}")
            return None

        finally:
            if writer:
                writer.close()
                await writer.wait_closed()

    def create_auth_start(self, username: str, password: str, session_id: int) -> TACACSPacket:
        """Create authentication start packet"""
        action = TACACSAction.LOGIN.value
        priv_lvl = TACACSPrivLevel.USER.value
        authen_type = 1  # ASCII
        service = TACACSService.LOGIN.value

        user_bytes = username.encode("utf-8")
        port_bytes = b"console"
        rem_addr_bytes = b"127.0.0.1"
        data_bytes = password.encode("utf-8")

        body = struct.pack("!BBBB", action, priv_lvl, authen_type, service)
        body += struct.pack("!BBBB", len(user_bytes), len(port_bytes), len(rem_addr_bytes), len(data_bytes))
        body += user_bytes + port_bytes + rem_addr_bytes + data_bytes

        return TACACSPacket(type=TACACSType.AUTHENTICATION, seq_no=1, session_id=session_id, body=body)

    def create_authz_request(self, username: str, session_id: int, command: str = "show version") -> TACACSPacket:
        """Create authorization request packet"""
        authen_method = 1  # TACACS+
        priv_lvl = TACACSPrivLevel.USER.value
        authen_type = 1  # ASCII
        service = TACACSService.RCMD.value

        user_bytes = username.encode("utf-8")
        port_bytes = b"console"
        rem_addr_bytes = b"127.0.0.1"

        args = [f"cmd={command}"]
        arg_data = b""
        arg_lengths = []

        for arg in args:
            arg_bytes = arg.encode("utf-8")
            arg_data += arg_bytes
            arg_lengths.append(len(arg_bytes))

        body = struct.pack("!BBBB", authen_method, priv_lvl, authen_type, service)
        body += struct.pack("!BBBB", len(user_bytes), len(port_bytes), len(rem_addr_bytes), len(args))

        for length in arg_lengths:
            body += struct.pack("!B", length)

        body += user_bytes + port_bytes + rem_addr_bytes + arg_data

        return TACACSPacket(type=TACACSType.AUTHORIZATION, seq_no=1, session_id=session_id, body=body)

    def create_acct_request(self, username: str, session_id: int, start: bool = True) -> TACACSPacket:
        """Create accounting request packet"""
        flags = 2 if start else 4  # Start or Stop
        authen_method = 1  # TACACS+
        priv_lvl = TACACSPrivLevel.USER.value
        authen_type = 1  # ASCII
        service = TACACSService.LOGIN.value

        user_bytes = username.encode("utf-8")
        port_bytes = b"console"
        rem_addr_bytes = b"127.0.0.1"

        args = ["start_time=1234567890"] if start else ["stop_time=1234567890", "elapsed_time=300"]
        arg_data = b""
        arg_lengths = []

        for arg in args:
            arg_bytes = arg.encode("utf-8")
            arg_data += arg_bytes
            arg_lengths.append(len(arg_bytes))

        body = struct.pack("!BBBB", flags, authen_method, priv_lvl, authen_type)
        body += struct.pack("!BBBB", service, len(user_bytes), len(port_bytes), len(rem_addr_bytes))
        body += struct.pack("!B", len(args))

        for length in arg_lengths:
            body += struct.pack("!B", length)

        body += user_bytes + port_bytes + rem_addr_bytes + arg_data

        return TACACSPacket(type=TACACSType.ACCOUNTING, seq_no=1, session_id=session_id, body=body)

    async def authenticate_user(self, username: str, password: str) -> bool:
        """Authenticate a single user"""
        session_id = self.get_next_session_id()
        packet = self.create_auth_start(username, password, session_id)
        response = await self.send_packet(packet)

        if response and response.body:
            if len(response.body) >= 6:
                status = response.body[0]
                if status == TACACSStatus.PASS.value:
                    self.metrics.auth_pass += 1
                    return True
                elif status == TACACSStatus.FAIL.value:
                    self.metrics.auth_fail += 1
                else:
                    self.metrics.auth_error += 1

        return False

    async def authorize_user(self, username: str, command: str = "show version") -> bool:
        """Authorize a user command"""
        session_id = self.get_next_session_id()
        packet = self.create_authz_request(username, session_id, command)
        response = await self.send_packet(packet)

        if response and response.body:
            if len(response.body) >= 6:
                status = response.body[0]
                if status == TACACSStatus.PASS.value:
                    self.metrics.authz_pass += 1
                    return True
                else:
                    self.metrics.authz_fail += 1

        return False

    async def account_session(self, username: str, start: bool = True) -> bool:
        """Send accounting record"""
        session_id = self.get_next_session_id()
        packet = self.create_acct_request(username, session_id, start)
        response = await self.send_packet(packet)

        if response and response.body:
            if len(response.body) >= 5:
                status = response.body[4]  # Status is at offset 4 in accounting response
                if status == TACACSStatus.PASS.value:
                    self.metrics.acct_success += 1
                    return True
                else:
                    self.metrics.acct_error += 1

        return False

    async def run_load_test(
        self,
        target_rps: int,
        duration_seconds: int,
        username_pattern: str = "user{:06d}",
        password: str = "password",
        test_type: str = "auth",
    ) -> TACACSMetrics:
        """Run TACACS+ load test"""
        self.is_running = True
        self.metrics = TACACSMetrics()

        logger.info(f"Starting TACACS+ load test: {target_rps} RPS for {duration_seconds}s")

        try:
            start_time = time.time()
            user_counter = 0

            while self.is_running and (time.time() - start_time) < duration_seconds:
                loop_start = time.time()

                # Calculate delay between packets
                if target_rps > 0:
                    packet_delay = 1.0 / target_rps

                    for _ in range(min(target_rps, 50)):  # Limit burst size
                        if not self.is_running:
                            break

                        user_counter += 1
                        username = username_pattern.format(user_counter)

                        if test_type == "auth":
                            await self.authenticate_user(username, password)
                        elif test_type == "authz":
                            await self.authorize_user(username)
                        elif test_type == "acct":
                            await self.account_session(username, True)

                        # Rate limiting
                        await asyncio.sleep(packet_delay)

                if self.on_metrics_update:
                    await self.on_metrics_update(self.metrics)

                loop_time = time.time() - loop_start
                if loop_time < 1.0:
                    await asyncio.sleep(1.0 - loop_time)

            return self.metrics

        except Exception as e:
            logger.error(f"TACACS+ load test error: {e}")
            return self.metrics
        finally:
            self.is_running = False

    def stop_test(self):
        """Stop running test"""
        self.is_running = False

    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics as dictionary"""
        return {
            "packets_sent": self.metrics.packets_sent,
            "packets_received": self.metrics.packets_received,
            "auth_pass": self.metrics.auth_pass,
            "auth_fail": self.metrics.auth_fail,
            "auth_error": self.metrics.auth_error,
            "authz_pass": self.metrics.authz_pass,
            "authz_fail": self.metrics.authz_fail,
            "acct_success": self.metrics.acct_success,
            "acct_error": self.metrics.acct_error,
            "timeouts": self.metrics.timeouts,
            "connection_errors": self.metrics.connection_errors,
            "success_rate": self.metrics.success_rate,
            "error_rate": self.metrics.error_rate,
            "avg_latency_ms": self.metrics.avg_latency_ms,
            "min_latency_ms": self.metrics.min_latency_ms if self.metrics.min_latency_ms != float("inf") else 0.0,
            "max_latency_ms": self.metrics.max_latency_ms,
            "total_latency_ms": self.metrics.total_latency_ms,
        }
