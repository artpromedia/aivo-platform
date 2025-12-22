/// Dashboard Golden Tests
///
/// Visual regression tests for the dashboard screen.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:golden_toolkit/golden_toolkit.dart';

import 'package:mobile_teacher/screens/dashboard/dashboard_screen.dart';

import '../helpers/helpers.dart';
import '../mocks/mock_providers.dart';

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

  group('Dashboard Golden Tests', () {
    testGoldens('should match golden on iPhone SE', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        const DashboardScreen(),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhoneSE.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_iphone_se');
    });

    testGoldens('should match golden on iPhone 14', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        const DashboardScreen(),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_iphone_14');
    });

    testGoldens('should match golden on iPhone 14 Pro Max', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        const DashboardScreen(),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14ProMax.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_iphone_14_pro_max');
    });

    testGoldens('should match golden on iPad Mini', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        const DashboardScreen(),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPadMini.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_ipad_mini');
    });

    testGoldens('should match golden on iPad Pro', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        const DashboardScreen(),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPadPro.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_ipad_pro');
    });

    testGoldens('should match dark mode golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        const DashboardScreen(),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
          brightness: Brightness.dark,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_dark_mode');
    });

    testGoldens('should match offline state golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        const DashboardScreen(),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: offlineMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_offline');
    });

    testGoldens('should match loading state golden', (tester) async {
      // Arrange - setup slow loading
      final loadingProviders = mockProvidersWithOverrides(
        isLoading: true,
      );

      await tester.pumpWidgetBuilder(
        const DashboardScreen(),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: loadingProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      // Don't settle to capture loading state
      await tester.pump();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_loading');
    });

    testGoldens('should match error state golden', (tester) async {
      // Arrange
      final errorProviders = mockProvidersWithOverrides(
        throwError: Exception('Failed to load data'),
      );

      await tester.pumpWidgetBuilder(
        const DashboardScreen(),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: errorProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_error');
    });

    testGoldens('should match empty state golden', (tester) async {
      // Arrange
      final emptyProviders = mockProvidersWithOverrides(
        students: [],
        sessions: [],
        classes: [],
      );

      await tester.pumpWidgetBuilder(
        const DashboardScreen(),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: emptyProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_empty');
    });
  });

  group('Dashboard Accessibility Golden Tests', () {
    testGoldens('should match large font golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(1.5)),
          child: const DashboardScreen(),
        ),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_large_font');
    });

    testGoldens('should match extra large font golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(2.0)),
          child: const DashboardScreen(),
        ),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_extra_large_font');
    });

    testGoldens('should match high contrast golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        MediaQuery(
          data: const MediaQueryData(highContrast: true),
          child: const DashboardScreen(),
        ),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_high_contrast');
    });

    testGoldens('should match reduced motion golden', (tester) async {
      // Arrange
      await tester.pumpWidgetBuilder(
        MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: const DashboardScreen(),
        ),
        wrapper: (child) => testableWidgetWithProviders(
          child: child,
          overrides: defaultMockProviders,
        ),
        surfaceSize: TestDevices.iPhone14.size,
      );
      await tester.pumpAndSettle();

      // Assert
      await screenMatchesGolden(tester, 'dashboard_reduced_motion');
    });
  });

  group('Dashboard Multi-Device Golden Tests', () {
    testGoldens('should match across all devices', (tester) async {
      // Test across multiple devices in a single test
      await multiScreenGolden(
        tester,
        'dashboard_multi_device',
        devices: [
          TestDevices.iPhoneSE.toDevice(),
          TestDevices.iPhone14.toDevice(),
          TestDevices.iPadPro.toDevice(),
        ],
        overrideGoldenHeight: 2000,
      );
    });
  });
}
