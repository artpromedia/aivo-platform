/// Achievement Card Widget
///
/// Displays an achievement with its icon, progress, and rarity
library;

import 'package:flutter/material.dart';
import '../gamification_models.dart';

/// Card displaying a single achievement
class AchievementCard extends StatelessWidget {
  /// The achievement to display
  final Achievement achievement;

  /// Callback when card is tapped
  final VoidCallback? onTap;

  /// Whether to show in compact mode
  final bool compact;

  const AchievementCard({
    super.key,
    required this.achievement,
    this.onTap,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isLocked = !achievement.earned && achievement.currentProgress == 0;

    if (compact) {
      return _buildCompactCard(context, theme, isLocked);
    }

    return _buildFullCard(context, theme, isLocked);
  }

  Widget _buildCompactCard(BuildContext context, ThemeData theme, bool isLocked) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 80,
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isLocked ? Colors.grey.shade100 : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isLocked ? Colors.grey.shade300 : achievement.rarityColor.withOpacity(0.5),
            width: 2,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildIcon(isLocked, size: 36),
            const SizedBox(height: 4),
            Text(
              achievement.name,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: isLocked ? Colors.grey : Colors.black87,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFullCard(BuildContext context, ThemeData theme, bool isLocked) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: achievement.rarityColor.withOpacity(isLocked ? 0.3 : 0.7),
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: isLocked
                  ? Colors.grey.withOpacity(0.1)
                  : achievement.rarityColor.withOpacity(0.15),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Icon
            _buildIcon(isLocked, size: 48),
            const SizedBox(width: 12),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name and rarity
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          achievement.name,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: isLocked ? Colors.grey : Colors.black87,
                          ),
                        ),
                      ),
                      _RarityBadge(rarity: achievement.rarity),
                    ],
                  ),
                  const SizedBox(height: 4),
                  // Description
                  Text(
                    achievement.description,
                    style: TextStyle(
                      fontSize: 12,
                      color: isLocked ? Colors.grey : Colors.grey.shade600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  // Progress bar (if in progress)
                  if (achievement.isInProgress) ...[
                    const SizedBox(height: 8),
                    _ProgressBar(
                      progress: achievement.progress,
                      color: achievement.rarityColor,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${achievement.currentProgress} / ${achievement.targetProgress}',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                  // Earned date
                  if (achievement.earned && achievement.earnedAt != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.check_circle,
                          size: 14,
                          color: Colors.green.shade600,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Earned ${_formatDate(achievement.earnedAt!)}',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.green.shade600,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIcon(bool isLocked, {required double size}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isLocked ? Colors.grey.shade200 : achievement.rarityColor.withOpacity(0.15),
        border: Border.all(
          color: isLocked ? Colors.grey.shade300 : achievement.rarityColor.withOpacity(0.5),
          width: 2,
        ),
      ),
      child: Center(
        child: isLocked
            ? Icon(Icons.lock, size: size * 0.5, color: Colors.grey.shade400)
            : Text(
                achievement.icon,
                style: TextStyle(fontSize: size * 0.5),
              ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'today';
    } else if (difference.inDays == 1) {
      return 'yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return '${date.month}/${date.day}/${date.year}';
    }
  }
}

class _RarityBadge extends StatelessWidget {
  final AchievementRarity rarity;

  const _RarityBadge({required this.rarity});

  String get _label {
    switch (rarity) {
      case AchievementRarity.common:
        return 'Common';
      case AchievementRarity.uncommon:
        return 'Uncommon';
      case AchievementRarity.rare:
        return 'Rare';
      case AchievementRarity.epic:
        return 'Epic';
      case AchievementRarity.legendary:
        return 'Legendary';
    }
  }

  Color get _color {
    switch (rarity) {
      case AchievementRarity.common:
        return Colors.grey;
      case AchievementRarity.uncommon:
        return Colors.green;
      case AchievementRarity.rare:
        return Colors.blue;
      case AchievementRarity.epic:
        return Colors.purple;
      case AchievementRarity.legendary:
        return Colors.amber;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        _label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: _color,
        ),
      ),
    );
  }
}

class _ProgressBar extends StatelessWidget {
  final double progress;
  final Color color;

  const _ProgressBar({
    required this.progress,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 6,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(3),
      ),
      child: FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: progress.clamp(0, 1),
        child: Container(
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
      ),
    );
  }
}

/// Grid of achievements with filtering
class AchievementGrid extends StatelessWidget {
  /// List of achievements to display
  final List<Achievement> achievements;

  /// Callback when an achievement is tapped
  final void Function(Achievement)? onAchievementTap;

  /// Number of columns in the grid
  final int crossAxisCount;

  const AchievementGrid({
    super.key,
    required this.achievements,
    this.onAchievementTap,
    this.crossAxisCount = 2,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.85,
      ),
      itemCount: achievements.length,
      itemBuilder: (context, index) {
        final achievement = achievements[index];
        return AchievementCard(
          achievement: achievement,
          onTap: () => onAchievementTap?.call(achievement),
        );
      },
    );
  }
}
