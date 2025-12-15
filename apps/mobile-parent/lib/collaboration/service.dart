/// Collaboration Service
///
/// API client for care teams, action plans, notes, and meetings.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';
import 'models.dart';

const _baseUrl = String.fromEnvironment(
  'COLLABORATION_BASE_URL',
  defaultValue: 'http://localhost:3020',
);

const _useMock = bool.fromEnvironment('USE_COLLABORATION_MOCK', defaultValue: true);

/// Service for interacting with Collaboration APIs.
class CollaborationService {
  CollaborationService({AivoApiClient? apiClient})
      : _apiClient = apiClient ?? AivoApiClient.instance;

  final AivoApiClient _apiClient;

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
        title: null,
        contactEmail: 'sarah@example.com',
        contactPhone: '555-0101',
        isActive: true,
        joinedAt: DateTime.now().subtract(const Duration(days: 365)),
      ),
      CareTeamMember(
        id: 'ctm-2',
        userId: 'user-2',
        displayName: 'Ms. Anderson',
        role: CareTeamRole.teacher,
        title: '3rd Grade Teacher',
        contactEmail: 'anderson@school.edu',
        contactPhone: null,
        isActive: true,
        joinedAt: DateTime.now().subtract(const Duration(days: 180)),
      ),
      CareTeamMember(
        id: 'ctm-3',
        userId: 'user-3',
        displayName: 'Dr. Martinez',
        role: CareTeamRole.therapist,
        title: 'Occupational Therapist',
        contactEmail: 'martinez@therapy.com',
        contactPhone: '555-0202',
        isActive: true,
        joinedAt: DateTime.now().subtract(const Duration(days: 90)),
      ),
      CareTeamMember(
        id: 'ctm-4',
        userId: 'user-4',
        displayName: 'Mr. Williams',
        role: CareTeamRole.specialist,
        title: 'Resource Room Teacher',
        contactEmail: 'williams@school.edu',
        contactPhone: null,
        isActive: true,
        joinedAt: DateTime.now().subtract(const Duration(days: 120)),
      ),
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION PLANS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get action plans for a learner.
  Future<List<ActionPlan>> getActionPlans(String learnerId, {ActionPlanStatus? status}) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockActionPlans(learnerId, status: status);
    }

    final queryParams = status != null ? '?status=${status.name.toUpperCase()}' : '';
    final response =
        await _apiClient.get('$_baseUrl/api/v1/learners/$learnerId/action-plans$queryParams');
    final data = (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map((json) => ActionPlan.fromJson(json))
        .toList();
  }

  /// Get a specific action plan with tasks.
  Future<ActionPlan> getActionPlan(String learnerId, String planId) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return _mockActionPlanDetail(learnerId, planId);
    }

    final response =
        await _apiClient.get('$_baseUrl/api/v1/learners/$learnerId/action-plans/$planId');
    return ActionPlan.fromJson((response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>);
  }

  List<ActionPlan> _mockActionPlans(String learnerId, {ActionPlanStatus? status}) {
    final plans = [
      ActionPlan(
        id: 'plan-1',
        learnerId: learnerId,
        title: 'Morning Routine Success',
        description: 'Strategies to help with morning transitions and getting ready for school.',
        status: ActionPlanStatus.active,
        startDate: DateTime.now().subtract(const Duration(days: 30)),
        targetEndDate: DateTime.now().add(const Duration(days: 60)),
        focusAreas: ['executive-function', 'self-regulation', 'transitions'],
        createdBy: CareTeamMember(
          id: 'ctm-2',
          userId: 'user-2',
          displayName: 'Ms. Anderson',
          role: CareTeamRole.teacher,
          title: '3rd Grade Teacher',
          isActive: true,
          joinedAt: DateTime.now().subtract(const Duration(days: 180)),
        ),
        taskCount: 5,
        noteCount: 3,
        meetingCount: 1,
        createdAt: DateTime.now().subtract(const Duration(days: 30)),
        updatedAt: DateTime.now().subtract(const Duration(days: 2)),
      ),
      ActionPlan(
        id: 'plan-2',
        learnerId: learnerId,
        title: 'Handwriting & Fine Motor',
        description: 'Building confidence and skills in handwriting activities.',
        status: ActionPlanStatus.active,
        startDate: DateTime.now().subtract(const Duration(days: 14)),
        targetEndDate: DateTime.now().add(const Duration(days: 90)),
        focusAreas: ['fine-motor', 'occupational-therapy'],
        taskCount: 3,
        noteCount: 2,
        meetingCount: 0,
        createdAt: DateTime.now().subtract(const Duration(days: 14)),
        updatedAt: DateTime.now().subtract(const Duration(days: 1)),
      ),
    ];

    if (status != null) {
      return plans.where((p) => p.status == status).toList();
    }
    return plans;
  }

  ActionPlan _mockActionPlanDetail(String learnerId, String planId) {
    return ActionPlan(
      id: planId,
      learnerId: learnerId,
      title: 'Morning Routine Success',
      description: 'Strategies to help with morning transitions and getting ready for school.',
      status: ActionPlanStatus.active,
      startDate: DateTime.now().subtract(const Duration(days: 30)),
      targetEndDate: DateTime.now().add(const Duration(days: 60)),
      focusAreas: ['executive-function', 'self-regulation', 'transitions'],
      createdBy: CareTeamMember(
        id: 'ctm-2',
        userId: 'user-2',
        displayName: 'Ms. Anderson',
        role: CareTeamRole.teacher,
        title: '3rd Grade Teacher',
        isActive: true,
        joinedAt: DateTime.now().subtract(const Duration(days: 180)),
      ),
      tasks: [
        ActionPlanTask(
          id: 'task-1',
          actionPlanId: planId,
          title: 'Visual Schedule Check',
          description: 'Review the morning visual schedule together before starting tasks.',
          context: TaskContext.home,
          frequency: TaskFrequency.daily,
          timeOfDay: 'Morning',
          sortOrder: 1,
          isActive: true,
          supports: const TaskSupports(
            visualSupport: true,
            checklistSteps: [
              'Look at the schedule',
              'Point to first task',
              'Complete each step',
              'Move the marker',
            ],
          ),
          successCriteria: 'Completes 3+ steps independently',
          completionCount: 18,
        ),
        ActionPlanTask(
          id: 'task-2',
          actionPlanId: planId,
          title: 'Timer for Transitions',
          description: 'Use a visual timer for each transition between tasks.',
          context: TaskContext.home,
          frequency: TaskFrequency.daily,
          timeOfDay: 'Morning',
          sortOrder: 2,
          isActive: true,
          supports: const TaskSupports(
            timerNeeded: true,
            sensoryBreaks: true,
            additionalNotes: '5-minute timer works best. Allow a 1-minute warning.',
          ),
          completionCount: 15,
        ),
        ActionPlanTask(
          id: 'task-3',
          actionPlanId: planId,
          title: 'Classroom Entry Routine',
          description: 'Consistent routine for entering the classroom each morning.',
          context: TaskContext.school,
          frequency: TaskFrequency.daily,
          timeOfDay: 'Arrival',
          sortOrder: 3,
          isActive: true,
          assignee: CareTeamMember(
            id: 'ctm-2',
            userId: 'user-2',
            displayName: 'Ms. Anderson',
            role: CareTeamRole.teacher,
            title: '3rd Grade Teacher',
            isActive: true,
            joinedAt: DateTime.now().subtract(const Duration(days: 180)),
          ),
          supports: const TaskSupports(
            firstThenBoard: true,
            quietSpace: true,
          ),
          successCriteria: 'Settles into seat within 5 minutes',
          completionCount: 20,
        ),
      ],
      taskCount: 5,
      noteCount: 3,
      meetingCount: 1,
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
      updatedAt: DateTime.now().subtract(const Duration(days: 2)),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK COMPLETIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Record a task completion.
  Future<void> recordTaskCompletion({
    required String learnerId,
    required String planId,
    required String taskId,
    required TaskCompletionStatus status,
    String? notes,
    TaskContext? completedInContext,
    int? effectivenessRating,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return;
    }

    await _apiClient.post(
      '$_baseUrl/api/v1/learners/$learnerId/action-plans/$planId/tasks/$taskId/completions',
      data: {
        'dueDate': DateTime.now().toIso8601String(),
        'completedAt': DateTime.now().toIso8601String(),
        'status': status.name.toUpperCase(),
        if (notes != null) 'notes': notes,
        if (completedInContext != null) 'completedInContext': completedInContext.name.toUpperCase(),
        if (effectivenessRating != null) 'effectivenessRating': effectivenessRating,
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CARE NOTES
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get care notes for a learner.
  Future<List<CareNote>> getCareNotes(String learnerId, {String? actionPlanId}) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockCareNotes(learnerId);
    }

    final queryParams = actionPlanId != null ? '?actionPlanId=$actionPlanId' : '';
    final response = await _apiClient.get('$_baseUrl/api/v1/learners/$learnerId/notes$queryParams');
    final data = (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data.whereType<Map<String, dynamic>>().map((json) => CareNote.fromJson(json)).toList();
  }

  /// Create a care note.
  Future<CareNote> createCareNote({
    required String learnerId,
    required CareNoteType noteType,
    String? title,
    required String content,
    NoteVisibility visibility = NoteVisibility.team,
    String? actionPlanId,
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
        'visibility': visibility.name.toUpperCase(),
        if (actionPlanId != null) 'actionPlanId': actionPlanId,
        'tags': tags,
        'requiresFollowUp': requiresFollowUp,
      },
    );
    return CareNote.fromJson((response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>);
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
        content:
            'Alex completed the entire morning routine independently today using the visual schedule! This is the third day in a row with smooth transitions.',
        visibility: NoteVisibility.team,
        author: CareTeamMember(
          id: 'ctm-1',
          userId: 'user-1',
          displayName: 'Sarah Johnson',
          role: CareTeamRole.parent,
          isActive: true,
          joinedAt: DateTime.now().subtract(const Duration(days: 365)),
        ),
        tags: ['morning-routine', 'independence', 'visual-schedule'],
        isAcknowledged: true,
        acknowledgedBy: ['user-2'],
        requiresFollowUp: false,
        createdAt: DateTime.now().subtract(const Duration(hours: 6)),
        updatedAt: DateTime.now().subtract(const Duration(hours: 6)),
      ),
      CareNote(
        id: 'note-2',
        learnerId: learnerId,
        noteType: CareNoteType.schoolUpdate,
        title: 'Classroom observation',
        content:
            'Alex showed great focus during independent reading time today. The quiet corner we set up is being used appropriately.',
        visibility: NoteVisibility.team,
        author: CareTeamMember(
          id: 'ctm-2',
          userId: 'user-2',
          displayName: 'Ms. Anderson',
          role: CareTeamRole.teacher,
          title: '3rd Grade Teacher',
          isActive: true,
          joinedAt: DateTime.now().subtract(const Duration(days: 180)),
        ),
        tags: ['focus', 'reading', 'sensory-space'],
        isAcknowledged: false,
        acknowledgedBy: [],
        requiresFollowUp: false,
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
        updatedAt: DateTime.now().subtract(const Duration(days: 1)),
      ),
      CareNote(
        id: 'note-3',
        learnerId: learnerId,
        noteType: CareNoteType.question,
        title: 'Timer preferences?',
        content:
            'I noticed Alex responds better to the visual timer than the audio one. Have you noticed the same at home? Should we update the action plan to specify visual timers only?',
        visibility: NoteVisibility.team,
        author: CareTeamMember(
          id: 'ctm-3',
          userId: 'user-3',
          displayName: 'Dr. Martinez',
          role: CareTeamRole.therapist,
          title: 'Occupational Therapist',
          isActive: true,
          joinedAt: DateTime.now().subtract(const Duration(days: 90)),
        ),
        tags: ['timer', 'sensory', 'question'],
        isAcknowledged: false,
        acknowledgedBy: [],
        requiresFollowUp: true,
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
        updatedAt: DateTime.now().subtract(const Duration(days: 2)),
      ),
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEETINGS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get meetings for a learner.
  Future<List<CareMeeting>> getMeetings(String learnerId, {MeetingStatus? status}) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockMeetings(learnerId);
    }

    final queryParams = status != null ? '?status=${status.name.toUpperCase()}' : '';
    final response =
        await _apiClient.get('$_baseUrl/api/v1/learners/$learnerId/meetings$queryParams');
    final data = (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
    return data
        .whereType<Map<String, dynamic>>()
        .map((json) => CareMeeting.fromJson(json))
        .toList();
  }

  /// Schedule a new meeting.
  Future<CareMeeting> scheduleMeeting({
    required String learnerId,
    required String title,
    required DateTime scheduledAt,
    required int durationMinutes,
    required MeetingType meetingType,
    String? description,
    String? location,
    String? videoLink,
    List<String>? agenda,
    List<String>? participantIds,
  }) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockMeetings(learnerId).first;
    }

    final response = await _apiClient.post(
      '$_baseUrl/api/v1/learners/$learnerId/meetings',
      data: {
        'title': title,
        'scheduledAt': scheduledAt.toIso8601String(),
        'durationMinutes': durationMinutes,
        'meetingType': meetingType.name.toUpperCase(),
        if (description != null) 'description': description,
        if (location != null) 'location': location,
        if (videoLink != null) 'videoLink': videoLink,
        if (agenda != null) 'agenda': agenda,
        if (participantIds != null) 'participantIds': participantIds,
      },
    );
    return CareMeeting.fromJson((response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>);
  }

  /// Update RSVP status for a meeting.
  Future<void> updateMeetingRsvp(
    String learnerId,
    String meetingId,
    String participantId,
    String rsvpStatus,
  ) async {
    if (_useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return;
    }

    await _apiClient.patch(
      '$_baseUrl/api/v1/learners/$learnerId/meetings/$meetingId/participants/$participantId',
      data: {'rsvpStatus': rsvpStatus},
    );
  }

  List<CareMeeting> _mockMeetings(String learnerId) {
    return [
      CareMeeting(
        id: 'meeting-1',
        learnerId: learnerId,
        title: 'Monthly Progress Check-In',
        description: 'Review progress on action plans and discuss any adjustments needed.',
        meetingType: MeetingType.virtual,
        status: MeetingStatus.scheduled,
        scheduledAt: DateTime.now().add(const Duration(days: 5, hours: 14)),
        durationMinutes: 60,
        location: 'Room 204 or Zoom',
        videoLink: 'https://zoom.us/j/123456789',
        agenda: [
          'Review morning routine progress',
          'Discuss handwriting strategies',
          'Plan next steps',
        ],
        participants: [
          MeetingParticipant(
            id: 'mp-1',
            userId: 'user-1',
            displayName: 'Sarah Johnson',
            role: CareTeamRole.parent,
            responseStatus: ResponseStatus.accepted,
          ),
          MeetingParticipant(
            id: 'mp-2',
            userId: 'user-2',
            displayName: 'Ms. Anderson',
            role: CareTeamRole.teacher,
            responseStatus: ResponseStatus.accepted,
          ),
          MeetingParticipant(
            id: 'mp-3',
            userId: 'user-3',
            displayName: 'Dr. Martinez',
            role: CareTeamRole.therapist,
            responseStatus: ResponseStatus.tentative,
          ),
        ],
        noteCount: 0,
        createdAt: DateTime.now().subtract(const Duration(days: 7)),
      ),
      CareMeeting(
        id: 'meeting-2',
        learnerId: learnerId,
        title: 'Q1 IEP Review',
        description: 'Quarterly IEP progress review and goal adjustment.',
        meetingType: MeetingType.inPerson,
        status: MeetingStatus.scheduled,
        scheduledAt: DateTime.now().add(const Duration(days: 14, hours: 10)),
        durationMinutes: 90,
        location: 'Conference Room B',
        agenda: [
          'Review Q1 goals',
          'Data review',
          'Parent input',
          'Goal modifications',
          'Services discussion',
        ],
        participants: [],
        noteCount: 0,
        createdAt: DateTime.now().subtract(const Duration(days: 3)),
      ),
      CareMeeting(
        id: 'meeting-3',
        learnerId: learnerId,
        title: 'OT Session Follow-up',
        description: 'Review of recent occupational therapy progress.',
        meetingType: MeetingType.phone,
        status: MeetingStatus.completed,
        scheduledAt: DateTime.now().subtract(const Duration(days: 7, hours: 10)),
        durationMinutes: 30,
        participants: [
          MeetingParticipant(
            id: 'mp-4',
            userId: 'user-1',
            displayName: 'Sarah Johnson',
            role: CareTeamRole.parent,
            responseStatus: ResponseStatus.accepted,
            attended: true,
          ),
          MeetingParticipant(
            id: 'mp-5',
            userId: 'user-3',
            displayName: 'Dr. Martinez',
            role: CareTeamRole.therapist,
            responseStatus: ResponseStatus.accepted,
            attended: true,
          ),
        ],
        summary: 'Discussed fine motor progress and adjusted handwriting goals.',
        noteCount: 2,
        createdAt: DateTime.now().subtract(const Duration(days: 14)),
      ),
    ];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for CollaborationService.
final collaborationServiceProvider = Provider<CollaborationService>((ref) {
  return CollaborationService();
});

/// Provider for care team members.
final careTeamProvider = FutureProvider.family<List<CareTeamMember>, String>(
  (ref, learnerId) async {
    final service = ref.read(collaborationServiceProvider);
    return service.getCareTeam(learnerId);
  },
);

/// Provider for action plans.
final actionPlansProvider = FutureProvider.family<List<ActionPlan>, String>(
  (ref, learnerId) async {
    final service = ref.read(collaborationServiceProvider);
    return service.getActionPlans(learnerId);
  },
);

/// Provider for action plan detail.
final actionPlanDetailProvider =
    FutureProvider.family<ActionPlan, ({String learnerId, String planId})>(
  (ref, params) async {
    final service = ref.read(collaborationServiceProvider);
    return service.getActionPlan(params.learnerId, params.planId);
  },
);

/// Provider for care notes.
final careNotesProvider = FutureProvider.family<List<CareNote>, String>(
  (ref, learnerId) async {
    final service = ref.read(collaborationServiceProvider);
    return service.getCareNotes(learnerId);
  },
);

/// Provider for meetings.
final meetingsProvider = FutureProvider.family<List<CareMeeting>, String>(
  (ref, learnerId) async {
    final service = ref.read(collaborationServiceProvider);
    return service.getMeetings(learnerId);
  },
);
