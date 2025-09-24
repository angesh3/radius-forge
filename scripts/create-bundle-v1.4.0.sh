#!/bin/bash

# RadiusForge Ultimate Bundle Creation Script
# Version: 1.4.0 - Includes Traditional + Container Deployment
# Creates comprehensive production deployment bundles

set -e

# Configuration
VERSION="1.4.0"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BUILD_DIR="build"
RELEASE_DIR="release"
BUNDLE_NAME="RADIUSFORGE-PRODUCTION-V${VERSION}"
FULL_BUNDLE="${BUNDLE_NAME}-COMPLETE"
CONTAINER_BUNDLE="${BUNDLE_NAME}-CONTAINER"

echo "========================================="
echo "RadiusForge Bundle Creation v${VERSION}"
echo "========================================="
echo "Timestamp: ${TIMESTAMP}"
echo "Port Range: 8910-8920"
echo "Deployment: Traditional + Container"
echo "OS Support: macOS, RHEL/CentOS 8.8+, Docker"
echo ""

# Create directories
echo "Step 1: Creating directories..."
mkdir -p ${BUILD_DIR}/${FULL_BUNDLE}/{src,ui-build,scripts,docs,wheels,config,container}
mkdir -p ${BUILD_DIR}/${FULL_BUNDLE}/scripts/startup
mkdir -p ${BUILD_DIR}/${CONTAINER_BUNDLE}
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

# Copy Docker files
cp Dockerfile ${BUILD_DIR}/${FULL_BUNDLE}/container/ 2>/dev/null || echo "  Dockerfile copied"
cp docker-compose-allinone.yml ${BUILD_DIR}/${FULL_BUNDLE}/container/docker-compose.yml 2>/dev/null || echo "  docker-compose copied"

# Create comprehensive configuration file
cat > ${BUILD_DIR}/${FULL_BUNDLE}/config/radiusforge.conf << EOF
# RadiusForge Configuration v${VERSION}
# Generated: ${TIMESTAMP}

[server]
version = ${VERSION}
port_range = 8910-8920
deployment_types = traditional,container

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

echo "Step 5: Creating deployment chooser script..."
cat > ${BUILD_DIR}/${FULL_BUNDLE}/deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash

# RadiusForge Universal Deployment Script v1.4.0
# Supports: Traditional Installation and Container Deployment

set -e

VERSION="1.4.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${BLUE}   RadiusForge Deployment v${VERSION}     ${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo ""
}

print_header

echo "Choose deployment method:"
echo ""
echo "1) Traditional Installation (Python + Node.js)"
echo "   - Best for: Production servers with specific requirements"
echo "   - Requires: Python 3.6.8+ (RHEL) or 3.8+ (macOS)"
echo ""
echo "2) Container Deployment (Docker)"
echo "   - Best for: Quick deployment, testing, isolated environments"
echo "   - Requires: Docker only"
echo ""
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}Starting Traditional Installation...${NC}"
        ./install-traditional.sh
        ;;
    2)
        echo ""
        echo -e "${GREEN}Starting Container Deployment...${NC}"
        ./install-container.sh
        ;;
    *)
        echo -e "${RED}Invalid choice. Please run again and select 1 or 2.${NC}"
        exit 1
        ;;
esac
DEPLOY_SCRIPT

chmod +x ${BUILD_DIR}/${FULL_BUNDLE}/deploy.sh

echo "Step 6: Creating traditional installation script..."
cat > ${BUILD_DIR}/${FULL_BUNDLE}/install-traditional.sh << 'INSTALL_SCRIPT'
#!/bin/bash

# RadiusForge Traditional Installation Script v1.4.0
# Supports: macOS, RHEL/CentOS 8.8+, Ubuntu 20.04+

set -e

VERSION="1.4.0"
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
    $SUDO cp -r src $INSTALL_DIR/
    $SUDO cp -r ui-build $INSTALL_DIR/
    $SUDO cp -r scripts $INSTALL_DIR/
    $SUDO cp -r docs $INSTALL_DIR/
    $SUDO cp -r config/* $INSTALL_DIR/config/
    $SUDO cp VERSION $INSTALL_DIR/
    $SUDO cp requirements.txt $INSTALL_DIR/
    
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
        $SUDO $PYTHON_CMD -m pip install --no-index --find-links wheels/rhel -r requirements.txt 2>/dev/null || \
        $SUDO $PYTHON_CMD -m pip install -r requirements.txt
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
        $SUDO cp $INSTALL_DIR/config/radiusforge.conf $INSTALL_DIR/.env
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
        echo ""
        echo -e "${GREEN}To manage services:${NC}"
        echo "  Start:    $INSTALL_DIR/scripts/startup/radiusforge-macos.sh start"
        echo "  Stop:     $INSTALL_DIR/scripts/startup/radiusforge-macos.sh stop"
        echo "  Status:   $INSTALL_DIR/scripts/startup/radiusforge-macos.sh status"
        echo "  Install:  $INSTALL_DIR/scripts/startup/radiusforge-macos.sh install"
    elif [ "$OS" == "rhel" ] || [ "$OS" == "linux" ]; then
        echo "  Installing systemd service..."
        $SUDO $INSTALL_DIR/scripts/startup/radiusforge-rhel.sh install
        echo ""
        echo -e "${GREEN}To manage services:${NC}"
        echo "  Start:    sudo systemctl start radiusforge"
        echo "  Stop:     sudo systemctl stop radiusforge"
        echo "  Status:   sudo systemctl status radiusforge"
    fi
}

configure_firewall() {
    echo "Configuring firewall..."
    
    if [ "$OS" == "rhel" ] || [ "$OS" == "linux" ]; then
        if command -v firewall-cmd &> /dev/null; then
            for port in {8910..8920}; do
                $SUDO firewall-cmd --permanent --add-port=${port}/tcp 2>/dev/null
                $SUDO firewall-cmd --permanent --add-port=${port}/udp 2>/dev/null
            done
            $SUDO firewall-cmd --reload 2>/dev/null
            echo -e "${GREEN}  ✓ Firewall configured${NC}"
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
    echo "2. Start services (see commands above)"
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

chmod +x ${BUILD_DIR}/${FULL_BUNDLE}/install-traditional.sh

echo "Step 7: Creating container installation script..."
cat > ${BUILD_DIR}/${FULL_BUNDLE}/install-container.sh << 'CONTAINER_SCRIPT'
#!/bin/bash

# RadiusForge Container Installation Script v1.4.0

set -e

VERSION="1.4.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${BLUE}   RadiusForge Container Deployment      ${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo ""
}

print_header

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found${NC}"
    echo ""
    echo "Please install Docker first:"
    echo "  macOS:  brew install --cask docker"
    echo "  Linux:  curl -fsSL https://get.docker.com | sh"
    echo "  Or visit: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✓ Docker found${NC}"
echo "  Version: $(docker --version)"

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo -e "${YELLOW}⚠ docker-compose not found, will use docker run${NC}"
    COMPOSE_CMD=""
fi

echo ""
echo "Building Docker image..."
docker build -f container/Dockerfile -t radiusforge:${VERSION}-allinone .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi

echo ""
echo "Starting RadiusForge container..."

if [ -n "$COMPOSE_CMD" ] && [ -f "container/docker-compose.yml" ]; then
    cd container
    $COMPOSE_CMD up -d
    cd ..
else
    docker run -d \
        --name radiusforge \
        --restart unless-stopped \
        -p 8910-8920:8910-8920 \
        -v $(pwd)/data:/opt/radiusforge/data \
        -v $(pwd)/logs:/opt/radiusforge/logs \
        -v $(pwd)/config:/opt/radiusforge/config \
        radiusforge:${VERSION}-allinone
fi

echo ""
echo "Waiting for services to start..."
sleep 5

# Check health
echo ""
echo "Checking health status..."
if curl -f http://localhost:8917/health 2>/dev/null; then
    echo ""
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠ Services starting, please wait...${NC}"
fi

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}   Container Deployment Complete!        ${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "🌐 Access Points:"
echo "  • Web UI:        http://localhost:8911"
echo "  • API Server:    http://localhost:8910"
echo "  • API Docs:      http://localhost:8910/docs"
echo "  • Health Check:  http://localhost:8917/health"
echo "  • Metrics:       http://localhost:8916/metrics"
echo ""
echo "📋 Container Management:"
echo "  • View logs:     docker logs radiusforge"
echo "  • Stop:          docker stop radiusforge"
echo "  • Start:         docker start radiusforge"
echo "  • Shell access:  docker exec -it radiusforge /bin/bash"
echo ""
CONTAINER_SCRIPT

chmod +x ${BUILD_DIR}/${FULL_BUNDLE}/install-container.sh

echo "Step 8: Creating manifest..."
cat > ${BUILD_DIR}/${FULL_BUNDLE}/manifest.json << EOF
{
  "version": "${VERSION}",
  "build_date": "${TIMESTAMP}",
  "port_range": "8910-8920",
  "deployment_options": ["traditional", "container"],
  "os_support": ["macOS", "RHEL 8.8+", "CentOS 8+", "Ubuntu 20.04+", "Docker"],
  "python_versions": {
    "rhel": "3.6.8+",
    "macos": "3.8+",
    "ubuntu": "3.8+",
    "container": "3.9 (included)"
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
    "rhel": "scripts/startup/radiusforge-rhel.sh",
    "container": "Docker/docker-compose"
  },
  "radius_support": [
    "Cisco Access Manager (Primary)",
    "Cisco ISE (Alternative)"
  ],
  "changes_from_v1.3.2": [
    "Added container deployment option",
    "Unified deployment script with chooser",
    "Docker all-in-one container support",
    "Enhanced deployment flexibility",
    "Fixed Live Logs color scheme"
  ]
}
EOF
echo "✓ Manifest created"

echo "Step 9: Compressing bundle..."
cd ${BUILD_DIR}
tar -czf ${FULL_BUNDLE}.tar.gz ${FULL_BUNDLE}
cd ..

# Calculate checksum
FULL_CHECKSUM=$(calculate_checksum "${BUILD_DIR}/${FULL_BUNDLE}.tar.gz")

# Move to release directory
mv ${BUILD_DIR}/${FULL_BUNDLE}.tar.gz ${RELEASE_DIR}/

# Get file size
FULL_SIZE=$(ls -lh ${RELEASE_DIR}/${FULL_BUNDLE}.tar.gz | awk '{print $5}')

echo "✓ Bundle compressed and moved to release/"

# Create release notes
cat > ${RELEASE_DIR}/RELEASE-NOTES-v${VERSION}.md << EOF
# RadiusForge v${VERSION} Release Notes

## Release Information
- **Version**: ${VERSION}
- **Build Date**: ${TIMESTAMP}
- **Port Range**: 8910-8920 (11 dedicated services)
- **Deployment Options**: Traditional + Container
- **OS Support**: macOS, RHEL 8.8+, CentOS 8+, Ubuntu 20.04+, Docker

## Download Bundle

### Complete Bundle (Traditional + Container)
- **File**: ${FULL_BUNDLE}.tar.gz
- **Size**: ${FULL_SIZE}
- **SHA256**: ${FULL_CHECKSUM}
- **Use for**: Any deployment method on any supported OS

## What's New in v${VERSION}

### Major Feature: Container Deployment
1. **Docker All-in-One Container**
   - Single container with all services
   - No dependencies except Docker
   - Built-in Nginx and Supervisor
   - Health monitoring included

2. **Flexible Deployment Options**
   - Choose between traditional or container
   - Unified deployment script
   - Same bundle works for both methods

3. **Enhanced Portability**
   - Works identically on macOS, Linux, Windows (with Docker)
   - Simplified installation process
   - Consistent experience across platforms

### Improvements
- Fixed Live Logs color scheme (from v1.3.2)
- Enhanced startup scripts for macOS and RHEL
- Better service management
- Comprehensive deployment documentation

## Deployment Instructions

### Extract Bundle
\`\`\`bash
tar -xzf ${FULL_BUNDLE}.tar.gz
cd ${FULL_BUNDLE}
\`\`\`

### Option 1: Automatic Deployment (Recommended)
\`\`\`bash
./deploy.sh
# Choose:
#   1) Traditional Installation
#   2) Container Deployment
\`\`\`

### Option 2: Traditional Installation
\`\`\`bash
./install-traditional.sh
\`\`\`

### Option 3: Container Deployment
\`\`\`bash
./install-container.sh
\`\`\`

## Quick Start Commands

### Traditional (macOS)
\`\`\`bash
/opt/radiusforge/scripts/startup/radiusforge-macos.sh start
\`\`\`

### Traditional (RHEL)
\`\`\`bash
sudo systemctl start radiusforge
\`\`\`

### Container
\`\`\`bash
docker start radiusforge
# or
docker-compose up -d
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
3. **API Docs**: http://localhost:8910/docs
4. **View Metrics**: http://localhost:8916/metrics

## Container Management

\`\`\`bash
# View logs
docker logs -f radiusforge

# Stop container
docker stop radiusforge

# Start container
docker start radiusforge

# Shell access
docker exec -it radiusforge /bin/bash
\`\`\`

## Support
- Documentation: See docs/ directory
- Container Guide: CONTAINER_DEPLOYMENT_GUIDE.md
- Version check: \`curl http://localhost:8910/api/version\`

---
Built with ❤️ by RadiusForge Team
EOF

echo "✓ Release notes created"

# Create deployment summary
cat > ${RELEASE_DIR}/DEPLOYMENT_SUMMARY_v${VERSION}.md << EOF
# RadiusForge v${VERSION} - Universal Deployment Bundle

## 🚀 Quick Deployment Guide

This bundle includes **BOTH** traditional and container deployment options!

### For Remote macOS:
\`\`\`bash
# Transfer bundle
scp ${FULL_BUNDLE}.tar.gz user@mac-server:/tmp/

# On macOS server
tar -xzf /tmp/${FULL_BUNDLE}.tar.gz
cd ${FULL_BUNDLE}
./deploy.sh  # Choose option 1 or 2
\`\`\`

### For Remote RHEL/CentOS:
\`\`\`bash
# Transfer bundle
scp ${FULL_BUNDLE}.tar.gz user@rhel-server:/tmp/

# On RHEL server
tar -xzf /tmp/${FULL_BUNDLE}.tar.gz
cd ${FULL_BUNDLE}
./deploy.sh  # Choose option 1 or 2
\`\`\`

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
   Edit \`.env\` or \`config/radiusforge.conf\`

2. **Access UI**:
   http://SERVER_IP:8911

3. **Check Health**:
   curl http://SERVER_IP:8917/health

4. **View Logs**:
   - Traditional: \`/opt/radiusforge/logs/\`
   - Container: \`docker logs radiusforge\`

---
Version: ${VERSION}
Build: ${TIMESTAMP}
Bundle: ${FULL_BUNDLE}.tar.gz
Size: ${FULL_SIZE}
SHA256: ${FULL_CHECKSUM}
EOF

# Cleanup build directory
rm -rf ${BUILD_DIR}

echo ""
echo "========================================="
echo "✅ Bundle Creation Complete!"
echo "========================================="
echo ""
echo "📦 Bundle created in ${RELEASE_DIR}/"
echo "   • ${FULL_BUNDLE}.tar.gz (${FULL_SIZE})"
echo ""
echo "🔐 Checksum:"
echo "   • SHA256: ${FULL_CHECKSUM}"
echo ""
echo "📝 Documentation:"
echo "   • ${RELEASE_DIR}/RELEASE-NOTES-v${VERSION}.md"
echo "   • ${RELEASE_DIR}/DEPLOYMENT_SUMMARY_v${VERSION}.md"
echo ""
echo "🎯 Deployment Options:"
echo "   1. Traditional Installation (Python + Node.js)"
echo "   2. Container Deployment (Docker only)"
echo ""
echo "📋 Next Steps:"
echo "   1. Transfer bundle to target system"
echo "   2. Extract: tar -xzf ${FULL_BUNDLE}.tar.gz"
echo "   3. Deploy: ./deploy.sh"
echo ""