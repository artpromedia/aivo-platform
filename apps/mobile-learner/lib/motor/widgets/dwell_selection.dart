/// Dwell Selection Widget - ND-3.3
///
/// Enables dwell-based selection for users who cannot tap.
/// Supports eye-gaze and hover-based interaction.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../motor_profile_provider.dart';

/// A widget that enables dwell-based selection
class DwellSelection extends StatefulWidget {
  final Widget child;
  final VoidCallback onSelected;
  final int? dwellTimeMs;
  final String? indicatorStyle; // 'circle', 'shrink', 'fill'
  final bool enabled;

  const DwellSelection({
    super.key,
    required this.child,
    required this.onSelected,
    this.dwellTimeMs,
    this.indicatorStyle,
    this.enabled = true,
  });

  @override
  State<DwellSelection> createState() => _DwellSelectionState();
}

class _DwellSelectionState extends State<DwellSelection>
    with SingleTickerProviderStateMixin {
  late AnimationController _dwellController;
  bool _isHovering = false;
  bool _selectionTriggered = false;

  @override
  void initState() {
    super.initState();
    _dwellController = AnimationController(vsync: this);
    _dwellController.addStatusListener(_onDwellComplete);
  }

  void _onDwellComplete(AnimationStatus status) {
    if (status == AnimationStatus.completed && !_selectionTriggered) {
      _selectionTriggered = true;
      HapticFeedback.heavyImpact();
      widget.onSelected();
    }
  }

  @override
  void dispose() {
    _dwellController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled) {
      return GestureDetector(
        onTap: widget.onSelected,
        child: widget.child,
      );
    }

    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final dwellEnabled = motorProfile.dwellSelectionEnabled;

        if (!dwellEnabled) {
          // Fall back to regular tap
          return GestureDetector(
            onTap: widget.onSelected,
            child: widget.child,
          );
        }

        final dwellTime =
            widget.dwellTimeMs ?? motorProfile.dwellTimeMs;
        final style =
            widget.indicatorStyle ?? motorProfile.dwellIndicatorStyle;

        _dwellController.duration = Duration(milliseconds: dwellTime);

        return MouseRegion(
          onEnter: (_) => _startDwell(),
          onExit: (_) => _cancelDwell(),
          child: GestureDetector(
            onTapDown: (_) => _startDwell(),
            onTapUp: (_) => _cancelDwell(),
            onTapCancel: _cancelDwell,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Original widget
                widget.child,

                // Dwell progress indicator
                if (_isHovering)
                  Positioned.fill(
                    child: AnimatedBuilder(
                      animation: _dwellController,
                      builder: (context, child) {
                        return _buildProgressIndicator(
                          _dwellController.value,
                          style,
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _startDwell() {
    setState(() {
      _isHovering = true;
      _selectionTriggered = false;
    });
    _dwellController.forward(from: 0);
  }

  void _cancelDwell() {
    setState(() => _isHovering = false);
    _dwellController.stop();
    _dwellController.reset();
  }

  Widget _buildProgressIndicator(double progress, String style) {
    switch (style) {
      case 'circle':
        return CustomPaint(
          painter: _CircleDwellPainter(
            progress: progress,
            color: Theme.of(context).primaryColor,
          ),
        );

      case 'shrink':
        return AnimatedContainer(
          duration: const Duration(milliseconds: 50),
          decoration: BoxDecoration(
            border: Border.all(
              color: Theme.of(context).primaryColor,
              width: 3 + (progress * 3),
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Transform.scale(
            scale: 1 - (progress * 0.1),
            child: const SizedBox.expand(),
          ),
        );

      case 'fill':
        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            color:
                Theme.of(context).primaryColor.withOpacity(progress * 0.3),
          ),
        );

      default:
        return CustomPaint(
          painter: _CircleDwellPainter(
            progress: progress,
            color: Theme.of(context).primaryColor,
          ),
        );
    }
  }
}

class _CircleDwellPainter extends CustomPainter {
  final double progress;
  final Color color;

  _CircleDwellPainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.shortestSide / 2 - 4;

    // Background circle
    final bgPaint = Paint()
      ..color = color.withOpacity(0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;
    canvas.drawCircle(center, radius, bgPaint);

    // Progress arc
    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    const startAngle = -3.14159 / 2;
    final sweepAngle = 2 * 3.14159 * progress;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _CircleDwellPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}

/// A button specifically designed for dwell selection
class DwellButton extends StatelessWidget {
  final Widget child;
  final VoidCallback onSelected;
  final int? dwellTimeMs;
  final String? indicatorStyle;
  final EdgeInsets? padding;
  final Color? backgroundColor;
  final BorderRadius? borderRadius;

  const DwellButton({
    super.key,
    required this.child,
    required this.onSelected,
    this.dwellTimeMs,
    this.indicatorStyle,
    this.padding,
    this.backgroundColor,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return DwellSelection(
      onSelected: onSelected,
      dwellTimeMs: dwellTimeMs,
      indicatorStyle: indicatorStyle,
      child: Container(
        padding: padding ?? const EdgeInsets.symmetric(
          horizontal: 24,
          vertical: 16,
        ),
        decoration: BoxDecoration(
          color: backgroundColor ?? Theme.of(context).primaryColor,
          borderRadius: borderRadius ?? BorderRadius.circular(12),
        ),
        child: DefaultTextStyle(
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
          child: child,
        ),
      ),
    );
  }
}

/// Grid of dwell-selectable options
class DwellSelectionGrid extends StatelessWidget {
  final List<DwellOption> options;
  final int crossAxisCount;
  final double spacing;
  final double childAspectRatio;

  const DwellSelectionGrid({
    super.key,
    required this.options,
    this.crossAxisCount = 2,
    this.spacing = 16,
    this.childAspectRatio = 1.0,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: spacing,
        mainAxisSpacing: spacing,
        childAspectRatio: childAspectRatio,
      ),
      itemCount: options.length,
      itemBuilder: (context, index) {
        final option = options[index];
        return DwellSelection(
          onSelected: option.onSelected,
          child: Container(
            decoration: BoxDecoration(
              color: option.backgroundColor ??
                  Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: Theme.of(context).colorScheme.outline.withOpacity(0.3),
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (option.icon != null)
                  Icon(
                    option.icon,
                    size: 48,
                    color: option.iconColor ?? Theme.of(context).primaryColor,
                  ),
                if (option.icon != null && option.label != null)
                  const SizedBox(height: 12),
                if (option.label != null)
                  Text(
                    option.label!,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                    textAlign: TextAlign.center,
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Option for dwell selection grid
class DwellOption {
  final String? label;
  final IconData? icon;
  final Color? iconColor;
  final Color? backgroundColor;
  final VoidCallback onSelected;

  const DwellOption({
    this.label,
    this.icon,
    this.iconColor,
    this.backgroundColor,
    required this.onSelected,
  });
}
