/// Sync Health UI Widgets
///
/// Provides visual feedback for sync status, tailored for different user types:
/// - Learners: Simple "Last synced: X minutes ago" indicator
/// - Teachers: Detailed sync health section with unsynced counts
/// - Administrators: Full diagnostic information
library;

import 'package:flutter/material.dart';

import 'sync_scheduler.dart';

// ══════════════════════════════════════════════════════════════════════════════
// SYNC HEALTH DATA
// ══════════════════════════════════════════════════════════════════════════════

/// Sync health information for display.
class SyncHealthInfo {
  const SyncHealthInfo({
    required this.lastSyncTime,
    required this.isOnline,
    required this.syncState,
    this.pendingSessions = 0,
    this.pendingEvents = 0,
    this.failedItems = 0,
    this.stuckItems = 0,
    this.nextScheduledSync,
    this.lastError,
  });

  final DateTime? lastSyncTime;
  final bool isOnline;
  final SyncStateStatus syncState;
  final int pendingSessions;
  final int pendingEvents;
  final int failedItems;
  final int stuckItems;
  final DateTime? nextScheduledSync;
  final String? lastError;

  int get totalPending => pendingSessions + pendingEvents;
  bool get hasPendingItems => totalPending > 0;
  bool get hasIssues => failedItems > 0 || stuckItems > 0;

  /// Overall health status.
  SyncHealthStatus get overallStatus {
    if (!isOnline) return SyncHealthStatus.offline;
    if (stuckItems > 0) return SyncHealthStatus.stuck;
    if (failedItems > 0) return SyncHealthStatus.failing;
    if (syncState == SyncStateStatus.syncing) return SyncHealthStatus.syncing;
    if (hasPendingItems) return SyncHealthStatus.pending;
    return SyncHealthStatus.healthy;
  }

  /// Time since last successful sync.
  Duration? get timeSinceLastSync {
    if (lastSyncTime == null) return null;
    return DateTime.now().difference(lastSyncTime!);
  }

  /// Human-readable last sync string.
  String get lastSyncDisplay {
    final time = timeSinceLastSync;
    if (time == null) return 'Never synced';

    if (time.inMinutes < 1) return 'Just now';
    if (time.inMinutes < 60) return '${time.inMinutes}m ago';
    if (time.inHours < 24) return '${time.inHours}h ago';
    return '${time.inDays}d ago';
  }
}

/// Overall sync health status.
enum SyncHealthStatus {
  healthy,
  syncing,
  pending,
  offline,
  failing,
  stuck,
}

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER SYNC INDICATOR (SIMPLE)
// ══════════════════════════════════════════════════════════════════════════════

/// Simple sync indicator for learners.
///
/// Shows a small cloud icon with status and "Last synced: X ago" text.
class LearnerSyncIndicator extends StatelessWidget {
  const LearnerSyncIndicator({
    super.key,
    required this.healthInfo,
    this.onTap,
  });

  final SyncHealthInfo healthInfo;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (icon, color) = _getIconAndColor(healthInfo.overallStatus, theme);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 8),
            Text(
              healthInfo.lastSyncDisplay,
              style: theme.textTheme.bodySmall?.copyWith(color: color),
            ),
            if (healthInfo.syncState == SyncStateStatus.syncing) ...[
              const SizedBox(width: 8),
              SizedBox(
                width: 12,
                height: 12,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: color,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  (IconData, Color) _getIconAndColor(SyncHealthStatus status, ThemeData theme) {
    return switch (status) {
      SyncHealthStatus.healthy => (Icons.cloud_done, Colors.green),
      SyncHealthStatus.syncing => (Icons.cloud_sync, theme.colorScheme.primary),
      SyncHealthStatus.pending => (Icons.cloud_upload, Colors.orange),
      SyncHealthStatus.offline => (Icons.cloud_off, Colors.grey),
      SyncHealthStatus.failing => (Icons.cloud_off, Colors.red),
      SyncHealthStatus.stuck => (Icons.error_outline, Colors.red),
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER SYNC PANEL (DETAILED)
// ══════════════════════════════════════════════════════════════════════════════

/// Detailed sync health panel for teachers.
///
/// Shows:
/// - Current sync status
/// - Number of unsynced items
/// - Any stuck or failed items
/// - Actions to retry or view details
class TeacherSyncPanel extends StatelessWidget {
  const TeacherSyncPanel({
    super.key,
    required this.healthInfo,
    this.onSyncNow,
    this.onViewDetails,
    this.onResetStuck,
  });

  final SyncHealthInfo healthInfo;
  final VoidCallback? onSyncNow;
  final VoidCallback? onViewDetails;
  final VoidCallback? onResetStuck;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                _buildStatusIcon(healthInfo.overallStatus, theme),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sync Health',
                        style: theme.textTheme.titleMedium,
                      ),
                      Text(
                        _getStatusText(healthInfo.overallStatus),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: _getStatusColor(healthInfo.overallStatus),
                        ),
                      ),
                    ],
                  ),
                ),
                if (healthInfo.isOnline && onSyncNow != null)
                  TextButton.icon(
                    onPressed: healthInfo.syncState == SyncStateStatus.syncing
                        ? null
                        : onSyncNow,
                    icon: const Icon(Icons.sync, size: 18),
                    label: const Text('Sync Now'),
                  ),
              ],
            ),

            const Divider(height: 24),

            // Stats
            _buildStatRow(
              context,
              'Last synced',
              healthInfo.lastSyncDisplay,
              icon: Icons.schedule,
            ),
            if (healthInfo.hasPendingItems) ...[
              const SizedBox(height: 8),
              _buildStatRow(
                context,
                'Pending items',
                '${healthInfo.totalPending}',
                icon: Icons.cloud_upload,
                color: Colors.orange,
              ),
            ],
            if (healthInfo.failedItems > 0) ...[
              const SizedBox(height: 8),
              _buildStatRow(
                context,
                'Failed items',
                '${healthInfo.failedItems}',
                icon: Icons.error_outline,
                color: Colors.red,
              ),
            ],
            if (healthInfo.stuckItems > 0) ...[
              const SizedBox(height: 8),
              _buildStatRow(
                context,
                'Stuck items',
                '${healthInfo.stuckItems}',
                icon: Icons.warning_amber,
                color: Colors.red,
                trailing: TextButton(
                  onPressed: onResetStuck,
                  child: const Text('Reset'),
                ),
              ),
            ],

            // Error message if present
            if (healthInfo.lastError != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error, color: Colors.red, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        healthInfo.lastError!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.red,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Actions
            if (onViewDetails != null) ...[
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: onViewDetails,
                  child: const Text('View Details'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusIcon(SyncHealthStatus status, ThemeData theme) {
    final (icon, color) = switch (status) {
      SyncHealthStatus.healthy => (Icons.check_circle, Colors.green),
      SyncHealthStatus.syncing => (Icons.sync, theme.colorScheme.primary),
      SyncHealthStatus.pending => (Icons.cloud_upload, Colors.orange),
      SyncHealthStatus.offline => (Icons.cloud_off, Colors.grey),
      SyncHealthStatus.failing => (Icons.error, Colors.red),
      SyncHealthStatus.stuck => (Icons.warning, Colors.red),
    };

    if (status == SyncHealthStatus.syncing) {
      return Stack(
        children: [
          Icon(icon, color: color, size: 32),
          Positioned.fill(
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: color,
            ),
          ),
        ],
      );
    }

    return Icon(icon, color: color, size: 32);
  }

  String _getStatusText(SyncHealthStatus status) {
    return switch (status) {
      SyncHealthStatus.healthy => 'All data synced',
      SyncHealthStatus.syncing => 'Syncing...',
      SyncHealthStatus.pending => 'Data waiting to sync',
      SyncHealthStatus.offline => 'Device offline',
      SyncHealthStatus.failing => 'Sync errors detected',
      SyncHealthStatus.stuck => 'Some items stuck',
    };
  }

  Color _getStatusColor(SyncHealthStatus status) {
    return switch (status) {
      SyncHealthStatus.healthy => Colors.green,
      SyncHealthStatus.syncing => Colors.blue,
      SyncHealthStatus.pending => Colors.orange,
      SyncHealthStatus.offline => Colors.grey,
      SyncHealthStatus.failing || SyncHealthStatus.stuck => Colors.red,
    };
  }

  Widget _buildStatRow(
    BuildContext context,
    String label,
    String value, {
    required IconData icon,
    Color? color,
    Widget? trailing,
  }) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, size: 16, color: color ?? theme.iconTheme.color),
        const SizedBox(width: 8),
        Text(label, style: theme.textTheme.bodySmall),
        const Spacer(),
        Text(
          value,
          style: theme.textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
        if (trailing != null) trailing,
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC DETAILS DIALOG
// ══════════════════════════════════════════════════════════════════════════════

/// Detailed sync information dialog.
///
/// Shows full diagnostic information for troubleshooting.
class SyncDetailsDialog extends StatelessWidget {
  const SyncDetailsDialog({
    super.key,
    required this.healthInfo,
    this.schedulerState,
    this.onClose,
  });

  final SyncHealthInfo healthInfo;
  final SyncState? schedulerState;
  final VoidCallback? onClose;

  static Future<void> show(
    BuildContext context, {
    required SyncHealthInfo healthInfo,
    SyncState? schedulerState,
  }) {
    return showDialog(
      context: context,
      builder: (ctx) => SyncDetailsDialog(
        healthInfo: healthInfo,
        schedulerState: schedulerState,
        onClose: () => Navigator.of(ctx).pop(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      title: const Text('Sync Details'),
      content: SizedBox(
        width: double.maxFinite,
        child: ListView(
          shrinkWrap: true,
          children: [
            _buildSection(context, 'Status', [
              _buildRow('Online', healthInfo.isOnline ? 'Yes' : 'No'),
              _buildRow('State', healthInfo.syncState.name),
              _buildRow('Last Sync', healthInfo.lastSyncDisplay),
            ]),
            const SizedBox(height: 16),
            _buildSection(context, 'Pending Items', [
              _buildRow('Sessions', '${healthInfo.pendingSessions}'),
              _buildRow('Events', '${healthInfo.pendingEvents}'),
              _buildRow('Failed', '${healthInfo.failedItems}'),
              _buildRow('Stuck', '${healthInfo.stuckItems}'),
            ]),
            if (schedulerState != null) ...[
              const SizedBox(height: 16),
              _buildSection(context, 'Scheduler', [
                _buildRow(
                    'Consecutive Failures', '${schedulerState!.consecutiveFailures}'),
                _buildRow(
                    'Backoff Level', '${schedulerState!.currentBackoffLevel}'),
                _buildRow(
                  'Next Sync',
                  schedulerState!.nextScheduledSync != null
                      ? _formatDateTime(schedulerState!.nextScheduledSync!)
                      : 'Not scheduled',
                ),
              ]),
            ],
            if (healthInfo.lastError != null) ...[
              const SizedBox(height: 16),
              _buildSection(context, 'Last Error', [
                Text(
                  healthInfo.lastError!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.red,
                    fontFamily: 'monospace',
                  ),
                ),
              ]),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: onClose,
          child: const Text('Close'),
        ),
      ],
    );
  }

  Widget _buildSection(BuildContext context, String title, List<Widget> children) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: theme.textTheme.titleSmall),
        const Divider(),
        ...children,
      ],
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  String _formatDateTime(DateTime dt) {
    return '${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// OFFLINE BANNER
// ══════════════════════════════════════════════════════════════════════════════

/// Banner shown when device is offline.
class OfflineBanner extends StatelessWidget {
  const OfflineBanner({
    super.key,
    required this.isOffline,
    this.message,
    this.pendingCount = 0,
  });

  final bool isOffline;
  final String? message;
  final int pendingCount;

  @override
  Widget build(BuildContext context) {
    if (!isOffline) return const SizedBox.shrink();

    return MaterialBanner(
      backgroundColor: Colors.orange.shade100,
      leading: const Icon(Icons.cloud_off, color: Colors.orange),
      content: Text(
        message ??
            (pendingCount > 0
                ? 'You\'re offline. $pendingCount items waiting to sync.'
                : 'You\'re offline. Changes will sync when connected.'),
      ),
      actions: const [SizedBox.shrink()], // Required but empty
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC PROGRESS OVERLAY
// ══════════════════════════════════════════════════════════════════════════════

/// Overlay showing sync progress.
class SyncProgressOverlay extends StatelessWidget {
  const SyncProgressOverlay({
    super.key,
    required this.isSyncing,
    required this.child,
    this.progress,
    this.message,
  });

  final bool isSyncing;
  final Widget child;
  final double? progress;
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (isSyncing)
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: Material(
              elevation: 4,
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    if (progress != null)
                      SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          value: progress,
                          strokeWidth: 3,
                        ),
                      )
                    else
                      const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 3),
                      ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        message ?? 'Syncing...',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC HEALTH PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

/// Provides sync health info to widgets via InheritedWidget.
class SyncHealthProvider extends InheritedWidget {
  const SyncHealthProvider({
    super.key,
    required this.healthInfo,
    required super.child,
  });

  final SyncHealthInfo healthInfo;

  static SyncHealthInfo of(BuildContext context) {
    final provider =
        context.dependOnInheritedWidgetOfExactType<SyncHealthProvider>();
    return provider?.healthInfo ??
        const SyncHealthInfo(
          lastSyncTime: null,
          isOnline: false,
          syncState: SyncStateStatus.unknown,
        );
  }

  @override
  bool updateShouldNotify(SyncHealthProvider oldWidget) =>
      healthInfo != oldWidget.healthInfo;
}
