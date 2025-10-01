import asyncio
import socket
import struct
import hashlib
import secrets
from typing import Optional, Dict, Any, List, Tuple
import logging
import time

logger = logging.getLogger(__name__)


class RadiusClient:
    """RADIUS client for authentication and accounting"""
    
    def __init__(self, host: str, secret: str, auth_port: int = 1812, acct_port: int = 1813):
        self.host = host
        self.secret = secret.encode()
        self.auth_port = auth_port
        self.acct_port = acct_port
        
    async def authenticate(self, username: str, password: str, nas_ip: str = "127.0.0.1") -> Dict[str, Any]:
        """Perform RADIUS authentication"""
        try:
            start_time = time.time()
            
            packet = self._create_access_request(username, password, nas_ip)
            
            response = await self._send_packet(packet, self.auth_port)
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            if response:
                code = response[0]
                if code == 2:  # Access-Accept
                    return {
                        "success": True,
                        "message": "Authentication successful",
                        "latency_ms": latency_ms,
                        "response_code": "Access-Accept"
                    }
                elif code == 3:  # Access-Reject
                    return {
                        "success": False,
                        "message": "Authentication rejected",
                        "latency_ms": latency_ms,
                        "response_code": "Access-Reject"
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Unknown response code: {code}",
                        "latency_ms": latency_ms,
                        "response_code": f"Code-{code}"
                    }
            else:
                return {
                    "success": False,
                    "message": "No response from server",
                    "latency_ms": latency_ms,
                    "response_code": "Timeout"
                }
                
        except Exception as e:
            logger.error(f"RADIUS authentication failed: {e}")
            return {
                "success": False,
                "message": str(e),
                "latency_ms": 0,
                "response_code": "Error"
            }
    
    async def accounting(self, username: str, session_id: str, status_type: str = "Start") -> Dict[str, Any]:
        """Send RADIUS accounting packet"""
        try:
            start_time = time.time()
            
            packet = self._create_accounting_request(username, session_id, status_type)
            
            response = await self._send_packet(packet, self.acct_port)
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            if response:
                code = response[0]
                if code == 5:  # Accounting-Response
                    return {
                        "success": True,
                        "message": "Accounting successful",
                        "latency_ms": latency_ms,
                        "response_code": "Accounting-Response"
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Unexpected response code: {code}",
                        "latency_ms": latency_ms,
                        "response_code": f"Code-{code}"
                    }
            else:
                return {
                    "success": False,
                    "message": "No response from server",
                    "latency_ms": latency_ms,
                    "response_code": "Timeout"
                }
                
        except Exception as e:
            logger.error(f"RADIUS accounting failed: {e}")
            return {
                "success": False,
                "message": str(e),
                "latency_ms": 0,
                "response_code": "Error"
            }
    
    def _create_access_request(self, username: str, password: str, nas_ip: str) -> bytes:
        """Create RADIUS Access-Request packet"""
        identifier = secrets.randbits(8)
        authenticator = secrets.token_bytes(16)
        
        # Build attributes
        attributes = b""
        
        username_bytes = username.encode()
        attributes += struct.pack("!BB", 1, len(username_bytes) + 2) + username_bytes
        
        password_encrypted = self._encrypt_password(password, authenticator)
        attributes += struct.pack("!BB", 2, len(password_encrypted) + 2) + password_encrypted
        
        nas_ip_bytes = socket.inet_aton(nas_ip)
        attributes += struct.pack("!BB", 4, 6) + nas_ip_bytes
        
        attributes += struct.pack("!BBL", 6, 6, 8)
        
        # Calculate total length
        total_length = 20 + len(attributes)
        
        packet = struct.pack("!BBH", 1, identifier, total_length) + authenticator + attributes
        
        return packet
    
    def _create_accounting_request(self, username: str, session_id: str, status_type: str) -> bytes:
        """Create RADIUS Accounting-Request packet"""
        identifier = secrets.randbits(8)
        authenticator = b"\x00" * 16  # Will be calculated later
        
        # Build attributes
        attributes = b""
        
        username_bytes = username.encode()
        attributes += struct.pack("!BB", 1, len(username_bytes) + 2) + username_bytes
        
        status_map = {"Start": 1, "Stop": 2, "Interim-Update": 3}
        status_value = status_map.get(status_type, 1)
        attributes += struct.pack("!BBL", 40, 6, status_value)
        
        session_bytes = session_id.encode()
        attributes += struct.pack("!BB", 44, len(session_bytes) + 2) + session_bytes
        
        # Calculate total length
        total_length = 20 + len(attributes)
        
        packet = struct.pack("!BBH", 4, identifier, total_length) + authenticator + attributes
        
        request_auth = hashlib.md5(packet + self.secret).digest()
        
        packet = packet[:4] + request_auth + packet[20:]
        
        return packet
    
    def _encrypt_password(self, password: str, authenticator: bytes) -> bytes:
        """Encrypt password using RADIUS algorithm"""
        password_bytes = password.encode()
        
        # Pad password to multiple of 16 bytes
        while len(password_bytes) % 16 != 0:
            password_bytes += b"\x00"
        
        md5_hash = hashlib.md5(self.secret + authenticator).digest()
        
        encrypted = bytes(a ^ b for a, b in zip(password_bytes[:16], md5_hash))
        
        for i in range(16, len(password_bytes), 16):
            md5_hash = hashlib.md5(self.secret + encrypted[i-16:i]).digest()
            encrypted += bytes(a ^ b for a, b in zip(password_bytes[i:i+16], md5_hash))
        
        return encrypted
    
    async def _send_packet(self, packet: bytes, port: int) -> Optional[bytes]:
        """Send RADIUS packet and receive response"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(5.0)
            
            # Send packet
            sock.sendto(packet, (self.host, port))
            
            response, addr = sock.recvfrom(4096)
            sock.close()
            
            return response
            
        except socket.timeout:
            logger.warning(f"RADIUS timeout for {self.host}:{port}")
            return None
        except Exception as e:
            logger.error(f"RADIUS socket error: {e}")
            return None
        finally:
            try:
                sock.close()
            except:
                pass
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test RADIUS server connectivity"""
        try:
            result = await self.authenticate("test-user", "test-password")
            
            return {
                "success": result["latency_ms"] > 0,  # Got a response
                "message": "Server reachable" if result["latency_ms"] > 0 else "Server unreachable",
                "latency_ms": result["latency_ms"],
                "response_received": result["response_code"] != "Timeout"
            }
            
        except Exception as e:
            logger.error(f"RADIUS connection test failed: {e}")
            return {
                "success": False,
                "message": str(e),
                "latency_ms": 0,
                "response_received": False
            }
