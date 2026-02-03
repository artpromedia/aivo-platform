/// Communication Providers
///
/// State management for transcripts, teacher notes, and reports.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../api/communication_api.dart';
import '../models/communication_models.dart';

part 'communication_provider.g.dart';

/// Provider for communication API.
@riverpod
CommunicationApi communicationApi(Ref ref) {
  final dio = ref.watch(dioProvider);
  return CommunicationApi(dio: dio);
}

// ============================================================
// Homework Transcripts Providers
// ============================================================

/// Provider for homework transcripts list.
@riverpod
class TranscriptsNotifier extends _$TranscriptsNotifier {
  @override
  Future<List<HomeworkTranscript>> build(String childId) async {
    final api = ref.watch(communicationApiProvider);
    return api.fetchTranscripts(childId);
  }

  /// Loads more transcripts (pagination).
  Future<void> loadMore() async {
    final current = state.valueOrNull ?? [];
    final api = ref.read(communicationApiProvider);
    final more = await api.fetchTranscripts(arg, offset: current.length);
    state = AsyncData([...current, ...more]);
  }

  /// Filters transcripts by subject.
  Future<void> filterBySubject(String? subject) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(communicationApiProvider);
      return api.fetchTranscripts(arg, subject: subject);
    });
  }

  /// Refreshes transcript list.
  Future<void> refresh() async {
    ref.invalidateSelf();
  }
}

/// Provider for a single transcript.
@riverpod
Future<HomeworkTranscript> transcript(
  Ref ref,
  String childId,
  String transcriptId,
) async {
  final api = ref.watch(communicationApiProvider);
  return api.fetchTranscript(childId, transcriptId);
}

/// Provider for recent transcripts.
@riverpod
Future<List<HomeworkTranscript>> recentTranscripts(Ref ref, String childId) async {
  final api = ref.watch(communicationApiProvider);
  return api.fetchRecentTranscripts(childId);
}

// ============================================================
// Teacher Notes Providers
// ============================================================

/// Notifier for teacher notes.
@riverpod
class TeacherNotesNotifier extends _$TeacherNotesNotifier {
  @override
  Future<List<TeacherNote>> build(String childId) async {
    final api = ref.watch(communicationApiProvider);
    return api.fetchTeacherNotes(childId);
  }

  /// Loads only unread notes.
  Future<void> loadUnread() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(communicationApiProvider);
      return api.fetchTeacherNotes(arg, unreadOnly: true);
    });
  }

  /// Filters by note type.
  Future<void> filterByType(TeacherNoteType? type) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(communicationApiProvider);
      return api.fetchTeacherNotes(arg, type: type);
    });
  }

  /// Marks a note as read.
  Future<void> markAsRead(String noteId) async {
    final api = ref.read(communicationApiProvider);
    final updated = await api.markNoteAsRead(arg, noteId);
    _updateNote(updated);
    ref.invalidate(unreadNoteCountProvider(arg));
  }

  /// Acknowledges a note.
  Future<void> acknowledge(String noteId) async {
    final api = ref.read(communicationApiProvider);
    final updated = await api.acknowledgeNote(arg, noteId);
    _updateNote(updated);
  }

  /// Responds to a note.
  Future<void> respond(String noteId, String response) async {
    final api = ref.read(communicationApiProvider);
    final updated = await api.respondToNote(arg, noteId, response);
    _updateNote(updated);
  }

  void _updateNote(TeacherNote updated) {
    final current = state.valueOrNull ?? [];
    state = AsyncData(
      current.map((n) => n.id == updated.id ? updated : n).toList(),
    );
  }

  /// Refreshes notes.
  Future<void> refresh() async {
    ref.invalidateSelf();
  }
}

/// Provider for a single teacher note.
@riverpod
Future<TeacherNote> teacherNote(
  Ref ref,
  String childId,
  String noteId,
) async {
  final api = ref.watch(communicationApiProvider);
  return api.fetchTeacherNote(childId, noteId);
}

/// Provider for unread note count.
@riverpod
Future<int> unreadNoteCount(Ref ref, String childId) async {
  final api = ref.watch(communicationApiProvider);
  return api.fetchUnreadNoteCount(childId);
}

/// Provider for notes filtered by priority.
@riverpod
Future<List<TeacherNote>> urgentNotes(Ref ref, String childId) async {
  final allNotes = await ref.watch(teacherNotesNotifierProvider(childId).future);
  return allNotes
      .where((n) =>
          n.priority == NotePriority.urgent || n.priority == NotePriority.high)
      .where((n) => !n.isRead)
      .toList();
}

// ============================================================
// Progress Reports Providers
// ============================================================

/// Notifier for progress reports.
@riverpod
class ReportsNotifier extends _$ReportsNotifier {
  @override
  Future<List<ProgressReport>> build(String childId) async {
    final api = ref.watch(communicationApiProvider);
    return api.fetchReports(childId);
  }

  /// Filters reports by period.
  Future<void> filterByPeriod(ReportPeriod? period) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(communicationApiProvider);
      return api.fetchReports(arg, period: period);
    });
  }

  /// Generates a new report.
  Future<ProgressReport> generateReport(ReportRequest request) async {
    final api = ref.read(communicationApiProvider);
    final report = await api.generateReport(arg, request);
    final current = state.valueOrNull ?? [];
    state = AsyncData([report, ...current]);
    return report;
  }

  /// Refreshes reports.
  Future<void> refresh() async {
    ref.invalidateSelf();
  }
}

/// Provider for a single report.
@riverpod
Future<ProgressReport> report(
  Ref ref,
  String childId,
  String reportId,
) async {
  final api = ref.watch(communicationApiProvider);
  return api.fetchReport(childId, reportId);
}

/// Provider for the latest report.
@riverpod
Future<ProgressReport?> latestReport(Ref ref, String childId) async {
  final api = ref.watch(communicationApiProvider);
  return api.fetchLatestReport(childId);
}

/// Notifier for report generation state.
@riverpod
class ReportGenerationNotifier extends _$ReportGenerationNotifier {
  @override
  AsyncValue<ProgressReport?> build() => const AsyncData(null);

  /// Generates a new report.
  Future<ProgressReport> generate(String childId, ReportRequest request) async {
    state = const AsyncLoading();
    try {
      final api = ref.read(communicationApiProvider);
      final report = await api.generateReport(childId, request);
      state = AsyncData(report);
      ref.invalidate(reportsNotifierProvider(childId));
      return report;
    } catch (e, s) {
      state = AsyncError(e, s);
      rethrow;
    }
  }
}

/// Notifier for report sharing.
@riverpod
class ReportShareNotifier extends _$ReportShareNotifier {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  /// Shares a report via email.
  Future<void> share(
    String childId,
    String reportId, {
    required List<String> emails,
    String? message,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(communicationApiProvider);
      await api.shareReport(childId, reportId, emails: emails, message: message);
    });
  }

  /// Downloads a report PDF.
  Future<String> downloadPdf(String childId, String reportId) async {
    final api = ref.read(communicationApiProvider);
    return api.downloadReportPdf(childId, reportId);
  }
}

// ============================================================
// Combined Dashboard Providers
// ============================================================

/// Provider for communication dashboard data.
@riverpod
Future<CommunicationDashboard> communicationDashboard(Ref ref, String childId) async {
  final unreadCount = await ref.watch(unreadNoteCountProvider(childId).future);
  final urgentNotesList = await ref.watch(urgentNotesProvider(childId).future);
  final latestReportData = await ref.watch(latestReportProvider(childId).future);
  final recentTranscriptsList = await ref.watch(recentTranscriptsProvider(childId).future);

  return CommunicationDashboard(
    unreadNoteCount: unreadCount,
    urgentNotes: urgentNotesList,
    latestReport: latestReportData,
    recentTranscripts: recentTranscriptsList,
  );
}

/// Dashboard data model.
class CommunicationDashboard {
  const CommunicationDashboard({
    required this.unreadNoteCount,
    required this.urgentNotes,
    required this.latestReport,
    required this.recentTranscripts,
  });

  final int unreadNoteCount;
  final List<TeacherNote> urgentNotes;
  final ProgressReport? latestReport;
  final List<HomeworkTranscript> recentTranscripts;
}
