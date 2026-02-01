/// Aivo Alert Banner Widget
///
/// Consistent alert banner styling across apps with grade-band awareness.
/// Aligned with web Alert component styling.
library;

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_theme.dart';

/// Alert banner variant.
enum AivoAlertBannerVariant {
  /// Info alert (blue)
  info,

  /// Success alert (green)
  success,

  /// Warning alert (amber)
  warning,

  /// Error/destructive alert (red)
  error,
}

/// Alert banner widget matching web Alert component.
class AivoAlertBanner extends StatelessWidget {
  const AivoAlertBanner({
    super.key,
    required this.title,
    this.description,
    this.variant = AivoAlertBannerVariant.info,
    this.icon,
    this.action,
    this.onDismiss,
    this.gradeBand,
  });

  /// Alert title.
  final String title;

  /// Optional description.
  final String? description;

  /// Visual variant.
  final AivoAlertBannerVariant variant;

  /// Custom icon (overrides variant default).
  final IconData? icon;

  /// Action widget.
  final Widget? action;

  /// Dismiss callback (shows close button if provided).
  final VoidCallback? onDismiss;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Info alert factory.
  factory AivoAlertBanner.info({
    Key? key,
    required String title,
    String? description,
    Widget? action,
    VoidCallback? onDismiss,
    AivoGradeBand? gradeBand,
  }) {
    return AivoAlertBanner(
      key: key,
      title: title,
      description: description,
      variant: AivoAlertBannerVariant.info,
      action: action,
      onDismiss: onDismiss,
      gradeBand: gradeBand,
    );
  }

  /// Success alert factory.
  factory AivoAlertBanner.success({
    Key? key,
    required String title,
    String? description,
    Widget? action,
    VoidCallback? onDismiss,
    AivoGradeBand? gradeBand,
  }) {
    return AivoAlertBanner(
      key: key,
      title: title,
      description: description,
      variant: AivoAlertBannerVariant.success,
      action: action,
      onDismiss: onDismiss,
      gradeBand: gradeBand,
    );
  }

  /// Warning alert factory.
  factory AivoAlertBanner.warning({
    Key? key,
    required String title,
    String? description,
    Widget? action,
    VoidCallback? onDismiss,
    AivoGradeBand? gradeBand,
  }) {
    return AivoAlertBanner(
      key: key,
      title: title,
      description: description,
      variant: AivoAlertBannerVariant.warning,
      action: action,
      onDismiss: onDismiss,
      gradeBand: gradeBand,
    );
  }

  /// Error alert factory.
  factory AivoAlertBanner.error({
    Key? key,
    required String title,
    String? description,
    Widget? action,
    VoidCallback? onDismiss,
    AivoGradeBand? gradeBand,
  }) {
    return AivoAlertBanner(
      key: key,
      title: title,
      description: description,
      variant: AivoAlertBannerVariant.error,
      action: action,
      onDismiss: onDismiss,
      gradeBand: gradeBand,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand =
        gradeBand ?? AivoTheme.gradeBandOf(context);

    final (bgColor, borderColor, iconColor, iconData) =
        _getColorsAndIcon(theme);

    final radius = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusLg,
      AivoGradeBand.g6_8 => AivoBrand.radiusMd,
      AivoGradeBand.g9_12 => AivoBrand.radiusSm,
    };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Icon
          Icon(
            icon ?? iconData,
            color: iconColor,
            size: 20,
          ),
          const SizedBox(width: 12),
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w500,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                if (description != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    description!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                    ),
                  ),
                ],
                if (action != null) ...[
                  const SizedBox(height: 12),
                  action!,
                ],
              ],
            ),
          ),
          // Dismiss button
          if (onDismiss != null) ...[
            const SizedBox(width: 8),
            SizedBox(
              width: 28,
              height: 28,
              child: IconButton(
                onPressed: onDismiss,
                padding: EdgeInsets.zero,
                icon: Icon(
                  Icons.close,
                  size: 18,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  (Color, Color, Color, IconData) _getColorsAndIcon(ThemeData theme) {
    return switch (variant) {
      AivoAlertBannerVariant.info => (
          AivoBrand.info.withValues(alpha: 0.1),
          AivoBrand.info.withValues(alpha: 0.3),
          AivoBrand.info,
          Icons.info_outline,
        ),
      AivoAlertBannerVariant.success => (
          AivoBrand.success.withValues(alpha: 0.1),
          AivoBrand.success.withValues(alpha: 0.3),
          AivoBrand.success,
          Icons.check_circle_outline,
        ),
      AivoAlertBannerVariant.warning => (
          AivoBrand.warning.withValues(alpha: 0.1),
          AivoBrand.warning.withValues(alpha: 0.3),
          AivoBrand.warning,
          Icons.warning_amber_outlined,
        ),
      AivoAlertBannerVariant.error => (
          theme.colorScheme.error.withValues(alpha: 0.1),
          theme.colorScheme.error.withValues(alpha: 0.3),
          theme.colorScheme.error,
          Icons.error_outline,
        ),
    };
  }
}

/// Inline alert variant (no background, smaller).
class AivoInlineAlert extends StatelessWidget {
  const AivoInlineAlert({
    super.key,
    required this.message,
    this.variant = AivoAlertBannerVariant.info,
    this.icon,
  });

  /// Alert message.
  final String message;

  /// Visual variant.
  final AivoAlertBannerVariant variant;

  /// Custom icon.
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (_, _, iconColor, iconData) = _getColorsAndIcon(theme);

    return Row(
      children: [
        Icon(
          icon ?? iconData,
          color: iconColor,
          size: 16,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            message,
            style: theme.textTheme.bodySmall?.copyWith(
              color: iconColor,
            ),
          ),
        ),
      ],
    );
  }

  (Color, Color, Color, IconData) _getColorsAndIcon(ThemeData theme) {
    return switch (variant) {
      AivoAlertBannerVariant.info => (
          AivoBrand.info.withValues(alpha: 0.1),
          AivoBrand.info.withValues(alpha: 0.3),
          AivoBrand.info,
          Icons.info_outline,
        ),
      AivoAlertBannerVariant.success => (
          AivoBrand.success.withValues(alpha: 0.1),
          AivoBrand.success.withValues(alpha: 0.3),
          AivoBrand.success,
          Icons.check_circle_outline,
        ),
      AivoAlertBannerVariant.warning => (
          AivoBrand.warning.withValues(alpha: 0.1),
          AivoBrand.warning.withValues(alpha: 0.3),
          AivoBrand.warning,
          Icons.warning_amber_outlined,
        ),
      AivoAlertBannerVariant.error => (
          theme.colorScheme.error.withValues(alpha: 0.1),
          theme.colorScheme.error.withValues(alpha: 0.3),
          theme.colorScheme.error,
          Icons.error_outline,
        ),
    };
  }
}

/// Dismissible alert banner that animates out.
class AivoDismissibleAlert extends StatefulWidget {
  const AivoDismissibleAlert({
    super.key,
    required this.title,
    this.description,
    this.variant = AivoAlertBannerVariant.info,
    this.icon,
    this.action,
    this.onDismiss,
    this.gradeBand,
    this.autoDismissDuration,
  });

  /// Alert title.
  final String title;

  /// Optional description.
  final String? description;

  /// Visual variant.
  final AivoAlertBannerVariant variant;

  /// Custom icon.
  final IconData? icon;

  /// Action widget.
  final Widget? action;

  /// Dismiss callback.
  final VoidCallback? onDismiss;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Auto dismiss duration (null = no auto dismiss).
  final Duration? autoDismissDuration;

  @override
  State<AivoDismissibleAlert> createState() => _AivoDismissibleAlertState();
}

class _AivoDismissibleAlertState extends State<AivoDismissibleAlert>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<double> _sizeAnimation;
  bool _isDismissed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );

    _fadeAnimation = Tween<double>(begin: 1, end: 0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _sizeAnimation = Tween<double>(begin: 1, end: 0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    // Auto dismiss
    if (widget.autoDismissDuration != null) {
      Future.delayed(widget.autoDismissDuration!, _dismiss);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _dismiss() async {
    if (_isDismissed) return;
    _isDismissed = true;

    await _controller.forward();
    widget.onDismiss?.call();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SizeTransition(
        sizeFactor: _sizeAnimation,
        axisAlignment: -1,
        child: AivoAlertBanner(
          title: widget.title,
          description: widget.description,
          variant: widget.variant,
          icon: widget.icon,
          action: widget.action,
          onDismiss: _dismiss,
          gradeBand: widget.gradeBand,
        ),
      ),
    );
  }
}
