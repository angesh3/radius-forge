# RadiusForge v1.4.0 Release Notes

## Release Information
- **Version**: 1.4.0
- **Build Date**: 20250929_032137
- **Port Range**: 8910-8920 (11 dedicated services)
- **Deployment Options**: Traditional + Container
- **OS Support**: macOS, RHEL 8.8+, CentOS 8+, Ubuntu 20.04+, Docker

## Download Bundle

### Complete Bundle (Traditional + Container)
- **File**: RADIUSFORGE-PRODUCTION-V1.4.0-COMPLETE.tar.gz
- **Size**: 14M
- **SHA256**: fbef4d4fa6da5851f1999400c33069d8213304a54f51ff9fd7bcdeb0b238805b
- **Use for**: Any deployment method on any supported OS

## What's New in v1.4.0

1. **Unified Bundle Creation**
   - Consolidated all versioned bundle scripts into single create-bundle.sh
   - Automated archiving of previous versions with retention policies
   - Comprehensive bundle validation and quality gates

2. **Streamlined Deployment**
   - Single deploy.sh script with deployment method chooser
   - Unified install-upgrade.sh for both traditional and container deployments
   - Removed redundant deployment scripts

3. **Enhanced Quality Assurance**
   - Bundle structure validation
   - Security scanning for sensitive files
   - Dependency verification
   - Deployment testing

4. **Archive Management**
   - Automatic archiving of previous bundle versions
   - Configurable retention policies (count-based and time-based)
   - Organized archive structure in release/archive-v* directories


```bash
tar -xzf RADIUSFORGE-PRODUCTION-V1.4.0-COMPLETE.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.4.0-COMPLETE
./deploy.sh
# Choose:
#   1) Traditional Installation
#   2) Container Deployment
```

#### Option 2: Traditional Installation
```bash
./install-traditional.sh
```

```bash
./install-container.sh
```

## Port Allocation
| Port | Service | Description |
|------|---------|-------------|
| 8910 | API Server | Main FastAPI application |
| 8911 | Web UI | React frontend |
| 8912 | WebSocket | Real-time updates |
| 8913 | RADIUS Test | UDP RADIUS client |
| 8914 | TACACS+ Test | TCP TACACS+ client |
| 8915 | Syslog Receiver | Log aggregation |
| 8916 | Metrics Export | Prometheus metrics |
| 8917 | Health Check | Service monitoring |
| 8918 | Admin API | Administrative functions |
| 8919 | Backup Service | Data backup/restore |
| 8920 | Reserved | Future expansion |

## Testing

1. **Check Health**: `curl http://localhost:8917/health`
2. **Access UI**: http://localhost:8911
3. **API Docs**: http://localhost:8910/docs
4. **View Metrics**: http://localhost:8916/metrics

## Container Management

```bash
# View logs
docker logs -f radiusforge

# Stop container
docker stop radiusforge

# Start container
docker start radiusforge

# Shell access
docker exec -it radiusforge /bin/bash
```


This bundle has been validated with:
- ✓ Bundle structure verification
- ✓ Security scanning
- ✓ Dependency verification
- ✓ Deployment testing
- ✓ Checksum validation

See validation report: `release/validation-1.4.0.log`

## Support
- Documentation: See docs/ directory
- Container Guide: CONTAINER_DEPLOYMENT_GUIDE.md
- Version check: `curl http://localhost:8910/api/version`

---
Built with ❤️ by RadiusForge Team
