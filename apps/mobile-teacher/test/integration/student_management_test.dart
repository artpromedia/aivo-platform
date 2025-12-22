/// Student Management Integration Tests
///
/// Tests for student management workflows.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:mobile_teacher/main.dart' as app;

import '../mocks/mock_providers.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Student Management Integration Tests', () {
    testWidgets('should display student list with filters', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('All Students'), findsOneWidget);
      expect(find.text('Alex Johnson'), findsOneWidget);
      expect(find.text('Emma Williams'), findsOneWidget);
    });

    testWidgets('should view student detail page', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Alex Johnson'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Student Profile'), findsOneWidget);
      expect(find.text('Alex Johnson'), findsOneWidget);
      expect(find.text('Grade 5'), findsOneWidget);
    });

    testWidgets('should display IEP goals for student with IEP',
        (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Alex Johnson')); // Has IEP
      await tester.pumpAndSettle();

      // Navigate to IEP tab
      await tester.tap(find.text('IEP Goals'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.textContaining('multiplication'), findsOneWidget);
      expect(find.byType(LinearProgressIndicator), findsWidgets);
    });

    testWidgets('should add progress entry to IEP goal', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Alex Johnson'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('IEP Goals'));
      await tester.pumpAndSettle();

      // Expand goal
      await tester.tap(find.textContaining('multiplication').first);
      await tester.pumpAndSettle();

      // Add progress
      await tester.tap(find.text('Add Progress'));
      await tester.pumpAndSettle();

      // Enter progress value
      await tester.enterText(
        find.byKey(const Key('progress-value')),
        '75',
      );
      await tester.enterText(
        find.byKey(const Key('progress-note')),
        'Improved with two-digit multiplication',
      );
      await tester.tap(find.text('Save'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Progress saved'), findsOneWidget);
    });

    testWidgets('should view student session history', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Alex Johnson'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Session History'), findsOneWidget);
      expect(find.byType(ListTile), findsWidgets);
    });

    testWidgets('should display accommodations for student', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Alex Johnson'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Accommodations'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Accommodations'), findsOneWidget);
      expect(find.text('Extended Time'), findsOneWidget);
    });

    testWidgets('should contact parent via email', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Alex Johnson'));
      await tester.pumpAndSettle();

      // Tap contact parent
      await tester.tap(find.byIcon(Icons.email));
      await tester.pumpAndSettle();

      // Assert - email compose dialog or app launched
      expect(
        find.text('Compose Email').evaluate().isNotEmpty ||
            find.byType(AlertDialog).evaluate().isNotEmpty,
        isTrue,
      );
    });

    testWidgets('should filter students by class', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();

      // Tap filter
      await tester.tap(find.byIcon(Icons.filter_list));
      await tester.pumpAndSettle();

      // Select class filter
      await tester.tap(find.text('5th Grade Math'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Apply'));
      await tester.pumpAndSettle();

      // Assert - only students in that class
      expect(find.text('Alex Johnson'), findsOneWidget);
    });

    testWidgets('should show attention needed for at-risk students',
        (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();

      // Filter by needs attention
      await tester.tap(find.byIcon(Icons.filter_list));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Needs Attention'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Apply'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.byIcon(Icons.warning), findsWidgets);
    });

    testWidgets('should navigate to student report', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Alex Johnson'));
      await tester.pumpAndSettle();

      // Tap reports
      await tester.tap(find.text('Reports'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Progress Report'), findsOneWidget);
      expect(find.text('IEP Summary'), findsOneWidget);
    });

    testWidgets('should generate PDF report', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Alex Johnson'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reports'));
      await tester.pumpAndSettle();

      // Generate report
      await tester.tap(find.text('Generate PDF'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Report Generated'), findsOneWidget);
    });

    testWidgets('should display student analytics', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Alex Johnson'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Analytics'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Progress Over Time'), findsOneWidget);
      expect(find.text('Engagement'), findsOneWidget);
    });

    testWidgets('should compare student to class average', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Alex Johnson'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Analytics'));
      await tester.pumpAndSettle();

      // Toggle comparison
      await tester.tap(find.text('Compare to Class'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Class Average'), findsOneWidget);
    });
  });
}
