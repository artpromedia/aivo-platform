/// Intervention API
///
/// API endpoints for intervention history.
library;

import 'package:dio/dio.dart';

import '../models/intervention_history.dart';

/// API client for intervention endpoints.
class InterventionApi {
  InterventionApi({required this.dio});

  final Dio dio;

  /// Fetch all interventions for a child.
  Future<List<InterventionRecord>> fetchInterventionHistory(
    String childId, {
    InterventionStatus? status,
    InterventionCategory? category,
  }) async {
    final response = await dio.get(
      '/interventions/children/$childId/history',
      queryParameters: {
        if (status != null) 'status': status.name,
        if (category != null) 'category': category.name,
      },
    );
    final data = response.data as List;
    return data
        .map((json) => InterventionRecord.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Fetch active interventions for a child.
  Future<List<InterventionRecord>> fetchActiveInterventions(
    String childId,
  ) async {
    final response = await dio.get(
      '/interventions/children/$childId/active',
    );
    final data = response.data as List;
    return data
        .map((json) => InterventionRecord.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Fetch details of a specific intervention.
  Future<InterventionRecord> fetchInterventionDetails(
    String interventionId,
  ) async {
    final response = await dio.get('/interventions/$interventionId');
    return InterventionRecord.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetch outcomes for an intervention.
  Future<InterventionOutcome?> fetchInterventionOutcomes(
    String interventionId,
  ) async {
    try {
      final response = await dio.get('/interventions/$interventionId/outcomes');
      return InterventionOutcome.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Fetch intervention summary for a child.
  Future<InterventionSummary> fetchInterventionSummary(String childId) async {
    final response = await dio.get('/interventions/children/$childId/summary');
    return InterventionSummary.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetch evidence for an intervention.
  Future<List<InterventionEvidence>> fetchInterventionEvidence(
    String interventionId,
  ) async {
    final response = await dio.get('/interventions/$interventionId/evidence');
    final data = response.data as List;
    return data
        .map((json) =>
            InterventionEvidence.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}
