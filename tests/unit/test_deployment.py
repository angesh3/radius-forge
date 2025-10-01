"""Unit tests for Deployment functionality"""

import pytest
import json
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock, mock_open
import sys

# Import test modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


class TestDeploymentValidation:
    """Test suite for deployment validation and configuration"""
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for testing"""
        temp_dir = tempfile.mkdtemp()
        yield Path(temp_dir)
        shutil.rmtree(temp_dir)
    
    def test_port_configuration_validation(self):
        """Test port configuration validation"""
        # Expected v1.3.0 port configuration
        expected_ports = {
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
        
        # Test all ports are in valid range
        for service, port in expected_ports.items():
            assert 8910 <= port <= 8926, f"Port {port} for {service} outside valid range"
        
        # Test no duplicate ports
        ports_list = list(expected_ports.values())
        assert len(ports_list) == len(set(ports_list)), "Duplicate ports found in configuration"
        
        # Test coverage of entire range
        assert min(ports_list) == 8910, "Should start at port 8910"
        assert max(ports_list) == 8920, "Should end at port 8920"
        assert len(ports_list) == 11, "Should have 11 ports total"
    
    def test_version_string_validation(self):
        """Test version string validation"""
        valid_versions = [
            "1.0.0",
            "1.3.0", 
            "2.0.0",
            "10.20.30",
            "0.1.0"
        ]
        
        invalid_versions = [
            "1.0",           # Too few parts
            "1.0.0.1",       # Too many parts
            "v1.0.0",        # Contains prefix
            "1.0.0-beta",    # Contains suffix
            "latest",        # Not semantic version
            "1.0.0; rm -rf", # Contains dangerous characters
        ]
        
        def is_valid_semantic_version(version_str):
            """Validate semantic version format"""
            parts = version_str.split('.')
            if len(parts) != 3:
                return False
            
            try:
                for part in parts:
                    int(part)  # Must be integers
                return True
            except ValueError:
                return False
        
        for version in valid_versions:
            assert is_valid_semantic_version(version), f"Version {version} should be valid"
        
        for version in invalid_versions:
            assert not is_valid_semantic_version(version), f"Version {version} should be invalid"
    
    def test_bundle_manifest_structure(self):
        """Test bundle manifest structure validation"""
        # Expected manifest structure for v1.3.0
        expected_manifest_keys = {
            "version",
            "bundle_type",
            "created_at",
            "git_commit",
            "files",
            "checksums",
            "dependencies",
            "ports"
        }
        
        # Mock manifest
        sample_manifest = {
            "version": "1.3.0",
            "bundle_type": "full",
            "created_at": "2024-01-01T00:00:00",
            "git_commit": "abc123",
            "files": ["app.py", "config.json"],
            "checksums": {
                "app.py": "hash1",
                "config.json": "hash2"
            },
            "dependencies": {
                "python": ["fastapi==0.104.1"],
                "node": ["react"]
            },
            "ports": {
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
        }
        
        # Validate structure
        manifest_keys = set(sample_manifest.keys())
        assert manifest_keys == expected_manifest_keys, f"Manifest missing keys: {expected_manifest_keys - manifest_keys}"
        
        # Validate port structure
        assert len(sample_manifest["ports"]) == 11, "Should have 11 ports configured"
        for port_name, port_value in sample_manifest["ports"].items():
            assert isinstance(port_value, int), f"Port {port_name} should be integer"
            assert 8910 <= port_value <= 8926, f"Port {port_name}={port_value} outside valid range"
    
    def test_delta_bundle_calculation(self):
        """Test delta bundle calculation logic"""
        # Old version manifest
        old_manifest = {
            "checksums": {
                "app.py": "old_hash1",
                "config.json": "old_hash2",
                "utils.py": "old_hash3"
            }
        }
        
        # New version files with checksums
        new_files = {
            "app.py": "new_hash1",      # Changed
            "config.json": "old_hash2", # Unchanged
            "utils.py": "old_hash3",    # Unchanged
            "new_file.py": "new_hash4"  # New file
        }
        
        def calculate_delta_files(old_checksums, new_files):
            """Calculate which files need to be in delta bundle"""
            changed_files = []
            
            for file_path, new_hash in new_files.items():
                old_hash = old_checksums.get(file_path)
                if old_hash != new_hash:  # Changed or new file
                    changed_files.append(file_path)
            
            # Check for deleted files
            deleted_files = []
            for file_path in old_checksums:
                if file_path not in new_files:
                    deleted_files.append(file_path)
            
            return changed_files, deleted_files
        
        changed, deleted = calculate_delta_files(old_manifest["checksums"], new_files)
        
        # Should include changed and new files
        assert "app.py" in changed, "Changed file should be in delta"
        assert "new_file.py" in changed, "New file should be in delta"
        
        # Should not include unchanged files
        assert "config.json" not in changed, "Unchanged file should not be in delta"
        assert "utils.py" not in changed, "Unchanged file should not be in delta"
        
        # Should detect no deleted files in this case
        assert len(deleted) == 0, "No files should be deleted in this test"
    
    def test_checksum_validation(self):
        """Test checksum validation for integrity"""
        import hashlib
        
        def calculate_sha256(content):
            """Calculate SHA256 hash of content"""
            return hashlib.sha256(content.encode()).hexdigest()
        
        # Test file contents
        test_files = {
            "app.py": "print('Hello World')",
            "config.json": '{"key": "value"}',
            "README.md": "# RadiusForge"
        }
        
        # Calculate checksums
        checksums = {}
        for filename, content in test_files.items():
            checksums[filename] = calculate_sha256(content)
        
        # Validate checksum format
        for filename, checksum in checksums.items():
            assert len(checksum) == 64, f"SHA256 checksum for {filename} should be 64 characters"
            assert all(c in "0123456789abcdef" for c in checksum), f"Checksum for {filename} should be hex"
        
        # Verify checksums are different for different content
        assert checksums["app.py"] != checksums["config.json"], "Different files should have different checksums"
        assert checksums["app.py"] != checksums["README.md"], "Different files should have different checksums"
    
    def test_rollback_preparation(self, temp_dir):
        """Test rollback preparation and validation"""
        # Create mock deployment info
        deployment_info = {
            "version": "1.3.0",
            "previous_version": "1.2.2",
            "full_bundle": "radiusforge-1.3.0-full.tar.gz",
            "delta_bundle": "radiusforge-1.2.2-to-1.3.0-delta.tar.gz",
            "created_at": "2024-01-01T00:00:00",
            "deployment_instructions": {
                "full": "tar -xzf radiusforge-1.3.0-full.tar.gz && ./install.sh",
                "delta": "tar -xzf radiusforge-1.2.2-to-1.3.0-delta.tar.gz && ./update.sh"
            }
        }
        
        # Save deployment info
        info_file = temp_dir / "deployment-1.3.0.json"
        with open(info_file, "w") as f:
            json.dump(deployment_info, f, indent=2)
        
        # Validate deployment info structure
        assert "version" in deployment_info, "Deployment info should include version"
        assert "previous_version" in deployment_info, "Deployment info should include previous version"
        assert "full_bundle" in deployment_info, "Deployment info should include full bundle name"
        assert "delta_bundle" in deployment_info, "Deployment info should include delta bundle name"
        assert "deployment_instructions" in deployment_info, "Deployment info should include instructions"
        
        # Validate instructions
        instructions = deployment_info["deployment_instructions"]
        assert "full" in instructions, "Should include full deployment instructions"
        assert "delta" in instructions, "Should include delta deployment instructions"
        assert "install.sh" in instructions["full"], "Full deployment should use install.sh"
        assert "update.sh" in instructions["delta"], "Delta deployment should use update.sh"
    
    def test_installation_script_validation(self):
        """Test installation script requirements"""
        # Expected script capabilities
        expected_script_features = [
            "port_validation",
            "dependency_installation", 
            "user_creation",
            "service_setup",
            "firewall_configuration",
            "validation_checks"
        ]
        
        # Mock installation script content
        install_script_content = """#!/bin/bash
# RadiusForge Installation Script
check_ports() { echo "checking ports 8910-8926"; }
install_dependencies() { echo "installing dependencies"; }
setup_user() { echo "creating radiusforge user"; }
install_systemd_services() { echo "setting up services"; }
configure_firewall() { echo "configuring firewall"; }
validate_installation() { echo "validating installation"; }
"""
        
        # Validate script contains required functions
        for feature in expected_script_features:
            # Convert to function name format
            function_name = feature.replace("_", "_").replace("checks", "")
            if feature == "port_validation":
                assert "check_ports" in install_script_content, "Script should include port checking"
            elif feature == "dependency_installation":
                assert "install_dependencies" in install_script_content, "Script should install dependencies"
            elif feature == "user_creation":
                assert "setup_user" in install_script_content, "Script should create user"
            elif feature == "service_setup":
                assert "services" in install_script_content, "Script should setup services"
            elif feature == "firewall_configuration":
                assert "firewall" in install_script_content, "Script should configure firewall"
            elif feature == "validation_checks":
                assert "validate" in install_script_content, "Script should validate installation"
    
    def test_update_script_security(self):
        """Test update script security features"""
        # Expected security features in update script
        security_features = [
            "backup_creation",
            "checksum_verification", 
            "rollback_capability",
            "version_validation",
            "service_management"
        ]
        
        # Mock update script content
        update_script_content = """#!/bin/bash
create_backup() { echo "creating backup"; }
verify_checksums() { echo "verifying checksums"; }
rollback() { echo "rolling back changes"; }
validate_version() { echo "validating version"; }
stop_services() { echo "stopping services"; }
start_services() { echo "starting services"; }
"""
        
        # Validate security features
        for feature in security_features:
            if feature == "backup_creation":
                assert "backup" in update_script_content, "Update script should create backups"
            elif feature == "checksum_verification":
                assert "checksums" in update_script_content, "Update script should verify checksums"
            elif feature == "rollback_capability":
                assert "rollback" in update_script_content, "Update script should support rollback"
            elif feature == "version_validation":
                assert "validate_version" in update_script_content, "Update script should validate versions"
            elif feature == "service_management":
                assert "services" in update_script_content, "Update script should manage services"


class TestDeploymentIntegration:
    """Test deployment integration scenarios"""
    
    def test_version_upgrade_path(self):
        """Test version upgrade path validation"""
        upgrade_scenarios = [
            ("1.2.2", "1.3.0", "minor"),  # Current upgrade
            ("1.3.0", "1.3.1", "patch"),  # Future patch
            ("1.3.0", "1.4.0", "minor"),  # Future minor
            ("1.3.0", "2.0.0", "major"),  # Future major
        ]
        
        def get_upgrade_type(from_version, to_version):
            """Determine upgrade type between versions"""
            from_parts = [int(x) for x in from_version.split('.')]
            to_parts = [int(x) for x in to_version.split('.')]
            
            if to_parts[0] > from_parts[0]:
                return "major"
            elif to_parts[1] > from_parts[1]:
                return "minor"
            elif to_parts[2] > from_parts[2]:
                return "patch"
            else:
                return "downgrade"
        
        for from_ver, to_ver, expected_type in upgrade_scenarios:
            actual_type = get_upgrade_type(from_ver, to_ver)
            assert actual_type == expected_type, f"Upgrade from {from_ver} to {to_ver} should be {expected_type}, got {actual_type}"
    
    def test_service_port_allocation(self):
        """Test service port allocation strategy"""
        # RadiusForge expanded service allocation for ports 8910-8926
        service_allocation = {
            "core_services": ["api", "ui", "websocket"],        # 8910-8912
            "test_services": ["radius_test", "tacacs_test"],    # 8913-8914
            "operational": ["syslog", "metrics_export"],       # 8915-8916
            "management": ["health_check", "admin_api"],       # 8917-8918
            "infrastructure": ["backup_service"],              # 8919
            "reserved": ["reserved"],                          # 8920
            "monitoring": ["monitoring"],                      # 8921
            "logging": ["logging"],                           # 8922
            "analytics": ["analytics"],                       # 8923
            "reporting": ["reporting"],                       # 8924
            "integration": ["integration"],                   # 8925
            "future_use": ["future_use"]                      # 8926
        }
        
        used_ports = set()
        base_port = 8910
        
        for category, services in service_allocation.items():
            for i, service in enumerate(services):
                expected_port = base_port
                assert expected_port not in used_ports, f"Port {expected_port} already allocated"
                used_ports.add(expected_port)
                base_port += 1
        
        # Should use exactly ports 8910-8926
        assert used_ports == set(range(8910, 8927)), "Should use exactly ports 8910-8926"
    
    def test_configuration_migration(self):
        """Test configuration migration between versions"""
        # Old v1.2.2 configuration
        old_config = {
            "ports": {
                "api": 8910,
                "ui": 8911,
                "websocket": 8912,
                "syslog": 8915,
                "metrics": 8919
            }
        }
        
        # New v1.3.0 configuration
        new_config = {
            "ports": {
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
        }
        
        def migrate_config(old_config, new_config):
            """Migrate configuration from old to new version"""
            migrated = new_config.copy()
            
            # Preserve existing port assignments where possible
            for old_service, old_port in old_config["ports"].items():
                if old_service in new_config["ports"]:
                    # Keep same port if service exists in new version
                    migrated["ports"][old_service] = old_port
                elif old_service == "metrics":
                    # Rename metrics to metrics_export
                    migrated["ports"]["metrics_export"] = old_port
            
            return migrated
        
        migrated = migrate_config(old_config, new_config)
        
        # Should preserve existing assignments
        assert migrated["ports"]["api"] == 8910, "API port should be preserved"
        assert migrated["ports"]["ui"] == 8911, "UI port should be preserved"
        assert migrated["ports"]["syslog"] == 8915, "Syslog port should be preserved"
        
        # Should handle renames
        assert migrated["ports"]["metrics_export"] == 8919, "Metrics port should be migrated to metrics_export"
        
        # Should include new services
        assert "radius_test" in migrated["ports"], "New services should be included"
        assert "admin_api" in migrated["ports"], "New management services should be included"
