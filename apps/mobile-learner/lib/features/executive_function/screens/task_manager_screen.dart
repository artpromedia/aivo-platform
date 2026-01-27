import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../config/environment.dart';
import '../../../executive_function/executive_function_service.dart';
import '../../../pin/pin_storage.dart';

/// Task Manager Screen
///
/// Full-featured task management with:
/// - Task creation and editing
/// - AI-powered task breakdown
/// - Priority management
/// - Progress tracking
class TaskManagerScreen extends StatefulWidget {
  final String learnerId;

  const TaskManagerScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<TaskManagerScreen> createState() => _TaskManagerScreenState();
}

class _TaskManagerScreenState extends State<TaskManagerScreen>
    with SingleTickerProviderStateMixin {
  ExecutiveFunctionService? _efService;
  String _cachedToken = '';

  List<LearnerTask> _tasks = [];
  bool _isLoading = true;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _initializeService();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    _cachedToken = await storage.read() ?? '';

    _efService = ExecutiveFunctionService(accessToken: _cachedToken);
    await _loadTasks();
  }

  Future<void> _loadTasks() async {
    if (_efService == null) return;

    setState(() => _isLoading = true);

    try {
      final tasks = await _efService!.getTasks();
      if (mounted) {
        setState(() {
          _tasks = tasks;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load tasks')),
        );
      }
    }
  }

  List<LearnerTask> _getFilteredTasks(String filter) {
    switch (filter) {
      case 'todo':
        return _tasks.where((t) => t.status == TaskStatus.pending).toList();
      case 'in_progress':
        return _tasks.where((t) => t.status == TaskStatus.inProgress).toList();
      case 'completed':
        return _tasks.where((t) => t.status == TaskStatus.completed).toList();
      default:
        return _tasks;
    }
  }

  @override
  Widget build(BuildContext context) {
    final todoCount =
        _tasks.where((t) => t.status == TaskStatus.pending).length;
    final inProgressCount =
        _tasks.where((t) => t.status == TaskStatus.inProgress).length;
    final completedCount =
        _tasks.where((t) => t.status == TaskStatus.completed).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Task Manager'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: [
            Tab(text: 'All (${_tasks.length})'),
            Tab(text: 'To Do ($todoCount)'),
            Tab(text: 'In Progress ($inProgressCount)'),
            Tab(text: 'Completed ($completedCount)'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildTaskList(_getFilteredTasks('all')),
                _buildTaskList(_getFilteredTasks('todo')),
                _buildTaskList(_getFilteredTasks('in_progress')),
                _buildTaskList(_getFilteredTasks('completed')),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateTaskDialog,
        icon: const Icon(Icons.add),
        label: const Text('New Task'),
      ),
    );
  }

  Widget _buildTaskList(List<LearnerTask> tasks) {
    if (tasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.task_alt,
              size: 64,
              color: AivoBrand.gray.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'No tasks here',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Create a new task to get started',
              style: TextStyle(color: AivoBrand.gray.shade600),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTasks,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: tasks.length,
        itemBuilder: (context, index) {
          final task = tasks[index];
          return _TaskCard(
            task: task,
            onStatusChanged: (status) => _updateTaskStatus(task, status),
            onBreakdown: () => _showBreakdownDialog(task),
            onAIBreakdown: () => _showAIBreakdownDialog(task),
            onDelete: () => _deleteTask(task),
          );
        },
      ),
    );
  }

  void _showCreateTaskDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _CreateTaskSheet(
        onCreate: (title, description, priority, estimatedMinutes, dueDate) {
          _createTask(title, description, priority, estimatedMinutes, dueDate);
        },
      ),
    );
  }

  Future<void> _createTask(
    String title,
    String? description,
    TaskPriority priority,
    int? estimatedMinutes,
    DateTime? dueDate,
  ) async {
    if (_efService == null) return;

    try {
      await _efService!.createTask(
        title: title,
        description: description,
        priority: priority,
        estimatedMinutes: estimatedMinutes,
        dueDate: dueDate,
      );
      await _loadTasks();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task created!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to create task')),
        );
      }
    }
  }

  Future<void> _updateTaskStatus(LearnerTask task, TaskStatus status) async {
    if (_efService == null) return;

    try {
      await _efService!.updateTaskStatus(taskId: task.id, status: status);
      await _loadTasks();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update task')),
        );
      }
    }
  }

  Future<void> _deleteTask(LearnerTask task) async {
    // In a real app, this would call the API
    setState(() {
      _tasks.removeWhere((t) => t.id == task.id);
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Task deleted')),
      );
    }
  }

  void _showBreakdownDialog(LearnerTask task) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _ManualBreakdownSheet(
        task: task,
        onSave: (subtasks) {
          // In a real app, this would save the subtasks
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Added ${subtasks.length} steps to task')),
          );
          _loadTasks();
        },
      ),
    );
  }

  void _showAIBreakdownDialog(LearnerTask task) async {
    if (_efService == null) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text('AI is analyzing "${task.title}"...'),
          ],
        ),
      ),
    );

    try {
      final subtasks = await _efService!.breakdownTask(taskId: task.id);
      if (mounted) Navigator.pop(context);

      if (mounted) {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          builder: (context) => _AIBreakdownResultSheet(
            task: task,
            subtasks: subtasks,
            onAccept: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                    content: Text('Added ${subtasks.length} AI-generated steps')),
              );
              _loadTasks();
            },
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('AI breakdown failed. Try manual.')),
        );
      }
    }
  }
}

class _TaskCard extends StatelessWidget {
  final LearnerTask task;
  final ValueChanged<TaskStatus> onStatusChanged;
  final VoidCallback onBreakdown;
  final VoidCallback onAIBreakdown;
  final VoidCallback onDelete;

  const _TaskCard({
    required this.task,
    required this.onStatusChanged,
    required this.onBreakdown,
    required this.onAIBreakdown,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Checkbox(
                  value: task.status == TaskStatus.completed,
                  onChanged: (value) {
                    onStatusChanged(
                      value! ? TaskStatus.completed : TaskStatus.pending,
                    );
                  },
                ),
                Expanded(
                  child: Text(
                    task.title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      decoration: task.status == TaskStatus.completed
                          ? TextDecoration.lineThrough
                          : null,
                      color: task.status == TaskStatus.completed
                          ? AivoBrand.gray.shade500
                          : null,
                    ),
                  ),
                ),
                _PriorityChip(priority: task.priority),
              ],
            ),

            // Description
            if (task.description != null) ...[
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.only(left: 48),
                child: Text(
                  task.description!,
                  style: TextStyle(color: AivoBrand.gray.shade600),
                ),
              ),
            ],

            // Metadata
            Padding(
              padding: const EdgeInsets.only(left: 48, top: 8),
              child: Row(
                children: [
                  if (task.dueDate != null) ...[
                    Icon(
                      Icons.calendar_today,
                      size: 14,
                      color: task.isOverdue
                          ? AivoBrand.error
                          : AivoBrand.gray.shade500,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _formatDate(task.dueDate!),
                      style: TextStyle(
                        fontSize: 12,
                        color: task.isOverdue
                            ? AivoBrand.error
                            : AivoBrand.gray.shade500,
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  if (task.estimatedMinutes != null) ...[
                    Icon(
                      Icons.timer,
                      size: 14,
                      color: AivoBrand.gray.shade500,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${task.estimatedMinutes} min',
                      style: TextStyle(
                        fontSize: 12,
                        color: AivoBrand.gray.shade500,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Subtasks progress
            if (task.hasSubtasks) ...[
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.only(left: 48),
                child: Column(
                  children: [
                    LinearProgressIndicator(
                      value: task.completedSubtasks / task.subtasks.length,
                      backgroundColor: AivoBrand.gray.shade200,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${task.completedSubtasks}/${task.subtasks.length} steps completed',
                      style: TextStyle(
                        fontSize: 12,
                        color: AivoBrand.gray.shade600,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Actions
            if (task.status != TaskStatus.completed && !task.hasSubtasks) ...[
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.only(left: 40),
                child: Wrap(
                  spacing: 8,
                  children: [
                    OutlinedButton.icon(
                      onPressed: onAIBreakdown,
                      icon: const Text('✨'),
                      label: const Text('AI Breakdown'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF8B5CF6),
                        side: const BorderSide(color: Color(0xFF8B5CF6)),
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: onBreakdown,
                      icon: const Icon(Icons.account_tree, size: 16),
                      label: const Text('Manual'),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    if (date.year == now.year &&
        date.month == now.month &&
        date.day == now.day) {
      return 'Today';
    }
    final tomorrow = now.add(const Duration(days: 1));
    if (date.year == tomorrow.year &&
        date.month == tomorrow.month &&
        date.day == tomorrow.day) {
      return 'Tomorrow';
    }
    return '${date.month}/${date.day}';
  }
}

class _PriorityChip extends StatelessWidget {
  final TaskPriority priority;

  const _PriorityChip({required this.priority});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _getColor().withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_getEmoji(), style: const TextStyle(fontSize: 12)),
          const SizedBox(width: 4),
          Text(
            priority.displayName,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: _getColor(),
            ),
          ),
        ],
      ),
    );
  }

  Color _getColor() {
    switch (priority) {
      case TaskPriority.urgent:
        return AivoBrand.error;
      case TaskPriority.high:
        return const Color(0xFFF97316);
      case TaskPriority.medium:
        return AivoBrand.warning;
      case TaskPriority.low:
        return AivoBrand.success;
    }
  }

  String _getEmoji() {
    switch (priority) {
      case TaskPriority.urgent:
        return '🔴';
      case TaskPriority.high:
        return '🟠';
      case TaskPriority.medium:
        return '🟡';
      case TaskPriority.low:
        return '🟢';
    }
  }
}

class _CreateTaskSheet extends StatefulWidget {
  final void Function(
    String title,
    String? description,
    TaskPriority priority,
    int? estimatedMinutes,
    DateTime? dueDate,
  ) onCreate;

  const _CreateTaskSheet({required this.onCreate});

  @override
  State<_CreateTaskSheet> createState() => _CreateTaskSheetState();
}

class _CreateTaskSheetState extends State<_CreateTaskSheet> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _estimatedController = TextEditingController();
  TaskPriority _priority = TaskPriority.medium;
  DateTime? _dueDate;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _estimatedController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'New Task',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Task Title *',
                border: OutlineInputBorder(),
              ),
              autofocus: true,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<TaskPriority>(
                    value: _priority,
                    decoration: const InputDecoration(
                      labelText: 'Priority',
                      border: OutlineInputBorder(),
                    ),
                    items: TaskPriority.values
                        .map((p) => DropdownMenuItem(
                              value: p,
                              child: Text(p.displayName),
                            ))
                        .toList(),
                    onChanged: (value) {
                      setState(() => _priority = value!);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _estimatedController,
                    decoration: const InputDecoration(
                      labelText: 'Est. Minutes',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.number,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now(),
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                );
                if (date != null) {
                  setState(() => _dueDate = date);
                }
              },
              icon: const Icon(Icons.calendar_today),
              label: Text(_dueDate != null
                  ? '${_dueDate!.month}/${_dueDate!.day}/${_dueDate!.year}'
                  : 'Set Due Date'),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _titleController.text.isEmpty
                  ? null
                  : () {
                      widget.onCreate(
                        _titleController.text,
                        _descriptionController.text.isEmpty
                            ? null
                            : _descriptionController.text,
                        _priority,
                        _estimatedController.text.isEmpty
                            ? null
                            : int.tryParse(_estimatedController.text),
                        _dueDate,
                      );
                      Navigator.pop(context);
                    },
              child: const Text('Create Task'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ManualBreakdownSheet extends StatefulWidget {
  final LearnerTask task;
  final ValueChanged<List<String>> onSave;

  const _ManualBreakdownSheet({
    required this.task,
    required this.onSave,
  });

  @override
  State<_ManualBreakdownSheet> createState() => _ManualBreakdownSheetState();
}

class _ManualBreakdownSheetState extends State<_ManualBreakdownSheet> {
  final List<TextEditingController> _controllers = [
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
  ];

  @override
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  void _addStep() {
    setState(() {
      _controllers.add(TextEditingController());
    });
  }

  void _removeStep(int index) {
    if (_controllers.length > 1) {
      setState(() {
        _controllers[index].dispose();
        _controllers.removeAt(index);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Break Down Task',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'Split "${widget.task.title}" into smaller steps',
            style: TextStyle(color: AivoBrand.gray.shade600),
          ),
          const SizedBox(height: 16),
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: _controllers.length,
              itemBuilder: (context, index) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: Theme.of(context).primaryColor,
                        child: Text(
                          '${index + 1}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _controllers[index],
                          decoration: InputDecoration(
                            hintText: 'Step ${index + 1}',
                            border: const OutlineInputBorder(),
                            isDense: true,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => _removeStep(index),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          TextButton.icon(
            onPressed: _addStep,
            icon: const Icon(Icons.add),
            label: const Text('Add Another Step'),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              final subtasks = _controllers
                  .map((c) => c.text.trim())
                  .where((t) => t.isNotEmpty)
                  .toList();
              if (subtasks.isNotEmpty) {
                widget.onSave(subtasks);
              }
            },
            child: const Text('Save Breakdown'),
          ),
        ],
      ),
    );
  }
}

class _AIBreakdownResultSheet extends StatelessWidget {
  final LearnerTask task;
  final List<LearnerTask> subtasks;
  final VoidCallback onAccept;

  const _AIBreakdownResultSheet({
    required this.task,
    required this.subtasks,
    required this.onAccept,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Text('✨', style: TextStyle(fontSize: 24)),
              const SizedBox(width: 8),
              Text(
                'AI Suggested Steps',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...subtasks.asMap().entries.map((entry) {
            final index = entry.key;
            final subtask = entry.value;
            return ListTile(
              leading: CircleAvatar(
                radius: 14,
                backgroundColor: const Color(0xFF8B5CF6),
                child: Text(
                  '${index + 1}',
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                ),
              ),
              title: Text(subtask.title),
              subtitle: subtask.estimatedMinutes != null
                  ? Text('~${subtask.estimatedMinutes} min')
                  : null,
            );
          }),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: onAccept,
            child: const Text('Accept & Save'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Regenerate'),
          ),
        ],
      ),
    );
  }
}
