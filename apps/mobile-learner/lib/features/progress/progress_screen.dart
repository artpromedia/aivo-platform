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

import 'progress_models.dart';

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
  bool _isLoading = true;
  late ProgressSummary _summary;

  // Mock data for demo
  final _mockSummary = ProgressSummary(
    totalMinutesThisWeek: 215,
    totalXpThisWeek: 710,
    currentStreak: 5,
    lessonsCompleted: 31,
    weeklyStats: const [
      DailyStat(day: 'Mon', minutes: 45, xp: 150),
      DailyStat(day: 'Tue', minutes: 30, xp: 100),
      DailyStat(day: 'Wed', minutes: 60, xp: 200),
      DailyStat(day: 'Thu', minutes: 25, xp: 80),
      DailyStat(day: 'Fri', minutes: 40, xp: 130),
      DailyStat(day: 'Sat', minutes: 15, xp: 50),
      DailyStat(day: 'Sun', minutes: 0, xp: 0),
    ],
    subjectProgress: const [
      SubjectProgress(
        subject: 'Math',
        progress: 45,
        colorHex: '#3B82F6',
        lessonsCompleted: 11,
        totalLessons: 24,
        mastery: 72,
      ),
      SubjectProgress(
        subject: 'Science',
        progress: 30,
        colorHex: '#22C55E',
        lessonsCompleted: 6,
        totalLessons: 20,
        mastery: 65,
      ),
      SubjectProgress(
        subject: 'Reading',
        progress: 60,
        colorHex: '#A855F7',
        lessonsCompleted: 11,
        totalLessons: 18,
        mastery: 85,
      ),
      SubjectProgress(
        subject: 'Social Studies',
        progress: 20,
        colorHex: '#F97316',
        lessonsCompleted: 3,
        totalLessons: 16,
        mastery: 55,
      ),
    ],
    skills: const [
      SkillProgress(skill: 'Fractions', level: 4, maxLevel: 5, emoji: '🔢'),
      SkillProgress(skill: 'Reading Comprehension', level: 5, maxLevel: 5, emoji: '📖'),
      SkillProgress(skill: 'Scientific Method', level: 3, maxLevel: 5, emoji: '🔬'),
      SkillProgress(skill: 'Problem Solving', level: 4, maxLevel: 5, emoji: '🧩'),
      SkillProgress(skill: 'Writing', level: 3, maxLevel: 5, emoji: '✍️'),
      SkillProgress(skill: 'Geography', level: 2, maxLevel: 5, emoji: '🗺️'),
    ],
    recentActivity: const [
      RecentActivity(
        id: '1',
        type: 'lesson',
        title: 'Completed "Dividing Fractions"',
        xp: 50,
        time: '2 hours ago',
        emoji: '📖',
      ),
      RecentActivity(
        id: '2',
        type: 'quiz',
        title: 'Passed Math Quiz',
        xp: 100,
        time: '4 hours ago',
        emoji: '✅',
      ),
      RecentActivity(
        id: '3',
        type: 'game',
        title: 'Played Focus Game',
        xp: 25,
        time: '1 day ago',
        emoji: '🎮',
      ),
      RecentActivity(
        id: '4',
        type: 'lesson',
        title: 'Started "The Water Cycle"',
        xp: 10,
        time: '1 day ago',
        emoji: '📖',
      ),
      RecentActivity(
        id: '5',
        type: 'achievement',
        title: 'Earned "Math Whiz" badge',
        xp: 75,
        time: '2 days ago',
        emoji: '🏆',
      ),
    ],
  );

  @override
  void initState() {
    super.initState();
    _loadProgress();
  }

  Future<void> _loadProgress() async {
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() {
      _summary = _mockSummary;
      _isLoading = false;
    });
  }

  Color _hexToColor(String hex) {
    hex = hex.replaceFirst('#', '');
    if (hex.length == 6) hex = 'FF$hex';
    return Color(int.parse(hex, radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Progress'),
      ),
      body: RefreshIndicator(
        onRefresh: _loadProgress,
        child: SingleChildScrollView(
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
              _buildStatsOverview(theme, colorScheme),
              const SizedBox(height: 24),

              // Weekly Activity Chart
              _buildWeeklyChart(theme, colorScheme),
              const SizedBox(height: 24),

              // Subject Progress
              _buildSubjectProgress(theme, colorScheme),
              const SizedBox(height: 24),

              // Skills
              _buildSkills(theme, colorScheme),
              const SizedBox(height: 24),

              // Recent Activity
              _buildRecentActivity(theme, colorScheme),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsOverview(ThemeData theme, ColorScheme colorScheme) {
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
          value: '${_summary.totalMinutesThisWeek}',
          label: 'Minutes this week',
          gradientColors: [Colors.blue.shade50, Colors.cyan.shade50],
          borderColor: Colors.blue.shade200,
          valueColor: Colors.blue.shade700,
          labelColor: Colors.blue.shade600,
        ),
        _StatCard(
          emoji: '⭐',
          value: '${_summary.totalXpThisWeek}',
          label: 'XP earned',
          gradientColors: [Colors.purple.shade50, Colors.pink.shade50],
          borderColor: Colors.purple.shade200,
          valueColor: Colors.purple.shade700,
          labelColor: Colors.purple.shade600,
        ),
        _StatCard(
          emoji: '🔥',
          value: '${_summary.currentStreak}',
          label: 'Day streak',
          gradientColors: [AivoBrand.sunshine[50]!, Colors.yellow.shade50],
          borderColor: AivoBrand.sunshine[200]!,
          valueColor: AivoBrand.sunshine[700]!,
          labelColor: AivoBrand.sunshine[600]!,
        ),
        _StatCard(
          emoji: '📚',
          value: '${_summary.lessonsCompleted}',
          label: 'Lessons completed',
          gradientColors: [AivoBrand.mint[50]!, Colors.teal.shade50],
          borderColor: AivoBrand.mint[200]!,
          valueColor: AivoBrand.mint[700]!,
          labelColor: AivoBrand.mint[600]!,
        ),
      ],
    );
  }

  Widget _buildWeeklyChart(ThemeData theme, ColorScheme colorScheme) {
    final maxMinutes = _summary.weeklyStats
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
                children: _summary.weeklyStats.asMap().entries.map((entry) {
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

  Widget _buildSubjectProgress(ThemeData theme, ColorScheme colorScheme) {
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
            ..._summary.subjectProgress.map((subject) {
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

  Widget _buildSkills(ThemeData theme, ColorScheme colorScheme) {
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
              itemCount: _summary.skills.length,
              itemBuilder: (context, index) {
                final skill = _summary.skills[index];
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

  Widget _buildRecentActivity(ThemeData theme, ColorScheme colorScheme) {
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
            ..._summary.recentActivity.map((activity) {
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
