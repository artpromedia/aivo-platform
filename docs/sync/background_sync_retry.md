# Background Sync & Retry Strategy

This document describes the background sync, retry logic, and conflict resolution policies implemented in the Aivo mobile apps.

## Overview

The sync system ensures reliable data synchronization between mobile devices and the backend, handling:
- Intermittent connectivity in school environments
- Multiple devices used by the same learner
- Battery and resource constraints
- Data integrity and consistency

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Mobile App                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐ │
│  │  SyncManager │◄────│SyncScheduler │◄────│ BackgroundSyncWorker     │ │
│  │              │     │  (backoff)   │     │ (workmanager triggers)   │ │
│  └──────┬───────┘     └──────────────┘     └──────────────────────────┘ │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐ │
│  │OfflineDB     │     │ Idempotency  │     │ SyncHealthWidgets        │ │
│  │(Drift/SQLite)│     │ Conflict Res │     │ (UI feedback)            │ │
│  └──────────────┘     └──────────────┘     └──────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────┐
                        │   Backend APIs    │
                        │ (session-svc, etc)│
                        └───────────────────┘
```

## Sync Triggers

The system triggers sync operations from multiple sources:

### 1. Connectivity Restoration
When network connectivity is restored after being offline:
- `ConnectivityService` detects online state
- One-time `workmanager` task is scheduled with 5-second delay
- Delay allows network to stabilize before sync attempt

### 2. App Foreground Resume
When the app returns from background:
- `SyncLifecycleHandler.handleAppResumed()` is called
- Checks if sync is due (respects backoff schedule)
- Executes sync if conditions are met

### 3. Periodic Background Sync
Regular background execution:
- Android: Minimum 15 minutes (OS limitation)
- iOS: System-managed based on app usage patterns
- Configured interval: 30 minutes (default)
- Respects battery and network constraints

### 4. Manual Sync
User-initiated via "Sync Now" button:
- Bypasses backoff schedule
- Resets failure count on success

## Exponential Backoff Strategy

### Backoff Intervals

The system uses increasing delays after consecutive failures:

| Level | Delay | Scenario |
|-------|-------|----------|
| 0 | Immediate | First attempt, success resets here |
| 1 | 1 minute | First failure |
| 2 | 5 minutes | Second consecutive failure |
| 3 | 15 minutes | Third consecutive failure |
| 4 | 1 hour | Fourth consecutive failure |
| 5 | 6 hours | Fifth+ failures (cap) |

### Implementation

```dart
class SyncScheduler {
  static const defaultBackoffIntervals = [1, 5, 15, 60, 360]; // minutes
  static const maxRetryAttempts = 10;
  
  Future<void> recordFailure(String? errorMessage) async {
    final newLevel = (state.currentBackoffLevel + 1)
        .clamp(0, backoffIntervals.length - 1);
    final delay = Duration(minutes: backoffIntervals[newLevel]);
    // Schedule next sync attempt
  }
}
```

### Recovery Behavior

- **Success**: Resets backoff level to 0, clears failure count
- **Transient Failure**: Increments backoff level
- **Permanent Failure**: Marks item as "abandoned" after max retries

## Error Classification

Errors are categorized to determine retry behavior:

### Transient Errors (Will Retry)
- **Network**: Connection refused, socket errors, DNS failures
- **Server Errors**: HTTP 500, 502, 503, 504
- **Timeout**: Request timeouts
- **Rate Limited**: HTTP 429

### Permanent Errors (No Retry)
- **Client Errors**: HTTP 400, 401, 403, 404
- **Validation**: Invalid data format
- **Conflict**: HTTP 409 (handled specially)

```dart
static bool isTransient(ErrorCategory category) {
  return switch (category) {
    ErrorCategory.network => true,
    ErrorCategory.serverError => true,
    ErrorCategory.timeout => true,
    ErrorCategory.rateLimited => true,
    _ => false,
  };
}
```

## Idempotency & Deduplication

### Client Event IDs

Every event includes a `clientEventId` (UUID v4/v5) for deduplication:

```dart
// Deterministic for content-based deduplication
final key = generator.generateDeterministic(
  learnerId: 'learner-123',
  eventType: 'activity_started',
  timestamp: startTime,
);

// Random for unique events
final key = generator.generateRandom();
```

### Server Deduplication

1. Client sends batch of events with `clientEventId` fields
2. Server checks which IDs already exist
3. Server returns categorized response:
   - `accepted`: New events, successfully stored
   - `duplicates`: Events that already existed (from retry)
   - `rejected`: Events with validation errors

### Batch Processing

```dart
final result = await processor.processBatch(
  events: pendingEvents,
  checkExistingEvents: (ids) => api.checkEventIds(ids),
);
// result.events - ready to send
// result.skippedIds - duplicates removed locally
// result.conflicts - validation issues
```

## Conflict Scenarios

### Same Learner, Multiple Devices

**Scenario**: Learner uses tablet at school, continues on phone at home (both offline)

**Solution**:
1. Each device generates events with unique `clientEventId`
2. Both sync when online
3. Server merges sessions based on timestamp ordering
4. Duplicate prevention via `clientEventId` unique constraint

### Concurrent Session Modification

**Scenario**: Teacher edits plan while learner completes activity

**Resolution Policy**: Last-write-wins for metadata, merge for events

```dart
final merged = resolver.handleConcurrentSession(
  localSession: localData,
  serverSession: serverData,
  localModified: localTimestamp,
  serverModified: serverTimestamp,
);
```

### Out-of-Order Events

**Scenario**: Events arrive at server in different order than generated

**Solution**:
- Events include `sequenceNumber` within session
- Server reorders events during aggregation
- Client includes timestamp for secondary ordering

## Item-Level Retry Tracking

Individual items (sessions, events) have their own retry tracking:

```dart
final tracker = ItemRetryTracker(maxRetries: 10);

// On failure
tracker.recordFailure('session-123', 'Network error');
if (!tracker.canRetry('session-123')) {
  // Mark as abandoned
}

// On success
tracker.recordSuccess('session-123');

// Get stuck items for UI display
final abandoned = tracker.getAbandonedItems();
```

## UX for Sync Status

### Learner View (Simple)

Minimal distraction - single indicator:
```
☁️ Last synced: 5m ago
```

States:
- ✅ Green cloud: All synced
- 🔄 Blue spinner: Syncing
- ⏳ Orange cloud: Items pending
- ❌ Red cloud: Offline or errors

### Teacher View (Detailed)

Full sync health panel:
```
┌─────────────────────────────────────┐
│ ✅ Sync Health          [Sync Now] │
│ All data synced                     │
├─────────────────────────────────────┤
│ 📅 Last synced: 2m ago              │
│ ⬆️ Pending items: 0                 │
│ ❌ Failed items: 0                  │
│ ⚠️ Stuck items: 0                   │
└─────────────────────────────────────┘
```

When issues exist:
```
┌─────────────────────────────────────┐
│ ⚠️ Sync Health          [Sync Now] │
│ Some items stuck                    │
├─────────────────────────────────────┤
│ 📅 Last synced: 3h ago              │
│ ⬆️ Pending items: 15                │
│ ❌ Failed items: 2                  │
│ ⚠️ Stuck items: 3        [Reset]   │
├─────────────────────────────────────┤
│ ❌ Network timeout                  │
└─────────────────────────────────────┘
```

## Battery & Resource Constraints

### Android WorkManager Constraints

```dart
await Workmanager().registerPeriodicTask(
  taskName,
  taskName,
  constraints: Constraints(
    networkType: NetworkType.connected,
    requiresBatteryNotLow: true,  // Don't sync below 15% battery
  ),
  backoffPolicy: BackoffPolicy.exponential,
);
```

### iOS Background App Refresh

- System manages frequency based on user behavior
- Battery state considered automatically
- Background processing limited to ~30 seconds

## Integration Example

```dart
// In app initialization
final syncWorker = BackgroundSyncWorker(
  database: offlineDatabase,
  connectivityService: connectivity,
  scheduler: SyncScheduler(database: offlineDatabase),
  syncExecutor: (trigger) => _performSync(trigger),
);

await syncWorker.initialize();

// In lifecycle handler
@override
void didChangeAppLifecycleState(AppLifecycleState state) {
  if (state == AppLifecycleState.resumed) {
    syncWorker.onAppResumed();
  }
}

// Sync execution
Future<BackgroundSyncResult> _performSync(SyncTrigger trigger) async {
  final stopwatch = Stopwatch()..start();
  
  try {
    await syncManager.syncNow();
    
    return BackgroundSyncResult(
      success: true,
      trigger: trigger,
      duration: stopwatch.elapsed,
    );
  } catch (e) {
    return BackgroundSyncResult.failure(trigger, e.toString());
  }
}
```

## Testing

### Unit Tests

- `sync_scheduler_test.dart`: Backoff calculation, state persistence
- `idempotency_test.dart`: Key generation, deduplication
- `sync_health_widgets_test.dart`: UI component behavior

### Integration Testing

1. Start offline, perform activities
2. Go online, verify sync completes
3. Force network error, verify backoff
4. Simulate duplicate events, verify deduplication

## Files

| File | Purpose |
|------|---------|
| `sync_scheduler.dart` | Backoff logic, state persistence |
| `background_sync_worker.dart` | WorkManager integration |
| `idempotency.dart` | Key generation, conflict resolution |
| `sync_health_widgets.dart` | UI components |
| `sync_manager.dart` | Core sync orchestration |

## See Also

- [Offline Architecture](../mobile/offline_architecture.md)
- [Content Packaging](../content/content_packaging_delta_updates.md)
- [Session Event Model](../activity/session_event_model.md)
