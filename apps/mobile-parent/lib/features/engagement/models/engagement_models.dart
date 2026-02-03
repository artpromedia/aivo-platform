/// Engagement Models
///
/// Data models for tracking student engagement, streaks, and screen time.
library;

import 'package:freezed_annotation/freezed_annotation.dart';

part 'engagement_models.freezed.dart';
part 'engagement_models.g.dart';

/// Daily learning streak data.
@freezed
class LearningStreak with _$LearningStreak {
  const factory LearningStreak({
    required String childId,
    required int currentStreak,
    required int longestStreak,
    required DateTime? lastActiveDate,
    required List<StreakDay> streakHistory,
    required int totalActiveDays,
    @Default(7) int weeklyGoal,
    @Default(0) int weeklyProgress,
  }) = _LearningStreak;

  factory LearningStreak.fromJson(Map<String, dynamic> json) =>
      _$LearningStreakFromJson(json);
}

/// Individual streak day entry.
@freezed
class StreakDay with _$StreakDay {
  const factory StreakDay({
    required DateTime date,
    required bool isActive,
    required int minutesLearned,
    required int lessonsCompleted,
    required int pointsEarned,
    String? highlight,
  }) = _StreakDay;

  factory StreakDay.fromJson(Map<String, dynamic> json) =>
      _$StreakDayFromJson(json);
}

/// Daily usage data.
@freezed
class DailyUsage with _$DailyUsage {
  const factory DailyUsage({
    required String childId,
    required DateTime date,
    required int totalMinutes,
    required int activeMinutes,
    required int idleMinutes,
    required List<UsageSession> sessions,
    required Map<String, int> subjectBreakdown,
    required int lessonsStarted,
    required int lessonsCompleted,
    required double averageEngagement,
  }) = _DailyUsage;

  factory DailyUsage.fromJson(Map<String, dynamic> json) =>
      _$DailyUsageFromJson(json);
}

/// Individual usage session.
@freezed
class UsageSession with _$UsageSession {
  const factory UsageSession({
    required String id,
    required DateTime startTime,
    required DateTime? endTime,
    required int durationMinutes,
    required String subject,
    required String activityType,
    required double engagementScore,
    String? lessonId,
    String? lessonTitle,
  }) = _UsageSession;

  factory UsageSession.fromJson(Map<String, dynamic> json) =>
      _$UsageSessionFromJson(json);
}

/// Usage summary over a time period.
@freezed
class UsageSummary with _$UsageSummary {
  const factory UsageSummary({
    required String childId,
    required DateTime startDate,
    required DateTime endDate,
    required int totalMinutes,
    required int averageDailyMinutes,
    required int totalLessons,
    required Map<String, int> subjectTotals,
    required List<DailyUsage> dailyData,
    required double engagementTrend,
  }) = _UsageSummary;

  factory UsageSummary.fromJson(Map<String, dynamic> json) =>
      _$UsageSummaryFromJson(json);
}

/// Screen time settings for a child.
@freezed
class ScreenTimeSettings with _$ScreenTimeSettings {
  const factory ScreenTimeSettings({
    required String childId,
    @Default(true) bool isEnabled,
    @Default(120) int dailyLimitMinutes,
    @Default(30) int sessionLimitMinutes,
    @Default(5) int breakDurationMinutes,
    @Default(true) bool enforceBreaks,
    required List<ScreenTimeSchedule> schedules,
    @Default(true) bool notifyOnLimitReached,
    @Default(true) bool notifyOnBreakTime,
    @Default(15) int warningMinutesBefore,
    @Default([]) List<String> allowedExtensions,
  }) = _ScreenTimeSettings;

  factory ScreenTimeSettings.fromJson(Map<String, dynamic> json) =>
      _$ScreenTimeSettingsFromJson(json);
}

/// Schedule for allowed screen time.
@freezed
class ScreenTimeSchedule with _$ScreenTimeSchedule {
  const factory ScreenTimeSchedule({
    required String id,
    required String name,
    required List<String> daysOfWeek,
    required String startTime,
    required String endTime,
    @Default(true) bool isActive,
  }) = _ScreenTimeSchedule;

  factory ScreenTimeSchedule.fromJson(Map<String, dynamic> json) =>
      _$ScreenTimeScheduleFromJson(json);
}

/// Current screen time status.
@freezed
class ScreenTimeStatus with _$ScreenTimeStatus {
  const factory ScreenTimeStatus({
    required String childId,
    required bool isWithinSchedule,
    required int usedMinutesToday,
    required int remainingMinutes,
    required int currentSessionMinutes,
    required DateTime? nextBreakTime,
    required bool isOnBreak,
    required ScreenTimeStatusLevel level,
  }) = _ScreenTimeStatus;

  factory ScreenTimeStatus.fromJson(Map<String, dynamic> json) =>
      _$ScreenTimeStatusFromJson(json);
}

/// Screen time status levels.
enum ScreenTimeStatusLevel {
  @JsonValue('GOOD')
  good,
  @JsonValue('WARNING')
  warning,
  @JsonValue('LIMIT_REACHED')
  limitReached,
  @JsonValue('OUTSIDE_SCHEDULE')
  outsideSchedule,
}

/// Engagement milestone.
@freezed
class EngagementMilestone with _$EngagementMilestone {
  const factory EngagementMilestone({
    required String id,
    required String title,
    required String description,
    required MilestoneType type,
    required int requirement,
    required int progress,
    required bool isAchieved,
    required DateTime? achievedAt,
    String? iconUrl,
    String? rewardDescription,
  }) = _EngagementMilestone;

  factory EngagementMilestone.fromJson(Map<String, dynamic> json) =>
      _$EngagementMilestoneFromJson(json);
}

/// Types of engagement milestones.
enum MilestoneType {
  @JsonValue('STREAK')
  streak,
  @JsonValue('TOTAL_MINUTES')
  totalMinutes,
  @JsonValue('LESSONS_COMPLETED')
  lessonsCompleted,
  @JsonValue('WEEKLY_GOAL')
  weeklyGoal,
  @JsonValue('SUBJECTS_EXPLORED')
  subjectsExplored,
}

/// Weekly engagement report.
@freezed
class WeeklyEngagementReport with _$WeeklyEngagementReport {
  const factory WeeklyEngagementReport({
    required String childId,
    required DateTime weekStartDate,
    required int totalMinutes,
    required int daysActive,
    required int lessonsCompleted,
    required double averageEngagement,
    required String topSubject,
    required List<EngagementMilestone> newMilestones,
    required String summary,
    required List<String> insights,
  }) = _WeeklyEngagementReport;

  factory WeeklyEngagementReport.fromJson(Map<String, dynamic> json) =>
      _$WeeklyEngagementReportFromJson(json);
}
