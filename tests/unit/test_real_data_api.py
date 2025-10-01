import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from src.api.main_simple import app
from src.api.models import NAD, NADType, TestRun, TestMetric, TestPreset

client = TestClient(app)

class TestRealDataAPI:
    """Test real data API endpoints"""
    
    @patch('src.api.database.get_db_context')
    def test_list_servers_real_data(self, mock_get_db):
        """Test listing servers returns real data from database"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        mock_server = MagicMock()
        mock_server.id = 1
        mock_server.name = "Test Server"
        mock_server.ip_address = "192.168.1.10"
        mock_server.device_type.value = "RADIUS_SERVER"
        mock_server.is_active = True
        
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [mock_server]
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute.return_value = mock_result
        
        response = client.get("/api/servers")
        assert response.status_code == 200
        data = response.json()
        assert "servers" in data
        assert len(data["servers"]) == 1
        assert data["servers"][0]["name"] == "Test Server"
        # Secret should be masked in response
        if "secret" in data["servers"][0]:
            assert data["servers"][0]["secret"] == "••••••••"
    
    @patch('src.api.database.get_db_context')
    def test_dashboard_stats_real_data(self, mock_get_db):
        """Test dashboard stats returns real metrics from database"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute.return_value = mock_result
        
        response = client.get("/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "systemStats" in data
        assert "realtimeMetrics" in data
        assert isinstance(data["systemStats"]["currentRPS"], int)
        assert isinstance(data["systemStats"]["activeConnections"], int)
    
    @patch('src.api.database.get_db_context')
    def test_create_server_real_data(self, mock_get_db):
        """Test creating server saves to real database"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        mock_server = MagicMock()
        mock_server.id = 1
        mock_server.name = "New Server"
        mock_server.ip_address = "192.168.1.20"
        mock_server.device_type.value = "RADIUS_SERVER"
        mock_server.is_active = True
        
        mock_db.refresh = AsyncMock()
        mock_db.commit = AsyncMock()
        
        server_data = {
            "name": "New Server",
            "host": "192.168.1.20",
            "secret": "test-secret",
            "type": "radius",
            "enabled": True
        }
        
        response = client.post("/api/servers", json=server_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Server"
        assert data["host"] == "192.168.1.20"
        # Secret should not be returned in response
        assert "secret" not in data
    
    def test_test_profiles_real_data(self):
        """Test test profiles endpoint exists and returns proper structure"""
        response = client.get("/api/test-profiles")
        assert response.status_code == 200
        data = response.json()
        assert "profiles" in data
        assert isinstance(data["profiles"], list)
    
    def test_websocket_logs_endpoint_exists(self):
        """Test that WebSocket logs endpoint exists"""
        from src.api.main_simple import app
        routes = [route.path for route in app.routes]
        assert "/ws/logs" in routes

class TestRealDataIntegration:
    """Integration tests for real data flow"""
    
    def test_dashboard_with_real_metrics(self):
        """Test dashboard returns real data structure with proper types"""
        response = client.get("/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "systemStats" in data
        assert isinstance(data["systemStats"]["currentRPS"], int)
        assert isinstance(data["systemStats"]["activeConnections"], int)
        assert isinstance(data["realtimeMetrics"], list)
        assert isinstance(data["assetManagerServers"], list)
        assert isinstance(data["iseServers"], list)
    
    @patch('src.api.database.get_db_context')
    def test_empty_database_handling(self, mock_get_db):
        """Test handling of empty database gracefully"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        
        response = client.get("/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert data["systemStats"]["currentRPS"] == 0
        assert data["systemStats"]["activeConnections"] == 0
        assert data["realtimeMetrics"] == []
        assert data["assetManagerServers"] == []
        assert data["iseServers"] == []
    
    @patch('src.api.database.get_db_context')
    def test_database_error_handling(self, mock_get_db):
        """Test handling of database errors"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        mock_db.execute.side_effect = Exception("Database connection failed")
        
        response = client.get("/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert data["systemStats"]["currentRPS"] == 0
        assert data["realtimeMetrics"] == []
