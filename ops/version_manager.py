#!/usr/bin/env python3
"""
RadiusForge Version Manager
Handles versioning, bundle creation, and delta generation
"""

import os
import json
import hashlib
import tarfile
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import shutil
import tempfile


class VersionManager:
    """Manages application versioning and deployment bundles"""
    
    def __init__(self, base_dir: Path = Path.cwd()):
        self.base_dir = base_dir
        self.version_file = base_dir / "VERSION"
        self.manifest_file = base_dir / "release" / "manifest.json"
        self.history_file = base_dir / "release" / "version_history.json"
        self.release_dir = base_dir / "release"
        self.release_dir.mkdir(exist_ok=True)
        
    def get_current_version(self) -> str:
        """Get current version from VERSION file"""
        if self.version_file.exists():
            return self.version_file.read_text().strip()
        return "1.0.0"
    
    def bump_version(self, bump_type: str = "patch") -> str:
        """Bump version number (major, minor, patch)"""
        current = self.get_current_version()
        major, minor, patch = map(int, current.split("."))
        
        if bump_type == "major":
            major += 1
            minor = 0
            patch = 0
        elif bump_type == "minor":
            minor += 1
            patch = 0
        else:  # patch
            patch += 1
            
        new_version = f"{major}.{minor}.{patch}"
        self.version_file.write_text(new_version)
        return new_version
    
    def create_manifest(self, version: str, bundle_type: str) -> Dict:
        """Create deployment manifest"""
        manifest = {
            "version": version,
            "bundle_type": bundle_type,
            "created_at": datetime.now().isoformat(),
            "git_commit": self._get_git_commit(),
            "files": [],
            "checksums": {},
            "dependencies": self._get_dependencies(),
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
        return manifest
    
    def _get_git_commit(self) -> str:
        """Get current git commit hash"""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                capture_output=True,
                text=True,
                cwd=self.base_dir
            )
            return result.stdout.strip()[:8]
        except:
            return "unknown"
    
    def _get_dependencies(self) -> Dict:
        """Get project dependencies"""
        deps = {}
        
        # Python dependencies
        req_file = self.base_dir / "requirements.txt"
        if req_file.exists():
            deps["python"] = req_file.read_text().splitlines()
        
        # Node dependencies
        package_file = self.base_dir / "ui" / "package.json"
        if package_file.exists():
            with open(package_file) as f:
                package_data = json.load(f)
                deps["node"] = list(package_data.get("dependencies", {}).keys())
        
        return deps
    
    def calculate_file_hash(self, filepath: Path) -> str:
        """Calculate SHA256 hash of a file"""
        sha256_hash = hashlib.sha256()
        with open(filepath, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def get_project_files(self) -> List[Path]:
        """Get all project files for bundling"""
        exclude_patterns = {
            "__pycache__", ".git", "node_modules", ".pytest_cache",
            "*.pyc", ".env", "*.log", ".DS_Store", "*.egg-info",
            "htmlcov", ".coverage", "test-results"
        }
        
        files = []
        for root, dirs, filenames in os.walk(self.base_dir):
            # Filter directories
            dirs[:] = [d for d in dirs if not any(
                pattern in d for pattern in exclude_patterns
            )]
            
            for filename in filenames:
                if not any(pattern in filename for pattern in exclude_patterns):
                    filepath = Path(root) / filename
                    rel_path = filepath.relative_to(self.base_dir)
                    files.append(rel_path)
        
        return files
    
    def create_full_bundle(self, version: str) -> Path:
        """Create complete deployment bundle"""
        bundle_name = f"radiusforge-{version}-full.tar.gz"
        bundle_path = self.release_dir / bundle_name
        
        manifest = self.create_manifest(version, "full")
        files = self.get_project_files()
        
        with tarfile.open(bundle_path, "w:gz") as tar:
            # Add all project files
            for file_path in files:
                full_path = self.base_dir / file_path
                if full_path.exists():
                    tar.add(full_path, arcname=str(file_path))
                    manifest["files"].append(str(file_path))
                    manifest["checksums"][str(file_path)] = self.calculate_file_hash(full_path)
            
            # Add manifest
            manifest_json = json.dumps(manifest, indent=2)
            manifest_info = tarfile.TarInfo(name="manifest.json")
            manifest_info.size = len(manifest_json)
            import io
            tar.addfile(manifest_info, fileobj=io.BytesIO(manifest_json.encode()))
        
        # Save manifest separately
        manifest_path = self.release_dir / f"manifest-{version}-full.json"
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)
        
        return bundle_path
    
    def get_changed_files(self, old_version: str, new_version: str) -> List[Path]:
        """Get list of changed files between versions"""
        changed_files = []
        
        # Load old manifest if exists
        old_manifest_path = self.release_dir / f"manifest-{old_version}-full.json"
        if not old_manifest_path.exists():
            # If no old manifest, treat all files as changed
            return self.get_project_files()
        
        with open(old_manifest_path) as f:
            old_manifest = json.load(f)
        
        old_checksums = old_manifest.get("checksums", {})
        current_files = self.get_project_files()
        
        for file_path in current_files:
            full_path = self.base_dir / file_path
            if full_path.exists():
                current_hash = self.calculate_file_hash(full_path)
                old_hash = old_checksums.get(str(file_path))
                
                if old_hash != current_hash:
                    changed_files.append(file_path)
        
        # Check for deleted files
        for old_file in old_checksums:
            if Path(old_file) not in current_files:
                changed_files.append(Path(old_file))
        
        return changed_files
    
    def create_delta_bundle(self, old_version: str, new_version: str) -> Path:
        """Create delta update bundle"""
        bundle_name = f"radiusforge-{old_version}-to-{new_version}-delta.tar.gz"
        bundle_path = self.release_dir / bundle_name
        
        manifest = self.create_manifest(new_version, "delta")
        manifest["from_version"] = old_version
        manifest["to_version"] = new_version
        
        changed_files = self.get_changed_files(old_version, new_version)
        
        with tarfile.open(bundle_path, "w:gz") as tar:
            for file_path in changed_files:
                full_path = self.base_dir / file_path
                if full_path.exists():
                    tar.add(full_path, arcname=str(file_path))
                    manifest["files"].append(str(file_path))
                    manifest["checksums"][str(file_path)] = self.calculate_file_hash(full_path)
                else:
                    # File was deleted
                    manifest["deleted_files"] = manifest.get("deleted_files", [])
                    manifest["deleted_files"].append(str(file_path))
            
            # Add update script
            update_script = self._create_update_script(old_version, new_version)
            script_info = tarfile.TarInfo(name="update.sh")
            script_info.size = len(update_script)
            script_info.mode = 0o755
            import io
            tar.addfile(script_info, fileobj=io.BytesIO(update_script.encode()))
            
            # Add manifest
            manifest_json = json.dumps(manifest, indent=2)
            manifest_info = tarfile.TarInfo(name="manifest.json")
            manifest_info.size = len(manifest_json)
            tar.addfile(manifest_info, fileobj=io.BytesIO(manifest_json.encode()))
        
        # Save manifest separately
        manifest_path = self.release_dir / f"manifest-{old_version}-to-{new_version}-delta.json"
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)
        
        return bundle_path
    
    def _create_update_script(self, old_version: str, new_version: str) -> str:
        """Create update script for delta deployment"""
        script = f"""#!/bin/bash
# RadiusForge Delta Update Script
# Updates from {old_version} to {new_version}

set -e

echo "Starting RadiusForge update from {old_version} to {new_version}..."

# Backup current version
if [ -d "backup" ]; then
    rm -rf backup.old
    mv backup backup.old
fi
mkdir -p backup
cp -r . backup/ 2>/dev/null || true

# Apply updates
echo "Applying delta updates..."
tar -xzf radiusforge-{old_version}-to-{new_version}-delta.tar.gz

# Update VERSION file
echo "{new_version}" > VERSION

# Restart services
echo "Restarting services..."
if command -v systemctl &> /dev/null; then
    systemctl restart radiusforge-api || true
    systemctl restart radiusforge-ui || true
else
    pkill -f "uvicorn" || true
    pkill -f "npm" || true
fi

echo "Update complete! RadiusForge is now at version {new_version}"
"""
        return script
    
    def update_version_history(self, version: str, bundle_type: str, bundle_path: Path):
        """Update version history log"""
        history = []
        if self.history_file.exists():
            with open(self.history_file) as f:
                history = json.load(f)
        
        entry = {
            "version": version,
            "bundle_type": bundle_type,
            "bundle_path": str(bundle_path.name),
            "created_at": datetime.now().isoformat(),
            "size_bytes": bundle_path.stat().st_size,
            "git_commit": self._get_git_commit()
        }
        
        history.append(entry)
        
        with open(self.history_file, "w") as f:
            json.dump(history, f, indent=2)
    
    def create_deployment_bundle(self, bump_type: str = "patch") -> Tuple[Path, Optional[Path]]:
        """Create both full and delta deployment bundles"""
        old_version = self.get_current_version()
        new_version = self.bump_version(bump_type)
        
        print(f"Creating deployment bundles for version {new_version}...")
        
        # Create full bundle
        full_bundle = self.create_full_bundle(new_version)
        print(f"✓ Full bundle created: {full_bundle.name}")
        self.update_version_history(new_version, "full", full_bundle)
        
        # Create delta bundle if there's a previous version
        delta_bundle = None
        if old_version != new_version:
            delta_bundle = self.create_delta_bundle(old_version, new_version)
            print(f"✓ Delta bundle created: {delta_bundle.name}")
            self.update_version_history(new_version, "delta", delta_bundle)
        
        # Create deployment info
        deployment_info = {
            "version": new_version,
            "previous_version": old_version,
            "full_bundle": full_bundle.name,
            "delta_bundle": delta_bundle.name if delta_bundle else None,
            "created_at": datetime.now().isoformat(),
            "deployment_instructions": {
                "full": f"tar -xzf {full_bundle.name} && ./install.sh",
                "delta": f"tar -xzf {delta_bundle.name} && ./update.sh" if delta_bundle else None
            }
        }
        
        info_path = self.release_dir / f"deployment-{new_version}.json"
        with open(info_path, "w") as f:
            json.dump(deployment_info, f, indent=2)
        
        print(f"\n✅ Deployment bundles ready for version {new_version}")
        print(f"   Full bundle: {full_bundle.stat().st_size / 1024 / 1024:.2f} MB")
        if delta_bundle:
            print(f"   Delta bundle: {delta_bundle.stat().st_size / 1024 / 1024:.2f} MB")
        
        return full_bundle, delta_bundle


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="RadiusForge Version Manager")
    parser.add_argument("--bump", choices=["major", "minor", "patch"], default="patch",
                       help="Version bump type")
    parser.add_argument("--current", action="store_true", help="Show current version")
    parser.add_argument("--history", action="store_true", help="Show version history")
    
    args = parser.parse_args()
    
    manager = VersionManager()
    
    if args.current:
        print(f"Current version: {manager.get_current_version()}")
    elif args.history:
        if manager.history_file.exists():
            with open(manager.history_file) as f:
                history = json.load(f)
                for entry in history[-10:]:  # Show last 10 versions
                    print(f"v{entry['version']} - {entry['bundle_type']} - {entry['created_at']}")
        else:
            print("No version history found")
    else:
        manager.create_deployment_bundle(args.bump)


if __name__ == "__main__":
    main()