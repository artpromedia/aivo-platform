// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'caregiver_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

CaregiverPermissions _$CaregiverPermissionsFromJson(Map<String, dynamic> json) {
  return _CaregiverPermissions.fromJson(json);
}

/// @nodoc
mixin _$CaregiverPermissions {
  bool get viewProgress => throw _privateConstructorUsedError;
  bool get viewGrades => throw _privateConstructorUsedError;
  bool get viewActivity => throw _privateConstructorUsedError;
  bool get viewAchievements => throw _privateConstructorUsedError;
  bool get receiveNotifications => throw _privateConstructorUsedError;
  bool get viewTeacherNotes => throw _privateConstructorUsedError;

  /// Serializes this CaregiverPermissions to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CaregiverPermissions
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CaregiverPermissionsCopyWith<CaregiverPermissions> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CaregiverPermissionsCopyWith<$Res> {
  factory $CaregiverPermissionsCopyWith(CaregiverPermissions value,
          $Res Function(CaregiverPermissions) then) =
      _$CaregiverPermissionsCopyWithImpl<$Res, CaregiverPermissions>;
  @useResult
  $Res call(
      {bool viewProgress,
      bool viewGrades,
      bool viewActivity,
      bool viewAchievements,
      bool receiveNotifications,
      bool viewTeacherNotes});
}

/// @nodoc
class _$CaregiverPermissionsCopyWithImpl<$Res,
        $Val extends CaregiverPermissions>
    implements $CaregiverPermissionsCopyWith<$Res> {
  _$CaregiverPermissionsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CaregiverPermissions
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? viewProgress = null,
    Object? viewGrades = null,
    Object? viewActivity = null,
    Object? viewAchievements = null,
    Object? receiveNotifications = null,
    Object? viewTeacherNotes = null,
  }) {
    return _then(_value.copyWith(
      viewProgress: null == viewProgress
          ? _value.viewProgress
          : viewProgress // ignore: cast_nullable_to_non_nullable
              as bool,
      viewGrades: null == viewGrades
          ? _value.viewGrades
          : viewGrades // ignore: cast_nullable_to_non_nullable
              as bool,
      viewActivity: null == viewActivity
          ? _value.viewActivity
          : viewActivity // ignore: cast_nullable_to_non_nullable
              as bool,
      viewAchievements: null == viewAchievements
          ? _value.viewAchievements
          : viewAchievements // ignore: cast_nullable_to_non_nullable
              as bool,
      receiveNotifications: null == receiveNotifications
          ? _value.receiveNotifications
          : receiveNotifications // ignore: cast_nullable_to_non_nullable
              as bool,
      viewTeacherNotes: null == viewTeacherNotes
          ? _value.viewTeacherNotes
          : viewTeacherNotes // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CaregiverPermissionsImplCopyWith<$Res>
    implements $CaregiverPermissionsCopyWith<$Res> {
  factory _$$CaregiverPermissionsImplCopyWith(_$CaregiverPermissionsImpl value,
          $Res Function(_$CaregiverPermissionsImpl) then) =
      __$$CaregiverPermissionsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool viewProgress,
      bool viewGrades,
      bool viewActivity,
      bool viewAchievements,
      bool receiveNotifications,
      bool viewTeacherNotes});
}

/// @nodoc
class __$$CaregiverPermissionsImplCopyWithImpl<$Res>
    extends _$CaregiverPermissionsCopyWithImpl<$Res, _$CaregiverPermissionsImpl>
    implements _$$CaregiverPermissionsImplCopyWith<$Res> {
  __$$CaregiverPermissionsImplCopyWithImpl(_$CaregiverPermissionsImpl _value,
      $Res Function(_$CaregiverPermissionsImpl) _then)
      : super(_value, _then);

  /// Create a copy of CaregiverPermissions
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? viewProgress = null,
    Object? viewGrades = null,
    Object? viewActivity = null,
    Object? viewAchievements = null,
    Object? receiveNotifications = null,
    Object? viewTeacherNotes = null,
  }) {
    return _then(_$CaregiverPermissionsImpl(
      viewProgress: null == viewProgress
          ? _value.viewProgress
          : viewProgress // ignore: cast_nullable_to_non_nullable
              as bool,
      viewGrades: null == viewGrades
          ? _value.viewGrades
          : viewGrades // ignore: cast_nullable_to_non_nullable
              as bool,
      viewActivity: null == viewActivity
          ? _value.viewActivity
          : viewActivity // ignore: cast_nullable_to_non_nullable
              as bool,
      viewAchievements: null == viewAchievements
          ? _value.viewAchievements
          : viewAchievements // ignore: cast_nullable_to_non_nullable
              as bool,
      receiveNotifications: null == receiveNotifications
          ? _value.receiveNotifications
          : receiveNotifications // ignore: cast_nullable_to_non_nullable
              as bool,
      viewTeacherNotes: null == viewTeacherNotes
          ? _value.viewTeacherNotes
          : viewTeacherNotes // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CaregiverPermissionsImpl implements _CaregiverPermissions {
  const _$CaregiverPermissionsImpl(
      {this.viewProgress = true,
      this.viewGrades = true,
      this.viewActivity = true,
      this.viewAchievements = true,
      this.receiveNotifications = true,
      this.viewTeacherNotes = false});

  factory _$CaregiverPermissionsImpl.fromJson(Map<String, dynamic> json) =>
      _$$CaregiverPermissionsImplFromJson(json);

  @override
  @JsonKey()
  final bool viewProgress;
  @override
  @JsonKey()
  final bool viewGrades;
  @override
  @JsonKey()
  final bool viewActivity;
  @override
  @JsonKey()
  final bool viewAchievements;
  @override
  @JsonKey()
  final bool receiveNotifications;
  @override
  @JsonKey()
  final bool viewTeacherNotes;

  @override
  String toString() {
    return 'CaregiverPermissions(viewProgress: $viewProgress, viewGrades: $viewGrades, viewActivity: $viewActivity, viewAchievements: $viewAchievements, receiveNotifications: $receiveNotifications, viewTeacherNotes: $viewTeacherNotes)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CaregiverPermissionsImpl &&
            (identical(other.viewProgress, viewProgress) ||
                other.viewProgress == viewProgress) &&
            (identical(other.viewGrades, viewGrades) ||
                other.viewGrades == viewGrades) &&
            (identical(other.viewActivity, viewActivity) ||
                other.viewActivity == viewActivity) &&
            (identical(other.viewAchievements, viewAchievements) ||
                other.viewAchievements == viewAchievements) &&
            (identical(other.receiveNotifications, receiveNotifications) ||
                other.receiveNotifications == receiveNotifications) &&
            (identical(other.viewTeacherNotes, viewTeacherNotes) ||
                other.viewTeacherNotes == viewTeacherNotes));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, viewProgress, viewGrades,
      viewActivity, viewAchievements, receiveNotifications, viewTeacherNotes);

  /// Create a copy of CaregiverPermissions
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CaregiverPermissionsImplCopyWith<_$CaregiverPermissionsImpl>
      get copyWith =>
          __$$CaregiverPermissionsImplCopyWithImpl<_$CaregiverPermissionsImpl>(
              this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CaregiverPermissionsImplToJson(
      this,
    );
  }
}

abstract class _CaregiverPermissions implements CaregiverPermissions {
  const factory _CaregiverPermissions(
      {final bool viewProgress,
      final bool viewGrades,
      final bool viewActivity,
      final bool viewAchievements,
      final bool receiveNotifications,
      final bool viewTeacherNotes}) = _$CaregiverPermissionsImpl;

  factory _CaregiverPermissions.fromJson(Map<String, dynamic> json) =
      _$CaregiverPermissionsImpl.fromJson;

  @override
  bool get viewProgress;
  @override
  bool get viewGrades;
  @override
  bool get viewActivity;
  @override
  bool get viewAchievements;
  @override
  bool get receiveNotifications;
  @override
  bool get viewTeacherNotes;

  /// Create a copy of CaregiverPermissions
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CaregiverPermissionsImplCopyWith<_$CaregiverPermissionsImpl>
      get copyWith => throw _privateConstructorUsedError;
}

Caregiver _$CaregiverFromJson(Map<String, dynamic> json) {
  return _Caregiver.fromJson(json);
}

/// @nodoc
mixin _$Caregiver {
  String get id => throw _privateConstructorUsedError;
  String get email => throw _privateConstructorUsedError;
  String get givenName => throw _privateConstructorUsedError;
  String get familyName => throw _privateConstructorUsedError;
  String? get photoUrl => throw _privateConstructorUsedError;
  CaregiverRelationship get relationship => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  CaregiverPermissions get permissions => throw _privateConstructorUsedError;
  String get delegatedAt => throw _privateConstructorUsedError;

  /// Serializes this Caregiver to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Caregiver
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CaregiverCopyWith<Caregiver> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CaregiverCopyWith<$Res> {
  factory $CaregiverCopyWith(Caregiver value, $Res Function(Caregiver) then) =
      _$CaregiverCopyWithImpl<$Res, Caregiver>;
  @useResult
  $Res call(
      {String id,
      String email,
      String givenName,
      String familyName,
      String? photoUrl,
      CaregiverRelationship relationship,
      String status,
      CaregiverPermissions permissions,
      String delegatedAt});

  $CaregiverPermissionsCopyWith<$Res> get permissions;
}

/// @nodoc
class _$CaregiverCopyWithImpl<$Res, $Val extends Caregiver>
    implements $CaregiverCopyWith<$Res> {
  _$CaregiverCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Caregiver
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? email = null,
    Object? givenName = null,
    Object? familyName = null,
    Object? photoUrl = freezed,
    Object? relationship = null,
    Object? status = null,
    Object? permissions = null,
    Object? delegatedAt = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      email: null == email
          ? _value.email
          : email // ignore: cast_nullable_to_non_nullable
              as String,
      givenName: null == givenName
          ? _value.givenName
          : givenName // ignore: cast_nullable_to_non_nullable
              as String,
      familyName: null == familyName
          ? _value.familyName
          : familyName // ignore: cast_nullable_to_non_nullable
              as String,
      photoUrl: freezed == photoUrl
          ? _value.photoUrl
          : photoUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      relationship: null == relationship
          ? _value.relationship
          : relationship // ignore: cast_nullable_to_non_nullable
              as CaregiverRelationship,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      permissions: null == permissions
          ? _value.permissions
          : permissions // ignore: cast_nullable_to_non_nullable
              as CaregiverPermissions,
      delegatedAt: null == delegatedAt
          ? _value.delegatedAt
          : delegatedAt // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }

  /// Create a copy of Caregiver
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $CaregiverPermissionsCopyWith<$Res> get permissions {
    return $CaregiverPermissionsCopyWith<$Res>(_value.permissions, (value) {
      return _then(_value.copyWith(permissions: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$CaregiverImplCopyWith<$Res>
    implements $CaregiverCopyWith<$Res> {
  factory _$$CaregiverImplCopyWith(
          _$CaregiverImpl value, $Res Function(_$CaregiverImpl) then) =
      __$$CaregiverImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String email,
      String givenName,
      String familyName,
      String? photoUrl,
      CaregiverRelationship relationship,
      String status,
      CaregiverPermissions permissions,
      String delegatedAt});

  @override
  $CaregiverPermissionsCopyWith<$Res> get permissions;
}

/// @nodoc
class __$$CaregiverImplCopyWithImpl<$Res>
    extends _$CaregiverCopyWithImpl<$Res, _$CaregiverImpl>
    implements _$$CaregiverImplCopyWith<$Res> {
  __$$CaregiverImplCopyWithImpl(
      _$CaregiverImpl _value, $Res Function(_$CaregiverImpl) _then)
      : super(_value, _then);

  /// Create a copy of Caregiver
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? email = null,
    Object? givenName = null,
    Object? familyName = null,
    Object? photoUrl = freezed,
    Object? relationship = null,
    Object? status = null,
    Object? permissions = null,
    Object? delegatedAt = null,
  }) {
    return _then(_$CaregiverImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      email: null == email
          ? _value.email
          : email // ignore: cast_nullable_to_non_nullable
              as String,
      givenName: null == givenName
          ? _value.givenName
          : givenName // ignore: cast_nullable_to_non_nullable
              as String,
      familyName: null == familyName
          ? _value.familyName
          : familyName // ignore: cast_nullable_to_non_nullable
              as String,
      photoUrl: freezed == photoUrl
          ? _value.photoUrl
          : photoUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      relationship: null == relationship
          ? _value.relationship
          : relationship // ignore: cast_nullable_to_non_nullable
              as CaregiverRelationship,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      permissions: null == permissions
          ? _value.permissions
          : permissions // ignore: cast_nullable_to_non_nullable
              as CaregiverPermissions,
      delegatedAt: null == delegatedAt
          ? _value.delegatedAt
          : delegatedAt // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CaregiverImpl implements _Caregiver {
  const _$CaregiverImpl(
      {required this.id,
      required this.email,
      required this.givenName,
      required this.familyName,
      this.photoUrl,
      required this.relationship,
      required this.status,
      required this.permissions,
      required this.delegatedAt});

  factory _$CaregiverImpl.fromJson(Map<String, dynamic> json) =>
      _$$CaregiverImplFromJson(json);

  @override
  final String id;
  @override
  final String email;
  @override
  final String givenName;
  @override
  final String familyName;
  @override
  final String? photoUrl;
  @override
  final CaregiverRelationship relationship;
  @override
  final String status;
  @override
  final CaregiverPermissions permissions;
  @override
  final String delegatedAt;

  @override
  String toString() {
    return 'Caregiver(id: $id, email: $email, givenName: $givenName, familyName: $familyName, photoUrl: $photoUrl, relationship: $relationship, status: $status, permissions: $permissions, delegatedAt: $delegatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CaregiverImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.email, email) || other.email == email) &&
            (identical(other.givenName, givenName) ||
                other.givenName == givenName) &&
            (identical(other.familyName, familyName) ||
                other.familyName == familyName) &&
            (identical(other.photoUrl, photoUrl) ||
                other.photoUrl == photoUrl) &&
            (identical(other.relationship, relationship) ||
                other.relationship == relationship) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.permissions, permissions) ||
                other.permissions == permissions) &&
            (identical(other.delegatedAt, delegatedAt) ||
                other.delegatedAt == delegatedAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, email, givenName, familyName,
      photoUrl, relationship, status, permissions, delegatedAt);

  /// Create a copy of Caregiver
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CaregiverImplCopyWith<_$CaregiverImpl> get copyWith =>
      __$$CaregiverImplCopyWithImpl<_$CaregiverImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CaregiverImplToJson(
      this,
    );
  }
}

abstract class _Caregiver implements Caregiver {
  const factory _Caregiver(
      {required final String id,
      required final String email,
      required final String givenName,
      required final String familyName,
      final String? photoUrl,
      required final CaregiverRelationship relationship,
      required final String status,
      required final CaregiverPermissions permissions,
      required final String delegatedAt}) = _$CaregiverImpl;

  factory _Caregiver.fromJson(Map<String, dynamic> json) =
      _$CaregiverImpl.fromJson;

  @override
  String get id;
  @override
  String get email;
  @override
  String get givenName;
  @override
  String get familyName;
  @override
  String? get photoUrl;
  @override
  CaregiverRelationship get relationship;
  @override
  String get status;
  @override
  CaregiverPermissions get permissions;
  @override
  String get delegatedAt;

  /// Create a copy of Caregiver
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CaregiverImplCopyWith<_$CaregiverImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

CaregiverInvite _$CaregiverInviteFromJson(Map<String, dynamic> json) {
  return _CaregiverInvite.fromJson(json);
}

/// @nodoc
mixin _$CaregiverInvite {
  String get id => throw _privateConstructorUsedError;
  String get caregiverEmail => throw _privateConstructorUsedError;
  String? get caregiverName => throw _privateConstructorUsedError;
  CaregiverRelationship get relationship => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  CaregiverPermissions get permissions => throw _privateConstructorUsedError;
  String get expiresAt => throw _privateConstructorUsedError;
  String get createdAt => throw _privateConstructorUsedError;

  /// Serializes this CaregiverInvite to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CaregiverInvite
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CaregiverInviteCopyWith<CaregiverInvite> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CaregiverInviteCopyWith<$Res> {
  factory $CaregiverInviteCopyWith(
          CaregiverInvite value, $Res Function(CaregiverInvite) then) =
      _$CaregiverInviteCopyWithImpl<$Res, CaregiverInvite>;
  @useResult
  $Res call(
      {String id,
      String caregiverEmail,
      String? caregiverName,
      CaregiverRelationship relationship,
      String status,
      CaregiverPermissions permissions,
      String expiresAt,
      String createdAt});

  $CaregiverPermissionsCopyWith<$Res> get permissions;
}

/// @nodoc
class _$CaregiverInviteCopyWithImpl<$Res, $Val extends CaregiverInvite>
    implements $CaregiverInviteCopyWith<$Res> {
  _$CaregiverInviteCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CaregiverInvite
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? caregiverEmail = null,
    Object? caregiverName = freezed,
    Object? relationship = null,
    Object? status = null,
    Object? permissions = null,
    Object? expiresAt = null,
    Object? createdAt = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      caregiverEmail: null == caregiverEmail
          ? _value.caregiverEmail
          : caregiverEmail // ignore: cast_nullable_to_non_nullable
              as String,
      caregiverName: freezed == caregiverName
          ? _value.caregiverName
          : caregiverName // ignore: cast_nullable_to_non_nullable
              as String?,
      relationship: null == relationship
          ? _value.relationship
          : relationship // ignore: cast_nullable_to_non_nullable
              as CaregiverRelationship,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      permissions: null == permissions
          ? _value.permissions
          : permissions // ignore: cast_nullable_to_non_nullable
              as CaregiverPermissions,
      expiresAt: null == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as String,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }

  /// Create a copy of CaregiverInvite
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $CaregiverPermissionsCopyWith<$Res> get permissions {
    return $CaregiverPermissionsCopyWith<$Res>(_value.permissions, (value) {
      return _then(_value.copyWith(permissions: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$CaregiverInviteImplCopyWith<$Res>
    implements $CaregiverInviteCopyWith<$Res> {
  factory _$$CaregiverInviteImplCopyWith(_$CaregiverInviteImpl value,
          $Res Function(_$CaregiverInviteImpl) then) =
      __$$CaregiverInviteImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String caregiverEmail,
      String? caregiverName,
      CaregiverRelationship relationship,
      String status,
      CaregiverPermissions permissions,
      String expiresAt,
      String createdAt});

  @override
  $CaregiverPermissionsCopyWith<$Res> get permissions;
}

/// @nodoc
class __$$CaregiverInviteImplCopyWithImpl<$Res>
    extends _$CaregiverInviteCopyWithImpl<$Res, _$CaregiverInviteImpl>
    implements _$$CaregiverInviteImplCopyWith<$Res> {
  __$$CaregiverInviteImplCopyWithImpl(
      _$CaregiverInviteImpl _value, $Res Function(_$CaregiverInviteImpl) _then)
      : super(_value, _then);

  /// Create a copy of CaregiverInvite
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? caregiverEmail = null,
    Object? caregiverName = freezed,
    Object? relationship = null,
    Object? status = null,
    Object? permissions = null,
    Object? expiresAt = null,
    Object? createdAt = null,
  }) {
    return _then(_$CaregiverInviteImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      caregiverEmail: null == caregiverEmail
          ? _value.caregiverEmail
          : caregiverEmail // ignore: cast_nullable_to_non_nullable
              as String,
      caregiverName: freezed == caregiverName
          ? _value.caregiverName
          : caregiverName // ignore: cast_nullable_to_non_nullable
              as String?,
      relationship: null == relationship
          ? _value.relationship
          : relationship // ignore: cast_nullable_to_non_nullable
              as CaregiverRelationship,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      permissions: null == permissions
          ? _value.permissions
          : permissions // ignore: cast_nullable_to_non_nullable
              as CaregiverPermissions,
      expiresAt: null == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as String,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CaregiverInviteImpl implements _CaregiverInvite {
  const _$CaregiverInviteImpl(
      {required this.id,
      required this.caregiverEmail,
      this.caregiverName,
      required this.relationship,
      required this.status,
      required this.permissions,
      required this.expiresAt,
      required this.createdAt});

  factory _$CaregiverInviteImpl.fromJson(Map<String, dynamic> json) =>
      _$$CaregiverInviteImplFromJson(json);

  @override
  final String id;
  @override
  final String caregiverEmail;
  @override
  final String? caregiverName;
  @override
  final CaregiverRelationship relationship;
  @override
  final String status;
  @override
  final CaregiverPermissions permissions;
  @override
  final String expiresAt;
  @override
  final String createdAt;

  @override
  String toString() {
    return 'CaregiverInvite(id: $id, caregiverEmail: $caregiverEmail, caregiverName: $caregiverName, relationship: $relationship, status: $status, permissions: $permissions, expiresAt: $expiresAt, createdAt: $createdAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CaregiverInviteImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.caregiverEmail, caregiverEmail) ||
                other.caregiverEmail == caregiverEmail) &&
            (identical(other.caregiverName, caregiverName) ||
                other.caregiverName == caregiverName) &&
            (identical(other.relationship, relationship) ||
                other.relationship == relationship) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.permissions, permissions) ||
                other.permissions == permissions) &&
            (identical(other.expiresAt, expiresAt) ||
                other.expiresAt == expiresAt) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, caregiverEmail,
      caregiverName, relationship, status, permissions, expiresAt, createdAt);

  /// Create a copy of CaregiverInvite
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CaregiverInviteImplCopyWith<_$CaregiverInviteImpl> get copyWith =>
      __$$CaregiverInviteImplCopyWithImpl<_$CaregiverInviteImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CaregiverInviteImplToJson(
      this,
    );
  }
}

abstract class _CaregiverInvite implements CaregiverInvite {
  const factory _CaregiverInvite(
      {required final String id,
      required final String caregiverEmail,
      final String? caregiverName,
      required final CaregiverRelationship relationship,
      required final String status,
      required final CaregiverPermissions permissions,
      required final String expiresAt,
      required final String createdAt}) = _$CaregiverInviteImpl;

  factory _CaregiverInvite.fromJson(Map<String, dynamic> json) =
      _$CaregiverInviteImpl.fromJson;

  @override
  String get id;
  @override
  String get caregiverEmail;
  @override
  String? get caregiverName;
  @override
  CaregiverRelationship get relationship;
  @override
  String get status;
  @override
  CaregiverPermissions get permissions;
  @override
  String get expiresAt;
  @override
  String get createdAt;

  /// Create a copy of CaregiverInvite
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CaregiverInviteImplCopyWith<_$CaregiverInviteImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

StudentCaregiverSummary _$StudentCaregiverSummaryFromJson(
    Map<String, dynamic> json) {
  return _StudentCaregiverSummary.fromJson(json);
}

/// @nodoc
mixin _$StudentCaregiverSummary {
  String get studentId => throw _privateConstructorUsedError;
  String get studentName => throw _privateConstructorUsedError;
  int get maxCaregivers => throw _privateConstructorUsedError;
  int get currentCount => throw _privateConstructorUsedError;
  int get remainingSlots => throw _privateConstructorUsedError;
  List<Caregiver> get caregivers => throw _privateConstructorUsedError;
  List<CaregiverInvite> get pendingInvites =>
      throw _privateConstructorUsedError;

  /// Serializes this StudentCaregiverSummary to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of StudentCaregiverSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $StudentCaregiverSummaryCopyWith<StudentCaregiverSummary> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $StudentCaregiverSummaryCopyWith<$Res> {
  factory $StudentCaregiverSummaryCopyWith(StudentCaregiverSummary value,
          $Res Function(StudentCaregiverSummary) then) =
      _$StudentCaregiverSummaryCopyWithImpl<$Res, StudentCaregiverSummary>;
  @useResult
  $Res call(
      {String studentId,
      String studentName,
      int maxCaregivers,
      int currentCount,
      int remainingSlots,
      List<Caregiver> caregivers,
      List<CaregiverInvite> pendingInvites});
}

/// @nodoc
class _$StudentCaregiverSummaryCopyWithImpl<$Res,
        $Val extends StudentCaregiverSummary>
    implements $StudentCaregiverSummaryCopyWith<$Res> {
  _$StudentCaregiverSummaryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of StudentCaregiverSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? studentId = null,
    Object? studentName = null,
    Object? maxCaregivers = null,
    Object? currentCount = null,
    Object? remainingSlots = null,
    Object? caregivers = null,
    Object? pendingInvites = null,
  }) {
    return _then(_value.copyWith(
      studentId: null == studentId
          ? _value.studentId
          : studentId // ignore: cast_nullable_to_non_nullable
              as String,
      studentName: null == studentName
          ? _value.studentName
          : studentName // ignore: cast_nullable_to_non_nullable
              as String,
      maxCaregivers: null == maxCaregivers
          ? _value.maxCaregivers
          : maxCaregivers // ignore: cast_nullable_to_non_nullable
              as int,
      currentCount: null == currentCount
          ? _value.currentCount
          : currentCount // ignore: cast_nullable_to_non_nullable
              as int,
      remainingSlots: null == remainingSlots
          ? _value.remainingSlots
          : remainingSlots // ignore: cast_nullable_to_non_nullable
              as int,
      caregivers: null == caregivers
          ? _value.caregivers
          : caregivers // ignore: cast_nullable_to_non_nullable
              as List<Caregiver>,
      pendingInvites: null == pendingInvites
          ? _value.pendingInvites
          : pendingInvites // ignore: cast_nullable_to_non_nullable
              as List<CaregiverInvite>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$StudentCaregiverSummaryImplCopyWith<$Res>
    implements $StudentCaregiverSummaryCopyWith<$Res> {
  factory _$$StudentCaregiverSummaryImplCopyWith(
          _$StudentCaregiverSummaryImpl value,
          $Res Function(_$StudentCaregiverSummaryImpl) then) =
      __$$StudentCaregiverSummaryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String studentId,
      String studentName,
      int maxCaregivers,
      int currentCount,
      int remainingSlots,
      List<Caregiver> caregivers,
      List<CaregiverInvite> pendingInvites});
}

/// @nodoc
class __$$StudentCaregiverSummaryImplCopyWithImpl<$Res>
    extends _$StudentCaregiverSummaryCopyWithImpl<$Res,
        _$StudentCaregiverSummaryImpl>
    implements _$$StudentCaregiverSummaryImplCopyWith<$Res> {
  __$$StudentCaregiverSummaryImplCopyWithImpl(
      _$StudentCaregiverSummaryImpl _value,
      $Res Function(_$StudentCaregiverSummaryImpl) _then)
      : super(_value, _then);

  /// Create a copy of StudentCaregiverSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? studentId = null,
    Object? studentName = null,
    Object? maxCaregivers = null,
    Object? currentCount = null,
    Object? remainingSlots = null,
    Object? caregivers = null,
    Object? pendingInvites = null,
  }) {
    return _then(_$StudentCaregiverSummaryImpl(
      studentId: null == studentId
          ? _value.studentId
          : studentId // ignore: cast_nullable_to_non_nullable
              as String,
      studentName: null == studentName
          ? _value.studentName
          : studentName // ignore: cast_nullable_to_non_nullable
              as String,
      maxCaregivers: null == maxCaregivers
          ? _value.maxCaregivers
          : maxCaregivers // ignore: cast_nullable_to_non_nullable
              as int,
      currentCount: null == currentCount
          ? _value.currentCount
          : currentCount // ignore: cast_nullable_to_non_nullable
              as int,
      remainingSlots: null == remainingSlots
          ? _value.remainingSlots
          : remainingSlots // ignore: cast_nullable_to_non_nullable
              as int,
      caregivers: null == caregivers
          ? _value._caregivers
          : caregivers // ignore: cast_nullable_to_non_nullable
              as List<Caregiver>,
      pendingInvites: null == pendingInvites
          ? _value._pendingInvites
          : pendingInvites // ignore: cast_nullable_to_non_nullable
              as List<CaregiverInvite>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$StudentCaregiverSummaryImpl implements _StudentCaregiverSummary {
  const _$StudentCaregiverSummaryImpl(
      {required this.studentId,
      required this.studentName,
      required this.maxCaregivers,
      required this.currentCount,
      required this.remainingSlots,
      required final List<Caregiver> caregivers,
      required final List<CaregiverInvite> pendingInvites})
      : _caregivers = caregivers,
        _pendingInvites = pendingInvites;

  factory _$StudentCaregiverSummaryImpl.fromJson(Map<String, dynamic> json) =>
      _$$StudentCaregiverSummaryImplFromJson(json);

  @override
  final String studentId;
  @override
  final String studentName;
  @override
  final int maxCaregivers;
  @override
  final int currentCount;
  @override
  final int remainingSlots;
  final List<Caregiver> _caregivers;
  @override
  List<Caregiver> get caregivers {
    if (_caregivers is EqualUnmodifiableListView) return _caregivers;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_caregivers);
  }

  final List<CaregiverInvite> _pendingInvites;
  @override
  List<CaregiverInvite> get pendingInvites {
    if (_pendingInvites is EqualUnmodifiableListView) return _pendingInvites;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_pendingInvites);
  }

  @override
  String toString() {
    return 'StudentCaregiverSummary(studentId: $studentId, studentName: $studentName, maxCaregivers: $maxCaregivers, currentCount: $currentCount, remainingSlots: $remainingSlots, caregivers: $caregivers, pendingInvites: $pendingInvites)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$StudentCaregiverSummaryImpl &&
            (identical(other.studentId, studentId) ||
                other.studentId == studentId) &&
            (identical(other.studentName, studentName) ||
                other.studentName == studentName) &&
            (identical(other.maxCaregivers, maxCaregivers) ||
                other.maxCaregivers == maxCaregivers) &&
            (identical(other.currentCount, currentCount) ||
                other.currentCount == currentCount) &&
            (identical(other.remainingSlots, remainingSlots) ||
                other.remainingSlots == remainingSlots) &&
            const DeepCollectionEquality()
                .equals(other._caregivers, _caregivers) &&
            const DeepCollectionEquality()
                .equals(other._pendingInvites, _pendingInvites));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      studentId,
      studentName,
      maxCaregivers,
      currentCount,
      remainingSlots,
      const DeepCollectionEquality().hash(_caregivers),
      const DeepCollectionEquality().hash(_pendingInvites));

  /// Create a copy of StudentCaregiverSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$StudentCaregiverSummaryImplCopyWith<_$StudentCaregiverSummaryImpl>
      get copyWith => __$$StudentCaregiverSummaryImplCopyWithImpl<
          _$StudentCaregiverSummaryImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$StudentCaregiverSummaryImplToJson(
      this,
    );
  }
}

abstract class _StudentCaregiverSummary implements StudentCaregiverSummary {
  const factory _StudentCaregiverSummary(
          {required final String studentId,
          required final String studentName,
          required final int maxCaregivers,
          required final int currentCount,
          required final int remainingSlots,
          required final List<Caregiver> caregivers,
          required final List<CaregiverInvite> pendingInvites}) =
      _$StudentCaregiverSummaryImpl;

  factory _StudentCaregiverSummary.fromJson(Map<String, dynamic> json) =
      _$StudentCaregiverSummaryImpl.fromJson;

  @override
  String get studentId;
  @override
  String get studentName;
  @override
  int get maxCaregivers;
  @override
  int get currentCount;
  @override
  int get remainingSlots;
  @override
  List<Caregiver> get caregivers;
  @override
  List<CaregiverInvite> get pendingInvites;

  /// Create a copy of StudentCaregiverSummary
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$StudentCaregiverSummaryImplCopyWith<_$StudentCaregiverSummaryImpl>
      get copyWith => throw _privateConstructorUsedError;
}

CaregiverLimitInfo _$CaregiverLimitInfoFromJson(Map<String, dynamic> json) {
  return _CaregiverLimitInfo.fromJson(json);
}

/// @nodoc
mixin _$CaregiverLimitInfo {
  String get studentId => throw _privateConstructorUsedError;
  int get maxCaregivers => throw _privateConstructorUsedError;
  int get currentCount => throw _privateConstructorUsedError;
  int get remainingSlots => throw _privateConstructorUsedError;
  bool get canAddMore => throw _privateConstructorUsedError;

  /// Serializes this CaregiverLimitInfo to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CaregiverLimitInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CaregiverLimitInfoCopyWith<CaregiverLimitInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CaregiverLimitInfoCopyWith<$Res> {
  factory $CaregiverLimitInfoCopyWith(
          CaregiverLimitInfo value, $Res Function(CaregiverLimitInfo) then) =
      _$CaregiverLimitInfoCopyWithImpl<$Res, CaregiverLimitInfo>;
  @useResult
  $Res call(
      {String studentId,
      int maxCaregivers,
      int currentCount,
      int remainingSlots,
      bool canAddMore});
}

/// @nodoc
class _$CaregiverLimitInfoCopyWithImpl<$Res, $Val extends CaregiverLimitInfo>
    implements $CaregiverLimitInfoCopyWith<$Res> {
  _$CaregiverLimitInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CaregiverLimitInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? studentId = null,
    Object? maxCaregivers = null,
    Object? currentCount = null,
    Object? remainingSlots = null,
    Object? canAddMore = null,
  }) {
    return _then(_value.copyWith(
      studentId: null == studentId
          ? _value.studentId
          : studentId // ignore: cast_nullable_to_non_nullable
              as String,
      maxCaregivers: null == maxCaregivers
          ? _value.maxCaregivers
          : maxCaregivers // ignore: cast_nullable_to_non_nullable
              as int,
      currentCount: null == currentCount
          ? _value.currentCount
          : currentCount // ignore: cast_nullable_to_non_nullable
              as int,
      remainingSlots: null == remainingSlots
          ? _value.remainingSlots
          : remainingSlots // ignore: cast_nullable_to_non_nullable
              as int,
      canAddMore: null == canAddMore
          ? _value.canAddMore
          : canAddMore // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CaregiverLimitInfoImplCopyWith<$Res>
    implements $CaregiverLimitInfoCopyWith<$Res> {
  factory _$$CaregiverLimitInfoImplCopyWith(_$CaregiverLimitInfoImpl value,
          $Res Function(_$CaregiverLimitInfoImpl) then) =
      __$$CaregiverLimitInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String studentId,
      int maxCaregivers,
      int currentCount,
      int remainingSlots,
      bool canAddMore});
}

/// @nodoc
class __$$CaregiverLimitInfoImplCopyWithImpl<$Res>
    extends _$CaregiverLimitInfoCopyWithImpl<$Res, _$CaregiverLimitInfoImpl>
    implements _$$CaregiverLimitInfoImplCopyWith<$Res> {
  __$$CaregiverLimitInfoImplCopyWithImpl(_$CaregiverLimitInfoImpl _value,
      $Res Function(_$CaregiverLimitInfoImpl) _then)
      : super(_value, _then);

  /// Create a copy of CaregiverLimitInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? studentId = null,
    Object? maxCaregivers = null,
    Object? currentCount = null,
    Object? remainingSlots = null,
    Object? canAddMore = null,
  }) {
    return _then(_$CaregiverLimitInfoImpl(
      studentId: null == studentId
          ? _value.studentId
          : studentId // ignore: cast_nullable_to_non_nullable
              as String,
      maxCaregivers: null == maxCaregivers
          ? _value.maxCaregivers
          : maxCaregivers // ignore: cast_nullable_to_non_nullable
              as int,
      currentCount: null == currentCount
          ? _value.currentCount
          : currentCount // ignore: cast_nullable_to_non_nullable
              as int,
      remainingSlots: null == remainingSlots
          ? _value.remainingSlots
          : remainingSlots // ignore: cast_nullable_to_non_nullable
              as int,
      canAddMore: null == canAddMore
          ? _value.canAddMore
          : canAddMore // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CaregiverLimitInfoImpl implements _CaregiverLimitInfo {
  const _$CaregiverLimitInfoImpl(
      {required this.studentId,
      required this.maxCaregivers,
      required this.currentCount,
      required this.remainingSlots,
      required this.canAddMore});

  factory _$CaregiverLimitInfoImpl.fromJson(Map<String, dynamic> json) =>
      _$$CaregiverLimitInfoImplFromJson(json);

  @override
  final String studentId;
  @override
  final int maxCaregivers;
  @override
  final int currentCount;
  @override
  final int remainingSlots;
  @override
  final bool canAddMore;

  @override
  String toString() {
    return 'CaregiverLimitInfo(studentId: $studentId, maxCaregivers: $maxCaregivers, currentCount: $currentCount, remainingSlots: $remainingSlots, canAddMore: $canAddMore)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CaregiverLimitInfoImpl &&
            (identical(other.studentId, studentId) ||
                other.studentId == studentId) &&
            (identical(other.maxCaregivers, maxCaregivers) ||
                other.maxCaregivers == maxCaregivers) &&
            (identical(other.currentCount, currentCount) ||
                other.currentCount == currentCount) &&
            (identical(other.remainingSlots, remainingSlots) ||
                other.remainingSlots == remainingSlots) &&
            (identical(other.canAddMore, canAddMore) ||
                other.canAddMore == canAddMore));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, studentId, maxCaregivers,
      currentCount, remainingSlots, canAddMore);

  /// Create a copy of CaregiverLimitInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CaregiverLimitInfoImplCopyWith<_$CaregiverLimitInfoImpl> get copyWith =>
      __$$CaregiverLimitInfoImplCopyWithImpl<_$CaregiverLimitInfoImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CaregiverLimitInfoImplToJson(
      this,
    );
  }
}

abstract class _CaregiverLimitInfo implements CaregiverLimitInfo {
  const factory _CaregiverLimitInfo(
      {required final String studentId,
      required final int maxCaregivers,
      required final int currentCount,
      required final int remainingSlots,
      required final bool canAddMore}) = _$CaregiverLimitInfoImpl;

  factory _CaregiverLimitInfo.fromJson(Map<String, dynamic> json) =
      _$CaregiverLimitInfoImpl.fromJson;

  @override
  String get studentId;
  @override
  int get maxCaregivers;
  @override
  int get currentCount;
  @override
  int get remainingSlots;
  @override
  bool get canAddMore;

  /// Create a copy of CaregiverLimitInfo
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CaregiverLimitInfoImplCopyWith<_$CaregiverLimitInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

CreateCaregiverInviteRequest _$CreateCaregiverInviteRequestFromJson(
    Map<String, dynamic> json) {
  return _CreateCaregiverInviteRequest.fromJson(json);
}

/// @nodoc
mixin _$CreateCaregiverInviteRequest {
  String get studentId => throw _privateConstructorUsedError;
  String get caregiverEmail => throw _privateConstructorUsedError;
  String? get caregiverName => throw _privateConstructorUsedError;
  CaregiverRelationship? get relationship => throw _privateConstructorUsedError;
  CaregiverPermissions? get permissions => throw _privateConstructorUsedError;
  String? get message => throw _privateConstructorUsedError;

  /// Serializes this CreateCaregiverInviteRequest to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CreateCaregiverInviteRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CreateCaregiverInviteRequestCopyWith<CreateCaregiverInviteRequest>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CreateCaregiverInviteRequestCopyWith<$Res> {
  factory $CreateCaregiverInviteRequestCopyWith(
          CreateCaregiverInviteRequest value,
          $Res Function(CreateCaregiverInviteRequest) then) =
      _$CreateCaregiverInviteRequestCopyWithImpl<$Res,
          CreateCaregiverInviteRequest>;
  @useResult
  $Res call(
      {String studentId,
      String caregiverEmail,
      String? caregiverName,
      CaregiverRelationship? relationship,
      CaregiverPermissions? permissions,
      String? message});

  $CaregiverPermissionsCopyWith<$Res>? get permissions;
}

/// @nodoc
class _$CreateCaregiverInviteRequestCopyWithImpl<$Res,
        $Val extends CreateCaregiverInviteRequest>
    implements $CreateCaregiverInviteRequestCopyWith<$Res> {
  _$CreateCaregiverInviteRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CreateCaregiverInviteRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? studentId = null,
    Object? caregiverEmail = null,
    Object? caregiverName = freezed,
    Object? relationship = freezed,
    Object? permissions = freezed,
    Object? message = freezed,
  }) {
    return _then(_value.copyWith(
      studentId: null == studentId
          ? _value.studentId
          : studentId // ignore: cast_nullable_to_non_nullable
              as String,
      caregiverEmail: null == caregiverEmail
          ? _value.caregiverEmail
          : caregiverEmail // ignore: cast_nullable_to_non_nullable
              as String,
      caregiverName: freezed == caregiverName
          ? _value.caregiverName
          : caregiverName // ignore: cast_nullable_to_non_nullable
              as String?,
      relationship: freezed == relationship
          ? _value.relationship
          : relationship // ignore: cast_nullable_to_non_nullable
              as CaregiverRelationship?,
      permissions: freezed == permissions
          ? _value.permissions
          : permissions // ignore: cast_nullable_to_non_nullable
              as CaregiverPermissions?,
      message: freezed == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }

  /// Create a copy of CreateCaregiverInviteRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $CaregiverPermissionsCopyWith<$Res>? get permissions {
    if (_value.permissions == null) {
      return null;
    }

    return $CaregiverPermissionsCopyWith<$Res>(_value.permissions!, (value) {
      return _then(_value.copyWith(permissions: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$CreateCaregiverInviteRequestImplCopyWith<$Res>
    implements $CreateCaregiverInviteRequestCopyWith<$Res> {
  factory _$$CreateCaregiverInviteRequestImplCopyWith(
          _$CreateCaregiverInviteRequestImpl value,
          $Res Function(_$CreateCaregiverInviteRequestImpl) then) =
      __$$CreateCaregiverInviteRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String studentId,
      String caregiverEmail,
      String? caregiverName,
      CaregiverRelationship? relationship,
      CaregiverPermissions? permissions,
      String? message});

  @override
  $CaregiverPermissionsCopyWith<$Res>? get permissions;
}

/// @nodoc
class __$$CreateCaregiverInviteRequestImplCopyWithImpl<$Res>
    extends _$CreateCaregiverInviteRequestCopyWithImpl<$Res,
        _$CreateCaregiverInviteRequestImpl>
    implements _$$CreateCaregiverInviteRequestImplCopyWith<$Res> {
  __$$CreateCaregiverInviteRequestImplCopyWithImpl(
      _$CreateCaregiverInviteRequestImpl _value,
      $Res Function(_$CreateCaregiverInviteRequestImpl) _then)
      : super(_value, _then);

  /// Create a copy of CreateCaregiverInviteRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? studentId = null,
    Object? caregiverEmail = null,
    Object? caregiverName = freezed,
    Object? relationship = freezed,
    Object? permissions = freezed,
    Object? message = freezed,
  }) {
    return _then(_$CreateCaregiverInviteRequestImpl(
      studentId: null == studentId
          ? _value.studentId
          : studentId // ignore: cast_nullable_to_non_nullable
              as String,
      caregiverEmail: null == caregiverEmail
          ? _value.caregiverEmail
          : caregiverEmail // ignore: cast_nullable_to_non_nullable
              as String,
      caregiverName: freezed == caregiverName
          ? _value.caregiverName
          : caregiverName // ignore: cast_nullable_to_non_nullable
              as String?,
      relationship: freezed == relationship
          ? _value.relationship
          : relationship // ignore: cast_nullable_to_non_nullable
              as CaregiverRelationship?,
      permissions: freezed == permissions
          ? _value.permissions
          : permissions // ignore: cast_nullable_to_non_nullable
              as CaregiverPermissions?,
      message: freezed == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CreateCaregiverInviteRequestImpl
    implements _CreateCaregiverInviteRequest {
  const _$CreateCaregiverInviteRequestImpl(
      {required this.studentId,
      required this.caregiverEmail,
      this.caregiverName,
      this.relationship,
      this.permissions,
      this.message});

  factory _$CreateCaregiverInviteRequestImpl.fromJson(
          Map<String, dynamic> json) =>
      _$$CreateCaregiverInviteRequestImplFromJson(json);

  @override
  final String studentId;
  @override
  final String caregiverEmail;
  @override
  final String? caregiverName;
  @override
  final CaregiverRelationship? relationship;
  @override
  final CaregiverPermissions? permissions;
  @override
  final String? message;

  @override
  String toString() {
    return 'CreateCaregiverInviteRequest(studentId: $studentId, caregiverEmail: $caregiverEmail, caregiverName: $caregiverName, relationship: $relationship, permissions: $permissions, message: $message)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CreateCaregiverInviteRequestImpl &&
            (identical(other.studentId, studentId) ||
                other.studentId == studentId) &&
            (identical(other.caregiverEmail, caregiverEmail) ||
                other.caregiverEmail == caregiverEmail) &&
            (identical(other.caregiverName, caregiverName) ||
                other.caregiverName == caregiverName) &&
            (identical(other.relationship, relationship) ||
                other.relationship == relationship) &&
            (identical(other.permissions, permissions) ||
                other.permissions == permissions) &&
            (identical(other.message, message) || other.message == message));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, studentId, caregiverEmail,
      caregiverName, relationship, permissions, message);

  /// Create a copy of CreateCaregiverInviteRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CreateCaregiverInviteRequestImplCopyWith<
          _$CreateCaregiverInviteRequestImpl>
      get copyWith => __$$CreateCaregiverInviteRequestImplCopyWithImpl<
          _$CreateCaregiverInviteRequestImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CreateCaregiverInviteRequestImplToJson(
      this,
    );
  }
}

abstract class _CreateCaregiverInviteRequest
    implements CreateCaregiverInviteRequest {
  const factory _CreateCaregiverInviteRequest(
      {required final String studentId,
      required final String caregiverEmail,
      final String? caregiverName,
      final CaregiverRelationship? relationship,
      final CaregiverPermissions? permissions,
      final String? message}) = _$CreateCaregiverInviteRequestImpl;

  factory _CreateCaregiverInviteRequest.fromJson(Map<String, dynamic> json) =
      _$CreateCaregiverInviteRequestImpl.fromJson;

  @override
  String get studentId;
  @override
  String get caregiverEmail;
  @override
  String? get caregiverName;
  @override
  CaregiverRelationship? get relationship;
  @override
  CaregiverPermissions? get permissions;
  @override
  String? get message;

  /// Create a copy of CreateCaregiverInviteRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CreateCaregiverInviteRequestImplCopyWith<
          _$CreateCaregiverInviteRequestImpl>
      get copyWith => throw _privateConstructorUsedError;
}

CaregiverInviteResponse _$CaregiverInviteResponseFromJson(
    Map<String, dynamic> json) {
  return _CaregiverInviteResponse.fromJson(json);
}

/// @nodoc
mixin _$CaregiverInviteResponse {
  String get inviteId => throw _privateConstructorUsedError;
  String get inviteCode => throw _privateConstructorUsedError;
  String get inviteUrl => throw _privateConstructorUsedError;
  String get expiresAt => throw _privateConstructorUsedError;

  /// Serializes this CaregiverInviteResponse to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CaregiverInviteResponse
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CaregiverInviteResponseCopyWith<CaregiverInviteResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CaregiverInviteResponseCopyWith<$Res> {
  factory $CaregiverInviteResponseCopyWith(CaregiverInviteResponse value,
          $Res Function(CaregiverInviteResponse) then) =
      _$CaregiverInviteResponseCopyWithImpl<$Res, CaregiverInviteResponse>;
  @useResult
  $Res call(
      {String inviteId, String inviteCode, String inviteUrl, String expiresAt});
}

/// @nodoc
class _$CaregiverInviteResponseCopyWithImpl<$Res,
        $Val extends CaregiverInviteResponse>
    implements $CaregiverInviteResponseCopyWith<$Res> {
  _$CaregiverInviteResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CaregiverInviteResponse
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? inviteId = null,
    Object? inviteCode = null,
    Object? inviteUrl = null,
    Object? expiresAt = null,
  }) {
    return _then(_value.copyWith(
      inviteId: null == inviteId
          ? _value.inviteId
          : inviteId // ignore: cast_nullable_to_non_nullable
              as String,
      inviteCode: null == inviteCode
          ? _value.inviteCode
          : inviteCode // ignore: cast_nullable_to_non_nullable
              as String,
      inviteUrl: null == inviteUrl
          ? _value.inviteUrl
          : inviteUrl // ignore: cast_nullable_to_non_nullable
              as String,
      expiresAt: null == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CaregiverInviteResponseImplCopyWith<$Res>
    implements $CaregiverInviteResponseCopyWith<$Res> {
  factory _$$CaregiverInviteResponseImplCopyWith(
          _$CaregiverInviteResponseImpl value,
          $Res Function(_$CaregiverInviteResponseImpl) then) =
      __$$CaregiverInviteResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String inviteId, String inviteCode, String inviteUrl, String expiresAt});
}

/// @nodoc
class __$$CaregiverInviteResponseImplCopyWithImpl<$Res>
    extends _$CaregiverInviteResponseCopyWithImpl<$Res,
        _$CaregiverInviteResponseImpl>
    implements _$$CaregiverInviteResponseImplCopyWith<$Res> {
  __$$CaregiverInviteResponseImplCopyWithImpl(
      _$CaregiverInviteResponseImpl _value,
      $Res Function(_$CaregiverInviteResponseImpl) _then)
      : super(_value, _then);

  /// Create a copy of CaregiverInviteResponse
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? inviteId = null,
    Object? inviteCode = null,
    Object? inviteUrl = null,
    Object? expiresAt = null,
  }) {
    return _then(_$CaregiverInviteResponseImpl(
      inviteId: null == inviteId
          ? _value.inviteId
          : inviteId // ignore: cast_nullable_to_non_nullable
              as String,
      inviteCode: null == inviteCode
          ? _value.inviteCode
          : inviteCode // ignore: cast_nullable_to_non_nullable
              as String,
      inviteUrl: null == inviteUrl
          ? _value.inviteUrl
          : inviteUrl // ignore: cast_nullable_to_non_nullable
              as String,
      expiresAt: null == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CaregiverInviteResponseImpl implements _CaregiverInviteResponse {
  const _$CaregiverInviteResponseImpl(
      {required this.inviteId,
      required this.inviteCode,
      required this.inviteUrl,
      required this.expiresAt});

  factory _$CaregiverInviteResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$CaregiverInviteResponseImplFromJson(json);

  @override
  final String inviteId;
  @override
  final String inviteCode;
  @override
  final String inviteUrl;
  @override
  final String expiresAt;

  @override
  String toString() {
    return 'CaregiverInviteResponse(inviteId: $inviteId, inviteCode: $inviteCode, inviteUrl: $inviteUrl, expiresAt: $expiresAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CaregiverInviteResponseImpl &&
            (identical(other.inviteId, inviteId) ||
                other.inviteId == inviteId) &&
            (identical(other.inviteCode, inviteCode) ||
                other.inviteCode == inviteCode) &&
            (identical(other.inviteUrl, inviteUrl) ||
                other.inviteUrl == inviteUrl) &&
            (identical(other.expiresAt, expiresAt) ||
                other.expiresAt == expiresAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, inviteId, inviteCode, inviteUrl, expiresAt);

  /// Create a copy of CaregiverInviteResponse
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CaregiverInviteResponseImplCopyWith<_$CaregiverInviteResponseImpl>
      get copyWith => __$$CaregiverInviteResponseImplCopyWithImpl<
          _$CaregiverInviteResponseImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CaregiverInviteResponseImplToJson(
      this,
    );
  }
}

abstract class _CaregiverInviteResponse implements CaregiverInviteResponse {
  const factory _CaregiverInviteResponse(
      {required final String inviteId,
      required final String inviteCode,
      required final String inviteUrl,
      required final String expiresAt}) = _$CaregiverInviteResponseImpl;

  factory _CaregiverInviteResponse.fromJson(Map<String, dynamic> json) =
      _$CaregiverInviteResponseImpl.fromJson;

  @override
  String get inviteId;
  @override
  String get inviteCode;
  @override
  String get inviteUrl;
  @override
  String get expiresAt;

  /// Create a copy of CaregiverInviteResponse
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CaregiverInviteResponseImplCopyWith<_$CaregiverInviteResponseImpl>
      get copyWith => throw _privateConstructorUsedError;
}

UpdateCaregiverPermissionsRequest _$UpdateCaregiverPermissionsRequestFromJson(
    Map<String, dynamic> json) {
  return _UpdateCaregiverPermissionsRequest.fromJson(json);
}

/// @nodoc
mixin _$UpdateCaregiverPermissionsRequest {
  String get caregiverId => throw _privateConstructorUsedError;
  String get studentId => throw _privateConstructorUsedError;
  CaregiverPermissions get permissions => throw _privateConstructorUsedError;

  /// Serializes this UpdateCaregiverPermissionsRequest to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of UpdateCaregiverPermissionsRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $UpdateCaregiverPermissionsRequestCopyWith<UpdateCaregiverPermissionsRequest>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $UpdateCaregiverPermissionsRequestCopyWith<$Res> {
  factory $UpdateCaregiverPermissionsRequestCopyWith(
          UpdateCaregiverPermissionsRequest value,
          $Res Function(UpdateCaregiverPermissionsRequest) then) =
      _$UpdateCaregiverPermissionsRequestCopyWithImpl<$Res,
          UpdateCaregiverPermissionsRequest>;
  @useResult
  $Res call(
      {String caregiverId, String studentId, CaregiverPermissions permissions});

  $CaregiverPermissionsCopyWith<$Res> get permissions;
}

/// @nodoc
class _$UpdateCaregiverPermissionsRequestCopyWithImpl<$Res,
        $Val extends UpdateCaregiverPermissionsRequest>
    implements $UpdateCaregiverPermissionsRequestCopyWith<$Res> {
  _$UpdateCaregiverPermissionsRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of UpdateCaregiverPermissionsRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? caregiverId = null,
    Object? studentId = null,
    Object? permissions = null,
  }) {
    return _then(_value.copyWith(
      caregiverId: null == caregiverId
          ? _value.caregiverId
          : caregiverId // ignore: cast_nullable_to_non_nullable
              as String,
      studentId: null == studentId
          ? _value.studentId
          : studentId // ignore: cast_nullable_to_non_nullable
              as String,
      permissions: null == permissions
          ? _value.permissions
          : permissions // ignore: cast_nullable_to_non_nullable
              as CaregiverPermissions,
    ) as $Val);
  }

  /// Create a copy of UpdateCaregiverPermissionsRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $CaregiverPermissionsCopyWith<$Res> get permissions {
    return $CaregiverPermissionsCopyWith<$Res>(_value.permissions, (value) {
      return _then(_value.copyWith(permissions: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$UpdateCaregiverPermissionsRequestImplCopyWith<$Res>
    implements $UpdateCaregiverPermissionsRequestCopyWith<$Res> {
  factory _$$UpdateCaregiverPermissionsRequestImplCopyWith(
          _$UpdateCaregiverPermissionsRequestImpl value,
          $Res Function(_$UpdateCaregiverPermissionsRequestImpl) then) =
      __$$UpdateCaregiverPermissionsRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String caregiverId, String studentId, CaregiverPermissions permissions});

  @override
  $CaregiverPermissionsCopyWith<$Res> get permissions;
}

/// @nodoc
class __$$UpdateCaregiverPermissionsRequestImplCopyWithImpl<$Res>
    extends _$UpdateCaregiverPermissionsRequestCopyWithImpl<$Res,
        _$UpdateCaregiverPermissionsRequestImpl>
    implements _$$UpdateCaregiverPermissionsRequestImplCopyWith<$Res> {
  __$$UpdateCaregiverPermissionsRequestImplCopyWithImpl(
      _$UpdateCaregiverPermissionsRequestImpl _value,
      $Res Function(_$UpdateCaregiverPermissionsRequestImpl) _then)
      : super(_value, _then);

  /// Create a copy of UpdateCaregiverPermissionsRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? caregiverId = null,
    Object? studentId = null,
    Object? permissions = null,
  }) {
    return _then(_$UpdateCaregiverPermissionsRequestImpl(
      caregiverId: null == caregiverId
          ? _value.caregiverId
          : caregiverId // ignore: cast_nullable_to_non_nullable
              as String,
      studentId: null == studentId
          ? _value.studentId
          : studentId // ignore: cast_nullable_to_non_nullable
              as String,
      permissions: null == permissions
          ? _value.permissions
          : permissions // ignore: cast_nullable_to_non_nullable
              as CaregiverPermissions,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$UpdateCaregiverPermissionsRequestImpl
    implements _UpdateCaregiverPermissionsRequest {
  const _$UpdateCaregiverPermissionsRequestImpl(
      {required this.caregiverId,
      required this.studentId,
      required this.permissions});

  factory _$UpdateCaregiverPermissionsRequestImpl.fromJson(
          Map<String, dynamic> json) =>
      _$$UpdateCaregiverPermissionsRequestImplFromJson(json);

  @override
  final String caregiverId;
  @override
  final String studentId;
  @override
  final CaregiverPermissions permissions;

  @override
  String toString() {
    return 'UpdateCaregiverPermissionsRequest(caregiverId: $caregiverId, studentId: $studentId, permissions: $permissions)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$UpdateCaregiverPermissionsRequestImpl &&
            (identical(other.caregiverId, caregiverId) ||
                other.caregiverId == caregiverId) &&
            (identical(other.studentId, studentId) ||
                other.studentId == studentId) &&
            (identical(other.permissions, permissions) ||
                other.permissions == permissions));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, caregiverId, studentId, permissions);

  /// Create a copy of UpdateCaregiverPermissionsRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$UpdateCaregiverPermissionsRequestImplCopyWith<
          _$UpdateCaregiverPermissionsRequestImpl>
      get copyWith => __$$UpdateCaregiverPermissionsRequestImplCopyWithImpl<
          _$UpdateCaregiverPermissionsRequestImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$UpdateCaregiverPermissionsRequestImplToJson(
      this,
    );
  }
}

abstract class _UpdateCaregiverPermissionsRequest
    implements UpdateCaregiverPermissionsRequest {
  const factory _UpdateCaregiverPermissionsRequest(
          {required final String caregiverId,
          required final String studentId,
          required final CaregiverPermissions permissions}) =
      _$UpdateCaregiverPermissionsRequestImpl;

  factory _UpdateCaregiverPermissionsRequest.fromJson(
          Map<String, dynamic> json) =
      _$UpdateCaregiverPermissionsRequestImpl.fromJson;

  @override
  String get caregiverId;
  @override
  String get studentId;
  @override
  CaregiverPermissions get permissions;

  /// Create a copy of UpdateCaregiverPermissionsRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$UpdateCaregiverPermissionsRequestImplCopyWith<
          _$UpdateCaregiverPermissionsRequestImpl>
      get copyWith => throw _privateConstructorUsedError;
}
