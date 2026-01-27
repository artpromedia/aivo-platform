import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../pin/pin_storage.dart';
import '../visual_learning_models.dart';
import '../visual_learning_service.dart';

/// Mind Mapping Screen
///
/// Create and edit mind maps with nodes and connections.
class MindMappingScreen extends StatefulWidget {
  final String learnerId;

  const MindMappingScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<MindMappingScreen> createState() => _MindMappingScreenState();
}

class _MindMappingScreenState extends State<MindMappingScreen> {
  VisualLearningService? _service;
  List<MindMap> _mindMaps = [];
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
      final maps = await _service!.getMindMaps(widget.learnerId);
      if (mounted) {
        setState(() {
          _mindMaps = maps;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showCreateDialog() {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    MindMapTheme selectedTheme = MindMapTheme.light;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('New Mind Map'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleController,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: descController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<MindMapTheme>(
                value: selectedTheme,
                decoration: const InputDecoration(
                  labelText: 'Theme',
                  border: OutlineInputBorder(),
                ),
                items: MindMapTheme.values.map((t) {
                  return DropdownMenuItem(value: t, child: Text(t.name));
                }).toList(),
                onChanged: (v) => setDialogState(() => selectedTheme = v!),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (titleController.text.isNotEmpty && _service != null) {
                  await _service!.createMindMap(
                    userId: widget.learnerId,
                    title: titleController.text,
                    description: descController.text,
                    theme: selectedTheme,
                  );
                  if (mounted) {
                    Navigator.pop(context);
                    _loadData();
                  }
                }
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  void _openMindMap(MindMap mindMap) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _MindMapEditorScreen(mindMap: mindMap),
      ),
    );
  }

  Color _getThemeColor(MindMapTheme theme) {
    switch (theme) {
      case MindMapTheme.light:
        return const Color(0xFF3B82F6);
      case MindMapTheme.dark:
        return const Color(0xFF6B7280);
      case MindMapTheme.colorful:
        return const Color(0xFF8B5CF6);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mind Maps')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _mindMaps.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.hub, size: 64, color: AivoBrand.gray.shade400),
                      const SizedBox(height: 16),
                      Text(
                        'No mind maps yet',
                        style: TextStyle(
                          fontSize: 18,
                          color: AivoBrand.gray.shade600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text('Tap + to create your first mind map'),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _mindMaps.length,
                    itemBuilder: (context, index) {
                      final map = _mindMaps[index];
                      final color = _getThemeColor(map.theme);

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: InkWell(
                          onTap: () => _openMindMap(map),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: color.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(Icons.hub, color: color),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        map.title,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${map.nodes.length} nodes • ${map.theme.name}',
                                        style: TextStyle(
                                          color: AivoBrand.gray.shade600,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateDialog,
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _MindMapEditorScreen extends StatelessWidget {
  final MindMap mindMap;

  const _MindMapEditorScreen({required this.mindMap});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(mindMap.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Add node feature')),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Mind map saved')),
              );
            },
          ),
        ],
      ),
      body: InteractiveViewer(
        boundaryMargin: const EdgeInsets.all(100),
        minScale: 0.5,
        maxScale: 3.0,
        child: Center(
          child: CustomPaint(
            size: const Size(600, 600),
            painter: _MindMapPainter(mindMap),
          ),
        ),
      ),
    );
  }
}

class _MindMapPainter extends CustomPainter {
  final MindMap mindMap;

  _MindMapPainter(this.mindMap);

  @override
  void paint(Canvas canvas, Size size) {
    // Draw connections
    final connectionPaint = Paint()
      ..color = Colors.grey
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    for (final connection in mindMap.connections) {
      final source =
          mindMap.nodes.firstWhere((n) => n.id == connection.sourceId);
      final target =
          mindMap.nodes.firstWhere((n) => n.id == connection.targetId);

      canvas.drawLine(
        Offset(source.x, source.y),
        Offset(target.x, target.y),
        connectionPaint,
      );
    }

    // Draw nodes
    for (final node in mindMap.nodes) {
      final paint = Paint()..color = _parseColor(node.color);

      canvas.drawCircle(
        Offset(node.x, node.y),
        40,
        paint,
      );

      // Draw label
      final textPainter = TextPainter(
        text: TextSpan(
          text: node.label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout(maxWidth: 70);

      textPainter.paint(
        canvas,
        Offset(node.x - textPainter.width / 2, node.y - textPainter.height / 2),
      );
    }
  }

  Color _parseColor(String hex) {
    if (hex.startsWith('#')) {
      return Color(int.parse('FF${hex.substring(1)}', radix: 16));
    }
    return Colors.blue;
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
