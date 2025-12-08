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
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
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
              _OverallRecommendationChip(recommendation: recommendation.overall),
            ],
          ),
          
          const Divider(height: 24),
          
          // Overall summary
          _buildOverallSummary(context, recommendation),
          
          const SizedBox(height: 16),
          
          // Domain breakdown (collapsed by default)
          ExpansionTile(
            title: Text(
              'By Subject',
              style: theme.textTheme.titleSmall,
            ),
            tilePadding: EdgeInsets.zero,
            childrenPadding: const EdgeInsets.only(top: 8),
            children: recommendation.byDomain.entries.map((entry) {
              return _DomainRecommendationTile(
                domain: entry.key,
                recommendation: entry.value,
              );
            }).toList(),
          ),
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
        color: _getRecommendationColor(recommendation.overall).withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            _getRecommendationIcon(recommendation.overall),
            color: _getRecommendationColor(recommendation.overall),
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
    );
  }

  String _getRecommendationMessage(DifficultyRecommendationResponse rec) {
    switch (rec.overall) {
      case DifficultyRecommendation.increase:
        return '${learner.name} is doing great! Consider increasing difficulty from level ${rec.currentDifficultyBand} to ${rec.suggestedDifficultyBand}.';
      case DifficultyRecommendation.decrease:
        return '${learner.name} may benefit from easier content. Consider reducing difficulty from level ${rec.currentDifficultyBand} to ${rec.suggestedDifficultyBand}.';
      case DifficultyRecommendation.maintain:
        return '${learner.name} is progressing well at the current difficulty level ${rec.currentDifficultyBand}. Keep it up!';
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
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(difficultyRecommendationProvider(learner.id));
            },
          ),
        ],
      ),
    );
  }

  IconData _getRecommendationIcon(DifficultyRecommendation rec) {
    switch (rec) {
      case DifficultyRecommendation.increase:
        return Icons.trending_up;
      case DifficultyRecommendation.decrease:
        return Icons.trending_down;
      case DifficultyRecommendation.maintain:
        return Icons.trending_flat;
    }
  }

  Color _getRecommendationColor(DifficultyRecommendation rec) {
    switch (rec) {
      case DifficultyRecommendation.increase:
        return Colors.green;
      case DifficultyRecommendation.decrease:
        return Colors.orange;
      case DifficultyRecommendation.maintain:
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
      case DifficultyRecommendation.increase:
        return Icons.arrow_upward;
      case DifficultyRecommendation.decrease:
        return Icons.arrow_downward;
      case DifficultyRecommendation.maintain:
        return Icons.check;
    }
  }

  String _getLabel() {
    switch (recommendation) {
      case DifficultyRecommendation.increase:
        return 'Increase';
      case DifficultyRecommendation.decrease:
        return 'Decrease';
      case DifficultyRecommendation.maintain:
        return 'On Track';
    }
  }

  Color _getColor() {
    switch (recommendation) {
      case DifficultyRecommendation.increase:
        return Colors.green;
      case DifficultyRecommendation.decrease:
        return Colors.orange;
      case DifficultyRecommendation.maintain:
        return Colors.blue;
    }
  }
}

/// Tile showing recommendation for a single domain.
class _DomainRecommendationTile extends StatelessWidget {
  const _DomainRecommendationTile({
    required this.domain,
    required this.recommendation,
  });

  final String domain;
  final DomainRecommendation recommendation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.3),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _formatDomainName(domain),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      'Mastery: ${(recommendation.avgMastery * 100).toInt()}%',
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '${recommendation.activitiesCompleted} activities',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ],
            ),
          ),
          _DomainRecommendationBadge(recommendation: recommendation.recommendation),
        ],
      ),
    );
  }

  String _formatDomainName(String domain) {
    return domain
        .replaceAll('_', ' ')
        .toLowerCase()
        .split(' ')
        .map((word) => word.isNotEmpty ? '${word[0].toUpperCase()}${word.substring(1)}' : '')
        .join(' ');
  }
}

/// Small badge showing domain recommendation direction.
class _DomainRecommendationBadge extends StatelessWidget {
  const _DomainRecommendationBadge({required this.recommendation});

  final DifficultyRecommendation recommendation;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _getColor().withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_getIcon(), size: 14, color: _getColor()),
          const SizedBox(width: 4),
          Text(
            _getLabel(),
            style: TextStyle(
              color: _getColor(),
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getIcon() {
    switch (recommendation) {
      case DifficultyRecommendation.increase:
        return Icons.arrow_upward;
      case DifficultyRecommendation.decrease:
        return Icons.arrow_downward;
      case DifficultyRecommendation.maintain:
        return Icons.check;
    }
  }

  String _getLabel() {
    switch (recommendation) {
      case DifficultyRecommendation.increase:
        return 'Up';
      case DifficultyRecommendation.decrease:
        return 'Down';
      case DifficultyRecommendation.maintain:
        return 'OK';
    }
  }

  Color _getColor() {
    switch (recommendation) {
      case DifficultyRecommendation.increase:
        return Colors.green;
      case DifficultyRecommendation.decrease:
        return Colors.orange;
      case DifficultyRecommendation.maintain:
        return Colors.blue;
    }
  }
}
