"""Unit tests for Version Manager"""

import pytest
import json
from pathlib import Path
import tempfile
import shutil
from unittest.mock import Mock, patch, MagicMock

# Import after adding to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from ops.version_manager import VersionManager


class TestVersionManager:
    """Test suite for VersionManager"""
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for testing"""
        temp_dir = tempfile.mkdtemp()
        yield Path(temp_dir)
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def version_manager(self, temp_dir):
        """Create VersionManager instance with temp directory"""
        return VersionManager(base_dir=temp_dir)
    
    def test_get_current_version_default(self, version_manager):
        """Test getting default version when VERSION file doesn't exist"""
        assert version_manager.get_current_version() == "1.0.0"
    
    def test_get_current_version_from_file(self, version_manager):
        """Test reading version from VERSION file"""
        version_manager.version_file.write_text("2.3.4")
        assert version_manager.get_current_version() == "2.3.4"
    
    def test_bump_version_patch(self, version_manager):
        """Test patch version bump"""
        version_manager.version_file.write_text("1.2.3")
        new_version = version_manager.bump_version("patch")
        assert new_version == "1.2.4"
        assert version_manager.get_current_version() == "1.2.4"
    
    def test_bump_version_minor(self, version_manager):
        """Test minor version bump"""
        version_manager.version_file.write_text("1.2.3")
        new_version = version_manager.bump_version("minor")
        assert new_version == "1.3.0"
        assert version_manager.get_current_version() == "1.3.0"
    
    def test_bump_version_major(self, version_manager):
        """Test major version bump"""
        version_manager.version_file.write_text("1.2.3")
        new_version = version_manager.bump_version("major")
        assert new_version == "2.0.0"
        assert version_manager.get_current_version() == "2.0.0"
    
    def test_create_manifest(self, version_manager):
        """Test manifest creation"""
        manifest = version_manager.create_manifest("1.2.3", "full")
        
        assert manifest["version"] == "1.2.3"
        assert manifest["bundle_type"] == "full"
        assert "created_at" in manifest
        assert "ports" in manifest
        assert manifest["ports"]["api"] == 8910
        assert manifest["ports"]["ui"] == 8911
        assert manifest["ports"]["syslog"] == 8915
    
    def test_calculate_file_hash(self, version_manager, temp_dir):
        """Test file hash calculation"""
        test_file = temp_dir / "test.txt"
        test_file.write_text("Hello, World!")
        
        hash_value = version_manager.calculate_file_hash(test_file)
        # SHA256 of "Hello, World!"
        expected_hash = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f"
        assert hash_value == expected_hash
    
    def test_get_project_files(self, version_manager, temp_dir):
        """Test getting project files with exclusions"""
        # Create test files
        (temp_dir / "app.py").write_text("print('app')")
        (temp_dir / "test.pyc").write_text("compiled")
        (temp_dir / "__pycache__").mkdir()
        (temp_dir / "__pycache__" / "cache.py").write_text("cache")
        (temp_dir / ".git").mkdir()
        (temp_dir / ".git" / "config").write_text("git config")
        
        files = version_manager.get_project_files()
        file_names = [str(f) for f in files]
        
        assert "app.py" in file_names
        assert "test.pyc" not in file_names
        assert "__pycache__/cache.py" not in file_names
        assert ".git/config" not in file_names
    
    def test_get_changed_files_no_old_manifest(self, version_manager):
        """Test getting changed files when no old manifest exists"""
        with patch.object(version_manager, 'get_project_files') as mock_files:
            mock_files.return_value = [Path("file1.py"), Path("file2.py")]
            
            changed = version_manager.get_changed_files("1.0.0", "1.1.0")
            assert changed == [Path("file1.py"), Path("file2.py")]
    
    def test_update_version_history(self, version_manager, temp_dir):
        """Test updating version history"""
        bundle_path = temp_dir / "bundle.tar.gz"
        bundle_path.write_text("bundle content")
        
        version_manager.update_version_history("1.2.3", "full", bundle_path)
        
        assert version_manager.history_file.exists()
        with open(version_manager.history_file) as f:
            history = json.load(f)
        
        assert len(history) == 1
        assert history[0]["version"] == "1.2.3"
        assert history[0]["bundle_type"] == "full"
        assert history[0]["bundle_path"] == "bundle.tar.gz"
    
    @patch('subprocess.run')
    def test_get_git_commit(self, mock_run, version_manager):
        """Test getting git commit hash"""
        mock_run.return_value = MagicMock(
            stdout="abc123def456789",
            returncode=0
        )
        
        commit = version_manager._get_git_commit()
        assert commit == "abc123de"  # First 8 characters
    
    def test_port_configuration_v130(self, version_manager):
        """Test that port configuration uses new v1.3.0 range (8910-8920)"""
        manifest = version_manager.create_manifest("1.3.0", "full")
        
        ports = manifest["ports"]
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
        
        # Verify all expected ports are present
        for port_name, expected_port in expected_ports.items():
            assert port_name in ports, f"Missing port configuration for {port_name}"
            assert ports[port_name] == expected_port, f"Port {port_name} should be {expected_port}, got {ports[port_name]}"
        
        # Verify all ports are in the correct range
        for port_name, port_value in ports.items():
            assert 8910 <= port_value <= 8920, f"Port {port_name}={port_value} outside range 8910-8920"
        
        # Verify we have exactly 11 ports (8910-8920 inclusive)
        assert len(ports) == 11, f"Expected 11 ports, got {len(ports)}"
    
    def test_delta_bundle_creation(self, version_manager, temp_dir):
        """Test delta bundle creation logic"""
        # Create initial version
        (temp_dir / "file1.py").write_text("content1")
        (temp_dir / "file2.py").write_text("content2")
        
        # Mock old manifest
        old_manifest = {
            "checksums": {
                "file1.py": "hash1",
                "file2.py": "hash2"
            }
        }
        old_manifest_path = version_manager.release_dir / "manifest-1.0.0-full.json"
        old_manifest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(old_manifest_path, "w") as f:
            json.dump(old_manifest, f)
        
        # Simulate file changes
        (temp_dir / "file1.py").write_text("modified_content1")  # Changed
        (temp_dir / "file3.py").write_text("new_content")        # New file
        # file2.py remains unchanged
        
        with patch.object(version_manager, 'calculate_file_hash') as mock_hash:
            mock_hash.side_effect = lambda p: {
                temp_dir / "file1.py": "new_hash1",
                temp_dir / "file2.py": "hash2",  # Same as before
                temp_dir / "file3.py": "hash3"
            }[p]
            
            with patch.object(version_manager, 'get_project_files') as mock_files:
                mock_files.return_value = [
                    Path("file1.py"), Path("file2.py"), Path("file3.py")
                ]
                
                changed_files = version_manager.get_changed_files("1.0.0", "1.1.0")
                
                # Should include changed file and new file
                assert Path("file1.py") in changed_files
                assert Path("file3.py") in changed_files
                assert Path("file2.py") not in changed_files  # Unchanged
    
    def test_version_comparison_logic(self, version_manager):
        """Test version comparison and validation"""
        test_cases = [
            ("1.0.0", "patch", "1.0.1"),
            ("1.0.9", "patch", "1.0.10"),
            ("1.9.0", "minor", "1.10.0"),
            ("1.9.9", "minor", "1.10.0"),
            ("9.0.0", "major", "10.0.0"),
            ("9.9.9", "major", "10.0.0"),
        ]
        
        for initial, bump_type, expected in test_cases:
            version_manager.version_file.write_text(initial)
            result = version_manager.bump_version(bump_type)
            assert result == expected, f"Bump {initial} {bump_type} should give {expected}, got {result}"
    
    def test_bundle_integrity_validation(self, version_manager, temp_dir):
        """Test bundle integrity with checksums"""
        # Create test files
        test_files = {
            "app.py": "print('hello')",
            "config.json": '{"key": "value"}',
            "README.md": "# Test Project"
        }
        
        for filename, content in test_files.items():
            (temp_dir / filename).write_text(content)
        
        manifest = version_manager.create_manifest("1.0.0", "full")
        
        # Add file checksums to manifest
        for filename in test_files:
            file_path = temp_dir / filename
            if file_path.exists():
                manifest["checksums"][filename] = version_manager.calculate_file_hash(file_path)
        
        # Verify checksums are properly calculated
        assert len(manifest["checksums"]) == len(test_files)
        
        # Verify each checksum is a valid SHA256 (64 hex characters)
        for filename, checksum in manifest["checksums"].items():
            assert len(checksum) == 64, f"Checksum for {filename} is not valid SHA256"
            assert all(c in "0123456789abcdef" for c in checksum), f"Checksum for {filename} contains non-hex characters"
    
    def test_security_validations(self, version_manager):
        """Test security-related validations"""
        # Test port range validation
        manifest = version_manager.create_manifest("1.3.0", "full")
        ports = manifest["ports"]
        
        # All ports should be in secure range
        for port_name, port in ports.items():
            assert 8910 <= port <= 8920, f"Port {port_name}={port} outside secure range"
        
        # Test that sensitive ports are properly configured
        assert ports["admin_api"] == 8918, "Admin API should be on restricted port"
        assert ports["backup_service"] == 8919, "Backup service should be on restricted port"
    
    def test_rollback_preparation(self, version_manager, temp_dir):
        """Test rollback scenario preparation"""
        # Create version history for rollback testing
        history_entries = [
            {"version": "1.0.0", "bundle_type": "full", "created_at": "2024-01-01"},
            {"version": "1.1.0", "bundle_type": "full", "created_at": "2024-02-01"},
            {"version": "1.1.1", "bundle_type": "delta", "created_at": "2024-02-15"},
        ]
        
        version_manager.history_file.parent.mkdir(parents=True, exist_ok=True)
        with open(version_manager.history_file, "w") as f:
            json.dump(history_entries, f)
        
        # Read history
        with open(version_manager.history_file) as f:
            history = json.load(f)
        
        assert len(history) == 3
        assert history[-1]["version"] == "1.1.1"  # Latest version
        assert history[-1]["bundle_type"] == "delta"
        
        # Verify chronological order
        versions = [entry["version"] for entry in history]
        assert versions == ["1.0.0", "1.1.0", "1.1.1"]