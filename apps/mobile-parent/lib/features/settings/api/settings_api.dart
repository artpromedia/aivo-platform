/// Settings API Client for Mobile Parent App
///
/// Provides type-safe API methods for:
/// - Parent settings (profile, app settings, notifications)
/// - Parental controls (screen time, content filter, subject access, safety)
/// - PIN protection for sensitive operations
/// - Settings synchronization
library;

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../core/api_client.dart';
import 'settings_types.dart';

part 'settings_api.g.dart';

// ============================================================================
// Parent Settings API
// ============================================================================

/// Get parent settings (profile, app settings, notifications)
@riverpod
Future<ParentSettings> parentSettings(Ref ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/parent/settings');
  return ParentSettings.fromJson(response.data as Map<String, dynamic>);
}

/// Update parent profile
@riverpod
Future<ParentProfileSettings> updateParentProfile(
  Ref ref, {
  required Map<String, dynamic> profile,
}) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.patch('/parent/settings/profile', data: profile);
  return ParentProfileSettings.fromJson(response.data as Map<String, dynamic>);
}

/// Update app settings
@riverpod
Future<AppSettings> updateAppSettings(
  Ref ref, {
  required Map<String, dynamic> settings,
}) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.patch('/parent/settings/app', data: settings);
  return AppSettings.fromJson(response.data as Map<String, dynamic>);
}

/// Update notification settings
@riverpod
Future<NotificationSettings> updateNotificationSettings(
  Ref ref, {
  required Map<String, dynamic> settings,
}) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.patch('/parent/settings/notifications', data: settings);
  return NotificationSettings.fromJson(response.data as Map<String, dynamic>);
}

// ============================================================================
// Parental Controls API
// ============================================================================

/// Get parental controls for a specific child
@riverpod
Future<ParentalControlSettings> parentalControls(
  Ref ref, {
  required String childId,
}) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/parent/children/$childId/controls');
  return ParentalControlSettings.fromJson(response.data as Map<String, dynamic>);
}

/// Update screen time settings for a child
@riverpod
Future<ScreenTimeSettings> updateScreenTime(
  Ref ref, {
  required String childId,
  required Map<String, dynamic> settings,
  String? pinToken,
}) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.put(
    '/parent/children/$childId/controls/screenTime',
    data: settings,
    options: pinToken != null
        ? Options(headers: {'X-Pin-Token': pinToken})
        : null,
  );
  return ScreenTimeSettings.fromJson(response.data as Map<String, dynamic>);
}

/// Update content filter settings for a child
@riverpod
Future<ContentFilterSettings> updateContentFilter(
  Ref ref, {
  required String childId,
  required Map<String, dynamic> settings,
  String? pinToken,
}) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.put(
    '/parent/children/$childId/controls/contentFilter',
    data: settings,
    options: pinToken != null
        ? Options(headers: {'X-Pin-Token': pinToken})
        : null,
  );
  return ContentFilterSettings.fromJson(response.data as Map<String, dynamic>);
}

/// Update subject access settings for a child
@riverpod
Future<SubjectAccessSettings> updateSubjectAccess(
  Ref ref, {
  required String childId,
  required Map<String, dynamic> settings,
  String? pinToken,
}) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.put(
    '/parent/children/$childId/controls/subjectAccess',
    data: settings,
    options: pinToken != null
        ? Options(headers: {'X-Pin-Token': pinToken})
        : null,
  );
  return SubjectAccessSettings.fromJson(response.data as Map<String, dynamic>);
}

/// Update safety settings for a child
@riverpod
Future<SafetySettings> updateSafety(
  Ref ref, {
  required String childId,
  required Map<String, dynamic> settings,
  String? pinToken,
}) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.put(
    '/parent/children/$childId/controls/safety',
    data: settings,
    options: pinToken != null
        ? Options(headers: {'X-Pin-Token': pinToken})
        : null,
  );
  return SafetySettings.fromJson(response.data as Map<String, dynamic>);
}

/// Update child notification settings
@riverpod
Future<NotificationSettings> updateChildNotifications(
  Ref ref, {
  required String childId,
  required Map<String, dynamic> settings,
}) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.put(
    '/parent/children/$childId/controls/notifications',
    data: settings,
  );
  return NotificationSettings.fromJson(response.data as Map<String, dynamic>);
}

// ============================================================================
// PIN Protection API
// ============================================================================

/// Check if PIN protection is enabled
@riverpod
Future<PinStatus> pinStatus(Ref ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/parent/settings/pin/status');
  return PinStatus.fromJson(response.data as Map<String, dynamic>);
}

/// Verify PIN and get temporary token
@riverpod
Future<VerifyPinResponse> verifyPin(
  Ref ref, {
  required String pin,
  required String action,
}) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.post('/parent/settings/pin/verify', data: {
    'pin': pin,
    'action': action,
  });
  return VerifyPinResponse.fromJson(response.data as Map<String, dynamic>);
}

/// Set or update PIN
@riverpod
Future<void> setPin(
  Ref ref, {
  required String newPin,
  String? currentPin,
}) async {
  final dio = ref.watch(dioProvider);
  await dio.post('/parent/settings/pin/set', data: {
    'newPin': newPin,
    if (currentPin != null) 'currentPin': currentPin,
  });
}

/// Remove PIN protection
@riverpod
Future<void> removePin(
  Ref ref, {
  required String currentPin,
}) async {
  final dio = ref.watch(dioProvider);
  await dio.post('/parent/settings/pin/remove', data: {
    'currentPin': currentPin,
  });
}

// ============================================================================
// Settings Sync API
// ============================================================================

/// Get settings sync metadata
@riverpod
Future<SettingsSyncMetadata> settingsSyncMetadata(Ref ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/parent/settings/sync/metadata');
  return SettingsSyncMetadata.fromJson(response.data as Map<String, dynamic>);
}

/// Force sync settings from server
@riverpod
Future<ParentSettings> syncFromServer(Ref ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.post('/parent/settings/sync/pull');
  return ParentSettings.fromJson(response.data as Map<String, dynamic>);
}

/// Push local settings to server
@riverpod
Future<ParentSettings> syncToServer(
  Ref ref, {
  required Map<String, dynamic> settings,
}) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.post('/parent/settings/sync/push', data: settings);
  return ParentSettings.fromJson(response.data as Map<String, dynamic>);
}
