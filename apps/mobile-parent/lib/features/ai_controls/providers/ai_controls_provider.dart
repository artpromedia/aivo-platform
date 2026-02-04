/// AI Controls Providers
///
/// State management for AI autonomy settings.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../api/ai_controls_api.dart';
import '../models/ai_autonomy_settings.dart';

part 'ai_controls_provider.g.dart';

/// Provider for autonomy settings for a child.
@riverpod
Future<AIAutonomySettings> autonomySettings(
  Ref ref,
  String childId,
) async {
  final api = ref.watch(aiControlsApiProvider);
  return api.fetchAutonomySettings(childId);
}

/// Provider for pending approval requests.
@riverpod
Future<List<ApprovalRequest>> pendingApprovals(
  Ref ref,
  String childId,
) async {
  final api = ref.watch(aiControlsApiProvider);
  return api.fetchPendingApprovals(childId);
}

/// Provider for approval request history.
@riverpod
Future<List<ApprovalRequest>> approvalHistory(
  Ref ref,
  String childId,
) async {
  final api = ref.watch(aiControlsApiProvider);
  return api.fetchApprovalHistory(childId);
}

/// Provider for available autonomy presets.
@riverpod
Future<List<AutonomyPreset>> autonomyPresets(Ref ref) async {
  final api = ref.watch(aiControlsApiProvider);
  return api.fetchPresets();
}

/// Provider for AI activity log.
@riverpod
Future<List<AIActivityEntry>> aiActivityLog(
  Ref ref,
  String childId,
) async {
  final api = ref.watch(aiControlsApiProvider);
  return api.fetchActivityLog(childId);
}

/// Notifier for managing autonomy settings.
@riverpod
class AutonomySettingsNotifier extends _$AutonomySettingsNotifier {
  @override
  Future<AIAutonomySettings> build(String childId) async {
    final api = ref.watch(aiControlsApiProvider);
    return api.fetchAutonomySettings(childId);
  }

  /// Update overall autonomy level.
  Future<void> updateOverallLevel(AutonomyLevel level) async {
    final api = ref.read(aiControlsApiProvider);
    final current = await future;

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final updated = current.copyWith(overallLevel: level);
      return api.updateAutonomySettings(childId, updated);
    });
  }

  /// Update category-specific autonomy.
  Future<void> updateCategoryAutonomy(
    DecisionCategory category,
    CategoryAutonomy autonomy,
  ) async {
    final api = ref.read(aiControlsApiProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await api.updateCategoryAutonomy(childId, category, autonomy);
      return api.fetchAutonomySettings(childId);
    });
  }

  /// Apply a preset configuration.
  Future<void> applyPreset(String presetId) async {
    final api = ref.read(aiControlsApiProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      return api.applyPreset(childId, presetId);
    });
  }

  /// Pause AI activity.
  Future<void> pauseAI({DateTime? until, String? reason}) async {
    final api = ref.read(aiControlsApiProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      return api.pauseAI(childId, until: until, reason: reason);
    });
  }

  /// Resume AI activity.
  Future<void> resumeAI() async {
    final api = ref.read(aiControlsApiProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      return api.resumeAI(childId);
    });
  }

  /// Add a new restriction.
  Future<void> addRestriction(AIRestriction restriction) async {
    final api = ref.read(aiControlsApiProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await api.addRestriction(childId, restriction);
      return api.fetchAutonomySettings(childId);
    });
  }

  /// Remove a restriction.
  Future<void> removeRestriction(String restrictionId) async {
    final api = ref.read(aiControlsApiProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await api.deleteRestriction(childId, restrictionId);
      return api.fetchAutonomySettings(childId);
    });
  }

  /// Update notification settings.
  Future<void> updateNotifications(NotificationSettings settings) async {
    final api = ref.read(aiControlsApiProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await api.updateNotificationSettings(childId, settings);
      return api.fetchAutonomySettings(childId);
    });
  }
}

/// Notifier for managing approval requests.
@riverpod
class ApprovalQueueNotifier extends _$ApprovalQueueNotifier {
  @override
  Future<List<ApprovalRequest>> build(String childId) async {
    final api = ref.watch(aiControlsApiProvider);
    return api.fetchPendingApprovals(childId);
  }

  /// Approve a request.
  Future<void> approve(String requestId, {String? comment}) async {
    final api = ref.read(aiControlsApiProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await api.respondToApproval(
        childId,
        requestId,
        approved: true,
        comment: comment,
      );
      return api.fetchPendingApprovals(childId);
    });
  }

  /// Deny a request.
  Future<void> deny(String requestId, {String? comment}) async {
    final api = ref.read(aiControlsApiProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await api.respondToApproval(
        childId,
        requestId,
        approved: false,
        comment: comment,
      );
      return api.fetchPendingApprovals(childId);
    });
  }

  /// Refresh the queue.
  Future<void> refresh() async {
    final api = ref.read(aiControlsApiProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      return api.fetchPendingApprovals(childId);
    });
  }
}

/// Notifier for managing restrictions.
@riverpod
class RestrictionsNotifier extends _$RestrictionsNotifier {
  @override
  Future<List<AIRestriction>> build(String childId) async {
    final settings = await ref.watch(autonomySettingsProvider(childId).future);
    return settings.restrictions;
  }

  /// Add a new restriction.
  Future<void> add(AIRestriction restriction) async {
    final api = ref.read(aiControlsApiProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final added = await api.addRestriction(childId, restriction);
      final current = await ref.read(autonomySettingsProvider(childId).future);
      return [...current.restrictions, added];
    });

    ref.invalidate(autonomySettingsProvider(childId));
  }

  /// Update a restriction.
  Future<void> updateRestriction(String restrictionId, AIRestriction restriction) async {
    final api = ref.read(aiControlsApiProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await api.updateRestriction(childId, restrictionId, restriction);
      final settings = await api.fetchAutonomySettings(childId);
      return settings.restrictions;
    });

    ref.invalidate(autonomySettingsProvider(childId));
  }

  /// Remove a restriction.
  Future<void> remove(String restrictionId) async {
    final api = ref.read(aiControlsApiProvider);

    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await api.deleteRestriction(childId, restrictionId);
      final settings = await api.fetchAutonomySettings(childId);
      return settings.restrictions;
    });

    ref.invalidate(autonomySettingsProvider(childId));
  }

  /// Toggle a restriction's active state.
  Future<void> toggle(String restrictionId, bool isActive) async {
    final current = state.valueOrNull?.firstWhere((r) => r.id == restrictionId);
    if (current == null) return;

    await updateRestriction(restrictionId, current.copyWith(isActive: isActive));
  }
}

/// Provider for pending approval count (for badges).
@riverpod
Future<int> pendingApprovalCount(Ref ref, String childId) async {
  final approvals = await ref.watch(pendingApprovalsProvider(childId).future);
  return approvals.length;
}

/// Provider for checking if AI is currently paused.
@riverpod
Future<bool> isAIPaused(Ref ref, String childId) async {
  final settings = await ref.watch(autonomySettingsProvider(childId).future);
  return settings.pauseAllAI;
}
