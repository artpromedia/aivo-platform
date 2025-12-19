/// Drag Assist Widget - ND-3.3
///
/// Provides motor-assisted drag and drop functionality.
/// Includes snap-to-grid, auto-complete, and visual guides.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../motor_profile_provider.dart';

/// A widget that provides motor-assisted drag and drop functionality
class DragAssist<T extends Object> extends StatefulWidget {
  final T data;
  final Widget child;
  final Widget? feedback;
  final Widget? childWhenDragging;
  final VoidCallback? onDragStarted;
  final VoidCallback? onDragEnd;
  final void Function(Offset)? onDragUpdate;

  /// Target positions for auto-complete
  final List<Offset>? targetPositions;

  /// Override the auto-complete threshold from profile
  final double? autoCompleteThreshold;

  const DragAssist({
    super.key,
    required this.data,
    required this.child,
    this.feedback,
    this.childWhenDragging,
    this.onDragStarted,
    this.onDragEnd,
    this.onDragUpdate,
    this.targetPositions,
    this.autoCompleteThreshold,
  });

  @override
  State<DragAssist<T>> createState() => _DragAssistState<T>();
}

class _DragAssistState<T extends Object> extends State<DragAssist<T>> {
  Offset _dragPosition = Offset.zero;
  Offset _startPosition = Offset.zero;
  bool _isDragging = false;
  Offset? _snapTarget;

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final dragEnabled = motorProfile.dragAssistEnabled;

        if (!dragEnabled) {
          // Use standard draggable
          return Draggable<T>(
            data: widget.data,
            feedback: widget.feedback ?? widget.child,
            childWhenDragging: widget.childWhenDragging,
            onDragStarted: widget.onDragStarted,
            onDragEnd: (_) => widget.onDragEnd?.call(),
            child: widget.child,
          );
        }

        final snapToGrid = motorProfile.dragSnapToGrid;
        final gridSize = motorProfile.dragGridSize;
        final autoComplete = motorProfile.dragAutoComplete;
        final threshold = widget.autoCompleteThreshold ??
            motorProfile.dragAutoCompleteThreshold.toDouble();

        return GestureDetector(
          onPanStart: (details) {
            setState(() {
              _isDragging = true;
              _startPosition = details.globalPosition;
              _dragPosition = details.globalPosition;
            });
            widget.onDragStarted?.call();
            HapticFeedback.lightImpact();
          },
          onPanUpdate: (details) {
            setState(() {
              var newPosition = details.globalPosition;

              // Apply grid snapping
              if (snapToGrid) {
                newPosition = _snapToGrid(newPosition, gridSize.toDouble());
              }

              // Check for auto-complete proximity
              if (autoComplete && widget.targetPositions != null) {
                final closestTarget = _findClosestTarget(
                  newPosition,
                  widget.targetPositions!,
                  threshold,
                );

                if (closestTarget != null && _snapTarget != closestTarget) {
                  _snapTarget = closestTarget;
                  HapticFeedback.selectionClick();
                } else if (closestTarget == null) {
                  _snapTarget = null;
                }
              }

              _dragPosition = newPosition;
            });
            widget.onDragUpdate?.call(_dragPosition);
          },
          onPanEnd: (details) {
            // If near a target and auto-complete is enabled, snap to it
            if (_snapTarget != null) {
              HapticFeedback.mediumImpact();
            }

            setState(() {
              _isDragging = false;
              _snapTarget = null;
            });

            widget.onDragEnd?.call();
          },
          child: _isDragging
              ? (widget.childWhenDragging ??
                  Opacity(opacity: 0.5, child: widget.child))
              : widget.child,
        );
      },
    );
  }

  Offset _snapToGrid(Offset position, double gridSize) {
    return Offset(
      (position.dx / gridSize).round() * gridSize,
      (position.dy / gridSize).round() * gridSize,
    );
  }

  Offset? _findClosestTarget(
      Offset position, List<Offset> targets, double threshold) {
    Offset? closest;
    double minDistance = double.infinity;

    for (final target in targets) {
      final distance = (target - position).distance;
      if (distance < threshold && distance < minDistance) {
        minDistance = distance;
        closest = target;
      }
    }

    return closest;
  }
}

/// Drag feedback overlay that shows during assisted drag operations
class DragAssistOverlay extends StatelessWidget {
  final Offset position;
  final Widget child;
  final bool isNearTarget;
  final List<Offset>? targetPositions;
  final double threshold;

  const DragAssistOverlay({
    super.key,
    required this.position,
    required this.child,
    this.isNearTarget = false,
    this.targetPositions,
    this.threshold = 30,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Target indicators
        if (targetPositions != null)
          ...targetPositions!.map((target) {
            final distance = (target - position).distance;
            final isClose = distance < threshold;

            return Positioned(
              left: target.dx - 25,
              top: target.dy - 25,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isClose ? Colors.green : Colors.grey.shade400,
                    width: isClose ? 3 : 2,
                  ),
                  color: isClose
                      ? Colors.green.withOpacity(0.2)
                      : Colors.grey.withOpacity(0.1),
                ),
                child: isClose
                    ? const Icon(Icons.check, color: Colors.green, size: 24)
                    : null,
              ),
            );
          }),

        // Dragged item
        Positioned(
          left: position.dx - 30,
          top: position.dy - 30,
          child: Material(
            elevation: 8,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: isNearTarget
                    ? Border.all(color: Colors.green, width: 3)
                    : null,
              ),
              child: child,
            ),
          ),
        ),
      ],
    );
  }
}

/// A drop target that works with DragAssist
class DragAssistTarget<T extends Object> extends StatefulWidget {
  final Widget child;
  final void Function(T data)? onAccept;
  final bool Function(T? data)? onWillAccept;
  final Widget Function(BuildContext, List<T?>, List<dynamic>)? builder;

  const DragAssistTarget({
    super.key,
    required this.child,
    this.onAccept,
    this.onWillAccept,
    this.builder,
  });

  @override
  State<DragAssistTarget<T>> createState() => _DragAssistTargetState<T>();
}

class _DragAssistTargetState<T extends Object>
    extends State<DragAssistTarget<T>> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;

        return DragTarget<T>(
          onWillAcceptWithDetails: (details) {
            final willAccept =
                widget.onWillAccept?.call(details.data) ?? true;
            if (willAccept && !_isHovering) {
              setState(() => _isHovering = true);
              HapticFeedback.selectionClick();
            }
            return willAccept;
          },
          onLeave: (_) {
            setState(() => _isHovering = false);
          },
          onAcceptWithDetails: (details) {
            setState(() => _isHovering = false);
            HapticFeedback.mediumImpact();
            widget.onAccept?.call(details.data);
          },
          builder: (context, candidateData, rejectedData) {
            if (widget.builder != null) {
              return widget.builder!(context, candidateData, rejectedData);
            }

            return AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              transform: _isHovering
                  ? (Matrix4.identity()..scale(1.05))
                  : Matrix4.identity(),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular((12 * multiplier).toDouble()),
                border: _isHovering
                    ? Border.all(color: Colors.green, width: 3)
                    : null,
                boxShadow: _isHovering
                    ? [
                        BoxShadow(
                          color: Colors.green.withOpacity(0.3),
                          blurRadius: 12,
                          spreadRadius: 2,
                        ),
                      ]
                    : null,
              ),
              child: widget.child,
            );
          },
        );
      },
    );
  }
}

/// Grid-based drag and drop area with snapping
class SnapGridArea extends StatelessWidget {
  final int columns;
  final int rows;
  final double cellSize;
  final List<SnapGridItem> items;
  final void Function(SnapGridItem item, int column, int row)? onItemMoved;
  final Color? gridColor;
  final bool showGrid;

  const SnapGridArea({
    super.key,
    required this.columns,
    required this.rows,
    this.cellSize = 60,
    required this.items,
    this.onItemMoved,
    this.gridColor,
    this.showGrid = true,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: columns * cellSize,
      height: rows * cellSize,
      child: Stack(
        children: [
          // Grid background
          if (showGrid)
            CustomPaint(
              size: Size(columns * cellSize, rows * cellSize),
              painter: _GridPainter(
                columns: columns,
                rows: rows,
                cellSize: cellSize,
                color: gridColor ?? Colors.grey.shade300,
              ),
            ),

          // Items
          ...items.map((item) {
            return Positioned(
              left: item.column * cellSize,
              top: item.row * cellSize,
              child: DragAssist<SnapGridItem>(
                data: item,
                onDragEnd: () {
                  // Calculate new position based on drop
                },
                child: SizedBox(
                  width: cellSize,
                  height: cellSize,
                  child: item.child,
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

class SnapGridItem {
  final String id;
  final int column;
  final int row;
  final Widget child;

  const SnapGridItem({
    required this.id,
    required this.column,
    required this.row,
    required this.child,
  });

  SnapGridItem copyWith({int? column, int? row}) {
    return SnapGridItem(
      id: id,
      column: column ?? this.column,
      row: row ?? this.row,
      child: child,
    );
  }
}

class _GridPainter extends CustomPainter {
  final int columns;
  final int rows;
  final double cellSize;
  final Color color;

  _GridPainter({
    required this.columns,
    required this.rows,
    required this.cellSize,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;

    // Draw vertical lines
    for (int i = 0; i <= columns; i++) {
      canvas.drawLine(
        Offset(i * cellSize, 0),
        Offset(i * cellSize, rows * cellSize),
        paint,
      );
    }

    // Draw horizontal lines
    for (int i = 0; i <= rows; i++) {
      canvas.drawLine(
        Offset(0, i * cellSize),
        Offset(columns * cellSize, i * cellSize),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _GridPainter oldDelegate) {
    return oldDelegate.columns != columns ||
        oldDelegate.rows != rows ||
        oldDelegate.cellSize != cellSize ||
        oldDelegate.color != color;
  }
}
