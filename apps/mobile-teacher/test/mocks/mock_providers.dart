/// Mock Providers
///
/// Riverpod provider overrides for testing.
library;

import 'dart:async';

import 'package:flutter_common/flutter_common.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mobile_teacher/models/models.dart';
import 'package:mobile_teacher/providers/providers.dart';
import 'package:mobile_teacher/repositories/repositories.dart';
import 'package:mobile_teacher/services/database/local_database.dart';
import 'package:mobile_teacher/services/sync/sync_service.dart';
import 'package:mobile_teacher/services/sync/connectivity_monitor.dart';

import 'mock_services.dart';
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
  when(() => mockConnectivityMonitor.isOnlineSync).thenReturn(true);
  when(() => mockConnectivityMonitor.stateStream)
      .thenAnswer((_) => Stream.value(true));

  when(() => mockConnectivityService.isOnline).thenReturn(true);
  when(() => mockConnectivityService.onConnectivityChanged)
      .thenAnswer((_) => Stream.value(true));
}

void _setupSyncMocks() {
  when(() => mockSyncService.status).thenReturn(
    const SyncStatusInfo(state: SyncState.idle, pendingOperations: 0),
  );
  when(() => mockSyncService.statusStream).thenAnswer(
    (_) => Stream.value(const SyncStatusInfo(state: SyncState.idle)),
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
  when(() => mockStudentRepository.searchStudents(any()))
      .thenAnswer((invocation) async {
    final query = invocation.positionalArguments[0] as String;
    return TestStudents.all
        .where((s) => s.fullName.toLowerCase().contains(query.toLowerCase()))
        .toList();
  });

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
  when(() => mockSessionRepository.getActiveSessions())
      .thenAnswer((_) async => TestSessions.active);
  when(() => mockSessionRepository.getSessionsByClass(any()))
      .thenAnswer((_) async => TestSessions.all);
  when(() => mockSessionRepository.createSession(any()))
      .thenAnswer((invocation) async {
    final session = invocation.positionalArguments[0] as Session;
    return session;
  });
  when(() => mockSessionRepository.updateSession(any()))
      .thenAnswer((invocation) async {
    final session = invocation.positionalArguments[0] as Session;
    return session;
  });

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
  when(() => mockIepRepository.getGoalsForStudent(any()))
      .thenAnswer((_) async => TestIepGoals.all);
  when(() => mockIepRepository.getGoal(any())).thenAnswer((invocation) async {
    final id = invocation.positionalArguments[0] as String;
    return TestIepGoals.all.firstWhere(
      (g) => g.id == id,
      orElse: () => TestIepGoals.multiplicationGoal,
    );
  });
  when(() => mockIepRepository.updateProgress(any(), any(), any()))
      .thenAnswer((_) async => TestIepGoals.multiplicationGoal);

  // Messages
  when(() => mockMessageRepository.getMessages())
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
  List<Student>? students,
  List<Session>? sessions,
  List<ClassGroup>? classes,
  List<IepGoal>? iepGoals,
  SyncState? syncState,
  int pendingOperations = 0,
}) {
  setupDefaultMocks();

  // Override connectivity
  when(() => mockConnectivityMonitor.isOnline).thenAnswer((_) async => isOnline);
  when(() => mockConnectivityMonitor.isOnlineSync).thenReturn(isOnline);
  when(() => mockConnectivityMonitor.stateStream)
      .thenAnswer((_) => Stream.value(isOnline));

  // Override sync state
  if (syncState != null) {
    when(() => mockSyncService.status).thenReturn(
      SyncStatusInfo(state: syncState, pendingOperations: pendingOperations),
    );
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
    when(() => mockSessionRepository.getActiveSessions())
        .thenAnswer((_) async => sessions.where((s) => s.isActive).toList());
  }

  // Override classes
  if (classes != null) {
    when(() => mockClassRepository.getClasses())
        .thenAnswer((_) async => classes);
  }

  // Override IEP goals
  if (iepGoals != null) {
    when(() => mockIepRepository.getGoalsForStudent(any()))
        .thenAnswer((_) async => iepGoals);
  }

  return defaultMockProviders;
}

/// Create mock providers for offline testing.
List<Override> get offlineMockProviders => mockProvidersWithOverrides(
      isOnline: false,
      syncState: SyncState.offline,
    );

/// Create mock providers with pending sync operations.
List<Override> mockProvidersWithPendingSync(int pendingCount) =>
    mockProvidersWithOverrides(
      pendingOperations: pendingCount,
      syncState: SyncState.idle,
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
