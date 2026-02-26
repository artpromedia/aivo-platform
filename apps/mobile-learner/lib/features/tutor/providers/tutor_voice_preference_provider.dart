/// Tutor Voice Preference Provider
///
/// Riverpod provider for persisting the user's voice-enabled preference
/// using SharedPreferences. Controls whether TTS audio is requested
/// from the backend during tutor sessions.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _storageKey = 'aivo_tutor_voice_enabled';

/// State for the voice preference.
class TutorVoicePreferenceState {
  final bool voiceEnabled;
  final bool isLoaded;

  const TutorVoicePreferenceState({
    this.voiceEnabled = true,
    this.isLoaded = false,
  });

  TutorVoicePreferenceState copyWith({
    bool? voiceEnabled,
    bool? isLoaded,
  }) {
    return TutorVoicePreferenceState(
      voiceEnabled: voiceEnabled ?? this.voiceEnabled,
      isLoaded: isLoaded ?? this.isLoaded,
    );
  }
}

/// Notifier that manages the voice-enabled preference.
class TutorVoicePreferenceNotifier
    extends StateNotifier<TutorVoicePreferenceState> {
  TutorVoicePreferenceNotifier()
      : super(const TutorVoicePreferenceState()) {
    _load();
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getBool(_storageKey);
      state = TutorVoicePreferenceState(
        voiceEnabled: stored ?? true,
        isLoaded: true,
      );
    } catch (_) {
      state = state.copyWith(isLoaded: true);
    }
  }

  /// Toggle voice on/off.
  Future<void> toggle() async {
    final next = !state.voiceEnabled;
    state = state.copyWith(voiceEnabled: next);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_storageKey, next);
    } catch (_) {
      // Ignore storage errors
    }
  }

  /// Explicitly set the voice preference.
  Future<void> setVoiceEnabled(bool enabled) async {
    state = state.copyWith(voiceEnabled: enabled);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_storageKey, enabled);
    } catch (_) {
      // Ignore storage errors
    }
  }
}

/// Provider for the tutor voice preference.
///
/// Usage:
/// ```dart
/// final voicePref = ref.watch(tutorVoicePreferenceProvider);
/// if (voicePref.voiceEnabled) {
///   // Request TTS audio from backend
/// }
/// ```
final tutorVoicePreferenceProvider = StateNotifierProvider<
    TutorVoicePreferenceNotifier, TutorVoicePreferenceState>((ref) {
  return TutorVoicePreferenceNotifier();
});
