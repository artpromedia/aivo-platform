# Content Packaging & Delta Update System

This document describes the content packaging and delta update architecture for efficient offline content delivery in school environments.

## Overview

The content packaging system enables:
- **Bulk preloading**: Download all content for a tenant/grade/subject combination at once
- **Delta updates**: Efficiently sync only changed content since last update
- **School deployment**: Optimized for morning connect windows and device management scenarios

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            School Environment                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│   │   iPad #1    │    │   iPad #2    │    │   iPad #N    │                  │
│   │              │    │              │    │              │                  │
│   │ ContentPre-  │    │ ContentPre-  │    │ ContentPre-  │                  │
│   │   loader     │    │   loader     │    │   loader     │                  │
│   │              │    │              │    │              │                  │
│   │ SQLite Cache │    │ SQLite Cache │    │ SQLite Cache │                  │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│          │                   │                   │                           │
│          └───────────────────┼───────────────────┘                           │
│                              │                                               │
│                   WiFi (Morning Connect Window)                              │
│                              │                                               │
└──────────────────────────────┼───────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Cloud Infrastructure                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────────────┐      ┌────────────────┐      ┌────────────────┐        │
│   │  content-svc   │      │      S3        │      │   PostgreSQL   │        │
│   │                │      │                │      │                │        │
│   │ /packages      │◄────►│   Manifests    │      │ ContentPackage │        │
│   │ /packages/diff │      │   Content      │      │ ContentChange  │        │
│   │                │      │                │      │                │        │
│   └────────────────┘      └────────────────┘      └────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### POST /api/content/packages

Request a new content package for bulk download.

**Request:**
```json
{
  "tenantId": "uuid",
  "gradeBands": ["K_2", "G3_5"],
  "subjects": ["ELA", "MATH"],
  "locales": ["en"],
  "updatedSince": "2025-01-01T00:00:00Z",  // Optional filter
  "urlExpirationHours": 24  // Default: 24, Max: 168
}
```

**Response (202 Accepted):**
```json
{
  "packageId": "uuid",
  "status": "PENDING",
  "estimatedCompletionAt": "2025-01-10T00:01:00Z",
  "statusUrl": "/api/content/packages/{packageId}"
}
```

### GET /api/content/packages/:id

Get package status and download URLs.

**Response (200 OK):**
```json
{
  "package": {
    "id": "uuid",
    "tenantId": "uuid",
    "gradeBands": ["K_2", "G3_5"],
    "subjects": ["ELA", "MATH"],
    "locales": ["en"],
    "status": "READY",
    "totalItems": 150,
    "totalSizeBytes": 15360000,
    "requestedAt": "2025-01-10T00:00:00Z",
    "completedAt": "2025-01-10T00:00:30Z",
    "expiresAt": "2025-01-11T00:00:30Z"
  },
  "manifestDownloadUrl": "https://content.aivo.ai/packages/{id}/manifest.json",
  "bundleDownloadUrl": null
}
```

### GET /api/content/packages/:id/manifest

Download the full package manifest (JSON).

**Response:**
```json
{
  "packageId": "uuid",
  "manifestVersion": "1.0.0",
  "tenantId": "uuid",
  "gradeBands": ["K_2", "G3_5"],
  "subjects": ["ELA", "MATH"],
  "locales": ["en"],
  "generatedAt": "2025-01-10T00:00:30Z",
  "expiresAt": "2025-01-11T00:00:30Z",
  "totalItems": 150,
  "totalSizeBytes": 15360000,
  "items": [
    {
      "loVersionId": "uuid",
      "learningObjectId": "uuid",
      "contentKey": "LO_VERSION:uuid:locale:en",
      "checksum": "sha256:abc123...",
      "contentUrl": "https://content.aivo.ai/v1/content/{loVersionId}/en?expires=...",
      "sizeBytes": 10240,
      "subject": "ELA",
      "gradeBand": "K_2",
      "versionNumber": 1,
      "locale": "en",
      "publishedAt": "2025-01-09T00:00:00Z",
      "updatedAt": "2025-01-09T00:00:00Z"
    }
  ]
}
```

### GET /api/content/packages/diff

Get delta updates (changes since timestamp).

**Query Parameters:**
- `tenantId` (required): UUID
- `gradeBands` (required): Array of grade bands
- `subjects` (required): Array of subjects
- `locales` (optional): Array of locales, defaults to `["en"]`
- `sinceTimestamp` (required): ISO 8601 timestamp
- `limit` (optional): Max items, default 100, max 1000
- `cursor` (optional): Pagination cursor

**Response:**
```json
{
  "tenantId": "uuid",
  "sinceTimestamp": "2025-01-09T00:00:00Z",
  "currentTimestamp": "2025-01-10T00:00:00Z",
  "hasMore": false,
  "nextCursor": null,
  "totalChanges": 5,
  "totalSizeBytes": 51200,
  "items": [
    {
      "loVersionId": "uuid",
      "learningObjectId": "uuid",
      "contentKey": "LO_VERSION:uuid:locale:en",
      "changeType": "ADDED",
      "checksum": "sha256:abc123...",
      "contentUrl": "https://content.aivo.ai/v1/content/{loVersionId}/en",
      "sizeBytes": 10240,
      "subject": "ELA",
      "gradeBand": "K_2",
      "versionNumber": 1,
      "locale": "en",
      "changedAt": "2025-01-09T06:00:00Z"
    },
    {
      "loVersionId": "uuid",
      "learningObjectId": "uuid",
      "contentKey": "LO_VERSION:uuid:locale:en",
      "changeType": "REMOVED",
      "checksum": null,
      "contentUrl": null,
      "sizeBytes": null,
      "subject": "MATH",
      "gradeBand": "G3_5",
      "versionNumber": 1,
      "locale": "en",
      "changedAt": "2025-01-09T18:00:00Z"
    }
  ]
}
```

## School Deployment Workflow

### Initial Device Setup (Lab Refresh)

1. **Configure preload settings** in MDM/school admin portal:
   ```dart
   final config = PreloadConfiguration(
     tenantId: 'school_district_123',
     gradeBands: ['G3_5', 'G6_8'],  // School grade range
     subjects: ['ELA', 'MATH'],
     locales: ['en', 'es'],         // Bilingual school
     syncWindowStart: '06:00',       // Before school
     syncWindowEnd: '08:00',
     maxStorageBytes: 1024 * 1024 * 1024,  // 1GB
     wifiOnly: true,
   );
   ```

2. **Trigger bulk preload** on each device:
   ```dart
   final preloader = ContentPreloader(
     database: offlineDb,
     connectivity: connectivityService,
     baseUrl: 'https://api.aivo.ai',
   );
   
   await preloader.configure(config);
   await preloader.downloadPackage();
   ```

3. **Monitor progress** via progress stream:
   ```dart
   preloader.progressStream.listen((progress) {
     print('Downloaded ${progress.downloadedItems}/${progress.totalItems}');
     print('State: ${progress.state}');
   });
   ```

### Daily Delta Updates (Morning Connect)

1. **Schedule automatic sync** within connect window:
   ```dart
   // Run daily at 6:30 AM
   if (preloader.isInSyncWindow()) {
     await preloader.syncDeltas();
   }
   ```

2. **Handle WiFi-only constraint**:
   ```dart
   // Preloader automatically pauses if WiFi lost
   preloader.progressStream.listen((progress) {
     if (progress.state == PreloadState.paused) {
       showNotification('Content sync paused - waiting for WiFi');
     }
   });
   ```

3. **Resume incomplete syncs**:
   ```dart
   // On app startup, check for incomplete sync
   if (preloader.checkpoint != null) {
     await preloader.syncDeltas();  // Continues from checkpoint
   }
   ```

### MDM Integration

For large-scale deployments, integrate with MDM (Mobile Device Management):

```yaml
# Example MDM profile (Jamf, Mosyle, etc.)
aivo_content_preload:
  enabled: true
  tenant_id: "school_district_123"
  grade_bands:
    - "K_2"
    - "G3_5"
    - "G6_8"
  subjects:
    - "ELA"
    - "MATH"
  sync_window:
    start: "06:00"
    end: "08:00"
  max_storage_mb: 1024
  wifi_only: true
```

## Storage Management

### Cache Eviction Policy

The ContentPreloader uses LRU (Least Recently Used) eviction:

1. When storage quota exceeded, identify items by last access time
2. Remove oldest items until sufficient space available
3. Never evict content currently in active sessions

```dart
// Get cache statistics
final cacheSize = await db.getTotalCacheSize();
final maxSize = config.maxStorageBytes;
final usagePercent = cacheSize / maxSize;

if (usagePercent > 0.9) {
  // Approaching quota, show warning
  showStorageWarning();
}
```

### Content Priority

When evicting, prioritize keeping:
1. Content for student's current grade level
2. Recently accessed content
3. Content for upcoming assignments

### Manual Cache Management

```dart
// Clear all cached content (e.g., end of school year)
await preloader.clearCache();

// Clear specific subjects (e.g., after curriculum change)
await db.deleteContentBySubject('OLD_CURRICULUM');
```

## Monitoring & Observability

### Server-Side Metrics

Track these metrics in content-svc:

```typescript
// Package creation
counter('content_package_created', { tenant, status });
histogram('content_package_build_duration_seconds', buildTime);

// Manifest downloads
counter('content_manifest_downloaded', { tenant });
histogram('content_manifest_size_bytes', manifestSize);

// Delta requests
counter('content_delta_requests', { tenant });
histogram('content_delta_items_count', itemCount);
```

### Client-Side Metrics

```dart
// Report sync completion
analytics.track('content_sync_completed', {
  'duration_seconds': duration.inSeconds,
  'items_downloaded': progress.downloadedItems,
  'bytes_downloaded': progress.downloadedBytes,
  'items_failed': progress.failedItems,
});

// Report sync failures
analytics.track('content_sync_failed', {
  'error': progress.errorMessage,
  'state': progress.state.name,
  'items_before_failure': progress.downloadedItems,
});
```

## Error Handling

### Network Failures

```dart
try {
  await preloader.downloadPackage();
} on SocketException {
  // Network unavailable - will retry automatically
} on TimeoutException {
  // Request timeout - show retry option
}
```

### Checksum Failures

```dart
// Checksum mismatch triggers automatic retry
// After 3 failures, item marked as failed and skipped
// Report to server for investigation
```

### Storage Failures

```dart
// Insufficient storage after eviction
if (progress.state == PreloadState.failed && 
    progress.errorMessage?.contains('storage') == true) {
  showStorageFullDialog();
}
```

## Security Considerations

### Pre-signed URLs

- All content URLs are pre-signed with expiration
- Default expiration: 24 hours (configurable up to 168h)
- URLs tied to specific content version and locale

### Checksum Validation

- All downloaded content validated against SHA-256 checksum
- Prevents man-in-the-middle attacks
- Ensures content integrity

### Tenant Isolation

- Packages scoped to specific tenant
- Server validates tenant access before package creation
- Content from other tenants never included

## Database Schema

### ContentPackage Table

```prisma
model ContentPackage {
  id                 String                @id @default(uuid())
  tenantId           String
  gradeBands         LearningObjectGradeBand[]
  subjects           LearningObjectSubject[]
  locales            ContentLocale[]       @default([en])
  status             ContentPackageStatus  @default(PENDING)
  manifestUrl        String?
  totalItems         Int                   @default(0)
  totalSizeBytes     BigInt                @default(0)
  requestedAt        DateTime              @default(now())
  completedAt        DateTime?
  expiresAt          DateTime?
  requestedByUserId  String
  errorMessage       String?
}
```

### ContentVersionChange Table

```prisma
model ContentVersionChange {
  id                String
  loVersionId       String
  learningObjectId  String
  tenantId          String?
  subject           LearningObjectSubject
  gradeBand         LearningObjectGradeBand
  versionNumber     Int
  changeType        String  // ADDED, UPDATED, REMOVED
  checksum          String?
  sizeBytes         BigInt?
  locale            ContentLocale
  changedAt         DateTime @default(now())
}
```

## Related Documentation

- [Offline Architecture](../mobile/offline_architecture.md)
- [Content Service README](../../services/content-svc/README.md)
- [ts-types ContentPackage](../../libs/ts-types/src/contentPackage.ts)
- [Flutter ContentPreloader](../../libs/flutter-common/lib/offline/content_preloader.dart)
