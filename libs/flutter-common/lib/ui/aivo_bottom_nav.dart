/// Aivo Bottom Navigation Bar Widget
///
/// Consistent bottom navigation styling across apps with grade-band awareness.
/// Aligned with Material 3 navigation bar patterns.
library;

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_shadows.dart';
import '../theme/aivo_theme.dart';

/// Bottom navigation bar variant styles
enum AivoBottomNavVariant {
  /// Standard surface background
  standard,

  /// Elevated with shadow
  elevated,

  /// Primary tinted background
  tinted,
}

/// Item configuration for bottom navigation.
class AivoBottomNavItem {
  const AivoBottomNavItem({
    required this.icon,
    required this.label,
    this.selectedIcon,
    this.badge,
    this.badgeColor,
  });

  /// Icon when unselected.
  final IconData icon;

  /// Label text.
  final String label;

  /// Icon when selected (defaults to [icon]).
  final IconData? selectedIcon;

  /// Badge count or text.
  final String? badge;

  /// Badge background color.
  final Color? badgeColor;
}

/// Aivo-styled Bottom Navigation Bar.
///
/// Features:
/// - Grade-band aware touch targets and typography
/// - Badge support for notifications
/// - Multiple visual variants
/// - Smooth selection animations
class AivoBottomNavBar extends StatelessWidget {
  const AivoBottomNavBar({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTap,
    this.variant = AivoBottomNavVariant.standard,
    this.gradeBand,
    this.showLabels = true,
    this.selectedItemColor,
    this.unselectedItemColor,
    this.backgroundColor,
  });

  /// Navigation items.
  final List<AivoBottomNavItem> items;

  /// Currently selected index.
  final int currentIndex;

  /// Called when an item is tapped.
  final ValueChanged<int> onTap;

  /// Visual variant.
  final AivoBottomNavVariant variant;

  /// Grade band for styling adjustments.
  final AivoGradeBand? gradeBand;

  /// Whether to show labels under icons.
  final bool showLabels;

  /// Selected item color override.
  final Color? selectedItemColor;

  /// Unselected item color override.
  final Color? unselectedItemColor;

  /// Background color override.
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    // Get variant-specific colors
    final (bgColor, shadow) = _getVariantColors(colorScheme);
    final effectiveBgColor = backgroundColor ?? bgColor;
    final effectiveSelectedColor = selectedItemColor ?? colorScheme.primary;
    final effectiveUnselectedColor =
        unselectedItemColor ?? colorScheme.onSurfaceVariant;

    // Get dimensions based on grade band
    final (height, iconSize, labelStyle) = _getDimensions(theme);

    return Container(
      decoration: BoxDecoration(
        color: effectiveBgColor,
        boxShadow: shadow,
        border: variant == AivoBottomNavVariant.standard
            ? Border(
                top: BorderSide(
                  color: colorScheme.outlineVariant,
                  width: 1,
                ),
              )
            : null,
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: height,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(items.length, (index) {
              final item = items[index];
              final isSelected = index == currentIndex;

              return _AivoBottomNavItem(
                item: item,
                isSelected: isSelected,
                selectedColor: effectiveSelectedColor,
                unselectedColor: effectiveUnselectedColor,
                iconSize: iconSize,
                labelStyle: labelStyle,
                showLabel: showLabels,
                gradeBand: gradeBand,
                onTap: () => onTap(index),
              );
            }),
          ),
        ),
      ),
    );
  }

  (Color bg, List<BoxShadow>?) _getVariantColors(ColorScheme colorScheme) {
    return switch (variant) {
      AivoBottomNavVariant.standard => (
          colorScheme.surface,
          null,
        ),
      AivoBottomNavVariant.elevated => (
          colorScheme.surface,
          AivoShadows.soft,
        ),
      AivoBottomNavVariant.tinted => (
          colorScheme.primaryContainer.withValues(alpha: 0.3),
          null,
        ),
    };
  }

  (double height, double iconSize, TextStyle? labelStyle) _getDimensions(
      ThemeData theme) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => (
          80.0,
          28.0,
          theme.textTheme.labelMedium?.copyWith(fontSize: 14),
        ),
      AivoGradeBand.g6_8 => (
          72.0,
          26.0,
          theme.textTheme.labelSmall?.copyWith(fontSize: 12),
        ),
      AivoGradeBand.g9_12 => (
          64.0,
          24.0,
          theme.textTheme.labelSmall?.copyWith(fontSize: 11),
        ),
      null => (
          72.0,
          26.0,
          theme.textTheme.labelSmall?.copyWith(fontSize: 12),
        ),
    };
  }
}

class _AivoBottomNavItem extends StatelessWidget {
  const _AivoBottomNavItem({
    required this.item,
    required this.isSelected,
    required this.selectedColor,
    required this.unselectedColor,
    required this.iconSize,
    required this.labelStyle,
    required this.showLabel,
    required this.gradeBand,
    required this.onTap,
  });

  final AivoBottomNavItem item;
  final bool isSelected;
  final Color selectedColor;
  final Color unselectedColor;
  final double iconSize;
  final TextStyle? labelStyle;
  final bool showLabel;
  final AivoGradeBand? gradeBand;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final effectiveColor = isSelected ? selectedColor : unselectedColor;
    final icon = isSelected ? (item.selectedIcon ?? item.icon) : item.icon;

    // Get touch target for grade band
    final touchTarget = _getTouchTarget();

    // Build the icon with optional badge
    Widget iconWidget = Icon(
      icon,
      size: iconSize,
      color: effectiveColor,
    );

    if (item.badge != null) {
      iconWidget = Stack(
        clipBehavior: Clip.none,
        children: [
          iconWidget,
          Positioned(
            right: -8,
            top: -4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              constraints: const BoxConstraints(minWidth: 18),
              decoration: BoxDecoration(
                color: item.badgeColor ?? colorScheme.error,
                borderRadius: BorderRadius.circular(9),
              ),
              child: Text(
                item.badge!,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onError,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ],
      );
    }

    return Expanded(
      child: InkWell(
        onTap: onTap,
        customBorder: const StadiumBorder(),
        child: Container(
          constraints: BoxConstraints(
            minWidth: touchTarget,
            minHeight: touchTarget,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Selected indicator background
              AnimatedContainer(
                duration: AivoBrand.durationFast,
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: isSelected
                      ? selectedColor.withValues(alpha: 0.1)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: iconWidget,
              ),
              if (showLabel) ...[
                const SizedBox(height: 4),
                AnimatedDefaultTextStyle(
                  duration: AivoBrand.durationFast,
                  style: labelStyle?.copyWith(
                        color: effectiveColor,
                        fontWeight:
                            isSelected ? FontWeight.w600 : FontWeight.w500,
                      ) ??
                      TextStyle(color: effectiveColor),
                  child: Text(
                    item.label,
                    maxLines: 1,
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

  double _getTouchTarget() {
    return switch (gradeBand) {
      AivoGradeBand.k5 => AivoBrand.touchTargetExplorer,
      AivoGradeBand.g6_8 => AivoBrand.touchTargetNavigator,
      AivoGradeBand.g9_12 => AivoBrand.touchTargetScholar,
      null => AivoBrand.touchTargetNavigator,
    };
  }
}

/// Floating bottom navigation bar with pill shape.
class AivoFloatingBottomNav extends StatelessWidget {
  const AivoFloatingBottomNav({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTap,
    this.gradeBand,
    this.margin = const EdgeInsets.all(16),
  });

  /// Navigation items.
  final List<AivoBottomNavItem> items;

  /// Currently selected index.
  final int currentIndex;

  /// Called when an item is tapped.
  final ValueChanged<int> onTap;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Margin around the navigation bar.
  final EdgeInsets margin;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: margin,
      child: SafeArea(
        top: false,
        child: Container(
          height: 64,
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(AivoBrand.radiusPill),
            boxShadow: AivoShadows.raised,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(items.length, (index) {
              final item = items[index];
              final isSelected = index == currentIndex;

              return _FloatingNavItem(
                item: item,
                isSelected: isSelected,
                selectedColor: colorScheme.primary,
                unselectedColor: colorScheme.onSurfaceVariant,
                onTap: () => onTap(index),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _FloatingNavItem extends StatelessWidget {
  const _FloatingNavItem({
    required this.item,
    required this.isSelected,
    required this.selectedColor,
    required this.unselectedColor,
    required this.onTap,
  });

  final AivoBottomNavItem item;
  final bool isSelected;
  final Color selectedColor;
  final Color unselectedColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final effectiveColor = isSelected ? selectedColor : unselectedColor;
    final icon = isSelected ? (item.selectedIcon ?? item.icon) : item.icon;

    Widget iconWidget = Icon(
      icon,
      size: 24,
      color: effectiveColor,
    );

    if (item.badge != null) {
      iconWidget = Stack(
        clipBehavior: Clip.none,
        children: [
          iconWidget,
          Positioned(
            right: -6,
            top: -3,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              constraints: const BoxConstraints(minWidth: 16),
              decoration: BoxDecoration(
                color: item.badgeColor ?? colorScheme.error,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                item.badge!,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onError,
                  fontSize: 9,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ],
      );
    }

    return AnimatedContainer(
      duration: AivoBrand.durationFast,
      padding: EdgeInsets.symmetric(
        horizontal: isSelected ? 20 : 16,
        vertical: 8,
      ),
      decoration: BoxDecoration(
        color: isSelected ? selectedColor.withValues(alpha: 0.1) : null,
        borderRadius: BorderRadius.circular(24),
      ),
      child: InkWell(
        onTap: onTap,
        customBorder: const StadiumBorder(),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            iconWidget,
            if (isSelected) ...[
              const SizedBox(width: 8),
              Text(
                item.label,
                style: theme.textTheme.labelMedium?.copyWith(
                  color: selectedColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
