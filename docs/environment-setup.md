# AIVO Platform Environment Setup Guide

## Overview

This guide explains how to configure the AIVO platform for different environments (development, staging, production).

## Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/artpromedia/aivo-platform.git
cd aivo-platform

# 2. Run the setup script
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh
```

The setup script will:

1. Check prerequisites (Docker, Node.js, pnpm)
2. Generate development secrets
3. Create combined `.env` file
4. Install dependencies
5. Start infrastructure services
6. Run database migrations

## Environment Files

### Directory Structure

```
config/
├── environments/
│   ├── base.env              # Shared configuration (all environments)
│   ├── development.env       # Local development settings
│   ├── staging.env           # Staging environment
│   └── production.env.example # Production template (no secrets)
└── secrets/
    ├── .gitignore            # Prevents committing secrets
    ├── README.md             # Security guidelines
    ├── jwt-private.pem       # Generated JWT private key
    ├── jwt-public.pem        # Generated JWT public key
    └── local.env             # Generated development secrets
```

### Configuration Priority

Environment variables are loaded in this order (later overrides earlier):

1. **Default values** in application code
2. **base.env** - Shared across all environments
3. **{environment}.env** - Environment-specific settings
4. **secrets/local.env** - Local secrets (development only)
5. **Kubernetes Secrets** - Runtime secrets (staging/production)
6. **Process environment** - Runtime overrides

## Required Environment Variables

### Core Infrastructure

| Variable       | Description                  | Required | Example                                |
| -------------- | ---------------------------- | -------- | -------------------------------------- |
| `NODE_ENV`     | Environment name             | Yes      | `development`, `staging`, `production` |
| `DATABASE_URL` | PostgreSQL connection string | Yes      | `postgresql://user:pass@host:5432/db`  |
| `REDIS_URL`    | Redis connection string      | Yes      | `redis://host:6379`                    |
| `NATS_URL`     | NATS server URL              | Yes      | `nats://host:4222`                     |

### Authentication

| Variable                | Description             | Required          |
| ----------------------- | ----------------------- | ----------------- |
| `JWT_ISSUER`            | JWT token issuer        | Yes               |
| `JWT_AUDIENCE`          | JWT token audience      | Yes               |
| `JWT_PRIVATE_KEY_PATH`  | Path to JWT private key | Yes               |
| `JWT_PUBLIC_KEY_PATH`   | Path to JWT public key  | Yes               |
| `JWT_ACCESS_TOKEN_TTL`  | Access token lifetime   | No (default: 15m) |
| `JWT_REFRESH_TOKEN_TTL` | Refresh token lifetime  | No (default: 7d)  |

### External Services

| Variable            | Description       | Required        |
| ------------------- | ----------------- | --------------- |
| `OPENAI_API_KEY`    | OpenAI API key    | For AI features |
| `SENDGRID_API_KEY`  | SendGrid API key  | For email       |
| `STRIPE_SECRET_KEY` | Stripe secret key | For billing     |

## Secrets Management

### Local Development

Secrets are generated automatically by `scripts/generate-secrets.sh`:

```bash
# Generate all development secrets
./scripts/generate-secrets.sh

# This creates:
# - config/secrets/jwt-private.pem (RSA 4096-bit key)
# - config/secrets/jwt-public.pem
# - config/secrets/local.env (database passwords, API keys, etc.)
```

### Staging Environment

Secrets are stored in Kubernetes Secrets:

```bash
# Apply staging secrets
kubectl apply -f infra/k8s/secrets/staging-secrets.yaml

# View secrets (base64 encoded)
kubectl get secret database-credentials -n aivo-staging -o yaml
```

### Production Environment

Production uses External Secrets Operator with Google Secret Manager:

```bash
# Create secret in Google Secret Manager
gcloud secrets create aivo-prod-database-url \
  --replication-policy="automatic"

echo -n "postgresql://..." | \
  gcloud secrets versions add aivo-prod-database-url --data-file=-

# External Secrets Operator syncs to Kubernetes
kubectl get externalsecret -n aivo-prod
```

## Service-Specific Configuration

Each service has its own `.env.example` file with service-specific settings:

```bash
# Copy template for a service
cp services/auth-svc/.env.example services/auth-svc/.env

# Edit with service-specific values
vim services/auth-svc/.env
```

### Key Service Variables

| Service         | Key Variables                                            |
| --------------- | -------------------------------------------------------- |
| auth-svc        | `BCRYPT_ROUNDS`, `MAX_LOGIN_ATTEMPTS`, OAuth credentials |
| content-svc     | `MAX_CONTENT_SIZE_MB`, CDN settings                      |
| ai-orchestrator | `OPENAI_API_KEY`, token limits, safety settings          |
| billing-svc     | Stripe keys, pricing configuration                       |
| analytics-svc   | Data retention, aggregation settings                     |

## Feature Flags

Feature flags control functionality across environments:

```env
# Enable/disable features
FEATURE_AI_TUTOR=true
FEATURE_GAMIFICATION=true
FEATURE_MARKETPLACE=true
FEATURE_REAL_TIME_COLLAB=true
FEATURE_HOMEWORK_HELPER=true
FEATURE_BASELINE_ASSESSMENT=true
```

## Validation

Validate your environment configuration:

```bash
# Run validation script
./scripts/validate-env.sh

# Check specific service
NODE_ENV=development ./scripts/validate-env.sh
```

The validation script checks:

- Required environment variables
- File existence (JWT keys)
- File permissions
- URL formats
- Service connectivity (in development)

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:port/database

# Test connection
psql "$DATABASE_URL" -c "SELECT 1"

# Check if database is running
docker ps | grep postgres
```

#### JWT Validation Failed

```bash
# Check key files exist
ls -la config/secrets/jwt-*.pem

# Verify key permissions
stat config/secrets/jwt-private.pem
# Should be 600 (-rw-------)

# Regenerate if needed
rm config/secrets/jwt-*.pem
./scripts/generate-secrets.sh
```

#### Redis Connection Failed

```bash
# Check REDIS_URL format
echo $REDIS_URL
# Should be: redis://host:port or rediss://host:port for TLS

# Test connection
redis-cli -u "$REDIS_URL" ping
```

#### Service Can't Find Environment Variables

```bash
# Ensure .env is loaded
source .env

# Or use dotenv in Node.js
# Add to service entry point:
# import 'dotenv/config';
```

### Debug Mode

Enable verbose logging:

```env
# Development
LOG_LEVEL=debug
DEBUG=aivo:*
PRISMA_QUERY_LOG=true
```

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use different secrets** per environment
3. **Rotate secrets regularly** (see ROTATION.md)
4. **Limit secret access** to necessary services
5. **Audit secret access** in production
6. **Use strong passwords** (32+ characters for database)
7. **Enable TLS** for all production connections

## Environment Comparison

| Setting        | Development | Staging     | Production |
| -------------- | ----------- | ----------- | ---------- |
| LOG_LEVEL      | debug       | info        | warn       |
| DATABASE_SSL   | false       | true        | true       |
| REDIS_TLS      | false       | true        | true       |
| Trace Sampling | 100%        | 10%         | 1%         |
| Rate Limits    | 100/min     | 200/min     | 100/min    |
| Feature Flags  | All enabled | All enabled | Controlled |

## Additional Resources

- [Secret Rotation Procedures](../infra/k8s/secrets/ROTATION.md)
- [Database Setup Guide](./database-setup.md)
- [Observability Guide](./observability.md)
- [Security Guidelines](./security/README.md)
