# RadiusForge Container Deployment Guide v1.4.0

## 🐳 Overview

RadiusForge v1.4.0 introduces **containerized deployment** - a single Docker container that includes all services, making installation as simple as running one command. No more complex dependencies, port conflicts, or OS-specific issues!

## 🚀 Why Containerization?

### Benefits:
- **One Command Installation**: `docker run` or `docker-compose up`
- **No Dependencies**: Everything bundled in the container
- **Consistent Across Platforms**: Same on macOS, Linux, Windows
- **Easy Updates**: Just pull new image version
- **Isolated Environment**: No conflicts with existing software
- **Built-in Health Checks**: Automatic service monitoring
- **Persistent Data**: Volumes for logs, config, and data

## 📦 What's Included

The all-in-one container includes:
- ✅ API Server (Port 8910)
- ✅ Web UI with React (Port 8911)
- ✅ WebSocket Server (Port 8912)
- ✅ RADIUS Test Client (Port 8913)
- ✅ TACACS+ Test Client (Port 8914)
- ✅ Syslog Receiver (Port 8915)
- ✅ Metrics Exporter (Port 8916)
- ✅ Health Check API (Port 8917)
- ✅ Admin API (Port 8918)
- ✅ Backup Service (Port 8919)
- ✅ Nginx for UI serving
- ✅ Supervisor for process management

## 🔧 Prerequisites

### Required:
- **Docker**: Version 20.10 or higher
- **Disk Space**: 2GB minimum
- **RAM**: 2GB minimum (4GB recommended)
- **Ports**: 8910-8920 available

### Installation Commands:

**macOS:**
```bash
# Install Docker Desktop
brew install --cask docker
# Or download from: https://www.docker.com/products/docker-desktop
```

**Linux (Ubuntu/Debian):**
```bash
# Install Docker Engine
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

**RHEL/CentOS:**
```bash
# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
```

**Windows:**
Download Docker Desktop from https://www.docker.com/products/docker-desktop

## 📥 Deployment Methods

### Method 1: Using Pre-built Bundle (Recommended)

```bash
# 1. Extract the container bundle
tar -xzf radiusforge-container-1.4.0.tar.gz
cd radiusforge-container

# 2. Deploy with the script
./deploy.sh

# That's it! RadiusForge is now running
```

### Method 2: Using Docker Compose

```bash
# 1. Create docker-compose.yml (or use provided)
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  radiusforge:
    image: radiusforge:1.4.0-allinone
    container_name: radiusforge
    ports:
      - "8910-8920:8910-8920"
    environment:
      - RADIUS_SERVER_TYPE=access-manager
      - RADIUS_PRIMARY_HOST=192.168.1.10
      - RADIUS_PRIMARY_SECRET=RadiusForge2024Secret
    volumes:
      - ./data:/opt/radiusforge/data
      - ./logs:/opt/radiusforge/logs
      - ./config:/opt/radiusforge/config
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8917/health"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

# 2. Start services
docker-compose up -d

# 3. Check status
docker-compose ps
docker-compose logs
```

### Method 3: Using Docker Run

```bash
# Run the all-in-one container
docker run -d \
  --name radiusforge \
  --restart unless-stopped \
  -p 8910-8920:8910-8920 \
  -v $(pwd)/data:/opt/radiusforge/data \
  -v $(pwd)/logs:/opt/radiusforge/logs \
  -v $(pwd)/config:/opt/radiusforge/config \
  -e RADIUS_SERVER_TYPE=access-manager \
  -e RADIUS_PRIMARY_HOST=192.168.1.10 \
  -e RADIUS_PRIMARY_SECRET=YourSecretHere \
  radiusforge:1.4.0-allinone
```

## 🔐 Configuration

### Environment Variables

Create `.env` file for configuration:

```env
# RADIUS Configuration
RADIUS_SERVER_TYPE=access-manager  # or cisco-ise
RADIUS_PRIMARY_HOST=192.168.1.10
RADIUS_PRIMARY_PORT=1812
RADIUS_PRIMARY_SECRET=YourSecureSecret
RADIUS_ACCOUNTING_PORT=1813

# Performance
MAX_WORKERS=8
MAX_CONNECTIONS=10000
TIMEOUT_SECONDS=30

# Timezone
TZ=America/New_York
```

### Apply Configuration:

```bash
# Using docker-compose
docker-compose --env-file .env up -d

# Using docker run
docker run -d --env-file .env radiusforge:1.4.0-allinone
```

## 🌐 Accessing RadiusForge

Once deployed, access the services:

| Service | URL | Description |
|---------|-----|-------------|
| Web UI | http://localhost:8911 | Main user interface |
| API Server | http://localhost:8910 | REST API endpoint |
| API Docs | http://localhost:8910/docs | Interactive API documentation |
| Health Check | http://localhost:8917/health | Service health status |
| Metrics | http://localhost:8916/metrics | Prometheus metrics |

## 📊 Container Management

### Basic Commands:

```bash
# View running containers
docker ps

# View logs
docker logs -f radiusforge

# Stop container
docker stop radiusforge

# Start container
docker start radiusforge

# Restart container
docker restart radiusforge

# Remove container
docker rm -f radiusforge

# Shell access
docker exec -it radiusforge /bin/bash
```

### Docker Compose Commands:

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Remove everything (including volumes)
docker-compose down -v
```

## 🔄 Updates & Upgrades

### Updating to New Version:

```bash
# 1. Stop current container
docker-compose down

# 2. Load new image
docker load -i radiusforge-1.4.1-docker.tar

# 3. Update docker-compose.yml with new version
sed -i 's/1.4.0/1.4.1/g' docker-compose.yml

# 4. Start new version
docker-compose up -d
```

### Backup Before Update:

```bash
# Backup data and config
tar -czf backup-$(date +%Y%m%d).tar.gz data/ config/ logs/

# Restore if needed
tar -xzf backup-20240814.tar.gz
```

## 🛠️ Troubleshooting

### Container Won't Start

```bash
# Check if ports are in use
lsof -i :8910-8920

# Check Docker logs
docker logs radiusforge

# Check disk space
df -h

# Check Docker daemon
docker info
```

### Can't Access Web UI

```bash
# Check container is running
docker ps | grep radiusforge

# Check port mapping
docker port radiusforge

# Test health endpoint
curl http://localhost:8917/health

# Check nginx inside container
docker exec radiusforge nginx -t
```

### Performance Issues

```bash
# Check resource usage
docker stats radiusforge

# Increase memory limit
docker update --memory="4g" radiusforge

# Check logs for errors
docker logs --tail 100 radiusforge
```

### Reset Everything

```bash
# Stop and remove container
docker-compose down -v

# Remove all data
rm -rf data/ logs/ config/

# Start fresh
docker-compose up -d
```

## 📈 Monitoring

### Built-in Health Check:

```bash
# Check health status
curl http://localhost:8917/health

# Response:
{
  "status": "healthy",
  "version": "1.4.0",
  "container": "docker",
  "ports": "8910-8920"
}
```

### Prometheus Metrics:

```bash
# View metrics
curl http://localhost:8916/metrics

# Metrics include:
# - radiusforge_up
# - radiusforge_auth_success_total
# - radiusforge_auth_failure_total
# - radiusforge_api_requests_total
```

### Container Stats:

```bash
# Real-time stats
docker stats radiusforge

# Resource limits
docker inspect radiusforge | grep -A 5 "HostConfig"
```

## 🔒 Security Considerations

### Best Practices:

1. **Change Default Secrets**:
   ```bash
   # Generate strong secret
   openssl rand -base64 32
   ```

2. **Use TLS/SSL**:
   ```bash
   # Mount certificates
   -v ./certs:/opt/radiusforge/certs:ro
   ```

3. **Network Isolation**:
   ```bash
   # Create dedicated network
   docker network create radiusforge-net
   docker run --network radiusforge-net ...
   ```

4. **Read-only Root Filesystem**:
   ```bash
   docker run --read-only \
     --tmpfs /tmp \
     --tmpfs /var/run \
     radiusforge:1.4.0-allinone
   ```

## 🚀 Production Deployment

### Docker Swarm:

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml radiusforge

# Scale services
docker service scale radiusforge_app=3
```

### Kubernetes:

```yaml
# radiusforge-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: radiusforge
spec:
  replicas: 3
  selector:
    matchLabels:
      app: radiusforge
  template:
    metadata:
      labels:
        app: radiusforge
    spec:
      containers:
      - name: radiusforge
        image: radiusforge:1.4.0-allinone
        ports:
        - containerPort: 8910
        - containerPort: 8911
        # ... other ports
```

## 📝 Quick Reference

### One-liner Deployment:
```bash
curl -fsSL https://radiusforge.example.com/install.sh | sh
```

### All-in-one Docker Command:
```bash
docker run -d --name radiusforge -p 8910-8920:8910-8920 radiusforge:1.4.0-allinone
```

### Quick Health Check:
```bash
curl -s http://localhost:8917/health | jq .
```

### View All Logs:
```bash
docker exec radiusforge tail -f /opt/radiusforge/logs/*.log
```

## 🆘 Support

- **Container Logs**: `docker logs radiusforge`
- **Shell Access**: `docker exec -it radiusforge /bin/bash`
- **Health API**: http://localhost:8917/health
- **Documentation**: Inside container at `/opt/radiusforge/docs/`

---

**Version**: 1.4.0  
**Container Image**: radiusforge:1.4.0-allinone  
**Port Range**: 8910-8920  
**Build Date**: August 2024  

© 2024 RadiusForge - Enterprise AAA Testing Platform