/// Monitoring Models
///
/// Models for real-time engagement heatmap and SEL observation.
library;

import 'package:flutter/foundation.dart';

/// SEL competency areas
enum SELCompetency {
  selfAwareness('SELF_AWARENESS'),
  selfManagement('SELF_MANAGEMENT'),
  socialAwareness('SOCIAL_AWARENESS'),
  relationshipSkills('RELATIONSHIP_SKILLS'),
  responsibleDecisionMaking('RESPONSIBLE_DECISION_MAKING');

  const SELCompetency(this.value);
  final String value;

  static SELCompetency fromString(String value) {
    return SELCompetency.values.firstWhere(
      (c) => c.value == value.toUpperCase(),
      orElse: () => SELCompetency.selfAwareness,
    );
  }

  String get label {
    switch (this) {
      case SELCompetency.selfAwareness:
        return 'Self-Awareness';
      case SELCompetency.selfManagement:
        return 'Self-Management';
      case SELCompetency.socialAwareness:
        return 'Social Awareness';
      case SELCompetency.relationshipSkills:
        return 'Relationship Skills';
      case SELCompetency.responsibleDecisionMaking:
        return 'Responsible Decision-Making';
    }
  }

  String get shortLabel {
    switch (this) {
      case SELCompetency.selfAwareness:
        return 'Self-Aware';
      case SELCompetency.selfManagement:
        return 'Self-Mgmt';
      case SELCompetency.socialAwareness:
        return 'Social';
      case SELCompetency.relationshipSkills:
        return 'Relationship';
      case SELCompetency.responsibleDecisionMaking:
        return 'Decision';
    }
  }
}

/// Observation types
enum ObservationType {
  positive('POSITIVE'),
  needsSupport('NEEDS_SUPPORT'),
  concern('CONCERN'),
  neutral('NEUTRAL');

  const ObservationType(this.value);
  final String value;

  static ObservationType fromString(String value) {
    return ObservationType.values.firstWhere(
      (t) => t.value == value.toUpperCase(),
      orElse: () => ObservationType.neutral,
    );
  }
}

/// Heat level for engagement
enum HeatLevel {
  cold('COLD'),
  cool('COOL'),
  warm('WARM'),
  hot('HOT'),
  onFire('ON_FIRE');

  const HeatLevel(this.value);
  final String value;

  static HeatLevel fromString(String value) {
    return HeatLevel.values.firstWhere(
      (l) => l.value == value.toUpperCase(),
      orElse: () => HeatLevel.warm,
    );
  }

  double get numericValue {
    switch (this) {
      case HeatLevel.cold:
        return 0.2;
      case HeatLevel.cool:
        return 0.4;
      case HeatLevel.warm:
        return 0.6;
      case HeatLevel.hot:
        return 0.8;
      case HeatLevel.onFire:
        return 1.0;
    }
  }
}

/// Activity status for student
enum ActivityStatus {
  active('ACTIVE'),
  idle('IDLE'),
  offline('OFFLINE'),
  struggling('STRUGGLING'),
  excelling('EXCELLING');

  const ActivityStatus(this.value);
  final String value;

  static ActivityStatus fromString(String value) {
    return ActivityStatus.values.firstWhere(
      (s) => s.value == value.toUpperCase(),
      orElse: () => ActivityStatus.offline,
    );
  }
}

/// Real-time student activity data
@immutable
class StudentActivity {
  const StudentActivity({
    required this.studentId,
    required this.studentName,
    required this.status,
    required this.heatLevel,
    this.currentActivity,
    this.currentSubject,
    this.timeOnTask,
    this.idleTime,
    this.lastAction,
    this.progressToday = 0,
    this.engagementScore = 0,
    this.flags = const [],
  });

  final String studentId;
  final String studentName;
  final ActivityStatus status;
  final HeatLevel heatLevel;
  final String? currentActivity;
  final String? currentSubject;
  final Duration? timeOnTask;
  final Duration? idleTime;
  final DateTime? lastAction;
  final double progressToday;
  final double engagementScore;
  final List<String> flags;

  bool get needsAttention =>
      status == ActivityStatus.struggling ||
      status == ActivityStatus.idle ||
      heatLevel == HeatLevel.cold;

  factory StudentActivity.fromJson(Map<String, dynamic> json) {
    return StudentActivity(
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      status: ActivityStatus.fromString(json['status'] as String? ?? 'OFFLINE'),
      heatLevel: HeatLevel.fromString(json['heatLevel'] as String? ?? 'WARM'),
      currentActivity: json['currentActivity'] as String?,
      currentSubject: json['currentSubject'] as String?,
      timeOnTask: json['timeOnTask'] != null
          ? Duration(seconds: json['timeOnTask'] as int)
          : null,
      idleTime: json['idleTime'] != null
          ? Duration(seconds: json['idleTime'] as int)
          : null,
      lastAction: json['lastAction'] != null
          ? DateTime.parse(json['lastAction'] as String)
          : null,
      progressToday: (json['progressToday'] as num?)?.toDouble() ?? 0,
      engagementScore: (json['engagementScore'] as num?)?.toDouble() ?? 0,
      flags: (json['flags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'studentName': studentName,
      'status': status.value,
      'heatLevel': heatLevel.value,
      if (currentActivity != null) 'currentActivity': currentActivity,
      if (currentSubject != null) 'currentSubject': currentSubject,
      if (timeOnTask != null) 'timeOnTask': timeOnTask!.inSeconds,
      if (idleTime != null) 'idleTime': idleTime!.inSeconds,
      if (lastAction != null) 'lastAction': lastAction!.toIso8601String(),
      'progressToday': progressToday,
      'engagementScore': engagementScore,
      'flags': flags,
    };
  }
}

/// Class-wide heatmap data
@immutable
class EngagementHeatmap {
  const EngagementHeatmap({
    required this.classId,
    required this.timestamp,
    required this.students,
    required this.overallHeat,
    this.activeCount = 0,
    this.idleCount = 0,
    this.offlineCount = 0,
    this.alertCount = 0,
    this.subjectBreakdown = const {},
  });

  final String classId;
  final DateTime timestamp;
  final List<StudentActivity> students;
  final HeatLevel overallHeat;
  final int activeCount;
  final int idleCount;
  final int offlineCount;
  final int alertCount;
  final Map<String, HeatLevel> subjectBreakdown;

  int get totalStudents => students.length;

  double get engagementPercentage =>
      totalStudents > 0 ? (activeCount / totalStudents * 100) : 0;

  List<StudentActivity> get needsAttention =>
      students.where((s) => s.needsAttention).toList();

  factory EngagementHeatmap.fromJson(Map<String, dynamic> json) {
    return EngagementHeatmap(
      classId: json['classId'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      students: (json['students'] as List<dynamic>)
          .map((e) => StudentActivity.fromJson(e as Map<String, dynamic>))
          .toList(),
      overallHeat: HeatLevel.fromString(json['overallHeat'] as String? ?? 'WARM'),
      activeCount: json['activeCount'] as int? ?? 0,
      idleCount: json['idleCount'] as int? ?? 0,
      offlineCount: json['offlineCount'] as int? ?? 0,
      alertCount: json['alertCount'] as int? ?? 0,
      subjectBreakdown: (json['subjectBreakdown'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, HeatLevel.fromString(v as String)),
          ) ??
          {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'classId': classId,
      'timestamp': timestamp.toIso8601String(),
      'students': students.map((s) => s.toJson()).toList(),
      'overallHeat': overallHeat.value,
      'activeCount': activeCount,
      'idleCount': idleCount,
      'offlineCount': offlineCount,
      'alertCount': alertCount,
      'subjectBreakdown': subjectBreakdown.map((k, v) => MapEntry(k, v.value)),
    };
  }
}

/// SEL observation record
@immutable
class SELObservation {
  const SELObservation({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.competency,
    required this.type,
    required this.timestamp,
    this.description,
    this.behaviorIndicator,
    this.context,
    this.followUpNeeded = false,
    this.private = false,
    this.tags = const [],
  });

  final String id;
  final String studentId;
  final String studentName;
  final SELCompetency competency;
  final ObservationType type;
  final DateTime timestamp;
  final String? description;
  final String? behaviorIndicator;
  final String? context;
  final bool followUpNeeded;
  final bool private;
  final List<String> tags;

  factory SELObservation.fromJson(Map<String, dynamic> json) {
    return SELObservation(
      id: json['id'] as String,
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      competency: SELCompetency.fromString(json['competency'] as String? ?? 'SELF_AWARENESS'),
      type: ObservationType.fromString(json['type'] as String? ?? 'NEUTRAL'),
      timestamp: DateTime.parse(json['timestamp'] as String),
      description: json['description'] as String?,
      behaviorIndicator: json['behaviorIndicator'] as String?,
      context: json['context'] as String?,
      followUpNeeded: json['followUpNeeded'] as bool? ?? false,
      private: json['private'] as bool? ?? false,
      tags: (json['tags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'studentId': studentId,
      'studentName': studentName,
      'competency': competency.value,
      'type': type.value,
      'timestamp': timestamp.toIso8601String(),
      if (description != null) 'description': description,
      if (behaviorIndicator != null) 'behaviorIndicator': behaviorIndicator,
      if (context != null) 'context': context,
      'followUpNeeded': followUpNeeded,
      'private': private,
      'tags': tags,
    };
  }
}

/// SEL summary for a student
@immutable
class SELSummary {
  const SELSummary({
    required this.studentId,
    required this.studentName,
    required this.scores,
    this.recentObservations = const [],
    this.strengths = const [],
    this.areasForGrowth = const [],
    this.overallScore,
    this.trend,
  });

  final String studentId;
  final String studentName;
  final Map<SELCompetency, double> scores;
  final List<SELObservation> recentObservations;
  final List<String> strengths;
  final List<String> areasForGrowth;
  final double? overallScore;
  final String? trend;

  factory SELSummary.fromJson(Map<String, dynamic> json) {
    return SELSummary(
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      scores: (json['scores'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(SELCompetency.fromString(k), (v as num).toDouble()),
          ) ??
          {},
      recentObservations: (json['recentObservations'] as List<dynamic>?)
              ?.map((e) => SELObservation.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      strengths: (json['strengths'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      areasForGrowth: (json['areasForGrowth'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      overallScore: (json['overallScore'] as num?)?.toDouble(),
      trend: json['trend'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'studentName': studentName,
      'scores': scores.map((k, v) => MapEntry(k.value, v)),
      'recentObservations': recentObservations.map((o) => o.toJson()).toList(),
      'strengths': strengths,
      'areasForGrowth': areasForGrowth,
      if (overallScore != null) 'overallScore': overallScore,
      if (trend != null) 'trend': trend,
    };
  }
}

/// Quick observation preset
@immutable
class ObservationPreset {
  const ObservationPreset({
    required this.id,
    required this.label,
    required this.competency,
    required this.type,
    this.description,
    this.icon,
  });

  final String id;
  final String label;
  final SELCompetency competency;
  final ObservationType type;
  final String? description;
  final String? icon;

  factory ObservationPreset.fromJson(Map<String, dynamic> json) {
    return ObservationPreset(
      id: json['id'] as String,
      label: json['label'] as String,
      competency: SELCompetency.fromString(json['competency'] as String),
      type: ObservationType.fromString(json['type'] as String),
      description: json['description'] as String?,
      icon: json['icon'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      'competency': competency.value,
      'type': type.value,
      if (description != null) 'description': description,
      if (icon != null) 'icon': icon,
    };
  }
}
