/// Collaboration Service for Teachers
///
/// API client for teacher-focused collaboration features.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';
import 'models.dart';

const _baseUrl = String.fromEnvironment(
  'COLLABORATION_BASE_URL',
  defaultValue: 'http://localhost:3020',
);

const _useMock = bool.fromEnvironment('USE_COLLABORATION_MOCK', defaultValue: false);

/// Log warning when mock data is used in non-debug mode
void _logMockWarning() {
  assert(() {
    // ignore: avoid_print
    print('⚠️ WARNING: Collaboration service is using mock data.');
    return true;
  }());
}

/// Service for teacher collaboration APIs.
class TeacherCollaborationService {
  TeacherCollaborationService({AivoApiClient? apiClient})
      : _apiClient = apiClient ?? AivoApiClient.instance;

  final AivoApiClient _apiClient;

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSROOM SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get collaboration summary for a classroom.
  Future<ClassroomCollaborationSummary> getClassroomSummary(String classId) async {
    if (_useMock) {
      _logMockWarning();
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockClassroomSummary(classId);
    }

    final response = await _apiClient.get('$_baseUrl/api/v1/classes/$classId/collaboration-summary');
    return ClassroomCollaborationSummary.fromJson(
        (response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>);
  }

  ClassroomCollaborationSummary _mockClassroomSummary(String classId) {
    return ClassroomCollaborationSummary(
      classId: classId,
      className: '3rd Grade - Room 204',
      totalLearners: 24,
      learnersWithPlans: 6,
      pendingNotes: 3,
      upcomingMeetings: 2,
      learnerSummaries: [
        LearnerCollaborationSummary(
          learnerId: 'learner-1',
          learnerName: 'Alex M.',
          activePlanCount: 2,
          pendingTaskCount: 3,
          unreadNoteCount: 1,
          upcomingMeetingCount: 1,
          lastNoteDate: DateTime.now().subtract(const Duration(hours: 6)),
          nextMeetingDate: DateTime.now().add(const Duration(days: 5)),
        ),
        LearnerCollaborationSummary(
          learnerId: 'learner-2',
          learnerName: 'Jordan S.',
          activePlanCount: 1,
          pendingTaskCount: 1,
          unreadNoteCount: 2,
          upcomingMeetingCount: 0,
          lastNoteDate: DateTime.now().subtract(const Duration(days: 2)),
        ),
        LearnerCollaborationSummary(
          learnerId: 'learner-3',
          learnerName: 'Sam T.',
          activePlanCount: 1,
          pendingTaskCount: 0,
          unreadNoteCount: 0,
          upcomingMeetingCount: 1,
          nextMeetingDate: DateTime.now().add(const Duration(days: 3)),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CARE TEAM
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get care team members for a learner.
  Future<List<CareTeamMember>> getCareTeam(String learnerId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockCareTeam(learnerId);
    }

    final response = await _apiClient.get('$_baseUrl/api/v1/learners/$learnerId/care-team');
    final data = (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map((json) => CareTeamMember.fromJson(json))
        .toList();
  }

  List<CareTeamMember> _mockCareTeam(String learnerId) {
    return [
      CareTeamMember(
        id: 'ctm-1',
        userId: 'user-1',
        displayName: 'Sarah Johnson',
        role: CareTeamRole.parent,
        contactEmail: 'sarah@example.com',
        contactPhone: '555-0101',
        isActive: true,
        joinedAt: DateTime.now().subtract(const Duration(days: 365)),
      ),
      CareTeamMember(
        id: 'ctm-3',
        userId: 'user-3',
        displayName: 'Dr. Martinez',
        role: CareTeamRole.therapist,
        title: 'Occupational Therapist',
        contactEmail: 'martinez@therapy.com',
        isActive: true,
        joinedAt: DateTime.now().subtract(const Duration(days: 90)),
      ),
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION PLANS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get action plans for a learner.
  Future<List<ActionPlan>> getActionPlans(String learnerId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockActionPlans(learnerId);
    }

    final response = await _apiClient.get('$_baseUrl/api/v1/learners/$learnerId/action-plans');
    final data = (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map((json) => ActionPlan.fromJson(json))
        .toList();
  }

  /// Get school-context tasks for a learner.
  Future<List<ActionPlanTask>> getSchoolTasks(String learnerId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return _mockSchoolTasks(learnerId);
    }

    final response = await _apiClient.get(
        '$_baseUrl/api/v1/learners/$learnerId/action-plans/tasks?context=SCHOOL');
    final data = (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map((json) => ActionPlanTask.fromJson(json))
        .toList();
  }

  List<ActionPlan> _mockActionPlans(String learnerId) {
    return [
      ActionPlan(
        id: 'plan-1',
        learnerId: learnerId,
        title: 'Morning Routine Success',
        description: 'Strategies for morning transitions.',
        status: ActionPlanStatus.active,
        startDate: DateTime.now().subtract(const Duration(days: 30)),
        targetEndDate: DateTime.now().add(const Duration(days: 60)),
        focusAreas: ['executive-function', 'transitions'],
        taskCount: 5,
        noteCount: 3,
        createdAt: DateTime.now().subtract(const Duration(days: 30)),
        updatedAt: DateTime.now().subtract(const Duration(days: 2)),
      ),
      ActionPlan(
        id: 'plan-2',
        learnerId: learnerId,
        title: 'Handwriting & Fine Motor',
        description: 'Building handwriting skills.',
        status: ActionPlanStatus.active,
        startDate: DateTime.now().subtract(const Duration(days: 14)),
        targetEndDate: DateTime.now().add(const Duration(days: 90)),
        focusAreas: ['fine-motor'],
        taskCount: 3,
        noteCount: 2,
        createdAt: DateTime.now().subtract(const Duration(days: 14)),
        updatedAt: DateTime.now().subtract(const Duration(days: 1)),
      ),
    ];
  }

  List<ActionPlanTask> _mockSchoolTasks(String learnerId) {
    return [
      ActionPlanTask(
        id: 'task-3',
        actionPlanId: 'plan-1',
        title: 'Classroom Entry Routine',
        description: 'Consistent routine for entering classroom.',
        context: TaskContext.school,
        timeOfDay: 'Arrival',
        isActive: true,
        completionCount: 20,
      ),
      ActionPlanTask(
        id: 'task-4',
        actionPlanId: 'plan-2',
        title: 'Pencil Grip Practice',
        description: 'Use adaptive pencil grip during writing.',
        context: TaskContext.school,
        timeOfDay: 'Morning',
        isActive: true,
        completionCount: 12,
      ),
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CARE NOTES
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get care notes for a learner.
  Future<List<CareNote>> getCareNotes(String learnerId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockCareNotes(learnerId);
    }

    final response = await _apiClient.get('$_baseUrl/api/v1/learners/$learnerId/notes');
    final data = (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map((json) => CareNote.fromJson(json))
        .toList();
  }

  /// Create a care note from teacher.
  Future<CareNote> createCareNote({
    required String learnerId,
    required CareNoteType noteType,
    String? title,
    required String content,
    List<String> tags = const [],
    bool requiresFollowUp = false,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockCareNotes(learnerId).first;
    }

    final response = await _apiClient.post(
      '$_baseUrl/api/v1/learners/$learnerId/notes',
      data: {
        'noteType': noteType.name.toUpperCase(),
        if (title != null) 'title': title,
        'content': content,
        'tags': tags,
        'requiresFollowUp': requiresFollowUp,
      },
    );
    return CareNote.fromJson(
        (response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>);
  }

  /// Acknowledge a care note.
  Future<void> acknowledgeCareNote(String learnerId, String noteId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return;
    }

    await _apiClient.post(
      '$_baseUrl/api/v1/learners/$learnerId/notes/$noteId/acknowledge',
      data: {'acknowledge': true},
    );
  }

  List<CareNote> _mockCareNotes(String learnerId) {
    return [
      CareNote(
        id: 'note-1',
        learnerId: learnerId,
        noteType: CareNoteType.celebration,
        title: 'Great morning today!',
        content: 'Alex completed the morning routine independently!',
        author: CareTeamMember(
          id: 'ctm-1',
          userId: 'user-1',
          displayName: 'Sarah Johnson',
          role: CareTeamRole.parent,
          isActive: true,
          joinedAt: DateTime.now().subtract(const Duration(days: 365)),
        ),
        tags: ['morning-routine', 'independence'],
        isAcknowledged: false,
        requiresFollowUp: false,
        createdAt: DateTime.now().subtract(const Duration(hours: 6)),
      ),
      CareNote(
        id: 'note-3',
        learnerId: learnerId,
        noteType: CareNoteType.question,
        title: 'Timer preferences?',
        content: 'Alex responds better to visual timers. Same at home?',
        author: CareTeamMember(
          id: 'ctm-3',
          userId: 'user-3',
          displayName: 'Dr. Martinez',
          role: CareTeamRole.therapist,
          title: 'Occupational Therapist',
          isActive: true,
          joinedAt: DateTime.now().subtract(const Duration(days: 90)),
        ),
        tags: ['timer', 'question'],
        isAcknowledged: false,
        requiresFollowUp: true,
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
      ),
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEETINGS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get upcoming meetings for teacher.
  Future<List<CareMeeting>> getUpcomingMeetings() async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockMeetings();
    }

    final response = await _apiClient.get('$_baseUrl/api/v1/teacher/meetings?status=SCHEDULED');
    final data = (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map((json) => CareMeeting.fromJson(json))
        .toList();
  }

  /// Get meetings for a specific learner.
  Future<List<CareMeeting>> getLearnerMeetings(String learnerId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockMeetings().where((m) => m.learnerId == learnerId).toList();
    }

    final response = await _apiClient.get('$_baseUrl/api/v1/learners/$learnerId/meetings');
    final data = (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map((json) => CareMeeting.fromJson(json))
        .toList();
  }

  List<CareMeeting> _mockMeetings() {
    return [
      CareMeeting(
        id: 'meeting-1',
        learnerId: 'learner-1',
        learnerName: 'Alex M.',
        title: 'Monthly Progress Check-In',
        description: 'Review progress on action plans.',
        meetingType: MeetingType.virtual,
        status: MeetingStatus.scheduled,
        scheduledAt: DateTime.now().add(const Duration(days: 5, hours: 14)),
        durationMinutes: 60,
        videoLink: 'https://zoom.us/j/123456789',
        participants: [
          MeetingParticipant(
            id: 'mp-1',
            userId: 'user-1',
            displayName: 'Sarah Johnson',
            role: CareTeamRole.parent,
            responseStatus: ResponseStatus.accepted,
          ),
        ],
        createdAt: DateTime.now().subtract(const Duration(days: 7)),
      ),
      CareMeeting(
        id: 'meeting-2',
        learnerId: 'learner-3',
        learnerName: 'Sam T.',
        title: 'IEP Review',
        description: 'Quarterly IEP progress review.',
        meetingType: MeetingType.inPerson,
        status: MeetingStatus.scheduled,
        scheduledAt: DateTime.now().add(const Duration(days: 3, hours: 10)),
        durationMinutes: 90,
        location: 'Conference Room B',
        participants: [],
        createdAt: DateTime.now().subtract(const Duration(days: 3)),
      ),
    ];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for TeacherCollaborationService.
final teacherCollaborationServiceProvider = Provider<TeacherCollaborationService>((ref) {
  return TeacherCollaborationService();
});

/// Provider for classroom collaboration summary.
final classroomCollaborationProvider =
    FutureProvider.family<ClassroomCollaborationSummary, String>(
  (ref, classId) async {
    final service = ref.read(teacherCollaborationServiceProvider);
    return service.getClassroomSummary(classId);
  },
);

/// Provider for learner care team.
final learnerCareTeamProvider = FutureProvider.family<List<CareTeamMember>, String>(
  (ref, learnerId) async {
    final service = ref.read(teacherCollaborationServiceProvider);
    return service.getCareTeam(learnerId);
  },
);

/// Provider for learner action plans.
final learnerActionPlansProvider = FutureProvider.family<List<ActionPlan>, String>(
  (ref, learnerId) async {
    final service = ref.read(teacherCollaborationServiceProvider);
    return service.getActionPlans(learnerId);
  },
);

/// Provider for learner school tasks.
final learnerSchoolTasksProvider = FutureProvider.family<List<ActionPlanTask>, String>(
  (ref, learnerId) async {
    final service = ref.read(teacherCollaborationServiceProvider);
    return service.getSchoolTasks(learnerId);
  },
);

/// Provider for learner care notes.
final learnerCareNotesProvider = FutureProvider.family<List<CareNote>, String>(
  (ref, learnerId) async {
    final service = ref.read(teacherCollaborationServiceProvider);
    return service.getCareNotes(learnerId);
  },
);

/// Provider for teacher's upcoming meetings.
final teacherUpcomingMeetingsProvider = FutureProvider<List<CareMeeting>>(
  (ref) async {
    final service = ref.read(teacherCollaborationServiceProvider);
    return service.getUpcomingMeetings();
  },
);

/// Provider for learner meetings.
final learnerMeetingsProvider = FutureProvider.family<List<CareMeeting>, String>(
  (ref, learnerId) async {
    final service = ref.read(teacherCollaborationServiceProvider);
    return service.getLearnerMeetings(learnerId);
  },
);
