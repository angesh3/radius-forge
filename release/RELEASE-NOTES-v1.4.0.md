# RadiusForge v1.4.0 Release Notes

## Release Information
- **Version**: 1.4.0
- **Build Date**: 20250814_154406
- **Port Range**: 8910-8920 (11 dedicated services)
- **Deployment Options**: Traditional + Container
- **OS Support**: macOS, RHEL 8.8+, CentOS 8+, Ubuntu 20.04+, Docker

## Download Bundle

### Complete Bundle (Traditional + Container)
- **File**: RADIUSFORGE-PRODUCTION-V1.4.0-COMPLETE.tar.gz
- **Size**: 33M
- **SHA256**: 117625f59f62d30ded3100449471accd0c910d66a58ea4c9e8d31e6ec5ae3828
- **Use for**: Any deployment method on any supported OS

## What's New in v1.4.0

### Major Feature: Container Deployment
1. **Docker All-in-One Container**
   - Single container with all services
   - No dependencies except Docker
   - Built-in Nginx and Supervisor
   - Health monitoring included

2. **Flexible Deployment Options**
   - Choose between traditional or container
   - Unified deployment script
   - Same bundle works for both methods

3. **Enhanced Portability**
   - Works identically on macOS, Linux, Windows (with Docker)
   - Simplified installation process
   - Consistent experience across platforms

### Improvements
- Fixed Live Logs color scheme (from v1.3.2)
- Enhanced startup scripts for macOS and RHEL
- Better service management
- Comprehensive deployment documentation

## Deployment Instructions

### Extract Bundle
```bash
tar -xzf RADIUSFORGE-PRODUCTION-V1.4.0-COMPLETE.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.4.0-COMPLETE
```

### Option 1: Automatic Deployment (Recommended)
```bash
./deploy.sh
# Choose:
#   1) Traditional Installation
#   2) Container Deployment
```

### Option 2: Traditional Installation
```bash
./install-traditional.sh
```

### Option 3: Container Deployment
```bash
./install-container.sh
```

## Quick Start Commands

### Traditional (macOS)
```bash
/opt/radiusforge/scripts/startup/radiusforge-macos.sh start
```

### Traditional (RHEL)
```bash
sudo systemctl start radiusforge
```

### Container
```bash
docker start radiusforge
# or
docker-compose up -d
```

## Port Allocation
| Port | Service | Description |
|------|---------|-------------|
| 8910 | API Server | Main FastAPI application |
| 8911 | Web UI | React frontend |
| 8912 | WebSocket | Real-time updates |
| 8913 | RADIUS Test | UDP RADIUS client |
| 8914 | TACACS+ Test | TCP TACACS+ client |
| 8915 | Syslog Receiver | Log aggregation |
| 8916 | Metrics Export | Prometheus metrics |
| 8917 | Health Check | Service monitoring |
| 8918 | Admin API | Administrative functions |
| 8919 | Backup Service | Data backup/restore |
| 8920 | Reserved | Future expansion |

## Testing

1. **Check Health**: `curl http://localhost:8917/health`
2. **Access UI**: http://localhost:8911
3. **API Docs**: http://localhost:8910/docs
4. **View Metrics**: http://localhost:8916/metrics

## Container Management

```bash
# View logs
docker logs -f radiusforge

# Stop container
docker stop radiusforge

# Start container
docker start radiusforge

# Shell access
docker exec -it radiusforge /bin/bash
```

## Support
- Documentation: See docs/ directory
- Container Guide: CONTAINER_DEPLOYMENT_GUIDE.md
- Version check: `curl http://localhost:8910/api/version`

---
Built with ❤️ by RadiusForge Team
