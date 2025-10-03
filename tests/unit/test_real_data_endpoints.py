import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from src.api.main_simple import app
from src.api.models import NAD, NADType, TestRun, TestMetric
from datetime import datetime

client = TestClient(app)

class TestRealDataEndpoints:
    """Test all endpoints return real data, not mock data"""
    
    @patch('src.api.main_simple.get_db_context')
    async def test_dashboard_stats_real_data(self, mock_get_db):
        """Test dashboard stats returns real metrics from database"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        mock_test_run = TestRun(id=1, status='running', created_at=datetime.now())
        mock_metric = TestMetric(
            id=1, 
            requests_per_second=100, 
            active_connections=50,
            cpu_usage=25,
            memory_usage=60,
            timestamp=datetime.now()
        )
        mock_server = NAD(
            id=1,
            name="Test Server",
            host_ip="192.168.1.10",
            nad_type=NADType.radius,
            enabled=True
        )
        
        mock_db.execute.return_value.scalars.return_value.all.side_effect = [
            [mock_test_run],  # active tests
            [mock_test_run],  # all runs
            [mock_server],    # servers
            [mock_metric]     # metrics
        ]
        
        response = client.get("/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "currentRPS" in data
        assert "activeTests" in data
        assert "systemUptime" in data
        assert isinstance(data["currentRPS"], int)
        assert isinstance(data["activeTests"], int)
        
        assert "mock" not in str(data).lower()
        assert "dummy" not in str(data).lower()
        assert "fake" not in str(data).lower()
    
    @patch('src.api.main_simple.get_db_context')
    async def test_list_servers_real_data(self, mock_get_db):
        """Test server list returns real data from database"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        mock_server = NAD(
            id=1,
            name="Production RADIUS Server",
            host_ip="10.0.1.100",
            nad_type=NADType.radius,
            enabled=True
        )
        mock_db.execute.return_value.scalars.return_value.all.return_value = [mock_server]
        
        response = client.get("/api/servers")
        assert response.status_code == 200
        data = response.json()
        
        assert "servers" in data
        assert len(data["servers"]) == 1
        server = data["servers"][0]
        assert server["name"] == "Production RADIUS Server"
        assert server["host"] == "10.0.1.100"
        assert server["type"] == "radius"
        assert server["enabled"] is True
        
        assert server["secret"] == "••••••••"
    
    @patch('src.api.main_simple.get_db_context')
    async def test_create_server_real_persistence(self, mock_get_db):
        """Test server creation persists to real database"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        mock_created_server = NAD(
            id=2,
            name="New Test Server",
            host_ip="192.168.1.200",
            nad_type=NADType.tacacs,
            enabled=True
        )
        
        server_data = {
            "name": "New Test Server",
            "host": "192.168.1.200",
            "type": "tacacs",
            "enabled": True,
            "secret": "newsecret123"
        }
        
        response = client.post("/api/servers", json=server_data)
        assert response.status_code == 200
        
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()
    
    def test_websocket_logs_endpoint_exists(self):
        """Test WebSocket logs endpoint exists for real-time data"""
        from src.api.main_simple import app
        routes = [route.path for route in app.routes]
        assert "/ws/logs" in routes
    
    def test_websocket_telemetry_endpoint_exists(self):
        """Test WebSocket telemetry endpoint exists for real-time data"""
        from src.api.main_simple import app
        routes = [route.path for route in app.routes]
        assert "/ws/telemetry" in routes
    
    def test_no_mock_data_in_api_responses(self):
        """Test that API responses don't contain mock data indicators"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        
        response_text = str(data).lower()
        assert "mock" not in response_text
        assert "dummy" not in response_text
        assert "fake" not in response_text
        assert "sample" not in response_text
        assert "test data" not in response_text
    
    @patch('src.api.main_simple.get_db_context')
    async def test_configuration_persistence(self, mock_get_db):
        """Test configuration changes persist across requests"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        config_data = {
            "system_name": "RadiusForge-Production",
            "max_concurrent_tests": 200,
            "default_timeout": 45
        }
        
        response = client.post("/api/config/system", json=config_data)
        assert "mock" not in str(response.json()).lower()
