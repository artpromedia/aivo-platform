/// Mock Providers
///
/// Riverpod provider overrides for testing.
library;

import 'dart:async';

import 'package:flutter_common/flutter_common.dart' hide SyncStatusInfo, SyncResult, apiClientProvider, offlineDatabaseProvider, connectivityServiceProvider;
import 'package:flutter_common/flutter_common.dart' as common show SyncState;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mobile_teacher/models/models.dart';
import 'package:mobile_teacher/providers/providers.dart' hide SyncState;
import 'package:mobile_teacher/repositories/repositories.dart';
import 'package:mobile_teacher/services/database/local_database.dart';
import 'package:mobile_teacher/services/sync/sync_service.dart';
import 'package:mobile_teacher/services/sync/connectivity_monitor.dart';

import 'fixtures/fixtures.dart';

// ============================================================================
// Mock Class Definitions
// ============================================================================

class MockAivoApiClient extends Mock implements AivoApiClient {}

class MockOfflineDatabase extends Mock implements OfflineDatabase {}

class MockTeacherLocalDatabase extends Mock implements TeacherLocalDatabase {}

class MockSyncService extends Mock implements SyncService {}

class MockConnectivityMonitor extends Mock implements ConnectivityMonitor {}

class MockConnectivityService extends Mock implements ConnectivityService {}

class MockStudentRepository extends Mock implements StudentRepository {}

class MockSessionRepository extends Mock implements SessionRepository {}

class MockIepRepository extends Mock implements IepRepository {}

class MockMessageRepository extends Mock implements MessageRepository {}

class MockClassRepository extends Mock implements ClassRepository {}

// ============================================================================
// Mock Instances
// ============================================================================

final mockApiClient = MockAivoApiClient();
final mockOfflineDatabase = MockOfflineDatabase();
final mockLocalDatabase = MockTeacherLocalDatabase();
final mockSyncService = MockSyncService();
final mockConnectivityMonitor = MockConnectivityMonitor();
final mockConnectivityService = MockConnectivityService();
final mockStudentRepository = MockStudentRepository();
final mockSessionRepository = MockSessionRepository();
final mockIepRepository = MockIepRepository();
final mockMessageRepository = MockMessageRepository();
final mockClassRepository = MockClassRepository();

// ============================================================================
// Default Mock Behaviors
// ============================================================================

/// Set up default mock behaviors for all mocks.
void setupDefaultMocks() {
  _setupConnectivityMocks();
  _setupSyncMocks();
  _setupRepositoryMocks();
}

void _setupConnectivityMocks() {
  when(() => mockConnectivityMonitor.isOnline).thenAnswer((_) async => true);
  when(() => mockConnectivityMonitor.stateStream)
      .thenAnswer((_) => Stream.value(true));

  when(() => mockConnectivityService.isOnline).thenReturn(true);
  when(() => mockConnectivityService.stateStream)
      .thenAnswer((_) => Stream.value(ConnectionState.online));
}

void _setupSyncMocks() {
  when(() => mockSyncService.status).thenReturn(
    SyncStatusInfo(state: common.SyncState.idle, pendingOperations: 0),
  );
  when(() => mockSyncService.statusStream).thenAnswer(
    (_) => Stream.value(SyncStatusInfo(state: common.SyncState.idle)),
  );
  when(() => mockSyncService.syncPendingOperations())
      .thenAnswer((_) async => const SyncResult(success: true));
  when(() => mockSyncService.queueOperation(any())).thenAnswer((_) async {});
  when(() => mockSyncService.queueCreate(
        entityType: any(named: 'entityType'),
        entityId: any(named: 'entityId'),
        data: any(named: 'data'),
      )).thenAnswer((_) async => 'mock-operation-id');
  when(() => mockSyncService.queueUpdate(
        entityType: any(named: 'entityType'),
        entityId: any(named: 'entityId'),
        data: any(named: 'data'),
      )).thenAnswer((_) async => 'mock-operation-id');
  when(() => mockSyncService.queueDelete(
        entityType: any(named: 'entityType'),
        entityId: any(named: 'entityId'),
      )).thenAnswer((_) async => 'mock-operation-id');
}

void _setupRepositoryMocks() {
  // Students
  when(() => mockStudentRepository.getStudents())
      .thenAnswer((_) async => TestStudents.all);
  when(() => mockStudentRepository.getStudent(any()))
      .thenAnswer((invocation) async {
    final id = invocation.positionalArguments[0] as String;
    return TestStudents.all.firstWhere(
      (s) => s.id == id,
      orElse: () => TestStudents.alex,
    );
  });
  when(() => mockStudentRepository.getStudentsByClass(any()))
      .thenAnswer((_) async => TestStudents.all);

  // Sessions
  when(() => mockSessionRepository.getSessions())
      .thenAnswer((_) async => TestSessions.all);
  when(() => mockSessionRepository.getSession(any()))
      .thenAnswer((invocation) async {
    final id = invocation.positionalArguments[0] as String;
    return TestSessions.all.firstWhere(
      (s) => s.id == id,
      orElse: () => TestSessions.mathSession,
    );
  });
  when(() => mockSessionRepository.getActiveSessions(any()))
      .thenAnswer((_) async => TestSessions.active);
  when(() => mockSessionRepository.getSessionsByClass(any()))
      .thenAnswer((_) async => TestSessions.all);
  when(() => mockSessionRepository.createSession(any()))
      .thenAnswer((_) async => TestSessions.mathSession);
  when(() => mockSessionRepository.startSession(any()))
      .thenAnswer((_) async => TestSessions.mathSession);
  when(() => mockSessionRepository.endSession(any(), notes: any(named: 'notes')))
      .thenAnswer((_) async => TestSessions.mathSession);

  // Classes
  when(() => mockClassRepository.getClasses())
      .thenAnswer((_) async => TestClasses.all);
  when(() => mockClassRepository.getClass(any()))
      .thenAnswer((invocation) async {
    final id = invocation.positionalArguments[0] as String;
    return TestClasses.all.firstWhere(
      (c) => c.id == id,
      orElse: () => TestClasses.math5th,
    );
  });

  // IEP Goals
  when(() => mockIepRepository.getGoals(any()))
      .thenAnswer((_) async => TestIepGoals.all);
  when(() => mockIepRepository.getAllGoals())
      .thenAnswer((_) async => TestIepGoals.all);
  when(() => mockIepRepository.getGoalsAtRisk())
      .thenAnswer((_) async => []);
  when(() => mockIepRepository.recordProgress(any()))
      .thenAnswer((_) async => TestIepGoals.sampleProgress);

  // Messages
  when(() => mockMessageRepository.getConversations())
      .thenAnswer((_) async => TestMessages.conversations);
  when(() => mockMessageRepository.getMessages(any()))
      .thenAnswer((_) async => TestMessages.all);
  when(() => mockMessageRepository.getUnreadCount())
      .thenAnswer((_) async => TestMessages.unreadCount);
}

// ============================================================================
// Provider Overrides
// ============================================================================

/// Get default mock provider overrides.
List<Override> get defaultMockProviders {
  setupDefaultMocks();

  return [
    apiClientProvider.overrideWithValue(mockApiClient),
    offlineDatabaseProvider.overrideWithValue(mockOfflineDatabase),
    localDatabaseProvider.overrideWithValue(mockLocalDatabase),
    syncServiceProvider.overrideWithValue(mockSyncService),
    connectivityMonitorProvider.overrideWithValue(mockConnectivityMonitor),
    connectivityServiceProvider.overrideWithValue(mockConnectivityService),
    studentRepositoryProvider.overrideWithValue(mockStudentRepository),
    sessionRepositoryProvider.overrideWithValue(mockSessionRepository),
    iepRepositoryProvider.overrideWithValue(mockIepRepository),
    messageRepositoryProvider.overrideWithValue(mockMessageRepository),
    classRepositoryProvider.overrideWithValue(mockClassRepository),
  ];
}

/// Create mock providers with custom configuration.
List<Override> mockProvidersWithOverrides({
  bool isOnline = true,
  bool isAuthenticated = true,
  bool isLoading = false,
  Object? throwError,
  List<Student>? students,
  List<Session>? sessions,
  List<ClassGroup>? classes,
  List<IepGoal>? iepGoals,
  common.SyncState? syncState,
  int pendingOperations = 0,
}) {
  setupDefaultMocks();

  // Override connectivity
  when(() => mockConnectivityMonitor.isOnline).thenAnswer((_) async => isOnline);
  when(() => mockConnectivityMonitor.stateStream)
      .thenAnswer((_) => Stream.value(isOnline));

  // Override sync state
  if (syncState != null) {
    when(() => mockSyncService.status).thenReturn(
      SyncStatusInfo(state: syncState, pendingOperations: pendingOperations),
    );
  }

  // Handle loading state - delay responses
  if (isLoading) {
    when(() => mockStudentRepository.getStudents())
        .thenAnswer((_) => Future.delayed(const Duration(hours: 1), () => students ?? []));
    when(() => mockSessionRepository.getSessions())
        .thenAnswer((_) => Future.delayed(const Duration(hours: 1), () => sessions ?? []));
    when(() => mockClassRepository.getClasses())
        .thenAnswer((_) => Future.delayed(const Duration(hours: 1), () => classes ?? []));
  }

  // Handle error state
  if (throwError != null) {
    when(() => mockStudentRepository.getStudents())
        .thenThrow(throwError);
    when(() => mockSessionRepository.getSessions())
        .thenThrow(throwError);
    when(() => mockClassRepository.getClasses())
        .thenThrow(throwError);
  }

  // Override students
  if (students != null) {
    when(() => mockStudentRepository.getStudents())
        .thenAnswer((_) async => students);
  }

  // Override sessions
  if (sessions != null) {
    when(() => mockSessionRepository.getSessions())
        .thenAnswer((_) async => sessions);
    when(() => mockSessionRepository.getActiveSessions(any()))
        .thenAnswer((_) async => sessions.where((s) => s.isActive).toList());
  }

  // Override classes
  if (classes != null) {
    when(() => mockClassRepository.getClasses())
        .thenAnswer((_) async => classes);
  }

  // Override IEP goals
  if (iepGoals != null) {
    when(() => mockIepRepository.getGoals(any()))
        .thenAnswer((_) async => iepGoals);
    when(() => mockIepRepository.getAllGoals())
        .thenAnswer((_) async => iepGoals);
  }

  return defaultMockProviders;
}

/// Create mock providers for offline testing.
List<Override> get offlineMockProviders => mockProvidersWithOverrides(
      isOnline: false,
      syncState: common.SyncState.offline,
    );

/// Create mock providers with pending sync operations.
List<Override> mockProvidersWithPendingSync(int pendingCount) =>
    mockProvidersWithOverrides(
      pendingOperations: pendingCount,
      syncState: common.SyncState.idle,
    );

// ============================================================================
// Reset Mocks
// ============================================================================

/// Reset all mocks to their default state.
void resetAllMocks() {
  reset(mockApiClient);
  reset(mockOfflineDatabase);
  reset(mockLocalDatabase);
  reset(mockSyncService);
  reset(mockConnectivityMonitor);
  reset(mockConnectivityService);
  reset(mockStudentRepository);
  reset(mockSessionRepository);
  reset(mockIepRepository);
  reset(mockMessageRepository);
  reset(mockClassRepository);
}
