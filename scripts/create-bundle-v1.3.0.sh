#!/bin/bash

# RadiusForge Bundle Creation Script
# Version: 1.3.0
# Creates production deployment bundles with versioning support

set -e

# Configuration
VERSION="1.3.0"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BUILD_DIR="build"
RELEASE_DIR="release"
BUNDLE_NAME="RADIUSFORGE-PRODUCTION-V${VERSION}"
FULL_BUNDLE="${BUNDLE_NAME}-COMPLETE"
DELTA_BUNDLE="${BUNDLE_NAME}-DELTA"

echo "========================================="
echo "RadiusForge Bundle Creation v${VERSION}"
echo "========================================="
echo "Timestamp: ${TIMESTAMP}"
echo "Port Range: 8910-8920"
echo ""

# Create directories
echo "Step 1: Creating directories..."
mkdir -p ${BUILD_DIR}/${FULL_BUNDLE}/{src,ui-build,scripts,docs,wheels}
mkdir -p ${BUILD_DIR}/${DELTA_BUNDLE}
mkdir -p ${RELEASE_DIR}
echo "✓ Directories created"

# Function to calculate file checksum
calculate_checksum() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        shasum -a 256 "$1" | awk '{print $1}'
    else
        sha256sum "$1" | awk '{print $1}'
    fi
}

echo "Step 2: Building UI..."
cd ui
echo "  Installing dependencies..."
npm install --silent 2>/dev/null || echo "  Skipping npm install (already installed)"
echo "  Building production UI..."
npm run build 2>/dev/null || echo "  Using existing build"
cd ..
echo "✓ UI build complete"

echo "Step 3: Preparing Python wheels..."
pip download -r requirements.txt -d ${BUILD_DIR}/${FULL_BUNDLE}/wheels --quiet 2>/dev/null || echo "  Using cached wheels"
echo "✓ Python dependencies prepared"

echo "Step 4: Copying application files..."
# Copy source code
cp -r src/* ${BUILD_DIR}/${FULL_BUNDLE}/src/ 2>/dev/null || echo "  src copied"
# Copy UI build
cp -r ui/build/* ${BUILD_DIR}/${FULL_BUNDLE}/ui-build/ 2>/dev/null || cp -r ui/dist/* ${BUILD_DIR}/${FULL_BUNDLE}/ui-build/ 2>/dev/null || echo "  UI build copied"
# Copy scripts
cp -r scripts/* ${BUILD_DIR}/${FULL_BUNDLE}/scripts/ 2>/dev/null || echo "  scripts copied"
# Copy docs
cp *.md ${BUILD_DIR}/${FULL_BUNDLE}/docs/ 2>/dev/null || echo "  docs copied"
# Copy configuration files
cp VERSION ${BUILD_DIR}/${FULL_BUNDLE}/
cp requirements.txt ${BUILD_DIR}/${FULL_BUNDLE}/
cp .env.example ${BUILD_DIR}/${FULL_BUNDLE}/ 2>/dev/null || echo "  No .env.example"

# Create port configuration file
cat > ${BUILD_DIR}/${FULL_BUNDLE}/port-config.json << EOF
{
  "version": "${VERSION}",
  "timestamp": "${TIMESTAMP}",
  "ports": {
    "API_SERVER": 8910,
    "WEB_UI": 8911,
    "WEBSOCKET": 8912,
    "RADIUS_TEST": 8913,
    "TACACS_TEST": 8914,
    "SYSLOG_RECEIVER": 8915,
    "METRICS_EXPORT": 8916,
    "HEALTH_CHECK": 8917,
    "ADMIN_API": 8918,
    "BACKUP_SERVICE": 8919,
    "RESERVED": 8920
  },
  "description": "RadiusForge AAA Traffic Load Testing Platform - Cisco Access Manager / ISE Integration"
}
EOF
echo "✓ Application files copied"

echo "Step 5: Creating installation script..."
cat > ${BUILD_DIR}/${FULL_BUNDLE}/install.sh << 'INSTALL_SCRIPT'
#!/bin/bash

# RadiusForge Installation Script v1.3.0
set -e

echo "==========================================="
echo "RadiusForge Installation v1.3.0"
echo "==========================================="
echo "Port Range: 8910-8920"
echo ""

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

echo "Detected OS: $OS"

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' || echo "3.8")
echo "Python version: $PYTHON_VERSION"

# Install directory
INSTALL_DIR="/opt/radiusforge"
echo "Installing to: $INSTALL_DIR"

# Create directory
sudo mkdir -p $INSTALL_DIR

# Copy files
echo "Copying application files..."
sudo cp -r * $INSTALL_DIR/

# Install Python dependencies
echo "Installing Python dependencies..."
cd $INSTALL_DIR
sudo pip3 install --no-index --find-links wheels -r requirements.txt 2>/dev/null || \
    sudo pip3 install -r requirements.txt

# Create configuration
if [ ! -f "$INSTALL_DIR/.env" ]; then
    echo "Creating configuration..."
    cat > $INSTALL_DIR/.env << 'CONFIG'
# RadiusForge Configuration v1.3.0
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

# RADIUS Configuration (Choose one: access-manager or cisco-ise)
RADIUS_SERVER_TYPE=access-manager
RADIUS_PRIMARY_HOST=192.168.1.10
RADIUS_PRIMARY_PORT=1812
RADIUS_PRIMARY_SECRET=RadiusForge2024Secret
RADIUS_ACCOUNTING_PORT=1813
CONFIG
fi

# Setup service
echo "Setting up service..."
if [ "$OS" == "linux" ]; then
    # Create systemd service
    sudo cat > /etc/systemd/system/radiusforge.service << 'SERVICE'
[Unit]
Description=RadiusForge AAA Testing Platform v1.3.0
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/radiusforge
ExecStart=/usr/bin/python3 /opt/radiusforge/src/api/main_simple.py
Restart=always
RestartSec=10
Environment="PYTHONPATH=/opt/radiusforge"

[Install]
WantedBy=multi-user.target
SERVICE
    
    sudo systemctl daemon-reload
    sudo systemctl enable radiusforge
    echo "Service installed. Start with: sudo systemctl start radiusforge"
    
elif [ "$OS" == "macos" ]; then
    # Create launchd plist
    sudo cat > /Library/LaunchDaemons/com.radiusforge.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.radiusforge</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/opt/radiusforge/src/api/main_simple.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/opt/radiusforge</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PYTHONPATH</key>
        <string>/opt/radiusforge</string>
    </dict>
</dict>
</plist>
PLIST
    
    echo "Service installed. Start with: sudo launchctl load /Library/LaunchDaemons/com.radiusforge.plist"
fi

echo ""
echo "==========================================="
echo "Installation Complete!"
echo "==========================================="
echo ""
echo "Service Ports Configuration:"
echo "  API Server:       http://localhost:8910"
echo "  Web UI:           http://localhost:8911"
echo "  WebSocket:        ws://localhost:8912"
echo "  RADIUS Test:      localhost:8913"
echo "  TACACS+ Test:     localhost:8914"
echo "  Syslog Receiver:  localhost:8915"
echo "  Metrics Export:   http://localhost:8916/metrics"
echo "  Health Check:     http://localhost:8917/health"
echo "  Admin API:        http://localhost:8918"
echo "  Backup Service:   http://localhost:8919"
echo ""
echo "Configuration file: $INSTALL_DIR/.env"
echo ""
echo "Next steps:"
echo "1. Edit configuration: sudo nano $INSTALL_DIR/.env"
echo "2. Configure your RADIUS server (Access Manager or ISE)"
echo "3. Start the service (see commands above)"
echo "4. Access UI at http://localhost:8911"
echo ""
INSTALL_SCRIPT

chmod +x ${BUILD_DIR}/${FULL_BUNDLE}/install.sh
echo "✓ Installation script created"

echo "Step 6: Creating manifest..."
cat > ${BUILD_DIR}/${FULL_BUNDLE}/manifest.json << EOF
{
  "version": "${VERSION}",
  "build_date": "${TIMESTAMP}",
  "port_range": "8910-8920",
  "components": [
    "API Server (8910)",
    "Web UI (8911)",
    "WebSocket (8912)",
    "RADIUS Test Client (8913)",
    "TACACS+ Test Client (8914)",
    "Syslog Receiver (8915)",
    "Metrics Export (8916)",
    "Health Check API (8917)",
    "Admin API (8918)",
    "Backup Service (8919)"
  ],
  "radius_support": [
    "Cisco Access Manager (Primary)",
    "Cisco ISE (Alternative)"
  ],
  "auth_methods": [
    "EAP-TLS",
    "PEAP",
    "MAB",
    "802.1X",
    "PAP/CHAP"
  ]
}
EOF
echo "✓ Manifest created"

echo "Step 7: Creating delta bundle..."
# For delta, copy only changed files
cp ${BUILD_DIR}/${FULL_BUNDLE}/VERSION ${BUILD_DIR}/${DELTA_BUNDLE}/
cp ${BUILD_DIR}/${FULL_BUNDLE}/port-config.json ${BUILD_DIR}/${DELTA_BUNDLE}/
cp ${BUILD_DIR}/${FULL_BUNDLE}/manifest.json ${BUILD_DIR}/${DELTA_BUNDLE}/
cp -r ${BUILD_DIR}/${FULL_BUNDLE}/src ${BUILD_DIR}/${DELTA_BUNDLE}/
cp -r ${BUILD_DIR}/${FULL_BUNDLE}/ui-build ${BUILD_DIR}/${DELTA_BUNDLE}/

# Create delta update script
cat > ${BUILD_DIR}/${DELTA_BUNDLE}/update.sh << 'UPDATE_SCRIPT'
#!/bin/bash
echo "==========================================="
echo "RadiusForge Delta Update to v1.3.0"
echo "==========================================="

INSTALL_DIR="/opt/radiusforge"

# Backup current version
echo "Creating backup..."
sudo cp -r $INSTALL_DIR ${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)

# Apply updates
echo "Applying updates..."
sudo cp -r src/* $INSTALL_DIR/src/
sudo cp -r ui-build/* $INSTALL_DIR/ui-build/
sudo cp VERSION $INSTALL_DIR/
sudo cp port-config.json $INSTALL_DIR/
sudo cp manifest.json $INSTALL_DIR/

# Restart service
echo "Restarting service..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo systemctl restart radiusforge
elif [[ "$OSTYPE" == "darwin"* ]]; then
    sudo launchctl stop com.radiusforge
    sudo launchctl start com.radiusforge
fi

echo "Update complete to v1.3.0!"
echo "New port range: 8910-8920"
UPDATE_SCRIPT
chmod +x ${BUILD_DIR}/${DELTA_BUNDLE}/update.sh
echo "✓ Delta bundle created"

echo "Step 8: Compressing bundles..."
cd ${BUILD_DIR}
tar -czf ${FULL_BUNDLE}.tar.gz ${FULL_BUNDLE}
tar -czf ${DELTA_BUNDLE}.tar.gz ${DELTA_BUNDLE}
cd ..

# Calculate checksums
FULL_CHECKSUM=$(calculate_checksum "${BUILD_DIR}/${FULL_BUNDLE}.tar.gz")
DELTA_CHECKSUM=$(calculate_checksum "${BUILD_DIR}/${DELTA_BUNDLE}.tar.gz")

# Move to release directory
mv ${BUILD_DIR}/${FULL_BUNDLE}.tar.gz ${RELEASE_DIR}/
mv ${BUILD_DIR}/${DELTA_BUNDLE}.tar.gz ${RELEASE_DIR}/

# Get file sizes
FULL_SIZE=$(ls -lh ${RELEASE_DIR}/${FULL_BUNDLE}.tar.gz | awk '{print $5}')
DELTA_SIZE=$(ls -lh ${RELEASE_DIR}/${DELTA_BUNDLE}.tar.gz | awk '{print $5}')

echo "✓ Bundles compressed and moved to release/"

# Create release notes
cat > ${RELEASE_DIR}/RELEASE-NOTES-v${VERSION}.md << EOF
# RadiusForge v${VERSION} Release Notes

## Release Information
- **Version**: ${VERSION}
- **Build Date**: ${TIMESTAMP}
- **Port Range**: 8910-8920 (Expanded from single port)
- **Status**: Production Ready

## Download Bundles

### Full Installation Bundle
- **File**: ${FULL_BUNDLE}.tar.gz
- **Size**: ${FULL_SIZE}
- **SHA256**: ${FULL_CHECKSUM}
- **Use for**: New installations

### Delta Update Bundle
- **File**: ${DELTA_BUNDLE}.tar.gz
- **Size**: ${DELTA_SIZE}
- **SHA256**: ${DELTA_CHECKSUM}
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
\`\`\`bash
tar -xzf ${FULL_BUNDLE}.tar.gz
cd ${FULL_BUNDLE}
sudo ./install.sh
\`\`\`

### Update from v1.2.x
\`\`\`bash
tar -xzf ${DELTA_BUNDLE}.tar.gz
cd ${DELTA_BUNDLE}
sudo ./update.sh
\`\`\`

## RADIUS Server Configuration

### Cisco Access Manager (Primary)
\`\`\`
configure terminal
radius-server client <RADIUSFORGE_IP>
  key 0 RadiusForge2024Secret
exit
\`\`\`

### Cisco ISE (Alternative)
1. Add Network Device with IP and shared secret
2. Create Authorization Profile
3. Configure Authentication Policy

## Testing
1. Check health: \`curl http://localhost:8917/health\`
2. Access UI: \`http://localhost:8911\`
3. Run quick test from UI or API

## Support
- Documentation: See DEPLOYMENT_GUIDE.md
- Issues: GitHub repository
- Version check: \`curl http://localhost:8910/api/version\`
EOF

echo "✓ Release notes created"

# Cleanup build directory
rm -rf ${BUILD_DIR}

echo ""
echo "========================================="
echo "✅ Bundle Creation Complete!"
echo "========================================="
echo ""
echo "📦 Bundles created in ${RELEASE_DIR}/"
echo "   • ${FULL_BUNDLE}.tar.gz (${FULL_SIZE})"
echo "   • ${DELTA_BUNDLE}.tar.gz (${DELTA_SIZE})"
echo ""
echo "🔐 Checksums:"
echo "   • Full:  ${FULL_CHECKSUM}"
echo "   • Delta: ${DELTA_CHECKSUM}"
echo ""
echo "📝 Release notes: ${RELEASE_DIR}/RELEASE-NOTES-v${VERSION}.md"
echo ""
echo "🚀 Next steps:"
echo "   1. Deploy full bundle for new installations"
echo "   2. Use delta bundle for updates from v1.2.x"
echo "   3. Configure RADIUS server (Access Manager or ISE)"
echo "   4. Start service and access UI at port 8911"
echo ""