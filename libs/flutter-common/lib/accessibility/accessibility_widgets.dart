/// Accessibility Widgets
///
/// UI components for accessibility settings and controls.
/// Includes toggles, settings panels, and preview components.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'accessibility_controller.dart';
import '../theme/aivo_brand.dart';

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY TOGGLE TILE
// ══════════════════════════════════════════════════════════════════════════════

/// A settings tile for toggling an accessibility feature.
class AivoAccessibilityToggle extends StatelessWidget {
  const AivoAccessibilityToggle({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  /// Icon to display
  final IconData icon;

  /// Title of the setting
  final String title;

  /// Description of what the setting does
  final String description;

  /// Current value
  final bool value;

  /// Called when value changes
  final ValueChanged<bool> onChanged;

  /// Whether the toggle is enabled
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Semantics(
      toggled: value,
      enabled: enabled,
      label: '$title. $description',
      child: Card(
        elevation: 0,
        color: colorScheme.surfaceContainerLow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: colorScheme.outline.withOpacity(0.2),
          ),
        ),
        child: InkWell(
          onTap: enabled ? () => onChanged(!value) : null,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: value
                        ? colorScheme.primaryContainer
                        : colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    icon,
                    color: value
                        ? colorScheme.primary
                        : colorScheme.onSurfaceVariant,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
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
                      const SizedBox(height: 2),
                      Text(
                        description,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Switch(
                  value: value,
                  onChanged: enabled ? onChanged : null,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY QUICK TOGGLES
// ══════════════════════════════════════════════════════════════════════════════

/// Quick toggle button for accessibility features (compact chip style)
class AivoAccessibilityChip extends StatelessWidget {
  const AivoAccessibilityChip({
    super.key,
    required this.label,
    required this.icon,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final String label;
  final IconData icon;
  final bool value;
  final ValueChanged<bool> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Semantics(
      toggled: value,
      enabled: enabled,
      label: '$label ${value ? "enabled" : "disabled"}',
      child: FilterChip(
        avatar: Icon(
          icon,
          size: 18,
          color: value ? colorScheme.primary : colorScheme.onSurfaceVariant,
        ),
        label: Text(label),
        selected: value,
        onSelected: enabled ? onChanged : null,
        showCheckmark: false,
        selectedColor: colorScheme.primaryContainer,
      ),
    );
  }
}

/// Row of quick toggle chips for all accessibility features
class AivoAccessibilityQuickToggles extends ConsumerWidget {
  const AivoAccessibilityQuickToggles({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(accessibilityControllerProvider);
    final controller = ref.read(accessibilityControllerProvider.notifier);

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        AivoAccessibilityChip(
          label: 'High contrast',
          icon: Icons.contrast,
          value: state.highContrast,
          onChanged: (_) => controller.toggleHighContrast(),
        ),
        AivoAccessibilityChip(
          label: 'Dyslexia font',
          icon: Icons.text_fields,
          value: state.dyslexia,
          onChanged: (_) => controller.toggleDyslexia(),
        ),
        AivoAccessibilityChip(
          label: 'Reduced motion',
          icon: Icons.animation,
          value: state.reducedMotion,
          onChanged: (_) => controller.toggleReducedMotion(),
        ),
        AivoAccessibilityChip(
          label: 'Large text',
          icon: Icons.text_increase,
          value: state.largeText,
          onChanged: (_) => controller.toggleLargeText(),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TEXT SCALE SLIDER
// ══════════════════════════════════════════════════════════════════════════════

/// Slider for adjusting text scale factor
class AivoTextScaleSlider extends ConsumerWidget {
  const AivoTextScaleSlider({
    super.key,
    this.showLabel = true,
    this.showPreview = true,
  });

  final bool showLabel;
  final bool showPreview;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final state = ref.watch(accessibilityControllerProvider);
    final controller = ref.read(accessibilityControllerProvider.notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showLabel) ...[
          Row(
            children: [
              Icon(
                Icons.format_size,
                color: colorScheme.primary,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Text Size',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              Text(
                '${(state.effectiveTextScale * 100).round()}%',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],
        Semantics(
          slider: true,
          label: 'Text size: ${(state.effectiveTextScale * 100).round()} percent',
          child: Slider(
            value: state.textScale,
            min: kMinTextScale,
            max: kMaxTextScale,
            divisions: 12,
            label: '${(state.effectiveTextScale * 100).round()}%',
            onChanged: (value) => controller.setTextScale(value),
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Smaller',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            Text(
              'Larger',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        if (showPreview) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerLow,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: colorScheme.outline.withOpacity(0.2),
              ),
            ),
            child: Text(
              'This is sample text at ${(state.effectiveTextScale * 100).round()}% size.',
              style: theme.textTheme.bodyLarge?.copyWith(
                fontSize: 16 * state.effectiveTextScale,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FULL SETTINGS PANEL
// ══════════════════════════════════════════════════════════════════════════════

/// Complete accessibility settings panel with all options
class AivoAccessibilitySettingsPanel extends ConsumerWidget {
  const AivoAccessibilitySettingsPanel({
    super.key,
    this.showHeader = true,
    this.showReset = true,
    this.compact = false,
  });

  final bool showHeader;
  final bool showReset;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final state = ref.watch(accessibilityControllerProvider);
    final controller = ref.read(accessibilityControllerProvider.notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showHeader) ...[
          Row(
            children: [
              Icon(
                Icons.accessibility_new,
                color: colorScheme.primary,
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Accessibility',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Customize how the app looks and feels',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              if (showReset && state.hasAnyFeatureEnabled)
                TextButton(
                  onPressed: controller.reset,
                  child: const Text('Reset'),
                ),
            ],
          ),
          const SizedBox(height: 24),
        ],

        // Visual section
        _SectionHeader(
          title: 'Visual',
          icon: Icons.visibility,
          compact: compact,
        ),
        SizedBox(height: compact ? 8 : 12),

        AivoAccessibilityToggle(
          icon: Icons.contrast,
          title: 'High Contrast',
          description: 'Increase contrast and border visibility for better readability',
          value: state.highContrast,
          onChanged: controller.setHighContrast,
        ),
        SizedBox(height: compact ? 8 : 12),

        AivoAccessibilityToggle(
          icon: Icons.text_fields,
          title: 'Dyslexia-Friendly Font',
          description: 'Use Atkinson Hyperlegible font with increased spacing',
          value: state.dyslexia,
          onChanged: controller.setDyslexia,
        ),
        SizedBox(height: compact ? 16 : 24),

        // Text size section
        _SectionHeader(
          title: 'Text Size',
          icon: Icons.format_size,
          compact: compact,
        ),
        SizedBox(height: compact ? 8 : 12),

        AivoAccessibilityToggle(
          icon: Icons.text_increase,
          title: 'Large Text',
          description: 'Increase text size by 20% throughout the app',
          value: state.largeText,
          onChanged: controller.setLargeText,
        ),
        SizedBox(height: compact ? 12 : 16),

        Card(
          elevation: 0,
          color: colorScheme.surfaceContainerLow,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(
              color: colorScheme.outline.withOpacity(0.2),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: AivoTextScaleSlider(
              showLabel: true,
              showPreview: !compact,
            ),
          ),
        ),
        SizedBox(height: compact ? 16 : 24),

        // Motion section
        _SectionHeader(
          title: 'Motion',
          icon: Icons.animation,
          compact: compact,
        ),
        SizedBox(height: compact ? 8 : 12),

        AivoAccessibilityToggle(
          icon: Icons.animation,
          title: 'Reduce Motion',
          description: 'Minimize animations and transitions throughout the app',
          value: state.reducedMotion,
          onChanged: controller.setReducedMotion,
        ),

        if (!compact) ...[
          const SizedBox(height: 24),
          _SystemPreferencesInfo(),
        ],
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.icon,
    this.compact = false,
  });

  final String title;
  final IconData icon;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Semantics(
      header: true,
      child: Row(
        children: [
          Icon(
            icon,
            size: compact ? 16 : 20,
            color: colorScheme.primary,
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: (compact 
                ? theme.textTheme.titleSmall 
                : theme.textTheme.titleMedium)?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

class _SystemPreferencesInfo extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.primaryContainer.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: colorScheme.primary.withOpacity(0.2),
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.info_outline,
            color: colorScheme.primary,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'These settings work in addition to your device\'s accessibility settings.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onPrimaryContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY STATUS BADGE
// ══════════════════════════════════════════════════════════════════════════════

/// Badge showing current accessibility status (shows count of enabled features)
class AivoAccessibilityBadge extends ConsumerWidget {
  const AivoAccessibilityBadge({
    super.key,
    this.onTap,
    this.size = 24,
  });

  final VoidCallback? onTap;
  final double size;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(accessibilityControllerProvider);
    final colorScheme = Theme.of(context).colorScheme;

    final enabledCount = [
      state.highContrast,
      state.dyslexia,
      state.reducedMotion,
      state.largeText,
    ].where((v) => v).length;

    return Semantics(
      button: true,
      label: 'Accessibility. $enabledCount features enabled',
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Icon(
              Icons.accessibility_new,
              size: size,
              color: enabledCount > 0 
                  ? colorScheme.primary 
                  : colorScheme.onSurfaceVariant,
            ),
            if (enabledCount > 0)
              Positioned(
                right: -4,
                top: -4,
                child: Container(
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(
                    color: colorScheme.primary,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '$enabledCount',
                      style: TextStyle(
                        color: colorScheme.onPrimary,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

/// Wrapper widget that applies accessibility settings to its child.
/// 
/// Wraps child with MediaQuery to apply text scale and other settings.
class AivoAccessibilityWrapper extends ConsumerWidget {
  const AivoAccessibilityWrapper({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(accessibilityControllerProvider);

    return MediaQuery(
      data: MediaQuery.of(context).copyWith(
        textScaler: TextScaler.linear(state.effectiveTextScale),
        disableAnimations: state.reducedMotion,
        highContrast: state.highContrast,
        boldText: state.dyslexia, // Use bold text indicator for dyslexia
      ),
      child: child,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MOTION-SAFE WIDGETS
// ══════════════════════════════════════════════════════════════════════════════

/// Animated container that respects reduced motion preference
class AivoMotionSafeContainer extends ConsumerWidget {
  const AivoMotionSafeContainer({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 300),
    this.curve = Curves.easeInOut,
    this.alignment,
    this.padding,
    this.color,
    this.decoration,
    this.constraints,
    this.margin,
    this.transform,
    this.width,
    this.height,
  });

  final Widget child;
  final Duration duration;
  final Curve curve;
  final AlignmentGeometry? alignment;
  final EdgeInsetsGeometry? padding;
  final Color? color;
  final Decoration? decoration;
  final BoxConstraints? constraints;
  final EdgeInsetsGeometry? margin;
  final Matrix4? transform;
  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reducedMotion = ref.watch(reducedMotionProvider);

    final effectiveDuration = reducedMotion ? Duration.zero : duration;
    final effectiveCurve = reducedMotion ? Curves.linear : curve;

    return AnimatedContainer(
      duration: effectiveDuration,
      curve: effectiveCurve,
      alignment: alignment,
      padding: padding,
      color: color,
      decoration: decoration,
      constraints: constraints,
      margin: margin,
      transform: transform,
      width: width,
      height: height,
      child: child,
    );
  }
}

/// Opacity animation that respects reduced motion
class AivoMotionSafeFade extends ConsumerWidget {
  const AivoMotionSafeFade({
    super.key,
    required this.child,
    required this.visible,
    this.duration = const Duration(milliseconds: 200),
    this.curve = Curves.easeInOut,
  });

  final Widget child;
  final bool visible;
  final Duration duration;
  final Curve curve;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reducedMotion = ref.watch(reducedMotionProvider);

    final effectiveDuration = reducedMotion ? Duration.zero : duration;
    final effectiveCurve = reducedMotion ? Curves.linear : curve;

    return AnimatedOpacity(
      opacity: visible ? 1.0 : 0.0,
      duration: effectiveDuration,
      curve: effectiveCurve,
      child: child,
    );
  }
}

/// Scale animation that respects reduced motion
class AivoMotionSafeScale extends ConsumerWidget {
  const AivoMotionSafeScale({
    super.key,
    required this.child,
    required this.scale,
    this.duration = const Duration(milliseconds: 200),
    this.curve = Curves.easeInOut,
    this.alignment = Alignment.center,
  });

  final Widget child;
  final double scale;
  final Duration duration;
  final Curve curve;
  final Alignment alignment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reducedMotion = ref.watch(reducedMotionProvider);

    if (reducedMotion) {
      return Transform.scale(
        scale: scale,
        alignment: alignment,
        child: child,
      );
    }

    return AnimatedScale(
      scale: scale,
      duration: duration,
      curve: curve,
      alignment: alignment,
      child: child,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HIGH CONTRAST BORDER
// ══════════════════════════════════════════════════════════════════════════════

/// Border that respects high contrast preference
class AivoHighContrastBorder extends ConsumerWidget {
  const AivoHighContrastBorder({
    super.key,
    required this.child,
    this.normalWidth = 1.0,
    this.color,
    this.radius = 8.0,
  });

  final Widget child;
  final double normalWidth;
  final Color? color;
  final double radius;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final highContrast = ref.watch(highContrastProvider);
    final colorScheme = Theme.of(context).colorScheme;

    final effectiveWidth = highContrast 
        ? normalWidth * kHighContrastBorderMultiplier 
        : normalWidth;
    final effectiveColor = color ?? colorScheme.outline;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: effectiveColor,
          width: effectiveWidth,
        ),
      ),
      child: child,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DYSLEXIA-FRIENDLY TEXT
// ══════════════════════════════════════════════════════════════════════════════

/// Text widget that applies dyslexia-friendly styling when enabled
class AivoDyslexiaText extends ConsumerWidget {
  const AivoDyslexiaText(
    this.text, {
    super.key,
    this.style,
    this.textAlign,
    this.maxLines,
    this.overflow,
  });

  final String text;
  final TextStyle? style;
  final TextAlign? textAlign;
  final int? maxLines;
  final TextOverflow? overflow;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(accessibilityControllerProvider);
    final baseStyle = style ?? Theme.of(context).textTheme.bodyMedium;
    final fontSize = baseStyle?.fontSize ?? 14;

    TextStyle? effectiveStyle = baseStyle;

    if (state.dyslexia) {
      effectiveStyle = baseStyle?.copyWith(
        fontFamily: AivoBrand.fontFamilyDyslexia,
        letterSpacing: state.letterSpacingFor(fontSize),
        wordSpacing: state.wordSpacingFor(fontSize),
        height: (baseStyle.height ?? 1.5) * state.lineHeightMultiplier,
      );
    }

    return Text(
      text,
      style: effectiveStyle,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
    );
  }
}
