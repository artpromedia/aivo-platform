import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../analytics/analytics_service.dart';
import 'global_error_handler.dart';

/// Provider for the error reporter
final errorReporterProvider = Provider<ErrorReporter>((ref) {
  return ErrorReporter(ref);
});

/// Centralized error reporting to Crashlytics and Analytics
class ErrorReporter {
  ErrorReporter(this._ref);

  final Ref _ref;
  FirebaseCrashlytics? _crashlytics;
  bool _initialized = false;

  /// Initialize the error reporter
  Future<void> initialize() async {
    if (_initialized) return;

    try {
      _crashlytics = FirebaseCrashlytics.instance;
      _initialized = true;
    } catch (e) {
      debugPrint('[ErrorReporter] Failed to initialize: $e');
    }
  }

  /// Report an error to Crashlytics
  Future<void> reportError(
    dynamic error, {
    StackTrace? stackTrace,
    String? context,
    ErrorCategory? category,
    bool fatal = false,
    Map<String, dynamic>? additionalData,
  }) async {
    if (kDebugMode) {
      debugPrint('[ErrorReporter] Error in $context: $error');
      return;
    }

    try {
      // Set custom keys for context
      if (context != null) {
        await _crashlytics?.setCustomKey('error_context', context);
      }
      if (category != null) {
        await _crashlytics?.setCustomKey('error_category', category.name);
      }

      // Add additional data as custom keys
      if (additionalData != null) {
        for (final entry in additionalData.entries) {
          await _crashlytics?.setCustomKey(
            'data_${entry.key}',
            entry.value.toString(),
          );
        }
      }

      // Record the error
      await _crashlytics?.recordError(
        error,
        stackTrace ?? StackTrace.current,
        fatal: fatal,
        reason: context,
      );

      // Log to analytics
      _ref.read(analyticsServiceProvider).logError(
            errorType: category?.name ?? 'unknown',
            errorMessage: error.toString(),
            screenName: context,
          );
    } catch (e) {
      debugPrint('[ErrorReporter] Failed to report error: $e');
    }
  }

  /// Report a Flutter error (from FlutterError.onError)
  Future<void> reportFlutterError(FlutterErrorDetails details) async {
    if (kDebugMode) {
      debugPrint('[ErrorReporter] Flutter error: ${details.exception}');
      return;
    }

    try {
      await _crashlytics?.recordFlutterError(details);
    } catch (e) {
      debugPrint('[ErrorReporter] Failed to report Flutter error: $e');
    }
  }

  /// Report a fatal error (causes crash report)
  Future<void> reportFatalError(
    dynamic error, {
    StackTrace? stackTrace,
    String? context,
  }) async {
    await reportError(
      error,
      stackTrace: stackTrace,
      context: context,
      fatal: true,
    );
  }

  /// Log a message for crash context
  Future<void> log(String message) async {
    if (kDebugMode) {
      debugPrint('[ErrorReporter] Log: $message');
      return;
    }

    await _crashlytics?.log(message);
  }

  /// Set a custom key for crash context
  Future<void> setCustomKey(String key, Object value) async {
    if (kDebugMode) return;
    await _crashlytics?.setCustomKey(key, value);
  }

  /// Set the user identifier
  Future<void> setUserIdentifier(String? userId) async {
    if (kDebugMode) return;
    await _crashlytics?.setUserIdentifier(userId ?? '');
  }

  /// Set the current screen for crash context
  Future<void> setCurrentScreen(String screenName) async {
    await setCustomKey('current_screen', screenName);
  }

  /// Record a non-fatal exception for a specific feature
  Future<void> recordFeatureError(
    String feature,
    dynamic error, {
    StackTrace? stackTrace,
    Map<String, dynamic>? additionalData,
  }) async {
    await reportError(
      error,
      stackTrace: stackTrace,
      context: 'feature:$feature',
      additionalData: additionalData,
    );
  }

  /// Record an API error
  Future<void> recordApiError(
    String endpoint,
    int? statusCode,
    dynamic error, {
    StackTrace? stackTrace,
  }) async {
    await reportError(
      error,
      stackTrace: stackTrace,
      context: 'api:$endpoint',
      category: statusCode != null && statusCode >= 500
          ? ErrorCategory.server
          : ErrorCategory.network,
      additionalData: {
        'endpoint': endpoint,
        if (statusCode != null) 'status_code': statusCode,
      },
    );
  }
}

/// Extension to easily access error reporter from Ref
extension ErrorReporterRefExtension on Ref {
  /// Get the error reporter
  ErrorReporter get errorReporter => read(errorReporterProvider);
}
