/// Students Provider
///
/// State management for student data.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../repositories/repositories.dart';
import 'core_providers.dart';

// ============================================================================
// State Classes
// ============================================================================

/// Students state.
class StudentsState {
  const StudentsState({
    this.students = const [],
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  final List<Student> students;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  StudentsState copyWith({
    List<Student>? students,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return StudentsState(
      students: students ?? this.students,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

// ============================================================================
// State Notifier
// ============================================================================

/// Students notifier.
class StudentsNotifier extends StateNotifier<StudentsState> {
  StudentsNotifier(this._repository) : super(const StudentsState());

  final StudentRepository _repository;

  /// Load all students.
  Future<void> loadStudents() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final students = await _repository.getStudents();
      state = state.copyWith(
        students: students,
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

  /// Refresh students from server.
  Future<void> refreshStudents() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final students = await _repository.refreshStudents();
      state = state.copyWith(
        students: students,
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

  /// Update a student.
  Future<void> updateStudent(String id, UpdateStudentDto dto) async {
    try {
      final updated = await _repository.updateStudent(id, dto);
      state = state.copyWith(
        students: state.students.map((s) => s.id == id ? updated : s).toList(),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Get students by class.
  Future<List<Student>> getStudentsByClass(String classId) async {
    return _repository.getStudentsByClass(classId);
  }
}

// ============================================================================
// Providers
// ============================================================================

/// Students state provider.
final studentsProvider = StateNotifierProvider<StudentsNotifier, StudentsState>((ref) {
  final repository = ref.watch(studentRepositoryProvider);
  return StudentsNotifier(repository);
});

/// Single student provider.
final studentProvider = FutureProvider.family<Student?, String>((ref, id) async {
  final repository = ref.watch(studentRepositoryProvider);
  return repository.getStudent(id);
});

/// Students by class provider.
final studentsByClassProvider = FutureProvider.family<List<Student>, String>((ref, classId) async {
  final repository = ref.watch(studentRepositoryProvider);
  return repository.getStudentsByClass(classId);
});

/// Students with IEP provider.
final studentsWithIepProvider = Provider<List<Student>>((ref) {
  final state = ref.watch(studentsProvider);
  return state.students.where((s) => s.hasIep).toList();
});

/// Students requiring attention provider.
final studentsRequiringAttentionProvider = Provider<List<Student>>((ref) {
  final state = ref.watch(studentsProvider);
  return state.students.where((s) => s.needsAttention).toList();
});
