/// Assignments Provider
///
/// State management for assignment data.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../repositories/repositories.dart';
import 'core_providers.dart';

// ============================================================================
// State Classes
// ============================================================================

/// Assignments state.
class AssignmentsState {
  const AssignmentsState({
    this.assignments = const [],
    this.isLoading = false,
    this.error,
    this.lastUpdated,
    this.filterClassId,
    this.filterStatus,
  });

  final List<Assignment> assignments;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;
  final String? filterClassId;
  final AssignmentStatus? filterStatus;

  List<Assignment> get filteredAssignments {
    var result = assignments;
    if (filterClassId != null) {
      result = result.where((a) => a.classId == filterClassId).toList();
    }
    if (filterStatus != null) {
      result = result.where((a) => a.status == filterStatus).toList();
    }
    return result;
  }

  List<Assignment> get draftAssignments =>
      assignments.where((a) => a.status == AssignmentStatus.draft).toList();

  List<Assignment> get publishedAssignments =>
      assignments.where((a) => a.status == AssignmentStatus.published).toList();

  List<Assignment> get pastDueAssignments =>
      assignments.where((a) => a.isPastDue).toList();

  List<Assignment> get needsGrading =>
      assignments.where((a) => a.ungradedCount > 0).toList();

  AssignmentsState copyWith({
    List<Assignment>? assignments,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
    String? filterClassId,
    AssignmentStatus? filterStatus,
  }) {
    return AssignmentsState(
      assignments: assignments ?? this.assignments,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      filterClassId: filterClassId ?? this.filterClassId,
      filterStatus: filterStatus ?? this.filterStatus,
    );
  }
}

// ============================================================================
// State Notifier
// ============================================================================

/// Assignments notifier.
class AssignmentsNotifier extends StateNotifier<AssignmentsState> {
  AssignmentsNotifier(this._repository) : super(const AssignmentsState());

  final AssignmentRepository _repository;

  /// Load all assignments.
  Future<void> loadAssignments() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final assignments = await _repository.getAssignments();
      state = state.copyWith(
        assignments: assignments,
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

  /// Load assignments for a specific class.
  Future<void> loadAssignmentsByClass(String classId) async {
    state = state.copyWith(isLoading: true, error: null, filterClassId: classId);

    try {
      final assignments = await _repository.getAssignmentsByClass(classId);
      state = state.copyWith(
        assignments: assignments,
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

  /// Refresh assignments from server.
  Future<void> refreshAssignments() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final assignments = await _repository.refreshAssignments();
      state = state.copyWith(
        assignments: assignments,
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

  /// Create a new assignment.
  Future<Assignment?> createAssignment(CreateAssignmentDto dto) async {
    try {
      final assignment = await _repository.createAssignment(dto);
      state = state.copyWith(
        assignments: [...state.assignments, assignment],
      );
      return assignment;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }

  /// Update an assignment.
  Future<void> updateAssignment(String id, UpdateAssignmentDto dto) async {
    try {
      final updated = await _repository.updateAssignment(id, dto);
      state = state.copyWith(
        assignments: state.assignments.map((a) => a.id == id ? updated : a).toList(),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Publish an assignment.
  Future<void> publishAssignment(String id) async {
    try {
      final published = await _repository.publishAssignment(id);
      state = state.copyWith(
        assignments: state.assignments.map((a) => a.id == id ? published : a).toList(),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Delete an assignment.
  Future<void> deleteAssignment(String id) async {
    try {
      await _repository.deleteAssignment(id);
      state = state.copyWith(
        assignments: state.assignments.where((a) => a.id != id).toList(),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Duplicate an assignment.
  Future<Assignment?> duplicateAssignment(String id) async {
    try {
      final duplicated = await _repository.duplicateAssignment(id);
      state = state.copyWith(
        assignments: [...state.assignments, duplicated],
      );
      return duplicated;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }

  /// Set filter by class.
  void setClassFilter(String? classId) {
    state = state.copyWith(filterClassId: classId);
  }

  /// Set filter by status.
  void setStatusFilter(AssignmentStatus? status) {
    state = state.copyWith(filterStatus: status);
  }

  /// Clear filters.
  void clearFilters() {
    state = AssignmentsState(
      assignments: state.assignments,
      isLoading: state.isLoading,
      error: state.error,
      lastUpdated: state.lastUpdated,
    );
  }
}

// ============================================================================
// Submissions State
// ============================================================================

/// Submissions state for an assignment.
class SubmissionsState {
  const SubmissionsState({
    this.submissions = const [],
    this.isLoading = false,
    this.error,
  });

  final List<Submission> submissions;
  final bool isLoading;
  final String? error;

  List<Submission> get graded =>
      submissions.where((s) => s.status == SubmissionStatus.graded).toList();

  List<Submission> get ungraded =>
      submissions.where((s) =>
          s.status == SubmissionStatus.submitted ||
          s.status == SubmissionStatus.late
      ).toList();

  List<Submission> get missing =>
      submissions.where((s) => s.status == SubmissionStatus.missing).toList();

  SubmissionsState copyWith({
    List<Submission>? submissions,
    bool? isLoading,
    String? error,
  }) {
    return SubmissionsState(
      submissions: submissions ?? this.submissions,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Submissions notifier.
class SubmissionsNotifier extends StateNotifier<SubmissionsState> {
  SubmissionsNotifier(this._repository, this._assignmentId)
      : super(const SubmissionsState());

  final AssignmentRepository _repository;
  final String _assignmentId;

  /// Load submissions.
  Future<void> loadSubmissions() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final submissions = await _repository.getSubmissions(_assignmentId);
      state = state.copyWith(
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

  /// Grade a submission.
  Future<void> gradeSubmission(String submissionId, GradeSubmissionDto dto) async {
    try {
      final graded = await _repository.gradeSubmission(
        _assignmentId,
        submissionId,
        dto,
      );
      state = state.copyWith(
        submissions: state.submissions
            .map((s) => s.id == submissionId ? graded : s)
            .toList(),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Return a submission.
  Future<void> returnSubmission(String submissionId) async {
    try {
      final returned = await _repository.returnSubmission(_assignmentId, submissionId);
      state = state.copyWith(
        submissions: state.submissions
            .map((s) => s.id == submissionId ? returned : s)
            .toList(),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Mark missing as zero.
  Future<void> markMissingAsZero() async {
    try {
      await _repository.markMissingAsZero(_assignmentId);
      await loadSubmissions();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

// ============================================================================
// Providers
// ============================================================================

/// Assignments state provider.
final assignmentsProvider = StateNotifierProvider<AssignmentsNotifier, AssignmentsState>((ref) {
  final repository = ref.watch(assignmentRepositoryProvider);
  return AssignmentsNotifier(repository);
});

/// Single assignment provider.
final assignmentProvider = FutureProvider.family<Assignment?, String>((ref, id) async {
  final repository = ref.watch(assignmentRepositoryProvider);
  return repository.getAssignment(id);
});

/// Assignments by class provider.
final assignmentsByClassProvider = FutureProvider.family<List<Assignment>, String>((ref, classId) async {
  final repository = ref.watch(assignmentRepositoryProvider);
  return repository.getAssignmentsByClass(classId);
});

/// Submissions provider for an assignment.
final submissionsProvider = StateNotifierProvider.family<SubmissionsNotifier, SubmissionsState, String>((ref, assignmentId) {
  final repository = ref.watch(assignmentRepositoryProvider);
  return SubmissionsNotifier(repository, assignmentId);
});

/// Categories provider for a class.
final categoriesProvider = FutureProvider.family<List<AssignmentCategory>, String>((ref, classId) async {
  final repository = ref.watch(assignmentRepositoryProvider);
  return repository.getCategories(classId);
});

/// Assignments needing grading count.
final ungradedCountProvider = Provider<int>((ref) {
  final state = ref.watch(assignmentsProvider);
  return state.assignments.fold(0, (sum, a) => sum + a.ungradedCount);
});

/// Past due assignments count.
final pastDueCountProvider = Provider<int>((ref) {
  final state = ref.watch(assignmentsProvider);
  return state.pastDueAssignments.length;
});
