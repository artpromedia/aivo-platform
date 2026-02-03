/// Repository for intervention management and recommendations
/// Implements offline-first pattern with AI-powered suggestions
library;

import 'package:flutter_common/flutter_common.dart';
import '../models/intervention.dart';
import '../services/database/local_database.dart';
import '../services/sync/sync_service.dart';
import '../services/sync/connectivity_monitor.dart';

/// Repository for managing student interventions
class InterventionRepository {
  InterventionRepository({
    required AivoApiClient api,
    required TeacherLocalDatabase db,
    required SyncService sync,
    required ConnectivityMonitor connectivity,
  })  : _api = api,
        _db = db,
        _sync = sync,
        _connectivity = connectivity;

  final AivoApiClient _api;
  final TeacherLocalDatabase _db;
  final SyncService _sync;
  final ConnectivityMonitor _connectivity;

  // API base paths
  static const String _interventionBasePath = '/api/interventions';
  static const String _mlBasePath = '/api/ml-recommendation/predictive-analytics';

  /// Fetch AI-powered intervention recommendations for a student
  Future<List<InterventionSuggestion>> fetchRecommendedInterventions(
    String studentId, {
    List<String>? riskFactors,
    InterventionCategory? filterCategory,
    int? limit,
  }) async {
    if (!await _connectivity.isOnline) {
      final cached = await _db.getCachedInterventionSuggestions(studentId);
      return cached
          .map((json) => InterventionSuggestion.fromJson(json as Map<String, dynamic>))
          .toList();
    }

    return _retryWithBackoff(() async {
      final queryParams = <String, dynamic>{};
      if (riskFactors != null && riskFactors.isNotEmpty) {
        queryParams['risk_factors'] = riskFactors.join(',');
      }
      if (filterCategory != null) {
        queryParams['category'] = filterCategory.name;
      }
      if (limit != null) {
        queryParams['limit'] = limit;
      }

      final response = await _api.get(
        '$_mlBasePath/interventions/recommend/$studentId',
        queryParameters: queryParams,
      );

      final suggestions = (response.data as List<dynamic>)
          .map((json) => InterventionSuggestion.fromJson(json as Map<String, dynamic>))
          .toList();

      // Sort by relevance score
      suggestions.sort((a, b) => b.relevanceScore.compareTo(a.relevanceScore));

      // Cache the suggestions
      await _db.cacheInterventionSuggestions(
        studentId,
        suggestions.map((s) => s.toJson()).toList(),
      );

      return suggestions;
    });
  }

  /// Create a new intervention for a student
  Future<Intervention> createIntervention(Intervention intervention) async {
    if (await _connectivity.isOnline) {
      try {
        final response = await _api.post(
          _interventionBasePath,
          data: intervention.toJson(),
        );

        final created = Intervention.fromJson(response.data as Map<String, dynamic>);

        // Cache the intervention
        await _db.cacheIntervention(created);

        return created;
      } catch (e) {
        // If online but API fails, queue for sync
        await _sync.queueCreate(
          entityType: 'intervention',
          entityId: intervention.studentId,
          data: intervention.toJson(),
        );
        rethrow;
      }
    }

    // Offline: queue for sync
    await _sync.queueCreate(
      entityType: 'intervention',
      entityId: intervention.studentId,
      data: intervention.toJson(),
    );

    // Return intervention with temporary ID
    final tempIntervention = intervention.copyWith(
      id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
    );

    // Cache locally
    await _db.cacheIntervention(tempIntervention);

    return tempIntervention;
  }

  /// Update intervention status
  Future<Intervention> updateInterventionStatus(
    String interventionId,
    InterventionStatus status, {
    String? notes,
    DateTime? completedAt,
  }) async {
    final updateData = {
      'status': status.name,
      if (notes != null) 'notes': notes,
      if (completedAt != null) 'completedAt': completedAt.toIso8601String(),
      'lastUpdated': DateTime.now().toIso8601String(),
    };

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.patch(
          '$_interventionBasePath/$interventionId/status',
          data: updateData,
        );

        final updated = Intervention.fromJson(response.data as Map<String, dynamic>);

        // Update cache
        await _db.cacheIntervention(updated);

        return updated;
      } catch (e) {
        // Queue for sync
        await _sync.queueUpdate(
          entityType: 'intervention',
          entityId: interventionId,
          data: updateData,
        );
        rethrow;
      }
    }

    // Offline: queue for sync
    await _sync.queueUpdate(
      entityType: 'intervention',
      entityId: interventionId,
      data: updateData,
    );

    // Try to update local cache
    final cached = await _db.getCachedIntervention(interventionId);
    if (cached != null) {
      final intervention = Intervention.fromJson(cached as Map<String, dynamic>);
      final updated = intervention.copyWith(
        status: status,
        notes: notes ?? intervention.notes,
        completedAt: completedAt ?? intervention.completedAt,
        lastUpdated: DateTime.now(),
      );
      await _db.cacheIntervention(updated);
      return updated;
    }

    throw Exception('Intervention not found in cache');
  }

  /// Update an intervention
  Future<Intervention> updateIntervention(Intervention intervention) async {
    if (await _connectivity.isOnline) {
      try {
        final response = await _api.put(
          '$_interventionBasePath/${intervention.id}',
          data: intervention.toJson(),
        );

        final updated = Intervention.fromJson(response.data as Map<String, dynamic>);

        // Update cache
        await _db.cacheIntervention(updated);

        return updated;
      } catch (e) {
        // Queue for sync
        await _sync.queueUpdate(
          entityType: 'intervention',
          entityId: intervention.id,
          data: intervention.toJson(),
        );
        rethrow;
      }
    }

    // Offline: queue for sync and update cache
    await _sync.queueUpdate(
      entityType: 'intervention',
      entityId: intervention.id,
      data: intervention.toJson(),
    );

    final updated = intervention.copyWith(lastUpdated: DateTime.now());
    await _db.cacheIntervention(updated);

    return updated;
  }

  /// Log outcome for a completed intervention
  Future<InterventionOutcome> logInterventionOutcome(
    InterventionOutcome outcome,
  ) async {
    if (await _connectivity.isOnline) {
      try {
        final response = await _api.post(
          '$_interventionBasePath/${outcome.interventionId}/outcome',
          data: outcome.toJson(),
        );

        final created = InterventionOutcome.fromJson(
          response.data as Map<String, dynamic>,
        );

        // Cache the outcome
        await _db.cacheInterventionOutcome(created);

        return created;
      } catch (e) {
        // Queue for sync
        await _sync.queueCreate(
          entityType: 'intervention_outcome',
          entityId: outcome.interventionId,
          data: outcome.toJson(),
        );
        rethrow;
      }
    }

    // Offline: queue for sync
    await _sync.queueCreate(
      entityType: 'intervention_outcome',
      entityId: outcome.interventionId,
      data: outcome.toJson(),
    );

    // Cache locally with temporary ID
    final tempOutcome = InterventionOutcome(
      id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
      interventionId: outcome.interventionId,
      studentId: outcome.studentId,
      recordedAt: outcome.recordedAt,
      recordedBy: outcome.recordedBy,
      effectiveness: outcome.effectiveness,
      impactOnRisk: outcome.impactOnRisk,
      observations: outcome.observations,
      quantitativeMetrics: outcome.quantitativeMetrics,
      studentFeedback: outcome.studentFeedback,
      parentFeedback: outcome.parentFeedback,
      recommendContinuation: outcome.recommendContinuation,
      followUpActions: outcome.followUpActions,
    );

    await _db.cacheInterventionOutcome(tempOutcome);

    return tempOutcome;
  }

  /// Fetch intervention history for a student
  Future<InterventionHistory> fetchInterventionHistory(
    String studentId, {
    InterventionStatus? statusFilter,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    if (!await _connectivity.isOnline) {
      final cached = await _db.getCachedInterventionHistory(studentId);
      if (cached != null) {
        return InterventionHistory.fromJson(cached as Map<String, dynamic>);
      }
      throw Exception('No intervention history available offline');
    }

    return _retryWithBackoff(() async {
      final queryParams = <String, dynamic>{};
      if (statusFilter != null) {
        queryParams['status'] = statusFilter.name;
      }
      if (startDate != null) {
        queryParams['start_date'] = startDate.toIso8601String();
      }
      if (endDate != null) {
        queryParams['end_date'] = endDate.toIso8601String();
      }

      final response = await _api.get(
        '$_interventionBasePath/student/$studentId/history',
        queryParameters: queryParams,
      );

      final history = InterventionHistory.fromJson(
        response.data as Map<String, dynamic>,
      );

      // Cache the history
      await _db.cacheInterventionHistory(studentId, history);

      return history;
    });
  }

  /// Get active interventions for a student
  Future<List<Intervention>> getActiveInterventions(String studentId) async {
    if (!await _connectivity.isOnline) {
      final cached = await _db.getCachedActiveInterventions(studentId);
      return cached
          .map((json) => Intervention.fromJson(json as Map<String, dynamic>))
          .toList();
    }

    return _retryWithBackoff(() async {
      final response = await _api.get(
        '$_interventionBasePath/student/$studentId/active',
      );

      final interventions = (response.data as List<dynamic>)
          .map((json) => Intervention.fromJson(json as Map<String, dynamic>))
          .toList();

      // Cache active interventions
      await _db.cacheActiveInterventions(
        studentId,
        interventions.map((i) => i.toJson()).toList(),
      );

      return interventions;
    });
  }

  /// Get intervention by ID
  Future<Intervention> getIntervention(String interventionId) async {
    // Try cache first
    final cached = await _db.getCachedIntervention(interventionId);
    if (cached != null && !await _connectivity.isOnline) {
      return Intervention.fromJson(cached as Map<String, dynamic>);
    }

    if (!await _connectivity.isOnline) {
      throw Exception('Intervention not found in cache and device is offline');
    }

    return _retryWithBackoff(() async {
      final response = await _api.get(
        '$_interventionBasePath/$interventionId',
      );

      final intervention = Intervention.fromJson(
        response.data as Map<String, dynamic>,
      );

      await _db.cacheIntervention(intervention);

      return intervention;
    });
  }

  /// Get intervention templates
  Future<List<InterventionTemplate>> getInterventionTemplates({
    InterventionCategory? category,
  }) async {
    if (!await _connectivity.isOnline) {
      final cached = await _db.getCachedInterventionTemplates();
      return cached
          .map((json) => InterventionTemplate.fromJson(json as Map<String, dynamic>))
          .toList();
    }

    return _retryWithBackoff(() async {
      final queryParams = <String, dynamic>{};
      if (category != null) {
        queryParams['category'] = category.name;
      }

      final response = await _api.get(
        '$_interventionBasePath/templates',
        queryParameters: queryParams,
      );

      final templates = (response.data as List<dynamic>)
          .map((json) => InterventionTemplate.fromJson(json as Map<String, dynamic>))
          .toList();

      // Cache templates
      await _db.cacheInterventionTemplates(
        templates.map((t) => t.toJson()).toList(),
      );

      return templates;
    });
  }

  /// Batch create interventions for multiple students
  Future<List<Intervention>> batchCreateInterventions(
    List<Intervention> interventions,
  ) async {
    if (!await _connectivity.isOnline) {
      // Queue all for sync
      for (final intervention in interventions) {
        await _sync.queueCreate(
          entityType: 'intervention',
          entityId: intervention.studentId,
          data: intervention.toJson(),
        );
      }

      // Return with temporary IDs
      final results = <Intervention>[];
      for (var i = 0; i < interventions.length; i++) {
        final temp = interventions[i].copyWith(
          id: 'temp_${DateTime.now().millisecondsSinceEpoch}_$i',
        );
        await _db.cacheIntervention(temp);
        results.add(temp);
      }
      return results;
    }

    return _retryWithBackoff(() async {
      final response = await _api.post(
        '$_interventionBasePath/batch',
        data: {
          'interventions': interventions.map((i) => i.toJson()).toList(),
        },
      );

      final created = (response.data as List<dynamic>)
          .map((json) => Intervention.fromJson(json as Map<String, dynamic>))
          .toList();

      // Cache all
      for (final intervention in created) {
        await _db.cacheIntervention(intervention);
      }

      return created;
    });
  }

  /// Delete an intervention
  Future<void> deleteIntervention(String interventionId) async {
    if (await _connectivity.isOnline) {
      try {
        await _api.delete('$_interventionBasePath/$interventionId');
        
        // Remove from cache
        await _db.deleteIntervention(interventionId);
      } catch (e) {
        // Queue for sync
        await _sync.queueDelete(
          entityType: 'intervention',
          entityId: interventionId,
        );
        rethrow;
      }
    } else {
      // Offline: queue for sync
      await _sync.queueDelete(
        entityType: 'intervention',
        entityId: interventionId,
      );

      // Remove from cache
      await _db.deleteIntervention(interventionId);
    }
  }

  /// Retry logic with exponential backoff
  Future<T> _retryWithBackoff<T>(
    Future<T> Function() operation, {
    int maxRetries = 3,
    Duration initialDelay = const Duration(milliseconds: 500),
  }) async {
    int retryCount = 0;
    Duration currentDelay = initialDelay;

    while (true) {
      try {
        return await operation();
      } catch (e) {
        retryCount++;

        if (retryCount >= maxRetries) {
          rethrow;
        }

        // Exponential backoff: delay = initialDelay * 2^retryCount
        await Future.delayed(currentDelay);
        currentDelay *= 2;
      }
    }
  }

  /// Clear intervention cache
  Future<void> clearCache() async {
    await _db.clearInterventionCache();
  }
}
