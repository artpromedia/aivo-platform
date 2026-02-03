/// Riverpod providers for intervention state management
/// Handles AI-powered recommendations and teacher workflow
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/intervention.dart';
import '../repositories/intervention_repository.dart';
import 'core_providers.dart';

// ============================================================================
// STATE CLASSES
// ============================================================================

/// State for recommended interventions
class RecommendedInterventionsState {
  const RecommendedInterventionsState({
    this.suggestions = const [],
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  final List<InterventionSuggestion> suggestions;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  RecommendedInterventionsState copyWith({
    List<InterventionSuggestion>? suggestions,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return RecommendedInterventionsState(
      suggestions: suggestions ?? this.suggestions,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }

  /// Top N suggestions by relevance
  List<InterventionSuggestion> topSuggestions(int n) {
    return suggestions.take(n).toList();
  }

  /// Filter suggestions by category
  List<InterventionSuggestion> byCategory(InterventionCategory category) {
    return suggestions
        .where((s) => s.template.category == category)
        .toList();
  }
}

/// State for active interventions
class ActiveInterventionsState {
  const ActiveInterventionsState({
    this.interventions = const [],
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  final List<Intervention> interventions;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  ActiveInterventionsState copyWith({
    List<Intervention>? interventions,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return ActiveInterventionsState(
      interventions: interventions ?? this.interventions,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }

  /// Count of active interventions
  int get activeCount => interventions.length;

  /// Interventions by priority
  List<Intervention> get urgent =>
      interventions.where((i) => i.priority == InterventionPriority.urgent).toList();

  List<Intervention> get high =>
      interventions.where((i) => i.priority == InterventionPriority.high).toList();

  /// Overdue interventions
  List<Intervention> get overdue =>
      interventions.where((i) => i.isOverdue).toList();
}

/// State for intervention history
class InterventionHistoryState {
  const InterventionHistoryState({
    this.history,
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  final InterventionHistory? history;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  InterventionHistoryState copyWith({
    InterventionHistory? history,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return InterventionHistoryState(
      history: history ?? this.history,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }

  /// Whether there is any history data
  bool get hasHistory => history != null && history!.totalInterventions > 0;
}

// ============================================================================
// STATE NOTIFIERS
// ============================================================================

/// State notifier for recommended interventions
class RecommendedInterventionsNotifier extends StateNotifier<RecommendedInterventionsState> {
  RecommendedInterventionsNotifier(this._repository)
      : super(const RecommendedInterventionsState());

  final InterventionRepository _repository;
  String? _currentStudentId;

  /// Load recommendations for a student
  Future<void> loadRecommendations(
    String studentId, {
    List<String>? riskFactors,
    InterventionCategory? filterCategory,
  }) async {
    _currentStudentId = studentId;
    state = state.copyWith(isLoading: true, error: null);

    try {
      final suggestions = await _repository.fetchRecommendedInterventions(
        studentId,
        riskFactors: riskFactors,
        filterCategory: filterCategory,
      );

      state = state.copyWith(
        suggestions: suggestions,
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

  /// Refresh recommendations
  Future<void> refresh() async {
    if (_currentStudentId == null) return;
    await loadRecommendations(_currentStudentId!);
  }

  /// Clear state
  void clear() {
    _currentStudentId = null;
    state = const RecommendedInterventionsState();
  }
}

/// State notifier for active interventions
class ActiveInterventionsNotifier extends StateNotifier<ActiveInterventionsState> {
  ActiveInterventionsNotifier(this._repository)
      : super(const ActiveInterventionsState());

  final InterventionRepository _repository;
  String? _currentStudentId;

  /// Load active interventions for a student
  Future<void> loadActiveInterventions(String studentId) async {
    _currentStudentId = studentId;
    state = state.copyWith(isLoading: true, error: null);

    try {
      final interventions = await _repository.getActiveInterventions(studentId);

      state = state.copyWith(
        interventions: interventions,
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

  /// Create a new intervention
  Future<Intervention> createIntervention(Intervention intervention) async {
    try {
      final created = await _repository.createIntervention(intervention);

      // Add to current state
      state = state.copyWith(
        interventions: [...state.interventions, created],
      );

      return created;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  /// Update intervention status
  Future<void> updateStatus(
    String interventionId,
    InterventionStatus status, {
    String? notes,
  }) async {
    try {
      final updated = await _repository.updateInterventionStatus(
        interventionId,
        status,
        notes: notes,
        completedAt: status == InterventionStatus.completed ? DateTime.now() : null,
      );

      // Update in current state
      final updatedList = state.interventions.map((i) {
        return i.id == interventionId ? updated : i;
      }).toList();

      // Remove if no longer active
      final activeList = updatedList.where((i) => i.isActive).toList();

      state = state.copyWith(interventions: activeList);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  /// Refresh active interventions
  Future<void> refresh() async {
    if (_currentStudentId == null) return;
    await loadActiveInterventions(_currentStudentId!);
  }

  /// Clear state
  void clear() {
    _currentStudentId = null;
    state = const ActiveInterventionsState();
  }
}

/// State notifier for intervention history
class InterventionHistoryNotifier extends StateNotifier<InterventionHistoryState> {
  InterventionHistoryNotifier(this._repository)
      : super(const InterventionHistoryState());

  final InterventionRepository _repository;
  String? _currentStudentId;

  /// Load intervention history for a student
  Future<void> loadHistory(
    String studentId, {
    InterventionStatus? statusFilter,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    _currentStudentId = studentId;
    state = state.copyWith(isLoading: true, error: null);

    try {
      final history = await _repository.fetchInterventionHistory(
        studentId,
        statusFilter: statusFilter,
        startDate: startDate,
        endDate: endDate,
      );

      state = state.copyWith(
        history: history,
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

  /// Log an intervention outcome
  Future<void> logOutcome(InterventionOutcome outcome) async {
    try {
      await _repository.logInterventionOutcome(outcome);

      // Refresh history to include new outcome
      await refresh();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  /// Refresh history
  Future<void> refresh() async {
    if (_currentStudentId == null) return;
    await loadHistory(_currentStudentId!);
  }

  /// Clear state
  void clear() {
    _currentStudentId = null;
    state = const InterventionHistoryState();
  }
}

// ============================================================================
// PROVIDERS
// ============================================================================

/// Provider for the intervention repository
final interventionRepositoryProvider = Provider<InterventionRepository>((ref) {
  return InterventionRepository(
    api: ref.watch(apiClientProvider),
    db: ref.watch(localDatabaseProvider),
    sync: ref.watch(syncServiceProvider),
    connectivity: ref.watch(connectivityMonitorProvider),
  );
});

/// Provider for recommended interventions
final recommendedInterventionsProvider =
    StateNotifierProvider<RecommendedInterventionsNotifier, RecommendedInterventionsState>(
  (ref) {
    final repository = ref.watch(interventionRepositoryProvider);
    return RecommendedInterventionsNotifier(repository);
  },
);

/// Provider for active interventions
final activeInterventionsProvider =
    StateNotifierProvider<ActiveInterventionsNotifier, ActiveInterventionsState>(
  (ref) {
    final repository = ref.watch(interventionRepositoryProvider);
    return ActiveInterventionsNotifier(repository);
  },
);

/// Provider for intervention history
final interventionHistoryProvider =
    StateNotifierProvider<InterventionHistoryNotifier, InterventionHistoryState>(
  (ref) {
    final repository = ref.watch(interventionRepositoryProvider);
    return InterventionHistoryNotifier(repository);
  },
);

// ============================================================================
// FAMILY PROVIDERS
// ============================================================================

/// Family provider for fetching specific intervention
final interventionProvider = FutureProvider.family.autoDispose<
    Intervention,
    String
>((ref, interventionId) async {
  final repository = ref.watch(interventionRepositoryProvider);
  return repository.getIntervention(interventionId);
});

/// Family provider for fetching intervention templates
final interventionTemplatesProvider = FutureProvider.family.autoDispose<
    List<InterventionTemplate>,
    InterventionCategory?
>((ref, category) async {
  final repository = ref.watch(interventionRepositoryProvider);
  return repository.getInterventionTemplates(category: category);
});

/// Family provider for AI recommendations with specific risk factors
final aiRecommendationsProvider = FutureProvider.family.autoDispose<
    List<InterventionSuggestion>,
    ({String studentId, List<String> riskFactors})
>((ref, params) async {
  final repository = ref.watch(interventionRepositoryProvider);
  return repository.fetchRecommendedInterventions(
    params.studentId,
    riskFactors: params.riskFactors,
  );
});

// ============================================================================
// COMPUTED PROVIDERS
// ============================================================================

/// Provider for high-priority recommendations
final highPriorityRecommendationsProvider = Provider<List<InterventionSuggestion>>((ref) {
  final state = ref.watch(recommendedInterventionsProvider);
  return state.suggestions
      .where((s) => s.relevanceScore >= 0.7) // High relevance threshold
      .take(5)
      .toList();
});

/// Provider for urgent interventions count
final urgentInterventionsCountProvider = Provider<int>((ref) {
  final state = ref.watch(activeInterventionsProvider);
  return state.urgent.length;
});

/// Provider for overdue interventions
final overdueInterventionsProvider = Provider<List<Intervention>>((ref) {
  final state = ref.watch(activeInterventionsProvider);
  return state.overdue;
});

/// Provider for checking if student has active interventions
final hasActiveInterventionsProvider = Provider<bool>((ref) {
  final state = ref.watch(activeInterventionsProvider);
  return state.activeCount > 0;
});

/// Provider for intervention effectiveness summary
final interventionEffectivenessProvider = Provider<double?>((ref) {
  final state = ref.watch(interventionHistoryProvider);
  return state.history?.averageEffectiveness;
});

/// Provider for total risk reduction from interventions
final totalRiskReductionProvider = Provider<double?>((ref) {
  final state = ref.watch(interventionHistoryProvider);
  return state.history?.totalRiskReduction;
});

// ============================================================================
// FILTER PROVIDERS
// ============================================================================

/// Filter state for interventions
class InterventionFilterOptions {
  const InterventionFilterOptions({
    this.category,
    this.status,
    this.priority,
    this.startDate,
    this.endDate,
  });

  final InterventionCategory? category;
  final InterventionStatus? status;
  final InterventionPriority? priority;
  final DateTime? startDate;
  final DateTime? endDate;

  InterventionFilterOptions copyWith({
    InterventionCategory? category,
    InterventionStatus? status,
    InterventionPriority? priority,
    DateTime? startDate,
    DateTime? endDate,
  }) {
    return InterventionFilterOptions(
      category: category ?? this.category,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
    );
  }

  bool get hasActiveFilters =>
      category != null || status != null || priority != null || 
      startDate != null || endDate != null;
}

/// State notifier for intervention filters
class InterventionFilterNotifier extends StateNotifier<InterventionFilterOptions> {
  InterventionFilterNotifier() : super(const InterventionFilterOptions());

  void setCategory(InterventionCategory? category) {
    state = state.copyWith(category: category);
  }

  void setStatus(InterventionStatus? status) {
    state = state.copyWith(status: status);
  }

  void setPriority(InterventionPriority? priority) {
    state = state.copyWith(priority: priority);
  }

  void setDateRange(DateTime? start, DateTime? end) {
    state = InterventionFilterOptions(
      category: state.category,
      status: state.status,
      priority: state.priority,
      startDate: start,
      endDate: end,
    );
  }

  void clearFilters() {
    state = const InterventionFilterOptions();
  }
}

/// Provider for intervention filters
final interventionFilterProvider =
    StateNotifierProvider<InterventionFilterNotifier, InterventionFilterOptions>(
  (ref) => InterventionFilterNotifier(),
);

/// Filtered interventions based on current filter options
final filteredInterventionsProvider = Provider<List<Intervention>>((ref) {
  final state = ref.watch(activeInterventionsProvider);
  final filter = ref.watch(interventionFilterProvider);

  if (!filter.hasActiveFilters) {
    return state.interventions;
  }

  return state.interventions.where((intervention) {
    if (filter.category != null && intervention.category != filter.category) {
      return false;
    }
    if (filter.status != null && intervention.status != filter.status) {
      return false;
    }
    if (filter.priority != null && intervention.priority != filter.priority) {
      return false;
    }
    if (filter.startDate != null && 
        (intervention.startDate == null || 
         intervention.startDate!.isBefore(filter.startDate!))) {
      return false;
    }
    if (filter.endDate != null && 
        (intervention.endDate == null || 
         intervention.endDate!.isAfter(filter.endDate!))) {
      return false;
    }
    return true;
  }).toList();
});
