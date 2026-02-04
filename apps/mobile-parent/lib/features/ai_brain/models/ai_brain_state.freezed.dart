// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'ai_brain_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

AIBrainState _$AIBrainStateFromJson(Map<String, dynamic> json) {
  return _AIBrainState.fromJson(json);
}

/// @nodoc
mixin _$AIBrainState {
  String get childId => throw _privateConstructorUsedError;
  String get childName => throw _privateConstructorUsedError;
  AIFocus get currentFocus => throw _privateConstructorUsedError;
  List<LearningAdaptation> get recentAdaptations =>
      throw _privateConstructorUsedError;
  LearningPath get learningPath => throw _privateConstructorUsedError;
  double get confidenceLevel => throw _privateConstructorUsedError;
  DateTime? get lastUpdated => throw _privateConstructorUsedError;
  List<String> get activeStrategies => throw _privateConstructorUsedError;
  AIPersonality? get personality => throw _privateConstructorUsedError;

  /// Serializes this AIBrainState to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AIBrainState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AIBrainStateCopyWith<AIBrainState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AIBrainStateCopyWith<$Res> {
  factory $AIBrainStateCopyWith(
          AIBrainState value, $Res Function(AIBrainState) then) =
      _$AIBrainStateCopyWithImpl<$Res, AIBrainState>;
  @useResult
  $Res call(
      {String childId,
      String childName,
      AIFocus currentFocus,
      List<LearningAdaptation> recentAdaptations,
      LearningPath learningPath,
      double confidenceLevel,
      DateTime? lastUpdated,
      List<String> activeStrategies,
      AIPersonality? personality});

  $AIFocusCopyWith<$Res> get currentFocus;
  $LearningPathCopyWith<$Res> get learningPath;
  $AIPersonalityCopyWith<$Res>? get personality;
}

/// @nodoc
class _$AIBrainStateCopyWithImpl<$Res, $Val extends AIBrainState>
    implements $AIBrainStateCopyWith<$Res> {
  _$AIBrainStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AIBrainState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? childName = null,
    Object? currentFocus = null,
    Object? recentAdaptations = null,
    Object? learningPath = null,
    Object? confidenceLevel = null,
    Object? lastUpdated = freezed,
    Object? activeStrategies = null,
    Object? personality = freezed,
  }) {
    return _then(_value.copyWith(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      childName: null == childName
          ? _value.childName
          : childName // ignore: cast_nullable_to_non_nullable
              as String,
      currentFocus: null == currentFocus
          ? _value.currentFocus
          : currentFocus // ignore: cast_nullable_to_non_nullable
              as AIFocus,
      recentAdaptations: null == recentAdaptations
          ? _value.recentAdaptations
          : recentAdaptations // ignore: cast_nullable_to_non_nullable
              as List<LearningAdaptation>,
      learningPath: null == learningPath
          ? _value.learningPath
          : learningPath // ignore: cast_nullable_to_non_nullable
              as LearningPath,
      confidenceLevel: null == confidenceLevel
          ? _value.confidenceLevel
          : confidenceLevel // ignore: cast_nullable_to_non_nullable
              as double,
      lastUpdated: freezed == lastUpdated
          ? _value.lastUpdated
          : lastUpdated // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      activeStrategies: null == activeStrategies
          ? _value.activeStrategies
          : activeStrategies // ignore: cast_nullable_to_non_nullable
              as List<String>,
      personality: freezed == personality
          ? _value.personality
          : personality // ignore: cast_nullable_to_non_nullable
              as AIPersonality?,
    ) as $Val);
  }

  /// Create a copy of AIBrainState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $AIFocusCopyWith<$Res> get currentFocus {
    return $AIFocusCopyWith<$Res>(_value.currentFocus, (value) {
      return _then(_value.copyWith(currentFocus: value) as $Val);
    });
  }

  /// Create a copy of AIBrainState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $LearningPathCopyWith<$Res> get learningPath {
    return $LearningPathCopyWith<$Res>(_value.learningPath, (value) {
      return _then(_value.copyWith(learningPath: value) as $Val);
    });
  }

  /// Create a copy of AIBrainState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $AIPersonalityCopyWith<$Res>? get personality {
    if (_value.personality == null) {
      return null;
    }

    return $AIPersonalityCopyWith<$Res>(_value.personality!, (value) {
      return _then(_value.copyWith(personality: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$AIBrainStateImplCopyWith<$Res>
    implements $AIBrainStateCopyWith<$Res> {
  factory _$$AIBrainStateImplCopyWith(
          _$AIBrainStateImpl value, $Res Function(_$AIBrainStateImpl) then) =
      __$$AIBrainStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String childId,
      String childName,
      AIFocus currentFocus,
      List<LearningAdaptation> recentAdaptations,
      LearningPath learningPath,
      double confidenceLevel,
      DateTime? lastUpdated,
      List<String> activeStrategies,
      AIPersonality? personality});

  @override
  $AIFocusCopyWith<$Res> get currentFocus;
  @override
  $LearningPathCopyWith<$Res> get learningPath;
  @override
  $AIPersonalityCopyWith<$Res>? get personality;
}

/// @nodoc
class __$$AIBrainStateImplCopyWithImpl<$Res>
    extends _$AIBrainStateCopyWithImpl<$Res, _$AIBrainStateImpl>
    implements _$$AIBrainStateImplCopyWith<$Res> {
  __$$AIBrainStateImplCopyWithImpl(
      _$AIBrainStateImpl _value, $Res Function(_$AIBrainStateImpl) _then)
      : super(_value, _then);

  /// Create a copy of AIBrainState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? childName = null,
    Object? currentFocus = null,
    Object? recentAdaptations = null,
    Object? learningPath = null,
    Object? confidenceLevel = null,
    Object? lastUpdated = freezed,
    Object? activeStrategies = null,
    Object? personality = freezed,
  }) {
    return _then(_$AIBrainStateImpl(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      childName: null == childName
          ? _value.childName
          : childName // ignore: cast_nullable_to_non_nullable
              as String,
      currentFocus: null == currentFocus
          ? _value.currentFocus
          : currentFocus // ignore: cast_nullable_to_non_nullable
              as AIFocus,
      recentAdaptations: null == recentAdaptations
          ? _value._recentAdaptations
          : recentAdaptations // ignore: cast_nullable_to_non_nullable
              as List<LearningAdaptation>,
      learningPath: null == learningPath
          ? _value.learningPath
          : learningPath // ignore: cast_nullable_to_non_nullable
              as LearningPath,
      confidenceLevel: null == confidenceLevel
          ? _value.confidenceLevel
          : confidenceLevel // ignore: cast_nullable_to_non_nullable
              as double,
      lastUpdated: freezed == lastUpdated
          ? _value.lastUpdated
          : lastUpdated // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      activeStrategies: null == activeStrategies
          ? _value._activeStrategies
          : activeStrategies // ignore: cast_nullable_to_non_nullable
              as List<String>,
      personality: freezed == personality
          ? _value.personality
          : personality // ignore: cast_nullable_to_non_nullable
              as AIPersonality?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AIBrainStateImpl implements _AIBrainState {
  const _$AIBrainStateImpl(
      {required this.childId,
      required this.childName,
      required this.currentFocus,
      required final List<LearningAdaptation> recentAdaptations,
      required this.learningPath,
      required this.confidenceLevel,
      this.lastUpdated,
      final List<String> activeStrategies = const [],
      this.personality})
      : _recentAdaptations = recentAdaptations,
        _activeStrategies = activeStrategies;

  factory _$AIBrainStateImpl.fromJson(Map<String, dynamic> json) =>
      _$$AIBrainStateImplFromJson(json);

  @override
  final String childId;
  @override
  final String childName;
  @override
  final AIFocus currentFocus;
  final List<LearningAdaptation> _recentAdaptations;
  @override
  List<LearningAdaptation> get recentAdaptations {
    if (_recentAdaptations is EqualUnmodifiableListView)
      return _recentAdaptations;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_recentAdaptations);
  }

  @override
  final LearningPath learningPath;
  @override
  final double confidenceLevel;
  @override
  final DateTime? lastUpdated;
  final List<String> _activeStrategies;
  @override
  @JsonKey()
  List<String> get activeStrategies {
    if (_activeStrategies is EqualUnmodifiableListView)
      return _activeStrategies;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_activeStrategies);
  }

  @override
  final AIPersonality? personality;

  @override
  String toString() {
    return 'AIBrainState(childId: $childId, childName: $childName, currentFocus: $currentFocus, recentAdaptations: $recentAdaptations, learningPath: $learningPath, confidenceLevel: $confidenceLevel, lastUpdated: $lastUpdated, activeStrategies: $activeStrategies, personality: $personality)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AIBrainStateImpl &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.childName, childName) ||
                other.childName == childName) &&
            (identical(other.currentFocus, currentFocus) ||
                other.currentFocus == currentFocus) &&
            const DeepCollectionEquality()
                .equals(other._recentAdaptations, _recentAdaptations) &&
            (identical(other.learningPath, learningPath) ||
                other.learningPath == learningPath) &&
            (identical(other.confidenceLevel, confidenceLevel) ||
                other.confidenceLevel == confidenceLevel) &&
            (identical(other.lastUpdated, lastUpdated) ||
                other.lastUpdated == lastUpdated) &&
            const DeepCollectionEquality()
                .equals(other._activeStrategies, _activeStrategies) &&
            (identical(other.personality, personality) ||
                other.personality == personality));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      childId,
      childName,
      currentFocus,
      const DeepCollectionEquality().hash(_recentAdaptations),
      learningPath,
      confidenceLevel,
      lastUpdated,
      const DeepCollectionEquality().hash(_activeStrategies),
      personality);

  /// Create a copy of AIBrainState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AIBrainStateImplCopyWith<_$AIBrainStateImpl> get copyWith =>
      __$$AIBrainStateImplCopyWithImpl<_$AIBrainStateImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AIBrainStateImplToJson(
      this,
    );
  }
}

abstract class _AIBrainState implements AIBrainState {
  const factory _AIBrainState(
      {required final String childId,
      required final String childName,
      required final AIFocus currentFocus,
      required final List<LearningAdaptation> recentAdaptations,
      required final LearningPath learningPath,
      required final double confidenceLevel,
      final DateTime? lastUpdated,
      final List<String> activeStrategies,
      final AIPersonality? personality}) = _$AIBrainStateImpl;

  factory _AIBrainState.fromJson(Map<String, dynamic> json) =
      _$AIBrainStateImpl.fromJson;

  @override
  String get childId;
  @override
  String get childName;
  @override
  AIFocus get currentFocus;
  @override
  List<LearningAdaptation> get recentAdaptations;
  @override
  LearningPath get learningPath;
  @override
  double get confidenceLevel;
  @override
  DateTime? get lastUpdated;
  @override
  List<String> get activeStrategies;
  @override
  AIPersonality? get personality;

  /// Create a copy of AIBrainState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AIBrainStateImplCopyWith<_$AIBrainStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AIFocus _$AIFocusFromJson(Map<String, dynamic> json) {
  return _AIFocus.fromJson(json);
}

/// @nodoc
mixin _$AIFocus {
  String get subject => throw _privateConstructorUsedError;
  String get topic => throw _privateConstructorUsedError;
  String get skill => throw _privateConstructorUsedError;
  FocusReason get reason => throw _privateConstructorUsedError;
  DateTime? get startedAt => throw _privateConstructorUsedError;
  double? get progress => throw _privateConstructorUsedError;

  /// Serializes this AIFocus to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AIFocus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AIFocusCopyWith<AIFocus> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AIFocusCopyWith<$Res> {
  factory $AIFocusCopyWith(AIFocus value, $Res Function(AIFocus) then) =
      _$AIFocusCopyWithImpl<$Res, AIFocus>;
  @useResult
  $Res call(
      {String subject,
      String topic,
      String skill,
      FocusReason reason,
      DateTime? startedAt,
      double? progress});
}

/// @nodoc
class _$AIFocusCopyWithImpl<$Res, $Val extends AIFocus>
    implements $AIFocusCopyWith<$Res> {
  _$AIFocusCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AIFocus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? subject = null,
    Object? topic = null,
    Object? skill = null,
    Object? reason = null,
    Object? startedAt = freezed,
    Object? progress = freezed,
  }) {
    return _then(_value.copyWith(
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      topic: null == topic
          ? _value.topic
          : topic // ignore: cast_nullable_to_non_nullable
              as String,
      skill: null == skill
          ? _value.skill
          : skill // ignore: cast_nullable_to_non_nullable
              as String,
      reason: null == reason
          ? _value.reason
          : reason // ignore: cast_nullable_to_non_nullable
              as FocusReason,
      startedAt: freezed == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      progress: freezed == progress
          ? _value.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as double?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AIFocusImplCopyWith<$Res> implements $AIFocusCopyWith<$Res> {
  factory _$$AIFocusImplCopyWith(
          _$AIFocusImpl value, $Res Function(_$AIFocusImpl) then) =
      __$$AIFocusImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String subject,
      String topic,
      String skill,
      FocusReason reason,
      DateTime? startedAt,
      double? progress});
}

/// @nodoc
class __$$AIFocusImplCopyWithImpl<$Res>
    extends _$AIFocusCopyWithImpl<$Res, _$AIFocusImpl>
    implements _$$AIFocusImplCopyWith<$Res> {
  __$$AIFocusImplCopyWithImpl(
      _$AIFocusImpl _value, $Res Function(_$AIFocusImpl) _then)
      : super(_value, _then);

  /// Create a copy of AIFocus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? subject = null,
    Object? topic = null,
    Object? skill = null,
    Object? reason = null,
    Object? startedAt = freezed,
    Object? progress = freezed,
  }) {
    return _then(_$AIFocusImpl(
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      topic: null == topic
          ? _value.topic
          : topic // ignore: cast_nullable_to_non_nullable
              as String,
      skill: null == skill
          ? _value.skill
          : skill // ignore: cast_nullable_to_non_nullable
              as String,
      reason: null == reason
          ? _value.reason
          : reason // ignore: cast_nullable_to_non_nullable
              as FocusReason,
      startedAt: freezed == startedAt
          ? _value.startedAt
          : startedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      progress: freezed == progress
          ? _value.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as double?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AIFocusImpl implements _AIFocus {
  const _$AIFocusImpl(
      {required this.subject,
      required this.topic,
      required this.skill,
      required this.reason,
      this.startedAt,
      this.progress});

  factory _$AIFocusImpl.fromJson(Map<String, dynamic> json) =>
      _$$AIFocusImplFromJson(json);

  @override
  final String subject;
  @override
  final String topic;
  @override
  final String skill;
  @override
  final FocusReason reason;
  @override
  final DateTime? startedAt;
  @override
  final double? progress;

  @override
  String toString() {
    return 'AIFocus(subject: $subject, topic: $topic, skill: $skill, reason: $reason, startedAt: $startedAt, progress: $progress)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AIFocusImpl &&
            (identical(other.subject, subject) || other.subject == subject) &&
            (identical(other.topic, topic) || other.topic == topic) &&
            (identical(other.skill, skill) || other.skill == skill) &&
            (identical(other.reason, reason) || other.reason == reason) &&
            (identical(other.startedAt, startedAt) ||
                other.startedAt == startedAt) &&
            (identical(other.progress, progress) ||
                other.progress == progress));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, subject, topic, skill, reason, startedAt, progress);

  /// Create a copy of AIFocus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AIFocusImplCopyWith<_$AIFocusImpl> get copyWith =>
      __$$AIFocusImplCopyWithImpl<_$AIFocusImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AIFocusImplToJson(
      this,
    );
  }
}

abstract class _AIFocus implements AIFocus {
  const factory _AIFocus(
      {required final String subject,
      required final String topic,
      required final String skill,
      required final FocusReason reason,
      final DateTime? startedAt,
      final double? progress}) = _$AIFocusImpl;

  factory _AIFocus.fromJson(Map<String, dynamic> json) = _$AIFocusImpl.fromJson;

  @override
  String get subject;
  @override
  String get topic;
  @override
  String get skill;
  @override
  FocusReason get reason;
  @override
  DateTime? get startedAt;
  @override
  double? get progress;

  /// Create a copy of AIFocus
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AIFocusImplCopyWith<_$AIFocusImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

LearningAdaptation _$LearningAdaptationFromJson(Map<String, dynamic> json) {
  return _LearningAdaptation.fromJson(json);
}

/// @nodoc
mixin _$LearningAdaptation {
  String get id => throw _privateConstructorUsedError;
  AdaptationType get adaptationType => throw _privateConstructorUsedError;
  String get reason => throw _privateConstructorUsedError;
  DateTime get timestamp => throw _privateConstructorUsedError;
  String? get impact => throw _privateConstructorUsedError;
  String? get previousValue => throw _privateConstructorUsedError;
  String? get newValue => throw _privateConstructorUsedError;
  bool get wasSuccessful => throw _privateConstructorUsedError;

  /// Serializes this LearningAdaptation to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of LearningAdaptation
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $LearningAdaptationCopyWith<LearningAdaptation> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LearningAdaptationCopyWith<$Res> {
  factory $LearningAdaptationCopyWith(
          LearningAdaptation value, $Res Function(LearningAdaptation) then) =
      _$LearningAdaptationCopyWithImpl<$Res, LearningAdaptation>;
  @useResult
  $Res call(
      {String id,
      AdaptationType adaptationType,
      String reason,
      DateTime timestamp,
      String? impact,
      String? previousValue,
      String? newValue,
      bool wasSuccessful});
}

/// @nodoc
class _$LearningAdaptationCopyWithImpl<$Res, $Val extends LearningAdaptation>
    implements $LearningAdaptationCopyWith<$Res> {
  _$LearningAdaptationCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of LearningAdaptation
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? adaptationType = null,
    Object? reason = null,
    Object? timestamp = null,
    Object? impact = freezed,
    Object? previousValue = freezed,
    Object? newValue = freezed,
    Object? wasSuccessful = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      adaptationType: null == adaptationType
          ? _value.adaptationType
          : adaptationType // ignore: cast_nullable_to_non_nullable
              as AdaptationType,
      reason: null == reason
          ? _value.reason
          : reason // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
      impact: freezed == impact
          ? _value.impact
          : impact // ignore: cast_nullable_to_non_nullable
              as String?,
      previousValue: freezed == previousValue
          ? _value.previousValue
          : previousValue // ignore: cast_nullable_to_non_nullable
              as String?,
      newValue: freezed == newValue
          ? _value.newValue
          : newValue // ignore: cast_nullable_to_non_nullable
              as String?,
      wasSuccessful: null == wasSuccessful
          ? _value.wasSuccessful
          : wasSuccessful // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$LearningAdaptationImplCopyWith<$Res>
    implements $LearningAdaptationCopyWith<$Res> {
  factory _$$LearningAdaptationImplCopyWith(_$LearningAdaptationImpl value,
          $Res Function(_$LearningAdaptationImpl) then) =
      __$$LearningAdaptationImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      AdaptationType adaptationType,
      String reason,
      DateTime timestamp,
      String? impact,
      String? previousValue,
      String? newValue,
      bool wasSuccessful});
}

/// @nodoc
class __$$LearningAdaptationImplCopyWithImpl<$Res>
    extends _$LearningAdaptationCopyWithImpl<$Res, _$LearningAdaptationImpl>
    implements _$$LearningAdaptationImplCopyWith<$Res> {
  __$$LearningAdaptationImplCopyWithImpl(_$LearningAdaptationImpl _value,
      $Res Function(_$LearningAdaptationImpl) _then)
      : super(_value, _then);

  /// Create a copy of LearningAdaptation
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? adaptationType = null,
    Object? reason = null,
    Object? timestamp = null,
    Object? impact = freezed,
    Object? previousValue = freezed,
    Object? newValue = freezed,
    Object? wasSuccessful = null,
  }) {
    return _then(_$LearningAdaptationImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      adaptationType: null == adaptationType
          ? _value.adaptationType
          : adaptationType // ignore: cast_nullable_to_non_nullable
              as AdaptationType,
      reason: null == reason
          ? _value.reason
          : reason // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
      impact: freezed == impact
          ? _value.impact
          : impact // ignore: cast_nullable_to_non_nullable
              as String?,
      previousValue: freezed == previousValue
          ? _value.previousValue
          : previousValue // ignore: cast_nullable_to_non_nullable
              as String?,
      newValue: freezed == newValue
          ? _value.newValue
          : newValue // ignore: cast_nullable_to_non_nullable
              as String?,
      wasSuccessful: null == wasSuccessful
          ? _value.wasSuccessful
          : wasSuccessful // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$LearningAdaptationImpl implements _LearningAdaptation {
  const _$LearningAdaptationImpl(
      {required this.id,
      required this.adaptationType,
      required this.reason,
      required this.timestamp,
      this.impact,
      this.previousValue,
      this.newValue,
      this.wasSuccessful = false});

  factory _$LearningAdaptationImpl.fromJson(Map<String, dynamic> json) =>
      _$$LearningAdaptationImplFromJson(json);

  @override
  final String id;
  @override
  final AdaptationType adaptationType;
  @override
  final String reason;
  @override
  final DateTime timestamp;
  @override
  final String? impact;
  @override
  final String? previousValue;
  @override
  final String? newValue;
  @override
  @JsonKey()
  final bool wasSuccessful;

  @override
  String toString() {
    return 'LearningAdaptation(id: $id, adaptationType: $adaptationType, reason: $reason, timestamp: $timestamp, impact: $impact, previousValue: $previousValue, newValue: $newValue, wasSuccessful: $wasSuccessful)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LearningAdaptationImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.adaptationType, adaptationType) ||
                other.adaptationType == adaptationType) &&
            (identical(other.reason, reason) || other.reason == reason) &&
            (identical(other.timestamp, timestamp) ||
                other.timestamp == timestamp) &&
            (identical(other.impact, impact) || other.impact == impact) &&
            (identical(other.previousValue, previousValue) ||
                other.previousValue == previousValue) &&
            (identical(other.newValue, newValue) ||
                other.newValue == newValue) &&
            (identical(other.wasSuccessful, wasSuccessful) ||
                other.wasSuccessful == wasSuccessful));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, adaptationType, reason,
      timestamp, impact, previousValue, newValue, wasSuccessful);

  /// Create a copy of LearningAdaptation
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LearningAdaptationImplCopyWith<_$LearningAdaptationImpl> get copyWith =>
      __$$LearningAdaptationImplCopyWithImpl<_$LearningAdaptationImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$LearningAdaptationImplToJson(
      this,
    );
  }
}

abstract class _LearningAdaptation implements LearningAdaptation {
  const factory _LearningAdaptation(
      {required final String id,
      required final AdaptationType adaptationType,
      required final String reason,
      required final DateTime timestamp,
      final String? impact,
      final String? previousValue,
      final String? newValue,
      final bool wasSuccessful}) = _$LearningAdaptationImpl;

  factory _LearningAdaptation.fromJson(Map<String, dynamic> json) =
      _$LearningAdaptationImpl.fromJson;

  @override
  String get id;
  @override
  AdaptationType get adaptationType;
  @override
  String get reason;
  @override
  DateTime get timestamp;
  @override
  String? get impact;
  @override
  String? get previousValue;
  @override
  String? get newValue;
  @override
  bool get wasSuccessful;

  /// Create a copy of LearningAdaptation
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LearningAdaptationImplCopyWith<_$LearningAdaptationImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AIDecision _$AIDecisionFromJson(Map<String, dynamic> json) {
  return _AIDecision.fromJson(json);
}

/// @nodoc
mixin _$AIDecision {
  String get id => throw _privateConstructorUsedError;
  DecisionType get decisionType => throw _privateConstructorUsedError;
  String get context => throw _privateConstructorUsedError;
  String get rationale => throw _privateConstructorUsedError;
  DateTime get timestamp => throw _privateConstructorUsedError;
  DecisionOutcome? get outcome => throw _privateConstructorUsedError;
  double? get confidenceScore => throw _privateConstructorUsedError;
  List<String> get alternatives => throw _privateConstructorUsedError;

  /// Serializes this AIDecision to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AIDecision
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AIDecisionCopyWith<AIDecision> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AIDecisionCopyWith<$Res> {
  factory $AIDecisionCopyWith(
          AIDecision value, $Res Function(AIDecision) then) =
      _$AIDecisionCopyWithImpl<$Res, AIDecision>;
  @useResult
  $Res call(
      {String id,
      DecisionType decisionType,
      String context,
      String rationale,
      DateTime timestamp,
      DecisionOutcome? outcome,
      double? confidenceScore,
      List<String> alternatives});

  $DecisionOutcomeCopyWith<$Res>? get outcome;
}

/// @nodoc
class _$AIDecisionCopyWithImpl<$Res, $Val extends AIDecision>
    implements $AIDecisionCopyWith<$Res> {
  _$AIDecisionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AIDecision
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? decisionType = null,
    Object? context = null,
    Object? rationale = null,
    Object? timestamp = null,
    Object? outcome = freezed,
    Object? confidenceScore = freezed,
    Object? alternatives = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      decisionType: null == decisionType
          ? _value.decisionType
          : decisionType // ignore: cast_nullable_to_non_nullable
              as DecisionType,
      context: null == context
          ? _value.context
          : context // ignore: cast_nullable_to_non_nullable
              as String,
      rationale: null == rationale
          ? _value.rationale
          : rationale // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
      outcome: freezed == outcome
          ? _value.outcome
          : outcome // ignore: cast_nullable_to_non_nullable
              as DecisionOutcome?,
      confidenceScore: freezed == confidenceScore
          ? _value.confidenceScore
          : confidenceScore // ignore: cast_nullable_to_non_nullable
              as double?,
      alternatives: null == alternatives
          ? _value.alternatives
          : alternatives // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }

  /// Create a copy of AIDecision
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $DecisionOutcomeCopyWith<$Res>? get outcome {
    if (_value.outcome == null) {
      return null;
    }

    return $DecisionOutcomeCopyWith<$Res>(_value.outcome!, (value) {
      return _then(_value.copyWith(outcome: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$AIDecisionImplCopyWith<$Res>
    implements $AIDecisionCopyWith<$Res> {
  factory _$$AIDecisionImplCopyWith(
          _$AIDecisionImpl value, $Res Function(_$AIDecisionImpl) then) =
      __$$AIDecisionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      DecisionType decisionType,
      String context,
      String rationale,
      DateTime timestamp,
      DecisionOutcome? outcome,
      double? confidenceScore,
      List<String> alternatives});

  @override
  $DecisionOutcomeCopyWith<$Res>? get outcome;
}

/// @nodoc
class __$$AIDecisionImplCopyWithImpl<$Res>
    extends _$AIDecisionCopyWithImpl<$Res, _$AIDecisionImpl>
    implements _$$AIDecisionImplCopyWith<$Res> {
  __$$AIDecisionImplCopyWithImpl(
      _$AIDecisionImpl _value, $Res Function(_$AIDecisionImpl) _then)
      : super(_value, _then);

  /// Create a copy of AIDecision
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? decisionType = null,
    Object? context = null,
    Object? rationale = null,
    Object? timestamp = null,
    Object? outcome = freezed,
    Object? confidenceScore = freezed,
    Object? alternatives = null,
  }) {
    return _then(_$AIDecisionImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      decisionType: null == decisionType
          ? _value.decisionType
          : decisionType // ignore: cast_nullable_to_non_nullable
              as DecisionType,
      context: null == context
          ? _value.context
          : context // ignore: cast_nullable_to_non_nullable
              as String,
      rationale: null == rationale
          ? _value.rationale
          : rationale // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
      outcome: freezed == outcome
          ? _value.outcome
          : outcome // ignore: cast_nullable_to_non_nullable
              as DecisionOutcome?,
      confidenceScore: freezed == confidenceScore
          ? _value.confidenceScore
          : confidenceScore // ignore: cast_nullable_to_non_nullable
              as double?,
      alternatives: null == alternatives
          ? _value._alternatives
          : alternatives // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AIDecisionImpl implements _AIDecision {
  const _$AIDecisionImpl(
      {required this.id,
      required this.decisionType,
      required this.context,
      required this.rationale,
      required this.timestamp,
      this.outcome,
      this.confidenceScore,
      final List<String> alternatives = const []})
      : _alternatives = alternatives;

  factory _$AIDecisionImpl.fromJson(Map<String, dynamic> json) =>
      _$$AIDecisionImplFromJson(json);

  @override
  final String id;
  @override
  final DecisionType decisionType;
  @override
  final String context;
  @override
  final String rationale;
  @override
  final DateTime timestamp;
  @override
  final DecisionOutcome? outcome;
  @override
  final double? confidenceScore;
  final List<String> _alternatives;
  @override
  @JsonKey()
  List<String> get alternatives {
    if (_alternatives is EqualUnmodifiableListView) return _alternatives;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_alternatives);
  }

  @override
  String toString() {
    return 'AIDecision(id: $id, decisionType: $decisionType, context: $context, rationale: $rationale, timestamp: $timestamp, outcome: $outcome, confidenceScore: $confidenceScore, alternatives: $alternatives)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AIDecisionImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.decisionType, decisionType) ||
                other.decisionType == decisionType) &&
            (identical(other.context, context) || other.context == context) &&
            (identical(other.rationale, rationale) ||
                other.rationale == rationale) &&
            (identical(other.timestamp, timestamp) ||
                other.timestamp == timestamp) &&
            (identical(other.outcome, outcome) || other.outcome == outcome) &&
            (identical(other.confidenceScore, confidenceScore) ||
                other.confidenceScore == confidenceScore) &&
            const DeepCollectionEquality()
                .equals(other._alternatives, _alternatives));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      decisionType,
      context,
      rationale,
      timestamp,
      outcome,
      confidenceScore,
      const DeepCollectionEquality().hash(_alternatives));

  /// Create a copy of AIDecision
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AIDecisionImplCopyWith<_$AIDecisionImpl> get copyWith =>
      __$$AIDecisionImplCopyWithImpl<_$AIDecisionImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AIDecisionImplToJson(
      this,
    );
  }
}

abstract class _AIDecision implements AIDecision {
  const factory _AIDecision(
      {required final String id,
      required final DecisionType decisionType,
      required final String context,
      required final String rationale,
      required final DateTime timestamp,
      final DecisionOutcome? outcome,
      final double? confidenceScore,
      final List<String> alternatives}) = _$AIDecisionImpl;

  factory _AIDecision.fromJson(Map<String, dynamic> json) =
      _$AIDecisionImpl.fromJson;

  @override
  String get id;
  @override
  DecisionType get decisionType;
  @override
  String get context;
  @override
  String get rationale;
  @override
  DateTime get timestamp;
  @override
  DecisionOutcome? get outcome;
  @override
  double? get confidenceScore;
  @override
  List<String> get alternatives;

  /// Create a copy of AIDecision
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AIDecisionImplCopyWith<_$AIDecisionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

DecisionOutcome _$DecisionOutcomeFromJson(Map<String, dynamic> json) {
  return _DecisionOutcome.fromJson(json);
}

/// @nodoc
mixin _$DecisionOutcome {
  bool get successful => throw _privateConstructorUsedError;
  String? get feedback => throw _privateConstructorUsedError;
  double? get engagementChange => throw _privateConstructorUsedError;
  double? get performanceChange => throw _privateConstructorUsedError;

  /// Serializes this DecisionOutcome to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of DecisionOutcome
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DecisionOutcomeCopyWith<DecisionOutcome> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DecisionOutcomeCopyWith<$Res> {
  factory $DecisionOutcomeCopyWith(
          DecisionOutcome value, $Res Function(DecisionOutcome) then) =
      _$DecisionOutcomeCopyWithImpl<$Res, DecisionOutcome>;
  @useResult
  $Res call(
      {bool successful,
      String? feedback,
      double? engagementChange,
      double? performanceChange});
}

/// @nodoc
class _$DecisionOutcomeCopyWithImpl<$Res, $Val extends DecisionOutcome>
    implements $DecisionOutcomeCopyWith<$Res> {
  _$DecisionOutcomeCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DecisionOutcome
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? successful = null,
    Object? feedback = freezed,
    Object? engagementChange = freezed,
    Object? performanceChange = freezed,
  }) {
    return _then(_value.copyWith(
      successful: null == successful
          ? _value.successful
          : successful // ignore: cast_nullable_to_non_nullable
              as bool,
      feedback: freezed == feedback
          ? _value.feedback
          : feedback // ignore: cast_nullable_to_non_nullable
              as String?,
      engagementChange: freezed == engagementChange
          ? _value.engagementChange
          : engagementChange // ignore: cast_nullable_to_non_nullable
              as double?,
      performanceChange: freezed == performanceChange
          ? _value.performanceChange
          : performanceChange // ignore: cast_nullable_to_non_nullable
              as double?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$DecisionOutcomeImplCopyWith<$Res>
    implements $DecisionOutcomeCopyWith<$Res> {
  factory _$$DecisionOutcomeImplCopyWith(_$DecisionOutcomeImpl value,
          $Res Function(_$DecisionOutcomeImpl) then) =
      __$$DecisionOutcomeImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool successful,
      String? feedback,
      double? engagementChange,
      double? performanceChange});
}

/// @nodoc
class __$$DecisionOutcomeImplCopyWithImpl<$Res>
    extends _$DecisionOutcomeCopyWithImpl<$Res, _$DecisionOutcomeImpl>
    implements _$$DecisionOutcomeImplCopyWith<$Res> {
  __$$DecisionOutcomeImplCopyWithImpl(
      _$DecisionOutcomeImpl _value, $Res Function(_$DecisionOutcomeImpl) _then)
      : super(_value, _then);

  /// Create a copy of DecisionOutcome
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? successful = null,
    Object? feedback = freezed,
    Object? engagementChange = freezed,
    Object? performanceChange = freezed,
  }) {
    return _then(_$DecisionOutcomeImpl(
      successful: null == successful
          ? _value.successful
          : successful // ignore: cast_nullable_to_non_nullable
              as bool,
      feedback: freezed == feedback
          ? _value.feedback
          : feedback // ignore: cast_nullable_to_non_nullable
              as String?,
      engagementChange: freezed == engagementChange
          ? _value.engagementChange
          : engagementChange // ignore: cast_nullable_to_non_nullable
              as double?,
      performanceChange: freezed == performanceChange
          ? _value.performanceChange
          : performanceChange // ignore: cast_nullable_to_non_nullable
              as double?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$DecisionOutcomeImpl implements _DecisionOutcome {
  const _$DecisionOutcomeImpl(
      {required this.successful,
      this.feedback,
      this.engagementChange,
      this.performanceChange});

  factory _$DecisionOutcomeImpl.fromJson(Map<String, dynamic> json) =>
      _$$DecisionOutcomeImplFromJson(json);

  @override
  final bool successful;
  @override
  final String? feedback;
  @override
  final double? engagementChange;
  @override
  final double? performanceChange;

  @override
  String toString() {
    return 'DecisionOutcome(successful: $successful, feedback: $feedback, engagementChange: $engagementChange, performanceChange: $performanceChange)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DecisionOutcomeImpl &&
            (identical(other.successful, successful) ||
                other.successful == successful) &&
            (identical(other.feedback, feedback) ||
                other.feedback == feedback) &&
            (identical(other.engagementChange, engagementChange) ||
                other.engagementChange == engagementChange) &&
            (identical(other.performanceChange, performanceChange) ||
                other.performanceChange == performanceChange));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, successful, feedback, engagementChange, performanceChange);

  /// Create a copy of DecisionOutcome
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DecisionOutcomeImplCopyWith<_$DecisionOutcomeImpl> get copyWith =>
      __$$DecisionOutcomeImplCopyWithImpl<_$DecisionOutcomeImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$DecisionOutcomeImplToJson(
      this,
    );
  }
}

abstract class _DecisionOutcome implements DecisionOutcome {
  const factory _DecisionOutcome(
      {required final bool successful,
      final String? feedback,
      final double? engagementChange,
      final double? performanceChange}) = _$DecisionOutcomeImpl;

  factory _DecisionOutcome.fromJson(Map<String, dynamic> json) =
      _$DecisionOutcomeImpl.fromJson;

  @override
  bool get successful;
  @override
  String? get feedback;
  @override
  double? get engagementChange;
  @override
  double? get performanceChange;

  /// Create a copy of DecisionOutcome
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DecisionOutcomeImplCopyWith<_$DecisionOutcomeImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

LearningPath _$LearningPathFromJson(Map<String, dynamic> json) {
  return _LearningPath.fromJson(json);
}

/// @nodoc
mixin _$LearningPath {
  String get subject => throw _privateConstructorUsedError;
  List<LearningPathNode> get nodes => throw _privateConstructorUsedError;
  int get currentNodeIndex => throw _privateConstructorUsedError;
  double? get overallProgress => throw _privateConstructorUsedError;
  DateTime? get estimatedCompletion => throw _privateConstructorUsedError;

  /// Serializes this LearningPath to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of LearningPath
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $LearningPathCopyWith<LearningPath> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LearningPathCopyWith<$Res> {
  factory $LearningPathCopyWith(
          LearningPath value, $Res Function(LearningPath) then) =
      _$LearningPathCopyWithImpl<$Res, LearningPath>;
  @useResult
  $Res call(
      {String subject,
      List<LearningPathNode> nodes,
      int currentNodeIndex,
      double? overallProgress,
      DateTime? estimatedCompletion});
}

/// @nodoc
class _$LearningPathCopyWithImpl<$Res, $Val extends LearningPath>
    implements $LearningPathCopyWith<$Res> {
  _$LearningPathCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of LearningPath
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? subject = null,
    Object? nodes = null,
    Object? currentNodeIndex = null,
    Object? overallProgress = freezed,
    Object? estimatedCompletion = freezed,
  }) {
    return _then(_value.copyWith(
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      nodes: null == nodes
          ? _value.nodes
          : nodes // ignore: cast_nullable_to_non_nullable
              as List<LearningPathNode>,
      currentNodeIndex: null == currentNodeIndex
          ? _value.currentNodeIndex
          : currentNodeIndex // ignore: cast_nullable_to_non_nullable
              as int,
      overallProgress: freezed == overallProgress
          ? _value.overallProgress
          : overallProgress // ignore: cast_nullable_to_non_nullable
              as double?,
      estimatedCompletion: freezed == estimatedCompletion
          ? _value.estimatedCompletion
          : estimatedCompletion // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$LearningPathImplCopyWith<$Res>
    implements $LearningPathCopyWith<$Res> {
  factory _$$LearningPathImplCopyWith(
          _$LearningPathImpl value, $Res Function(_$LearningPathImpl) then) =
      __$$LearningPathImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String subject,
      List<LearningPathNode> nodes,
      int currentNodeIndex,
      double? overallProgress,
      DateTime? estimatedCompletion});
}

/// @nodoc
class __$$LearningPathImplCopyWithImpl<$Res>
    extends _$LearningPathCopyWithImpl<$Res, _$LearningPathImpl>
    implements _$$LearningPathImplCopyWith<$Res> {
  __$$LearningPathImplCopyWithImpl(
      _$LearningPathImpl _value, $Res Function(_$LearningPathImpl) _then)
      : super(_value, _then);

  /// Create a copy of LearningPath
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? subject = null,
    Object? nodes = null,
    Object? currentNodeIndex = null,
    Object? overallProgress = freezed,
    Object? estimatedCompletion = freezed,
  }) {
    return _then(_$LearningPathImpl(
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      nodes: null == nodes
          ? _value._nodes
          : nodes // ignore: cast_nullable_to_non_nullable
              as List<LearningPathNode>,
      currentNodeIndex: null == currentNodeIndex
          ? _value.currentNodeIndex
          : currentNodeIndex // ignore: cast_nullable_to_non_nullable
              as int,
      overallProgress: freezed == overallProgress
          ? _value.overallProgress
          : overallProgress // ignore: cast_nullable_to_non_nullable
              as double?,
      estimatedCompletion: freezed == estimatedCompletion
          ? _value.estimatedCompletion
          : estimatedCompletion // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$LearningPathImpl implements _LearningPath {
  const _$LearningPathImpl(
      {required this.subject,
      required final List<LearningPathNode> nodes,
      required this.currentNodeIndex,
      this.overallProgress,
      this.estimatedCompletion})
      : _nodes = nodes;

  factory _$LearningPathImpl.fromJson(Map<String, dynamic> json) =>
      _$$LearningPathImplFromJson(json);

  @override
  final String subject;
  final List<LearningPathNode> _nodes;
  @override
  List<LearningPathNode> get nodes {
    if (_nodes is EqualUnmodifiableListView) return _nodes;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_nodes);
  }

  @override
  final int currentNodeIndex;
  @override
  final double? overallProgress;
  @override
  final DateTime? estimatedCompletion;

  @override
  String toString() {
    return 'LearningPath(subject: $subject, nodes: $nodes, currentNodeIndex: $currentNodeIndex, overallProgress: $overallProgress, estimatedCompletion: $estimatedCompletion)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LearningPathImpl &&
            (identical(other.subject, subject) || other.subject == subject) &&
            const DeepCollectionEquality().equals(other._nodes, _nodes) &&
            (identical(other.currentNodeIndex, currentNodeIndex) ||
                other.currentNodeIndex == currentNodeIndex) &&
            (identical(other.overallProgress, overallProgress) ||
                other.overallProgress == overallProgress) &&
            (identical(other.estimatedCompletion, estimatedCompletion) ||
                other.estimatedCompletion == estimatedCompletion));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      subject,
      const DeepCollectionEquality().hash(_nodes),
      currentNodeIndex,
      overallProgress,
      estimatedCompletion);

  /// Create a copy of LearningPath
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LearningPathImplCopyWith<_$LearningPathImpl> get copyWith =>
      __$$LearningPathImplCopyWithImpl<_$LearningPathImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$LearningPathImplToJson(
      this,
    );
  }
}

abstract class _LearningPath implements LearningPath {
  const factory _LearningPath(
      {required final String subject,
      required final List<LearningPathNode> nodes,
      required final int currentNodeIndex,
      final double? overallProgress,
      final DateTime? estimatedCompletion}) = _$LearningPathImpl;

  factory _LearningPath.fromJson(Map<String, dynamic> json) =
      _$LearningPathImpl.fromJson;

  @override
  String get subject;
  @override
  List<LearningPathNode> get nodes;
  @override
  int get currentNodeIndex;
  @override
  double? get overallProgress;
  @override
  DateTime? get estimatedCompletion;

  /// Create a copy of LearningPath
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LearningPathImplCopyWith<_$LearningPathImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

LearningPathNode _$LearningPathNodeFromJson(Map<String, dynamic> json) {
  return _LearningPathNode.fromJson(json);
}

/// @nodoc
mixin _$LearningPathNode {
  String get id => throw _privateConstructorUsedError;
  String get topic => throw _privateConstructorUsedError;
  NodeStatus get status => throw _privateConstructorUsedError;
  List<String> get prerequisites => throw _privateConstructorUsedError;
  List<String> get nextSteps => throw _privateConstructorUsedError;
  double? get masteryLevel => throw _privateConstructorUsedError;
  int? get estimatedMinutes => throw _privateConstructorUsedError;
  List<String> get skills => throw _privateConstructorUsedError;

  /// Serializes this LearningPathNode to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of LearningPathNode
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $LearningPathNodeCopyWith<LearningPathNode> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LearningPathNodeCopyWith<$Res> {
  factory $LearningPathNodeCopyWith(
          LearningPathNode value, $Res Function(LearningPathNode) then) =
      _$LearningPathNodeCopyWithImpl<$Res, LearningPathNode>;
  @useResult
  $Res call(
      {String id,
      String topic,
      NodeStatus status,
      List<String> prerequisites,
      List<String> nextSteps,
      double? masteryLevel,
      int? estimatedMinutes,
      List<String> skills});
}

/// @nodoc
class _$LearningPathNodeCopyWithImpl<$Res, $Val extends LearningPathNode>
    implements $LearningPathNodeCopyWith<$Res> {
  _$LearningPathNodeCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of LearningPathNode
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? topic = null,
    Object? status = null,
    Object? prerequisites = null,
    Object? nextSteps = null,
    Object? masteryLevel = freezed,
    Object? estimatedMinutes = freezed,
    Object? skills = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      topic: null == topic
          ? _value.topic
          : topic // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as NodeStatus,
      prerequisites: null == prerequisites
          ? _value.prerequisites
          : prerequisites // ignore: cast_nullable_to_non_nullable
              as List<String>,
      nextSteps: null == nextSteps
          ? _value.nextSteps
          : nextSteps // ignore: cast_nullable_to_non_nullable
              as List<String>,
      masteryLevel: freezed == masteryLevel
          ? _value.masteryLevel
          : masteryLevel // ignore: cast_nullable_to_non_nullable
              as double?,
      estimatedMinutes: freezed == estimatedMinutes
          ? _value.estimatedMinutes
          : estimatedMinutes // ignore: cast_nullable_to_non_nullable
              as int?,
      skills: null == skills
          ? _value.skills
          : skills // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$LearningPathNodeImplCopyWith<$Res>
    implements $LearningPathNodeCopyWith<$Res> {
  factory _$$LearningPathNodeImplCopyWith(_$LearningPathNodeImpl value,
          $Res Function(_$LearningPathNodeImpl) then) =
      __$$LearningPathNodeImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String topic,
      NodeStatus status,
      List<String> prerequisites,
      List<String> nextSteps,
      double? masteryLevel,
      int? estimatedMinutes,
      List<String> skills});
}

/// @nodoc
class __$$LearningPathNodeImplCopyWithImpl<$Res>
    extends _$LearningPathNodeCopyWithImpl<$Res, _$LearningPathNodeImpl>
    implements _$$LearningPathNodeImplCopyWith<$Res> {
  __$$LearningPathNodeImplCopyWithImpl(_$LearningPathNodeImpl _value,
      $Res Function(_$LearningPathNodeImpl) _then)
      : super(_value, _then);

  /// Create a copy of LearningPathNode
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? topic = null,
    Object? status = null,
    Object? prerequisites = null,
    Object? nextSteps = null,
    Object? masteryLevel = freezed,
    Object? estimatedMinutes = freezed,
    Object? skills = null,
  }) {
    return _then(_$LearningPathNodeImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      topic: null == topic
          ? _value.topic
          : topic // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as NodeStatus,
      prerequisites: null == prerequisites
          ? _value._prerequisites
          : prerequisites // ignore: cast_nullable_to_non_nullable
              as List<String>,
      nextSteps: null == nextSteps
          ? _value._nextSteps
          : nextSteps // ignore: cast_nullable_to_non_nullable
              as List<String>,
      masteryLevel: freezed == masteryLevel
          ? _value.masteryLevel
          : masteryLevel // ignore: cast_nullable_to_non_nullable
              as double?,
      estimatedMinutes: freezed == estimatedMinutes
          ? _value.estimatedMinutes
          : estimatedMinutes // ignore: cast_nullable_to_non_nullable
              as int?,
      skills: null == skills
          ? _value._skills
          : skills // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$LearningPathNodeImpl implements _LearningPathNode {
  const _$LearningPathNodeImpl(
      {required this.id,
      required this.topic,
      required this.status,
      required final List<String> prerequisites,
      required final List<String> nextSteps,
      this.masteryLevel,
      this.estimatedMinutes,
      final List<String> skills = const []})
      : _prerequisites = prerequisites,
        _nextSteps = nextSteps,
        _skills = skills;

  factory _$LearningPathNodeImpl.fromJson(Map<String, dynamic> json) =>
      _$$LearningPathNodeImplFromJson(json);

  @override
  final String id;
  @override
  final String topic;
  @override
  final NodeStatus status;
  final List<String> _prerequisites;
  @override
  List<String> get prerequisites {
    if (_prerequisites is EqualUnmodifiableListView) return _prerequisites;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_prerequisites);
  }

  final List<String> _nextSteps;
  @override
  List<String> get nextSteps {
    if (_nextSteps is EqualUnmodifiableListView) return _nextSteps;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_nextSteps);
  }

  @override
  final double? masteryLevel;
  @override
  final int? estimatedMinutes;
  final List<String> _skills;
  @override
  @JsonKey()
  List<String> get skills {
    if (_skills is EqualUnmodifiableListView) return _skills;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_skills);
  }

  @override
  String toString() {
    return 'LearningPathNode(id: $id, topic: $topic, status: $status, prerequisites: $prerequisites, nextSteps: $nextSteps, masteryLevel: $masteryLevel, estimatedMinutes: $estimatedMinutes, skills: $skills)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LearningPathNodeImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.topic, topic) || other.topic == topic) &&
            (identical(other.status, status) || other.status == status) &&
            const DeepCollectionEquality()
                .equals(other._prerequisites, _prerequisites) &&
            const DeepCollectionEquality()
                .equals(other._nextSteps, _nextSteps) &&
            (identical(other.masteryLevel, masteryLevel) ||
                other.masteryLevel == masteryLevel) &&
            (identical(other.estimatedMinutes, estimatedMinutes) ||
                other.estimatedMinutes == estimatedMinutes) &&
            const DeepCollectionEquality().equals(other._skills, _skills));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      topic,
      status,
      const DeepCollectionEquality().hash(_prerequisites),
      const DeepCollectionEquality().hash(_nextSteps),
      masteryLevel,
      estimatedMinutes,
      const DeepCollectionEquality().hash(_skills));

  /// Create a copy of LearningPathNode
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LearningPathNodeImplCopyWith<_$LearningPathNodeImpl> get copyWith =>
      __$$LearningPathNodeImplCopyWithImpl<_$LearningPathNodeImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$LearningPathNodeImplToJson(
      this,
    );
  }
}

abstract class _LearningPathNode implements LearningPathNode {
  const factory _LearningPathNode(
      {required final String id,
      required final String topic,
      required final NodeStatus status,
      required final List<String> prerequisites,
      required final List<String> nextSteps,
      final double? masteryLevel,
      final int? estimatedMinutes,
      final List<String> skills}) = _$LearningPathNodeImpl;

  factory _LearningPathNode.fromJson(Map<String, dynamic> json) =
      _$LearningPathNodeImpl.fromJson;

  @override
  String get id;
  @override
  String get topic;
  @override
  NodeStatus get status;
  @override
  List<String> get prerequisites;
  @override
  List<String> get nextSteps;
  @override
  double? get masteryLevel;
  @override
  int? get estimatedMinutes;
  @override
  List<String> get skills;

  /// Create a copy of LearningPathNode
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LearningPathNodeImplCopyWith<_$LearningPathNodeImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AIPersonality _$AIPersonalityFromJson(Map<String, dynamic> json) {
  return _AIPersonality.fromJson(json);
}

/// @nodoc
mixin _$AIPersonality {
  String get name => throw _privateConstructorUsedError;
  String get tone => throw _privateConstructorUsedError;
  String get encouragementStyle => throw _privateConstructorUsedError;
  String get explanationStyle => throw _privateConstructorUsedError;
  String? get avatarUrl => throw _privateConstructorUsedError;
  Map<String, dynamic> get customSettings => throw _privateConstructorUsedError;

  /// Serializes this AIPersonality to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AIPersonality
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AIPersonalityCopyWith<AIPersonality> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AIPersonalityCopyWith<$Res> {
  factory $AIPersonalityCopyWith(
          AIPersonality value, $Res Function(AIPersonality) then) =
      _$AIPersonalityCopyWithImpl<$Res, AIPersonality>;
  @useResult
  $Res call(
      {String name,
      String tone,
      String encouragementStyle,
      String explanationStyle,
      String? avatarUrl,
      Map<String, dynamic> customSettings});
}

/// @nodoc
class _$AIPersonalityCopyWithImpl<$Res, $Val extends AIPersonality>
    implements $AIPersonalityCopyWith<$Res> {
  _$AIPersonalityCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AIPersonality
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? tone = null,
    Object? encouragementStyle = null,
    Object? explanationStyle = null,
    Object? avatarUrl = freezed,
    Object? customSettings = null,
  }) {
    return _then(_value.copyWith(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      tone: null == tone
          ? _value.tone
          : tone // ignore: cast_nullable_to_non_nullable
              as String,
      encouragementStyle: null == encouragementStyle
          ? _value.encouragementStyle
          : encouragementStyle // ignore: cast_nullable_to_non_nullable
              as String,
      explanationStyle: null == explanationStyle
          ? _value.explanationStyle
          : explanationStyle // ignore: cast_nullable_to_non_nullable
              as String,
      avatarUrl: freezed == avatarUrl
          ? _value.avatarUrl
          : avatarUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      customSettings: null == customSettings
          ? _value.customSettings
          : customSettings // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AIPersonalityImplCopyWith<$Res>
    implements $AIPersonalityCopyWith<$Res> {
  factory _$$AIPersonalityImplCopyWith(
          _$AIPersonalityImpl value, $Res Function(_$AIPersonalityImpl) then) =
      __$$AIPersonalityImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String name,
      String tone,
      String encouragementStyle,
      String explanationStyle,
      String? avatarUrl,
      Map<String, dynamic> customSettings});
}

/// @nodoc
class __$$AIPersonalityImplCopyWithImpl<$Res>
    extends _$AIPersonalityCopyWithImpl<$Res, _$AIPersonalityImpl>
    implements _$$AIPersonalityImplCopyWith<$Res> {
  __$$AIPersonalityImplCopyWithImpl(
      _$AIPersonalityImpl _value, $Res Function(_$AIPersonalityImpl) _then)
      : super(_value, _then);

  /// Create a copy of AIPersonality
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? tone = null,
    Object? encouragementStyle = null,
    Object? explanationStyle = null,
    Object? avatarUrl = freezed,
    Object? customSettings = null,
  }) {
    return _then(_$AIPersonalityImpl(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      tone: null == tone
          ? _value.tone
          : tone // ignore: cast_nullable_to_non_nullable
              as String,
      encouragementStyle: null == encouragementStyle
          ? _value.encouragementStyle
          : encouragementStyle // ignore: cast_nullable_to_non_nullable
              as String,
      explanationStyle: null == explanationStyle
          ? _value.explanationStyle
          : explanationStyle // ignore: cast_nullable_to_non_nullable
              as String,
      avatarUrl: freezed == avatarUrl
          ? _value.avatarUrl
          : avatarUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      customSettings: null == customSettings
          ? _value._customSettings
          : customSettings // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AIPersonalityImpl implements _AIPersonality {
  const _$AIPersonalityImpl(
      {required this.name,
      required this.tone,
      required this.encouragementStyle,
      required this.explanationStyle,
      this.avatarUrl,
      final Map<String, dynamic> customSettings = const {}})
      : _customSettings = customSettings;

  factory _$AIPersonalityImpl.fromJson(Map<String, dynamic> json) =>
      _$$AIPersonalityImplFromJson(json);

  @override
  final String name;
  @override
  final String tone;
  @override
  final String encouragementStyle;
  @override
  final String explanationStyle;
  @override
  final String? avatarUrl;
  final Map<String, dynamic> _customSettings;
  @override
  @JsonKey()
  Map<String, dynamic> get customSettings {
    if (_customSettings is EqualUnmodifiableMapView) return _customSettings;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_customSettings);
  }

  @override
  String toString() {
    return 'AIPersonality(name: $name, tone: $tone, encouragementStyle: $encouragementStyle, explanationStyle: $explanationStyle, avatarUrl: $avatarUrl, customSettings: $customSettings)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AIPersonalityImpl &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.tone, tone) || other.tone == tone) &&
            (identical(other.encouragementStyle, encouragementStyle) ||
                other.encouragementStyle == encouragementStyle) &&
            (identical(other.explanationStyle, explanationStyle) ||
                other.explanationStyle == explanationStyle) &&
            (identical(other.avatarUrl, avatarUrl) ||
                other.avatarUrl == avatarUrl) &&
            const DeepCollectionEquality()
                .equals(other._customSettings, _customSettings));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      name,
      tone,
      encouragementStyle,
      explanationStyle,
      avatarUrl,
      const DeepCollectionEquality().hash(_customSettings));

  /// Create a copy of AIPersonality
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AIPersonalityImplCopyWith<_$AIPersonalityImpl> get copyWith =>
      __$$AIPersonalityImplCopyWithImpl<_$AIPersonalityImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AIPersonalityImplToJson(
      this,
    );
  }
}

abstract class _AIPersonality implements AIPersonality {
  const factory _AIPersonality(
      {required final String name,
      required final String tone,
      required final String encouragementStyle,
      required final String explanationStyle,
      final String? avatarUrl,
      final Map<String, dynamic> customSettings}) = _$AIPersonalityImpl;

  factory _AIPersonality.fromJson(Map<String, dynamic> json) =
      _$AIPersonalityImpl.fromJson;

  @override
  String get name;
  @override
  String get tone;
  @override
  String get encouragementStyle;
  @override
  String get explanationStyle;
  @override
  String? get avatarUrl;
  @override
  Map<String, dynamic> get customSettings;

  /// Create a copy of AIPersonality
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AIPersonalityImplCopyWith<_$AIPersonalityImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

SubjectInfo _$SubjectInfoFromJson(Map<String, dynamic> json) {
  return _SubjectInfo.fromJson(json);
}

/// @nodoc
mixin _$SubjectInfo {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get iconName => throw _privateConstructorUsedError;
  double get progress => throw _privateConstructorUsedError;
  int get lessonsCompleted => throw _privateConstructorUsedError;
  int get totalLessons => throw _privateConstructorUsedError;

  /// Serializes this SubjectInfo to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SubjectInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SubjectInfoCopyWith<SubjectInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SubjectInfoCopyWith<$Res> {
  factory $SubjectInfoCopyWith(
          SubjectInfo value, $Res Function(SubjectInfo) then) =
      _$SubjectInfoCopyWithImpl<$Res, SubjectInfo>;
  @useResult
  $Res call(
      {String id,
      String name,
      String iconName,
      double progress,
      int lessonsCompleted,
      int totalLessons});
}

/// @nodoc
class _$SubjectInfoCopyWithImpl<$Res, $Val extends SubjectInfo>
    implements $SubjectInfoCopyWith<$Res> {
  _$SubjectInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SubjectInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? iconName = null,
    Object? progress = null,
    Object? lessonsCompleted = null,
    Object? totalLessons = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      iconName: null == iconName
          ? _value.iconName
          : iconName // ignore: cast_nullable_to_non_nullable
              as String,
      progress: null == progress
          ? _value.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as double,
      lessonsCompleted: null == lessonsCompleted
          ? _value.lessonsCompleted
          : lessonsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      totalLessons: null == totalLessons
          ? _value.totalLessons
          : totalLessons // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SubjectInfoImplCopyWith<$Res>
    implements $SubjectInfoCopyWith<$Res> {
  factory _$$SubjectInfoImplCopyWith(
          _$SubjectInfoImpl value, $Res Function(_$SubjectInfoImpl) then) =
      __$$SubjectInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String iconName,
      double progress,
      int lessonsCompleted,
      int totalLessons});
}

/// @nodoc
class __$$SubjectInfoImplCopyWithImpl<$Res>
    extends _$SubjectInfoCopyWithImpl<$Res, _$SubjectInfoImpl>
    implements _$$SubjectInfoImplCopyWith<$Res> {
  __$$SubjectInfoImplCopyWithImpl(
      _$SubjectInfoImpl _value, $Res Function(_$SubjectInfoImpl) _then)
      : super(_value, _then);

  /// Create a copy of SubjectInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? iconName = null,
    Object? progress = null,
    Object? lessonsCompleted = null,
    Object? totalLessons = null,
  }) {
    return _then(_$SubjectInfoImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      iconName: null == iconName
          ? _value.iconName
          : iconName // ignore: cast_nullable_to_non_nullable
              as String,
      progress: null == progress
          ? _value.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as double,
      lessonsCompleted: null == lessonsCompleted
          ? _value.lessonsCompleted
          : lessonsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      totalLessons: null == totalLessons
          ? _value.totalLessons
          : totalLessons // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SubjectInfoImpl implements _SubjectInfo {
  const _$SubjectInfoImpl(
      {required this.id,
      required this.name,
      required this.iconName,
      required this.progress,
      required this.lessonsCompleted,
      required this.totalLessons});

  factory _$SubjectInfoImpl.fromJson(Map<String, dynamic> json) =>
      _$$SubjectInfoImplFromJson(json);

  @override
  final String id;
  @override
  final String name;
  @override
  final String iconName;
  @override
  final double progress;
  @override
  final int lessonsCompleted;
  @override
  final int totalLessons;

  @override
  String toString() {
    return 'SubjectInfo(id: $id, name: $name, iconName: $iconName, progress: $progress, lessonsCompleted: $lessonsCompleted, totalLessons: $totalLessons)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SubjectInfoImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.iconName, iconName) ||
                other.iconName == iconName) &&
            (identical(other.progress, progress) ||
                other.progress == progress) &&
            (identical(other.lessonsCompleted, lessonsCompleted) ||
                other.lessonsCompleted == lessonsCompleted) &&
            (identical(other.totalLessons, totalLessons) ||
                other.totalLessons == totalLessons));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, name, iconName, progress,
      lessonsCompleted, totalLessons);

  /// Create a copy of SubjectInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SubjectInfoImplCopyWith<_$SubjectInfoImpl> get copyWith =>
      __$$SubjectInfoImplCopyWithImpl<_$SubjectInfoImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SubjectInfoImplToJson(
      this,
    );
  }
}

abstract class _SubjectInfo implements SubjectInfo {
  const factory _SubjectInfo(
      {required final String id,
      required final String name,
      required final String iconName,
      required final double progress,
      required final int lessonsCompleted,
      required final int totalLessons}) = _$SubjectInfoImpl;

  factory _SubjectInfo.fromJson(Map<String, dynamic> json) =
      _$SubjectInfoImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  String get iconName;
  @override
  double get progress;
  @override
  int get lessonsCompleted;
  @override
  int get totalLessons;

  /// Create a copy of SubjectInfo
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SubjectInfoImplCopyWith<_$SubjectInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
