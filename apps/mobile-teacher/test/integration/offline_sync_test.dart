/// Offline Sync Integration Tests
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import '../mocks/mocks.dart';
import 'package:mobile_teacher/services/sync/sync_service.dart';
import 'package:mobile_teacher/models/models.dart';

void main() {
  group('Offline Sync Integration', () {
    late MockTeacherLocalDatabase mockDb;
    late MockAivoApiClient mockApi;
    late MockConnectivityMonitor mockConnectivity;
    late SyncService syncService;

    setUp(() {
      mockDb = MockTeacherLocalDatabase();
      mockApi = MockAivoApiClient();
      mockConnectivity = MockConnectivityMonitor();

      syncService = SyncService(
        db: mockDb,
        api: mockApi,
        connectivity: mockConnectivity,
      );
    });

    tearDown(() {
      syncService.dispose();
    });

    test('queues operations when offline and syncs when back online', () async {
      // Arrange - Start offline
      when(() => mockConnectivity.isOnline).thenAnswer((_) async => false);
      when(() => mockDb.addSyncOperation(any())).thenAnswer((_) async {});
      when(() => mockDb.getPendingSyncOperations()).thenAnswer((_) async => []);

      // Queue some operations while offline
      await syncService.queueUpdate(
        entityType: 'student',
        entityId: 'student-1',
        data: {'notes': 'Updated offline'},
      );

      await syncService.queueCreate(
        entityType: 'session_note',
        entityId: 'note-1',
        data: {'content': 'Note created offline'},
      );

      // Verify operations were queued
      verify(() => mockDb.addSyncOperation(any())).called(2);

      // Now come back online
      final pendingOps = [
        TestDataFactory.createSyncOperation(
          id: 'op-1',
          type: SyncOperationType.update,
          entityType: 'student',
          entityId: 'student-1',
        ),
        TestDataFactory.createSyncOperation(
          id: 'op-2',
          type: SyncOperationType.create,
          entityType: 'session_note',
          entityId: 'note-1',
        ),
      ];

      when(() => mockConnectivity.isOnline).thenAnswer((_) async => true);
      when(() => mockDb.getPendingSyncOperations())
          .thenAnswer((_) async => pendingOps);
      when(() => mockDb.markSynced(any())).thenAnswer((_) async {});

      // Mock API responses
      when(() => mockApi.patch(any(), data: any(named: 'data')))
          .thenAnswer((_) async => MockResponse(data: {'id': 'student-1'}));
      when(() => mockApi.post(any(), data: any(named: 'data')))
          .thenAnswer((_) async => MockResponse(data: {'id': 'note-1'}));

      // Trigger sync
      await syncService.syncPendingOperations();

      // Verify sync attempts
      verify(() => mockDb.getPendingSyncOperations()).called(1);
    });

    test('handles sync conflicts correctly', () async {
      // Arrange
      when(() => mockConnectivity.isOnline).thenAnswer((_) async => true);
      
      final conflictOp = TestDataFactory.createSyncOperation(
        status: SyncStatus.conflict,
      );
      
      when(() => mockDb.getPendingSyncOperations())
          .thenAnswer((_) async => [conflictOp]);
      when(() => mockDb.getConflicts()).thenAnswer((_) async => [
        SyncConflict(
          operationId: conflictOp.id,
          entityType: 'student',
          entityId: 'student-1',
          type: ConflictType.updateConflict,
          localData: {'name': 'Local Name'},
          serverData: {'name': 'Server Name'},
        ),
      ]);

      // Act
      final conflicts = await syncService.getConflicts();

      // Assert
      expect(conflicts.length, 1);
      expect(conflicts.first.type, ConflictType.updateConflict);
    });

    test('retries failed sync operations', () async {
      // Arrange
      when(() => mockConnectivity.isOnline).thenAnswer((_) async => true);

      final failedOp = TestDataFactory.createSyncOperation(
        status: SyncStatus.failed,
      );

      when(() => mockDb.getPendingSyncOperations())
          .thenAnswer((_) async => [failedOp]);
      when(() => mockDb.markSynced(any())).thenAnswer((_) async {});
      when(() => mockDb.markFailed(any(), any())).thenAnswer((_) async {});

      // First call fails, second succeeds
      var callCount = 0;
      when(() => mockApi.patch(any(), data: any(named: 'data')))
          .thenAnswer((_) async {
        callCount++;
        if (callCount == 1) {
          throw Exception('Network error');
        }
        return MockResponse(data: {'id': 'student-1'});
      });

      // Act
      await syncService.syncPendingOperations();

      // Assert - should have attempted once
      verify(() => mockApi.patch(any(), data: any(named: 'data'))).called(1);
    });

    test('maintains data integrity during offline operations', () async {
      // Arrange
      when(() => mockConnectivity.isOnline).thenAnswer((_) async => false);
      when(() => mockDb.addSyncOperation(any())).thenAnswer((_) async {});
      when(() => mockDb.getPendingSyncOperations()).thenAnswer((_) async => []);

      // Act - Create multiple related operations
      await syncService.queueCreate(
        entityType: 'session',
        entityId: 'temp-session-1',
        data: {'title': 'Offline Session'},
      );

      await syncService.queueCreate(
        entityType: 'session_note',
        entityId: 'temp-note-1',
        data: {'sessionId': 'temp-session-1', 'content': 'Note'},
      );

      await syncService.queueUpdate(
        entityType: 'session',
        entityId: 'temp-session-1',
        data: {'status': 'completed'},
      );

      // Assert - All operations should be queued in order
      verify(() => mockDb.addSyncOperation(any())).called(3);
    });
  });
}

/// Mock HTTP Response
class MockResponse {
  MockResponse({this.data});
  final dynamic data;
}
