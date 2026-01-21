/// Skill Card Widget
/// 
/// Card component for displaying a life skill in grid/list views.

import 'package:flutter/material.dart';
import '../life_skills_models.dart';

/// Skill Card - displays a life skill in a card format
class SkillCard extends StatelessWidget {
  final LifeSkill skill;
  final VoidCallback? onTap;
  final double? masteryProgress;

  const SkillCard({
    super.key,
    required this.skill,
    this.onTap,
    this.masteryProgress,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail
            Expanded(
              flex: 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (skill.coverImageUrl != null)
                    Image.network(
                      skill.coverImageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _buildPlaceholder(),
                    )
                  else
                    _buildPlaceholder(),
                  
                  // Category badge
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            skill.category.icon,
                            style: const TextStyle(fontSize: 12),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            skill.category.displayName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Progress indicator
                  if (masteryProgress != null)
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: LinearProgressIndicator(
                        value: masteryProgress,
                        minHeight: 4,
                        backgroundColor: Colors.black38,
                        valueColor: AlwaysStoppedAnimation(
                          _getMasteryColor(masteryProgress!),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Content
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      skill.name,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        DifficultyChip(difficulty: skill.difficultyLevel, compact: true),
                        const Spacer(),
                        if (skill.estimatedMinutes != null)
                          Row(
                            children: [
                              Icon(
                                Icons.timer_outlined,
                                size: 14,
                                color: theme.colorScheme.onSurface.withOpacity(0.6),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${skill.estimatedMinutes}m',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: Colors.grey.shade200,
      child: Center(
        child: Text(
          skill.category.icon,
          style: const TextStyle(fontSize: 48),
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

/// Difficulty Chip - displays skill difficulty level
class DifficultyChip extends StatelessWidget {
  final DifficultyLevel difficulty;
  final bool compact;

  const DifficultyChip({
    super.key,
    required this.difficulty,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = _getColor();
    
    if (compact) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Text(
          difficulty.displayName,
          style: TextStyle(
            fontSize: 10,
            color: color,
            fontWeight: FontWeight.bold,
          ),
        ),
      );
    }

    return Chip(
      avatar: Icon(
        _getIcon(),
        size: 16,
        color: color,
      ),
      label: Text(difficulty.displayName),
      backgroundColor: color.withOpacity(0.1),
      side: BorderSide(color: color.withOpacity(0.3)),
      labelStyle: TextStyle(color: color),
    );
  }

  Color _getColor() {
    switch (difficulty) {
      case DifficultyLevel.foundational:
        return Colors.green;
      case DifficultyLevel.emerging:
        return Colors.lightGreen;
      case DifficultyLevel.developing:
        return Colors.orange;
      case DifficultyLevel.proficient:
        return Colors.blue;
      case DifficultyLevel.independent:
        return Colors.purple;
    }
  }

  IconData _getIcon() {
    switch (difficulty) {
      case DifficultyLevel.foundational:
        return Icons.sentiment_very_satisfied;
      case DifficultyLevel.emerging:
        return Icons.trending_up;
      case DifficultyLevel.developing:
        return Icons.auto_graph;
      case DifficultyLevel.proficient:
        return Icons.star;
      case DifficultyLevel.independent:
        return Icons.workspace_premium;
    }
  }
}
