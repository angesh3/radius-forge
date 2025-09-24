#!/bin/bash
# RadiusForge Installation Script v1.3.0
# Supports: RHEL 8.8, macOS, Ubuntu/Debian

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RADIUSFORGE_USER="radiusforge"
RADIUSFORGE_HOME="/opt/radiusforge"
SERVICE_PORTS="8910 8911 8912 8913 8914 8915 8916 8917 8918 8919 8920"
PYTHON_MIN_VERSION="3.6"
NODE_MIN_VERSION="16"

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "Do not run this script as root. Use a regular user with sudo privileges."
    fi
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v yum &> /dev/null; then
            OS="rhel"
            PACKAGE_MANAGER="yum"
        elif command -v apt &> /dev/null; then
            OS="debian"
            PACKAGE_MANAGER="apt"
        else
            error "Unsupported Linux distribution"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        PACKAGE_MANAGER="brew"
    else
        error "Unsupported operating system: $OSTYPE"
    fi
    
    log "Detected OS: $OS"
}

# Check port availability
check_ports() {
    log "Checking port availability..."
    local used_ports=()
    
    for port in $SERVICE_PORTS; do
        if command -v ss &> /dev/null; then
            if ss -tuln | grep -q ":$port "; then
                used_ports+=($port)
            fi
        elif command -v netstat &> /dev/null; then
            if netstat -tuln 2>/dev/null | grep -q ":$port "; then
                used_ports+=($port)
            fi
        else
            warning "Cannot check port availability (ss/netstat not available)"
            break
        fi
    done
    
    if [ ${#used_ports[@]} -gt 0 ]; then
        error "The following ports are already in use: ${used_ports[*]}. Please free these ports before installation."
    fi
    
    success "All required ports (8910-8920) are available"
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    case $OS in
        "rhel")
            sudo $PACKAGE_MANAGER update -y
            sudo $PACKAGE_MANAGER install -y python3 python3-pip python3-venv nodejs npm git curl wget tar
            ;;
        "debian")
            sudo $PACKAGE_MANAGER update
            sudo $PACKAGE_MANAGER install -y python3 python3-pip python3-venv nodejs npm git curl wget tar
            ;;
        "macos")
            if ! command -v brew &> /dev/null; then
                error "Homebrew is required for macOS installation. Please install it first: https://brew.sh"
            fi
            brew update
            brew install python3 node git
            ;;
    esac
    
    success "System dependencies installed"
}

# Verify Python version
check_python() {
    log "Checking Python version..."
    
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is not installed"
    fi
    
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    if ! python3 -c "import sys; exit(0 if sys.version_info >= (3,6) else 1)"; then
        error "Python $PYTHON_VERSION is installed, but Python $PYTHON_MIN_VERSION+ is required"
    fi
    
    success "Python $PYTHON_VERSION meets requirements"
}

# Verify Node.js version
check_node() {
    log "Checking Node.js version..."
    
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
    
    if [ "$NODE_MAJOR" -lt "$NODE_MIN_VERSION" ]; then
        error "Node.js $NODE_VERSION is installed, but Node.js $NODE_MIN_VERSION+ is required"
    fi
    
    success "Node.js $NODE_VERSION meets requirements"
}

# Create user and directories
setup_user() {
    log "Setting up RadiusForge user and directories..."
    
    # Create user if it doesn't exist
    if ! id "$RADIUSFORGE_USER" &>/dev/null; then
        case $OS in
            "rhel"|"debian")
                sudo useradd -r -m -d "$RADIUSFORGE_HOME" -s /bin/bash "$RADIUSFORGE_USER"
                ;;
            "macos")
                # On macOS, use current user
                RADIUSFORGE_USER=$(whoami)
                RADIUSFORGE_HOME="/usr/local/radiusforge"
                ;;
        esac
        success "Created user: $RADIUSFORGE_USER"
    else
        log "User $RADIUSFORGE_USER already exists"
    fi
    
    # Create directories
    sudo mkdir -p "$RADIUSFORGE_HOME"/{bin,config,logs,data,backups}
    
    # Set permissions
    case $OS in
        "rhel"|"debian")
            sudo chown -R "$RADIUSFORGE_USER:$RADIUSFORGE_USER" "$RADIUSFORGE_HOME"
            ;;
        "macos")
            sudo chown -R "$RADIUSFORGE_USER:staff" "$RADIUSFORGE_HOME"
            ;;
    esac
    
    success "User and directories configured"
}

# Install RadiusForge
install_radiusforge() {
    log "Installing RadiusForge application..."
    
    # Copy application files
    sudo cp -r . "$RADIUSFORGE_HOME/app/"
    
    # Create Python virtual environment
    sudo -u "$RADIUSFORGE_USER" python3 -m venv "$RADIUSFORGE_HOME/venv"
    
    # Install Python dependencies
    sudo -u "$RADIUSFORGE_USER" "$RADIUSFORGE_HOME/venv/bin/pip" install --upgrade pip
    sudo -u "$RADIUSFORGE_USER" "$RADIUSFORGE_HOME/venv/bin/pip" install -r "$RADIUSFORGE_HOME/app/requirements.txt"
    
    # Build UI
    cd "$RADIUSFORGE_HOME/app/ui"
    sudo -u "$RADIUSFORGE_USER" npm install
    sudo -u "$RADIUSFORGE_USER" npm run build
    
    # Set permissions
    case $OS in
        "rhel"|"debian")
            sudo chown -R "$RADIUSFORGE_USER:$RADIUSFORGE_USER" "$RADIUSFORGE_HOME"
            ;;
        "macos")
            sudo chown -R "$RADIUSFORGE_USER:staff" "$RADIUSFORGE_HOME"
            ;;
    esac
    
    success "RadiusForge application installed"
}

# Create configuration files
create_config() {
    log "Creating configuration files..."
    
    # Environment configuration
    cat > /tmp/radiusforge.env << EOF
# RadiusForge Configuration v1.3.0
RADIUSFORGE_VERSION=1.3.0
RADIUSFORGE_HOME=$RADIUSFORGE_HOME

# Port Configuration
API_PORT=8910
UI_PORT=8911
WEBSOCKET_PORT=8912
RADIUS_TEST_PORT=8913
TACACS_TEST_PORT=8914
SYSLOG_PORT=8915
METRICS_EXPORT_PORT=8916
HEALTH_CHECK_PORT=8917
ADMIN_API_PORT=8918
BACKUP_SERVICE_PORT=8919
RESERVED_PORT=8920

# Security
SECRET_KEY=$(openssl rand -hex 32)
DEBUG=false

# Database
DATABASE_URL=sqlite:///$RADIUSFORGE_HOME/data/radiusforge.db

# Logging
LOG_LEVEL=INFO
LOG_FILE=$RADIUSFORGE_HOME/logs/radiusforge.log
EOF
    
    sudo mv /tmp/radiusforge.env "$RADIUSFORGE_HOME/config/radiusforge.env"
    sudo chown "$RADIUSFORGE_USER:$RADIUSFORGE_USER" "$RADIUSFORGE_HOME/config/radiusforge.env"
    sudo chmod 600 "$RADIUSFORGE_HOME/config/radiusforge.env"
    
    success "Configuration files created"
}

# Install systemd services (Linux)
install_systemd_services() {
    if [[ "$OS" == "macos" ]]; then
        return
    fi
    
    log "Installing systemd services..."
    
    # RadiusForge API service
    cat > /tmp/radiusforge-api.service << EOF
[Unit]
Description=RadiusForge API Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=$RADIUSFORGE_USER
Group=$RADIUSFORGE_USER
WorkingDirectory=$RADIUSFORGE_HOME/app
Environment=PATH=$RADIUSFORGE_HOME/venv/bin
EnvironmentFile=$RADIUSFORGE_HOME/config/radiusforge.env
ExecStart=$RADIUSFORGE_HOME/venv/bin/uvicorn src.api.main_simple:app --host 0.0.0.0 --port 8910
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # RadiusForge UI service
    cat > /tmp/radiusforge-ui.service << EOF
[Unit]
Description=RadiusForge Web UI
After=network.target radiusforge-api.service
Wants=network.target
Requires=radiusforge-api.service

[Service]
Type=simple
User=$RADIUSFORGE_USER
Group=$RADIUSFORGE_USER
WorkingDirectory=$RADIUSFORGE_HOME/app/ui
EnvironmentFile=$RADIUSFORGE_HOME/config/radiusforge.env
ExecStart=/usr/bin/npx serve -s dist -l 8911
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Install services
    sudo mv /tmp/radiusforge-api.service /etc/systemd/system/
    sudo mv /tmp/radiusforge-ui.service /etc/systemd/system/
    
    # Reload systemd and enable services
    sudo systemctl daemon-reload
    sudo systemctl enable radiusforge-api radiusforge-ui
    
    success "Systemd services installed and enabled"
}

# Install launchd services (macOS)
install_launchd_services() {
    if [[ "$OS" != "macos" ]]; then
        return
    fi
    
    log "Installing launchd services..."
    
    # RadiusForge API service
    cat > /tmp/com.radiusforge.api.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.radiusforge.api</string>
    <key>ProgramArguments</key>
    <array>
        <string>$RADIUSFORGE_HOME/venv/bin/uvicorn</string>
        <string>src.api.main_simple:app</string>
        <string>--host</string>
        <string>0.0.0.0</string>
        <string>--port</string>
        <string>8910</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$RADIUSFORGE_HOME/app</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$RADIUSFORGE_HOME/logs/api.log</string>
    <key>StandardErrorPath</key>
    <string>$RADIUSFORGE_HOME/logs/api.error.log</string>
</dict>
</plist>
EOF
    
    sudo mv /tmp/com.radiusforge.api.plist /Library/LaunchDaemons/
    sudo chown root:wheel /Library/LaunchDaemons/com.radiusforge.api.plist
    sudo launchctl load /Library/LaunchDaemons/com.radiusforge.api.plist
    
    success "Launchd services installed"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    case $OS in
        "rhel")
            if command -v firewall-cmd &> /dev/null; then
                for port in $SERVICE_PORTS; do
                    sudo firewall-cmd --permanent --add-port=$port/tcp
                done
                sudo firewall-cmd --reload
                success "Firewall configured (firewalld)"
            fi
            ;;
        "debian")
            if command -v ufw &> /dev/null; then
                for port in $SERVICE_PORTS; do
                    sudo ufw allow $port/tcp
                done
                success "Firewall configured (ufw)"
            fi
            ;;
        "macos")
            # macOS firewall configuration would be manual
            warning "Please configure macOS firewall manually if needed"
            ;;
    esac
}

# Start services
start_services() {
    log "Starting RadiusForge services..."
    
    case $OS in
        "rhel"|"debian")
            sudo systemctl start radiusforge-api
            sudo systemctl start radiusforge-ui
            sleep 5
            
            if systemctl is-active --quiet radiusforge-api; then
                success "RadiusForge API service started"
            else
                error "Failed to start RadiusForge API service"
            fi
            
            if systemctl is-active --quiet radiusforge-ui; then
                success "RadiusForge UI service started"
            else
                warning "RadiusForge UI service failed to start"
            fi
            ;;
        "macos")
            # Services started via launchd automatically
            sleep 5
            if curl -s http://localhost:8910/health > /dev/null; then
                success "RadiusForge API service started"
            else
                error "Failed to start RadiusForge API service"
            fi
            ;;
    esac
}

# Create management script
create_management_script() {
    log "Creating management script..."
    
    cat > /tmp/radiusforge-ctl << 'EOF'
#!/bin/bash
# RadiusForge Control Script

RADIUSFORGE_HOME="/opt/radiusforge"
SCRIPT_NAME="$(basename "$0")"

usage() {
    echo "Usage: $SCRIPT_NAME {start|stop|restart|status|logs|update}"
    echo ""
    echo "Commands:"
    echo "  start    - Start RadiusForge services"
    echo "  stop     - Stop RadiusForge services"
    echo "  restart  - Restart RadiusForge services"
    echo "  status   - Show service status"
    echo "  logs     - Show service logs"
    echo "  update   - Update RadiusForge (requires bundle)"
    exit 1
}

if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    OS="linux"
fi

case "$1" in
    start)
        echo "Starting RadiusForge services..."
        if [[ "$OS" == "macos" ]]; then
            sudo launchctl load /Library/LaunchDaemons/com.radiusforge.api.plist 2>/dev/null || true
        else
            sudo systemctl start radiusforge-api radiusforge-ui
        fi
        ;;
    stop)
        echo "Stopping RadiusForge services..."
        if [[ "$OS" == "macos" ]]; then
            sudo launchctl unload /Library/LaunchDaemons/com.radiusforge.api.plist 2>/dev/null || true
        else
            sudo systemctl stop radiusforge-api radiusforge-ui
        fi
        ;;
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    status)
        echo "RadiusForge Service Status:"
        if [[ "$OS" == "macos" ]]; then
            if curl -s http://localhost:8910/health > /dev/null; then
                echo "✓ API Service: Running"
            else
                echo "✗ API Service: Stopped"
            fi
        else
            systemctl status radiusforge-api radiusforge-ui --no-pager
        fi
        ;;
    logs)
        echo "RadiusForge Service Logs:"
        if [[ "$OS" == "macos" ]]; then
            tail -f "$RADIUSFORGE_HOME/logs/"*.log
        else
            sudo journalctl -u radiusforge-api -u radiusforge-ui -f
        fi
        ;;
    update)
        echo "RadiusForge Update:"
        echo "Please use the deployment bundle with update.sh script"
        ;;
    *)
        usage
        ;;
esac
EOF
    
    sudo mv /tmp/radiusforge-ctl /usr/local/bin/radiusforge-ctl
    sudo chmod +x /usr/local/bin/radiusforge-ctl
    
    success "Management script installed as 'radiusforge-ctl'"
}

# Validate installation
validate_installation() {
    log "Validating installation..."
    
    # Check API endpoint
    local retries=0
    local max_retries=30
    
    while [ $retries -lt $max_retries ]; do
        if curl -s http://localhost:8910/health > /dev/null; then
            success "API health check passed"
            break
        fi
        
        retries=$((retries + 1))
        if [ $retries -eq $max_retries ]; then
            error "API health check failed after $max_retries attempts"
        fi
        
        sleep 2
    done
    
    # Check version endpoint
    local version_response=$(curl -s http://localhost:8910/api/system/version)
    if echo "$version_response" | grep -q "1.3.0"; then
        success "Version endpoint validated (v1.3.0)"
    else
        warning "Version endpoint may not be working correctly"
    fi
    
    # Check port configuration
    local ports_response=$(curl -s http://localhost:8910/api/system/ports)
    if echo "$ports_response" | grep -q "8920"; then
        success "Port configuration validated (8910-8920)"
    else
        warning "Port configuration may not be complete"
    fi
}

# Main installation function
main() {
    echo "================================================"
    echo "         RadiusForge Installation v1.3.0       "
    echo "================================================"
    echo ""
    
    # Pre-flight checks
    check_root
    detect_os
    check_ports
    install_dependencies
    check_python
    check_node
    
    # Installation steps
    setup_user
    install_radiusforge
    create_config
    
    # Service installation
    install_systemd_services
    install_launchd_services
    
    # Configuration
    configure_firewall
    create_management_script
    
    # Start and validate
    start_services
    validate_installation
    
    echo ""
    echo "================================================"
    echo "         Installation Complete!                "
    echo "================================================"
    echo ""
    echo "RadiusForge v1.3.0 has been successfully installed!"
    echo ""
    echo "🌐 Web UI: http://localhost:8911"
    echo "🔧 API: http://localhost:8910"
    echo "📊 API Docs: http://localhost:8910/docs"
    echo ""
    echo "Service Management:"
    echo "  radiusforge-ctl start|stop|restart|status|logs"
    echo ""
    echo "Configuration:"
    echo "  $RADIUSFORGE_HOME/config/radiusforge.env"
    echo ""
    echo "Logs:"
    echo "  $RADIUSFORGE_HOME/logs/"
    echo ""
    echo "Port Range: 8910-8920"
    echo "User: $RADIUSFORGE_USER"
    echo "Home: $RADIUSFORGE_HOME"
    echo ""
    success "Ready to test AAA traffic!"
}

# Run main function
main "$@"