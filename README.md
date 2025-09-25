# RadiusForge 🔨

**AAA Traffic Load & Performance Testing Platform with Multi-Agent Orchestration**

RadiusForge is a scalable, enterprise-grade platform for simulating and analyzing AAA (Authentication, Authorization, Accounting) traffic loads. It focuses on RADIUS, TACACS+, and Syslog protocols to test the scale, performance, and reliability of Asset Manager systems and Cisco ISE deployments.

## 🚀 Features

### Core Capabilities
- **Scale Testing**: Drive controlled RPS (Requests Per Second) from 150 to 100,000+ 
- **Performance Benchmarking**: SLO validation with regression detection
- **Threat Simulation**: Adversarial traffic patterns for resilience testing
- **Real-time Analytics**: Live KPIs with WebSocket telemetry
- **Multi-Protocol Support**: RADIUS (EAP-TLS, PEAP, MAB), TACACS+, Syslog
- **Enterprise Ready**: Production ports (8910-8920), true airgap deployment

### UI Pages
1. **Scale Test** - RPS planner with presets and live metrics
2. **Performance Test** - SLO benchmark suite runner
3. **Threat Generator** - Adversarial traffic modules with safety controls
4. **Report** - PDF/HTML generation with email distribution
5. **Topology** - Interactive network visualization
6. **History & Compare** - Run catalog with regression analysis
7. **Help** - Documentation and troubleshooting

## 🏗️ Architecture

### Multi-Agent Orchestration
RadiusForge implements a sophisticated multi-agent system based on CLAUDE.md:

```
Human → Main Orchestrator (MO) → Specialized Agents
         ├── Thinker (requirements clarification)
         ├── Designer (UX/UI design)
         ├── Architect (technical design)
         ├── Dev-BE/Dev-FE (implementation)
         ├── Security (threat analysis)
         ├── Testers (unit/integration/e2e)
         ├── Test Report Generator (unified reporting)
         ├── Code Reviewer (quality assurance)
         ├── Documentation (technical writing)
         └── Bundle (deployment packaging)
```

### Technology Stack
- **Frontend**: React 18 + Vite + Material-UI
- **Backend**: FastAPI + Python 3.11
- **Database**: PostgreSQL 15 + SQLAlchemy
- **Real-time**: WebSockets for live telemetry
- **Protocols**: RADIUS (pyrad), TACACS+, Syslog (RFC 3164/5424)
- **Testing**: pytest + Jest + Playwright
- **CI/CD**: GitHub Actions with quality gates

## 📦 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (optional, for caching)
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/radius-forge.git
cd radius-forge
```

2. **Install dependencies**
```bash
make install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start with Docker**
```bash
docker-compose up -d
```

Or **start manually**:
```bash
# Terminal 1: Start backend
make dev-backend

# Terminal 2: Start frontend
make dev-frontend
```

5. **Access the application**
- UI: http://localhost:8911
- API: http://localhost:8910
- API Docs: http://localhost:8910/docs

## 🎯 Command Palette

RadiusForge uses a command-based workflow mapped to Makefile targets:

```bash
# Multi-Agent Commands
make triage ARG="implement OAuth2"    # Clarify requirements
make design                           # Create UX designs
make arch                             # Define architecture
make dev-be COMP="auth"              # Implement backend
make dev-fe COMP="login"             # Implement frontend
make sec-scan                        # Security assessment
make test-unit                       # Run unit tests
make test-int                        # Run integration tests
make test-e2e                        # Run E2E tests
make test-report                     # Generate test report
make review                          # Code review
make docs                            # Update documentation
make bundle                          # Create deployment bundle
make handoff                         # Final delivery

# Orchestrator Commands
make plan ARG="new feature"          # Create execution plan
make status                          # Check project status
make rollback VER="1.0.0"           # Rollback to version
```

## 🧪 Testing

RadiusForge includes comprehensive testing at all levels:

```bash
# Run all tests
make test

# Run specific test suites
make test-unit       # Unit tests with coverage
make test-int        # Integration tests
make test-e2e        # End-to-end tests

# Generate unified test report
make test-report

# Run with coverage
pytest --cov=src --cov-report=html
```

## 📊 Performance Targets

### Supported Scale Points
- 150, 200, 300, 500, 1000, 1500, 2000, 2500, 3000
- 3500, 4000, 4500, 5000, 10000, 50000, 100000 RPS

### Default SLOs
- **Auth p95**: < 150ms
- **Auth p99**: < 300ms
- **Error Rate**: < 1% sustained
- **CoA p95**: < 2s

## 🔒 Security

- **Authentication**: JWT-based with configurable expiration
- **Rate Limiting**: Configurable per-minute/hour limits
- **IP Allowlisting**: Optional IP-based access control
- **Secrets Management**: Environment-based configuration
- **TLS Support**: Full TLS 1.2+ for all protocols

## 📚 Documentation

- [PRD.md](PRD.md) - Product Requirements Document
- [TOPOLOGY.md](TOPOLOGY.md) - Network topology and architecture
- [CLAUDE.md](CLAUDE.md) - Multi-agent orchestration guide
- [UI_PAGES_README.md](UI_PAGES_README.md) - UI page specifications
- [API Documentation](http://localhost:8910/docs) - Interactive API docs

## 🚀 Deployment

### Production Bundle
```bash
make bundle
```

Creates a deployment bundle with:
- Compiled frontend assets
- Python wheel packages
- Database migrations
- Configuration templates
- SBOM (Software Bill of Materials)
- Deployment scripts

### Docker Deployment
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`make test`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📈 Monitoring

- **Prometheus**: Metrics collection (port 9090)
- **Grafana**: Dashboards (port 3001)
- **Health Check**: `GET /health`
- **Metrics**: `GET /metrics`

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 8910-8920 are available
2. **Database connection**: Check PostgreSQL is running and credentials are correct
3. **RADIUS timeouts**: Verify network connectivity and secrets
4. **WebSocket disconnects**: Check firewall/proxy WebSocket support

### Debug Mode
```bash
DEBUG=true make dev
```

## 📝 License

Copyright © 2024 RadiusForge Team. All rights reserved.

## 🙏 Acknowledgments

- Built with the multi-agent orchestration pattern from CLAUDE.md
- RADIUS implementation based on RFC 2865/2866
- TACACS+ support for Cisco environments
- Syslog formats per RFC 3164/5424

## 📞 Support

- GitHub Issues: [Report bugs](https://github.com/angesh3/radius-forge/issues)
- Documentation: [Read the docs](./docs)
- Email: support@radiusforge.local

---

**RadiusForge** - Enterprise AAA Testing at Scale 🚀
