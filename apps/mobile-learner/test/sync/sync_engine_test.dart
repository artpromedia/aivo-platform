import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';

import 'package:mobile_learner/core/sync/sync_engine.dart';
import 'package:mobile_learner/core/sync/sync_models.dart';
import 'package:mobile_learner/core/sync/sync_queue.dart';
import 'package:mobile_learner/core/sync/conflict_resolver.dart';
import 'package:mobile_learner/core/sync/delta_calculator.dart';
import 'package:mobile_learner/core/database/local_database.dart';
import 'package:mobile_learner/core/network/api_client.dart';
import 'package:mobile_learner/core/network/connectivity_manager.dart';

@GenerateMocks([LocalDatabase, ApiClient, ConnectivityManager])
import 'sync_engine_test.mocks.dart';

void main() {
  group('SyncEngine', () {
    late SyncEngine syncEngine;
    late MockLocalDatabase mockDatabase;
    late MockApiClient mockApiClient;
    late MockConnectivityManager mockConnectivity;

    setUp(() {
      mockDatabase = MockLocalDatabase();
      mockApiClient = MockApiClient();
      mockConnectivity = MockConnectivityManager();
      
      // Reset singleton for testing
      SyncEngine.resetForTesting();
    });

    group('Offline Operation Queueing', () {
      test('should queue operations when offline', () async {
        when(mockConnectivity.currentQuality).thenReturn(NetworkQuality.none);
        
        final operation = SyncOperation(
          id: 'op-1',
          entityType: EntityType.learningSession,
          entityId: 'session-1',
          operation: OperationType.update,
          data: {'progress': 0.5},
          timestamp: DateTime.now(),
          clientVersion: 1,
        );

        await syncEngine.queueOperation(operation);

        // Verify operation was added to queue
        expect(syncEngine.pendingOperationsCount, equals(1));
      });

      test('should persist queue across restarts', () async {
        when(mockConnectivity.currentQuality).thenReturn(NetworkQuality.none);
        
        final operation = SyncOperation(
          id: 'op-1',
          entityType: EntityType.response,
          entityId: 'response-1',
          operation: OperationType.create,
          data: {'answer': 'A'},
          timestamp: DateTime.now(),
          clientVersion: 1,
        );

        await syncEngine.queueOperation(operation);
        
        // Simulate restart
        SyncEngine.resetForTesting();
        await syncEngine.initialize();

        // Queue should be restored
        expect(syncEngine.pendingOperationsCount, equals(1));
      });

      test('should deduplicate update operations for same entity', () async {
        when(mockConnectivity.currentQuality).thenReturn(NetworkQuality.none);
        
        final operation1 = SyncOperation(
          id: 'op-1',
          entityType: EntityType.progress,
          entityId: 'progress-1',
          operation: OperationType.update,
          data: {'value': 50},
          timestamp: DateTime.now(),
          clientVersion: 1,
        );

        final operation2 = SyncOperation(
          id: 'op-2',
          entityType: EntityType.progress,
          entityId: 'progress-1',
          operation: OperationType.update,
          data: {'value': 75},
          timestamp: DateTime.now().add(const Duration(seconds: 1)),
          clientVersion: 2,
        );

        await syncEngine.queueOperation(operation1);
        await syncEngine.queueOperation(operation2);

        // Only latest update should be queued
        expect(syncEngine.pendingOperationsCount, equals(1));
      });
    });

    group('Online Sync', () {
      test('should process queue when coming online', () async {
        when(mockConnectivity.currentQuality).thenReturn(NetworkQuality.none);
        
        // Queue operation while offline
        final operation = SyncOperation(
          id: 'op-1',
          entityType: EntityType.learningSession,
          entityId: 'session-1',
          operation: OperationType.update,
          data: {'progress': 0.5},
          timestamp: DateTime.now(),
          clientVersion: 1,
        );

        await syncEngine.queueOperation(operation);
        expect(syncEngine.pendingOperationsCount, equals(1));

        // Come online
        when(mockConnectivity.currentQuality).thenReturn(NetworkQuality.good);
        when(mockApiClient.pushChanges(any)).thenAnswer((_) async => 
          PushChangesResponse(
            success: true,
            processedCount: 1,
            failedCount: 0,
            conflicts: [],
            serverTimestamp: DateTime.now().toIso8601String(),
            acceptedOperations: ['op-1'],
            rejectedOperations: [],
          )
        );

        // Trigger sync
        mockConnectivity.notifyConnectivityChange();

        // Wait for sync to complete
        await Future.delayed(const Duration(milliseconds: 100));

        expect(syncEngine.pendingOperationsCount, equals(0));
      });

      test('should handle push failures with retry', () async {
        when(mockConnectivity.currentQuality).thenReturn(NetworkQuality.good);
        
        var attempts = 0;
        when(mockApiClient.pushChanges(any)).thenAnswer((_) async {
          attempts++;
          if (attempts < 3) {
            throw Exception('Network error');
          }
          return PushChangesResponse(
            success: true,
            processedCount: 1,
            failedCount: 0,
            conflicts: [],
            serverTimestamp: DateTime.now().toIso8601String(),
            acceptedOperations: ['op-1'],
            rejectedOperations: [],
          );
        });

        final operation = SyncOperation(
          id: 'op-1',
          entityType: EntityType.response,
          entityId: 'response-1',
          operation: OperationType.create,
          data: {'answer': 'B'},
          timestamp: DateTime.now(),
          clientVersion: 1,
        );

        await syncEngine.queueOperation(operation);
        await syncEngine.performSync();

        expect(attempts, equals(3));
        expect(syncEngine.pendingOperationsCount, equals(0));
      });
    });
  });

  group('ConflictResolver', () {
    late ConflictResolver resolver;

    setUp(() {
      resolver = ConflictResolver();
    });

    test('should apply server wins strategy', () {
      final clientData = {'field': 'client_value', 'score': 80};
      final serverData = {'field': 'server_value', 'score': 90};

      final result = resolver.resolve(
        ConflictStrategy.serverWins,
        clientData,
        serverData,
      );

      expect(result['field'], equals('server_value'));
      expect(result['score'], equals(90));
    });

    test('should apply client wins strategy', () {
      final clientData = {'field': 'client_value', 'score': 80};
      final serverData = {'field': 'server_value', 'score': 90};

      final result = resolver.resolve(
        ConflictStrategy.clientWins,
        clientData,
        serverData,
      );

      expect(result['field'], equals('client_value'));
      expect(result['score'], equals(80));
    });

    test('should apply last write wins strategy', () {
      final clientData = {
        'field': 'client_value',
        'updatedAt': DateTime.now().toIso8601String(),
      };
      final serverData = {
        'field': 'server_value',
        'updatedAt': DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
      };

      final result = resolver.resolve(
        ConflictStrategy.lastWriteWins,
        clientData,
        serverData,
      );

      expect(result['field'], equals('client_value'));
    });

    test('should merge data intelligently', () {
      final clientData = {
        'progress': 0.7,
        'timeSpent': 300,
        'answers': ['A', 'B'],
      };
      final serverData = {
        'progress': 0.5,
        'timeSpent': 250,
        'answers': ['A', 'C'],
      };

      final result = resolver.resolve(
        ConflictStrategy.merge,
        clientData,
        serverData,
      );

      // Progress: max value
      expect(result['progress'], equals(0.7));
      // TimeSpent: max value
      expect(result['timeSpent'], equals(300));
      // Answers: merged unique values
      expect(result['answers'], containsAll(['A', 'B', 'C']));
    });

    test('should handle nested object merging', () {
      final clientData = {
        'skills': {
          'reading': {'level': 3, 'xp': 100},
          'math': {'level': 2, 'xp': 50},
        },
      };
      final serverData = {
        'skills': {
          'reading': {'level': 2, 'xp': 80},
          'writing': {'level': 1, 'xp': 20},
        },
      };

      final result = resolver.resolve(
        ConflictStrategy.merge,
        clientData,
        serverData,
      );

      final skills = result['skills'] as Map<String, dynamic>;
      expect(skills['reading']['level'], equals(3)); // Max
      expect(skills['reading']['xp'], equals(100)); // Max
      expect(skills['math'], isNotNull); // From client
      expect(skills['writing'], isNotNull); // From server
    });
  });

  group('DeltaCalculator', () {
    late DeltaCalculator calculator;

    setUp(() {
      calculator = DeltaCalculator();
    });

    test('should identify changed fields', () {
      final clientData = {'a': 1, 'b': 'hello', 'c': true};
      final serverData = {'a': 1, 'b': 'world', 'c': true};

      final deltas = calculator.calculateFieldDeltas(
        clientData,
        serverData,
      );

      expect(deltas.length, equals(1));
      expect(deltas[0].field, equals('b'));
      expect(deltas[0].clientValue, equals('hello'));
      expect(deltas[0].serverValue, equals('world'));
    });

    test('should detect additions and deletions', () {
      final clientData = {'a': 1, 'b': 2};
      final serverData = {'a': 1, 'c': 3};

      final deltas = calculator.calculateFieldDeltas(
        clientData,
        serverData,
      );

      expect(deltas.length, equals(2));
      
      final bDelta = deltas.firstWhere((d) => d.field == 'b');
      expect(bDelta.serverValue, isNull);
      
      final cDelta = deltas.firstWhere((d) => d.field == 'c');
      expect(cDelta.clientValue, isNull);
    });

    test('should identify conflicting fields', () {
      final clientData = {'progress': 0.5, 'score': 80};
      final serverData = {'progress': 0.7, 'score': 80};
      const serverVersion = 2;
      const clientVersion = 1;

      final result = calculator.calculateDeltas(
        clientData,
        serverData,
        clientVersion,
        serverVersion,
      );

      expect(result.hasConflict, isTrue);
      expect(result.conflictingFields.contains('progress'), isTrue);
    });
  });

  group('SyncQueue', () {
    late SyncQueue queue;

    setUp(() {
      queue = SyncQueue();
    });

    test('should maintain priority order', () async {
      final lowPriority = SyncOperation(
        id: 'op-1',
        entityType: EntityType.settings,
        entityId: 'settings-1',
        operation: OperationType.update,
        data: {},
        timestamp: DateTime.now(),
        clientVersion: 1,
        priority: SyncPriority.low,
      );

      final highPriority = SyncOperation(
        id: 'op-2',
        entityType: EntityType.response,
        entityId: 'response-1',
        operation: OperationType.create,
        data: {},
        timestamp: DateTime.now(),
        clientVersion: 1,
        priority: SyncPriority.high,
      );

      await queue.add(lowPriority);
      await queue.add(highPriority);

      final next = await queue.peek();
      expect(next?.id, equals('op-2')); // High priority first
    });

    test('should track operation status', () async {
      final operation = SyncOperation(
        id: 'op-1',
        entityType: EntityType.learningSession,
        entityId: 'session-1',
        operation: OperationType.update,
        data: {},
        timestamp: DateTime.now(),
        clientVersion: 1,
      );

      await queue.add(operation);
      expect(queue.getStatus('op-1'), equals(SyncOperationStatus.pending));

      await queue.markInProgress('op-1');
      expect(queue.getStatus('op-1'), equals(SyncOperationStatus.inProgress));

      await queue.markCompleted('op-1');
      expect(queue.getStatus('op-1'), equals(SyncOperationStatus.completed));
    });

    test('should provide accurate statistics', () async {
      for (int i = 0; i < 5; i++) {
        await queue.add(SyncOperation(
          id: 'op-$i',
          entityType: EntityType.response,
          entityId: 'response-$i',
          operation: OperationType.create,
          data: {},
          timestamp: DateTime.now(),
          clientVersion: 1,
        ));
      }

      await queue.markInProgress('op-0');
      await queue.markCompleted('op-1');
      await queue.markFailed('op-2', 'Network error');

      final stats = queue.getStats();
      expect(stats.pending, equals(2));
      expect(stats.inProgress, equals(1));
      expect(stats.completed, equals(1));
      expect(stats.failed, equals(1));
    });
  });
}
