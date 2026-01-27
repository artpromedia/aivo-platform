import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../pin/pin_storage.dart';
import 'visual_learning_models.dart';
import 'visual_learning_service.dart';
import 'screens/mind_mapping_screen.dart';
import 'screens/diagram_screen.dart';
import 'screens/video_annotations_screen.dart';
import 'screens/visual_notebook_screen.dart';

/// Visual Learning Hub Screen
///
/// Main entry point for visual learning tools including:
/// - Mind Mapping
/// - Diagram Creation
/// - Video Annotations
/// - Visual Notebooks
class VisualLearningHubScreen extends StatefulWidget {
  final String learnerId;

  const VisualLearningHubScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<VisualLearningHubScreen> createState() =>
      _VisualLearningHubScreenState();
}

class _VisualLearningHubScreenState extends State<VisualLearningHubScreen> {
  VisualLearningService? _service;
  String _cachedToken = '';

  List<MindMap> _recentMindMaps = [];
  List<Diagram> _recentDiagrams = [];
  List<AnnotatedVideo> _recentVideos = [];
  List<VisualNotebook> _recentNotebooks = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeService();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    _cachedToken = await storage.read() ?? '';

    _service = VisualLearningService(accessToken: _cachedToken);
    await _loadData();
  }

  Future<void> _loadData() async {
    if (_service == null) return;

    setState(() => _isLoading = true);

    try {
      final results = await Future.wait([
        _service!.getMindMaps(widget.learnerId),
        _service!.getDiagrams(widget.learnerId),
        _service!.getAnnotatedVideos(widget.learnerId),
        _service!.getVisualNotebooks(widget.learnerId),
      ]);

      if (mounted) {
        setState(() {
          _recentMindMaps = (results[0] as List<MindMap>).take(3).toList();
          _recentDiagrams = (results[1] as List<Diagram>).take(3).toList();
          _recentVideos = (results[2] as List<AnnotatedVideo>).take(3).toList();
          _recentNotebooks =
              (results[3] as List<VisualNotebook>).take(3).toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Visual Learning'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Quick Stats
                    _buildQuickStats(),
                    const SizedBox(height: 24),

                    // Tools Grid
                    _buildToolsGrid(),
                    const SizedBox(height: 24),

                    // Recent Items
                    _buildRecentSection(
                      'Recent Mind Maps',
                      _recentMindMaps,
                      Icons.hub,
                      const Color(0xFF8B5CF6),
                      () => _navigateTo(MindMappingScreen(learnerId: widget.learnerId)),
                    ),
                    const SizedBox(height: 16),

                    _buildRecentSection(
                      'Recent Diagrams',
                      _recentDiagrams,
                      Icons.account_tree,
                      const Color(0xFF10B981),
                      () => _navigateTo(DiagramScreen(learnerId: widget.learnerId)),
                    ),
                    const SizedBox(height: 16),

                    _buildRecentSection(
                      'Annotated Videos',
                      _recentVideos,
                      Icons.video_library,
                      const Color(0xFFF59E0B),
                      () => _navigateTo(VideoAnnotationsScreen(learnerId: widget.learnerId)),
                    ),
                    const SizedBox(height: 16),

                    _buildRecentSection(
                      'Visual Notebooks',
                      _recentNotebooks,
                      Icons.draw,
                      const Color(0xFF3B82F6),
                      () => _navigateTo(VisualNotebookScreen(learnerId: widget.learnerId)),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildQuickStats() {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Icons.hub,
            label: 'Mind Maps',
            value: '${_recentMindMaps.length}',
            color: const Color(0xFF8B5CF6),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatCard(
            icon: Icons.account_tree,
            label: 'Diagrams',
            value: '${_recentDiagrams.length}',
            color: const Color(0xFF10B981),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatCard(
            icon: Icons.video_library,
            label: 'Videos',
            value: '${_recentVideos.length}',
            color: const Color(0xFFF59E0B),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatCard(
            icon: Icons.draw,
            label: 'Notebooks',
            value: '${_recentNotebooks.length}',
            color: const Color(0xFF3B82F6),
          ),
        ),
      ],
    );
  }

  Widget _buildToolsGrid() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Visual Tools',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.3,
          children: [
            _ToolCard(
              icon: Icons.hub,
              title: 'Mind Mapping',
              subtitle: 'Connect ideas visually',
              color: const Color(0xFF8B5CF6),
              onTap: () =>
                  _navigateTo(MindMappingScreen(learnerId: widget.learnerId)),
            ),
            _ToolCard(
              icon: Icons.account_tree,
              title: 'Diagrams',
              subtitle: 'Create flowcharts & more',
              color: const Color(0xFF10B981),
              onTap: () =>
                  _navigateTo(DiagramScreen(learnerId: widget.learnerId)),
            ),
            _ToolCard(
              icon: Icons.video_library,
              title: 'Video Notes',
              subtitle: 'Annotate video lessons',
              color: const Color(0xFFF59E0B),
              onTap: () =>
                  _navigateTo(VideoAnnotationsScreen(learnerId: widget.learnerId)),
            ),
            _ToolCard(
              icon: Icons.draw,
              title: 'Visual Notebook',
              subtitle: 'Sketch & draw notes',
              color: const Color(0xFF3B82F6),
              onTap: () =>
                  _navigateTo(VisualNotebookScreen(learnerId: widget.learnerId)),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRecentSection(
    String title,
    List<dynamic> items,
    IconData icon,
    Color color,
    VoidCallback onViewAll,
  ) {
    if (items.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            TextButton(
              onPressed: onViewAll,
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 80,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final item = items[index];
              String itemTitle = '';
              String itemSubtitle = '';

              if (item is MindMap) {
                itemTitle = item.title;
                itemSubtitle = '${item.nodes.length} nodes';
              } else if (item is Diagram) {
                itemTitle = item.title;
                itemSubtitle = item.type.name;
              } else if (item is AnnotatedVideo) {
                itemTitle = item.title;
                itemSubtitle = '${item.annotations.length} annotations';
              } else if (item is VisualNotebook) {
                itemTitle = item.title;
                itemSubtitle = '${item.notes.length} pages';
              }

              return Container(
                width: 160,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AivoBrand.gray.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(icon, size: 16, color: color),
                        const SizedBox(width: 4),
                        Text(
                          itemSubtitle,
                          style: TextStyle(
                            fontSize: 11,
                            color: color,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      itemTitle,
                      style: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 13,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  void _navigateTo(Widget screen) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => screen),
    ).then((_) => _loadData());
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: AivoBrand.gray.shade600,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ToolCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ToolCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const Spacer(),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 12,
                  color: AivoBrand.gray.shade600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
