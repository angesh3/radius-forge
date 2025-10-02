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

# Install system dependencies including build tools for psutil
RUN apt-get update && apt-get install -y \
    curl \
    netcat-traditional \
    nginx \
    supervisor \
    build-essential \
    python3-dev \
    gcc \
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

# Copy configuration files
COPY docker/nginx-radiusforge.conf /etc/nginx/sites-available/radiusforge
COPY docker/supervisord.conf /etc/supervisor/conf.d/radiusforge.conf
COPY docker/docker-entrypoint.sh /opt/radiusforge/docker-entrypoint.sh
COPY docker/health_server.py /opt/radiusforge/docker/health_server.py
COPY docker/metrics_server.py /opt/radiusforge/docker/metrics_server.py

# Enable nginx site and make scripts executable
RUN ln -s /etc/nginx/sites-available/radiusforge /etc/nginx/sites-enabled/ && \
    rm -f /etc/nginx/sites-enabled/default && \
    chmod +x /opt/radiusforge/docker-entrypoint.sh && \
    chmod +x /opt/radiusforge/docker/health_server.py && \
    chmod +x /opt/radiusforge/docker/metrics_server.py

# Expose all RadiusForge ports
EXPOSE 8910 8911 8912 8913 8914 8915 8916 8917 8918 8919 8920 8921 8922 8923 8924 8925 8926

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
