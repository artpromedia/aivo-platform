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
