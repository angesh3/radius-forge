#!/bin/bash

# RadiusForge Bundle Creation Script
# Version: 1.3.0
# Creates production deployment bundles with versioning support

set -e

# Configuration
VERSION=$(cat VERSION)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BUILD_DIR="build"
RELEASE_DIR="release"
BUNDLE_NAME="RADIUSFORGE-PRODUCTION-V${VERSION}"
FULL_BUNDLE="${BUNDLE_NAME}-COMPLETE"
DELTA_BUNDLE="${BUNDLE_NAME}-DELTA"

# Port configuration for v1.3.0
declare -A PORTS=(
    ["API_SERVER"]="8910"
    ["WEB_UI"]="8911"
    ["WEBSOCKET"]="8912"
    ["RADIUS_TEST"]="8913"
    ["TACACS_TEST"]="8914"
    ["SYSLOG_RECEIVER"]="8915"
    ["METRICS_EXPORT"]="8916"
    ["HEALTH_CHECK"]="8917"
    ["ADMIN_API"]="8918"
    ["BACKUP_SERVICE"]="8919"
    ["RESERVED"]="8920"
)

echo "========================================="
echo "RadiusForge Bundle Creation v${VERSION}"
echo "========================================="
echo "Timestamp: ${TIMESTAMP}"
echo "Port Range: 8910-8920"
echo ""

# Create directories
mkdir -p ${BUILD_DIR}/${FULL_BUNDLE}
mkdir -p ${BUILD_DIR}/${DELTA_BUNDLE}
mkdir -p ${RELEASE_DIR}

# Function to calculate file checksum
calculate_checksum() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        shasum -a 256 "$1" | awk '{print $1}'
    else
        sha256sum "$1" | awk '{print $1}'
    fi
}

echo "Step 1: Building UI..."
cd ui
npm install --silent
npm run build
cd ..
echo "✓ UI build complete"

echo "Step 2: Preparing Python wheels..."
mkdir -p ${BUILD_DIR}/${FULL_BUNDLE}/wheels
pip download -r requirements.txt -d ${BUILD_DIR}/${FULL_BUNDLE}/wheels --quiet
echo "✓ Python dependencies downloaded"

echo "Step 3: Copying application files..."
# Full bundle
cp -r src ${BUILD_DIR}/${FULL_BUNDLE}/
cp -r ui/build ${BUILD_DIR}/${FULL_BUNDLE}/ui-build
cp -r scripts ${BUILD_DIR}/${FULL_BUNDLE}/
cp -r docs ${BUILD_DIR}/${FULL_BUNDLE}/
cp VERSION ${BUILD_DIR}/${FULL_BUNDLE}/
cp requirements.txt ${BUILD_DIR}/${FULL_BUNDLE}/
cp .env.example ${BUILD_DIR}/${FULL_BUNDLE}/

# Create port configuration file
cat > ${BUILD_DIR}/${FULL_BUNDLE}/port-config.json << EOF
{
  "version": "${VERSION}",
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
  "description": "RadiusForge AAA Traffic Load Testing Platform"
}
EOF

echo "✓ Application files copied"

echo "Step 4: Creating installation script..."
cat > ${BUILD_DIR}/${FULL_BUNDLE}/install.sh << 'INSTALL_SCRIPT'
#!/bin/bash

# RadiusForge Installation Script v1.3.0

set -e

echo "==========================================="
echo "RadiusForge Installation v1.3.0"
echo "==========================================="

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    if [ -f /etc/redhat-release ]; then
        DISTRO="rhel"
    elif [ -f /etc/debian_version ]; then
        DISTRO="debian"
    else
        DISTRO="unknown"
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    DISTRO="macos"
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

echo "Detected OS: $OS ($DISTRO)"

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | grep -oE '[0-9]+\.[0-9]+')
echo "Python version: $PYTHON_VERSION"

# Install directory
INSTALL_DIR="/opt/radiusforge"
sudo mkdir -p $INSTALL_DIR

echo "Installing to: $INSTALL_DIR"

# Copy files
echo "Copying application files..."
sudo cp -r * $INSTALL_DIR/

# Install Python dependencies
echo "Installing Python dependencies..."
cd $INSTALL_DIR
sudo pip3 install --no-index --find-links wheels -r requirements.txt

# Setup services
echo "Setting up services..."

if [ "$OS" == "linux" ]; then
    # SystemD service
    sudo cat > /etc/systemd/system/radiusforge.service << EOF
[Unit]
Description=RadiusForge AAA Testing Platform
After=network.target

[Service]
Type=simple
User=radiusforge
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/python3 src/api/main_simple.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable radiusforge
    
    # Configure firewall
    echo "Configuring firewall for ports 8910-8920..."
    for port in {8910..8920}; do
        sudo firewall-cmd --permanent --add-port=${port}/tcp 2>/dev/null || true
    done
    sudo firewall-cmd --reload 2>/dev/null || true
    
elif [ "$OS" == "macos" ]; then
    # LaunchD service
    sudo cat > /Library/LaunchDaemons/com.radiusforge.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.radiusforge</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>$INSTALL_DIR/src/api/main_simple.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF
    
    sudo launchctl load /Library/LaunchDaemons/com.radiusforge.plist
fi

# Create user
echo "Creating service user..."
if [ "$OS" == "linux" ]; then
    sudo useradd -r -s /bin/false radiusforge 2>/dev/null || true
elif [ "$OS" == "macos" ]; then
    sudo dscl . -create /Users/radiusforge 2>/dev/null || true
fi

# Set permissions
sudo chown -R radiusforge:radiusforge $INSTALL_DIR 2>/dev/null || true

echo ""
echo "==========================================="
echo "Installation Complete!"
echo "==========================================="
echo ""
echo "Service Ports:"
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
echo "Start service:"
echo "  Linux:  sudo systemctl start radiusforge"
echo "  macOS:  sudo launchctl start com.radiusforge"
echo ""
INSTALL_SCRIPT

chmod +x ${BUILD_DIR}/${FULL_BUNDLE}/install.sh
echo "✓ Installation script created"

echo "Step 5: Creating manifest..."
MANIFEST_FILE="${BUILD_DIR}/${FULL_BUNDLE}/manifest.json"
echo "{" > $MANIFEST_FILE
echo "  \"version\": \"${VERSION}\"," >> $MANIFEST_FILE
echo "  \"build_date\": \"${TIMESTAMP}\"," >> $MANIFEST_FILE
echo "  \"port_range\": \"8910-8920\"," >> $MANIFEST_FILE
echo "  \"checksums\": {" >> $MANIFEST_FILE

# Calculate checksums for important files
FIRST=true
for file in src/api/main_simple.py ui-build/index.html VERSION; do
    if [ -f "${BUILD_DIR}/${FULL_BUNDLE}/${file}" ]; then
        CHECKSUM=$(calculate_checksum "${BUILD_DIR}/${FULL_BUNDLE}/${file}")
        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo "," >> $MANIFEST_FILE
        fi
        echo -n "    \"${file}\": \"${CHECKSUM}\"" >> $MANIFEST_FILE
    fi
done

echo "" >> $MANIFEST_FILE
echo "  }," >> $MANIFEST_FILE
echo "  \"components\": [" >> $MANIFEST_FILE
echo "    \"API Server (8910)\"," >> $MANIFEST_FILE
echo "    \"Web UI (8911)\"," >> $MANIFEST_FILE
echo "    \"WebSocket (8912)\"," >> $MANIFEST_FILE
echo "    \"RADIUS Test Client (8913)\"," >> $MANIFEST_FILE
echo "    \"TACACS+ Test Client (8914)\"," >> $MANIFEST_FILE
echo "    \"Syslog Receiver (8915)\"," >> $MANIFEST_FILE
echo "    \"Metrics Export (8916)\"," >> $MANIFEST_FILE
echo "    \"Health Check API (8917)\"," >> $MANIFEST_FILE
echo "    \"Admin API (8918)\"," >> $MANIFEST_FILE
echo "    \"Backup Service (8919)\"" >> $MANIFEST_FILE
echo "  ]" >> $MANIFEST_FILE
echo "}" >> $MANIFEST_FILE

echo "✓ Manifest created"

echo "Step 6: Creating delta bundle..."
# Get previous version
PREV_VERSION=$(ls -1 ${RELEASE_DIR}/*.tar.gz 2>/dev/null | grep -oE 'V[0-9]+\.[0-9]+\.[0-9]+' | sort -V | tail -n 1 | sed 's/V//')
if [ -z "$PREV_VERSION" ]; then
    echo "  No previous version found, delta will be same as full"
    cp -r ${BUILD_DIR}/${FULL_BUNDLE}/* ${BUILD_DIR}/${DELTA_BUNDLE}/
else
    echo "  Creating delta from version ${PREV_VERSION}"
    # Copy only changed files (simplified for demo)
    cp ${BUILD_DIR}/${FULL_BUNDLE}/VERSION ${BUILD_DIR}/${DELTA_BUNDLE}/
    cp ${BUILD_DIR}/${FULL_BUNDLE}/port-config.json ${BUILD_DIR}/${DELTA_BUNDLE}/
    cp -r ${BUILD_DIR}/${FULL_BUNDLE}/src ${BUILD_DIR}/${DELTA_BUNDLE}/
    cp -r ${BUILD_DIR}/${FULL_BUNDLE}/ui-build ${BUILD_DIR}/${DELTA_BUNDLE}/
    cp ${BUILD_DIR}/${FULL_BUNDLE}/manifest.json ${BUILD_DIR}/${DELTA_BUNDLE}/
    
    # Create delta update script
    cat > ${BUILD_DIR}/${DELTA_BUNDLE}/update.sh << 'UPDATE_SCRIPT'
#!/bin/bash
# Delta Update Script
echo "Applying delta update to v1.3.0..."
INSTALL_DIR="/opt/radiusforge"

# Backup current version
sudo cp -r $INSTALL_DIR ${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)

# Apply updates
sudo cp -r * $INSTALL_DIR/

# Restart service
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo systemctl restart radiusforge
elif [[ "$OSTYPE" == "darwin"* ]]; then
    sudo launchctl stop com.radiusforge
    sudo launchctl start com.radiusforge
fi

echo "Update complete!"
UPDATE_SCRIPT
    chmod +x ${BUILD_DIR}/${DELTA_BUNDLE}/update.sh
fi
echo "✓ Delta bundle created"

echo "Step 7: Compressing bundles..."
cd ${BUILD_DIR}
tar -czf ${FULL_BUNDLE}.tar.gz ${FULL_BUNDLE}
tar -czf ${DELTA_BUNDLE}.tar.gz ${DELTA_BUNDLE}
cd ..

# Calculate bundle checksums
FULL_CHECKSUM=$(calculate_checksum "${BUILD_DIR}/${FULL_BUNDLE}.tar.gz")
DELTA_CHECKSUM=$(calculate_checksum "${BUILD_DIR}/${DELTA_BUNDLE}.tar.gz")

# Move to release directory
mv ${BUILD_DIR}/${FULL_BUNDLE}.tar.gz ${RELEASE_DIR}/
mv ${BUILD_DIR}/${DELTA_BUNDLE}.tar.gz ${RELEASE_DIR}/

# Create release notes
cat > ${RELEASE_DIR}/${BUNDLE_NAME}-RELEASE.md << EOF
# RadiusForge v${VERSION} Release

## Build Information
- **Version**: ${VERSION}
- **Build Date**: ${TIMESTAMP}
- **Port Range**: 8910-8920

## Bundles
- **Full Bundle**: ${FULL_BUNDLE}.tar.gz
  - Size: $(du -h ${RELEASE_DIR}/${FULL_BUNDLE}.tar.gz | cut -f1)
  - SHA256: ${FULL_CHECKSUM}
  
- **Delta Bundle**: ${DELTA_BUNDLE}.tar.gz
  - Size: $(du -h ${RELEASE_DIR}/${DELTA_BUNDLE}.tar.gz | cut -f1)
  - SHA256: ${DELTA_CHECKSUM}

## Port Allocation
| Port | Service | Description |
|------|---------|-------------|
| 8910 | API Server | Main application API |
| 8911 | Web UI | React frontend |
| 8912 | WebSocket | Real-time communications |
| 8913 | RADIUS Test | RADIUS client testing |
| 8914 | TACACS+ Test | TACACS+ client testing |
| 8915 | Syslog Receiver | Log aggregation |
| 8916 | Metrics Export | Prometheus metrics |
| 8917 | Health Check | Service health monitoring |
| 8918 | Admin API | Administrative functions |
| 8919 | Backup Service | Data backup and restore |
| 8920 | Reserved | Future expansion |

## Installation
\`\`\`bash
# Full installation
tar -xzf ${FULL_BUNDLE}.tar.gz
cd ${FULL_BUNDLE}
sudo ./install.sh

# Delta update
tar -xzf ${DELTA_BUNDLE}.tar.gz
cd ${DELTA_BUNDLE}
sudo ./update.sh
\`\`\`

## Changes in v${VERSION}
- Expanded port range from 8910 to 8910-8920
- Added versioned deployment bundle system
- Implemented delta updates
- Enhanced security with port validation
- Added comprehensive deployment management UI
- Fixed "Asset Manager" → "Access Manager" naming
- Implemented RADIUS target selection (Access Manager OR ISE)
EOF

echo "✓ Release notes created"

echo ""
echo "========================================="
echo "Bundle Creation Complete!"
echo "========================================="
echo ""
echo "Bundles created in ${RELEASE_DIR}/"
echo "  - ${FULL_BUNDLE}.tar.gz ($(du -h ${RELEASE_DIR}/${FULL_BUNDLE}.tar.gz | cut -f1))"
echo "  - ${DELTA_BUNDLE}.tar.gz ($(du -h ${RELEASE_DIR}/${DELTA_BUNDLE}.tar.gz | cut -f1))"
echo ""
echo "Checksums:"
echo "  Full:  ${FULL_CHECKSUM}"
echo "  Delta: ${DELTA_CHECKSUM}"
echo ""

# Cleanup
rm -rf ${BUILD_DIR}