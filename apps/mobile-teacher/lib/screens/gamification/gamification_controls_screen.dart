/// Gamification Controls Screen
///
/// Screen for managing gamification settings and challenges.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/gamification.dart';
import '../../providers/gamification_provider.dart';

/// Main screen for gamification controls.
class GamificationControlsScreen extends ConsumerStatefulWidget {
  const GamificationControlsScreen({
    super.key,
    required this.classId,
  });

  final String classId;

  @override
  ConsumerState<GamificationControlsScreen> createState() =>
      _GamificationControlsScreenState();
}

class _GamificationControlsScreenState
    extends ConsumerState<GamificationControlsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(challengesProvider(widget.classId).notifier).loadChallenges();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(gamificationSettingsNotifierProvider(widget.classId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gamification'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Settings'),
            Tab(text: 'Challenges'),
            Tab(text: 'Leaderboard'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _SettingsTab(classId: widget.classId, settingsAsync: settingsAsync),
          _ChallengesTab(classId: widget.classId),
          _LeaderboardTab(classId: widget.classId),
        ],
      ),
      floatingActionButton: _tabController.index == 1
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/gamification/${widget.classId}/challenges/new'),
              icon: const Icon(Icons.add),
              label: const Text('New Challenge'),
            )
          : null,
    );
  }
}

/// Settings tab.
class _SettingsTab extends ConsumerWidget {
  const _SettingsTab({required this.classId, required this.settingsAsync});

  final String classId;
  final AsyncValue<GamificationSettings> settingsAsync;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return settingsAsync.when(
      data: (settings) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Feature toggles
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Features',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                _FeatureToggle(
                  title: 'Points System',
                  subtitle: 'Award points for activities',
                  icon: Icons.stars,
                  value: settings.pointsEnabled,
                  onChanged: (v) => ref
                      .read(gamificationSettingsNotifierProvider(classId).notifier)
                      .toggleFeature('points', v),
                ),
                _FeatureToggle(
                  title: 'Badges',
                  subtitle: 'Award badges for achievements',
                  icon: Icons.military_tech,
                  value: settings.badgesEnabled,
                  onChanged: (v) => ref
                      .read(gamificationSettingsNotifierProvider(classId).notifier)
                      .toggleFeature('badges', v),
                ),
                _FeatureToggle(
                  title: 'Leaderboard',
                  subtitle: 'Show class rankings',
                  icon: Icons.leaderboard,
                  value: settings.leaderboardEnabled,
                  onChanged: (v) => ref
                      .read(gamificationSettingsNotifierProvider(classId).notifier)
                      .toggleFeature('leaderboard', v),
                ),
                _FeatureToggle(
                  title: 'Streaks',
                  subtitle: 'Track daily learning streaks',
                  icon: Icons.local_fire_department,
                  value: settings.streaksEnabled,
                  onChanged: (v) => ref
                      .read(gamificationSettingsNotifierProvider(classId).notifier)
                      .toggleFeature('streaks', v),
                ),
                _FeatureToggle(
                  title: 'Levels',
                  subtitle: 'Students level up with XP',
                  icon: Icons.trending_up,
                  value: settings.levelsEnabled,
                  onChanged: (v) => ref
                      .read(gamificationSettingsNotifierProvider(classId).notifier)
                      .toggleFeature('levels', v),
                ),
                _FeatureToggle(
                  title: 'Challenges',
                  subtitle: 'Class-wide challenges',
                  icon: Icons.emoji_events,
                  value: settings.challengesEnabled,
                  onChanged: (v) => ref
                      .read(gamificationSettingsNotifierProvider(classId).notifier)
                      .toggleFeature('challenges', v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Point values
          if (settings.pointsEnabled)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Point Values',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _PointValueRow(
                      label: 'Per Lesson',
                      value: settings.pointsPerLesson,
                    ),
                    _PointValueRow(
                      label: 'Per Quiz',
                      value: settings.pointsPerQuiz,
                    ),
                    _PointValueRow(
                      label: 'Perfect Score Bonus',
                      value: settings.pointsPerPerfectScore,
                    ),
                    _PointValueRow(
                      label: 'Streak Bonus',
                      value: settings.streakBonus,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
    );
  }
}

/// Feature toggle widget.
class _FeatureToggle extends StatelessWidget {
  const _FeatureToggle({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.value,
    required this.onChanged,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      secondary: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
      value: value,
      onChanged: onChanged,
    );
  }
}

/// Point value row.
class _PointValueRow extends StatelessWidget {
  const _PointValueRow({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              '+$value',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Challenges tab.
class _ChallengesTab extends ConsumerWidget {
  const _ChallengesTab({required this.classId});

  final String classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(challengesProvider(classId));

    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.challenges.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.emoji_events, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text('No challenges yet', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            const Text('Create a challenge to motivate your class!'),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(challengesProvider(classId).notifier).loadChallenges(),
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: state.challenges.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final challenge = state.challenges[index];
          return _ChallengeCard(challenge: challenge, classId: classId);
        },
      ),
    );
  }
}

/// Challenge card.
class _ChallengeCard extends ConsumerWidget {
  const _ChallengeCard({required this.challenge, required this.classId});

  final ClassChallenge challenge;
  final String classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final color = _getStatusColor(challenge.status);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.emoji_events, color: color),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    challenge.title,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Chip(
                  label: Text(challenge.type.label),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            if (challenge.description != null) ...[
              const SizedBox(height: 8),
              Text(challenge.description!),
            ],
            const SizedBox(height: 12),
            LinearProgressIndicator(
              value: challenge.completionPercentage / 100,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${challenge.completionPercentage.toStringAsFixed(0)}% complete',
                  style: theme.textTheme.bodySmall,
                ),
                Text(
                  '${challenge.participants.length} participants',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(ChallengeStatus status) {
    switch (status) {
      case ChallengeStatus.draft:
        return Colors.grey;
      case ChallengeStatus.scheduled:
        return Colors.blue;
      case ChallengeStatus.active:
        return Colors.green;
      case ChallengeStatus.completed:
        return Colors.teal;
      case ChallengeStatus.cancelled:
        return Colors.red;
    }
  }
}

/// Leaderboard tab.
class _LeaderboardTab extends ConsumerWidget {
  const _LeaderboardTab({required this.classId});

  final String classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leaderboardAsync = ref.watch(leaderboardProvider(classId));
    final theme = Theme.of(context);

    return leaderboardAsync.when(
      data: (entries) {
        if (entries.isEmpty) {
          return const Center(child: Text('No leaderboard data yet'));
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: entries.length,
          itemBuilder: (context, index) {
            final entry = entries[index];
            final isTop3 = entry.rank <= 3;

            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: isTop3 ? _getRankColor(entry.rank) : null,
                  child: Text(
                    '${entry.rank}',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isTop3 ? Colors.white : null,
                    ),
                  ),
                ),
                title: Text(entry.studentName),
                subtitle: Row(
                  children: [
                    if (entry.level != null) ...[
                      Icon(Icons.trending_up, size: 14),
                      Text(' Lv.${entry.level}'),
                      const SizedBox(width: 8),
                    ],
                    if (entry.streak != null && entry.streak! > 0) ...[
                      Icon(Icons.local_fire_department, size: 14, color: Colors.orange),
                      Text(' ${entry.streak}d'),
                    ],
                  ],
                ),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${entry.points}',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text('points', style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
    );
  }

  Color _getRankColor(int rank) {
    switch (rank) {
      case 1:
        return Colors.amber;
      case 2:
        return Colors.grey.shade400;
      case 3:
        return Colors.brown.shade300;
      default:
        return Colors.blue;
    }
  }
}
