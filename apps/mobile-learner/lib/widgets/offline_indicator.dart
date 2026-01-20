/// Offline Indicator Widget
///
/// A small, non-intrusive indicator that shows offline status.
/// Can be placed in app bars or other UI elements.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/offline/offline.dart' as common;
import 'package:flutter_common/theme/theme.dart';

import '../offline/offline.dart';
import 'connectivity_banner.dart';

/// A compact offline indicator for app bars and other compact spaces.
class OfflineIndicator extends ConsumerWidget {
  const OfflineIndicator({
    super.key,
    this.size = 24,
    this.showLabel = false,
    this.onTap,
  });

  /// The size of the icon.
  final double size;

  /// Whether to show a text label.
  final bool showLabel;

  /// Called when the indicator is tapped.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectivityState = ref.watch(connectivityStateProvider);

    return connectivityState.when(
      data: (state) {
        if (state == common.ConnectionState.online) {
          return const SizedBox.shrink();
        }

        return _buildIndicator(context, state);
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => _buildIndicator(context, common.ConnectionState.offline),
    );
  }

  Widget _buildIndicator(BuildContext context, common.ConnectionState state) {
    final theme = Theme.of(context);
    final isOffline = state == common.ConnectionState.offline;
    final color = isOffline ? AivoBrand.warning : Colors.amber;

    final icon = Icon(
      isOffline ? Icons.cloud_off : Icons.signal_wifi_bad,
      size: size,
      color: color.shade700,
    );

    if (!showLabel) {
      return GestureDetector(
        onTap: onTap,
        child: Tooltip(
          message: isOffline ? 'You\'re offline' : 'Slow connection',
          child: icon,
        ),
      );
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: color.shade100,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            icon,
            const SizedBox(width: 4),
            Text(
              isOffline ? 'Offline' : 'Slow',
              style: theme.textTheme.labelSmall?.copyWith(
                color: color.shade900,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A persistent offline indicator that shows in a fixed position.
class PersistentOfflineIndicator extends ConsumerWidget {
  const PersistentOfflineIndicator({
    super.key,
    this.position = OfflineIndicatorPosition.topRight,
    this.margin = const EdgeInsets.all(16),
  });

  /// The position of the indicator on screen.
  final OfflineIndicatorPosition position;

  /// The margin from the edge of the screen.
  final EdgeInsets margin;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectivityState = ref.watch(connectivityStateProvider);

    return connectivityState.when(
      data: (state) {
        if (state == common.ConnectionState.online) {
          return const SizedBox.shrink();
        }

        return _PositionedIndicator(
          position: position,
          margin: margin,
          child: _FloatingIndicator(state: state),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => _PositionedIndicator(
        position: position,
        margin: margin,
        child: _FloatingIndicator(state: common.ConnectionState.offline),
      ),
    );
  }
}

class _PositionedIndicator extends StatelessWidget {
  const _PositionedIndicator({
    required this.position,
    required this.margin,
    required this.child,
  });

  final OfflineIndicatorPosition position;
  final EdgeInsets margin;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: position.isTop ? margin.top : null,
      bottom: position.isBottom ? margin.bottom : null,
      left: position.isLeft ? margin.left : null,
      right: position.isRight ? margin.right : null,
      child: child,
    );
  }
}

class _FloatingIndicator extends StatelessWidget {
  const _FloatingIndicator({required this.state});

  final common.ConnectionState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isOffline = state == common.ConnectionState.offline;
    final color = isOffline ? AivoBrand.warning : Colors.amber;

    return Material(
      elevation: 4,
      borderRadius: BorderRadius.circular(20),
      color: color.shade100,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isOffline ? Icons.cloud_off : Icons.signal_wifi_bad,
              size: 16,
              color: color.shade800,
            ),
            const SizedBox(width: 6),
            Text(
              isOffline ? 'Offline' : 'Slow',
              style: theme.textTheme.labelMedium?.copyWith(
                color: color.shade900,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Position options for the persistent offline indicator.
enum OfflineIndicatorPosition {
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
}

extension on OfflineIndicatorPosition {
  bool get isTop => this == OfflineIndicatorPosition.topLeft || this == OfflineIndicatorPosition.topRight;
  bool get isBottom => this == OfflineIndicatorPosition.bottomLeft || this == OfflineIndicatorPosition.bottomRight;
  bool get isLeft => this == OfflineIndicatorPosition.topLeft || this == OfflineIndicatorPosition.bottomLeft;
  bool get isRight => this == OfflineIndicatorPosition.topRight || this == OfflineIndicatorPosition.bottomRight;
}

/// A sync status badge that shows pending sync count.
class SyncStatusBadge extends ConsumerWidget {
  const SyncStatusBadge({
    super.key,
    this.showWhenZero = false,
  });

  /// Whether to show the badge when there are no pending items.
  final bool showWhenZero;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncStatus = ref.watch(syncStatusProvider);

    return syncStatus.when(
      data: (status) {
        final pending = status.pendingEvents + status.pendingSessions;

        if (pending == 0 && !showWhenZero) {
          return const SizedBox.shrink();
        }

        return _buildBadge(context, status, pending);
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildBadge(BuildContext context, common.SyncStatusInfo status, int pending) {
    final theme = Theme.of(context);
    final isSyncing = status.state == common.SyncState.syncing;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isSyncing ? Colors.blue.shade100 : AivoBrand.gray.shade200,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isSyncing)
            const SizedBox(
              width: 12,
              height: 12,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            Icon(
              pending > 0 ? Icons.sync_problem : Icons.sync,
              size: 14,
              color: pending > 0 ? AivoBrand.sunshine.shade700 : AivoBrand.mint.shade700,
            ),
          const SizedBox(width: 4),
          Text(
            isSyncing ? 'Syncing...' : (pending > 0 ? '$pending pending' : 'Synced'),
            style: theme.textTheme.labelSmall?.copyWith(
              color: isSyncing ? Colors.blue.shade900 : AivoBrand.gray.shade800,
            ),
          ),
        ],
      ),
    );
  }
}
