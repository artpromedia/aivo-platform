# AIVO Platform Migration Guide

## Overview

This document provides guidance for the ongoing migration from `aivo-agentic-ai-learning-app` (Vite-based) to `aivo-platform` (Next.js-based).

## Sprint 0 Deliverables

The following migration foundation documents have been created:

| Document | Description | Status |
|----------|-------------|--------|
| [MIGRATION_INVENTORY.md](./MIGRATION_INVENTORY.md) | Complete feature inventory with 100+ items | ✅ Complete |
| [DEPENDENCY_COMPATIBILITY.md](./DEPENDENCY_COMPATIBILITY.md) | Dependency compatibility matrix | ✅ Complete |
| [ARCHITECTURE_MAP.md](./ARCHITECTURE_MAP.md) | Architecture mapping between repos | ✅ Complete |
| [API_INVENTORY.md](./API_INVENTORY.md) | API endpoint documentation | ✅ Complete |

## Sprint 1 Deliverables

### Python Services Structure

The following Python services have been scaffolded:

```
services/
├── ai-inference-svc/       # AI inference service (FastAPI)
│   ├── app/
│   │   ├── main.py
│   │   └── core/config.py
│   ├── Dockerfile
│   └── requirements.txt
├── training-svc/           # Brain training service (FastAPI)
│   ├── app/
│   │   ├── main.py
│   │   └── core/config.py
│   ├── Dockerfile
│   └── requirements.txt
├── curriculum-py-svc/      # Curriculum service (FastAPI)
│   ├── app/
│   │   ├── main.py
│   │   └── core/config.py
│   ├── Dockerfile
│   └── requirements.txt
├── python-api-gateway/     # API Gateway (FastAPI)
│   ├── app/
│   │   ├── main.py
│   │   └── core/config.py
│   ├── Dockerfile
│   └── requirements.txt
├── requirements.txt        # Unified Python requirements
├── .env.example           # Environment variables template
└── tests/
    └── test_integration.py # Integration tests
```

### Docker Configuration

- `docker-compose.services.yml` - Docker Compose for Python services
- `scripts/init-databases.sql` - Database initialization script
- `scripts/validate-python-migration.sh` - Migration validation script

## Quick Start

### 1. Set Up Environment

```bash
# Copy environment file
cp services/.env.example services/.env

# Edit with your API keys
nano services/.env
```

### 2. Start Services

```bash
# Start all Python services
docker-compose -f docker-compose.services.yml up -d

# View logs
docker-compose -f docker-compose.services.yml logs -f
```

### 3. Validate Migration

```bash
# Run validation script
chmod +x scripts/validate-python-migration.sh
./scripts/validate-python-migration.sh
```

### 4. Check Health

```bash
# Check API Gateway health (includes all services)
curl http://localhost:8000/health | jq

# Expected response:
{
  "status": "healthy",
  "service": "AIVO API Gateway",
  "version": "1.0.0",
  "services": {
    "gateway": "healthy",
    "ai-inference": "healthy",
    "training": "healthy",
    "curriculum": "healthy"
  }
}
```

### 5. View Documentation

- API Gateway Swagger: http://localhost:8000/docs
- AI Inference Swagger: http://localhost:8001/docs
- Training Service Swagger: http://localhost:8003/docs
- Curriculum Service Swagger: http://localhost:8004/docs

### 6. Run Tests

```bash
cd services
pip install pytest pytest-asyncio httpx
pytest tests/test_integration.py -v
```

## Service Ports

| Service | Internal Port | External Port |
|---------|---------------|---------------|
| API Gateway | 8000 | 8000 |
| AI Inference | 8000 | 8001 |
| Training | 8000 | 8003 |
| Curriculum | 8000 | 8004 |
| PostgreSQL | 5432 | 5433 |
| Redis | 6379 | 6380 |

## Migration Status

### Sprint 0: Foundation ✅
- [x] Feature inventory audit
- [x] Dependency analysis
- [x] Architecture mapping
- [x] API inventory

### Sprint 1: Python Services ✅
- [x] Directory structure created
- [x] Dockerfiles created
- [x] Docker Compose configuration
- [x] API Gateway implementation
- [x] Integration tests
- [x] Validation script

### Sprint 2: UI Components (Pending)
- [ ] FocusMonitor components
- [ ] ExecutiveFunction components
- [ ] SelfRegulation components
- [ ] GamePicker components
- [ ] WritingPad components

### Sprint 3: Assessment System (Pending)
- [ ] Baseline assessment flow
- [ ] Assessment routing
- [ ] Result storage
- [ ] Progress tracking

### Sprint 4: Production Ready (Pending)
- [ ] CI/CD pipelines
- [ ] Kubernetes manifests
- [ ] Monitoring setup
- [ ] Security hardening

## Next Steps

1. **Copy actual service logic** from `aivo-agentic-ai-learning-app/services/` to the new service structure
2. **Migrate frontend components** from the legacy learner-app
3. **Set up CI/CD** for Python services
4. **Add Kubernetes** deployment manifests
5. **Configure monitoring** (Prometheus, Grafana)

## Troubleshooting

### Services not starting
```bash
# Check Docker logs
docker-compose -f docker-compose.services.yml logs

# Rebuild services
docker-compose -f docker-compose.services.yml build --no-cache
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.services.yml ps postgres

# Connect to database
docker-compose -f docker-compose.services.yml exec postgres psql -U aivo -d aivo
```

### Port conflicts
```bash
# Check what's using a port
lsof -i :8000

# Kill process on port
kill -9 $(lsof -t -i:8000)
```

## Contributing

When adding new features during migration:

1. Update the relevant inventory document
2. Add tests for new functionality
3. Update Docker configurations if needed
4. Run validation script before committing

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Documentation](https://nextjs.org/docs)
