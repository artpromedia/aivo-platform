/// Screen Time Status Widget
///
/// Widget showing current screen time status and controls.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/engagement_models.dart';
import '../providers/engagement_provider.dart';

/// Card showing current screen time status.
class ScreenTimeStatusCard extends ConsumerWidget {
  const ScreenTimeStatusCard({
    super.key,
    required this.childId,
  });

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusAsync = ref.watch(screenTimeStatusProvider(childId));
    final settingsAsync = ref.watch(screenTimeSettingsNotifierProvider(childId));
    final theme = Theme.of(context);

    return statusAsync.when(
      loading: () => const Card(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Center(child: CircularProgressIndicator()),
        ),
      ),
      error: (e, _) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text('Error: $e'),
        ),
      ),
      data: (status) {
        final settings = settingsAsync.valueOrNull;
        final isEnabled = settings?.isEnabled ?? true;

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.timer,
                      color: _getStatusColor(status.level),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Screen Time',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    _StatusBadge(level: status.level),
                  ],
                ),
                const SizedBox(height: 16),

                if (!isEnabled)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline, color: Colors.grey),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Screen time limits are disabled',
                            style: theme.textTheme.bodySmall,
                          ),
                        ),
                      ],
                    ),
                  )
                else ...[
                  // Time usage indicator
                  _TimeProgressIndicator(
                    usedMinutes: status.usedMinutesToday,
                    remainingMinutes: status.remainingMinutes,
                    totalMinutes: status.usedMinutesToday + status.remainingMinutes,
                  ),
                  const SizedBox(height: 16),

                  // Status info
                  Row(
                    children: [
                      Expanded(
                        child: _InfoTile(
                          icon: Icons.play_circle,
                          label: 'Used Today',
                          value: '${status.usedMinutesToday}m',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _InfoTile(
                          icon: Icons.hourglass_empty,
                          label: 'Remaining',
                          value: '${status.remainingMinutes}m',
                          valueColor: status.remainingMinutes < 15
                              ? Colors.orange
                              : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Current session info
                  if (status.currentSessionMinutes > 0) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.laptop, color: Colors.blue, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Current session: ${status.currentSessionMinutes}m',
                              style: theme.textTheme.bodySmall,
                            ),
                          ),
                          if (status.nextBreakTime != null)
                            Text(
                              'Break in ${_formatTimeUntil(status.nextBreakTime!)}',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: Colors.orange,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],

                  // On break indicator
                  if (status.isOnBreak)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.coffee, color: Colors.green, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Taking a break',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: Colors.green,
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Quick action
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () => _showExtensionDialog(context, ref),
                    icon: const Icon(Icons.add_alarm),
                    label: const Text('Grant Extension'),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  void _showExtensionDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => _ExtensionDialog(
        childId: childId,
        onGrant: (minutes, reason) {
          ref.read(screenTimeExtensionNotifierProvider.notifier).grantExtension(
                childId,
                minutes: minutes,
                reason: reason,
              );
        },
      ),
    );
  }

  Color _getStatusColor(ScreenTimeStatusLevel level) {
    switch (level) {
      case ScreenTimeStatusLevel.good:
        return Colors.green;
      case ScreenTimeStatusLevel.warning:
        return Colors.orange;
      case ScreenTimeStatusLevel.limitReached:
        return Colors.red;
      case ScreenTimeStatusLevel.outsideSchedule:
        return Colors.grey;
    }
  }

  String _formatTimeUntil(DateTime time) {
    final diff = time.difference(DateTime.now());
    if (diff.inMinutes < 1) return 'now';
    return '${diff.inMinutes}m';
  }
}

/// Status badge.
class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.level});

  final ScreenTimeStatusLevel level;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (level) {
      ScreenTimeStatusLevel.good => (Colors.green, 'Good'),
      ScreenTimeStatusLevel.warning => (Colors.orange, 'Warning'),
      ScreenTimeStatusLevel.limitReached => (Colors.red, 'Limit Reached'),
      ScreenTimeStatusLevel.outsideSchedule => (Colors.grey, 'Outside Hours'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }
}

/// Time progress indicator.
class _TimeProgressIndicator extends StatelessWidget {
  const _TimeProgressIndicator({
    required this.usedMinutes,
    required this.remainingMinutes,
    required this.totalMinutes,
  });

  final int usedMinutes;
  final int remainingMinutes;
  final int totalMinutes;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = totalMinutes > 0 ? usedMinutes / totalMinutes : 0.0;
    final color = progress >= 0.9
        ? Colors.red
        : progress >= 0.75
            ? Colors.orange
            : Colors.green;

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '$usedMinutes min used',
              style: theme.textTheme.bodySmall,
            ),
            Text(
              '$totalMinutes min limit',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 12,
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
            valueColor: AlwaysStoppedAnimation(color),
          ),
        ),
      ],
    );
  }
}

/// Info tile widget.
class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: theme.colorScheme.primary),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: valueColor,
                ),
              ),
              Text(
                label,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Dialog for granting screen time extension.
class _ExtensionDialog extends StatefulWidget {
  const _ExtensionDialog({
    required this.childId,
    required this.onGrant,
  });

  final String childId;
  final void Function(int minutes, String? reason) onGrant;

  @override
  State<_ExtensionDialog> createState() => _ExtensionDialogState();
}

class _ExtensionDialogState extends State<_ExtensionDialog> {
  int _selectedMinutes = 15;
  final _reasonController = TextEditingController();

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      title: const Text('Grant Extension'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Additional Time',
            style: theme.textTheme.titleSmall,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [15, 30, 45, 60].map((minutes) {
              final isSelected = _selectedMinutes == minutes;
              return ChoiceChip(
                label: Text('$minutes min'),
                selected: isSelected,
                onSelected: (_) => setState(() => _selectedMinutes = minutes),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _reasonController,
            decoration: const InputDecoration(
              labelText: 'Reason (optional)',
              border: OutlineInputBorder(),
              hintText: 'e.g., Finishing homework',
            ),
            maxLines: 2,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            widget.onGrant(
              _selectedMinutes,
              _reasonController.text.isNotEmpty ? _reasonController.text : null,
            );
            Navigator.of(context).pop();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('$_selectedMinutes min extension granted'),
                backgroundColor: Colors.green,
              ),
            );
          },
          child: const Text('Grant'),
        ),
      ],
    );
  }
}
