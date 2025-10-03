# RadiusForge Multi-Architecture Deployment Guide

## Overview

RadiusForge now supports automatic multi-architecture deployment with intelligent platform detection. The system automatically detects your hardware architecture and builds containers optimized for your platform.

## Supported Architectures

- **linux/amd64** - Intel/AMD x86_64 processors
- **linux/arm64** - ARM64/AArch64 processors (Apple Silicon, ARM servers)

## Architecture Detection

The deployment scripts automatically detect your system architecture using `uname -m`:

| System Output | Docker Platform | Common Hardware |
|---------------|-----------------|-----------------|
| `x86_64`      | `linux/amd64`   | Intel/AMD CPUs  |
| `arm64`       | `linux/arm64`   | Apple Silicon   |
| `aarch64`     | `linux/arm64`   | ARM servers     |

## Deployment Methods

### Method 1: Bundle Deployment (Recommended for Production)

Use the enhanced bundle deployment with automatic architecture detection:

```bash
# Navigate to your bundle directory
cd RADIUSFORGE-PRODUCTION-V1.4.10-COMPLETE

# Deploy with automatic architecture detection
./deploy.sh
# Choose option 2 for Container Deployment
```

**Features:**
- ✅ Automatic architecture detection
- ✅ Build tools included for all platforms
- ✅ Graceful fallback if platform-specific build fails
- ✅ Docker buildx support when available

### Method 2: Repository Deployment (Development)

Use the multi-architecture deployment script from the main repository:

```bash
# From the main repository
./scripts/deploy-container-multiarch.sh
```

**Features:**
- ✅ Multi-stage Docker build
- ✅ Buildx builder management
- ✅ Enhanced logging and status reporting
- ✅ Automatic cleanup of build artifacts

### Method 3: Clean Deployment

Use the cleanup script to remove existing containers and redeploy:

```bash
# From either bundle or repository
./scripts/cleanup-and-deploy.sh
```

## Build Process Details

### Dependencies Installed

The Dockerfile now includes build tools required for compiling Python packages:

```dockerfile
RUN apt-get update && apt-get install -y \
    curl \
    netcat-traditional \
    nginx \
    supervisor \
    build-essential \
    python3-dev \
    gcc \
    libc6-dev \
    make \
    && rm -rf /var/lib/apt/lists/*
```

### Build Strategy

1. **Architecture Detection**: System automatically detects hardware platform
2. **Buildx Preference**: Uses Docker buildx when available for better cross-platform support
3. **Fallback Support**: Falls back to standard Docker build if buildx unavailable
4. **Error Recovery**: Attempts build without platform flag if platform-specific build fails

## Verification Commands

### Check Running Container Architecture

```bash
# Check container architecture
docker inspect radiusforge | grep -i arch

# Check container details
docker inspect radiusforge --format '{{.Config.Labels.version}}'

# Verify health
curl -s http://localhost:8917/health
```

### Expected Output

```json
{
  "status": "healthy",
  "version": "1.4.1",
  "container": "docker",
  "ports": "8910-8926"
}
```

## Troubleshooting

### Build Failures

**Problem**: `psutil` compilation fails
```
ERROR: Failed building wheel for psutil
```

**Solution**: The updated Dockerfile includes build tools. If you see this error:
1. Ensure you're using the updated Dockerfile with build tools
2. Check that Docker has sufficient resources allocated
3. Try building without platform flag as fallback

**Problem**: Port conflicts
```
Bind for 0.0.0.0:8911 failed: port is already allocated
```

**Solution**: Use the cleanup script:
```bash
./scripts/cleanup-and-deploy.sh
```

### Cross-Platform Issues

**Problem**: Slow builds on Apple Silicon when targeting AMD64
**Solution**: The system defaults to native architecture. Cross-compilation is only used when explicitly needed.

**Problem**: Docker buildx not available
**Solution**: The scripts automatically fall back to standard Docker build.

## Performance Considerations

### Native vs Cross-Platform Builds

| Scenario | Build Time | Recommendation |
|----------|------------|----------------|
| ARM64 → ARM64 | Fast | ✅ Recommended |
| AMD64 → AMD64 | Fast | ✅ Recommended |
| ARM64 → AMD64 | Slow (emulation) | ⚠️ Use only if needed |
| AMD64 → ARM64 | Slow (emulation) | ⚠️ Use only if needed |

### Resource Requirements

- **Memory**: Minimum 4GB RAM for builds
- **Disk**: ~2GB for build context and layers
- **CPU**: Multi-core recommended for faster builds

## Container Management

### Basic Commands

```bash
# View logs
docker logs radiusforge
docker logs -f radiusforge  # Follow logs

# Container lifecycle
docker stop radiusforge
docker start radiusforge
docker restart radiusforge

# Access container
docker exec -it radiusforge bash

# View container details
docker inspect radiusforge
```

### Port Mapping

RadiusForge exposes ports 8910-8926:

| Port | Service | Description |
|------|---------|-------------|
| 8910 | API | Main API endpoint |
| 8911 | Web UI | Web interface |
| 8917 | Health | Health check endpoint |
| 8920 | Metrics | Prometheus metrics |
| 8912-8916 | RADIUS | RADIUS services |
| 8918-8919 | TACACS+ | TACACS+ services |
| 8921-8926 | Reserved | Future services |

## Security Considerations

### Build Security

- Build tools are removed after package installation to minimize attack surface
- Only required system packages are installed
- Base image uses official Python slim image

### Runtime Security

- Container runs with minimal privileges
- Port exposure is limited to required services
- Health checks ensure service availability

## Integration with Bundle System

The multi-architecture deployment integrates seamlessly with the existing RadiusForge bundle system:

- **Bundle Compatibility**: Works with existing v1.4.1+ bundles
- **Version Management**: Uses `ops/version_manager.py` for version tracking
- **Manifest Integration**: Compatible with deployment manifests
- **Rollback Support**: Maintains atomic rollback capabilities

## Future Enhancements

- **Multi-platform Manifests**: Support for publishing multi-arch images to registries
- **Build Caching**: Enhanced layer caching for faster subsequent builds
- **Resource Optimization**: Platform-specific optimizations
- **Automated Testing**: Cross-platform testing in CI/CD pipelines

## Support

For issues related to multi-architecture deployment:

1. Check the deployment logs for architecture detection output
2. Verify Docker and buildx versions
3. Ensure sufficient system resources
4. Use cleanup script to resolve port conflicts
5. Check container architecture with `docker inspect radiusforge | grep -i arch`
