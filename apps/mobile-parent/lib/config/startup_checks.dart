/// Startup Checks for Mobile Parent App
///
/// Verifies environment configuration at app startup to ensure
/// production builds are correctly configured.
library;

import 'package:flutter/foundation.dart';

import 'environment.dart';

/// Performs critical startup checks.
///
/// Call this early in the app initialization (before runApp) to catch
/// configuration issues before they cause problems.
///
/// Example:
/// ```dart
/// void main() async {
///   WidgetsFlutterBinding.ensureInitialized();
///   StartupChecks.run();
///   runApp(const MyApp());
/// }
/// ```
class StartupChecks {
  StartupChecks._();

  /// Runs all startup checks.
  ///
  /// In debug mode, logs warnings for issues.
  /// In release mode, throws exceptions for critical issues.
  static void run() {
    _checkEnvironmentConfiguration();
    _checkMockModeConfiguration();
    _checkProductionSafety();

    if (kDebugMode) {
      _logStartupInfo();
    }
  }

  /// Validates environment configuration.
  static void _checkEnvironmentConfiguration() {
    try {
      EnvironmentConfig.validate();
    } on EnvironmentConfigException catch (e) {
      if (kReleaseMode) {
        // In release mode, this is a critical error
        throw StateError('Startup check failed: ${e.message}');
      } else {
        debugPrint('❌ STARTUP CHECK FAILED: ${e.message}');
      }
    }
  }

  /// Ensures mock mode is not accidentally enabled in production.
  static void _checkMockModeConfiguration() {
    if (kReleaseMode && EnvironmentConfig.useMockServices) {
      // This should never happen due to kDebugMode check in useMockServices,
      // but we add this as a defense-in-depth measure.
      throw StateError(
        'CRITICAL: Mock services are enabled in release mode. '
        'This is a security violation. Build is invalid.',
      );
    }
  }

  /// Additional production safety checks.
  static void _checkProductionSafety() {
    if (EnvironmentConfig.isProduction) {
      // In production, ensure we're in release mode
      if (!kReleaseMode) {
        debugPrint(
          '⚠️ WARNING: Running in production environment but not in release mode. '
          'This may indicate a configuration issue.',
        );
      }

      // Check for localhost URLs in production
      if (_hasLocalhostUrl()) {
        if (kReleaseMode) {
          throw StateError(
            'CRITICAL: Production build has localhost URLs configured. '
            'This indicates a misconfigured release build.',
          );
        } else {
          debugPrint(
            '⚠️ WARNING: Production environment has localhost URLs. '
            'Ensure proper API URLs are configured for release.',
          );
        }
      }
    }
  }

  /// Checks if any API URLs point to localhost.
  static bool _hasLocalhostUrl() {
    final urls = [
      EnvironmentConfig.authBaseUrl,
      EnvironmentConfig.apiBaseUrl,
      EnvironmentConfig.learnerBaseUrl,
      EnvironmentConfig.baselineBaseUrl,
      EnvironmentConfig.analyticsBaseUrl,
      EnvironmentConfig.reportsBaseUrl,
    ];

    return urls.any((url) =>
            url.contains('localhost') ||
            url.contains('127.0.0.1') ||
            url.contains('10.0.2.2') // Android emulator localhost
        );
  }

  /// Logs startup information for debugging.
  static void _logStartupInfo() {
    debugPrint('═══════════════════════════════════════════════════════════');
    debugPrint('📱 AIVO Parent App - Startup Checks');
    debugPrint('═══════════════════════════════════════════════════════════');
    debugPrint('Environment: ${EnvironmentConfig.current.name}');
    debugPrint('Debug Mode: $kDebugMode');
    debugPrint('Release Mode: $kReleaseMode');
    debugPrint(
        'Mock Services: ${EnvironmentConfig.useMockServices ? "ENABLED ⚠️" : "disabled ✓"}');
    debugPrint('─────────────────────────────────────────────────────────────');
    debugPrint('Auth URL: ${EnvironmentConfig.authBaseUrl}');
    debugPrint('API URL: ${EnvironmentConfig.apiBaseUrl}');
    debugPrint('═══════════════════════════════════════════════════════════');
  }

  /// Performs a quick health check that can be called at any time.
  ///
  /// Returns a map of check results.
  static Map<String, bool> healthCheck() {
    return {
      'isProduction': EnvironmentConfig.isProduction,
      'isReleaseMode': kReleaseMode,
      'mockServicesDisabled': !EnvironmentConfig.useMockServices,
      'noLocalhostUrls': !_hasLocalhostUrl(),
      'configurationValid': _isConfigurationValid(),
    };
  }

  /// Checks if the overall configuration is valid.
  static bool _isConfigurationValid() {
    try {
      EnvironmentConfig.validate();
      return true;
    } catch (_) {
      return false;
    }
  }
}
