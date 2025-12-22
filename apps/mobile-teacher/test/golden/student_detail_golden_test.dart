/// Student Detail Golden Tests
///
/// Visual regression tests for the student detail screen.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:golden_toolkit/golden_toolkit.dart';

import 'package:mobile_teacher/screens/students/student_detail_screen.dart';

import '../helpers/helpers.dart';
import '../mocks/mock_providers.dart';
import '../mocks/fixtures/fixtures.dart';

void main() {
  setUpAll(() async {
    await loadAppFonts();
  });

  setUp(() {
    setupDefaultMocks();
  });

  tearDown(() {
    resetAllMocks();
  });

  group('Student Detail Golden Tests', () {
    testGoldens('should match profile tab golden on iPhone 14', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        StudentDetailScreen(studentId: TestStudents.alex.id),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_profile_iphone_14');
    });

    testGoldens('should match IEP goals tab golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        StudentDetailScreen(
          studentId: TestStudents.alex.id,
          initialTab: 1,
        ),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_iep_goals');
    });

    testGoldens('should match sessions tab golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        StudentDetailScreen(
          studentId: TestStudents.alex.id,
          initialTab: 2,
        ),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_sessions');
    });

    testGoldens('should match accommodations tab golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        StudentDetailScreen(
          studentId: TestStudents.alex.id,
          initialTab: 3,
        ),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_accommodations');
    });

    testGoldens('should match student without IEP golden', (tester) async {
      // Arrange - Emma doesn't have IEP
      await tester.pumpWidgetBuilder(
        StudentDetailScreen(studentId: TestStudents.emma.id),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_no_iep');
    });

    testGoldens('should match student with 504 golden', (tester) async {
      // Arrange - Emma has 504
      await tester.pumpWidgetBuilder(
        StudentDetailScreen(studentId: TestStudents.emma.id),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_504');
    });

    testGoldens('should match dark mode golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        StudentDetailScreen(studentId: TestStudents.alex.id),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
          brightness: Brightness.dark,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_dark_mode');
    });

    testGoldens('should match iPad layout golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        StudentDetailScreen(studentId: TestStudents.alex.id),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPadPro.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_ipad');
    });

    testGoldens('should match at-risk goal highlighting golden',
        (tester) async {
      // Arrange - setup student with at-risk goals
      final atRiskProviders = mockProvidersWithOverrides(
        iepGoals: [TestIepGoals.atRiskGoal],
      );

      await tester.pumpWidgetBuilder(
        StudentDetailScreen(
          studentId: TestStudents.alex.id,
          initialTab: 1, // IEP Goals tab
        ),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: atRiskProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_at_risk_goal');
    });

    testGoldens('should match achieved goal golden', (tester) async {
      // Arrange
      final achievedProviders = mockProvidersWithOverrides(
        iepGoals: [TestIepGoals.achievedGoal],
      );

      await tester.pumpWidgetBuilder(
        StudentDetailScreen(
          studentId: TestStudents.alex.id,
          initialTab: 1,
        ),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: achievedProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_achieved_goal');
    });
  });

  group('Student Detail Accessibility Golden Tests', () {
    testGoldens('should match large font golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(1.5)),
          child: StudentDetailScreen(studentId: TestStudents.alex.id),
        ),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_large_font');
    });

    testGoldens('should match high contrast golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        MediaQuery(
          data: const MediaQueryData(highContrast: true),
          child: StudentDetailScreen(studentId: TestStudents.alex.id),
        ),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_high_contrast');
    });
  });

  group('Student Detail Component Golden Tests', () {
    testGoldens('should match IEP goal card expanded golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        StudentDetailScreen(
          studentId: TestStudents.alex.id,
          initialTab: 1,
        ),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Expand first goal
      await tester.tap(find.textContaining('multiplication').first);
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_goal_expanded');
    });

    testGoldens('should match progress history chart golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        StudentDetailScreen(
          studentId: TestStudents.alex.id,
          initialTab: 1,
        ),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Navigate to progress chart
      await tester.tap(find.textContaining('multiplication').first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('View Progress History'));
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'student_detail_progress_chart');
    });
  });
}
