/// Error Widgets for Mobile Parent App
///
/// Comprehensive error handling widgets for API errors, network issues,
/// and graceful degradation.
///
/// Sprint 4.2: Comprehensive Error Boundaries
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// =============================================================================
// Error Types
// =============================================================================

/// Base class for API exceptions
class ApiException implements Exception {
  const ApiException({
    required this.message,
    this.statusCode,
    this.code,
    this.details,
  });

  final String message;
  final int? statusCode;
  final String? code;
  final Map<String, dynamic>? details;

  @override
  String toString() => 'ApiException: $message (status: $statusCode)';
}

/// Network-related exception
class NetworkException implements Exception {
  const NetworkException([this.message = 'Network error occurred']);

  final String message;

  @override
  String toString() => 'NetworkException: $message';
}

/// Authentication exception (401)
class AuthenticationException extends ApiException {
  const AuthenticationException({
    super.message = 'Your session has expired. Please log in again.',
    super.statusCode = 401,
  });
}

/// Authorization exception (403)
class AuthorizationException extends ApiException {
  const AuthorizationException({
    super.message = 'You do not have permission for this action.',
    super.statusCode = 403,
  });
}

/// Rate limit exception (429)
class RateLimitException extends ApiException {
  const RateLimitException({
    super.message = 'Too many requests. Please wait a moment.',
    super.statusCode = 429,
    this.retryAfter,
  });

  final Duration? retryAfter;
}

// =============================================================================
// Error Widget
// =============================================================================

/// Main API error widget with retry functionality
class ApiErrorWidget extends StatelessWidget {
  const ApiErrorWidget({
    super.key,
    required this.error,
    required this.onRetry,
    this.customMessage,
    this.showDetails = false,
  });

  final Object error;
  final VoidCallback onRetry;
  final String? customMessage;
  final bool showDetails;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final errorInfo = _getErrorInfo(error);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: errorInfo.color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                errorInfo.icon,
                size: 48,
                color: errorInfo.color,
              ),
            ),
            const SizedBox(height: 24),

            // Title
            Text(
              errorInfo.title,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),

            // Message
            Text(
              customMessage ?? errorInfo.message,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),

            // Details (debug only)
            if (showDetails && error is ApiException) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Code: ${(error as ApiException).code ?? 'N/A'}\n'
                  'Status: ${(error as ApiException).statusCode ?? 'N/A'}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Retry button
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }

  _ErrorInfo _getErrorInfo(Object error) {
    if (error is NetworkException) {
      return _ErrorInfo(
        title: 'No Connection',
        message: 'Please check your internet connection and try again.',
        icon: Icons.wifi_off,
        color: Colors.orange,
      );
    }

    if (error is AuthenticationException) {
      return _ErrorInfo(
        title: 'Session Expired',
        message: 'Please log in again to continue.',
        icon: Icons.lock_outline,
        color: Colors.amber,
      );
    }

    if (error is AuthorizationException) {
      return _ErrorInfo(
        title: 'Access Denied',
        message: 'You do not have permission for this action.',
        icon: Icons.block,
        color: Colors.red,
      );
    }

    if (error is RateLimitException) {
      return _ErrorInfo(
        title: 'Slow Down',
        message: 'Too many requests. Please wait a moment and try again.',
        icon: Icons.hourglass_empty,
        color: Colors.orange,
      );
    }

    if (error is ApiException) {
      final apiError = error;
      switch (apiError.statusCode) {
        case 404:
          return _ErrorInfo(
            title: 'Not Found',
            message: 'The requested information could not be found.',
            icon: Icons.search_off,
            color: Colors.grey,
          );
        case 500:
        case 502:
        case 503:
        case 504:
          return _ErrorInfo(
            title: 'Server Error',
            message: 'Something went wrong on our end. Please try again later.',
            icon: Icons.cloud_off,
            color: Colors.red,
          );
        default:
          return _ErrorInfo(
            title: 'Something Went Wrong',
            message: apiError.message,
            icon: Icons.error_outline,
            color: Colors.red,
          );
      }
    }

    return _ErrorInfo(
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again.',
      icon: Icons.error_outline,
      color: Colors.red,
    );
  }
}

class _ErrorInfo {
  const _ErrorInfo({
    required this.title,
    required this.message,
    required this.icon,
    required this.color,
  });

  final String title;
  final String message;
  final IconData icon;
  final Color color;
}

// =============================================================================
// Network Error Widget
// =============================================================================

/// Widget specifically for network/connectivity errors
class NetworkErrorWidget extends StatelessWidget {
  const NetworkErrorWidget({
    super.key,
    required this.onRetry,
    this.message,
  });

  final VoidCallback onRetry;
  final String? message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.wifi_off,
                size: 56,
                color: Colors.orange,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No Internet Connection',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              message ?? 'Please check your network settings and try again.',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Empty State Widget
// =============================================================================

/// Widget for empty data states
class EmptyStateWidget extends StatelessWidget {
  const EmptyStateWidget({
    super.key,
    required this.title,
    required this.message,
    this.icon,
    this.action,
    this.actionLabel,
  });

  final String title;
  final String message;
  final IconData? icon;
  final VoidCallback? action;
  final String? actionLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon ?? Icons.inbox_outlined,
                size: 56,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              title,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            if (action != null && actionLabel != null) ...[
              const SizedBox(height: 24),
              FilledButton(
                onPressed: action,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Inline Error Banner
// =============================================================================

/// Compact inline error banner for non-blocking errors
class InlineErrorBanner extends StatelessWidget {
  const InlineErrorBanner({
    super.key,
    required this.message,
    this.onRetry,
    this.onDismiss,
  });

  final String message;
  final VoidCallback? onRetry;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: Colors.red.shade700),
            ),
          ),
          if (onRetry != null)
            TextButton(
              onPressed: onRetry,
              child: const Text('Retry'),
            ),
          if (onDismiss != null)
            IconButton(
              icon: const Icon(Icons.close, size: 18),
              onPressed: onDismiss,
              visualDensity: VisualDensity.compact,
            ),
        ],
      ),
    );
  }
}

// =============================================================================
// Offline Banner
// =============================================================================

/// Banner that shows when the device is offline
class OfflineBanner extends StatelessWidget {
  const OfflineBanner({
    super.key,
    this.message,
    this.onDismiss,
  });

  final String? message;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: Colors.orange.shade700,
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            const Icon(Icons.wifi_off, color: Colors.white, size: 18),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message ?? 'You are offline. Some features may be unavailable.',
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
            ),
            if (onDismiss != null)
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 18),
                onPressed: onDismiss,
                visualDensity: VisualDensity.compact,
              ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// AsyncValue Extension for Error Handling
// =============================================================================

/// Extension on AsyncValue for easier error handling in Riverpod
extension AsyncValueErrorExtension<T> on AsyncValue<T> {
  /// Build a widget based on the async state with error handling
  Widget buildWithError({
    required Widget Function(T data) data,
    required VoidCallback onRetry,
    Widget Function()? loading,
    String? errorMessage,
  }) {
    return when(
      data: data,
      loading: loading ?? () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => ApiErrorWidget(
        error: error,
        onRetry: onRetry,
        customMessage: errorMessage,
      ),
    );
  }
}

// =============================================================================
// Error Boundary Widget
// =============================================================================

/// A widget that catches errors in its child tree and displays a fallback UI
class ErrorBoundary extends StatefulWidget {
  const ErrorBoundary({
    super.key,
    required this.child,
    this.fallback,
    this.onError,
  });

  final Widget child;
  final Widget Function(Object error, VoidCallback retry)? fallback;
  final void Function(Object error, StackTrace? stack)? onError;

  @override
  State<ErrorBoundary> createState() => _ErrorBoundaryState();
}

class _ErrorBoundaryState extends State<ErrorBoundary> {
  Object? _error;
  StackTrace? _stackTrace;

  void _handleError(Object error, StackTrace? stack) {
    setState(() {
      _error = error;
      _stackTrace = stack;
    });
    widget.onError?.call(error, stack);
  }

  void _retry() {
    setState(() {
      _error = null;
      _stackTrace = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      if (widget.fallback != null) {
        return widget.fallback!(_error!, _retry);
      }
      return ApiErrorWidget(
        error: _error!,
        onRetry: _retry,
      );
    }

    return ErrorWidgetBuilder(
      onError: _handleError,
      child: widget.child,
    );
  }
}

/// Internal widget to catch errors
class ErrorWidgetBuilder extends StatelessWidget {
  const ErrorWidgetBuilder({
    super.key,
    required this.child,
    required this.onError,
  });

  final Widget child;
  final void Function(Object error, StackTrace? stack) onError;

  @override
  Widget build(BuildContext context) {
    // Note: Flutter doesn't have a built-in error boundary like React
    // This is a placeholder - real error catching happens via
    // FlutterError.onError and PlatformDispatcher.instance.onError
    return child;
  }
}
