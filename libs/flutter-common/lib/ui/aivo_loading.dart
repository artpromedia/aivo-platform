/// Aivo Loading Components
///
/// Consistent loading state widgets across apps with grade-band awareness.
/// Aligned with web loading-states component styling.
library;

import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_shadows.dart';
import '../theme/aivo_theme.dart';

/// Spinner size variants matching web.
enum AivoSpinnerSize {
  /// Small spinner (16px) - h-4 equivalent
  small,

  /// Medium spinner (24px) - h-6 equivalent
  medium,

  /// Large spinner (40px) - h-10 equivalent
  large,
}

/// Loading spinner widget matching web Spinner component.
class AivoSpinner extends StatelessWidget {
  const AivoSpinner({
    super.key,
    this.size = AivoSpinnerSize.medium,
    this.color,
    this.strokeWidth,
  });

  /// Size variant.
  final AivoSpinnerSize size;

  /// Custom color (defaults to primary).
  final Color? color;

  /// Custom stroke width.
  final double? strokeWidth;

  /// Small spinner factory.
  static Widget small({Color? color}) =>
      AivoSpinner(size: AivoSpinnerSize.small, color: color);

  /// Medium spinner factory.
  static Widget medium({Color? color}) =>
      AivoSpinner(size: AivoSpinnerSize.medium, color: color);

  /// Large spinner factory.
  static Widget large({Color? color}) =>
      AivoSpinner(size: AivoSpinnerSize.large, color: color);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final (dimension, stroke) = switch (size) {
      AivoSpinnerSize.small => (16.0, strokeWidth ?? 2.0),
      AivoSpinnerSize.medium => (24.0, strokeWidth ?? 2.5),
      AivoSpinnerSize.large => (40.0, strokeWidth ?? 3.0),
    };

    return SizedBox(
      width: dimension,
      height: dimension,
      child: CircularProgressIndicator(
        strokeWidth: stroke,
        valueColor: AlwaysStoppedAnimation(
          color ?? theme.colorScheme.primary,
        ),
      ),
    );
  }
}

/// Loading overlay matching web LoadingOverlay component.
class AivoLoadingOverlay extends StatelessWidget {
  const AivoLoadingOverlay({
    super.key,
    required this.isLoading,
    required this.child,
    this.message,
    this.spinnerSize = AivoSpinnerSize.large,
    this.showBranding = false,
    this.gradeBand,
  });

  /// Whether to show the overlay.
  final bool isLoading;

  /// Child widget to overlay.
  final Widget child;

  /// Optional loading message.
  final String? message;

  /// Spinner size.
  final AivoSpinnerSize spinnerSize;

  /// Whether to show Aivo branding.
  final bool showBranding;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand =
        gradeBand ?? AivoTheme.gradeBandOf(context);

    final radius = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusXl,
      AivoGradeBand.g6_8 => AivoBrand.radiusLg,
      AivoGradeBand.g9_12 => AivoBrand.radiusMd,
    };

    return Stack(
      children: [
        child,
        if (isLoading)
          Positioned.fill(
            child: Container(
              color: Colors.black.withValues(alpha: 0.5),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface,
                    borderRadius: BorderRadius.circular(radius),
                    boxShadow: AivoShadows.raised,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (showBranding) ...[
                        Icon(
                          Icons.auto_awesome,
                          size: 32,
                          color: theme.colorScheme.primary,
                        ),
                        const SizedBox(height: 16),
                      ],
                      AivoSpinner(size: spinnerSize),
                      if (message != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          message!,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.7),
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
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

/// Full-page loading state with branding.
class AivoFullPageLoading extends StatelessWidget {
  const AivoFullPageLoading({
    super.key,
    this.message,
    this.showBranding = true,
  });

  /// Loading message.
  final String? message;

  /// Whether to show branding.
  final bool showBranding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (showBranding) ...[
              Icon(
                Icons.auto_awesome,
                size: 48,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: 8),
              Text(
                'Aivo',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(height: 32),
            ],
            AivoSpinner.large(),
            if (message != null) ...[
              const SizedBox(height: 24),
              Text(
                message!,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Skeleton loading placeholder matching web Skeleton component.
class AivoSkeleton extends StatefulWidget {
  const AivoSkeleton({
    super.key,
    this.width,
    this.height,
    this.borderRadius,
    this.gradeBand,
  });

  /// Skeleton width (defaults to double.infinity).
  final double? width;

  /// Skeleton height (defaults to 16).
  final double? height;

  /// Custom border radius.
  final double? borderRadius;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  /// Create circular skeleton.
  static Widget circle({
    required double size,
    AivoGradeBand? gradeBand,
  }) {
    return _AivoSkeletonCircle(size: size, gradeBand: gradeBand);
  }

  /// Create text line skeleton.
  static Widget text({
    double? width,
    double height = 14,
    AivoGradeBand? gradeBand,
  }) {
    return AivoSkeleton(
      width: width,
      height: height,
      gradeBand: gradeBand,
    );
  }

  @override
  State<AivoSkeleton> createState() => _AivoSkeletonState();
}

class _AivoSkeletonState extends State<AivoSkeleton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _animation = Tween<double>(begin: 0.3, end: 0.7).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand =
        widget.gradeBand ?? AivoTheme.gradeBandOf(context);

    final radius = widget.borderRadius ??
        switch (effectiveGradeBand) {
          AivoGradeBand.k5 => AivoBrand.radiusMd,
          AivoGradeBand.g6_8 => AivoBrand.radiusSm,
          AivoGradeBand.g9_12 => AivoBrand.radiusXs,
        };

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width ?? double.infinity,
          height: widget.height ?? 16,
          decoration: BoxDecoration(
            color: theme.colorScheme.onSurface.withValues(alpha: _animation.value * 0.15),
            borderRadius: BorderRadius.circular(radius),
          ),
        );
      },
    );
  }
}

class _AivoSkeletonCircle extends StatefulWidget {
  const _AivoSkeletonCircle({
    required this.size,
    this.gradeBand,
  });

  final double size;
  final AivoGradeBand? gradeBand;

  @override
  State<_AivoSkeletonCircle> createState() => _AivoSkeletonCircleState();
}

class _AivoSkeletonCircleState extends State<_AivoSkeletonCircle>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _animation = Tween<double>(begin: 0.3, end: 0.7).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            color: theme.colorScheme.onSurface.withValues(alpha: _animation.value * 0.15),
            shape: BoxShape.circle,
          ),
        );
      },
    );
  }
}

/// Card skeleton matching web CardSkeleton component.
class AivoCardSkeleton extends StatelessWidget {
  const AivoCardSkeleton({
    super.key,
    this.height = 160,
    this.showImage = true,
    this.gradeBand,
  });

  /// Card height.
  final double height;

  /// Whether to show image placeholder.
  final bool showImage;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand =
        gradeBand ?? AivoTheme.gradeBandOf(context);

    final radius = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusLg,
      AivoGradeBand.g6_8 => AivoBrand.radiusMd,
      AivoGradeBand.g9_12 => AivoBrand.radiusSm,
    };

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (showImage) ...[
            AivoSkeleton(
              height: 80,
              borderRadius: radius - 4,
              gradeBand: gradeBand,
            ),
            const SizedBox(height: 12),
          ],
          AivoSkeleton(
            width: 120,
            height: 14,
            gradeBand: gradeBand,
          ),
          const SizedBox(height: 8),
          AivoSkeleton(
            height: 12,
            gradeBand: gradeBand,
          ),
          const SizedBox(height: 4),
          AivoSkeleton(
            width: 200,
            height: 12,
            gradeBand: gradeBand,
          ),
        ],
      ),
    );
  }
}

/// List item skeleton matching web ListItemSkeleton component.
class AivoListItemSkeleton extends StatelessWidget {
  const AivoListItemSkeleton({
    super.key,
    this.showAvatar = true,
    this.showTrailing = false,
    this.gradeBand,
  });

  /// Whether to show avatar circle.
  final bool showAvatar;

  /// Whether to show trailing element.
  final bool showTrailing;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          if (showAvatar) ...[
            AivoSkeleton.circle(size: 40, gradeBand: gradeBand),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AivoSkeleton(
                  width: 140,
                  height: 14,
                  gradeBand: gradeBand,
                ),
                const SizedBox(height: 6),
                AivoSkeleton(
                  width: 200,
                  height: 12,
                  gradeBand: gradeBand,
                ),
              ],
            ),
          ),
          if (showTrailing) ...[
            const SizedBox(width: 12),
            AivoSkeleton(
              width: 24,
              height: 24,
              borderRadius: 12,
              gradeBand: gradeBand,
            ),
          ],
        ],
      ),
    );
  }
}

/// Linear progress indicator.
class AivoLinearProgress extends StatelessWidget {
  const AivoLinearProgress({
    super.key,
    this.value,
    this.height = 4,
    this.color,
    this.backgroundColor,
    this.gradeBand,
  });

  /// Progress value (0.0 to 1.0). Null for indeterminate.
  final double? value;

  /// Bar height.
  final double height;

  /// Progress color.
  final Color? color;

  /// Background color.
  final Color? backgroundColor;

  /// Grade band for styling.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveGradeBand =
        gradeBand ?? AivoTheme.gradeBandOf(context);

    final radius = switch (effectiveGradeBand) {
      AivoGradeBand.k5 => height / 2,
      AivoGradeBand.g6_8 => height / 2,
      AivoGradeBand.g9_12 => height / 4,
    };

    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: LinearProgressIndicator(
        value: value,
        minHeight: height,
        valueColor: AlwaysStoppedAnimation(
          color ?? theme.colorScheme.primary,
        ),
        backgroundColor:
            backgroundColor ?? theme.colorScheme.surfaceContainerHighest,
      ),
    );
  }
}

/// Circular progress indicator with percentage.
class AivoCircularProgress extends StatelessWidget {
  const AivoCircularProgress({
    super.key,
    this.value,
    this.size = 48,
    this.strokeWidth = 4,
    this.color,
    this.backgroundColor,
    this.showPercentage = false,
  });

  /// Progress value (0.0 to 1.0). Null for indeterminate.
  final double? value;

  /// Widget size.
  final double size;

  /// Stroke width.
  final double strokeWidth;

  /// Progress color.
  final Color? color;

  /// Background color.
  final Color? backgroundColor;

  /// Whether to show percentage text.
  final bool showPercentage;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: value,
            strokeWidth: strokeWidth,
            valueColor: AlwaysStoppedAnimation(
              color ?? theme.colorScheme.primary,
            ),
            backgroundColor:
                backgroundColor ?? theme.colorScheme.surfaceContainerHighest,
          ),
          if (showPercentage && value != null)
            Text(
              '${(value! * 100).round()}%',
              style: theme.textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
        ],
      ),
    );
  }
}
