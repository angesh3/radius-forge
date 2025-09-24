# RadiusForge v1.3.1 - Complete Deployment Guide

## 🚀 Quick Deployment for Remote Systems

This guide covers deployment on **remote macOS** and **RHEL/CentOS 8.8+** systems.

## 📦 Bundle Files

### Latest Bundles (v1.3.1)
- **Full Installation**: `RADIUSFORGE-PRODUCTION-V1.3.1-COMPLETE.tar.gz` (33MB)
  - SHA256: `93212280230270eacc042fbd5b19da3bcde2838d780f425417952f66fcfd815d`
  
- **Delta Update**: `RADIUSFORGE-PRODUCTION-V1.3.1-DELTA.tar.gz` (404KB)
  - SHA256: `2eb4f6cee3c7700b98a6304941d2133c1e10fa5c445e7b068fb3c11aff333a77`

### Previous Versions
- Archived in: `release/archive-v1.3.0/`

## 🖥️ macOS Deployment

### Prerequisites
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python and Node.js
brew install python@3.11 node
```

### Installation Steps

1. **Transfer Bundle to Remote Mac**
```bash
# From your local machine
scp release/RADIUSFORGE-PRODUCTION-V1.3.1-COMPLETE.tar.gz user@mac-server:/tmp/
```

2. **SSH to Remote Mac and Install**
```bash
ssh user@mac-server

# Extract bundle
cd /tmp
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.1-COMPLETE.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.3.1-COMPLETE

# Run installation
sudo ./install.sh

# Installation will:
# - Create /opt/radiusforge directory
# - Install Python dependencies
# - Copy all files
# - Setup configuration
```

3. **Configure Environment**
```bash
sudo nano /opt/radiusforge/.env

# Set your RADIUS server details:
RADIUS_SERVER_TYPE=access-manager  # or cisco-ise
RADIUS_PRIMARY_HOST=192.168.1.10
RADIUS_PRIMARY_SECRET=YourSecretHere
```

4. **Start Services**
```bash
# Option 1: Manual start
/opt/radiusforge/scripts/startup/radiusforge-macos.sh start

# Option 2: Install as auto-start service (recommended)
/opt/radiusforge/scripts/startup/radiusforge-macos.sh install
launchctl load ~/Library/LaunchAgents/com.radiusforge.plist

# Check status
/opt/radiusforge/scripts/startup/radiusforge-macos.sh status
```

5. **Verify Installation**
```bash
# Check health
curl http://localhost:8917/health

# Check all ports
for port in {8910..8920}; do
  echo "Port $port: $(nc -zv localhost $port 2>&1 | grep -o 'succeeded\|refused')"
done
```

### macOS Service Commands
```bash
# Start services
/opt/radiusforge/scripts/startup/radiusforge-macos.sh start

# Stop services
/opt/radiusforge/scripts/startup/radiusforge-macos.sh stop

# Restart services
/opt/radiusforge/scripts/startup/radiusforge-macos.sh restart

# Check status
/opt/radiusforge/scripts/startup/radiusforge-macos.sh status

# View logs
/opt/radiusforge/scripts/startup/radiusforge-macos.sh logs

# Install auto-start
/opt/radiusforge/scripts/startup/radiusforge-macos.sh install

# Uninstall auto-start
/opt/radiusforge/scripts/startup/radiusforge-macos.sh uninstall
```

## 🐧 RHEL/CentOS 8.8+ Deployment

### Prerequisites
```bash
# Install Python 3.6.8 and required packages
sudo yum install -y python36 python36-pip
sudo yum install -y git gcc python36-devel

# Install Node.js (optional, for UI development)
curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash -
sudo yum install -y nodejs
```

### Installation Steps

1. **Transfer Bundle to RHEL Server**
```bash
# From your local machine
scp release/RADIUSFORGE-PRODUCTION-V1.3.1-COMPLETE.tar.gz user@rhel-server:/tmp/
```

2. **SSH to RHEL Server and Install**
```bash
ssh user@rhel-server

# Extract bundle
cd /tmp
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.1-COMPLETE.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.3.1-COMPLETE

# Run installation (as root or with sudo)
sudo ./install.sh

# Installation will:
# - Create /opt/radiusforge directory
# - Create radiusforge service user
# - Install Python dependencies
# - Configure firewall
# - Setup SELinux policies (if enabled)
```

3. **Configure Environment**
```bash
sudo nano /opt/radiusforge/.env

# Set your RADIUS server details:
RADIUS_SERVER_TYPE=access-manager  # or cisco-ise
RADIUS_PRIMARY_HOST=192.168.1.10
RADIUS_PRIMARY_SECRET=YourSecretHere
```

4. **Install and Start SystemD Service**
```bash
# Install as systemd service
sudo /opt/radiusforge/scripts/startup/radiusforge-rhel.sh install

# Start service
sudo systemctl start radiusforge
sudo systemctl start radiusforge-health

# Enable auto-start on boot
sudo systemctl enable radiusforge
sudo systemctl enable radiusforge-health

# Check status
sudo systemctl status radiusforge
```

5. **Configure Firewall**
```bash
# Open ports 8910-8920
for port in {8910..8920}; do
  sudo firewall-cmd --permanent --add-port=${port}/tcp
  sudo firewall-cmd --permanent --add-port=${port}/udp
done
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-ports
```

6. **Verify Installation**
```bash
# Check health
curl http://localhost:8917/health

# Check service status
sudo systemctl status radiusforge
sudo systemctl status radiusforge-health

# View logs
sudo journalctl -u radiusforge -f
```

### RHEL Service Commands
```bash
# Using startup script
sudo /opt/radiusforge/scripts/startup/radiusforge-rhel.sh start|stop|restart|status|logs

# Using systemd
sudo systemctl start radiusforge
sudo systemctl stop radiusforge
sudo systemctl restart radiusforge
sudo systemctl status radiusforge

# View logs
sudo journalctl -u radiusforge -n 50
sudo tail -f /opt/radiusforge/logs/api.log
```

## 🔧 RADIUS Server Configuration

### Cisco Access Manager
```bash
configure terminal
radius-server client YOUR_RADIUSFORGE_IP
  address ipv4 YOUR_RADIUSFORGE_IP
  key 0 YourSharedSecret
  description "RadiusForge Load Tester v1.3.1"
exit

aaa authentication dot1x default group radius
aaa authentication login default group radius
aaa authorization network default group radius
```

### Cisco ISE
1. Add Network Device:
   - Name: `RadiusForge_v1.3.1`
   - IP: Your RadiusForge server IP
   - Shared Secret: Match your .env configuration

2. Create Authorization Profile
3. Configure Authentication Policy

## 📊 Testing & Validation

### Basic Health Check
```bash
# Check API health
curl http://YOUR_SERVER_IP:8917/health

# Expected response:
{
  "status": "healthy",
  "version": "1.3.1",
  "ports": "8910-8920",
  "platform": "RHEL"  # or "macOS"
}
```

### Test Authentication
```bash
# Quick authentication test
curl -X POST http://YOUR_SERVER_IP:8910/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "method": "EAP-TLS",
    "username": "testuser",
    "password": "TestPass123",
    "server": "access-manager"
  }'
```

### Load Test
```bash
# Create test profile
cat > load-test.json << EOF
{
  "name": "Initial Test",
  "targets": [
    {"rps": 100, "duration": 60},
    {"rps": 500, "duration": 60}
  ],
  "auth_method": "MAB",
  "server_type": "access-manager"
}
EOF

# Run test
curl -X POST http://YOUR_SERVER_IP:8910/api/test/scale \
  -H "Content-Type: application/json" \
  -d @load-test.json
```

## 🔄 Updating from v1.3.0

If you have v1.3.0 installed, use the delta bundle:

```bash
# Transfer delta bundle
scp release/RADIUSFORGE-PRODUCTION-V1.3.1-DELTA.tar.gz user@server:/tmp/

# On the server
cd /tmp
tar -xzf RADIUSFORGE-PRODUCTION-V1.3.1-DELTA.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.3.1-DELTA
sudo ./update.sh

# Service will restart automatically
```

## 🛠️ Troubleshooting

### macOS Issues

**LaunchAgent won't load:**
```bash
# Check for errors
launchctl list | grep radiusforge

# Manually load
launchctl unload ~/Library/LaunchAgents/com.radiusforge.plist
launchctl load ~/Library/LaunchAgents/com.radiusforge.plist

# Check logs
tail -f /opt/radiusforge/logs/launchd.err
```

**Port already in use:**
```bash
# Find process
lsof -i :8910

# Kill if needed
kill -9 $(lsof -t -i:8910)
```

### RHEL Issues

**SELinux blocking:**
```bash
# Check SELinux denials
sudo ausearch -m avc -ts recent

# Set permissive mode (temporary)
sudo setenforce 0

# Configure proper context
sudo semanage port -a -t http_port_t -p tcp 8910-8920
```

**Python version mismatch:**
```bash
# Check Python version
python3 --version

# Use Python 3.6 specifically
sudo alternatives --set python3 /usr/bin/python3.6
```

**Service won't start:**
```bash
# Check for errors
sudo journalctl -u radiusforge -n 50

# Check permissions
ls -la /opt/radiusforge/
sudo chown -R radiusforge:radiusforge /opt/radiusforge
```

## 📋 Port Reference

| Port | Service | Protocol | Purpose |
|------|---------|----------|---------|
| 8910 | API Server | HTTP | Main application API |
| 8911 | Web UI | HTTP | React frontend |
| 8912 | WebSocket | WS | Real-time updates |
| 8913 | RADIUS Test | UDP | RADIUS client |
| 8914 | TACACS+ Test | TCP | TACACS+ client |
| 8915 | Syslog | TCP/UDP | Log receiver |
| 8916 | Metrics | HTTP | Prometheus endpoint |
| 8917 | Health | HTTP | Health check API |
| 8918 | Admin | HTTPS | Admin functions |
| 8919 | Backup | HTTP | Backup service |
| 8920 | Reserved | - | Future use |

## 🔐 Security Considerations

1. **Change Default Secrets**
   - Edit `/opt/radiusforge/.env`
   - Use strong RADIUS shared secret
   - Update API keys

2. **Firewall Rules**
   - Only open required ports
   - Restrict source IPs if possible

3. **Service User**
   - RadiusForge runs as dedicated user
   - Limited permissions

4. **TLS/SSL**
   - Configure for production
   - Use certificates for HTTPS

## ✅ Deployment Checklist

### Pre-Installation
- [ ] Target OS: macOS or RHEL 8.8+
- [ ] Python 3.6.8+ (RHEL) or 3.8+ (macOS)
- [ ] 50GB free disk space
- [ ] Network access to RADIUS servers
- [ ] Ports 8910-8920 available

### Installation
- [ ] Bundle transferred to server
- [ ] Installation script executed
- [ ] Configuration file edited
- [ ] RADIUS server details configured
- [ ] Service installed (systemd/launchd)

### Post-Installation
- [ ] Service started successfully
- [ ] Health check returns "healthy"
- [ ] Web UI accessible
- [ ] Test authentication working
- [ ] Firewall rules configured
- [ ] Auto-start enabled

### Testing
- [ ] All ports responding
- [ ] Authentication test passed
- [ ] Load test executed
- [ ] Logs being generated
- [ ] Metrics available

## 📞 Support

- **Installation Logs**: `/opt/radiusforge/logs/`
- **Health Check**: `http://YOUR_SERVER:8917/health`
- **API Documentation**: `http://YOUR_SERVER:8910/docs`
- **Version Check**: `curl http://YOUR_SERVER:8910/api/version`

---

**Version**: 1.3.1  
**Release Date**: August 14, 2024  
**Bundle Location**: `release/`  

© 2024 RadiusForge - Enterprise AAA Traffic Load Testing Platform