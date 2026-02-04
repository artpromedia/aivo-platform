/// Engagement Providers
///
/// State management for streaks, usage tracking, and screen time.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/api_client.dart';
import '../api/engagement_api.dart';
import '../models/engagement_models.dart';

part 'engagement_provider.g.dart';

/// Provider for engagement API.
@riverpod
EngagementApi engagementApi(Ref ref) {
  final dio = ref.watch(dioProvider);
  return EngagementApi(dio: dio);
}

// ============================================================
// Streak Providers
// ============================================================

/// Provider for learning streak data.
@riverpod
class StreakNotifier extends _$StreakNotifier {
  @override
  Future<LearningStreak> build(String childId) async {
    final api = ref.watch(engagementApiProvider);
    return api.fetchStreak(childId);
  }

  /// Refreshes the streak data.
  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(engagementApiProvider);
      return api.fetchStreak(childId);
    });
  }

  /// Updates the weekly goal.
  Future<void> updateWeeklyGoal(int goal) async {
    final api = ref.read(engagementApiProvider);
    final updated = await api.updateWeeklyGoal(childId, goal);
    state = AsyncData(updated);
  }
}

/// Provider for streak history calendar data.
@riverpod
Future<List<StreakDay>> streakHistory(
  Ref ref,
  String childId, {
  required DateTime startDate,
  required DateTime endDate,
}) async {
  final api = ref.watch(engagementApiProvider);
  return api.fetchStreakHistory(childId, startDate: startDate, endDate: endDate);
}

/// Provider for current month's streak calendar.
@riverpod
Future<List<StreakDay>> currentMonthStreak(Ref ref, String childId) async {
  final now = DateTime.now();
  final startOfMonth = DateTime(now.year, now.month, 1);
  final endOfMonth = DateTime(now.year, now.month + 1, 0);

  final api = ref.watch(engagementApiProvider);
  return api.fetchStreakHistory(childId, startDate: startOfMonth, endDate: endOfMonth);
}

// ============================================================
// Usage Tracking Providers
// ============================================================

/// Provider for today's usage data.
@riverpod
Future<DailyUsage> todayUsage(Ref ref, String childId) async {
  final api = ref.watch(engagementApiProvider);
  return api.fetchDailyUsage(childId, DateTime.now());
}

/// Provider for usage on a specific date.
@riverpod
Future<DailyUsage> dailyUsage(Ref ref, String childId, DateTime date) async {
  final api = ref.watch(engagementApiProvider);
  return api.fetchDailyUsage(childId, date);
}

/// Provider for weekly usage summary.
@riverpod
Future<UsageSummary> weeklyUsage(Ref ref, String childId) async {
  final now = DateTime.now();
  final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
  final endOfWeek = startOfWeek.add(const Duration(days: 6));

  final api = ref.watch(engagementApiProvider);
  return api.fetchUsageSummary(childId, startDate: startOfWeek, endDate: endOfWeek);
}

/// Provider for monthly usage summary.
@riverpod
Future<UsageSummary> monthlyUsage(Ref ref, String childId) async {
  final now = DateTime.now();
  final startOfMonth = DateTime(now.year, now.month, 1);
  final endOfMonth = DateTime(now.year, now.month + 1, 0);

  final api = ref.watch(engagementApiProvider);
  return api.fetchUsageSummary(childId, startDate: startOfMonth, endDate: endOfMonth);
}

/// Provider for recent usage sessions.
@riverpod
Future<List<UsageSession>> recentSessions(Ref ref, String childId) async {
  final api = ref.watch(engagementApiProvider);
  return api.fetchRecentSessions(childId);
}

// ============================================================
// Screen Time Providers
// ============================================================

/// Notifier for screen time settings.
@riverpod
class ScreenTimeSettingsNotifier extends _$ScreenTimeSettingsNotifier {
  @override
  Future<ScreenTimeSettings> build(String childId) async {
    final api = ref.watch(engagementApiProvider);
    return api.fetchScreenTimeSettings(childId);
  }

  /// Updates screen time settings.
  Future<void> updateSettings(ScreenTimeSettings settings) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(engagementApiProvider);
      return api.updateScreenTimeSettings(childId, settings);
    });
  }

  /// Toggles screen time limits on/off.
  Future<void> toggleEnabled(bool enabled) async {
    final current = state.valueOrNull;
    if (current == null) return;

    final updated = current.copyWith(isEnabled: enabled);
    await updateSettings(updated);
  }

  /// Updates daily limit.
  Future<void> updateDailyLimit(int minutes) async {
    final current = state.valueOrNull;
    if (current == null) return;

    final updated = current.copyWith(dailyLimitMinutes: minutes);
    await updateSettings(updated);
  }

  /// Updates session limit.
  Future<void> updateSessionLimit(int minutes) async {
    final current = state.valueOrNull;
    if (current == null) return;

    final updated = current.copyWith(sessionLimitMinutes: minutes);
    await updateSettings(updated);
  }

  /// Toggles break enforcement.
  Future<void> toggleBreakEnforcement(bool enforce) async {
    final current = state.valueOrNull;
    if (current == null) return;

    final updated = current.copyWith(enforceBreaks: enforce);
    await updateSettings(updated);
  }

  /// Adds a new schedule.
  Future<void> addSchedule(ScreenTimeSchedule schedule) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(engagementApiProvider);
      return api.addSchedule(childId, schedule);
    });
  }

  /// Updates an existing schedule.
  Future<void> updateSchedule(ScreenTimeSchedule schedule) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(engagementApiProvider);
      return api.updateSchedule(childId, schedule);
    });
  }

  /// Deletes a schedule.
  Future<void> deleteSchedule(String scheduleId) async {
    final api = ref.read(engagementApiProvider);
    await api.deleteSchedule(childId, scheduleId);
    ref.invalidateSelf();
  }
}

/// Provider for current screen time status.
@riverpod
Future<ScreenTimeStatus> screenTimeStatus(Ref ref, String childId) async {
  final api = ref.watch(engagementApiProvider);
  return api.fetchScreenTimeStatus(childId);
}

/// Notifier for granting screen time extensions.
@riverpod
class ScreenTimeExtensionNotifier extends _$ScreenTimeExtensionNotifier {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  /// Grants a screen time extension.
  Future<void> grantExtension(
    String childId, {
    required int minutes,
    String? reason,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(engagementApiProvider);
      await api.grantExtension(childId, additionalMinutes: minutes, reason: reason);
      ref.invalidate(screenTimeStatusProvider(childId));
    });
  }
}

// ============================================================
// Milestone Providers
// ============================================================

/// Provider for engagement milestones.
@riverpod
Future<List<EngagementMilestone>> engagementMilestones(Ref ref, String childId) async {
  final api = ref.watch(engagementApiProvider);
  return api.fetchMilestones(childId);
}

/// Provider for achieved milestones only.
@riverpod
Future<List<EngagementMilestone>> achievedMilestones(Ref ref, String childId) async {
  final milestones = await ref.watch(engagementMilestonesProvider(childId).future);
  return milestones.where((m) => m.isAchieved).toList();
}

/// Provider for in-progress milestones.
@riverpod
Future<List<EngagementMilestone>> inProgressMilestones(Ref ref, String childId) async {
  final milestones = await ref.watch(engagementMilestonesProvider(childId).future);
  return milestones.where((m) => !m.isAchieved).toList();
}

// ============================================================
// Weekly Report Provider
// ============================================================

/// Provider for weekly engagement report.
@riverpod
Future<WeeklyEngagementReport> weeklyReport(Ref ref, String childId) async {
  final api = ref.watch(engagementApiProvider);
  return api.fetchWeeklyReport(childId);
}

// ============================================================
// Selected Date Provider for Calendar
// ============================================================

/// Provider for the selected date in the calendar.
final selectedCalendarDateProvider = StateProvider<DateTime>((ref) => DateTime.now());

/// Provider for the selected month in the calendar.
final selectedCalendarMonthProvider = StateProvider<DateTime>((ref) {
  final now = DateTime.now();
  return DateTime(now.year, now.month, 1);
});
