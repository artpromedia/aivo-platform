/// Animated Tutor Avatar Widget
///
/// Shared widget that renders a Rive-powered tutor avatar with support for
/// emotion expressions and animation state transitions. Used identically by
/// both the mobile-learner and mobile-parent apps to ensure a consistent
/// character experience across the platform.
///
/// The widget loads a `.riv` asset resolved via [TutorPersonaAsset], creates a
/// Rive artboard, and drives its state machine through two numeric inputs:
///
/// - `"animationState"` -- see [TutorAvatarState]
/// - `"emotion"` -- see [TutorAvatarEmotion]
///
/// ## Usage
///
/// ```dart
/// AnimatedTutorAvatar(
///   personaAssetKey: 'nova-math',
///   emotion: 'happy',
///   isAnimating: true,
/// )
/// ```
library;

import 'package:flutter/material.dart';
import 'package:rive/rive.dart';

import 'tutor_avatar_state.dart';
import 'tutor_persona_asset.dart';

// =============================================================================
// ANIMATED TUTOR AVATAR
// =============================================================================

/// Renders a Rive-animated tutor avatar driven by persona, emotion, and
/// animation state.
///
/// Parameters:
/// - [personaAssetKey] -- persona slug used to resolve the `.riv` file via
///   [TutorPersonaAsset.assetPathFor].
/// - [emotion] -- current emotional expression as a string (parsed via
///   [TutorAvatarEmotionX.fromString]).
/// - [isAnimating] -- when `false` the avatar freezes on the current frame;
///   useful when the widget is off-screen or the app is backgrounded.
/// - [state] -- the body animation state (defaults to [TutorAvatarState.idle]).
/// - [size] -- the widget's width and height (defaults to 120).
/// - [onStateComplete] -- optional callback fired when a one-shot animation
///   finishes (e.g. celebrating, waving).
class AnimatedTutorAvatar extends StatefulWidget {
  const AnimatedTutorAvatar({
    super.key,
    required this.personaAssetKey,
    this.emotion = 'neutral',
    this.isAnimating = true,
    this.state = TutorAvatarState.idle,
    this.size = 120.0,
    this.onStateComplete,
    this.fit = BoxFit.contain,
    this.placeholder,
  });

  /// Persona slug (e.g. `'nova-math'`, `'sage-ela'`).
  final String personaAssetKey;

  /// Emotion name as a raw string. Parsed into [TutorAvatarEmotion] internally.
  final String emotion;

  /// Whether the Rive animation is actively playing.
  final bool isAnimating;

  /// The body animation state to display.
  final TutorAvatarState state;

  /// Width and height of the avatar widget.
  final double size;

  /// How the Rive artboard is inscribed into the available space.
  final BoxFit fit;

  /// Optional widget shown while the Rive file is loading.
  final Widget? placeholder;

  /// Called when a one-shot animation state completes. Receives the state that
  /// just finished.
  final ValueChanged<TutorAvatarState>? onStateComplete;

  @override
  State<AnimatedTutorAvatar> createState() => _AnimatedTutorAvatarState();
}

class _AnimatedTutorAvatarState extends State<AnimatedTutorAvatar> {
  // ---------------------------------------------------------------------------
  // Rive runtime state
  // ---------------------------------------------------------------------------

  /// The Rive artboard for the current persona.
  Artboard? _artboard;

  /// The state machine controller driving animation and emotion inputs.
  StateMachineController? _stateMachineController;

  /// Numeric input that selects the body animation state.
  SMINumber? _animationStateInput;

  /// Numeric input that selects the facial emotion expression.
  SMINumber? _emotionInput;

  /// Boolean input that pauses / resumes the animation.
  SMIBool? _isAnimatingInput;

  /// Tracks the currently applied [TutorAvatarState] to avoid redundant
  /// state-machine writes.
  TutorAvatarState _currentState = TutorAvatarState.idle;

  /// Tracks the currently applied [TutorAvatarEmotion].
  TutorAvatarEmotion _currentEmotion = TutorAvatarEmotion.neutral;

  /// Whether the Rive file has been loaded and the artboard is ready.
  bool _isLoaded = false;

  /// Whether an error occurred during Rive file loading.
  bool _hasError = false;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  @override
  void initState() {
    super.initState();
    _loadRiveFile();
  }

  @override
  void didUpdateWidget(covariant AnimatedTutorAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Persona changed -- reload the entire Rive file.
    if (widget.personaAssetKey != oldWidget.personaAssetKey) {
      _disposeRiveController();
      _loadRiveFile();
      return;
    }

    // Update animation state if changed.
    if (widget.state != oldWidget.state) {
      _applyAnimationState(widget.state);
    }

    // Update emotion if changed.
    if (widget.emotion != oldWidget.emotion) {
      _applyEmotion(widget.emotion);
    }

    // Update isAnimating flag.
    if (widget.isAnimating != oldWidget.isAnimating) {
      _applyIsAnimating(widget.isAnimating);
    }
  }

  @override
  void dispose() {
    _disposeRiveController();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Rive loading
  // ---------------------------------------------------------------------------

  Future<void> _loadRiveFile() async {
    setState(() {
      _isLoaded = false;
      _hasError = false;
    });

    try {
      final assetPath =
          TutorPersonaAsset.assetPathOrDefault(widget.personaAssetKey);

      final data = await RiveFile.asset(assetPath);
      if (!mounted) return;

      final artboard = data.mainArtboard.instance();
      final controller = StateMachineController.fromArtboard(
        artboard,
        _kStateMachineName,
      );

      if (controller == null) {
        // Artboard exists but the expected state machine was not found.
        debugPrint(
          'AnimatedTutorAvatar: state machine "$_kStateMachineName" not found '
          'in artboard for persona "${widget.personaAssetKey}".',
        );
        setState(() => _hasError = true);
        return;
      }

      artboard.addController(controller);

      // Resolve inputs.
      _animationStateInput = controller.getNumberInput(_kAnimationStateInput);
      _emotionInput = controller.getNumberInput(_kEmotionInput);
      _isAnimatingInput = controller.getBoolInput(_kIsAnimatingInput);

      _stateMachineController = controller;
      _artboard = artboard;

      // Apply initial values.
      _applyAnimationState(widget.state);
      _applyEmotion(widget.emotion);
      _applyIsAnimating(widget.isAnimating);

      setState(() => _isLoaded = true);
    } catch (e, st) {
      debugPrint(
        'AnimatedTutorAvatar: failed to load Rive file for persona '
        '"${widget.personaAssetKey}": $e\n$st',
      );
      if (mounted) {
        setState(() => _hasError = true);
      }
    }
  }

  void _disposeRiveController() {
    _stateMachineController?.dispose();
    _stateMachineController = null;
    _animationStateInput = null;
    _emotionInput = null;
    _isAnimatingInput = null;
    _artboard = null;
    _isLoaded = false;
  }

  // ---------------------------------------------------------------------------
  // State machine manipulation
  // ---------------------------------------------------------------------------

  void _applyAnimationState(TutorAvatarState target) {
    if (_animationStateInput == null) return;
    if (_currentState == target) return;

    // Enforce transition rules.
    if (!_currentState.canTransitionTo(target)) {
      debugPrint(
        'AnimatedTutorAvatar: blocked transition from $_currentState to '
        '$target -- not an allowed transition.',
      );
      return;
    }

    _animationStateInput!.value = target.stateMachineValue.toDouble();
    _currentState = target;

    // Schedule auto-return to idle for one-shot states.
    if (!target.isLooping) {
      _scheduleReturnToIdle(target);
    }
  }

  void _applyEmotion(String emotionName) {
    if (_emotionInput == null) return;

    final emotion = TutorAvatarEmotionX.fromString(emotionName);
    if (_currentEmotion == emotion) return;

    _emotionInput!.value = emotion.stateMachineValue.toDouble();
    _currentEmotion = emotion;
  }

  void _applyIsAnimating(bool isAnimating) {
    _isAnimatingInput?.value = isAnimating;
  }

  /// After a one-shot animation completes, return to idle and notify the
  /// caller via [AnimatedTutorAvatar.onStateComplete].
  void _scheduleReturnToIdle(TutorAvatarState completedState) {
    Future<void>.delayed(completedState.duration, () {
      if (!mounted) return;
      // Only transition if we are still in the same one-shot state (another
      // call may have changed it already).
      if (_currentState == completedState) {
        _animationStateInput?.value =
            TutorAvatarState.idle.stateMachineValue.toDouble();
        _currentState = TutorAvatarState.idle;
        widget.onStateComplete?.call(completedState);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: _buildContent(context),
    );
  }

  Widget _buildContent(BuildContext context) {
    if (_hasError) {
      return _buildFallback(context);
    }

    if (!_isLoaded || _artboard == null) {
      return widget.placeholder ?? _buildLoadingPlaceholder(context);
    }

    return Rive(
      artboard: _artboard!,
      fit: widget.fit,
      antialiasing: true,
    );
  }

  /// Shown while the Rive file is loading.
  Widget _buildLoadingPlaceholder(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: SizedBox(
        width: widget.size * 0.3,
        height: widget.size * 0.3,
        child: CircularProgressIndicator(
          strokeWidth: 2.0,
          color: theme.colorScheme.primary.withValues(alpha: 0.5),
        ),
      ),
    );
  }

  /// Fallback shown when the Rive file cannot be loaded.
  Widget _buildFallback(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: theme.colorScheme.surfaceContainerHighest,
      ),
      child: Center(
        child: Icon(
          Icons.smart_toy_outlined,
          size: widget.size * 0.45,
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

// =============================================================================
// RIVE STATE MACHINE CONSTANTS
// =============================================================================

/// Name of the state machine within each persona `.riv` artboard.
const String _kStateMachineName = 'TutorStateMachine';

/// State machine input name for the body animation state.
const String _kAnimationStateInput = 'animationState';

/// State machine input name for the facial emotion expression.
const String _kEmotionInput = 'emotion';

/// State machine input name for the play / pause toggle.
const String _kIsAnimatingInput = 'isAnimating';
