# RadiusForge Deployment Guide

## Version 1.4.1 - Unified Bundle Creation & Deployment

### Overview
RadiusForge uses a unified bundle creation and deployment system with comprehensive validation, archiving, and quality hardening. The consolidated workflow supports both traditional and container deployments.

## Port Configuration

RadiusForge now uses ports in the **8910-8920** range:

| Service | Port | Description |
|---------|------|-------------|
| API Server | 8910 | FastAPI REST endpoints |
| Web UI | 8911 | React frontend |
| WebSocket | 8912 | Real-time telemetry |
| Syslog Receiver | 8915 | TCP syslog ingestion |
| Metrics | 8919 | Prometheus metrics |
| Reserved | 8913-8914, 8916-8918, 8920 | Future services |

## Versioning System

### Version Format
RadiusForge follows semantic versioning: `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Bundle Types

#### Full Bundle
Contains the complete application:
- All source code
- Dependencies list
- Configuration templates
- Database migrations
- Installation scripts

#### Delta Bundle
Contains only changes since the last version:
- Modified files
- New files
- Deleted file list
- Update script
- Rollback instructions

## Creating a Deployment Bundle

### Unified Bundle Creation

```bash
# Create comprehensive deployment bundle with validation
./scripts/create-bundle.sh

# Enable all quality checks (default)
export ENABLE_SECURITY_SCAN=true
export ENABLE_DEPENDENCY_CHECK=true
export ENABLE_BUNDLE_TEST=true
./scripts/create-bundle.sh

# Configure archive retention
export ARCHIVE_RETENTION_COUNT=5
export ARCHIVE_RETENTION_DAYS=90
./scripts/create-bundle.sh
```

The unified script automatically:
- Builds UI and prepares Python wheels
- Creates both traditional and container deployment bundles
- Validates bundle integrity and security
- Archives previous versions with retention policies
- Generates comprehensive deployment documentation

## Deployment Process

### Unified Deployment Workflow

1. Extract the bundle:
```bash
tar -xzf release/RADIUSFORGE-PRODUCTION-V*.tar.gz
cd RADIUSFORGE-PRODUCTION-V*
```

2. Choose deployment method:
```bash
# Interactive deployment chooser
./deploy.sh

# Or use unified install-upgrade script directly
./scripts/install-upgrade.sh install traditional
./scripts/install-upgrade.sh install container
```

3. Configure environment (optional):
```bash
cp .env.example .env
# Edit .env with your settings
```

4. Verify deployment:
```bash
# Check health status
curl http://localhost:8917/health

# Access web UI
open http://localhost:8911
```

### Upgrade Existing Installation

```bash
# Extract new bundle
tar -xzf RADIUSFORGE-PRODUCTION-V*.tar.gz
cd RADIUSFORGE-PRODUCTION-V*

# Upgrade with automatic backup
./scripts/install-upgrade.sh upgrade traditional
# OR
./scripts/install-upgrade.sh upgrade container

# Verify upgrade
curl http://localhost:8910/api/system/version
```

## Rollback Procedure

### Automatic Rollback
The unified install-upgrade script creates automatic backups:

```bash
# Rollback to previous version
./scripts/install-upgrade.sh rollback traditional
# OR
./scripts/install-upgrade.sh rollback container
```

### Manual Rollback to Archived Version

```bash
# List archived versions
ls release/archive-v*/

# Extract archived bundle
tar -xzf release/archive-v1.3.0/RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE.tar.gz

# Deploy archived version
cd RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE
./scripts/install-upgrade.sh install traditional --force
```

## Manifest Structure

Each bundle includes a `manifest.json` with:

```json
{
  "version": "1.2.0",
  "bundle_type": "full|delta",
  "created_at": "2024-08-14T10:00:00Z",
  "git_commit": "abc123de",
  "ports": {
    "api": 8910,
    "ui": 8911,
    "websocket": 8912,
    "syslog": 8915,
    "metrics": 8919
  },
  "files": ["list of included files"],
  "checksums": {
    "file.py": "sha256_hash"
  },
  "dependencies": {
    "python": ["fastapi==0.104.1", ...],
    "node": ["react", "vite", ...]
  }
}
```

## Firewall Configuration

Update firewall rules for the new port range:

```bash
# Allow RadiusForge ports
firewall-cmd --permanent --add-port=8910-8920/tcp
firewall-cmd --reload

# Or with iptables
iptables -A INPUT -p tcp --dport 8910:8920 -j ACCEPT
```

## Health Checks

Verify deployment:

```bash
# API health
curl http://localhost:8910/health

# Version info
curl http://localhost:8910/api/system/version

# UI access
curl http://localhost:8911

# WebSocket test
wscat -c ws://localhost:8912/ws/telemetry
```

## Troubleshooting

### Port Conflicts
```bash
# Check if ports are in use
netstat -tuln | grep -E '891[0-9]'
lsof -i :8910-8920
```

### Service Issues
```bash
# Check service logs
journalctl -u radiusforge-api -f
docker logs radiusforge-api

# Restart services
systemctl restart radiusforge-api
docker-compose restart
```

### Version Mismatch
```bash
# Verify installed version
cat /opt/radiusforge/VERSION

# Check running version
curl http://localhost:8910/api/system/version
```

## Security Considerations

1. **Checksum Verification**: Always verify bundle checksums before deployment
2. **Backup Strategy**: Maintain backups of at least 3 previous versions
3. **Test Environment**: Test updates in staging before production
4. **Monitoring**: Monitor services after deployment for anomalies
5. **Access Control**: Restrict deployment file access to authorized users only

## CI/CD Integration

### GitHub Actions
```yaml
- name: Create deployment bundle
  run: |
    make test
    make bundle
    
- name: Upload artifacts
  uses: actions/upload-artifact@v3
  with:
    name: deployment-bundles
    path: release/*.tar.gz
```

### Jenkins
```groovy
stage('Create Bundle') {
    steps {
        sh 'make bundle'
        archiveArtifacts artifacts: 'release/*.tar.gz'
    }
}
```

## Support

For deployment issues:
- Check logs in `/var/log/radiusforge/`
- Review manifest in `release/manifest-*.json`
- Contact support with deployment ID from manifest
