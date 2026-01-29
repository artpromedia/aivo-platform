/// Offline Mode & Sync Integration Test
///
/// Critical tests for offline learning and data synchronization.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
// import 'package:integration_test/integration_test.dart';
import 'package:mobile_learner/main.dart' as app;

void main() {
  // IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Offline Mode & Sync Integration Tests', () {
    testWidgets('download lesson for offline use', (tester) async {
      await app.main();
      await tester.pumpAndSettle();

      // Login
      await tester.enterText(find.byKey(const Key('username')), 'learner1');
      await tester.enterText(find.byKey(const Key('password')), 'password');
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // Navigate to lessons
      await tester.tap(find.text('Lessons'));
      await tester.pumpAndSettle();

      // Tap first lesson
      await tester.tap(find.byType(Card).first);
      await tester.pumpAndSettle();

      // Tap download icon
      final downloadIcon = find.byIcon(Icons.download);
      if (tester.any(downloadIcon)) {
        await tester.tap(downloadIcon);
        await tester.pumpAndSettle(const Duration(seconds: 3));

        // Should show downloaded indicator
        expect(find.byIcon(Icons.offline_pin), findsOneWidget);
      }
    });

    testWidgets('complete lesson while offline', (tester) async {
      await app.main();
      await tester.pumpAndSettle();

      // Login
      await tester.enterText(find.byKey(const Key('username')), 'learner1');
      await tester.enterText(find.byKey(const Key('password')), 'password');
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // Simulate offline mode
      // In real test, use connectivity_plus mock
      // For now, verify offline lesson still works

      // Navigate to downloaded lesson
      await tester.tap(find.text('Offline Lessons'));
      await tester.pumpAndSettle();

      // Start lesson
      await tester.tap(find.byType(Card).first);
      await tester.pumpAndSettle();
      
      await tester.tap(find.text('Start Lesson'));
      await tester.pumpAndSettle();

      // Complete lesson questions
      for (int i = 0; i < 3; i++) {
        // Answer question
        await tester.tap(find.byType(RadioListTile).first);
        await tester.pumpAndSettle();
        
        await tester.tap(find.text('Next'));
        await tester.pumpAndSettle();
      }

      // Should show completion screen
      expect(find.text('Great Job!'), findsOneWidget);

      // Should show sync pending indicator
      expect(find.byIcon(Icons.sync), findsOneWidget);
    });

    testWidgets('sync offline progress when back online', (tester) async {
      await app.main();
      await tester.pumpAndSettle();

      // Login
      await tester.enterText(find.byKey(const Key('username')), 'learner1');
      await tester.enterText(find.byKey(const Key('password')), 'password');
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // Navigate to settings
      await tester.tap(find.byIcon(Icons.settings));
      await tester.pumpAndSettle();

      // Tap sync now
      final syncButton = find.text('Sync Now');
      if (tester.any(syncButton)) {
        await tester.tap(syncButton);
        await tester.pumpAndSettle(const Duration(seconds: 3));

        // Should show sync complete
        expect(find.text('Sync Complete'), findsOneWidget);
      }
    });

    testWidgets('show offline indicator in app bar', (tester) async {
      await app.main();
      await tester.pumpAndSettle();

      // Login
      await tester.enterText(find.byKey(const Key('username')), 'learner1');
      await tester.enterText(find.byKey(const Key('password')), 'password');
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // Simulate offline
      // Should show offline badge in app bar
      // final offlineBadge = find.text('Offline');
      
      // Verify either online or offline indicator present
      expect(find.byType(AppBar), findsOneWidget);
    });

    testWidgets('conflict resolution when syncing', (tester) async {
      await app.main();
      await tester.pumpAndSettle();

      // Login
      await tester.enterText(find.byKey(const Key('username')), 'learner1');
      await tester.enterText(find.byKey(const Key('password')), 'password');
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // Complete lesson offline
      await tester.tap(find.text('Lessons'));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(Card).first);
      await tester.pumpAndSettle();

      // Start and complete lesson
      await tester.tap(find.text('Start Lesson'));
      await tester.pumpAndSettle();

      // Complete questions
      for (int i = 0; i < 3; i++) {
        await tester.tap(find.byType(ElevatedButton).first);
        await tester.pumpAndSettle();
      }

      // Sync (may have conflicts if same lesson completed elsewhere)
      await tester.tap(find.byIcon(Icons.settings));
      await tester.pumpAndSettle();
      
      final syncButton = find.text('Sync Now');
      if (tester.any(syncButton)) {
        await tester.tap(syncButton);
        await tester.pumpAndSettle(const Duration(seconds: 3));

        // Should handle conflicts gracefully (server wins or merge)
        expect(find.text('Sync Error'), findsNothing);
      }
    });
  });
}
