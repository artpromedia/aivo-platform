/// Aivo Challenge Card
///
/// Challenge card widgets with difficulty indicators, rewards, and progress.
/// Standardized design matching web patterns.
library;

import 'package:flutter/material.dart';

import '../../theme/aivo_brand.dart';
import '../../theme/aivo_motion.dart';
import '../../theme/aivo_theme.dart';
import 'aivo_gamification_colors.dart';

// ══════════════════════════════════════════════════════════════════════════════
// DIFFICULTY BADGE
// ══════════════════════════════════════════════════════════════════════════════

/// Badge showing challenge difficulty level.
///
/// Colors:
/// - Easy: Mint (green)
/// - Medium: Sunshine (yellow)
/// - Hard: Coral (red)
/// - Expert: Purple
class AivoDifficultyBadge extends StatelessWidget {
  const AivoDifficultyBadge({
    super.key,
    required this.difficulty,
    this.showLabel = true,
    this.compact = false,
  });

  /// Difficulty level.
  final Difficulty difficulty;

  /// Whether to show text label.
  final bool showLabel;

  /// Compact mode.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = AivoGamificationColors.difficultyColor(difficulty);

    final icon = switch (difficulty) {
      Difficulty.easy => Icons.sentiment_satisfied_rounded,
      Difficulty.medium => Icons.sentiment_neutral_rounded,
      Difficulty.hard => Icons.sentiment_dissatisfied_rounded,
      Difficulty.expert => Icons.local_fire_department_rounded,
    };

    final label = switch (difficulty) {
      Difficulty.easy => 'Easy',
      Difficulty.medium => 'Medium',
      Difficulty.hard => 'Hard',
      Difficulty.expert => 'Expert',
    };

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 6 : 10,
        vertical: compact ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(compact ? 8 : 12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: compact ? 14 : 18,
            color: color,
          ),
          if (showLabel) ...[
            const SizedBox(width: 4),
            Text(
              label,
              style: (compact
                      ? theme.textTheme.labelSmall
                      : theme.textTheme.labelMedium)
                  ?.copyWith(
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHALLENGE TYPE BADGE
// ══════════════════════════════════════════════════════════════════════════════

/// Badge showing challenge type (Daily, Weekly, etc.)
class AivoChallengeTypeBadge extends StatelessWidget {
  const AivoChallengeTypeBadge({
    super.key,
    required this.type,
    this.compact = false,
  });

  /// Challenge type.
  final ChallengeType type;

  /// Compact mode.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = AivoGamificationColors.challengeTypeColor(type);

    final icon = switch (type) {
      ChallengeType.daily => Icons.today_rounded,
      ChallengeType.weekly => Icons.date_range_rounded,
      ChallengeType.monthly => Icons.calendar_month_rounded,
      ChallengeType.special => Icons.auto_awesome_rounded,
    };

    final label = switch (type) {
      ChallengeType.daily => 'Daily',
      ChallengeType.weekly => 'Weekly',
      ChallengeType.monthly => 'Monthly',
      ChallengeType.special => 'Special',
    };

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 6 : 10,
        vertical: compact ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(compact ? 8 : 12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: compact ? 14 : 18,
            color: color,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: (compact
                    ? theme.textTheme.labelSmall
                    : theme.textTheme.labelMedium)
                ?.copyWith(
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REWARD PREVIEW
// ══════════════════════════════════════════════════════════════════════════════

/// Preview of challenge rewards (XP, coins, items).
class AivoChallengeRewardPreview extends StatelessWidget {
  const AivoChallengeRewardPreview({
    super.key,
    this.xpReward,
    this.coinReward,
    this.badgeReward,
    this.compact = false,
  });

  /// XP reward amount.
  final int? xpReward;

  /// Coin reward amount.
  final int? coinReward;

  /// Badge reward.
  final String? badgeReward;

  /// Compact mode.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final children = <Widget>[];

    if (xpReward != null && xpReward! > 0) {
      children.add(_buildReward(
        icon: Icons.star_rounded,
        value: '+$xpReward XP',
        color: AivoGamificationColors.xpPrimary,
        theme: theme,
      ));
    }

    if (coinReward != null && coinReward! > 0) {
      if (children.isNotEmpty) {
        children.add(SizedBox(width: compact ? 8 : 12));
      }
      children.add(_buildReward(
        icon: Icons.monetization_on_rounded,
        value: '+$coinReward',
        color: AivoGamificationColors.coinGold,
        theme: theme,
      ));
    }

    if (badgeReward != null) {
      if (children.isNotEmpty) {
        children.add(SizedBox(width: compact ? 8 : 12));
      }
      children.add(_buildReward(
        icon: Icons.emoji_events_rounded,
        value: badgeReward!,
        color: AivoGamificationColors.badgeGold,
        theme: theme,
      ));
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: children,
    );
  }

  Widget _buildReward({
    required IconData icon,
    required String value,
    required Color color,
    required ThemeData theme,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: compact ? 14 : 16,
          color: color,
        ),
        const SizedBox(width: 2),
        Text(
          value,
          style: (compact
                  ? theme.textTheme.labelSmall
                  : theme.textTheme.labelMedium)
              ?.copyWith(
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHALLENGE PROGRESS BAR
// ══════════════════════════════════════════════════════════════════════════════

/// Progress bar for challenge completion.
class AivoChallengeProgressBar extends StatelessWidget {
  const AivoChallengeProgressBar({
    super.key,
    required this.progress,
    required this.total,
    this.color,
    this.height = 8,
    this.showLabel = true,
    this.gradeBand,
  });

  /// Current progress.
  final int progress;

  /// Total required.
  final int total;

  /// Override color.
  final Color? color;

  /// Bar height.
  final double height;

  /// Whether to show progress label.
  final bool showLabel;

  /// Grade band.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradeBand = this.gradeBand ?? AivoTheme.gradeBandOf(context);
    final effectiveColor = color ?? AivoGamificationColors.xpPrimary;
    final percent = (progress / total).clamp(0.0, 1.0);

    return Row(
      children: [
        Expanded(
          child: Container(
            height: height,
            decoration: BoxDecoration(
              color: effectiveColor.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(height / 2),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(height / 2),
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: percent),
                duration: AivoMotion.durationFor(gradeBand).base,
                builder: (context, value, _) {
                  return FractionallySizedBox(
                    widthFactor: value,
                    alignment: Alignment.centerLeft,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            effectiveColor,
                            effectiveColor.withValues(alpha: 0.8),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ),
        if (showLabel) ...[
          const SizedBox(width: 8),
          Text(
            '$progress/$total',
            style: theme.textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: effectiveColor,
              fontFeatures: [const FontFeature.tabularFigures()],
            ),
          ),
        ],
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHALLENGE CARD
// ══════════════════════════════════════════════════════════════════════════════

/// Full challenge card with all details.
///
/// Features:
/// - Challenge type badge
/// - Difficulty indicator
/// - Title and description
/// - Progress tracking
/// - Reward preview
/// - Time remaining
class AivoChallengeCard extends StatelessWidget {
  const AivoChallengeCard({
    super.key,
    required this.title,
    required this.description,
    required this.difficulty,
    required this.type,
    this.progress,
    this.progressTotal,
    this.xpReward,
    this.coinReward,
    this.badgeReward,
    this.timeRemaining,
    this.isCompleted = false,
    this.isLocked = false,
    this.icon,
    this.onTap,
    this.gradeBand,
  });

  /// Challenge title.
  final String title;

  /// Challenge description.
  final String description;

  /// Difficulty level.
  final Difficulty difficulty;

  /// Challenge type.
  final ChallengeType type;

  /// Current progress.
  final int? progress;

  /// Total required.
  final int? progressTotal;

  /// XP reward.
  final int? xpReward;

  /// Coin reward.
  final int? coinReward;

  /// Badge reward.
  final String? badgeReward;

  /// Time remaining.
  final Duration? timeRemaining;

  /// Whether challenge is completed.
  final bool isCompleted;

  /// Whether challenge is locked.
  final bool isLocked;

  /// Challenge icon.
  final IconData? icon;

  /// Callback when tapped.
  final VoidCallback? onTap;

  /// Grade band.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradeBand = this.gradeBand ?? AivoTheme.gradeBandOf(context);

    final borderRadius = switch (gradeBand) {
      AivoGradeBand.k5 => AivoBrand.radiusLg,
      AivoGradeBand.g6_8 => AivoBrand.radiusMd,
      AivoGradeBand.g9_12 => AivoBrand.radiusSm,
    };

    final typeColor = AivoGamificationColors.challengeTypeColor(type);
    final hasProgress = progress != null && progressTotal != null;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isLocked ? null : onTap,
        borderRadius: BorderRadius.circular(borderRadius),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isLocked
                ? theme.colorScheme.surfaceContainerLow
                : isCompleted
                    ? typeColor.withValues(alpha: 0.05)
                    : theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: isCompleted
                  ? typeColor.withValues(alpha: 0.5)
                  : isLocked
                      ? theme.colorScheme.outline.withValues(alpha: 0.2)
                      : theme.colorScheme.outline.withValues(alpha: 0.3),
              width: isCompleted ? 2 : 1,
            ),
            boxShadow: isLocked || isCompleted
                ? null
                : [
                    BoxShadow(
                      color: theme.shadowColor.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                children: [
                  // Challenge icon
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: typeColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: isLocked
                        ? Icon(
                            Icons.lock_rounded,
                            color: theme.colorScheme.onSurfaceVariant,
                          )
                        : isCompleted
                            ? Icon(
                                Icons.check_circle_rounded,
                                color: typeColor,
                              )
                            : Icon(
                                icon ?? Icons.flag_rounded,
                                color: typeColor,
                              ),
                  ),

                  const SizedBox(width: 12),

                  // Title and type
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: isLocked
                                ? theme.colorScheme.onSurfaceVariant
                                : null,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            AivoChallengeTypeBadge(
                              type: type,
                              compact: true,
                            ),
                            const SizedBox(width: 8),
                            AivoDifficultyBadge(
                              difficulty: difficulty,
                              compact: true,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Time remaining
                  if (timeRemaining != null && !isCompleted && !isLocked) ...[
                    _TimeRemainingBadge(duration: timeRemaining!),
                  ],
                ],
              ),

              const SizedBox(height: 12),

              // Description
              Text(
                description,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),

              const SizedBox(height: 12),

              // Progress or completion status
              if (hasProgress && !isCompleted) ...[
                AivoChallengeProgressBar(
                  progress: progress!,
                  total: progressTotal!,
                  color: typeColor,
                  gradeBand: gradeBand,
                ),
                const SizedBox(height: 12),
              ],

              // Rewards row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  AivoChallengeRewardPreview(
                    xpReward: xpReward,
                    coinReward: coinReward,
                    badgeReward: badgeReward,
                    compact: true,
                  ),
                  if (isCompleted)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AivoGamificationColors.celebrationSuccess
                            .withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.check_rounded,
                            size: 16,
                            color: AivoGamificationColors.celebrationSuccess,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Completed',
                            style: theme.textTheme.labelSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: AivoGamificationColors.celebrationSuccess,
                            ),
                          ),
                        ],
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

/// Time remaining badge.
class _TimeRemainingBadge extends StatelessWidget {
  const _TimeRemainingBadge({required this.duration});

  final Duration duration;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;

    final isUrgent = duration.inHours < 2;

    String text;
    if (duration.inDays > 0) {
      text = '${duration.inDays}d';
    } else if (hours > 0) {
      text = '${hours}h ${minutes}m';
    } else {
      text = '${minutes}m';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isUrgent
            ? theme.colorScheme.errorContainer
            : theme.colorScheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.timer_rounded,
            size: 14,
            color: isUrgent
                ? theme.colorScheme.error
                : theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 4),
          Text(
            text,
            style: theme.textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: isUrgent
                  ? theme.colorScheme.error
                  : theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHALLENGE LIST
// ══════════════════════════════════════════════════════════════════════════════

/// List of challenge cards with filtering.
class AivoChallengeList extends StatelessWidget {
  const AivoChallengeList({
    super.key,
    required this.challenges,
    this.filter,
    this.onChallengeTap,
    this.gradeBand,
  });

  /// List of challenges.
  final List<ChallengeData> challenges;

  /// Filter by challenge type.
  final ChallengeType? filter;

  /// Callback when challenge is tapped.
  final void Function(ChallengeData)? onChallengeTap;

  /// Grade band.
  final AivoGradeBand? gradeBand;

  @override
  Widget build(BuildContext context) {
    final filteredChallenges = filter == null
        ? challenges
        : challenges.where((c) => c.type == filter).toList();

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: filteredChallenges.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final challenge = filteredChallenges[index];
        return AivoChallengeCard(
          title: challenge.title,
          description: challenge.description,
          difficulty: challenge.difficulty,
          type: challenge.type,
          progress: challenge.progress,
          progressTotal: challenge.progressTotal,
          xpReward: challenge.xpReward,
          coinReward: challenge.coinReward,
          badgeReward: challenge.badgeReward,
          timeRemaining: challenge.timeRemaining,
          isCompleted: challenge.isCompleted,
          isLocked: challenge.isLocked,
          icon: challenge.icon,
          onTap: () => onChallengeTap?.call(challenge),
          gradeBand: gradeBand,
        );
      },
    );
  }
}

/// Data model for challenges.
class ChallengeData {
  const ChallengeData({
    required this.id,
    required this.title,
    required this.description,
    required this.difficulty,
    required this.type,
    this.progress,
    this.progressTotal,
    this.xpReward,
    this.coinReward,
    this.badgeReward,
    this.timeRemaining,
    this.isCompleted = false,
    this.isLocked = false,
    this.icon,
  });

  final String id;
  final String title;
  final String description;
  final Difficulty difficulty;
  final ChallengeType type;
  final int? progress;
  final int? progressTotal;
  final int? xpReward;
  final int? coinReward;
  final String? badgeReward;
  final Duration? timeRemaining;
  final bool isCompleted;
  final bool isLocked;
  final IconData? icon;
}
