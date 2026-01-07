/// Math Scratch Pad Canvas Widget
///
/// A freeform drawing canvas for math problem solving with:
/// - Touch/stylus input support
/// - Undo/redo functionality
/// - Clear canvas
/// - AI-powered handwriting recognition

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/stroke_data.dart';
import '../services/scratch_pad_service.dart';

/// Main scratch pad canvas widget
class ScratchPadCanvas extends StatefulWidget {
  final double width;
  final double height;
  final Color backgroundColor;
  final Color strokeColor;
  final double strokeWidth;
  final bool showToolbar;
  final bool showRecognitionResult;
  final bool autoRecognize;
  final Duration recognitionDelay;
  final String? activityId;
  final String? questionId;
  final ScratchPadService? service;
  final void Function(MathRecognitionResult)? onRecognized;
  final void Function(CanvasState)? onChanged;
  final void Function(String answer)? onAnswerSubmit;

  const ScratchPadCanvas({
    super.key,
    this.width = 400,
    this.height = 300,
    this.backgroundColor = Colors.white,
    this.strokeColor = Colors.black,
    this.strokeWidth = 3.0,
    this.showToolbar = true,
    this.showRecognitionResult = true,
    this.autoRecognize = true,
    this.recognitionDelay = const Duration(milliseconds: 1500),
    this.activityId,
    this.questionId,
    this.service,
    this.onRecognized,
    this.onChanged,
    this.onAnswerSubmit,
  });

  @override
  State<ScratchPadCanvas> createState() => ScratchPadCanvasState();
}

class ScratchPadCanvasState extends State<ScratchPadCanvas> {
  final List<Stroke> _strokes = [];
  final List<List<Stroke>> _undoStack = [];
  final List<List<Stroke>> _redoStack = [];
  Stroke? _currentStroke;

  Color _strokeColor = Colors.black;
  double _strokeWidth = 3.0;
  ScratchPadTool _currentTool = ScratchPadTool.pen;

  MathRecognitionResult? _recognitionResult;
  bool _isRecognizing = false;
  Timer? _recognitionTimer;

  @override
  void initState() {
    super.initState();
    _strokeColor = widget.strokeColor;
    _strokeWidth = widget.strokeWidth;
  }

  @override
  void dispose() {
    _recognitionTimer?.cancel();
    super.dispose();
  }

  /// Clear the canvas
  void clear() {
    if (_strokes.isEmpty) return;

    setState(() {
      _undoStack.add(List.from(_strokes));
      _redoStack.clear();
      _strokes.clear();
      _recognitionResult = null;
    });
    _notifyChanged();
    HapticFeedback.mediumImpact();
  }

  /// Undo last stroke
  void undo() {
    if (_strokes.isEmpty) return;

    setState(() {
      _redoStack.add(List.from(_strokes));
      _strokes.removeLast();
      if (_undoStack.isNotEmpty) {
        // Restore previous state
      }
    });
    _scheduleRecognition();
    _notifyChanged();
    HapticFeedback.lightImpact();
  }

  /// Redo last undone stroke
  void redo() {
    if (_redoStack.isEmpty) return;

    setState(() {
      final restored = _redoStack.removeLast();
      _strokes.clear();
      _strokes.addAll(restored);
    });
    _scheduleRecognition();
    _notifyChanged();
    HapticFeedback.lightImpact();
  }

  /// Trigger recognition manually
  Future<void> recognize() async {
    if (_strokes.isEmpty || _isRecognizing) return;

    setState(() {
      _isRecognizing = true;
    });

    try {
      final canvasState = _getCanvasState();
      final result = await widget.service?.recognizeMath(canvasState);

      if (result != null && mounted) {
        setState(() {
          _recognitionResult = result;
        });
        widget.onRecognized?.call(result);
      }
    } catch (e) {
      debugPrint('Recognition error: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isRecognizing = false;
        });
      }
    }
  }

  /// Get current canvas state
  CanvasState _getCanvasState() {
    return CanvasState(
      strokes: List.from(_strokes),
      canvasSize: Size(widget.width, widget.height),
      backgroundColor: widget.backgroundColor,
    );
  }

  void _notifyChanged() {
    widget.onChanged?.call(_getCanvasState());
  }

  void _scheduleRecognition() {
    _recognitionTimer?.cancel();
    if (!widget.autoRecognize || _strokes.isEmpty) return;

    _recognitionTimer = Timer(widget.recognitionDelay, () {
      recognize();
    });
  }

  void _onPanStart(DragStartDetails details) {
    if (_currentTool == ScratchPadTool.eraser) {
      _eraseAt(details.localPosition);
      return;
    }

    final point = StrokePoint.fromOffset(details.localPosition);

    setState(() {
      _undoStack.add(List.from(_strokes));
      _redoStack.clear();
      _currentStroke = Stroke(
        points: [point],
        color: _strokeColor,
        strokeWidth: _strokeWidth,
      );
    });
    HapticFeedback.selectionClick();
  }

  void _onPanUpdate(DragUpdateDetails details) {
    if (_currentTool == ScratchPadTool.eraser) {
      _eraseAt(details.localPosition);
      return;
    }

    if (_currentStroke == null) return;

    final point = StrokePoint.fromOffset(details.localPosition);

    setState(() {
      _currentStroke = _currentStroke!.copyWith(
        points: [..._currentStroke!.points, point],
      );
    });
  }

  void _onPanEnd(DragEndDetails details) {
    if (_currentTool == ScratchPadTool.eraser) return;
    if (_currentStroke == null) return;

    setState(() {
      if (_currentStroke!.points.isNotEmpty) {
        _strokes.add(_currentStroke!);
      }
      _currentStroke = null;
    });

    _scheduleRecognition();
    _notifyChanged();
  }

  void _eraseAt(Offset position) {
    const eraserRadius = 20.0;
    final eraserRect = Rect.fromCircle(center: position, radius: eraserRadius);

    setState(() {
      _strokes.removeWhere((stroke) {
        return stroke.points.any((point) {
          return eraserRect.contains(point.toOffset());
        });
      });
    });
    _notifyChanged();
  }

  void _selectTool(ScratchPadTool tool) {
    setState(() {
      _currentTool = tool;
    });
    HapticFeedback.selectionClick();
  }

  void _selectColor(Color color) {
    setState(() {
      _strokeColor = color;
      _currentTool = ScratchPadTool.pen;
    });
    HapticFeedback.selectionClick();
  }

  void _selectStrokeWidth(double width) {
    setState(() {
      _strokeWidth = width;
    });
  }

  void _submitAnswer() {
    if (_recognitionResult != null) {
      widget.onAnswerSubmit?.call(_recognitionResult!.recognizedText);
      HapticFeedback.mediumImpact();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Toolbar
        if (widget.showToolbar) _buildToolbar(),

        // Canvas
        Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: widget.backgroundColor,
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: GestureDetector(
              onPanStart: _onPanStart,
              onPanUpdate: _onPanUpdate,
              onPanEnd: _onPanEnd,
              child: CustomPaint(
                painter: _ScratchPadPainter(
                  strokes: _strokes,
                  currentStroke: _currentStroke,
                  backgroundColor: widget.backgroundColor,
                ),
                size: Size(widget.width, widget.height),
              ),
            ),
          ),
        ),

        // Recognition result
        if (widget.showRecognitionResult) _buildRecognitionResult(),
      ],
    );
  }

  Widget _buildToolbar() {
    return Container(
      width: widget.width,
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Pen tool
          _ToolButton(
            icon: Icons.edit,
            label: 'Pen',
            isActive: _currentTool == ScratchPadTool.pen,
            onTap: () => _selectTool(ScratchPadTool.pen),
          ),

          // Eraser tool
          _ToolButton(
            icon: Icons.auto_fix_high,
            label: 'Eraser',
            isActive: _currentTool == ScratchPadTool.eraser,
            onTap: () => _selectTool(ScratchPadTool.eraser),
          ),

          // Divider
          Container(width: 1, height: 32, color: Colors.grey.shade400),

          // Colors
          _ColorButton(
            color: Colors.black,
            isActive: _strokeColor == Colors.black,
            onTap: () => _selectColor(Colors.black),
          ),
          _ColorButton(
            color: Colors.blue,
            isActive: _strokeColor == Colors.blue,
            onTap: () => _selectColor(Colors.blue),
          ),
          _ColorButton(
            color: Colors.red,
            isActive: _strokeColor == Colors.red,
            onTap: () => _selectColor(Colors.red),
          ),

          // Divider
          Container(width: 1, height: 32, color: Colors.grey.shade400),

          // Undo
          _ToolButton(
            icon: Icons.undo,
            label: 'Undo',
            isActive: false,
            enabled: _strokes.isNotEmpty,
            onTap: undo,
          ),

          // Redo
          _ToolButton(
            icon: Icons.redo,
            label: 'Redo',
            isActive: false,
            enabled: _redoStack.isNotEmpty,
            onTap: redo,
          ),

          // Clear
          _ToolButton(
            icon: Icons.delete_outline,
            label: 'Clear',
            isActive: false,
            enabled: _strokes.isNotEmpty,
            onTap: clear,
            color: Colors.red,
          ),
        ],
      ),
    );
  }

  Widget _buildRecognitionResult() {
    return Container(
      width: widget.width,
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _recognitionResult != null
            ? Colors.blue.shade50
            : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: _recognitionResult != null
              ? Colors.blue.shade200
              : Colors.grey.shade300,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                _isRecognizing
                    ? Icons.hourglass_empty
                    : _recognitionResult != null
                        ? Icons.check_circle
                        : Icons.draw,
                size: 20,
                color: _recognitionResult != null
                    ? Colors.blue
                    : Colors.grey.shade600,
              ),
              const SizedBox(width: 8),
              Text(
                _isRecognizing
                    ? 'Recognizing...'
                    : _recognitionResult != null
                        ? 'Recognized'
                        : 'Write your answer above',
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  color: _recognitionResult != null
                      ? Colors.blue.shade700
                      : Colors.grey.shade700,
                ),
              ),
              const Spacer(),
              if (_recognitionResult != null && !_isRecognizing)
                IconButton(
                  icon: const Icon(Icons.refresh, size: 20),
                  onPressed: recognize,
                  tooltip: 'Re-recognize',
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
            ],
          ),
          if (_recognitionResult != null) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _recognitionResult!.recognizedText,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'monospace',
                    ),
                  ),
                  if (_recognitionResult!.evaluation != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      _recognitionResult!.evaluation!.isValid
                          ? '= ${_recognitionResult!.evaluation!.formattedResult}'
                          : _recognitionResult!.evaluation!.error ?? 'Invalid expression',
                      style: TextStyle(
                        fontSize: 16,
                        color: _recognitionResult!.evaluation!.isValid
                            ? Colors.green.shade700
                            : Colors.red.shade700,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        'Confidence: ${(_recognitionResult!.confidence * 100).toStringAsFixed(0)}%',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                      const Spacer(),
                      if (widget.onAnswerSubmit != null)
                        ElevatedButton.icon(
                          onPressed: _submitAnswer,
                          icon: const Icon(Icons.check, size: 18),
                          label: const Text('Submit'),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            if (_recognitionResult!.alternatives.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Alternatives:',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 4),
              Wrap(
                spacing: 8,
                children: _recognitionResult!.alternatives
                    .take(3)
                    .map((alt) => Chip(
                          label: Text(alt.text),
                          backgroundColor: Colors.grey.shade200,
                          labelStyle: const TextStyle(fontSize: 12),
                          padding: EdgeInsets.zero,
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ))
                    .toList(),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

/// Tool button widget
class _ToolButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final bool enabled;
  final VoidCallback onTap;
  final Color? color;

  const _ToolButton({
    required this.icon,
    required this.label,
    required this.isActive,
    this.enabled = true,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: label,
      child: Material(
        color: isActive ? Colors.blue.shade100 : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          onTap: enabled ? onTap : null,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Icon(
              icon,
              size: 24,
              color: enabled
                  ? (color ?? (isActive ? Colors.blue : Colors.grey.shade700))
                  : Colors.grey.shade400,
            ),
          ),
        ),
      ),
    );
  }
}

/// Color selection button
class _ColorButton extends StatelessWidget {
  final Color color;
  final bool isActive;
  final VoidCallback onTap;

  const _ColorButton({
    required this.color,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(
            color: isActive ? Colors.blue : Colors.grey.shade400,
            width: isActive ? 3 : 1,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: Colors.blue.withOpacity(0.3),
                    blurRadius: 4,
                    spreadRadius: 1,
                  ),
                ]
              : null,
        ),
      ),
    );
  }
}

/// Custom painter for the scratch pad
class _ScratchPadPainter extends CustomPainter {
  final List<Stroke> strokes;
  final Stroke? currentStroke;
  final Color backgroundColor;

  _ScratchPadPainter({
    required this.strokes,
    this.currentStroke,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Draw background
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = backgroundColor,
    );

    // Draw grid lines (optional, helps with math)
    _drawGrid(canvas, size);

    // Draw all strokes
    for (final stroke in strokes) {
      _drawStroke(canvas, stroke);
    }

    // Draw current stroke
    if (currentStroke != null) {
      _drawStroke(canvas, currentStroke!);
    }
  }

  void _drawGrid(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = Colors.grey.shade200
      ..strokeWidth = 0.5;

    const gridSpacing = 20.0;

    // Vertical lines
    for (double x = gridSpacing; x < size.width; x += gridSpacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }

    // Horizontal lines
    for (double y = gridSpacing; y < size.height; y += gridSpacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }
  }

  void _drawStroke(Canvas canvas, Stroke stroke) {
    if (stroke.points.isEmpty) return;

    final paint = Paint()
      ..color = stroke.color
      ..strokeWidth = stroke.strokeWidth
      ..strokeCap = stroke.strokeCap
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    final path = stroke.toPath();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _ScratchPadPainter oldDelegate) {
    return strokes != oldDelegate.strokes ||
        currentStroke != oldDelegate.currentStroke;
  }
}

/// Available drawing tools
enum ScratchPadTool {
  pen,
  eraser,
}
