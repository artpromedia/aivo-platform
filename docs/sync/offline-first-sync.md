# Offline-First Synchronization System

## Overview

The AIVO mobile learning platform implements a robust offline-first synchronization system that enables learners to continue their educational journey without an internet connection. This document covers the architecture, implementation details, and usage guidelines for the sync system.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile Client                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Sync       │  │  Local      │  │  Connectivity           │  │
│  │  Engine     │  │  Database   │  │  Manager                │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌───────────┴─────────────┐  │
│  │  Conflict   │  │  Change     │  │  Background             │  │
│  │  Resolver   │  │  Tracker    │  │  Sync Service           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Sync Service                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Sync API   │  │  WebSocket  │  │  Conflict               │  │
│  │  Controller │  │  Handler    │  │  Resolver               │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│  ┌──────┴────────────────┴──────────────────────┴─────────────┐  │
│  │                    Sync Service Core                        │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│  ┌───────────────────────────┴───────────────────────────────┐   │
│  │                      PostgreSQL + Redis                    │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User Action → Local Database (optimistic update)
2. Queue sync operation
3. When online: Push changes to server
4. Detect conflicts → Resolve automatically or prompt user
5. Pull server changes → Merge with local state
6. Update UI with final state
```

## Features

### 1. Offline Lesson Access

Learners can download lessons for offline use:

```dart
// Download a lesson for offline access
await SyncEngine.instance.downloadForOffline(lessonId);

// Check if lesson is available offline
final isAvailable = await LocalDatabase.instance.isLessonAvailable(lessonId);

// Access offline lesson content
final lesson = await LocalDatabase.instance.getLesson(lessonId);
```

### 2. Response Queuing

All learner responses are immediately saved locally and queued for sync:

```dart
// Submit a response (works offline)
final response = Response(
  id: uuid(),
  lessonId: lessonId,
  blockId: blockId,
  answer: selectedAnswer,
  timestamp: DateTime.now(),
);

await SyncEngine.instance.queueOperation(
  SyncOperation(
    id: uuid(),
    entityType: EntityType.response,
    entityId: response.id,
    operation: OperationType.create,
    data: response.toJson(),
    timestamp: DateTime.now(),
    clientVersion: 1,
  ),
);
```

### 3. Optimistic Updates

The UI immediately reflects user actions:

```dart
// Example: Update progress locally before sync
await LocalDatabase.instance.updateProgress(
  lessonId: lessonId,
  progress: 0.75,
);

// Queue sync operation
await SyncEngine.instance.queueOperation(...);

// UI shows updated progress immediately
```

### 4. Conflict Resolution

The system supports multiple conflict resolution strategies:

| Entity Type | Strategy | Rationale |
|-------------|----------|-----------|
| Response | Client Wins | Learner's answers are authoritative |
| Progress | Merge | Combine progress from multiple devices |
| Skill Mastery | Server Wins | Server has authoritative calculations |
| Settings | Last Write Wins | Most recent preference applies |
| Notes | Merge | Preserve content from both sources |

#### Custom Conflict Resolution

```dart
// Handle conflicts manually
SyncEngine.instance.conflictStream.listen((conflict) {
  showConflictDialog(
    context,
    conflict: conflict,
    onResolve: (resolution) async {
      await SyncEngine.instance.resolveConflict(
        conflict.id,
        resolution,
      );
    },
  );
});
```

### 5. Delta Sync

Only changed data is transferred to minimize bandwidth:

```dart
// Server endpoint calculates deltas
POST /api/v1/sync/delta
{
  "entityType": "progress",
  "entityId": "progress-123",
  "clientVersion": 3,
  "clientFields": {
    "lessonsCompleted": 5,
    "totalTimeSpent": 3600
  }
}

// Response contains only changed fields
{
  "hasChanges": true,
  "serverVersion": 5,
  "fieldDeltas": [
    {
      "field": "lessonsCompleted",
      "clientValue": 5,
      "serverValue": 7,
      "hasConflict": false
    }
  ]
}
```

### 6. Background Sync

Sync operations continue even when the app is backgrounded:

```dart
// Register background sync task
await BackgroundSyncService.instance.registerPeriodicSync(
  minInterval: const Duration(minutes: 15),
);

// Schedule immediate sync when coming online
await BackgroundSyncService.instance.scheduleImmediateSync();
```

### 7. Multi-Device Sync

Real-time sync across devices using WebSocket:

```typescript
// WebSocket connection for instant updates
const ws = new WebSocket('wss://api.aivo.com/ws');

ws.send(JSON.stringify({
  type: 'subscribe',
  payload: { entityTypes: ['progress', 'learning_session'] }
}));

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'change_notification') {
    // Pull and apply changes
    syncEngine.pullChanges();
  }
};
```

## API Reference

### REST Endpoints

#### Push Changes
```http
POST /api/v1/sync/push
Authorization: Bearer <token>
X-Device-ID: device-uuid

{
  "deviceId": "device-uuid",
  "lastSyncTimestamp": "2024-01-15T10:30:00Z",
  "operations": [
    {
      "id": "op-uuid",
      "entityType": "response",
      "entityId": "response-uuid",
      "operation": "CREATE",
      "data": { ... },
      "timestamp": "2024-01-15T10:35:00Z",
      "clientVersion": 1
    }
  ]
}
```

#### Pull Changes
```http
POST /api/v1/sync/pull
Authorization: Bearer <token>
X-Device-ID: device-uuid

{
  "deviceId": "device-uuid",
  "lastSyncTimestamp": "2024-01-15T10:30:00Z",
  "entityTypes": ["progress", "skill_mastery"],
  "limit": 100
}
```

#### Get Conflicts
```http
GET /api/v1/sync/conflicts
Authorization: Bearer <token>
```

#### Resolve Conflict
```http
POST /api/v1/sync/conflicts/:conflictId/resolve
Authorization: Bearer <token>

{
  "resolution": "merge",
  "mergedData": { ... }
}
```

### WebSocket Messages

#### Client → Server

| Type | Payload | Description |
|------|---------|-------------|
| `subscribe` | `{ entityTypes: string[] }` | Subscribe to entity changes |
| `unsubscribe` | `{ entityTypes: string[] }` | Unsubscribe from entity changes |
| `push_change` | `{ operations: SyncOperation[] }` | Push changes via WebSocket |
| `ping` | `{}` | Keep-alive ping |

#### Server → Client

| Type | Payload | Description |
|------|---------|-------------|
| `change_notification` | `{ entityType, entityId, operation, version }` | Notify of changes |
| `conflict_notification` | `{ conflictId, entityType, suggestedResolution }` | New conflict detected |
| `sync_complete` | `{ success, timestamp }` | Sync operation completed |
| `pong` | `{}` | Keep-alive response |

## Database Schema

### Local (SQLite) Tables

```sql
-- Lessons cache
CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  downloaded_at TEXT,
  expires_at TEXT
);

-- Entity change tracking
CREATE TABLE entity_history (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  old_data TEXT,
  new_data TEXT,
  timestamp TEXT NOT NULL,
  synced INTEGER DEFAULT 0
);

-- Sync queue
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  data TEXT,
  timestamp TEXT NOT NULL,
  client_version INTEGER,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0
);
```

### Server (PostgreSQL) Tables

```sql
-- Sync conflicts
CREATE TABLE sync_conflicts (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  client_data JSONB NOT NULL,
  server_data JSONB NOT NULL,
  client_version INTEGER,
  server_version INTEGER,
  status TEXT DEFAULT 'pending',
  suggested_resolution TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Syncable entities (example)
CREATE TABLE sync_learning_sessions (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  device_id TEXT,
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Best Practices

### 1. Queue Management

```dart
// Clear completed operations periodically
await SyncQueue.instance.clearCompleted(
  olderThan: const Duration(days: 7),
);

// Monitor queue health
final stats = SyncQueue.instance.getStats();
if (stats.failed > 10) {
  notifyUser('Some changes failed to sync');
}
```

### 2. Bandwidth Optimization

```dart
// Only sync when on good connection
if (ConnectivityManager.instance.isSuitableForBackgroundSync) {
  await SyncEngine.instance.performFullSync();
}

// Use delta sync for large entities
await SyncEngine.instance.performDeltaSync(entityType, entityId);
```

### 3. Storage Management

```dart
// Prune old cache periodically
await LocalDatabase.instance.pruneCache(
  maxAge: const Duration(days: 30),
  maxSize: 500 * 1024 * 1024, // 500 MB
);
```

### 4. Error Handling

```dart
try {
  await SyncEngine.instance.performSync();
} on SyncConflictException catch (e) {
  // Handle conflicts
  showConflictResolutionUI(e.conflicts);
} on NetworkException catch (e) {
  // Queue for later
  showOfflineNotification();
} catch (e) {
  // Log and report
  logError('Sync failed', error: e);
}
```

## Monitoring & Debugging

### Sync Status Widget

```dart
SyncStatusStreamBuilder(
  builder: (context, state, pendingCount) {
    return SyncStatusIndicator(
      state: state,
      pendingCount: pendingCount,
      showLabel: true,
    );
  },
)
```

### Logging

```dart
// Enable verbose sync logging
SyncEngine.instance.setLogLevel(SyncLogLevel.verbose);

// Log sync events
SyncEngine.instance.events.listen((event) {
  analytics.track('sync_event', {
    'type': event.type,
    'success': event.success,
    'duration': event.duration.inMilliseconds,
  });
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Sync stuck in pending | Network issues | Check connectivity, retry manually |
| Frequent conflicts | Multiple devices | Use WebSocket for real-time sync |
| High bandwidth usage | Large payloads | Enable delta sync |
| Background sync not working | OS restrictions | Check WorkManager permissions |

### Debug Commands

```dart
// Force full sync
await SyncEngine.instance.performFullSync(force: true);

// Clear local database
await LocalDatabase.instance.reset();

// Export sync logs
final logs = await SyncEngine.instance.exportLogs();
```

## Security Considerations

1. **Authentication**: All sync requests require valid JWT tokens
2. **Authorization**: Server validates tenant/user ownership
3. **Data Encryption**: SQLite database uses encryption at rest
4. **Transport Security**: All communications use TLS 1.3
5. **Conflict Auditing**: All conflict resolutions are logged

## Performance Metrics

| Metric | Target | Monitoring |
|--------|--------|------------|
| Sync latency | < 500ms | Prometheus histogram |
| Conflict rate | < 1% | Daily aggregate |
| Queue drain time | < 30s | Real-time gauge |
| Background sync success | > 95% | Weekly report |
