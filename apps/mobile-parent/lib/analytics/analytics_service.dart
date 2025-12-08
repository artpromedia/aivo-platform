import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _baseUrl = String.fromEnvironment('ANALYTICS_BASE_URL', defaultValue: 'http://localhost:4030');
const _useAnalyticsMock = bool.fromEnvironment('USE_ANALYTICS_MOCK', defaultValue: true);

// ══════════════════════════════════════════════════════════════════════════════
// MODELS
// ══════════════════════════════════════════════════════════════════════════════

/// Independence label enum matching backend.
enum IndependenceLabel {
  needsSupport('needs_support', 'Needs a lot of support'),
  buildingIndependence('building_independence', 'Building independence'),
  mostlyIndependent('mostly_independent', 'Mostly independent');

  const IndependenceLabel(this.code, this.displayText);
  final String code;
  final String displayText;

  static IndependenceLabel fromCode(String code) {
    return IndependenceLabel.values.firstWhere(
      (l) => l.code == code,
      orElse: () => IndependenceLabel.buildingIndependence,
    );
  }
}

/// Homework summary for parent dashboard.
class HomeworkSummary {
  const HomeworkSummary({
    required this.learnerId,
    required this.homeworkSessionsPerWeek,
    required this.avgStepsPerHomework,
    required this.independenceScore,
    required this.independenceLabel,
    required this.independenceLabelText,
    this.lastHomeworkDate,
    required this.totalHomeworkSessions,
  });

  final String learnerId;
  final double homeworkSessionsPerWeek;
  final double avgStepsPerHomework;
  final double independenceScore;
  final IndependenceLabel independenceLabel;
  final String independenceLabelText;
  final DateTime? lastHomeworkDate;
  final int totalHomeworkSessions;

  factory HomeworkSummary.fromJson(Map<String, dynamic> json) {
    return HomeworkSummary(
      learnerId: json['learnerId']?.toString() ?? '',
      homeworkSessionsPerWeek: (json['homeworkSessionsPerWeek'] as num?)?.toDouble() ?? 0.0,
      avgStepsPerHomework: (json['avgStepsPerHomework'] as num?)?.toDouble() ?? 0.0,
      independenceScore: (json['independenceScore'] as num?)?.toDouble() ?? 0.0,
      independenceLabel: IndependenceLabel.fromCode(json['independenceLabel']?.toString() ?? ''),
      independenceLabelText: json['independenceLabelText']?.toString() ?? '',
      lastHomeworkDate: json['lastHomeworkDate'] != null 
          ? DateTime.tryParse(json['lastHomeworkDate'].toString())
          : null,
      totalHomeworkSessions: (json['totalHomeworkSessions'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Focus summary for parent dashboard.
class FocusSummary {
  const FocusSummary({
    required this.learnerId,
    required this.avgFocusBreaksPerSession,
    required this.avgSessionDurationMinutes,
    required this.totalSessions,
    required this.summary,
  });

  final String learnerId;
  final double avgFocusBreaksPerSession;
  final double avgSessionDurationMinutes;
  final int totalSessions;
  final String summary;

  factory FocusSummary.fromJson(Map<String, dynamic> json) {
    return FocusSummary(
      learnerId: json['learnerId']?.toString() ?? '',
      avgFocusBreaksPerSession: (json['avgFocusBreaksPerSession'] as num?)?.toDouble() ?? 0.0,
      avgSessionDurationMinutes: (json['avgSessionDurationMinutes'] as num?)?.toDouble() ?? 0.0,
      totalSessions: (json['totalSessions'] as num?)?.toInt() ?? 0,
      summary: json['summary']?.toString() ?? '',
    );
  }
}

/// Combined homework and focus analytics for a learner.
class LearnerAnalytics {
  const LearnerAnalytics({
    required this.learnerId,
    required this.homework,
    required this.focus,
  });

  final String learnerId;
  final HomeworkSummary homework;
  final FocusSummary focus;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

class AnalyticsException implements Exception {
  const AnalyticsException(this.message, {this.code});
  final String message;
  final int? code;

  @override
  String toString() => message;
}

class AnalyticsService {
  AnalyticsService({String? accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        ));

  final Dio _dio;

  /// Get homework summary for a learner.
  Future<HomeworkSummary> getHomeworkSummary({
    required String parentId,
    required String learnerId,
    int days = 28,
  }) async {
    if (_useAnalyticsMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return _mockHomeworkSummary(learnerId);
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/analytics/parents/$parentId/learners/$learnerId/homework-summary',
        queryParameters: {'days': days},
      );

      if (response.data == null) {
        throw const AnalyticsException('No data returned');
      }

      return HomeworkSummary.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get focus summary for a learner.
  Future<FocusSummary> getFocusSummary({
    required String parentId,
    required String learnerId,
    int days = 28,
  }) async {
    if (_useAnalyticsMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return _mockFocusSummary(learnerId);
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/analytics/parents/$parentId/learners/$learnerId/focus-summary',
        queryParameters: {'days': days},
      );

      if (response.data == null) {
        throw const AnalyticsException('No data returned');
      }

      return FocusSummary.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get combined analytics for a learner.
  Future<LearnerAnalytics> getLearnerAnalytics({
    required String parentId,
    required String learnerId,
    int days = 28,
  }) async {
    final results = await Future.wait([
      getHomeworkSummary(parentId: parentId, learnerId: learnerId, days: days),
      getFocusSummary(parentId: parentId, learnerId: learnerId, days: days),
    ]);

    return LearnerAnalytics(
      learnerId: learnerId,
      homework: results[0] as HomeworkSummary,
      focus: results[1] as FocusSummary,
    );
  }

  AnalyticsException _handleError(DioException err) {
    final statusCode = err.response?.statusCode;
    final message = err.response?.data is Map
        ? (err.response?.data as Map)['error']?.toString() ?? err.message
        : err.message ?? 'Network error';
    return AnalyticsException(message ?? 'Unknown error', code: statusCode);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MOCK DATA
  // ════════════════════════════════════════════════════════════════════════════

  HomeworkSummary _mockHomeworkSummary(String learnerId) {
    // Generate varied mock data based on learner ID hash
    final hash = learnerId.hashCode.abs();
    final sessionsPerWeek = 1.0 + (hash % 4);
    final independenceScore = 0.2 + ((hash % 8) / 10);
    
    IndependenceLabel label;
    if (independenceScore < 0.3) {
      label = IndependenceLabel.needsSupport;
    } else if (independenceScore < 0.7) {
      label = IndependenceLabel.buildingIndependence;
    } else {
      label = IndependenceLabel.mostlyIndependent;
    }

    return HomeworkSummary(
      learnerId: learnerId,
      homeworkSessionsPerWeek: sessionsPerWeek,
      avgStepsPerHomework: 3.5 + (hash % 3),
      independenceScore: independenceScore,
      independenceLabel: label,
      independenceLabelText: label.displayText,
      lastHomeworkDate: DateTime.now().subtract(Duration(days: hash % 7)),
      totalHomeworkSessions: (sessionsPerWeek * 4).round(),
    );
  }

  FocusSummary _mockFocusSummary(String learnerId) {
    final hash = learnerId.hashCode.abs();
    final avgBreaks = 0.5 + ((hash % 3) / 2);
    final avgDuration = 12.0 + (hash % 15);

    String summary;
    if (avgBreaks < 1 && avgDuration < 20) {
      summary = 'Short, focused sessions seem to work well.';
    } else if (avgBreaks > 1.5) {
      summary = 'Regular breaks are being used to support focus.';
    } else {
      summary = 'Session lengths look healthy. Occasional breaks help maintain focus.';
    }

    return FocusSummary(
      learnerId: learnerId,
      avgFocusBreaksPerSession: avgBreaks,
      avgSessionDurationMinutes: avgDuration,
      totalSessions: 8 + (hash % 10),
      summary: summary,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

final analyticsServiceProvider = Provider<AnalyticsService>((ref) => AnalyticsService());

/// Provider for learner analytics.
final learnerAnalyticsProvider = FutureProvider.family<LearnerAnalytics, ({String parentId, String learnerId})>(
  (ref, params) async {
    final service = ref.read(analyticsServiceProvider);
    return service.getLearnerAnalytics(
      parentId: params.parentId,
      learnerId: params.learnerId,
    );
  },
);
