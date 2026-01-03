/// Assignment Model
///
/// Represents assignments and submissions for grading.
library;

import 'package:flutter/foundation.dart';

/// Assignment status.
enum AssignmentStatus {
  draft,
  published,
  closed,
  archived,
}

/// Assignment type.
enum AssignmentType {
  homework,
  quiz,
  test,
  project,
  classwork,
  practice,
  assessment,
}

/// Submission status.
enum SubmissionStatus {
  notSubmitted,
  submitted,
  late,
  graded,
  returned,
  missing,
  excused,
}

/// An assignment for a class.
@immutable
class Assignment {
  const Assignment({
    required this.id,
    required this.classId,
    required this.title,
    required this.status,
    required this.assignmentType,
    this.description,
    this.instructions,
    this.categoryId,
    this.categoryName,
    this.pointsPossible = 100,
    this.weight = 1.0,
    this.dueAt,
    this.availableAt,
    this.lockAt,
    this.submissionCount = 0,
    this.gradedCount = 0,
    this.studentCount = 0,
    this.allowLateSubmissions = true,
    this.latePenaltyPercent,
    this.rubricId,
    this.googleClassroomId,
    this.canvasId,
    this.createdAt,
    this.updatedAt,
    this.publishedAt,
  });

  final String id;
  final String classId;
  final String title;
  final String? description;
  final String? instructions;
  final AssignmentStatus status;
  final AssignmentType assignmentType;
  final String? categoryId;
  final String? categoryName;
  final double pointsPossible;
  final double weight;
  final DateTime? dueAt;
  final DateTime? availableAt;
  final DateTime? lockAt;
  final int submissionCount;
  final int gradedCount;
  final int studentCount;
  final bool allowLateSubmissions;
  final double? latePenaltyPercent;
  final String? rubricId;
  final String? googleClassroomId;
  final String? canvasId;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? publishedAt;

  bool get isPublished => status == AssignmentStatus.published;
  bool get isDraft => status == AssignmentStatus.draft;
  bool get isClosed => status == AssignmentStatus.closed;

  bool get isPastDue {
    if (dueAt == null) return false;
    return DateTime.now().isAfter(dueAt!);
  }

  bool get isAvailable {
    if (availableAt == null) return true;
    return DateTime.now().isAfter(availableAt!);
  }

  bool get isLocked {
    if (lockAt == null) return false;
    return DateTime.now().isAfter(lockAt!);
  }

  int get ungradedCount => submissionCount - gradedCount;

  double get completionRate {
    if (studentCount == 0) return 0;
    return submissionCount / studentCount;
  }

  factory Assignment.fromJson(Map<String, dynamic> json) {
    return Assignment(
      id: json['id'] as String,
      classId: json['classId'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      instructions: json['instructions'] as String?,
      status: AssignmentStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => AssignmentStatus.draft,
      ),
      assignmentType: AssignmentType.values.firstWhere(
        (e) => e.name == json['assignmentType'],
        orElse: () => AssignmentType.homework,
      ),
      categoryId: json['categoryId'] as String?,
      categoryName: json['categoryName'] as String?,
      pointsPossible: (json['pointsPossible'] as num?)?.toDouble() ?? 100,
      weight: (json['weight'] as num?)?.toDouble() ?? 1.0,
      dueAt: json['dueAt'] != null
          ? DateTime.tryParse(json['dueAt'] as String)
          : null,
      availableAt: json['availableAt'] != null
          ? DateTime.tryParse(json['availableAt'] as String)
          : null,
      lockAt: json['lockAt'] != null
          ? DateTime.tryParse(json['lockAt'] as String)
          : null,
      submissionCount: json['submissionCount'] as int? ?? 0,
      gradedCount: json['gradedCount'] as int? ?? 0,
      studentCount: json['studentCount'] as int? ?? 0,
      allowLateSubmissions: json['allowLateSubmissions'] as bool? ?? true,
      latePenaltyPercent: (json['latePenaltyPercent'] as num?)?.toDouble(),
      rubricId: json['rubricId'] as String?,
      googleClassroomId: json['googleClassroomId'] as String?,
      canvasId: json['canvasId'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
      publishedAt: json['publishedAt'] != null
          ? DateTime.tryParse(json['publishedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'classId': classId,
      'title': title,
      'description': description,
      'instructions': instructions,
      'status': status.name,
      'assignmentType': assignmentType.name,
      'categoryId': categoryId,
      'categoryName': categoryName,
      'pointsPossible': pointsPossible,
      'weight': weight,
      'dueAt': dueAt?.toIso8601String(),
      'availableAt': availableAt?.toIso8601String(),
      'lockAt': lockAt?.toIso8601String(),
      'submissionCount': submissionCount,
      'gradedCount': gradedCount,
      'studentCount': studentCount,
      'allowLateSubmissions': allowLateSubmissions,
      'latePenaltyPercent': latePenaltyPercent,
      'rubricId': rubricId,
      'googleClassroomId': googleClassroomId,
      'canvasId': canvasId,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'publishedAt': publishedAt?.toIso8601String(),
    };
  }

  Assignment copyWith({
    String? id,
    String? classId,
    String? title,
    String? description,
    String? instructions,
    AssignmentStatus? status,
    AssignmentType? assignmentType,
    String? categoryId,
    String? categoryName,
    double? pointsPossible,
    double? weight,
    DateTime? dueAt,
    DateTime? availableAt,
    DateTime? lockAt,
    int? submissionCount,
    int? gradedCount,
    int? studentCount,
    bool? allowLateSubmissions,
    double? latePenaltyPercent,
    String? rubricId,
    String? googleClassroomId,
    String? canvasId,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? publishedAt,
  }) {
    return Assignment(
      id: id ?? this.id,
      classId: classId ?? this.classId,
      title: title ?? this.title,
      description: description ?? this.description,
      instructions: instructions ?? this.instructions,
      status: status ?? this.status,
      assignmentType: assignmentType ?? this.assignmentType,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      pointsPossible: pointsPossible ?? this.pointsPossible,
      weight: weight ?? this.weight,
      dueAt: dueAt ?? this.dueAt,
      availableAt: availableAt ?? this.availableAt,
      lockAt: lockAt ?? this.lockAt,
      submissionCount: submissionCount ?? this.submissionCount,
      gradedCount: gradedCount ?? this.gradedCount,
      studentCount: studentCount ?? this.studentCount,
      allowLateSubmissions: allowLateSubmissions ?? this.allowLateSubmissions,
      latePenaltyPercent: latePenaltyPercent ?? this.latePenaltyPercent,
      rubricId: rubricId ?? this.rubricId,
      googleClassroomId: googleClassroomId ?? this.googleClassroomId,
      canvasId: canvasId ?? this.canvasId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      publishedAt: publishedAt ?? this.publishedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Assignment && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// A submission for an assignment.
@immutable
class Submission {
  const Submission({
    required this.id,
    required this.assignmentId,
    required this.studentId,
    required this.status,
    this.studentName,
    this.submittedAt,
    this.gradedAt,
    this.grade,
    this.pointsEarned,
    this.feedback,
    this.isLate = false,
    this.latePenalty,
    this.isExcused = false,
    this.attachments = const [],
    this.rubricScores = const {},
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String assignmentId;
  final String studentId;
  final String? studentName;
  final SubmissionStatus status;
  final DateTime? submittedAt;
  final DateTime? gradedAt;
  final String? grade; // Letter grade if applicable
  final double? pointsEarned;
  final String? feedback;
  final bool isLate;
  final double? latePenalty;
  final bool isExcused;
  final List<SubmissionAttachment> attachments;
  final Map<String, double> rubricScores; // criterionId -> score
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isGraded => status == SubmissionStatus.graded;
  bool get isSubmitted => status != SubmissionStatus.notSubmitted &&
                          status != SubmissionStatus.missing;

  double? get finalPoints {
    if (isExcused) return null;
    if (pointsEarned == null) return null;
    if (latePenalty == null) return pointsEarned;
    return pointsEarned! - latePenalty!;
  }

  factory Submission.fromJson(Map<String, dynamic> json) {
    return Submission(
      id: json['id'] as String,
      assignmentId: json['assignmentId'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String?,
      status: SubmissionStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => SubmissionStatus.notSubmitted,
      ),
      submittedAt: json['submittedAt'] != null
          ? DateTime.tryParse(json['submittedAt'] as String)
          : null,
      gradedAt: json['gradedAt'] != null
          ? DateTime.tryParse(json['gradedAt'] as String)
          : null,
      grade: json['grade'] as String?,
      pointsEarned: (json['pointsEarned'] as num?)?.toDouble(),
      feedback: json['feedback'] as String?,
      isLate: json['isLate'] as bool? ?? false,
      latePenalty: (json['latePenalty'] as num?)?.toDouble(),
      isExcused: json['isExcused'] as bool? ?? false,
      attachments: (json['attachments'] as List<dynamic>?)
              ?.map((e) => SubmissionAttachment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      rubricScores: (json['rubricScores'] as Map<String, dynamic>?)
              ?.map((k, v) => MapEntry(k, (v as num).toDouble())) ??
          {},
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
      'assignmentId': assignmentId,
      'studentId': studentId,
      'studentName': studentName,
      'status': status.name,
      'submittedAt': submittedAt?.toIso8601String(),
      'gradedAt': gradedAt?.toIso8601String(),
      'grade': grade,
      'pointsEarned': pointsEarned,
      'feedback': feedback,
      'isLate': isLate,
      'latePenalty': latePenalty,
      'isExcused': isExcused,
      'attachments': attachments.map((e) => e.toJson()).toList(),
      'rubricScores': rubricScores,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  Submission copyWith({
    String? id,
    String? assignmentId,
    String? studentId,
    String? studentName,
    SubmissionStatus? status,
    DateTime? submittedAt,
    DateTime? gradedAt,
    String? grade,
    double? pointsEarned,
    String? feedback,
    bool? isLate,
    double? latePenalty,
    bool? isExcused,
    List<SubmissionAttachment>? attachments,
    Map<String, double>? rubricScores,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Submission(
      id: id ?? this.id,
      assignmentId: assignmentId ?? this.assignmentId,
      studentId: studentId ?? this.studentId,
      studentName: studentName ?? this.studentName,
      status: status ?? this.status,
      submittedAt: submittedAt ?? this.submittedAt,
      gradedAt: gradedAt ?? this.gradedAt,
      grade: grade ?? this.grade,
      pointsEarned: pointsEarned ?? this.pointsEarned,
      feedback: feedback ?? this.feedback,
      isLate: isLate ?? this.isLate,
      latePenalty: latePenalty ?? this.latePenalty,
      isExcused: isExcused ?? this.isExcused,
      attachments: attachments ?? this.attachments,
      rubricScores: rubricScores ?? this.rubricScores,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Submission && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Attachment for a submission.
@immutable
class SubmissionAttachment {
  const SubmissionAttachment({
    required this.id,
    required this.name,
    required this.url,
    this.type,
    this.sizeBytes,
  });

  final String id;
  final String name;
  final String url;
  final String? type;
  final int? sizeBytes;

  factory SubmissionAttachment.fromJson(Map<String, dynamic> json) {
    return SubmissionAttachment(
      id: json['id'] as String,
      name: json['name'] as String,
      url: json['url'] as String,
      type: json['type'] as String?,
      sizeBytes: json['sizeBytes'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'url': url,
      'type': type,
      'sizeBytes': sizeBytes,
    };
  }
}

/// Assignment category (for grade weighting).
@immutable
class AssignmentCategory {
  const AssignmentCategory({
    required this.id,
    required this.classId,
    required this.name,
    this.weight = 1.0,
    this.dropLowest = 0,
    this.color,
  });

  final String id;
  final String classId;
  final String name;
  final double weight;
  final int dropLowest;
  final String? color;

  factory AssignmentCategory.fromJson(Map<String, dynamic> json) {
    return AssignmentCategory(
      id: json['id'] as String,
      classId: json['classId'] as String,
      name: json['name'] as String,
      weight: (json['weight'] as num?)?.toDouble() ?? 1.0,
      dropLowest: json['dropLowest'] as int? ?? 0,
      color: json['color'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'classId': classId,
      'name': name,
      'weight': weight,
      'dropLowest': dropLowest,
      'color': color,
    };
  }
}

/// DTO for creating an assignment.
class CreateAssignmentDto {
  const CreateAssignmentDto({
    required this.classId,
    required this.title,
    required this.assignmentType,
    this.description,
    this.instructions,
    this.categoryId,
    this.pointsPossible = 100,
    this.weight = 1.0,
    this.dueAt,
    this.availableAt,
    this.lockAt,
    this.allowLateSubmissions = true,
    this.latePenaltyPercent,
    this.publishImmediately = false,
  });

  final String classId;
  final String title;
  final AssignmentType assignmentType;
  final String? description;
  final String? instructions;
  final String? categoryId;
  final double pointsPossible;
  final double weight;
  final DateTime? dueAt;
  final DateTime? availableAt;
  final DateTime? lockAt;
  final bool allowLateSubmissions;
  final double? latePenaltyPercent;
  final bool publishImmediately;

  Map<String, dynamic> toJson() {
    return {
      'classId': classId,
      'title': title,
      'assignmentType': assignmentType.name,
      'description': description,
      'instructions': instructions,
      'categoryId': categoryId,
      'pointsPossible': pointsPossible,
      'weight': weight,
      'dueAt': dueAt?.toIso8601String(),
      'availableAt': availableAt?.toIso8601String(),
      'lockAt': lockAt?.toIso8601String(),
      'allowLateSubmissions': allowLateSubmissions,
      'latePenaltyPercent': latePenaltyPercent,
      'publishImmediately': publishImmediately,
    };
  }
}

/// DTO for updating an assignment.
class UpdateAssignmentDto {
  const UpdateAssignmentDto({
    this.title,
    this.description,
    this.instructions,
    this.categoryId,
    this.pointsPossible,
    this.weight,
    this.dueAt,
    this.availableAt,
    this.lockAt,
    this.allowLateSubmissions,
    this.latePenaltyPercent,
  });

  final String? title;
  final String? description;
  final String? instructions;
  final String? categoryId;
  final double? pointsPossible;
  final double? weight;
  final DateTime? dueAt;
  final DateTime? availableAt;
  final DateTime? lockAt;
  final bool? allowLateSubmissions;
  final double? latePenaltyPercent;

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
    if (title != null) json['title'] = title;
    if (description != null) json['description'] = description;
    if (instructions != null) json['instructions'] = instructions;
    if (categoryId != null) json['categoryId'] = categoryId;
    if (pointsPossible != null) json['pointsPossible'] = pointsPossible;
    if (weight != null) json['weight'] = weight;
    if (dueAt != null) json['dueAt'] = dueAt!.toIso8601String();
    if (availableAt != null) json['availableAt'] = availableAt!.toIso8601String();
    if (lockAt != null) json['lockAt'] = lockAt!.toIso8601String();
    if (allowLateSubmissions != null) json['allowLateSubmissions'] = allowLateSubmissions;
    if (latePenaltyPercent != null) json['latePenaltyPercent'] = latePenaltyPercent;
    return json;
  }
}

/// DTO for grading a submission.
class GradeSubmissionDto {
  const GradeSubmissionDto({
    this.pointsEarned,
    this.grade,
    this.feedback,
    this.rubricScores,
    this.isExcused = false,
    this.applyLatePenalty = true,
  });

  final double? pointsEarned;
  final String? grade;
  final String? feedback;
  final Map<String, double>? rubricScores;
  final bool isExcused;
  final bool applyLatePenalty;

  Map<String, dynamic> toJson() {
    return {
      'pointsEarned': pointsEarned,
      'grade': grade,
      'feedback': feedback,
      'rubricScores': rubricScores,
      'isExcused': isExcused,
      'applyLatePenalty': applyLatePenalty,
    };
  }
}
