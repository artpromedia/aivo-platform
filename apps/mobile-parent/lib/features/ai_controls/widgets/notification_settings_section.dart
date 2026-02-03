/// Notification Settings Section Widget
///
/// Section for configuring AI notification preferences.
library;

import 'package:flutter/material.dart';

import '../models/ai_autonomy_settings.dart';

/// A section widget for notification settings.
class NotificationSettingsSection extends StatelessWidget {
  const NotificationSettingsSection({
    super.key,
    required this.settings,
    required this.onChanged,
  });

  final NotificationSettings settings;
  final ValueChanged<NotificationSettings> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Priority selector
        Text(
          'Notification Priority',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        _PrioritySelector(
          value: settings.priority,
          onChanged: (priority) {
            onChanged(settings.copyWith(priority: priority));
          },
        ),
        const SizedBox(height: 24),

        // Toggle settings
        Text(
          'Notification Types',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        _NotificationToggle(
          icon: Icons.approval,
          title: 'Approval Requests',
          subtitle: 'When the AI needs your permission',
          value: settings.approvalRequests,
          onChanged: (value) {
            onChanged(settings.copyWith(approvalRequests: value));
          },
        ),
        _NotificationToggle(
          icon: Icons.warning_amber,
          title: 'Major Decisions',
          subtitle: 'Significant changes to learning plan',
          value: settings.majorDecisions,
          onChanged: (value) {
            onChanged(settings.copyWith(majorDecisions: value));
          },
        ),
        _NotificationToggle(
          icon: Icons.list_alt,
          title: 'All AI Decisions',
          subtitle: 'Every decision the AI makes',
          value: settings.allDecisions,
          onChanged: (value) {
            onChanged(settings.copyWith(allDecisions: value));
          },
        ),
        _NotificationToggle(
          icon: Icons.support,
          title: 'Intervention Alerts',
          subtitle: 'When support measures are triggered',
          value: settings.interventionAlerts,
          onChanged: (value) {
            onChanged(settings.copyWith(interventionAlerts: value));
          },
        ),
        _NotificationToggle(
          icon: Icons.emoji_events,
          title: 'Progress Milestones',
          subtitle: 'Achievement and progress updates',
          value: settings.progressMilestones,
          onChanged: (value) {
            onChanged(settings.copyWith(progressMilestones: value));
          },
        ),
        const Divider(height: 32),

        // Summary settings
        Text(
          'Summary Reports',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        _NotificationToggle(
          icon: Icons.today,
          title: 'Daily Summary',
          subtitle: 'Daily overview of AI activity',
          value: settings.dailySummary,
          onChanged: (value) {
            onChanged(settings.copyWith(dailySummary: value));
          },
        ),
        _NotificationToggle(
          icon: Icons.calendar_view_week,
          title: 'Weekly Report',
          subtitle: 'Comprehensive weekly learning report',
          value: settings.weeklyReport,
          onChanged: (value) {
            onChanged(settings.copyWith(weeklyReport: value));
          },
        ),

        if (settings.dailySummary || settings.weeklyReport) ...[
          const SizedBox(height: 16),
          _PreferredTimeSelector(
            value: settings.preferredTime,
            onChanged: (time) {
              onChanged(settings.copyWith(preferredTime: time));
            },
          ),
        ],
      ],
    );
  }
}

/// Priority level selector.
class _PrioritySelector extends StatelessWidget {
  const _PrioritySelector({
    required this.value,
    required this.onChanged,
  });

  final NotificationPriority value;
  final ValueChanged<NotificationPriority> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SegmentedButton<NotificationPriority>(
      segments: NotificationPriority.values.map((priority) {
        return ButtonSegment(
          value: priority,
          label: Text(_getPriorityLabel(priority)),
          icon: Icon(_getPriorityIcon(priority)),
        );
      }).toList(),
      selected: {value},
      onSelectionChanged: (selection) {
        onChanged(selection.first);
      },
      style: ButtonStyle(
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  String _getPriorityLabel(NotificationPriority priority) {
    switch (priority) {
      case NotificationPriority.all:
        return 'All';
      case NotificationPriority.important:
        return 'Important';
      case NotificationPriority.critical:
        return 'Critical';
      case NotificationPriority.none:
        return 'None';
    }
  }

  IconData _getPriorityIcon(NotificationPriority priority) {
    switch (priority) {
      case NotificationPriority.all:
        return Icons.notifications;
      case NotificationPriority.important:
        return Icons.notifications_active;
      case NotificationPriority.critical:
        return Icons.priority_high;
      case NotificationPriority.none:
        return Icons.notifications_off;
    }
  }
}

/// Individual notification toggle.
class _NotificationToggle extends StatelessWidget {
  const _NotificationToggle({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: value
                  ? theme.colorScheme.primaryContainer
                  : theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              size: 20,
              color: value
                  ? theme.colorScheme.onPrimaryContainer
                  : theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  subtitle,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}

/// Preferred time selector for summaries.
class _PreferredTimeSelector extends StatelessWidget {
  const _PreferredTimeSelector({
    required this.value,
    required this.onChanged,
  });

  final String? value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final times = [
      '07:00',
      '08:00',
      '09:00',
      '18:00',
      '19:00',
      '20:00',
      '21:00',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Preferred Delivery Time',
          style: theme.textTheme.labelMedium?.copyWith(
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: times.map((time) {
              final isSelected = time == value;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(_formatTime(time)),
                  selected: isSelected,
                  onSelected: (_) => onChanged(time),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  String _formatTime(String time) {
    final parts = time.split(':');
    final hour = int.parse(parts[0]);
    if (hour == 0) return '12 AM';
    if (hour == 12) return '12 PM';
    if (hour < 12) return '$hour AM';
    return '${hour - 12} PM';
  }
}

/// Compact notification summary badge.
class NotificationBadge extends StatelessWidget {
  const NotificationBadge({
    super.key,
    required this.settings,
    this.onTap,
  });

  final NotificationSettings settings;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final enabledCount = _countEnabled(settings);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _getPriorityIcon(settings.priority),
              size: 18,
              color: settings.priority == NotificationPriority.none
                  ? theme.colorScheme.onSurfaceVariant
                  : theme.colorScheme.primary,
            ),
            const SizedBox(width: 8),
            Text(
              settings.priority == NotificationPriority.none
                  ? 'Off'
                  : '$enabledCount enabled',
              style: theme.textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.chevron_right,
              size: 16,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }

  int _countEnabled(NotificationSettings settings) {
    var count = 0;
    if (settings.approvalRequests) count++;
    if (settings.majorDecisions) count++;
    if (settings.allDecisions) count++;
    if (settings.interventionAlerts) count++;
    if (settings.progressMilestones) count++;
    if (settings.dailySummary) count++;
    if (settings.weeklyReport) count++;
    return count;
  }

  IconData _getPriorityIcon(NotificationPriority priority) {
    switch (priority) {
      case NotificationPriority.all:
        return Icons.notifications;
      case NotificationPriority.important:
        return Icons.notifications_active;
      case NotificationPriority.critical:
        return Icons.priority_high;
      case NotificationPriority.none:
        return Icons.notifications_off;
    }
  }
}
