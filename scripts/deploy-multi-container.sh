#!/bin/bash
set -e

echo "================================================"
echo "    RadiusForge Multi-Container Deployment     "
echo "================================================"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose is not installed"
    exit 1
fi

echo "Stopping existing containers..."
docker-compose -f docker-compose-multi.yml down -v 2>/dev/null || true

# Create necessary directories
echo "Creating directories..."
mkdir -p data logs config monitoring/grafana/dashboards monitoring/grafana/datasources

echo "Building and starting services..."
docker-compose -f docker-compose-multi.yml up -d --build

echo "Waiting for services to start..."
sleep 30

echo "Checking service status..."
docker-compose -f docker-compose-multi.yml ps

RUNNING_CONTAINERS=$(docker ps --filter "name=radiusforge-" --format "table {{.Names}}" | grep -c "radiusforge-" || true)

if [ "$RUNNING_CONTAINERS" -eq 7 ]; then
    echo "✅ SUCCESS: All 7 RadiusForge containers are running!"
    echo ""
    echo "Services available at:"
    echo "  • Web UI:        http://localhost:8911"
    echo "  • API:           http://localhost:8910"
    echo "  • Grafana:       http://localhost:3000 (admin/RadiusForge2024)"
    echo "  • Prometheus:    http://localhost:9090"
    echo "  • Health Check:  http://localhost:8917/health"
    echo ""
    echo "Running containers:"
    docker ps --filter "name=radiusforge-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "❌ ERROR: Expected 7 containers, but only $RUNNING_CONTAINERS are running"
    echo "Check logs with: docker-compose -f docker-compose-multi.yml logs"
    exit 1
fi
