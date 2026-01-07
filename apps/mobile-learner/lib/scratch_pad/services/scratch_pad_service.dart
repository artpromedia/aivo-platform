/// Scratch Pad Service
///
/// Handles communication with the AI backend for math
/// handwriting recognition and session management.

import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../models/stroke_data.dart';

/// Service for scratch pad operations
class ScratchPadService {
  final String baseUrl;
  final String? authToken;
  final http.Client _client;

  ScratchPadService({
    required this.baseUrl,
    this.authToken,
    http.Client? client,
  }) : _client = client ?? http.Client();

  /// Headers for API requests
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (authToken != null) 'Authorization': 'Bearer $authToken',
  };

  /// Recognize math expression from canvas strokes
  Future<MathRecognitionResult?> recognizeMath(CanvasState canvasState) async {
    try {
      // Convert strokes to recognition format
      final strokeData = _convertStrokesToRecognitionFormat(canvasState);

      final response = await _client.post(
        Uri.parse('$baseUrl/api/v1/math-recognition/recognize'),
        headers: _headers,
        body: jsonEncode({
          'strokes': strokeData,
          'canvasWidth': canvasState.canvasSize.width,
          'canvasHeight': canvasState.canvasSize.height,
          'options': {
            'evaluateExpression': true,
            'includeAlternatives': true,
            'maxAlternatives': 3,
          },
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return MathRecognitionResult.fromJson(data);
      } else {
        debugPrint('Recognition failed: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      debugPrint('Recognition error: $e');
      return null;
    }
  }

  /// Recognize math from image (for imported work)
  Future<MathRecognitionResult?> recognizeMathFromImage(Uint8List imageBytes) async {
    try {
      final base64Image = base64Encode(imageBytes);

      final response = await _client.post(
        Uri.parse('$baseUrl/api/v1/math-recognition/recognize-image'),
        headers: _headers,
        body: jsonEncode({
          'image': base64Image,
          'options': {
            'evaluateExpression': true,
            'includeAlternatives': true,
          },
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return MathRecognitionResult.fromJson(data);
      } else {
        debugPrint('Image recognition failed: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      debugPrint('Image recognition error: $e');
      return null;
    }
  }

  /// Start a new scratch pad session
  Future<ScratchPadSession?> startSession({
    required String learnerId,
    String? activityId,
    String? questionId,
  }) async {
    try {
      final response = await _client.post(
        Uri.parse('$baseUrl/api/v1/scratch-pad/sessions'),
        headers: _headers,
        body: jsonEncode({
          'learnerId': learnerId,
          'activityId': activityId,
          'questionId': questionId,
        }),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return ScratchPadSession.fromJson(data);
      }
      return null;
    } catch (e) {
      debugPrint('Start session error: $e');
      return null;
    }
  }

  /// Save canvas snapshot to session
  Future<bool> saveSnapshot({
    required String sessionId,
    required CanvasState canvasState,
    MathRecognitionResult? recognition,
  }) async {
    try {
      final response = await _client.post(
        Uri.parse('$baseUrl/api/v1/scratch-pad/sessions/$sessionId/snapshots'),
        headers: _headers,
        body: jsonEncode({
          'snapshot': canvasState.toJson(),
          'recognition': recognition?.toJson(),
        }),
      );

      return response.statusCode == 201;
    } catch (e) {
      debugPrint('Save snapshot error: $e');
      return false;
    }
  }

  /// Submit answer from scratch pad
  Future<AnswerSubmissionResult?> submitAnswer({
    required String sessionId,
    required String answer,
    required CanvasState canvasState,
    String? questionId,
  }) async {
    try {
      final response = await _client.post(
        Uri.parse('$baseUrl/api/v1/scratch-pad/sessions/$sessionId/submit'),
        headers: _headers,
        body: jsonEncode({
          'answer': answer,
          'questionId': questionId,
          'workShown': canvasState.toJson(),
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return AnswerSubmissionResult.fromJson(data);
      }
      return null;
    } catch (e) {
      debugPrint('Submit answer error: $e');
      return null;
    }
  }

  /// End scratch pad session
  Future<bool> endSession(String sessionId) async {
    try {
      final response = await _client.patch(
        Uri.parse('$baseUrl/api/v1/scratch-pad/sessions/$sessionId/complete'),
        headers: _headers,
      );

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('End session error: $e');
      return false;
    }
  }

  /// Get session history for a learner
  Future<List<ScratchPadSession>> getSessionHistory({
    required String learnerId,
    String? activityId,
    int limit = 20,
  }) async {
    try {
      final params = <String, String>{
        'learnerId': learnerId,
        'limit': limit.toString(),
        if (activityId != null) 'activityId': activityId,
      };

      final response = await _client.get(
        Uri.parse('$baseUrl/api/v1/scratch-pad/sessions')
            .replace(queryParameters: params),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final sessions = data['sessions'] as List;
        return sessions
            .map((s) => ScratchPadSession.fromJson(s as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint('Get session history error: $e');
      return [];
    }
  }

  /// Convert strokes to recognition-friendly format
  List<Map<String, dynamic>> _convertStrokesToRecognitionFormat(CanvasState canvasState) {
    return canvasState.strokes.map((stroke) {
      return {
        'id': stroke.id,
        'points': stroke.points.map((p) => {
          return {
            'x': p.x,
            'y': p.y,
            't': p.timestamp,
            'p': p.pressure,
          };
        }).toList(),
      };
    }).toList();
  }

  void dispose() {
    _client.close();
  }
}

/// Result of answer submission
class AnswerSubmissionResult {
  final bool isCorrect;
  final String? feedback;
  final double? partialCredit;
  final String? correctAnswer;
  final Map<String, dynamic>? workAnalysis;

  const AnswerSubmissionResult({
    required this.isCorrect,
    this.feedback,
    this.partialCredit,
    this.correctAnswer,
    this.workAnalysis,
  });

  factory AnswerSubmissionResult.fromJson(Map<String, dynamic> json) => AnswerSubmissionResult(
    isCorrect: json['isCorrect'] as bool,
    feedback: json['feedback'] as String?,
    partialCredit: (json['partialCredit'] as num?)?.toDouble(),
    correctAnswer: json['correctAnswer'] as String?,
    workAnalysis: json['workAnalysis'] as Map<String, dynamic>?,
  );
}

/// Provider for scratch pad service (for use with Provider package)
class ScratchPadProvider extends ChangeNotifier {
  final ScratchPadService service;
  ScratchPadSession? _currentSession;
  MathRecognitionResult? _lastRecognition;
  bool _isRecognizing = false;

  ScratchPadProvider({required this.service});

  ScratchPadSession? get currentSession => _currentSession;
  MathRecognitionResult? get lastRecognition => _lastRecognition;
  bool get isRecognizing => _isRecognizing;

  Future<void> startSession({
    required String learnerId,
    String? activityId,
    String? questionId,
  }) async {
    _currentSession = await service.startSession(
      learnerId: learnerId,
      activityId: activityId,
      questionId: questionId,
    );
    notifyListeners();
  }

  Future<void> recognize(CanvasState canvasState) async {
    _isRecognizing = true;
    notifyListeners();

    try {
      _lastRecognition = await service.recognizeMath(canvasState);
    } finally {
      _isRecognizing = false;
      notifyListeners();
    }
  }

  Future<AnswerSubmissionResult?> submitAnswer({
    required String answer,
    required CanvasState canvasState,
    String? questionId,
  }) async {
    if (_currentSession == null) return null;

    final result = await service.submitAnswer(
      sessionId: _currentSession!.id,
      answer: answer,
      canvasState: canvasState,
      questionId: questionId,
    );

    if (result != null) {
      // Save final snapshot
      await service.saveSnapshot(
        sessionId: _currentSession!.id,
        canvasState: canvasState,
        recognition: _lastRecognition,
      );
    }

    return result;
  }

  Future<void> endSession() async {
    if (_currentSession != null) {
      await service.endSession(_currentSession!.id);
      _currentSession = null;
      _lastRecognition = null;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    service.dispose();
    super.dispose();
  }
}
