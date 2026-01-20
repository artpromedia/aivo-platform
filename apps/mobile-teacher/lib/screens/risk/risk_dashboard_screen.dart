/// Risk Dashboard Screen - At-risk alerts and classroom risk overview
/// Primary entry point for teacher risk monitoring on mobile
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../models/risk_prediction.dart';
import '../../providers/risk_provider.dart';
import 'widgets/risk_level_badge.dart';
import 'widgets/risk_distribution_chart.dart';
import 'widgets/student_risk_card.dart';
import 'widgets/risk_alert_banner.dart';

/// Main risk monitoring dashboard
class RiskDashboardScreen extends ConsumerStatefulWidget {
  const RiskDashboardScreen({
    super.key,
    required this.classId,
  });

  final String classId;

  @override
  ConsumerState<RiskDashboardScreen> createState() => _RiskDashboardScreenState();
}

class _RiskDashboardScreenState extends ConsumerState<RiskDashboardScreen> {
  // Section keys for scroll navigation
  final _sectionKeys = <String, GlobalKey>{
    'critical': GlobalKey(),
    'atRisk': GlobalKey(),
    'watch': GlobalKey(),
    'warnings': GlobalKey(),
  };

  @override
  void initState() {
    super.initState();
    // Load risk data on mount
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(classroomRiskProvider.notifier).loadClassroomRisk(widget.classId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(classroomRiskProvider);
    final criticalStudents = ref.watch(criticalStudentsProvider);
    final distribution = ref.watch(riskDistributionProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Risk Monitor'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: state.isLoading
                ? null
                : () => ref.read(classroomRiskProvider.notifier).refresh(),
            tooltip: 'Refresh',
          ),
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _showDisclaimerDialog(context),
            tooltip: 'About risk predictions',
          ),
        ],
      ),
      body: state.isLoading && !state.hasData
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && !state.hasData
              ? _buildErrorState(state.error!)
              : RefreshIndicator(
                  onRefresh: () =>
                      ref.read(classroomRiskProvider.notifier).refresh(),
                  child: CustomScrollView(
                    slivers: [
                      // Critical alerts banner
                      if (criticalStudents.isNotEmpty)
                        SliverToBoxAdapter(
                          child: RiskAlertBanner(
                            criticalCount: criticalStudents.length,
                            onTap: () => _scrollToSection('critical'),
                          ),
                        ),

                      // Summary cards
                      SliverToBoxAdapter(
                        child: _buildSummarySection(state, distribution, theme),
                      ),

                      // Risk distribution chart
                      if (distribution != null)
                        SliverToBoxAdapter(
                          child: _buildDistributionSection(distribution, theme),
                        ),

                      // Critical students section
                      if (criticalStudents.isNotEmpty) ...[
                        SliverToBoxAdapter(
                          child: _buildSectionHeader(
                            'Critical',
                            criticalStudents.length,
                            RiskLevel.critical,
                            theme,
                            sectionKey: _sectionKeys['critical'],
                          ),
                        ),
                        SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) => StudentRiskCard(
                              student: criticalStudents[index],
                              onTap: () => _navigateToStudent(
                                criticalStudents[index].studentId,
                              ),
                              onLogContact: () => _showLogContactDialog(
                                criticalStudents[index],
                              ),
                            ),
                            childCount: criticalStudents.length,
                          ),
                        ),
                      ],

                      // At-risk students section
                      if (state.earlyWarningReport?.atRiskStudents.isNotEmpty ??
                          false) ...[
                        SliverToBoxAdapter(
                          child: _buildSectionHeader(
                            'At Risk',
                            state.earlyWarningReport!.atRiskStudents.length,
                            RiskLevel.atRisk,
                            theme,
                            sectionKey: _sectionKeys['atRisk'],
                          ),
                        ),
                        SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final student =
                                  state.earlyWarningReport!.atRiskStudents[index];
                              return StudentRiskCard(
                                student: student,
                                onTap: () => _navigateToStudent(student.studentId),
                                onLogContact: () => _showLogContactDialog(student),
                              );
                            },
                            childCount:
                                state.earlyWarningReport!.atRiskStudents.length,
                          ),
                        ),
                      ],

                      // Watch students section
                      if (state.earlyWarningReport?.watchStudents.isNotEmpty ??
                          false) ...[
                        SliverToBoxAdapter(
                          child: _buildSectionHeader(
                            'Watch',
                            state.earlyWarningReport!.watchStudents.length,
                            RiskLevel.watch,
                            theme,
                            sectionKey: _sectionKeys['watch'],
                          ),
                        ),
                        SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final student =
                                  state.earlyWarningReport!.watchStudents[index];
                              return StudentRiskCard(
                                student: student,
                                compact: true,
                                onTap: () => _navigateToStudent(student.studentId),
                              );
                            },
                            childCount:
                                state.earlyWarningReport!.watchStudents.length,
                          ),
                        ),
                      ],

                      // Class level warnings
                      if (state.earlyWarningReport?.classLevelWarnings.isNotEmpty ??
                          false)
                        SliverToBoxAdapter(
                          child: _buildClassWarningsSection(
                            state.earlyWarningReport!.classLevelWarnings,
                            theme,
                          ),
                        ),

                      // Bottom padding
                      const SliverPadding(
                        padding: EdgeInsets.only(bottom: 80),
                      ),
                    ],
                  ),
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
            Icon(
              Icons.error_outline,
              size: 64,
              color: AivoBrand.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to load risk data',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () =>
                  ref.read(classroomRiskProvider.notifier).refresh(),
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummarySection(
    ClassroomRiskState state,
    RiskDistribution? distribution,
    ThemeData theme,
  ) {
    final summary = state.summary;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Class Overview',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _SummaryCard(
                  title: 'Total Students',
                  value: '${summary?.totalStudents ?? 0}',
                  icon: Icons.people,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SummaryCard(
                  title: 'Need Attention',
                  value: '${state.totalNeedingAttention}',
                  icon: Icons.warning_amber,
                  color: state.totalNeedingAttention > 0
                      ? AivoBrand.warning
                      : AivoBrand.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _SummaryCard(
                  title: 'Improving',
                  value: '${summary?.trendImproving ?? 0}',
                  icon: Icons.trending_up,
                  color: AivoBrand.success,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SummaryCard(
                  title: 'Worsening',
                  value: '${summary?.trendWorsening ?? 0}',
                  icon: Icons.trending_down,
                  color: AivoBrand.error,
                ),
              ),
            ],
          ),
          if (state.lastUpdated != null) ...[
            const SizedBox(height: 8),
            Text(
              'Updated ${_formatRelativeTime(state.lastUpdated!)}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDistributionSection(
    RiskDistribution distribution,
    ThemeData theme,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Risk Distribution',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 16),
              RiskDistributionChart(
                distribution: distribution,
                height: 32,
              ),
              const SizedBox(height: 12),
              _buildDistributionLegend(distribution, theme),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDistributionLegend(
    RiskDistribution distribution,
    ThemeData theme,
  ) {
    return Wrap(
      spacing: 16,
      runSpacing: 8,
      children: [
        _LegendItem(
          color: RiskLevelColors.onTrack,
          label: 'On Track',
          count: distribution.onTrack,
        ),
        _LegendItem(
          color: RiskLevelColors.watch,
          label: 'Watch',
          count: distribution.watch,
        ),
        _LegendItem(
          color: RiskLevelColors.atRisk,
          label: 'At Risk',
          count: distribution.atRisk,
        ),
        _LegendItem(
          color: RiskLevelColors.critical,
          label: 'Critical',
          count: distribution.critical,
        ),
      ],
    );
  }

  Widget _buildSectionHeader(
    String title,
    int count,
    RiskLevel level,
    ThemeData theme, {
    Key? sectionKey,
  }) {
    return Padding(
      key: sectionKey,
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Row(
        children: [
          RiskLevelBadge(level: level, size: RiskBadgeSize.small),
          const SizedBox(width: 8),
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '$count',
              style: theme.textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClassWarningsSection(
    List<ClassLevelWarning> warnings,
    ThemeData theme,
  ) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Class-Level Alerts',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          ...warnings.map((warning) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Icon(
                    _getWarningIcon(warning.severity),
                    color: _getWarningColor(warning.severity),
                  ),
                  title: Text(warning.message),
                  subtitle: Text(
                    'Affects ${warning.affectedStudentCount} students',
                  ),
                ),
              )),
        ],
      ),
    );
  }

  IconData _getWarningIcon(RiskSeverity severity) {
    switch (severity) {
      case RiskSeverity.high:
        return Icons.error;
      case RiskSeverity.medium:
        return Icons.warning;
      case RiskSeverity.low:
        return Icons.info;
    }
  }

  Color _getWarningColor(RiskSeverity severity) {
    switch (severity) {
      case RiskSeverity.high:
        return AivoBrand.error;
      case RiskSeverity.medium:
        return AivoBrand.warning;
      case RiskSeverity.low:
        return Colors.blue;
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

  void _scrollToSection(String section) {
    final key = _sectionKeys[section];
    if (key?.currentContext != null) {
      Scrollable.ensureVisible(
        key!.currentContext!,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        alignment: 0.0, // Align to top
      );
    }
  }

  void _navigateToStudent(String studentId) {
    context.push('/students/$studentId/risk');
  }

  void _showLogContactDialog(EarlyWarningStudent student) {
    showDialog(
      context: context,
      builder: (context) => _LogContactDialog(
        student: student,
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
                'FERPA Compliance Notice',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'These risk predictions are confidential educational records protected under FERPA. '
                'Access is limited to educators with legitimate educational interest.',
              ),
              SizedBox(height: 16),
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
                'How Predictions Work',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'Our model analyzes academic performance, engagement patterns, behavioral '
                'signals, and temporal factors to identify students who may benefit from '
                'additional support.',
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
}

/// Summary card widget
class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
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
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20, color: color),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Legend item for distribution chart
class _LegendItem extends StatelessWidget {
  const _LegendItem({
    required this.color,
    required this.label,
    required this.count,
  });

  final Color color;
  final String label;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          '$label ($count)',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

/// Dialog for logging teacher contact
class _LogContactDialog extends StatefulWidget {
  const _LogContactDialog({
    required this.student,
    required this.onSubmit,
  });

  final EarlyWarningStudent student;
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
      title: Text('Log Contact - ${widget.student.studentName}'),
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
              ButtonSegment(value: 'conference', label: Text('Meeting')),
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
