import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import '../plan/plan_service.dart';

/// A card widget showing difficulty recommendations for a learner.
class DifficultyRecommendationCard extends ConsumerWidget {
  const DifficultyRecommendationCard({
    super.key,
    required this.learner,
  });

  final Learner learner;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recommendationAsync = ref.watch(difficultyRecommendationProvider(learner.id));

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: recommendationAsync.when(
        data: (recommendation) => _buildContent(context, recommendation),
        loading: () => const Padding(
          padding: EdgeInsets.all(24),
          child: Center(child: CircularProgressIndicator()),
        ),
        error: (err, _) => _buildError(context, err.toString(), ref),
      ),
    );
  }

  Widget _buildContent(BuildContext context, DifficultyRecommendationResponse recommendation) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              CircleAvatar(
                backgroundColor: theme.colorScheme.primaryContainer,
                child: Text(
                  learner.name.substring(0, 1).toUpperCase(),
                  style: TextStyle(color: theme.colorScheme.onPrimaryContainer),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      learner.name,
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'Difficulty Recommendation',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              _OverallRecommendationChip(recommendation: recommendation.recommendation),
            ],
          ),

          const SizedBox(height: 12),
          _buildOverallSummary(context, recommendation),
        ],
      ),
    );
  }

  Widget _buildOverallSummary(BuildContext context, DifficultyRecommendationResponse recommendation) {
    final theme = Theme.of(context);
    final message = _getRecommendationMessage(recommendation);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _getRecommendationColor(recommendation.recommendation).withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                _getRecommendationIcon(recommendation.recommendation),
                color: _getRecommendationColor(recommendation.recommendation),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  message,
                  style: theme.textTheme.bodyMedium,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              _StatChip(label: 'Mastery', value: recommendation.masteryPercentage),
              _StatChip(label: 'Suggested Level', value: recommendation.suggestedDifficultyLevel.toString()),
              if (recommendation.scopeDomain != null)
                _StatChip(label: 'Domain', value: recommendation.scopeDomain!),
              if (recommendation.scopeSkillCode != null)
                _StatChip(label: 'Skill', value: recommendation.scopeSkillCode!),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            recommendation.reason,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          if (recommendation.recentPerformance != null) ...[
            const SizedBox(height: 8),
            Text(
              'Recent accuracy: ${recommendation.recentPerformance!.percentageLabel} '
              '(${recommendation.recentPerformance!.correctCount}/${recommendation.recentPerformance!.totalAttempts})',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }

  String _getRecommendationMessage(DifficultyRecommendationResponse rec) {
    final masteryPct = rec.masteryPercentage;
    final targetLevel = rec.suggestedDifficultyLevel;

    switch (rec.recommendation) {
      case DifficultyRecommendation.harder:
        return '${learner.name} is doing great ($masteryPct). Try level $targetLevel for more challenge.';
      case DifficultyRecommendation.easier:
        return '${learner.name} may need a lighter load ($masteryPct). Ease to level $targetLevel.';
      case DifficultyRecommendation.same:
        return '${learner.name} is well placed ($masteryPct). Stay at level $targetLevel.';
    }
  }

  Widget _buildError(BuildContext context, String error, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
            child: Text(
              learner.name.substring(0, 1).toUpperCase(),
              style: TextStyle(color: Theme.of(context).colorScheme.onPrimaryContainer),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(learner.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(
                  'Unable to load recommendations',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                    fontSize: 12,
                  ),
                ),
                Text(error, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(difficultyRecommendationProvider(learner.id)),
          ),
        ],
      ),
    );
  }

  IconData _getRecommendationIcon(DifficultyRecommendation rec) {
    switch (rec) {
      case DifficultyRecommendation.harder:
        return Icons.trending_up;
      case DifficultyRecommendation.easier:
        return Icons.trending_down;
      case DifficultyRecommendation.same:
        return Icons.trending_flat;
    }
  }

  Color _getRecommendationColor(DifficultyRecommendation rec) {
    switch (rec) {
      case DifficultyRecommendation.harder:
        return Colors.green;
      case DifficultyRecommendation.easier:
        return Colors.orange;
      case DifficultyRecommendation.same:
        return Colors.blue;
    }
  }
}

/// Chip showing overall recommendation.
class _OverallRecommendationChip extends StatelessWidget {
  const _OverallRecommendationChip({required this.recommendation});

  final DifficultyRecommendation recommendation;

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: Icon(
        _getIcon(),
        size: 16,
        color: _getColor(),
      ),
      label: Text(
        _getLabel(),
        style: TextStyle(
          color: _getColor(),
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
      ),
      backgroundColor: _getColor().withOpacity(0.1),
      side: BorderSide.none,
      padding: const EdgeInsets.symmetric(horizontal: 4),
    );
  }

  IconData _getIcon() {
    switch (recommendation) {
      case DifficultyRecommendation.harder:
        return Icons.arrow_upward;
      case DifficultyRecommendation.easier:
        return Icons.arrow_downward;
      case DifficultyRecommendation.same:
        return Icons.check;
    }
  }

  String _getLabel() {
    switch (recommendation) {
      case DifficultyRecommendation.harder:
        return 'Try Harder';
      case DifficultyRecommendation.easier:
        return 'Go Easier';
      case DifficultyRecommendation.same:
        return 'Keep Same';
    }
  }

  Color _getColor() {
    switch (recommendation) {
      case DifficultyRecommendation.harder:
        return Colors.green;
      case DifficultyRecommendation.easier:
        return Colors.orange;
      case DifficultyRecommendation.same:
        return Colors.blue;
    }
  }
}

/// Small stat chip used in the summary row.
class _StatChip extends StatelessWidget {
  const _StatChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.6),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: theme.textTheme.bodySmall),
          const SizedBox(width: 6),
          Text(value, style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
