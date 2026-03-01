/// Caregiver Models
///
/// Data models for caregiver management, invites, and permissions.
library;

import 'package:freezed_annotation/freezed_annotation.dart';

part 'caregiver_models.freezed.dart';
part 'caregiver_models.g.dart';

/// The relationship a caregiver has with the student.
enum CaregiverRelationship {
  @JsonValue('caregiver')
  caregiver,
  @JsonValue('grandparent')
  grandparent,
  @JsonValue('nanny')
  nanny,
  @JsonValue('aunt_uncle')
  auntUncle,
  @JsonValue('family_friend')
  familyFriend,
  @JsonValue('other')
  other,
}

/// Human-readable labels for [CaregiverRelationship] values.
const caregiverRelationshipLabels = {
  CaregiverRelationship.caregiver: 'Caregiver',
  CaregiverRelationship.grandparent: 'Grandparent',
  CaregiverRelationship.nanny: 'Nanny / Au Pair',
  CaregiverRelationship.auntUncle: 'Aunt / Uncle',
  CaregiverRelationship.familyFriend: 'Family Friend',
  CaregiverRelationship.other: 'Other',
};

/// Permission flags controlling what data a caregiver can see.
@freezed
class CaregiverPermissions with _$CaregiverPermissions {
  const factory CaregiverPermissions({
    @Default(true) bool viewProgress,
    @Default(true) bool viewGrades,
    @Default(true) bool viewActivity,
    @Default(true) bool viewAchievements,
    @Default(true) bool receiveNotifications,
    @Default(false) bool viewTeacherNotes,
  }) = _CaregiverPermissions;

  factory CaregiverPermissions.fromJson(Map<String, dynamic> json) =>
      _$CaregiverPermissionsFromJson(json);
}

/// Human-readable labels for permission fields.
const permissionLabels = {
  'viewProgress': 'View Progress',
  'viewGrades': 'View Grades',
  'viewActivity': 'View Activity',
  'viewAchievements': 'View Achievements',
  'receiveNotifications': 'Receive Notifications',
  'viewTeacherNotes': 'View Teacher Notes',
};

/// An active caregiver with access to a student's data.
@freezed
class Caregiver with _$Caregiver {
  const factory Caregiver({
    required String id,
    required String email,
    required String givenName,
    required String familyName,
    String? photoUrl,
    required CaregiverRelationship relationship,
    required String status,
    required CaregiverPermissions permissions,
    required String delegatedAt,
  }) = _Caregiver;

  factory Caregiver.fromJson(Map<String, dynamic> json) =>
      _$CaregiverFromJson(json);
}

/// A pending invitation for a caregiver.
@freezed
class CaregiverInvite with _$CaregiverInvite {
  const factory CaregiverInvite({
    required String id,
    required String caregiverEmail,
    String? caregiverName,
    required CaregiverRelationship relationship,
    required String status,
    required CaregiverPermissions permissions,
    required String expiresAt,
    required String createdAt,
  }) = _CaregiverInvite;

  factory CaregiverInvite.fromJson(Map<String, dynamic> json) =>
      _$CaregiverInviteFromJson(json);
}

/// Summary of all caregivers and pending invites for a student.
@freezed
class StudentCaregiverSummary with _$StudentCaregiverSummary {
  const factory StudentCaregiverSummary({
    required String studentId,
    required String studentName,
    required int maxCaregivers,
    required int currentCount,
    required int remainingSlots,
    required List<Caregiver> caregivers,
    required List<CaregiverInvite> pendingInvites,
  }) = _StudentCaregiverSummary;

  factory StudentCaregiverSummary.fromJson(Map<String, dynamic> json) =>
      _$StudentCaregiverSummaryFromJson(json);
}

/// Information about caregiver slot limits for a student.
@freezed
class CaregiverLimitInfo with _$CaregiverLimitInfo {
  const factory CaregiverLimitInfo({
    required String studentId,
    required int maxCaregivers,
    required int currentCount,
    required int remainingSlots,
    required bool canAddMore,
  }) = _CaregiverLimitInfo;

  factory CaregiverLimitInfo.fromJson(Map<String, dynamic> json) =>
      _$CaregiverLimitInfoFromJson(json);
}

/// Request payload for creating a caregiver invitation.
@freezed
class CreateCaregiverInviteRequest with _$CreateCaregiverInviteRequest {
  const factory CreateCaregiverInviteRequest({
    required String studentId,
    required String caregiverEmail,
    String? caregiverName,
    CaregiverRelationship? relationship,
    CaregiverPermissions? permissions,
    String? message,
  }) = _CreateCaregiverInviteRequest;

  factory CreateCaregiverInviteRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateCaregiverInviteRequestFromJson(json);
}

/// Response after successfully creating a caregiver invitation.
@freezed
class CaregiverInviteResponse with _$CaregiverInviteResponse {
  const factory CaregiverInviteResponse({
    required String inviteId,
    required String inviteCode,
    required String inviteUrl,
    required String expiresAt,
  }) = _CaregiverInviteResponse;

  factory CaregiverInviteResponse.fromJson(Map<String, dynamic> json) =>
      _$CaregiverInviteResponseFromJson(json);
}

/// Request payload for updating a caregiver's permissions.
@freezed
class UpdateCaregiverPermissionsRequest
    with _$UpdateCaregiverPermissionsRequest {
  const factory UpdateCaregiverPermissionsRequest({
    required String caregiverId,
    required String studentId,
    required CaregiverPermissions permissions,
  }) = _UpdateCaregiverPermissionsRequest;

  factory UpdateCaregiverPermissionsRequest.fromJson(
          Map<String, dynamic> json) =>
      _$UpdateCaregiverPermissionsRequestFromJson(json);
}
