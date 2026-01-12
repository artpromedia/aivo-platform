import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _baseUrl = String.fromEnvironment('EXECUTIVE_FUNCTION_BASE_URL', defaultValue: 'http://localhost:4031');
const _useEFMock = bool.fromEnvironment('USE_EF_MOCK', defaultValue: false);

/// Task status for learner tasks.
enum TaskStatus {
  pending('PENDING', 'To Do'),
  inProgress('IN_PROGRESS', 'In Progress'),
  completed('COMPLETED', 'Done'),
  skipped('SKIPPED', 'Skipped');

  const TaskStatus(this.code, this.displayName);
  final String code;
  final String displayName;
}

/// Task priority levels.
enum TaskPriority {
  low(0, 'Low'),
  medium(1, 'Medium'),
  high(2, 'High'),
  urgent(3, 'Urgent');

  const TaskPriority(this.value, this.displayName);
  final int value;
  final String displayName;

  static TaskPriority fromValue(int value) {
    return TaskPriority.values.firstWhere(
      (p) => p.value == value,
      orElse: () => TaskPriority.medium,
    );
  }
}

/// A task in the learner's task list.
class LearnerTask {
  const LearnerTask({
    required this.id,
    required this.title,
    required this.status,
    required this.priority,
    this.description,
    this.estimatedMinutes,
    this.actualMinutes,
    this.dueDate,
    this.completedAt,
    this.parentTaskId,
    this.subtasks = const [],
  });

  final String id;
  final String title;
  final String? description;
  final TaskStatus status;
  final TaskPriority priority;
  final int? estimatedMinutes;
  final int? actualMinutes;
  final DateTime? dueDate;
  final DateTime? completedAt;
  final String? parentTaskId;
  final List<LearnerTask> subtasks;

  bool get isOverdue => dueDate != null && dueDate!.isBefore(DateTime.now()) && status != TaskStatus.completed;
  bool get hasSubtasks => subtasks.isNotEmpty;
  int get completedSubtasks => subtasks.where((t) => t.status == TaskStatus.completed).length;

  factory LearnerTask.fromJson(Map<String, dynamic> json) {
    final subtasksJson = json['subtasks'] as List<dynamic>? ?? [];
    return LearnerTask(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString(),
      status: TaskStatus.values.firstWhere(
        (s) => s.code == json['status'],
        orElse: () => TaskStatus.pending,
      ),
      priority: TaskPriority.fromValue((json['priority'] as num?)?.toInt() ?? 1),
      estimatedMinutes: (json['estimatedMinutes'] as num?)?.toInt(),
      actualMinutes: (json['actualMinutes'] as num?)?.toInt(),
      dueDate: json['dueDate'] != null ? DateTime.tryParse(json['dueDate'].toString()) : null,
      completedAt: json['completedAt'] != null ? DateTime.tryParse(json['completedAt'].toString()) : null,
      parentTaskId: json['parentTaskId']?.toString(),
      subtasks: subtasksJson.map((s) => LearnerTask.fromJson(s as Map<String, dynamic>)).toList(),
    );
  }
}

/// A time block in a visual schedule.
class ScheduleBlock {
  const ScheduleBlock({
    required this.id,
    required this.title,
    required this.startTime,
    required this.endTime,
    required this.type,
    this.taskId,
    this.isCompleted = false,
    this.color,
    this.icon,
  });

  final String id;
  final String title;
  final DateTime startTime;
  final DateTime endTime;
  final String type;
  final String? taskId;
  final bool isCompleted;
  final String? color;
  final String? icon;

  int get durationMinutes => endTime.difference(startTime).inMinutes;

  factory ScheduleBlock.fromJson(Map<String, dynamic> json) {
    return ScheduleBlock(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      startTime: DateTime.tryParse(json['startTime']?.toString() ?? '') ?? DateTime.now(),
      endTime: DateTime.tryParse(json['endTime']?.toString() ?? '') ?? DateTime.now(),
      type: json['type']?.toString() ?? 'ACTIVITY',
      taskId: json['taskId']?.toString(),
      isCompleted: json['isCompleted'] == true,
      color: json['color']?.toString(),
      icon: json['icon']?.toString(),
    );
  }
}

/// A visual schedule for a day.
class VisualSchedule {
  const VisualSchedule({
    required this.id,
    required this.date,
    required this.blocks,
    required this.isComplete,
  });

  final String id;
  final DateTime date;
  final List<ScheduleBlock> blocks;
  final bool isComplete;

  int get completedBlocks => blocks.where((b) => b.isCompleted).length;
  int get totalBlocks => blocks.length;
  double get progressPercent => totalBlocks > 0 ? completedBlocks / totalBlocks : 0.0;

  factory VisualSchedule.fromJson(Map<String, dynamic> json) {
    final blocksJson = json['blocks'] as List<dynamic>? ?? [];
    return VisualSchedule(
      id: json['id']?.toString() ?? '',
      date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
      blocks: blocksJson.map((b) => ScheduleBlock.fromJson(b as Map<String, dynamic>)).toList(),
      isComplete: json['isComplete'] == true,
    );
  }
}

/// An EF strategy recommendation.
class EFStrategy {
  const EFStrategy({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    this.steps = const [],
    this.forSkill,
    this.difficulty,
  });

  final String id;
  final String title;
  final String description;
  final String category;
  final List<String> steps;
  final String? forSkill;
  final String? difficulty;

  factory EFStrategy.fromJson(Map<String, dynamic> json) {
    return EFStrategy(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      category: json['category']?.toString() ?? 'GENERAL',
      steps: (json['steps'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      forSkill: json['forSkill']?.toString(),
      difficulty: json['difficulty']?.toString(),
    );
  }
}

/// Exception thrown by executive function API operations.
class ExecutiveFunctionException implements Exception {
  const ExecutiveFunctionException(this.message, {this.code});
  final String message;
  final int? code;

  @override
  String toString() => message;
}

/// Service for Executive Function API calls.
class ExecutiveFunctionService {
  ExecutiveFunctionService({String? accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        ));

  final Dio _dio;

  // ═══════════════════════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get all tasks for the current learner.
  Future<List<LearnerTask>> getTasks({TaskStatus? status, TaskPriority? priority}) async {
    if (_useEFMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return _mockTasks();
    }

    try {
      final queryParams = <String, dynamic>{};
      if (status != null) queryParams['status'] = status.code;
      if (priority != null) queryParams['priority'] = priority.value;

      final response = await _dio.get<Map<String, dynamic>>(
        '/tasks',
        queryParameters: queryParams,
      );

      final tasksJson = response.data?['tasks'] as List<dynamic>? ?? [];
      return tasksJson.map((t) => LearnerTask.fromJson(t as Map<String, dynamic>)).toList();
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Create a new task.
  Future<LearnerTask> createTask({
    required String title,
    String? description,
    TaskPriority priority = TaskPriority.medium,
    int? estimatedMinutes,
    DateTime? dueDate,
    String? parentTaskId,
  }) async {
    if (_useEFMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return LearnerTask(
        id: 'task-${DateTime.now().millisecondsSinceEpoch}',
        title: title,
        description: description,
        status: TaskStatus.pending,
        priority: priority,
        estimatedMinutes: estimatedMinutes,
        dueDate: dueDate,
      );
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/tasks',
        data: {
          'title': title,
          if (description != null) 'description': description,
          'priority': priority.value,
          if (estimatedMinutes != null) 'estimatedMinutes': estimatedMinutes,
          if (dueDate != null) 'dueDate': dueDate.toIso8601String(),
          if (parentTaskId != null) 'parentTaskId': parentTaskId,
        },
      );

      final taskJson = response.data?['task'] as Map<String, dynamic>?;
      if (taskJson == null) {
        throw const ExecutiveFunctionException('No task returned');
      }

      return LearnerTask.fromJson(taskJson);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Update a task's status.
  Future<LearnerTask> updateTaskStatus({required String taskId, required TaskStatus status}) async {
    if (_useEFMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      final tasks = _mockTasks();
      return tasks.firstWhere((t) => t.id == taskId, orElse: () => tasks.first);
    }

    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        '/tasks/$taskId',
        data: {'status': status.code},
      );

      final taskJson = response.data?['task'] as Map<String, dynamic>?;
      if (taskJson == null) {
        throw const ExecutiveFunctionException('No task returned');
      }

      return LearnerTask.fromJson(taskJson);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Break down a task into subtasks using AI.
  Future<List<LearnerTask>> breakdownTask({required String taskId}) async {
    if (_useEFMock) {
      await Future.delayed(const Duration(milliseconds: 600));
      return [
        LearnerTask(
          id: 'subtask-1',
          title: 'Step 1: Gather materials',
          status: TaskStatus.pending,
          priority: TaskPriority.medium,
          parentTaskId: taskId,
          estimatedMinutes: 5,
        ),
        LearnerTask(
          id: 'subtask-2',
          title: 'Step 2: Review instructions',
          status: TaskStatus.pending,
          priority: TaskPriority.medium,
          parentTaskId: taskId,
          estimatedMinutes: 10,
        ),
        LearnerTask(
          id: 'subtask-3',
          title: 'Step 3: Complete the work',
          status: TaskStatus.pending,
          priority: TaskPriority.medium,
          parentTaskId: taskId,
          estimatedMinutes: 20,
        ),
      ];
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/tasks/$taskId/breakdown',
      );

      final subtasksJson = response.data?['subtasks'] as List<dynamic>? ?? [];
      return subtasksJson.map((t) => LearnerTask.fromJson(t as Map<String, dynamic>)).toList();
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEDULES
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get today's visual schedule.
  Future<VisualSchedule?> getTodaySchedule() async {
    if (_useEFMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return _mockSchedule();
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>('/schedules/today');

      final scheduleJson = response.data?['schedule'] as Map<String, dynamic>?;
      return scheduleJson != null ? VisualSchedule.fromJson(scheduleJson) : null;
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Mark a schedule block as completed.
  Future<ScheduleBlock> completeBlock({required String scheduleId, required String blockId}) async {
    if (_useEFMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return ScheduleBlock(
        id: blockId,
        title: 'Completed Block',
        startTime: DateTime.now(),
        endTime: DateTime.now().add(const Duration(minutes: 30)),
        type: 'ACTIVITY',
        isCompleted: true,
      );
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/schedules/$scheduleId/blocks/$blockId/complete',
      );

      final blockJson = response.data?['block'] as Map<String, dynamic>?;
      if (blockJson == null) {
        throw const ExecutiveFunctionException('No block returned');
      }

      return ScheduleBlock.fromJson(blockJson);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRATEGIES
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get recommended EF strategies.
  Future<List<EFStrategy>> getRecommendedStrategies({String? skill, String? situation}) async {
    if (_useEFMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return _mockStrategies();
    }

    try {
      final queryParams = <String, dynamic>{};
      if (skill != null) queryParams['skill'] = skill;
      if (situation != null) queryParams['situation'] = situation;

      final response = await _dio.get<Map<String, dynamic>>(
        '/strategies/recommended',
        queryParameters: queryParams,
      );

      final strategiesJson = response.data?['strategies'] as List<dynamic>? ?? [];
      return strategiesJson.map((s) => EFStrategy.fromJson(s as Map<String, dynamic>)).toList();
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get time estimation help.
  Future<Map<String, dynamic>> getTimeEstimate({required String taskDescription}) async {
    if (_useEFMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return {
        'estimatedMinutes': 25,
        'confidence': 0.75,
        'breakdown': [
          {'step': 'Getting started', 'minutes': 5},
          {'step': 'Main work', 'minutes': 15},
          {'step': 'Finishing up', 'minutes': 5},
        ],
        'tip': 'This task might take a bit longer if you need breaks.',
      };
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/strategies/time-estimate',
        data: {'taskDescription': taskDescription},
      );

      return response.data ?? {};
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  ExecutiveFunctionException _handleError(DioException err) {
    final statusCode = err.response?.statusCode;
    final message = err.response?.data is Map
        ? (err.response?.data as Map)['error']?.toString() ?? err.message
        : err.message ?? 'Network error';
    return ExecutiveFunctionException(message ?? 'Unknown error', code: statusCode);
  }

  List<LearnerTask> _mockTasks() {
    return [
      LearnerTask(
        id: 'task-1',
        title: 'Finish math homework',
        description: 'Complete pages 42-44',
        status: TaskStatus.inProgress,
        priority: TaskPriority.high,
        estimatedMinutes: 30,
        dueDate: DateTime.now().add(const Duration(hours: 3)),
      ),
      LearnerTask(
        id: 'task-2',
        title: 'Read chapter 5',
        status: TaskStatus.pending,
        priority: TaskPriority.medium,
        estimatedMinutes: 20,
      ),
      LearnerTask(
        id: 'task-3',
        title: 'Practice spelling words',
        status: TaskStatus.completed,
        priority: TaskPriority.low,
        estimatedMinutes: 10,
        completedAt: DateTime.now().subtract(const Duration(hours: 1)),
      ),
    ];
  }

  VisualSchedule _mockSchedule() {
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
      ],
      isComplete: false,
    );
  }

  List<EFStrategy> _mockStrategies() {
    return const [
      EFStrategy(
        id: 'strategy-1',
        title: 'Pomodoro Timer',
        description: 'Work for 25 minutes, then take a 5-minute break.',
        category: 'TIME_MANAGEMENT',
        steps: [
          'Set a timer for 25 minutes',
          'Work on your task until the timer rings',
          'Take a 5-minute break',
          'Repeat up to 4 times, then take a longer break',
        ],
        forSkill: 'ATTENTION',
      ),
      EFStrategy(
        id: 'strategy-2',
        title: 'Brain Dump',
        description: 'Write down everything on your mind to clear your head.',
        category: 'ORGANIZATION',
        steps: [
          'Get a piece of paper or open a note',
          'Write down everything you need to do',
          'Don\'t worry about order - just get it all out',
          'Then organize by priority',
        ],
        forSkill: 'WORKING_MEMORY',
      ),
    ];
  }
}

/// Provider for the executive function service.
final executiveFunctionServiceProvider =
    Provider<ExecutiveFunctionService>((ref) => ExecutiveFunctionService());
