/// Animated Tutor Avatar Widget
///
/// Displays a Rive animation for the tutor character. The avatar responds
/// to emotion state changes and lip-syncs to TTS audio via viseme data.
/// Falls back to a static placeholder when the .riv asset is not available.
library;

import 'package:flutter/material.dart';
import '../models/tutor_models.dart';

/// Widget that displays an animated tutor avatar using Rive.
///
/// The avatar loads a .riv file from assets based on [personaAssetKey]
/// and uses state machine inputs to control emotion expressions and
/// lip-sync visemes.
///
/// Example:
/// ```dart
/// AnimatedTutorAvatar(
///   personaAssetKey: 'math_tutor',
///   emotion: EmotionType.happy,
///   visemeId: '6',
///   size: 140,
/// )
/// ```
class AnimatedTutorAvatar extends StatefulWidget {
  /// The asset key used to locate the .riv file in assets/rive/.
  final String personaAssetKey;

  /// The current emotion to display on the avatar.
  final EmotionType emotion;

  /// The current viseme ID for lip-sync. Null when not speaking.
  final String? visemeId;

  /// Mouth open amount (0.0–1.0) for lip-sync animation.
  /// Driven by [TutorAudioNotifier] at ~60fps.
  final double mouthOpenAmount;

  /// Size of the avatar widget (width and height).
  final double size;

  const AnimatedTutorAvatar({
    super.key,
    required this.personaAssetKey,
    this.emotion = EmotionType.neutral,
    this.visemeId,
    this.mouthOpenAmount = 0.0,
    this.size = 120,
  });

  @override
  State<AnimatedTutorAvatar> createState() => _AnimatedTutorAvatarState();
}

class _AnimatedTutorAvatarState extends State<AnimatedTutorAvatar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  // Rive artboard and controller references would be stored here when
  // the rive package is integrated:
  // Artboard? _artboard;
  // StateMachineController? _stateMachineController;
  // SMIInput<double>? _emotionInput;
  // SMIInput<double>? _visemeInput;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _pulseController.repeat(reverse: true);
    _loadRiveFile();
  }

  Future<void> _loadRiveFile() async {
    // Attempt to load the Rive file from assets.
    // When the rive package is integrated, this will use:
    //
    // try {
    //   final data = await rootBundle.load(
    //     'assets/rive/${widget.personaAssetKey}.riv',
    //   );
    //   final file = RiveFile.import(data);
    //   final artboard = file.mainArtboard;
    //   final controller = StateMachineController.fromArtboard(
    //     artboard, 'Main',
    //   );
    //   if (controller != null) {
    //     artboard.addController(controller);
    //     _emotionInput = controller.findInput<double>('emotion');
    //     _visemeInput = controller.findInput<double>('viseme');
    //   }
    //   setState(() => _artboard = artboard);
    // } catch (e) {
    //   // Fall through to placeholder rendering.
    //   debugPrint('Failed to load Rive asset: $e');
    // }
  }

  @override
  void didUpdateWidget(AnimatedTutorAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Update emotion state machine input when emotion changes.
    if (oldWidget.emotion != widget.emotion) {
      _updateEmotion(widget.emotion);
    }

    // Update viseme state machine input for lip-sync.
    if (oldWidget.visemeId != widget.visemeId) {
      _updateViseme(widget.visemeId);
    }

    // Reload asset if persona changed.
    if (oldWidget.personaAssetKey != widget.personaAssetKey) {
      _loadRiveFile();
    }
  }

  void _updateEmotion(EmotionType emotion) {
    // When Rive is integrated:
    // _emotionInput?.value = emotion.index.toDouble();
  }

  void _updateViseme(String? visemeId) {
    // When Rive is integrated:
    // _visemeInput?.value = double.tryParse(visemeId ?? '0') ?? 0;
  }

  @override
  void dispose() {
    _pulseController.dispose();
    // _stateMachineController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // When Rive artboard is loaded, display the Rive widget:
    // if (_artboard != null) {
    //   return SizedBox(
    //     width: widget.size,
    //     height: widget.size,
    //     child: Rive(artboard: _artboard!),
    //   );
    // }

    // Placeholder avatar while .riv assets are not yet available.
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        return Transform.scale(
          scale: _pulseAnimation.value,
          child: child,
        );
      },
      child: _buildPlaceholderAvatar(context),
    );
  }

  Widget _buildPlaceholderAvatar(BuildContext context) {
    final theme = Theme.of(context);
    final isSpeaking = widget.mouthOpenAmount > 0.01 ||
        (widget.visemeId != null && widget.visemeId != '0');

    return Semantics(
      label: 'Tutor avatar showing ${widget.emotion.label} expression',
      child: Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              theme.colorScheme.primary.withOpacity(0.8),
              theme.colorScheme.secondary.withOpacity(0.6),
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: theme.colorScheme.primary.withOpacity(0.3),
              blurRadius: 20,
              spreadRadius: 4,
            ),
          ],
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Main face icon
            Icon(
              _emotionIcon,
              size: widget.size * 0.5,
              color: Colors.white,
            ),

            // Speaking indicator driven by mouthOpenAmount
            if (isSpeaking)
              Positioned(
                bottom: widget.size * 0.18,
                child: _MouthOpenIndicator(
                  size: widget.size * 0.15,
                  mouthOpenAmount: widget.mouthOpenAmount,
                ),
              ),
          ],
        ),
      ),
    );
  }

  IconData get _emotionIcon {
    switch (widget.emotion) {
      case EmotionType.neutral:
        return Icons.face_rounded;
      case EmotionType.happy:
        return Icons.sentiment_very_satisfied_rounded;
      case EmotionType.thinking:
        return Icons.psychology_rounded;
      case EmotionType.encouraging:
        return Icons.sentiment_satisfied_rounded;
      case EmotionType.excited:
        return Icons.sentiment_very_satisfied_rounded;
      case EmotionType.empathetic:
        return Icons.favorite_rounded;
    }
  }
}

/// Mouth-open indicator that directly reflects [mouthOpenAmount].
///
/// The height of the "mouth" shape scales linearly with [mouthOpenAmount],
/// providing real-time lip-sync feedback in the placeholder avatar.
class _MouthOpenIndicator extends StatelessWidget {
  final double size;
  final double mouthOpenAmount;

  const _MouthOpenIndicator({
    required this.size,
    required this.mouthOpenAmount,
  });

  @override
  Widget build(BuildContext context) {
    // Scale height from 20% to 100% of size based on mouth openness
    final openness = mouthOpenAmount.clamp(0.0, 1.0);
    final height = size * (0.2 + openness * 0.8);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 16),
      width: size,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.9),
        borderRadius: BorderRadius.circular(size * 0.3),
      ),
    );
  }
}
