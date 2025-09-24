# RadiusForge v1.3.0 - Complete Deployment Steps

## 📦 Bundle Creation Complete

### Generated Bundles
1. **Full Installation Bundle**: `RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE.tar.gz` (33MB)
   - SHA256: `10e03d9a69885ec9ce7b234a127496d8d79c7f448fabe40c6148972512813fbc`
   - Use for: New installations

2. **Delta Update Bundle**: `RADIUSFORGE-PRODUCTION-V1.3.0-DELTA.tar.gz` (383KB)
   - SHA256: `ddd19045501af310cc8c6119af4983502ddde0c258b75eb0dded9c1a8ee6b6df`
   - Use for: Updating from v1.2.x

### Archived Versions
- Previous v1.2.x bundles have been moved to: `release/archive-v1.2.x/`

## 🚀 Deployment Instructions

### Option 1: New Installation

```bash
# 1. Copy bundle to target server
scp release/RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE.tar.gz user@server:/tmp/

# 2. SSH to server and extract
ssh user@server
cd /tmp
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE.tar.gz

# 3. Run installation
cd RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE
sudo ./install.sh

# 4. Configure environment
sudo nano /opt/radiusforge/.env
# Set your RADIUS server details (Access Manager or ISE)

# 5. Start service
sudo systemctl start radiusforge  # Linux
sudo launchctl start com.radiusforge  # macOS

# 6. Verify installation
curl http://localhost:8917/health
```

### Option 2: Update from v1.2.x

```bash
# 1. Copy delta bundle to server
scp release/RADIUSFORGE-PRODUCTION-V1.3.0-DELTA.tar.gz user@server:/tmp/

# 2. SSH to server and extract
ssh user@server
cd /tmp
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.0-DELTA.tar.gz

# 3. Run update
cd RADIUSFORGE-PRODUCTION-V1.3.0-DELTA
sudo ./update.sh

# Service will restart automatically
```

## 🔧 RADIUS Server Configuration

### Cisco Access Manager Setup

```bash
configure terminal
radius-server client YOUR_RADIUSFORGE_IP
  address ipv4 YOUR_RADIUSFORGE_IP
  key 0 RadiusForge2024Secret
  description "RadiusForge Load Tester v1.3.0"
exit

aaa authentication dot1x default group radius
aaa authentication login default group radius
aaa authorization network default group radius
aaa accounting network default start-stop group radius
```

### Cisco ISE Setup

1. **Add Network Device**
   - Administration → Network Resources → Network Devices
   - Name: `RadiusForge_v1.3.0`
   - IP: Your RadiusForge IP
   - Shared Secret: `RadiusForge2024Secret`

2. **Create Authorization Profile**
   - Policy → Policy Elements → Authorization Profiles
   - Name: `RadiusForge_Test`
   - Access Type: `ACCESS_ACCEPT`

3. **Authentication Policy**
   - Policy → Authentication
   - Condition: `DEVICE:Name EQUALS RadiusForge_v1.3.0`
   - Allowed Protocols: `Default Network Access`

## 🧪 Testing & Validation

### Quick Test Commands

```bash
# 1. Check all services are running (ports 8910-8920)
for port in {8910..8920}; do
  echo "Port $port: $(nc -zv localhost $port 2>&1 | grep -o 'succeeded\|refused')"
done

# 2. Test API endpoint
curl http://localhost:8910/api/version
# Expected: {"version": "1.3.0", "port_range": "8910-8920"}

# 3. Test health check
curl http://localhost:8917/health
# Expected: {"status": "healthy", "version": "1.3.0"}

# 4. Access Web UI
# Browser: http://localhost:8911

# 5. Test RADIUS authentication
curl -X POST http://localhost:8910/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "method": "EAP-TLS",
    "username": "testuser",
    "password": "TestPass123",
    "server": "access-manager"
  }'
```

### Load Test Example

```bash
# Create test profile
cat > /tmp/load-test.json << EOF
{
  "name": "v1.3.0 Load Test",
  "targets": [
    {"rps": 100, "duration": 60},
    {"rps": 500, "duration": 60},
    {"rps": 1000, "duration": 120}
  ],
  "auth_method": "MAB",
  "server_type": "access-manager"
}
EOF

# Run test via API
curl -X POST http://localhost:8910/api/test/scale \
  -H "Content-Type: application/json" \
  -d @/tmp/load-test.json
```

## 📊 Key Features in v1.3.0

### Port Allocation (8910-8920)
| Port | Service | Purpose |
|------|---------|---------|
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

### What's New
- ✅ Expanded port range (8910-8920)
- ✅ Versioned deployment bundles (Full + Delta)
- ✅ Fixed "Asset Manager" → "Cisco Access Manager"
- ✅ RADIUS routing: NAD → Access Manager OR ISE (exclusive)
- ✅ Interactive topology with component selection
- ✅ Enhanced UI with professional design system

## 🔄 Rollback Instructions

If needed, rollback to previous version:

```bash
# Automatic backup was created during update
sudo systemctl stop radiusforge
sudo mv /opt/radiusforge /opt/radiusforge.failed
sudo mv /opt/radiusforge.backup.* /opt/radiusforge
sudo systemctl start radiusforge
```

## 📝 Configuration Files

### Environment Variables (.env)
```bash
# Core Services (v1.3.0)
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
RADIUS_PRIMARY_SECRET=RadiusForge2024Secret
RADIUS_ACCOUNTING_PORT=1813

# Performance
MAX_WORKERS=8
MAX_CONNECTIONS=10000
TIMEOUT_SECONDS=30
```

## 🛠️ Troubleshooting

### Common Issues

1. **Port Conflicts**
```bash
# Find process using port
lsof -i :8910
# Kill if needed
sudo kill -9 $(lsof -t -i:8910)
```

2. **RADIUS Connection Issues**
```bash
# Test connectivity
nc -zv RADIUS_SERVER_IP 1812
# Test with radtest
radtest testuser password RADIUS_SERVER_IP 0 shared_secret
```

3. **Service Won't Start**
```bash
# Check logs
journalctl -u radiusforge -n 50
# Verify Python
python3 --version
```

## 📞 Support Resources

- **Documentation**: Available in bundle under `/opt/radiusforge/docs/`
- **API Documentation**: `http://localhost:8910/docs`
- **Health Check**: `http://localhost:8917/health`
- **Metrics**: `http://localhost:8916/metrics`
- **Version Info**: `http://localhost:8910/api/version`

## ✅ Deployment Checklist

Before deployment:
- [ ] Ports 8910-8920 are available
- [ ] Python 3.6.8+ installed (RHEL) or 3.8+ (others)
- [ ] RADIUS server configured (Access Manager or ISE)
- [ ] Shared secret configured correctly
- [ ] Firewall rules updated for ports 8910-8920
- [ ] Network connectivity to RADIUS servers verified

After deployment:
- [ ] All services started successfully
- [ ] Web UI accessible at port 8911
- [ ] Health check returns "healthy"
- [ ] Test authentication successful
- [ ] Monitoring configured (optional)
- [ ] Backup scheduled (optional)

---

**Version**: 1.3.0  
**Build Date**: August 14, 2024  
**Port Range**: 8910-8920  
**Bundles Location**: `/release/`  

© 2024 RadiusForge - Enterprise AAA Traffic Load Testing Platform