/// AI Transparency Models
///
/// Models for AI transparency dashboard and student AI conversation viewing.
library;

import 'package:flutter/foundation.dart';

/// AI interaction type for classification.
enum AIInteractionType {
  tutoring,
  homework,
  writing,
  focusBreak,
  assessment,
  socialEmotional,
  other,
}

/// Flag status for AI interactions.
enum AIFlagStatus {
  none,
  review,
  flagged,
  resolved,
}

/// A single AI conversation between a student and the AI tutor.
@immutable
class AIConversation {
  const AIConversation({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.startedAt,
    required this.messages,
    this.endedAt,
    this.interactionType = AIInteractionType.tutoring,
    this.subject,
    this.topic,
    this.flagStatus = AIFlagStatus.none,
    this.flagReason,
    this.teacherNotes,
    this.summary,
    this.sentiment,
    this.duration,
  });

  final String id;
  final String studentId;
  final String studentName;
  final DateTime startedAt;
  final DateTime? endedAt;
  final List<AIMessage> messages;
  final AIInteractionType interactionType;
  final String? subject;
  final String? topic;
  final AIFlagStatus flagStatus;
  final String? flagReason;
  final String? teacherNotes;
  final String? summary;
  final String? sentiment; // positive, neutral, negative, frustrated
  final Duration? duration;

  bool get isActive => endedAt == null;
  bool get isFlagged => flagStatus == AIFlagStatus.flagged || flagStatus == AIFlagStatus.review;
  int get messageCount => messages.length;

  factory AIConversation.fromJson(Map<String, dynamic> json) {
    return AIConversation(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      startedAt: DateTime.parse(json['startedAt'] as String),
      endedAt: json['endedAt'] != null
          ? DateTime.tryParse(json['endedAt'] as String)
          : null,
      messages: (json['messages'] as List<dynamic>?)
              ?.map((e) => AIMessage.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      interactionType: AIInteractionType.values.firstWhere(
        (e) => e.name == json['interactionType'],
        orElse: () => AIInteractionType.tutoring,
      ),
      subject: json['subject'] as String?,
      topic: json['topic'] as String?,
      flagStatus: AIFlagStatus.values.firstWhere(
        (e) => e.name == json['flagStatus'],
        orElse: () => AIFlagStatus.none,
      ),
      flagReason: json['flagReason'] as String?,
      teacherNotes: json['teacherNotes'] as String?,
      summary: json['summary'] as String?,
      sentiment: json['sentiment'] as String?,
      duration: json['durationSeconds'] != null
          ? Duration(seconds: json['durationSeconds'] as int)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'studentId': studentId,
      'studentName': studentName,
      'startedAt': startedAt.toIso8601String(),
      'endedAt': endedAt?.toIso8601String(),
      'messages': messages.map((e) => e.toJson()).toList(),
      'interactionType': interactionType.name,
      'subject': subject,
      'topic': topic,
      'flagStatus': flagStatus.name,
      'flagReason': flagReason,
      'teacherNotes': teacherNotes,
      'summary': summary,
      'sentiment': sentiment,
      'durationSeconds': duration?.inSeconds,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AIConversation && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// A single message in an AI conversation.
@immutable
class AIMessage {
  const AIMessage({
    required this.id,
    required this.conversationId,
    required this.role,
    required this.content,
    required this.timestamp,
    this.tokensUsed,
    this.metadata,
  });

  final String id;
  final String conversationId;
  final String role; // 'student', 'assistant', 'system'
  final String content;
  final DateTime timestamp;
  final int? tokensUsed;
  final Map<String, dynamic>? metadata;

  bool get isFromStudent => role == 'student';
  bool get isFromAI => role == 'assistant';

  factory AIMessage.fromJson(Map<String, dynamic> json) {
    return AIMessage(
      id: json['id'] as String,
      conversationId: json['conversationId'] as String,
      role: json['role'] as String,
      content: json['content'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      tokensUsed: json['tokensUsed'] as int?,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'conversationId': conversationId,
      'role': role,
      'content': content,
      'timestamp': timestamp.toIso8601String(),
      'tokensUsed': tokensUsed,
      'metadata': metadata,
    };
  }
}

/// Aggregated AI usage statistics for a class or student.
@immutable
class AIUsageStats {
  const AIUsageStats({
    required this.totalConversations,
    required this.totalMessages,
    required this.averageSessionDuration,
    required this.byInteractionType,
    required this.bySubject,
    this.flaggedCount = 0,
    this.reviewCount = 0,
    this.activeNow = 0,
    this.lastUpdated,
  });

  final int totalConversations;
  final int totalMessages;
  final Duration averageSessionDuration;
  final Map<AIInteractionType, int> byInteractionType;
  final Map<String, int> bySubject;
  final int flaggedCount;
  final int reviewCount;
  final int activeNow;
  final DateTime? lastUpdated;

  factory AIUsageStats.fromJson(Map<String, dynamic> json) {
    return AIUsageStats(
      totalConversations: json['totalConversations'] as int? ?? 0,
      totalMessages: json['totalMessages'] as int? ?? 0,
      averageSessionDuration: Duration(
        seconds: json['averageSessionDurationSeconds'] as int? ?? 0,
      ),
      byInteractionType: (json['byInteractionType'] as Map<String, dynamic>?)
              ?.map((k, v) => MapEntry(
                    AIInteractionType.values.firstWhere(
                      (e) => e.name == k,
                      orElse: () => AIInteractionType.other,
                    ),
                    v as int,
                  )) ??
          {},
      bySubject:
          (json['bySubject'] as Map<String, dynamic>?)?.map((k, v) => MapEntry(k, v as int)) ?? {},
      flaggedCount: json['flaggedCount'] as int? ?? 0,
      reviewCount: json['reviewCount'] as int? ?? 0,
      activeNow: json['activeNow'] as int? ?? 0,
      lastUpdated: json['lastUpdated'] != null
          ? DateTime.tryParse(json['lastUpdated'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalConversations': totalConversations,
      'totalMessages': totalMessages,
      'averageSessionDurationSeconds': averageSessionDuration.inSeconds,
      'byInteractionType': byInteractionType.map((k, v) => MapEntry(k.name, v)),
      'bySubject': bySubject,
      'flaggedCount': flaggedCount,
      'reviewCount': reviewCount,
      'activeNow': activeNow,
      'lastUpdated': lastUpdated?.toIso8601String(),
    };
  }
}

/// Student AI activity summary for the dashboard.
@immutable
class StudentAIActivity {
  const StudentAIActivity({
    required this.studentId,
    required this.studentName,
    required this.lastActiveAt,
    required this.conversationCount,
    required this.messageCount,
    this.currentTopic,
    this.sentiment,
    this.flagCount = 0,
    this.isActiveNow = false,
  });

  final String studentId;
  final String studentName;
  final DateTime lastActiveAt;
  final int conversationCount;
  final int messageCount;
  final String? currentTopic;
  final String? sentiment;
  final int flagCount;
  final bool isActiveNow;

  factory StudentAIActivity.fromJson(Map<String, dynamic> json) {
    return StudentAIActivity(
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      lastActiveAt: DateTime.parse(json['lastActiveAt'] as String),
      conversationCount: json['conversationCount'] as int? ?? 0,
      messageCount: json['messageCount'] as int? ?? 0,
      currentTopic: json['currentTopic'] as String?,
      sentiment: json['sentiment'] as String?,
      flagCount: json['flagCount'] as int? ?? 0,
      isActiveNow: json['isActiveNow'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'studentName': studentName,
      'lastActiveAt': lastActiveAt.toIso8601String(),
      'conversationCount': conversationCount,
      'messageCount': messageCount,
      'currentTopic': currentTopic,
      'sentiment': sentiment,
      'flagCount': flagCount,
      'isActiveNow': isActiveNow,
    };
  }
}
