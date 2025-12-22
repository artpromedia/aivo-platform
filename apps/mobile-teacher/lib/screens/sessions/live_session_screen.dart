/// Live Session Screen
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../providers/providers.dart';
import '../../models/models.dart';

/// Screen for managing an active session.
class LiveSessionScreen extends ConsumerStatefulWidget {
  const LiveSessionScreen({super.key, required this.sessionId});

  final String sessionId;

  @override
  ConsumerState<LiveSessionScreen> createState() => _LiveSessionScreenState();
}

class _LiveSessionScreenState extends ConsumerState<LiveSessionScreen> {
  final _noteController = TextEditingController();
  String? _selectedStudentId;
  List<String> _noteTags = [];

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(sessionProvider(widget.sessionId));

    return sessionAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: Center(child: Text('Error: $e')),
      ),
      data: (session) {
        if (session == null) {
          return Scaffold(
            appBar: AppBar(),
            body: const Center(child: Text('Session not found')),
          );
        }
        return _LiveSessionView(
          session: session,
          noteController: _noteController,
          selectedStudentId: _selectedStudentId,
          noteTags: _noteTags,
          onStudentSelected: (id) => setState(() => _selectedStudentId = id),
          onTagsChanged: (tags) => setState(() => _noteTags = tags),
          onAddNote: () => _addNote(session),
          onEndSession: () => _endSession(session),
        );
      },
    );
  }

  void _addNote(Session session) {
    if (_noteController.text.isEmpty) return;

    ref.read(sessionsProvider.notifier).addNote(
      sessionId: session.id,
      content: _noteController.text,
      studentId: _selectedStudentId,
      tags: _noteTags,
    );

    _noteController.clear();
    setState(() {
      _selectedStudentId = null;
      _noteTags = [];
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Note added')),
    );
  }

  void _endSession(Session session) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('End Session'),
        content: const Text('Are you sure you want to end this session?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(sessionsProvider.notifier).endSession(session.id);
              Navigator.pop(this.context);
            },
            child: const Text('End Session'),
          ),
        ],
      ),
    );
  }
}

class _LiveSessionView extends StatelessWidget {
  const _LiveSessionView({
    required this.session,
    required this.noteController,
    required this.selectedStudentId,
    required this.noteTags,
    required this.onStudentSelected,
    required this.onTagsChanged,
    required this.onAddNote,
    required this.onEndSession,
  });

  final Session session;
  final TextEditingController noteController;
  final String? selectedStudentId;
  final List<String> noteTags;
  final void Function(String?) onStudentSelected;
  final void Function(List<String>) onTagsChanged;
  final VoidCallback onAddNote;
  final VoidCallback onEndSession;

  @override
  Widget build(BuildContext context) {
    final duration = session.startedAt != null
        ? DateTime.now().difference(session.startedAt!)
        : Duration.zero;

    return Scaffold(
      appBar: AppBar(
        title: Text(session.title ?? 'Live Session'),
        actions: [
          TextButton.icon(
            onPressed: onEndSession,
            icon: const Icon(Icons.stop, color: Colors.red),
            label: const Text('End', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
      body: Column(
        children: [
          // Session timer
          Container(
            color: Colors.green.shade50,
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.timer, color: Colors.green),
                const SizedBox(width: 8),
                _SessionTimer(startTime: session.startedAt),
                const SizedBox(width: 24),
                Text(
                  '${session.studentIds.length} students',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ],
            ),
          ),

          // Quick note entry
          Padding(
            padding: const EdgeInsets.all(16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Quick Note',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: noteController,
                      decoration: const InputDecoration(
                        hintText: 'Add a note...',
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 3,
                    ),
                    const SizedBox(height: 12),
                    // Tag chips
                    Wrap(
                      spacing: 8,
                      children: ['Positive', 'Needs Support', 'Behavior', 'Progress']
                          .map((tag) => FilterChip(
                                label: Text(tag),
                                selected: noteTags.contains(tag),
                                onSelected: (selected) {
                                  if (selected) {
                                    onTagsChanged([...noteTags, tag]);
                                  } else {
                                    onTagsChanged(noteTags.where((t) => t != tag).toList());
                                  }
                                },
                              ))
                          .toList(),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String?>(
                            initialValue: selectedStudentId,
                            decoration: const InputDecoration(
                              labelText: 'Assign to student (optional)',
                              border: OutlineInputBorder(),
                            ),
                            items: [
                              const DropdownMenuItem(
                                value: null,
                                child: Text('All students'),
                              ),
                              ...session.studentIds.map((id) => DropdownMenuItem(
                                value: id,
                                child: Text('Student $id'),
                              )),
                            ],
                            onChanged: onStudentSelected,
                          ),
                        ),
                        const SizedBox(width: 12),
                        FilledButton.icon(
                          onPressed: onAddNote,
                          icon: const Icon(Icons.add),
                          label: const Text('Add'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Objectives checklist
          if (session.objectives.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const ListTile(
                      title: Text('Session Objectives'),
                      leading: Icon(Icons.check_circle_outline),
                    ),
                    ...session.objectives.map((obj) => CheckboxListTile(
                      title: Text(obj),
                      value: false, // Would track completion state
                      onChanged: (_) {},
                    )),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SessionTimer extends StatelessWidget {
  const _SessionTimer({required this.startTime});

  final DateTime? startTime;

  @override
  Widget build(BuildContext context) {
    if (startTime == null) {
      return const Text('Not started');
    }

    return StreamBuilder(
      stream: Stream.periodic(const Duration(seconds: 1)),
      builder: (context, _) {
        final duration = DateTime.now().difference(startTime!);
        final hours = duration.inHours;
        final minutes = duration.inMinutes.remainder(60);
        final seconds = duration.inSeconds.remainder(60);

        return Text(
          hours > 0
              ? '$hours:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}'
              : '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: Colors.green,
          ),
        );
      },
    );
  }
}
