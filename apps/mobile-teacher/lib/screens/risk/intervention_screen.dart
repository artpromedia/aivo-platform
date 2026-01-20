/// Intervention Recommendations Screen
/// Displays AI-recommended interventions for at-risk students
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../models/risk_prediction.dart';
import '../../providers/risk_provider.dart';
import 'widgets/risk_level_badge.dart';

/// Screen displaying intervention recommendations for a student
class InterventionScreen extends ConsumerStatefulWidget {
  const InterventionScreen({
    super.key,
    required this.studentId,
    required this.studentName,
  });

  final String studentId;
  final String studentName;

  @override
  ConsumerState<InterventionScreen> createState() => _InterventionScreenState();
}

class _InterventionScreenState extends ConsumerState<InterventionScreen> {
  @override
  void initState() {
    super.initState();
    // Load student risk data with interventions
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(studentRiskProvider.notifier).loadStudentRisk(
            widget.studentId,
            includeInterventions: true,
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(studentRiskProvider);
    final interventions = state.interventions;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('Interventions - ${widget.studentName}'),
        actions: [
          if (interventions != null)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: state.isLoading
                  ? null
                  : () => ref.read(studentRiskProvider.notifier).refresh(),
            ),
        ],
      ),
      body: state.isLoading && interventions == null
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && interventions == null
              ? _buildErrorState(state.error!)
              : interventions == null
                  ? _buildNoInterventionsState()
                  : _buildInterventionsList(interventions, theme),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: AivoBrand.error),
            const SizedBox(height: 16),
            Text(
              'Failed to load interventions',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(error, textAlign: TextAlign.center),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () =>
                  ref.read(studentRiskProvider.notifier).refresh(),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoInterventionsState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.check_circle_outline,
              size: 64,
              color: AivoBrand.mint[400],
            ),
            const SizedBox(height: 16),
            Text(
              'No Interventions Needed',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'This student is currently on track and does not require any interventions.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInterventionsList(InterventionPlan plan, ThemeData theme) {
    return CustomScrollView(
      slivers: [
        // Header with student risk info
        SliverToBoxAdapter(
          child: _buildHeader(plan, theme),
        ),

        // Immediate action banner
        if (plan.requiresImmediateAction)
          SliverToBoxAdapter(
            child: _buildImmediateActionBanner(theme),
          ),

        // Primary recommendations
        if (plan.primaryRecommendations.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: _buildSectionHeader('Primary Recommendations', theme),
          ),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) => InterventionCard(
                intervention: plan.primaryRecommendations[index],
                isPrimary: true,
                onApprove: () => _approveIntervention(
                  plan.primaryRecommendations[index],
                ),
              ),
              childCount: plan.primaryRecommendations.length,
            ),
          ),
        ],

        // Secondary recommendations
        if (plan.secondaryRecommendations.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: _buildSectionHeader('Alternative Options', theme),
          ),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) => InterventionCard(
                intervention: plan.secondaryRecommendations[index],
                isPrimary: false,
                onApprove: () => _approveIntervention(
                  plan.secondaryRecommendations[index],
                ),
              ),
              childCount: plan.secondaryRecommendations.length,
            ),
          ),
        ],

        // Excluded interventions
        if (plan.excludedInterventions.isNotEmpty)
          SliverToBoxAdapter(
            child: _buildExcludedSection(plan.excludedInterventions, theme),
          ),

        // Notes section
        if (plan.notes != null)
          SliverToBoxAdapter(
            child: _buildNotesSection(plan.notes!, theme),
          ),

        // Review date
        SliverToBoxAdapter(
          child: _buildReviewDate(plan.reviewDate, theme),
        ),

        // Disclaimer
        SliverToBoxAdapter(
          child: _buildDisclaimer(theme),
        ),

        // Bottom padding
        const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
      ],
    );
  }

  Widget _buildHeader(InterventionPlan plan, ThemeData theme) {
    final state = ref.watch(studentRiskProvider);
    final riskScore = state.prediction?.riskScore ?? 0.75;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              RiskScoreGauge(
                score: riskScore,
                level: plan.riskLevel,
                size: 60,
                showLabel: false,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        RiskLevelBadge(level: plan.riskLevel),
                        const SizedBox(width: 8),
                        if (plan.educatorApprovalRequired)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.tertiaryContainer,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'Approval Required',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: theme.colorScheme.onTertiaryContainer,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${plan.allRecommendations.length} interventions recommended',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImmediateActionBanner(ThemeData theme) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AivoBrand.error[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AivoBrand.error[200]!),
      ),
      child: Row(
        children: [
          Icon(Icons.priority_high, color: AivoBrand.error[700]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Immediate Action Required',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AivoBrand.error[700],
                  ),
                ),
                Text(
                  'This student requires urgent intervention. Please review and approve recommendations.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AivoBrand.error[600],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(
        title,
        style: theme.textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildExcludedSection(
    List<ExcludedIntervention> excluded,
    ThemeData theme,
  ) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: ExpansionTile(
        title: Text(
          'Excluded Interventions (${excluded.length})',
          style: theme.textTheme.titleSmall,
        ),
        children: excluded.map((e) {
          return ListTile(
            leading: Icon(Icons.remove_circle_outline, color: AivoBrand.gray),
            title: Text(e.name),
            subtitle: Text(
              e.reason,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildNotesSection(String notes, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Card(
        color: theme.colorScheme.surfaceContainerHighest,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.note,
                    size: 20,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Notes',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                notes,
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReviewDate(DateTime reviewDate, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Icon(
            Icons.event,
            size: 16,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 8),
          Text(
            'Review by: ${_formatDate(reviewDate)}',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDisclaimer(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.info_outline,
              size: 20,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'These AI-generated recommendations are tools to assist your professional judgment, not replace it. Consider the full context of the student\'s situation.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }

  void _approveIntervention(InterventionRecommendation intervention) {
    showDialog(
      context: context,
      builder: (context) => _ApproveInterventionDialog(
        intervention: intervention,
        onApprove: (notes) {
          ref.read(studentRiskProvider.notifier).approveIntervention(
                intervention.interventionId,
                notes: notes,
              );
          Navigator.of(context).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${intervention.name} approved'),
              backgroundColor: AivoBrand.success,
            ),
          );
        },
      ),
    );
  }
}

/// Card displaying a single intervention recommendation
class InterventionCard extends StatelessWidget {
  const InterventionCard({
    super.key,
    required this.intervention,
    this.isPrimary = true,
    this.onApprove,
  });

  final InterventionRecommendation intervention;
  final bool isPrimary;
  final VoidCallback? onApprove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Expanded(
                  child: Text(
                    intervention.name,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                InterventionUrgencyBadge(urgency: intervention.urgency),
              ],
            ),
            const SizedBox(height: 8),

            // Type and intensity
            Row(
              children: [
                _buildTag(intervention.type, Colors.blue, theme),
                const SizedBox(width: 8),
                InterventionIntensityBadge(intensity: intervention.intensity),
              ],
            ),
            const SizedBox(height: 12),

            // Rationale
            Text(
              intervention.rationale,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),

            // Metrics
            Row(
              children: [
                _buildMetric(
                  'Relevance',
                  '${intervention.relevancePercent}%',
                  Colors.blue,
                  theme,
                ),
                const SizedBox(width: 16),
                _buildMetric(
                  'Effectiveness',
                  '${intervention.effectivenessPercent}%',
                  AivoBrand.success,
                  theme,
                ),
                const SizedBox(width: 16),
                _buildMetric(
                  'Duration',
                  '${intervention.estimatedDurationDays}d',
                  AivoBrand.warning,
                  theme,
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Target risk factors
            if (intervention.targetRiskFactors.isNotEmpty) ...[
              Text(
                'Targets',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 4),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: intervention.targetRiskFactors.map((factor) {
                  return Chip(
                    label: Text(factor),
                    labelStyle: const TextStyle(fontSize: 11),
                    padding: EdgeInsets.zero,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    visualDensity: VisualDensity.compact,
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
            ],

            // Implementation notes
            if (intervention.implementationNotes.isNotEmpty) ...[
              ExpansionTile(
                title: Text(
                  'Implementation Notes',
                  style: theme.textTheme.labelMedium,
                ),
                tilePadding: EdgeInsets.zero,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      intervention.implementationNotes,
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ],

            // Consent indicators
            if (intervention.requiresParentConsent ||
                intervention.requiresEducatorApproval) ...[
              const Divider(),
              Row(
                children: [
                  if (intervention.requiresParentConsent) ...[
                    Icon(
                      Icons.family_restroom,
                      size: 16,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Parent consent',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  if (intervention.requiresEducatorApproval) ...[
                    Icon(
                      Icons.verified_user,
                      size: 16,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Educator approval',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ],

            // Approve button
            if (onApprove != null) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: isPrimary
                    ? FilledButton.icon(
                        onPressed: onApprove,
                        icon: const Icon(Icons.check, size: 18),
                        label: const Text('Approve Intervention'),
                      )
                    : OutlinedButton.icon(
                        onPressed: onApprove,
                        icon: const Icon(Icons.check, size: 18),
                        label: const Text('Approve'),
                      ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTag(String label, Color color, ThemeData theme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildMetric(
    String label,
    String value,
    Color color,
    ThemeData theme,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        Text(
          value,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}

/// Dialog for approving an intervention
class _ApproveInterventionDialog extends StatefulWidget {
  const _ApproveInterventionDialog({
    required this.intervention,
    required this.onApprove,
  });

  final InterventionRecommendation intervention;
  final void Function(String? notes) onApprove;

  @override
  State<_ApproveInterventionDialog> createState() =>
      _ApproveInterventionDialogState();
}

class _ApproveInterventionDialogState
    extends State<_ApproveInterventionDialog> {
  final _notesController = TextEditingController();

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Approve Intervention'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'You are about to approve: ${widget.intervention.name}',
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _notesController,
            decoration: const InputDecoration(
              labelText: 'Notes (optional)',
              hintText: 'Add any notes for this approval...',
              border: OutlineInputBorder(),
            ),
            maxLines: 3,
          ),
          if (widget.intervention.requiresParentConsent) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.info_outline, size: 16, color: AivoBrand.warning),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'This intervention requires parent consent.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AivoBrand.warning,
                        ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            widget.onApprove(
              _notesController.text.isNotEmpty ? _notesController.text : null,
            );
          },
          child: const Text('Approve'),
        ),
      ],
    );
  }
}
