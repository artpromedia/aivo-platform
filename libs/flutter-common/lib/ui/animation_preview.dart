/// Animation Preview Gallery
///
/// Interactive demonstration of the AIVO animation & motion system.
/// Shows duration tokens, easing curves, and reduced motion support.
library;

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_motion.dart';
import '../theme/aivo_theme.dart';

/// Animation system preview gallery widget.
///
/// Demonstrates:
/// - Duration tokens per grade band
/// - Easing curves comparison
/// - Scale animations (hover/press)
/// - Reduced motion behavior
/// - Page transitions
class AnimationPreview extends StatelessWidget {
  const AnimationPreview({
    super.key,
    this.gradeBand,
  });

  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Text(
            'Animation & Motion System',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Grade-band specific durations, easing curves, and reduced motion support.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
                ),
          ),
          const SizedBox(height: 32),

          // Duration Demo
          _SectionHeader(title: 'Duration Tokens'),
          const SizedBox(height: 16),
          _DurationDemo(gradeBand: gradeBand),
          const SizedBox(height: 32),

          // Easing Curves Demo
          _SectionHeader(title: 'Easing Curves'),
          const SizedBox(height: 16),
          _EasingCurvesDemo(gradeBand: gradeBand),
          const SizedBox(height: 32),

          // Scale Animation Demo
          _SectionHeader(title: 'Scale Animations (Hover/Press)'),
          const SizedBox(height: 16),
          _ScaleAnimationDemo(gradeBand: gradeBand),
          const SizedBox(height: 32),

          // Interactive Buttons Demo
          _SectionHeader(title: 'Interactive Button States'),
          const SizedBox(height: 16),
          _InteractiveButtonsDemo(gradeBand: gradeBand),
          const SizedBox(height: 32),

          // Presence Animation Demo
          _SectionHeader(title: 'Presence Animations'),
          const SizedBox(height: 16),
          _PresenceAnimationDemo(gradeBand: gradeBand),
          const SizedBox(height: 32),

          // Reduced Motion Demo
          _SectionHeader(title: 'Reduced Motion'),
          const SizedBox(height: 16),
          _ReducedMotionDemo(gradeBand: gradeBand),
          const SizedBox(height: 32),

          // Grade Comparison
          _SectionHeader(title: 'Grade Band Comparison'),
          const SizedBox(height: 16),
          const _GradeBandComparisonDemo(),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 24,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 12),
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DURATION DEMO
// ══════════════════════════════════════════════════════════════════════════════

class _DurationDemo extends StatefulWidget {
  const _DurationDemo({this.gradeBand});

  final AivoGradeBand? gradeBand;

  @override
  State<_DurationDemo> createState() => _DurationDemoState();
}

class _DurationDemoState extends State<_DurationDemo>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  bool _isAnimating = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _controller.reverse();
      } else if (status == AnimationStatus.dismissed) {
        setState(() => _isAnimating = false);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _startAnimation() {
    if (!_isAnimating) {
      setState(() => _isAnimating = true);
      _controller.forward();
    }
  }

  @override
  Widget build(BuildContext context) {
    final effectiveGradeBand =
        widget.gradeBand ?? AivoTheme.gradeBandOf(context);
    final config = AivoDurationConfig.forGradeBand(effectiveGradeBand);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Duration values display
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerLow,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${_gradeBandLabel(effectiveGradeBand)} Durations',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 12),
              _DurationRow(label: 'Fast', duration: config.fast),
              _DurationRow(label: 'Base', duration: config.base),
              _DurationRow(label: 'Slow', duration: config.slow),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Animated bars demo
        GestureDetector(
          onTap: _startAnimation,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(
                color: Theme.of(context).colorScheme.outline,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Tap to animate',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const Spacer(),
                    Icon(
                      Icons.touch_app,
                      size: 20,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _AnimatedBar(
                  label: 'Fast (${config.fast.inMilliseconds}ms)',
                  controller: _controller,
                  duration: config.fast,
                  color: AivoBrand.success,
                ),
                const SizedBox(height: 8),
                _AnimatedBar(
                  label: 'Base (${config.base.inMilliseconds}ms)',
                  controller: _controller,
                  duration: config.base,
                  color: AivoBrand.primary,
                ),
                const SizedBox(height: 8),
                _AnimatedBar(
                  label: 'Slow (${config.slow.inMilliseconds}ms)',
                  controller: _controller,
                  duration: config.slow,
                  color: AivoBrand.coral,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _DurationRow extends StatelessWidget {
  const _DurationRow({required this.label, required this.duration});

  final String label;
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 60,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          Expanded(
            child: Container(
              height: 8,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(4),
              ),
              alignment: Alignment.centerLeft,
              child: FractionallySizedBox(
                widthFactor: duration.inMilliseconds / 400, // Max 400ms scale
                child: Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 50,
            child: Text(
              '${duration.inMilliseconds}ms',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontFamily: 'monospace',
                  ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}

class _AnimatedBar extends StatelessWidget {
  const _AnimatedBar({
    required this.label,
    required this.controller,
    required this.duration,
    required this.color,
  });

  final String label;
  final AnimationController controller;
  final Duration duration;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          flex: 2,
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        Expanded(
          flex: 3,
          child: Container(
            height: 24,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHigh,
              borderRadius: BorderRadius.circular(12),
            ),
            clipBehavior: Clip.hardEdge,
            alignment: Alignment.centerLeft,
            child: AnimatedBuilder(
              animation: controller,
              builder: (context, child) {
                // Calculate progress based on duration ratio
                final durationRatio = duration.inMilliseconds / 1000;
                final progress =
                    (controller.value / durationRatio).clamp(0.0, 1.0);

                return FractionallySizedBox(
                  widthFactor: progress,
                  child: Container(
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EASING CURVES DEMO
// ══════════════════════════════════════════════════════════════════════════════

class _EasingCurvesDemo extends StatefulWidget {
  const _EasingCurvesDemo({this.gradeBand});

  final AivoGradeBand? gradeBand;

  @override
  State<_EasingCurvesDemo> createState() => _EasingCurvesDemoState();
}

class _EasingCurvesDemoState extends State<_EasingCurvesDemo>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) _controller.reverse();
        });
      } else if (status == AnimationStatus.dismissed) {
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) _controller.forward();
        });
      }
    });
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final effectiveGradeBand =
        widget.gradeBand ?? AivoTheme.gradeBandOf(context);

    return Column(
      children: [
        _CurveRow(
          label: 'Standard',
          sublabel: 'cubic-bezier(0.2, 0, 0, 1)',
          curve: AivoCurves.standard,
          controller: _controller,
          color: AivoBrand.primary,
        ),
        const SizedBox(height: 8),
        _CurveRow(
          label: 'Emphasized',
          sublabel: 'cubic-bezier(0.3, 0, 0.2, 1)',
          curve: AivoCurves.emphasized,
          controller: _controller,
          color: AivoBrand.teal,
        ),
        const SizedBox(height: 8),
        _CurveRow(
          label: 'Bounce',
          sublabel: _getBounceLabel(effectiveGradeBand),
          curve: AivoCurves.bounceForGradeBand(effectiveGradeBand),
          controller: _controller,
          color: AivoBrand.coral,
        ),
        const SizedBox(height: 8),
        _CurveRow(
          label: 'Linear',
          sublabel: 'For reduced motion',
          curve: AivoCurves.linear,
          controller: _controller,
          color: AivoBrand.gray,
        ),
      ],
    );
  }

  String _getBounceLabel(AivoGradeBand band) {
    return switch (band) {
      AivoGradeBand.k5 => 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      AivoGradeBand.g6_8 => 'cubic-bezier(0.34, 1.2, 0.64, 1)',
      AivoGradeBand.g9_12 => 'cubic-bezier(0.34, 1.1, 0.64, 1)',
    };
  }
}

class _CurveRow extends StatelessWidget {
  const _CurveRow({
    required this.label,
    required this.sublabel,
    required this.curve,
    required this.controller,
    required this.color,
  });

  final String label;
  final String sublabel;
  final Curve curve;
  final AnimationController controller;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.5),
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                Text(
                  sublabel,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontFamily: 'monospace',
                        fontSize: 10,
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.6),
                      ),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 3,
            child: Container(
              height: 40,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: AnimatedBuilder(
                animation: controller,
                builder: (context, child) {
                  final curvedValue =
                      curve.transform(controller.value);
                  return Align(
                    alignment: Alignment(curvedValue * 2 - 1, 0),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: [
                          BoxShadow(
                            color: color.withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SCALE ANIMATION DEMO
// ══════════════════════════════════════════════════════════════════════════════

class _ScaleAnimationDemo extends StatelessWidget {
  const _ScaleAnimationDemo({this.gradeBand});

  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);

    return Row(
      children: [
        Expanded(
          child: _ScaleCard(
            gradeBand: AivoGradeBand.k5,
            isSelected: effectiveGradeBand == AivoGradeBand.k5,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _ScaleCard(
            gradeBand: AivoGradeBand.g6_8,
            isSelected: effectiveGradeBand == AivoGradeBand.g6_8,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _ScaleCard(
            gradeBand: AivoGradeBand.g9_12,
            isSelected: effectiveGradeBand == AivoGradeBand.g9_12,
          ),
        ),
      ],
    );
  }
}

class _ScaleCard extends StatefulWidget {
  const _ScaleCard({
    required this.gradeBand,
    this.isSelected = false,
  });

  final AivoGradeBand gradeBand;
  final bool isSelected;

  @override
  State<_ScaleCard> createState() => _ScaleCardState();
}

class _ScaleCardState extends State<_ScaleCard> {
  bool _isHovered = false;
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final scales = AivoScaleConfig.forGradeBand(widget.gradeBand);
    final durations = AivoDurationConfig.forGradeBand(widget.gradeBand);

    double scale = 1.0;
    if (_isPressed) {
      scale = scales.press;
    } else if (_isHovered) {
      scale = scales.hover;
    }

    final theme = Theme.of(context);

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) => setState(() => _isPressed = false),
        onTapCancel: () => setState(() => _isPressed = false),
        child: AnimatedScale(
          scale: scale,
          duration: durations.fast,
          curve: AivoCurves.bounceForGradeBand(widget.gradeBand),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: widget.isSelected
                  ? theme.colorScheme.primaryContainer
                  : theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: widget.isSelected
                    ? theme.colorScheme.primary
                    : theme.colorScheme.outline,
                width: widget.isSelected ? 2 : 1,
              ),
            ),
            child: Column(
              children: [
                Text(
                  _gradeBandLabel(widget.gradeBand),
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Hover: ${((scales.hover - 1) * 100).toStringAsFixed(0)}%',
                  style: theme.textTheme.bodySmall,
                ),
                Text(
                  'Press: ${((scales.press - 1) * 100).toStringAsFixed(0)}%',
                  style: theme.textTheme.bodySmall,
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
// INTERACTIVE BUTTONS DEMO
// ══════════════════════════════════════════════════════════════════════════════

class _InteractiveButtonsDemo extends StatelessWidget {
  const _InteractiveButtonsDemo({this.gradeBand});

  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final effectiveGradeBand = gradeBand ?? AivoTheme.gradeBandOf(context);

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _AnimatedButton(
          label: 'Primary Action',
          gradeBand: effectiveGradeBand,
          color: Theme.of(context).colorScheme.primary,
          textColor: Theme.of(context).colorScheme.onPrimary,
        ),
        _AnimatedButton(
          label: 'Secondary',
          gradeBand: effectiveGradeBand,
          color: Theme.of(context).colorScheme.secondaryContainer,
          textColor: Theme.of(context).colorScheme.onSecondaryContainer,
        ),
        _AnimatedButton(
          label: 'Outlined',
          gradeBand: effectiveGradeBand,
          color: Colors.transparent,
          textColor: Theme.of(context).colorScheme.primary,
          outlined: true,
        ),
      ],
    );
  }
}

class _AnimatedButton extends StatefulWidget {
  const _AnimatedButton({
    required this.label,
    required this.gradeBand,
    required this.color,
    required this.textColor,
    this.outlined = false,
  });

  final String label;
  final AivoGradeBand gradeBand;
  final Color color;
  final Color textColor;
  final bool outlined;

  @override
  State<_AnimatedButton> createState() => _AnimatedButtonState();
}

class _AnimatedButtonState extends State<_AnimatedButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    final durations = AivoDurationConfig.forGradeBand(widget.gradeBand);
    final scales = AivoScaleConfig.forGradeBand(widget.gradeBand);

    _controller = AnimationController(
      vsync: this,
      duration: durations.fast,
    );

    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: scales.press,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: AivoCurves.bounceForGradeBand(widget.gradeBand),
    ));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    setState(() => _isPressed = true);
    _controller.forward();
  }

  void _onTapUp(TapUpDetails details) {
    setState(() => _isPressed = false);
    _controller.reverse();
  }

  void _onTapCancel() {
    setState(() => _isPressed = false);
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: widget.color,
                borderRadius: BorderRadius.circular(
                  _getButtonRadius(widget.gradeBand),
                ),
                border: widget.outlined
                    ? Border.all(
                        color: widget.textColor,
                        width: 2,
                      )
                    : null,
                boxShadow: widget.outlined
                    ? null
                    : [
                        BoxShadow(
                          color: widget.color.withValues(
                            alpha: _isPressed ? 0.2 : 0.3,
                          ),
                          blurRadius: _isPressed ? 4 : 8,
                          offset: Offset(0, _isPressed ? 2 : 4),
                        ),
                      ],
              ),
              child: Text(
                widget.label,
                style: TextStyle(
                  color: widget.textColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  double _getButtonRadius(AivoGradeBand band) {
    return switch (band) {
      AivoGradeBand.k5 => 20,
      AivoGradeBand.g6_8 => 12,
      AivoGradeBand.g9_12 => 8,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PRESENCE ANIMATION DEMO
// ══════════════════════════════════════════════════════════════════════════════

class _PresenceAnimationDemo extends StatefulWidget {
  const _PresenceAnimationDemo({this.gradeBand});

  final AivoGradeBand? gradeBand;

  @override
  State<_PresenceAnimationDemo> createState() => _PresenceAnimationDemoState();
}

class _PresenceAnimationDemoState extends State<_PresenceAnimationDemo> {
  bool _isVisible = true;

  @override
  Widget build(BuildContext context) {
    final effectiveGradeBand =
        widget.gradeBand ?? AivoTheme.gradeBandOf(context);
    final durations = AivoDurationConfig.forGradeBand(effectiveGradeBand);

    return Column(
      children: [
        Row(
          children: [
            Text(
              'Toggle Visibility',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const Spacer(),
            Switch(
              value: _isVisible,
              onChanged: (value) => setState(() => _isVisible = value),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 120,
          child: Center(
            child: AivoAnimatedPresence(
              visible: _isVisible,
              gradeBand: effectiveGradeBand,
              duration: durations.base,
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.check_circle,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Animated Content',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REDUCED MOTION DEMO
// ══════════════════════════════════════════════════════════════════════════════

class _ReducedMotionDemo extends StatelessWidget {
  const _ReducedMotionDemo({this.gradeBand});

  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final isReducedMotion = AivoMotion.isReducedMotion(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isReducedMotion
            ? Theme.of(context).colorScheme.errorContainer.withValues(alpha: 0.3)
            : Theme.of(context).colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isReducedMotion
              ? Theme.of(context).colorScheme.error
              : Theme.of(context).colorScheme.outline,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isReducedMotion
                    ? Icons.accessibility_new
                    : Icons.animation,
                color: isReducedMotion
                    ? Theme.of(context).colorScheme.error
                    : Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(width: 12),
              Text(
                isReducedMotion
                    ? 'Reduced Motion Enabled'
                    : 'Animations Active',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            isReducedMotion
                ? 'Animations are disabled or minimized based on system preferences. '
                    'Fast and base durations become instant, slow becomes 150ms. '
                    'Easing curves become linear.'
                : 'The system has not requested reduced motion. '
                    'All animations will play at normal speed with appropriate easing.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
                ),
          ),
          const SizedBox(height: 16),
          _ReducedMotionComparisonTable(),
        ],
      ),
    );
  }
}

class _ReducedMotionComparisonTable extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final normal = AivoDurationConfig.navigator;
    final reduced = AivoDurationConfig.reduced;

    return Table(
      columnWidths: const {
        0: FlexColumnWidth(1),
        1: FlexColumnWidth(1),
        2: FlexColumnWidth(1),
      },
      children: [
        TableRow(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHigh,
          ),
          children: [
            _TableCell(text: 'Duration', isHeader: true),
            _TableCell(text: 'Normal', isHeader: true),
            _TableCell(text: 'Reduced', isHeader: true),
          ],
        ),
        TableRow(
          children: [
            _TableCell(text: 'Fast'),
            _TableCell(text: '${normal.fast.inMilliseconds}ms'),
            _TableCell(text: '${reduced.fast.inMilliseconds}ms'),
          ],
        ),
        TableRow(
          children: [
            _TableCell(text: 'Base'),
            _TableCell(text: '${normal.base.inMilliseconds}ms'),
            _TableCell(text: '${reduced.base.inMilliseconds}ms'),
          ],
        ),
        TableRow(
          children: [
            _TableCell(text: 'Slow'),
            _TableCell(text: '${normal.slow.inMilliseconds}ms'),
            _TableCell(text: '${reduced.slow.inMilliseconds}ms'),
          ],
        ),
      ],
    );
  }
}

class _TableCell extends StatelessWidget {
  const _TableCell({
    required this.text,
    this.isHeader = false,
  });

  final String text;
  final bool isHeader;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8),
      child: Text(
        text,
        style: isHeader
            ? Theme.of(context).textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                )
            : Theme.of(context).textTheme.bodySmall,
        textAlign: TextAlign.center,
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GRADE BAND COMPARISON DEMO
// ══════════════════════════════════════════════════════════════════════════════

class _GradeBandComparisonDemo extends StatefulWidget {
  const _GradeBandComparisonDemo();

  @override
  State<_GradeBandComparisonDemo> createState() =>
      _GradeBandComparisonDemoState();
}

class _GradeBandComparisonDemoState extends State<_GradeBandComparisonDemo>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          'Same animation with different grade band configurations:',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _GradeBandAnimationCard(
                gradeBand: AivoGradeBand.k5,
                controller: _controller,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _GradeBandAnimationCard(
                gradeBand: AivoGradeBand.g6_8,
                controller: _controller,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _GradeBandAnimationCard(
                gradeBand: AivoGradeBand.g9_12,
                controller: _controller,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _GradeBandAnimationCard extends StatelessWidget {
  const _GradeBandAnimationCard({
    required this.gradeBand,
    required this.controller,
  });

  final AivoGradeBand gradeBand;
  final AnimationController controller;

  @override
  Widget build(BuildContext context) {
    final durations = AivoDurationConfig.forGradeBand(gradeBand);
    final scales = AivoScaleConfig.forGradeBand(gradeBand);
    final curve = AivoCurves.bounceForGradeBand(gradeBand);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline,
        ),
      ),
      child: Column(
        children: [
          Text(
            _gradeBandLabel(gradeBand),
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          Text(
            durations.style,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 60,
            child: Center(
              child: AnimatedBuilder(
                animation: controller,
                builder: (context, child) {
                  final curvedValue = curve.transform(controller.value);
                  final scale =
                      1.0 + (scales.hover - 1.0) * curvedValue;

                  return Transform.scale(
                    scale: scale,
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: _getGradeBandColor(gradeBand),
                        borderRadius: BorderRadius.circular(
                          _getGradeBandRadius(gradeBand),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${durations.base.inMilliseconds}ms base',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontFamily: 'monospace',
                ),
          ),
        ],
      ),
    );
  }

  Color _getGradeBandColor(AivoGradeBand band) {
    return switch (band) {
      AivoGradeBand.k5 => AivoBrand.primary,
      AivoGradeBand.g6_8 => AivoBrand.teal,
      AivoGradeBand.g9_12 => AivoBrand.navy,
    };
  }

  double _getGradeBandRadius(AivoGradeBand band) {
    return switch (band) {
      AivoGradeBand.k5 => 20,
      AivoGradeBand.g6_8 => 12,
      AivoGradeBand.g9_12 => 8,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

String _gradeBandLabel(AivoGradeBand band) {
  return switch (band) {
    AivoGradeBand.k5 => 'Explorer (Pre-K–5)',
    AivoGradeBand.g6_8 => 'Navigator (6-8)',
    AivoGradeBand.g9_12 => 'Scholar (9-12)',
  };
}
