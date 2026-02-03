/// Intervention management models for teacher workflow
/// Extends risk_prediction.dart InterventionRecommendation with teacher actions
library;

import 'package:flutter/foundation.dart';

/// Category of intervention
enum InterventionCategory {
  academic('Academic'),
  behavioral('Behavioral'),
  social('Social-Emotional'),
  attendance('Attendance'),
  engagement('Engagement'),
  other('Other');

  const InterventionCategory(this.label);
  final String label;

  static InterventionCategory fromString(String value) {
    return InterventionCategory.values.firstWhere(
      (cat) => cat.name == value.toLowerCase() || cat.label.toLowerCase() == value.toLowerCase(),
      orElse: () => InterventionCategory.other,
    );
  }
}

/// Status of intervention implementation
enum InterventionStatus {
  suggested('Suggested'),
  planned('Planned'),
  inProgress('In Progress'),
  completed('Completed'),
  dismissed('Dismissed'),
  onHold('On Hold');

  const InterventionStatus(this.label);
  final String label;

  static InterventionStatus fromString(String value) {
    return InterventionStatus.values.firstWhere(
      (status) => status.name == value.toLowerCase() || 
                  status.label.toLowerCase() == value.toLowerCase(),
      orElse: () => InterventionStatus.suggested,
    );
  }

  /// Whether this status represents an active intervention
  bool get isActive => this == InterventionStatus.inProgress || this == InterventionStatus.planned;

  /// Whether this status represents a completed state
  bool get isComplete => this == InterventionStatus.completed || this == InterventionStatus.dismissed;
}

/// Priority level for interventions
enum InterventionPriority {
  low('Low'),
  medium('Medium'),
  high('High'),
  urgent('Urgent');

  const InterventionPriority(this.label);
  final String label;

  static InterventionPriority fromString(String value) {
    return InterventionPriority.values.firstWhere(
      (priority) => priority.name == value.toLowerCase(),
      orElse: () => InterventionPriority.medium,
    );
  }

  int get priorityValue {
    switch (this) {
      case InterventionPriority.low:
        return 1;
      case InterventionPriority.medium:
        return 2;
      case InterventionPriority.high:
        return 3;
      case InterventionPriority.urgent:
        return 4;
    }
  }
}

/// Type of intervention delivery
enum InterventionType {
  oneOnOne('One-on-One'),
  smallGroup('Small Group'),
  wholeClass('Whole Class'),
  parentContact('Parent Contact'),
  referral('Referral'),
  accommodation('Accommodation'),
  other('Other');

  const InterventionType(this.label);
  final String label;

  static InterventionType fromString(String value) {
    return InterventionType.values.firstWhere(
      (type) => type.name == value.toLowerCase(),
      orElse: () => InterventionType.other,
    );
  }
}

/// Teacher-managed intervention instance
@immutable
class Intervention {
  const Intervention({
    required this.id,
    required this.studentId,
    required this.title,
    required this.description,
    required this.category,
    required this.type,
    required this.priority,
    required this.status,
    required this.targetRiskFactors,
    required this.createdAt,
    required this.createdBy,
    this.startDate,
    this.endDate,
    this.estimatedDurationDays,
    this.notes,
    this.customInstructions,
    this.relatedRecommendationId,
    this.parentNotified = false,
    this.outcomeId,
    this.lastUpdated,
    this.completedAt,
  });

  final String id;
  final String studentId;
  final String title;
  final String description;
  final InterventionCategory category;
  final InterventionType type;
  final InterventionPriority priority;
  final InterventionStatus status;
  final List<String> targetRiskFactors;
  final DateTime createdAt;
  final String createdBy; // Teacher ID
  final DateTime? startDate;
  final DateTime? endDate;
  final int? estimatedDurationDays;
  final String? notes;
  final String? customInstructions;
  final String? relatedRecommendationId; // Links to InterventionRecommendation from risk system
  final bool parentNotified;
  final String? outcomeId;
  final DateTime? lastUpdated;
  final DateTime? completedAt;

  /// Whether intervention is currently active
  bool get isActive => status.isActive;

  /// Whether intervention is complete
  bool get isComplete => status.isComplete;

  /// Days since intervention started
  int? get daysSinceStart {
    if (startDate == null) return null;
    return DateTime.now().difference(startDate!).inDays;
  }

  /// Days until end date
  int? get daysUntilEnd {
    if (endDate == null) return null;
    final diff = endDate!.difference(DateTime.now()).inDays;
    return diff > 0 ? diff : 0;
  }

  /// Whether intervention is overdue
  bool get isOverdue {
    if (endDate == null || isComplete) return false;
    return DateTime.now().isAfter(endDate!);
  }

  factory Intervention.fromJson(Map<String, dynamic> json) {
    return Intervention(
      id: json['id'] as String? ?? '',
      studentId: json['studentId'] as String? ?? json['student_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      category: InterventionCategory.fromString(json['category'] as String? ?? 'other'),
      type: InterventionType.fromString(json['type'] as String? ?? 'other'),
      priority: InterventionPriority.fromString(json['priority'] as String? ?? 'medium'),
      status: InterventionStatus.fromString(json['status'] as String? ?? 'suggested'),
      targetRiskFactors: List<String>.from(
        json['targetRiskFactors'] as List<dynamic>? ??
        json['target_risk_factors'] as List<dynamic>? ?? [],
      ),
      createdAt: DateTime.tryParse(json['createdAt'] as String? ??
                                   json['created_at'] as String? ?? '') ?? DateTime.now(),
      createdBy: json['createdBy'] as String? ?? json['created_by'] as String? ?? '',
      startDate: json['startDate'] != null
          ? DateTime.tryParse(json['startDate'] as String)
          : json['start_date'] != null
              ? DateTime.tryParse(json['start_date'] as String)
              : null,
      endDate: json['endDate'] != null
          ? DateTime.tryParse(json['endDate'] as String)
          : json['end_date'] != null
              ? DateTime.tryParse(json['end_date'] as String)
              : null,
      estimatedDurationDays: json['estimatedDurationDays'] as int? ??
                            json['estimated_duration_days'] as int?,
      notes: json['notes'] as String?,
      customInstructions: json['customInstructions'] as String? ??
                         json['custom_instructions'] as String?,
      relatedRecommendationId: json['relatedRecommendationId'] as String? ??
                              json['related_recommendation_id'] as String?,
      parentNotified: json['parentNotified'] as bool? ??
                     json['parent_notified'] as bool? ?? false,
      outcomeId: json['outcomeId'] as String? ?? json['outcome_id'] as String?,
      lastUpdated: json['lastUpdated'] != null
          ? DateTime.tryParse(json['lastUpdated'] as String)
          : json['last_updated'] != null
              ? DateTime.tryParse(json['last_updated'] as String)
              : null,
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'] as String)
          : json['completed_at'] != null
              ? DateTime.tryParse(json['completed_at'] as String)
              : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'studentId': studentId,
        'title': title,
        'description': description,
        'category': category.name,
        'type': type.name,
        'priority': priority.name,
        'status': status.name,
        'targetRiskFactors': targetRiskFactors,
        'createdAt': createdAt.toIso8601String(),
        'createdBy': createdBy,
        if (startDate != null) 'startDate': startDate!.toIso8601String(),
        if (endDate != null) 'endDate': endDate!.toIso8601String(),
        if (estimatedDurationDays != null) 'estimatedDurationDays': estimatedDurationDays,
        if (notes != null) 'notes': notes,
        if (customInstructions != null) 'customInstructions': customInstructions,
        if (relatedRecommendationId != null) 'relatedRecommendationId': relatedRecommendationId,
        'parentNotified': parentNotified,
        if (outcomeId != null) 'outcomeId': outcomeId,
        if (lastUpdated != null) 'lastUpdated': lastUpdated!.toIso8601String(),
        if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
      };

  Intervention copyWith({
    String? id,
    String? studentId,
    String? title,
    String? description,
    InterventionCategory? category,
    InterventionType? type,
    InterventionPriority? priority,
    InterventionStatus? status,
    List<String>? targetRiskFactors,
    DateTime? createdAt,
    String? createdBy,
    DateTime? startDate,
    DateTime? endDate,
    int? estimatedDurationDays,
    String? notes,
    String? customInstructions,
    String? relatedRecommendationId,
    bool? parentNotified,
    String? outcomeId,
    DateTime? lastUpdated,
    DateTime? completedAt,
  }) {
    return Intervention(
      id: id ?? this.id,
      studentId: studentId ?? this.studentId,
      title: title ?? this.title,
      description: description ?? this.description,
      category: category ?? this.category,
      type: type ?? this.type,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      targetRiskFactors: targetRiskFactors ?? this.targetRiskFactors,
      createdAt: createdAt ?? this.createdAt,
      createdBy: createdBy ?? this.createdBy,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      estimatedDurationDays: estimatedDurationDays ?? this.estimatedDurationDays,
      notes: notes ?? this.notes,
      customInstructions: customInstructions ?? this.customInstructions,
      relatedRecommendationId: relatedRecommendationId ?? this.relatedRecommendationId,
      parentNotified: parentNotified ?? this.parentNotified,
      outcomeId: outcomeId ?? this.outcomeId,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      completedAt: completedAt ?? this.completedAt,
    );
  }
}

/// Outcome tracking for completed interventions
@immutable
class InterventionOutcome {
  const InterventionOutcome({
    required this.id,
    required this.interventionId,
    required this.studentId,
    required this.recordedAt,
    required this.recordedBy,
    required this.effectiveness,
    required this.impactOnRisk,
    this.observations,
    this.quantitativeMetrics,
    this.studentFeedback,
    this.parentFeedback,
    this.recommendContinuation,
    this.followUpActions,
  });

  final String id;
  final String interventionId;
  final String studentId;
  final DateTime recordedAt;
  final String recordedBy; // Teacher ID
  final InterventionEffectiveness effectiveness;
  final double impactOnRisk; // -1.0 to 1.0 (negative = risk increased, positive = risk decreased)
  final String? observations;
  final Map<String, dynamic>? quantitativeMetrics; // Custom metrics (e.g., attendance %, grade improvement)
  final String? studentFeedback;
  final String? parentFeedback;
  final bool? recommendContinuation;
  final List<String>? followUpActions;

  factory InterventionOutcome.fromJson(Map<String, dynamic> json) {
    return InterventionOutcome(
      id: json['id'] as String? ?? '',
      interventionId: json['interventionId'] as String? ?? json['intervention_id'] as String? ?? '',
      studentId: json['studentId'] as String? ?? json['student_id'] as String? ?? '',
      recordedAt: DateTime.tryParse(json['recordedAt'] as String? ??
                                    json['recorded_at'] as String? ?? '') ?? DateTime.now(),
      recordedBy: json['recordedBy'] as String? ?? json['recorded_by'] as String? ?? '',
      effectiveness: InterventionEffectiveness.fromString(
        json['effectiveness'] as String? ?? 'unknown',
      ),
      impactOnRisk: (json['impactOnRisk'] as num?)?.toDouble() ??
                    (json['impact_on_risk'] as num?)?.toDouble() ?? 0.0,
      observations: json['observations'] as String?,
      quantitativeMetrics: json['quantitativeMetrics'] as Map<String, dynamic>? ??
                          json['quantitative_metrics'] as Map<String, dynamic>?,
      studentFeedback: json['studentFeedback'] as String? ??
                      json['student_feedback'] as String?,
      parentFeedback: json['parentFeedback'] as String? ??
                     json['parent_feedback'] as String?,
      recommendContinuation: json['recommendContinuation'] as bool? ??
                            json['recommend_continuation'] as bool?,
      followUpActions: json['followUpActions'] != null
          ? List<String>.from(json['followUpActions'] as List<dynamic>)
          : json['follow_up_actions'] != null
              ? List<String>.from(json['follow_up_actions'] as List<dynamic>)
              : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'interventionId': interventionId,
        'studentId': studentId,
        'recordedAt': recordedAt.toIso8601String(),
        'recordedBy': recordedBy,
        'effectiveness': effectiveness.name,
        'impactOnRisk': impactOnRisk,
        if (observations != null) 'observations': observations,
        if (quantitativeMetrics != null) 'quantitativeMetrics': quantitativeMetrics,
        if (studentFeedback != null) 'studentFeedback': studentFeedback,
        if (parentFeedback != null) 'parentFeedback': parentFeedback,
        if (recommendContinuation != null) 'recommendContinuation': recommendContinuation,
        if (followUpActions != null) 'followUpActions': followUpActions,
      };
}

/// Effectiveness rating for intervention outcomes
enum InterventionEffectiveness {
  veryEffective('Very Effective'),
  effective('Effective'),
  somewhatEffective('Somewhat Effective'),
  notEffective('Not Effective'),
  unknown('Unknown');

  const InterventionEffectiveness(this.label);
  final String label;

  static InterventionEffectiveness fromString(String value) {
    return InterventionEffectiveness.values.firstWhere(
      (eff) => eff.name == value.toLowerCase(),
      orElse: () => InterventionEffectiveness.unknown,
    );
  }
}

/// Template for creating new interventions
@immutable
class InterventionTemplate {
  const InterventionTemplate({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.type,
    required this.applicableRiskFactors,
    this.estimatedDurationDays,
    this.implementationSteps,
    this.requiredResources,
    this.successIndicators,
  });

  final String id;
  final String title;
  final String description;
  final InterventionCategory category;
  final InterventionType type;
  final List<String> applicableRiskFactors;
  final int? estimatedDurationDays;
  final List<String>? implementationSteps;
  final List<String>? requiredResources;
  final List<String>? successIndicators;

  factory InterventionTemplate.fromJson(Map<String, dynamic> json) {
    return InterventionTemplate(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      category: InterventionCategory.fromString(json['category'] as String? ?? 'other'),
      type: InterventionType.fromString(json['type'] as String? ?? 'other'),
      applicableRiskFactors: List<String>.from(
        json['applicableRiskFactors'] as List<dynamic>? ??
        json['applicable_risk_factors'] as List<dynamic>? ?? [],
      ),
      estimatedDurationDays: json['estimatedDurationDays'] as int? ??
                            json['estimated_duration_days'] as int?,
      implementationSteps: json['implementationSteps'] != null
          ? List<String>.from(json['implementationSteps'] as List<dynamic>)
          : json['implementation_steps'] != null
              ? List<String>.from(json['implementation_steps'] as List<dynamic>)
              : null,
      requiredResources: json['requiredResources'] != null
          ? List<String>.from(json['requiredResources'] as List<dynamic>)
          : json['required_resources'] != null
              ? List<String>.from(json['required_resources'] as List<dynamic>)
              : null,
      successIndicators: json['successIndicators'] != null
          ? List<String>.from(json['successIndicators'] as List<dynamic>)
          : json['success_indicators'] != null
              ? List<String>.from(json['success_indicators'] as List<dynamic>)
              : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'category': category.name,
        'type': type.name,
        'applicableRiskFactors': applicableRiskFactors,
        if (estimatedDurationDays != null) 'estimatedDurationDays': estimatedDurationDays,
        if (implementationSteps != null) 'implementationSteps': implementationSteps,
        if (requiredResources != null) 'requiredResources': requiredResources,
        if (successIndicators != null) 'successIndicators': successIndicators,
      };

  /// Create an Intervention from this template
  Intervention toIntervention({
    required String studentId,
    required String teacherId,
    required InterventionPriority priority,
    List<String>? customTargetRiskFactors,
    String? customInstructions,
    String? relatedRecommendationId,
  }) {
    return Intervention(
      id: '', // Will be assigned by backend
      studentId: studentId,
      title: title,
      description: description,
      category: category,
      type: type,
      priority: priority,
      status: InterventionStatus.planned,
      targetRiskFactors: customTargetRiskFactors ?? applicableRiskFactors,
      createdAt: DateTime.now(),
      createdBy: teacherId,
      estimatedDurationDays: estimatedDurationDays,
      customInstructions: customInstructions,
      relatedRecommendationId: relatedRecommendationId,
    );
  }
}

/// AI-generated intervention suggestion with reasoning
@immutable
class InterventionSuggestion {
  const InterventionSuggestion({
    required this.template,
    required this.relevanceScore,
    required this.reasoning,
    required this.matchedRiskFactors,
    this.expectedEffectiveness,
    this.estimatedImpact,
    this.prerequisites,
    this.alternatives,
  });

  final InterventionTemplate template;
  final double relevanceScore; // 0-1
  final String reasoning; // AI-generated explanation
  final List<String> matchedRiskFactors;
  final double? expectedEffectiveness; // 0-1 based on historical data
  final double? estimatedImpact; // Expected risk reduction
  final List<String>? prerequisites; // What needs to be in place first
  final List<String>? alternatives; // Alternative intervention IDs

  /// Relevance as percentage
  int get relevancePercent => (relevanceScore * 100).round();

  factory InterventionSuggestion.fromJson(Map<String, dynamic> json) {
    return InterventionSuggestion(
      template: InterventionTemplate.fromJson(
        json['template'] as Map<String, dynamic>? ?? {},
      ),
      relevanceScore: (json['relevanceScore'] as num?)?.toDouble() ??
                      (json['relevance_score'] as num?)?.toDouble() ?? 0.0,
      reasoning: json['reasoning'] as String? ?? '',
      matchedRiskFactors: List<String>.from(
        json['matchedRiskFactors'] as List<dynamic>? ??
        json['matched_risk_factors'] as List<dynamic>? ?? [],
      ),
      expectedEffectiveness: (json['expectedEffectiveness'] as num?)?.toDouble() ??
                            (json['expected_effectiveness'] as num?)?.toDouble(),
      estimatedImpact: (json['estimatedImpact'] as num?)?.toDouble() ??
                      (json['estimated_impact'] as num?)?.toDouble(),
      prerequisites: json['prerequisites'] != null
          ? List<String>.from(json['prerequisites'] as List<dynamic>)
          : null,
      alternatives: json['alternatives'] != null
          ? List<String>.from(json['alternatives'] as List<dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'template': template.toJson(),
        'relevanceScore': relevanceScore,
        'reasoning': reasoning,
        'matchedRiskFactors': matchedRiskFactors,
        if (expectedEffectiveness != null) 'expectedEffectiveness': expectedEffectiveness,
        if (estimatedImpact != null) 'estimatedImpact': estimatedImpact,
        if (prerequisites != null) 'prerequisites': prerequisites,
        if (alternatives != null) 'alternatives': alternatives,
      };
}

/// Summary of intervention effectiveness for a student
@immutable
class InterventionHistory {
  const InterventionHistory({
    required this.studentId,
    required this.totalInterventions,
    required this.activeInterventions,
    required this.completedInterventions,
    required this.interventions,
    required this.outcomes,
    this.averageEffectiveness,
    this.totalRiskReduction,
  });

  final String studentId;
  final int totalInterventions;
  final int activeInterventions;
  final int completedInterventions;
  final List<Intervention> interventions;
  final List<InterventionOutcome> outcomes;
  final double? averageEffectiveness;
  final double? totalRiskReduction;

  factory InterventionHistory.fromJson(Map<String, dynamic> json) {
    return InterventionHistory(
      studentId: json['studentId'] as String? ?? json['student_id'] as String? ?? '',
      totalInterventions: json['totalInterventions'] as int? ??
                         json['total_interventions'] as int? ?? 0,
      activeInterventions: json['activeInterventions'] as int? ??
                          json['active_interventions'] as int? ?? 0,
      completedInterventions: json['completedInterventions'] as int? ??
                             json['completed_interventions'] as int? ?? 0,
      interventions: (json['interventions'] as List<dynamic>? ?? [])
          .map((i) => Intervention.fromJson(i as Map<String, dynamic>))
          .toList(),
      outcomes: (json['outcomes'] as List<dynamic>? ?? [])
          .map((o) => InterventionOutcome.fromJson(o as Map<String, dynamic>))
          .toList(),
      averageEffectiveness: (json['averageEffectiveness'] as num?)?.toDouble() ??
                           (json['average_effectiveness'] as num?)?.toDouble(),
      totalRiskReduction: (json['totalRiskReduction'] as num?)?.toDouble() ??
                         (json['total_risk_reduction'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'studentId': studentId,
        'totalInterventions': totalInterventions,
        'activeInterventions': activeInterventions,
        'completedInterventions': completedInterventions,
        'interventions': interventions.map((i) => i.toJson()).toList(),
        'outcomes': outcomes.map((o) => o.toJson()).toList(),
        if (averageEffectiveness != null) 'averageEffectiveness': averageEffectiveness,
        if (totalRiskReduction != null) 'totalRiskReduction': totalRiskReduction,
      };
}
