/// Class Group Model
///
/// Represents a class/group of students.
library;

import 'package:flutter/foundation.dart';

/// A class/group of students.
@immutable
class ClassGroup {
  const ClassGroup({
    required this.id,
    required this.name,
    required this.teacherId,
    this.subject,
    this.gradeLevel,
    this.period,
    this.room,
    this.studentCount = 0,
    this.studentIds = const [],
    this.schedule,
    this.activeSessionId,
    this.schoolYear,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final String teacherId;
  final String? subject;
  final int? gradeLevel;
  final String? period;
  final String? room;
  final int studentCount;
  final List<String> studentIds;
  final ClassSchedule? schedule;
  final String? activeSessionId;
  final String? schoolYear;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get hasActiveSession => activeSessionId != null;

  factory ClassGroup.fromJson(Map<String, dynamic> json) {
    return ClassGroup(
      id: json['id'] as String,
      name: json['name'] as String,
      teacherId: json['teacherId'] as String,
      subject: json['subject'] as String?,
      gradeLevel: json['gradeLevel'] as int?,
      period: json['period'] as String?,
      room: json['room'] as String?,
      studentCount: json['studentCount'] as int? ?? 0,
      studentIds: (json['studentIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      schedule: json['schedule'] != null
          ? ClassSchedule.fromJson(json['schedule'] as Map<String, dynamic>)
          : null,
      activeSessionId: json['activeSessionId'] as String?,
      schoolYear: json['schoolYear'] as String?,
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
      'name': name,
      'teacherId': teacherId,
      'subject': subject,
      'gradeLevel': gradeLevel,
      'period': period,
      'room': room,
      'studentCount': studentCount,
      'studentIds': studentIds,
      'schedule': schedule?.toJson(),
      'activeSessionId': activeSessionId,
      'schoolYear': schoolYear,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  ClassGroup copyWith({
    String? id,
    String? name,
    String? teacherId,
    String? subject,
    int? gradeLevel,
    String? period,
    String? room,
    int? studentCount,
    List<String>? studentIds,
    ClassSchedule? schedule,
    String? activeSessionId,
    String? schoolYear,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ClassGroup(
      id: id ?? this.id,
      name: name ?? this.name,
      teacherId: teacherId ?? this.teacherId,
      subject: subject ?? this.subject,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      period: period ?? this.period,
      room: room ?? this.room,
      studentCount: studentCount ?? this.studentCount,
      studentIds: studentIds ?? this.studentIds,
      schedule: schedule ?? this.schedule,
      activeSessionId: activeSessionId ?? this.activeSessionId,
      schoolYear: schoolYear ?? this.schoolYear,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClassGroup && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Class schedule.
@immutable
class ClassSchedule {
  const ClassSchedule({
    required this.daysOfWeek,
    required this.startTime,
    required this.endTime,
    this.timezone,
  });

  final List<int> daysOfWeek; // 1 = Monday, 7 = Sunday
  final String startTime; // HH:mm format
  final String endTime;
  final String? timezone;

  factory ClassSchedule.fromJson(Map<String, dynamic> json) {
    return ClassSchedule(
      daysOfWeek:
          (json['daysOfWeek'] as List<dynamic>).map((e) => e as int).toList(),
      startTime: json['startTime'] as String,
      endTime: json['endTime'] as String,
      timezone: json['timezone'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'daysOfWeek': daysOfWeek,
      'startTime': startTime,
      'endTime': endTime,
      'timezone': timezone,
    };
  }
}
