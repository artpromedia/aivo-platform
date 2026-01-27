import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../pin/pin_storage.dart';
import '../visual_learning_models.dart';
import '../visual_learning_service.dart';

/// Video Annotations Screen
///
/// View and annotate educational videos.
class VideoAnnotationsScreen extends StatefulWidget {
  final String learnerId;

  const VideoAnnotationsScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<VideoAnnotationsScreen> createState() => _VideoAnnotationsScreenState();
}

class _VideoAnnotationsScreenState extends State<VideoAnnotationsScreen> {
  VisualLearningService? _service;
  List<AnnotatedVideo> _videos = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeService();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    final token = await storage.read() ?? '';
    _service = VisualLearningService(accessToken: token);
    await _loadData();
  }

  Future<void> _loadData() async {
    if (_service == null) return;
    setState(() => _isLoading = true);

    try {
      final videos = await _service!.getAnnotatedVideos(widget.learnerId);
      if (mounted) {
        setState(() {
          _videos = videos;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    return '${minutes}:${secs.toString().padLeft(2, '0')}';
  }

  IconData _getAnnotationTypeIcon(AnnotationType type) {
    switch (type) {
      case AnnotationType.note:
        return Icons.note;
      case AnnotationType.highlight:
        return Icons.highlight;
      case AnnotationType.question:
        return Icons.help_outline;
      case AnnotationType.bookmark:
        return Icons.bookmark;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Video Annotations')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _videos.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.video_library,
                          size: 64, color: AivoBrand.gray.shade400),
                      const SizedBox(height: 16),
                      Text(
                        'No annotated videos yet',
                        style: TextStyle(
                          fontSize: 18,
                          color: AivoBrand.gray.shade600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text('Tap + to add a video'),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _videos.length,
                    itemBuilder: (context, index) {
                      final video = _videos[index];

                      return Card(
                        margin: const EdgeInsets.only(bottom: 16),
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          onTap: () => _openVideoPlayer(video),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Thumbnail placeholder
                              Container(
                                height: 160,
                                width: double.infinity,
                                color: const Color(0xFFF59E0B).withOpacity(0.1),
                                child: Stack(
                                  children: [
                                    const Center(
                                      child: Icon(
                                        Icons.play_circle_fill,
                                        size: 64,
                                        color: Color(0xFFF59E0B),
                                      ),
                                    ),
                                    Positioned(
                                      bottom: 8,
                                      right: 8,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.black87,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          _formatDuration(video.duration),
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      video.title,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        _AnnotationBadge(
                                          icon: Icons.note,
                                          count: video.annotations
                                              .where((a) =>
                                                  a.type == AnnotationType.note)
                                              .length,
                                        ),
                                        const SizedBox(width: 8),
                                        _AnnotationBadge(
                                          icon: Icons.bookmark,
                                          count: video.annotations
                                              .where((a) =>
                                                  a.type ==
                                                  AnnotationType.bookmark)
                                              .length,
                                        ),
                                        const SizedBox(width: 8),
                                        _AnnotationBadge(
                                          icon: Icons.help_outline,
                                          count: video.annotations
                                              .where((a) =>
                                                  a.type ==
                                                  AnnotationType.question)
                                              .length,
                                        ),
                                        const Spacer(),
                                        Text(
                                          '${video.chapters.length} chapters',
                                          style: TextStyle(
                                            color: AivoBrand.gray.shade500,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Add video from URL')),
          );
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  void _openVideoPlayer(AnnotatedVideo video) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _VideoPlayerScreen(video: video),
      ),
    );
  }
}

class _AnnotationBadge extends StatelessWidget {
  final IconData icon;
  final int count;

  const _AnnotationBadge({
    required this.icon,
    required this.count,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AivoBrand.gray.shade100,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AivoBrand.gray.shade600),
          const SizedBox(width: 4),
          Text(
            '$count',
            style: TextStyle(
              fontSize: 12,
              color: AivoBrand.gray.shade600,
            ),
          ),
        ],
      ),
    );
  }
}

class _VideoPlayerScreen extends StatelessWidget {
  final AnnotatedVideo video;

  const _VideoPlayerScreen({required this.video});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(video.title)),
      body: Column(
        children: [
          // Video player placeholder
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Container(
              color: Colors.black,
              child: const Center(
                child: Icon(
                  Icons.play_circle_outline,
                  size: 72,
                  color: Colors.white54,
                ),
              ),
            ),
          ),

          // Annotations list
          Expanded(
            child: video.annotations.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.note_add,
                            size: 48, color: AivoBrand.gray.shade400),
                        const SizedBox(height: 12),
                        Text(
                          'No annotations yet',
                          style: TextStyle(color: AivoBrand.gray.shade600),
                        ),
                        const SizedBox(height: 8),
                        ElevatedButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Add annotation')),
                            );
                          },
                          icon: const Icon(Icons.add),
                          label: const Text('Add Note'),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: video.annotations.length,
                    itemBuilder: (context, index) {
                      final annotation = video.annotations[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: Icon(
                            _getAnnotationIcon(annotation.type),
                            color: _parseColor(annotation.color),
                          ),
                          title: Text(annotation.content),
                          subtitle: Text(
                            _formatTimestamp(annotation.timestamp),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  IconData _getAnnotationIcon(AnnotationType type) {
    switch (type) {
      case AnnotationType.note:
        return Icons.note;
      case AnnotationType.highlight:
        return Icons.highlight;
      case AnnotationType.question:
        return Icons.help_outline;
      case AnnotationType.bookmark:
        return Icons.bookmark;
    }
  }

  Color _parseColor(String hex) {
    if (hex.startsWith('#')) {
      return Color(int.parse('FF${hex.substring(1)}', radix: 16));
    }
    return Colors.orange;
  }

  String _formatTimestamp(int seconds) {
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    return '${minutes}:${secs.toString().padLeft(2, '0')}';
  }
}
