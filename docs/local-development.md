# AIVO Platform - Local Development Guide

This guide explains how to set up and run the complete AIVO platform locally using Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Service URLs](#service-urls)
- [Development Workflows](#development-workflows)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Prerequisites

### Required Software

| Software       | Minimum Version | Recommended               | Notes                                    |
| -------------- | --------------- | ------------------------- | ---------------------------------------- |
| Docker Desktop | 4.0+            | Latest                    | Enable WSL2 on Windows                   |
| Docker Compose | v2.0+           | Built into Docker Desktop |                                          |
| Git            | 2.30+           | Latest                    |                                          |
| Node.js        | 20.x            | 20.19.4                   | Only for running services outside Docker |
| pnpm           | 8.x             | 9.x                       | Only for running services outside Docker |

### System Requirements

| Resource   | Minimum | Recommended |
| ---------- | ------- | ----------- |
| RAM        | 8 GB    | 16 GB       |
| CPU Cores  | 4       | 8           |
| Disk Space | 20 GB   | 50 GB       |

### Docker Desktop Settings (Windows/Mac)

Allocate sufficient resources to Docker:

- **Memory**: At least 8 GB (recommended: 12 GB)
- **CPUs**: At least 4 (recommended: 6)
- **Disk image size**: At least 60 GB

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/artpromedia/aivo-platform.git
cd aivo-platform
```

### 2. Set Up Environment

```bash
cd docker
cp .env.example .env
```

Edit `.env` and fill in your API keys:

- `OPENAI_API_KEY` - Required for AI features
- `ANTHROPIC_API_KEY` - Optional, for Claude integration

### 3. Start the Platform

```bash
# Linux/Mac
./scripts/start-dev.sh

# Windows (Git Bash)
bash scripts/start-dev.sh

# Windows (PowerShell)
docker compose up -d
```

### 4. Verify Everything is Running

```bash
./scripts/health-check.sh
```

### 5. Access the Platform

- **API Gateway**: http://localhost:8000
- **Grafana Dashboard**: http://localhost:3030 (admin/admin)
- **API Documentation**: http://localhost:8000/docs

---

## Architecture Overview

### Service Tiers

The platform is organized into tiers based on dependencies:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API Gateway (Kong)                                  │
│                              :8000                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
    ▼                               ▼                               ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Tier 0: Core  │     │ Tier 1: Content │     │ Tier 2: Learn   │
│─────────────────│     │─────────────────│     │─────────────────│
│ auth-svc :3001  │     │ content :3010   │     │ engage :3030    │
│ tenant-svc:3002 │     │ authoring:3011  │     │ personal:3031   │
│ profile  :3003  │     │ assess  :3020   │     │ learner :3032   │
└─────────────────┘     │ session :3021   │     │ goal    :3033   │
                        └─────────────────┘     └─────────────────┘
                                    │
                                    ▼
                        ┌─────────────────┐
                        │ Tier 3: AI      │
                        │─────────────────│
                        │ ai-orch :3200   │
                        │ sandbox :3201   │
                        └─────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
    ▼                               ▼                               ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  PostgreSQL     │     │     Redis       │     │      NATS       │
│    :5432        │     │     :6379       │     │     :4222       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Infrastructure Components

| Component     | Purpose                      | Port      |
| ------------- | ---------------------------- | --------- |
| PostgreSQL    | Primary database             | 5432      |
| Redis         | Caching, sessions, queues    | 6379      |
| NATS          | Event messaging (JetStream)  | 4222      |
| Elasticsearch | Full-text search             | 9200      |
| MinIO         | S3-compatible object storage | 9000/9001 |
| Kong          | API Gateway                  | 8000/8001 |

### Observability Stack

| Component               | Purpose                    | Port      |
| ----------------------- | -------------------------- | --------- |
| OpenTelemetry Collector | Telemetry aggregation      | 4317/4318 |
| Prometheus              | Metrics storage            | 9090      |
| Grafana                 | Dashboards & visualization | 3030      |
| Jaeger                  | Distributed tracing        | 16686     |
| Loki                    | Log aggregation            | 3100      |

---

## Service URLs

### Core Platform

| Service     | URL                   | Description           |
| ----------- | --------------------- | --------------------- |
| API Gateway | http://localhost:8000 | Main API entry point  |
| Kong Admin  | http://localhost:8001 | Gateway configuration |

### Application Services

| Service            | URL                   | Health Check |
| ------------------ | --------------------- | ------------ |
| Auth Service       | http://localhost:3001 | `/health`    |
| Tenant Service     | http://localhost:3002 | `/health`    |
| Profile Service    | http://localhost:3003 | `/health`    |
| Content Service    | http://localhost:3010 | `/health`    |
| Assessment Service | http://localhost:3020 | `/health`    |
| Session Service    | http://localhost:3021 | `/health`    |
| AI Orchestrator    | http://localhost:3200 | `/health`    |

### Development Tools

| Tool            | URL                   | Credentials                    |
| --------------- | --------------------- | ------------------------------ |
| Adminer (DB)    | http://localhost:8081 | See .env                       |
| Redis Commander | http://localhost:8082 | -                              |
| MinIO Console   | http://localhost:9001 | aivo_minio / aivo_minio_secret |
| Mailhog         | http://localhost:8025 | -                              |

### Observability

| Tool       | URL                    | Credentials   |
| ---------- | ---------------------- | ------------- |
| Grafana    | http://localhost:3030  | admin / admin |
| Prometheus | http://localhost:9090  | -             |
| Jaeger     | http://localhost:16686 | -             |

---

## Development Workflows

### Starting the Platform

```bash
# Full platform startup
./scripts/start-dev.sh

# Minimal mode (core services only)
./scripts/start-dev.sh --minimal

# Force rebuild of images
./scripts/start-dev.sh --build
```

### Viewing Logs

```bash
# All logs
./scripts/logs.sh

# Specific service
./scripts/logs.sh auth-svc

# Service group
./scripts/logs.sh tier0

# Only errors
./scripts/logs.sh apps --errors --since 1h
```

### Health Checks

```bash
# Quick health check
./scripts/health-check.sh

# Verbose output
./scripts/health-check.sh --verbose
```

### Stopping the Platform

```bash
# Stop all containers
docker compose down

# Stop and remove volumes (reset all data)
docker compose down -v

# Stop specific service
docker compose stop auth-svc
```

### Running Tests

```bash
# Start test environment
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d

# Run integration tests
docker compose -f docker-compose.test.yml run test-runner
```

### Database Operations

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U aivo -d aivo_auth

# Run migrations for a service
docker compose exec auth-svc pnpm prisma migrate dev

# View all databases
docker compose exec postgres psql -U aivo -c "\l"
```

### Working with Individual Services

For faster iteration, you can run a specific service outside Docker:

```bash
# Stop the dockerized version
docker compose stop auth-svc

# Run locally (from project root)
cd services/auth-svc
pnpm dev
```

The service will connect to the dockerized infrastructure.

---

## Configuration

### Environment Variables

All configuration is in `docker/.env`. Key sections:

| Section       | Description                          |
| ------------- | ------------------------------------ |
| PostgreSQL    | Database credentials and connection  |
| Redis         | Cache configuration                  |
| NATS          | Messaging configuration              |
| MinIO         | Object storage credentials           |
| AI Providers  | API keys for OpenAI, Anthropic, etc. |
| Security      | JWT secrets, session keys            |
| Feature Flags | Enable/disable platform features     |

### Docker Compose Files

| File                          | Purpose                             |
| ----------------------------- | ----------------------------------- |
| `docker-compose.yml`          | Base configuration                  |
| `docker-compose.override.yml` | Development overrides (auto-loaded) |
| `docker-compose.test.yml`     | Test environment configuration      |

### Custom Configuration

To override settings without modifying tracked files:

```bash
# Create local overrides
cp docker-compose.override.yml docker-compose.local.yml

# Start with local overrides
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find what's using the port
netstat -ano | findstr :3001  # Windows
lsof -i :3001                  # Mac/Linux

# Kill the process or change the port in docker-compose.yml
```

#### Container Won't Start

```bash
# Check logs
docker compose logs auth-svc

# Check if dependencies are healthy
docker compose ps

# Restart the service
docker compose restart auth-svc
```

#### Database Connection Failed

```bash
# Verify postgres is running
docker compose ps postgres

# Check postgres logs
docker compose logs postgres

# Verify database exists
docker compose exec postgres psql -U aivo -c "\l"
```

#### Out of Memory

```bash
# Check Docker resource usage
docker stats

# Increase Docker memory allocation in Docker Desktop settings
# Or run in minimal mode
./scripts/start-dev.sh --minimal
```

#### NATS Connection Issues

```bash
# Check NATS is healthy
docker compose exec nats nats-server --help

# View NATS monitoring
curl http://localhost:8222/varz
```

### Reset Everything

```bash
# Nuclear option - reset all data
docker compose down -v
docker system prune -af
./scripts/start-dev.sh --build
```

### Getting Help

1. Check the service logs: `./scripts/logs.sh <service-name>`
2. Run health checks: `./scripts/health-check.sh --verbose`
3. Check the [docs/](../docs/) directory for service-specific documentation
4. Ask in #dev-help Slack channel

---

## FAQ

### How do I add a new service?

1. Add the service definition to `docker-compose.yml`
2. Add database to `scripts/init-multiple-dbs.sh`
3. Add route to `configs/kong.yml`
4. Add scrape config to `configs/prometheus.yml`
5. Update this documentation

### How do I update a dependency version?

1. Update the image tag in `docker-compose.yml`
2. Test locally with `docker compose pull && docker compose up -d`
3. Commit and create a PR

### How do I access the database from my IDE?

Use these connection settings:

- **Host**: localhost
- **Port**: 5432
- **Username**: aivo
- **Password**: aivo_dev_password
- **Database**: aivo\_<service_name>

### How do I test with production-like data?

```bash
# Seed the database
./scripts/start-dev.sh  # includes seeding by default

# Or run seeding manually
docker compose exec auth-svc pnpm prisma db seed
```

### How do I profile a service?

1. Access Grafana at http://localhost:3030
2. Navigate to the pre-configured dashboards
3. For tracing, use Jaeger at http://localhost:16686

---

## Next Steps

- [Database Setup Guide](./database-setup.md)
- [AI Orchestrator Documentation](./ai/README.md)
- [Observability Guide](./observability.md)
- [API Documentation](http://localhost:8000/docs)
