/// Sync Service Tests
library;

import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import '../mocks/mocks.dart';
import 'package:mobile_teacher/services/sync/sync_service.dart';
import 'package:mobile_teacher/models/models.dart';

void main() {
  late MockTeacherLocalDatabase mockDb;
  late MockAivoApiClient mockApi;
  late MockConnectivityMonitor mockConnectivity;
  late SyncService syncService;

  setUp(() {
    mockDb = MockTeacherLocalDatabase();
    mockApi = MockAivoApiClient();
    mockConnectivity = MockConnectivityMonitor();

    when(() => mockConnectivity.isOnline).thenAnswer((_) async => true);
    when(() => mockDb.getPendingSyncOperations()).thenAnswer((_) async => []);

    syncService = SyncService(
      db: mockDb,
      api: mockApi,
      connectivity: mockConnectivity,
    );
  });

  tearDown(() {
    syncService.dispose();
  });

  group('SyncService', () {
    test('queues operation and attempts sync when online', () async {
      // Arrange
      when(() => mockDb.addSyncOperation(any())).thenAnswer((_) async {});
      when(() => mockConnectivity.isOnline).thenAnswer((_) async => true);
      when(() => mockDb.getPendingSyncOperations()).thenAnswer((_) async => []);

      // Act
      await syncService.queueUpdate(
        entityType: 'student',
        entityId: 'student-1',
        data: {'name': 'Test'},
      );

      // Assert
      verify(() => mockDb.addSyncOperation(any())).called(1);
    });

    test('does not sync when offline', () async {
      // Arrange
      when(() => mockConnectivity.isOnline).thenAnswer((_) async => false);
      when(() => mockDb.addSyncOperation(any())).thenAnswer((_) async {});

      final pendingOp = TestDataFactory.createSyncOperation();
      when(() => mockDb.getPendingSyncOperations())
          .thenAnswer((_) async => [pendingOp]);

      // Act
      await syncService.syncPendingOperations();

      // Assert - API should not be called
      verifyNever(() => mockApi.post(any()));
      verifyNever(() => mockApi.patch(any()));
      verifyNever(() => mockApi.delete(any()));
    });

    test('emits status updates during sync', () async {
      // Arrange
      when(() => mockConnectivity.isOnline).thenAnswer((_) async => true);
      when(() => mockDb.getPendingSyncOperations()).thenAnswer((_) async => []);

      final statuses = <SyncStatus>[];
      final subscription = syncService.statusStream.listen(statuses.add);

      // Act
      await syncService.syncPendingOperations();
      await Future.delayed(const Duration(milliseconds: 100));

      // Assert
      expect(statuses, contains(SyncStatus.syncing));
      expect(statuses.last, SyncStatus.idle);

      await subscription.cancel();
    });

    test('handles sync conflicts', () async {
      // Arrange
      when(() => mockConnectivity.isOnline).thenAnswer((_) async => true);
      when(() => mockDb.getConflicts()).thenAnswer((_) async => [
        SyncConflict(
          operationId: 'op-1',
          entityType: 'student',
          entityId: 'student-1',
          type: ConflictType.updateConflict,
          localData: {'name': 'Local'},
          serverData: {'name': 'Server'},
        ),
      ]);

      // Act
      final conflicts = await syncService.getConflicts();

      // Assert
      expect(conflicts.length, 1);
      expect(conflicts.first.type, ConflictType.updateConflict);
    });

    test('creates operations with correct types', () async {
      // Arrange
      when(() => mockDb.addSyncOperation(any())).thenAnswer((_) async {});
      when(() => mockConnectivity.isOnline).thenAnswer((_) async => false);

      // Act & Assert - Create
      await syncService.queueCreate(
        entityType: 'session',
        entityId: 'session-1',
        data: {'title': 'New Session'},
      );

      verify(() => mockDb.addSyncOperation(
        any(that: predicate<SyncOperation>((op) => 
          op.type == SyncOperationType.create)),
      )).called(1);

      // Act & Assert - Update
      await syncService.queueUpdate(
        entityType: 'student',
        entityId: 'student-1',
        data: {'name': 'Updated'},
      );

      verify(() => mockDb.addSyncOperation(
        any(that: predicate<SyncOperation>((op) => 
          op.type == SyncOperationType.update)),
      )).called(1);

      // Act & Assert - Delete
      await syncService.queueDelete(
        entityType: 'note',
        entityId: 'note-1',
      );

      verify(() => mockDb.addSyncOperation(
        any(that: predicate<SyncOperation>((op) => 
          op.type == SyncOperationType.delete)),
      )).called(1);
    });
  });
}
