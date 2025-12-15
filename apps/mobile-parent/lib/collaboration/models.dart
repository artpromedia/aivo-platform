/// Collaboration Models
///
/// Data models for care teams, action plans, notes, and meetings.
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

/// Task frequency.
enum TaskFrequency {
  daily,
  weekly,
  twiceWeekly,
  monthly,
  asNeeded,
}

/// Task completion status.
enum TaskCompletionStatus {
  notStarted,
  inProgress,
  completed,
  skipped,
  missed,
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

/// Note visibility.
enum NoteVisibility {
  team,
  parentsOnly,
  educatorsOnly,
  private_,
}

/// Meeting status.
enum MeetingStatus {
  scheduled,
  inProgress,
  completed,
  cancelled,
  rescheduled,
}

/// Meeting type.
enum MeetingType {
  virtual,
  inPerson,
  phone,
  hybrid,
  checkIn,
  iepMeeting,
  progressReview,
  strategySession,
  parentTeacher,
  teamMeeting,
  other,
}

/// Response status for meeting invitations.
enum ResponseStatus {
  pending,
  accepted,
  declined,
  tentative,
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARE TEAM MODELS
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
    this.leftAt,
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
  final DateTime? leftAt;

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
      leftAt: json['leftAt'] != null ? DateTime.parse(json['leftAt'] as String) : null,
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
      case 'DISTRICT_ADMIN':
        return CareTeamRole.districtAdmin;
      case 'CASE_MANAGER':
        return CareTeamRole.caseManager;
      case 'AIDE':
        return CareTeamRole.aide;
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

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION PLAN MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Task supports/accommodations.
class TaskSupports {
  const TaskSupports({
    this.visualSupport = false,
    this.timerNeeded = false,
    this.checklistSteps = const [],
    this.sensoryBreaks = false,
    this.movementBreaks = false,
    this.quietSpace = false,
    this.fidgetTool = false,
    this.socialStory = false,
    this.firstThenBoard = false,
    this.additionalNotes,
  });

  final bool visualSupport;
  final bool timerNeeded;
  final List<String> checklistSteps;
  final bool sensoryBreaks;
  final bool movementBreaks;
  final bool quietSpace;
  final bool fidgetTool;
  final bool socialStory;
  final bool firstThenBoard;
  final String? additionalNotes;

  factory TaskSupports.fromJson(Map<String, dynamic> json) {
    return TaskSupports(
      visualSupport: json['visualSupport'] as bool? ?? false,
      timerNeeded: json['timerNeeded'] as bool? ?? false,
      checklistSteps: (json['checklistSteps'] as List?)?.cast<String>() ?? [],
      sensoryBreaks: json['sensoryBreaks'] as bool? ?? false,
      movementBreaks: json['movementBreaks'] as bool? ?? false,
      quietSpace: json['quietSpace'] as bool? ?? false,
      fidgetTool: json['fidgetTool'] as bool? ?? false,
      socialStory: json['socialStory'] as bool? ?? false,
      firstThenBoard: json['firstThenBoard'] as bool? ?? false,
      additionalNotes: json['additionalNotes'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'visualSupport': visualSupport,
    'timerNeeded': timerNeeded,
    'checklistSteps': checklistSteps,
    'sensoryBreaks': sensoryBreaks,
    'movementBreaks': movementBreaks,
    'quietSpace': quietSpace,
    'fidgetTool': fidgetTool,
    'socialStory': socialStory,
    'firstThenBoard': firstThenBoard,
    if (additionalNotes != null) 'additionalNotes': additionalNotes,
  };

  List<String> get activeSupports {
    final supports = <String>[];
    if (visualSupport) supports.add('Visual Support');
    if (timerNeeded) supports.add('Timer');
    if (checklistSteps.isNotEmpty) supports.add('Checklist');
    if (sensoryBreaks) supports.add('Sensory Breaks');
    if (movementBreaks) supports.add('Movement Breaks');
    if (quietSpace) supports.add('Quiet Space');
    if (fidgetTool) supports.add('Fidget Tool');
    if (socialStory) supports.add('Social Story');
    if (firstThenBoard) supports.add('First/Then Board');
    return supports;
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
    required this.frequency,
    this.timeOfDay,
    required this.sortOrder,
    required this.isActive,
    this.assignee,
    required this.supports,
    this.successCriteria,
    this.implementationNotes,
    required this.completionCount,
  });

  final String id;
  final String actionPlanId;
  final String title;
  final String? description;
  final TaskContext context;
  final TaskFrequency frequency;
  final String? timeOfDay;
  final int sortOrder;
  final bool isActive;
  final CareTeamMember? assignee;
  final TaskSupports supports;
  final String? successCriteria;
  final String? implementationNotes;
  final int completionCount;

  factory ActionPlanTask.fromJson(Map<String, dynamic> json) {
    return ActionPlanTask(
      id: json['id'] as String,
      actionPlanId: json['actionPlanId'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      context: _parseTaskContext(json['context'] as String),
      frequency: _parseTaskFrequency(json['frequency'] as String),
      timeOfDay: json['timeOfDay'] as String?,
      sortOrder: json['sortOrder'] as int? ?? 0,
      isActive: json['isActive'] as bool? ?? true,
      assignee: json['assignee'] != null
          ? CareTeamMember.fromJson(json['assignee'] as Map<String, dynamic>)
          : null,
      supports: json['supports'] != null
          ? TaskSupports.fromJson(json['supports'] as Map<String, dynamic>)
          : const TaskSupports(),
      successCriteria: json['successCriteria'] as String?,
      implementationNotes: json['implementationNotes'] as String?,
      completionCount: (json['_count'] as Map?)?['completions'] as int? ?? 0,
    );
  }

  static TaskContext _parseTaskContext(String context) {
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

  static TaskFrequency _parseTaskFrequency(String frequency) {
    switch (frequency.toUpperCase()) {
      case 'DAILY':
        return TaskFrequency.daily;
      case 'WEEKLY':
        return TaskFrequency.weekly;
      case 'TWICE_WEEKLY':
        return TaskFrequency.twiceWeekly;
      case 'MONTHLY':
        return TaskFrequency.monthly;
      default:
        return TaskFrequency.asNeeded;
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

  String get frequencyDisplayName {
    switch (frequency) {
      case TaskFrequency.daily:
        return 'Daily';
      case TaskFrequency.weekly:
        return 'Weekly';
      case TaskFrequency.twiceWeekly:
        return 'Twice Weekly';
      case TaskFrequency.monthly:
        return 'Monthly';
      case TaskFrequency.asNeeded:
        return 'As Needed';
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
    this.linkedGoalId,
    this.linkedProfileId,
    required this.focusAreas,
    this.createdBy,
    this.tasks = const [],
    required this.taskCount,
    required this.noteCount,
    required this.meetingCount,
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
  final String? linkedGoalId;
  final String? linkedProfileId;
  final List<String> focusAreas;
  final CareTeamMember? createdBy;
  final List<ActionPlanTask> tasks;
  final int taskCount;
  final int noteCount;
  final int meetingCount;
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
      linkedGoalId: json['linkedGoalId'] as String?,
      linkedProfileId: json['linkedProfileId'] as String?,
      focusAreas: (json['focusAreas'] as List?)?.cast<String>() ?? [],
      createdBy: json['createdBy'] != null
          ? CareTeamMember.fromJson(json['createdBy'] as Map<String, dynamic>)
          : null,
      tasks: (json['tasks'] as List?)
              ?.map((t) => ActionPlanTask.fromJson(t as Map<String, dynamic>))
              .toList() ??
          [],
      taskCount: (json['_count'] as Map?)?['tasks'] as int? ?? 0,
      noteCount: (json['_count'] as Map?)?['notes'] as int? ?? 0,
      meetingCount: (json['_count'] as Map?)?['meetings'] as int? ?? 0,
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
      case 'ARCHIVED':
        return ActionPlanStatus.archived;
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARE NOTE MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// A care note/observation.
class CareNote {
  const CareNote({
    required this.id,
    required this.learnerId,
    required this.noteType,
    this.title,
    required this.content,
    required this.visibility,
    required this.author,
    this.actionPlan,
    this.meeting,
    required this.tags,
    required this.isAcknowledged,
    required this.acknowledgedBy,
    required this.requiresFollowUp,
    this.followUpNotes,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String learnerId;
  final CareNoteType noteType;
  final String? title;
  final String content;
  final NoteVisibility visibility;
  final CareTeamMember author;
  final ActionPlan? actionPlan;
  final CareMeeting? meeting;
  final List<String> tags;
  final bool isAcknowledged;
  final List<String> acknowledgedBy;
  final bool requiresFollowUp;
  final String? followUpNotes;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory CareNote.fromJson(Map<String, dynamic> json) {
    return CareNote(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      noteType: _parseNoteType(json['noteType'] as String),
      title: json['title'] as String?,
      content: json['content'] as String,
      visibility: _parseVisibility(json['visibility'] as String),
      author: CareTeamMember.fromJson(json['author'] as Map<String, dynamic>),
      actionPlan: json['actionPlan'] != null
          ? ActionPlan.fromJson(json['actionPlan'] as Map<String, dynamic>)
          : null,
      meeting: json['meeting'] != null
          ? CareMeeting.fromJson(json['meeting'] as Map<String, dynamic>)
          : null,
      tags: (json['tags'] as List?)?.cast<String>() ?? [],
      isAcknowledged: json['isAcknowledged'] as bool? ?? false,
      acknowledgedBy: (json['acknowledgedBy'] as List?)?.cast<String>() ?? [],
      requiresFollowUp: json['requiresFollowUp'] as bool? ?? false,
      followUpNotes: json['followUpNotes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
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
      case 'THERAPY_UPDATE':
        return CareNoteType.therapyUpdate;
      case 'MEETING_NOTES':
        return CareNoteType.meetingNotes;
      case 'STRATEGY_FEEDBACK':
        return CareNoteType.strategyFeedback;
      case 'CELEBRATION':
        return CareNoteType.celebration;
      default:
        return CareNoteType.observation;
    }
  }

  static NoteVisibility _parseVisibility(String visibility) {
    switch (visibility.toUpperCase()) {
      case 'TEAM':
        return NoteVisibility.team;
      case 'PARENTS_ONLY':
        return NoteVisibility.parentsOnly;
      case 'EDUCATORS_ONLY':
        return NoteVisibility.educatorsOnly;
      case 'PRIVATE':
        return NoteVisibility.private_;
      default:
        return NoteVisibility.team;
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

// ═══════════════════════════════════════════════════════════════════════════════
// MEETING MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// A meeting participant.
class MeetingParticipant {
  const MeetingParticipant({
    required this.id,
    required this.userId,
    required this.displayName,
    required this.role,
    required this.responseStatus,
    this.attended,
    this.participantNotes,
  });

  final String id;
  final String userId;
  final String displayName;
  final CareTeamRole role;
  final ResponseStatus responseStatus;
  final bool? attended;
  final String? participantNotes;

  factory MeetingParticipant.fromJson(Map<String, dynamic> json) {
    // Handle both direct fields and nested careTeamMember
    if (json.containsKey('careTeamMember')) {
      final member = json['careTeamMember'] as Map<String, dynamic>;
      return MeetingParticipant(
        id: json['id'] as String,
        userId: member['userId'] as String,
        displayName: member['displayName'] as String,
        role: CareTeamMember._parseRole(member['role'] as String),
        responseStatus: _parseResponseStatus(json['rsvpStatus'] as String? ?? 'PENDING'),
        attended: json['attended'] as bool?,
        participantNotes: json['participantNotes'] as String?,
      );
    }
    return MeetingParticipant(
      id: json['id'] as String,
      userId: json['userId'] as String,
      displayName: json['displayName'] as String,
      role: CareTeamMember._parseRole(json['role'] as String),
      responseStatus: _parseResponseStatus(json['responseStatus'] as String? ?? 'PENDING'),
      attended: json['attended'] as bool?,
      participantNotes: json['participantNotes'] as String?,
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

/// A care team meeting.
class CareMeeting {
  const CareMeeting({
    required this.id,
    required this.learnerId,
    required this.title,
    this.description,
    required this.meetingType,
    required this.status,
    required this.scheduledAt,
    required this.durationMinutes,
    this.location,
    this.videoLink,
    this.actionPlan,
    this.summary,
    this.agenda,
    this.participants = const [],
    required this.noteCount,
    required this.createdAt,
  });

  final String id;
  final String learnerId;
  final String title;
  final String? description;
  final MeetingType meetingType;
  final MeetingStatus status;
  final DateTime scheduledAt;
  final int durationMinutes;
  final String? location;
  final String? videoLink;
  final ActionPlan? actionPlan;
  final String? summary;
  final List<String>? agenda;
  final List<MeetingParticipant> participants;
  final int noteCount;
  final DateTime createdAt;

  factory CareMeeting.fromJson(Map<String, dynamic> json) {
    // Handle both scheduledAt and scheduledStart for backward compat
    DateTime parseScheduledTime() {
      if (json['scheduledAt'] != null) {
        return DateTime.parse(json['scheduledAt'] as String);
      }
      return DateTime.parse(json['scheduledStart'] as String);
    }

    // Calculate duration from start/end or use durationMinutes
    int parseDuration() {
      if (json['durationMinutes'] != null) {
        return json['durationMinutes'] as int;
      }
      if (json['scheduledStart'] != null && json['scheduledEnd'] != null) {
        final start = DateTime.parse(json['scheduledStart'] as String);
        final end = DateTime.parse(json['scheduledEnd'] as String);
        return end.difference(start).inMinutes;
      }
      return 30; // default
    }

    return CareMeeting(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      meetingType: _parseMeetingType(json['meetingType'] as String),
      status: _parseMeetingStatus(json['status'] as String),
      scheduledAt: parseScheduledTime(),
      durationMinutes: parseDuration(),
      location: json['location'] as String?,
      videoLink: json['videoLink'] as String?,
      actionPlan: json['actionPlan'] != null
          ? ActionPlan.fromJson(json['actionPlan'] as Map<String, dynamic>)
          : null,
      summary: json['summary'] as String?,
      agenda: (json['agenda'] as List?)?.cast<String>(),
      participants: (json['participants'] as List?)
              ?.map((p) => MeetingParticipant.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      noteCount: (json['_count'] as Map?)?['notes'] as int? ?? 0,
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
      case 'HYBRID':
        return MeetingType.hybrid;
      case 'CHECK_IN':
        return MeetingType.checkIn;
      case 'IEP_MEETING':
        return MeetingType.iepMeeting;
      case 'PROGRESS_REVIEW':
        return MeetingType.progressReview;
      case 'STRATEGY_SESSION':
        return MeetingType.strategySession;
      case 'PARENT_TEACHER':
        return MeetingType.parentTeacher;
      case 'TEAM_MEETING':
        return MeetingType.teamMeeting;
      default:
        return MeetingType.other;
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
      case 'CANCELLED':
        return MeetingStatus.cancelled;
      case 'RESCHEDULED':
        return MeetingStatus.rescheduled;
      default:
        return MeetingStatus.scheduled;
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
      case MeetingType.checkIn:
        return 'Check-in';
      case MeetingType.iepMeeting:
        return 'IEP Meeting';
      case MeetingType.progressReview:
        return 'Progress Review';
      case MeetingType.strategySession:
        return 'Strategy Session';
      case MeetingType.parentTeacher:
        return 'Parent-Teacher Conference';
      case MeetingType.teamMeeting:
        return 'Team Meeting';
      case MeetingType.other:
        return 'Meeting';
    }
  }

  String get statusDisplayName {
    switch (status) {
      case MeetingStatus.scheduled:
        return 'Scheduled';
      case MeetingStatus.inProgress:
        return 'In Progress';
      case MeetingStatus.completed:
        return 'Completed';
      case MeetingStatus.cancelled:
        return 'Cancelled';
      case MeetingStatus.rescheduled:
        return 'Rescheduled';
    }
  }
}
