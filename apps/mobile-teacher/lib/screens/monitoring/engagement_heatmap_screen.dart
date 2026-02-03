/// Engagement Heatmap Screen
///
/// Real-time engagement monitoring with heatmap visualization.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/monitoring.dart';
import '../../providers/monitoring_provider.dart';

/// Screen showing real-time engagement heatmap.
class EngagementHeatmapScreen extends ConsumerStatefulWidget {
  const EngagementHeatmapScreen({
    super.key,
    required this.classId,
  });

  final String classId;

  @override
  ConsumerState<EngagementHeatmapScreen> createState() =>
      _EngagementHeatmapScreenState();
}

class _EngagementHeatmapScreenState extends ConsumerState<EngagementHeatmapScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(heatmapProvider(widget.classId).notifier).refresh();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(heatmapProvider(widget.classId));
    final needsAttention = ref.watch(studentsNeedingAttentionProvider(widget.classId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Engagement'),
        actions: [
          IconButton(
            icon: Icon(
              state.autoRefresh ? Icons.sync : Icons.sync_disabled,
            ),
            onPressed: () {
              ref.read(heatmapProvider(widget.classId).notifier).setAutoRefresh(!state.autoRefresh);
            },
            tooltip: state.autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(heatmapProvider(widget.classId).notifier).refresh(),
          ),
        ],
      ),
      body: state.isLoading && state.heatmap == null
          ? const Center(child: CircularProgressIndicator())
          : state.heatmap == null
              ? const Center(child: Text('No data available'))
              : RefreshIndicator(
                  onRefresh: () => ref.read(heatmapProvider(widget.classId).notifier).refresh(),
                  child: CustomScrollView(
                    slivers: [
                      // Overview stats
                      SliverToBoxAdapter(
                        child: _OverviewCard(heatmap: state.heatmap!),
                      ),

                      // Needs attention section
                      if (needsAttention.isNotEmpty) ...[
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Icon(Icons.warning, color: Colors.orange),
                                const SizedBox(width: 8),
                                Text(
                                  'Needs Attention (${needsAttention.length})',
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        SliverToBoxAdapter(
                          child: SizedBox(
                            height: 140,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: needsAttention.length,
                              separatorBuilder: (_, __) => const SizedBox(width: 8),
                              itemBuilder: (context, index) {
                                return _AttentionCard(
                                  activity: needsAttention[index],
                                  onNudge: () => _showNudgeDialog(needsAttention[index]),
                                );
                              },
                            ),
                          ),
                        ),
                      ],

                      // All students grid
                      SliverPadding(
                        padding: const EdgeInsets.all(16),
                        sliver: SliverToBoxAdapter(
                          child: Text(
                            'All Students',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        sliver: SliverGrid(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            mainAxisSpacing: 8,
                            crossAxisSpacing: 8,
                            childAspectRatio: 1,
                          ),
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final student = state.heatmap!.students[index];
                              return _StudentHeatTile(
                                activity: student,
                                onTap: () => _showStudentDetails(student),
                              );
                            },
                            childCount: state.heatmap!.students.length,
                          ),
                        ),
                      ),
                      const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
                    ],
                  ),
                ),
    );
  }

  void _showNudgeDialog(StudentActivity student) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Send Nudge to ${student.studentName}'),
        content: TextField(
          decoration: const InputDecoration(
            labelText: 'Message (optional)',
            hintText: 'e.g., Stay focused! You got this!',
          ),
          maxLines: 2,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              ref.read(heatmapProvider(widget.classId).notifier).sendNudge(
                    student.studentId,
                    message: 'Stay focused!',
                  );
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Nudge sent to ${student.studentName}')),
              );
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }

  void _showStudentDetails(StudentActivity student) {
    showModalBottomSheet(
      context: context,
      builder: (context) => _StudentDetailsSheet(activity: student),
    );
  }
}

/// Overview stats card.
class _OverviewCard extends StatelessWidget {
  const _OverviewCard({required this.heatmap});

  final EngagementHeatmap heatmap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _StatColumn(
                  label: 'Active',
                  value: '${heatmap.activeCount}',
                  color: Colors.green,
                  icon: Icons.person,
                ),
                _StatColumn(
                  label: 'Idle',
                  value: '${heatmap.idleCount}',
                  color: Colors.orange,
                  icon: Icons.hourglass_empty,
                ),
                _StatColumn(
                  label: 'Offline',
                  value: '${heatmap.offlineCount}',
                  color: Colors.grey,
                  icon: Icons.cloud_off,
                ),
                _StatColumn(
                  label: 'Alerts',
                  value: '${heatmap.alertCount}',
                  color: Colors.red,
                  icon: Icons.warning,
                ),
              ],
            ),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: heatmap.engagementPercentage / 100,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation(_getHeatColor(heatmap.overallHeat)),
            ),
            const SizedBox(height: 8),
            Text(
              '${heatmap.engagementPercentage.toStringAsFixed(0)}% engaged',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  Color _getHeatColor(HeatLevel level) {
    switch (level) {
      case HeatLevel.cold:
        return Colors.blue;
      case HeatLevel.cool:
        return Colors.cyan;
      case HeatLevel.warm:
        return Colors.orange;
      case HeatLevel.hot:
        return Colors.deepOrange;
      case HeatLevel.onFire:
        return Colors.red;
    }
  }
}

/// Stat column widget.
class _StatColumn extends StatelessWidget {
  const _StatColumn({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  final String label;
  final String value;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

/// Card for students needing attention.
class _AttentionCard extends StatelessWidget {
  const _AttentionCard({
    required this.activity,
    required this.onNudge,
  });

  final StudentActivity activity;
  final VoidCallback onNudge;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      color: Colors.orange.withValues(alpha: 0.1),
      child: Container(
        width: 160,
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: _getStatusColor(activity.status),
                  child: Text(
                    activity.studentName.substring(0, 1),
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    activity.studentName,
                    style: theme.textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              activity.status.name,
              style: theme.textTheme.bodySmall?.copyWith(
                color: _getStatusColor(activity.status),
              ),
            ),
            if (activity.idleTime != null)
              Text(
                'Idle: ${activity.idleTime!.inMinutes}m',
                style: theme.textTheme.bodySmall,
              ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onNudge,
                child: const Text('Nudge'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(ActivityStatus status) {
    switch (status) {
      case ActivityStatus.active:
        return Colors.green;
      case ActivityStatus.idle:
        return Colors.orange;
      case ActivityStatus.offline:
        return Colors.grey;
      case ActivityStatus.struggling:
        return Colors.red;
      case ActivityStatus.excelling:
        return Colors.blue;
    }
  }
}

/// Heat tile for individual student.
class _StudentHeatTile extends StatelessWidget {
  const _StudentHeatTile({
    required this.activity,
    required this.onTap,
  });

  final StudentActivity activity;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getHeatColor(activity.heatLevel);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.5)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: color,
              child: Text(
                activity.studentName.substring(0, 1).toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              activity.studentName.split(' ').first,
              style: theme.textTheme.labelSmall,
              overflow: TextOverflow.ellipsis,
            ),
            Icon(
              _getStatusIcon(activity.status),
              size: 14,
              color: _getStatusColor(activity.status),
            ),
          ],
        ),
      ),
    );
  }

  Color _getHeatColor(HeatLevel level) {
    switch (level) {
      case HeatLevel.cold:
        return Colors.blue;
      case HeatLevel.cool:
        return Colors.cyan;
      case HeatLevel.warm:
        return Colors.orange;
      case HeatLevel.hot:
        return Colors.deepOrange;
      case HeatLevel.onFire:
        return Colors.red;
    }
  }

  Color _getStatusColor(ActivityStatus status) {
    switch (status) {
      case ActivityStatus.active:
        return Colors.green;
      case ActivityStatus.idle:
        return Colors.orange;
      case ActivityStatus.offline:
        return Colors.grey;
      case ActivityStatus.struggling:
        return Colors.red;
      case ActivityStatus.excelling:
        return Colors.blue;
    }
  }

  IconData _getStatusIcon(ActivityStatus status) {
    switch (status) {
      case ActivityStatus.active:
        return Icons.check_circle;
      case ActivityStatus.idle:
        return Icons.pause_circle;
      case ActivityStatus.offline:
        return Icons.cloud_off;
      case ActivityStatus.struggling:
        return Icons.warning;
      case ActivityStatus.excelling:
        return Icons.star;
    }
  }
}

/// Student details bottom sheet.
class _StudentDetailsSheet extends StatelessWidget {
  const _StudentDetailsSheet({required this.activity});

  final StudentActivity activity;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 24,
                child: Text(activity.studentName.substring(0, 1)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      activity.studentName,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      activity.currentActivity ?? 'No activity',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.timer),
            title: const Text('Time on Task'),
            trailing: Text(
              activity.timeOnTask != null
                  ? '${activity.timeOnTask!.inMinutes}m'
                  : '-',
            ),
          ),
          ListTile(
            leading: const Icon(Icons.trending_up),
            title: const Text('Engagement Score'),
            trailing: Text('${(activity.engagementScore * 100).toStringAsFixed(0)}%'),
          ),
          ListTile(
            leading: const Icon(Icons.check_circle),
            title: const Text('Progress Today'),
            trailing: Text('${(activity.progressToday * 100).toStringAsFixed(0)}%'),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
