import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from src.api.websocket_manager import WebSocketManager
from src.api.models import TestMetric, TestRun

class TestWebSocketRealData:
    """Test WebSocket manager with real data"""
    
    @pytest.fixture
    def websocket_manager(self):
        """Create WebSocket manager instance"""
        return WebSocketManager()
    
    @pytest.mark.asyncio
    @patch('src.api.websocket_manager.get_db')
    async def test_generate_telemetry_with_real_data(self, mock_get_db, websocket_manager):
        """Test telemetry generation uses real database data"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        mock_metric = MagicMock()
        mock_metric.requests_per_second = 1500
        mock_metric.latency_p50 = 25
        mock_metric.latency_p95 = 45
        mock_metric.latency_p99 = 80
        mock_metric.error_rate = 1.2
        mock_metric.active_connections = 75
        mock_metric.cpu_usage = 55
        mock_metric.memory_usage = 65
        mock_metric.network_throughput = 2.5
        mock_metric.timestamp.isoformat.return_value = "2024-01-01T10:30:00"
        
        mock_db.execute.return_value.scalars.return_value.all.return_value = [mock_metric]
        
        websocket_manager.running = True
        
        with patch('asyncio.sleep', side_effect=StopAsyncIteration):
            try:
                await websocket_manager.generate_telemetry()
            except StopAsyncIteration:
                pass
        
        assert websocket_manager.telemetry_data["rps"] == 1500
        assert websocket_manager.telemetry_data["latency_p50"] == 25
        assert websocket_manager.telemetry_data["error_rate"] == 1.2
        assert websocket_manager.telemetry_data["network_throughput"] == "2.5 Gbps"
    
    @pytest.mark.asyncio
    @patch('src.api.websocket_manager.get_db')
    async def test_generate_telemetry_with_empty_database(self, mock_get_db, websocket_manager):
        """Test telemetry generation handles empty database"""
        mock_db = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_db
        
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        
        websocket_manager.running = True
        
        with patch('asyncio.sleep', side_effect=StopAsyncIteration):
            try:
                await websocket_manager.generate_telemetry()
            except StopAsyncIteration:
                pass
        
        assert websocket_manager.telemetry_data["rps"] == 0
        assert websocket_manager.telemetry_data["latency_p50"] == 0
        assert websocket_manager.telemetry_data["error_rate"] == 0.0
        assert websocket_manager.telemetry_data["network_throughput"] == "0.0 Gbps"
    
    def test_no_mock_data_in_websocket_manager(self):
        """Test that WebSocket manager doesn't contain mock data generation"""
        from pathlib import Path
        
        websocket_file = Path(__file__).parent.parent.parent / "src" / "api" / "websocket_manager.py"
        content = websocket_file.read_text()
        
        mock_patterns = ["random.randint", "random.uniform", "Math.random"]
        for pattern in mock_patterns:
            assert pattern not in content, f"Mock pattern '{pattern}' found in websocket_manager.py"
        
        assert "from .database import get_db" in content
        assert "from .models import" in content
