import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/sync/sync_models.dart';

/// Download Progress Item
///
/// Shows progress for a single download
class DownloadProgressItem extends StatelessWidget {
  final String title;
  final String? subtitle;
  final double progress;
  final DownloadState state;
  final VoidCallback? onCancel;
  final VoidCallback? onRetry;
  final VoidCallback? onPause;
  final VoidCallback? onResume;

  const DownloadProgressItem({
    super.key,
    required this.title,
    this.subtitle,
    required this.progress,
    required this.state,
    this.onCancel,
    this.onRetry,
    this.onPause,
    this.onResume,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _buildStateIcon(),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: theme.textTheme.titleSmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          subtitle!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.textTheme.bodySmall?.color
                                ?.withOpacity(0.7),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                _buildActions(),
              ],
            ),
            if (state == DownloadState.downloading ||
                state == DownloadState.paused) ...[
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: theme.colorScheme.surfaceContainerHighest,
                  valueColor: AlwaysStoppedAnimation(
                    state == DownloadState.paused
                        ? Colors.grey
                        : theme.colorScheme.primary,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${(progress * 100).toInt()}%',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStateIcon() {
    switch (state) {
      case DownloadState.queued:
        return const Icon(Icons.schedule, color: Colors.grey);
      case DownloadState.downloading:
        return const SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(strokeWidth: 2),
        );
      case DownloadState.paused:
        return const Icon(Icons.pause_circle, color: Colors.orange);
      case DownloadState.completed:
        return const Icon(Icons.check_circle, color: Colors.green);
      case DownloadState.failed:
        return const Icon(Icons.error, color: Colors.red);
      case DownloadState.cancelled:
        return const Icon(Icons.cancel, color: Colors.grey);
    }
  }

  Widget _buildActions() {
    switch (state) {
      case DownloadState.downloading:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (onPause != null)
              IconButton(
                icon: const Icon(Icons.pause, size: 20),
                onPressed: onPause,
                padding: const EdgeInsets.all(8),
              ),
            if (onCancel != null)
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: onCancel,
                padding: const EdgeInsets.all(8),
              ),
          ],
        );

      case DownloadState.paused:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (onResume != null)
              IconButton(
                icon: const Icon(Icons.play_arrow, size: 20),
                onPressed: onResume,
                padding: const EdgeInsets.all(8),
              ),
            if (onCancel != null)
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: onCancel,
                padding: const EdgeInsets.all(8),
              ),
          ],
        );

      case DownloadState.failed:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (onRetry != null)
              IconButton(
                icon: const Icon(Icons.refresh, size: 20),
                onPressed: onRetry,
                padding: const EdgeInsets.all(8),
              ),
            if (onCancel != null)
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: onCancel,
                padding: const EdgeInsets.all(8),
              ),
          ],
        );

      case DownloadState.completed:
        return const Icon(Icons.download_done, color: Colors.green);

      default:
        return const SizedBox.shrink();
    }
  }
}

/// Download state enum
enum DownloadState {
  queued,
  downloading,
  paused,
  completed,
  failed,
  cancelled,
}

/// Download Progress List
///
/// Shows a list of all active downloads
class DownloadProgressList extends StatelessWidget {
  final List<DownloadInfo> downloads;
  final void Function(String)? onCancel;
  final void Function(String)? onRetry;
  final void Function(String)? onPause;
  final void Function(String)? onResume;
  final VoidCallback? onCancelAll;

  const DownloadProgressList({
    super.key,
    required this.downloads,
    this.onCancel,
    this.onRetry,
    this.onPause,
    this.onResume,
    this.onCancelAll,
  });

  @override
  Widget build(BuildContext context) {
    if (downloads.isEmpty) {
      return const Center(
        child: Text('No active downloads'),
      );
    }

    final activeDownloads = downloads
        .where((d) =>
            d.state == DownloadState.downloading ||
            d.state == DownloadState.queued ||
            d.state == DownloadState.paused)
        .toList();

    return Column(
      children: [
        if (activeDownloads.length > 1)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${activeDownloads.length} active downloads'),
                if (onCancelAll != null)
                  TextButton(
                    onPressed: onCancelAll,
                    child: const Text('Cancel All'),
                  ),
              ],
            ),
          ),
        Expanded(
          child: ListView.builder(
            itemCount: downloads.length,
            itemBuilder: (context, index) {
              final download = downloads[index];
              return DownloadProgressItem(
                title: download.title,
                subtitle: download.subtitle,
                progress: download.progress,
                state: download.state,
                onCancel: onCancel != null ? () => onCancel!(download.id) : null,
                onRetry: onRetry != null ? () => onRetry!(download.id) : null,
                onPause: onPause != null ? () => onPause!(download.id) : null,
                onResume: onResume != null ? () => onResume!(download.id) : null,
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Download Info Model
class DownloadInfo {
  final String id;
  final String title;
  final String? subtitle;
  final double progress;
  final DownloadState state;
  final int? totalBytes;
  final int? downloadedBytes;
  final DateTime? startedAt;
  final String? errorMessage;

  const DownloadInfo({
    required this.id,
    required this.title,
    this.subtitle,
    required this.progress,
    required this.state,
    this.totalBytes,
    this.downloadedBytes,
    this.startedAt,
    this.errorMessage,
  });

  String get progressText {
    if (totalBytes != null && downloadedBytes != null) {
      final downloadedMB = downloadedBytes! / (1024 * 1024);
      final totalMB = totalBytes! / (1024 * 1024);
      return '${downloadedMB.toStringAsFixed(1)} / ${totalMB.toStringAsFixed(1)} MB';
    }
    return '${(progress * 100).toInt()}%';
  }
}

/// Download Progress Overlay
///
/// Shows a mini progress indicator that can be tapped to expand
class DownloadProgressOverlay extends StatefulWidget {
  final List<DownloadInfo> downloads;
  final VoidCallback? onTap;

  const DownloadProgressOverlay({
    super.key,
    required this.downloads,
    this.onTap,
  });

  @override
  State<DownloadProgressOverlay> createState() =>
      _DownloadProgressOverlayState();
}

class _DownloadProgressOverlayState extends State<DownloadProgressOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeDownloads = widget.downloads
        .where((d) =>
            d.state == DownloadState.downloading ||
            d.state == DownloadState.queued)
        .toList();

    if (activeDownloads.isEmpty) {
      return const SizedBox.shrink();
    }

    final totalProgress = activeDownloads.fold(
          0.0,
          (sum, d) => sum + d.progress,
        ) /
        activeDownloads.length;

    return ScaleTransition(
      scale: _scaleAnimation,
      child: GestureDetector(
        onTap: widget.onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  value: totalProgress,
                  strokeWidth: 2,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${activeDownloads.length} downloading',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Download Complete Notification
///
/// Shows a brief notification when a download completes
class DownloadCompleteNotification extends StatefulWidget {
  final String title;
  final VoidCallback? onView;
  final VoidCallback? onDismiss;
  final Duration autoDismissDuration;

  const DownloadCompleteNotification({
    super.key,
    required this.title,
    this.onView,
    this.onDismiss,
    this.autoDismissDuration = const Duration(seconds: 5),
  });

  @override
  State<DownloadCompleteNotification> createState() =>
      _DownloadCompleteNotificationState();
}

class _DownloadCompleteNotificationState
    extends State<DownloadCompleteNotification>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<Offset> _slideAnimation;
  Timer? _autoDismissTimer;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOut,
    ));
    _animationController.forward();

    _autoDismissTimer = Timer(widget.autoDismissDuration, () {
      _dismiss();
    });
  }

  @override
  void dispose() {
    _autoDismissTimer?.cancel();
    _animationController.dispose();
    super.dispose();
  }

  void _dismiss() {
    _animationController.reverse().then((_) {
      widget.onDismiss?.call();
    });
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slideAnimation,
      child: Material(
        color: Colors.green.shade100,
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                const Icon(Icons.download_done, color: Colors.green),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Download complete',
                        style: TextStyle(
                          fontWeight: FontWeight.w500,
                          color: Colors.green,
                        ),
                      ),
                      Text(
                        widget.title,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.green.shade800,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (widget.onView != null)
                  TextButton(
                    onPressed: widget.onView,
                    child: const Text('View'),
                  ),
                IconButton(
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: _dismiss,
                  padding: EdgeInsets.zero,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
