/// Parent App Onboarding Integration Test
///
/// Critical path tests for parent onboarding flow.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
// import 'package:integration_test/integration_test.dart';
import 'package:mobile_parent/main.dart' as app;

void main() {
  // IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Parent Onboarding Integration Tests', () {
    testWidgets('complete onboarding flow from signup to dashboard', (tester) async {
      await app.main();
      await tester.pumpAndSettle();

      // 1. Initial welcome screen
      expect(find.text('Welcome to Aivo'), findsOneWidget);
      await tester.tap(find.text('Get Started'));
      await tester.pumpAndSettle();

      // 2. Signup screen
      await tester.enterText(find.byKey(const Key('email_field')), 'parent@example.com');
      await tester.enterText(find.byKey(const Key('password_field')), 'SecurePassword123!');
      await tester.tap(find.text('Create Account'));
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // 3. Add first child
      expect(find.text('Add Your First Child'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('child_name')), 'Sarah');
      await tester.enterText(find.byKey(const Key('child_age')), '8');
      await tester.tap(find.text('3rd Grade'));
      await tester.pumpAndSettle();
      
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();

      // 4. Learning preferences
      expect(find.text('Learning Preferences'), findsOneWidget);
      await tester.tap(find.text('Math'));
      await tester.tap(find.text('Reading'));
      await tester.pumpAndSettle();
      
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();

      // 5. Trial offer
      expect(find.text('Start Free Trial'), findsOneWidget);
      await tester.tap(find.text('Start 7-Day Trial'));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // 6. Payment screen
      expect(find.text('Payment Information'), findsOneWidget);
      
      // Skip payment for test (tap "Skip Trial" if available)
      final skipButton = find.text('Skip for Now');
      if (tester.any(skipButton)) {
        await tester.tap(skipButton);
        await tester.pumpAndSettle();
      }

      // 7. Dashboard loaded
      expect(find.text('Dashboard'), findsOneWidget);
      expect(find.text('Sarah'), findsOneWidget);
    });

    testWidgets('onboarding handles missing fields gracefully', (tester) async {
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Get Started'));
      await tester.pumpAndSettle();

      // Try to submit without filling fields
      await tester.tap(find.text('Create Account'));
      await tester.pumpAndSettle();

      // Should show validation errors
      expect(find.text('Email is required'), findsOneWidget);
      expect(find.text('Password is required'), findsOneWidget);
    });

    testWidgets('can skip adding child during onboarding', (tester) async {
      await app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Get Started'));
      await tester.pumpAndSettle();

      // Complete signup
      await tester.enterText(find.byKey(const Key('email_field')), 'parent2@example.com');
      await tester.enterText(find.byKey(const Key('password_field')), 'SecurePassword123!');
      await tester.tap(find.text('Create Account'));
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Skip adding child
      final skipButton = find.text('Skip for Now');
      if (tester.any(skipButton)) {
        await tester.tap(skipButton);
        await tester.pumpAndSettle();

        // Should navigate to dashboard
        expect(find.text('Dashboard'), findsOneWidget);
      }
    });
  });
}
