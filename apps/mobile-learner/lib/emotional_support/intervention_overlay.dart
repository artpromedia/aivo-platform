/// ND-2.3: Intervention Overlay
///
/// Full-screen overlay that presents interventions to the learner
/// in a calming, non-overwhelming way.

import 'package:flutter/material.dart';

import 'calming_intervention_widget.dart';
import 'emotional_state_provider.dart';

/// Full-screen overlay for presenting interventions.
class InterventionOverlay extends StatefulWidget {
  final SuggestedIntervention intervention;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final VoidCallback onComplete;

  const InterventionOverlay({
    super.key,
    required this.intervention,
    required this.onAccept,
    required this.onDecline,
    required this.onComplete,
  });

  @override
  State<InterventionOverlay> createState() => _InterventionOverlayState();

  /// Show the intervention overlay as a modal.
  static Future<void> show({
    required BuildContext context,
    required SuggestedIntervention intervention,
    required VoidCallback onAccept,
    required VoidCallback onDecline,
    required VoidCallback onComplete,
  }) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black87,
      transitionDuration: const Duration(milliseconds: 500),
      pageBuilder: (context, animation, secondaryAnimation) {
        return InterventionOverlay(
          intervention: intervention,
          onAccept: onAccept,
          onDecline: onDecline,
          onComplete: onComplete,
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.95, end: 1.0).animate(
              CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
            ),
            child: child,
          ),
        );
      },
    );
  }
}

class _InterventionOverlayState extends State<InterventionOverlay>
    with TickerProviderStateMixin {
  bool _accepted = false;
  bool _completed = false;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 400),
          child: _accepted ? _buildInterventionContent() : _buildOfferContent(),
        ),
      ),
    );
  }

  Widget _buildOfferContent() {
    final intervention = widget.intervention;
    final urgencyColor = _getUrgencyColor(intervention.urgency);

    return Container(
      key: const ValueKey('offer'),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Calming header
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: urgencyColor.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              _getInterventionIcon(intervention.interventionType),
              size: 40,
              color: urgencyColor,
            ),
          ),
          const SizedBox(height: 24),

          // Title
          Text(
            _getOfferTitle(intervention.urgency),
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),

          // Description
          Text(
            intervention.reason,
            style: TextStyle(
              fontSize: 18,
              color: Colors.white.withOpacity(0.9),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),

          // Intervention card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              children: [
                Text(
                  intervention.name,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.timer_outlined, size: 18, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text(
                      '${intervention.durationSeconds} seconds',
                      style: const TextStyle(
                        fontSize: 16,
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 40),

          // Accept button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                widget.onAccept();
                setState(() => _accepted = true);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: urgencyColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Let\'s try it!',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Decline button (less prominent for high urgency)
          TextButton(
            onPressed: () {
              widget.onDecline();
              Navigator.of(context).pop();
            },
            child: Text(
              intervention.urgency == 'immediate'
                  ? 'I want to keep going'
                  : 'Not right now',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withOpacity(0.7),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInterventionContent() {
    if (_completed) {
      return _buildCompletionContent();
    }

    return Container(
      key: const ValueKey('intervention'),
      child: CalmingInterventionWidget(
        intervention: widget.intervention,
        onComplete: () {
          setState(() => _completed = true);
        },
        onSkip: () {
          widget.onComplete();
          Navigator.of(context).pop();
        },
      ),
    );
  }

  Widget _buildCompletionContent() {
    return Container(
      key: const ValueKey('completion'),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Success animation
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0.0, end: 1.0),
            duration: const Duration(milliseconds: 800),
            builder: (context, value, child) {
              return Transform.scale(
                scale: 0.5 + (value * 0.5),
                child: Opacity(
                  opacity: value,
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: const BoxDecoration(
                      color: Color(0xFF4CAF50),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      size: 60,
                      color: Colors.white,
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 32),

          const Text(
            'Great job!',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),

          Text(
            _getCompletionMessage(),
            style: TextStyle(
              fontSize: 18,
              color: Colors.white.withOpacity(0.9),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 48),

          // Continue button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                widget.onComplete();
                Navigator.of(context).pop();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4CAF50),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Continue Learning',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getUrgencyColor(String urgency) {
    switch (urgency) {
      case 'immediate':
        return const Color(0xFFE53935);
      case 'high':
        return const Color(0xFFFF9800);
      case 'medium':
        return const Color(0xFF2196F3);
      case 'low':
      default:
        return const Color(0xFF4CAF50);
    }
  }

  IconData _getInterventionIcon(String type) {
    switch (type) {
      case 'BREATHING':
        return Icons.air_rounded;
      case 'GROUNDING':
        return Icons.self_improvement_rounded;
      case 'MOVEMENT':
        return Icons.directions_run_rounded;
      case 'SENSORY':
        return Icons.touch_app_rounded;
      case 'ENCOURAGEMENT':
        return Icons.star_rounded;
      case 'SIMPLIFICATION':
        return Icons.tune_rounded;
      case 'BREAK':
        return Icons.pause_circle_outline_rounded;
      case 'CHOICE':
        return Icons.alt_route_rounded;
      case 'VISUAL_SUPPORT':
        return Icons.image_rounded;
      case 'REWARD':
        return Icons.emoji_events_rounded;
      default:
        return Icons.favorite_rounded;
    }
  }

  String _getOfferTitle(String urgency) {
    switch (urgency) {
      case 'immediate':
        return 'Let\'s Take a Moment';
      case 'high':
        return 'Time for a Quick Break?';
      case 'medium':
        return 'Would You Like a Break?';
      case 'low':
      default:
        return 'You\'re Doing Great!';
    }
  }

  String _getCompletionMessage() {
    final messages = [
      'You took great care of yourself.',
      'That was a wonderful break.',
      'You\'re ready to continue!',
      'Taking breaks shows wisdom.',
      'Your brain thanks you!',
    ];
    return messages[DateTime.now().second % messages.length];
  }
}
