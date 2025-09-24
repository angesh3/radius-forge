#!/usr/bin/env python3
"""
Unit Tests for RADIUS Packet Generator
Tests RADIUS packet creation, encoding, and parsing functionality
"""

import pytest
import struct
import hashlib
import socket
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from api.generators.radius_generator import (
    RADIUSGenerator, RADIUSPacket, RADIUSCode, RADIUSAttribute, RADIUSMetrics
)


class TestRADIUSPacket:
    """Test RADIUS packet structure and operations"""
    
    @pytest.mark.unit
    def test_packet_creation(self):
        """Test creating a RADIUS packet"""
        packet = RADIUSPacket(
            code=RADIUSCode.ACCESS_REQUEST,
            identifier=123,
            length=20,
            authenticator=b'\x01' * 16,
            attributes={1: b'testuser'}
        )
        
        assert packet.code == RADIUSCode.ACCESS_REQUEST
        assert packet.identifier == 123
        assert packet.length == 20
        assert len(packet.authenticator) == 16
        assert packet.attributes[1] == b'testuser'
    
    @pytest.mark.unit
    def test_packet_to_bytes(self):
        """Test converting packet to bytes"""
        packet = RADIUSPacket(
            code=RADIUSCode.ACCESS_REQUEST,
            identifier=42,
            length=0,  # Will be calculated
            authenticator=b'\x01' * 16,
            attributes={1: b'test'}  # User-Name
        )
        
        secret = "testing123"
        packet_bytes = packet.to_bytes(secret)
        
        # Verify packet structure
        assert len(packet_bytes) >= 20  # Minimum RADIUS packet size
        assert packet_bytes[0] == RADIUSCode.ACCESS_REQUEST.value
        assert packet_bytes[1] == 42  # Identifier
        
        # Verify length field
        expected_length = 20 + 2 + 4  # Header + attribute header + value
        actual_length = struct.unpack('!H', packet_bytes[2:4])[0]
        assert actual_length == expected_length
    
    @pytest.mark.unit
    def test_packet_from_bytes(self):
        """Test parsing packet from bytes"""
        # Create a minimal RADIUS packet
        code = RADIUSCode.ACCESS_ACCEPT.value
        identifier = 99
        length = 26  # 20 header + 6 attribute
        authenticator = b'\x02' * 16
        attr_type = 18  # Reply-Message
        attr_length = 6
        attr_value = b'OK'
        
        packet_data = struct.pack('!BBH16sBB', 
                                 code, identifier, length, authenticator,
                                 attr_type, attr_length) + attr_value
        
        packet = RADIUSPacket.from_bytes(packet_data)
        
        assert packet.code == RADIUSCode.ACCESS_ACCEPT
        assert packet.identifier == 99
        assert packet.length == 26
        assert packet.authenticator == authenticator
        assert packet.attributes[18] == attr_value
    
    @pytest.mark.unit
    def test_packet_from_bytes_invalid(self):
        """Test parsing invalid packet data"""
        # Too short packet
        with pytest.raises(ValueError, match="RADIUS packet too short"):
            RADIUSPacket.from_bytes(b'\x01\x02\x03')
    
    @pytest.mark.unit
    def test_packet_attribute_parsing(self):
        """Test parsing multiple attributes"""
        packet = RADIUSPacket(
            code=RADIUSCode.ACCESS_REQUEST,
            identifier=1,
            length=0,
            authenticator=b'\x01' * 16,
            attributes={
                1: b'username',      # User-Name
                2: b'password',      # User-Password (encoded)
                4: socket.inet_aton('192.168.1.1'),  # NAS-IP-Address
                5: struct.pack('!I', 1)  # NAS-Port
            }
        )
        
        packet_bytes = packet.to_bytes("secret")
        parsed = RADIUSPacket.from_bytes(packet_bytes)
        
        assert parsed.attributes[1] == b'username'
        assert parsed.attributes[2] == b'password'
        assert len(parsed.attributes) == 4


class TestRADIUSMetrics:
    """Test RADIUS metrics calculation"""
    
    @pytest.mark.unit
    def test_metrics_initialization(self):
        """Test metrics initialization"""
        metrics = RADIUSMetrics()
        
        assert metrics.packets_sent == 0
        assert metrics.packets_received == 0
        assert metrics.success_rate == 0.0
        assert metrics.error_rate == 0.0
        assert metrics.timeout_rate == 0.0
        assert metrics.latencies == []
    
    @pytest.mark.unit
    def test_success_rate_calculation(self):
        """Test success rate calculation"""
        metrics = RADIUSMetrics()
        metrics.packets_sent = 100
        metrics.access_accepts = 95
        
        assert metrics.success_rate == 95.0
        
        # Test zero division
        metrics.packets_sent = 0
        assert metrics.success_rate == 0.0
    
    @pytest.mark.unit
    def test_error_rate_calculation(self):
        """Test error rate calculation"""
        metrics = RADIUSMetrics()
        metrics.packets_sent = 100
        metrics.access_rejects = 3
        metrics.errors = 2
        
        assert metrics.error_rate == 5.0  # (3 + 2) / 100 * 100
    
    @pytest.mark.unit
    def test_timeout_rate_calculation(self):
        """Test timeout rate calculation"""
        metrics = RADIUSMetrics()
        metrics.packets_sent = 100
        metrics.timeouts = 5
        
        assert metrics.timeout_rate == 5.0
    
    @pytest.mark.unit
    def test_latency_calculations(self):
        """Test latency percentile calculations"""
        metrics = RADIUSMetrics()
        metrics.latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
        
        assert metrics.avg_latency_ms == 55.0
        assert metrics.p95_latency_ms == 100  # 95th percentile
        assert metrics.p99_latency_ms == 100  # 99th percentile
        
        # Test empty latencies
        metrics.latencies = []
        assert metrics.avg_latency_ms == 0.0
        assert metrics.p95_latency_ms == 0.0
        assert metrics.p99_latency_ms == 0.0


class TestRADIUSGenerator:
    """Test RADIUS generator functionality"""
    
    @pytest.fixture
    def generator(self):
        """Create RADIUS generator for testing"""
        return RADIUSGenerator(
            server_host="127.0.0.1",
            server_port=1812,
            secret="testing123",
            nas_ip="192.168.1.100",
            nas_identifier="TestNAS"
        )
    
    @pytest.mark.unit
    def test_generator_initialization(self, generator):
        """Test generator initialization"""
        assert generator.server_host == "127.0.0.1"
        assert generator.server_port == 1812
        assert generator.secret == "testing123"
        assert generator.nas_ip == "192.168.1.100"
        assert generator.nas_identifier == "TestNAS"
        assert generator.identifier_counter == 0
        assert not generator.is_running
    
    @pytest.mark.unit
    def test_identifier_generation(self, generator):
        """Test packet identifier generation"""
        id1 = generator.get_next_identifier()
        id2 = generator.get_next_identifier()
        id3 = generator.get_next_identifier()
        
        assert id1 == 1
        assert id2 == 2
        assert id3 == 3
        
        # Test wrap-around at 256
        generator.identifier_counter = 255
        next_id = generator.get_next_identifier()
        assert next_id == 0
    
    @pytest.mark.unit
    def test_request_authenticator_creation(self, generator):
        """Test request authenticator creation"""
        auth1 = generator.create_request_authenticator()
        auth2 = generator.create_request_authenticator()
        
        assert len(auth1) == 16
        assert len(auth2) == 16
        assert auth1 != auth2  # Should be random
    
    @pytest.mark.unit
    def test_password_encoding(self, generator):
        """Test PAP password encoding"""
        password = "testpass"
        authenticator = b'\x01' * 16
        
        encoded = generator.encode_password(password, authenticator)
        
        # Verify encoding properties
        assert len(encoded) >= len(password)
        assert len(encoded) % 16 == 0  # Padded to 16-byte boundary
        assert encoded != password.encode()  # Should be encoded
    
    @pytest.mark.unit
    def test_access_request_creation(self, generator):
        """Test Access-Request packet creation"""
        username = "testuser"
        password = "testpass"
        nas_port = 5
        
        packet = generator.create_access_request(username, password, nas_port)
        
        assert packet.code == RADIUSCode.ACCESS_REQUEST
        assert packet.identifier > 0
        assert len(packet.authenticator) == 16
        
        # Verify required attributes
        assert RADIUSAttribute.USER_NAME.value in packet.attributes
        assert RADIUSAttribute.USER_PASSWORD.value in packet.attributes
        assert RADIUSAttribute.NAS_IP_ADDRESS.value in packet.attributes
        assert RADIUSAttribute.NAS_PORT.value in packet.attributes
        assert RADIUSAttribute.NAS_IDENTIFIER.value in packet.attributes
        
        # Verify attribute values
        assert packet.attributes[RADIUSAttribute.USER_NAME.value] == username.encode()
        assert packet.attributes[RADIUSAttribute.NAS_IDENTIFIER.value] == b"TestNAS"
    
    @pytest.mark.unit
    def test_accounting_request_creation(self, generator):
        """Test Accounting-Request packet creation"""
        username = "testuser"
        session_id = "session123"
        status_type = 1  # Start
        nas_port = 10
        
        packet = generator.create_accounting_request(username, session_id, status_type, nas_port)
        
        assert packet.code == RADIUSCode.ACCOUNTING_REQUEST
        assert packet.identifier > 0
        
        # Verify required attributes
        assert RADIUSAttribute.USER_NAME.value in packet.attributes
        assert RADIUSAttribute.ACCT_STATUS_TYPE.value in packet.attributes
        assert RADIUSAttribute.ACCT_SESSION_ID.value in packet.attributes
        assert RADIUSAttribute.NAS_IP_ADDRESS.value in packet.attributes
        
        # Verify attribute values
        assert packet.attributes[RADIUSAttribute.USER_NAME.value] == username.encode()
        assert packet.attributes[RADIUSAttribute.ACCT_SESSION_ID.value] == session_id.encode()
    
    @pytest.mark.unit
    async def test_socket_creation(self, generator):
        """Test UDP socket creation"""
        with patch('socket.socket') as mock_socket:
            mock_sock = Mock()
            mock_socket.return_value = mock_sock
            
            sock = await generator.create_socket()
            
            mock_socket.assert_called_once_with(socket.AF_INET, socket.SOCK_DGRAM)
            mock_sock.settimeout.assert_called_once_with(5.0)
    
    @pytest.mark.unit
    async def test_authentication_success(self, generator):
        """Test successful user authentication"""
        with patch.object(generator, 'send_packet') as mock_send:
            # Mock successful response
            response = RADIUSPacket(
                code=RADIUSCode.ACCESS_ACCEPT,
                identifier=1,
                length=20,
                authenticator=b'\x01' * 16,
                attributes={}
            )
            mock_send.return_value = response
            
            result = await generator.authenticate_user("testuser", "testpass")
            
            assert result is True
            mock_send.assert_called_once()
    
    @pytest.mark.unit
    async def test_authentication_failure(self, generator):
        """Test failed user authentication"""
        with patch.object(generator, 'send_packet') as mock_send:
            # Mock reject response
            response = RADIUSPacket(
                code=RADIUSCode.ACCESS_REJECT,
                identifier=1,
                length=20,
                authenticator=b'\x01' * 16,
                attributes={}
            )
            mock_send.return_value = response
            
            result = await generator.authenticate_user("testuser", "wrongpass")
            
            assert result is False
    
    @pytest.mark.unit
    async def test_authentication_timeout(self, generator):
        """Test authentication timeout"""
        with patch.object(generator, 'send_packet') as mock_send:
            mock_send.return_value = None  # Timeout
            
            result = await generator.authenticate_user("testuser", "testpass")
            
            assert result is False
    
    @pytest.mark.unit
    async def test_session_management(self, generator):
        """Test accounting session start/stop"""
        session_id = "test_session_123"
        username = "testuser"
        
        with patch.object(generator, 'send_packet') as mock_send:
            # Mock accounting response
            response = RADIUSPacket(
                code=RADIUSCode.ACCOUNTING_RESPONSE,
                identifier=1,
                length=20,
                authenticator=b'\x01' * 16,
                attributes={}
            )
            mock_send.return_value = response
            
            # Start session
            start_result = await generator.start_session(username, session_id)
            assert start_result is True
            assert session_id in generator.active_sessions
            
            # Stop session
            stop_result = await generator.stop_session(session_id)
            assert stop_result is True
            assert session_id not in generator.active_sessions
    
    @pytest.mark.unit
    def test_metrics_tracking(self, generator):
        """Test metrics tracking functionality"""
        metrics_dict = generator.get_metrics()
        
        # Verify all expected metrics are present
        expected_metrics = [
            'packets_sent', 'packets_received', 'access_accepts',
            'access_rejects', 'access_challenges', 'timeouts', 'errors',
            'success_rate', 'error_rate', 'timeout_rate',
            'avg_latency_ms', 'min_latency_ms', 'max_latency_ms',
            'p95_latency_ms', 'p99_latency_ms', 'active_sessions'
        ]
        
        for metric in expected_metrics:
            assert metric in metrics_dict
        
        # Verify initial values
        assert metrics_dict['packets_sent'] == 0
        assert metrics_dict['success_rate'] == 0.0
        assert metrics_dict['active_sessions'] == 0
    
    @pytest.mark.unit
    def test_stop_test(self, generator):
        """Test stopping running test"""
        generator.is_running = True
        generator.stop_test()
        assert generator.is_running is False


class TestRADIUSProtocolCompliance:
    """Test RADIUS protocol compliance"""
    
    @pytest.mark.unit
    def test_packet_size_limits(self):
        """Test RADIUS packet size constraints"""
        # Test minimum packet size (header only)
        packet = RADIUSPacket(
            code=RADIUSCode.ACCESS_REQUEST,
            identifier=1,
            length=20,
            authenticator=b'\x01' * 16,
            attributes={}
        )
        
        packet_bytes = packet.to_bytes("secret")
        assert len(packet_bytes) == 20
        
        # Test packet with attributes
        packet.attributes = {1: b'test' * 50}  # Large attribute
        packet_bytes = packet.to_bytes("secret")
        assert len(packet_bytes) > 20
    
    @pytest.mark.unit
    def test_attribute_encoding(self):
        """Test RADIUS attribute encoding"""
        packet = RADIUSPacket(
            code=RADIUSCode.ACCESS_REQUEST,
            identifier=1,
            length=0,
            authenticator=b'\x01' * 16,
            attributes={
                1: b'username',  # String attribute
                4: socket.inet_aton('10.0.0.1'),  # IP address
                5: struct.pack('!I', 123)  # Integer
            }
        )
        
        packet_bytes = packet.to_bytes("secret")
        parsed = RADIUSPacket.from_bytes(packet_bytes)
        
        assert parsed.attributes[1] == b'username'
        assert parsed.attributes[4] == socket.inet_aton('10.0.0.1')
        assert parsed.attributes[5] == struct.pack('!I', 123)
    
    @pytest.mark.unit
    def test_response_authenticator(self):
        """Test response authenticator calculation"""
        # Create response packet
        packet = RADIUSPacket(
            code=RADIUSCode.ACCESS_ACCEPT,
            identifier=42,
            length=0,
            authenticator=b'\x01' * 16,  # Request authenticator
            attributes={18: b'Welcome'}
        )
        
        secret = "sharedsecret"
        packet_bytes = packet.to_bytes(secret)
        
        # Extract response authenticator
        response_auth = packet_bytes[4:20]
        
        # Verify it's not the same as request authenticator
        assert response_auth != packet.authenticator
        
        # Verify it's correctly calculated (16 bytes)
        assert len(response_auth) == 16