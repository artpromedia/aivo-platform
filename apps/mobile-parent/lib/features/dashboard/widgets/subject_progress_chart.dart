import 'package:flutter/material.dart';

class SubjectProgress {
  final String subject;
  final int average;
  final int timeSpent;
  final String trend;

  SubjectProgress({
    required this.subject,
    required this.average,
    required this.timeSpent,
    required this.trend,
  });
}

class SubjectProgressChart extends StatelessWidget {
  final List<SubjectProgress> subjects;

  const SubjectProgressChart({super.key, required this.subjects});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: subjects.map((subject) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Row(
            children: [
              SizedBox(
                width: 80,
                child: Text(
                  subject.subject,
                  style: theme.textTheme.bodyMedium,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: subject.average / 100,
                    minHeight: 12,
                    backgroundColor: theme.colorScheme.surfaceContainerHighest,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _getProgressColor(subject.average),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              SizedBox(
                width: 45,
                child: Text(
                  '${subject.average}%',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.end,
                ),
              ),
              const SizedBox(width: 8),
              _buildTrendIcon(subject.trend),
            ],
          ),
        );
      }).toList(),
    );
  }

  Color _getProgressColor(int score) {
    if (score >= 80) return Colors.green;
    if (score >= 60) return Colors.orange;
    return Colors.red;
  }

  Widget _buildTrendIcon(String trend) {
    IconData icon;
    Color color;

    switch (trend) {
      case 'up':
        icon = Icons.arrow_upward;
        color = Colors.green;
        break;
      case 'down':
        icon = Icons.arrow_downward;
        color = Colors.red;
        break;
      default:
        icon = Icons.arrow_forward;
        color = Colors.grey;
    }

    return Icon(icon, size: 16, color: color);
  }
}
