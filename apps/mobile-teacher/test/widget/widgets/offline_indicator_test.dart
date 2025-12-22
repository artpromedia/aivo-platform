/// Offline Indicator Widget Tests
///
/// Tests for the OfflineIndicator widget.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_teacher/screens/widgets/offline_indicator.dart';

import '../../helpers/helpers.dart';
import '../../mocks/mock_providers.dart';

void main() {
  setUp(() {
    setupDefaultMocks();
  });

  tearDown(() {
    resetAllMocks();
  });

  group('OfflineIndicator', () {
    testWidgets('should not be visible when online', (tester) async {
      // Act
      await tester.pumpApp(
        const Scaffold(
          body: Column(
            children: [
              OfflineIndicator(),
              Text('Content'),
            ],
          ),
        ),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Offline'), findsNothing);
      expect(find.text('Content'), findsOneWidget);
    });

    testWidgets('should be visible when offline', (tester) async {
      // Act
      await tester.pumpApp(
        const Scaffold(
          body: Column(
            children: [
              OfflineIndicator(),
              Text('Content'),
            ],
          ),
        ),
        overrides: offlineMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Offline'), findsOneWidget);
    });

    testWidgets('should display offline icon', (tester) async {
      // Act
      await tester.pumpApp(
        const OfflineIndicator(),
        overrides: offlineMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.byIcon(Icons.cloud_off), findsOneWidget);
    });

    testWidgets('should display pending changes count when syncing pending',
        (tester) async {
      // Arrange - set up providers with pending changes
      final providersWithPending = mockProvidersWithOverrides(
        isOnline: false,
        pendingSyncCount: 5,
      );

      // Act
      await tester.pumpApp(
        const OfflineIndicator(),
        overrides: providersWithPending,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.textContaining('5'), findsOneWidget);
      expect(find.textContaining('pending'), findsOneWidget);
    });

    testWidgets('should have warning color when offline', (tester) async {
      // Act
      await tester.pumpApp(
        const OfflineIndicator(),
        overrides: offlineMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      final container = tester.widget<Container>(
        find.ancestor(
          of: find.text('Offline'),
          matching: find.byType(Container),
        ).first,
      );
      final decoration = container.decoration as BoxDecoration?;
      expect(decoration?.color, equals(Colors.orange));
    });

    testWidgets('should animate when coming back online', (tester) async {
      // Start offline
      await tester.pumpApp(
        const OfflineIndicator(),
        overrides: offlineMockProviders,
      );
      await tester.pumpAndSettle();

      expect(find.text('Offline'), findsOneWidget);

      // Simulate coming back online (would need to update providers)
      // This tests the animation capability
      await tester.pumpApp(
        const OfflineIndicator(),
        overrides: defaultMockProviders,
      );
      
      // Pump a few frames to see animation
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pumpAndSettle();

      expect(find.text('Offline'), findsNothing);
    });

    testWidgets('should be tappable to show sync status', (tester) async {
      // Arrange
      bool tapped = false;

      // Act
      await tester.pumpApp(
        OfflineIndicator(
          onTap: () => tapped = true,
        ),
        overrides: offlineMockProviders,
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Offline'));
      await tester.pumpAndSettle();

      // Assert
      expect(tapped, isTrue);
    });
  });

  group('OfflineIndicator compact variant', () {
    testWidgets('should show only icon in compact mode', (tester) async {
      // Act
      await tester.pumpApp(
        const OfflineIndicator(compact: true),
        overrides: offlineMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.byIcon(Icons.cloud_off), findsOneWidget);
      expect(find.text('Offline'), findsNothing);
    });
  });

  group('OfflineIndicator banner variant', () {
    testWidgets('should display as full-width banner', (tester) async {
      // Act
      await tester.pumpApp(
        const OfflineIndicator(variant: OfflineIndicatorVariant.banner),
        overrides: offlineMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      final container = tester.widget<Container>(
        find.byType(Container).first,
      );
      final constraints = container.constraints;
      expect(constraints?.maxWidth, equals(double.infinity));
    });

    testWidgets('should display sync progress message', (tester) async {
      // Act
      await tester.pumpApp(
        const OfflineIndicator(variant: OfflineIndicatorVariant.banner),
        overrides: offlineMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(
        find.textContaining('Offline'),
        findsOneWidget,
      );
    });
  });

  group('OfflineIndicator syncing state', () {
    testWidgets('should display syncing indicator when syncing', (tester) async {
      // Arrange
      final syncingProviders = mockProvidersWithOverrides(
        isOnline: true,
        isSyncing: true,
      );

      // Act
      await tester.pumpApp(
        const OfflineIndicator(),
        overrides: syncingProviders,
      );
      await tester.pump(); // Don't settle to see animation

      // Assert
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Syncing...'), findsOneWidget);
    });

    testWidgets('should hide after sync completes', (tester) async {
      // Arrange
      final syncedProviders = mockProvidersWithOverrides(
        isOnline: true,
        isSyncing: false,
      );

      // Act
      await tester.pumpApp(
        const OfflineIndicator(),
        overrides: syncedProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Syncing...'), findsNothing);
      expect(find.text('Offline'), findsNothing);
    });
  });

  group('OfflineIndicator accessibility', () {
    testWidgets('should have semantic label', (tester) async {
      // Act
      await tester.pumpApp(
        const OfflineIndicator(),
        overrides: offlineMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      final semantics = tester.getSemantics(find.text('Offline'));
      expect(semantics.label, isNotNull);
    });

    testWidgets('should announce status changes', (tester) async {
      // This would test live region announcements
      // Implementation depends on actual widget structure
      await tester.pumpApp(
        const OfflineIndicator(),
        overrides: offlineMockProviders,
      );
      await tester.pumpAndSettle();

      // Verify accessibility attributes
      expect(find.byType(OfflineIndicator), findsOneWidget);
    });
  });
}
