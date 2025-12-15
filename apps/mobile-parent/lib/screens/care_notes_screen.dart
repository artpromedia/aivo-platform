/// Care Notes Screen
///
/// View and add care notes for team collaboration.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../collaboration/models.dart';
import '../collaboration/service.dart';

/// Screen showing care notes.
class CareNotesScreen extends ConsumerWidget {
  const CareNotesScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notesAsync = ref.watch(careNotesProvider(learnerId));

    return Scaffold(
      appBar: AppBar(
        title: Text("$learnerName's Notes"),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilterSheet(context),
          ),
        ],
      ),
      body: notesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Failed to load notes: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.refresh(careNotesProvider(learnerId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (notes) => _CareNotesList(
          learnerId: learnerId,
          notes: notes,
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddNoteSheet(context, learnerId, ref),
        icon: const Icon(Icons.add),
        label: const Text('Add Note'),
      ),
    );
  }

  void _showFilterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Filter Notes',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilterChip(
                  label: const Text('All'),
                  selected: true,
                  onSelected: (_) {},
                ),
                FilterChip(
                  label: const Text('Questions'),
                  selected: false,
                  onSelected: (_) {},
                ),
                FilterChip(
                  label: const Text('Updates'),
                  selected: false,
                  onSelected: (_) {},
                ),
                FilterChip(
                  label: const Text('Celebrations'),
                  selected: false,
                  onSelected: (_) {},
                ),
                FilterChip(
                  label: const Text('Follow-up'),
                  selected: false,
                  onSelected: (_) {},
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  void _showAddNoteSheet(BuildContext context, String learnerId, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: _AddNoteSheet(learnerId: learnerId),
      ),
    );
  }
}

class _CareNotesList extends StatelessWidget {
  const _CareNotesList({
    required this.learnerId,
    required this.notes,
  });

  final String learnerId;
  final List<CareNote> notes;

  @override
  Widget build(BuildContext context) {
    if (notes.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.note_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No notes yet',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Share observations, questions, or updates\nwith the care team',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    // Group notes by date
    final groupedNotes = <String, List<CareNote>>{};
    for (final note in notes) {
      final dateKey = _getDateKey(note.createdAt);
      groupedNotes.putIfAbsent(dateKey, () => []).add(note);
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
      itemCount: groupedNotes.length,
      itemBuilder: (context, index) {
        final dateKey = groupedNotes.keys.elementAt(index);
        final dateNotes = groupedNotes[dateKey]!;
        
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                dateKey,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[600],
                  fontSize: 13,
                ),
              ),
            ),
            ...dateNotes.map((note) => _CareNoteCard(
                  learnerId: learnerId,
                  note: note,
                )),
          ],
        );
      },
    );
  }

  String _getDateKey(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final noteDate = DateTime(date.year, date.month, date.day);

    if (noteDate == today) {
      return 'Today';
    } else if (noteDate == today.subtract(const Duration(days: 1))) {
      return 'Yesterday';
    } else if (now.difference(date).inDays < 7) {
      final weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return weekdays[date.weekday - 1];
    } else {
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[date.month - 1]} ${date.day}';
    }
  }
}

class _CareNoteCard extends ConsumerWidget {
  const _CareNoteCard({
    required this.learnerId,
    required this.note,
  });

  final String learnerId;
  final CareNote note;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showNoteDetail(context),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: _getNoteTypeColor(note.noteType),
                    child: Icon(
                      _getNoteTypeIcon(note.noteType),
                      size: 18,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          note.author.displayName,
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                        Row(
                          children: [
                            Text(
                              note.author.roleDisplayName,
                              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '• ${_formatTime(note.createdAt)}',
                              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Note type badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getNoteTypeColor(note.noteType).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      note.noteTypeDisplayName,
                      style: TextStyle(
                        fontSize: 11,
                        color: _getNoteTypeColor(note.noteType),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Title if present
              if (note.title != null) ...[
                Text(
                  note.title!,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 4),
              ],
              // Content
              Text(
                note.content,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              // Tags
              if (note.tags.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  children: note.tags.map((tag) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '#$tag',
                      style: TextStyle(fontSize: 11, color: Colors.grey[700]),
                    ),
                  )).toList(),
                ),
              ],
              // Footer
              const SizedBox(height: 12),
              Row(
                children: [
                  if (note.requiresFollowUp) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.flag, size: 12, color: Colors.orange[700]),
                          const SizedBox(width: 2),
                          Text(
                            'Follow-up needed',
                            style: TextStyle(fontSize: 11, color: Colors.orange[700]),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (note.isAcknowledged) ...[
                    Icon(Icons.check_circle, size: 14, color: Colors.green[600]),
                    const SizedBox(width: 4),
                    Text(
                      'Acknowledged',
                      style: TextStyle(fontSize: 11, color: Colors.green[600]),
                    ),
                  ],
                  const Spacer(),
                  if (!note.isAcknowledged)
                    TextButton.icon(
                      onPressed: () => _acknowledge(ref),
                      icon: const Icon(Icons.check, size: 16),
                      label: const Text('Acknowledge'),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getNoteTypeColor(CareNoteType type) {
    switch (type) {
      case CareNoteType.celebration:
        return Colors.amber[700]!;
      case CareNoteType.question:
        return Colors.blue;
      case CareNoteType.homeUpdate:
        return Colors.indigo;
      case CareNoteType.schoolUpdate:
        return Colors.green;
      case CareNoteType.therapyUpdate:
        return Colors.purple;
      case CareNoteType.strategyFeedback:
        return Colors.orange;
      case CareNoteType.observation:
        return Colors.teal;
      case CareNoteType.progressUpdate:
        return Colors.cyan;
      case CareNoteType.meetingNotes:
        return Colors.blueGrey;
    }
  }

  IconData _getNoteTypeIcon(CareNoteType type) {
    switch (type) {
      case CareNoteType.celebration:
        return Icons.celebration;
      case CareNoteType.question:
        return Icons.help_outline;
      case CareNoteType.homeUpdate:
        return Icons.home;
      case CareNoteType.schoolUpdate:
        return Icons.school;
      case CareNoteType.therapyUpdate:
        return Icons.psychology;
      case CareNoteType.strategyFeedback:
        return Icons.feedback;
      case CareNoteType.observation:
        return Icons.visibility;
      case CareNoteType.progressUpdate:
        return Icons.trending_up;
      case CareNoteType.meetingNotes:
        return Icons.meeting_room;
    }
  }

  String _formatTime(DateTime date) {
    final hour = date.hour > 12 ? date.hour - 12 : (date.hour == 0 ? 12 : date.hour);
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '$hour:${date.minute.toString().padLeft(2, '0')} $period';
  }

  void _showNoteDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(24),
          child: ListView(
            controller: scrollController,
            children: [
              // Header
              Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: _getNoteTypeColor(note.noteType),
                    child: Icon(
                      _getNoteTypeIcon(note.noteType),
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          note.author.displayName,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text(
                          '${note.author.roleDisplayName} • ${note.noteTypeDisplayName}',
                          style: const TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              if (note.title != null) ...[
                Text(
                  note.title!,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
              ],
              Text(
                note.content,
                style: const TextStyle(fontSize: 16, height: 1.5),
              ),
              if (note.tags.isNotEmpty) ...[
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: note.tags.map((tag) => Chip(
                    label: Text('#$tag'),
                    backgroundColor: Colors.grey[100],
                  )).toList(),
                ),
              ],
              const SizedBox(height: 24),
              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        // TODO: Reply
                      },
                      icon: const Icon(Icons.reply),
                      label: const Text('Reply'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        // TODO: Share
                      },
                      icon: const Icon(Icons.share),
                      label: const Text('Share'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _acknowledge(WidgetRef ref) async {
    try {
      final service = ref.read(collaborationServiceProvider);
      await service.acknowledgeCareNote(learnerId, note.id);
      ref.invalidate(careNotesProvider(learnerId));
    } catch (_) {
      // Silent fail
    }
  }
}

class _AddNoteSheet extends ConsumerStatefulWidget {
  const _AddNoteSheet({required this.learnerId});

  final String learnerId;

  @override
  ConsumerState<_AddNoteSheet> createState() => _AddNoteSheetState();
}

class _AddNoteSheetState extends ConsumerState<_AddNoteSheet> {
  final _contentController = TextEditingController();
  CareNoteType _selectedType = CareNoteType.homeUpdate;
  bool _requiresFollowUp = false;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Add Note',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Note type selection
          const Text(
            'Note Type',
            style: TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _NoteTypeChip(
                  type: CareNoteType.homeUpdate,
                  icon: Icons.home,
                  label: 'Home Update',
                  isSelected: _selectedType == CareNoteType.homeUpdate,
                  onSelected: () => setState(() => _selectedType = CareNoteType.homeUpdate),
                ),
                const SizedBox(width: 8),
                _NoteTypeChip(
                  type: CareNoteType.observation,
                  icon: Icons.visibility,
                  label: 'Observation',
                  isSelected: _selectedType == CareNoteType.observation,
                  onSelected: () => setState(() => _selectedType = CareNoteType.observation),
                ),
                const SizedBox(width: 8),
                _NoteTypeChip(
                  type: CareNoteType.question,
                  icon: Icons.help_outline,
                  label: 'Question',
                  isSelected: _selectedType == CareNoteType.question,
                  onSelected: () => setState(() => _selectedType = CareNoteType.question),
                ),
                const SizedBox(width: 8),
                _NoteTypeChip(
                  type: CareNoteType.celebration,
                  icon: Icons.celebration,
                  label: 'Celebration',
                  isSelected: _selectedType == CareNoteType.celebration,
                  onSelected: () => setState(() => _selectedType = CareNoteType.celebration),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Content
          TextField(
            controller: _contentController,
            decoration: const InputDecoration(
              labelText: 'Note',
              hintText: 'Share an update, observation, or question...',
              border: OutlineInputBorder(),
            ),
            maxLines: 4,
          ),
          const SizedBox(height: 12),
          // Follow-up toggle
          SwitchListTile(
            title: const Text('Requires follow-up'),
            subtitle: const Text('Flag this note for team attention'),
            value: _requiresFollowUp,
            onChanged: (value) => setState(() => _requiresFollowUp = value),
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: 16),
          // Submit button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSubmitting || _contentController.text.isEmpty
                  ? null
                  : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Share Note'),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    if (_contentController.text.isEmpty) return;

    setState(() => _isSubmitting = true);

    try {
      final service = ref.read(collaborationServiceProvider);
      await service.createCareNote(
        learnerId: widget.learnerId,
        noteType: _selectedType,
        content: _contentController.text,
        requiresFollowUp: _requiresFollowUp,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Note shared with the care team!'),
            backgroundColor: Colors.green,
          ),
        );
        ref.invalidate(careNotesProvider(widget.learnerId));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to share note: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }
}

class _NoteTypeChip extends StatelessWidget {
  const _NoteTypeChip({
    required this.type,
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onSelected,
  });

  final CareNoteType type;
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      avatar: Icon(
        icon,
        size: 18,
        color: isSelected
            ? Theme.of(context).colorScheme.onPrimary
            : Theme.of(context).colorScheme.primary,
      ),
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onSelected(),
    );
  }
}
