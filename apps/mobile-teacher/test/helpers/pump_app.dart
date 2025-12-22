/// Pump App Helper
///
/// Test utilities for pumping widgets with all necessary providers.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../mocks/mock_providers.dart';

/// Extension on WidgetTester for common test operations.
extension PumpApp on WidgetTester {
  /// Pump widget wrapped with all necessary providers and Material app.
  Future<void> pumpApp(
    Widget widget, {
    List<Override>? overrides,
    NavigatorObserver? navigatorObserver,
    ThemeData? theme,
    Locale? locale,
    Size? screenSize,
  }) async {
    // Set screen size if specified
    if (screenSize != null) {
      await binding.setSurfaceSize(screenSize);
      addTearDown(() => binding.setSurfaceSize(null));
    }

    await pumpWidget(
      ProviderScope(
        overrides: [
          ...defaultMockProviders,
          ...?overrides,
        ],
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: theme ?? ThemeData.light(useMaterial3: true),
          locale: locale,
          localizationsDelegates: const [
            DefaultMaterialLocalizations.delegate,
            DefaultWidgetsLocalizations.delegate,
          ],
          navigatorObservers: [
            if (navigatorObserver != null) navigatorObserver,
          ],
          home: widget,
        ),
      ),
    );
    await pump();
  }

  /// Pump app with router for navigation testing.
  Future<void> pumpRouterApp({
    required GoRouter router,
    List<Override>? overrides,
    ThemeData? theme,
  }) async {
    await pumpWidget(
      ProviderScope(
        overrides: [
          ...defaultMockProviders,
          ...?overrides,
        ],
        child: MaterialApp.router(
          debugShowCheckedModeBanner: false,
          theme: theme ?? ThemeData.light(useMaterial3: true),
          routerConfig: router,
        ),
      ),
    );
    await pump();
  }

  /// Pump app and wait for all animations and async operations.
  Future<void> pumpAppAndSettle(
    Widget widget, {
    List<Override>? overrides,
    Duration timeout = const Duration(seconds: 10),
  }) async {
    await pumpApp(widget, overrides: overrides);
    await pumpAndSettle(const Duration(milliseconds: 100), timeout: timeout);
  }

  /// Wait for async operations to complete.
  Future<void> pumpAndSettleWithTimeout({
    Duration duration = const Duration(milliseconds: 100),
    Duration timeout = const Duration(seconds: 10),
  }) async {
    await pumpAndSettle(duration, timeout: timeout);
  }

  /// Pump and wait for a specific duration.
  Future<void> pumpFor(Duration duration) async {
    await pump(duration);
  }

  /// Find and tap a widget, then pump.
  Future<void> tapAndPump(Finder finder) async {
    await tap(finder);
    await pump();
  }

  /// Find and tap a widget, then pump and settle.
  Future<void> tapAndSettle(Finder finder) async {
    await tap(finder);
    await pumpAndSettle();
  }

  /// Enter text and pump.
  Future<void> enterTextAndPump(Finder finder, String text) async {
    await enterText(finder, text);
    await pump();
  }

  /// Scroll until a widget is visible.
  Future<void> scrollUntilVisible(
    Finder finder, {
    Finder? scrollable,
    double delta = 100,
    int maxScrolls = 50,
  }) async {
    final scrollableFinder = scrollable ?? find.byType(Scrollable).first;

    for (var i = 0; i < maxScrolls; i++) {
      if (any(finder)) break;
      await drag(scrollableFinder, Offset(0, -delta));
      await pump();
    }
  }
}

/// Create a testable widget wrapped in Material and Scaffold.
Widget testableWidget(
  Widget child, {
  ThemeData? theme,
  bool withScaffold = true,
}) {
  final content = withScaffold ? Scaffold(body: child) : child;

  return MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: theme ?? ThemeData.light(useMaterial3: true),
    home: content,
  );
}

/// Create a testable widget with Riverpod providers.
Widget testableWidgetWithProviders(
  Widget child, {
  List<Override>? overrides,
  ThemeData? theme,
  bool withScaffold = true,
}) {
  return ProviderScope(
    overrides: [
      ...defaultMockProviders,
      ...?overrides,
    ],
    child: testableWidget(
      child,
      theme: theme,
      withScaffold: withScaffold,
    ),
  );
}

/// Phone screen size for testing.
const phoneScreenSize = Size(375, 812);

/// Tablet screen size for testing.
const tabletScreenSize = Size(768, 1024);

/// Custom finder extensions.
extension FinderExtensions on CommonFinders {
  /// Find by semantic label.
  Finder bySemanticsLabel(String label) {
    return find.bySemanticsLabel(label);
  }

  /// Find text containing a substring.
  Finder textContaining(String text) {
    return find.textContaining(text);
  }

  /// Find widget by tooltip.
  Finder byTooltip(String tooltip) {
    return find.byTooltip(tooltip);
  }
}
