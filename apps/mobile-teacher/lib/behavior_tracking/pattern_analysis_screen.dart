/// Pattern Analysis Screen
///
/// Visualize and analyze behavior patterns.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'models.dart';
import 'providers.dart';

class PatternAnalysisScreen extends ConsumerStatefulWidget {
  const PatternAnalysisScreen({
    required this.studentId,
    required this.studentName,
    super.key,
  });

  final String studentId;
  final String studentName;

  @override
  ConsumerState<PatternAnalysisScreen> createState() =>
      _PatternAnalysisScreenState();
}

class _PatternAnalysisScreenState extends ConsumerState<PatternAnalysisScreen> {
  String _timeRange = '30days';

  ({String? startDate, String? endDate}) _getDateRange() {
    final now = DateTime.now();
    final daysAgo = _timeRange == '7days'
        ? 7
        : _timeRange == '30days'
            ? 30
            : 90;
    final startDate =
        now.subtract(Duration(days: daysAgo)).toIso8601String().split('T')[0];
    final endDate = now.toIso8601String().split('T')[0];
    return (startDate: startDate, endDate: endDate);
  }

  @override
  Widget build(BuildContext context) {
    final dateRange = _getDateRange();
    final patternAsync = ref.watch(
      behaviorPatternProvider((
        studentId: widget.studentId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      )),
    );

    return Scaffold(
      body: Column(
        children: [
          _buildTimeRangeSelector(),
          Expanded(
            child: patternAsync.when(
              data: (pattern) => _buildPatternView(pattern),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(child: Text('Error: $error')),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeRangeSelector() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
      ),
      child: SegmentedButton<String>(
        segments: const [
          ButtonSegment(value: '7days', label: Text('7 Days')),
          ButtonSegment(value: '30days', label: Text('30 Days')),
          ButtonSegment(value: '90days', label: Text('90 Days')),
        ],
        selected: {_timeRange},
        onSelectionChanged: (Set<String> selected) {
          setState(() => _timeRange = selected.first);
        },
      ),
    );
  }

  Widget _buildPatternView(BehaviorPattern pattern) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSummaryCard(pattern),
        const SizedBox(height: 16),
        _buildIncidentsByTypeCard(pattern),
        const SizedBox(height: 16),
        _buildIncidentsBySeverityCard(pattern),
        const SizedBox(height: 16),
        _buildTriggersCard(pattern),
        const SizedBox(height: 16),
        _buildPeakTimesCard(pattern),
        const SizedBox(height: 16),
        _buildEffectivenessCard(pattern),
        const SizedBox(height: 16),
        _buildRecommendationsCard(pattern),
      ],
    );
  }

  Widget _buildSummaryCard(BehaviorPattern pattern) {
    final days = pattern.endDate.difference(pattern.startDate).inDays;
    final avgPerDay = pattern.totalIncidents / days;

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
                    pattern.totalIncidents.toString(),
                    Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatBox(
                    'Avg/Day',
                    avgPerDay.toStringAsFixed(1),
                    Colors.purple,
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

  Widget _buildIncidentsByTypeCard(BehaviorPattern pattern) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Incidents by Type',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...pattern.incidentsByType.entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(_formatBehaviorType(entry.key)),
                        Text(
                          '${entry.value}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    LinearProgressIndicator(
                      value: entry.value / pattern.totalIncidents,
                      backgroundColor: Colors.grey[200],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIncidentsBySeverityCard(BehaviorPattern pattern) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Incidents by Severity',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...pattern.incidentsBySeverity.entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.circle,
                              size: 12,
                              color: _getSeverityColor(entry.key),
                            ),
                            const SizedBox(width: 8),
                            Text(_formatSeverity(entry.key)),
                          ],
                        ),
                        Text(
                          '${entry.value}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    LinearProgressIndicator(
                      value: entry.value / pattern.totalIncidents,
                      backgroundColor: Colors.grey[200],
                      color: _getSeverityColor(entry.key),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTriggersCard(BehaviorPattern pattern) {
    if (pattern.commonTriggers.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Common Triggers',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...pattern.commonTriggers.map(
              (trigger) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber, size: 20, color: Colors.orange),
                    const SizedBox(width: 12),
                    Expanded(child: Text(trigger)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPeakTimesCard(BehaviorPattern pattern) {
    if (pattern.peakTimes.isEmpty && pattern.peakLocations.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Peak Times & Locations',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (pattern.peakTimes.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                'Times',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              ...pattern.peakTimes.map(
                (time) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.access_time, size: 16),
                      const SizedBox(width: 8),
                      Text(time),
                    ],
                  ),
                ),
              ),
            ],
            if (pattern.peakLocations.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                'Locations',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              ...pattern.peakLocations.map(
                (location) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.location_on, size: 16),
                      const SizedBox(width: 8),
                      Text(location),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEffectivenessCard(BehaviorPattern pattern) {
    if (pattern.effectiveness.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Intervention Effectiveness',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...pattern.effectiveness.entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(child: Text(entry.key)),
                        Text(
                          '${entry.value.toStringAsFixed(0)}%',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    LinearProgressIndicator(
                      value: entry.value / 100,
                      backgroundColor: Colors.grey[200],
                      color: entry.value >= 70
                          ? Colors.green
                          : entry.value >= 50
                              ? Colors.orange
                              : Colors.red,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecommendationsCard(BehaviorPattern pattern) {
    if (pattern.recommendations.isEmpty) {
      return const SizedBox.shrink();
    }

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
            ...pattern.recommendations.map(
              (recommendation) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
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

  String _formatBehaviorType(BehaviorType type) {
    switch (type) {
      case BehaviorType.physical:
        return 'Physical';
      case BehaviorType.verbal:
        return 'Verbal';
      case BehaviorType.disruptive:
        return 'Disruptive';
      case BehaviorType.noncompliance:
        return 'Non-Compliance';
      case BehaviorType.offtask:
        return 'Off-Task';
      case BehaviorType.social:
        return 'Social';
      case BehaviorType.selfHarm:
        return 'Self-Harm';
      case BehaviorType.other:
        return 'Other';
    }
  }

  String _formatSeverity(BehaviorSeverity severity) {
    switch (severity) {
      case BehaviorSeverity.low:
        return 'Low';
      case BehaviorSeverity.medium:
        return 'Medium';
      case BehaviorSeverity.high:
        return 'High';
      case BehaviorSeverity.crisis:
        return 'Crisis';
    }
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
}
