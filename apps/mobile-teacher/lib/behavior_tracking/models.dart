/// Behavior Tracking Models
///
/// Data models for behavior incidents, patterns, interventions, and reports.
library;

/// Behavior type classification.
enum BehaviorType {
  physical,
  verbal,
  disruptive,
  noncompliance,
  offtask,
  social,
  selfHarm,
  other,
}

/// Behavior severity level.
enum BehaviorSeverity {
  low,
  medium,
  high,
  crisis,
}

/// Intervention status.
enum InterventionStatus {
  planned,
  active,
  onHold,
  completed,
  discontinued,
}

/// Behavior incident record.
class BehaviorIncident {
  const BehaviorIncident({
    this.id,
    required this.studentId,
    required this.teacherId,
    required this.date,
    required this.time,
    required this.type,
    required this.severity,
    required this.description,
    this.location,
    this.duration,
    this.antecedent,
    this.consequence,
    this.witnesses = const [],
    this.interventionsUsed = const [],
    this.followUpRequired = false,
    this.parentNotified = false,
    this.adminNotified = false,
    this.attachments = const [],
    this.createdAt,
    this.updatedAt,
  });

  final String? id;
  final String studentId;
  final String teacherId;
  final DateTime date;
  final String time;
  final BehaviorType type;
  final BehaviorSeverity severity;
  final String description;
  final String? location;
  final int? duration; // in minutes
  final String? antecedent;
  final String? consequence;
  final List<String> witnesses;
  final List<String> interventionsUsed;
  final bool followUpRequired;
  final bool parentNotified;
  final bool adminNotified;
  final List<String> attachments;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory BehaviorIncident.fromJson(Map<String, dynamic> json) {
    return BehaviorIncident(
      id: json['id'] as String?,
      studentId: json['studentId'] as String,
      teacherId: json['teacherId'] as String,
      date: DateTime.parse(json['date'] as String),
      time: json['time'] as String,
      type: BehaviorType.values.byName(json['type'] as String),
      severity: BehaviorSeverity.values.byName(json['severity'] as String),
      description: json['description'] as String,
      location: json['location'] as String?,
      duration: json['duration'] as int?,
      antecedent: json['antecedent'] as String?,
      consequence: json['consequence'] as String?,
      witnesses: (json['witnesses'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      interventionsUsed: (json['interventionsUsed'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      followUpRequired: json['followUpRequired'] as bool? ?? false,
      parentNotified: json['parentNotified'] as bool? ?? false,
      adminNotified: json['adminNotified'] as bool? ?? false,
      attachments: (json['attachments'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'studentId': studentId,
      'teacherId': teacherId,
      'date': date.toIso8601String(),
      'time': time,
      'type': type.name,
      'severity': severity.name,
      'description': description,
      if (location != null) 'location': location,
      if (duration != null) 'duration': duration,
      if (antecedent != null) 'antecedent': antecedent,
      if (consequence != null) 'consequence': consequence,
      'witnesses': witnesses,
      'interventionsUsed': interventionsUsed,
      'followUpRequired': followUpRequired,
      'parentNotified': parentNotified,
      'adminNotified': adminNotified,
      'attachments': attachments,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }

  BehaviorIncident copyWith({
    String? id,
    String? studentId,
    String? teacherId,
    DateTime? date,
    String? time,
    BehaviorType? type,
    BehaviorSeverity? severity,
    String? description,
    String? location,
    int? duration,
    String? antecedent,
    String? consequence,
    List<String>? witnesses,
    List<String>? interventionsUsed,
    bool? followUpRequired,
    bool? parentNotified,
    bool? adminNotified,
    List<String>? attachments,
  }) {
    return BehaviorIncident(
      id: id ?? this.id,
      studentId: studentId ?? this.studentId,
      teacherId: teacherId ?? this.teacherId,
      date: date ?? this.date,
      time: time ?? this.time,
      type: type ?? this.type,
      severity: severity ?? this.severity,
      description: description ?? this.description,
      location: location ?? this.location,
      duration: duration ?? this.duration,
      antecedent: antecedent ?? this.antecedent,
      consequence: consequence ?? this.consequence,
      witnesses: witnesses ?? this.witnesses,
      interventionsUsed: interventionsUsed ?? this.interventionsUsed,
      followUpRequired: followUpRequired ?? this.followUpRequired,
      parentNotified: parentNotified ?? this.parentNotified,
      adminNotified: adminNotified ?? this.adminNotified,
      attachments: attachments ?? this.attachments,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
    );
  }
}

/// Behavior pattern analysis.
class BehaviorPattern {
  const BehaviorPattern({
    required this.studentId,
    required this.startDate,
    required this.endDate,
    required this.totalIncidents,
    required this.incidentsByType,
    required this.incidentsBySeverity,
    required this.commonTriggers,
    required this.peakTimes,
    required this.peakLocations,
    required this.effectiveness,
    required this.recommendations,
  });

  final String studentId;
  final DateTime startDate;
  final DateTime endDate;
  final int totalIncidents;
  final Map<BehaviorType, int> incidentsByType;
  final Map<BehaviorSeverity, int> incidentsBySeverity;
  final List<String> commonTriggers;
  final List<String> peakTimes;
  final List<String> peakLocations;
  final Map<String, double> effectiveness; // intervention -> effectiveness %
  final List<String> recommendations;

  factory BehaviorPattern.fromJson(Map<String, dynamic> json) {
    return BehaviorPattern(
      studentId: json['studentId'] as String,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      totalIncidents: json['totalIncidents'] as int,
      incidentsByType: (json['incidentsByType'] as Map<String, dynamic>).map(
        (k, v) => MapEntry(BehaviorType.values.byName(k), v as int),
      ),
      incidentsBySeverity:
          (json['incidentsBySeverity'] as Map<String, dynamic>).map(
        (k, v) => MapEntry(BehaviorSeverity.values.byName(k), v as int),
      ),
      commonTriggers: (json['commonTriggers'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      peakTimes:
          (json['peakTimes'] as List<dynamic>).map((e) => e as String).toList(),
      peakLocations: (json['peakLocations'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      effectiveness: (json['effectiveness'] as Map<String, dynamic>).map(
        (k, v) => MapEntry(k, (v as num).toDouble()),
      ),
      recommendations: (json['recommendations'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );
  }
}

/// Behavior trend data point.
class BehaviorTrend {
  const BehaviorTrend({
    required this.date,
    required this.incidentCount,
    required this.averageSeverity,
    required this.typeBreakdown,
  });

  final DateTime date;
  final int incidentCount;
  final double averageSeverity;
  final Map<BehaviorType, int> typeBreakdown;

  factory BehaviorTrend.fromJson(Map<String, dynamic> json) {
    return BehaviorTrend(
      date: DateTime.parse(json['date'] as String),
      incidentCount: json['incidentCount'] as int,
      averageSeverity: (json['averageSeverity'] as num).toDouble(),
      typeBreakdown: (json['typeBreakdown'] as Map<String, dynamic>).map(
        (k, v) => MapEntry(BehaviorType.values.byName(k), v as int),
      ),
    );
  }
}

/// Behavior intervention strategy.
class BehaviorIntervention {
  const BehaviorIntervention({
    this.id,
    required this.studentId,
    required this.teacherId,
    required this.targetBehavior,
    required this.strategy,
    required this.description,
    required this.implementation,
    required this.status,
    this.startDate,
    this.endDate,
    this.frequency,
    this.successCriteria,
    this.dataCollection,
    this.effectivenessRating,
    this.notes,
    this.createdAt,
    this.updatedAt,
  });

  final String? id;
  final String studentId;
  final String teacherId;
  final String targetBehavior;
  final String strategy;
  final String description;
  final String implementation;
  final InterventionStatus status;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? frequency;
  final String? successCriteria;
  final String? dataCollection;
  final int? effectivenessRating; // 1-5
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory BehaviorIntervention.fromJson(Map<String, dynamic> json) {
    return BehaviorIntervention(
      id: json['id'] as String?,
      studentId: json['studentId'] as String,
      teacherId: json['teacherId'] as String,
      targetBehavior: json['targetBehavior'] as String,
      strategy: json['strategy'] as String,
      description: json['description'] as String,
      implementation: json['implementation'] as String,
      status: InterventionStatus.values.byName(json['status'] as String),
      startDate: json['startDate'] != null
          ? DateTime.parse(json['startDate'] as String)
          : null,
      endDate: json['endDate'] != null
          ? DateTime.parse(json['endDate'] as String)
          : null,
      frequency: json['frequency'] as String?,
      successCriteria: json['successCriteria'] as String?,
      dataCollection: json['dataCollection'] as String?,
      effectivenessRating: json['effectivenessRating'] as int?,
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'studentId': studentId,
      'teacherId': teacherId,
      'targetBehavior': targetBehavior,
      'strategy': strategy,
      'description': description,
      'implementation': implementation,
      'status': status.name,
      if (startDate != null) 'startDate': startDate!.toIso8601String(),
      if (endDate != null) 'endDate': endDate!.toIso8601String(),
      if (frequency != null) 'frequency': frequency,
      if (successCriteria != null) 'successCriteria': successCriteria,
      if (dataCollection != null) 'dataCollection': dataCollection,
      if (effectivenessRating != null)
        'effectivenessRating': effectivenessRating,
      if (notes != null) 'notes': notes,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }

  BehaviorIntervention copyWith({
    String? id,
    InterventionStatus? status,
    DateTime? endDate,
    int? effectivenessRating,
    String? notes,
  }) {
    return BehaviorIntervention(
      id: id ?? this.id,
      studentId: studentId,
      teacherId: teacherId,
      targetBehavior: targetBehavior,
      strategy: strategy,
      description: description,
      implementation: implementation,
      status: status ?? this.status,
      startDate: startDate,
      endDate: endDate ?? this.endDate,
      frequency: frequency,
      successCriteria: successCriteria,
      dataCollection: dataCollection,
      effectivenessRating: effectivenessRating ?? this.effectivenessRating,
      notes: notes ?? this.notes,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
    );
  }
}

/// Intervention implementation log.
class InterventionLog {
  const InterventionLog({
    required this.id,
    required this.interventionId,
    required this.studentId,
    required this.date,
    required this.implemented,
    required this.effectiveness,
    this.notes,
    required this.recordedBy,
    required this.createdAt,
  });

  final String id;
  final String interventionId;
  final String studentId;
  final DateTime date;
  final bool implemented;
  final int effectiveness; // 1-5
  final String? notes;
  final String recordedBy;
  final DateTime createdAt;

  factory InterventionLog.fromJson(Map<String, dynamic> json) {
    return InterventionLog(
      id: json['id'] as String,
      interventionId: json['interventionId'] as String,
      studentId: json['studentId'] as String,
      date: DateTime.parse(json['date'] as String),
      implemented: json['implemented'] as bool,
      effectiveness: json['effectiveness'] as int,
      notes: json['notes'] as String?,
      recordedBy: json['recordedBy'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

/// Intervention template.
class InterventionTemplate {
  const InterventionTemplate({
    required this.id,
    required this.name,
    required this.category,
    required this.targetBehaviors,
    required this.strategy,
    required this.description,
    required this.implementation,
    required this.frequency,
    required this.successCriteria,
    required this.dataCollection,
    required this.evidenceBased,
    this.resources,
  });

  final String id;
  final String name;
  final String category;
  final List<BehaviorType> targetBehaviors;
  final String strategy;
  final String description;
  final String implementation;
  final String frequency;
  final String successCriteria;
  final String dataCollection;
  final bool evidenceBased;
  final List<String>? resources;

  factory InterventionTemplate.fromJson(Map<String, dynamic> json) {
    return InterventionTemplate(
      id: json['id'] as String,
      name: json['name'] as String,
      category: json['category'] as String,
      targetBehaviors: (json['targetBehaviors'] as List<dynamic>)
          .map((e) => BehaviorType.values.byName(e as String))
          .toList(),
      strategy: json['strategy'] as String,
      description: json['description'] as String,
      implementation: json['implementation'] as String,
      frequency: json['frequency'] as String,
      successCriteria: json['successCriteria'] as String,
      dataCollection: json['dataCollection'] as String,
      evidenceBased: json['evidenceBased'] as bool,
      resources: (json['resources'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
    );
  }
}

/// Behavior report summary.
class BehaviorReport {
  const BehaviorReport({
    required this.studentId,
    required this.startDate,
    required this.endDate,
    required this.summary,
    required this.incidents,
    this.pattern,
    required this.activeInterventions,
    required this.recommendations,
    required this.generatedAt,
  });

  final String studentId;
  final DateTime startDate;
  final DateTime endDate;
  final BehaviorReportSummary summary;
  final List<BehaviorIncident> incidents;
  final BehaviorPattern? pattern;
  final List<BehaviorIntervention> activeInterventions;
  final List<String> recommendations;
  final DateTime generatedAt;

  factory BehaviorReport.fromJson(Map<String, dynamic> json) {
    return BehaviorReport(
      studentId: json['studentId'] as String,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      summary: BehaviorReportSummary.fromJson(
          json['summary'] as Map<String, dynamic>),
      incidents: (json['incidents'] as List<dynamic>)
          .map((e) => BehaviorIncident.fromJson(e as Map<String, dynamic>))
          .toList(),
      pattern: json['pattern'] != null
          ? BehaviorPattern.fromJson(json['pattern'] as Map<String, dynamic>)
          : null,
      activeInterventions: (json['activeInterventions'] as List<dynamic>)
          .map((e) => BehaviorIntervention.fromJson(e as Map<String, dynamic>))
          .toList(),
      recommendations: (json['recommendations'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      generatedAt: DateTime.parse(json['generatedAt'] as String),
    );
  }
}

/// Behavior report summary statistics.
class BehaviorReportSummary {
  const BehaviorReportSummary({
    required this.totalIncidents,
    required this.averagePerDay,
    required this.mostCommonType,
    required this.mostCommonSeverity,
    required this.improvementRate,
    required this.interventionCompliance,
  });

  final int totalIncidents;
  final double averagePerDay;
  final BehaviorType mostCommonType;
  final BehaviorSeverity mostCommonSeverity;
  final double improvementRate; // percentage
  final double interventionCompliance; // percentage

  factory BehaviorReportSummary.fromJson(Map<String, dynamic> json) {
    return BehaviorReportSummary(
      totalIncidents: json['totalIncidents'] as int,
      averagePerDay: (json['averagePerDay'] as num).toDouble(),
      mostCommonType:
          BehaviorType.values.byName(json['mostCommonType'] as String),
      mostCommonSeverity:
          BehaviorSeverity.values.byName(json['mostCommonSeverity'] as String),
      improvementRate: (json['improvementRate'] as num).toDouble(),
      interventionCompliance:
          (json['interventionCompliance'] as num).toDouble(),
    );
  }
}
