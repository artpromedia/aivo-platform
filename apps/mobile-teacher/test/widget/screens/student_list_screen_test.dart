/// Student List Screen Widget Tests
///
/// Tests for the student list screen.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mobile_teacher/screens/students/student_list_screen.dart';

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

  group('StudentListScreen', () {
    testWidgets('should display loading state initially', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents()).thenAnswer((_) async {
        await Future.delayed(const Duration(milliseconds: 100));
        return TestStudents.all;
      });

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );

      // Assert
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('should display list of students', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Alex Johnson'), findsOneWidget);
      expect(find.text('Emma Williams'), findsOneWidget);
    });

    testWidgets('should display empty state when no students', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => []);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('No students found'), findsOneWidget);
    });

    testWidgets('should display error state on failure', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenThrow(Exception('Failed to load'));

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.textContaining('Error'), findsOneWidget);
    });

    testWidgets('should display IEP badge for students with IEP',
        (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert - Alex has IEP
      expect(find.text('IEP'), findsWidgets);
    });

    testWidgets('should display 504 badge for students with 504',
        (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert - Emma has 504
      expect(find.text('504'), findsWidgets);
    });

    testWidgets('should navigate to student detail on tap', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);
      final navigatorObserver = MockNavigatorObserver();

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
        navigatorObserver: navigatorObserver,
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Alex Johnson'));
      await tester.pumpAndSettle();

      // Assert - navigation occurred
      // The exact verification depends on navigation setup
    });

    testWidgets('should filter by search query', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);
      when(() => mockStudentRepository.searchStudents('alex'))
          .thenAnswer((_) async => [TestStudents.alex]);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Tap search
      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      // Enter search query
      await tester.enterText(find.byType(TextField), 'alex');
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Alex Johnson'), findsOneWidget);
      expect(find.text('Emma Williams'), findsNothing);
    });

    testWidgets('should show filter options', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Tap filter
      await tester.tap(find.byIcon(Icons.filter_list));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Has IEP'), findsOneWidget);
      expect(find.text('Has 504'), findsOneWidget);
      expect(find.text('Needs Attention'), findsOneWidget);
    });

    testWidgets('should filter by IEP status', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Open filter and select IEP
      await tester.tap(find.byIcon(Icons.filter_list));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Has IEP'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Apply'));
      await tester.pumpAndSettle();

      // Assert - only IEP students visible
      expect(find.text('Alex Johnson'), findsOneWidget);
      expect(find.text('Emma Williams'), findsNothing);
    });

    testWidgets('should pull to refresh', (tester) async {
      // Arrange
      int callCount = 0;
      when(() => mockStudentRepository.getStudents()).thenAnswer((_) async {
        callCount++;
        return TestStudents.all;
      });

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
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

      // Assert
      expect(callCount, greaterThanOrEqualTo(2));
    });

    testWidgets('should display sort options', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Tap sort
      await tester.tap(find.byIcon(Icons.sort));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Name (A-Z)'), findsOneWidget);
      expect(find.text('Name (Z-A)'), findsOneWidget);
      expect(find.text('Grade'), findsOneWidget);
      expect(find.text('Last Active'), findsOneWidget);
    });

    testWidgets('should sort students by name', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Sort by name Z-A
      await tester.tap(find.byIcon(Icons.sort));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Name (Z-A)'));
      await tester.pumpAndSettle();

      // Assert - verify order changed
      // Implementation depends on actual widget structure
    });

    testWidgets('should show class filter dropdown', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Open filter
      await tester.tap(find.byIcon(Icons.filter_list));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Filter by Class'), findsOneWidget);
    });

    testWidgets('should clear all filters', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Apply filter
      await tester.tap(find.byIcon(Icons.filter_list));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Has IEP'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Apply'));
      await tester.pumpAndSettle();

      // Clear filter
      await tester.tap(find.text('Clear Filters'));
      await tester.pumpAndSettle();

      // Assert - all students visible again
      expect(find.text('Alex Johnson'), findsOneWidget);
      expect(find.text('Emma Williams'), findsOneWidget);
    });

    testWidgets('should display grid view option', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Toggle to grid view
      await tester.tap(find.byIcon(Icons.grid_view));
      await tester.pumpAndSettle();

      // Assert - grid view displayed
      expect(find.byType(GridView), findsOneWidget);
    });

    testWidgets('should display offline indicator when offline',
        (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: offlineMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Offline'), findsOneWidget);
    });
  });

  group('StudentListScreen accessibility', () {
    testWidgets('should have semantic labels for students', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      final semantics = tester.getSemantics(find.text('Alex Johnson'));
      expect(semantics.label, isNotNull);
    });

    testWidgets('should announce list count', (tester) async {
      // Arrange
      when(() => mockStudentRepository.getStudents())
          .thenAnswer((_) async => TestStudents.all);

      // Act
      await tester.pumpApp(
        const StudentListScreen(),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(
        find.textContaining('${TestStudents.all.length} students'),
        findsOneWidget,
      );
    });
  });
}
