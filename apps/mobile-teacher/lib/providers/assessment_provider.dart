/// Riverpod providers for Assessment Builder
/// Manages assessment list, editing, questions, settings, and results
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/assessment.dart';
import '../repositories/assessment_repository.dart';
import 'core_providers.dart';

// ==========================================================================
// REPOSITORY PROVIDER
// ==========================================================================

/// Provider for AssessmentRepository
final assessmentRepositoryProvider = Provider<AssessmentRepository>((ref) {
  return AssessmentRepository(
    api: ref.watch(apiClientProvider),
    db: ref.watch(localDatabaseProvider),
    sync: ref.watch(syncServiceProvider),
    connectivity: ref.watch(connectivityMonitorProvider),
  );
});

// ==========================================================================
// ASSESSMENT LIST STATE
// ==========================================================================

/// State for the assessment list
class AssessmentListState {
  const AssessmentListState({
    this.assessments = const [],
    this.isLoading = false,
    this.error,
    this.filter = AssessmentListFilter.all,
    this.searchQuery = '',
    this.selectedType,
    this.lastUpdated,
  });

  final List<Assessment> assessments;
  final bool isLoading;
  final String? error;
  final AssessmentListFilter filter;
  final String searchQuery;
  final AssessmentType? selectedType;
  final DateTime? lastUpdated;

  /// Filtered assessments based on current filter and search
  List<Assessment> get filteredAssessments {
    var filtered = assessments;

    // Apply status filter
    switch (filter) {
      case AssessmentListFilter.all:
        break;
      case AssessmentListFilter.draft:
        filtered = filtered
            .where((a) => a.status == AssessmentStatus.draft)
            .toList();
        break;
      case AssessmentListFilter.published:
        filtered = filtered
            .where((a) => a.status == AssessmentStatus.published)
            .toList();
        break;
      case AssessmentListFilter.archived:
        filtered = filtered
            .where((a) => a.status == AssessmentStatus.archived)
            .toList();
        break;
    }

    // Apply type filter
    if (selectedType != null) {
      filtered = filtered.where((a) => a.type == selectedType).toList();
    }

    // Apply search
    if (searchQuery.isNotEmpty) {
      final query = searchQuery.toLowerCase();
      filtered = filtered.where((a) {
        return a.name.toLowerCase().contains(query) ||
            (a.description?.toLowerCase().contains(query) ?? false);
      }).toList();
    }

    return filtered;
  }

  /// Count of draft assessments
  int get draftCount =>
      assessments.where((a) => a.status == AssessmentStatus.draft).length;

  /// Count of published assessments
  int get publishedCount =>
      assessments.where((a) => a.status == AssessmentStatus.published).length;

  AssessmentListState copyWith({
    List<Assessment>? assessments,
    bool? isLoading,
    String? error,
    AssessmentListFilter? filter,
    String? searchQuery,
    AssessmentType? selectedType,
    DateTime? lastUpdated,
    bool clearError = false,
    bool clearType = false,
  }) {
    return AssessmentListState(
      assessments: assessments ?? this.assessments,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      filter: filter ?? this.filter,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedType: clearType ? null : (selectedType ?? this.selectedType),
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

/// Filter options for assessment list
enum AssessmentListFilter { all, draft, published, archived }

// ==========================================================================
// ASSESSMENT LIST PROVIDER
// ==========================================================================

/// Notifier for assessment list state
class AssessmentListNotifier extends StateNotifier<AssessmentListState> {
  AssessmentListNotifier(this._ref, this._classId)
      : super(const AssessmentListState()) {
    loadAssessments();
  }

  final Ref _ref;
  final String _classId;

  AssessmentRepository get _repo => _ref.read(assessmentRepositoryProvider);

  /// Load assessments for the class
  Future<void> loadAssessments() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final assessments = await _repo.fetchAssessments(_classId);
      state = state.copyWith(
        assessments: assessments,
        isLoading: false,
        lastUpdated: DateTime.now(),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Refresh assessments
  Future<void> refresh() => loadAssessments();

  /// Set filter
  void setFilter(AssessmentListFilter filter) {
    state = state.copyWith(filter: filter);
  }

  /// Set search query
  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  /// Set type filter
  void setTypeFilter(AssessmentType? type) {
    if (type == null) {
      state = state.copyWith(clearType: true);
    } else {
      state = state.copyWith(selectedType: type);
    }
  }

  /// Create a new assessment
  Future<Assessment> createAssessment(CreateAssessmentDto dto) async {
    final assessment = await _repo.createAssessment(dto);
    state = state.copyWith(
      assessments: [...state.assessments, assessment],
    );
    return assessment;
  }

  /// Duplicate an assessment
  Future<Assessment> duplicateAssessment(String assessmentId) async {
    final assessment = await _repo.duplicateAssessment(assessmentId);
    state = state.copyWith(
      assessments: [...state.assessments, assessment],
    );
    return assessment;
  }

  /// Delete an assessment
  Future<void> deleteAssessment(String assessmentId) async {
    await _repo.deleteAssessment(assessmentId);
    state = state.copyWith(
      assessments: state.assessments.where((a) => a.id != assessmentId).toList(),
    );
  }

  /// Publish an assessment
  Future<void> publishAssessment(String assessmentId) async {
    final updated = await _repo.publishAssessment(assessmentId);
    _updateAssessmentInList(updated);
  }

  /// Unpublish an assessment
  Future<void> unpublishAssessment(String assessmentId) async {
    final updated = await _repo.unpublishAssessment(assessmentId);
    _updateAssessmentInList(updated);
  }

  /// Archive an assessment
  Future<void> archiveAssessment(String assessmentId) async {
    final updated = await _repo.archiveAssessment(assessmentId);
    _updateAssessmentInList(updated);
  }

  void _updateAssessmentInList(Assessment updated) {
    state = state.copyWith(
      assessments: state.assessments.map((a) {
        return a.id == updated.id ? updated : a;
      }).toList(),
    );
  }
}

/// Provider for assessment list
final assessmentListProvider = StateNotifierProvider.family<
    AssessmentListNotifier, AssessmentListState, String>(
  (ref, classId) => AssessmentListNotifier(ref, classId),
);

// ==========================================================================
// CURRENT ASSESSMENT STATE (FOR EDITING)
// ==========================================================================

/// State for the current assessment being edited
class CurrentAssessmentState {
  const CurrentAssessmentState({
    this.assessment,
    this.originalAssessment,
    this.isLoading = false,
    this.isSaving = false,
    this.error,
    this.hasUnsavedChanges = false,
    this.currentQuestionIndex = 0,
  });

  final Assessment? assessment;
  final Assessment? originalAssessment;
  final bool isLoading;
  final bool isSaving;
  final String? error;
  final bool hasUnsavedChanges;
  final int currentQuestionIndex;

  /// Whether in create mode (no ID yet)
  bool get isNewAssessment =>
      assessment?.id.startsWith('temp_') ?? true;

  /// Current question being edited
  Question? get currentQuestion {
    if (assessment == null ||
        currentQuestionIndex < 0 ||
        currentQuestionIndex >= assessment!.questions.length) {
      return null;
    }
    return assessment!.questions[currentQuestionIndex];
  }

  /// Whether can publish (has questions, all valid)
  bool get canPublish =>
      assessment != null &&
      assessment!.questions.isNotEmpty &&
      assessment!.status == AssessmentStatus.draft;

  CurrentAssessmentState copyWith({
    Assessment? assessment,
    Assessment? originalAssessment,
    bool? isLoading,
    bool? isSaving,
    String? error,
    bool? hasUnsavedChanges,
    int? currentQuestionIndex,
    bool clearError = false,
  }) {
    return CurrentAssessmentState(
      assessment: assessment ?? this.assessment,
      originalAssessment: originalAssessment ?? this.originalAssessment,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: clearError ? null : (error ?? this.error),
      hasUnsavedChanges: hasUnsavedChanges ?? this.hasUnsavedChanges,
      currentQuestionIndex: currentQuestionIndex ?? this.currentQuestionIndex,
    );
  }
}

// ==========================================================================
// CURRENT ASSESSMENT PROVIDER
// ==========================================================================

/// Notifier for current assessment being edited
class CurrentAssessmentNotifier extends StateNotifier<CurrentAssessmentState> {
  CurrentAssessmentNotifier(this._ref)
      : super(const CurrentAssessmentState());

  final Ref _ref;

  AssessmentRepository get _repo => _ref.read(assessmentRepositoryProvider);

  /// Load an existing assessment for editing
  Future<void> loadAssessment(String assessmentId) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final assessment = await _repo.fetchAssessmentById(assessmentId);
      state = state.copyWith(
        assessment: assessment,
        originalAssessment: assessment,
        isLoading: false,
        hasUnsavedChanges: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Initialize a new assessment
  void initNewAssessment({
    required String classId,
    AssessmentType type = AssessmentType.quiz,
    String? name,
  }) {
    final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
    final now = DateTime.now();
    final assessment = Assessment(
      id: tempId,
      tenantId: '',
      name: name ?? 'New ${type.label}',
      type: type,
      status: AssessmentStatus.draft,
      questions: const [],
      settings: const AssessmentSettings(),
      totalPoints: 0,
      createdBy: '',
      createdAt: now,
      updatedAt: now,
      version: 1,
    );

    state = state.copyWith(
      assessment: assessment,
      originalAssessment: null,
      hasUnsavedChanges: true,
    );
  }

  /// Update assessment properties
  void updateAssessment({
    String? name,
    String? description,
    String? instructions,
    AssessmentType? type,
    AssessmentSettings? settings,
    DateTime? availableFrom,
    DateTime? availableUntil,
  }) {
    if (state.assessment == null) return;

    final updated = state.assessment!.copyWith(
      name: name ?? state.assessment!.name,
      description: description ?? state.assessment!.description,
      instructions: instructions ?? state.assessment!.instructions,
      type: type ?? state.assessment!.type,
      settings: settings ?? state.assessment!.settings,
      availableFrom: availableFrom ?? state.assessment!.availableFrom,
      availableUntil: availableUntil ?? state.assessment!.availableUntil,
      updatedAt: DateTime.now(),
    );

    state = state.copyWith(
      assessment: updated,
      hasUnsavedChanges: true,
    );
  }

  /// Update settings
  void updateSettings(AssessmentSettings settings) {
    updateAssessment(settings: settings);
  }

  /// Add a new question
  void addQuestion(Question question) {
    if (state.assessment == null) return;

    final questions = [...state.assessment!.questions, question];
    final totalPoints = questions.fold<int>(0, (sum, q) => sum + q.points);

    final updated = state.assessment!.copyWith(
      questions: questions,
      totalPoints: totalPoints,
      updatedAt: DateTime.now(),
    );

    state = state.copyWith(
      assessment: updated,
      hasUnsavedChanges: true,
      currentQuestionIndex: questions.length - 1,
    );
  }

  /// Update a question
  void updateQuestion(String questionId, Question updatedQuestion) {
    if (state.assessment == null) return;

    final questions = state.assessment!.questions.map((q) {
      return q.id == questionId ? updatedQuestion : q;
    }).toList();
    final totalPoints = questions.fold<int>(0, (sum, q) => sum + q.points);

    final updated = state.assessment!.copyWith(
      questions: questions,
      totalPoints: totalPoints,
      updatedAt: DateTime.now(),
    );

    state = state.copyWith(
      assessment: updated,
      hasUnsavedChanges: true,
    );
  }

  /// Delete a question
  void deleteQuestion(String questionId) {
    if (state.assessment == null) return;

    final questions =
        state.assessment!.questions.where((q) => q.id != questionId).toList();
    final totalPoints = questions.fold<int>(0, (sum, q) => sum + q.points);

    // Adjust current index if needed
    var currentIndex = state.currentQuestionIndex;
    if (currentIndex >= questions.length && questions.isNotEmpty) {
      currentIndex = questions.length - 1;
    } else if (questions.isEmpty) {
      currentIndex = 0;
    }

    final updated = state.assessment!.copyWith(
      questions: questions,
      totalPoints: totalPoints,
      updatedAt: DateTime.now(),
    );

    state = state.copyWith(
      assessment: updated,
      hasUnsavedChanges: true,
      currentQuestionIndex: currentIndex,
    );
  }

  /// Reorder questions
  void reorderQuestions(int oldIndex, int newIndex) {
    if (state.assessment == null) return;

    final questions = [...state.assessment!.questions];
    final question = questions.removeAt(oldIndex);
    questions.insert(newIndex, question);

    final updated = state.assessment!.copyWith(
      questions: questions,
      updatedAt: DateTime.now(),
    );

    state = state.copyWith(
      assessment: updated,
      hasUnsavedChanges: true,
    );
  }

  /// Set current question index
  void setCurrentQuestionIndex(int index) {
    if (state.assessment == null) return;
    if (index < 0 || index >= state.assessment!.questions.length) return;
    state = state.copyWith(currentQuestionIndex: index);
  }

  /// Navigate to next question
  void nextQuestion() {
    if (state.assessment == null) return;
    if (state.currentQuestionIndex < state.assessment!.questions.length - 1) {
      state = state.copyWith(
        currentQuestionIndex: state.currentQuestionIndex + 1,
      );
    }
  }

  /// Navigate to previous question
  void previousQuestion() {
    if (state.currentQuestionIndex > 0) {
      state = state.copyWith(
        currentQuestionIndex: state.currentQuestionIndex - 1,
      );
    }
  }

  /// Save the current assessment
  Future<Assessment> save() async {
    if (state.assessment == null) {
      throw Exception('No assessment to save');
    }

    state = state.copyWith(isSaving: true, clearError: true);

    try {
      Assessment saved;

      if (state.isNewAssessment) {
        // Create new assessment
        saved = await _repo.createAssessment(
          CreateAssessmentDto(
            classId: '', // Should be passed in
            name: state.assessment!.name,
            description: state.assessment!.description,
            instructions: state.assessment!.instructions,
            type: state.assessment!.type,
            settings: state.assessment!.settings,
            standards: state.assessment!.standards,
          ),
        );

        // If there are questions, add them
        if (state.assessment!.questions.isNotEmpty) {
          saved = await _repo.updateAssessment(
            saved.id,
            UpdateAssessmentDto(questions: state.assessment!.questions),
          );
        }
      } else {
        // Update existing assessment
        saved = await _repo.updateAssessment(
          state.assessment!.id,
          UpdateAssessmentDto(
            name: state.assessment!.name,
            description: state.assessment!.description,
            instructions: state.assessment!.instructions,
            type: state.assessment!.type,
            settings: state.assessment!.settings,
            questions: state.assessment!.questions,
            availableFrom: state.assessment!.availableFrom,
            availableUntil: state.assessment!.availableUntil,
            standards: state.assessment!.standards,
          ),
        );
      }

      state = state.copyWith(
        assessment: saved,
        originalAssessment: saved,
        isSaving: false,
        hasUnsavedChanges: false,
      );

      return saved;
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: e.toString(),
      );
      rethrow;
    }
  }

  /// Publish the assessment
  Future<Assessment> publish() async {
    if (state.assessment == null) {
      throw Exception('No assessment to publish');
    }

    // Save first if there are unsaved changes
    if (state.hasUnsavedChanges) {
      await save();
    }

    state = state.copyWith(isSaving: true, clearError: true);

    try {
      final published = await _repo.publishAssessment(state.assessment!.id);
      state = state.copyWith(
        assessment: published,
        originalAssessment: published,
        isSaving: false,
        hasUnsavedChanges: false,
      );
      return published;
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: e.toString(),
      );
      rethrow;
    }
  }

  /// Discard changes
  void discardChanges() {
    if (state.originalAssessment != null) {
      state = state.copyWith(
        assessment: state.originalAssessment,
        hasUnsavedChanges: false,
      );
    }
  }

  /// Clear the current assessment
  void clear() {
    state = const CurrentAssessmentState();
  }
}

/// Provider for current assessment being edited
final currentAssessmentProvider =
    StateNotifierProvider<CurrentAssessmentNotifier, CurrentAssessmentState>(
  (ref) => CurrentAssessmentNotifier(ref),
);

// ==========================================================================
// ASSESSMENT RESULTS STATE
// ==========================================================================

/// State for assessment results
class AssessmentResultsState {
  const AssessmentResultsState({
    this.results,
    this.submissions = const [],
    this.isLoading = false,
    this.error,
    this.selectedSubmissionId,
    this.sortBy = SubmissionSortBy.name,
    this.sortAscending = true,
    this.filterStatus,
  });

  final AssessmentResults? results;
  final List<AssessmentSubmission> submissions;
  final bool isLoading;
  final String? error;
  final String? selectedSubmissionId;
  final SubmissionSortBy sortBy;
  final bool sortAscending;
  final SubmissionStatus? filterStatus;

  /// Selected submission
  AssessmentSubmission? get selectedSubmission {
    if (selectedSubmissionId == null) return null;
    return submissions.firstWhere(
      (s) => s.id == selectedSubmissionId,
      orElse: () => submissions.first,
    );
  }

  /// Filtered and sorted submissions
  List<AssessmentSubmission> get sortedSubmissions {
    var filtered = submissions;

    // Apply filter
    if (filterStatus != null) {
      filtered = filtered.where((s) => s.status == filterStatus).toList();
    }

    // Apply sort
    filtered.sort((a, b) {
      int comparison;
      switch (sortBy) {
        case SubmissionSortBy.name:
          comparison = a.studentName.compareTo(b.studentName);
          break;
        case SubmissionSortBy.score:
          comparison = (a.score ?? 0).compareTo(b.score ?? 0);
          break;
        case SubmissionSortBy.submittedAt:
          final aTime = a.submittedAt ?? DateTime(2000);
          final bTime = b.submittedAt ?? DateTime(2000);
          comparison = aTime.compareTo(bTime);
          break;
        case SubmissionSortBy.status:
          comparison = a.status.index.compareTo(b.status.index);
          break;
      }
      return sortAscending ? comparison : -comparison;
    });

    return filtered;
  }

  /// Submissions needing grading
  List<AssessmentSubmission> get needsGrading =>
      submissions.where((s) => s.needsGrading).toList();

  AssessmentResultsState copyWith({
    AssessmentResults? results,
    List<AssessmentSubmission>? submissions,
    bool? isLoading,
    String? error,
    String? selectedSubmissionId,
    SubmissionSortBy? sortBy,
    bool? sortAscending,
    SubmissionStatus? filterStatus,
    bool clearError = false,
    bool clearFilter = false,
    bool clearSelection = false,
  }) {
    return AssessmentResultsState(
      results: results ?? this.results,
      submissions: submissions ?? this.submissions,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      selectedSubmissionId: clearSelection
          ? null
          : (selectedSubmissionId ?? this.selectedSubmissionId),
      sortBy: sortBy ?? this.sortBy,
      sortAscending: sortAscending ?? this.sortAscending,
      filterStatus: clearFilter ? null : (filterStatus ?? this.filterStatus),
    );
  }
}

/// Sort options for submissions
enum SubmissionSortBy { name, score, submittedAt, status }

// ==========================================================================
// ASSESSMENT RESULTS PROVIDER
// ==========================================================================

/// Notifier for assessment results
class AssessmentResultsNotifier extends StateNotifier<AssessmentResultsState> {
  AssessmentResultsNotifier(this._ref, this._assessmentId)
      : super(const AssessmentResultsState()) {
    loadResults();
  }

  final Ref _ref;
  final String _assessmentId;

  AssessmentRepository get _repo => _ref.read(assessmentRepositoryProvider);

  /// Load results and submissions
  Future<void> loadResults() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final results = await _repo.fetchAssessmentResults(_assessmentId);
      final submissions = await _repo.fetchSubmissions(_assessmentId);

      state = state.copyWith(
        results: results,
        submissions: submissions,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Refresh results
  Future<void> refresh() => loadResults();

  /// Select a submission for grading
  void selectSubmission(String? submissionId) {
    if (submissionId == null) {
      state = state.copyWith(clearSelection: true);
    } else {
      state = state.copyWith(selectedSubmissionId: submissionId);
    }
  }

  /// Set sort
  void setSort(SubmissionSortBy sortBy, {bool? ascending}) {
    final newAscending = sortBy == state.sortBy
        ? !(state.sortAscending)
        : (ascending ?? true);

    state = state.copyWith(
      sortBy: sortBy,
      sortAscending: newAscending,
    );
  }

  /// Set status filter
  void setStatusFilter(SubmissionStatus? status) {
    if (status == null) {
      state = state.copyWith(clearFilter: true);
    } else {
      state = state.copyWith(filterStatus: status);
    }
  }

  /// Grade a response
  Future<void> gradeResponse(
    String submissionId,
    String questionId, {
    required int score,
    String? feedback,
  }) async {
    try {
      await _repo.gradeResponse(
        submissionId,
        questionId,
        score: score,
        feedback: feedback,
      );

      // Refresh to get updated data
      await loadResults();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Finalize grades for a submission
  Future<void> finalizeGrades(String submissionId, {String? feedback}) async {
    try {
      await _repo.submitGrades(submissionId, overallFeedback: feedback);
      await loadResults();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

/// Provider for assessment results
final assessmentResultsProvider = StateNotifierProvider.family<
    AssessmentResultsNotifier, AssessmentResultsState, String>(
  (ref, assessmentId) => AssessmentResultsNotifier(ref, assessmentId),
);

// ==========================================================================
// QUESTION BANK STATE
// ==========================================================================

/// State for question bank search
class QuestionBankState {
  const QuestionBankState({
    this.questions = const [],
    this.isLoading = false,
    this.error,
    this.searchQuery = '',
    this.selectedType,
    this.selectedDifficulty,
    this.selectedTags = const [],
    this.hasMore = true,
    this.page = 1,
  });

  final List<Question> questions;
  final bool isLoading;
  final String? error;
  final String searchQuery;
  final QuestionType? selectedType;
  final Difficulty? selectedDifficulty;
  final List<String> selectedTags;
  final bool hasMore;
  final int page;

  QuestionBankState copyWith({
    List<Question>? questions,
    bool? isLoading,
    String? error,
    String? searchQuery,
    QuestionType? selectedType,
    Difficulty? selectedDifficulty,
    List<String>? selectedTags,
    bool? hasMore,
    int? page,
    bool clearError = false,
    bool clearType = false,
    bool clearDifficulty = false,
  }) {
    return QuestionBankState(
      questions: questions ?? this.questions,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      searchQuery: searchQuery ?? this.searchQuery,
      selectedType: clearType ? null : (selectedType ?? this.selectedType),
      selectedDifficulty:
          clearDifficulty ? null : (selectedDifficulty ?? this.selectedDifficulty),
      selectedTags: selectedTags ?? this.selectedTags,
      hasMore: hasMore ?? this.hasMore,
      page: page ?? this.page,
    );
  }
}

/// Notifier for question bank
class QuestionBankNotifier extends StateNotifier<QuestionBankState> {
  QuestionBankNotifier(this._ref) : super(const QuestionBankState());

  final Ref _ref;

  AssessmentRepository get _repo => _ref.read(assessmentRepositoryProvider);

  /// Search question bank
  Future<void> search({bool reset = true}) async {
    if (reset) {
      state = state.copyWith(questions: [], page: 1, hasMore: true);
    }

    if (!state.hasMore) return;

    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final questions = await _repo.searchQuestionBank(
        query: state.searchQuery.isEmpty ? null : state.searchQuery,
        type: state.selectedType,
        difficulty: state.selectedDifficulty,
        tags: state.selectedTags.isEmpty ? null : state.selectedTags,
        page: state.page,
      );

      state = state.copyWith(
        questions: reset ? questions : [...state.questions, ...questions],
        isLoading: false,
        page: state.page + 1,
        hasMore: questions.length >= 20,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Load more results
  Future<void> loadMore() => search(reset: false);

  /// Set search query
  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  /// Set type filter
  void setTypeFilter(QuestionType? type) {
    if (type == null) {
      state = state.copyWith(clearType: true);
    } else {
      state = state.copyWith(selectedType: type);
    }
    search();
  }

  /// Set difficulty filter
  void setDifficultyFilter(Difficulty? difficulty) {
    if (difficulty == null) {
      state = state.copyWith(clearDifficulty: true);
    } else {
      state = state.copyWith(selectedDifficulty: difficulty);
    }
    search();
  }

  /// Toggle tag
  void toggleTag(String tag) {
    final tags = [...state.selectedTags];
    if (tags.contains(tag)) {
      tags.remove(tag);
    } else {
      tags.add(tag);
    }
    state = state.copyWith(selectedTags: tags);
    search();
  }

  /// Clear filters
  void clearFilters() {
    state = state.copyWith(
      searchQuery: '',
      clearType: true,
      clearDifficulty: true,
      selectedTags: [],
    );
    search();
  }
}

/// Provider for question bank
final questionBankProvider =
    StateNotifierProvider<QuestionBankNotifier, QuestionBankState>(
  (ref) => QuestionBankNotifier(ref),
);

// ==========================================================================
// CONVENIENCE PROVIDERS
// ==========================================================================

/// Provider for assessment by ID
final assessmentByIdProvider =
    FutureProvider.family<Assessment?, String>((ref, id) async {
  final repo = ref.watch(assessmentRepositoryProvider);
  return repo.fetchAssessmentById(id);
});

/// Provider for current assessment questions
final currentAssessmentQuestionsProvider = Provider<List<Question>>((ref) {
  final state = ref.watch(currentAssessmentProvider);
  return state.assessment?.questions ?? [];
});

/// Provider for current assessment settings
final currentAssessmentSettingsProvider = Provider<AssessmentSettings?>((ref) {
  final state = ref.watch(currentAssessmentProvider);
  return state.assessment?.settings;
});

/// Provider for whether current assessment has unsaved changes
final hasUnsavedChangesProvider = Provider<bool>((ref) {
  final state = ref.watch(currentAssessmentProvider);
  return state.hasUnsavedChanges;
});

/// Provider for current question being edited
final currentQuestionProvider = Provider<Question?>((ref) {
  final state = ref.watch(currentAssessmentProvider);
  return state.currentQuestion;
});

/// Provider for total points in current assessment
final totalPointsProvider = Provider<int>((ref) {
  final state = ref.watch(currentAssessmentProvider);
  return state.assessment?.totalPoints ?? 0;
});
