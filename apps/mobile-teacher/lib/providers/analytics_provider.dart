/// Analytics Provider
///
/// State management for engagement analytics.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../repositories/repositories.dart';
import 'core_providers.dart';

// ============================================================================
// State Classes
// ============================================================================

/// Class engagement state.
class ClassEngagementState {
  const ClassEngagementState({
    this.engagement,
    this.isLoading = false,
    this.error,
    this.lastUpdated,
  });

  final ClassEngagement? engagement;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdated;

  ClassEngagementState copyWith({
    ClassEngagement? engagement,
    bool? isLoading,
    String? error,
    DateTime? lastUpdated,
  }) {
    return ClassEngagementState(
      engagement: engagement ?? this.engagement,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

/// Student engagement state.
class StudentEngagementState {
  const StudentEngagementState({
    this.engagement,
    this.patterns,
    this.sessionHistory = const [],
    this.recommendations = const [],
    this.isLoading = false,
    this.error,
  });

  final StudentEngagement? engagement;
  final EngagementPatterns? patterns;
  final List<SessionHistoryEntry> sessionHistory;
  final List<EngagementRecommendation> recommendations;
  final bool isLoading;
  final String? error;

  StudentEngagementState copyWith({
    StudentEngagement? engagement,
    EngagementPatterns? patterns,
    List<SessionHistoryEntry>? sessionHistory,
    List<EngagementRecommendation>? recommendations,
    bool? isLoading,
    String? error,
  }) {
    return StudentEngagementState(
      engagement: engagement ?? this.engagement,
      patterns: patterns ?? this.patterns,
      sessionHistory: sessionHistory ?? this.sessionHistory,
      recommendations: recommendations ?? this.recommendations,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Engagement alerts state.
class EngagementAlertsState {
  const EngagementAlertsState({
    this.alerts = const [],
    this.isLoading = false,
    this.error,
  });

  final List<EngagementAlert> alerts;
  final bool isLoading;
  final String? error;

  List<EngagementAlert> get unresolvedAlerts =>
      alerts.where((a) => !a.isResolved).toList();

  List<EngagementAlert> get criticalAlerts =>
      alerts.where((a) => a.severity == AlertSeverity.critical).toList();

  EngagementAlertsState copyWith({
    List<EngagementAlert>? alerts,
    bool? isLoading,
    String? error,
  }) {
    return EngagementAlertsState(
      alerts: alerts ?? this.alerts,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Engagement timeline state.
class EngagementTimelineState {
  const EngagementTimelineState({
    this.timeline = const [],
    this.granularity = TimelineGranularity.daily,
    this.isLoading = false,
    this.error,
  });

  final List<EngagementTimelinePoint> timeline;
  final TimelineGranularity granularity;
  final bool isLoading;
  final String? error;

  EngagementTimelineState copyWith({
    List<EngagementTimelinePoint>? timeline,
    TimelineGranularity? granularity,
    bool? isLoading,
    String? error,
  }) {
    return EngagementTimelineState(
      timeline: timeline ?? this.timeline,
      granularity: granularity ?? this.granularity,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// ============================================================================
// State Notifiers
// ============================================================================

/// Class engagement notifier.
class ClassEngagementNotifier extends StateNotifier<ClassEngagementState> {
  ClassEngagementNotifier(this._repository) : super(const ClassEngagementState());

  final AnalyticsRepository _repository;

  /// Load engagement data for a class.
  Future<void> loadEngagement(String classId, DateRange period) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final engagement = await _repository.fetchClassEngagement(classId, period);
      state = state.copyWith(
        engagement: engagement,
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

  /// Refresh engagement data.
  Future<void> refresh(String classId, DateRange period) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final engagement =
          await _repository.refreshClassEngagement(classId, period);
      state = state.copyWith(
        engagement: engagement,
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
}

/// Student engagement notifier.
class StudentEngagementNotifier extends StateNotifier<StudentEngagementState> {
  StudentEngagementNotifier(this._repository)
      : super(const StudentEngagementState());

  final AnalyticsRepository _repository;

  /// Load all engagement data for a student.
  Future<void> loadEngagement(String studentId, DateRange period) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // Load all data in parallel
      final results = await Future.wait([
        _repository.fetchStudentEngagement(studentId, period),
        _repository.fetchEngagementPatterns(studentId, period: period),
        _repository.fetchSessionHistory(studentId, period: period, limit: 20),
        _repository.fetchEngagementRecommendations(studentId),
      ]);

      state = state.copyWith(
        engagement: results[0] as StudentEngagement?,
        patterns: results[1] as EngagementPatterns?,
        sessionHistory: results[2] as List<SessionHistoryEntry>,
        recommendations: results[3] as List<EngagementRecommendation>,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Refresh student engagement data.
  Future<void> refresh(String studentId, DateRange period) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final engagement =
          await _repository.refreshStudentEngagement(studentId, period);
      state = state.copyWith(
        engagement: engagement,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }
}

/// Engagement alerts notifier.
class EngagementAlertsNotifier extends StateNotifier<EngagementAlertsState> {
  EngagementAlertsNotifier(this._repository)
      : super(const EngagementAlertsState());

  final AnalyticsRepository _repository;

  /// Load alerts for a class.
  Future<void> loadAlerts(String classId, {bool includeResolved = false}) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final alerts = await _repository.fetchEngagementAlerts(
        classId,
        includeResolved: includeResolved,
      );
      state = state.copyWith(
        alerts: alerts,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Resolve an alert.
  Future<void> resolveAlert(String alertId) async {
    final success = await _repository.resolveAlert(alertId);
    if (success) {
      state = state.copyWith(
        alerts: state.alerts.map((a) {
          if (a.id == alertId) {
            return EngagementAlert(
              id: a.id,
              studentId: a.studentId,
              studentName: a.studentName,
              alertType: a.alertType,
              severity: a.severity,
              message: a.message,
              createdAt: a.createdAt,
              engagementLevel: a.engagementLevel,
              suggestedActions: a.suggestedActions,
              isResolved: true,
            );
          }
          return a;
        }).toList(),
      );
    }
  }
}

/// Engagement timeline notifier.
class EngagementTimelineNotifier extends StateNotifier<EngagementTimelineState> {
  EngagementTimelineNotifier(this._repository)
      : super(const EngagementTimelineState());

  final AnalyticsRepository _repository;

  /// Load timeline data.
  Future<void> loadTimeline(
    String classId,
    TimelineGranularity granularity, {
    DateRange? period,
  }) async {
    state = state.copyWith(
      isLoading: true,
      error: null,
      granularity: granularity,
    );

    try {
      final timeline = await _repository.fetchEngagementTimeline(
        classId,
        granularity,
        period: period,
      );
      state = state.copyWith(
        timeline: timeline,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Change granularity and reload.
  Future<void> changeGranularity(
    String classId,
    TimelineGranularity granularity, {
    DateRange? period,
  }) async {
    await loadTimeline(classId, granularity, period: period);
  }
}

// ============================================================================
// Providers
// ============================================================================

/// Analytics repository provider.
final analyticsRepositoryProvider = Provider<AnalyticsRepository>((ref) {
  return AnalyticsRepository(
    api: ref.watch(apiClientProvider),
    connectivity: ref.watch(connectivityMonitorProvider),
  );
});

/// Class engagement state provider.
final classEngagementProvider =
    StateNotifierProvider<ClassEngagementNotifier, ClassEngagementState>((ref) {
  final repository = ref.watch(analyticsRepositoryProvider);
  return ClassEngagementNotifier(repository);
});

/// Student engagement state provider.
final studentEngagementProvider =
    StateNotifierProvider<StudentEngagementNotifier, StudentEngagementState>(
        (ref) {
  final repository = ref.watch(analyticsRepositoryProvider);
  return StudentEngagementNotifier(repository);
});

/// Engagement alerts state provider.
final engagementAlertsProvider =
    StateNotifierProvider<EngagementAlertsNotifier, EngagementAlertsState>(
        (ref) {
  final repository = ref.watch(analyticsRepositoryProvider);
  return EngagementAlertsNotifier(repository);
});

/// Engagement timeline state provider.
final engagementTimelineProvider =
    StateNotifierProvider<EngagementTimelineNotifier, EngagementTimelineState>(
        (ref) {
  final repository = ref.watch(analyticsRepositoryProvider);
  return EngagementTimelineNotifier(repository);
});

// ============================================================================
// Family Providers for specific data fetching
// ============================================================================

/// Parameters for class engagement.
class ClassEngagementParams {
  const ClassEngagementParams({
    required this.classId,
    required this.period,
  });

  final String classId;
  final DateRange period;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ClassEngagementParams &&
        other.classId == classId &&
        other.period.start == period.start &&
        other.period.end == period.end;
  }

  @override
  int get hashCode =>
      classId.hashCode ^ period.start.hashCode ^ period.end.hashCode;
}

/// Parameters for student engagement.
class StudentEngagementParams {
  const StudentEngagementParams({
    required this.studentId,
    required this.period,
  });

  final String studentId;
  final DateRange period;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is StudentEngagementParams &&
        other.studentId == studentId &&
        other.period.start == period.start &&
        other.period.end == period.end;
  }

  @override
  int get hashCode =>
      studentId.hashCode ^ period.start.hashCode ^ period.end.hashCode;
}

/// Parameters for engagement timeline.
class EngagementTimelineParams {
  const EngagementTimelineParams({
    required this.classId,
    required this.granularity,
    this.period,
  });

  final String classId;
  final TimelineGranularity granularity;
  final DateRange? period;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is EngagementTimelineParams &&
        other.classId == classId &&
        other.granularity == granularity &&
        other.period?.start == period?.start &&
        other.period?.end == period?.end;
  }

  @override
  int get hashCode =>
      classId.hashCode ^
      granularity.hashCode ^
      (period?.start.hashCode ?? 0) ^
      (period?.end.hashCode ?? 0);
}

/// Class engagement data provider (family).
final classEngagementDataProvider =
    FutureProvider.family<ClassEngagement?, ClassEngagementParams>(
        (ref, params) async {
  final repository = ref.watch(analyticsRepositoryProvider);
  return repository.fetchClassEngagement(params.classId, params.period);
});

/// Student engagement data provider (family).
final studentEngagementDataProvider =
    FutureProvider.family<StudentEngagement?, StudentEngagementParams>(
        (ref, params) async {
  final repository = ref.watch(analyticsRepositoryProvider);
  return repository.fetchStudentEngagement(params.studentId, params.period);
});

/// Engagement timeline data provider (family).
final engagementTimelineDataProvider =
    FutureProvider.family<List<EngagementTimelinePoint>, EngagementTimelineParams>(
        (ref, params) async {
  final repository = ref.watch(analyticsRepositoryProvider);
  return repository.fetchEngagementTimeline(
    params.classId,
    params.granularity,
    period: params.period,
  );
});

/// Content engagement data provider (family).
final contentEngagementProvider =
    FutureProvider.family<List<ContentEngagement>, String>(
        (ref, classId) async {
  final repository = ref.watch(analyticsRepositoryProvider);
  return repository.fetchEngagementByContent(classId);
});

/// Engagement alerts data provider (family).
final engagementAlertsDataProvider =
    FutureProvider.family<List<EngagementAlert>, String>((ref, classId) async {
  final repository = ref.watch(analyticsRepositoryProvider);
  return repository.fetchEngagementAlerts(classId);
});

/// Session history data provider (family).
final sessionHistoryProvider =
    FutureProvider.family<List<SessionHistoryEntry>, String>(
        (ref, studentId) async {
  final repository = ref.watch(analyticsRepositoryProvider);
  return repository.fetchSessionHistory(studentId, limit: 50);
});

/// Engagement patterns data provider (family).
final engagementPatternsProvider =
    FutureProvider.family<EngagementPatterns?, String>((ref, studentId) async {
  final repository = ref.watch(analyticsRepositoryProvider);
  return repository.fetchEngagementPatterns(studentId);
});

/// Engagement recommendations data provider (family).
final engagementRecommendationsProvider =
    FutureProvider.family<List<EngagementRecommendation>, String>(
        (ref, studentId) async {
  final repository = ref.watch(analyticsRepositoryProvider);
  return repository.fetchEngagementRecommendations(studentId);
});

// ============================================================================
// Analytics Dashboard Providers (Sprint 8)
// ============================================================================

/// Selected analytics period state.
final selectedAnalyticsPeriodProvider = StateProvider<AnalyticsPeriod>((ref) {
  return AnalyticsPeriod.week;
});

/// Analytics dashboard data provider.
final analyticsDashboardProvider =
    FutureProvider.family<AnalyticsDashboardState, String>(
        (ref, classId) async {
  final repository = ref.watch(analyticsRepositoryProvider);
  final period = ref.watch(selectedAnalyticsPeriodProvider);
  final dateRange = period.getDateRange();

  try {
    // Fetch all dashboard data in parallel
    final results = await Future.wait([
      repository.fetchClassEngagement(classId, dateRange),
      repository.fetchEngagementByContent(classId),
    ]);

    final classEngagement = results[0] as ClassEngagement?;

    // Build dashboard state from available data
    return AnalyticsDashboardState(
      classAnalytics: classEngagement != null
          ? ClassAnalytics(
              classId: classId,
              className: classEngagement.className,
              period: period,
              averageGrade: classEngagement.averageMetrics.overallScore,
              overallPerformance: classEngagement.averageMetrics.overallScore,
              totalStudents: classEngagement.students.length,
              activeStudents: classEngagement.students
                  .where((s) => s.metrics.completionRate > 0)
                  .length,
              trendDirection: classEngagement.trend?.direction ?? TrendDirection.stable,
              completionMetrics: CompletionMetrics(
                assignmentCompletionRate: classEngagement.averageMetrics.completionRate,
                assessmentCompletionRate: classEngagement.averageMetrics.completionRate,
                averageGrade: classEngagement.averageMetrics.overallScore,
                totalAssignments: 0,
                completedAssignments: 0,
                totalAssessments: 0,
                completedAssessments: 0,
                onTimeSubmissionRate: 0.0,
                overdueCount: 0,
              ),
              subjectBreakdown: const [],
              performanceTrend: const [],
              topStudents: const [],
              strugglingStudents: const [],
            )
          : null,
      subjectPerformance: const [],
      topStudents: const [],
      strugglingStudents: const [],
      insights: const [],
    );
  } catch (e) {
    return AnalyticsDashboardState(error: e.toString());
  }
});

/// Analytics export state notifier.
class AnalyticsExportNotifier extends StateNotifier<AnalyticsExportState> {
  AnalyticsExportNotifier(this._repository) : super(const AnalyticsExportState());

  // ignore: unused_field — reserved for real export implementation
  final AnalyticsRepository _repository;

  /// Export analytics as PDF.
  Future<void> exportPdf(
    String classId, {
    required AnalyticsPeriod period,
    bool includeStudentDetails = true,
  }) async {
    state = state.copyWith(isExporting: true, error: null, downloadUrl: null);

    try {
      // In a real implementation, this would call the API to generate PDF
      await Future.delayed(const Duration(seconds: 2));
      state = state.copyWith(
        isExporting: false,
        downloadUrl: 'https://example.com/reports/$classId.pdf',
      );
    } catch (e) {
      state = state.copyWith(
        isExporting: false,
        error: e.toString(),
      );
    }
  }

  /// Export analytics as CSV.
  Future<void> exportCsv(
    String classId, {
    required AnalyticsPeriod period,
  }) async {
    state = state.copyWith(isExporting: true, error: null, downloadUrl: null);

    try {
      // In a real implementation, this would call the API to generate CSV
      await Future.delayed(const Duration(seconds: 1));
      state = state.copyWith(
        isExporting: false,
        downloadUrl: 'https://example.com/reports/$classId.csv',
      );
    } catch (e) {
      state = state.copyWith(
        isExporting: false,
        error: e.toString(),
      );
    }
  }

  /// Clear export state.
  void clearState() {
    state = const AnalyticsExportState();
  }
}

/// Analytics export state provider.
final analyticsExportProvider =
    StateNotifierProvider<AnalyticsExportNotifier, AnalyticsExportState>((ref) {
  final repository = ref.watch(analyticsRepositoryProvider);
  return AnalyticsExportNotifier(repository);
});
