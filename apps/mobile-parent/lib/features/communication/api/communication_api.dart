/// Communication API
///
/// API client for homework transcripts, teacher notes, and reports.
library;

import 'package:dio/dio.dart';

import '../models/communication_models.dart';

/// API client for communication features.
class CommunicationApi {
  CommunicationApi({required this.dio});

  final Dio dio;

  // ============================================================
  // Homework Transcripts APIs
  // ============================================================

  /// Fetches homework transcripts for a child.
  Future<List<HomeworkTranscript>> fetchTranscripts(
    String childId, {
    int limit = 20,
    int offset = 0,
    String? subject,
    DateTime? fromDate,
    DateTime? toDate,
  }) async {
    final response = await dio.get(
      '/api/v1/children/$childId/transcripts',
      queryParameters: {
        'limit': limit,
        'offset': offset,
        if (subject != null) 'subject': subject,
        if (fromDate != null) 'from_date': fromDate.toIso8601String(),
        if (toDate != null) 'to_date': toDate.toIso8601String(),
      },
    );
    return (response.data as List)
        .map((json) => HomeworkTranscript.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Fetches a specific homework transcript.
  Future<HomeworkTranscript> fetchTranscript(
    String childId,
    String transcriptId,
  ) async {
    final response = await dio.get(
      '/api/v1/children/$childId/transcripts/$transcriptId',
    );
    return HomeworkTranscript.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetches recent transcripts summary.
  Future<List<HomeworkTranscript>> fetchRecentTranscripts(
    String childId, {
    int days = 7,
  }) async {
    final response = await dio.get(
      '/api/v1/children/$childId/transcripts/recent',
      queryParameters: {'days': days},
    );
    return (response.data as List)
        .map((json) => HomeworkTranscript.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  // ============================================================
  // Teacher Notes APIs
  // ============================================================

  /// Fetches teacher notes for a child.
  Future<List<TeacherNote>> fetchTeacherNotes(
    String childId, {
    int limit = 20,
    int offset = 0,
    bool? unreadOnly,
    TeacherNoteType? type,
  }) async {
    final response = await dio.get(
      '/api/v1/children/$childId/teacher-notes',
      queryParameters: {
        'limit': limit,
        'offset': offset,
        if (unreadOnly != null) 'unread_only': unreadOnly,
        if (type != null) 'type': type.name.toUpperCase(),
      },
    );
    return (response.data as List)
        .map((json) => TeacherNote.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Fetches a specific teacher note.
  Future<TeacherNote> fetchTeacherNote(String childId, String noteId) async {
    final response = await dio.get(
      '/api/v1/children/$childId/teacher-notes/$noteId',
    );
    return TeacherNote.fromJson(response.data as Map<String, dynamic>);
  }

  /// Marks a teacher note as read.
  Future<TeacherNote> markNoteAsRead(String childId, String noteId) async {
    final response = await dio.post(
      '/api/v1/children/$childId/teacher-notes/$noteId/read',
    );
    return TeacherNote.fromJson(response.data as Map<String, dynamic>);
  }

  /// Acknowledges a teacher note.
  Future<TeacherNote> acknowledgeNote(String childId, String noteId) async {
    final response = await dio.post(
      '/api/v1/children/$childId/teacher-notes/$noteId/acknowledge',
    );
    return TeacherNote.fromJson(response.data as Map<String, dynamic>);
  }

  /// Responds to a teacher note.
  Future<TeacherNote> respondToNote(
    String childId,
    String noteId,
    String response,
  ) async {
    final resp = await dio.post(
      '/api/v1/children/$childId/teacher-notes/$noteId/respond',
      data: {'response': response},
    );
    return TeacherNote.fromJson(resp.data as Map<String, dynamic>);
  }

  /// Fetches unread note count.
  Future<int> fetchUnreadNoteCount(String childId) async {
    final response = await dio.get(
      '/api/v1/children/$childId/teacher-notes/unread-count',
    );
    return response.data['count'] as int;
  }

  // ============================================================
  // Progress Reports APIs
  // ============================================================

  /// Fetches progress reports for a child.
  Future<List<ProgressReport>> fetchReports(
    String childId, {
    int limit = 10,
    ReportPeriod? period,
  }) async {
    final response = await dio.get(
      '/api/v1/children/$childId/reports',
      queryParameters: {
        'limit': limit,
        if (period != null) 'period': period.name.toUpperCase(),
      },
    );
    return (response.data as List)
        .map((json) => ProgressReport.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Fetches a specific progress report.
  Future<ProgressReport> fetchReport(String childId, String reportId) async {
    final response = await dio.get(
      '/api/v1/children/$childId/reports/$reportId',
    );
    return ProgressReport.fromJson(response.data as Map<String, dynamic>);
  }

  /// Generates a new progress report.
  Future<ProgressReport> generateReport(
    String childId,
    ReportRequest request,
  ) async {
    final response = await dio.post(
      '/api/v1/children/$childId/reports/generate',
      data: request.toJson(),
    );
    return ProgressReport.fromJson(response.data as Map<String, dynamic>);
  }

  /// Downloads a report PDF.
  Future<String> downloadReportPdf(String childId, String reportId) async {
    final response = await dio.get(
      '/api/v1/children/$childId/reports/$reportId/pdf',
    );
    return response.data['download_url'] as String;
  }

  /// Fetches the latest report.
  Future<ProgressReport?> fetchLatestReport(String childId) async {
    try {
      final response = await dio.get(
        '/api/v1/children/$childId/reports/latest',
      );
      return ProgressReport.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  /// Shares a report via email.
  Future<void> shareReport(
    String childId,
    String reportId, {
    required List<String> emails,
    String? message,
  }) async {
    await dio.post(
      '/api/v1/children/$childId/reports/$reportId/share',
      data: {
        'emails': emails,
        if (message != null) 'message': message,
      },
    );
  }
}
