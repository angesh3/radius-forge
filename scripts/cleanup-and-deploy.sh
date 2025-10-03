#!/bin/bash

# RadiusForge Cleanup and Deploy Script
# Cleans up existing containers and redeploys with multi-arch support

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}RadiusForge Cleanup and Deploy${NC}"
echo "=================================="

# Stop and remove any existing RadiusForge containers
echo "Cleaning up existing containers..."

# Find and stop all containers using RadiusForge ports
for port in {8910..8926}; do
    container_id=$(docker ps --filter "publish=$port" --format "{{.ID}}" 2>/dev/null || true)
    if [ ! -z "$container_id" ]; then
        echo "Stopping container using port $port: $container_id"
        docker stop "$container_id" 2>/dev/null || true
        docker rm "$container_id" 2>/dev/null || true
    fi
done

# Stop and remove containers by name
for name in radiusforge radiusforge-api radiusforge-ui radiusforge-radius; do
    if docker ps -a --format "{{.Names}}" | grep -q "^$name$"; then
        echo "Stopping and removing container: $name"
        docker stop "$name" 2>/dev/null || true
        docker rm "$name" 2>/dev/null || true
    fi
done

echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

# Check if we're in a bundle directory or main repo
if [ -f "install-container.sh" ]; then
    echo "Deploying from bundle directory..."
    ./install-container.sh
elif [ -f "scripts/deploy-container-multiarch.sh" ]; then
    echo "Deploying from main repository..."
    ./scripts/deploy-container-multiarch.sh
else
    echo -e "${RED}Error: No deployment script found${NC}"
    echo "Please run this script from either:"
    echo "  - RadiusForge bundle directory (with install-container.sh)"
    echo "  - RadiusForge main repository (with scripts/deploy-container-multiarch.sh)"
    exit 1
fi
