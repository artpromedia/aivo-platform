/// Loading Widgets
///
/// Skeleton loaders and shimmer effects for loading states.
library;

import 'package:flutter/material.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// SHIMMER WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

/// A shimmer effect widget for loading placeholders.
class ShimmerWidget extends StatefulWidget {
  const ShimmerWidget({
    super.key,
    required this.child,
    this.baseColor,
    this.highlightColor,
    this.enabled = true,
  });

  /// The child widget to apply shimmer to.
  final Widget child;

  /// Base color for shimmer effect.
  final Color? baseColor;

  /// Highlight color for shimmer effect.
  final Color? highlightColor;

  /// Whether shimmer animation is enabled.
  final bool enabled;

  @override
  State<ShimmerWidget> createState() => _ShimmerWidgetState();
}

class _ShimmerWidgetState extends State<ShimmerWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled) {
      return widget.child;
    }

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    final baseColor = widget.baseColor ??
        (isDark ? Colors.grey.shade800 : Colors.grey.shade300);
    final highlightColor = widget.highlightColor ??
        (isDark ? Colors.grey.shade600 : Colors.grey.shade100);

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                baseColor,
                highlightColor,
                baseColor,
              ],
              stops: [
                _controller.value - 0.3,
                _controller.value,
                _controller.value + 0.3,
              ].map((e) => e.clamp(0.0, 1.0)).toList(),
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON SHAPES
// ═══════════════════════════════════════════════════════════════════════════════

/// A rectangular skeleton placeholder.
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    super.key,
    this.width,
    this.height = 16,
    this.borderRadius = 4,
  });

  final double? width;
  final double height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade800 : Colors.grey.shade300,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// A circular skeleton placeholder.
class SkeletonCircle extends StatelessWidget {
  const SkeletonCircle({
    super.key,
    this.size = 48,
  });

  final double size;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade800 : Colors.grey.shade300,
        shape: BoxShape.circle,
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Skeleton loader for text lines.
class SkeletonText extends StatelessWidget {
  const SkeletonText({
    super.key,
    this.lines = 3,
    this.spacing = 8,
    this.lastLineWidth = 0.6,
  });

  final int lines;
  final double spacing;
  final double lastLineWidth;

  @override
  Widget build(BuildContext context) {
    return ShimmerWidget(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: List.generate(lines, (index) {
          final isLast = index == lines - 1;
          return Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : spacing),
            child: SkeletonBox(
              width: isLast ? double.infinity * lastLineWidth : double.infinity,
              height: 14,
            ),
          );
        }),
      ),
    );
  }
}

/// Skeleton loader for a card with avatar and text.
class SkeletonCard extends StatelessWidget {
  const SkeletonCard({
    super.key,
    this.hasAvatar = true,
    this.titleLines = 1,
    this.subtitleLines = 2,
    this.hasAction = false,
    this.padding = const EdgeInsets.all(16),
  });

  final bool hasAvatar;
  final int titleLines;
  final int subtitleLines;
  final bool hasAction;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return ShimmerWidget(
      child: Container(
        padding: padding,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (hasAvatar) ...[
              const SkeletonCircle(size: 48),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  for (int i = 0; i < titleLines; i++) ...[
                    SkeletonBox(
                      width: i == titleLines - 1
                          ? double.infinity * 0.7
                          : double.infinity,
                      height: 18,
                    ),
                    if (i < titleLines - 1) const SizedBox(height: 4),
                  ],
                  if (subtitleLines > 0) const SizedBox(height: 8),
                  // Subtitle
                  for (int i = 0; i < subtitleLines; i++) ...[
                    SkeletonBox(
                      width: i == subtitleLines - 1
                          ? double.infinity * 0.5
                          : double.infinity,
                      height: 14,
                    ),
                    if (i < subtitleLines - 1) const SizedBox(height: 4),
                  ],
                ],
              ),
            ),
            if (hasAction) ...[
              const SizedBox(width: 12),
              const SkeletonBox(width: 24, height: 24),
            ],
          ],
        ),
      ),
    );
  }
}

/// Skeleton loader for a list of items.
class SkeletonList extends StatelessWidget {
  const SkeletonList({
    super.key,
    this.itemCount = 5,
    this.itemBuilder,
    this.separator,
  });

  final int itemCount;
  final Widget Function(BuildContext, int)? itemBuilder;
  final Widget? separator;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: itemCount,
      separatorBuilder: (context, index) =>
          separator ?? const SizedBox(height: 8),
      itemBuilder: (context, index) =>
          itemBuilder?.call(context, index) ?? const SkeletonCard(),
    );
  }
}

/// Skeleton loader for a grid of items.
class SkeletonGrid extends StatelessWidget {
  const SkeletonGrid({
    super.key,
    this.itemCount = 6,
    this.crossAxisCount = 2,
    this.childAspectRatio = 1.0,
    this.spacing = 16,
    this.itemBuilder,
  });

  final int itemCount;
  final int crossAxisCount;
  final double childAspectRatio;
  final double spacing;
  final Widget Function(BuildContext, int)? itemBuilder;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: childAspectRatio,
        crossAxisSpacing: spacing,
        mainAxisSpacing: spacing,
      ),
      itemCount: itemCount,
      itemBuilder: (context, index) =>
          itemBuilder?.call(context, index) ?? _defaultGridItem(context),
    );
  }

  Widget _defaultGridItem(BuildContext context) {
    return ShimmerWidget(
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark
              ? Colors.grey.shade800
              : Colors.grey.shade300,
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}

/// Skeleton loader for subject/topic cards.
class SkeletonSubjectCard extends StatelessWidget {
  const SkeletonSubjectCard({super.key});

  @override
  Widget build(BuildContext context) {
    return ShimmerWidget(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark
              ? Colors.grey.shade800
              : Colors.grey.shade200,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const SkeletonCircle(size: 40),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SkeletonBox(width: 120, height: 16),
                      const SizedBox(height: 4),
                      SkeletonBox(width: 80, height: 12),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SkeletonBox(width: double.infinity, height: 8, borderRadius: 4),
            const SizedBox(height: 8),
            SkeletonBox(width: 60, height: 12),
          ],
        ),
      ),
    );
  }
}

/// Skeleton loader for profile header.
class SkeletonProfileHeader extends StatelessWidget {
  const SkeletonProfileHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return ShimmerWidget(
      child: Column(
        children: [
          const SkeletonCircle(size: 80),
          const SizedBox(height: 12),
          SkeletonBox(width: 120, height: 20),
          const SizedBox(height: 8),
          SkeletonBox(width: 80, height: 14),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _statBox(),
              const SizedBox(width: 24),
              _statBox(),
              const SizedBox(width: 24),
              _statBox(),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statBox() {
    return Column(
      children: [
        SkeletonBox(width: 40, height: 24),
        const SizedBox(height: 4),
        SkeletonBox(width: 50, height: 12),
      ],
    );
  }
}

/// Skeleton loader for session/activity item.
class SkeletonSessionItem extends StatelessWidget {
  const SkeletonSessionItem({super.key});

  @override
  Widget build(BuildContext context) {
    return ShimmerWidget(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark
              ? Colors.grey.shade800
              : Colors.grey.shade200,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            SkeletonBox(width: 48, height: 48, borderRadius: 8),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(width: double.infinity, height: 16),
                  const SizedBox(height: 6),
                  SkeletonBox(width: 100, height: 12),
                ],
              ),
            ),
            const SizedBox(width: 12),
            SkeletonBox(width: 50, height: 20, borderRadius: 10),
          ],
        ),
      ),
    );
  }
}
