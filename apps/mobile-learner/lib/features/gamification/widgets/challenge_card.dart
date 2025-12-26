/// Challenge Card Widget
///
/// Displays active challenges with progress and time remaining
library;

import 'package:flutter/material.dart';
import '../gamification_models.dart';

/// Card displaying a single challenge
class ChallengeCard extends StatelessWidget {
  /// The challenge to display
  final Challenge challenge;

  /// Callback when card is tapped
  final VoidCallback? onTap;

  /// Whether to show in compact mode
  final bool compact;

  const ChallengeCard({
    super.key,
    required this.challenge,
    this.onTap,
    this.compact = false,
  });

  Color get _typeColor {
    switch (challenge.type) {
      case ChallengeType.daily:
        return Colors.blue;
      case ChallengeType.weekly:
        return Colors.purple;
      case ChallengeType.monthly:
        return Colors.teal;
      case ChallengeType.special:
        return Colors.amber;
    }
  }

  String get _typeLabel {
    switch (challenge.type) {
      case ChallengeType.daily:
        return 'Daily';
      case ChallengeType.weekly:
        return 'Weekly';
      case ChallengeType.monthly:
        return 'Monthly';
      case ChallengeType.special:
        return 'Special';
    }
  }

  String _formatTimeRemaining(Duration duration) {
    if (duration.isNegative) return 'Expired';
    
    if (duration.inDays > 0) {
      return '${duration.inDays}d ${duration.inHours % 24}h';
    } else if (duration.inHours > 0) {
      return '${duration.inHours}h ${duration.inMinutes % 60}m';
    } else {
      return '${duration.inMinutes}m';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (compact) {
      return _buildCompactCard(context, theme);
    }

    return _buildFullCard(context, theme);
  }

  Widget _buildCompactCard(BuildContext context, ThemeData theme) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: challenge.isCompleted ? Colors.green.shade50 : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: challenge.isCompleted ? Colors.green.shade300 : _typeColor.withOpacity(0.3),
          ),
        ),
        child: Row(
          children: [
            // Icon
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _typeColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: challenge.isCompleted
                    ? Icon(Icons.check, color: Colors.green.shade600)
                    : Text(challenge.icon, style: const TextStyle(fontSize: 20)),
              ),
            ),
            const SizedBox(width: 12),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    challenge.title,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  LinearProgressIndicator(
                    value: challenge.progress.clamp(0, 1),
                    backgroundColor: Colors.grey.shade200,
                    valueColor: AlwaysStoppedAnimation(
                      challenge.isCompleted ? Colors.green : _typeColor,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            // Progress text
            Text(
              '${challenge.currentProgress}/${challenge.targetProgress}',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: _typeColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFullCard(BuildContext context, ThemeData theme) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: challenge.isCompleted
                ? [Colors.green.shade50, Colors.green.shade100]
                : [_typeColor.withOpacity(0.05), _typeColor.withOpacity(0.1)],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: challenge.isCompleted ? Colors.green.shade300 : _typeColor.withOpacity(0.3),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _typeColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _typeLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const Spacer(),
                Icon(Icons.access_time, size: 14, color: Colors.grey.shade600),
                const SizedBox(width: 4),
                Text(
                  _formatTimeRemaining(challenge.timeRemaining),
                  style: TextStyle(
                    fontSize: 12,
                    color: challenge.timeRemaining.inHours < 1
                        ? Colors.red
                        : Colors.grey.shade600,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Icon and title
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: _typeColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: challenge.isCompleted
                        ? Icon(Icons.check_circle, color: Colors.green.shade600, size: 28)
                        : Text(challenge.icon, style: const TextStyle(fontSize: 24)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        challenge.title,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        challenge.description,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Progress bar
            Container(
              height: 8,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(4),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: challenge.progress.clamp(0, 1),
                child: Container(
                  decoration: BoxDecoration(
                    color: challenge.isCompleted ? Colors.green : _typeColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Progress and rewards
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${challenge.currentProgress} / ${challenge.targetProgress}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _typeColor,
                  ),
                ),
                Row(
                  children: [
                    if (challenge.xpReward > 0) ...[
                      const Icon(Icons.star, size: 14, color: Colors.amber),
                      const SizedBox(width: 2),
                      Text(
                        '+${challenge.xpReward} XP',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.amber,
                        ),
                      ),
                    ],
                    if (challenge.coinReward > 0) ...[
                      const SizedBox(width: 8),
                      const Icon(Icons.monetization_on, size: 14, color: Colors.yellow),
                      const SizedBox(width: 2),
                      Text(
                        '+${challenge.coinReward}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.yellow.shade700,
                        ),
                      ),
                    ],
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

/// List of challenges
class ChallengeList extends StatelessWidget {
  /// List of challenges to display
  final List<Challenge> challenges;

  /// Callback when a challenge is tapped
  final void Function(Challenge)? onChallengeTap;

  const ChallengeList({
    super.key,
    required this.challenges,
    this.onChallengeTap,
  });

  @override
  Widget build(BuildContext context) {
    if (challenges.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('🎯', style: TextStyle(fontSize: 48)),
            SizedBox(height: 16),
            Text(
              'No active challenges',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Check back later for new challenges!',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: challenges.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final challenge = challenges[index];
        return ChallengeCard(
          challenge: challenge,
          onTap: () => onChallengeTap?.call(challenge),
        );
      },
    );
  }
}
