import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_common/offline/offline_database.dart';
import 'package:flutter_common/offline/offline_tables.dart';

// ══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ══════════════════════════════════════════════════════════════════════════════

OfflineDatabase createTestDatabase() {
  return OfflineDatabase.forTesting(NativeDatabase.memory());
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

void main() {
  late OfflineDatabase db;

  setUp(() {
    db = createTestDatabase();
  });

  tearDown(() async {
    await db.closeDatabase();
  });

  group('OfflineDatabase - Learner Operations', () {
    final testLearner = OfflineLearner(
      learnerId: 'learner-123',
      displayName: 'Test Learner',
      gradeBand: '3-5',
      avatarUrl: null,
      preferencesJson: null,
      tenantId: 'tenant-1',
      lastSyncedAt: DateTime.now().millisecondsSinceEpoch,
    );

    test('upsertLearner inserts new learner', () async {
      await db.upsertLearner(testLearner);
      final result = await db.getLearner('learner-123');

      expect(result, isNotNull);
      expect(result!.displayName, equals('Test Learner'));
      expect(result.gradeBand, equals('3-5'));
    });

    test('upsertLearner updates existing learner', () async {
      await db.upsertLearner(testLearner);

      final updated = OfflineLearner(
        learnerId: 'learner-123',
        displayName: 'Updated Name',
        gradeBand: '6-8',
        avatarUrl: null,
        preferencesJson: null,
        tenantId: 'tenant-1',
        lastSyncedAt: DateTime.now().millisecondsSinceEpoch,
      );
      await db.upsertLearner(updated);

      final result = await db.getLearner('learner-123');
      expect(result!.displayName, equals('Updated Name'));
      expect(result.gradeBand, equals('6-8'));
    });

    test('getLearner returns null for non-existent learner', () async {
      final result = await db.getLearner('non-existent');
      expect(result, isNull);
    });

    test('getAllLearners returns all cached learners', () async {
      await db.upsertLearner(testLearner);
      await db.upsertLearner(OfflineLearner(
        learnerId: 'learner-456',
        displayName: 'Another Learner',
        gradeBand: 'K-2',
        avatarUrl: null,
        preferencesJson: null,
        tenantId: 'tenant-1',
        lastSyncedAt: DateTime.now().millisecondsSinceEpoch,
      ));

      final result = await db.getAllLearners();
      expect(result.length, equals(2));
    });

    test('deleteLearner removes learner and associated data', () async {
      await db.upsertLearner(testLearner);

      // Add a session for this learner
      await db.insertSession(OfflineSession(
        localSessionId: 'session-1',
        serverSessionId: null,
        learnerId: 'learner-123',
        subject: 'MATH',
        sessionType: 'learning',
        status: 'pendingSync',
        origin: 'online',
        startedAt: DateTime.now().millisecondsSinceEpoch,
        endedAt: null,
        planJson: '{}',
        errorMessage: null,
        retryCount: 0,
        lastUpdatedAt: DateTime.now().millisecondsSinceEpoch,
      ));

      await db.deleteLearner('learner-123');

      final learner = await db.getLearner('learner-123');
      expect(learner, isNull);

      // Verify associated session is deleted (cascade)
      final session = await db.getSession('session-1');
      expect(session, isNull);
    });
  });

  group('OfflineDatabase - Session Operations', () {
    test('insertSession creates new session', () async {
      final session = OfflineSession(
        localSessionId: 'local-session-1',
        serverSessionId: null,
        learnerId: 'learner-123',
        subject: 'MATH',
        sessionType: 'learning',
        status: 'pendingSync',
        origin: 'online',
        startedAt: DateTime.now().millisecondsSinceEpoch,
        endedAt: null,
        planJson: '{"test": true}',
        errorMessage: null,
        retryCount: 0,
        lastUpdatedAt: DateTime.now().millisecondsSinceEpoch,
      );

      await db.insertSession(session);
      final result = await db.getSession('local-session-1');

      expect(result, isNotNull);
      expect(result!.subject, equals('MATH'));
      expect(result.status, equals('pendingSync'));
    });

    test('updateSessionServerIds updates server ID and status', () async {
      await db.insertSession(OfflineSession(
        localSessionId: 'local-session-1',
        serverSessionId: null,
        learnerId: 'learner-123',
        subject: 'MATH',
        sessionType: 'learning',
        status: 'pendingSync',
        origin: 'online',
        startedAt: DateTime.now().millisecondsSinceEpoch,
        endedAt: null,
        planJson: '{}',
        errorMessage: null,
        retryCount: 0,
        lastUpdatedAt: DateTime.now().millisecondsSinceEpoch,
      ));

      await db.updateSessionServerIds(
        localSessionId: 'local-session-1',
        serverSessionId: 'server-session-1',
      );

      final result = await db.getSession('local-session-1');
      expect(result!.serverSessionId, equals('server-session-1'));
      expect(result.status, equals(SyncStatus.synchronized.name));
    });

    test('markSessionFailed updates status and increments retry', () async {
      await db.insertSession(OfflineSession(
        localSessionId: 'local-session-1',
        serverSessionId: null,
        learnerId: 'learner-123',
        subject: 'MATH',
        sessionType: 'learning',
        status: 'pendingSync',
        origin: 'online',
        startedAt: DateTime.now().millisecondsSinceEpoch,
        endedAt: null,
        planJson: '{}',
        errorMessage: null,
        retryCount: 0,
        lastUpdatedAt: DateTime.now().millisecondsSinceEpoch,
      ));

      await db.markSessionFailed('local-session-1', 'Network error');

      final result = await db.getSession('local-session-1');
      expect(result!.status, equals(SyncStatus.failed.name));
      expect(result.errorMessage, equals('Network error'));
      expect(result.retryCount, equals(1));
    });

    test('getSessionsToSync returns pending sessions', () async {
      // Insert pending session
      await db.insertSession(OfflineSession(
        localSessionId: 'session-pending',
        serverSessionId: null,
        learnerId: 'learner-123',
        subject: 'MATH',
        sessionType: 'learning',
        status: 'pendingSync',
        origin: 'online',
        startedAt: DateTime.now().millisecondsSinceEpoch,
        endedAt: null,
        planJson: '{}',
        errorMessage: null,
        retryCount: 0,
        lastUpdatedAt: DateTime.now().millisecondsSinceEpoch,
      ));

      // Insert synced session
      await db.insertSession(OfflineSession(
        localSessionId: 'session-synced',
        serverSessionId: 'server-1',
        learnerId: 'learner-123',
        subject: 'MATH',
        sessionType: 'learning',
        status: 'synchronized',
        origin: 'online',
        startedAt: DateTime.now().millisecondsSinceEpoch,
        endedAt: null,
        planJson: '{}',
        errorMessage: null,
        retryCount: 0,
        lastUpdatedAt: DateTime.now().millisecondsSinceEpoch,
      ));

      final result = await db.getSessionsToSync();
      expect(result.length, equals(1));
      expect(result.first.localSessionId, equals('session-pending'));
    });
  });

  group('OfflineDatabase - Event Operations', () {
    setUp(() async {
      // Create a session for events
      await db.insertSession(OfflineSession(
        localSessionId: 'session-1',
        serverSessionId: null,
        learnerId: 'learner-123',
        subject: 'MATH',
        sessionType: 'learning',
        status: 'pendingSync',
        origin: 'online',
        startedAt: DateTime.now().millisecondsSinceEpoch,
        endedAt: null,
        planJson: '{}',
        errorMessage: null,
        retryCount: 0,
        lastUpdatedAt: DateTime.now().millisecondsSinceEpoch,
      ));
    });

    test('insertEvent creates event and returns ID', () async {
      final eventId = await db.insertEvent(OfflineEventsCompanion.insert(
        localSessionId: 'session-1',
        eventType: 'answerEvent',
        eventJson: '{"questionId": "q1"}',
        status: const Value('pendingSync'),
        sequenceNum: 1,
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ));

      expect(eventId, greaterThan(0));
    });

    test('getEventsToSync returns pending events', () async {
      // Insert pending event
      await db.insertEvent(OfflineEventsCompanion.insert(
        localSessionId: 'session-1',
        eventType: 'answerEvent',
        eventJson: '{}',
        status: const Value('pendingSync'),
        sequenceNum: 1,
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ));

      // Insert synced event
      await db.insertEvent(OfflineEventsCompanion.insert(
        localSessionId: 'session-1',
        eventType: 'answerEvent',
        eventJson: '{}',
        status: const Value('synchronized'),
        sequenceNum: 2,
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ));

      final result = await db.getEventsToSync();
      expect(result.length, equals(1));
      expect(result.first.sequenceNum, equals(1));
    });

    test('markEventsSynced updates status', () async {
      final eventId = await db.insertEvent(OfflineEventsCompanion.insert(
        localSessionId: 'session-1',
        eventType: 'answerEvent',
        eventJson: '{}',
        status: const Value('pendingSync'),
        sequenceNum: 1,
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ));

      await db.markEventsSynced([eventId]);

      final result = await db.getEventsToSync();
      expect(result, isEmpty);
    });

    test('getNextSequenceNum returns incremented value', () async {
      // Insert two events
      await db.insertEvent(OfflineEventsCompanion.insert(
        localSessionId: 'session-1',
        eventType: 'answerEvent',
        eventJson: '{}',
        status: const Value('pendingSync'),
        sequenceNum: 1,
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ));
      await db.insertEvent(OfflineEventsCompanion.insert(
        localSessionId: 'session-1',
        eventType: 'answerEvent',
        eventJson: '{}',
        status: const Value('pendingSync'),
        sequenceNum: 2,
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ));

      final nextSeq = await db.getNextSequenceNum('session-1');
      expect(nextSeq, equals(3));
    });

    test('getPendingEventCount returns correct count', () async {
      await db.insertEvent(OfflineEventsCompanion.insert(
        localSessionId: 'session-1',
        eventType: 'answerEvent',
        eventJson: '{}',
        status: const Value('pendingSync'),
        sequenceNum: 1,
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ));
      await db.insertEvent(OfflineEventsCompanion.insert(
        localSessionId: 'session-1',
        eventType: 'answerEvent',
        eventJson: '{}',
        status: const Value('pendingSync'),
        sequenceNum: 2,
        createdAt: DateTime.now().millisecondsSinceEpoch,
      ));

      final count = await db.getPendingEventCount();
      expect(count, equals(2));
    });
  });

  group('OfflineDatabase - Content Cache Operations', () {
    test('upsertContent stores content', () async {
      final now = DateTime.now().millisecondsSinceEpoch;
      final content = OfflineContent(
        contentKey: 'content-1',
        contentType: 'exercise',
        subject: 'MATH',
        gradeBand: '3-5',
        jsonPayload: '{"questions": []}',
        sizeBytes: 1024,
        expiresAt: now + 86400000,
        createdAt: now,
        lastAccessedAt: now,
      );

      await db.upsertContent(content);
      final result = await db.getContent('content-1');

      expect(result, isNotNull);
      expect(result!.subject, equals('MATH'));
    });

    test('findUncachedContent returns keys not in cache', () async {
      final now = DateTime.now().millisecondsSinceEpoch;
      await db.upsertContent(OfflineContent(
        contentKey: 'content-1',
        contentType: 'exercise',
        subject: 'MATH',
        gradeBand: '3-5',
        jsonPayload: '{}',
        sizeBytes: 100,
        expiresAt: now + 86400000,
        createdAt: now,
        lastAccessedAt: now,
      ));

      final uncached = await db.findUncachedContent(
        ['content-1', 'content-2', 'content-3'],
      );

      expect(uncached, containsAll(['content-2', 'content-3']));
      expect(uncached, isNot(contains('content-1')));
    });
  });

  group('OfflineDatabase - Maintenance Operations', () {
    test('clearAllData removes all records', () async {
      final now = DateTime.now().millisecondsSinceEpoch;
      // Insert some data
      await db.upsertLearner(OfflineLearner(
        learnerId: 'learner-1',
        displayName: 'Test',
        gradeBand: '3-5',
        avatarUrl: null,
        preferencesJson: null,
        tenantId: 'tenant-1',
        lastSyncedAt: now,
      ));
      await db.upsertContent(OfflineContent(
        contentKey: 'content-1',
        contentType: 'exercise',
        subject: 'MATH',
        gradeBand: '3-5',
        jsonPayload: '{}',
        sizeBytes: 100,
        expiresAt: now + 86400000,
        createdAt: now,
        lastAccessedAt: now,
      ));

      await db.clearAllData();

      final learners = await db.getAllLearners();
      expect(learners, isEmpty);

      final content = await db.getContent('content-1');
      expect(content, isNull);
    });
  });
}
