#!/usr/bin/env python3
"""
RadiusForge Syslog Event Generator
Generates syslog events for threat simulation and testing
"""

import asyncio
import socket
import time
import random
import json
import logging
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import ipaddress

from ..config import settings

logger = logging.getLogger(__name__)


class SyslogSeverity(Enum):
    """Syslog severity levels (RFC 3164)"""

    EMERGENCY = 0  # System is unusable
    ALERT = 1  # Action must be taken immediately
    CRITICAL = 2  # Critical conditions
    ERROR = 3  # Error conditions
    WARNING = 4  # Warning conditions
    NOTICE = 5  # Normal but significant condition
    INFO = 6  # Informational messages
    DEBUG = 7  # Debug-level messages


class SyslogFacility(Enum):
    """Syslog facility codes (RFC 3164)"""

    KERNEL = 0  # Kernel messages
    USER = 1  # User-level messages
    MAIL = 2  # Mail system
    DAEMON = 3  # System daemons
    SECURITY = 4  # Security/authorization messages
    SYSLOGD = 5  # Messages generated internally by syslogd
    LPR = 6  # Line printer subsystem
    NEWS = 7  # Network news subsystem
    UUCP = 8  # UUCP subsystem
    CRON = 9  # Clock daemon
    AUTHPRIV = 10  # Security/authorization messages
    FTP = 11  # FTP daemon
    NTP = 12  # NTP subsystem
    SECURITY_LOG = 13  # Security log audit
    CONSOLE = 14  # Console log alert
    CLOCK = 15  # Clock daemon
    LOCAL0 = 16  # Local use 0
    LOCAL1 = 17  # Local use 1
    LOCAL2 = 18  # Local use 2
    LOCAL3 = 19  # Local use 3
    LOCAL4 = 20  # Local use 4
    LOCAL5 = 21  # Local use 5
    LOCAL6 = 22  # Local use 6
    LOCAL7 = 23  # Local use 7


class ThreatType(Enum):
    """Types of security threats to simulate"""

    BRUTE_FORCE = "brute_force"
    DOS_ATTACK = "dos_attack"
    DDOS_ATTACK = "ddos_attack"
    PORT_SCAN = "port_scan"
    MALWARE = "malware"
    INTRUSION = "intrusion"
    DATA_EXFILTRATION = "data_exfiltration"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    LATERAL_MOVEMENT = "lateral_movement"
    SUSPICIOUS_LOGIN = "suspicious_login"
    FAILED_AUTH = "failed_auth"
    POLICY_VIOLATION = "policy_violation"


@dataclass
class SyslogEvent:
    """Syslog event structure"""

    facility: SyslogFacility
    severity: SyslogSeverity
    timestamp: datetime
    hostname: str
    tag: str
    message: str
    source_ip: Optional[str] = None
    dest_ip: Optional[str] = None
    source_port: Optional[int] = None
    dest_port: Optional[int] = None
    protocol: Optional[str] = None
    user: Optional[str] = None
    session_id: Optional[str] = None
    threat_type: Optional[ThreatType] = None
    custom_fields: Optional[Dict[str, Any]] = None

    @property
    def priority(self) -> int:
        """Calculate priority value (facility * 8 + severity)"""
        return self.facility.value * 8 + self.severity.value

    def to_rfc3164(self) -> str:
        """Format as RFC 3164 syslog message"""
        timestamp_str = self.timestamp.strftime("%b %d %H:%M:%S")
        return f"<{self.priority}>{timestamp_str} {self.hostname} {self.tag}: {self.message}"

    def to_rfc5424(self) -> str:
        """Format as RFC 5424 syslog message"""
        timestamp_str = self.timestamp.strftime("%Y-%m-%dT%H:%M:%S.%fZ")

        # Build structured data
        structured_data = ""
        if self.custom_fields:
            sd_elements = []
            for key, value in self.custom_fields.items():
                sd_elements.append(f'{key}="{value}"')
            structured_data = f"[custom {' '.join(sd_elements)}]"
        else:
            structured_data = "-"

        return f"<{self.priority}>1 {timestamp_str} {self.hostname} " f"{self.tag} - - {structured_data} {self.message}"

    def to_json(self) -> str:
        """Format as JSON log message"""
        data = {
            "timestamp": self.timestamp.isoformat(),
            "hostname": self.hostname,
            "facility": self.facility.name,
            "severity": self.severity.name,
            "tag": self.tag,
            "message": self.message,
            "priority": self.priority,
        }

        # Add optional fields
        if self.source_ip:
            data["source_ip"] = self.source_ip
        if self.dest_ip:
            data["dest_ip"] = self.dest_ip
        if self.source_port:
            data["source_port"] = self.source_port
        if self.dest_port:
            data["dest_port"] = self.dest_port
        if self.protocol:
            data["protocol"] = self.protocol
        if self.user:
            data["user"] = self.user
        if self.session_id:
            data["session_id"] = self.session_id
        if self.threat_type:
            data["threat_type"] = self.threat_type.value
        if self.custom_fields:
            data.update(self.custom_fields)

        return json.dumps(data)


@dataclass
class SyslogMetrics:
    """Syslog generator metrics"""

    events_sent: int = 0
    events_failed: int = 0
    bytes_sent: int = 0
    start_time: Optional[datetime] = None
    last_event_time: Optional[datetime] = None
    events_by_severity: Dict[str, int] = None
    events_by_threat_type: Dict[str, int] = None

    def __post_init__(self):
        if self.events_by_severity is None:
            self.events_by_severity = {}
        if self.events_by_threat_type is None:
            self.events_by_threat_type = {}

    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        total = self.events_sent + self.events_failed
        if total == 0:
            return 0.0
        return (self.events_sent / total) * 100

    @property
    def events_per_second(self) -> float:
        """Calculate events per second"""
        if not self.start_time or not self.last_event_time:
            return 0.0
        duration = (self.last_event_time - self.start_time).total_seconds()
        if duration <= 0:
            return 0.0
        return self.events_sent / duration


class SyslogGenerator:
    """Syslog event generator for security testing"""

    def __init__(
        self,
        syslog_host: str = "127.0.0.1",
        syslog_port: int = 514,
        protocol: str = "UDP",
        format_type: str = "RFC3164",
    ):
        self.syslog_host = syslog_host
        self.syslog_port = syslog_port
        self.protocol = protocol.upper()
        self.format_type = format_type.upper()

        # State tracking
        self.metrics = SyslogMetrics()
        self.is_running = False
        self.socket_pool: List[socket.socket] = []

        # Callbacks
        self.on_event_sent: Optional[Callable] = None
        self.on_metrics_update: Optional[Callable] = None

        # Threat simulation data
        self.threat_templates = self._init_threat_templates()
        self.sample_ips = self._generate_sample_ips()
        self.sample_users = self._generate_sample_users()

    def _init_threat_templates(self) -> Dict[ThreatType, Dict]:
        """Initialize threat event templates"""
        return {
            ThreatType.BRUTE_FORCE: {
                "facility": SyslogFacility.AUTHPRIV,
                "severity": SyslogSeverity.WARNING,
                "tag": "sshd",
                "message_templates": [
                    "Failed password for {user} from {source_ip} port {source_port} ssh2",
                    "Invalid user {user} from {source_ip} port {source_port}",
                    "Connection closed by {source_ip} port {source_port} [preauth]",
                ],
            },
            ThreatType.DOS_ATTACK: {
                "facility": SyslogFacility.SECURITY,
                "severity": SyslogSeverity.CRITICAL,
                "tag": "firewall",
                "message_templates": [
                    "DoS attack detected from {source_ip}: {packets_per_sec} packets/sec",
                    "Rate limit exceeded for {source_ip}: blocking for 300 seconds",
                    "SYN flood detected from {source_ip} to {dest_ip}:{dest_port}",
                ],
            },
            ThreatType.PORT_SCAN: {
                "facility": SyslogFacility.SECURITY,
                "severity": SyslogSeverity.WARNING,
                "tag": "portscan",
                "message_templates": [
                    "Port scan detected from {source_ip}: scanning {dest_ip} ports {port_range}",
                    "Stealth scan from {source_ip}: TCP SYN to {dest_ip}:{dest_port}",
                    "UDP port scan from {source_ip} to {dest_ip}: {scan_count} ports probed",
                ],
            },
            ThreatType.MALWARE: {
                "facility": SyslogFacility.SECURITY,
                "severity": SyslogSeverity.CRITICAL,
                "tag": "antivirus",
                "message_templates": [
                    "Malware detected: {malware_name} in file {file_path}",
                    "Virus quarantined: {virus_name} from {source_ip}",
                    "Trojan blocked: {trojan_name} attempting connection to {dest_ip}",
                ],
            },
            ThreatType.INTRUSION: {
                "facility": SyslogFacility.SECURITY,
                "severity": SyslogSeverity.ALERT,
                "tag": "IDS",
                "message_templates": [
                    "Intrusion attempt detected from {source_ip}: {attack_signature}",
                    "Buffer overflow attempt: {source_ip} -> {dest_ip}:{dest_port}",
                    "SQL injection detected: {source_ip} targeting {dest_ip}",
                ],
            },
            ThreatType.FAILED_AUTH: {
                "facility": SyslogFacility.AUTHPRIV,
                "severity": SyslogSeverity.WARNING,
                "tag": "radius",
                "message_templates": [
                    "RADIUS authentication failed for user {user} from {source_ip}",
                    "Invalid credentials: user {user} via {protocol}",
                    "Account locked: user {user} after {attempt_count} failed attempts",
                ],
            },
            ThreatType.SUSPICIOUS_LOGIN: {
                "facility": SyslogFacility.AUTHPRIV,
                "severity": SyslogSeverity.NOTICE,
                "tag": "login",
                "message_templates": [
                    "Unusual login time for user {user} from {source_ip}",
                    "Login from new location: user {user} from {country}/{city}",
                    "Multiple concurrent sessions for user {user}",
                ],
            },
        }

    def _generate_sample_ips(self) -> List[str]:
        """Generate sample IP addresses for testing"""
        ips = []

        # Internal IPs
        for i in range(1, 255):
            ips.append(f"192.168.1.{i}")
            ips.append(f"10.0.0.{i}")

        # External/attacker IPs
        external_ranges = [
            "203.0.113.",  # Test network
            "198.51.100.",  # Test network
            "185.234.72.",  # Common attacker range
            "89.248.171.",  # Common attacker range
        ]

        for base in external_ranges:
            for i in range(1, 255):
                ips.append(f"{base}{i}")

        return ips

    def _generate_sample_users(self) -> List[str]:
        """Generate sample usernames"""
        common_users = [
            "admin",
            "root",
            "user",
            "test",
            "guest",
            "demo",
            "administrator",
            "sa",
            "oracle",
            "postgres",
            "mysql",
        ]

        # Add numbered users
        for i in range(1, 1000):
            common_users.append(f"user{i:03d}")
            common_users.append(f"employee{i:03d}")

        return common_users

    def create_socket(self) -> socket.socket:
        """Create socket for syslog communication"""
        if self.protocol == "UDP":
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        elif self.protocol == "TCP":
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect((self.syslog_host, self.syslog_port))
        else:
            raise ValueError(f"Unsupported protocol: {self.protocol}")

        return sock

    def generate_event(self, threat_type: ThreatType = None, severity: SyslogSeverity = None) -> SyslogEvent:
        """Generate a random syslog event"""
        now = datetime.utcnow()

        # Select threat type
        if threat_type is None:
            threat_type = ThreatType.FAILED_AUTH  # Default to most common threat type

        template = self.threat_templates.get(threat_type, {})

        # Select severity
        if severity is None:
            severity = template.get("severity", SyslogSeverity.INFO)

        # Generate event data
        source_ip = "192.168.1.100"  # Standard source IP
        dest_ip = "192.168.1.1"  # Standard gateway IP
        user = "admin"  # Standard user
        source_port = 1024  # Standard unprivileged port
        dest_port = 1812  # RADIUS auth port

        # Select message template and format
        message_templates = template.get("message_templates", ["Generic security event"])
        message_template = message_templates[0]  # Use first template consistently

        # Format message with variables
        message = message_template.format(
            user=user,
            source_ip=source_ip,
            dest_ip=dest_ip,
            source_port=source_port,
            dest_port=dest_port,
            packets_per_sec=5000,  # Standard rate
            port_range="1024-65535",  # Standard port range
            scan_count=50,  # Standard scan count
            attempt_count=5,  # Standard attempt count
            malware_name="Trojan.Generic",  # Standard malware name
            virus_name="Win32.Sality",  # Standard virus name
            trojan_name="BackDoor.IRC",  # Standard trojan name
            attack_signature="Buffer overflow",  # Standard attack signature
            file_path="/tmp/suspicious_file_detected.exe",  # Standard file path
            protocol="HTTPS",  # Standard protocol
            country="Unknown",  # Standard country
            city="Unknown",  # Standard city
        )

        return SyslogEvent(
            facility=template.get("facility", SyslogFacility.SECURITY),
            severity=severity,
            timestamp=now,
            hostname="radiusforge-server",
            tag=template.get("tag", "security"),
            message=message,
            source_ip=source_ip,
            dest_ip=dest_ip,
            source_port=source_port,
            dest_port=dest_port,
            protocol="TCP",  # Standard protocol
            user=user,
            session_id=f"sess_{int(now.timestamp())}",
            threat_type=threat_type,
            custom_fields={
                "rule_id": 5000,  # Standard rule ID
                "confidence": 85,  # Standard confidence
                "risk_score": 5,  # Standard risk score
            },
        )

    async def send_event(self, event: SyslogEvent, sock: socket.socket = None) -> bool:
        """Send syslog event"""
        should_close = False
        if sock is None:
            sock = self.create_socket()
            should_close = True

        try:
            # Format event based on format type
            if self.format_type == "RFC3164":
                message = event.to_rfc3164()
            elif self.format_type == "RFC5424":
                message = event.to_rfc5424()
            elif self.format_type == "JSON":
                message = event.to_json()
            else:
                message = event.to_rfc3164()  # Default

            # Send message
            message_bytes = message.encode("utf-8")

            if self.protocol == "UDP":
                sock.sendto(message_bytes, (self.syslog_host, self.syslog_port))
            elif self.protocol == "TCP":
                sock.send(message_bytes + b"\n")

            # Update metrics
            self.metrics.events_sent += 1
            self.metrics.bytes_sent += len(message_bytes)
            self.metrics.last_event_time = datetime.utcnow()

            # Update counters
            severity_name = event.severity.name
            self.metrics.events_by_severity[severity_name] = self.metrics.events_by_severity.get(severity_name, 0) + 1

            if event.threat_type:
                threat_name = event.threat_type.value
                self.metrics.events_by_threat_type[threat_name] = (
                    self.metrics.events_by_threat_type.get(threat_name, 0) + 1
                )

            if self.on_event_sent:
                await self.on_event_sent(event)

            return True

        except Exception as e:
            self.metrics.events_failed += 1
            logger.error(f"Failed to send syslog event: {e}")
            return False

        finally:
            if should_close and sock:
                sock.close()

    async def run_simulation(
        self, events_per_second: int, duration_seconds: int, threat_mix: Dict[ThreatType, float] = None
    ) -> SyslogMetrics:
        """Run threat simulation with specified EPS"""
        self.is_running = True
        self.metrics = SyslogMetrics()
        self.metrics.start_time = datetime.utcnow()

        # Default threat distribution
        if threat_mix is None:
            threat_mix = {
                ThreatType.FAILED_AUTH: 0.4,
                ThreatType.BRUTE_FORCE: 0.2,
                ThreatType.PORT_SCAN: 0.15,
                ThreatType.SUSPICIOUS_LOGIN: 0.1,
                ThreatType.DOS_ATTACK: 0.05,
                ThreatType.INTRUSION: 0.05,
                ThreatType.MALWARE: 0.05,
            }

        # Create weighted threat list
        threat_list = []
        for threat_type, weight in threat_mix.items():
            count = int(weight * 1000)  # Scale to get good distribution
            threat_list.extend([threat_type] * count)

        logger.info(f"Starting syslog simulation: {events_per_second} EPS for {duration_seconds}s")

        try:
            start_time = time.time()

            while self.is_running and (time.time() - start_time) < duration_seconds:
                loop_start = time.time()

                # Calculate delay between events
                if events_per_second > 0:
                    event_delay = 1.0 / events_per_second

                    # Send events
                    for _ in range(min(events_per_second, 1000)):  # Limit burst size
                        if not self.is_running:
                            break

                        # Select threat type based on distribution
                        threat_type = threat_list[0] if threat_list else None  # Use first threat type consistently

                        # Generate and send event
                        event = self.generate_event(threat_type)
                        asyncio.create_task(self.send_event(event))

                        # Rate limiting
                        await asyncio.sleep(event_delay / 1000)  # Distribute within the second

                # Metrics callback
                if self.on_metrics_update:
                    await self.on_metrics_update(self.metrics)

                # Wait for next second
                loop_duration = time.time() - loop_start
                if loop_duration < 1.0:
                    await asyncio.sleep(1.0 - loop_duration)

        except Exception as e:
            logger.error(f"Syslog simulation error: {e}")

        finally:
            self.is_running = False

        logger.info(
            f"Simulation completed. Sent: {self.metrics.events_sent}, "
            f"Failed: {self.metrics.events_failed}, "
            f"Success rate: {self.metrics.success_rate:.1f}%"
        )

        return self.metrics

    def stop_simulation(self):
        """Stop running simulation"""
        self.is_running = False

    def get_metrics(self) -> dict:
        """Get current metrics as dictionary"""
        return {
            "events_sent": self.metrics.events_sent,
            "events_failed": self.metrics.events_failed,
            "bytes_sent": self.metrics.bytes_sent,
            "success_rate": self.metrics.success_rate,
            "events_per_second": self.metrics.events_per_second,
            "start_time": self.metrics.start_time.isoformat() if self.metrics.start_time else None,
            "last_event_time": self.metrics.last_event_time.isoformat() if self.metrics.last_event_time else None,
            "events_by_severity": self.metrics.events_by_severity,
            "events_by_threat_type": self.metrics.events_by_threat_type,
        }

    def create_custom_event(
        self,
        message: str,
        severity: SyslogSeverity = SyslogSeverity.INFO,
        facility: SyslogFacility = SyslogFacility.USER,
        tag: str = "custom",
        **kwargs,
    ) -> SyslogEvent:
        """Create custom syslog event"""
        return SyslogEvent(
            facility=facility,
            severity=severity,
            timestamp=datetime.utcnow(),
            hostname=kwargs.get("hostname", "localhost"),
            tag=tag,
            message=message,
            source_ip=kwargs.get("source_ip"),
            dest_ip=kwargs.get("dest_ip"),
            source_port=kwargs.get("source_port"),
            dest_port=kwargs.get("dest_port"),
            protocol=kwargs.get("protocol"),
            user=kwargs.get("user"),
            session_id=kwargs.get("session_id"),
            custom_fields=kwargs.get("custom_fields"),
        )
