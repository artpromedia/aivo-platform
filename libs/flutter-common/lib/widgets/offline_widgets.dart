/// Offline Widgets
///
/// Widgets for displaying offline status and sync indicators.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTIVITY STATE
// ═══════════════════════════════════════════════════════════════════════════════

/// Network connectivity status.
enum ConnectivityStatus {
  online,
  offline,
  limited;

  bool get isConnected => this == online || this == limited;
  bool get isOffline => this == offline;
}

/// Sync status.
enum SyncStatus {
  idle,
  syncing,
  synced,
  error,
  pendingUpload,
  pendingDownload;

  bool get isBusy => this == syncing;
  bool get hasPending => this == pendingUpload || this == pendingDownload;
}

/// Network state for the app.
class NetworkState {
  const NetworkState({
    this.connectivity = ConnectivityStatus.online,
    this.syncStatus = SyncStatus.idle,
    this.pendingCount = 0,
    this.lastSyncedAt,
    this.errorMessage,
  });

  final ConnectivityStatus connectivity;
  final SyncStatus syncStatus;
  final int pendingCount;
  final DateTime? lastSyncedAt;
  final String? errorMessage;

  NetworkState copyWith({
    ConnectivityStatus? connectivity,
    SyncStatus? syncStatus,
    int? pendingCount,
    DateTime? lastSyncedAt,
    String? errorMessage,
  }) {
    return NetworkState(
      connectivity: connectivity ?? this.connectivity,
      syncStatus: syncStatus ?? this.syncStatus,
      pendingCount: pendingCount ?? this.pendingCount,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NETWORK STATE PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for network state.
final networkStateProvider =
    StateNotifierProvider<NetworkStateNotifier, NetworkState>((ref) {
  return NetworkStateNotifier();
});

/// Notifier for network state.
class NetworkStateNotifier extends StateNotifier<NetworkState> {
  NetworkStateNotifier() : super(const NetworkState());

  void setConnectivity(ConnectivityStatus status) {
    state = state.copyWith(connectivity: status);
  }

  void setSyncStatus(SyncStatus status) {
    state = state.copyWith(syncStatus: status);
  }

  void setPendingCount(int count) {
    state = state.copyWith(pendingCount: count);
  }

  void setLastSynced(DateTime time) {
    state = state.copyWith(lastSyncedAt: time, syncStatus: SyncStatus.synced);
  }

  void setError(String message) {
    state = state.copyWith(syncStatus: SyncStatus.error, errorMessage: message);
  }

  void clearError() {
    state = state.copyWith(syncStatus: SyncStatus.idle, errorMessage: null);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OFFLINE BANNER
// ═══════════════════════════════════════════════════════════════════════════════

/// Banner showing offline status.
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({
    super.key,
    this.message = 'You\'re offline',
    this.showWhenOnline = false,
    this.animateDismiss = true,
  });

  final String message;
  final bool showWhenOnline;
  final bool animateDismiss;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final networkState = ref.watch(networkStateProvider);
    final isOffline = networkState.connectivity.isOffline;

    if (!isOffline && !showWhenOnline) {
      return const SizedBox.shrink();
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      height: isOffline ? null : 0,
      child: Material(
        color: isOffline
            ? Colors.grey.shade700
            : Colors.green.shade600,
        child: SafeArea(
          bottom: false,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 8,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  isOffline ? Icons.cloud_off : Icons.cloud_done,
                  color: Colors.white,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Text(
                  isOffline ? message : 'Back online',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Compact offline indicator (icon only).
class OfflineIndicator extends ConsumerWidget {
  const OfflineIndicator({
    super.key,
    this.size = 20,
    this.showWhenOnline = false,
  });

  final double size;
  final bool showWhenOnline;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final networkState = ref.watch(networkStateProvider);
    final isOffline = networkState.connectivity.isOffline;

    if (!isOffline && !showWhenOnline) {
      return const SizedBox.shrink();
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      child: Icon(
        isOffline ? Icons.cloud_off : Icons.cloud_done,
        size: size,
        color: isOffline
            ? Colors.grey
            : Colors.green,
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

/// Sync status indicator.
class SyncIndicator extends ConsumerWidget {
  const SyncIndicator({
    super.key,
    this.size = 20,
    this.showLabel = false,
    this.onTap,
  });

  final double size;
  final bool showLabel;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final networkState = ref.watch(networkStateProvider);
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildIcon(networkState, theme),
          if (showLabel) ...[
            const SizedBox(width: 6),
            Text(
              _getLabel(networkState),
              style: theme.textTheme.bodySmall?.copyWith(
                color: _getColor(networkState),
              ),
            ),
          ],
          if (networkState.pendingCount > 0) ...[
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 6,
                vertical: 2,
              ),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '${networkState.pendingCount}',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onPrimaryContainer,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildIcon(NetworkState state, ThemeData theme) {
    switch (state.syncStatus) {
      case SyncStatus.syncing:
        return SizedBox(
          width: size,
          height: size,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: theme.colorScheme.primary,
          ),
        );
      case SyncStatus.synced:
        return Icon(
          Icons.cloud_done,
          size: size,
          color: Colors.green,
        );
      case SyncStatus.error:
        return Icon(
          Icons.sync_problem,
          size: size,
          color: theme.colorScheme.error,
        );
      case SyncStatus.pendingUpload:
        return Icon(
          Icons.cloud_upload,
          size: size,
          color: Colors.orange,
        );
      case SyncStatus.pendingDownload:
        return Icon(
          Icons.cloud_download,
          size: size,
          color: Colors.blue,
        );
      case SyncStatus.idle:
        return Icon(
          Icons.cloud_outlined,
          size: size,
          color: theme.colorScheme.outline,
        );
    }
  }

  String _getLabel(NetworkState state) {
    switch (state.syncStatus) {
      case SyncStatus.syncing:
        return 'Syncing...';
      case SyncStatus.synced:
        return 'Synced';
      case SyncStatus.error:
        return 'Sync error';
      case SyncStatus.pendingUpload:
        return 'Pending upload';
      case SyncStatus.pendingDownload:
        return 'Pending download';
      case SyncStatus.idle:
        return '';
    }
  }

  Color _getColor(NetworkState state) {
    switch (state.syncStatus) {
      case SyncStatus.syncing:
        return Colors.blue;
      case SyncStatus.synced:
        return Colors.green;
      case SyncStatus.error:
        return Colors.red;
      case SyncStatus.pendingUpload:
      case SyncStatus.pendingDownload:
        return Colors.orange;
      case SyncStatus.idle:
        return Colors.grey;
    }
  }
}

/// Animated sync icon with rotation.
class AnimatedSyncIcon extends StatefulWidget {
  const AnimatedSyncIcon({
    super.key,
    this.isSyncing = false,
    this.size = 24,
    this.color,
  });

  final bool isSyncing;
  final double size;
  final Color? color;

  @override
  State<AnimatedSyncIcon> createState() => _AnimatedSyncIconState();
}

class _AnimatedSyncIconState extends State<AnimatedSyncIcon>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    if (widget.isSyncing) {
      _controller.repeat();
    }
  }

  @override
  void didUpdateWidget(AnimatedSyncIcon oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isSyncing && !oldWidget.isSyncing) {
      _controller.repeat();
    } else if (!widget.isSyncing && oldWidget.isSyncing) {
      _controller.stop();
      _controller.reset();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RotationTransition(
      turns: _controller,
      child: Icon(
        Icons.sync,
        size: widget.size,
        color: widget.color ?? Theme.of(context).colorScheme.primary,
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OFFLINE MODE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

/// Wrapper that shows offline state and handles retry.
class OfflineAwareWidget extends ConsumerWidget {
  const OfflineAwareWidget({
    super.key,
    required this.onlineChild,
    this.offlineChild,
    this.offlineMessage = 'This feature requires an internet connection',
    this.showRetry = true,
    this.onRetry,
  });

  final Widget onlineChild;
  final Widget? offlineChild;
  final String offlineMessage;
  final bool showRetry;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final networkState = ref.watch(networkStateProvider);

    if (networkState.connectivity.isConnected) {
      return onlineChild;
    }

    return offlineChild ??
        _buildDefaultOfflineView(context);
  }

  Widget _buildDefaultOfflineView(BuildContext context) {
    final theme = Theme.of(context);
    
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.wifi_off,
                size: 48,
                color: theme.colorScheme.outline,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'You\'re Offline',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              offlineMessage,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.outline,
              ),
              textAlign: TextAlign.center,
            ),
            if (showRetry && onRetry != null) ...[
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAST SYNCED INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

/// Shows when data was last synced.
class LastSyncedIndicator extends ConsumerWidget {
  const LastSyncedIndicator({
    super.key,
    this.prefix = 'Last synced',
  });

  final String prefix;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final networkState = ref.watch(networkStateProvider);
    final lastSynced = networkState.lastSyncedAt;
    final theme = Theme.of(context);

    if (lastSynced == null) {
      return const SizedBox.shrink();
    }

    return Text(
      '$prefix ${_formatTime(lastSynced)}',
      style: theme.textTheme.bodySmall?.copyWith(
        color: theme.colorScheme.outline,
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inMinutes < 1) {
      return 'just now';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else {
      return '${diff.inDays}d ago';
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PENDING CHANGES BADGE
// ═══════════════════════════════════════════════════════════════════════════════

/// Badge showing pending changes count.
class PendingChangesBadge extends ConsumerWidget {
  const PendingChangesBadge({
    super.key,
    required this.child,
    this.showZero = false,
  });

  final Widget child;
  final bool showZero;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final networkState = ref.watch(networkStateProvider);
    final count = networkState.pendingCount;

    if (count == 0 && !showZero) {
      return child;
    }

    return Badge(
      label: Text('$count'),
      isLabelVisible: count > 0 || showZero,
      child: child,
    );
  }
}
