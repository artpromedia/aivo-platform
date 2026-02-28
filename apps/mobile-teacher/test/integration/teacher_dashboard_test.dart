/// Teacher Dashboard Integration Tests — Container 10
///
/// Integration tests covering:
/// - Bottom navigation across all 4 tabs (Classes, Assignments, Calendar, Messages)
/// - Settings screen navigation & structure
/// - Class detail → Session flow
/// - Login / auth redirect
/// - Sign out
/// - Profile editor
/// - Push notification / Dark mode toggles
/// - Accessibility settings navigation
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:mobile_teacher/main.dart' as app;

import '../helpers/helpers.dart';
import '../mocks/mock_providers.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Teacher Dashboard Integration Tests', () {
    // ─────────────────────────────────────────────────────────────────────
    // BOTTOM NAVIGATION
    // ─────────────────────────────────────────────────────────────────────

    group('Bottom Navigation', () {
      testWidgets('should display all 4 bottom navigation tabs',
          (tester) async {
        setupDefaultMocks();
        await app.main();
        await tester.pumpAndSettle();

        // Verify all 4 tabs exist
        expect(find.text('Classes'), findsWidgets);
        expect(find.text('Assignments'), findsWidgets);
        expect(find.text('Calendar'), findsWidgets);
        expect(find.text('Messages'), findsWidgets);
      });

      testWidgets('should navigate to Assignments tab', (tester) async {
        setupDefaultMocks();
        await app.main();
        await tester.pumpAndSettle();

        await tester.tap(find.text('Assignments'));
        await tester.pumpAndSettle();

        // Assignments screen should render
        expect(find.byIcon(Icons.assignment), findsWidgets);
      });

      testWidgets('should navigate to Calendar tab', (tester) async {
        setupDefaultMocks();
        await app.main();
        await tester.pumpAndSettle();

        await tester.tap(find.text('Calendar'));
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.calendar_month), findsWidgets);
      });

      testWidgets('should navigate to Messages tab', (tester) async {
        setupDefaultMocks();
        await app.main();
        await tester.pumpAndSettle();

        await tester.tap(find.text('Messages'));
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.message), findsWidgets);
      });

      testWidgets('should navigate back to Classes tab', (tester) async {
        setupDefaultMocks();
        await app.main();
        await tester.pumpAndSettle();

        // Go to Messages first
        await tester.tap(find.text('Messages'));
        await tester.pumpAndSettle();

        // Navigate back to Classes
        await tester.tap(find.text('Classes'));
        await tester.pumpAndSettle();

        expect(find.byIcon(Icons.school), findsWidgets);
      });
    });

    // ─────────────────────────────────────────────────────────────────────
    // SETTINGS SCREEN
    // ─────────────────────────────────────────────────────────────────────

    group('Settings Screen', () {
      testWidgets('should display settings sections', (tester) async {
        setupDefaultMocks();
        await tester.pumpRouterApp(
          const app.TeacherApp(),
          initialLocation: '/settings',
          overrides: defaultMockProviders,
        );
        await tester.pumpAndSettle();

        // AppBar title
        expect(find.text('Settings'), findsOneWidget);

        // Main sections
        expect(find.text('Notifications'), findsWidgets);
        expect(find.text('Appearance & Accessibility'), findsOneWidget);
        expect(find.text('Data & Privacy'), findsOneWidget);
        expect(find.text('Support'), findsOneWidget);
      });

      testWidgets('should have Push Notifications toggle', (tester) async {
        setupDefaultMocks();
        await tester.pumpRouterApp(
          const app.TeacherApp(),
          initialLocation: '/settings',
          overrides: defaultMockProviders,
        );
        await tester.pumpAndSettle();

        expect(find.text('Push Notifications'), findsOneWidget);
        // Should have a Switch widget for the toggle
        expect(find.byType(Switch), findsWidgets);
      });

      testWidgets('should have Dark Mode toggle', (tester) async {
        setupDefaultMocks();
        await tester.pumpRouterApp(
          const app.TeacherApp(),
          initialLocation: '/settings',
          overrides: defaultMockProviders,
        );
        await tester.pumpAndSettle();

        // Scroll down to find Dark Mode (may be off-screen)
        await tester.scrollUntilVisible(
          find.text('Dark Mode'),
          200,
          scrollable: find.byType(Scrollable).first,
        );
        expect(find.text('Dark Mode'), findsOneWidget);
      });

      testWidgets('should open profile editor bottom sheet', (tester) async {
        setupDefaultMocks();
        await tester.pumpRouterApp(
          const app.TeacherApp(),
          initialLocation: '/settings',
          overrides: defaultMockProviders,
        );
        await tester.pumpAndSettle();

        // Tap edit icon on profile card
        await tester.tap(find.byIcon(Icons.edit));
        await tester.pumpAndSettle();

        // Bottom sheet shows Edit Profile
        expect(find.text('Edit Profile'), findsOneWidget);
        expect(find.text('Display Name'), findsOneWidget);
        expect(find.text('Save Changes'), findsOneWidget);
        expect(find.text('Cancel'), findsOneWidget);
      });

      testWidgets('should save profile from editor', (tester) async {
        setupDefaultMocks();
        await tester.pumpRouterApp(
          const app.TeacherApp(),
          initialLocation: '/settings',
          overrides: defaultMockProviders,
        );
        await tester.pumpAndSettle();

        // Open profile editor
        await tester.tap(find.byIcon(Icons.edit));
        await tester.pumpAndSettle();

        // Clear and enter new name
        await tester.enterText(
          find.byType(TextField).last,
          'New Teacher Name',
        );
        await tester.pumpAndSettle();

        // Tap Save Changes
        await tester.tap(find.text('Save Changes'));
        await tester.pumpAndSettle();

        // SnackBar should show success
        expect(find.text('Profile updated'), findsOneWidget);
      });

      testWidgets('should show Sign Out button', (tester) async {
        setupDefaultMocks();
        await tester.pumpRouterApp(
          const app.TeacherApp(),
          initialLocation: '/settings',
          overrides: defaultMockProviders,
        );
        await tester.pumpAndSettle();

        // Scroll to Sign Out
        await tester.scrollUntilVisible(
          find.text('Sign Out'),
          200,
          scrollable: find.byType(Scrollable).first,
        );
        expect(find.text('Sign Out'), findsOneWidget);
      });

      testWidgets('should show About dialog', (tester) async {
        setupDefaultMocks();
        await tester.pumpRouterApp(
          const app.TeacherApp(),
          initialLocation: '/settings',
          overrides: defaultMockProviders,
        );
        await tester.pumpAndSettle();

        // Scroll to find About
        await tester.scrollUntilVisible(
          find.text('About'),
          200,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.tap(find.text('About'));
        await tester.pumpAndSettle();

        // About dialog
        expect(find.text('Aivo Teacher'), findsWidgets);
        expect(find.textContaining('1.0.0'), findsWidgets);
      });

      testWidgets('should navigate to Accessibility settings', (tester) async {
        setupDefaultMocks();
        await tester.pumpRouterApp(
          const app.TeacherApp(),
          initialLocation: '/settings',
          overrides: defaultMockProviders,
        );
        await tester.pumpAndSettle();

        await tester.tap(find.text('Accessibility'));
        await tester.pumpAndSettle();

        // Should navigate to accessibility screen
        expect(find.text('Accessibility'), findsWidgets);
      });
    });

    // ─────────────────────────────────────────────────────────────────────
    // CLASS DETAIL → SESSION FLOW
    // ─────────────────────────────────────────────────────────────────────

    group('Class Detail Flow', () {
      testWidgets('should display classes list on launch', (tester) async {
        setupDefaultMocks();
        await app.main();
        await tester.pumpAndSettle();

        // Classes tab is default (index 0) — should show class cards
        expect(find.byIcon(Icons.school), findsWidgets);
      });

      testWidgets('should show class roster when tapping a class',
          (tester) async {
        setupDefaultMocks();
        await app.main();
        await tester.pumpAndSettle();

        // Tap first class card if visible
        final classCard = find.byType(Card).first;
        if (classCard.evaluate().isNotEmpty) {
          await tester.tap(classCard);
          await tester.pumpAndSettle();

          // Should show class roster screen with student list
          expect(find.byType(Scaffold), findsWidgets);
        }
      });
    });

    // ─────────────────────────────────────────────────────────────────────
    // LOGIN / AUTH
    // ─────────────────────────────────────────────────────────────────────

    group('Login & Auth', () {
      testWidgets('should display login screen when unauthenticated',
          (tester) async {
        setupDefaultMocks();
        await tester.pumpRouterApp(
          const app.TeacherApp(),
          initialLocation: '/login',
          overrides: defaultMockProviders,
        );
        await tester.pumpAndSettle();

        // Login screen elements
        expect(find.byType(TextField), findsWidgets); // email + password
        expect(find.text('Sign In'), findsWidgets);
      });

      testWidgets('should show email and password fields', (tester) async {
        setupDefaultMocks();
        await tester.pumpRouterApp(
          const app.TeacherApp(),
          initialLocation: '/login',
          overrides: defaultMockProviders,
        );
        await tester.pumpAndSettle();

        // Find text fields by decoration label
        expect(find.text('Email'), findsWidgets);
        expect(find.text('Password'), findsWidgets);
      });
    });

    // ─────────────────────────────────────────────────────────────────────
    // REPORTS SCREEN
    // ─────────────────────────────────────────────────────────────────────

    group('Reports', () {
      testWidgets('should display reports screen', (tester) async {
        setupDefaultMocks();
        await tester.pumpRouterApp(
          const app.TeacherApp(),
          initialLocation: '/reports',
          overrides: defaultMockProviders,
        );
        await tester.pumpAndSettle();

        // Reports screen should render without errors
        expect(find.byType(Scaffold), findsWidgets);
      });
    });

    // ─────────────────────────────────────────────────────────────────────
    // MESSAGES / COMPOSE
    // ─────────────────────────────────────────────────────────────────────

    group('Messages', () {
      testWidgets('messages tab shows message list', (tester) async {
        setupDefaultMocks();
        await app.main();
        await tester.pumpAndSettle();

        // Navigate to Messages
        await tester.tap(find.text('Messages'));
        await tester.pumpAndSettle();

        // Should show messages screen content
        expect(find.byIcon(Icons.message), findsWidgets);
      });
    });

    // ─────────────────────────────────────────────────────────────────────
    // OFFLINE MODE
    // ─────────────────────────────────────────────────────────────────────

    group('Offline Resilience', () {
      testWidgets('should show offline indicator when disconnected',
          (tester) async {
        setupDefaultMocks();

        await tester.pumpApp(
          const app.TeacherApp(),
          overrides: offlineMockProviders,
        );
        await tester.pumpAndSettle();

        expect(find.text('Offline'), findsOneWidget);
      });

      testWidgets('offline mode still renders bottom navigation',
          (tester) async {
        setupDefaultMocks();

        await tester.pumpApp(
          const app.TeacherApp(),
          overrides: offlineMockProviders,
        );
        await tester.pumpAndSettle();

        // Navigation should still be present
        expect(find.text('Classes'), findsWidgets);
        expect(find.text('Assignments'), findsWidgets);
      });
    });

    // ─────────────────────────────────────────────────────────────────────
    // CROSS-SCREEN NAVIGATION
    // ─────────────────────────────────────────────────────────────────────

    group('Cross-Screen Navigation', () {
      testWidgets('should navigate from Classes to Settings and back',
          (tester) async {
        setupDefaultMocks();
        await app.main();
        await tester.pumpAndSettle();

        // Find Settings gear or navigate via route
        // The AppBar on ClassesScreen may have a settings icon
        final settingsIcon = find.byIcon(Icons.settings);
        if (settingsIcon.evaluate().isNotEmpty) {
          await tester.tap(settingsIcon);
          await tester.pumpAndSettle();

          expect(find.text('Settings'), findsOneWidget);

          // Navigate back
          await tester.tap(find.byType(BackButton).first);
          await tester.pumpAndSettle();

          expect(find.text('Classes'), findsWidgets);
        }
      });

      testWidgets('should navigate between all tabs without errors',
          (tester) async {
        setupDefaultMocks();
        await app.main();
        await tester.pumpAndSettle();

        // Rapid-fire tab switching
        for (final tab in ['Assignments', 'Calendar', 'Messages', 'Classes']) {
          await tester.tap(find.text(tab));
          await tester.pumpAndSettle();
        }

        // Should still be on Classes tab without crash
        expect(find.byIcon(Icons.school), findsWidgets);
      });
    });
  });
}
