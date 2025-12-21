/// Quick Stats Row Widget
library;

import 'package:flutter/material.dart';

/// Displays quick statistics in a horizontal row.
class QuickStatsRow extends StatelessWidget {
  const QuickStatsRow({
    super.key,
    required this.classCount,
    required this.activeSessionCount,
    required this.unreadMessages,
  });

  final int classCount;
  final int activeSessionCount;
  final int unreadMessages;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Icons.class_,
            label: 'Classes',
            value: '$classCount',
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            icon: Icons.play_circle,
            label: 'Active',
            value: '$activeSessionCount',
            color: Colors.green,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            icon: Icons.message,
            label: 'Unread',
            value: '$unreadMessages',
            color: Colors.orange,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
