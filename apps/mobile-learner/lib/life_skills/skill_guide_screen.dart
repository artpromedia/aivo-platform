/// Skill Guide Screen
/// 
/// Displays a skill's task analysis and allows learners to practice step-by-step.
library;

import 'package:flutter/material.dart';
import 'life_skills_models.dart';
import 'life_skills_service.dart';
import 'step_by_step_view.dart';
import 'widgets/widgets.dart';

/// Skill Guide Screen - shows skill details and initiates practice
class SkillGuideScreen extends StatefulWidget {
  final LifeSkillsService service;
  final String tenantId;
  final String learnerId;
  final String skillId;

  const SkillGuideScreen({
    super.key,
    required this.service,
    required this.tenantId,
    required this.learnerId,
    required this.skillId,
  });

  @override
  State<SkillGuideScreen> createState() => _SkillGuideScreenState();
}

class _SkillGuideScreenState extends State<SkillGuideScreen> {
  SkillGuide? _guide;
  LearnerSkillProgress? _progress;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadGuide();
  }

  Future<void> _loadGuide() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Load skill guide - service.getSkillGuide takes positional skillId
      final guide = await widget.service.getSkillGuide(
        widget.skillId,
        learnerId: widget.learnerId,
      );

      // Get progress if available from the guide
      final progress = guide.learnerProgress;

      setState(() {
        _guide = guide;
        _progress = progress;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text('Could not load skill', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(_error ?? 'Unknown error'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadGuide,
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(ThemeData theme) {
    final skill = _guide!.skill;
    final steps = _guide!.steps;

    return CustomScrollView(
      slivers: [
        // Hero header with skill image
        SliverAppBar(
          expandedHeight: 240,
          pinned: true,
          flexibleSpace: FlexibleSpaceBar(
            title: Text(
              skill.name,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                shadows: [Shadow(color: Colors.black54, blurRadius: 4)],
              ),
            ),
            background: Stack(
              fit: StackFit.expand,
              children: [
                if (skill.coverImageUrl != null)
                  Image.network(
                    skill.coverImageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _buildPlaceholderImage(skill.category),
                  )
                else
                  _buildPlaceholderImage(skill.category),
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withOpacity(0.7),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Skill info
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Category and difficulty chips
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    Chip(
                      avatar: Text(skill.category.icon),
                      label: Text(skill.category.displayName),
                    ),
                    DifficultyChip(difficulty: skill.difficultyLevel),
                    if (skill.estimatedMinutes != null)
                      Chip(
                        avatar: const Icon(Icons.timer_outlined, size: 18),
                        label: Text('${skill.estimatedMinutes} min'),
                      ),
                  ],
                ),
                const SizedBox(height: 16),

                // Description
                Text(
                  skill.description,
                  style: theme.textTheme.bodyLarge,
                ),
                const SizedBox(height: 24),

                // Progress section
                if (_progress != null) ...[
                  Text(
                    'Your Progress',
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 12),
                  ProgressIndicatorCard(
                    progress: _progress!,
                    totalSteps: steps.length,
                  ),
                  const SizedBox(height: 24),
                ],

                // AI Encouragement
                if (_progress != null)
                  FutureBuilder<Encouragement>(
                    future: widget.service.getEncouragement(
                      tenantId: widget.tenantId,
                      learnerId: widget.learnerId,
                      skillId: widget.skillId,
                      event: 'VIEW_SKILL_GUIDE',
                    ),
                    builder: (context, snapshot) {
                      if (snapshot.hasData) {
                        return EncouragementCard(encouragement: snapshot.data!);
                      }
                      return const SizedBox.shrink();
                    },
                  ),
                const SizedBox(height: 24),

                // Task analysis
                Text(
                  'Steps to Learn',
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'This skill is broken into ${steps.length} easy steps:',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withOpacity(0.7),
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),

        // Steps list
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final step = steps[index];
              // Step progress is embedded in the step from the guide
              final stepProgress = step.learnerProgress;

              return StepListTile(
                step: step,
                stepNumber: index + 1,
                totalSteps: steps.length,
                progress: stepProgress,
              );
            },
            childCount: steps.length,
          ),
        ),

        // Bottom padding for FAB
        const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
      ],
    );
  }

  Widget _buildPlaceholderImage(SkillCategory category) {
    return Container(
      color: Colors.blueGrey.shade100,
      child: Center(
        child: Text(
          category.icon,
          style: const TextStyle(fontSize: 64),
        ),
      ),
    );
  }

  void _startPractice() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => StepByStepView(
          service: widget.service,
          tenantId: widget.tenantId,
          learnerId: widget.learnerId,
          guide: _guide!,
          existingProgress: _progress,
        ),
      ),
    ).then((_) => _loadGuide());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorView()
              : _buildContent(theme),
      floatingActionButton: _guide != null
          ? FloatingActionButton.extended(
              onPressed: _startPractice,
              icon: const Icon(Icons.play_arrow),
              label: Text(_progress != null ? 'Continue Practice' : 'Start Learning'),
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }
}

/// Progress Indicator Card - shows current progress for a skill
class ProgressIndicatorCard extends StatelessWidget {
  final LearnerSkillProgress progress;
  final int totalSteps;

  const ProgressIndicatorCard({
    super.key,
    required this.progress,
    required this.totalSteps,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final masteryPercent = (progress.masteryPercent * 100).round();
    final completedSteps = progress.stepsCompleted;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Mastery',
                        style: theme.textTheme.bodySmall,
                      ),
                      Text(
                        '$masteryPercent%',
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: _getMasteryColor(progress.masteryPercent),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Steps Completed',
                        style: theme.textTheme.bodySmall,
                      ),
                      Text(
                        '$completedSteps / $totalSteps',
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                if (progress.currentStreak > 0)
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Streak 🔥',
                          style: theme.textTheme.bodySmall,
                        ),
                        Text(
                          '${progress.currentStreak} days',
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.orange,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: progress.masteryPercent,
                minHeight: 8,
                backgroundColor: theme.colorScheme.surfaceContainerHighest,
                valueColor: AlwaysStoppedAnimation(_getMasteryColor(progress.masteryPercent)),
              ),
            ),
            if (progress.totalSessions > 0) ...[
              const SizedBox(height: 8),
              Text(
                'Total sessions: ${progress.totalSessions}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _getMasteryColor(double mastery) {
    if (mastery >= 0.8) return Colors.green;
    if (mastery >= 0.5) return Colors.orange;
    return Colors.blue;
  }
}
