import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import '../learner/effort_controller.dart';

/// My Effort Screen for Learner App
///
/// Shows a simple, motivating view of the learner's effort and progress:
/// - Daily/weekly streak
/// - Stars/badges for achievements
/// - Simple progress bar for skills mastered
///
/// Design emphasizes effort and growth, not comparison or deficits.
class MyEffortScreen extends ConsumerWidget {
  const MyEffortScreen({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(effortControllerProvider(learnerId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Effort'),
        centerTitle: true,
      ),
      body: _buildBody(context, ref, state),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, EffortState state) {
    if (state.isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading your progress...'),
          ],
        ),
      );
    }

    if (state.error != null) {
      return _ErrorView(
        error: state.error!,
        onRetry: () {
          ref.read(effortControllerProvider(learnerId).notifier).refresh();
        },
      );
    }

    final summary = state.summary;
    if (summary == null) {
      return const Center(child: Text('No data available.'));
    }

    return RefreshIndicator(
      onRefresh: () async {
        await ref.read(effortControllerProvider(learnerId).notifier).refresh();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Encouragement banner
            _EncouragementBanner(message: summary.encouragementMessage),
            const SizedBox(height: 24),

            // Streak display
            _StreakSection(
              currentStreak: summary.currentStreakDays,
              longestStreak: summary.longestStreakDays,
            ),
            const SizedBox(height: 24),

            // Quick stats row
            _QuickStatsRow(
              skillsThisMonth: summary.skillsMasteredThisMonth,
              sessionsThisWeek: summary.sessionsCountThisWeek,
            ),
            const SizedBox(height: 24),

            // Milestones/Badges
            _MilestonesSection(milestones: summary.milestones),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ENCOURAGEMENT BANNER
// ══════════════════════════════════════════════════════════════════════════════

class _EncouragementBanner extends StatelessWidget {
  const _EncouragementBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            colors.primary,
            colors.primary.withOpacity(0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: colors.primary.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Text(
        message,
        style: theme.textTheme.titleMedium?.copyWith(
          color: colors.onPrimary,
          fontWeight: FontWeight.w600,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STREAK SECTION
// ══════════════════════════════════════════════════════════════════════════════

class _StreakSection extends StatelessWidget {
  const _StreakSection({
    required this.currentStreak,
    required this.longestStreak,
  });

  final int currentStreak;
  final int longestStreak;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Current streak display
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Fire emoji/icon
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '🔥',
                      style: TextStyle(fontSize: currentStreak > 0 ? 40 : 32),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$currentStreak',
                      style: theme.textTheme.displayMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: currentStreak > 0 ? Colors.orange : colors.onSurfaceVariant,
                      ),
                    ),
                    Text(
                      'Day${currentStreak == 1 ? '' : 's'} in a row',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Streak flames visualization
            _StreakFlames(currentStreak: currentStreak),
            const SizedBox(height: 16),

            // Best streak
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: colors.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.emoji_events,
                    size: 18,
                    color: Colors.amber.shade700,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Best streak: $longestStreak day${longestStreak == 1 ? '' : 's'}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colors.onSurfaceVariant,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Visual streak flames showing recent days.
class _StreakFlames extends StatelessWidget {
  const _StreakFlames({required this.currentStreak});

  final int currentStreak;

  @override
  Widget build(BuildContext context) {
    final daysToShow = 7;
    
    return Semantics(
      label: 'Streak visualization: $currentStreak of $daysToShow days active',
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(daysToShow, (index) {
          final isActive = index < currentStreak;
          final dayNum = daysToShow - index;
          
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Tooltip(
              message: isActive ? 'Day $dayNum - Active!' : 'Day $dayNum',
              child: Container(
                width: 36,
                height: 44,
                decoration: BoxDecoration(
                  color: isActive 
                      ? Colors.orange.withOpacity(0.15) 
                      : Colors.grey.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isActive ? Colors.orange : Colors.grey.shade300,
                    width: 2,
                  ),
                ),
                child: Center(
                  child: Text(
                    isActive ? '🔥' : '⚪',
                    style: const TextStyle(fontSize: 20),
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// QUICK STATS ROW
// ══════════════════════════════════════════════════════════════════════════════

class _QuickStatsRow extends StatelessWidget {
  const _QuickStatsRow({
    required this.skillsThisMonth,
    required this.sessionsThisWeek,
  });

  final int skillsThisMonth;
  final int sessionsThisWeek;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            emoji: '⭐',
            value: skillsThisMonth.toString(),
            label: 'Skills mastered\nthis month',
            color: Colors.amber,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            emoji: '📚',
            value: sessionsThisWeek.toString(),
            label: 'Sessions\nthis week',
            color: Colors.blue,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.emoji,
    required this.value,
    required this.label,
    required this.color,
  });

  final String emoji;
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(emoji, style: const TextStyle(fontSize: 28)),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: colors.onSurface,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colors.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MILESTONES SECTION
// ══════════════════════════════════════════════════════════════════════════════

class _MilestonesSection extends StatelessWidget {
  const _MilestonesSection({required this.milestones});

  final List<Milestone> milestones;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    final achieved = milestones.where((m) => m.achieved).toList();
    final inProgress = milestones.where((m) => !m.achieved).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text('🏆', style: TextStyle(fontSize: 24)),
            const SizedBox(width: 8),
            Text(
              'Badges & Goals',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Achieved badges
        if (achieved.isNotEmpty) ...[
          Text(
            'Earned (${achieved.length})',
            style: theme.textTheme.titleSmall?.copyWith(
              color: Colors.green.shade700,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: achieved.map((m) => _BadgeChip(milestone: m)).toList(),
          ),
          const SizedBox(height: 20),
        ],

        // In-progress goals
        if (inProgress.isNotEmpty) ...[
          Text(
            'Keep Going!',
            style: theme.textTheme.titleSmall?.copyWith(
              color: colors.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          ...inProgress.map((m) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _ProgressGoalCard(milestone: m),
          )),
        ],
      ],
    );
  }
}

class _BadgeChip extends StatelessWidget {
  const _BadgeChip({required this.milestone});

  final Milestone milestone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      label: '${milestone.title} badge earned: ${milestone.description}',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.amber.withOpacity(0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.amber, width: 2),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(milestone.emoji, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 8),
            Text(
              milestone.title,
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: Colors.amber.shade800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProgressGoalCard extends StatelessWidget {
  const _ProgressGoalCard({required this.milestone});

  final Milestone milestone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final progress = milestone.progressPercent;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(milestone.emoji, style: const TextStyle(fontSize: 24)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        milestone.title,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        milestone.description,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                // Progress indicator
                if (milestone.progress != null && milestone.target != null)
                  Text(
                    '${milestone.progress}/${milestone.target}',
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: colors.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            
            // Progress bar
            Semantics(
              label: 'Progress: ${(progress * 100).round()}%',
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 8,
                  backgroundColor: colors.surfaceContainerHighest,
                  valueColor: AlwaysStoppedAnimation(
                    progress >= 1.0 ? Colors.green : colors.primary,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ERROR VIEW
// ══════════════════════════════════════════════════════════════════════════════

class _ErrorView extends StatelessWidget {
  const _ErrorView({
    required this.error,
    required this.onRetry,
  });

  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('😕', style: TextStyle(fontSize: 64)),
            const SizedBox(height: 16),
            Text(
              'Oops! Something went wrong',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}
