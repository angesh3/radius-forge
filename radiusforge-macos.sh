#!/bin/bash

# RadiusForge macOS Control Script
# Usage: ./radiusforge-macos.sh [start|stop|status|restart]

PROJECT_DIR="/Users/angeshvikram/code/radius-forge"
PYTHON_CMD="python3"
LOG_DIR="$PROJECT_DIR/logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

start_services() {
    echo -e "${GREEN}Starting RadiusForge services...${NC}"
    
    # Check if already running
    if lsof -i :8910 > /dev/null 2>&1; then
        echo -e "${YELLOW}API Server already running on port 8910${NC}"
    else
        echo "Starting API Server on port 8910..."
        cd "$PROJECT_DIR"
        nohup $PYTHON_CMD src/api/main_simple.py > "$LOG_DIR/api.log" 2>&1 &
        echo $! > "$LOG_DIR/api.pid"
        sleep 2
        if lsof -i :8910 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ API Server started${NC}"
        else
            echo -e "${RED}✗ API Server failed to start${NC}"
        fi
    fi
    
    if lsof -i :5173 > /dev/null 2>&1; then
        echo -e "${YELLOW}UI already running on port 5173${NC}"
    else
        echo "Starting Web UI..."
        cd "$PROJECT_DIR/ui"
        nohup npm run dev > "$LOG_DIR/ui.log" 2>&1 &
        echo $! > "$LOG_DIR/ui.pid"
        sleep 3
        if lsof -i :5173 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Web UI started${NC}"
        else
            echo -e "${RED}✗ Web UI failed to start${NC}"
        fi
    fi
    
    echo ""
    echo -e "${GREEN}RadiusForge is running!${NC}"
    echo "  • API Server: http://localhost:8910"
    echo "  • API Docs:   http://localhost:8910/docs"
    echo "  • Web UI:     http://localhost:5173"
    echo ""
}

stop_services() {
    echo -e "${YELLOW}Stopping RadiusForge services...${NC}"
    
    # Stop API Server
    if [ -f "$LOG_DIR/api.pid" ]; then
        PID=$(cat "$LOG_DIR/api.pid")
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            rm "$LOG_DIR/api.pid"
            echo -e "${GREEN}✓ API Server stopped${NC}"
        fi
    fi
    
    # Also check by port
    if lsof -i :8910 > /dev/null 2>&1; then
        kill $(lsof -t -i:8910) 2>/dev/null
        echo -e "${GREEN}✓ API Server stopped (by port)${NC}"
    fi
    
    # Stop UI
    if [ -f "$LOG_DIR/ui.pid" ]; then
        PID=$(cat "$LOG_DIR/ui.pid")
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            rm "$LOG_DIR/ui.pid"
            echo -e "${GREEN}✓ Web UI stopped${NC}"
        fi
    fi
    
    # Also check by port
    if lsof -i :5173 > /dev/null 2>&1; then
        kill $(lsof -t -i:5173) 2>/dev/null
        echo -e "${GREEN}✓ Web UI stopped (by port)${NC}"
    fi
    
    echo -e "${GREEN}All services stopped${NC}"
}

check_status() {
    echo "RadiusForge Service Status"
    echo "=========================="
    
    # Check API Server
    if lsof -i :8910 > /dev/null 2>&1; then
        echo -e "API Server (8910): ${GREEN}● Running${NC}"
        PID=$(lsof -t -i:8910 | head -1)
        echo "  PID: $PID"
    else
        echo -e "API Server (8910): ${RED}○ Stopped${NC}"
    fi
    
    # Check Web UI
    if lsof -i :5173 > /dev/null 2>&1; then
        echo -e "Web UI (5173):     ${GREEN}● Running${NC}"
        PID=$(lsof -t -i:5173 | head -1)
        echo "  PID: $PID"
    else
        echo -e "Web UI (5173):     ${RED}○ Stopped${NC}"
    fi
    
    # Check other ports
    echo ""
    echo "Port Range Status (8910-8926):"
    for port in {8910..8926}; do
        if lsof -i :$port > /dev/null 2>&1; then
            echo "  Port $port: In use"
        fi
    done
}

view_logs() {
    echo "Recent logs:"
    echo "==========="
    if [ -f "$LOG_DIR/api.log" ]; then
        echo "API Server (last 10 lines):"
        tail -10 "$LOG_DIR/api.log"
    fi
    echo ""
    if [ -f "$LOG_DIR/ui.log" ]; then
        echo "Web UI (last 10 lines):"
        tail -10 "$LOG_DIR/ui.log"
    fi
}

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
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start all RadiusForge services"
        echo "  stop    - Stop all RadiusForge services"
        echo "  restart - Restart all services"
        echo "  status  - Check service status"
        echo "  logs    - View recent logs"
        exit 1
        ;;
esac
