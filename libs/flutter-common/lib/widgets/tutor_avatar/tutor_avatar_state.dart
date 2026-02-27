/// Tutor Avatar Animation States
///
/// Defines the set of animation states for the tutor avatar, along with
/// transition logic and timing constants. Used by [AnimatedTutorAvatar] to
/// drive Rive state-machine inputs.
///
/// Each state maps to a named animation within the Rive artboard's state
/// machine, ensuring consistent behavior across mobile-learner and
/// mobile-parent apps.
library;

// =============================================================================
// AVATAR ANIMATION STATE
// =============================================================================

/// Discrete animation states the tutor avatar can occupy.
///
/// These correspond 1-to-1 with states in the Rive state machine embedded in
/// each persona `.riv` file. The state machine input name matches
/// [TutorAvatarState.stateMachineValue].
enum TutorAvatarState {
  /// Resting state -- subtle breathing / blinking loop.
  idle,

  /// Mouth movement synced with TTS or chat output.
  talking,

  /// Upward-looking "processing" animation while the AI generates a response.
  thinking,

  /// Confetti / sparkle celebration after a correct answer or milestone.
  celebrating,

  /// Thumbs up, warm smile, nodding -- used to offer encouragement.
  encouraging,

  /// Friendly wave used for greetings and session starts.
  waving,

  /// Attentive posture shown while the learner is working on a problem.
  listening,
}

// =============================================================================
// AVATAR EMOTION
// =============================================================================

/// Emotional expressions layered on top of the current animation state.
///
/// Emotions modulate the avatar's facial features (eyes, mouth, eyebrows)
/// independently of the body animation controlled by [TutorAvatarState].
enum TutorAvatarEmotion {
  /// Calm, resting expression.
  neutral,

  /// Smiling -- used after correct answers or positive interactions.
  happy,

  /// Furrowed brow, eyes slightly up -- shown during AI processing.
  thinking,

  /// Warm smile with a slight nod -- used when offering hints or support.
  encouraging,

  /// Wide eyes and big smile -- used for milestones and streaks.
  excited,

  /// Soft, understanding expression -- used when the learner struggles.
  empathetic,
}

// =============================================================================
// DURATION CONSTANTS
// =============================================================================

/// Timing constants for each animation state.
///
/// These define the minimum duration a state is held before the avatar may
/// transition back to [TutorAvatarState.idle], giving each animation enough
/// time to play its full cycle at least once.
abstract final class TutorAvatarDurations {
  /// Duration of one full idle breathing / blink cycle.
  static const Duration idle = Duration(milliseconds: 3000);

  /// Minimum time the talking animation plays; actual duration is driven by
  /// the length of the TTS utterance.
  static const Duration talking = Duration(milliseconds: 500);

  /// Full thinking loop duration before the response arrives.
  static const Duration thinking = Duration(milliseconds: 3000);

  /// Celebration animation from start to confetti settle.
  static const Duration celebrating = Duration(milliseconds: 2000);

  /// Encouraging thumbs up / nodding gesture.
  static const Duration encouraging = Duration(milliseconds: 2000);

  /// Single wave gesture from raise to lower.
  static const Duration waving = Duration(milliseconds: 2000);

  /// Minimum listening hold before the avatar can transition out.
  static const Duration listening = Duration(milliseconds: 1000);

  /// Cross-fade duration when blending between two emotion expressions.
  static const Duration emotionTransition = Duration(milliseconds: 300);

  /// Cross-fade duration when switching between animation states.
  static const Duration stateTransition = Duration(milliseconds: 250);

  /// Returns the canonical duration for the given [state].
  static Duration forState(TutorAvatarState state) {
    return switch (state) {
      TutorAvatarState.idle => idle,
      TutorAvatarState.talking => talking,
      TutorAvatarState.thinking => thinking,
      TutorAvatarState.celebrating => celebrating,
      TutorAvatarState.encouraging => encouraging,
      TutorAvatarState.waving => waving,
      TutorAvatarState.listening => listening,
    };
  }
}

// =============================================================================
// TRIGGER NAMES (for TutorController state machine)
// =============================================================================

/// Mapping from [TutorAvatarState] to the trigger input name on the
/// `TutorController` state machine. States without a trigger (idle) are
/// reached by releasing other states or auto-return.
abstract final class TutorTriggerNames {
  static const String trigTalk = 'trigTalk';
  static const String trigStopTalk = 'trigStopTalk';
  static const String trigCelebrate = 'trigCelebrate';
  static const String trigEncourage = 'trigEncourage';
  static const String trigThink = 'trigThink';
  static const String trigWave = 'trigWave';
  static const String blinkTrigger = 'blinkTrigger';
  static const String mouthOpen = 'mouthOpen';
  static const String isListening = 'isListening';

  /// Returns the trigger name that enters the given [state], or `null` if the
  /// state is reached by other means (e.g. idle is reached via auto-return).
  static String? triggerForState(TutorAvatarState state) {
    return switch (state) {
      TutorAvatarState.idle => null,
      TutorAvatarState.talking => trigTalk,
      TutorAvatarState.thinking => trigThink,
      TutorAvatarState.celebrating => trigCelebrate,
      TutorAvatarState.encouraging => trigEncourage,
      TutorAvatarState.waving => trigWave,
      TutorAvatarState.listening => null, // driven by isListening bool
    };
  }
}

// =============================================================================
// STATE EXTENSION
// =============================================================================

/// Convenience helpers on [TutorAvatarState].
extension TutorAvatarStateX on TutorAvatarState {
  /// The integer value written to the Rive state-machine input named
  /// `"animationState"`. Ordinal index is used so the Rive file can use a
  /// simple number input.
  int get stateMachineValue => index;

  /// Canonical duration for this animation state.
  Duration get duration => TutorAvatarDurations.forState(this);

  /// Whether this state should loop until explicitly cancelled.
  ///
  /// Looping states (idle, talking, listening) repeat indefinitely; one-shot
  /// states (celebrating, encouraging, waving) play once then fall back to idle.
  bool get isLooping => switch (this) {
        TutorAvatarState.idle => true,
        TutorAvatarState.talking => true,
        TutorAvatarState.listening => true,
        TutorAvatarState.thinking => true,
        TutorAvatarState.celebrating => false,
        TutorAvatarState.encouraging => false,
        TutorAvatarState.waving => false,
      };

  /// Returns the set of states that are valid direct transitions from this
  /// state.
  ///
  /// All states can transition to [TutorAvatarState.idle]. One-shot states
  /// automatically fall back to idle after completing.
  Set<TutorAvatarState> get allowedTransitions => switch (this) {
        TutorAvatarState.idle => TutorAvatarState.values.toSet(),
        TutorAvatarState.talking => {
            TutorAvatarState.idle,
            TutorAvatarState.thinking,
            TutorAvatarState.celebrating,
            TutorAvatarState.encouraging,
            TutorAvatarState.listening,
          },
        TutorAvatarState.thinking => {
            TutorAvatarState.idle,
            TutorAvatarState.talking,
            TutorAvatarState.celebrating,
          },
        TutorAvatarState.celebrating => {
            TutorAvatarState.idle,
            TutorAvatarState.talking,
          },
        TutorAvatarState.encouraging => {
            TutorAvatarState.idle,
            TutorAvatarState.talking,
          },
        TutorAvatarState.waving => {
            TutorAvatarState.idle,
            TutorAvatarState.talking,
            TutorAvatarState.listening,
          },
        TutorAvatarState.listening => {
            TutorAvatarState.idle,
            TutorAvatarState.talking,
            TutorAvatarState.thinking,
            TutorAvatarState.celebrating,
            TutorAvatarState.encouraging,
          },
      };

  /// Whether transitioning from this state to [target] is allowed.
  bool canTransitionTo(TutorAvatarState target) =>
      allowedTransitions.contains(target);
}

// =============================================================================
// EMOTION EXTENSION
// =============================================================================

/// Convenience helpers on [TutorAvatarEmotion].
extension TutorAvatarEmotionX on TutorAvatarEmotion {
  /// The integer value written to the Rive state-machine input named
  /// `"emotion"`.
  int get stateMachineValue => index;

  /// Parses an emotion string (e.g. from the backend) into the enum.
  ///
  /// Returns [TutorAvatarEmotion.neutral] for unrecognised values.
  static TutorAvatarEmotion fromString(String value) {
    return switch (value.toLowerCase().trim()) {
      'neutral' => TutorAvatarEmotion.neutral,
      'happy' => TutorAvatarEmotion.happy,
      'thinking' => TutorAvatarEmotion.thinking,
      'encouraging' => TutorAvatarEmotion.encouraging,
      'excited' => TutorAvatarEmotion.excited,
      'empathetic' => TutorAvatarEmotion.empathetic,
      _ => TutorAvatarEmotion.neutral,
    };
  }
}
