/// Teacher Notes Screen
///
/// Screen for viewing and responding to teacher notes.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/communication_models.dart';
import '../providers/communication_provider.dart';

/// Screen showing teacher notes.
class TeacherNotesScreen extends ConsumerStatefulWidget {
  const TeacherNotesScreen({
    super.key,
    required this.childId,
  });

  final String childId;

  @override
  ConsumerState<TeacherNotesScreen> createState() => _TeacherNotesScreenState();
}

class _TeacherNotesScreenState extends ConsumerState<TeacherNotesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  TeacherNoteType? _selectedFilter;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Teacher Notes'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'All Notes'),
            Tab(text: 'Unread'),
          ],
          onTap: (index) {
            if (index == 1) {
              ref
                  .read(teacherNotesNotifierProvider(widget.childId).notifier)
                  .loadUnread();
            } else {
              ref
                  .read(teacherNotesNotifierProvider(widget.childId).notifier)
                  .filterByType(_selectedFilter);
            }
          },
        ),
        actions: [
          PopupMenuButton<TeacherNoteType?>(
            icon: const Icon(Icons.filter_list),
            onSelected: (type) {
              setState(() => _selectedFilter = type);
              ref
                  .read(teacherNotesNotifierProvider(widget.childId).notifier)
                  .filterByType(type);
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: null,
                child: Text('All Types'),
              ),
              ...TeacherNoteType.values.map((type) => PopupMenuItem(
                    value: type,
                    child: Text(_getTypeLabel(type)),
                  )),
            ],
          ),
        ],
      ),
      body: _NotesContent(childId: widget.childId),
    );
  }

  String _getTypeLabel(TeacherNoteType type) {
    switch (type) {
      case TeacherNoteType.general:
        return 'General';
      case TeacherNoteType.progressUpdate:
        return 'Progress Update';
      case TeacherNoteType.concern:
        return 'Concern';
      case TeacherNoteType.achievement:
        return 'Achievement';
      case TeacherNoteType.behavior:
        return 'Behavior';
      case TeacherNoteType.iepUpdate:
        return 'IEP Update';
      case TeacherNoteType.request:
        return 'Request';
      case TeacherNoteType.reminder:
        return 'Reminder';
    }
  }
}

/// Notes content widget.
class _NotesContent extends ConsumerWidget {
  const _NotesContent({required this.childId});

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notesAsync = ref.watch(teacherNotesNotifierProvider(childId));
    final theme = Theme.of(context);

    return notesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
      data: (notes) {
        if (notes.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.mail_outline,
                  size: 64,
                  color: theme.colorScheme.outline,
                ),
                const SizedBox(height: 16),
                Text(
                  'No notes yet',
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'Notes from teachers\nwill appear here',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () =>
              ref.read(teacherNotesNotifierProvider(childId).notifier).refresh(),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: notes.length,
            itemBuilder: (context, index) {
              final note = notes[index];
              return _NoteCard(
                note: note,
                onTap: () => _showNoteDetail(context, ref, note),
              );
            },
          ),
        );
      },
    );
  }

  void _showNoteDetail(BuildContext context, WidgetRef ref, TeacherNote note) {
    // Mark as read when opened
    if (!note.isRead) {
      ref
          .read(teacherNotesNotifierProvider(childId).notifier)
          .markAsRead(note.id);
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _NoteDetailSheet(
        childId: childId,
        note: note,
      ),
    );
  }
}

/// Note card widget.
class _NoteCard extends StatelessWidget {
  const _NoteCard({
    required this.note,
    required this.onTap,
  });

  final TeacherNote note;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (icon, color) = _getTypeInfo(note.type);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, color: color, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                note.title,
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (!note.isRead)
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Colors.blue,
                                  shape: BoxShape.circle,
                                ),
                              ),
                          ],
                        ),
                        Text(
                          '${note.teacherName} · ${note.subject}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.outline,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                note.content,
                style: theme.textTheme.bodySmall,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.schedule,
                    size: 14,
                    color: theme.colorScheme.outline,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _formatDate(note.createdAt),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.outline,
                    ),
                  ),
                  const Spacer(),
                  _PriorityBadge(priority: note.priority),
                ],
              ),
              if (note.actionRequired != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.amber.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.assignment, size: 16, color: Colors.amber),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Action required${note.actionDueDate != null ? ' by ${_formatDate(note.actionDueDate!)}' : ''}',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: Colors.amber[800],
                          ),
                        ),
                      ),
                      if (note.acknowledged == true)
                        const Icon(Icons.check_circle, size: 16, color: Colors.green),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  (IconData, Color) _getTypeInfo(TeacherNoteType type) {
    switch (type) {
      case TeacherNoteType.general:
        return (Icons.chat, Colors.blue);
      case TeacherNoteType.progressUpdate:
        return (Icons.trending_up, Colors.green);
      case TeacherNoteType.concern:
        return (Icons.warning, Colors.orange);
      case TeacherNoteType.achievement:
        return (Icons.emoji_events, Colors.amber);
      case TeacherNoteType.behavior:
        return (Icons.psychology, Colors.purple);
      case TeacherNoteType.iepUpdate:
        return (Icons.description, Colors.teal);
      case TeacherNoteType.request:
        return (Icons.help, Colors.indigo);
      case TeacherNoteType.reminder:
        return (Icons.notifications, Colors.pink);
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) {
      return 'Today';
    } else if (diff.inDays == 1) {
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else {
      return '${date.month}/${date.day}';
    }
  }
}

/// Priority badge.
class _PriorityBadge extends StatelessWidget {
  const _PriorityBadge({required this.priority});

  final NotePriority priority;

  @override
  Widget build(BuildContext context) {
    if (priority == NotePriority.normal || priority == NotePriority.low) {
      return const SizedBox.shrink();
    }

    final (color, label) = switch (priority) {
      NotePriority.high => (Colors.orange, 'High Priority'),
      NotePriority.urgent => (Colors.red, 'Urgent'),
      _ => (Colors.grey, ''),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 10,
        ),
      ),
    );
  }
}

/// Note detail bottom sheet.
class _NoteDetailSheet extends ConsumerStatefulWidget {
  const _NoteDetailSheet({
    required this.childId,
    required this.note,
  });

  final String childId;
  final TeacherNote note;

  @override
  ConsumerState<_NoteDetailSheet> createState() => _NoteDetailSheetState();
}

class _NoteDetailSheetState extends ConsumerState<_NoteDetailSheet> {
  final _responseController = TextEditingController();
  bool _isResponding = false;

  @override
  void dispose() {
    _responseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (icon, color) = _getTypeInfo(widget.note.type);

    return DraggableScrollableSheet(
      initialChildSize: 0.8,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return ListView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outline,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Header
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: color),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.note.title,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '${widget.note.teacherName} · ${widget.note.subject}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.outline,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _formatFullDate(widget.note.createdAt),
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
            const SizedBox(height: 24),

            // Content
            Text(
              widget.note.content,
              style: theme.textTheme.bodyMedium,
            ),

            // Action required
            if (widget.note.actionRequired != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.assignment, color: Colors.amber),
                        const SizedBox(width: 8),
                        Text(
                          'Action Required',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.amber[800],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(widget.note.actionRequired!),
                    if (widget.note.actionDueDate != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Due: ${_formatFullDate(widget.note.actionDueDate!)}',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: Colors.amber[800],
                        ),
                      ),
                    ],
                    if (widget.note.acknowledged != true) ...[
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () {
                            ref
                                .read(teacherNotesNotifierProvider(widget.childId).notifier)
                                .acknowledge(widget.note.id);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Acknowledged'),
                                backgroundColor: Colors.green,
                              ),
                            );
                          },
                          icon: const Icon(Icons.check),
                          label: const Text('Acknowledge'),
                        ),
                      ),
                    ] else
                      Row(
                        children: [
                          const Icon(Icons.check_circle, color: Colors.green, size: 18),
                          const SizedBox(width: 4),
                          Text(
                            'Acknowledged',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: Colors.green,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ],

            // Previous response
            if (widget.note.parentResponse != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Your Response',
                      style: theme.textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(widget.note.parentResponse!),
                  ],
                ),
              ),
            ],

            // Reply section
            if (widget.note.parentResponse == null) ...[
              const SizedBox(height: 24),
              Text(
                'Reply to Teacher',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _responseController,
                decoration: const InputDecoration(
                  hintText: 'Write your response...',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _isResponding ? null : _sendResponse,
                  icon: _isResponding
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send),
                  label: Text(_isResponding ? 'Sending...' : 'Send Response'),
                ),
              ),
            ],
            const SizedBox(height: 24),
          ],
        );
      },
    );
  }

  (IconData, Color) _getTypeInfo(TeacherNoteType type) {
    switch (type) {
      case TeacherNoteType.general:
        return (Icons.chat, Colors.blue);
      case TeacherNoteType.progressUpdate:
        return (Icons.trending_up, Colors.green);
      case TeacherNoteType.concern:
        return (Icons.warning, Colors.orange);
      case TeacherNoteType.achievement:
        return (Icons.emoji_events, Colors.amber);
      case TeacherNoteType.behavior:
        return (Icons.psychology, Colors.purple);
      case TeacherNoteType.iepUpdate:
        return (Icons.description, Colors.teal);
      case TeacherNoteType.request:
        return (Icons.help, Colors.indigo);
      case TeacherNoteType.reminder:
        return (Icons.notifications, Colors.pink);
    }
  }

  String _formatFullDate(DateTime date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final hour = date.hour > 12 ? date.hour - 12 : date.hour;
    final period = date.hour >= 12 ? 'PM' : 'AM';
    return '${months[date.month - 1]} ${date.day}, ${date.year} at $hour:${date.minute.toString().padLeft(2, '0')} $period';
  }

  Future<void> _sendResponse() async {
    if (_responseController.text.isEmpty) return;

    setState(() => _isResponding = true);

    try {
      await ref
          .read(teacherNotesNotifierProvider(widget.childId).notifier)
          .respond(widget.note.id, _responseController.text);

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Response sent'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isResponding = false);
      }
    }
  }
}
