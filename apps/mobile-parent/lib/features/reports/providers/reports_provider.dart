import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../core/api_client.dart';
import '../../dashboard/widgets/child_selector.dart';

part 'reports_provider.g.dart';

// Progress data point
class ProgressDataPoint {
  final String label;
  final int score;
  final DateTime date;

  ProgressDataPoint({
    required this.label,
    required this.score,
    required this.date,
  });

  factory ProgressDataPoint.fromJson(Map<String, dynamic> json) {
    return ProgressDataPoint(
      label: json['label'] as String,
      score: json['score'] as int,
      date: DateTime.parse(json['date'] as String),
    );
  }
}

// Subject score
class SubjectScore {
  final String name;
  final int score;
  final int timeSpent;

  SubjectScore({
    required this.name,
    required this.score,
    required this.timeSpent,
  });

  factory SubjectScore.fromJson(Map<String, dynamic> json) {
    return SubjectScore(
      name: json['name'] as String,
      score: json['score'] as int,
      timeSpent: json['timeSpent'] as int? ?? 0,
    );
  }
}

// Teacher note
class TeacherNote {
  final String id;
  final String teacherName;
  final String content;
  final DateTime createdAt;

  TeacherNote({
    required this.id,
    required this.teacherName,
    required this.content,
    required this.createdAt,
  });

  factory TeacherNote.fromJson(Map<String, dynamic> json) {
    return TeacherNote(
      id: json['id'] as String,
      teacherName: json['teacherName'] as String,
      content: json['content'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

// Progress report model
class ProgressReport {
  final int totalTimeMinutes;
  final int activeDays;
  final int averageScore;
  final List<ProgressDataPoint> progressData;
  final List<SubjectScore> subjectScores;
  final List<TeacherNote> teacherNotes;

  ProgressReport({
    required this.totalTimeMinutes,
    required this.activeDays,
    required this.averageScore,
    required this.progressData,
    required this.subjectScores,
    required this.teacherNotes,
  });

  factory ProgressReport.fromJson(Map<String, dynamic> json) {
    return ProgressReport(
      totalTimeMinutes: json['totalTimeMinutes'] as int? ?? 0,
      activeDays: json['activeDays'] as int? ?? 0,
      averageScore: json['averageScore'] as int? ?? 0,
      progressData: (json['progressData'] as List<dynamic>?)
              ?.map((p) => ProgressDataPoint.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      subjectScores: (json['subjectScores'] as List<dynamic>?)
              ?.map((s) => SubjectScore.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
      teacherNotes: (json['teacherNotes'] as List<dynamic>?)
              ?.map((n) => TeacherNote.fromJson(n as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

// Provider for children list in reports
@riverpod
Future<List<ChildInfo>> reportChildren(Ref ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/parent/students');
  final data = response.data as List<dynamic>;
  return data
      .map((s) => ChildInfo(
            id: s['id'] as String,
            name: '${s['firstName']} ${s['lastName']}',
            grade: s['grade']?.toString(),
            avatarUrl: s['avatarUrl'] as String?,
          ))
      .toList();
}

// Provider for progress report
@riverpod
Future<ProgressReport> progressReport(
  Ref ref, {
  required String studentId,
  required String period,
}) async {
  if (studentId.isEmpty) {
    return ProgressReport(
      totalTimeMinutes: 0,
      activeDays: 0,
      averageScore: 0,
      progressData: [],
      subjectScores: [],
      teacherNotes: [],
    );
  }

  final dio = ref.watch(dioProvider);
  final response = await dio.get(
    '/parent/students/$studentId/report',
    queryParameters: {'period': period},
  );
  return ProgressReport.fromJson(response.data as Map<String, dynamic>);
}

// Provider for downloading report PDF
@riverpod
Future<void> downloadReport(
  Ref ref, {
  required String studentId,
  required String period,
}) async {
  final dio = ref.watch(dioProvider);
  // In a real app, this would download the file
  await dio.get(
    '/parent/students/$studentId/report/pdf',
    queryParameters: {'period': period},
  );
}
