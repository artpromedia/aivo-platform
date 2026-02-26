/// Tutor Providers
///
/// State management for tutor marketplace and session history.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../api/tutor_api.dart';
import '../models/tutor_models.dart';

part 'tutor_provider.g.dart';

// ============================================================
// Marketplace Providers
// ============================================================

/// Provider for the list of available tutor add-ons.
@riverpod
Future<List<TutorAddon>> tutorAddons(Ref ref) async {
  final api = ref.watch(tutorApiProvider);
  return api.fetchAddons();
}

/// Notifier for purchasing a tutor add-on.
@riverpod
class TutorPurchaseNotifier extends _$TutorPurchaseNotifier {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  /// Initiates a purchase for the given [addonId].
  ///
  /// On success the marketplace add-on list is invalidated so the UI
  /// reflects the newly-active add-on.
  Future<bool> purchase(String addonId) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(tutorApiProvider);
      await api.purchaseAddon(addonId);
      ref.invalidate(tutorAddonsProvider);
    });
    return !state.hasError;
  }
}

// ============================================================
// Session Providers
// ============================================================

/// Provider for a child's tutor session history.
@riverpod
Future<List<TutorSession>> tutorSessions(
  Ref ref,
  String childId,
) async {
  final api = ref.watch(tutorApiProvider);
  return api.fetchSessions(childId);
}

/// Provider for a single session's detailed report.
@riverpod
Future<TutorSessionReport> tutorSessionReport(
  Ref ref,
  String childId,
  String sessionId,
) async {
  final api = ref.watch(tutorApiProvider);
  return api.fetchSessionReport(childId, sessionId);
}
