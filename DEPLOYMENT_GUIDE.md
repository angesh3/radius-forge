# RadiusForge v1.3.0 Complete Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Port Configuration](#port-configuration)
4. [Installation Methods](#installation-methods)
5. [RADIUS Server Setup](#radius-server-setup)
6. [Testing & Validation](#testing--validation)
7. [Troubleshooting](#troubleshooting)

## Overview

RadiusForge is an enterprise AAA Traffic Load Testing Platform designed to test RADIUS authentication at scale. Version 1.3.0 introduces expanded port range (8910-8920), versioned deployment bundles, and enhanced RADIUS server integration.

### Key Features
- Support for Cisco Access Manager (Primary) and Cisco ISE (Alternative)
- Load testing up to 100,000 RPS
- MAB, 802.1X, EAP-TLS, PEAP authentication methods
- Real-time monitoring and analytics
- Comprehensive reporting

## System Requirements

### Hardware Requirements
- **CPU**: 8+ cores recommended
- **RAM**: 16GB minimum, 32GB recommended
- **Storage**: 50GB available space
- **Network**: 10Gbps NIC for high-load testing

### Software Requirements
- **OS**: RHEL 8.8, Ubuntu 20.04+, macOS 10.14+
- **Python**: 3.6.8+ (RHEL), 3.8+ (Ubuntu/macOS)
- **Node.js**: 14.x or higher
- **Docker**: 20.10+ (optional)

### Network Requirements
- Ports 8910-8920 available
- Network access to RADIUS servers
- Firewall rules configured

## Port Configuration

### Port Allocation (v1.3.0)

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 8910 | API Server | HTTP/REST | Main application API |
| 8911 | Web UI | HTTP | React frontend interface |
| 8912 | WebSocket | WS | Real-time communications |
| 8913 | RADIUS Test | UDP | RADIUS client testing |
| 8914 | TACACS+ Test | TCP | TACACS+ client testing |
| 8915 | Syslog Receiver | TCP/UDP | Log aggregation |
| 8916 | Metrics Export | HTTP | Prometheus metrics endpoint |
| 8917 | Health Check | HTTP | Service health monitoring |
| 8918 | Admin API | HTTPS | Administrative functions |
| 8919 | Backup Service | HTTP | Data backup and restore |
| 8920 | Reserved | - | Future expansion |

### Firewall Configuration

#### RHEL/CentOS
```bash
# Open ports 8910-8920
for port in {8910..8920}; do
    sudo firewall-cmd --permanent --add-port=${port}/tcp
    sudo firewall-cmd --permanent --add-port=${port}/udp
done
sudo firewall-cmd --reload
```

#### Ubuntu/Debian
```bash
# Using ufw
for port in {8910..8920}; do
    sudo ufw allow ${port}/tcp
    sudo ufw allow ${port}/udp
done
sudo ufw reload
```

#### macOS
```bash
# Add to /etc/pf.conf
pass in proto tcp from any to any port 8910:8920
pass in proto udp from any to any port 8910:8920

# Reload
sudo pfctl -f /etc/pf.conf
```

## Installation Methods

### Method 1: Production Bundle Installation

#### Step 1: Download Bundle
```bash
# Download the appropriate bundle
wget https://radiusforge.example.com/releases/RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE.tar.gz

# Or for updates
wget https://radiusforge.example.com/releases/RADIUSFORGE-PRODUCTION-V1.3.0-DELTA.tar.gz
```

#### Step 2: Extract and Install
```bash
# Full installation
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.3.0-COMPLETE
sudo ./install.sh

# Delta update (from previous version)
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.0-DELTA.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.3.0-DELTA
sudo ./update.sh
```

#### Step 3: Configure Environment
```bash
# Copy and edit configuration
sudo cp /opt/radiusforge/.env.example /opt/radiusforge/.env
sudo nano /opt/radiusforge/.env

# Set the following:
API_HOST=0.0.0.0
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
RADIUS_PRIMARY_SECRET=your-secret-here
RADIUS_ACCOUNTING_PORT=1813
```

#### Step 4: Start Services
```bash
# Linux (systemd)
sudo systemctl start radiusforge
sudo systemctl enable radiusforge
sudo systemctl status radiusforge

# macOS (launchd)
sudo launchctl load /Library/LaunchDaemons/com.radiusforge.plist
sudo launchctl start com.radiusforge
```

### Method 2: Docker Installation

#### Step 1: Build Docker Image
```bash
# Clone repository
git clone https://github.com/radiusforge/radiusforge.git
cd radiusforge

# Build image
docker build -t radiusforge:1.3.0 .
```

#### Step 2: Run Container
```bash
# Create docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'
services:
  radiusforge:
    image: radiusforge:1.3.0
    container_name: radiusforge
    ports:
      - "8910-8920:8910-8920"
    environment:
      - API_PORT=8910
      - UI_PORT=8911
      - WEBSOCKET_PORT=8912
      - RADIUS_TEST_PORT=8913
      - RADIUS_SERVER_TYPE=access-manager
      - RADIUS_PRIMARY_HOST=192.168.1.10
    volumes:
      - ./data:/opt/radiusforge/data
      - ./logs:/opt/radiusforge/logs
    restart: unless-stopped
EOF

# Start services
docker-compose up -d
```

### Method 3: Development Installation

```bash
# Clone repository
git clone https://github.com/radiusforge/radiusforge.git
cd radiusforge

# Install Python dependencies
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Install UI dependencies
cd ui
npm install
npm run build
cd ..

# Start services
python src/api/main_simple.py &
cd ui && npm run dev &
```

## RADIUS Server Setup

### Cisco Access Manager Configuration

#### Step 1: Add RadiusForge as NAS Client
```bash
# Access Manager CLI
configure terminal
radius-server client 192.168.1.100
  address ipv4 192.168.1.100
  key 0 RadiusForge2024Secret
  description "RadiusForge Load Testing Platform"
exit

# Enable required authentication methods
aaa authentication dot1x default group radius
aaa authentication login default group radius
aaa authorization network default group radius
aaa accounting network default start-stop group radius
```

#### Step 2: Configure Authentication Policies
```bash
# Create test policy
policy-map type control subscriber RADIUSFORGE_TEST
  event session-started match-all
    10 class always do-authenticate aaa authc-list default
  event authentication-success match-all
    10 class always do-authorize aaa authz-list default
```

#### Step 3: Enable Logging
```bash
# Configure syslog for RadiusForge
logging host 192.168.1.100 transport tcp port 8915
logging facility local0
logging trap debugging
```

### Cisco ISE Configuration

#### Step 1: Add Network Device
1. Navigate to **Administration > Network Resources > Network Devices**
2. Click **Add**
3. Configure:
   - Name: `RadiusForge`
   - IP Address: `192.168.1.100`
   - Device Type: `Load Testing`
   - Shared Secret: `RadiusForge2024Secret`
   - Enable RADIUS

#### Step 2: Create Authorization Profile
1. Navigate to **Policy > Policy Elements > Results > Authorization Profiles**
2. Click **Add**
3. Configure:
   - Name: `RadiusForge_Test_Profile`
   - Access Type: `ACCESS_ACCEPT`
   - VLAN: `100` (test VLAN)

#### Step 3: Create Authentication Policy
1. Navigate to **Policy > Authentication**
2. Add Rule:
   - Name: `RadiusForge_Test`
   - Conditions: `DEVICE:Name EQUALS RadiusForge`
   - Allowed Protocols: `Default Network Access`
   - Use: `Internal Users`

#### Step 4: Enable pxGrid (Optional)
```bash
# Enable pxGrid for extended integration
application configure ise
pxgrid
  enable
  client RadiusForge password RadiusForge2024
exit
```

## Testing & Validation

### Step 1: Verify Installation
```bash
# Check service status
curl http://localhost:8917/health

# Expected response:
{
  "status": "healthy",
  "version": "1.3.0",
  "services": {
    "api": "running",
    "ui": "running",
    "websocket": "running",
    "radius_test": "ready"
  }
}
```

### Step 2: Access Web UI
1. Open browser to `http://localhost:8911`
2. Default credentials: `admin / RadiusForge2024`
3. Navigate to **Configuration > RADIUS Servers**
4. Verify server connectivity

### Step 3: Run Test Authentication
```bash
# Using RadiusForge CLI
radiusforge test auth \
  --method EAP-TLS \
  --server 192.168.1.10 \
  --username testuser \
  --password TestPass123 \
  --iterations 10

# Or via Web UI
1. Navigate to Quick Test
2. Select Authentication Method
3. Enter credentials
4. Click "Run Test"
```

### Step 4: Load Testing
```bash
# Create test profile
cat > test-profile.json << EOF
{
  "name": "Initial Load Test",
  "type": "scale",
  "targets": [
    {"rps": 100, "duration": 60},
    {"rps": 500, "duration": 60},
    {"rps": 1000, "duration": 120},
    {"rps": 5000, "duration": 300}
  ],
  "auth_methods": ["EAP-TLS", "MAB", "802.1X"],
  "server": "access-manager"
}
EOF

# Run test
radiusforge test load --profile test-profile.json

# Or via Web UI
1. Navigate to Scale Test
2. Configure test parameters
3. Click "Start Test"
4. Monitor real-time results
```

### Step 5: Validate Results
```bash
# Check metrics
curl http://localhost:8916/metrics | grep radiusforge

# View logs
tail -f /opt/radiusforge/logs/radiusforge.log

# Generate report
radiusforge report generate --test-id latest --format pdf
```

## Monitoring & Maintenance

### Prometheus Integration
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'radiusforge'
    static_configs:
      - targets: ['localhost:8916']
    scrape_interval: 15s
```

### Backup Configuration
```bash
# Manual backup
curl -X POST http://localhost:8919/backup

# Scheduled backup (crontab)
0 2 * * * curl -X POST http://localhost:8919/backup
```

### Log Rotation
```bash
# /etc/logrotate.d/radiusforge
/opt/radiusforge/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 radiusforge radiusforge
    sharedscripts
    postrotate
        systemctl reload radiusforge
    endscript
}
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check port usage
for port in {8910..8920}; do
    echo "Port $port: $(lsof -i :$port)"
done

# Kill conflicting process
sudo kill -9 $(lsof -t -i:8910)
```

#### RADIUS Connection Failed
```bash
# Test connectivity
nc -zv 192.168.1.10 1812

# Test RADIUS authentication
radtest testuser TestPass123 192.168.1.10 0 RadiusForge2024Secret

# Check firewall
sudo iptables -L -n | grep 1812
```

#### Service Won't Start
```bash
# Check logs
journalctl -u radiusforge -n 50

# Verify Python dependencies
pip list | grep -E "fastapi|uvicorn|pyrad"

# Check permissions
ls -la /opt/radiusforge/
```

### Performance Tuning

#### System Limits
```bash
# /etc/security/limits.conf
radiusforge soft nofile 65536
radiusforge hard nofile 65536
radiusforge soft nproc 32768
radiusforge hard nproc 32768
```

#### Kernel Parameters
```bash
# /etc/sysctl.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
```

## Security Considerations

### API Authentication
```bash
# Generate API key
radiusforge admin generate-api-key --name "Production"

# Use in requests
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:8918/admin/status
```

### TLS Configuration
```bash
# Generate certificates
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Configure in .env
TLS_ENABLED=true
TLS_CERT_PATH=/opt/radiusforge/certs/cert.pem
TLS_KEY_PATH=/opt/radiusforge/certs/key.pem
```

### RADIUS Secret Rotation
```bash
# Rotate secrets quarterly
radiusforge admin rotate-secrets --confirm

# Update in Access Manager/ISE accordingly
```

## Support & Resources

### Documentation
- User Guide: `/opt/radiusforge/docs/USER_GUIDE.md`
- API Reference: `http://localhost:8910/docs`
- Configuration Guide: `/opt/radiusforge/docs/CONFIGURATION.md`

### Logs
- Application: `/opt/radiusforge/logs/app.log`
- RADIUS Tests: `/opt/radiusforge/logs/radius.log`
- Web UI: `/opt/radiusforge/logs/ui.log`

### Contact
- GitHub: https://github.com/radiusforge/radiusforge
- Email: support@radiusforge.example.com
- Slack: radiusforge.slack.com

## Version History

### v1.3.0 (Current)
- Expanded port range to 8910-8920
- Added versioned deployment bundles
- Delta update support
- Enhanced RADIUS server integration
- Fixed Access Manager naming

### v1.2.0
- Initial production release
- Basic load testing capabilities
- Web UI implementation

---

© 2024 RadiusForge - Enterprise AAA Testing Platform