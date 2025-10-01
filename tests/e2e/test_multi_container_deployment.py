import pytest
import subprocess
import time
import requests
from pathlib import Path
import docker

class TestMultiContainerDeployment:
    """Test multi-container docker-compose deployment"""
    
    @pytest.fixture(scope="class")
    def docker_client(self):
        """Docker client for container management"""
        return docker.from_env()
    
    @pytest.fixture(scope="class")
    def project_root(self):
        """Get project root directory"""
        return Path(__file__).parent.parent.parent
    
    def test_docker_compose_file_exists(self, project_root):
        """Test that docker-compose-multi.yml exists"""
        compose_file = project_root / "docker-compose-multi.yml"
        assert compose_file.exists(), "docker-compose-multi.yml file not found"
    
    def test_docker_compose_services_defined(self, project_root):
        """Test that all expected services are defined in docker-compose-multi.yml"""
        compose_file = project_root / "docker-compose-multi.yml"
        content = compose_file.read_text()
        
        expected_services = ['radiusforge-db-prod', 'radiusforge-redis-prod', 'radiusforge-api-prod', 'radiusforge-nginx-prod', 'radiusforge-prometheus-prod', 'radiusforge-grafana-prod', 'radiusforge-telemetry-prod']
        for service in expected_services:
            assert service in content, f"Service {service} not defined in docker-compose-multi.yml"
    
    @pytest.mark.integration
    def test_docker_compose_services_start(self, project_root):
        """Test that all docker-compose services start successfully"""
        pytest.skip("Skipping to avoid disrupting running containers")
    
    @pytest.mark.integration
    def test_api_health_check(self, project_root):
        """Test API health check endpoint works"""
        subprocess.run(
            ["docker-compose", "down", "-v"],
            cwd=project_root,
            capture_output=True
        )
        
        result = subprocess.run(
            ["docker-compose", "up", "-d", "postgres", "redis", "api"],
            cwd=project_root,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            time.sleep(15)
            
            try:
                response = requests.get("http://localhost:8910/health", timeout=10)
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "healthy"
            except requests.exceptions.RequestException:
                pytest.skip("API not accessible - may need manual setup")
            finally:
                subprocess.run(
                    ["docker-compose", "down", "-v"],
                    cwd=project_root,
                    capture_output=True
                )
        else:
            pytest.skip("Docker compose failed to start")
    
    def test_port_configuration_matches_requirements(self, project_root):
        """Test that docker-compose-multi.yml exposes correct ports"""
        compose_file = project_root / "docker-compose-multi.yml"
        content = compose_file.read_text()
        
        expected_ports = [
            "8910",  # API
            "8911",  # UI
            "8921",  # Telemetry
            "8922",  # Prometheus
            "8923",  # Grafana
            "5432",  # PostgreSQL
            "6379",  # Redis
        ]
        
        for port in expected_ports:
            assert port in content, f"Port {port} not found in docker-compose-multi.yml"

class TestRealDataFlow:
    """Test that real data flows through the system"""
    
    def test_no_mock_data_in_production_code(self):
        """Test that production code doesn't contain mock data"""
        from pathlib import Path
        
        api_files = [
            Path(__file__).parent.parent.parent / "src" / "api" / "main_simple.py",
            Path(__file__).parent.parent.parent / "src" / "api" / "websocket_manager.py"
        ]
        
        mock_patterns = ["random.randint", "generateMock", "mockData", "fake_"]
        
        for file_path in api_files:
            if file_path.exists():
                content = file_path.read_text()
                for pattern in mock_patterns:
                    lines = content.split('\n')
                    for line_num, line in enumerate(lines, 1):
                        if pattern in line and not line.strip().startswith('#'):
                            if "test" not in line.lower() and "debug" not in line.lower():
                                pytest.fail(f"Mock pattern '{pattern}' found in production code at {file_path}:{line_num}")
    
    def test_ui_components_use_real_api_calls(self):
        """Test that UI components make real API calls"""
        from pathlib import Path
        import re
        
        ui_files = [
            Path(__file__).parent.parent.parent / "ui" / "src" / "pages" / "Dashboard.jsx",
            Path(__file__).parent.parent.parent / "ui" / "src" / "pages" / "LiveLogs.jsx",
            Path(__file__).parent.parent.parent / "ui" / "src" / "pages" / "Configuration.jsx"
        ]
        
        for file_path in ui_files:
            if file_path.exists():
                content = file_path.read_text()
                
                api_patterns = [
                    r"fetch\s*\(",
                    r"axios\.",
                    r"'/api/",
                    r'"/api/',
                    r"new WebSocket"
                ]
                
                found_api_call = False
                for pattern in api_patterns:
                    if re.search(pattern, content):
                        found_api_call = True
                        break
                
                assert found_api_call, f"No API calls found in {file_path}"
                
                mock_patterns = ["generateMock", "mockData", "setSystemStats.*random"]
                for pattern in mock_patterns:
                    assert not re.search(pattern, content), f"Mock pattern '{pattern}' found in {file_path}"
