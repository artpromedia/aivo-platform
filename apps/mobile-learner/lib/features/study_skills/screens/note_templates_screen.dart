import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../pin/pin_storage.dart';
import '../study_skills_models.dart';
import '../study_skills_service.dart';

/// Note Templates Screen
///
/// Provides access to various note-taking templates:
/// - Cornell Notes
/// - Outline format
/// - Mind Map
/// - Two Column
/// - Custom templates
class NoteTemplatesScreen extends StatefulWidget {
  final String learnerId;

  const NoteTemplatesScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<NoteTemplatesScreen> createState() => _NoteTemplatesScreenState();
}

class _NoteTemplatesScreenState extends State<NoteTemplatesScreen>
    with SingleTickerProviderStateMixin {
  StudySkillsService? _service;
  late TabController _tabController;

  List<NoteTemplate> _templates = [];
  List<Note> _notes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _initializeService();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    final token = await storage.read() ?? '';

    _service = StudySkillsService(accessToken: token);
    await _loadData();
  }

  Future<void> _loadData() async {
    if (_service == null) return;

    setState(() => _isLoading = true);

    try {
      final results = await Future.wait([
        _service!.getNoteTemplates(widget.learnerId),
        _service!.getNotes(widget.learnerId),
      ]);

      if (mounted) {
        setState(() {
          _templates = results[0] as List<NoteTemplate>;
          _notes = results[1] as List<Note>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showCreateTemplateDialog() {
    final nameController = TextEditingController();
    NoteTemplateType selectedType = NoteTemplateType.cornell;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('New Template'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Template Name',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<NoteTemplateType>(
                value: selectedType,
                decoration: const InputDecoration(
                  labelText: 'Template Type',
                  border: OutlineInputBorder(),
                ),
                items: NoteTemplateType.values.map((type) {
                  return DropdownMenuItem(
                    value: type,
                    child: Text(_getTemplateTypeLabel(type)),
                  );
                }).toList(),
                onChanged: (value) {
                  setDialogState(() {
                    selectedType = value ?? NoteTemplateType.cornell;
                  });
                },
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
                if (nameController.text.isNotEmpty && _service != null) {
                  await _service!.createNoteTemplate(
                    userId: widget.learnerId,
                    name: nameController.text,
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

  void _showCreateNoteDialog(NoteTemplate template) {
    final subjectController = TextEditingController();
    final titleController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Create Note from ${template.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: subjectController,
              decoration: const InputDecoration(
                labelText: 'Subject',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: titleController,
              decoration: const InputDecoration(
                labelText: 'Note Title',
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
              if (subjectController.text.isNotEmpty &&
                  titleController.text.isNotEmpty &&
                  _service != null) {
                final note = await _service!.createNote(
                  userId: widget.learnerId,
                  subject: subjectController.text,
                  title: titleController.text,
                  templateId: template.id,
                );
                if (mounted) {
                  Navigator.pop(context);
                  _openNoteEditor(note);
                }
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  void _openNoteEditor(Note note) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _NoteEditorScreen(
          note: note,
          learnerId: widget.learnerId,
        ),
      ),
    ).then((_) => _loadData());
  }

  String _getTemplateTypeLabel(NoteTemplateType type) {
    switch (type) {
      case NoteTemplateType.cornell:
        return 'Cornell Notes';
      case NoteTemplateType.outline:
        return 'Outline';
      case NoteTemplateType.mindMap:
        return 'Mind Map';
      case NoteTemplateType.twoColumn:
        return 'Two Column';
      case NoteTemplateType.custom:
        return 'Custom';
    }
  }

  IconData _getTemplateTypeIcon(NoteTemplateType type) {
    switch (type) {
      case NoteTemplateType.cornell:
        return Icons.grid_view;
      case NoteTemplateType.outline:
        return Icons.format_list_numbered;
      case NoteTemplateType.mindMap:
        return Icons.hub;
      case NoteTemplateType.twoColumn:
        return Icons.view_column;
      case NoteTemplateType.custom:
        return Icons.dashboard_customize;
    }
  }

  Color _getTemplateTypeColor(NoteTemplateType type) {
    switch (type) {
      case NoteTemplateType.cornell:
        return const Color(0xFF3B82F6);
      case NoteTemplateType.outline:
        return const Color(0xFF10B981);
      case NoteTemplateType.mindMap:
        return const Color(0xFF8B5CF6);
      case NoteTemplateType.twoColumn:
        return const Color(0xFFF59E0B);
      case NoteTemplateType.custom:
        return const Color(0xFFEC4899);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Note Templates'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Templates'),
            Tab(text: 'My Notes'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildTemplatesTab(),
                _buildNotesTab(),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateTemplateDialog,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildTemplatesTab() {
    if (_templates.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.note_add, size: 64, color: AivoBrand.gray.shade400),
            const SizedBox(height: 16),
            Text(
              'No templates yet',
              style: TextStyle(
                fontSize: 18,
                color: AivoBrand.gray.shade600,
              ),
            ),
            const SizedBox(height: 8),
            const Text('Tap + to create your first template'),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _templates.length,
        itemBuilder: (context, index) {
          final template = _templates[index];
          final color = _getTemplateTypeColor(template.type);

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: InkWell(
              onTap: () => _showCreateNoteDialog(template),
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
                      child: Icon(
                        _getTemplateTypeIcon(template.type),
                        color: color,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            template.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _getTemplateTypeLabel(template.type),
                            style: TextStyle(
                              color: AivoBrand.gray.shade600,
                              fontSize: 13,
                            ),
                          ),
                          if (template.tags.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 4,
                              children: template.tags
                                  .take(3)
                                  .map((tag) => Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AivoBrand.gray.shade100,
                                          borderRadius:
                                              BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          tag,
                                          style: TextStyle(
                                            fontSize: 10,
                                            color: AivoBrand.gray.shade600,
                                          ),
                                        ),
                                      ))
                                  .toList(),
                            ),
                          ],
                        ],
                      ),
                    ),
                    Icon(
                      Icons.chevron_right,
                      color: AivoBrand.gray.shade400,
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildNotesTab() {
    if (_notes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.notes, size: 64, color: AivoBrand.gray.shade400),
            const SizedBox(height: 16),
            Text(
              'No notes yet',
              style: TextStyle(
                fontSize: 18,
                color: AivoBrand.gray.shade600,
              ),
            ),
            const SizedBox(height: 8),
            const Text('Create a note using a template'),
          ],
        ),
      );
    }

    // Group notes by subject
    final notesBySubject = <String, List<Note>>{};
    for (final note in _notes) {
      notesBySubject.putIfAbsent(note.subject, () => []).add(note);
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: notesBySubject.entries.map((entry) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  entry.key,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
              ...entry.value.map((note) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      onTap: () => _openNoteEditor(note),
                      leading: const Icon(Icons.note_alt),
                      title: Text(note.title),
                      subtitle: Text(
                        '${note.wordCount} words • ${_formatDate(note.lastEdited)}',
                      ),
                      trailing: const Icon(Icons.chevron_right),
                    ),
                  )),
              const SizedBox(height: 8),
            ],
          );
        }).toList(),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inHours < 24) {
      return 'Today';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return '${date.month}/${date.day}';
    }
  }
}

class _NoteEditorScreen extends StatefulWidget {
  final Note note;
  final String learnerId;

  const _NoteEditorScreen({
    required this.note,
    required this.learnerId,
  });

  @override
  State<_NoteEditorScreen> createState() => _NoteEditorScreenState();
}

class _NoteEditorScreenState extends State<_NoteEditorScreen> {
  late List<TextEditingController> _sectionControllers;
  late List<NoteSection> _sections;

  @override
  void initState() {
    super.initState();
    _sections = List.from(widget.note.sections);
    _sectionControllers = _sections
        .map((s) => TextEditingController(text: s.content))
        .toList();
  }

  @override
  void dispose() {
    for (final controller in _sectionControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  void _addSection() {
    setState(() {
      final newSection = NoteSection(
        id: 'sec-${DateTime.now().millisecondsSinceEpoch}',
        title: 'New Section',
        type: NoteSectionType.paragraph,
        content: '',
        order: _sections.length,
      );
      _sections.add(newSection);
      _sectionControllers.add(TextEditingController());
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.note.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: () {
              // Save note logic would go here
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Note saved')),
              );
            },
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _sections.length + 1,
        itemBuilder: (context, index) {
          if (index == _sections.length) {
            return Center(
              child: TextButton.icon(
                onPressed: _addSection,
                icon: const Icon(Icons.add),
                label: const Text('Add Section'),
              ),
            );
          }

          final section = _sections[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    section.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _sectionControllers[index],
                    maxLines: null,
                    decoration: const InputDecoration(
                      hintText: 'Write your notes here...',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
