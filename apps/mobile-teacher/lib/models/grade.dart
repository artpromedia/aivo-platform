/// Grade Model
///
/// Represents grades, grade scales, and gradebook data.
library;

import 'package:flutter/foundation.dart';

/// Grade scale entry.
@immutable
class GradeScaleEntry {
  const GradeScaleEntry({
    required this.letter,
    required this.minPercent,
    this.maxPercent = 100,
    this.gpaValue,
  });

  final String letter;
  final double minPercent;
  final double maxPercent;
  final double? gpaValue;

  factory GradeScaleEntry.fromJson(Map<String, dynamic> json) {
    return GradeScaleEntry(
      letter: json['letter'] as String,
      minPercent: (json['minPercent'] as num).toDouble(),
      maxPercent: (json['maxPercent'] as num?)?.toDouble() ?? 100,
      gpaValue: (json['gpaValue'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'letter': letter,
      'minPercent': minPercent,
      'maxPercent': maxPercent,
      'gpaValue': gpaValue,
    };
  }
}

/// Grade scale configuration.
@immutable
class GradeScale {
  const GradeScale({
    required this.id,
    required this.name,
    required this.entries,
    this.isDefault = false,
  });

  final String id;
  final String name;
  final List<GradeScaleEntry> entries;
  final bool isDefault;

  /// Standard A-F grade scale.
  static const standard = GradeScale(
    id: 'standard',
    name: 'Standard (A-F)',
    isDefault: true,
    entries: [
      GradeScaleEntry(letter: 'A+', minPercent: 97, maxPercent: 100, gpaValue: 4.0),
      GradeScaleEntry(letter: 'A', minPercent: 93, maxPercent: 96.99, gpaValue: 4.0),
      GradeScaleEntry(letter: 'A-', minPercent: 90, maxPercent: 92.99, gpaValue: 3.7),
      GradeScaleEntry(letter: 'B+', minPercent: 87, maxPercent: 89.99, gpaValue: 3.3),
      GradeScaleEntry(letter: 'B', minPercent: 83, maxPercent: 86.99, gpaValue: 3.0),
      GradeScaleEntry(letter: 'B-', minPercent: 80, maxPercent: 82.99, gpaValue: 2.7),
      GradeScaleEntry(letter: 'C+', minPercent: 77, maxPercent: 79.99, gpaValue: 2.3),
      GradeScaleEntry(letter: 'C', minPercent: 73, maxPercent: 76.99, gpaValue: 2.0),
      GradeScaleEntry(letter: 'C-', minPercent: 70, maxPercent: 72.99, gpaValue: 1.7),
      GradeScaleEntry(letter: 'D+', minPercent: 67, maxPercent: 69.99, gpaValue: 1.3),
      GradeScaleEntry(letter: 'D', minPercent: 63, maxPercent: 66.99, gpaValue: 1.0),
      GradeScaleEntry(letter: 'D-', minPercent: 60, maxPercent: 62.99, gpaValue: 0.7),
      GradeScaleEntry(letter: 'F', minPercent: 0, maxPercent: 59.99, gpaValue: 0.0),
    ],
  );

  /// Get letter grade for a percentage.
  String getLetterGrade(double percent) {
    for (final entry in entries) {
      if (percent >= entry.minPercent && percent <= entry.maxPercent) {
        return entry.letter;
      }
    }
    // Return lowest grade if below all thresholds
    return entries.isNotEmpty ? entries.last.letter : 'F';
  }

  /// Get GPA value for a percentage.
  double? getGpaValue(double percent) {
    for (final entry in entries) {
      if (percent >= entry.minPercent && percent <= entry.maxPercent) {
        return entry.gpaValue;
      }
    }
    return entries.isNotEmpty ? entries.last.gpaValue : 0.0;
  }

  factory GradeScale.fromJson(Map<String, dynamic> json) {
    return GradeScale(
      id: json['id'] as String,
      name: json['name'] as String,
      entries: (json['entries'] as List<dynamic>)
          .map((e) => GradeScaleEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'entries': entries.map((e) => e.toJson()).toList(),
      'isDefault': isDefault,
    };
  }
}

/// A grade entry in the gradebook.
@immutable
class GradeEntry {
  const GradeEntry({
    required this.id,
    required this.studentId,
    required this.assignmentId,
    this.studentName,
    this.assignmentTitle,
    this.pointsEarned,
    this.pointsPossible,
    this.letterGrade,
    this.percent,
    this.isExcused = false,
    this.isMissing = false,
    this.isLate = false,
    this.latePenalty,
    this.feedback,
    this.gradedAt,
    this.gradedBy,
    this.syncStatus,
  });

  final String id;
  final String studentId;
  final String assignmentId;
  final String? studentName;
  final String? assignmentTitle;
  final double? pointsEarned;
  final double? pointsPossible;
  final String? letterGrade;
  final double? percent;
  final bool isExcused;
  final bool isMissing;
  final bool isLate;
  final double? latePenalty;
  final String? feedback;
  final DateTime? gradedAt;
  final String? gradedBy;
  final String? syncStatus; // 'pending', 'synced', 'error'

  bool get hasGrade => pointsEarned != null || isExcused;

  factory GradeEntry.fromJson(Map<String, dynamic> json) {
    return GradeEntry(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      assignmentId: json['assignmentId'] as String,
      studentName: json['studentName'] as String?,
      assignmentTitle: json['assignmentTitle'] as String?,
      pointsEarned: (json['pointsEarned'] as num?)?.toDouble(),
      pointsPossible: (json['pointsPossible'] as num?)?.toDouble(),
      letterGrade: json['letterGrade'] as String?,
      percent: (json['percent'] as num?)?.toDouble(),
      isExcused: json['isExcused'] as bool? ?? false,
      isMissing: json['isMissing'] as bool? ?? false,
      isLate: json['isLate'] as bool? ?? false,
      latePenalty: (json['latePenalty'] as num?)?.toDouble(),
      feedback: json['feedback'] as String?,
      gradedAt: json['gradedAt'] != null
          ? DateTime.tryParse(json['gradedAt'] as String)
          : null,
      gradedBy: json['gradedBy'] as String?,
      syncStatus: json['syncStatus'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'studentId': studentId,
      'assignmentId': assignmentId,
      'studentName': studentName,
      'assignmentTitle': assignmentTitle,
      'pointsEarned': pointsEarned,
      'pointsPossible': pointsPossible,
      'letterGrade': letterGrade,
      'percent': percent,
      'isExcused': isExcused,
      'isMissing': isMissing,
      'isLate': isLate,
      'latePenalty': latePenalty,
      'feedback': feedback,
      'gradedAt': gradedAt?.toIso8601String(),
      'gradedBy': gradedBy,
      'syncStatus': syncStatus,
    };
  }

  GradeEntry copyWith({
    String? id,
    String? studentId,
    String? assignmentId,
    String? studentName,
    String? assignmentTitle,
    double? pointsEarned,
    double? pointsPossible,
    String? letterGrade,
    double? percent,
    bool? isExcused,
    bool? isMissing,
    bool? isLate,
    double? latePenalty,
    String? feedback,
    DateTime? gradedAt,
    String? gradedBy,
    String? syncStatus,
  }) {
    return GradeEntry(
      id: id ?? this.id,
      studentId: studentId ?? this.studentId,
      assignmentId: assignmentId ?? this.assignmentId,
      studentName: studentName ?? this.studentName,
      assignmentTitle: assignmentTitle ?? this.assignmentTitle,
      pointsEarned: pointsEarned ?? this.pointsEarned,
      pointsPossible: pointsPossible ?? this.pointsPossible,
      letterGrade: letterGrade ?? this.letterGrade,
      percent: percent ?? this.percent,
      isExcused: isExcused ?? this.isExcused,
      isMissing: isMissing ?? this.isMissing,
      isLate: isLate ?? this.isLate,
      latePenalty: latePenalty ?? this.latePenalty,
      feedback: feedback ?? this.feedback,
      gradedAt: gradedAt ?? this.gradedAt,
      gradedBy: gradedBy ?? this.gradedBy,
      syncStatus: syncStatus ?? this.syncStatus,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GradeEntry && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Student's overall grade in a class.
@immutable
class StudentGrade {
  const StudentGrade({
    required this.studentId,
    required this.classId,
    this.studentName,
    this.totalPoints,
    this.possiblePoints,
    this.percent,
    this.letterGrade,
    this.gpa,
    this.assignmentsGraded = 0,
    this.assignmentsTotal = 0,
    this.categoryGrades = const {},
    this.trend,
    this.lastUpdated,
  });

  final String studentId;
  final String classId;
  final String? studentName;
  final double? totalPoints;
  final double? possiblePoints;
  final double? percent;
  final String? letterGrade;
  final double? gpa;
  final int assignmentsGraded;
  final int assignmentsTotal;
  final Map<String, CategoryGrade> categoryGrades; // categoryId -> CategoryGrade
  final GradeTrend? trend;
  final DateTime? lastUpdated;

  int get assignmentsMissing => assignmentsTotal - assignmentsGraded;

  factory StudentGrade.fromJson(Map<String, dynamic> json) {
    return StudentGrade(
      studentId: json['studentId'] as String,
      classId: json['classId'] as String,
      studentName: json['studentName'] as String?,
      totalPoints: (json['totalPoints'] as num?)?.toDouble(),
      possiblePoints: (json['possiblePoints'] as num?)?.toDouble(),
      percent: (json['percent'] as num?)?.toDouble(),
      letterGrade: json['letterGrade'] as String?,
      gpa: (json['gpa'] as num?)?.toDouble(),
      assignmentsGraded: json['assignmentsGraded'] as int? ?? 0,
      assignmentsTotal: json['assignmentsTotal'] as int? ?? 0,
      categoryGrades: (json['categoryGrades'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, CategoryGrade.fromJson(v as Map<String, dynamic>)),
          ) ??
          {},
      trend: json['trend'] != null
          ? GradeTrend.fromJson(json['trend'] as Map<String, dynamic>)
          : null,
      lastUpdated: json['lastUpdated'] != null
          ? DateTime.tryParse(json['lastUpdated'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'classId': classId,
      'studentName': studentName,
      'totalPoints': totalPoints,
      'possiblePoints': possiblePoints,
      'percent': percent,
      'letterGrade': letterGrade,
      'gpa': gpa,
      'assignmentsGraded': assignmentsGraded,
      'assignmentsTotal': assignmentsTotal,
      'categoryGrades': categoryGrades.map((k, v) => MapEntry(k, v.toJson())),
      'trend': trend?.toJson(),
      'lastUpdated': lastUpdated?.toIso8601String(),
    };
  }
}

/// Grade for a specific category.
@immutable
class CategoryGrade {
  const CategoryGrade({
    required this.categoryId,
    required this.categoryName,
    this.totalPoints,
    this.possiblePoints,
    this.percent,
    this.weight,
    this.weightedPercent,
    this.assignmentsGraded = 0,
    this.assignmentsTotal = 0,
  });

  final String categoryId;
  final String categoryName;
  final double? totalPoints;
  final double? possiblePoints;
  final double? percent;
  final double? weight;
  final double? weightedPercent;
  final int assignmentsGraded;
  final int assignmentsTotal;

  factory CategoryGrade.fromJson(Map<String, dynamic> json) {
    return CategoryGrade(
      categoryId: json['categoryId'] as String,
      categoryName: json['categoryName'] as String,
      totalPoints: (json['totalPoints'] as num?)?.toDouble(),
      possiblePoints: (json['possiblePoints'] as num?)?.toDouble(),
      percent: (json['percent'] as num?)?.toDouble(),
      weight: (json['weight'] as num?)?.toDouble(),
      weightedPercent: (json['weightedPercent'] as num?)?.toDouble(),
      assignmentsGraded: json['assignmentsGraded'] as int? ?? 0,
      assignmentsTotal: json['assignmentsTotal'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'categoryId': categoryId,
      'categoryName': categoryName,
      'totalPoints': totalPoints,
      'possiblePoints': possiblePoints,
      'percent': percent,
      'weight': weight,
      'weightedPercent': weightedPercent,
      'assignmentsGraded': assignmentsGraded,
      'assignmentsTotal': assignmentsTotal,
    };
  }
}

/// Grade trend information.
@immutable
class GradeTrend {
  const GradeTrend({
    required this.direction,
    this.changePercent,
    this.previousPercent,
    this.period,
  });

  final String direction; // 'up', 'down', 'stable'
  final double? changePercent;
  final double? previousPercent;
  final String? period; // 'week', 'month', 'quarter'

  bool get isImproving => direction == 'up';
  bool get isDeclining => direction == 'down';
  bool get isStable => direction == 'stable';

  factory GradeTrend.fromJson(Map<String, dynamic> json) {
    return GradeTrend(
      direction: json['direction'] as String,
      changePercent: (json['changePercent'] as num?)?.toDouble(),
      previousPercent: (json['previousPercent'] as num?)?.toDouble(),
      period: json['period'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'direction': direction,
      'changePercent': changePercent,
      'previousPercent': previousPercent,
      'period': period,
    };
  }
}

/// Gradebook data for a class.
@immutable
class Gradebook {
  const Gradebook({
    required this.classId,
    required this.className,
    required this.gradeScale,
    required this.students,
    required this.assignments,
    required this.grades,
    required this.categories,
    this.gradingPeriodId,
    this.gradingPeriodName,
    this.updatedAt,
  });

  final String classId;
  final String className;
  final GradeScale gradeScale;
  final List<GradebookStudent> students;
  final List<GradebookAssignment> assignments;
  final Map<String, Map<String, GradeEntry>> grades; // studentId -> assignmentId -> grade
  final List<GradebookCategory> categories;
  final String? gradingPeriodId;
  final String? gradingPeriodName;
  final DateTime? updatedAt;

  /// Get a grade entry for a student and assignment.
  GradeEntry? getGrade(String studentId, String assignmentId) {
    return grades[studentId]?[assignmentId];
  }

  factory Gradebook.fromJson(Map<String, dynamic> json) {
    final gradesMap = <String, Map<String, GradeEntry>>{};
    final gradesJson = json['grades'] as Map<String, dynamic>? ?? {};
    for (final studentEntry in gradesJson.entries) {
      final studentGrades = <String, GradeEntry>{};
      final studentGradesJson = studentEntry.value as Map<String, dynamic>? ?? {};
      for (final assignmentEntry in studentGradesJson.entries) {
        studentGrades[assignmentEntry.key] = GradeEntry.fromJson(
          assignmentEntry.value as Map<String, dynamic>,
        );
      }
      gradesMap[studentEntry.key] = studentGrades;
    }

    return Gradebook(
      classId: json['classId'] as String,
      className: json['className'] as String,
      gradeScale: json['gradeScale'] != null
          ? GradeScale.fromJson(json['gradeScale'] as Map<String, dynamic>)
          : GradeScale.standard,
      students: (json['students'] as List<dynamic>?)
              ?.map((e) => GradebookStudent.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      assignments: (json['assignments'] as List<dynamic>?)
              ?.map((e) => GradebookAssignment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      grades: gradesMap,
      categories: (json['categories'] as List<dynamic>?)
              ?.map((e) => GradebookCategory.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      gradingPeriodId: json['gradingPeriodId'] as String?,
      gradingPeriodName: json['gradingPeriodName'] as String?,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    final gradesJson = <String, Map<String, dynamic>>{};
    for (final studentEntry in grades.entries) {
      final studentGradesJson = <String, dynamic>{};
      for (final assignmentEntry in studentEntry.value.entries) {
        studentGradesJson[assignmentEntry.key] = assignmentEntry.value.toJson();
      }
      gradesJson[studentEntry.key] = studentGradesJson;
    }

    return {
      'classId': classId,
      'className': className,
      'gradeScale': gradeScale.toJson(),
      'students': students.map((e) => e.toJson()).toList(),
      'assignments': assignments.map((e) => e.toJson()).toList(),
      'grades': gradesJson,
      'categories': categories.map((e) => e.toJson()).toList(),
      'gradingPeriodId': gradingPeriodId,
      'gradingPeriodName': gradingPeriodName,
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }
}

/// Student in the gradebook.
@immutable
class GradebookStudent {
  const GradebookStudent({
    required this.id,
    required this.name,
    this.email,
    this.avatarUrl,
    this.overallGrade,
    this.hasIep = false,
    this.has504 = false,
  });

  final String id;
  final String name;
  final String? email;
  final String? avatarUrl;
  final StudentGrade? overallGrade;
  final bool hasIep;
  final bool has504;

  factory GradebookStudent.fromJson(Map<String, dynamic> json) {
    return GradebookStudent(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      overallGrade: json['overallGrade'] != null
          ? StudentGrade.fromJson(json['overallGrade'] as Map<String, dynamic>)
          : null,
      hasIep: json['hasIep'] as bool? ?? false,
      has504: json['has504'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'avatarUrl': avatarUrl,
      'overallGrade': overallGrade?.toJson(),
      'hasIep': hasIep,
      'has504': has504,
    };
  }
}

/// Assignment in the gradebook.
@immutable
class GradebookAssignment {
  const GradebookAssignment({
    required this.id,
    required this.title,
    required this.pointsPossible,
    this.categoryId,
    this.categoryName,
    this.dueAt,
    this.weight = 1.0,
  });

  final String id;
  final String title;
  final double pointsPossible;
  final String? categoryId;
  final String? categoryName;
  final DateTime? dueAt;
  final double weight;

  factory GradebookAssignment.fromJson(Map<String, dynamic> json) {
    return GradebookAssignment(
      id: json['id'] as String,
      title: json['title'] as String,
      pointsPossible: (json['pointsPossible'] as num).toDouble(),
      categoryId: json['categoryId'] as String?,
      categoryName: json['categoryName'] as String?,
      dueAt: json['dueAt'] != null
          ? DateTime.tryParse(json['dueAt'] as String)
          : null,
      weight: (json['weight'] as num?)?.toDouble() ?? 1.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'pointsPossible': pointsPossible,
      'categoryId': categoryId,
      'categoryName': categoryName,
      'dueAt': dueAt?.toIso8601String(),
      'weight': weight,
    };
  }
}

/// Category in the gradebook.
@immutable
class GradebookCategory {
  const GradebookCategory({
    required this.id,
    required this.name,
    this.weight = 1.0,
    this.color,
    this.dropLowest = 0,
  });

  final String id;
  final String name;
  final double weight;
  final String? color;
  final int dropLowest;

  factory GradebookCategory.fromJson(Map<String, dynamic> json) {
    return GradebookCategory(
      id: json['id'] as String,
      name: json['name'] as String,
      weight: (json['weight'] as num?)?.toDouble() ?? 1.0,
      color: json['color'] as String?,
      dropLowest: json['dropLowest'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'weight': weight,
      'color': color,
      'dropLowest': dropLowest,
    };
  }
}

/// DTO for updating a grade.
class UpdateGradeDto {
  const UpdateGradeDto({
    this.pointsEarned,
    this.feedback,
    this.isExcused,
    this.applyLatePenalty,
  });

  final double? pointsEarned;
  final String? feedback;
  final bool? isExcused;
  final bool? applyLatePenalty;

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
    if (pointsEarned != null) json['pointsEarned'] = pointsEarned;
    if (feedback != null) json['feedback'] = feedback;
    if (isExcused != null) json['isExcused'] = isExcused;
    if (applyLatePenalty != null) json['applyLatePenalty'] = applyLatePenalty;
    return json;
  }
}

/// DTO for bulk grading.
class BulkGradeDto {
  const BulkGradeDto({
    required this.grades,
  });

  final List<BulkGradeEntry> grades;

  Map<String, dynamic> toJson() {
    return {
      'grades': grades.map((e) => e.toJson()).toList(),
    };
  }
}

/// Entry in a bulk grade operation.
class BulkGradeEntry {
  const BulkGradeEntry({
    required this.studentId,
    required this.assignmentId,
    this.pointsEarned,
    this.feedback,
    this.isExcused = false,
  });

  final String studentId;
  final String assignmentId;
  final double? pointsEarned;
  final String? feedback;
  final bool isExcused;

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'assignmentId': assignmentId,
      'pointsEarned': pointsEarned,
      'feedback': feedback,
      'isExcused': isExcused,
    };
  }
}
