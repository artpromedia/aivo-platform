# Python API Gateway

Python-based API gateway for routing and aggregating requests to backend services.

## Features

- **Request Routing**: Route requests to appropriate backend services
- **Authentication**: JWT validation and authorization
- **Rate Limiting**: Per-tenant and per-user rate limits
- **Request Aggregation**: Combine multiple service calls

## API Endpoints

### Health

- `GET /health` - Health check
- `GET /health/services` - Backend service health

### Gateway

- `ANY /api/v1/*` - Proxied routes to backend services

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8080
```

## Environment Variables

| Variable             | Description             |
| -------------------- | ----------------------- |
| JWT_SECRET           | JWT signing secret      |
| REDIS_URL            | Redis for rate limiting |
| SERVICE_REGISTRY_URL | Service discovery URL   |
