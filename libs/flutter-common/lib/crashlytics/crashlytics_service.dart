import 'dart:async';
import 'dart:isolate';

import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Provider for the Crashlytics service
final crashlyticsServiceProvider = Provider<CrashlyticsService>((ref) {
  return CrashlyticsService();
});

/// Service for Firebase Crashlytics integration
///
/// Provides crash reporting, error logging, and user tracking for
/// production apps. Disabled in debug mode by default.
class CrashlyticsService {
  FirebaseCrashlytics? _crashlytics;
  bool _initialized = false;

  /// Whether Crashlytics is enabled (false in debug mode)
  bool get isEnabled => !kDebugMode && _initialized;

  /// Initialize Crashlytics with proper error handling setup
  ///
  /// This should be called early in the app lifecycle, typically
  /// before running the app widget.
  ///
  /// [enableInDebugMode] - Set to true to enable in debug mode (for testing)
  Future<void> initialize({bool enableInDebugMode = false}) async {
    if (_initialized) return;

    try {
      _crashlytics = FirebaseCrashlytics.instance;

      // Disable in debug mode unless explicitly enabled
      final shouldEnable = !kDebugMode || enableInDebugMode;
      await _crashlytics!.setCrashlyticsCollectionEnabled(shouldEnable);

      _initialized = true;

      if (shouldEnable) {
        debugPrint('[Crashlytics] Initialized and enabled');
      } else {
        debugPrint('[Crashlytics] Initialized but disabled (debug mode)');
      }
    } catch (e) {
      debugPrint('[Crashlytics] Failed to initialize: $e');
    }
  }

  /// Set up Flutter error handling
  ///
  /// This configures FlutterError.onError to send errors to Crashlytics
  /// and sets up error handling for the given runnable.
  ///
  /// Usage in main.dart:
  /// ```dart
  /// void main() async {
  ///   await CrashlyticsService.runWithCrashlytics(() async {
  ///     WidgetsFlutterBinding.ensureInitialized();
  ///     await Firebase.initializeApp();
  ///     await crashlyticsService.initialize();
  ///     runApp(MyApp());
  ///   });
  /// }
  /// ```
  static Future<void> runWithCrashlytics(Future<void> Function() appRunner) async {
    // Catch Flutter framework errors
    FlutterError.onError = (errorDetails) {
      if (kDebugMode) {
        // In debug mode, just print the error
        FlutterError.presentError(errorDetails);
      } else {
        // In release mode, report to Crashlytics
        FirebaseCrashlytics.instance.recordFlutterFatalError(errorDetails);
      }
    };

    // Catch errors outside of Flutter framework
    PlatformDispatcher.instance.onError = (error, stack) {
      if (!kDebugMode) {
        FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      }
      return true;
    };

    // Catch errors from isolates
    Isolate.current.addErrorListener(RawReceivePort((pair) async {
      final List<dynamic> errorAndStacktrace = pair;
      if (!kDebugMode) {
        await FirebaseCrashlytics.instance.recordError(
          errorAndStacktrace.first,
          errorAndStacktrace.last,
          fatal: true,
        );
      }
    }).sendPort);

    // Run the app in a zone to catch async errors
    await runZonedGuarded(
      appRunner,
      (error, stack) {
        if (!kDebugMode) {
          FirebaseCrashlytics.instance.recordError(error, stack, fatal: false);
        } else {
          debugPrint('[Crashlytics] Caught error in zone: $error\n$stack');
        }
      },
    );
  }

  /// Record a non-fatal error
  Future<void> recordError(
    dynamic exception,
    StackTrace? stack, {
    String? reason,
    bool fatal = false,
    Iterable<Object>? information,
  }) async {
    if (!isEnabled) {
      debugPrint('[Crashlytics] Would record error: $exception');
      return;
    }

    await _crashlytics?.recordError(
      exception,
      stack,
      reason: reason,
      fatal: fatal,
      information: information ?? [],
    );
  }

  /// Record a Flutter error from FlutterErrorDetails
  Future<void> recordFlutterError(FlutterErrorDetails details) async {
    if (!isEnabled) {
      debugPrint('[Crashlytics] Would record Flutter error: ${details.exception}');
      return;
    }

    await _crashlytics?.recordFlutterError(details);
  }

  /// Log a message for context before a crash
  Future<void> log(String message) async {
    if (!isEnabled) {
      debugPrint('[Crashlytics] Log: $message');
      return;
    }

    await _crashlytics?.log(message);
  }

  /// Set a custom key-value pair for crash context
  Future<void> setCustomKey(String key, Object value) async {
    if (!isEnabled) return;

    await _crashlytics?.setCustomKey(key, value);
  }

  /// Set the user identifier for crash reports
  ///
  /// For COPPA compliance, use a pseudonymized ID, not personal information
  Future<void> setUserIdentifier(String identifier) async {
    if (!isEnabled) return;

    await _crashlytics?.setUserIdentifier(identifier);
  }

  /// Clear the user identifier (e.g., on logout)
  Future<void> clearUserIdentifier() async {
    if (!isEnabled) return;

    await _crashlytics?.setUserIdentifier('');
  }

  /// Set the current screen name for crash context
  Future<void> setCurrentScreen(String screenName) async {
    if (!isEnabled) return;

    await _crashlytics?.setCustomKey('current_screen', screenName);
  }

  /// Force a crash for testing (only works in release mode)
  void testCrash() {
    _crashlytics?.crash();
  }

  /// Check if crash reports are being collected
  Future<bool> checkForUnsentReports() async {
    if (_crashlytics == null) return false;
    return await _crashlytics!.checkForUnsentReports();
  }

  /// Send any unsent reports
  Future<void> sendUnsentReports() async {
    await _crashlytics?.sendUnsentReports();
  }

  /// Delete any unsent reports (e.g., for privacy compliance)
  Future<void> deleteUnsentReports() async {
    await _crashlytics?.deleteUnsentReports();
  }
}

/// Extension to add crashlytics logging to Riverpod
extension CrashlyticsRefExtension on Ref {
  /// Get the crashlytics service
  CrashlyticsService get crashlytics => read(crashlyticsServiceProvider);
}

/// Error boundary widget that catches errors and reports to Crashlytics
class CrashlyticsErrorBoundary extends StatefulWidget {
  const CrashlyticsErrorBoundary({
    super.key,
    required this.child,
    this.onError,
    this.errorBuilder,
  });

  final Widget child;
  final void Function(FlutterErrorDetails)? onError;
  final Widget Function(BuildContext, FlutterErrorDetails)? errorBuilder;

  @override
  State<CrashlyticsErrorBoundary> createState() => _CrashlyticsErrorBoundaryState();
}

class _CrashlyticsErrorBoundaryState extends State<CrashlyticsErrorBoundary> {
  FlutterErrorDetails? _error;

  @override
  void initState() {
    super.initState();
  }

  void _handleError(FlutterErrorDetails details) {
    // Report to Crashlytics
    if (!kDebugMode) {
      FirebaseCrashlytics.instance.recordFlutterError(details);
    }

    // Call custom handler
    widget.onError?.call(details);

    // Update state to show error UI
    setState(() {
      _error = details;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null && widget.errorBuilder != null) {
      return widget.errorBuilder!(context, _error!);
    }

    return widget.child;
  }
}
