import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../analytics/analytics_controller.dart';

/// Child Progress Screen for Parent App
///
/// Displays comprehensive progress and activity data for a child.
/// Includes:
/// - This week's activity summary
/// - Learning progress charts by subject
/// - Strengths and support areas (growth-oriented language)
/// - Homework and focus summaries
class ChildProgressScreen extends ConsumerWidget {
  const ChildProgressScreen({
    super.key,
    required this.learnerId,
    required this.learnerName,
  });

  final String learnerId;
  final String learnerName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(childProgressControllerProvider(learnerId));

    return Scaffold(
      appBar: AppBar(
        title: Text('$learnerName\'s Progress'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () {
              ref.read(childProgressControllerProvider(learnerId).notifier).refresh();
            },
          ),
        ],
      ),
      body: _buildBody(context, ref, state),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, ChildProgressState state) {
    if (state.isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading progress data...'),
          ],
        ),
      );
    }

    if (state.error != null) {
      return _ErrorView(
        error: state.error!,
        onRetry: () {
          ref.read(childProgressControllerProvider(learnerId).notifier).refresh();
        },
      );
    }

    final summary = state.summary;
    final strengthsAndNeeds = state.strengthsAndNeeds;

    if (summary == null) {
      return const Center(child: Text('No progress data available.'));
    }

    return RefreshIndicator(
      onRefresh: () async {
        await ref.read(childProgressControllerProvider(learnerId).notifier).refresh();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // This Week's Activity
            _ThisWeekActivitySection(engagement: summary.engagement),
            const SizedBox(height: 24),

            // Learning Progress
            _LearningProgressSection(progress: summary.learningProgress),
            const SizedBox(height: 24),

            // Strengths & Support Areas
            if (strengthsAndNeeds != null)
              _StrengthsAndNeedsSection(data: strengthsAndNeeds),
            const SizedBox(height: 24),

            // Homework & Focus
            _HomeworkAndFocusSection(
              homework: summary.homeworkUsage,
              focus: summary.focusSummary,
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// THIS WEEK'S ACTIVITY SECTION
// ══════════════════════════════════════════════════════════════════════════════

class _ThisWeekActivitySection extends StatelessWidget {
  const _ThisWeekActivitySection({required this.engagement});

  final EngagementSummary engagement;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.calendar_today, color: colors.primary, size: 20),
            const SizedBox(width: 8),
            Text(
              'This Week\'s Activity',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 12),
        
        // Activity summary cards
        Row(
          children: [
            Expanded(
              child: _MetricCard(
                icon: Icons.play_circle_outline,
                iconColor: colors.primary,
                label: 'Sessions',
                value: '${engagement.sessionsThisWeek}',
                subtitle: engagement.sessionTrendText,
                subtitleColor: engagement.isImproving ? Colors.green : colors.onSurfaceVariant,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _MetricCard(
                icon: Icons.timer_outlined,
                iconColor: colors.secondary,
                label: 'Avg Duration',
                value: '${engagement.avgSessionDurationMinutes.round()} min',
                subtitle: 'Per session',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        
        // Days active
        _MetricCard(
          icon: Icons.check_circle_outline,
          iconColor: Colors.green,
          label: 'Days Active',
          value: '${engagement.daysActiveInRange}',
          subtitle: '${engagement.totalSessionsInRange} total sessions in the past 4 weeks',
          fullWidth: true,
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LEARNING PROGRESS SECTION
// ══════════════════════════════════════════════════════════════════════════════

class _LearningProgressSection extends StatelessWidget {
  const _LearningProgressSection({required this.progress});

  final LearningProgressSummary progress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.trending_up, color: colors.primary, size: 20),
            const SizedBox(width: 8),
            Text(
              'Learning Progress',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 8),
        
        // Overall progress summary
        if (progress.totalSkillsMasteredDelta > 0)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              children: [
                const Icon(Icons.star, color: Colors.amber, size: 18),
                const SizedBox(width: 6),
                Text(
                  '+${progress.totalSkillsMasteredDelta} skills mastered this month!',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),

        // Subject progress cards
        ...progress.bySubject.map((subject) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _SubjectProgressCard(subject: subject),
        )),

        // Text alternative for accessibility
        Semantics(
          label: _buildProgressAccessibilityLabel(progress),
          child: const SizedBox.shrink(),
        ),
      ],
    );
  }

  String _buildProgressAccessibilityLabel(LearningProgressSummary progress) {
    final buffer = StringBuffer('Learning progress summary: ');
    for (final subject in progress.bySubject) {
      buffer.write('${subject.subjectName}: ${subject.masteryPercent}% mastery, ');
      buffer.write('${subject.skillsMasteredDelta} skills gained. ');
    }
    buffer.write('Total skills mastered: ${progress.totalSkillsMasteredDelta}.');
    return buffer.toString();
  }
}

class _SubjectProgressCard extends StatelessWidget {
  const _SubjectProgressCard({required this.subject});

  final SubjectProgress subject;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    // Get subject color
    final subjectColor = _getSubjectColor(subject.subjectCode);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  width: 4,
                  height: 24,
                  decoration: BoxDecoration(
                    color: subjectColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    subject.subjectName,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Text(
                  '${subject.masteryPercent}%',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: subjectColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: subject.currentMastery,
                minHeight: 8,
                backgroundColor: colors.surfaceContainerHighest,
                valueColor: AlwaysStoppedAnimation(subjectColor),
              ),
            ),
            const SizedBox(height: 8),

            // Progress text
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  subject.progressText,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: subject.skillsMasteredDelta > 0
                        ? Colors.green.shade700
                        : colors.onSurfaceVariant,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (subject.timeseries.isNotEmpty)
                  Text(
                    '${subject.timeseries.last.masteredSkills}/${subject.timeseries.last.totalSkills} skills',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
              ],
            ),

            // Simple sparkline chart (visual representation)
            if (subject.timeseries.length > 1) ...[
              const SizedBox(height: 12),
              _SimpleSparkline(
                data: subject.timeseries.map((p) => p.avgMasteryScore).toList(),
                color: subjectColor,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _getSubjectColor(String code) {
    switch (code.toUpperCase()) {
      case 'MATH':
        return const Color(0xFF2D6BFF);
      case 'ELA':
        return const Color(0xFF9C27B0);
      case 'SCIENCE':
        return const Color(0xFF4CAF50);
      default:
        return const Color(0xFF607D8B);
    }
  }
}

/// Simple sparkline chart widget.
class _SimpleSparkline extends StatelessWidget {
  const _SimpleSparkline({
    required this.data,
    required this.color,
  });

  final List<double> data;
  final Color color;

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 40,
      child: CustomPaint(
        size: const Size(double.infinity, 40),
        painter: _SparklinePainter(data: data, color: color),
      ),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  _SparklinePainter({required this.data, required this.color});

  final List<double> data;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;

    final paint = Paint()
      ..color = color
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..color = color.withOpacity(0.1)
      ..style = PaintingStyle.fill;

    final minVal = data.reduce((a, b) => a < b ? a : b);
    final maxVal = data.reduce((a, b) => a > b ? a : b);
    final range = maxVal - minVal;

    final path = Path();
    final fillPath = Path();

    for (var i = 0; i < data.length; i++) {
      final x = (i / (data.length - 1)) * size.width;
      final normalizedY = range > 0 ? (data[i] - minVal) / range : 0.5;
      final y = size.height - (normalizedY * size.height * 0.8) - (size.height * 0.1);

      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }
    }

    fillPath.lineTo(size.width, size.height);
    fillPath.close();

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, paint);

    // Draw dots at data points
    final dotPaint = Paint()..color = color;
    for (var i = 0; i < data.length; i++) {
      final x = (i / (data.length - 1)) * size.width;
      final normalizedY = range > 0 ? (data[i] - minVal) / range : 0.5;
      final y = size.height - (normalizedY * size.height * 0.8) - (size.height * 0.1);
      canvas.drawCircle(Offset(x, y), 3, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

// ══════════════════════════════════════════════════════════════════════════════
// STRENGTHS & NEEDS SECTION
// ══════════════════════════════════════════════════════════════════════════════

class _StrengthsAndNeedsSection extends StatelessWidget {
  const _StrengthsAndNeedsSection({required this.data});

  final StrengthsAndNeeds data;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.psychology, color: colors.primary, size: 20),
            const SizedBox(width: 8),
            Text(
              'Strengths & Support Areas',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Overall message
        Text(
          data.overallMessage,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colors.onSurfaceVariant,
            fontStyle: FontStyle.italic,
          ),
        ),
        const SizedBox(height: 16),

        // Strengths
        if (data.strengths.isNotEmpty) ...[
          Text(
            '✨ Strengths',
            style: theme.textTheme.titleSmall?.copyWith(
              color: Colors.green.shade700,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          ...data.strengths.map((s) => _StrengthNeedCard(
            area: s,
            isStrength: true,
          )),
          const SizedBox(height: 16),
        ],

        // Support areas (with growth-oriented language)
        if (data.needsSupport.isNotEmpty) ...[
          Text(
            '🌱 Growing Areas',
            style: theme.textTheme.titleSmall?.copyWith(
              color: colors.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          ...data.needsSupport.map((s) => _StrengthNeedCard(
            area: s,
            isStrength: false,
          )),
        ],
      ],
    );
  }
}

class _StrengthNeedCard extends StatelessWidget {
  const _StrengthNeedCard({
    required this.area,
    required this.isStrength,
  });

  final StrengthOrNeedArea area;
  final bool isStrength;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    final cardColor = isStrength
        ? Colors.green.shade50
        : colors.primaryContainer.withOpacity(0.3);
    final accentColor = isStrength ? Colors.green : colors.primary;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Card(
        color: cardColor,
        elevation: 0,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Subject icon
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _getSubjectIcon(area.subjectCode),
                  color: accentColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              
              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      area.skillName,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      area.description,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              
              // Mastery indicator
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${area.masteryPercent}%',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: accentColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getSubjectIcon(String code) {
    switch (code.toUpperCase()) {
      case 'MATH':
        return Icons.calculate;
      case 'ELA':
        return Icons.menu_book;
      case 'SCIENCE':
        return Icons.science;
      default:
        return Icons.school;
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HOMEWORK & FOCUS SECTION
// ══════════════════════════════════════════════════════════════════════════════

class _HomeworkAndFocusSection extends StatelessWidget {
  const _HomeworkAndFocusSection({
    required this.homework,
    required this.focus,
  });

  final HomeworkUsageSummary homework;
  final FocusBreakSummary focus;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.assignment, color: colors.primary, size: 20),
            const SizedBox(width: 8),
            Text(
              'Homework & Focus',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Homework summary
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.edit_note, color: Colors.orange, size: 24),
                    const SizedBox(width: 8),
                    Text(
                      'Homework Helper',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _MiniStat(
                      value: '${homework.totalHomeworkSessions}',
                      label: 'Sessions',
                    ),
                    _MiniStat(
                      value: '${homework.avgStepsCompletedPerSession.toStringAsFixed(1)}',
                      label: 'Avg Steps',
                    ),
                    _MiniStat(
                      value: '${homework.completionPercent}%',
                      label: 'Completion',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Focus summary
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.self_improvement, color: Colors.teal, size: 24),
                    const SizedBox(width: 8),
                    Text(
                      'Focus & Breaks',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  focus.focusBreaksSummary,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      Icons.pause_circle_outline,
                      size: 16,
                      color: colors.onSurfaceVariant,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${focus.totalFocusBreaks} focus breaks across ${focus.totalSessions} sessions',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({
    required this.value,
    required this.label,
  });

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Column(
      children: [
        Text(
          value,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: colors.primary,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: colors.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED WIDGETS
// ══════════════════════════════════════════════════════════════════════════════

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    required this.subtitle,
    this.subtitleColor,
    this.fullWidth = false,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final String subtitle;
  final Color? subtitleColor;
  final bool fullWidth;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: subtitleColor ?? colors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({
    required this.error,
    required this.onRetry,
  });

  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Unable to load progress data',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              error,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 24),
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
