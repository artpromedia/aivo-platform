import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import '../baseline/baseline_controller.dart';

/// Screen showing baseline assessment results for a learner.
/// Allows parent to accept results or request a retest (if first attempt).
class BaselineResultScreen extends ConsumerStatefulWidget {
  const BaselineResultScreen({
    super.key,
    required this.profileId,
    required this.learnerId,
    required this.learnerName,
  });

  final String profileId;
  final String learnerId;
  final String learnerName;

  @override
  ConsumerState<BaselineResultScreen> createState() => _BaselineResultScreenState();
}

class _BaselineResultScreenState extends ConsumerState<BaselineResultScreen> {
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Load latest profile data
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(baselineControllerProvider.notifier).loadProfile(widget.learnerId);
    });
  }

  Future<void> _acceptResults() async {
    setState(() => _isLoading = true);

    final success = await ref.read(baselineControllerProvider.notifier).acceptFinal(
          widget.profileId,
          widget.learnerId,
        );

    setState(() => _isLoading = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Results accepted! Personalized learning is ready.'),
          backgroundColor: Colors.green,
        ),
      );
      context.pop();
    }
  }

  void _showRetestModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _RetestModal(
        profileId: widget.profileId,
        learnerId: widget.learnerId,
        onSuccess: () {
          Navigator.of(context).pop();
          context.pop();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final baselineState = ref.watch(baselineControllerProvider);
    final profile = baselineState.profileFor(widget.learnerId);
    final attempt = profile?.latestCompletedAttempt;

    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.learnerName}\'s Results'),
      ),
      body: baselineState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : profile == null || attempt == null
              ? _buildNoResults(context)
              : _buildResults(context, theme, profile, attempt),
    );
  }

  Widget _buildNoResults(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.assessment_outlined, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              'No results available',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            const Text(
              'The baseline assessment hasn\'t been completed yet.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.pop(),
              child: const Text('Go Back'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResults(
    BuildContext context,
    ThemeData theme,
    BaselineProfile profile,
    BaselineAttempt attempt,
  ) {
    final overallScore = attempt.overallScore ?? 0.0;
    final domainScores = attempt.domainScores;
    final canRetest = profile.canRequestRetest;
    final isAccepted = profile.status == BaselineProfileStatus.finalAccepted;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Overall score card
          Card(
            color: theme.colorScheme.primaryContainer,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Text(
                    'Overall Score',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '${(overallScore * 100).round()}%',
                    style: theme.textTheme.displayMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _scoreMessage(overallScore),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer.withOpacity(0.8),
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Domain breakdown
          Text(
            'Performance by Subject',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 12),

          ...domainScores.map((score) => _DomainScoreBar(score: score)),

          if (domainScores.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Detailed scores not available',
                  style: theme.textTheme.bodyMedium,
                ),
              ),
            ),

          const SizedBox(height: 24),

          // Summary text
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.lightbulb_outline, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        'What This Means',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _buildSummary(domainScores, overallScore),
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Action buttons
          if (!isAccepted) ...[
            FilledButton.icon(
              onPressed: _isLoading ? null : _acceptResults,
              icon: _isLoading
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.check_circle),
              label: const Text('Accept Results'),
              style: FilledButton.styleFrom(
                minimumSize: const Size(double.infinity, 56),
              ),
            ),
            const SizedBox(height: 12),

            if (canRetest)
              OutlinedButton.icon(
                onPressed: _isLoading ? null : _showRetestModal,
                icon: const Icon(Icons.replay),
                label: const Text('Request Retest'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 56),
                ),
              ),

            if (!canRetest && profile.attemptCount >= 2)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'Maximum retests reached. Please accept these results.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
          ] else ...[
            Card(
              color: Colors.green.shade50,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green.shade700),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Results accepted! ${widget.learnerName}\'s personalized learning journey is ready.',
                        style: TextStyle(color: Colors.green.shade800),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => context.pop(),
              style: FilledButton.styleFrom(
                minimumSize: const Size(double.infinity, 56),
              ),
              child: const Text('Done'),
            ),
          ],

          // Error display
          if (ref.watch(baselineControllerProvider).error != null)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Card(
                color: theme.colorScheme.errorContainer,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: theme.colorScheme.onErrorContainer),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          ref.watch(baselineControllerProvider).error!,
                          style: TextStyle(color: theme.colorScheme.onErrorContainer),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () =>
                            ref.read(baselineControllerProvider.notifier).clearError(),
                        color: theme.colorScheme.onErrorContainer,
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _scoreMessage(double score) {
    if (score >= 0.9) return 'Excellent performance!';
    if (score >= 0.75) return 'Great job! Strong foundation.';
    if (score >= 0.6) return 'Good progress. Some areas to strengthen.';
    if (score >= 0.4) return 'We\'ve identified areas for focused support.';
    return 'We\'ll create a personalized plan to build skills.';
  }

  String _buildSummary(List<DomainScore> scores, double overall) {
    if (scores.isEmpty) {
      return 'Based on this assessment, we\'ll create a personalized learning plan for your child.';
    }

    final strengths = scores.where((s) => s.percentage >= 0.8).map((s) => s.domain.label).toList();
    final needsWork = scores.where((s) => s.percentage < 0.6).map((s) => s.domain.label).toList();

    final buffer = StringBuffer();

    if (strengths.isNotEmpty) {
      buffer.write('Strong in ${strengths.join(', ')}. ');
    }

    if (needsWork.isNotEmpty) {
      buffer.write('We\'ll focus on building ${needsWork.join(' and ')} skills. ');
    }

    buffer.write(
      'Aivo will use these results to personalize ${scores.isNotEmpty ? "your child's" : "the"} learning experience.',
    );

    return buffer.toString();
  }
}

class _DomainScoreBar extends StatelessWidget {
  const _DomainScoreBar({required this.score});

  final DomainScore score;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final percentage = score.percentage;

    Color barColor;
    if (percentage >= 0.8) {
      barColor = Colors.green;
    } else if (percentage >= 0.6) {
      barColor = Colors.orange;
    } else {
      barColor = theme.colorScheme.error;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                score.domain.label,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                '${score.correct}/${score.total}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: percentage,
              minHeight: 12,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation<Color>(barColor),
            ),
          ),
        ],
      ),
    );
  }
}

class _RetestModal extends ConsumerStatefulWidget {
  const _RetestModal({
    required this.profileId,
    required this.learnerId,
    required this.onSuccess,
  });

  final String profileId;
  final String learnerId;
  final VoidCallback onSuccess;

  @override
  ConsumerState<_RetestModal> createState() => _RetestModalState();
}

class _RetestModalState extends ConsumerState<_RetestModal> {
  RetestReason _selectedReason = RetestReason.distracted;
  final _notesController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submitRetest() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final success = await ref.read(baselineControllerProvider.notifier).requestRetest(
          profileId: widget.profileId,
          learnerId: widget.learnerId,
          reason: _selectedReason,
          notes: _notesController.text.trim(),
        );

    setState(() => _isLoading = false);

    if (success) {
      widget.onSuccess();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Retest requested. Your child can retake the assessment.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } else {
      setState(() {
        _error = ref.read(baselineControllerProvider).error ?? 'Failed to request retest';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.outline.withOpacity(0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          Text(
            'Request Retest',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'Please tell us why you\'d like your child to retake the assessment.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),

          // Reason selection
          Text('Reason', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          ...RetestReason.values.map((reason) => RadioListTile<RetestReason>(
                value: reason,
                groupValue: _selectedReason,
                onChanged: (value) {
                  if (value != null) setState(() => _selectedReason = value);
                },
                title: Text(reason.label),
                contentPadding: EdgeInsets.zero,
              )),

          const SizedBox(height: 16),

          // Notes field
          TextField(
            controller: _notesController,
            decoration: const InputDecoration(
              labelText: 'Additional notes (optional)',
              hintText: 'Any details that would help us understand...',
            ),
            maxLines: 2,
            maxLength: 500,
          ),
          const SizedBox(height: 16),

          // Error
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                _error!,
                style: TextStyle(color: theme.colorScheme.error),
              ),
            ),

          // Buttons
          FilledButton(
            onPressed: _isLoading ? null : _submitRetest,
            style: FilledButton.styleFrom(
              minimumSize: const Size(double.infinity, 56),
            ),
            child: _isLoading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Request Retest'),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: _isLoading ? null : () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }
}
