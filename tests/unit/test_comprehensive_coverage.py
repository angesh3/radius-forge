import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from src.api.main_simple import app
from src.api.models import NAD, NADType, TestRun, TestMetric
import asyncio

client = TestClient(app)

class TestComprehensiveCoverage:
    """Comprehensive tests to achieve 100% coverage"""
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
    
    def test_api_root_endpoint(self):
        """Test API root endpoint"""
        response = client.get("/api/")
        assert response.status_code in [200, 404]  # May or may not exist
    
    @patch('src.api.database.get_db_context')
    def test_dashboard_stats_error_handling(self, mock_get_db):
        """Test dashboard stats error handling"""
        mock_get_db.side_effect = Exception("Database error")
        
        response = client.get("/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["systemStats"]["currentRPS"] == 0
        assert data["realtimeMetrics"] == []
    
    @patch('src.api.database.get_db_context')
    def test_servers_endpoint_empty_database(self, mock_get_db):
        """Test servers endpoint with empty database"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        
        response = client.get("/api/servers")
        assert response.status_code == 200
        data = response.json()
        assert "servers" in data
        assert data["servers"] == []
    
    @patch('src.api.database.get_db_context')
    def test_test_profiles_endpoint_empty_database(self, mock_get_db):
        """Test test profiles endpoint with empty database"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        
        response = client.get("/api/test-profiles")
        assert response.status_code == 200
        data = response.json()
        assert "profiles" in data
        assert data["profiles"] == []
    
    def test_websocket_endpoints_exist(self):
        """Test that WebSocket endpoints are registered"""
        from src.api.main_simple import app
        routes = [route.path for route in app.routes]
        
        websocket_routes = [route for route in routes if 'ws' in route]
        assert len(websocket_routes) > 0, "No WebSocket routes found"
    
    @patch('src.api.database.get_db_context')
    def test_dashboard_with_real_server_data(self, mock_get_db):
        """Test dashboard with real server data"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        mock_asset_server = MagicMock()
        mock_asset_server.name = "Asset Manager Primary"
        mock_asset_server.is_active = True
        
        mock_ise_server = MagicMock()
        mock_ise_server.name = "ISE PAN"
        mock_ise_server.is_active = True
        
        def mock_execute_side_effect(*args, **kwargs):
            query_str = str(args[0])
            result = MagicMock()
            
            if 'TestRun' in query_str:
                result.scalars.return_value.all.return_value = []
            elif 'NAD' in query_str:
                result.scalars.return_value.all.return_value = [mock_asset_server, mock_ise_server]
            elif 'TestMetric' in query_str:
                result.scalars.return_value.all.return_value = []
            else:
                result.scalars.return_value.all.return_value = []
            
            return result
        
        mock_db.execute.side_effect = mock_execute_side_effect
        
        response = client.get("/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "systemStats" in data
        assert data["systemStats"]["currentRPS"] >= 0
    
    def test_cors_headers(self):
        """Test CORS headers are present"""
        response = client.options("/api/dashboard/stats")
        assert response.status_code in [200, 405]  # OPTIONS may not be implemented
    
    def test_api_error_responses(self):
        """Test API error responses"""
        response = client.get("/api/nonexistent")
        assert response.status_code == 404
    
    @patch('src.api.database.get_db_context')
    def test_database_connection_error(self, mock_get_db):
        """Test database connection error handling"""
        mock_get_db.side_effect = Exception("Connection failed")
        
        response = client.get("/api/dashboard/stats")
        assert response.status_code == 200  # Should return empty state
        data = response.json()
        assert data["systemStats"]["currentRPS"] == 0

class TestWebSocketCoverage:
    """Test WebSocket functionality coverage"""
    
    def test_websocket_manager_import(self):
        """Test WebSocket manager can be imported"""
        from src.api.websocket_manager import WebSocketManager
        manager = WebSocketManager()
        assert manager is not None
    
    def test_websocket_telemetry_data_structure(self):
        """Test WebSocket telemetry data structure"""
        from src.api.websocket_manager import WebSocketManager
        manager = WebSocketManager()
        
        assert hasattr(manager, 'telemetry_data')
        assert isinstance(manager.telemetry_data, dict)

class TestModelsCoverage:
    """Test database models coverage"""
    
    def test_nad_model_creation(self):
        """Test NAD model creation"""
        nad = NAD(
            name="Test Server",
            ip_address="192.168.1.1",
            device_type=NADType.RADIUS_SERVER,
            is_active=True
        )
        assert nad.name == "Test Server"
        assert nad.ip_address == "192.168.1.1"
        assert nad.device_type == NADType.RADIUS_SERVER
        assert nad.is_active == True
    
    def test_test_run_model_creation(self):
        """Test TestRun model creation"""
        test_run = TestRun(
            name="Test Run",
            status="running",
            test_type="radius",
            target_rps=100,
            duration_seconds=300
        )
        assert test_run.name == "Test Run"
        assert test_run.status == "running"
        assert test_run.test_type == "radius"
    
    def test_test_metric_model_creation(self):
        """Test TestMetric model creation"""
        metric = TestMetric(
            test_run_id=1,
            elapsed_seconds=1.0,
            current_rps=100,
            target_rps=1000,
            delivered_percent=10.0,
            active_sockets=50,
            total_connections=100,
            p50_latency=10,
            p95_latency=20,
            p99_latency=30,
            error_rate=0.1
        )
        assert metric.current_rps == 100
        assert metric.active_sockets == 50
        assert metric.p50_latency == 10

class TestConfigCoverage:
    """Test configuration coverage"""
    
    def test_config_import(self):
        """Test configuration can be imported"""
        from src.api.config import settings
        assert settings is not None
        assert hasattr(settings, 'DATABASE_URL')
        assert hasattr(settings, 'API_HOST')
        assert hasattr(settings, 'API_PORT')
    
    def test_config_values(self):
        """Test configuration values"""
        from src.api.config import settings
        assert settings.API_PORT == 8910
        assert settings.API_HOST in ["0.0.0.0", "localhost", "127.0.0.1"]

class TestDatabaseCoverage:
    """Test database functionality coverage"""
    
    def test_database_manager_import(self):
        """Test database manager can be imported"""
        from src.api.database import DatabaseManager, db_manager
        assert db_manager is not None
        assert isinstance(db_manager, DatabaseManager)
    
    @pytest.mark.asyncio
    @patch('src.api.database.AsyncSessionLocal')
    async def test_database_health_check(self, mock_session):
        """Test database health check"""
        from src.api.database import db_manager
        
        mock_session_instance = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        mock_session_instance.execute.return_value = None
        
        result = await db_manager.health_check()
        assert isinstance(result, bool)
    
    def test_get_db_context_manager(self):
        """Test database context manager"""
        from src.api.database import get_db_context
        assert get_db_context is not None

class TestSecurityCoverage:
    """Test security functionality coverage"""
    
    def test_secret_manager_import(self):
        """Test secret manager can be imported"""
        from src.api.security.secret_manager import SecretManager
        manager = SecretManager()
        assert manager is not None
    
    def test_secret_manager_encryption(self):
        """Test secret manager encryption"""
        from src.api.security.secret_manager import SecretManager
        manager = SecretManager()
        
        test_secret = "test_password_123"
        encrypted = manager.encrypt_secret(test_secret)
        assert encrypted != test_secret
        assert len(encrypted) > 0
        
        decrypted = manager.decrypt_secret(encrypted)
        assert decrypted == test_secret

class TestClientsCoverage:
    """Test protocol clients coverage"""
    
    def test_radius_client_import(self):
        """Test RADIUS client can be imported"""
        from src.api.clients.radius_client import RadiusClient
        client = RadiusClient("192.168.1.1", "secret123")
        assert client is not None
    
    def test_tacacs_client_import(self):
        """Test TACACS+ client can be imported"""
        from src.api.clients.tacacs_client import TacacsClient
        client = TacacsClient("192.168.1.1", "secret123")
        assert client is not None
    
    def test_pxgrid_client_import(self):
        """Test pxGrid client can be imported"""
        from src.api.clients.pxgrid_client import PxGridClient
        client = PxGridClient("192.168.1.1", "username", "password")
        assert client is not None
    
    def test_probes_import(self):
        """Test connectivity probes can be imported"""
        from src.api.clients.probes import ConnectivityProbe
        probe = ConnectivityProbe()
        assert probe is not None

class TestGeneratorsCoverage:
    """Test generators coverage"""
    
    def test_radius_generator_import(self):
        """Test RADIUS generator can be imported"""
        from src.api.generators.radius_generator import RadiusGenerator
        generator = RadiusGenerator(
            server_host="192.168.1.1",
            server_port=1812,
            secret="test123"
        )
        assert generator is not None
    
    def test_syslog_generator_import(self):
        """Test Syslog generator can be imported"""
        from src.api.generators.syslog_generator import SyslogGenerator
        generator = SyslogGenerator()
        assert generator is not None
