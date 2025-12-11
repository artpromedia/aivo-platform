import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_common/offline/idempotency.dart';

void main() {
  group('Idempotency', () {
    group('IdempotencyKeyGenerator', () {
      late IdempotencyKeyGenerator generator;

      setUp(() {
        generator = const IdempotencyKeyGenerator();
      });

      test('generateRandom returns valid UUID v4', () {
        final key1 = generator.generateRandom();
        final key2 = generator.generateRandom();

        // Should be valid UUIDs (36 chars with dashes)
        expect(key1.length, 36);
        expect(key2.length, 36);

        // Should be different
        expect(key1, isNot(equals(key2)));
      });

      test('generateDeterministic returns consistent keys', () {
        final key1 = generator.generateDeterministic(
          learnerId: 'learner-123',
          eventType: 'activity_started',
          timestamp: DateTime(2024, 1, 15, 10, 30),
        );

        final key2 = generator.generateDeterministic(
          learnerId: 'learner-123',
          eventType: 'activity_started',
          timestamp: DateTime(2024, 1, 15, 10, 30),
        );

        expect(key1, equals(key2));
      });

      test('generateDeterministic differs with different inputs', () {
        final key1 = generator.generateDeterministic(
          learnerId: 'learner-123',
          eventType: 'activity_started',
          timestamp: DateTime(2024, 1, 15, 10, 30),
        );

        final key2 = generator.generateDeterministic(
          learnerId: 'learner-456', // Different learner
          eventType: 'activity_started',
          timestamp: DateTime(2024, 1, 15, 10, 30),
        );

        expect(key1, isNot(equals(key2)));
      });

      test('generateForSessionStart produces consistent keys', () {
        final key1 = generator.generateForSessionStart(
          learnerId: 'learner-123',
          startTime: DateTime(2024, 1, 15, 10, 0),
          deviceId: 'device-abc',
        );

        final key2 = generator.generateForSessionStart(
          learnerId: 'learner-123',
          startTime: DateTime(2024, 1, 15, 10, 0),
          deviceId: 'device-abc',
        );

        expect(key1, equals(key2));
      });

      test('generateForActivityEvent produces consistent keys', () {
        final key1 = generator.generateForActivityEvent(
          sessionId: 'session-123',
          activityId: 'activity-456',
          eventType: 'answer_submitted',
          eventSequence: 5,
        );

        final key2 = generator.generateForActivityEvent(
          sessionId: 'session-123',
          activityId: 'activity-456',
          eventType: 'answer_submitted',
          eventSequence: 5,
        );

        expect(key1, equals(key2));
      });
    });

    group('ConflictResolver', () {
      test('default policy is lastWriteWins', () {
        const resolver = ConflictResolver();
        expect(resolver.defaultPolicy, ConflictPolicy.lastWriteWins);
      });

      test('handleDuplicateEvent returns true when server has event', () {
        const resolver = ConflictResolver();

        expect(
          resolver.handleDuplicateEvent(
            clientEventId: 'event-123',
            serverHasEvent: true,
          ),
          isTrue,
        );

        expect(
          resolver.handleDuplicateEvent(
            clientEventId: 'event-123',
            serverHasEvent: false,
          ),
          isFalse,
        );
      });

      test('handleConcurrentSession merges with newer metadata', () {
        const resolver = ConflictResolver();

        final localSession = {
          'id': 'session-123',
          'endTime': '2024-01-15T10:30:00Z',
          'updatedAt': '2024-01-15T10:30:00Z',
        };

        final serverSession = {
          'id': 'session-123',
          'endTime': '2024-01-15T10:45:00Z',
          'updatedAt': '2024-01-15T10:45:00Z',
        };

        final merged = resolver.handleConcurrentSession(
          localSession: localSession,
          serverSession: serverSession,
          localModified: DateTime(2024, 1, 15, 10, 30),
          serverModified: DateTime(2024, 1, 15, 10, 45), // Server is newer
        );

        expect(merged, isNotNull);
        expect(merged!['endTime'], serverSession['endTime']);
        expect(merged['mergedFromMultipleSources'], isTrue);
      });
    });

    group('SyncBatchProcessor', () {
      late SyncBatchProcessor processor;

      setUp(() {
        processor = SyncBatchProcessor();
      });

      test('processBatch removes duplicates', () async {
        final events = [
          LocalEvent(
            clientEventId: 'event-1',
            sessionId: 'session-123',
            eventType: 'activity_started',
            timestamp: DateTime.now(),
            data: {},
          ),
          LocalEvent(
            clientEventId: 'event-2',
            sessionId: 'session-123',
            eventType: 'activity_completed',
            timestamp: DateTime.now(),
            data: {},
          ),
        ];

        // Simulate server already has event-1
        Future<Set<String>> checkExisting(List<String> ids) async {
          return {'event-1'};
        }

        final result = await processor.processBatch(
          events: events,
          checkExistingEvents: checkExisting,
        );

        expect(result.events.length, 1);
        expect(result.events.first.clientEventId, 'event-2');
        expect(result.skippedIds, contains('event-1'));
        expect(result.stats.duplicatesSkipped, 1);
      });

      test('processBatch validates events', () async {
        final events = [
          LocalEvent(
            clientEventId: 'event-1',
            sessionId: 'session-123',
            eventType: 'activity_started',
            timestamp: DateTime.now(),
            data: {},
          ),
          LocalEvent(
            clientEventId: '', // Invalid - empty clientEventId
            sessionId: 'session-123',
            eventType: 'activity_completed',
            timestamp: DateTime.now(),
            data: {},
          ),
        ];

        Future<Set<String>> checkExisting(List<String> ids) async {
          return {};
        }

        final result = await processor.processBatch(
          events: events,
          checkExistingEvents: checkExisting,
        );

        expect(result.events.length, 1);
        expect(result.stats.validationErrors, 1);
        expect(result.conflicts.length, 1);
        expect(result.conflicts.first.type, ConflictType.dataConflict);
      });

      test('processBatch rejects future timestamps', () async {
        final futureTime = DateTime.now().add(const Duration(hours: 1));

        final events = [
          LocalEvent(
            clientEventId: 'event-1',
            sessionId: 'session-123',
            eventType: 'activity_started',
            timestamp: futureTime,
            data: {},
          ),
        ];

        Future<Set<String>> checkExisting(List<String> ids) async {
          return {};
        }

        final result = await processor.processBatch(
          events: events,
          checkExistingEvents: checkExisting,
        );

        expect(result.events.length, 0);
        expect(result.stats.validationErrors, 1);
      });

      test('generateEventKey produces consistent keys', () {
        final key1 = processor.generateEventKey(
          sessionId: 'session-123',
          eventType: 'answer_submitted',
          sequenceNumber: 5,
          activityId: 'activity-456',
        );

        final key2 = processor.generateEventKey(
          sessionId: 'session-123',
          eventType: 'answer_submitted',
          sequenceNumber: 5,
          activityId: 'activity-456',
        );

        expect(key1, equals(key2));
      });
    });

    group('LocalEvent', () {
      test('toJson serializes correctly', () {
        final event = LocalEvent(
          clientEventId: 'event-123',
          sessionId: 'session-456',
          eventType: 'activity_started',
          timestamp: DateTime.utc(2024, 1, 15, 10, 30),
          data: {'score': 85},
          activityId: 'activity-789',
          sequenceNumber: 3,
        );

        final json = event.toJson();

        expect(json['clientEventId'], 'event-123');
        expect(json['sessionId'], 'session-456');
        expect(json['eventType'], 'activity_started');
        expect(json['timestamp'], '2024-01-15T10:30:00.000Z');
        expect(json['data'], {'score': 85});
        expect(json['activityId'], 'activity-789');
        expect(json['sequenceNumber'], 3);
      });
    });

    group('SyncResponse', () {
      test('fromJson parses correctly', () {
        final json = {
          'accepted': ['event-1', 'event-2'],
          'rejected': {'event-3': 'Invalid data'},
          'duplicates': ['event-4'],
          'serverTime': '2024-01-15T10:30:00Z',
        };

        final response = SyncResponse.fromJson(json);

        expect(response.accepted, ['event-1', 'event-2']);
        expect(response.rejected, {'event-3': 'Invalid data'});
        expect(response.duplicates, ['event-4']);
        expect(response.serverTime, isNotNull);
      });

      test('allAccepted returns correct value', () {
        final allGood = SyncResponse.fromJson({
          'accepted': ['event-1', 'event-2'],
          'rejected': <String, String>{},
          'duplicates': <String>[],
        });
        expect(allGood.allAccepted, isTrue);

        final withRejected = SyncResponse.fromJson({
          'accepted': ['event-1'],
          'rejected': {'event-2': 'error'},
          'duplicates': <String>[],
        });
        expect(withRejected.allAccepted, isFalse);
      });
    });

    group('SyncResponseProcessor', () {
      test('processResponse categorizes correctly', () {
        const processor = SyncResponseProcessor();

        final events = [
          LocalEvent(
            clientEventId: 'event-1',
            sessionId: 's1',
            eventType: 'test',
            timestamp: DateTime.now(),
            data: {},
          ),
          LocalEvent(
            clientEventId: 'event-2',
            sessionId: 's1',
            eventType: 'test',
            timestamp: DateTime.now(),
            data: {},
          ),
          LocalEvent(
            clientEventId: 'event-3',
            sessionId: 's1',
            eventType: 'test',
            timestamp: DateTime.now(),
            data: {},
          ),
        ];

        final response = SyncResponse(
          accepted: ['event-1'],
          rejected: {'event-2': 'Invalid'},
          duplicates: ['event-3'],
        );

        final actions = processor.processResponse(
          response: response,
          sentEvents: events,
        );

        expect(actions.markSynced, ['event-1']);
        expect(actions.markFailed, {'event-2': 'Invalid'});
        expect(actions.markDuplicate, ['event-3']);
      });
    });

    group('ConflictType', () {
      test('all conflict types are defined', () {
        expect(ConflictType.values.length, 6);
        expect(ConflictType.values, contains(ConflictType.duplicateEvent));
        expect(ConflictType.values, contains(ConflictType.concurrentSessionModification));
        expect(ConflictType.values, contains(ConflictType.orphanedEvent));
        expect(ConflictType.values, contains(ConflictType.timestampConflict));
        expect(ConflictType.values, contains(ConflictType.dataConflict));
        expect(ConflictType.values, contains(ConflictType.versionConflict));
      });
    });

    group('SyncConflict', () {
      test('toJson serializes correctly', () {
        const conflict = SyncConflict(
          type: ConflictType.duplicateEvent,
          resolution: ConflictResolution.discard,
          localId: 'event-123',
          serverId: 'server-456',
          message: 'Duplicate detected',
        );

        final json = conflict.toJson();

        expect(json['type'], 'duplicateEvent');
        expect(json['resolution'], 'discard');
        expect(json['localId'], 'event-123');
        expect(json['serverId'], 'server-456');
        expect(json['message'], 'Duplicate detected');
      });

      test('requiresManualResolution returns correct value', () {
        const manual = SyncConflict(
          type: ConflictType.versionConflict,
          resolution: ConflictResolution.manual,
          localId: 'event-123',
        );
        expect(manual.requiresManualResolution, isTrue);

        const automatic = SyncConflict(
          type: ConflictType.duplicateEvent,
          resolution: ConflictResolution.discard,
          localId: 'event-123',
        );
        expect(automatic.requiresManualResolution, isFalse);
      });
    });
  });
}
