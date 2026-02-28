// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'tutor_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

TutorAddon _$TutorAddonFromJson(Map<String, dynamic> json) {
  return _TutorAddon.fromJson(json);
}

/// @nodoc
mixin _$TutorAddon {
  String get id => throw _privateConstructorUsedError;
  String get personaName => throw _privateConstructorUsedError;
  String get subject => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  int get priceCents => throw _privateConstructorUsedError;
  String get billingPeriod => throw _privateConstructorUsedError;
  TutorAddonStatus get status => throw _privateConstructorUsedError;
  String? get avatarUrl => throw _privateConstructorUsedError;
  List<String>? get highlights => throw _privateConstructorUsedError;
  String? get trialDaysRemaining => throw _privateConstructorUsedError;

  /// Serializes this TutorAddon to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TutorAddon
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TutorAddonCopyWith<TutorAddon> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TutorAddonCopyWith<$Res> {
  factory $TutorAddonCopyWith(
          TutorAddon value, $Res Function(TutorAddon) then) =
      _$TutorAddonCopyWithImpl<$Res, TutorAddon>;
  @useResult
  $Res call(
      {String id,
      String personaName,
      String subject,
      String description,
      int priceCents,
      String billingPeriod,
      TutorAddonStatus status,
      String? avatarUrl,
      List<String>? highlights,
      String? trialDaysRemaining});
}

/// @nodoc
class _$TutorAddonCopyWithImpl<$Res, $Val extends TutorAddon>
    implements $TutorAddonCopyWith<$Res> {
  _$TutorAddonCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TutorAddon
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? personaName = null,
    Object? subject = null,
    Object? description = null,
    Object? priceCents = null,
    Object? billingPeriod = null,
    Object? status = null,
    Object? avatarUrl = freezed,
    Object? highlights = freezed,
    Object? trialDaysRemaining = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      personaName: null == personaName
          ? _value.personaName
          : personaName // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      priceCents: null == priceCents
          ? _value.priceCents
          : priceCents // ignore: cast_nullable_to_non_nullable
              as int,
      billingPeriod: null == billingPeriod
          ? _value.billingPeriod
          : billingPeriod // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as TutorAddonStatus,
      avatarUrl: freezed == avatarUrl
          ? _value.avatarUrl
          : avatarUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      highlights: freezed == highlights
          ? _value.highlights
          : highlights // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      trialDaysRemaining: freezed == trialDaysRemaining
          ? _value.trialDaysRemaining
          : trialDaysRemaining // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TutorAddonImplCopyWith<$Res>
    implements $TutorAddonCopyWith<$Res> {
  factory _$$TutorAddonImplCopyWith(
          _$TutorAddonImpl value, $Res Function(_$TutorAddonImpl) then) =
      __$$TutorAddonImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String personaName,
      String subject,
      String description,
      int priceCents,
      String billingPeriod,
      TutorAddonStatus status,
      String? avatarUrl,
      List<String>? highlights,
      String? trialDaysRemaining});
}

/// @nodoc
class __$$TutorAddonImplCopyWithImpl<$Res>
    extends _$TutorAddonCopyWithImpl<$Res, _$TutorAddonImpl>
    implements _$$TutorAddonImplCopyWith<$Res> {
  __$$TutorAddonImplCopyWithImpl(
      _$TutorAddonImpl _value, $Res Function(_$TutorAddonImpl) _then)
      : super(_value, _then);

  /// Create a copy of TutorAddon
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? personaName = null,
    Object? subject = null,
    Object? description = null,
    Object? priceCents = null,
    Object? billingPeriod = null,
    Object? status = null,
    Object? avatarUrl = freezed,
    Object? highlights = freezed,
    Object? trialDaysRemaining = freezed,
  }) {
    return _then(_$TutorAddonImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      personaName: null == personaName
          ? _value.personaName
          : personaName // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      priceCents: null == priceCents
          ? _value.priceCents
          : priceCents // ignore: cast_nullable_to_non_nullable
              as int,
      billingPeriod: null == billingPeriod
          ? _value.billingPeriod
          : billingPeriod // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as TutorAddonStatus,
      avatarUrl: freezed == avatarUrl
          ? _value.avatarUrl
          : avatarUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      highlights: freezed == highlights
          ? _value._highlights
          : highlights // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      trialDaysRemaining: freezed == trialDaysRemaining
          ? _value.trialDaysRemaining
          : trialDaysRemaining // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TutorAddonImpl implements _TutorAddon {
  const _$TutorAddonImpl(
      {required this.id,
      required this.personaName,
      required this.subject,
      required this.description,
      required this.priceCents,
      required this.billingPeriod,
      required this.status,
      this.avatarUrl,
      final List<String>? highlights,
      this.trialDaysRemaining})
      : _highlights = highlights;

  factory _$TutorAddonImpl.fromJson(Map<String, dynamic> json) =>
      _$$TutorAddonImplFromJson(json);

  @override
  final String id;
  @override
  final String personaName;
  @override
  final String subject;
  @override
  final String description;
  @override
  final int priceCents;
  @override
  final String billingPeriod;
  @override
  final TutorAddonStatus status;
  @override
  final String? avatarUrl;
  final List<String>? _highlights;
  @override
  List<String>? get highlights {
    final value = _highlights;
    if (value == null) return null;
    if (_highlights is EqualUnmodifiableListView) return _highlights;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  final String? trialDaysRemaining;

  @override
  String toString() {
    return 'TutorAddon(id: $id, personaName: $personaName, subject: $subject, description: $description, priceCents: $priceCents, billingPeriod: $billingPeriod, status: $status, avatarUrl: $avatarUrl, highlights: $highlights, trialDaysRemaining: $trialDaysRemaining)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TutorAddonImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.personaName, personaName) ||
                other.personaName == personaName) &&
            (identical(other.subject, subject) || other.subject == subject) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.priceCents, priceCents) ||
                other.priceCents == priceCents) &&
            (identical(other.billingPeriod, billingPeriod) ||
                other.billingPeriod == billingPeriod) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.avatarUrl, avatarUrl) ||
                other.avatarUrl == avatarUrl) &&
            const DeepCollectionEquality()
                .equals(other._highlights, _highlights) &&
            (identical(other.trialDaysRemaining, trialDaysRemaining) ||
                other.trialDaysRemaining == trialDaysRemaining));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      personaName,
      subject,
      description,
      priceCents,
      billingPeriod,
      status,
      avatarUrl,
      const DeepCollectionEquality().hash(_highlights),
      trialDaysRemaining);

  /// Create a copy of TutorAddon
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TutorAddonImplCopyWith<_$TutorAddonImpl> get copyWith =>
      __$$TutorAddonImplCopyWithImpl<_$TutorAddonImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TutorAddonImplToJson(
      this,
    );
  }
}

abstract class _TutorAddon implements TutorAddon {
  const factory _TutorAddon(
      {required final String id,
      required final String personaName,
      required final String subject,
      required final String description,
      required final int priceCents,
      required final String billingPeriod,
      required final TutorAddonStatus status,
      final String? avatarUrl,
      final List<String>? highlights,
      final String? trialDaysRemaining}) = _$TutorAddonImpl;

  factory _TutorAddon.fromJson(Map<String, dynamic> json) =
      _$TutorAddonImpl.fromJson;

  @override
  String get id;
  @override
  String get personaName;
  @override
  String get subject;
  @override
  String get description;
  @override
  int get priceCents;
  @override
  String get billingPeriod;
  @override
  TutorAddonStatus get status;
  @override
  String? get avatarUrl;
  @override
  List<String>? get highlights;
  @override
  String? get trialDaysRemaining;

  /// Create a copy of TutorAddon
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TutorAddonImplCopyWith<_$TutorAddonImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TutorSession _$TutorSessionFromJson(Map<String, dynamic> json) {
  return _TutorSession.fromJson(json);
}

/// @nodoc
mixin _$TutorSession {
  String get id => throw _privateConstructorUsedError;
  String get childId => throw _privateConstructorUsedError;
  String get personaName => throw _privateConstructorUsedError;
  String get subject => throw _privateConstructorUsedError;
  int get durationMinutes => throw _privateConstructorUsedError;
  DateTime get startedAt => throw _privateConstructorUsedError;
  DateTime? get endedAt => throw _privateConstructorUsedError;
  String? get summary => throw _privateConstructorUsedError;
  int? get masteryScoreDelta => throw _privateConstructorUsedError;
  List<String>? get topicsCovered => throw _privateConstructorUsedError;
  TutorSessionStatus? get status => throw _privateConstructorUsedError;

  /// Serializes this TutorSession to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TutorSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TutorSessionCopyWith<TutorSession> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TutorSessionCopyWith<$Res> {
  factory $TutorSessionCopyWith(
          TutorSession value, $Res Function(TutorSession) then) =
      _$TutorSessionCopyWithImpl<$Res, TutorSession>;
  @useResult
  $Res call(
      {String id,
      String childId,
      String personaName,
      String subject,
      int durationMinutes,
      DateTime startedAt,
      DateTime? endedAt,
      String? summary,
      int? masteryScoreDelta,
      List<String>? topicsCovered,
      TutorSessionStatus? status});
}

/// @nodoc
class _$TutorSessionCopyWithImpl<$Res, $Val extends TutorSession>
    implements $TutorSessionCopyWith<$Res> {
  _$TutorSessionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TutorSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? childId = null,
    Object? personaName = null,
    Object? subject = null,
    Object? durationMinutes = null,
    Object? startedAt = null,
    Object? endedAt = freezed,
    Object? summary = freezed,
    Object? masteryScoreDelta = freezed,
    Object? topicsCovered = freezed,
    Object? status = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      personaName: null == personaName
          ? _value.personaName
          : personaName // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      startedAt: null == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endedAt: freezed == endedAt
          ? _value.endedAt
          : endedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      summary: freezed == summary
          ? _value.summary
          : summary // ignore: cast_nullable_to_non_nullable
              as String?,
      masteryScoreDelta: freezed == masteryScoreDelta
          ? _value.masteryScoreDelta
          : masteryScoreDelta // ignore: cast_nullable_to_non_nullable
              as int?,
      topicsCovered: freezed == topicsCovered
          ? _value.topicsCovered
          : topicsCovered // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as TutorSessionStatus?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TutorSessionImplCopyWith<$Res>
    implements $TutorSessionCopyWith<$Res> {
  factory _$$TutorSessionImplCopyWith(
          _$TutorSessionImpl value, $Res Function(_$TutorSessionImpl) then) =
      __$$TutorSessionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String childId,
      String personaName,
      String subject,
      int durationMinutes,
      DateTime startedAt,
      DateTime? endedAt,
      String? summary,
      int? masteryScoreDelta,
      List<String>? topicsCovered,
      TutorSessionStatus? status});
}

/// @nodoc
class __$$TutorSessionImplCopyWithImpl<$Res>
    extends _$TutorSessionCopyWithImpl<$Res, _$TutorSessionImpl>
    implements _$$TutorSessionImplCopyWith<$Res> {
  __$$TutorSessionImplCopyWithImpl(
      _$TutorSessionImpl _value, $Res Function(_$TutorSessionImpl) _then)
      : super(_value, _then);

  /// Create a copy of TutorSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? childId = null,
    Object? personaName = null,
    Object? subject = null,
    Object? durationMinutes = null,
    Object? startedAt = null,
    Object? endedAt = freezed,
    Object? summary = freezed,
    Object? masteryScoreDelta = freezed,
    Object? topicsCovered = freezed,
    Object? status = freezed,
  }) {
    return _then(_$TutorSessionImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      personaName: null == personaName
          ? _value.personaName
          : personaName // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      startedAt: null == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endedAt: freezed == endedAt
          ? _value.endedAt
          : endedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      summary: freezed == summary
          ? _value.summary
          : summary // ignore: cast_nullable_to_non_nullable
              as String?,
      masteryScoreDelta: freezed == masteryScoreDelta
          ? _value.masteryScoreDelta
          : masteryScoreDelta // ignore: cast_nullable_to_non_nullable
              as int?,
      topicsCovered: freezed == topicsCovered
          ? _value._topicsCovered
          : topicsCovered // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as TutorSessionStatus?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TutorSessionImpl implements _TutorSession {
  const _$TutorSessionImpl(
      {required this.id,
      required this.childId,
      required this.personaName,
      required this.subject,
      required this.durationMinutes,
      required this.startedAt,
      this.endedAt,
      this.summary,
      this.masteryScoreDelta,
      final List<String>? topicsCovered,
      this.status})
      : _topicsCovered = topicsCovered;

  factory _$TutorSessionImpl.fromJson(Map<String, dynamic> json) =>
      _$$TutorSessionImplFromJson(json);

  @override
  final String id;
  @override
  final String childId;
  @override
  final String personaName;
  @override
  final String subject;
  @override
  final int durationMinutes;
  @override
  final DateTime startedAt;
  @override
  final DateTime? endedAt;
  @override
  final String? summary;
  @override
  final int? masteryScoreDelta;
  final List<String>? _topicsCovered;
  @override
  List<String>? get topicsCovered {
    final value = _topicsCovered;
    if (value == null) return null;
    if (_topicsCovered is EqualUnmodifiableListView) return _topicsCovered;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  final TutorSessionStatus? status;

  @override
  String toString() {
    return 'TutorSession(id: $id, childId: $childId, personaName: $personaName, subject: $subject, durationMinutes: $durationMinutes, startedAt: $startedAt, endedAt: $endedAt, summary: $summary, masteryScoreDelta: $masteryScoreDelta, topicsCovered: $topicsCovered, status: $status)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TutorSessionImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.personaName, personaName) ||
                other.personaName == personaName) &&
            (identical(other.subject, subject) || other.subject == subject) &&
            (identical(other.durationMinutes, durationMinutes) ||
                other.durationMinutes == durationMinutes) &&
            (identical(other.startedAt, startedAt) ||
                other.startedAt == startedAt) &&
            (identical(other.endedAt, endedAt) || other.endedAt == endedAt) &&
            (identical(other.summary, summary) || other.summary == summary) &&
            (identical(other.masteryScoreDelta, masteryScoreDelta) ||
                other.masteryScoreDelta == masteryScoreDelta) &&
            const DeepCollectionEquality()
                .equals(other._topicsCovered, _topicsCovered) &&
            (identical(other.status, status) || other.status == status));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      childId,
      personaName,
      subject,
      durationMinutes,
      startedAt,
      endedAt,
      summary,
      masteryScoreDelta,
      const DeepCollectionEquality().hash(_topicsCovered),
      status);

  /// Create a copy of TutorSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TutorSessionImplCopyWith<_$TutorSessionImpl> get copyWith =>
      __$$TutorSessionImplCopyWithImpl<_$TutorSessionImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TutorSessionImplToJson(
      this,
    );
  }
}

abstract class _TutorSession implements TutorSession {
  const factory _TutorSession(
      {required final String id,
      required final String childId,
      required final String personaName,
      required final String subject,
      required final int durationMinutes,
      required final DateTime startedAt,
      final DateTime? endedAt,
      final String? summary,
      final int? masteryScoreDelta,
      final List<String>? topicsCovered,
      final TutorSessionStatus? status}) = _$TutorSessionImpl;

  factory _TutorSession.fromJson(Map<String, dynamic> json) =
      _$TutorSessionImpl.fromJson;

  @override
  String get id;
  @override
  String get childId;
  @override
  String get personaName;
  @override
  String get subject;
  @override
  int get durationMinutes;
  @override
  DateTime get startedAt;
  @override
  DateTime? get endedAt;
  @override
  String? get summary;
  @override
  int? get masteryScoreDelta;
  @override
  List<String>? get topicsCovered;
  @override
  TutorSessionStatus? get status;

  /// Create a copy of TutorSession
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TutorSessionImplCopyWith<_$TutorSessionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TutorSessionReport _$TutorSessionReportFromJson(Map<String, dynamic> json) {
  return _TutorSessionReport.fromJson(json);
}

/// @nodoc
mixin _$TutorSessionReport {
  String get sessionId => throw _privateConstructorUsedError;
  String get childId => throw _privateConstructorUsedError;
  String get personaName => throw _privateConstructorUsedError;
  String get subject => throw _privateConstructorUsedError;
  int get durationMinutes => throw _privateConstructorUsedError;
  DateTime get startedAt => throw _privateConstructorUsedError;
  DateTime? get endedAt => throw _privateConstructorUsedError;
  String get summary => throw _privateConstructorUsedError;
  List<String> get topicsCovered => throw _privateConstructorUsedError;
  List<String> get skillsPracticed => throw _privateConstructorUsedError;
  int? get masteryScoreBefore => throw _privateConstructorUsedError;
  int? get masteryScoreAfter => throw _privateConstructorUsedError;
  String? get aiNotes => throw _privateConstructorUsedError;
  String? get parentRecommendation => throw _privateConstructorUsedError;

  /// Serializes this TutorSessionReport to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TutorSessionReport
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TutorSessionReportCopyWith<TutorSessionReport> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TutorSessionReportCopyWith<$Res> {
  factory $TutorSessionReportCopyWith(
          TutorSessionReport value, $Res Function(TutorSessionReport) then) =
      _$TutorSessionReportCopyWithImpl<$Res, TutorSessionReport>;
  @useResult
  $Res call(
      {String sessionId,
      String childId,
      String personaName,
      String subject,
      int durationMinutes,
      DateTime startedAt,
      DateTime? endedAt,
      String summary,
      List<String> topicsCovered,
      List<String> skillsPracticed,
      int? masteryScoreBefore,
      int? masteryScoreAfter,
      String? aiNotes,
      String? parentRecommendation});
}

/// @nodoc
class _$TutorSessionReportCopyWithImpl<$Res, $Val extends TutorSessionReport>
    implements $TutorSessionReportCopyWith<$Res> {
  _$TutorSessionReportCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TutorSessionReport
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessionId = null,
    Object? childId = null,
    Object? personaName = null,
    Object? subject = null,
    Object? durationMinutes = null,
    Object? startedAt = null,
    Object? endedAt = freezed,
    Object? summary = null,
    Object? topicsCovered = null,
    Object? skillsPracticed = null,
    Object? masteryScoreBefore = freezed,
    Object? masteryScoreAfter = freezed,
    Object? aiNotes = freezed,
    Object? parentRecommendation = freezed,
  }) {
    return _then(_value.copyWith(
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      personaName: null == personaName
          ? _value.personaName
          : personaName // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      startedAt: null == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endedAt: freezed == endedAt
          ? _value.endedAt
          : endedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      summary: null == summary
          ? _value.summary
          : summary // ignore: cast_nullable_to_non_nullable
              as String,
      topicsCovered: null == topicsCovered
          ? _value.topicsCovered
          : topicsCovered // ignore: cast_nullable_to_non_nullable
              as List<String>,
      skillsPracticed: null == skillsPracticed
          ? _value.skillsPracticed
          : skillsPracticed // ignore: cast_nullable_to_non_nullable
              as List<String>,
      masteryScoreBefore: freezed == masteryScoreBefore
          ? _value.masteryScoreBefore
          : masteryScoreBefore // ignore: cast_nullable_to_non_nullable
              as int?,
      masteryScoreAfter: freezed == masteryScoreAfter
          ? _value.masteryScoreAfter
          : masteryScoreAfter // ignore: cast_nullable_to_non_nullable
              as int?,
      aiNotes: freezed == aiNotes
          ? _value.aiNotes
          : aiNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      parentRecommendation: freezed == parentRecommendation
          ? _value.parentRecommendation
          : parentRecommendation // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TutorSessionReportImplCopyWith<$Res>
    implements $TutorSessionReportCopyWith<$Res> {
  factory _$$TutorSessionReportImplCopyWith(_$TutorSessionReportImpl value,
          $Res Function(_$TutorSessionReportImpl) then) =
      __$$TutorSessionReportImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String sessionId,
      String childId,
      String personaName,
      String subject,
      int durationMinutes,
      DateTime startedAt,
      DateTime? endedAt,
      String summary,
      List<String> topicsCovered,
      List<String> skillsPracticed,
      int? masteryScoreBefore,
      int? masteryScoreAfter,
      String? aiNotes,
      String? parentRecommendation});
}

/// @nodoc
class __$$TutorSessionReportImplCopyWithImpl<$Res>
    extends _$TutorSessionReportCopyWithImpl<$Res, _$TutorSessionReportImpl>
    implements _$$TutorSessionReportImplCopyWith<$Res> {
  __$$TutorSessionReportImplCopyWithImpl(_$TutorSessionReportImpl _value,
      $Res Function(_$TutorSessionReportImpl) _then)
      : super(_value, _then);

  /// Create a copy of TutorSessionReport
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessionId = null,
    Object? childId = null,
    Object? personaName = null,
    Object? subject = null,
    Object? durationMinutes = null,
    Object? startedAt = null,
    Object? endedAt = freezed,
    Object? summary = null,
    Object? topicsCovered = null,
    Object? skillsPracticed = null,
    Object? masteryScoreBefore = freezed,
    Object? masteryScoreAfter = freezed,
    Object? aiNotes = freezed,
    Object? parentRecommendation = freezed,
  }) {
    return _then(_$TutorSessionReportImpl(
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      personaName: null == personaName
          ? _value.personaName
          : personaName // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      startedAt: null == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endedAt: freezed == endedAt
          ? _value.endedAt
          : endedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      summary: null == summary
          ? _value.summary
          : summary // ignore: cast_nullable_to_non_nullable
              as String,
      topicsCovered: null == topicsCovered
          ? _value._topicsCovered
          : topicsCovered // ignore: cast_nullable_to_non_nullable
              as List<String>,
      skillsPracticed: null == skillsPracticed
          ? _value._skillsPracticed
          : skillsPracticed // ignore: cast_nullable_to_non_nullable
              as List<String>,
      masteryScoreBefore: freezed == masteryScoreBefore
          ? _value.masteryScoreBefore
          : masteryScoreBefore // ignore: cast_nullable_to_non_nullable
              as int?,
      masteryScoreAfter: freezed == masteryScoreAfter
          ? _value.masteryScoreAfter
          : masteryScoreAfter // ignore: cast_nullable_to_non_nullable
              as int?,
      aiNotes: freezed == aiNotes
          ? _value.aiNotes
          : aiNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      parentRecommendation: freezed == parentRecommendation
          ? _value.parentRecommendation
          : parentRecommendation // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TutorSessionReportImpl implements _TutorSessionReport {
  const _$TutorSessionReportImpl(
      {required this.sessionId,
      required this.childId,
      required this.personaName,
      required this.subject,
      required this.durationMinutes,
      required this.startedAt,
      this.endedAt,
      required this.summary,
      required final List<String> topicsCovered,
      required final List<String> skillsPracticed,
      this.masteryScoreBefore,
      this.masteryScoreAfter,
      this.aiNotes,
      this.parentRecommendation})
      : _topicsCovered = topicsCovered,
        _skillsPracticed = skillsPracticed;

  factory _$TutorSessionReportImpl.fromJson(Map<String, dynamic> json) =>
      _$$TutorSessionReportImplFromJson(json);

  @override
  final String sessionId;
  @override
  final String childId;
  @override
  final String personaName;
  @override
  final String subject;
  @override
  final int durationMinutes;
  @override
  final DateTime startedAt;
  @override
  final DateTime? endedAt;
  @override
  final String summary;
  final List<String> _topicsCovered;
  @override
  List<String> get topicsCovered {
    if (_topicsCovered is EqualUnmodifiableListView) return _topicsCovered;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_topicsCovered);
  }

  final List<String> _skillsPracticed;
  @override
  List<String> get skillsPracticed {
    if (_skillsPracticed is EqualUnmodifiableListView) return _skillsPracticed;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_skillsPracticed);
  }

  @override
  final int? masteryScoreBefore;
  @override
  final int? masteryScoreAfter;
  @override
  final String? aiNotes;
  @override
  final String? parentRecommendation;

  @override
  String toString() {
    return 'TutorSessionReport(sessionId: $sessionId, childId: $childId, personaName: $personaName, subject: $subject, durationMinutes: $durationMinutes, startedAt: $startedAt, endedAt: $endedAt, summary: $summary, topicsCovered: $topicsCovered, skillsPracticed: $skillsPracticed, masteryScoreBefore: $masteryScoreBefore, masteryScoreAfter: $masteryScoreAfter, aiNotes: $aiNotes, parentRecommendation: $parentRecommendation)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TutorSessionReportImpl &&
            (identical(other.sessionId, sessionId) ||
                other.sessionId == sessionId) &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.personaName, personaName) ||
                other.personaName == personaName) &&
            (identical(other.subject, subject) || other.subject == subject) &&
            (identical(other.durationMinutes, durationMinutes) ||
                other.durationMinutes == durationMinutes) &&
            (identical(other.startedAt, startedAt) ||
                other.startedAt == startedAt) &&
            (identical(other.endedAt, endedAt) || other.endedAt == endedAt) &&
            (identical(other.summary, summary) || other.summary == summary) &&
            const DeepCollectionEquality()
                .equals(other._topicsCovered, _topicsCovered) &&
            const DeepCollectionEquality()
                .equals(other._skillsPracticed, _skillsPracticed) &&
            (identical(other.masteryScoreBefore, masteryScoreBefore) ||
                other.masteryScoreBefore == masteryScoreBefore) &&
            (identical(other.masteryScoreAfter, masteryScoreAfter) ||
                other.masteryScoreAfter == masteryScoreAfter) &&
            (identical(other.aiNotes, aiNotes) || other.aiNotes == aiNotes) &&
            (identical(other.parentRecommendation, parentRecommendation) ||
                other.parentRecommendation == parentRecommendation));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      sessionId,
      childId,
      personaName,
      subject,
      durationMinutes,
      startedAt,
      endedAt,
      summary,
      const DeepCollectionEquality().hash(_topicsCovered),
      const DeepCollectionEquality().hash(_skillsPracticed),
      masteryScoreBefore,
      masteryScoreAfter,
      aiNotes,
      parentRecommendation);

  /// Create a copy of TutorSessionReport
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TutorSessionReportImplCopyWith<_$TutorSessionReportImpl> get copyWith =>
      __$$TutorSessionReportImplCopyWithImpl<_$TutorSessionReportImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TutorSessionReportImplToJson(
      this,
    );
  }
}

abstract class _TutorSessionReport implements TutorSessionReport {
  const factory _TutorSessionReport(
      {required final String sessionId,
      required final String childId,
      required final String personaName,
      required final String subject,
      required final int durationMinutes,
      required final DateTime startedAt,
      final DateTime? endedAt,
      required final String summary,
      required final List<String> topicsCovered,
      required final List<String> skillsPracticed,
      final int? masteryScoreBefore,
      final int? masteryScoreAfter,
      final String? aiNotes,
      final String? parentRecommendation}) = _$TutorSessionReportImpl;

  factory _TutorSessionReport.fromJson(Map<String, dynamic> json) =
      _$TutorSessionReportImpl.fromJson;

  @override
  String get sessionId;
  @override
  String get childId;
  @override
  String get personaName;
  @override
  String get subject;
  @override
  int get durationMinutes;
  @override
  DateTime get startedAt;
  @override
  DateTime? get endedAt;
  @override
  String get summary;
  @override
  List<String> get topicsCovered;
  @override
  List<String> get skillsPracticed;
  @override
  int? get masteryScoreBefore;
  @override
  int? get masteryScoreAfter;
  @override
  String? get aiNotes;
  @override
  String? get parentRecommendation;

  /// Create a copy of TutorSessionReport
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TutorSessionReportImplCopyWith<_$TutorSessionReportImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

SubjectBreakdown _$SubjectBreakdownFromJson(Map<String, dynamic> json) {
  return _SubjectBreakdown.fromJson(json);
}

/// @nodoc
mixin _$SubjectBreakdown {
  String get subject => throw _privateConstructorUsedError;
  int get sessions => throw _privateConstructorUsedError;
  int get minutes => throw _privateConstructorUsedError;
  List<String> get topTopics => throw _privateConstructorUsedError;
  String get color => throw _privateConstructorUsedError;

  /// Serializes this SubjectBreakdown to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SubjectBreakdown
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SubjectBreakdownCopyWith<SubjectBreakdown> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SubjectBreakdownCopyWith<$Res> {
  factory $SubjectBreakdownCopyWith(
          SubjectBreakdown value, $Res Function(SubjectBreakdown) then) =
      _$SubjectBreakdownCopyWithImpl<$Res, SubjectBreakdown>;
  @useResult
  $Res call(
      {String subject,
      int sessions,
      int minutes,
      List<String> topTopics,
      String color});
}

/// @nodoc
class _$SubjectBreakdownCopyWithImpl<$Res, $Val extends SubjectBreakdown>
    implements $SubjectBreakdownCopyWith<$Res> {
  _$SubjectBreakdownCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SubjectBreakdown
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? subject = null,
    Object? sessions = null,
    Object? minutes = null,
    Object? topTopics = null,
    Object? color = null,
  }) {
    return _then(_value.copyWith(
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      sessions: null == sessions
          ? _value.sessions
          : sessions // ignore: cast_nullable_to_non_nullable
              as int,
      minutes: null == minutes
          ? _value.minutes
          : minutes // ignore: cast_nullable_to_non_nullable
              as int,
      topTopics: null == topTopics
          ? _value.topTopics
          : topTopics // ignore: cast_nullable_to_non_nullable
              as List<String>,
      color: null == color
          ? _value.color
          : color // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SubjectBreakdownImplCopyWith<$Res>
    implements $SubjectBreakdownCopyWith<$Res> {
  factory _$$SubjectBreakdownImplCopyWith(_$SubjectBreakdownImpl value,
          $Res Function(_$SubjectBreakdownImpl) then) =
      __$$SubjectBreakdownImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String subject,
      int sessions,
      int minutes,
      List<String> topTopics,
      String color});
}

/// @nodoc
class __$$SubjectBreakdownImplCopyWithImpl<$Res>
    extends _$SubjectBreakdownCopyWithImpl<$Res, _$SubjectBreakdownImpl>
    implements _$$SubjectBreakdownImplCopyWith<$Res> {
  __$$SubjectBreakdownImplCopyWithImpl(_$SubjectBreakdownImpl _value,
      $Res Function(_$SubjectBreakdownImpl) _then)
      : super(_value, _then);

  /// Create a copy of SubjectBreakdown
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? subject = null,
    Object? sessions = null,
    Object? minutes = null,
    Object? topTopics = null,
    Object? color = null,
  }) {
    return _then(_$SubjectBreakdownImpl(
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      sessions: null == sessions
          ? _value.sessions
          : sessions // ignore: cast_nullable_to_non_nullable
              as int,
      minutes: null == minutes
          ? _value.minutes
          : minutes // ignore: cast_nullable_to_non_nullable
              as int,
      topTopics: null == topTopics
          ? _value._topTopics
          : topTopics // ignore: cast_nullable_to_non_nullable
              as List<String>,
      color: null == color
          ? _value.color
          : color // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SubjectBreakdownImpl implements _SubjectBreakdown {
  const _$SubjectBreakdownImpl(
      {required this.subject,
      required this.sessions,
      required this.minutes,
      final List<String> topTopics = const [],
      required this.color})
      : _topTopics = topTopics;

  factory _$SubjectBreakdownImpl.fromJson(Map<String, dynamic> json) =>
      _$$SubjectBreakdownImplFromJson(json);

  @override
  final String subject;
  @override
  final int sessions;
  @override
  final int minutes;
  final List<String> _topTopics;
  @override
  @JsonKey()
  List<String> get topTopics {
    if (_topTopics is EqualUnmodifiableListView) return _topTopics;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_topTopics);
  }

  @override
  final String color;

  @override
  String toString() {
    return 'SubjectBreakdown(subject: $subject, sessions: $sessions, minutes: $minutes, topTopics: $topTopics, color: $color)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SubjectBreakdownImpl &&
            (identical(other.subject, subject) || other.subject == subject) &&
            (identical(other.sessions, sessions) ||
                other.sessions == sessions) &&
            (identical(other.minutes, minutes) || other.minutes == minutes) &&
            const DeepCollectionEquality()
                .equals(other._topTopics, _topTopics) &&
            (identical(other.color, color) || other.color == color));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, subject, sessions, minutes,
      const DeepCollectionEquality().hash(_topTopics), color);

  /// Create a copy of SubjectBreakdown
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SubjectBreakdownImplCopyWith<_$SubjectBreakdownImpl> get copyWith =>
      __$$SubjectBreakdownImplCopyWithImpl<_$SubjectBreakdownImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SubjectBreakdownImplToJson(
      this,
    );
  }
}

abstract class _SubjectBreakdown implements SubjectBreakdown {
  const factory _SubjectBreakdown(
      {required final String subject,
      required final int sessions,
      required final int minutes,
      final List<String> topTopics,
      required final String color}) = _$SubjectBreakdownImpl;

  factory _SubjectBreakdown.fromJson(Map<String, dynamic> json) =
      _$SubjectBreakdownImpl.fromJson;

  @override
  String get subject;
  @override
  int get sessions;
  @override
  int get minutes;
  @override
  List<String> get topTopics;
  @override
  String get color;

  /// Create a copy of SubjectBreakdown
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SubjectBreakdownImplCopyWith<_$SubjectBreakdownImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

WeeklyUsage _$WeeklyUsageFromJson(Map<String, dynamic> json) {
  return _WeeklyUsage.fromJson(json);
}

/// @nodoc
mixin _$WeeklyUsage {
  String get week => throw _privateConstructorUsedError;
  int get sessions => throw _privateConstructorUsedError;
  int get minutes => throw _privateConstructorUsedError;

  /// Serializes this WeeklyUsage to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of WeeklyUsage
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $WeeklyUsageCopyWith<WeeklyUsage> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $WeeklyUsageCopyWith<$Res> {
  factory $WeeklyUsageCopyWith(
          WeeklyUsage value, $Res Function(WeeklyUsage) then) =
      _$WeeklyUsageCopyWithImpl<$Res, WeeklyUsage>;
  @useResult
  $Res call({String week, int sessions, int minutes});
}

/// @nodoc
class _$WeeklyUsageCopyWithImpl<$Res, $Val extends WeeklyUsage>
    implements $WeeklyUsageCopyWith<$Res> {
  _$WeeklyUsageCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of WeeklyUsage
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? week = null,
    Object? sessions = null,
    Object? minutes = null,
  }) {
    return _then(_value.copyWith(
      week: null == week
          ? _value.week
          : week // ignore: cast_nullable_to_non_nullable
              as String,
      sessions: null == sessions
          ? _value.sessions
          : sessions // ignore: cast_nullable_to_non_nullable
              as int,
      minutes: null == minutes
          ? _value.minutes
          : minutes // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$WeeklyUsageImplCopyWith<$Res>
    implements $WeeklyUsageCopyWith<$Res> {
  factory _$$WeeklyUsageImplCopyWith(
          _$WeeklyUsageImpl value, $Res Function(_$WeeklyUsageImpl) then) =
      __$$WeeklyUsageImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String week, int sessions, int minutes});
}

/// @nodoc
class __$$WeeklyUsageImplCopyWithImpl<$Res>
    extends _$WeeklyUsageCopyWithImpl<$Res, _$WeeklyUsageImpl>
    implements _$$WeeklyUsageImplCopyWith<$Res> {
  __$$WeeklyUsageImplCopyWithImpl(
      _$WeeklyUsageImpl _value, $Res Function(_$WeeklyUsageImpl) _then)
      : super(_value, _then);

  /// Create a copy of WeeklyUsage
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? week = null,
    Object? sessions = null,
    Object? minutes = null,
  }) {
    return _then(_$WeeklyUsageImpl(
      week: null == week
          ? _value.week
          : week // ignore: cast_nullable_to_non_nullable
              as String,
      sessions: null == sessions
          ? _value.sessions
          : sessions // ignore: cast_nullable_to_non_nullable
              as int,
      minutes: null == minutes
          ? _value.minutes
          : minutes // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$WeeklyUsageImpl implements _WeeklyUsage {
  const _$WeeklyUsageImpl(
      {required this.week, required this.sessions, required this.minutes});

  factory _$WeeklyUsageImpl.fromJson(Map<String, dynamic> json) =>
      _$$WeeklyUsageImplFromJson(json);

  @override
  final String week;
  @override
  final int sessions;
  @override
  final int minutes;

  @override
  String toString() {
    return 'WeeklyUsage(week: $week, sessions: $sessions, minutes: $minutes)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$WeeklyUsageImpl &&
            (identical(other.week, week) || other.week == week) &&
            (identical(other.sessions, sessions) ||
                other.sessions == sessions) &&
            (identical(other.minutes, minutes) || other.minutes == minutes));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, week, sessions, minutes);

  /// Create a copy of WeeklyUsage
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$WeeklyUsageImplCopyWith<_$WeeklyUsageImpl> get copyWith =>
      __$$WeeklyUsageImplCopyWithImpl<_$WeeklyUsageImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$WeeklyUsageImplToJson(
      this,
    );
  }
}

abstract class _WeeklyUsage implements WeeklyUsage {
  const factory _WeeklyUsage(
      {required final String week,
      required final int sessions,
      required final int minutes}) = _$WeeklyUsageImpl;

  factory _WeeklyUsage.fromJson(Map<String, dynamic> json) =
      _$WeeklyUsageImpl.fromJson;

  @override
  String get week;
  @override
  int get sessions;
  @override
  int get minutes;

  /// Create a copy of WeeklyUsage
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$WeeklyUsageImplCopyWith<_$WeeklyUsageImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

LearnerBreakdown _$LearnerBreakdownFromJson(Map<String, dynamic> json) {
  return _LearnerBreakdown.fromJson(json);
}

/// @nodoc
mixin _$LearnerBreakdown {
  String get learnerId => throw _privateConstructorUsedError;
  int get totalSessions => throw _privateConstructorUsedError;
  int get totalMinutes => throw _privateConstructorUsedError;
  String? get favoriteSubject => throw _privateConstructorUsedError;
  String? get lastSessionAt => throw _privateConstructorUsedError;

  /// Serializes this LearnerBreakdown to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of LearnerBreakdown
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $LearnerBreakdownCopyWith<LearnerBreakdown> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LearnerBreakdownCopyWith<$Res> {
  factory $LearnerBreakdownCopyWith(
          LearnerBreakdown value, $Res Function(LearnerBreakdown) then) =
      _$LearnerBreakdownCopyWithImpl<$Res, LearnerBreakdown>;
  @useResult
  $Res call(
      {String learnerId,
      int totalSessions,
      int totalMinutes,
      String? favoriteSubject,
      String? lastSessionAt});
}

/// @nodoc
class _$LearnerBreakdownCopyWithImpl<$Res, $Val extends LearnerBreakdown>
    implements $LearnerBreakdownCopyWith<$Res> {
  _$LearnerBreakdownCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of LearnerBreakdown
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? learnerId = null,
    Object? totalSessions = null,
    Object? totalMinutes = null,
    Object? favoriteSubject = freezed,
    Object? lastSessionAt = freezed,
  }) {
    return _then(_value.copyWith(
      learnerId: null == learnerId
          ? _value.learnerId
          : learnerId // ignore: cast_nullable_to_non_nullable
              as String,
      totalSessions: null == totalSessions
          ? _value.totalSessions
          : totalSessions // ignore: cast_nullable_to_non_nullable
              as int,
      totalMinutes: null == totalMinutes
          ? _value.totalMinutes
          : totalMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      favoriteSubject: freezed == favoriteSubject
          ? _value.favoriteSubject
          : favoriteSubject // ignore: cast_nullable_to_non_nullable
              as String?,
      lastSessionAt: freezed == lastSessionAt
          ? _value.lastSessionAt
          : lastSessionAt // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$LearnerBreakdownImplCopyWith<$Res>
    implements $LearnerBreakdownCopyWith<$Res> {
  factory _$$LearnerBreakdownImplCopyWith(_$LearnerBreakdownImpl value,
          $Res Function(_$LearnerBreakdownImpl) then) =
      __$$LearnerBreakdownImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String learnerId,
      int totalSessions,
      int totalMinutes,
      String? favoriteSubject,
      String? lastSessionAt});
}

/// @nodoc
class __$$LearnerBreakdownImplCopyWithImpl<$Res>
    extends _$LearnerBreakdownCopyWithImpl<$Res, _$LearnerBreakdownImpl>
    implements _$$LearnerBreakdownImplCopyWith<$Res> {
  __$$LearnerBreakdownImplCopyWithImpl(_$LearnerBreakdownImpl _value,
      $Res Function(_$LearnerBreakdownImpl) _then)
      : super(_value, _then);

  /// Create a copy of LearnerBreakdown
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? learnerId = null,
    Object? totalSessions = null,
    Object? totalMinutes = null,
    Object? favoriteSubject = freezed,
    Object? lastSessionAt = freezed,
  }) {
    return _then(_$LearnerBreakdownImpl(
      learnerId: null == learnerId
          ? _value.learnerId
          : learnerId // ignore: cast_nullable_to_non_nullable
              as String,
      totalSessions: null == totalSessions
          ? _value.totalSessions
          : totalSessions // ignore: cast_nullable_to_non_nullable
              as int,
      totalMinutes: null == totalMinutes
          ? _value.totalMinutes
          : totalMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      favoriteSubject: freezed == favoriteSubject
          ? _value.favoriteSubject
          : favoriteSubject // ignore: cast_nullable_to_non_nullable
              as String?,
      lastSessionAt: freezed == lastSessionAt
          ? _value.lastSessionAt
          : lastSessionAt // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$LearnerBreakdownImpl implements _LearnerBreakdown {
  const _$LearnerBreakdownImpl(
      {required this.learnerId,
      required this.totalSessions,
      required this.totalMinutes,
      this.favoriteSubject,
      this.lastSessionAt});

  factory _$LearnerBreakdownImpl.fromJson(Map<String, dynamic> json) =>
      _$$LearnerBreakdownImplFromJson(json);

  @override
  final String learnerId;
  @override
  final int totalSessions;
  @override
  final int totalMinutes;
  @override
  final String? favoriteSubject;
  @override
  final String? lastSessionAt;

  @override
  String toString() {
    return 'LearnerBreakdown(learnerId: $learnerId, totalSessions: $totalSessions, totalMinutes: $totalMinutes, favoriteSubject: $favoriteSubject, lastSessionAt: $lastSessionAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LearnerBreakdownImpl &&
            (identical(other.learnerId, learnerId) ||
                other.learnerId == learnerId) &&
            (identical(other.totalSessions, totalSessions) ||
                other.totalSessions == totalSessions) &&
            (identical(other.totalMinutes, totalMinutes) ||
                other.totalMinutes == totalMinutes) &&
            (identical(other.favoriteSubject, favoriteSubject) ||
                other.favoriteSubject == favoriteSubject) &&
            (identical(other.lastSessionAt, lastSessionAt) ||
                other.lastSessionAt == lastSessionAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, learnerId, totalSessions,
      totalMinutes, favoriteSubject, lastSessionAt);

  /// Create a copy of LearnerBreakdown
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LearnerBreakdownImplCopyWith<_$LearnerBreakdownImpl> get copyWith =>
      __$$LearnerBreakdownImplCopyWithImpl<_$LearnerBreakdownImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$LearnerBreakdownImplToJson(
      this,
    );
  }
}

abstract class _LearnerBreakdown implements LearnerBreakdown {
  const factory _LearnerBreakdown(
      {required final String learnerId,
      required final int totalSessions,
      required final int totalMinutes,
      final String? favoriteSubject,
      final String? lastSessionAt}) = _$LearnerBreakdownImpl;

  factory _LearnerBreakdown.fromJson(Map<String, dynamic> json) =
      _$LearnerBreakdownImpl.fromJson;

  @override
  String get learnerId;
  @override
  int get totalSessions;
  @override
  int get totalMinutes;
  @override
  String? get favoriteSubject;
  @override
  String? get lastSessionAt;

  /// Create a copy of LearnerBreakdown
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LearnerBreakdownImplCopyWith<_$LearnerBreakdownImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TutorAnalyticsSummary _$TutorAnalyticsSummaryFromJson(
    Map<String, dynamic> json) {
  return _TutorAnalyticsSummary.fromJson(json);
}

/// @nodoc
mixin _$TutorAnalyticsSummary {
  int get totalSessions => throw _privateConstructorUsedError;
  int get totalMinutes => throw _privateConstructorUsedError;
  int get totalMessages => throw _privateConstructorUsedError;
  double get averageSessionMinutes => throw _privateConstructorUsedError;
  List<SubjectBreakdown> get subjectBreakdown =>
      throw _privateConstructorUsedError;
  List<WeeklyUsage> get weeklyUsage => throw _privateConstructorUsedError;
  List<LearnerBreakdown> get learners => throw _privateConstructorUsedError;

  /// Serializes this TutorAnalyticsSummary to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TutorAnalyticsSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TutorAnalyticsSummaryCopyWith<TutorAnalyticsSummary> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TutorAnalyticsSummaryCopyWith<$Res> {
  factory $TutorAnalyticsSummaryCopyWith(TutorAnalyticsSummary value,
          $Res Function(TutorAnalyticsSummary) then) =
      _$TutorAnalyticsSummaryCopyWithImpl<$Res, TutorAnalyticsSummary>;
  @useResult
  $Res call(
      {int totalSessions,
      int totalMinutes,
      int totalMessages,
      double averageSessionMinutes,
      List<SubjectBreakdown> subjectBreakdown,
      List<WeeklyUsage> weeklyUsage,
      List<LearnerBreakdown> learners});
}

/// @nodoc
class _$TutorAnalyticsSummaryCopyWithImpl<$Res,
        $Val extends TutorAnalyticsSummary>
    implements $TutorAnalyticsSummaryCopyWith<$Res> {
  _$TutorAnalyticsSummaryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TutorAnalyticsSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? totalSessions = null,
    Object? totalMinutes = null,
    Object? totalMessages = null,
    Object? averageSessionMinutes = null,
    Object? subjectBreakdown = null,
    Object? weeklyUsage = null,
    Object? learners = null,
  }) {
    return _then(_value.copyWith(
      totalSessions: null == totalSessions
          ? _value.totalSessions
          : totalSessions // ignore: cast_nullable_to_non_nullable
              as int,
      totalMinutes: null == totalMinutes
          ? _value.totalMinutes
          : totalMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      totalMessages: null == totalMessages
          ? _value.totalMessages
          : totalMessages // ignore: cast_nullable_to_non_nullable
              as int,
      averageSessionMinutes: null == averageSessionMinutes
          ? _value.averageSessionMinutes
          : averageSessionMinutes // ignore: cast_nullable_to_non_nullable
              as double,
      subjectBreakdown: null == subjectBreakdown
          ? _value.subjectBreakdown
          : subjectBreakdown // ignore: cast_nullable_to_non_nullable
              as List<SubjectBreakdown>,
      weeklyUsage: null == weeklyUsage
          ? _value.weeklyUsage
          : weeklyUsage // ignore: cast_nullable_to_non_nullable
              as List<WeeklyUsage>,
      learners: null == learners
          ? _value.learners
          : learners // ignore: cast_nullable_to_non_nullable
              as List<LearnerBreakdown>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TutorAnalyticsSummaryImplCopyWith<$Res>
    implements $TutorAnalyticsSummaryCopyWith<$Res> {
  factory _$$TutorAnalyticsSummaryImplCopyWith(
          _$TutorAnalyticsSummaryImpl value,
          $Res Function(_$TutorAnalyticsSummaryImpl) then) =
      __$$TutorAnalyticsSummaryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {int totalSessions,
      int totalMinutes,
      int totalMessages,
      double averageSessionMinutes,
      List<SubjectBreakdown> subjectBreakdown,
      List<WeeklyUsage> weeklyUsage,
      List<LearnerBreakdown> learners});
}

/// @nodoc
class __$$TutorAnalyticsSummaryImplCopyWithImpl<$Res>
    extends _$TutorAnalyticsSummaryCopyWithImpl<$Res,
        _$TutorAnalyticsSummaryImpl>
    implements _$$TutorAnalyticsSummaryImplCopyWith<$Res> {
  __$$TutorAnalyticsSummaryImplCopyWithImpl(_$TutorAnalyticsSummaryImpl _value,
      $Res Function(_$TutorAnalyticsSummaryImpl) _then)
      : super(_value, _then);

  /// Create a copy of TutorAnalyticsSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? totalSessions = null,
    Object? totalMinutes = null,
    Object? totalMessages = null,
    Object? averageSessionMinutes = null,
    Object? subjectBreakdown = null,
    Object? weeklyUsage = null,
    Object? learners = null,
  }) {
    return _then(_$TutorAnalyticsSummaryImpl(
      totalSessions: null == totalSessions
          ? _value.totalSessions
          : totalSessions // ignore: cast_nullable_to_non_nullable
              as int,
      totalMinutes: null == totalMinutes
          ? _value.totalMinutes
          : totalMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      totalMessages: null == totalMessages
          ? _value.totalMessages
          : totalMessages // ignore: cast_nullable_to_non_nullable
              as int,
      averageSessionMinutes: null == averageSessionMinutes
          ? _value.averageSessionMinutes
          : averageSessionMinutes // ignore: cast_nullable_to_non_nullable
              as double,
      subjectBreakdown: null == subjectBreakdown
          ? _value._subjectBreakdown
          : subjectBreakdown // ignore: cast_nullable_to_non_nullable
              as List<SubjectBreakdown>,
      weeklyUsage: null == weeklyUsage
          ? _value._weeklyUsage
          : weeklyUsage // ignore: cast_nullable_to_non_nullable
              as List<WeeklyUsage>,
      learners: null == learners
          ? _value._learners
          : learners // ignore: cast_nullable_to_non_nullable
              as List<LearnerBreakdown>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TutorAnalyticsSummaryImpl implements _TutorAnalyticsSummary {
  const _$TutorAnalyticsSummaryImpl(
      {required this.totalSessions,
      required this.totalMinutes,
      required this.totalMessages,
      required this.averageSessionMinutes,
      final List<SubjectBreakdown> subjectBreakdown = const [],
      final List<WeeklyUsage> weeklyUsage = const [],
      final List<LearnerBreakdown> learners = const []})
      : _subjectBreakdown = subjectBreakdown,
        _weeklyUsage = weeklyUsage,
        _learners = learners;

  factory _$TutorAnalyticsSummaryImpl.fromJson(Map<String, dynamic> json) =>
      _$$TutorAnalyticsSummaryImplFromJson(json);

  @override
  final int totalSessions;
  @override
  final int totalMinutes;
  @override
  final int totalMessages;
  @override
  final double averageSessionMinutes;
  final List<SubjectBreakdown> _subjectBreakdown;
  @override
  @JsonKey()
  List<SubjectBreakdown> get subjectBreakdown {
    if (_subjectBreakdown is EqualUnmodifiableListView)
      return _subjectBreakdown;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_subjectBreakdown);
  }

  final List<WeeklyUsage> _weeklyUsage;
  @override
  @JsonKey()
  List<WeeklyUsage> get weeklyUsage {
    if (_weeklyUsage is EqualUnmodifiableListView) return _weeklyUsage;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_weeklyUsage);
  }

  final List<LearnerBreakdown> _learners;
  @override
  @JsonKey()
  List<LearnerBreakdown> get learners {
    if (_learners is EqualUnmodifiableListView) return _learners;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_learners);
  }

  @override
  String toString() {
    return 'TutorAnalyticsSummary(totalSessions: $totalSessions, totalMinutes: $totalMinutes, totalMessages: $totalMessages, averageSessionMinutes: $averageSessionMinutes, subjectBreakdown: $subjectBreakdown, weeklyUsage: $weeklyUsage, learners: $learners)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TutorAnalyticsSummaryImpl &&
            (identical(other.totalSessions, totalSessions) ||
                other.totalSessions == totalSessions) &&
            (identical(other.totalMinutes, totalMinutes) ||
                other.totalMinutes == totalMinutes) &&
            (identical(other.totalMessages, totalMessages) ||
                other.totalMessages == totalMessages) &&
            (identical(other.averageSessionMinutes, averageSessionMinutes) ||
                other.averageSessionMinutes == averageSessionMinutes) &&
            const DeepCollectionEquality()
                .equals(other._subjectBreakdown, _subjectBreakdown) &&
            const DeepCollectionEquality()
                .equals(other._weeklyUsage, _weeklyUsage) &&
            const DeepCollectionEquality().equals(other._learners, _learners));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      totalSessions,
      totalMinutes,
      totalMessages,
      averageSessionMinutes,
      const DeepCollectionEquality().hash(_subjectBreakdown),
      const DeepCollectionEquality().hash(_weeklyUsage),
      const DeepCollectionEquality().hash(_learners));

  /// Create a copy of TutorAnalyticsSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TutorAnalyticsSummaryImplCopyWith<_$TutorAnalyticsSummaryImpl>
      get copyWith => __$$TutorAnalyticsSummaryImplCopyWithImpl<
          _$TutorAnalyticsSummaryImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TutorAnalyticsSummaryImplToJson(
      this,
    );
  }
}

abstract class _TutorAnalyticsSummary implements TutorAnalyticsSummary {
  const factory _TutorAnalyticsSummary(
      {required final int totalSessions,
      required final int totalMinutes,
      required final int totalMessages,
      required final double averageSessionMinutes,
      final List<SubjectBreakdown> subjectBreakdown,
      final List<WeeklyUsage> weeklyUsage,
      final List<LearnerBreakdown> learners}) = _$TutorAnalyticsSummaryImpl;

  factory _TutorAnalyticsSummary.fromJson(Map<String, dynamic> json) =
      _$TutorAnalyticsSummaryImpl.fromJson;

  @override
  int get totalSessions;
  @override
  int get totalMinutes;
  @override
  int get totalMessages;
  @override
  double get averageSessionMinutes;
  @override
  List<SubjectBreakdown> get subjectBreakdown;
  @override
  List<WeeklyUsage> get weeklyUsage;
  @override
  List<LearnerBreakdown> get learners;

  /// Create a copy of TutorAnalyticsSummary
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TutorAnalyticsSummaryImplCopyWith<_$TutorAnalyticsSummaryImpl>
      get copyWith => throw _privateConstructorUsedError;
}

AnalyticsPersona _$AnalyticsPersonaFromJson(Map<String, dynamic> json) {
  return _AnalyticsPersona.fromJson(json);
}

/// @nodoc
mixin _$AnalyticsPersona {
  String get name => throw _privateConstructorUsedError;
  String get slug => throw _privateConstructorUsedError;
  String? get avatar => throw _privateConstructorUsedError;

  /// Serializes this AnalyticsPersona to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AnalyticsPersona
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AnalyticsPersonaCopyWith<AnalyticsPersona> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AnalyticsPersonaCopyWith<$Res> {
  factory $AnalyticsPersonaCopyWith(
          AnalyticsPersona value, $Res Function(AnalyticsPersona) then) =
      _$AnalyticsPersonaCopyWithImpl<$Res, AnalyticsPersona>;
  @useResult
  $Res call({String name, String slug, String? avatar});
}

/// @nodoc
class _$AnalyticsPersonaCopyWithImpl<$Res, $Val extends AnalyticsPersona>
    implements $AnalyticsPersonaCopyWith<$Res> {
  _$AnalyticsPersonaCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AnalyticsPersona
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? slug = null,
    Object? avatar = freezed,
  }) {
    return _then(_value.copyWith(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      slug: null == slug
          ? _value.slug
          : slug // ignore: cast_nullable_to_non_nullable
              as String,
      avatar: freezed == avatar
          ? _value.avatar
          : avatar // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AnalyticsPersonaImplCopyWith<$Res>
    implements $AnalyticsPersonaCopyWith<$Res> {
  factory _$$AnalyticsPersonaImplCopyWith(_$AnalyticsPersonaImpl value,
          $Res Function(_$AnalyticsPersonaImpl) then) =
      __$$AnalyticsPersonaImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String name, String slug, String? avatar});
}

/// @nodoc
class __$$AnalyticsPersonaImplCopyWithImpl<$Res>
    extends _$AnalyticsPersonaCopyWithImpl<$Res, _$AnalyticsPersonaImpl>
    implements _$$AnalyticsPersonaImplCopyWith<$Res> {
  __$$AnalyticsPersonaImplCopyWithImpl(_$AnalyticsPersonaImpl _value,
      $Res Function(_$AnalyticsPersonaImpl) _then)
      : super(_value, _then);

  /// Create a copy of AnalyticsPersona
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? slug = null,
    Object? avatar = freezed,
  }) {
    return _then(_$AnalyticsPersonaImpl(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      slug: null == slug
          ? _value.slug
          : slug // ignore: cast_nullable_to_non_nullable
              as String,
      avatar: freezed == avatar
          ? _value.avatar
          : avatar // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AnalyticsPersonaImpl implements _AnalyticsPersona {
  const _$AnalyticsPersonaImpl(
      {required this.name, required this.slug, this.avatar});

  factory _$AnalyticsPersonaImpl.fromJson(Map<String, dynamic> json) =>
      _$$AnalyticsPersonaImplFromJson(json);

  @override
  final String name;
  @override
  final String slug;
  @override
  final String? avatar;

  @override
  String toString() {
    return 'AnalyticsPersona(name: $name, slug: $slug, avatar: $avatar)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AnalyticsPersonaImpl &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.slug, slug) || other.slug == slug) &&
            (identical(other.avatar, avatar) || other.avatar == avatar));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, name, slug, avatar);

  /// Create a copy of AnalyticsPersona
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AnalyticsPersonaImplCopyWith<_$AnalyticsPersonaImpl> get copyWith =>
      __$$AnalyticsPersonaImplCopyWithImpl<_$AnalyticsPersonaImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AnalyticsPersonaImplToJson(
      this,
    );
  }
}

abstract class _AnalyticsPersona implements AnalyticsPersona {
  const factory _AnalyticsPersona(
      {required final String name,
      required final String slug,
      final String? avatar}) = _$AnalyticsPersonaImpl;

  factory _AnalyticsPersona.fromJson(Map<String, dynamic> json) =
      _$AnalyticsPersonaImpl.fromJson;

  @override
  String get name;
  @override
  String get slug;
  @override
  String? get avatar;

  /// Create a copy of AnalyticsPersona
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AnalyticsPersonaImplCopyWith<_$AnalyticsPersonaImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AnalyticsSession _$AnalyticsSessionFromJson(Map<String, dynamic> json) {
  return _AnalyticsSession.fromJson(json);
}

/// @nodoc
mixin _$AnalyticsSession {
  String get id => throw _privateConstructorUsedError;
  String get subject => throw _privateConstructorUsedError;
  AnalyticsPersona get persona => throw _privateConstructorUsedError;
  String? get topic => throw _privateConstructorUsedError;
  String get startedAt => throw _privateConstructorUsedError;
  String? get endedAt => throw _privateConstructorUsedError;
  int get durationMinutes => throw _privateConstructorUsedError;
  int get messageCount => throw _privateConstructorUsedError;
  String? get locale => throw _privateConstructorUsedError;
  String? get status => throw _privateConstructorUsedError;
  String get color => throw _privateConstructorUsedError;

  /// Serializes this AnalyticsSession to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AnalyticsSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AnalyticsSessionCopyWith<AnalyticsSession> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AnalyticsSessionCopyWith<$Res> {
  factory $AnalyticsSessionCopyWith(
          AnalyticsSession value, $Res Function(AnalyticsSession) then) =
      _$AnalyticsSessionCopyWithImpl<$Res, AnalyticsSession>;
  @useResult
  $Res call(
      {String id,
      String subject,
      AnalyticsPersona persona,
      String? topic,
      String startedAt,
      String? endedAt,
      int durationMinutes,
      int messageCount,
      String? locale,
      String? status,
      String color});

  $AnalyticsPersonaCopyWith<$Res> get persona;
}

/// @nodoc
class _$AnalyticsSessionCopyWithImpl<$Res, $Val extends AnalyticsSession>
    implements $AnalyticsSessionCopyWith<$Res> {
  _$AnalyticsSessionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AnalyticsSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? subject = null,
    Object? persona = null,
    Object? topic = freezed,
    Object? startedAt = null,
    Object? endedAt = freezed,
    Object? durationMinutes = null,
    Object? messageCount = null,
    Object? locale = freezed,
    Object? status = freezed,
    Object? color = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      persona: null == persona
          ? _value.persona
          : persona // ignore: cast_nullable_to_non_nullable
              as AnalyticsPersona,
      topic: freezed == topic
          ? _value.topic
          : topic // ignore: cast_nullable_to_non_nullable
              as String?,
      startedAt: null == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as String,
      endedAt: freezed == endedAt
          ? _value.endedAt
          : endedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      messageCount: null == messageCount
          ? _value.messageCount
          : messageCount // ignore: cast_nullable_to_non_nullable
              as int,
      locale: freezed == locale
          ? _value.locale
          : locale // ignore: cast_nullable_to_non_nullable
              as String?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
      color: null == color
          ? _value.color
          : color // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }

  /// Create a copy of AnalyticsSession
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $AnalyticsPersonaCopyWith<$Res> get persona {
    return $AnalyticsPersonaCopyWith<$Res>(_value.persona, (value) {
      return _then(_value.copyWith(persona: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$AnalyticsSessionImplCopyWith<$Res>
    implements $AnalyticsSessionCopyWith<$Res> {
  factory _$$AnalyticsSessionImplCopyWith(_$AnalyticsSessionImpl value,
          $Res Function(_$AnalyticsSessionImpl) then) =
      __$$AnalyticsSessionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String subject,
      AnalyticsPersona persona,
      String? topic,
      String startedAt,
      String? endedAt,
      int durationMinutes,
      int messageCount,
      String? locale,
      String? status,
      String color});

  @override
  $AnalyticsPersonaCopyWith<$Res> get persona;
}

/// @nodoc
class __$$AnalyticsSessionImplCopyWithImpl<$Res>
    extends _$AnalyticsSessionCopyWithImpl<$Res, _$AnalyticsSessionImpl>
    implements _$$AnalyticsSessionImplCopyWith<$Res> {
  __$$AnalyticsSessionImplCopyWithImpl(_$AnalyticsSessionImpl _value,
      $Res Function(_$AnalyticsSessionImpl) _then)
      : super(_value, _then);

  /// Create a copy of AnalyticsSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? subject = null,
    Object? persona = null,
    Object? topic = freezed,
    Object? startedAt = null,
    Object? endedAt = freezed,
    Object? durationMinutes = null,
    Object? messageCount = null,
    Object? locale = freezed,
    Object? status = freezed,
    Object? color = null,
  }) {
    return _then(_$AnalyticsSessionImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      persona: null == persona
          ? _value.persona
          : persona // ignore: cast_nullable_to_non_nullable
              as AnalyticsPersona,
      topic: freezed == topic
          ? _value.topic
          : topic // ignore: cast_nullable_to_non_nullable
              as String?,
      startedAt: null == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as String,
      endedAt: freezed == endedAt
          ? _value.endedAt
          : endedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      messageCount: null == messageCount
          ? _value.messageCount
          : messageCount // ignore: cast_nullable_to_non_nullable
              as int,
      locale: freezed == locale
          ? _value.locale
          : locale // ignore: cast_nullable_to_non_nullable
              as String?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
      color: null == color
          ? _value.color
          : color // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AnalyticsSessionImpl implements _AnalyticsSession {
  const _$AnalyticsSessionImpl(
      {required this.id,
      required this.subject,
      required this.persona,
      this.topic,
      required this.startedAt,
      this.endedAt,
      required this.durationMinutes,
      required this.messageCount,
      this.locale,
      this.status,
      required this.color});

  factory _$AnalyticsSessionImpl.fromJson(Map<String, dynamic> json) =>
      _$$AnalyticsSessionImplFromJson(json);

  @override
  final String id;
  @override
  final String subject;
  @override
  final AnalyticsPersona persona;
  @override
  final String? topic;
  @override
  final String startedAt;
  @override
  final String? endedAt;
  @override
  final int durationMinutes;
  @override
  final int messageCount;
  @override
  final String? locale;
  @override
  final String? status;
  @override
  final String color;

  @override
  String toString() {
    return 'AnalyticsSession(id: $id, subject: $subject, persona: $persona, topic: $topic, startedAt: $startedAt, endedAt: $endedAt, durationMinutes: $durationMinutes, messageCount: $messageCount, locale: $locale, status: $status, color: $color)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AnalyticsSessionImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.subject, subject) || other.subject == subject) &&
            (identical(other.persona, persona) || other.persona == persona) &&
            (identical(other.topic, topic) || other.topic == topic) &&
            (identical(other.startedAt, startedAt) ||
                other.startedAt == startedAt) &&
            (identical(other.endedAt, endedAt) || other.endedAt == endedAt) &&
            (identical(other.durationMinutes, durationMinutes) ||
                other.durationMinutes == durationMinutes) &&
            (identical(other.messageCount, messageCount) ||
                other.messageCount == messageCount) &&
            (identical(other.locale, locale) || other.locale == locale) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.color, color) || other.color == color));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, subject, persona, topic,
      startedAt, endedAt, durationMinutes, messageCount, locale, status, color);

  /// Create a copy of AnalyticsSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AnalyticsSessionImplCopyWith<_$AnalyticsSessionImpl> get copyWith =>
      __$$AnalyticsSessionImplCopyWithImpl<_$AnalyticsSessionImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AnalyticsSessionImplToJson(
      this,
    );
  }
}

abstract class _AnalyticsSession implements AnalyticsSession {
  const factory _AnalyticsSession(
      {required final String id,
      required final String subject,
      required final AnalyticsPersona persona,
      final String? topic,
      required final String startedAt,
      final String? endedAt,
      required final int durationMinutes,
      required final int messageCount,
      final String? locale,
      final String? status,
      required final String color}) = _$AnalyticsSessionImpl;

  factory _AnalyticsSession.fromJson(Map<String, dynamic> json) =
      _$AnalyticsSessionImpl.fromJson;

  @override
  String get id;
  @override
  String get subject;
  @override
  AnalyticsPersona get persona;
  @override
  String? get topic;
  @override
  String get startedAt;
  @override
  String? get endedAt;
  @override
  int get durationMinutes;
  @override
  int get messageCount;
  @override
  String? get locale;
  @override
  String? get status;
  @override
  String get color;

  /// Create a copy of AnalyticsSession
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AnalyticsSessionImplCopyWith<_$AnalyticsSessionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AnalyticsSessionsResponse _$AnalyticsSessionsResponseFromJson(
    Map<String, dynamic> json) {
  return _AnalyticsSessionsResponse.fromJson(json);
}

/// @nodoc
mixin _$AnalyticsSessionsResponse {
  List<AnalyticsSession> get sessions => throw _privateConstructorUsedError;
  int get total => throw _privateConstructorUsedError;
  int get page => throw _privateConstructorUsedError;
  int get pageSize => throw _privateConstructorUsedError;
  int get totalPages => throw _privateConstructorUsedError;

  /// Serializes this AnalyticsSessionsResponse to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AnalyticsSessionsResponse
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AnalyticsSessionsResponseCopyWith<AnalyticsSessionsResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AnalyticsSessionsResponseCopyWith<$Res> {
  factory $AnalyticsSessionsResponseCopyWith(AnalyticsSessionsResponse value,
          $Res Function(AnalyticsSessionsResponse) then) =
      _$AnalyticsSessionsResponseCopyWithImpl<$Res, AnalyticsSessionsResponse>;
  @useResult
  $Res call(
      {List<AnalyticsSession> sessions,
      int total,
      int page,
      int pageSize,
      int totalPages});
}

/// @nodoc
class _$AnalyticsSessionsResponseCopyWithImpl<$Res,
        $Val extends AnalyticsSessionsResponse>
    implements $AnalyticsSessionsResponseCopyWith<$Res> {
  _$AnalyticsSessionsResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AnalyticsSessionsResponse
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessions = null,
    Object? total = null,
    Object? page = null,
    Object? pageSize = null,
    Object? totalPages = null,
  }) {
    return _then(_value.copyWith(
      sessions: null == sessions
          ? _value.sessions
          : sessions // ignore: cast_nullable_to_non_nullable
              as List<AnalyticsSession>,
      total: null == total
          ? _value.total
          : total // ignore: cast_nullable_to_non_nullable
              as int,
      page: null == page
          ? _value.page
          : page // ignore: cast_nullable_to_non_nullable
              as int,
      pageSize: null == pageSize
          ? _value.pageSize
          : pageSize // ignore: cast_nullable_to_non_nullable
              as int,
      totalPages: null == totalPages
          ? _value.totalPages
          : totalPages // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AnalyticsSessionsResponseImplCopyWith<$Res>
    implements $AnalyticsSessionsResponseCopyWith<$Res> {
  factory _$$AnalyticsSessionsResponseImplCopyWith(
          _$AnalyticsSessionsResponseImpl value,
          $Res Function(_$AnalyticsSessionsResponseImpl) then) =
      __$$AnalyticsSessionsResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {List<AnalyticsSession> sessions,
      int total,
      int page,
      int pageSize,
      int totalPages});
}

/// @nodoc
class __$$AnalyticsSessionsResponseImplCopyWithImpl<$Res>
    extends _$AnalyticsSessionsResponseCopyWithImpl<$Res,
        _$AnalyticsSessionsResponseImpl>
    implements _$$AnalyticsSessionsResponseImplCopyWith<$Res> {
  __$$AnalyticsSessionsResponseImplCopyWithImpl(
      _$AnalyticsSessionsResponseImpl _value,
      $Res Function(_$AnalyticsSessionsResponseImpl) _then)
      : super(_value, _then);

  /// Create a copy of AnalyticsSessionsResponse
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessions = null,
    Object? total = null,
    Object? page = null,
    Object? pageSize = null,
    Object? totalPages = null,
  }) {
    return _then(_$AnalyticsSessionsResponseImpl(
      sessions: null == sessions
          ? _value._sessions
          : sessions // ignore: cast_nullable_to_non_nullable
              as List<AnalyticsSession>,
      total: null == total
          ? _value.total
          : total // ignore: cast_nullable_to_non_nullable
              as int,
      page: null == page
          ? _value.page
          : page // ignore: cast_nullable_to_non_nullable
              as int,
      pageSize: null == pageSize
          ? _value.pageSize
          : pageSize // ignore: cast_nullable_to_non_nullable
              as int,
      totalPages: null == totalPages
          ? _value.totalPages
          : totalPages // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AnalyticsSessionsResponseImpl implements _AnalyticsSessionsResponse {
  const _$AnalyticsSessionsResponseImpl(
      {required final List<AnalyticsSession> sessions,
      required this.total,
      required this.page,
      required this.pageSize,
      required this.totalPages})
      : _sessions = sessions;

  factory _$AnalyticsSessionsResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$AnalyticsSessionsResponseImplFromJson(json);

  final List<AnalyticsSession> _sessions;
  @override
  List<AnalyticsSession> get sessions {
    if (_sessions is EqualUnmodifiableListView) return _sessions;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_sessions);
  }

  @override
  final int total;
  @override
  final int page;
  @override
  final int pageSize;
  @override
  final int totalPages;

  @override
  String toString() {
    return 'AnalyticsSessionsResponse(sessions: $sessions, total: $total, page: $page, pageSize: $pageSize, totalPages: $totalPages)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AnalyticsSessionsResponseImpl &&
            const DeepCollectionEquality().equals(other._sessions, _sessions) &&
            (identical(other.total, total) || other.total == total) &&
            (identical(other.page, page) || other.page == page) &&
            (identical(other.pageSize, pageSize) ||
                other.pageSize == pageSize) &&
            (identical(other.totalPages, totalPages) ||
                other.totalPages == totalPages));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_sessions),
      total,
      page,
      pageSize,
      totalPages);

  /// Create a copy of AnalyticsSessionsResponse
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AnalyticsSessionsResponseImplCopyWith<_$AnalyticsSessionsResponseImpl>
      get copyWith => __$$AnalyticsSessionsResponseImplCopyWithImpl<
          _$AnalyticsSessionsResponseImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AnalyticsSessionsResponseImplToJson(
      this,
    );
  }
}

abstract class _AnalyticsSessionsResponse implements AnalyticsSessionsResponse {
  const factory _AnalyticsSessionsResponse(
      {required final List<AnalyticsSession> sessions,
      required final int total,
      required final int page,
      required final int pageSize,
      required final int totalPages}) = _$AnalyticsSessionsResponseImpl;

  factory _AnalyticsSessionsResponse.fromJson(Map<String, dynamic> json) =
      _$AnalyticsSessionsResponseImpl.fromJson;

  @override
  List<AnalyticsSession> get sessions;
  @override
  int get total;
  @override
  int get page;
  @override
  int get pageSize;
  @override
  int get totalPages;

  /// Create a copy of AnalyticsSessionsResponse
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AnalyticsSessionsResponseImplCopyWith<_$AnalyticsSessionsResponseImpl>
      get copyWith => throw _privateConstructorUsedError;
}

TranscriptMessage _$TranscriptMessageFromJson(Map<String, dynamic> json) {
  return _TranscriptMessage.fromJson(json);
}

/// @nodoc
mixin _$TranscriptMessage {
  String get id => throw _privateConstructorUsedError;
  String get role => throw _privateConstructorUsedError;
  String get content => throw _privateConstructorUsedError;
  String? get emotion => throw _privateConstructorUsedError;
  String get createdAt => throw _privateConstructorUsedError;

  /// Serializes this TranscriptMessage to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TranscriptMessage
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TranscriptMessageCopyWith<TranscriptMessage> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TranscriptMessageCopyWith<$Res> {
  factory $TranscriptMessageCopyWith(
          TranscriptMessage value, $Res Function(TranscriptMessage) then) =
      _$TranscriptMessageCopyWithImpl<$Res, TranscriptMessage>;
  @useResult
  $Res call(
      {String id,
      String role,
      String content,
      String? emotion,
      String createdAt});
}

/// @nodoc
class _$TranscriptMessageCopyWithImpl<$Res, $Val extends TranscriptMessage>
    implements $TranscriptMessageCopyWith<$Res> {
  _$TranscriptMessageCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TranscriptMessage
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? role = null,
    Object? content = null,
    Object? emotion = freezed,
    Object? createdAt = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      role: null == role
          ? _value.role
          : role // ignore: cast_nullable_to_non_nullable
              as String,
      content: null == content
          ? _value.content
          : content // ignore: cast_nullable_to_non_nullable
              as String,
      emotion: freezed == emotion
          ? _value.emotion
          : emotion // ignore: cast_nullable_to_non_nullable
              as String?,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TranscriptMessageImplCopyWith<$Res>
    implements $TranscriptMessageCopyWith<$Res> {
  factory _$$TranscriptMessageImplCopyWith(_$TranscriptMessageImpl value,
          $Res Function(_$TranscriptMessageImpl) then) =
      __$$TranscriptMessageImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String role,
      String content,
      String? emotion,
      String createdAt});
}

/// @nodoc
class __$$TranscriptMessageImplCopyWithImpl<$Res>
    extends _$TranscriptMessageCopyWithImpl<$Res, _$TranscriptMessageImpl>
    implements _$$TranscriptMessageImplCopyWith<$Res> {
  __$$TranscriptMessageImplCopyWithImpl(_$TranscriptMessageImpl _value,
      $Res Function(_$TranscriptMessageImpl) _then)
      : super(_value, _then);

  /// Create a copy of TranscriptMessage
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? role = null,
    Object? content = null,
    Object? emotion = freezed,
    Object? createdAt = null,
  }) {
    return _then(_$TranscriptMessageImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      role: null == role
          ? _value.role
          : role // ignore: cast_nullable_to_non_nullable
              as String,
      content: null == content
          ? _value.content
          : content // ignore: cast_nullable_to_non_nullable
              as String,
      emotion: freezed == emotion
          ? _value.emotion
          : emotion // ignore: cast_nullable_to_non_nullable
              as String?,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TranscriptMessageImpl implements _TranscriptMessage {
  const _$TranscriptMessageImpl(
      {required this.id,
      required this.role,
      required this.content,
      this.emotion,
      required this.createdAt});

  factory _$TranscriptMessageImpl.fromJson(Map<String, dynamic> json) =>
      _$$TranscriptMessageImplFromJson(json);

  @override
  final String id;
  @override
  final String role;
  @override
  final String content;
  @override
  final String? emotion;
  @override
  final String createdAt;

  @override
  String toString() {
    return 'TranscriptMessage(id: $id, role: $role, content: $content, emotion: $emotion, createdAt: $createdAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TranscriptMessageImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.role, role) || other.role == role) &&
            (identical(other.content, content) || other.content == content) &&
            (identical(other.emotion, emotion) || other.emotion == emotion) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, id, role, content, emotion, createdAt);

  /// Create a copy of TranscriptMessage
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TranscriptMessageImplCopyWith<_$TranscriptMessageImpl> get copyWith =>
      __$$TranscriptMessageImplCopyWithImpl<_$TranscriptMessageImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TranscriptMessageImplToJson(
      this,
    );
  }
}

abstract class _TranscriptMessage implements TranscriptMessage {
  const factory _TranscriptMessage(
      {required final String id,
      required final String role,
      required final String content,
      final String? emotion,
      required final String createdAt}) = _$TranscriptMessageImpl;

  factory _TranscriptMessage.fromJson(Map<String, dynamic> json) =
      _$TranscriptMessageImpl.fromJson;

  @override
  String get id;
  @override
  String get role;
  @override
  String get content;
  @override
  String? get emotion;
  @override
  String get createdAt;

  /// Create a copy of TranscriptMessage
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TranscriptMessageImplCopyWith<_$TranscriptMessageImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TranscriptResponse _$TranscriptResponseFromJson(Map<String, dynamic> json) {
  return _TranscriptResponse.fromJson(json);
}

/// @nodoc
mixin _$TranscriptResponse {
  TranscriptSession get session => throw _privateConstructorUsedError;
  List<TranscriptMessage> get messages => throw _privateConstructorUsedError;

  /// Serializes this TranscriptResponse to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TranscriptResponse
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TranscriptResponseCopyWith<TranscriptResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TranscriptResponseCopyWith<$Res> {
  factory $TranscriptResponseCopyWith(
          TranscriptResponse value, $Res Function(TranscriptResponse) then) =
      _$TranscriptResponseCopyWithImpl<$Res, TranscriptResponse>;
  @useResult
  $Res call({TranscriptSession session, List<TranscriptMessage> messages});

  $TranscriptSessionCopyWith<$Res> get session;
}

/// @nodoc
class _$TranscriptResponseCopyWithImpl<$Res, $Val extends TranscriptResponse>
    implements $TranscriptResponseCopyWith<$Res> {
  _$TranscriptResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TranscriptResponse
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? session = null,
    Object? messages = null,
  }) {
    return _then(_value.copyWith(
      session: null == session
          ? _value.session
          : session // ignore: cast_nullable_to_non_nullable
              as TranscriptSession,
      messages: null == messages
          ? _value.messages
          : messages // ignore: cast_nullable_to_non_nullable
              as List<TranscriptMessage>,
    ) as $Val);
  }

  /// Create a copy of TranscriptResponse
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $TranscriptSessionCopyWith<$Res> get session {
    return $TranscriptSessionCopyWith<$Res>(_value.session, (value) {
      return _then(_value.copyWith(session: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$TranscriptResponseImplCopyWith<$Res>
    implements $TranscriptResponseCopyWith<$Res> {
  factory _$$TranscriptResponseImplCopyWith(_$TranscriptResponseImpl value,
          $Res Function(_$TranscriptResponseImpl) then) =
      __$$TranscriptResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({TranscriptSession session, List<TranscriptMessage> messages});

  @override
  $TranscriptSessionCopyWith<$Res> get session;
}

/// @nodoc
class __$$TranscriptResponseImplCopyWithImpl<$Res>
    extends _$TranscriptResponseCopyWithImpl<$Res, _$TranscriptResponseImpl>
    implements _$$TranscriptResponseImplCopyWith<$Res> {
  __$$TranscriptResponseImplCopyWithImpl(_$TranscriptResponseImpl _value,
      $Res Function(_$TranscriptResponseImpl) _then)
      : super(_value, _then);

  /// Create a copy of TranscriptResponse
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? session = null,
    Object? messages = null,
  }) {
    return _then(_$TranscriptResponseImpl(
      session: null == session
          ? _value.session
          : session // ignore: cast_nullable_to_non_nullable
              as TranscriptSession,
      messages: null == messages
          ? _value._messages
          : messages // ignore: cast_nullable_to_non_nullable
              as List<TranscriptMessage>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TranscriptResponseImpl implements _TranscriptResponse {
  const _$TranscriptResponseImpl(
      {required this.session, required final List<TranscriptMessage> messages})
      : _messages = messages;

  factory _$TranscriptResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$TranscriptResponseImplFromJson(json);

  @override
  final TranscriptSession session;
  final List<TranscriptMessage> _messages;
  @override
  List<TranscriptMessage> get messages {
    if (_messages is EqualUnmodifiableListView) return _messages;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_messages);
  }

  @override
  String toString() {
    return 'TranscriptResponse(session: $session, messages: $messages)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TranscriptResponseImpl &&
            (identical(other.session, session) || other.session == session) &&
            const DeepCollectionEquality().equals(other._messages, _messages));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, session, const DeepCollectionEquality().hash(_messages));

  /// Create a copy of TranscriptResponse
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TranscriptResponseImplCopyWith<_$TranscriptResponseImpl> get copyWith =>
      __$$TranscriptResponseImplCopyWithImpl<_$TranscriptResponseImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TranscriptResponseImplToJson(
      this,
    );
  }
}

abstract class _TranscriptResponse implements TranscriptResponse {
  const factory _TranscriptResponse(
          {required final TranscriptSession session,
          required final List<TranscriptMessage> messages}) =
      _$TranscriptResponseImpl;

  factory _TranscriptResponse.fromJson(Map<String, dynamic> json) =
      _$TranscriptResponseImpl.fromJson;

  @override
  TranscriptSession get session;
  @override
  List<TranscriptMessage> get messages;

  /// Create a copy of TranscriptResponse
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TranscriptResponseImplCopyWith<_$TranscriptResponseImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TranscriptSession _$TranscriptSessionFromJson(Map<String, dynamic> json) {
  return _TranscriptSession.fromJson(json);
}

/// @nodoc
mixin _$TranscriptSession {
  String get id => throw _privateConstructorUsedError;
  String get subject => throw _privateConstructorUsedError;
  String? get topic => throw _privateConstructorUsedError;
  AnalyticsPersona get persona => throw _privateConstructorUsedError;
  String get startedAt => throw _privateConstructorUsedError;
  String? get endedAt => throw _privateConstructorUsedError;
  int get durationMinutes => throw _privateConstructorUsedError;
  String? get locale => throw _privateConstructorUsedError;

  /// Serializes this TranscriptSession to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TranscriptSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TranscriptSessionCopyWith<TranscriptSession> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TranscriptSessionCopyWith<$Res> {
  factory $TranscriptSessionCopyWith(
          TranscriptSession value, $Res Function(TranscriptSession) then) =
      _$TranscriptSessionCopyWithImpl<$Res, TranscriptSession>;
  @useResult
  $Res call(
      {String id,
      String subject,
      String? topic,
      AnalyticsPersona persona,
      String startedAt,
      String? endedAt,
      int durationMinutes,
      String? locale});

  $AnalyticsPersonaCopyWith<$Res> get persona;
}

/// @nodoc
class _$TranscriptSessionCopyWithImpl<$Res, $Val extends TranscriptSession>
    implements $TranscriptSessionCopyWith<$Res> {
  _$TranscriptSessionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TranscriptSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? subject = null,
    Object? topic = freezed,
    Object? persona = null,
    Object? startedAt = null,
    Object? endedAt = freezed,
    Object? durationMinutes = null,
    Object? locale = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      topic: freezed == topic
          ? _value.topic
          : topic // ignore: cast_nullable_to_non_nullable
              as String?,
      persona: null == persona
          ? _value.persona
          : persona // ignore: cast_nullable_to_non_nullable
              as AnalyticsPersona,
      startedAt: null == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as String,
      endedAt: freezed == endedAt
          ? _value.endedAt
          : endedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      locale: freezed == locale
          ? _value.locale
          : locale // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }

  /// Create a copy of TranscriptSession
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $AnalyticsPersonaCopyWith<$Res> get persona {
    return $AnalyticsPersonaCopyWith<$Res>(_value.persona, (value) {
      return _then(_value.copyWith(persona: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$TranscriptSessionImplCopyWith<$Res>
    implements $TranscriptSessionCopyWith<$Res> {
  factory _$$TranscriptSessionImplCopyWith(_$TranscriptSessionImpl value,
          $Res Function(_$TranscriptSessionImpl) then) =
      __$$TranscriptSessionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String subject,
      String? topic,
      AnalyticsPersona persona,
      String startedAt,
      String? endedAt,
      int durationMinutes,
      String? locale});

  @override
  $AnalyticsPersonaCopyWith<$Res> get persona;
}

/// @nodoc
class __$$TranscriptSessionImplCopyWithImpl<$Res>
    extends _$TranscriptSessionCopyWithImpl<$Res, _$TranscriptSessionImpl>
    implements _$$TranscriptSessionImplCopyWith<$Res> {
  __$$TranscriptSessionImplCopyWithImpl(_$TranscriptSessionImpl _value,
      $Res Function(_$TranscriptSessionImpl) _then)
      : super(_value, _then);

  /// Create a copy of TranscriptSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? subject = null,
    Object? topic = freezed,
    Object? persona = null,
    Object? startedAt = null,
    Object? endedAt = freezed,
    Object? durationMinutes = null,
    Object? locale = freezed,
  }) {
    return _then(_$TranscriptSessionImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      topic: freezed == topic
          ? _value.topic
          : topic // ignore: cast_nullable_to_non_nullable
              as String?,
      persona: null == persona
          ? _value.persona
          : persona // ignore: cast_nullable_to_non_nullable
              as AnalyticsPersona,
      startedAt: null == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as String,
      endedAt: freezed == endedAt
          ? _value.endedAt
          : endedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      locale: freezed == locale
          ? _value.locale
          : locale // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TranscriptSessionImpl implements _TranscriptSession {
  const _$TranscriptSessionImpl(
      {required this.id,
      required this.subject,
      this.topic,
      required this.persona,
      required this.startedAt,
      this.endedAt,
      required this.durationMinutes,
      this.locale});

  factory _$TranscriptSessionImpl.fromJson(Map<String, dynamic> json) =>
      _$$TranscriptSessionImplFromJson(json);

  @override
  final String id;
  @override
  final String subject;
  @override
  final String? topic;
  @override
  final AnalyticsPersona persona;
  @override
  final String startedAt;
  @override
  final String? endedAt;
  @override
  final int durationMinutes;
  @override
  final String? locale;

  @override
  String toString() {
    return 'TranscriptSession(id: $id, subject: $subject, topic: $topic, persona: $persona, startedAt: $startedAt, endedAt: $endedAt, durationMinutes: $durationMinutes, locale: $locale)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TranscriptSessionImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.subject, subject) || other.subject == subject) &&
            (identical(other.topic, topic) || other.topic == topic) &&
            (identical(other.persona, persona) || other.persona == persona) &&
            (identical(other.startedAt, startedAt) ||
                other.startedAt == startedAt) &&
            (identical(other.endedAt, endedAt) || other.endedAt == endedAt) &&
            (identical(other.durationMinutes, durationMinutes) ||
                other.durationMinutes == durationMinutes) &&
            (identical(other.locale, locale) || other.locale == locale));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, subject, topic, persona,
      startedAt, endedAt, durationMinutes, locale);

  /// Create a copy of TranscriptSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TranscriptSessionImplCopyWith<_$TranscriptSessionImpl> get copyWith =>
      __$$TranscriptSessionImplCopyWithImpl<_$TranscriptSessionImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TranscriptSessionImplToJson(
      this,
    );
  }
}

abstract class _TranscriptSession implements TranscriptSession {
  const factory _TranscriptSession(
      {required final String id,
      required final String subject,
      final String? topic,
      required final AnalyticsPersona persona,
      required final String startedAt,
      final String? endedAt,
      required final int durationMinutes,
      final String? locale}) = _$TranscriptSessionImpl;

  factory _TranscriptSession.fromJson(Map<String, dynamic> json) =
      _$TranscriptSessionImpl.fromJson;

  @override
  String get id;
  @override
  String get subject;
  @override
  String? get topic;
  @override
  AnalyticsPersona get persona;
  @override
  String get startedAt;
  @override
  String? get endedAt;
  @override
  int get durationMinutes;
  @override
  String? get locale;

  /// Create a copy of TranscriptSession
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TranscriptSessionImplCopyWith<_$TranscriptSessionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
