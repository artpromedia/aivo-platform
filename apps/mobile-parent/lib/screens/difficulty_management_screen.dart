import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../difficulty/difficulty_service.dart';

/// Screen for parents to manage difficulty settings and approve recommendations.
class DifficultyManagementScreen extends ConsumerStatefulWidget {
  const DifficultyManagementScreen({
    super.key,
    required this.studentId,
    required this.studentName,
  });

  final String studentId;
  final String studentName;

  @override
  ConsumerState<DifficultyManagementScreen> createState() =>
      _DifficultyManagementScreenState();
}

class _DifficultyManagementScreenState
    extends ConsumerState<DifficultyManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Difficulty Settings'),
            Text(
              widget.studentName,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Pending'),
            Tab(text: 'Levels'),
            Tab(text: 'History'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _PendingRecommendationsTab(studentId: widget.studentId),
          _CurrentLevelsTab(studentId: widget.studentId),
          _HistoryTab(studentId: widget.studentId),
        ],
      ),
    );
  }
}

/// Tab showing pending difficulty recommendations
class _PendingRecommendationsTab extends ConsumerWidget {
  const _PendingRecommendationsTab({required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pendingAsync = ref.watch(pendingRecommendationsProvider(studentId));

    return pendingAsync.when(
      data: (response) {
        if (response.recommendations.isEmpty) {
          return const _EmptyState(
            icon: Icons.check_circle_outline,
            title: 'No Pending Recommendations',
            subtitle: 'All difficulty recommendations have been reviewed.',
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(pendingRecommendationsProvider(studentId));
          },
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: response.recommendations.length,
            itemBuilder: (context, index) {
              final rec = response.recommendations[index];
              return _RecommendationCard(
                recommendation: rec,
                studentId: studentId,
              );
            },
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => _ErrorState(
        message: error.toString(),
        onRetry: () => ref.invalidate(pendingRecommendationsProvider(studentId)),
      ),
    );
  }
}

/// Card showing a single pending recommendation with action buttons
class _RecommendationCard extends ConsumerStatefulWidget {
  const _RecommendationCard({
    required this.recommendation,
    required this.studentId,
  });

  final PendingDifficultyRecommendation recommendation;
  final String studentId;

  @override
  ConsumerState<_RecommendationCard> createState() =>
      _RecommendationCardState();
}

class _RecommendationCardState extends ConsumerState<_RecommendationCard> {
  bool _isLoading = false;

  Future<void> _handleAction(String action, {int? modifiedLevel}) async {
    setState(() => _isLoading = true);

    try {
      final service = ref.read(difficultyServiceProvider);
      final result = await service.respondToRecommendation(
        recommendationId: widget.recommendation.id,
        action: action,
        modifiedLevel: modifiedLevel,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.message),
            backgroundColor:
                result.success ? Colors.green : Colors.red,
          ),
        );

        if (result.success) {
          ref.invalidate(pendingRecommendationsProvider(widget.studentId));
          ref.invalidate(difficultyLevelsProvider(widget.studentId));
          ref.invalidate(difficultyHistoryProvider(widget.studentId));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _showModifyDialog() async {
    final rec = widget.recommendation;
    int selectedLevel = rec.recommendedLevel;

    final result = await showDialog<int>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Modify Difficulty Level'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Current: Level ${rec.currentLevel}\n'
                'Recommended: Level ${rec.recommendedLevel}',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              const Text('Select your preferred level:'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: List.generate(5, (index) {
                  final level = index + 1;
                  return ChoiceChip(
                    label: Text('$level'),
                    selected: selectedLevel == level,
                    onSelected: (selected) {
                      if (selected) {
                        setDialogState(() => selectedLevel = level);
                      }
                    },
                  );
                }),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, selectedLevel),
              child: const Text('Apply'),
            ),
          ],
        ),
      ),
    );

    if (result != null) {
      await _handleAction('modify', modifiedLevel: result);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final rec = widget.recommendation;
    final isIncrease = rec.isIncrease;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: isIncrease
                      ? Colors.green.withOpacity(0.2)
                      : Colors.orange.withOpacity(0.2),
                  child: Icon(
                    isIncrease ? Icons.trending_up : Icons.trending_down,
                    color: isIncrease ? Colors.green : Colors.orange,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rec.reasonTitle,
                        style: theme.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        rec.domainDisplayName,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Level change indicator
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _LevelBadge(level: rec.currentLevel, label: 'Current'),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Icon(
                      Icons.arrow_forward,
                      color: isIncrease ? Colors.green : Colors.orange,
                    ),
                  ),
                  _LevelBadge(
                    level: rec.recommendedLevel,
                    label: 'Recommended',
                    highlighted: true,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Description
            Text(
              rec.reasonDescription,
              style: theme.textTheme.bodyMedium,
            ),

            const SizedBox(height: 12),

            // Evidence chips
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _EvidenceChip(
                  label: 'Mastery',
                  value: rec.evidence.masteryPercentage,
                ),
                _EvidenceChip(
                  label: 'Accuracy',
                  value: rec.evidence.accuracyPercentage,
                ),
                _EvidenceChip(
                  label: 'Practice',
                  value: '${rec.evidence.practiceCount} activities',
                ),
                if (rec.evidence.consecutiveSuccesses > 0)
                  _EvidenceChip(
                    label: 'Streak',
                    value: '${rec.evidence.consecutiveSuccesses} correct',
                  ),
              ],
            ),

            const SizedBox(height: 8),

            // Expiration warning
            if (!rec.isExpired)
              Text(
                'Expires in ${rec.timeRemaining.inDays} days',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: rec.timeRemaining.inDays <= 2
                      ? Colors.orange
                      : theme.colorScheme.onSurfaceVariant,
                ),
              ),

            const SizedBox(height: 16),

            // Action buttons
            if (_isLoading)
              const Center(child: CircularProgressIndicator())
            else
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _handleAction('deny'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                      ),
                      child: const Text('Deny'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _showModifyDialog,
                      child: const Text('Modify'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => _handleAction('approve'),
                      child: const Text('Approve'),
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

/// Tab showing current difficulty levels by domain
class _CurrentLevelsTab extends ConsumerWidget {
  const _CurrentLevelsTab({required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final levelsAsync = ref.watch(difficultyLevelsProvider(studentId));

    return levelsAsync.when(
      data: (levels) {
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Current Difficulty Levels',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'These levels determine the complexity of learning activities '
              'presented to your child in each subject area.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 16),
            ...levels.entries.map((entry) => _DomainLevelCard(
                  domain: entry.key,
                  level: entry.value,
                  studentId: studentId,
                )),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => _ErrorState(
        message: error.toString(),
        onRetry: () => ref.invalidate(difficultyLevelsProvider(studentId)),
      ),
    );
  }
}

/// Card showing difficulty level for a single domain
class _DomainLevelCard extends ConsumerStatefulWidget {
  const _DomainLevelCard({
    required this.domain,
    required this.level,
    required this.studentId,
  });

  final SkillDomain domain;
  final DifficultyLevel level;
  final String studentId;

  @override
  ConsumerState<_DomainLevelCard> createState() => _DomainLevelCardState();
}

class _DomainLevelCardState extends ConsumerState<_DomainLevelCard> {
  Future<void> _showOverrideDialog() async {
    int selectedLevel = widget.level.level;

    final result = await showDialog<int>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Set ${widget.domain.displayName} Level'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Select difficulty level:'),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: List.generate(5, (index) {
                  final level = index + 1;
                  return ChoiceChip(
                    label: Text('$level'),
                    selected: selectedLevel == level,
                    onSelected: (selected) {
                      if (selected) {
                        setDialogState(() => selectedLevel = level);
                      }
                    },
                  );
                }),
              ),
              const SizedBox(height: 16),
              Text(
                _getLevelDescription(selectedLevel),
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, selectedLevel),
              child: const Text('Apply'),
            ),
          ],
        ),
      ),
    );

    if (result != null && result != widget.level.level) {
      try {
        final service = ref.read(difficultyServiceProvider);
        await service.setDomainDifficulty(
          studentId: widget.studentId,
          domain: widget.domain,
          level: result,
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                  '${widget.domain.displayName} set to Level $result'),
              backgroundColor: Colors.green,
            ),
          );
          ref.invalidate(difficultyLevelsProvider(widget.studentId));
          ref.invalidate(difficultyHistoryProvider(widget.studentId));
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error: ${e.toString()}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  String _getLevelDescription(int level) {
    switch (level) {
      case 1:
        return 'Very Easy - Basic foundational concepts';
      case 2:
        return 'Easy - Building core skills';
      case 3:
        return 'Medium - Grade-appropriate challenge';
      case 4:
        return 'Challenging - Above grade level';
      case 5:
        return 'Advanced - Maximum challenge';
      default:
        return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Text(
            widget.domain.code.substring(0, 1),
            style: TextStyle(color: theme.colorScheme.onPrimaryContainer),
          ),
        ),
        title: Text(widget.domain.displayName),
        subtitle: Row(
          children: [
            Text(widget.level.levelLabel),
            if (widget.level.isParentOverride) ...[
              const SizedBox(width: 8),
              Chip(
                label: const Text('Override'),
                labelStyle: theme.textTheme.labelSmall,
                padding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
                backgroundColor: Colors.blue.withOpacity(0.2),
              ),
            ],
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _LevelIndicator(level: widget.level.level),
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: _showOverrideDialog,
            ),
          ],
        ),
      ),
    );
  }
}

/// Tab showing difficulty change history
class _HistoryTab extends ConsumerWidget {
  const _HistoryTab({required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(difficultyHistoryProvider(studentId));

    return historyAsync.when(
      data: (history) {
        if (history.isEmpty) {
          return const _EmptyState(
            icon: Icons.history,
            title: 'No History Yet',
            subtitle: 'Difficulty changes will appear here.',
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(difficultyHistoryProvider(studentId));
          },
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: history.length,
            itemBuilder: (context, index) {
              final record = history[index];
              return _HistoryCard(record: record);
            },
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => _ErrorState(
        message: error.toString(),
        onRetry: () => ref.invalidate(difficultyHistoryProvider(studentId)),
      ),
    );
  }
}

/// Card showing a single history record
class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.record});

  final DifficultyChangeRecord record;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isIncrease = record.isIncrease;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isIncrease
              ? Colors.green.withOpacity(0.2)
              : Colors.orange.withOpacity(0.2),
          child: Icon(
            isIncrease ? Icons.arrow_upward : Icons.arrow_downward,
            color: isIncrease ? Colors.green : Colors.orange,
          ),
        ),
        title: Text(record.domainDisplayName),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Level ${record.previousLevel} → ${record.newLevel}'),
            Text(
              _formatDate(record.createdAt),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        trailing: record.wasEffective != null
            ? Icon(
                record.wasEffective! ? Icons.thumb_up : Icons.thumb_down,
                color: record.wasEffective! ? Colors.green : Colors.orange,
                size: 20,
              )
            : null,
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) {
      return 'Today';
    } else if (diff.inDays == 1) {
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else {
      return '${date.month}/${date.day}/${date.year}';
    }
  }
}

// Helper widgets

class _LevelBadge extends StatelessWidget {
  const _LevelBadge({
    required this.level,
    required this.label,
    this.highlighted = false,
  });

  final int level;
  final String label;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: highlighted
                ? theme.colorScheme.primary
                : theme.colorScheme.surfaceContainerHighest,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '$level',
              style: theme.textTheme.titleLarge?.copyWith(
                color: highlighted
                    ? theme.colorScheme.onPrimary
                    : theme.colorScheme.onSurface,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: theme.textTheme.bodySmall,
        ),
      ],
    );
  }
}

class _LevelIndicator extends StatelessWidget {
  const _LevelIndicator({required this.level});

  final int level;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (index) {
        final isFilled = index < level;
        return Container(
          width: 8,
          height: 8,
          margin: const EdgeInsets.symmetric(horizontal: 1),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isFilled
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.outlineVariant,
          ),
        );
      }),
    );
  }
}

class _EvidenceChip extends StatelessWidget {
  const _EvidenceChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        '$label: $value',
        style: theme.textTheme.bodySmall,
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 64,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Something went wrong',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
