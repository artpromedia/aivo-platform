/// Riverpod providers for risk prediction state management
/// Handles loading, caching, and real-time updates for student risk data
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/risk_prediction.dart';
import '../repositories/risk_repository.dart';
import 'core_providers.dart';

/// State class for classroom risk overview
class ClassroomRiskState {
  const ClassroomRiskState({
    this.summary,
    this.earlyWarningReport,
    this.atRiskStudents = const [],
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  final ClassroomRiskSummary? summary;
  final EarlyWarningReport? earlyWarningReport;
  final List<EarlyWarningStudent> atRiskStudents;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  ClassroomRiskState copyWith({
    ClassroomRiskSummary? summary,
    EarlyWarningReport? earlyWarningReport,
    List<EarlyWarningStudent>? atRiskStudents,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return ClassroomRiskState(
      summary: summary ?? this.summary,
      earlyWarningReport: earlyWarningReport ?? this.earlyWarningReport,
      atRiskStudents: atRiskStudents ?? this.atRiskStudents,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }

  /// Whether we have any risk data loaded
  bool get hasData => summary != null || earlyWarningReport != null;

  /// Total students needing attention across all sources
  int get totalNeedingAttention {
    return summary?.studentsNeedingAttention ??
        (earlyWarningReport?.studentsNeedingAttention ?? 0);
  }

  /// Whether there are critical students
  bool get hasCriticalStudents {
    return earlyWarningReport?.criticalStudents.isNotEmpty ?? false;
  }
}

/// State notifier for classroom risk data
class ClassroomRiskNotifier extends StateNotifier<ClassroomRiskState> {
  ClassroomRiskNotifier(this._repository) : super(const ClassroomRiskState());

  final RiskRepository _repository;
  String? _currentClassId;

  /// Load risk summary for a classroom
  Future<void> loadClassroomRisk(String classId) async {
    _currentClassId = classId;
    state = state.copyWith(isLoading: true, error: null);

    try {
      // Load summary and early warning report in parallel
      final results = await Future.wait([
        _repository.getClassroomRiskSummary(classId),
        _repository.getEarlyWarningReport(classId),
        _repository.getAtRiskStudents(limit: 10),
      ]);

      state = state.copyWith(
        summary: results[0] as ClassroomRiskSummary,
        earlyWarningReport: results[1] as EarlyWarningReport,
        atRiskStudents: results[2] as List<EarlyWarningStudent>,
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

  /// Refresh risk data
  Future<void> refresh() async {
    if (_currentClassId == null) return;
    await loadClassroomRisk(_currentClassId!);
  }

  /// Load only at-risk students for dashboard
  Future<void> loadAtRiskStudents({int limit = 10}) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final students = await _repository.getAtRiskStudents(limit: limit);
      state = state.copyWith(
        atRiskStudents: students,
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

  /// Clear state
  void clear() {
    _currentClassId = null;
    state = const ClassroomRiskState();
  }
}

/// State class for individual student risk
class StudentRiskState {
  const StudentRiskState({
    this.prediction,
    this.interventions,
    this.history = const [],
    this.isLoading = false,
    this.isApproving = false,
    this.error,
    this.lastUpdated,
  });

  final RiskPrediction? prediction;
  final InterventionPlan? interventions;
  final List<RiskHistoryEntry> history;
  final bool isLoading;
  final bool isApproving;
  final String? error;
  final DateTime? lastUpdated;

  StudentRiskState copyWith({
    RiskPrediction? prediction,
    InterventionPlan? interventions,
    List<RiskHistoryEntry>? history,
    bool? isLoading,
    bool? isApproving,
    String? error,
    DateTime? lastUpdated,
  }) {
    return StudentRiskState(
      prediction: prediction ?? this.prediction,
      interventions: interventions ?? this.interventions,
      history: history ?? this.history,
      isLoading: isLoading ?? this.isLoading,
      isApproving: isApproving ?? this.isApproving,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }

  /// Whether student is at risk or critical
  bool get needsAttention =>
      prediction?.riskLevel.requiresAttention ?? false;

  /// Whether there are recommended interventions
  bool get hasInterventions =>
      interventions?.allRecommendations.isNotEmpty ?? false;
}

/// State notifier for individual student risk
class StudentRiskNotifier extends StateNotifier<StudentRiskState> {
  StudentRiskNotifier(this._repository) : super(const StudentRiskState());

  final RiskRepository _repository;
  String? _currentStudentId;

  /// Load risk prediction for a student
  Future<void> loadStudentRisk(
    String studentId, {
    bool includeInterventions = true,
  }) async {
    _currentStudentId = studentId;
    state = state.copyWith(isLoading: true, error: null);

    try {
      // Load prediction and history in parallel
      final results = await Future.wait([
        _repository.getStudentRisk(
          studentId,
          includeInterventions: includeInterventions,
        ),
        _repository.getStudentRiskHistory(studentId),
      ]);

      final riskData = results[0] as StudentRiskWithInterventions;
      final history = results[1] as List<RiskHistoryEntry>;

      state = state.copyWith(
        prediction: riskData.prediction,
        interventions: riskData.interventions,
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

  /// Refresh risk data
  Future<void> refresh() async {
    if (_currentStudentId == null) return;
    await loadStudentRisk(_currentStudentId!);
  }

  /// Approve an intervention
  Future<void> approveIntervention(
    String interventionId, {
    String? notes,
  }) async {
    if (_currentStudentId == null) return;

    state = state.copyWith(isApproving: true);

    try {
      await _repository.approveIntervention(
        _currentStudentId!,
        interventionId,
        notes: notes,
      );

      // Refresh to get updated intervention status
      await refresh();
    } catch (e) {
      state = state.copyWith(
        isApproving: false,
        error: e.toString(),
      );
    }
  }

  /// Log teacher contact with student
  Future<void> logContact({
    required String contactType,
    required String notes,
    DateTime? contactDate,
  }) async {
    if (_currentStudentId == null) return;

    try {
      await _repository.logTeacherContact(
        _currentStudentId!,
        contactType: contactType,
        notes: notes,
        contactDate: contactDate,
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Clear state
  void clear() {
    _currentStudentId = null;
    state = const StudentRiskState();
  }
}

// ============================================================================
// PROVIDERS
// ============================================================================

/// Provider for the risk repository
final riskRepositoryProvider = Provider<RiskRepository>((ref) {
  return RiskRepository(
    api: ref.watch(apiClientProvider),
    db: ref.watch(localDatabaseProvider),
    sync: ref.watch(syncServiceProvider),
    connectivity: ref.watch(connectivityMonitorProvider),
  );
});

/// Provider for classroom-level risk state
final classroomRiskProvider =
    StateNotifierProvider<ClassroomRiskNotifier, ClassroomRiskState>((ref) {
  final repository = ref.watch(riskRepositoryProvider);
  return ClassroomRiskNotifier(repository);
});

/// Provider for individual student risk state
final studentRiskProvider =
    StateNotifierProvider<StudentRiskNotifier, StudentRiskState>((ref) {
  final repository = ref.watch(riskRepositoryProvider);
  return StudentRiskNotifier(repository);
});

/// Family provider for loading specific student risk on demand
final studentRiskFamilyProvider = FutureProvider.family
    .autoDispose<StudentRiskWithInterventions, String>((ref, studentId) async {
  final repository = ref.watch(riskRepositoryProvider);
  return repository.getStudentRisk(studentId);
});

/// Family provider for batch loading multiple student risks
final batchStudentRisksProvider = FutureProvider.family
    .autoDispose<List<RiskPrediction>, List<String>>((ref, studentIds) async {
  final repository = ref.watch(riskRepositoryProvider);
  return repository.getBatchRiskPredictions(studentIds);
});

/// Provider for student risk history
final studentRiskHistoryProvider = FutureProvider.family
    .autoDispose<List<RiskHistoryEntry>, String>((ref, studentId) async {
  final repository = ref.watch(riskRepositoryProvider);
  return repository.getStudentRiskHistory(studentId);
});

/// Computed provider for students needing immediate attention
final criticalStudentsProvider = Provider<List<EarlyWarningStudent>>((ref) {
  final state = ref.watch(classroomRiskProvider);
  return state.earlyWarningReport?.criticalStudents ?? [];
});

/// Computed provider for all students needing attention (critical + at-risk)
final studentsNeedingAttentionProvider =
    Provider<List<EarlyWarningStudent>>((ref) {
  final state = ref.watch(classroomRiskProvider);
  final report = state.earlyWarningReport;
  if (report == null) return state.atRiskStudents;

  return [
    ...report.criticalStudents,
    ...report.atRiskStudents,
  ];
});

/// Provider for risk distribution summary
final riskDistributionProvider = Provider<RiskDistribution?>((ref) {
  final state = ref.watch(classroomRiskProvider);
  final summary = state.summary;
  if (summary == null) return null;

  return RiskDistribution(
    onTrack: summary.riskDistribution[RiskLevel.onTrack] ?? 0,
    watch: summary.riskDistribution[RiskLevel.watch] ?? 0,
    atRisk: summary.riskDistribution[RiskLevel.atRisk] ?? 0,
    critical: summary.riskDistribution[RiskLevel.critical] ?? 0,
  );
});

/// Provider for checking if there are any alerts to show
final hasRiskAlertsProvider = Provider<bool>((ref) {
  final state = ref.watch(classroomRiskProvider);
  return state.hasCriticalStudents || state.totalNeedingAttention > 0;
});

/// Provider for recommended interventions for current student
final recommendedInterventionsProvider =
    Provider<List<InterventionRecommendation>>((ref) {
  final state = ref.watch(studentRiskProvider);
  return state.interventions?.primaryRecommendations ?? [];
});

/// Provider for checking if current student needs immediate action
final needsImmediateActionProvider = Provider<bool>((ref) {
  final state = ref.watch(studentRiskProvider);
  return state.interventions?.requiresImmediateAction ?? false;
});

// ============================================================================
// PHASE 1 ENHANCEMENTS - Advanced Risk Prediction Providers
// ============================================================================

/// State class for student risk profile
class StudentRiskProfileState {
  const StudentRiskProfileState({
    this.profile,
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  final StudentRiskProfile? profile;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  StudentRiskProfileState copyWith({
    StudentRiskProfile? profile,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return StudentRiskProfileState(
      profile: profile ?? this.profile,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }

  /// Whether there are active predictive indicators
  bool get hasActiveIndicators => profile?.activeIndicators.isNotEmpty ?? false;

  /// Whether there are critical indicators
  bool get hasCriticalIndicators => profile?.criticalIndicators.isNotEmpty ?? false;
}

/// AsyncNotifier for student risk profile
class StudentRiskProfileNotifier extends AsyncNotifier<StudentRiskProfile> {
  @override
  Future<StudentRiskProfile> build() async {
    // Return empty state initially
    throw UnimplementedError('Call loadProfile() with studentId');
  }

  /// Load profile for a specific student
  Future<void> loadProfile(String studentId, {String period = 'month'}) async {
    state = const AsyncValue.loading();

    state = await AsyncValue.guard(() async {
      final repository = ref.read(riskRepositoryProvider);
      return repository.fetchStudentRiskProfile(studentId, period: period);
    });
  }

  /// Refresh the current profile
  Future<void> refresh() async {
    final current = state.value;
    if (current == null) return;

    await loadProfile(current.studentId);
  }
}

/// State class for class risk summary
class ClassRiskSummaryState {
  const ClassRiskSummaryState({
    this.overview,
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  final ClassRiskOverview? overview;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  ClassRiskSummaryState copyWith({
    ClassRiskOverview? overview,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return ClassRiskSummaryState(
      overview: overview ?? this.overview,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }

  /// Number of students requiring urgent attention
  int get urgentStudentsCount => overview?.urgentStudents.length ?? 0;

  /// Whether there are students needing attention
  bool get hasUrgentStudents => urgentStudentsCount > 0;
}

/// State notifier for class risk summary
class ClassRiskSummaryNotifier extends StateNotifier<ClassRiskSummaryState> {
  ClassRiskSummaryNotifier(this._repository) : super(const ClassRiskSummaryState());

  final RiskRepository _repository;
  String? _currentClassId;

  /// Load risk overview for a class
  Future<void> loadOverview(String classId, {bool includeStudentProfiles = true}) async {
    _currentClassId = classId;
    state = state.copyWith(isLoading: true, error: null);

    try {
      final overview = await _repository.fetchClassRiskOverview(
        classId,
        includeStudentProfiles: includeStudentProfiles,
      );

      state = state.copyWith(
        overview: overview,
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

  /// Refresh the current overview
  Future<void> refresh() async {
    if (_currentClassId == null) return;
    await loadOverview(_currentClassId!);
  }

  /// Clear state
  void clear() {
    _currentClassId = null;
    state = const ClassRiskSummaryState();
  }
}

/// Risk filter options
class RiskFilterOptions {
  const RiskFilterOptions({
    this.riskType,
    this.severity,
    this.trendDirection,
    this.minConfidence,
  });

  final RiskCategory? riskType;
  final RiskSeverity? severity;
  final RiskTrend? trendDirection;
  final double? minConfidence;

  RiskFilterOptions copyWith({
    RiskCategory? riskType,
    RiskSeverity? severity,
    RiskTrend? trendDirection,
    double? minConfidence,
  }) {
    return RiskFilterOptions(
      riskType: riskType ?? this.riskType,
      severity: severity ?? this.severity,
      trendDirection: trendDirection ?? this.trendDirection,
      minConfidence: minConfidence ?? this.minConfidence,
    );
  }

  /// Whether any filters are active
  bool get hasActiveFilters =>
      riskType != null || severity != null || trendDirection != null || minConfidence != null;

  /// Clear all filters
  RiskFilterOptions clear() {
    return const RiskFilterOptions();
  }
}

/// State notifier for risk filter
class RiskFilterNotifier extends StateNotifier<RiskFilterOptions> {
  RiskFilterNotifier() : super(const RiskFilterOptions());

  /// Set risk type filter
  void setRiskType(RiskCategory? type) {
    state = state.copyWith(riskType: type);
  }

  /// Set severity filter
  void setSeverity(RiskSeverity? severity) {
    state = state.copyWith(severity: severity);
  }

  /// Set trend direction filter
  void setTrendDirection(RiskTrend? trend) {
    state = state.copyWith(trendDirection: trend);
  }

  /// Set minimum confidence filter
  void setMinConfidence(double? confidence) {
    state = state.copyWith(minConfidence: confidence);
  }

  /// Clear all filters
  void clearFilters() {
    state = const RiskFilterOptions();
  }
}

// ============================================================================
// PHASE 1 PROVIDERS
// ============================================================================

/// Provider for student risk profile (AsyncNotifier)
final studentRiskProfileProvider =
    AsyncNotifierProvider<StudentRiskProfileNotifier, StudentRiskProfile>(() {
  return StudentRiskProfileNotifier();
});

/// Provider for class risk summary
final classRiskSummaryProvider =
    StateNotifierProvider<ClassRiskSummaryNotifier, ClassRiskSummaryState>((ref) {
  final repository = ref.watch(riskRepositoryProvider);
  return ClassRiskSummaryNotifier(repository);
});

/// Provider for risk filter options
final riskFilterProvider =
    StateNotifierProvider<RiskFilterNotifier, RiskFilterOptions>((ref) {
  return RiskFilterNotifier();
});

/// Family provider for fetching risk trends
final riskTrendsProvider = FutureProvider.family.autoDispose<
    RiskTrendAnalysis,
    ({String studentId, DateTime? startDate, DateTime? endDate})
>((ref, params) async {
  final repository = ref.watch(riskRepositoryProvider);
  return repository.fetchRiskTrends(
    params.studentId,
    startDate: params.startDate,
    endDate: params.endDate,
  );
});

/// Family provider for fetching predictive indicators
final predictiveIndicatorsProvider = FutureProvider.family.autoDispose<
    List<PredictiveIndicator>,
    ({String studentId, RiskCategory? category, RiskSeverity? minSeverity})
>((ref, params) async {
  final repository = ref.watch(riskRepositoryProvider);
  return repository.fetchPredictiveIndicators(
    params.studentId,
    category: params.category,
    minSeverity: params.minSeverity,
  );
});

/// Family provider for fetching historical risk data
final historicalRiskDataProvider = FutureProvider.family.autoDispose<
    HistoricalRiskData,
    ({String studentId, DateTime startDate, DateTime endDate, String aggregation})
>((ref, params) async {
  final repository = ref.watch(riskRepositoryProvider);
  return repository.fetchHistoricalRiskData(
    params.studentId,
    startDate: params.startDate,
    endDate: params.endDate,
    aggregation: params.aggregation,
  );
});

/// Stream provider for real-time risk alerts
/// This would connect to WebSocket or Firebase for real-time updates
final riskAlertStreamProvider = StreamProvider.autoDispose<RiskAlert>((ref) async* {
  // TODO: Implement WebSocket/Firebase connection for real-time alerts
  // For now, return an empty stream
  // In production, this would subscribe to backend push notifications
  yield* const Stream<RiskAlert>.empty();
});

/// Filtered predictive indicators based on current filter options
final filteredPredictiveIndicatorsProvider = Provider.family<
    List<PredictiveIndicator>?,
    List<PredictiveIndicator>
>((ref, indicators) {
  final filter = ref.watch(riskFilterProvider);

  if (!filter.hasActiveFilters) return indicators;

  return indicators.where((indicator) {
    if (filter.riskType != null && indicator.category != filter.riskType) {
      return false;
    }
    if (filter.severity != null && indicator.severity != filter.severity) {
      return false;
    }
    if (filter.minConfidence != null &&
        (indicator.confidence ?? 0) < filter.minConfidence!) {
      return false;
    }
    return true;
  }).toList();
});

/// Filtered student profiles based on trend and risk level
final filteredStudentProfilesProvider = Provider.family<
    List<StudentRiskProfile>?,
    List<StudentRiskProfile>
>((ref, profiles) {
  final filter = ref.watch(riskFilterProvider);

  if (!filter.hasActiveFilters) return profiles;

  return profiles.where((profile) {
    if (filter.trendDirection != null &&
        profile.trendAnalysis.direction != filter.trendDirection) {
      return false;
    }
    if (filter.minConfidence != null &&
        profile.currentRisk.confidence < filter.minConfidence!) {
      return false;
    }
    return true;
  }).toList();
});

/// Model for risk alerts
class RiskAlert {
  const RiskAlert({
    required this.studentId,
    required this.studentName,
    required this.alertType,
    required this.severity,
    required this.message,
    required this.timestamp,
    this.actionRequired,
  });

  final String studentId;
  final String studentName;
  final String alertType; // 'risk_level_change', 'indicator_triggered', etc.
  final RiskSeverity severity;
  final String message;
  final DateTime timestamp;
  final String? actionRequired;
}
