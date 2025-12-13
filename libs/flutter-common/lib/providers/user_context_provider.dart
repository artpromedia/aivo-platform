/// User Context Provider
///
/// Provides user context for multi-child (parent) and multi-class (teacher) scenarios.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api.dart';
import '../data/learner.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// CHILD SELECTION (FOR PARENTS)
// ═══════════════════════════════════════════════════════════════════════════════

/// State for parent's children list and selection.
class ChildrenState {
  const ChildrenState({
    this.children = const [],
    this.selectedChildId,
    this.isLoading = false,
    this.error,
  });

  final List<Learner> children;
  final String? selectedChildId;
  final bool isLoading;
  final String? error;

  /// Get the selected child.
  Learner? get selectedChild {
    if (selectedChildId == null) return null;
    return children.firstWhere(
      (c) => c.id == selectedChildId,
      orElse: () => children.first,
    );
  }

  ChildrenState copyWith({
    List<Learner>? children,
    String? selectedChildId,
    bool? isLoading,
    String? error,
  }) {
    return ChildrenState(
      children: children ?? this.children,
      selectedChildId: selectedChildId ?? this.selectedChildId,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Notifier for managing children list and selection.
class ChildrenNotifier extends StateNotifier<ChildrenState> {
  ChildrenNotifier(this._apiClient) : super(const ChildrenState());

  final AivoApiClient _apiClient;

  /// Load children for the current parent.
  Future<void> loadChildren() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _apiClient.get(ApiEndpoints.learners);
      final data = response.data as List<dynamic>? ?? [];
      final children = data
          .whereType<Map<String, dynamic>>()
          .map((json) => Learner.fromJson(json))
          .toList();

      state = state.copyWith(
        children: children,
        isLoading: false,
        selectedChildId: state.selectedChildId ?? children.firstOrNull?.id,
      );
    } catch (e) {
      final apiError = extractApiException(e);
      state = state.copyWith(
        isLoading: false,
        error: apiError?.message ?? 'Failed to load children',
      );
    }
  }

  /// Select a child.
  void selectChild(String childId) {
    state = state.copyWith(selectedChildId: childId);
  }

  /// Add a new child.
  Future<bool> addChild({
    required String name,
    required int gradeLevel,
    DateTime? birthDate,
  }) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.learners,
        data: {
          'name': name,
          'gradeLevel': gradeLevel,
          if (birthDate != null) 'birthDate': birthDate.toIso8601String(),
        },
      );

      final data = response.data as Map<String, dynamic>?;
      if (data != null) {
        final newChild = Learner.fromJson(data);
        state = state.copyWith(
          children: [...state.children, newChild],
          selectedChildId: newChild.id,
        );
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Update a child.
  Future<bool> updateChild(String childId, {String? name, int? gradeLevel}) async {
    try {
      await _apiClient.patch(
        ApiEndpoints.learner(childId),
        data: {
          if (name != null) 'name': name,
          if (gradeLevel != null) 'gradeLevel': gradeLevel,
        },
      );

      // Refresh children list
      await loadChildren();
      return true;
    } catch (_) {
      return false;
    }
  }
}

/// Provider for children state.
final childrenNotifierProvider =
    StateNotifierProvider<ChildrenNotifier, ChildrenState>((ref) {
  final apiClient = AivoApiClient.instance;
  return ChildrenNotifier(apiClient);
});

/// Provider for the list of children.
final childrenListProvider = Provider<List<Learner>>((ref) {
  return ref.watch(childrenNotifierProvider).children;
});

/// Provider for the selected child.
final selectedChildProvider = Provider<Learner?>((ref) {
  return ref.watch(childrenNotifierProvider).selectedChild;
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS SELECTION (FOR TEACHERS)
// ═══════════════════════════════════════════════════════════════════════════════

/// Classroom model.
class Classroom {
  const Classroom({
    required this.id,
    required this.name,
    required this.gradeLevel,
    this.studentCount = 0,
    this.subject,
  });

  final String id;
  final String name;
  final int gradeLevel;
  final int studentCount;
  final String? subject;

  factory Classroom.fromJson(Map<String, dynamic> json) {
    return Classroom(
      id: json['id'] as String,
      name: json['name'] as String,
      gradeLevel: json['gradeLevel'] as int? ?? 0,
      studentCount: json['studentCount'] as int? ?? 0,
      subject: json['subject'] as String?,
    );
  }
}

/// State for teacher's classes.
class ClassroomsState {
  const ClassroomsState({
    this.classrooms = const [],
    this.selectedClassId,
    this.isLoading = false,
    this.error,
  });

  final List<Classroom> classrooms;
  final String? selectedClassId;
  final bool isLoading;
  final String? error;

  Classroom? get selectedClass {
    if (selectedClassId == null) return null;
    return classrooms.firstWhere(
      (c) => c.id == selectedClassId,
      orElse: () => classrooms.first,
    );
  }

  ClassroomsState copyWith({
    List<Classroom>? classrooms,
    String? selectedClassId,
    bool? isLoading,
    String? error,
  }) {
    return ClassroomsState(
      classrooms: classrooms ?? this.classrooms,
      selectedClassId: selectedClassId ?? this.selectedClassId,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Notifier for managing teacher's classes.
class ClassroomsNotifier extends StateNotifier<ClassroomsState> {
  ClassroomsNotifier(this._apiClient) : super(const ClassroomsState());

  final AivoApiClient _apiClient;

  /// Load classrooms for the current teacher.
  Future<void> loadClassrooms() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _apiClient.get(ApiEndpoints.classrooms);
      final data = response.data as List<dynamic>? ?? [];
      final classrooms = data
          .whereType<Map<String, dynamic>>()
          .map((json) => Classroom.fromJson(json))
          .toList();

      state = state.copyWith(
        classrooms: classrooms,
        isLoading: false,
        selectedClassId: state.selectedClassId ?? classrooms.firstOrNull?.id,
      );
    } catch (e) {
      final apiError = extractApiException(e);
      state = state.copyWith(
        isLoading: false,
        error: apiError?.message ?? 'Failed to load classes',
      );
    }
  }

  /// Select a class.
  void selectClass(String classId) {
    state = state.copyWith(selectedClassId: classId);
  }
}

/// Provider for classrooms state.
final classroomsNotifierProvider =
    StateNotifierProvider<ClassroomsNotifier, ClassroomsState>((ref) {
  final apiClient = AivoApiClient.instance;
  return ClassroomsNotifier(apiClient);
});

/// Provider for selected classroom.
final selectedClassroomProvider = Provider<Classroom?>((ref) {
  return ref.watch(classroomsNotifierProvider).selectedClass;
});
