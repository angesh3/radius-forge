#!/usr/bin/env python3
"""
RadiusForge Connectivity Probes
UDP/TCP L4 connectivity testing with timeouts and classification
"""

import asyncio
import socket
import time
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import ipaddress

logger = logging.getLogger(__name__)


class ProbeResult(Enum):
    """Connectivity probe results"""

    SUCCESS = "success"
    TIMEOUT = "timeout"
    UNREACHABLE = "unreachable"
    DNS_FAILURE = "dns_failure"
    CONNECTION_REFUSED = "connection_refused"
    NETWORK_ERROR = "network_error"


class ProbeType(Enum):
    """Types of connectivity probes"""

    UDP = "udp"
    TCP = "tcp"
    ICMP = "icmp"


@dataclass
class ProbeMetrics:
    """Connectivity probe metrics"""

    total_probes: int = 0
    successful_probes: int = 0
    failed_probes: int = 0
    timeouts: int = 0
    dns_failures: int = 0
    connection_refused: int = 0
    network_errors: int = 0
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
        if self.total_probes == 0:
            return 0.0
        return (self.successful_probes / self.total_probes) * 100

    @property
    def avg_latency_ms(self) -> float:
        """Calculate average latency"""
        if not self.latencies:
            return 0.0
        return sum(self.latencies) / len(self.latencies)


@dataclass
class ProbeTarget:
    """Target for connectivity probe"""

    host: str
    port: int
    protocol: ProbeType
    timeout: float = 5.0
    description: Optional[str] = None


@dataclass
class ProbeResponse:
    """Response from connectivity probe"""

    target: ProbeTarget
    result: ProbeResult
    latency_ms: float
    error_message: Optional[str] = None
    resolved_ip: Optional[str] = None


class ConnectivityProbe:
    """Connectivity probe for network reachability testing"""

    def __init__(self, default_timeout: float = 5.0):
        self.default_timeout = default_timeout
        self.metrics = ProbeMetrics()

    async def resolve_hostname(self, hostname: str, timeout: float = 5.0) -> Optional[str]:
        """Resolve hostname to IP address"""
        try:
            try:
                ipaddress.ip_address(hostname)
                return hostname  # Already an IP
            except ValueError:
                pass  # Not an IP, continue with DNS resolution

            loop = asyncio.get_event_loop()
            result = await asyncio.wait_for(loop.getaddrinfo(hostname, None, family=socket.AF_INET), timeout=timeout)

            if result:
                return result[0][4][0]  # First IPv4 address

            return None

        except asyncio.TimeoutError:
            logger.warning(f"DNS resolution timeout for {hostname}")
            return None
        except Exception as e:
            logger.error(f"DNS resolution error for {hostname}: {e}")
            return None

    async def probe_tcp(self, target: ProbeTarget) -> ProbeResponse:
        """Probe TCP connectivity"""
        start_time = time.time()

        try:
            resolved_ip = await self.resolve_hostname(target.host, target.timeout)
            if not resolved_ip:
                return ProbeResponse(
                    target=target,
                    result=ProbeResult.DNS_FAILURE,
                    latency_ms=0.0,
                    error_message=f"Failed to resolve {target.host}",
                )

            try:
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(resolved_ip, target.port), timeout=target.timeout
                )

                writer.close()
                await writer.wait_closed()

                end_time = time.time()
                latency_ms = (end_time - start_time) * 1000

                return ProbeResponse(
                    target=target, result=ProbeResult.SUCCESS, latency_ms=latency_ms, resolved_ip=resolved_ip
                )

            except asyncio.TimeoutError:
                return ProbeResponse(
                    target=target,
                    result=ProbeResult.TIMEOUT,
                    latency_ms=target.timeout * 1000,
                    error_message="Connection timeout",
                    resolved_ip=resolved_ip,
                )
            except ConnectionRefusedError:
                end_time = time.time()
                latency_ms = (end_time - start_time) * 1000
                return ProbeResponse(
                    target=target,
                    result=ProbeResult.CONNECTION_REFUSED,
                    latency_ms=latency_ms,
                    error_message="Connection refused",
                    resolved_ip=resolved_ip,
                )
            except OSError as e:
                end_time = time.time()
                latency_ms = (end_time - start_time) * 1000
                return ProbeResponse(
                    target=target,
                    result=ProbeResult.UNREACHABLE,
                    latency_ms=latency_ms,
                    error_message=str(e),
                    resolved_ip=resolved_ip,
                )

        except Exception as e:
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            return ProbeResponse(
                target=target, result=ProbeResult.NETWORK_ERROR, latency_ms=latency_ms, error_message=str(e)
            )

    async def probe_udp(self, target: ProbeTarget) -> ProbeResponse:
        """Probe UDP connectivity"""
        start_time = time.time()

        try:
            resolved_ip = await self.resolve_hostname(target.host, target.timeout)
            if not resolved_ip:
                return ProbeResponse(
                    target=target,
                    result=ProbeResult.DNS_FAILURE,
                    latency_ms=0.0,
                    error_message=f"Failed to resolve {target.host}",
                )

            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(target.timeout)

            try:
                probe_data = b"RadiusForge-Probe"
                sock.sendto(probe_data, (resolved_ip, target.port))

                try:
                    data, addr = sock.recvfrom(1024)
                    end_time = time.time()
                    latency_ms = (end_time - start_time) * 1000

                    return ProbeResponse(
                        target=target, result=ProbeResult.SUCCESS, latency_ms=latency_ms, resolved_ip=resolved_ip
                    )

                except socket.timeout:
                    end_time = time.time()
                    latency_ms = (end_time - start_time) * 1000

                    return ProbeResponse(
                        target=target,
                        result=ProbeResult.SUCCESS,  # UDP probe sent successfully
                        latency_ms=latency_ms,
                        error_message="UDP probe sent (no response expected)",
                        resolved_ip=resolved_ip,
                    )

            except OSError as e:
                end_time = time.time()
                latency_ms = (end_time - start_time) * 1000

                if "Network is unreachable" in str(e):
                    result = ProbeResult.UNREACHABLE
                else:
                    result = ProbeResult.NETWORK_ERROR

                return ProbeResponse(
                    target=target, result=result, latency_ms=latency_ms, error_message=str(e), resolved_ip=resolved_ip
                )
            finally:
                sock.close()

        except Exception as e:
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            return ProbeResponse(
                target=target, result=ProbeResult.NETWORK_ERROR, latency_ms=latency_ms, error_message=str(e)
            )

    async def probe_target(self, target: ProbeTarget) -> ProbeResponse:
        """Probe a single target"""
        self.metrics.total_probes += 1

        if target.protocol == ProbeType.TCP:
            response = await self.probe_tcp(target)
        elif target.protocol == ProbeType.UDP:
            response = await self.probe_udp(target)
        else:
            response = ProbeResponse(
                target=target,
                result=ProbeResult.NETWORK_ERROR,
                latency_ms=0.0,
                error_message=f"Unsupported protocol: {target.protocol}",
            )

        # Update metrics
        if response.result == ProbeResult.SUCCESS:
            self.metrics.successful_probes += 1
            if self.metrics.latencies is not None:
                self.metrics.latencies.append(response.latency_ms)
            self.metrics.total_latency_ms += response.latency_ms
            self.metrics.min_latency_ms = min(self.metrics.min_latency_ms, response.latency_ms)
            self.metrics.max_latency_ms = max(self.metrics.max_latency_ms, response.latency_ms)
        else:
            self.metrics.failed_probes += 1

            if response.result == ProbeResult.TIMEOUT:
                self.metrics.timeouts += 1
            elif response.result == ProbeResult.DNS_FAILURE:
                self.metrics.dns_failures += 1
            elif response.result == ProbeResult.CONNECTION_REFUSED:
                self.metrics.connection_refused += 1
            else:
                self.metrics.network_errors += 1

        return response

    async def probe_multiple(self, targets: List[ProbeTarget], concurrent: int = 10) -> List[ProbeResponse]:
        """Probe multiple targets concurrently"""
        semaphore = asyncio.Semaphore(concurrent)

        async def probe_with_semaphore(target):
            async with semaphore:
                return await self.probe_target(target)

        tasks = [probe_with_semaphore(target) for target in targets]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        valid_responses = []
        for response in responses:
            if isinstance(response, ProbeResponse):
                valid_responses.append(response)
            else:
                logger.error(f"Probe task failed: {response}")

        return valid_responses

    def create_radius_targets(
        self, hosts: List[str], auth_port: int = 1812, acct_port: int = 1813
    ) -> List[ProbeTarget]:
        """Create RADIUS probe targets"""
        targets = []
        for host in hosts:
            targets.extend(
                [
                    ProbeTarget(
                        host=host,
                        port=auth_port,
                        protocol=ProbeType.UDP,
                        timeout=self.default_timeout,
                        description=f"RADIUS Auth {host}:{auth_port}",
                    ),
                    ProbeTarget(
                        host=host,
                        port=acct_port,
                        protocol=ProbeType.UDP,
                        timeout=self.default_timeout,
                        description=f"RADIUS Acct {host}:{acct_port}",
                    ),
                ]
            )
        return targets

    def create_tacacs_targets(self, hosts: List[str], port: int = 49) -> List[ProbeTarget]:
        """Create TACACS+ probe targets"""
        targets = []
        for host in hosts:
            targets.append(
                ProbeTarget(
                    host=host,
                    port=port,
                    protocol=ProbeType.TCP,
                    timeout=self.default_timeout,
                    description=f"TACACS+ {host}:{port}",
                )
            )
        return targets

    def create_pxgrid_targets(self, hosts: List[str], port: int = 8910) -> List[ProbeTarget]:
        """Create pxGrid probe targets"""
        targets = []
        for host in hosts:
            targets.append(
                ProbeTarget(
                    host=host,
                    port=port,
                    protocol=ProbeType.TCP,
                    timeout=self.default_timeout,
                    description=f"pxGrid {host}:{port}",
                )
            )
        return targets

    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics as dictionary"""
        return {
            "total_probes": self.metrics.total_probes,
            "successful_probes": self.metrics.successful_probes,
            "failed_probes": self.metrics.failed_probes,
            "timeouts": self.metrics.timeouts,
            "dns_failures": self.metrics.dns_failures,
            "connection_refused": self.metrics.connection_refused,
            "network_errors": self.metrics.network_errors,
            "success_rate": self.metrics.success_rate,
            "avg_latency_ms": self.metrics.avg_latency_ms,
            "min_latency_ms": self.metrics.min_latency_ms if self.metrics.min_latency_ms != float("inf") else 0.0,
            "max_latency_ms": self.metrics.max_latency_ms,
            "total_latency_ms": self.metrics.total_latency_ms,
        }

    def reset_metrics(self):
        """Reset metrics counters"""
        self.metrics = ProbeMetrics()
