/// Caregiver Providers
///
/// Riverpod providers for caregiver state management.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../api/caregiver_api.dart';
import '../models/caregiver_models.dart';

part 'caregiver_provider.g.dart';

/// Fetches the caregiver summary (active + pending) for a student.
@riverpod
Future<StudentCaregiverSummary> studentCaregivers(
    Ref ref, String studentId) async {
  final api = ref.watch(caregiverApiProvider);
  return api.getCaregivers(studentId);
}

/// Fetches caregiver slot limit information for a student.
@riverpod
Future<CaregiverLimitInfo> caregiverLimit(Ref ref, String studentId) async {
  final api = ref.watch(caregiverApiProvider);
  return api.getLimit(studentId);
}

/// Notifier for creating caregiver invitations.
@riverpod
class InviteCaregiverNotifier extends _$InviteCaregiverNotifier {
  @override
  AsyncValue<CaregiverInviteResponse?> build() => const AsyncData(null);

  /// Send a caregiver invitation. Returns `true` on success.
  Future<bool> invite(CreateCaregiverInviteRequest request) async {
    state = const AsyncLoading();
    try {
      final api = ref.read(caregiverApiProvider);
      final response = await api.createInvite(request);
      state = AsyncData(response);
      // Refresh the caregiver list for this student
      ref.invalidate(studentCaregiversProvider(request.studentId));
      return true;
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
      return false;
    }
  }
}

/// Notifier for revoking caregiver access.
@riverpod
class RevokeCaregiverNotifier extends _$RevokeCaregiverNotifier {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  /// Revoke a caregiver's access to a student. Returns `true` on success.
  Future<bool> revoke(
    String caregiverId,
    String studentId, {
    String? reason,
  }) async {
    state = const AsyncLoading();
    try {
      final api = ref.read(caregiverApiProvider);
      await api.revokeAccess(caregiverId, studentId, reason: reason);
      state = const AsyncData(null);
      ref.invalidate(studentCaregiversProvider(studentId));
      return true;
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
      return false;
    }
  }
}

/// Notifier for updating caregiver permissions.
@riverpod
class UpdatePermissionsNotifier extends _$UpdatePermissionsNotifier {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  /// Update a caregiver's permissions. Returns `true` on success.
  Future<bool> update(UpdateCaregiverPermissionsRequest request) async {
    state = const AsyncLoading();
    try {
      final api = ref.read(caregiverApiProvider);
      await api.updatePermissions(request);
      state = const AsyncData(null);
      ref.invalidate(studentCaregiversProvider(request.studentId));
      return true;
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
      return false;
    }
  }
}

/// Notifier for resending caregiver invitations.
@riverpod
class ResendInviteNotifier extends _$ResendInviteNotifier {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  /// Resend a caregiver invitation. Returns `true` on success.
  Future<bool> resend(String inviteId, String studentId) async {
    state = const AsyncLoading();
    try {
      final api = ref.read(caregiverApiProvider);
      await api.resendInvite(inviteId);
      state = const AsyncData(null);
      ref.invalidate(studentCaregiversProvider(studentId));
      return true;
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
      return false;
    }
  }
}

/// Notifier for cancelling caregiver invitations.
@riverpod
class CancelInviteNotifier extends _$CancelInviteNotifier {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  /// Cancel a pending caregiver invitation. Returns `true` on success.
  Future<bool> cancel(String inviteId, String studentId) async {
    state = const AsyncLoading();
    try {
      final api = ref.read(caregiverApiProvider);
      await api.cancelInvite(inviteId);
      state = const AsyncData(null);
      ref.invalidate(studentCaregiversProvider(studentId));
      return true;
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
      return false;
    }
  }
}
