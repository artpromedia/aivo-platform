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

/// Mock data generators for parent app
class MockData {
  static Map<String, dynamic> child({
    String id = 'c1',
    String firstName = 'Test',
    String lastName = 'Child',
    int gradeLevel = 5,
    String? avatarUrl,
  }) {
    return {
      'id': id,
      'firstName': firstName,
      'lastName': lastName,
      'gradeLevel': gradeLevel,
      'avatarUrl': avatarUrl,
    };
  }

  static Map<String, dynamic> progressSummary({
    String childId = 'c1',
    double weeklyProgress = 0.75,
    int lessonsCompleted = 15,
    int totalMinutes = 180,
    int streakDays = 7,
    List<Map<String, dynamic>>? recentActivity,
  }) {
    return {
      'childId': childId,
      'weeklyProgress': weeklyProgress,
      'lessonsCompleted': lessonsCompleted,
      'totalMinutesThisWeek': totalMinutes,
      'streakDays': streakDays,
      'recentActivity': recentActivity ?? [],
    };
  }

  static Map<String, dynamic> message({
    String id = 'm1',
    String senderId = 'teacher1',
    String senderName = 'Ms. Smith',
    String content = 'Test message',
    String sentAt = '2024-01-15T10:00:00Z',
    bool isRead = false,
  }) {
    return {
      'id': id,
      'senderId': senderId,
      'senderName': senderName,
      'content': content,
      'sentAt': sentAt,
      'isRead': isRead,
    };
  }

  static Map<String, dynamic> notification({
    String id = 'n1',
    String type = 'achievement',
    String title = 'New Achievement!',
    String body = 'Your child earned a badge.',
    String sentAt = '2024-01-15T10:00:00Z',
    bool isRead = false,
    Map<String, dynamic>? data,
  }) {
    return {
      'id': id,
      'type': type,
      'title': title,
      'body': body,
      'sentAt': sentAt,
      'isRead': isRead,
      'data': data ?? {},
    };
  }

  static Map<String, dynamic> weeklyReport({
    String childId = 'c1',
    String weekOf = '2024-01-15',
    int minutesLearned = 180,
    int lessonsCompleted = 15,
    double accuracyRate = 0.85,
    List<String>? strengths,
    List<String>? areasForImprovement,
  }) {
    return {
      'childId': childId,
      'weekOf': weekOf,
      'minutesLearned': minutesLearned,
      'lessonsCompleted': lessonsCompleted,
      'accuracyRate': accuracyRate,
      'strengths': strengths ?? ['Math addition', 'Reading fluency'],
      'areasForImprovement': areasForImprovement ?? ['Spelling'],
    };
  }
}
