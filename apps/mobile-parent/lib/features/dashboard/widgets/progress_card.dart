import 'package:flutter/material.dart';

class ProgressCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String? unit;
  final String? trend; // 'up', 'down', 'stable'

  const ProgressCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.unit,
    this.trend,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 16, color: theme.colorScheme.primary),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    label,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  value,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (unit != null) ...[
                  const SizedBox(width: 2),
                  Text(
                    unit!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
            if (trend != null) ...[
              const SizedBox(height: 4),
              _buildTrendIndicator(theme),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTrendIndicator(ThemeData theme) {
    IconData trendIcon;
    Color trendColor;
    String trendText;

    switch (trend) {
      case 'up':
        trendIcon = Icons.trending_up;
        trendColor = Colors.green;
        trendText = 'Improving';
        break;
      case 'down':
        trendIcon = Icons.trending_down;
        trendColor = Colors.red;
        trendText = 'Needs attention';
        break;
      default:
        trendIcon = Icons.trending_flat;
        trendColor = Colors.grey;
        trendText = 'Stable';
    }

    return Row(
      children: [
        Icon(trendIcon, size: 12, color: trendColor),
        const SizedBox(width: 2),
        Text(
          trendText,
          style: theme.textTheme.labelSmall?.copyWith(color: trendColor),
        ),
      ],
    );
  }
}
