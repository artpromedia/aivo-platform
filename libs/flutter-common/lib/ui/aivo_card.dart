/// Aivo Card Widget
///
/// Consistent card styling across apps.
library;

import 'package:flutter/material.dart';

/// Card variants.
enum AivoCardVariant {
  elevated,
  filled,
  outlined,
}

/// Aivo styled card.
class AivoCard extends StatelessWidget {
  const AivoCard({
    super.key,
    required this.child,
    this.variant = AivoCardVariant.elevated,
    this.onTap,
    this.padding,
    this.margin,
    this.color,
    this.borderRadius,
  });

  final Widget child;
  final AivoCardVariant variant;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final effectivePadding = padding ?? const EdgeInsets.all(16);
    final effectiveBorderRadius = borderRadius ?? BorderRadius.circular(12);
    final effectiveMargin = margin ?? const EdgeInsets.only(bottom: 12);

    Widget cardChild = Padding(
      padding: effectivePadding,
      child: child,
    );

    if (onTap != null) {
      cardChild = InkWell(
        onTap: onTap,
        borderRadius: effectiveBorderRadius,
        child: cardChild,
      );
    }

    return Padding(
      padding: effectiveMargin,
      child: switch (variant) {
        AivoCardVariant.elevated => Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: effectiveBorderRadius),
            color: color,
            child: cardChild,
          ),
        AivoCardVariant.filled => Card(
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: effectiveBorderRadius),
            color: color ?? colorScheme.surfaceContainerHighest,
            child: cardChild,
          ),
        AivoCardVariant.outlined => Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: effectiveBorderRadius,
              side: BorderSide(color: colorScheme.outlineVariant),
            ),
            color: color ?? colorScheme.surface,
            child: cardChild,
          ),
      },
    );
  }
}

/// Aivo info card with icon and content.
class AivoInfoCard extends StatelessWidget {
  const AivoInfoCard({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.trailing,
    this.onTap,
    this.variant = AivoCardVariant.elevated,
    this.iconColor,
  });

  final String title;
  final String? subtitle;
  final IconData? icon;
  final Widget? trailing;
  final VoidCallback? onTap;
  final AivoCardVariant variant;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return AivoCard(
      variant: variant,
      onTap: onTap,
      child: Row(
        children: [
          if (icon != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: (iconColor ?? colorScheme.primary).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: iconColor ?? colorScheme.primary,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitle!,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) trailing!,
          if (onTap != null && trailing == null)
            Icon(
              Icons.chevron_right,
              color: colorScheme.onSurfaceVariant,
            ),
        ],
      ),
    );
  }
}

/// Aivo stat card for displaying metrics.
class AivoStatCard extends StatelessWidget {
  const AivoStatCard({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.trend,
    this.trendPositive,
    this.onTap,
  });

  final String label;
  final String value;
  final IconData? icon;
  final String? trend;
  final bool? trendPositive;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return AivoCard(
      variant: AivoCardVariant.filled,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20, color: colorScheme.primary),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: theme.textTheme.labelLarge?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          if (trend != null) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(
                  trendPositive == true
                      ? Icons.trending_up
                      : trendPositive == false
                          ? Icons.trending_down
                          : Icons.trending_flat,
                  size: 16,
                  color: trendPositive == true
                      ? Colors.green
                      : trendPositive == false
                          ? Colors.red
                          : colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
                Text(
                  trend!,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: trendPositive == true
                        ? Colors.green
                        : trendPositive == false
                            ? Colors.red
                            : colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
