/// Schedule Provider - ND-1.3
///
/// State management for visual schedules using Riverpod.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'schedule_models.dart';
import 'schedule_service.dart';

// ══════════════════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════════════════

/// State for the schedule feature
class ScheduleState {
  final bool isLoading;
  final String? error;
  final ScheduleWithProgress? currentSchedule;
  final SchedulePreferences? preferences;
  final List<ScheduleSubItem>? activityBreakdown;

  const ScheduleState({
    this.isLoading = false,
    this.error,
    this.currentSchedule,
    this.preferences,
    this.activityBreakdown,
  });

  ScheduleState copyWith({
    bool? isLoading,
    String? error,
    ScheduleWithProgress? currentSchedule,
    SchedulePreferences? preferences,
    List<ScheduleSubItem>? activityBreakdown,
    bool clearError = false,
  }) {
    return ScheduleState(
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      currentSchedule: currentSchedule ?? this.currentSchedule,
      preferences: preferences ?? this.preferences,
      activityBreakdown: activityBreakdown ?? this.activityBreakdown,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFIER
// ══════════════════════════════════════════════════════════════════════════════

/// Notifier for managing schedule state
class ScheduleNotifier extends StateNotifier<ScheduleState> {
  final ScheduleService _service;
  final String _learnerId;
  final String _tenantId;

  ScheduleNotifier({
    required ScheduleService service,
    required String learnerId,
    required String tenantId,
  })  : _service = service,
        _learnerId = learnerId,
        _tenantId = tenantId,
        super(const ScheduleState());

  /// Load today's schedule
  Future<void> loadTodaySchedule({ScheduleType? type}) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final schedule = await _service.getTodaySchedule(
        learnerId: _learnerId,
        tenantId: _tenantId,
        type: type,
      );

      state = state.copyWith(
        isLoading: false,
        currentSchedule: schedule,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Load a specific schedule by ID
  Future<void> loadSchedule(String scheduleId) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final schedule = await _service.getScheduleById(
        scheduleId: scheduleId,
        learnerId: _learnerId,
      );

      state = state.copyWith(
        isLoading: false,
        currentSchedule: schedule,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Load preferences
  Future<void> loadPreferences() async {
    try {
      final preferences = await _service.getPreferences(
        learnerId: _learnerId,
        tenantId: _tenantId,
      );

      state = state.copyWith(preferences: preferences);
    } catch (e) {
      // Preferences are optional, don't show error
    }
  }

  /// Mark current item as complete
  Future<void> markCurrentAsComplete() async {
    final schedule = state.currentSchedule;
    if (schedule == null) return;

    try {
      final updated =
          await _service.markCurrentAsComplete(schedule.schedule.id);
      state = state.copyWith(currentSchedule: updated);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Skip current item
  Future<void> skipCurrentItem() async {
    final schedule = state.currentSchedule;
    if (schedule == null) return;

    try {
      final updated = await _service.skipCurrentItem(schedule.schedule.id);
      state = state.copyWith(currentSchedule: updated);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Update item status
  Future<void> updateItemStatus(
    String itemId,
    ScheduleItemStatus status, {
    int? actualDuration,
  }) async {
    final schedule = state.currentSchedule;
    if (schedule == null) return;

    try {
      final updated = await _service.updateItemStatus(
        scheduleId: schedule.schedule.id,
        itemId: itemId,
        status: status,
        actualDuration: actualDuration,
      );
      state = state.copyWith(currentSchedule: updated);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Update preferences
  Future<void> updatePreferences(Map<String, dynamic> updates) async {
    try {
      final updated = await _service.updatePreferences(
        learnerId: _learnerId,
        updates: updates,
      );
      state = state.copyWith(preferences: updated);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Load activity breakdown for current item
  Future<void> loadActivityBreakdown(String activityType) async {
    try {
      final breakdown = await _service.getActivityBreakdown(activityType);
      state = state.copyWith(activityBreakdown: breakdown);
    } catch (e) {
      // Activity breakdown is optional
    }
  }

  /// Clear error
  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

/// Provider for the schedule service
final scheduleServiceProvider = Provider<ScheduleService>((ref) {
  throw UnimplementedError(
    'scheduleServiceProvider must be overridden in main.dart',
  );
});

/// Provider for learner ID (should be overridden with actual learner ID)
final currentLearnerIdProvider = Provider<String>((ref) {
  throw UnimplementedError(
    'currentLearnerIdProvider must be overridden',
  );
});

/// Provider for tenant ID (should be overridden with actual tenant ID)
final currentTenantIdProvider = Provider<String>((ref) {
  throw UnimplementedError(
    'currentTenantIdProvider must be overridden',
  );
});

/// Provider for the schedule notifier
final scheduleNotifierProvider =
    StateNotifierProvider<ScheduleNotifier, ScheduleState>((ref) {
  final service = ref.watch(scheduleServiceProvider);
  final learnerId = ref.watch(currentLearnerIdProvider);
  final tenantId = ref.watch(currentTenantIdProvider);

  return ScheduleNotifier(
    service: service,
    learnerId: learnerId,
    tenantId: tenantId,
  );
});

/// Convenience provider for current schedule
final currentScheduleProvider = Provider<ScheduleWithProgress?>((ref) {
  return ref.watch(scheduleNotifierProvider).currentSchedule;
});

/// Convenience provider for schedule preferences
final schedulePreferencesProvider = Provider<SchedulePreferences?>((ref) {
  return ref.watch(scheduleNotifierProvider).preferences;
});

/// Convenience provider for loading state
final scheduleLoadingProvider = Provider<bool>((ref) {
  return ref.watch(scheduleNotifierProvider).isLoading;
});

/// Convenience provider for error state
final scheduleErrorProvider = Provider<String?>((ref) {
  return ref.watch(scheduleNotifierProvider).error;
});
