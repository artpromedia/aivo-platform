import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../pin/pin_storage.dart';
import '../visual_learning_models.dart';
import '../visual_learning_service.dart';

/// Visual Notebook Screen
///
/// Create and manage visual notebooks with sketches and drawings.
class VisualNotebookScreen extends StatefulWidget {
  final String learnerId;

  const VisualNotebookScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<VisualNotebookScreen> createState() => _VisualNotebookScreenState();
}

class _VisualNotebookScreenState extends State<VisualNotebookScreen> {
  VisualLearningService? _service;
  List<VisualNotebook> _notebooks = [];
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
      final notebooks = await _service!.getVisualNotebooks(widget.learnerId);
      if (mounted) {
        setState(() {
          _notebooks = notebooks;
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
    final subjectController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New Visual Notebook'),
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
            TextField(
              controller: subjectController,
              decoration: const InputDecoration(
                labelText: 'Subject (optional)',
                border: OutlineInputBorder(),
              ),
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
                await _service!.createVisualNotebook(
                  userId: widget.learnerId,
                  title: titleController.text,
                  description: descController.text,
                  subject: subjectController.text.isNotEmpty
                      ? subjectController.text
                      : null,
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
    );
  }

  IconData _getGridTypeIcon(GridType type) {
    switch (type) {
      case GridType.none:
        return Icons.crop_square;
      case GridType.dots:
        return Icons.grain;
      case GridType.lines:
        return Icons.format_list_numbered;
      case GridType.graph:
        return Icons.grid_on;
    }
  }

  Color _parseColor(String hex) {
    if (hex.startsWith('#')) {
      return Color(int.parse('FF${hex.substring(1)}', radix: 16));
    }
    return Colors.white;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Visual Notebooks')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notebooks.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.draw, size: 64, color: AivoBrand.gray.shade400),
                      const SizedBox(height: 16),
                      Text(
                        'No notebooks yet',
                        style: TextStyle(
                          fontSize: 18,
                          color: AivoBrand.gray.shade600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text('Tap + to create your first notebook'),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.8,
                    ),
                    itemCount: _notebooks.length,
                    itemBuilder: (context, index) {
                      final notebook = _notebooks[index];

                      return Card(
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          onTap: () => _openNotebook(notebook),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Cover
                              Expanded(
                                flex: 3,
                                child: Container(
                                  width: double.infinity,
                                  color: _parseColor(notebook.backgroundColor),
                                  child: Stack(
                                    children: [
                                      // Grid pattern preview
                                      if (notebook.gridType != GridType.none)
                                        Positioned.fill(
                                          child: CustomPaint(
                                            painter:
                                                _GridPainter(notebook.gridType),
                                          ),
                                        ),
                                      Center(
                                        child: Icon(
                                          _getGridTypeIcon(notebook.gridType),
                                          size: 48,
                                          color: const Color(0xFF3B82F6)
                                              .withOpacity(0.3),
                                        ),
                                      ),
                                      Positioned(
                                        bottom: 8,
                                        right: 8,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 6,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Colors.black54,
                                            borderRadius:
                                                BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            '${notebook.notes.length} pages',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 10,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              // Info
                              Expanded(
                                flex: 2,
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        notebook.title,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      if (notebook.subject != null)
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 6,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF3B82F6)
                                                .withOpacity(0.1),
                                            borderRadius:
                                                BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            notebook.subject!,
                                            style: const TextStyle(
                                              color: Color(0xFF3B82F6),
                                              fontSize: 10,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
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
        onPressed: _showCreateDialog,
        child: const Icon(Icons.add),
      ),
    );
  }

  void _openNotebook(VisualNotebook notebook) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _NotebookEditorScreen(notebook: notebook),
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  final GridType type;

  _GridPainter(this.type);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.grey.withOpacity(0.2)
      ..strokeWidth = 0.5;

    switch (type) {
      case GridType.dots:
        for (double x = 0; x < size.width; x += 20) {
          for (double y = 0; y < size.height; y += 20) {
            canvas.drawCircle(Offset(x, y), 1, paint);
          }
        }
        break;
      case GridType.lines:
        for (double y = 0; y < size.height; y += 20) {
          canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
        }
        break;
      case GridType.graph:
        for (double x = 0; x < size.width; x += 20) {
          canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
        }
        for (double y = 0; y < size.height; y += 20) {
          canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
        }
        break;
      case GridType.none:
        break;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _NotebookEditorScreen extends StatelessWidget {
  final VisualNotebook notebook;

  const _NotebookEditorScreen({required this.notebook});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(notebook.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_box),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Add new page')),
              );
            },
          ),
        ],
      ),
      body: notebook.notes.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.draw, size: 64, color: AivoBrand.gray.shade400),
                  const SizedBox(height: 16),
                  Text(
                    'Empty notebook',
                    style: TextStyle(
                      fontSize: 18,
                      color: AivoBrand.gray.shade600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ElevatedButton.icon(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Create first page')),
                      );
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Add First Page'),
                  ),
                ],
              ),
            )
          : PageView.builder(
              itemCount: notebook.notes.length,
              itemBuilder: (context, index) {
                return Container(
                  margin: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Stack(
                    children: [
                      if (notebook.gridType != GridType.none)
                        Positioned.fill(
                          child: CustomPaint(
                            painter: _GridPainter(notebook.gridType),
                          ),
                        ),
                      Center(
                        child: Text(
                          'Page ${index + 1}',
                          style: TextStyle(
                            color: AivoBrand.gray.shade400,
                            fontSize: 24,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
