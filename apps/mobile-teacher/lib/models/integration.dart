/// Integration Models
///
/// Models for platform integrations (Google Classroom, Canvas, Clever).
library;

import 'package:flutter/foundation.dart';

/// Integration type.
enum IntegrationType {
  googleClassroom,
  canvas,
  clever,
}

/// Integration connection status.
enum IntegrationStatus {
  disconnected,
  connecting,
  connected,
  error,
}

/// An integration connection.
@immutable
class IntegrationConnection {
  const IntegrationConnection({
    required this.type,
    required this.status,
    this.email,
    this.lastSyncAt,
    this.error,
  });

  final IntegrationType type;
  final IntegrationStatus status;
  final String? email;
  final DateTime? lastSyncAt;
  final String? error;

  bool get isConnected => status == IntegrationStatus.connected;

  factory IntegrationConnection.fromJson(Map<String, dynamic> json) {
    return IntegrationConnection(
      type: IntegrationType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => IntegrationType.googleClassroom,
      ),
      status: IntegrationStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => IntegrationStatus.disconnected,
      ),
      email: json['email'] as String?,
      lastSyncAt: json['lastSyncAt'] != null
          ? DateTime.tryParse(json['lastSyncAt'] as String)
          : null,
      error: json['error'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type.name,
      'status': status.name,
      'email': email,
      'lastSyncAt': lastSyncAt?.toIso8601String(),
      'error': error,
    };
  }
}

/// Google Classroom course.
@immutable
class GoogleClassroomCourse {
  const GoogleClassroomCourse({
    required this.id,
    required this.name,
    this.section,
    this.room,
    this.studentCount,
    this.isMapped = false,
    this.mappedClassId,
  });

  final String id;
  final String name;
  final String? section;
  final String? room;
  final int? studentCount;
  final bool isMapped;
  final String? mappedClassId;

  factory GoogleClassroomCourse.fromJson(Map<String, dynamic> json) {
    return GoogleClassroomCourse(
      id: json['id'] as String,
      name: json['name'] as String,
      section: json['section'] as String?,
      room: json['room'] as String?,
      studentCount: json['studentCount'] as int?,
      isMapped: json['isMapped'] as bool? ?? false,
      mappedClassId: json['mappedClassId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'section': section,
      'room': room,
      'studentCount': studentCount,
      'isMapped': isMapped,
      'mappedClassId': mappedClassId,
    };
  }
}

/// Course mapping between Aivo class and external platform.
@immutable
class CourseMapping {
  const CourseMapping({
    required this.id,
    required this.aivoClassId,
    required this.externalCourseId,
    required this.integrationType,
    this.aivoClassName,
    this.externalCourseName,
    this.syncRoster = true,
    this.syncGrades = true,
    this.syncAssignments = true,
    this.lastSyncAt,
    this.createdAt,
  });

  final String id;
  final String aivoClassId;
  final String externalCourseId;
  final IntegrationType integrationType;
  final String? aivoClassName;
  final String? externalCourseName;
  final bool syncRoster;
  final bool syncGrades;
  final bool syncAssignments;
  final DateTime? lastSyncAt;
  final DateTime? createdAt;

  factory CourseMapping.fromJson(Map<String, dynamic> json) {
    return CourseMapping(
      id: json['id'] as String,
      aivoClassId: json['aivoClassId'] as String,
      externalCourseId: json['externalCourseId'] as String,
      integrationType: IntegrationType.values.firstWhere(
        (e) => e.name == json['integrationType'],
        orElse: () => IntegrationType.googleClassroom,
      ),
      aivoClassName: json['aivoClassName'] as String?,
      externalCourseName: json['externalCourseName'] as String?,
      syncRoster: json['syncRoster'] as bool? ?? true,
      syncGrades: json['syncGrades'] as bool? ?? true,
      syncAssignments: json['syncAssignments'] as bool? ?? true,
      lastSyncAt: json['lastSyncAt'] != null
          ? DateTime.tryParse(json['lastSyncAt'] as String)
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'aivoClassId': aivoClassId,
      'externalCourseId': externalCourseId,
      'integrationType': integrationType.name,
      'aivoClassName': aivoClassName,
      'externalCourseName': externalCourseName,
      'syncRoster': syncRoster,
      'syncGrades': syncGrades,
      'syncAssignments': syncAssignments,
      'lastSyncAt': lastSyncAt?.toIso8601String(),
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  CourseMapping copyWith({
    bool? syncRoster,
    bool? syncGrades,
    bool? syncAssignments,
  }) {
    return CourseMapping(
      id: id,
      aivoClassId: aivoClassId,
      externalCourseId: externalCourseId,
      integrationType: integrationType,
      aivoClassName: aivoClassName,
      externalCourseName: externalCourseName,
      syncRoster: syncRoster ?? this.syncRoster,
      syncGrades: syncGrades ?? this.syncGrades,
      syncAssignments: syncAssignments ?? this.syncAssignments,
      lastSyncAt: lastSyncAt,
      createdAt: createdAt,
    );
  }
}

/// Sync history entry.
@immutable
class SyncHistoryEntry {
  const SyncHistoryEntry({
    required this.id,
    required this.mappingId,
    required this.syncType,
    required this.status,
    required this.startedAt,
    this.completedAt,
    this.itemsSynced = 0,
    this.itemsFailed = 0,
    this.error,
  });

  final String id;
  final String mappingId;
  final String syncType; // 'roster', 'grades', 'assignments', 'full'
  final String status; // 'running', 'completed', 'failed'
  final DateTime startedAt;
  final DateTime? completedAt;
  final int itemsSynced;
  final int itemsFailed;
  final String? error;

  bool get isComplete => status == 'completed' || status == 'failed';
  bool get isSuccess => status == 'completed' && itemsFailed == 0;

  Duration? get duration {
    if (completedAt == null) return null;
    return completedAt!.difference(startedAt);
  }

  factory SyncHistoryEntry.fromJson(Map<String, dynamic> json) {
    return SyncHistoryEntry(
      id: json['id'] as String,
      mappingId: json['mappingId'] as String,
      syncType: json['syncType'] as String,
      status: json['status'] as String,
      startedAt: DateTime.parse(json['startedAt'] as String),
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'] as String)
          : null,
      itemsSynced: json['itemsSynced'] as int? ?? 0,
      itemsFailed: json['itemsFailed'] as int? ?? 0,
      error: json['error'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'mappingId': mappingId,
      'syncType': syncType,
      'status': status,
      'startedAt': startedAt.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'itemsSynced': itemsSynced,
      'itemsFailed': itemsFailed,
      'error': error,
    };
  }
}

/// Pending grade passback entry.
@immutable
class PendingGradePassback {
  const PendingGradePassback({
    required this.studentId,
    required this.assignmentId,
    required this.grade,
    required this.externalStudentId,
    required this.externalAssignmentId,
    this.studentName,
    this.assignmentTitle,
    this.pendingSince,
  });

  final String studentId;
  final String assignmentId;
  final double grade;
  final String externalStudentId;
  final String externalAssignmentId;
  final String? studentName;
  final String? assignmentTitle;
  final DateTime? pendingSince;

  factory PendingGradePassback.fromJson(Map<String, dynamic> json) {
    return PendingGradePassback(
      studentId: json['studentId'] as String,
      assignmentId: json['assignmentId'] as String,
      grade: (json['grade'] as num).toDouble(),
      externalStudentId: json['externalStudentId'] as String,
      externalAssignmentId: json['externalAssignmentId'] as String,
      studentName: json['studentName'] as String?,
      assignmentTitle: json['assignmentTitle'] as String?,
      pendingSince: json['pendingSince'] != null
          ? DateTime.tryParse(json['pendingSince'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'assignmentId': assignmentId,
      'grade': grade,
      'externalStudentId': externalStudentId,
      'externalAssignmentId': externalAssignmentId,
      'studentName': studentName,
      'assignmentTitle': assignmentTitle,
      'pendingSince': pendingSince?.toIso8601String(),
    };
  }
}
