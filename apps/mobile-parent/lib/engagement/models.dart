import 'package:freezed_annotation/freezed_annotation.dart';

part 'models.freezed.dart';
part 'models.g.dart';

/// Child's engagement summary for parent view
@freezed
class ChildEngagementSummary with _$ChildEngagementSummary {
  const factory ChildEngagementSummary({
    required String learnerId,
    required String learnerName,
    required int totalXp,
    required int level,
    required int streakDays,
    required int totalBadges,
    required int recentBadges,
    required int kudosReceived,
    required DateTime? lastActivityAt,
  }) = _ChildEngagementSummary;

  factory ChildEngagementSummary.fromJson(Map<String, dynamic> json) =>
      _$ChildEngagementSummaryFromJson(json);
}

/// Badge information for parent view
@freezed
class ChildBadge with _$ChildBadge {
  const factory ChildBadge({
    required String code,
    required String name,
    String? description,
    String? icon,
    required String category,
    required DateTime awardedAt,
    String? grantedBy,
  }) = _ChildBadge;

  factory ChildBadge.fromJson(Map<String, dynamic> json) =>
      _$ChildBadgeFromJson(json);
}

/// Kudos that parent has sent
@freezed
class SentKudos with _$SentKudos {
  const factory SentKudos({
    required String id,
    required String learnerId,
    required String learnerName,
    required String message,
    required DateTime sentAt,
  }) = _SentKudos;

  factory SentKudos.fromJson(Map<String, dynamic> json) =>
      _$SentKudosFromJson(json);
}

/// Engagement event timeline item
@freezed
class EngagementTimelineItem with _$EngagementTimelineItem {
  const factory EngagementTimelineItem({
    required String id,
    required String type, // 'badge', 'level_up', 'streak_milestone', 'kudos'
    required String title,
    String? description,
    String? icon,
    required DateTime occurredAt,
  }) = _EngagementTimelineItem;

  factory EngagementTimelineItem.fromJson(Map<String, dynamic> json) =>
      _$EngagementTimelineItemFromJson(json);
}
