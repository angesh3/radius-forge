# RadiusForge v1.3.0 - Deployment Summary & Instructions

## 🚀 Quick Start

### What's New in v1.3.0
- ✅ **Expanded Port Range**: 8910-8920 (11 dedicated services)
- ✅ **Versioned Bundles**: Full and Delta deployment packages
- ✅ **Fixed Naming**: "Asset Manager" → "Cisco Access Manager"
- ✅ **RADIUS Routing**: NAD → Access Manager OR ISE (exclusive)
- ✅ **Enhanced UI**: Interactive topology with component selection

## 📦 Deployment Bundles

### Create Deployment Bundles
```bash
cd /Users/angeshvikram/code/radius-forge
./scripts/create-bundle.sh
```

This will generate:
- `RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE.tar.gz` - Full installation
- `RADIUSFORGE-PRODUCTION-V1.3.0-DELTA.tar.gz` - Update from v1.2.x

## 🔧 Port Configuration (8910-8920)

| Port | Service | Purpose |
|------|---------|---------|
| **8910** | API Server | Main FastAPI application |
| **8911** | Web UI | React frontend |
| **8912** | WebSocket | Real-time updates |
| **8913** | RADIUS Test | UDP RADIUS client |
| **8914** | TACACS+ Test | TCP TACACS+ client |
| **8915** | Syslog Receiver | Log aggregation |
| **8916** | Metrics Export | Prometheus endpoint |
| **8917** | Health Check | Service monitoring |
| **8918** | Admin API | Administrative functions |
| **8919** | Backup Service | Data backup/restore |
| **8920** | Reserved | Future use |

## 🖥️ Installation Instructions

### Option 1: Production Deployment (Recommended)

```bash
# 1. Extract bundle
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE

# 2. Run installation
sudo ./install.sh

# 3. Configure environment
sudo nano /opt/radiusforge/.env
# Set RADIUS_SERVER_TYPE=access-manager or cisco-ise

# 4. Start services
sudo systemctl start radiusforge  # Linux
sudo launchctl start com.radiusforge  # macOS
```

### Option 2: Docker Deployment

```bash
# 1. Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  radiusforge:
    image: radiusforge:1.3.0
    ports:
      - "8910-8920:8910-8920"
    environment:
      - RADIUS_SERVER_TYPE=access-manager
      - RADIUS_PRIMARY_HOST=192.168.1.10
      - RADIUS_PRIMARY_SECRET=YourSecretHere
    volumes:
      - ./data:/data
      - ./logs:/logs
EOF

# 2. Start services
docker-compose up -d
```

### Option 3: Development Setup

```bash
# Currently running on your system
# API: http://localhost:8910
# UI: http://localhost:5173 (dev) or 8911 (production)
```

## 🔐 RADIUS Server Configuration

### Cisco Access Manager Setup

```bash
# 1. Add RadiusForge as NAS
configure terminal
radius-server client RADIUSFORGE_HOST
  address ipv4 YOUR_RADIUSFORGE_IP
  key 0 YourSharedSecret
  description "RadiusForge Load Tester"
exit

# 2. Enable authentication methods
aaa authentication dot1x default group radius
aaa authentication login default group radius
aaa authorization network default group radius
```

### Cisco ISE Setup

1. **Add Network Device**:
   - Administration → Network Resources → Network Devices
   - Name: `RadiusForge`
   - IP: Your RadiusForge IP
   - Shared Secret: `YourSharedSecret`

2. **Create Authorization Profile**:
   - Policy → Policy Elements → Authorization Profiles
   - Name: `RadiusForge_Test`
   - Access Type: `ACCESS_ACCEPT`

3. **Authentication Policy**:
   - Policy → Authentication
   - Condition: `DEVICE:Name EQUALS RadiusForge`
   - Allowed Protocols: `Default Network Access`

## 🧪 Testing & Validation

### 1. Verify Services

```bash
# Check all ports are listening
for port in {8910..8920}; do
  echo "Port $port: $(nc -zv localhost $port 2>&1 | grep -o 'succeeded\|refused')"
done

# Check health endpoint
curl http://localhost:8917/health
```

### 2. Access Web UI

Open browser to: `http://localhost:8911` (production) or `http://localhost:5173` (dev)

### 3. Configure RADIUS Target

1. Go to **Topology** page
2. Select RADIUS target:
   - **Cisco Access Manager** (Primary)
   - **Cisco ISE** (Alternative)
3. Configuration auto-updates

### 4. Run Test

#### Quick Test (UI)
1. Navigate to **Quick Test**
2. Select authentication method (EAP-TLS, MAB, 802.1X, PEAP)
3. Enter credentials
4. Click **Run Test**

#### Load Test (UI)
1. Navigate to **Scale Test**
2. Configure RPS targets (100 → 50,000)
3. Select duration
4. Click **Start Test**
5. Monitor real-time results

#### Command Line Test
```bash
# Simple authentication test
curl -X POST http://localhost:8910/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "method": "EAP-TLS",
    "username": "testuser",
    "password": "TestPass123",
    "server": "access-manager"
  }'

# Load test
curl -X POST http://localhost:8910/api/test/scale \
  -H "Content-Type: application/json" \
  -d '{
    "targets": [
      {"rps": 100, "duration": 60},
      {"rps": 500, "duration": 60},
      {"rps": 1000, "duration": 120}
    ],
    "auth_method": "MAB",
    "server_type": "access-manager"
  }'
```

## 📊 Monitoring

### Metrics Endpoint
```bash
# Prometheus metrics
curl http://localhost:8916/metrics

# Key metrics:
# - radiusforge_auth_success_total
# - radiusforge_auth_failure_total
# - radiusforge_auth_latency_seconds
# - radiusforge_rps_current
```

### Real-time Dashboard
- Open UI → **Dashboard**
- Shows current RPS, connections, latency
- Live topology with traffic flow

### Logs
```bash
# Application logs
tail -f /opt/radiusforge/logs/app.log

# RADIUS test logs
tail -f /opt/radiusforge/logs/radius.log

# Syslog receiver
tail -f /opt/radiusforge/logs/syslog.log
```

## 🔄 Version Management

### Check Current Version
```bash
curl http://localhost:8910/api/version
# Returns: {"version": "1.3.0", "port_range": "8910-8920"}
```

### Update to New Version
```bash
# Download delta bundle
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.0-DELTA.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.3.0-DELTA
sudo ./update.sh
```

### Rollback
```bash
# Automatic backup created during update
sudo cp -r /opt/radiusforge.backup.* /opt/radiusforge
sudo systemctl restart radiusforge
```

## 🛠️ Troubleshooting

### Port Conflicts
```bash
# Find process using port
lsof -i :8910

# Kill if needed
sudo kill -9 $(lsof -t -i:8910)
```

### RADIUS Connection Issues
```bash
# Test RADIUS connectivity
nc -zv RADIUS_SERVER_IP 1812

# Test with radtest
radtest testuser password RADIUS_SERVER_IP 0 shared_secret
```

### Service Won't Start
```bash
# Check logs
journalctl -u radiusforge -n 50

# Verify Python
python3 --version  # Should be 3.6.8+ (RHEL) or 3.8+ (others)

# Check dependencies
pip list | grep fastapi
```

## 📝 Configuration Files

### Environment Variables (.env)
```bash
# Core Ports
API_PORT=8910
UI_PORT=8911
WEBSOCKET_PORT=8912
RADIUS_TEST_PORT=8913
TACACS_TEST_PORT=8914
SYSLOG_PORT=8915
METRICS_PORT=8916
HEALTH_PORT=8917
ADMIN_PORT=8918
BACKUP_PORT=8919

# RADIUS Configuration
RADIUS_SERVER_TYPE=access-manager  # or cisco-ise
RADIUS_PRIMARY_HOST=192.168.1.10
RADIUS_PRIMARY_PORT=1812
RADIUS_PRIMARY_SECRET=YourSecretHere
RADIUS_ACCOUNTING_PORT=1813

# Performance
MAX_WORKERS=8
MAX_CONNECTIONS=10000
TIMEOUT_SECONDS=30
```

## 🚨 Important Notes

1. **RADIUS Routing**: NAD devices send traffic to EITHER Access Manager OR ISE, not both
2. **Port Range**: All services use 8910-8920, ensure firewall allows these
3. **Python Version**: RHEL 8.8 requires Python 3.6.8 specifically
4. **Bundle Sizes**: 
   - Full: ~400MB compressed
   - Delta: ~100MB compressed
5. **Security**: Change default secrets before production deployment

## 📞 Support

- **Documentation**: `/opt/radiusforge/docs/`
- **API Docs**: `http://localhost:8910/docs`
- **Health Check**: `http://localhost:8917/health`
- **Version Info**: `http://localhost:8910/api/version`

## ✅ Deployment Checklist

- [ ] Ports 8910-8920 available
- [ ] Python 3.6.8+ installed
- [ ] Node.js 14+ installed (for UI build)
- [ ] RADIUS server configured (Access Manager or ISE)
- [ ] Shared secret configured
- [ ] Firewall rules updated
- [ ] Service started successfully
- [ ] Web UI accessible
- [ ] Test authentication working
- [ ] Monitoring configured

---

**Version**: 1.3.0  
**Build Date**: August 14, 2024  
**Port Range**: 8910-8920  
**Status**: Production Ready

© 2024 RadiusForge - Enterprise AAA Traffic Load Testing Platform