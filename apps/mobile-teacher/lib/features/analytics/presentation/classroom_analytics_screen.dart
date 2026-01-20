/// Classroom Analytics Screen
///
/// Comprehensive analytics dashboard for teachers including:
/// - Class performance overview
/// - Individual student progress
/// - Assignment analytics
/// - Skill mastery tracking
/// - Engagement metrics
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../content_library/models/content_models.dart';

/// Analytics time range options
enum AnalyticsTimeRange {
  week('This Week'),
  month('This Month'),
  quarter('This Quarter'),
  year('This Year'),
  all('All Time');

  const AnalyticsTimeRange(this.label);
  final String label;
}

/// Classroom Analytics Screen
class ClassroomAnalyticsScreen extends ConsumerStatefulWidget {
  const ClassroomAnalyticsScreen({
    super.key,
    required this.teacherId,
    this.classId,
  });

  final String teacherId;
  final String? classId;

  @override
  ConsumerState<ClassroomAnalyticsScreen> createState() =>
      _ClassroomAnalyticsScreenState();
}

class _ClassroomAnalyticsScreenState
    extends ConsumerState<ClassroomAnalyticsScreen> {
  AnalyticsTimeRange _selectedTimeRange = AnalyticsTimeRange.month;
  String? _selectedClassId;
  bool _isLoading = true;
  ClassroomAnalytics? _analytics;
  List<_ClassOption> _classes = [];

  @override
  void initState() {
    super.initState();
    _selectedClassId = widget.classId;
    _loadData();
  }

  Future<void> _loadData() async {
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() {
      _classes = [
        _ClassOption('class1', 'Math 3A', 24),
        _ClassOption('class2', 'Math 3B', 22),
        _ClassOption('class3', 'Math 4A', 25),
      ];
      _selectedClassId ??= _classes.first.id;
      _analytics = _getMockAnalytics();
      _isLoading = false;
    });
  }

  ClassroomAnalytics _getMockAnalytics() {
    return ClassroomAnalytics(
      classId: _selectedClassId!,
      className: _classes.firstWhere((c) => c.id == _selectedClassId).name,
      totalStudents: 24,
      activeStudents: 22,
      averageEngagement: 0.85,
      averageMastery: 0.78,
      lessonsCompleted: 45,
      assignmentsGraded: 120,
      averageScore: 82.5,
      completionRate: 0.78,
      engagementScore: 0.85,
      skillMastery: {
        'Addition': 0.92,
        'Subtraction': 0.88,
        'Multiplication': 0.75,
        'Division': 0.68,
        'Fractions': 0.55,
        'Word Problems': 0.72,
      },
      recentAssignments: [
        AssignmentStats(
          name: 'Fraction Basics Quiz',
          dueDate: DateTime.now().subtract(const Duration(days: 1)),
          averageScore: 78.5,
          completed: 22,
          total: 24,
        ),
        AssignmentStats(
          name: 'Division Practice',
          dueDate: DateTime.now().subtract(const Duration(days: 3)),
          averageScore: 85.2,
          completed: 24,
          total: 24,
        ),
        AssignmentStats(
          name: 'Multiplication Review',
          dueDate: DateTime.now().subtract(const Duration(days: 5)),
          averageScore: 88.0,
          completed: 23,
          total: 24,
        ),
      ],
      studentPerformance: [
        StudentPerformance(id: 'student1', name: 'Alice Johnson', averageScore: 95.0, completionRate: 1.0, engagementScore: 0.95),
        StudentPerformance(id: 'student2', name: 'Bob Smith', averageScore: 88.0, completionRate: 0.95, engagementScore: 0.88),
        StudentPerformance(id: 'student3', name: 'Carol Davis', averageScore: 85.0, completionRate: 0.92, engagementScore: 0.82),
        StudentPerformance(id: 'student4', name: 'David Brown', averageScore: 78.0, completionRate: 0.85, engagementScore: 0.75),
        StudentPerformance(id: 'student5', name: 'Emma Wilson', averageScore: 72.0, completionRate: 0.78, engagementScore: 0.70),
        StudentPerformance(id: 'student6', name: 'Frank Miller', averageScore: 65.0, completionRate: 0.70, engagementScore: 0.60),
      ],
      weeklyTrends: [65, 70, 72, 78, 82, 85, 82],
    );
  }

  @override
  Widget build(BuildContext context) {
    // Theme available for future styling customization
    Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Classroom Analytics'),
        actions: [
          PopupMenuButton<AnalyticsTimeRange>(
            icon: const Icon(Icons.calendar_today),
            initialValue: _selectedTimeRange,
            onSelected: (range) {
              setState(() {
                _selectedTimeRange = range;
              });
              _loadData();
            },
            itemBuilder: (context) => AnalyticsTimeRange.values
                .map((range) => PopupMenuItem(
                      value: range,
                      child: Text(range.label),
                    ))
                .toList(),
          ),
          IconButton(
            icon: const Icon(Icons.download),
            tooltip: 'Export Report',
            onPressed: _exportReport,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Class selector
                  _buildClassSelector(context),
                  const SizedBox(height: 16),

                  // Overview cards
                  _buildOverviewCards(context),
                  const SizedBox(height: 24),

                  // Performance trend
                  _buildPerformanceTrend(context),
                  const SizedBox(height: 24),

                  // Skill mastery
                  _buildSkillMastery(context),
                  const SizedBox(height: 24),

                  // Recent assignments
                  _buildRecentAssignments(context),
                  const SizedBox(height: 24),

                  // Student performance
                  _buildStudentPerformance(context),
                ],
              ),
            ),
    );
  }

  Widget _buildClassSelector(BuildContext context) {
    // Theme available for styling
    Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: DropdownButtonFormField<String>(
          value: _selectedClassId,
          decoration: const InputDecoration(
            labelText: 'Select Class',
            border: InputBorder.none,
          ),
          items: _classes.map((c) {
            return DropdownMenuItem(
              value: c.id,
              child: Text('${c.name} (${c.studentCount} students)'),
            );
          }).toList(),
          onChanged: (value) {
            setState(() {
              _selectedClassId = value;
              _isLoading = true;
            });
            _loadData();
          },
        ),
      ),
    );
  }

  Widget _buildOverviewCards(BuildContext context) {
    final theme = Theme.of(context);
    final analytics = _analytics!;

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      childAspectRatio: 1.5,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      children: [
        _MetricCard(
          title: 'Average Score',
          value: '${(analytics.averageScore ?? 0).toStringAsFixed(1)}%',
          icon: Icons.score,
          color: theme.colorScheme.primary,
          trend: '+3.2%',
          trendUp: true,
        ),
        _MetricCard(
          title: 'Completion Rate',
          value: '${((analytics.completionRate ?? 0) * 100).toStringAsFixed(0)}%',
          icon: Icons.check_circle,
          color: Colors.green,
          trend: '+5%',
          trendUp: true,
        ),
        _MetricCard(
          title: 'Engagement',
          value: '${((analytics.engagementScore ?? 0) * 100).toStringAsFixed(0)}%',
          icon: Icons.trending_up,
          color: Colors.orange,
          trend: '+2%',
          trendUp: true,
        ),
        _MetricCard(
          title: 'Students',
          value: '${analytics.totalStudents}',
          icon: Icons.people,
          color: Colors.purple,
          trend: 'Active',
          trendUp: true,
        ),
      ],
    );
  }

  Widget _buildPerformanceTrend(BuildContext context) {
    final theme = Theme.of(context);
    final analytics = _analytics!;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.show_chart, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Performance Trend',
                  style: theme.textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 150,
              child: _SimpleLineChart(data: analytics.weeklyTrends),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                for (final day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
                  Text(
                    day,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.outline,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSkillMastery(BuildContext context) {
    final theme = Theme.of(context);
    final analytics = _analytics!;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.psychology, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Skill Mastery',
                  style: theme.textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...analytics.skillMastery.entries.map((entry) {
              final mastery = entry.value;
              final color = mastery >= 0.8
                  ? Colors.green
                  : mastery >= 0.6
                      ? Colors.orange
                      : Colors.red;

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(entry.key),
                        Text(
                          '${(mastery * 100).toStringAsFixed(0)}%',
                          style: TextStyle(
                            color: color,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    LinearProgressIndicator(
                      value: mastery,
                      backgroundColor: color.withValues(alpha: 0.2),
                      valueColor: AlwaysStoppedAnimation(color),
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

  Widget _buildRecentAssignments(BuildContext context) {
    final theme = Theme.of(context);
    final analytics = _analytics!;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.assignment, color: theme.colorScheme.primary),
                    const SizedBox(width: 8),
                    Text(
                      'Recent Assignments',
                      style: theme.textTheme.titleMedium,
                    ),
                  ],
                ),
                TextButton(
                  onPressed: () {},
                  child: const Text('View All'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ...analytics.recentAssignments.map((assignment) {
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  backgroundColor: _getScoreColor(assignment.averageScore)
                      .withValues(alpha: 0.2),
                  child: Text(
                    '${assignment.averageScore.toStringAsFixed(0)}',
                    style: TextStyle(
                      color: _getScoreColor(assignment.averageScore),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                title: Text(assignment.name),
                subtitle: Text(
                  '${assignment.completed}/${assignment.total} completed • ${_formatDate(assignment.dueDate)}',
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () {},
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildStudentPerformance(BuildContext context) {
    final theme = Theme.of(context);
    final analytics = _analytics!;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.people, color: theme.colorScheme.primary),
                    const SizedBox(width: 8),
                    Text(
                      'Student Performance',
                      style: theme.textTheme.titleMedium,
                    ),
                  ],
                ),
                TextButton(
                  onPressed: () {},
                  child: const Text('View All'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            // Column headers
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  const Expanded(flex: 3, child: Text('Student')),
                  Expanded(
                    child: Text(
                      'Score',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                  Expanded(
                    child: Text(
                      'Complete',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                  Expanded(
                    child: Text(
                      'Engage',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),
            const Divider(),
            ...analytics.studentPerformance.map((student) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 16,
                            child: Text(
                              student.name.substring(0, 1),
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              student.name,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Text(
                        '${student.averageScore.toStringAsFixed(0)}%',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: _getScoreColor(student.averageScore),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        '${(student.completionRate * 100).toStringAsFixed(0)}%',
                        textAlign: TextAlign.center,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        '${(student.engagementScore * 100).toStringAsFixed(0)}%',
                        textAlign: TextAlign.center,
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

  Color _getScoreColor(double score) {
    if (score >= 80) return Colors.green;
    if (score >= 60) return Colors.orange;
    return Colors.red;
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays} days ago';
    return '${date.month}/${date.day}';
  }

  void _exportReport() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Export Report',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.picture_as_pdf),
              title: const Text('Export as PDF'),
              subtitle: const Text('Full analytics report'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Generating PDF report...')),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.table_chart),
              title: const Text('Export as CSV'),
              subtitle: const Text('Raw data for spreadsheets'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Generating CSV export...')),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.email),
              title: const Text('Email Report'),
              subtitle: const Text('Send to parents/admin'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Preparing email...')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// Metric Card Widget
class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    required this.trend,
    required this.trendUp,
  });

  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final String trend;
  final bool trendUp;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, color: color, size: 20),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: trendUp
                        ? Colors.green.withValues(alpha: 0.1)
                        : Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        trendUp ? Icons.trending_up : Icons.trending_down,
                        size: 12,
                        color: trendUp ? Colors.green : Colors.red,
                      ),
                      const SizedBox(width: 2),
                      Text(
                        trend,
                        style: TextStyle(
                          fontSize: 10,
                          color: trendUp ? Colors.green : Colors.red,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
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
                color: theme.colorScheme.outline,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Simple Line Chart Widget
class _SimpleLineChart extends StatelessWidget {
  const _SimpleLineChart({required this.data});

  final List<int> data;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final maxValue = data.reduce((a, b) => a > b ? a : b).toDouble();
    final minValue = data.reduce((a, b) => a < b ? a : b).toDouble();
    final range = maxValue - minValue;

    return CustomPaint(
      size: Size.infinite,
      painter: _LineChartPainter(
        data: data,
        minValue: minValue,
        range: range,
        color: theme.colorScheme.primary,
      ),
    );
  }
}

class _LineChartPainter extends CustomPainter {
  _LineChartPainter({
    required this.data,
    required this.minValue,
    required this.range,
    required this.color,
  });

  final List<int> data;
  final double minValue;
  final double range;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final fillPaint = Paint()
      ..color = color.withValues(alpha: 0.1)
      ..style = PaintingStyle.fill;

    final dotPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final path = Path();
    final fillPath = Path();

    for (var i = 0; i < data.length; i++) {
      final x = i * size.width / (data.length - 1);
      final normalizedValue = range > 0 ? (data[i] - minValue) / range : 0.5;
      final y = size.height - (normalizedValue * size.height * 0.8) - (size.height * 0.1);

      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }

      canvas.drawCircle(Offset(x, y), 4, dotPaint);
    }

    fillPath.lineTo(size.width, size.height);
    fillPath.close();

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

/// Helper Classes
class _ClassOption {
  final String id;
  final String name;
  final int studentCount;

  _ClassOption(this.id, this.name, this.studentCount);
}
