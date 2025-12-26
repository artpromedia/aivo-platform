import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../core/api_client.dart';
import '../widgets/subject_progress_chart.dart';
import '../widgets/activity_list.dart';
import '../widgets/child_selector.dart';

part 'dashboard_provider.g.dart';

// Parent profile model
class ParentProfile {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final List<ChildInfo> students;

  ParentProfile({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.students,
  });

  factory ParentProfile.fromJson(Map<String, dynamic> json) {
    return ParentProfile(
      id: json['id'] as String,
      email: json['email'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
      students: (json['students'] as List<dynamic>)
          .map((s) => ChildInfo(
                id: s['id'] as String,
                name: '${s['firstName']} ${s['lastName']}',
                grade: s['grade']?.toString(),
                avatarUrl: s['avatarUrl'] as String?,
              ))
          .toList(),
    );
  }
}

// Student summary model
class StudentSummary {
  final int weeklyTimeSpent;
  final int activeDays;
  final int averageScore;
  final String? timeTrend;
  final String? scoreTrend;
  final List<SubjectProgress> subjectProgress;
  final List<Activity> recentActivity;

  StudentSummary({
    required this.weeklyTimeSpent,
    required this.activeDays,
    required this.averageScore,
    this.timeTrend,
    this.scoreTrend,
    required this.subjectProgress,
    required this.recentActivity,
  });

  factory StudentSummary.fromJson(Map<String, dynamic> json) {
    return StudentSummary(
      weeklyTimeSpent: json['weeklyTimeSpent'] as int? ?? 0,
      activeDays: json['activeDays'] as int? ?? 0,
      averageScore: json['averageScore'] as int? ?? 0,
      timeTrend: json['timeTrend'] as String?,
      scoreTrend: json['scoreTrend'] as String?,
      subjectProgress: (json['subjectProgress'] as List<dynamic>?)
              ?.map((s) => SubjectProgress(
                    subject: s['subject'] as String,
                    average: s['average'] as int,
                    timeSpent: s['timeSpent'] as int? ?? 0,
                    trend: s['trend'] as String? ?? 'stable',
                  ))
              .toList() ??
          [],
      recentActivity: (json['recentActivity'] as List<dynamic>?)
              ?.map((a) => Activity(
                    id: a['id'] as String,
                    type: a['type'] as String,
                    title: a['title'] as String,
                    subject: a['subject'] as String,
                    score: a['score'] as int?,
                    completedAt: DateTime.parse(a['completedAt'] as String),
                  ))
              .toList() ??
          [],
    );
  }
}

// Provider for parent profile
@riverpod
Future<ParentProfile> parentProfile(Ref ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/parent/profile');
  return ParentProfile.fromJson(response.data);
}

// Provider for student summary
@riverpod
Future<StudentSummary> studentSummary(Ref ref, String studentId) async {
  if (studentId.isEmpty) {
    return StudentSummary(
      weeklyTimeSpent: 0,
      activeDays: 0,
      averageScore: 0,
      subjectProgress: [],
      recentActivity: [],
    );
  }
  
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/parent/students/$studentId/summary');
  return StudentSummary.fromJson(response.data);
}

// Provider for selected child
final selectedChildProvider = StateProvider<String?>((ref) => null);
