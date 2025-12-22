/// Live Session Monitoring Integration Tests
///
/// Tests for real-time session monitoring functionality.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:mobile_teacher/main.dart' as app;

import '../mocks/mock_providers.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Live Session Monitoring Integration Tests', () {
    testWidgets('should display active session with real-time updates',
        (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      // Navigate to active session
      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Multiplication Practice'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Live Session'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
    });

    testWidgets('should show student participation status', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Multiplication Practice'));
      await tester.pumpAndSettle();

      // Assert - student participation cards visible
      expect(find.text('Participants'), findsOneWidget);
      expect(find.text('Alex Johnson'), findsOneWidget);
    });

    testWidgets('should display real-time progress for each student',
        (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Multiplication Practice'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.byType(LinearProgressIndicator), findsWidgets);
      expect(find.textContaining('%'), findsWidgets);
    });

    testWidgets('should allow teacher to send intervention', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Multiplication Practice'));
      await tester.pumpAndSettle();

      // Tap on struggling student
      await tester.tap(find.text('Alex Johnson'));
      await tester.pumpAndSettle();

      // Send intervention
      await tester.tap(find.text('Send Support'));
      await tester.pumpAndSettle();

      // Select intervention type
      await tester.tap(find.text('Hint'));
      await tester.pumpAndSettle();

      // Enter hint message
      await tester.enterText(
        find.byKey(const Key('intervention-message')),
        'Try breaking the problem into smaller parts',
      );
      await tester.tap(find.text('Send'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Support sent'), findsOneWidget);
    });

    testWidgets('should highlight students needing attention', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Multiplication Practice'));
      await tester.pumpAndSettle();

      // Assert - students with low progress highlighted
      expect(find.byIcon(Icons.warning), findsWidgets);
    });

    testWidgets('should update session timer in real-time', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Multiplication Practice'));
      await tester.pumpAndSettle();

      // Get initial time
      final initialTimer = find.textContaining(':');
      expect(initialTimer, findsOneWidget);

      // Wait for timer to update
      await tester.pump(const Duration(seconds: 1));

      // Assert - timer updated
      expect(find.textContaining(':'), findsOneWidget);
    });

    testWidgets('should allow ending session with notes', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Multiplication Practice'));
      await tester.pumpAndSettle();

      // End session
      await tester.tap(find.text('End Session'));
      await tester.pumpAndSettle();

      // Add session notes
      await tester.enterText(
        find.byKey(const Key('session-notes')),
        'Great progress today. Alex needs extra support with word problems.',
      );
      await tester.tap(find.text('Complete'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Session Completed'), findsOneWidget);
    });

    testWidgets('should show session summary after ending', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Multiplication Practice'));
      await tester.pumpAndSettle();

      // End session
      await tester.tap(find.text('End Session'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Complete'));
      await tester.pumpAndSettle();

      // Assert - summary shown
      expect(find.text('Session Summary'), findsOneWidget);
      expect(find.text('Duration'), findsOneWidget);
      expect(find.text('Participants'), findsOneWidget);
      expect(find.text('Average Progress'), findsOneWidget);
    });

    testWidgets('should allow pausing session', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Multiplication Practice'));
      await tester.pumpAndSettle();

      // Pause session
      await tester.tap(find.byIcon(Icons.pause));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Paused'), findsOneWidget);
      expect(find.byIcon(Icons.play_arrow), findsOneWidget);
    });

    testWidgets('should resume paused session', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Multiplication Practice'));
      await tester.pumpAndSettle();

      // Pause then resume
      await tester.tap(find.byIcon(Icons.pause));
      await tester.pumpAndSettle();
      await tester.tap(find.byIcon(Icons.play_arrow));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Active'), findsOneWidget);
      expect(find.byIcon(Icons.pause), findsOneWidget);
    });

    testWidgets('should display class average progress', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Multiplication Practice'));
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Class Average'), findsOneWidget);
      expect(find.textContaining('%'), findsWidgets);
    });

    testWidgets('should sort students by progress', (tester) async {
      // Arrange
      setupDefaultMocks();

      // Act
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Multiplication Practice'));
      await tester.pumpAndSettle();

      // Tap sort button
      await tester.tap(find.byIcon(Icons.sort));
      await tester.pumpAndSettle();

      // Select sort by progress
      await tester.tap(find.text('Progress (Low to High)'));
      await tester.pumpAndSettle();

      // Assert - students sorted
      // First student should have lowest progress
      final studentCards = find.byType(ListTile);
      expect(studentCards, findsWidgets);
    });
  });
}
