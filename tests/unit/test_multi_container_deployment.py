import pytest
import subprocess
import time
import requests
from pathlib import Path

class TestMultiContainerDeployment:
    """Test multi-container docker-compose deployment"""
    
    def test_docker_compose_file_exists(self):
        """Test docker-compose.yml exists and is valid"""
        compose_file = Path(__file__).parent.parent.parent / "docker-compose.yml"
        assert compose_file.exists(), "docker-compose.yml file must exist"
        
        import yaml
        with open(compose_file) as f:
            config = yaml.safe_load(f)
        
        assert "services" in config
        assert len(config["services"]) >= 6  # At least 6 services
    
    def test_dockerfile_api_exists(self):
        """Test Dockerfile.api exists for API service"""
        dockerfile = Path(__file__).parent.parent.parent / "Dockerfile.api"
        assert dockerfile.exists(), "Dockerfile.api must exist for multi-container build"
    
    def test_ui_dockerfile_exists(self):
        """Test UI Dockerfile exists"""
        ui_dockerfile = Path(__file__).parent.parent.parent / "ui" / "Dockerfile"
        assert ui_dockerfile.exists(), "ui/Dockerfile must exist for multi-container build"
    
    def test_nginx_config_exists(self):
        """Test nginx configuration exists for UI"""
        nginx_config = Path(__file__).parent.parent.parent / "ui" / "nginx.conf"
        assert nginx_config.exists(), "ui/nginx.conf must exist for UI service"
    
    def test_prometheus_config_exists(self):
        """Test Prometheus configuration exists"""
        prometheus_config = Path(__file__).parent.parent.parent / "ops" / "prometheus.yml"
        assert prometheus_config.exists(), "ops/prometheus.yml must exist for monitoring"
    
    def test_grafana_configs_exist(self):
        """Test Grafana configurations exist"""
        grafana_dashboard = Path(__file__).parent.parent.parent / "ops" / "grafana" / "dashboards" / "dashboard.yml"
        grafana_datasource = Path(__file__).parent.parent.parent / "ops" / "grafana" / "datasources" / "prometheus.yml"
        
        assert grafana_dashboard.exists(), "Grafana dashboard config must exist"
        assert grafana_datasource.exists(), "Grafana datasource config must exist"
    
    def test_database_init_script_exists(self):
        """Test database initialization script exists"""
        init_script = Path(__file__).parent.parent.parent / "ops" / "init-db.sql"
        assert init_script.exists(), "ops/init-db.sql must exist for database initialization"
    
    def test_docker_compose_services_defined(self):
        """Test all required services are defined in docker-compose.yml"""
        compose_file = Path(__file__).parent.parent.parent / "docker-compose.yml"
        
        import yaml
        with open(compose_file) as f:
            config = yaml.safe_load(f)
        
        required_services = ["postgres", "redis", "api", "ui", "prometheus", "grafana"]
        services = config.get("services", {})
        
        for service in required_services:
            assert service in services, f"Service '{service}' must be defined in docker-compose.yml"
    
    def test_docker_compose_networking(self):
        """Test docker-compose defines proper networking"""
        compose_file = Path(__file__).parent.parent.parent / "docker-compose.yml"
        
        import yaml
        with open(compose_file) as f:
            config = yaml.safe_load(f)
        
        assert "networks" in config
        assert "radiusforge-network" in config["networks"]
        
        services = config.get("services", {})
        for service_name, service_config in services.items():
            if "networks" in service_config:
                assert "radiusforge-network" in service_config["networks"]
    
    def test_docker_compose_volumes(self):
        """Test docker-compose defines persistent volumes"""
        compose_file = Path(__file__).parent.parent.parent / "docker-compose.yml"
        
        import yaml
        with open(compose_file) as f:
            config = yaml.safe_load(f)
        
        assert "volumes" in config
        required_volumes = ["postgres_data", "redis_data", "prometheus_data", "grafana_data"]
        
        for volume in required_volumes:
            assert volume in config["volumes"], f"Volume '{volume}' must be defined for persistence"
    
    def test_docker_compose_health_checks(self):
        """Test services have health checks defined"""
        compose_file = Path(__file__).parent.parent.parent / "docker-compose.yml"
        
        import yaml
        with open(compose_file) as f:
            config = yaml.safe_load(f)
        
        services = config.get("services", {})
        health_check_services = ["postgres", "redis", "api", "ui"]
        
        for service in health_check_services:
            if service in services:
                service_config = services[service]
                assert "healthcheck" in service_config, f"Service '{service}' should have health check"
    
    def test_api_service_configuration(self):
        """Test API service is properly configured"""
        compose_file = Path(__file__).parent.parent.parent / "docker-compose.yml"
        
        import yaml
        with open(compose_file) as f:
            config = yaml.safe_load(f)
        
        api_service = config["services"]["api"]
        
        assert "build" in api_service
        assert api_service["build"]["dockerfile"] == "Dockerfile.api"
        
        assert "environment" in api_service
        env_vars = api_service["environment"]
        
        db_url_found = any("DATABASE_URL" in str(var) for var in env_vars)
        redis_url_found = any("REDIS_URL" in str(var) for var in env_vars)
        
        assert db_url_found, "API service must have DATABASE_URL configured"
        assert redis_url_found, "API service must have REDIS_URL configured"
    
    def test_ui_service_configuration(self):
        """Test UI service is properly configured"""
        compose_file = Path(__file__).parent.parent.parent / "docker-compose.yml"
        
        import yaml
        with open(compose_file) as f:
            config = yaml.safe_load(f)
        
        ui_service = config["services"]["ui"]
        
        assert "build" in ui_service
        assert ui_service["build"]["context"] == "./ui"
        
        assert "ports" in ui_service
        ports = ui_service["ports"]
        ui_port_found = any("8911" in str(port) for port in ports)
        assert ui_port_found, "UI service must expose port 8911"
