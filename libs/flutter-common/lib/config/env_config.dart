import 'package:flutter/foundation.dart';

import 'flavor.dart';

/// Environment configuration for the app
///
/// Usage:
/// ```dart
/// // In main.dart
/// void main() {
///   EnvConfig.initialize();
///   // Access config
///   print(EnvConfig.apiBaseUrl);
///   print(EnvConfig.flavor);
/// }
/// ```
///
/// Build with flavor:
/// ```bash
/// flutter run --dart-define=FLAVOR=dev
/// flutter build apk --dart-define=FLAVOR=prod
/// ```
class EnvConfig {
  EnvConfig._();

  static bool _initialized = false;

  /// Current flavor/environment
  static late Flavor flavor;

  /// API base URL
  static late String apiBaseUrl;

  /// WebSocket URL
  static late String wsBaseUrl;

  /// CDN URL for static assets
  static late String cdnUrl;

  /// Sentry DSN (if using Sentry instead of/alongside Crashlytics)
  static String? sentryDsn;

  /// Whether to show debug banner
  static late bool showDebugBanner;

  /// Whether to enable performance overlay
  static late bool enablePerformanceOverlay;

  /// Log level
  static late LogLevel logLevel;

  /// App name suffix based on flavor
  static String get appNameSuffix => flavor.suffix;

  /// Initialize environment config
  ///
  /// Call this at the start of main() before running the app.
  /// Reads FLAVOR from dart-define, defaults to dev.
  static void initialize() {
    if (_initialized) return;

    // Read flavor from dart-define
    const flavorString = String.fromEnvironment('FLAVOR', defaultValue: 'dev');
    flavor = FlavorExtension.fromString(flavorString);

    // Configure based on flavor
    switch (flavor) {
      case Flavor.dev:
        _initDev();
        break;
      case Flavor.staging:
        _initStaging();
        break;
      case Flavor.prod:
        _initProd();
        break;
    }

    _initialized = true;

    if (kDebugMode) {
      debugPrint('[EnvConfig] Initialized with flavor: ${flavor.displayName}');
      debugPrint('[EnvConfig] API URL: $apiBaseUrl');
    }
  }

  /// Initialize dev environment
  static void _initDev() {
    apiBaseUrl = const String.fromEnvironment(
      'API_URL',
      defaultValue: 'http://localhost:3000/api',
    );
    wsBaseUrl = const String.fromEnvironment(
      'WS_URL',
      defaultValue: 'ws://localhost:3000',
    );
    cdnUrl = const String.fromEnvironment(
      'CDN_URL',
      defaultValue: 'http://localhost:3000/static',
    );
    sentryDsn = null; // No Sentry in dev
    showDebugBanner = true;
    enablePerformanceOverlay = false;
    logLevel = LogLevel.debug;
  }

  /// Initialize staging environment
  static void _initStaging() {
    apiBaseUrl = const String.fromEnvironment(
      'API_URL',
      defaultValue: 'https://staging-api.aivo.com/api',
    );
    wsBaseUrl = const String.fromEnvironment(
      'WS_URL',
      defaultValue: 'wss://staging-api.aivo.com',
    );
    cdnUrl = const String.fromEnvironment(
      'CDN_URL',
      defaultValue: 'https://staging-cdn.aivo.com',
    );
    sentryDsn = const String.fromEnvironment('SENTRY_DSN', defaultValue: '');
    showDebugBanner = true;
    enablePerformanceOverlay = false;
    logLevel = LogLevel.info;
  }

  /// Initialize production environment
  static void _initProd() {
    apiBaseUrl = const String.fromEnvironment(
      'API_URL',
      defaultValue: 'https://api.aivo.com/api',
    );
    wsBaseUrl = const String.fromEnvironment(
      'WS_URL',
      defaultValue: 'wss://api.aivo.com',
    );
    cdnUrl = const String.fromEnvironment(
      'CDN_URL',
      defaultValue: 'https://cdn.aivo.com',
    );
    sentryDsn = const String.fromEnvironment('SENTRY_DSN', defaultValue: '');
    showDebugBanner = false;
    enablePerformanceOverlay = false;
    logLevel = LogLevel.warning;
  }

  /// Override config for testing
  @visibleForTesting
  static void setTestConfig({
    Flavor? testFlavor,
    String? testApiBaseUrl,
    String? testWsBaseUrl,
  }) {
    if (testFlavor != null) flavor = testFlavor;
    if (testApiBaseUrl != null) apiBaseUrl = testApiBaseUrl;
    if (testWsBaseUrl != null) wsBaseUrl = testWsBaseUrl;
    _initialized = true;
  }
}

/// Log levels
enum LogLevel {
  /// All logs
  debug,

  /// Info and above
  info,

  /// Warnings and above
  warning,

  /// Errors only
  error,

  /// No logging
  none,
}

/// Extension for log level comparison
extension LogLevelExtension on LogLevel {
  /// Check if this level should log at the given level
  bool shouldLog(LogLevel level) {
    return index <= level.index;
  }
}
