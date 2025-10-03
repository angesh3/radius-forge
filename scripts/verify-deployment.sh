#!/bin/bash

# RadiusForge Deployment Verification Script
# Verifies multi-architecture deployment is working correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}     RadiusForge Deployment Verification       ${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo ""
}

check_system_info() {
    echo -e "${BLUE}System Information:${NC}"
    echo "  Host Architecture: $(uname -m)"
    echo "  Operating System: $(uname -s)"
    echo "  Docker Version: $(docker --version 2>/dev/null || echo 'Not available')"
    echo "  Docker Buildx: $(docker buildx version 2>/dev/null | head -1 || echo 'Not available')"
    echo ""
}

check_container_status() {
    echo -e "${BLUE}Container Status:${NC}"
    
    if docker ps --format "table {{.Names}}" | grep -q "^radiusforge$"; then
        echo -e "  Status: ${GREEN}✓ Running${NC}"
        
        # Get container architecture
        local container_arch=$(docker inspect radiusforge | grep -i '"architecture"' | cut -d'"' -f4)
        echo "  Architecture: $container_arch"
        
        # Get container ID and image
        local container_id=$(docker ps --filter "name=radiusforge" --format "{{.ID}}")
        local image_name=$(docker ps --filter "name=radiusforge" --format "{{.Image}}")
        echo "  Container ID: $container_id"
        echo "  Image: $image_name"
        
        # Check uptime
        local created=$(docker inspect radiusforge --format '{{.Created}}')
        echo "  Created: $created"
        
    else
        echo -e "  Status: ${RED}✗ Not running${NC}"
        return 1
    fi
    echo ""
}

check_services() {
    echo -e "${BLUE}Service Health Checks:${NC}"
    
    local services=(
        "8917:Health Check"
        "8910:API Endpoint"
        "8911:Web UI"
    )
    
    for service in "${services[@]}"; do
        local port=$(echo $service | cut -d':' -f1)
        local name=$(echo $service | cut -d':' -f2)
        
        if curl -s --connect-timeout 5 "http://localhost:$port" > /dev/null 2>&1; then
            echo -e "  $name (port $port): ${GREEN}✓ Responding${NC}"
        else
            echo -e "  $name (port $port): ${RED}✗ Not responding${NC}"
        fi
    done
    echo ""
}

check_health_endpoint() {
    echo -e "${BLUE}Health Endpoint Response:${NC}"
    
    local health_response=$(curl -s http://localhost:8917/health 2>/dev/null || echo "")
    
    if [ ! -z "$health_response" ]; then
        echo "  Response: $health_response"
        
        # Parse JSON response
        if echo "$health_response" | grep -q '"status":"healthy"'; then
            echo -e "  Status: ${GREEN}✓ Healthy${NC}"
        else
            echo -e "  Status: ${YELLOW}⚠ Unhealthy${NC}"
        fi
    else
        echo -e "  Response: ${RED}✗ No response${NC}"
    fi
    echo ""
}

check_ports() {
    echo -e "${BLUE}Port Availability:${NC}"
    
    local ports=(8910 8911 8917 8920)
    
    for port in "${ports[@]}"; do
        if netstat -ln 2>/dev/null | grep -q ":$port "; then
            echo -e "  Port $port: ${GREEN}✓ Listening${NC}"
        elif lsof -i :$port 2>/dev/null | grep -q LISTEN; then
            echo -e "  Port $port: ${GREEN}✓ Listening${NC}"
        else
            echo -e "  Port $port: ${RED}✗ Not listening${NC}"
        fi
    done
    echo ""
}

check_logs() {
    echo -e "${BLUE}Recent Container Logs:${NC}"
    echo "  (Last 10 lines)"
    echo "  ----------------------------------------"
    
    docker logs radiusforge --tail 10 2>/dev/null | sed 's/^/  /' || echo "  No logs available"
    echo ""
}

show_architecture_compatibility() {
    echo -e "${BLUE}Architecture Compatibility:${NC}"
    
    local host_arch=$(uname -m)
    local container_arch=$(docker inspect radiusforge | grep -i '"architecture"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
    
    echo "  Host: $host_arch"
    echo "  Container: $container_arch"
    
    if [ "$host_arch" = "arm64" ] && [ "$container_arch" = "arm64" ]; then
        echo -e "  Compatibility: ${GREEN}✓ Native ARM64${NC}"
    elif [ "$host_arch" = "x86_64" ] && [ "$container_arch" = "amd64" ]; then
        echo -e "  Compatibility: ${GREEN}✓ Native AMD64${NC}"
    elif [ "$host_arch" = "x86_64" ] && [ "$container_arch" = "arm64" ]; then
        echo -e "  Compatibility: ${YELLOW}⚠ Emulated (x86_64 → ARM64)${NC}"
    elif [ "$host_arch" = "arm64" ] && [ "$container_arch" = "amd64" ]; then
        echo -e "  Compatibility: ${YELLOW}⚠ Emulated (ARM64 → AMD64)${NC}"
    else
        echo -e "  Compatibility: ${RED}✗ Unknown ($host_arch → $container_arch)${NC}"
    fi
    echo ""
}

show_summary() {
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}              Verification Summary              ${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo ""
    
    if docker ps --format "table {{.Names}}" | grep -q "^radiusforge$"; then
        echo -e "${GREEN}✓ RadiusForge container is running successfully${NC}"
        echo ""
        echo "Access URLs:"
        echo "  🌐 Web UI: http://localhost:8911"
        echo "  🔧 API: http://localhost:8910"
        echo "  📊 API Docs: http://localhost:8910/docs"
        echo "  💚 Health: http://localhost:8917/health"
        echo ""
        echo "Management Commands:"
        echo "  docker logs radiusforge              # View logs"
        echo "  docker stop radiusforge              # Stop container"
        echo "  docker restart radiusforge           # Restart container"
        echo "  ./scripts/cleanup-and-deploy.sh      # Clean redeploy"
    else
        echo -e "${RED}✗ RadiusForge container is not running${NC}"
        echo ""
        echo "To deploy RadiusForge:"
        echo "  ./deploy.sh                          # From bundle"
        echo "  ./scripts/deploy-container-multiarch.sh  # From repository"
    fi
    echo ""
}

# Main verification process
main() {
    print_header
    check_system_info
    check_container_status && {
        check_services
        check_health_endpoint
        check_ports
        show_architecture_compatibility
        check_logs
    }
    show_summary
}

# Run verification
main "$@"
