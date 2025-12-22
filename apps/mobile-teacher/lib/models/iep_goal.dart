/// IEP Goal Model
///
/// Represents IEP (Individualized Education Program) goals and progress tracking.
library;

import 'package:flutter/foundation.dart';

/// Goal status.
enum GoalStatus {
  notStarted,
  inProgress,
  onTrack,
  atRisk,
  achieved,
  discontinued,
}

/// Goal category.
enum GoalCategory {
  reading,
  math,
  writing,
  behavior,
  socialEmotional,
  speech,
  occupationalTherapy,
  physicalTherapy,
  other,
}

/// An IEP goal.
@immutable
class IepGoal {
  const IepGoal({
    required this.id,
    required this.studentId,
    required this.category,
    required this.description,
    required this.targetCriteria,
    required this.targetValue,
    required this.currentValue,
    required this.startDate,
    required this.targetDate,
    required this.status,
    this.baseline,
    this.measurementUnit,
    this.progressHistory = const [],
    this.accommodations = const [],
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String studentId;
  final GoalCategory category;
  final String description;
  final String targetCriteria;
  final double targetValue;
  final double currentValue;
  final DateTime startDate;
  final DateTime targetDate;
  final GoalStatus status;
  final double? baseline;
  final String? measurementUnit;
  final List<IepProgress> progressHistory;
  final List<String> accommodations;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  double get progressPercent {
    if (targetValue == 0) return 0;
    final baselineVal = baseline ?? 0;
    final range = targetValue - baselineVal;
    if (range == 0) return currentValue >= targetValue ? 1.0 : 0.0;
    return ((currentValue - baselineVal) / range).clamp(0.0, 1.0);
  }

  bool get isOnTrack {
    final now = DateTime.now();
    final totalDays = targetDate.difference(startDate).inDays;
    final elapsedDays = now.difference(startDate).inDays;
    if (totalDays == 0) return true;
    final expectedProgress = elapsedDays / totalDays;
    return progressPercent >= expectedProgress * 0.8;
  }

  int get daysRemaining {
    return targetDate.difference(DateTime.now()).inDays;
  }

  factory IepGoal.fromJson(Map<String, dynamic> json) {
    return IepGoal(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      category: GoalCategory.values.firstWhere(
        (e) => e.name == json['category'],
        orElse: () => GoalCategory.other,
      ),
      description: json['description'] as String,
      targetCriteria: json['targetCriteria'] as String,
      targetValue: (json['targetValue'] as num).toDouble(),
      currentValue: (json['currentValue'] as num).toDouble(),
      startDate: DateTime.parse(json['startDate'] as String),
      targetDate: DateTime.parse(json['targetDate'] as String),
      status: GoalStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => GoalStatus.notStarted,
      ),
      baseline: (json['baseline'] as num?)?.toDouble(),
      measurementUnit: json['measurementUnit'] as String?,
      progressHistory: (json['progressHistory'] as List<dynamic>?)
              ?.map((e) => IepProgress.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      accommodations: (json['accommodations'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'studentId': studentId,
      'category': category.name,
      'description': description,
      'targetCriteria': targetCriteria,
      'targetValue': targetValue,
      'currentValue': currentValue,
      'startDate': startDate.toIso8601String(),
      'targetDate': targetDate.toIso8601String(),
      'status': status.name,
      'baseline': baseline,
      'measurementUnit': measurementUnit,
      'progressHistory': progressHistory.map((e) => e.toJson()).toList(),
      'accommodations': accommodations,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  IepGoal copyWith({
    String? id,
    String? studentId,
    GoalCategory? category,
    String? description,
    String? targetCriteria,
    double? targetValue,
    double? currentValue,
    DateTime? startDate,
    DateTime? targetDate,
    GoalStatus? status,
    double? baseline,
    String? measurementUnit,
    List<IepProgress>? progressHistory,
    List<String>? accommodations,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return IepGoal(
      id: id ?? this.id,
      studentId: studentId ?? this.studentId,
      category: category ?? this.category,
      description: description ?? this.description,
      targetCriteria: targetCriteria ?? this.targetCriteria,
      targetValue: targetValue ?? this.targetValue,
      currentValue: currentValue ?? this.currentValue,
      startDate: startDate ?? this.startDate,
      targetDate: targetDate ?? this.targetDate,
      status: status ?? this.status,
      baseline: baseline ?? this.baseline,
      measurementUnit: measurementUnit ?? this.measurementUnit,
      progressHistory: progressHistory ?? this.progressHistory,
      accommodations: accommodations ?? this.accommodations,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is IepGoal && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// A progress entry for an IEP goal.
@immutable
class IepProgress {
  const IepProgress({
    required this.id,
    required this.goalId,
    required this.value,
    required this.recordedAt,
    this.notes,
    this.recordedBy,
    this.dataSource,
    this.sessionId,
  });

  final String id;
  final String goalId;
  final double value;
  final DateTime recordedAt;
  final String? notes;
  final String? recordedBy;
  final String? dataSource;
  final String? sessionId;

  factory IepProgress.fromJson(Map<String, dynamic> json) {
    return IepProgress(
      id: json['id'] as String,
      goalId: json['goalId'] as String,
      value: (json['value'] as num).toDouble(),
      recordedAt: DateTime.parse(json['recordedAt'] as String),
      notes: json['notes'] as String?,
      recordedBy: json['recordedBy'] as String?,
      dataSource: json['dataSource'] as String?,
      sessionId: json['sessionId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'goalId': goalId,
      'value': value,
      'recordedAt': recordedAt.toIso8601String(),
      'notes': notes,
      'recordedBy': recordedBy,
      'dataSource': dataSource,
      'sessionId': sessionId,
    };
  }
}

/// DTO for recording progress.
class RecordProgressDto {
  const RecordProgressDto({
    required this.goalId,
    required this.value,
    this.notes,
    this.sessionId,
  });

  final String goalId;
  final double value;
  final String? notes;
  final String? sessionId;

  Map<String, dynamic> toJson() {
    return {
      'goalId': goalId,
      'value': value,
      'notes': notes,
      'sessionId': sessionId,
    };
  }
}

/// IEP report summary.
@immutable
class IepReport {
  const IepReport({
    required this.studentId,
    required this.studentName,
    required this.reportingPeriod,
    required this.goals,
    required this.overallProgress,
    required this.generatedAt,
    this.summary,
    this.recommendations = const [],
  });

  final String studentId;
  final String studentName;
  final DateRange reportingPeriod;
  final List<IepGoalReport> goals;
  final double overallProgress;
  final DateTime generatedAt;
  final String? summary;
  final List<String> recommendations;

  factory IepReport.fromJson(Map<String, dynamic> json) {
    return IepReport(
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      reportingPeriod:
          DateRange.fromJson(json['reportingPeriod'] as Map<String, dynamic>),
      goals: (json['goals'] as List<dynamic>)
          .map((e) => IepGoalReport.fromJson(e as Map<String, dynamic>))
          .toList(),
      overallProgress: (json['overallProgress'] as num).toDouble(),
      generatedAt: DateTime.parse(json['generatedAt'] as String),
      summary: json['summary'] as String?,
      recommendations: (json['recommendations'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }
}

/// Report for a single IEP goal.
@immutable
class IepGoalReport {
  const IepGoalReport({
    required this.goal,
    required this.progressDataPoints,
    required this.progressPercent,
    required this.status,
    this.narrative,
  });

  final IepGoal goal;
  final List<IepProgress> progressDataPoints;
  final double progressPercent;
  final GoalStatus status;
  final String? narrative;

  factory IepGoalReport.fromJson(Map<String, dynamic> json) {
    return IepGoalReport(
      goal: IepGoal.fromJson(json['goal'] as Map<String, dynamic>),
      progressDataPoints: (json['progressDataPoints'] as List<dynamic>)
          .map((e) => IepProgress.fromJson(e as Map<String, dynamic>))
          .toList(),
      progressPercent: (json['progressPercent'] as num).toDouble(),
      status: GoalStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => GoalStatus.inProgress,
      ),
      narrative: json['narrative'] as String?,
    );
  }
}

/// Goal recommendation.
@immutable
class GoalRecommendation {
  const GoalRecommendation({
    required this.category,
    required this.description,
    required this.rationale,
    required this.suggestedTarget,
    required this.confidence,
  });

  final GoalCategory category;
  final String description;
  final String rationale;
  final double suggestedTarget;
  final double confidence;

  factory GoalRecommendation.fromJson(Map<String, dynamic> json) {
    return GoalRecommendation(
      category: GoalCategory.values.firstWhere(
        (e) => e.name == json['category'],
        orElse: () => GoalCategory.other,
      ),
      description: json['description'] as String,
      rationale: json['rationale'] as String,
      suggestedTarget: (json['suggestedTarget'] as num).toDouble(),
      confidence: (json['confidence'] as num).toDouble(),
    );
  }
}

/// Date range helper.
@immutable
class DateRange {
  const DateRange({required this.start, required this.end});

  final DateTime start;
  final DateTime end;

  factory DateRange.fromJson(Map<String, dynamic> json) {
    return DateRange(
      start: DateTime.parse(json['start'] as String),
      end: DateTime.parse(json['end'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'start': start.toIso8601String(),
      'end': end.toIso8601String(),
    };
  }
}
