import 'package:flutter/material.dart';

import '../../core/sync/sync_engine.dart';
import '../../core/sync/sync_models.dart';

/// Sync Status Indicator Widget
///
/// Shows the current sync status with visual feedback
class SyncStatusIndicator extends StatelessWidget {
  final SyncState state;
  final int pendingCount;
  final VoidCallback? onTap;
  final bool showLabel;
  final double iconSize;

  const SyncStatusIndicator({
    super.key,
    required this.state,
    this.pendingCount = 0,
    this.onTap,
    this.showLabel = true,
    this.iconSize = 24,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildIcon(context),
          if (showLabel) ...[
            const SizedBox(width: 8),
            _buildLabel(context),
          ],
        ],
      ),
    );
  }

  Widget _buildIcon(BuildContext context) {
    switch (state) {
      case SyncState.idle:
        if (pendingCount > 0) {
          return Badge(
            label: Text('$pendingCount'),
            child: Icon(
              Icons.cloud_done,
              size: iconSize,
              color: Colors.green,
            ),
          );
        }
        return Icon(
          Icons.cloud_done,
          size: iconSize,
          color: Colors.green,
        );

      case SyncState.syncing:
        return SizedBox(
          width: iconSize,
          height: iconSize,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: Theme.of(context).colorScheme.primary,
          ),
        );

      case SyncState.offline:
        return Badge(
          label: pendingCount > 0 ? Text('$pendingCount') : null,
          isLabelVisible: pendingCount > 0,
          child: Icon(
            Icons.cloud_off,
            size: iconSize,
            color: Colors.grey,
          ),
        );

      case SyncState.error:
        return Badge(
          label: pendingCount > 0 ? Text('$pendingCount') : null,
          isLabelVisible: pendingCount > 0,
          backgroundColor: Colors.red,
          child: Icon(
            Icons.cloud_off,
            size: iconSize,
            color: Colors.red,
          ),
        );
    }
  }

  Widget _buildLabel(BuildContext context) {
    final theme = Theme.of(context);

    String text;
    Color color;

    switch (state) {
      case SyncState.idle:
        text = pendingCount > 0 ? '$pendingCount pending' : 'Synced';
        color = Colors.green;
        break;
      case SyncState.syncing:
        text = 'Syncing...';
        color = theme.colorScheme.primary;
        break;
      case SyncState.offline:
        text = pendingCount > 0 ? 'Offline ($pendingCount pending)' : 'Offline';
        color = Colors.grey;
        break;
      case SyncState.error:
        text = 'Sync error';
        color = Colors.red;
        break;
    }

    return Text(
      text,
      style: theme.textTheme.bodySmall?.copyWith(color: color),
    );
  }
}

/// Sync Status Stream Builder
///
/// Convenient wrapper that listens to sync engine state
class SyncStatusStreamBuilder extends StatelessWidget {
  final Widget Function(BuildContext, SyncState, int) builder;

  const SyncStatusStreamBuilder({
    super.key,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<SyncState>(
      stream: SyncEngine.instance.syncState,
      initialData: SyncEngine.instance.currentState,
      builder: (context, snapshot) {
        return builder(
          context,
          snapshot.data ?? SyncState.idle,
          SyncEngine.instance.pendingOperationsCount,
        );
      },
    );
  }
}

/// Sync Status Banner
///
/// Shows a banner at the top of the screen when offline or syncing
class SyncStatusBanner extends StatelessWidget {
  final SyncState state;
  final int pendingCount;
  final VoidCallback? onRetry;
  final VoidCallback? onDismiss;

  const SyncStatusBanner({
    super.key,
    required this.state,
    this.pendingCount = 0,
    this.onRetry,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    // Don't show banner when idle and synced
    if (state == SyncState.idle && pendingCount == 0) {
      return const SizedBox.shrink();
    }

    Color backgroundColor;
    Color textColor;
    IconData icon;
    String message;
    List<Widget> actions = [];

    switch (state) {
      case SyncState.idle:
        backgroundColor = Colors.blue.shade50;
        textColor = Colors.blue.shade900;
        icon = Icons.cloud_upload;
        message = '$pendingCount changes waiting to sync';
        break;

      case SyncState.syncing:
        backgroundColor = Colors.blue.shade50;
        textColor = Colors.blue.shade900;
        icon = Icons.sync;
        message = 'Syncing changes...';
        break;

      case SyncState.offline:
        backgroundColor = Colors.orange.shade50;
        textColor = Colors.orange.shade900;
        icon = Icons.cloud_off;
        message = 'You\'re offline';
        if (pendingCount > 0) {
          message += ' • $pendingCount changes saved locally';
        }
        break;

      case SyncState.error:
        backgroundColor = Colors.red.shade50;
        textColor = Colors.red.shade900;
        icon = Icons.error_outline;
        message = 'Sync failed';
        if (onRetry != null) {
          actions.add(
            TextButton(
              onPressed: onRetry,
              child: Text('Retry', style: TextStyle(color: textColor)),
            ),
          );
        }
        break;
    }

    return Material(
      color: backgroundColor,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              if (state == SyncState.syncing)
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: textColor,
                  ),
                )
              else
                Icon(icon, color: textColor, size: 18),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  message,
                  style: TextStyle(color: textColor, fontSize: 13),
                ),
              ),
              ...actions,
              if (onDismiss != null)
                IconButton(
                  icon: Icon(Icons.close, color: textColor, size: 18),
                  onPressed: onDismiss,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Entity Sync Status Icon
///
/// Shows sync status for a specific entity
class EntitySyncStatusIcon extends StatelessWidget {
  final String entityId;
  final double size;

  const EntitySyncStatusIcon({
    super.key,
    required this.entityId,
    this.size = 16,
  });

  @override
  Widget build(BuildContext context) {
    final status = SyncEngine.instance.getSyncStatus(entityId);

    switch (status) {
      case SyncStatus.synced:
        return Icon(
          Icons.check_circle,
          size: size,
          color: Colors.green,
        );
      case SyncStatus.pending:
        return Icon(
          Icons.schedule,
          size: size,
          color: Colors.orange,
        );
      case SyncStatus.error:
        return Icon(
          Icons.error,
          size: size,
          color: Colors.red,
        );
    }
  }
}
