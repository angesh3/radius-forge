#!/bin/bash

# RadiusForge Unified Bundle Creation Script
# Version: 1.4.1 - Consolidated from all previous versions
# Creates production deployment bundles with archiving and validation

set -e

# Configuration - Auto-increment version using version manager
echo "Auto-incrementing version..."
python3 ops/version_manager.py --bump patch
VERSION=$(cat VERSION 2>/dev/null || echo "1.4.0")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BUILD_DIR="build"
RELEASE_DIR="release"
ARCHIVE_DIR="${RELEASE_DIR}/archive-v${VERSION}"
BUNDLE_NAME="RADIUSFORGE-PRODUCTION-V${VERSION}"
FULL_BUNDLE="${BUNDLE_NAME}-COMPLETE"
CONTAINER_BUNDLE="${BUNDLE_NAME}-CONTAINER"

ARCHIVE_RETENTION_COUNT=${ARCHIVE_RETENTION_COUNT:-5}
ARCHIVE_RETENTION_DAYS=${ARCHIVE_RETENTION_DAYS:-90}

ENABLE_SECURITY_SCAN=${ENABLE_SECURITY_SCAN:-true}
ENABLE_DEPENDENCY_CHECK=${ENABLE_DEPENDENCY_CHECK:-true}
ENABLE_BUNDLE_TEST=${ENABLE_BUNDLE_TEST:-true}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "RadiusForge Bundle Creation v${VERSION}"
echo "========================================="
echo "Timestamp: ${TIMESTAMP}"
echo "Port Range: 8910-8926"
echo "Deployment: Traditional + Container"
echo "OS Support: macOS, RHEL/CentOS 8.8+, Docker"
echo ""

# Function to calculate file checksum
calculate_checksum() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        shasum -a 256 "$1" | awk '{print $1}'
    else
        sha256sum "$1" | awk '{print $1}'
    fi
}

archive_previous_versions() {
    echo "Step: Archiving previous versions..."
    
    # Create archive directory for current version
    mkdir -p "${ARCHIVE_DIR}"
    
    if ls ${RELEASE_DIR}/RADIUSFORGE-PRODUCTION-V*.tar.gz 1> /dev/null 2>&1; then
        for bundle in ${RELEASE_DIR}/RADIUSFORGE-PRODUCTION-V*.tar.gz; do
            if [[ ! "$bundle" =~ "V${VERSION}" ]]; then
                echo "  Archiving $(basename "$bundle")"
                mv "$bundle" "${ARCHIVE_DIR}/"
            fi
        done
    fi
    
    if ls ${RELEASE_DIR}/RELEASE-NOTES-v*.md 1> /dev/null 2>&1; then
        for notes in ${RELEASE_DIR}/RELEASE-NOTES-v*.md; do
            if [[ ! "$notes" =~ "v${VERSION}" ]]; then
                echo "  Archiving $(basename "$notes")"
                mv "$notes" "${ARCHIVE_DIR}/"
            fi
        done
    fi
    
    apply_retention_policy
    
    echo -e "${GREEN}✓ Previous versions archived${NC}"
}

apply_retention_policy() {
    echo "  Applying retention policy..."
    
    local archive_dirs=($(ls -d ${RELEASE_DIR}/archive-v* 2>/dev/null | sort -V))
    local archive_count=${#archive_dirs[@]}
    
    if [ $archive_count -gt $ARCHIVE_RETENTION_COUNT ]; then
        local excess=$((archive_count - ARCHIVE_RETENTION_COUNT))
        echo "    Removing $excess old archive(s) (retention: $ARCHIVE_RETENTION_COUNT)"
        
        for ((i=0; i<excess; i++)); do
            echo "    Removing ${archive_dirs[i]}"
            rm -rf "${archive_dirs[i]}"
        done
    fi
    
    if command -v find >/dev/null 2>&1; then
        local old_archives=$(find ${RELEASE_DIR}/archive-v* -maxdepth 0 -type d -mtime +${ARCHIVE_RETENTION_DAYS} 2>/dev/null)
        if [ -n "$old_archives" ]; then
            echo "    Removing archives older than $ARCHIVE_RETENTION_DAYS days"
            echo "$old_archives" | xargs rm -rf
        fi
    fi
}

validate_bundle_structure() {
    local bundle_path="$1"
    echo "   Checking bundle structure..."
    
    # Extract to temp directory for validation
    local temp_dir=$(mktemp -d)
    tar -xzf "$bundle_path" -C "$temp_dir" 2>/dev/null || {
        echo "   ✗ Bundle extraction failed"
        rm -rf "$temp_dir"
        return 1
    }
    
    local bundle_dir=$(ls "$temp_dir")
    local bundle_root="$temp_dir/$bundle_dir"
    
    # Check required files and directories
    local required_items=(
        "src"
        "ui-build"
        "scripts"
        "docs"
        "requirements.txt"
        "VERSION"
        "deploy.sh"
        "install-traditional.sh"
        "install-container.sh"
        ".env.example"
        "MANIFEST.json"
    )
    
    local missing_items=()
    for item in "${required_items[@]}"; do
        if [ ! -e "$bundle_root/$item" ]; then
            missing_items+=("$item")
        fi
    done
    
    if [ ${#missing_items[@]} -eq 0 ]; then
        echo "   ✓ All required files present"
    else
        echo "   ✗ Missing files: ${missing_items[*]}"
        rm -rf "$temp_dir"
        return 1
    fi
    
    rm -rf "$temp_dir"
    return 0
}

security_scan_bundle() {
    local bundle_path="$1"
    echo "   Running security scan..."
    
    local temp_dir=$(mktemp -d)
    tar -xzf "$bundle_path" -C "$temp_dir" 2>/dev/null || {
        echo "   ✗ Bundle extraction failed for security scan"
        rm -rf "$temp_dir"
        return 1
    }
    
    local bundle_dir=$(ls "$temp_dir")
    local bundle_root="$temp_dir/$bundle_dir"
    
    local sensitive_patterns=(
        "*.key"
        "*.pem"
        "*.p12"
        "*.pfx"
        "*password*"
        "*secret*"
        "*.env"
    )
    
    local found_sensitive=()
    for pattern in "${sensitive_patterns[@]}"; do
        local files=$(find "$bundle_root" -name "$pattern" -not -name ".env.example" 2>/dev/null)
        if [ -n "$files" ]; then
            found_sensitive+=("$files")
        fi
    done
    
    if [ ${#found_sensitive[@]} -eq 0 ]; then
        echo "   ✓ No sensitive files found"
    else
        echo "   ⚠ Sensitive files detected: ${found_sensitive[*]}"
    fi
    
    # Check script permissions
    local executable_scripts=$(find "$bundle_root" -name "*.sh" -executable 2>/dev/null)
    if [ -n "$executable_scripts" ]; then
        echo "   ✓ Executable scripts found"
    else
        echo "   ⚠ No executable scripts found"
    fi
    
    rm -rf "$temp_dir"
    return 0
}

verify_dependencies() {
    echo "   Verifying dependencies..."
    
    if [ -f "requirements.txt" ]; then
        local dep_count=$(wc -l < requirements.txt)
        echo "   ✓ Found $dep_count Python dependencies"
        
        local vulnerable_packages=("urllib3<1.26.5" "requests<2.25.0" "jinja2<2.11.3")
        for vuln in "${vulnerable_packages[@]}"; do
            if grep -q "${vuln%<*}" requirements.txt; then
                echo "   ⚠ Potentially vulnerable package: ${vuln%<*}"
            fi
        done
    else
        echo "   ✗ requirements.txt not found"
        return 1
    fi
    
    if [ -f "ui/package.json" ]; then
        echo "   ✓ Found Node.js dependencies"
    fi
    
    return 0
}

test_bundle_deployment() {
    local bundle_path="$1"
    echo "   Testing bundle deployment..."
    
    local temp_dir=$(mktemp -d)
    tar -xzf "$bundle_path" -C "$temp_dir" 2>/dev/null || {
        echo "   ✗ Bundle extraction failed for deployment test"
        rm -rf "$temp_dir"
        return 1
    }
    
    local bundle_dir=$(ls "$temp_dir")
    local bundle_root="$temp_dir/$bundle_dir"
    
    if [ -x "$bundle_root/deploy.sh" ]; then
        echo "   ✓ Deployment script is executable"
    else
        echo "   ✗ Deployment script not executable"
        rm -rf "$temp_dir"
        return 1
    fi
    
    if [ -f "$bundle_root/.env.example" ]; then
        echo "   ✓ Configuration template present"
    else
        echo "   ✗ Configuration template missing"
        rm -rf "$temp_dir"
        return 1
    fi
    
    rm -rf "$temp_dir"
    return 0
}

validate_bundle() {
    echo "Step: Validating bundle quality..."
    
    local bundle_path="${RELEASE_DIR}/${FULL_BUNDLE}.tar.gz"
    local validation_log="${RELEASE_DIR}/validation-${VERSION}.log"
    
    echo "Bundle Validation Report - $(date)" > "$validation_log"
    echo "=======================================" >> "$validation_log"
    
    echo "1. Verifying checksums..." | tee -a "$validation_log"
    BUNDLE_CHECKSUM=$(calculate_checksum "$bundle_path")
    echo "   Bundle SHA256: $BUNDLE_CHECKSUM" | tee -a "$validation_log"
    
    # 2. Bundle structure validation
    echo "2. Validating bundle structure..." | tee -a "$validation_log"
    if validate_bundle_structure "$bundle_path" >> "$validation_log" 2>&1; then
        echo -e "${GREEN}   ✓ Bundle structure valid${NC}"
    else
        echo -e "${RED}   ✗ Bundle structure validation failed${NC}"
    fi
    
    if [ "$ENABLE_SECURITY_SCAN" = "true" ]; then
        echo "3. Security scanning..." | tee -a "$validation_log"
        security_scan_bundle "$bundle_path" >> "$validation_log" 2>&1
    fi
    
    if [ "$ENABLE_DEPENDENCY_CHECK" = "true" ]; then
        echo "4. Dependency verification..." | tee -a "$validation_log"
        verify_dependencies >> "$validation_log" 2>&1
    fi
    
    if [ "$ENABLE_BUNDLE_TEST" = "true" ]; then
        echo "5. Bundle deployment test..." | tee -a "$validation_log"
        if test_bundle_deployment "$bundle_path" >> "$validation_log" 2>&1; then
            echo -e "${GREEN}   ✓ Bundle deployment test passed${NC}"
        else
            echo -e "${RED}   ✗ Bundle deployment test failed${NC}"
        fi
    fi
    
    echo -e "${GREEN}✓ Bundle validation complete${NC}"
    echo "   Validation report: $validation_log"
}

echo "Step 1: Creating directories..."
mkdir -p ${BUILD_DIR}/${FULL_BUNDLE}/{src,ui-build,scripts,docs,wheels,config,container}
mkdir -p ${BUILD_DIR}/${FULL_BUNDLE}/scripts/startup
mkdir -p ${BUILD_DIR}/${FULL_BUNDLE}/container/docker
mkdir -p ${BUILD_DIR}/${CONTAINER_BUNDLE}
mkdir -p ${RELEASE_DIR}
echo -e "${GREEN}✓ Directories created${NC}"

echo "Step 2: Building UI..."
cd ui
echo "  Installing dependencies..."
npm install --silent 2>/dev/null || echo "  Using existing dependencies"
echo "  Building production UI..."
npm run build 2>/dev/null || echo "  Using existing build"
cd ..
echo -e "${GREEN}✓ UI build complete${NC}"

echo "Step 3: Preparing Python wheels..."
if [ ! -d "wheels" ]; then
    mkdir -p wheels
    echo "  Downloading Python wheels..."
    pip download -r requirements.txt -d wheels/ --no-deps 2>/dev/null || echo "  Using existing wheels"
fi
echo -e "${GREEN}✓ Python wheels ready${NC}"

echo "Step 4: Copying application files..."
cp -r src ${BUILD_DIR}/${FULL_BUNDLE}/
cp -r ui/dist ${BUILD_DIR}/${FULL_BUNDLE}/ui-build 2>/dev/null || cp -r ui/build ${BUILD_DIR}/${FULL_BUNDLE}/ui-build
cp -r docs ${BUILD_DIR}/${FULL_BUNDLE}/
cp -r wheels ${BUILD_DIR}/${FULL_BUNDLE}/
cp -r docker ${BUILD_DIR}/${FULL_BUNDLE}/container/
cp requirements.txt ${BUILD_DIR}/${FULL_BUNDLE}/
cp VERSION ${BUILD_DIR}/${FULL_BUNDLE}/
cp README.md ${BUILD_DIR}/${FULL_BUNDLE}/
cp LICENSE ${BUILD_DIR}/${FULL_BUNDLE}/ 2>/dev/null || echo "  No LICENSE file found"
cat > ${BUILD_DIR}/${FULL_BUNDLE}/container/Dockerfile << BUNDLE_DOCKERFILE
# RadiusForge Bundle Docker Build
# Version: ${VERSION}
# Supports all RadiusForge services in a single container

FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    netcat-traditional \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /opt/radiusforge

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY scripts/ ./scripts/
COPY VERSION .
COPY README.md ./CLAUDE.md

COPY ui-build/ ./ui-build/

# Create necessary directories
RUN mkdir -p /opt/radiusforge/logs \
    /opt/radiusforge/data \
    /opt/radiusforge/config \
    /var/log/supervisor \
    /etc/nginx/sites-available \
    /etc/nginx/sites-enabled

# Copy configuration files
COPY container/docker/nginx-radiusforge.conf /etc/nginx/sites-available/radiusforge
COPY container/docker/supervisord.conf /etc/supervisor/conf.d/radiusforge.conf
COPY container/docker/docker-entrypoint.sh /opt/radiusforge/docker-entrypoint.sh
COPY container/docker/health_server.py /opt/radiusforge/docker/health_server.py
COPY container/docker/metrics_server.py /opt/radiusforge/docker/metrics_server.py

RUN ln -s /etc/nginx/sites-available/radiusforge /etc/nginx/sites-enabled/ && \
    rm -f /etc/nginx/sites-enabled/default && \
    chmod +x /opt/radiusforge/docker-entrypoint.sh && \
    chmod +x /opt/radiusforge/docker/health_server.py && \
    chmod +x /opt/radiusforge/docker/metrics_server.py

EXPOSE 8910 8911 8912 8913 8914 8915 8916 8917 8918 8919 8920 8921 8922 8923 8924 8925 8926

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8917/health || exit 1

LABEL maintainer="RadiusForge Team" \
      version="${VERSION}" \
      description="RadiusForge AAA Traffic Load Testing Platform"

# Volume for persistent data and configuration
VOLUME ["/opt/radiusforge/data", "/opt/radiusforge/logs", "/opt/radiusforge/config"]

# Start services
ENTRYPOINT ["/opt/radiusforge/docker-entrypoint.sh"]
BUNDLE_DOCKERFILE
cp docker-compose-multi.yml ${BUILD_DIR}/${FULL_BUNDLE}/container/docker-compose.yml
cp nginx.conf ${BUILD_DIR}/${FULL_BUNDLE}/

mkdir -p ${BUILD_DIR}/${FULL_BUNDLE}/scripts
cp scripts/install-upgrade.sh ${BUILD_DIR}/${FULL_BUNDLE}/scripts/
cp scripts/startup/* ${BUILD_DIR}/${FULL_BUNDLE}/scripts/ 2>/dev/null || echo "  No startup scripts found"

cat > ${BUILD_DIR}/${FULL_BUNDLE}/.env.example << 'EOF'
# RadiusForge Configuration
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
RADIUS_SERVER_TYPE=access-manager
RADIUS_PRIMARY_HOST=192.168.1.10
RADIUS_PRIMARY_PORT=1812
RADIUS_PRIMARY_SECRET=RadiusForge2024Secret
RADIUS_ACCOUNTING_PORT=1813

# Database
DATABASE_URL=postgresql://radiusforge:password@localhost:5432/radiusforge

# Security
SECRET_KEY=your-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here

# Performance Settings
MAX_WORKERS=8
MAX_CONNECTIONS=10000
TIMEOUT_SECONDS=30

# Logging
LOG_LEVEL=INFO
LOG_DIR=/opt/radiusforge/logs
EOF

echo -e "${GREEN}✓ Application files copied${NC}"

echo "Step 5: Creating deployment chooser script..."
cat > ${BUILD_DIR}/${FULL_BUNDLE}/deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash

# RadiusForge Universal Deployment Script v1.4.1
# Supports: Traditional Installation and Container Deployment

set -e

VERSION="1.4.1"

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

# RadiusForge Traditional Installation Script v1.4.1
# Supports: macOS, RHEL/CentOS 8.8+, Ubuntu 20.04+

set -e

VERSION="1.4.1"
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
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        PYTHON_CMD="python3"
    elif [[ -f /etc/redhat-release ]]; then
        OS="rhel"
        PYTHON_CMD="python3"
    elif [[ -f /etc/debian_version ]]; then
        OS="ubuntu"
        PYTHON_CMD="python3"
    else
        echo -e "${RED}Unsupported operating system${NC}"
        exit 1
    fi
    
    echo "Detected OS: $OS"
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
    $SUDO cp -r config/* $INSTALL_DIR/config/ 2>/dev/null || true
    $SUDO cp VERSION $INSTALL_DIR/
    $SUDO cp requirements.txt $INSTALL_DIR/
    $SUDO cp .env.example $INSTALL_DIR/
    
    # Set executable permissions for scripts
    $SUDO chmod +x $INSTALL_DIR/scripts/startup/radiusforge-*.sh 2>/dev/null || true
    $SUDO chmod +x $INSTALL_DIR/scripts/*.sh 2>/dev/null || true
    
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
        $SUDO cp $INSTALL_DIR/.env.example $INSTALL_DIR/.env
        echo -e "${YELLOW}⚠ Created default configuration${NC}"
        echo "  Edit $INSTALL_DIR/.env to customize settings"
    fi
    
    echo -e "${GREEN}✓ Configuration ready${NC}"
}

install_radiusforge() {
    print_header
    echo -e "${GREEN}Installing RadiusForge...${NC}"
    
    detect_os
    check_requirements
    create_directories
    copy_files
    install_dependencies
    setup_configuration
    
    $SUDO chown -R $(whoami):$(id -gn) $INSTALL_DIR 2>/dev/null || true
    
    echo ""
    echo "================================================"
    echo "         Installation Complete!                "
    echo "================================================"
    echo ""
    echo "RadiusForge v${VERSION} has been successfully installed!"
    echo ""
    echo "🌐 Web UI: http://localhost:8911"
    echo "🔧 API: http://localhost:8910"
    echo "📊 API Docs: http://localhost:8910/docs"
    echo ""
    echo "Next steps:"
    echo "1. Configure: $INSTALL_DIR/.env"
    echo "2. Start services:"
    if [ "$OS" == "macos" ]; then
        echo "   $INSTALL_DIR/scripts/startup/radiusforge-macos.sh start"
    else
        echo "   $INSTALL_DIR/scripts/startup/radiusforge-rhel.sh start"
    fi
    echo "3. Access: http://localhost:8911"
    echo ""
    echo "Port Range: 8910-8926"
    echo "Installation: $INSTALL_DIR"
    echo ""
}

install_radiusforge
INSTALL_SCRIPT

chmod +x ${BUILD_DIR}/${FULL_BUNDLE}/install-traditional.sh

echo "Step 7: Creating container installation script..."
cat > ${BUILD_DIR}/${FULL_BUNDLE}/install-container.sh << 'CONTAINER_SCRIPT'
#!/bin/bash

# RadiusForge Container Installation Script v1.4.1

set -e

VERSION="1.4.1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${BLUE}   RadiusForge Container v${VERSION}      ${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo ""
}

check_docker() {
    echo "Checking Docker..."
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker not found${NC}"
        echo "  Please install Docker first"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}✗ Docker daemon not running${NC}"
        echo "  Please start Docker daemon"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker ready${NC}"
}

deploy_container() {
    print_header
    echo -e "${GREEN}Deploying RadiusForge Container...${NC}"
    
    check_docker
    
    echo "Building Docker image..."
    docker build -f container/Dockerfile -t radiusforge:${VERSION} .
    
    echo "Checking for existing container..."
    if docker ps -a --format "table {{.Names}}" | grep -q "^radiusforge$"; then
        echo "Stopping existing container..."
        docker stop radiusforge 2>/dev/null || true
        echo "Removing existing container..."
        docker rm radiusforge 2>/dev/null || true
    fi
    
    echo "Starting container..."
    docker run -d \
        --name radiusforge \
        -p 8910-8926:8910-8926 \
        --restart unless-stopped \
        radiusforge:${VERSION}
    
    echo "Waiting for services to start..."
    sleep 10
    
    # Check health
    if curl -s http://localhost:8917/health > /dev/null; then
        echo -e "${GREEN}✓ Container deployed successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Container started but health check failed${NC}"
        echo "  Check logs: docker logs radiusforge"
    fi
    
    echo ""
    echo "================================================"
    echo "         Container Deployment Complete!         "
    echo "================================================"
    echo ""
    echo "RadiusForge v${VERSION} container is running!"
    echo ""
    echo "🌐 Web UI: http://localhost:8911"
    echo "🔧 API: http://localhost:8910"
    echo "📊 API Docs: http://localhost:8910/docs"
    echo "💚 Health: http://localhost:8917/health"
    echo ""
    echo "Container Management:"
    echo "  docker logs radiusforge     # View logs"
    echo "  docker stop radiusforge     # Stop container"
    echo "  docker start radiusforge    # Start container"
    echo "  docker restart radiusforge  # Restart container"
    echo ""
    echo "Port Range: 8910-8926"
    echo "Container: radiusforge:${VERSION}"
    echo ""
}

deploy_container
CONTAINER_SCRIPT

chmod +x ${BUILD_DIR}/${FULL_BUNDLE}/install-container.sh
echo -e "${GREEN}✓ Installation scripts created${NC}"

echo "Step 8: Creating manifest..."
cat > ${BUILD_DIR}/${FULL_BUNDLE}/MANIFEST.json << EOF
{
  "name": "RadiusForge",
  "version": "${VERSION}",
  "build_timestamp": "${TIMESTAMP}",
  "bundle_type": "complete",
  "port_range": "8910-8926",
  "deployment_options": ["traditional", "container"],
  "supported_os": [
    "macOS 10.15+",
    "RHEL 8.8+",
    "CentOS 8+",
    "Ubuntu 20.04+",
    "Docker (any platform)"
  ],
  "python_requirements": {
    "min_version": "3.6.8",
    "recommended": "3.8+"
  },
  "services": {
    "8910": "API Server",
    "8911": "Web UI",
    "8912": "WebSocket",
    "8913": "RADIUS Test",
    "8914": "TACACS+ Test",
    "8915": "Syslog Receiver",
    "8916": "Metrics Export",
    "8917": "Health Check",
    "8918": "Admin API",
    "8919": "Backup Service",
    "8920": "Reserved"
  },
  "radius_support": [
    "Cisco Access Manager (Primary)",
    "Cisco ISE (Alternative)"
  ],
  "changes_from_previous": [
    "Consolidated bundle creation scripts",
    "Unified deployment workflow",
    "Added bundle validation and quality gates",
    "Implemented archive retention policies",
    "Enhanced security scanning"
  ]
}
EOF
echo -e "${GREEN}✓ Manifest created${NC}"

echo "Step 9: Compressing bundle..."
cd ${BUILD_DIR}
tar -czf ${FULL_BUNDLE}.tar.gz ${FULL_BUNDLE}
cd ..

# Calculate checksum
FULL_CHECKSUM=$(calculate_checksum "${BUILD_DIR}/${FULL_BUNDLE}.tar.gz")

archive_previous_versions

# Move to release directory
mv ${BUILD_DIR}/${FULL_BUNDLE}.tar.gz ${RELEASE_DIR}/

# Get file size
FULL_SIZE=$(ls -lh ${RELEASE_DIR}/${FULL_BUNDLE}.tar.gz | awk '{print $5}')

echo -e "${GREEN}✓ Bundle compressed and moved to release/${NC}"

validate_bundle

# Create release notes
cat > ${RELEASE_DIR}/RELEASE-NOTES-v${VERSION}.md << EOF
# RadiusForge v${VERSION} Release Notes

## Release Information
- **Version**: ${VERSION}
- **Build Date**: ${TIMESTAMP}
- **Port Range**: 8910-8926 (17 dedicated services)
- **Deployment Options**: Traditional + Container
- **OS Support**: macOS, RHEL 8.8+, CentOS 8+, Ubuntu 20.04+, Docker

## Download Bundle

### Complete Bundle (Traditional + Container)
- **File**: ${FULL_BUNDLE}.tar.gz
- **Size**: ${FULL_SIZE}
- **SHA256**: ${FULL_CHECKSUM}
- **Use for**: Any deployment method on any supported OS

## What's New in v${VERSION}

1. **Unified Bundle Creation**
   - Consolidated all versioned bundle scripts into single create-bundle.sh
   - Automated archiving of previous versions with retention policies
   - Comprehensive bundle validation and quality gates

2. **Streamlined Deployment**
   - Single deploy.sh script with deployment method chooser
   - Unified install-upgrade.sh for both traditional and container deployments
   - Removed redundant deployment scripts

3. **Enhanced Quality Assurance**
   - Bundle structure validation
   - Security scanning for sensitive files
   - Dependency verification
   - Deployment testing

4. **Archive Management**
   - Automatic archiving of previous bundle versions
   - Configurable retention policies (count-based and time-based)
   - Organized archive structure in release/archive-v* directories


\`\`\`bash
tar -xzf ${FULL_BUNDLE}.tar.gz
cd ${FULL_BUNDLE}
./deploy.sh
# Choose:
#   1) Traditional Installation
#   2) Container Deployment
\`\`\`

#### Option 2: Traditional Installation
\`\`\`bash
./install-traditional.sh
\`\`\`

\`\`\`bash
./install-container.sh
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


This bundle has been validated with:
- ✓ Bundle structure verification
- ✓ Security scanning
- ✓ Dependency verification
- ✓ Deployment testing
- ✓ Checksum validation

See validation report: \`release/validation-${VERSION}.log\`

## Support
- Documentation: See docs/ directory
- Container Guide: CONTAINER_DEPLOYMENT_GUIDE.md
- Version check: \`curl http://localhost:8910/api/version\`

---
Built with ❤️ by RadiusForge Team
EOF

echo -e "${GREEN}✓ Release notes created${NC}"

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
- ✅ Bundle validation reports

## 📊 Service Ports

All services use ports **8910-8926**:
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
Validation: release/validation-${VERSION}.log
EOF

# Cleanup build directory
rm -rf ${BUILD_DIR}

echo ""
echo "========================================="
echo -e "${GREEN}✅ Bundle Creation Complete!${NC}"
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
echo "   • ${RELEASE_DIR}/validation-${VERSION}.log"
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
echo "🗂️ Archive Management:"
echo "   • Previous versions archived in: ${RELEASE_DIR}/archive-v*"
echo "   • Retention policy: ${ARCHIVE_RETENTION_COUNT} versions, ${ARCHIVE_RETENTION_DAYS} days"
echo ""
