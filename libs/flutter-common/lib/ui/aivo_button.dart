/// Aivo Button Widget
///
/// Consistent button styling across apps.
library;

import 'package:flutter/material.dart';

/// Button variants.
enum AivoButtonVariant {
  primary,
  secondary,
  outlined,
  text,
  danger,
}

/// Button sizes.
enum AivoButtonSize {
  small,
  medium,
  large,
}

/// Aivo styled button.
class AivoButton extends StatelessWidget {
  const AivoButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AivoButtonVariant.primary,
    this.size = AivoButtonSize.medium,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.enabled = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final AivoButtonVariant variant;
  final AivoButtonSize size;
  final IconData? icon;
  final bool isLoading;
  final bool isFullWidth;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final effectiveOnPressed = enabled && !isLoading ? onPressed : null;

    final padding = switch (size) {
      AivoButtonSize.small =>
        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      AivoButtonSize.medium =>
        const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      AivoButtonSize.large =>
        const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
    };

    final textStyle = switch (size) {
      AivoButtonSize.small => theme.textTheme.labelMedium,
      AivoButtonSize.medium => theme.textTheme.labelLarge,
      AivoButtonSize.large => theme.textTheme.titleMedium,
    };

    final iconSize = switch (size) {
      AivoButtonSize.small => 16.0,
      AivoButtonSize.medium => 20.0,
      AivoButtonSize.large => 24.0,
    };

    Widget child = isLoading
        ? SizedBox(
            width: iconSize,
            height: iconSize,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation(
                variant == AivoButtonVariant.primary
                    ? colorScheme.onPrimary
                    : colorScheme.primary,
              ),
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: iconSize),
                const SizedBox(width: 8),
              ],
              Text(label, style: textStyle),
            ],
          );

    Widget button = switch (variant) {
      AivoButtonVariant.primary => FilledButton(
          onPressed: effectiveOnPressed,
          style: FilledButton.styleFrom(padding: padding),
          child: child,
        ),
      AivoButtonVariant.secondary => FilledButton.tonal(
          onPressed: effectiveOnPressed,
          style: FilledButton.styleFrom(padding: padding),
          child: child,
        ),
      AivoButtonVariant.outlined => OutlinedButton(
          onPressed: effectiveOnPressed,
          style: OutlinedButton.styleFrom(padding: padding),
          child: child,
        ),
      AivoButtonVariant.text => TextButton(
          onPressed: effectiveOnPressed,
          style: TextButton.styleFrom(padding: padding),
          child: child,
        ),
      AivoButtonVariant.danger => FilledButton(
          onPressed: effectiveOnPressed,
          style: FilledButton.styleFrom(
            padding: padding,
            backgroundColor: colorScheme.error,
            foregroundColor: colorScheme.onError,
          ),
          child: child,
        ),
    };

    if (isFullWidth) {
      return SizedBox(width: double.infinity, child: button);
    }

    return button;
  }
}
