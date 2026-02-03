/// Monitoring Providers
///
/// State management for real-time monitoring and SEL.
library;

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/monitoring.dart';
import '../repositories/monitoring_repository.dart';
import '../repositories/repositories.dart';

/// Provider for monitoring repository.
final monitoringRepositoryProvider = Provider<MonitoringRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return MonitoringRepository(dio: dio);
});

// ============================================================
// Engagement Heatmap Providers
// ============================================================

/// State for heatmap.
class HeatmapState {
  const HeatmapState({
    this.heatmap,
    this.isLoading = false,
    this.error,
    this.lastUpdated,
    this.autoRefresh = true,
  });

  final EngagementHeatmap? heatmap;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;
  final bool autoRefresh;

  HeatmapState copyWith({
    EngagementHeatmap? heatmap,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
    bool? autoRefresh,
  }) {
    return HeatmapState(
      heatmap: heatmap ?? this.heatmap,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      autoRefresh: autoRefresh ?? this.autoRefresh,
    );
  }
}

/// Notifier for real-time heatmap.
class HeatmapNotifier extends StateNotifier<HeatmapState> {
  HeatmapNotifier(this._repository, this._classId) : super(const HeatmapState()) {
    _startAutoRefresh();
  }

  final MonitoringRepository _repository;
  final String _classId;
  Timer? _refreshTimer;

  void _startAutoRefresh() {
    _refreshTimer?.cancel();
    if (state.autoRefresh) {
      _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) => refresh());
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final heatmap = await _repository.fetchEngagementHeatmap(_classId);
      state = state.copyWith(
        heatmap: heatmap,
        isLoading: false,
        lastUpdated: DateTime.now(),
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setAutoRefresh(bool enabled) {
    state = state.copyWith(autoRefresh: enabled);
    if (enabled) {
      _startAutoRefresh();
    } else {
      _refreshTimer?.cancel();
    }
  }

  Future<void> sendNudge(String studentId, {String? message}) async {
    await _repository.sendNudge(_classId, studentId, message: message);
  }

  Future<void> flagStudent(String studentId, String flag) async {
    await _repository.flagStudent(_classId, studentId, flag);
  }
}

/// Provider for heatmap notifier.
final heatmapProvider =
    StateNotifierProvider.family<HeatmapNotifier, HeatmapState, String>((ref, classId) {
  final repo = ref.watch(monitoringRepositoryProvider);
  return HeatmapNotifier(repo, classId);
});

/// Provider for students needing attention.
final studentsNeedingAttentionProvider =
    Provider.family<List<StudentActivity>, String>((ref, classId) {
  final heatmapState = ref.watch(heatmapProvider(classId));
  return heatmapState.heatmap?.needsAttention ?? [];
});

// ============================================================
// SEL Observation Providers
// ============================================================

/// State for SEL observations.
class SELObservationsState {
  const SELObservationsState({
    this.observations = const [],
    this.isLoading = false,
    this.error,
    this.studentFilter,
    this.competencyFilter,
  });

  final List<SELObservation> observations;
  final bool isLoading;
  final String? error;
  final String? studentFilter;
  final SELCompetency? competencyFilter;

  SELObservationsState copyWith({
    List<SELObservation>? observations,
    bool? isLoading,
    String? error,
    String? studentFilter,
    SELCompetency? competencyFilter,
  }) {
    return SELObservationsState(
      observations: observations ?? this.observations,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      studentFilter: studentFilter ?? this.studentFilter,
      competencyFilter: competencyFilter ?? this.competencyFilter,
    );
  }
}

/// Notifier for SEL observations.
class SELObservationsNotifier extends StateNotifier<SELObservationsState> {
  SELObservationsNotifier(this._repository, this._classId)
      : super(const SELObservationsState());

  final MonitoringRepository _repository;
  final String _classId;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final observations = await _repository.fetchObservations(
        _classId,
        studentId: state.studentFilter,
        competency: state.competencyFilter,
      );
      state = state.copyWith(observations: observations, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setStudentFilter(String? studentId) {
    state = state.copyWith(studentFilter: studentId);
    load();
  }

  void setCompetencyFilter(SELCompetency? competency) {
    state = state.copyWith(competencyFilter: competency);
    load();
  }

  Future<SELObservation> addObservation(SELObservation observation) async {
    final created = await _repository.createObservation(_classId, observation);
    state = state.copyWith(observations: [created, ...state.observations]);
    return created;
  }

  Future<void> updateObservation(SELObservation observation) async {
    final updated = await _repository.updateObservation(_classId, observation);
    state = state.copyWith(
      observations: state.observations.map((o) => o.id == updated.id ? updated : o).toList(),
    );
  }

  Future<void> deleteObservation(String observationId) async {
    await _repository.deleteObservation(_classId, observationId);
    state = state.copyWith(
      observations: state.observations.where((o) => o.id != observationId).toList(),
    );
  }

  Future<SELObservation> logQuickObservation(String studentId, String presetId, {String? note}) async {
    final observation = await _repository.logQuickObservation(_classId, studentId, presetId, note: note);
    state = state.copyWith(observations: [observation, ...state.observations]);
    return observation;
  }
}

/// Provider for SEL observations notifier.
final selObservationsProvider =
    StateNotifierProvider.family<SELObservationsNotifier, SELObservationsState, String>(
        (ref, classId) {
  final repo = ref.watch(monitoringRepositoryProvider);
  return SELObservationsNotifier(repo, classId);
});

/// Provider for student SEL summary.
final studentSELSummaryProvider =
    FutureProvider.family<SELSummary, ({String classId, String studentId})>((ref, params) async {
  final repo = ref.watch(monitoringRepositoryProvider);
  return repo.fetchStudentSELSummary(params.classId, params.studentId);
});

/// Provider for class SEL summary.
final classSELSummaryProvider =
    FutureProvider.family<List<SELSummary>, String>((ref, classId) async {
  final repo = ref.watch(monitoringRepositoryProvider);
  return repo.fetchClassSELSummary(classId);
});

/// Provider for observation presets.
final observationPresetsProvider = FutureProvider<List<ObservationPreset>>((ref) async {
  final repo = ref.watch(monitoringRepositoryProvider);
  return repo.fetchObservationPresets();
});

/// Quick observation modal state.
class QuickObservationState {
  const QuickObservationState({
    this.selectedStudent,
    this.selectedPreset,
    this.note = '',
    this.isSubmitting = false,
  });

  final String? selectedStudent;
  final ObservationPreset? selectedPreset;
  final String note;
  final bool isSubmitting;

  QuickObservationState copyWith({
    String? selectedStudent,
    ObservationPreset? selectedPreset,
    String? note,
    bool? isSubmitting,
  }) {
    return QuickObservationState(
      selectedStudent: selectedStudent ?? this.selectedStudent,
      selectedPreset: selectedPreset ?? this.selectedPreset,
      note: note ?? this.note,
      isSubmitting: isSubmitting ?? this.isSubmitting,
    );
  }
}

/// Provider for quick observation state.
final quickObservationStateProvider =
    StateProvider.autoDispose<QuickObservationState>((ref) => const QuickObservationState());
