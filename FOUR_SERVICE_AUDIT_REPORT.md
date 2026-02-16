# Comprehensive Audit Report: sync-svc, sis-sync-svc, edfi-svc, integration-svc

> Generated from full source code review of all four services.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Service 1: sync-svc](#2-service-1-sync-svc)
3. [Service 2: sis-sync-svc](#3-service-2-sis-sync-svc)
4. [Service 3: edfi-svc](#4-service-3-edfi-svc)
5. [Service 4: integration-svc](#5-service-4-integration-svc)
6. [Overlap Analysis: sync-svc ↔ sis-sync-svc](#6-overlap-analysis-sync-svc--sis-sync-svc)
7. [Overlap Analysis: edfi-svc ↔ integration-svc](#7-overlap-analysis-edfi-svc--integration-svc)
8. [Unique Logic Inventory](#8-unique-logic-inventory)
9. [Merge Recommendations](#9-merge-recommendations)

---

## 1. Executive Summary

| Property | sync-svc | sis-sync-svc | edfi-svc | integration-svc |
|---|---|---|---|---|
| **Package name** | `@aivo/sync-svc` | `@aivo/sis-sync-svc` | `@aivo/edfi-svc` | `@aivo/integration-svc` |
| **Version** | 0.1.0 | 0.1.0 | 1.0.0 | 0.1.0 |
| **Port** | 3080 | (env) | 3000 | 3009 |
| **Disposition** | `merge-source` → sis-sync-svc | `keep` | `merge-source` → integration-svc | `merge-target` (absorbs edfi-svc) |
| **Phase** | 1 | 1 | 1 | 1 |
| **Source files** | 12 | ~37 | 13 | 19 |
| **Prisma models** | 12 | 27 | 8 | 31 |
| **Framework** | Fastify 4.29 | Fastify 4.28 | Fastify 4.29 | Fastify 4.28 |
| **ORM** | Prisma 5.22 | Prisma 5.22 | Prisma 5.22 | Prisma 5.22 |
| **Primary purpose** | Client device sync (offline-first) | SIS roster ingestion (ETL) | Ed-Fi state reporting export | Partner APIs, webhooks, Google Classroom |

### Key Differentiators

- **sync-svc**: Real-time bidirectional device ↔ server data sync with WebSocket, conflict resolution, Redis pub/sub
- **sis-sync-svc**: Multi-provider SIS roster ingestion pipeline (Clever, ClassLink, OneRoster, Google Workspace, Microsoft Entra, PowerSchool, Infinite Campus, Ed-Fi)
- **edfi-svc**: Outbound data export to Ed-Fi ODS/API state reporting endpoints (students, school associations, section associations)
- **integration-svc**: Inbound/outbound partner integration platform — API keys, webhook dispatch, Google Classroom assignment sync & grade passback

---

## 2. Service 1: sync-svc

### 2.1 Package.json

```
Name:    @aivo/sync-svc
Version: 0.1.0
Port:    3080
```

**Dependencies:**
| Package | Version | Purpose |
|---|---|---|
| fastify | ^4.29.0 | HTTP framework |
| @fastify/cors | ^10.0.2 | CORS |
| @fastify/rate-limit | ^10.2.1 | Rate limiting |
| @fastify/websocket | ^11.0.2 | WebSocket support |
| @prisma/client | 5.22.0 | ORM |
| bullmq | ^5.39.0 | Job queue (declared, not used in current code) |
| ioredis | ^5.6.0 | Redis client for pub/sub |
| jose | ^6.0.11 | JWT verification |
| pino | ^9.6.0 | Logging |
| ws | ^8.18.0 | WebSocket library |
| zod | ^3.23.8 | Schema validation |
| @aivo/ts-api-utils | workspace:* | Shared utilities |
| @aivo/events | workspace:* | Event library |
| @aivo/ts-observability | workspace:* | Observability |
| @aivo/ts-rbac | workspace:* | RBAC |
| @aivo/ts-resilience | workspace:* | Resilience patterns |

**Scripts:**
- `dev`: tsx watch src/index.ts
- `build`: tsc
- `start`: node dist/index.js
- `test`: vitest run
- `test:watch`: vitest

**Disposition:** `merge-source` into `sis-sync-svc` (Phase 1)

### 2.2 Prisma Schema (247 lines)

**Generator:** `prisma-client-js` → `../generated/prisma-client`

**Models (12):**

| Model | Key Fields | Purpose |
|---|---|---|
| `SyncConflict` | tenantId, userId, entityType, entityId, serverVersion, clientVersion, resolution, status, deviceId | Tracks version conflicts between client/server |
| `SyncHistory` | tenantId, userId, operation, entityType, entityId, deviceId, version, syncedAt | Audit log of sync operations |
| `DeviceSyncState` | tenantId, userId, deviceId, lastSyncTimestamp, entityVersions (Json) | Per-device sync cursor tracking |
| `SyncLearningSession` | tenantId, userId, data (Json), version, deviceId, syncedAt, deletedAt | Syncable learning session data |
| `SyncResponse` | (same pattern) | Syncable response data |
| `SyncProgress` | (same pattern) | Syncable progress data |
| `SyncSkillMastery` | (same pattern) | Syncable skill mastery data |
| `SyncSettings` | (same pattern) | Syncable user settings |
| `SyncBookmark` | (same pattern) | Syncable bookmarks |
| `SyncNote` | (same pattern) | Syncable notes |
| `OfflineContent` | tenantId, contentId, contentType, data (Json), version, size | Cached content for offline use |
| `ContentVersion` | tenantId, contentId, version, checksum, size, updatedBy | Content versioning |

All syncable entities share a common pattern: `id, tenantId, userId, data (Json), version (Int), deviceId, createdAt, updatedAt, syncedAt, deletedAt`.

### 2.3 Source Files

#### `src/index.ts` — Main Entry
- Creates Fastify server with CORS and logger
- Registers auth middleware, database plugin, Redis-backed SyncEventEmitter
- Mounts sync routes at `/api/v1/sync`
- Optionally enables WebSocket handler (via `ENABLE_WEBSOCKET_SYNC`)
- Health check at `/health`

#### `src/config.ts` — Configuration
| Variable | Default | Description |
|---|---|---|
| PORT | 3080 | Server port |
| HOST | 0.0.0.0 | Bind address |
| DATABASE_URL | (required) | PostgreSQL connection |
| REDIS_URL | (required) | Redis for pub/sub & events |
| JWT_SECRET | (required) | JWT signing secret |
| JWT_ISSUER | aivo | JWT issuer |
| SYNC_BATCH_SIZE | 100 | Operations per batch |
| SYNC_MAX_CONFLICTS | 50 | Max stored conflicts |
| SYNC_CONFLICT_TTL_DAYS | 30 | Conflict expiry |
| SYNC_HISTORY_RETENTION_DAYS | 90 | History retention |
| WS_HEARTBEAT_INTERVAL_MS | 30000 | WebSocket heartbeat |
| WS_CLIENT_TIMEOUT_MS | 90000 | WebSocket timeout |
| ENABLE_DELTA_SYNC | true | Delta sync feature flag |
| ENABLE_AUTO_CONFLICT_RESOLUTION | true | Auto-resolve conflicts |
| ENABLE_WEBSOCKET_SYNC | false | WebSocket support |

#### `src/types.ts` (202 lines) — Core Types

**Enums:**
- `SyncOperationType`: CREATE, UPDATE, DELETE
- `EntityType`: learning_session, response, progress, skill_mastery, settings, bookmark, note
- `ConflictResolutionStrategy`: server_wins, client_wins, last_write_wins, merge, manual
- `ConflictStatus`: pending, resolved, auto_resolved, expired

**Zod Schemas:**
- `SyncOperationSchema`: entityType, entityId, operation, data, version, deviceId, timestamp
- `PushChangesRequestSchema`: operations[], lastSyncTimestamp
- `PullChangesRequestSchema`: entityTypes[], sinceTimestamp, deviceId, includeDeleted
- `DeltaRequestSchema`: entityType, sinceVersion
- `ConflictResolutionRequestSchema`: strategy, customResolution?

**WebSocket Types:**
- `WebSocketMessageType`: SUBSCRIBE, UNSUBSCRIBE, PUSH_CHANGE, PULL_CHANGES, CHANGE_NOTIFICATION, CONFLICT_NOTIFICATION, RESOLVE_CONFLICT, ERROR, PING, PONG
- `AuthContext`: userId, tenantId, deviceId, roles

#### `src/routes/sync-routes.ts` (435 lines) — API Routes

| Method | Path | Handler | Description |
|---|---|---|---|
| POST | `/push` | pushChanges | Push client changes to server |
| POST | `/pull` | pullChanges | Pull server changes to client |
| POST | `/delta` | getDelta | Entity-level delta comparison |
| GET | `/conflicts` | getConflicts | List pending conflicts |
| POST | `/conflicts/:conflictId/resolve` | resolveConflict | Resolve a specific conflict |
| GET | `/status` | getSyncStatus | Sync health/status |
| POST | `/batch` | batchSync | Bidirectional sync in one call |

#### `src/services/sync-service.ts` (750 lines) — Core Business Logic

**Class: `SyncService`**

- `pushChanges(tenantId, userId, operations, lastSyncTimestamp)`:
  - Processes operations in configurable batches within database transactions
  - For each operation: maps EntityType → SQL table via `getTableName()`
  - CREATE: inserts new row with version=1
  - UPDATE: checks version; if mismatch, creates SyncConflict; otherwise increments version
  - DELETE: soft-delete (sets deletedAt) or hard-delete
  - Version conflict detection triggers `getSuggestedResolution()` and optionally auto-resolves
  - Returns `{ processed, conflicts, syncTimestamp }`

- `pullChanges(tenantId, userId, entityTypes, sinceTimestamp, deviceId, includeDeleted)`:
  - Queries each entity table for rows `updatedAt > sinceTimestamp`
  - Optionally includes soft-deleted rows
  - Updates DeviceSyncState cursor
  - Returns `{ changes[], newSyncTimestamp }`

- `getDeltaChanges(tenantId, userId, entityType, sinceVersion)`:
  - Compares current entity data field-by-field against stored version
  - Returns per-field diffs with old/new values

- `getPendingConflicts(tenantId, userId)` / `resolveConflict(conflictId, strategy, customResolution)`:
  - CRUD for SyncConflict records
  - Applies resolution strategy via ConflictResolver

- Helper: `getTableName()` maps EntityType enum to Prisma table name (e.g., `learning_session` → `syncLearningSession`)
- Helper: `getSuggestedResolution()` returns per-entity-type default strategy
- Helper: `recordSyncHistory()` writes audit trail

**Key patterns:**
- Uses `$queryRaw` / `$executeRaw` for dynamic table access (Prisma limitation for polymorphic entity types)
- Batched processing with configurable `SYNC_BATCH_SIZE`
- Soft deletes with `deletedAt` timestamp

#### `src/services/conflict-resolver.ts` (338 lines) — Conflict Resolution

**Class: `ConflictResolver`**

Resolution strategies:
- **SERVER_WINS**: Returns server data unchanged
- **CLIENT_WINS**: Returns client data unchanged
- **LAST_WRITE_WINS**: Compares updatedAt timestamps, picks newer
- **MERGE**: Deep merge algorithm:
  - Numeric fields: uses `Math.max()` (higher value wins)
  - Arrays: merges unique elements
  - Objects: recursive deep merge
  - Metadata fields (createdAt, updatedAt, syncedAt, version): prefer server
  - Other fields: client wins (user intent)

#### `src/services/sync-events.ts` (200 lines) — Redis Pub/Sub

**Class: `SyncEventEmitter`**

- Uses Redis pub/sub on channels: `sync:changes`, `sync:conflicts`
- `emitChange(tenantId, userId, entityType, entityId, operation, deviceId)` — publishes change events
- `emitConflictResolved(tenantId, userId, conflictId)` — publishes conflict resolutions
- `onChangeForUser(tenantId, userId, callback)` — subscribes to user-specific changes
- `onConflictForUser(tenantId, userId, callback)` — subscribes to user-specific conflicts
- Filters messages by tenantId + userId on receive side

#### `src/websocket/websocket-handler.ts` (470 lines) — WebSocket Support

**Class: `WebSocketHandler`**

- Manages authenticated WebSocket connections per device
- Heartbeat mechanism (30s ping, 90s timeout)
- Client message types handled:
  - `SUBSCRIBE` / `UNSUBSCRIBE`: manage entity type subscriptions per client
  - `PUSH_CHANGE`: process single change via SyncService
  - `PULL_CHANGES`: request changes since timestamp
  - `RESOLVE_CONFLICT`: resolve a conflict
  - `PING` / `PONG`: keepalive
- Server broadcasts:
  - `CHANGE_NOTIFICATION`: pushed to all subscribed clients except source device
  - `CONFLICT_NOTIFICATION`: sent to affected user
- Integrates with SyncEventEmitter for cross-instance broadcast via Redis

#### `src/middleware/auth.ts` — JWT Authentication
- Uses `jose` library for JWT verification
- Extracts `AuthContext` from token: `userId, tenantId, deviceId, roles`
- Decorates `request.user`
- Skips `/health` endpoint

#### `src/prisma.ts` — Prisma Singleton
- Standard PrismaClient singleton with connect/disconnect

#### `src/logger.ts` — Logger
- Pino logger named `sync-svc`

---

## 3. Service 2: sis-sync-svc

### 3.1 Package.json

```
Name:    @aivo/sis-sync-svc
Version: 0.1.0
```

**Dependencies:**
| Package | Version | Purpose |
|---|---|---|
| fastify | ^4.28.0 | HTTP framework |
| @fastify/cors | ^10.0.2 | CORS |
| @fastify/rate-limit | ^10.2.1 | Rate limiting |
| @prisma/client | 5.22.0 | ORM |
| csv-parse | ^5.6.0 | CSV file parsing (OneRoster CSV) |
| node-cron | ^3.0.3 | Job scheduling |
| pino | ^10.0.0 | Logging |
| ssh2-sftp-client | ^11.0.0 | SFTP for CSV file retrieval |
| zod | ^3.23.8 | Schema validation |
| @aivo/ts-api-utils | workspace:* | Shared utilities |

**Scripts:**
- `dev`, `build`, `start`, `test`, `test:watch` (same pattern as sync-svc)

**Disposition:** `keep` (Phase 1 — merge target for sync-svc)

### 3.2 Prisma Schema (1057 lines)

**Enums (10):**
- `SisProviderType`: CLEVER, CLASSLINK, ONEROSTER_API, ONEROSTER_CSV, GOOGLE_WORKSPACE, MICROSOFT_ENTRA, CUSTOM
- `IntegrationStatus`: ACTIVE, INACTIVE, PENDING, ERROR
- `SyncStatus`: PENDING, IN_PROGRESS, SUCCESS, PARTIAL, FAILURE, CANCELLED
- `SisEntityType`: SCHOOL, CLASS, USER, ENROLLMENT
- `ExternalUserRoleHint`: STUDENT, TEACHER, ADMIN, AIDE, PARENT, GUARDIAN
- `ExternalEnrollmentRole`: STUDENT, TEACHER, AIDE
- `IdentityConflictType`: EMAIL_MISMATCH, DUPLICATE_EXTERNAL_ID, ROLE_CONFLICT, NAME_MISMATCH
- `IdentityConflictStatus`: PENDING, AUTO_RESOLVED, MANUALLY_RESOLVED, IGNORED
- `RelationshipType`: PARENT, GUARDIAN, MOTHER, FATHER, GRANDPARENT, EMERGENCY_CONTACT, OTHER, SIBLING
- Internal enum mappings for Prisma

**Models (27):**

| Model | Purpose |
|---|---|
| `SisProvider` | Provider configuration (type, config JSON, OAuth tokens, scheduling, field mappings) |
| `SisSyncRun` | Sync execution audit (stats, errors, triggered by, is_manual) |
| `SisRawSchool` | Staging table — raw school data from providers |
| `SisRawClass` | Staging table — raw class data |
| `SisRawUser` | Staging table — raw user data (includes aivoUserId for matching) |
| `SisRawEnrollment` | Staging table — raw enrollment data |
| `SisFieldMapping` | Custom field mapping rules per provider/entity |
| `SisSyncQueue` | Job queue for async sync operations |
| `ExternalSchoolMapping` | External ID ↔ internal School ID mapping |
| `ExternalClassMapping` | External ID ↔ internal Class ID mapping |
| `ExternalUserMapping` | External ID ↔ internal User ID mapping |
| `ExternalEnrollmentMapping` | External ID ↔ internal Enrollment ID mapping |
| `IdentityConflict` | Identity matching conflicts (email mismatch, duplicate IDs) |
| `OAuthState` | OAuth flow state tracking (CSRF protection) |
| `DeltaSyncState` | Delta sync cursor/token tracking per provider |
| `SyncHistory` | Detailed sync change history (entity-level audit) |
| `SyncError` | Sync error logging |
| `SyncConflict` | Data-level sync conflicts (source vs target values) |
| `ParentStudentRelationship` | Parent-student relationship data |
| `StudentDemographic` | Student demographic data (FERPA-relevant) |
| `AcademicTerm` | Academic term/grading period data |
| `WebhookConfig` | Inbound webhook configuration per provider |
| `WebhookLog` | Webhook processing log |
| `WebhookDeadLetter` | Failed webhooks for retry |

### 3.3 Source Files

#### `src/providers/types.ts` (623 lines) — Canonical SIS Types

**Core Interfaces:**
- `SisSchool`: externalId, name, schoolNumber, address, gradeLevels, nces/stateId, phone, principal, status, rawData
- `SisClass`: externalId, schoolExternalId, name, courseCode, subject(s), grade(s), sectionNumber, period, room, term, status, rawData
- `SisUser`: externalId, role (SisUserRole), email, firstName, lastName, username, studentNumber, staffId, grade, phone, dateOfBirth, gender, demographics, status, rawData
- `SisEnrollment`: externalId, userExternalId, classExternalId, role (EnrollmentRole), isPrimary, startDate, endDate, status, rawData
- `SisParentStudentRelationship`: sourceId, parentSourceId, studentSourceId, relationshipType, isPrimary, legalGuardian, emergencyContact, pickupAuthorized, receivesMailing

**Provider Configs:**
- `CleverConfig`: clientId, clientSecret, districtId, redirectUri, accessToken, tokenExpiry
- `ClassLinkConfig`: clientId, clientSecret, tenantId, oauthUrl, accessToken, tokenExpiry
- `OneRosterApiConfig`: baseUrl, clientId, clientSecret, tokenEndpoint, accessToken, tokenExpiry
- `OneRosterCsvConfig`: sftp (host, port, username, key/password), remotePath, fileNames
- `GoogleWorkspaceConfig`: projectId, customerId, domain, additionalDomains, clientId, clientSecretRef, serviceAccountEmail, adminEmail, tokens, scopes, useClassroomApi, orgUnitPaths, userTypes
- `MicrosoftEntraConfig`: tenantId, domain, clientId, clientSecretRef, tokens, scopes, useEducationApis, syncTeamsClasses, groupFilters, licenseFilters

**ISisProvider Interface:**
- `type`, `name`, `supportsDelta`, `supportsDeletionDetection`, `rateLimitDelay`
- `initialize(credentials)`, `testConnection()`, `cleanup()`
- `fetchSchools(cursor?)`, `fetchClasses(cursor?)`, `fetchUsers(cursor?)`, `fetchEnrollments(cursor?)`
- `fetchDelta?(entityType, options)`, `getAllSourceIds?(entityType, options)`
- `fetchRelationships?()`

**SyncStats / SyncEntityResult:** Stats per entity type (fetched, created, updated, deactivated, errors); paginated result with cursor.

#### Provider Implementations

##### `src/providers/clever.ts` (432 lines) — Clever
- API: `https://api.clever.com/v3.0`
- Auth: Bearer token
- Entities: districts → schools, sections → classes, students + teachers → users, sections/users → enrollments
- Pagination: link-based (follows `rel=next` links)
- Maps Clever roles to SIS roles

##### `src/providers/classlink.ts` (324 lines) — ClassLink  
- API: ClassLink Roster Server (OneRoster 1.1 compatible)
- Auth: OAuth 2.0 client_credentials
- Entities: orgs (type=school), classes, users, enrollments
- Pagination: offset-based (limit/offset)

##### `src/providers/oneroster-api.ts` (328 lines) — OneRoster 1.1 API
- API: Standard OneRoster 1.1 endpoints (`/orgs`, `/classes`, `/users`, `/enrollments`)
- Auth: OAuth 2.0 client_credentials
- Pagination: offset-based
- Role mapping: OneRoster roles → SIS roles

##### `src/providers/google-workspace.ts` (895 lines) — Google Workspace for Education
- APIs: Google Admin SDK (Directory API) + Classroom API
- Scopes: `GOOGLE_ROSTERING_SCOPES` (admin, directory, classroom), `GOOGLE_SSO_SCOPES` (openid, email, profile)
- Schools: Maps Google Org Units to schools
- Classes: From Classroom API courses
- Users: From Admin Directory API users
- Large implementation with comprehensive field mapping

##### `src/providers/microsoft-entra.ts` (884 lines) — Microsoft Entra ID (Azure AD)
- APIs: Microsoft Graph API v1.0 + Education APIs (for EDU tenants)
- Scopes: `MICROSOFT_ROSTERING_SCOPES` (User.Read.All, Group.Read.All, EduRoster.Read.All), `MICROSOFT_SSO_SCOPES`
- Schools: From Education schools endpoint (EDU tenants) or manual
- Classes: From Education classes endpoint or Teams groups
- Users: From Education users or standard Graph users
- Handles both EDU and non-EDU tenants

##### `src/providers/factory.ts` (419 lines) — Provider Factory
- **ProviderFactory** class with 1-hour cache TTL
- **SecretsResolver** interface + `EnvSecretsResolver` implementation
- Creates appropriate provider by `SisProviderType`
- `createAndInitializeProvider(type, configJson)` — convenience function
- `validateProviderConfig(type, config)` — validates config has required fields

#### Sync Engine

##### `src/sync/engine.ts` (541 lines) — Full Sync Engine
- **SyncEngine** class — core ETL pipeline
- `executeSync(tenantId, providerId, triggeredBy, isManual, config)`:
  1. Creates `SisSyncRun` record
  2. Initializes provider via `createAndInitializeProvider()`
  3. Executes phases in order: schools → classes → users → enrollments
  4. Each phase: resets processed flags, fetches all pages, upserts to staging tables in batches
  5. Deactivates stale records (not seen in current sync)
  6. Updates run status (SUCCESS/PARTIAL/FAILURE) and provider lastSyncAt
- Batch upsert pattern: findUnique by composite key → update or create
- Config: `batchSize=100`, `maxRetries=3`, `continueOnError=true`

##### `src/sync/delta-sync-engine.ts` (1267 lines) — Delta/Incremental Sync
- **DeltaSyncEngine** class — production-ready delta sync
- Entity dependency order: org → term → teacher → student → parent → class → enrollment → relationship → demographic
- Hash-based change detection (`createHash('sha256')`)
- Conflict resolution strategies: `source_wins`, `target_wins`, `manual`, `newest_wins`
- `processDeltaRecord()`: compares source hash with stored hash, detects local modifications, creates conflicts
- Deletion detection: compares provider source IDs with local entities
- Full audit trail for FERPA compliance
- Sync state tracking per entity type with cursors and delta tokens

##### `src/sync/transformer.ts` (354 lines) — Entity Transformer
- **EntityTransformer** class — transforms staging data to Aivo entities
- `mapSisRoleToAivoRole()`: teacher→TEACHER, student→LEARNER, administrator→DISTRICT_ADMIN, aide→TEACHER, parent/guardian→PARENT
- Transform phases: schools → users → classrooms → enrollments
- User matching priority: 1) External ID, 2) Email, 3) Student number, 4) Create new
- Cross-service integration points (commented out): calls to tenant-svc and auth-svc APIs

#### Scheduler

##### `src/scheduler/scheduler.ts` (364 lines)
- **SyncScheduler** class using `node-cron`
- Manages per-provider cron schedules
- `runSync()`: acquires in-memory lock, executes SyncEngine, then runs EntityTransformer
- Concurrency limits per tenant (`maxConcurrentSyncs=2`)
- Lock timeout: 30 minutes
- `cancelSync()`, `getSyncStatus()`, `updateSchedule()`
- Schedule presets (exported helper): daily, twice-daily, every-6-hours, nightly

##### `src/jobs/sync-job-processor.ts` (521 lines)
- **SyncJobProcessor** class — background job processing
- Uses DeltaSyncEngine (not basic SyncEngine)
- Job queue with priorities (high/normal/low)
- Exponential backoff retry (up to 3 attempts)
- Dead letter queue for failed jobs
- Integrates ProviderFactory, WebhookHandlerService
- Processes SisSyncQueue records

#### Webhook Handler

##### `src/webhooks/webhook-handler.service.ts` (1000 lines)
- **WebhookHandlerService** — processes inbound webhooks from SIS providers
- Supports: Clever, ClassLink, OneRoster, Ed-Fi, Google, Microsoft, Custom
- Features:
  - HMAC signature verification (provider-specific)
  - Idempotency tracking (in-memory, 1hr TTL)
  - Rate limiting (100 requests/minute/tenant)
  - Dead letter queue for unprocessable events
- Normalizes provider-specific webhook payloads into `DeltaRecord` format
- Forwards to DeltaSyncEngine for processing

#### API Routes

##### `src/api/routes.ts` (479 lines)
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tenants/:tenantId/providers` | List providers for tenant |
| GET | `/api/v1/providers/:providerId` | Get provider details |
| POST | `/api/v1/providers` | Create provider (validates config) |
| PATCH | `/api/v1/providers/:providerId` | Update provider |
| DELETE | `/api/v1/providers/:providerId` | Delete provider |
| POST | `/api/v1/providers/:providerId/sync` | Trigger manual sync |
| POST | `/api/v1/providers/:providerId/sync/cancel` | Cancel running sync |
| GET | `/api/v1/providers/:providerId/sync/status` | Get sync status |
| PUT | `/api/v1/providers/:providerId/schedule` | Update sync schedule |
| GET | `/api/v1/providers/:providerId/runs` | Sync run history |
| GET | `/api/v1/runs/:runId` | Get specific run |
| POST | `/api/v1/providers/:providerId/test` | Test provider connection |
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |

##### `src/api/oauth.ts` (797 lines)
- OAuth 2.0 flows for Google Workspace, Microsoft Entra, Clever, ClassLink
- Routes:
  - `GET /api/v1/providers/:providerId/oauth/initiate` — generates auth URL with PKCE
  - `GET /api/v1/oauth/callback` — handles callback, exchanges code for tokens
  - `POST /api/v1/providers/:providerId/oauth/disconnect` — revokes tokens

##### `src/routes/sync-routes.ts` (584 lines) — Delta Sync Routes
| Method | Path | Description |
|---|---|---|
| POST | `/tenants/:tenantId/providers/:providerId/sync` | Trigger delta sync |
| GET | `/tenants/:tenantId/providers/:providerId/sync/status` | Delta sync status |
| GET | `/tenants/:tenantId/providers/:providerId/sync/history` | Sync history |
| GET | `/tenants/:tenantId/sync/conflicts` | List sync conflicts |
| POST | `/tenants/:tenantId/sync/conflicts/:conflictId/resolve` | Resolve conflict |
| POST | `/webhooks/:provider` | Inbound webhook endpoint |
| GET | `/webhooks/:provider/verify` | Webhook verification (challenge) |
| POST | `/tenants/:tenantId/providers/:providerId/webhooks/register` | Register for webhooks |

---

## 4. Service 3: edfi-svc

### 4.1 Package.json

```
Name:    @aivo/edfi-svc
Version: 1.0.0
Port:    3000 (default)
```

**Dependencies:**
| Package | Version | Purpose |
|---|---|---|
| fastify | ^4.29.0 | HTTP framework |
| @fastify/rate-limit | ^10.2.1 | Rate limiting |
| @prisma/client | 5.22.0 | ORM |
| axios | ^1.7.9 | HTTP client for Ed-Fi API |
| cron | ^3.3.1 | Scheduling (declared, used for future scheduled exports) |
| jsonwebtoken | ^9.0.2 | JWT (declared but unused in current code) |
| pino | ^9.6.0 | Logging |
| zod | ^3.23.8 | Schema validation |

**Disposition:** `merge-source` into `integration-svc` (Phase 1)

### 4.2 Prisma Schema (288 lines)

**Enums:**
- `EdfiApiVersion`: V5_3, V6_1, V7_0
- `ExportStatus`: PENDING, QUEUED, RUNNING, SUCCESS, PARTIAL, FAILED, CANCELLED
- `SubmissionStatus`: PENDING, SUCCESS, FAILED, SKIPPED
- `ResourceType`: 16 types (STUDENTS, STUDENT_SCHOOL_ASSOCIATIONS, STAFF, SECTIONS, COURSES, SCHOOLS, etc.)

**Models (8):**

| Model | Purpose |
|---|---|
| `EdfiConfig` | Per-tenant Ed-Fi API config (stateCode, apiVersion, baseUrl, credentials, enabledResources, exportSchedule) |
| `EdfiFieldMapping` | Custom field mapping rules with transform expressions |
| `EdfiExportRun` | Export execution tracking (progress, resource types, success/error counts) |
| `EdfiSubmission` | Individual record submission tracking |
| `EdfiSyncCursor` | Delta sync cursor per resource type |
| `EdfiTokenCache` | OAuth token caching for Ed-Fi API |
| `EdfiValidationError` | Validation error records |
| `EdfiAuditLog` | Audit logging (CONFIG_CREATED, EXPORT_STARTED, etc.) |

### 4.3 Source Files

#### `src/server.ts` — Server Setup
- Creates Fastify with rate limiting (100/minute)
- Registers routes with PrismaClient and LearnerDataSource
- Direct module execution support with mock LearnerDataSource

#### `src/connectors/edfi-client.ts` (502 lines) — Ed-Fi API Client

**Class: `EdfiClient`**

- Supports Ed-Fi API versions: V5_3, V6_1, V7_0
- Auth: OAuth 2.0 client_credentials (Basic auth header)
- Token URL varies by version:
  - V5_3/V6_1: `{baseUrl}/oauth/token`
  - V7_0: `{baseUrl}/connect/token`
- Resource endpoint mappings per version (e.g., V7_0 uses `/data/v3/ed-fi/` prefix)
- 13 resource type endpoints: students, studentSchoolAssociations, studentSectionAssociations, staff, staffSectionAssociations, schools, localEducationAgencies, courses, sections, studentAssessments, grades, studentSchoolAttendanceEvents, learningStandards

**Methods:**
- `authenticate()` — OAuth client_credentials flow with 5-min buffer on token expiry
- `testConnection()` — Authenticates and fetches API info
- `create<T>(resourceType, data)` — POST resource, extracts ID from Location header
- `update<T>(resourceType, id, data)` — PUT resource
- `upsert<T>(resourceType, data)` — POST, falls back to PUT on 409 Conflict
- `delete(resourceType, id)` — DELETE resource
- `get<T>(resourceType, id)` — GET single resource
- `list<T>(resourceType, params?)` — GET with offset/limit pagination
- Error handling: 401 auto-clears token, formats AxiosError to structured error

#### `src/exports/export-service.ts` (525 lines) — Export Engine

**Class: `ExportService`**

- `startExport(config, options)` — Creates `EdfiExportRun`, starts async export
- `runExport()` — Main export loop:
  1. Creates EdfiClient with decrypted credentials
  2. Gets school ID mappings from LearnerDataSource
  3. Iterates enabled resource types
  4. For each: fetches Aivo learners in batches (100/batch), transforms, upserts to Ed-Fi
  5. Tracks success/error counts
  6. Updates run status and config timestamps
  7. Writes audit log
- `exportResourceType()` — Processes single resource type with pagination
- `exportStudent()` — Transforms AivoLearner → EdfiStudent, upserts to Ed-Fi, records submission
- `exportStudentSchoolAssociation()` — Transforms enrollment data → EdfiStudentSchoolAssociation
- `exportStudentSectionAssociations()` — Transforms section enrollments → EdfiStudentSectionAssociation[]

**LearnerDataSource interface:**
- `getLearners(tenantId, options)` — Returns paginated learners
- `getSchoolMappings(tenantId)` — Returns Aivo school ID → Ed-Fi school ID map

#### `src/transforms/student-transform.ts` (282 lines) — Data Transforms

**Functions:**
- `transformToEdfiStudent(learner, context)` — Maps AivoLearner to EdfiStudent resource
  - Required: firstName, lastName, birthDate
  - Maps gender to Ed-Fi SexDescriptor URIs
  - Maps email to Ed-Fi ElectronicMailType
  - Sets sourceSystemDescriptor to `uri://aivolearning.com/SourceSystemDescriptor#Aivo`
- `transformToEdfiStudentSchoolAssociation(learner, context)` — Maps enrollment to Ed-Fi
  - Maps grade level to Ed-Fi GradeLevelDescriptor URIs (K-12)
  - Uses schoolIdMap for Aivo → Ed-Fi school ID translation
- `transformToEdfiStudentSectionAssociations(learner, context)` — Maps sections to Ed-Fi
  - Creates one EdfiStudentSectionAssociation per section

**AivoLearner interface:** id, tenantId, firstName, middleName, lastName, birthDate, gender, email, gradeLevel, externalId, stateStudentId, schoolId, enrollmentDate, withdrawDate, sections[]

#### `src/types/edfi-resources.ts` (465 lines) — Ed-Fi Data Standard Types
- Comprehensive TypeScript interfaces matching Ed-Fi Data Standard 4.0
- Resources: EdfiStudent, EdfiStudentSchoolAssociation, EdfiStudentSectionAssociation, EdfiStaff, EdfiStaffSectionAssociation, EdfiSchool, EdfiLocalEducationAgency, EdfiCourse, EdfiSection, and assessment types
- All resources support `_ext` extension fields

#### `src/api/routes.ts` (399 lines) — API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tenants/:tenantId/edfi/configs` | List configs for tenant |
| GET | `/api/v1/edfi/configs/:configId` | Get config (excludes secret) |
| POST | `/api/v1/edfi/configs` | Create config (validates apiVersion, Base64 encrypts secret) |
| PATCH | `/api/v1/edfi/configs/:configId` | Update config |
| DELETE | `/api/v1/edfi/configs/:configId` | Delete config |
| POST | `/api/v1/edfi/configs/:configId/test` | Test Ed-Fi connection |
| POST | `/api/v1/edfi/configs/:configId/export` | Trigger manual export |
| GET | `/api/v1/edfi/exports/:exportId` | Get export progress |
| GET | `/api/v1/edfi/exports/:exportId/submissions` | List individual submissions |
| GET | `/health` | Health check |

---

## 5. Service 4: integration-svc

### 5.1 Package.json

```
Name:    @aivo/integration-svc
Version: 0.1.0
Port:    3009
```

**Dependencies:**
| Package | Version | Purpose |
|---|---|---|
| fastify | ^4.28.0 | HTTP framework |
| @fastify/cors | ^10.0.2 | CORS |
| @fastify/rate-limit | ^10.2.1 | Rate limiting |
| fastify-type-provider-zod | ^4.0.2 | Zod type provider |
| @prisma/client | 5.22.0 | ORM |
| googleapis | ^146.0.0 | Google APIs client |
| google-auth-library | ^9.15.1 | Google OAuth |
| jose | ^6.0.8 | JWT verification |
| pino | ^9.6.0 | Logging |
| zod | ^3.23.8 | Schema validation |
| @aivo/ts-api-utils | workspace:* | Shared utilities |

**Disposition:** `merge-target` — absorbs `edfi-svc` (Phase 1)

### 5.2 Prisma Schema (899 lines)

**Enums:**
- `WebhookEventType`: 16 event types (SESSION_STARTED/COMPLETED/ABANDONED, BASELINE_STARTED/COMPLETED, ASSESSMENT_COMPLETED, SKILL_MASTERY_UPDATED, RECOMMENDATION_CREATED, ACTIVITY_COMPLETED, STREAK_MILESTONE, ACHIEVEMENT_UNLOCKED, LEARNER_ENROLLED/UNENROLLED, GRADE_SYNCED, ASSIGNMENT_CREATED, ROSTER_UPDATED)
- `WebhookDeliveryStatus`: PENDING, IN_PROGRESS, SUCCESS, FAILED, DEAD_LETTER
- `ApiKeyStatus`: ACTIVE, REVOKED, EXPIRED
- `ApiScope`: READ_LEARNER_PROGRESS, READ_SESSION_DATA, READ_ANALYTICS, WRITE_EXTERNAL_EVENTS, WRITE_ENROLLMENTS, MANAGE_WEBHOOKS
- `EnrollmentRole`, `EnrollmentStatus`, `ClassStatus`

**Models (31):**

| Model | Purpose |
|---|---|
| **Webhook System** | |
| `WebhookEndpoint` | Partner webhook registration (url, eventTypes, secret, filters, delivery stats) |
| `WebhookDelivery` | Individual delivery lifecycle (attempts, retry scheduling, status) |
| `WebhookDeliveryAttempt` | HTTP request log per attempt (status, response, timing) |
| **API Key System** | |
| `ApiKey` | Partner API key (hash, prefix, scopes, rate limits, IP restrictions, OAuth client credentials) |
| `ApiKeyUsageLog` | Usage logging per request |
| **External Events** | |
| `ExternalLearningEvent` | Inbound learning events from partner systems |
| **Tenant Settings** | |
| `IntegrationSettings` | Per-tenant data sharing controls (allowLearnerProgress, allowSessionData, etc.) |
| **Google Classroom** | |
| `GoogleClassroomCredential` | Per-user OAuth tokens for Google Classroom |
| `GoogleClassroomCourse` | Cached course data from Google Classroom |
| `GoogleClassroomAssignment` | Link records: AIVO lesson ↔ Classroom assignment |
| `GoogleClassroomSubmission` | Student submission state synced from Classroom |
| `GoogleClassroomSyncLog` | Sync operation history |
| `GoogleClassroomSync` | Active sync state per course |
| `GoogleClassroomWebhookRegistration` | Pub/Sub webhook registrations |
| `GoogleClassroomCourseMapping` | AIVO class ↔ Google Classroom course mapping |
| `GoogleClassroomDomainInstallation` | Domain-wide installation records |
| **Aivo Entity Mirrors** | |
| `Class`, `Enrollment`, `User`, `StudentProfile`, `Guardian` | Local copies of Aivo entities for integration |
| `LearnerModel`, `Lesson`, `LessonAttempt` | Local copies for grade passback |
| `GoogleClassroomAssignmentLink` | N:M link between assignments and lessons |
| `GradePassbackLog` | Grade passback audit trail |

### 5.3 Source Files

#### `src/server.ts` — Server Setup
- Creates Fastify with Zod type provider
- Initializes ApiKeyService, WebhookDispatcher
- Registers main routes and optionally Google Classroom routes
- Starts webhook delivery worker on interval (default 5s, batch size 10)
- Starts Google Classroom scheduled sync jobs if configured

#### `src/types.ts` (300 lines) — Comprehensive Type Definitions

**Webhook Event Types & Payloads (Zod schemas):**
- SessionCompletedPayload, BaselineCompletedPayload, SkillMasteryUpdatedPayload, RecommendationCreatedPayload, ActivityCompletedPayload, LearnerEnrolledPayload

**API Key Types:**
- 6 scopes: READ_LEARNER_PROGRESS, READ_SESSION_DATA, READ_ANALYTICS, WRITE_EXTERNAL_EVENTS, WRITE_ENROLLMENTS, MANAGE_WEBHOOKS

**Request/Response Schemas (Zod):**
- CreateWebhookEndpointSchema, UpdateWebhookEndpointSchema, CreateApiKeySchema, ExternalLearningEventSchema, LearnerProgressResponseSchema, SessionListResponseSchema

**Constants:**
- `WEBHOOK_HEADERS`: X-Aivo-Signature, X-Aivo-Event, X-Aivo-Tenant, X-Aivo-Delivery-Id, X-Aivo-Timestamp
- `API_KEY_HEADER`: X-Aivo-Api-Key
- `API_KEY_PREFIX`: `aivo_pk_`

#### `src/api-key-service.ts` (454 lines) — API Key Management

**Class: `ApiKeyService`**

- `createApiKey(params)` — Generates `aivo_pk_` + 32 random hex bytes, stores SHA-256 hash + 16-char prefix
- `validateApiKey(rawKey, clientIp)` — Validates prefix format, finds by prefix+hash, checks status/expiry/IP/rate-limit
- `revokeApiKey(apiKeyId, revokedBy, reason)`
- `listApiKeys(tenantId)` — Lists keys (never exposes full key)
- `logUsage(params)` — Records endpoint, method, status, response time, IP, user agent
- Rate limiting: in-memory sliding window (60s), per-key configurable limits
- `isValidApiKey()` type guard for validated results

#### `src/webhook-dispatcher.ts` (810 lines) — Outbound Webhook Delivery

**Class: `WebhookDispatcher`**

- `queueEvent(tenantId, eventType, payload)` — Finds matching endpoints, creates delivery records
  - Matches by: tenantId, enabled, has eventType, not disabled, passes filter
- `processPendingDeliveries(batchSize)` — Background worker processes PENDING/FAILED deliveries
- `attemptDelivery(delivery)`:
  1. Retrieves webhook secret from KMS (or config)
  2. Signs payload using HMAC-SHA256 (`signWebhookPayload`)
  3. Sends POST with Aivo headers (signature, event type, tenant, delivery ID, timestamp)
  4. Records attempt (status, response body first 1KB, timing)
  5. On success: marks SUCCESS, resets endpoint failure count
  6. On 4xx (not 429): permanent failure
  7. On 429/5xx/network error: schedules retry with exponential backoff
- `scheduleRetry()` — calculates next attempt time: `initialDelay * backoff^attemptCount` (capped at 1hr)
- `markPermanentFailure()` — stops retries, increments endpoint failure count, auto-disables after N consecutive failures
- Config: maxAttempts=5, initialRetryDelay=1s, maxRetryDelay=1hr, backoffMultiplier=2, requestTimeout=30s, maxConsecutiveFailures=10

#### `src/webhook-signing.ts` (160 lines) — HMAC Signing

- `signWebhookPayload(payload, secret, timestamp)` — HMAC-SHA256 of `${timestamp}.${payload}`, returns `v1=<hex>`
- `verifyWebhookSignature(payload, signature, secret, timestamp, tolerance)` — Timing-safe verification with replay protection (5min window)
- `generateWebhookHeaders()` — Generates all X-Aivo-* headers
- `generateWebhookSecret()` — Returns `whsec_` + 32 random bytes hex

#### `src/routes.ts` (1042 lines) — API Routes

**Public APIs (API key authenticated):**

| Method | Path | Scope Required | Description |
|---|---|---|---|
| GET | `/public/learners/:learnerId/progress` | READ_LEARNER_PROGRESS | Learner progress from learner-model-svc Virtual Brain |
| GET | `/public/learners/:learnerId/sessions` | READ_SESSION_DATA | Session history from session-svc |
| POST | `/public/events/external-learning` | WRITE_EXTERNAL_EVENTS | Submit external learning events |

**Admin APIs (JWT authenticated):**

| Method | Path | Description |
|---|---|---|
| GET | `/admin/tenants/:tenantId/webhooks` | List webhook endpoints |
| GET | `/admin/webhooks/:webhookId` | Get webhook details |
| POST | `/admin/tenants/:tenantId/webhooks` | Create webhook endpoint |
| PATCH | `/admin/webhooks/:webhookId` | Update webhook endpoint |
| DELETE | `/admin/webhooks/:webhookId` | Delete webhook endpoint |
| POST | `/admin/webhooks/:webhookId/test` | Send test webhook event |
| GET | `/admin/webhooks/:webhookId/deliveries` | Delivery history |
| POST | `/admin/webhooks/:webhookId/rotate-secret` | Rotate webhook secret |
| GET | `/admin/tenants/:tenantId/api-keys` | List API keys |
| POST | `/admin/tenants/:tenantId/api-keys` | Create API key |
| DELETE | `/admin/api-keys/:keyId` | Revoke API key |
| GET/PUT | `/admin/tenants/:tenantId/settings` | Integration settings (data sharing) |
| GET | `/health` | Health check |

#### Google Classroom Module

##### `src/google-classroom/google-classroom.service.ts` (1850 lines)

**Class: `GoogleClassroomService`**

Comprehensive Google Classroom API integration:

- **OAuth**: auth URL generation, code exchange, token storage/refresh, revocation
- **Request queue**: Rate limiting at 10 req/s, queued execution
- **Courses**: list, get, create, archive, with state filtering
- **Roster**: list students, teachers, guardians; invite students
- **Assignments**: create, update, delete Classroom coursework
- **Submissions**: list, get, update grades (draft and assigned)
- **Grade passback**: sync AIVO lesson scores to Classroom gradebook
- **Webhooks**: register Pub/Sub push notifications for roster/coursework changes
- **Sync**: full course sync (students, teachers, guardians), incremental sync

##### `src/google-classroom/assignment-sync.service.ts` (770 lines)

**Class: `AssignmentSyncService`**

- `postLessonAsAssignment(userId, lessonId, courseId, options)`:
  - Fetches lesson from DB, generates lesson URL, calculates max points
  - Creates Classroom assignment with AIVO lesson link as material
  - Stores link record in `GoogleClassroomAssignment`
- `updateLinkedAssignment()` / `deleteLinkedAssignment()`
- `syncGradeForStudent()` — Pushes AIVO score to Classroom submission
- `batchGradePassback()` — Bulk grade sync with retry
- `autoSyncGrades()` — Syncs all completed lesson attempts to Classroom
- `getGradeSyncStatus()` — Reports sync coverage

##### `src/google-classroom/scheduled-sync.ts` (547 lines)

**ScheduledSyncJob**: Periodic roster sync (default every 6 hours)
- Syncs courses due for sync (respects failure backoff)
- Renews expiring webhook registrations
- Syncs pending grades (if enabled)
- Cleans up old sync logs

**GradeSyncJob**: Periodic grade passback
- Syncs unsynchronized grades to Classroom
- Configurable interval (default 15 minutes)

##### `src/google-classroom/routes.ts` (650 lines)

| Category | Routes |
|---|---|
| **OAuth** | GET `/google-classroom/auth/connect`, GET `/google-classroom/auth/callback`, GET `/google-classroom/status`, DELETE `/google-classroom/auth/disconnect` |
| **Courses** | GET `/google-classroom/courses`, POST `/google-classroom/courses/:courseId/sync`, GET `/google-classroom/courses/:courseId/students`, GET `/google-classroom/courses/:courseId/teachers` |
| **Assignments** | POST `/google-classroom/assignments`, PATCH `/google-classroom/assignments/:linkId`, DELETE `/google-classroom/assignments/:linkId`, GET `/google-classroom/assignments` |
| **Grades** | POST `/google-classroom/grades`, POST `/google-classroom/grades/batch`, POST `/google-classroom/grades/auto-sync` |
| **Course Mappings** | POST/PUT/DELETE `/google-classroom/course-mappings` |
| **Webhooks** | POST `/google-classroom/webhooks`, POST `/google-classroom/courses/:courseId/register-webhook` |
| **Admin** | POST `/google-classroom/admin/domain-install`, GET `/google-classroom/admin/sync-history` |

##### `src/google-classroom/dto.ts` (327 lines) — Zod Validation Schemas
Full Zod schemas for all Google Classroom request/response types.

##### `src/google-classroom/error-handler.ts` (591 lines)
- 20+ error codes (GC_TOKEN_EXPIRED, GC_RATE_LIMITED, GC_COURSE_NOT_FOUND, etc.)
- User-friendly error messages for each code
- Per-error retry configuration (retryable/non-retryable, backoff settings)
- `parseGoogleError()` — Maps Google API errors to error codes
- `withRetry()` — Generic retry wrapper with exponential backoff

##### `src/google-classroom/types.ts` (534 lines)
Complete TypeScript types mirroring Google Classroom API structures.

#### `src/middleware/auth.ts` (109 lines)
- JWT auth using `jose` library
- `requireAdminRole()` — Checks for admin/super_admin/platform_admin/district_admin roles
- Test mode bypass via `X-Test-User` header

---

## 6. Overlap Analysis: sync-svc ↔ sis-sync-svc

### Overlapping Functionality

| Area | sync-svc | sis-sync-svc | Overlap Level |
|---|---|---|---|
| **Conflict resolution** | ConflictResolver with 4 strategies (server_wins, client_wins, last_write_wins, merge) | DeltaSyncEngine with 4 strategies (source_wins, target_wins, manual, newest_wins) | **HIGH** — same concept, different naming |
| **Conflict storage** | `SyncConflict` model (serverVersion, clientVersion, resolution) | `SyncConflict` model (sourceValue, targetValue, resolution, resolvedBy) | **HIGH** — same purpose, different schema |
| **Sync history** | `SyncHistory` model (operation, entityType, version) | `SyncHistory` model + `SisSyncRun` (entity-level + run-level audit) | **MEDIUM** — sis-sync-svc is more comprehensive |
| **Delta/change detection** | `getDeltaChanges()` — field-level diff comparison | `DeltaSyncEngine.processDeltaRecord()` — hash-based change detection | **MEDIUM** — different algorithms for same goal |
| **Batch processing** | `batchOperations()` with configurable batch size | SyncEngine batched upserts with configurable batch size | **MEDIUM** — same pattern |
| **Soft deletes** | `deletedAt` timestamp on syncable entities | `processed` flag + `deactivateStaleRecords()` | **LOW** — different mechanisms |
| **Prisma singleton** | `src/prisma.ts` standard singleton | `src/prisma.ts` standard singleton | **LOW** — boilerplate |
| **Logger** | Pino `sync-svc` | Pino `sis-sync-svc` | **LOW** — boilerplate |

### Non-Overlapping (Unique to Each)

| sync-svc Only | sis-sync-svc Only |
|---|---|
| WebSocket real-time sync | 7 SIS provider implementations |
| Redis pub/sub event system | OAuth 2.0 flows (Google, Microsoft, Clever, ClassLink) |
| Device-level sync state tracking | Staging tables (SisRaw*) ETL pattern |
| Client device offline support | Entity transformer (SIS roles → Aivo roles) |
| Per-entity-type syncable tables | Cron-based scheduling (node-cron) |
| JWT+deviceId auth model | Provider factory with caching |
| Bidirectional push/pull protocol | Webhook ingestion from SIS providers |
| Content versioning (OfflineContent) | Identity conflict detection |
| | Parent-student relationships |
| | Student demographics |
| | Academic terms |
| | SFTP CSV file retrieval |
| | Job queue processor |

### Key Difference
- **sync-svc** is about **client device ↔ server synchronization** (offline-first mobile app)
- **sis-sync-svc** is about **external SIS ↔ Aivo data ingestion** (ETL pipeline)

Despite the naming overlap, these services solve fundamentally different problems. The "sync" concept in sync-svc refers to syncing learning data between mobile devices and the server, while in sis-sync-svc it refers to syncing roster data from external Student Information Systems into Aivo.

---

## 7. Overlap Analysis: edfi-svc ↔ integration-svc

### Overlapping Functionality

| Area | edfi-svc | integration-svc | Overlap Level |
|---|---|---|---|
| **OAuth token management** | EdfiClient OAuth 2.0 client credentials, token caching | GoogleClassroomService OAuth 2.0 authorization code, token refresh/storage | **MEDIUM** — both do OAuth but for different APIs |
| **Rate limiting** | Fastify rate-limit (100/min) | Fastify rate-limit (FastifyRateLimitPresets) + per-API-key rate limits | **LOW** — integration-svc is more sophisticated |
| **Export/submission tracking** | EdfiExportRun, EdfiSubmission models | GradePassbackLog, GoogleClassroomSyncLog models | **MEDIUM** — both track outbound data operations |
| **Audit logging** | EdfiAuditLog (tenantId, configId, action, actor) | ApiKeyUsageLog, WebhookDeliveryAttempt | **LOW** — different audit domains |
| **Connection testing** | `POST /configs/:configId/test` with EdfiClient.testConnection() | Google Classroom `GET /status` checks credentials | **LOW** — same pattern, different targets |
| **Health check** | `GET /health` | `GET /health` | **LOW** — boilerplate |
| **Prisma setup** | Standard PrismaClient | Standard PrismaClient | **LOW** — boilerplate |

### Non-Overlapping (Unique to Each)

| edfi-svc Only | integration-svc Only |
|---|---|
| Ed-Fi ODS/API client (V5.3, V6.1, V7.0) | Outbound webhook dispatch system |
| Ed-Fi resource type definitions (data standard) | API key management (generation, validation, scoping) |
| Student/school/section data transforms | Public partner APIs (learner progress, sessions) |
| Ed-Fi descriptor URI mappings | External learning event ingestion |
| Export engine (batch upload to Ed-Fi) | Google Classroom full integration |
| State reporting compliance | — OAuth + roster sync |
| Grade-level descriptor mapping (K-12) | — Assignment posting from AIVO lessons |
| | — Grade passback to Classroom |
| | — Webhook-based real-time roster updates |
| | — Scheduled sync (roster + grades) |
| | — Course mapping (AIVO ↔ Classroom) |
| | — Domain-wide installation support |
| | Webhook signing (HMAC-SHA256) |
| | JWT admin authentication |
| | Integration settings (per-tenant data sharing controls) |

### Key Difference
- **edfi-svc** is a **state compliance reporting service** — exports Aivo student data TO Ed-Fi ODS/API endpoints
- **integration-svc** is a **partner integration platform** — provides APIs TO partners, manages webhooks FROM Aivo events, and does bidirectional Google Classroom sync

They share the common theme of "external system connectivity" but serve completely different use cases. The Ed-Fi functionality would become one module within integration-svc.

---

## 8. Unique Logic Inventory

### sync-svc — Unique Logic to Preserve

1. **WebSocket bidirectional sync protocol** — SUBSCRIBE/UNSUBSCRIBE model with entity-type subscriptions, device-level broadcast exclusion
2. **Redis pub/sub sync events** — Cross-instance real-time change notification (`sync:changes`, `sync:conflicts` channels)
3. **Conflict resolution merge strategy** — Deep merge algorithm with field-type-aware logic (numeric=max, arrays=merge unique, objects=recursive, metadata=server-wins)
4. **Entity-type-to-table mapping** — Dynamic SQL via getTableName() for polymorphic syncable entities
5. **Device sync state tracking** — Per-device (`DeviceSyncState`) sync cursor with entity-level version tracking
6. **Offline content caching** — `OfflineContent` and `ContentVersion` models for offline-first support
7. **Field-level delta comparison** — getDeltaChanges() compares individual JSON fields between versions

### sis-sync-svc — Unique Logic to Preserve

1. **Provider abstraction layer** — `ISisProvider` interface with 7+ implementations covering all major SIS providers
2. **ETL staging table pattern** — SisRaw* tables for extract-load before transform
3. **Entity transformer** — Role mapping (SIS → Aivo), user matching by external ID/email/student number
4. **Delta sync engine** — Hash-based change detection, entity dependency ordering, deletion detection, FERPA audit trail
5. **Webhook ingestion** — Multi-provider webhook normalization with signature verification, idempotency, rate limiting, dead letter queue
6. **Provider factory with secrets** — Cached provider instances with configurable secrets resolution
7. **OAuth flows** — Multi-provider OAuth 2.0 with PKCE for Google, Microsoft, Clever, ClassLink
8. **Parent-student relationships** — Relationship types, guardian data, emergency contacts
9. **SFTP CSV ingestion** — OneRoster CSV file retrieval over SFTP

### edfi-svc — Unique Logic to Preserve

1. **Ed-Fi API version handling** — V5.3, V6.1, V7.0 endpoint routing and token URL differences
2. **Ed-Fi resource type model** — 13 resource endpoints with version-specific URL patterns
3. **Ed-Fi data transforms** — Aivo learner → Ed-Fi Student/StudentSchoolAssociation/StudentSectionAssociation with Ed-Fi descriptor URIs
4. **Grade level descriptor mapping** — K-12 grade levels to Ed-Fi GradeLevelDescriptor URIs
5. **Ed-Fi upsert pattern** — CREATE with 409 Conflict fallback to UPDATE (natural key matching)
6. **Export tracking** — Per-resource-type progress, per-record submission status
7. **Base64 credential encryption** — Simple credential storage (noted: would use proper encryption in production)

### integration-svc — Unique Logic to Preserve

1. **Outbound webhook dispatch engine** — Queue-based delivery with exponential backoff retry (5 attempts, 2x backoff, 1hr max), per-endpoint failure tracking/auto-disable
2. **HMAC-SHA256 webhook signing** — Timestamp-based replay protection, `v1=<signature>` format, timing-safe comparison
3. **API key management** — `aivo_pk_` prefixed keys, SHA-256 hash storage, per-key rate limiting (sliding window), IP allowlisting, scope-based access control, usage logging
4. **Public partner APIs** — Real-time learner progress (from learner-model-svc Virtual Brain), session history (from session-svc), external event ingestion
5. **Google Classroom integration** — Full OAuth flow, roster sync, assignment posting from AIVO lessons, grade passback to Classroom gradebook, webhook-based real-time updates, scheduled sync (6hr roster, 15min grades), course mapping, domain-wide installation
6. **Integration settings** — Per-tenant data sharing controls (allowLearnerProgress, allowSessionData, allowExternalEvents, etc.)
7. **Error handler framework** — 20+ error codes with user-friendly messages and per-code retry configuration

---

## 9. Merge Recommendations

### Merge 1: sync-svc → sis-sync-svc

**Rationale per package.json metadata:** sync-svc is marked as `merge-source` into `sis-sync-svc`.

**Assessment:** These services solve fundamentally different problems (device sync vs SIS ingestion). The merge is technically possible but the codebases have minimal actual overlap. The primary shared concept is "sync conflict resolution."

**What to merge:**
- Conflict resolution strategies could be unified into a shared module
- Sync history/audit patterns could share a common base
- WebSocket handler, Redis events, offline content, and device sync are unique modules that would be added as-is

**Risks:**
- sis-sync-svc increases in complexity significantly (~70+ source files post-merge)
- The two "sync" concepts (device sync vs SIS sync) could create naming confusion
- Different auth models (JWT+deviceId vs API-level auth)

### Merge 2: edfi-svc → integration-svc

**Rationale per package.json metadata:** edfi-svc is marked as `merge-source` into `integration-svc`.

**Assessment:** This is a **natural merge**. Both services handle external system connectivity. Ed-Fi becomes another integration module alongside Google Classroom.

**What to merge:**
- Ed-Fi client, transforms, and export service move into `src/edfi/` module within integration-svc
- Ed-Fi Prisma models added to integration-svc schema
- Ed-Fi API routes registered at `/api/v1/edfi/*`
- Ed-Fi config management becomes similar to Google Classroom config management

**Benefits:**
- Unified auth middleware (JWT for admin, API key for public)
- Shared webhook infrastructure could dispatch Ed-Fi completion events
- Single deployment for all integration concerns
- Shared rate limiting, logging, health check patterns

**Risks:**
- integration-svc Prisma schema becomes very large (~40+ models)
- Need to reconcile Prisma client generation paths
- axios (edfi-svc) vs native fetch (integration-svc) HTTP client inconsistency

---

*Report generated from complete source code analysis of all four services.*
