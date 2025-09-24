# RadiusForge v1.3.2 Release Notes

## Release Information
- **Version**: 1.3.2
- **Build Date**: 20250814_143750
- **Port Range**: 8910-8920 (11 dedicated services)
- **OS Support**: macOS, RHEL 8.8+, CentOS 8+, Ubuntu 20.04+

## Download Bundles

### Full Installation Bundle
- **File**: RADIUSFORGE-PRODUCTION-V1.3.2-COMPLETE.tar.gz
- **Size**: 33M
- **SHA256**: 8aa062c5401bd4d148b6f47eb8d89aa2fdf700a270ba190db5db36af3acf0e54
- **Use for**: New installations on any supported OS

### Delta Update Bundle
- **File**: RADIUSFORGE-PRODUCTION-V1.3.2-DELTA.tar.gz
- **Size**: 409K
- **SHA256**: c024c98e41bd1832ae03f0cf12aaa1d9d0b72306e606ed20422d86dc7db6eb22
- **Use for**: Updating from v1.3.1

## What's Fixed in v1.3.2

### Live Logs UI Improvements
1. **Fixed Color Scheme**
   - Dark background (#1a1a1a) with proper text contrast
   - White text (#ffffff) for main log messages
   - Gray text (#9e9e9e) for timestamps
   - Light gray (#b0b0b0) for log details

2. **Enhanced Log Level Visibility**
   - Filled chips for better visibility
   - Proper color coding for each level
   - Clear distinction between ERROR, WARNING, SUCCESS, and INFO

3. **Improved Source Labels**
   - Blue outline (#64b5f6) for better contrast
   - Consistent styling across all source types

4. **Better Background Highlights**
   - Subtle background tints for different log levels
   - Improved hover effects for better interactivity

## Installation Instructions

### New Installation (Any OS)
```bash
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.2-COMPLETE.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.3.2-COMPLETE
sudo ./install.sh
```

### Update from v1.3.1
```bash
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.2-DELTA.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.3.2-DELTA
sudo ./update.sh
```

## Quick Start

### macOS
```bash
# Start services
/opt/radiusforge/scripts/startup/radiusforge-macos.sh start

# Install auto-start
/opt/radiusforge/scripts/startup/radiusforge-macos.sh install
```

### RHEL/CentOS
```bash
# Start with systemd
sudo systemctl start radiusforge

# Or use startup script
sudo /opt/radiusforge/scripts/startup/radiusforge-rhel.sh start
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
3. **View Live Logs**: Navigate to Live Logs page and start streaming
4. **Verify Colors**: Ensure log text is clearly visible on dark background

## Support
- Documentation: See DEPLOYMENT_GUIDE.md
- Version check: `curl http://localhost:8910/api/version`

---
Built with ❤️ by RadiusForge Team
