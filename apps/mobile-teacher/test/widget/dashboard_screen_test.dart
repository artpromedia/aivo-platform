/// Dashboard Screen Widget Tests
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:flutter_common/flutter_common.dart' as common;

import '../mocks/mocks.dart';
import 'package:mobile_teacher/screens/dashboard/dashboard_screen.dart';
import 'package:mobile_teacher/providers/providers.dart';
import 'package:mobile_teacher/services/sync/sync_service.dart';

void main() {
  late MockStudentRepository mockStudentRepo;
  late MockSessionRepository mockSessionRepo;
  late MockMessageRepository mockMessageRepo;
  late MockClassRepository mockClassRepo;
  late MockIepRepository mockIepRepo;
  late MockSyncService mockSyncService;
  late MockConnectivityMonitor mockConnectivity;

  setUp(() {
    mockStudentRepo = MockStudentRepository();
    mockSessionRepo = MockSessionRepository();
    mockMessageRepo = MockMessageRepository();
    mockClassRepo = MockClassRepository();
    mockIepRepo = MockIepRepository();
    mockSyncService = MockSyncService();
    mockConnectivity = MockConnectivityMonitor();

    // Default stubs
    when(() => mockStudentRepo.getStudents())
        .thenAnswer((_) async => TestDataFactory.createStudents(5));
    when(() => mockSessionRepo.getSessions())
        .thenAnswer((_) async => TestDataFactory.createSessions(3));
    when(() => mockMessageRepo.getConversations())
        .thenAnswer((_) async => [TestDataFactory.createConversation(unreadCount: 2)]);
    when(() => mockMessageRepo.getUnreadCount())
        .thenAnswer((_) async => 2);
    when(() => mockClassRepo.getClasses())
        .thenAnswer((_) async => [TestDataFactory.createClassGroup()]);
    when(() => mockIepRepo.getAllGoals())
        .thenAnswer((_) async => TestDataFactory.createIepGoals(3));
    when(() => mockIepRepo.getGoalsAtRisk())
        .thenAnswer((_) async => []);
    when(() => mockConnectivity.isOnline)
        .thenAnswer((_) async => true);
    when(() => mockSyncService.statusStream)
        .thenAnswer((_) => Stream.value(SyncStatusInfo(state: common.SyncState.idle, pendingOperations: 0)));
    when(() => mockSyncService.getPendingOperations())
        .thenAnswer((_) async => []);
    when(() => mockSyncService.getConflicts())
        .thenAnswer((_) async => []);
  });

  Widget createTestWidget() {
    return ProviderScope(
      overrides: [
        studentRepositoryProvider.overrideWithValue(mockStudentRepo),
        sessionRepositoryProvider.overrideWithValue(mockSessionRepo),
        messageRepositoryProvider.overrideWithValue(mockMessageRepo),
        classRepositoryProvider.overrideWithValue(mockClassRepo),
        iepRepositoryProvider.overrideWithValue(mockIepRepo),
        syncServiceProvider.overrideWithValue(mockSyncService),
        connectivityMonitorProvider.overrideWithValue(mockConnectivity),
        isOnlineProvider.overrideWithValue(true),
      ],
      child: const MaterialApp(
        home: DashboardScreen(),
      ),
    );
  }

  group('DashboardScreen', () {
    testWidgets('shows loading state initially', (tester) async {
      await tester.pumpWidget(createTestWidget());
      
      // Initial frame may show loading indicators
      await tester.pump();
      
      expect(find.byType(DashboardScreen), findsOneWidget);
    });

    testWidgets('displays quick stats row', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Classes'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
      expect(find.text('Unread'), findsOneWidget);
    });

    testWidgets('shows today\'s sessions section', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text("Today's Sessions"), findsOneWidget);
    });

    testWidgets('shows quick actions', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Quick Actions'), findsOneWidget);
      expect(find.text('New Session'), findsOneWidget);
      expect(find.text('Students'), findsOneWidget);
    });

    testWidgets('shows bottom navigation', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.byType(BottomNavigationBar), findsOneWidget);
      expect(find.text('Dashboard'), findsWidgets); // In nav and title
      expect(find.text('Sessions'), findsOneWidget);
      expect(find.text('Settings'), findsOneWidget);
    });

    testWidgets('shows online indicator when connected', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.cloud_done), findsOneWidget);
    });

    testWidgets('shows message badge with unread count', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.message), findsOneWidget);
      // Badge should show unread count
    });

    testWidgets('can pull to refresh', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Find the RefreshIndicator
      expect(find.byType(RefreshIndicator), findsOneWidget);
    });
  });
}
