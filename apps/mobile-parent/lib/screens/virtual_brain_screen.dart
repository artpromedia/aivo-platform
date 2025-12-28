/// Virtual Brain Dashboard Screen
///
/// Shows the learner's Virtual Brain visualization and stats.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

/// Virtual Brain data model.
class VirtualBrainData {
  const VirtualBrainData({
    required this.learnerId,
    required this.overallMastery,
    required this.skills,
    this.recentActivity = const [],
    this.recommendations = const [],
  });

  final String learnerId;
  final double overallMastery;
  final List<SkillMastery> skills;
  final List<RecentActivity> recentActivity;
  final List<Recommendation> recommendations;

  factory VirtualBrainData.fromJson(Map<String, dynamic> json) {
    return VirtualBrainData(
      learnerId: json['learnerId'] as String,
      overallMastery: (json['overallMastery'] as num?)?.toDouble() ?? 0.0,
      skills: (json['skills'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map((s) => SkillMastery.fromJson(s))
          .toList(),
      recentActivity: (json['recentActivity'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map((a) => RecentActivity.fromJson(a))
          .toList(),
      recommendations: (json['recommendations'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map((r) => Recommendation.fromJson(r))
          .toList(),
    );
  }
}

class SkillMastery {
  const SkillMastery({
    required this.skillId,
    required this.skillName,
    required this.subject,
    required this.mastery,
    this.trend,
  });

  final String skillId;
  final String skillName;
  final String subject;
  final double mastery;
  final double? trend;

  factory SkillMastery.fromJson(Map<String, dynamic> json) {
    return SkillMastery(
      skillId: json['skillId'] as String,
      skillName: json['skillName'] as String,
      subject: json['subject'] as String? ?? 'General',
      mastery: (json['mastery'] as num?)?.toDouble() ?? 0.0,
      trend: (json['trend'] as num?)?.toDouble(),
    );
  }
}

class RecentActivity {
  const RecentActivity({
    required this.date,
    required this.description,
    required this.type,
    this.duration,
  });

  final DateTime date;
  final String description;
  final String type;
  final Duration? duration;

  factory RecentActivity.fromJson(Map<String, dynamic> json) {
    return RecentActivity(
      date: DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
      description: json['description'] as String,
      type: json['type'] as String? ?? 'activity',
      duration: json['durationMinutes'] != null
          ? Duration(minutes: json['durationMinutes'] as int)
          : null,
    );
  }
}

class Recommendation {
  const Recommendation({
    required this.id,
    required this.title,
    required this.description,
    required this.priority,
    this.skillId,
  });

  final String id;
  final String title;
  final String description;
  final String priority;
  final String? skillId;

  factory Recommendation.fromJson(Map<String, dynamic> json) {
    return Recommendation(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      priority: json['priority'] as String? ?? 'medium',
      skillId: json['skillId'] as String?,
    );
  }
}

// Provider for Virtual Brain data
final virtualBrainProvider = FutureProvider.family<VirtualBrainData?, String>((ref, learnerId) async {
  final apiClient = AivoApiClient.instance;
  try {
    final response = await apiClient.get(ApiEndpoints.learnerVirtualBrain(learnerId));
    final data = response.data as Map<String, dynamic>?;
    if (data == null) return null;
    return VirtualBrainData.fromJson(data);
  } catch (e) {
    debugPrint('[VirtualBrainProvider] Error loading data: $e');
    return null;
  }
});

class VirtualBrainScreen extends ConsumerWidget {
  const VirtualBrainScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final brainDataAsync = ref.watch(virtualBrainProvider(learnerId));

    return Scaffold(
      appBar: AppBar(
        title: Text('$learnerName\'s Virtual Brain'),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            tooltip: 'What is Virtual Brain?',
            onPressed: () => _showInfoDialog(context),
          ),
        ],
      ),
      body: brainDataAsync.when(
        data: (brainData) {
          if (brainData == null) {
            return const Center(
              child: Text('No data available yet. Complete some activities first!'),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(virtualBrainProvider(learnerId));
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Overall mastery card
                  _OverallMasteryCard(mastery: brainData.overallMastery),
                  const SizedBox(height: 24),

                  // Skills by subject
                  Text(
                    'Skills Progress',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _SkillsGrid(skills: brainData.skills),
                  const SizedBox(height: 24),

                  // Recommendations
                  if (brainData.recommendations.isNotEmpty) ...[
                    Text(
                      'Recommendations',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...brainData.recommendations.map((r) => _RecommendationCard(
                      recommendation: r,
                      onAccept: () {
                        // Handle accept recommendation
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Recommendation accepted!')),
                        );
                      },
                      onDecline: () {
                        // Handle decline recommendation
                      },
                    )),
                    const SizedBox(height: 24),
                  ],

                  // Recent activity
                  Text(
                    'Recent Activity',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (brainData.recentActivity.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Center(
                          child: Text(
                            'No recent activity',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ),
                    )
                  else
                    ...brainData.recentActivity.map((a) => _ActivityTile(activity: a)),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              const Text('Failed to load Virtual Brain data'),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => ref.invalidate(virtualBrainProvider(learnerId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showInfoDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('What is Virtual Brain?'),
        content: const Text(
          'The Virtual Brain is a visualization of your child\'s learning progress. '
          'It shows mastery levels for different skills and subjects, helping you '
          'understand where they excel and where they might need more practice.\n\n'
          'The brain "grows" as your child masters new skills and concepts through '
          'their learning activities.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }
}

class _OverallMasteryCard extends StatelessWidget {
  const _OverallMasteryCard({required this.mastery});

  final double mastery;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final percentage = (mastery * 100).round();

    return Card(
      color: colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Text(
              'Overall Mastery',
              style: theme.textTheme.titleMedium?.copyWith(
                color: colorScheme.onPrimaryContainer,
              ),
            ),
            const SizedBox(height: 16),
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 120,
                  height: 120,
                  child: CircularProgressIndicator(
                    value: mastery,
                    strokeWidth: 12,
                    backgroundColor: colorScheme.onPrimaryContainer.withOpacity(0.2),
                    valueColor: AlwaysStoppedAnimation(colorScheme.onPrimaryContainer),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.psychology,
                      size: 32,
                      color: colorScheme.onPrimaryContainer,
                    ),
                    Text(
                      '$percentage%',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SkillsGrid extends StatelessWidget {
  const _SkillsGrid({required this.skills});

  final List<SkillMastery> skills;

  @override
  Widget build(BuildContext context) {
    // Group skills by subject
    final bySubject = <String, List<SkillMastery>>{};
    for (final skill in skills) {
      bySubject.putIfAbsent(skill.subject, () => []).add(skill);
    }

    return Column(
      children: bySubject.entries.map((entry) {
        return _SubjectSection(subject: entry.key, skills: entry.value);
      }).toList(),
    );
  }
}

class _SubjectSection extends StatelessWidget {
  const _SubjectSection({required this.subject, required this.skills});

  final String subject;
  final List<SkillMastery> skills;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final subjectColor = switch (subject.toLowerCase()) {
      'ela' || 'reading' || 'english' => Colors.blue,
      'math' || 'mathematics' => Colors.orange,
      'science' => Colors.green,
      'sel' || 'social-emotional' => Colors.purple,
      _ => colorScheme.primary,
    };

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 4,
                  height: 24,
                  decoration: BoxDecoration(
                    color: subjectColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  subject,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...skills.map((skill) => _SkillProgress(
              skill: skill,
              color: subjectColor,
            )),
          ],
        ),
      ),
    );
  }
}

class _SkillProgress extends StatelessWidget {
  const _SkillProgress({required this.skill, required this.color});

  final SkillMastery skill;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final percentage = (skill.mastery * 100).round();

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  skill.skillName,
                  style: theme.textTheme.bodyMedium,
                ),
              ),
              Row(
                children: [
                  Text(
                    '$percentage%',
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (skill.trend != null) ...[
                    const SizedBox(width: 4),
                    Icon(
                      skill.trend! > 0 ? Icons.trending_up : Icons.trending_down,
                      size: 16,
                      color: skill.trend! > 0 ? Colors.green : Colors.red,
                    ),
                  ],
                ],
              ),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: skill.mastery,
              backgroundColor: colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation(color),
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }
}

class _RecommendationCard extends StatelessWidget {
  const _RecommendationCard({
    required this.recommendation,
    required this.onAccept,
    required this.onDecline,
  });

  final Recommendation recommendation;
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final priorityColor = switch (recommendation.priority.toLowerCase()) {
      'high' => colorScheme.error,
      'medium' => colorScheme.tertiary,
      _ => colorScheme.primary,
    };

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.lightbulb_outline, color: priorityColor),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    recommendation.title,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              recommendation.description,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: onDecline,
                  child: const Text('Decline'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: onAccept,
                  child: const Text('Accept'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({required this.activity});

  final RecentActivity activity;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final icon = switch (activity.type.toLowerCase()) {
      'baseline' => Icons.assessment,
      'lesson' => Icons.school,
      'practice' => Icons.edit,
      'focus_break' => Icons.spa,
      _ => Icons.play_circle_outline,
    };

    final timeAgo = _formatTimeAgo(activity.date);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: colorScheme.primary),
        title: Text(activity.description),
        subtitle: Text(
          activity.duration != null
              ? '$timeAgo • ${activity.duration!.inMinutes} min'
              : timeAgo,
        ),
      ),
    );
  }

  String _formatTimeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inDays > 7) {
      return '${date.month}/${date.day}';
    } else if (diff.inDays > 0) {
      return '${diff.inDays}d ago';
    } else if (diff.inHours > 0) {
      return '${diff.inHours}h ago';
    } else if (diff.inMinutes > 0) {
      return '${diff.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}
