import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Creates a testable widget wrapped with MaterialApp and ProviderScope.
Widget createTestableWidget(
  Widget child, {
  List<Override>? overrides,
  ThemeData? theme,
}) {
  return ProviderScope(
    overrides: overrides ?? [],
    child: MaterialApp(
      theme: theme ?? ThemeData.light(),
      home: child,
    ),
  );
}

/// Mock data generators for learner app
class MockData {
  static Map<String, dynamic> learner({
    String id = 'l1',
    String displayName = 'Test Learner',
    String gradeBand = '3-5',
    String? avatarUrl,
  }) {
    return {
      'id': id,
      'displayName': displayName,
      'gradeBand': gradeBand,
      'avatarUrl': avatarUrl,
    };
  }

  static Map<String, dynamic> lesson({
    String id = 'les1',
    String title = 'Test Lesson',
    String subject = 'math',
    int duration = 15,
    double progress = 0.0,
    bool completed = false,
  }) {
    return {
      'id': id,
      'title': title,
      'subject': subject,
      'durationMinutes': duration,
      'progress': progress,
      'completed': completed,
    };
  }

  static Map<String, dynamic> todayPlan({
    String id = 'plan1',
    String date = '2024-01-15',
    List<Map<String, dynamic>>? lessons,
  }) {
    return {
      'id': id,
      'date': date,
      'lessons': lessons ?? [
        lesson(id: 'les1', title: 'Math Lesson'),
        lesson(id: 'les2', title: 'Reading Lesson', subject: 'reading'),
      ],
    };
  }

  static Map<String, dynamic> achievement({
    String id = 'ach1',
    String title = 'First Steps',
    String description = 'Complete your first lesson',
    bool unlocked = false,
    String? unlockedAt,
    String iconUrl = 'https://example.com/icon.png',
  }) {
    return {
      'id': id,
      'title': title,
      'description': description,
      'unlocked': unlocked,
      'unlockedAt': unlockedAt,
      'iconUrl': iconUrl,
    };
  }

  static Map<String, dynamic> progressReport({
    String learnerId = 'l1',
    double overallProgress = 0.5,
    int lessonsCompleted = 10,
    int totalLessons = 20,
    int streakDays = 5,
    Map<String, double>? subjectProgress,
  }) {
    return {
      'learnerId': learnerId,
      'overallProgress': overallProgress,
      'lessonsCompleted': lessonsCompleted,
      'totalLessons': totalLessons,
      'streakDays': streakDays,
      'subjectProgress': subjectProgress ?? {
        'math': 0.6,
        'reading': 0.4,
        'science': 0.5,
      },
    };
  }
}
