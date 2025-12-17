/// Analytics Service
///
/// Mobile client for tracking learner analytics and events.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Analytics event type.
enum AnalyticsEventType {
  // Screen events
  screenView,
  screenExit,
  
  // Session events
  sessionStart,
  sessionEnd,
  sessionPause,
  sessionResume,
  
  // Content events
  contentStart,
  contentComplete,
  contentSkip,
  contentInteraction,
  
  // Question events
  questionView,
  questionAnswer,
  questionHint,
  questionSkip,
  
  // Engagement events
  badgeEarned,
  levelUp,
  streakUpdate,
  xpEarned,
  
  // Navigation events
  buttonClick,
  linkClick,
  swipe,
  
  // Error events
  error,
  
  // Custom events
  custom;
}

/// Analytics event.
class AnalyticsEvent {
  const AnalyticsEvent({
    required this.id,
    required this.type,
    required this.name,
    required this.timestamp,
    this.properties = const {},
    this.sessionId,
    this.screenName,
    this.userId,
  });

  final String id;
  final AnalyticsEventType type;
  final String name;
  final DateTime timestamp;
  final Map<String, dynamic> properties;
  final String? sessionId;
  final String? screenName;
  final String? userId;

  factory AnalyticsEvent.fromJson(Map<String, dynamic> json) {
    return AnalyticsEvent(
      id: json['id'] as String,
      type: AnalyticsEventType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => AnalyticsEventType.custom,
      ),
      name: json['name'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      properties: (json['properties'] as Map<String, dynamic>?) ?? {},
      sessionId: json['sessionId'] as String?,
      screenName: json['screenName'] as String?,
      userId: json['userId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'name': name,
        'timestamp': timestamp.toIso8601String(),
        'properties': properties,
        'sessionId': sessionId,
        'screenName': screenName,
        'userId': userId,
      };
}

/// Screen view analytics.
class ScreenAnalytics {
  const ScreenAnalytics({
    required this.screenName,
    required this.viewCount,
    required this.totalDuration,
    required this.averageDuration,
    this.lastViewed,
  });

  final String screenName;
  final int viewCount;
  final Duration totalDuration;
  final Duration averageDuration;
  final DateTime? lastViewed;

  factory ScreenAnalytics.fromJson(Map<String, dynamic> json) {
    return ScreenAnalytics(
      screenName: json['screenName'] as String,
      viewCount: json['viewCount'] as int? ?? 0,
      totalDuration:
          Duration(milliseconds: json['totalDurationMs'] as int? ?? 0),
      averageDuration:
          Duration(milliseconds: json['averageDurationMs'] as int? ?? 0),
      lastViewed: json['lastViewed'] != null
          ? DateTime.parse(json['lastViewed'] as String)
          : null,
    );
  }
}

/// Learning analytics summary.
class LearningAnalytics {
  const LearningAnalytics({
    required this.totalSessions,
    required this.totalLearningTime,
    required this.averageSessionDuration,
    required this.questionsAnswered,
    required this.correctAnswers,
    required this.accuracy,
    required this.contentCompleted,
    required this.subjectBreakdown,
    this.weeklyTrend = const [],
  });

  final int totalSessions;
  final Duration totalLearningTime;
  final Duration averageSessionDuration;
  final int questionsAnswered;
  final int correctAnswers;
  final double accuracy;
  final int contentCompleted;
  final Map<String, SubjectAnalytics> subjectBreakdown;
  final List<DailyAnalytics> weeklyTrend;

  factory LearningAnalytics.fromJson(Map<String, dynamic> json) {
    return LearningAnalytics(
      totalSessions: json['totalSessions'] as int? ?? 0,
      totalLearningTime: Duration(
        minutes: json['totalLearningTimeMinutes'] as int? ?? 0,
      ),
      averageSessionDuration: Duration(
        minutes: json['averageSessionDurationMinutes'] as int? ?? 0,
      ),
      questionsAnswered: json['questionsAnswered'] as int? ?? 0,
      correctAnswers: json['correctAnswers'] as int? ?? 0,
      accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0.0,
      contentCompleted: json['contentCompleted'] as int? ?? 0,
      subjectBreakdown:
          (json['subjectBreakdown'] as Map<String, dynamic>?)?.map(
                (k, v) => MapEntry(
                  k,
                  SubjectAnalytics.fromJson(v as Map<String, dynamic>),
                ),
              ) ??
              {},
      weeklyTrend: (json['weeklyTrend'] as List<dynamic>?)
              ?.map((d) => DailyAnalytics.fromJson(d as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

/// Analytics for a specific subject.
class SubjectAnalytics {
  const SubjectAnalytics({
    required this.subject,
    required this.timeSpent,
    required this.questionsAnswered,
    required this.accuracy,
    required this.topicsCompleted,
  });

  final String subject;
  final Duration timeSpent;
  final int questionsAnswered;
  final double accuracy;
  final int topicsCompleted;

  factory SubjectAnalytics.fromJson(Map<String, dynamic> json) {
    return SubjectAnalytics(
      subject: json['subject'] as String? ?? '',
      timeSpent: Duration(minutes: json['timeSpentMinutes'] as int? ?? 0),
      questionsAnswered: json['questionsAnswered'] as int? ?? 0,
      accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0.0,
      topicsCompleted: json['topicsCompleted'] as int? ?? 0,
    );
  }
}

/// Daily analytics data.
class DailyAnalytics {
  const DailyAnalytics({
    required this.date,
    required this.sessions,
    required this.learningTime,
    required this.questionsAnswered,
    required this.xpEarned,
  });

  final DateTime date;
  final int sessions;
  final Duration learningTime;
  final int questionsAnswered;
  final int xpEarned;

  factory DailyAnalytics.fromJson(Map<String, dynamic> json) {
    return DailyAnalytics(
      date: DateTime.parse(json['date'] as String),
      sessions: json['sessions'] as int? ?? 0,
      learningTime: Duration(minutes: json['learningTimeMinutes'] as int? ?? 0),
      questionsAnswered: json['questionsAnswered'] as int? ?? 0,
      xpEarned: json['xpEarned'] as int? ?? 0,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for tracking and retrieving analytics.
class AnalyticsService {
  AnalyticsService({
    required AivoApiClient apiClient,
  }) : _apiClient = apiClient;

  final AivoApiClient _apiClient;
  static const String _basePath = '/analytics/v1';
  static const String _eventQueueKey = 'analytics_event_queue';
  static const int _batchSize = 50;
  static const Duration _flushInterval = Duration(seconds: 30);

  final List<AnalyticsEvent> _eventQueue = [];
  Timer? _flushTimer;
  String? _currentSessionId;
  String? _currentScreen;
  DateTime? _screenEnteredAt;

  /// Initialize analytics service.
  Future<void> initialize() async {
    // Load any queued events from storage
    await _loadQueuedEvents();
    
    // Start flush timer
    _flushTimer = Timer.periodic(_flushInterval, (_) => flush());
  }

  /// Set current user ID.
  void setUserId(String? userId) {
    // User ID is tracked per event
  }

  /// Set current session ID.
  void setSessionId(String sessionId) {
    _currentSessionId = sessionId;
  }

  /// Track screen view.
  void trackScreenView(String screenName) {
    // End previous screen if any
    if (_currentScreen != null && _screenEnteredAt != null) {
      final duration = DateTime.now().difference(_screenEnteredAt!);
      trackEvent(
        type: AnalyticsEventType.screenExit,
        name: 'screen_exit',
        properties: {
          'screen': _currentScreen,
          'durationMs': duration.inMilliseconds,
        },
      );
    }

    _currentScreen = screenName;
    _screenEnteredAt = DateTime.now();

    trackEvent(
      type: AnalyticsEventType.screenView,
      name: 'screen_view',
      properties: {'screen': screenName},
    );
  }

  /// Track custom event.
  void trackEvent({
    required AnalyticsEventType type,
    required String name,
    Map<String, dynamic> properties = const {},
  }) {
    final event = AnalyticsEvent(
      id: _generateEventId(),
      type: type,
      name: name,
      timestamp: DateTime.now(),
      properties: properties,
      sessionId: _currentSessionId,
      screenName: _currentScreen,
    );

    _eventQueue.add(event);

    // Flush if queue is full
    if (_eventQueue.length >= _batchSize) {
      flush();
    }
  }

  /// Track session start.
  void trackSessionStart({
    required String sessionId,
    String? subject,
    String? topic,
  }) {
    _currentSessionId = sessionId;
    trackEvent(
      type: AnalyticsEventType.sessionStart,
      name: 'session_start',
      properties: {
        'sessionId': sessionId,
        if (subject != null) 'subject': subject,
        if (topic != null) 'topic': topic,
      },
    );
  }

  /// Track session end.
  void trackSessionEnd({
    int? durationSeconds,
    int? questionsAnswered,
    int? xpEarned,
  }) {
    trackEvent(
      type: AnalyticsEventType.sessionEnd,
      name: 'session_end',
      properties: {
        if (durationSeconds != null) 'durationSeconds': durationSeconds,
        if (questionsAnswered != null) 'questionsAnswered': questionsAnswered,
        if (xpEarned != null) 'xpEarned': xpEarned,
      },
    );
    _currentSessionId = null;
  }

  /// Track content interaction.
  void trackContentInteraction({
    required String contentId,
    required String interactionType,
    Map<String, dynamic>? additionalProperties,
  }) {
    trackEvent(
      type: AnalyticsEventType.contentInteraction,
      name: 'content_interaction',
      properties: {
        'contentId': contentId,
        'interactionType': interactionType,
        ...?additionalProperties,
      },
    );
  }

  /// Track question answer.
  void trackQuestionAnswer({
    required String questionId,
    required bool correct,
    int? timeSpentSeconds,
    bool? usedHint,
  }) {
    trackEvent(
      type: AnalyticsEventType.questionAnswer,
      name: 'question_answer',
      properties: {
        'questionId': questionId,
        'correct': correct,
        if (timeSpentSeconds != null) 'timeSpentSeconds': timeSpentSeconds,
        if (usedHint != null) 'usedHint': usedHint,
      },
    );
  }

  /// Track XP earned.
  void trackXpEarned({
    required int amount,
    required String source,
  }) {
    trackEvent(
      type: AnalyticsEventType.xpEarned,
      name: 'xp_earned',
      properties: {
        'amount': amount,
        'source': source,
      },
    );
  }

  /// Track badge earned.
  void trackBadgeEarned({
    required String badgeId,
    required String badgeName,
  }) {
    trackEvent(
      type: AnalyticsEventType.badgeEarned,
      name: 'badge_earned',
      properties: {
        'badgeId': badgeId,
        'badgeName': badgeName,
      },
    );
  }

  /// Track error.
  void trackError({
    required String errorType,
    required String errorMessage,
    String? stackTrace,
  }) {
    trackEvent(
      type: AnalyticsEventType.error,
      name: 'error',
      properties: {
        'errorType': errorType,
        'errorMessage': errorMessage,
        if (stackTrace != null) 'stackTrace': stackTrace,
      },
    );
  }

  /// Flush events to server.
  Future<void> flush() async {
    if (_eventQueue.isEmpty) return;

    final eventsToSend = List<AnalyticsEvent>.from(_eventQueue);
    _eventQueue.clear();

    try {
      await _apiClient.post(
        '$_basePath/events/batch',
        data: {
          'events': eventsToSend.map((e) => e.toJson()).toList(),
        },
      );
    } catch (e) {
      // Re-queue events on failure
      _eventQueue.insertAll(0, eventsToSend);
      await _persistQueue();
    }
  }

  /// Get learning analytics.
  Future<LearningAnalytics> getLearningAnalytics({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '$_basePath/learner/summary',
      queryParameters: {
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      },
    );

    return LearningAnalytics.fromJson(response.data ?? {});
  }

  /// Get screen analytics.
  Future<List<ScreenAnalytics>> getScreenAnalytics() async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_basePath/learner/screens',
    );

    return (response.data ?? [])
        .map((s) => ScreenAnalytics.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  /// Get weekly trend.
  Future<List<DailyAnalytics>> getWeeklyTrend() async {
    final response = await _apiClient.get<List<dynamic>>(
      '$_basePath/learner/weekly-trend',
    );

    return (response.data ?? [])
        .map((d) => DailyAnalytics.fromJson(d as Map<String, dynamic>))
        .toList();
  }

  // Private methods

  String _generateEventId() {
    return '${DateTime.now().millisecondsSinceEpoch}_${_eventQueue.length}';
  }

  Future<void> _loadQueuedEvents() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final queueJson = prefs.getString(_eventQueueKey);
      if (queueJson != null) {
        final List<dynamic> events = jsonDecode(queueJson);
        _eventQueue.addAll(
          events.map((e) => AnalyticsEvent.fromJson(e as Map<String, dynamic>)),
        );
        // Clear persisted queue
        await prefs.remove(_eventQueueKey);
      }
    } catch (e) {
      // Ignore errors loading queue
    }
  }

  Future<void> _persistQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final queueJson = jsonEncode(_eventQueue.map((e) => e.toJson()).toList());
      await prefs.setString(_eventQueueKey, queueJson);
    } catch (e) {
      // Ignore errors persisting queue
    }
  }

  /// Dispose resources.
  void dispose() {
    _flushTimer?.cancel();
    flush(); // Attempt final flush
    _persistQueue(); // Persist any remaining events
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for AnalyticsService.
final analyticsServiceProvider = Provider<AnalyticsService>((ref) {
  final service = AnalyticsService(
    apiClient: AivoApiClient.instance,
  );

  // Initialize service
  service.initialize();

  ref.onDispose(() => service.dispose());

  return service;
});

/// Provider for learning analytics.
final learningAnalyticsProvider =
    FutureProvider<LearningAnalytics>((ref) async {
  final service = ref.watch(analyticsServiceProvider);
  return service.getLearningAnalytics();
});

/// Provider for weekly trend.
final weeklyTrendProvider = FutureProvider<List<DailyAnalytics>>((ref) async {
  final service = ref.watch(analyticsServiceProvider);
  return service.getWeeklyTrend();
});
