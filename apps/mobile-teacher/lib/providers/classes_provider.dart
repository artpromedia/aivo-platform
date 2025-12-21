/// Classes Provider
///
/// State management for class data.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../repositories/repositories.dart';
import 'core_providers.dart';

// ============================================================================
// State Classes
// ============================================================================

/// Classes state.
class ClassesState {
  const ClassesState({
    this.classes = const [],
    this.selectedClassId,
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  final List<ClassGroup> classes;
  final String? selectedClassId;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  ClassGroup? get selectedClass => 
    classes.where((c) => c.id == selectedClassId).firstOrNull;

  ClassesState copyWith({
    List<ClassGroup>? classes,
    String? selectedClassId,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return ClassesState(
      classes: classes ?? this.classes,
      selectedClassId: selectedClassId ?? this.selectedClassId,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

// ============================================================================
// State Notifier
// ============================================================================

/// Classes notifier.
class ClassesNotifier extends StateNotifier<ClassesState> {
  ClassesNotifier(this._repository) : super(const ClassesState());

  final ClassRepository _repository;

  /// Load all classes.
  Future<void> loadClasses() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final classes = await _repository.getClasses();
      state = state.copyWith(
        classes: classes,
        isLoading: false,
        lastUpdated: DateTime.now(),
        selectedClassId: state.selectedClassId ?? classes.firstOrNull?.id,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Refresh classes from server.
  Future<void> refreshClasses() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final classes = await _repository.refreshClasses();
      state = state.copyWith(
        classes: classes,
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

  /// Select a class.
  void selectClass(String classId) {
    state = state.copyWith(selectedClassId: classId);
  }
}

// ============================================================================
// Providers
// ============================================================================

/// Classes state provider.
final classesProvider = StateNotifierProvider<ClassesNotifier, ClassesState>((ref) {
  final repository = ref.watch(classRepositoryProvider);
  return ClassesNotifier(repository);
});

/// Single class provider.
final classProvider = FutureProvider.family<ClassGroup?, String>((ref, id) async {
  final repository = ref.watch(classRepositoryProvider);
  return repository.getClass(id);
});

/// Selected class provider.
final selectedClassProvider = Provider<ClassGroup?>((ref) {
  final state = ref.watch(classesProvider);
  return state.selectedClass;
});

/// Class metrics provider.
final classMetricsProvider = FutureProvider.family<ClassMetrics?, ClassMetricsParams>((ref, params) async {
  final repository = ref.watch(classRepositoryProvider);
  return repository.getClassMetrics(params.classId, params.range);
});

/// Parameters for class metrics.
class ClassMetricsParams {
  const ClassMetricsParams({
    required this.classId,
    required this.range,
  });

  final String classId;
  final DateRange range;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ClassMetricsParams &&
        other.classId == classId &&
        other.range == range;
  }

  @override
  int get hashCode => classId.hashCode ^ range.hashCode;
}

/// Engagement heatmap provider.
final engagementHeatmapProvider = FutureProvider.family<EngagementHeatmap?, String>((ref, classId) async {
  final repository = ref.watch(classRepositoryProvider);
  return repository.getEngagementHeatmap(classId);
});

/// Goal progress summary provider.
final goalProgressSummaryProvider = FutureProvider.family<GoalProgressSummary?, String>((ref, classId) async {
  final repository = ref.watch(classRepositoryProvider);
  return repository.getGoalProgress(classId);
});

/// Student alerts for class provider.
final classAlertsProvider = FutureProvider.family<List<StudentAlert>, String>((ref, classId) async {
  final repository = ref.watch(classRepositoryProvider);
  return repository.getAlerts(classId);
});
