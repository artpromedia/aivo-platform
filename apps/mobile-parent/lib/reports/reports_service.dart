import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _baseUrl = String.fromEnvironment('REPORTS_BASE_URL', defaultValue: 'http://localhost:4050');
const _useReportsMock = bool.fromEnvironment('USE_REPORTS_MOCK', defaultValue: true);

// ══════════════════════════════════════════════════════════════════════════════
// MODELS
// ══════════════════════════════════════════════════════════════════════════════

/// Domain summary from baseline assessment.
class DomainSummary {
  const DomainSummary({
    required this.domain,
    required this.assessed,
    required this.summary,
  });

  final String domain;
  final bool assessed;
  final String summary;

  factory DomainSummary.fromJson(Map<String, dynamic> json) => DomainSummary(
        domain: json['domain']?.toString() ?? '',
        assessed: json['assessed'] as bool? ?? false,
        summary: json['summary']?.toString() ?? '',
      );
}

/// Baseline summary section.
class BaselineSummary {
  const BaselineSummary({
    required this.status,
    this.completedAt,
    required this.domains,
    required this.overallSummary,
  });

  final String status;
  final DateTime? completedAt;
  final List<DomainSummary> domains;
  final String overallSummary;

  factory BaselineSummary.fromJson(Map<String, dynamic> json) => BaselineSummary(
        status: json['status']?.toString() ?? 'NOT_STARTED',
        completedAt: json['completedAt'] != null
            ? DateTime.tryParse(json['completedAt'].toString())
            : null,
        domains: (json['domains'] as List<dynamic>?)
                ?.map((d) => DomainSummary.fromJson(d as Map<String, dynamic>))
                .toList() ??
            [],
        overallSummary: json['overallSummary']?.toString() ?? '',
      );
}

/// Skill detail (strength or focus area).
class SkillDetail {
  const SkillDetail({
    required this.domain,
    required this.skill,
    required this.description,
  });

  final String domain;
  final String skill;
  final String description;

  factory SkillDetail.fromJson(Map<String, dynamic> json) => SkillDetail(
        domain: json['domain']?.toString() ?? '',
        skill: json['skill']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
      );
}

/// Virtual Brain summary section.
class VirtualBrainSummary {
  const VirtualBrainSummary({
    required this.initialized,
    this.gradeBand,
    required this.strengths,
    required this.focusAreas,
    required this.overallSummary,
  });

  final bool initialized;
  final String? gradeBand;
  final List<SkillDetail> strengths;
  final List<SkillDetail> focusAreas;
  final String overallSummary;

  factory VirtualBrainSummary.fromJson(Map<String, dynamic> json) => VirtualBrainSummary(
        initialized: json['initialized'] as bool? ?? false,
        gradeBand: json['gradeBand']?.toString(),
        strengths: (json['strengths'] as List<dynamic>?)
                ?.map((s) => SkillDetail.fromJson(s as Map<String, dynamic>))
                .toList() ??
            [],
        focusAreas: (json['focusAreas'] as List<dynamic>?)
                ?.map((s) => SkillDetail.fromJson(s as Map<String, dynamic>))
                .toList() ??
            [],
        overallSummary: json['overallSummary']?.toString() ?? '',
      );
}

/// Goal detail for report.
class GoalDetail {
  const GoalDetail({
    required this.id,
    required this.title,
    required this.domain,
    required this.status,
    required this.progressText,
    required this.startDate,
    this.targetDate,
  });

  final String id;
  final String title;
  final String domain;
  final String status;
  final String progressText;
  final DateTime startDate;
  final DateTime? targetDate;

  factory GoalDetail.fromJson(Map<String, dynamic> json) => GoalDetail(
        id: json['id']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        domain: json['domain']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        progressText: json['progressText']?.toString() ?? '',
        startDate: DateTime.tryParse(json['startDate']?.toString() ?? '') ?? DateTime.now(),
        targetDate: json['targetDate'] != null
            ? DateTime.tryParse(json['targetDate'].toString())
            : null,
      );
}

/// Goals summary section.
class GoalsSummary {
  const GoalsSummary({
    required this.activeGoals,
    required this.completedCount,
    required this.overallSummary,
  });

  final List<GoalDetail> activeGoals;
  final int completedCount;
  final String overallSummary;

  factory GoalsSummary.fromJson(Map<String, dynamic> json) => GoalsSummary(
        activeGoals: (json['activeGoals'] as List<dynamic>?)
                ?.map((g) => GoalDetail.fromJson(g as Map<String, dynamic>))
                .toList() ??
            [],
        completedCount: (json['completedCount'] as num?)?.toInt() ?? 0,
        overallSummary: json['overallSummary']?.toString() ?? '',
      );
}

/// Homework summary section.
class HomeworkReportSummary {
  const HomeworkReportSummary({
    required this.sessionsPerWeek,
    required this.avgStepsPerSession,
    required this.independenceScore,
    required this.independenceLabel,
    required this.independenceLabelText,
    this.lastSessionDate,
    required this.totalSessions,
    required this.summary,
  });

  final double sessionsPerWeek;
  final double avgStepsPerSession;
  final double independenceScore;
  final String independenceLabel;
  final String independenceLabelText;
  final DateTime? lastSessionDate;
  final int totalSessions;
  final String summary;

  factory HomeworkReportSummary.fromJson(Map<String, dynamic> json) => HomeworkReportSummary(
        sessionsPerWeek: (json['sessionsPerWeek'] as num?)?.toDouble() ?? 0.0,
        avgStepsPerSession: (json['avgStepsPerSession'] as num?)?.toDouble() ?? 0.0,
        independenceScore: (json['independenceScore'] as num?)?.toDouble() ?? 0.0,
        independenceLabel: json['independenceLabel']?.toString() ?? '',
        independenceLabelText: json['independenceLabelText']?.toString() ?? '',
        lastSessionDate: json['lastSessionDate'] != null
            ? DateTime.tryParse(json['lastSessionDate'].toString())
            : null,
        totalSessions: (json['totalSessions'] as num?)?.toInt() ?? 0,
        summary: json['summary']?.toString() ?? '',
      );
}

/// Focus summary section.
class FocusReportSummary {
  const FocusReportSummary({
    required this.avgBreaksPerSession,
    required this.avgSessionDurationMinutes,
    required this.totalSessions,
    required this.summary,
  });

  final double avgBreaksPerSession;
  final double avgSessionDurationMinutes;
  final int totalSessions;
  final String summary;

  factory FocusReportSummary.fromJson(Map<String, dynamic> json) => FocusReportSummary(
        avgBreaksPerSession: (json['avgBreaksPerSession'] as num?)?.toDouble() ?? 0.0,
        avgSessionDurationMinutes: (json['avgSessionDurationMinutes'] as num?)?.toDouble() ?? 0.0,
        totalSessions: (json['totalSessions'] as num?)?.toInt() ?? 0,
        summary: json['summary']?.toString() ?? '',
      );
}

/// Complete parent learner report.
class ParentLearnerReport {
  const ParentLearnerReport({
    required this.learnerId,
    required this.learnerName,
    required this.generatedAt,
    required this.reportPeriodDays,
    required this.baseline,
    required this.virtualBrain,
    required this.goals,
    required this.homework,
    required this.focus,
  });

  final String learnerId;
  final String learnerName;
  final DateTime generatedAt;
  final int reportPeriodDays;
  final BaselineSummary baseline;
  final VirtualBrainSummary virtualBrain;
  final GoalsSummary goals;
  final HomeworkReportSummary homework;
  final FocusReportSummary focus;

  factory ParentLearnerReport.fromJson(Map<String, dynamic> json) => ParentLearnerReport(
        learnerId: json['learnerId']?.toString() ?? '',
        learnerName: json['learnerName']?.toString() ?? '',
        generatedAt: DateTime.tryParse(json['generatedAt']?.toString() ?? '') ?? DateTime.now(),
        reportPeriodDays: (json['reportPeriodDays'] as num?)?.toInt() ?? 28,
        baseline: BaselineSummary.fromJson(json['baseline'] as Map<String, dynamic>? ?? {}),
        virtualBrain:
            VirtualBrainSummary.fromJson(json['virtualBrain'] as Map<String, dynamic>? ?? {}),
        goals: GoalsSummary.fromJson(json['goals'] as Map<String, dynamic>? ?? {}),
        homework: HomeworkReportSummary.fromJson(json['homework'] as Map<String, dynamic>? ?? {}),
        focus: FocusReportSummary.fromJson(json['focus'] as Map<String, dynamic>? ?? {}),
      );
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

class ReportsException implements Exception {
  const ReportsException(this.message, {this.code});
  final String message;
  final int? code;

  @override
  String toString() => message;
}

class ReportsService {
  ReportsService({String? accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        ));

  final Dio _dio;

  /// Get parent learner report.
  Future<ParentLearnerReport> getParentLearnerReport({
    required String learnerId,
    int days = 28,
  }) async {
    if (_useReportsMock) {
      await Future.delayed(const Duration(milliseconds: 600));
      return _mockParentLearnerReport(learnerId);
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/reports/learners/$learnerId/parent-summary',
        queryParameters: {'days': days},
      );

      if (response.data == null) {
        throw const ReportsException('No data returned');
      }

      return ParentLearnerReport.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  ReportsException _handleError(DioException err) {
    final statusCode = err.response?.statusCode;
    final message = err.response?.data is Map
        ? (err.response?.data as Map)['error']?.toString() ?? err.message
        : err.message ?? 'Network error';
    return ReportsException(message ?? 'Unknown error', code: statusCode);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MOCK DATA
  // ════════════════════════════════════════════════════════════════════════════

  ParentLearnerReport _mockParentLearnerReport(String learnerId) {
    final hash = learnerId.hashCode.abs();
    final isBaselineComplete = hash % 3 != 0;
    final hasGoals = hash % 4 != 0;

    return ParentLearnerReport(
      learnerId: learnerId,
      learnerName: 'Mock Learner',
      generatedAt: DateTime.now(),
      reportPeriodDays: 28,
      baseline: BaselineSummary(
        status: isBaselineComplete ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: isBaselineComplete ? DateTime.now().subtract(const Duration(days: 14)) : null,
        domains: [
          DomainSummary(
            domain: 'Reading & Language Arts',
            assessed: true,
            summary: 'Strong foundation in reading comprehension.',
          ),
          DomainSummary(
            domain: 'Mathematics',
            assessed: true,
            summary: 'Building skills in math operations.',
          ),
          DomainSummary(
            domain: 'Social-Emotional Skills',
            assessed: isBaselineComplete,
            summary:
                isBaselineComplete ? 'Good progress in social interactions.' : 'Not yet assessed.',
          ),
        ],
        overallSummary: isBaselineComplete
            ? 'Baseline assessment completed on ${DateTime.now().subtract(const Duration(days: 14)).toString().split(' ')[0]}.'
            : 'Your child is currently working through the baseline assessment.',
      ),
      virtualBrain: VirtualBrainSummary(
        initialized: isBaselineComplete,
        gradeBand: 'K5',
        strengths: isBaselineComplete
            ? [
                const SkillDetail(
                  domain: 'Reading & Language Arts',
                  skill: 'Reading Comprehension',
                  description: 'Excellent mastery of reading comprehension.',
                ),
                const SkillDetail(
                  domain: 'Mathematics',
                  skill: 'Number Recognition',
                  description: 'Strong understanding of number recognition.',
                ),
              ]
            : [],
        focusAreas: isBaselineComplete
            ? [
                const SkillDetail(
                  domain: 'Mathematics',
                  skill: 'Addition & Subtraction',
                  description: 'Building foundation in addition & subtraction.',
                ),
              ]
            : [],
        overallSummary: isBaselineComplete
            ? 'Your child shows strengths across multiple areas. Learning activities will build on these while developing focus areas.'
            : 'Learning profile is being established as your child completes activities.',
      ),
      goals: GoalsSummary(
        activeGoals: hasGoals
            ? [
                GoalDetail(
                  id: 'goal-1',
                  title: 'Improve reading fluency',
                  domain: 'Reading & Language Arts',
                  status: 'ACTIVE',
                  progressText: '2 of 4 milestones complete. Good progress.',
                  startDate: DateTime.now().subtract(const Duration(days: 30)),
                  targetDate: DateTime.now().add(const Duration(days: 60)),
                ),
                GoalDetail(
                  id: 'goal-2',
                  title: 'Master single-digit addition',
                  domain: 'Mathematics',
                  status: 'ACTIVE',
                  progressText: 'Making steady progress.',
                  startDate: DateTime.now().subtract(const Duration(days: 14)),
                  targetDate: DateTime.now().add(const Duration(days: 45)),
                ),
              ]
            : [],
        completedCount: hasGoals ? 1 : 0,
        overallSummary: hasGoals
            ? '1 goal completed! Currently working on 2 active goals.'
            : 'No goals have been set yet. Goals help track progress toward specific learning outcomes.',
      ),
      homework: HomeworkReportSummary(
        sessionsPerWeek: 2.5 + (hash % 3),
        avgStepsPerSession: 4.2,
        independenceScore: 0.65 + ((hash % 3) / 10),
        independenceLabel: 'building_independence',
        independenceLabelText: 'Building independence',
        lastSessionDate: DateTime.now().subtract(Duration(days: hash % 5)),
        totalSessions: 12 + (hash % 8),
        summary: 'Good engagement with homework helper. Building independence with each session.',
      ),
      focus: FocusReportSummary(
        avgBreaksPerSession: 1.2,
        avgSessionDurationMinutes: 18.5,
        totalSessions: 15,
        summary: 'Session lengths look healthy. Occasional breaks help maintain focus.',
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

final reportsServiceProvider = Provider<ReportsService>((ref) => ReportsService());

/// Provider for parent learner report.
final parentLearnerReportProvider =
    FutureProvider.family<ParentLearnerReport, String>((ref, learnerId) async {
  final service = ref.read(reportsServiceProvider);
  return service.getParentLearnerReport(learnerId: learnerId);
});
