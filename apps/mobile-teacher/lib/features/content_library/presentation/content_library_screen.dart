/// Content Library Screen
///
/// Browse and search educational content including:
/// - Lessons
/// - Activities
/// - Assessments
/// - Videos and games
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/content_models.dart';

/// Content Library Screen
class ContentLibraryScreen extends ConsumerStatefulWidget {
  const ContentLibraryScreen({
    super.key,
    this.classId,
    this.teacherId,
  });

  final String? classId;
  final String? teacherId;

  @override
  ConsumerState<ContentLibraryScreen> createState() =>
      _ContentLibraryScreenState();
}

class _ContentLibraryScreenState extends ConsumerState<ContentLibraryScreen> {
  String _searchQuery = '';
  ContentType? _selectedType;
  SubjectArea? _selectedSubject;
  GradeLevel? _selectedGrade;
  bool _isLoading = true;
  List<ContentItem> _content = [];

  // Mock content for demo
  final List<ContentItem> _mockContent = [
    const ContentItem(
      id: '1',
      title: 'Introduction to Fractions',
      description:
          'Learn the basics of fractions through visual models and hands-on activities.',
      type: ContentType.lesson,
      subject: SubjectArea.math,
      gradeLevels: [GradeLevel.g3, GradeLevel.g4],
      durationMinutes: 30,
      standards: ['CCSS.MATH.3.NF.A.1'],
      tags: ['fractions', 'visual models', 'manipulatives'],
      rating: 4.8,
      usageCount: 245,
      isFavorite: true,
    ),
    const ContentItem(
      id: '2',
      title: 'Reading Comprehension: Main Idea',
      description:
          'Help students identify the main idea and supporting details in nonfiction texts.',
      type: ContentType.lesson,
      subject: SubjectArea.ela,
      gradeLevels: [GradeLevel.g3, GradeLevel.g4, GradeLevel.g5],
      durationMinutes: 25,
      standards: ['CCSS.ELA-LITERACY.RI.3.2'],
      tags: ['reading', 'comprehension', 'main idea'],
      rating: 4.5,
      usageCount: 189,
    ),
    const ContentItem(
      id: '3',
      title: 'Multiplication Facts Practice',
      description: 'Interactive game for practicing multiplication facts 0-12.',
      type: ContentType.game,
      subject: SubjectArea.math,
      gradeLevels: [GradeLevel.g3, GradeLevel.g4],
      durationMinutes: 15,
      standards: ['CCSS.MATH.3.OA.C.7'],
      tags: ['multiplication', 'math facts', 'game'],
      rating: 4.9,
      usageCount: 412,
    ),
    const ContentItem(
      id: '4',
      title: 'The Water Cycle',
      description:
          'Explore evaporation, condensation, and precipitation through animated diagrams.',
      type: ContentType.video,
      subject: SubjectArea.science,
      gradeLevels: [GradeLevel.g2, GradeLevel.g3, GradeLevel.g4],
      durationMinutes: 8,
      standards: ['NGSS.3-ESS2-1'],
      tags: ['water cycle', 'weather', 'earth science'],
      rating: 4.7,
      usageCount: 320,
    ),
    const ContentItem(
      id: '5',
      title: 'Emotion Regulation Strategies',
      description:
          'Learn coping strategies for managing big emotions in healthy ways.',
      type: ContentType.activity,
      subject: SubjectArea.sel,
      gradeLevels: [GradeLevel.g2, GradeLevel.g3, GradeLevel.g4, GradeLevel.g5],
      durationMinutes: 20,
      tags: ['emotions', 'coping', 'self-regulation'],
      rating: 4.6,
      usageCount: 178,
    ),
    const ContentItem(
      id: '6',
      title: 'Fractions Quiz',
      description: 'Assessment covering fraction concepts including comparing and equivalent fractions.',
      type: ContentType.assessment,
      subject: SubjectArea.math,
      gradeLevels: [GradeLevel.g3, GradeLevel.g4],
      durationMinutes: 20,
      standards: ['CCSS.MATH.3.NF.A.2', 'CCSS.MATH.3.NF.A.3'],
      tags: ['fractions', 'assessment', 'quiz'],
      rating: 4.4,
      usageCount: 156,
    ),
    const ContentItem(
      id: '7',
      title: 'Community Helpers',
      description:
          'Learn about different jobs in the community and how they help us.',
      type: ContentType.lesson,
      subject: SubjectArea.socialStudies,
      gradeLevels: [GradeLevel.g1, GradeLevel.g2],
      durationMinutes: 25,
      tags: ['community', 'jobs', 'social studies'],
      rating: 4.3,
      usageCount: 134,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadContent();
  }

  Future<void> _loadContent() async {
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() {
      _content = _mockContent;
      _isLoading = false;
    });
  }

  List<ContentItem> get _filteredContent {
    return _content.where((item) {
      // Search filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        if (!item.title.toLowerCase().contains(query) &&
            !item.description.toLowerCase().contains(query) &&
            !item.tags.any((t) => t.toLowerCase().contains(query))) {
          return false;
        }
      }
      // Type filter
      if (_selectedType != null && item.type != _selectedType) return false;
      // Subject filter
      if (_selectedSubject != null && item.subject != _selectedSubject) return false;
      // Grade filter
      if (_selectedGrade != null && !item.gradeLevels.contains(_selectedGrade)) {
        return false;
      }
      return true;
    }).toList();
  }

  IconData _getContentIcon(ContentType type) {
    switch (type) {
      case ContentType.lesson:
        return Icons.menu_book;
      case ContentType.activity:
        return Icons.extension;
      case ContentType.assessment:
        return Icons.quiz;
      case ContentType.video:
        return Icons.play_circle;
      case ContentType.reading:
        return Icons.auto_stories;
      case ContentType.game:
        return Icons.sports_esports;
    }
  }

  Color _getSubjectColor(SubjectArea subject) {
    switch (subject) {
      case SubjectArea.math:
        return Colors.blue;
      case SubjectArea.ela:
        return Colors.purple;
      case SubjectArea.science:
        return AivoBrand.success;
      case SubjectArea.socialStudies:
        return AivoBrand.warning;
      case SubjectArea.sel:
        return Colors.pink;
      case SubjectArea.art:
        return Colors.teal;
      case SubjectArea.music:
        return Colors.indigo;
      case SubjectArea.pe:
        return AivoBrand.error;
      case SubjectArea.other:
        return AivoBrand.gray;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Content Library'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilterSheet(context),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              onChanged: (value) => setState(() => _searchQuery = value),
              decoration: InputDecoration(
                hintText: 'Search content...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: colorScheme.surfaceContainerHighest,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),

          // Active filters
          if (_selectedType != null ||
              _selectedSubject != null ||
              _selectedGrade != null)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  if (_selectedType != null)
                    _FilterChip(
                      label: _selectedType!.label,
                      onRemove: () => setState(() => _selectedType = null),
                    ),
                  if (_selectedSubject != null)
                    _FilterChip(
                      label: _selectedSubject!.label,
                      onRemove: () => setState(() => _selectedSubject = null),
                    ),
                  if (_selectedGrade != null)
                    _FilterChip(
                      label: 'Grade ${_selectedGrade!.label}',
                      onRemove: () => setState(() => _selectedGrade = null),
                    ),
                  TextButton(
                    onPressed: () => setState(() {
                      _selectedType = null;
                      _selectedSubject = null;
                      _selectedGrade = null;
                    }),
                    child: const Text('Clear All'),
                  ),
                ],
              ),
            ),

          // Content type tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _TypeChip(
                  label: 'All',
                  icon: Icons.grid_view,
                  isSelected: _selectedType == null,
                  onTap: () => setState(() => _selectedType = null),
                ),
                ...ContentType.values.map((type) => _TypeChip(
                      label: type.label,
                      icon: _getContentIcon(type),
                      isSelected: _selectedType == type,
                      onTap: () => setState(() => _selectedType = type),
                    )),
              ],
            ),
          ),

          // Results count
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Text(
                  '${_filteredContent.length} results',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                const Spacer(),
                PopupMenuButton<String>(
                  child: Row(
                    children: [
                      Text(
                        'Sort by',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.primary,
                        ),
                      ),
                      Icon(Icons.arrow_drop_down, color: colorScheme.primary),
                    ],
                  ),
                  itemBuilder: (context) => [
                    const PopupMenuItem(value: 'rating', child: Text('Rating')),
                    const PopupMenuItem(value: 'popular', child: Text('Most Used')),
                    const PopupMenuItem(value: 'recent', child: Text('Recently Added')),
                  ],
                ),
              ],
            ),
          ),

          // Content list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredContent.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.search_off,
                              size: 64,
                              color: colorScheme.onSurfaceVariant,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No content found',
                              style: theme.textTheme.titleMedium,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Try adjusting your filters',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _filteredContent.length,
                        itemBuilder: (context, index) {
                          final item = _filteredContent[index];
                          return _ContentCard(
                            item: item,
                            subjectColor: _getSubjectColor(item.subject),
                            contentIcon: _getContentIcon(item.type),
                            onTap: () => _showContentDetails(context, item),
                            onAssign: widget.classId != null
                                ? () => _assignToClass(item)
                                : null,
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  void _showFilterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Filters',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 16),

                // Subject filter
                Text('Subject', style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: SubjectArea.values.map((subject) {
                    return ChoiceChip(
                      label: Text(subject.label),
                      selected: _selectedSubject == subject,
                      onSelected: (selected) {
                        setModalState(() {
                          setState(() {
                            _selectedSubject = selected ? subject : null;
                          });
                        });
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),

                // Grade filter
                Text('Grade Level', style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: GradeLevel.values.map((grade) {
                    return ChoiceChip(
                      label: Text(grade.label),
                      selected: _selectedGrade == grade,
                      onSelected: (selected) {
                        setModalState(() {
                          setState(() {
                            _selectedGrade = selected ? grade : null;
                          });
                        });
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 24),

                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          setState(() {
                            _selectedType = null;
                            _selectedSubject = null;
                            _selectedGrade = null;
                          });
                          Navigator.pop(context);
                        },
                        child: const Text('Clear Filters'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Apply'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showContentDetails(BuildContext context, ContentItem item) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final subjectColor = _getSubjectColor(item.subject);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) {
          return Container(
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  width: 32,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colorScheme.onSurfaceVariant.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Expanded(
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(16),
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            backgroundColor: subjectColor.withOpacity(0.2),
                            child: Icon(
                              _getContentIcon(item.type),
                              color: subjectColor,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.title,
                                  style: theme.textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: subjectColor.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        item.subject.label,
                                        style: TextStyle(
                                          color: subjectColor,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Icon(Icons.timer_outlined, size: 14),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${item.durationMinutes} min',
                                      style: theme.textTheme.bodySmall,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(context),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(item.description, style: theme.textTheme.bodyLarge),
                      const SizedBox(height: 16),

                      // Grade levels
                      Text(
                        'Grade Levels',
                        style: theme.textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: item.gradeLevels.map((g) {
                          return Chip(label: Text(g.label));
                        }).toList(),
                      ),
                      const SizedBox(height: 16),

                      // Standards
                      if (item.standards.isNotEmpty) ...[
                        Text(
                          'Standards',
                          style: theme.textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...item.standards.map((s) => Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Row(
                                children: [
                                  Icon(Icons.check_circle,
                                      size: 16, color: AivoBrand.success),
                                  const SizedBox(width: 8),
                                  Text(s),
                                ],
                              ),
                            )),
                        const SizedBox(height: 16),
                      ],

                      // Stats
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _StatItem(
                                icon: Icons.star,
                                value: item.rating.toStringAsFixed(1),
                                label: 'Rating',
                              ),
                              _StatItem(
                                icon: Icons.people,
                                value: '${item.usageCount}',
                                label: 'Uses',
                              ),
                              _StatItem(
                                icon: Icons.timer,
                                value: '${item.durationMinutes}',
                                label: 'Minutes',
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Actions
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {},
                              icon: const Icon(Icons.preview),
                              label: const Text('Preview'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: () {
                                Navigator.pop(context);
                                if (widget.classId != null) {
                                  _assignToClass(item);
                                }
                              },
                              icon: const Icon(Icons.add),
                              label: const Text('Add to Plan'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _assignToClass(ContentItem item) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Added "${item.title}" to lesson plan')),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.onRemove,
  });

  final String label;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InputChip(
        label: Text(label),
        onDeleted: onRemove,
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  const _TypeChip({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    // Theme available for styling
    Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        avatar: Icon(icon, size: 18),
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => onTap(),
      ),
    );
  }
}

class _ContentCard extends StatelessWidget {
  const _ContentCard({
    required this.item,
    required this.subjectColor,
    required this.contentIcon,
    required this.onTap,
    this.onAssign,
  });

  final ContentItem item;
  final Color subjectColor;
  final IconData contentIcon;
  final VoidCallback onTap;
  final VoidCallback? onAssign;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

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
                  CircleAvatar(
                    backgroundColor: subjectColor.withOpacity(0.2),
                    child: Icon(contentIcon, color: subjectColor, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: subjectColor.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                item.subject.label,
                                style: TextStyle(
                                  color: subjectColor,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              item.type.label,
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (item.isFavorite)
                    Icon(Icons.star, color: Colors.amber, size: 20),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                item.description,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.timer_outlined,
                      size: 14, color: colorScheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(
                    '${item.durationMinutes} min',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Icon(Icons.star, size: 14, color: Colors.amber),
                  const SizedBox(width: 4),
                  Text(
                    item.rating.toStringAsFixed(1),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    'Grades ${item.gradeLevels.map((g) => g.label).join(", ")}',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
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
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.icon,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      children: [
        Icon(icon, color: colorScheme.primary),
        const SizedBox(height: 4),
        Text(
          value,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
