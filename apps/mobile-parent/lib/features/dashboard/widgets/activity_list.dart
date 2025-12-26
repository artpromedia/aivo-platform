import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;

class Activity {
  final String id;
  final String type; // 'lesson', 'quiz', 'assignment', 'achievement'
  final String title;
  final String subject;
  final int? score;
  final DateTime completedAt;

  Activity({
    required this.id,
    required this.type,
    required this.title,
    required this.subject,
    this.score,
    required this.completedAt,
  });
}

class ActivityList extends StatelessWidget {
  final List<Activity> activities;

  const ActivityList({super.key, required this.activities});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (activities.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Text(
          'No recent activity',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      );
    }

    return Column(
      children: activities.map((activity) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            children: [
              _buildTypeIcon(activity.type, theme),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      activity.title,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Text(
                          activity.subject,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        if (activity.score != null) ...[
                          const Text(' • '),
                          Text(
                            '${activity.score}%',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: _getScoreColor(activity.score!),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                        const Text(' • '),
                        Text(
                          timeago.format(activity.completedAt),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildTypeIcon(String type, ThemeData theme) {
    IconData icon;
    Color bgColor;
    Color iconColor;

    switch (type) {
      case 'lesson':
        icon = Icons.menu_book;
        bgColor = Colors.blue.withOpacity(0.1);
        iconColor = Colors.blue;
        break;
      case 'quiz':
        icon = Icons.quiz;
        bgColor = Colors.purple.withOpacity(0.1);
        iconColor = Colors.purple;
        break;
      case 'assignment':
        icon = Icons.assignment_turned_in;
        bgColor = Colors.green.withOpacity(0.1);
        iconColor = Colors.green;
        break;
      case 'achievement':
        icon = Icons.emoji_events;
        bgColor = Colors.amber.withOpacity(0.1);
        iconColor = Colors.amber;
        break;
      default:
        icon = Icons.circle;
        bgColor = Colors.grey.withOpacity(0.1);
        iconColor = Colors.grey;
    }

    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, size: 18, color: iconColor),
    );
  }

  Color _getScoreColor(int score) {
    if (score >= 80) return Colors.green;
    if (score >= 60) return Colors.orange;
    return Colors.red;
  }
}
