#!/usr/bin/env python3
"""
RadiusForge Test Configuration and Fixtures
Shared test fixtures for unit, integration, and e2e tests
"""

import pytest
import asyncio
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any, AsyncGenerator, Generator
import json
import socket
import uuid
from datetime import datetime, timedelta

# FastAPI and WebSocket testing
from fastapi.testclient import TestClient
from fastapi import FastAPI
from httpx import AsyncClient
import websockets

# Database testing
from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Import application components
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from api.main import app
from api.database import Base, get_db
from api.models import TestRun, TestStatus, TestType, TestMetric, NAD, Report
from api.config import Settings
from api.websocket_manager import WebSocketManager
from api.generators.radius_generator import RADIUSGenerator, RADIUSPacket, RADIUSCode


# Test configuration
@pytest.fixture(scope="session")
def test_settings():
    """Test application settings"""
    return Settings(
        DATABASE_URL="sqlite+aiosqlite:///:memory:",
        DATABASE_ECHO=False,
        DEBUG=True,
        API_HOST="127.0.0.1",
        API_PORT=8910,
        REDIS_URL="redis://localhost:6379/15",  # Use test database
        MAX_CONCURRENT_TESTS=5,
        WS_HEARTBEAT_INTERVAL=5,
        WS_MAX_CONNECTIONS=10,
        CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
    )


# Database fixtures
@pytest.fixture(scope="session")
def test_engine(test_settings):
    """Create test database engine"""
    engine = create_async_engine(
        test_settings.DATABASE_URL,
        echo=test_settings.DATABASE_ECHO,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False}
    )
    return engine


@pytest.fixture(scope="session")
async def setup_database(test_engine):
    """Set up test database"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session(test_engine, setup_database):
    """Provide clean database session for each test"""
    async_session = sessionmaker(
        test_engine, 
        class_=AsyncSession, 
        expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture
def override_get_db(db_session):
    """Override database dependency for testing"""
    async def _override_get_db():
        yield db_session
    return _override_get_db


# FastAPI testing fixtures
@pytest.fixture
def test_app(test_settings, override_get_db):
    """Create test FastAPI application"""
    app.dependency_overrides[get_db] = override_get_db
    
    # Override settings
    with patch('api.config.settings', test_settings):
        yield app
    
    # Clean up
    app.dependency_overrides.clear()


@pytest.fixture
def client(test_app):
    """Synchronous test client"""
    return TestClient(test_app)


@pytest.fixture
async def async_client(test_app):
    """Asynchronous test client"""
    async with AsyncClient(app=test_app, base_url="http://test") as ac:
        yield ac


# WebSocket fixtures
@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection"""
    websocket = Mock()
    websocket.accept = AsyncMock()
    websocket.send_json = AsyncMock()
    websocket.send_text = AsyncMock()
    websocket.receive_text = AsyncMock()
    websocket.close = AsyncMock()
    return websocket


@pytest.fixture
async def websocket_manager():
    """Clean WebSocket manager for testing"""
    manager = WebSocketManager()
    yield manager
    await manager.disconnect_all()


@pytest.fixture
async def connected_websocket(websocket_manager, mock_websocket):
    """WebSocket connection for testing"""
    client_id = await websocket_manager.connect(mock_websocket)
    return client_id, mock_websocket


# RADIUS testing fixtures
@pytest.fixture
def mock_radius_server():
    """Mock RADIUS server for testing"""
    class MockRADIUSServer:
        def __init__(self):
            self.host = "127.0.0.1"
            self.port = 11812  # Non-standard port for testing
            self.secret = "testing123"
            self.responses = {}
            self.received_packets = []
        
        def set_response(self, packet_id: int, response_code: RADIUSCode):
            """Set expected response for packet ID"""
            self.responses[packet_id] = response_code
        
        def get_received_packets(self):
            """Get list of received packets"""
            return self.received_packets.copy()
    
    return MockRADIUSServer()


@pytest.fixture
def radius_generator(mock_radius_server):
    """RADIUS generator for testing"""
    generator = RADIUSGenerator(
        server_host=mock_radius_server.host,
        server_port=mock_radius_server.port,
        secret=mock_radius_server.secret
    )
    return generator


# Test data fixtures
@pytest.fixture
def sample_test_run_data():
    """Sample test run data for testing"""
    return {
        "name": "Test Load Test",
        "description": "Sample load test for unit testing",
        "test_type": TestType.PERFORMANCE,
        "target_rps": 1000,
        "duration_seconds": 60,
        "ramp_up_seconds": 10,
        "ramp_down_seconds": 10,
        "radius_server_host": "192.168.1.100",
        "radius_server_port": 1812,
        "radius_secret": "testing123",
        "test_config": {
            "username_pattern": "user{:06d}",
            "password": "password123",
            "nas_ip": "192.168.1.1"
        }
    }


@pytest.fixture
async def sample_test_run(db_session, sample_test_run_data):
    """Create sample test run in database"""
    test_run = TestRun(**sample_test_run_data)
    db_session.add(test_run)
    await db_session.commit()
    await db_session.refresh(test_run)
    return test_run


@pytest.fixture
def sample_nad_data():
    """Sample NAD data for testing"""
    return {
        "name": "Test Switch",
        "description": "Sample network switch for testing",
        "device_type": "switch",
        "ip_address": "192.168.1.10",
        "mac_address": "00:11:22:33:44:55",
        "vendor": "Cisco",
        "model": "Catalyst 9300",
        "software_version": "16.12.05",
        "radius_secret": "secret123",
        "location": "Building A - Floor 1",
        "group_name": "access_switches"
    }


@pytest.fixture
async def sample_nad(db_session, sample_nad_data):
    """Create sample NAD in database"""
    nad = NAD(**sample_nad_data)
    db_session.add(nad)
    await db_session.commit()
    await db_session.refresh(nad)
    return nad


@pytest.fixture
def sample_metrics_data():
    """Sample test metrics data"""
    return [
        {
            "elapsed_seconds": 1.0,
            "current_rps": 100.0,
            "target_rps": 1000.0,
            "delivered_percent": 10.0,
            "active_sockets": 10,
            "total_connections": 100,
            "avg_latency": 45.5,
            "p95_latency": 120.0,
            "p99_latency": 250.0,
            "success_count": 95,
            "error_count": 5,
            "timeout_count": 0,
            "success_rate": 95.0,
            "error_rate": 5.0,
            "timeout_rate": 0.0
        },
        {
            "elapsed_seconds": 2.0,
            "current_rps": 200.0,
            "target_rps": 1000.0,
            "delivered_percent": 20.0,
            "active_sockets": 20,
            "total_connections": 200,
            "avg_latency": 48.2,
            "p95_latency": 125.0,
            "p99_latency": 260.0,
            "success_count": 190,
            "error_count": 10,
            "timeout_count": 0,
            "success_rate": 95.0,
            "error_rate": 5.0,
            "timeout_rate": 0.0
        }
    ]


@pytest.fixture
async def sample_metrics(db_session, sample_test_run, sample_metrics_data):
    """Create sample metrics in database"""
    metrics = []
    for data in sample_metrics_data:
        metric = TestMetric(test_run_id=sample_test_run.id, **data)
        db_session.add(metric)
        metrics.append(metric)
    
    await db_session.commit()
    for metric in metrics:
        await db_session.refresh(metric)
    
    return metrics


# File system fixtures
@pytest.fixture
def temp_dir():
    """Create temporary directory for testing"""
    temp_path = tempfile.mkdtemp()
    yield Path(temp_path)
    shutil.rmtree(temp_path, ignore_errors=True)


@pytest.fixture
def mock_reports_dir(temp_dir):
    """Mock reports directory"""
    reports_dir = temp_dir / "reports"
    reports_dir.mkdir(exist_ok=True)
    return reports_dir


# Network fixtures
@pytest.fixture
def available_port():
    """Get an available port for testing"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port


# Mocking fixtures
@pytest.fixture
def mock_async_sleep():
    """Mock asyncio.sleep for faster tests"""
    with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
        yield mock_sleep


@pytest.fixture
def mock_datetime_now():
    """Mock datetime.now for consistent timestamps"""
    fixed_time = datetime(2024, 1, 15, 12, 0, 0)
    with patch('datetime.datetime') as mock_dt:
        mock_dt.now.return_value = fixed_time
        mock_dt.utcnow.return_value = fixed_time
        yield mock_dt


# Performance testing helpers
@pytest.fixture
def performance_monitor():
    """Monitor performance metrics during tests"""
    class PerformanceMonitor:
        def __init__(self):
            self.start_time = None
            self.end_time = None
            self.metrics = {}
        
        def start(self):
            self.start_time = datetime.now()
        
        def stop(self):
            self.end_time = datetime.now()
            return (self.end_time - self.start_time).total_seconds()
        
        def add_metric(self, name: str, value: Any):
            self.metrics[name] = value
        
        def get_duration(self) -> float:
            if self.start_time and self.end_time:
                return (self.end_time - self.start_time).total_seconds()
            return 0.0
    
    return PerformanceMonitor()


# Event loop management
@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for session"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# Test markers for categorization
def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line(
        "markers", "unit: Mark test as unit test (fast, isolated)"
    )
    config.addinivalue_line(
        "markers", "integration: Mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "e2e: Mark test as end-to-end test"
    )
    config.addinivalue_line(
        "markers", "slow: Mark test as slow (> 1 second)"
    )
    config.addinivalue_line(
        "markers", "network: Mark test as requiring network"
    )


# Test collection hooks
def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on path"""
    for item in items:
        # Add markers based on test file location
        if "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        elif "e2e" in str(item.fspath):
            item.add_marker(pytest.mark.e2e)
        
        # Add slow marker for tests with long timeout
        if hasattr(item, 'get_closest_marker'):
            timeout_marker = item.get_closest_marker('timeout')
            if timeout_marker and timeout_marker.args[0] > 5:
                item.add_marker(pytest.mark.slow)
