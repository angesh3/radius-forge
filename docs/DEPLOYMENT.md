# RadiusForge Deployment Guide

## Version 1.2.0 - Port Range 8910-8920

### Overview
RadiusForge uses a dual-bundle deployment system with semantic versioning. Each deployment creates both a full bundle and a delta update from the previous version.

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

### Using the Version Manager

```bash
# Create deployment bundles (bumps patch version by default)
python ops/version_manager.py

# Specify version bump type
python ops/version_manager.py --bump minor
python ops/version_manager.py --bump major

# Check current version
python ops/version_manager.py --current

# View version history
python ops/version_manager.py --history
```

### Using Make Commands

```bash
# Create bundle with automatic version bump
make bundle

# Full deployment cycle
make test && make bundle
```

## Deployment Process

### Full Deployment (New Installation)

1. Extract the full bundle:
```bash
tar -xzf radiusforge-1.2.0-full.tar.gz
```

2. Run installation:
```bash
./install.sh
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

4. Start services:
```bash
docker-compose up -d
# OR
systemctl start radiusforge-api
systemctl start radiusforge-ui
```

### Delta Update (Existing Installation)

1. Backup current installation:
```bash
cp -r /opt/radiusforge /opt/radiusforge.backup
```

2. Extract delta bundle:
```bash
tar -xzf radiusforge-1.1.0-to-1.2.0-delta.tar.gz
```

3. Run update script:
```bash
./update.sh
```

4. Verify update:
```bash
curl http://localhost:8910/api/system/version
```

## Rollback Procedure

### Automatic Rollback
The update script creates a backup before applying changes:

```bash
# Restore from automatic backup
mv backup /opt/radiusforge
systemctl restart radiusforge-api
```

### Manual Rollback to Specific Version

```bash
# Download previous version bundle
tar -xzf radiusforge-1.1.0-full.tar.gz

# Stop services
systemctl stop radiusforge-api radiusforge-ui

# Replace files
rm -rf /opt/radiusforge
mv radiusforge-1.1.0 /opt/radiusforge

# Start services
systemctl start radiusforge-api radiusforge-ui
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