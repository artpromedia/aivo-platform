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

/// Google Classroom student with AIVO mapping information
@immutable
class GoogleClassroomStudent {
  const GoogleClassroomStudent({
    required this.id,
    required this.userId,
    required this.courseId,
    required this.profile,
    this.studentMapping,
    required this.enrolledAt,
  });

  /// Google Classroom student enrollment ID
  final String id;
  
  /// Google user ID
  final String userId;
  
  /// Google Classroom course ID
  final String courseId;
  
  /// Student profile information
  final GoogleStudentProfile profile;
  
  /// AIVO student mapping (null if not mapped)
  final StudentMapping? studentMapping;
  
  /// When the student enrolled in the course
  final DateTime enrolledAt;

  /// Whether this student is mapped to an AIVO student
  bool get isMapped => studentMapping != null;
  
  /// Display name (full name or email)
  String get displayName => profile.fullName.isNotEmpty 
      ? profile.fullName 
      : profile.emailAddress;

  factory GoogleClassroomStudent.fromJson(Map<String, dynamic> json) {
    return GoogleClassroomStudent(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? json['user_id'] as String? ?? '',
      courseId: json['courseId'] as String? ?? json['course_id'] as String? ?? '',
      profile: GoogleStudentProfile.fromJson(
        json['profile'] as Map<String, dynamic>? ?? {},
      ),
      studentMapping: json['studentMapping'] != null || json['student_mapping'] != null
          ? StudentMapping.fromJson(
              (json['studentMapping'] ?? json['student_mapping']) as Map<String, dynamic>,
            )
          : null,
      enrolledAt: DateTime.tryParse(
        json['enrolledAt'] as String? ?? json['enrolled_at'] as String? ?? '',
      ) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'courseId': courseId,
        'profile': profile.toJson(),
        if (studentMapping != null) 'studentMapping': studentMapping!.toJson(),
        'enrolledAt': enrolledAt.toIso8601String(),
      };

  GoogleClassroomStudent copyWith({
    String? id,
    String? userId,
    String? courseId,
    GoogleStudentProfile? profile,
    StudentMapping? studentMapping,
    DateTime? enrolledAt,
  }) {
    return GoogleClassroomStudent(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      courseId: courseId ?? this.courseId,
      profile: profile ?? this.profile,
      studentMapping: studentMapping ?? this.studentMapping,
      enrolledAt: enrolledAt ?? this.enrolledAt,
    );
  }
}

/// Google Classroom student profile
@immutable
class GoogleStudentProfile {
  const GoogleStudentProfile({
    required this.id,
    required this.emailAddress,
    required this.fullName,
    this.givenName,
    this.familyName,
    this.photoUrl,
  });

  final String id;
  final String emailAddress;
  final String fullName;
  final String? givenName;
  final String? familyName;
  final String? photoUrl;

  factory GoogleStudentProfile.fromJson(Map<String, dynamic> json) {
    return GoogleStudentProfile(
      id: json['id'] as String? ?? '',
      emailAddress: json['emailAddress'] as String? ?? 
                    json['email_address'] as String? ?? 
                    json['email'] as String? ?? '',
      fullName: json['fullName'] as String? ?? 
                json['full_name'] as String? ?? 
                json['name'] as String? ?? '',
      givenName: json['givenName'] as String? ?? json['given_name'] as String?,
      familyName: json['familyName'] as String? ?? json['family_name'] as String?,
      photoUrl: json['photoUrl'] as String? ?? json['photo_url'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'emailAddress': emailAddress,
        'fullName': fullName,
        if (givenName != null) 'givenName': givenName,
        if (familyName != null) 'familyName': familyName,
        if (photoUrl != null) 'photoUrl': photoUrl,
      };
}

/// Mapping between Google Classroom student and AIVO student
@immutable
class StudentMapping {
  const StudentMapping({
    required this.id,
    required this.googleUserId,
    required this.aivoStudentId,
    required this.aivoStudentName,
    this.aivoStudentEmail,
    required this.mappedBy,
    required this.mappedAt,
    this.autoMapped = false,
    this.confidence,
  });

  final String id;
  final String googleUserId;
  final String aivoStudentId;
  final String aivoStudentName;
  final String? aivoStudentEmail;
  final String mappedBy;
  final DateTime mappedAt;
  final bool autoMapped;
  final double? confidence;

  factory StudentMapping.fromJson(Map<String, dynamic> json) {
    return StudentMapping(
      id: json['id'] as String? ?? '',
      googleUserId: json['googleUserId'] as String? ?? 
                    json['google_user_id'] as String? ?? '',
      aivoStudentId: json['aivoStudentId'] as String? ?? 
                     json['aivo_student_id'] as String? ?? '',
      aivoStudentName: json['aivoStudentName'] as String? ?? 
                       json['aivo_student_name'] as String? ?? '',
      aivoStudentEmail: json['aivoStudentEmail'] as String? ?? 
                        json['aivo_student_email'] as String?,
      mappedBy: json['mappedBy'] as String? ?? json['mapped_by'] as String? ?? '',
      mappedAt: DateTime.tryParse(
        json['mappedAt'] as String? ?? json['mapped_at'] as String? ?? '',
      ) ?? DateTime.now(),
      autoMapped: json['autoMapped'] as bool? ?? json['auto_mapped'] as bool? ?? false,
      confidence: (json['confidence'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'googleUserId': googleUserId,
        'aivoStudentId': aivoStudentId,
        'aivoStudentName': aivoStudentName,
        if (aivoStudentEmail != null) 'aivoStudentEmail': aivoStudentEmail,
        'mappedBy': mappedBy,
        'mappedAt': mappedAt.toIso8601String(),
        'autoMapped': autoMapped,
        if (confidence != null) 'confidence': confidence,
      };
}

/// Google Classroom submission with grade information
@immutable
class GoogleClassroomSubmission {
  const GoogleClassroomSubmission({
    required this.id,
    required this.courseId,
    required this.courseWorkId,
    required this.userId,
    required this.state,
    this.assignedGrade,
    this.draftGrade,
    this.late = false,
    this.submissionHistory,
    required this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String courseId;
  final String courseWorkId;
  final String userId;
  final SubmissionState state;
  final double? assignedGrade;
  final double? draftGrade;
  final bool late;
  final List<SubmissionHistoryEntry>? submissionHistory;
  final DateTime createdAt;
  final DateTime? updatedAt;

  /// Whether submission has been graded
  bool get isGraded => assignedGrade != null;

  /// Whether submission has been turned in
  bool get isTurnedIn => state == SubmissionState.turnedIn || 
                          state == SubmissionState.returned;

  factory GoogleClassroomSubmission.fromJson(Map<String, dynamic> json) {
    return GoogleClassroomSubmission(
      id: json['id'] as String? ?? '',
      courseId: json['courseId'] as String? ?? json['course_id'] as String? ?? '',
      courseWorkId: json['courseWorkId'] as String? ?? 
                    json['course_work_id'] as String? ?? '',
      userId: json['userId'] as String? ?? json['user_id'] as String? ?? '',
      state: SubmissionState.fromString(
        json['state'] as String? ?? 'created',
      ),
      assignedGrade: (json['assignedGrade'] as num?)?.toDouble() ??
                     (json['assigned_grade'] as num?)?.toDouble(),
      draftGrade: (json['draftGrade'] as num?)?.toDouble() ??
                  (json['draft_grade'] as num?)?.toDouble(),
      late: json['late'] as bool? ?? false,
      submissionHistory: json['submissionHistory'] != null
          ? (json['submissionHistory'] as List<dynamic>)
              .map((e) => SubmissionHistoryEntry.fromJson(e as Map<String, dynamic>))
              .toList()
          : json['submission_history'] != null
              ? (json['submission_history'] as List<dynamic>)
                  .map((e) => SubmissionHistoryEntry.fromJson(e as Map<String, dynamic>))
                  .toList()
              : null,
      createdAt: DateTime.tryParse(
        json['createdAt'] as String? ?? json['created_at'] as String? ?? '',
      ) ?? DateTime.now(),
      updatedAt: DateTime.tryParse(
        json['updatedAt'] as String? ?? json['updated_at'] as String? ?? '',
      ),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'courseId': courseId,
        'courseWorkId': courseWorkId,
        'userId': userId,
        'state': state.value,
        if (assignedGrade != null) 'assignedGrade': assignedGrade,
        if (draftGrade != null) 'draftGrade': draftGrade,
        'late': late,
        if (submissionHistory != null)
          'submissionHistory': submissionHistory!.map((e) => e.toJson()).toList(),
        'createdAt': createdAt.toIso8601String(),
        if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
      };
}

/// State of a submission
enum SubmissionState {
  created('CREATED'),
  newState('NEW'),
  turnedIn('TURNED_IN'),
  returned('RETURNED'),
  reclaimedByStudent('RECLAIMED_BY_STUDENT');

  const SubmissionState(this.value);
  final String value;

  static SubmissionState fromString(String value) {
    return SubmissionState.values.firstWhere(
      (s) => s.value == value.toUpperCase(),
      orElse: () => SubmissionState.created,
    );
  }

  String get label {
    switch (this) {
      case SubmissionState.created:
        return 'Created';
      case SubmissionState.newState:
        return 'New';
      case SubmissionState.turnedIn:
        return 'Turned In';
      case SubmissionState.returned:
        return 'Returned';
      case SubmissionState.reclaimedByStudent:
        return 'Reclaimed';
    }
  }
}

/// History entry for a submission
@immutable
class SubmissionHistoryEntry {
  const SubmissionHistoryEntry({
    required this.stateHistory,
    this.gradeHistory,
  });

  final StateHistory? stateHistory;
  final GradeHistory? gradeHistory;

  factory SubmissionHistoryEntry.fromJson(Map<String, dynamic> json) {
    return SubmissionHistoryEntry(
      stateHistory: json['stateHistory'] != null || json['state_history'] != null
          ? StateHistory.fromJson(
              (json['stateHistory'] ?? json['state_history']) as Map<String, dynamic>,
            )
          : null,
      gradeHistory: json['gradeHistory'] != null || json['grade_history'] != null
          ? GradeHistory.fromJson(
              (json['gradeHistory'] ?? json['grade_history']) as Map<String, dynamic>,
            )
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        if (stateHistory != null) 'stateHistory': stateHistory!.toJson(),
        if (gradeHistory != null) 'gradeHistory': gradeHistory!.toJson(),
      };
}

/// State change history
@immutable
class StateHistory {
  const StateHistory({
    required this.state,
    required this.timestamp,
    this.actorUserId,
  });

  final SubmissionState state;
  final DateTime timestamp;
  final String? actorUserId;

  factory StateHistory.fromJson(Map<String, dynamic> json) {
    return StateHistory(
      state: SubmissionState.fromString(json['state'] as String? ?? 'created'),
      timestamp: DateTime.tryParse(
        json['timestamp'] as String? ?? json['stateTimestamp'] as String? ?? '',
      ) ?? DateTime.now(),
      actorUserId: json['actorUserId'] as String? ?? json['actor_user_id'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'state': state.value,
        'timestamp': timestamp.toIso8601String(),
        if (actorUserId != null) 'actorUserId': actorUserId,
      };
}

/// Grade change history
@immutable
class GradeHistory {
  const GradeHistory({
    required this.pointsEarned,
    required this.maxPoints,
    required this.timestamp,
    this.actorUserId,
  });

  final double pointsEarned;
  final double maxPoints;
  final DateTime timestamp;
  final String? actorUserId;

  /// Grade as percentage
  double get percentage => maxPoints > 0 ? (pointsEarned / maxPoints) * 100 : 0;

  factory GradeHistory.fromJson(Map<String, dynamic> json) {
    return GradeHistory(
      pointsEarned: (json['pointsEarned'] as num?)?.toDouble() ?? 
                    (json['points_earned'] as num?)?.toDouble() ?? 0,
      maxPoints: (json['maxPoints'] as num?)?.toDouble() ?? 
                 (json['max_points'] as num?)?.toDouble() ?? 0,
      timestamp: DateTime.tryParse(
        json['timestamp'] as String? ?? json['gradeTimestamp'] as String? ?? '',
      ) ?? DateTime.now(),
      actorUserId: json['actorUserId'] as String? ?? json['actor_user_id'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'pointsEarned': pointsEarned,
        'maxPoints': maxPoints,
        'timestamp': timestamp.toIso8601String(),
        if (actorUserId != null) 'actorUserId': actorUserId,
      };
}

/// Sync status for detailed progress tracking
@immutable
class DetailedSyncStatus {
  const DetailedSyncStatus({
    required this.courseId,
    required this.phase,
    required this.progress,
    required this.message,
    this.itemsProcessed = 0,
    this.totalItems = 0,
    this.errors,
    this.startedAt,
    this.estimatedCompletion,
  });

  final String courseId;
  final SyncPhase phase;
  final double progress;
  final String message;
  final int itemsProcessed;
  final int totalItems;
  final List<String>? errors;
  final DateTime? startedAt;
  final DateTime? estimatedCompletion;

  /// Whether sync has errors
  bool get hasErrors => errors?.isNotEmpty ?? false;
  
  /// Percentage progress
  int get progressPercent => (progress * 100).round();
  
  /// Items remaining
  int get itemsRemaining => totalItems - itemsProcessed;

  factory DetailedSyncStatus.fromJson(Map<String, dynamic> json) {
    return DetailedSyncStatus(
      courseId: json['courseId'] as String? ?? json['course_id'] as String? ?? '',
      phase: SyncPhase.fromString(json['phase'] as String? ?? 'preparing'),
      progress: (json['progress'] as num?)?.toDouble() ?? 0,
      message: json['message'] as String? ?? '',
      itemsProcessed: json['itemsProcessed'] as int? ?? 
                      json['items_processed'] as int? ?? 0,
      totalItems: json['totalItems'] as int? ?? json['total_items'] as int? ?? 0,
      errors: json['errors'] != null
          ? List<String>.from(json['errors'] as List<dynamic>)
          : null,
      startedAt: DateTime.tryParse(
        json['startedAt'] as String? ?? json['started_at'] as String? ?? '',
      ),
      estimatedCompletion: DateTime.tryParse(
        json['estimatedCompletion'] as String? ?? 
        json['estimated_completion'] as String? ?? '',
      ),
    );
  }

  Map<String, dynamic> toJson() => {
        'courseId': courseId,
        'phase': phase.value,
        'progress': progress,
        'message': message,
        'itemsProcessed': itemsProcessed,
        'totalItems': totalItems,
        if (errors != null) 'errors': errors,
        if (startedAt != null) 'startedAt': startedAt!.toIso8601String(),
        if (estimatedCompletion != null) 
          'estimatedCompletion': estimatedCompletion!.toIso8601String(),
      };

  DetailedSyncStatus copyWith({
    String? courseId,
    SyncPhase? phase,
    double? progress,
    String? message,
    int? itemsProcessed,
    int? totalItems,
    List<String>? errors,
    DateTime? startedAt,
    DateTime? estimatedCompletion,
  }) {
    return DetailedSyncStatus(
      courseId: courseId ?? this.courseId,
      phase: phase ?? this.phase,
      progress: progress ?? this.progress,
      message: message ?? this.message,
      itemsProcessed: itemsProcessed ?? this.itemsProcessed,
      totalItems: totalItems ?? this.totalItems,
      errors: errors ?? this.errors,
      startedAt: startedAt ?? this.startedAt,
      estimatedCompletion: estimatedCompletion ?? this.estimatedCompletion,
    );
  }
}

/// Phases of sync operation
enum SyncPhase {
  preparing('preparing'),
  fetchingStudents('fetching_students'),
  mappingStudents('mapping_students'),
  fetchingTeachers('fetching_teachers'),
  fetchingGuardians('fetching_guardians'),
  processingChanges('processing_changes'),
  finalizingSync('finalizing'),
  completed('completed'),
  failed('failed');

  const SyncPhase(this.value);
  final String value;

  static SyncPhase fromString(String value) {
    return SyncPhase.values.firstWhere(
      (p) => p.value == value.toLowerCase(),
      orElse: () => SyncPhase.preparing,
    );
  }

  String get label {
    switch (this) {
      case SyncPhase.preparing:
        return 'Preparing';
      case SyncPhase.fetchingStudents:
        return 'Fetching students';
      case SyncPhase.mappingStudents:
        return 'Mapping students';
      case SyncPhase.fetchingTeachers:
        return 'Fetching teachers';
      case SyncPhase.fetchingGuardians:
        return 'Fetching guardians';
      case SyncPhase.processingChanges:
        return 'Processing changes';
      case SyncPhase.finalizingSync:
        return 'Finalizing';
      case SyncPhase.completed:
        return 'Completed';
      case SyncPhase.failed:
        return 'Failed';
    }
  }

  /// Whether this phase is a terminal state
  bool get isTerminal => this == completed || this == failed;
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

/// Retry policy for failed grade passbacks
enum PassbackRetryPolicy {
  /// No automatic retry
  manual('manual'),
  
  /// Retry once after 5 minutes
  once('once'),
  
  /// Retry up to 3 times with exponential backoff
  exponential('exponential');

  const PassbackRetryPolicy(this.value);
  final String value;

  static PassbackRetryPolicy fromString(String value) {
    return PassbackRetryPolicy.values.firstWhere(
      (p) => p.value == value.toLowerCase(),
      orElse: () => PassbackRetryPolicy.exponential,
    );
  }

  String get label {
    switch (this) {
      case PassbackRetryPolicy.manual:
        return 'Manual only';
      case PassbackRetryPolicy.once:
        return 'Retry once';
      case PassbackRetryPolicy.exponential:
        return 'Auto-retry (recommended)';
    }
  }

  String get description {
    switch (this) {
      case PassbackRetryPolicy.manual:
        return 'Failed grades must be synced manually';
      case PassbackRetryPolicy.once:
        return 'Retry failed grades once after 5 minutes';
      case PassbackRetryPolicy.exponential:
        return 'Automatically retry up to 3 times with increasing delays';
    }
  }
}

/// Settings for grade passback to Google Classroom
@immutable
class PassbackSettings {
  const PassbackSettings({
    this.autoSyncEnabled = true,
    this.syncOnGradeSubmit = true,
    this.requireConfirmation = false,
    this.retryPolicy = PassbackRetryPolicy.exponential,
    this.syncIntervalMinutes = 15,
    this.maxRetryAttempts = 3,
    this.notifyOnFailure = true,
    this.batchSyncThreshold = 10,
  });

  /// Whether automatic background sync is enabled
  final bool autoSyncEnabled;

  /// Whether to immediately sync when a grade is submitted
  final bool syncOnGradeSubmit;

  /// Whether to require confirmation before syncing grades
  final bool requireConfirmation;

  /// Retry policy for failed passbacks
  final PassbackRetryPolicy retryPolicy;

  /// Interval in minutes between auto-sync checks
  final int syncIntervalMinutes;

  /// Maximum number of retry attempts for failed grades
  final int maxRetryAttempts;

  /// Whether to show notification when passback fails
  final bool notifyOnFailure;

  /// Number of pending grades that triggers batch sync prompt
  final int batchSyncThreshold;

  PassbackSettings copyWith({
    bool? autoSyncEnabled,
    bool? syncOnGradeSubmit,
    bool? requireConfirmation,
    PassbackRetryPolicy? retryPolicy,
    int? syncIntervalMinutes,
    int? maxRetryAttempts,
    bool? notifyOnFailure,
    int? batchSyncThreshold,
  }) {
    return PassbackSettings(
      autoSyncEnabled: autoSyncEnabled ?? this.autoSyncEnabled,
      syncOnGradeSubmit: syncOnGradeSubmit ?? this.syncOnGradeSubmit,
      requireConfirmation: requireConfirmation ?? this.requireConfirmation,
      retryPolicy: retryPolicy ?? this.retryPolicy,
      syncIntervalMinutes: syncIntervalMinutes ?? this.syncIntervalMinutes,
      maxRetryAttempts: maxRetryAttempts ?? this.maxRetryAttempts,
      notifyOnFailure: notifyOnFailure ?? this.notifyOnFailure,
      batchSyncThreshold: batchSyncThreshold ?? this.batchSyncThreshold,
    );
  }

  factory PassbackSettings.fromJson(Map<String, dynamic> json) {
    return PassbackSettings(
      autoSyncEnabled: json['autoSyncEnabled'] as bool? ??
          json['auto_sync_enabled'] as bool? ?? true,
      syncOnGradeSubmit: json['syncOnGradeSubmit'] as bool? ??
          json['sync_on_grade_submit'] as bool? ?? true,
      requireConfirmation: json['requireConfirmation'] as bool? ??
          json['require_confirmation'] as bool? ?? false,
      retryPolicy: PassbackRetryPolicy.fromString(
        json['retryPolicy'] as String? ??
            json['retry_policy'] as String? ?? 'exponential',
      ),
      syncIntervalMinutes: json['syncIntervalMinutes'] as int? ??
          json['sync_interval_minutes'] as int? ?? 15,
      maxRetryAttempts: json['maxRetryAttempts'] as int? ??
          json['max_retry_attempts'] as int? ?? 3,
      notifyOnFailure: json['notifyOnFailure'] as bool? ??
          json['notify_on_failure'] as bool? ?? true,
      batchSyncThreshold: json['batchSyncThreshold'] as int? ??
          json['batch_sync_threshold'] as int? ?? 10,
    );
  }

  Map<String, dynamic> toJson() => {
        'autoSyncEnabled': autoSyncEnabled,
        'syncOnGradeSubmit': syncOnGradeSubmit,
        'requireConfirmation': requireConfirmation,
        'retryPolicy': retryPolicy.value,
        'syncIntervalMinutes': syncIntervalMinutes,
        'maxRetryAttempts': maxRetryAttempts,
        'notifyOnFailure': notifyOnFailure,
        'batchSyncThreshold': batchSyncThreshold,
      };
}

/// Item in the grade passback queue
@immutable
class GradePassbackQueueItem {
  const GradePassbackQueueItem({
    required this.id,
    required this.gradeId,
    required this.studentId,
    required this.studentName,
    required this.assignmentId,
    required this.assignmentTitle,
    required this.score,
    required this.maxPoints,
    required this.status,
    required this.createdAt,
    this.attemptCount = 0,
    this.lastAttemptAt,
    this.nextRetryAt,
    this.lastError,
  });

  final String id;
  final String gradeId;
  final String studentId;
  final String studentName;
  final String assignmentId;
  final String assignmentTitle;
  final double score;
  final double maxPoints;
  final GradeSyncStatus status;
  final DateTime createdAt;
  final int attemptCount;
  final DateTime? lastAttemptAt;
  final DateTime? nextRetryAt;
  final String? lastError;

  /// Score as percentage
  double get scorePercent => maxPoints > 0 ? (score / maxPoints) * 100 : 0;

  /// Whether this item can be retried
  bool get canRetry =>
      status == GradeSyncStatus.failed || status == GradeSyncStatus.pending;

  /// Whether this item is scheduled for retry
  bool get isScheduledForRetry =>
      nextRetryAt != null && nextRetryAt!.isAfter(DateTime.now());

  GradePassbackQueueItem copyWith({
    String? id,
    String? gradeId,
    String? studentId,
    String? studentName,
    String? assignmentId,
    String? assignmentTitle,
    double? score,
    double? maxPoints,
    GradeSyncStatus? status,
    DateTime? createdAt,
    int? attemptCount,
    DateTime? lastAttemptAt,
    DateTime? nextRetryAt,
    String? lastError,
  }) {
    return GradePassbackQueueItem(
      id: id ?? this.id,
      gradeId: gradeId ?? this.gradeId,
      studentId: studentId ?? this.studentId,
      studentName: studentName ?? this.studentName,
      assignmentId: assignmentId ?? this.assignmentId,
      assignmentTitle: assignmentTitle ?? this.assignmentTitle,
      score: score ?? this.score,
      maxPoints: maxPoints ?? this.maxPoints,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      attemptCount: attemptCount ?? this.attemptCount,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      nextRetryAt: nextRetryAt ?? this.nextRetryAt,
      lastError: lastError ?? this.lastError,
    );
  }

  factory GradePassbackQueueItem.fromJson(Map<String, dynamic> json) {
    return GradePassbackQueueItem(
      id: json['id'] as String? ?? '',
      gradeId: json['gradeId'] as String? ?? json['grade_id'] as String? ?? '',
      studentId: json['studentId'] as String? ?? json['student_id'] as String? ?? '',
      studentName: json['studentName'] as String? ?? json['student_name'] as String? ?? '',
      assignmentId: json['assignmentId'] as String? ?? json['assignment_id'] as String? ?? '',
      assignmentTitle: json['assignmentTitle'] as String? ??
          json['assignment_title'] as String? ?? '',
      score: (json['score'] as num?)?.toDouble() ?? 0,
      maxPoints: (json['maxPoints'] as num?)?.toDouble() ??
          (json['max_points'] as num?)?.toDouble() ?? 0,
      status: GradeSyncStatus.fromString(
        json['status'] as String? ?? 'pending',
      ),
      createdAt: DateTime.tryParse(
        json['createdAt'] as String? ?? json['created_at'] as String? ?? '',
      ) ?? DateTime.now(),
      attemptCount: json['attemptCount'] as int? ?? json['attempt_count'] as int? ?? 0,
      lastAttemptAt: json['lastAttemptAt'] != null || json['last_attempt_at'] != null
          ? DateTime.tryParse(
              json['lastAttemptAt'] as String? ?? json['last_attempt_at'] as String? ?? '',
            )
          : null,
      nextRetryAt: json['nextRetryAt'] != null || json['next_retry_at'] != null
          ? DateTime.tryParse(
              json['nextRetryAt'] as String? ?? json['next_retry_at'] as String? ?? '',
            )
          : null,
      lastError: json['lastError'] as String? ?? json['last_error'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'gradeId': gradeId,
        'studentId': studentId,
        'studentName': studentName,
        'assignmentId': assignmentId,
        'assignmentTitle': assignmentTitle,
        'score': score,
        'maxPoints': maxPoints,
        'status': status.value,
        'createdAt': createdAt.toIso8601String(),
        'attemptCount': attemptCount,
        if (lastAttemptAt != null) 'lastAttemptAt': lastAttemptAt!.toIso8601String(),
        if (nextRetryAt != null) 'nextRetryAt': nextRetryAt!.toIso8601String(),
        if (lastError != null) 'lastError': lastError,
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
