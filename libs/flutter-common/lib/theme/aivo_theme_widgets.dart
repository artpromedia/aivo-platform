/// AIVO Theme Widgets
///
/// Widgets for theme switching, dark mode toggle, and smooth theme transitions.
/// Matches web GradeThemeProvider behavior.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'aivo_motion.dart';
import 'aivo_theme.dart';
import 'grade_theme_controller.dart';

// ══════════════════════════════════════════════════════════════════════════════
// THEME TRANSITION WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

/// Wrapper that provides smooth animated transitions between themes.
///
/// Uses [AnimatedTheme] internally with grade-band aware duration.
/// Prevents flash of incorrect theme on load by using initial theme.
///
/// Example:
/// ```dart
/// AivoThemeTransition(
///   child: MaterialApp(
///     theme: ref.watch(gradeThemeProvider),
///     home: MyHomePage(),
///   ),
/// )
/// ```
class AivoThemeTransition extends ConsumerWidget {
  const AivoThemeTransition({
    super.key,
    required this.child,
    this.duration,
    this.curve,
  });

  /// The child widget to wrap
  final Widget child;

  /// Optional duration override (defaults to grade-band aware duration)
  final Duration? duration;

  /// Optional curve override (defaults to emphasized)
  final Curve? curve;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeState = ref.watch(gradeThemeControllerProvider);
    final theme = themeState.theme;

    // Get grade-band appropriate animation duration
    final effectiveDuration =
        duration ?? AivoDurationConfig.forGradeBand(themeState.gradeBand).slow;

    return AnimatedTheme(
      data: theme,
      duration: effectiveDuration,
      curve: curve ?? AivoCurves.emphasized,
      child: child,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DARK MODE TOGGLE
// ══════════════════════════════════════════════════════════════════════════════

/// A toggle widget for dark mode.
///
/// Only visible/enabled when the current grade band supports dark mode (Scholar only).
/// When disabled, shows a tooltip explaining why dark mode is unavailable.
///
/// Example:
/// ```dart
/// AivoDarkModeToggle(
///   showLabel: true,
/// )
/// ```
class AivoDarkModeToggle extends ConsumerWidget {
  const AivoDarkModeToggle({
    super.key,
    this.showLabel = true,
    this.showWhenDisabled = false,
    this.iconSize = 24,
  });

  /// Whether to show the "Dark mode" label
  final bool showLabel;

  /// Whether to show the toggle even when dark mode is not available
  final bool showWhenDisabled;

  /// Icon size for the toggle
  final double iconSize;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeState = ref.watch(gradeThemeControllerProvider);
    final controller = ref.read(gradeThemeControllerProvider.notifier);

    final canToggle = themeState.canToggleDarkMode;
    final isDark = themeState.effectiveIsDark;

    // Hide completely if not Scholar and showWhenDisabled is false
    if (!canToggle && !showWhenDisabled) {
      return const SizedBox.shrink();
    }

    final toggle = Switch.adaptive(
      value: isDark,
      onChanged: canToggle ? (_) => controller.toggleDarkMode() : null,
    );

    Widget result;
    if (showLabel) {
      result = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isDark ? Icons.dark_mode : Icons.light_mode,
            size: iconSize,
            color: canToggle
                ? Theme.of(context).colorScheme.onSurface
                : Theme.of(context).colorScheme.onSurface.withOpacity(0.38),
          ),
          const SizedBox(width: 8),
          Text(
            'Dark mode',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: canToggle
                      ? null
                      : Theme.of(context).colorScheme.onSurface.withOpacity(0.38),
                ),
          ),
          const SizedBox(width: 8),
          toggle,
        ],
      );
    } else {
      result = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isDark ? Icons.dark_mode : Icons.light_mode,
            size: iconSize,
            color: canToggle
                ? Theme.of(context).colorScheme.onSurface
                : Theme.of(context).colorScheme.onSurface.withOpacity(0.38),
          ),
          toggle,
        ],
      );
    }

    // Wrap in tooltip if disabled
    if (!canToggle) {
      return Tooltip(
        message: 'Dark mode is only available for Scholar (9-12) theme',
        child: result,
      );
    }

    return result;
  }
}

/// An icon button for toggling dark mode.
///
/// Only visible/enabled when the current grade band supports dark mode (Scholar only).
class AivoDarkModeIconButton extends ConsumerWidget {
  const AivoDarkModeIconButton({
    super.key,
    this.showWhenDisabled = false,
    this.iconSize = 24,
  });

  /// Whether to show the button even when dark mode is not available
  final bool showWhenDisabled;

  /// Icon size
  final double iconSize;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeState = ref.watch(gradeThemeControllerProvider);
    final controller = ref.read(gradeThemeControllerProvider.notifier);

    final canToggle = themeState.canToggleDarkMode;
    final isDark = themeState.effectiveIsDark;

    // Hide completely if not Scholar and showWhenDisabled is false
    if (!canToggle && !showWhenDisabled) {
      return const SizedBox.shrink();
    }

    return IconButton(
      icon: Icon(
        isDark ? Icons.dark_mode : Icons.light_mode,
        size: iconSize,
      ),
      onPressed: canToggle ? () => controller.toggleDarkMode() : null,
      tooltip: canToggle
          ? (isDark ? 'Switch to light mode' : 'Switch to dark mode')
          : 'Dark mode is only available for Scholar (9-12) theme',
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// THEME SELECTOR
// ══════════════════════════════════════════════════════════════════════════════

/// A dropdown for selecting the grade band theme.
///
/// Example:
/// ```dart
/// AivoThemeSelector(
///   includeLabels: true,
/// )
/// ```
class AivoThemeSelector extends ConsumerWidget {
  const AivoThemeSelector({
    super.key,
    this.includeLabels = true,
  });

  /// Whether to include grade range labels (e.g., "K-5")
  final bool includeLabels;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeState = ref.watch(gradeThemeControllerProvider);
    final controller = ref.read(gradeThemeControllerProvider.notifier);

    return DropdownButton<AivoGradeBand>(
      value: themeState.gradeBand,
      onChanged: (band) {
        if (band != null) {
          controller.setGradeBand(band);
        }
      },
      items: AivoGradeBand.values.map((band) {
        final label = includeLabels
            ? _getBandLabelWithRange(band)
            : themeLabelForBand(band);
        return DropdownMenuItem(
          value: band,
          child: Text(label),
        );
      }).toList(),
    );
  }

  String _getBandLabelWithRange(AivoGradeBand band) {
    switch (band) {
      case AivoGradeBand.k5:
        return 'Explorer (K-5)';
      case AivoGradeBand.g6_8:
        return 'Navigator (6-8)';
      case AivoGradeBand.g9_12:
        return 'Scholar (9-12)';
    }
  }
}

/// A segmented button for selecting the grade band theme.
class AivoThemeSegmentedButton extends ConsumerWidget {
  const AivoThemeSegmentedButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeState = ref.watch(gradeThemeControllerProvider);
    final controller = ref.read(gradeThemeControllerProvider.notifier);

    return SegmentedButton<AivoGradeBand>(
      segments: const [
        ButtonSegment(
          value: AivoGradeBand.k5,
          label: Text('Explorer'),
          icon: Icon(Icons.child_care),
        ),
        ButtonSegment(
          value: AivoGradeBand.g6_8,
          label: Text('Navigator'),
          icon: Icon(Icons.explore),
        ),
        ButtonSegment(
          value: AivoGradeBand.g9_12,
          label: Text('Scholar'),
          icon: Icon(Icons.school),
        ),
      ],
      selected: {themeState.gradeBand},
      onSelectionChanged: (selection) {
        if (selection.isNotEmpty) {
          controller.setGradeBand(selection.first);
        }
      },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// THEME PREVIEW CARD
// ══════════════════════════════════════════════════════════════════════════════

/// A card that shows a preview of a theme.
class AivoThemePreviewCard extends StatelessWidget {
  const AivoThemePreviewCard({
    super.key,
    required this.gradeBand,
    required this.isDark,
    this.isSelected = false,
    this.onTap,
  });

  final AivoGradeBand gradeBand;
  final bool isDark;
  final bool isSelected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = isDark ? darkThemeForBand(gradeBand) : themeForBand(gradeBand);
    final label = themeLabelForBand(gradeBand);

    return Theme(
      data: theme,
      child: Builder(
        builder: (context) {
          return Card(
            elevation: isSelected ? 4 : 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: isSelected
                  ? BorderSide(
                      color: Theme.of(context).colorScheme.primary,
                      width: 2,
                    )
                  : BorderSide.none,
            ),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: onTap,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: theme.scaffoldBackgroundColor,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: theme.colorScheme.primary,
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: theme.colorScheme.secondary,
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: theme.colorScheme.tertiary,
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      isDark ? '$label Dark' : label,
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _getGradeRange(gradeBand),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    if (isSelected) ...[
                      const SizedBox(height: 8),
                      Icon(
                        Icons.check_circle,
                        color: theme.colorScheme.primary,
                        size: 20,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  String _getGradeRange(AivoGradeBand band) {
    switch (band) {
      case AivoGradeBand.k5:
        return 'Pre-K through 5th Grade';
      case AivoGradeBand.g6_8:
        return '6th through 8th Grade';
      case AivoGradeBand.g9_12:
        return '9th through 12th Grade';
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ADAPTIVE BRIGHTNESS BUILDER
// ══════════════════════════════════════════════════════════════════════════════

/// Builder that provides different widgets based on current theme brightness.
///
/// Useful for swapping assets or widgets between light and dark modes.
///
/// Example:
/// ```dart
/// AivoBrightnessBuilder(
///   light: (context) => Image.asset('assets/logo-dark.png'),
///   dark: (context) => Image.asset('assets/logo-light.png'),
/// )
/// ```
class AivoBrightnessBuilder extends StatelessWidget {
  const AivoBrightnessBuilder({
    super.key,
    required this.light,
    required this.dark,
  });

  /// Widget builder for light mode
  final WidgetBuilder light;

  /// Widget builder for dark mode
  final WidgetBuilder dark;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    return brightness == Brightness.dark ? dark(context) : light(context);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM THEME LISTENER
// ══════════════════════════════════════════════════════════════════════════════

/// Widget that listens to system brightness changes and updates theme accordingly.
///
/// Wrap your app with this to automatically respond to system dark mode changes.
///
/// Example:
/// ```dart
/// AivoSystemThemeListener(
///   child: MaterialApp(...),
/// )
/// ```
class AivoSystemThemeListener extends ConsumerStatefulWidget {
  const AivoSystemThemeListener({
    super.key,
    required this.child,
    this.enabled = true,
  });

  /// The child widget
  final Widget child;

  /// Whether to listen for system changes
  final bool enabled;

  @override
  ConsumerState<AivoSystemThemeListener> createState() =>
      _AivoSystemThemeListenerState();
}

class _AivoSystemThemeListenerState
    extends ConsumerState<AivoSystemThemeListener>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    if (widget.enabled) {
      WidgetsBinding.instance.addObserver(this);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangePlatformBrightness() {
    super.didChangePlatformBrightness();

    if (!widget.enabled) return;

    final controller = ref.read(gradeThemeControllerProvider.notifier);
    final state = ref.read(gradeThemeControllerProvider);

    // Only auto-switch if Scholar theme is active
    if (state.canToggleDarkMode) {
      final systemDark = WidgetsBinding.instance.platformDispatcher.platformBrightness ==
          Brightness.dark;
      controller.setDarkMode(systemDark);
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
