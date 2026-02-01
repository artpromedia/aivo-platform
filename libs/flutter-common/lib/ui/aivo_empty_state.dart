/// Aivo Empty State Widget
///
/// Consistent empty state styling across apps with grade-band awareness.
/// Aligned with web EmptyState component styling.
library;

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_theme.dart';

/// Empty state widget matching web EmptyState component.
class AivoEmptyState extends StatelessWidget {
  const AivoEmptyState({
    super.key,
    required this.title,
    this.description,
    this.icon,
    this.illustration,
    this.action,
    this.actionLabel,
    this.onAction,
    this.secondaryActionLabel,
    this.onSecondaryAction,
    this.gradeBand,
    this.compact = false,
  });

  /// Empty state title.
  final String title;

  /// Optional description.
  final String? description;

  /// Icon to display (used if illustration is null).
  final IconData? icon;

  /// Custom illustration widget (takes precedence over icon).
  final Widget? illustration;

  /// Action widget.
  final Widget? action;

  /// Primary action button label.
  final String? actionLabel;

  /// Primary action callback.
  final VoidCallback? onAction;

  /// Secondary action label.
  final String? secondaryActionLabel;

  /// Secondary action callback.
  final VoidCallback? onSecondaryAction;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Compact variant with less padding.
  final bool compact;

  /// No data empty state.
  factory AivoEmptyState.noData({
    Key? key,
    String title = 'No data',
    String? description,
    String? actionLabel,
    VoidCallback? onAction,
    AivoGradeBand? gradeBand,
  }) {
    return AivoEmptyState(
      key: key,
      title: title,
      description: description ?? 'There\'s nothing here yet.',
      icon: Icons.inbox_outlined,
      actionLabel: actionLabel,
      onAction: onAction,
      gradeBand: gradeBand,
    );
  }

  /// No results empty state.
  factory AivoEmptyState.noResults({
    Key? key,
    String title = 'No results found',
    String? description,
    String? actionLabel,
    VoidCallback? onAction,
    AivoGradeBand? gradeBand,
  }) {
    return AivoEmptyState(
      key: key,
      title: title,
      description: description ?? 'Try adjusting your search or filters.',
      icon: Icons.search_off_outlined,
      actionLabel: actionLabel ?? 'Clear filters',
      onAction: onAction,
      gradeBand: gradeBand,
    );
  }

  /// Error empty state.
  factory AivoEmptyState.error({
    Key? key,
    String title = 'Something went wrong',
    String? description,
    String actionLabel = 'Try again',
    VoidCallback? onAction,
    AivoGradeBand? gradeBand,
  }) {
    return AivoEmptyState(
      key: key,
      title: title,
      description: description ?? 'An error occurred. Please try again.',
      icon: Icons.error_outline,
      actionLabel: actionLabel,
      onAction: onAction,
      gradeBand: gradeBand,
    );
  }

  /// Offline empty state.
  factory AivoEmptyState.offline({
    Key? key,
    String title = 'You\'re offline',
    String? description,
    String actionLabel = 'Retry',
    VoidCallback? onAction,
    AivoGradeBand? gradeBand,
  }) {
    return AivoEmptyState(
      key: key,
      title: title,
      description: description ?? 'Check your internet connection and try again.',
      icon: Icons.wifi_off_outlined,
      actionLabel: actionLabel,
      onAction: onAction,
      gradeBand: gradeBand,
    );
  }

  /// Coming soon empty state.
  factory AivoEmptyState.comingSoon({
    Key? key,
    String title = 'Coming soon',
    String? description,
    AivoGradeBand? gradeBand,
  }) {
    return AivoEmptyState(
      key: key,
      title: title,
      description: description ?? 'This feature is under development.',
      icon: Icons.construction_outlined,
      gradeBand: gradeBand,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand =
        gradeBand ?? AivoTheme.gradeBandOf(context);

    // Icon sizes per grade band (matching web 4xl/6xl pattern)
    final iconSize = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => 64.0,
      AivoGradeBand.g6_8 => 56.0,
      AivoGradeBand.g9_12 => 48.0,
    };

    // Button height per grade band
    final buttonHeight = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => AivoBrand.touchTargetExplorer,
      AivoGradeBand.g6_8 => AivoBrand.touchTargetNavigator,
      AivoGradeBand.g9_12 => AivoBrand.touchTargetScholar,
    };

    final buttonRadius = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusLg,
      AivoGradeBand.g6_8 => AivoBrand.radiusMd,
      AivoGradeBand.g9_12 => AivoBrand.radiusSm,
    };

    return Padding(
      padding: EdgeInsets.symmetric(
        vertical: compact ? 24 : 48,
        horizontal: 24,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Illustration or icon
              if (illustration != null)
                illustration!
              else if (icon != null)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest
                        .withValues(alpha: 0.5),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    icon,
                    size: iconSize,
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                  ),
                ),
              if (illustration != null || icon != null)
                SizedBox(height: compact ? 16 : 24),
              // Title
              Text(
                title,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w500,
                  color: theme.colorScheme.onSurface,
                ),
                textAlign: TextAlign.center,
              ),
              // Description
              if (description != null) ...[
                const SizedBox(height: 8),
                Text(
                  description!,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
              // Actions
              if (action != null ||
                  actionLabel != null ||
                  secondaryActionLabel != null) ...[
                SizedBox(height: compact ? 16 : 24),
                if (action != null)
                  action!
                else
                  Column(
                    children: [
                      if (actionLabel != null)
                        SizedBox(
                          height: buttonHeight,
                          child: FilledButton(
                            onPressed: onAction,
                            style: FilledButton.styleFrom(
                              shape: RoundedRectangleBorder(
                                borderRadius:
                                    BorderRadius.circular(buttonRadius),
                              ),
                            ),
                            child: Text(actionLabel!),
                          ),
                        ),
                      if (secondaryActionLabel != null) ...[
                        const SizedBox(height: 8),
                        SizedBox(
                          height: buttonHeight,
                          child: TextButton(
                            onPressed: onSecondaryAction,
                            child: Text(secondaryActionLabel!),
                          ),
                        ),
                      ],
                    ],
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Small inline empty state for lists/grids.
class AivoInlineEmptyState extends StatelessWidget {
  const AivoInlineEmptyState({
    super.key,
    required this.message,
    this.icon,
  });

  /// Empty state message.
  final String message;

  /// Optional icon.
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              size: 20,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
            ),
            const SizedBox(width: 8),
          ],
          Text(
            message,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }
}

/// Placeholder widget for feature development.
class AivoPlaceholder extends StatelessWidget {
  const AivoPlaceholder({
    super.key,
    required this.label,
    this.icon,
    this.height,
    this.gradeBand,
  });

  /// Placeholder label.
  final String label;

  /// Optional icon.
  final IconData? icon;

  /// Fixed height.
  final double? height;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand =
        gradeBand ?? AivoTheme.gradeBandOf(context);

    final radius = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusLg,
      AivoGradeBand.g6_8 => AivoBrand.radiusMd,
      AivoGradeBand.g9_12 => AivoBrand.radiusSm,
    };

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.2),
          style: BorderStyle.solid,
        ),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 32,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
              ),
              const SizedBox(height: 8),
            ],
            Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
