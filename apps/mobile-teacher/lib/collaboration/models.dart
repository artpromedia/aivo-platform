/// Collaboration Models for Teachers
///
/// Teacher-specific models for care teams, action plans, notes, and meetings.
library;

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/// Role of a care team member.
enum CareTeamRole {
  parent,
  guardian,
  teacher,
  specialist,
  therapist,
  counselor,
  districtAdmin,
  caseManager,
  aide,
  administrator,
  other,
}

/// Status of an action plan.
enum ActionPlanStatus {
  draft,
  active,
  onHold,
  completed,
  archived,
}

/// Context where a task is performed.
enum TaskContext {
  home,
  school,
  therapy,
  community,
  shared,
}

/// Type of care note.
enum CareNoteType {
  observation,
  progressUpdate,
  question,
  homeUpdate,
  schoolUpdate,
  therapyUpdate,
  meetingNotes,
  strategyFeedback,
  celebration,
}

/// Meeting status.
enum MeetingStatus {
  scheduled,
  inProgress,
  completed,
  cancelled,
}

/// Meeting type.
enum MeetingType {
  virtual,
  inPerson,
  phone,
  hybrid,
}

/// Response status for meeting invitations.
enum ResponseStatus {
  pending,
  accepted,
  declined,
  tentative,
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// A member of a learner's care team.
class CareTeamMember {
  const CareTeamMember({
    required this.id,
    required this.userId,
    required this.displayName,
    required this.role,
    this.title,
    this.contactEmail,
    this.contactPhone,
    required this.isActive,
    required this.joinedAt,
  });

  final String id;
  final String userId;
  final String displayName;
  final CareTeamRole role;
  final String? title;
  final String? contactEmail;
  final String? contactPhone;
  final bool isActive;
  final DateTime joinedAt;

  factory CareTeamMember.fromJson(Map<String, dynamic> json) {
    return CareTeamMember(
      id: json['id'] as String,
      userId: json['userId'] as String,
      displayName: json['displayName'] as String,
      role: _parseRole(json['role'] as String),
      title: json['title'] as String?,
      contactEmail: json['contactEmail'] as String?,
      contactPhone: json['contactPhone'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      joinedAt: DateTime.parse(json['joinedAt'] as String),
    );
  }

  static CareTeamRole _parseRole(String role) {
    switch (role.toUpperCase()) {
      case 'PARENT':
        return CareTeamRole.parent;
      case 'GUARDIAN':
        return CareTeamRole.guardian;
      case 'TEACHER':
        return CareTeamRole.teacher;
      case 'SPECIALIST':
        return CareTeamRole.specialist;
      case 'THERAPIST':
        return CareTeamRole.therapist;
      case 'COUNSELOR':
        return CareTeamRole.counselor;
      default:
        return CareTeamRole.other;
    }
  }

  String get roleDisplayName {
    switch (role) {
      case CareTeamRole.parent:
        return 'Parent';
      case CareTeamRole.guardian:
        return 'Guardian';
      case CareTeamRole.teacher:
        return 'Teacher';
      case CareTeamRole.specialist:
        return 'Specialist';
      case CareTeamRole.therapist:
        return 'Therapist';
      case CareTeamRole.counselor:
        return 'Counselor';
      case CareTeamRole.districtAdmin:
        return 'District Admin';
      case CareTeamRole.caseManager:
        return 'Case Manager';
      case CareTeamRole.aide:
        return 'Aide';
      case CareTeamRole.administrator:
        return 'Administrator';
      case CareTeamRole.other:
        return 'Other';
    }
  }
}

/// A task within an action plan.
class ActionPlanTask {
  const ActionPlanTask({
    required this.id,
    required this.actionPlanId,
    required this.title,
    this.description,
    required this.context,
    this.timeOfDay,
    required this.isActive,
    this.assignee,
    required this.completionCount,
  });

  final String id;
  final String actionPlanId;
  final String title;
  final String? description;
  final TaskContext context;
  final String? timeOfDay;
  final bool isActive;
  final CareTeamMember? assignee;
  final int completionCount;

  factory ActionPlanTask.fromJson(Map<String, dynamic> json) {
    return ActionPlanTask(
      id: json['id'] as String,
      actionPlanId: json['actionPlanId'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      context: _parseContext(json['context'] as String),
      timeOfDay: json['timeOfDay'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      assignee: json['assignee'] != null
          ? CareTeamMember.fromJson(json['assignee'] as Map<String, dynamic>)
          : null,
      completionCount: (json['_count'] as Map?)?['completions'] as int? ?? 0,
    );
  }

  static TaskContext _parseContext(String context) {
    switch (context.toUpperCase()) {
      case 'HOME':
        return TaskContext.home;
      case 'SCHOOL':
        return TaskContext.school;
      case 'THERAPY':
        return TaskContext.therapy;
      case 'COMMUNITY':
        return TaskContext.community;
      default:
        return TaskContext.shared;
    }
  }

  String get contextDisplayName {
    switch (context) {
      case TaskContext.home:
        return 'Home';
      case TaskContext.school:
        return 'School';
      case TaskContext.therapy:
        return 'Therapy';
      case TaskContext.community:
        return 'Community';
      case TaskContext.shared:
        return 'All Settings';
    }
  }
}

/// A shared action plan.
class ActionPlan {
  const ActionPlan({
    required this.id,
    required this.learnerId,
    required this.title,
    this.description,
    required this.status,
    this.startDate,
    this.targetEndDate,
    required this.focusAreas,
    this.tasks = const [],
    required this.taskCount,
    required this.noteCount,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String learnerId;
  final String title;
  final String? description;
  final ActionPlanStatus status;
  final DateTime? startDate;
  final DateTime? targetEndDate;
  final List<String> focusAreas;
  final List<ActionPlanTask> tasks;
  final int taskCount;
  final int noteCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory ActionPlan.fromJson(Map<String, dynamic> json) {
    return ActionPlan(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      status: _parseStatus(json['status'] as String),
      startDate: json['startDate'] != null ? DateTime.parse(json['startDate'] as String) : null,
      targetEndDate: json['targetEndDate'] != null
          ? DateTime.parse(json['targetEndDate'] as String)
          : null,
      focusAreas: (json['focusAreas'] as List?)?.cast<String>() ?? [],
      tasks: (json['tasks'] as List?)
              ?.map((t) => ActionPlanTask.fromJson(t as Map<String, dynamic>))
              .toList() ??
          [],
      taskCount: (json['_count'] as Map?)?['tasks'] as int? ?? 0,
      noteCount: (json['_count'] as Map?)?['notes'] as int? ?? 0,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static ActionPlanStatus _parseStatus(String status) {
    switch (status.toUpperCase()) {
      case 'DRAFT':
        return ActionPlanStatus.draft;
      case 'ACTIVE':
        return ActionPlanStatus.active;
      case 'ON_HOLD':
        return ActionPlanStatus.onHold;
      case 'COMPLETED':
        return ActionPlanStatus.completed;
      default:
        return ActionPlanStatus.draft;
    }
  }

  String get statusDisplayName {
    switch (status) {
      case ActionPlanStatus.draft:
        return 'Draft';
      case ActionPlanStatus.active:
        return 'Active';
      case ActionPlanStatus.onHold:
        return 'On Hold';
      case ActionPlanStatus.completed:
        return 'Completed';
      case ActionPlanStatus.archived:
        return 'Archived';
    }
  }

  /// Calculate task completion rate.
  double get completionRate {
    if (taskCount == 0) return 0.0;
    final completed = tasks.where((t) => !t.isActive).length;
    return completed / taskCount;
  }
}

/// A care note.
class CareNote {
  const CareNote({
    required this.id,
    required this.learnerId,
    required this.noteType,
    this.title,
    required this.content,
    required this.author,
    required this.tags,
    required this.isAcknowledged,
    required this.requiresFollowUp,
    required this.createdAt,
  });

  final String id;
  final String learnerId;
  final CareNoteType noteType;
  final String? title;
  final String content;
  final CareTeamMember author;
  final List<String> tags;
  final bool isAcknowledged;
  final bool requiresFollowUp;
  final DateTime createdAt;

  factory CareNote.fromJson(Map<String, dynamic> json) {
    return CareNote(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      noteType: _parseNoteType(json['noteType'] as String),
      title: json['title'] as String?,
      content: json['content'] as String,
      author: CareTeamMember.fromJson(json['author'] as Map<String, dynamic>),
      tags: (json['tags'] as List?)?.cast<String>() ?? [],
      isAcknowledged: json['isAcknowledged'] as bool? ?? false,
      requiresFollowUp: json['requiresFollowUp'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  static CareNoteType _parseNoteType(String type) {
    switch (type.toUpperCase()) {
      case 'OBSERVATION':
        return CareNoteType.observation;
      case 'PROGRESS_UPDATE':
        return CareNoteType.progressUpdate;
      case 'QUESTION':
        return CareNoteType.question;
      case 'HOME_UPDATE':
        return CareNoteType.homeUpdate;
      case 'SCHOOL_UPDATE':
        return CareNoteType.schoolUpdate;
      case 'CELEBRATION':
        return CareNoteType.celebration;
      default:
        return CareNoteType.observation;
    }
  }

  String get noteTypeDisplayName {
    switch (noteType) {
      case CareNoteType.observation:
        return 'Observation';
      case CareNoteType.progressUpdate:
        return 'Progress Update';
      case CareNoteType.question:
        return 'Question';
      case CareNoteType.homeUpdate:
        return 'Home Update';
      case CareNoteType.schoolUpdate:
        return 'School Update';
      case CareNoteType.therapyUpdate:
        return 'Therapy Update';
      case CareNoteType.meetingNotes:
        return 'Meeting Notes';
      case CareNoteType.strategyFeedback:
        return 'Strategy Feedback';
      case CareNoteType.celebration:
        return 'Celebration 🎉';
    }
  }
}

/// Meeting participant.
class MeetingParticipant {
  const MeetingParticipant({
    required this.id,
    required this.userId,
    required this.displayName,
    required this.role,
    required this.responseStatus,
  });

  final String id;
  final String userId;
  final String displayName;
  final CareTeamRole role;
  final ResponseStatus responseStatus;

  factory MeetingParticipant.fromJson(Map<String, dynamic> json) {
    return MeetingParticipant(
      id: json['id'] as String,
      userId: json['userId'] as String,
      displayName: json['displayName'] as String,
      role: CareTeamMember._parseRole(json['role'] as String),
      responseStatus: _parseResponseStatus(json['responseStatus'] as String? ?? 'PENDING'),
    );
  }

  static ResponseStatus _parseResponseStatus(String status) {
    switch (status.toUpperCase()) {
      case 'ACCEPTED':
        return ResponseStatus.accepted;
      case 'DECLINED':
        return ResponseStatus.declined;
      case 'TENTATIVE':
        return ResponseStatus.tentative;
      default:
        return ResponseStatus.pending;
    }
  }

  String get roleDisplayName {
    switch (role) {
      case CareTeamRole.parent:
        return 'Parent';
      case CareTeamRole.teacher:
        return 'Teacher';
      case CareTeamRole.therapist:
        return 'Therapist';
      default:
        return 'Team Member';
    }
  }
}

/// A care team meeting.
class CareMeeting {
  const CareMeeting({
    required this.id,
    required this.learnerId,
    this.learnerName,
    required this.title,
    this.description,
    required this.meetingType,
    required this.status,
    required this.scheduledAt,
    required this.durationMinutes,
    this.location,
    this.videoLink,
    this.participants = const [],
    required this.createdAt,
  });

  final String id;
  final String learnerId;
  final String? learnerName;
  final String title;
  final String? description;
  final MeetingType meetingType;
  final MeetingStatus status;
  final DateTime scheduledAt;
  final int durationMinutes;
  final String? location;
  final String? videoLink;
  final List<MeetingParticipant> participants;
  final DateTime createdAt;

  factory CareMeeting.fromJson(Map<String, dynamic> json) {
    return CareMeeting(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      learnerName: json['learnerName'] as String?,
      title: json['title'] as String,
      description: json['description'] as String?,
      meetingType: _parseMeetingType(json['meetingType'] as String),
      status: _parseMeetingStatus(json['status'] as String),
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
      durationMinutes: json['durationMinutes'] as int? ?? 30,
      location: json['location'] as String?,
      videoLink: json['videoLink'] as String?,
      participants: (json['participants'] as List?)
              ?.map((p) => MeetingParticipant.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  static MeetingType _parseMeetingType(String type) {
    switch (type.toUpperCase()) {
      case 'VIRTUAL':
        return MeetingType.virtual;
      case 'IN_PERSON':
        return MeetingType.inPerson;
      case 'PHONE':
        return MeetingType.phone;
      default:
        return MeetingType.hybrid;
    }
  }

  static MeetingStatus _parseMeetingStatus(String status) {
    switch (status.toUpperCase()) {
      case 'SCHEDULED':
        return MeetingStatus.scheduled;
      case 'IN_PROGRESS':
        return MeetingStatus.inProgress;
      case 'COMPLETED':
        return MeetingStatus.completed;
      default:
        return MeetingStatus.cancelled;
    }
  }

  String get meetingTypeDisplayName {
    switch (meetingType) {
      case MeetingType.virtual:
        return 'Virtual';
      case MeetingType.inPerson:
        return 'In-Person';
      case MeetingType.phone:
        return 'Phone';
      case MeetingType.hybrid:
        return 'Hybrid';
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER-SPECIFIC MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Summary of a learner's collaboration status for teacher dashboard.
class LearnerCollaborationSummary {
  const LearnerCollaborationSummary({
    required this.learnerId,
    required this.learnerName,
    required this.activePlanCount,
    required this.pendingTaskCount,
    required this.unreadNoteCount,
    required this.upcomingMeetingCount,
    this.lastNoteDate,
    this.nextMeetingDate,
  });

  final String learnerId;
  final String learnerName;
  final int activePlanCount;
  final int pendingTaskCount;
  final int unreadNoteCount;
  final int upcomingMeetingCount;
  final DateTime? lastNoteDate;
  final DateTime? nextMeetingDate;

  factory LearnerCollaborationSummary.fromJson(Map<String, dynamic> json) {
    return LearnerCollaborationSummary(
      learnerId: json['learnerId'] as String,
      learnerName: json['learnerName'] as String,
      activePlanCount: json['activePlanCount'] as int? ?? 0,
      pendingTaskCount: json['pendingTaskCount'] as int? ?? 0,
      unreadNoteCount: json['unreadNoteCount'] as int? ?? 0,
      upcomingMeetingCount: json['upcomingMeetingCount'] as int? ?? 0,
      lastNoteDate: json['lastNoteDate'] != null 
          ? DateTime.parse(json['lastNoteDate'] as String) 
          : null,
      nextMeetingDate: json['nextMeetingDate'] != null 
          ? DateTime.parse(json['nextMeetingDate'] as String) 
          : null,
    );
  }

  /// Does this learner need attention?
  bool get needsAttention => unreadNoteCount > 0 || pendingTaskCount > 2;
}

/// A classroom summary for teachers showing collaboration needs.
class ClassroomCollaborationSummary {
  const ClassroomCollaborationSummary({
    required this.classId,
    required this.className,
    required this.totalLearners,
    required this.learnersWithPlans,
    required this.pendingNotes,
    required this.upcomingMeetings,
    required this.learnerSummaries,
  });

  final String classId;
  final String className;
  final int totalLearners;
  final int learnersWithPlans;
  final int pendingNotes;
  final int upcomingMeetings;
  final List<LearnerCollaborationSummary> learnerSummaries;

  factory ClassroomCollaborationSummary.fromJson(Map<String, dynamic> json) {
    return ClassroomCollaborationSummary(
      classId: json['classId'] as String,
      className: json['className'] as String,
      totalLearners: json['totalLearners'] as int? ?? 0,
      learnersWithPlans: json['learnersWithPlans'] as int? ?? 0,
      pendingNotes: json['pendingNotes'] as int? ?? 0,
      upcomingMeetings: json['upcomingMeetings'] as int? ?? 0,
      learnerSummaries: (json['learnerSummaries'] as List?)
              ?.map((s) => LearnerCollaborationSummary.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

