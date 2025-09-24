#!/bin/bash

# RadiusForge macOS Control Script v1.3.1
# Usage: ./radiusforge-macos.sh [start|stop|status|restart|install|uninstall]

INSTALL_DIR="/opt/radiusforge"
PYTHON_CMD="python3"
LOG_DIR="$INSTALL_DIR/logs"
PID_DIR="$INSTALL_DIR/run"

# Create necessary directories
mkdir -p "$LOG_DIR" "$PID_DIR" 2>/dev/null

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}     RadiusForge AAA Testing Platform v1.3.1    ${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

check_requirements() {
    echo "Checking requirements..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}✗ Python 3 not found. Please install: brew install python@3.11${NC}"
        return 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.js not found. Please install: brew install node${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ All requirements met${NC}"
    return 0
}

install_service() {
    print_header
    echo -e "${YELLOW}Installing RadiusForge as a macOS service...${NC}"
    
    # Create LaunchAgent plist
    PLIST_FILE="$HOME/Library/LaunchAgents/com.radiusforge.plist"
    mkdir -p "$HOME/Library/LaunchAgents"
    
    cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.radiusforge</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/scripts/startup/radiusforge-macos.sh</string>
        <string>start</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/launchd.err</string>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/launchd.out</string>
</dict>
</plist>
EOF
    
    # Load the service
    launchctl load "$PLIST_FILE" 2>/dev/null
    
    echo -e "${GREEN}✓ Service installed${NC}"
    echo "  Location: $PLIST_FILE"
    echo ""
    echo "Service will auto-start on login."
    echo "To start now: launchctl start com.radiusforge"
}

uninstall_service() {
    print_header
    echo -e "${YELLOW}Uninstalling RadiusForge service...${NC}"
    
    PLIST_FILE="$HOME/Library/LaunchAgents/com.radiusforge.plist"
    
    if [ -f "$PLIST_FILE" ]; then
        launchctl unload "$PLIST_FILE" 2>/dev/null
        rm "$PLIST_FILE"
        echo -e "${GREEN}✓ Service uninstalled${NC}"
    else
        echo -e "${YELLOW}Service not installed${NC}"
    fi
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
            echo "  Check logs: $LOG_DIR/api.log"
        fi
    fi
    
    # Start Web UI (Production)
    if lsof -i :8911 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Web UI already running on port 8911${NC}"
    else
        echo "Starting Web UI..."
        cd "$INSTALL_DIR"
        
        # Use pre-built UI
        if [ -d "ui-build" ] || [ -d "ui/dist" ]; then
            # Serve static files
            nohup $PYTHON_CMD -m http.server 8911 --directory ui-build > "$LOG_DIR/ui.log" 2>&1 &
            echo $! > "$PID_DIR/ui.pid"
            sleep 2
            
            if lsof -i :8911 > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Web UI started on port 8911${NC}"
            else
                echo -e "${RED}✗ Web UI failed to start${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ UI build not found, skipping UI start${NC}"
        fi
    fi
    
    # Start additional services
    echo "Starting auxiliary services..."
    
    # Health check service (simple HTTP server)
    if ! lsof -i :8917 > /dev/null 2>&1; then
        cd "$INSTALL_DIR"
        nohup $PYTHON_CMD -c "
import http.server
import socketserver
import json

class HealthHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            status = {'status': 'healthy', 'version': '1.3.1', 'ports': '8910-8920'}
            self.wfile.write(json.dumps(status).encode())
        else:
            self.send_response(404)
            self.end_headers()

with socketserver.TCPServer(('', 8917), HealthHandler) as httpd:
    httpd.serve_forever()
" > "$LOG_DIR/health.log" 2>&1 &
        echo $! > "$PID_DIR/health.pid"
        echo -e "${GREEN}✓ Health service started on port 8917${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
    echo -e "${GREEN}RadiusForge is running!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
    echo ""
    echo "  📡 API Server:    http://localhost:8910"
    echo "  🌐 Web UI:        http://localhost:8911"
    echo "  📚 API Docs:      http://localhost:8910/docs"
    echo "  💚 Health Check:  http://localhost:8917/health"
    echo ""
    echo "  Port Range: 8910-8920"
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
    
    echo -e "${GREEN}All services stopped${NC}"
}

check_status() {
    print_header
    echo -e "${BLUE}Service Status${NC}"
    echo "═══════════════════════════════════════════════"
    
    # Check each service
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
    
    # Check LaunchAgent
    echo ""
    echo -e "${BLUE}Auto-start Status:${NC}"
    if [ -f "$HOME/Library/LaunchAgents/com.radiusforge.plist" ]; then
        echo -e "  LaunchAgent: ${GREEN}Installed${NC}"
        if launchctl list | grep -q com.radiusforge; then
            echo -e "  Service: ${GREEN}Loaded${NC}"
        else
            echo -e "  Service: ${YELLOW}Not loaded${NC}"
        fi
    else
        echo -e "  LaunchAgent: ${RED}Not installed${NC}"
    fi
    echo ""
}

view_logs() {
    print_header
    echo -e "${BLUE}Recent Logs${NC}"
    echo "═══════════════════════════════════════════════"
    
    if [ -f "$LOG_DIR/api.log" ]; then
        echo -e "${YELLOW}API Server (last 10 lines):${NC}"
        tail -10 "$LOG_DIR/api.log"
        echo ""
    fi
    
    if [ -f "$LOG_DIR/ui.log" ]; then
        echo -e "${YELLOW}Web UI (last 10 lines):${NC}"
        tail -10 "$LOG_DIR/ui.log"
        echo ""
    fi
    
    if [ -f "$LOG_DIR/health.log" ]; then
        echo -e "${YELLOW}Health Service (last 5 lines):${NC}"
        tail -5 "$LOG_DIR/health.log"
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
        echo "  install    - Install as macOS service (auto-start)"
        echo "  uninstall  - Remove macOS service"
        echo ""
        echo "Examples:"
        echo "  $0 start           # Start services"
        echo "  $0 status          # Check status"
        echo "  $0 install         # Install auto-start"
        exit 1
        ;;
esac