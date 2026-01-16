# AIVO Audit Service

Immutable audit logging service for compliance and security.

## Overview

The audit service provides:

- **Immutable Audit Logs**: Append-only storage with blockchain-style chain integrity
- **Multi-tenant Support**: Tenant isolation for all audit data
- **Real-time Event Ingestion**: NATS-based event consumption from other services
- **Query API**: Flexible querying with filtering, pagination, and search
- **Export Functionality**: Export audit logs for compliance and e-discovery
- **Policy Management**: Configurable audit policies per tenant
- **Alert System**: Automatic alerts based on severity and event type

## API Endpoints

### Ingest

```
POST /audit/ingest              - Ingest a single audit log entry
POST /audit/ingest/batch        - Batch ingest up to 1000 entries
```

### Query

```
GET  /audit/logs                - Query audit logs with filters
GET  /audit/logs/:id            - Get a single audit log entry
GET  /audit/stats               - Get audit statistics
GET  /audit/integrity           - Verify chain integrity
```

### Exports

```
POST /audit/exports             - Create an export request
GET  /audit/exports             - List exports
GET  /audit/exports/:id         - Get export status/details
```

### Policies

```
POST   /audit/policies          - Create a policy
GET    /audit/policies          - List policies
GET    /audit/policies/:id      - Get a policy
PUT    /audit/policies/:id      - Update a policy
DELETE /audit/policies/:id      - Delete a policy
```

### Alerts

```
GET  /audit/alerts              - List alerts
GET  /audit/alerts/counts       - Get alert counts by status
GET  /audit/alerts/:id          - Get an alert
POST /audit/alerts/:id/acknowledge - Acknowledge an alert
POST /audit/alerts/:id/resolve  - Resolve an alert
```

## Event Categories

- `AUTHENTICATION` - Login, logout, password changes, MFA
- `AUTHORIZATION` - Permission changes, role assignments
- `DATA_ACCESS` - Read/write operations on sensitive data
- `DATA_MODIFICATION` - Create, update, delete operations
- `CONFIGURATION` - System/tenant configuration changes
- `SECURITY` - Security events, violations, threats
- `COMPLIANCE` - Compliance-related actions
- `SYSTEM` - System events, maintenance
- `USER_ACTION` - User-initiated actions
- `API_ACCESS` - API calls, integrations

## Severity Levels

- `DEBUG` - Detailed debugging information
- `INFO` - Normal operational events
- `NOTICE` - Notable but normal events
- `WARNING` - Warning conditions
- `ERROR` - Error conditions
- `CRITICAL` - Critical conditions
- `ALERT` - Action must be taken immediately
- `EMERGENCY` - System is unusable

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate:dev

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Environment Variables

See `.env.example` for all configuration options.

## Architecture

```
audit-svc/
├── src/
│   ├── index.ts          # Entry point
│   ├── app.ts            # Fastify app setup
│   ├── config.ts         # Configuration
│   ├── prisma.ts         # Database client
│   ├── routes/           # API routes
│   │   ├── ingest.ts     # Ingest endpoints
│   │   ├── audit.ts      # Query endpoints
│   │   ├── export.ts     # Export endpoints
│   │   ├── policy.ts     # Policy endpoints
│   │   └── alert.ts      # Alert endpoints
│   ├── services/         # Business logic
│   ├── repositories/     # Data access
│   ├── consumers/        # NATS event consumers
│   ├── middleware/       # Auth middleware
│   ├── lib/              # Utilities (checksum, etc.)
│   └── types/            # TypeScript types
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
└── test/                 # Tests
```

## Compliance

The audit service is designed to meet compliance requirements for:

- **FERPA** - Family Educational Rights and Privacy Act
- **COPPA** - Children's Online Privacy Protection Act
- **GDPR** - General Data Protection Regulation
- **SOC 2** - Service Organization Control 2

Key compliance features:

- Immutable, append-only logs
- Chain integrity verification
- Configurable retention policies
- Export capabilities for audits
- Access logging (who viewed the audit logs)
