import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'error_reporter.dart';

/// Provider for the global error handler
final globalErrorHandlerProvider = Provider<GlobalErrorHandler>((ref) {
  return GlobalErrorHandler(ref);
});

/// Global error handler for the app
///
/// Provides centralized error handling with:
/// - Error categorization
/// - User-friendly error messages
/// - Automatic retry logic
/// - Error reporting to Crashlytics/analytics
class GlobalErrorHandler {
  GlobalErrorHandler(this._ref);

  final Ref _ref;
  final _errorController = StreamController<AppError>.broadcast();

  /// Stream of app errors for UI to listen to
  Stream<AppError> get errorStream => _errorController.stream;

  /// Handle an error and return a user-friendly message
  AppError handleError(
    dynamic error, {
    StackTrace? stackTrace,
    String? context,
    bool reportToCrashlytics = true,
  }) {
    final appError = _categorizeError(error, context);

    // Log to console in debug mode
    if (kDebugMode) {
      debugPrint('[Error] ${appError.category}: ${appError.message}');
      if (stackTrace != null) {
        debugPrint(stackTrace.toString());
      }
    }

    // Report to error reporter
    if (reportToCrashlytics && !kDebugMode) {
      _ref.read(errorReporterProvider).reportError(
            error,
            stackTrace: stackTrace,
            context: context,
            category: appError.category,
          );
    }

    // Emit to stream for UI
    _errorController.add(appError);

    return appError;
  }

  /// Handle an async operation with automatic error handling
  Future<T?> handleAsync<T>(
    Future<T> Function() operation, {
    String? context,
    T? defaultValue,
    int retries = 0,
    Duration retryDelay = const Duration(seconds: 1),
  }) async {
    int attempts = 0;

    while (attempts <= retries) {
      try {
        return await operation();
      } catch (e, stack) {
        attempts++;

        if (attempts > retries) {
          handleError(e, stackTrace: stack, context: context);
          return defaultValue;
        }

        // Wait before retrying
        await Future.delayed(retryDelay * attempts);
      }
    }

    return defaultValue;
  }

  /// Categorize an error into an AppError
  AppError _categorizeError(dynamic error, String? context) {
    // Network errors
    if (_isNetworkError(error)) {
      return AppError(
        category: ErrorCategory.network,
        message: 'Unable to connect. Please check your internet connection.',
        technicalMessage: error.toString(),
        context: context,
        isRecoverable: true,
        retryAction: RetryAction.retry,
      );
    }

    // Authentication errors
    if (_isAuthError(error)) {
      return AppError(
        category: ErrorCategory.authentication,
        message: 'Your session has expired. Please sign in again.',
        technicalMessage: error.toString(),
        context: context,
        isRecoverable: true,
        retryAction: RetryAction.reauth,
      );
    }

    // Permission errors
    if (_isPermissionError(error)) {
      return AppError(
        category: ErrorCategory.permission,
        message: "You don't have permission to perform this action.",
        technicalMessage: error.toString(),
        context: context,
        isRecoverable: false,
      );
    }

    // Validation errors
    if (_isValidationError(error)) {
      return AppError(
        category: ErrorCategory.validation,
        message: _extractValidationMessage(error),
        technicalMessage: error.toString(),
        context: context,
        isRecoverable: true,
        retryAction: RetryAction.fix,
      );
    }

    // Server errors
    if (_isServerError(error)) {
      return AppError(
        category: ErrorCategory.server,
        message: "Something went wrong on our end. We're working on it!",
        technicalMessage: error.toString(),
        context: context,
        isRecoverable: true,
        retryAction: RetryAction.retry,
      );
    }

    // Default: unknown error
    return AppError(
      category: ErrorCategory.unknown,
      message: 'Something unexpected happened. Please try again.',
      technicalMessage: error.toString(),
      context: context,
      isRecoverable: true,
      retryAction: RetryAction.retry,
    );
  }

  bool _isNetworkError(dynamic error) {
    final errorString = error.toString().toLowerCase();
    return errorString.contains('socketexception') ||
        errorString.contains('connection refused') ||
        errorString.contains('connection closed') ||
        errorString.contains('network is unreachable') ||
        errorString.contains('timeout') ||
        errorString.contains('no internet');
  }

  bool _isAuthError(dynamic error) {
    final errorString = error.toString().toLowerCase();
    return errorString.contains('401') ||
        errorString.contains('unauthorized') ||
        errorString.contains('token expired') ||
        errorString.contains('invalid token') ||
        errorString.contains('authentication');
  }

  bool _isPermissionError(dynamic error) {
    final errorString = error.toString().toLowerCase();
    return errorString.contains('403') ||
        errorString.contains('forbidden') ||
        errorString.contains('permission denied');
  }

  bool _isValidationError(dynamic error) {
    final errorString = error.toString().toLowerCase();
    return errorString.contains('400') ||
        errorString.contains('validation') ||
        errorString.contains('invalid');
  }

  bool _isServerError(dynamic error) {
    final errorString = error.toString().toLowerCase();
    return errorString.contains('500') ||
        errorString.contains('502') ||
        errorString.contains('503') ||
        errorString.contains('internal server error');
  }

  String _extractValidationMessage(dynamic error) {
    // Try to extract a user-friendly message from validation errors
    final errorString = error.toString();

    // Look for common patterns
    final patterns = [
      RegExp(r'"message":\s*"([^"]+)"'),
      RegExp(r'message:\s*([^\n,]+)'),
    ];

    for (final pattern in patterns) {
      final match = pattern.firstMatch(errorString);
      if (match != null) {
        return match.group(1) ?? 'Please check your input and try again.';
      }
    }

    return 'Please check your input and try again.';
  }

  /// Dispose the handler
  void dispose() {
    _errorController.close();
  }
}

/// Error categories
enum ErrorCategory {
  /// Network connectivity issues
  network,

  /// Authentication/authorization issues
  authentication,

  /// Permission denied
  permission,

  /// Input validation errors
  validation,

  /// Server-side errors
  server,

  /// Unknown errors
  unknown,
}

/// Suggested retry action
enum RetryAction {
  /// Retry the same operation
  retry,

  /// Re-authenticate and retry
  reauth,

  /// Fix input and retry
  fix,

  /// No retry possible
  none,
}

/// Structured app error
class AppError {
  const AppError({
    required this.category,
    required this.message,
    this.technicalMessage,
    this.context,
    this.isRecoverable = true,
    this.retryAction = RetryAction.none,
  });

  /// Error category
  final ErrorCategory category;

  /// User-friendly error message
  final String message;

  /// Technical error message (for logging)
  final String? technicalMessage;

  /// Context where the error occurred
  final String? context;

  /// Whether the error is recoverable
  final bool isRecoverable;

  /// Suggested retry action
  final RetryAction retryAction;

  /// Get icon for this error category
  IconData get icon {
    switch (category) {
      case ErrorCategory.network:
        return Icons.wifi_off;
      case ErrorCategory.authentication:
        return Icons.lock_outline;
      case ErrorCategory.permission:
        return Icons.block;
      case ErrorCategory.validation:
        return Icons.warning_amber;
      case ErrorCategory.server:
        return Icons.cloud_off;
      case ErrorCategory.unknown:
        return Icons.error_outline;
    }
  }

  /// Get color for this error category
  Color get color {
    switch (category) {
      case ErrorCategory.network:
        return Colors.orange;
      case ErrorCategory.authentication:
        return Colors.purple;
      case ErrorCategory.permission:
        return Colors.red;
      case ErrorCategory.validation:
        return Colors.amber;
      case ErrorCategory.server:
        return Colors.deepOrange;
      case ErrorCategory.unknown:
        return Colors.grey;
    }
  }
}
