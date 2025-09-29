#!/bin/bash


set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="/opt/radiusforge"
BACKUP_DIR="/opt/radiusforge.backup"
VERSION=$(cat "${SCRIPT_DIR}/../VERSION" 2>/dev/null || echo "1.4.0")

OPERATION=""
DEPLOYMENT_TYPE=""
FORCE_REINSTALL=false
SKIP_BACKUP=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_usage() {
    echo "Usage: $0 [install|upgrade|rollback] [traditional|container] [options]"
    echo ""
    echo "Operations:"
    echo "  install     - Fresh installation"
    echo "  upgrade     - Upgrade existing installation"
    echo "  rollback    - Rollback to previous version"
    echo ""
    echo "Deployment Types:"
    echo "  traditional - Python + Node.js deployment"
    echo "  container   - Docker container deployment"
    echo ""
    echo "Options:"
    echo "  --force     - Force reinstall even if version exists"
    echo "  --no-backup - Skip backup creation during upgrade"
    echo "  --help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install traditional"
    echo "  $0 upgrade container"
    echo "  $0 rollback traditional"
}

print_header() {
    echo ""
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${BLUE}   RadiusForge ${OPERATION^} v${VERSION}     ${NC}"
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
    
    if [ "$DEPLOYMENT_TYPE" = "container" ]; then
        # Check Docker
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
    else
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
        
        echo -e "${GREEN}✓ Requirements checked${NC}"
    fi
    
    # Check for root/sudo
    if [[ $EUID -ne 0 ]]; then
        echo -e "${YELLOW}⚠ Not running as root${NC}"
        echo "  Some operations may require sudo password"
        SUDO="sudo"
    else
        SUDO=""
    fi
}

check_existing_installation() {
    if [ -d "$INSTALL_DIR" ]; then
        if [ -f "$INSTALL_DIR/VERSION" ]; then
            EXISTING_VERSION=$(cat "$INSTALL_DIR/VERSION")
            echo "Existing installation found: v$EXISTING_VERSION"
            return 0
        else
            echo "Installation directory exists but no version found"
            return 1
        fi
    else
        echo "No existing installation found"
        return 1
    fi
}

create_backup() {
    if [ "$SKIP_BACKUP" = "true" ]; then
        echo "Skipping backup creation"
        return 0
    fi
    
    if [ -d "$INSTALL_DIR" ]; then
        local backup_name="${BACKUP_DIR}.$(date +%Y%m%d_%H%M%S)"
        echo "Creating backup: $backup_name"
        $SUDO cp -r "$INSTALL_DIR" "$backup_name"
        echo -e "${GREEN}✓ Backup created${NC}"
        
        local backups=($(ls -d ${BACKUP_DIR}.* 2>/dev/null | sort -r))
        if [ ${#backups[@]} -gt 3 ]; then
            for ((i=3; i<${#backups[@]}; i++)); do
                echo "Removing old backup: ${backups[i]}"
                $SUDO rm -rf "${backups[i]}"
            done
        fi
    fi
}

install_traditional() {
    print_header
    echo -e "${GREEN}Installing RadiusForge (Traditional)...${NC}"
    
    detect_os
    check_requirements
    
    if [ "$OPERATION" = "upgrade" ]; then
        create_backup
    fi
    
    echo "Creating installation directories..."
    $SUDO mkdir -p $INSTALL_DIR
    $SUDO mkdir -p $INSTALL_DIR/logs
    $SUDO mkdir -p $INSTALL_DIR/data
    $SUDO mkdir -p $INSTALL_DIR/config
    echo -e "${GREEN}✓ Directories created${NC}"
    
    # Copy application files
    echo "Copying application files..."
    $SUDO cp -r "${SCRIPT_DIR}/../src" $INSTALL_DIR/
    $SUDO cp -r "${SCRIPT_DIR}/../ui-build" $INSTALL_DIR/ 2>/dev/null || $SUDO cp -r "${SCRIPT_DIR}/../ui/dist" $INSTALL_DIR/ui-build 2>/dev/null || echo "  UI build not found"
    $SUDO cp -r "${SCRIPT_DIR}/../scripts" $INSTALL_DIR/
    $SUDO cp -r "${SCRIPT_DIR}/../docs" $INSTALL_DIR/
    $SUDO cp "${SCRIPT_DIR}/../requirements.txt" $INSTALL_DIR/
    $SUDO cp "${SCRIPT_DIR}/../VERSION" $INSTALL_DIR/
    $SUDO cp "${SCRIPT_DIR}/../.env.example" $INSTALL_DIR/ 2>/dev/null || echo "  No .env.example found"
    
    # Set executable permissions for scripts
    $SUDO chmod +x $INSTALL_DIR/scripts/startup/radiusforge-*.sh 2>/dev/null || true
    $SUDO chmod +x $INSTALL_DIR/scripts/*.sh 2>/dev/null || true
    
    echo -e "${GREEN}✓ Files copied${NC}"
    
    # Install Python dependencies
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
    
    echo "Setting up configuration..."
    
    if [ ! -f "$INSTALL_DIR/.env" ]; then
        $SUDO cp $INSTALL_DIR/.env.example $INSTALL_DIR/.env 2>/dev/null || echo "  No .env.example to copy"
        echo -e "${YELLOW}⚠ Created default configuration${NC}"
        echo "  Edit $INSTALL_DIR/.env to customize settings"
    fi
    
    echo -e "${GREEN}✓ Configuration ready${NC}"
    
    $SUDO chown -R $(whoami):$(id -gn) $INSTALL_DIR 2>/dev/null || true
    
    echo ""
    echo "================================================"
    echo "         Traditional Installation Complete!     "
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
    echo "Port Range: 8910-8920"
    echo "Installation: $INSTALL_DIR"
    echo ""
}

install_container() {
    print_header
    echo -e "${GREEN}Installing RadiusForge (Container)...${NC}"
    
    check_requirements
    
    if [ "$OPERATION" = "upgrade" ]; then
        if docker ps -q -f name=radiusforge > /dev/null 2>&1; then
            echo "Stopping existing container..."
            docker stop radiusforge 2>/dev/null || true
            docker rm radiusforge 2>/dev/null || true
        fi
    fi
    
    echo "Building Docker image..."
    cd "${SCRIPT_DIR}/../"
    docker build -t radiusforge:${VERSION} .
    
    echo "Starting container..."
    docker run -d \
        --name radiusforge \
        -p 8910-8920:8910-8920 \
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
    echo "         Container Installation Complete!       "
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
    echo "Port Range: 8910-8920"
    echo "Container: radiusforge:${VERSION}"
    echo ""
}

rollback_installation() {
    print_header
    echo -e "${YELLOW}Rolling back RadiusForge...${NC}"
    
    local backups=($(ls -d ${BACKUP_DIR}.* 2>/dev/null | sort -r))
    if [ ${#backups[@]} -eq 0 ]; then
        echo -e "${RED}✗ No backups found${NC}"
        exit 1
    fi
    
    local latest_backup="${backups[0]}"
    echo "Found backup: $latest_backup"
    
    if [ "$DEPLOYMENT_TYPE" = "container" ]; then
        echo "Stopping current container..."
        docker stop radiusforge 2>/dev/null || true
        docker rm radiusforge 2>/dev/null || true
        
        local backup_version=$(cat "$latest_backup/VERSION" 2>/dev/null || echo "unknown")
        echo "Rolling back to version: $backup_version"
        
        echo "Rebuilding container from backup..."
        cd "$latest_backup"
        docker build -t radiusforge:${backup_version} .
        
        docker run -d \
            --name radiusforge \
            -p 8910-8920:8910-8920 \
            --restart unless-stopped \
            radiusforge:${backup_version}
    else
        echo "Stopping services..."
        if [ -f "$INSTALL_DIR/scripts/startup/radiusforge-macos.sh" ]; then
            $INSTALL_DIR/scripts/startup/radiusforge-macos.sh stop 2>/dev/null || true
        fi
        if [ -f "$INSTALL_DIR/scripts/startup/radiusforge-rhel.sh" ]; then
            $SUDO $INSTALL_DIR/scripts/startup/radiusforge-rhel.sh stop 2>/dev/null || true
        fi
        
        echo "Restoring from backup..."
        $SUDO rm -rf "$INSTALL_DIR"
        $SUDO cp -r "$latest_backup" "$INSTALL_DIR"
        $SUDO chown -R $(whoami):$(id -gn) $INSTALL_DIR 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ Rollback completed${NC}"
    echo ""
    echo "Rolled back to: $(cat "$INSTALL_DIR/VERSION" 2>/dev/null || echo "unknown")"
    echo "Backup used: $latest_backup"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        install|upgrade|rollback)
            OPERATION="$1"
            shift
            ;;
        traditional|container)
            DEPLOYMENT_TYPE="$1"
            shift
            ;;
        --force)
            FORCE_REINSTALL=true
            shift
            ;;
        --no-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --help)
            print_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

if [ -z "$OPERATION" ]; then
    echo -e "${RED}Error: Operation required${NC}"
    print_usage
    exit 1
fi

if [ -z "$DEPLOYMENT_TYPE" ] && [ "$OPERATION" != "rollback" ]; then
    echo -e "${RED}Error: Deployment type required${NC}"
    print_usage
    exit 1
fi

if [ "$OPERATION" = "rollback" ] && [ -z "$DEPLOYMENT_TYPE" ]; then
    if docker ps -q -f name=radiusforge > /dev/null 2>&1; then
        DEPLOYMENT_TYPE="container"
        echo "Auto-detected container deployment for rollback"
    else
        DEPLOYMENT_TYPE="traditional"
        echo "Auto-detected traditional deployment for rollback"
    fi
fi

if [ "$OPERATION" = "install" ] && [ "$FORCE_REINSTALL" = "false" ]; then
    if check_existing_installation; then
        echo -e "${YELLOW}Installation already exists. Use 'upgrade' or '--force' to reinstall.${NC}"
        exit 1
    fi
fi

case $OPERATION in
    install|upgrade)
        if [ "$DEPLOYMENT_TYPE" = "traditional" ]; then
            install_traditional
        else
            install_container
        fi
        ;;
    rollback)
        rollback_installation
        ;;
esac
