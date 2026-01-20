/// Lesson Planning Screen
///
/// Comprehensive lesson planning tool with:
/// - AI-assisted lesson generation
/// - Standards alignment
/// - Resource attachment
/// - Differentiation options
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../content_library/models/content_models.dart';

/// Lesson template types
enum LessonTemplateType {
  directInstruction('Direct Instruction', Icons.school),
  inquiry('Inquiry-Based', Icons.search),
  projectBased('Project-Based', Icons.build),
  flippedClassroom('Flipped Classroom', Icons.flip),
  stationRotation('Station Rotation', Icons.rotate_right),
  workshop('Workshop Model', Icons.construction),
  socratic('Socratic Seminar', Icons.forum),
  custom('Custom', Icons.edit);

  const LessonTemplateType(this.label, this.icon);
  final String label;
  final IconData icon;
}

/// Lesson Planning Screen
class LessonPlanningScreen extends ConsumerStatefulWidget {
  const LessonPlanningScreen({
    super.key,
    required this.teacherId,
  });

  final String teacherId;

  @override
  ConsumerState<LessonPlanningScreen> createState() =>
      _LessonPlanningScreenState();
}

class _LessonPlanningScreenState extends ConsumerState<LessonPlanningScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<LessonPlan> _lessonPlans = [];
  final List<LessonPlan> _templates = [];
  bool _isLoading = true;
  int _weekOffset = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() {
      _lessonPlans.addAll(_getMockLessonPlans());
      _templates.addAll(_getMockTemplates());
      _isLoading = false;
    });
  }

  List<LessonPlan> _getMockLessonPlans() {
    return [
      LessonPlan(
        id: 'lp1',
        title: 'Introduction to Fractions',
        subject: SubjectArea.math,
        gradeLevel: GradeLevel.grade3,
        duration: 45,
        objectives: [
          'Understand what fractions represent',
          'Identify numerator and denominator',
          'Compare simple fractions with same denominator',
        ],
        standards: ['3.NF.A.1', '3.NF.A.2'],
        activities: [
          LessonActivity(
            id: 'act1',
            title: 'Fraction Introduction',
            description: 'Visual introduction using fraction circles',
            duration: 10,
            type: 'introduction',
          ),
          LessonActivity(
            id: 'act2',
            title: 'Guided Practice',
            description: 'Work through fraction problems together',
            duration: 15,
            type: 'practice',
          ),
          LessonActivity(
            id: 'act3',
            title: 'Independent Work',
            description: 'Students complete fraction worksheet',
            duration: 15,
            type: 'independent',
          ),
          LessonActivity(
            id: 'act4',
            title: 'Exit Ticket',
            description: 'Quick assessment of understanding',
            duration: 5,
            type: 'assessment',
          ),
        ],
        materials: ['Fraction circles', 'Worksheet', 'Whiteboard'],
        differentiations: {
          'approaching': 'Use visual aids and manipulatives',
          'onLevel': 'Standard worksheet',
          'advanced': 'Include mixed numbers introduction',
        },
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
        updatedAt: DateTime.now().subtract(const Duration(hours: 5)),
      ),
      LessonPlan(
        id: 'lp2',
        title: 'Parts of Speech Review',
        subject: SubjectArea.ela,
        gradeLevel: GradeLevel.grade4,
        duration: 50,
        objectives: [
          'Identify nouns, verbs, and adjectives in sentences',
          'Use parts of speech correctly in writing',
        ],
        standards: ['L.4.1'],
        activities: [
          LessonActivity(
            id: 'act1',
            title: 'Warm-up Game',
            description: 'Parts of speech sorting game',
            duration: 10,
            type: 'warmup',
          ),
          LessonActivity(
            id: 'act2',
            title: 'Mini-Lesson',
            description: 'Review each part of speech with examples',
            duration: 15,
            type: 'instruction',
          ),
          LessonActivity(
            id: 'act3',
            title: 'Partner Activity',
            description: 'Sentence building with word cards',
            duration: 20,
            type: 'practice',
          ),
          LessonActivity(
            id: 'act4',
            title: 'Share Out',
            description: 'Partners share best sentences',
            duration: 5,
            type: 'closure',
          ),
        ],
        materials: ['Word cards', 'Anchor charts', 'Sentence strips'],
        differentiations: {
          'approaching': 'Provide word bank with labels',
          'onLevel': 'Standard activity',
          'advanced': 'Include adverbs and prepositions',
        },
        createdAt: DateTime.now().subtract(const Duration(days: 5)),
        updatedAt: DateTime.now().subtract(const Duration(days: 1)),
      ),
    ];
  }

  List<LessonPlan> _getMockTemplates() {
    return [
      LessonPlan(
        id: 'tmpl1',
        title: '5E Science Lesson Template',
        subject: SubjectArea.science,
        gradeLevel: GradeLevel.allGrades,
        duration: 60,
        objectives: [],
        standards: [],
        activities: [
          LessonActivity(
            id: 'e1',
            title: 'Engage',
            description: 'Hook activity to capture interest',
            duration: 10,
            type: 'engage',
          ),
          LessonActivity(
            id: 'e2',
            title: 'Explore',
            description: 'Hands-on exploration activity',
            duration: 15,
            type: 'explore',
          ),
          LessonActivity(
            id: 'e3',
            title: 'Explain',
            description: 'Direct instruction and discussion',
            duration: 15,
            type: 'explain',
          ),
          LessonActivity(
            id: 'e4',
            title: 'Elaborate',
            description: 'Extension activity',
            duration: 15,
            type: 'elaborate',
          ),
          LessonActivity(
            id: 'e5',
            title: 'Evaluate',
            description: 'Assessment of understanding',
            duration: 5,
            type: 'evaluate',
          ),
        ],
        materials: [],
        differentiations: {},
        createdAt: DateTime.now().subtract(const Duration(days: 30)),
        updatedAt: DateTime.now().subtract(const Duration(days: 30)),
      ),
      LessonPlan(
        id: 'tmpl2',
        title: 'Workshop Model Template',
        subject: SubjectArea.ela,
        gradeLevel: GradeLevel.allGrades,
        duration: 60,
        objectives: [],
        standards: [],
        activities: [
          LessonActivity(
            id: 'w1',
            title: 'Mini-Lesson',
            description: 'Focused instruction on one skill',
            duration: 10,
            type: 'instruction',
          ),
          LessonActivity(
            id: 'w2',
            title: 'Independent Practice',
            description: 'Students work independently',
            duration: 35,
            type: 'independent',
          ),
          LessonActivity(
            id: 'w3',
            title: 'Conferring',
            description: 'Teacher meets with individuals/groups',
            duration: 35,
            type: 'conferring',
          ),
          LessonActivity(
            id: 'w4',
            title: 'Share',
            description: 'Students share learning',
            duration: 10,
            type: 'closure',
          ),
        ],
        materials: [],
        differentiations: {},
        createdAt: DateTime.now().subtract(const Duration(days: 30)),
        updatedAt: DateTime.now().subtract(const Duration(days: 30)),
      ),
    ];
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // colorScheme available for future styling
    final _ = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lesson Planning'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.list_alt), text: 'My Lessons'),
            Tab(icon: Icon(Icons.folder_copy), text: 'Templates'),
            Tab(icon: Icon(Icons.calendar_month), text: 'Schedule'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.auto_awesome),
            tooltip: 'AI Assistant',
            onPressed: () => _showAIAssistant(context),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildMyLessonsTab(context),
                _buildTemplatesTab(context),
                _buildScheduleTab(context),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _createNewLesson(context),
        icon: const Icon(Icons.add),
        label: const Text('New Lesson'),
      ),
    );
  }

  Widget _buildMyLessonsTab(BuildContext context) {
    final theme = Theme.of(context);

    if (_lessonPlans.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.note_add_outlined,
              size: 64,
              color: theme.colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              'No lesson plans yet',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Create your first lesson plan to get started',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _lessonPlans.length,
      itemBuilder: (context, index) {
        final lesson = _lessonPlans[index];
        return _LessonPlanCard(
          lesson: lesson,
          onTap: () => _openLessonDetail(context, lesson),
          onEdit: () => _editLesson(context, lesson),
          onDuplicate: () => _duplicateLesson(lesson),
          onDelete: () => _deleteLesson(lesson),
        );
      },
    );
  }

  Widget _buildTemplatesTab(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Lesson Templates',
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Text(
          'Start with a proven template structure',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.outline,
          ),
        ),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 1.2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemCount: LessonTemplateType.values.length,
          itemBuilder: (context, index) {
            final template = LessonTemplateType.values[index];
            return _TemplateCard(
              template: template,
              onTap: () => _useTemplate(context, template),
            );
          },
        ),
        const SizedBox(height: 24),
        Text(
          'Saved Templates',
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        ..._templates.map((template) => _LessonPlanCard(
              lesson: template,
              onTap: () => _useExistingTemplate(context, template),
              onEdit: () => _editTemplate(context, template),
              onDuplicate: () => _duplicateTemplate(template),
              onDelete: () => _deleteTemplate(template),
              isTemplate: true,
            )),
      ],
    );
  }

  Widget _buildScheduleTab(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildWeekHeader(context),
        const SizedBox(height: 16),
        ...List.generate(5, (dayIndex) {
          final dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          final hasLesson = dayIndex < _lessonPlans.length;

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: hasLesson
                    ? theme.colorScheme.primaryContainer
                    : theme.colorScheme.surfaceContainerHighest,
                child: Text(
                  dayNames[dayIndex].substring(0, 1),
                  style: TextStyle(
                    color: hasLesson
                        ? theme.colorScheme.onPrimaryContainer
                        : theme.colorScheme.outline,
                  ),
                ),
              ),
              title: Text(dayNames[dayIndex]),
              subtitle: hasLesson
                  ? Text(_lessonPlans[dayIndex].title)
                  : const Text('No lesson scheduled'),
              trailing: hasLesson
                  ? Icon(Icons.check_circle,
                      color: theme.colorScheme.primary)
                  : IconButton(
                      icon: const Icon(Icons.add),
                      onPressed: () => _scheduleLesson(context, dayIndex),
                    ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildWeekHeader(BuildContext context) {
    final theme = Theme.of(context);
    final now = DateTime.now();
    final startOfWeek = now.subtract(Duration(days: now.weekday - 1)).add(Duration(days: _weekOffset * 7));
    final endOfWeek = startOfWeek.add(const Duration(days: 4));

    return Card(
      color: theme.colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.chevron_left),
              onPressed: () {
                setState(() {
                  _weekOffset--;
                });
              },
            ),
            Expanded(
              child: Column(
                children: [
                  Text(
                    'Week of ${_formatDate(startOfWeek)} - ${_formatDate(endOfWeek)}',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${_lessonPlans.length} lessons planned',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right),
              onPressed: () {
                setState(() {
                  _weekOffset++;
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}';
  }

  void _showAIAssistant(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => _AIAssistantSheet(
          scrollController: scrollController,
        ),
      ),
    );
  }

  void _createNewLesson(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _LessonEditorScreen(
          teacherId: widget.teacherId,
        ),
      ),
    );
  }

  void _openLessonDetail(BuildContext context, LessonPlan lesson) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _LessonDetailScreen(lesson: lesson),
      ),
    );
  }

  void _editLesson(BuildContext context, LessonPlan lesson) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _LessonEditorScreen(
          teacherId: widget.teacherId,
          existingLesson: lesson,
        ),
      ),
    );
  }

  void _duplicateLesson(LessonPlan lesson) {
    setState(() {
      _lessonPlans.add(LessonPlan(
        id: 'lp${DateTime.now().millisecondsSinceEpoch}',
        title: '${lesson.title} (Copy)',
        subject: lesson.subject,
        gradeLevel: lesson.gradeLevel,
        duration: lesson.duration,
        objectives: List.from(lesson.objectives),
        standards: List.from(lesson.standards),
        activities: List.from(lesson.activities),
        materials: List.from(lesson.materials),
        differentiations: Map.from(lesson.differentiations),
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ));
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Lesson duplicated')),
    );
  }

  void _deleteLesson(LessonPlan lesson) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Lesson?'),
        content: Text('Are you sure you want to delete "${lesson.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              setState(() {
                _lessonPlans.removeWhere((l) => l.id == lesson.id);
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Lesson deleted')),
              );
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _useTemplate(BuildContext context, LessonTemplateType template) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _LessonEditorScreen(
          teacherId: widget.teacherId,
          templateType: template,
        ),
      ),
    );
  }

  void _useExistingTemplate(BuildContext context, LessonPlan template) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _LessonEditorScreen(
          teacherId: widget.teacherId,
          existingLesson: template,
          isFromTemplate: true,
        ),
      ),
    );
  }

  void _editTemplate(BuildContext context, LessonPlan template) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _LessonEditorScreen(
          teacherId: widget.teacherId,
          existingLesson: template,
        ),
      ),
    );
  }

  void _duplicateTemplate(LessonPlan template) {
    setState(() {
      _templates.add(LessonPlan(
        id: 'tmpl${DateTime.now().millisecondsSinceEpoch}',
        title: '${template.title} (Copy)',
        subject: template.subject,
        gradeLevel: template.gradeLevel,
        duration: template.duration,
        objectives: List.from(template.objectives),
        standards: List.from(template.standards),
        activities: List.from(template.activities),
        materials: List.from(template.materials),
        differentiations: Map.from(template.differentiations),
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ));
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Template duplicated')),
    );
  }

  void _deleteTemplate(LessonPlan template) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Template?'),
        content: Text('Are you sure you want to delete "${template.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              setState(() {
                _templates.removeWhere((t) => t.id == template.id);
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Template deleted')),
              );
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _scheduleLesson(BuildContext context, int dayIndex) {
    showModalBottomSheet(
      context: context,
      builder: (context) => ListView(
        shrinkWrap: true,
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Select a lesson to schedule',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
          ..._lessonPlans.map((lesson) => ListTile(
                leading: Icon(_getSubjectIcon(lesson.subject)),
                title: Text(lesson.title),
                subtitle: Text('${lesson.duration} min'),
                onTap: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${lesson.title} scheduled')),
                  );
                },
              )),
        ],
      ),
    );
  }

  IconData _getSubjectIcon(SubjectArea subject) {
    switch (subject) {
      case SubjectArea.math:
        return Icons.calculate;
      case SubjectArea.ela:
        return Icons.menu_book;
      case SubjectArea.science:
        return Icons.science;
      case SubjectArea.socialStudies:
        return Icons.public;
      case SubjectArea.art:
        return Icons.palette;
      case SubjectArea.music:
        return Icons.music_note;
      case SubjectArea.pe:
        return Icons.sports_soccer;
      case SubjectArea.sel:
        return Icons.favorite;
      case SubjectArea.other:
        return Icons.folder;
    }
  }
}

/// Lesson Plan Card Widget
class _LessonPlanCard extends StatelessWidget {
  const _LessonPlanCard({
    required this.lesson,
    required this.onTap,
    required this.onEdit,
    required this.onDuplicate,
    required this.onDelete,
    this.isTemplate = false,
  });

  final LessonPlan lesson;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDuplicate;
  final VoidCallback onDelete;
  final bool isTemplate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _getSubjectIcon(lesson.subject),
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          lesson.title,
                          style: theme.textTheme.titleMedium,
                        ),
                        Text(
                          '${lesson.subject.name.toUpperCase()} • ${lesson.gradeLevel?.label ?? "All"} • ${lesson.duration ?? lesson.durationMinutes} min',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.outline,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (!isTemplate)
                    PopupMenuButton<String>(
                      onSelected: (value) {
                        switch (value) {
                          case 'edit':
                            onEdit();
                            break;
                          case 'duplicate':
                            onDuplicate();
                            break;
                          case 'delete':
                            onDelete();
                            break;
                        }
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit),
                              SizedBox(width: 8),
                              Text('Edit'),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'duplicate',
                          child: Row(
                            children: [
                              Icon(Icons.copy),
                              SizedBox(width: 8),
                              Text('Duplicate'),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete),
                              SizedBox(width: 8),
                              Text('Delete'),
                            ],
                          ),
                        ),
                      ],
                    ),
                ],
              ),
              if (lesson.objectives.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  'Objectives:',
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                ...lesson.objectives.take(2).map((obj) => Padding(
                      padding: const EdgeInsets.only(left: 8, top: 2),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('• '),
                          Expanded(
                            child: Text(
                              obj,
                              style: theme.textTheme.bodySmall,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    )),
                if (lesson.objectives.length > 2)
                  Padding(
                    padding: const EdgeInsets.only(left: 8, top: 2),
                    child: Text(
                      '+${lesson.objectives.length - 2} more',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(Icons.layers,
                      size: 16, color: theme.colorScheme.outline),
                  const SizedBox(width: 4),
                  Text(
                    '${lesson.activities.length} activities',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.outline,
                    ),
                  ),
                  const SizedBox(width: 16),
                  if (lesson.standards.isNotEmpty) ...[
                    Icon(Icons.check_circle_outline,
                        size: 16, color: theme.colorScheme.outline),
                    const SizedBox(width: 4),
                    Text(
                      '${lesson.standards.length} standards',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.outline,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getSubjectIcon(SubjectArea subject) {
    switch (subject) {
      case SubjectArea.math:
        return Icons.calculate;
      case SubjectArea.ela:
        return Icons.menu_book;
      case SubjectArea.science:
        return Icons.science;
      case SubjectArea.socialStudies:
        return Icons.public;
      case SubjectArea.art:
        return Icons.palette;
      case SubjectArea.music:
        return Icons.music_note;
      case SubjectArea.pe:
        return Icons.sports_soccer;
      case SubjectArea.sel:
        return Icons.favorite;
      case SubjectArea.other:
        return Icons.folder;
    }
  }
}

/// Template Card Widget
class _TemplateCard extends StatelessWidget {
  const _TemplateCard({
    required this.template,
    required this.onTap,
  });

  final LessonTemplateType template;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                template.icon,
                size: 32,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: 8),
              Text(
                template.label,
                style: theme.textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// AI Assistant Sheet
class _AIAssistantSheet extends StatefulWidget {
  const _AIAssistantSheet({required this.scrollController});

  final ScrollController scrollController;

  @override
  State<_AIAssistantSheet> createState() => _AIAssistantSheetState();
}

class _AIAssistantSheetState extends State<_AIAssistantSheet> {
  final _promptController = TextEditingController();
  bool _isGenerating = false;
  String? _generatedContent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: theme.colorScheme.outline.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Icon(Icons.auto_awesome, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'AI Lesson Assistant',
                  style: theme.textTheme.titleLarge,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView(
              controller: widget.scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                Text(
                  'What would you like help with?',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _SuggestionChip(
                      label: 'Generate lesson plan',
                      onTap: () => _setPrompt('Create a lesson plan for'),
                    ),
                    _SuggestionChip(
                      label: 'Add differentiation',
                      onTap: () => _setPrompt('Add differentiation strategies for'),
                    ),
                    _SuggestionChip(
                      label: 'Create assessment',
                      onTap: () => _setPrompt('Create an assessment for'),
                    ),
                    _SuggestionChip(
                      label: 'Find resources',
                      onTap: () => _setPrompt('Find resources for teaching'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _promptController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Describe what you need...',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _isGenerating ? null : _generate,
                  icon: _isGenerating
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.auto_awesome),
                  label: Text(_isGenerating ? 'Generating...' : 'Generate'),
                ),
                if (_generatedContent != null) ...[
                  const SizedBox(height: 24),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.lightbulb,
                                  color: theme.colorScheme.primary),
                              const SizedBox(width: 8),
                              Text(
                                'Generated Content',
                                style: theme.textTheme.titleMedium,
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(_generatedContent!),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              TextButton.icon(
                                onPressed: () {
                                  Clipboard.setData(ClipboardData(text: _generatedContent!));
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Content copied to clipboard')),
                                  );
                                },
                                icon: const Icon(Icons.copy),
                                label: const Text('Copy'),
                              ),
                              const SizedBox(width: 8),
                              FilledButton.icon(
                                onPressed: () {
                                  Navigator.pop(context, _generatedContent);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Content added to lesson plan')),
                                  );
                                },
                                icon: const Icon(Icons.add),
                                label: const Text('Use'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _setPrompt(String prompt) {
    _promptController.text = prompt;
  }

  Future<void> _generate() async {
    if (_promptController.text.isEmpty) return;

    setState(() {
      _isGenerating = true;
    });

    await Future.delayed(const Duration(seconds: 2));

    setState(() {
      _isGenerating = false;
      _generatedContent = '''
Based on your request, here's a suggested lesson structure:

**Topic**: Introduction to Fractions
**Duration**: 45 minutes
**Grade Level**: 3rd Grade

**Learning Objectives**:
1. Students will understand that fractions represent parts of a whole
2. Students will identify numerators and denominators
3. Students will compare fractions with like denominators

**Materials Needed**:
- Fraction circles or manipulatives
- Whiteboard and markers
- Student worksheets
- Exit ticket cards

**Differentiation Strategies**:
- For struggling learners: Provide hands-on manipulatives
- For advanced learners: Introduce equivalent fractions
''';
    });
  }

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }
}

/// Suggestion Chip
class _SuggestionChip extends StatelessWidget {
  const _SuggestionChip({
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      label: Text(label),
      onPressed: onTap,
    );
  }
}

/// Lesson Detail Screen
class _LessonDetailScreen extends StatelessWidget {
  const _LessonDetailScreen({required this.lesson});

  final LessonPlan lesson;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(lesson.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () => _shareLesson(context),
          ),
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => _editLesson(context),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header info
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Chip(label: Text(lesson.subject.name.toUpperCase())),
                      const SizedBox(width: 8),
                      Chip(label: Text(lesson.gradeLevel?.label ?? 'All')),
                      const SizedBox(width: 8),
                      Chip(
                        avatar: const Icon(Icons.timer, size: 16),
                        label: Text('${lesson.duration ?? lesson.durationMinutes} min'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Objectives
          _SectionCard(
            title: 'Learning Objectives',
            icon: Icons.flag,
            children: lesson.objectives
                .map((obj) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.check_circle,
                              size: 20, color: theme.colorScheme.primary),
                          const SizedBox(width: 8),
                          Expanded(child: Text(obj)),
                        ],
                      ),
                    ))
                .toList(),
          ),
          const SizedBox(height: 16),

          // Standards
          if (lesson.standards.isNotEmpty) ...[
            _SectionCard(
              title: 'Standards',
              icon: Icons.verified,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: lesson.standards
                      .map((s) => Chip(label: Text(s)))
                      .toList(),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],

          // Activities
          _SectionCard(
            title: 'Activities',
            icon: Icons.layers,
            children: lesson.activities.map((activity) {
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    child: Text('${activity.duration ?? 0}m'),
                  ),
                  title: Text(activity.title),
                  subtitle: Text(activity.description),
                  trailing: Chip(label: Text(activity.type ?? 'Activity')),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),

          // Materials
          if (lesson.materials.isNotEmpty) ...[
            _SectionCard(
              title: 'Materials',
              icon: Icons.inventory,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: lesson.materials
                      .map((m) => Chip(
                            avatar: const Icon(Icons.check, size: 16),
                            label: Text(m),
                          ))
                      .toList(),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],

          // Differentiation
          if (lesson.differentiations.isNotEmpty) ...[
            _SectionCard(
              title: 'Differentiation',
              icon: Icons.tune,
              children: lesson.differentiations.entries.map((entry) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Icon(
                      entry.key == 'approaching'
                          ? Icons.support
                          : entry.key == 'advanced'
                              ? Icons.rocket_launch
                              : Icons.person,
                      color: theme.colorScheme.primary,
                    ),
                    title: Text(entry.key.toUpperCase()),
                    subtitle: Text(entry.value),
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  void _shareLesson(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Share "${lesson.title}"',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.person),
              title: const Text('Share with Colleague'),
              subtitle: const Text('Send to another teacher'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Opening colleague picker...')),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.link),
              title: const Text('Copy Link'),
              subtitle: const Text('Share via link'),
              onTap: () {
                Navigator.pop(context);
                Clipboard.setData(ClipboardData(text: 'https://aivo.app/lessons/${lesson.id}'));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Link copied to clipboard')),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.picture_as_pdf),
              title: const Text('Export as PDF'),
              subtitle: const Text('Download lesson plan'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Generating PDF...')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _editLesson(BuildContext context) {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => _LessonEditorScreen(
          teacherId: 'current_user', // Would be passed from context in real app
          existingLesson: lesson,
        ),
      ),
    );
  }
}

/// Section Card Widget
class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.icon,
    required this.children,
  });

  final String title;
  final IconData icon;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: theme.textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

/// Lesson Editor Screen
class _LessonEditorScreen extends StatefulWidget {
  const _LessonEditorScreen({
    required this.teacherId,
    this.existingLesson,
    this.templateType,
    this.isFromTemplate = false,
  });

  final String teacherId;
  final LessonPlan? existingLesson;
  final LessonTemplateType? templateType;
  final bool isFromTemplate;

  @override
  State<_LessonEditorScreen> createState() => _LessonEditorScreenState();
}

class _LessonEditorScreenState extends State<_LessonEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  SubjectArea _selectedSubject = SubjectArea.ela;
  GradeLevel _selectedGrade = GradeLevel.grade3;
  int _duration = 45;
  final List<String> _objectives = [];
  final List<LessonActivity> _activities = [];

  @override
  void initState() {
    super.initState();
    if (widget.existingLesson != null) {
      final lesson = widget.existingLesson!;
      _titleController.text = widget.isFromTemplate ? '' : lesson.title;
      _selectedSubject = lesson.subject;
      _selectedGrade = lesson.gradeLevel ?? GradeLevel.grade3;
      _duration = lesson.duration ?? lesson.durationMinutes;
      _objectives.addAll(lesson.objectives);
      _activities.addAll(lesson.activities);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isEditing = widget.existingLesson != null && !widget.isFromTemplate;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Lesson' : 'New Lesson'),
        actions: [
          TextButton(
            onPressed: _saveLesson,
            child: const Text('Save'),
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
                labelText: 'Lesson Title',
                hintText: 'Enter lesson title',
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a title';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Subject and Grade
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<SubjectArea>(
                    value: _selectedSubject,
                    decoration: const InputDecoration(labelText: 'Subject'),
                    items: SubjectArea.values.map((subject) {
                      return DropdownMenuItem(
                        value: subject,
                        child: Text(subject.name.toUpperCase()),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedSubject = value!;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: DropdownButtonFormField<GradeLevel>(
                    value: _selectedGrade,
                    decoration: const InputDecoration(labelText: 'Grade Level'),
                    items: GradeLevel.values.map((grade) {
                      return DropdownMenuItem(
                        value: grade,
                        child: Text(grade.label),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedGrade = value!;
                      });
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Duration
            Row(
              children: [
                Text('Duration: $_duration minutes'),
                Expanded(
                  child: Slider(
                    value: _duration.toDouble(),
                    min: 15,
                    max: 90,
                    divisions: 15,
                    label: '$_duration min',
                    onChanged: (value) {
                      setState(() {
                        _duration = value.round();
                      });
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Objectives
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Objectives', style: theme.textTheme.titleMedium),
                IconButton(
                  icon: const Icon(Icons.add),
                  onPressed: _addObjective,
                ),
              ],
            ),
            ..._objectives.asMap().entries.map((entry) {
              return ListTile(
                leading: CircleAvatar(child: Text('${entry.key + 1}')),
                title: Text(entry.value),
                trailing: IconButton(
                  icon: const Icon(Icons.delete),
                  onPressed: () {
                    setState(() {
                      _objectives.removeAt(entry.key);
                    });
                  },
                ),
              );
            }),
            const SizedBox(height: 24),

            // Activities
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Activities', style: theme.textTheme.titleMedium),
                IconButton(
                  icon: const Icon(Icons.add),
                  onPressed: _addActivity,
                ),
              ],
            ),
            ..._activities.asMap().entries.map((entry) {
              final activity = entry.value;
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(child: Text('${activity.duration}m')),
                  title: Text(activity.title),
                  subtitle: Text(activity.description),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete),
                    onPressed: () {
                      setState(() {
                        _activities.removeAt(entry.key);
                      });
                    },
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
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
            hintText: 'Enter learning objective',
          ),
          maxLines: 2,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                setState(() {
                  _objectives.add(controller.text);
                });
              }
              Navigator.pop(context);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _addActivity() {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    int duration = 10;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Add Activity'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleController,
                decoration: const InputDecoration(labelText: 'Title'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: descController,
                decoration: const InputDecoration(labelText: 'Description'),
                maxLines: 2,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Text('Duration: '),
                  Expanded(
                    child: Slider(
                      value: duration.toDouble(),
                      min: 5,
                      max: 30,
                      divisions: 5,
                      label: '$duration min',
                      onChanged: (value) {
                        setDialogState(() {
                          duration = value.round();
                        });
                      },
                    ),
                  ),
                  Text('$duration min'),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                if (titleController.text.isNotEmpty) {
                  setState(() {
                    _activities.add(LessonActivity(
                      id: 'act${DateTime.now().millisecondsSinceEpoch}',
                      title: titleController.text,
                      description: descController.text,
                      duration: duration,
                      type: 'custom',
                    ));
                  });
                }
                Navigator.pop(context);
              },
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
  }

  void _saveLesson() {
    if (_formKey.currentState!.validate()) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lesson saved')),
      );
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }
}
