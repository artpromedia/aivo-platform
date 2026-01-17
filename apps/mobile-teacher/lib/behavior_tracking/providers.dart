/// Behavior Tracking Providers
///
/// Riverpod providers for behavior tracking state management.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import 'behavior_api.dart';
import 'models.dart';

/// Behavior tracking API provider.
final behaviorApiProvider = Provider<BehaviorTrackingApi>((ref) {
  return BehaviorTrackingApi(client: http.Client());
});

/// Behavior incidents provider for a student.
final behaviorIncidentsProvider = FutureProvider.family<List<BehaviorIncident>,
    ({String studentId, String? startDate, String? endDate})>(
  (ref, params) async {
    final api = ref.watch(behaviorApiProvider);
    return api.getIncidents(
      studentId: params.studentId,
      startDate: params.startDate,
      endDate: params.endDate,
    );
  },
);

/// Behavior pattern provider for a student.
final behaviorPatternProvider = FutureProvider.family<BehaviorPattern,
    ({String studentId, String? startDate, String? endDate})>(
  (ref, params) async {
    final api = ref.watch(behaviorApiProvider);
    return api.getPatterns(
      studentId: params.studentId,
      startDate: params.startDate,
      endDate: params.endDate,
    );
  },
);

/// Behavior trends provider for a student.
final behaviorTrendsProvider = FutureProvider.family<List<BehaviorTrend>,
    ({String studentId, String? startDate, String? endDate, String? groupBy})>(
  (ref, params) async {
    final api = ref.watch(behaviorApiProvider);
    return api.getTrends(
      studentId: params.studentId,
      startDate: params.startDate,
      endDate: params.endDate,
      groupBy: params.groupBy,
    );
  },
);

/// Behavior interventions provider for a student.
final behaviorInterventionsProvider = FutureProvider.family<
    List<BehaviorIntervention>, ({String studentId, InterventionStatus? status})>(
  (ref, params) async {
    final api = ref.watch(behaviorApiProvider);
    return api.getInterventions(
      studentId: params.studentId,
      status: params.status,
    );
  },
);

/// Intervention logs provider.
final interventionLogsProvider = FutureProvider.family<List<InterventionLog>,
    ({String interventionId, String? startDate, String? endDate})>(
  (ref, params) async {
    final api = ref.watch(behaviorApiProvider);
    return api.getInterventionLogs(
      interventionId: params.interventionId,
      startDate: params.startDate,
      endDate: params.endDate,
    );
  },
);

/// Intervention templates provider.
final interventionTemplatesProvider = FutureProvider.family<
    List<InterventionTemplate>, ({BehaviorType? behaviorType, String? category})>(
  (ref, params) async {
    final api = ref.watch(behaviorApiProvider);
    return api.getInterventionTemplates(
      behaviorType: params.behaviorType,
      category: params.category,
    );
  },
);

/// Behavior report provider.
final behaviorReportProvider = FutureProvider.family<BehaviorReport,
    ({String studentId, String startDate, String endDate})>(
  (ref, params) async {
    final api = ref.watch(behaviorApiProvider);
    return api.generateReport(
      studentId: params.studentId,
      startDate: params.startDate,
      endDate: params.endDate,
    );
  },
);

/// Incident creation state notifier.
class IncidentCreationNotifier extends StateNotifier<AsyncValue<BehaviorIncident?>> {
  IncidentCreationNotifier(this._api) : super(const AsyncValue.data(null));

  final BehaviorTrackingApi _api;

  Future<void> createIncident(BehaviorIncident incident) async {
    state = const AsyncValue.loading();
    try {
      final created = await _api.createIncident(incident);
      state = AsyncValue.data(created);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  void reset() {
    state = const AsyncValue.data(null);
  }
}

final incidentCreationProvider =
    StateNotifierProvider<IncidentCreationNotifier, AsyncValue<BehaviorIncident?>>(
  (ref) => IncidentCreationNotifier(ref.watch(behaviorApiProvider)),
);

/// Intervention creation state notifier.
class InterventionCreationNotifier
    extends StateNotifier<AsyncValue<BehaviorIntervention?>> {
  InterventionCreationNotifier(this._api) : super(const AsyncValue.data(null));

  final BehaviorTrackingApi _api;

  Future<void> createIntervention(BehaviorIntervention intervention) async {
    state = const AsyncValue.loading();
    try {
      final created = await _api.createIntervention(intervention);
      state = AsyncValue.data(created);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  void reset() {
    state = const AsyncValue.data(null);
  }
}

final interventionCreationProvider = StateNotifierProvider<
    InterventionCreationNotifier, AsyncValue<BehaviorIntervention?>>(
  (ref) => InterventionCreationNotifier(ref.watch(behaviorApiProvider)),
);
