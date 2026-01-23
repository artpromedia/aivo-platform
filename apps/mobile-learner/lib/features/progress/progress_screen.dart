/// Progress Tracking Screen
///
/// Shows detailed progress tracking including:
/// - Weekly learning time chart
/// - Subject progress
/// - Skills levels
/// - Recent activity
library;

// dart:math is used implicitly in progress calculations
import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../widgets/error_widgets.dart';
import 'progress_models.dart';
import 'progress_service.dart';

/// Progress Screen
class ProgressScreen extends ConsumerStatefulWidget {
  const ProgressScreen({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  ConsumerState<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends ConsumerState<ProgressScreen> {
  Color _hexToColor(String hex) {
    hex = hex.replaceFirst('#', '');
    if (hex.length == 6) hex = 'FF$hex';
    return Color(int.parse(hex, radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final progressAsync = ref.watch(progressSummaryProvider(widget.learnerId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Progress'),
      ),
      body: progressAsync.when(
        loading: () => const ProgressLoadingWidget(),
        error: (error, stack) => LearnerErrorWidget(
          message: 'We couldn\'t load your progress right now.',
          onRetry: () =>
              ref.invalidate(progressSummaryProvider(widget.learnerId)),
        ),
        data: (summary) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(progressSummaryProvider(widget.learnerId));
          },
          child: _buildProgressContent(theme, colorScheme, summary),
        ),
      ),
    );
  }

  Widget _buildProgressContent(
      ThemeData theme, ColorScheme colorScheme, ProgressSummary summary) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Text(
            'Track your learning journey',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),

          // Stats Overview
          _buildStatsOverview(theme, colorScheme, summary),
          const SizedBox(height: 24),

          // Weekly Activity Chart
          _buildWeeklyChart(theme, colorScheme, summary),
          const SizedBox(height: 24),

          // Subject Progress
          _buildSubjectProgress(theme, colorScheme, summary),
          const SizedBox(height: 24),

          // Skills
          _buildSkills(theme, colorScheme, summary),
          const SizedBox(height: 24),

          // Recent Activity
          _buildRecentActivity(theme, colorScheme, summary),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildStatsOverview(
      ThemeData theme, ColorScheme colorScheme, ProgressSummary summary) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _StatCard(
          emoji: '⏱️',
          value: '${summary.totalMinutesThisWeek}',
          label: 'Minutes this week',
          gradientColors: [Colors.blue.shade50, Colors.cyan.shade50],
          borderColor: Colors.blue.shade200,
          valueColor: Colors.blue.shade700,
          labelColor: Colors.blue.shade600,
        ),
        _StatCard(
          emoji: '⭐',
          value: '${summary.totalXpThisWeek}',
          label: 'XP earned',
          gradientColors: [Colors.purple.shade50, Colors.pink.shade50],
          borderColor: Colors.purple.shade200,
          valueColor: Colors.purple.shade700,
          labelColor: Colors.purple.shade600,
        ),
        _StatCard(
          emoji: '🔥',
          value: '${summary.currentStreak}',
          label: 'Day streak',
          gradientColors: [AivoBrand.sunshine[50]!, Colors.yellow.shade50],
          borderColor: AivoBrand.sunshine[200]!,
          valueColor: AivoBrand.sunshine[700]!,
          labelColor: AivoBrand.sunshine[600]!,
        ),
        _StatCard(
          emoji: '📚',
          value: '${summary.lessonsCompleted}',
          label: 'Lessons completed',
          gradientColors: [AivoBrand.mint[50]!, Colors.teal.shade50],
          borderColor: AivoBrand.mint[200]!,
          valueColor: AivoBrand.mint[700]!,
          labelColor: AivoBrand.mint[600]!,
        ),
      ],
    );
  }

  Widget _buildWeeklyChart(ThemeData theme, ColorScheme colorScheme, ProgressSummary summary) {
    final maxMinutes = summary.weeklyStats
        .map((s) => s.minutes)
        .reduce((a, b) => a > b ? a : b);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('📊', style: TextStyle(fontSize: 20)),
                const SizedBox(width: 8),
                Text(
                  'Weekly Learning Time',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 180,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: summary.weeklyStats.asMap().entries.map((entry) {
                  final index = entry.key;
                  final stat = entry.value;
                  final heightPercent =
                      maxMinutes > 0 ? stat.minutes / maxMinutes : 0.0;
                  final isToday = index == DateTime.now().weekday - 1;

                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Container(
                            height: 140 * heightPercent,
                            decoration: BoxDecoration(
                              gradient: stat.minutes > 0
                                  ? LinearGradient(
                                      begin: Alignment.bottomCenter,
                                      end: Alignment.topCenter,
                                      colors: [
                                        Colors.blue.shade500,
                                        Colors.cyan.shade400,
                                      ],
                                    )
                                  : null,
                              color: stat.minutes == 0
                                  ? colorScheme.surfaceContainerHighest
                                  : null,
                              borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(8),
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            stat.day,
                            style: theme.textTheme.labelMedium?.copyWith(
                              fontWeight: isToday ? FontWeight.bold : null,
                              color: isToday
                                  ? colorScheme.primary
                                  : colorScheme.onSurfaceVariant,
                            ),
                          ),
                          Text(
                            '${stat.minutes}m',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubjectProgress(ThemeData theme, ColorScheme colorScheme, ProgressSummary summary) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('📚', style: TextStyle(fontSize: 20)),
                const SizedBox(width: 8),
                Text(
                  'Subject Progress',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...summary.subjectProgress.map((subject) {
              final color = _hexToColor(subject.colorHex);
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          subject.subject,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          '${subject.lessonsCompleted}/${subject.totalLessons} lessons',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: subject.progress / 100,
                              backgroundColor: color.withOpacity(0.2),
                              valueColor: AlwaysStoppedAnimation(color),
                              minHeight: 8,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        SizedBox(
                          width: 40,
                          child: Text(
                            '${subject.progress}%',
                            style: theme.textTheme.labelMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                            textAlign: TextAlign.right,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Mastery Level: ${subject.mastery}%',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
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

  Widget _buildSkills(ThemeData theme, ColorScheme colorScheme, ProgressSummary summary) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('💪', style: TextStyle(fontSize: 20)),
                const SizedBox(width: 8),
                Text(
                  'Skills',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 2.0,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: summary.skills.length,
              itemBuilder: (context, index) {
                final skill = summary.skills[index];
                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                        children: [
                          Text(skill.emoji, style: const TextStyle(fontSize: 16)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              skill.skill,
                              style: theme.textTheme.labelMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: List.generate(skill.maxLevel, (i) {
                          return Expanded(
                            child: Container(
                              height: 6,
                              margin: EdgeInsets.only(right: i < skill.maxLevel - 1 ? 4 : 0),
                              decoration: BoxDecoration(
                                color: i < skill.level
                                    ? Colors.amber.shade400
                                    : colorScheme.outlineVariant,
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Level ${skill.level}/${skill.maxLevel}',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentActivity(ThemeData theme, ColorScheme colorScheme, ProgressSummary summary) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('🕐', style: TextStyle(fontSize: 20)),
                const SizedBox(width: 8),
                Text(
                  'Recent Activity',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...summary.recentActivity.map((activity) {
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Text(activity.emoji, style: const TextStyle(fontSize: 20)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            activity.title,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            activity.time,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.purple.shade100,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '+${activity.xp} XP',
                        style: theme.textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.purple.shade700,
                        ),
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
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.emoji,
    required this.value,
    required this.label,
    required this.gradientColors,
    required this.borderColor,
    required this.valueColor,
    required this.labelColor,
  });

  final String emoji;
  final String value;
  final String label;
  final List<Color> gradientColors;
  final Color borderColor;
  final Color valueColor;
  final Color labelColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: gradientColors,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 24)),
          const SizedBox(height: 8),
          Text(
            value,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: valueColor,
            ),
          ),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: labelColor,
            ),
          ),
        ],
      ),
    );
  }
}

// Extension for emerald color
extension EmeraldColors on Colors {
  static MaterialColor get emerald => const MaterialColor(
        0xFF10B981,
        <int, Color>{
          50: Color(0xFFECFDF5),
          100: Color(0xFFD1FAE5),
          200: Color(0xFFA7F3D0),
          300: Color(0xFF6EE7B7),
          400: Color(0xFF34D399),
          500: Color(0xFF10B981),
          600: Color(0xFF059669),
          700: Color(0xFF047857),
          800: Color(0xFF065F46),
          900: Color(0xFF064E3B),
        },
      );
}
