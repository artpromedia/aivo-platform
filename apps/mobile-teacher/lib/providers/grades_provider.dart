/// Grades Provider
///
/// State management for grades and gradebook data.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../repositories/repositories.dart';
import 'core_providers.dart';

// ============================================================================
// State Classes
// ============================================================================

/// Gradebook state.
class GradebookState {
  const GradebookState({
    this.gradebook,
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  final Gradebook? gradebook;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  bool get hasData => gradebook != null;

  GradebookState copyWith({
    Gradebook? gradebook,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return GradebookState(
      gradebook: gradebook ?? this.gradebook,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

// ============================================================================
// Gradebook Notifier
// ============================================================================

/// Gradebook notifier.
class GradebookNotifier extends StateNotifier<GradebookState> {
  GradebookNotifier(this._repository, this._classId) : super(const GradebookState());

  final GradeRepository _repository;
  final String _classId;

  /// Load the gradebook.
  Future<void> loadGradebook() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final gradebook = await _repository.getGradebook(_classId);
      state = state.copyWith(
        gradebook: gradebook,
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

  /// Refresh the gradebook from server.
  Future<void> refreshGradebook() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final gradebook = await _repository.refreshGradebook(_classId);
      state = state.copyWith(
        gradebook: gradebook,
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

  /// Update a grade inline.
  Future<void> updateGrade(
    String studentId,
    String assignmentId,
    UpdateGradeDto dto,
  ) async {
    try {
      await _repository.updateGrade(studentId, assignmentId, dto);
      // Refresh to get updated calculations
      await loadGradebook();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Excuse a grade.
  Future<void> excuseGrade(String studentId, String assignmentId) async {
    try {
      await _repository.excuseGrade(studentId, assignmentId);
      await loadGradebook();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Unexcuse a grade.
  Future<void> unexcuseGrade(String studentId, String assignmentId) async {
    try {
      await _repository.unexcuseGrade(studentId, assignmentId);
      await loadGradebook();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Recalculate all grades.
  Future<void> recalculateGrades() async {
    try {
      await _repository.recalculateClassGrades(_classId);
      await loadGradebook();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Export gradebook.
  Future<String?> exportGradebook({String format = 'csv'}) async {
    try {
      return await _repository.exportGradebook(_classId, format: format);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }
}

// ============================================================================
// Grade Entry State
// ============================================================================

/// State for individual grade editing.
class GradeEditState {
  const GradeEditState({
    this.grade,
    this.isLoading = false,
    this.isSaving = false,
    this.error,
  });

  final GradeEntry? grade;
  final bool isLoading;
  final bool isSaving;
  final String? error;

  GradeEditState copyWith({
    GradeEntry? grade,
    bool? isLoading,
    bool? isSaving,
    String? error,
  }) {
    return GradeEditState(
      grade: grade ?? this.grade,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: error,
    );
  }
}

/// Grade edit notifier.
class GradeEditNotifier extends StateNotifier<GradeEditState> {
  GradeEditNotifier(this._repository, this._studentId, this._assignmentId)
      : super(const GradeEditState());

  final GradeRepository _repository;
  final String _studentId;
  final String _assignmentId;

  /// Load the grade.
  Future<void> loadGrade() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final grade = await _repository.getGrade(_studentId, _assignmentId);
      state = state.copyWith(
        grade: grade,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Save the grade.
  Future<bool> saveGrade(UpdateGradeDto dto) async {
    state = state.copyWith(isSaving: true, error: null);

    try {
      final updated = await _repository.updateGrade(_studentId, _assignmentId, dto);
      state = state.copyWith(
        grade: updated,
        isSaving: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: e.toString(),
      );
      return false;
    }
  }

  /// Excuse the grade.
  Future<bool> excuse() async {
    state = state.copyWith(isSaving: true, error: null);

    try {
      final updated = await _repository.excuseGrade(_studentId, _assignmentId);
      state = state.copyWith(
        grade: updated,
        isSaving: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: e.toString(),
      );
      return false;
    }
  }

  /// Unexcuse the grade.
  Future<bool> unexcuse() async {
    state = state.copyWith(isSaving: true, error: null);

    try {
      final updated = await _repository.unexcuseGrade(_studentId, _assignmentId);
      state = state.copyWith(
        grade: updated,
        isSaving: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: e.toString(),
      );
      return false;
    }
  }
}

// ============================================================================
// Student Grades State
// ============================================================================

/// State for a student's grades.
class StudentGradesState {
  const StudentGradesState({
    this.grades = const [],
    this.overallGrade,
    this.isLoading = false,
    this.error,
  });

  final List<GradeEntry> grades;
  final StudentGrade? overallGrade;
  final bool isLoading;
  final String? error;

  StudentGradesState copyWith({
    List<GradeEntry>? grades,
    StudentGrade? overallGrade,
    bool? isLoading,
    String? error,
  }) {
    return StudentGradesState(
      grades: grades ?? this.grades,
      overallGrade: overallGrade ?? this.overallGrade,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Student grades notifier.
class StudentGradesNotifier extends StateNotifier<StudentGradesState> {
  StudentGradesNotifier(this._repository, this._studentId)
      : super(const StudentGradesState());

  final GradeRepository _repository;
  final String _studentId;

  /// Load student's grades.
  Future<void> loadGrades() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final grades = await _repository.getGradesByStudent(_studentId);
      state = state.copyWith(
        grades: grades,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }
}

// ============================================================================
// Providers
// ============================================================================

/// Gradebook provider for a class.
final gradebookProvider = StateNotifierProvider.family<GradebookNotifier, GradebookState, String>((ref, classId) {
  final repository = ref.watch(gradeRepositoryProvider);
  return GradebookNotifier(repository, classId);
});

/// Grade edit provider.
final gradeEditProvider = StateNotifierProvider.family<GradeEditNotifier, GradeEditState, ({String studentId, String assignmentId})>((ref, params) {
  final repository = ref.watch(gradeRepositoryProvider);
  return GradeEditNotifier(repository, params.studentId, params.assignmentId);
});

/// Student grades provider.
final studentGradesProvider = StateNotifierProvider.family<StudentGradesNotifier, StudentGradesState, String>((ref, studentId) {
  final repository = ref.watch(gradeRepositoryProvider);
  return StudentGradesNotifier(repository, studentId);
});

/// Student overall grade provider.
final studentOverallGradeProvider = FutureProvider.family<StudentGrade?, ({String classId, String studentId})>((ref, params) async {
  final repository = ref.watch(gradeRepositoryProvider);
  return repository.getStudentGrade(params.classId, params.studentId);
});

/// Class grades provider (all students).
final classGradesProvider = FutureProvider.family<List<StudentGrade>, String>((ref, classId) async {
  final repository = ref.watch(gradeRepositoryProvider);
  return repository.getClassGrades(classId);
});

/// Grade audit log provider.
final gradeAuditProvider = FutureProvider.family<List<GradeAuditEntry>, ({String? studentId, String? assignmentId})>((ref, params) async {
  final repository = ref.watch(gradeRepositoryProvider);
  return repository.getAuditLog(
    studentId: params.studentId,
    assignmentId: params.assignmentId,
  );
});

/// Students at risk (grade below threshold).
final studentsAtRiskProvider = Provider.family<List<GradebookStudent>, String>((ref, classId) {
  final gradebookState = ref.watch(gradebookProvider(classId));
  if (gradebookState.gradebook == null) return [];

  const riskThreshold = 70.0;
  return gradebookState.gradebook!.students.where((student) {
    final grade = student.overallGrade;
    if (grade == null || grade.percent == null) return false;
    return grade.percent! < riskThreshold;
  }).toList();
});

/// Students with missing assignments.
final studentsWithMissingProvider = Provider.family<List<GradebookStudent>, String>((ref, classId) {
  final gradebookState = ref.watch(gradebookProvider(classId));
  if (gradebookState.gradebook == null) return [];

  return gradebookState.gradebook!.students.where((student) {
    final grade = student.overallGrade;
    return grade != null && grade.assignmentsMissing > 0;
  }).toList();
});
