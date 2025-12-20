import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/theme.dart';

/// Size variants for the AIVO logo, matching the marketing website.
enum AivoLogoSize {
  /// Small: 40px logo
  sm,

  /// Medium: 48px logo (default)
  md,

  /// Large: 56px logo
  lg,

  /// Extra large: 72px logo
  xl,
}

/// A consistent AIVO logo widget that matches the marketing website.
///
/// Usage:
/// ```dart
/// // Icon only
/// AivoLogo(size: AivoLogoSize.md)
///
/// // Icon + text
/// AivoLogo(showText: true)
///
/// // Icon + text + tagline
/// AivoLogo(showText: true, showTagline: true)
///
/// // Animated with glow effect
/// AivoLogo(animated: true)
/// ```
class AivoLogo extends StatefulWidget {
  /// Creates an AIVO logo widget.
  const AivoLogo({
    super.key,
    this.size = AivoLogoSize.md,
    this.showText = false,
    this.showTagline = false,
    this.animated = false,
    this.onTap,
  });

  /// The size of the logo.
  final AivoLogoSize size;

  /// Whether to show "AIVO" text next to the logo.
  final bool showText;

  /// Whether to show "Learning" tagline below the text.
  /// Only visible when [showText] is true.
  final bool showTagline;

  /// Whether to animate the logo with a pulsing glow effect.
  final bool animated;

  /// Optional tap callback. If provided, the logo becomes tappable.
  final VoidCallback? onTap;

  @override
  State<AivoLogo> createState() => _AivoLogoState();
}

class _AivoLogoState extends State<AivoLogo>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  double get _logoSize => switch (widget.size) {
        AivoLogoSize.sm => 40.0,
        AivoLogoSize.md => 48.0,
        AivoLogoSize.lg => 56.0,
        AivoLogoSize.xl => 72.0,
      };

  double get _textSize => switch (widget.size) {
        AivoLogoSize.sm => 18.0,
        AivoLogoSize.md => 20.0,
        AivoLogoSize.lg => 24.0,
        AivoLogoSize.xl => 30.0,
      };

  double get _taglineSize => switch (widget.size) {
        AivoLogoSize.sm => 10.0,
        AivoLogoSize.md => 12.0,
        AivoLogoSize.lg => 14.0,
        AivoLogoSize.xl => 16.0,
      };

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeInOut,
      ),
    );

    _opacityAnimation = Tween<double>(begin: 0.5, end: 0.3).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeInOut,
      ),
    );

    if (widget.animated) {
      _animationController.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(AivoLogo oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.animated != oldWidget.animated) {
      if (widget.animated) {
        _animationController.repeat(reverse: true);
      } else {
        _animationController.stop();
        _animationController.reset();
      }
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Logo icon with optional glow
        _buildLogoIcon(),

        // Text and tagline
        if (widget.showText) ...[
          const SizedBox(width: 8),
          _buildText(context),
        ],
      ],
    );

    if (widget.onTap != null) {
      return InkWell(
        onTap: widget.onTap,
        borderRadius: BorderRadius.circular(8),
        child: content,
      );
    }

    return content;
  }

  Widget _buildLogoIcon() {
    final logoWidget = SvgPicture.asset(
      'packages/flutter_common/assets/images/aivo-logo.svg',
      width: _logoSize,
      height: _logoSize,
    );

    if (!widget.animated) {
      return logoWidget;
    }

    return Stack(
      alignment: Alignment.center,
      children: [
        // Animated glow effect
        AnimatedBuilder(
          animation: _animationController,
          builder: (context, child) {
            return Container(
              width: _logoSize,
              height: _logoSize,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AivoBrand.primary.withOpacity(_opacityAnimation.value),
                    AivoBrand.coral.withOpacity(_opacityAnimation.value),
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: AivoBrand.primary.withOpacity(0.3),
                    blurRadius: 20 * _scaleAnimation.value,
                    spreadRadius: 5 * _scaleAnimation.value,
                  ),
                ],
              ),
            );
          },
        ),
        // Logo on top
        logoWidget,
      ],
    );
  }

  Widget _buildText(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'AIVO',
          style: TextStyle(
            fontSize: _textSize,
            fontWeight: FontWeight.bold,
            letterSpacing: -0.5,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        if (widget.showTagline)
          Text(
            'Learning',
            style: TextStyle(
              fontSize: _taglineSize,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              height: 0.9,
            ),
          ),
      ],
    );
  }
}
