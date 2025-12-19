/// Accidental Touch Filter Widget - ND-3.3
///
/// Filters out unintended touches at screen edges and provides
/// protection against accidental activation.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../motor_profile_provider.dart';

/// A widget that filters out accidental touches at screen edges
class AccidentalTouchFilter extends StatelessWidget {
  final Widget child;

  /// Override the edge margin from profile (pixels)
  final double? edgeMargin;

  /// Callback when a touch is filtered (optional, for logging)
  final VoidCallback? onTouchFiltered;

  const AccidentalTouchFilter({
    super.key,
    required this.child,
    this.edgeMargin,
    this.onTouchFiltered,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final filterEnabled = motorProfile.accidentalTouchFilter;
        final margin = edgeMargin ?? motorProfile.edgeIgnoreMargin.toDouble();

        if (!filterEnabled || margin <= 0) {
          return child;
        }

        return _AccidentalTouchFilterListener(
          edgeMargin: margin,
          onTouchFiltered: onTouchFiltered,
          child: child,
        );
      },
    );
  }
}

class _AccidentalTouchFilterListener extends StatefulWidget {
  final Widget child;
  final double edgeMargin;
  final VoidCallback? onTouchFiltered;

  const _AccidentalTouchFilterListener({
    required this.child,
    required this.edgeMargin,
    this.onTouchFiltered,
  });

  @override
  State<_AccidentalTouchFilterListener> createState() =>
      _AccidentalTouchFilterListenerState();
}

class _AccidentalTouchFilterListenerState
    extends State<_AccidentalTouchFilterListener> {
  bool _isFiltering = false;

  bool _isInEdgeZone(Offset position, Size screenSize) {
    final margin = widget.edgeMargin;

    // Check if touch is within edge margin
    if (position.dx < margin) return true; // Left edge
    if (position.dx > screenSize.width - margin) return true; // Right edge
    if (position.dy < margin) return true; // Top edge
    if (position.dy > screenSize.height - margin) return true; // Bottom edge

    return false;
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;

    return Stack(
      children: [
        Listener(
          onPointerDown: (event) {
            if (_isInEdgeZone(event.position, screenSize)) {
              setState(() => _isFiltering = true);
              widget.onTouchFiltered?.call();
              HapticFeedback.lightImpact();
            }
          },
          onPointerUp: (_) {
            setState(() => _isFiltering = false);
          },
          onPointerCancel: (_) {
            setState(() => _isFiltering = false);
          },
          behavior: HitTestBehavior.translucent,
          child: widget.child,
        ),

        // Visual indicator for edge zones (debug/accessibility)
        if (_isFiltering)
          Positioned.fill(
            child: IgnorePointer(
              child: Container(
                decoration: BoxDecoration(
                  border: Border.all(
                    color: Colors.orange.withOpacity(0.5),
                    width: widget.edgeMargin,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Shows visual edge zones for configuration/testing
class EdgeZoneVisualizer extends StatelessWidget {
  final double edgeMargin;
  final Color zoneColor;
  final bool showLabels;

  const EdgeZoneVisualizer({
    super.key,
    required this.edgeMargin,
    this.zoneColor = Colors.orange,
    this.showLabels = false,
  });

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(
        size: Size.infinite,
        painter: _EdgeZonePainter(
          edgeMargin: edgeMargin,
          color: zoneColor.withOpacity(0.2),
          borderColor: zoneColor,
        ),
      ),
    );
  }
}

class _EdgeZonePainter extends CustomPainter {
  final double edgeMargin;
  final Color color;
  final Color borderColor;

  _EdgeZonePainter({
    required this.edgeMargin,
    required this.color,
    required this.borderColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final fillPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    // Left edge
    canvas.drawRect(
      Rect.fromLTWH(0, 0, edgeMargin, size.height),
      fillPaint,
    );

    // Right edge
    canvas.drawRect(
      Rect.fromLTWH(size.width - edgeMargin, 0, edgeMargin, size.height),
      fillPaint,
    );

    // Top edge (excluding corners already drawn)
    canvas.drawRect(
      Rect.fromLTWH(edgeMargin, 0, size.width - 2 * edgeMargin, edgeMargin),
      fillPaint,
    );

    // Bottom edge (excluding corners already drawn)
    canvas.drawRect(
      Rect.fromLTWH(
        edgeMargin,
        size.height - edgeMargin,
        size.width - 2 * edgeMargin,
        edgeMargin,
      ),
      fillPaint,
    );

    // Draw border around safe zone
    canvas.drawRect(
      Rect.fromLTWH(
        edgeMargin,
        edgeMargin,
        size.width - 2 * edgeMargin,
        size.height - 2 * edgeMargin,
      ),
      borderPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _EdgeZonePainter oldDelegate) {
    return oldDelegate.edgeMargin != edgeMargin ||
        oldDelegate.color != color ||
        oldDelegate.borderColor != borderColor;
  }
}

/// A safe zone wrapper that ensures content stays away from edges
class SafeZoneWrapper extends StatelessWidget {
  final Widget child;

  /// Additional padding beyond the edge margin
  final double extraPadding;

  const SafeZoneWrapper({
    super.key,
    required this.child,
    this.extraPadding = 0,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final filterEnabled = motorProfile.accidentalTouchFilter;
        final margin = motorProfile.edgeIgnoreMargin.toDouble();

        if (!filterEnabled || margin <= 0) {
          return child;
        }

        final totalPadding = margin + extraPadding;

        return Padding(
          padding: EdgeInsets.all(totalPadding),
          child: child,
        );
      },
    );
  }
}

/// Settings panel for configuring accidental touch filter
class AccidentalTouchFilterSettings extends StatelessWidget {
  final double currentMargin;
  final void Function(double) onMarginChanged;
  final bool filterEnabled;
  final void Function(bool) onEnabledChanged;

  const AccidentalTouchFilterSettings({
    super.key,
    required this.currentMargin,
    required this.onMarginChanged,
    required this.filterEnabled,
    required this.onEnabledChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Enable toggle
            SwitchListTile(
              title: Text(
                'Accidental Touch Filter',
                style: TextStyle(fontSize: 16 * multiplier),
              ),
              subtitle: Text(
                'Ignore touches near screen edges',
                style: TextStyle(fontSize: 12 * multiplier),
              ),
              value: filterEnabled,
              onChanged: onEnabledChanged,
            ),

            if (filterEnabled) ...[
              const SizedBox(height: 16),

              // Margin slider
              Text(
                'Edge Margin: ${currentMargin.round()} pixels',
                style: TextStyle(
                  fontSize: 14 * multiplier,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Slider(
                value: currentMargin,
                min: 10,
                max: 100,
                divisions: 18,
                label: '${currentMargin.round()}px',
                onChanged: onMarginChanged,
              ),

              const SizedBox(height: 16),

              // Preview
              Text(
                'Preview',
                style: TextStyle(
                  fontSize: 14 * multiplier,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                height: 150,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Stack(
                    children: [
                      const Center(
                        child: Text('Safe Touch Area'),
                      ),
                      EdgeZoneVisualizer(edgeMargin: currentMargin / 2),
                    ],
                  ),
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}
