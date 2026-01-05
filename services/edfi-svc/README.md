# Ed-Fi Integration Service (@aivo/edfi-svc)

The Ed-Fi Integration Service enables compliance with state education agency reporting requirements by implementing the Ed-Fi Data Standard for data interchange.

## Overview

Ed-Fi (Education Data Framework and Interoperability) is a widely adopted data standard in K-12 education, required by many state education agencies (SEAs) for:

- State longitudinal data systems (SLDS)
- Federal reporting (EDEN, EdFacts)
- Assessment result submission
- Student enrollment and attendance reporting

## Features

### Supported Ed-Fi Resources

| Resource                       | Direction | Description                          |
| ------------------------------ | --------- | ------------------------------------ |
| **Students**                   | Export    | Student demographics and identifiers |
| **StudentSchoolAssociations**  | Export    | School enrollment records            |
| **StudentSectionAssociations** | Export    | Class enrollment records             |
| **Staff**                      | Export    | Teacher/staff information            |
| **StaffSectionAssociations**   | Export    | Teacher class assignments            |
| **Sections**                   | Export    | Course sections                      |
| **Courses**                    | Export    | Course catalog                       |
| **Schools**                    | Export    | School information                   |
| **LocalEducationAgencies**     | Export    | District information                 |
| **StudentAssessments**         | Export    | Assessment results                   |
| **Grades**                     | Export    | Student grades                       |
| **Attendances**                | Export    | Daily attendance records             |
| **LearningStandards**          | Import    | State standards alignment            |
| **Interventions**              | Export    | Student intervention data            |

### Ed-Fi API Versions

- **Ed-Fi ODS/API v5.3** (current)
- **Ed-Fi ODS/API v6.1** (supported)
- **Ed-Fi ODS/API v7.0** (beta support)

### Key Capabilities

- **Scheduled Exports**: Automated daily/weekly data submissions
- **Delta Sync**: Only send changed records (optimized payloads)
- **Bulk Operations**: Ed-Fi Bulk API support for large datasets
- **Error Recovery**: Automatic retry with exponential backoff
- **Validation**: Pre-flight validation against Ed-Fi schemas
- **Audit Trail**: Complete history of all submissions

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    State Education Agency                        │
│                      Ed-Fi ODS/API                               │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │ HTTPS + OAuth 2.0
                                │
┌─────────────────────────────────────────────────────────────────┐
│                         edfi-svc                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Export    │  │  Transform  │  │   Submit    │              │
│  │   Engine    │  │   Engine    │  │   Client    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────────────────────────────────────────┐            │
│  │              Ed-Fi Connectors                    │            │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │            │
│  │  │  v5.3    │ │  v6.1    │ │  v7.0    │        │            │
│  │  └──────────┘ └──────────┘ └──────────┘        │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                  │
│  ┌─────────────────────────────────────────────────┐            │
│  │              PostgreSQL Database                 │            │
│  │  (edfi_configs, edfi_exports, edfi_submissions) │            │
│  └─────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │
┌─────────────────────────────────────────────────────────────────┐
│                     Aivo Core Services                           │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│   │ Learner  │  │ Session  │  │Assessment│  │ Tenant   │       │
│   │   Svc    │  │   Svc    │  │   Svc    │  │   Svc    │       │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### Ed-Fi Configuration

```prisma
model EdfiConfig {
  id              String          @id @default(uuid())
  tenantId        String          @db.Uuid
  name            String          // "Texas TEA" or "California CDE"
  apiVersion      EdfiApiVersion  // V5_3, V6_1, V7_0
  baseUrl         String          // https://api.tea.texas.gov/v5.3
  clientId        String          // OAuth client ID
  clientSecret    String          // Encrypted
  schoolYear      Int             // 2024
  enabled         Boolean         @default(true)
  exportSchedule  String?         // Cron expression
  lastExportAt    DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}
```

### Export Run Tracking

```prisma
model EdfiExportRun {
  id              String          @id @default(uuid())
  configId        String          @db.Uuid
  status          ExportStatus    // PENDING, RUNNING, SUCCESS, PARTIAL, FAILED
  resourceType    String          // "students", "assessments", etc.
  totalRecords    Int
  successCount    Int             @default(0)
  errorCount      Int             @default(0)
  startedAt       DateTime
  completedAt     DateTime?
  errorLog        Json?
  createdAt       DateTime        @default(now())
}
```

## API Reference

### Configuration Management

#### List Configurations

```http
GET /api/v1/tenants/:tenantId/edfi/configs
```

#### Create Configuration

```http
POST /api/v1/edfi/configs
Content-Type: application/json

{
  "tenantId": "district-123",
  "name": "Texas TEA Integration",
  "apiVersion": "V6_1",
  "baseUrl": "https://api.tea.texas.gov/v6.1",
  "clientId": "aivo-district-123",
  "clientSecret": "encrypted-secret",
  "schoolYear": 2024,
  "exportSchedule": "0 3 * * *"
}
```

#### Test Connection

```http
POST /api/v1/edfi/configs/:configId/test

Response:
{
  "success": true,
  "message": "Successfully connected to Ed-Fi ODS/API v6.1",
  "serverInfo": {
    "version": "6.1.0",
    "dataModel": "4.0.0"
  }
}
```

### Export Operations

#### Trigger Manual Export

```http
POST /api/v1/edfi/configs/:configId/export
Content-Type: application/json

{
  "resourceTypes": ["students", "studentSchoolAssociations"],
  "fullSync": false
}
```

#### Get Export Status

```http
GET /api/v1/edfi/exports/:exportId

Response:
{
  "id": "export-123",
  "status": "RUNNING",
  "progress": {
    "students": { "total": 1500, "sent": 750, "errors": 2 },
    "studentSchoolAssociations": { "total": 1500, "sent": 0, "errors": 0 }
  }
}
```

#### List Export History

```http
GET /api/v1/edfi/configs/:configId/exports?limit=20
```

### Validation

#### Validate Data Before Export

```http
POST /api/v1/edfi/configs/:configId/validate
Content-Type: application/json

{
  "resourceTypes": ["students", "assessments"]
}

Response:
{
  "valid": false,
  "errors": [
    {
      "resourceType": "students",
      "count": 5,
      "samples": [
        { "learnerId": "123", "field": "birthDate", "error": "Required field missing" }
      ]
    }
  ]
}
```

## State-Specific Configurations

### Texas (TEA)

```json
{
  "stateCode": "TX",
  "apiVersion": "V6_1",
  "baseUrl": "https://api-staging.tea.texas.gov/v6.1",
  "extensions": ["tx-teds"],
  "requiredResources": ["students", "studentSchoolAssociations", "grades", "attendance"]
}
```

### California (CDE)

```json
{
  "stateCode": "CA",
  "apiVersion": "V5_3",
  "baseUrl": "https://calpads.ed.gov/edfi/v5.3",
  "extensions": ["ca-calpads"],
  "requiredResources": ["students", "staff", "courses", "sections"]
}
```

### Florida (FLDOE)

```json
{
  "stateCode": "FL",
  "apiVersion": "V6_1",
  "baseUrl": "https://edfi.fldoe.org/api/v6.1",
  "extensions": [],
  "requiredResources": ["students", "studentSchoolAssociations", "assessments"]
}
```

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://aivo:aivo@localhost:5432/edfi_svc"

# Server
PORT=3010
NODE_ENV=development
LOG_LEVEL=info

# Export Settings
EXPORT_BATCH_SIZE=100
EXPORT_MAX_RETRIES=3
EXPORT_RETRY_DELAY_MS=5000

# Security
ENCRYPTION_KEY="..." # For encrypting client secrets
```

## Development

### Setup

```bash
cd services/edfi-svc
pnpm install
pnpm db:generate
pnpm db:migrate
```

### Running

```bash
# Development
pnpm dev

# Production
pnpm build && pnpm start
```

### Testing

```bash
pnpm test
pnpm test:e2e
```

## Ed-Fi Resource Mapping

### Student → Ed-Fi Student

| Aivo Field   | Ed-Fi Field                                |
| ------------ | ------------------------------------------ |
| `id`         | `studentUniqueId`                          |
| `firstName`  | `firstName`                                |
| `lastName`   | `lastSurname`                              |
| `birthDate`  | `birthDate`                                |
| `gradeLevel` | `gradeLevelDescriptor`                     |
| `email`      | `electronicMails[0].electronicMailAddress` |

### Assessment → Ed-Fi StudentAssessment

| Aivo Field     | Ed-Fi Field                                |
| -------------- | ------------------------------------------ |
| `learnerId`    | `studentReference.studentUniqueId`         |
| `assessmentId` | `assessmentReference.assessmentIdentifier` |
| `score`        | `scoreResults[0].result`                   |
| `completedAt`  | `administrationDate`                       |

## Security

1. **OAuth 2.0**: Client credentials flow for API authentication
2. **TLS 1.3**: All communication encrypted in transit
3. **Secret Encryption**: Client secrets encrypted at rest using AES-256
4. **Audit Logging**: All export operations logged with timestamps
5. **Access Control**: Only DISTRICT_ADMIN and PLATFORM_ADMIN roles

## Compliance

This service helps districts comply with:

- **FERPA**: Student data privacy protections
- **State Reporting**: Mandatory data submissions to SEAs
- **EdFacts**: Federal education data collection
- **CEDS**: Common Education Data Standards alignment

## License

Proprietary - Aivo Inc.
