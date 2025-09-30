# RadiusForge v1.4.1 - Universal Deployment Bundle

## 🚀 Quick Deployment Guide

This bundle includes **BOTH** traditional and container deployment options!

### For Remote macOS:
```bash
# Transfer bundle
scp RADIUSFORGE-PRODUCTION-V1.4.1-COMPLETE.tar.gz user@mac-server:/tmp/

# On macOS server
tar -xzf /tmp/RADIUSFORGE-PRODUCTION-V1.4.1-COMPLETE.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.4.1-COMPLETE
./deploy.sh  # Choose option 1 or 2
```

### For Remote RHEL/CentOS:
```bash
# Transfer bundle
scp RADIUSFORGE-PRODUCTION-V1.4.1-COMPLETE.tar.gz user@rhel-server:/tmp/

# On RHEL server
tar -xzf /tmp/RADIUSFORGE-PRODUCTION-V1.4.1-COMPLETE.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.4.1-COMPLETE
./deploy.sh  # Choose option 1 or 2
```

## 📋 Deployment Options

### Option 1: Traditional Installation
- **Best for**: Production servers, specific requirements
- **Requires**: Python 3.6.8+ (RHEL) or 3.8+ (macOS)
- **Benefits**: Direct control, no containerization overhead

### Option 2: Container Deployment
- **Best for**: Quick setup, testing, isolation
- **Requires**: Docker only
- **Benefits**: No dependencies, easy updates, consistent environment

## 🔧 What's Included

- ✅ Complete source code
- ✅ Pre-built UI (React)
- ✅ Python wheels for offline installation
- ✅ macOS startup scripts
- ✅ RHEL/systemd service files
- ✅ Docker configuration
- ✅ All documentation
- ✅ Bundle validation reports

## 📊 Service Ports

All services use ports **8910-8920**:
- API Server: 8910
- Web UI: 8911
- WebSocket: 8912
- RADIUS Test: 8913
- TACACS+ Test: 8914
- Syslog: 8915
- Metrics: 8916
- Health: 8917
- Admin API: 8918
- Backup: 8919

## ✅ Post-Deployment

1. **Configure RADIUS**:
   Edit `.env` or `config/radiusforge.conf`

2. **Access UI**:
   http://SERVER_IP:8911

3. **Check Health**:
   curl http://SERVER_IP:8917/health

4. **View Logs**:
   - Traditional: `/opt/radiusforge/logs/`
   - Container: `docker logs radiusforge`

---
Version: 1.4.1
Build: 20250930_185257
Bundle: RADIUSFORGE-PRODUCTION-V1.4.1-COMPLETE.tar.gz
Size: 14M
SHA256: 809a7ff9f52f5f28f1744e3355ff103f55b928c3f7035223c0eb7ff64f29fa26
Validation: release/validation-1.4.1.log
