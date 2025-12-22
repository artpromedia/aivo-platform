/// App Integration Tests
///
/// Full application integration tests.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:mobile_teacher/main.dart' as app;

import '../helpers/helpers.dart';
import '../mocks/mock_providers.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('App Integration Tests', () {
    testWidgets('should launch app and display dashboard', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Dashboard'), findsOneWidget);
    });

    testWidgets('should navigate through bottom navigation', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      // Navigate to Students
      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();
      expect(find.text('All Students'), findsOneWidget);

      // Navigate to Sessions
      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();
      expect(find.text('Active Sessions'), findsOneWidget);

      // Navigate to Classes
      await tester.tap(find.text('Classes'));
      await tester.pumpAndSettle();
      expect(find.text('My Classes'), findsOneWidget);

      // Navigate back to Dashboard
      await tester.tap(find.text('Dashboard'));
      await tester.pumpAndSettle();
      expect(find.text('Welcome'), findsOneWidget);
    });

    testWidgets('should display student list and navigate to detail',
        (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      // Navigate to Students
      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();

      // Tap on a student
      await tester.tap(find.text('Alex Johnson'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Student Profile'), findsOneWidget);
      expect(find.text('IEP Goals'), findsOneWidget);
    });

    testWidgets('should create a new session', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      // Navigate to Sessions
      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();

      // Tap create session button
      await tester.tap(find.byTooltip('Create Session'));
      await tester.pumpAndSettle();

      // Fill in session details
      await tester.enterText(
        find.byKey(const Key('session-title-field')),
        'Test Session',
      );
      await tester.pumpAndSettle();

      // Select a class
      await tester.tap(find.byKey(const Key('class-selector')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('5th Grade Math'));
      await tester.pumpAndSettle();

      // Save session
      await tester.tap(find.text('Create'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Test Session'), findsOneWidget);
    });

    testWidgets('should handle offline mode gracefully', (tester) async {
      // Arrange - start offline
      setupDefaultMocks();
      final offlineProviders = offlineMockProviders;

      // Act
      await tester.pumpApp(
        const app.TeacherApp(),
        overrides: offlineProviders,
      );
      await tester.pumpAndSettle();

      // Assert - offline indicator should be visible
      expect(find.text('Offline'), findsOneWidget);

      // Assert - cached data should still be displayed
      expect(find.text('Dashboard'), findsOneWidget);
    });

    testWidgets('should search students', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      // Navigate to Students
      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();

      // Tap search icon
      await tester.tap(find.byIcon(Icons.search));
      await tester.pumpAndSettle();

      // Enter search query
      await tester.enterText(find.byType(TextField), 'Alex');
      await tester.pumpAndSettle();

      // Assert - only matching students shown
      expect(find.text('Alex Johnson'), findsOneWidget);
      expect(find.text('Emma Williams'), findsNothing);
    });

    testWidgets('should filter students by IEP status', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      // Navigate to Students
      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();

      // Tap filter button
      await tester.tap(find.byIcon(Icons.filter_list));
      await tester.pumpAndSettle();

      // Select IEP filter
      await tester.tap(find.text('Has IEP'));
      await tester.pumpAndSettle();

      // Apply filter
      await tester.tap(find.text('Apply'));
      await tester.pumpAndSettle();

      // Assert - only IEP students shown
      expect(find.text('Alex Johnson'), findsOneWidget); // Has IEP
      expect(find.text('Emma Williams'), findsNothing); // No IEP
    });

    testWidgets('should update IEP goal progress', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      // Navigate to student detail
      await tester.tap(find.text('Students'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Alex Johnson'));
      await tester.pumpAndSettle();

      // Navigate to IEP goals tab
      await tester.tap(find.text('IEP Goals'));
      await tester.pumpAndSettle();

      // Tap on a goal to update
      await tester.tap(find.textContaining('multiplication').first);
      await tester.pumpAndSettle();

      // Tap update progress
      await tester.tap(find.text('Update Progress'));
      await tester.pumpAndSettle();

      // Enter new progress value
      await tester.enterText(
        find.byKey(const Key('progress-value-field')),
        '75',
      );
      await tester.pumpAndSettle();

      // Save
      await tester.tap(find.text('Save'));
      await tester.pumpAndSettle();

      // Assert - progress updated
      expect(find.textContaining('75%'), findsOneWidget);
    });
  });
}
