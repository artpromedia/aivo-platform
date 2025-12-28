/// Error Widgets
///
/// Error display and retry widgets.
library;

import 'package:flutter/material.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/// Type of error to display.
enum ErrorType {
  network,
  server,
  notFound,
  unauthorized,
  forbidden,
  timeout,
  unknown,
  maintenance,
  rateLimit,
}

/// Error info with type and message.
class ErrorInfo {
  const ErrorInfo({
    required this.type,
    required this.message,
    this.title,
    this.details,
    this.retryable = true,
  });

  final ErrorType type;
  final String message;
  final String? title;
  final String? details;
  final bool retryable;

  factory ErrorInfo.network({String? message}) {
    return ErrorInfo(
      type: ErrorType.network,
      title: 'No Connection',
      message: message ?? 'Please check your internet connection and try again.',
    );
  }

  factory ErrorInfo.server({String? message}) {
    return ErrorInfo(
      type: ErrorType.server,
      title: 'Something Went Wrong',
      message: message ?? 'We\'re having trouble connecting. Please try again later.',
    );
  }

  factory ErrorInfo.notFound({String? message}) {
    return ErrorInfo(
      type: ErrorType.notFound,
      title: 'Not Found',
      message: message ?? 'The content you\'re looking for couldn\'t be found.',
      retryable: false,
    );
  }

  factory ErrorInfo.unauthorized({String? message}) {
    return ErrorInfo(
      type: ErrorType.unauthorized,
      title: 'Session Expired',
      message: message ?? 'Please sign in again to continue.',
      retryable: false,
    );
  }

  factory ErrorInfo.timeout({String? message}) {
    return ErrorInfo(
      type: ErrorType.timeout,
      title: 'Request Timed Out',
      message: message ?? 'The request took too long. Please try again.',
    );
  }

  factory ErrorInfo.unknown({String? message}) {
    return ErrorInfo(
      type: ErrorType.unknown,
      title: 'Oops!',
      message: message ?? 'Something unexpected happened. Please try again.',
    );
  }

  factory ErrorInfo.maintenance({String? message}) {
    return ErrorInfo(
      type: ErrorType.maintenance,
      title: 'Under Maintenance',
      message: message ?? 'We\'re making things better! Please check back soon.',
      retryable: false,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR WIDGETS
// ═══════════════════════════════════════════════════════════════════════════════

/// Full-screen error widget with illustration and retry button.
class ErrorView extends StatelessWidget {
  const ErrorView({
    super.key,
    required this.error,
    this.onRetry,
    this.onSecondaryAction,
    this.secondaryActionLabel,
    this.compact = false,
  });

  final ErrorInfo error;
  final VoidCallback? onRetry;
  final VoidCallback? onSecondaryAction;
  final String? secondaryActionLabel;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    if (compact) {
      return _buildCompact(context, theme);
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildIcon(theme),
            const SizedBox(height: 24),
            Text(
              error.title ?? 'Error',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              error.message,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.textTheme.bodySmall?.color,
              ),
              textAlign: TextAlign.center,
            ),
            if (error.details != null) ...[
              const SizedBox(height: 8),
              Text(
                error.details!,
                style: theme.textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: 32),
            if (error.retryable && onRetry != null)
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
              ),
            if (onSecondaryAction != null) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: onSecondaryAction,
                child: Text(secondaryActionLabel ?? 'Go Back'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCompact(BuildContext context, ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(
            _getIconData(),
            color: theme.colorScheme.error,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  error.title ?? 'Error',
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: theme.colorScheme.error,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  error.message,
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          if (error.retryable && onRetry != null) ...[
            const SizedBox(width: 12),
            IconButton(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              tooltip: 'Retry',
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildIcon(ThemeData theme) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer.withValues(alpha: 0.3),
        shape: BoxShape.circle,
      ),
      child: Icon(
        _getIconData(),
        size: 40,
        color: theme.colorScheme.error,
      ),
    );
  }

  IconData _getIconData() {
    switch (error.type) {
      case ErrorType.network:
        return Icons.wifi_off_rounded;
      case ErrorType.server:
        return Icons.cloud_off_rounded;
      case ErrorType.notFound:
        return Icons.search_off_rounded;
      case ErrorType.unauthorized:
        return Icons.lock_outline_rounded;
      case ErrorType.forbidden:
        return Icons.block_rounded;
      case ErrorType.timeout:
        return Icons.timer_off_rounded;
      case ErrorType.maintenance:
        return Icons.build_rounded;
      case ErrorType.rateLimit:
        return Icons.speed_rounded;
      case ErrorType.unknown:
        return Icons.error_outline_rounded;
    }
  }
}

/// Inline retry button.
class RetryButton extends StatelessWidget {
  const RetryButton({
    super.key,
    required this.onRetry,
    this.label = 'Retry',
    this.isLoading = false,
    this.compact = false,
  });

  final VoidCallback onRetry;
  final String label;
  final bool isLoading;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return IconButton(
        onPressed: isLoading ? null : onRetry,
        icon: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.refresh),
        tooltip: label,
      );
    }

    return FilledButton.icon(
      onPressed: isLoading ? null : onRetry,
      icon: isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : const Icon(Icons.refresh),
      label: Text(isLoading ? 'Retrying...' : label),
    );
  }
}

/// Snackbar-style error notification.
class ErrorSnackBar extends SnackBar {
  ErrorSnackBar({
    super.key,
    required String message,
    VoidCallback? onRetry,
    Duration duration = const Duration(seconds: 4),
  }) : super(
          content: Text(message),
          duration: duration,
          behavior: SnackBarBehavior.floating,
          action: onRetry != null
              ? SnackBarAction(
                  label: 'Retry',
                  onPressed: onRetry,
                )
              : null,
        );
}

/// Error banner that shows at top of screen.
class ErrorBanner extends StatelessWidget {
  const ErrorBanner({
    super.key,
    required this.message,
    this.onRetry,
    this.onDismiss,
    this.backgroundColor,
  });

  final String message;
  final VoidCallback? onRetry;
  final VoidCallback? onDismiss;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: backgroundColor ?? theme.colorScheme.errorContainer,
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            Icon(
              Icons.error_outline,
              size: 20,
              color: theme.colorScheme.onErrorContainer,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  color: theme.colorScheme.onErrorContainer,
                ),
              ),
            ),
            if (onRetry != null)
              TextButton(
                onPressed: onRetry,
                child: Text(
                  'Retry',
                  style: TextStyle(
                    color: theme.colorScheme.onErrorContainer,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            if (onDismiss != null)
              IconButton(
                onPressed: onDismiss,
                icon: Icon(
                  Icons.close,
                  size: 20,
                  color: theme.colorScheme.onErrorContainer,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY STATE WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

/// Widget to show when content is empty.
class EmptyStateView extends StatelessWidget {
  const EmptyStateView({
    super.key,
    required this.title,
    required this.message,
    this.icon,
    this.iconWidget,
    this.action,
    this.actionLabel,
    this.compact = false,
  });

  final String title;
  final String message;
  final IconData? icon;
  final Widget? iconWidget;
  final VoidCallback? action;
  final String? actionLabel;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (compact) {
      return Container(
        padding: const EdgeInsets.all(24),
        child: Row(
          children: [
            iconWidget ??
                Icon(
                  icon ?? Icons.inbox_rounded,
                  size: 32,
                  color: theme.colorScheme.outline,
                ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    message,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.outline,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            iconWidget ??
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    icon ?? Icons.inbox_rounded,
                    size: 40,
                    color: theme.colorScheme.outline,
                  ),
                ),
            const SizedBox(height: 24),
            Text(
              title,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.outline,
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
