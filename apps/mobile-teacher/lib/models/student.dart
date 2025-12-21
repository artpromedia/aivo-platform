/// Student Model
///
/// Represents a student in the teacher's class.
library;

import 'package:flutter/foundation.dart';

/// Student status in the system.
enum StudentStatus {
  active,
  inactive,
  transferred,
}

/// A student in the teacher's class.
@immutable
class Student {
  const Student({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.classIds,
    this.avatarUrl,
    this.gradeLevel,
    this.dateOfBirth,
    this.status = StudentStatus.active,
    this.hasIep = false,
    this.has504 = false,
    this.parentEmails = const [],
    this.accommodations = const [],
    this.lastActiveAt,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String firstName;
  final String lastName;
  final String? email;
  final List<String> classIds;
  final String? avatarUrl;
  final int? gradeLevel;
  final DateTime? dateOfBirth;
  final StudentStatus status;
  final bool hasIep;
  final bool has504;
  final List<String> parentEmails;
  final List<String> accommodations;
  final DateTime? lastActiveAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  String get fullName => '$firstName $lastName';

  String get initials {
    final first = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final last = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return '$first$last';
  }

  factory Student.fromJson(Map<String, dynamic> json) {
    return Student(
      id: json['id'] as String,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      email: json['email'] as String?,
      classIds: (json['classIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      avatarUrl: json['avatarUrl'] as String?,
      gradeLevel: json['gradeLevel'] as int?,
      dateOfBirth: json['dateOfBirth'] != null
          ? DateTime.tryParse(json['dateOfBirth'] as String)
          : null,
      status: StudentStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => StudentStatus.active,
      ),
      hasIep: json['hasIep'] as bool? ?? false,
      has504: json['has504'] as bool? ?? false,
      parentEmails: (json['parentEmails'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      accommodations: (json['accommodations'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      lastActiveAt: json['lastActiveAt'] != null
          ? DateTime.tryParse(json['lastActiveAt'] as String)
          : null,
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
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'classIds': classIds,
      'avatarUrl': avatarUrl,
      'gradeLevel': gradeLevel,
      'dateOfBirth': dateOfBirth?.toIso8601String(),
      'status': status.name,
      'hasIep': hasIep,
      'has504': has504,
      'parentEmails': parentEmails,
      'accommodations': accommodations,
      'lastActiveAt': lastActiveAt?.toIso8601String(),
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  Student copyWith({
    String? id,
    String? firstName,
    String? lastName,
    String? email,
    List<String>? classIds,
    String? avatarUrl,
    int? gradeLevel,
    DateTime? dateOfBirth,
    StudentStatus? status,
    bool? hasIep,
    bool? has504,
    List<String>? parentEmails,
    List<String>? accommodations,
    DateTime? lastActiveAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Student(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      classIds: classIds ?? this.classIds,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      gradeLevel: gradeLevel ?? this.gradeLevel,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      status: status ?? this.status,
      hasIep: hasIep ?? this.hasIep,
      has504: has504 ?? this.has504,
      parentEmails: parentEmails ?? this.parentEmails,
      accommodations: accommodations ?? this.accommodations,
      lastActiveAt: lastActiveAt ?? this.lastActiveAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Student && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// DTO for updating a student.
class UpdateStudentDto {
  const UpdateStudentDto({
    this.firstName,
    this.lastName,
    this.gradeLevel,
    this.accommodations,
    this.hasIep,
    this.has504,
  });

  final String? firstName;
  final String? lastName;
  final int? gradeLevel;
  final List<String>? accommodations;
  final bool? hasIep;
  final bool? has504;

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
    if (firstName != null) json['firstName'] = firstName;
    if (lastName != null) json['lastName'] = lastName;
    if (gradeLevel != null) json['gradeLevel'] = gradeLevel;
    if (accommodations != null) json['accommodations'] = accommodations;
    if (hasIep != null) json['hasIep'] = hasIep;
    if (has504 != null) json['has504'] = has504;
    return json;
  }
}
