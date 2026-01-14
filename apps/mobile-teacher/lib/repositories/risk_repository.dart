/// Repository for risk prediction data access
/// Implements offline-first pattern with background sync
library;

import 'package:flutter_common/flutter_common.dart';
import '../models/risk_prediction.dart';
import '../services/database/local_database.dart';
import '../services/sync/sync_service.dart';
import '../services/sync/connectivity_monitor.dart';

/// Repository for managing student risk predictions and interventions
class RiskRepository {
  RiskRepository({
    required AivoApiClient api,
    required LocalDatabase db,
    required SyncService sync,
    required ConnectivityMonitor connectivity,
  })  : _api = api,
        _db = db,
        _sync = sync,
        _connectivity = connectivity;

  final AivoApiClient _api;
  final LocalDatabase _db;
  final SyncService _sync;
  final ConnectivityMonitor _connectivity;

  // API base paths
  static const String _analyticsBasePath = '/api/analytics';
  static const String _mlBasePath = '/api/ml-recommendation/predictive-analytics';

  /// Get risk prediction for a single student
  /// Optionally includes intervention recommendations
  Future<StudentRiskWithInterventions> getStudentRisk(
    String studentId, {
    bool includeInterventions = true,
    Map<String, dynamic>? context,
  }) async {
    // Try to get cached prediction first
    final cached = await _db.getCachedRiskPrediction(studentId);

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.post(
          '$_mlBasePath/risk/predict',
          data: {
            'student_id': studentId,
            'include_interventions': includeInterventions,
            if (context != null) 'context': context,
          },
        );

        final result = StudentRiskWithInterventions.fromJson(
          response.data as Map<String, dynamic>,
        );

        // Cache the prediction
        await _db.cacheRiskPrediction(studentId, result.prediction);

        return result;
      } catch (e) {
        // If API fails and we have cached data, return that
        if (cached != null) {
          return StudentRiskWithInterventions(prediction: cached);
        }
        rethrow;
      }
    }

    // Offline: return cached data
    if (cached != null) {
      return StudentRiskWithInterventions(prediction: cached);
    }

    throw Exception('No risk prediction available offline for student $studentId');
  }

  /// Get batch risk predictions for multiple students
  Future<List<RiskPrediction>> getBatchRiskPredictions(
    List<String> studentIds, {
    bool includeInterventions = false,
  }) async {
    if (!await _connectivity.isOnline) {
      // Return cached predictions
      final predictions = <RiskPrediction>[];
      for (final studentId in studentIds) {
        final cached = await _db.getCachedRiskPrediction(studentId);
        if (cached != null) {
          predictions.add(cached);
        }
      }
      return predictions;
    }

    try {
      final response = await _api.post(
        '$_mlBasePath/risk/predict/batch',
        data: {
          'student_ids': studentIds,
          'include_interventions': includeInterventions,
        },
      );

      final predictions = (response.data as List<dynamic>)
          .map((json) => RiskPrediction.fromJson(json as Map<String, dynamic>))
          .toList();

      // Cache all predictions
      for (final prediction in predictions) {
        await _db.cacheRiskPrediction(prediction.studentId, prediction);
      }

      return predictions;
    } catch (e) {
      // Fall back to cached data
      final predictions = <RiskPrediction>[];
      for (final studentId in studentIds) {
        final cached = await _db.getCachedRiskPrediction(studentId);
        if (cached != null) {
          predictions.add(cached);
        }
      }
      if (predictions.isNotEmpty) {
        return predictions;
      }
      rethrow;
    }
  }

  /// Get classroom-level risk summary
  Future<ClassroomRiskSummary> getClassroomRiskSummary(String classroomId) async {
    final cached = await _db.getCachedClassroomRiskSummary(classroomId);

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get(
          '$_mlBasePath/risk/classroom/$classroomId',
        );

        final summary = ClassroomRiskSummary.fromJson(
          response.data as Map<String, dynamic>,
        );

        // Cache the summary
        await _db.cacheClassroomRiskSummary(classroomId, summary);

        return summary;
      } catch (e) {
        if (cached != null) return cached;
        rethrow;
      }
    }

    if (cached != null) return cached;

    throw Exception('No classroom risk summary available offline');
  }

  /// Get early warning report for a class
  Future<EarlyWarningReport> getEarlyWarningReport(String classId) async {
    final cached = await _db.getCachedEarlyWarningReport(classId);

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get(
          '$_analyticsBasePath/classes/$classId/early-warning',
        );

        final report = EarlyWarningReport.fromJson(
          response.data as Map<String, dynamic>,
        );

        // Cache the report
        await _db.cacheEarlyWarningReport(classId, report);

        return report;
      } catch (e) {
        if (cached != null) return cached;
        rethrow;
      }
    }

    if (cached != null) return cached;

    throw Exception('No early warning report available offline');
  }

  /// Get at-risk students for teacher dashboard
  Future<List<EarlyWarningStudent>> getAtRiskStudents({int limit = 10}) async {
    final cached = await _db.getCachedAtRiskStudents();

    if (await _connectivity.isOnline) {
      try {
        final response = await _api.get(
          '/api/v2/dashboard/at-risk',
          queryParameters: {'limit': limit},
        );

        final data = response.data as Map<String, dynamic>;
        final students = (data['students'] as List<dynamic>)
            .map((json) => EarlyWarningStudent.fromJson(json as Map<String, dynamic>))
            .toList();

        // Cache at-risk students
        await _db.cacheAtRiskStudents(students);

        return students;
      } catch (e) {
        if (cached.isNotEmpty) return cached;
        rethrow;
      }
    }

    return cached;
  }

  /// Get student risk history over time
  Future<List<RiskHistoryEntry>> getStudentRiskHistory(
    String studentId, {
    String period = 'month',
  }) async {
    if (!await _connectivity.isOnline) {
      return _db.getCachedRiskHistory(studentId);
    }

    try {
      final response = await _api.get(
        '$_analyticsBasePath/students/$studentId/risk-history',
        queryParameters: {'period': period},
      );

      final history = (response.data as List<dynamic>)
          .map((json) => RiskHistoryEntry.fromJson(json as Map<String, dynamic>))
          .toList();

      // Cache history
      await _db.cacheRiskHistory(studentId, history);

      return history;
    } catch (e) {
      final cached = await _db.getCachedRiskHistory(studentId);
      if (cached.isNotEmpty) return cached;
      rethrow;
    }
  }

  /// Approve an intervention for a student
  Future<void> approveIntervention(
    String studentId,
    String interventionId, {
    String? notes,
  }) async {
    if (await _connectivity.isOnline) {
      await _api.post(
        '$_mlBasePath/interventions/$studentId/approve/$interventionId',
        data: {
          if (notes != null) 'notes': notes,
        },
      );
    } else {
      // Queue for sync when online
      await _sync.queueOperation(
        entityType: 'intervention_approval',
        entityId: '$studentId-$interventionId',
        operation: 'approve',
        data: {
          'studentId': studentId,
          'interventionId': interventionId,
          'notes': notes,
        },
      );
    }
  }

  /// Log teacher contact with a student (for at-risk tracking)
  Future<void> logTeacherContact(
    String studentId, {
    required String contactType,
    required String notes,
    DateTime? contactDate,
  }) async {
    final data = {
      'contactType': contactType,
      'notes': notes,
      if (contactDate != null) 'contactDate': contactDate.toIso8601String(),
    };

    if (await _connectivity.isOnline) {
      await _api.post(
        '/api/students/$studentId/contacts',
        data: data,
      );
    } else {
      // Queue for sync when online
      await _sync.queueOperation(
        entityType: 'teacher_contact',
        entityId: studentId,
        operation: 'create',
        data: data,
      );
    }
  }

  /// Clear cached risk data
  Future<void> clearCache() async {
    await _db.clearRiskCache();
  }

  /// Refresh all risk data in background
  Future<void> refreshInBackground() async {
    if (!await _connectivity.isOnline) return;

    // Get list of students to refresh from cached data
    final cachedStudents = await _db.getCachedStudentIds();
    if (cachedStudents.isEmpty) return;

    // Refresh in batches
    const batchSize = 20;
    for (var i = 0; i < cachedStudents.length; i += batchSize) {
      final batch = cachedStudents.skip(i).take(batchSize).toList();
      try {
        await getBatchRiskPredictions(batch);
      } catch (_) {
        // Ignore errors in background refresh
      }
    }
  }
}

/// Entry in risk history timeline
class RiskHistoryEntry {
  const RiskHistoryEntry({
    required this.date,
    required this.riskLevel,
    required this.riskScore,
  });

  final DateTime date;
  final RiskLevel riskLevel;
  final double riskScore;

  int get riskScorePercent => (riskScore * 100).round();

  factory RiskHistoryEntry.fromJson(Map<String, dynamic> json) {
    return RiskHistoryEntry(
      date: DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
      riskLevel: RiskLevel.fromString(json['riskLevel'] as String? ??
                                       json['risk_level'] as String? ?? 'on-track'),
      riskScore: (json['riskScore'] as num?)?.toDouble() ??
                 (json['risk_score'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'date': date.toIso8601String(),
        'riskLevel': riskLevel.value,
        'riskScore': riskScore,
      };
}
