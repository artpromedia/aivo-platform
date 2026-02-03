/// Student Risk Detail Screen
/// Individual student risk profile with trend charts and interventions
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../models/risk_prediction.dart';
import '../../models/intervention.dart';
import '../../providers/risk_provider.dart';
import 'widgets/risk_level_badge.dart';
import 'widgets/risk_factor_card.dart';
import 'widgets/risk_chart.dart';
import 'widgets/intervention_action_card.dart';

/// Detailed view of individual student risk profile
class StudentRiskDetailScreen extends ConsumerStatefulWidget {
  const StudentRiskDetailScreen({
    super.key,
    required this.studentId,
    this.studentName,
  });

  final String studentId;
  final String? studentName;

  @override
  ConsumerState<StudentRiskDetailScreen> createState() =>
      _StudentRiskDetailScreenState();
}

class _StudentRiskDetailScreenState
    extends ConsumerState<StudentRiskDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  void _loadData() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(studentRiskProvider.notifier).loadStudentRisk(
            widget.studentId,
            includeInterventions: true,
          );
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(studentRiskProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: state.isLoading && state.prediction == null
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.prediction == null
              ? _buildErrorState(state.error!)
              : CustomScrollView(
                  slivers: [
                    // Collapsible app bar with risk summary
                    _buildSliverAppBar(state, theme),

                    // Tab bar
                    SliverPersistentHeader(
                      pinned: true,
                      delegate: _TabBarDelegate(
                        tabController: _tabController,
                        tabs: const [
                          Tab(text: 'Overview'),
                          Tab(text: 'Risk Factors'),
                          Tab(text: 'Interventions'),
                        ],
                      ),
                    ),

                    // Tab content
                    SliverFillRemaining(
                      child: TabBarView(
                        controller: _tabController,
                        children: [
                          _buildOverviewTab(state, theme),
                          _buildRiskFactorsTab(state, theme),
                          _buildInterventionsTab(state, theme),
                        ],
                      ),
                    ),
                  ],
                ),
      floatingActionButton: state.prediction != null
          ? FloatingActionButton.extended(
              onPressed: () => _showActionSheet(context),
              icon: const Icon(Icons.add),
              label: const Text('Action'),
            )
          : null,
    );
  }

  Widget _buildSliverAppBar(StudentRiskState state, ThemeData theme) {
    final prediction = state.prediction;
    final riskColor = prediction != null
        ? RiskLevelColors.forLevel(prediction.riskLevel)
        : AivoBrand.gray;

    return SliverAppBar(
      expandedHeight: 200,
      pinned: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: state.isLoading
              ? null
              : () => ref.read(studentRiskProvider.notifier).refresh(),
        ),
        IconButton(
          icon: const Icon(Icons.info_outline),
          onPressed: () => _showDisclaimerDialog(context),
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                riskColor.withOpacity(0.8),
                riskColor.withOpacity(0.4),
              ],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 56, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Student info row
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 32,
                        backgroundColor: Colors.white,
                        child: Text(
                          _getInitials(widget.studentName ?? 'Student'),
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: riskColor,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.studentName ?? 'Student',
                              style: theme.textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (prediction != null) ...[
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  RiskLevelBadge(
                                    level: prediction.riskLevel,
                                    size: RiskBadgeSize.medium,
                                  ),
                                  const SizedBox(width: 8),
                                  RiskTrendIndicator(
                                    trend: prediction.riskTrend,
                                    scoreChange: prediction.scoreChange,
                                    compact: true,
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                      // Risk score gauge
                      if (prediction != null)
                        RiskScoreGauge(
                          score: prediction.riskScore,
                          level: prediction.riskLevel,
                          size: 70,
                          showLabel: false,
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        title: Text(widget.studentName ?? 'Student Risk'),
        collapseMode: CollapseMode.parallax,
      ),
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
              'Failed to load risk data',
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

  Widget _buildOverviewTab(StudentRiskState state, ThemeData theme) {
    final prediction = state.prediction;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Risk trend chart
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.show_chart,
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Risk Trend',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 200,
                    child: state.history.isNotEmpty
                        ? RiskTrendChart(history: state.history)
                        : Center(
                            child: Text(
                              'No trend data available',
                              style: TextStyle(color: AivoBrand.gray[500]),
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Category breakdown
          if (prediction != null) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.pie_chart,
                          color: theme.colorScheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Risk by Category',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    RiskCategoryChart(
                      categoryScores: prediction.categoryScores,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Key statistics
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    title: 'Confidence',
                    value: '${prediction.confidencePercent}%',
                    icon: Icons.verified,
                    color: theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    title: 'Risk Factors',
                    value: '${prediction.topRiskFactors.length}',
                    icon: Icons.warning_amber,
                    color: RiskLevelColors.atRisk,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    title: 'Protective',
                    value: '${prediction.protectiveFactors.length}',
                    icon: Icons.shield,
                    color: AivoBrand.success,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Protective factors
            if (prediction.protectiveFactors.isNotEmpty) ...[
              Text(
                'Protective Factors',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Card(
                child: Column(
                  children: prediction.protectiveFactors.map((factor) {
                    return ListTile(
                      leading: Icon(
                        Icons.shield,
                        color: AivoBrand.success,
                      ),
                      title: Text(factor.feature),
                      subtitle: Text(factor.description),
                      trailing: Text(
                        '+${(factor.contribution * 100).round()}%',
                        style: TextStyle(
                          color: AivoBrand.success,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],

            // Last updated
            const SizedBox(height: 16),
            Row(
              children: [
                Icon(
                  Icons.update,
                  size: 16,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 8),
                Text(
                  'Last updated: ${_formatDate(prediction.timestamp)}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '(Model v${prediction.modelVersion})',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildRiskFactorsTab(StudentRiskState state, ThemeData theme) {
    final prediction = state.prediction;

    if (prediction == null || prediction.topRiskFactors.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.check_circle,
              size: 64,
              color: AivoBrand.success,
            ),
            const SizedBox(height: 16),
            Text(
              'No Significant Risk Factors',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'This student is performing well across all metrics.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      child: RiskFactorsGrouped(
        factors: prediction.topRiskFactors,
        onFactorTap: (factor) {
          // Could show detailed view or recommendations
        },
      ),
    );
  }

  Widget _buildInterventionsTab(StudentRiskState state, ThemeData theme) {
    final interventions = state.interventions;
    final suggestions = ref.watch(recommendedInterventionsProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // AI recommendations
          if (suggestions.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Icon(
                    Icons.auto_awesome,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'AI Recommendations',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => context.push(
                      '/risk/interventions/${widget.studentId}',
                    ),
                    child: const Text('View All'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            ...suggestions.take(3).map((recommendation) {
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: InterventionActionCard(
                  intervention: Intervention(
                    id: recommendation.interventionId,
                    studentId: widget.studentId,
                    title: recommendation.name,
                    description: recommendation.rationale,
                    category: _mapTypeToCategory(recommendation.type),
                    type: _mapIntensityToType(recommendation.intensity),
                    priority: _mapUrgencyToPriority(recommendation.urgency),
                    status: InterventionStatus.suggested,
                    targetRiskFactors: recommendation.targetRiskFactors,
                    createdAt: DateTime.now(),
                    createdBy: 'system',
                  ),
                  onAccept: () => _approveIntervention(recommendation),
                  onDismiss: () => _dismissIntervention(recommendation),
                ),
              );
            }),
            const SizedBox(height: 16),
          ],

          // Current interventions
          if (interventions != null &&
              interventions.allRecommendations.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Icon(
                    Icons.assignment,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Recommended Interventions',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            ...interventions.allRecommendations.map((intervention) {
              return _buildInterventionRecommendationCard(intervention, theme);
            }),
          ],

          // No interventions state
          if ((interventions == null ||
                  interventions.allRecommendations.isEmpty) &&
              suggestions.isEmpty) ...[
            Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.psychology,
                      size: 64,
                      color: AivoBrand.gray[300],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No Interventions Available',
                      style: theme.textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Check back later for AI-powered recommendations.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInterventionRecommendationCard(
    InterventionRecommendation intervention,
    ThemeData theme,
  ) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
            Text(
              intervention.rationale,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildMetric('Relevance', '${intervention.relevancePercent}%'),
                const SizedBox(width: 16),
                _buildMetric(
                    'Effectiveness', '${intervention.effectivenessPercent}%'),
                const SizedBox(width: 16),
                _buildMetric(
                    'Duration', '${intervention.estimatedDurationDays}d'),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => _approveIntervention(intervention),
                icon: const Icon(Icons.check, size: 18),
                label: const Text('Approve'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetric(String label, String value) {
    final theme = Theme.of(context);
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
          ),
        ),
      ],
    );
  }

  void _showActionSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.psychology),
                title: const Text('Assign Intervention'),
                onTap: () {
                  Navigator.pop(context);
                  context.push('/risk/interventions/${widget.studentId}');
                },
              ),
              ListTile(
                leading: const Icon(Icons.family_restroom),
                title: const Text('Contact Parent'),
                onTap: () {
                  Navigator.pop(context);
                  context.push(
                    '/messages/compose?studentId=${widget.studentId}',
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.calendar_today),
                title: const Text('Schedule Meeting'),
                onTap: () {
                  Navigator.pop(context);
                  _showScheduleMeetingDialog(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.note_add),
                title: const Text('Log Contact'),
                onTap: () {
                  Navigator.pop(context);
                  _showLogContactDialog(context);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showScheduleMeetingDialog(BuildContext context) {
    // TODO: Implement meeting scheduling
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Meeting scheduling coming soon')),
    );
  }

  void _showLogContactDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => _LogContactDialog(
        onSubmit: (type, notes) {
          ref.read(studentRiskProvider.notifier).logContact(
                contactType: type,
                notes: notes,
              );
          Navigator.of(context).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Contact logged successfully')),
          );
        },
      ),
    );
  }

  void _showDisclaimerDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('About Risk Predictions'),
        content: const SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Important Disclaimer',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'Risk predictions are AI-generated indicators designed to ASSIST educators, '
                'not replace professional judgment. Always consider the full context of a '
                "student's situation when making educational decisions.",
              ),
              SizedBox(height: 16),
              Text(
                'FERPA Compliance',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'This data is confidential and protected under FERPA. '
                'Access is limited to educators with legitimate educational interest.',
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  void _dismissIntervention(InterventionRecommendation intervention) {
    // TODO: Implement dismiss logic for recommendations
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${intervention.name} dismissed'),
      ),
    );
  }

  InterventionCategory _mapTypeToCategory(String type) {
    switch (type.toLowerCase()) {
      case 'academic':
        return InterventionCategory.academic;
      case 'behavioral':
        return InterventionCategory.behavioral;
      case 'social':
      case 'social-emotional':
        return InterventionCategory.social;
      case 'attendance':
        return InterventionCategory.attendance;
      case 'engagement':
        return InterventionCategory.engagement;
      default:
        return InterventionCategory.other;
    }
  }

  InterventionType _mapIntensityToType(InterventionIntensity intensity) {
    switch (intensity) {
      case InterventionIntensity.light:
        return InterventionType.wholeClass;
      case InterventionIntensity.moderate:
        return InterventionType.smallGroup;
      case InterventionIntensity.intensive:
        return InterventionType.oneOnOne;
    }
  }

  InterventionPriority _mapUrgencyToPriority(InterventionUrgency urgency) {
    switch (urgency) {
      case InterventionUrgency.immediate:
        return InterventionPriority.urgent;
      case InterventionUrgency.shortTerm:
        return InterventionPriority.high;
      case InterventionUrgency.mediumTerm:
        return InterventionPriority.medium;
    }
  }

  void _approveIntervention(InterventionRecommendation intervention) {
    ref.read(studentRiskProvider.notifier).approveIntervention(
          intervention.interventionId,
        );
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${intervention.name} approved'),
        backgroundColor: AivoBrand.success,
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}

/// Stat card widget
class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String title;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              title,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Tab bar delegate for sliver persistent header
class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  _TabBarDelegate({
    required this.tabController,
    required this.tabs,
  });

  final TabController tabController;
  final List<Tab> tabs;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: TabBar(
        controller: tabController,
        tabs: tabs,
      ),
    );
  }

  @override
  double get maxExtent => 48;

  @override
  double get minExtent => 48;

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) {
    return tabController != oldDelegate.tabController;
  }
}

/// Log contact dialog
class _LogContactDialog extends StatefulWidget {
  const _LogContactDialog({required this.onSubmit});

  final void Function(String type, String notes) onSubmit;

  @override
  State<_LogContactDialog> createState() => _LogContactDialogState();
}

class _LogContactDialogState extends State<_LogContactDialog> {
  String _contactType = 'note';
  final _notesController = TextEditingController();

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Log Contact'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Contact Type'),
          const SizedBox(height: 8),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'note', label: Text('Note')),
              ButtonSegment(value: 'email', label: Text('Email')),
              ButtonSegment(value: 'phone', label: Text('Phone')),
              ButtonSegment(value: 'meeting', label: Text('Meeting')),
            ],
            selected: {_contactType},
            onSelectionChanged: (selection) {
              setState(() {
                _contactType = selection.first;
              });
            },
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _notesController,
            decoration: const InputDecoration(
              labelText: 'Notes',
              hintText: 'Brief summary of the contact...',
              border: OutlineInputBorder(),
            ),
            maxLines: 3,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            if (_notesController.text.isNotEmpty) {
              widget.onSubmit(_contactType, _notesController.text);
            }
          },
          child: const Text('Log Contact'),
        ),
      ],
    );
  }
}
