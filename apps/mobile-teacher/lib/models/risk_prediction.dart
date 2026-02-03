/// Risk prediction models for student early warning system
/// Matches web-teacher API contracts for mobile parity
library;

import 'package:flutter/foundation.dart';

/// Risk level classification for students
enum RiskLevel {
  onTrack('on-track'),
  watch('watch'),
  atRisk('at-risk'),
  critical('critical');

  const RiskLevel(this.value);
  final String value;

  static RiskLevel fromString(String value) {
    return RiskLevel.values.firstWhere(
      (level) => level.value == value,
      orElse: () => RiskLevel.onTrack,
    );
  }

  /// Returns display label for UI
  String get label {
    switch (this) {
      case RiskLevel.onTrack:
        return 'On Track';
      case RiskLevel.watch:
        return 'Watch';
      case RiskLevel.atRisk:
        return 'At Risk';
      case RiskLevel.critical:
        return 'Critical';
    }
  }

  /// Returns whether this level requires attention
  bool get requiresAttention =>
      this == RiskLevel.atRisk || this == RiskLevel.critical;
}

/// Severity level for risk factors
enum RiskSeverity {
  low,
  medium,
  high;

  static RiskSeverity fromString(String value) {
    return RiskSeverity.values.firstWhere(
      (s) => s.name == value.toLowerCase(),
      orElse: () => RiskSeverity.low,
    );
  }
}

/// Category of risk factors
enum RiskCategory {
  academic,
  engagement,
  behavioral,
  temporal;

  static RiskCategory fromString(String value) {
    return RiskCategory.values.firstWhere(
      (c) => c.name == value.toLowerCase(),
      orElse: () => RiskCategory.academic,
    );
  }

  String get label {
    switch (this) {
      case RiskCategory.academic:
        return 'Academic';
      case RiskCategory.engagement:
        return 'Engagement';
      case RiskCategory.behavioral:
        return 'Behavioral';
      case RiskCategory.temporal:
        return 'Temporal';
    }
  }
}

/// Trend direction for risk score changes
enum RiskTrend {
  increasing,
  stable,
  decreasing;

  static RiskTrend fromString(String value) {
    return RiskTrend.values.firstWhere(
      (t) => t.name == value.toLowerCase(),
      orElse: () => RiskTrend.stable,
    );
  }

  String get label {
    switch (this) {
      case RiskTrend.increasing:
        return 'Increasing';
      case RiskTrend.stable:
        return 'Stable';
      case RiskTrend.decreasing:
        return 'Decreasing';
    }
  }
}

/// Urgency level for interventions
enum InterventionUrgency {
  immediate,
  shortTerm('short_term'),
  mediumTerm('medium_term');

  const InterventionUrgency([this._value]);
  final String? _value;
  String get value => _value ?? name;

  static InterventionUrgency fromString(String value) {
    return InterventionUrgency.values.firstWhere(
      (u) => u.value == value || u.name == value,
      orElse: () => InterventionUrgency.mediumTerm,
    );
  }

  String get label {
    switch (this) {
      case InterventionUrgency.immediate:
        return 'Immediate';
      case InterventionUrgency.shortTerm:
        return 'Short Term';
      case InterventionUrgency.mediumTerm:
        return 'Medium Term';
    }
  }
}

/// Intensity level for interventions
enum InterventionIntensity {
  light,
  moderate,
  intensive;

  static InterventionIntensity fromString(String value) {
    return InterventionIntensity.values.firstWhere(
      (i) => i.name == value.toLowerCase(),
      orElse: () => InterventionIntensity.moderate,
    );
  }

  String get label {
    switch (this) {
      case InterventionIntensity.light:
        return 'Light Touch';
      case InterventionIntensity.moderate:
        return 'Moderate';
      case InterventionIntensity.intensive:
        return 'Intensive';
    }
  }
}

/// Individual risk factor contributing to overall risk score
@immutable
class RiskFactor {
  const RiskFactor({
    required this.feature,
    required this.category,
    required this.description,
    required this.currentValue,
    required this.contribution,
    required this.severity,
    this.recommendation,
  });

  final String feature;
  final RiskCategory category;
  final String description;
  final dynamic currentValue;
  final double contribution;
  final RiskSeverity severity;
  final String? recommendation;

  factory RiskFactor.fromJson(Map<String, dynamic> json) {
    return RiskFactor(
      feature: json['feature'] as String? ?? json['factor'] as String? ?? '',
      category: RiskCategory.fromString(json['category'] as String? ?? 'academic'),
      description: json['description'] as String? ?? '',
      currentValue: json['currentValue'] ?? json['current_value'],
      contribution: (json['contribution'] as num?)?.toDouble() ?? 0.0,
      severity: RiskSeverity.fromString(json['severity'] as String? ?? 'low'),
      recommendation: json['recommendation'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'feature': feature,
        'category': category.name,
        'description': description,
        'currentValue': currentValue,
        'contribution': contribution,
        'severity': severity.name,
        if (recommendation != null) 'recommendation': recommendation,
      };
}

/// Protective factor that reduces overall risk
@immutable
class ProtectiveFactor {
  const ProtectiveFactor({
    required this.feature,
    required this.category,
    required this.description,
    required this.currentValue,
    required this.contribution,
  });

  final String feature;
  final String category;
  final String description;
  final dynamic currentValue;
  final double contribution;

  factory ProtectiveFactor.fromJson(Map<String, dynamic> json) {
    return ProtectiveFactor(
      feature: json['feature'] as String? ?? '',
      category: json['category'] as String? ?? '',
      description: json['description'] as String? ?? '',
      currentValue: json['currentValue'] ?? json['current_value'],
      contribution: (json['contribution'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'feature': feature,
        'category': category,
        'description': description,
        'currentValue': currentValue,
        'contribution': contribution,
      };
}

/// Complete risk prediction for a student
@immutable
class RiskPrediction {
  const RiskPrediction({
    required this.studentId,
    required this.timestamp,
    required this.riskScore,
    required this.riskLevel,
    required this.confidence,
    required this.categoryScores,
    required this.topRiskFactors,
    required this.protectiveFactors,
    required this.riskTrend,
    this.previousRiskScore,
    this.scoreChange,
    required this.modelVersion,
  });

  final String studentId;
  final DateTime timestamp;
  final double riskScore; // 0-1 normalized
  final RiskLevel riskLevel;
  final double confidence; // 0-1
  final RiskCategoryScores categoryScores;
  final List<RiskFactor> topRiskFactors;
  final List<ProtectiveFactor> protectiveFactors;
  final RiskTrend riskTrend;
  final double? previousRiskScore;
  final double? scoreChange;
  final String modelVersion;

  /// Risk score as percentage (0-100)
  int get riskScorePercent => (riskScore * 100).round();

  /// Confidence as percentage (0-100)
  int get confidencePercent => (confidence * 100).round();

  /// Whether risk is trending worse
  bool get isTrendingWorse => riskTrend == RiskTrend.increasing;

  factory RiskPrediction.fromJson(Map<String, dynamic> json) {
    return RiskPrediction(
      studentId: json['studentId'] as String? ?? json['student_id'] as String? ?? '',
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
      riskScore: (json['riskScore'] as num?)?.toDouble() ??
                 (json['risk_score'] as num?)?.toDouble() ?? 0.0,
      riskLevel: RiskLevel.fromString(json['riskLevel'] as String? ??
                                       json['risk_level'] as String? ?? 'on-track'),
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      categoryScores: RiskCategoryScores.fromJson(
        json['categoryScores'] as Map<String, dynamic>? ??
        json['category_scores'] as Map<String, dynamic>? ?? {},
      ),
      topRiskFactors: (json['topRiskFactors'] as List<dynamic>? ??
                       json['top_risk_factors'] as List<dynamic>? ?? [])
          .map((f) => RiskFactor.fromJson(f as Map<String, dynamic>))
          .toList(),
      protectiveFactors: (json['protectiveFactors'] as List<dynamic>? ??
                          json['protective_factors'] as List<dynamic>? ?? [])
          .map((f) => ProtectiveFactor.fromJson(f as Map<String, dynamic>))
          .toList(),
      riskTrend: RiskTrend.fromString(json['riskTrend'] as String? ??
                                       json['risk_trend'] as String? ?? 'stable'),
      previousRiskScore: (json['previousRiskScore'] as num?)?.toDouble() ??
                         (json['previous_risk_score'] as num?)?.toDouble(),
      scoreChange: (json['scoreChange'] as num?)?.toDouble() ??
                   (json['score_change'] as num?)?.toDouble(),
      modelVersion: json['modelVersion'] as String? ??
                    json['model_version'] as String? ?? 'unknown',
    );
  }

  Map<String, dynamic> toJson() => {
        'studentId': studentId,
        'timestamp': timestamp.toIso8601String(),
        'riskScore': riskScore,
        'riskLevel': riskLevel.value,
        'confidence': confidence,
        'categoryScores': categoryScores.toJson(),
        'topRiskFactors': topRiskFactors.map((f) => f.toJson()).toList(),
        'protectiveFactors': protectiveFactors.map((f) => f.toJson()).toList(),
        'riskTrend': riskTrend.name,
        if (previousRiskScore != null) 'previousRiskScore': previousRiskScore,
        if (scoreChange != null) 'scoreChange': scoreChange,
        'modelVersion': modelVersion,
      };
}

/// Category-specific risk scores
@immutable
class RiskCategoryScores {
  const RiskCategoryScores({
    required this.academic,
    required this.engagement,
    required this.behavioral,
    required this.temporal,
  });

  final double academic;
  final double engagement;
  final double behavioral;
  final double temporal;

  factory RiskCategoryScores.fromJson(Map<String, dynamic> json) {
    return RiskCategoryScores(
      academic: (json['academic'] as num?)?.toDouble() ?? 0.0,
      engagement: (json['engagement'] as num?)?.toDouble() ?? 0.0,
      behavioral: (json['behavioral'] as num?)?.toDouble() ?? 0.0,
      temporal: (json['temporal'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'academic': academic,
        'engagement': engagement,
        'behavioral': behavioral,
        'temporal': temporal,
      };

  /// Get score for a specific category
  double scoreFor(RiskCategory category) {
    switch (category) {
      case RiskCategory.academic:
        return academic;
      case RiskCategory.engagement:
        return engagement;
      case RiskCategory.behavioral:
        return behavioral;
      case RiskCategory.temporal:
        return temporal;
    }
  }
}

/// Recommended intervention for a student
@immutable
class InterventionRecommendation {
  const InterventionRecommendation({
    required this.interventionId,
    required this.name,
    required this.type,
    required this.intensity,
    required this.urgency,
    required this.relevanceScore,
    required this.expectedEffectiveness,
    required this.confidence,
    required this.targetRiskFactors,
    required this.rationale,
    required this.implementationNotes,
    required this.estimatedDurationDays,
    required this.requiresParentConsent,
    required this.requiresEducatorApproval,
    required this.successIndicators,
  });

  final String interventionId;
  final String name;
  final String type;
  final InterventionIntensity intensity;
  final InterventionUrgency urgency;
  final double relevanceScore;
  final double expectedEffectiveness;
  final double confidence;
  final List<String> targetRiskFactors;
  final String rationale;
  final String implementationNotes;
  final int estimatedDurationDays;
  final bool requiresParentConsent;
  final bool requiresEducatorApproval;
  final List<String> successIndicators;

  /// Relevance as percentage (0-100)
  int get relevancePercent => (relevanceScore * 100).round();

  /// Expected effectiveness as percentage (0-100)
  int get effectivenessPercent => (expectedEffectiveness * 100).round();

  factory InterventionRecommendation.fromJson(Map<String, dynamic> json) {
    return InterventionRecommendation(
      interventionId: json['interventionId'] as String? ??
                      json['intervention_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      type: json['type'] as String? ?? '',
      intensity: InterventionIntensity.fromString(json['intensity'] as String? ?? 'moderate'),
      urgency: InterventionUrgency.fromString(json['urgency'] as String? ?? 'medium_term'),
      relevanceScore: (json['relevanceScore'] as num?)?.toDouble() ??
                      (json['relevance_score'] as num?)?.toDouble() ?? 0.0,
      expectedEffectiveness: (json['expectedEffectiveness'] as num?)?.toDouble() ??
                             (json['expected_effectiveness'] as num?)?.toDouble() ?? 0.0,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      targetRiskFactors: List<String>.from(
        json['targetRiskFactors'] as List<dynamic>? ??
        json['target_risk_factors'] as List<dynamic>? ?? [],
      ),
      rationale: json['rationale'] as String? ?? '',
      implementationNotes: json['implementationNotes'] as String? ??
                           json['implementation_notes'] as String? ?? '',
      estimatedDurationDays: json['estimatedDurationDays'] as int? ??
                             json['estimated_duration_days'] as int? ?? 14,
      requiresParentConsent: json['requiresParentConsent'] as bool? ??
                             json['requires_parent_consent'] as bool? ?? false,
      requiresEducatorApproval: json['requiresEducatorApproval'] as bool? ??
                                json['requires_educator_approval'] as bool? ?? true,
      successIndicators: List<String>.from(
        json['successIndicators'] as List<dynamic>? ??
        json['success_indicators'] as List<dynamic>? ?? [],
      ),
    );
  }

  Map<String, dynamic> toJson() => {
        'interventionId': interventionId,
        'name': name,
        'type': type,
        'intensity': intensity.name,
        'urgency': urgency.value,
        'relevanceScore': relevanceScore,
        'expectedEffectiveness': expectedEffectiveness,
        'confidence': confidence,
        'targetRiskFactors': targetRiskFactors,
        'rationale': rationale,
        'implementationNotes': implementationNotes,
        'estimatedDurationDays': estimatedDurationDays,
        'requiresParentConsent': requiresParentConsent,
        'requiresEducatorApproval': requiresEducatorApproval,
        'successIndicators': successIndicators,
      };
}

/// Complete intervention plan for a student
@immutable
class InterventionPlan {
  const InterventionPlan({
    required this.studentId,
    required this.createdAt,
    required this.riskLevel,
    required this.primaryRecommendations,
    required this.secondaryRecommendations,
    required this.excludedInterventions,
    required this.reviewDate,
    this.notes,
    required this.requiresImmediateAction,
    required this.educatorApprovalRequired,
  });

  final String studentId;
  final DateTime createdAt;
  final RiskLevel riskLevel;
  final List<InterventionRecommendation> primaryRecommendations;
  final List<InterventionRecommendation> secondaryRecommendations;
  final List<ExcludedIntervention> excludedInterventions;
  final DateTime reviewDate;
  final String? notes;
  final bool requiresImmediateAction;
  final bool educatorApprovalRequired;

  /// All recommendations combined
  List<InterventionRecommendation> get allRecommendations =>
      [...primaryRecommendations, ...secondaryRecommendations];

  factory InterventionPlan.fromJson(Map<String, dynamic> json) {
    return InterventionPlan(
      studentId: json['studentId'] as String? ?? json['student_id'] as String? ?? '',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ??
                                   json['created_at'] as String? ?? '') ?? DateTime.now(),
      riskLevel: RiskLevel.fromString(json['riskLevel'] as String? ??
                                       json['risk_level'] as String? ?? 'on-track'),
      primaryRecommendations: (json['primaryRecommendations'] as List<dynamic>? ??
                               json['primary_recommendations'] as List<dynamic>? ?? [])
          .map((r) => InterventionRecommendation.fromJson(r as Map<String, dynamic>))
          .toList(),
      secondaryRecommendations: (json['secondaryRecommendations'] as List<dynamic>? ??
                                 json['secondary_recommendations'] as List<dynamic>? ?? [])
          .map((r) => InterventionRecommendation.fromJson(r as Map<String, dynamic>))
          .toList(),
      excludedInterventions: (json['excludedInterventions'] as List<dynamic>? ??
                              json['excluded_interventions'] as List<dynamic>? ?? [])
          .map((e) => ExcludedIntervention.fromJson(e as Map<String, dynamic>))
          .toList(),
      reviewDate: DateTime.tryParse(json['reviewDate'] as String? ??
                                    json['review_date'] as String? ?? '') ??
                  DateTime.now().add(const Duration(days: 14)),
      notes: json['notes'] as String?,
      requiresImmediateAction: json['requiresImmediateAction'] as bool? ??
                               json['requires_immediate_action'] as bool? ?? false,
      educatorApprovalRequired: json['educatorApprovalRequired'] as bool? ??
                                json['educator_approval_required'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
        'studentId': studentId,
        'createdAt': createdAt.toIso8601String(),
        'riskLevel': riskLevel.value,
        'primaryRecommendations': primaryRecommendations.map((r) => r.toJson()).toList(),
        'secondaryRecommendations': secondaryRecommendations.map((r) => r.toJson()).toList(),
        'excludedInterventions': excludedInterventions.map((e) => e.toJson()).toList(),
        'reviewDate': reviewDate.toIso8601String(),
        if (notes != null) 'notes': notes,
        'requiresImmediateAction': requiresImmediateAction,
        'educatorApprovalRequired': educatorApprovalRequired,
      };
}

/// Intervention that was considered but excluded
@immutable
class ExcludedIntervention {
  const ExcludedIntervention({
    required this.interventionId,
    required this.name,
    required this.reason,
  });

  final String interventionId;
  final String name;
  final String reason;

  factory ExcludedIntervention.fromJson(Map<String, dynamic> json) {
    return ExcludedIntervention(
      interventionId: json['interventionId'] as String? ??
                      json['intervention_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      reason: json['reason'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'interventionId': interventionId,
        'name': name,
        'reason': reason,
      };
}

/// Student in early warning report
@immutable
class EarlyWarningStudent {
  const EarlyWarningStudent({
    required this.studentId,
    required this.studentName,
    required this.riskLevel,
    required this.riskScore,
    required this.primaryRiskFactors,
    required this.daysAtRisk,
    required this.suggestedInterventions,
    this.lastTeacherContact,
  });

  final String studentId;
  final String studentName;
  final RiskLevel riskLevel;
  final double riskScore;
  final List<RiskFactor> primaryRiskFactors;
  final int daysAtRisk;
  final List<String> suggestedInterventions;
  final DateTime? lastTeacherContact;

  /// Risk score as percentage (0-100)
  int get riskScorePercent => (riskScore * 100).round();

  /// Days since last teacher contact
  int? get daysSinceLastContact {
    if (lastTeacherContact == null) return null;
    return DateTime.now().difference(lastTeacherContact!).inDays;
  }

  factory EarlyWarningStudent.fromJson(Map<String, dynamic> json) {
    return EarlyWarningStudent(
      studentId: json['studentId'] as String? ?? json['student_id'] as String? ?? '',
      studentName: json['studentName'] as String? ?? json['student_name'] as String? ?? '',
      riskLevel: RiskLevel.fromString(json['riskLevel'] as String? ??
                                       json['risk_level'] as String? ?? 'on-track'),
      riskScore: (json['riskScore'] as num?)?.toDouble() ??
                 (json['risk_score'] as num?)?.toDouble() ?? 0.0,
      primaryRiskFactors: (json['primaryRiskFactors'] as List<dynamic>? ??
                           json['primary_risk_factors'] as List<dynamic>? ?? [])
          .map((f) => RiskFactor.fromJson(f as Map<String, dynamic>))
          .toList(),
      daysAtRisk: json['daysAtRisk'] as int? ?? json['days_at_risk'] as int? ?? 0,
      suggestedInterventions: List<String>.from(
        json['suggestedInterventions'] as List<dynamic>? ??
        json['suggested_interventions'] as List<dynamic>? ?? [],
      ),
      lastTeacherContact: json['lastTeacherContact'] != null
          ? DateTime.tryParse(json['lastTeacherContact'] as String)
          : json['last_teacher_contact'] != null
              ? DateTime.tryParse(json['last_teacher_contact'] as String)
              : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'studentId': studentId,
        'studentName': studentName,
        'riskLevel': riskLevel.value,
        'riskScore': riskScore,
        'primaryRiskFactors': primaryRiskFactors.map((f) => f.toJson()).toList(),
        'daysAtRisk': daysAtRisk,
        'suggestedInterventions': suggestedInterventions,
        if (lastTeacherContact != null)
          'lastTeacherContact': lastTeacherContact!.toIso8601String(),
      };
}

/// Class-level warning for early warning report
@immutable
class ClassLevelWarning {
  const ClassLevelWarning({
    required this.type,
    required this.message,
    required this.affectedStudentCount,
    required this.severity,
  });

  final String type;
  final String message;
  final int affectedStudentCount;
  final RiskSeverity severity;

  factory ClassLevelWarning.fromJson(Map<String, dynamic> json) {
    return ClassLevelWarning(
      type: json['type'] as String? ?? '',
      message: json['message'] as String? ?? '',
      affectedStudentCount: json['affectedStudentCount'] as int? ??
                            json['affected_student_count'] as int? ?? 0,
      severity: RiskSeverity.fromString(json['severity'] as String? ?? 'low'),
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type,
        'message': message,
        'affectedStudentCount': affectedStudentCount,
        'severity': severity.name,
      };
}

/// Complete early warning report for a class
@immutable
class EarlyWarningReport {
  const EarlyWarningReport({
    required this.classId,
    required this.generatedAt,
    required this.criticalStudents,
    required this.atRiskStudents,
    required this.watchStudents,
    required this.classLevelWarnings,
  });

  final String classId;
  final DateTime generatedAt;
  final List<EarlyWarningStudent> criticalStudents;
  final List<EarlyWarningStudent> atRiskStudents;
  final List<EarlyWarningStudent> watchStudents;
  final List<ClassLevelWarning> classLevelWarnings;

  /// Total number of students needing attention
  int get studentsNeedingAttention =>
      criticalStudents.length + atRiskStudents.length;

  /// All students in the report by risk level
  List<EarlyWarningStudent> get allStudents =>
      [...criticalStudents, ...atRiskStudents, ...watchStudents];

  factory EarlyWarningReport.fromJson(Map<String, dynamic> json) {
    return EarlyWarningReport(
      classId: json['classId'] as String? ?? json['class_id'] as String? ?? '',
      generatedAt: DateTime.tryParse(json['generatedAt'] as String? ??
                                     json['generated_at'] as String? ?? '') ?? DateTime.now(),
      criticalStudents: (json['criticalStudents'] as List<dynamic>? ??
                         json['critical_students'] as List<dynamic>? ?? [])
          .map((s) => EarlyWarningStudent.fromJson(s as Map<String, dynamic>))
          .toList(),
      atRiskStudents: (json['atRiskStudents'] as List<dynamic>? ??
                       json['at_risk_students'] as List<dynamic>? ?? [])
          .map((s) => EarlyWarningStudent.fromJson(s as Map<String, dynamic>))
          .toList(),
      watchStudents: (json['watchStudents'] as List<dynamic>? ??
                      json['watch_students'] as List<dynamic>? ?? [])
          .map((s) => EarlyWarningStudent.fromJson(s as Map<String, dynamic>))
          .toList(),
      classLevelWarnings: (json['classLevelWarnings'] as List<dynamic>? ??
                           json['class_level_warnings'] as List<dynamic>? ?? [])
          .map((w) => ClassLevelWarning.fromJson(w as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'classId': classId,
        'generatedAt': generatedAt.toIso8601String(),
        'criticalStudents': criticalStudents.map((s) => s.toJson()).toList(),
        'atRiskStudents': atRiskStudents.map((s) => s.toJson()).toList(),
        'watchStudents': watchStudents.map((s) => s.toJson()).toList(),
        'classLevelWarnings': classLevelWarnings.map((w) => w.toJson()).toList(),
      };
}

/// Classroom-level risk summary
@immutable
class ClassroomRiskSummary {
  const ClassroomRiskSummary({
    required this.classroomId,
    required this.totalStudents,
    required this.riskDistribution,
    required this.averageRiskScore,
    required this.studentsNeedingAttention,
    required this.trendImproving,
    required this.trendWorsening,
  });

  final String classroomId;
  final int totalStudents;
  final Map<RiskLevel, int> riskDistribution;
  final double averageRiskScore;
  final int studentsNeedingAttention;
  final int trendImproving;
  final int trendWorsening;

  /// Average risk score as percentage (0-100)
  int get averageRiskScorePercent => (averageRiskScore * 100).round();

  /// Percentage of students on track
  double get onTrackPercent {
    if (totalStudents == 0) return 0;
    return ((riskDistribution[RiskLevel.onTrack] ?? 0) / totalStudents) * 100;
  }

  factory ClassroomRiskSummary.fromJson(Map<String, dynamic> json) {
    final distJson = json['riskDistribution'] as Map<String, dynamic>? ??
                     json['risk_distribution'] as Map<String, dynamic>? ?? {};

    final distribution = <RiskLevel, int>{};
    for (final level in RiskLevel.values) {
      distribution[level] = distJson[level.value] as int? ??
                           distJson[level.name] as int? ?? 0;
    }

    return ClassroomRiskSummary(
      classroomId: json['classroomId'] as String? ?? json['classroom_id'] as String? ?? '',
      totalStudents: json['totalStudents'] as int? ?? json['total_students'] as int? ?? 0,
      riskDistribution: distribution,
      averageRiskScore: (json['averageRiskScore'] as num?)?.toDouble() ??
                        (json['average_risk_score'] as num?)?.toDouble() ?? 0.0,
      studentsNeedingAttention: json['studentsNeedingAttention'] as int? ??
                                json['students_needing_attention'] as int? ?? 0,
      trendImproving: json['trendImproving'] as int? ?? json['trend_improving'] as int? ?? 0,
      trendWorsening: json['trendWorsening'] as int? ?? json['trend_worsening'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'classroomId': classroomId,
        'totalStudents': totalStudents,
        'riskDistribution': {
          for (final entry in riskDistribution.entries) entry.key.value: entry.value,
        },
        'averageRiskScore': averageRiskScore,
        'studentsNeedingAttention': studentsNeedingAttention,
        'trendImproving': trendImproving,
        'trendWorsening': trendWorsening,
      };
}

/// Risk distribution across a classroom
@immutable
class RiskDistribution {
  const RiskDistribution({
    required this.onTrack,
    required this.watch,
    required this.atRisk,
    required this.critical,
  });

  final int onTrack;
  final int watch;
  final int atRisk;
  final int critical;

  int get total => onTrack + watch + atRisk + critical;
  int get needsAttention => atRisk + critical;

  factory RiskDistribution.fromJson(Map<String, dynamic> json) {
    return RiskDistribution(
      onTrack: json['onTrack'] as int? ?? json['on_track'] as int? ?? 0,
      watch: json['watch'] as int? ?? 0,
      atRisk: json['atRisk'] as int? ?? json['at_risk'] as int? ?? 0,
      critical: json['critical'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'onTrack': onTrack,
        'watch': watch,
        'atRisk': atRisk,
        'critical': critical,
      };
}

/// Combined risk prediction with intervention plan
@immutable
class StudentRiskWithInterventions {
  const StudentRiskWithInterventions({
    required this.prediction,
    this.interventions,
  });

  final RiskPrediction prediction;
  final InterventionPlan? interventions;

  factory StudentRiskWithInterventions.fromJson(Map<String, dynamic> json) {
    return StudentRiskWithInterventions(
      prediction: RiskPrediction.fromJson(
        json['prediction'] as Map<String, dynamic>? ?? {},
      ),
      interventions: json['interventions'] != null
          ? InterventionPlan.fromJson(json['interventions'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'prediction': prediction.toJson(),
        if (interventions != null) 'interventions': interventions!.toJson(),
      };
}

/// Comprehensive risk score with metadata
@immutable
class RiskScore {
  const RiskScore({
    required this.score,
    required this.level,
    required this.timestamp,
    required this.confidence,
    required this.contributingFactors,
    this.modelVersion,
  });

  final double score; // 0-1 normalized
  final RiskLevel level;
  final DateTime timestamp;
  final double confidence; // 0-1
  final List<RiskFactor> contributingFactors;
  final String? modelVersion;

  /// Score as percentage (0-100)
  int get scorePercent => (score * 100).round();

  /// Confidence as percentage (0-100)
  int get confidencePercent => (confidence * 100).round();

  factory RiskScore.fromJson(Map<String, dynamic> json) {
    return RiskScore(
      score: (json['score'] as num?)?.toDouble() ?? 0.0,
      level: RiskLevel.fromString(json['level'] as String? ?? 'on-track'),
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      contributingFactors: (json['contributingFactors'] as List<dynamic>? ??
                           json['contributing_factors'] as List<dynamic>? ?? [])
          .map((f) => RiskFactor.fromJson(f as Map<String, dynamic>))
          .toList(),
      modelVersion: json['modelVersion'] as String? ?? json['model_version'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'score': score,
        'level': level.value,
        'timestamp': timestamp.toIso8601String(),
        'confidence': confidence,
        'contributingFactors': contributingFactors.map((f) => f.toJson()).toList(),
        if (modelVersion != null) 'modelVersion': modelVersion,
      };
}

/// Trend analysis for risk scores over time
@immutable
class RiskTrendAnalysis {
  const RiskTrendAnalysis({
    required this.direction,
    required this.magnitude,
    required this.consistency,
    required this.timeframe,
    this.projectedLevel,
    this.projectedDate,
  });

  final RiskTrend direction;
  final double magnitude; // Rate of change
  final double consistency; // 0-1, how consistent the trend is
  final Duration timeframe;
  final RiskLevel? projectedLevel;
  final DateTime? projectedDate;

  /// Whether trend is concerning (increasing + high magnitude)
  bool get isConcerning => direction == RiskTrend.increasing && magnitude > 0.1;

  factory RiskTrendAnalysis.fromJson(Map<String, dynamic> json) {
    return RiskTrendAnalysis(
      direction: RiskTrend.fromString(json['direction'] as String? ?? 'stable'),
      magnitude: (json['magnitude'] as num?)?.toDouble() ?? 0.0,
      consistency: (json['consistency'] as num?)?.toDouble() ?? 0.0,
      timeframe: Duration(
        days: json['timeframeDays'] as int? ?? json['timeframe_days'] as int? ?? 7,
      ),
      projectedLevel: json['projectedLevel'] != null || json['projected_level'] != null
          ? RiskLevel.fromString(json['projectedLevel'] as String? ??
                                 json['projected_level'] as String? ?? 'on-track')
          : null,
      projectedDate: json['projectedDate'] != null
          ? DateTime.tryParse(json['projectedDate'] as String)
          : json['projected_date'] != null
              ? DateTime.tryParse(json['projected_date'] as String)
              : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'direction': direction.name,
        'magnitude': magnitude,
        'consistency': consistency,
        'timeframeDays': timeframe.inDays,
        if (projectedLevel != null) 'projectedLevel': projectedLevel!.value,
        if (projectedDate != null) 'projectedDate': projectedDate!.toIso8601String(),
      };
}

/// Predictive indicator for early warning signals
@immutable
class PredictiveIndicator {
  const PredictiveIndicator({
    required this.indicatorId,
    required this.name,
    required this.category,
    required this.currentValue,
    required this.threshold,
    required this.severity,
    required this.description,
    required this.recommendation,
    this.daysUntilThreshold,
    this.confidence,
  });

  final String indicatorId;
  final String name;
  final RiskCategory category;
  final double currentValue;
  final double threshold;
  final RiskSeverity severity;
  final String description;
  final String recommendation;
  final int? daysUntilThreshold;
  final double? confidence;

  /// Whether indicator has breached threshold
  bool get isTriggered => currentValue >= threshold;

  /// Percentage of threshold reached
  double get thresholdPercent => (currentValue / threshold * 100).clamp(0, 100);

  factory PredictiveIndicator.fromJson(Map<String, dynamic> json) {
    return PredictiveIndicator(
      indicatorId: json['indicatorId'] as String? ?? json['indicator_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      category: RiskCategory.fromString(json['category'] as String? ?? 'academic'),
      currentValue: (json['currentValue'] as num?)?.toDouble() ??
                    (json['current_value'] as num?)?.toDouble() ?? 0.0,
      threshold: (json['threshold'] as num?)?.toDouble() ?? 0.0,
      severity: RiskSeverity.fromString(json['severity'] as String? ?? 'low'),
      description: json['description'] as String? ?? '',
      recommendation: json['recommendation'] as String? ?? '',
      daysUntilThreshold: json['daysUntilThreshold'] as int? ??
                          json['days_until_threshold'] as int?,
      confidence: (json['confidence'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'indicatorId': indicatorId,
        'name': name,
        'category': category.name,
        'currentValue': currentValue,
        'threshold': threshold,
        'severity': severity.name,
        'description': description,
        'recommendation': recommendation,
        if (daysUntilThreshold != null) 'daysUntilThreshold': daysUntilThreshold,
        if (confidence != null) 'confidence': confidence,
      };
}

/// Historical risk data point for time-series analysis
@immutable
class HistoricalRiskData {
  const HistoricalRiskData({
    required this.studentId,
    required this.dataPoints,
    required this.periodStart,
    required this.periodEnd,
    required this.aggregationType,
  });

  final String studentId;
  final List<RiskDataPoint> dataPoints;
  final DateTime periodStart;
  final DateTime periodEnd;
  final String aggregationType; // 'daily', 'weekly', 'monthly'

  /// Average risk score over the period
  double get averageScore {
    if (dataPoints.isEmpty) return 0.0;
    return dataPoints.map((p) => p.riskScore).reduce((a, b) => a + b) / dataPoints.length;
  }

  /// Maximum risk score in the period
  double get maxScore {
    if (dataPoints.isEmpty) return 0.0;
    return dataPoints.map((p) => p.riskScore).reduce((a, b) => a > b ? a : b);
  }

  /// Minimum risk score in the period
  double get minScore {
    if (dataPoints.isEmpty) return 0.0;
    return dataPoints.map((p) => p.riskScore).reduce((a, b) => a < b ? a : b);
  }

  /// Number of data points
  int get dataPointCount => dataPoints.length;

  factory HistoricalRiskData.fromJson(Map<String, dynamic> json) {
    return HistoricalRiskData(
      studentId: json['studentId'] as String? ?? json['student_id'] as String? ?? '',
      dataPoints: (json['dataPoints'] as List<dynamic>? ??
                   json['data_points'] as List<dynamic>? ?? [])
          .map((p) => RiskDataPoint.fromJson(p as Map<String, dynamic>))
          .toList(),
      periodStart: DateTime.tryParse(json['periodStart'] as String? ??
                                     json['period_start'] as String? ?? '') ?? DateTime.now(),
      periodEnd: DateTime.tryParse(json['periodEnd'] as String? ??
                                   json['period_end'] as String? ?? '') ?? DateTime.now(),
      aggregationType: json['aggregationType'] as String? ??
                       json['aggregation_type'] as String? ?? 'daily',
    );
  }

  Map<String, dynamic> toJson() => {
        'studentId': studentId,
        'dataPoints': dataPoints.map((p) => p.toJson()).toList(),
        'periodStart': periodStart.toIso8601String(),
        'periodEnd': periodEnd.toIso8601String(),
        'aggregationType': aggregationType,
      };
}

/// Individual data point in risk time series
@immutable
class RiskDataPoint {
  const RiskDataPoint({
    required this.timestamp,
    required this.riskScore,
    required this.riskLevel,
    this.categoryScores,
    this.primaryRiskFactor,
  });

  final DateTime timestamp;
  final double riskScore;
  final RiskLevel riskLevel;
  final RiskCategoryScores? categoryScores;
  final String? primaryRiskFactor;

  factory RiskDataPoint.fromJson(Map<String, dynamic> json) {
    return RiskDataPoint(
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
      riskScore: (json['riskScore'] as num?)?.toDouble() ??
                 (json['risk_score'] as num?)?.toDouble() ?? 0.0,
      riskLevel: RiskLevel.fromString(json['riskLevel'] as String? ??
                                       json['risk_level'] as String? ?? 'on-track'),
      categoryScores: json['categoryScores'] != null || json['category_scores'] != null
          ? RiskCategoryScores.fromJson(
              json['categoryScores'] as Map<String, dynamic>? ??
              json['category_scores'] as Map<String, dynamic>? ?? {},
            )
          : null,
      primaryRiskFactor: json['primaryRiskFactor'] as String? ??
                         json['primary_risk_factor'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'timestamp': timestamp.toIso8601String(),
        'riskScore': riskScore,
        'riskLevel': riskLevel.value,
        if (categoryScores != null) 'categoryScores': categoryScores!.toJson(),
        if (primaryRiskFactor != null) 'primaryRiskFactor': primaryRiskFactor,
      };
}

/// Complete student risk profile with trends and indicators
@immutable
class StudentRiskProfile {
  const StudentRiskProfile({
    required this.studentId,
    required this.currentRisk,
    required this.trendAnalysis,
    required this.predictiveIndicators,
    required this.historicalData,
    this.interventions,
  });

  final String studentId;
  final RiskPrediction currentRisk;
  final RiskTrendAnalysis trendAnalysis;
  final List<PredictiveIndicator> predictiveIndicators;
  final HistoricalRiskData historicalData;
  final InterventionPlan? interventions;

  /// Active predictive indicators (triggered)
  List<PredictiveIndicator> get activeIndicators =>
      predictiveIndicators.where((i) => i.isTriggered).toList();

  /// High severity indicators
  List<PredictiveIndicator> get criticalIndicators =>
      predictiveIndicators.where((i) => i.severity == RiskSeverity.high).toList();

  factory StudentRiskProfile.fromJson(Map<String, dynamic> json) {
    return StudentRiskProfile(
      studentId: json['studentId'] as String? ?? json['student_id'] as String? ?? '',
      currentRisk: RiskPrediction.fromJson(
        json['currentRisk'] as Map<String, dynamic>? ??
        json['current_risk'] as Map<String, dynamic>? ?? {},
      ),
      trendAnalysis: RiskTrendAnalysis.fromJson(
        json['trendAnalysis'] as Map<String, dynamic>? ??
        json['trend_analysis'] as Map<String, dynamic>? ?? {},
      ),
      predictiveIndicators: (json['predictiveIndicators'] as List<dynamic>? ??
                             json['predictive_indicators'] as List<dynamic>? ?? [])
          .map((i) => PredictiveIndicator.fromJson(i as Map<String, dynamic>))
          .toList(),
      historicalData: HistoricalRiskData.fromJson(
        json['historicalData'] as Map<String, dynamic>? ??
        json['historical_data'] as Map<String, dynamic>? ?? {},
      ),
      interventions: json['interventions'] != null
          ? InterventionPlan.fromJson(json['interventions'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'studentId': studentId,
        'currentRisk': currentRisk.toJson(),
        'trendAnalysis': trendAnalysis.toJson(),
        'predictiveIndicators': predictiveIndicators.map((i) => i.toJson()).toList(),
        'historicalData': historicalData.toJson(),
        if (interventions != null) 'interventions': interventions!.toJson(),
      };
}

/// Class-level risk overview with aggregated data
@immutable
class ClassRiskOverview {
  const ClassRiskOverview({
    required this.classId,
    required this.summary,
    required this.trendingSummary,
    required this.topIndicators,
    required this.studentProfiles,
    required this.lastUpdated,
  });

  final String classId;
  final ClassroomRiskSummary summary;
  final TrendingSummary trendingSummary;
  final List<PredictiveIndicator> topIndicators;
  final List<StudentRiskProfile> studentProfiles;
  final DateTime lastUpdated;

  /// Students requiring immediate attention
  List<StudentRiskProfile> get urgentStudents =>
      studentProfiles.where((s) => s.currentRisk.riskLevel == RiskLevel.critical).toList();

  factory ClassRiskOverview.fromJson(Map<String, dynamic> json) {
    return ClassRiskOverview(
      classId: json['classId'] as String? ?? json['class_id'] as String? ?? '',
      summary: ClassroomRiskSummary.fromJson(
        json['summary'] as Map<String, dynamic>? ?? {},
      ),
      trendingSummary: TrendingSummary.fromJson(
        json['trendingSummary'] as Map<String, dynamic>? ??
        json['trending_summary'] as Map<String, dynamic>? ?? {},
      ),
      topIndicators: (json['topIndicators'] as List<dynamic>? ??
                      json['top_indicators'] as List<dynamic>? ?? [])
          .map((i) => PredictiveIndicator.fromJson(i as Map<String, dynamic>))
          .toList(),
      studentProfiles: (json['studentProfiles'] as List<dynamic>? ??
                        json['student_profiles'] as List<dynamic>? ?? [])
          .map((p) => StudentRiskProfile.fromJson(p as Map<String, dynamic>))
          .toList(),
      lastUpdated: DateTime.tryParse(json['lastUpdated'] as String? ??
                                     json['last_updated'] as String? ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'classId': classId,
        'summary': summary.toJson(),
        'trendingSummary': trendingSummary.toJson(),
        'topIndicators': topIndicators.map((i) => i.toJson()).toList(),
        'studentProfiles': studentProfiles.map((p) => p.toJson()).toList(),
        'lastUpdated': lastUpdated.toIso8601String(),
      };
}

/// Summary of trending risk patterns across class
@immutable
class TrendingSummary {
  const TrendingSummary({
    required this.improving,
    required this.worsening,
    required this.stable,
    required this.emergingPatterns,
  });

  final int improving;
  final int worsening;
  final int stable;
  final List<String> emergingPatterns;

  int get total => improving + worsening + stable;

  factory TrendingSummary.fromJson(Map<String, dynamic> json) {
    return TrendingSummary(
      improving: json['improving'] as int? ?? 0,
      worsening: json['worsening'] as int? ?? 0,
      stable: json['stable'] as int? ?? 0,
      emergingPatterns: List<String>.from(
        json['emergingPatterns'] as List<dynamic>? ??
        json['emerging_patterns'] as List<dynamic>? ?? [],
      ),
    );
  }

  Map<String, dynamic> toJson() => {
        'improving': improving,
        'worsening': worsening,
        'stable': stable,
        'emergingPatterns': emergingPatterns,
      };
}
