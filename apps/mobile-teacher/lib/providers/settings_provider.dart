/// Teacher Settings Provider
///
/// Manages user preferences for the settings screen.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart' hide apiClientProvider;

import 'core_providers.dart';

/// State for teacher settings preferences.
@immutable
class TeacherSettingsState {
  const TeacherSettingsState({
    this.isLoading = false,
    this.isSaving = false,
    this.error,
    this.pushNotificationsEnabled = true,
    this.studentAlertsEnabled = true,
    this.darkModeEnabled = false,
  });

  final bool isLoading;
  final bool isSaving;
  final String? error;
  final bool pushNotificationsEnabled;
  final bool studentAlertsEnabled;
  final bool darkModeEnabled;

  TeacherSettingsState copyWith({
    bool? isLoading,
    bool? isSaving,
    String? error,
    bool clearError = false,
    bool? pushNotificationsEnabled,
    bool? studentAlertsEnabled,
    bool? darkModeEnabled,
  }) {
    return TeacherSettingsState(
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: clearError ? null : (error ?? this.error),
      pushNotificationsEnabled: pushNotificationsEnabled ?? this.pushNotificationsEnabled,
      studentAlertsEnabled: studentAlertsEnabled ?? this.studentAlertsEnabled,
      darkModeEnabled: darkModeEnabled ?? this.darkModeEnabled,
    );
  }
}

/// Notifier for teacher settings preferences.
class TeacherSettingsNotifier extends StateNotifier<TeacherSettingsState> {
  TeacherSettingsNotifier(this._api) : super(const TeacherSettingsState()) {
    _loadPreferences();
  }

  final AivoApiClient _api;

  /// Load preferences from backend.
  Future<void> _loadPreferences() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final response = await _api.get('/users/me/preferences');
      final data = response.data as Map<String, dynamic>;

      state = state.copyWith(
        isLoading: false,
        pushNotificationsEnabled: data['pushNotifications'] as bool? ?? true,
        studentAlertsEnabled: data['studentAlertNotifications'] as bool? ?? true,
        darkModeEnabled: data['theme'] == 'dark',
      );
    } catch (e) {
      // Fall back to defaults if API fails - don't show error for initial load
      debugPrint('[TeacherSettings] Failed to load preferences: $e');
      state = state.copyWith(isLoading: false);
    }
  }

  /// Reload preferences from backend.
  Future<void> reload() async {
    await _loadPreferences();
  }

  /// Set push notifications enabled.
  Future<void> setPushNotificationsEnabled(bool value) async {
    if (state.pushNotificationsEnabled == value) return;

    state = state.copyWith(pushNotificationsEnabled: value);
    await _savePreferences();
  }

  /// Set student alerts enabled.
  Future<void> setStudentAlertsEnabled(bool value) async {
    if (state.studentAlertsEnabled == value) return;

    state = state.copyWith(studentAlertsEnabled: value);
    await _savePreferences();
  }

  /// Set dark mode enabled.
  Future<void> setDarkModeEnabled(bool value) async {
    if (state.darkModeEnabled == value) return;

    state = state.copyWith(darkModeEnabled: value);
    await _savePreferences();
  }

  /// Save preferences to backend.
  Future<void> _savePreferences() async {
    state = state.copyWith(isSaving: true, clearError: true);

    try {
      await _api.put('/users/me/preferences', data: {
        'pushNotifications': state.pushNotificationsEnabled,
        'studentAlertNotifications': state.studentAlertsEnabled,
        'theme': state.darkModeEnabled ? 'dark' : 'light',
      });
      state = state.copyWith(isSaving: false);
    } catch (e) {
      debugPrint('[TeacherSettings] Failed to save preferences: $e');
      state = state.copyWith(
        isSaving: false,
        error: 'Failed to save preferences. Please try again.',
      );
    }
  }

  /// Clear any error state.
  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

/// Provider for teacher settings preferences.
final teacherSettingsProvider =
    StateNotifierProvider<TeacherSettingsNotifier, TeacherSettingsState>(
  (ref) => TeacherSettingsNotifier(ref.watch(apiClientProvider)),
);
