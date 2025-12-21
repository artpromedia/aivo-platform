/// Quick Actions Card Widget
library;

import 'package:flutter/material.dart';

/// Card with quick action buttons.
class QuickActionsCard extends StatelessWidget {
  const QuickActionsCard({
    super.key,
    required this.onNewSession,
    required this.onViewStudents,
    required this.onViewClasses,
    required this.onViewReports,
  });

  final VoidCallback onNewSession;
  final VoidCallback onViewStudents;
  final VoidCallback onViewClasses;
  final VoidCallback onViewReports;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Quick Actions',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _ActionButton(
                  icon: Icons.add_circle,
                  label: 'New Session',
                  color: Colors.green,
                  onTap: onNewSession,
                ),
                _ActionButton(
                  icon: Icons.people,
                  label: 'Students',
                  color: Colors.blue,
                  onTap: onViewStudents,
                ),
                _ActionButton(
                  icon: Icons.class_,
                  label: 'Classes',
                  color: Colors.purple,
                  onTap: onViewClasses,
                ),
                _ActionButton(
                  icon: Icons.assessment,
                  label: 'Reports',
                  color: Colors.orange,
                  onTap: onViewReports,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color.withOpacity(0.1),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
