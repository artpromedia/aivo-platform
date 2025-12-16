/// Engagement UI widgets for XP, streaks, badges
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../engagement/models.dart';
import '../engagement/providers.dart';

/// XP progress bar widget
class XpProgressBar extends StatelessWidget {
  const XpProgressBar({
    super.key,
    required this.level,
    required this.xpProgress,
    required this.xpNeeded,
    required this.progressPercent,
    this.showLabel = true,
    this.compact = false,
  });

  final int level;
  final int xpProgress;
  final int xpNeeded;
  final int progressPercent;
  final bool showLabel;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showLabel)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Level $level',
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.primary,
                  ),
                ),
                Text(
                  '$xpProgress / $xpNeeded XP',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ClipRRect(
          borderRadius: BorderRadius.circular(compact ? 4 : 8),
          child: LinearProgressIndicator(
            value: progressPercent / 100,
            minHeight: compact ? 6 : 12,
            backgroundColor: colorScheme.surfaceContainerHighest,
            valueColor: AlwaysStoppedAnimation(colorScheme.primary),
          ),
        ),
      ],
    );
  }
}

/// Streak indicator widget
class StreakIndicator extends StatelessWidget {
  const StreakIndicator({
    super.key,
    required this.streakDays,
    this.maxStreak,
    this.showFlame = true,
    this.compact = false,
  });

  final int streakDays;
  final int? maxStreak;
  final bool showFlame;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    if (streakDays == 0) {
      return const SizedBox.shrink();
    }

    final streakColor = streakDays >= 7
        ? Colors.orange
        : streakDays >= 3
            ? Colors.amber
            : colorScheme.primary;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 12,
        vertical: compact ? 4 : 8,
      ),
      decoration: BoxDecoration(
        color: streakColor.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(compact ? 8 : 12),
        border: Border.all(color: streakColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showFlame)
            Text(
              '🔥',
              style: TextStyle(fontSize: compact ? 16 : 20),
            ),
          if (showFlame) SizedBox(width: compact ? 4 : 6),
          Text(
            '$streakDays day${streakDays == 1 ? '' : 's'}',
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: streakColor,
              fontSize: compact ? 12 : 14,
            ),
          ),
        ],
      ),
    );
  }
}

/// Progress ring for plan completion
class ProgressRing extends StatelessWidget {
  const ProgressRing({
    super.key,
    required this.progress,
    required this.total,
    this.size = 80,
    this.strokeWidth = 8,
    this.showLabel = true,
  });

  final int progress;
  final int total;
  final double size;
  final double strokeWidth;
  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final percent = total > 0 ? progress / total : 0.0;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox.expand(
            child: CircularProgressIndicator(
              value: percent,
              strokeWidth: strokeWidth,
              backgroundColor: colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation(
                percent >= 1.0 ? Colors.green : colorScheme.primary,
              ),
            ),
          ),
          if (showLabel)
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$progress',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'of $total',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

/// Engagement summary card for Today screen
class EngagementSummaryCard extends ConsumerWidget {
  const EngagementSummaryCard({
    super.key,
    required this.tenantId,
    required this.learnerId,
  });

  final String tenantId;
  final String learnerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(
      engagementProfileProvider((tenantId: tenantId, learnerId: learnerId)),
    );

    return profileAsync.when(
      loading: () => const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: CircularProgressIndicator()),
        ),
      ),
      error: (_, __) => const SizedBox.shrink(),
      data: (profile) => _buildCard(context, profile),
    );
  }

  Widget _buildCard(BuildContext context, EngagementProfile profile) {
    final theme = Theme.of(context);

    // Respect user preferences
    if (!profile.showXp && !profile.showStreaks) {
      return const SizedBox.shrink();
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (profile.showXp) ...[
              XpProgressBar(
                level: profile.level,
                xpProgress: profile.xpProgress,
                xpNeeded: profile.xpNeeded,
                progressPercent: profile.progressPercent,
              ),
              const SizedBox(height: 12),
            ],
            if (profile.showStreaks && profile.currentStreakDays > 0)
              Row(
                children: [
                  StreakIndicator(
                    streakDays: profile.currentStreakDays,
                    maxStreak: profile.maxStreakDays,
                  ),
                  const Spacer(),
                  if (profile.xpToday > 0)
                    Text(
                      '+${profile.xpToday} XP today',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: Colors.green,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

/// Badge grid for displaying earned badges
class BadgeGrid extends StatelessWidget {
  const BadgeGrid({
    super.key,
    required this.badges,
    this.onBadgeTap,
    this.crossAxisCount = 3,
  });

  final List<LearnerBadge> badges;
  final void Function(LearnerBadge)? onBadgeTap;
  final int crossAxisCount;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: badges.length,
      itemBuilder: (context, index) {
        final badge = badges[index];
        return BadgeItem(
          badge: badge,
          onTap: onBadgeTap != null ? () => onBadgeTap!(badge) : null,
        );
      },
    );
  }
}

/// Individual badge item
class BadgeItem extends StatelessWidget {
  const BadgeItem({
    super.key,
    required this.badge,
    this.onTap,
    this.isNew = false,
  });

  final LearnerBadge badge;
  final VoidCallback? onTap;
  final bool isNew;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return GestureDetector(
      onTap: onTap,
      child: Stack(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerLow,
              borderRadius: BorderRadius.circular(12),
              border: isNew
                  ? Border.all(color: Colors.amber, width: 2)
                  : null,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Badge icon (placeholder - would use actual asset)
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: _categoryColor(badge.category),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _categoryIcon(badge.category),
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  badge.badgeName,
                  style: theme.textTheme.labelSmall,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (isNew)
            Positioned(
              top: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.amber,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'NEW',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                    fontSize: 8,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Color _categoryColor(BadgeCategory category) {
    switch (category) {
      case BadgeCategory.effort:
        return Colors.blue;
      case BadgeCategory.consistency:
        return Colors.orange;
      case BadgeCategory.focus:
        return Colors.purple;
      case BadgeCategory.collaboration:
        return Colors.green;
      case BadgeCategory.growth:
        return Colors.teal;
      case BadgeCategory.milestone:
        return Colors.amber;
    }
  }

  IconData _categoryIcon(BadgeCategory category) {
    switch (category) {
      case BadgeCategory.effort:
        return Icons.fitness_center;
      case BadgeCategory.consistency:
        return Icons.local_fire_department;
      case BadgeCategory.focus:
        return Icons.center_focus_strong;
      case BadgeCategory.collaboration:
        return Icons.people;
      case BadgeCategory.growth:
        return Icons.trending_up;
      case BadgeCategory.milestone:
        return Icons.emoji_events;
    }
  }
}

/// Kudos card
class KudosCard extends StatelessWidget {
  const KudosCard({
    super.key,
    required this.kudos,
  });

  final Kudos kudos;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: colorScheme.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  kudos.emoji ?? _roleEmoji(kudos.fromRole),
                  style: const TextStyle(fontSize: 20),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    kudos.fromName ?? _roleName(kudos.fromRole),
                    style: theme.textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    kudos.message,
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _roleEmoji(String role) {
    switch (role) {
      case 'PARENT':
        return '👨‍👩‍👧';
      case 'TEACHER':
        return '👩‍🏫';
      case 'THERAPIST':
        return '🩺';
      default:
        return '⭐';
    }
  }

  String _roleName(String role) {
    switch (role) {
      case 'PARENT':
        return 'Parent';
      case 'TEACHER':
        return 'Teacher';
      case 'THERAPIST':
        return 'Therapist';
      case 'SYSTEM':
        return 'Aivo';
      default:
        return 'Someone';
    }
  }
}
