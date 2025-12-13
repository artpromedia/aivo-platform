/// Learner Detail Screen
///
/// Detailed view of a student including progress, observations, and actions.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

/// Learner detail model.
class LearnerDetail {
  const LearnerDetail({
    required this.id,
    required this.name,
    this.avatarUrl,
    this.grade,
    this.currentLevel,
    this.streakDays = 0,
    this.completedActivities = 0,
    this.recentSkills = const [],
    this.observations = const [],
    this.needsAttention = false,
    this.attentionReasons = const [],
  });

  final String id;
  final String name;
  final String? avatarUrl;
  final String? grade;
  final String? currentLevel;
  final int streakDays;
  final int completedActivities;
  final List<SkillProgress> recentSkills;
  final List<RecentObservation> observations;
  final bool needsAttention;
  final List<String> attentionReasons;

  factory LearnerDetail.fromJson(Map<String, dynamic> json) {
    return LearnerDetail(
      id: json['id'] as String,
      name: json['displayName'] as String? ?? json['name'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      grade: json['grade'] as String?,
      currentLevel: json['currentLevel'] as String?,
      streakDays: json['streakDays'] as int? ?? 0,
      completedActivities: json['completedActivities'] as int? ?? 0,
      recentSkills: (json['recentSkills'] as List?)
              ?.map((s) => SkillProgress.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
      observations: (json['observations'] as List?)
              ?.map((o) => RecentObservation.fromJson(o as Map<String, dynamic>))
              .toList() ??
          [],
      needsAttention: json['needsAttention'] as bool? ?? false,
      attentionReasons:
          (json['attentionReasons'] as List?)?.cast<String>() ?? [],
    );
  }
}

/// Skill progress model.
class SkillProgress {
  const SkillProgress({
    required this.skillName,
    required this.progress,
    required this.lastPracticed,
  });

  final String skillName;
  final double progress; // 0.0 to 1.0
  final DateTime lastPracticed;

  factory SkillProgress.fromJson(Map<String, dynamic> json) {
    return SkillProgress(
      skillName: json['skillName'] as String,
      progress: (json['progress'] as num).toDouble(),
      lastPracticed:
          DateTime.fromMillisecondsSinceEpoch(json['lastPracticed'] as int),
    );
  }
}

/// Recent observation model.
class RecentObservation {
  const RecentObservation({
    required this.content,
    required this.timestamp,
    required this.teacherName,
  });

  final String content;
  final DateTime timestamp;
  final String teacherName;

  factory RecentObservation.fromJson(Map<String, dynamic> json) {
    return RecentObservation(
      content: json['content'] as String,
      timestamp: DateTime.fromMillisecondsSinceEpoch(json['timestamp'] as int),
      teacherName: json['teacherName'] as String,
    );
  }
}

/// Learner detail state.
class LearnerDetailState {
  const LearnerDetailState({
    this.learner,
    this.isLoading = false,
    this.error,
  });

  final LearnerDetail? learner;
  final bool isLoading;
  final String? error;
}

/// Learner detail notifier.
class LearnerDetailNotifier extends StateNotifier<LearnerDetailState> {
  LearnerDetailNotifier() : super(const LearnerDetailState());

  Future<void> loadLearner(String learnerId) async {
    state = const LearnerDetailState(isLoading: true);

    try {
      final apiClient = AivoApiClient.instance;
      final response = await apiClient.get('/teacher-planning/learners/$learnerId/detail');
      final data = response.data as Map<String, dynamic>;

      state = LearnerDetailState(learner: LearnerDetail.fromJson(data));
    } catch (e) {
      state = LearnerDetailState(
        error: e is ApiException ? e.message : 'Failed to load student',
      );
    }
  }
}

final learnerDetailProvider = StateNotifierProvider.family<
    LearnerDetailNotifier, LearnerDetailState, String>(
  (ref, learnerId) => LearnerDetailNotifier()..loadLearner(learnerId),
);

class LearnerDetailScreen extends ConsumerWidget {
  const LearnerDetailScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(learnerDetailProvider(learnerId));

    return Scaffold(
      appBar: AppBar(
        title: Text(learnerName),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () =>
                ref.read(learnerDetailProvider(learnerId).notifier).loadLearner(learnerId),
            tooltip: 'Refresh',
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'message':
                  _sendMessage(context);
                  break;
                case 'report':
                  _viewReport(context);
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'message',
                child: ListTile(
                  leading: Icon(Icons.message),
                  title: Text('Message Parent'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'report',
                child: ListTile(
                  leading: Icon(Icons.assessment),
                  title: Text('View Full Report'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: _buildBody(context, state, ref),
    );
  }

  Widget _buildBody(BuildContext context, LearnerDetailState state, WidgetRef ref) {
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
              onPressed: () =>
                  ref.read(learnerDetailProvider(learnerId).notifier).loadLearner(learnerId),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final learner = state.learner;
    if (learner == null) {
      return const Center(child: Text('Student not found'));
    }

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(learnerDetailProvider(learnerId).notifier).loadLearner(learnerId),
      child: CustomScrollView(
        slivers: [
          // Profile header
          SliverToBoxAdapter(
            child: _ProfileHeader(learner: learner),
          ),

          // Attention alert
          if (learner.needsAttention)
            SliverToBoxAdapter(
              child: _AttentionAlert(reasons: learner.attentionReasons),
            ),

          // Stats
          SliverToBoxAdapter(
            child: _StatsRow(learner: learner),
          ),

          // Skills progress
          if (learner.recentSkills.isNotEmpty) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
                child: Text(
                  'Recent Skills',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ),
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => _SkillRow(skill: learner.recentSkills[index]),
                childCount: learner.recentSkills.length,
              ),
            ),
          ],

          // Observations
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Recent Observations',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  TextButton(
                    onPressed: () => _addObservation(context, ref),
                    child: const Text('Add'),
                  ),
                ],
              ),
            ),
          ),
          if (learner.observations.isEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Center(
                  child: Text(
                    'No observations yet',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ),
              ),
            )
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) =>
                    _ObservationCard(observation: learner.observations[index]),
                childCount: learner.observations.length,
              ),
            ),

          const SliverPadding(padding: EdgeInsets.only(bottom: 24)),
        ],
      ),
    );
  }

  void _sendMessage(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Messaging coming soon')),
    );
  }

  void _viewReport(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Full report coming soon')),
    );
  }

  void _addObservation(BuildContext context, WidgetRef ref) {
    final contentController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Add Observation',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'for $learnerName',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: contentController,
                  decoration: const InputDecoration(
                    labelText: 'Observation',
                    hintText: 'What did you observe?',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                  autofocus: true,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () {
                    if (contentController.text.isNotEmpty) {
                      // TODO: Save observation via API
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Observation saved')),
                      );
                    }
                  },
                  child: const Text('Save'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.learner});

  final LearnerDetail learner;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          CircleAvatar(
            radius: 48,
            backgroundColor: colorScheme.primaryContainer,
            backgroundImage: learner.avatarUrl != null
                ? NetworkImage(learner.avatarUrl!)
                : null,
            child: learner.avatarUrl == null
                ? Text(
                    learner.name.isNotEmpty ? learner.name[0].toUpperCase() : '?',
                    style: theme.textTheme.headlineLarge?.copyWith(
                      color: colorScheme.onPrimaryContainer,
                    ),
                  )
                : null,
          ),
          const SizedBox(height: 16),
          Text(
            learner.name,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          if (learner.grade != null || learner.currentLevel != null) ...[
            const SizedBox(height: 4),
            Text(
              [
                if (learner.grade != null) 'Grade ${learner.grade}',
                if (learner.currentLevel != null) 'Level ${learner.currentLevel}',
              ].join(' • '),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _AttentionAlert extends StatelessWidget {
  const _AttentionAlert({required this.reasons});

  final List<String> reasons;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        color: colorScheme.errorContainer,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.warning_amber,
                    color: colorScheme.onErrorContainer,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Needs Attention',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: colorScheme.onErrorContainer,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ...reasons.map((r) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      children: [
                        Icon(
                          Icons.circle,
                          size: 6,
                          color: colorScheme.onErrorContainer,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            r,
                            style: TextStyle(color: colorScheme.onErrorContainer),
                          ),
                        ),
                      ],
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.learner});

  final LearnerDetail learner;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _StatItem(
            icon: Icons.local_fire_department,
            value: '${learner.streakDays}',
            label: 'Day Streak',
            color: Colors.orange,
          ),
          _StatItem(
            icon: Icons.check_circle,
            value: '${learner.completedActivities}',
            label: 'Completed',
            color: Colors.green,
          ),
          _StatItem(
            icon: Icons.auto_awesome,
            value: '${learner.recentSkills.length}',
            label: 'Skills',
            color: Colors.purple,
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
      ],
    );
  }
}

class _SkillRow extends StatelessWidget {
  const _SkillRow({required this.skill});

  final SkillProgress skill;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(skill.skillName),
          ),
          Expanded(
            flex: 3,
            child: LinearProgressIndicator(
              value: skill.progress,
              backgroundColor: colorScheme.surfaceContainerHighest,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '${(skill.progress * 100).toInt()}%',
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

class _ObservationCard extends StatelessWidget {
  const _ObservationCard({required this.observation});

  final RecentObservation observation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.person_outline,
                    size: 16,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    observation.teacherName,
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _formatDate(observation.timestamp),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(observation.content),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays} days ago';
    return '${date.month}/${date.day}';
  }
}
