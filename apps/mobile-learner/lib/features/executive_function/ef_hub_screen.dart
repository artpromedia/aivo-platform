import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../config/environment.dart';
import '../../executive_function/executive_function_service.dart';
import '../../pin/pin_storage.dart';
import 'screens/task_manager_screen.dart';
import 'screens/visual_timer_screen.dart';
import 'screens/visual_schedule_screen.dart';
import 'screens/strategy_library_screen.dart';

/// Executive Function Hub Screen
///
/// Main entry point for executive function tools including:
/// - Task Manager with AI-powered breakdown
/// - Visual Timer (Pomodoro-style)
/// - Visual Schedule
/// - Strategy Library
class EFHubScreen extends StatefulWidget {
  final String learnerId;

  const EFHubScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<EFHubScreen> createState() => _EFHubScreenState();
}

class _EFHubScreenState extends State<EFHubScreen> {
  ExecutiveFunctionService? _efService;
  String _cachedToken = '';

  List<LearnerTask> _tasks = [];
  VisualSchedule? _schedule;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeService();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    _cachedToken = await storage.read() ?? '';

    _efService = ExecutiveFunctionService(accessToken: _cachedToken);
    await _loadData();
  }

  Future<void> _loadData() async {
    if (_efService == null) return;

    setState(() => _isLoading = true);

    try {
      final results = await Future.wait([
        _efService!.getTasks(),
        _efService!.getTodaySchedule(),
      ]);

      if (mounted) {
        setState(() {
          _tasks = results[0] as List<LearnerTask>;
          _schedule = results[1] as VisualSchedule?;
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
        title: const Text('Executive Function'),
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
                    _buildStatsSection(),
                    const SizedBox(height: 24),

                    // Today's Schedule Preview
                    if (_schedule != null) ...[
                      _buildSchedulePreview(),
                      const SizedBox(height: 24),
                    ],

                    // Tools Grid
                    _buildToolsGrid(),
                    const SizedBox(height: 24),

                    // Pending Tasks Preview
                    _buildTasksPreview(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildStatsSection() {
    final pendingTasks =
        _tasks.where((t) => t.status == TaskStatus.pending).length;
    final inProgressTasks =
        _tasks.where((t) => t.status == TaskStatus.inProgress).length;
    final completedToday = _tasks
        .where((t) =>
            t.status == TaskStatus.completed &&
            t.completedAt != null &&
            _isToday(t.completedAt!))
        .length;

    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Icons.pending_actions,
            label: 'To Do',
            value: '$pendingTasks',
            color: AivoBrand.warning,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            icon: Icons.play_circle,
            label: 'In Progress',
            value: '$inProgressTasks',
            color: AivoBrand.info,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            icon: Icons.check_circle,
            label: 'Done Today',
            value: '$completedToday',
            color: AivoBrand.success,
          ),
        ),
      ],
    );
  }

  Widget _buildSchedulePreview() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              "Today's Schedule",
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            TextButton(
              onPressed: () => _navigateTo(VisualScheduleScreen(
                learnerId: widget.learnerId,
              )),
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 80,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _schedule!.blocks.take(5).length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final block = _schedule!.blocks[index];
              return _ScheduleBlockChip(block: block);
            },
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
          'Tools',
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
              icon: Icons.task_alt,
              title: 'Task Manager',
              subtitle: 'Break down & track tasks',
              color: const Color(0xFF3B82F6),
              onTap: () => _navigateTo(TaskManagerScreen(
                learnerId: widget.learnerId,
              )),
            ),
            _ToolCard(
              icon: Icons.timer,
              title: 'Visual Timer',
              subtitle: 'Focus with Pomodoro',
              color: const Color(0xFF8B5CF6),
              onTap: () => _navigateTo(const VisualTimerScreen()),
            ),
            _ToolCard(
              icon: Icons.calendar_today,
              title: 'Visual Schedule',
              subtitle: "See today's plan",
              color: const Color(0xFF10B981),
              onTap: () => _navigateTo(VisualScheduleScreen(
                learnerId: widget.learnerId,
              )),
            ),
            _ToolCard(
              icon: Icons.lightbulb,
              title: 'Strategy Library',
              subtitle: 'Tips & techniques',
              color: const Color(0xFFF59E0B),
              onTap: () => _navigateTo(StrategyLibraryScreen(
                learnerId: widget.learnerId,
              )),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTasksPreview() {
    final pendingTasks = _tasks
        .where((t) =>
            t.status == TaskStatus.pending ||
            t.status == TaskStatus.inProgress)
        .take(3)
        .toList();

    if (pendingTasks.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Icon(
                Icons.check_circle_outline,
                size: 48,
                color: AivoBrand.success,
              ),
              const SizedBox(height: 12),
              Text(
                'All caught up!',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(
                'No pending tasks',
                style: TextStyle(color: AivoBrand.gray.shade600),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Upcoming Tasks',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            TextButton(
              onPressed: () => _navigateTo(TaskManagerScreen(
                learnerId: widget.learnerId,
              )),
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...pendingTasks.map((task) => _TaskPreviewCard(
              task: task,
              onTap: () => _navigateTo(TaskManagerScreen(
                learnerId: widget.learnerId,
              )),
            )),
      ],
    );
  }

  void _navigateTo(Widget screen) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => screen),
    );
  }

  bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
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
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: AivoBrand.gray.shade600,
              ),
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

class _ScheduleBlockChip extends StatelessWidget {
  final ScheduleBlock block;

  const _ScheduleBlockChip({required this.block});

  @override
  Widget build(BuildContext context) {
    final color = _parseColor(block.color) ?? AivoBrand.info;

    return Container(
      width: 140,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: block.isCompleted ? color.withOpacity(0.2) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: block.isCompleted ? color : AivoBrand.gray.shade300,
          width: block.isCompleted ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              if (block.isCompleted)
                Icon(Icons.check_circle, size: 16, color: color)
              else
                Icon(
                  _getIconForType(block.type),
                  size: 16,
                  color: color,
                ),
              const SizedBox(width: 4),
              Text(
                _formatTime(block.startTime),
                style: TextStyle(
                  fontSize: 11,
                  color: AivoBrand.gray.shade600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            block.title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              decoration:
                  block.isCompleted ? TextDecoration.lineThrough : null,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Color? _parseColor(String? colorString) {
    if (colorString == null) return null;
    if (colorString.startsWith('#')) {
      final hex = colorString.substring(1);
      if (hex.length == 6) {
        return Color(int.parse('FF$hex', radix: 16));
      }
    }
    return null;
  }

  IconData _getIconForType(String type) {
    switch (type.toUpperCase()) {
      case 'LEARNING':
        return Icons.school;
      case 'BREAK':
        return Icons.coffee;
      case 'ACTIVITY':
        return Icons.sports_esports;
      default:
        return Icons.event;
    }
  }

  String _formatTime(DateTime time) {
    final hour = time.hour > 12 ? time.hour - 12 : time.hour;
    final period = time.hour >= 12 ? 'PM' : 'AM';
    return '$hour:${time.minute.toString().padLeft(2, '0')} $period';
  }
}

class _TaskPreviewCard extends StatelessWidget {
  final LearnerTask task;
  final VoidCallback onTap;

  const _TaskPreviewCard({
    required this.task,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: _getPriorityColor(task.priority).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            _getPriorityIcon(task.priority),
            color: _getPriorityColor(task.priority),
          ),
        ),
        title: Text(
          task.title,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: task.dueDate != null
            ? Text(
                'Due: ${_formatDate(task.dueDate!)}',
                style: TextStyle(
                  color: task.isOverdue ? AivoBrand.error : AivoBrand.gray,
                  fontSize: 12,
                ),
              )
            : null,
        trailing: task.hasSubtasks
            ? Text(
                '${task.completedSubtasks}/${task.subtasks.length}',
                style: TextStyle(
                  color: AivoBrand.gray.shade600,
                  fontSize: 12,
                ),
              )
            : const Icon(Icons.chevron_right),
      ),
    );
  }

  Color _getPriorityColor(TaskPriority priority) {
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

  IconData _getPriorityIcon(TaskPriority priority) {
    switch (priority) {
      case TaskPriority.urgent:
        return Icons.priority_high;
      case TaskPriority.high:
        return Icons.arrow_upward;
      case TaskPriority.medium:
        return Icons.remove;
      case TaskPriority.low:
        return Icons.arrow_downward;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    if (date.year == now.year &&
        date.month == now.month &&
        date.day == now.day) {
      return 'Today';
    }
    return '${date.month}/${date.day}';
  }
}
