/// Aivo Button Widget
///
/// Consistent button styling across apps with grade-band aware animations.
/// Aligned with web Button component (libs/ui-web/src/components/ui/button.tsx).
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/aivo_brand.dart';
import 'package:flutter_common/theme/aivo_theme.dart';

/// Button variants matching web button.tsx:
/// - primary: bg-primary, text-primary-foreground
/// - secondary: bg-secondary, text-secondary-foreground
/// - ghost: transparent bg, hover:bg-accent
/// - outline: border, bg-background, hover:bg-accent
/// - destructive: bg-destructive (error/danger)
/// - success: bg-success (green)
enum AivoButtonVariant {
  /// Primary filled button (default)
  primary,

  /// Secondary tonal button
  secondary,

  /// Ghost/text button - transparent bg
  ghost,

  /// Outlined button with border
  outline,

  /// Destructive/danger button (red)
  destructive,

  /// Success button (green)
  success,

  // Legacy aliases for backwards compatibility
  /// @deprecated Use [outline] instead
  outlined,

  /// @deprecated Use [ghost] instead
  text,

  /// @deprecated Use [destructive] instead
  danger,
}

/// Button sizes matching web specifications.
/// Heights are based on grade-band touch targets.
enum AivoButtonSize {
  /// Small: min-height=touchTarget, padding 8px 16px
  sm,

  /// Medium (default): padding 10px 20px
  md,

  /// Large: padding 12px 24px
  lg,

  /// Icon button: square, size=touchTarget
  icon,

  // Legacy aliases for backwards compatibility
  /// @deprecated Use [sm] instead
  small,

  /// @deprecated Use [md] instead
  medium,

  /// @deprecated Use [lg] instead
  large,
}

/// Button animation settings per grade band.
/// Explorer: More playful animations
/// Navigator: Moderate animations
/// Scholar: Subtle, professional animations
class _ButtonAnimationConfig {
  const _ButtonAnimationConfig({
    required this.hoverScale,
    required this.pressScale,
    required this.duration,
  });

  /// Scale factor on hover
  final double hoverScale;

  /// Scale factor on press
  final double pressScale;

  /// Animation duration
  final Duration duration;

  /// Explorer (Pre-K–5): Playful, bouncy animations
  static const explorer = _ButtonAnimationConfig(
    hoverScale: 1.05,
    pressScale: 0.95,
    duration: Duration(milliseconds: 250),
  );

  /// Navigator (6-8): Moderate animations
  static const navigator = _ButtonAnimationConfig(
    hoverScale: 1.02,
    pressScale: 0.98,
    duration: Duration(milliseconds: 200),
  );

  /// Scholar (9-12): Subtle, professional animations
  static const scholar = _ButtonAnimationConfig(
    hoverScale: 1.01,
    pressScale: 0.99,
    duration: Duration(milliseconds: 150),
  );

  /// Get config for grade band
  static _ButtonAnimationConfig forGradeBand(AivoGradeBand? band) {
    return switch (band) {
      AivoGradeBand.k5 => explorer,
      AivoGradeBand.g6_8 => navigator,
      AivoGradeBand.g9_12 => scholar,
      null => navigator, // Default to navigator
    };
  }
}

/// Aivo styled button with grade-band aware animations.
///
/// Features:
/// - 6 variants: primary, secondary, ghost, outline, destructive, success
/// - 4 sizes: sm, md, lg, icon
/// - Grade-band specific hover/press animations
/// - Loading state with spinner
/// - Disabled state with reduced opacity
///
/// Example:
/// ```dart
/// AivoButton(
///   label: 'Submit',
///   onPressed: () => print('Pressed'),
///   variant: AivoButtonVariant.primary,
///   size: AivoButtonSize.md,
/// )
/// ```
class AivoButton extends StatefulWidget {
  const AivoButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AivoButtonVariant.primary,
    this.size = AivoButtonSize.md,
    this.icon,
    this.trailingIcon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.enabled = true,
    this.gradeBand,
    this.enableAnimations = true,
  });

  /// Button label text
  final String label;

  /// Callback when button is pressed
  final VoidCallback? onPressed;

  /// Button variant/style
  final AivoButtonVariant variant;

  /// Button size
  final AivoButtonSize size;

  /// Leading icon
  final IconData? icon;

  /// Trailing icon (shown after label)
  final IconData? trailingIcon;

  /// Show loading spinner instead of content
  final bool isLoading;

  /// Make button full width
  final bool isFullWidth;

  /// Whether button is enabled
  final bool enabled;

  /// Grade band for animations (defaults to Navigator if not provided)
  final AivoGradeBand? gradeBand;

  /// Enable hover/press scale animations
  final bool enableAnimations;

  /// Icon-only button factory
  static Widget iconButton({
    Key? key,
    required IconData icon,
    required VoidCallback? onPressed,
    AivoButtonVariant variant = AivoButtonVariant.ghost,
    bool enabled = true,
    bool isLoading = false,
    AivoGradeBand? gradeBand,
    String? tooltip,
  }) {
    final button = AivoButton(
      key: key,
      label: '',
      icon: icon,
      onPressed: onPressed,
      variant: variant,
      size: AivoButtonSize.icon,
      enabled: enabled,
      isLoading: isLoading,
      gradeBand: gradeBand,
    );

    if (tooltip != null) {
      return Tooltip(message: tooltip, child: button);
    }
    return button;
  }

  @override
  State<AivoButton> createState() => _AivoButtonState();
}

class _AivoButtonState extends State<AivoButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  bool _isHovered = false;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    final config = _ButtonAnimationConfig.forGradeBand(widget.gradeBand);
    _animationController = AnimationController(
      vsync: this,
      duration: config.duration,
    );
    _updateScaleAnimation();
  }

  @override
  void didUpdateWidget(AivoButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.gradeBand != widget.gradeBand) {
      final config = _ButtonAnimationConfig.forGradeBand(widget.gradeBand);
      _animationController.duration = config.duration;
      _updateScaleAnimation();
    }
  }

  void _updateScaleAnimation() {
    final config = _ButtonAnimationConfig.forGradeBand(widget.gradeBand);
    final targetScale = _isPressed
        ? config.pressScale
        : _isHovered
            ? config.hoverScale
            : 1.0;

    _scaleAnimation = Tween<double>(
      begin: _scaleAnimation.value,
      end: targetScale,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: AivoBrand.curveDefault,
    ));
  }

  void _handleHover(bool isHovered) {
    if (!widget.enableAnimations || !widget.enabled || widget.isLoading) return;
    setState(() {
      _isHovered = isHovered;
      _updateScaleAnimation();
      _animationController.forward(from: 0);
    });
  }

  void _handleTapDown(TapDownDetails details) {
    if (!widget.enableAnimations || !widget.enabled || widget.isLoading) return;
    setState(() {
      _isPressed = true;
      _updateScaleAnimation();
      _animationController.forward(from: 0);
    });
  }

  void _handleTapUp(TapUpDetails details) {
    if (!widget.enableAnimations) return;
    setState(() {
      _isPressed = false;
      _updateScaleAnimation();
      _animationController.forward(from: 0);
    });
  }

  void _handleTapCancel() {
    if (!widget.enableAnimations) return;
    setState(() {
      _isPressed = false;
      _updateScaleAnimation();
      _animationController.forward(from: 0);
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  /// Normalize legacy size values
  AivoButtonSize get _normalizedSize => switch (widget.size) {
        AivoButtonSize.small => AivoButtonSize.sm,
        AivoButtonSize.medium => AivoButtonSize.md,
        AivoButtonSize.large => AivoButtonSize.lg,
        _ => widget.size,
      };

  /// Normalize legacy variant values
  AivoButtonVariant get _normalizedVariant => switch (widget.variant) {
        AivoButtonVariant.outlined => AivoButtonVariant.outline,
        AivoButtonVariant.text => AivoButtonVariant.ghost,
        AivoButtonVariant.danger => AivoButtonVariant.destructive,
        _ => widget.variant,
      };

  /// Get touch target for grade band
  double _getTouchTarget() {
    return switch (widget.gradeBand) {
      AivoGradeBand.k5 => AivoBrand.touchTargetExplorer,
      AivoGradeBand.g6_8 => AivoBrand.touchTargetNavigator,
      AivoGradeBand.g9_12 => AivoBrand.touchTargetScholar,
      null => AivoBrand.touchTargetNavigator,
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final normalizedSize = _normalizedSize;
    final normalizedVariant = _normalizedVariant;
    final touchTarget = _getTouchTarget();

    final effectiveOnPressed =
        widget.enabled && !widget.isLoading ? widget.onPressed : null;

    // Size specifications (matching web button.tsx)
    final (padding, minHeight, textStyle, iconSize) = switch (normalizedSize) {
      AivoButtonSize.sm => (
          const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          touchTarget,
          theme.textTheme.labelMedium,
          16.0,
        ),
      AivoButtonSize.md => (
          const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          touchTarget,
          theme.textTheme.labelLarge,
          20.0,
        ),
      AivoButtonSize.lg => (
          const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          touchTarget + 4,
          theme.textTheme.titleMedium,
          24.0,
        ),
      AivoButtonSize.icon => (
          EdgeInsets.zero,
          touchTarget,
          theme.textTheme.labelMedium,
          20.0,
        ),
      // Legacy sizes (handled by normalization, but included for completeness)
      _ => (
          const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          touchTarget,
          theme.textTheme.labelLarge,
          20.0,
        ),
    };

    // Disabled opacity
    final double opacity = widget.enabled ? 1.0 : 0.5;

    // Build child content
    Widget child;
    if (widget.isLoading) {
      child = SizedBox(
        width: iconSize,
        height: iconSize,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation(
            _getSpinnerColor(normalizedVariant, colorScheme),
          ),
        ),
      );
    } else if (normalizedSize == AivoButtonSize.icon) {
      // Icon button: just the icon
      child = Icon(widget.icon, size: iconSize);
    } else {
      // Regular button with label and optional icons
      child = Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (widget.icon != null) ...[
            Icon(widget.icon, size: iconSize),
            const SizedBox(width: 8),
          ],
          Text(widget.label, style: textStyle),
          if (widget.trailingIcon != null) ...[
            const SizedBox(width: 8),
            Icon(widget.trailingIcon, size: iconSize),
          ],
        ],
      );
    }

    // Build the button based on variant
    final buttonStyle = _getButtonStyle(
      normalizedVariant,
      colorScheme,
      padding,
      minHeight,
      normalizedSize == AivoButtonSize.icon ? touchTarget : null,
    );

    Widget button = switch (normalizedVariant) {
      AivoButtonVariant.primary ||
      AivoButtonVariant.destructive ||
      AivoButtonVariant.success =>
        FilledButton(
          onPressed: effectiveOnPressed,
          style: buttonStyle,
          child: child,
        ),
      AivoButtonVariant.secondary => FilledButton.tonal(
          onPressed: effectiveOnPressed,
          style: buttonStyle,
          child: child,
        ),
      AivoButtonVariant.outline ||
      AivoButtonVariant.outlined =>
        OutlinedButton(
          onPressed: effectiveOnPressed,
          style: buttonStyle,
          child: child,
        ),
      AivoButtonVariant.ghost || AivoButtonVariant.text => TextButton(
          onPressed: effectiveOnPressed,
          style: buttonStyle,
          child: child,
        ),
      // Legacy variants handled above
      AivoButtonVariant.danger => FilledButton(
          onPressed: effectiveOnPressed,
          style: buttonStyle,
          child: child,
        ),
    };

    // Apply opacity for disabled state
    if (!widget.enabled) {
      button = Opacity(opacity: opacity, child: button);
    }

    // Wrap with gesture detection for animations
    if (widget.enableAnimations && widget.enabled && !widget.isLoading) {
      button = MouseRegion(
        onEnter: (_) => _handleHover(true),
        onExit: (_) => _handleHover(false),
        child: GestureDetector(
          onTapDown: _handleTapDown,
          onTapUp: _handleTapUp,
          onTapCancel: _handleTapCancel,
          child: AnimatedBuilder(
            animation: _scaleAnimation,
            builder: (context, child) => Transform.scale(
              scale: _scaleAnimation.value,
              child: child,
            ),
            child: button,
          ),
        ),
      );
    }

    // Full width wrapper
    if (widget.isFullWidth) {
      return SizedBox(width: double.infinity, child: button);
    }

    return button;
  }

  /// Get spinner color based on variant
  Color _getSpinnerColor(AivoButtonVariant variant, ColorScheme colorScheme) {
    return switch (variant) {
      AivoButtonVariant.primary ||
      AivoButtonVariant.destructive ||
      AivoButtonVariant.danger ||
      AivoButtonVariant.success =>
        colorScheme.onPrimary,
      _ => colorScheme.primary,
    };
  }

  /// Get button style for variant
  ButtonStyle _getButtonStyle(
    AivoButtonVariant variant,
    ColorScheme colorScheme,
    EdgeInsetsGeometry padding,
    double minHeight,
    double? iconSize,
  ) {
    final baseStyle = ButtonStyle(
      padding: WidgetStatePropertyAll(padding),
      minimumSize: WidgetStatePropertyAll(
        iconSize != null ? Size(iconSize, iconSize) : Size(0, minHeight),
      ),
      shape: WidgetStatePropertyAll(
        RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AivoBrand.radiusMd),
        ),
      ),
    );

    return switch (variant) {
      AivoButtonVariant.primary => baseStyle,
      AivoButtonVariant.secondary => baseStyle,
      AivoButtonVariant.ghost || AivoButtonVariant.text => baseStyle,
      AivoButtonVariant.outline || AivoButtonVariant.outlined => baseStyle,
      AivoButtonVariant.destructive ||
      AivoButtonVariant.danger =>
        baseStyle.copyWith(
          backgroundColor: WidgetStatePropertyAll(colorScheme.error),
          foregroundColor: WidgetStatePropertyAll(colorScheme.onError),
        ),
      AivoButtonVariant.success => baseStyle.copyWith(
          backgroundColor: WidgetStatePropertyAll(AivoBrand.success),
          foregroundColor: const WidgetStatePropertyAll(Colors.white),
        ),
    };
  }
}
