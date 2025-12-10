import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'analytics_service.dart';

const _baseUrl = String.fromEnvironment('ANALYTICS_BASE_URL', defaultValue: 'http://localhost:4030');
const _useAnalyticsMock = bool.fromEnvironment('USE_ANALYTICS_MOCK', defaultValue: true);

// ══════════════════════════════════════════════════════════════════════════════
// MODELS - Learner Summary
// ══════════════════════════════════════════════════════════════════════════════

/// Engagement metrics for the summary view.
@immutable
class EngagementSummary {
  const EngagementSummary({
    required this.sessionsThisWeek,
    required this.sessionsLastWeek,
    required this.avgSessionDurationMinutes,
    required this.daysActiveInRange,
    required this.totalSessionsInRange,
  });

  final int sessionsThisWeek;
  final int sessionsLastWeek;
  final double avgSessionDurationMinutes;
  final int daysActiveInRange;
  final int totalSessionsInRange;

  factory EngagementSummary.fromJson(Map<String, dynamic> json) {
    return EngagementSummary(
      sessionsThisWeek: (json['sessionsThisWeek'] as num?)?.toInt() ?? 0,
      sessionsLastWeek: (json['sessionsLastWeek'] as num?)?.toInt() ?? 0,
      avgSessionDurationMinutes: (json['avgSessionDurationMinutes'] as num?)?.toDouble() ?? 0.0,
      daysActiveInRange: (json['daysActiveInRange'] as num?)?.toInt() ?? 0,
      totalSessionsInRange: (json['totalSessionsInRange'] as num?)?.toInt() ?? 0,
    );
  }

  /// Get session trend compared to last week.
  String get sessionTrendText {
    final diff = sessionsThisWeek - sessionsLastWeek;
    if (diff > 0) return '+$diff from last week';
    if (diff < 0) return '${diff.abs()} fewer than last week';
    return 'Same as last week';
  }

  /// Whether sessions increased this week.
  bool get isImproving => sessionsThisWeek > sessionsLastWeek;
}

/// A single data point in subject progress timeseries.
@immutable
class SubjectProgressPoint {
  const SubjectProgressPoint({
    required this.date,
    required this.avgMasteryScore,
    required this.masteredSkills,
    required this.totalSkills,
  });

  final String date;
  final double avgMasteryScore;
  final int masteredSkills;
  final int totalSkills;

  factory SubjectProgressPoint.fromJson(Map<String, dynamic> json) {
    return SubjectProgressPoint(
      date: json['date']?.toString() ?? '',
      avgMasteryScore: (json['avgMasteryScore'] as num?)?.toDouble() ?? 0.0,
      masteredSkills: (json['masteredSkills'] as num?)?.toInt() ?? 0,
      totalSkills: (json['totalSkills'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Progress data for a single subject.
@immutable
class SubjectProgress {
  const SubjectProgress({
    required this.subjectCode,
    required this.subjectName,
    required this.timeseries,
    required this.skillsMasteredDelta,
    required this.currentMastery,
  });

  final String subjectCode;
  final String subjectName;
  final List<SubjectProgressPoint> timeseries;
  final int skillsMasteredDelta;
  final double currentMastery;

  factory SubjectProgress.fromJson(Map<String, dynamic> json) {
    final timeseriesJson = json['timeseries'] as List<dynamic>? ?? [];
    return SubjectProgress(
      subjectCode: json['subjectCode']?.toString() ?? '',
      subjectName: json['subjectName']?.toString() ?? '',
      timeseries: timeseriesJson
          .whereType<Map<String, dynamic>>()
          .map(SubjectProgressPoint.fromJson)
          .toList(),
      skillsMasteredDelta: (json['skillsMasteredDelta'] as num?)?.toInt() ?? 0,
      currentMastery: (json['currentMastery'] as num?)?.toDouble() ?? 0.0,
    );
  }

  /// Display mastery as percentage.
  int get masteryPercent => (currentMastery * 100).round();

  /// Friendly progress text.
  String get progressText {
    if (skillsMasteredDelta > 0) {
      return '+$skillsMasteredDelta skills mastered';
    } else if (skillsMasteredDelta == 0) {
      return 'Practicing current skills';
    }
    return 'Reviewing concepts';
  }
}

/// Learning progress summary with per-subject breakdowns.
@immutable
class LearningProgressSummary {
  const LearningProgressSummary({
    required this.bySubject,
    required this.totalSkillsMasteredDelta,
  });

  final List<SubjectProgress> bySubject;
  final int totalSkillsMasteredDelta;

  factory LearningProgressSummary.fromJson(Map<String, dynamic> json) {
    final bySubjectJson = json['bySubject'] as List<dynamic>? ?? [];
    return LearningProgressSummary(
      bySubject: bySubjectJson
          .whereType<Map<String, dynamic>>()
          .map(SubjectProgress.fromJson)
          .toList(),
      totalSkillsMasteredDelta: (json['totalSkillsMasteredDelta'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Homework usage summary.
@immutable
class HomeworkUsageSummary {
  const HomeworkUsageSummary({
    required this.totalHomeworkSessions,
    required this.avgStepsCompletedPerSession,
    required this.completionRate,
  });

  final int totalHomeworkSessions;
  final double avgStepsCompletedPerSession;
  final double completionRate;

  factory HomeworkUsageSummary.fromJson(Map<String, dynamic> json) {
    return HomeworkUsageSummary(
      totalHomeworkSessions: (json['totalHomeworkSessions'] as num?)?.toInt() ?? 0,
      avgStepsCompletedPerSession: (json['avgStepsCompletedPerSession'] as num?)?.toDouble() ?? 0.0,
      completionRate: (json['completionRate'] as num?)?.toDouble() ?? 0.0,
    );
  }

  int get completionPercent => (completionRate * 100).round();
}

/// Focus/break summary.
@immutable
class FocusBreakSummary {
  const FocusBreakSummary({
    required this.totalFocusBreaks,
    required this.totalSessions,
    required this.avgBreaksPerSession,
    required this.focusBreaksSummary,
  });

  final int totalFocusBreaks;
  final int totalSessions;
  final double avgBreaksPerSession;
  final String focusBreaksSummary;

  factory FocusBreakSummary.fromJson(Map<String, dynamic> json) {
    return FocusBreakSummary(
      totalFocusBreaks: (json['totalFocusBreaks'] as num?)?.toInt() ?? 0,
      totalSessions: (json['totalSessions'] as num?)?.toInt() ?? 0,
      avgBreaksPerSession: (json['avgBreaksPerSession'] as num?)?.toDouble() ?? 0.0,
      focusBreaksSummary: json['focusBreaksSummary']?.toString() ?? '',
    );
  }
}

/// Complete learner summary for parent dashboard.
@immutable
class LearnerSummary {
  const LearnerSummary({
    required this.learnerId,
    required this.dateRange,
    required this.engagement,
    required this.learningProgress,
    required this.homeworkUsage,
    required this.focusSummary,
  });

  final String learnerId;
  final ({String from, String to}) dateRange;
  final EngagementSummary engagement;
  final LearningProgressSummary learningProgress;
  final HomeworkUsageSummary homeworkUsage;
  final FocusBreakSummary focusSummary;

  factory LearnerSummary.fromJson(Map<String, dynamic> json) {
    final dateRangeJson = json['dateRange'] as Map<String, dynamic>? ?? {};
    final engagementJson = json['engagement'] as Map<String, dynamic>? ?? {};
    final progressJson = json['learningProgress'] as Map<String, dynamic>? ?? {};
    final homeworkJson = json['homeworkUsage'] as Map<String, dynamic>? ?? {};
    final focusJson = json['focusSummary'] as Map<String, dynamic>? ?? {};

    return LearnerSummary(
      learnerId: json['learnerId']?.toString() ?? '',
      dateRange: (
        from: dateRangeJson['from']?.toString() ?? '',
        to: dateRangeJson['to']?.toString() ?? '',
      ),
      engagement: EngagementSummary.fromJson(engagementJson),
      learningProgress: LearningProgressSummary.fromJson(progressJson),
      homeworkUsage: HomeworkUsageSummary.fromJson(homeworkJson),
      focusSummary: FocusBreakSummary.fromJson(focusJson),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MODELS - Strengths & Needs
// ══════════════════════════════════════════════════════════════════════════════

/// A strength or support area identified for the learner.
@immutable
class StrengthOrNeedArea {
  const StrengthOrNeedArea({
    required this.subjectCode,
    required this.subjectName,
    required this.skillName,
    required this.masteryScore,
    required this.description,
  });

  final String subjectCode;
  final String subjectName;
  final String skillName;
  final double masteryScore;
  final String description;

  factory StrengthOrNeedArea.fromJson(Map<String, dynamic> json) {
    return StrengthOrNeedArea(
      subjectCode: json['subjectCode']?.toString() ?? '',
      subjectName: json['subjectName']?.toString() ?? '',
      skillName: json['skillName']?.toString() ?? '',
      masteryScore: (json['masteryScore'] as num?)?.toDouble() ?? 0.0,
      description: json['description']?.toString() ?? '',
    );
  }

  int get masteryPercent => (masteryScore * 100).round();
}

/// Strengths and support areas response.
@immutable
class StrengthsAndNeeds {
  const StrengthsAndNeeds({
    required this.learnerId,
    required this.strengths,
    required this.needsSupport,
    required this.overallMessage,
  });

  final String learnerId;
  final List<StrengthOrNeedArea> strengths;
  final List<StrengthOrNeedArea> needsSupport;
  final String overallMessage;

  factory StrengthsAndNeeds.fromJson(Map<String, dynamic> json) {
    final strengthsJson = json['strengths'] as List<dynamic>? ?? [];
    final needsJson = json['needsSupport'] as List<dynamic>? ?? [];

    return StrengthsAndNeeds(
      learnerId: json['learnerId']?.toString() ?? '',
      strengths: strengthsJson
          .whereType<Map<String, dynamic>>()
          .map(StrengthOrNeedArea.fromJson)
          .toList(),
      needsSupport: needsJson
          .whereType<Map<String, dynamic>>()
          .map(StrengthOrNeedArea.fromJson)
          .toList(),
      overallMessage: json['overallMessage']?.toString() ?? '',
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTROLLER STATE
// ══════════════════════════════════════════════════════════════════════════════

@immutable
class ChildProgressState {
  const ChildProgressState({
    this.isLoading = true,
    this.error,
    this.summary,
    this.strengthsAndNeeds,
  });

  final bool isLoading;
  final String? error;
  final LearnerSummary? summary;
  final StrengthsAndNeeds? strengthsAndNeeds;

  ChildProgressState copyWith({
    bool? isLoading,
    String? error,
    LearnerSummary? summary,
    StrengthsAndNeeds? strengthsAndNeeds,
  }) {
    return ChildProgressState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      summary: summary ?? this.summary,
      strengthsAndNeeds: strengthsAndNeeds ?? this.strengthsAndNeeds,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════

class AnalyticsController extends StateNotifier<ChildProgressState> {
  AnalyticsController({
    required this.learnerId,
    String? accessToken,
  })  : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        )),
        super(const ChildProgressState());

  final String learnerId;
  final Dio _dio;

  /// Fetch all progress data for the child.
  Future<void> fetchProgress({String? from, String? to}) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      if (_useAnalyticsMock) {
        await Future.delayed(const Duration(milliseconds: 600));
        state = state.copyWith(
          isLoading: false,
          summary: _mockLearnerSummary(learnerId),
          strengthsAndNeeds: _mockStrengthsAndNeeds(learnerId),
        );
        return;
      }

      // Fetch summary and strengths in parallel
      final queryParams = <String, String>{};
      if (from != null) queryParams['from'] = from;
      if (to != null) queryParams['to'] = to;

      final responses = await Future.wait([
        _dio.get<Map<String, dynamic>>(
          '/analytics/learners/$learnerId/summary',
          queryParameters: queryParams,
        ),
        _dio.get<Map<String, dynamic>>(
          '/analytics/learners/$learnerId/strengths-and-needs',
        ),
      ]);

      final summaryData = responses[0].data;
      final strengthsData = responses[1].data;

      if (summaryData == null || strengthsData == null) {
        throw const AnalyticsException('No data returned');
      }

      state = state.copyWith(
        isLoading: false,
        summary: LearnerSummary.fromJson(summaryData),
        strengthsAndNeeds: StrengthsAndNeeds.fromJson(strengthsData),
      );
    } on DioException catch (err) {
      final message = err.response?.data is Map
          ? (err.response?.data as Map)['error']?.toString() ?? 'Network error'
          : 'Network error';
      state = state.copyWith(isLoading: false, error: message);
    } catch (err) {
      state = state.copyWith(isLoading: false, error: err.toString());
    }
  }

  /// Refresh all data.
  Future<void> refresh() => fetchProgress();

  // ════════════════════════════════════════════════════════════════════════════
  // MOCK DATA
  // ════════════════════════════════════════════════════════════════════════════

  LearnerSummary _mockLearnerSummary(String learnerId) {
    final hash = learnerId.hashCode.abs();
    final now = DateTime.now();
    final fourWeeksAgo = now.subtract(const Duration(days: 28));

    return LearnerSummary(
      learnerId: learnerId,
      dateRange: (
        from: '${fourWeeksAgo.year}-${fourWeeksAgo.month.toString().padLeft(2, '0')}-${fourWeeksAgo.day.toString().padLeft(2, '0')}',
        to: '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}',
      ),
      engagement: EngagementSummary(
        sessionsThisWeek: 3 + (hash % 5),
        sessionsLastWeek: 2 + (hash % 4),
        avgSessionDurationMinutes: 12.0 + (hash % 10),
        daysActiveInRange: 10 + (hash % 8),
        totalSessionsInRange: 15 + (hash % 12),
      ),
      learningProgress: LearningProgressSummary(
        bySubject: [
          SubjectProgress(
            subjectCode: 'MATH',
            subjectName: 'Mathematics',
            timeseries: _mockTimeseries(hash),
            skillsMasteredDelta: 2 + (hash % 4),
            currentMastery: 0.45 + ((hash % 30) / 100),
          ),
          SubjectProgress(
            subjectCode: 'ELA',
            subjectName: 'English Language Arts',
            timeseries: _mockTimeseries(hash + 1),
            skillsMasteredDelta: 1 + (hash % 3),
            currentMastery: 0.52 + ((hash % 25) / 100),
          ),
        ],
        totalSkillsMasteredDelta: 3 + (hash % 6),
      ),
      homeworkUsage: HomeworkUsageSummary(
        totalHomeworkSessions: 5 + (hash % 8),
        avgStepsCompletedPerSession: 3.0 + (hash % 3),
        completionRate: 0.7 + ((hash % 20) / 100),
      ),
      focusSummary: FocusBreakSummary(
        totalFocusBreaks: 8 + (hash % 10),
        totalSessions: 15 + (hash % 12),
        avgBreaksPerSession: 0.5 + ((hash % 10) / 10),
        focusBreaksSummary: hash % 2 == 0
            ? 'Maintaining strong focus during sessions.'
            : 'Taking healthy breaks to stay refreshed.',
      ),
    );
  }

  List<SubjectProgressPoint> _mockTimeseries(int hash) {
    final now = DateTime.now();
    return List.generate(4, (i) {
      final date = now.subtract(Duration(days: 21 - (i * 7)));
      final baseMastery = 0.35 + (i * 0.08) + ((hash % 10) / 100);
      return SubjectProgressPoint(
        date: '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}',
        avgMasteryScore: baseMastery,
        masteredSkills: 6 + i + (hash % 3),
        totalSkills: 20 + (hash % 5),
      );
    });
  }

  StrengthsAndNeeds _mockStrengthsAndNeeds(String learnerId) {
    final hash = learnerId.hashCode.abs();

    return StrengthsAndNeeds(
      learnerId: learnerId,
      strengths: [
        StrengthOrNeedArea(
          subjectCode: 'ELA',
          subjectName: 'English Language Arts',
          skillName: 'Reading Comprehension',
          masteryScore: 0.82 + ((hash % 10) / 100),
          description: 'Strong foundation in Reading Comprehension',
        ),
        if (hash % 3 != 0)
          StrengthOrNeedArea(
            subjectCode: 'MATH',
            subjectName: 'Mathematics',
            skillName: 'Addition & Subtraction',
            masteryScore: 0.75 + ((hash % 8) / 100),
            description: 'Strong foundation in Addition & Subtraction',
          ),
      ],
      needsSupport: [
        StrengthOrNeedArea(
          subjectCode: 'MATH',
          subjectName: 'Mathematics',
          skillName: 'Fractions',
          masteryScore: 0.28 + ((hash % 15) / 100),
          description: 'Building foundation in Fractions',
        ),
        if (hash % 2 == 0)
          StrengthOrNeedArea(
            subjectCode: 'ELA',
            subjectName: 'English Language Arts',
            skillName: 'Grammar',
            masteryScore: 0.38 + ((hash % 10) / 100),
            description: 'Growing confidence with Grammar',
          ),
      ],
      overallMessage: hash % 2 == 0
          ? 'Showing strengths while continuing to grow in other areas.'
          : 'Making great progress across all areas!',
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

/// Provider for child progress analytics controller.
final childProgressControllerProvider = StateNotifierProvider.autoDispose
    .family<AnalyticsController, ChildProgressState, String>(
  (ref, learnerId) {
    final controller = AnalyticsController(learnerId: learnerId);
    controller.fetchProgress();
    return controller;
  },
);

/// Convenience provider for learner summary data.
final learnerSummaryProvider = FutureProvider.family<LearnerSummary, String>(
  (ref, learnerId) async {
    final state = ref.watch(childProgressControllerProvider(learnerId));
    if (state.error != null) throw Exception(state.error);
    if (state.summary != null) return state.summary!;
    
    // Wait for data to load
    await Future.delayed(const Duration(milliseconds: 100));
    throw Exception('Loading...');
  },
);
