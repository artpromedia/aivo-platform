# Aivo Offline & Low-Bandwidth Architecture

> Principal Mobile & Edge Architecture for Flutter Apps

## Executive Summary

This document defines the offline-first architecture for Aivo's Flutter mobile applications, designed to handle the real-world constraints of K-12 education environments:

- **Spotty Wi-Fi** in schools and homes
- **Strict proxies** and bandwidth caps
- **Shared devices** (iPads, Chromebooks)
- **Mid-lesson connectivity loss**
- **Cross-device session resumption**

---

## 1. Offline Scope by App

### 1.1 Learner App (Full Offline Support)

| Feature | Offline Support | Notes |
|---------|-----------------|-------|
| Launch Today Plan | ✅ Full | Pre-fetched during online window |
| Complete activities | ✅ Full | Content cached locally |
| Save answers/events | ✅ Full | Queued in local SQLite |
| Track focus/breaks | ✅ Full | Local event recording |
| Resume later | ✅ Full | Same or different device |
| New plan generation | ❌ Online only | Requires AI backend |
| Homework Helper | ⚠️ Partial | Cached steps only, no new AI |

### 1.2 Teacher App (Low-Bandwidth Support)

| Feature | Offline Support | Notes |
|---------|-----------------|-------|
| Mark attendance | ✅ Full | Queued for sync |
| Quick notes | ✅ Full | Local storage + sync |
| Session start/stop | ✅ Full | Local state + events |
| View student list | ✅ Cached | Last sync data |
| Real-time analytics | ❌ Online only | Requires live data |
| Plan modifications | ⚠️ Partial | Cached current plans |

### 1.3 Parent App (Online-First with Cache)

| Feature | Offline Support | Notes |
|---------|-----------------|-------|
| View last summary | ✅ Cached | Stale-while-revalidate |
| View progress history | ✅ Cached | Local cache |
| Send messages | ⚠️ Queued | Sync when online |
| Real-time updates | ❌ Online only | — |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Flutter App Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ UI Widgets  │  │ Controllers │  │   Riverpod Providers    │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
│         │                │                      │               │
│         └────────────────┼──────────────────────┘               │
│                          ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    SyncManager                             │ │
│  │  • preloadForToday()  • recordEvent()  • syncNow()        │ │
│  └────────────────────────────┬──────────────────────────────┘ │
│                               │                                 │
│         ┌─────────────────────┼─────────────────────┐          │
│         ▼                     ▼                     ▼          │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────┐   │
│  │ Drift DB    │    │ ConnectivitySvc │    │ API Clients  │   │
│  │ (SQLite)    │    │ (Online/Offline)│    │ (REST)       │   │
│  └─────────────┘    └─────────────────┘    └──────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Local Data Model (Drift/SQLite)

### 3.1 Table: `offline_learners`

Cached learner profiles for offline display and session attribution.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `learner_id` | TEXT | PK | Learner's server ID |
| `display_name` | TEXT | NOT NULL | Display name |
| `grade_band` | TEXT | NOT NULL | Grade band (K-2, 3-5, 6-8, 9-12) |
| `avatar_url` | TEXT | NULLABLE | Cached avatar URL |
| `preferences_json` | TEXT | NULLABLE | Accessibility/focus preferences |
| `last_synced_at` | INTEGER | NOT NULL | Unix timestamp |

### 3.2 Table: `offline_sessions`

Local session records for both offline-started and online sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `local_session_id` | TEXT | PK | UUID generated locally |
| `server_session_id` | TEXT | NULLABLE | Server ID after sync |
| `learner_id` | TEXT | FK → offline_learners | Owner |
| `subject` | TEXT | NOT NULL | Domain (MATH, ELA, etc.) |
| `session_type` | TEXT | NOT NULL | LEARNING, ASSESSMENT, HOMEWORK |
| `status` | TEXT | NOT NULL | PENDING_SYNC, SYNCHRONIZED, FAILED |
| `origin` | TEXT | NOT NULL | ONLINE, OFFLINE |
| `started_at` | INTEGER | NOT NULL | Unix timestamp |
| `ended_at` | INTEGER | NULLABLE | Unix timestamp |
| `plan_json` | TEXT | NULLABLE | Cached today plan JSON |
| `error_message` | TEXT | NULLABLE | Sync failure reason |
| `retry_count` | INTEGER | DEFAULT 0 | Sync retry attempts |
| `last_updated_at` | INTEGER | NOT NULL | Last modification |

### 3.3 Table: `offline_events`

Event queue for all learner interactions awaiting sync.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK AUTOINCREMENT | Local event ID |
| `local_session_id` | TEXT | FK → offline_sessions | Parent session |
| `event_type` | TEXT | NOT NULL | LEARNING_EVENT, FOCUS_EVENT, etc. |
| `event_json` | TEXT | NOT NULL | Full event payload |
| `status` | TEXT | NOT NULL | PENDING_SYNC, SYNCHRONIZED, FAILED |
| `sequence_num` | INTEGER | NOT NULL | Ordering within session |
| `created_at` | INTEGER | NOT NULL | Unix timestamp |
| `synced_at` | INTEGER | NULLABLE | When synced |
| `error_message` | TEXT | NULLABLE | Sync failure reason |

### 3.4 Table: `offline_content_cache`

Cached learning content for offline activities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `content_key` | TEXT | PK | `LO_VERSION:{id}:locale:{locale}` |
| `content_type` | TEXT | NOT NULL | lesson, exercise, video, etc. |
| `subject` | TEXT | NOT NULL | Domain |
| `grade_band` | TEXT | NOT NULL | Target grade band |
| `json_payload` | TEXT | NOT NULL | Full content JSON |
| `media_paths_json` | TEXT | NULLABLE | Local media file paths |
| `size_bytes` | INTEGER | NOT NULL | Payload size for cache mgmt |
| `expires_at` | INTEGER | NOT NULL | Cache expiration |
| `created_at` | INTEGER | NOT NULL | Cache timestamp |

### 3.5 Table: `offline_sync_queue`

High-level sync queue for batch operations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK AUTOINCREMENT | Queue entry ID |
| `operation_type` | TEXT | NOT NULL | SESSION_CREATE, EVENTS_BATCH, etc. |
| `payload_json` | TEXT | NOT NULL | Operation data |
| `priority` | INTEGER | DEFAULT 5 | 1=highest, 10=lowest |
| `status` | TEXT | NOT NULL | PENDING, IN_PROGRESS, DONE, FAILED |
| `created_at` | INTEGER | NOT NULL | — |
| `last_attempt_at` | INTEGER | NULLABLE | — |
| `retry_count` | INTEGER | DEFAULT 0 | — |
| `error_message` | TEXT | NULLABLE | — |

---

## 4. SyncManager Service

### 4.1 Core Responsibilities

```dart
abstract class SyncManager {
  /// Check if we can reach the API server
  Future<bool> get isOnline;
  
  /// Stream of connectivity changes
  Stream<bool> get connectivityStream;
  
  /// Pre-fetch today's plan and required content
  Future<PreloadResult> preloadForToday(String learnerId);
  
  /// Record a learner event (queued locally)
  Future<void> recordEvent(String localSessionId, LearnerEvent event);
  
  /// Start a new local session
  Future<OfflineSession> startSession({
    required String learnerId,
    required String subject,
    required SessionType type,
  });
  
  /// End a local session
  Future<void> endSession(String localSessionId);
  
  /// Trigger immediate sync attempt
  Future<SyncResult> syncNow({bool force = false});
  
  /// Get sync status for UI display
  SyncStatus get currentStatus;
  
  /// Clear expired cache entries
  Future<void> pruneCache();
}
```

### 4.2 `preloadForToday(learnerId)`

```dart
Future<PreloadResult> preloadForToday(String learnerId) async {
  // 1. Fetch today's plan from API
  final plan = await _planService.generateTodaysPlan(learnerId);
  
  // 2. Extract required content IDs
  final contentIds = plan.activities.map((a) => a.contentId).toList();
  
  // 3. Fetch content that isn't cached
  final uncachedIds = await _db.findUncachedContent(contentIds);
  final content = await _contentService.batchFetchContent(uncachedIds);
  
  // 4. Save to local DB
  await _db.transaction(() async {
    // Upsert learner profile
    await _db.upsertLearner(learnerId, plan.learnerSnapshot);
    
    // Create session skeleton
    final localSessionId = _uuid.v4();
    await _db.insertSession(OfflineSession(
      localSessionId: localSessionId,
      learnerId: learnerId,
      subject: plan.primaryDomain,
      sessionType: SessionType.learning,
      status: SyncStatus.synchronized, // Plan came from server
      origin: SessionOrigin.online,
      startedAt: DateTime.now(),
      planJson: jsonEncode(plan.toJson()),
    ));
    
    // Cache content
    for (final c in content) {
      await _db.upsertContent(c);
    }
  });
  
  return PreloadResult(
    success: true,
    activitiesReady: contentIds.length,
    bytesDownloaded: _calculateSize(content),
  );
}
```

### 4.3 `recordEvent(localSessionId, event)`

```dart
Future<void> recordEvent(String localSessionId, LearnerEvent event) async {
  final sequenceNum = await _db.getNextSequenceNum(localSessionId);
  
  await _db.insertEvent(OfflineEvent(
    localSessionId: localSessionId,
    eventType: event.type.name,
    eventJson: jsonEncode(event.toJson()),
    status: SyncStatus.pendingSync,
    sequenceNum: sequenceNum,
    createdAt: DateTime.now(),
  ));
  
  // If online, trigger background sync
  if (await isOnline) {
    _scheduleSyncDebounced();
  }
}
```

### 4.4 `syncNow()`

```dart
Future<SyncResult> syncNow({bool force = false}) async {
  if (!await isOnline && !force) {
    return SyncResult.offline();
  }
  
  final results = SyncResult();
  
  try {
    // 1. Sync sessions without server IDs first
    final pendingSessions = await _db.getSessionsToSync();
    for (final session in pendingSessions) {
      if (session.serverSessionId == null) {
        try {
          final serverSession = await _sessionService.createSession(
            learnerId: session.learnerId,
            subject: session.subject,
            type: session.sessionType,
            startedAt: session.startedAt,
            offlineOrigin: session.origin == SessionOrigin.offline,
            localSessionId: session.localSessionId, // For idempotency
          );
          
          await _db.updateSession(
            session.localSessionId,
            serverSessionId: serverSession.id,
            status: SyncStatus.synchronized,
          );
          results.sessionsSynced++;
        } catch (e) {
          await _db.markSessionFailed(session.localSessionId, e.toString());
          results.sessionsFailed++;
        }
      }
    }
    
    // 2. Sync pending events in batches
    final pendingEvents = await _db.getEventsToSync(limit: 100);
    if (pendingEvents.isNotEmpty) {
      // Group by session
      final bySession = _groupBySession(pendingEvents);
      
      for (final entry in bySession.entries) {
        final session = await _db.getSession(entry.key);
        if (session?.serverSessionId == null) continue; // Skip if session not synced
        
        try {
          await _eventService.batchUploadEvents(
            sessionId: session!.serverSessionId!,
            events: entry.value.map((e) => e.toServerEvent()).toList(),
          );
          
          await _db.markEventsSynced(entry.value.map((e) => e.id).toList());
          results.eventsSynced += entry.value.length;
        } catch (e) {
          await _db.markEventsFailed(
            entry.value.map((e) => e.id).toList(),
            e.toString(),
          );
          results.eventsFailed += entry.value.length;
        }
      }
    }
    
    results.success = results.sessionsFailed == 0 && results.eventsFailed == 0;
  } catch (e) {
    results.success = false;
    results.error = e.toString();
  }
  
  return results;
}
```

---

## 5. Connectivity Awareness

### 5.1 ConnectivityService

```dart
class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  final BehaviorSubject<ConnectionState> _stateSubject = 
      BehaviorSubject.seeded(ConnectionState.unknown);
  
  Stream<ConnectionState> get stateStream => _stateSubject.stream;
  ConnectionState get currentState => _stateSubject.value;
  bool get isOnline => currentState == ConnectionState.online;
  
  Future<void> initialize() async {
    // Initial check
    await _checkConnectivity();
    
    // Listen for changes
    _connectivity.onConnectivityChanged.listen((result) {
      _handleConnectivityChange(result);
    });
  }
  
  Future<void> _checkConnectivity() async {
    final result = await _connectivity.checkConnectivity();
    await _handleConnectivityChange(result);
  }
  
  Future<void> _handleConnectivityChange(List<ConnectivityResult> results) async {
    final hasConnection = results.any((r) => 
      r == ConnectivityResult.wifi || 
      r == ConnectivityResult.mobile ||
      r == ConnectivityResult.ethernet
    );
    
    if (hasConnection) {
      // Verify actual internet connectivity
      final reachable = await _pingServer();
      _stateSubject.add(reachable ? ConnectionState.online : ConnectionState.offline);
    } else {
      _stateSubject.add(ConnectionState.offline);
    }
  }
  
  Future<bool> _pingServer() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/health'),
      ).timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}

enum ConnectionState { online, offline, unknown }
```

### 5.2 Auto-Sync on Reconnect

```dart
class SyncManagerImpl implements SyncManager {
  late final StreamSubscription _connectivitySub;
  Timer? _syncDebouncer;
  
  void _setupConnectivityListener() {
    _connectivitySub = _connectivityService.stateStream
        .distinct()
        .listen((state) {
      if (state == ConnectionState.online) {
        _scheduleSync(delay: const Duration(seconds: 2));
      }
    });
  }
  
  void _scheduleSync({Duration delay = const Duration(seconds: 1)}) {
    _syncDebouncer?.cancel();
    _syncDebouncer = Timer(delay, () {
      syncNow();
    });
  }
  
  void _scheduleSyncWithBackoff(int attempt) {
    final delay = Duration(seconds: math.min(30, math.pow(2, attempt).toInt()));
    _scheduleSync(delay: delay);
  }
}
```

---

## 6. Conflict Resolution

### 6.1 Core Principles

1. **Server is source of truth** for final session state
2. **Offline events are append-only** — never overwrite server data
3. **Idempotency via local IDs** — each event has a unique local ID
4. **Graceful degradation** — failures don't block the learner

### 6.2 Conflict Scenarios

#### Scenario A: Session Already Closed on Server

```dart
Future<void> _handleSessionConflict(
  OfflineSession localSession,
  SessionConflictError error,
) async {
  if (error.type == ConflictType.sessionAlreadyClosed) {
    // Option 1: Create a new continuation session
    final newSession = await _sessionService.createSession(
      learnerId: localSession.learnerId,
      subject: localSession.subject,
      type: localSession.sessionType,
      parentSessionId: error.serverSessionId, // Link to original
      offlineOrigin: true,
      continuationOf: localSession.localSessionId,
    );
    
    // Update local mapping
    await _db.updateSession(
      localSession.localSessionId,
      serverSessionId: newSession.id,
      status: SyncStatus.synchronized,
    );
  }
}
```

#### Scenario B: Duplicate Events Detected

```dart
// Server-side: Events have localEventId for deduplication
// POST /sessions/:id/events accepts localEventId
// Server ignores events with duplicate localEventId

// Client-side: Always send localEventId
await _eventService.batchUploadEvents(
  sessionId: serverSessionId,
  events: events.map((e) => ServerEvent(
    localEventId: e.id.toString(), // Unique local ID
    type: e.eventType,
    payload: e.eventJson,
    timestamp: e.createdAt,
  )).toList(),
);
```

#### Scenario C: Stale Plan Data

```dart
Future<TodaysPlan> getCurrentPlan(String learnerId) async {
  final cached = await _db.getCachedPlan(learnerId);
  
  if (await isOnline) {
    try {
      // Always try to get fresh plan when online
      final fresh = await _planService.getTodaysPlan(learnerId);
      await _db.updateCachedPlan(learnerId, fresh);
      return fresh;
    } catch (e) {
      // Fall back to cached if online but API fails
      if (cached != null && !cached.isExpired) {
        return cached.plan;
      }
      rethrow;
    }
  }
  
  // Offline: use cached plan
  if (cached != null) {
    return cached.plan;
  }
  
  throw OfflineException('No cached plan available');
}
```

### 6.3 Conflict Resolution Matrix

| Scenario | Detection | Resolution |
|----------|-----------|------------|
| Session already exists | 409 Conflict | Use existing server session ID |
| Session already closed | 409 Conflict | Create continuation session |
| Duplicate event | 409 or silent | Server deduplicates by localEventId |
| Stale content version | Version mismatch | Log warning, use cached |
| Unknown learner | 404 | Clear local data, require re-auth |
| Token expired | 401 | Trigger re-authentication |

---

## 7. Data Flow Diagrams

### 7.1 Start Activity (Online)

```
┌─────────┐    ┌────────────┐    ┌──────────────┐    ┌──────────┐
│  User   │───▶│ SyncManager│───▶│ Plan Service │───▶│  Server  │
│ taps    │    │ preload()  │    │   (REST)     │    │          │
│"Start"  │    └─────┬──────┘    └──────────────┘    └──────────┘
└─────────┘          │
                     ▼
              ┌─────────────┐
              │  Drift DB   │
              │ (cache plan │
              │ + content)  │
              └─────────────┘
```

### 7.2 Complete Activity (Offline)

```
┌─────────┐    ┌────────────┐    ┌─────────────┐
│  User   │───▶│ Controller │───▶│ SyncManager │
│completes│    │            │    │ recordEvent │
│activity │    └────────────┘    └──────┬──────┘
└─────────┘                             │
                                        ▼
                                 ┌─────────────┐
                                 │  Drift DB   │
                                 │ offline_    │
                                 │ events      │
                                 │ (PENDING)   │
                                 └─────────────┘
```

### 7.3 Sync on Reconnect

```
┌────────────┐    ┌────────────┐    ┌─────────────┐    ┌──────────┐
│Connectivity│───▶│ SyncManager│───▶│  Drift DB   │───▶│  Server  │
│ online!    │    │  syncNow() │    │ get pending │    │  (REST)  │
└────────────┘    └─────┬──────┘    └─────────────┘    └────┬─────┘
                        │                                    │
                        │◀───────── success ────────────────┘
                        ▼
                 ┌─────────────┐
                 │  Drift DB   │
                 │ mark SYNCED │
                 └─────────────┘
```

---

## 8. Cache Management

### 8.1 Cache Policies

| Content Type | Max Age | Max Size | Eviction |
|--------------|---------|----------|----------|
| Today Plan | 24 hours | N/A | Replace on refresh |
| Learning Objects | 7 days | 100MB | LRU |
| Media (images) | 30 days | 200MB | LRU |
| Media (video) | 3 days | 500MB | LRU, low priority |
| Learner Profile | 7 days | N/A | Replace on sync |

### 8.2 Cache Eviction

```dart
Future<void> pruneCache() async {
  final now = DateTime.now();
  
  // 1. Remove expired content
  await _db.deleteExpiredContent(now);
  
  // 2. Check total size
  final totalSize = await _db.getTotalCacheSize();
  final maxSize = await _getMaxCacheSize(); // Device-dependent
  
  if (totalSize > maxSize) {
    // LRU eviction
    final toEvict = await _db.getLRUContent(
      targetSize: totalSize - maxSize,
    );
    await _db.deleteContent(toEvict);
  }
  
  // 3. Remove orphaned events (synced + older than 7 days)
  await _db.deleteOldSyncedEvents(
    olderThan: now.subtract(const Duration(days: 7)),
  );
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

```dart
group('SyncManager', () {
  late MockApiClient mockApi;
  late MockDatabase mockDb;
  late MockConnectivity mockConnectivity;
  late SyncManager syncManager;
  
  setUp(() {
    mockApi = MockApiClient();
    mockDb = MockDatabase();
    mockConnectivity = MockConnectivity();
    syncManager = SyncManagerImpl(
      api: mockApi,
      db: mockDb,
      connectivity: mockConnectivity,
    );
  });
  
  test('recordEvent stores event locally when offline', () async {
    when(() => mockConnectivity.isOnline).thenReturn(false);
    
    await syncManager.recordEvent('session-1', testEvent);
    
    verify(() => mockDb.insertEvent(any())).called(1);
    verifyNever(() => mockApi.uploadEvents(any()));
  });
  
  test('syncNow uploads pending events when online', () async {
    when(() => mockConnectivity.isOnline).thenReturn(true);
    when(() => mockDb.getEventsToSync(limit: any(named: 'limit')))
        .thenAnswer((_) async => [testEvent1, testEvent2]);
    when(() => mockApi.batchUploadEvents(any()))
        .thenAnswer((_) async => BatchResult.success());
    
    final result = await syncManager.syncNow();
    
    expect(result.eventsSynced, equals(2));
    verify(() => mockDb.markEventsSynced(any())).called(1);
  });
  
  test('handles session conflict by creating continuation', () async {
    when(() => mockApi.createSession(any()))
        .thenThrow(ConflictException('Session already closed'));
    
    final result = await syncManager.syncNow();
    
    verify(() => mockApi.createContinuationSession(any())).called(1);
  });
});
```

### 9.2 Integration Tests ("Flight Mode")

```dart
testWidgets('complete activity offline then sync', (tester) async {
  // 1. Start online, preload plan
  await tester.pumpWidget(TestApp(connectivity: ConnectivityState.online));
  await syncManager.preloadForToday(testLearnerId);
  
  // 2. Go offline
  mockConnectivity.setOffline();
  await tester.pump();
  
  // 3. Complete activity
  await tester.tap(find.text('Start Activity'));
  await tester.pump();
  await tester.tap(find.text('Submit Answer'));
  await tester.pump();
  
  // 4. Verify events stored locally
  final pendingEvents = await db.getEventsToSync();
  expect(pendingEvents.length, greaterThan(0));
  
  // 5. Go back online
  mockConnectivity.setOnline();
  await tester.pump(const Duration(seconds: 3)); // Wait for auto-sync
  
  // 6. Verify events synced
  final remainingEvents = await db.getEventsToSync();
  expect(remainingEvents.length, equals(0));
  
  // 7. Verify server received events
  verify(() => mockApi.batchUploadEvents(any())).called(1);
});
```

### 9.3 Test Scenarios Checklist

- [ ] Start session online, complete offline, sync later
- [ ] Start session offline, sync when online
- [ ] Multiple activities completed offline, batch sync
- [ ] Sync fails, retry with backoff
- [ ] Session conflict resolution (closed on server)
- [ ] Duplicate event deduplication
- [ ] Cache expiration and eviction
- [ ] Large payload handling (>1MB)
- [ ] Slow network simulation (bandwidth throttling)
- [ ] App killed mid-activity, resume

---

## 10. Security Considerations

### 10.1 Local Data Protection

```dart
// Sensitive fields encrypted at rest using flutter_secure_storage
class SecureStorage {
  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
  
  Future<void> storeToken(String token) async {
    await _storage.write(key: 'auth_token', value: token);
  }
  
  Future<String?> getToken() async {
    return await _storage.read(key: 'auth_token');
  }
}
```

### 10.2 Data Retention

- Offline events older than 30 days → auto-purge
- Failed sync attempts → max 14 days retention
- Learner PII → encrypted, cleared on logout

---

## 11. Monitoring & Observability

### 11.1 Sync Metrics

```dart
class SyncMetrics {
  void recordSyncAttempt(SyncResult result) {
    analytics.track('offline_sync', {
      'success': result.success,
      'events_synced': result.eventsSynced,
      'events_failed': result.eventsFailed,
      'sessions_synced': result.sessionsSynced,
      'duration_ms': result.duration.inMilliseconds,
      'offline_duration_min': result.offlineDuration?.inMinutes,
    });
  }
  
  void recordCacheHit(String contentType, bool hit) {
    analytics.track('cache_access', {
      'content_type': contentType,
      'hit': hit,
    });
  }
}
```

### 11.2 Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Sync failure rate | >5% | >15% |
| Avg offline duration | >30 min | >2 hours |
| Pending events queue | >100 | >500 |
| Cache miss rate | >30% | >50% |

---

## Appendix A: API Endpoints Used

| Operation | Endpoint | Method | Notes |
|-----------|----------|--------|-------|
| Get today plan | `/virtual-brains/:id/todays-plan` | POST | Returns activities |
| Create session | `/sessions` | POST | Accepts localSessionId |
| Upload events | `/sessions/:id/events` | POST | Batch, idempotent |
| Get content | `/content/:id` | GET | Cacheable |
| Health check | `/health` | GET | Connectivity test |

---

## Appendix B: Migration Path

### Phase 1 (MVP)
- Basic offline event queue
- Today Plan caching
- Simple sync on reconnect

### Phase 2
- Full content caching with LRU
- Conflict resolution
- Background sync service

### Phase 3
- Predictive preloading
- Delta sync for large payloads
- Cross-device session handoff
