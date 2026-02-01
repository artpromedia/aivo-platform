/// Aivo Tab Bar Widget
///
/// Consistent tab bar styling across apps with grade-band awareness.
/// Aligned with web tabs component styling.
library;

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_shadows.dart';
import '../theme/aivo_theme.dart';

/// Tab bar variant styles
enum AivoTabBarVariant {
  /// Standard underline indicator
  underline,

  /// Filled/pill style indicator
  filled,

  /// Segment control style
  segmented,
}

/// Tab item configuration.
class AivoTabItem {
  const AivoTabItem({
    required this.label,
    this.icon,
    this.badge,
    this.enabled = true,
  });

  /// Tab label text.
  final String label;

  /// Optional leading icon.
  final IconData? icon;

  /// Badge count or text.
  final String? badge;

  /// Whether the tab is enabled.
  final bool enabled;
}

/// Aivo-styled Tab Bar.
///
/// Web reference: libs/ui-web/src/components/ui/tabs.tsx
/// - TabsList: h-10, rounded-md, bg-muted, p-1
/// - TabsTrigger: px-3 py-1.5, text-sm font-medium, rounded-sm
/// - Active: bg-background shadow-sm
class AivoTabBar extends StatelessWidget implements PreferredSizeWidget {
  const AivoTabBar({
    super.key,
    required this.tabs,
    required this.controller,
    this.variant = AivoTabBarVariant.underline,
    this.gradeBand,
    this.isScrollable = false,
    this.padding,
    this.labelColor,
    this.unselectedLabelColor,
    this.indicatorColor,
    this.backgroundColor,
    this.onTap,
  });

  /// Tab items.
  final List<AivoTabItem> tabs;

  /// Tab controller.
  final TabController controller;

  /// Visual variant.
  final AivoTabBarVariant variant;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Whether tabs are scrollable.
  final bool isScrollable;

  /// Padding around the tab bar.
  final EdgeInsetsGeometry? padding;

  /// Selected tab label color.
  final Color? labelColor;

  /// Unselected tab label color.
  final Color? unselectedLabelColor;

  /// Indicator color.
  final Color? indicatorColor;

  /// Background color.
  final Color? backgroundColor;

  /// Called when a tab is tapped.
  final ValueChanged<int>? onTap;

  @override
  Size get preferredSize => Size.fromHeight(_getHeight());

  double _getHeight() {
    return switch (variant) {
      AivoTabBarVariant.underline => 48.0,
      AivoTabBarVariant.filled => 44.0,
      AivoTabBarVariant.segmented => 40.0,
    };
  }

  @override
  Widget build(BuildContext context) {
    return switch (variant) {
      AivoTabBarVariant.underline => _UnderlineTabBar(
          tabs: tabs,
          controller: controller,
          gradeBand: gradeBand,
          isScrollable: isScrollable,
          padding: padding,
          labelColor: labelColor,
          unselectedLabelColor: unselectedLabelColor,
          indicatorColor: indicatorColor,
          backgroundColor: backgroundColor,
          onTap: onTap,
        ),
      AivoTabBarVariant.filled => _FilledTabBar(
          tabs: tabs,
          controller: controller,
          gradeBand: gradeBand,
          isScrollable: isScrollable,
          padding: padding,
          labelColor: labelColor,
          unselectedLabelColor: unselectedLabelColor,
          indicatorColor: indicatorColor,
          backgroundColor: backgroundColor,
          onTap: onTap,
        ),
      AivoTabBarVariant.segmented => _SegmentedTabBar(
          tabs: tabs,
          controller: controller,
          gradeBand: gradeBand,
          padding: padding,
          labelColor: labelColor,
          unselectedLabelColor: unselectedLabelColor,
          indicatorColor: indicatorColor,
          backgroundColor: backgroundColor,
          onTap: onTap,
        ),
    };
  }
}

/// Standard underline indicator tab bar.
class _UnderlineTabBar extends StatelessWidget {
  const _UnderlineTabBar({
    required this.tabs,
    required this.controller,
    this.gradeBand,
    this.isScrollable = false,
    this.padding,
    this.labelColor,
    this.unselectedLabelColor,
    this.indicatorColor,
    this.backgroundColor,
    this.onTap,
  });

  final List<AivoTabItem> tabs;
  final TabController controller;
  final AivoGradeBand? gradeBand;
  final bool isScrollable;
  final EdgeInsetsGeometry? padding;
  final Color? labelColor;
  final Color? unselectedLabelColor;
  final Color? indicatorColor;
  final Color? backgroundColor;
  final ValueChanged<int>? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final effectiveLabelColor = labelColor ?? colorScheme.primary;
    final effectiveUnselectedColor =
        unselectedLabelColor ?? colorScheme.onSurfaceVariant;
    final effectiveIndicatorColor = indicatorColor ?? colorScheme.primary;

    return Container(
      color: backgroundColor ?? colorScheme.surface,
      child: TabBar(
        controller: controller,
        isScrollable: isScrollable,
        padding: padding,
        labelColor: effectiveLabelColor,
        unselectedLabelColor: effectiveUnselectedColor,
        labelStyle: theme.textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: theme.textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w500,
        ),
        indicatorColor: effectiveIndicatorColor,
        indicatorWeight: 2,
        indicatorSize: TabBarIndicatorSize.label,
        dividerColor: colorScheme.outlineVariant,
        dividerHeight: 1,
        splashBorderRadius: BorderRadius.circular(AivoBrand.radiusSm),
        onTap: onTap,
        tabs: tabs.map((tab) => _buildTab(tab, theme)).toList(),
      ),
    );
  }

  Widget _buildTab(AivoTabItem tab, ThemeData theme) {
    Widget content = Text(tab.label);

    if (tab.icon != null) {
      content = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(tab.icon, size: 18),
          const SizedBox(width: 8),
          content,
        ],
      );
    }

    if (tab.badge != null) {
      content = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          content,
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            decoration: BoxDecoration(
              color: theme.colorScheme.error,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              tab.badge!,
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onError,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      );
    }

    return Tab(
      child: Opacity(
        opacity: tab.enabled ? 1.0 : 0.5,
        child: content,
      ),
    );
  }
}

/// Filled/pill style tab bar matching web TabsList.
class _FilledTabBar extends StatelessWidget {
  const _FilledTabBar({
    required this.tabs,
    required this.controller,
    this.gradeBand,
    this.isScrollable = false,
    this.padding,
    this.labelColor,
    this.unselectedLabelColor,
    this.indicatorColor,
    this.backgroundColor,
    this.onTap,
  });

  final List<AivoTabItem> tabs;
  final TabController controller;
  final AivoGradeBand? gradeBand;
  final bool isScrollable;
  final EdgeInsetsGeometry? padding;
  final Color? labelColor;
  final Color? unselectedLabelColor;
  final Color? indicatorColor;
  final Color? backgroundColor;
  final ValueChanged<int>? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final effectiveLabelColor = labelColor ?? colorScheme.onSurface;
    final effectiveUnselectedColor =
        unselectedLabelColor ?? colorScheme.onSurfaceVariant;
    final effectiveIndicatorColor = indicatorColor ?? colorScheme.surface;
    final effectiveBgColor =
        backgroundColor ?? colorScheme.surfaceContainerHighest;

    // Get radius for grade band
    final radius = _getRadius();

    return Container(
      margin: padding ?? const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: effectiveBgColor,
        borderRadius: BorderRadius.circular(radius),
      ),
      child: TabBar(
        controller: controller,
        isScrollable: isScrollable,
        labelColor: effectiveLabelColor,
        unselectedLabelColor: effectiveUnselectedColor,
        labelStyle: theme.textTheme.labelMedium?.copyWith(
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: theme.textTheme.labelMedium?.copyWith(
          fontWeight: FontWeight.w500,
        ),
        indicator: BoxDecoration(
          color: effectiveIndicatorColor,
          borderRadius: BorderRadius.circular(radius - 2),
          boxShadow: AivoShadows.soft,
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        indicatorPadding: const EdgeInsets.all(4),
        dividerColor: Colors.transparent,
        splashBorderRadius: BorderRadius.circular(radius - 2),
        onTap: onTap,
        tabs: tabs.map((tab) => _buildTab(tab, theme)).toList(),
      ),
    );
  }

  Widget _buildTab(AivoTabItem tab, ThemeData theme) {
    Widget content = Text(tab.label);

    if (tab.icon != null) {
      content = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(tab.icon, size: 16),
          const SizedBox(width: 6),
          content,
        ],
      );
    }

    return Tab(
      height: 32,
      child: Opacity(
        opacity: tab.enabled ? 1.0 : 0.5,
        child: content,
      ),
    );
  }

  double _getRadius() {
    return switch (gradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusMd,
      AivoGradeBand.g6_8 => AivoBrand.radiusSm,
      AivoGradeBand.g9_12 => AivoBrand.radiusXs,
      null => AivoBrand.radiusSm,
    };
  }
}

/// Segmented control style tab bar.
class _SegmentedTabBar extends StatelessWidget {
  const _SegmentedTabBar({
    required this.tabs,
    required this.controller,
    this.gradeBand,
    this.padding,
    this.labelColor,
    this.unselectedLabelColor,
    this.indicatorColor,
    this.backgroundColor,
    this.onTap,
  });

  final List<AivoTabItem> tabs;
  final TabController controller;
  final AivoGradeBand? gradeBand;
  final EdgeInsetsGeometry? padding;
  final Color? labelColor;
  final Color? unselectedLabelColor;
  final Color? indicatorColor;
  final Color? backgroundColor;
  final ValueChanged<int>? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: padding ?? const EdgeInsets.symmetric(horizontal: 16),
      child: ListenableBuilder(
        listenable: controller,
        builder: (context, child) {
          return SegmentedButton<int>(
            segments: List.generate(tabs.length, (index) {
              final tab = tabs[index];
              return ButtonSegment(
                value: index,
                label: Text(tab.label),
                icon: tab.icon != null ? Icon(tab.icon) : null,
                enabled: tab.enabled,
              );
            }),
            selected: {controller.index},
            onSelectionChanged: (selection) {
              final index = selection.first;
              controller.animateTo(index);
              onTap?.call(index);
            },
            style: ButtonStyle(
              backgroundColor: WidgetStateProperty.resolveWith((states) {
                if (states.contains(WidgetState.selected)) {
                  return indicatorColor ?? colorScheme.primaryContainer;
                }
                return backgroundColor ?? colorScheme.surface;
              }),
              foregroundColor: WidgetStateProperty.resolveWith((states) {
                if (states.contains(WidgetState.selected)) {
                  return labelColor ?? colorScheme.onPrimaryContainer;
                }
                return unselectedLabelColor ?? colorScheme.onSurface;
              }),
            ),
          );
        },
      ),
    );
  }
}

/// Tab bar view with grade-band aware transitions.
class AivoTabBarView extends StatelessWidget {
  const AivoTabBarView({
    super.key,
    required this.controller,
    required this.children,
    this.gradeBand,
    this.physics,
  });

  /// Tab controller.
  final TabController controller;

  /// Tab content widgets.
  final List<Widget> children;

  /// Grade band for transition duration.
  final AivoGradeBand? gradeBand;

  /// Scroll physics.
  final ScrollPhysics? physics;

  @override
  Widget build(BuildContext context) {
    return TabBarView(
      controller: controller,
      physics: physics,
      children: children,
    );
  }
}

/// Scrollable tab bar with fade edges.
class AivoScrollableTabBar extends StatelessWidget {
  const AivoScrollableTabBar({
    super.key,
    required this.tabs,
    required this.controller,
    this.variant = AivoTabBarVariant.underline,
    this.gradeBand,
    this.padding,
    this.labelColor,
    this.unselectedLabelColor,
    this.indicatorColor,
    this.backgroundColor,
    this.onTap,
  });

  final List<AivoTabItem> tabs;
  final TabController controller;
  final AivoTabBarVariant variant;
  final AivoGradeBand? gradeBand;
  final EdgeInsetsGeometry? padding;
  final Color? labelColor;
  final Color? unselectedLabelColor;
  final Color? indicatorColor;
  final Color? backgroundColor;
  final ValueChanged<int>? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final bgColor = backgroundColor ?? colorScheme.surface;

    return Stack(
      children: [
        AivoTabBar(
          tabs: tabs,
          controller: controller,
          variant: variant,
          gradeBand: gradeBand,
          isScrollable: true,
          padding: padding,
          labelColor: labelColor,
          unselectedLabelColor: unselectedLabelColor,
          indicatorColor: indicatorColor,
          backgroundColor: backgroundColor,
          onTap: onTap,
        ),
        // Left fade
        Positioned(
          left: 0,
          top: 0,
          bottom: 0,
          child: IgnorePointer(
            child: Container(
              width: 24,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [bgColor, bgColor.withValues(alpha: 0)],
                ),
              ),
            ),
          ),
        ),
        // Right fade
        Positioned(
          right: 0,
          top: 0,
          bottom: 0,
          child: IgnorePointer(
            child: Container(
              width: 24,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [bgColor.withValues(alpha: 0), bgColor],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Chip-style filter tabs.
class AivoFilterChips extends StatelessWidget {
  const AivoFilterChips({
    super.key,
    required this.filters,
    required this.selected,
    required this.onSelected,
    this.gradeBand,
    this.multiSelect = false,
    this.scrollable = true,
  });

  /// Filter options.
  final List<String> filters;

  /// Selected filter indices.
  final Set<int> selected;

  /// Called when selection changes.
  final ValueChanged<Set<int>> onSelected;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Whether multiple filters can be selected.
  final bool multiSelect;

  /// Whether the chips are scrollable.
  final bool scrollable;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final chips = List.generate(filters.length, (index) {
      final isSelected = selected.contains(index);

      return Padding(
        padding: EdgeInsets.only(
          left: index == 0 ? 16 : 0,
          right: 8,
        ),
        child: FilterChip(
          label: Text(filters[index]),
          selected: isSelected,
          onSelected: (value) {
            final newSelection = Set<int>.from(selected);
            if (value) {
              if (multiSelect) {
                newSelection.add(index);
              } else {
                newSelection.clear();
                newSelection.add(index);
              }
            } else {
              newSelection.remove(index);
            }
            onSelected(newSelection);
          },
          backgroundColor: colorScheme.surface,
          selectedColor: colorScheme.primaryContainer,
          labelStyle: theme.textTheme.labelMedium?.copyWith(
            color:
                isSelected ? colorScheme.onPrimaryContainer : colorScheme.onSurface,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AivoBrand.radiusPill),
            side: BorderSide(
              color: isSelected
                  ? colorScheme.primary
                  : colorScheme.outlineVariant,
            ),
          ),
          showCheckmark: false,
          padding: const EdgeInsets.symmetric(horizontal: 4),
        ),
      );
    });

    if (scrollable) {
      return SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: chips),
      );
    }

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: chips,
    );
  }
}
