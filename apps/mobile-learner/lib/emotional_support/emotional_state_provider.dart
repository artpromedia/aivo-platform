/// ND-2.3: Emotional State Provider
///
/// Manages emotional state detection and intervention delivery for learners.
/// Communicates with ai-orchestrator for state analysis and tracks intervention outcomes.

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Represents a suggested intervention from the emotional state analysis.
class SuggestedIntervention {
  final String interventionId;
  final String interventionType;
  final String name;
  final String reason;
  final double estimatedEffectiveness;
  final int durationSeconds;
  final String urgency;
  final InterventionContent content;

  const SuggestedIntervention({
    required this.interventionId,
    required this.interventionType,
    required this.name,
    required this.reason,
    required this.estimatedEffectiveness,
    required this.durationSeconds,
    required this.urgency,
    required this.content,
  });

  factory SuggestedIntervention.fromJson(Map<String, dynamic> json) {
    return SuggestedIntervention(
      interventionId: json['interventionId'] as String,
      interventionType: json['interventionType'] as String,
      name: json['name'] as String,
      reason: json['reason'] as String,
      estimatedEffectiveness: (json['estimatedEffectiveness'] as num).toDouble(),
      durationSeconds: json['duration'] as int,
      urgency: json['urgency'] as String,
      content: InterventionContent.fromJson(json['content'] as Map<String, dynamic>),
    );
  }
}

/// Content for an intervention.
class InterventionContent {
  final String instructions;
  final int durationSeconds;
  final List<String>? steps;
  final List<String>? affirmations;
  final List<String>? suggestions;
  final List<String>? activities;
  final String? mediaUrl;

  const InterventionContent({
    required this.instructions,
    required this.durationSeconds,
    this.steps,
    this.affirmations,
    this.suggestions,
    this.activities,
    this.mediaUrl,
  });

  factory InterventionContent.fromJson(Map<String, dynamic> json) {
    return InterventionContent(
      instructions: json['instructions'] as String,
      durationSeconds: json['duration'] as int? ?? 60,
      steps: (json['steps'] as List<dynamic>?)?.cast<String>(),
      affirmations: (json['affirmations'] as List<dynamic>?)?.cast<String>(),
      suggestions: (json['suggestions'] as List<dynamic>?)?.cast<String>(),
      activities: (json['activities'] as List<dynamic>?)?.cast<String>(),
      mediaUrl: json['mediaUrl'] as String?,
    );
  }
}

/// Emotional state analysis result from ai-orchestrator.
class EmotionalStateAnalysis {
  final String primaryState;
  final String? secondaryState;
  final double confidence;
  final double intensity;
  final String trend;
  final double anxietyRisk;
  final double overwhelmRisk;
  final double meltdownRisk;
  final bool recommendIntervention;
  final List<SuggestedIntervention> suggestedInterventions;
  final String urgency;

  const EmotionalStateAnalysis({
    required this.primaryState,
    this.secondaryState,
    required this.confidence,
    required this.intensity,
    required this.trend,
    required this.anxietyRisk,
    required this.overwhelmRisk,
    required this.meltdownRisk,
    required this.recommendIntervention,
    required this.suggestedInterventions,
    required this.urgency,
  });

  factory EmotionalStateAnalysis.fromJson(Map<String, dynamic> json) {
    return EmotionalStateAnalysis(
      primaryState: json['primaryState'] as String,
      secondaryState: json['secondaryState'] as String?,
      confidence: (json['confidence'] as num).toDouble(),
      intensity: (json['intensity'] as num).toDouble(),
      trend: json['trend'] as String,
      anxietyRisk: (json['anxietyRisk'] as num).toDouble(),
      overwhelmRisk: (json['overwhelmRisk'] as num).toDouble(),
      meltdownRisk: (json['meltdownRisk'] as num).toDouble(),
      recommendIntervention: json['recommendIntervention'] as bool,
      suggestedInterventions: (json['suggestedInterventions'] as List<dynamic>)
          .map((e) => SuggestedIntervention.fromJson(e as Map<String, dynamic>))
          .toList(),
      urgency: json['urgency'] as String,
    );
  }

  /// Check if the state indicates high risk.
  bool get isHighRisk => anxietyRisk > 7 || overwhelmRisk > 7 || meltdownRisk > 7;

  /// Check if the state indicates moderate risk.
  bool get isModerateRisk =>
      (anxietyRisk > 4 || overwhelmRisk > 4 || meltdownRisk > 4) && !isHighRisk;

  /// Check if this is a positive state.
  bool get isPositive => [
        'ENGAGED',
        'FOCUSED',
        'CONFIDENT',
        'CALM',
        'CURIOUS',
        'ACCOMPLISHED',
        'DETERMINED',
      ].contains(primaryState);
}

/// Provider for emotional state management.
class EmotionalStateProvider extends ChangeNotifier {
  final String baseUrl;
  final String learnerId;
  final String tenantId;
  final http.Client _httpClient;

  String? _sessionId;
  EmotionalStateAnalysis? _currentAnalysis;
  SuggestedIntervention? _activeIntervention;
  bool _isAnalyzing = false;
  DateTime? _lastAnalysisTime;
  Timer? _analysisTimer;

  // Behavioral signal tracking
  final List<int> _responseTimes = [];
  int _consecutiveCorrect = 0;
  int _consecutiveErrors = 0;
  int _errorCount = 0;
  int _totalResponses = 0;
  int _skipCount = 0;
  int _helpRequestCount = 0;
  int _backtrackCount = 0;
  int _focusLossCount = 0;
  DateTime? _sessionStartTime;
  DateTime? _lastInteractionTime;

  EmotionalStateProvider({
    required this.baseUrl,
    required this.learnerId,
    required this.tenantId,
    http.Client? httpClient,
  }) : _httpClient = httpClient ?? http.Client();

  EmotionalStateAnalysis? get currentAnalysis => _currentAnalysis;
  SuggestedIntervention? get activeIntervention => _activeIntervention;
  bool get isAnalyzing => _isAnalyzing;
  bool get hasActiveIntervention => _activeIntervention != null;
  String? get sessionId => _sessionId;

  /// Start a new session.
  void startSession(String sessionId) {
    _sessionId = sessionId;
    _sessionStartTime = DateTime.now();
    _resetSignals();
    notifyListeners();

    // Start periodic analysis
    _analysisTimer?.cancel();
    _analysisTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _maybeAnalyze(),
    );
  }

  /// End the current session.
  void endSession() {
    _analysisTimer?.cancel();
    _sessionId = null;
    _currentAnalysis = null;
    _activeIntervention = null;
    _resetSignals();
    notifyListeners();
  }

  void _resetSignals() {
    _responseTimes.clear();
    _consecutiveCorrect = 0;
    _consecutiveErrors = 0;
    _errorCount = 0;
    _totalResponses = 0;
    _skipCount = 0;
    _helpRequestCount = 0;
    _backtrackCount = 0;
    _focusLossCount = 0;
    _lastInteractionTime = null;
    _lastAnalysisTime = null;
  }

  /// Record a response.
  Future<void> recordResponse({
    required bool isCorrect,
    required int responseTimeMs,
  }) async {
    _responseTimes.add(responseTimeMs);
    _totalResponses++;
    _lastInteractionTime = DateTime.now();

    if (isCorrect) {
      _consecutiveCorrect++;
      _consecutiveErrors = 0;
    } else {
      _consecutiveErrors++;
      _consecutiveCorrect = 0;
      _errorCount++;
    }

    // Auto-analyze after 3+ consecutive errors
    if (_consecutiveErrors >= 3) {
      await analyzeState();
    }

    notifyListeners();
  }

  /// Record a skip action.
  void recordSkip() {
    _skipCount++;
    _lastInteractionTime = DateTime.now();
    notifyListeners();
  }

  /// Record a help request.
  void recordHelpRequest() {
    _helpRequestCount++;
    _lastInteractionTime = DateTime.now();
    notifyListeners();
  }

  /// Record backtracking.
  void recordBacktrack() {
    _backtrackCount++;
    _lastInteractionTime = DateTime.now();
    notifyListeners();
  }

  /// Record focus loss.
  void recordFocusLoss() {
    _focusLossCount++;
    notifyListeners();
  }

  /// Record explicit mood rating (1-5).
  Future<void> recordMoodRating(int rating) async {
    await analyzeState(overrides: {'explicitMoodRating': rating});
  }

  /// Record explicit frustration.
  Future<void> recordFrustration() async {
    await analyzeState(overrides: {'explicitFrustrationReport': true});
  }

  /// Record break request.
  Future<void> recordBreakRequest() async {
    await analyzeState(overrides: {'requestedBreak': true});
  }

  /// Manually trigger state analysis.
  Future<EmotionalStateAnalysis?> analyzeState({
    Map<String, dynamic>? overrides,
  }) async {
    if (_sessionId == null || _isAnalyzing) return null;

    _isAnalyzing = true;
    notifyListeners();

    try {
      final signals = _buildSignals(overrides);
      final context = _buildContext();

      final response = await _httpClient.post(
        Uri.parse('$baseUrl/emotional-state/analyze'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'learnerId': learnerId,
          'tenantId': tenantId,
          'sessionId': _sessionId,
          'signals': signals,
          'context': context,
        }),
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        _currentAnalysis = EmotionalStateAnalysis.fromJson(json);
        _lastAnalysisTime = DateTime.now();

        // Auto-show intervention for high urgency
        if (_currentAnalysis!.recommendIntervention &&
            _currentAnalysis!.suggestedInterventions.isNotEmpty &&
            (_currentAnalysis!.urgency == 'immediate' ||
                _currentAnalysis!.urgency == 'high')) {
          showIntervention(_currentAnalysis!.suggestedInterventions.first);
        }

        notifyListeners();
        return _currentAnalysis;
      }
    } catch (e) {
      debugPrint('Error analyzing emotional state: $e');
    } finally {
      _isAnalyzing = false;
      notifyListeners();
    }

    return null;
  }

  /// Show an intervention to the user.
  void showIntervention(SuggestedIntervention intervention) {
    _activeIntervention = intervention;
    notifyListeners();
  }

  /// Record that an intervention was accepted.
  Future<void> acceptIntervention() async {
    if (_activeIntervention == null || _sessionId == null) return;

    await _recordInterventionOutcome(
      interventionId: _activeIntervention!.interventionId,
      accepted: true,
    );

    notifyListeners();
  }

  /// Record that an intervention was declined.
  Future<void> declineIntervention() async {
    if (_activeIntervention == null || _sessionId == null) return;

    await _recordInterventionOutcome(
      interventionId: _activeIntervention!.interventionId,
      accepted: false,
    );

    _activeIntervention = null;
    notifyListeners();
  }

  /// Complete the active intervention.
  Future<void> completeIntervention() async {
    if (_activeIntervention == null) return;

    // Re-analyze state after intervention
    _activeIntervention = null;
    await analyzeState();
  }

  Future<void> _recordInterventionOutcome({
    required String interventionId,
    required bool accepted,
    String? stateAfter,
  }) async {
    if (_sessionId == null) return;

    try {
      await _httpClient.post(
        Uri.parse('$baseUrl/emotional-state/interventions/outcome'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'sessionId': _sessionId,
          'learnerId': learnerId,
          'tenantId': tenantId,
          'interventionId': interventionId,
          'accepted': accepted,
          'stateAfter': stateAfter,
        }),
      );
    } catch (e) {
      debugPrint('Error recording intervention outcome: $e');
    }
  }

  Future<void> _maybeAnalyze() async {
    // Only analyze if enough time has passed
    if (_lastAnalysisTime != null) {
      final elapsed = DateTime.now().difference(_lastAnalysisTime!);
      if (elapsed.inSeconds < 30) return;
    }

    // Only analyze after first minute of session
    if (_sessionStartTime != null) {
      final sessionDuration = DateTime.now().difference(_sessionStartTime!);
      if (sessionDuration.inSeconds < 60) return;
    }

    await analyzeState();
  }

  Map<String, dynamic> _buildSignals(Map<String, dynamic>? overrides) {
    final now = DateTime.now();
    final recentTimes = _responseTimes.length > 10
        ? _responseTimes.sublist(_responseTimes.length - 10)
        : _responseTimes;

    final avgResponseTime = recentTimes.isNotEmpty
        ? recentTimes.reduce((a, b) => a + b) / recentTimes.length
        : 5000;

    // Calculate variance
    double variance = 1;
    if (recentTimes.length > 1) {
      final squaredDiffs = recentTimes
          .map((t) => (t - avgResponseTime) * (t - avgResponseTime))
          .toList();
      variance = squaredDiffs.reduce((a, b) => a + b) /
          recentTimes.length /
          (avgResponseTime * avgResponseTime);
      variance = variance.clamp(0, 10).toDouble();
    }

    final timeSinceLastInteraction = _lastInteractionTime != null
        ? now.difference(_lastInteractionTime!).inMilliseconds
        : 0;

    final sessionDurationMs = _sessionStartTime != null
        ? now.difference(_sessionStartTime!).inMilliseconds
        : 0;

    return {
      'responseTimeMs': recentTimes.isNotEmpty ? recentTimes.last : 0,
      'averageResponseTimeMs': avgResponseTime,
      'responseTimeVariance': variance,
      'timeSinceLastInteraction': timeSinceLastInteraction,
      'timeOnCurrentActivity': sessionDurationMs,
      'timeSinceLastBreak': sessionDurationMs,
      'interactionCount': _totalResponses + _skipCount + _helpRequestCount,
      'clicksPerMinute': sessionDurationMs > 0
          ? (_totalResponses + _skipCount + _helpRequestCount) /
              (sessionDurationMs / 60000)
          : 0,
      'scrollBehavior': 'normal',
      'backtrackCount': _backtrackCount,
      'consecutiveCorrect': _consecutiveCorrect,
      'consecutiveErrors': _consecutiveErrors,
      'errorRate': _totalResponses > 0 ? _errorCount / _totalResponses : 0,
      'skipCount': _skipCount,
      'helpRequestCount': _helpRequestCount,
      'hintUsageCount': 0,
      'contentCompletionRate': 0,
      'focusLossCount': _focusLossCount,
      'idleTimeMs': timeSinceLastInteraction,
      ...?overrides,
    };
  }

  Map<String, dynamic> _buildContext() {
    final now = DateTime.now();
    final sessionDurationMinutes = _sessionStartTime != null
        ? now.difference(_sessionStartTime!).inMinutes.toDouble()
        : 0;

    String timeOfDay;
    if (now.hour < 12) {
      timeOfDay = 'morning';
    } else if (now.hour >= 18) {
      timeOfDay = 'evening';
    } else {
      timeOfDay = 'afternoon';
    }

    return {
      'activityType': 'learning',
      'activityDifficulty': 'medium',
      'isNewContent': false,
      'isAssessment': false,
      'hasTimeLimit': false,
      'sessionDurationMinutes': sessionDurationMinutes,
      'activitiesCompleted': 0,
      'breaksTaken': 0,
      'lastBreakMinutesAgo': sessionDurationMinutes,
      'previousPerformanceOnTopic': 70,
      'typicalSessionLength': 30,
      'typicalBreakFrequency': 3,
      'estimatedCognitiveLoad': 5,
      'estimatedSensoryLoad': 5,
      'timeOfDay': timeOfDay,
      'dayOfWeek': now.weekday,
      'knownAnxietyTriggers': <String>[],
      'knownCalmingStrategies': <String>[],
    };
  }

  @override
  void dispose() {
    _analysisTimer?.cancel();
    _httpClient.close();
    super.dispose();
  }
}
