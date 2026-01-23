/// Progress Service
///
/// Handles fetching progress and goals data from APIs.
library;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/environment.dart';
import 'progress_models.dart';

/// Log warning when mock data is used in non-debug mode
void _logMockWarning(String feature) {
  assert(() {
    debugPrint('⚠️ WARNING: $feature is using mock data.');
    return true;
  }());
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for fetching learner progress data.
class ProgressService {
  ProgressService({String? accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: EnvironmentConfig.analyticsBaseUrl,
          headers:
              accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 15),
        ));

  final Dio _dio;

  /// Fetch progress summary for a learner.
  Future<ProgressSummary> getProgressSummary(String learnerId) async {
    if (EnvironmentConfig.useAnalyticsMock) {
      _logMockWarning('Progress summary');
      await Future.delayed(const Duration(milliseconds: 500));
      return _mockProgressSummary(learnerId);
    }

    final response = await _dio.get<Map<String, dynamic>>(
      '/analytics/learners/$learnerId/progress-summary',
    );

    if (response.data == null) {
      throw Exception('No data returned');
    }

    return ProgressSummary.fromJson(response.data!);
  }

  /// Fetch goals for a learner.
  Future<GoalsData> getGoals(String learnerId) async {
    if (EnvironmentConfig.useAnalyticsMock) {
      _logMockWarning('Goals');
      await Future.delayed(const Duration(milliseconds: 500));
      return _mockGoals(learnerId);
    }

    final response = await _dio.get<Map<String, dynamic>>(
      '/analytics/learners/$learnerId/goals',
    );

    if (response.data == null) {
      throw Exception('No data returned');
    }

    return GoalsData.fromJson(response.data!);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK DATA
  // ═══════════════════════════════════════════════════════════════════════════

  ProgressSummary _mockProgressSummary(String learnerId) {
    return const ProgressSummary(
      totalMinutesThisWeek: 215,
      totalXpThisWeek: 710,
      currentStreak: 5,
      lessonsCompleted: 31,
      weeklyStats: [
        DailyStat(day: 'Mon', minutes: 45, xp: 150),
        DailyStat(day: 'Tue', minutes: 30, xp: 100),
        DailyStat(day: 'Wed', minutes: 60, xp: 200),
        DailyStat(day: 'Thu', minutes: 25, xp: 80),
        DailyStat(day: 'Fri', minutes: 40, xp: 130),
        DailyStat(day: 'Sat', minutes: 15, xp: 50),
        DailyStat(day: 'Sun', minutes: 0, xp: 0),
      ],
      subjectProgress: [
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
      skills: [
        SkillProgress(skill: 'Fractions', level: 4, maxLevel: 5, emoji: '🔢'),
        SkillProgress(
            skill: 'Reading Comprehension', level: 5, maxLevel: 5, emoji: '📖'),
        SkillProgress(
            skill: 'Scientific Method', level: 3, maxLevel: 5, emoji: '🔬'),
        SkillProgress(
            skill: 'Problem Solving', level: 4, maxLevel: 5, emoji: '🧩'),
        SkillProgress(skill: 'Writing', level: 3, maxLevel: 5, emoji: '✍️'),
        SkillProgress(skill: 'Geography', level: 2, maxLevel: 5, emoji: '🗺️'),
      ],
      recentActivity: [
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
  }

  GoalsData _mockGoals(String learnerId) {
    return GoalsData(
      activeGoals: [
        LearningGoal(
          id: '1',
          title: 'Complete 5 Math Lessons',
          description: 'Work through fractions and decimals unit',
          type: GoalType.lessons,
          targetValue: 5,
          currentValue: 3,
          deadline: DateTime.now().add(const Duration(days: 7)),
          status: GoalStatus.active,
          objectives: const [
            GoalObjective(id: 'o1', title: 'Intro to Fractions', isComplete: true),
            GoalObjective(id: 'o2', title: 'Adding Fractions', isComplete: true),
            GoalObjective(
                id: 'o3', title: 'Subtracting Fractions', isComplete: true),
            GoalObjective(
                id: 'o4', title: 'Multiplying Fractions', isComplete: false),
            GoalObjective(
                id: 'o5', title: 'Dividing Fractions', isComplete: false),
          ],
        ),
        LearningGoal(
          id: '2',
          title: 'Earn 500 XP This Week',
          description: 'Stay consistent and learn every day!',
          type: GoalType.xp,
          targetValue: 500,
          currentValue: 350,
          deadline: DateTime.now().add(const Duration(days: 3)),
          status: GoalStatus.active,
        ),
        LearningGoal(
          id: '3',
          title: 'Build a 7-Day Streak',
          description: 'Practice every day for a week',
          type: GoalType.streak,
          targetValue: 7,
          currentValue: 5,
          status: GoalStatus.active,
        ),
        LearningGoal(
          id: '4',
          title: 'Read for 60 Minutes',
          description: 'Use reading tools to practice',
          type: GoalType.minutes,
          targetValue: 60,
          currentValue: 25,
          deadline: DateTime.now().add(const Duration(days: 5)),
          status: GoalStatus.active,
        ),
      ],
      completedGoals: [
        const LearningGoal(
          id: 'c1',
          title: 'Complete Science Unit 1',
          description: 'Learned about the scientific method',
          type: GoalType.subject,
          targetValue: 4,
          currentValue: 4,
          status: GoalStatus.completed,
        ),
        const LearningGoal(
          id: 'c2',
          title: 'First Week Streak',
          description: 'Practiced every day for 7 days',
          type: GoalType.streak,
          targetValue: 7,
          currentValue: 7,
          status: GoalStatus.completed,
        ),
        const LearningGoal(
          id: 'c3',
          title: 'Earn 1000 XP',
          description: 'Reached first XP milestone',
          type: GoalType.xp,
          targetValue: 1000,
          currentValue: 1000,
          status: GoalStatus.completed,
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

/// Container for active and completed goals.
class GoalsData {
  const GoalsData({
    required this.activeGoals,
    required this.completedGoals,
  });

  final List<LearningGoal> activeGoals;
  final List<LearningGoal> completedGoals;

  factory GoalsData.fromJson(Map<String, dynamic> json) {
    return GoalsData(
      activeGoals: (json['activeGoals'] as List? ?? [])
          .map((e) => LearningGoal.fromJson(e as Map<String, dynamic>))
          .toList(),
      completedGoals: (json['completedGoals'] as List? ?? [])
          .map((e) => LearningGoal.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Progress service provider.
final progressServiceProvider = Provider<ProgressService>((ref) {
  return ProgressService();
});

/// Progress summary provider.
final progressSummaryProvider =
    FutureProvider.family<ProgressSummary, String>((ref, learnerId) async {
  final service = ref.read(progressServiceProvider);
  return service.getProgressSummary(learnerId);
});

/// Goals data provider.
final goalsDataProvider =
    FutureProvider.family<GoalsData, String>((ref, learnerId) async {
  final service = ref.read(progressServiceProvider);
  return service.getGoals(learnerId);
});
