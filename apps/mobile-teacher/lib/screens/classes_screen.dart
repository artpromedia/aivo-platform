/// Classes Screen
///
/// Main screen showing teacher's classes/groups.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../main.dart';

/// Class/group model.
class TeacherClass {
  const TeacherClass({
    required this.id,
    required this.name,
    required this.subject,
    required this.studentCount,
    required this.period,
    this.room,
    this.activeSessionId,
  });

  final String id;
  final String name;
  final String subject;
  final int studentCount;
  final String period;
  final String? room;
  final String? activeSessionId;

  factory TeacherClass.fromJson(Map<String, dynamic> json) {
    return TeacherClass(
      id: json['id'] as String,
      name: json['name'] as String,
      subject: json['subject'] as String,
      studentCount: json['studentCount'] as int,
      period: json['period'] as String,
      room: json['room'] as String?,
      activeSessionId: json['activeSessionId'] as String?,
    );
  }
}

/// Classes list state.
class ClassesState {
  const ClassesState({
    this.classes = const [],
    this.isLoading = false,
    this.error,
  });

  final List<TeacherClass> classes;
  final bool isLoading;
  final String? error;
}

/// Classes notifier.
class ClassesNotifier extends StateNotifier<ClassesState> {
  ClassesNotifier(this._ref) : super(const ClassesState());

  final Ref _ref;

  Future<void> loadClasses() async {
    final teacherId = _ref.read(teacherAuthProvider).teacherId;
    if (teacherId == null) return;

    state = const ClassesState(isLoading: true);

    try {
      final apiClient = AivoApiClient.instance;
      final response = await apiClient.get('/teacher-planning/teachers/$teacherId/classes');
      final data = response.data as List;
      
      final classes = data
          .map((json) => TeacherClass.fromJson(json as Map<String, dynamic>))
          .toList();

      state = ClassesState(classes: classes);
    } catch (e) {
      state = ClassesState(
        error: e is ApiException ? e.message : 'Failed to load classes',
      );
    }
  }

  Future<String?> startSession(String classId) async {
    try {
      final apiClient = AivoApiClient.instance;
      final response = await apiClient.post(
        '/session/classroom-sessions',
        data: {
          'classId': classId,
          'sessionType': 'class',
          'startedAt': DateTime.now().millisecondsSinceEpoch,
        },
      );
      
      final data = response.data as Map<String, dynamic>;
      final sessionId = data['sessionId'] as String;
      
      // Update the class in state
      final updatedClasses = state.classes.map((c) {
        if (c.id == classId) {
          return TeacherClass(
            id: c.id,
            name: c.name,
            subject: c.subject,
            studentCount: c.studentCount,
            period: c.period,
            room: c.room,
            activeSessionId: sessionId,
          );
        }
        return c;
      }).toList();
      
      state = ClassesState(classes: updatedClasses);
      return sessionId;
    } catch (e) {
      debugPrint('[ClassesNotifier] Error starting session: $e');
      return null;
    }
  }
}

final classesProvider =
    StateNotifierProvider<ClassesNotifier, ClassesState>((ref) {
  return ClassesNotifier(ref);
});

class ClassesScreen extends ConsumerStatefulWidget {
  const ClassesScreen({super.key});

  @override
  ConsumerState<ClassesScreen> createState() => _ClassesScreenState();
}

class _ClassesScreenState extends ConsumerState<ClassesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(classesProvider.notifier).loadClasses();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final authState = ref.watch(teacherAuthProvider);
    final classesState = ref.watch(classesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('My Classes'),
            if (authState.teacherName != null)
              Text(
                authState.teacherName!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(classesProvider.notifier).loadClasses(),
            tooltip: 'Refresh',
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push('/settings'),
            tooltip: 'Settings',
          ),
        ],
      ),
      body: _buildBody(classesState),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // Quick start session for next class
          _showQuickStartDialog();
        },
        icon: const Icon(Icons.play_arrow),
        label: const Text('Start Session'),
      ),
    );
  }

  Widget _buildBody(ClassesState state) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(state.error!),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: () => ref.read(classesProvider.notifier).loadClasses(),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (state.classes.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.class_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              'No classes assigned',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Contact your administrator to get started',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(classesProvider.notifier).loadClasses(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: state.classes.length,
        itemBuilder: (context, index) {
          final teacherClass = state.classes[index];
          return _ClassCard(
            teacherClass: teacherClass,
            onTap: () => context.push(
              '/class/${teacherClass.id}?name=${Uri.encodeComponent(teacherClass.name)}',
            ),
            onStartSession: () => _startSession(teacherClass),
          );
        },
      ),
    );
  }

  Future<void> _startSession(TeacherClass teacherClass) async {
    // If session already active, go to log
    if (teacherClass.activeSessionId != null) {
      context.push('/session/${teacherClass.activeSessionId}/log');
      return;
    }

    // Start new session
    final sessionId = await ref.read(classesProvider.notifier).startSession(teacherClass.id);
    if (sessionId != null && mounted) {
      context.push('/session/$sessionId/log');
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to start session')),
      );
    }
  }

  void _showQuickStartDialog() {
    final classes = ref.read(classesProvider).classes;
    
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Quick Start Session',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            const Divider(height: 1),
            ListView.builder(
              shrinkWrap: true,
              itemCount: classes.length,
              itemBuilder: (context, index) {
                final c = classes[index];
                return ListTile(
                  leading: CircleAvatar(
                    child: Text(c.period),
                  ),
                  title: Text(c.name),
                  subtitle: Text(c.subject),
                  trailing: c.activeSessionId != null
                      ? const Chip(label: Text('Active'))
                      : const Icon(Icons.play_arrow),
                  onTap: () {
                    Navigator.pop(context);
                    _startSession(c);
                  },
                );
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _ClassCard extends StatelessWidget {
  const _ClassCard({
    required this.teacherClass,
    required this.onTap,
    required this.onStartSession,
  });

  final TeacherClass teacherClass;
  final VoidCallback onTap;
  final VoidCallback onStartSession;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final hasActiveSession = teacherClass.activeSessionId != null;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Period indicator
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: hasActiveSession
                      ? colorScheme.primaryContainer
                      : colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      teacherClass.period,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: hasActiveSession
                            ? colorScheme.onPrimaryContainer
                            : null,
                      ),
                    ),
                    if (hasActiveSession)
                      Icon(
                        Icons.circle,
                        size: 8,
                        color: colorScheme.primary,
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 16),

              // Class info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      teacherClass.name,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.subject,
                          size: 16,
                          color: colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          teacherClass.subject,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Icon(
                          Icons.people_outline,
                          size: 16,
                          color: colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${teacherClass.studentCount} students',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                    if (teacherClass.room != null) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(
                            Icons.room_outlined,
                            size: 16,
                            color: colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Room ${teacherClass.room}',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

              // Session button
              FilledButton.tonal(
                onPressed: onStartSession,
                child: Text(hasActiveSession ? 'Continue' : 'Start'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
