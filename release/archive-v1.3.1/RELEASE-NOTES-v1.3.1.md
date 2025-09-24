# RadiusForge v1.3.1 Release Notes

## Release Information
- **Version**: 1.3.1
- **Build Date**: 20250814_142002
- **Port Range**: 8910-8920 (11 dedicated services)
- **OS Support**: macOS, RHEL 8.8+, CentOS 8+, Ubuntu 20.04+

## Download Bundles

### Full Installation Bundle
- **File**: RADIUSFORGE-PRODUCTION-V1.3.1-COMPLETE.tar.gz
- **Size**: 33M
- **SHA256**: 93212280230270eacc042fbd5b19da3bcde2838d780f425417952f66fcfd815d
- **Use for**: New installations on any supported OS

### Delta Update Bundle
- **File**: RADIUSFORGE-PRODUCTION-V1.3.1-DELTA.tar.gz
- **Size**: 404K
- **SHA256**: 2eb4f6cee3c7700b98a6304941d2133c1e10fa5c445e7b068fb3c11aff333a77
- **Use for**: Updating from v1.3.0

## What's New in v1.3.1

### Major Enhancements
1. **OS-Specific Startup Scripts**
   - Dedicated script for macOS with LaunchAgent support
   - RHEL/CentOS script with systemd integration
   - Universal installation script auto-detects OS

2. **Improved Service Management**
   - Easy start/stop/restart commands
   - Service status monitoring
   - Auto-start on boot capability
   - Health monitoring service on port 8917

3. **Enhanced Installation Process**
   - Single command installation
   - Automatic dependency resolution
   - Firewall configuration
   - SELinux support for RHEL

4. **Better Cross-Platform Support**
   - Python 3.6.8 compatibility for RHEL 8.8
   - Python 3.8+ for macOS and Ubuntu
   - Platform-specific wheel packages

### Startup Script Commands

#### macOS
```bash
# Start/stop services
./scripts/startup/radiusforge-macos.sh start|stop|restart|status

# Install as auto-start service
./scripts/startup/radiusforge-macos.sh install

# View logs
./scripts/startup/radiusforge-macos.sh logs
```

#### RHEL/CentOS
```bash
# Start/stop services
sudo ./scripts/startup/radiusforge-rhel.sh start|stop|restart|status

# Install as systemd service
sudo ./scripts/startup/radiusforge-rhel.sh install

# Use with systemd
sudo systemctl start|stop|restart|status radiusforge
```

## Installation Instructions

### New Installation (Any OS)
```bash
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.1-COMPLETE.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.3.1-COMPLETE
sudo ./install.sh
```

### Update from v1.3.0
```bash
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.1-DELTA.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.3.1-DELTA
sudo ./update.sh
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

## Quick Start

1. **Install**: `sudo ./install.sh`
2. **Configure**: Edit `/opt/radiusforge/.env`
3. **Start**: 
   - macOS: `/opt/radiusforge/scripts/startup/radiusforge-macos.sh start`
   - RHEL: `sudo systemctl start radiusforge`
4. **Access**: http://localhost:8911
5. **Health**: http://localhost:8917/health

## Support
- Documentation: See DEPLOYMENT_GUIDE.md
- Issues: GitHub repository
- Version check: `curl http://localhost:8910/api/version`

---
Built with ❤️ by RadiusForge Team
