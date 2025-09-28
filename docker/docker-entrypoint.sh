#!/bin/bash
set -e

echo "========================================="
echo "   RadiusForge Container v1.4.0         "
echo "========================================="
echo ""
echo "Starting services..."
echo "  • API Server:    http://0.0.0.0:8910"
echo "  • Web UI:        http://0.0.0.0:8911"
echo "  • Health Check:  http://0.0.0.0:8917/health"
echo "  • Metrics:       http://0.0.0.0:8916/metrics"
echo ""

if [ ! -f "/opt/radiusforge/config/.env" ]; then
    echo "Creating default configuration..."
    cat > /opt/radiusforge/config/.env << 'CONFIG'
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
CONFIG
fi

exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
