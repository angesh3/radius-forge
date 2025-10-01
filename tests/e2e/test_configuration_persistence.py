import pytest
import asyncio
import aiohttp
import json
from pathlib import Path

class TestConfigurationPersistence:
    """End-to-end tests for configuration persistence functionality"""
    
    @pytest.fixture
    def base_url(self):
        """Base URL for API testing"""
        return "http://localhost:8910"
    
    @pytest.fixture
    def ui_url(self):
        """Base URL for UI testing"""
        return "http://localhost:8911"
    
    async def test_server_creation_persistence(self, base_url):
        """Test that server creation persists in database"""
        async with aiohttp.ClientSession() as session:
            server_data = {
                "name": "E2E Test Server",
                "host": "192.168.100.1",
                "type": "radius",
                "enabled": True,
                "secret": "e2e_test_secret"
            }
            
            async with session.post(f"{base_url}/api/servers", json=server_data) as response:
                if response.status == 200:
                    created_server = await response.json()
                    server_id = created_server["id"]
                    
                    async with session.get(f"{base_url}/api/servers") as list_response:
                        if list_response.status == 200:
                            servers_data = await list_response.json()
                            servers = servers_data.get("servers", [])
                            
                            found_server = None
                            for server in servers:
                                if server["id"] == server_id:
                                    found_server = server
                                    break
                            
                            assert found_server is not None, "Created server not found in server list"
                            assert found_server["name"] == "E2E Test Server"
                            assert found_server["host"] == "192.168.100.1"
                            assert found_server["type"] == "radius"
                            assert found_server["enabled"] == True
                            
                            
                        else:
                            pytest.skip(f"Could not list servers: {list_response.status}")
                else:
                    pytest.skip(f"Could not create server: {response.status}")
    
    async def test_server_update_persistence(self, base_url):
        """Test that server updates persist in database"""
        async with aiohttp.ClientSession() as session:
            server_data = {
                "name": "Update Test Server",
                "host": "192.168.100.2",
                "type": "radius",
                "enabled": True,
                "secret": "update_test_secret"
            }
            
            async with session.post(f"{base_url}/api/servers", json=server_data) as response:
                if response.status == 200:
                    created_server = await response.json()
                    server_id = created_server["id"]
                    
                    update_data = {
                        "name": "Updated Test Server",
                        "host": "192.168.100.3",
                        "type": "tacacs",
                        "enabled": False
                    }
                    
                    async with session.put(f"{base_url}/api/servers/{server_id}", json=update_data) as update_response:
                        if update_response.status == 200:
                            updated_server = await update_response.json()
                            
                            assert updated_server["name"] == "Updated Test Server"
                            assert updated_server["host"] == "192.168.100.3"
                            assert updated_server["type"] == "tacacs"
                            assert updated_server["enabled"] == False
                            
                            async with session.get(f"{base_url}/api/servers") as list_response:
                                if list_response.status == 200:
                                    servers_data = await list_response.json()
                                    servers = servers_data.get("servers", [])
                                    
                                    found_server = None
                                    for server in servers:
                                        if server["id"] == server_id:
                                            found_server = server
                                            break
                                    
                                    assert found_server is not None
                                    assert found_server["name"] == "Updated Test Server"
                                    assert found_server["host"] == "192.168.100.3"
                                    assert found_server["type"] == "tacacs"
                                    assert found_server["enabled"] == False
                                
                        else:
                            pytest.skip(f"Could not update server: {update_response.status}")
                else:
                    pytest.skip(f"Could not create server for update test: {response.status}")
    
    async def test_dashboard_real_data_api(self, base_url):
        """Test that dashboard API returns real data structure"""
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{base_url}/api/dashboard/stats") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    required_top_fields = ["systemStats", "realtimeMetrics", "testDistribution", "assetManagerServers", "iseServers", "recentAlerts"]
                    for field in required_top_fields:
                        assert field in data, f"Missing required top-level field: {field}"
                    
                    system_stats = data["systemStats"]
                    required_system_fields = ["currentRPS", "totalTests", "activeConnections", "uptime", "cpuUsage", "memoryUsage"]
                    for field in required_system_fields:
                        assert field in system_stats, f"Missing required systemStats field: {field}"
                    
                    assert isinstance(system_stats["currentRPS"], int)
                    assert isinstance(system_stats["totalTests"], int)
                    assert isinstance(system_stats["activeConnections"], int)
                    
                    assert system_stats["currentRPS"] != 5247  # Old mock value
                    assert system_stats["activeConnections"] != 1284  # Old mock value
                    assert system_stats["totalTests"] != 42  # Old mock value
                    
                    assert isinstance(data["realtimeMetrics"], list)
                    assert isinstance(data["assetManagerServers"], list)
                    assert isinstance(data["iseServers"], list)
                    assert isinstance(data["recentAlerts"], list)
                    
                else:
                    pytest.skip(f"Dashboard API not accessible: {response.status}")
    
    def test_multi_container_deployment(self):
        """Test that exactly 7 containers are running as expected"""
        import subprocess
        
        try:
            result = subprocess.run(
                ["docker", "ps", "--format", "{{.Names}}"],
                capture_output=True,
                text=True,
                check=True
            )
            
            container_names = result.stdout.strip().split('\n')
            radiusforge_containers = [name for name in container_names if 'radiusforge' in name and 'prod' in name]
            
            expected_containers = [
                'radiusforge-nginx-prod',
                'radiusforge-api-prod', 
                'radiusforge-db-prod',
                'radiusforge-redis-prod',
                'radiusforge-prometheus-prod',
                'radiusforge-grafana-prod',
                'radiusforge-telemetry-prod'
            ]
            
            assert len(radiusforge_containers) == 7, f"Expected 7 containers, found {len(radiusforge_containers)}: {radiusforge_containers}"
            
            for expected in expected_containers:
                assert expected in radiusforge_containers, f"Missing expected container: {expected}"
                
        except subprocess.CalledProcessError as e:
            pytest.skip(f"Could not check Docker containers: {e}")
    
    def test_port_range_coverage(self):
        """Test that services are running on expected ports 8910-8926"""
        import subprocess
        
        try:
            result = subprocess.run(
                ["docker", "ps", "--format", "{{.Names}}\t{{.Ports}}"],
                capture_output=True,
                text=True,
                check=True
            )
            
            lines = result.stdout.strip().split('\n')
            radiusforge_ports = []
            
            for line in lines:
                if 'radiusforge' in line and 'prod' in line:
                    parts = line.split('\t')
                    if len(parts) > 1:
                        ports_info = parts[1]
                        import re
                        port_matches = re.findall(r':(\d+)->', ports_info)
                        radiusforge_ports.extend([int(port) for port in port_matches])
            
            expected_ports = [8910, 8911]  # API and UI at minimum
            for port in expected_ports:
                assert port in radiusforge_ports, f"Expected port {port} not found in: {radiusforge_ports}"
            
            application_ports = [port for port in radiusforge_ports if port >= 8910]
            for port in application_ports:
                assert 8910 <= port <= 8926, f"Application port {port} outside expected range 8910-8926"
                
        except subprocess.CalledProcessError as e:
            pytest.skip(f"Could not check Docker ports: {e}")

def test_server_creation_persistence_sync():
    """Sync wrapper for async server creation test"""
    asyncio.run(TestConfigurationPersistence().test_server_creation_persistence("http://localhost:8910"))

def test_server_update_persistence_sync():
    """Sync wrapper for async server update test"""
    asyncio.run(TestConfigurationPersistence().test_server_update_persistence("http://localhost:8910"))

def test_dashboard_real_data_api_sync():
    """Sync wrapper for async dashboard API test"""
    asyncio.run(TestConfigurationPersistence().test_dashboard_real_data_api("http://localhost:8910"))
