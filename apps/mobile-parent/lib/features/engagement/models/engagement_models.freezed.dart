// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'engagement_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

LearningStreak _$LearningStreakFromJson(Map<String, dynamic> json) {
  return _LearningStreak.fromJson(json);
}

/// @nodoc
mixin _$LearningStreak {
  String get childId => throw _privateConstructorUsedError;
  int get currentStreak => throw _privateConstructorUsedError;
  int get longestStreak => throw _privateConstructorUsedError;
  DateTime? get lastActiveDate => throw _privateConstructorUsedError;
  List<StreakDay> get streakHistory => throw _privateConstructorUsedError;
  int get totalActiveDays => throw _privateConstructorUsedError;
  int get weeklyGoal => throw _privateConstructorUsedError;
  int get weeklyProgress => throw _privateConstructorUsedError;

  /// Serializes this LearningStreak to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of LearningStreak
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $LearningStreakCopyWith<LearningStreak> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LearningStreakCopyWith<$Res> {
  factory $LearningStreakCopyWith(
          LearningStreak value, $Res Function(LearningStreak) then) =
      _$LearningStreakCopyWithImpl<$Res, LearningStreak>;
  @useResult
  $Res call(
      {String childId,
      int currentStreak,
      int longestStreak,
      DateTime? lastActiveDate,
      List<StreakDay> streakHistory,
      int totalActiveDays,
      int weeklyGoal,
      int weeklyProgress});
}

/// @nodoc
class _$LearningStreakCopyWithImpl<$Res, $Val extends LearningStreak>
    implements $LearningStreakCopyWith<$Res> {
  _$LearningStreakCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of LearningStreak
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? currentStreak = null,
    Object? longestStreak = null,
    Object? lastActiveDate = freezed,
    Object? streakHistory = null,
    Object? totalActiveDays = null,
    Object? weeklyGoal = null,
    Object? weeklyProgress = null,
  }) {
    return _then(_value.copyWith(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      currentStreak: null == currentStreak
          ? _value.currentStreak
          : currentStreak // ignore: cast_nullable_to_non_nullable
              as int,
      longestStreak: null == longestStreak
          ? _value.longestStreak
          : longestStreak // ignore: cast_nullable_to_non_nullable
              as int,
      lastActiveDate: freezed == lastActiveDate
          ? _value.lastActiveDate
          : lastActiveDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      streakHistory: null == streakHistory
          ? _value.streakHistory
          : streakHistory // ignore: cast_nullable_to_non_nullable
              as List<StreakDay>,
      totalActiveDays: null == totalActiveDays
          ? _value.totalActiveDays
          : totalActiveDays // ignore: cast_nullable_to_non_nullable
              as int,
      weeklyGoal: null == weeklyGoal
          ? _value.weeklyGoal
          : weeklyGoal // ignore: cast_nullable_to_non_nullable
              as int,
      weeklyProgress: null == weeklyProgress
          ? _value.weeklyProgress
          : weeklyProgress // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$LearningStreakImplCopyWith<$Res>
    implements $LearningStreakCopyWith<$Res> {
  factory _$$LearningStreakImplCopyWith(_$LearningStreakImpl value,
          $Res Function(_$LearningStreakImpl) then) =
      __$$LearningStreakImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String childId,
      int currentStreak,
      int longestStreak,
      DateTime? lastActiveDate,
      List<StreakDay> streakHistory,
      int totalActiveDays,
      int weeklyGoal,
      int weeklyProgress});
}

/// @nodoc
class __$$LearningStreakImplCopyWithImpl<$Res>
    extends _$LearningStreakCopyWithImpl<$Res, _$LearningStreakImpl>
    implements _$$LearningStreakImplCopyWith<$Res> {
  __$$LearningStreakImplCopyWithImpl(
      _$LearningStreakImpl _value, $Res Function(_$LearningStreakImpl) _then)
      : super(_value, _then);

  /// Create a copy of LearningStreak
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? currentStreak = null,
    Object? longestStreak = null,
    Object? lastActiveDate = freezed,
    Object? streakHistory = null,
    Object? totalActiveDays = null,
    Object? weeklyGoal = null,
    Object? weeklyProgress = null,
  }) {
    return _then(_$LearningStreakImpl(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      currentStreak: null == currentStreak
          ? _value.currentStreak
          : currentStreak // ignore: cast_nullable_to_non_nullable
              as int,
      longestStreak: null == longestStreak
          ? _value.longestStreak
          : longestStreak // ignore: cast_nullable_to_non_nullable
              as int,
      lastActiveDate: freezed == lastActiveDate
          ? _value.lastActiveDate
          : lastActiveDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      streakHistory: null == streakHistory
          ? _value._streakHistory
          : streakHistory // ignore: cast_nullable_to_non_nullable
              as List<StreakDay>,
      totalActiveDays: null == totalActiveDays
          ? _value.totalActiveDays
          : totalActiveDays // ignore: cast_nullable_to_non_nullable
              as int,
      weeklyGoal: null == weeklyGoal
          ? _value.weeklyGoal
          : weeklyGoal // ignore: cast_nullable_to_non_nullable
              as int,
      weeklyProgress: null == weeklyProgress
          ? _value.weeklyProgress
          : weeklyProgress // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$LearningStreakImpl implements _LearningStreak {
  const _$LearningStreakImpl(
      {required this.childId,
      required this.currentStreak,
      required this.longestStreak,
      required this.lastActiveDate,
      required final List<StreakDay> streakHistory,
      required this.totalActiveDays,
      this.weeklyGoal = 7,
      this.weeklyProgress = 0})
      : _streakHistory = streakHistory;

  factory _$LearningStreakImpl.fromJson(Map<String, dynamic> json) =>
      _$$LearningStreakImplFromJson(json);

  @override
  final String childId;
  @override
  final int currentStreak;
  @override
  final int longestStreak;
  @override
  final DateTime? lastActiveDate;
  final List<StreakDay> _streakHistory;
  @override
  List<StreakDay> get streakHistory {
    if (_streakHistory is EqualUnmodifiableListView) return _streakHistory;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_streakHistory);
  }

  @override
  final int totalActiveDays;
  @override
  @JsonKey()
  final int weeklyGoal;
  @override
  @JsonKey()
  final int weeklyProgress;

  @override
  String toString() {
    return 'LearningStreak(childId: $childId, currentStreak: $currentStreak, longestStreak: $longestStreak, lastActiveDate: $lastActiveDate, streakHistory: $streakHistory, totalActiveDays: $totalActiveDays, weeklyGoal: $weeklyGoal, weeklyProgress: $weeklyProgress)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LearningStreakImpl &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.currentStreak, currentStreak) ||
                other.currentStreak == currentStreak) &&
            (identical(other.longestStreak, longestStreak) ||
                other.longestStreak == longestStreak) &&
            (identical(other.lastActiveDate, lastActiveDate) ||
                other.lastActiveDate == lastActiveDate) &&
            const DeepCollectionEquality()
                .equals(other._streakHistory, _streakHistory) &&
            (identical(other.totalActiveDays, totalActiveDays) ||
                other.totalActiveDays == totalActiveDays) &&
            (identical(other.weeklyGoal, weeklyGoal) ||
                other.weeklyGoal == weeklyGoal) &&
            (identical(other.weeklyProgress, weeklyProgress) ||
                other.weeklyProgress == weeklyProgress));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      childId,
      currentStreak,
      longestStreak,
      lastActiveDate,
      const DeepCollectionEquality().hash(_streakHistory),
      totalActiveDays,
      weeklyGoal,
      weeklyProgress);

  /// Create a copy of LearningStreak
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LearningStreakImplCopyWith<_$LearningStreakImpl> get copyWith =>
      __$$LearningStreakImplCopyWithImpl<_$LearningStreakImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$LearningStreakImplToJson(
      this,
    );
  }
}

abstract class _LearningStreak implements LearningStreak {
  const factory _LearningStreak(
      {required final String childId,
      required final int currentStreak,
      required final int longestStreak,
      required final DateTime? lastActiveDate,
      required final List<StreakDay> streakHistory,
      required final int totalActiveDays,
      final int weeklyGoal,
      final int weeklyProgress}) = _$LearningStreakImpl;

  factory _LearningStreak.fromJson(Map<String, dynamic> json) =
      _$LearningStreakImpl.fromJson;

  @override
  String get childId;
  @override
  int get currentStreak;
  @override
  int get longestStreak;
  @override
  DateTime? get lastActiveDate;
  @override
  List<StreakDay> get streakHistory;
  @override
  int get totalActiveDays;
  @override
  int get weeklyGoal;
  @override
  int get weeklyProgress;

  /// Create a copy of LearningStreak
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LearningStreakImplCopyWith<_$LearningStreakImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

StreakDay _$StreakDayFromJson(Map<String, dynamic> json) {
  return _StreakDay.fromJson(json);
}

/// @nodoc
mixin _$StreakDay {
  DateTime get date => throw _privateConstructorUsedError;
  bool get isActive => throw _privateConstructorUsedError;
  int get minutesLearned => throw _privateConstructorUsedError;
  int get lessonsCompleted => throw _privateConstructorUsedError;
  int get pointsEarned => throw _privateConstructorUsedError;
  String? get highlight => throw _privateConstructorUsedError;

  /// Serializes this StreakDay to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of StreakDay
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $StreakDayCopyWith<StreakDay> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $StreakDayCopyWith<$Res> {
  factory $StreakDayCopyWith(StreakDay value, $Res Function(StreakDay) then) =
      _$StreakDayCopyWithImpl<$Res, StreakDay>;
  @useResult
  $Res call(
      {DateTime date,
      bool isActive,
      int minutesLearned,
      int lessonsCompleted,
      int pointsEarned,
      String? highlight});
}

/// @nodoc
class _$StreakDayCopyWithImpl<$Res, $Val extends StreakDay>
    implements $StreakDayCopyWith<$Res> {
  _$StreakDayCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of StreakDay
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? date = null,
    Object? isActive = null,
    Object? minutesLearned = null,
    Object? lessonsCompleted = null,
    Object? pointsEarned = null,
    Object? highlight = freezed,
  }) {
    return _then(_value.copyWith(
      date: null == date
          ? _value.date
          : date // ignore: cast_nullable_to_non_nullable
              as DateTime,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      minutesLearned: null == minutesLearned
          ? _value.minutesLearned
          : minutesLearned // ignore: cast_nullable_to_non_nullable
              as int,
      lessonsCompleted: null == lessonsCompleted
          ? _value.lessonsCompleted
          : lessonsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      pointsEarned: null == pointsEarned
          ? _value.pointsEarned
          : pointsEarned // ignore: cast_nullable_to_non_nullable
              as int,
      highlight: freezed == highlight
          ? _value.highlight
          : highlight // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$StreakDayImplCopyWith<$Res>
    implements $StreakDayCopyWith<$Res> {
  factory _$$StreakDayImplCopyWith(
          _$StreakDayImpl value, $Res Function(_$StreakDayImpl) then) =
      __$$StreakDayImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {DateTime date,
      bool isActive,
      int minutesLearned,
      int lessonsCompleted,
      int pointsEarned,
      String? highlight});
}

/// @nodoc
class __$$StreakDayImplCopyWithImpl<$Res>
    extends _$StreakDayCopyWithImpl<$Res, _$StreakDayImpl>
    implements _$$StreakDayImplCopyWith<$Res> {
  __$$StreakDayImplCopyWithImpl(
      _$StreakDayImpl _value, $Res Function(_$StreakDayImpl) _then)
      : super(_value, _then);

  /// Create a copy of StreakDay
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? date = null,
    Object? isActive = null,
    Object? minutesLearned = null,
    Object? lessonsCompleted = null,
    Object? pointsEarned = null,
    Object? highlight = freezed,
  }) {
    return _then(_$StreakDayImpl(
      date: null == date
          ? _value.date
          : date // ignore: cast_nullable_to_non_nullable
              as DateTime,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      minutesLearned: null == minutesLearned
          ? _value.minutesLearned
          : minutesLearned // ignore: cast_nullable_to_non_nullable
              as int,
      lessonsCompleted: null == lessonsCompleted
          ? _value.lessonsCompleted
          : lessonsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      pointsEarned: null == pointsEarned
          ? _value.pointsEarned
          : pointsEarned // ignore: cast_nullable_to_non_nullable
              as int,
      highlight: freezed == highlight
          ? _value.highlight
          : highlight // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$StreakDayImpl implements _StreakDay {
  const _$StreakDayImpl(
      {required this.date,
      required this.isActive,
      required this.minutesLearned,
      required this.lessonsCompleted,
      required this.pointsEarned,
      this.highlight});

  factory _$StreakDayImpl.fromJson(Map<String, dynamic> json) =>
      _$$StreakDayImplFromJson(json);

  @override
  final DateTime date;
  @override
  final bool isActive;
  @override
  final int minutesLearned;
  @override
  final int lessonsCompleted;
  @override
  final int pointsEarned;
  @override
  final String? highlight;

  @override
  String toString() {
    return 'StreakDay(date: $date, isActive: $isActive, minutesLearned: $minutesLearned, lessonsCompleted: $lessonsCompleted, pointsEarned: $pointsEarned, highlight: $highlight)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$StreakDayImpl &&
            (identical(other.date, date) || other.date == date) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive) &&
            (identical(other.minutesLearned, minutesLearned) ||
                other.minutesLearned == minutesLearned) &&
            (identical(other.lessonsCompleted, lessonsCompleted) ||
                other.lessonsCompleted == lessonsCompleted) &&
            (identical(other.pointsEarned, pointsEarned) ||
                other.pointsEarned == pointsEarned) &&
            (identical(other.highlight, highlight) ||
                other.highlight == highlight));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, date, isActive, minutesLearned,
      lessonsCompleted, pointsEarned, highlight);

  /// Create a copy of StreakDay
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$StreakDayImplCopyWith<_$StreakDayImpl> get copyWith =>
      __$$StreakDayImplCopyWithImpl<_$StreakDayImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$StreakDayImplToJson(
      this,
    );
  }
}

abstract class _StreakDay implements StreakDay {
  const factory _StreakDay(
      {required final DateTime date,
      required final bool isActive,
      required final int minutesLearned,
      required final int lessonsCompleted,
      required final int pointsEarned,
      final String? highlight}) = _$StreakDayImpl;

  factory _StreakDay.fromJson(Map<String, dynamic> json) =
      _$StreakDayImpl.fromJson;

  @override
  DateTime get date;
  @override
  bool get isActive;
  @override
  int get minutesLearned;
  @override
  int get lessonsCompleted;
  @override
  int get pointsEarned;
  @override
  String? get highlight;

  /// Create a copy of StreakDay
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$StreakDayImplCopyWith<_$StreakDayImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

DailyUsage _$DailyUsageFromJson(Map<String, dynamic> json) {
  return _DailyUsage.fromJson(json);
}

/// @nodoc
mixin _$DailyUsage {
  String get childId => throw _privateConstructorUsedError;
  DateTime get date => throw _privateConstructorUsedError;
  int get totalMinutes => throw _privateConstructorUsedError;
  int get activeMinutes => throw _privateConstructorUsedError;
  int get idleMinutes => throw _privateConstructorUsedError;
  List<UsageSession> get sessions => throw _privateConstructorUsedError;
  Map<String, int> get subjectBreakdown => throw _privateConstructorUsedError;
  int get lessonsStarted => throw _privateConstructorUsedError;
  int get lessonsCompleted => throw _privateConstructorUsedError;
  double get averageEngagement => throw _privateConstructorUsedError;

  /// Serializes this DailyUsage to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of DailyUsage
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DailyUsageCopyWith<DailyUsage> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DailyUsageCopyWith<$Res> {
  factory $DailyUsageCopyWith(
          DailyUsage value, $Res Function(DailyUsage) then) =
      _$DailyUsageCopyWithImpl<$Res, DailyUsage>;
  @useResult
  $Res call(
      {String childId,
      DateTime date,
      int totalMinutes,
      int activeMinutes,
      int idleMinutes,
      List<UsageSession> sessions,
      Map<String, int> subjectBreakdown,
      int lessonsStarted,
      int lessonsCompleted,
      double averageEngagement});
}

/// @nodoc
class _$DailyUsageCopyWithImpl<$Res, $Val extends DailyUsage>
    implements $DailyUsageCopyWith<$Res> {
  _$DailyUsageCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DailyUsage
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? date = null,
    Object? totalMinutes = null,
    Object? activeMinutes = null,
    Object? idleMinutes = null,
    Object? sessions = null,
    Object? subjectBreakdown = null,
    Object? lessonsStarted = null,
    Object? lessonsCompleted = null,
    Object? averageEngagement = null,
  }) {
    return _then(_value.copyWith(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      date: null == date
          ? _value.date
          : date // ignore: cast_nullable_to_non_nullable
              as DateTime,
      totalMinutes: null == totalMinutes
          ? _value.totalMinutes
          : totalMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      activeMinutes: null == activeMinutes
          ? _value.activeMinutes
          : activeMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      idleMinutes: null == idleMinutes
          ? _value.idleMinutes
          : idleMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      sessions: null == sessions
          ? _value.sessions
          : sessions // ignore: cast_nullable_to_non_nullable
              as List<UsageSession>,
      subjectBreakdown: null == subjectBreakdown
          ? _value.subjectBreakdown
          : subjectBreakdown // ignore: cast_nullable_to_non_nullable
              as Map<String, int>,
      lessonsStarted: null == lessonsStarted
          ? _value.lessonsStarted
          : lessonsStarted // ignore: cast_nullable_to_non_nullable
              as int,
      lessonsCompleted: null == lessonsCompleted
          ? _value.lessonsCompleted
          : lessonsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      averageEngagement: null == averageEngagement
          ? _value.averageEngagement
          : averageEngagement // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$DailyUsageImplCopyWith<$Res>
    implements $DailyUsageCopyWith<$Res> {
  factory _$$DailyUsageImplCopyWith(
          _$DailyUsageImpl value, $Res Function(_$DailyUsageImpl) then) =
      __$$DailyUsageImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String childId,
      DateTime date,
      int totalMinutes,
      int activeMinutes,
      int idleMinutes,
      List<UsageSession> sessions,
      Map<String, int> subjectBreakdown,
      int lessonsStarted,
      int lessonsCompleted,
      double averageEngagement});
}

/// @nodoc
class __$$DailyUsageImplCopyWithImpl<$Res>
    extends _$DailyUsageCopyWithImpl<$Res, _$DailyUsageImpl>
    implements _$$DailyUsageImplCopyWith<$Res> {
  __$$DailyUsageImplCopyWithImpl(
      _$DailyUsageImpl _value, $Res Function(_$DailyUsageImpl) _then)
      : super(_value, _then);

  /// Create a copy of DailyUsage
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? date = null,
    Object? totalMinutes = null,
    Object? activeMinutes = null,
    Object? idleMinutes = null,
    Object? sessions = null,
    Object? subjectBreakdown = null,
    Object? lessonsStarted = null,
    Object? lessonsCompleted = null,
    Object? averageEngagement = null,
  }) {
    return _then(_$DailyUsageImpl(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      date: null == date
          ? _value.date
          : date // ignore: cast_nullable_to_non_nullable
              as DateTime,
      totalMinutes: null == totalMinutes
          ? _value.totalMinutes
          : totalMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      activeMinutes: null == activeMinutes
          ? _value.activeMinutes
          : activeMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      idleMinutes: null == idleMinutes
          ? _value.idleMinutes
          : idleMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      sessions: null == sessions
          ? _value._sessions
          : sessions // ignore: cast_nullable_to_non_nullable
              as List<UsageSession>,
      subjectBreakdown: null == subjectBreakdown
          ? _value._subjectBreakdown
          : subjectBreakdown // ignore: cast_nullable_to_non_nullable
              as Map<String, int>,
      lessonsStarted: null == lessonsStarted
          ? _value.lessonsStarted
          : lessonsStarted // ignore: cast_nullable_to_non_nullable
              as int,
      lessonsCompleted: null == lessonsCompleted
          ? _value.lessonsCompleted
          : lessonsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      averageEngagement: null == averageEngagement
          ? _value.averageEngagement
          : averageEngagement // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$DailyUsageImpl implements _DailyUsage {
  const _$DailyUsageImpl(
      {required this.childId,
      required this.date,
      required this.totalMinutes,
      required this.activeMinutes,
      required this.idleMinutes,
      required final List<UsageSession> sessions,
      required final Map<String, int> subjectBreakdown,
      required this.lessonsStarted,
      required this.lessonsCompleted,
      required this.averageEngagement})
      : _sessions = sessions,
        _subjectBreakdown = subjectBreakdown;

  factory _$DailyUsageImpl.fromJson(Map<String, dynamic> json) =>
      _$$DailyUsageImplFromJson(json);

  @override
  final String childId;
  @override
  final DateTime date;
  @override
  final int totalMinutes;
  @override
  final int activeMinutes;
  @override
  final int idleMinutes;
  final List<UsageSession> _sessions;
  @override
  List<UsageSession> get sessions {
    if (_sessions is EqualUnmodifiableListView) return _sessions;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_sessions);
  }

  final Map<String, int> _subjectBreakdown;
  @override
  Map<String, int> get subjectBreakdown {
    if (_subjectBreakdown is EqualUnmodifiableMapView) return _subjectBreakdown;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_subjectBreakdown);
  }

  @override
  final int lessonsStarted;
  @override
  final int lessonsCompleted;
  @override
  final double averageEngagement;

  @override
  String toString() {
    return 'DailyUsage(childId: $childId, date: $date, totalMinutes: $totalMinutes, activeMinutes: $activeMinutes, idleMinutes: $idleMinutes, sessions: $sessions, subjectBreakdown: $subjectBreakdown, lessonsStarted: $lessonsStarted, lessonsCompleted: $lessonsCompleted, averageEngagement: $averageEngagement)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DailyUsageImpl &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.date, date) || other.date == date) &&
            (identical(other.totalMinutes, totalMinutes) ||
                other.totalMinutes == totalMinutes) &&
            (identical(other.activeMinutes, activeMinutes) ||
                other.activeMinutes == activeMinutes) &&
            (identical(other.idleMinutes, idleMinutes) ||
                other.idleMinutes == idleMinutes) &&
            const DeepCollectionEquality().equals(other._sessions, _sessions) &&
            const DeepCollectionEquality()
                .equals(other._subjectBreakdown, _subjectBreakdown) &&
            (identical(other.lessonsStarted, lessonsStarted) ||
                other.lessonsStarted == lessonsStarted) &&
            (identical(other.lessonsCompleted, lessonsCompleted) ||
                other.lessonsCompleted == lessonsCompleted) &&
            (identical(other.averageEngagement, averageEngagement) ||
                other.averageEngagement == averageEngagement));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      childId,
      date,
      totalMinutes,
      activeMinutes,
      idleMinutes,
      const DeepCollectionEquality().hash(_sessions),
      const DeepCollectionEquality().hash(_subjectBreakdown),
      lessonsStarted,
      lessonsCompleted,
      averageEngagement);

  /// Create a copy of DailyUsage
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DailyUsageImplCopyWith<_$DailyUsageImpl> get copyWith =>
      __$$DailyUsageImplCopyWithImpl<_$DailyUsageImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$DailyUsageImplToJson(
      this,
    );
  }
}

abstract class _DailyUsage implements DailyUsage {
  const factory _DailyUsage(
      {required final String childId,
      required final DateTime date,
      required final int totalMinutes,
      required final int activeMinutes,
      required final int idleMinutes,
      required final List<UsageSession> sessions,
      required final Map<String, int> subjectBreakdown,
      required final int lessonsStarted,
      required final int lessonsCompleted,
      required final double averageEngagement}) = _$DailyUsageImpl;

  factory _DailyUsage.fromJson(Map<String, dynamic> json) =
      _$DailyUsageImpl.fromJson;

  @override
  String get childId;
  @override
  DateTime get date;
  @override
  int get totalMinutes;
  @override
  int get activeMinutes;
  @override
  int get idleMinutes;
  @override
  List<UsageSession> get sessions;
  @override
  Map<String, int> get subjectBreakdown;
  @override
  int get lessonsStarted;
  @override
  int get lessonsCompleted;
  @override
  double get averageEngagement;

  /// Create a copy of DailyUsage
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DailyUsageImplCopyWith<_$DailyUsageImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

UsageSession _$UsageSessionFromJson(Map<String, dynamic> json) {
  return _UsageSession.fromJson(json);
}

/// @nodoc
mixin _$UsageSession {
  String get id => throw _privateConstructorUsedError;
  DateTime get startTime => throw _privateConstructorUsedError;
  DateTime? get endTime => throw _privateConstructorUsedError;
  int get durationMinutes => throw _privateConstructorUsedError;
  String get subject => throw _privateConstructorUsedError;
  String get activityType => throw _privateConstructorUsedError;
  double get engagementScore => throw _privateConstructorUsedError;
  String? get lessonId => throw _privateConstructorUsedError;
  String? get lessonTitle => throw _privateConstructorUsedError;

  /// Serializes this UsageSession to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of UsageSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $UsageSessionCopyWith<UsageSession> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $UsageSessionCopyWith<$Res> {
  factory $UsageSessionCopyWith(
          UsageSession value, $Res Function(UsageSession) then) =
      _$UsageSessionCopyWithImpl<$Res, UsageSession>;
  @useResult
  $Res call(
      {String id,
      DateTime startTime,
      DateTime? endTime,
      int durationMinutes,
      String subject,
      String activityType,
      double engagementScore,
      String? lessonId,
      String? lessonTitle});
}

/// @nodoc
class _$UsageSessionCopyWithImpl<$Res, $Val extends UsageSession>
    implements $UsageSessionCopyWith<$Res> {
  _$UsageSessionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of UsageSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? startTime = null,
    Object? endTime = freezed,
    Object? durationMinutes = null,
    Object? subject = null,
    Object? activityType = null,
    Object? engagementScore = null,
    Object? lessonId = freezed,
    Object? lessonTitle = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      startTime: null == startTime
          ? _value.startTime
          : startTime // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endTime: freezed == endTime
          ? _value.endTime
          : endTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      activityType: null == activityType
          ? _value.activityType
          : activityType // ignore: cast_nullable_to_non_nullable
              as String,
      engagementScore: null == engagementScore
          ? _value.engagementScore
          : engagementScore // ignore: cast_nullable_to_non_nullable
              as double,
      lessonId: freezed == lessonId
          ? _value.lessonId
          : lessonId // ignore: cast_nullable_to_non_nullable
              as String?,
      lessonTitle: freezed == lessonTitle
          ? _value.lessonTitle
          : lessonTitle // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$UsageSessionImplCopyWith<$Res>
    implements $UsageSessionCopyWith<$Res> {
  factory _$$UsageSessionImplCopyWith(
          _$UsageSessionImpl value, $Res Function(_$UsageSessionImpl) then) =
      __$$UsageSessionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      DateTime startTime,
      DateTime? endTime,
      int durationMinutes,
      String subject,
      String activityType,
      double engagementScore,
      String? lessonId,
      String? lessonTitle});
}

/// @nodoc
class __$$UsageSessionImplCopyWithImpl<$Res>
    extends _$UsageSessionCopyWithImpl<$Res, _$UsageSessionImpl>
    implements _$$UsageSessionImplCopyWith<$Res> {
  __$$UsageSessionImplCopyWithImpl(
      _$UsageSessionImpl _value, $Res Function(_$UsageSessionImpl) _then)
      : super(_value, _then);

  /// Create a copy of UsageSession
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? startTime = null,
    Object? endTime = freezed,
    Object? durationMinutes = null,
    Object? subject = null,
    Object? activityType = null,
    Object? engagementScore = null,
    Object? lessonId = freezed,
    Object? lessonTitle = freezed,
  }) {
    return _then(_$UsageSessionImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      startTime: null == startTime
          ? _value.startTime
          : startTime // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endTime: freezed == endTime
          ? _value.endTime
          : endTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      durationMinutes: null == durationMinutes
          ? _value.durationMinutes
          : durationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      subject: null == subject
          ? _value.subject
          : subject // ignore: cast_nullable_to_non_nullable
              as String,
      activityType: null == activityType
          ? _value.activityType
          : activityType // ignore: cast_nullable_to_non_nullable
              as String,
      engagementScore: null == engagementScore
          ? _value.engagementScore
          : engagementScore // ignore: cast_nullable_to_non_nullable
              as double,
      lessonId: freezed == lessonId
          ? _value.lessonId
          : lessonId // ignore: cast_nullable_to_non_nullable
              as String?,
      lessonTitle: freezed == lessonTitle
          ? _value.lessonTitle
          : lessonTitle // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$UsageSessionImpl implements _UsageSession {
  const _$UsageSessionImpl(
      {required this.id,
      required this.startTime,
      required this.endTime,
      required this.durationMinutes,
      required this.subject,
      required this.activityType,
      required this.engagementScore,
      this.lessonId,
      this.lessonTitle});

  factory _$UsageSessionImpl.fromJson(Map<String, dynamic> json) =>
      _$$UsageSessionImplFromJson(json);

  @override
  final String id;
  @override
  final DateTime startTime;
  @override
  final DateTime? endTime;
  @override
  final int durationMinutes;
  @override
  final String subject;
  @override
  final String activityType;
  @override
  final double engagementScore;
  @override
  final String? lessonId;
  @override
  final String? lessonTitle;

  @override
  String toString() {
    return 'UsageSession(id: $id, startTime: $startTime, endTime: $endTime, durationMinutes: $durationMinutes, subject: $subject, activityType: $activityType, engagementScore: $engagementScore, lessonId: $lessonId, lessonTitle: $lessonTitle)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$UsageSessionImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.startTime, startTime) ||
                other.startTime == startTime) &&
            (identical(other.endTime, endTime) || other.endTime == endTime) &&
            (identical(other.durationMinutes, durationMinutes) ||
                other.durationMinutes == durationMinutes) &&
            (identical(other.subject, subject) || other.subject == subject) &&
            (identical(other.activityType, activityType) ||
                other.activityType == activityType) &&
            (identical(other.engagementScore, engagementScore) ||
                other.engagementScore == engagementScore) &&
            (identical(other.lessonId, lessonId) ||
                other.lessonId == lessonId) &&
            (identical(other.lessonTitle, lessonTitle) ||
                other.lessonTitle == lessonTitle));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      startTime,
      endTime,
      durationMinutes,
      subject,
      activityType,
      engagementScore,
      lessonId,
      lessonTitle);

  /// Create a copy of UsageSession
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$UsageSessionImplCopyWith<_$UsageSessionImpl> get copyWith =>
      __$$UsageSessionImplCopyWithImpl<_$UsageSessionImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$UsageSessionImplToJson(
      this,
    );
  }
}

abstract class _UsageSession implements UsageSession {
  const factory _UsageSession(
      {required final String id,
      required final DateTime startTime,
      required final DateTime? endTime,
      required final int durationMinutes,
      required final String subject,
      required final String activityType,
      required final double engagementScore,
      final String? lessonId,
      final String? lessonTitle}) = _$UsageSessionImpl;

  factory _UsageSession.fromJson(Map<String, dynamic> json) =
      _$UsageSessionImpl.fromJson;

  @override
  String get id;
  @override
  DateTime get startTime;
  @override
  DateTime? get endTime;
  @override
  int get durationMinutes;
  @override
  String get subject;
  @override
  String get activityType;
  @override
  double get engagementScore;
  @override
  String? get lessonId;
  @override
  String? get lessonTitle;

  /// Create a copy of UsageSession
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$UsageSessionImplCopyWith<_$UsageSessionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

UsageSummary _$UsageSummaryFromJson(Map<String, dynamic> json) {
  return _UsageSummary.fromJson(json);
}

/// @nodoc
mixin _$UsageSummary {
  String get childId => throw _privateConstructorUsedError;
  DateTime get startDate => throw _privateConstructorUsedError;
  DateTime get endDate => throw _privateConstructorUsedError;
  int get totalMinutes => throw _privateConstructorUsedError;
  int get averageDailyMinutes => throw _privateConstructorUsedError;
  int get totalLessons => throw _privateConstructorUsedError;
  Map<String, int> get subjectTotals => throw _privateConstructorUsedError;
  List<DailyUsage> get dailyData => throw _privateConstructorUsedError;
  double get engagementTrend => throw _privateConstructorUsedError;

  /// Serializes this UsageSummary to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of UsageSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $UsageSummaryCopyWith<UsageSummary> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $UsageSummaryCopyWith<$Res> {
  factory $UsageSummaryCopyWith(
          UsageSummary value, $Res Function(UsageSummary) then) =
      _$UsageSummaryCopyWithImpl<$Res, UsageSummary>;
  @useResult
  $Res call(
      {String childId,
      DateTime startDate,
      DateTime endDate,
      int totalMinutes,
      int averageDailyMinutes,
      int totalLessons,
      Map<String, int> subjectTotals,
      List<DailyUsage> dailyData,
      double engagementTrend});
}

/// @nodoc
class _$UsageSummaryCopyWithImpl<$Res, $Val extends UsageSummary>
    implements $UsageSummaryCopyWith<$Res> {
  _$UsageSummaryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of UsageSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? startDate = null,
    Object? endDate = null,
    Object? totalMinutes = null,
    Object? averageDailyMinutes = null,
    Object? totalLessons = null,
    Object? subjectTotals = null,
    Object? dailyData = null,
    Object? engagementTrend = null,
  }) {
    return _then(_value.copyWith(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      startDate: null == startDate
          ? _value.startDate
          : startDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endDate: null == endDate
          ? _value.endDate
          : endDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      totalMinutes: null == totalMinutes
          ? _value.totalMinutes
          : totalMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      averageDailyMinutes: null == averageDailyMinutes
          ? _value.averageDailyMinutes
          : averageDailyMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      totalLessons: null == totalLessons
          ? _value.totalLessons
          : totalLessons // ignore: cast_nullable_to_non_nullable
              as int,
      subjectTotals: null == subjectTotals
          ? _value.subjectTotals
          : subjectTotals // ignore: cast_nullable_to_non_nullable
              as Map<String, int>,
      dailyData: null == dailyData
          ? _value.dailyData
          : dailyData // ignore: cast_nullable_to_non_nullable
              as List<DailyUsage>,
      engagementTrend: null == engagementTrend
          ? _value.engagementTrend
          : engagementTrend // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$UsageSummaryImplCopyWith<$Res>
    implements $UsageSummaryCopyWith<$Res> {
  factory _$$UsageSummaryImplCopyWith(
          _$UsageSummaryImpl value, $Res Function(_$UsageSummaryImpl) then) =
      __$$UsageSummaryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String childId,
      DateTime startDate,
      DateTime endDate,
      int totalMinutes,
      int averageDailyMinutes,
      int totalLessons,
      Map<String, int> subjectTotals,
      List<DailyUsage> dailyData,
      double engagementTrend});
}

/// @nodoc
class __$$UsageSummaryImplCopyWithImpl<$Res>
    extends _$UsageSummaryCopyWithImpl<$Res, _$UsageSummaryImpl>
    implements _$$UsageSummaryImplCopyWith<$Res> {
  __$$UsageSummaryImplCopyWithImpl(
      _$UsageSummaryImpl _value, $Res Function(_$UsageSummaryImpl) _then)
      : super(_value, _then);

  /// Create a copy of UsageSummary
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? startDate = null,
    Object? endDate = null,
    Object? totalMinutes = null,
    Object? averageDailyMinutes = null,
    Object? totalLessons = null,
    Object? subjectTotals = null,
    Object? dailyData = null,
    Object? engagementTrend = null,
  }) {
    return _then(_$UsageSummaryImpl(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      startDate: null == startDate
          ? _value.startDate
          : startDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endDate: null == endDate
          ? _value.endDate
          : endDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      totalMinutes: null == totalMinutes
          ? _value.totalMinutes
          : totalMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      averageDailyMinutes: null == averageDailyMinutes
          ? _value.averageDailyMinutes
          : averageDailyMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      totalLessons: null == totalLessons
          ? _value.totalLessons
          : totalLessons // ignore: cast_nullable_to_non_nullable
              as int,
      subjectTotals: null == subjectTotals
          ? _value._subjectTotals
          : subjectTotals // ignore: cast_nullable_to_non_nullable
              as Map<String, int>,
      dailyData: null == dailyData
          ? _value._dailyData
          : dailyData // ignore: cast_nullable_to_non_nullable
              as List<DailyUsage>,
      engagementTrend: null == engagementTrend
          ? _value.engagementTrend
          : engagementTrend // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$UsageSummaryImpl implements _UsageSummary {
  const _$UsageSummaryImpl(
      {required this.childId,
      required this.startDate,
      required this.endDate,
      required this.totalMinutes,
      required this.averageDailyMinutes,
      required this.totalLessons,
      required final Map<String, int> subjectTotals,
      required final List<DailyUsage> dailyData,
      required this.engagementTrend})
      : _subjectTotals = subjectTotals,
        _dailyData = dailyData;

  factory _$UsageSummaryImpl.fromJson(Map<String, dynamic> json) =>
      _$$UsageSummaryImplFromJson(json);

  @override
  final String childId;
  @override
  final DateTime startDate;
  @override
  final DateTime endDate;
  @override
  final int totalMinutes;
  @override
  final int averageDailyMinutes;
  @override
  final int totalLessons;
  final Map<String, int> _subjectTotals;
  @override
  Map<String, int> get subjectTotals {
    if (_subjectTotals is EqualUnmodifiableMapView) return _subjectTotals;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_subjectTotals);
  }

  final List<DailyUsage> _dailyData;
  @override
  List<DailyUsage> get dailyData {
    if (_dailyData is EqualUnmodifiableListView) return _dailyData;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_dailyData);
  }

  @override
  final double engagementTrend;

  @override
  String toString() {
    return 'UsageSummary(childId: $childId, startDate: $startDate, endDate: $endDate, totalMinutes: $totalMinutes, averageDailyMinutes: $averageDailyMinutes, totalLessons: $totalLessons, subjectTotals: $subjectTotals, dailyData: $dailyData, engagementTrend: $engagementTrend)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$UsageSummaryImpl &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.startDate, startDate) ||
                other.startDate == startDate) &&
            (identical(other.endDate, endDate) || other.endDate == endDate) &&
            (identical(other.totalMinutes, totalMinutes) ||
                other.totalMinutes == totalMinutes) &&
            (identical(other.averageDailyMinutes, averageDailyMinutes) ||
                other.averageDailyMinutes == averageDailyMinutes) &&
            (identical(other.totalLessons, totalLessons) ||
                other.totalLessons == totalLessons) &&
            const DeepCollectionEquality()
                .equals(other._subjectTotals, _subjectTotals) &&
            const DeepCollectionEquality()
                .equals(other._dailyData, _dailyData) &&
            (identical(other.engagementTrend, engagementTrend) ||
                other.engagementTrend == engagementTrend));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      childId,
      startDate,
      endDate,
      totalMinutes,
      averageDailyMinutes,
      totalLessons,
      const DeepCollectionEquality().hash(_subjectTotals),
      const DeepCollectionEquality().hash(_dailyData),
      engagementTrend);

  /// Create a copy of UsageSummary
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$UsageSummaryImplCopyWith<_$UsageSummaryImpl> get copyWith =>
      __$$UsageSummaryImplCopyWithImpl<_$UsageSummaryImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$UsageSummaryImplToJson(
      this,
    );
  }
}

abstract class _UsageSummary implements UsageSummary {
  const factory _UsageSummary(
      {required final String childId,
      required final DateTime startDate,
      required final DateTime endDate,
      required final int totalMinutes,
      required final int averageDailyMinutes,
      required final int totalLessons,
      required final Map<String, int> subjectTotals,
      required final List<DailyUsage> dailyData,
      required final double engagementTrend}) = _$UsageSummaryImpl;

  factory _UsageSummary.fromJson(Map<String, dynamic> json) =
      _$UsageSummaryImpl.fromJson;

  @override
  String get childId;
  @override
  DateTime get startDate;
  @override
  DateTime get endDate;
  @override
  int get totalMinutes;
  @override
  int get averageDailyMinutes;
  @override
  int get totalLessons;
  @override
  Map<String, int> get subjectTotals;
  @override
  List<DailyUsage> get dailyData;
  @override
  double get engagementTrend;

  /// Create a copy of UsageSummary
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$UsageSummaryImplCopyWith<_$UsageSummaryImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ScreenTimeSettings _$ScreenTimeSettingsFromJson(Map<String, dynamic> json) {
  return _ScreenTimeSettings.fromJson(json);
}

/// @nodoc
mixin _$ScreenTimeSettings {
  String get childId => throw _privateConstructorUsedError;
  bool get isEnabled => throw _privateConstructorUsedError;
  int get dailyLimitMinutes => throw _privateConstructorUsedError;
  int get sessionLimitMinutes => throw _privateConstructorUsedError;
  int get breakDurationMinutes => throw _privateConstructorUsedError;
  bool get enforceBreaks => throw _privateConstructorUsedError;
  List<ScreenTimeSchedule> get schedules => throw _privateConstructorUsedError;
  bool get notifyOnLimitReached => throw _privateConstructorUsedError;
  bool get notifyOnBreakTime => throw _privateConstructorUsedError;
  int get warningMinutesBefore => throw _privateConstructorUsedError;
  List<String> get allowedExtensions => throw _privateConstructorUsedError;

  /// Serializes this ScreenTimeSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ScreenTimeSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ScreenTimeSettingsCopyWith<ScreenTimeSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ScreenTimeSettingsCopyWith<$Res> {
  factory $ScreenTimeSettingsCopyWith(
          ScreenTimeSettings value, $Res Function(ScreenTimeSettings) then) =
      _$ScreenTimeSettingsCopyWithImpl<$Res, ScreenTimeSettings>;
  @useResult
  $Res call(
      {String childId,
      bool isEnabled,
      int dailyLimitMinutes,
      int sessionLimitMinutes,
      int breakDurationMinutes,
      bool enforceBreaks,
      List<ScreenTimeSchedule> schedules,
      bool notifyOnLimitReached,
      bool notifyOnBreakTime,
      int warningMinutesBefore,
      List<String> allowedExtensions});
}

/// @nodoc
class _$ScreenTimeSettingsCopyWithImpl<$Res, $Val extends ScreenTimeSettings>
    implements $ScreenTimeSettingsCopyWith<$Res> {
  _$ScreenTimeSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ScreenTimeSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? isEnabled = null,
    Object? dailyLimitMinutes = null,
    Object? sessionLimitMinutes = null,
    Object? breakDurationMinutes = null,
    Object? enforceBreaks = null,
    Object? schedules = null,
    Object? notifyOnLimitReached = null,
    Object? notifyOnBreakTime = null,
    Object? warningMinutesBefore = null,
    Object? allowedExtensions = null,
  }) {
    return _then(_value.copyWith(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      isEnabled: null == isEnabled
          ? _value.isEnabled
          : isEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      dailyLimitMinutes: null == dailyLimitMinutes
          ? _value.dailyLimitMinutes
          : dailyLimitMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      sessionLimitMinutes: null == sessionLimitMinutes
          ? _value.sessionLimitMinutes
          : sessionLimitMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      breakDurationMinutes: null == breakDurationMinutes
          ? _value.breakDurationMinutes
          : breakDurationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      enforceBreaks: null == enforceBreaks
          ? _value.enforceBreaks
          : enforceBreaks // ignore: cast_nullable_to_non_nullable
              as bool,
      schedules: null == schedules
          ? _value.schedules
          : schedules // ignore: cast_nullable_to_non_nullable
              as List<ScreenTimeSchedule>,
      notifyOnLimitReached: null == notifyOnLimitReached
          ? _value.notifyOnLimitReached
          : notifyOnLimitReached // ignore: cast_nullable_to_non_nullable
              as bool,
      notifyOnBreakTime: null == notifyOnBreakTime
          ? _value.notifyOnBreakTime
          : notifyOnBreakTime // ignore: cast_nullable_to_non_nullable
              as bool,
      warningMinutesBefore: null == warningMinutesBefore
          ? _value.warningMinutesBefore
          : warningMinutesBefore // ignore: cast_nullable_to_non_nullable
              as int,
      allowedExtensions: null == allowedExtensions
          ? _value.allowedExtensions
          : allowedExtensions // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ScreenTimeSettingsImplCopyWith<$Res>
    implements $ScreenTimeSettingsCopyWith<$Res> {
  factory _$$ScreenTimeSettingsImplCopyWith(_$ScreenTimeSettingsImpl value,
          $Res Function(_$ScreenTimeSettingsImpl) then) =
      __$$ScreenTimeSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String childId,
      bool isEnabled,
      int dailyLimitMinutes,
      int sessionLimitMinutes,
      int breakDurationMinutes,
      bool enforceBreaks,
      List<ScreenTimeSchedule> schedules,
      bool notifyOnLimitReached,
      bool notifyOnBreakTime,
      int warningMinutesBefore,
      List<String> allowedExtensions});
}

/// @nodoc
class __$$ScreenTimeSettingsImplCopyWithImpl<$Res>
    extends _$ScreenTimeSettingsCopyWithImpl<$Res, _$ScreenTimeSettingsImpl>
    implements _$$ScreenTimeSettingsImplCopyWith<$Res> {
  __$$ScreenTimeSettingsImplCopyWithImpl(_$ScreenTimeSettingsImpl _value,
      $Res Function(_$ScreenTimeSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of ScreenTimeSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? isEnabled = null,
    Object? dailyLimitMinutes = null,
    Object? sessionLimitMinutes = null,
    Object? breakDurationMinutes = null,
    Object? enforceBreaks = null,
    Object? schedules = null,
    Object? notifyOnLimitReached = null,
    Object? notifyOnBreakTime = null,
    Object? warningMinutesBefore = null,
    Object? allowedExtensions = null,
  }) {
    return _then(_$ScreenTimeSettingsImpl(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      isEnabled: null == isEnabled
          ? _value.isEnabled
          : isEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      dailyLimitMinutes: null == dailyLimitMinutes
          ? _value.dailyLimitMinutes
          : dailyLimitMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      sessionLimitMinutes: null == sessionLimitMinutes
          ? _value.sessionLimitMinutes
          : sessionLimitMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      breakDurationMinutes: null == breakDurationMinutes
          ? _value.breakDurationMinutes
          : breakDurationMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      enforceBreaks: null == enforceBreaks
          ? _value.enforceBreaks
          : enforceBreaks // ignore: cast_nullable_to_non_nullable
              as bool,
      schedules: null == schedules
          ? _value._schedules
          : schedules // ignore: cast_nullable_to_non_nullable
              as List<ScreenTimeSchedule>,
      notifyOnLimitReached: null == notifyOnLimitReached
          ? _value.notifyOnLimitReached
          : notifyOnLimitReached // ignore: cast_nullable_to_non_nullable
              as bool,
      notifyOnBreakTime: null == notifyOnBreakTime
          ? _value.notifyOnBreakTime
          : notifyOnBreakTime // ignore: cast_nullable_to_non_nullable
              as bool,
      warningMinutesBefore: null == warningMinutesBefore
          ? _value.warningMinutesBefore
          : warningMinutesBefore // ignore: cast_nullable_to_non_nullable
              as int,
      allowedExtensions: null == allowedExtensions
          ? _value._allowedExtensions
          : allowedExtensions // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ScreenTimeSettingsImpl implements _ScreenTimeSettings {
  const _$ScreenTimeSettingsImpl(
      {required this.childId,
      this.isEnabled = true,
      this.dailyLimitMinutes = 120,
      this.sessionLimitMinutes = 30,
      this.breakDurationMinutes = 5,
      this.enforceBreaks = true,
      required final List<ScreenTimeSchedule> schedules,
      this.notifyOnLimitReached = true,
      this.notifyOnBreakTime = true,
      this.warningMinutesBefore = 15,
      final List<String> allowedExtensions = const []})
      : _schedules = schedules,
        _allowedExtensions = allowedExtensions;

  factory _$ScreenTimeSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$ScreenTimeSettingsImplFromJson(json);

  @override
  final String childId;
  @override
  @JsonKey()
  final bool isEnabled;
  @override
  @JsonKey()
  final int dailyLimitMinutes;
  @override
  @JsonKey()
  final int sessionLimitMinutes;
  @override
  @JsonKey()
  final int breakDurationMinutes;
  @override
  @JsonKey()
  final bool enforceBreaks;
  final List<ScreenTimeSchedule> _schedules;
  @override
  List<ScreenTimeSchedule> get schedules {
    if (_schedules is EqualUnmodifiableListView) return _schedules;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_schedules);
  }

  @override
  @JsonKey()
  final bool notifyOnLimitReached;
  @override
  @JsonKey()
  final bool notifyOnBreakTime;
  @override
  @JsonKey()
  final int warningMinutesBefore;
  final List<String> _allowedExtensions;
  @override
  @JsonKey()
  List<String> get allowedExtensions {
    if (_allowedExtensions is EqualUnmodifiableListView)
      return _allowedExtensions;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_allowedExtensions);
  }

  @override
  String toString() {
    return 'ScreenTimeSettings(childId: $childId, isEnabled: $isEnabled, dailyLimitMinutes: $dailyLimitMinutes, sessionLimitMinutes: $sessionLimitMinutes, breakDurationMinutes: $breakDurationMinutes, enforceBreaks: $enforceBreaks, schedules: $schedules, notifyOnLimitReached: $notifyOnLimitReached, notifyOnBreakTime: $notifyOnBreakTime, warningMinutesBefore: $warningMinutesBefore, allowedExtensions: $allowedExtensions)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ScreenTimeSettingsImpl &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.isEnabled, isEnabled) ||
                other.isEnabled == isEnabled) &&
            (identical(other.dailyLimitMinutes, dailyLimitMinutes) ||
                other.dailyLimitMinutes == dailyLimitMinutes) &&
            (identical(other.sessionLimitMinutes, sessionLimitMinutes) ||
                other.sessionLimitMinutes == sessionLimitMinutes) &&
            (identical(other.breakDurationMinutes, breakDurationMinutes) ||
                other.breakDurationMinutes == breakDurationMinutes) &&
            (identical(other.enforceBreaks, enforceBreaks) ||
                other.enforceBreaks == enforceBreaks) &&
            const DeepCollectionEquality()
                .equals(other._schedules, _schedules) &&
            (identical(other.notifyOnLimitReached, notifyOnLimitReached) ||
                other.notifyOnLimitReached == notifyOnLimitReached) &&
            (identical(other.notifyOnBreakTime, notifyOnBreakTime) ||
                other.notifyOnBreakTime == notifyOnBreakTime) &&
            (identical(other.warningMinutesBefore, warningMinutesBefore) ||
                other.warningMinutesBefore == warningMinutesBefore) &&
            const DeepCollectionEquality()
                .equals(other._allowedExtensions, _allowedExtensions));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      childId,
      isEnabled,
      dailyLimitMinutes,
      sessionLimitMinutes,
      breakDurationMinutes,
      enforceBreaks,
      const DeepCollectionEquality().hash(_schedules),
      notifyOnLimitReached,
      notifyOnBreakTime,
      warningMinutesBefore,
      const DeepCollectionEquality().hash(_allowedExtensions));

  /// Create a copy of ScreenTimeSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ScreenTimeSettingsImplCopyWith<_$ScreenTimeSettingsImpl> get copyWith =>
      __$$ScreenTimeSettingsImplCopyWithImpl<_$ScreenTimeSettingsImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ScreenTimeSettingsImplToJson(
      this,
    );
  }
}

abstract class _ScreenTimeSettings implements ScreenTimeSettings {
  const factory _ScreenTimeSettings(
      {required final String childId,
      final bool isEnabled,
      final int dailyLimitMinutes,
      final int sessionLimitMinutes,
      final int breakDurationMinutes,
      final bool enforceBreaks,
      required final List<ScreenTimeSchedule> schedules,
      final bool notifyOnLimitReached,
      final bool notifyOnBreakTime,
      final int warningMinutesBefore,
      final List<String> allowedExtensions}) = _$ScreenTimeSettingsImpl;

  factory _ScreenTimeSettings.fromJson(Map<String, dynamic> json) =
      _$ScreenTimeSettingsImpl.fromJson;

  @override
  String get childId;
  @override
  bool get isEnabled;
  @override
  int get dailyLimitMinutes;
  @override
  int get sessionLimitMinutes;
  @override
  int get breakDurationMinutes;
  @override
  bool get enforceBreaks;
  @override
  List<ScreenTimeSchedule> get schedules;
  @override
  bool get notifyOnLimitReached;
  @override
  bool get notifyOnBreakTime;
  @override
  int get warningMinutesBefore;
  @override
  List<String> get allowedExtensions;

  /// Create a copy of ScreenTimeSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ScreenTimeSettingsImplCopyWith<_$ScreenTimeSettingsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ScreenTimeSchedule _$ScreenTimeScheduleFromJson(Map<String, dynamic> json) {
  return _ScreenTimeSchedule.fromJson(json);
}

/// @nodoc
mixin _$ScreenTimeSchedule {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  List<String> get daysOfWeek => throw _privateConstructorUsedError;
  String get startTime => throw _privateConstructorUsedError;
  String get endTime => throw _privateConstructorUsedError;
  bool get isActive => throw _privateConstructorUsedError;

  /// Serializes this ScreenTimeSchedule to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ScreenTimeSchedule
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ScreenTimeScheduleCopyWith<ScreenTimeSchedule> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ScreenTimeScheduleCopyWith<$Res> {
  factory $ScreenTimeScheduleCopyWith(
          ScreenTimeSchedule value, $Res Function(ScreenTimeSchedule) then) =
      _$ScreenTimeScheduleCopyWithImpl<$Res, ScreenTimeSchedule>;
  @useResult
  $Res call(
      {String id,
      String name,
      List<String> daysOfWeek,
      String startTime,
      String endTime,
      bool isActive});
}

/// @nodoc
class _$ScreenTimeScheduleCopyWithImpl<$Res, $Val extends ScreenTimeSchedule>
    implements $ScreenTimeScheduleCopyWith<$Res> {
  _$ScreenTimeScheduleCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ScreenTimeSchedule
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? daysOfWeek = null,
    Object? startTime = null,
    Object? endTime = null,
    Object? isActive = null,
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
      daysOfWeek: null == daysOfWeek
          ? _value.daysOfWeek
          : daysOfWeek // ignore: cast_nullable_to_non_nullable
              as List<String>,
      startTime: null == startTime
          ? _value.startTime
          : startTime // ignore: cast_nullable_to_non_nullable
              as String,
      endTime: null == endTime
          ? _value.endTime
          : endTime // ignore: cast_nullable_to_non_nullable
              as String,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ScreenTimeScheduleImplCopyWith<$Res>
    implements $ScreenTimeScheduleCopyWith<$Res> {
  factory _$$ScreenTimeScheduleImplCopyWith(_$ScreenTimeScheduleImpl value,
          $Res Function(_$ScreenTimeScheduleImpl) then) =
      __$$ScreenTimeScheduleImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      List<String> daysOfWeek,
      String startTime,
      String endTime,
      bool isActive});
}

/// @nodoc
class __$$ScreenTimeScheduleImplCopyWithImpl<$Res>
    extends _$ScreenTimeScheduleCopyWithImpl<$Res, _$ScreenTimeScheduleImpl>
    implements _$$ScreenTimeScheduleImplCopyWith<$Res> {
  __$$ScreenTimeScheduleImplCopyWithImpl(_$ScreenTimeScheduleImpl _value,
      $Res Function(_$ScreenTimeScheduleImpl) _then)
      : super(_value, _then);

  /// Create a copy of ScreenTimeSchedule
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? daysOfWeek = null,
    Object? startTime = null,
    Object? endTime = null,
    Object? isActive = null,
  }) {
    return _then(_$ScreenTimeScheduleImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      daysOfWeek: null == daysOfWeek
          ? _value._daysOfWeek
          : daysOfWeek // ignore: cast_nullable_to_non_nullable
              as List<String>,
      startTime: null == startTime
          ? _value.startTime
          : startTime // ignore: cast_nullable_to_non_nullable
              as String,
      endTime: null == endTime
          ? _value.endTime
          : endTime // ignore: cast_nullable_to_non_nullable
              as String,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ScreenTimeScheduleImpl implements _ScreenTimeSchedule {
  const _$ScreenTimeScheduleImpl(
      {required this.id,
      required this.name,
      required final List<String> daysOfWeek,
      required this.startTime,
      required this.endTime,
      this.isActive = true})
      : _daysOfWeek = daysOfWeek;

  factory _$ScreenTimeScheduleImpl.fromJson(Map<String, dynamic> json) =>
      _$$ScreenTimeScheduleImplFromJson(json);

  @override
  final String id;
  @override
  final String name;
  final List<String> _daysOfWeek;
  @override
  List<String> get daysOfWeek {
    if (_daysOfWeek is EqualUnmodifiableListView) return _daysOfWeek;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_daysOfWeek);
  }

  @override
  final String startTime;
  @override
  final String endTime;
  @override
  @JsonKey()
  final bool isActive;

  @override
  String toString() {
    return 'ScreenTimeSchedule(id: $id, name: $name, daysOfWeek: $daysOfWeek, startTime: $startTime, endTime: $endTime, isActive: $isActive)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ScreenTimeScheduleImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            const DeepCollectionEquality()
                .equals(other._daysOfWeek, _daysOfWeek) &&
            (identical(other.startTime, startTime) ||
                other.startTime == startTime) &&
            (identical(other.endTime, endTime) || other.endTime == endTime) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      name,
      const DeepCollectionEquality().hash(_daysOfWeek),
      startTime,
      endTime,
      isActive);

  /// Create a copy of ScreenTimeSchedule
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ScreenTimeScheduleImplCopyWith<_$ScreenTimeScheduleImpl> get copyWith =>
      __$$ScreenTimeScheduleImplCopyWithImpl<_$ScreenTimeScheduleImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ScreenTimeScheduleImplToJson(
      this,
    );
  }
}

abstract class _ScreenTimeSchedule implements ScreenTimeSchedule {
  const factory _ScreenTimeSchedule(
      {required final String id,
      required final String name,
      required final List<String> daysOfWeek,
      required final String startTime,
      required final String endTime,
      final bool isActive}) = _$ScreenTimeScheduleImpl;

  factory _ScreenTimeSchedule.fromJson(Map<String, dynamic> json) =
      _$ScreenTimeScheduleImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  List<String> get daysOfWeek;
  @override
  String get startTime;
  @override
  String get endTime;
  @override
  bool get isActive;

  /// Create a copy of ScreenTimeSchedule
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ScreenTimeScheduleImplCopyWith<_$ScreenTimeScheduleImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ScreenTimeStatus _$ScreenTimeStatusFromJson(Map<String, dynamic> json) {
  return _ScreenTimeStatus.fromJson(json);
}

/// @nodoc
mixin _$ScreenTimeStatus {
  String get childId => throw _privateConstructorUsedError;
  bool get isWithinSchedule => throw _privateConstructorUsedError;
  int get usedMinutesToday => throw _privateConstructorUsedError;
  int get remainingMinutes => throw _privateConstructorUsedError;
  int get currentSessionMinutes => throw _privateConstructorUsedError;
  DateTime? get nextBreakTime => throw _privateConstructorUsedError;
  bool get isOnBreak => throw _privateConstructorUsedError;
  ScreenTimeStatusLevel get level => throw _privateConstructorUsedError;

  /// Serializes this ScreenTimeStatus to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ScreenTimeStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ScreenTimeStatusCopyWith<ScreenTimeStatus> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ScreenTimeStatusCopyWith<$Res> {
  factory $ScreenTimeStatusCopyWith(
          ScreenTimeStatus value, $Res Function(ScreenTimeStatus) then) =
      _$ScreenTimeStatusCopyWithImpl<$Res, ScreenTimeStatus>;
  @useResult
  $Res call(
      {String childId,
      bool isWithinSchedule,
      int usedMinutesToday,
      int remainingMinutes,
      int currentSessionMinutes,
      DateTime? nextBreakTime,
      bool isOnBreak,
      ScreenTimeStatusLevel level});
}

/// @nodoc
class _$ScreenTimeStatusCopyWithImpl<$Res, $Val extends ScreenTimeStatus>
    implements $ScreenTimeStatusCopyWith<$Res> {
  _$ScreenTimeStatusCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ScreenTimeStatus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? isWithinSchedule = null,
    Object? usedMinutesToday = null,
    Object? remainingMinutes = null,
    Object? currentSessionMinutes = null,
    Object? nextBreakTime = freezed,
    Object? isOnBreak = null,
    Object? level = null,
  }) {
    return _then(_value.copyWith(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      isWithinSchedule: null == isWithinSchedule
          ? _value.isWithinSchedule
          : isWithinSchedule // ignore: cast_nullable_to_non_nullable
              as bool,
      usedMinutesToday: null == usedMinutesToday
          ? _value.usedMinutesToday
          : usedMinutesToday // ignore: cast_nullable_to_non_nullable
              as int,
      remainingMinutes: null == remainingMinutes
          ? _value.remainingMinutes
          : remainingMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      currentSessionMinutes: null == currentSessionMinutes
          ? _value.currentSessionMinutes
          : currentSessionMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      nextBreakTime: freezed == nextBreakTime
          ? _value.nextBreakTime
          : nextBreakTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      isOnBreak: null == isOnBreak
          ? _value.isOnBreak
          : isOnBreak // ignore: cast_nullable_to_non_nullable
              as bool,
      level: null == level
          ? _value.level
          : level // ignore: cast_nullable_to_non_nullable
              as ScreenTimeStatusLevel,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ScreenTimeStatusImplCopyWith<$Res>
    implements $ScreenTimeStatusCopyWith<$Res> {
  factory _$$ScreenTimeStatusImplCopyWith(_$ScreenTimeStatusImpl value,
          $Res Function(_$ScreenTimeStatusImpl) then) =
      __$$ScreenTimeStatusImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String childId,
      bool isWithinSchedule,
      int usedMinutesToday,
      int remainingMinutes,
      int currentSessionMinutes,
      DateTime? nextBreakTime,
      bool isOnBreak,
      ScreenTimeStatusLevel level});
}

/// @nodoc
class __$$ScreenTimeStatusImplCopyWithImpl<$Res>
    extends _$ScreenTimeStatusCopyWithImpl<$Res, _$ScreenTimeStatusImpl>
    implements _$$ScreenTimeStatusImplCopyWith<$Res> {
  __$$ScreenTimeStatusImplCopyWithImpl(_$ScreenTimeStatusImpl _value,
      $Res Function(_$ScreenTimeStatusImpl) _then)
      : super(_value, _then);

  /// Create a copy of ScreenTimeStatus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? isWithinSchedule = null,
    Object? usedMinutesToday = null,
    Object? remainingMinutes = null,
    Object? currentSessionMinutes = null,
    Object? nextBreakTime = freezed,
    Object? isOnBreak = null,
    Object? level = null,
  }) {
    return _then(_$ScreenTimeStatusImpl(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      isWithinSchedule: null == isWithinSchedule
          ? _value.isWithinSchedule
          : isWithinSchedule // ignore: cast_nullable_to_non_nullable
              as bool,
      usedMinutesToday: null == usedMinutesToday
          ? _value.usedMinutesToday
          : usedMinutesToday // ignore: cast_nullable_to_non_nullable
              as int,
      remainingMinutes: null == remainingMinutes
          ? _value.remainingMinutes
          : remainingMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      currentSessionMinutes: null == currentSessionMinutes
          ? _value.currentSessionMinutes
          : currentSessionMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      nextBreakTime: freezed == nextBreakTime
          ? _value.nextBreakTime
          : nextBreakTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      isOnBreak: null == isOnBreak
          ? _value.isOnBreak
          : isOnBreak // ignore: cast_nullable_to_non_nullable
              as bool,
      level: null == level
          ? _value.level
          : level // ignore: cast_nullable_to_non_nullable
              as ScreenTimeStatusLevel,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ScreenTimeStatusImpl implements _ScreenTimeStatus {
  const _$ScreenTimeStatusImpl(
      {required this.childId,
      required this.isWithinSchedule,
      required this.usedMinutesToday,
      required this.remainingMinutes,
      required this.currentSessionMinutes,
      required this.nextBreakTime,
      required this.isOnBreak,
      required this.level});

  factory _$ScreenTimeStatusImpl.fromJson(Map<String, dynamic> json) =>
      _$$ScreenTimeStatusImplFromJson(json);

  @override
  final String childId;
  @override
  final bool isWithinSchedule;
  @override
  final int usedMinutesToday;
  @override
  final int remainingMinutes;
  @override
  final int currentSessionMinutes;
  @override
  final DateTime? nextBreakTime;
  @override
  final bool isOnBreak;
  @override
  final ScreenTimeStatusLevel level;

  @override
  String toString() {
    return 'ScreenTimeStatus(childId: $childId, isWithinSchedule: $isWithinSchedule, usedMinutesToday: $usedMinutesToday, remainingMinutes: $remainingMinutes, currentSessionMinutes: $currentSessionMinutes, nextBreakTime: $nextBreakTime, isOnBreak: $isOnBreak, level: $level)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ScreenTimeStatusImpl &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.isWithinSchedule, isWithinSchedule) ||
                other.isWithinSchedule == isWithinSchedule) &&
            (identical(other.usedMinutesToday, usedMinutesToday) ||
                other.usedMinutesToday == usedMinutesToday) &&
            (identical(other.remainingMinutes, remainingMinutes) ||
                other.remainingMinutes == remainingMinutes) &&
            (identical(other.currentSessionMinutes, currentSessionMinutes) ||
                other.currentSessionMinutes == currentSessionMinutes) &&
            (identical(other.nextBreakTime, nextBreakTime) ||
                other.nextBreakTime == nextBreakTime) &&
            (identical(other.isOnBreak, isOnBreak) ||
                other.isOnBreak == isOnBreak) &&
            (identical(other.level, level) || other.level == level));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      childId,
      isWithinSchedule,
      usedMinutesToday,
      remainingMinutes,
      currentSessionMinutes,
      nextBreakTime,
      isOnBreak,
      level);

  /// Create a copy of ScreenTimeStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ScreenTimeStatusImplCopyWith<_$ScreenTimeStatusImpl> get copyWith =>
      __$$ScreenTimeStatusImplCopyWithImpl<_$ScreenTimeStatusImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ScreenTimeStatusImplToJson(
      this,
    );
  }
}

abstract class _ScreenTimeStatus implements ScreenTimeStatus {
  const factory _ScreenTimeStatus(
      {required final String childId,
      required final bool isWithinSchedule,
      required final int usedMinutesToday,
      required final int remainingMinutes,
      required final int currentSessionMinutes,
      required final DateTime? nextBreakTime,
      required final bool isOnBreak,
      required final ScreenTimeStatusLevel level}) = _$ScreenTimeStatusImpl;

  factory _ScreenTimeStatus.fromJson(Map<String, dynamic> json) =
      _$ScreenTimeStatusImpl.fromJson;

  @override
  String get childId;
  @override
  bool get isWithinSchedule;
  @override
  int get usedMinutesToday;
  @override
  int get remainingMinutes;
  @override
  int get currentSessionMinutes;
  @override
  DateTime? get nextBreakTime;
  @override
  bool get isOnBreak;
  @override
  ScreenTimeStatusLevel get level;

  /// Create a copy of ScreenTimeStatus
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ScreenTimeStatusImplCopyWith<_$ScreenTimeStatusImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

EngagementMilestone _$EngagementMilestoneFromJson(Map<String, dynamic> json) {
  return _EngagementMilestone.fromJson(json);
}

/// @nodoc
mixin _$EngagementMilestone {
  String get id => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  MilestoneType get type => throw _privateConstructorUsedError;
  int get requirement => throw _privateConstructorUsedError;
  int get progress => throw _privateConstructorUsedError;
  bool get isAchieved => throw _privateConstructorUsedError;
  DateTime? get achievedAt => throw _privateConstructorUsedError;
  String? get iconUrl => throw _privateConstructorUsedError;
  String? get rewardDescription => throw _privateConstructorUsedError;

  /// Serializes this EngagementMilestone to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of EngagementMilestone
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $EngagementMilestoneCopyWith<EngagementMilestone> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $EngagementMilestoneCopyWith<$Res> {
  factory $EngagementMilestoneCopyWith(
          EngagementMilestone value, $Res Function(EngagementMilestone) then) =
      _$EngagementMilestoneCopyWithImpl<$Res, EngagementMilestone>;
  @useResult
  $Res call(
      {String id,
      String title,
      String description,
      MilestoneType type,
      int requirement,
      int progress,
      bool isAchieved,
      DateTime? achievedAt,
      String? iconUrl,
      String? rewardDescription});
}

/// @nodoc
class _$EngagementMilestoneCopyWithImpl<$Res, $Val extends EngagementMilestone>
    implements $EngagementMilestoneCopyWith<$Res> {
  _$EngagementMilestoneCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of EngagementMilestone
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? description = null,
    Object? type = null,
    Object? requirement = null,
    Object? progress = null,
    Object? isAchieved = null,
    Object? achievedAt = freezed,
    Object? iconUrl = freezed,
    Object? rewardDescription = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as MilestoneType,
      requirement: null == requirement
          ? _value.requirement
          : requirement // ignore: cast_nullable_to_non_nullable
              as int,
      progress: null == progress
          ? _value.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as int,
      isAchieved: null == isAchieved
          ? _value.isAchieved
          : isAchieved // ignore: cast_nullable_to_non_nullable
              as bool,
      achievedAt: freezed == achievedAt
          ? _value.achievedAt
          : achievedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      iconUrl: freezed == iconUrl
          ? _value.iconUrl
          : iconUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      rewardDescription: freezed == rewardDescription
          ? _value.rewardDescription
          : rewardDescription // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$EngagementMilestoneImplCopyWith<$Res>
    implements $EngagementMilestoneCopyWith<$Res> {
  factory _$$EngagementMilestoneImplCopyWith(_$EngagementMilestoneImpl value,
          $Res Function(_$EngagementMilestoneImpl) then) =
      __$$EngagementMilestoneImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String title,
      String description,
      MilestoneType type,
      int requirement,
      int progress,
      bool isAchieved,
      DateTime? achievedAt,
      String? iconUrl,
      String? rewardDescription});
}

/// @nodoc
class __$$EngagementMilestoneImplCopyWithImpl<$Res>
    extends _$EngagementMilestoneCopyWithImpl<$Res, _$EngagementMilestoneImpl>
    implements _$$EngagementMilestoneImplCopyWith<$Res> {
  __$$EngagementMilestoneImplCopyWithImpl(_$EngagementMilestoneImpl _value,
      $Res Function(_$EngagementMilestoneImpl) _then)
      : super(_value, _then);

  /// Create a copy of EngagementMilestone
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? description = null,
    Object? type = null,
    Object? requirement = null,
    Object? progress = null,
    Object? isAchieved = null,
    Object? achievedAt = freezed,
    Object? iconUrl = freezed,
    Object? rewardDescription = freezed,
  }) {
    return _then(_$EngagementMilestoneImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as MilestoneType,
      requirement: null == requirement
          ? _value.requirement
          : requirement // ignore: cast_nullable_to_non_nullable
              as int,
      progress: null == progress
          ? _value.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as int,
      isAchieved: null == isAchieved
          ? _value.isAchieved
          : isAchieved // ignore: cast_nullable_to_non_nullable
              as bool,
      achievedAt: freezed == achievedAt
          ? _value.achievedAt
          : achievedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      iconUrl: freezed == iconUrl
          ? _value.iconUrl
          : iconUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      rewardDescription: freezed == rewardDescription
          ? _value.rewardDescription
          : rewardDescription // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$EngagementMilestoneImpl implements _EngagementMilestone {
  const _$EngagementMilestoneImpl(
      {required this.id,
      required this.title,
      required this.description,
      required this.type,
      required this.requirement,
      required this.progress,
      required this.isAchieved,
      required this.achievedAt,
      this.iconUrl,
      this.rewardDescription});

  factory _$EngagementMilestoneImpl.fromJson(Map<String, dynamic> json) =>
      _$$EngagementMilestoneImplFromJson(json);

  @override
  final String id;
  @override
  final String title;
  @override
  final String description;
  @override
  final MilestoneType type;
  @override
  final int requirement;
  @override
  final int progress;
  @override
  final bool isAchieved;
  @override
  final DateTime? achievedAt;
  @override
  final String? iconUrl;
  @override
  final String? rewardDescription;

  @override
  String toString() {
    return 'EngagementMilestone(id: $id, title: $title, description: $description, type: $type, requirement: $requirement, progress: $progress, isAchieved: $isAchieved, achievedAt: $achievedAt, iconUrl: $iconUrl, rewardDescription: $rewardDescription)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$EngagementMilestoneImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.requirement, requirement) ||
                other.requirement == requirement) &&
            (identical(other.progress, progress) ||
                other.progress == progress) &&
            (identical(other.isAchieved, isAchieved) ||
                other.isAchieved == isAchieved) &&
            (identical(other.achievedAt, achievedAt) ||
                other.achievedAt == achievedAt) &&
            (identical(other.iconUrl, iconUrl) || other.iconUrl == iconUrl) &&
            (identical(other.rewardDescription, rewardDescription) ||
                other.rewardDescription == rewardDescription));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      title,
      description,
      type,
      requirement,
      progress,
      isAchieved,
      achievedAt,
      iconUrl,
      rewardDescription);

  /// Create a copy of EngagementMilestone
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$EngagementMilestoneImplCopyWith<_$EngagementMilestoneImpl> get copyWith =>
      __$$EngagementMilestoneImplCopyWithImpl<_$EngagementMilestoneImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$EngagementMilestoneImplToJson(
      this,
    );
  }
}

abstract class _EngagementMilestone implements EngagementMilestone {
  const factory _EngagementMilestone(
      {required final String id,
      required final String title,
      required final String description,
      required final MilestoneType type,
      required final int requirement,
      required final int progress,
      required final bool isAchieved,
      required final DateTime? achievedAt,
      final String? iconUrl,
      final String? rewardDescription}) = _$EngagementMilestoneImpl;

  factory _EngagementMilestone.fromJson(Map<String, dynamic> json) =
      _$EngagementMilestoneImpl.fromJson;

  @override
  String get id;
  @override
  String get title;
  @override
  String get description;
  @override
  MilestoneType get type;
  @override
  int get requirement;
  @override
  int get progress;
  @override
  bool get isAchieved;
  @override
  DateTime? get achievedAt;
  @override
  String? get iconUrl;
  @override
  String? get rewardDescription;

  /// Create a copy of EngagementMilestone
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$EngagementMilestoneImplCopyWith<_$EngagementMilestoneImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

WeeklyEngagementReport _$WeeklyEngagementReportFromJson(
    Map<String, dynamic> json) {
  return _WeeklyEngagementReport.fromJson(json);
}

/// @nodoc
mixin _$WeeklyEngagementReport {
  String get childId => throw _privateConstructorUsedError;
  DateTime get weekStartDate => throw _privateConstructorUsedError;
  int get totalMinutes => throw _privateConstructorUsedError;
  int get daysActive => throw _privateConstructorUsedError;
  int get lessonsCompleted => throw _privateConstructorUsedError;
  double get averageEngagement => throw _privateConstructorUsedError;
  String get topSubject => throw _privateConstructorUsedError;
  List<EngagementMilestone> get newMilestones =>
      throw _privateConstructorUsedError;
  String get summary => throw _privateConstructorUsedError;
  List<String> get insights => throw _privateConstructorUsedError;

  /// Serializes this WeeklyEngagementReport to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of WeeklyEngagementReport
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $WeeklyEngagementReportCopyWith<WeeklyEngagementReport> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $WeeklyEngagementReportCopyWith<$Res> {
  factory $WeeklyEngagementReportCopyWith(WeeklyEngagementReport value,
          $Res Function(WeeklyEngagementReport) then) =
      _$WeeklyEngagementReportCopyWithImpl<$Res, WeeklyEngagementReport>;
  @useResult
  $Res call(
      {String childId,
      DateTime weekStartDate,
      int totalMinutes,
      int daysActive,
      int lessonsCompleted,
      double averageEngagement,
      String topSubject,
      List<EngagementMilestone> newMilestones,
      String summary,
      List<String> insights});
}

/// @nodoc
class _$WeeklyEngagementReportCopyWithImpl<$Res,
        $Val extends WeeklyEngagementReport>
    implements $WeeklyEngagementReportCopyWith<$Res> {
  _$WeeklyEngagementReportCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of WeeklyEngagementReport
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? weekStartDate = null,
    Object? totalMinutes = null,
    Object? daysActive = null,
    Object? lessonsCompleted = null,
    Object? averageEngagement = null,
    Object? topSubject = null,
    Object? newMilestones = null,
    Object? summary = null,
    Object? insights = null,
  }) {
    return _then(_value.copyWith(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      weekStartDate: null == weekStartDate
          ? _value.weekStartDate
          : weekStartDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      totalMinutes: null == totalMinutes
          ? _value.totalMinutes
          : totalMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      daysActive: null == daysActive
          ? _value.daysActive
          : daysActive // ignore: cast_nullable_to_non_nullable
              as int,
      lessonsCompleted: null == lessonsCompleted
          ? _value.lessonsCompleted
          : lessonsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      averageEngagement: null == averageEngagement
          ? _value.averageEngagement
          : averageEngagement // ignore: cast_nullable_to_non_nullable
              as double,
      topSubject: null == topSubject
          ? _value.topSubject
          : topSubject // ignore: cast_nullable_to_non_nullable
              as String,
      newMilestones: null == newMilestones
          ? _value.newMilestones
          : newMilestones // ignore: cast_nullable_to_non_nullable
              as List<EngagementMilestone>,
      summary: null == summary
          ? _value.summary
          : summary // ignore: cast_nullable_to_non_nullable
              as String,
      insights: null == insights
          ? _value.insights
          : insights // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$WeeklyEngagementReportImplCopyWith<$Res>
    implements $WeeklyEngagementReportCopyWith<$Res> {
  factory _$$WeeklyEngagementReportImplCopyWith(
          _$WeeklyEngagementReportImpl value,
          $Res Function(_$WeeklyEngagementReportImpl) then) =
      __$$WeeklyEngagementReportImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String childId,
      DateTime weekStartDate,
      int totalMinutes,
      int daysActive,
      int lessonsCompleted,
      double averageEngagement,
      String topSubject,
      List<EngagementMilestone> newMilestones,
      String summary,
      List<String> insights});
}

/// @nodoc
class __$$WeeklyEngagementReportImplCopyWithImpl<$Res>
    extends _$WeeklyEngagementReportCopyWithImpl<$Res,
        _$WeeklyEngagementReportImpl>
    implements _$$WeeklyEngagementReportImplCopyWith<$Res> {
  __$$WeeklyEngagementReportImplCopyWithImpl(
      _$WeeklyEngagementReportImpl _value,
      $Res Function(_$WeeklyEngagementReportImpl) _then)
      : super(_value, _then);

  /// Create a copy of WeeklyEngagementReport
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? weekStartDate = null,
    Object? totalMinutes = null,
    Object? daysActive = null,
    Object? lessonsCompleted = null,
    Object? averageEngagement = null,
    Object? topSubject = null,
    Object? newMilestones = null,
    Object? summary = null,
    Object? insights = null,
  }) {
    return _then(_$WeeklyEngagementReportImpl(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      weekStartDate: null == weekStartDate
          ? _value.weekStartDate
          : weekStartDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      totalMinutes: null == totalMinutes
          ? _value.totalMinutes
          : totalMinutes // ignore: cast_nullable_to_non_nullable
              as int,
      daysActive: null == daysActive
          ? _value.daysActive
          : daysActive // ignore: cast_nullable_to_non_nullable
              as int,
      lessonsCompleted: null == lessonsCompleted
          ? _value.lessonsCompleted
          : lessonsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      averageEngagement: null == averageEngagement
          ? _value.averageEngagement
          : averageEngagement // ignore: cast_nullable_to_non_nullable
              as double,
      topSubject: null == topSubject
          ? _value.topSubject
          : topSubject // ignore: cast_nullable_to_non_nullable
              as String,
      newMilestones: null == newMilestones
          ? _value._newMilestones
          : newMilestones // ignore: cast_nullable_to_non_nullable
              as List<EngagementMilestone>,
      summary: null == summary
          ? _value.summary
          : summary // ignore: cast_nullable_to_non_nullable
              as String,
      insights: null == insights
          ? _value._insights
          : insights // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$WeeklyEngagementReportImpl implements _WeeklyEngagementReport {
  const _$WeeklyEngagementReportImpl(
      {required this.childId,
      required this.weekStartDate,
      required this.totalMinutes,
      required this.daysActive,
      required this.lessonsCompleted,
      required this.averageEngagement,
      required this.topSubject,
      required final List<EngagementMilestone> newMilestones,
      required this.summary,
      required final List<String> insights})
      : _newMilestones = newMilestones,
        _insights = insights;

  factory _$WeeklyEngagementReportImpl.fromJson(Map<String, dynamic> json) =>
      _$$WeeklyEngagementReportImplFromJson(json);

  @override
  final String childId;
  @override
  final DateTime weekStartDate;
  @override
  final int totalMinutes;
  @override
  final int daysActive;
  @override
  final int lessonsCompleted;
  @override
  final double averageEngagement;
  @override
  final String topSubject;
  final List<EngagementMilestone> _newMilestones;
  @override
  List<EngagementMilestone> get newMilestones {
    if (_newMilestones is EqualUnmodifiableListView) return _newMilestones;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_newMilestones);
  }

  @override
  final String summary;
  final List<String> _insights;
  @override
  List<String> get insights {
    if (_insights is EqualUnmodifiableListView) return _insights;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_insights);
  }

  @override
  String toString() {
    return 'WeeklyEngagementReport(childId: $childId, weekStartDate: $weekStartDate, totalMinutes: $totalMinutes, daysActive: $daysActive, lessonsCompleted: $lessonsCompleted, averageEngagement: $averageEngagement, topSubject: $topSubject, newMilestones: $newMilestones, summary: $summary, insights: $insights)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$WeeklyEngagementReportImpl &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.weekStartDate, weekStartDate) ||
                other.weekStartDate == weekStartDate) &&
            (identical(other.totalMinutes, totalMinutes) ||
                other.totalMinutes == totalMinutes) &&
            (identical(other.daysActive, daysActive) ||
                other.daysActive == daysActive) &&
            (identical(other.lessonsCompleted, lessonsCompleted) ||
                other.lessonsCompleted == lessonsCompleted) &&
            (identical(other.averageEngagement, averageEngagement) ||
                other.averageEngagement == averageEngagement) &&
            (identical(other.topSubject, topSubject) ||
                other.topSubject == topSubject) &&
            const DeepCollectionEquality()
                .equals(other._newMilestones, _newMilestones) &&
            (identical(other.summary, summary) || other.summary == summary) &&
            const DeepCollectionEquality().equals(other._insights, _insights));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      childId,
      weekStartDate,
      totalMinutes,
      daysActive,
      lessonsCompleted,
      averageEngagement,
      topSubject,
      const DeepCollectionEquality().hash(_newMilestones),
      summary,
      const DeepCollectionEquality().hash(_insights));

  /// Create a copy of WeeklyEngagementReport
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$WeeklyEngagementReportImplCopyWith<_$WeeklyEngagementReportImpl>
      get copyWith => __$$WeeklyEngagementReportImplCopyWithImpl<
          _$WeeklyEngagementReportImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$WeeklyEngagementReportImplToJson(
      this,
    );
  }
}

abstract class _WeeklyEngagementReport implements WeeklyEngagementReport {
  const factory _WeeklyEngagementReport(
      {required final String childId,
      required final DateTime weekStartDate,
      required final int totalMinutes,
      required final int daysActive,
      required final int lessonsCompleted,
      required final double averageEngagement,
      required final String topSubject,
      required final List<EngagementMilestone> newMilestones,
      required final String summary,
      required final List<String> insights}) = _$WeeklyEngagementReportImpl;

  factory _WeeklyEngagementReport.fromJson(Map<String, dynamic> json) =
      _$WeeklyEngagementReportImpl.fromJson;

  @override
  String get childId;
  @override
  DateTime get weekStartDate;
  @override
  int get totalMinutes;
  @override
  int get daysActive;
  @override
  int get lessonsCompleted;
  @override
  double get averageEngagement;
  @override
  String get topSubject;
  @override
  List<EngagementMilestone> get newMilestones;
  @override
  String get summary;
  @override
  List<String> get insights;

  /// Create a copy of WeeklyEngagementReport
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$WeeklyEngagementReportImplCopyWith<_$WeeklyEngagementReportImpl>
      get copyWith => throw _privateConstructorUsedError;
}
