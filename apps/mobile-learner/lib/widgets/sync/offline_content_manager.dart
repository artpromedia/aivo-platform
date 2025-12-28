import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/database/local_database.dart';
import '../../core/network/connectivity_manager.dart';
import '../../core/sync/sync_engine.dart';
import 'download_progress.dart';

/// Offline Content Manager Screen
///
/// Allows users to manage offline content - download, view, and delete
class OfflineContentManager extends StatefulWidget {
  const OfflineContentManager({super.key});

  @override
  State<OfflineContentManager> createState() => _OfflineContentManagerState();
}

class _OfflineContentManagerState extends State<OfflineContentManager>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<OfflineLesson> _downloadedLessons = [];
  List<OfflineLesson> _availableLessons = [];
  List<DownloadInfo> _activeDownloads = [];
  bool _isLoading = true;
  String? _errorMessage;

  // Storage info
  int _usedStorageBytes = 0;
  int _totalStorageBytes = 0;

  StreamSubscription? _downloadSubscription;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadContent();
    _listenToDownloads();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _downloadSubscription?.cancel();
    super.dispose();
  }

  Future<void> _loadContent() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final db = LocalDatabase.instance;

      // Get downloaded lessons - convert Lesson to OfflineLesson
      final downloadedLessons = await db.getOfflineLessons();
      _downloadedLessons = downloadedLessons
          .map((lesson) => OfflineLesson(
                id: lesson.id,
                title: lesson.title,
                description: lesson.description,
                sizeBytes: 0,
                downloadedAt: DateTime.now(),
              ))
          .toList();

      // Get available lessons (would come from API normally)
      // For now, we'll use a placeholder
      _availableLessons = await _fetchAvailableLessons();

      // Get storage info
      final storageInfo = await db.getStorageInfo();
      _usedStorageBytes = storageInfo['usedBytes'] ?? 0;
      _totalStorageBytes = storageInfo['totalBytes'] ?? 0;

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to load content: $e';
      });
    }
  }

  Future<List<OfflineLesson>> _fetchAvailableLessons() async {
    // In a real implementation, this would fetch from an API
    // For now, return empty list
    return [];
  }

  void _listenToDownloads() {
    _downloadSubscription = SyncEngine.instance.downloadProgress.listen(
      (downloads) {
        setState(() {
          _activeDownloads = downloads;
        });
      },
    );
  }

  Future<void> _downloadLesson(OfflineLesson lesson) async {
    try {
      await SyncEngine.instance.downloadForOffline(lessonId: lesson.id);
      _loadContent();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to download: $e'),
            action: SnackBarAction(
              label: 'Retry',
              onPressed: () => _downloadLesson(lesson),
            ),
          ),
        );
      }
    }
  }

  Future<void> _deleteLesson(OfflineLesson lesson) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Offline Content'),
        content: Text(
          'Are you sure you want to delete "${lesson.title}" from offline storage?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await LocalDatabase.instance.deleteOfflineLesson(lesson.id);
        _loadContent();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Deleted offline content')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to delete: $e')),
          );
        }
      }
    }
  }

  Future<void> _clearAllOfflineContent() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear All Offline Content'),
        content: const Text(
          'This will delete all downloaded lessons. Your progress will not be lost.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Clear All'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await LocalDatabase.instance.clearOfflineContent();
        _loadContent();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Cleared all offline content')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to clear: $e')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Offline Content'),
        actions: [
          if (_downloadedLessons.isNotEmpty)
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'clear_all') {
                  _clearAllOfflineContent();
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'clear_all',
                  child: Row(
                    children: [
                      Icon(Icons.delete_sweep, size: 20),
                      SizedBox(width: 8),
                      Text('Clear All'),
                    ],
                  ),
                ),
              ],
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Downloaded'),
                  if (_downloadedLessons.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    Badge(label: Text('${_downloadedLessons.length}')),
                  ],
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Downloading'),
                  if (_activeDownloads.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    Badge(label: Text('${_activeDownloads.length}')),
                  ],
                ],
              ),
            ),
            const Tab(text: 'Available'),
          ],
        ),
      ),
      body: Column(
        children: [
          _buildStorageIndicator(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null
                    ? _buildErrorView()
                    : TabBarView(
                        controller: _tabController,
                        children: [
                          _buildDownloadedTab(),
                          _buildDownloadingTab(),
                          _buildAvailableTab(),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildStorageIndicator() {
    final usedMB = _usedStorageBytes / (1024 * 1024);
    final percentage = _totalStorageBytes > 0
        ? _usedStorageBytes / _totalStorageBytes
        : 0.0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Storage Used',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              Text(
                '${usedMB.toStringAsFixed(1)} MB',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: percentage,
              backgroundColor: Theme.of(context).colorScheme.surface,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          Text(_errorMessage ?? 'An error occurred'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadContent,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildDownloadedTab() {
    if (_downloadedLessons.isEmpty) {
      return _buildEmptyState(
        icon: Icons.download_done,
        title: 'No Downloaded Content',
        subtitle: 'Download lessons to access them offline',
        action: ElevatedButton(
          onPressed: () => _tabController.animateTo(2),
          child: const Text('Browse Available'),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: _downloadedLessons.length,
      itemBuilder: (context, index) {
        final lesson = _downloadedLessons[index];
        return OfflineLessonCard(
          lesson: lesson,
          isDownloaded: true,
          onDelete: () => _deleteLesson(lesson),
        );
      },
    );
  }

  Widget _buildDownloadingTab() {
    if (_activeDownloads.isEmpty) {
      return _buildEmptyState(
        icon: Icons.cloud_download,
        title: 'No Active Downloads',
        subtitle: 'Downloads will appear here',
      );
    }

    return DownloadProgressList(
      downloads: _activeDownloads,
      onCancel: (id) {
        SyncEngine.instance.cancelDownload(id);
      },
      onRetry: (id) {
        SyncEngine.instance.retryDownload(id);
      },
      onPause: (id) {
        SyncEngine.instance.pauseDownload(id);
      },
      onResume: (id) {
        SyncEngine.instance.resumeDownload(id);
      },
    );
  }

  Widget _buildAvailableTab() {
    // Check connectivity
    final isOffline =
        ConnectivityManager.instance.currentQuality == NetworkQuality.none;

    if (isOffline) {
      return _buildEmptyState(
        icon: Icons.cloud_off,
        title: 'You\'re Offline',
        subtitle: 'Connect to the internet to see available lessons',
      );
    }

    if (_availableLessons.isEmpty) {
      return _buildEmptyState(
        icon: Icons.library_books,
        title: 'All Caught Up!',
        subtitle: 'All your lessons are already downloaded',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: _availableLessons.length,
      itemBuilder: (context, index) {
        final lesson = _availableLessons[index];
        final isDownloaded = _downloadedLessons.any((d) => d.id == lesson.id);

        return OfflineLessonCard(
          lesson: lesson,
          isDownloaded: isDownloaded,
          onDownload: isDownloaded ? null : () => _downloadLesson(lesson),
        );
      },
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
    Widget? action,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 64,
              color: Theme.of(context).colorScheme.primary.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.color
                        ?.withOpacity(0.7),
                  ),
              textAlign: TextAlign.center,
            ),
            if (action != null) ...[
              const SizedBox(height: 24),
              action,
            ],
          ],
        ),
      ),
    );
  }
}

/// Offline Lesson Card
class OfflineLessonCard extends StatelessWidget {
  final OfflineLesson lesson;
  final bool isDownloaded;
  final VoidCallback? onDownload;
  final VoidCallback? onDelete;
  final VoidCallback? onTap;

  const OfflineLessonCard({
    super.key,
    required this.lesson,
    required this.isDownloaded,
    this.onDownload,
    this.onDelete,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Thumbnail
              Container(
                width: 80,
                height: 60,
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: lesson.thumbnailUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          lesson.thumbnailUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              const Icon(Icons.book, size: 32),
                        ),
                      )
                    : const Icon(Icons.book, size: 32),
              ),
              const SizedBox(width: 16),

              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      lesson.title,
                      style: theme.textTheme.titleSmall,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.storage,
                          size: 14,
                          color: theme.textTheme.bodySmall?.color,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _formatBytes(lesson.sizeBytes),
                          style: theme.textTheme.bodySmall,
                        ),
                        if (lesson.duration != null) ...[
                          const SizedBox(width: 12),
                          Icon(
                            Icons.timer,
                            size: 14,
                            color: theme.textTheme.bodySmall?.color,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _formatDuration(lesson.duration!),
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ],
                    ),
                    if (isDownloaded && lesson.downloadedAt != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Downloaded ${_formatDate(lesson.downloadedAt!)}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.green,
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              // Actions
              if (isDownloaded)
                IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: onDelete,
                  color: Colors.red,
                )
              else
                IconButton(
                  icon: const Icon(Icons.download),
                  onPressed: onDownload,
                  color: theme.colorScheme.primary,
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    if (minutes < 60) return '$minutes min';
    final hours = minutes ~/ 60;
    final remainingMinutes = minutes % 60;
    return '${hours}h ${remainingMinutes}m';
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) return 'today';
    if (difference.inDays == 1) return 'yesterday';
    if (difference.inDays < 7) return '${difference.inDays} days ago';
    return '${date.day}/${date.month}/${date.year}';
  }
}

/// Offline Lesson Model
class OfflineLesson {
  final String id;
  final String title;
  final String? description;
  final String? thumbnailUrl;
  final int sizeBytes;
  final Duration? duration;
  final DateTime? downloadedAt;
  final int? blockCount;

  const OfflineLesson({
    required this.id,
    required this.title,
    this.description,
    this.thumbnailUrl,
    required this.sizeBytes,
    this.duration,
    this.downloadedAt,
    this.blockCount,
  });

  factory OfflineLesson.fromJson(Map<String, dynamic> json) {
    return OfflineLesson(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      thumbnailUrl: json['thumbnail_url'] as String?,
      sizeBytes: json['size_bytes'] as int? ?? 0,
      duration: json['duration_seconds'] != null
          ? Duration(seconds: json['duration_seconds'] as int)
          : null,
      downloadedAt: json['downloaded_at'] != null
          ? DateTime.parse(json['downloaded_at'] as String)
          : null,
      blockCount: json['block_count'] as int?,
    );
  }
}

/// Auto-download Settings Widget
class AutoDownloadSettings extends StatelessWidget {
  final bool autoDownloadEnabled;
  final bool downloadOnWifiOnly;
  final int maxStorageMB;
  final ValueChanged<bool>? onAutoDownloadChanged;
  final ValueChanged<bool>? onWifiOnlyChanged;
  final ValueChanged<int>? onMaxStorageChanged;

  const AutoDownloadSettings({
    super.key,
    required this.autoDownloadEnabled,
    required this.downloadOnWifiOnly,
    required this.maxStorageMB,
    this.onAutoDownloadChanged,
    this.onWifiOnlyChanged,
    this.onMaxStorageChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SwitchListTile(
          title: const Text('Auto-download Lessons'),
          subtitle: const Text(
            'Automatically download upcoming lessons',
          ),
          value: autoDownloadEnabled,
          onChanged: onAutoDownloadChanged,
        ),
        if (autoDownloadEnabled) ...[
          SwitchListTile(
            title: const Text('Wi-Fi Only'),
            subtitle: const Text(
              'Only download when connected to Wi-Fi',
            ),
            value: downloadOnWifiOnly,
            onChanged: onWifiOnlyChanged,
          ),
          ListTile(
            title: const Text('Storage Limit'),
            subtitle: Text('Maximum $maxStorageMB MB for offline content'),
            trailing: DropdownButton<int>(
              value: maxStorageMB,
              items: [100, 250, 500, 1000, 2000]
                  .map((size) => DropdownMenuItem(
                        value: size,
                        child: Text('$size MB'),
                      ))
                  .toList(),
              onChanged: (value) {
                if (value != null) {
                  onMaxStorageChanged?.call(value);
                }
              },
            ),
          ),
        ],
      ],
    );
  }
}
