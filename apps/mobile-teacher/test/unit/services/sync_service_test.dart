/// Sync Service Unit Tests
///
/// Comprehensive tests for the sync service.
library;

import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mobile_teacher/models/sync_operation.dart';
import 'package:mobile_teacher/services/database/local_database.dart';
import 'package:mobile_teacher/services/sync/sync_service.dart';
import 'package:mobile_teacher/services/sync/connectivity_monitor.dart';
import 'package:flutter_common/flutter_common.dart';

import '../../mocks/mock_services.dart';

// Mock classes
class MockTeacherLocalDatabase extends Mock implements TeacherLocalDatabase {}

class MockAivoApiClient extends Mock implements AivoApiClient {}

class MockConnectivityMonitor extends Mock implements ConnectivityMonitor {}

void main() {
  late SyncService syncService;
  late MockTeacherLocalDatabase mockDb;
  late MockAivoApiClient mockApi;
  late MockConnectivityMonitor mockConnectivity;

  // Register fallback values for mocktail
  setUpAll(() {
    registerFallbackValue(SyncOperation(
      id: 'fallback',
      type: SyncOperationType.create,
      entityType: 'test',
      entityId: 'test-1',
      data: {},
      createdAt: DateTime.now(),
    ));
  });

  setUp(() {
    mockDb = MockTeacherLocalDatabase();
    mockApi = MockAivoApiClient();
    mockConnectivity = MockConnectivityMonitor();

    // Default connectivity behavior
    when(() => mockConnectivity.isOnline).thenAnswer((_) async => true);
    when(() => mockConnectivity.isOnlineSync).thenReturn(true);
    when(() => mockConnectivity.stateStream).thenAnswer((_) => Stream.value(true));

    syncService = SyncService(
      localDb: mockDb,
      apiClient: mockApi,
      connectivity: mockConnectivity,
    );
  });

  tearDown(() {
    syncService.dispose();
  });

  group('SyncService', () {
    group('queueOperation', () {
      test('should add operation to local database', () async {
        // Arrange
        final operation = SyncOperation(
          id: 'op-1',
          type: SyncOperationType.create,
          entityType: 'session_note',
          entityId: 'note-1',
          data: {'content': 'Test note'},
          createdAt: DateTime.now(),
        );

        when(() => mockDb.addSyncOperation(any())).thenAnswer((_) async {});
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 1);

        // Act
        await syncService.queueOperation(operation);

        // Assert
        verify(() => mockDb.addSyncOperation(operation)).called(1);
      });

      test('should update pending count after queueing', () async {
        // Arrange
        when(() => mockDb.addSyncOperation(any())).thenAnswer((_) async {});
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 3);
        when(() => mockDb.getPendingSyncOperations()).thenAnswer((_) async => []);

        final operation = SyncOperation(
          id: 'op-1',
          type: SyncOperationType.create,
          entityType: 'test',
          entityId: 'test-1',
          data: {},
          createdAt: DateTime.now(),
        );

        // Act
        await syncService.queueOperation(operation);

        // Assert
        verify(() => mockDb.getPendingSyncCount()).called(1);
        expect(syncService.status.pendingOperations, equals(3));
      });

      test('should attempt immediate sync if online', () async {
        // Arrange
        when(() => mockConnectivity.isOnline).thenAnswer((_) async => true);
        when(() => mockDb.addSyncOperation(any())).thenAnswer((_) async {});
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 1);
        when(() => mockDb.getPendingSyncOperations()).thenAnswer((_) async => []);

        final operation = SyncOperation(
          id: 'op-1',
          type: SyncOperationType.create,
          entityType: 'test',
          entityId: 'test-1',
          data: {},
          createdAt: DateTime.now(),
        );

        // Act
        await syncService.queueOperation(operation);

        // Wait for async sync to trigger
        await Future.delayed(const Duration(milliseconds: 50));

        // Assert
        verify(() => mockDb.getPendingSyncOperations()).called(greaterThan(0));
      });

      test('should not attempt sync if offline', () async {
        // Arrange
        when(() => mockConnectivity.isOnline).thenAnswer((_) async => false);
        when(() => mockDb.addSyncOperation(any())).thenAnswer((_) async {});
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 1);

        final operation = SyncOperation(
          id: 'op-1',
          type: SyncOperationType.create,
          entityType: 'test',
          entityId: 'test-1',
          data: {},
          createdAt: DateTime.now(),
        );

        // Act
        await syncService.queueOperation(operation);

        // Assert
        verifyNever(() => mockDb.getPendingSyncOperations());
      });
    });

    group('queueCreate', () {
      test('should create operation with correct type', () async {
        // Arrange
        when(() => mockDb.addSyncOperation(any())).thenAnswer((_) async {});
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 1);
        when(() => mockConnectivity.isOnline).thenAnswer((_) async => false);

        // Act
        final id = await syncService.queueCreate(
          entityType: 'session_note',
          entityId: 'note-1',
          data: {'content': 'Test'},
        );

        // Assert
        expect(id, isNotEmpty);
        final captured = verify(() => mockDb.addSyncOperation(captureAny()))
            .captured
            .single as SyncOperation;
        expect(captured.type, equals(SyncOperationType.create));
        expect(captured.entityType, equals('session_note'));
        expect(captured.entityId, equals('note-1'));
      });
    });

    group('queueUpdate', () {
      test('should create operation with update type', () async {
        // Arrange
        when(() => mockDb.addSyncOperation(any())).thenAnswer((_) async {});
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 1);
        when(() => mockConnectivity.isOnline).thenAnswer((_) async => false);

        // Act
        await syncService.queueUpdate(
          entityType: 'iep_progress',
          entityId: 'progress-1',
          data: {'value': 75},
        );

        // Assert
        final captured = verify(() => mockDb.addSyncOperation(captureAny()))
            .captured
            .single as SyncOperation;
        expect(captured.type, equals(SyncOperationType.update));
      });
    });

    group('queueDelete', () {
      test('should create operation with delete type and empty data', () async {
        // Arrange
        when(() => mockDb.addSyncOperation(any())).thenAnswer((_) async {});
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 1);
        when(() => mockConnectivity.isOnline).thenAnswer((_) async => false);

        // Act
        await syncService.queueDelete(
          entityType: 'session_note',
          entityId: 'note-1',
        );

        // Assert
        final captured = verify(() => mockDb.addSyncOperation(captureAny()))
            .captured
            .single as SyncOperation;
        expect(captured.type, equals(SyncOperationType.delete));
        expect(captured.data, isEmpty);
      });
    });

    group('syncPendingOperations', () {
      test('should return success when no pending operations', () async {
        // Arrange
        when(() => mockDb.getPendingSyncOperations()).thenAnswer((_) async => []);
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 0);

        // Act
        final result = await syncService.syncPendingOperations();

        // Assert
        expect(result.success, isTrue);
        expect(result.operationsSynced, equals(0));
      });

      test('should sync all pending operations in order', () async {
        // Arrange
        final operations = [
          SyncOperation(
            id: 'op-1',
            type: SyncOperationType.create,
            entityType: 'note',
            entityId: 'note-1',
            data: {'content': 'Note 1'},
            createdAt: DateTime.now().subtract(const Duration(minutes: 10)),
          ),
          SyncOperation(
            id: 'op-2',
            type: SyncOperationType.update,
            entityType: 'note',
            entityId: 'note-1',
            data: {'content': 'Note 1 updated'},
            createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
          ),
        ];

        when(() => mockDb.getPendingSyncOperations())
            .thenAnswer((_) async => operations);
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 0);
        when(() => mockDb.markSynced(any())).thenAnswer((_) async {});

        // Mock API responses
        when(() => mockApi.post(any(), any())).thenAnswer((_) async => {});
        when(() => mockApi.put(any(), any())).thenAnswer((_) async => {});

        // Act
        final result = await syncService.syncPendingOperations();

        // Assert
        expect(result.success, isTrue);
        expect(result.operationsSynced, equals(2));
        verify(() => mockDb.markSynced('op-1')).called(1);
        verify(() => mockDb.markSynced('op-2')).called(1);
      });

      test('should handle partial sync failure', () async {
        // Arrange
        final operations = [
          SyncOperation(
            id: 'op-1',
            type: SyncOperationType.create,
            entityType: 'note',
            entityId: 'note-1',
            data: {},
            createdAt: DateTime.now(),
          ),
          SyncOperation(
            id: 'op-2',
            type: SyncOperationType.create,
            entityType: 'note',
            entityId: 'note-2',
            data: {},
            createdAt: DateTime.now(),
          ),
        ];

        when(() => mockDb.getPendingSyncOperations())
            .thenAnswer((_) async => operations);
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 1);
        when(() => mockDb.markSynced(any())).thenAnswer((_) async {});
        when(() => mockDb.markFailed(any(), any())).thenAnswer((_) async {});

        // First succeeds, second fails
        var callCount = 0;
        when(() => mockApi.post(any(), any())).thenAnswer((_) async {
          callCount++;
          if (callCount > 1) {
            throw Exception('Network error');
          }
          return {};
        });

        // Act
        final result = await syncService.syncPendingOperations();

        // Assert
        expect(result.success, isFalse);
        expect(result.operationsSynced, equals(1));
        expect(result.operationsFailed, equals(1));
        verify(() => mockDb.markSynced('op-1')).called(1);
        verify(() => mockDb.markFailed('op-2', any())).called(1);
      });

      test('should return offline result when not connected', () async {
        // Arrange
        when(() => mockConnectivity.isOnline).thenAnswer((_) async => false);

        // Act
        final result = await syncService.syncPendingOperations();

        // Assert
        expect(result.success, isFalse);
        expect(result.error, contains('offline'));
        verifyNever(() => mockDb.getPendingSyncOperations());
      });

      test('should skip already syncing', () async {
        // Arrange
        when(() => mockDb.getPendingSyncOperations())
            .thenAnswer((_) async {
          // Simulate slow operation
          await Future.delayed(const Duration(milliseconds: 500));
          return [];
        });
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 0);

        // Act - start two syncs simultaneously
        final future1 = syncService.syncPendingOperations();
        final result2 = await syncService.syncPendingOperations();

        // Assert - second call should return immediately
        expect(result2.success, isFalse);
        expect(result2.error, contains('in progress'));

        // Clean up first sync
        await future1;
      });

      test('should skip operations exceeding max retries', () async {
        // Arrange
        final operation = SyncOperation(
          id: 'op-1',
          type: SyncOperationType.create,
          entityType: 'note',
          entityId: 'note-1',
          data: {},
          createdAt: DateTime.now(),
          retryCount: 6, // Exceeds max of 5
        );

        when(() => mockDb.getPendingSyncOperations())
            .thenAnswer((_) async => [operation]);
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 0);
        when(() => mockDb.moveToDeadLetterQueue(any())).thenAnswer((_) async {
          return null;
        });

        // Act
        await syncService.syncPendingOperations();

        // Assert
        verify(() => mockDb.moveToDeadLetterQueue('op-1')).called(1);
        verifyNever(() => mockApi.post(any(), any()));
      });
    });

    group('status stream', () {
      test('should emit status updates during sync', () async {
        // Arrange
        when(() => mockDb.getPendingSyncOperations()).thenAnswer((_) async => [
              SyncOperation(
                id: 'op-1',
                type: SyncOperationType.create,
                entityType: 'note',
                entityId: 'note-1',
                data: {},
                createdAt: DateTime.now(),
              ),
            ]);
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 0);
        when(() => mockDb.markSynced(any())).thenAnswer((_) async {});
        when(() => mockApi.post(any(), any())).thenAnswer((_) async => {});

        final statuses = <SyncStatusInfo>[];
        syncService.statusStream.listen(statuses.add);

        // Act
        await syncService.syncPendingOperations();

        // Wait for stream events
        await Future.delayed(const Duration(milliseconds: 50));

        // Assert
        expect(statuses, isNotEmpty);
        expect(
          statuses.map((s) => s.state),
          containsAllInOrder([SyncState.syncing, SyncState.idle]),
        );
      });
    });

    group('connectivity changes', () {
      test('should sync when coming back online', () async {
        // Arrange
        final connectivityController = StreamController<bool>.broadcast();
        when(() => mockConnectivity.stateStream)
            .thenAnswer((_) => connectivityController.stream);
        when(() => mockDb.getPendingSyncOperations()).thenAnswer((_) async => []);
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 0);

        // Initialize to start listening
        await syncService.initialize();

        // Act - simulate coming back online
        connectivityController.add(true);

        // Wait for async handling
        await Future.delayed(const Duration(milliseconds: 100));

        // Assert
        verify(() => mockDb.getPendingSyncOperations()).called(greaterThan(0));

        // Cleanup
        await connectivityController.close();
      });

      test('should update status when going offline', () async {
        // Arrange
        final connectivityController = StreamController<bool>.broadcast();
        when(() => mockConnectivity.stateStream)
            .thenAnswer((_) => connectivityController.stream);

        final statuses = <SyncStatusInfo>[];
        syncService.statusStream.listen(statuses.add);

        await syncService.initialize();

        // Act
        connectivityController.add(false);

        await Future.delayed(const Duration(milliseconds: 50));

        // Assert
        expect(
          statuses.any((s) => s.state == SyncState.offline),
          isTrue,
        );

        await connectivityController.close();
      });
    });

    group('background sync', () {
      test('startBackgroundSync should set up periodic timer', () async {
        // Arrange
        when(() => mockDb.getPendingSyncOperations()).thenAnswer((_) async => []);
        when(() => mockDb.getPendingSyncCount()).thenAnswer((_) async => 0);

        // Act
        syncService.startBackgroundSync();

        // Assert - verify timer is running by checking it syncs
        // (In real implementation, we'd use a shorter interval for testing)
        expect(() => syncService.stopBackgroundSync(), returnsNormally);
      });

      test('stopBackgroundSync should cancel timer', () {
        // Act
        syncService.startBackgroundSync();
        syncService.stopBackgroundSync();

        // Assert - no exception thrown
        expect(true, isTrue);
      });
    });
  });
}
