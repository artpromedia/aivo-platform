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
        if (cached.isNotEmpty) return cached.cast<EarlyWarningStudent>();
        rethrow;
      }
    }

    return cached.cast<EarlyWarningStudent>();
  }

  /// Get student risk history over time
  Future<List<RiskHistoryEntry>> getStudentRiskHistory(
    String studentId, {
    String period = 'month',
  }) async {
    if (!await _connectivity.isOnline) {
      final cached = await _db.getCachedRiskHistory(studentId);
      return cached.cast<RiskHistoryEntry>();
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
      if (cached.isNotEmpty) return cached.cast<RiskHistoryEntry>();
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
      await _sync.queueUpdate(
        entityType: 'intervention_approval',
        entityId: '$studentId-$interventionId',
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
      await _sync.queueCreate(
        entityType: 'teacher_contact',
        entityId: studentId,
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

  // ========================================================================
  // PHASE 1 ENHANCEMENTS - Advanced Risk Prediction Features
  // ========================================================================

  /// Fetch comprehensive student risk profile with trends and indicators
  Future<StudentRiskProfile> fetchStudentRiskProfile(
    String studentId, {
    String period = 'month',
  }) async {
    if (!await _connectivity.isOnline) {
      final cached = await _db.getCachedRiskProfile(studentId);
      if (cached != null) return cached;
      throw Exception('No student risk profile available offline');
    }

    return _retryWithBackoff(() async {
      final response = await _api.get(
        '$_mlBasePath/risk/profile/$studentId',
        queryParameters: {'period': period},
      );

      final profile = StudentRiskProfile.fromJson(
        response.data as Map<String, dynamic>,
      );

      // Cache the profile
      await _db.cacheRiskProfile(studentId, profile);

      return profile;
    });
  }

  /// Fetch class-level risk overview with aggregated data
  Future<ClassRiskOverview> fetchClassRiskOverview(
    String classId, {
    bool includeStudentProfiles = true,
  }) async {
    if (!await _connectivity.isOnline) {
      final cached = await _db.getCachedClassRiskOverview(classId);
      if (cached != null) return cached;
      throw Exception('No class risk overview available offline');
    }

    return _retryWithBackoff(() async {
      final response = await _api.get(
        '$_mlBasePath/risk/class/$classId/overview',
        queryParameters: {
          'include_student_profiles': includeStudentProfiles,
        },
      );

      final overview = ClassRiskOverview.fromJson(
        response.data as Map<String, dynamic>,
      );

      // Cache the overview
      await _db.cacheClassRiskOverview(classId, overview);

      return overview;
    });
  }

  /// Fetch risk trends for a student over a date range
  Future<RiskTrendAnalysis> fetchRiskTrends(
    String studentId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final start = startDate ?? DateTime.now().subtract(const Duration(days: 30));
    final end = endDate ?? DateTime.now();

    if (!await _connectivity.isOnline) {
      final cached = await _db.getCachedRiskTrends(studentId);
      if (cached != null) return cached;
      throw Exception('No risk trends available offline');
    }

    return _retryWithBackoff(() async {
      final response = await _api.get(
        '$_mlBasePath/risk/trends/$studentId',
        queryParameters: {
          'start_date': start.toIso8601String(),
          'end_date': end.toIso8601String(),
        },
      );

      final trends = RiskTrendAnalysis.fromJson(
        response.data as Map<String, dynamic>,
      );

      // Cache the trends
      await _db.cacheRiskTrends(studentId, trends);

      return trends;
    });
  }

  /// Fetch predictive indicators (early warning signals) for a student
  Future<List<PredictiveIndicator>> fetchPredictiveIndicators(
    String studentId, {
    RiskCategory? category,
    RiskSeverity? minSeverity,
  }) async {
    if (!await _connectivity.isOnline) {
      final cached = await _db.getCachedPredictiveIndicators(studentId);
      return cached.map((json) => PredictiveIndicator.fromJson(json as Map<String, dynamic>)).toList();
    }

    return _retryWithBackoff(() async {
      final queryParams = <String, dynamic>{};
      if (category != null) queryParams['category'] = category.name;
      if (minSeverity != null) queryParams['min_severity'] = minSeverity.name;

      final response = await _api.get(
        '$_mlBasePath/risk/indicators/$studentId',
        queryParameters: queryParams,
      );

      final indicators = (response.data as List<dynamic>)
          .map((json) => PredictiveIndicator.fromJson(json as Map<String, dynamic>))
          .toList();

      // Cache the indicators
      await _db.cachePredictiveIndicators(studentId, indicators);

      return indicators;
    });
  }

  /// Fetch historical risk data for time-series analysis
  Future<HistoricalRiskData> fetchHistoricalRiskData(
    String studentId, {
    required DateTime startDate,
    required DateTime endDate,
    String aggregation = 'daily',
  }) async {
    if (!await _connectivity.isOnline) {
      final cached = await _db.getCachedHistoricalRiskData(studentId);
      if (cached != null) return cached;
      throw Exception('No historical risk data available offline');
    }

    return _retryWithBackoff(() async {
      final response = await _api.get(
        '$_mlBasePath/risk/history/$studentId',
        queryParameters: {
          'start_date': startDate.toIso8601String(),
          'end_date': endDate.toIso8601String(),
          'aggregation': aggregation,
        },
      );

      final historicalData = HistoricalRiskData.fromJson(
        response.data as Map<String, dynamic>,
      );

      // Cache the historical data
      await _db.cacheHistoricalRiskData(studentId, historicalData);

      return historicalData;
    });
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
