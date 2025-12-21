/// Teacher Profile Model
///
/// Represents the teacher's profile and preferences.
library;

import 'package:flutter/foundation.dart';

/// Teacher profile.
@immutable
class TeacherProfile {
  const TeacherProfile({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.displayName,
    this.avatarUrl,
    this.title,
    this.department,
    this.schoolId,
    this.schoolName,
    this.phoneNumber,
    this.preferences = const TeacherPreferences(),
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? displayName;
  final String? avatarUrl;
  final String? title;
  final String? department;
  final String? schoolId;
  final String? schoolName;
  final String? phoneNumber;
  final TeacherPreferences preferences;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  String get fullName => displayName ?? '$firstName $lastName';

  String get initials {
    final first = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final last = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return '$first$last';
  }

  factory TeacherProfile.fromJson(Map<String, dynamic> json) {
    return TeacherProfile(
      id: json['id'] as String,
      email: json['email'] as String,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      displayName: json['displayName'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      title: json['title'] as String?,
      department: json['department'] as String?,
      schoolId: json['schoolId'] as String?,
      schoolName: json['schoolName'] as String?,
      phoneNumber: json['phoneNumber'] as String?,
      preferences: json['preferences'] != null
          ? TeacherPreferences.fromJson(
              json['preferences'] as Map<String, dynamic>)
          : const TeacherPreferences(),
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
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'displayName': displayName,
      'avatarUrl': avatarUrl,
      'title': title,
      'department': department,
      'schoolId': schoolId,
      'schoolName': schoolName,
      'phoneNumber': phoneNumber,
      'preferences': preferences.toJson(),
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  TeacherProfile copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? displayName,
    String? avatarUrl,
    String? title,
    String? department,
    String? schoolId,
    String? schoolName,
    String? phoneNumber,
    TeacherPreferences? preferences,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return TeacherProfile(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      title: title ?? this.title,
      department: department ?? this.department,
      schoolId: schoolId ?? this.schoolId,
      schoolName: schoolName ?? this.schoolName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      preferences: preferences ?? this.preferences,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TeacherProfile &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Teacher preferences.
@immutable
class TeacherPreferences {
  const TeacherPreferences({
    this.notificationsEnabled = true,
    this.emailNotifications = true,
    this.pushNotifications = true,
    this.sessionReminders = true,
    this.reminderMinutesBefore = 15,
    this.parentMessageNotifications = true,
    this.studentAlertNotifications = true,
    this.iepDeadlineNotifications = true,
    this.defaultSessionDuration = 45,
    this.theme = 'system',
    this.language = 'en',
  });

  final bool notificationsEnabled;
  final bool emailNotifications;
  final bool pushNotifications;
  final bool sessionReminders;
  final int reminderMinutesBefore;
  final bool parentMessageNotifications;
  final bool studentAlertNotifications;
  final bool iepDeadlineNotifications;
  final int defaultSessionDuration;
  final String theme;
  final String language;

  factory TeacherPreferences.fromJson(Map<String, dynamic> json) {
    return TeacherPreferences(
      notificationsEnabled: json['notificationsEnabled'] as bool? ?? true,
      emailNotifications: json['emailNotifications'] as bool? ?? true,
      pushNotifications: json['pushNotifications'] as bool? ?? true,
      sessionReminders: json['sessionReminders'] as bool? ?? true,
      reminderMinutesBefore: json['reminderMinutesBefore'] as int? ?? 15,
      parentMessageNotifications:
          json['parentMessageNotifications'] as bool? ?? true,
      studentAlertNotifications:
          json['studentAlertNotifications'] as bool? ?? true,
      iepDeadlineNotifications:
          json['iepDeadlineNotifications'] as bool? ?? true,
      defaultSessionDuration: json['defaultSessionDuration'] as int? ?? 45,
      theme: json['theme'] as String? ?? 'system',
      language: json['language'] as String? ?? 'en',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'notificationsEnabled': notificationsEnabled,
      'emailNotifications': emailNotifications,
      'pushNotifications': pushNotifications,
      'sessionReminders': sessionReminders,
      'reminderMinutesBefore': reminderMinutesBefore,
      'parentMessageNotifications': parentMessageNotifications,
      'studentAlertNotifications': studentAlertNotifications,
      'iepDeadlineNotifications': iepDeadlineNotifications,
      'defaultSessionDuration': defaultSessionDuration,
      'theme': theme,
      'language': language,
    };
  }

  TeacherPreferences copyWith({
    bool? notificationsEnabled,
    bool? emailNotifications,
    bool? pushNotifications,
    bool? sessionReminders,
    int? reminderMinutesBefore,
    bool? parentMessageNotifications,
    bool? studentAlertNotifications,
    bool? iepDeadlineNotifications,
    int? defaultSessionDuration,
    String? theme,
    String? language,
  }) {
    return TeacherPreferences(
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
      emailNotifications: emailNotifications ?? this.emailNotifications,
      pushNotifications: pushNotifications ?? this.pushNotifications,
      sessionReminders: sessionReminders ?? this.sessionReminders,
      reminderMinutesBefore:
          reminderMinutesBefore ?? this.reminderMinutesBefore,
      parentMessageNotifications:
          parentMessageNotifications ?? this.parentMessageNotifications,
      studentAlertNotifications:
          studentAlertNotifications ?? this.studentAlertNotifications,
      iepDeadlineNotifications:
          iepDeadlineNotifications ?? this.iepDeadlineNotifications,
      defaultSessionDuration:
          defaultSessionDuration ?? this.defaultSessionDuration,
      theme: theme ?? this.theme,
      language: language ?? this.language,
    );
  }
}
