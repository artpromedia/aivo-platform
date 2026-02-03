/// Decision Log Tile Widget
///
/// Tile showing AI decision details.
library;

import 'package:flutter/material.dart';

import '../models/ai_brain_state.dart';

/// Tile displaying an AI decision.
class DecisionLogTile extends StatelessWidget {
  const DecisionLogTile({
    super.key,
    required this.decision,
    this.onTap,
  });

  final AIDecision decision;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getDecisionColor(decision.decisionType);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _getDecisionIcon(decision.decisionType),
                      color: color,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _getDecisionTitle(decision.decisionType),
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          _formatRelativeTime(decision.timestamp),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (decision.outcome != null)
                    _OutcomeBadge(outcome: decision.outcome!),
                ],
              ),
              const SizedBox(height: 12),
              // Context
              if (decision.context.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'What happened',
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        decision.context,
                        style: theme.textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 8),
              // Rationale
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.psychology,
                    size: 16,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      decision.rationale,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
              if (decision.confidenceScore != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      'Confidence: ',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    _ConfidenceIndicator(score: decision.confidenceScore!),
                  ],
                ),
              ],
              if (decision.alternatives.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  'Other options considered:',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: decision.alternatives.map((alt) {
                    return Chip(
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      label: Text(alt, style: const TextStyle(fontSize: 11)),
                      padding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  IconData _getDecisionIcon(DecisionType type) {
    switch (type) {
      case DecisionType.contentSelection:
        return Icons.library_books;
      case DecisionType.difficultyLevel:
        return Icons.tune;
      case DecisionType.feedbackType:
        return Icons.feedback;
      case DecisionType.hintProvision:
        return Icons.lightbulb;
      case DecisionType.topicTransition:
        return Icons.swap_horiz;
      case DecisionType.assessmentTiming:
        return Icons.quiz;
      case DecisionType.breakRecommendation:
        return Icons.free_breakfast;
      case DecisionType.parentAlert:
        return Icons.family_restroom;
      case DecisionType.teacherNotification:
        return Icons.school;
    }
  }

  Color _getDecisionColor(DecisionType type) {
    switch (type) {
      case DecisionType.contentSelection:
        return Colors.blue;
      case DecisionType.difficultyLevel:
        return Colors.orange;
      case DecisionType.feedbackType:
        return Colors.green;
      case DecisionType.hintProvision:
        return Colors.amber;
      case DecisionType.topicTransition:
        return Colors.indigo;
      case DecisionType.assessmentTiming:
        return Colors.purple;
      case DecisionType.breakRecommendation:
        return Colors.brown;
      case DecisionType.parentAlert:
        return Colors.pink;
      case DecisionType.teacherNotification:
        return Colors.teal;
    }
  }

  String _getDecisionTitle(DecisionType type) {
    switch (type) {
      case DecisionType.contentSelection:
        return 'Selected Learning Content';
      case DecisionType.difficultyLevel:
        return 'Set Difficulty Level';
      case DecisionType.feedbackType:
        return 'Chose Feedback Approach';
      case DecisionType.hintProvision:
        return 'Provided Hint';
      case DecisionType.topicTransition:
        return 'Changed Topic';
      case DecisionType.assessmentTiming:
        return 'Assessment Decision';
      case DecisionType.breakRecommendation:
        return 'Suggested Break';
      case DecisionType.parentAlert:
        return 'Sent Parent Update';
      case DecisionType.teacherNotification:
        return 'Notified Teacher';
    }
  }

  String _formatRelativeTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
    }
  }
}

/// Outcome badge for decision.
class _OutcomeBadge extends StatelessWidget {
  const _OutcomeBadge({required this.outcome});

  final DecisionOutcome outcome;

  @override
  Widget build(BuildContext context) {
    final color = outcome.successful ? Colors.green : Colors.orange;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            outcome.successful ? Icons.check : Icons.info,
            size: 14,
            color: color,
          ),
          const SizedBox(width: 4),
          Text(
            outcome.successful ? 'Worked' : 'Adjusting',
            style: TextStyle(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Confidence score indicator.
class _ConfidenceIndicator extends StatelessWidget {
  const _ConfidenceIndicator({required this.score});

  final double score;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _getColor(score);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 60,
          height: 6,
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(3),
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: score,
            child: Container(
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          '${(score * 100).round()}%',
          style: theme.textTheme.bodySmall?.copyWith(
            color: color,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Color _getColor(double score) {
    if (score >= 0.8) return Colors.green;
    if (score >= 0.6) return Colors.blue;
    if (score >= 0.4) return Colors.orange;
    return Colors.red;
  }
}

/// List of decision log tiles.
class DecisionLogList extends StatelessWidget {
  const DecisionLogList({
    super.key,
    required this.decisions,
    this.onItemTap,
  });

  final List<AIDecision> decisions;
  final void Function(AIDecision)? onItemTap;

  @override
  Widget build(BuildContext context) {
    if (decisions.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Center(
          child: Column(
            children: [
              Icon(Icons.history, size: 48, color: Colors.grey),
              const SizedBox(height: 8),
              Text(
                'No decision history',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: decisions.length,
      itemBuilder: (context, index) {
        return DecisionLogTile(
          decision: decisions[index],
          onTap: onItemTap != null ? () => onItemTap!(decisions[index]) : null,
        );
      },
    );
  }
}
