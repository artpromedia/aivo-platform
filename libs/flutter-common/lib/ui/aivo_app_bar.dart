/// Aivo AppBar Widget
///
/// Consistent top navigation bar styling across apps with grade-band awareness.
/// Aligned with web header component styling.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_theme.dart';

/// AppBar variant styles
enum AivoAppBarVariant {
  /// Standard surface background with border
  standard,

  /// Primary color background
  primary,

  /// Transparent background
  transparent,

  /// Elevated with shadow
  elevated,
}

/// Aivo-styled AppBar matching web header component.
///
/// Web reference: apps/web-teacher/src/components/layout/header.tsx
/// - Height: 64px (h-16)
/// - Padding: 24px horizontal (px-6)
/// - Border: 1px bottom border
/// - Background: surface color
class AivoAppBar extends StatelessWidget implements PreferredSizeWidget {
  const AivoAppBar({
    super.key,
    this.title,
    this.titleWidget,
    this.leading,
    this.automaticallyImplyLeading = true,
    this.actions,
    this.variant = AivoAppBarVariant.standard,
    this.gradeBand,
    this.centerTitle,
    this.elevation,
    this.backgroundColor,
    this.foregroundColor,
    this.bottom,
    this.toolbarHeight,
    this.systemOverlayStyle,
  });

  /// The primary title text displayed in the app bar.
  final String? title;

  /// Custom widget for the title (overrides [title]).
  final Widget? titleWidget;

  /// Widget to display before the title.
  /// If null and [automaticallyImplyLeading] is true, shows back button if applicable.
  final Widget? leading;

  /// Whether to automatically show a back button when applicable.
  final bool automaticallyImplyLeading;

  /// Action buttons displayed after the title.
  final List<Widget>? actions;

  /// Visual variant of the app bar.
  final AivoAppBarVariant variant;

  /// Grade band for styling adjustments.
  final AivoGradeBand? gradeBand;

  /// Whether to center the title.
  final bool? centerTitle;

  /// Elevation of the app bar.
  final double? elevation;

  /// Background color override.
  final Color? backgroundColor;

  /// Foreground (text/icon) color override.
  final Color? foregroundColor;

  /// Widget to display below the app bar (e.g., TabBar).
  final PreferredSizeWidget? bottom;

  /// Height of the toolbar (excluding bottom).
  final double? toolbarHeight;

  /// System UI overlay style.
  final SystemUiOverlayStyle? systemOverlayStyle;

  @override
  Size get preferredSize {
    final bottomHeight = bottom?.preferredSize.height ?? 0.0;
    // Web header uses h-16 = 64px
    return Size.fromHeight((toolbarHeight ?? 64.0) + bottomHeight);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    // Determine colors based on variant
    final (bgColor, fgColor, shadow, border) = _getVariantColors(colorScheme);

    // Get actual colors (allowing overrides)
    final effectiveBgColor = backgroundColor ?? bgColor;
    final effectiveFgColor = foregroundColor ?? fgColor;

    // Build title widget
    Widget? titleContent;
    if (titleWidget != null) {
      titleContent = titleWidget;
    } else if (title != null) {
      // Web uses text-xl font-semibold (20px, 600 weight)
      titleContent = Text(
        title!,
        style: theme.textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w600,
          color: effectiveFgColor,
        ),
      );
    }

    // Build leading widget
    Widget? leadingWidget = leading;
    if (leadingWidget == null && automaticallyImplyLeading) {
      final route = ModalRoute.of(context);
      if (route?.canPop ?? false) {
        leadingWidget = AivoBackButton(
          color: effectiveFgColor,
          gradeBand: gradeBand,
        );
      } else if (Scaffold.of(context).hasDrawer) {
        leadingWidget = IconButton(
          icon: Icon(Icons.menu, color: effectiveFgColor),
          onPressed: () => Scaffold.of(context).openDrawer(),
          tooltip: MaterialLocalizations.of(context).openAppDrawerTooltip,
        );
      }
    }

    // Build actions with proper spacing
    final List<Widget>? actionWidgets = actions != null
        ? actions!
            .map((action) => Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: action,
                ))
            .toList()
        : null;

    return AppBar(
      leading: leadingWidget,
      automaticallyImplyLeading: false,
      title: titleContent,
      centerTitle: centerTitle ?? false,
      actions: actionWidgets,
      backgroundColor: effectiveBgColor,
      foregroundColor: effectiveFgColor,
      elevation: elevation ?? (shadow != null ? 0 : null),
      shadowColor: shadow,
      surfaceTintColor: Colors.transparent,
      toolbarHeight: toolbarHeight ?? 64.0,
      bottom: bottom,
      shape: border != null
          ? Border(bottom: BorderSide(color: border, width: 1))
          : null,
      systemOverlayStyle: systemOverlayStyle ??
          (variant == AivoAppBarVariant.primary
              ? SystemUiOverlayStyle.light
              : SystemUiOverlayStyle.dark),
    );
  }

  /// Get colors for variant.
  (Color bg, Color fg, Color? shadow, Color? border) _getVariantColors(
    ColorScheme colorScheme,
  ) {
    return switch (variant) {
      AivoAppBarVariant.standard => (
          colorScheme.surface,
          colorScheme.onSurface,
          null,
          colorScheme.outlineVariant,
        ),
      AivoAppBarVariant.primary => (
          colorScheme.primary,
          colorScheme.onPrimary,
          null,
          null,
        ),
      AivoAppBarVariant.transparent => (
          Colors.transparent,
          colorScheme.onSurface,
          null,
          null,
        ),
      AivoAppBarVariant.elevated => (
          colorScheme.surface,
          colorScheme.onSurface,
          colorScheme.shadow.withValues(alpha: 0.08),
          null,
        ),
    };
  }
}

/// Back button styled for Aivo.
///
/// Uses grade-band aware touch targets.
class AivoBackButton extends StatelessWidget {
  const AivoBackButton({
    super.key,
    this.color,
    this.onPressed,
    this.gradeBand,
  });

  /// Icon color.
  final Color? color;

  /// Custom back action. If null, uses Navigator.maybePop.
  final VoidCallback? onPressed;

  /// Grade band for touch target sizing.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveColor = color ?? theme.colorScheme.onSurface;

    // Get touch target for grade band
    final touchTarget = _getTouchTarget();

    return IconButton(
      icon: Icon(
        Icons.arrow_back,
        color: effectiveColor,
      ),
      iconSize: 24,
      constraints: BoxConstraints(
        minWidth: touchTarget,
        minHeight: touchTarget,
      ),
      onPressed: onPressed ?? () => Navigator.maybePop(context),
      tooltip: MaterialLocalizations.of(context).backButtonTooltip,
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

/// AppBar action button with consistent styling.
class AivoAppBarAction extends StatelessWidget {
  const AivoAppBarAction({
    super.key,
    required this.icon,
    required this.onPressed,
    this.tooltip,
    this.badge,
    this.color,
    this.gradeBand,
  });

  /// Icon to display.
  final IconData icon;

  /// Callback when pressed.
  final VoidCallback? onPressed;

  /// Tooltip text.
  final String? tooltip;

  /// Badge count or text.
  final String? badge;

  /// Icon color override.
  final Color? color;

  /// Grade band for touch target sizing.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveColor = color ?? theme.appBarTheme.foregroundColor ?? theme.colorScheme.onSurface;

    // Get touch target for grade band
    final touchTarget = _getTouchTarget();

    Widget iconButton = IconButton(
      icon: Icon(icon, color: effectiveColor),
      iconSize: 24,
      constraints: BoxConstraints(
        minWidth: touchTarget,
        minHeight: touchTarget,
      ),
      onPressed: onPressed,
      tooltip: tooltip,
    );

    // Add badge if provided
    if (badge != null) {
      iconButton = Stack(
        clipBehavior: Clip.none,
        children: [
          iconButton,
          Positioned(
            right: 4,
            top: 4,
            child: _Badge(badge: badge!),
          ),
        ],
      );
    }

    return iconButton;
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

/// Badge widget for notification counts.
class _Badge extends StatelessWidget {
  const _Badge({required this.badge});

  final String badge;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      constraints: const BoxConstraints(minWidth: 20),
      decoration: BoxDecoration(
        color: theme.colorScheme.error,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        badge,
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.onError,
          fontWeight: FontWeight.w600,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }
}

/// Large title app bar for scrollable content.
///
/// Similar to iOS large title style, with collapsing behavior.
class AivoSliverAppBar extends StatelessWidget {
  const AivoSliverAppBar({
    super.key,
    required this.title,
    this.subtitle,
    this.actions,
    this.leading,
    this.automaticallyImplyLeading = true,
    this.variant = AivoAppBarVariant.standard,
    this.gradeBand,
    this.floating = false,
    this.pinned = true,
    this.snap = false,
    this.expandedHeight,
    this.collapsedHeight,
    this.flexibleSpace,
  });

  /// The primary title text.
  final String title;

  /// Optional subtitle text.
  final String? subtitle;

  /// Action buttons.
  final List<Widget>? actions;

  /// Leading widget.
  final Widget? leading;

  /// Whether to show back button automatically.
  final bool automaticallyImplyLeading;

  /// Visual variant.
  final AivoAppBarVariant variant;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Whether the app bar floats when scrolling.
  final bool floating;

  /// Whether the app bar remains visible at the top.
  final bool pinned;

  /// Whether to snap to full or collapsed state.
  final bool snap;

  /// Height when expanded.
  final double? expandedHeight;

  /// Height when collapsed.
  final double? collapsedHeight;

  /// Custom flexible space widget.
  final Widget? flexibleSpace;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    // Get colors based on variant
    final (bgColor, fgColor) = _getColors(colorScheme);

    // Build leading widget
    Widget? leadingWidget = leading;
    if (leadingWidget == null && automaticallyImplyLeading) {
      final route = ModalRoute.of(context);
      if (route?.canPop ?? false) {
        leadingWidget = AivoBackButton(
          color: fgColor,
          gradeBand: gradeBand,
        );
      }
    }

    return SliverAppBar(
      leading: leadingWidget,
      automaticallyImplyLeading: false,
      actions: actions,
      backgroundColor: bgColor,
      foregroundColor: fgColor,
      floating: floating,
      pinned: pinned,
      snap: snap,
      expandedHeight: expandedHeight ?? 120,
      collapsedHeight: collapsedHeight ?? 64,
      surfaceTintColor: Colors.transparent,
      flexibleSpace: flexibleSpace ??
          FlexibleSpaceBar(
            title: Text(
              title,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
                color: fgColor,
              ),
            ),
            titlePadding: const EdgeInsetsDirectional.only(
              start: 16,
              bottom: 16,
            ),
            centerTitle: false,
          ),
    );
  }

  (Color bg, Color fg) _getColors(ColorScheme colorScheme) {
    return switch (variant) {
      AivoAppBarVariant.standard => (
          colorScheme.surface,
          colorScheme.onSurface,
        ),
      AivoAppBarVariant.primary => (
          colorScheme.primary,
          colorScheme.onPrimary,
        ),
      AivoAppBarVariant.transparent => (
          Colors.transparent,
          colorScheme.onSurface,
        ),
      AivoAppBarVariant.elevated => (
          colorScheme.surface,
          colorScheme.onSurface,
        ),
    };
  }
}

/// Search app bar for search screens.
class AivoSearchAppBar extends StatefulWidget implements PreferredSizeWidget {
  const AivoSearchAppBar({
    super.key,
    this.hint = 'Search...',
    this.onSearch,
    this.onChanged,
    this.controller,
    this.autofocus = true,
    this.gradeBand,
  });

  /// Placeholder text.
  final String hint;

  /// Called when search is submitted.
  final ValueChanged<String>? onSearch;

  /// Called when text changes.
  final ValueChanged<String>? onChanged;

  /// Text controller.
  final TextEditingController? controller;

  /// Whether to auto-focus the search field.
  final bool autofocus;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  @override
  Size get preferredSize => const Size.fromHeight(64);

  @override
  State<AivoSearchAppBar> createState() => _AivoSearchAppBarState();
}

class _AivoSearchAppBarState extends State<AivoSearchAppBar> {
  late TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? TextEditingController();
  }

  @override
  void dispose() {
    if (widget.controller == null) {
      _controller.dispose();
    }
    super.dispose();
  }

  void _handleClear() {
    _controller.clear();
    widget.onChanged?.call('');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    // Get input radius for grade band
    final inputRadius = _getInputRadius();

    return AppBar(
      backgroundColor: colorScheme.surface,
      foregroundColor: colorScheme.onSurface,
      elevation: 0,
      toolbarHeight: 64,
      surfaceTintColor: Colors.transparent,
      shape: Border(
        bottom: BorderSide(
          color: colorScheme.outlineVariant,
          width: 1,
        ),
      ),
      leading: AivoBackButton(
        gradeBand: widget.gradeBand,
      ),
      title: TextField(
        controller: _controller,
        autofocus: widget.autofocus,
        onChanged: widget.onChanged,
        onSubmitted: widget.onSearch,
        textInputAction: TextInputAction.search,
        style: theme.textTheme.bodyLarge,
        decoration: InputDecoration(
          hintText: widget.hint,
          hintStyle: theme.textTheme.bodyLarge?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
          prefixIcon: Icon(
            Icons.search,
            color: colorScheme.onSurfaceVariant,
          ),
          suffixIcon: ValueListenableBuilder<TextEditingValue>(
            valueListenable: _controller,
            builder: (context, value, child) {
              if (value.text.isEmpty) return const SizedBox.shrink();
              return IconButton(
                icon: Icon(
                  Icons.close,
                  color: colorScheme.onSurfaceVariant,
                ),
                onPressed: _handleClear,
              );
            },
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(inputRadius),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: colorScheme.surfaceContainerHighest,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 12,
          ),
        ),
      ),
    );
  }

  double _getInputRadius() {
    return switch (widget.gradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusExplorerInput,
      AivoGradeBand.g6_8 => AivoBrand.radiusNavigatorInput,
      AivoGradeBand.g9_12 => AivoBrand.radiusScholarInput,
      null => AivoBrand.radiusNavigatorInput,
    };
  }
}
