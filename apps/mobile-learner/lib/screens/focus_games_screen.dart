import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
      'color': Colors.green,
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

  @override
  Widget build(BuildContext context) {
    final recommended = _activities.where((a) => a['isRecommended'] == true).toList();
    final others = _activities.where((a) => a['isRecommended'] != true).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Focus Activities'),
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
                    'Recommended for You',
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
              'All Activities',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 12),
            // Activity type sections
            _buildActivitySection('Breathing', 'breathing', Icons.air),
            _buildActivitySection('Mindfulness', 'mindfulness', Icons.self_improvement),
            _buildActivitySection('Movement', 'movement', Icons.directions_run),
            _buildActivitySection('Grounding', 'grounding', Icons.nature),
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
              Icon(icon, size: 18, color: Colors.grey[600]),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[600],
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
                              activity['title'],
                              style: TextStyle(
                                fontSize: isLarge ? 18 : 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            if (isLarge) ...[
                              const SizedBox(height: 4),
                              Text(
                                activity['description'],
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
                            'Recommended',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey[800],
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
    // TODO: Navigate to focus activity player
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Starting: ${activity['title']}')),
    );
  }
}
