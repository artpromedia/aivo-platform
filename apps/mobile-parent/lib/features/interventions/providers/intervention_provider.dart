/// Intervention Providers
///
/// Riverpod providers for intervention state management.
library;

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/api_client.dart';
import '../api/intervention_api.dart';
import '../models/intervention_history.dart';

part 'intervention_provider.g.dart';

/// Provider for Intervention API client.
@riverpod
InterventionApi interventionApi(InterventionApiRef ref) {
  final dio = ref.watch(dioProvider);
  return InterventionApi(dio: dio);
}

/// Fetch intervention history for a child.
@riverpod
Future<List<InterventionRecord>> interventionHistory(
  InterventionHistoryRef ref,
  String childId,
) async {
  final api = ref.watch(interventionApiProvider);
  return api.fetchInterventionHistory(childId);
}

/// Fetch active interventions for a child.
@riverpod
Future<List<InterventionRecord>> activeInterventions(
  ActiveInterventionsRef ref,
  String childId,
) async {
  final api = ref.watch(interventionApiProvider);
  return api.fetchActiveInterventions(childId);
}

/// Fetch details of a specific intervention.
@riverpod
Future<InterventionRecord> interventionDetails(
  InterventionDetailsRef ref,
  String interventionId,
) async {
  final api = ref.watch(interventionApiProvider);
  return api.fetchInterventionDetails(interventionId);
}

/// Fetch outcomes for an intervention.
@riverpod
Future<InterventionOutcome?> interventionOutcomes(
  InterventionOutcomesRef ref,
  String interventionId,
) async {
  final api = ref.watch(interventionApiProvider);
  return api.fetchInterventionOutcomes(interventionId);
}

/// Fetch intervention summary for a child.
@riverpod
Future<InterventionSummary> interventionSummary(
  InterventionSummaryRef ref,
  String childId,
) async {
  final api = ref.watch(interventionApiProvider);
  return api.fetchInterventionSummary(childId);
}

/// Fetch evidence for an intervention.
@riverpod
Future<List<InterventionEvidence>> interventionEvidence(
  InterventionEvidenceRef ref,
  String interventionId,
) async {
  final api = ref.watch(interventionApiProvider);
  return api.fetchInterventionEvidence(interventionId);
}

/// Selected filter state for intervention list.
@riverpod
class InterventionFilter extends _$InterventionFilter {
  @override
  InterventionFilterState build() => const InterventionFilterState();

  void setStatus(InterventionStatus? status) {
    state = state.copyWith(status: status);
  }

  void setCategory(InterventionCategory? category) {
    state = state.copyWith(category: category);
  }

  void clear() {
    state = const InterventionFilterState();
  }
}

/// Filter state for interventions.
class InterventionFilterState {
  const InterventionFilterState({
    this.status,
    this.category,
  });

  final InterventionStatus? status;
  final InterventionCategory? category;

  InterventionFilterState copyWith({
    InterventionStatus? status,
    InterventionCategory? category,
  }) {
    return InterventionFilterState(
      status: status ?? this.status,
      category: category ?? this.category,
    );
  }
}
