# RadiusForge v1.3.0 Release Notes

## Release Information
- **Version**: 1.3.0
- **Build Date**: 20250814_135423
- **Port Range**: 8910-8920 (Expanded from single port)
- **Status**: Production Ready

## Download Bundles

### Full Installation Bundle
- **File**: RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE.tar.gz
- **Size**: 33M
- **SHA256**: 10e03d9a69885ec9ce7b234a127496d8d79c7f448fabe40c6148972512813fbc
- **Use for**: New installations

### Delta Update Bundle
- **File**: RADIUSFORGE-PRODUCTION-V1.3.0-DELTA.tar.gz
- **Size**: 383K
- **SHA256**: ddd19045501af310cc8c6119af4983502ddde0c258b75eb0dded9c1a8ee6b6df
- **Use for**: Updating from v1.2.x

## What's New in v1.3.0

### Major Changes
1. **Expanded Port Range**: Now uses ports 8910-8920 for dedicated services
2. **Fixed Naming**: "Asset Manager" → "Cisco Access Manager" throughout
3. **RADIUS Routing Logic**: NAD devices route to either Access Manager OR ISE (exclusive)
4. **Versioned Bundles**: Full and delta deployment packages
5. **Enhanced UI**: Interactive topology with component selection

### Port Allocation
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

## Installation Instructions

### New Installation
```bash
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE
sudo ./install.sh
```

### Update from v1.2.x
```bash
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.0-DELTA.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.3.0-DELTA
sudo ./update.sh
```

## RADIUS Server Configuration

### Cisco Access Manager (Primary)
```
configure terminal
radius-server client <RADIUSFORGE_IP>
  key 0 RadiusForge2024Secret
exit
```

### Cisco ISE (Alternative)
1. Add Network Device with IP and shared secret
2. Create Authorization Profile
3. Configure Authentication Policy

## Testing
1. Check health: `curl http://localhost:8917/health`
2. Access UI: `http://localhost:8911`
3. Run quick test from UI or API

## Support
- Documentation: See DEPLOYMENT_GUIDE.md
- Issues: GitHub repository
- Version check: `curl http://localhost:8910/api/version`
