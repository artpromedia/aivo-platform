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
