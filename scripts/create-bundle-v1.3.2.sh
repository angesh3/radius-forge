#!/bin/bash

# RadiusForge Bundle Creation Script
# Version: 1.3.2 - Fixed Live Logs color scheme
# Creates production deployment bundles with versioning support

set -e

# Configuration
VERSION="1.3.2"
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
echo "OS Support: macOS, RHEL/CentOS 8.8+"
echo ""

# Create directories
echo "Step 1: Creating directories..."
mkdir -p ${BUILD_DIR}/${FULL_BUNDLE}/{src,ui-build,scripts,docs,wheels,config}
mkdir -p ${BUILD_DIR}/${FULL_BUNDLE}/scripts/startup
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
npm install --silent 2>/dev/null || echo "  Using existing dependencies"
echo "  Building production UI..."
npm run build 2>/dev/null || echo "  Using existing build"
cd ..
echo "✓ UI build complete"

echo "Step 3: Preparing Python wheels..."
mkdir -p ${BUILD_DIR}/${FULL_BUNDLE}/wheels/rhel
mkdir -p ${BUILD_DIR}/${FULL_BUNDLE}/wheels/macos
echo "  Downloading wheels for multiple platforms..."
pip download -r requirements.txt -d ${BUILD_DIR}/${FULL_BUNDLE}/wheels/macos --quiet 2>/dev/null || echo "  Using cached wheels"
echo "✓ Python dependencies prepared"

echo "Step 4: Copying application files..."
# Copy source code
cp -r src/* ${BUILD_DIR}/${FULL_BUNDLE}/src/ 2>/dev/null || echo "  src copied"
# Copy UI build
if [ -d "ui/dist" ]; then
    cp -r ui/dist/* ${BUILD_DIR}/${FULL_BUNDLE}/ui-build/ 2>/dev/null || echo "  UI dist copied"
elif [ -d "ui/build" ]; then
    cp -r ui/build/* ${BUILD_DIR}/${FULL_BUNDLE}/ui-build/ 2>/dev/null || echo "  UI build copied"
fi
# Copy scripts
cp -r scripts/* ${BUILD_DIR}/${FULL_BUNDLE}/scripts/ 2>/dev/null || echo "  scripts copied"
# Copy startup scripts
cp scripts/startup/*.sh ${BUILD_DIR}/${FULL_BUNDLE}/scripts/startup/ 2>/dev/null || echo "  startup scripts copied"
# Copy docs
cp *.md ${BUILD_DIR}/${FULL_BUNDLE}/docs/ 2>/dev/null || echo "  docs copied"
# Copy configuration files
cp VERSION ${BUILD_DIR}/${FULL_BUNDLE}/
cp requirements.txt ${BUILD_DIR}/${FULL_BUNDLE}/
cp requirements-python36.txt ${BUILD_DIR}/${FULL_BUNDLE}/ 2>/dev/null || echo "  No Python 3.6 requirements"

# Create comprehensive configuration file
cat > ${BUILD_DIR}/${FULL_BUNDLE}/config/radiusforge.conf << EOF
# RadiusForge Configuration v${VERSION}
# Generated: ${TIMESTAMP}

[server]
version = ${VERSION}
port_range = 8910-8920

[ports]
api_server = 8910
web_ui = 8911
websocket = 8912
radius_test = 8913
tacacs_test = 8914
syslog_receiver = 8915
metrics_export = 8916
health_check = 8917
admin_api = 8918
backup_service = 8919
reserved = 8920

[radius]
# Choose: access-manager or cisco-ise
server_type = access-manager
primary_host = 192.168.1.10
primary_port = 1812
primary_secret = RadiusForge2024Secret
accounting_port = 1813

[performance]
max_workers = 8
max_connections = 10000
timeout_seconds = 30

[logging]
level = INFO
max_file_size = 100MB
max_files = 10
EOF

# Create .env.example
cat > ${BUILD_DIR}/${FULL_BUNDLE}/.env.example << EOF
# RadiusForge Environment Configuration v${VERSION}

# Core Services (Ports 8910-8920)
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
# Choose one: access-manager or cisco-ise
RADIUS_SERVER_TYPE=access-manager
RADIUS_PRIMARY_HOST=192.168.1.10
RADIUS_PRIMARY_PORT=1812
RADIUS_PRIMARY_SECRET=ChangeMeToSecureSecret
RADIUS_ACCOUNTING_PORT=1813

# Performance Settings
MAX_WORKERS=8
MAX_CONNECTIONS=10000
TIMEOUT_SECONDS=30

# Logging
LOG_LEVEL=INFO
LOG_DIR=/opt/radiusforge/logs
EOF

echo "✓ Application files copied"

echo "Step 5: Creating universal installation script..."
cat > ${BUILD_DIR}/${FULL_BUNDLE}/install.sh << 'INSTALL_SCRIPT'
#!/bin/bash

# RadiusForge Universal Installation Script v1.3.2
# Supports: macOS, RHEL/CentOS 8.8+, Ubuntu 20.04+

set -e

VERSION="1.3.2"
INSTALL_DIR="/opt/radiusforge"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${BLUE}   RadiusForge Installation v${VERSION}   ${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo ""
}

detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/redhat-release ]; then
            OS="rhel"
            OS_NAME="RHEL/CentOS"
            PYTHON_CMD="python3.6"
        elif [ -f /etc/debian_version ]; then
            OS="debian"
            OS_NAME="Ubuntu/Debian"
            PYTHON_CMD="python3"
        else
            OS="linux"
            OS_NAME="Linux"
            PYTHON_CMD="python3"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        OS_NAME="macOS"
        PYTHON_CMD="python3"
    else
        echo -e "${RED}Unsupported OS: $OSTYPE${NC}"
        exit 1
    fi
    
    echo -e "Detected OS: ${GREEN}$OS_NAME${NC}"
}

check_requirements() {
    echo "Checking requirements..."
    
    # Check Python
    if ! command -v $PYTHON_CMD &> /dev/null; then
        if command -v python3 &> /dev/null; then
            PYTHON_CMD="python3"
        else
            echo -e "${RED}✗ Python 3 not found${NC}"
            echo "  Please install Python 3.6.8+ (RHEL) or 3.8+ (others)"
            exit 1
        fi
    fi
    
    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | grep -oE '[0-9]+\.[0-9]+')
    echo "  Python version: $PYTHON_VERSION"
    
    # Check for root/sudo
    if [[ $EUID -ne 0 ]]; then
        echo -e "${YELLOW}⚠ Not running as root${NC}"
        echo "  Some operations may require sudo password"
        SUDO="sudo"
    else
        SUDO=""
    fi
    
    echo -e "${GREEN}✓ Requirements checked${NC}"
}

create_directories() {
    echo "Creating installation directories..."
    $SUDO mkdir -p $INSTALL_DIR
    $SUDO mkdir -p $INSTALL_DIR/logs
    $SUDO mkdir -p $INSTALL_DIR/data
    $SUDO mkdir -p $INSTALL_DIR/config
    echo -e "${GREEN}✓ Directories created${NC}"
}

copy_files() {
    echo "Copying application files..."
    $SUDO cp -r * $INSTALL_DIR/
    
    # Set executable permissions for scripts
    $SUDO chmod +x $INSTALL_DIR/scripts/startup/radiusforge-*.sh
    $SUDO chmod +x $INSTALL_DIR/scripts/*.sh
    
    echo -e "${GREEN}✓ Files copied${NC}"
}

install_dependencies() {
    echo "Installing Python dependencies..."
    cd $INSTALL_DIR
    
    if [ "$OS" == "rhel" ]; then
        # RHEL with Python 3.6.8
        if [ -f "requirements-python36.txt" ]; then
            $SUDO $PYTHON_CMD -m pip install --no-index --find-links wheels/rhel -r requirements-python36.txt 2>/dev/null || \
            $SUDO $PYTHON_CMD -m pip install -r requirements-python36.txt
        else
            $SUDO $PYTHON_CMD -m pip install --no-index --find-links wheels/rhel -r requirements.txt 2>/dev/null || \
            $SUDO $PYTHON_CMD -m pip install -r requirements.txt
        fi
    else
        # macOS and other systems
        $SUDO $PYTHON_CMD -m pip install --no-index --find-links wheels/macos -r requirements.txt 2>/dev/null || \
        $SUDO $PYTHON_CMD -m pip install -r requirements.txt
    fi
    
    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

setup_configuration() {
    echo "Setting up configuration..."
    
    if [ ! -f "$INSTALL_DIR/.env" ]; then
        $SUDO cp $INSTALL_DIR/.env.example $INSTALL_DIR/.env
        echo -e "${YELLOW}  Created .env from template${NC}"
        echo -e "${YELLOW}  Please edit: $INSTALL_DIR/.env${NC}"
    else
        echo "  Existing configuration preserved"
    fi
    
    echo -e "${GREEN}✓ Configuration ready${NC}"
}

install_service() {
    echo "Installing service..."
    
    if [ "$OS" == "macos" ]; then
        echo "  Using macOS startup script"
        echo -e "${YELLOW}  To install service: $INSTALL_DIR/scripts/startup/radiusforge-macos.sh install${NC}"
    elif [ "$OS" == "rhel" ] || [ "$OS" == "linux" ]; then
        echo "  Using systemd service"
        echo -e "${YELLOW}  To install service: sudo $INSTALL_DIR/scripts/startup/radiusforge-rhel.sh install${NC}"
    elif [ "$OS" == "debian" ]; then
        echo "  Using systemd service"
        # Create a basic systemd service
        $SUDO cat > /etc/systemd/system/radiusforge.service << EOF
[Unit]
Description=RadiusForge AAA Testing Platform
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=$PYTHON_CMD $INSTALL_DIR/src/api/main_simple.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        $SUDO systemctl daemon-reload
        $SUDO systemctl enable radiusforge
        echo -e "${GREEN}  ✓ Systemd service installed${NC}"
    fi
}

configure_firewall() {
    echo "Configuring firewall..."
    
    if [ "$OS" == "rhel" ] || [ "$OS" == "linux" ]; then
        if command -v firewall-cmd &> /dev/null; then
            for port in {8910..8920}; do
                $SUDO firewall-cmd --permanent --add-port=${port}/tcp 2>/dev/null
            done
            $SUDO firewall-cmd --reload 2>/dev/null
            echo -e "${GREEN}  ✓ Firewall configured${NC}"
        fi
    elif [ "$OS" == "debian" ]; then
        if command -v ufw &> /dev/null; then
            for port in {8910..8920}; do
                $SUDO ufw allow ${port}/tcp 2>/dev/null
            done
            echo -e "${GREEN}  ✓ UFW configured${NC}"
        fi
    elif [ "$OS" == "macos" ]; then
        echo "  macOS firewall configuration may be required"
        echo "  System Preferences > Security & Privacy > Firewall"
    fi
}

print_summary() {
    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}   Installation Complete!                 ${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""
    echo "Installation Directory: $INSTALL_DIR"
    echo "Configuration File: $INSTALL_DIR/.env"
    echo "Version: ${VERSION}"
    echo ""
    echo "Service Ports:"
    echo "  • API Server:     8910"
    echo "  • Web UI:         8911"
    echo "  • WebSocket:      8912"
    echo "  • RADIUS Test:    8913"
    echo "  • TACACS+ Test:   8914"
    echo "  • Syslog:         8915"
    echo "  • Metrics:        8916"
    echo "  • Health Check:   8917"
    echo "  • Admin API:      8918"
    echo "  • Backup Service: 8919"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Edit configuration:"
    echo "   $SUDO nano $INSTALL_DIR/.env"
    echo ""
    echo "2. Start services:"
    if [ "$OS" == "macos" ]; then
        echo "   $INSTALL_DIR/scripts/startup/radiusforge-macos.sh start"
        echo "   Or install as service:"
        echo "   $INSTALL_DIR/scripts/startup/radiusforge-macos.sh install"
    else
        echo "   $SUDO $INSTALL_DIR/scripts/startup/radiusforge-rhel.sh start"
        echo "   Or with systemd:"
        echo "   $SUDO systemctl start radiusforge"
    fi
    echo ""
    echo "3. Access Web UI:"
    echo "   http://localhost:8911"
    echo ""
    echo "4. Check health:"
    echo "   curl http://localhost:8917/health"
    echo ""
}

# Main installation flow
print_header
detect_os
check_requirements
create_directories
copy_files
install_dependencies
setup_configuration
install_service
configure_firewall
print_summary
INSTALL_SCRIPT

chmod +x ${BUILD_DIR}/${FULL_BUNDLE}/install.sh
echo "✓ Installation script created"

echo "Step 6: Creating manifest..."
cat > ${BUILD_DIR}/${FULL_BUNDLE}/manifest.json << EOF
{
  "version": "${VERSION}",
  "build_date": "${TIMESTAMP}",
  "port_range": "8910-8920",
  "os_support": ["macOS", "RHEL 8.8+", "CentOS 8+", "Ubuntu 20.04+"],
  "python_versions": {
    "rhel": "3.6.8+",
    "macos": "3.8+",
    "ubuntu": "3.8+"
  },
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
  "startup_scripts": {
    "macos": "scripts/startup/radiusforge-macos.sh",
    "rhel": "scripts/startup/radiusforge-rhel.sh"
  },
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
  ],
  "changes_from_v1.3.1": [
    "Fixed Live Logs color scheme for dark background",
    "Improved text visibility with proper contrast",
    "Enhanced log level chip colors",
    "Better timestamp and details readability"
  ]
}
EOF
echo "✓ Manifest created"

echo "Step 7: Creating delta bundle..."
# Copy only changed files for delta
cp ${BUILD_DIR}/${FULL_BUNDLE}/VERSION ${BUILD_DIR}/${DELTA_BUNDLE}/
cp ${BUILD_DIR}/${FULL_BUNDLE}/manifest.json ${BUILD_DIR}/${DELTA_BUNDLE}/
cp -r ${BUILD_DIR}/${FULL_BUNDLE}/scripts ${BUILD_DIR}/${DELTA_BUNDLE}/
cp -r ${BUILD_DIR}/${FULL_BUNDLE}/src ${BUILD_DIR}/${DELTA_BUNDLE}/
cp -r ${BUILD_DIR}/${FULL_BUNDLE}/ui-build ${BUILD_DIR}/${DELTA_BUNDLE}/
cp -r ${BUILD_DIR}/${FULL_BUNDLE}/config ${BUILD_DIR}/${DELTA_BUNDLE}/

# Create delta update script
cat > ${BUILD_DIR}/${DELTA_BUNDLE}/update.sh << 'UPDATE_SCRIPT'
#!/bin/bash
echo "==========================================="
echo "RadiusForge Delta Update to v1.3.2"
echo "==========================================="

INSTALL_DIR="/opt/radiusforge"

# Detect if running with sudo
if [[ $EUID -ne 0 ]]; then
    SUDO="sudo"
else
    SUDO=""
fi

# Backup current version
echo "Creating backup..."
$SUDO cp -r $INSTALL_DIR ${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)

# Apply updates
echo "Applying updates..."
$SUDO cp -r scripts/* $INSTALL_DIR/scripts/
$SUDO cp -r src/* $INSTALL_DIR/src/
$SUDO cp -r ui-build/* $INSTALL_DIR/ui-build/ 2>/dev/null || true
$SUDO cp -r config/* $INSTALL_DIR/config/
$SUDO cp VERSION $INSTALL_DIR/
$SUDO cp manifest.json $INSTALL_DIR/

# Set permissions
$SUDO chmod +x $INSTALL_DIR/scripts/startup/*.sh
$SUDO chmod +x $INSTALL_DIR/scripts/*.sh

# Restart service
echo "Restarting service..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    $SUDO systemctl restart radiusforge 2>/dev/null || \
    $SUDO $INSTALL_DIR/scripts/startup/radiusforge-rhel.sh restart
elif [[ "$OSTYPE" == "darwin"* ]]; then
    $INSTALL_DIR/scripts/startup/radiusforge-macos.sh restart
fi

echo ""
echo "Update complete to v1.3.2!"
echo "Changes:"
echo "  • Fixed Live Logs color scheme for better visibility"
echo "  • Improved text contrast on dark background"
echo "  • Enhanced log level chip colors"
echo "  • Better timestamp and details readability"
echo ""
echo "Port range: 8910-8920"
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
- **Port Range**: 8910-8920 (11 dedicated services)
- **OS Support**: macOS, RHEL 8.8+, CentOS 8+, Ubuntu 20.04+

## Download Bundles

### Full Installation Bundle
- **File**: ${FULL_BUNDLE}.tar.gz
- **Size**: ${FULL_SIZE}
- **SHA256**: ${FULL_CHECKSUM}
- **Use for**: New installations on any supported OS

### Delta Update Bundle
- **File**: ${DELTA_BUNDLE}.tar.gz
- **Size**: ${DELTA_SIZE}
- **SHA256**: ${DELTA_CHECKSUM}
- **Use for**: Updating from v1.3.1

## What's Fixed in v${VERSION}

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
\`\`\`bash
tar -xzf ${FULL_BUNDLE}.tar.gz
cd ${FULL_BUNDLE}
sudo ./install.sh
\`\`\`

### Update from v1.3.1
\`\`\`bash
tar -xzf ${DELTA_BUNDLE}.tar.gz
cd ${DELTA_BUNDLE}
sudo ./update.sh
\`\`\`

## Quick Start

### macOS
\`\`\`bash
# Start services
/opt/radiusforge/scripts/startup/radiusforge-macos.sh start

# Install auto-start
/opt/radiusforge/scripts/startup/radiusforge-macos.sh install
\`\`\`

### RHEL/CentOS
\`\`\`bash
# Start with systemd
sudo systemctl start radiusforge

# Or use startup script
sudo /opt/radiusforge/scripts/startup/radiusforge-rhel.sh start
\`\`\`

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

1. **Check Health**: \`curl http://localhost:8917/health\`
2. **Access UI**: http://localhost:8911
3. **View Live Logs**: Navigate to Live Logs page and start streaming
4. **Verify Colors**: Ensure log text is clearly visible on dark background

## Support
- Documentation: See DEPLOYMENT_GUIDE.md
- Version check: \`curl http://localhost:8910/api/version\`

---
Built with ❤️ by RadiusForge Team
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
echo "🎨 UI Fix in v${VERSION}:"
echo "   • Fixed Live Logs color scheme"
echo "   • Improved text visibility on dark background"
echo "   • Better contrast for all log elements"
echo ""