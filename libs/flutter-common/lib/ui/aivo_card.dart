/// Aivo Card Widget
///
/// Consistent card styling across apps with grade-band awareness.
/// Aligned with web Card component (libs/ui-web/src/components/ui/card.tsx).
library;

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_motion.dart';
import '../theme/aivo_shadows.dart';
import '../theme/aivo_theme.dart';

/// Card variants matching web specifications.
enum AivoCardVariant {
  /// Default: White background with soft shadow
  standard,

  /// Elevated: Higher elevation shadow (raised)
  elevated,

  /// Outlined: 1px border, no shadow
  outlined,

  /// Filled: Light background tint, no shadow
  filled,
}

/// Card animation configuration per grade band.
/// Uses the centralized AivoMotion system for consistency.
class _CardAnimationConfig {
  const _CardAnimationConfig({
    required this.hoverScale,
    required this.pressScale,
    required this.duration,
    required this.curve,
  });

  final double hoverScale;
  final double pressScale;
  final Duration duration;
  final Curve curve;

  /// Get config for grade band using centralized AivoMotion system
  /// Note: Cards use smaller scale values than buttons for subtlety
  static _CardAnimationConfig forGradeBand(AivoGradeBand? band) {
    final durationConfig = AivoDurationConfig.forGradeBand(band);
    final baseScale = AivoScaleConfig.forGradeBand(band);
    final curve = AivoCurves.bounceForGradeBand(band);

    // Cards use more subtle scaling (half of button values)
    final hoverDelta = (baseScale.hover - 1.0) / 2;
    final pressDelta = (1.0 - baseScale.press) / 2;

    return _CardAnimationConfig(
      hoverScale: 1.0 + hoverDelta, // Explorer: 1.025, Navigator: 1.01, Scholar: 1.005
      pressScale: 1.0 - pressDelta, // Explorer: 0.975, Navigator: 0.99, Scholar: 0.995
      duration: durationConfig.base,
      curve: curve,
    );
  }
}

/// Aivo styled card with grade-band awareness.
///
/// Features:
/// - 4 variants: standard, elevated, outlined, filled
/// - Grade-band specific border radius
/// - Interactive mode with hover/press animations
/// - Shadow system matching web tokens
///
/// Example:
/// ```dart
/// AivoCard(
///   variant: AivoCardVariant.elevated,
///   gradeBand: AivoGradeBand.k5,
///   onTap: () => print('Tapped'),
///   child: Text('Card content'),
/// )
/// ```
class AivoCard extends StatefulWidget {
  const AivoCard({
    super.key,
    required this.child,
    this.variant = AivoCardVariant.standard,
    this.onTap,
    this.padding,
    this.margin,
    this.color,
    this.borderRadius,
    this.gradeBand,
    this.enableAnimations = true,
    this.clipBehavior = Clip.antiAlias,
  });

  /// Card content
  final Widget child;

  /// Card variant/style
  final AivoCardVariant variant;

  /// Callback when card is tapped (enables interactive mode)
  final VoidCallback? onTap;

  /// Content padding
  final EdgeInsetsGeometry? padding;

  /// Card margin
  final EdgeInsetsGeometry? margin;

  /// Background color override
  final Color? color;

  /// Border radius override (uses grade-band default if not specified)
  final BorderRadius? borderRadius;

  /// Grade band for animations and styling
  final AivoGradeBand? gradeBand;

  /// Enable hover/press scale animations
  final bool enableAnimations;

  /// Clip behavior for card content
  final Clip clipBehavior;

  @override
  State<AivoCard> createState() => _AivoCardState();
}

class _AivoCardState extends State<AivoCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  bool _isHovered = false;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    final config = _CardAnimationConfig.forGradeBand(widget.gradeBand);
    _animationController = AnimationController(
      vsync: this,
      duration: config.duration,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: config.curve,
      ),
    );
  }

  @override
  void didUpdateWidget(AivoCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.gradeBand != widget.gradeBand) {
      final config = _CardAnimationConfig.forGradeBand(widget.gradeBand);
      _animationController.duration = config.duration;
    }
  }

  void _updateScaleAnimation() {
    final config = _CardAnimationConfig.forGradeBand(widget.gradeBand);
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
      curve: config.curve,
    ));
    _animationController.forward(from: 0);
  }

  void _handleHover(bool isHovered) {
    if (!widget.enableAnimations || widget.onTap == null) return;
    setState(() {
      _isHovered = isHovered;
      _updateScaleAnimation();
    });
  }

  void _handleTapDown(TapDownDetails details) {
    if (!widget.enableAnimations || widget.onTap == null) return;
    setState(() {
      _isPressed = true;
      _updateScaleAnimation();
    });
  }

  void _handleTapUp(TapUpDetails details) {
    if (!widget.enableAnimations) return;
    setState(() {
      _isPressed = false;
      _updateScaleAnimation();
    });
  }

  void _handleTapCancel() {
    if (!widget.enableAnimations) return;
    setState(() {
      _isPressed = false;
      _updateScaleAnimation();
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  /// Get border radius for grade band
  BorderRadius _getBorderRadius() {
    if (widget.borderRadius != null) return widget.borderRadius!;

    final radius = switch (widget.gradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusExplorerCard,
      AivoGradeBand.g6_8 => AivoBrand.radiusNavigatorCard,
      AivoGradeBand.g9_12 => AivoBrand.radiusScholarCard,
      null => AivoBrand.radiusMd,
    };

    return BorderRadius.circular(radius);
  }

  /// Get shadow for variant and hover state
  List<BoxShadow> _getShadow() {
    // No shadow for outlined and filled variants
    if (widget.variant == AivoCardVariant.outlined ||
        widget.variant == AivoCardVariant.filled) {
      return [];
    }

    // Use grade-band specific card shadows
    final gradeBand = widget.gradeBand ?? AivoGradeBand.g6_8;

    // Hover shadow for interactive cards
    if (_isHovered && widget.onTap != null) {
      return AivoShadows.cardHoverForGradeBand(gradeBand);
    }

    // Standard: use grade-band card shadow
    // Elevated: use raised shadow
    return switch (widget.variant) {
      AivoCardVariant.standard => AivoShadows.cardForGradeBand(gradeBand),
      AivoCardVariant.elevated => AivoShadows.raised,
      _ => [],
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final borderRadius = _getBorderRadius();

    // Determine background color
    final backgroundColor = widget.color ??
        switch (widget.variant) {
          AivoCardVariant.standard => colorScheme.surface,
          AivoCardVariant.elevated => colorScheme.surface,
          AivoCardVariant.outlined => colorScheme.surface,
          AivoCardVariant.filled => colorScheme.surfaceContainerHighest,
        };

    // Determine border
    final border = widget.variant == AivoCardVariant.outlined
        ? Border.all(color: colorScheme.outlineVariant)
        : null;

    // Build card content
    Widget cardContent = widget.padding != null
        ? Padding(padding: widget.padding!, child: widget.child)
        : widget.child;

    // Build card container
    Widget card = AnimatedBuilder(
      animation: _scaleAnimation,
      builder: (context, child) => Transform.scale(
        scale: _scaleAnimation.value,
        child: child,
      ),
      child: AnimatedContainer(
        duration: _CardAnimationConfig.forGradeBand(widget.gradeBand).duration,
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: borderRadius,
          border: border,
          boxShadow: _getShadow(),
        ),
        clipBehavior: widget.clipBehavior,
        child: cardContent,
      ),
    );

    // Add tap handling with ink effect
    if (widget.onTap != null) {
      card = MouseRegion(
        onEnter: (_) => _handleHover(true),
        onExit: (_) => _handleHover(false),
        child: GestureDetector(
          onTapDown: _handleTapDown,
          onTapUp: _handleTapUp,
          onTapCancel: _handleTapCancel,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: widget.onTap,
              borderRadius: borderRadius,
              child: card,
            ),
          ),
        ),
      );
    }

    // Apply margin
    if (widget.margin != null) {
      card = Padding(padding: widget.margin!, child: card);
    }

    return card;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CARD SUB-COMPONENTS (Matching web card.tsx structure)
// ════════════════════════════════════════════════════════════════════════════

/// Card header section with optional icon, title, subtitle, and actions.
///
/// Matches web CardHeader with flexible layout options.
class CardHeader extends StatelessWidget {
  const CardHeader({
    super.key,
    this.leading,
    this.title,
    this.subtitle,
    this.trailing,
    this.padding,
  });

  /// Leading widget (typically an icon or avatar)
  final Widget? leading;

  /// Title text or widget
  final Widget? title;

  /// Subtitle text or widget
  final Widget? subtitle;

  /// Trailing widget (typically actions)
  final Widget? trailing;

  /// Custom padding (defaults to 16px)
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: padding ?? const EdgeInsets.all(16),
      child: Row(
        children: [
          if (leading != null) ...[
            leading!,
            const SizedBox(width: 16),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (title != null)
                  DefaultTextStyle(
                    style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ) ??
                        const TextStyle(),
                    child: title!,
                  ),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  DefaultTextStyle(
                    style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ) ??
                        const TextStyle(),
                    child: subtitle!,
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 16),
            trailing!,
          ],
        ],
      ),
    );
  }
}

/// Card title widget for use in CardHeader.
class CardTitle extends StatelessWidget {
  const CardTitle(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
    );
  }
}

/// Card description/subtitle widget.
class CardDescription extends StatelessWidget {
  const CardDescription(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
    );
  }
}

/// Card content section.
///
/// Matches web CardContent with padding configuration.
class CardContent extends StatelessWidget {
  const CardContent({
    super.key,
    required this.child,
    this.padding,
  });

  /// Content widget
  final Widget child;

  /// Custom padding (defaults to 16px horizontal, 0 top, 16px bottom)
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: child,
    );
  }
}

/// Card footer section with action buttons.
///
/// Matches web CardFooter with flexible alignment.
class CardFooter extends StatelessWidget {
  const CardFooter({
    super.key,
    required this.child,
    this.padding,
    this.alignment = MainAxisAlignment.start,
  });

  /// Footer content (typically Row of buttons)
  final Widget child;

  /// Custom padding
  final EdgeInsetsGeometry? padding;

  /// Alignment of footer content
  final MainAxisAlignment alignment;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: child is Row
          ? child
          : Row(
              mainAxisAlignment: alignment,
              children: [child],
            ),
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PRESET CARD WIDGETS
// ════════════════════════════════════════════════════════════════════════════

/// Aivo info card with icon and content.
class AivoInfoCard extends StatelessWidget {
  const AivoInfoCard({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.trailing,
    this.onTap,
    this.variant = AivoCardVariant.standard,
    this.iconColor,
    this.gradeBand,
  });

  final String title;
  final String? subtitle;
  final IconData? icon;
  final Widget? trailing;
  final VoidCallback? onTap;
  final AivoCardVariant variant;
  final Color? iconColor;
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final effectiveIconColor = iconColor ?? colorScheme.primary;

    return AivoCard(
      variant: variant,
      onTap: onTap,
      gradeBand: gradeBand,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          if (icon != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: effectiveIconColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(
                  gradeBand == AivoGradeBand.k5
                      ? AivoBrand.radiusExplorerCard
                      : gradeBand == AivoGradeBand.g9_12
                          ? AivoBrand.radiusScholarCard
                          : AivoBrand.radiusNavigatorCard,
                ),
              ),
              child: Icon(
                icon,
                color: effectiveIconColor,
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
    this.gradeBand,
  });

  final String label;
  final String value;
  final IconData? icon;
  final String? trend;
  final bool? trendPositive;
  final VoidCallback? onTap;
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return AivoCard(
      variant: AivoCardVariant.filled,
      onTap: onTap,
      gradeBand: gradeBand,
      padding: const EdgeInsets.all(16),
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
                      ? AivoBrand.success
                      : trendPositive == false
                          ? AivoBrand.error
                          : colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
                Text(
                  trend!,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: trendPositive == true
                        ? AivoBrand.success
                        : trendPositive == false
                            ? AivoBrand.error
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

/// Aivo action card with icon, title, subtitle, and action button.
class AivoActionCard extends StatelessWidget {
  const AivoActionCard({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.iconColor,
    this.action,
    this.actionLabel,
    this.onAction,
    this.variant = AivoCardVariant.standard,
    this.gradeBand,
  });

  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;
  final Widget? action;
  final String? actionLabel;
  final VoidCallback? onAction;
  final AivoCardVariant variant;
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final effectiveIconColor = iconColor ?? colorScheme.primary;

    return AivoCard(
      variant: variant,
      gradeBand: gradeBand,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CardHeader(
            leading: icon != null
                ? Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: effectiveIconColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AivoBrand.radiusMd),
                    ),
                    child: Icon(icon, color: effectiveIconColor, size: 24),
                  )
                : null,
            title: Text(title),
            subtitle: subtitle != null ? Text(subtitle!) : null,
          ),
          if (action != null || actionLabel != null)
            CardFooter(
              alignment: MainAxisAlignment.end,
              child: action ??
                  TextButton(
                    onPressed: onAction,
                    child: Text(actionLabel!),
                  ),
            ),
        ],
      ),
    );
  }
}

