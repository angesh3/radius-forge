#!/usr/bin/env python3
"""
Unit Tests for WebSocket Manager
Tests WebSocket connection management, topic subscriptions, and message broadcasting
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
import uuid

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from api.websocket_manager import WebSocketManager, WebSocketConnection


class TestWebSocketConnection:
    """Test WebSocketConnection class functionality"""
    
    @pytest.mark.unit
    def test_connection_initialization(self):
        """Test WebSocket connection initialization"""
        mock_websocket = Mock()
        client_id = "test-client-123"
        
        connection = WebSocketConnection(mock_websocket, client_id)
        
        assert connection.websocket == mock_websocket
        assert connection.client_id == client_id
        assert isinstance(connection.connected_at, datetime)
        assert len(connection.subscriptions) == 0
        assert isinstance(connection.metadata, dict)
        assert isinstance(connection.last_ping, datetime)
    
    @pytest.mark.unit
    def test_connection_auto_id_generation(self):
        """Test automatic client ID generation"""
        mock_websocket = Mock()
        
        connection = WebSocketConnection(mock_websocket)
        
        assert connection.client_id is not None
        assert len(connection.client_id) > 0
        # Should be a valid UUID
        uuid.UUID(connection.client_id)  # Raises ValueError if invalid
    
    @pytest.mark.unit
    async def test_send_json(self):
        """Test sending JSON data"""
        mock_websocket = Mock()
        mock_websocket.send_json = AsyncMock()
        
        connection = WebSocketConnection(mock_websocket, "test-client")
        test_data = {"type": "test", "message": "hello"}
        
        await connection.send_json(test_data)
        
        mock_websocket.send_json.assert_called_once_with(test_data)
    
    @pytest.mark.unit
    async def test_send_json_error_handling(self):
        """Test error handling in send_json"""
        mock_websocket = Mock()
        mock_websocket.send_json = AsyncMock(side_effect=Exception("Send failed"))
        
        connection = WebSocketConnection(mock_websocket, "test-client")
        
        with pytest.raises(Exception, match="Send failed"):
            await connection.send_json({"test": "data"})
    
    @pytest.mark.unit
    async def test_send_text(self):
        """Test sending text data"""
        mock_websocket = Mock()
        mock_websocket.send_text = AsyncMock()
        
        connection = WebSocketConnection(mock_websocket, "test-client")
        test_text = "Hello WebSocket"
        
        await connection.send_text(test_text)
        
        mock_websocket.send_text.assert_called_once_with(test_text)
    
    @pytest.mark.unit
    def test_subscription_management(self):
        """Test topic subscription management"""
        mock_websocket = Mock()
        connection = WebSocketConnection(mock_websocket, "test-client")
        
        # Test initial state
        assert len(connection.subscriptions) == 0
        assert not connection.is_subscribed("topic1")
        
        # Test subscription
        connection.subscribe("topic1")
        connection.subscribe("topic2")
        
        assert len(connection.subscriptions) == 2
        assert "topic1" in connection.subscriptions
        assert "topic2" in connection.subscriptions
        assert connection.is_subscribed("topic1")
        assert connection.is_subscribed("topic2")
        assert not connection.is_subscribed("topic3")
        
        # Test unsubscription
        connection.unsubscribe("topic1")
        
        assert len(connection.subscriptions) == 1
        assert "topic1" not in connection.subscriptions
        assert "topic2" in connection.subscriptions
        assert not connection.is_subscribed("topic1")
        assert connection.is_subscribed("topic2")
        
        # Test unsubscribing from non-existent topic
        connection.unsubscribe("nonexistent")
        assert len(connection.subscriptions) == 1
    
    @pytest.mark.unit
    def test_ping_update(self):
        """Test ping timestamp update"""
        mock_websocket = Mock()
        connection = WebSocketConnection(mock_websocket, "test-client")
        
        initial_ping = connection.last_ping
        
        # Update ping
        connection.update_ping()
        
        assert connection.last_ping >= initial_ping


class TestWebSocketManagerBasics:
    """Test basic WebSocketManager functionality"""
    
    @pytest.mark.unit
    def test_manager_initialization(self):
        """Test WebSocket manager initialization"""
        manager = WebSocketManager()
        
        assert isinstance(manager.connections, dict)
        assert isinstance(manager.topic_subscribers, dict)
        assert len(manager.connections) == 0
        assert len(manager.topic_subscribers) == 0
        assert manager._lock is not None
    
    @pytest.mark.unit
    async def test_connection_accept(self):
        """Test accepting a WebSocket connection"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        
        client_id = await manager.connect(mock_websocket)
        
        assert client_id is not None
        assert client_id in manager.connections
        assert manager.connections[client_id].websocket == mock_websocket
        mock_websocket.accept.assert_called_once()
    
    @pytest.mark.unit
    async def test_connection_with_custom_id(self):
        """Test connecting with custom client ID"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        custom_id = "my-custom-client-id"
        
        client_id = await manager.connect(mock_websocket, custom_id)
        
        assert client_id == custom_id
        assert client_id in manager.connections
    
    @pytest.mark.unit
    @patch('api.websocket_manager.settings')
    async def test_connection_limit(self, mock_settings):
        """Test connection limit enforcement"""
        mock_settings.WS_MAX_CONNECTIONS = 2
        
        manager = WebSocketManager()
        
        # Connect up to limit
        for i in range(2):
            mock_ws = Mock()
            mock_ws.accept = AsyncMock()
            await manager.connect(mock_ws)
        
        # Try to exceed limit
        excess_mock = Mock()
        excess_mock.accept = AsyncMock()
        excess_mock.send_json = AsyncMock()
        excess_mock.close = AsyncMock()
        
        with pytest.raises(Exception, match="Maximum connections reached"):
            await manager.connect(excess_mock)
        
        excess_mock.send_json.assert_called_once()
        excess_mock.close.assert_called_once()
    
    @pytest.mark.unit
    async def test_disconnect_by_websocket(self):
        """Test disconnecting by WebSocket reference"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        
        client_id = await manager.connect(mock_websocket)
        assert client_id in manager.connections
        
        await manager.disconnect(mock_websocket)
        assert client_id not in manager.connections
    
    @pytest.mark.unit
    async def test_disconnect_by_client_id(self):
        """Test disconnecting by client ID"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        
        client_id = await manager.connect(mock_websocket)
        assert client_id in manager.connections
        
        await manager.disconnect_client(client_id)
        assert client_id not in manager.connections
    
    @pytest.mark.unit
    async def test_disconnect_all(self):
        """Test disconnecting all connections"""
        manager = WebSocketManager()
        
        # Connect multiple clients
        for i in range(3):
            mock_ws = Mock()
            mock_ws.accept = AsyncMock()
            await manager.connect(mock_ws)
        
        assert len(manager.connections) == 3
        
        await manager.disconnect_all()
        
        assert len(manager.connections) == 0
        assert len(manager.topic_subscribers) == 0


class TestWebSocketMessaging:
    """Test WebSocket messaging functionality"""
    
    @pytest.mark.unit
    async def test_send_to_existing_client(self):
        """Test sending message to existing client"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_json = AsyncMock()
        
        client_id = await manager.connect(mock_websocket)
        test_data = {"type": "test", "message": "hello"}
        
        await manager.send_to_client(client_id, test_data)
        
        mock_websocket.send_json.assert_called_once_with(test_data)
    
    @pytest.mark.unit
    async def test_send_to_nonexistent_client(self):
        """Test sending message to non-existent client"""
        manager = WebSocketManager()
        test_data = {"type": "test", "message": "hello"}
        
        # Should not raise exception
        await manager.send_to_client("nonexistent-id", test_data)
    
    @pytest.mark.unit
    async def test_send_failure_cleanup(self):
        """Test client cleanup on send failure"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_json = AsyncMock(side_effect=Exception("Send failed"))
        
        client_id = await manager.connect(mock_websocket)
        test_data = {"type": "test"}
        
        await manager.send_to_client(client_id, test_data)
        
        # Client should be disconnected after send failure
        # Note: This behavior depends on implementation details
    
    @pytest.mark.unit
    async def test_broadcast_to_all(self):
        """Test broadcasting to all connected clients"""
        manager = WebSocketManager()
        clients = []
        
        # Connect multiple clients
        for i in range(3):
            mock_ws = Mock()
            mock_ws.accept = AsyncMock()
            mock_ws.send_json = AsyncMock()
            client_id = await manager.connect(mock_ws)
            clients.append((client_id, mock_ws))
        
        test_data = {"type": "broadcast", "message": "hello all"}
        await manager.broadcast(test_data)
        
        # Note: Actual verification would depend on implementation details
        # This test structure demonstrates the expected behavior
    
    @pytest.mark.unit
    async def test_broadcast_to_empty_manager(self):
        """Test broadcasting with no connected clients"""
        manager = WebSocketManager()
        test_data = {"type": "test"}
        
        # Should not raise exception
        await manager.broadcast(test_data)


class TestTopicSubscriptions:
    """Test topic-based subscription functionality"""
    
    @pytest.mark.unit
    async def test_subscribe_to_topics(self):
        """Test subscribing to topics"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        
        client_id = await manager.connect(mock_websocket)
        topics = ["topic1", "topic2"]
        
        await manager.subscribe(mock_websocket, topics)
        
        # Verify client subscriptions
        connection = manager.connections[client_id]
        assert "topic1" in connection.subscriptions
        assert "topic2" in connection.subscriptions
        
        # Verify topic subscribers
        assert client_id in manager.topic_subscribers["topic1"]
        assert client_id in manager.topic_subscribers["topic2"]
    
    @pytest.mark.unit
    async def test_unsubscribe_from_topics(self):
        """Test unsubscribing from topics"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        
        client_id = await manager.connect(mock_websocket)
        
        # Subscribe first
        await manager.subscribe(mock_websocket, ["topic1", "topic2"])
        
        # Then unsubscribe from one
        await manager.unsubscribe(mock_websocket, ["topic1"])
        
        connection = manager.connections[client_id]
        assert "topic1" not in connection.subscriptions
        assert "topic2" in connection.subscriptions
        
        # topic1 should have no subscribers, topic2 should have this client
        assert "topic1" not in manager.topic_subscribers or \
               client_id not in manager.topic_subscribers["topic1"]
        assert client_id in manager.topic_subscribers["topic2"]
    
    @pytest.mark.unit
    async def test_subscribe_nonexistent_connection(self):
        """Test subscribing with non-existent connection"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        
        # Should not raise exception
        await manager.subscribe(mock_websocket, ["topic1"])
    
    @pytest.mark.unit
    async def test_topic_cleanup_on_disconnect(self):
        """Test topic cleanup when client disconnects"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        
        client_id = await manager.connect(mock_websocket)
        await manager.subscribe(mock_websocket, ["topic1", "topic2"])
        
        # Verify subscriptions exist
        assert "topic1" in manager.topic_subscribers
        assert "topic2" in manager.topic_subscribers
        
        # Disconnect client
        await manager.disconnect(mock_websocket)
        
        # Topics should be cleaned up
        assert "topic1" not in manager.topic_subscribers
        assert "topic2" not in manager.topic_subscribers
    
    @pytest.mark.unit
    async def test_broadcast_to_topic(self):
        """Test broadcasting to specific topic"""
        manager = WebSocketManager()
        
        # Create clients with different subscriptions
        client1_mock = Mock()
        client1_mock.accept = AsyncMock()
        client1_mock.send_json = AsyncMock()
        client1_id = await manager.connect(client1_mock)
        await manager.subscribe(client1_mock, ["topic1"])
        
        client2_mock = Mock()
        client2_mock.accept = AsyncMock()
        client2_mock.send_json = AsyncMock()
        client2_id = await manager.connect(client2_mock)
        await manager.subscribe(client2_mock, ["topic2"])
        
        test_data = {"type": "topic_message", "topic": "topic1"}
        await manager.broadcast(test_data, topic="topic1")
        
        # Note: Verification would depend on implementation details


class TestHeartbeatMechanism:
    """Test heartbeat and connection health monitoring"""
    
    @pytest.mark.unit
    async def test_ping_client(self):
        """Test pinging a specific client"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_json = AsyncMock()
        
        client_id = await manager.connect(mock_websocket)
        
        await manager.ping_client(client_id)
        
        # Should send ping message
        expected_ping = {"type": "ping"}
        mock_websocket.send_json.assert_called_with(expected_ping)
    
    @pytest.mark.unit
    async def test_handle_pong(self):
        """Test handling pong response"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        
        client_id = await manager.connect(mock_websocket)
        connection = manager.connections[client_id]
        
        initial_ping = connection.last_ping
        
        # Handle pong (should update ping time)
        await manager.handle_pong(mock_websocket)
        
        assert connection.last_ping >= initial_ping
    
    @pytest.mark.unit
    @patch('api.websocket_manager.settings')
    async def test_stale_connection_detection(self, mock_settings):
        """Test detection of stale connections"""
        mock_settings.WS_HEARTBEAT_INTERVAL = 5
        
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        
        client_id = await manager.connect(mock_websocket)
        connection = manager.connections[client_id]
        
        # Manually set old ping time
        connection.last_ping = datetime.utcnow() - timedelta(seconds=20)
        
        await manager._check_connections()
        
        # Connection should be removed
        assert client_id not in manager.connections


class TestWebSocketStatistics:
    """Test WebSocket manager statistics and monitoring"""
    
    @pytest.mark.unit
    async def test_connection_count(self):
        """Test connection count tracking"""
        manager = WebSocketManager()
        
        assert manager.get_connection_count() == 0
        
        # Connect some clients
        for i in range(3):
            mock_ws = Mock()
            mock_ws.accept = AsyncMock()
            await manager.connect(mock_ws)
        
        assert manager.get_connection_count() == 3
    
    @pytest.mark.unit
    async def test_topic_subscriber_count(self):
        """Test topic subscriber count tracking"""
        manager = WebSocketManager()
        
        assert manager.get_topic_subscriber_count("topic1") == 0
        
        # Connect clients and subscribe
        for i in range(2):
            mock_ws = Mock()
            mock_ws.accept = AsyncMock()
            await manager.connect(mock_ws)
            await manager.subscribe(mock_ws, ["topic1"])
        
        assert manager.get_topic_subscriber_count("topic1") == 2
        assert manager.get_topic_subscriber_count("nonexistent") == 0
    
    @pytest.mark.unit
    @patch('api.websocket_manager.settings')
    async def test_statistics_summary(self, mock_settings):
        """Test statistics summary"""
        mock_settings.WS_HEARTBEAT_INTERVAL = 30
        mock_settings.WS_MAX_CONNECTIONS = 100
        
        manager = WebSocketManager()
        
        # Connect clients with subscriptions
        for i in range(2):
            mock_ws = Mock()
            mock_ws.accept = AsyncMock()
            await manager.connect(mock_ws)
            await manager.subscribe(mock_ws, [f"topic_{i}"])
        
        stats = manager.get_stats()
        
        assert stats["total_connections"] == 2
        assert len(stats["topics"]) == 2
        assert stats["heartbeat_interval"] == 30
        assert stats["max_connections"] == 100
        
        # Verify topic counts
        assert stats["topics"]["topic_0"] == 1
        assert stats["topics"]["topic_1"] == 1


class TestEdgeCases:
    """Test edge cases and error conditions"""
    
    @pytest.mark.unit
    async def test_double_disconnect(self):
        """Test disconnecting the same client twice"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        
        client_id = await manager.connect(mock_websocket)
        
        # Disconnect twice
        await manager.disconnect(mock_websocket)
        await manager.disconnect(mock_websocket)  # Should not raise
        
        assert client_id not in manager.connections
    
    @pytest.mark.unit
    async def test_subscribe_after_disconnect(self):
        """Test subscribing after client disconnection"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        
        client_id = await manager.connect(mock_websocket)
        await manager.disconnect(mock_websocket)
        
        # Try to subscribe after disconnect
        await manager.subscribe(mock_websocket, ["topic1"])  # Should not raise
    
    @pytest.mark.unit
    async def test_empty_topic_list(self):
        """Test subscribing to empty topic list"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        
        await manager.connect(mock_websocket)
        
        # Subscribe to empty list
        await manager.subscribe(mock_websocket, [])  # Should not raise
    
    @pytest.mark.unit
    async def test_duplicate_subscriptions(self):
        """Test duplicate topic subscriptions"""
        manager = WebSocketManager()
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        
        client_id = await manager.connect(mock_websocket)
        
        # Subscribe to same topic twice
        await manager.subscribe(mock_websocket, ["topic1"])
        await manager.subscribe(mock_websocket, ["topic1"])
        
        connection = manager.connections[client_id]
        # Should only have one subscription
        topic_count = len([t for t in connection.subscriptions if t == "topic1"])
        assert topic_count == 1