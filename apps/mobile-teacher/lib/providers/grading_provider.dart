/// Grading Providers
///
/// State management for rubrics and grading queue.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/rubric.dart';
import '../repositories/grading_repository.dart';
import '../repositories/repositories.dart';

/// Provider for grading repository.
final gradingRepositoryProvider = Provider<GradingRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return GradingRepository(dio: dio);
});

// ============================================================
// Rubric Providers
// ============================================================

/// State for rubrics list.
class RubricsState {
  const RubricsState({
    this.rubrics = const [],
    this.isLoading = false,
    this.error,
    this.searchQuery,
    this.statusFilter,
    this.typeFilter,
  });

  final List<Rubric> rubrics;
  final bool isLoading;
  final String? error;
  final String? searchQuery;
  final RubricStatus? statusFilter;
  final RubricType? typeFilter;

  RubricsState copyWith({
    List<Rubric>? rubrics,
    bool? isLoading,
    String? error,
    String? searchQuery,
    RubricStatus? statusFilter,
    RubricType? typeFilter,
  }) {
    return RubricsState(
      rubrics: rubrics ?? this.rubrics,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      searchQuery: searchQuery ?? this.searchQuery,
      statusFilter: statusFilter ?? this.statusFilter,
      typeFilter: typeFilter ?? this.typeFilter,
    );
  }
}

/// Notifier for rubrics.
class RubricsNotifier extends StateNotifier<RubricsState> {
  RubricsNotifier(this._repository) : super(const RubricsState());

  final GradingRepository _repository;

  Future<void> loadRubrics() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final rubrics = await _repository.fetchRubrics(
        status: state.statusFilter,
        type: state.typeFilter,
        searchQuery: state.searchQuery,
      );
      state = state.copyWith(rubrics: rubrics, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setSearchQuery(String? query) {
    state = state.copyWith(searchQuery: query);
    loadRubrics();
  }

  void setStatusFilter(RubricStatus? status) {
    state = state.copyWith(statusFilter: status);
    loadRubrics();
  }

  void setTypeFilter(RubricType? type) {
    state = state.copyWith(typeFilter: type);
    loadRubrics();
  }

  Future<Rubric> createRubric(Rubric rubric) async {
    final created = await _repository.createRubric(rubric);
    state = state.copyWith(rubrics: [created, ...state.rubrics]);
    return created;
  }

  Future<void> updateRubric(Rubric rubric) async {
    final updated = await _repository.updateRubric(rubric);
    state = state.copyWith(
      rubrics: state.rubrics.map((r) => r.id == updated.id ? updated : r).toList(),
    );
  }

  Future<void> deleteRubric(String rubricId) async {
    await _repository.deleteRubric(rubricId);
    state = state.copyWith(
      rubrics: state.rubrics.where((r) => r.id != rubricId).toList(),
    );
  }

  Future<Rubric> duplicateRubric(String rubricId, {String? newName}) async {
    final duplicated = await _repository.duplicateRubric(rubricId, newName: newName);
    state = state.copyWith(rubrics: [duplicated, ...state.rubrics]);
    return duplicated;
  }
}

/// Provider for rubrics notifier.
final rubricsProvider = StateNotifierProvider<RubricsNotifier, RubricsState>((ref) {
  final repository = ref.watch(gradingRepositoryProvider);
  return RubricsNotifier(repository);
});

/// Provider for a single rubric.
final rubricProvider = FutureProvider.family<Rubric, String>((ref, rubricId) async {
  final repository = ref.watch(gradingRepositoryProvider);
  return repository.fetchRubric(rubricId);
});

/// Provider for rubric templates.
final rubricTemplatesProvider = FutureProvider<List<Rubric>>((ref) async {
  final repository = ref.watch(gradingRepositoryProvider);
  return repository.fetchRubricTemplates();
});

// ============================================================
// Grading Queue Providers
// ============================================================

/// State for grading queue.
class GradingQueueState {
  const GradingQueueState({
    this.items = const [],
    this.isLoading = false,
    this.error,
    this.statusFilter,
    this.priorityFilter,
    this.assignmentFilter,
    this.classFilter,
  });

  final List<GradingQueueItem> items;
  final bool isLoading;
  final String? error;
  final GradingStatus? statusFilter;
  final GradingPriority? priorityFilter;
  final String? assignmentFilter;
  final String? classFilter;

  int get pendingCount =>
      items.where((i) => i.status == GradingStatus.pending).length;

  int get overdueCount => items.where((i) => i.isOverdue).length;

  GradingQueueState copyWith({
    List<GradingQueueItem>? items,
    bool? isLoading,
    String? error,
    GradingStatus? statusFilter,
    GradingPriority? priorityFilter,
    String? assignmentFilter,
    String? classFilter,
  }) {
    return GradingQueueState(
      items: items ?? this.items,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      statusFilter: statusFilter ?? this.statusFilter,
      priorityFilter: priorityFilter ?? this.priorityFilter,
      assignmentFilter: assignmentFilter ?? this.assignmentFilter,
      classFilter: classFilter ?? this.classFilter,
    );
  }
}

/// Notifier for grading queue.
class GradingQueueNotifier extends StateNotifier<GradingQueueState> {
  GradingQueueNotifier(this._repository) : super(const GradingQueueState());

  final GradingRepository _repository;

  Future<void> loadQueue() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final items = await _repository.fetchGradingQueue(
        status: state.statusFilter,
        priority: state.priorityFilter,
        assignmentId: state.assignmentFilter,
        classId: state.classFilter,
      );
      state = state.copyWith(items: items, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setStatusFilter(GradingStatus? status) {
    state = state.copyWith(statusFilter: status);
    loadQueue();
  }

  void setPriorityFilter(GradingPriority? priority) {
    state = state.copyWith(priorityFilter: priority);
    loadQueue();
  }

  void setAssignmentFilter(String? assignmentId) {
    state = state.copyWith(assignmentFilter: assignmentId);
    loadQueue();
  }

  void setClassFilter(String? classId) {
    state = state.copyWith(classFilter: classId);
    loadQueue();
  }

  Future<void> updatePriority(String itemId, GradingPriority priority) async {
    await _repository.updatePriority(itemId, priority);
    state = state.copyWith(
      items: state.items.map((item) {
        if (item.id == itemId) {
          return GradingQueueItem.fromJson({
            ...item.toJson(),
            'priority': priority.value,
          });
        }
        return item;
      }).toList(),
    );
  }

  Future<void> skipItem(String itemId, {String? reason}) async {
    await _repository.skipQueueItem(itemId, reason: reason);
    await loadQueue();
  }

  void markAsGraded(String itemId) {
    state = state.copyWith(
      items: state.items.where((i) => i.id != itemId).toList(),
    );
  }
}

/// Provider for grading queue notifier.
final gradingQueueProvider =
    StateNotifierProvider<GradingQueueNotifier, GradingQueueState>((ref) {
  final repository = ref.watch(gradingRepositoryProvider);
  return GradingQueueNotifier(repository);
});

/// Provider for grading queue statistics.
final gradingQueueStatsProvider = FutureProvider<GradingQueueStats>((ref) async {
  final repository = ref.watch(gradingRepositoryProvider);
  return repository.fetchGradingQueueStats();
});

/// Provider for recently graded items.
final recentlyGradedProvider =
    FutureProvider<List<GradingQueueItem>>((ref) async {
  final repository = ref.watch(gradingRepositoryProvider);
  return repository.fetchRecentlyGraded();
});

// ============================================================
// Grading Session Providers
// ============================================================

/// State for active grading session.
class GradingSessionState {
  const GradingSessionState({
    this.submission,
    this.isLoading = false,
    this.isSaving = false,
    this.error,
    this.criteriaScores = const {},
    this.feedback = '',
    this.isDirty = false,
  });

  final GradingSubmission? submission;
  final bool isLoading;
  final bool isSaving;
  final String? error;
  final Map<String, CriterionScore> criteriaScores;
  final String feedback;
  final bool isDirty;

  double get totalScore {
    return criteriaScores.values.fold(0.0, (sum, cs) => sum + cs.score);
  }

  double? get maxScore => submission?.rubric?.totalMaxScore;

  double? get percentage {
    final max = maxScore;
    if (max == null || max == 0) return null;
    return (totalScore / max) * 100;
  }

  GradingSessionState copyWith({
    GradingSubmission? submission,
    bool? isLoading,
    bool? isSaving,
    String? error,
    Map<String, CriterionScore>? criteriaScores,
    String? feedback,
    bool? isDirty,
  }) {
    return GradingSessionState(
      submission: submission ?? this.submission,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: error,
      criteriaScores: criteriaScores ?? this.criteriaScores,
      feedback: feedback ?? this.feedback,
      isDirty: isDirty ?? this.isDirty,
    );
  }
}

/// Notifier for grading session.
class GradingSessionNotifier extends StateNotifier<GradingSessionState> {
  GradingSessionNotifier(this._repository) : super(const GradingSessionState());

  final GradingRepository _repository;

  Future<void> loadSubmission(String submissionId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final submission = await _repository.fetchSubmission(submissionId);
      state = state.copyWith(
        submission: submission,
        criteriaScores: submission.criteriaScores,
        feedback: submission.feedback ?? '',
        isLoading: false,
        isDirty: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void updateCriterionScore(String criterionId, CriterionScore score) {
    state = state.copyWith(
      criteriaScores: {...state.criteriaScores, criterionId: score},
      isDirty: true,
    );
  }

  void updateFeedback(String feedback) {
    state = state.copyWith(feedback: feedback, isDirty: true);
  }

  Future<void> requestAIAssist() async {
    if (state.submission == null) return;

    state = state.copyWith(isLoading: true);
    try {
      final suggestedScores =
          await _repository.requestAIGradingAssist(state.submission!.id);
      state = state.copyWith(
        criteriaScores: {...state.criteriaScores, ...suggestedScores},
        isLoading: false,
        isDirty: true,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> submitGrades({bool returnToStudent = false}) async {
    if (state.submission == null) return;

    state = state.copyWith(isSaving: true);
    try {
      await _repository.submitGrades(
        submissionId: state.submission!.id,
        criteriaScores: state.criteriaScores,
        feedback: state.feedback,
        returnToStudent: returnToStudent,
      );
      state = state.copyWith(isSaving: false, isDirty: false);
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
    }
  }

  Future<void> addComment(String text, {int? position, bool isPrivate = false}) async {
    if (state.submission == null) return;

    try {
      final comment = await _repository.addComment(
        submissionId: state.submission!.id,
        text: text,
        position: position,
        isPrivate: isPrivate,
      );
      state = state.copyWith(
        submission: GradingSubmission.fromJson({
          ...state.submission!.toJson(),
          'comments': [...state.submission!.comments.map((c) => c.toJson()), comment.toJson()],
        }),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  void reset() {
    state = const GradingSessionState();
  }
}

/// Provider for grading session notifier.
final gradingSessionProvider =
    StateNotifierProvider<GradingSessionNotifier, GradingSessionState>((ref) {
  final repository = ref.watch(gradingRepositoryProvider);
  return GradingSessionNotifier(repository);
});

// ============================================================
// Rubric Builder Providers
// ============================================================

/// State for rubric being edited.
class RubricBuilderState {
  const RubricBuilderState({
    required this.rubric,
    this.isLoading = false,
    this.isSaving = false,
    this.error,
    this.isDirty = false,
    this.selectedCriterionId,
  });

  final Rubric rubric;
  final bool isLoading;
  final bool isSaving;
  final String? error;
  final bool isDirty;
  final String? selectedCriterionId;

  RubricCriterion? get selectedCriterion {
    if (selectedCriterionId == null) return null;
    return rubric.criteria.firstWhere(
      (c) => c.id == selectedCriterionId,
      orElse: () => rubric.criteria.first,
    );
  }

  RubricBuilderState copyWith({
    Rubric? rubric,
    bool? isLoading,
    bool? isSaving,
    String? error,
    bool? isDirty,
    String? selectedCriterionId,
  }) {
    return RubricBuilderState(
      rubric: rubric ?? this.rubric,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: error,
      isDirty: isDirty ?? this.isDirty,
      selectedCriterionId: selectedCriterionId ?? this.selectedCriterionId,
    );
  }
}

/// Notifier for rubric builder.
class RubricBuilderNotifier extends StateNotifier<RubricBuilderState> {
  RubricBuilderNotifier(this._repository)
      : super(RubricBuilderState(
          rubric: Rubric(
            id: '',
            name: '',
            type: RubricType.analytic,
            status: RubricStatus.draft,
            criteria: [],
          ),
        ));

  final GradingRepository _repository;

  void initializeNew() {
    state = RubricBuilderState(
      rubric: Rubric(
        id: '',
        name: 'New Rubric',
        type: RubricType.analytic,
        status: RubricStatus.draft,
        criteria: [
          RubricCriterion(
            id: 'criterion_1',
            name: 'Criterion 1',
            maxPoints: 4,
            levels: _defaultLevels(),
          ),
        ],
      ),
    );
  }

  Future<void> loadRubric(String rubricId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final rubric = await _repository.fetchRubric(rubricId);
      state = state.copyWith(
        rubric: rubric,
        isLoading: false,
        isDirty: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void loadFromTemplate(Rubric template) {
    state = RubricBuilderState(
      rubric: template.copyWith(
        id: '',
        name: '${template.name} (Copy)',
        status: RubricStatus.draft,
      ),
      isDirty: true,
    );
  }

  void updateName(String name) {
    state = state.copyWith(
      rubric: state.rubric.copyWith(name: name),
      isDirty: true,
    );
  }

  void updateDescription(String? description) {
    state = state.copyWith(
      rubric: state.rubric.copyWith(description: description),
      isDirty: true,
    );
  }

  void updateType(RubricType type) {
    state = state.copyWith(
      rubric: state.rubric.copyWith(type: type),
      isDirty: true,
    );
  }

  void addCriterion() {
    final newCriterion = RubricCriterion(
      id: 'criterion_${DateTime.now().millisecondsSinceEpoch}',
      name: 'New Criterion',
      maxPoints: 4,
      levels: _defaultLevels(),
      order: state.rubric.criteria.length,
    );
    state = state.copyWith(
      rubric: state.rubric.copyWith(
        criteria: [...state.rubric.criteria, newCriterion],
      ),
      selectedCriterionId: newCriterion.id,
      isDirty: true,
    );
  }

  void updateCriterion(RubricCriterion criterion) {
    state = state.copyWith(
      rubric: state.rubric.copyWith(
        criteria: state.rubric.criteria
            .map((c) => c.id == criterion.id ? criterion : c)
            .toList(),
      ),
      isDirty: true,
    );
  }

  void removeCriterion(String criterionId) {
    state = state.copyWith(
      rubric: state.rubric.copyWith(
        criteria: state.rubric.criteria.where((c) => c.id != criterionId).toList(),
      ),
      selectedCriterionId:
          state.selectedCriterionId == criterionId ? null : state.selectedCriterionId,
      isDirty: true,
    );
  }

  void reorderCriteria(int oldIndex, int newIndex) {
    final criteria = List<RubricCriterion>.from(state.rubric.criteria);
    if (oldIndex < newIndex) {
      newIndex -= 1;
    }
    final item = criteria.removeAt(oldIndex);
    criteria.insert(newIndex, item);

    state = state.copyWith(
      rubric: state.rubric.copyWith(
        criteria: criteria
            .asMap()
            .entries
            .map((e) => e.value.copyWith(order: e.key))
            .toList(),
      ),
      isDirty: true,
    );
  }

  void selectCriterion(String? criterionId) {
    state = state.copyWith(selectedCriterionId: criterionId);
  }

  Future<void> generateWithAI({
    required String assignmentTitle,
    required String assignmentDescription,
    int criteriaCount = 4,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final generated = await _repository.generateRubricWithAI(
        assignmentTitle: assignmentTitle,
        assignmentDescription: assignmentDescription,
        type: state.rubric.type,
        criteriaCount: criteriaCount,
      );
      state = state.copyWith(
        rubric: generated.copyWith(id: state.rubric.id),
        isLoading: false,
        isDirty: true,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<Rubric> save() async {
    state = state.copyWith(isSaving: true, error: null);
    try {
      final saved = state.rubric.id.isEmpty
          ? await _repository.createRubric(state.rubric)
          : await _repository.updateRubric(state.rubric);
      state = state.copyWith(
        rubric: saved,
        isSaving: false,
        isDirty: false,
      );
      return saved;
    } catch (e) {
      state = state.copyWith(isSaving: false, error: e.toString());
      rethrow;
    }
  }

  List<PerformanceLevel> _defaultLevels() {
    return [
      PerformanceLevel(id: 'level_4', label: 'Excellent', points: 4, description: 'Exceeds expectations', order: 0),
      PerformanceLevel(id: 'level_3', label: 'Good', points: 3, description: 'Meets expectations', order: 1),
      PerformanceLevel(id: 'level_2', label: 'Fair', points: 2, description: 'Approaching expectations', order: 2),
      PerformanceLevel(id: 'level_1', label: 'Needs Work', points: 1, description: 'Below expectations', order: 3),
    ];
  }
}

/// Provider for rubric builder notifier.
final rubricBuilderProvider =
    StateNotifierProvider<RubricBuilderNotifier, RubricBuilderState>((ref) {
  final repository = ref.watch(gradingRepositoryProvider);
  return RubricBuilderNotifier(repository);
});
