/// Offline Indicator Widget - ND-3.2
///
/// Visual indicator showing online/offline status.
/// Provides feedback about sync status and offline capabilities.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../offline/offline_manager.dart';
import '../../../offline/offline_regulation_service.dart';

/// Compact offline status indicator for app bars
class OfflineIndicator extends ConsumerWidget {
  final bool showLabel;
  final double iconSize;

  const OfflineIndicator({
    super.key,
    this.showLabel = true,
    this.iconSize = 18,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offlineManager = ref.watch(offlineManagerProvider);

    return StreamBuilder<ConnectionStatus>(
      stream: offlineManager.connectionStream,
      initialData: offlineManager.connectionStatus,
      builder: (context, snapshot) {
        final status = snapshot.data ?? ConnectionStatus.limited;
        final isOnline = status == ConnectionStatus.online;

        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          padding: EdgeInsets.symmetric(
            horizontal: showLabel ? 12 : 8,
            vertical: 6,
          ),
          decoration: BoxDecoration(
            color: (isOnline ? Colors.green : Colors.orange).withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: (isOnline ? Colors.green : Colors.orange).withOpacity(0.3),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isOnline ? Icons.cloud_done : Icons.cloud_off,
                size: iconSize,
                color: isOnline ? Colors.green : Colors.orange,
              ),
              if (showLabel) ...[
                const SizedBox(width: 6),
                Text(
                  isOnline ? 'Online' : 'Offline',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: isOnline ? Colors.green : Colors.orange,
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

/// Full-width offline banner for top of screens
class OfflineBanner extends ConsumerWidget {
  final String? customMessage;
  final VoidCallback? onRetry;

  const OfflineBanner({
    super.key,
    this.customMessage,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offlineManager = ref.watch(offlineManagerProvider);

    return StreamBuilder<ConnectionStatus>(
      stream: offlineManager.connectionStream,
      initialData: offlineManager.connectionStatus,
      builder: (context, snapshot) {
        final status = snapshot.data ?? ConnectionStatus.limited;
        
        if (status == ConnectionStatus.online) {
          return const SizedBox.shrink();
        }

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          color: Colors.orange.shade50,
          child: SafeArea(
            bottom: false,
            child: Row(
              children: [
                const Icon(Icons.cloud_off, color: Colors.orange, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'You\'re offline',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.orange,
                        ),
                      ),
                      if (customMessage != null)
                        Text(
                          customMessage!,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.orange.shade700,
                          ),
                        )
                      else
                        Text(
                          'Activities still work! Changes will sync when you reconnect.',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.orange.shade700,
                          ),
                        ),
                    ],
                  ),
                ),
                if (onRetry != null)
                  IconButton(
                    onPressed: onRetry,
                    icon: const Icon(Icons.refresh, color: Colors.orange),
                    tooltip: 'Retry connection',
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Sync status indicator with progress
class SyncStatusIndicator extends ConsumerWidget {
  const SyncStatusIndicator({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offlineManager = ref.watch(offlineManagerProvider);

    return StreamBuilder<OfflineSyncStatus>(
      stream: offlineManager.syncStatusStream,
      initialData: offlineManager.syncStatus,
      builder: (context, snapshot) {
        final status = snapshot.data ?? OfflineSyncStatus.initial();

        if (!status.isSyncing && status.pendingCount == 0) {
          return const SizedBox.shrink();
        }

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (status.isSyncing) ...[
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    value: status.pendingCount > 0
                        ? status.syncedCount / (status.syncedCount + status.pendingCount)
                        : null,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Syncing... ${status.syncedCount}/${status.syncedCount + status.pendingCount}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.blue.shade700,
                  ),
                ),
              ] else if (status.pendingCount > 0) ...[
                Icon(Icons.sync_problem, size: 16, color: Colors.orange.shade700),
                const SizedBox(width: 8),
                Text(
                  '${status.pendingCount} pending sync',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.orange.shade700,
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

/// Offline-aware wrapper that shows different content based on connectivity
class OfflineAwareBuilder extends ConsumerWidget {
  final Widget Function(BuildContext context, bool isOnline) builder;
  final Widget? offlineWidget;

  const OfflineAwareBuilder({
    super.key,
    required this.builder,
    this.offlineWidget,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offlineManager = ref.watch(offlineManagerProvider);

    return StreamBuilder<ConnectionStatus>(
      stream: offlineManager.connectionStream,
      initialData: offlineManager.connectionStatus,
      builder: (context, snapshot) {
        final isOnline = snapshot.data == ConnectionStatus.online;
        
        if (!isOnline && offlineWidget != null) {
          return offlineWidget!;
        }
        
        return builder(context, isOnline);
      },
    );
  }
}

/// Download indicator for offline content
class OfflineDownloadButton extends StatefulWidget {
  final String contentId;
  final String label;
  final Future<void> Function() onDownload;
  final bool isDownloaded;

  const OfflineDownloadButton({
    super.key,
    required this.contentId,
    required this.label,
    required this.onDownload,
    this.isDownloaded = false,
  });

  @override
  State<OfflineDownloadButton> createState() => _OfflineDownloadButtonState();
}

class _OfflineDownloadButtonState extends State<OfflineDownloadButton> {
  bool _isDownloading = false;
  bool _isDownloaded = false;

  @override
  void initState() {
    super.initState();
    _isDownloaded = widget.isDownloaded;
  }

  @override
  Widget build(BuildContext context) {
    if (_isDownloaded) {
      return Chip(
        avatar: const Icon(Icons.check_circle, size: 18, color: Colors.green),
        label: Text('${widget.label} available offline'),
        backgroundColor: Colors.green.withOpacity(0.1),
        side: BorderSide.none,
      );
    }

    if (_isDownloading) {
      return Chip(
        avatar: const SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
        label: const Text('Downloading...'),
        backgroundColor: Colors.blue.withOpacity(0.1),
        side: BorderSide.none,
      );
    }

    return ActionChip(
      avatar: const Icon(Icons.download, size: 18),
      label: Text('Download ${widget.label}'),
      onPressed: _download,
    );
  }

  Future<void> _download() async {
    setState(() => _isDownloading = true);
    
    try {
      await widget.onDownload();
      if (mounted) {
        setState(() {
          _isDownloading = false;
          _isDownloaded = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isDownloading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Download failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

/// Floating action button that shows sync status
class SyncFloatingButton extends ConsumerWidget {
  final VoidCallback? onPressed;

  const SyncFloatingButton({
    super.key,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offlineManager = ref.watch(offlineManagerProvider);

    return StreamBuilder<OfflineSyncStatus>(
      stream: offlineManager.syncStatusStream,
      initialData: offlineManager.syncStatus,
      builder: (context, syncSnapshot) {
        return StreamBuilder<ConnectionStatus>(
          stream: offlineManager.connectionStream,
          initialData: offlineManager.connectionStatus,
          builder: (context, connSnapshot) {
            final syncStatus = syncSnapshot.data ?? OfflineSyncStatus.initial();
            final isOnline = connSnapshot.data == ConnectionStatus.online;

            if (!isOnline && syncStatus.pendingCount == 0) {
              return const SizedBox.shrink();
            }

            if (syncStatus.isSyncing) {
              return FloatingActionButton.extended(
                onPressed: null,
                backgroundColor: Colors.blue,
                icon: const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                ),
                label: const Text('Syncing...'),
              );
            }

            if (syncStatus.pendingCount > 0 && isOnline) {
              return FloatingActionButton.extended(
                onPressed: onPressed,
                backgroundColor: Colors.orange,
                icon: const Icon(Icons.sync),
                label: Text('Sync ${syncStatus.pendingCount}'),
              );
            }

            return const SizedBox.shrink();
          },
        );
      },
    );
  }
}
