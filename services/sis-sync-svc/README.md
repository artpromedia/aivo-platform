# SIS Rostering Sync Service

The SIS Sync Service provides automated class roster synchronization from Student Information Systems (SIS) to Aivo. It supports multiple SIS providers and handles the complete ETL pipeline for schools, classes, users, and enrollments.

## Overview

### Supported Providers

| Provider | Type | Description |
|----------|------|-------------|
| **Clever** | API | Integration with Clever Data API v3.0 |
| **ClassLink** | API | ClassLink OneRoster-compatible Roster Server |
| **OneRoster API** | API | Any OneRoster 1.1 compliant REST API |
| **OneRoster CSV** | SFTP | OneRoster 1.1 CSV file import via SFTP |

### Key Features

- **Automatic Scheduling**: Daily syncs via cron expressions
- **Manual Triggers**: "Run sync now" functionality
- **Idempotent Operations**: Safe to re-run without duplicating data
- **Soft Deletes**: Entities removed from SIS are deactivated, not deleted
- **Matching Logic**: Email/external ID matching for user reconciliation
- **Audit Trail**: Complete sync history with statistics

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         District Admin UI                        │
│                    /integrations/sis                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       sis-sync-svc                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Scheduler  │  │ Sync Engine │  │ Transformer │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────────────────────────────────────────┐            │
│  │              Provider Connectors                 │            │
│  │  ┌────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐ │            │
│  │  │ Clever │ │ClassLink │ │OneRoster│ │OneRoster│ │            │
│  │  │  API   │ │   API    │ │   API   │ │   CSV  │ │            │
│  │  └────────┘ └──────────┘ └─────────┘ └────────┘ │            │
│  └─────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PostgreSQL                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │sis_providers│  │sis_sync_runs│  │sis_raw_*   │              │
│  │             │  │             │  │  (staging) │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### SIS Provider Configuration

```prisma
model SisProvider {
  id           String          @id
  tenantId     String          // District tenant
  providerType SisProviderType // CLEVER, CLASSLINK, ONEROSTER_API, ONEROSTER_CSV
  name         String          // Display name
  configJson   String          // Provider-specific config (encrypted)
  enabled      Boolean
  syncSchedule String?         // Cron expression
  lastSyncAt   DateTime?
}
```

### Sync Run Tracking

```prisma
model SisSyncRun {
  id          String     @id
  providerId  String
  status      SyncStatus // PENDING, IN_PROGRESS, SUCCESS, PARTIAL, FAILURE
  startedAt   DateTime
  completedAt DateTime?
  statsJson   String?    // { schools: {created, updated, deactivated}, ... }
  errorMessage String?
  isManual    Boolean
}
```

### Staging Tables

- `sis_raw_schools` - Raw school data from SIS
- `sis_raw_classes` - Raw class/section data
- `sis_raw_users` - Raw user data (teachers, students)
- `sis_raw_enrollments` - Raw enrollment data

## API Reference

### Provider Management

#### List Providers
```
GET /api/v1/tenants/:tenantId/providers
```

#### Create Provider
```
POST /api/v1/providers
{
  "tenantId": "district-123",
  "providerType": "CLEVER",
  "name": "Clever Integration",
  "config": {
    "clientId": "...",
    "clientSecret": "...",
    "districtId": "..."
  },
  "syncSchedule": "0 2 * * *"
}
```

#### Update Provider
```
PATCH /api/v1/providers/:providerId
{
  "enabled": true,
  "syncSchedule": "0 6 * * 1-5"
}
```

#### Delete Provider
```
DELETE /api/v1/providers/:providerId
```

### Sync Operations

#### Trigger Manual Sync
```
POST /api/v1/providers/:providerId/sync
```

#### Cancel Running Sync
```
POST /api/v1/providers/:providerId/sync/cancel
```

#### Get Sync Status
```
GET /api/v1/providers/:providerId/sync/status

Response:
{
  "isRunning": false,
  "lastSync": "2024-01-15T02:00:00Z",
  "lastStatus": "SUCCESS"
}
```

#### List Sync History
```
GET /api/v1/providers/:providerId/runs?limit=20&offset=0
```

#### Test Connection
```
POST /api/v1/providers/:providerId/test

Response:
{
  "success": true,
  "message": "Successfully connected to Clever"
}
```

### Schedule Presets

| Preset | Cron Expression | Description |
|--------|----------------|-------------|
| `daily` | `0 2 * * *` | Every day at 2 AM |
| `twice-daily` | `0 2,14 * * *` | 2 AM and 2 PM |
| `every-6-hours` | `0 */6 * * *` | Every 6 hours |
| `weekdays` | `0 6 * * 1-5` | Weekdays at 6 AM |
| `hourly` | `0 * * * *` | Every hour |
| `weekly` | `0 0 * * 0` | Sunday at midnight |

## Provider Configuration

### Clever

```json
{
  "clientId": "your-clever-client-id",
  "clientSecret": "your-clever-client-secret",
  "districtId": "your-clever-district-id",
  "accessToken": "bearer-token-from-oauth"
}
```

### ClassLink

```json
{
  "clientId": "your-classlink-client-id",
  "clientSecret": "your-classlink-client-secret",
  "tenantId": "your-classlink-tenant-id"
}
```

### OneRoster API

```json
{
  "baseUrl": "https://oneroster.example.com/ims/oneroster/v1p1",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret"
}
```

### OneRoster CSV (SFTP)

```json
{
  "sftp": {
    "host": "sftp.example.com",
    "port": 22,
    "username": "sis-sync",
    "privateKeyPath": "/secrets/sftp-key"
  },
  "remotePath": "/exports/oneroster"
}
```

## Sync Process

### 1. Extract Phase

The sync engine fetches data from the SIS provider:

1. **Schools/Orgs**: District schools with identifiers
2. **Classes/Sections**: Course sections with terms
3. **Users**: Teachers and students with roles
4. **Enrollments**: Student-class and teacher-class assignments

### 2. Transform Phase (Staging)

Raw data is stored in staging tables (`sis_raw_*`) with:

- External IDs for matching
- Raw JSON for debugging
- Normalized common fields
- Processing flags

### 3. Load Phase (Upsert)

Staged data is transformed into Aivo entities:

1. **Match existing entities** by external ID or email
2. **Create new entities** if not found
3. **Update existing entities** with SIS data
4. **Mark missing entities** as inactive (soft delete)

### Matching Logic

For users, matching is performed in this order:

1. **External ID**: If user was previously synced
2. **Email**: Match by email address
3. **Student Number**: For students without email
4. **Create**: If no match and creation is enabled

## District Admin UI

The District Admin portal includes a SIS Integration page at `/integrations/sis`:

### Features

- **Add Integration**: Configure new SIS provider
- **Test Connection**: Verify credentials and connectivity
- **Run Sync Now**: Trigger manual sync
- **View History**: See past sync runs with statistics
- **Configure Schedule**: Set automatic sync schedule

### Screenshots

1. **Integration List**: View all configured SIS integrations
2. **Provider Details**: Status, last sync, schedule
3. **Sync History**: Table of recent sync runs with results
4. **Add Provider Modal**: Step-by-step configuration

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sis_sync

# Server
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
NODE_ENV=production

# Scheduler
MAX_CONCURRENT_SYNCS=2
SYNC_LOCK_TIMEOUT=1800000  # 30 minutes
```

## Development

### Setup

```bash
cd services/sis-sync-svc
pnpm install
pnpm db:generate
pnpm db:migrate
```

### Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

### Testing

```bash
pnpm test
```

## Security Considerations

1. **Credentials Storage**: Provider configs are stored encrypted at rest
2. **Access Control**: Only DISTRICT_ADMIN and PLATFORM_ADMIN roles can access
3. **Rate Limiting**: API calls to SIS providers respect rate limits
4. **Audit Logging**: All sync operations are logged with timestamps

## Troubleshooting

### Common Issues

**Sync fails with "Provider disabled"**
- Enable the provider in the District Admin UI

**Connection test fails**
- Verify credentials are correct
- Check network connectivity to SIS provider
- Ensure OAuth tokens haven't expired

**Users not being matched**
- Verify email addresses match between systems
- Check that external IDs are being synced correctly

**Sync takes too long**
- Large districts may have thousands of users
- Consider reducing sync frequency
- Check for network latency to SIS provider

### Debug Mode

Set `LOG_LEVEL=debug` for verbose logging during sync operations.
