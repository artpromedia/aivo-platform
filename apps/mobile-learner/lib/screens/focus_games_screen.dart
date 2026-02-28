import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/focus_games/game_player.dart';
import '../l10n/generated/app_localizations.dart';

/// Focus Games Screen
///
/// Displays focus and regulation activities like breathing exercises,
/// mindfulness, and movement breaks.
class FocusGamesScreen extends ConsumerStatefulWidget {
  final String learnerId;

  const FocusGamesScreen({
    super.key,
    required this.learnerId,
  });

  @override
  ConsumerState<FocusGamesScreen> createState() => _FocusGamesScreenState();
}

class _FocusGamesScreenState extends ConsumerState<FocusGamesScreen> {
  final List<Map<String, dynamic>> _activities = [
    {
      'id': 'breathing-calm',
      'title': 'Calm Breathing',
      'description': 'Slow, deep breaths to help you relax',
      'type': 'breathing',
      'duration': 60,
      'icon': '💨',
      'color': Colors.blue,
      'isRecommended': true,
    },
    {
      'id': 'breathing-focus',
      'title': 'Focus Breath',
      'description': 'Energizing breaths to help you concentrate',
      'type': 'breathing',
      'duration': 90,
      'icon': '🎯',
      'color': Colors.indigo,
      'isRecommended': false,
    },
    {
      'id': 'mindfulness-body',
      'title': 'Body Scan',
      'description': 'Notice how your body feels from head to toe',
      'type': 'mindfulness',
      'duration': 180,
      'icon': '🧘',
      'color': Colors.purple,
      'isRecommended': false,
    },
    {
      'id': 'movement-stretch',
      'title': 'Quick Stretch',
      'description': 'Simple stretches to wake up your body',
      'type': 'movement',
      'duration': 120,
      'icon': '🏃',
      'color': AivoBrand.success,
      'isRecommended': true,
    },
    {
      'id': 'grounding-5senses',
      'title': '5 Senses',
      'description': 'Use your senses to feel calm and present',
      'type': 'grounding',
      'duration': 150,
      'icon': '🌳',
      'color': Colors.amber,
      'isRecommended': false,
    },
    {
      'id': 'mindfulness-sounds',
      'title': 'Sound Journey',
      'description': 'Listen to calming sounds and music',
      'type': 'mindfulness',
      'duration': 120,
      'icon': '🎵',
      'color': Colors.pink,
      'isRecommended': false,
    },
  ];

  String _localizedTitle(Map<String, dynamic> activity) {
    final l10n = AppLocalizations.of(context);
    return switch (activity['id']) {
      'breathing-calm' => l10n.focusActivityCalmBreathing,
      'breathing-focus' => l10n.focusActivityFocusBreath,
      'mindfulness-body' => l10n.focusActivityBodyScan,
      'movement-stretch' => l10n.focusActivityQuickStretch,
      'grounding-5senses' => l10n.focusActivity5Senses,
      'mindfulness-sounds' => l10n.focusActivitySoundJourney,
      _ => activity['title'] as String,
    };
  }

  String _localizedDescription(Map<String, dynamic> activity) {
    final l10n = AppLocalizations.of(context);
    return switch (activity['id']) {
      'breathing-calm' => l10n.focusActivityCalmBreathingDesc,
      'breathing-focus' => l10n.focusActivityFocusBreathDesc,
      'mindfulness-body' => l10n.focusActivityBodyScanDesc,
      'movement-stretch' => l10n.focusActivityQuickStretchDesc,
      'grounding-5senses' => l10n.focusActivity5SensesDesc,
      'mindfulness-sounds' => l10n.focusActivitySoundJourneyDesc,
      _ => activity['description'] as String,
    };
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final recommended = _activities.where((a) => a['isRecommended'] == true).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.focusActivities),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Recommended section
            if (recommended.isNotEmpty) ...[
              Row(
                children: [
                  const Icon(Icons.star, color: Colors.amber, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    l10n.focusRecommendedForYou,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...recommended.map((activity) => _buildActivityCard(activity, isLarge: true)),
              const SizedBox(height: 24),
            ],
            // All activities
            Text(
              l10n.focusAllActivities,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 12),
            // Activity type sections
            _buildActivitySection(l10n.focusCategoryBreathing, 'breathing', Icons.air),
            _buildActivitySection(l10n.focusCategoryMindfulness, 'mindfulness', Icons.self_improvement),
            _buildActivitySection(l10n.focusCategoryMovement, 'movement', Icons.directions_run),
            _buildActivitySection(l10n.focusCategoryGrounding, 'grounding', Icons.nature),
          ],
        ),
      ),
    );
  }

  Widget _buildActivitySection(String title, String type, IconData icon) {
    final activities = _activities.where((a) => a['type'] == type).toList();
    if (activities.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Icon(icon, size: 18, color: AivoBrand.gray[600]),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AivoBrand.gray[600],
                ),
              ),
            ],
          ),
        ),
        ...activities.map((activity) => _buildActivityCard(activity)),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildActivityCard(Map<String, dynamic> activity, {bool isLarge = false}) {
    final color = activity['color'] as Color;
    final duration = activity['duration'] as int;
    final durationText = duration < 60
        ? '${duration}s'
        : '${(duration / 60).floor()}m';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => _startActivity(activity),
          child: Container(
            height: isLarge ? 120 : 80,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  color.withOpacity(0.8),
                  color.withOpacity(0.6),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Stack(
              children: [
                // Content
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      // Icon
                      Text(
                        activity['icon'],
                        style: TextStyle(fontSize: isLarge ? 40 : 30),
                      ),
                      const SizedBox(width: 16),
                      // Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              _localizedTitle(activity),
                              style: TextStyle(
                                fontSize: isLarge ? 18 : 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            if (isLarge) ...[
                              const SizedBox(height: 4),
                              Text(
                                _localizedDescription(activity),
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.white.withOpacity(0.9),
                                ),
                                maxLines: 2,
                              ),
                            ],
                          ],
                        ),
                      ),
                      // Duration badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          durationText,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Recommended badge
                if (activity['isRecommended'] == true)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.auto_awesome,
                            size: 12,
                            color: Colors.amber,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            AppLocalizations.of(context).focusRecommended,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: AivoBrand.gray[800],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _startActivity(Map<String, dynamic> activity) {
    // Create a MiniGame from the activity data
    final miniGame = MiniGame(
      id: activity['id'] as String,
      title: _localizedTitle(activity),
      description: _localizedDescription(activity),
      category: _mapActivityTypeToCategory(activity['type'] as String),
      durationSeconds: activity['duration'] as int,
      instructions: _getInstructionsForType(activity['type'] as String),
      config: _getConfigForType(activity['type'] as String, activity['duration'] as int),
    );

    // Navigate to the focus game player screen
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => FocusGamePlayer(
          game: miniGame,
          onComplete: (completed, score, maxScore) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    completed
                        ? AppLocalizations.of(context).focusActivityCompleted(_localizedTitle(activity))
                        : AppLocalizations.of(context).focusActivityEnded,
                  ),
                ),
              );
              Navigator.of(context).pop();
            }
          },
          onExit: () {
            if (mounted) {
              Navigator.of(context).pop();
            }
          },
        ),
      ),
    );
  }

  GameCategory _mapActivityTypeToCategory(String type) {
    switch (type) {
      case 'breathing':
        return GameCategory.relaxation;
      case 'mindfulness':
        return GameCategory.relaxation;
      case 'movement':
        return GameCategory.physical;
      case 'grounding':
        return GameCategory.cognitive;
      default:
        return GameCategory.relaxation;
    }
  }

  List<String> _getInstructionsForType(String type) {
    final l10n = AppLocalizations.of(context);
    switch (type) {
      case 'breathing':
        return [
          l10n.focusInstructionBreathing1,
          l10n.focusInstructionBreathing2,
          l10n.focusInstructionBreathing3,
          l10n.focusInstructionBreathing4,
        ];
      case 'mindfulness':
        return [
          l10n.focusInstructionMindfulness1,
          l10n.focusInstructionMindfulness2,
          l10n.focusInstructionMindfulness3,
          l10n.focusInstructionMindfulness4,
        ];
      case 'movement':
        return [
          l10n.focusInstructionMovement1,
          l10n.focusInstructionMovement2,
          l10n.focusInstructionMovement3,
          l10n.focusInstructionMovement4,
        ];
      case 'grounding':
        return [
          l10n.focusInstructionGrounding1,
          l10n.focusInstructionGrounding2,
          l10n.focusInstructionGrounding3,
          l10n.focusInstructionGrounding4,
        ];
      default:
        return [
          l10n.focusInstructionDefault1,
          l10n.focusInstructionDefault2,
          l10n.focusInstructionDefault3,
        ];
    }
  }

  Map<String, dynamic> _getConfigForType(String type, int duration) {
    switch (type) {
      case 'breathing':
        return {
          'type': 'breathing',
          'inhaleSeconds': 4,
          'holdInSeconds': 2,
          'exhaleSeconds': 4,
          'holdOutSeconds': 2,
          'cycles': duration ~/ 12, // Each cycle is ~12 seconds
        };
      case 'mindfulness':
        return {
          'type': 'focusSpot',
          'duration': duration,
        };
      case 'movement':
        return {
          'type': 'counting',
          'exercises': ['stretch arms', 'touch toes', 'neck rolls'],
        };
      case 'grounding':
        return {
          'type': 'counting',
          'technique': '5-4-3-2-1',
        };
      default:
        return {
          'type': 'focusSpot',
          'duration': duration,
        };
    }
  }
}
