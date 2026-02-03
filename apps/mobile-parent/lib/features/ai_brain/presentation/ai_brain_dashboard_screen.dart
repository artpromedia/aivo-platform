/// AI Brain Dashboard Screen
///
/// Visual dashboard showing how AI tutors a child.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/ai_brain_state.dart';
import '../providers/ai_brain_provider.dart';
import '../widgets/widgets.dart';

/// Main dashboard showing AI's decision-making for a child.
class AIBrainDashboardScreen extends ConsumerStatefulWidget {
  const AIBrainDashboardScreen({
    super.key,
    required this.childId,
  });

  final String childId;

  @override
  ConsumerState<AIBrainDashboardScreen> createState() =>
      _AIBrainDashboardScreenState();
}

class _AIBrainDashboardScreenState
    extends ConsumerState<AIBrainDashboardScreen> {
  String? _selectedSubject;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brainStateAsync = ref.watch(aiBrainStateProvider(widget.childId));
    final subjectsAsync = ref.watch(aiSubjectsProvider(widget.childId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Learning Brain'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _showInfoDialog(context),
            tooltip: 'About AI Brain',
          ),
        ],
      ),
      body: brainStateAsync.when(
        data: (state) => _buildContent(state, subjectsAsync, theme),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => _buildErrorState(error.toString()),
      ),
    );
  }

  Widget _buildContent(
    AIBrainState state,
    AsyncValue<List<SubjectInfo>> subjectsAsync,
    ThemeData theme,
  ) {
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(aiBrainStateProvider(widget.childId));
      },
      child: CustomScrollView(
        slivers: [
          // Brain visualization header
          SliverToBoxAdapter(
            child: _buildBrainHeader(state, theme),
          ),

          // Subject selector
          subjectsAsync.when(
            data: (subjects) => SliverToBoxAdapter(
              child: _buildSubjectSelector(subjects, theme),
            ),
            loading: () => const SliverToBoxAdapter(
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
          ),

          // Current focus section
          SliverToBoxAdapter(
            child: _buildCurrentFocusSection(state, theme),
          ),

          // Confidence meter
          SliverToBoxAdapter(
            child: _buildConfidenceSection(state, theme),
          ),

          // Learning path
          SliverToBoxAdapter(
            child: _buildLearningPathSection(state, theme),
          ),

          // Recent adaptations
          SliverToBoxAdapter(
            child: _buildRecentAdaptationsSection(state, theme),
          ),

          // Active strategies
          if (state.activeStrategies.isNotEmpty)
            SliverToBoxAdapter(
              child: _buildActiveStrategiesSection(state, theme),
            ),

          const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
        ],
      ),
    );
  }

  Widget _buildBrainHeader(AIBrainState state, ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            theme.colorScheme.primaryContainer,
            theme.colorScheme.surface,
          ],
        ),
      ),
      child: Column(
        children: [
          BrainVisualization(
            focus: state.currentFocus,
            confidenceLevel: state.confidenceLevel,
            size: 180,
            onTap: () => _showFocusDetails(state.currentFocus),
          ),
          const SizedBox(height: 16),
          Text(
            'Learning with ${state.childName}',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _getFocusReasonText(state.currentFocus.reason),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubjectSelector(List<SubjectInfo> subjects, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Select Subject',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 100,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: subjects.length,
              itemBuilder: (context, index) {
                final subject = subjects[index];
                final isSelected = _selectedSubject == subject.id;
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedSubject = subject.id;
                    });
                    ref.read(selectedSubjectProvider.notifier).select(subject.id);
                  },
                  child: Container(
                    width: 100,
                    margin: const EdgeInsets.only(right: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? theme.colorScheme.primaryContainer
                          : theme.colorScheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? theme.colorScheme.primary
                            : theme.colorScheme.outline,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _getSubjectIcon(subject.iconName),
                          color: isSelected
                              ? theme.colorScheme.primary
                              : theme.colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          subject.name,
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontWeight:
                                isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        LinearProgressIndicator(
                          value: subject.progress,
                          backgroundColor:
                              theme.colorScheme.surfaceContainerHighest,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentFocusSection(AIBrainState state, ThemeData theme) {
    final focus = state.currentFocus;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.center_focus_strong, color: theme.colorScheme.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Current Focus',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildFocusDetailRow('Subject', focus.subject, Icons.school, theme),
              const SizedBox(height: 8),
              _buildFocusDetailRow('Topic', focus.topic, Icons.topic, theme),
              const SizedBox(height: 8),
              _buildFocusDetailRow('Skill', focus.skill, Icons.psychology, theme),
              if (focus.progress != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Text(
                      'Progress',
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: focus.progress,
                          backgroundColor:
                              theme.colorScheme.surfaceContainerHighest,
                          minHeight: 8,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${(focus.progress! * 100).round()}%',
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFocusDetailRow(
    String label,
    String value,
    IconData icon,
    ThemeData theme,
  ) {
    return Row(
      children: [
        Icon(icon, size: 16, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildConfidenceSection(AIBrainState state, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.insights, color: theme.colorScheme.primary),
                  const SizedBox(width: 8),
                  Text(
                    'AI Confidence',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Center(
                child: ConfidenceMeter(
                  level: state.confidenceLevel,
                  size: 150,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, size: 16, color: Colors.blue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _getConfidenceExplanation(state.confidenceLevel),
                        style: theme.textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLearningPathSection(AIBrainState state, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.route, color: theme.colorScheme.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Learning Path',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              TextButton(
                onPressed: () => _showFullLearningPath(state.learningPath),
                child: const Text('View All'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LearningPathTree(
            path: state.learningPath,
            horizontal: true,
            onNodeTap: (node) => _showNodeDetails(node),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentAdaptationsSection(AIBrainState state, ThemeData theme) {
    final adaptations = state.recentAdaptations.take(3).toList();

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.auto_fix_high, color: theme.colorScheme.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Recent Adaptations',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              TextButton(
                onPressed: () => _showAllAdaptations(),
                child: const Text('View All'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (adaptations.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'No recent adaptations',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            )
          else
            ...adaptations.map((adaptation) => AdaptationCard(
                  adaptation: adaptation,
                  compact: true,
                )),
        ],
      ),
    );
  }

  Widget _buildActiveStrategiesSection(AIBrainState state, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.lightbulb, color: Colors.amber),
              const SizedBox(width: 8),
              Text(
                'Active Learning Strategies',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: state.activeStrategies.map((strategy) {
              return Chip(
                label: Text(strategy),
                avatar: const Icon(Icons.check_circle, size: 16),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Failed to load AI brain data',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(error),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () =>
                  ref.invalidate(aiBrainStateProvider(widget.childId)),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  void _showInfoDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('About AI Learning Brain'),
        content: const SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Transparency for Parents',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'This dashboard shows you how our AI tutor is working with your child. '
                'You can see what the AI is focusing on, why it made certain decisions, '
                'and how confident it is in its approach.',
              ),
              SizedBox(height: 16),
              Text(
                'What You Can See',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                '• Current learning focus and progress\n'
                '• AI confidence level\n'
                '• Learning path and upcoming topics\n'
                '• Recent adaptations made for your child\n'
                '• Active teaching strategies',
              ),
              SizedBox(height: 16),
              Text(
                'Your Control',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'Visit AI Controls in Settings to adjust how much autonomy '
                'the AI has when teaching your child.',
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  void _showFocusDetails(AIFocus focus) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Current Focus Details',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Text('Subject: ${focus.subject}'),
            Text('Topic: ${focus.topic}'),
            Text('Skill: ${focus.skill}'),
            Text('Reason: ${_getFocusReasonText(focus.reason)}'),
            if (focus.startedAt != null)
              Text('Started: ${focus.startedAt}'),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  void _showFullLearningPath(LearningPath path) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Text(
                    'Full Learning Path',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(),
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.all(16),
                child: LearningPathTree(
                  path: path,
                  horizontal: false,
                  onNodeTap: (node) {
                    Navigator.pop(context);
                    _showNodeDetails(node);
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showNodeDetails(LearningPathNode node) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              node.topic,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Text('Status: ${node.status.name}'),
            if (node.masteryLevel != null)
              Text('Mastery: ${(node.masteryLevel! * 100).round()}%'),
            if (node.estimatedMinutes != null)
              Text('Estimated time: ${node.estimatedMinutes} min'),
            if (node.skills.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('Skills: ${node.skills.join(", ")}'),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  void _showAllAdaptations() {
    final adaptationsAsync =
        ref.watch(aiAdaptationsProvider(widget.childId, limit: 50));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Text(
                    'All Adaptations',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(),
            Expanded(
              child: adaptationsAsync.when(
                data: (adaptations) => ListView.builder(
                  controller: scrollController,
                  itemCount: adaptations.length,
                  itemBuilder: (context, index) => AdaptationCard(
                    adaptation: adaptations[index],
                    compact: false,
                  ),
                ),
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text('Error: $e')),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getFocusReasonText(FocusReason reason) {
    switch (reason) {
      case FocusReason.scheduledLesson:
        return 'Following scheduled lesson plan';
      case FocusReason.remediationNeeded:
        return 'Providing extra practice on a challenging topic';
      case FocusReason.parentRequest:
        return 'Based on your request';
      case FocusReason.teacherAssigned:
        return 'Assigned by teacher';
      case FocusReason.adaptiveRecommendation:
        return 'AI-recommended based on learning patterns';
      case FocusReason.studentChoice:
        return 'Your child chose this topic';
    }
  }

  String _getConfidenceExplanation(double level) {
    if (level >= 0.8) {
      return 'The AI has learned a lot about how your child learns best and is very confident in its approach.';
    } else if (level >= 0.6) {
      return 'The AI is developing a good understanding of your child and is adjusting its approach.';
    } else if (level >= 0.4) {
      return 'The AI is still learning about your child and trying different approaches to find what works best.';
    } else {
      return 'The AI is new to working with your child and is exploring different teaching methods.';
    }
  }

  IconData _getSubjectIcon(String iconName) {
    switch (iconName.toLowerCase()) {
      case 'math':
        return Icons.calculate;
      case 'reading':
        return Icons.menu_book;
      case 'science':
        return Icons.science;
      case 'writing':
        return Icons.edit_note;
      case 'art':
        return Icons.palette;
      case 'music':
        return Icons.music_note;
      default:
        return Icons.school;
    }
  }
}
