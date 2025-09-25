#!/usr/bin/env python3
"""
RadiusForge FastAPI Backend - Simplified for Local Testing
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
import asyncio
import json
import hashlib
import secrets
import os
import time
import logging
from pathlib import Path
from collections import defaultdict
from typing import Dict, List

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
    return 8910 <= port <= 8920


def sanitize_input(value: str, max_length: int = 255) -> str:
    """Basic input sanitization"""
    if not isinstance(value, str):
        raise HTTPException(status_code=400, detail="Invalid input type")

    # Remove potentially dangerous characters
    sanitized = "".join(c for c in value if c.isalnum() or c in ".-_/")

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
            "reserved": {"port": 8920, "status": "reserved", "description": "Reserved for future use"},
        },
        "range": {"start": 8910, "end": 8920, "total": 11},
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
async def list_runs():
    """List test runs"""
    return {
        "runs": [
            {
                "id": "run-001",
                "name": "Scale Test - 5000 RPS",
                "status": "completed",
                "rps": 5000,
                "duration": 300,
                "created_at": datetime.now().isoformat(),
            },
            {
                "id": "run-002",
                "name": "Performance Test - SLO Validation",
                "status": "running",
                "rps": 10000,
                "duration": 600,
                "created_at": datetime.now().isoformat(),
            },
        ]
    }


@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    import random

    return {
        "currentRPS": random.randint(4800, 5200),
        "activeTests": random.randint(2, 5),
        "activeConnections": random.randint(980, 1020),
        "systemUptime": "7d 14h 23m",
        "testDistribution": {"RADIUS": 45, "TACACS+": 30, "Syslog": 25},
        "systemResources": {
            "cpu": random.randint(35, 65),
            "memory": random.randint(45, 75),
            "disk": random.randint(20, 40),
        },
        "serverStatus": [
            {"name": "Asset Manager Primary", "status": "healthy", "latency": random.randint(10, 30)},
            {"name": "Asset Manager Secondary", "status": "healthy", "latency": random.randint(15, 35)},
            {"name": "Cisco ISE", "status": "warning", "latency": random.randint(50, 100)},
            {"name": "Backup Server", "status": "offline", "latency": None},
        ],
        "recentAlerts": [
            {"level": "warning", "message": "High latency detected on ISE", "timestamp": datetime.now().isoformat()},
            {"level": "info", "message": "Test run completed successfully", "timestamp": datetime.now().isoformat()},
            {
                "level": "error",
                "message": "Connection timeout to backup server",
                "timestamp": datetime.now().isoformat(),
            },
        ],
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
async def test_connectivity(test_config: dict, _: str = Depends(require_auth)):
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
        encrypted_secret = secret_manager.encrypt_secret(secret, {"server_id": server_id})

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
    """List Network Access Devices"""
    return {
        "nads": [
            {"id": "nad-001", "name": "Switch-01", "ip": "10.0.1.1", "status": "online"},
            {"id": "nad-002", "name": "Switch-02", "ip": "10.0.1.2", "status": "online"},
            {"id": "nad-003", "name": "Router-01", "ip": "10.0.2.1", "status": "offline"},
        ]
    }


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
            # Send telemetry data
            telemetry = {
                "type": "telemetry",
                "timestamp": datetime.now().isoformat(),
                "metrics": {
                    "current_rps": 5000,
                    "target_rps": 5000,
                    "delivered_percent": 100.0,
                    "active_sockets": 100,
                    "p50_latency": 45,
                    "p95_latency": 120,
                    "p99_latency": 250,
                    "success_rate": 99.5,
                    "error_rate": 0.5,
                    "timeout_rate": 0.1,
                },
            }
            await websocket.send_json(telemetry)
            await asyncio.sleep(1)

    except WebSocketDisconnect:
        websocket_connections.discard(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        websocket_connections.discard(websocket)


if __name__ == "__main__":
    import uvicorn

    print("🚀 Starting RadiusForge API Server on port 8910...")
    print("📡 API: http://localhost:8910")
    print("📊 API Docs: http://localhost:8910/docs")
    uvicorn.run(app, host="0.0.0.0", port=8910, reload=True)
