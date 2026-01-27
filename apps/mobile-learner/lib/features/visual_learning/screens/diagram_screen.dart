import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../pin/pin_storage.dart';
import '../visual_learning_models.dart';
import '../visual_learning_service.dart';

/// Diagram Screen
///
/// Create and edit flowcharts and diagrams.
class DiagramScreen extends StatefulWidget {
  final String learnerId;

  const DiagramScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<DiagramScreen> createState() => _DiagramScreenState();
}

class _DiagramScreenState extends State<DiagramScreen> {
  VisualLearningService? _service;
  List<Diagram> _diagrams = [];
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
      final diagrams = await _service!.getDiagrams(widget.learnerId);
      if (mounted) {
        setState(() {
          _diagrams = diagrams;
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
    DiagramType selectedType = DiagramType.flowchart;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('New Diagram'),
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
              DropdownButtonFormField<DiagramType>(
                value: selectedType,
                decoration: const InputDecoration(
                  labelText: 'Type',
                  border: OutlineInputBorder(),
                ),
                items: DiagramType.values.map((t) {
                  return DropdownMenuItem(value: t, child: Text(_getTypeName(t)));
                }).toList(),
                onChanged: (v) => setDialogState(() => selectedType = v!),
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
                  await _service!.createDiagram(
                    userId: widget.learnerId,
                    title: titleController.text,
                    description: descController.text,
                    type: selectedType,
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

  String _getTypeName(DiagramType type) {
    switch (type) {
      case DiagramType.flowchart:
        return 'Flowchart';
      case DiagramType.sequence:
        return 'Sequence';
      case DiagramType.classD:
        return 'Class Diagram';
      case DiagramType.entityRelationship:
        return 'ER Diagram';
      case DiagramType.network:
        return 'Network';
      case DiagramType.custom:
        return 'Custom';
    }
  }

  IconData _getTypeIcon(DiagramType type) {
    switch (type) {
      case DiagramType.flowchart:
        return Icons.account_tree;
      case DiagramType.sequence:
        return Icons.swap_vert;
      case DiagramType.classD:
        return Icons.class_;
      case DiagramType.entityRelationship:
        return Icons.storage;
      case DiagramType.network:
        return Icons.lan;
      case DiagramType.custom:
        return Icons.edit;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Diagrams')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _diagrams.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.account_tree,
                          size: 64, color: AivoBrand.gray.shade400),
                      const SizedBox(height: 16),
                      Text(
                        'No diagrams yet',
                        style: TextStyle(
                          fontSize: 18,
                          color: AivoBrand.gray.shade600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text('Tap + to create your first diagram'),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _diagrams.length,
                    itemBuilder: (context, index) {
                      final diagram = _diagrams[index];

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: InkWell(
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Open ${diagram.title}')),
                            );
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981)
                                        .withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    _getTypeIcon(diagram.type),
                                    color: const Color(0xFF10B981),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        diagram.title,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${_getTypeName(diagram.type)} • ${diagram.shapes.length} shapes',
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
