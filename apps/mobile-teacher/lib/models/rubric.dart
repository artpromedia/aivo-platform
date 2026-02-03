/// Rubric models for grading
///
/// Models for rubric building and grading workflows.
library;

import 'package:flutter/foundation.dart';

/// Rubric types
enum RubricType {
  analytic('ANALYTIC'),
  holistic('HOLISTIC'),
  singlePoint('SINGLE_POINT'),
  checkList('CHECKLIST');

  const RubricType(this.value);
  final String value;

  static RubricType fromString(String value) {
    return RubricType.values.firstWhere(
      (t) => t.value == value.toUpperCase(),
      orElse: () => RubricType.analytic,
    );
  }

  String get label {
    switch (this) {
      case RubricType.analytic:
        return 'Analytic';
      case RubricType.holistic:
        return 'Holistic';
      case RubricType.singlePoint:
        return 'Single Point';
      case RubricType.checkList:
        return 'Checklist';
    }
  }
}

/// Rubric status
enum RubricStatus {
  draft('DRAFT'),
  active('ACTIVE'),
  archived('ARCHIVED');

  const RubricStatus(this.value);
  final String value;

  static RubricStatus fromString(String value) {
    return RubricStatus.values.firstWhere(
      (s) => s.value == value.toUpperCase(),
      orElse: () => RubricStatus.draft,
    );
  }
}

/// Grading status for submissions
enum GradingStatus {
  pending('PENDING'),
  inProgress('IN_PROGRESS'),
  graded('GRADED'),
  returned('RETURNED'),
  resubmitted('RESUBMITTED');

  const GradingStatus(this.value);
  final String value;

  static GradingStatus fromString(String value) {
    return GradingStatus.values.firstWhere(
      (s) => s.value == value.toUpperCase(),
      orElse: () => GradingStatus.pending,
    );
  }

  String get label {
    switch (this) {
      case GradingStatus.pending:
        return 'Pending';
      case GradingStatus.inProgress:
        return 'In Progress';
      case GradingStatus.graded:
        return 'Graded';
      case GradingStatus.returned:
        return 'Returned';
      case GradingStatus.resubmitted:
        return 'Resubmitted';
    }
  }
}

/// Priority level for grading queue
enum GradingPriority {
  low('LOW'),
  normal('NORMAL'),
  high('HIGH'),
  urgent('URGENT');

  const GradingPriority(this.value);
  final String value;

  static GradingPriority fromString(String value) {
    return GradingPriority.values.firstWhere(
      (p) => p.value == value.toUpperCase(),
      orElse: () => GradingPriority.normal,
    );
  }
}

/// A grading rubric
@immutable
class Rubric {
  const Rubric({
    required this.id,
    required this.name,
    required this.type,
    required this.status,
    required this.criteria,
    this.description,
    this.maxScore,
    this.createdAt,
    this.updatedAt,
    this.createdBy,
    this.sharedWith = const [],
    this.tags = const [],
    this.usageCount = 0,
  });

  final String id;
  final String name;
  final RubricType type;
  final RubricStatus status;
  final List<RubricCriterion> criteria;
  final String? description;
  final double? maxScore;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? createdBy;
  final List<String> sharedWith;
  final List<String> tags;
  final int usageCount;

  double get totalMaxScore {
    if (maxScore != null) return maxScore!;
    return criteria.fold(0.0, (sum, c) => sum + c.maxPoints);
  }

  factory Rubric.fromJson(Map<String, dynamic> json) {
    return Rubric(
      id: json['id'] as String,
      name: json['name'] as String,
      type: RubricType.fromString(json['type'] as String? ?? 'ANALYTIC'),
      status: RubricStatus.fromString(json['status'] as String? ?? 'DRAFT'),
      criteria: (json['criteria'] as List<dynamic>?)
              ?.map((e) => RubricCriterion.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      description: json['description'] as String?,
      maxScore: (json['maxScore'] as num?)?.toDouble(),
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
      createdBy: json['createdBy'] as String?,
      sharedWith: (json['sharedWith'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      tags:
          (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
              [],
      usageCount: json['usageCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type.value,
      'status': status.value,
      'criteria': criteria.map((c) => c.toJson()).toList(),
      if (description != null) 'description': description,
      if (maxScore != null) 'maxScore': maxScore,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
      if (createdBy != null) 'createdBy': createdBy,
      'sharedWith': sharedWith,
      'tags': tags,
      'usageCount': usageCount,
    };
  }

  Rubric copyWith({
    String? id,
    String? name,
    RubricType? type,
    RubricStatus? status,
    List<RubricCriterion>? criteria,
    String? description,
    double? maxScore,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? createdBy,
    List<String>? sharedWith,
    List<String>? tags,
    int? usageCount,
  }) {
    return Rubric(
      id: id ?? this.id,
      name: name ?? this.name,
      type: type ?? this.type,
      status: status ?? this.status,
      criteria: criteria ?? this.criteria,
      description: description ?? this.description,
      maxScore: maxScore ?? this.maxScore,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      createdBy: createdBy ?? this.createdBy,
      sharedWith: sharedWith ?? this.sharedWith,
      tags: tags ?? this.tags,
      usageCount: usageCount ?? this.usageCount,
    );
  }
}

/// A criterion within a rubric
@immutable
class RubricCriterion {
  const RubricCriterion({
    required this.id,
    required this.name,
    required this.maxPoints,
    required this.levels,
    this.description,
    this.weight = 1.0,
    this.order = 0,
  });

  final String id;
  final String name;
  final double maxPoints;
  final List<PerformanceLevel> levels;
  final String? description;
  final double weight;
  final int order;

  factory RubricCriterion.fromJson(Map<String, dynamic> json) {
    return RubricCriterion(
      id: json['id'] as String,
      name: json['name'] as String,
      maxPoints: (json['maxPoints'] as num).toDouble(),
      levels: (json['levels'] as List<dynamic>?)
              ?.map((e) => PerformanceLevel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      description: json['description'] as String?,
      weight: (json['weight'] as num?)?.toDouble() ?? 1.0,
      order: json['order'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'maxPoints': maxPoints,
      'levels': levels.map((l) => l.toJson()).toList(),
      if (description != null) 'description': description,
      'weight': weight,
      'order': order,
    };
  }

  RubricCriterion copyWith({
    String? id,
    String? name,
    double? maxPoints,
    List<PerformanceLevel>? levels,
    String? description,
    double? weight,
    int? order,
  }) {
    return RubricCriterion(
      id: id ?? this.id,
      name: name ?? this.name,
      maxPoints: maxPoints ?? this.maxPoints,
      levels: levels ?? this.levels,
      description: description ?? this.description,
      weight: weight ?? this.weight,
      order: order ?? this.order,
    );
  }
}

/// A performance level within a criterion
@immutable
class PerformanceLevel {
  const PerformanceLevel({
    required this.id,
    required this.label,
    required this.points,
    required this.description,
    this.order = 0,
  });

  final String id;
  final String label;
  final double points;
  final String description;
  final int order;

  factory PerformanceLevel.fromJson(Map<String, dynamic> json) {
    return PerformanceLevel(
      id: json['id'] as String,
      label: json['label'] as String,
      points: (json['points'] as num).toDouble(),
      description: json['description'] as String? ?? '',
      order: json['order'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      'points': points,
      'description': description,
      'order': order,
    };
  }

  PerformanceLevel copyWith({
    String? id,
    String? label,
    double? points,
    String? description,
    int? order,
  }) {
    return PerformanceLevel(
      id: id ?? this.id,
      label: label ?? this.label,
      points: points ?? this.points,
      description: description ?? this.description,
      order: order ?? this.order,
    );
  }
}

/// A submission in the grading queue
@immutable
class GradingQueueItem {
  const GradingQueueItem({
    required this.id,
    required this.submissionId,
    required this.studentId,
    required this.studentName,
    required this.assignmentId,
    required this.assignmentTitle,
    required this.status,
    required this.submittedAt,
    this.rubricId,
    this.rubricName,
    this.priority = GradingPriority.normal,
    this.dueDate,
    this.score,
    this.maxScore,
    this.gradedAt,
    this.gradedBy,
    this.aiSuggestedScore,
    this.aiConfidence,
    this.flags = const [],
    this.timeSpent,
  });

  final String id;
  final String submissionId;
  final String studentId;
  final String studentName;
  final String assignmentId;
  final String assignmentTitle;
  final GradingStatus status;
  final DateTime submittedAt;
  final String? rubricId;
  final String? rubricName;
  final GradingPriority priority;
  final DateTime? dueDate;
  final double? score;
  final double? maxScore;
  final DateTime? gradedAt;
  final String? gradedBy;
  final double? aiSuggestedScore;
  final double? aiConfidence;
  final List<String> flags;
  final Duration? timeSpent;

  bool get isOverdue =>
      dueDate != null && DateTime.now().isAfter(dueDate!) && status == GradingStatus.pending;

  bool get hasAISuggestion => aiSuggestedScore != null;

  double? get percentage {
    if (score == null || maxScore == null || maxScore == 0) return null;
    return (score! / maxScore!) * 100;
  }

  factory GradingQueueItem.fromJson(Map<String, dynamic> json) {
    return GradingQueueItem(
      id: json['id'] as String,
      submissionId: json['submissionId'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      assignmentId: json['assignmentId'] as String,
      assignmentTitle: json['assignmentTitle'] as String,
      status: GradingStatus.fromString(json['status'] as String? ?? 'PENDING'),
      submittedAt: DateTime.parse(json['submittedAt'] as String),
      rubricId: json['rubricId'] as String?,
      rubricName: json['rubricName'] as String?,
      priority:
          GradingPriority.fromString(json['priority'] as String? ?? 'NORMAL'),
      dueDate: json['dueDate'] != null
          ? DateTime.parse(json['dueDate'] as String)
          : null,
      score: (json['score'] as num?)?.toDouble(),
      maxScore: (json['maxScore'] as num?)?.toDouble(),
      gradedAt: json['gradedAt'] != null
          ? DateTime.parse(json['gradedAt'] as String)
          : null,
      gradedBy: json['gradedBy'] as String?,
      aiSuggestedScore: (json['aiSuggestedScore'] as num?)?.toDouble(),
      aiConfidence: (json['aiConfidence'] as num?)?.toDouble(),
      flags:
          (json['flags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
              [],
      timeSpent: json['timeSpent'] != null
          ? Duration(seconds: json['timeSpent'] as int)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'submissionId': submissionId,
      'studentId': studentId,
      'studentName': studentName,
      'assignmentId': assignmentId,
      'assignmentTitle': assignmentTitle,
      'status': status.value,
      'submittedAt': submittedAt.toIso8601String(),
      if (rubricId != null) 'rubricId': rubricId,
      if (rubricName != null) 'rubricName': rubricName,
      'priority': priority.value,
      if (dueDate != null) 'dueDate': dueDate!.toIso8601String(),
      if (score != null) 'score': score,
      if (maxScore != null) 'maxScore': maxScore,
      if (gradedAt != null) 'gradedAt': gradedAt!.toIso8601String(),
      if (gradedBy != null) 'gradedBy': gradedBy,
      if (aiSuggestedScore != null) 'aiSuggestedScore': aiSuggestedScore,
      if (aiConfidence != null) 'aiConfidence': aiConfidence,
      'flags': flags,
      if (timeSpent != null) 'timeSpent': timeSpent!.inSeconds,
    };
  }
}

/// Detailed submission for grading
@immutable
class GradingSubmission {
  const GradingSubmission({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.assignmentId,
    required this.assignmentTitle,
    required this.submittedAt,
    required this.content,
    this.rubric,
    this.criteriaScores = const {},
    this.feedback,
    this.comments = const [],
    this.attachments = const [],
    this.previousSubmissions = const [],
  });

  final String id;
  final String studentId;
  final String studentName;
  final String assignmentId;
  final String assignmentTitle;
  final DateTime submittedAt;
  final String content;
  final Rubric? rubric;
  final Map<String, CriterionScore> criteriaScores;
  final String? feedback;
  final List<GradingComment> comments;
  final List<SubmissionAttachment> attachments;
  final List<PreviousSubmission> previousSubmissions;

  double get totalScore {
    return criteriaScores.values.fold(0.0, (sum, cs) => sum + cs.score);
  }

  double? get maxScore => rubric?.totalMaxScore;

  factory GradingSubmission.fromJson(Map<String, dynamic> json) {
    return GradingSubmission(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      assignmentId: json['assignmentId'] as String,
      assignmentTitle: json['assignmentTitle'] as String,
      submittedAt: DateTime.parse(json['submittedAt'] as String),
      content: json['content'] as String,
      rubric: json['rubric'] != null
          ? Rubric.fromJson(json['rubric'] as Map<String, dynamic>)
          : null,
      criteriaScores: (json['criteriaScores'] as Map<String, dynamic>?)?.map(
            (k, v) =>
                MapEntry(k, CriterionScore.fromJson(v as Map<String, dynamic>)),
          ) ??
          {},
      feedback: json['feedback'] as String?,
      comments: (json['comments'] as List<dynamic>?)
              ?.map((e) => GradingComment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      attachments: (json['attachments'] as List<dynamic>?)
              ?.map((e) =>
                  SubmissionAttachment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      previousSubmissions: (json['previousSubmissions'] as List<dynamic>?)
              ?.map((e) =>
                  PreviousSubmission.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'studentId': studentId,
      'studentName': studentName,
      'assignmentId': assignmentId,
      'assignmentTitle': assignmentTitle,
      'submittedAt': submittedAt.toIso8601String(),
      'content': content,
      if (rubric != null) 'rubric': rubric!.toJson(),
      'criteriaScores':
          criteriaScores.map((k, v) => MapEntry(k, v.toJson())),
      if (feedback != null) 'feedback': feedback,
      'comments': comments.map((c) => c.toJson()).toList(),
      'attachments': attachments.map((a) => a.toJson()).toList(),
      'previousSubmissions':
          previousSubmissions.map((p) => p.toJson()).toList(),
    };
  }
}

/// Score for a single criterion
@immutable
class CriterionScore {
  const CriterionScore({
    required this.criterionId,
    required this.score,
    this.levelId,
    this.comment,
    this.aiSuggested,
    this.aiConfidence,
  });

  final String criterionId;
  final double score;
  final String? levelId;
  final String? comment;
  final double? aiSuggested;
  final double? aiConfidence;

  factory CriterionScore.fromJson(Map<String, dynamic> json) {
    return CriterionScore(
      criterionId: json['criterionId'] as String,
      score: (json['score'] as num).toDouble(),
      levelId: json['levelId'] as String?,
      comment: json['comment'] as String?,
      aiSuggested: (json['aiSuggested'] as num?)?.toDouble(),
      aiConfidence: (json['aiConfidence'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'criterionId': criterionId,
      'score': score,
      if (levelId != null) 'levelId': levelId,
      if (comment != null) 'comment': comment,
      if (aiSuggested != null) 'aiSuggested': aiSuggested,
      if (aiConfidence != null) 'aiConfidence': aiConfidence,
    };
  }

  CriterionScore copyWith({
    String? criterionId,
    double? score,
    String? levelId,
    String? comment,
    double? aiSuggested,
    double? aiConfidence,
  }) {
    return CriterionScore(
      criterionId: criterionId ?? this.criterionId,
      score: score ?? this.score,
      levelId: levelId ?? this.levelId,
      comment: comment ?? this.comment,
      aiSuggested: aiSuggested ?? this.aiSuggested,
      aiConfidence: aiConfidence ?? this.aiConfidence,
    );
  }
}

/// A comment on a grading
@immutable
class GradingComment {
  const GradingComment({
    required this.id,
    required this.text,
    required this.createdAt,
    this.authorId,
    this.authorName,
    this.position,
    this.isPrivate = false,
  });

  final String id;
  final String text;
  final DateTime createdAt;
  final String? authorId;
  final String? authorName;
  final int? position;
  final bool isPrivate;

  factory GradingComment.fromJson(Map<String, dynamic> json) {
    return GradingComment(
      id: json['id'] as String,
      text: json['text'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      authorId: json['authorId'] as String?,
      authorName: json['authorName'] as String?,
      position: json['position'] as int?,
      isPrivate: json['isPrivate'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'createdAt': createdAt.toIso8601String(),
      if (authorId != null) 'authorId': authorId,
      if (authorName != null) 'authorName': authorName,
      if (position != null) 'position': position,
      'isPrivate': isPrivate,
    };
  }
}

/// An attachment to a submission
@immutable
class SubmissionAttachment {
  const SubmissionAttachment({
    required this.id,
    required this.name,
    required this.url,
    this.type,
    this.size,
  });

  final String id;
  final String name;
  final String url;
  final String? type;
  final int? size;

  factory SubmissionAttachment.fromJson(Map<String, dynamic> json) {
    return SubmissionAttachment(
      id: json['id'] as String,
      name: json['name'] as String,
      url: json['url'] as String,
      type: json['type'] as String?,
      size: json['size'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'url': url,
      if (type != null) 'type': type,
      if (size != null) 'size': size,
    };
  }
}

/// Previous submission for comparison
@immutable
class PreviousSubmission {
  const PreviousSubmission({
    required this.id,
    required this.submittedAt,
    this.score,
    this.feedback,
  });

  final String id;
  final DateTime submittedAt;
  final double? score;
  final String? feedback;

  factory PreviousSubmission.fromJson(Map<String, dynamic> json) {
    return PreviousSubmission(
      id: json['id'] as String,
      submittedAt: DateTime.parse(json['submittedAt'] as String),
      score: (json['score'] as num?)?.toDouble(),
      feedback: json['feedback'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'submittedAt': submittedAt.toIso8601String(),
      if (score != null) 'score': score,
      if (feedback != null) 'feedback': feedback,
    };
  }
}

/// Grading queue statistics
@immutable
class GradingQueueStats {
  const GradingQueueStats({
    required this.totalPending,
    required this.overdueCount,
    required this.gradedToday,
    required this.averageTime,
    this.byAssignment = const {},
    this.byPriority = const {},
  });

  final int totalPending;
  final int overdueCount;
  final int gradedToday;
  final Duration averageTime;
  final Map<String, int> byAssignment;
  final Map<GradingPriority, int> byPriority;

  factory GradingQueueStats.fromJson(Map<String, dynamic> json) {
    return GradingQueueStats(
      totalPending: json['totalPending'] as int,
      overdueCount: json['overdueCount'] as int,
      gradedToday: json['gradedToday'] as int,
      averageTime: Duration(seconds: json['averageTime'] as int? ?? 0),
      byAssignment: (json['byAssignment'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, v as int),
          ) ??
          {},
      byPriority: (json['byPriority'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(GradingPriority.fromString(k), v as int),
          ) ??
          {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalPending': totalPending,
      'overdueCount': overdueCount,
      'gradedToday': gradedToday,
      'averageTime': averageTime.inSeconds,
      'byAssignment': byAssignment,
      'byPriority': byPriority.map((k, v) => MapEntry(k.value, v)),
    };
  }
}
