/// Tutor Models
///
/// Data models for tutor personas, add-ons, and session history.
library;

import 'package:freezed_annotation/freezed_annotation.dart';

part 'tutor_models.freezed.dart';
part 'tutor_models.g.dart';

/// Status of a tutor add-on for the current parent account.
enum TutorAddonStatus {
  /// Available for purchase.
  @JsonValue('available')
  available,

  /// Currently active on the account.
  @JsonValue('active')
  active,

  /// Previously purchased but now expired.
  @JsonValue('expired')
  expired,
}

/// Subject area a tutor persona specialises in.
enum TutorSubject {
  @JsonValue('math')
  math,
  @JsonValue('reading')
  reading,
  @JsonValue('science')
  science,
  @JsonValue('writing')
  writing,
  @JsonValue('socialStudies')
  socialStudies,
  @JsonValue('sel')
  sel,
  @JsonValue('coding')
  coding,
  @JsonValue('language')
  language,
}

/// A purchasable tutor persona add-on.
@freezed
class TutorAddon with _$TutorAddon {
  const factory TutorAddon({
    required String id,
    required String personaName,
    required String subject,
    required String description,
    required int priceCents,
    required String billingPeriod,
    required TutorAddonStatus status,
    String? avatarUrl,
    List<String>? highlights,
    String? trialDaysRemaining,
  }) = _TutorAddon;

  factory TutorAddon.fromJson(Map<String, dynamic> json) =>
      _$TutorAddonFromJson(json);
}

/// Extension on [TutorAddon] for display helpers.
extension TutorAddonDisplay on TutorAddon {
  /// Formatted price string, e.g. "\$4.99/month".
  String get priceDisplay {
    final dollars = priceCents / 100;
    final period = billingPeriod == 'YEARLY' ? '/year' : '/month';
    return '\$${dollars.toStringAsFixed(2)}$period';
  }

  /// Whether this add-on can be purchased right now.
  bool get isPurchasable => status == TutorAddonStatus.available;

  /// Whether this add-on is currently enabled.
  bool get isActive => status == TutorAddonStatus.active;
}

/// A single tutor session in a child's history.
@freezed
class TutorSession with _$TutorSession {
  const factory TutorSession({
    required String id,
    required String childId,
    required String personaName,
    required String subject,
    required int durationMinutes,
    required DateTime startedAt,
    DateTime? endedAt,
    String? summary,
    int? masteryScoreDelta,
    List<String>? topicsCovered,
    TutorSessionStatus? status,
  }) = _TutorSession;

  factory TutorSession.fromJson(Map<String, dynamic> json) =>
      _$TutorSessionFromJson(json);
}

/// Status of a tutor session.
enum TutorSessionStatus {
  @JsonValue('completed')
  completed,
  @JsonValue('inProgress')
  inProgress,
  @JsonValue('abandoned')
  abandoned,
}

/// Detailed report for a single tutor session.
@freezed
class TutorSessionReport with _$TutorSessionReport {
  const factory TutorSessionReport({
    required String sessionId,
    required String childId,
    required String personaName,
    required String subject,
    required int durationMinutes,
    required DateTime startedAt,
    DateTime? endedAt,
    required String summary,
    required List<String> topicsCovered,
    required List<String> skillsPracticed,
    int? masteryScoreBefore,
    int? masteryScoreAfter,
    String? aiNotes,
    String? parentRecommendation,
  }) = _TutorSessionReport;

  factory TutorSessionReport.fromJson(Map<String, dynamic> json) =>
      _$TutorSessionReportFromJson(json);
}

// ============================================================================
// ANALYTICS MODELS (Sprint 9)
// ============================================================================

/// Subject breakdown entry from the analytics summary.
@freezed
class SubjectBreakdown with _$SubjectBreakdown {
  const factory SubjectBreakdown({
    required String subject,
    required int sessions,
    required int minutes,
    @Default([]) List<String> topTopics,
    required String color,
  }) = _SubjectBreakdown;

  factory SubjectBreakdown.fromJson(Map<String, dynamic> json) =>
      _$SubjectBreakdownFromJson(json);
}

/// Weekly usage entry from the analytics summary.
@freezed
class WeeklyUsage with _$WeeklyUsage {
  const factory WeeklyUsage({
    required String week,
    required int sessions,
    required int minutes,
  }) = _WeeklyUsage;

  factory WeeklyUsage.fromJson(Map<String, dynamic> json) =>
      _$WeeklyUsageFromJson(json);
}

/// Per-learner breakdown from the analytics summary.
@freezed
class LearnerBreakdown with _$LearnerBreakdown {
  const factory LearnerBreakdown({
    required String learnerId,
    required int totalSessions,
    required int totalMinutes,
    String? favoriteSubject,
    String? lastSessionAt,
  }) = _LearnerBreakdown;

  factory LearnerBreakdown.fromJson(Map<String, dynamic> json) =>
      _$LearnerBreakdownFromJson(json);
}

/// Aggregated analytics summary returned by GET /analytics/summary.
@freezed
class TutorAnalyticsSummary with _$TutorAnalyticsSummary {
  const factory TutorAnalyticsSummary({
    required int totalSessions,
    required int totalMinutes,
    required int totalMessages,
    required double averageSessionMinutes,
    @Default([]) List<SubjectBreakdown> subjectBreakdown,
    @Default([]) List<WeeklyUsage> weeklyUsage,
    @Default([]) List<LearnerBreakdown> learners,
  }) = _TutorAnalyticsSummary;

  factory TutorAnalyticsSummary.fromJson(Map<String, dynamic> json) =>
      _$TutorAnalyticsSummaryFromJson(json);
}

/// Persona info embedded in an analytics session.
@freezed
class AnalyticsPersona with _$AnalyticsPersona {
  const factory AnalyticsPersona({
    required String name,
    required String slug,
    String? avatar,
  }) = _AnalyticsPersona;

  factory AnalyticsPersona.fromJson(Map<String, dynamic> json) =>
      _$AnalyticsPersonaFromJson(json);
}

/// A session entry from the paginated analytics sessions endpoint.
@freezed
class AnalyticsSession with _$AnalyticsSession {
  const factory AnalyticsSession({
    required String id,
    required String subject,
    required AnalyticsPersona persona,
    String? topic,
    required String startedAt,
    String? endedAt,
    required int durationMinutes,
    required int messageCount,
    String? locale,
    String? status,
    required String color,
  }) = _AnalyticsSession;

  factory AnalyticsSession.fromJson(Map<String, dynamic> json) =>
      _$AnalyticsSessionFromJson(json);
}

/// Paginated session list response.
@freezed
class AnalyticsSessionsResponse with _$AnalyticsSessionsResponse {
  const factory AnalyticsSessionsResponse({
    required List<AnalyticsSession> sessions,
    required int total,
    required int page,
    required int pageSize,
    required int totalPages,
  }) = _AnalyticsSessionsResponse;

  factory AnalyticsSessionsResponse.fromJson(Map<String, dynamic> json) =>
      _$AnalyticsSessionsResponseFromJson(json);
}

/// A single message in a transcript.
@freezed
class TranscriptMessage with _$TranscriptMessage {
  const factory TranscriptMessage({
    required String id,
    required String role,
    required String content,
    String? emotion,
    required String createdAt,
  }) = _TranscriptMessage;

  factory TranscriptMessage.fromJson(Map<String, dynamic> json) =>
      _$TranscriptMessageFromJson(json);
}

/// Transcript response with session metadata and messages.
@freezed
class TranscriptResponse with _$TranscriptResponse {
  const factory TranscriptResponse({
    required TranscriptSession session,
    required List<TranscriptMessage> messages,
  }) = _TranscriptResponse;

  factory TranscriptResponse.fromJson(Map<String, dynamic> json) =>
      _$TranscriptResponseFromJson(json);
}

/// Session metadata within a transcript response.
@freezed
class TranscriptSession with _$TranscriptSession {
  const factory TranscriptSession({
    required String id,
    required String subject,
    String? topic,
    required AnalyticsPersona persona,
    required String startedAt,
    String? endedAt,
    required int durationMinutes,
    String? locale,
  }) = _TranscriptSession;

  factory TranscriptSession.fromJson(Map<String, dynamic> json) =>
      _$TranscriptSessionFromJson(json);
}
