/// LMS Integration models for Google Classroom connectivity
/// Supports OAuth, course sync, assignments, and grade passback
library;

import 'package:flutter/foundation.dart';

/// Connection status for Google Classroom integration
@immutable
class GoogleClassroomConnectionStatus {
  const GoogleClassroomConnectionStatus({
    required this.connected,
    this.email,
    this.scopes,
    this.coursesLinked,
    this.lastSyncAt,
    this.expiresAt,
  });

  final bool connected;
  final String? email;
  final List<String>? scopes;
  final int? coursesLinked;
  final DateTime? lastSyncAt;
  final DateTime? expiresAt;

  /// Whether the connection is expiring soon (within 7 days)
  bool get isExpiringSoon {
    if (expiresAt == null) return false;
    return expiresAt!.difference(DateTime.now()).inDays < 7;
  }

  factory GoogleClassroomConnectionStatus.fromJson(Map<String, dynamic> json) {
    return GoogleClassroomConnectionStatus(
      connected: json['connected'] as bool? ?? false,
      email: json['email'] as String?,
      scopes: json['scopes'] != null
          ? List<String>.from(json['scopes'] as List<dynamic>)
          : null,
      coursesLinked: json['coursesLinked'] as int? ?? json['courses_linked'] as int?,
      lastSyncAt: json['lastSyncAt'] != null
          ? DateTime.tryParse(json['lastSyncAt'] as String)
          : json['last_sync_at'] != null
              ? DateTime.tryParse(json['last_sync_at'] as String)
              : null,
      expiresAt: json['expiresAt'] != null
          ? DateTime.tryParse(json['expiresAt'] as String)
          : json['expires_at'] != null
              ? DateTime.tryParse(json['expires_at'] as String)
              : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'connected': connected,
        if (email != null) 'email': email,
        if (scopes != null) 'scopes': scopes,
        if (coursesLinked != null) 'coursesLinked': coursesLinked,
        if (lastSyncAt != null) 'lastSyncAt': lastSyncAt!.toIso8601String(),
        if (expiresAt != null) 'expiresAt': expiresAt!.toIso8601String(),
      };

  static const disconnected = GoogleClassroomConnectionStatus(connected: false);
}

/// State of a Google Classroom course
enum CourseState {
  active('ACTIVE'),
  archived('ARCHIVED'),
  provisioned('PROVISIONED'),
  declined('DECLINED'),
  suspended('SUSPENDED');

  const CourseState(this.value);
  final String value;

  static CourseState fromString(String value) {
    return CourseState.values.firstWhere(
      (s) => s.value == value.toUpperCase(),
      orElse: () => CourseState.active,
    );
  }
}

/// Google Classroom course model
@immutable
class ClassroomCourse {
  const ClassroomCourse({
    required this.id,
    required this.name,
    this.section,
    this.descriptionHeading,
    this.description,
    this.room,
    required this.ownerId,
    required this.courseState,
    required this.alternateLink,
    this.enrollmentCode,
    this.guardiansEnabled,
    this.calendarId,
    this.isLinked = false,
    this.linkedClassId,
  });

  final String id;
  final String name;
  final String? section;
  final String? descriptionHeading;
  final String? description;
  final String? room;
  final String ownerId;
  final CourseState courseState;
  final String alternateLink;
  final String? enrollmentCode;
  final bool? guardiansEnabled;
  final String? calendarId;
  final bool isLinked;
  final String? linkedClassId;

  /// Display name with section
  String get displayName => section != null ? '$name - $section' : name;

  /// Whether this course is active
  bool get isActive => courseState == CourseState.active;

  factory ClassroomCourse.fromJson(Map<String, dynamic> json) {
    return ClassroomCourse(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      section: json['section'] as String?,
      descriptionHeading: json['descriptionHeading'] as String? ??
                          json['description_heading'] as String?,
      description: json['description'] as String?,
      room: json['room'] as String?,
      ownerId: json['ownerId'] as String? ?? json['owner_id'] as String? ?? '',
      courseState: CourseState.fromString(
        json['courseState'] as String? ?? json['course_state'] as String? ?? 'ACTIVE',
      ),
      alternateLink: json['alternateLink'] as String? ??
                     json['alternate_link'] as String? ?? '',
      enrollmentCode: json['enrollmentCode'] as String? ??
                      json['enrollment_code'] as String?,
      guardiansEnabled: json['guardiansEnabled'] as bool? ??
                        json['guardians_enabled'] as bool?,
      calendarId: json['calendarId'] as String? ?? json['calendar_id'] as String?,
      isLinked: json['isLinked'] as bool? ?? json['is_linked'] as bool? ?? false,
      linkedClassId: json['linkedClassId'] as String? ?? json['linked_class_id'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        if (section != null) 'section': section,
        if (descriptionHeading != null) 'descriptionHeading': descriptionHeading,
        if (description != null) 'description': description,
        if (room != null) 'room': room,
        'ownerId': ownerId,
        'courseState': courseState.value,
        'alternateLink': alternateLink,
        if (enrollmentCode != null) 'enrollmentCode': enrollmentCode,
        if (guardiansEnabled != null) 'guardiansEnabled': guardiansEnabled,
        if (calendarId != null) 'calendarId': calendarId,
        'isLinked': isLinked,
        if (linkedClassId != null) 'linkedClassId': linkedClassId,
      };
}

/// Course mapping between AIVO class and Google Classroom course
@immutable
class CourseMapping {
  const CourseMapping({
    required this.id,
    required this.googleCourseId,
    required this.classId,
    required this.googleCourseName,
    required this.className,
    required this.autoSync,
    required this.syncGuardians,
    required this.createdAt,
  });

  final String id;
  final String googleCourseId;
  final String classId;
  final String googleCourseName;
  final String className;
  final bool autoSync;
  final bool syncGuardians;
  final DateTime createdAt;

  factory CourseMapping.fromJson(Map<String, dynamic> json) {
    return CourseMapping(
      id: json['id'] as String? ?? '',
      googleCourseId: json['googleCourseId'] as String? ??
                      json['google_course_id'] as String? ?? '',
      classId: json['classId'] as String? ?? json['class_id'] as String? ?? '',
      googleCourseName: json['googleCourseName'] as String? ??
                        json['google_course_name'] as String? ?? '',
      className: json['className'] as String? ?? json['class_name'] as String? ?? '',
      autoSync: json['autoSync'] as bool? ?? json['auto_sync'] as bool? ?? false,
      syncGuardians: json['syncGuardians'] as bool? ?? json['sync_guardians'] as bool? ?? false,
      createdAt: DateTime.tryParse(
        json['createdAt'] as String? ?? json['created_at'] as String? ?? '',
      ) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'googleCourseId': googleCourseId,
        'classId': classId,
        'googleCourseName': googleCourseName,
        'className': className,
        'autoSync': autoSync,
        'syncGuardians': syncGuardians,
        'createdAt': createdAt.toIso8601String(),
      };
}

/// Assignment link between AIVO lesson and Google Classroom assignment
@immutable
class AssignmentLink {
  const AssignmentLink({
    required this.id,
    required this.googleAssignmentId,
    required this.googleCourseId,
    required this.lessonId,
    required this.title,
    this.maxPoints,
    required this.status,
    required this.autoGradePassback,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String googleAssignmentId;
  final String googleCourseId;
  final String lessonId;
  final String title;
  final double? maxPoints;
  final AssignmentLinkStatus status;
  final bool autoGradePassback;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory AssignmentLink.fromJson(Map<String, dynamic> json) {
    return AssignmentLink(
      id: json['id'] as String? ?? '',
      googleAssignmentId: json['googleAssignmentId'] as String? ??
                          json['google_assignment_id'] as String? ?? '',
      googleCourseId: json['googleCourseId'] as String? ??
                      json['google_course_id'] as String? ?? '',
      lessonId: json['lessonId'] as String? ?? json['lesson_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      maxPoints: (json['maxPoints'] as num?)?.toDouble() ??
                 (json['max_points'] as num?)?.toDouble(),
      status: AssignmentLinkStatus.fromString(json['status'] as String? ?? 'active'),
      autoGradePassback: json['autoGradePassback'] as bool? ??
                         json['auto_grade_passback'] as bool? ?? false,
      createdAt: DateTime.tryParse(
        json['createdAt'] as String? ?? json['created_at'] as String? ?? '',
      ) ?? DateTime.now(),
      updatedAt: DateTime.tryParse(
        json['updatedAt'] as String? ?? json['updated_at'] as String? ?? '',
      ) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'googleAssignmentId': googleAssignmentId,
        'googleCourseId': googleCourseId,
        'lessonId': lessonId,
        'title': title,
        if (maxPoints != null) 'maxPoints': maxPoints,
        'status': status.value,
        'autoGradePassback': autoGradePassback,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };
}

/// Status of an assignment link
enum AssignmentLinkStatus {
  active('active'),
  archived('archived'),
  deleted('deleted');

  const AssignmentLinkStatus(this.value);
  final String value;

  static AssignmentLinkStatus fromString(String value) {
    return AssignmentLinkStatus.values.firstWhere(
      (s) => s.value == value.toLowerCase(),
      orElse: () => AssignmentLinkStatus.active,
    );
  }
}

/// Pending grade awaiting sync to Google Classroom
@immutable
class PendingGrade {
  const PendingGrade({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.studentEmail,
    required this.assignmentId,
    required this.assignmentTitle,
    required this.score,
    required this.maxPoints,
    required this.completedAt,
    required this.syncStatus,
    this.lastError,
  });

  final String id;
  final String studentId;
  final String studentName;
  final String studentEmail;
  final String assignmentId;
  final String assignmentTitle;
  final double score;
  final double maxPoints;
  final DateTime completedAt;
  final GradeSyncStatus syncStatus;
  final String? lastError;

  /// Score as percentage
  double get scorePercent => maxPoints > 0 ? (score / maxPoints) * 100 : 0;

  /// Whether this grade can be synced
  bool get canSync =>
      syncStatus == GradeSyncStatus.pending || syncStatus == GradeSyncStatus.failed;

  factory PendingGrade.fromJson(Map<String, dynamic> json) {
    return PendingGrade(
      id: json['id'] as String? ?? '',
      studentId: json['studentId'] as String? ?? json['student_id'] as String? ?? '',
      studentName: json['studentName'] as String? ?? json['student_name'] as String? ?? '',
      studentEmail: json['studentEmail'] as String? ?? json['student_email'] as String? ?? '',
      assignmentId: json['assignmentId'] as String? ?? json['assignment_id'] as String? ?? '',
      assignmentTitle: json['assignmentTitle'] as String? ??
                       json['assignment_title'] as String? ?? '',
      score: (json['score'] as num?)?.toDouble() ?? 0,
      maxPoints: (json['maxPoints'] as num?)?.toDouble() ??
                 (json['max_points'] as num?)?.toDouble() ?? 0,
      completedAt: DateTime.tryParse(
        json['completedAt'] as String? ?? json['completed_at'] as String? ?? '',
      ) ?? DateTime.now(),
      syncStatus: GradeSyncStatus.fromString(
        json['syncStatus'] as String? ?? json['sync_status'] as String? ?? 'pending',
      ),
      lastError: json['lastError'] as String? ?? json['last_error'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'studentId': studentId,
        'studentName': studentName,
        'studentEmail': studentEmail,
        'assignmentId': assignmentId,
        'assignmentTitle': assignmentTitle,
        'score': score,
        'maxPoints': maxPoints,
        'completedAt': completedAt.toIso8601String(),
        'syncStatus': syncStatus.value,
        if (lastError != null) 'lastError': lastError,
      };
}

/// Sync status for grades
enum GradeSyncStatus {
  pending('pending'),
  synced('synced'),
  failed('failed'),
  retrying('retrying');

  const GradeSyncStatus(this.value);
  final String value;

  static GradeSyncStatus fromString(String value) {
    return GradeSyncStatus.values.firstWhere(
      (s) => s.value == value.toLowerCase(),
      orElse: () => GradeSyncStatus.pending,
    );
  }

  String get label {
    switch (this) {
      case GradeSyncStatus.pending:
        return 'Pending';
      case GradeSyncStatus.synced:
        return 'Synced';
      case GradeSyncStatus.failed:
        return 'Failed';
      case GradeSyncStatus.retrying:
        return 'Retrying';
    }
  }
}

/// Result of a sync operation
@immutable
class SyncResult {
  const SyncResult({
    required this.courseId,
    required this.courseName,
    required this.success,
    required this.studentsAdded,
    required this.studentsRemoved,
    required this.studentsUpdated,
    required this.teachersAdded,
    required this.teachersRemoved,
    required this.guardiansAdded,
    required this.errors,
    this.warnings,
    required this.duration,
    required this.syncedAt,
  });

  final String courseId;
  final String courseName;
  final bool success;
  final int studentsAdded;
  final int studentsRemoved;
  final int studentsUpdated;
  final int teachersAdded;
  final int teachersRemoved;
  final int guardiansAdded;
  final List<String> errors;
  final List<String>? warnings;
  final Duration duration;
  final DateTime syncedAt;

  /// Total changes made
  int get totalChanges =>
      studentsAdded + studentsRemoved + studentsUpdated +
      teachersAdded + teachersRemoved + guardiansAdded;

  /// Whether there were any errors
  bool get hasErrors => errors.isNotEmpty;

  /// Whether there were any warnings
  bool get hasWarnings => warnings?.isNotEmpty ?? false;

  factory SyncResult.fromJson(Map<String, dynamic> json) {
    return SyncResult(
      courseId: json['courseId'] as String? ?? json['course_id'] as String? ?? '',
      courseName: json['courseName'] as String? ?? json['course_name'] as String? ?? '',
      success: json['success'] as bool? ?? false,
      studentsAdded: json['studentsAdded'] as int? ?? json['students_added'] as int? ?? 0,
      studentsRemoved: json['studentsRemoved'] as int? ?? json['students_removed'] as int? ?? 0,
      studentsUpdated: json['studentsUpdated'] as int? ?? json['students_updated'] as int? ?? 0,
      teachersAdded: json['teachersAdded'] as int? ?? json['teachers_added'] as int? ?? 0,
      teachersRemoved: json['teachersRemoved'] as int? ?? json['teachers_removed'] as int? ?? 0,
      guardiansAdded: json['guardiansAdded'] as int? ?? json['guardians_added'] as int? ?? 0,
      errors: List<String>.from(json['errors'] as List<dynamic>? ?? []),
      warnings: json['warnings'] != null
          ? List<String>.from(json['warnings'] as List<dynamic>)
          : null,
      duration: Duration(
        milliseconds: json['duration'] as int? ?? json['durationMs'] as int? ?? 0,
      ),
      syncedAt: DateTime.tryParse(
        json['syncedAt'] as String? ?? json['synced_at'] as String? ?? '',
      ) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'courseId': courseId,
        'courseName': courseName,
        'success': success,
        'studentsAdded': studentsAdded,
        'studentsRemoved': studentsRemoved,
        'studentsUpdated': studentsUpdated,
        'teachersAdded': teachersAdded,
        'teachersRemoved': teachersRemoved,
        'guardiansAdded': guardiansAdded,
        'errors': errors,
        if (warnings != null) 'warnings': warnings,
        'duration': duration.inMilliseconds,
        'syncedAt': syncedAt.toIso8601String(),
      };
}

/// Sync history entry
@immutable
class SyncHistoryEntry {
  const SyncHistoryEntry({
    required this.id,
    required this.googleCourseId,
    this.classId,
    this.courseName,
    required this.syncType,
    required this.triggeredBy,
    required this.success,
    required this.studentsAdded,
    required this.studentsRemoved,
    required this.studentsUpdated,
    required this.teachersAdded,
    required this.teachersRemoved,
    required this.guardiansAdded,
    this.errors,
    this.warnings,
    required this.startedAt,
    required this.completedAt,
    required this.durationMs,
    required this.createdAt,
  });

  final String id;
  final String googleCourseId;
  final String? classId;
  final String? courseName;
  final SyncType syncType;
  final String triggeredBy;
  final bool success;
  final int studentsAdded;
  final int studentsRemoved;
  final int studentsUpdated;
  final int teachersAdded;
  final int teachersRemoved;
  final int guardiansAdded;
  final List<String>? errors;
  final List<String>? warnings;
  final DateTime startedAt;
  final DateTime completedAt;
  final int durationMs;
  final DateTime createdAt;

  /// Duration as Duration object
  Duration get duration => Duration(milliseconds: durationMs);

  /// Total changes
  int get totalChanges =>
      studentsAdded + studentsRemoved + studentsUpdated +
      teachersAdded + teachersRemoved + guardiansAdded;

  /// Status string
  String get statusLabel {
    if (success && (errors?.isEmpty ?? true)) return 'Success';
    if (success) return 'Partial';
    return 'Failed';
  }

  factory SyncHistoryEntry.fromJson(Map<String, dynamic> json) {
    return SyncHistoryEntry(
      id: json['id'] as String? ?? '',
      googleCourseId: json['googleCourseId'] as String? ??
                      json['google_course_id'] as String? ?? '',
      classId: json['classId'] as String? ?? json['class_id'] as String?,
      courseName: json['courseName'] as String? ?? json['course_name'] as String?,
      syncType: SyncType.fromString(
        json['syncType'] as String? ?? json['sync_type'] as String? ?? 'manual',
      ),
      triggeredBy: json['triggeredBy'] as String? ?? json['triggered_by'] as String? ?? '',
      success: json['success'] as bool? ?? false,
      studentsAdded: json['studentsAdded'] as int? ?? json['students_added'] as int? ?? 0,
      studentsRemoved: json['studentsRemoved'] as int? ?? json['students_removed'] as int? ?? 0,
      studentsUpdated: json['studentsUpdated'] as int? ?? json['students_updated'] as int? ?? 0,
      teachersAdded: json['teachersAdded'] as int? ?? json['teachers_added'] as int? ?? 0,
      teachersRemoved: json['teachersRemoved'] as int? ?? json['teachers_removed'] as int? ?? 0,
      guardiansAdded: json['guardiansAdded'] as int? ?? json['guardians_added'] as int? ?? 0,
      errors: json['errors'] != null
          ? List<String>.from(json['errors'] as List<dynamic>)
          : null,
      warnings: json['warnings'] != null
          ? List<String>.from(json['warnings'] as List<dynamic>)
          : null,
      startedAt: DateTime.tryParse(
        json['startedAt'] as String? ?? json['started_at'] as String? ?? '',
      ) ?? DateTime.now(),
      completedAt: DateTime.tryParse(
        json['completedAt'] as String? ?? json['completed_at'] as String? ?? '',
      ) ?? DateTime.now(),
      durationMs: json['durationMs'] as int? ?? json['duration_ms'] as int? ?? 0,
      createdAt: DateTime.tryParse(
        json['createdAt'] as String? ?? json['created_at'] as String? ?? '',
      ) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'googleCourseId': googleCourseId,
        if (classId != null) 'classId': classId,
        if (courseName != null) 'courseName': courseName,
        'syncType': syncType.value,
        'triggeredBy': triggeredBy,
        'success': success,
        'studentsAdded': studentsAdded,
        'studentsRemoved': studentsRemoved,
        'studentsUpdated': studentsUpdated,
        'teachersAdded': teachersAdded,
        'teachersRemoved': teachersRemoved,
        'guardiansAdded': guardiansAdded,
        if (errors != null) 'errors': errors,
        if (warnings != null) 'warnings': warnings,
        'startedAt': startedAt.toIso8601String(),
        'completedAt': completedAt.toIso8601String(),
        'durationMs': durationMs,
        'createdAt': createdAt.toIso8601String(),
      };
}

/// Type of sync operation
enum SyncType {
  full('full'),
  incremental('incremental'),
  webhook('webhook'),
  manual('manual');

  const SyncType(this.value);
  final String value;

  static SyncType fromString(String value) {
    return SyncType.values.firstWhere(
      (t) => t.value == value.toLowerCase(),
      orElse: () => SyncType.manual,
    );
  }

  String get label {
    switch (this) {
      case SyncType.full:
        return 'Full Sync';
      case SyncType.incremental:
        return 'Incremental';
      case SyncType.webhook:
        return 'Webhook';
      case SyncType.manual:
        return 'Manual';
    }
  }
}

/// Grade passback result
@immutable
class GradePassbackResult {
  const GradePassbackResult({
    required this.successful,
    required this.failed,
    required this.errors,
  });

  final int successful;
  final int failed;
  final List<GradePassbackError> errors;

  /// Total grades processed
  int get total => successful + failed;

  /// Whether all grades were synced successfully
  bool get allSuccessful => failed == 0;

  factory GradePassbackResult.fromJson(Map<String, dynamic> json) {
    return GradePassbackResult(
      successful: json['successful'] as int? ?? 0,
      failed: json['failed'] as int? ?? 0,
      errors: (json['errors'] as List<dynamic>? ?? [])
          .map((e) => GradePassbackError.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'successful': successful,
        'failed': failed,
        'errors': errors.map((e) => e.toJson()).toList(),
      };
}

/// Error from grade passback
@immutable
class GradePassbackError {
  const GradePassbackError({
    required this.studentId,
    required this.error,
  });

  final String studentId;
  final String error;

  factory GradePassbackError.fromJson(Map<String, dynamic> json) {
    return GradePassbackError(
      studentId: json['studentId'] as String? ?? json['student_id'] as String? ?? '',
      error: json['error'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'studentId': studentId,
        'error': error,
      };
}

/// DTO for posting an assignment to Google Classroom
@immutable
class PostAssignmentRequest {
  const PostAssignmentRequest({
    required this.lessonId,
    required this.courseId,
    this.title,
    this.description,
    this.dueDate,
    this.scheduledTime,
    this.maxPoints,
    this.autoGradePassback = true,
  });

  final String lessonId;
  final String courseId;
  final String? title;
  final String? description;
  final DateTime? dueDate;
  final DateTime? scheduledTime;
  final double? maxPoints;
  final bool autoGradePassback;

  Map<String, dynamic> toJson() => {
        'lessonId': lessonId,
        'courseId': courseId,
        if (title != null) 'title': title,
        if (description != null) 'description': description,
        if (dueDate != null) 'dueDate': dueDate!.toIso8601String(),
        if (scheduledTime != null) 'scheduledTime': scheduledTime!.toIso8601String(),
        if (maxPoints != null) 'maxPoints': maxPoints,
        'autoGradePassback': autoGradePassback,
      };
}
