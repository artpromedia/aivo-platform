/// Aivo Illustration System
///
/// SVG-based illustrations for empty states, onboarding, and feature highlights.
/// Uses flutter_svg for rendering and provides grade-band aware sizing.
library;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'aivo_brand.dart';
import 'aivo_theme.dart';

// ══════════════════════════════════════════════════════════════════════════════
// ILLUSTRATION SIZES
// ══════════════════════════════════════════════════════════════════════════════

/// Standard illustration sizes.
abstract final class AivoIllustrationSize {
  /// Small illustration (80px) - inline indicators
  static const double sm = 80;

  /// Medium illustration (120px) - card illustrations
  static const double md = 120;

  /// Large illustration (180px) - empty states
  static const double lg = 180;

  /// Extra large illustration (240px) - onboarding
  static const double xl = 240;

  /// Hero illustration (320px) - full page features
  static const double hero = 320;

  /// Get size adjusted for grade band.
  static double forGradeBand(AivoGradeBand gradeBand, {double baseSize = md}) {
    return switch (gradeBand) {
      AivoGradeBand.k5 => baseSize * 1.2, // 20% larger for younger
      AivoGradeBand.g6_8 => baseSize * 1.1, // 10% larger
      AivoGradeBand.g9_12 => baseSize, // Standard
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ILLUSTRATION WIDGET
// ══════════════════════════════════════════════════════════════════════════════

/// SVG illustration widget with proper sizing and theming.
class AivoIllustration extends StatelessWidget {
  const AivoIllustration({
    super.key,
    required this.assetPath,
    this.size,
    this.width,
    this.height,
    this.gradeBand,
    this.fit = BoxFit.contain,
    this.alignment = Alignment.center,
    this.colorFilter,
    this.semanticLabel,
    this.placeholderBuilder,
  });

  /// Asset path to SVG file.
  final String assetPath;

  /// Square size (overrides width/height).
  final double? size;

  /// Custom width.
  final double? width;

  /// Custom height.
  final double? height;

  /// Grade band for size adjustment.
  final AivoGradeBand? gradeBand;

  /// How to fit the illustration.
  final BoxFit fit;

  /// Alignment within bounds.
  final Alignment alignment;

  /// Color filter to apply.
  final ColorFilter? colorFilter;

  /// Semantic label for accessibility.
  final String? semanticLabel;

  /// Builder for placeholder while loading.
  final WidgetBuilder? placeholderBuilder;

  @override
  Widget build(BuildContext context) {
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);
    final baseSize = size ?? AivoIllustrationSize.md;
    final effectiveSize = AivoIllustrationSize.forGradeBand(
      effectiveGradeBand,
      baseSize: baseSize,
    );

    return SvgPicture.asset(
      assetPath,
      width: width ?? effectiveSize,
      height: height ?? (size != null ? effectiveSize : null),
      fit: fit,
      alignment: alignment,
      colorFilter: colorFilter,
      semanticsLabel: semanticLabel,
      placeholderBuilder: placeholderBuilder,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ILLUSTRATION FROM STRING (FOR INLINE SVG)
// ══════════════════════════════════════════════════════════════════════════════

/// SVG illustration from string content.
class AivoIllustrationString extends StatelessWidget {
  const AivoIllustrationString({
    super.key,
    required this.svgString,
    this.size,
    this.width,
    this.height,
    this.gradeBand,
    this.fit = BoxFit.contain,
    this.colorFilter,
    this.semanticLabel,
  });

  /// SVG content as string.
  final String svgString;

  /// Square size.
  final double? size;

  /// Custom width.
  final double? width;

  /// Custom height.
  final double? height;

  /// Grade band for size adjustment.
  final AivoGradeBand? gradeBand;

  /// How to fit.
  final BoxFit fit;

  /// Color filter.
  final ColorFilter? colorFilter;

  /// Semantic label.
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);
    final baseSize = size ?? AivoIllustrationSize.md;
    final effectiveSize = AivoIllustrationSize.forGradeBand(
      effectiveGradeBand,
      baseSize: baseSize,
    );

    return SvgPicture.string(
      svgString,
      width: width ?? effectiveSize,
      height: height ?? (size != null ? effectiveSize : null),
      fit: fit,
      colorFilter: colorFilter,
      semanticsLabel: semanticLabel,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ICON-BASED ILLUSTRATIONS (FOR WHEN SVG NOT AVAILABLE)
// ══════════════════════════════════════════════════════════════════════════════

/// Icon-based illustration for empty states when SVG not available.
///
/// Creates a composed illustration using icons with decorative elements.
class AivoIconIllustration extends StatelessWidget {
  const AivoIconIllustration({
    super.key,
    required this.icon,
    this.size = AivoIllustrationSize.md,
    this.gradeBand,
    this.primaryColor,
    this.backgroundColor,
    this.decorations = true,
  });

  /// Main icon.
  final IconData icon;

  /// Overall size.
  final double size;

  /// Grade band.
  final AivoGradeBand? gradeBand;

  /// Primary icon color.
  final Color? primaryColor;

  /// Background circle color.
  final Color? backgroundColor;

  /// Whether to show decorative elements.
  final bool decorations;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);
    final effectiveSize = AivoIllustrationSize.forGradeBand(
      effectiveGradeBand,
      baseSize: size,
    );

    final primary = primaryColor ?? theme.colorScheme.primary;
    final background =
        backgroundColor ?? theme.colorScheme.primaryContainer.withValues(alpha: 0.3);

    final iconSize = effectiveSize * 0.4;

    return SizedBox(
      width: effectiveSize,
      height: effectiveSize,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background decorations
          if (decorations) ...[
            Positioned(
              top: effectiveSize * 0.1,
              right: effectiveSize * 0.15,
              child: _Dot(
                size: effectiveSize * 0.08,
                color: primary.withValues(alpha: 0.3),
              ),
            ),
            Positioned(
              bottom: effectiveSize * 0.15,
              left: effectiveSize * 0.1,
              child: _Dot(
                size: effectiveSize * 0.06,
                color: primary.withValues(alpha: 0.2),
              ),
            ),
            Positioned(
              top: effectiveSize * 0.25,
              left: effectiveSize * 0.05,
              child: _Dot(
                size: effectiveSize * 0.04,
                color: primary.withValues(alpha: 0.15),
              ),
            ),
          ],
          // Main circle with icon
          Container(
            width: effectiveSize * 0.7,
            height: effectiveSize * 0.7,
            decoration: BoxDecoration(
              color: background,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: iconSize,
              color: primary,
            ),
          ),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PRESET ILLUSTRATIONS
// ══════════════════════════════════════════════════════════════════════════════

/// Common preset illustrations for consistent empty states.
class AivoPresetIllustration extends StatelessWidget {
  const AivoPresetIllustration._({
    required this.type,
    this.size = AivoIllustrationSize.lg,
    this.gradeBand,
  });

  final _IllustrationType type;
  final double size;
  final AivoGradeBand? gradeBand;

  /// Empty inbox/no messages
  factory AivoPresetIllustration.emptyInbox({
    double size = AivoIllustrationSize.lg,
    AivoGradeBand? gradeBand,
  }) =>
      AivoPresetIllustration._(
        type: _IllustrationType.emptyInbox,
        size: size,
        gradeBand: gradeBand,
      );

  /// No search results
  factory AivoPresetIllustration.noResults({
    double size = AivoIllustrationSize.lg,
    AivoGradeBand? gradeBand,
  }) =>
      AivoPresetIllustration._(
        type: _IllustrationType.noResults,
        size: size,
        gradeBand: gradeBand,
      );

  /// Error/failed state
  factory AivoPresetIllustration.error({
    double size = AivoIllustrationSize.lg,
    AivoGradeBand? gradeBand,
  }) =>
      AivoPresetIllustration._(
        type: _IllustrationType.error,
        size: size,
        gradeBand: gradeBand,
      );

  /// No connection/offline
  factory AivoPresetIllustration.offline({
    double size = AivoIllustrationSize.lg,
    AivoGradeBand? gradeBand,
  }) =>
      AivoPresetIllustration._(
        type: _IllustrationType.offline,
        size: size,
        gradeBand: gradeBand,
      );

  /// Success/completed
  factory AivoPresetIllustration.success({
    double size = AivoIllustrationSize.lg,
    AivoGradeBand? gradeBand,
  }) =>
      AivoPresetIllustration._(
        type: _IllustrationType.success,
        size: size,
        gradeBand: gradeBand,
      );

  /// Empty list/no data
  factory AivoPresetIllustration.emptyList({
    double size = AivoIllustrationSize.lg,
    AivoGradeBand? gradeBand,
  }) =>
      AivoPresetIllustration._(
        type: _IllustrationType.emptyList,
        size: size,
        gradeBand: gradeBand,
      );

  /// Learning/education
  factory AivoPresetIllustration.learning({
    double size = AivoIllustrationSize.lg,
    AivoGradeBand? gradeBand,
  }) =>
      AivoPresetIllustration._(
        type: _IllustrationType.learning,
        size: size,
        gradeBand: gradeBand,
      );

  /// Achievement/reward
  factory AivoPresetIllustration.achievement({
    double size = AivoIllustrationSize.lg,
    AivoGradeBand? gradeBand,
  }) =>
      AivoPresetIllustration._(
        type: _IllustrationType.achievement,
        size: size,
        gradeBand: gradeBand,
      );

  /// Welcome/onboarding
  factory AivoPresetIllustration.welcome({
    double size = AivoIllustrationSize.xl,
    AivoGradeBand? gradeBand,
  }) =>
      AivoPresetIllustration._(
        type: _IllustrationType.welcome,
        size: size,
        gradeBand: gradeBand,
      );

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (icon, color) = _getIconAndColor(theme);

    return AivoIconIllustration(
      icon: icon,
      size: size,
      gradeBand: gradeBand,
      primaryColor: color,
    );
  }

  (IconData, Color) _getIconAndColor(ThemeData theme) {
    return switch (type) {
      _IllustrationType.emptyInbox => (Icons.inbox_outlined, theme.colorScheme.primary),
      _IllustrationType.noResults => (Icons.search_off_outlined, theme.colorScheme.secondary),
      _IllustrationType.error => (Icons.error_outline, theme.colorScheme.error),
      _IllustrationType.offline => (Icons.wifi_off_outlined, theme.colorScheme.tertiary),
      _IllustrationType.success => (Icons.check_circle_outline, AivoBrand.success),
      _IllustrationType.emptyList => (Icons.folder_open_outlined, theme.colorScheme.secondary),
      _IllustrationType.learning => (Icons.school_outlined, theme.colorScheme.primary),
      _IllustrationType.achievement => (Icons.emoji_events_outlined, AivoBrand.warning),
      _IllustrationType.welcome => (Icons.waving_hand_outlined, theme.colorScheme.primary),
    };
  }
}

enum _IllustrationType {
  emptyInbox,
  noResults,
  error,
  offline,
  success,
  emptyList,
  learning,
  achievement,
  welcome,
}

// ══════════════════════════════════════════════════════════════════════════════
// GRADE-BAND SPECIFIC ILLUSTRATIONS
// ══════════════════════════════════════════════════════════════════════════════

/// Illustrations that adapt style based on grade band.
class AivoGradeBandIllustration extends StatelessWidget {
  const AivoGradeBandIllustration({
    super.key,
    required this.icon,
    this.size = AivoIllustrationSize.lg,
    this.gradeBand,
    this.semanticLabel,
  });

  final IconData icon;
  final double size;
  final AivoGradeBand? gradeBand;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);
    final effectiveSize = AivoIllustrationSize.forGradeBand(
      effectiveGradeBand,
      baseSize: size,
    );

    // Different visual styles per grade band
    final (borderRadius, shadowOpacity, decorationCount) = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => (effectiveSize / 3, 0.2, 5), // More playful, rounder
      AivoGradeBand.g6_8 => (effectiveSize / 4, 0.15, 3), // Balanced
      AivoGradeBand.g9_12 => (effectiveSize / 6, 0.1, 2), // More professional
    };

    final primary = theme.colorScheme.primary;

    return Semantics(
      label: semanticLabel,
      child: SizedBox(
        width: effectiveSize,
        height: effectiveSize,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Decorative dots based on grade band
            for (int i = 0; i < decorationCount; i++)
              Positioned(
                top: effectiveSize * (0.05 + i * 0.15),
                right: effectiveSize * (0.1 + i * 0.1),
                child: _Dot(
                  size: effectiveSize * (0.06 - i * 0.01),
                  color: primary.withValues(alpha: 0.3 - i * 0.05),
                ),
              ),
            // Main container
            Container(
              width: effectiveSize * 0.65,
              height: effectiveSize * 0.65,
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(borderRadius),
                boxShadow: [
                  BoxShadow(
                    color: primary.withValues(alpha: shadowOpacity),
                    blurRadius: effectiveSize * 0.1,
                    offset: Offset(0, effectiveSize * 0.03),
                  ),
                ],
              ),
              child: Icon(
                icon,
                size: effectiveSize * 0.35,
                color: primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
