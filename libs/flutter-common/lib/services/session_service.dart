/// Session Service
///
/// Manages learning sessions, progress tracking, and session state.
library;

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_config.dart';
import '../offline/sync_manager.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Session type enumeration.
enum SessionType {
  practice,
  assessment,
  review,
  homework,
  baseline;

  String get displayName => switch (this) {
        practice => 'Practice',
        assessment => 'Assessment',
        review => 'Review',
        homework => 'Homework',
        baseline => 'Baseline',
      };
}

/// Learning session model.
class LearningSession {
  const LearningSession({
    required this.id,
    required this.learnerId,
    required this.type,
    required this.status,
    this.subjectId,
    this.topicId,
    this.subjectName,
    this.topicName,
    required this.targetDurationMinutes,
    required this.startedAt,
    this.endedAt,
    this.pausedAt,
    this.timeSpentSeconds = 0,
    this.contents = const [],
    this.metadata = const {},
  });

  final String id;
  final String learnerId;
  final SessionType type;
  final String status; // 'active', 'paused', 'completed', 'abandoned'
  final String? subjectId;
  final String? topicId;
  final String? subjectName;
  final String? topicName;
  final int targetDurationMinutes;
  final DateTime startedAt;
  final DateTime? endedAt;
  final DateTime? pausedAt;
  final int timeSpentSeconds;
  final List<SessionContent> contents;
  final Map<String, dynamic> metadata;

  bool get isActive => status == 'active';
  bool get isPaused => status == 'paused';
  bool get isComplete => status == 'completed';
  int get questionsAnswered =>
      contents.where((c) => c.completed).length;
  double get progress =>
      contents.isEmpty ? 0 : questionsAnswered / contents.length;
  SessionContent? get currentContent =>
      contents.where((c) => !c.completed).firstOrNull;

  factory LearningSession.fromJson(Map<String, dynamic> json) {
    return LearningSession(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String? ?? json['userId'] as String,
      type: SessionType.values.firstWhere(
        (t) => t.name == (json['type'] as String?)?.toLowerCase(),
        orElse: () => SessionType.practice,
      ),
      status: json['status'] as String? ?? 'active',
      subjectId: json['subjectId'] as String?,
      topicId: json['topicId'] as String?,
      subjectName: json['subjectName'] as String?,
      topicName: json['topicName'] as String?,
      targetDurationMinutes: json['targetDurationMinutes'] as int? ?? 15,
      startedAt: DateTime.parse(json['startedAt'] as String),
      endedAt: json['endedAt'] != null
          ? DateTime.parse(json['endedAt'] as String)
          : null,
      pausedAt: json['pausedAt'] != null
          ? DateTime.parse(json['pausedAt'] as String)
          : null,
      timeSpentSeconds: json['timeSpentSeconds'] as int? ?? 0,
      contents: (json['contents'] as List<dynamic>?)
              ?.map((c) => SessionContent.fromJson(c as Map<String, dynamic>))
              .toList() ??
          [],
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'learnerId': learnerId,
        'type': type.name,
        'status': status,
        'subjectId': subjectId,
        'topicId': topicId,
        'subjectName': subjectName,
        'topicName': topicName,
        'targetDurationMinutes': targetDurationMinutes,
        'startedAt': startedAt.toIso8601String(),
        'endedAt': endedAt?.toIso8601String(),
        'pausedAt': pausedAt?.toIso8601String(),
        'timeSpentSeconds': timeSpentSeconds,
        'contents': contents.map((c) => c.toJson()).toList(),
        'metadata': metadata,
      };

  LearningSession copyWith({
    String? id,
    String? learnerId,
    SessionType? type,
    String? status,
    String? subjectId,
    String? topicId,
    String? subjectName,
    String? topicName,
    int? targetDurationMinutes,
    DateTime? startedAt,
    DateTime? endedAt,
    DateTime? pausedAt,
    int? timeSpentSeconds,
    List<SessionContent>? contents,
    Map<String, dynamic>? metadata,
  }) {
    return LearningSession(
      id: id ?? this.id,
      learnerId: learnerId ?? this.learnerId,
      type: type ?? this.type,
      status: status ?? this.status,
      subjectId: subjectId ?? this.subjectId,
      topicId: topicId ?? this.topicId,
      subjectName: subjectName ?? this.subjectName,
      topicName: topicName ?? this.topicName,
      targetDurationMinutes:
          targetDurationMinutes ?? this.targetDurationMinutes,
      startedAt: startedAt ?? this.startedAt,
      endedAt: endedAt ?? this.endedAt,
      pausedAt: pausedAt ?? this.pausedAt,
      timeSpentSeconds: timeSpentSeconds ?? this.timeSpentSeconds,
      contents: contents ?? this.contents,
      metadata: metadata ?? this.metadata,
    );
  }
}

/// Content within a session.
class SessionContent {
  const SessionContent({
    required this.contentId,
    required this.contentType,
    required this.title,
    this.content,
    required this.orderIndex,
    this.completed = false,
    this.progressPercent,
    this.timeSpentSeconds,
    this.response,
    this.isCorrect,
  });

  final String contentId;
  final String contentType;
  final String title;
  final dynamic content;
  final int orderIndex;
  final bool completed;
  final double? progressPercent;
  final int? timeSpentSeconds;
  final dynamic response;
  final bool? isCorrect;

  factory SessionContent.fromJson(Map<String, dynamic> json) {
    return SessionContent(
      contentId: json['contentId'] as String,
      contentType: json['contentType'] as String,
      title: json['title'] as String,
      content: json['content'],
      orderIndex: json['orderIndex'] as int? ?? 0,
      completed: json['completed'] as bool? ?? false,
      progressPercent: (json['progressPercent'] as num?)?.toDouble(),
      timeSpentSeconds: json['timeSpentSeconds'] as int?,
      response: json['response'],
      isCorrect: json['isCorrect'] as bool?,
    );
  }

  Map<String, dynamic> toJson() => {
        'contentId': contentId,
        'contentType': contentType,
        'title': title,
        'content': content,
        'orderIndex': orderIndex,
        'completed': completed,
        'progressPercent': progressPercent,
        'timeSpentSeconds': timeSpentSeconds,
        'response': response,
        'isCorrect': isCorrect,
      };
}

/// Session summary after completion.
class SessionSummary {
  const SessionSummary({
    required this.sessionId,
    required this.totalTimeMinutes,
    required this.contentCompleted,
    required this.xpEarned,
    this.averageScore,
    required this.streakMaintained,
    this.badgesEarned = const [],
    this.levelProgress,
    this.recommendations = const [],
  });

  final String sessionId;
  final int totalTimeMinutes;
  final int contentCompleted;
  final int xpEarned;
  final double? averageScore;
  final bool streakMaintained;
  final List<BadgeEarned> badgesEarned;
  final LevelProgress? levelProgress;
  final List<String> recommendations;

  factory SessionSummary.fromJson(Map<String, dynamic> json) {
    return SessionSummary(
      sessionId: json['sessionId'] as String,
      totalTimeMinutes: json['totalTimeMinutes'] as int? ?? 0,
      contentCompleted: json['contentCompleted'] as int? ?? 0,
      xpEarned: json['xpEarned'] as int? ?? 0,
      averageScore: (json['averageScore'] as num?)?.toDouble(),
      streakMaintained: json['streakMaintained'] as bool? ?? false,
      badgesEarned: (json['badgesEarned'] as List<dynamic>?)
              ?.map((b) => BadgeEarned.fromJson(b as Map<String, dynamic>))
              .toList() ??
          [],
      levelProgress: json['levelProgress'] != null
          ? LevelProgress.fromJson(
              json['levelProgress'] as Map<String, dynamic>)
          : null,
      recommendations:
          (json['recommendations'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }
}

/// Badge earned during session.
class BadgeEarned {
  const BadgeEarned({
    required this.badgeId,
    required this.name,
    required this.icon,
    required this.xpReward,
  });

  final String badgeId;
  final String name;
  final String icon;
  final int xpReward;

  factory BadgeEarned.fromJson(Map<String, dynamic> json) {
    return BadgeEarned(
      badgeId: json['badgeId'] as String,
      name: json['name'] as String,
      icon: json['icon'] as String? ?? 'badge',
      xpReward: json['xpReward'] as int? ?? 0,
    );
  }
}

/// Level progress information.
class LevelProgress {
  const LevelProgress({
    required this.previousLevel,
    required this.currentLevel,
    required this.currentXp,
    required this.xpForNextLevel,
    required this.leveledUp,
    this.levelTitle,
  });

  final int previousLevel;
  final int currentLevel;
  final int currentXp;
  final int xpForNextLevel;
  final bool leveledUp;
  final String? levelTitle;

  double get progressPercent => xpForNextLevel > 0
      ? (currentXp / xpForNextLevel).clamp(0.0, 1.0)
      : 0.0;

  factory LevelProgress.fromJson(Map<String, dynamic> json) {
    return LevelProgress(
      previousLevel: json['previousLevel'] as int? ?? 1,
      currentLevel: json['currentLevel'] as int? ?? 1,
      currentXp: json['currentXp'] as int? ?? 0,
      xpForNextLevel: json['xpForNextLevel'] as int? ?? 100,
      leveledUp: json['leveledUp'] as bool? ?? false,
      levelTitle: json['levelTitle'] as String?,
    );
  }
}

/// Session history entry.
class SessionHistory {
  const SessionHistory({
    required this.id,
    required this.date,
    required this.type,
    required this.durationMinutes,
    required this.contentCompleted,
    required this.xpEarned,
    this.subjectName,
    this.averageScore,
  });

  final String id;
  final DateTime date;
  final SessionType type;
  final int durationMinutes;
  final int contentCompleted;
  final int xpEarned;
  final String? subjectName;
  final double? averageScore;

  factory SessionHistory.fromJson(Map<String, dynamic> json) {
    return SessionHistory(
      id: json['id'] as String,
      date: DateTime.parse(json['date'] as String),
      type: SessionType.values.firstWhere(
        (t) => t.name == (json['type'] as String?)?.toLowerCase(),
        orElse: () => SessionType.practice,
      ),
      durationMinutes: json['durationMinutes'] as int? ?? 0,
      contentCompleted: json['contentCompleted'] as int? ?? 0,
      xpEarned: json['xpEarned'] as int? ?? 0,
      subjectName: json['subjectName'] as String?,
      averageScore: (json['averageScore'] as num?)?.toDouble(),
    );
  }
}

/// Session statistics.
class SessionStats {
  const SessionStats({
    required this.totalSessions,
    required this.totalMinutes,
    required this.totalContentCompleted,
    required this.totalXpEarned,
    required this.averageSessionMinutes,
    this.sessionsByDay = const {},
    this.sessionsBySubject = const {},
  });

  final int totalSessions;
  final int totalMinutes;
  final int totalContentCompleted;
  final int totalXpEarned;
  final double averageSessionMinutes;
  final Map<String, int> sessionsByDay;
  final Map<String, int> sessionsBySubject;

  factory SessionStats.fromJson(Map<String, dynamic> json) {
    return SessionStats(
      totalSessions: json['totalSessions'] as int? ?? 0,
      totalMinutes: json['totalMinutes'] as int? ?? 0,
      totalContentCompleted: json['totalContentCompleted'] as int? ?? 0,
      totalXpEarned: json['totalXpEarned'] as int? ?? 0,
      averageSessionMinutes:
          (json['averageSessionMinutes'] as num? ?? 0).toDouble(),
      sessionsByDay: Map<String, int>.from(json['sessionsByDay'] ?? {}),
      sessionsBySubject: Map<String, int>.from(json['sessionsBySubject'] ?? {}),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for managing learning sessions.
class SessionService {
  SessionService({
    required AivoApiClient apiClient,
    SyncManager? syncManager,
  })  : _apiClient = apiClient,
        _syncManager = syncManager;

  final AivoApiClient _apiClient;
  final SyncManager? _syncManager;

  LearningSession? _currentSession;
  LearningSession? get currentSession => _currentSession;

  /// Start a new learning session.
  Future<LearningSession> startSession({
    required String learnerId,
    String? subjectId,
    String? topicId,
    SessionType type = SessionType.practice,
    int durationMinutes = 15,
    Map<String, dynamic>? metadata,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiEndpoints.sessions,
      data: {
        'learnerId': learnerId,
        'subjectId': subjectId,
        'topicId': topicId,
        'type': type.name,
        'targetDurationMinutes': durationMinutes,
        'metadata': metadata,
      },
    );

    final session = LearningSession.fromJson(response.data!);
    _currentSession = session;

    return session;
  }

  /// Get a specific session by ID.
  Future<LearningSession> getSession(String sessionId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiEndpoints.session(sessionId),
    );

    final session = LearningSession.fromJson(response.data!);
    return session;
  }

  /// Get the current active session for a learner.
  Future<LearningSession?> getCurrentSession(String learnerId) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '${ApiEndpoints.sessions}/current',
        queryParameters: {'learnerId': learnerId},
      );

      if (response.data == null) return null;

      final session = LearningSession.fromJson(response.data!);
      _currentSession = session;
      return session;
    } catch (e) {
      return null;
    }
  }

  /// Get next content for the session.
  Future<SessionContent?> getNextContent(String sessionId) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '${ApiEndpoints.session(sessionId)}/next',
    );

    if (response.data == null) return null;
    return SessionContent.fromJson(response.data!);
  }

  /// Record progress on content.
  Future<void> recordProgress({
    required String sessionId,
    required String contentId,
    required int timeSpentSeconds,
    double? progressPercent,
    bool? completed,
    dynamic response,
    bool? isCorrect,
    Map<String, dynamic>? interactionData,
  }) async {
    final data = {
      'contentId': contentId,
      'timeSpentSeconds': timeSpentSeconds,
      'progressPercent': progressPercent,
      'completed': completed,
      'response': response,
      'isCorrect': isCorrect,
      'interactionData': interactionData,
    };

    // If offline, queue the event via SyncManager's session-based recording
    if (_syncManager != null && _currentSession != null) {
      await _syncManager.recordEvent(
        _currentSession!.id,
        LearnerEvent(
          type: LearnerEventType.learningEvent,
          payload: {
            'sessionId': sessionId,
            ...data,
          },
        ),
      );
    }

    try {
      await _apiClient.post(
        '${ApiEndpoints.session(sessionId)}/progress',
        data: data,
      );
    } catch (e) {
      // If network fails, the event is already queued
      if (_syncManager == null) rethrow;
    }
  }

  /// Pause the session.
  Future<void> pauseSession(String sessionId) async {
    await _apiClient.post('${ApiEndpoints.session(sessionId)}/pause');
    if (_currentSession?.id == sessionId) {
      _currentSession = _currentSession?.copyWith(status: 'paused');
    }
  }

  /// Resume a paused session.
  Future<void> resumeSession(String sessionId) async {
    await _apiClient.post('${ApiEndpoints.session(sessionId)}/resume');
    if (_currentSession?.id == sessionId) {
      _currentSession = _currentSession?.copyWith(status: 'active');
    }
  }

  /// End the session and get summary.
  Future<SessionSummary> endSession(String sessionId) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '${ApiEndpoints.session(sessionId)}/end',
    );

    final summary = SessionSummary.fromJson(response.data!);

    if (_currentSession?.id == sessionId) {
      _currentSession = null;
    }

    return summary;
  }

  /// Abandon the session.
  Future<void> abandonSession(String sessionId) async {
    await _apiClient.delete(ApiEndpoints.session(sessionId));

    if (_currentSession?.id == sessionId) {
      _currentSession = null;
    }
  }

  /// Get session history for a learner.
  Future<List<SessionHistory>> getSessionHistory({
    required String learnerId,
    int page = 1,
    int limit = 20,
    String? subjectId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final response = await _apiClient.get<List<dynamic>>(
      '${ApiEndpoints.sessions}/history',
      queryParameters: {
        'learnerId': learnerId,
        'page': page.toString(),
        'limit': limit.toString(),
        if (subjectId != null) 'subjectId': subjectId,
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      },
    );

    return (response.data ?? [])
        .map((item) => SessionHistory.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// Get session statistics.
  Future<SessionStats> getSessionStats({
    required String learnerId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '${ApiEndpoints.sessions}/stats',
      queryParameters: {
        'learnerId': learnerId,
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      },
    );

    return SessionStats.fromJson(response.data!);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIVERPOD PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for SessionService.
final sessionServiceProvider = Provider<SessionService>((ref) {
  return SessionService(
    apiClient: AivoApiClient.instance,
  );
});

/// Provider for current session.
final currentSessionProvider = StateProvider<LearningSession?>((ref) {
  return null;
});
