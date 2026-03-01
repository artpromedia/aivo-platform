// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'caregiver_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CaregiverPermissionsImpl _$$CaregiverPermissionsImplFromJson(
        Map<String, dynamic> json) =>
    _$CaregiverPermissionsImpl(
      viewProgress: json['viewProgress'] as bool? ?? true,
      viewGrades: json['viewGrades'] as bool? ?? true,
      viewActivity: json['viewActivity'] as bool? ?? true,
      viewAchievements: json['viewAchievements'] as bool? ?? true,
      receiveNotifications: json['receiveNotifications'] as bool? ?? true,
      viewTeacherNotes: json['viewTeacherNotes'] as bool? ?? false,
    );

Map<String, dynamic> _$$CaregiverPermissionsImplToJson(
        _$CaregiverPermissionsImpl instance) =>
    <String, dynamic>{
      'viewProgress': instance.viewProgress,
      'viewGrades': instance.viewGrades,
      'viewActivity': instance.viewActivity,
      'viewAchievements': instance.viewAchievements,
      'receiveNotifications': instance.receiveNotifications,
      'viewTeacherNotes': instance.viewTeacherNotes,
    };

_$CaregiverImpl _$$CaregiverImplFromJson(Map<String, dynamic> json) =>
    _$CaregiverImpl(
      id: json['id'] as String,
      email: json['email'] as String,
      givenName: json['givenName'] as String,
      familyName: json['familyName'] as String,
      photoUrl: json['photoUrl'] as String?,
      relationship:
          $enumDecode(_$CaregiverRelationshipEnumMap, json['relationship']),
      status: json['status'] as String,
      permissions: CaregiverPermissions.fromJson(
          json['permissions'] as Map<String, dynamic>),
      delegatedAt: json['delegatedAt'] as String,
    );

Map<String, dynamic> _$$CaregiverImplToJson(_$CaregiverImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'email': instance.email,
      'givenName': instance.givenName,
      'familyName': instance.familyName,
      'photoUrl': instance.photoUrl,
      'relationship': _$CaregiverRelationshipEnumMap[instance.relationship]!,
      'status': instance.status,
      'permissions': instance.permissions,
      'delegatedAt': instance.delegatedAt,
    };

const _$CaregiverRelationshipEnumMap = {
  CaregiverRelationship.caregiver: 'caregiver',
  CaregiverRelationship.grandparent: 'grandparent',
  CaregiverRelationship.nanny: 'nanny',
  CaregiverRelationship.auntUncle: 'aunt_uncle',
  CaregiverRelationship.familyFriend: 'family_friend',
  CaregiverRelationship.other: 'other',
};

_$CaregiverInviteImpl _$$CaregiverInviteImplFromJson(
        Map<String, dynamic> json) =>
    _$CaregiverInviteImpl(
      id: json['id'] as String,
      caregiverEmail: json['caregiverEmail'] as String,
      caregiverName: json['caregiverName'] as String?,
      relationship:
          $enumDecode(_$CaregiverRelationshipEnumMap, json['relationship']),
      status: json['status'] as String,
      permissions: CaregiverPermissions.fromJson(
          json['permissions'] as Map<String, dynamic>),
      expiresAt: json['expiresAt'] as String,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$$CaregiverInviteImplToJson(
        _$CaregiverInviteImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'caregiverEmail': instance.caregiverEmail,
      'caregiverName': instance.caregiverName,
      'relationship': _$CaregiverRelationshipEnumMap[instance.relationship]!,
      'status': instance.status,
      'permissions': instance.permissions,
      'expiresAt': instance.expiresAt,
      'createdAt': instance.createdAt,
    };

_$StudentCaregiverSummaryImpl _$$StudentCaregiverSummaryImplFromJson(
        Map<String, dynamic> json) =>
    _$StudentCaregiverSummaryImpl(
      studentId: json['studentId'] as String,
      studentName: json['studentName'] as String,
      maxCaregivers: (json['maxCaregivers'] as num).toInt(),
      currentCount: (json['currentCount'] as num).toInt(),
      remainingSlots: (json['remainingSlots'] as num).toInt(),
      caregivers: (json['caregivers'] as List<dynamic>)
          .map((e) => Caregiver.fromJson(e as Map<String, dynamic>))
          .toList(),
      pendingInvites: (json['pendingInvites'] as List<dynamic>)
          .map((e) => CaregiverInvite.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$$StudentCaregiverSummaryImplToJson(
        _$StudentCaregiverSummaryImpl instance) =>
    <String, dynamic>{
      'studentId': instance.studentId,
      'studentName': instance.studentName,
      'maxCaregivers': instance.maxCaregivers,
      'currentCount': instance.currentCount,
      'remainingSlots': instance.remainingSlots,
      'caregivers': instance.caregivers,
      'pendingInvites': instance.pendingInvites,
    };

_$CaregiverLimitInfoImpl _$$CaregiverLimitInfoImplFromJson(
        Map<String, dynamic> json) =>
    _$CaregiverLimitInfoImpl(
      studentId: json['studentId'] as String,
      maxCaregivers: (json['maxCaregivers'] as num).toInt(),
      currentCount: (json['currentCount'] as num).toInt(),
      remainingSlots: (json['remainingSlots'] as num).toInt(),
      canAddMore: json['canAddMore'] as bool,
    );

Map<String, dynamic> _$$CaregiverLimitInfoImplToJson(
        _$CaregiverLimitInfoImpl instance) =>
    <String, dynamic>{
      'studentId': instance.studentId,
      'maxCaregivers': instance.maxCaregivers,
      'currentCount': instance.currentCount,
      'remainingSlots': instance.remainingSlots,
      'canAddMore': instance.canAddMore,
    };

_$CreateCaregiverInviteRequestImpl _$$CreateCaregiverInviteRequestImplFromJson(
        Map<String, dynamic> json) =>
    _$CreateCaregiverInviteRequestImpl(
      studentId: json['studentId'] as String,
      caregiverEmail: json['caregiverEmail'] as String,
      caregiverName: json['caregiverName'] as String?,
      relationship: $enumDecodeNullable(
          _$CaregiverRelationshipEnumMap, json['relationship']),
      permissions: json['permissions'] == null
          ? null
          : CaregiverPermissions.fromJson(
              json['permissions'] as Map<String, dynamic>),
      message: json['message'] as String?,
    );

Map<String, dynamic> _$$CreateCaregiverInviteRequestImplToJson(
        _$CreateCaregiverInviteRequestImpl instance) =>
    <String, dynamic>{
      'studentId': instance.studentId,
      'caregiverEmail': instance.caregiverEmail,
      'caregiverName': instance.caregiverName,
      'relationship': _$CaregiverRelationshipEnumMap[instance.relationship],
      'permissions': instance.permissions,
      'message': instance.message,
    };

_$CaregiverInviteResponseImpl _$$CaregiverInviteResponseImplFromJson(
        Map<String, dynamic> json) =>
    _$CaregiverInviteResponseImpl(
      inviteId: json['inviteId'] as String,
      inviteCode: json['inviteCode'] as String,
      inviteUrl: json['inviteUrl'] as String,
      expiresAt: json['expiresAt'] as String,
    );

Map<String, dynamic> _$$CaregiverInviteResponseImplToJson(
        _$CaregiverInviteResponseImpl instance) =>
    <String, dynamic>{
      'inviteId': instance.inviteId,
      'inviteCode': instance.inviteCode,
      'inviteUrl': instance.inviteUrl,
      'expiresAt': instance.expiresAt,
    };

_$UpdateCaregiverPermissionsRequestImpl
    _$$UpdateCaregiverPermissionsRequestImplFromJson(
            Map<String, dynamic> json) =>
        _$UpdateCaregiverPermissionsRequestImpl(
          caregiverId: json['caregiverId'] as String,
          studentId: json['studentId'] as String,
          permissions: CaregiverPermissions.fromJson(
              json['permissions'] as Map<String, dynamic>),
        );

Map<String, dynamic> _$$UpdateCaregiverPermissionsRequestImplToJson(
        _$UpdateCaregiverPermissionsRequestImpl instance) =>
    <String, dynamic>{
      'caregiverId': instance.caregiverId,
      'studentId': instance.studentId,
      'permissions': instance.permissions,
    };
