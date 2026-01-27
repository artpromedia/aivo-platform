import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../config/environment.dart';
import '../../../executive_function/executive_function_service.dart';
import '../../../pin/pin_storage.dart';

/// Visual Schedule Screen
///
/// Displays the learner's daily schedule with:
/// - Time blocks visualization
/// - Progress tracking
/// - Block completion
class VisualScheduleScreen extends StatefulWidget {
  final String learnerId;

  const VisualScheduleScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<VisualScheduleScreen> createState() => _VisualScheduleScreenState();
}

class _VisualScheduleScreenState extends State<VisualScheduleScreen> {
  ExecutiveFunctionService? _efService;
  String _cachedToken = '';

  VisualSchedule? _schedule;
  bool _isLoading = true;
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _initializeService();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    _cachedToken = await storage.read() ?? '';

    _efService = ExecutiveFunctionService(accessToken: _cachedToken);
    await _loadSchedule();
  }

  Future<void> _loadSchedule() async {
    if (_efService == null) return;

    setState(() => _isLoading = true);

    try {
      final schedule = await _efService!.getTodaySchedule();
      if (mounted) {
        setState(() {
          _schedule = schedule;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _schedule = _getMockSchedule();
          _isLoading = false;
        });
      }
    }
  }

  VisualSchedule _getMockSchedule() {
    final now = DateTime.now();
    return VisualSchedule(
      id: 'schedule-1',
      date: now,
      blocks: [
        ScheduleBlock(
          id: 'block-1',
          title: 'Morning Reading',
          startTime: DateTime(now.year, now.month, now.day, 9, 0),
          endTime: DateTime(now.year, now.month, now.day, 9, 30),
          type: 'LEARNING',
          isCompleted: true,
          color: '#4CAF50',
          icon: 'book',
        ),
        ScheduleBlock(
          id: 'block-2',
          title: 'Math Practice',
          startTime: DateTime(now.year, now.month, now.day, 10, 0),
          endTime: DateTime(now.year, now.month, now.day, 10, 45),
          type: 'LEARNING',
          isCompleted: false,
          color: '#2196F3',
          icon: 'calculate',
        ),
        ScheduleBlock(
          id: 'block-3',
          title: 'Break Time',
          startTime: DateTime(now.year, now.month, now.day, 10, 45),
          endTime: DateTime(now.year, now.month, now.day, 11, 0),
          type: 'BREAK',
          isCompleted: false,
          color: '#FF9800',
          icon: 'sports_esports',
        ),
        ScheduleBlock(
          id: 'block-4',
          title: 'Science Activity',
          startTime: DateTime(now.year, now.month, now.day, 11, 0),
          endTime: DateTime(now.year, now.month, now.day, 11, 45),
          type: 'LEARNING',
          isCompleted: false,
          color: '#9C27B0',
          icon: 'science',
        ),
        ScheduleBlock(
          id: 'block-5',
          title: 'Lunch',
          startTime: DateTime(now.year, now.month, now.day, 12, 0),
          endTime: DateTime(now.year, now.month, now.day, 12, 45),
          type: 'BREAK',
          isCompleted: false,
          color: '#E91E63',
          icon: 'restaurant',
        ),
        ScheduleBlock(
          id: 'block-6',
          title: 'Creative Time',
          startTime: DateTime(now.year, now.month, now.day, 13, 0),
          endTime: DateTime(now.year, now.month, now.day, 14, 0),
          type: 'ACTIVITY',
          isCompleted: false,
          color: '#00BCD4',
          icon: 'palette',
        ),
      ],
      isComplete: false,
    );
  }

  Future<void> _completeBlock(ScheduleBlock block) async {
    if (_efService == null || _schedule == null) return;

    try {
      await _efService!
          .completeBlock(scheduleId: _schedule!.id, blockId: block.id);
      await _loadSchedule();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Completed: ${block.title}')),
        );
      }
    } catch (e) {
      // Update locally for demo purposes
      setState(() {
        final index = _schedule!.blocks.indexWhere((b) => b.id == block.id);
        if (index != -1) {
          final updatedBlocks = List<ScheduleBlock>.from(_schedule!.blocks);
          updatedBlocks[index] = ScheduleBlock(
            id: block.id,
            title: block.title,
            startTime: block.startTime,
            endTime: block.endTime,
            type: block.type,
            isCompleted: true,
            color: block.color,
            icon: block.icon,
          );
          _schedule = VisualSchedule(
            id: _schedule!.id,
            date: _schedule!.date,
            blocks: updatedBlocks,
            isComplete: _schedule!.isComplete,
          );
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Visual Schedule'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today),
            onPressed: _selectDate,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _schedule == null
              ? _buildEmptyState()
              : _buildScheduleView(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.calendar_today,
            size: 64,
            color: AivoBrand.gray.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            'No schedule for today',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'Your schedule will appear here',
            style: TextStyle(color: AivoBrand.gray.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleView() {
    final completedCount = _schedule!.blocks.where((b) => b.isCompleted).length;
    final totalCount = _schedule!.blocks.length;
    final progress = totalCount > 0 ? completedCount / totalCount : 0.0;

    return RefreshIndicator(
      onRefresh: _loadSchedule,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Date Header
            _buildDateHeader(),
            const SizedBox(height: 16),

            // Progress Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "Today's Progress",
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '$completedCount / $totalCount',
                          style: TextStyle(
                            color: AivoBrand.gray.shade600,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 12,
                        backgroundColor: AivoBrand.gray.shade200,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          progress == 1.0 ? AivoBrand.success : AivoBrand.info,
                        ),
                      ),
                    ),
                    if (progress == 1.0) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(
                            Icons.celebration,
                            color: AivoBrand.success,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'All done for today! Great job!',
                            style: TextStyle(
                              color: AivoBrand.success,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Timeline
            Text(
              'Schedule',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 12),
            ..._schedule!.blocks.asMap().entries.map((entry) {
              final index = entry.key;
              final block = entry.value;
              final isLast = index == _schedule!.blocks.length - 1;
              return _ScheduleBlockCard(
                block: block,
                isLast: isLast,
                onComplete: () => _completeBlock(block),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildDateHeader() {
    final now = DateTime.now();
    final isToday = _selectedDate.year == now.year &&
        _selectedDate.month == now.month &&
        _selectedDate.day == now.day;

    return Row(
      children: [
        IconButton(
          icon: const Icon(Icons.chevron_left),
          onPressed: () {
            setState(() {
              _selectedDate = _selectedDate.subtract(const Duration(days: 1));
            });
            _loadSchedule();
          },
        ),
        Expanded(
          child: Column(
            children: [
              Text(
                isToday ? 'Today' : _formatDate(_selectedDate),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              Text(
                _formatFullDate(_selectedDate),
                style: TextStyle(
                  color: AivoBrand.gray.shade600,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
        IconButton(
          icon: const Icon(Icons.chevron_right),
          onPressed: () {
            setState(() {
              _selectedDate = _selectedDate.add(const Duration(days: 1));
            });
            _loadSchedule();
          },
        ),
      ],
    );
  }

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 30)),
    );
    if (date != null) {
      setState(() => _selectedDate = date);
      _loadSchedule();
    }
  }

  String _formatDate(DateTime date) {
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return weekdays[date.weekday - 1];
  }

  String _formatFullDate(DateTime date) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}

class _ScheduleBlockCard extends StatelessWidget {
  final ScheduleBlock block;
  final bool isLast;
  final VoidCallback onComplete;

  const _ScheduleBlockCard({
    required this.block,
    required this.isLast,
    required this.onComplete,
  });

  @override
  Widget build(BuildContext context) {
    final color = _parseColor(block.color) ?? AivoBrand.info;
    final now = DateTime.now();
    final isCurrent = now.isAfter(block.startTime) && now.isBefore(block.endTime);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline
          SizedBox(
            width: 60,
            child: Column(
              children: [
                Text(
                  _formatTime(block.startTime),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isCurrent ? color : AivoBrand.gray.shade600,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: block.isCompleted ? color : Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: color,
                      width: 2,
                    ),
                  ),
                  child: block.isCompleted
                      ? const Icon(
                          Icons.check,
                          size: 8,
                          color: Colors.white,
                        )
                      : null,
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: block.isCompleted
                          ? color
                          : AivoBrand.gray.shade300,
                    ),
                  ),
              ],
            ),
          ),

          // Card
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Card(
                elevation: isCurrent ? 4 : 1,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: isCurrent
                      ? BorderSide(color: color, width: 2)
                      : BorderSide.none,
                ),
                child: InkWell(
                  onTap: block.isCompleted ? null : onComplete,
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            _getIconForType(block.type),
                            color: color,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                block.title,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  decoration: block.isCompleted
                                      ? TextDecoration.lineThrough
                                      : null,
                                  color: block.isCompleted
                                      ? AivoBrand.gray.shade500
                                      : null,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Text(
                                    '${block.durationMinutes} min',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: AivoBrand.gray.shade600,
                                    ),
                                  ),
                                  if (isCurrent) ...[
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: color,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Text(
                                        'NOW',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                        if (!block.isCompleted)
                          Checkbox(
                            value: false,
                            onChanged: (_) => onComplete(),
                            activeColor: color,
                          )
                        else
                          Icon(
                            Icons.check_circle,
                            color: color,
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
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
    final hour = time.hour > 12 ? time.hour - 12 : (time.hour == 0 ? 12 : time.hour);
    final period = time.hour >= 12 ? 'PM' : 'AM';
    return '$hour:${time.minute.toString().padLeft(2, '0')}\n$period';
  }
}
