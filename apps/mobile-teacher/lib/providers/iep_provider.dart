/// IEP Provider
///
/// State management for IEP goals and progress.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../repositories/repositories.dart';
import 'core_providers.dart';

// ============================================================================
// State Classes
// ============================================================================

/// IEP state.
class IepState {
  const IepState({
    this.goals = const [],
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  final List<IepGoal> goals;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  IepState copyWith({
    List<IepGoal>? goals,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return IepState(
      goals: goals ?? this.goals,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

// ============================================================================
// State Notifier
// ============================================================================

/// IEP notifier.
class IepNotifier extends StateNotifier<IepState> {
  IepNotifier(this._repository) : super(const IepState());

  final IepRepository _repository;

  /// Load all goals for all students.
  Future<void> loadAllGoals() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final goals = await _repository.getAllGoals();
      state = state.copyWith(
        goals: goals,
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

  /// Load goals for a specific student.
  Future<void> loadGoals(String studentId) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final goals = await _repository.getGoals(studentId);
      
      // Merge with existing goals
      final existingGoals = state.goals.where((g) => g.studentId != studentId);
      
      state = state.copyWith(
        goals: [...existingGoals, ...goals],
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

  /// Record progress on a goal.
  Future<void> recordProgress(RecordProgressDto dto) async {
    try {
      final progress = await _repository.recordProgress(dto);
      
      // Update goal in state
      final updatedGoals = state.goals.map((g) {
        if (g.id != dto.goalId) return g;
        return g.copyWith(
          currentValue: dto.value,
          progressHistory: [...g.progressHistory, progress],
          updatedAt: DateTime.now(),
        );
      }).toList();
      
      state = state.copyWith(goals: updatedGoals);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

// ============================================================================
// Providers
// ============================================================================

/// IEP state provider.
final iepProvider = StateNotifierProvider<IepNotifier, IepState>((ref) {
  final repository = ref.watch(iepRepositoryProvider);
  return IepNotifier(repository);
});

/// Goals for a specific student provider.
final studentGoalsProvider = FutureProvider.family<List<IepGoal>, String>((ref, studentId) async {
  final repository = ref.watch(iepRepositoryProvider);
  return repository.getGoals(studentId);
});

/// Goals at risk provider.
final goalsAtRiskProvider = FutureProvider<List<IepGoal>>((ref) async {
  final repository = ref.watch(iepRepositoryProvider);
  return repository.getGoalsAtRisk();
});

/// Goal recommendations for a student provider.
final goalRecommendationsProvider = FutureProvider.family<List<GoalRecommendation>, String>((ref, studentId) async {
  final repository = ref.watch(iepRepositoryProvider);
  return repository.getRecommendations(studentId);
});

/// IEP report provider.
final iepReportProvider = FutureProvider.family<IepReport?, IepReportParams>((ref, params) async {
  final repository = ref.watch(iepRepositoryProvider);
  return repository.generateReport(params.studentId, params.range);
});

/// Parameters for IEP report.
class IepReportParams {
  const IepReportParams({
    required this.studentId,
    required this.range,
  });

  final String studentId;
  final DateRange range;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is IepReportParams &&
        other.studentId == studentId &&
        other.range == range;
  }

  @override
  int get hashCode => studentId.hashCode ^ range.hashCode;
}

/// Goals by status provider.
final goalsByStatusProvider = Provider.family<List<IepGoal>, GoalStatus>((ref, status) {
  final state = ref.watch(iepProvider);
  return state.goals.where((g) => g.status == status).toList();
});

/// Goals by category provider.
final goalsByCategoryProvider = Provider.family<List<IepGoal>, GoalCategory>((ref, category) {
  final state = ref.watch(iepProvider);
  return state.goals.where((g) => g.category == category).toList();
});
