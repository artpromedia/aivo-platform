/// Intervention History Models
///
/// Models for tracking intervention history and outcomes.
library;

import 'package:freezed_annotation/freezed_annotation.dart';

part 'intervention_history.freezed.dart';
part 'intervention_history.g.dart';

/// Record of an intervention applied to a child.
@freezed
class InterventionRecord with _$InterventionRecord {
  const factory InterventionRecord({
    required String id,
    required String childId,
    required InterventionType type,
    required String title,
    required String description,
    required DateTime startDate,
    DateTime? endDate,
    required InterventionStatus status,
    required InterventionCategory category,
    InterventionOutcome? outcome,
    String? assignedBy,
    String? assignedByName,
    @Default([]) List<String> goals,
    @Default([]) List<InterventionProgress> progressHistory,
    Map<String, dynamic>? metadata,
  }) = _InterventionRecord;

  factory InterventionRecord.fromJson(Map<String, dynamic> json) =>
      _$InterventionRecordFromJson(json);
}

/// Type of intervention.
@JsonEnum()
enum InterventionType {
  aiAdaptive,
  teacherRecommended,
  systemGenerated,
  parentRequested,
}

/// Status of an intervention.
@JsonEnum()
enum InterventionStatus {
  active,
  completed,
  paused,
  discontinued,
  pending,
}

/// Category of intervention.
@JsonEnum()
enum InterventionCategory {
  academic,
  behavioral,
  social,
  accessibility,
  engagement,
  motivation,
}

/// Outcome of an intervention.
@freezed
class InterventionOutcome with _$InterventionOutcome {
  const factory InterventionOutcome({
    required SuccessLevel successLevel,
    required Map<String, double> metrics,
    String? notes,
    DateTime? evaluatedAt,
    String? evaluatedBy,
    @Default([]) List<String> improvements,
    @Default([]) List<String> challenges,
  }) = _InterventionOutcome;

  factory InterventionOutcome.fromJson(Map<String, dynamic> json) =>
      _$InterventionOutcomeFromJson(json);
}

/// Level of success for an intervention.
@JsonEnum()
enum SuccessLevel {
  notYetMeasured,
  minimal,
  partial,
  significant,
  full,
}

/// Progress entry for an intervention.
@freezed
class InterventionProgress with _$InterventionProgress {
  const factory InterventionProgress({
    required DateTime date,
    required double progressValue,
    String? notes,
    String? recordedBy,
  }) = _InterventionProgress;

  factory InterventionProgress.fromJson(Map<String, dynamic> json) =>
      _$InterventionProgressFromJson(json);
}

/// Summary of interventions for a child.
@freezed
class InterventionSummary with _$InterventionSummary {
  const factory InterventionSummary({
    required String childId,
    required int totalInterventions,
    required int activeCount,
    required int completedCount,
    required int successfulCount,
    required Map<InterventionCategory, int> byCategory,
    DateTime? lastUpdated,
  }) = _InterventionSummary;

  factory InterventionSummary.fromJson(Map<String, dynamic> json) =>
      _$InterventionSummaryFromJson(json);
}

/// Evidence or attachment for an intervention.
@freezed
class InterventionEvidence with _$InterventionEvidence {
  const factory InterventionEvidence({
    required String id,
    required String interventionId,
    required String title,
    required EvidenceType type,
    String? url,
    String? description,
    DateTime? uploadedAt,
  }) = _InterventionEvidence;

  factory InterventionEvidence.fromJson(Map<String, dynamic> json) =>
      _$InterventionEvidenceFromJson(json);
}

/// Type of evidence.
@JsonEnum()
enum EvidenceType {
  document,
  image,
  video,
  assessment,
  report,
  note,
}
