// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

EngagementProfile _$EngagementProfileFromJson(Map<String, dynamic> json) {
  return _EngagementProfile.fromJson(json);
}

/// @nodoc
mixin _$EngagementProfile {
  String get id => throw _privateConstructorUsedError;
  String get tenantId => throw _privateConstructorUsedError;
  String get learnerId => throw _privateConstructorUsedError;
  int get level => throw _privateConstructorUsedError;
  int get xpTotal => throw _privateConstructorUsedError;
  int get xpThisWeek => throw _privateConstructorUsedError;
  int get xpToday => throw _privateConstructorUsedError;
  int get currentStreakDays => throw _privateConstructorUsedError;
  int get maxStreakDays => throw _privateConstructorUsedError;
  DateTime? get lastSessionDate => throw _privateConstructorUsedError;
  int get sessionsCompleted => throw _privateConstructorUsedError;
  int get totalMinutesLearned => throw _privateConstructorUsedError;
  RewardStyle get preferredRewardStyle => throw _privateConstructorUsedError;
  bool get muteCelebrations => throw _privateConstructorUsedError;
  bool get reducedVisuals => throw _privateConstructorUsedError;
  bool get showBadges => throw _privateConstructorUsedError;
  bool get showStreaks => throw _privateConstructorUsedError;
  bool get showXp => throw _privateConstructorUsedError; // Computed fields
  int get xpToNextLevel => throw _privateConstructorUsedError;
  int get xpProgress => throw _privateConstructorUsedError;
  int get xpNeeded => throw _privateConstructorUsedError;
  int get progressPercent => throw _privateConstructorUsedError;

  /// Serializes this EngagementProfile to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of EngagementProfile
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $EngagementProfileCopyWith<EngagementProfile> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $EngagementProfileCopyWith<$Res> {
  factory $EngagementProfileCopyWith(
          EngagementProfile value, $Res Function(EngagementProfile) then) =
      _$EngagementProfileCopyWithImpl<$Res, EngagementProfile>;
  @useResult
  $Res call(
      {String id,
      String tenantId,
      String learnerId,
      int level,
      int xpTotal,
      int xpThisWeek,
      int xpToday,
      int currentStreakDays,
      int maxStreakDays,
      DateTime? lastSessionDate,
      int sessionsCompleted,
      int totalMinutesLearned,
      RewardStyle preferredRewardStyle,
      bool muteCelebrations,
      bool reducedVisuals,
      bool showBadges,
      bool showStreaks,
      bool showXp,
      int xpToNextLevel,
      int xpProgress,
      int xpNeeded,
      int progressPercent});
}

/// @nodoc
class _$EngagementProfileCopyWithImpl<$Res, $Val extends EngagementProfile>
    implements $EngagementProfileCopyWith<$Res> {
  _$EngagementProfileCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of EngagementProfile
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? tenantId = null,
    Object? learnerId = null,
    Object? level = null,
    Object? xpTotal = null,
    Object? xpThisWeek = null,
    Object? xpToday = null,
    Object? currentStreakDays = null,
    Object? maxStreakDays = null,
    Object? lastSessionDate = freezed,
    Object? sessionsCompleted = null,
    Object? totalMinutesLearned = null,
    Object? preferredRewardStyle = null,
    Object? muteCelebrations = null,
    Object? reducedVisuals = null,
    Object? showBadges = null,
    Object? showStreaks = null,
    Object? showXp = null,
    Object? xpToNextLevel = null,
    Object? xpProgress = null,
    Object? xpNeeded = null,
    Object? progressPercent = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      tenantId: null == tenantId
          ? _value.tenantId
          : tenantId // ignore: cast_nullable_to_non_nullable
              as String,
      learnerId: null == learnerId
          ? _value.learnerId
          : learnerId // ignore: cast_nullable_to_non_nullable
              as String,
      level: null == level
          ? _value.level
          : level // ignore: cast_nullable_to_non_nullable
              as int,
      xpTotal: null == xpTotal
          ? _value.xpTotal
          : xpTotal // ignore: cast_nullable_to_non_nullable
              as int,
      xpThisWeek: null == xpThisWeek
          ? _value.xpThisWeek
          : xpThisWeek // ignore: cast_nullable_to_non_nullable
              as int,
      xpToday: null == xpToday
          ? _value.xpToday
          : xpToday // ignore: cast_nullable_to_non_nullable
              as int,
      currentStreakDays: null == currentStreakDays
          ? _value.currentStreakDays
          : currentStreakDays // ignore: cast_nullable_to_non_nullable
              as int,
      maxStreakDays: null == maxStreakDays
          ? _value.maxStreakDays
          : maxStreakDays // ignore: cast_nullable_to_non_nullable
              as int,
      lastSessionDate: freezed == lastSessionDate
          ? _value.lastSessionDate
          : lastSessionDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      sessionsCompleted: null == sessionsCompleted
          ? _value.sessionsCompleted
          : sessionsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      totalMinutesLearned: null == totalMinutesLearned
          ? _value.totalMinutesLearned
          : totalMinutesLearned // ignore: cast_nullable_to_non_nullable
              as int,
      preferredRewardStyle: null == preferredRewardStyle
          ? _value.preferredRewardStyle
          : preferredRewardStyle // ignore: cast_nullable_to_non_nullable
              as RewardStyle,
      muteCelebrations: null == muteCelebrations
          ? _value.muteCelebrations
          : muteCelebrations // ignore: cast_nullable_to_non_nullable
              as bool,
      reducedVisuals: null == reducedVisuals
          ? _value.reducedVisuals
          : reducedVisuals // ignore: cast_nullable_to_non_nullable
              as bool,
      showBadges: null == showBadges
          ? _value.showBadges
          : showBadges // ignore: cast_nullable_to_non_nullable
              as bool,
      showStreaks: null == showStreaks
          ? _value.showStreaks
          : showStreaks // ignore: cast_nullable_to_non_nullable
              as bool,
      showXp: null == showXp
          ? _value.showXp
          : showXp // ignore: cast_nullable_to_non_nullable
              as bool,
      xpToNextLevel: null == xpToNextLevel
          ? _value.xpToNextLevel
          : xpToNextLevel // ignore: cast_nullable_to_non_nullable
              as int,
      xpProgress: null == xpProgress
          ? _value.xpProgress
          : xpProgress // ignore: cast_nullable_to_non_nullable
              as int,
      xpNeeded: null == xpNeeded
          ? _value.xpNeeded
          : xpNeeded // ignore: cast_nullable_to_non_nullable
              as int,
      progressPercent: null == progressPercent
          ? _value.progressPercent
          : progressPercent // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$EngagementProfileImplCopyWith<$Res>
    implements $EngagementProfileCopyWith<$Res> {
  factory _$$EngagementProfileImplCopyWith(_$EngagementProfileImpl value,
          $Res Function(_$EngagementProfileImpl) then) =
      __$$EngagementProfileImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String tenantId,
      String learnerId,
      int level,
      int xpTotal,
      int xpThisWeek,
      int xpToday,
      int currentStreakDays,
      int maxStreakDays,
      DateTime? lastSessionDate,
      int sessionsCompleted,
      int totalMinutesLearned,
      RewardStyle preferredRewardStyle,
      bool muteCelebrations,
      bool reducedVisuals,
      bool showBadges,
      bool showStreaks,
      bool showXp,
      int xpToNextLevel,
      int xpProgress,
      int xpNeeded,
      int progressPercent});
}

/// @nodoc
class __$$EngagementProfileImplCopyWithImpl<$Res>
    extends _$EngagementProfileCopyWithImpl<$Res, _$EngagementProfileImpl>
    implements _$$EngagementProfileImplCopyWith<$Res> {
  __$$EngagementProfileImplCopyWithImpl(_$EngagementProfileImpl _value,
      $Res Function(_$EngagementProfileImpl) _then)
      : super(_value, _then);

  /// Create a copy of EngagementProfile
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? tenantId = null,
    Object? learnerId = null,
    Object? level = null,
    Object? xpTotal = null,
    Object? xpThisWeek = null,
    Object? xpToday = null,
    Object? currentStreakDays = null,
    Object? maxStreakDays = null,
    Object? lastSessionDate = freezed,
    Object? sessionsCompleted = null,
    Object? totalMinutesLearned = null,
    Object? preferredRewardStyle = null,
    Object? muteCelebrations = null,
    Object? reducedVisuals = null,
    Object? showBadges = null,
    Object? showStreaks = null,
    Object? showXp = null,
    Object? xpToNextLevel = null,
    Object? xpProgress = null,
    Object? xpNeeded = null,
    Object? progressPercent = null,
  }) {
    return _then(_$EngagementProfileImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      tenantId: null == tenantId
          ? _value.tenantId
          : tenantId // ignore: cast_nullable_to_non_nullable
              as String,
      learnerId: null == learnerId
          ? _value.learnerId
          : learnerId // ignore: cast_nullable_to_non_nullable
              as String,
      level: null == level
          ? _value.level
          : level // ignore: cast_nullable_to_non_nullable
              as int,
      xpTotal: null == xpTotal
          ? _value.xpTotal
          : xpTotal // ignore: cast_nullable_to_non_nullable
              as int,
      xpThisWeek: null == xpThisWeek
          ? _value.xpThisWeek
          : xpThisWeek // ignore: cast_nullable_to_non_nullable
              as int,
      xpToday: null == xpToday
          ? _value.xpToday
          : xpToday // ignore: cast_nullable_to_non_nullable
              as int,
      currentStreakDays: null == currentStreakDays
          ? _value.currentStreakDays
          : currentStreakDays // ignore: cast_nullable_to_non_nullable
              as int,
      maxStreakDays: null == maxStreakDays
          ? _value.maxStreakDays
          : maxStreakDays // ignore: cast_nullable_to_non_nullable
              as int,
      lastSessionDate: freezed == lastSessionDate
          ? _value.lastSessionDate
          : lastSessionDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      sessionsCompleted: null == sessionsCompleted
          ? _value.sessionsCompleted
          : sessionsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      totalMinutesLearned: null == totalMinutesLearned
          ? _value.totalMinutesLearned
          : totalMinutesLearned // ignore: cast_nullable_to_non_nullable
              as int,
      preferredRewardStyle: null == preferredRewardStyle
          ? _value.preferredRewardStyle
          : preferredRewardStyle // ignore: cast_nullable_to_non_nullable
              as RewardStyle,
      muteCelebrations: null == muteCelebrations
          ? _value.muteCelebrations
          : muteCelebrations // ignore: cast_nullable_to_non_nullable
              as bool,
      reducedVisuals: null == reducedVisuals
          ? _value.reducedVisuals
          : reducedVisuals // ignore: cast_nullable_to_non_nullable
              as bool,
      showBadges: null == showBadges
          ? _value.showBadges
          : showBadges // ignore: cast_nullable_to_non_nullable
              as bool,
      showStreaks: null == showStreaks
          ? _value.showStreaks
          : showStreaks // ignore: cast_nullable_to_non_nullable
              as bool,
      showXp: null == showXp
          ? _value.showXp
          : showXp // ignore: cast_nullable_to_non_nullable
              as bool,
      xpToNextLevel: null == xpToNextLevel
          ? _value.xpToNextLevel
          : xpToNextLevel // ignore: cast_nullable_to_non_nullable
              as int,
      xpProgress: null == xpProgress
          ? _value.xpProgress
          : xpProgress // ignore: cast_nullable_to_non_nullable
              as int,
      xpNeeded: null == xpNeeded
          ? _value.xpNeeded
          : xpNeeded // ignore: cast_nullable_to_non_nullable
              as int,
      progressPercent: null == progressPercent
          ? _value.progressPercent
          : progressPercent // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$EngagementProfileImpl implements _EngagementProfile {
  const _$EngagementProfileImpl(
      {required this.id,
      required this.tenantId,
      required this.learnerId,
      required this.level,
      required this.xpTotal,
      required this.xpThisWeek,
      required this.xpToday,
      required this.currentStreakDays,
      required this.maxStreakDays,
      this.lastSessionDate,
      required this.sessionsCompleted,
      required this.totalMinutesLearned,
      required this.preferredRewardStyle,
      required this.muteCelebrations,
      required this.reducedVisuals,
      required this.showBadges,
      required this.showStreaks,
      required this.showXp,
      required this.xpToNextLevel,
      required this.xpProgress,
      required this.xpNeeded,
      required this.progressPercent});

  factory _$EngagementProfileImpl.fromJson(Map<String, dynamic> json) =>
      _$$EngagementProfileImplFromJson(json);

  @override
  final String id;
  @override
  final String tenantId;
  @override
  final String learnerId;
  @override
  final int level;
  @override
  final int xpTotal;
  @override
  final int xpThisWeek;
  @override
  final int xpToday;
  @override
  final int currentStreakDays;
  @override
  final int maxStreakDays;
  @override
  final DateTime? lastSessionDate;
  @override
  final int sessionsCompleted;
  @override
  final int totalMinutesLearned;
  @override
  final RewardStyle preferredRewardStyle;
  @override
  final bool muteCelebrations;
  @override
  final bool reducedVisuals;
  @override
  final bool showBadges;
  @override
  final bool showStreaks;
  @override
  final bool showXp;
// Computed fields
  @override
  final int xpToNextLevel;
  @override
  final int xpProgress;
  @override
  final int xpNeeded;
  @override
  final int progressPercent;

  @override
  String toString() {
    return 'EngagementProfile(id: $id, tenantId: $tenantId, learnerId: $learnerId, level: $level, xpTotal: $xpTotal, xpThisWeek: $xpThisWeek, xpToday: $xpToday, currentStreakDays: $currentStreakDays, maxStreakDays: $maxStreakDays, lastSessionDate: $lastSessionDate, sessionsCompleted: $sessionsCompleted, totalMinutesLearned: $totalMinutesLearned, preferredRewardStyle: $preferredRewardStyle, muteCelebrations: $muteCelebrations, reducedVisuals: $reducedVisuals, showBadges: $showBadges, showStreaks: $showStreaks, showXp: $showXp, xpToNextLevel: $xpToNextLevel, xpProgress: $xpProgress, xpNeeded: $xpNeeded, progressPercent: $progressPercent)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$EngagementProfileImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.tenantId, tenantId) ||
                other.tenantId == tenantId) &&
            (identical(other.learnerId, learnerId) ||
                other.learnerId == learnerId) &&
            (identical(other.level, level) || other.level == level) &&
            (identical(other.xpTotal, xpTotal) || other.xpTotal == xpTotal) &&
            (identical(other.xpThisWeek, xpThisWeek) ||
                other.xpThisWeek == xpThisWeek) &&
            (identical(other.xpToday, xpToday) || other.xpToday == xpToday) &&
            (identical(other.currentStreakDays, currentStreakDays) ||
                other.currentStreakDays == currentStreakDays) &&
            (identical(other.maxStreakDays, maxStreakDays) ||
                other.maxStreakDays == maxStreakDays) &&
            (identical(other.lastSessionDate, lastSessionDate) ||
                other.lastSessionDate == lastSessionDate) &&
            (identical(other.sessionsCompleted, sessionsCompleted) ||
                other.sessionsCompleted == sessionsCompleted) &&
            (identical(other.totalMinutesLearned, totalMinutesLearned) ||
                other.totalMinutesLearned == totalMinutesLearned) &&
            (identical(other.preferredRewardStyle, preferredRewardStyle) ||
                other.preferredRewardStyle == preferredRewardStyle) &&
            (identical(other.muteCelebrations, muteCelebrations) ||
                other.muteCelebrations == muteCelebrations) &&
            (identical(other.reducedVisuals, reducedVisuals) ||
                other.reducedVisuals == reducedVisuals) &&
            (identical(other.showBadges, showBadges) ||
                other.showBadges == showBadges) &&
            (identical(other.showStreaks, showStreaks) ||
                other.showStreaks == showStreaks) &&
            (identical(other.showXp, showXp) || other.showXp == showXp) &&
            (identical(other.xpToNextLevel, xpToNextLevel) ||
                other.xpToNextLevel == xpToNextLevel) &&
            (identical(other.xpProgress, xpProgress) ||
                other.xpProgress == xpProgress) &&
            (identical(other.xpNeeded, xpNeeded) ||
                other.xpNeeded == xpNeeded) &&
            (identical(other.progressPercent, progressPercent) ||
                other.progressPercent == progressPercent));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hashAll([
        runtimeType,
        id,
        tenantId,
        learnerId,
        level,
        xpTotal,
        xpThisWeek,
        xpToday,
        currentStreakDays,
        maxStreakDays,
        lastSessionDate,
        sessionsCompleted,
        totalMinutesLearned,
        preferredRewardStyle,
        muteCelebrations,
        reducedVisuals,
        showBadges,
        showStreaks,
        showXp,
        xpToNextLevel,
        xpProgress,
        xpNeeded,
        progressPercent
      ]);

  /// Create a copy of EngagementProfile
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$EngagementProfileImplCopyWith<_$EngagementProfileImpl> get copyWith =>
      __$$EngagementProfileImplCopyWithImpl<_$EngagementProfileImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$EngagementProfileImplToJson(
      this,
    );
  }
}

abstract class _EngagementProfile implements EngagementProfile {
  const factory _EngagementProfile(
      {required final String id,
      required final String tenantId,
      required final String learnerId,
      required final int level,
      required final int xpTotal,
      required final int xpThisWeek,
      required final int xpToday,
      required final int currentStreakDays,
      required final int maxStreakDays,
      final DateTime? lastSessionDate,
      required final int sessionsCompleted,
      required final int totalMinutesLearned,
      required final RewardStyle preferredRewardStyle,
      required final bool muteCelebrations,
      required final bool reducedVisuals,
      required final bool showBadges,
      required final bool showStreaks,
      required final bool showXp,
      required final int xpToNextLevel,
      required final int xpProgress,
      required final int xpNeeded,
      required final int progressPercent}) = _$EngagementProfileImpl;

  factory _EngagementProfile.fromJson(Map<String, dynamic> json) =
      _$EngagementProfileImpl.fromJson;

  @override
  String get id;
  @override
  String get tenantId;
  @override
  String get learnerId;
  @override
  int get level;
  @override
  int get xpTotal;
  @override
  int get xpThisWeek;
  @override
  int get xpToday;
  @override
  int get currentStreakDays;
  @override
  int get maxStreakDays;
  @override
  DateTime? get lastSessionDate;
  @override
  int get sessionsCompleted;
  @override
  int get totalMinutesLearned;
  @override
  RewardStyle get preferredRewardStyle;
  @override
  bool get muteCelebrations;
  @override
  bool get reducedVisuals;
  @override
  bool get showBadges;
  @override
  bool get showStreaks;
  @override
  bool get showXp; // Computed fields
  @override
  int get xpToNextLevel;
  @override
  int get xpProgress;
  @override
  int get xpNeeded;
  @override
  int get progressPercent;

  /// Create a copy of EngagementProfile
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$EngagementProfileImplCopyWith<_$EngagementProfileImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

Badge _$BadgeFromJson(Map<String, dynamic> json) {
  return _Badge.fromJson(json);
}

/// @nodoc
mixin _$Badge {
  String get code => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  BadgeCategory get category => throw _privateConstructorUsedError;
  String get iconKey => throw _privateConstructorUsedError;
  bool get isSecret => throw _privateConstructorUsedError;

  /// Serializes this Badge to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Badge
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $BadgeCopyWith<Badge> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $BadgeCopyWith<$Res> {
  factory $BadgeCopyWith(Badge value, $Res Function(Badge) then) =
      _$BadgeCopyWithImpl<$Res, Badge>;
  @useResult
  $Res call(
      {String code,
      String name,
      String description,
      BadgeCategory category,
      String iconKey,
      bool isSecret});
}

/// @nodoc
class _$BadgeCopyWithImpl<$Res, $Val extends Badge>
    implements $BadgeCopyWith<$Res> {
  _$BadgeCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Badge
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? code = null,
    Object? name = null,
    Object? description = null,
    Object? category = null,
    Object? iconKey = null,
    Object? isSecret = null,
  }) {
    return _then(_value.copyWith(
      code: null == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as BadgeCategory,
      iconKey: null == iconKey
          ? _value.iconKey
          : iconKey // ignore: cast_nullable_to_non_nullable
              as String,
      isSecret: null == isSecret
          ? _value.isSecret
          : isSecret // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$BadgeImplCopyWith<$Res> implements $BadgeCopyWith<$Res> {
  factory _$$BadgeImplCopyWith(
          _$BadgeImpl value, $Res Function(_$BadgeImpl) then) =
      __$$BadgeImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String code,
      String name,
      String description,
      BadgeCategory category,
      String iconKey,
      bool isSecret});
}

/// @nodoc
class __$$BadgeImplCopyWithImpl<$Res>
    extends _$BadgeCopyWithImpl<$Res, _$BadgeImpl>
    implements _$$BadgeImplCopyWith<$Res> {
  __$$BadgeImplCopyWithImpl(
      _$BadgeImpl _value, $Res Function(_$BadgeImpl) _then)
      : super(_value, _then);

  /// Create a copy of Badge
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? code = null,
    Object? name = null,
    Object? description = null,
    Object? category = null,
    Object? iconKey = null,
    Object? isSecret = null,
  }) {
    return _then(_$BadgeImpl(
      code: null == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as BadgeCategory,
      iconKey: null == iconKey
          ? _value.iconKey
          : iconKey // ignore: cast_nullable_to_non_nullable
              as String,
      isSecret: null == isSecret
          ? _value.isSecret
          : isSecret // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$BadgeImpl implements _Badge {
  const _$BadgeImpl(
      {required this.code,
      required this.name,
      required this.description,
      required this.category,
      required this.iconKey,
      this.isSecret = false});

  factory _$BadgeImpl.fromJson(Map<String, dynamic> json) =>
      _$$BadgeImplFromJson(json);

  @override
  final String code;
  @override
  final String name;
  @override
  final String description;
  @override
  final BadgeCategory category;
  @override
  final String iconKey;
  @override
  @JsonKey()
  final bool isSecret;

  @override
  String toString() {
    return 'Badge(code: $code, name: $name, description: $description, category: $category, iconKey: $iconKey, isSecret: $isSecret)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$BadgeImpl &&
            (identical(other.code, code) || other.code == code) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.category, category) ||
                other.category == category) &&
            (identical(other.iconKey, iconKey) || other.iconKey == iconKey) &&
            (identical(other.isSecret, isSecret) ||
                other.isSecret == isSecret));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, code, name, description, category, iconKey, isSecret);

  /// Create a copy of Badge
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$BadgeImplCopyWith<_$BadgeImpl> get copyWith =>
      __$$BadgeImplCopyWithImpl<_$BadgeImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$BadgeImplToJson(
      this,
    );
  }
}

abstract class _Badge implements Badge {
  const factory _Badge(
      {required final String code,
      required final String name,
      required final String description,
      required final BadgeCategory category,
      required final String iconKey,
      final bool isSecret}) = _$BadgeImpl;

  factory _Badge.fromJson(Map<String, dynamic> json) = _$BadgeImpl.fromJson;

  @override
  String get code;
  @override
  String get name;
  @override
  String get description;
  @override
  BadgeCategory get category;
  @override
  String get iconKey;
  @override
  bool get isSecret;

  /// Create a copy of Badge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$BadgeImplCopyWith<_$BadgeImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

LearnerBadge _$LearnerBadgeFromJson(Map<String, dynamic> json) {
  return _LearnerBadge.fromJson(json);
}

/// @nodoc
mixin _$LearnerBadge {
  String get id => throw _privateConstructorUsedError;
  String get badgeCode => throw _privateConstructorUsedError;
  String get badgeName => throw _privateConstructorUsedError;
  String get badgeDescription => throw _privateConstructorUsedError;
  BadgeCategory get category => throw _privateConstructorUsedError;
  String get iconKey => throw _privateConstructorUsedError;
  DateTime get awardedAt => throw _privateConstructorUsedError;
  DateTime? get firstSeenAt => throw _privateConstructorUsedError;
  String get source => throw _privateConstructorUsedError;
  String? get note => throw _privateConstructorUsedError;

  /// Serializes this LearnerBadge to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of LearnerBadge
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $LearnerBadgeCopyWith<LearnerBadge> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LearnerBadgeCopyWith<$Res> {
  factory $LearnerBadgeCopyWith(
          LearnerBadge value, $Res Function(LearnerBadge) then) =
      _$LearnerBadgeCopyWithImpl<$Res, LearnerBadge>;
  @useResult
  $Res call(
      {String id,
      String badgeCode,
      String badgeName,
      String badgeDescription,
      BadgeCategory category,
      String iconKey,
      DateTime awardedAt,
      DateTime? firstSeenAt,
      String source,
      String? note});
}

/// @nodoc
class _$LearnerBadgeCopyWithImpl<$Res, $Val extends LearnerBadge>
    implements $LearnerBadgeCopyWith<$Res> {
  _$LearnerBadgeCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of LearnerBadge
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? badgeCode = null,
    Object? badgeName = null,
    Object? badgeDescription = null,
    Object? category = null,
    Object? iconKey = null,
    Object? awardedAt = null,
    Object? firstSeenAt = freezed,
    Object? source = null,
    Object? note = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      badgeCode: null == badgeCode
          ? _value.badgeCode
          : badgeCode // ignore: cast_nullable_to_non_nullable
              as String,
      badgeName: null == badgeName
          ? _value.badgeName
          : badgeName // ignore: cast_nullable_to_non_nullable
              as String,
      badgeDescription: null == badgeDescription
          ? _value.badgeDescription
          : badgeDescription // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as BadgeCategory,
      iconKey: null == iconKey
          ? _value.iconKey
          : iconKey // ignore: cast_nullable_to_non_nullable
              as String,
      awardedAt: null == awardedAt
          ? _value.awardedAt
          : awardedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      firstSeenAt: freezed == firstSeenAt
          ? _value.firstSeenAt
          : firstSeenAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      source: null == source
          ? _value.source
          : source // ignore: cast_nullable_to_non_nullable
              as String,
      note: freezed == note
          ? _value.note
          : note // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$LearnerBadgeImplCopyWith<$Res>
    implements $LearnerBadgeCopyWith<$Res> {
  factory _$$LearnerBadgeImplCopyWith(
          _$LearnerBadgeImpl value, $Res Function(_$LearnerBadgeImpl) then) =
      __$$LearnerBadgeImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String badgeCode,
      String badgeName,
      String badgeDescription,
      BadgeCategory category,
      String iconKey,
      DateTime awardedAt,
      DateTime? firstSeenAt,
      String source,
      String? note});
}

/// @nodoc
class __$$LearnerBadgeImplCopyWithImpl<$Res>
    extends _$LearnerBadgeCopyWithImpl<$Res, _$LearnerBadgeImpl>
    implements _$$LearnerBadgeImplCopyWith<$Res> {
  __$$LearnerBadgeImplCopyWithImpl(
      _$LearnerBadgeImpl _value, $Res Function(_$LearnerBadgeImpl) _then)
      : super(_value, _then);

  /// Create a copy of LearnerBadge
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? badgeCode = null,
    Object? badgeName = null,
    Object? badgeDescription = null,
    Object? category = null,
    Object? iconKey = null,
    Object? awardedAt = null,
    Object? firstSeenAt = freezed,
    Object? source = null,
    Object? note = freezed,
  }) {
    return _then(_$LearnerBadgeImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      badgeCode: null == badgeCode
          ? _value.badgeCode
          : badgeCode // ignore: cast_nullable_to_non_nullable
              as String,
      badgeName: null == badgeName
          ? _value.badgeName
          : badgeName // ignore: cast_nullable_to_non_nullable
              as String,
      badgeDescription: null == badgeDescription
          ? _value.badgeDescription
          : badgeDescription // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as BadgeCategory,
      iconKey: null == iconKey
          ? _value.iconKey
          : iconKey // ignore: cast_nullable_to_non_nullable
              as String,
      awardedAt: null == awardedAt
          ? _value.awardedAt
          : awardedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      firstSeenAt: freezed == firstSeenAt
          ? _value.firstSeenAt
          : firstSeenAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      source: null == source
          ? _value.source
          : source // ignore: cast_nullable_to_non_nullable
              as String,
      note: freezed == note
          ? _value.note
          : note // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$LearnerBadgeImpl implements _LearnerBadge {
  const _$LearnerBadgeImpl(
      {required this.id,
      required this.badgeCode,
      required this.badgeName,
      required this.badgeDescription,
      required this.category,
      required this.iconKey,
      required this.awardedAt,
      this.firstSeenAt,
      required this.source,
      this.note});

  factory _$LearnerBadgeImpl.fromJson(Map<String, dynamic> json) =>
      _$$LearnerBadgeImplFromJson(json);

  @override
  final String id;
  @override
  final String badgeCode;
  @override
  final String badgeName;
  @override
  final String badgeDescription;
  @override
  final BadgeCategory category;
  @override
  final String iconKey;
  @override
  final DateTime awardedAt;
  @override
  final DateTime? firstSeenAt;
  @override
  final String source;
  @override
  final String? note;

  @override
  String toString() {
    return 'LearnerBadge(id: $id, badgeCode: $badgeCode, badgeName: $badgeName, badgeDescription: $badgeDescription, category: $category, iconKey: $iconKey, awardedAt: $awardedAt, firstSeenAt: $firstSeenAt, source: $source, note: $note)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LearnerBadgeImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.badgeCode, badgeCode) ||
                other.badgeCode == badgeCode) &&
            (identical(other.badgeName, badgeName) ||
                other.badgeName == badgeName) &&
            (identical(other.badgeDescription, badgeDescription) ||
                other.badgeDescription == badgeDescription) &&
            (identical(other.category, category) ||
                other.category == category) &&
            (identical(other.iconKey, iconKey) || other.iconKey == iconKey) &&
            (identical(other.awardedAt, awardedAt) ||
                other.awardedAt == awardedAt) &&
            (identical(other.firstSeenAt, firstSeenAt) ||
                other.firstSeenAt == firstSeenAt) &&
            (identical(other.source, source) || other.source == source) &&
            (identical(other.note, note) || other.note == note));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      badgeCode,
      badgeName,
      badgeDescription,
      category,
      iconKey,
      awardedAt,
      firstSeenAt,
      source,
      note);

  /// Create a copy of LearnerBadge
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LearnerBadgeImplCopyWith<_$LearnerBadgeImpl> get copyWith =>
      __$$LearnerBadgeImplCopyWithImpl<_$LearnerBadgeImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$LearnerBadgeImplToJson(
      this,
    );
  }
}

abstract class _LearnerBadge implements LearnerBadge {
  const factory _LearnerBadge(
      {required final String id,
      required final String badgeCode,
      required final String badgeName,
      required final String badgeDescription,
      required final BadgeCategory category,
      required final String iconKey,
      required final DateTime awardedAt,
      final DateTime? firstSeenAt,
      required final String source,
      final String? note}) = _$LearnerBadgeImpl;

  factory _LearnerBadge.fromJson(Map<String, dynamic> json) =
      _$LearnerBadgeImpl.fromJson;

  @override
  String get id;
  @override
  String get badgeCode;
  @override
  String get badgeName;
  @override
  String get badgeDescription;
  @override
  BadgeCategory get category;
  @override
  String get iconKey;
  @override
  DateTime get awardedAt;
  @override
  DateTime? get firstSeenAt;
  @override
  String get source;
  @override
  String? get note;

  /// Create a copy of LearnerBadge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LearnerBadgeImplCopyWith<_$LearnerBadgeImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

BadgeProgress _$BadgeProgressFromJson(Map<String, dynamic> json) {
  return _BadgeProgress.fromJson(json);
}

/// @nodoc
mixin _$BadgeProgress {
  String get badgeCode => throw _privateConstructorUsedError;
  String get badgeName => throw _privateConstructorUsedError;
  String get badgeDescription => throw _privateConstructorUsedError;
  BadgeCategory get category => throw _privateConstructorUsedError;
  String get iconKey => throw _privateConstructorUsedError;
  int get progress => throw _privateConstructorUsedError;
  int get target => throw _privateConstructorUsedError;
  int get progressPercent => throw _privateConstructorUsedError;
  bool get earned => throw _privateConstructorUsedError;

  /// Serializes this BadgeProgress to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of BadgeProgress
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $BadgeProgressCopyWith<BadgeProgress> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $BadgeProgressCopyWith<$Res> {
  factory $BadgeProgressCopyWith(
          BadgeProgress value, $Res Function(BadgeProgress) then) =
      _$BadgeProgressCopyWithImpl<$Res, BadgeProgress>;
  @useResult
  $Res call(
      {String badgeCode,
      String badgeName,
      String badgeDescription,
      BadgeCategory category,
      String iconKey,
      int progress,
      int target,
      int progressPercent,
      bool earned});
}

/// @nodoc
class _$BadgeProgressCopyWithImpl<$Res, $Val extends BadgeProgress>
    implements $BadgeProgressCopyWith<$Res> {
  _$BadgeProgressCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of BadgeProgress
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? badgeCode = null,
    Object? badgeName = null,
    Object? badgeDescription = null,
    Object? category = null,
    Object? iconKey = null,
    Object? progress = null,
    Object? target = null,
    Object? progressPercent = null,
    Object? earned = null,
  }) {
    return _then(_value.copyWith(
      badgeCode: null == badgeCode
          ? _value.badgeCode
          : badgeCode // ignore: cast_nullable_to_non_nullable
              as String,
      badgeName: null == badgeName
          ? _value.badgeName
          : badgeName // ignore: cast_nullable_to_non_nullable
              as String,
      badgeDescription: null == badgeDescription
          ? _value.badgeDescription
          : badgeDescription // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as BadgeCategory,
      iconKey: null == iconKey
          ? _value.iconKey
          : iconKey // ignore: cast_nullable_to_non_nullable
              as String,
      progress: null == progress
          ? _value.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as int,
      target: null == target
          ? _value.target
          : target // ignore: cast_nullable_to_non_nullable
              as int,
      progressPercent: null == progressPercent
          ? _value.progressPercent
          : progressPercent // ignore: cast_nullable_to_non_nullable
              as int,
      earned: null == earned
          ? _value.earned
          : earned // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$BadgeProgressImplCopyWith<$Res>
    implements $BadgeProgressCopyWith<$Res> {
  factory _$$BadgeProgressImplCopyWith(
          _$BadgeProgressImpl value, $Res Function(_$BadgeProgressImpl) then) =
      __$$BadgeProgressImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String badgeCode,
      String badgeName,
      String badgeDescription,
      BadgeCategory category,
      String iconKey,
      int progress,
      int target,
      int progressPercent,
      bool earned});
}

/// @nodoc
class __$$BadgeProgressImplCopyWithImpl<$Res>
    extends _$BadgeProgressCopyWithImpl<$Res, _$BadgeProgressImpl>
    implements _$$BadgeProgressImplCopyWith<$Res> {
  __$$BadgeProgressImplCopyWithImpl(
      _$BadgeProgressImpl _value, $Res Function(_$BadgeProgressImpl) _then)
      : super(_value, _then);

  /// Create a copy of BadgeProgress
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? badgeCode = null,
    Object? badgeName = null,
    Object? badgeDescription = null,
    Object? category = null,
    Object? iconKey = null,
    Object? progress = null,
    Object? target = null,
    Object? progressPercent = null,
    Object? earned = null,
  }) {
    return _then(_$BadgeProgressImpl(
      badgeCode: null == badgeCode
          ? _value.badgeCode
          : badgeCode // ignore: cast_nullable_to_non_nullable
              as String,
      badgeName: null == badgeName
          ? _value.badgeName
          : badgeName // ignore: cast_nullable_to_non_nullable
              as String,
      badgeDescription: null == badgeDescription
          ? _value.badgeDescription
          : badgeDescription // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as BadgeCategory,
      iconKey: null == iconKey
          ? _value.iconKey
          : iconKey // ignore: cast_nullable_to_non_nullable
              as String,
      progress: null == progress
          ? _value.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as int,
      target: null == target
          ? _value.target
          : target // ignore: cast_nullable_to_non_nullable
              as int,
      progressPercent: null == progressPercent
          ? _value.progressPercent
          : progressPercent // ignore: cast_nullable_to_non_nullable
              as int,
      earned: null == earned
          ? _value.earned
          : earned // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$BadgeProgressImpl implements _BadgeProgress {
  const _$BadgeProgressImpl(
      {required this.badgeCode,
      required this.badgeName,
      required this.badgeDescription,
      required this.category,
      required this.iconKey,
      required this.progress,
      required this.target,
      required this.progressPercent,
      required this.earned});

  factory _$BadgeProgressImpl.fromJson(Map<String, dynamic> json) =>
      _$$BadgeProgressImplFromJson(json);

  @override
  final String badgeCode;
  @override
  final String badgeName;
  @override
  final String badgeDescription;
  @override
  final BadgeCategory category;
  @override
  final String iconKey;
  @override
  final int progress;
  @override
  final int target;
  @override
  final int progressPercent;
  @override
  final bool earned;

  @override
  String toString() {
    return 'BadgeProgress(badgeCode: $badgeCode, badgeName: $badgeName, badgeDescription: $badgeDescription, category: $category, iconKey: $iconKey, progress: $progress, target: $target, progressPercent: $progressPercent, earned: $earned)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$BadgeProgressImpl &&
            (identical(other.badgeCode, badgeCode) ||
                other.badgeCode == badgeCode) &&
            (identical(other.badgeName, badgeName) ||
                other.badgeName == badgeName) &&
            (identical(other.badgeDescription, badgeDescription) ||
                other.badgeDescription == badgeDescription) &&
            (identical(other.category, category) ||
                other.category == category) &&
            (identical(other.iconKey, iconKey) || other.iconKey == iconKey) &&
            (identical(other.progress, progress) ||
                other.progress == progress) &&
            (identical(other.target, target) || other.target == target) &&
            (identical(other.progressPercent, progressPercent) ||
                other.progressPercent == progressPercent) &&
            (identical(other.earned, earned) || other.earned == earned));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      badgeCode,
      badgeName,
      badgeDescription,
      category,
      iconKey,
      progress,
      target,
      progressPercent,
      earned);

  /// Create a copy of BadgeProgress
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$BadgeProgressImplCopyWith<_$BadgeProgressImpl> get copyWith =>
      __$$BadgeProgressImplCopyWithImpl<_$BadgeProgressImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$BadgeProgressImplToJson(
      this,
    );
  }
}

abstract class _BadgeProgress implements BadgeProgress {
  const factory _BadgeProgress(
      {required final String badgeCode,
      required final String badgeName,
      required final String badgeDescription,
      required final BadgeCategory category,
      required final String iconKey,
      required final int progress,
      required final int target,
      required final int progressPercent,
      required final bool earned}) = _$BadgeProgressImpl;

  factory _BadgeProgress.fromJson(Map<String, dynamic> json) =
      _$BadgeProgressImpl.fromJson;

  @override
  String get badgeCode;
  @override
  String get badgeName;
  @override
  String get badgeDescription;
  @override
  BadgeCategory get category;
  @override
  String get iconKey;
  @override
  int get progress;
  @override
  int get target;
  @override
  int get progressPercent;
  @override
  bool get earned;

  /// Create a copy of BadgeProgress
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$BadgeProgressImplCopyWith<_$BadgeProgressImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

Kudos _$KudosFromJson(Map<String, dynamic> json) {
  return _Kudos.fromJson(json);
}

/// @nodoc
mixin _$Kudos {
  String get id => throw _privateConstructorUsedError;
  String get tenantId => throw _privateConstructorUsedError;
  String get learnerId => throw _privateConstructorUsedError;
  String get fromUserId => throw _privateConstructorUsedError;
  String get fromRole => throw _privateConstructorUsedError;
  String? get fromName => throw _privateConstructorUsedError;
  String get message => throw _privateConstructorUsedError;
  String? get emoji => throw _privateConstructorUsedError;
  String get context => throw _privateConstructorUsedError;
  String? get linkedSessionId => throw _privateConstructorUsedError;
  String? get linkedActionPlanId => throw _privateConstructorUsedError;
  bool get visibleToLearner => throw _privateConstructorUsedError;
  DateTime? get readAt => throw _privateConstructorUsedError;
  DateTime get createdAt => throw _privateConstructorUsedError;

  /// Serializes this Kudos to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Kudos
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $KudosCopyWith<Kudos> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $KudosCopyWith<$Res> {
  factory $KudosCopyWith(Kudos value, $Res Function(Kudos) then) =
      _$KudosCopyWithImpl<$Res, Kudos>;
  @useResult
  $Res call(
      {String id,
      String tenantId,
      String learnerId,
      String fromUserId,
      String fromRole,
      String? fromName,
      String message,
      String? emoji,
      String context,
      String? linkedSessionId,
      String? linkedActionPlanId,
      bool visibleToLearner,
      DateTime? readAt,
      DateTime createdAt});
}

/// @nodoc
class _$KudosCopyWithImpl<$Res, $Val extends Kudos>
    implements $KudosCopyWith<$Res> {
  _$KudosCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Kudos
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? tenantId = null,
    Object? learnerId = null,
    Object? fromUserId = null,
    Object? fromRole = null,
    Object? fromName = freezed,
    Object? message = null,
    Object? emoji = freezed,
    Object? context = null,
    Object? linkedSessionId = freezed,
    Object? linkedActionPlanId = freezed,
    Object? visibleToLearner = null,
    Object? readAt = freezed,
    Object? createdAt = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      tenantId: null == tenantId
          ? _value.tenantId
          : tenantId // ignore: cast_nullable_to_non_nullable
              as String,
      learnerId: null == learnerId
          ? _value.learnerId
          : learnerId // ignore: cast_nullable_to_non_nullable
              as String,
      fromUserId: null == fromUserId
          ? _value.fromUserId
          : fromUserId // ignore: cast_nullable_to_non_nullable
              as String,
      fromRole: null == fromRole
          ? _value.fromRole
          : fromRole // ignore: cast_nullable_to_non_nullable
              as String,
      fromName: freezed == fromName
          ? _value.fromName
          : fromName // ignore: cast_nullable_to_non_nullable
              as String?,
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      emoji: freezed == emoji
          ? _value.emoji
          : emoji // ignore: cast_nullable_to_non_nullable
              as String?,
      context: null == context
          ? _value.context
          : context // ignore: cast_nullable_to_non_nullable
              as String,
      linkedSessionId: freezed == linkedSessionId
          ? _value.linkedSessionId
          : linkedSessionId // ignore: cast_nullable_to_non_nullable
              as String?,
      linkedActionPlanId: freezed == linkedActionPlanId
          ? _value.linkedActionPlanId
          : linkedActionPlanId // ignore: cast_nullable_to_non_nullable
              as String?,
      visibleToLearner: null == visibleToLearner
          ? _value.visibleToLearner
          : visibleToLearner // ignore: cast_nullable_to_non_nullable
              as bool,
      readAt: freezed == readAt
          ? _value.readAt
          : readAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$KudosImplCopyWith<$Res> implements $KudosCopyWith<$Res> {
  factory _$$KudosImplCopyWith(
          _$KudosImpl value, $Res Function(_$KudosImpl) then) =
      __$$KudosImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String tenantId,
      String learnerId,
      String fromUserId,
      String fromRole,
      String? fromName,
      String message,
      String? emoji,
      String context,
      String? linkedSessionId,
      String? linkedActionPlanId,
      bool visibleToLearner,
      DateTime? readAt,
      DateTime createdAt});
}

/// @nodoc
class __$$KudosImplCopyWithImpl<$Res>
    extends _$KudosCopyWithImpl<$Res, _$KudosImpl>
    implements _$$KudosImplCopyWith<$Res> {
  __$$KudosImplCopyWithImpl(
      _$KudosImpl _value, $Res Function(_$KudosImpl) _then)
      : super(_value, _then);

  /// Create a copy of Kudos
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? tenantId = null,
    Object? learnerId = null,
    Object? fromUserId = null,
    Object? fromRole = null,
    Object? fromName = freezed,
    Object? message = null,
    Object? emoji = freezed,
    Object? context = null,
    Object? linkedSessionId = freezed,
    Object? linkedActionPlanId = freezed,
    Object? visibleToLearner = null,
    Object? readAt = freezed,
    Object? createdAt = null,
  }) {
    return _then(_$KudosImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      tenantId: null == tenantId
          ? _value.tenantId
          : tenantId // ignore: cast_nullable_to_non_nullable
              as String,
      learnerId: null == learnerId
          ? _value.learnerId
          : learnerId // ignore: cast_nullable_to_non_nullable
              as String,
      fromUserId: null == fromUserId
          ? _value.fromUserId
          : fromUserId // ignore: cast_nullable_to_non_nullable
              as String,
      fromRole: null == fromRole
          ? _value.fromRole
          : fromRole // ignore: cast_nullable_to_non_nullable
              as String,
      fromName: freezed == fromName
          ? _value.fromName
          : fromName // ignore: cast_nullable_to_non_nullable
              as String?,
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      emoji: freezed == emoji
          ? _value.emoji
          : emoji // ignore: cast_nullable_to_non_nullable
              as String?,
      context: null == context
          ? _value.context
          : context // ignore: cast_nullable_to_non_nullable
              as String,
      linkedSessionId: freezed == linkedSessionId
          ? _value.linkedSessionId
          : linkedSessionId // ignore: cast_nullable_to_non_nullable
              as String?,
      linkedActionPlanId: freezed == linkedActionPlanId
          ? _value.linkedActionPlanId
          : linkedActionPlanId // ignore: cast_nullable_to_non_nullable
              as String?,
      visibleToLearner: null == visibleToLearner
          ? _value.visibleToLearner
          : visibleToLearner // ignore: cast_nullable_to_non_nullable
              as bool,
      readAt: freezed == readAt
          ? _value.readAt
          : readAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$KudosImpl implements _Kudos {
  const _$KudosImpl(
      {required this.id,
      required this.tenantId,
      required this.learnerId,
      required this.fromUserId,
      required this.fromRole,
      this.fromName,
      required this.message,
      this.emoji,
      required this.context,
      this.linkedSessionId,
      this.linkedActionPlanId,
      required this.visibleToLearner,
      this.readAt,
      required this.createdAt});

  factory _$KudosImpl.fromJson(Map<String, dynamic> json) =>
      _$$KudosImplFromJson(json);

  @override
  final String id;
  @override
  final String tenantId;
  @override
  final String learnerId;
  @override
  final String fromUserId;
  @override
  final String fromRole;
  @override
  final String? fromName;
  @override
  final String message;
  @override
  final String? emoji;
  @override
  final String context;
  @override
  final String? linkedSessionId;
  @override
  final String? linkedActionPlanId;
  @override
  final bool visibleToLearner;
  @override
  final DateTime? readAt;
  @override
  final DateTime createdAt;

  @override
  String toString() {
    return 'Kudos(id: $id, tenantId: $tenantId, learnerId: $learnerId, fromUserId: $fromUserId, fromRole: $fromRole, fromName: $fromName, message: $message, emoji: $emoji, context: $context, linkedSessionId: $linkedSessionId, linkedActionPlanId: $linkedActionPlanId, visibleToLearner: $visibleToLearner, readAt: $readAt, createdAt: $createdAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$KudosImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.tenantId, tenantId) ||
                other.tenantId == tenantId) &&
            (identical(other.learnerId, learnerId) ||
                other.learnerId == learnerId) &&
            (identical(other.fromUserId, fromUserId) ||
                other.fromUserId == fromUserId) &&
            (identical(other.fromRole, fromRole) ||
                other.fromRole == fromRole) &&
            (identical(other.fromName, fromName) ||
                other.fromName == fromName) &&
            (identical(other.message, message) || other.message == message) &&
            (identical(other.emoji, emoji) || other.emoji == emoji) &&
            (identical(other.context, context) || other.context == context) &&
            (identical(other.linkedSessionId, linkedSessionId) ||
                other.linkedSessionId == linkedSessionId) &&
            (identical(other.linkedActionPlanId, linkedActionPlanId) ||
                other.linkedActionPlanId == linkedActionPlanId) &&
            (identical(other.visibleToLearner, visibleToLearner) ||
                other.visibleToLearner == visibleToLearner) &&
            (identical(other.readAt, readAt) || other.readAt == readAt) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      tenantId,
      learnerId,
      fromUserId,
      fromRole,
      fromName,
      message,
      emoji,
      context,
      linkedSessionId,
      linkedActionPlanId,
      visibleToLearner,
      readAt,
      createdAt);

  /// Create a copy of Kudos
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$KudosImplCopyWith<_$KudosImpl> get copyWith =>
      __$$KudosImplCopyWithImpl<_$KudosImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$KudosImplToJson(
      this,
    );
  }
}

abstract class _Kudos implements Kudos {
  const factory _Kudos(
      {required final String id,
      required final String tenantId,
      required final String learnerId,
      required final String fromUserId,
      required final String fromRole,
      final String? fromName,
      required final String message,
      final String? emoji,
      required final String context,
      final String? linkedSessionId,
      final String? linkedActionPlanId,
      required final bool visibleToLearner,
      final DateTime? readAt,
      required final DateTime createdAt}) = _$KudosImpl;

  factory _Kudos.fromJson(Map<String, dynamic> json) = _$KudosImpl.fromJson;

  @override
  String get id;
  @override
  String get tenantId;
  @override
  String get learnerId;
  @override
  String get fromUserId;
  @override
  String get fromRole;
  @override
  String? get fromName;
  @override
  String get message;
  @override
  String? get emoji;
  @override
  String get context;
  @override
  String? get linkedSessionId;
  @override
  String? get linkedActionPlanId;
  @override
  bool get visibleToLearner;
  @override
  DateTime? get readAt;
  @override
  DateTime get createdAt;

  /// Create a copy of Kudos
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$KudosImplCopyWith<_$KudosImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

EngagementEventResult _$EngagementEventResultFromJson(
    Map<String, dynamic> json) {
  return _EngagementEventResult.fromJson(json);
}

/// @nodoc
mixin _$EngagementEventResult {
  int get xpAwarded => throw _privateConstructorUsedError;
  int get newLevel => throw _privateConstructorUsedError;
  int get newXpTotal => throw _privateConstructorUsedError;
  int get streakDays => throw _privateConstructorUsedError;
  bool get leveledUp => throw _privateConstructorUsedError;
  int get previousLevel => throw _privateConstructorUsedError;
  bool get streakUpdated => throw _privateConstructorUsedError;
  int get previousStreak => throw _privateConstructorUsedError;
  List<BadgeAward> get awardedBadges => throw _privateConstructorUsedError;

  /// Serializes this EngagementEventResult to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of EngagementEventResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $EngagementEventResultCopyWith<EngagementEventResult> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $EngagementEventResultCopyWith<$Res> {
  factory $EngagementEventResultCopyWith(EngagementEventResult value,
          $Res Function(EngagementEventResult) then) =
      _$EngagementEventResultCopyWithImpl<$Res, EngagementEventResult>;
  @useResult
  $Res call(
      {int xpAwarded,
      int newLevel,
      int newXpTotal,
      int streakDays,
      bool leveledUp,
      int previousLevel,
      bool streakUpdated,
      int previousStreak,
      List<BadgeAward> awardedBadges});
}

/// @nodoc
class _$EngagementEventResultCopyWithImpl<$Res,
        $Val extends EngagementEventResult>
    implements $EngagementEventResultCopyWith<$Res> {
  _$EngagementEventResultCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of EngagementEventResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? xpAwarded = null,
    Object? newLevel = null,
    Object? newXpTotal = null,
    Object? streakDays = null,
    Object? leveledUp = null,
    Object? previousLevel = null,
    Object? streakUpdated = null,
    Object? previousStreak = null,
    Object? awardedBadges = null,
  }) {
    return _then(_value.copyWith(
      xpAwarded: null == xpAwarded
          ? _value.xpAwarded
          : xpAwarded // ignore: cast_nullable_to_non_nullable
              as int,
      newLevel: null == newLevel
          ? _value.newLevel
          : newLevel // ignore: cast_nullable_to_non_nullable
              as int,
      newXpTotal: null == newXpTotal
          ? _value.newXpTotal
          : newXpTotal // ignore: cast_nullable_to_non_nullable
              as int,
      streakDays: null == streakDays
          ? _value.streakDays
          : streakDays // ignore: cast_nullable_to_non_nullable
              as int,
      leveledUp: null == leveledUp
          ? _value.leveledUp
          : leveledUp // ignore: cast_nullable_to_non_nullable
              as bool,
      previousLevel: null == previousLevel
          ? _value.previousLevel
          : previousLevel // ignore: cast_nullable_to_non_nullable
              as int,
      streakUpdated: null == streakUpdated
          ? _value.streakUpdated
          : streakUpdated // ignore: cast_nullable_to_non_nullable
              as bool,
      previousStreak: null == previousStreak
          ? _value.previousStreak
          : previousStreak // ignore: cast_nullable_to_non_nullable
              as int,
      awardedBadges: null == awardedBadges
          ? _value.awardedBadges
          : awardedBadges // ignore: cast_nullable_to_non_nullable
              as List<BadgeAward>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$EngagementEventResultImplCopyWith<$Res>
    implements $EngagementEventResultCopyWith<$Res> {
  factory _$$EngagementEventResultImplCopyWith(
          _$EngagementEventResultImpl value,
          $Res Function(_$EngagementEventResultImpl) then) =
      __$$EngagementEventResultImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {int xpAwarded,
      int newLevel,
      int newXpTotal,
      int streakDays,
      bool leveledUp,
      int previousLevel,
      bool streakUpdated,
      int previousStreak,
      List<BadgeAward> awardedBadges});
}

/// @nodoc
class __$$EngagementEventResultImplCopyWithImpl<$Res>
    extends _$EngagementEventResultCopyWithImpl<$Res,
        _$EngagementEventResultImpl>
    implements _$$EngagementEventResultImplCopyWith<$Res> {
  __$$EngagementEventResultImplCopyWithImpl(_$EngagementEventResultImpl _value,
      $Res Function(_$EngagementEventResultImpl) _then)
      : super(_value, _then);

  /// Create a copy of EngagementEventResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? xpAwarded = null,
    Object? newLevel = null,
    Object? newXpTotal = null,
    Object? streakDays = null,
    Object? leveledUp = null,
    Object? previousLevel = null,
    Object? streakUpdated = null,
    Object? previousStreak = null,
    Object? awardedBadges = null,
  }) {
    return _then(_$EngagementEventResultImpl(
      xpAwarded: null == xpAwarded
          ? _value.xpAwarded
          : xpAwarded // ignore: cast_nullable_to_non_nullable
              as int,
      newLevel: null == newLevel
          ? _value.newLevel
          : newLevel // ignore: cast_nullable_to_non_nullable
              as int,
      newXpTotal: null == newXpTotal
          ? _value.newXpTotal
          : newXpTotal // ignore: cast_nullable_to_non_nullable
              as int,
      streakDays: null == streakDays
          ? _value.streakDays
          : streakDays // ignore: cast_nullable_to_non_nullable
              as int,
      leveledUp: null == leveledUp
          ? _value.leveledUp
          : leveledUp // ignore: cast_nullable_to_non_nullable
              as bool,
      previousLevel: null == previousLevel
          ? _value.previousLevel
          : previousLevel // ignore: cast_nullable_to_non_nullable
              as int,
      streakUpdated: null == streakUpdated
          ? _value.streakUpdated
          : streakUpdated // ignore: cast_nullable_to_non_nullable
              as bool,
      previousStreak: null == previousStreak
          ? _value.previousStreak
          : previousStreak // ignore: cast_nullable_to_non_nullable
              as int,
      awardedBadges: null == awardedBadges
          ? _value._awardedBadges
          : awardedBadges // ignore: cast_nullable_to_non_nullable
              as List<BadgeAward>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$EngagementEventResultImpl implements _EngagementEventResult {
  const _$EngagementEventResultImpl(
      {required this.xpAwarded,
      required this.newLevel,
      required this.newXpTotal,
      required this.streakDays,
      required this.leveledUp,
      required this.previousLevel,
      required this.streakUpdated,
      required this.previousStreak,
      final List<BadgeAward> awardedBadges = const []})
      : _awardedBadges = awardedBadges;

  factory _$EngagementEventResultImpl.fromJson(Map<String, dynamic> json) =>
      _$$EngagementEventResultImplFromJson(json);

  @override
  final int xpAwarded;
  @override
  final int newLevel;
  @override
  final int newXpTotal;
  @override
  final int streakDays;
  @override
  final bool leveledUp;
  @override
  final int previousLevel;
  @override
  final bool streakUpdated;
  @override
  final int previousStreak;
  final List<BadgeAward> _awardedBadges;
  @override
  @JsonKey()
  List<BadgeAward> get awardedBadges {
    if (_awardedBadges is EqualUnmodifiableListView) return _awardedBadges;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_awardedBadges);
  }

  @override
  String toString() {
    return 'EngagementEventResult(xpAwarded: $xpAwarded, newLevel: $newLevel, newXpTotal: $newXpTotal, streakDays: $streakDays, leveledUp: $leveledUp, previousLevel: $previousLevel, streakUpdated: $streakUpdated, previousStreak: $previousStreak, awardedBadges: $awardedBadges)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$EngagementEventResultImpl &&
            (identical(other.xpAwarded, xpAwarded) ||
                other.xpAwarded == xpAwarded) &&
            (identical(other.newLevel, newLevel) ||
                other.newLevel == newLevel) &&
            (identical(other.newXpTotal, newXpTotal) ||
                other.newXpTotal == newXpTotal) &&
            (identical(other.streakDays, streakDays) ||
                other.streakDays == streakDays) &&
            (identical(other.leveledUp, leveledUp) ||
                other.leveledUp == leveledUp) &&
            (identical(other.previousLevel, previousLevel) ||
                other.previousLevel == previousLevel) &&
            (identical(other.streakUpdated, streakUpdated) ||
                other.streakUpdated == streakUpdated) &&
            (identical(other.previousStreak, previousStreak) ||
                other.previousStreak == previousStreak) &&
            const DeepCollectionEquality()
                .equals(other._awardedBadges, _awardedBadges));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      xpAwarded,
      newLevel,
      newXpTotal,
      streakDays,
      leveledUp,
      previousLevel,
      streakUpdated,
      previousStreak,
      const DeepCollectionEquality().hash(_awardedBadges));

  /// Create a copy of EngagementEventResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$EngagementEventResultImplCopyWith<_$EngagementEventResultImpl>
      get copyWith => __$$EngagementEventResultImplCopyWithImpl<
          _$EngagementEventResultImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$EngagementEventResultImplToJson(
      this,
    );
  }
}

abstract class _EngagementEventResult implements EngagementEventResult {
  const factory _EngagementEventResult(
      {required final int xpAwarded,
      required final int newLevel,
      required final int newXpTotal,
      required final int streakDays,
      required final bool leveledUp,
      required final int previousLevel,
      required final bool streakUpdated,
      required final int previousStreak,
      final List<BadgeAward> awardedBadges}) = _$EngagementEventResultImpl;

  factory _EngagementEventResult.fromJson(Map<String, dynamic> json) =
      _$EngagementEventResultImpl.fromJson;

  @override
  int get xpAwarded;
  @override
  int get newLevel;
  @override
  int get newXpTotal;
  @override
  int get streakDays;
  @override
  bool get leveledUp;
  @override
  int get previousLevel;
  @override
  bool get streakUpdated;
  @override
  int get previousStreak;
  @override
  List<BadgeAward> get awardedBadges;

  /// Create a copy of EngagementEventResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$EngagementEventResultImplCopyWith<_$EngagementEventResultImpl>
      get copyWith => throw _privateConstructorUsedError;
}

BadgeAward _$BadgeAwardFromJson(Map<String, dynamic> json) {
  return _BadgeAward.fromJson(json);
}

/// @nodoc
mixin _$BadgeAward {
  String get code => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  bool get isNew => throw _privateConstructorUsedError;

  /// Serializes this BadgeAward to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of BadgeAward
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $BadgeAwardCopyWith<BadgeAward> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $BadgeAwardCopyWith<$Res> {
  factory $BadgeAwardCopyWith(
          BadgeAward value, $Res Function(BadgeAward) then) =
      _$BadgeAwardCopyWithImpl<$Res, BadgeAward>;
  @useResult
  $Res call({String code, String name, bool isNew});
}

/// @nodoc
class _$BadgeAwardCopyWithImpl<$Res, $Val extends BadgeAward>
    implements $BadgeAwardCopyWith<$Res> {
  _$BadgeAwardCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of BadgeAward
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? code = null,
    Object? name = null,
    Object? isNew = null,
  }) {
    return _then(_value.copyWith(
      code: null == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      isNew: null == isNew
          ? _value.isNew
          : isNew // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$BadgeAwardImplCopyWith<$Res>
    implements $BadgeAwardCopyWith<$Res> {
  factory _$$BadgeAwardImplCopyWith(
          _$BadgeAwardImpl value, $Res Function(_$BadgeAwardImpl) then) =
      __$$BadgeAwardImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String code, String name, bool isNew});
}

/// @nodoc
class __$$BadgeAwardImplCopyWithImpl<$Res>
    extends _$BadgeAwardCopyWithImpl<$Res, _$BadgeAwardImpl>
    implements _$$BadgeAwardImplCopyWith<$Res> {
  __$$BadgeAwardImplCopyWithImpl(
      _$BadgeAwardImpl _value, $Res Function(_$BadgeAwardImpl) _then)
      : super(_value, _then);

  /// Create a copy of BadgeAward
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? code = null,
    Object? name = null,
    Object? isNew = null,
  }) {
    return _then(_$BadgeAwardImpl(
      code: null == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      isNew: null == isNew
          ? _value.isNew
          : isNew // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$BadgeAwardImpl implements _BadgeAward {
  const _$BadgeAwardImpl(
      {required this.code, required this.name, required this.isNew});

  factory _$BadgeAwardImpl.fromJson(Map<String, dynamic> json) =>
      _$$BadgeAwardImplFromJson(json);

  @override
  final String code;
  @override
  final String name;
  @override
  final bool isNew;

  @override
  String toString() {
    return 'BadgeAward(code: $code, name: $name, isNew: $isNew)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$BadgeAwardImpl &&
            (identical(other.code, code) || other.code == code) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.isNew, isNew) || other.isNew == isNew));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, code, name, isNew);

  /// Create a copy of BadgeAward
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$BadgeAwardImplCopyWith<_$BadgeAwardImpl> get copyWith =>
      __$$BadgeAwardImplCopyWithImpl<_$BadgeAwardImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$BadgeAwardImplToJson(
      this,
    );
  }
}

abstract class _BadgeAward implements BadgeAward {
  const factory _BadgeAward(
      {required final String code,
      required final String name,
      required final bool isNew}) = _$BadgeAwardImpl;

  factory _BadgeAward.fromJson(Map<String, dynamic> json) =
      _$BadgeAwardImpl.fromJson;

  @override
  String get code;
  @override
  String get name;
  @override
  bool get isNew;

  /// Create a copy of BadgeAward
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$BadgeAwardImplCopyWith<_$BadgeAwardImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

EffectiveSettings _$EffectiveSettingsFromJson(Map<String, dynamic> json) {
  return _EffectiveSettings.fromJson(json);
}

/// @nodoc
mixin _$EffectiveSettings {
  bool get xpEnabled => throw _privateConstructorUsedError;
  bool get streaksEnabled => throw _privateConstructorUsedError;
  bool get badgesEnabled => throw _privateConstructorUsedError;
  bool get kudosEnabled => throw _privateConstructorUsedError;
  bool get celebrationsEnabled => throw _privateConstructorUsedError;
  bool get levelsEnabled => throw _privateConstructorUsedError;
  bool get showComparisons =>
      throw _privateConstructorUsedError; // Learner preferences
  RewardStyle get preferredRewardStyle => throw _privateConstructorUsedError;
  bool get muteCelebrations => throw _privateConstructorUsedError;
  bool get reducedVisuals => throw _privateConstructorUsedError;
  bool get showBadges => throw _privateConstructorUsedError;
  bool get showStreaks => throw _privateConstructorUsedError;
  bool get showXp => throw _privateConstructorUsedError;

  /// Serializes this EffectiveSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of EffectiveSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $EffectiveSettingsCopyWith<EffectiveSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $EffectiveSettingsCopyWith<$Res> {
  factory $EffectiveSettingsCopyWith(
          EffectiveSettings value, $Res Function(EffectiveSettings) then) =
      _$EffectiveSettingsCopyWithImpl<$Res, EffectiveSettings>;
  @useResult
  $Res call(
      {bool xpEnabled,
      bool streaksEnabled,
      bool badgesEnabled,
      bool kudosEnabled,
      bool celebrationsEnabled,
      bool levelsEnabled,
      bool showComparisons,
      RewardStyle preferredRewardStyle,
      bool muteCelebrations,
      bool reducedVisuals,
      bool showBadges,
      bool showStreaks,
      bool showXp});
}

/// @nodoc
class _$EffectiveSettingsCopyWithImpl<$Res, $Val extends EffectiveSettings>
    implements $EffectiveSettingsCopyWith<$Res> {
  _$EffectiveSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of EffectiveSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? xpEnabled = null,
    Object? streaksEnabled = null,
    Object? badgesEnabled = null,
    Object? kudosEnabled = null,
    Object? celebrationsEnabled = null,
    Object? levelsEnabled = null,
    Object? showComparisons = null,
    Object? preferredRewardStyle = null,
    Object? muteCelebrations = null,
    Object? reducedVisuals = null,
    Object? showBadges = null,
    Object? showStreaks = null,
    Object? showXp = null,
  }) {
    return _then(_value.copyWith(
      xpEnabled: null == xpEnabled
          ? _value.xpEnabled
          : xpEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      streaksEnabled: null == streaksEnabled
          ? _value.streaksEnabled
          : streaksEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      badgesEnabled: null == badgesEnabled
          ? _value.badgesEnabled
          : badgesEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      kudosEnabled: null == kudosEnabled
          ? _value.kudosEnabled
          : kudosEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      celebrationsEnabled: null == celebrationsEnabled
          ? _value.celebrationsEnabled
          : celebrationsEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      levelsEnabled: null == levelsEnabled
          ? _value.levelsEnabled
          : levelsEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      showComparisons: null == showComparisons
          ? _value.showComparisons
          : showComparisons // ignore: cast_nullable_to_non_nullable
              as bool,
      preferredRewardStyle: null == preferredRewardStyle
          ? _value.preferredRewardStyle
          : preferredRewardStyle // ignore: cast_nullable_to_non_nullable
              as RewardStyle,
      muteCelebrations: null == muteCelebrations
          ? _value.muteCelebrations
          : muteCelebrations // ignore: cast_nullable_to_non_nullable
              as bool,
      reducedVisuals: null == reducedVisuals
          ? _value.reducedVisuals
          : reducedVisuals // ignore: cast_nullable_to_non_nullable
              as bool,
      showBadges: null == showBadges
          ? _value.showBadges
          : showBadges // ignore: cast_nullable_to_non_nullable
              as bool,
      showStreaks: null == showStreaks
          ? _value.showStreaks
          : showStreaks // ignore: cast_nullable_to_non_nullable
              as bool,
      showXp: null == showXp
          ? _value.showXp
          : showXp // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$EffectiveSettingsImplCopyWith<$Res>
    implements $EffectiveSettingsCopyWith<$Res> {
  factory _$$EffectiveSettingsImplCopyWith(_$EffectiveSettingsImpl value,
          $Res Function(_$EffectiveSettingsImpl) then) =
      __$$EffectiveSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool xpEnabled,
      bool streaksEnabled,
      bool badgesEnabled,
      bool kudosEnabled,
      bool celebrationsEnabled,
      bool levelsEnabled,
      bool showComparisons,
      RewardStyle preferredRewardStyle,
      bool muteCelebrations,
      bool reducedVisuals,
      bool showBadges,
      bool showStreaks,
      bool showXp});
}

/// @nodoc
class __$$EffectiveSettingsImplCopyWithImpl<$Res>
    extends _$EffectiveSettingsCopyWithImpl<$Res, _$EffectiveSettingsImpl>
    implements _$$EffectiveSettingsImplCopyWith<$Res> {
  __$$EffectiveSettingsImplCopyWithImpl(_$EffectiveSettingsImpl _value,
      $Res Function(_$EffectiveSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of EffectiveSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? xpEnabled = null,
    Object? streaksEnabled = null,
    Object? badgesEnabled = null,
    Object? kudosEnabled = null,
    Object? celebrationsEnabled = null,
    Object? levelsEnabled = null,
    Object? showComparisons = null,
    Object? preferredRewardStyle = null,
    Object? muteCelebrations = null,
    Object? reducedVisuals = null,
    Object? showBadges = null,
    Object? showStreaks = null,
    Object? showXp = null,
  }) {
    return _then(_$EffectiveSettingsImpl(
      xpEnabled: null == xpEnabled
          ? _value.xpEnabled
          : xpEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      streaksEnabled: null == streaksEnabled
          ? _value.streaksEnabled
          : streaksEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      badgesEnabled: null == badgesEnabled
          ? _value.badgesEnabled
          : badgesEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      kudosEnabled: null == kudosEnabled
          ? _value.kudosEnabled
          : kudosEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      celebrationsEnabled: null == celebrationsEnabled
          ? _value.celebrationsEnabled
          : celebrationsEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      levelsEnabled: null == levelsEnabled
          ? _value.levelsEnabled
          : levelsEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      showComparisons: null == showComparisons
          ? _value.showComparisons
          : showComparisons // ignore: cast_nullable_to_non_nullable
              as bool,
      preferredRewardStyle: null == preferredRewardStyle
          ? _value.preferredRewardStyle
          : preferredRewardStyle // ignore: cast_nullable_to_non_nullable
              as RewardStyle,
      muteCelebrations: null == muteCelebrations
          ? _value.muteCelebrations
          : muteCelebrations // ignore: cast_nullable_to_non_nullable
              as bool,
      reducedVisuals: null == reducedVisuals
          ? _value.reducedVisuals
          : reducedVisuals // ignore: cast_nullable_to_non_nullable
              as bool,
      showBadges: null == showBadges
          ? _value.showBadges
          : showBadges // ignore: cast_nullable_to_non_nullable
              as bool,
      showStreaks: null == showStreaks
          ? _value.showStreaks
          : showStreaks // ignore: cast_nullable_to_non_nullable
              as bool,
      showXp: null == showXp
          ? _value.showXp
          : showXp // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$EffectiveSettingsImpl implements _EffectiveSettings {
  const _$EffectiveSettingsImpl(
      {required this.xpEnabled,
      required this.streaksEnabled,
      required this.badgesEnabled,
      required this.kudosEnabled,
      required this.celebrationsEnabled,
      required this.levelsEnabled,
      required this.showComparisons,
      required this.preferredRewardStyle,
      required this.muteCelebrations,
      required this.reducedVisuals,
      required this.showBadges,
      required this.showStreaks,
      required this.showXp});

  factory _$EffectiveSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$EffectiveSettingsImplFromJson(json);

  @override
  final bool xpEnabled;
  @override
  final bool streaksEnabled;
  @override
  final bool badgesEnabled;
  @override
  final bool kudosEnabled;
  @override
  final bool celebrationsEnabled;
  @override
  final bool levelsEnabled;
  @override
  final bool showComparisons;
// Learner preferences
  @override
  final RewardStyle preferredRewardStyle;
  @override
  final bool muteCelebrations;
  @override
  final bool reducedVisuals;
  @override
  final bool showBadges;
  @override
  final bool showStreaks;
  @override
  final bool showXp;

  @override
  String toString() {
    return 'EffectiveSettings(xpEnabled: $xpEnabled, streaksEnabled: $streaksEnabled, badgesEnabled: $badgesEnabled, kudosEnabled: $kudosEnabled, celebrationsEnabled: $celebrationsEnabled, levelsEnabled: $levelsEnabled, showComparisons: $showComparisons, preferredRewardStyle: $preferredRewardStyle, muteCelebrations: $muteCelebrations, reducedVisuals: $reducedVisuals, showBadges: $showBadges, showStreaks: $showStreaks, showXp: $showXp)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$EffectiveSettingsImpl &&
            (identical(other.xpEnabled, xpEnabled) ||
                other.xpEnabled == xpEnabled) &&
            (identical(other.streaksEnabled, streaksEnabled) ||
                other.streaksEnabled == streaksEnabled) &&
            (identical(other.badgesEnabled, badgesEnabled) ||
                other.badgesEnabled == badgesEnabled) &&
            (identical(other.kudosEnabled, kudosEnabled) ||
                other.kudosEnabled == kudosEnabled) &&
            (identical(other.celebrationsEnabled, celebrationsEnabled) ||
                other.celebrationsEnabled == celebrationsEnabled) &&
            (identical(other.levelsEnabled, levelsEnabled) ||
                other.levelsEnabled == levelsEnabled) &&
            (identical(other.showComparisons, showComparisons) ||
                other.showComparisons == showComparisons) &&
            (identical(other.preferredRewardStyle, preferredRewardStyle) ||
                other.preferredRewardStyle == preferredRewardStyle) &&
            (identical(other.muteCelebrations, muteCelebrations) ||
                other.muteCelebrations == muteCelebrations) &&
            (identical(other.reducedVisuals, reducedVisuals) ||
                other.reducedVisuals == reducedVisuals) &&
            (identical(other.showBadges, showBadges) ||
                other.showBadges == showBadges) &&
            (identical(other.showStreaks, showStreaks) ||
                other.showStreaks == showStreaks) &&
            (identical(other.showXp, showXp) || other.showXp == showXp));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      xpEnabled,
      streaksEnabled,
      badgesEnabled,
      kudosEnabled,
      celebrationsEnabled,
      levelsEnabled,
      showComparisons,
      preferredRewardStyle,
      muteCelebrations,
      reducedVisuals,
      showBadges,
      showStreaks,
      showXp);

  /// Create a copy of EffectiveSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$EffectiveSettingsImplCopyWith<_$EffectiveSettingsImpl> get copyWith =>
      __$$EffectiveSettingsImplCopyWithImpl<_$EffectiveSettingsImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$EffectiveSettingsImplToJson(
      this,
    );
  }
}

abstract class _EffectiveSettings implements EffectiveSettings {
  const factory _EffectiveSettings(
      {required final bool xpEnabled,
      required final bool streaksEnabled,
      required final bool badgesEnabled,
      required final bool kudosEnabled,
      required final bool celebrationsEnabled,
      required final bool levelsEnabled,
      required final bool showComparisons,
      required final RewardStyle preferredRewardStyle,
      required final bool muteCelebrations,
      required final bool reducedVisuals,
      required final bool showBadges,
      required final bool showStreaks,
      required final bool showXp}) = _$EffectiveSettingsImpl;

  factory _EffectiveSettings.fromJson(Map<String, dynamic> json) =
      _$EffectiveSettingsImpl.fromJson;

  @override
  bool get xpEnabled;
  @override
  bool get streaksEnabled;
  @override
  bool get badgesEnabled;
  @override
  bool get kudosEnabled;
  @override
  bool get celebrationsEnabled;
  @override
  bool get levelsEnabled;
  @override
  bool get showComparisons; // Learner preferences
  @override
  RewardStyle get preferredRewardStyle;
  @override
  bool get muteCelebrations;
  @override
  bool get reducedVisuals;
  @override
  bool get showBadges;
  @override
  bool get showStreaks;
  @override
  bool get showXp;

  /// Create a copy of EffectiveSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$EffectiveSettingsImplCopyWith<_$EffectiveSettingsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
