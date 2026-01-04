/// Stroke Data Models for Math Scratch Pad
///
/// Models for capturing and serializing handwriting strokes
/// for math equation recognition.

import 'dart:ui';
import 'package:flutter/material.dart';

/// A single point in a stroke with pressure and timestamp
class StrokePoint {
  final double x;
  final double y;
  final double pressure;
  final int timestamp;

  const StrokePoint({
    required this.x,
    required this.y,
    this.pressure = 1.0,
    required this.timestamp,
  });

  Offset toOffset() => Offset(x, y);

  Map<String, dynamic> toJson() => {
    'x': x,
    'y': y,
    'pressure': pressure,
    'timestamp': timestamp,
  };

  factory StrokePoint.fromJson(Map<String, dynamic> json) => StrokePoint(
    x: (json['x'] as num).toDouble(),
    y: (json['y'] as num).toDouble(),
    pressure: (json['pressure'] as num?)?.toDouble() ?? 1.0,
    timestamp: json['timestamp'] as int,
  );

  factory StrokePoint.fromOffset(Offset offset, {double pressure = 1.0}) =>
    StrokePoint(
      x: offset.dx,
      y: offset.dy,
      pressure: pressure,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    );
}

/// A complete stroke (pen down -> pen up)
class Stroke {
  final String id;
  final List<StrokePoint> points;
  final Color color;
  final double strokeWidth;
  final StrokeCap strokeCap;
  final DateTime createdAt;

  Stroke({
    String? id,
    required this.points,
    this.color = Colors.black,
    this.strokeWidth = 3.0,
    this.strokeCap = StrokeCap.round,
    DateTime? createdAt,
  }) : id = id ?? DateTime.now().millisecondsSinceEpoch.toString(),
       createdAt = createdAt ?? DateTime.now();

  /// Create a path from the stroke points
  Path toPath() {
    if (points.isEmpty) return Path();

    final path = Path();
    path.moveTo(points.first.x, points.first.y);

    if (points.length == 1) {
      // Single point - draw a small circle
      path.addOval(Rect.fromCircle(
        center: points.first.toOffset(),
        radius: strokeWidth / 2,
      ));
    } else if (points.length == 2) {
      path.lineTo(points.last.x, points.last.y);
    } else {
      // Use quadratic bezier curves for smooth lines
      for (int i = 1; i < points.length - 1; i++) {
        final p0 = points[i];
        final p1 = points[i + 1];
        final midX = (p0.x + p1.x) / 2;
        final midY = (p0.y + p1.y) / 2;
        path.quadraticBezierTo(p0.x, p0.y, midX, midY);
      }
      // Connect to the last point
      path.lineTo(points.last.x, points.last.y);
    }

    return path;
  }

  /// Get bounding box of the stroke
  Rect get bounds {
    if (points.isEmpty) return Rect.zero;

    double minX = points.first.x;
    double maxX = points.first.x;
    double minY = points.first.y;
    double maxY = points.first.y;

    for (final point in points) {
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    }

    return Rect.fromLTRB(minX, minY, maxX, maxY);
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'points': points.map((p) => p.toJson()).toList(),
    'color': color.value,
    'strokeWidth': strokeWidth,
    'createdAt': createdAt.toIso8601String(),
  };

  factory Stroke.fromJson(Map<String, dynamic> json) => Stroke(
    id: json['id'] as String,
    points: (json['points'] as List)
        .map((p) => StrokePoint.fromJson(p as Map<String, dynamic>))
        .toList(),
    color: Color(json['color'] as int),
    strokeWidth: (json['strokeWidth'] as num).toDouble(),
    createdAt: DateTime.parse(json['createdAt'] as String),
  );

  Stroke copyWith({
    String? id,
    List<StrokePoint>? points,
    Color? color,
    double? strokeWidth,
    StrokeCap? strokeCap,
    DateTime? createdAt,
  }) => Stroke(
    id: id ?? this.id,
    points: points ?? this.points,
    color: color ?? this.color,
    strokeWidth: strokeWidth ?? this.strokeWidth,
    strokeCap: strokeCap ?? this.strokeCap,
    createdAt: createdAt ?? this.createdAt,
  );
}

/// Drawing canvas state containing all strokes
class CanvasState {
  final List<Stroke> strokes;
  final Size canvasSize;
  final Color backgroundColor;
  final DateTime createdAt;
  final DateTime updatedAt;

  CanvasState({
    this.strokes = const [],
    this.canvasSize = const Size(400, 300),
    this.backgroundColor = Colors.white,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) : createdAt = createdAt ?? DateTime.now(),
       updatedAt = updatedAt ?? DateTime.now();

  /// Get bounding box of all strokes
  Rect get contentBounds {
    if (strokes.isEmpty) return Rect.zero;

    Rect bounds = strokes.first.bounds;
    for (final stroke in strokes.skip(1)) {
      bounds = bounds.expandToInclude(stroke.bounds);
    }
    return bounds;
  }

  /// Check if canvas is empty
  bool get isEmpty => strokes.isEmpty;

  /// Get total point count
  int get totalPoints => strokes.fold(0, (sum, s) => sum + s.points.length);

  Map<String, dynamic> toJson() => {
    'strokes': strokes.map((s) => s.toJson()).toList(),
    'canvasSize': {'width': canvasSize.width, 'height': canvasSize.height},
    'backgroundColor': backgroundColor.value,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };

  factory CanvasState.fromJson(Map<String, dynamic> json) => CanvasState(
    strokes: (json['strokes'] as List)
        .map((s) => Stroke.fromJson(s as Map<String, dynamic>))
        .toList(),
    canvasSize: Size(
      (json['canvasSize']['width'] as num).toDouble(),
      (json['canvasSize']['height'] as num).toDouble(),
    ),
    backgroundColor: Color(json['backgroundColor'] as int),
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
  );

  CanvasState copyWith({
    List<Stroke>? strokes,
    Size? canvasSize,
    Color? backgroundColor,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) => CanvasState(
    strokes: strokes ?? this.strokes,
    canvasSize: canvasSize ?? this.canvasSize,
    backgroundColor: backgroundColor ?? this.backgroundColor,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? DateTime.now(),
  );
}

/// Recognition result from AI service
class MathRecognitionResult {
  final String recognizedText;
  final String? latexRepresentation;
  final double confidence;
  final List<RecognitionCandidate> alternatives;
  final MathExpressionType expressionType;
  final EvaluationResult? evaluation;

  const MathRecognitionResult({
    required this.recognizedText,
    this.latexRepresentation,
    required this.confidence,
    this.alternatives = const [],
    this.expressionType = MathExpressionType.unknown,
    this.evaluation,
  });

  factory MathRecognitionResult.fromJson(Map<String, dynamic> json) => MathRecognitionResult(
    recognizedText: json['recognizedText'] as String,
    latexRepresentation: json['latexRepresentation'] as String?,
    confidence: (json['confidence'] as num).toDouble(),
    alternatives: (json['alternatives'] as List?)
        ?.map((a) => RecognitionCandidate.fromJson(a as Map<String, dynamic>))
        .toList() ?? [],
    expressionType: MathExpressionType.values.firstWhere(
      (e) => e.name == json['expressionType'],
      orElse: () => MathExpressionType.unknown,
    ),
    evaluation: json['evaluation'] != null
        ? EvaluationResult.fromJson(json['evaluation'] as Map<String, dynamic>)
        : null,
  );

  Map<String, dynamic> toJson() => {
    'recognizedText': recognizedText,
    'latexRepresentation': latexRepresentation,
    'confidence': confidence,
    'alternatives': alternatives.map((a) => a.toJson()).toList(),
    'expressionType': expressionType.name,
    'evaluation': evaluation?.toJson(),
  };
}

/// Alternative recognition candidate
class RecognitionCandidate {
  final String text;
  final double confidence;

  const RecognitionCandidate({
    required this.text,
    required this.confidence,
  });

  factory RecognitionCandidate.fromJson(Map<String, dynamic> json) => RecognitionCandidate(
    text: json['text'] as String,
    confidence: (json['confidence'] as num).toDouble(),
  );

  Map<String, dynamic> toJson() => {
    'text': text,
    'confidence': confidence,
  };
}

/// Type of math expression recognized
enum MathExpressionType {
  number,
  equation,
  expression,
  fraction,
  exponent,
  squareRoot,
  inequality,
  unknown,
}

/// Result of evaluating a math expression
class EvaluationResult {
  final bool isValid;
  final dynamic result;
  final String? formattedResult;
  final String? error;

  const EvaluationResult({
    required this.isValid,
    this.result,
    this.formattedResult,
    this.error,
  });

  factory EvaluationResult.fromJson(Map<String, dynamic> json) => EvaluationResult(
    isValid: json['isValid'] as bool,
    result: json['result'],
    formattedResult: json['formattedResult'] as String?,
    error: json['error'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'isValid': isValid,
    'result': result,
    'formattedResult': formattedResult,
    'error': error,
  };
}

/// Scratch pad session for tracking student work
class ScratchPadSession {
  final String id;
  final String learnerId;
  final String? activityId;
  final String? questionId;
  final List<CanvasState> snapshots;
  final List<MathRecognitionResult> recognitions;
  final DateTime startedAt;
  final DateTime? completedAt;
  final ScratchPadSessionStatus status;

  ScratchPadSession({
    String? id,
    required this.learnerId,
    this.activityId,
    this.questionId,
    this.snapshots = const [],
    this.recognitions = const [],
    DateTime? startedAt,
    this.completedAt,
    this.status = ScratchPadSessionStatus.active,
  }) : id = id ?? DateTime.now().millisecondsSinceEpoch.toString(),
       startedAt = startedAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'id': id,
    'learnerId': learnerId,
    'activityId': activityId,
    'questionId': questionId,
    'snapshots': snapshots.map((s) => s.toJson()).toList(),
    'recognitions': recognitions.map((r) => r.toJson()).toList(),
    'startedAt': startedAt.toIso8601String(),
    'completedAt': completedAt?.toIso8601String(),
    'status': status.name,
  };

  factory ScratchPadSession.fromJson(Map<String, dynamic> json) => ScratchPadSession(
    id: json['id'] as String,
    learnerId: json['learnerId'] as String,
    activityId: json['activityId'] as String?,
    questionId: json['questionId'] as String?,
    snapshots: (json['snapshots'] as List?)
        ?.map((s) => CanvasState.fromJson(s as Map<String, dynamic>))
        .toList() ?? [],
    recognitions: (json['recognitions'] as List?)
        ?.map((r) => MathRecognitionResult.fromJson(r as Map<String, dynamic>))
        .toList() ?? [],
    startedAt: DateTime.parse(json['startedAt'] as String),
    completedAt: json['completedAt'] != null
        ? DateTime.parse(json['completedAt'] as String)
        : null,
    status: ScratchPadSessionStatus.values.firstWhere(
      (e) => e.name == json['status'],
      orElse: () => ScratchPadSessionStatus.active,
    ),
  );
}

enum ScratchPadSessionStatus {
  active,
  completed,
  submitted,
}
