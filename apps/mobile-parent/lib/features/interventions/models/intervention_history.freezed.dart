// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'intervention_history.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

InterventionRecord _$InterventionRecordFromJson(Map<String, dynamic> json) {
  return _InterventionRecord.fromJson(json);
}

/// @nodoc
mixin _$InterventionRecord {
  String get id => throw _privateConstructorUsedError;
  String get childId => throw _privateConstructorUsedError;
  InterventionType get type => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  DateTime get startDate => throw _privateConstructorUsedError;
  DateTime? get endDate => throw _privateConstructorUsedError;
  InterventionStatus get status => throw _privateConstructorUsedError;
  InterventionCategory get category => throw _privateConstructorUsedError;
  InterventionOutcome? get outcome => throw _privateConstructorUsedError;
  String? get assignedBy => throw _privateConstructorUsedError;
  String? get assignedByName => throw _privateConstructorUsedError;
  List<String> get goals => throw _privateConstructorUsedError;
  List<InterventionProgress> get progressHistory =>
      throw _privateConstructorUsedError;
  Map<String, dynamic>? get metadata => throw _privateConstructorUsedError;

  /// Serializes this InterventionRecord to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of InterventionRecord
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $InterventionRecordCopyWith<InterventionRecord> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $InterventionRecordCopyWith<$Res> {
  factory $InterventionRecordCopyWith(
          InterventionRecord value, $Res Function(InterventionRecord) then) =
      _$InterventionRecordCopyWithImpl<$Res, InterventionRecord>;
  @useResult
  $Res call(
      {String id,
      String childId,
      InterventionType type,
      String title,
      String description,
      DateTime startDate,
      DateTime? endDate,
      InterventionStatus status,
      InterventionCategory category,
      InterventionOutcome? outcome,
      String? assignedBy,
      String? assignedByName,
      List<String> goals,
      List<InterventionProgress> progressHistory,
      Map<String, dynamic>? metadata});

  $InterventionOutcomeCopyWith<$Res>? get outcome;
}

/// @nodoc
class _$InterventionRecordCopyWithImpl<$Res, $Val extends InterventionRecord>
    implements $InterventionRecordCopyWith<$Res> {
  _$InterventionRecordCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of InterventionRecord
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? childId = null,
    Object? type = null,
    Object? title = null,
    Object? description = null,
    Object? startDate = null,
    Object? endDate = freezed,
    Object? status = null,
    Object? category = null,
    Object? outcome = freezed,
    Object? assignedBy = freezed,
    Object? assignedByName = freezed,
    Object? goals = null,
    Object? progressHistory = null,
    Object? metadata = freezed,
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
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as InterventionType,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      startDate: null == startDate
          ? _value.startDate
          : startDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endDate: freezed == endDate
          ? _value.endDate
          : endDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as InterventionStatus,
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as InterventionCategory,
      outcome: freezed == outcome
          ? _value.outcome
          : outcome // ignore: cast_nullable_to_non_nullable
              as InterventionOutcome?,
      assignedBy: freezed == assignedBy
          ? _value.assignedBy
          : assignedBy // ignore: cast_nullable_to_non_nullable
              as String?,
      assignedByName: freezed == assignedByName
          ? _value.assignedByName
          : assignedByName // ignore: cast_nullable_to_non_nullable
              as String?,
      goals: null == goals
          ? _value.goals
          : goals // ignore: cast_nullable_to_non_nullable
              as List<String>,
      progressHistory: null == progressHistory
          ? _value.progressHistory
          : progressHistory // ignore: cast_nullable_to_non_nullable
              as List<InterventionProgress>,
      metadata: freezed == metadata
          ? _value.metadata
          : metadata // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ) as $Val);
  }

  /// Create a copy of InterventionRecord
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $InterventionOutcomeCopyWith<$Res>? get outcome {
    if (_value.outcome == null) {
      return null;
    }

    return $InterventionOutcomeCopyWith<$Res>(_value.outcome!, (value) {
      return _then(_value.copyWith(outcome: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$InterventionRecordImplCopyWith<$Res>
    implements $InterventionRecordCopyWith<$Res> {
  factory _$$InterventionRecordImplCopyWith(_$InterventionRecordImpl value,
          $Res Function(_$InterventionRecordImpl) then) =
      __$$InterventionRecordImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String childId,
      InterventionType type,
      String title,
      String description,
      DateTime startDate,
      DateTime? endDate,
      InterventionStatus status,
      InterventionCategory category,
      InterventionOutcome? outcome,
      String? assignedBy,
      String? assignedByName,
      List<String> goals,
      List<InterventionProgress> progressHistory,
      Map<String, dynamic>? metadata});

  @override
  $InterventionOutcomeCopyWith<$Res>? get outcome;
}

/// @nodoc
class __$$InterventionRecordImplCopyWithImpl<$Res>
    extends _$InterventionRecordCopyWithImpl<$Res, _$InterventionRecordImpl>
    implements _$$InterventionRecordImplCopyWith<$Res> {
  __$$InterventionRecordImplCopyWithImpl(_$InterventionRecordImpl _value,
      $Res Function(_$InterventionRecordImpl) _then)
      : super(_value, _then);

  /// Create a copy of InterventionRecord
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? childId = null,
    Object? type = null,
    Object? title = null,
    Object? description = null,
    Object? startDate = null,
    Object? endDate = freezed,
    Object? status = null,
    Object? category = null,
    Object? outcome = freezed,
    Object? assignedBy = freezed,
    Object? assignedByName = freezed,
    Object? goals = null,
    Object? progressHistory = null,
    Object? metadata = freezed,
  }) {
    return _then(_$InterventionRecordImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as InterventionType,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      startDate: null == startDate
          ? _value.startDate
          : startDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endDate: freezed == endDate
          ? _value.endDate
          : endDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as InterventionStatus,
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as InterventionCategory,
      outcome: freezed == outcome
          ? _value.outcome
          : outcome // ignore: cast_nullable_to_non_nullable
              as InterventionOutcome?,
      assignedBy: freezed == assignedBy
          ? _value.assignedBy
          : assignedBy // ignore: cast_nullable_to_non_nullable
              as String?,
      assignedByName: freezed == assignedByName
          ? _value.assignedByName
          : assignedByName // ignore: cast_nullable_to_non_nullable
              as String?,
      goals: null == goals
          ? _value._goals
          : goals // ignore: cast_nullable_to_non_nullable
              as List<String>,
      progressHistory: null == progressHistory
          ? _value._progressHistory
          : progressHistory // ignore: cast_nullable_to_non_nullable
              as List<InterventionProgress>,
      metadata: freezed == metadata
          ? _value._metadata
          : metadata // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$InterventionRecordImpl implements _InterventionRecord {
  const _$InterventionRecordImpl(
      {required this.id,
      required this.childId,
      required this.type,
      required this.title,
      required this.description,
      required this.startDate,
      this.endDate,
      required this.status,
      required this.category,
      this.outcome,
      this.assignedBy,
      this.assignedByName,
      final List<String> goals = const [],
      final List<InterventionProgress> progressHistory = const [],
      final Map<String, dynamic>? metadata})
      : _goals = goals,
        _progressHistory = progressHistory,
        _metadata = metadata;

  factory _$InterventionRecordImpl.fromJson(Map<String, dynamic> json) =>
      _$$InterventionRecordImplFromJson(json);

  @override
  final String id;
  @override
  final String childId;
  @override
  final InterventionType type;
  @override
  final String title;
  @override
  final String description;
  @override
  final DateTime startDate;
  @override
  final DateTime? endDate;
  @override
  final InterventionStatus status;
  @override
  final InterventionCategory category;
  @override
  final InterventionOutcome? outcome;
  @override
  final String? assignedBy;
  @override
  final String? assignedByName;
  final List<String> _goals;
  @override
  @JsonKey()
  List<String> get goals {
    if (_goals is EqualUnmodifiableListView) return _goals;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_goals);
  }

  final List<InterventionProgress> _progressHistory;
  @override
  @JsonKey()
  List<InterventionProgress> get progressHistory {
    if (_progressHistory is EqualUnmodifiableListView) return _progressHistory;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_progressHistory);
  }

  final Map<String, dynamic>? _metadata;
  @override
  Map<String, dynamic>? get metadata {
    final value = _metadata;
    if (value == null) return null;
    if (_metadata is EqualUnmodifiableMapView) return _metadata;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  String toString() {
    return 'InterventionRecord(id: $id, childId: $childId, type: $type, title: $title, description: $description, startDate: $startDate, endDate: $endDate, status: $status, category: $category, outcome: $outcome, assignedBy: $assignedBy, assignedByName: $assignedByName, goals: $goals, progressHistory: $progressHistory, metadata: $metadata)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$InterventionRecordImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.startDate, startDate) ||
                other.startDate == startDate) &&
            (identical(other.endDate, endDate) || other.endDate == endDate) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.category, category) ||
                other.category == category) &&
            (identical(other.outcome, outcome) || other.outcome == outcome) &&
            (identical(other.assignedBy, assignedBy) ||
                other.assignedBy == assignedBy) &&
            (identical(other.assignedByName, assignedByName) ||
                other.assignedByName == assignedByName) &&
            const DeepCollectionEquality().equals(other._goals, _goals) &&
            const DeepCollectionEquality()
                .equals(other._progressHistory, _progressHistory) &&
            const DeepCollectionEquality().equals(other._metadata, _metadata));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      childId,
      type,
      title,
      description,
      startDate,
      endDate,
      status,
      category,
      outcome,
      assignedBy,
      assignedByName,
      const DeepCollectionEquality().hash(_goals),
      const DeepCollectionEquality().hash(_progressHistory),
      const DeepCollectionEquality().hash(_metadata));

  /// Create a copy of InterventionRecord
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$InterventionRecordImplCopyWith<_$InterventionRecordImpl> get copyWith =>
      __$$InterventionRecordImplCopyWithImpl<_$InterventionRecordImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$InterventionRecordImplToJson(
      this,
    );
  }
}

abstract class _InterventionRecord implements InterventionRecord {
  const factory _InterventionRecord(
      {required final String id,
      required final String childId,
      required final InterventionType type,
      required final String title,
      required final String description,
      required final DateTime startDate,
      final DateTime? endDate,
      required final InterventionStatus status,
      required final InterventionCategory category,
      final InterventionOutcome? outcome,
      final String? assignedBy,
      final String? assignedByName,
      final List<String> goals,
      final List<InterventionProgress> progressHistory,
      final Map<String, dynamic>? metadata}) = _$InterventionRecordImpl;

  factory _InterventionRecord.fromJson(Map<String, dynamic> json) =
      _$InterventionRecordImpl.fromJson;

  @override
  String get id;
  @override
  String get childId;
  @override
  InterventionType get type;
  @override
  String get title;
  @override
  String get description;
  @override
  DateTime get startDate;
  @override
  DateTime? get endDate;
  @override
  InterventionStatus get status;
  @override
  InterventionCategory get category;
  @override
  InterventionOutcome? get outcome;
  @override
  String? get assignedBy;
  @override
  String? get assignedByName;
  @override
  List<String> get goals;
  @override
  List<InterventionProgress> get progressHistory;
  @override
  Map<String, dynamic>? get metadata;

  /// Create a copy of InterventionRecord
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$InterventionRecordImplCopyWith<_$InterventionRecordImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

InterventionOutcome _$InterventionOutcomeFromJson(Map<String, dynamic> json) {
  return _InterventionOutcome.fromJson(json);
}

/// @nodoc
mixin _$InterventionOutcome {
  SuccessLevel get successLevel => throw _privateConstructorUsedError;
  Map<String, double> get metrics => throw _privateConstructorUsedError;
  String? get notes => throw _privateConstructorUsedError;
  DateTime? get evaluatedAt => throw _privateConstructorUsedError;
  String? get evaluatedBy => throw _privateConstructorUsedError;
  List<String> get improvements => throw _privateConstructorUsedError;
  List<String> get challenges => throw _privateConstructorUsedError;

  /// Serializes this InterventionOutcome to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of InterventionOutcome
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $InterventionOutcomeCopyWith<InterventionOutcome> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $InterventionOutcomeCopyWith<$Res> {
  factory $InterventionOutcomeCopyWith(
          InterventionOutcome value, $Res Function(InterventionOutcome) then) =
      _$InterventionOutcomeCopyWithImpl<$Res, InterventionOutcome>;
  @useResult
  $Res call(
      {SuccessLevel successLevel,
      Map<String, double> metrics,
      String? notes,
      DateTime? evaluatedAt,
      String? evaluatedBy,
      List<String> improvements,
      List<String> challenges});
}

/// @nodoc
class _$InterventionOutcomeCopyWithImpl<$Res, $Val extends InterventionOutcome>
    implements $InterventionOutcomeCopyWith<$Res> {
  _$InterventionOutcomeCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of InterventionOutcome
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? successLevel = null,
    Object? metrics = null,
    Object? notes = freezed,
    Object? evaluatedAt = freezed,
    Object? evaluatedBy = freezed,
    Object? improvements = null,
    Object? challenges = null,
  }) {
    return _then(_value.copyWith(
      successLevel: null == successLevel
          ? _value.successLevel
          : successLevel // ignore: cast_nullable_to_non_nullable
              as SuccessLevel,
      metrics: null == metrics
          ? _value.metrics
          : metrics // ignore: cast_nullable_to_non_nullable
              as Map<String, double>,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
      evaluatedAt: freezed == evaluatedAt
          ? _value.evaluatedAt
          : evaluatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      evaluatedBy: freezed == evaluatedBy
          ? _value.evaluatedBy
          : evaluatedBy // ignore: cast_nullable_to_non_nullable
              as String?,
      improvements: null == improvements
          ? _value.improvements
          : improvements // ignore: cast_nullable_to_non_nullable
              as List<String>,
      challenges: null == challenges
          ? _value.challenges
          : challenges // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$InterventionOutcomeImplCopyWith<$Res>
    implements $InterventionOutcomeCopyWith<$Res> {
  factory _$$InterventionOutcomeImplCopyWith(_$InterventionOutcomeImpl value,
          $Res Function(_$InterventionOutcomeImpl) then) =
      __$$InterventionOutcomeImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {SuccessLevel successLevel,
      Map<String, double> metrics,
      String? notes,
      DateTime? evaluatedAt,
      String? evaluatedBy,
      List<String> improvements,
      List<String> challenges});
}

/// @nodoc
class __$$InterventionOutcomeImplCopyWithImpl<$Res>
    extends _$InterventionOutcomeCopyWithImpl<$Res, _$InterventionOutcomeImpl>
    implements _$$InterventionOutcomeImplCopyWith<$Res> {
  __$$InterventionOutcomeImplCopyWithImpl(_$InterventionOutcomeImpl _value,
      $Res Function(_$InterventionOutcomeImpl) _then)
      : super(_value, _then);

  /// Create a copy of InterventionOutcome
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? successLevel = null,
    Object? metrics = null,
    Object? notes = freezed,
    Object? evaluatedAt = freezed,
    Object? evaluatedBy = freezed,
    Object? improvements = null,
    Object? challenges = null,
  }) {
    return _then(_$InterventionOutcomeImpl(
      successLevel: null == successLevel
          ? _value.successLevel
          : successLevel // ignore: cast_nullable_to_non_nullable
              as SuccessLevel,
      metrics: null == metrics
          ? _value._metrics
          : metrics // ignore: cast_nullable_to_non_nullable
              as Map<String, double>,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
      evaluatedAt: freezed == evaluatedAt
          ? _value.evaluatedAt
          : evaluatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      evaluatedBy: freezed == evaluatedBy
          ? _value.evaluatedBy
          : evaluatedBy // ignore: cast_nullable_to_non_nullable
              as String?,
      improvements: null == improvements
          ? _value._improvements
          : improvements // ignore: cast_nullable_to_non_nullable
              as List<String>,
      challenges: null == challenges
          ? _value._challenges
          : challenges // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$InterventionOutcomeImpl implements _InterventionOutcome {
  const _$InterventionOutcomeImpl(
      {required this.successLevel,
      required final Map<String, double> metrics,
      this.notes,
      this.evaluatedAt,
      this.evaluatedBy,
      final List<String> improvements = const [],
      final List<String> challenges = const []})
      : _metrics = metrics,
        _improvements = improvements,
        _challenges = challenges;

  factory _$InterventionOutcomeImpl.fromJson(Map<String, dynamic> json) =>
      _$$InterventionOutcomeImplFromJson(json);

  @override
  final SuccessLevel successLevel;
  final Map<String, double> _metrics;
  @override
  Map<String, double> get metrics {
    if (_metrics is EqualUnmodifiableMapView) return _metrics;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_metrics);
  }

  @override
  final String? notes;
  @override
  final DateTime? evaluatedAt;
  @override
  final String? evaluatedBy;
  final List<String> _improvements;
  @override
  @JsonKey()
  List<String> get improvements {
    if (_improvements is EqualUnmodifiableListView) return _improvements;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_improvements);
  }

  final List<String> _challenges;
  @override
  @JsonKey()
  List<String> get challenges {
    if (_challenges is EqualUnmodifiableListView) return _challenges;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_challenges);
  }

  @override
  String toString() {
    return 'InterventionOutcome(successLevel: $successLevel, metrics: $metrics, notes: $notes, evaluatedAt: $evaluatedAt, evaluatedBy: $evaluatedBy, improvements: $improvements, challenges: $challenges)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$InterventionOutcomeImpl &&
            (identical(other.successLevel, successLevel) ||
                other.successLevel == successLevel) &&
            const DeepCollectionEquality().equals(other._metrics, _metrics) &&
            (identical(other.notes, notes) || other.notes == notes) &&
            (identical(other.evaluatedAt, evaluatedAt) ||
                other.evaluatedAt == evaluatedAt) &&
            (identical(other.evaluatedBy, evaluatedBy) ||
                other.evaluatedBy == evaluatedBy) &&
            const DeepCollectionEquality()
                .equals(other._improvements, _improvements) &&
            const DeepCollectionEquality()
                .equals(other._challenges, _challenges));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      successLevel,
      const DeepCollectionEquality().hash(_metrics),
      notes,
      evaluatedAt,
      evaluatedBy,
      const DeepCollectionEquality().hash(_improvements),
      const DeepCollectionEquality().hash(_challenges));

  /// Create a copy of InterventionOutcome
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$InterventionOutcomeImplCopyWith<_$InterventionOutcomeImpl> get copyWith =>
      __$$InterventionOutcomeImplCopyWithImpl<_$InterventionOutcomeImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$InterventionOutcomeImplToJson(
      this,
    );
  }
}

abstract class _InterventionOutcome implements InterventionOutcome {
  const factory _InterventionOutcome(
      {required final SuccessLevel successLevel,
      required final Map<String, double> metrics,
      final String? notes,
      final DateTime? evaluatedAt,
      final String? evaluatedBy,
      final List<String> improvements,
      final List<String> challenges}) = _$InterventionOutcomeImpl;

  factory _InterventionOutcome.fromJson(Map<String, dynamic> json) =
      _$InterventionOutcomeImpl.fromJson;

  @override
  SuccessLevel get successLevel;
  @override
  Map<String, double> get metrics;
  @override
  String? get notes;
  @override
  DateTime? get evaluatedAt;
  @override
  String? get evaluatedBy;
  @override
  List<String> get improvements;
  @override
  List<String> get challenges;

  /// Create a copy of InterventionOutcome
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$InterventionOutcomeImplCopyWith<_$InterventionOutcomeImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

InterventionProgress _$InterventionProgressFromJson(Map<String, dynamic> json) {
  return _InterventionProgress.fromJson(json);
}

/// @nodoc
mixin _$InterventionProgress {
  DateTime get date => throw _privateConstructorUsedError;
  double get progressValue => throw _privateConstructorUsedError;
  String? get notes => throw _privateConstructorUsedError;
  String? get recordedBy => throw _privateConstructorUsedError;

  /// Serializes this InterventionProgress to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of InterventionProgress
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $InterventionProgressCopyWith<InterventionProgress> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $InterventionProgressCopyWith<$Res> {
  factory $InterventionProgressCopyWith(InterventionProgress value,
          $Res Function(InterventionProgress) then) =
      _$InterventionProgressCopyWithImpl<$Res, InterventionProgress>;
  @useResult
  $Res call(
      {DateTime date, double progressValue, String? notes, String? recordedBy});
}

/// @nodoc
class _$InterventionProgressCopyWithImpl<$Res,
        $Val extends InterventionProgress>
    implements $InterventionProgressCopyWith<$Res> {
  _$InterventionProgressCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of InterventionProgress
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? date = null,
    Object? progressValue = null,
    Object? notes = freezed,
    Object? recordedBy = freezed,
  }) {
    return _then(_value.copyWith(
      date: null == date
          ? _value.date
          : date // ignore: cast_nullable_to_non_nullable
              as DateTime,
      progressValue: null == progressValue
          ? _value.progressValue
          : progressValue // ignore: cast_nullable_to_non_nullable
              as double,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
      recordedBy: freezed == recordedBy
          ? _value.recordedBy
          : recordedBy // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$InterventionProgressImplCopyWith<$Res>
    implements $InterventionProgressCopyWith<$Res> {
  factory _$$InterventionProgressImplCopyWith(_$InterventionProgressImpl value,
          $Res Function(_$InterventionProgressImpl) then) =
      __$$InterventionProgressImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {DateTime date, double progressValue, String? notes, String? recordedBy});
}

/// @nodoc
class __$$InterventionProgressImplCopyWithImpl<$Res>
    extends _$InterventionProgressCopyWithImpl<$Res, _$InterventionProgressImpl>
    implements _$$InterventionProgressImplCopyWith<$Res> {
  __$$InterventionProgressImplCopyWithImpl(_$InterventionProgressImpl _value,
      $Res Function(_$InterventionProgressImpl) _then)
      : super(_value, _then);

  /// Create a copy of InterventionProgress
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? date = null,
    Object? progressValue = null,
    Object? notes = freezed,
    Object? recordedBy = freezed,
  }) {
    return _then(_$InterventionProgressImpl(
      date: null == date
          ? _value.date
          : date // ignore: cast_nullable_to_non_nullable
              as DateTime,
      progressValue: null == progressValue
          ? _value.progressValue
          : progressValue // ignore: cast_nullable_to_non_nullable
              as double,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
      recordedBy: freezed == recordedBy
          ? _value.recordedBy
          : recordedBy // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$InterventionProgressImpl implements _InterventionProgress {
  const _$InterventionProgressImpl(
      {required this.date,
      required this.progressValue,
      this.notes,
      this.recordedBy});

  factory _$InterventionProgressImpl.fromJson(Map<String, dynamic> json) =>
      _$$InterventionProgressImplFromJson(json);

  @override
  final DateTime date;
  @override
  final double progressValue;
  @override
  final String? notes;
  @override
  final String? recordedBy;

  @override
  String toString() {
    return 'InterventionProgress(date: $date, progressValue: $progressValue, notes: $notes, recordedBy: $recordedBy)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$InterventionProgressImpl &&
            (identical(other.date, date) || other.date == date) &&
            (identical(other.progressValue, progressValue) ||
                other.progressValue == progressValue) &&
            (identical(other.notes, notes) || other.notes == notes) &&
            (identical(other.recordedBy, recordedBy) ||
                other.recordedBy == recordedBy));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, date, progressValue, notes, recordedBy);

  /// Create a copy of InterventionProgress
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$InterventionProgressImplCopyWith<_$InterventionProgressImpl>
      get copyWith =>
          __$$InterventionProgressImplCopyWithImpl<_$InterventionProgressImpl>(
              this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$InterventionProgressImplToJson(
      this,
    );
  }
}

abstract class _InterventionProgress implements InterventionProgress {
  const factory _InterventionProgress(
      {required final DateTime date,
      required final double progressValue,
      final String? notes,
      final String? recordedBy}) = _$InterventionProgressImpl;

  factory _InterventionProgress.fromJson(Map<String, dynamic> json) =
      _$InterventionProgressImpl.fromJson;

  @override
  DateTime get date;
  @override
  double get progressValue;
  @override
  String? get notes;
  @override
  String? get recordedBy;

  /// Create a copy of InterventionProgress
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$InterventionProgressImplCopyWith<_$InterventionProgressImpl>
      get copyWith => throw _privateConstructorUsedError;
}

InterventionSummary _$InterventionSummaryFromJson(Map<String, dynamic> json) {
  return _InterventionSummary.fromJson(json);
}

/// @nodoc
mixin _$InterventionSummary {
  String get childId => throw _privateConstructorUsedError;
  int get totalInterventions => throw _privateConstructorUsedError;
  int get activeCount => throw _privateConstructorUsedError;
  int get completedCount => throw _privateConstructorUsedError;
  int get successfulCount => throw _privateConstructorUsedError;
  Map<InterventionCategory, int> get byCategory =>
      throw _privateConstructorUsedError;
  DateTime? get lastUpdated => throw _privateConstructorUsedError;

  /// Serializes this InterventionSummary to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of InterventionSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $InterventionSummaryCopyWith<InterventionSummary> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $InterventionSummaryCopyWith<$Res> {
  factory $InterventionSummaryCopyWith(
          InterventionSummary value, $Res Function(InterventionSummary) then) =
      _$InterventionSummaryCopyWithImpl<$Res, InterventionSummary>;
  @useResult
  $Res call(
      {String childId,
      int totalInterventions,
      int activeCount,
      int completedCount,
      int successfulCount,
      Map<InterventionCategory, int> byCategory,
      DateTime? lastUpdated});
}

/// @nodoc
class _$InterventionSummaryCopyWithImpl<$Res, $Val extends InterventionSummary>
    implements $InterventionSummaryCopyWith<$Res> {
  _$InterventionSummaryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of InterventionSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? totalInterventions = null,
    Object? activeCount = null,
    Object? completedCount = null,
    Object? successfulCount = null,
    Object? byCategory = null,
    Object? lastUpdated = freezed,
  }) {
    return _then(_value.copyWith(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      totalInterventions: null == totalInterventions
          ? _value.totalInterventions
          : totalInterventions // ignore: cast_nullable_to_non_nullable
              as int,
      activeCount: null == activeCount
          ? _value.activeCount
          : activeCount // ignore: cast_nullable_to_non_nullable
              as int,
      completedCount: null == completedCount
          ? _value.completedCount
          : completedCount // ignore: cast_nullable_to_non_nullable
              as int,
      successfulCount: null == successfulCount
          ? _value.successfulCount
          : successfulCount // ignore: cast_nullable_to_non_nullable
              as int,
      byCategory: null == byCategory
          ? _value.byCategory
          : byCategory // ignore: cast_nullable_to_non_nullable
              as Map<InterventionCategory, int>,
      lastUpdated: freezed == lastUpdated
          ? _value.lastUpdated
          : lastUpdated // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$InterventionSummaryImplCopyWith<$Res>
    implements $InterventionSummaryCopyWith<$Res> {
  factory _$$InterventionSummaryImplCopyWith(_$InterventionSummaryImpl value,
          $Res Function(_$InterventionSummaryImpl) then) =
      __$$InterventionSummaryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String childId,
      int totalInterventions,
      int activeCount,
      int completedCount,
      int successfulCount,
      Map<InterventionCategory, int> byCategory,
      DateTime? lastUpdated});
}

/// @nodoc
class __$$InterventionSummaryImplCopyWithImpl<$Res>
    extends _$InterventionSummaryCopyWithImpl<$Res, _$InterventionSummaryImpl>
    implements _$$InterventionSummaryImplCopyWith<$Res> {
  __$$InterventionSummaryImplCopyWithImpl(_$InterventionSummaryImpl _value,
      $Res Function(_$InterventionSummaryImpl) _then)
      : super(_value, _then);

  /// Create a copy of InterventionSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? totalInterventions = null,
    Object? activeCount = null,
    Object? completedCount = null,
    Object? successfulCount = null,
    Object? byCategory = null,
    Object? lastUpdated = freezed,
  }) {
    return _then(_$InterventionSummaryImpl(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      totalInterventions: null == totalInterventions
          ? _value.totalInterventions
          : totalInterventions // ignore: cast_nullable_to_non_nullable
              as int,
      activeCount: null == activeCount
          ? _value.activeCount
          : activeCount // ignore: cast_nullable_to_non_nullable
              as int,
      completedCount: null == completedCount
          ? _value.completedCount
          : completedCount // ignore: cast_nullable_to_non_nullable
              as int,
      successfulCount: null == successfulCount
          ? _value.successfulCount
          : successfulCount // ignore: cast_nullable_to_non_nullable
              as int,
      byCategory: null == byCategory
          ? _value._byCategory
          : byCategory // ignore: cast_nullable_to_non_nullable
              as Map<InterventionCategory, int>,
      lastUpdated: freezed == lastUpdated
          ? _value.lastUpdated
          : lastUpdated // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$InterventionSummaryImpl implements _InterventionSummary {
  const _$InterventionSummaryImpl(
      {required this.childId,
      required this.totalInterventions,
      required this.activeCount,
      required this.completedCount,
      required this.successfulCount,
      required final Map<InterventionCategory, int> byCategory,
      this.lastUpdated})
      : _byCategory = byCategory;

  factory _$InterventionSummaryImpl.fromJson(Map<String, dynamic> json) =>
      _$$InterventionSummaryImplFromJson(json);

  @override
  final String childId;
  @override
  final int totalInterventions;
  @override
  final int activeCount;
  @override
  final int completedCount;
  @override
  final int successfulCount;
  final Map<InterventionCategory, int> _byCategory;
  @override
  Map<InterventionCategory, int> get byCategory {
    if (_byCategory is EqualUnmodifiableMapView) return _byCategory;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_byCategory);
  }

  @override
  final DateTime? lastUpdated;

  @override
  String toString() {
    return 'InterventionSummary(childId: $childId, totalInterventions: $totalInterventions, activeCount: $activeCount, completedCount: $completedCount, successfulCount: $successfulCount, byCategory: $byCategory, lastUpdated: $lastUpdated)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$InterventionSummaryImpl &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.totalInterventions, totalInterventions) ||
                other.totalInterventions == totalInterventions) &&
            (identical(other.activeCount, activeCount) ||
                other.activeCount == activeCount) &&
            (identical(other.completedCount, completedCount) ||
                other.completedCount == completedCount) &&
            (identical(other.successfulCount, successfulCount) ||
                other.successfulCount == successfulCount) &&
            const DeepCollectionEquality()
                .equals(other._byCategory, _byCategory) &&
            (identical(other.lastUpdated, lastUpdated) ||
                other.lastUpdated == lastUpdated));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      childId,
      totalInterventions,
      activeCount,
      completedCount,
      successfulCount,
      const DeepCollectionEquality().hash(_byCategory),
      lastUpdated);

  /// Create a copy of InterventionSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$InterventionSummaryImplCopyWith<_$InterventionSummaryImpl> get copyWith =>
      __$$InterventionSummaryImplCopyWithImpl<_$InterventionSummaryImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$InterventionSummaryImplToJson(
      this,
    );
  }
}

abstract class _InterventionSummary implements InterventionSummary {
  const factory _InterventionSummary(
      {required final String childId,
      required final int totalInterventions,
      required final int activeCount,
      required final int completedCount,
      required final int successfulCount,
      required final Map<InterventionCategory, int> byCategory,
      final DateTime? lastUpdated}) = _$InterventionSummaryImpl;

  factory _InterventionSummary.fromJson(Map<String, dynamic> json) =
      _$InterventionSummaryImpl.fromJson;

  @override
  String get childId;
  @override
  int get totalInterventions;
  @override
  int get activeCount;
  @override
  int get completedCount;
  @override
  int get successfulCount;
  @override
  Map<InterventionCategory, int> get byCategory;
  @override
  DateTime? get lastUpdated;

  /// Create a copy of InterventionSummary
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$InterventionSummaryImplCopyWith<_$InterventionSummaryImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

InterventionEvidence _$InterventionEvidenceFromJson(Map<String, dynamic> json) {
  return _InterventionEvidence.fromJson(json);
}

/// @nodoc
mixin _$InterventionEvidence {
  String get id => throw _privateConstructorUsedError;
  String get interventionId => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  EvidenceType get type => throw _privateConstructorUsedError;
  String? get url => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  DateTime? get uploadedAt => throw _privateConstructorUsedError;

  /// Serializes this InterventionEvidence to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of InterventionEvidence
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $InterventionEvidenceCopyWith<InterventionEvidence> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $InterventionEvidenceCopyWith<$Res> {
  factory $InterventionEvidenceCopyWith(InterventionEvidence value,
          $Res Function(InterventionEvidence) then) =
      _$InterventionEvidenceCopyWithImpl<$Res, InterventionEvidence>;
  @useResult
  $Res call(
      {String id,
      String interventionId,
      String title,
      EvidenceType type,
      String? url,
      String? description,
      DateTime? uploadedAt});
}

/// @nodoc
class _$InterventionEvidenceCopyWithImpl<$Res,
        $Val extends InterventionEvidence>
    implements $InterventionEvidenceCopyWith<$Res> {
  _$InterventionEvidenceCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of InterventionEvidence
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? interventionId = null,
    Object? title = null,
    Object? type = null,
    Object? url = freezed,
    Object? description = freezed,
    Object? uploadedAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      interventionId: null == interventionId
          ? _value.interventionId
          : interventionId // ignore: cast_nullable_to_non_nullable
              as String,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as EvidenceType,
      url: freezed == url
          ? _value.url
          : url // ignore: cast_nullable_to_non_nullable
              as String?,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      uploadedAt: freezed == uploadedAt
          ? _value.uploadedAt
          : uploadedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$InterventionEvidenceImplCopyWith<$Res>
    implements $InterventionEvidenceCopyWith<$Res> {
  factory _$$InterventionEvidenceImplCopyWith(_$InterventionEvidenceImpl value,
          $Res Function(_$InterventionEvidenceImpl) then) =
      __$$InterventionEvidenceImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String interventionId,
      String title,
      EvidenceType type,
      String? url,
      String? description,
      DateTime? uploadedAt});
}

/// @nodoc
class __$$InterventionEvidenceImplCopyWithImpl<$Res>
    extends _$InterventionEvidenceCopyWithImpl<$Res, _$InterventionEvidenceImpl>
    implements _$$InterventionEvidenceImplCopyWith<$Res> {
  __$$InterventionEvidenceImplCopyWithImpl(_$InterventionEvidenceImpl _value,
      $Res Function(_$InterventionEvidenceImpl) _then)
      : super(_value, _then);

  /// Create a copy of InterventionEvidence
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? interventionId = null,
    Object? title = null,
    Object? type = null,
    Object? url = freezed,
    Object? description = freezed,
    Object? uploadedAt = freezed,
  }) {
    return _then(_$InterventionEvidenceImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      interventionId: null == interventionId
          ? _value.interventionId
          : interventionId // ignore: cast_nullable_to_non_nullable
              as String,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as EvidenceType,
      url: freezed == url
          ? _value.url
          : url // ignore: cast_nullable_to_non_nullable
              as String?,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      uploadedAt: freezed == uploadedAt
          ? _value.uploadedAt
          : uploadedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$InterventionEvidenceImpl implements _InterventionEvidence {
  const _$InterventionEvidenceImpl(
      {required this.id,
      required this.interventionId,
      required this.title,
      required this.type,
      this.url,
      this.description,
      this.uploadedAt});

  factory _$InterventionEvidenceImpl.fromJson(Map<String, dynamic> json) =>
      _$$InterventionEvidenceImplFromJson(json);

  @override
  final String id;
  @override
  final String interventionId;
  @override
  final String title;
  @override
  final EvidenceType type;
  @override
  final String? url;
  @override
  final String? description;
  @override
  final DateTime? uploadedAt;

  @override
  String toString() {
    return 'InterventionEvidence(id: $id, interventionId: $interventionId, title: $title, type: $type, url: $url, description: $description, uploadedAt: $uploadedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$InterventionEvidenceImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.interventionId, interventionId) ||
                other.interventionId == interventionId) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.url, url) || other.url == url) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.uploadedAt, uploadedAt) ||
                other.uploadedAt == uploadedAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, interventionId, title, type,
      url, description, uploadedAt);

  /// Create a copy of InterventionEvidence
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$InterventionEvidenceImplCopyWith<_$InterventionEvidenceImpl>
      get copyWith =>
          __$$InterventionEvidenceImplCopyWithImpl<_$InterventionEvidenceImpl>(
              this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$InterventionEvidenceImplToJson(
      this,
    );
  }
}

abstract class _InterventionEvidence implements InterventionEvidence {
  const factory _InterventionEvidence(
      {required final String id,
      required final String interventionId,
      required final String title,
      required final EvidenceType type,
      final String? url,
      final String? description,
      final DateTime? uploadedAt}) = _$InterventionEvidenceImpl;

  factory _InterventionEvidence.fromJson(Map<String, dynamic> json) =
      _$InterventionEvidenceImpl.fromJson;

  @override
  String get id;
  @override
  String get interventionId;
  @override
  String get title;
  @override
  EvidenceType get type;
  @override
  String? get url;
  @override
  String? get description;
  @override
  DateTime? get uploadedAt;

  /// Create a copy of InterventionEvidence
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$InterventionEvidenceImplCopyWith<_$InterventionEvidenceImpl>
      get copyWith => throw _privateConstructorUsedError;
}
