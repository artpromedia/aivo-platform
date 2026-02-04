/// Settings Sync Service
///
/// Handles synchronization of settings across devices when the user logs in
/// or when settings are updated on another device.
library;

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'accessibility_settings_api.dart';
import '../screens/accessibility_settings_screen.dart';

// ══════════════════════════════════════════════════════════════════════════════
// SYNC STATUS
// ══════════════════════════════════════════════════════════════════════════════

enum SyncStatus {
  idle,
  syncing,
  success,
  error,
}

class SettingsSyncState {
  const SettingsSyncState({
    this.status = SyncStatus.idle,
    this.lastSyncTime,
    this.error,
  });

  final SyncStatus status;
  final DateTime? lastSyncTime;
  final String? error;

  SettingsSyncState copyWith({
    SyncStatus? status,
    DateTime? lastSyncTime,
    String? error,
  }) {
    return SettingsSyncState(
      status: status ?? this.status,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
      error: error,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/// Provider for settings sync state
final settingsSyncProvider = StateNotifierProvider<SettingsSyncNotifier, SettingsSyncState>(
  (ref) => SettingsSyncNotifier(ref),
);

/// Settings sync notifier for managing cross-device synchronization
class SettingsSyncNotifier extends StateNotifier<SettingsSyncState> {
  SettingsSyncNotifier(this._ref) : super(const SettingsSyncState());

  final Ref _ref;

  /// Sync settings from server on login
  /// Called when user logs in to ensure they have the latest settings
  Future<void> syncOnLogin() async {
    final learnerId = _ref.read(currentLearnerIdProvider);
    if (learnerId == null) {
      return;
    }

    state = state.copyWith(status: SyncStatus.syncing);

    try {
      // Fetch latest settings from server
      final api = _ref.read(accessibilitySettingsApiProvider);
      final serverSettings = await api.getSettings(learnerId);

      // Update local accessibility settings state
      final notifier = _ref.read(accessibilitySettingsProvider.notifier);
      notifier
        ..setTextScaleFactor(serverSettings.textScaleFactor)
        ..setHighContrast(serverSettings.highContrast)
        ..setReduceMotion(serverSettings.reduceMotion)
        ..setReduceTransparency(serverSettings.reduceTransparency)
        ..setBoldText(serverSettings.boldText)
        ..setScreenReaderOptimized(serverSettings.screenReaderOptimized)
        ..setHapticFeedbackEnabled(serverSettings.hapticFeedbackEnabled)
        ..setSoundEffectsEnabled(serverSettings.soundEffectsEnabled)
        ..setSoundVolume(serverSettings.soundVolume)
        ..setReadAloudEnabled(serverSettings.readAloudEnabled)
        ..setReadAloudSpeed(serverSettings.readAloudSpeed)
        // Note: ColorBlindMode is synced via the API type mapping
        ..markSaved();

      state = state.copyWith(
        status: SyncStatus.success,
        lastSyncTime: DateTime.now(),
        error: null,
      );
    } catch (e) {
      state = state.copyWith(
        status: SyncStatus.error,
        error: 'Failed to sync settings: $e',
      );
    }
  }

  /// Push local settings to server after changes
  /// Called after settings are modified locally
  Future<void> pushToServer() async {
    final learnerId = _ref.read(currentLearnerIdProvider);
    if (learnerId == null) return;

    state = state.copyWith(status: SyncStatus.syncing);

    try {
      // Save settings via the accessibility notifier
      final success = await _ref.read(accessibilitySettingsProvider.notifier).saveSettings();

      if (success) {
        state = state.copyWith(
          status: SyncStatus.success,
          lastSyncTime: DateTime.now(),
          error: null,
        );
      } else {
        state = state.copyWith(
          status: SyncStatus.error,
          error: 'Failed to push settings to server',
        );
      }
    } catch (e) {
      state = state.copyWith(
        status: SyncStatus.error,
        error: 'Failed to push settings: $e',
      );
    }
  }

  /// Reset sync state
  void reset() {
    state = const SettingsSyncState();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/// Call this on app login to sync settings
Future<void> syncSettingsOnLogin(WidgetRef ref) async {
  final syncNotifier = ref.read(settingsSyncProvider.notifier);
  await syncNotifier.syncOnLogin();
}

/// Call this after local settings changes to push to server
Future<void> pushSettingsToServer(WidgetRef ref) async {
  final syncNotifier = ref.read(settingsSyncProvider.notifier);
  await syncNotifier.pushToServer();
}
