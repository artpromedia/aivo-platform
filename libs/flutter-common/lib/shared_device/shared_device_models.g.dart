// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'shared_device_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ClassSessionCode _$ClassSessionCodeFromJson(Map<String, dynamic> json) =>
    ClassSessionCode(
      code: json['code'] as String,
      classroomId: json['classroomId'] as String,
      classroomName: json['classroomName'] as String,
      teacherId: json['teacherId'] as String,
      teacherName: json['teacherName'] as String,
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      isActive: json['isActive'] as bool,
    );

Map<String, dynamic> _$ClassSessionCodeToJson(ClassSessionCode instance) =>
    <String, dynamic>{
      'code': instance.code,
      'classroomId': instance.classroomId,
      'classroomName': instance.classroomName,
      'teacherId': instance.teacherId,
      'teacherName': instance.teacherName,
      'expiresAt': instance.expiresAt.toIso8601String(),
      'isActive': instance.isActive,
    };

RosterLearner _$RosterLearnerFromJson(Map<String, dynamic> json) =>
    RosterLearner(
      learnerId: json['learnerId'] as String,
      displayName: json['displayName'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      pseudonym: json['pseudonym'] as String?,
      gradeBand: json['gradeBand'] == null
          ? null
          : _gradeBandFromJson(json['gradeBand'] as String),
      hasPin: json['hasPin'] as bool? ?? true,
    );

Map<String, dynamic> _$RosterLearnerToJson(RosterLearner instance) =>
    <String, dynamic>{
      'learnerId': instance.learnerId,
      'displayName': instance.displayName,
      'avatarUrl': instance.avatarUrl,
      'pseudonym': instance.pseudonym,
      'gradeBand': instance.gradeBand != null
          ? _gradeBandToJson(instance.gradeBand!)
          : null,
      'hasPin': instance.hasPin,
    };

ClassroomRoster _$ClassroomRosterFromJson(Map<String, dynamic> json) =>
    ClassroomRoster(
      classroomId: json['classroomId'] as String,
      classroomName: json['classroomName'] as String,
      teacherName: json['teacherName'] as String,
      gradeBand: json['gradeBand'] == null
          ? null
          : _gradeBandFromJson(json['gradeBand'] as String),
      displayMode: json['displayMode'] == null
          ? RosterDisplayMode.firstNameLastInitial
          : _displayModeFromJson(json['displayMode'] as String),
      learners: (json['learners'] as List<dynamic>)
          .map((e) => RosterLearner.fromJson(e as Map<String, dynamic>))
          .toList(),
      fetchedAt: json['fetchedAt'] == null
          ? null
          : DateTime.parse(json['fetchedAt'] as String),
    );

Map<String, dynamic> _$ClassroomRosterToJson(ClassroomRoster instance) =>
    <String, dynamic>{
      'classroomId': instance.classroomId,
      'classroomName': instance.classroomName,
      'teacherName': instance.teacherName,
      'gradeBand': instance.gradeBand != null
          ? _gradeBandToJson(instance.gradeBand!)
          : null,
      'displayMode': _displayModeToJson(instance.displayMode),
      'learners': instance.learners.map((e) => e.toJson()).toList(),
      'fetchedAt': instance.fetchedAt.toIso8601String(),
    };

SharedDeviceSession _$SharedDeviceSessionFromJson(Map<String, dynamic> json) =>
    SharedDeviceSession(
      sessionId: json['sessionId'] as String,
      classroomId: json['classroomId'] as String,
      classroomName: json['classroomName'] as String,
      learnerId: json['learnerId'] as String,
      learnerDisplayName: json['learnerDisplayName'] as String,
      startedAt: DateTime.parse(json['startedAt'] as String),
      gradeBand: json['gradeBand'] == null
          ? null
          : _gradeBandFromJson(json['gradeBand'] as String),
    );

Map<String, dynamic> _$SharedDeviceSessionToJson(
        SharedDeviceSession instance) =>
    <String, dynamic>{
      'sessionId': instance.sessionId,
      'classroomId': instance.classroomId,
      'classroomName': instance.classroomName,
      'learnerId': instance.learnerId,
      'learnerDisplayName': instance.learnerDisplayName,
      'startedAt': instance.startedAt.toIso8601String(),
      'gradeBand': instance.gradeBand != null
          ? _gradeBandToJson(instance.gradeBand!)
          : null,
    };

SharedPinValidationResult _$SharedPinValidationResultFromJson(
        Map<String, dynamic> json) =>
    SharedPinValidationResult(
      valid: json['valid'] as bool,
      sessionToken: json['sessionToken'] as String?,
      errorMessage: json['errorMessage'] as String?,
      remainingAttempts: json['remainingAttempts'] as int?,
    );

Map<String, dynamic> _$SharedPinValidationResultToJson(
        SharedPinValidationResult instance) =>
    <String, dynamic>{
      'valid': instance.valid,
      'sessionToken': instance.sessionToken,
      'errorMessage': instance.errorMessage,
      'remainingAttempts': instance.remainingAttempts,
    };

// **************************************************************************
// Helper Functions
// **************************************************************************

GradeBand _gradeBandFromJson(String value) {
  switch (value) {
    case 'K_2':
      return GradeBand.k2;
    case 'G3_5':
      return GradeBand.g35;
    case 'G6_8':
      return GradeBand.g68;
    case 'G9_12':
      return GradeBand.g912;
    default:
      throw ArgumentError('Unknown GradeBand: $value');
  }
}

String _gradeBandToJson(GradeBand value) {
  switch (value) {
    case GradeBand.k2:
      return 'K_2';
    case GradeBand.g35:
      return 'G3_5';
    case GradeBand.g68:
      return 'G6_8';
    case GradeBand.g912:
      return 'G9_12';
  }
}

RosterDisplayMode _displayModeFromJson(String value) {
  switch (value) {
    case 'FIRST_NAME_LAST_INITIAL':
      return RosterDisplayMode.firstNameLastInitial;
    case 'PSEUDONYM':
      return RosterDisplayMode.pseudonym;
    case 'FIRST_NAME_ONLY':
      return RosterDisplayMode.firstNameOnly;
    default:
      return RosterDisplayMode.firstNameLastInitial;
  }
}

String _displayModeToJson(RosterDisplayMode value) {
  switch (value) {
    case RosterDisplayMode.firstNameLastInitial:
      return 'FIRST_NAME_LAST_INITIAL';
    case RosterDisplayMode.pseudonym:
      return 'PSEUDONYM';
    case RosterDisplayMode.firstNameOnly:
      return 'FIRST_NAME_ONLY';
  }
}
