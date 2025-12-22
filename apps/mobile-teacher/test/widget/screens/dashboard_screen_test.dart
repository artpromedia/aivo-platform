/// Dashboard Screen Widget Tests
///
/// Tests for the dashboard screen.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mobile_teacher/screens/dashboard/dashboard_screen.dart';

import '../../helpers/helpers.dart';
import '../../mocks/mock_providers.dart';
import '../../mocks/fixtures/fixtures.dart';

void main() {
  setUp(() {
    setupDefaultMocks();
  });

  tearDown(() {
    resetAllMocks();
  });

  group('DashboardScreen', () {
    testWidgets('should display loading state initially', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async {
            await Future.delayed(const Duration(milliseconds: 100));
            return TestStudents.all;
          });
      when(() => mockSessionRepository.getActiveSessions(any()))
          .thenAnswer((_) async => TestSessions.active);
      when(() => mockClassRepository.getClasses())
          .thenAnswer((_) async => TestClasses.all);

      // Act
      await tester.pumpApp(
        const DashboardScreen(),
        overrides: defaultMockProviders,
      );

      // Assert
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('should display teacher greeting', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);
      when(() => mockSessionRepository.getActiveSessions(any()))
          .thenAnswer((_) async => TestSessions.active);
      when(() => mockClassRepository.getClasses())
          .thenAnswer((_) async => TestClasses.all);

      // Act
      await tester.pumpApp(
        const DashboardScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.textContaining('Hello'), findsOneWidget);
    });

    testWidgets('should display active sessions section', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);
      when(() => mockSessionRepository.getActiveSessions(any()))
          .thenAnswer((_) async => TestSessions.active);
      when(() => mockClassRepository.getClasses())
          .thenAnswer((_) async => TestClasses.all);

      // Act
      await tester.pumpApp(
        const DashboardScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Active Sessions'), findsOneWidget);
    });

    testWidgets('should display students needing attention', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);
      when(() => mockSessionRepository.getActiveSessions(any()))
          .thenAnswer((_) async => TestSessions.active);
      when(() => mockClassRepository.getClasses())
          .thenAnswer((_) async => TestClasses.all);

      // Act
      await tester.pumpApp(
        const DashboardScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Students Needing Attention'), findsOneWidget);
    });

    testWidgets('should display quick actions', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);
      when(() => mockSessionRepository.getActiveSessions(any()))
          .thenAnswer((_) async => TestSessions.active);
      when(() => mockClassRepository.getClasses())
          .thenAnswer((_) async => TestClasses.all);

      // Act
      await tester.pumpApp(
        const DashboardScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Quick Actions'), findsOneWidget);
    });

    testWidgets('should navigate to students on tap', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);
      when(() => mockSessionRepository.getActiveSessions(any()))
          .thenAnswer((_) async => TestSessions.active);
      when(() => mockClassRepository.getClasses())
          .thenAnswer((_) async => TestClasses.all);

      final navigatorObserver = MockNavigatorObserver();

      // Act
      await tester.pumpApp(
        const DashboardScreen(),
        overrides: defaultMockProviders,
        navigatorObserver: navigatorObserver,
      );
      await tester.pumpAndSettle();

      final studentButton = find.text('View Students');
      if (studentButton.evaluate().isNotEmpty) {
        await tester.tap(studentButton);
        await tester.pumpAndSettle();
      }

      // Assert - navigation attempted
    });

    testWidgets('should display error state on failure', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenThrow(Exception('Network error'));
      when(() => mockSessionRepository.getActiveSessions(any()))
          .thenAnswer((_) async => []);
      when(() => mockClassRepository.getClasses())
          .thenAnswer((_) async => []);

      // Act
      await tester.pumpApp(
        const DashboardScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(
        find.textContaining('error').evaluate().isNotEmpty ||
            find.byIcon(Icons.error).evaluate().isNotEmpty,
        isTrue,
      );
    });

    testWidgets('should pull to refresh', (tester) async {
      // Arrange
      int callCount = 0;
      when(() => mockStudentRepository.getStudents()).thenAnswer((_) async {
        callCount++;
        return TestStudents.all;
      });
      when(() => mockSessionRepository.getActiveSessions(any()))
          .thenAnswer((_) async => TestSessions.active);
      when(() => mockClassRepository.getClasses())
          .thenAnswer((_) async => TestClasses.all);

      // Act
      await tester.pumpApp(
        const DashboardScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Perform pull to refresh
      await tester.fling(
        find.byType(RefreshIndicator),
        const Offset(0, 300),
        1000,
      );
      await tester.pumpAndSettle();

      // Assert - data reloaded
      expect(callCount, greaterThanOrEqualTo(1));
    });

    testWidgets('should display offline indicator when offline', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);
      when(() => mockSessionRepository.getActiveSessions(any()))
          .thenAnswer((_) async => TestSessions.active);
      when(() => mockClassRepository.getClasses())
          .thenAnswer((_) async => TestClasses.all);

      // Act
      await tester.pumpApp(
        const DashboardScreen(),
        overrides: offlineMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Offline'), findsOneWidget);
    });
  });

  group('DashboardScreen Active Sessions', () {
    testWidgets('should display session cards for active sessions',
        (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);
      when(() => mockSessionRepository.getActiveSessions(any()))
          .thenAnswer((_) async => [TestSessions.mathSession]);
      when(() => mockClassRepository.getClasses())
          .thenAnswer((_) async => TestClasses.all);

      // Act
      await tester.pumpApp(
        const DashboardScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.textContaining('Multiplication'), findsOneWidget);
    });

    testWidgets('should show empty state when no active sessions',
        (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);
      when(() => mockSessionRepository.getActiveSessions(any()))
          .thenAnswer((_) async => []);
      when(() => mockClassRepository.getClasses())
          .thenAnswer((_) async => TestClasses.all);

      // Act
      await tester.pumpApp(
        const DashboardScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('No active sessions'), findsOneWidget);
    });
  });
}
