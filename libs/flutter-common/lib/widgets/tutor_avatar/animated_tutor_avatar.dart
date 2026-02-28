/// Animated Tutor Avatar Widget
///
/// Shared widget that renders a Rive-powered tutor avatar with support for
/// emotion expressions, animation state transitions, and lip-sync via
/// `mouthOpenAmount`. Used identically by both mobile-learner and mobile-parent
/// apps to ensure a consistent character experience across the platform.
///
/// Supports two Rive state machine formats:
/// - **`TutorController`** (Sprint 4+): Trigger-based inputs (`trigTalk`,
///   `trigCelebrate`, etc.) with a `mouthOpen` number input for lip-sync.
/// - **`TutorStateMachine`** (legacy): Numeric `animationState` and `emotion`
///   inputs. Used as automatic fallback if `TutorController` is not found.
///
/// When the `.riv` file is missing or fails to load, the widget renders a rich
/// fallback: a colored-circle avatar with the persona initial, animated speaking
/// dots, and state-based emoji overlays.
///
/// ## Usage
///
/// ```dart
/// AnimatedTutorAvatar(
///   personaAssetKey: 'nova-math',
///   state: TutorAvatarState.talking,
///   mouthOpenAmount: 0.7,      // lip-sync from audio analysis
///   emotion: 'happy',
///   reducedMotion: false,
/// )
/// ```
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:rive/rive.dart' hide LinearGradient;

import 'tutor_avatar_state.dart';
import 'tutor_persona_asset.dart';

// =============================================================================
// PERSONA FALLBACK COLORS
// =============================================================================

/// Color palettes used for the fallback avatar when Rive files are unavailable.
class _PersonaColors {
  const _PersonaColors(this.primary, this.accent, this.initial);
  final Color primary;
  final Color accent;
  final String initial;

  static const Map<String, _PersonaColors> map = {
    'nova-math': _PersonaColors(Color(0xFF6366F1), Color(0xFFA855F7), 'N'),
    'sage-ela': _PersonaColors(Color(0xFF10B981), Color(0xFF14B8A6), 'S'),
    'spark-science': _PersonaColors(Color(0xFFF59E0B), Color(0xFFF97316), 'S'),
    'chrono-history': _PersonaColors(Color(0xFF8B5CF6), Color(0xFFF43F5E), 'C'),
    'pixel-coding': _PersonaColors(Color(0xFF06B6D4), Color(0xFF3B82F6), 'P'),
  };

  static _PersonaColors forSlug(String slug) =>
      map[slug] ?? const _PersonaColors(Color(0xFF6366F1), Color(0xFFA855F7), '?');
}

// =============================================================================
// ANIMATED TUTOR AVATAR
// =============================================================================

/// Renders a Rive-animated tutor avatar driven by persona, emotion, and
/// animation state. Includes lip-sync via [mouthOpenAmount] and accessibility
/// support via [reducedMotion] and [Semantics].
class AnimatedTutorAvatar extends StatefulWidget {
  const AnimatedTutorAvatar({
    super.key,
    required this.personaAssetKey,
    this.emotion = 'neutral',
    this.isAnimating = true,
    this.state = TutorAvatarState.idle,
    this.mouthOpenAmount = 0.0,
    this.reducedMotion = false,
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

  /// Mouth open amount for lip-sync (0.0 = closed, 1.0 = fully open).
  /// Updated at up to 60fps during TTS playback.
  final double mouthOpenAmount;

  /// When `true`, skips Rive animations and shows a static fallback image.
  /// Respects the system accessibility preference for reduced motion.
  final bool reducedMotion;

  /// Width and height of the avatar widget.
  final double size;

  /// How the Rive artboard is inscribed into the available space.
  final BoxFit fit;

  /// Optional widget shown while the Rive file is loading.
  final Widget? placeholder;

  /// Called when a one-shot animation state completes.
  final ValueChanged<TutorAvatarState>? onStateComplete;

  @override
  State<AnimatedTutorAvatar> createState() => _AnimatedTutorAvatarState();
}

class _AnimatedTutorAvatarState extends State<AnimatedTutorAvatar>
    with SingleTickerProviderStateMixin {
  // ---------------------------------------------------------------------------
  // Rive runtime state
  // ---------------------------------------------------------------------------

  Artboard? _artboard;
  StateMachineController? _stateMachineController;

  // -- Legacy numeric inputs (TutorStateMachine) --
  SMINumber? _animationStateInput;
  SMINumber? _emotionInput;
  SMIBool? _isAnimatingInput;

  // -- New trigger inputs (TutorController) --
  SMITrigger? _trigTalk;
  SMITrigger? _trigStopTalk;
  SMITrigger? _trigCelebrate;
  SMITrigger? _trigEncourage;
  SMITrigger? _trigThink;
  SMITrigger? _trigWave;
  SMINumber? _mouthOpenInput;
  SMIBool? _isListeningInput;

  /// Whether the loaded Rive file uses the new TutorController state machine.
  bool _usesTriggerApi = false;

  TutorAvatarState _currentState = TutorAvatarState.idle;
  TutorAvatarEmotion _currentEmotion = TutorAvatarEmotion.neutral;
  bool _isLoaded = false;
  bool _hasError = false;

  /// Animation controller for the fallback speaking indicator.
  late final AnimationController _fallbackAnimController;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  @override
  void initState() {
    super.initState();
    _fallbackAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..repeat(reverse: true);
    if (!widget.reducedMotion) {
      _loadRiveFile();
    }
  }

  @override
  void didUpdateWidget(covariant AnimatedTutorAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);

    // reducedMotion toggled on — dispose Rive, show static fallback.
    if (widget.reducedMotion && !oldWidget.reducedMotion) {
      _disposeRiveController();
      return;
    }
    // reducedMotion toggled off — load Rive.
    if (!widget.reducedMotion && oldWidget.reducedMotion) {
      _loadRiveFile();
      return;
    }

    // Persona changed — reload the entire Rive file.
    if (widget.personaAssetKey != oldWidget.personaAssetKey) {
      _disposeRiveController();
      if (!widget.reducedMotion) _loadRiveFile();
      return;
    }

    if (widget.state != oldWidget.state) {
      _applyAnimationState(widget.state);
    }
    if (widget.emotion != oldWidget.emotion) {
      _applyEmotion(widget.emotion);
    }
    if (widget.isAnimating != oldWidget.isAnimating) {
      _applyIsAnimating(widget.isAnimating);
    }
    if (widget.mouthOpenAmount != oldWidget.mouthOpenAmount) {
      _applyMouthOpen(widget.mouthOpenAmount);
    }
  }

  @override
  void dispose() {
    _fallbackAnimController.dispose();
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

      // Try the new TutorController first, fall back to legacy TutorStateMachine.
      var controller = StateMachineController.fromArtboard(
        artboard,
        _kTutorControllerName,
      );
      if (controller != null) {
        _usesTriggerApi = true;
      } else {
        controller = StateMachineController.fromArtboard(
          artboard,
          _kLegacyStateMachineName,
        );
        _usesTriggerApi = false;
      }

      if (controller == null) {
        debugPrint(
          'AnimatedTutorAvatar: no supported state machine found '
          'in artboard for persona "${widget.personaAssetKey}".',
        );
        setState(() => _hasError = true);
        return;
      }

      artboard.addController(controller);
      _stateMachineController = controller;
      _artboard = artboard;

      if (_usesTriggerApi) {
        _trigTalk = controller.getTriggerInput(TutorTriggerNames.trigTalk);
        _trigStopTalk = controller.getTriggerInput(TutorTriggerNames.trigStopTalk);
        _trigCelebrate = controller.getTriggerInput(TutorTriggerNames.trigCelebrate);
        _trigEncourage = controller.getTriggerInput(TutorTriggerNames.trigEncourage);
        _trigThink = controller.getTriggerInput(TutorTriggerNames.trigThink);
        _trigWave = controller.getTriggerInput(TutorTriggerNames.trigWave);
        _mouthOpenInput = controller.getNumberInput(TutorTriggerNames.mouthOpen);
        _isListeningInput = controller.getBoolInput(TutorTriggerNames.isListening);
      } else {
        _animationStateInput = controller.getNumberInput(_kAnimationStateInput);
        _emotionInput = controller.getNumberInput(_kEmotionInput);
        _isAnimatingInput = controller.getBoolInput(_kIsAnimatingInput);
      }

      // Apply initial values.
      _applyAnimationState(widget.state);
      _applyEmotion(widget.emotion);
      _applyIsAnimating(widget.isAnimating);
      _applyMouthOpen(widget.mouthOpenAmount);

      setState(() => _isLoaded = true);
    } catch (e, st) {
      debugPrint(
        'AnimatedTutorAvatar: failed to load Rive file for persona '
        '"${widget.personaAssetKey}": $e\n$st',
      );
      if (mounted) setState(() => _hasError = true);
    }
  }

  void _disposeRiveController() {
    _stateMachineController?.dispose();
    _stateMachineController = null;
    _animationStateInput = null;
    _emotionInput = null;
    _isAnimatingInput = null;
    _trigTalk = null;
    _trigStopTalk = null;
    _trigCelebrate = null;
    _trigEncourage = null;
    _trigThink = null;
    _trigWave = null;
    _mouthOpenInput = null;
    _isListeningInput = null;
    _artboard = null;
    _isLoaded = false;
  }

  // ---------------------------------------------------------------------------
  // State machine manipulation
  // ---------------------------------------------------------------------------

  void _applyAnimationState(TutorAvatarState target) {
    if (_currentState == target) return;
    if (!_currentState.canTransitionTo(target)) {
      debugPrint(
        'AnimatedTutorAvatar: blocked transition $_currentState -> $target',
      );
      return;
    }

    if (_usesTriggerApi) {
      _applyTriggerState(target);
    } else if (_animationStateInput != null) {
      _animationStateInput!.value = target.stateMachineValue.toDouble();
    }

    _currentState = target;

    if (!target.isLooping) {
      _scheduleReturnToIdle(target);
    }
  }

  void _applyTriggerState(TutorAvatarState target) {
    // If leaving talking, fire trigStopTalk.
    if (_currentState == TutorAvatarState.talking &&
        target != TutorAvatarState.talking) {
      _trigStopTalk?.fire();
    }

    // If leaving listening, set isListening false.
    if (_currentState == TutorAvatarState.listening &&
        target != TutorAvatarState.listening) {
      _isListeningInput?.value = false;
    }

    switch (target) {
      case TutorAvatarState.idle:
        // Idle is reached by stopping other states.
        break;
      case TutorAvatarState.talking:
        _trigTalk?.fire();
      case TutorAvatarState.thinking:
        _trigThink?.fire();
      case TutorAvatarState.celebrating:
        _trigCelebrate?.fire();
      case TutorAvatarState.encouraging:
        _trigEncourage?.fire();
      case TutorAvatarState.waving:
        _trigWave?.fire();
      case TutorAvatarState.listening:
        _isListeningInput?.value = true;
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

  void _applyMouthOpen(double amount) {
    _mouthOpenInput?.value = amount.clamp(0.0, 1.0);
  }

  void _scheduleReturnToIdle(TutorAvatarState completedState) {
    Future<void>.delayed(completedState.duration, () {
      if (!mounted) return;
      if (_currentState == completedState) {
        if (_usesTriggerApi) {
          // One-shot states auto-return in the TutorController state machine,
          // but we still update our tracking.
        } else {
          _animationStateInput?.value =
              TutorAvatarState.idle.stateMachineValue.toDouble();
        }
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
    final effectiveReducedMotion =
        widget.reducedMotion || MediaQuery.of(context).disableAnimations;

    return Semantics(
      label: _semanticsLabel,
      image: true,
      child: SizedBox(
        width: widget.size,
        height: widget.size,
        child: effectiveReducedMotion
            ? _buildFallback(context)
            : _buildContent(context),
      ),
    );
  }

  String get _semanticsLabel {
    final persona = widget.personaAssetKey.replaceAll('-', ' ');
    final stateLabel = widget.state.name;
    return 'AI tutor $persona, $stateLabel';
  }

  Widget _buildContent(BuildContext context) {
    if (_hasError) return _buildFallback(context);
    if (!_isLoaded || _artboard == null) {
      return widget.placeholder ?? _buildFallback(context);
    }
    return Rive(artboard: _artboard!, fit: widget.fit, antialiasing: true);
  }

  // ---------------------------------------------------------------------------
  // Rich fallback (used when Rive is unavailable or reducedMotion is true)
  // ---------------------------------------------------------------------------

  Widget _buildFallback(BuildContext context) {
    final colors = _PersonaColors.forSlug(widget.personaAssetKey);

    return Stack(
      alignment: Alignment.center,
      children: [
        // Gradient circle
        Container(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [colors.primary, colors.accent],
            ),
          ),
          child: Center(
            child: Text(
              colors.initial,
              style: TextStyle(
                fontSize: widget.size * 0.38,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
        ),

        // Talking indicator — three pulsing dots
        if (widget.state == TutorAvatarState.talking)
          Positioned(
            bottom: widget.size * 0.08,
            child: _TalkingDots(
              controller: _fallbackAnimController,
              mouthOpenAmount: widget.mouthOpenAmount,
              dotSize: widget.size * 0.06,
            ),
          ),

        // State-based emoji overlay badge
        if (_emojiForState(widget.state) != null)
          Positioned(
            bottom: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
              ),
              child: Text(
                _emojiForState(widget.state)!,
                style: TextStyle(fontSize: widget.size * 0.16),
              ),
            ),
          ),

        // Listening — subtle pulse ring
        if (widget.state == TutorAvatarState.listening)
          AnimatedBuilder(
            animation: _fallbackAnimController,
            builder: (context, child) {
              final scale = 1.0 + _fallbackAnimController.value * 0.08;
              return Transform.scale(
                scale: scale,
                child: Container(
                  width: widget.size,
                  height: widget.size,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: colors.primary.withValues(alpha: 0.3),
                      width: 2,
                    ),
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  static String? _emojiForState(TutorAvatarState state) {
    return switch (state) {
      TutorAvatarState.thinking => '\u{1F914}', // 🤔
      TutorAvatarState.celebrating => '\u{1F389}', // 🎉
      TutorAvatarState.encouraging => '\u{1F44D}', // 👍
      TutorAvatarState.waving => '\u{1F44B}', // 👋
      _ => null,
    };
  }
}

// =============================================================================
// TALKING DOTS (fallback lip-sync indicator)
// =============================================================================

class _TalkingDots extends StatelessWidget {
  const _TalkingDots({
    required this.controller,
    required this.mouthOpenAmount,
    required this.dotSize,
  });

  final AnimationController controller;
  final double mouthOpenAmount;
  final double dotSize;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        // Scale the dot amplitude by mouthOpenAmount for lip-sync fidelity.
        final base = controller.value;
        final amp = mouthOpenAmount.clamp(0.2, 1.0);
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            final phase = (base + i * 0.33) % 1.0;
            final scale = 0.6 + math.sin(phase * math.pi) * 0.4 * amp;
            return Padding(
              padding: EdgeInsets.symmetric(horizontal: dotSize * 0.3),
              child: Transform.scale(
                scale: scale,
                child: Container(
                  width: dotSize,
                  height: dotSize,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

// =============================================================================
// RIVE STATE MACHINE CONSTANTS
// =============================================================================

/// New trigger-based state machine (Sprint 4+).
const String _kTutorControllerName = 'TutorController';

/// Legacy numeric-input state machine.
const String _kLegacyStateMachineName = 'TutorStateMachine';

/// Legacy state machine input names.
const String _kAnimationStateInput = 'animationState';
const String _kEmotionInput = 'emotion';
const String _kIsAnimatingInput = 'isAnimating';
