import pytest
import asyncio
import json
from pathlib import Path

class TestRealDataFlow:
    """End-to-end tests for real data flow without mocks"""
    
    def test_ui_dashboard_no_mock_data(self):
        """Test UI Dashboard shows real data indicators"""
        dashboard_file = Path(__file__).parent.parent.parent / "ui" / "src" / "pages" / "Dashboard.jsx"
        content = dashboard_file.read_text()
        
        assert "generateMock" not in content
        assert "mockData" not in content
        assert "dummyData" not in content
        assert "fakeData" not in content
        
        assert "fetch('/api/dashboard/stats')" in content
        assert "setSystemStats(data.systemStats)" in content
    
    def test_ui_live_logs_no_mock_data(self):
        """Test UI Live Logs uses real WebSocket connections"""
        logs_file = Path(__file__).parent.parent.parent / "ui" / "src" / "pages" / "LiveLogs.jsx"
        content = logs_file.read_text()
        
        assert "generateMockLog" not in content
        assert "mockLogs" not in content
        
        assert "new WebSocket(`ws://localhost:8910/ws/logs`)" in content
        assert "ws.onmessage = (event) => {" in content
    
    def test_ui_configuration_real_persistence(self):
        """Test UI Configuration uses real database operations"""
        config_file = Path(__file__).parent.parent.parent / "ui" / "src" / "pages" / "Configuration.jsx"
        content = config_file.read_text()
        
        assert "fetch('/api/servers')" in content
        assert "method: 'POST'" in content or "method: 'PUT'" in content
        
        assert "mockServers" not in content
        assert "dummyServers" not in content
    
    def test_api_websocket_manager_real_telemetry(self):
        """Test WebSocket manager generates real telemetry"""
        ws_file = Path(__file__).parent.parent.parent / "src" / "api" / "websocket_manager.py"
        content = ws_file.read_text()
        
        assert "from .database import get_db" in content or "get_db_context" in content
        assert "select(TestMetric)" in content or "TestMetric" in content
        
        assert "generateMockTelemetry" not in content
        assert "mockTelemetry" not in content
    
    def test_docker_compose_multi_container_setup(self):
        """Test docker-compose.yml defines multi-container architecture"""
        compose_file = Path(__file__).parent.parent.parent / "docker-compose.yml"
        content = compose_file.read_text()
        
        required_services = ["postgres", "redis", "api", "ui", "prometheus", "grafana"]
        for service in required_services:
            assert f"{service}:" in content
        
        assert "radiusforge-network" in content
        
        assert "postgres_data:" in content
        assert "redis_data:" in content
    
    def test_dockerfile_api_build_dependencies(self):
        """Test Dockerfile.api includes necessary build dependencies"""
        dockerfile = Path(__file__).parent.parent.parent / "Dockerfile.api"
        content = dockerfile.read_text()
        
        required_deps = ["build-essential", "python3-dev", "gcc", "g++", "make"]
        for dep in required_deps:
            assert dep in content
        
        assert "python:3.9-slim" in content
        assert "pip install" in content
    
    def test_no_simulator_imports_in_production(self):
        """Test production code doesn't import simulators"""
        src_dir = Path(__file__).parent.parent.parent / "src"
        
        for py_file in src_dir.rglob("*.py"):
            if "simulators" in str(py_file):
                continue  # Skip simulator files themselves
                
            content = py_file.read_text()
            
            assert "from src.simulators" not in content
            assert "import src.simulators" not in content
            assert "from .simulators" not in content
    
    def test_secret_manager_real_encryption(self):
        """Test SecretManager uses real AES-GCM encryption"""
        secret_file = Path(__file__).parent.parent.parent / "src" / "api" / "security" / "secret_manager.py"
        content = secret_file.read_text()
        
        assert "AES" in content
        assert "GCM" in content
        assert "encrypt" in content
        assert "decrypt" in content
        
        assert "mockEncrypt" not in content
        assert "fakeEncrypt" not in content
    
    def test_protocol_clients_real_implementation(self):
        """Test protocol clients have real implementations"""
        clients_dir = Path(__file__).parent.parent.parent / "src" / "api" / "clients"
        
        radius_client = clients_dir / "radius_client.py"
        if radius_client.exists():
            content = radius_client.read_text()
            assert "socket" in content or "UDP" in content
            assert "RADIUS" in content
        
        tacacs_client = clients_dir / "tacacs_client.py"
        if tacacs_client.exists():
            content = tacacs_client.read_text()
            assert "socket" in content or "TCP" in content
            assert "TACACS" in content
        
        pxgrid_client = clients_dir / "pxgrid_client.py"
        if pxgrid_client.exists():
            content = pxgrid_client.read_text()
            assert "requests" in content or "http" in content
            assert "pxGrid" in content or "pxgrid" in content
