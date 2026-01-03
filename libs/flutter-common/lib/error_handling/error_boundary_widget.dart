import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'error_reporter.dart';
import 'global_error_handler.dart';

/// Error boundary widget that catches and displays errors gracefully
///
/// Wrap your app or screens with this to catch rendering errors
/// and show a user-friendly error screen instead of a red error.
class ErrorBoundary extends ConsumerStatefulWidget {
  const ErrorBoundary({
    super.key,
    required this.child,
    this.onError,
    this.errorBuilder,
    this.showReportButton = true,
    this.isChildSafe = false,
  });

  /// The child widget to wrap
  final Widget child;

  /// Callback when an error occurs
  final void Function(FlutterErrorDetails)? onError;

  /// Custom error UI builder
  final Widget Function(BuildContext, FlutterErrorDetails, VoidCallback)?
      errorBuilder;

  /// Whether to show a "Report Issue" button
  final bool showReportButton;

  /// Whether this is for a child-safe (COPPA) context
  final bool isChildSafe;

  @override
  ConsumerState<ErrorBoundary> createState() => _ErrorBoundaryState();
}

class _ErrorBoundaryState extends ConsumerState<ErrorBoundary> {
  FlutterErrorDetails? _error;

  @override
  void initState() {
    super.initState();
  }

  void _handleError(FlutterErrorDetails details) {
    // Report to crashlytics
    ref.read(errorReporterProvider).reportFlutterError(details);

    // Call custom handler
    widget.onError?.call(details);

    // Update state to show error UI
    if (mounted) {
      setState(() {
        _error = details;
      });
    }
  }

  void _retry() {
    setState(() {
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      if (widget.errorBuilder != null) {
        return widget.errorBuilder!(context, _error!, _retry);
      }

      return _DefaultErrorScreen(
        error: _error!,
        onRetry: _retry,
        showReportButton: widget.showReportButton,
        isChildSafe: widget.isChildSafe,
      );
    }

    // Use ErrorWidget.builder to catch build errors
    return Builder(
      builder: (context) {
        ErrorWidget.builder = (FlutterErrorDetails details) {
          // Schedule the error handling for after the frame
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _handleError(details);
          });

          // Return empty widget while transitioning
          return const SizedBox.shrink();
        };

        return widget.child;
      },
    );
  }
}

/// Default error screen widget
class _DefaultErrorScreen extends StatelessWidget {
  const _DefaultErrorScreen({
    required this.error,
    required this.onRetry,
    required this.showReportButton,
    required this.isChildSafe,
  });

  final FlutterErrorDetails error;
  final VoidCallback onRetry;
  final bool showReportButton;
  final bool isChildSafe;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isChildSafe ? Icons.sentiment_dissatisfied : Icons.error_outline,
                size: 64,
                color: theme.colorScheme.error,
              ),
              const SizedBox(height: 24),
              Text(
                isChildSafe ? 'Oops! Something went wrong' : 'Something went wrong',
                style: theme.textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                isChildSafe
                    ? "Don't worry! Let's try that again."
                    : 'An unexpected error occurred. Please try again.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: Text(isChildSafe ? 'Try Again' : 'Retry'),
              ),
              if (showReportButton && !isChildSafe) ...[
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => _showErrorDetails(context),
                  child: const Text('View Details'),
                ),
              ],
              if (kDebugMode) ...[
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    error.exceptionAsString(),
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontFamily: 'monospace',
                      color: theme.colorScheme.onErrorContainer,
                    ),
                    maxLines: 5,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showErrorDetails(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Error Details'),
        content: SingleChildScrollView(
          child: SelectableText(
            '${error.exceptionAsString()}\n\n${error.stack}',
            style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

/// Inline error widget for showing errors within a page
class InlineErrorWidget extends StatelessWidget {
  const InlineErrorWidget({
    super.key,
    required this.error,
    this.onRetry,
    this.compact = false,
    this.isChildSafe = false,
  });

  final AppError error;
  final VoidCallback? onRetry;
  final bool compact;
  final bool isChildSafe;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (compact) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: error.color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(error.icon, color: error.color, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                error.message,
                style: theme.textTheme.bodyMedium,
              ),
            ),
            if (onRetry != null && error.isRecoverable)
              IconButton(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                iconSize: 20,
              ),
          ],
        ),
      );
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(error.icon, size: 48, color: error.color),
            const SizedBox(height: 16),
            Text(
              error.message,
              style: theme.textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
            if (onRetry != null && error.isRecoverable) ...[
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: Text(isChildSafe ? 'Try Again' : 'Retry'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Error snackbar helper
void showErrorSnackBar(
  BuildContext context,
  AppError error, {
  VoidCallback? onRetry,
  Duration duration = const Duration(seconds: 4),
}) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Row(
        children: [
          Icon(error.icon, color: Colors.white, size: 20),
          const SizedBox(width: 12),
          Expanded(child: Text(error.message)),
        ],
      ),
      backgroundColor: error.color,
      duration: duration,
      action: onRetry != null && error.isRecoverable
          ? SnackBarAction(
              label: 'Retry',
              textColor: Colors.white,
              onPressed: onRetry,
            )
          : null,
    ),
  );
}
