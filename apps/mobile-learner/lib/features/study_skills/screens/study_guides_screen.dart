import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../pin/pin_storage.dart';
import '../study_skills_models.dart';
import '../study_skills_service.dart';

/// Study Guides Screen
///
/// Provides study guides with:
/// - Key terms and definitions
/// - Practice questions
/// - Subject organization
class StudyGuidesScreen extends StatefulWidget {
  final String learnerId;

  const StudyGuidesScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<StudyGuidesScreen> createState() => _StudyGuidesScreenState();
}

class _StudyGuidesScreenState extends State<StudyGuidesScreen> {
  StudySkillsService? _service;

  List<StudyGuide> _guides = [];
  bool _isLoading = true;
  String _selectedSubject = 'All';

  @override
  void initState() {
    super.initState();
    _initializeService();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    final token = await storage.read() ?? '';

    _service = StudySkillsService(accessToken: token);
    await _loadData();
  }

  Future<void> _loadData() async {
    if (_service == null) return;

    setState(() => _isLoading = true);

    try {
      final guides = await _service!.getStudyGuides(widget.learnerId);

      if (mounted) {
        setState(() {
          _guides = guides;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  List<String> get _subjects {
    final subjects = _guides.map((g) => g.subject).toSet().toList();
    subjects.sort();
    return ['All', ...subjects];
  }

  List<StudyGuide> get _filteredGuides {
    if (_selectedSubject == 'All') {
      return _guides;
    }
    return _guides.where((g) => g.subject == _selectedSubject).toList();
  }

  void _showCreateGuideDialog() {
    final subjectController = TextEditingController();
    final topicController = TextEditingController();
    final descriptionController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New Study Guide'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: subjectController,
                decoration: const InputDecoration(
                  labelText: 'Subject',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: topicController,
                decoration: const InputDecoration(
                  labelText: 'Topic',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: descriptionController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Description (optional)',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (subjectController.text.isNotEmpty &&
                  topicController.text.isNotEmpty &&
                  _service != null) {
                await _service!.createStudyGuide(
                  userId: widget.learnerId,
                  subject: subjectController.text,
                  topic: topicController.text,
                  description: descriptionController.text.isNotEmpty
                      ? descriptionController.text
                      : null,
                );
                if (mounted) {
                  Navigator.pop(context);
                  _loadData();
                }
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  void _openGuideDetail(StudyGuide guide) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _StudyGuideDetailScreen(guide: guide),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Study Guides'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Subject filter
                if (_subjects.length > 2)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: _subjects.map((subject) {
                        final isSelected = subject == _selectedSubject;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            selected: isSelected,
                            label: Text(subject),
                            onSelected: (_) {
                              setState(() => _selectedSubject = subject);
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                // Guides list
                Expanded(
                  child: _filteredGuides.isEmpty
                      ? _buildEmptyState()
                      : RefreshIndicator(
                          onRefresh: _loadData,
                          child: ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _filteredGuides.length,
                            itemBuilder: (context, index) {
                              final guide = _filteredGuides[index];
                              return _GuideCard(
                                guide: guide,
                                onTap: () => _openGuideDetail(guide),
                              );
                            },
                          ),
                        ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateGuideDialog,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.menu_book, size: 64, color: AivoBrand.gray.shade400),
          const SizedBox(height: 16),
          Text(
            'No study guides yet',
            style: TextStyle(
              fontSize: 18,
              color: AivoBrand.gray.shade600,
            ),
          ),
          const SizedBox(height: 8),
          const Text('Tap + to create your first study guide'),
        ],
      ),
    );
  }
}

class _GuideCard extends StatelessWidget {
  final StudyGuide guide;
  final VoidCallback onTap;

  const _GuideCard({
    required this.guide,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
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
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      guide.subject,
                      style: const TextStyle(
                        color: Color(0xFF10B981),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Icon(
                    Icons.timer,
                    size: 16,
                    color: AivoBrand.gray.shade500,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${guide.estimatedStudyTime} min',
                    style: TextStyle(
                      fontSize: 12,
                      color: AivoBrand.gray.shade500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                guide.topic,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              if (guide.description != null) ...[
                const SizedBox(height: 4),
                Text(
                  guide.description!,
                  style: TextStyle(
                    color: AivoBrand.gray.shade600,
                    fontSize: 13,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  _StatChip(
                    icon: Icons.abc,
                    label: '${guide.keyTerms.length} terms',
                  ),
                  const SizedBox(width: 12),
                  _StatChip(
                    icon: Icons.quiz,
                    label: '${guide.practiceQuestions.length} questions',
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

class _StatChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _StatChip({
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AivoBrand.gray.shade500),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: AivoBrand.gray.shade500,
          ),
        ),
      ],
    );
  }
}

class _StudyGuideDetailScreen extends StatefulWidget {
  final StudyGuide guide;

  const _StudyGuideDetailScreen({required this.guide});

  @override
  State<_StudyGuideDetailScreen> createState() =>
      _StudyGuideDetailScreenState();
}

class _StudyGuideDetailScreenState extends State<_StudyGuideDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
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
        title: Text(widget.guide.topic),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Terms'),
            Tab(text: 'Practice'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOverviewTab(),
          _buildTermsTab(),
          _buildPracticeTab(),
        ],
      ),
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.menu_book,
                          color: Color(0xFF10B981),
                          size: 32,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.guide.subject,
                              style: TextStyle(
                                color: AivoBrand.gray.shade600,
                              ),
                            ),
                            Text(
                              widget.guide.topic,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (widget.guide.description != null) ...[
                    const Divider(height: 24),
                    Text(widget.guide.description!),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Stats
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  icon: Icons.timer,
                  value: '${widget.guide.estimatedStudyTime}',
                  label: 'minutes',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.abc,
                  value: '${widget.guide.keyTerms.length}',
                  label: 'key terms',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.quiz,
                  value: '${widget.guide.practiceQuestions.length}',
                  label: 'questions',
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Sections
          if (widget.guide.sections.isNotEmpty) ...[
            const Text(
              'Sections',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ...widget.guide.sections.map((section) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Icon(_getSectionIcon(section.type)),
                    title: Text(section.title),
                    subtitle: Text(
                      section.content,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                )),
          ],
        ],
      ),
    );
  }

  Widget _buildTermsTab() {
    if (widget.guide.keyTerms.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.abc, size: 64, color: AivoBrand.gray.shade400),
            const SizedBox(height: 16),
            Text(
              'No key terms yet',
              style: TextStyle(
                fontSize: 18,
                color: AivoBrand.gray.shade600,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: widget.guide.keyTerms.length,
      itemBuilder: (context, index) {
        final term = widget.guide.keyTerms[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ExpansionTile(
            title: Text(
              term.term,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: term.category != null
                ? Text(
                    term.category!,
                    style: TextStyle(
                      color: AivoBrand.gray.shade500,
                      fontSize: 12,
                    ),
                  )
                : null,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(term.definition),
                    if (term.examples != null && term.examples!.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      const Text(
                        'Examples:',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 4),
                      ...term.examples!.map((ex) => Padding(
                            padding: const EdgeInsets.only(left: 8, top: 4),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('• '),
                                Expanded(child: Text(ex)),
                              ],
                            ),
                          )),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPracticeTab() {
    if (widget.guide.practiceQuestions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.quiz, size: 64, color: AivoBrand.gray.shade400),
            const SizedBox(height: 16),
            Text(
              'No practice questions yet',
              style: TextStyle(
                fontSize: 18,
                color: AivoBrand.gray.shade600,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: widget.guide.practiceQuestions.length,
      itemBuilder: (context, index) {
        final question = widget.guide.practiceQuestions[index];
        return _QuestionCard(
          question: question,
          index: index + 1,
        );
      },
    );
  }

  IconData _getSectionIcon(StudyGuideSectionType type) {
    switch (type) {
      case StudyGuideSectionType.overview:
        return Icons.info_outline;
      case StudyGuideSectionType.keyTerms:
        return Icons.abc;
      case StudyGuideSectionType.practice:
        return Icons.fitness_center;
      case StudyGuideSectionType.summary:
        return Icons.summarize;
      case StudyGuideSectionType.quiz:
        return Icons.quiz;
      case StudyGuideSectionType.resources:
        return Icons.link;
    }
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;

  const _StatCard({
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, color: const Color(0xFF10B981)),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: AivoBrand.gray.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuestionCard extends StatefulWidget {
  final PracticeQuestion question;
  final int index;

  const _QuestionCard({
    required this.question,
    required this.index,
  });

  @override
  State<_QuestionCard> createState() => _QuestionCardState();
}

class _QuestionCardState extends State<_QuestionCard> {
  bool _showAnswer = false;
  String? _selectedAnswer;

  Color _getDifficultyColor(QuestionDifficulty difficulty) {
    switch (difficulty) {
      case QuestionDifficulty.easy:
        return AivoBrand.success;
      case QuestionDifficulty.medium:
        return AivoBrand.warning;
      case QuestionDifficulty.hard:
        return AivoBrand.error;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Q${widget.index}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF10B981),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: _getDifficultyColor(widget.question.difficulty)
                        .withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    widget.question.difficulty.name,
                    style: TextStyle(
                      fontSize: 10,
                      color: _getDifficultyColor(widget.question.difficulty),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              widget.question.question,
              style: const TextStyle(fontSize: 15),
            ),
            const SizedBox(height: 12),

            // Options for multiple choice
            if (widget.question.type == QuestionType.multipleChoice &&
                widget.question.options != null)
              ...widget.question.options!.map((option) => GestureDetector(
                    onTap: () {
                      setState(() => _selectedAnswer = option);
                    },
                    child: Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _selectedAnswer == option
                            ? const Color(0xFF10B981).withOpacity(0.1)
                            : AivoBrand.gray.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _selectedAnswer == option
                              ? const Color(0xFF10B981)
                              : AivoBrand.gray.shade200,
                        ),
                      ),
                      child: Text(option),
                    ),
                  )),

            // True/False options
            if (widget.question.type == QuestionType.trueFalse)
              Row(
                children: ['True', 'False'].map((option) {
                  final isSelected = _selectedAnswer == option;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() => _selectedAnswer = option);
                      },
                      child: Container(
                        margin: EdgeInsets.only(
                            right: option == 'True' ? 8 : 0,
                            left: option == 'False' ? 8 : 0),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? const Color(0xFF10B981).withOpacity(0.1)
                              : AivoBrand.gray.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected
                                ? const Color(0xFF10B981)
                                : AivoBrand.gray.shade200,
                          ),
                        ),
                        child: Center(child: Text(option)),
                      ),
                    ),
                  );
                }).toList(),
              ),

            const SizedBox(height: 12),
            TextButton(
              onPressed: () {
                setState(() => _showAnswer = !_showAnswer);
              },
              child: Text(_showAnswer ? 'Hide Answer' : 'Show Answer'),
            ),

            if (_showAnswer && widget.question.correctAnswer != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Answer: ${widget.question.correctAnswer}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF10B981),
                      ),
                    ),
                    if (widget.question.explanation != null) ...[
                      const SizedBox(height: 8),
                      Text(widget.question.explanation!),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
