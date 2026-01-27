import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../pin/pin_storage.dart';
import 'study_skills_models.dart';
import 'study_skills_service.dart';
import 'screens/note_templates_screen.dart';
import 'screens/study_guides_screen.dart';
import 'screens/memory_techniques_screen.dart';
import 'screens/test_prep_screen.dart';

/// Study Skills Hub Screen
///
/// Main entry point for study skills tools including:
/// - Note-taking templates (Cornell, Outline, Mind Map, etc.)
/// - Study guides with key terms and practice questions
/// - Memory techniques and flashcards
/// - Test preparation plans
class StudySkillsHubScreen extends StatefulWidget {
  final String learnerId;

  const StudySkillsHubScreen({
    super.key,
    required this.learnerId,
  });

  @override
  State<StudySkillsHubScreen> createState() => _StudySkillsHubScreenState();
}

class _StudySkillsHubScreenState extends State<StudySkillsHubScreen> {
  StudySkillsService? _service;
  String _cachedToken = '';

  List<Note> _recentNotes = [];
  List<TestPrepPlan> _upcomingTests = [];
  List<MemoryCard> _dueCards = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeService();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    _cachedToken = await storage.read() ?? '';

    _service = StudySkillsService(accessToken: _cachedToken);
    await _loadData();
  }

  Future<void> _loadData() async {
    if (_service == null) return;

    setState(() => _isLoading = true);

    try {
      final results = await Future.wait([
        _service!.getNotes(widget.learnerId),
        _service!.getTestPrepPlans(widget.learnerId),
        _service!.getMemoryCards(widget.learnerId),
      ]);

      if (mounted) {
        final notes = results[0] as List<Note>;
        final plans = results[1] as List<TestPrepPlan>;
        final cards = results[2] as List<MemoryCard>;

        setState(() {
          // Get 3 most recent notes
          _recentNotes = notes.take(3).toList();

          // Get upcoming tests (within 30 days)
          _upcomingTests = plans
              .where((p) => p.daysUntilTest >= 0 && p.daysUntilTest <= 30)
              .toList()
            ..sort((a, b) => a.testDate.compareTo(b.testDate));

          // Get cards due for review
          _dueCards = cards
              .where((c) =>
                  c.nextReview == null ||
                  c.nextReview!.isBefore(DateTime.now()))
              .take(5)
              .toList();

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
        title: const Text('Study Skills'),
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
                    _buildQuickStats(),
                    const SizedBox(height: 24),

                    // Tools Grid
                    _buildToolsGrid(),
                    const SizedBox(height: 24),

                    // Due Flashcards
                    if (_dueCards.isNotEmpty) ...[
                      _buildDueCardsSection(),
                      const SizedBox(height: 24),
                    ],

                    // Recent Notes
                    if (_recentNotes.isNotEmpty) ...[
                      _buildRecentNotesSection(),
                      const SizedBox(height: 24),
                    ],

                    // Upcoming Tests
                    if (_upcomingTests.isNotEmpty) ...[
                      _buildUpcomingTestsSection(),
                    ],
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildQuickStats() {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Icons.note_alt,
            label: 'Notes',
            value: '${_recentNotes.length}',
            color: const Color(0xFF3B82F6),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            icon: Icons.style,
            label: 'Due Cards',
            value: '${_dueCards.length}',
            color: const Color(0xFF8B5CF6),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            icon: Icons.event,
            label: 'Tests',
            value: '${_upcomingTests.length}',
            color: const Color(0xFFF59E0B),
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
          'Study Tools',
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
              icon: Icons.note_add,
              title: 'Note Templates',
              subtitle: 'Cornell, Outline, Mind Map',
              color: const Color(0xFF3B82F6),
              onTap: () => _navigateTo(NoteTemplatesScreen(
                learnerId: widget.learnerId,
              )),
            ),
            _ToolCard(
              icon: Icons.menu_book,
              title: 'Study Guides',
              subtitle: 'Key terms & practice',
              color: const Color(0xFF10B981),
              onTap: () => _navigateTo(StudyGuidesScreen(
                learnerId: widget.learnerId,
              )),
            ),
            _ToolCard(
              icon: Icons.psychology,
              title: 'Memory Techniques',
              subtitle: 'Flashcards & mnemonics',
              color: const Color(0xFF8B5CF6),
              onTap: () => _navigateTo(MemoryTechniquesScreen(
                learnerId: widget.learnerId,
              )),
            ),
            _ToolCard(
              icon: Icons.assignment,
              title: 'Test Prep',
              subtitle: 'Plans & practice tests',
              color: const Color(0xFFF59E0B),
              onTap: () => _navigateTo(TestPrepScreen(
                learnerId: widget.learnerId,
              )),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDueCardsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Flashcards Due for Review',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            TextButton(
              onPressed: () => _navigateTo(MemoryTechniquesScreen(
                learnerId: widget.learnerId,
              )),
              child: const Text('Review All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 100,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _dueCards.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final card = _dueCards[index];
              return _FlashcardPreview(card: card);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRecentNotesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Recent Notes',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            TextButton(
              onPressed: () => _navigateTo(NoteTemplatesScreen(
                learnerId: widget.learnerId,
              )),
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...(_recentNotes.map((note) => _NotePreviewCard(note: note))),
      ],
    );
  }

  Widget _buildUpcomingTestsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Upcoming Tests',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            TextButton(
              onPressed: () => _navigateTo(TestPrepScreen(
                learnerId: widget.learnerId,
              )),
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...(_upcomingTests.take(3).map((plan) => _TestPlanPreviewCard(
              plan: plan,
              onTap: () => _navigateTo(TestPrepScreen(
                learnerId: widget.learnerId,
              )),
            ))),
      ],
    );
  }

  void _navigateTo(Widget screen) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => screen),
    ).then((_) => _loadData());
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

class _FlashcardPreview extends StatelessWidget {
  final MemoryCard card;

  const _FlashcardPreview({required this.card});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 180,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AivoBrand.gray.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFF8B5CF6).withOpacity(0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              card.deck,
              style: const TextStyle(
                fontSize: 10,
                color: Color(0xFF8B5CF6),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: Text(
              card.front,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class _NotePreviewCard extends StatelessWidget {
  final Note note;

  const _NotePreviewCard({required this.note});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFF3B82F6).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(
            Icons.note_alt,
            color: Color(0xFF3B82F6),
          ),
        ),
        title: Text(
          note.title,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          '${note.subject} • ${note.wordCount} words',
          style: TextStyle(
            color: AivoBrand.gray.shade600,
            fontSize: 12,
          ),
        ),
        trailing: Text(
          _formatDate(note.lastEdited),
          style: TextStyle(
            color: AivoBrand.gray.shade500,
            fontSize: 11,
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inHours < 1) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return '${date.month}/${date.day}';
    }
  }
}

class _TestPlanPreviewCard extends StatelessWidget {
  final TestPrepPlan plan;
  final VoidCallback onTap;

  const _TestPlanPreviewCard({
    required this.plan,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final daysLeft = plan.daysUntilTest;
    final urgencyColor = daysLeft <= 3
        ? AivoBrand.error
        : daysLeft <= 7
            ? AivoBrand.warning
            : AivoBrand.success;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: urgencyColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$daysLeft',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: urgencyColor,
                      ),
                    ),
                    Text(
                      'days',
                      style: TextStyle(
                        fontSize: 10,
                        color: urgencyColor,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      plan.testName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      plan.subject,
                      style: TextStyle(
                        color: AivoBrand.gray.shade600,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Progress bar
                    LinearProgressIndicator(
                      value: plan.progress / 100,
                      backgroundColor: AivoBrand.gray.shade200,
                      valueColor: AlwaysStoppedAnimation(urgencyColor),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${plan.progress}%',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: urgencyColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
