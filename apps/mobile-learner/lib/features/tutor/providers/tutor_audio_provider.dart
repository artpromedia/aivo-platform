/// Tutor Audio Provider
///
/// Riverpod state management for TTS audio playback and avatar lip-sync.
/// Manages audio lifecycle (play, pause, stop) and provides real-time
/// viseme data to drive the animated tutor avatar's mouth movements.
library;

import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/tutor_models.dart';

// ============================================================================
// STATE
// ============================================================================

/// Playback status of the tutor audio.
enum AudioPlaybackStatus {
  idle,
  loading,
  playing,
  paused,
  stopped,
  error,
}

/// State for the tutor audio provider.
class TutorAudioState {
  final AudioPlaybackStatus status;
  final String? currentMessageId;
  final String? currentAudioUrl;
  final List<VisemeData> visemes;
  final int currentVisemeIndex;
  final String currentVisemeId;
  final Duration position;
  final Duration duration;
  final String? errorMessage;

  const TutorAudioState({
    this.status = AudioPlaybackStatus.idle,
    this.currentMessageId,
    this.currentAudioUrl,
    this.visemes = const [],
    this.currentVisemeIndex = 0,
    this.currentVisemeId = '0',
    this.position = Duration.zero,
    this.duration = Duration.zero,
    this.errorMessage,
  });

  /// Whether audio is currently playing.
  bool get isPlaying => status == AudioPlaybackStatus.playing;

  /// Whether audio is paused.
  bool get isPaused => status == AudioPlaybackStatus.paused;

  /// Whether audio is loading.
  bool get isLoading => status == AudioPlaybackStatus.loading;

  /// Whether the player is idle or stopped.
  bool get isIdle =>
      status == AudioPlaybackStatus.idle ||
      status == AudioPlaybackStatus.stopped;

  /// Whether there is an active audio source loaded.
  bool get hasAudio => currentAudioUrl != null;

  /// Progress of playback as a value between 0.0 and 1.0.
  double get progress =>
      duration.inMilliseconds > 0
          ? position.inMilliseconds / duration.inMilliseconds
          : 0.0;

  TutorAudioState copyWith({
    AudioPlaybackStatus? status,
    String? currentMessageId,
    String? currentAudioUrl,
    List<VisemeData>? visemes,
    int? currentVisemeIndex,
    String? currentVisemeId,
    Duration? position,
    Duration? duration,
    String? errorMessage,
  }) {
    return TutorAudioState(
      status: status ?? this.status,
      currentMessageId: currentMessageId ?? this.currentMessageId,
      currentAudioUrl: currentAudioUrl ?? this.currentAudioUrl,
      visemes: visemes ?? this.visemes,
      currentVisemeIndex: currentVisemeIndex ?? this.currentVisemeIndex,
      currentVisemeId: currentVisemeId ?? this.currentVisemeId,
      position: position ?? this.position,
      duration: duration ?? this.duration,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

// ============================================================================
// NOTIFIER
// ============================================================================

/// Manages TTS audio playback and viseme-based lip-sync for the tutor avatar.
class TutorAudioNotifier extends StateNotifier<TutorAudioState> {
  TutorAudioNotifier() : super(const TutorAudioState()) {
    _initAudioPlayer();
  }

  final AudioPlayer _audioPlayer = AudioPlayer();
  StreamSubscription<Duration>? _positionSubscription;
  StreamSubscription<Duration>? _durationSubscription;
  StreamSubscription<PlayerState>? _stateSubscription;
  Timer? _visemeTimer;

  void _initAudioPlayer() {
    _stateSubscription = _audioPlayer.onPlayerStateChanged.listen((playerState) {
      switch (playerState) {
        case PlayerState.playing:
          state = state.copyWith(status: AudioPlaybackStatus.playing);
          _startVisemeTracking();
        case PlayerState.paused:
          state = state.copyWith(status: AudioPlaybackStatus.paused);
          _stopVisemeTracking();
        case PlayerState.stopped:
          state = state.copyWith(
            status: AudioPlaybackStatus.stopped,
            currentVisemeId: '0',
            currentVisemeIndex: 0,
          );
          _stopVisemeTracking();
        case PlayerState.completed:
          state = state.copyWith(
            status: AudioPlaybackStatus.idle,
            currentMessageId: null,
            currentAudioUrl: null,
            currentVisemeId: '0',
            currentVisemeIndex: 0,
            position: Duration.zero,
          );
          _stopVisemeTracking();
        case PlayerState.disposed:
          break;
      }
    });

    _positionSubscription = _audioPlayer.onPositionChanged.listen((position) {
      state = state.copyWith(position: position);
      _updateViseme(position);
    });

    _durationSubscription = _audioPlayer.onDurationChanged.listen((duration) {
      state = state.copyWith(duration: duration);
    });
  }

  /// Play TTS audio for a tutor message.
  ///
  /// If audio is already playing for a different message, it will be
  /// stopped before the new audio starts.
  Future<void> playMessageAudio(TutorMessage message) async {
    if (!message.hasAudio) return;

    // Stop any currently playing audio.
    if (state.isPlaying || state.isPaused) {
      await _audioPlayer.stop();
    }

    state = TutorAudioState(
      status: AudioPlaybackStatus.loading,
      currentMessageId: message.id,
      currentAudioUrl: message.audioUrl,
      visemes: message.visemes ?? [],
    );

    try {
      await _audioPlayer.play(UrlSource(message.audioUrl!));
    } catch (e) {
      state = state.copyWith(
        status: AudioPlaybackStatus.error,
        errorMessage: 'Failed to play audio: $e',
      );
    }
  }

  /// Pause current audio playback.
  Future<void> pause() async {
    if (state.isPlaying) {
      await _audioPlayer.pause();
    }
  }

  /// Resume paused audio playback.
  Future<void> resume() async {
    if (state.isPaused) {
      await _audioPlayer.resume();
    }
  }

  /// Stop audio playback and reset state.
  Future<void> stop() async {
    await _audioPlayer.stop();
    _stopVisemeTracking();
    state = const TutorAudioState();
  }

  /// Seek to a specific position in the audio.
  Future<void> seek(Duration position) async {
    await _audioPlayer.seek(position);
  }

  /// Update the current viseme based on audio playback position.
  void _updateViseme(Duration position) {
    if (state.visemes.isEmpty) return;

    final positionMs = position.inMilliseconds;
    int visemeIndex = state.currentVisemeIndex;

    // Find the viseme that corresponds to the current audio position.
    // Visemes are ordered by offsetMs, so we scan forward.
    for (int i = 0; i < state.visemes.length; i++) {
      if (state.visemes[i].offsetMs <= positionMs) {
        visemeIndex = i;
      } else {
        break;
      }
    }

    if (visemeIndex != state.currentVisemeIndex) {
      state = state.copyWith(
        currentVisemeIndex: visemeIndex,
        currentVisemeId: state.visemes[visemeIndex].visemeId,
      );
    }
  }

  /// Start a timer for more granular viseme tracking between position events.
  void _startVisemeTracking() {
    _stopVisemeTracking();
    if (state.visemes.isEmpty) return;

    _visemeTimer = Timer.periodic(
      const Duration(milliseconds: 50),
      (_) {
        if (state.isPlaying) {
          _updateViseme(state.position);
        }
      },
    );
  }

  /// Stop the viseme tracking timer.
  void _stopVisemeTracking() {
    _visemeTimer?.cancel();
    _visemeTimer = null;
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _durationSubscription?.cancel();
    _stateSubscription?.cancel();
    _stopVisemeTracking();
    _audioPlayer.dispose();
    super.dispose();
  }
}

// ============================================================================
// PROVIDER
// ============================================================================

/// Provider for tutor audio playback and lip-sync state.
final tutorAudioProvider =
    StateNotifierProvider<TutorAudioNotifier, TutorAudioState>((ref) {
  return TutorAudioNotifier();
});
