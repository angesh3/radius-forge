#!/bin/bash

# RadiusForge Multi-Architecture Container Deployment Script
# Automatically detects system architecture and builds accordingly
# Supports: linux/amd64, linux/arm64

set -e

VERSION="1.4.1"

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
    echo -e "${CYAN}  RadiusForge Multi-Arch Container Deployment  ${NC}"
    echo -e "${CYAN}              Version ${VERSION}                 ${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo ""
}

# Architecture detection
detect_architecture() {
    local arch=$(uname -m)
    local docker_arch=""
    
    case $arch in
        x86_64)
            docker_arch="linux/amd64"
            ;;
        arm64|aarch64)
            docker_arch="linux/arm64"
            ;;
        *)
            echo -e "${YELLOW}⚠ Unknown architecture: $arch${NC}"
            echo "  Defaulting to linux/amd64"
            docker_arch="linux/amd64"
            ;;
    esac
    
    echo "$docker_arch"
}

# Check Docker buildx support
check_buildx() {
    if docker buildx version &> /dev/null; then
        echo -e "${GREEN}✓ Docker buildx available${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Docker buildx not available, using standard build${NC}"
        return 1
    fi
}

# Check Docker availability
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

# Build multi-architecture image
build_image() {
    local target_platform=$1
    local host_arch=$(uname -m)
    
    echo -e "${BLUE}System Architecture:${NC} $host_arch"
    echo -e "${BLUE}Target Platform:${NC} $target_platform"
    echo ""
    
    # Clean up any existing buildx builder
    docker buildx rm radiusforge-builder 2>/dev/null || true
    
    if check_buildx; then
        echo "Setting up buildx builder..."
        docker buildx create --name radiusforge-builder --use
        docker buildx inspect --bootstrap
        
        echo "Building multi-stage image with buildx..."
        docker buildx build \
            --platform $target_platform \
            --load \
            -t radiusforge:${VERSION} \
            -t radiusforge:latest \
            .
            
        # Clean up builder
        docker buildx rm radiusforge-builder
    else
        echo "Using standard Docker build..."
        if [[ "$target_platform" == "linux/arm64" && "$host_arch" == "x86_64" ]]; then
            echo -e "${YELLOW}⚠ Cross-compilation detected (x86_64 -> arm64)${NC}"
            echo "  This may take longer and require emulation"
        fi
        
        docker build \
            --platform $target_platform \
            -t radiusforge:${VERSION} \
            -t radiusforge:latest \
            . || {
                echo -e "${YELLOW}⚠ Platform-specific build failed, trying without platform flag${NC}"
                docker build \
                    -t radiusforge:${VERSION} \
                    -t radiusforge:latest \
                    .
            }
    fi
}

# Deploy container
deploy_container() {
    local target_platform=$1
    
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
    sleep 15
    
    # Check health
    local health_check_attempts=0
    local max_attempts=6
    
    while [ $health_check_attempts -lt $max_attempts ]; do
        if curl -s http://localhost:8917/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Container deployed successfully${NC}"
            break
        else
            health_check_attempts=$((health_check_attempts + 1))
            if [ $health_check_attempts -lt $max_attempts ]; then
                echo "Health check attempt $health_check_attempts/$max_attempts failed, retrying..."
                sleep 5
            else
                echo -e "${YELLOW}⚠ Container started but health check failed after $max_attempts attempts${NC}"
                echo "  Check logs: docker logs radiusforge"
            fi
        fi
    done
}

# Show deployment summary
show_summary() {
    local target_platform=$1
    
    echo ""
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}         Container Deployment Complete!         ${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo ""
    echo "RadiusForge v${VERSION} container is running!"
    echo -e "${BLUE}Architecture:${NC} $target_platform"
    echo -e "${BLUE}Container ID:${NC} $(docker ps --filter "name=radiusforge" --format "{{.ID}}")"
    echo ""
    echo "🌐 Web UI: http://localhost:8911"
    echo "🔧 API: http://localhost:8910"
    echo "📊 API Docs: http://localhost:8910/docs"
    echo "💚 Health: http://localhost:8917/health"
    echo "📈 Metrics: http://localhost:8920/metrics"
    echo ""
    echo "Container Management:"
    echo "  docker logs radiusforge              # View logs"
    echo "  docker logs -f radiusforge           # Follow logs"
    echo "  docker stop radiusforge              # Stop container"
    echo "  docker start radiusforge             # Start container"
    echo "  docker restart radiusforge           # Restart container"
    echo "  docker inspect radiusforge           # View container details"
    echo "  docker exec -it radiusforge bash     # Access container shell"
    echo ""
    echo "Port Range: 8910-8926"
    echo "Container: radiusforge:${VERSION}"
    echo ""
    
    # Show running services
    echo "Running Services:"
    docker exec radiusforge supervisorctl status 2>/dev/null || echo "  (Service status unavailable)"
    echo ""
}

# Main deployment function
main() {
    print_header
    
    echo -e "${GREEN}Starting RadiusForge Multi-Architecture Deployment...${NC}"
    echo ""
    
    check_docker
    
    # Detect target architecture
    local target_platform=$(detect_architecture)
    
    echo ""
    echo "Building Docker image..."
    build_image "$target_platform"
    
    echo ""
    echo "Deploying container..."
    deploy_container "$target_platform"
    
    show_summary "$target_platform"
}

# Run main function
main "$@"
