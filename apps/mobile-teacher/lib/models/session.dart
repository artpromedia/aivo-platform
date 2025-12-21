/// Session Model
///
/// Represents a learning session.
library;

import 'package:flutter/foundation.dart';

/// Session status.
enum SessionStatus {
  scheduled,
  active,
  paused,
  completed,
  cancelled,
}

/// Session type.
enum SessionType {
  individual,
  smallGroup,
  wholeClass,
  assessment,
  intervention,
}

/// A learning session.
@immutable
class Session {
  const Session({
    required this.id,
    required this.classId,
    required this.teacherId,
    required this.status,
    required this.sessionType,
    this.title,
    this.description,
    this.studentIds = const [],
    this.subject,
    this.scheduledAt,
    this.startedAt,
    this.endedAt,
    this.durationMinutes,
    this.objectives = const [],
    this.notes,
    this.activities = const [],
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String classId;
  final String teacherId;
  final SessionStatus status;
  final SessionType sessionType;
  final String? title;
  final String? description;
  final List<String> studentIds;
  final String? subject;
  final DateTime? scheduledAt;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final int? durationMinutes;
  final List<String> objectives;
  final String? notes;
  final List<SessionActivity> activities;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isActive => status == SessionStatus.active;
  bool get isCompleted => status == SessionStatus.completed;
  bool get isScheduled => status == SessionStatus.scheduled;

  Duration? get actualDuration {
    if (startedAt == null) return null;
    final end = endedAt ?? DateTime.now();
    return end.difference(startedAt!);
  }

  factory Session.fromJson(Map<String, dynamic> json) {
    return Session(
      id: json['id'] as String,
      classId: json['classId'] as String,
      teacherId: json['teacherId'] as String,
      status: SessionStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => SessionStatus.scheduled,
      ),
      sessionType: SessionType.values.firstWhere(
        (e) => e.name == json['sessionType'],
        orElse: () => SessionType.wholeClass,
      ),
      title: json['title'] as String?,
      description: json['description'] as String?,
      studentIds: (json['studentIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      subject: json['subject'] as String?,
      scheduledAt: json['scheduledAt'] != null
          ? DateTime.tryParse(json['scheduledAt'] as String)
          : null,
      startedAt: json['startedAt'] != null
          ? DateTime.tryParse(json['startedAt'] as String)
          : null,
      endedAt: json['endedAt'] != null
          ? DateTime.tryParse(json['endedAt'] as String)
          : null,
      durationMinutes: json['durationMinutes'] as int?,
      objectives: (json['objectives'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      notes: json['notes'] as String?,
      activities: (json['activities'] as List<dynamic>?)
              ?.map((e) => SessionActivity.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'classId': classId,
      'teacherId': teacherId,
      'status': status.name,
      'sessionType': sessionType.name,
      'title': title,
      'description': description,
      'studentIds': studentIds,
      'subject': subject,
      'scheduledAt': scheduledAt?.toIso8601String(),
      'startedAt': startedAt?.toIso8601String(),
      'endedAt': endedAt?.toIso8601String(),
      'durationMinutes': durationMinutes,
      'objectives': objectives,
      'notes': notes,
      'activities': activities.map((e) => e.toJson()).toList(),
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  Session copyWith({
    String? id,
    String? classId,
    String? teacherId,
    SessionStatus? status,
    SessionType? sessionType,
    String? title,
    String? description,
    List<String>? studentIds,
    String? subject,
    DateTime? scheduledAt,
    DateTime? startedAt,
    DateTime? endedAt,
    int? durationMinutes,
    List<String>? objectives,
    String? notes,
    List<SessionActivity>? activities,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Session(
      id: id ?? this.id,
      classId: classId ?? this.classId,
      teacherId: teacherId ?? this.teacherId,
      status: status ?? this.status,
      sessionType: sessionType ?? this.sessionType,
      title: title ?? this.title,
      description: description ?? this.description,
      studentIds: studentIds ?? this.studentIds,
      subject: subject ?? this.subject,
      scheduledAt: scheduledAt ?? this.scheduledAt,
      startedAt: startedAt ?? this.startedAt,
      endedAt: endedAt ?? this.endedAt,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      objectives: objectives ?? this.objectives,
      notes: notes ?? this.notes,
      activities: activities ?? this.activities,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Session && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// An activity within a session.
@immutable
class SessionActivity {
  const SessionActivity({
    required this.id,
    required this.name,
    required this.type,
    this.contentId,
    this.durationMinutes,
    this.order = 0,
    this.completed = false,
  });

  final String id;
  final String name;
  final String type;
  final String? contentId;
  final int? durationMinutes;
  final int order;
  final bool completed;

  factory SessionActivity.fromJson(Map<String, dynamic> json) {
    return SessionActivity(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      contentId: json['contentId'] as String?,
      durationMinutes: json['durationMinutes'] as int?,
      order: json['order'] as int? ?? 0,
      completed: json['completed'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'contentId': contentId,
      'durationMinutes': durationMinutes,
      'order': order,
      'completed': completed,
    };
  }
}

/// Session note.
@immutable
class SessionNote {
  const SessionNote({
    required this.id,
    required this.sessionId,
    required this.content,
    required this.createdAt,
    this.studentId,
    this.isPrivate = false,
    this.tags = const [],
  });

  final String id;
  final String sessionId;
  final String? studentId;
  final String content;
  final bool isPrivate;
  final List<String> tags;
  final DateTime createdAt;

  factory SessionNote.fromJson(Map<String, dynamic> json) {
    return SessionNote(
      id: json['id'] as String,
      sessionId: json['sessionId'] as String,
      studentId: json['studentId'] as String?,
      content: json['content'] as String,
      isPrivate: json['isPrivate'] as bool? ?? false,
      tags: (json['tags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sessionId': sessionId,
      'studentId': studentId,
      'content': content,
      'isPrivate': isPrivate,
      'tags': tags,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

/// Live session update from WebSocket.
@immutable
class SessionUpdate {
  const SessionUpdate({
    required this.sessionId,
    required this.type,
    required this.timestamp,
    this.data = const {},
  });

  final String sessionId;
  final String type;
  final DateTime timestamp;
  final Map<String, dynamic> data;

  factory SessionUpdate.fromJson(Map<String, dynamic> json) {
    return SessionUpdate(
      sessionId: json['sessionId'] as String,
      type: json['type'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      data: json['data'] as Map<String, dynamic>? ?? {},
    );
  }
}

/// Active session for real-time monitoring.
@immutable
class ActiveSession {
  const ActiveSession({
    required this.sessionId,
    required this.studentId,
    required this.studentName,
    required this.currentActivity,
    required this.progress,
    required this.engagementLevel,
    required this.startedAt,
    this.focusScore,
    this.needsAttention = false,
    this.lastEventAt,
  });

  final String sessionId;
  final String studentId;
  final String studentName;
  final String currentActivity;
  final double progress; // 0.0 to 1.0
  final String engagementLevel; // high, medium, low
  final DateTime startedAt;
  final int? focusScore;
  final bool needsAttention;
  final DateTime? lastEventAt;

  factory ActiveSession.fromJson(Map<String, dynamic> json) {
    return ActiveSession(
      sessionId: json['sessionId'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      currentActivity: json['currentActivity'] as String,
      progress: (json['progress'] as num).toDouble(),
      engagementLevel: json['engagementLevel'] as String,
      startedAt: DateTime.parse(json['startedAt'] as String),
      focusScore: json['focusScore'] as int?,
      needsAttention: json['needsAttention'] as bool? ?? false,
      lastEventAt: json['lastEventAt'] != null
          ? DateTime.tryParse(json['lastEventAt'] as String)
          : null,
    );
  }
}

/// DTO for creating a session.
class CreateSessionDto {
  const CreateSessionDto({
    required this.classId,
    required this.sessionType,
    this.title,
    this.description,
    this.studentIds = const [],
    this.subject,
    this.scheduledAt,
    this.durationMinutes,
    this.objectives = const [],
  });

  final String classId;
  final SessionType sessionType;
  final String? title;
  final String? description;
  final List<String> studentIds;
  final String? subject;
  final DateTime? scheduledAt;
  final int? durationMinutes;
  final List<String> objectives;

  Map<String, dynamic> toJson() {
    return {
      'classId': classId,
      'sessionType': sessionType.name,
      'title': title,
      'description': description,
      'studentIds': studentIds,
      'subject': subject,
      'scheduledAt': scheduledAt?.toIso8601String(),
      'durationMinutes': durationMinutes,
      'objectives': objectives,
    };
  }
}
