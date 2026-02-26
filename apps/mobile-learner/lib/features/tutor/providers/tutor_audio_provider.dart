/// Tutor Audio Provider
///
/// Riverpod state management for TTS audio playback and avatar lip-sync.
/// Manages audio lifecycle (play, pause, stop) and provides real-time
/// mouthOpenAmount values at ~60fps to drive the AnimatedTutorAvatar.
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
///
/// Exposes [mouthOpenAmount] (0.0–1.0) which should be wired directly
/// into [AnimatedTutorAvatar.mouthOpenAmount] for lip-sync.
class TutorAudioState {
  final AudioPlaybackStatus status;
  final String? currentMessageId;
  final String? currentAudioUrl;
  final List<VisemeData> visemes;
  final int currentVisemeIndex;
  final double mouthOpenAmount;
  final Duration position;
  final Duration duration;
  final String? errorMessage;

  const TutorAudioState({
    this.status = AudioPlaybackStatus.idle,
    this.currentMessageId,
    this.currentAudioUrl,
    this.visemes = const [],
    this.currentVisemeIndex = 0,
    this.mouthOpenAmount = 0.0,
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
    double? mouthOpenAmount,
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
      mouthOpenAmount: mouthOpenAmount ?? this.mouthOpenAmount,
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
///
/// Key design:
/// - Audio playback via [AudioPlayer] from the `audioplayers` package
/// - A 16ms (~60fps) periodic timer reads the current audio position and
///   finds the matching viseme, then updates [mouthOpenAmount]
/// - Smooth interpolation between viseme values for natural movement
/// - Automatically transitions avatar state: idle → talking → idle
class TutorAudioNotifier extends StateNotifier<TutorAudioState> {
  TutorAudioNotifier() : super(const TutorAudioState()) {
    _initAudioPlayer();
  }

  final AudioPlayer _audioPlayer = AudioPlayer();
  StreamSubscription<Duration>? _positionSubscription;
  StreamSubscription<Duration>? _durationSubscription;
  StreamSubscription<PlayerState>? _stateSubscription;
  Timer? _lipSyncTimer;

  /// Last known audio position (updated by both the position stream
  /// and our interpolation between stream events).
  Duration _lastKnownPosition = Duration.zero;

  /// Timestamp of the last position event from AudioPlayer.
  DateTime _lastPositionEventTime = DateTime.now();

  void _initAudioPlayer() {
    _stateSubscription =
        _audioPlayer.onPlayerStateChanged.listen((playerState) {
      switch (playerState) {
        case PlayerState.playing:
          state = state.copyWith(status: AudioPlaybackStatus.playing);
          _startLipSyncTimer();
        case PlayerState.paused:
          state = state.copyWith(status: AudioPlaybackStatus.paused);
          _stopLipSyncTimer();
        case PlayerState.stopped:
          state = state.copyWith(
            status: AudioPlaybackStatus.stopped,
            mouthOpenAmount: 0.0,
            currentVisemeIndex: 0,
          );
          _stopLipSyncTimer();
        case PlayerState.completed:
          state = TutorAudioState(
            status: AudioPlaybackStatus.idle,
            // Clear everything — playback is done
          );
          _stopLipSyncTimer();
        case PlayerState.disposed:
          break;
      }
    });

    _positionSubscription = _audioPlayer.onPositionChanged.listen((position) {
      _lastKnownPosition = position;
      _lastPositionEventTime = DateTime.now();
      state = state.copyWith(position: position);
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

    _lastKnownPosition = Duration.zero;
    _lastPositionEventTime = DateTime.now();

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
    _stopLipSyncTimer();
    state = const TutorAudioState();
  }

  /// Seek to a specific position in the audio.
  Future<void> seek(Duration position) async {
    await _audioPlayer.seek(position);
  }

  // --------------------------------------------------------------------------
  // Lip-sync timer (60fps)
  // --------------------------------------------------------------------------

  /// Start the ~60fps timer that drives lip-sync.
  void _startLipSyncTimer() {
    _stopLipSyncTimer();
    if (state.visemes.isEmpty) return;

    _lipSyncTimer = Timer.periodic(
      const Duration(milliseconds: 16), // ~60fps
      (_) => _tickLipSync(),
    );
  }

  /// Stop the lip-sync timer.
  void _stopLipSyncTimer() {
    _lipSyncTimer?.cancel();
    _lipSyncTimer = null;
  }

  /// Called ~60 times per second while audio is playing.
  ///
  /// Interpolates the audio position between AudioPlayer events
  /// (which arrive at ~200ms intervals) and finds the current viseme.
  void _tickLipSync() {
    if (!state.isPlaying || state.visemes.isEmpty) return;

    // Estimate current position by interpolating from last known event
    final elapsed = DateTime.now().difference(_lastPositionEventTime);
    final estimatedMs =
        _lastKnownPosition.inMilliseconds + elapsed.inMilliseconds;

    // Find the active viseme for this position
    final visemes = state.visemes;
    int idx = state.currentVisemeIndex;

    // Scan forward from current index
    while (idx < visemes.length - 1 &&
        visemes[idx + 1].offsetMs <= estimatedMs) {
      idx++;
    }

    // Also handle seeking backward
    if (idx > 0 && visemes[idx].offsetMs > estimatedMs) {
      idx = 0;
      while (idx < visemes.length - 1 &&
          visemes[idx + 1].offsetMs <= estimatedMs) {
        idx++;
      }
    }

    final currentViseme = visemes[idx];
    double targetMouthOpen = currentViseme.mouthOpen;

    // Smooth interpolation: if we're partway through a viseme, lerp
    // towards the next viseme's value for smoother transitions.
    if (idx < visemes.length - 1) {
      final nextViseme = visemes[idx + 1];
      final visemeStart = currentViseme.offsetMs;
      final visemeEnd = nextViseme.offsetMs;
      final span = visemeEnd - visemeStart;

      if (span > 0) {
        final progress =
            ((estimatedMs - visemeStart) / span).clamp(0.0, 1.0);

        // Ease-in-out interpolation for natural mouth movement
        final t = progress < 0.5
            ? 2 * progress * progress
            : 1 - (-2 * progress + 2) * (-2 * progress + 2) / 2;

        targetMouthOpen = currentViseme.mouthOpen +
            (nextViseme.mouthOpen - currentViseme.mouthOpen) * t;
      }
    }

    // Only update state if values actually changed (avoid unnecessary rebuilds)
    if (idx != state.currentVisemeIndex ||
        (targetMouthOpen - state.mouthOpenAmount).abs() > 0.01) {
      state = state.copyWith(
        currentVisemeIndex: idx,
        mouthOpenAmount: targetMouthOpen.clamp(0.0, 1.0),
      );
    }
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _durationSubscription?.cancel();
    _stateSubscription?.cancel();
    _stopLipSyncTimer();
    _audioPlayer.dispose();
    super.dispose();
  }
}

// ============================================================================
// PROVIDER
// ============================================================================

/// Provider for tutor audio playback and lip-sync state.
///
/// Usage in a widget:
/// ```dart
/// final audioState = ref.watch(tutorAudioProvider);
/// AnimatedTutorAvatar(
///   mouthOpenAmount: audioState.mouthOpenAmount,
///   state: audioState.isPlaying
///       ? TutorAvatarState.talking
///       : TutorAvatarState.idle,
///   ...
/// )
/// ```
final tutorAudioProvider =
    StateNotifierProvider<TutorAudioNotifier, TutorAudioState>((ref) {
  return TutorAudioNotifier();
});
