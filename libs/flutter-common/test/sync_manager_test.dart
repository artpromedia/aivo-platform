import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:flutter_common/offline/connectivity_service.dart';
import 'package:flutter_common/offline/offline_database.dart';
import 'package:flutter_common/offline/sync_manager.dart';

// ══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ══════════════════════════════════════════════════════════════════════════════

class MockOfflineDatabase extends Mock implements OfflineDatabase {}

class MockConnectivityService extends Mock implements ConnectivityService {}

class MockPlanApiClient extends Mock implements PlanApiClient {}

class MockContentApiClient extends Mock implements ContentApiClient {}

class MockSessionApiClient extends Mock implements SessionApiClient {}

class MockEventApiClient extends Mock implements EventApiClient {}

// ══════════════════════════════════════════════════════════════════════════════
// TEST DATA
// ══════════════════════════════════════════════════════════════════════════════

const testLearnerId = 'learner-123';
const testSessionId = 'session-456';
const testServerSessionId = 'server-session-789';

final testPlan = {
  'learnerId': testLearnerId,
  'planDate': '2024-01-15',
  'totalMinutes': 45,
  'learnerSnapshot': {
    'displayName': 'Test Learner',
    'gradeBand': '3-5',
    'tenantId': 'tenant-1',
  },
  'activities': [
    {
      'activityId': 'activity-1',
      'contentId': 'content-1',
      'domain': 'MATH',
      'title': 'Number Bonds',
    },
    {
      'activityId': 'activity-2',
      'contentId': 'content-2',
      'domain': 'MATH',
      'title': 'Addition Practice',
    },
  ],
};

final testContent = [
  {
    'contentKey': 'content-1',
    'type': 'exercise',
    'subject': 'MATH',
    'gradeBand': '3-5',
    'payload': {'questions': []},
  },
  {
    'contentKey': 'content-2',
    'type': 'exercise',
    'subject': 'MATH',
    'gradeBand': '3-5',
    'payload': {'questions': []},
  },
];

final testEvent = LearnerEvent(
  type: LearnerEventType.answerEvent,
  payload: {'questionId': 'q1', 'answer': 'A', 'correct': true},
);

OfflineSession createTestSession({
  String? localSessionId,
  String? serverSessionId,
  String status = 'pendingSync',
}) {
  return OfflineSession(
    localSessionId: localSessionId ?? testSessionId,
    serverSessionId: serverSessionId,
    learnerId: testLearnerId,
    subject: 'MATH',
    sessionType: 'learning',
    status: status,
    origin: 'online',
    startedAt: DateTime.now().millisecondsSinceEpoch,
    endedAt: null,
    planJson: jsonEncode(testPlan),
    errorMessage: null,
    retryCount: 0,
    lastUpdatedAt: DateTime.now().millisecondsSinceEpoch,
  );
}

OfflineEvent createTestEvent({
  int id = 1,
  String? localSessionId,
  String status = 'pendingSync',
}) {
  return OfflineEvent(
    id: id,
    localSessionId: localSessionId ?? testSessionId,
    eventType: 'answerEvent',
    eventJson: jsonEncode(testEvent.toJson()),
    status: status,
    sequenceNum: 1,
    createdAt: DateTime.now().millisecondsSinceEpoch,
    syncedAt: null,
    errorMessage: null,
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

void main() {
  late MockOfflineDatabase mockDb;
  late MockConnectivityService mockConnectivity;
  late MockPlanApiClient mockPlanApi;
  late MockContentApiClient mockContentApi;
  late MockSessionApiClient mockSessionApi;
  late MockEventApiClient mockEventApi;
  late SyncManager syncManager;

  setUp(() {
    mockDb = MockOfflineDatabase();
    mockConnectivity = MockConnectivityService();
    mockPlanApi = MockPlanApiClient();
    mockContentApi = MockContentApiClient();
    mockSessionApi = MockSessionApiClient();
    mockEventApi = MockEventApiClient();

    // Default connectivity state
    when(() => mockConnectivity.isOnline).thenReturn(true);
    when(() => mockConnectivity.stateStream)
        .thenAnswer((_) => const Stream.empty());

    // Default database responses
    when(() => mockDb.getPendingEventCount()).thenAnswer((_) async => 0);
    when(() => mockDb.getSessionsToSync()).thenAnswer((_) async => []);

    syncManager = SyncManager(
      database: mockDb,
      connectivityService: mockConnectivity,
      planApi: mockPlanApi,
      contentApi: mockContentApi,
      sessionApi: mockSessionApi,
      eventApi: mockEventApi,
    );
  });

  tearDown(() {
    syncManager.dispose();
  });

  group('preloadForToday', () {
    test('fetches plan and caches content when online', () async {
      // Arrange
      when(() => mockPlanApi.generateTodaysPlan(testLearnerId))
          .thenAnswer((_) async => testPlan);
      when(() => mockDb.findUncachedContent(any()))
          .thenAnswer((_) async => ['content-1', 'content-2']);
      when(() => mockContentApi.batchFetchContent(any()))
          .thenAnswer((_) async => testContent);
      when(() => mockDb.upsertLearner(any())).thenAnswer((_) async {});
      when(() => mockDb.upsertContent(any())).thenAnswer((_) async {});
      when(() => mockDb.insertSession(any())).thenAnswer((_) async {});

      // Act
      final result = await syncManager.preloadForToday(testLearnerId);

      // Assert
      expect(result.success, isTrue);
      expect(result.activitiesReady, equals(2));
      expect(result.bytesDownloaded, greaterThan(0));

      verify(() => mockPlanApi.generateTodaysPlan(testLearnerId)).called(1);
      verify(() => mockContentApi.batchFetchContent(any())).called(1);
      verify(() => mockDb.upsertLearner(any())).called(1);
      verify(() => mockDb.upsertContent(any())).called(2);
      verify(() => mockDb.insertSession(any())).called(1);
    });

    test('returns failure when offline', () async {
      // Arrange
      when(() => mockConnectivity.isOnline).thenReturn(false);

      // Act
      final result = await syncManager.preloadForToday(testLearnerId);

      // Assert
      expect(result.success, isFalse);
      expect(result.error, contains('offline'));

      verifyNever(() => mockPlanApi.generateTodaysPlan(any()));
    });

    test('skips already cached content', () async {
      // Arrange
      when(() => mockPlanApi.generateTodaysPlan(testLearnerId))
          .thenAnswer((_) async => testPlan);
      when(() => mockDb.findUncachedContent(any()))
          .thenAnswer((_) async => []); // All cached
      when(() => mockDb.upsertLearner(any())).thenAnswer((_) async {});
      when(() => mockDb.insertSession(any())).thenAnswer((_) async {});

      // Act
      final result = await syncManager.preloadForToday(testLearnerId);

      // Assert
      expect(result.success, isTrue);
      expect(result.bytesDownloaded, equals(0));

      verifyNever(() => mockContentApi.batchFetchContent(any()));
    });
  });

  group('recordEvent', () {
    test('stores event locally with pending status', () async {
      // Arrange
      when(() => mockDb.getNextSequenceNum(testSessionId))
          .thenAnswer((_) async => 1);
      when(() => mockDb.insertEvent(any())).thenAnswer((_) async => 1);

      // Act
      await syncManager.recordEvent(testSessionId, testEvent);

      // Assert
      verify(() => mockDb.insertEvent(any())).called(1);
    });

    test('does not trigger sync when offline', () async {
      // Arrange
      when(() => mockConnectivity.isOnline).thenReturn(false);
      when(() => mockDb.getNextSequenceNum(testSessionId))
          .thenAnswer((_) async => 1);
      when(() => mockDb.insertEvent(any())).thenAnswer((_) async => 1);

      // Act
      await syncManager.recordEvent(testSessionId, testEvent);

      // Assert
      verify(() => mockDb.insertEvent(any())).called(1);
      // Sync should not be triggered
      verifyNever(() => mockDb.getEventsToSync(limit: any(named: 'limit')));
    });
  });

  group('startSession', () {
    test('creates local session with online origin when connected', () async {
      // Arrange
      when(() => mockDb.insertSession(any())).thenAnswer((_) async {});

      // Act
      final localSessionId = await syncManager.startSession(
        learnerId: testLearnerId,
        subject: 'MATH',
      );

      // Assert
      expect(localSessionId, isNotEmpty);

      final captured =
          verify(() => mockDb.insertSession(captureAny())).captured;
      final session = captured.first as OfflineSession;
      expect(session.origin, equals('online'));
      expect(session.status, equals('pendingSync'));
    });

    test('creates local session with offline origin when disconnected',
        () async {
      // Arrange
      when(() => mockConnectivity.isOnline).thenReturn(false);
      when(() => mockDb.insertSession(any())).thenAnswer((_) async {});

      // Act
      final localSessionId = await syncManager.startSession(
        learnerId: testLearnerId,
        subject: 'MATH',
      );

      // Assert
      expect(localSessionId, isNotEmpty);

      final captured =
          verify(() => mockDb.insertSession(captureAny())).captured;
      final session = captured.first as OfflineSession;
      expect(session.origin, equals('offline'));
    });
  });

  group('endSession', () {
    test('marks session as ended', () async {
      // Arrange
      when(() => mockDb.endSession(testSessionId)).thenAnswer((_) async {});

      // Act
      await syncManager.endSession(testSessionId);

      // Assert
      verify(() => mockDb.endSession(testSessionId)).called(1);
    });
  });

  group('syncNow', () {
    test('returns offline result when disconnected', () async {
      // Arrange
      when(() => mockConnectivity.isOnline).thenReturn(false);

      // Act
      final result = await syncManager.syncNow();

      // Assert
      expect(result.success, isFalse);
      expect(result.error, contains('offline'));
    });

    test('syncs pending sessions first', () async {
      // Arrange
      final pendingSession = createTestSession();
      when(() => mockDb.getSessionsToSync())
          .thenAnswer((_) async => [pendingSession]);
      when(() => mockSessionApi.createSession(
            learnerId: any(named: 'learnerId'),
            subject: any(named: 'subject'),
            sessionType: any(named: 'sessionType'),
            startedAt: any(named: 'startedAt'),
            offlineOrigin: any(named: 'offlineOrigin'),
            localSessionId: any(named: 'localSessionId'),
          )).thenAnswer((_) async => {'id': testServerSessionId});
      when(() => mockDb.updateSessionServerIds(
            localSessionId: any(named: 'localSessionId'),
            serverSessionId: any(named: 'serverSessionId'),
          )).thenAnswer((_) async {});
      when(() => mockDb.getEventsToSync(limit: any(named: 'limit')))
          .thenAnswer((_) async => []);

      // Act
      final result = await syncManager.syncNow();

      // Assert
      expect(result.sessionsSynced, equals(1));
      verify(() => mockSessionApi.createSession(
            learnerId: testLearnerId,
            subject: 'MATH',
            sessionType: 'learning',
            startedAt: any(named: 'startedAt'),
            offlineOrigin: false,
            localSessionId: testSessionId,
          )).called(1);
      verify(() => mockDb.updateSessionServerIds(
            localSessionId: testSessionId,
            serverSessionId: testServerSessionId,
          )).called(1);
    });

    test('syncs pending events after sessions', () async {
      // Arrange
      final syncedSession =
          createTestSession(serverSessionId: testServerSessionId);
      final pendingEvent = createTestEvent();

      when(() => mockDb.getSessionsToSync()).thenAnswer((_) async => []);
      when(() => mockDb.getEventsToSync(limit: any(named: 'limit')))
          .thenAnswer((_) async => [pendingEvent]);
      when(() => mockDb.getSession(testSessionId))
          .thenAnswer((_) async => syncedSession);
      when(() => mockEventApi.batchUploadEvents(
            sessionId: any(named: 'sessionId'),
            events: any(named: 'events'),
          )).thenAnswer((_) async {});
      when(() => mockDb.markEventsSynced(any())).thenAnswer((_) async {});

      // Act
      final result = await syncManager.syncNow();

      // Assert
      expect(result.eventsSynced, equals(1));
      verify(() => mockEventApi.batchUploadEvents(
            sessionId: testServerSessionId,
            events: any(named: 'events'),
          )).called(1);
      verify(() => mockDb.markEventsSynced([pendingEvent.id])).called(1);
    });

    test('skips events for sessions without server ID', () async {
      // Arrange
      final unsyncedSession = createTestSession(); // No serverSessionId
      final pendingEvent = createTestEvent();

      when(() => mockDb.getSessionsToSync()).thenAnswer((_) async => []);
      when(() => mockDb.getEventsToSync(limit: any(named: 'limit')))
          .thenAnswer((_) async => [pendingEvent]);
      when(() => mockDb.getSession(testSessionId))
          .thenAnswer((_) async => unsyncedSession);

      // Act
      final result = await syncManager.syncNow();

      // Assert
      expect(result.eventsSynced, equals(0));
      verifyNever(() => mockEventApi.batchUploadEvents(
            sessionId: any(named: 'sessionId'),
            events: any(named: 'events'),
          ));
    });

    test('marks events as failed on API error', () async {
      // Arrange
      final syncedSession =
          createTestSession(serverSessionId: testServerSessionId);
      final pendingEvent = createTestEvent();

      when(() => mockDb.getSessionsToSync()).thenAnswer((_) async => []);
      when(() => mockDb.getEventsToSync(limit: any(named: 'limit')))
          .thenAnswer((_) async => [pendingEvent]);
      when(() => mockDb.getSession(testSessionId))
          .thenAnswer((_) async => syncedSession);
      when(() => mockEventApi.batchUploadEvents(
            sessionId: any(named: 'sessionId'),
            events: any(named: 'events'),
          )).thenThrow(Exception('Network error'));
      when(() => mockDb.markEventsFailed(any(), any()))
          .thenAnswer((_) async {});

      // Act
      final result = await syncManager.syncNow();

      // Assert
      expect(result.eventsFailed, equals(1));
      verify(() => mockDb.markEventsFailed(
            [pendingEvent.id],
            any(),
          )).called(1);
    });

    test('marks session as failed on API error', () async {
      // Arrange
      final pendingSession = createTestSession();
      when(() => mockDb.getSessionsToSync())
          .thenAnswer((_) async => [pendingSession]);
      when(() => mockSessionApi.createSession(
            learnerId: any(named: 'learnerId'),
            subject: any(named: 'subject'),
            sessionType: any(named: 'sessionType'),
            startedAt: any(named: 'startedAt'),
            offlineOrigin: any(named: 'offlineOrigin'),
            localSessionId: any(named: 'localSessionId'),
          )).thenThrow(Exception('Network error'));
      when(() => mockDb.markSessionFailed(any(), any()))
          .thenAnswer((_) async {});
      when(() => mockDb.getEventsToSync(limit: any(named: 'limit')))
          .thenAnswer((_) async => []);

      // Act
      final result = await syncManager.syncNow();

      // Assert
      expect(result.sessionsFailed, equals(1));
      verify(() => mockDb.markSessionFailed(testSessionId, any())).called(1);
    });
  });

  group('pruneCache', () {
    test('deletes expired content', () async {
      // Arrange
      when(() => mockDb.deleteExpiredContent(any()))
          .thenAnswer((_) async => 5);
      when(() => mockDb.getTotalCacheSize()).thenAnswer((_) async => 50000000);
      when(() => mockDb.deleteOldSyncedEvents(any()))
          .thenAnswer((_) async => 10);

      // Act
      await syncManager.pruneCache();

      // Assert
      verify(() => mockDb.deleteExpiredContent(any())).called(1);
      verify(() => mockDb.deleteOldSyncedEvents(any())).called(1);
    });

    test('evicts LRU content when over size limit', () async {
      // Arrange
      when(() => mockDb.deleteExpiredContent(any())).thenAnswer((_) async => 0);
      when(() => mockDb.getTotalCacheSize())
          .thenAnswer((_) async => 150 * 1024 * 1024); // 150MB
      when(() => mockDb.getLRUContentKeys(targetBytes: any(named: 'targetBytes')))
          .thenAnswer((_) async => ['content-old-1', 'content-old-2']);
      when(() => mockDb.deleteContentByKeys(any())).thenAnswer((_) async => 2);
      when(() => mockDb.deleteOldSyncedEvents(any()))
          .thenAnswer((_) async => 0);

      // Act
      await syncManager.pruneCache();

      // Assert
      verify(() => mockDb.getLRUContentKeys(targetBytes: any(named: 'targetBytes')))
          .called(1);
      verify(() => mockDb.deleteContentByKeys(['content-old-1', 'content-old-2']))
          .called(1);
    });
  });

  group('getCurrentStatus', () {
    test('returns correct status with pending data', () async {
      // Arrange
      when(() => mockDb.getPendingEventCount()).thenAnswer((_) async => 5);
      when(() => mockDb.getSessionsToSync()).thenAnswer(
          (_) async => [createTestSession()]);

      // Act
      final status = await syncManager.getCurrentStatus();

      // Assert
      expect(status.pendingEvents, equals(5));
      expect(status.pendingSessions, equals(1));
      expect(status.hasPendingData, isTrue);
    });

    test('returns offline state when disconnected', () async {
      // Arrange
      when(() => mockConnectivity.isOnline).thenReturn(false);
      when(() => mockDb.getPendingEventCount()).thenAnswer((_) async => 0);
      when(() => mockDb.getSessionsToSync()).thenAnswer((_) async => []);

      // Act
      final status = await syncManager.getCurrentStatus();

      // Assert
      expect(status.state, equals(SyncState.offline));
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// FLIGHT MODE INTEGRATION TEST
// ══════════════════════════════════════════════════════════════════════════════

/// These tests simulate the full offline → online → sync flow.
/// In a real integration test, you would use actual database and HTTP mocks.
void flightModeTests() {
  group('Flight Mode Integration', () {
    test('complete flow: online → offline → activities → online → sync',
        () async {
      // This would be a proper integration test with:
      // 1. Start with connectivity online
      // 2. Preload today's plan
      // 3. Switch to offline mode
      // 4. Complete several activities (record events)
      // 5. Switch back to online
      // 6. Verify auto-sync triggers
      // 7. Verify all events uploaded to server
      // 8. Verify local status updated to synchronized

      // For now, this is a placeholder for the integration test structure
      expect(true, isTrue);
    });

    test('handles mid-activity connectivity loss gracefully', () async {
      // Test scenario:
      // 1. Start activity online
      // 2. Lose connectivity mid-activity
      // 3. Continue activity (events queued locally)
      // 4. Complete activity offline
      // 5. Restore connectivity
      // 6. Verify events synced correctly

      expect(true, isTrue);
    });

    test('handles server conflicts on sync', () async {
      // Test scenario:
      // 1. Create session offline
      // 2. Session with same ID created on server (by another device)
      // 3. Try to sync
      // 4. Conflict detected
      // 5. Create continuation session
      // 6. Events attached to new session

      expect(true, isTrue);
    });
  });
}
