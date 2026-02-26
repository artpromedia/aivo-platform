/// Aivo Snackbar/Toast Widget
///
/// Consistent toast notification styling across apps with grade-band awareness.
/// Aligned with web toast component styling.
library;

import 'dart:async';
import 'dart:collection';

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_shadows.dart';
import '../theme/aivo_theme.dart';

/// Toast variant for styling.
enum AivoToastVariant {
  /// Default/neutral toast
  neutral,

  /// Success toast (green)
  success,

  /// Warning toast (amber)
  warning,

  /// Error toast (red)
  error,

  /// Info toast (blue)
  info,
}

/// Toast position on screen.
enum AivoToastPosition {
  /// Bottom center (default)
  bottom,

  /// Top center
  top,

  /// Bottom left
  bottomLeft,

  /// Bottom right
  bottomRight,

  /// Top left
  topLeft,

  /// Top right
  topRight,
}

/// Toast configuration.
class AivoToastConfig {
  const AivoToastConfig({
    required this.message,
    this.title,
    this.variant = AivoToastVariant.neutral,
    this.duration = const Duration(seconds: 4),
    this.action,
    this.actionLabel,
    this.onAction,
    this.icon,
    this.showCloseButton = false,
    this.position = AivoToastPosition.bottom,
    this.gradeBand,
  });

  /// Toast message.
  final String message;

  /// Optional title.
  final String? title;

  /// Visual variant.
  final AivoToastVariant variant;

  /// Duration before auto-dismiss.
  final Duration duration;

  /// Action widget.
  final Widget? action;

  /// Action button label.
  final String? actionLabel;

  /// Action callback.
  final VoidCallback? onAction;

  /// Custom icon (overrides variant icon).
  final IconData? icon;

  /// Whether to show close button.
  final bool showCloseButton;

  /// Position on screen.
  final AivoToastPosition position;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;
}

/// Controller for managing toasts.
class AivoToastController {
  AivoToastController._();

  static final AivoToastController _instance = AivoToastController._();
  static AivoToastController get instance => _instance;

  final _toasts = Queue<_ToastEntry>();

  OverlayEntry? _overlayEntry;
  Timer? _dismissTimer;

  /// Show a toast notification.
  void show(BuildContext context, AivoToastConfig config) {
    final entry = _ToastEntry(
      config: config,
      key: UniqueKey(),
    );

    _toasts.addLast(entry);
    _showNext(context);
  }

  /// Show a simple message toast.
  void showMessage(
    BuildContext context,
    String message, {
    AivoToastVariant variant = AivoToastVariant.neutral,
    Duration duration = const Duration(seconds: 4),
    AivoGradeBand? gradeBand,
  }) {
    show(
      context,
      AivoToastConfig(
        message: message,
        variant: variant,
        duration: duration,
        gradeBand: gradeBand,
      ),
    );
  }

  /// Show success toast.
  void showSuccess(BuildContext context, String message, {AivoGradeBand? gradeBand}) {
    showMessage(context, message, variant: AivoToastVariant.success, gradeBand: gradeBand);
  }

  /// Show error toast.
  void showError(BuildContext context, String message, {AivoGradeBand? gradeBand}) {
    showMessage(context, message, variant: AivoToastVariant.error, gradeBand: gradeBand);
  }

  /// Show warning toast.
  void showWarning(BuildContext context, String message, {AivoGradeBand? gradeBand}) {
    showMessage(context, message, variant: AivoToastVariant.warning, gradeBand: gradeBand);
  }

  /// Show info toast.
  void showInfo(BuildContext context, String message, {AivoGradeBand? gradeBand}) {
    showMessage(context, message, variant: AivoToastVariant.info, gradeBand: gradeBand);
  }

  /// Dismiss current toast.
  void dismiss() {
    _dismissTimer?.cancel();
    _dismissTimer = null;
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  /// Clear all toasts.
  void clear() {
    _toasts.clear();
    dismiss();
  }

  void _showNext(BuildContext context) {
    if (_overlayEntry != null || _toasts.isEmpty) return;

    final entry = _toasts.removeFirst();
    _showEntry(context, entry);
  }

  void _showEntry(BuildContext context, _ToastEntry entry) {
    final overlay = Overlay.of(context);

    _overlayEntry = OverlayEntry(
      builder: (context) => _AivoToastOverlay(
        config: entry.config,
        onDismiss: () {
          dismiss();
          _showNext(context);
        },
      ),
    );

    overlay.insert(_overlayEntry!);

    // Auto dismiss
    if (entry.config.duration.inMilliseconds > 0) {
      _dismissTimer = Timer(entry.config.duration, () {
        dismiss();
        _showNext(context);
      });
    }
  }
}

class _ToastEntry {
  const _ToastEntry({
    required this.config,
    required this.key,
  });

  final AivoToastConfig config;
  final Key key;
}

/// Toast overlay widget.
class _AivoToastOverlay extends StatefulWidget {
  const _AivoToastOverlay({
    required this.config,
    required this.onDismiss,
  });

  final AivoToastConfig config;
  final VoidCallback onDismiss;

  @override
  State<_AivoToastOverlay> createState() => _AivoToastOverlayState();
}

class _AivoToastOverlayState extends State<_AivoToastOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );

    final isTop = widget.config.position == AivoToastPosition.top ||
        widget.config.position == AivoToastPosition.topLeft ||
        widget.config.position == AivoToastPosition.topRight;

    _slideAnimation = Tween<Offset>(
      begin: Offset(0, isTop ? -1 : 1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));

    _fadeAnimation = Tween<double>(
      begin: 0,
      end: 1,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    ));

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _dismiss() async {
    await _controller.reverse();
    widget.onDismiss();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: _getLeft(),
      right: _getRight(),
      top: _getTop(context),
      bottom: _getBottom(context),
      child: SafeArea(
        child: SlideTransition(
          position: _slideAnimation,
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: Center(
              child: AivoToast(
                config: widget.config,
                onDismiss: _dismiss,
              ),
            ),
          ),
        ),
      ),
    );
  }

  double? _getLeft() {
    return switch (widget.config.position) {
      AivoToastPosition.bottomLeft ||
      AivoToastPosition.topLeft =>
        16,
      _ => 16,
    };
  }

  double? _getRight() {
    return switch (widget.config.position) {
      AivoToastPosition.bottomRight ||
      AivoToastPosition.topRight =>
        16,
      _ => 16,
    };
  }

  double? _getTop(BuildContext context) {
    return switch (widget.config.position) {
      AivoToastPosition.top ||
      AivoToastPosition.topLeft ||
      AivoToastPosition.topRight =>
        MediaQuery.of(context).padding.top + 16,
      _ => null,
    };
  }

  double? _getBottom(BuildContext context) {
    return switch (widget.config.position) {
      AivoToastPosition.bottom ||
      AivoToastPosition.bottomLeft ||
      AivoToastPosition.bottomRight =>
        MediaQuery.of(context).padding.bottom + 16,
      _ => null,
    };
  }
}

/// Individual toast widget.
class AivoToast extends StatelessWidget {
  const AivoToast({
    super.key,
    required this.config,
    this.onDismiss,
  });

  final AivoToastConfig config;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand =
        config.gradeBand ?? AivoTheme.gradeBandOf(context);

    final (bgColor, fgColor, iconData) = _getColors(theme);

    final radius = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusLg,
      AivoGradeBand.g6_8 => AivoBrand.radiusMd,
      AivoGradeBand.g9_12 => AivoBrand.radiusSm,
    };

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 400),
      child: Container(
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(radius),
          boxShadow: AivoShadows.raised,
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 12,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Icon
              Icon(
                config.icon ?? iconData,
                color: fgColor,
                size: 20,
              ),
              const SizedBox(width: 12),
              // Content
              Flexible(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (config.title != null) ...[
                      Text(
                        config.title!,
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: fgColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                    ],
                    Text(
                      config.message,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: fgColor.withValues(
                          alpha: config.title != null ? 0.8 : 1.0,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Action
              if (config.action != null) ...[
                const SizedBox(width: 8),
                config.action!,
              ] else if (config.actionLabel != null) ...[
                const SizedBox(width: 8),
                TextButton(
                  onPressed: () {
                    config.onAction?.call();
                    onDismiss?.call();
                  },
                  style: TextButton.styleFrom(
                    foregroundColor: fgColor,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  ),
                  child: Text(config.actionLabel!),
                ),
              ],
              // Close button
              if (config.showCloseButton) ...[
                const SizedBox(width: 4),
                SizedBox(
                  width: 32,
                  height: 32,
                  child: IconButton(
                    onPressed: onDismiss,
                    padding: EdgeInsets.zero,
                    icon: Icon(
                      Icons.close,
                      size: 18,
                      color: fgColor.withValues(alpha: 0.7),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  (Color, Color, IconData) _getColors(ThemeData theme) {
    return switch (config.variant) {
      AivoToastVariant.neutral => (
          theme.colorScheme.inverseSurface,
          theme.colorScheme.onInverseSurface,
          Icons.info_outline,
        ),
      AivoToastVariant.success => (
          AivoBrand.success.withValues(alpha: 0.95),
          Colors.white,
          Icons.check_circle_outline,
        ),
      AivoToastVariant.warning => (
          AivoBrand.warning.withValues(alpha: 0.95),
          Colors.black87,
          Icons.warning_amber_outlined,
        ),
      AivoToastVariant.error => (
          theme.colorScheme.error.withValues(alpha: 0.95),
          theme.colorScheme.onError,
          Icons.error_outline,
        ),
      AivoToastVariant.info => (
          AivoBrand.info.withValues(alpha: 0.95),
          Colors.white,
          Icons.info_outline,
        ),
    };
  }
}

/// Snackbar-style toast using ScaffoldMessenger.
class AivoSnackbar {
  AivoSnackbar._();

  /// Show snackbar using ScaffoldMessenger.
  static ScaffoldFeatureController<SnackBar, SnackBarClosedReason> show(
    BuildContext context, {
    required String message,
    String? title,
    AivoToastVariant variant = AivoToastVariant.neutral,
    Duration duration = const Duration(seconds: 4),
    String? actionLabel,
    VoidCallback? onAction,
    AivoGradeBand? gradeBand,
    SnackBarBehavior behavior = SnackBarBehavior.floating,
  }) {
    final theme = Theme.of(context);
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);

    final (bgColor, fgColor, iconData) = _getColors(theme, variant);

    final radius = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusLg,
      AivoGradeBand.g6_8 => AivoBrand.radiusMd,
      AivoGradeBand.g9_12 => AivoBrand.radiusSm,
    };

    final snackBar = SnackBar(
      backgroundColor: bgColor,
      behavior: behavior,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radius),
      ),
      margin: behavior == SnackBarBehavior.floating
          ? const EdgeInsets.all(16)
          : null,
      duration: duration,
      content: Row(
        children: [
          Icon(iconData, color: fgColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: title != null
                ? Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: fgColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        message,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: fgColor.withValues(alpha: 0.8),
                        ),
                      ),
                    ],
                  )
                : Text(
                    message,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: fgColor,
                    ),
                  ),
          ),
        ],
      ),
      action: actionLabel != null
          ? SnackBarAction(
              label: actionLabel,
              textColor: fgColor,
              onPressed: onAction ?? () {},
            )
          : null,
    );

    return ScaffoldMessenger.of(context).showSnackBar(snackBar);
  }

  /// Show success snackbar.
  static ScaffoldFeatureController<SnackBar, SnackBarClosedReason> showSuccess(
    BuildContext context,
    String message, {
    String? title,
    AivoGradeBand? gradeBand,
  }) {
    return show(context, message: message, title: title, variant: AivoToastVariant.success, gradeBand: gradeBand);
  }

  /// Show error snackbar.
  static ScaffoldFeatureController<SnackBar, SnackBarClosedReason> showError(
    BuildContext context,
    String message, {
    String? title,
    AivoGradeBand? gradeBand,
  }) {
    return show(context, message: message, title: title, variant: AivoToastVariant.error, gradeBand: gradeBand);
  }

  /// Show warning snackbar.
  static ScaffoldFeatureController<SnackBar, SnackBarClosedReason> showWarning(
    BuildContext context,
    String message, {
    String? title,
    AivoGradeBand? gradeBand,
  }) {
    return show(context, message: message, title: title, variant: AivoToastVariant.warning, gradeBand: gradeBand);
  }

  /// Show info snackbar.
  static ScaffoldFeatureController<SnackBar, SnackBarClosedReason> showInfo(
    BuildContext context,
    String message, {
    String? title,
    AivoGradeBand? gradeBand,
  }) {
    return show(context, message: message, title: title, variant: AivoToastVariant.info, gradeBand: gradeBand);
  }

  static (Color, Color, IconData) _getColors(
      ThemeData theme, AivoToastVariant variant) {
    return switch (variant) {
      AivoToastVariant.neutral => (
          theme.colorScheme.inverseSurface,
          theme.colorScheme.onInverseSurface,
          Icons.info_outline,
        ),
      AivoToastVariant.success => (
          AivoBrand.success,
          Colors.white,
          Icons.check_circle_outline,
        ),
      AivoToastVariant.warning => (
          AivoBrand.warning,
          Colors.black87,
          Icons.warning_amber_outlined,
        ),
      AivoToastVariant.error => (
          theme.colorScheme.error,
          theme.colorScheme.onError,
          Icons.error_outline,
        ),
      AivoToastVariant.info => (
          AivoBrand.info,
          Colors.white,
          Icons.info_outline,
        ),
    };
  }
}
