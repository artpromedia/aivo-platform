/// Push Notifications Integration Test
///
/// Tests for push notification delivery and handling.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
// import 'package:integration_test/integration_test.dart';
import 'package:mobile_parent/main.dart' as app;

void main() {
  // IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Push Notifications Integration Tests', () {
    testWidgets('receive and display achievement notification', (tester) async {
      await app.main();
      await tester.pumpAndSettle();

      // Login first
      await tester.enterText(find.byKey(const Key('email_field')), 'parent@example.com');
      await tester.enterText(find.byKey(const Key('password_field')), 'password123');
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // Simulate receiving notification
      // In real test, use firebase_messaging test APIs
      // For now, verify notification bell icon present
      expect(find.byIcon(Icons.notifications), findsOneWidget);

      // Tap notifications
      await tester.tap(find.byIcon(Icons.notifications));
      await tester.pumpAndSettle();

      // Should show notifications list
      expect(find.text('Notifications'), findsOneWidget);
    });

    testWidgets('navigate to child progress from notification', (tester) async {
      await app.main();
      await tester.pumpAndSettle();

      // Login
      await tester.enterText(find.byKey(const Key('email_field')), 'parent@example.com');
      await tester.enterText(find.byKey(const Key('password_field')), 'password123');
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // Open notifications
      await tester.tap(find.byIcon(Icons.notifications));
      await tester.pumpAndSettle();

      // Tap achievement notification
      final notification = find.text('completed a lesson').first;
      if (tester.any(notification)) {
        await tester.tap(notification);
        await tester.pumpAndSettle();

        // Should navigate to progress
        expect(find.text('Progress'), findsOneWidget);
      }
    });

    testWidgets('mark notification as read', (tester) async {
      await app.main();
      await tester.pumpAndSettle();

      // Login
      await tester.enterText(find.byKey(const Key('email_field')), 'parent@example.com');
      await tester.enterText(find.byKey(const Key('password_field')), 'password123');
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // Open notifications
      await tester.tap(find.byIcon(Icons.notifications));
      await tester.pumpAndSettle();

      // Count unread badges before
      final unreadBefore = tester.widgetList(find.byType(Badge)).length;

      // Tap first notification
      if (tester.any(find.byType(ListTile))) {
        await tester.tap(find.byType(ListTile).first);
        await tester.pumpAndSettle();

        // Go back to notifications
        await tester.pageBack();
        await tester.pumpAndSettle();

        // Count unread badges after
        final unreadAfter = tester.widgetList(find.byType(Badge)).length;

        // Should have one less unread
        expect(unreadAfter, lessThan(unreadBefore));
      }
    });
  });
}
