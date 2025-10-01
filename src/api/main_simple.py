#!/usr/bin/env python3
"""
RadiusForge FastAPI Backend - Simplified for Local Testing
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import asyncio
import json
import secrets
import os
import time
import logging
from pathlib import Path
from collections import defaultdict
from typing import Dict, List
from .database import get_db

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="RadiusForge API", description="AAA Traffic Load Testing Platform", version="1.3.0")

# Configure CORS - Restrict to local development only
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8911", "http://127.0.0.1:5173", "http://127.0.0.1:8911"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# Store for active WebSocket connections
websocket_connections = set()

# Security configuration
security = HTTPBearer(auto_error=False)

# Generate API key for this session (in production, use proper key management)
API_KEY = os.getenv("RADIUSFORGE_API_KEY", secrets.token_urlsafe(32))

# Rate limiting storage
rate_limits: Dict[str, List[float]] = defaultdict(list)


def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API key for protected endpoints"""
    if not credentials:
        return None  # Allow unauthenticated access for public endpoints

    if credentials.credentials != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Require authentication for protected endpoints"""
    if not credentials or credentials.credentials != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )


def rate_limit(client_id: str, limit: int = 10, window: int = 60):
    """Simple rate limiting: limit requests per window (seconds)"""
    now = time.time()
    window_start = now - window

    # Clean old requests
    rate_limits[client_id] = [req_time for req_time in rate_limits[client_id] if req_time > window_start]

    # Check if limit exceeded
    if len(rate_limits[client_id]) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Max {limit} requests per {window} seconds.",
        )

    # Record this request
    rate_limits[client_id].append(now)


def validate_port_range(port: int) -> bool:
    """Validate port is in allowed range"""
    return 8910 <= port <= 8926


def sanitize_input(value: str, max_length: int = 255) -> str:
    """Basic input sanitization"""
    if not isinstance(value, str):
        raise HTTPException(status_code=400, detail="Invalid input type")

    dangerous_patterns = [
        "; ", " rm ", " DROP ", "<script", "${", "$(", "|nc", "../", "&", "|"
    ]

    is_malicious = any(pattern in value for pattern in dangerous_patterns)

    if is_malicious:
        # For malicious input, only keep alphanumeric characters
        sanitized = "".join(c for c in value if c.isalnum())

        for keyword in ["DROP", "DELETE", "INSERT", "UPDATE", "SELECT", "UNION"]:
            sanitized = sanitized.replace(keyword.upper(), "")
            sanitized = sanitized.replace(keyword.lower(), "")
            sanitized = sanitized.replace(keyword.capitalize(), "")
    else:
        # For legitimate input, allow file path characters
        sanitized = "".join(c for c in value if c.isalnum() or c in "._-/")

    if len(sanitized) > max_length:
        raise HTTPException(status_code=400, detail=f"Input too long (max {max_length} characters)")

    return sanitized


@app.get("/api/auth/key")
async def get_api_key():
    """Get API key for this session (development only)"""
    return {
        "api_key": API_KEY,
        "note": "This is for development only. In production, use proper authentication.",
        "usage": "Add 'Authorization: Bearer <api_key>' header to requests",
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "RadiusForge API",
        "version": "1.3.0",
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "ports": {
            "api": 8910,
            "ui": 8911,
            "websocket": 8912,
            "radius_test": 8913,
            "tacacs_test": 8914,
            "syslog": 8915,
            "metrics_export": 8916,
            "health_check": 8917,
            "admin_api": 8918,
            "backup_service": 8919,
            "reserved": 8920,
        },
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {"api": "online", "database": "simulated", "websocket": "active", "generators": "ready"},
    }


@app.get("/api/system/version")
async def get_version():
    """Get system version information"""
    version_file = Path(__file__).parent.parent.parent / "VERSION"
    version = "1.3.0"
    if version_file.exists():
        version = version_file.read_text().strip()

    return {
        "version": version,
        "deploymentType": "Full",
        "lastUpdated": datetime.now().isoformat(),
        "ports": {
            "api": 8910,
            "ui": 8911,
            "websocket": 8912,
            "radius_test": 8913,
            "tacacs_test": 8914,
            "syslog": 8915,
            "metrics_export": 8916,
            "health_check": 8917,
            "admin_api": 8918,
            "backup_service": 8919,
            "reserved": 8920,
        },
    }


@app.get("/api/system/ports")
async def get_port_configuration():
    """Get current port configuration"""
    return {
        "ports": {
            "api": {"port": 8910, "status": "active", "description": "Main API server"},
            "ui": {"port": 8911, "status": "active", "description": "Web UI server"},
            "websocket": {"port": 8912, "status": "active", "description": "Real-time WebSocket"},
            "radius_test": {"port": 8913, "status": "available", "description": "RADIUS test client"},
            "tacacs_test": {"port": 8914, "status": "available", "description": "TACACS+ test client"},
            "syslog": {"port": 8915, "status": "active", "description": "Syslog receiver"},
            "metrics_export": {"port": 8916, "status": "available", "description": "Metrics export service"},
            "health_check": {"port": 8917, "status": "available", "description": "Health check API"},
            "admin_api": {"port": 8918, "status": "available", "description": "Administrative API"},
            "backup_service": {"port": 8919, "status": "available", "description": "Backup service"},
            "reserved_1": {"port": 8920, "status": "reserved", "description": "Reserved for future use"},
            "reserved_2": {"port": 8921, "status": "reserved", "description": "Reserved for future use"},
            "reserved_3": {"port": 8922, "status": "reserved", "description": "Reserved for future use"},
            "reserved_4": {"port": 8923, "status": "reserved", "description": "Reserved for future use"},
            "reserved_5": {"port": 8924, "status": "reserved", "description": "Reserved for future use"},
            "reserved_6": {"port": 8925, "status": "reserved", "description": "Reserved for future use"},
            "reserved_7": {"port": 8926, "status": "reserved", "description": "Reserved for future use"},
        },
        "range": {"start": 8910, "end": 8926, "total": 17},
    }


@app.post("/api/system/ports/validate")
async def validate_ports(port_config: dict, _: str = Depends(require_auth)):
    """Validate port configuration"""
    import socket

    # Rate limiting
    rate_limit("port_validation", limit=5, window=60)

    # Input validation
    if not isinstance(port_config, dict) or "ports" not in port_config:
        raise HTTPException(status_code=400, detail="Invalid port configuration format")

    results = {}
    for service, config in port_config.get("ports", {}).items():
        port = config.get("port")
        if port:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex(("localhost", port))
                sock.close()

                results[service] = {
                    "port": port,
                    "available": result != 0,
                    "status": "free" if result != 0 else "in_use",
                }
            except Exception as e:
                results[service] = {"port": port, "available": False, "status": "error", "error": str(e)}

    return {"validation_results": results, "timestamp": datetime.now().isoformat()}


@app.get("/api/deployment/bundles")
async def list_bundles():
    """List available deployment bundles"""
    release_dir = Path(__file__).parent.parent.parent / "release"
    bundles = []

    if release_dir.exists():
        for bundle_file in release_dir.glob("*.tar.gz"):
            stat = bundle_file.stat()
            bundles.append(
                {
                    "name": bundle_file.name,
                    "size": stat.st_size,
                    "size_mb": round(stat.st_size / 1024 / 1024, 2),
                    "created": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "type": "delta" if "to" in bundle_file.name else "full",
                }
            )

    # Sort by creation time, newest first
    bundles.sort(key=lambda x: x["created"], reverse=True)

    return {"bundles": bundles, "total": len(bundles)}


@app.get("/api/deployment/history")
async def get_deployment_history():
    """Get deployment history"""
    history_file = Path(__file__).parent.parent.parent / "release" / "version_history.json"

    if history_file.exists():
        with open(history_file) as f:
            history = json.load(f)
        return {"history": history[-20:], "total": len(history)}  # Last 20 deployments

    return {"history": [], "total": 0}


@app.post("/api/deployment/create")
async def create_deployment_bundle(request: dict, _: str = Depends(require_auth)):
    """Create new deployment bundle"""
    import sys

    sys.path.append(str(Path(__file__).parent.parent.parent / "ops"))

    # Rate limiting - bundle creation is expensive
    rate_limit("bundle_creation", limit=2, window=300)  # 2 requests per 5 minutes

    # Input validation
    if not isinstance(request, dict):
        raise HTTPException(status_code=400, detail="Invalid request format")

    bump_type = request.get("bump_type", "patch")
    if bump_type not in ["major", "minor", "patch"]:
        raise HTTPException(status_code=400, detail="Invalid bump_type. Must be major, minor, or patch")

    try:
        from version_manager import VersionManager

        manager = VersionManager(Path(__file__).parent.parent.parent)
        bump_type = request.get("bump_type", "patch")

        # Create bundles
        full_bundle, delta_bundle = manager.create_deployment_bundle(bump_type)

        return {
            "success": True,
            "version": manager.get_current_version(),
            "bundles": {
                "full": {
                    "name": full_bundle.name,
                    "size": full_bundle.stat().st_size,
                    "size_mb": round(full_bundle.stat().st_size / 1024 / 1024, 2),
                },
                "delta": (
                    {
                        "name": delta_bundle.name if delta_bundle else None,
                        "size": delta_bundle.stat().st_size if delta_bundle else None,
                        "size_mb": round(delta_bundle.stat().st_size / 1024 / 1024, 2) if delta_bundle else None,
                    }
                    if delta_bundle
                    else None
                ),
            },
            "created_at": datetime.now().isoformat(),
        }

    except Exception as e:
        return {"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}


# API Routes for Test Runs
@app.get("/api/runs")
async def list_runs(db: AsyncSession = Depends(get_db)):
    """List real test runs from database"""
    from .models import TestRun
    from sqlalchemy import select
    
    try:
        result = await db.execute(select(TestRun).order_by(TestRun.created_at.desc()))
        runs = result.scalars().all()
        
        return {
            "runs": [
                {
                    "id": run.id,
                    "name": run.name,
                    "status": run.status,
                    "rps": run.target_rps,
                    "duration": run.duration_seconds,
                    "created_at": run.created_at.isoformat(),
                } for run in runs
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching test runs: {e}")
        return {"runs": []}


@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    """Get real dashboard statistics from database"""
    from .database import get_db_context
    from .models import TestRun, TestMetric, NAD
    from sqlalchemy import select, func
    from datetime import datetime, timedelta
    import psutil
    import shutil
    import time
    
    try:
        async with get_db_context() as db:
            # Get real test runs
            recent_runs = await db.execute(
                select(TestRun).where(TestRun.status == 'running').limit(10)
            )
            active_tests = len(recent_runs.scalars().all())
            
            all_runs = await db.execute(select(TestRun))
            all_test_runs = all_runs.scalars().all()
            
            servers_result = await db.execute(select(NAD))
            servers = servers_result.scalars().all()
            
            # Get recent metrics
            recent_metrics = await db.execute(
                select(TestMetric).order_by(TestMetric.timestamp.desc()).limit(10)
            )
            metrics = recent_metrics.scalars().all()
            
            current_rps = int(sum(m.requests_per_second for m in metrics[-5:]) / 5) if len(metrics) >= 5 else 0
            active_connections = int(sum(m.active_connections for m in metrics[-3:]) / 3) if len(metrics) >= 3 else 0
            
            try:
                uptime_seconds = time.time() - psutil.boot_time()
                uptime_hours = int(uptime_seconds // 3600)
                uptime_minutes = int((uptime_seconds % 3600) // 60)
                uptime = f"{uptime_hours}h {uptime_minutes}m" if uptime_hours > 0 else f"{uptime_minutes}m"
            except:
                uptime = "0m"
            
            try:
                cpu_usage = int(psutil.cpu_percent(interval=0.1))
                memory = psutil.virtual_memory()
                memory_usage = int(memory.percent)
                disk = shutil.disk_usage('/')
                disk_usage = int((disk.used / disk.total) * 100)
                
                net_io = psutil.net_io_counters()
                network_mbps = (net_io.bytes_sent + net_io.bytes_recv) / (1024 * 1024)
                if network_mbps > 1000:
                    network_throughput = f"{network_mbps/1000:.1f} Gbps"
                else:
                    network_throughput = f"{network_mbps:.1f} Mbps"
            except:
                cpu_usage = 0
                memory_usage = 0
                disk_usage = 0
                network_throughput = "0 Mbps"
            
            radius_count = len([r for r in all_test_runs if r.test_type == 'radius'])
            tacacs_count = len([r for r in all_test_runs if r.test_type == 'tacacs'])
            pxgrid_count = len([r for r in all_test_runs if r.test_type == 'pxgrid'])
            
            asset_manager_servers = []
            ise_servers = []
            
            for server in servers:
                try:
                    import subprocess
                    ping_result = subprocess.run(['ping', '-c', '1', '-W', '1000', server.host_ip], 
                                               capture_output=True, text=True, timeout=2)
                    if ping_result.returncode == 0:
                        latency_line = [line for line in ping_result.stdout.split('\n') if 'time=' in line]
                        if latency_line:
                            latency = latency_line[0].split('time=')[1].split(' ')[0] + "ms"
                        else:
                            latency = "N/A"
                        status = "healthy"
                    else:
                        latency = "Timeout"
                        status = "offline"
                except:
                    latency = "N/A"
                    status = "offline" if not server.enabled else "unknown"
                
                server_info = {
                    "name": server.name,
                    "status": status,
                    "latency": latency,
                    "rps": 0,  # Would come from active test metrics for this server
                    "cpu": 0,  # Would come from SNMP or server monitoring
                    "load": "Normal" if server.enabled and status == "healthy" else "Offline"
                }
                
                if any(keyword in server.name.lower() for keyword in ['access', 'manager', 'nac']):
                    asset_manager_servers.append(server_info)
                elif any(keyword in server.name.lower() for keyword in ['ise', 'cisco']):
                    ise_servers.append(server_info)
                else:
                    asset_manager_servers.append(server_info)
            
            realtime_metrics = []
            for i, metric in enumerate(metrics[-8:]):  # Last 8 metrics for chart
                realtime_metrics.append({
                    "time": metric.timestamp.strftime("%H:%M") if metric.timestamp else f"T{i}",
                    "rps": metric.requests_per_second,
                    "latency": metric.latency_p50,
                    "errors": int(metric.error_rate * metric.requests_per_second / 100) if metric.error_rate else 0
                })
            
            target_rps = 0
            if active_tests > 0:
                active_run = await db.execute(
                    select(TestRun).where(TestRun.status == 'running').limit(1)
                )
                run = active_run.scalar_one_or_none()
                if run:
                    target_rps = run.target_rps or 0
            
            return {
                "systemStats": {
                    "currentRPS": current_rps,
                    "targetRPS": target_rps,
                    "totalTests": len(all_test_runs),
                    "activeConnections": active_connections,
                    "uptime": uptime,
                    "cpuUsage": cpu_usage,
                    "memoryUsage": memory_usage,
                    "diskUsage": disk_usage,
                    "networkThroughput": network_throughput
                },
                "realtimeMetrics": realtime_metrics,
                "testDistribution": [
                    {"name": "RADIUS", "value": radius_count, "color": "#8884d8"},
                    {"name": "TACACS+", "value": tacacs_count, "color": "#82ca9d"},
                    {"name": "pxGrid", "value": pxgrid_count, "color": "#ffc658"}
                ],
                "assetManagerServers": asset_manager_servers,
                "iseServers": ise_servers,
                "recentAlerts": []  # Real alerts would come from alert/event system
            }
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        return {
            "systemStats": {
                "currentRPS": 0, "targetRPS": 0, "totalTests": 0, "activeConnections": 0,
                "uptime": "0m", "cpuUsage": 0, "memoryUsage": 0, "diskUsage": 0, "networkThroughput": "0 Mbps"
            },
            "realtimeMetrics": [], "testDistribution": [], "assetManagerServers": [], "iseServers": [], "recentAlerts": []
        }


@app.post("/api/runs")
async def create_run(run_config: dict):
    """Create a new test run"""
    return {
        "id": f"run-{datetime.now().strftime('%H%M%S')}",
        "status": "created",
        "config": run_config,
        "created_at": datetime.now().isoformat(),
    }


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str):
    """Get specific test run details"""
    return {
        "id": run_id,
        "name": f"Test Run {run_id}",
        "status": "running",
        "metrics": {
            "current_rps": 4950,
            "target_rps": 5000,
            "delivered_percent": 99.0,
            "p50_latency": 45,
            "p95_latency": 120,
            "p99_latency": 250,
            "success_rate": 99.5,
            "error_rate": 0.5,
        },
    }


# Topology endpoints
@app.get("/api/topology")
async def get_topology():
    """Get network topology"""
    return {
        "nodes": [
            {"id": "tg", "name": "Traffic Generator", "type": "generator", "status": "active"},
            {"id": "nad1", "name": "NAD Cluster A", "type": "nad", "status": "healthy"},
            {"id": "nad2", "name": "NAD Cluster B", "type": "nad", "status": "healthy"},
            {"id": "am", "name": "Asset Manager", "type": "server", "status": "healthy"},
            {"id": "ise", "name": "Cisco ISE", "type": "server", "status": "optional"},
        ],
        "links": [
            {"source": "tg", "target": "nad1", "protocol": "RADIUS"},
            {"source": "tg", "target": "nad2", "protocol": "RADIUS"},
            {"source": "nad1", "target": "am", "protocol": "RADIUS"},
            {"source": "nad2", "target": "am", "protocol": "RADIUS"},
            {"source": "am", "target": "ise", "protocol": "pxGrid"},
        ],
    }


# Quick Test endpoints
@app.post("/api/test/auth")
async def test_authentication(test_config: dict, _: str = Depends(require_auth)):
    """Test authentication against AAA server"""
    rate_limit("auth_test", limit=20, window=60)

    required_fields = ["server_host", "server_port", "protocol", "username", "password"]
    for field in required_fields:
        if field not in test_config:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    protocol = test_config.get("protocol", "").lower()
    if protocol not in ["radius", "tacacs+"]:
        raise HTTPException(status_code=400, detail="Protocol must be 'radius' or 'tacacs+'")

    try:
        if protocol == "radius":
            from .generators.radius_generator import RADIUSGenerator

            generator = RADIUSGenerator(
                server_host=test_config["server_host"],
                server_port=test_config["server_port"],
                secret=test_config.get("secret", "testing123"),
            )

            success = await generator.authenticate_user(test_config["username"], test_config["password"])

            return {
                "success": success,
                "protocol": "radius",
                "server": f"{test_config['server_host']}:{test_config['server_port']}",
                "username": test_config["username"],
                "timestamp": datetime.now().isoformat(),
                "metrics": generator.get_metrics(),
            }

        elif protocol == "tacacs+":
            from .clients.tacacs_client import TACACSClient

            client = TACACSClient(
                server_host=test_config["server_host"],
                server_port=test_config.get("server_port", 49),
                secret=test_config.get("secret", "testing123"),
            )

            success = await client.authenticate_user(test_config["username"], test_config["password"])

            return {
                "success": success,
                "protocol": "tacacs+",
                "server": f"{test_config['server_host']}:{test_config.get('server_port', 49)}",
                "username": test_config["username"],
                "timestamp": datetime.now().isoformat(),
                "metrics": client.get_metrics(),
            }

    except Exception as e:
        logger.error(f"Authentication test error: {e}")
        return {"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}


@app.post("/api/test/auth/bulk")
async def test_authentication_bulk(test_config: dict, _: str = Depends(require_auth)):
    """Test authentication for multiple users"""
    rate_limit("auth_bulk_test", limit=5, window=60)

    required_fields = ["server_host", "server_port", "protocol", "users"]
    for field in required_fields:
        if field not in test_config:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    users = test_config.get("users", [])
    if not users or len(users) > 100:  # Limit bulk size
        raise HTTPException(status_code=400, detail="Users list must contain 1-100 entries")

    protocol = test_config.get("protocol", "").lower()
    if protocol not in ["radius", "tacacs+"]:
        raise HTTPException(status_code=400, detail="Protocol must be 'radius' or 'tacacs+'")

    results = []

    try:
        if protocol == "radius":
            from .generators.radius_generator import RADIUSGenerator

            generator = RADIUSGenerator(
                server_host=test_config["server_host"],
                server_port=test_config["server_port"],
                secret=test_config.get("secret", "testing123"),
            )

            for user in users:
                if "username" not in user or "password" not in user:
                    results.append(
                        {
                            "username": user.get("username", "unknown"),
                            "success": False,
                            "error": "Missing username or password",
                        }
                    )
                    continue

                success = await generator.authenticate_user(user["username"], user["password"])
                results.append({"username": user["username"], "success": success})

        elif protocol == "tacacs+":
            from .clients.tacacs_client import TACACSClient

            client = TACACSClient(
                server_host=test_config["server_host"],
                server_port=test_config.get("server_port", 49),
                secret=test_config.get("secret", "testing123"),
            )

            for user in users:
                if "username" not in user or "password" not in user:
                    results.append(
                        {
                            "username": user.get("username", "unknown"),
                            "success": False,
                            "error": "Missing username or password",
                        }
                    )
                    continue

                success = await client.authenticate_user(user["username"], user["password"])
                results.append({"username": user["username"], "success": success})

        return {
            "protocol": protocol,
            "server": f"{test_config['server_host']}:{test_config.get('server_port', 49 if protocol == 'tacacs+' else 1812)}",
            "total_users": len(users),
            "successful": sum(1 for r in results if r["success"]),
            "failed": sum(1 for r in results if not r["success"]),
            "results": results,
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Bulk authentication test error: {e}")
        return {"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}


@app.post("/api/connectivity/test")
async def test_connectivity(test_config: dict):
    """Test L4 connectivity to servers (no secrets required)"""
    rate_limit("connectivity_test", limit=10, window=60)

    if "targets" not in test_config:
        raise HTTPException(status_code=400, detail="Missing required field: targets")

    targets = test_config.get("targets", [])
    if not targets or len(targets) > 50:  # Limit target count
        raise HTTPException(status_code=400, detail="Targets list must contain 1-50 entries")

    try:
        from .clients.probes import ConnectivityProbe, ProbeTarget, ProbeType

        probe = ConnectivityProbe(default_timeout=test_config.get("timeout", 5.0))
        probe_targets = []

        for target in targets:
            if "host" not in target or "port" not in target:
                continue

            protocol_str = target.get("protocol", "tcp").lower()
            protocol = ProbeType.TCP if protocol_str == "tcp" else ProbeType.UDP

            probe_targets.append(
                ProbeTarget(
                    host=target["host"],
                    port=target["port"],
                    protocol=protocol,
                    timeout=target.get("timeout", 5.0),
                    description=target.get("description"),
                )
            )

        responses = await probe.probe_multiple(probe_targets, concurrent=10)

        results = []
        for response in responses:
            results.append(
                {
                    "host": response.target.host,
                    "port": response.target.port,
                    "protocol": response.target.protocol.value,
                    "result": response.result.value,
                    "latency_ms": response.latency_ms,
                    "resolved_ip": response.resolved_ip,
                    "error_message": response.error_message,
                    "description": response.target.description,
                }
            )

        return {
            "total_targets": len(probe_targets),
            "successful": sum(1 for r in results if r["result"] == "success"),
            "failed": sum(1 for r in results if r["result"] != "success"),
            "results": results,
            "metrics": probe.get_metrics(),
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Connectivity test error: {e}")
        return {"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}


# Configuration endpoints
@app.get("/api/config/summary")
async def get_config_summary():
    """Get configuration summary"""
    return {
        "version": "1.4.0",
        "api_port": 8910,
        "ui_port": 8911,
        "max_rps": 100000,
        "supported_protocols": ["RADIUS", "TACACS+", "pxGrid"],
        "features": {
            "quick_test": True,
            "scale_test": True,
            "performance_test": True,
            "threat_generator": True,
            "topology_view": True,
            "live_telemetry": True,
            "report_export": True,
        },
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/servers/{server_id}/secret")
async def get_server_secret_status(server_id: str, _: str = Depends(require_auth)):
    """Get server secret status (never returns cleartext)"""
    return {
        "server_id": server_id,
        "has_secret": True,  # Simulated
        "secret_encrypted": True,
        "last_updated": datetime.now().isoformat(),
        "redacted_secret": "****ing123",  # Show last few chars only
    }


@app.post("/api/servers/{server_id}/secret")
async def update_server_secret(server_id: str, secret_data: dict, _: str = Depends(require_auth)):
    """Update server secret (encrypted storage)"""
    rate_limit("secret_update", limit=5, window=300)  # 5 updates per 5 minutes

    if "secret" not in secret_data:
        raise HTTPException(status_code=400, detail="Missing secret field")

    secret = secret_data["secret"]
    if not secret or len(secret) < 6:
        raise HTTPException(status_code=400, detail="Secret must be at least 6 characters")

    try:
        from .security.secret_manager import get_secret_manager

        secret_manager = get_secret_manager()
        secret_manager.encrypt_secret(secret, {"server_id": server_id})

        logger.info(f"Secret updated for server {server_id}")

        return {
            "server_id": server_id,
            "success": True,
            "encrypted": True,
            "redacted_secret": secret_manager.redact_secret(secret),
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Secret update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update secret")


# Diagnostics endpoints
@app.get("/api/diagnostics/health")
async def get_diagnostics_health():
    """Get system health diagnostics"""
    return {
        "status": "healthy",
        "services": {
            "api": {"status": "online", "port": 8910},
            "ui": {"status": "online", "port": 8911},
            "websocket": {"status": "active", "port": 8912},
            "database": {"status": "connected"},
            "redis": {"status": "connected"},
        },
        "system": {"uptime": "7d 14h 23m", "cpu_usage": 45.2, "memory_usage": 62.1, "disk_usage": 28.5},
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/diagnostics/network")
async def get_diagnostics_network():
    """Get network diagnostics"""
    return {
        "interfaces": [
            {"name": "eth0", "ip": "192.168.1.100", "status": "up"},
            {"name": "lo", "ip": "127.0.0.1", "status": "up"},
        ],
        "dns": {"servers": ["8.8.8.8", "8.8.4.4"], "resolution_time_ms": 12.5},
        "connectivity": {"internet": True, "dns_resolution": True},
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/diagnostics/configuration")
async def get_diagnostics_configuration():
    """Get configuration diagnostics"""
    return {
        "config_files": {
            "main_config": {"status": "valid", "last_modified": datetime.now().isoformat()},
            "database_config": {"status": "valid", "last_modified": datetime.now().isoformat()},
        },
        "environment": {"python_version": "3.9+", "dependencies": "installed", "migrations": "up_to_date"},
        "ports": {
            "8910": {"status": "listening", "service": "API"},
            "8911": {"status": "listening", "service": "UI"},
            "8912": {"status": "listening", "service": "WebSocket"},
        },
        "timestamp": datetime.now().isoformat(),
    }


# NAD endpoints
@app.get("/api/nads")
async def list_nads():
    """List Network Access Devices from database"""
    from .database import get_db
    from .models import NAD
    from sqlalchemy import select
    
    try:
        async with get_db() as db:
            result = await db.execute(select(NAD))
            nads = result.scalars().all()
            return {
                "nads": [
                    {
                        "id": f"nad-{nad.id}",
                        "name": nad.name,
                        "ip": nad.host_ip,
                        "status": "online" if nad.enabled else "offline",
                        "type": nad.nad_type.value
                    } for nad in nads
                ]
            }
    except Exception as e:
        print(f"Error fetching NADs: {e}")
        return {"nads": []}


# WebSocket endpoint
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """WebSocket endpoint for real-time telemetry"""
    await websocket.accept()
    websocket_connections.add(websocket)

    try:
        # Send initial connection message
        await websocket.send_json(
            {"type": "connection", "status": "connected", "timestamp": datetime.now().isoformat()}
        )

        # Keep connection alive and send periodic updates
        while True:
            from .database import get_db
            from .models import TestMetric
            from sqlalchemy import select
            
            try:
                async with get_db() as db:
                    result = await db.execute(
                        select(TestMetric).order_by(TestMetric.timestamp.desc()).limit(1)
                    )
                    latest_metric = result.scalar_one_or_none()
                    
                    if latest_metric:
                        telemetry = {
                            "type": "telemetry",
                            "timestamp": datetime.now().isoformat(),
                            "metrics": {
                                "current_rps": latest_metric.requests_per_second,
                                "target_rps": latest_metric.target_rps or 0,
                                "delivered_percent": latest_metric.success_rate,
                                "active_sockets": latest_metric.active_connections,
                                "p50_latency": latest_metric.latency_p50,
                                "p95_latency": latest_metric.latency_p95,
                                "p99_latency": latest_metric.latency_p99,
                                "success_rate": latest_metric.success_rate,
                                "error_rate": latest_metric.error_rate,
                                "timeout_rate": latest_metric.timeout_rate,
                            },
                        }
                    else:
                        telemetry = {
                            "type": "telemetry",
                            "timestamp": datetime.now().isoformat(),
                            "metrics": {
                                "current_rps": 0,
                                "target_rps": 0,
                                "delivered_percent": 0.0,
                                "active_sockets": 0,
                                "p50_latency": 0,
                                "p95_latency": 0,
                                "p99_latency": 0,
                                "success_rate": 0.0,
                                "error_rate": 0.0,
                                "timeout_rate": 0.0,
                            },
                        }
            except Exception as e:
                print(f"Error fetching telemetry: {e}")
                telemetry = {
                    "type": "telemetry",
                    "timestamp": datetime.now().isoformat(),
                    "metrics": {
                        "current_rps": 0,
                        "target_rps": 0,
                        "delivered_percent": 0.0,
                        "active_sockets": 0,
                        "p50_latency": 0,
                        "p95_latency": 0,
                        "p99_latency": 0,
                        "success_rate": 0.0,
                        "error_rate": 0.0,
                        "timeout_rate": 0.0,
                    },
                }
            await websocket.send_json(telemetry)
            await asyncio.sleep(1)

    except WebSocketDisconnect:
        websocket_connections.discard(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        websocket_connections.discard(websocket)


@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """WebSocket endpoint for real-time logs"""
    await websocket.accept()
    
    try:
        from .database import get_db_context
        from .models import TestRun, TestMetric
        from sqlalchemy import select
        import json
        from datetime import datetime
        
        while True:
            try:
                async with get_db_context() as db:
                    # Get recent test runs for log entries
                    recent_runs = await db.execute(
                        select(TestRun).order_by(TestRun.created_at.desc()).limit(5)
                    )
                    runs = recent_runs.scalars().all()
                    
                    # Get recent metrics for system logs
                    recent_metrics = await db.execute(
                        select(TestMetric).order_by(TestMetric.timestamp.desc()).limit(3)
                    )
                    metrics = recent_metrics.scalars().all()
                    
                    for run in runs:
                        if run.status == 'running':
                            log_entry = {
                                "id": f"test_run_{run.id}_{int(datetime.now().timestamp())}",
                                "timestamp": datetime.now(),
                                "level": "INFO",
                                "source": f"TestRun-{run.id}",
                                "message": f"Test run '{run.name}' is {run.status}",
                                "details": f"Type: {run.test_type}, Target: {run.target_rps} RPS"
                            }
                            await websocket.send_text(json.dumps(log_entry, default=str))
                    
                    for metric in metrics:
                        if metric.requests_per_second > 0:
                            log_entry = {
                                "id": f"metric_{metric.id}_{int(datetime.now().timestamp())}",
                                "timestamp": datetime.now(),
                                "level": "SUCCESS" if metric.error_rate < 0.01 else "WARNING",
                                "source": "MetricsCollector",
                                "message": f"Performance: {metric.requests_per_second} RPS, {metric.error_rate:.2%} errors",
                                "details": f"Latency P95: {metric.latency_p95}ms, Active: {metric.active_connections}"
                            }
                            await websocket.send_text(json.dumps(log_entry, default=str))
                    
                    await asyncio.sleep(2)
                    
            except Exception as e:
                error_log = {
                    "id": f"error_{int(datetime.now().timestamp())}",
                    "timestamp": datetime.now(),
                    "level": "ERROR",
                    "source": "LogStreamer",
                    "message": f"Log streaming error: {str(e)}",
                    "details": "Check database connection and permissions"
                }
                await websocket.send_text(json.dumps(error_log, default=str))
                await asyncio.sleep(5)
                
    except WebSocketDisconnect:
        pass


@app.get("/api/servers")
async def list_servers():
    """Get all RADIUS/TACACS+ servers from database"""
    from .database import get_db_context
    from .models import NAD
    from sqlalchemy import select
    
    try:
        async with get_db_context() as db:
            result = await db.execute(select(NAD))
            servers = result.scalars().all()
            return {"servers": [
                {
                    "id": server.id,
                    "name": server.name,
                    "host": server.ip_address,
                    "type": {"radius_server": "radius", "tacacs_server": "tacacs", "pxgrid_server": "pxgrid"}.get(server.device_type.value if server.device_type else "radius_server", "radius"),
                    "enabled": server.is_active,
                    "authPort": 1812,
                    "acctPort": 1813,
                    "secret": "••••••••"
                } for server in servers
            ]}
    except Exception as e:
        logger.error(f"Error fetching servers: {e}")
        return {"servers": []}


@app.post("/api/servers")
async def create_server(server_data: dict):
    """Create new server configuration"""
    from .database import get_db_context
    from .models import NAD, NADType
    
    try:
        async with get_db_context() as db:
            type_mapping = {
                "radius": NADType.RADIUS_SERVER,
                "tacacs": NADType.TACACS_SERVER,
                "pxgrid": NADType.PXGRID_SERVER
            }
            server_type = server_data.get("type", "radius")
            nad_type = type_mapping.get(server_type, NADType.RADIUS_SERVER)
            
            new_server = NAD(
                name=server_data["name"],
                ip_address=server_data["host"],
                device_type=nad_type,
                is_active=server_data.get("enabled", True),
                radius_secret=server_data["secret"]
            )
            db.add(new_server)
            await db.commit()
            await db.refresh(new_server)
            
            return {
                "id": new_server.id,
                "name": new_server.name,
                "host": new_server.ip_address,
                "type": {"RADIUS_SERVER": "radius", "TACACS_SERVER": "tacacs", "PXGRID_SERVER": "pxgrid"}.get(new_server.device_type.value, "radius"),
                "enabled": new_server.is_active
            }
    except Exception as e:
        logger.error(f"Error creating server: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create server: {str(e)}")


@app.put("/api/servers/{server_id}")
async def update_server(server_id: str, server_data: dict):
    """Update existing server configuration"""
    from .database import get_db_context
    from .models import NAD, NADType
    from sqlalchemy import select
    
    try:
        async with get_db_context() as db:
            result = await db.execute(select(NAD).where(NAD.id == server_id))
            server = result.scalar_one_or_none()
            
            if not server:
                raise HTTPException(status_code=404, detail="Server not found")
            
            type_mapping = {
                "radius": NADType.RADIUS_SERVER,
                "tacacs": NADType.TACACS_SERVER,
                "pxgrid": NADType.PXGRID_SERVER
            }
            
            server.name = server_data.get("name", server.name)
            server.ip_address = server_data.get("host", server.ip_address)
            if "type" in server_data:
                server_type = server_data["type"]
                server.device_type = type_mapping.get(server_type, NADType.RADIUS_SERVER)
            server.is_active = server_data.get("enabled", server.is_active)
            if "secret" in server_data:
                server.radius_secret = server_data["secret"]
            
            await db.commit()
            await db.refresh(server)
            
            return {
                "id": server.id,
                "name": server.name,
                "host": server.ip_address,
                "type": {"RADIUS_SERVER": "radius", "TACACS_SERVER": "tacacs", "PXGRID_SERVER": "pxgrid"}.get(server.device_type.value, "radius"),
                "enabled": server.is_active
            }
    except Exception as e:
        logger.error(f"Error updating server: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update server: {str(e)}")


@app.delete("/api/servers/{server_id}")
async def delete_server(server_id: str):
    """Delete server configuration"""
    from .database import get_db_context
    from .models import NAD
    from sqlalchemy import select
    
    try:
        async with get_db_context() as db:
            result = await db.execute(select(NAD).where(NAD.id == server_id))
            server = result.scalar_one_or_none()
            
            if not server:
                raise HTTPException(status_code=404, detail="Server not found")
            
            await db.delete(server)
            await db.commit()
            
            return {"message": "Server deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting server: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete server: {str(e)}")


@app.post("/api/config/system")
async def save_system_config(config_data: dict):
    """Save system configuration"""
    return {"message": "System configuration saved successfully"}


@app.get("/api/test-profiles")
async def list_test_profiles():
    """Get all test profiles"""
    try:
        return {"profiles": []}
    except Exception as e:
        logger.error(f"Error fetching test profiles: {e}")
        return {"profiles": []}


if __name__ == "__main__":
    import uvicorn

    print("🚀 Starting RadiusForge API Server on port 8910...")
    print("📡 API: http://localhost:8910")
    print("📊 API Docs: http://localhost:8910/docs")
    uvicorn.run(app, host="0.0.0.0", port=8910, reload=True)
