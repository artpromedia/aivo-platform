/// New Session Screen
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/providers.dart';
import '../../models/models.dart';

/// Screen for creating a new session.
class NewSessionScreen extends ConsumerStatefulWidget {
  const NewSessionScreen({super.key, this.preselectedStudentId});

  final String? preselectedStudentId;

  @override
  ConsumerState<NewSessionScreen> createState() => _NewSessionScreenState();
}

class _NewSessionScreenState extends ConsumerState<NewSessionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  
  String? _selectedClassId;
  SessionType _sessionType = SessionType.individual;
  List<String> _selectedStudentIds = [];
  String? _subject;
  DateTime? _scheduledAt;
  int _durationMinutes = 30;
  List<String> _objectives = [];

  @override
  void initState() {
    super.initState();
    if (widget.preselectedStudentId != null) {
      _selectedStudentIds = [widget.preselectedStudentId!];
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final classesState = ref.watch(classesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('New Session'),
        actions: [
          TextButton(
            onPressed: _createSession,
            child: const Text('Create'),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Title
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Session Title',
                border: OutlineInputBorder(),
              ),
              validator: (v) => v?.isEmpty == true ? 'Required' : null,
            ),
            const SizedBox(height: 16),

            // Session type
            DropdownButtonFormField<SessionType>(
              initialValue: _sessionType,
              decoration: const InputDecoration(
                labelText: 'Session Type',
                border: OutlineInputBorder(),
              ),
              items: SessionType.values.map((type) => DropdownMenuItem(
                value: type,
                child: Text(type.name),
              )).toList(),
              onChanged: (v) => setState(() => _sessionType = v!),
            ),
            const SizedBox(height: 16),

            // Class selection
            DropdownButtonFormField<String?>(
              initialValue: _selectedClassId,
              decoration: const InputDecoration(
                labelText: 'Class',
                border: OutlineInputBorder(),
              ),
              items: [
                const DropdownMenuItem(value: null, child: Text('No class')),
                ...classesState.classes.map((c) => DropdownMenuItem(
                  value: c.id,
                  child: Text(c.name),
                )),
              ],
              onChanged: (v) => setState(() => _selectedClassId = v),
            ),
            const SizedBox(height: 16),

            // Students (simplified - would have a proper picker)
            ListTile(
              title: const Text('Students'),
              subtitle: Text(
                _selectedStudentIds.isEmpty
                    ? 'No students selected'
                    : '${_selectedStudentIds.length} student(s) selected',
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: _showStudentPicker,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: BorderSide(color: Colors.grey.shade300),
              ),
            ),
            const SizedBox(height: 16),

            // Subject
            TextFormField(
              decoration: const InputDecoration(
                labelText: 'Subject (optional)',
                border: OutlineInputBorder(),
              ),
              onChanged: (v) => _subject = v.isEmpty ? null : v,
            ),
            const SizedBox(height: 16),

            // Schedule
            ListTile(
              title: const Text('Schedule'),
              subtitle: Text(
                _scheduledAt != null
                    ? '${_scheduledAt!.month}/${_scheduledAt!.day} at ${_scheduledAt!.hour}:${_scheduledAt!.minute.toString().padLeft(2, '0')}'
                    : 'Not scheduled (start now)',
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_scheduledAt != null)
                    IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () => setState(() => _scheduledAt = null),
                    ),
                  const Icon(Icons.calendar_today),
                ],
              ),
              onTap: _pickDateTime,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: BorderSide(color: Colors.grey.shade300),
              ),
            ),
            const SizedBox(height: 16),

            // Duration
            DropdownButtonFormField<int>(
              initialValue: _durationMinutes,
              decoration: const InputDecoration(
                labelText: 'Duration',
                border: OutlineInputBorder(),
              ),
              items: [15, 30, 45, 60, 90, 120].map((min) => DropdownMenuItem(
                value: min,
                child: Text('$min minutes'),
              )).toList(),
              onChanged: (v) => setState(() => _durationMinutes = v!),
            ),
            const SizedBox(height: 16),

            // Description
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 16),

            // Objectives
            Card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ListTile(
                    title: const Text('Objectives'),
                    trailing: IconButton(
                      icon: const Icon(Icons.add),
                      onPressed: _addObjective,
                    ),
                  ),
                  if (_objectives.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('No objectives added'),
                    )
                  else
                    ...List.generate(_objectives.length, (i) => ListTile(
                      leading: Text('${i + 1}.'),
                      title: Text(_objectives[i]),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => setState(() => _objectives.removeAt(i)),
                      ),
                    )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showStudentPicker() async {
    // Simplified - in real app would show a proper multi-select picker
    final students = await ref.read(studentRepositoryProvider).getStudents();
    
    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Column(
          children: [
            const ListTile(title: Text('Select Students')),
            Expanded(
              child: ListView.builder(
                itemCount: students.length,
                itemBuilder: (context, index) {
                  final student = students[index];
                  return CheckboxListTile(
                    title: Text('${student.firstName} ${student.lastName}'),
                    value: _selectedStudentIds.contains(student.id),
                    onChanged: (selected) {
                      setSheetState(() {
                        if (selected == true) {
                          _selectedStudentIds.add(student.id);
                        } else {
                          _selectedStudentIds.remove(student.id);
                        }
                      });
                      setState(() {});
                    },
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Done'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _scheduledAt ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_scheduledAt ?? DateTime.now()),
    );
    if (time == null) return;

    setState(() {
      _scheduledAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    });
  }

  void _addObjective() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Objective'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Objective',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                setState(() => _objectives.add(controller.text));
              }
              Navigator.pop(context);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _createSession() async {
    if (!_formKey.currentState!.validate()) return;

    final dto = CreateSessionDto(
      classId: _selectedClassId ?? '',
      sessionType: _sessionType,
      title: _titleController.text,
      description: _descriptionController.text.isNotEmpty
          ? _descriptionController.text
          : null,
      studentIds: _selectedStudentIds,
      subject: _subject,
      scheduledAt: _scheduledAt,
      durationMinutes: _durationMinutes,
      objectives: _objectives,
    );

    final session = await ref.read(sessionsProvider.notifier).createSession(dto);

    if (!mounted) return;

    // If no schedule, start immediately
    if (_scheduledAt == null) {
      await ref.read(sessionsProvider.notifier).startSession(session.id);
      context.pushReplacement('/sessions/${session.id}/live');
    } else {
      context.pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session scheduled')),
      );
    }
  }
}
