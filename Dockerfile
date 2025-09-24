# RadiusForge Multi-Stage Docker Build
# Version: 1.4.0
# Supports all RadiusForge services in a single container

# Stage 1: Build UI
FROM node:18-alpine AS ui-builder

WORKDIR /app/ui

# Copy UI package files
COPY ui/package*.json ./
RUN npm ci --only=production

# Copy UI source and build
COPY ui/ ./
RUN npm run build

# Stage 2: Python Runtime
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    netcat-traditional \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /opt/radiusforge

# Copy Python requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY VERSION .
COPY CLAUDE.md .

# Copy built UI from previous stage
COPY --from=ui-builder /app/ui/dist ./ui-build/

# Create necessary directories
RUN mkdir -p /opt/radiusforge/logs \
    /opt/radiusforge/data \
    /opt/radiusforge/config \
    /var/log/supervisor \
    /etc/nginx/sites-available \
    /etc/nginx/sites-enabled

# Create nginx configuration for UI
RUN cat > /etc/nginx/sites-available/radiusforge << 'EOF'
server {
    listen 8911;
    server_name _;
    
    root /opt/radiusforge/ui-build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8910;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /ws {
        proxy_pass http://localhost:8912;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
EOF

# Enable nginx site
RUN ln -s /etc/nginx/sites-available/radiusforge /etc/nginx/sites-enabled/ && \
    rm -f /etc/nginx/sites-enabled/default

# Create supervisor configuration
RUN cat > /etc/supervisor/conf.d/radiusforge.conf << 'EOF'
[supervisord]
nodaemon=true
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:nginx]
command=/usr/sbin/nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/opt/radiusforge/logs/nginx.log
stderr_logfile=/opt/radiusforge/logs/nginx.error.log

[program:api-server]
command=python -m uvicorn src.api.main_simple:app --host 0.0.0.0 --port 8910
directory=/opt/radiusforge
autostart=true
autorestart=true
stdout_logfile=/opt/radiusforge/logs/api.log
stderr_logfile=/opt/radiusforge/logs/api.error.log
environment=PYTHONPATH="/opt/radiusforge"

[program:health-check]
command=python -c "
import http.server
import socketserver
import json

class HealthHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            status = {
                'status': 'healthy',
                'version': '1.4.0',
                'container': 'docker',
                'ports': '8910-8920'
            }
            self.wfile.write(json.dumps(status).encode())
        else:
            self.send_response(404)
            self.end_headers()
    def log_message(self, format, *args):
        pass

with socketserver.TCPServer(('', 8917), HealthHandler) as httpd:
    httpd.serve_forever()
"
directory=/opt/radiusforge
autostart=true
autorestart=true
stdout_logfile=/opt/radiusforge/logs/health.log
stderr_logfile=/opt/radiusforge/logs/health.error.log

[program:metrics]
command=python -c "
import http.server
import socketserver
import time

class MetricsHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            metrics = f'''# HELP radiusforge_up RadiusForge service status
# TYPE radiusforge_up gauge
radiusforge_up 1

# HELP radiusforge_version_info RadiusForge version
# TYPE radiusforge_version_info gauge
radiusforge_version_info{{version=\"1.4.0\"}} 1

# HELP radiusforge_api_requests_total Total API requests
# TYPE radiusforge_api_requests_total counter
radiusforge_api_requests_total 0

# HELP radiusforge_auth_success_total Total successful authentications
# TYPE radiusforge_auth_success_total counter
radiusforge_auth_success_total 0

# HELP radiusforge_auth_failure_total Total failed authentications
# TYPE radiusforge_auth_failure_total counter
radiusforge_auth_failure_total 0
'''
            self.wfile.write(metrics.encode())
        else:
            self.send_response(404)
            self.end_headers()
    def log_message(self, format, *args):
        pass

with socketserver.TCPServer(('', 8916), MetricsHandler) as httpd:
    httpd.serve_forever()
"
directory=/opt/radiusforge
autostart=true
autorestart=true
stdout_logfile=/opt/radiusforge/logs/metrics.log
stderr_logfile=/opt/radiusforge/logs/metrics.error.log
EOF

# Create startup script
RUN cat > /opt/radiusforge/docker-entrypoint.sh << 'EOF'
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

# Check if configuration exists
if [ ! -f "/opt/radiusforge/config/.env" ]; then
    echo "Creating default configuration..."
    cat > /opt/radiusforge/config/.env << 'CONFIG'
# RadiusForge Configuration
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

# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
EOF

RUN chmod +x /opt/radiusforge/docker-entrypoint.sh

# Expose all RadiusForge ports
EXPOSE 8910 8911 8912 8913 8914 8915 8916 8917 8918 8919 8920

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8917/health || exit 1

# Labels
LABEL maintainer="RadiusForge Team" \
      version="1.4.0" \
      description="RadiusForge AAA Traffic Load Testing Platform"

# Volume for persistent data and configuration
VOLUME ["/opt/radiusforge/data", "/opt/radiusforge/logs", "/opt/radiusforge/config"]

# Start services
ENTRYPOINT ["/opt/radiusforge/docker-entrypoint.sh"]