#!/bin/bash

# RadiusForge Docker Container Build & Bundle Script
# Version: 1.4.1 - Integrated with unified bundle creation
# Creates containerized deployment bundle

set -e

VERSION=$(cat VERSION 2>/dev/null || echo "1.4.1")
IMAGE_NAME="radiusforge"
IMAGE_TAG="${VERSION}-allinone"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
BUNDLE_DIR="release/container"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   RadiusForge Container Build v${VERSION}   ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found. Please install Docker first.${NC}"
    exit 1
fi

echo "🐳 Docker version: $(docker --version)"
echo ""

# Create bundle directory
echo "Step 1: Creating bundle directory..."
mkdir -p ${BUNDLE_DIR}
echo -e "${GREEN}✓ Bundle directory created${NC}"

# Build Docker image
echo ""
echo "Step 2: Building Docker image..."
echo "  Image: ${FULL_IMAGE}"
docker build -t ${FULL_IMAGE} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi

# Get image size
IMAGE_SIZE=$(docker images ${FULL_IMAGE} --format "{{.Size}}")
echo "  Image size: ${IMAGE_SIZE}"

# Save Docker image to tar
echo ""
echo "Step 3: Saving Docker image to bundle..."
DOCKER_IMAGE_FILE="${BUNDLE_DIR}/radiusforge-${VERSION}-docker.tar"
docker save -o ${DOCKER_IMAGE_FILE} ${FULL_IMAGE}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image saved${NC}"
    BUNDLE_SIZE=$(ls -lh ${DOCKER_IMAGE_FILE} | awk '{print $5}')
    echo "  Bundle size: ${BUNDLE_SIZE}"
else
    echo -e "${RED}✗ Failed to save Docker image${NC}"
    exit 1
fi

# Compress the image
echo ""
echo "Step 4: Compressing Docker image..."
gzip -f ${DOCKER_IMAGE_FILE}
COMPRESSED_FILE="${DOCKER_IMAGE_FILE}.gz"
COMPRESSED_SIZE=$(ls -lh ${COMPRESSED_FILE} | awk '{print $5}')
echo -e "${GREEN}✓ Compressed to ${COMPRESSED_SIZE}${NC}"

# Copy docker-compose file
echo ""
echo "Step 5: Copying deployment files..."
cp docker-compose-allinone.yml ${BUNDLE_DIR}/docker-compose.yml
cp Dockerfile ${BUNDLE_DIR}/

# Create deployment script
cat > ${BUNDLE_DIR}/deploy.sh << 'EOF'
#!/bin/bash

# RadiusForge Container Deployment Script
# Version: 1.4.0

set -e

VERSION="1.4.0"
IMAGE_NAME="radiusforge:${VERSION}-allinone"
CONTAINER_NAME="radiusforge"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   RadiusForge Container Deployment      ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found. Please install Docker.${NC}"
    echo "  Installation:"
    echo "    macOS: brew install docker"
    echo "    Linux: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo -e "${YELLOW}⚠ docker-compose not found, will use docker run${NC}"
    COMPOSE_CMD=""
fi

echo "1. Loading Docker image..."
if [ -f "radiusforge-${VERSION}-docker.tar.gz" ]; then
    echo "  Decompressing image..."
    gunzip -f radiusforge-${VERSION}-docker.tar.gz
fi

if [ -f "radiusforge-${VERSION}-docker.tar" ]; then
    docker load -i radiusforge-${VERSION}-docker.tar
    echo -e "${GREEN}✓ Image loaded${NC}"
else
    echo -e "${RED}✗ Docker image file not found${NC}"
    exit 1
fi

echo ""
echo "2. Starting RadiusForge container..."

if [ -n "$COMPOSE_CMD" ] && [ -f "docker-compose.yml" ]; then
    # Use docker-compose
    $COMPOSE_CMD up -d
else
    # Use docker run
    docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        -p 8910:8910 \
        -p 8911:8911 \
        -p 8912:8912 \
        -p 8913:8913/udp \
        -p 8914:8914 \
        -p 8915:8915 \
        -p 8916:8916 \
        -p 8917:8917 \
        -p 8918:8918 \
        -p 8919:8919 \
        -p 8920:8920 \
        -v $(pwd)/data:/opt/radiusforge/data \
        -v $(pwd)/logs:/opt/radiusforge/logs \
        -v $(pwd)/config:/opt/radiusforge/config \
        -e RADIUS_SERVER_TYPE=${RADIUS_SERVER_TYPE:-access-manager} \
        -e RADIUS_PRIMARY_HOST=${RADIUS_PRIMARY_HOST:-192.168.1.10} \
        -e RADIUS_PRIMARY_SECRET=${RADIUS_PRIMARY_SECRET:-RadiusForge2024Secret} \
        ${IMAGE_NAME}
fi

echo ""
echo "3. Waiting for services to start..."
sleep 5

# Check health
echo ""
echo "4. Checking health status..."
if curl -f http://localhost:8917/health 2>/dev/null; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠ Health check pending, please wait...${NC}"
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   Deployment Complete!                  ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "🌐 Access Points:"
echo "  • Web UI:        http://localhost:8911"
echo "  • API Server:    http://localhost:8910"
echo "  • API Docs:      http://localhost:8910/docs"
echo "  • Health Check:  http://localhost:8917/health"
echo "  • Metrics:       http://localhost:8916/metrics"
echo ""
echo "📋 Container Management:"
echo "  • View logs:     docker logs ${CONTAINER_NAME}"
echo "  • Stop:          docker stop ${CONTAINER_NAME}"
echo "  • Start:         docker start ${CONTAINER_NAME}"
echo "  • Remove:        docker rm -f ${CONTAINER_NAME}"
echo "  • Shell access:  docker exec -it ${CONTAINER_NAME} /bin/bash"
echo ""
echo "🔧 Configuration:"
echo "  Edit config/radiusforge.conf and restart container"
echo ""
EOF

chmod +x ${BUNDLE_DIR}/deploy.sh

# Create .env.example
cat > ${BUNDLE_DIR}/.env.example << EOF
# RadiusForge Environment Configuration
# Copy to .env and customize

# RADIUS Configuration
RADIUS_SERVER_TYPE=access-manager
RADIUS_PRIMARY_HOST=192.168.1.10
RADIUS_PRIMARY_PORT=1812
RADIUS_PRIMARY_SECRET=ChangeMeToSecureSecret
RADIUS_ACCOUNTING_PORT=1813

# Performance
MAX_WORKERS=8
MAX_CONNECTIONS=10000
TIMEOUT_SECONDS=30

# Timezone
TZ=UTC
EOF

# Create README
cat > ${BUNDLE_DIR}/README.md << EOF
# RadiusForge Container Deployment v${VERSION}

## 🚀 Quick Start

### Prerequisites
- Docker installed (Docker Desktop for macOS/Windows, Docker Engine for Linux)
- Ports 8910-8920 available
- 2GB+ free disk space

### Deployment Steps

1. **Extract bundle** (if compressed):
   \`\`\`bash
   tar -xzf radiusforge-container-${VERSION}.tar.gz
   cd radiusforge-container
   \`\`\`

2. **Configure** (optional):
   \`\`\`bash
   cp .env.example .env
   nano .env  # Edit RADIUS server settings
   \`\`\`

3. **Deploy**:
   \`\`\`bash
   ./deploy.sh
   \`\`\`

4. **Access**:
   - Web UI: http://localhost:8911
   - API Docs: http://localhost:8910/docs

## 🐳 Docker Commands

### Using docker-compose (recommended):
\`\`\`bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove everything (including volumes)
docker-compose down -v
\`\`\`

### Using docker directly:
\`\`\`bash
# Start container
docker run -d --name radiusforge \\
  -p 8910-8920:8910-8920 \\
  radiusforge:${VERSION}-allinone

# View logs
docker logs -f radiusforge

# Stop container
docker stop radiusforge

# Remove container
docker rm radiusforge
\`\`\`

## 📊 Service Ports

| Port | Service | Description |
|------|---------|-------------|
| 8910 | API Server | REST API |
| 8911 | Web UI | React Frontend |
| 8912 | WebSocket | Real-time updates |
| 8913 | RADIUS Test | UDP RADIUS client |
| 8914 | TACACS+ Test | TCP TACACS+ client |
| 8915 | Syslog | Log receiver |
| 8916 | Metrics | Prometheus endpoint |
| 8917 | Health | Health check API |
| 8918 | Admin API | Administrative functions |
| 8919 | Backup | Backup service |
| 8920 | Reserved | Future use |

## 🔧 Configuration

### Environment Variables
Edit \`.env\` file or pass via docker run:

\`\`\`bash
docker run -d \\
  -e RADIUS_SERVER_TYPE=cisco-ise \\
  -e RADIUS_PRIMARY_HOST=10.0.0.100 \\
  -e RADIUS_PRIMARY_SECRET=MySecret123 \\
  radiusforge:${VERSION}-allinone
\`\`\`

### Persistent Data
Volumes are mounted to local directories:
- \`./data\` - Application data
- \`./logs\` - Log files
- \`./config\` - Configuration files

## 🔍 Troubleshooting

### Container won't start:
\`\`\`bash
# Check logs
docker logs radiusforge

# Check if ports are in use
lsof -i :8910-8920
\`\`\`

### Can't access UI:
\`\`\`bash
# Check container is running
docker ps

# Check health
curl http://localhost:8917/health
\`\`\`

### Reset everything:
\`\`\`bash
docker-compose down -v
rm -rf data logs config
./deploy.sh
\`\`\`

## 📝 Version Info
- **Version**: ${VERSION}
- **Build Date**: ${TIMESTAMP}
- **Image Size**: ${IMAGE_SIZE}
- **Bundle Size**: ${COMPRESSED_SIZE}

## 🆘 Support
- Documentation: See docs/ directory
- Health Check: http://localhost:8917/health
- Container Shell: \`docker exec -it radiusforge /bin/bash\`

---
© 2024 RadiusForge - Enterprise AAA Testing Platform
EOF

echo -e "${GREEN}✓ Deployment files created${NC}"

# Create the final bundle
echo ""
echo "Step 6: Creating final bundle..."
cd ${BUNDLE_DIR}
tar -czf radiusforge-container-${VERSION}.tar.gz \
    radiusforge-${VERSION}-docker.tar.gz \
    docker-compose.yml \
    Dockerfile \
    deploy.sh \
    .env.example \
    README.md
cd - > /dev/null

FINAL_SIZE=$(ls -lh ${BUNDLE_DIR}/radiusforge-container-${VERSION}.tar.gz | awk '{print $5}')

echo -e "${GREEN}✓ Final bundle created${NC}"

# Calculate checksums
echo ""
echo "Step 7: Calculating checksums..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    CHECKSUM=$(shasum -a 256 ${BUNDLE_DIR}/radiusforge-container-${VERSION}.tar.gz | awk '{print $1}')
else
    CHECKSUM=$(sha256sum ${BUNDLE_DIR}/radiusforge-container-${VERSION}.tar.gz | awk '{print $1}')
fi
echo "  SHA256: ${CHECKSUM}"

# Cleanup intermediate files
rm -f ${BUNDLE_DIR}/radiusforge-${VERSION}-docker.tar.gz

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   Container Bundle Complete!            ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "📦 Bundle created:"
echo "  File: ${BUNDLE_DIR}/radiusforge-container-${VERSION}.tar.gz"
echo "  Size: ${FINAL_SIZE}"
echo "  SHA256: ${CHECKSUM}"
echo ""
echo "🐳 Docker image:"
echo "  Name: ${FULL_IMAGE}"
echo "  Size: ${IMAGE_SIZE}"
echo ""
echo "📋 Deployment:"
echo "  1. Transfer bundle to target system"
echo "  2. Extract: tar -xzf radiusforge-container-${VERSION}.tar.gz"
echo "  3. Deploy: ./deploy.sh"
echo ""
echo "✨ Features:"
echo "  • Single container with all services"
echo "  • No external dependencies"
echo "  • Persistent volumes for data/logs/config"
echo "  • Health monitoring built-in"
echo "  • Supports both docker and docker-compose"
echo ""
echo "⚠️  NOTE: This script is deprecated. Use './scripts/create-bundle.sh' for unified bundle creation."
echo ""
