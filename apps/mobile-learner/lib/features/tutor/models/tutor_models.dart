/// Tutor Feature Models
///
/// Data models for the AI tutor feature including personas, sessions,
/// messages, and analytics. Uses immutable classes with copyWith,
/// fromJson/toJson serialization following the freezed pattern.
library;

import 'package:flutter/material.dart';

// ============================================================================
// ENUMS
// ============================================================================

/// Academic subjects supported by the tutor feature.
enum TutorSubject {
  math,
  ela,
  science,
  history,
  coding;

  String get label {
    switch (this) {
      case TutorSubject.math:
        return 'Math';
      case TutorSubject.ela:
        return 'ELA';
      case TutorSubject.science:
        return 'Science';
      case TutorSubject.history:
        return 'History';
      case TutorSubject.coding:
        return 'Coding';
    }
  }

  String get description {
    switch (this) {
      case TutorSubject.math:
        return 'Numbers, algebra, geometry, and problem solving';
      case TutorSubject.ela:
        return 'Reading, writing, grammar, and vocabulary';
      case TutorSubject.science:
        return 'Biology, chemistry, physics, and earth science';
      case TutorSubject.history:
        return 'World history, civics, geography, and culture';
      case TutorSubject.coding:
        return 'Programming concepts, logic, and computational thinking';
    }
  }

  IconData get icon {
    switch (this) {
      case TutorSubject.math:
        return Icons.calculate_rounded;
      case TutorSubject.ela:
        return Icons.menu_book_rounded;
      case TutorSubject.science:
        return Icons.science_rounded;
      case TutorSubject.history:
        return Icons.public_rounded;
      case TutorSubject.coding:
        return Icons.code_rounded;
    }
  }

  Color get color {
    switch (this) {
      case TutorSubject.math:
        return const Color(0xFF3B82F6);
      case TutorSubject.ela:
        return const Color(0xFFF59E0B);
      case TutorSubject.science:
        return const Color(0xFF10B981);
      case TutorSubject.history:
        return const Color(0xFFF97316);
      case TutorSubject.coding:
        return const Color(0xFF8B5CF6);
    }
  }

  Color get backgroundColor {
    switch (this) {
      case TutorSubject.math:
        return const Color(0xFFDBEAFE);
      case TutorSubject.ela:
        return const Color(0xFFFEF3C7);
      case TutorSubject.science:
        return const Color(0xFFD1FAE5);
      case TutorSubject.history:
        return const Color(0xFFFFEDD5);
      case TutorSubject.coding:
        return const Color(0xFFEDE9FE);
    }
  }
}

/// Status of a tutoring session.
enum SessionStatus {
  active,
  paused,
  completed,
  expired;

  String get label {
    switch (this) {
      case SessionStatus.active:
        return 'Active';
      case SessionStatus.paused:
        return 'Paused';
      case SessionStatus.completed:
        return 'Completed';
      case SessionStatus.expired:
        return 'Expired';
    }
  }

  bool get isTerminal => this == completed || this == expired;
}

/// Role of a message sender in a tutor conversation.
enum MessageRole {
  user,
  assistant,
  system;

  String get label {
    switch (this) {
      case MessageRole.user:
        return 'You';
      case MessageRole.assistant:
        return 'Tutor';
      case MessageRole.system:
        return 'System';
    }
  }
}

/// Emotion displayed by the tutor avatar during conversation.
enum EmotionType {
  neutral,
  happy,
  thinking,
  encouraging,
  excited,
  empathetic;

  String get label {
    switch (this) {
      case EmotionType.neutral:
        return 'Neutral';
      case EmotionType.happy:
        return 'Happy';
      case EmotionType.thinking:
        return 'Thinking';
      case EmotionType.encouraging:
        return 'Encouraging';
      case EmotionType.excited:
        return 'Excited';
      case EmotionType.empathetic:
        return 'Empathetic';
    }
  }

  /// Rive animation state machine input name for this emotion.
  String get animationStateName {
    switch (this) {
      case EmotionType.neutral:
        return 'idle';
      case EmotionType.happy:
        return 'happy';
      case EmotionType.thinking:
        return 'thinking';
      case EmotionType.encouraging:
        return 'encouraging';
      case EmotionType.excited:
        return 'excited';
      case EmotionType.empathetic:
        return 'empathetic';
    }
  }
}

// ============================================================================
// TUTOR PERSONA
// ============================================================================

/// A tutor persona representing an AI character for a specific subject.
class TutorPersona {
  final String id;
  final String name;
  final TutorSubject subject;
  final String description;
  final String avatarAssetKey;
  final String? avatarUrl;
  final String greeting;
  final String personality;
  final bool isAvailable;

  const TutorPersona({
    required this.id,
    required this.name,
    required this.subject,
    required this.description,
    required this.avatarAssetKey,
    this.avatarUrl,
    required this.greeting,
    required this.personality,
    this.isAvailable = true,
  });

  factory TutorPersona.fromJson(Map<String, dynamic> json) {
    return TutorPersona(
      id: json['id'] as String,
      name: json['name'] as String,
      subject: _parseTutorSubject(json['subject'] as String),
      description: json['description'] as String,
      avatarAssetKey: json['avatarAssetKey'] as String? ?? 'default_tutor',
      avatarUrl: json['avatarUrl'] as String?,
      greeting: json['greeting'] as String? ?? 'Hi! Ready to learn?',
      personality: json['personality'] as String? ?? '',
      isAvailable: json['isAvailable'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'subject': subject.name,
        'description': description,
        'avatarAssetKey': avatarAssetKey,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
        'greeting': greeting,
        'personality': personality,
        'isAvailable': isAvailable,
      };

  TutorPersona copyWith({
    String? id,
    String? name,
    TutorSubject? subject,
    String? description,
    String? avatarAssetKey,
    String? avatarUrl,
    String? greeting,
    String? personality,
    bool? isAvailable,
  }) {
    return TutorPersona(
      id: id ?? this.id,
      name: name ?? this.name,
      subject: subject ?? this.subject,
      description: description ?? this.description,
      avatarAssetKey: avatarAssetKey ?? this.avatarAssetKey,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      greeting: greeting ?? this.greeting,
      personality: personality ?? this.personality,
      isAvailable: isAvailable ?? this.isAvailable,
    );
  }

  static TutorSubject _parseTutorSubject(String value) {
    switch (value.toLowerCase()) {
      case 'math':
      case 'mathematics':
        return TutorSubject.math;
      case 'ela':
      case 'english':
      case 'language_arts':
        return TutorSubject.ela;
      case 'science':
        return TutorSubject.science;
      case 'history':
      case 'social_studies':
        return TutorSubject.history;
      case 'coding':
      case 'computer_science':
      case 'cs':
        return TutorSubject.coding;
      default:
        return TutorSubject.values.byName(value);
    }
  }
}

// ============================================================================
// TUTOR SESSION
// ============================================================================

/// A tutoring session between a learner and a tutor persona.
class TutorSession {
  final String id;
  final String learnerId;
  final String personaId;
  final TutorSubject subject;
  final SessionStatus status;
  final DateTime createdAt;
  final DateTime? endedAt;
  final int messageCount;
  final int durationSeconds;
  final String? topic;
  final SessionAnalytics? analytics;

  const TutorSession({
    required this.id,
    required this.learnerId,
    required this.personaId,
    required this.subject,
    required this.status,
    required this.createdAt,
    this.endedAt,
    this.messageCount = 0,
    this.durationSeconds = 0,
    this.topic,
    this.analytics,
  });

  /// Whether the session can still receive messages.
  bool get isActive => status == SessionStatus.active;

  /// Human-readable duration string.
  String get formattedDuration {
    if (durationSeconds < 60) return '${durationSeconds}s';
    final minutes = durationSeconds ~/ 60;
    final seconds = durationSeconds % 60;
    if (minutes < 60) {
      return seconds > 0 ? '${minutes}m ${seconds}s' : '${minutes}m';
    }
    final hours = minutes ~/ 60;
    final remainingMinutes = minutes % 60;
    return '${hours}h ${remainingMinutes}m';
  }

  factory TutorSession.fromJson(Map<String, dynamic> json) {
    return TutorSession(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      personaId: json['personaId'] as String,
      subject: TutorPersona._parseTutorSubject(json['subject'] as String),
      status: _parseSessionStatus(json['status'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      endedAt: json['endedAt'] != null
          ? DateTime.parse(json['endedAt'] as String)
          : null,
      messageCount: json['messageCount'] as int? ?? 0,
      durationSeconds: json['durationSeconds'] as int? ?? 0,
      topic: json['topic'] as String?,
      analytics: json['analytics'] != null
          ? SessionAnalytics.fromJson(
              json['analytics'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'learnerId': learnerId,
        'personaId': personaId,
        'subject': subject.name,
        'status': status.name,
        'createdAt': createdAt.toIso8601String(),
        if (endedAt != null) 'endedAt': endedAt!.toIso8601String(),
        'messageCount': messageCount,
        'durationSeconds': durationSeconds,
        if (topic != null) 'topic': topic,
        if (analytics != null) 'analytics': analytics!.toJson(),
      };

  TutorSession copyWith({
    String? id,
    String? learnerId,
    String? personaId,
    TutorSubject? subject,
    SessionStatus? status,
    DateTime? createdAt,
    DateTime? endedAt,
    int? messageCount,
    int? durationSeconds,
    String? topic,
    SessionAnalytics? analytics,
  }) {
    return TutorSession(
      id: id ?? this.id,
      learnerId: learnerId ?? this.learnerId,
      personaId: personaId ?? this.personaId,
      subject: subject ?? this.subject,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      endedAt: endedAt ?? this.endedAt,
      messageCount: messageCount ?? this.messageCount,
      durationSeconds: durationSeconds ?? this.durationSeconds,
      topic: topic ?? this.topic,
      analytics: analytics ?? this.analytics,
    );
  }

  static SessionStatus _parseSessionStatus(String value) {
    switch (value.toLowerCase()) {
      case 'active':
        return SessionStatus.active;
      case 'paused':
        return SessionStatus.paused;
      case 'completed':
        return SessionStatus.completed;
      case 'expired':
        return SessionStatus.expired;
      default:
        return SessionStatus.values.byName(value);
    }
  }
}

// ============================================================================
// TUTOR MESSAGE
// ============================================================================

/// A single message in a tutor conversation.
class TutorMessage {
  final String id;
  final String sessionId;
  final MessageRole role;
  final String content;
  final DateTime timestamp;
  final EmotionType? emotion;
  final String? audioUrl;
  final List<VisemeData>? visemes;
  final Map<String, dynamic>? metadata;

  const TutorMessage({
    required this.id,
    required this.sessionId,
    required this.role,
    required this.content,
    required this.timestamp,
    this.emotion,
    this.audioUrl,
    this.visemes,
    this.metadata,
  });

  /// Whether this message was sent by the AI tutor.
  bool get isAssistant => role == MessageRole.assistant;

  /// Whether this message was sent by the learner.
  bool get isUser => role == MessageRole.user;

  /// Whether this message is a system message.
  bool get isSystem => role == MessageRole.system;

  /// Whether the message has TTS audio available.
  bool get hasAudio => audioUrl != null && audioUrl!.isNotEmpty;

  /// Whether the message has lip-sync viseme data.
  bool get hasVisemes => visemes != null && visemes!.isNotEmpty;

  factory TutorMessage.fromJson(Map<String, dynamic> json) {
    return TutorMessage(
      id: json['id'] as String,
      sessionId: json['sessionId'] as String,
      role: MessageRole.values.byName(json['role'] as String),
      content: json['content'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      emotion: json['emotion'] != null
          ? EmotionType.values.byName(json['emotion'] as String)
          : null,
      audioUrl: json['audioUrl'] as String?,
      visemes: (json['visemes'] as List<dynamic>?)
          ?.map((v) => VisemeData.fromJson(v as Map<String, dynamic>))
          .toList(),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'sessionId': sessionId,
        'role': role.name,
        'content': content,
        'timestamp': timestamp.toIso8601String(),
        if (emotion != null) 'emotion': emotion!.name,
        if (audioUrl != null) 'audioUrl': audioUrl,
        if (visemes != null)
          'visemes': visemes!.map((v) => v.toJson()).toList(),
        if (metadata != null) 'metadata': metadata,
      };

  TutorMessage copyWith({
    String? id,
    String? sessionId,
    MessageRole? role,
    String? content,
    DateTime? timestamp,
    EmotionType? emotion,
    String? audioUrl,
    List<VisemeData>? visemes,
    Map<String, dynamic>? metadata,
  }) {
    return TutorMessage(
      id: id ?? this.id,
      sessionId: sessionId ?? this.sessionId,
      role: role ?? this.role,
      content: content ?? this.content,
      timestamp: timestamp ?? this.timestamp,
      emotion: emotion ?? this.emotion,
      audioUrl: audioUrl ?? this.audioUrl,
      visemes: visemes ?? this.visemes,
      metadata: metadata ?? this.metadata,
    );
  }
}

// ============================================================================
// VISEME DATA
// ============================================================================

/// Viseme timing data for avatar lip-sync animation.
///
/// Each viseme represents a mouth shape at a specific time offset
/// in the TTS audio playback.
class VisemeData {
  final int offsetMs;
  final String visemeId;

  const VisemeData({
    required this.offsetMs,
    required this.visemeId,
  });

  factory VisemeData.fromJson(Map<String, dynamic> json) {
    return VisemeData(
      offsetMs: json['offsetMs'] as int? ?? json['offset'] as int? ?? 0,
      visemeId: json['visemeId'] as String? ?? json['id'] as String? ?? '0',
    );
  }

  Map<String, dynamic> toJson() => {
        'offsetMs': offsetMs,
        'visemeId': visemeId,
      };
}

// ============================================================================
// SESSION ANALYTICS
// ============================================================================

/// Analytics data collected during a tutoring session.
class SessionAnalytics {
  final int questionsAsked;
  final int questionsAnswered;
  final int hintsProvided;
  final int correctAnswers;
  final double engagementScore;
  final String? difficultyLevel;
  final List<String> topicsCovered;

  const SessionAnalytics({
    this.questionsAsked = 0,
    this.questionsAnswered = 0,
    this.hintsProvided = 0,
    this.correctAnswers = 0,
    this.engagementScore = 0.0,
    this.difficultyLevel,
    this.topicsCovered = const [],
  });

  /// Accuracy percentage (0-100) of the learner's answers.
  double get accuracy =>
      questionsAnswered > 0 ? (correctAnswers / questionsAnswered) * 100 : 0;

  factory SessionAnalytics.fromJson(Map<String, dynamic> json) {
    return SessionAnalytics(
      questionsAsked: json['questionsAsked'] as int? ?? 0,
      questionsAnswered: json['questionsAnswered'] as int? ?? 0,
      hintsProvided: json['hintsProvided'] as int? ?? 0,
      correctAnswers: json['correctAnswers'] as int? ?? 0,
      engagementScore: (json['engagementScore'] as num?)?.toDouble() ?? 0.0,
      difficultyLevel: json['difficultyLevel'] as String?,
      topicsCovered:
          (json['topicsCovered'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
        'questionsAsked': questionsAsked,
        'questionsAnswered': questionsAnswered,
        'hintsProvided': hintsProvided,
        'correctAnswers': correctAnswers,
        'engagementScore': engagementScore,
        if (difficultyLevel != null) 'difficultyLevel': difficultyLevel,
        'topicsCovered': topicsCovered,
      };

  SessionAnalytics copyWith({
    int? questionsAsked,
    int? questionsAnswered,
    int? hintsProvided,
    int? correctAnswers,
    double? engagementScore,
    String? difficultyLevel,
    List<String>? topicsCovered,
  }) {
    return SessionAnalytics(
      questionsAsked: questionsAsked ?? this.questionsAsked,
      questionsAnswered: questionsAnswered ?? this.questionsAnswered,
      hintsProvided: hintsProvided ?? this.hintsProvided,
      correctAnswers: correctAnswers ?? this.correctAnswers,
      engagementScore: engagementScore ?? this.engagementScore,
      difficultyLevel: difficultyLevel ?? this.difficultyLevel,
      topicsCovered: topicsCovered ?? this.topicsCovered,
    );
  }
}
