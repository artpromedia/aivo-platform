/// Tremor Filter Widget - ND-3.3
///
/// Provides input smoothing and stabilization for users with tremors.
/// Uses moving average algorithm to filter out unintended movements.

import 'dart:collection';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../motor_profile_provider.dart';

/// A widget wrapper that applies tremor filtering to pointer/touch input
class TremorFilter extends StatefulWidget {
  final Widget child;

  /// Override the smoothing factor from profile (0.0-1.0)
  final double? smoothingFactor;

  /// Override the window size from profile (number of samples)
  final int? windowSize;

  /// Minimum movement threshold to register (pixels)
  final double? movementThreshold;

  const TremorFilter({
    super.key,
    required this.child,
    this.smoothingFactor,
    this.windowSize,
    this.movementThreshold,
  });

  @override
  State<TremorFilter> createState() => _TremorFilterState();
}

class _TremorFilterState extends State<TremorFilter> {
  final Queue<Offset> _positionBuffer = Queue();
  Offset _filteredPosition = Offset.zero;
  Offset _lastReportedPosition = Offset.zero;

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        if (!motorProfile.tremorFilterEnabled) {
          return widget.child;
        }

        final smoothing = widget.smoothingFactor ??
            motorProfile.tremorSmoothingFactor;
        final windowSize = widget.windowSize ?? motorProfile.tremorWindowSize;
        final threshold = widget.movementThreshold ??
            motorProfile.tremorMovementThreshold.toDouble();

        return Listener(
          onPointerMove: (event) {
            _processPointerMove(
              event.position,
              smoothing,
              windowSize,
              threshold,
            );
          },
          behavior: HitTestBehavior.translucent,
          child: widget.child,
        );
      },
    );
  }

  void _processPointerMove(
    Offset position,
    double smoothing,
    int windowSize,
    double threshold,
  ) {
    // Add to buffer
    _positionBuffer.add(position);

    // Maintain window size
    while (_positionBuffer.length > windowSize) {
      _positionBuffer.removeFirst();
    }

    // Calculate moving average
    if (_positionBuffer.isEmpty) {
      return;
    }

    double sumX = 0;
    double sumY = 0;

    for (final pos in _positionBuffer) {
      sumX += pos.dx;
      sumY += pos.dy;
    }

    final avgPosition = Offset(
      sumX / _positionBuffer.length,
      sumY / _positionBuffer.length,
    );

    // Apply exponential smoothing
    _filteredPosition = Offset(
      _filteredPosition.dx * smoothing + avgPosition.dx * (1 - smoothing),
      _filteredPosition.dy * smoothing + avgPosition.dy * (1 - smoothing),
    );

    // Only report movement if above threshold
    final movement = (_filteredPosition - _lastReportedPosition).distance;
    if (movement >= threshold) {
      _lastReportedPosition = _filteredPosition;
    }
  }

  Offset get filteredPosition => _filteredPosition;
}

/// A pointer event filter that smooths input for tremor accommodation
class TremorFilteredPointerListener extends StatefulWidget {
  final Widget child;
  final void Function(Offset)? onPointerMove;
  final void Function(Offset)? onPointerDown;
  final VoidCallback? onPointerUp;

  const TremorFilteredPointerListener({
    super.key,
    required this.child,
    this.onPointerMove,
    this.onPointerDown,
    this.onPointerUp,
  });

  @override
  State<TremorFilteredPointerListener> createState() =>
      _TremorFilteredPointerListenerState();
}

class _TremorFilteredPointerListenerState
    extends State<TremorFilteredPointerListener> {
  final _filter = TremorFilterEngine();

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final enabled = motorProfile.tremorFilterEnabled;

        _filter.configure(
          smoothingFactor: motorProfile.tremorSmoothingFactor,
          windowSize: motorProfile.tremorWindowSize,
          movementThreshold: motorProfile.tremorMovementThreshold.toDouble(),
          enabled: enabled,
        );

        return Listener(
          onPointerDown: (event) {
            final position = enabled
                ? _filter.filter(event.position)
                : event.position;
            widget.onPointerDown?.call(position);
          },
          onPointerMove: (event) {
            final position = enabled
                ? _filter.filter(event.position)
                : event.position;
            widget.onPointerMove?.call(position);
          },
          onPointerUp: (event) {
            widget.onPointerUp?.call();
          },
          behavior: HitTestBehavior.translucent,
          child: widget.child,
        );
      },
    );
  }
}

/// Core tremor filter algorithm
class TremorFilterEngine {
  final Queue<Offset> _buffer = Queue();
  Offset _filteredPosition = Offset.zero;
  Offset _lastReportedPosition = Offset.zero;
  bool _initialized = false;

  double _smoothingFactor = 0.7;
  int _windowSize = 5;
  double _movementThreshold = 3.0;
  bool _enabled = true;

  void configure({
    double? smoothingFactor,
    int? windowSize,
    double? movementThreshold,
    bool? enabled,
  }) {
    if (smoothingFactor != null) _smoothingFactor = smoothingFactor;
    if (windowSize != null) _windowSize = windowSize;
    if (movementThreshold != null) _movementThreshold = movementThreshold;
    if (enabled != null) _enabled = enabled;
  }

  Offset filter(Offset rawPosition) {
    if (!_enabled) {
      return rawPosition;
    }

    if (!_initialized) {
      _filteredPosition = rawPosition;
      _lastReportedPosition = rawPosition;
      _initialized = true;
      return rawPosition;
    }

    // Add to buffer
    _buffer.add(rawPosition);

    // Maintain window size
    while (_buffer.length > _windowSize) {
      _buffer.removeFirst();
    }

    // Calculate weighted moving average (recent positions weighted more)
    double sumX = 0;
    double sumY = 0;
    double totalWeight = 0;
    int index = 0;

    for (final pos in _buffer) {
      final weight = (index + 1).toDouble(); // Linear weighting
      sumX += pos.dx * weight;
      sumY += pos.dy * weight;
      totalWeight += weight;
      index++;
    }

    final avgPosition = Offset(
      sumX / totalWeight,
      sumY / totalWeight,
    );

    // Apply exponential smoothing
    _filteredPosition = Offset(
      _filteredPosition.dx * _smoothingFactor +
          avgPosition.dx * (1 - _smoothingFactor),
      _filteredPosition.dy * _smoothingFactor +
          avgPosition.dy * (1 - _smoothingFactor),
    );

    // Only report if movement is above threshold
    final movement = (_filteredPosition - _lastReportedPosition).distance;
    if (movement >= _movementThreshold) {
      _lastReportedPosition = _filteredPosition;
      return _filteredPosition;
    }

    return _lastReportedPosition;
  }

  void reset() {
    _buffer.clear();
    _filteredPosition = Offset.zero;
    _lastReportedPosition = Offset.zero;
    _initialized = false;
  }
}

/// A canvas for drawing/writing with tremor filtering
class TremorFilteredCanvas extends StatefulWidget {
  final Color strokeColor;
  final double strokeWidth;
  final void Function(List<Offset>)? onStrokeComplete;
  final void Function(List<List<Offset>>)? onDrawingChanged;

  const TremorFilteredCanvas({
    super.key,
    this.strokeColor = Colors.black,
    this.strokeWidth = 3.0,
    this.onStrokeComplete,
    this.onDrawingChanged,
  });

  @override
  State<TremorFilteredCanvas> createState() => _TremorFilteredCanvasState();
}

class _TremorFilteredCanvasState extends State<TremorFilteredCanvas> {
  final List<List<Offset>> _strokes = [];
  List<Offset> _currentStroke = [];
  final _filter = TremorFilterEngine();

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final tremorEnabled = motorProfile.tremorFilterEnabled;
        
        _filter.configure(
          smoothingFactor: motorProfile.tremorSmoothingFactor,
          windowSize: motorProfile.tremorWindowSize,
          movementThreshold: motorProfile.tremorMovementThreshold.toDouble(),
          enabled: tremorEnabled,
        );

        final strokeMultiplier = motorProfile.touchTargetMultiplier;
        final actualStrokeWidth = widget.strokeWidth * strokeMultiplier;

        return GestureDetector(
          onPanStart: (details) {
            _filter.reset();
            setState(() {
              _currentStroke = [
                tremorEnabled
                    ? _filter.filter(details.localPosition)
                    : details.localPosition,
              ];
            });
            HapticFeedback.selectionClick();
          },
          onPanUpdate: (details) {
            setState(() {
              final position = tremorEnabled
                  ? _filter.filter(details.localPosition)
                  : details.localPosition;
              _currentStroke.add(position);
            });
          },
          onPanEnd: (details) {
            if (_currentStroke.isNotEmpty) {
              setState(() {
                _strokes.add(List.from(_currentStroke));
                widget.onStrokeComplete?.call(_currentStroke);
                _currentStroke = [];
              });
              widget.onDrawingChanged?.call(_strokes);
              HapticFeedback.lightImpact();
            }
          },
          child: CustomPaint(
            size: Size.infinite,
            painter: _StrokePainter(
              strokes: _strokes,
              currentStroke: _currentStroke,
              strokeColor: widget.strokeColor,
              strokeWidth: actualStrokeWidth,
            ),
          ),
        );
      },
    );
  }

  void clear() {
    setState(() {
      _strokes.clear();
      _currentStroke.clear();
    });
    widget.onDrawingChanged?.call(_strokes);
  }

  void undo() {
    if (_strokes.isNotEmpty) {
      setState(() {
        _strokes.removeLast();
      });
      widget.onDrawingChanged?.call(_strokes);
    }
  }
}

class _StrokePainter extends CustomPainter {
  final List<List<Offset>> strokes;
  final List<Offset> currentStroke;
  final Color strokeColor;
  final double strokeWidth;

  _StrokePainter({
    required this.strokes,
    required this.currentStroke,
    required this.strokeColor,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = strokeColor
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    // Draw completed strokes
    for (final stroke in strokes) {
      _drawStroke(canvas, stroke, paint);
    }

    // Draw current stroke
    if (currentStroke.isNotEmpty) {
      _drawStroke(canvas, currentStroke, paint);
    }
  }

  void _drawStroke(Canvas canvas, List<Offset> points, Paint paint) {
    if (points.isEmpty) return;
    if (points.length == 1) {
      canvas.drawCircle(points.first, strokeWidth / 2, paint);
      return;
    }

    final path = Path();
    path.moveTo(points.first.dx, points.first.dy);

    // Use quadratic bezier for smoother curves
    for (int i = 1; i < points.length - 1; i++) {
      final p0 = points[i];
      final p1 = points[i + 1];
      final midPoint = Offset(
        (p0.dx + p1.dx) / 2,
        (p0.dy + p1.dy) / 2,
      );
      path.quadraticBezierTo(p0.dx, p0.dy, midPoint.dx, midPoint.dy);
    }

    // Draw the last segment
    if (points.length > 1) {
      path.lineTo(points.last.dx, points.last.dy);
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _StrokePainter oldDelegate) {
    return oldDelegate.strokes != strokes ||
        oldDelegate.currentStroke != currentStroke ||
        oldDelegate.strokeColor != strokeColor ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}

/// Visualizer for tremor filter effect (debug/demo)
class TremorFilterVisualizer extends StatefulWidget {
  final double width;
  final double height;

  const TremorFilterVisualizer({
    super.key,
    this.width = 300,
    this.height = 200,
  });

  @override
  State<TremorFilterVisualizer> createState() => _TremorFilterVisualizerState();
}

class _TremorFilterVisualizerState extends State<TremorFilterVisualizer> {
  final List<Offset> _rawPoints = [];
  final List<Offset> _filteredPoints = [];
  final _filter = TremorFilterEngine();

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        _filter.configure(
          smoothingFactor: motorProfile.tremorSmoothingFactor,
          windowSize: motorProfile.tremorWindowSize,
          movementThreshold: motorProfile.tremorMovementThreshold.toDouble(),
          enabled: true,
        );

        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey),
            borderRadius: BorderRadius.circular(8),
          ),
          child: GestureDetector(
            onPanStart: (details) {
              _filter.reset();
              setState(() {
                _rawPoints.clear();
                _filteredPoints.clear();
              });
            },
            onPanUpdate: (details) {
              setState(() {
                _rawPoints.add(details.localPosition);
                _filteredPoints.add(_filter.filter(details.localPosition));
              });
            },
            child: CustomPaint(
              size: Size(widget.width, widget.height),
              painter: _ComparisonPainter(
                rawPoints: _rawPoints,
                filteredPoints: _filteredPoints,
              ),
            ),
          ),
        );
      },
    );
  }
}

class _ComparisonPainter extends CustomPainter {
  final List<Offset> rawPoints;
  final List<Offset> filteredPoints;

  _ComparisonPainter({
    required this.rawPoints,
    required this.filteredPoints,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rawPaint = Paint()
      ..color = Colors.red.withOpacity(0.5)
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final filteredPaint = Paint()
      ..color = Colors.blue
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    // Draw raw path
    if (rawPoints.length > 1) {
      final rawPath = Path();
      rawPath.moveTo(rawPoints.first.dx, rawPoints.first.dy);
      for (final point in rawPoints.skip(1)) {
        rawPath.lineTo(point.dx, point.dy);
      }
      canvas.drawPath(rawPath, rawPaint);
    }

    // Draw filtered path
    if (filteredPoints.length > 1) {
      final filteredPath = Path();
      filteredPath.moveTo(filteredPoints.first.dx, filteredPoints.first.dy);
      for (final point in filteredPoints.skip(1)) {
        filteredPath.lineTo(point.dx, point.dy);
      }
      canvas.drawPath(filteredPath, filteredPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _ComparisonPainter oldDelegate) {
    return true;
  }
}
