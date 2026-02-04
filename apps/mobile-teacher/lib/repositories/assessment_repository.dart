/// Assessment Repository
///
/// Offline-first data access for assessments and questions.
/// Supports CRUD operations, publishing, duplication, and results.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_common/flutter_common.dart' hide Assessment, AssessmentType, AssessmentStatus, Question, SyncOperationType;

import '../models/assessment.dart';
import '../models/sync_operation.dart';
import '../services/database/local_database.dart';
import '../services/sync/sync_service.dart';
import '../services/sync/connectivity_monitor.dart';

/// DTO for creating a new assessment
class CreateAssessmentDto {
  const CreateAssessmentDto({
    required this.classId,
    required this.name,
    this.description,
    this.instructions,
    required this.type,
    this.settings,
    this.standards,
  });

  final String classId;
  final String name;
  final String? description;
  final String? instructions;
  final AssessmentType type;
  final AssessmentSettings? settings;
  final List<String>? standards;

  Map<String, dynamic> toJson() => {
        'classId': classId,
        'name': name,
        if (description != null) 'description': description,
        if (instructions != null) 'instructions': instructions,
        'type': type.value,
        if (settings != null) 'settings': settings!.toJson(),
        if (standards != null) 'standards': standards,
      };
}

/// DTO for updating an assessment
class UpdateAssessmentDto {
  const UpdateAssessmentDto({
    this.name,
    this.description,
    this.instructions,
    this.type,
    this.settings,
    this.questions,
    this.availableFrom,
    this.availableUntil,
    this.standards,
  });

  final String? name;
  final String? description;
  final String? instructions;
  final AssessmentType? type;
  final AssessmentSettings? settings;
  final List<Question>? questions;
  final DateTime? availableFrom;
  final DateTime? availableUntil;
  final List<String>? standards;

  Map<String, dynamic> toJson() => {
        if (name != null) 'name': name,
        if (description != null) 'description': description,
        if (instructions != null) 'instructions': instructions,
        if (type != null) 'type': type!.value,
        if (settings != null) 'settings': settings!.toJson(),
        if (questions != null)
          'questions': questions!.map((q) => q.toJson()).toList(),
        if (availableFrom != null)
          'availableFrom': availableFrom!.toIso8601String(),
        if (availableUntil != null)
          'availableUntil': availableUntil!.toIso8601String(),
        if (standards != null) 'standards': standards,
      };
}

/// Student's submission/attempt on an assessment
class AssessmentSubmission {
  const AssessmentSubmission({
    required this.id,
    required this.assessmentId,
    required this.studentId,
    required this.studentName,
    this.studentAvatar,
    required this.attemptNumber,
    required this.status,
    this.score,
    this.maxScore,
    this.percentage,
    this.timeSpentMinutes,
    this.startedAt,
    this.submittedAt,
    this.gradedAt,
    this.gradedBy,
    this.responses = const [],
  });

  final String id;
  final String assessmentId;
  final String studentId;
  final String studentName;
  final String? studentAvatar;
  final int attemptNumber;
  final SubmissionStatus status;
  final int? score;
  final int? maxScore;
  final double? percentage;
  final int? timeSpentMinutes;
  final DateTime? startedAt;
  final DateTime? submittedAt;
  final DateTime? gradedAt;
  final String? gradedBy;
  final List<QuestionResponse> responses;

  factory AssessmentSubmission.fromJson(Map<String, dynamic> json) {
    return AssessmentSubmission(
      id: json['id'] as String? ?? '',
      assessmentId: json['assessmentId'] as String? ?? '',
      studentId: json['studentId'] as String? ?? '',
      studentName: json['studentName'] as String? ?? '',
      studentAvatar: json['studentAvatar'] as String?,
      attemptNumber: json['attemptNumber'] as int? ?? 1,
      status: SubmissionStatus.fromString(json['status'] as String? ?? ''),
      score: json['score'] as int?,
      maxScore: json['maxScore'] as int?,
      percentage: (json['percentage'] as num?)?.toDouble(),
      timeSpentMinutes: json['timeSpentMinutes'] as int?,
      startedAt: json['startedAt'] != null
          ? DateTime.tryParse(json['startedAt'] as String)
          : null,
      submittedAt: json['submittedAt'] != null
          ? DateTime.tryParse(json['submittedAt'] as String)
          : null,
      gradedAt: json['gradedAt'] != null
          ? DateTime.tryParse(json['gradedAt'] as String)
          : null,
      gradedBy: json['gradedBy'] as String?,
      responses: (json['responses'] as List<dynamic>? ?? [])
          .map((r) => QuestionResponse.fromJson(r as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'assessmentId': assessmentId,
        'studentId': studentId,
        'studentName': studentName,
        if (studentAvatar != null) 'studentAvatar': studentAvatar,
        'attemptNumber': attemptNumber,
        'status': status.value,
        if (score != null) 'score': score,
        if (maxScore != null) 'maxScore': maxScore,
        if (percentage != null) 'percentage': percentage,
        if (timeSpentMinutes != null) 'timeSpentMinutes': timeSpentMinutes,
        if (startedAt != null) 'startedAt': startedAt!.toIso8601String(),
        if (submittedAt != null) 'submittedAt': submittedAt!.toIso8601String(),
        if (gradedAt != null) 'gradedAt': gradedAt!.toIso8601String(),
        if (gradedBy != null) 'gradedBy': gradedBy,
        'responses': responses.map((r) => r.toJson()).toList(),
      };

  /// Whether this submission needs grading
  bool get needsGrading =>
      status == SubmissionStatus.submitted ||
      status == SubmissionStatus.partiallyGraded;

  /// Whether this submission is complete
  bool get isComplete =>
      status == SubmissionStatus.graded ||
      status == SubmissionStatus.submitted;
}

/// Status of a submission
enum SubmissionStatus {
  notStarted('NOT_STARTED'),
  inProgress('IN_PROGRESS'),
  submitted('SUBMITTED'),
  partiallyGraded('PARTIALLY_GRADED'),
  graded('GRADED');

  const SubmissionStatus(this.value);
  final String value;

  static SubmissionStatus fromString(String value) {
    return SubmissionStatus.values.firstWhere(
      (s) => s.value == value.toUpperCase(),
      orElse: () => SubmissionStatus.notStarted,
    );
  }

  String get label {
    switch (this) {
      case SubmissionStatus.notStarted:
        return 'Not Started';
      case SubmissionStatus.inProgress:
        return 'In Progress';
      case SubmissionStatus.submitted:
        return 'Submitted';
      case SubmissionStatus.partiallyGraded:
        return 'Partially Graded';
      case SubmissionStatus.graded:
        return 'Graded';
    }
  }
}

/// Response to a single question
class QuestionResponse {
  const QuestionResponse({
    required this.id,
    required this.questionId,
    required this.submissionId,
    this.answer,
    this.selectedOptions,
    this.matchingAnswers,
    this.blankAnswers,
    this.score,
    this.maxScore,
    this.isCorrect,
    this.feedback,
    this.answeredAt,
  });

  final String id;
  final String questionId;
  final String submissionId;
  final dynamic answer; // For text answers, true/false, numeric
  final List<String>? selectedOptions; // For multiple choice/select
  final Map<String, String>? matchingAnswers; // For matching
  final List<String>? blankAnswers; // For fill in blank
  final int? score;
  final int? maxScore;
  final bool? isCorrect;
  final String? feedback;
  final DateTime? answeredAt;

  factory QuestionResponse.fromJson(Map<String, dynamic> json) {
    return QuestionResponse(
      id: json['id'] as String? ?? '',
      questionId: json['questionId'] as String? ?? '',
      submissionId: json['submissionId'] as String? ?? '',
      answer: json['answer'],
      selectedOptions: json['selectedOptions'] != null
          ? List<String>.from(json['selectedOptions'] as List)
          : null,
      matchingAnswers: json['matchingAnswers'] != null
          ? Map<String, String>.from(json['matchingAnswers'] as Map)
          : null,
      blankAnswers: json['blankAnswers'] != null
          ? List<String>.from(json['blankAnswers'] as List)
          : null,
      score: json['score'] as int?,
      maxScore: json['maxScore'] as int?,
      isCorrect: json['isCorrect'] as bool?,
      feedback: json['feedback'] as String?,
      answeredAt: json['answeredAt'] != null
          ? DateTime.tryParse(json['answeredAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'questionId': questionId,
        'submissionId': submissionId,
        if (answer != null) 'answer': answer,
        if (selectedOptions != null) 'selectedOptions': selectedOptions,
        if (matchingAnswers != null) 'matchingAnswers': matchingAnswers,
        if (blankAnswers != null) 'blankAnswers': blankAnswers,
        if (score != null) 'score': score,
        if (maxScore != null) 'maxScore': maxScore,
        if (isCorrect != null) 'isCorrect': isCorrect,
        if (feedback != null) 'feedback': feedback,
        if (answeredAt != null) 'answeredAt': answeredAt!.toIso8601String(),
      };
}

/// Assessment results summary for analytics
class AssessmentResults {
  const AssessmentResults({
    required this.assessmentId,
    required this.assessmentName,
    required this.totalStudents,
    required this.submittedCount,
    required this.gradedCount,
    required this.averageScore,
    required this.highestScore,
    required this.lowestScore,
    required this.medianScore,
    required this.passRate,
    required this.averageTimeMinutes,
    this.submissions = const [],
    this.questionStats = const [],
  });

  final String assessmentId;
  final String assessmentName;
  final int totalStudents;
  final int submittedCount;
  final int gradedCount;
  final double averageScore;
  final double highestScore;
  final double lowestScore;
  final double medianScore;
  final double passRate;
  final double averageTimeMinutes;
  final List<AssessmentSubmission> submissions;
  final List<QuestionStats> questionStats;

  factory AssessmentResults.fromJson(Map<String, dynamic> json) {
    return AssessmentResults(
      assessmentId: json['assessmentId'] as String? ?? '',
      assessmentName: json['assessmentName'] as String? ?? '',
      totalStudents: json['totalStudents'] as int? ?? 0,
      submittedCount: json['submittedCount'] as int? ?? 0,
      gradedCount: json['gradedCount'] as int? ?? 0,
      averageScore: (json['averageScore'] as num?)?.toDouble() ?? 0,
      highestScore: (json['highestScore'] as num?)?.toDouble() ?? 0,
      lowestScore: (json['lowestScore'] as num?)?.toDouble() ?? 0,
      medianScore: (json['medianScore'] as num?)?.toDouble() ?? 0,
      passRate: (json['passRate'] as num?)?.toDouble() ?? 0,
      averageTimeMinutes: (json['averageTimeMinutes'] as num?)?.toDouble() ?? 0,
      submissions: (json['submissions'] as List<dynamic>? ?? [])
          .map((s) => AssessmentSubmission.fromJson(s as Map<String, dynamic>))
          .toList(),
      questionStats: (json['questionStats'] as List<dynamic>? ?? [])
          .map((q) => QuestionStats.fromJson(q as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Percentage of students who submitted
  double get submissionRate =>
      totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0;

  /// Count of students needing grading
  int get needsGradingCount => submittedCount - gradedCount;
}

/// Statistics for a single question
class QuestionStats {
  const QuestionStats({
    required this.questionId,
    required this.questionStem,
    required this.questionType,
    required this.totalResponses,
    required this.correctCount,
    required this.incorrectCount,
    required this.averageScore,
    this.optionDistribution = const {},
    this.commonWrongAnswers = const [],
  });

  final String questionId;
  final String questionStem;
  final QuestionType questionType;
  final int totalResponses;
  final int correctCount;
  final int incorrectCount;
  final double averageScore;
  final Map<String, int> optionDistribution;
  final List<String> commonWrongAnswers;

  factory QuestionStats.fromJson(Map<String, dynamic> json) {
    return QuestionStats(
      questionId: json['questionId'] as String? ?? '',
      questionStem: json['questionStem'] as String? ?? '',
      questionType:
          QuestionType.fromString(json['questionType'] as String? ?? ''),
      totalResponses: json['totalResponses'] as int? ?? 0,
      correctCount: json['correctCount'] as int? ?? 0,
      incorrectCount: json['incorrectCount'] as int? ?? 0,
      averageScore: (json['averageScore'] as num?)?.toDouble() ?? 0,
      optionDistribution: json['optionDistribution'] != null
          ? Map<String, int>.from(json['optionDistribution'] as Map)
          : {},
      commonWrongAnswers: json['commonWrongAnswers'] != null
          ? List<String>.from(json['commonWrongAnswers'] as List)
          : [],
    );
  }

  /// Correct answer rate as percentage
  double get correctRate =>
      totalResponses > 0 ? (correctCount / totalResponses) * 100 : 0;
}

/// Repository for assessment data access.
class AssessmentRepository {
  AssessmentRepository({
    required this.api,
    required this.db,
    required this.sync,
    required this.connectivity,
  });

  final AivoApiClient api;
  final TeacherLocalDatabase db;
  final SyncService sync;
  final ConnectivityMonitor connectivity;

  // ════════════════════════════════════════════════════════════════════════════
  // ASSESSMENTS - CRUD
  // ════════════════════════════════════════════════════════════════════════════

  /// Get all assessments for a class (offline-first).
  Future<List<Assessment>> fetchAssessments(String classId) async {
    final cached = await db.getAssessmentsByClass(classId);

    if (await connectivity.isOnline) {
      _refreshAssessmentsInBackground(classId);
    }

    return cached;
  }

  /// Refresh assessments from server in background.
  Future<void> _refreshAssessmentsInBackground(String classId) async {
    try {
      final response = await api.get('/classes/$classId/assessments');
      final data = response.data as Map<String, dynamic>;
      final items = data['items'] as List<dynamic>? ?? data['assessments'] as List<dynamic>? ?? [];
      final assessments = items
          .map((a) => Assessment.fromJson(a as Map<String, dynamic>))
          .toList();
      await db.cacheAssessments(assessments, classId: classId);
    } catch (e) {
      debugPrint('[AssessmentRepository] Background refresh error: $e');
    }
  }

  /// Get a single assessment by ID.
  Future<Assessment?> fetchAssessmentById(String id) async {
    var assessment = await db.getAssessment(id);

    if (assessment == null && await connectivity.isOnline) {
      try {
        final response = await api.get('/assessments/$id');
        assessment = Assessment.fromJson(response.data as Map<String, dynamic>);
        await db.cacheAssessments([assessment]);
      } catch (e) {
        debugPrint('[AssessmentRepository] Error fetching assessment: $e');
      }
    }

    return assessment;
  }

  /// Create a new assessment.
  Future<Assessment> createAssessment(CreateAssessmentDto dto) async {
    if (await connectivity.isOnline) {
      try {
        final response = await api.post(
          '/classes/${dto.classId}/assessments',
          data: dto.toJson(),
        );
        final assessment = Assessment.fromJson(response.data as Map<String, dynamic>);
        await db.cacheAssessments([assessment]);
        return assessment;
      } catch (e) {
        debugPrint('[AssessmentRepository] Error creating assessment: $e');
        rethrow;
      }
    } else {
      // Create locally with temp ID for offline mode
      final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
      final now = DateTime.now();
      final assessment = Assessment(
        id: tempId,
        tenantId: '', // Will be filled on sync
        name: dto.name,
        description: dto.description,
        instructions: dto.instructions,
        type: dto.type,
        status: AssessmentStatus.draft,
        questions: const [],
        settings: dto.settings ?? const AssessmentSettings(),
        totalPoints: 0,
        standards: dto.standards,
        createdBy: '', // Will be filled on sync
        createdAt: now,
        updatedAt: now,
        version: 1,
      );

      await db.cacheAssessments([assessment]);
      await sync.queueOperation(
        SyncOperation(
          id: 'create_assessment_$tempId',
          type: SyncOperationType.create,
          entityType: 'assessment',
          entityId: tempId,
          data: {
            ...dto.toJson(),
            '_tempId': tempId,
          },
          createdAt: now,
        ),
      );

      return assessment;
    }
  }

  /// Update an existing assessment.
  Future<Assessment> updateAssessment(
    String assessmentId,
    UpdateAssessmentDto dto,
  ) async {
    if (await connectivity.isOnline) {
      try {
        final response = await api.patch(
          '/assessments/$assessmentId',
          data: dto.toJson(),
        );
        final assessment = Assessment.fromJson(response.data as Map<String, dynamic>);
        await db.cacheAssessments([assessment]);
        return assessment;
      } catch (e) {
        debugPrint('[AssessmentRepository] Error updating assessment: $e');
        rethrow;
      }
    } else {
      // Update locally and queue for sync
      final existing = await db.getAssessment(assessmentId);
      if (existing == null) {
        throw Exception('Assessment not found');
      }

      final updated = existing.copyWith(
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        instructions: dto.instructions ?? existing.instructions,
        type: dto.type ?? existing.type,
        settings: dto.settings ?? existing.settings,
        questions: dto.questions ?? existing.questions,
        availableFrom: dto.availableFrom ?? existing.availableFrom,
        availableUntil: dto.availableUntil ?? existing.availableUntil,
        standards: dto.standards ?? existing.standards,
        updatedAt: DateTime.now(),
      );

      await db.cacheAssessments([updated]);
      await sync.queueOperation(
        SyncOperation(
          id: 'update_assessment_$assessmentId',
          type: SyncOperationType.update,
          entityType: 'assessment',
          entityId: assessmentId,
          data: dto.toJson(),
          createdAt: DateTime.now(),
        ),
      );

      return updated;
    }
  }

  /// Delete an assessment.
  Future<void> deleteAssessment(String assessmentId) async {
    if (await connectivity.isOnline) {
      try {
        await api.delete('/assessments/$assessmentId');
        await db.deleteAssessment(assessmentId);
      } catch (e) {
        debugPrint('[AssessmentRepository] Error deleting assessment: $e');
        rethrow;
      }
    } else {
      // Mark for deletion and queue sync
      await db.deleteAssessment(assessmentId);
      await sync.queueOperation(
        SyncOperation(
          id: 'delete_assessment_$assessmentId',
          type: SyncOperationType.delete,
          entityType: 'assessment',
          entityId: assessmentId,
          data: const {},
          createdAt: DateTime.now(),
        ),
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ASSESSMENTS - ACTIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Duplicate an assessment.
  Future<Assessment> duplicateAssessment(String assessmentId) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot duplicate assessment while offline');
    }

    try {
      final response = await api.post('/assessments/$assessmentId/duplicate');
      final assessment = Assessment.fromJson(response.data as Map<String, dynamic>);
      await db.cacheAssessments([assessment]);
      return assessment;
    } catch (e) {
      debugPrint('[AssessmentRepository] Error duplicating assessment: $e');
      rethrow;
    }
  }

  /// Publish an assessment (make available to students).
  Future<Assessment> publishAssessment(String assessmentId) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot publish assessment while offline');
    }

    try {
      final response = await api.post('/assessments/$assessmentId/publish');
      final assessment = Assessment.fromJson(response.data as Map<String, dynamic>);
      await db.cacheAssessments([assessment]);
      return assessment;
    } catch (e) {
      debugPrint('[AssessmentRepository] Error publishing assessment: $e');
      rethrow;
    }
  }

  /// Unpublish an assessment (revert to draft).
  Future<Assessment> unpublishAssessment(String assessmentId) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot unpublish assessment while offline');
    }

    try {
      final response = await api.post('/assessments/$assessmentId/unpublish');
      final assessment = Assessment.fromJson(response.data as Map<String, dynamic>);
      await db.cacheAssessments([assessment]);
      return assessment;
    } catch (e) {
      debugPrint('[AssessmentRepository] Error unpublishing assessment: $e');
      rethrow;
    }
  }

  /// Archive an assessment.
  Future<Assessment> archiveAssessment(String assessmentId) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot archive assessment while offline');
    }

    try {
      final response = await api.post('/assessments/$assessmentId/archive');
      final assessment = Assessment.fromJson(response.data as Map<String, dynamic>);
      await db.cacheAssessments([assessment]);
      return assessment;
    } catch (e) {
      debugPrint('[AssessmentRepository] Error archiving assessment: $e');
      rethrow;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // QUESTIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Add a question to an assessment.
  Future<Assessment> addQuestion(String assessmentId, Question question) async {
    final assessment = await fetchAssessmentById(assessmentId);
    if (assessment == null) {
      throw Exception('Assessment not found');
    }

    final updatedQuestions = [...assessment.questions, question];

    return updateAssessment(
      assessmentId,
      UpdateAssessmentDto(questions: updatedQuestions),
    );
  }

  /// Update a question in an assessment.
  Future<Assessment> updateQuestion(
    String assessmentId,
    String questionId,
    Question updatedQuestion,
  ) async {
    final assessment = await fetchAssessmentById(assessmentId);
    if (assessment == null) {
      throw Exception('Assessment not found');
    }

    final updatedQuestions = assessment.questions.map((q) {
      return q.id == questionId ? updatedQuestion : q;
    }).toList();

    return updateAssessment(
      assessmentId,
      UpdateAssessmentDto(questions: updatedQuestions),
    );
  }

  /// Delete a question from an assessment.
  Future<Assessment> deleteQuestion(
    String assessmentId,
    String questionId,
  ) async {
    final assessment = await fetchAssessmentById(assessmentId);
    if (assessment == null) {
      throw Exception('Assessment not found');
    }

    final updatedQuestions =
        assessment.questions.where((q) => q.id != questionId).toList();

    return updateAssessment(
      assessmentId,
      UpdateAssessmentDto(questions: updatedQuestions),
    );
  }

  /// Reorder questions in an assessment.
  Future<Assessment> reorderQuestions(
    String assessmentId,
    List<String> questionIds,
  ) async {
    final assessment = await fetchAssessmentById(assessmentId);
    if (assessment == null) {
      throw Exception('Assessment not found');
    }

    final questionMap = {for (var q in assessment.questions) q.id: q};
    final reorderedQuestions = questionIds
        .where((id) => questionMap.containsKey(id))
        .map((id) => questionMap[id]!)
        .toList();

    return updateAssessment(
      assessmentId,
      UpdateAssessmentDto(questions: reorderedQuestions),
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RESULTS & SUBMISSIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get results/analytics for an assessment.
  Future<AssessmentResults> fetchAssessmentResults(String assessmentId) async {
    if (!await connectivity.isOnline) {
      // Return cached results if available
      final cached = await db.getAssessmentResults(assessmentId);
      if (cached != null) return cached;
      throw Exception('Cannot fetch results while offline');
    }

    try {
      final response = await api.get('/assessments/$assessmentId/results');
      final results = AssessmentResults.fromJson(
        response.data as Map<String, dynamic>,
      );
      await db.cacheAssessmentResults(assessmentId, results);
      return results;
    } catch (e) {
      debugPrint('[AssessmentRepository] Error fetching results: $e');
      rethrow;
    }
  }

  /// Get submissions for an assessment.
  Future<List<AssessmentSubmission>> fetchSubmissions(
    String assessmentId,
  ) async {
    if (!await connectivity.isOnline) {
      final cached = await db.getAssessmentSubmissions(assessmentId);
      return cached
          .map((s) => AssessmentSubmission.fromJson(s as Map<String, dynamic>))
          .toList();
    }

    try {
      final response = await api.get('/assessments/$assessmentId/submissions');
      final data = response.data as Map<String, dynamic>;
      final items = data['items'] as List<dynamic>? ?? data['submissions'] as List<dynamic>? ?? [];
      final submissions = items
          .map((s) => AssessmentSubmission.fromJson(s as Map<String, dynamic>))
          .toList();
      await db.cacheAssessmentSubmissions(assessmentId, items);
      return submissions;
    } catch (e) {
      debugPrint('[AssessmentRepository] Error fetching submissions: $e');
      final cached = await db.getAssessmentSubmissions(assessmentId);
      return cached
          .map((s) => AssessmentSubmission.fromJson(s as Map<String, dynamic>))
          .toList();
    }
  }

  /// Get a single submission.
  Future<AssessmentSubmission?> fetchSubmission(String submissionId) async {
    if (!await connectivity.isOnline) {
      // Submissions are cached as part of the assessment submissions list
      // For a direct lookup, we'd need to cache individual submissions
      return null;
    }

    try {
      final response = await api.get('/submissions/$submissionId');
      final submission = AssessmentSubmission.fromJson(
        response.data as Map<String, dynamic>,
      );
      return submission;
    } catch (e) {
      debugPrint('[AssessmentRepository] Error fetching submission: $e');
      return null;
    }
  }

  /// Grade a question response.
  Future<QuestionResponse> gradeResponse(
    String submissionId,
    String questionId, {
    required int score,
    String? feedback,
  }) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot grade while offline');
    }

    try {
      final response = await api.post(
        '/submissions/$submissionId/questions/$questionId/grade',
        data: {
          'score': score,
          if (feedback != null) 'feedback': feedback,
        },
      );
      return QuestionResponse.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      debugPrint('[AssessmentRepository] Error grading response: $e');
      rethrow;
    }
  }

  /// Submit all grades for a submission.
  Future<AssessmentSubmission> submitGrades(
    String submissionId, {
    String? overallFeedback,
  }) async {
    if (!await connectivity.isOnline) {
      throw Exception('Cannot submit grades while offline');
    }

    try {
      final response = await api.post(
        '/submissions/$submissionId/finalize-grades',
        data: {
          if (overallFeedback != null) 'feedback': overallFeedback,
        },
      );
      return AssessmentSubmission.fromJson(
        response.data as Map<String, dynamic>,
      );
    } catch (e) {
      debugPrint('[AssessmentRepository] Error submitting grades: $e');
      rethrow;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // QUESTION BANK
  // ════════════════════════════════════════════════════════════════════════════

  /// Search question bank for reusable questions.
  Future<List<Question>> searchQuestionBank({
    String? query,
    QuestionType? type,
    Difficulty? difficulty,
    List<String>? tags,
    int page = 1,
    int limit = 20,
  }) async {
    if (!await connectivity.isOnline) {
      throw Exception('Question bank search requires internet connection');
    }

    try {
      final params = <String, dynamic>{
        'page': page,
        'limit': limit,
        if (query != null && query.isNotEmpty) 'query': query,
        if (type != null) 'type': type.value,
        if (difficulty != null) 'difficulty': difficulty.value,
        if (tags != null && tags.isNotEmpty) 'tags': tags.join(','),
      };

      final response = await api.get('/question-bank', queryParameters: params);
      final data = response.data as Map<String, dynamic>;
      final items = data['items'] as List<dynamic>? ?? data['questions'] as List<dynamic>? ?? [];
      return items
          .map((q) => Question.fromJson(q as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('[AssessmentRepository] Error searching question bank: $e');
      rethrow;
    }
  }

  /// Add a question to the question bank.
  Future<Question> addToQuestionBank(Question question) async {
    if (!await connectivity.isOnline) {
      throw Exception('Adding to question bank requires internet connection');
    }

    try {
      final response = await api.post(
        '/question-bank',
        data: question.toJson(),
      );
      return Question.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      debugPrint('[AssessmentRepository] Error adding to question bank: $e');
      rethrow;
    }
  }

  /// Import questions from question bank to assessment.
  Future<Assessment> importFromQuestionBank(
    String assessmentId,
    List<String> questionIds,
  ) async {
    if (!await connectivity.isOnline) {
      throw Exception('Import requires internet connection');
    }

    try {
      final response = await api.post(
        '/assessments/$assessmentId/import-questions',
        data: {'questionIds': questionIds},
      );
      final assessment = Assessment.fromJson(
        response.data as Map<String, dynamic>,
      );
      await db.cacheAssessments([assessment]);
      return assessment;
    } catch (e) {
      debugPrint('[AssessmentRepository] Error importing questions: $e');
      rethrow;
    }
  }
}
