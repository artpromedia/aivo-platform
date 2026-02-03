/// Communication Models
///
/// Data models for homework transcripts, teacher notes, and reports.
library;

import 'package:freezed_annotation/freezed_annotation.dart';

part 'communication_models.freezed.dart';
part 'communication_models.g.dart';

/// Homework session transcript.
@freezed
class HomeworkTranscript with _$HomeworkTranscript {
  const factory HomeworkTranscript({
    required String id,
    required String childId,
    required String assignmentId,
    required String assignmentTitle,
    required String subject,
    required DateTime startTime,
    required DateTime endTime,
    required int durationMinutes,
    required List<TranscriptEntry> entries,
    required TranscriptSummary summary,
    required double completionPercentage,
    String? aiSummary,
  }) = _HomeworkTranscript;

  factory HomeworkTranscript.fromJson(Map<String, dynamic> json) =>
      _$HomeworkTranscriptFromJson(json);
}

/// Individual entry in a transcript.
@freezed
class TranscriptEntry with _$TranscriptEntry {
  const factory TranscriptEntry({
    required String id,
    required DateTime timestamp,
    required TranscriptEntryType type,
    required String content,
    String? questionAsked,
    String? aiResponse,
    String? hint,
    double? confidenceLevel,
    bool? wasCorrect,
    int? attemptNumber,
  }) = _TranscriptEntry;

  factory TranscriptEntry.fromJson(Map<String, dynamic> json) =>
      _$TranscriptEntryFromJson(json);
}

/// Types of transcript entries.
enum TranscriptEntryType {
  @JsonValue('QUESTION')
  question,
  @JsonValue('ANSWER')
  answer,
  @JsonValue('HINT_REQUESTED')
  hintRequested,
  @JsonValue('AI_EXPLANATION')
  aiExplanation,
  @JsonValue('STRUGGLE_DETECTED')
  struggleDetected,
  @JsonValue('BREAK_TAKEN')
  breakTaken,
  @JsonValue('TOPIC_CHANGE')
  topicChange,
  @JsonValue('MILESTONE_REACHED')
  milestoneReached,
}

/// Summary of a homework transcript.
@freezed
class TranscriptSummary with _$TranscriptSummary {
  const factory TranscriptSummary({
    required int totalQuestions,
    required int correctAnswers,
    required int hintsUsed,
    required int strugglesDetected,
    required List<String> topicsWorkedOn,
    required List<String> strengthsShown,
    required List<String> areasForImprovement,
    String? parentRecommendation,
  }) = _TranscriptSummary;

  factory TranscriptSummary.fromJson(Map<String, dynamic> json) =>
      _$TranscriptSummaryFromJson(json);
}

/// Teacher note/communication.
@freezed
class TeacherNote with _$TeacherNote {
  const factory TeacherNote({
    required String id,
    required String childId,
    required String teacherId,
    required String teacherName,
    required String subject,
    required DateTime createdAt,
    required TeacherNoteType type,
    required String title,
    required String content,
    required bool isRead,
    required NotePriority priority,
    DateTime? readAt,
    List<String>? attachmentUrls,
    String? actionRequired,
    DateTime? actionDueDate,
    bool? acknowledged,
    String? parentResponse,
  }) = _TeacherNote;

  factory TeacherNote.fromJson(Map<String, dynamic> json) =>
      _$TeacherNoteFromJson(json);
}

/// Types of teacher notes.
enum TeacherNoteType {
  @JsonValue('GENERAL')
  general,
  @JsonValue('PROGRESS_UPDATE')
  progressUpdate,
  @JsonValue('CONCERN')
  concern,
  @JsonValue('ACHIEVEMENT')
  achievement,
  @JsonValue('BEHAVIOR')
  behavior,
  @JsonValue('IEP_UPDATE')
  iepUpdate,
  @JsonValue('REQUEST')
  request,
  @JsonValue('REMINDER')
  reminder,
}

/// Note priority levels.
enum NotePriority {
  @JsonValue('LOW')
  low,
  @JsonValue('NORMAL')
  normal,
  @JsonValue('HIGH')
  high,
  @JsonValue('URGENT')
  urgent,
}

/// Progress report.
@freezed
class ProgressReport with _$ProgressReport {
  const factory ProgressReport({
    required String id,
    required String childId,
    required String childName,
    required ReportPeriod period,
    required DateTime generatedAt,
    required DateTime periodStart,
    required DateTime periodEnd,
    required OverallProgress overallProgress,
    required List<SubjectProgress> subjectProgress,
    required EngagementMetrics engagement,
    required List<String> achievements,
    required List<String> areasForGrowth,
    required List<GoalProgress> goalProgress,
    String? teacherComments,
    String? aiInsights,
    String? pdfUrl,
  }) = _ProgressReport;

  factory ProgressReport.fromJson(Map<String, dynamic> json) =>
      _$ProgressReportFromJson(json);
}

/// Report period type.
enum ReportPeriod {
  @JsonValue('WEEKLY')
  weekly,
  @JsonValue('BIWEEKLY')
  biweekly,
  @JsonValue('MONTHLY')
  monthly,
  @JsonValue('QUARTERLY')
  quarterly,
  @JsonValue('SEMESTER')
  semester,
}

/// Overall progress metrics.
@freezed
class OverallProgress with _$OverallProgress {
  const factory OverallProgress({
    required double overallScore,
    required double previousScore,
    required double improvementRate,
    required int lessonsCompleted,
    required int totalMinutesLearned,
    required int daysActive,
    required int currentStreak,
  }) = _OverallProgress;

  factory OverallProgress.fromJson(Map<String, dynamic> json) =>
      _$OverallProgressFromJson(json);
}

/// Progress in a specific subject.
@freezed
class SubjectProgress with _$SubjectProgress {
  const factory SubjectProgress({
    required String subject,
    required double score,
    required double previousScore,
    required double improvementRate,
    required int lessonsCompleted,
    required int minutesSpent,
    required String proficiencyLevel,
    required List<String> topicsCompleted,
    required List<String> topicsInProgress,
    String? teacherNote,
  }) = _SubjectProgress;

  factory SubjectProgress.fromJson(Map<String, dynamic> json) =>
      _$SubjectProgressFromJson(json);
}

/// Engagement metrics for reports.
@freezed
class EngagementMetrics with _$EngagementMetrics {
  const factory EngagementMetrics({
    required double averageEngagement,
    required double attentionScore,
    required int totalSessions,
    required int averageSessionLength,
    required double completionRate,
    required int hintsUsedPerLesson,
    required Map<String, int> activityByDay,
    required List<String> peakLearningTimes,
  }) = _EngagementMetrics;

  factory EngagementMetrics.fromJson(Map<String, dynamic> json) =>
      _$EngagementMetricsFromJson(json);
}

/// Goal progress tracking.
@freezed
class GoalProgress with _$GoalProgress {
  const factory GoalProgress({
    required String goalId,
    required String goalTitle,
    required String goalType,
    required double progress,
    required DateTime targetDate,
    required GoalStatus status,
    String? notes,
  }) = _GoalProgress;

  factory GoalProgress.fromJson(Map<String, dynamic> json) =>
      _$GoalProgressFromJson(json);
}

/// Goal status.
enum GoalStatus {
  @JsonValue('NOT_STARTED')
  notStarted,
  @JsonValue('IN_PROGRESS')
  inProgress,
  @JsonValue('ON_TRACK')
  onTrack,
  @JsonValue('AT_RISK')
  atRisk,
  @JsonValue('COMPLETED')
  completed,
  @JsonValue('EXCEEDED')
  exceeded,
}

/// Report generation request.
@freezed
class ReportRequest with _$ReportRequest {
  const factory ReportRequest({
    required String childId,
    required ReportPeriod period,
    DateTime? customStartDate,
    DateTime? customEndDate,
    @Default(true) bool includeTranscripts,
    @Default(true) bool includeTeacherNotes,
    @Default(true) bool includeGoalProgress,
    @Default(true) bool generatePdf,
  }) = _ReportRequest;

  factory ReportRequest.fromJson(Map<String, dynamic> json) =>
      _$ReportRequestFromJson(json);
}
