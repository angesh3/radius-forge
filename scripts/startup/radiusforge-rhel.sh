#!/bin/bash

# RadiusForge RHEL/CentOS Control Script v1.3.1
# Compatible with RHEL 8.8+ and Python 3.6.8
# Usage: ./radiusforge-rhel.sh [start|stop|status|restart|install|uninstall]

INSTALL_DIR="/opt/radiusforge"
PYTHON_CMD="python3.6"
LOG_DIR="$INSTALL_DIR/logs"
PID_DIR="/var/run/radiusforge"
SERVICE_USER="radiusforge"

# Create necessary directories
mkdir -p "$LOG_DIR" "$PID_DIR" 2>/dev/null

# Colors for output (may not work in all terminals)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo "================================================"
    echo "     RadiusForge AAA Testing Platform v1.3.1    "
    echo "              RHEL/CentOS Edition               "
    echo "================================================"
    echo ""
}

check_requirements() {
    echo "Checking requirements..."
    
    # Check if running as root for install/uninstall
    if [[ "$1" == "install" || "$1" == "uninstall" ]] && [[ $EUID -ne 0 ]]; then
        echo -e "${RED}Error: This operation must be run as root${NC}"
        exit 1
    fi
    
    # Check Python 3.6.8
    if ! command -v $PYTHON_CMD &> /dev/null; then
        # Try python3
        if command -v python3 &> /dev/null; then
            PYTHON_CMD="python3"
        else
            echo -e "${RED}✗ Python 3.6.8+ not found${NC}"
            echo "  Install: sudo yum install python36"
            return 1
        fi
    fi
    
    # Check Python version
    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
    echo "  Python version: $PYTHON_VERSION"
    
    # Check systemd
    if ! command -v systemctl &> /dev/null; then
        echo -e "${RED}✗ systemd not found${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ All requirements met${NC}"
    return 0
}

create_service_user() {
    if ! id "$SERVICE_USER" &>/dev/null; then
        echo "Creating service user: $SERVICE_USER"
        useradd -r -s /sbin/nologin -d $INSTALL_DIR -c "RadiusForge Service User" $SERVICE_USER
    fi
}

install_service() {
    print_header
    echo -e "${YELLOW}Installing RadiusForge as a systemd service...${NC}"
    
    if ! check_requirements "install"; then
        exit 1
    fi
    
    create_service_user
    
    # Create systemd service file
    cat > /etc/systemd/system/radiusforge.service << EOF
[Unit]
Description=RadiusForge AAA Testing Platform v1.3.1
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=forking
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONPATH=$INSTALL_DIR"

# Main API Server
ExecStartPre=/bin/mkdir -p $PID_DIR $LOG_DIR
ExecStartPre=/bin/chown -R $SERVICE_USER:$SERVICE_USER $PID_DIR $LOG_DIR

ExecStart=/bin/bash -c '$INSTALL_DIR/scripts/startup/radiusforge-rhel.sh start'
ExecStop=/bin/bash -c '$INSTALL_DIR/scripts/startup/radiusforge-rhel.sh stop'
ExecReload=/bin/kill -HUP \$MAINPID

PIDFile=$PID_DIR/radiusforge.pid
Restart=on-failure
RestartSec=10
TimeoutStartSec=300

# Security hardening
PrivateTmp=yes
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_DIR $LOG_DIR $PID_DIR

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF
    
    # Create additional service for health monitoring
    cat > /etc/systemd/system/radiusforge-health.service << EOF
[Unit]
Description=RadiusForge Health Monitor
After=radiusforge.service
Requires=radiusforge.service

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$PYTHON_CMD -c "
import http.server
import socketserver
import json
import sys

class HealthHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            status = {
                'status': 'healthy',
                'version': '1.3.1',
                'ports': '8910-8926',
                'platform': 'RHEL'
            }
            self.wfile.write(json.dumps(status).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass  # Suppress default logging

with socketserver.TCPServer(('', 8917), HealthHandler) as httpd:
    print('Health service running on port 8917', file=sys.stderr)
    httpd.serve_forever()
"
Restart=always
RestartSec=5

[Install]
WantedBy=radiusforge.service
EOF
    
    # Set permissions
    chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    chown -R $SERVICE_USER:$SERVICE_USER $LOG_DIR
    chown -R $SERVICE_USER:$SERVICE_USER $PID_DIR
    
    # Configure firewall
    echo "Configuring firewall..."
    for port in {8910..8926}; do
        firewall-cmd --permanent --add-port=${port}/tcp 2>/dev/null
        firewall-cmd --permanent --add-port=${port}/udp 2>/dev/null
    done
    firewall-cmd --reload 2>/dev/null
    
    # Configure SELinux if enabled
    if command -v getenforce &> /dev/null && [ "$(getenforce)" != "Disabled" ]; then
        echo "Configuring SELinux..."
        semanage port -a -t http_port_t -p tcp 8910-8926 2>/dev/null || true
        setsebool -P httpd_can_network_connect 1 2>/dev/null || true
    fi
    
    # Reload systemd
    systemctl daemon-reload
    systemctl enable radiusforge.service
    systemctl enable radiusforge-health.service
    
    echo -e "${GREEN}✓ Service installed successfully${NC}"
    echo ""
    echo "Service files created:"
    echo "  - /etc/systemd/system/radiusforge.service"
    echo "  - /etc/systemd/system/radiusforge-health.service"
    echo ""
    echo "To start: systemctl start radiusforge"
    echo "To check: systemctl status radiusforge"
}

uninstall_service() {
    print_header
    echo -e "${YELLOW}Uninstalling RadiusForge service...${NC}"
    
    if ! check_requirements "uninstall"; then
        exit 1
    fi
    
    # Stop and disable services
    systemctl stop radiusforge-health.service 2>/dev/null
    systemctl stop radiusforge.service 2>/dev/null
    systemctl disable radiusforge-health.service 2>/dev/null
    systemctl disable radiusforge.service 2>/dev/null
    
    # Remove service files
    rm -f /etc/systemd/system/radiusforge.service
    rm -f /etc/systemd/system/radiusforge-health.service
    
    systemctl daemon-reload
    
    echo -e "${GREEN}✓ Service uninstalled${NC}"
}

start_services() {
    print_header
    echo -e "${GREEN}Starting RadiusForge services...${NC}"
    
    if ! check_requirements; then
        exit 1
    fi
    
    # Start API Server
    if lsof -i :8910 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ API Server already running on port 8910${NC}"
    else
        echo "Starting API Server..."
        cd "$INSTALL_DIR"
        nohup $PYTHON_CMD src/api/main_simple.py > "$LOG_DIR/api.log" 2>&1 &
        echo $! > "$PID_DIR/api.pid"
        sleep 3
        
        if lsof -i :8910 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ API Server started on port 8910${NC}"
        else
            echo -e "${RED}✗ API Server failed to start${NC}"
            echo "  Check logs: tail -f $LOG_DIR/api.log"
        fi
    fi
    
    # Start Web UI (serve static files)
    if lsof -i :8911 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Web UI already running on port 8911${NC}"
    else
        echo "Starting Web UI..."
        cd "$INSTALL_DIR"
        
        if [ -d "ui-build" ] || [ -d "ui/dist" ]; then
            UI_DIR="ui-build"
            [ -d "ui/dist" ] && UI_DIR="ui/dist"
            
            nohup $PYTHON_CMD -m http.server 8911 --directory $UI_DIR > "$LOG_DIR/ui.log" 2>&1 &
            echo $! > "$PID_DIR/ui.pid"
            sleep 2
            
            if lsof -i :8911 > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Web UI started on port 8911${NC}"
            else
                echo -e "${RED}✗ Web UI failed to start${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ UI build not found${NC}"
        fi
    fi
    
    # Create main PID file for systemd
    if [ -f "$PID_DIR/api.pid" ]; then
        cp "$PID_DIR/api.pid" "$PID_DIR/radiusforge.pid"
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════"
    echo -e "${GREEN}RadiusForge is running!${NC}"
    echo "═══════════════════════════════════════════════"
    echo ""
    echo "  📡 API Server:    http://$(hostname -I | awk '{print $1}'):8910"
    echo "  🌐 Web UI:        http://$(hostname -I | awk '{print $1}'):8911"
    echo "  📚 API Docs:      http://$(hostname -I | awk '{print $1}'):8910/docs"
    echo "  💚 Health Check:  http://$(hostname -I | awk '{print $1}'):8917/health"
    echo ""
    echo "  Port Range: 8910-8926"
    echo "  Logs: $LOG_DIR/"
    echo ""
}

stop_services() {
    print_header
    echo -e "${YELLOW}Stopping RadiusForge services...${NC}"
    
    # Stop by PID files
    for service in api ui health; do
        if [ -f "$PID_DIR/$service.pid" ]; then
            PID=$(cat "$PID_DIR/$service.pid")
            if kill -0 $PID 2>/dev/null; then
                kill $PID
                rm "$PID_DIR/$service.pid"
                echo -e "${GREEN}✓ Stopped $service service${NC}"
            fi
        fi
    done
    
    # Stop by ports (cleanup)
    for port in 8910 8911 8917; do
        if lsof -i :$port > /dev/null 2>&1; then
            kill $(lsof -t -i:$port) 2>/dev/null
            echo -e "${GREEN}✓ Cleaned up port $port${NC}"
        fi
    done
    
    # Remove main PID file
    rm -f "$PID_DIR/radiusforge.pid"
    
    echo -e "${GREEN}All services stopped${NC}"
}

check_status() {
    print_header
    echo "Service Status"
    echo "═══════════════════════════════════════════════"
    
    # Check systemd service
    if systemctl is-active radiusforge.service &>/dev/null; then
        echo -e "SystemD Service: ${GREEN}Active${NC}"
    else
        echo -e "SystemD Service: ${RED}Inactive${NC}"
    fi
    
    echo ""
    echo "Port Status:"
    
    # Check each port
    declare -A services=(
        ["8910"]="API Server"
        ["8911"]="Web UI"
        ["8912"]="WebSocket"
        ["8913"]="RADIUS Test"
        ["8914"]="TACACS+ Test"
        ["8915"]="Syslog Receiver"
        ["8916"]="Metrics Export"
        ["8917"]="Health Check"
        ["8918"]="Admin API"
        ["8919"]="Backup Service"
    )
    
    for port in 8910 8911 8912 8913 8914 8915 8916 8917 8918 8919; do
        service_name=${services[$port]}
        printf "  %-20s (%-5s): " "$service_name" "$port"
        
        if lsof -i :$port > /dev/null 2>&1; then
            PID=$(lsof -t -i:$port | head -1)
            echo -e "${GREEN}● Running${NC} (PID: $PID)"
        else
            echo -e "${RED}○ Stopped${NC}"
        fi
    done
    
    echo ""
    echo "═══════════════════════════════════════════════"
    
    # Check firewall
    echo ""
    echo "Firewall Status:"
    if firewall-cmd --list-ports 2>/dev/null | grep -q "8910"; then
        echo -e "  Ports 8910-8926: ${GREEN}Open${NC}"
    else
        echo -e "  Ports 8910-8926: ${YELLOW}Not configured${NC}"
    fi
    
    # Check SELinux
    if command -v getenforce &> /dev/null && [ "$(getenforce)" != "Disabled" ]; then
        echo "  SELinux: $(getenforce)"
    fi
    echo ""
}

view_logs() {
    print_header
    echo "Recent Logs"
    echo "═══════════════════════════════════════════════"
    
    # Use journalctl if service is installed
    if systemctl list-units --full -all | grep -q "radiusforge.service"; then
        echo -e "${YELLOW}SystemD Logs (last 20 lines):${NC}"
        journalctl -u radiusforge.service -n 20 --no-pager
        echo ""
    fi
    
    # Show application logs
    if [ -f "$LOG_DIR/api.log" ]; then
        echo -e "${YELLOW}API Server (last 10 lines):${NC}"
        tail -10 "$LOG_DIR/api.log"
        echo ""
    fi
    
    if [ -f "$LOG_DIR/ui.log" ]; then
        echo -e "${YELLOW}Web UI (last 10 lines):${NC}"
        tail -10 "$LOG_DIR/ui.log"
    fi
}

# Main script logic
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        start_services
        ;;
    status)
        check_status
        ;;
    logs)
        view_logs
        ;;
    install)
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    *)
        print_header
        echo "Usage: $0 {start|stop|restart|status|logs|install|uninstall}"
        echo ""
        echo "Commands:"
        echo "  start      - Start all RadiusForge services"
        echo "  stop       - Stop all RadiusForge services"
        echo "  restart    - Restart all services"
        echo "  status     - Check service status"
        echo "  logs       - View recent logs"
        echo "  install    - Install as systemd service (requires root)"
        echo "  uninstall  - Remove systemd service (requires root)"
        echo ""
        echo "Examples:"
        echo "  $0 start                    # Start services"
        echo "  $0 status                   # Check status"
        echo "  sudo $0 install             # Install service"
        echo "  sudo systemctl start radiusforge  # Start via systemd"
        exit 1
        ;;
esac
