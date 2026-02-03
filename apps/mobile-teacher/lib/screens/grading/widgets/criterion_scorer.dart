/// Criterion Scorer Widget
///
/// Widget for scoring a single criterion during grading.
library;

import 'package:flutter/material.dart';

import '../../../models/rubric.dart';
import 'performance_level_tile.dart';

/// Widget for scoring a criterion.
class CriterionScorer extends StatelessWidget {
  const CriterionScorer({
    super.key,
    required this.criterion,
    required this.score,
    required this.onScoreChanged,
    this.aiSuggestion,
    this.expanded = false,
    this.onExpandChanged,
  });

  final RubricCriterion criterion;
  final CriterionScore? score;
  final ValueChanged<CriterionScore> onScoreChanged;
  final CriterionScore? aiSuggestion;
  final bool expanded;
  final ValueChanged<bool>? onExpandChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasScore = score != null;
    final selectedLevel = score?.levelId != null
        ? criterion.levels.firstWhere(
            (l) => l.id == score!.levelId,
            orElse: () => criterion.levels.first,
          )
        : null;

    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: hasScore
              ? _getScoreColor(score!.score, criterion.maxPoints)
              : Colors.transparent,
          width: hasScore ? 2 : 0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          InkWell(
            onTap: onExpandChanged != null
                ? () => onExpandChanged!(!expanded)
                : null,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          criterion.name,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (criterion.description != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            criterion.description!,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                            maxLines: expanded ? null : 1,
                            overflow: expanded ? null : TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Score display
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: hasScore
                          ? _getScoreColor(score!.score, criterion.maxPoints)
                              .withValues(alpha: 0.1)
                          : theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      children: [
                        Text(
                          hasScore
                              ? score!.score.toStringAsFixed(
                                  score!.score.truncateToDouble() == score!.score
                                      ? 0
                                      : 1,
                                )
                              : '-',
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: hasScore
                                ? _getScoreColor(score!.score, criterion.maxPoints)
                                : theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        Text(
                          '/ ${criterion.maxPoints.toStringAsFixed(criterion.maxPoints.truncateToDouble() == criterion.maxPoints ? 0 : 1)}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (onExpandChanged != null) ...[
                    const SizedBox(width: 8),
                    Icon(
                      expanded ? Icons.expand_less : Icons.expand_more,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ],
                ],
              ),
            ),
          ),
          // AI suggestion banner
          if (aiSuggestion != null && !hasScore) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Colors.purple.withValues(alpha: 0.05),
              child: Row(
                children: [
                  Icon(Icons.auto_awesome, size: 16, color: Colors.purple),
                  const SizedBox(width: 8),
                  Text(
                    'AI suggests: ${aiSuggestion!.score.toStringAsFixed(1)} points',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.purple,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => onScoreChanged(aiSuggestion!),
                    child: const Text('Apply'),
                  ),
                ],
              ),
            ),
          ],
          // Quick level selector (always visible)
          if (!expanded) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: LevelQuickSelector(
                levels: criterion.levels,
                selectedLevelId: score?.levelId,
                onLevelSelected: (level) {
                  onScoreChanged(CriterionScore(
                    criterionId: criterion.id,
                    score: level.points,
                    levelId: level.id,
                    comment: score?.comment,
                  ));
                },
              ),
            ),
          ],
          // Expanded content
          if (expanded) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Select Performance Level',
                    style: theme.textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  PerformanceLevelGrid(
                    levels: criterion.levels,
                    selectedLevelId: score?.levelId,
                    aiSuggestedLevelId: aiSuggestion?.levelId,
                    onLevelSelected: (level) {
                      onScoreChanged(CriterionScore(
                        criterionId: criterion.id,
                        score: level.points,
                        levelId: level.id,
                        comment: score?.comment,
                      ));
                    },
                  ),
                  const SizedBox(height: 16),
                  // Custom score option
                  Text(
                    'Or enter custom score',
                    style: theme.textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _CustomScoreInput(
                    currentScore: score?.score,
                    maxScore: criterion.maxPoints,
                    onScoreChanged: (customScore) {
                      onScoreChanged(CriterionScore(
                        criterionId: criterion.id,
                        score: customScore,
                        levelId: null, // Clear level when using custom score
                        comment: score?.comment,
                      ));
                    },
                  ),
                  const SizedBox(height: 16),
                  // Comment field
                  Text(
                    'Feedback for this criterion',
                    style: theme.textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: TextEditingController(text: score?.comment ?? ''),
                    decoration: const InputDecoration(
                      hintText: 'Add specific feedback...',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 3,
                    onChanged: (value) {
                      if (score != null) {
                        onScoreChanged(score!.copyWith(
                          comment: value.isEmpty ? null : value,
                        ));
                      }
                    },
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _getScoreColor(double score, double maxScore) {
    final ratio = score / maxScore;
    if (ratio >= 0.9) return Colors.green;
    if (ratio >= 0.7) return Colors.blue;
    if (ratio >= 0.5) return Colors.orange;
    if (ratio >= 0.25) return Colors.deepOrange;
    return Colors.red;
  }
}

/// Custom score input.
class _CustomScoreInput extends StatefulWidget {
  const _CustomScoreInput({
    required this.currentScore,
    required this.maxScore,
    required this.onScoreChanged,
  });

  final double? currentScore;
  final double maxScore;
  final ValueChanged<double> onScoreChanged;

  @override
  State<_CustomScoreInput> createState() => _CustomScoreInputState();
}

class _CustomScoreInputState extends State<_CustomScoreInput> {
  late TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(
      text: widget.currentScore?.toStringAsFixed(1) ?? '',
    );
  }

  @override
  void didUpdateWidget(covariant _CustomScoreInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentScore != widget.currentScore) {
      _controller.text = widget.currentScore?.toStringAsFixed(1) ?? '';
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            decoration: InputDecoration(
              hintText: '0 - ${widget.maxScore.toStringAsFixed(0)}',
              border: const OutlineInputBorder(),
              isDense: true,
              suffixText: '/ ${widget.maxScore.toStringAsFixed(0)}',
            ),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onSubmitted: _handleSubmit,
          ),
        ),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: () => _handleSubmit(_controller.text),
          child: const Text('Set'),
        ),
      ],
    );
  }

  void _handleSubmit(String value) {
    final score = double.tryParse(value);
    if (score != null && score >= 0 && score <= widget.maxScore) {
      widget.onScoreChanged(score);
    }
  }
}

/// Summary of all criterion scores.
class CriterionScoresSummary extends StatelessWidget {
  const CriterionScoresSummary({
    super.key,
    required this.criteria,
    required this.scores,
  });

  final List<RubricCriterion> criteria;
  final Map<String, CriterionScore> scores;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totalScore = scores.values.fold(0.0, (sum, s) => sum + s.score);
    final maxScore = criteria.fold(0.0, (sum, c) => sum + c.maxPoints);
    final percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0.0;
    final scoredCount = scores.length;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Total Score',
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      Text(
                        '${totalScore.toStringAsFixed(1)} / ${maxScore.toStringAsFixed(0)}',
                        style: theme.textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 80,
                  height: 80,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CircularProgressIndicator(
                        value: percentage / 100,
                        strokeWidth: 8,
                        backgroundColor: theme.colorScheme.surfaceContainerHighest,
                        valueColor: AlwaysStoppedAnimation(
                          _getScoreColor(percentage),
                        ),
                      ),
                      Text(
                        '${percentage.round()}%',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            LinearProgressIndicator(
              value: scoredCount / criteria.length,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
            ),
            const SizedBox(height: 4),
            Text(
              '$scoredCount of ${criteria.length} criteria scored',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getScoreColor(double percentage) {
    if (percentage >= 90) return Colors.green;
    if (percentage >= 80) return Colors.blue;
    if (percentage >= 70) return Colors.orange;
    if (percentage >= 60) return Colors.deepOrange;
    return Colors.red;
  }
}
