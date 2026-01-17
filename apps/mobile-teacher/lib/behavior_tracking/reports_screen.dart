/// Behavior Reports Screen
///
/// Generate and view behavior reports.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'models.dart';
import 'providers.dart';

class BehaviorReportsScreen extends ConsumerStatefulWidget {
  const BehaviorReportsScreen({
    required this.studentId,
    required this.studentName,
    super.key,
  });

  final String studentId;
  final String studentName;

  @override
  ConsumerState<BehaviorReportsScreen> createState() =>
      _BehaviorReportsScreenState();
}

class _BehaviorReportsScreenState extends ConsumerState<BehaviorReportsScreen> {
  DateTime _startDate = DateTime.now().subtract(const Duration(days: 30));
  DateTime _endDate = DateTime.now();
  bool _showReport = false;

  @override
  Widget build(BuildContext context) {
    if (!_showReport) {
      return _buildReportGenerator();
    }

    final reportAsync = ref.watch(
      behaviorReportProvider((
        studentId: widget.studentId,
        startDate: _startDate.toIso8601String().split('T')[0],
        endDate: _endDate.toIso8601String().split('T')[0],
      )),
    );

    return reportAsync.when(
      data: (report) => _buildReportView(report),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('Error: $error')),
    );
  }

  Widget _buildReportGenerator() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Generate Behavior Report',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Report Period',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Start Date'),
                    subtitle: Text(DateFormat('MMM d, y').format(_startDate)),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () => _selectStartDate(context),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('End Date'),
                    subtitle: Text(DateFormat('MMM d, y').format(_endDate)),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () => _selectEndDate(context),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => setState(() => _showReport = true),
            icon: const Icon(Icons.assessment),
            label: const Text('Generate Report'),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _selectQuickRange,
            icon: const Icon(Icons.speed),
            label: const Text('Quick Range'),
          ),
        ],
      ),
    );
  }

  Widget _buildReportView(BehaviorReport report) {
    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildReportHeader(report),
          const SizedBox(height: 16),
          _buildSummarySection(report.summary),
          const SizedBox(height: 16),
          _buildIncidentsSection(report.incidents),
          if (report.pattern != null) ...[
            const SizedBox(height: 16),
            _buildPatternsSection(report.pattern!),
          ],
          const SizedBox(height: 16),
          _buildInterventionsSection(report.activeInterventions),
          const SizedBox(height: 16),
          _buildRecommendationsSection(report.recommendations),
        ],
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton(
            heroTag: 'share',
            onPressed: _shareReport,
            child: const Icon(Icons.share),
          ),
          const SizedBox(height: 8),
          FloatingActionButton(
            heroTag: 'back',
            onPressed: () => setState(() => _showReport = false),
            child: const Icon(Icons.arrow_back),
          ),
        ],
      ),
    );
  }

  Widget _buildReportHeader(BehaviorReport report) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Behavior Report',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              widget.studentName,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              '${DateFormat('MMM d, y').format(report.startDate)} - ${DateFormat('MMM d, y').format(report.endDate)}',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 4),
            Text(
              'Generated: ${DateFormat('MMM d, y h:mm a').format(report.generatedAt)}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummarySection(BehaviorReportSummary summary) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Summary',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildStatBox(
                    'Total Incidents',
                    summary.totalIncidents.toString(),
                    Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatBox(
                    'Avg/Day',
                    summary.averagePerDay.toStringAsFixed(1),
                    Colors.purple,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildStatBox(
                    'Improvement',
                    '${summary.improvementRate.toStringAsFixed(0)}%',
                    summary.improvementRate >= 0 ? Colors.green : Colors.red,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatBox(
                    'Compliance',
                    '${summary.interventionCompliance.toStringAsFixed(0)}%',
                    Colors.orange,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatBox(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildIncidentsSection(List<BehaviorIncident> incidents) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Incidents',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                Text(
                  '${incidents.length}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Theme.of(context).colorScheme.primary,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...incidents.take(5).map((incident) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: _getSeverityColor(incident.severity),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            incident.description,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            DateFormat('MMM d, y').format(incident.date),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildPatternsSection(BehaviorPattern pattern) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Behavior Patterns',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (pattern.commonTriggers.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                'Common Triggers',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              ...pattern.commonTriggers.take(3).map(
                    (trigger) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text('• $trigger'),
                    ),
                  ),
            ],
            if (pattern.peakTimes.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                'Peak Times',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              ...pattern.peakTimes.take(3).map(
                    (time) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text('• $time'),
                    ),
                  ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInterventionsSection(List<BehaviorIntervention> interventions) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Active Interventions',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                Text(
                  '${interventions.length}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Theme.of(context).colorScheme.primary,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (interventions.isEmpty)
              const Text('No active interventions')
            else
              ...interventions.map((intervention) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        intervention.strategy,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        intervention.targetBehavior,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      if (intervention.effectivenessRating != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: List.generate(5, (index) {
                            return Icon(
                              index < intervention.effectivenessRating!
                                  ? Icons.star
                                  : Icons.star_border,
                              size: 16,
                              color: Colors.amber,
                            );
                          }),
                        ),
                      ],
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  Widget _buildRecommendationsSection(List<String> recommendations) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Recommendations',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            if (recommendations.isEmpty)
              const Text('No specific recommendations')
            else
              ...recommendations.map(
                (recommendation) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.lightbulb, size: 20, color: Colors.amber),
                      const SizedBox(width: 12),
                      Expanded(child: Text(recommendation)),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Color _getSeverityColor(BehaviorSeverity severity) {
    switch (severity) {
      case BehaviorSeverity.low:
        return Colors.green;
      case BehaviorSeverity.medium:
        return Colors.orange;
      case BehaviorSeverity.high:
        return Colors.red;
      case BehaviorSeverity.crisis:
        return Colors.purple;
    }
  }

  Future<void> _selectStartDate(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: _endDate,
    );
    if (picked != null) {
      setState(() => _startDate = picked);
    }
  }

  Future<void> _selectEndDate(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate,
      firstDate: _startDate,
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _endDate = picked);
    }
  }

  void _selectQuickRange() {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return ListView(
          shrinkWrap: true,
          children: [
            ListTile(
              title: const Text('Last 7 Days'),
              onTap: () {
                setState(() {
                  _endDate = DateTime.now();
                  _startDate = _endDate.subtract(const Duration(days: 7));
                });
                Navigator.pop(context);
              },
            ),
            ListTile(
              title: const Text('Last 30 Days'),
              onTap: () {
                setState(() {
                  _endDate = DateTime.now();
                  _startDate = _endDate.subtract(const Duration(days: 30));
                });
                Navigator.pop(context);
              },
            ),
            ListTile(
              title: const Text('Last 90 Days'),
              onTap: () {
                setState(() {
                  _endDate = DateTime.now();
                  _startDate = _endDate.subtract(const Duration(days: 90));
                });
                Navigator.pop(context);
              },
            ),
            ListTile(
              title: const Text('This Month'),
              onTap: () {
                final now = DateTime.now();
                setState(() {
                  _endDate = now;
                  _startDate = DateTime(now.year, now.month, 1);
                });
                Navigator.pop(context);
              },
            ),
          ],
        );
      },
    );
  }

  void _shareReport() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Report sharing feature coming soon')),
    );
  }
}
