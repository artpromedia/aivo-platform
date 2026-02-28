// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EngagementProfile {
  String get id;
  String get tenantId;
  String get learnerId;
  int get level;
  int get xpTotal;
  int get xpThisWeek;
  int get xpToday;
  int get currentStreakDays;
  int get maxStreakDays;
  DateTime? get lastSessionDate;
  int get sessionsCompleted;
  int get totalMinutesLearned;
  RewardStyle get preferredRewardStyle;
  bool get muteCelebrations;
  bool get reducedVisuals;
  bool get showBadges;
  bool get showStreaks;
  bool get showXp; // Computed fields
  int get xpToNextLevel;
  int get xpProgress;
  int get xpNeeded;
  int get progressPercent;

  /// Create a copy of EngagementProfile
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $EngagementProfileCopyWith<EngagementProfile> get copyWith =>
      _$EngagementProfileCopyWithImpl<EngagementProfile>(
          this as EngagementProfile, _$identity);

  /// Serializes this EngagementProfile to a JSON map.
  Map<String, dynamic> toJson();

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is EngagementProfile &&
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

  @override
  String toString() {
    return 'EngagementProfile(id: $id, tenantId: $tenantId, learnerId: $learnerId, level: $level, xpTotal: $xpTotal, xpThisWeek: $xpThisWeek, xpToday: $xpToday, currentStreakDays: $currentStreakDays, maxStreakDays: $maxStreakDays, lastSessionDate: $lastSessionDate, sessionsCompleted: $sessionsCompleted, totalMinutesLearned: $totalMinutesLearned, preferredRewardStyle: $preferredRewardStyle, muteCelebrations: $muteCelebrations, reducedVisuals: $reducedVisuals, showBadges: $showBadges, showStreaks: $showStreaks, showXp: $showXp, xpToNextLevel: $xpToNextLevel, xpProgress: $xpProgress, xpNeeded: $xpNeeded, progressPercent: $progressPercent)';
  }
}

/// @nodoc
abstract mixin class $EngagementProfileCopyWith<$Res> {
  factory $EngagementProfileCopyWith(
          EngagementProfile value, $Res Function(EngagementProfile) _then) =
      _$EngagementProfileCopyWithImpl;
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
class _$EngagementProfileCopyWithImpl<$Res>
    implements $EngagementProfileCopyWith<$Res> {
  _$EngagementProfileCopyWithImpl(this._self, this._then);

  final EngagementProfile _self;
  final $Res Function(EngagementProfile) _then;

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
    return _then(_self.copyWith(
      id: null == id
          ? _self.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      tenantId: null == tenantId
          ? _self.tenantId
          : tenantId // ignore: cast_nullable_to_non_nullable
              as String,
      learnerId: null == learnerId
          ? _self.learnerId
          : learnerId // ignore: cast_nullable_to_non_nullable
              as String,
      level: null == level
          ? _self.level
          : level // ignore: cast_nullable_to_non_nullable
              as int,
      xpTotal: null == xpTotal
          ? _self.xpTotal
          : xpTotal // ignore: cast_nullable_to_non_nullable
              as int,
      xpThisWeek: null == xpThisWeek
          ? _self.xpThisWeek
          : xpThisWeek // ignore: cast_nullable_to_non_nullable
              as int,
      xpToday: null == xpToday
          ? _self.xpToday
          : xpToday // ignore: cast_nullable_to_non_nullable
              as int,
      currentStreakDays: null == currentStreakDays
          ? _self.currentStreakDays
          : currentStreakDays // ignore: cast_nullable_to_non_nullable
              as int,
      maxStreakDays: null == maxStreakDays
          ? _self.maxStreakDays
          : maxStreakDays // ignore: cast_nullable_to_non_nullable
              as int,
      lastSessionDate: freezed == lastSessionDate
          ? _self.lastSessionDate
          : lastSessionDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      sessionsCompleted: null == sessionsCompleted
          ? _self.sessionsCompleted
          : sessionsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      totalMinutesLearned: null == totalMinutesLearned
          ? _self.totalMinutesLearned
          : totalMinutesLearned // ignore: cast_nullable_to_non_nullable
              as int,
      preferredRewardStyle: null == preferredRewardStyle
          ? _self.preferredRewardStyle
          : preferredRewardStyle // ignore: cast_nullable_to_non_nullable
              as RewardStyle,
      muteCelebrations: null == muteCelebrations
          ? _self.muteCelebrations
          : muteCelebrations // ignore: cast_nullable_to_non_nullable
              as bool,
      reducedVisuals: null == reducedVisuals
          ? _self.reducedVisuals
          : reducedVisuals // ignore: cast_nullable_to_non_nullable
              as bool,
      showBadges: null == showBadges
          ? _self.showBadges
          : showBadges // ignore: cast_nullable_to_non_nullable
              as bool,
      showStreaks: null == showStreaks
          ? _self.showStreaks
          : showStreaks // ignore: cast_nullable_to_non_nullable
              as bool,
      showXp: null == showXp
          ? _self.showXp
          : showXp // ignore: cast_nullable_to_non_nullable
              as bool,
      xpToNextLevel: null == xpToNextLevel
          ? _self.xpToNextLevel
          : xpToNextLevel // ignore: cast_nullable_to_non_nullable
              as int,
      xpProgress: null == xpProgress
          ? _self.xpProgress
          : xpProgress // ignore: cast_nullable_to_non_nullable
              as int,
      xpNeeded: null == xpNeeded
          ? _self.xpNeeded
          : xpNeeded // ignore: cast_nullable_to_non_nullable
              as int,
      progressPercent: null == progressPercent
          ? _self.progressPercent
          : progressPercent // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// Adds pattern-matching-related methods to [EngagementProfile].
extension EngagementProfilePatterns on EngagementProfile {
  /// A variant of `map` that fallback to returning `orElse`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>(
    TResult Function(_EngagementProfile value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _EngagementProfile() when $default != null:
        return $default(_that);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// Callbacks receives the raw object, upcasted.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case final Subclass2 value:
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult map<TResult extends Object?>(
    TResult Function(_EngagementProfile value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EngagementProfile():
        return $default(_that);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `map` that fallback to returning `null`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>(
    TResult? Function(_EngagementProfile value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EngagementProfile() when $default != null:
        return $default(_that);
      case _:
        return null;
    }
  }

  /// A variant of `when` that fallback to an `orElse` callback.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>(
    TResult Function(
            String id,
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
            int progressPercent)?
        $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _EngagementProfile() when $default != null:
        return $default(
            _that.id,
            _that.tenantId,
            _that.learnerId,
            _that.level,
            _that.xpTotal,
            _that.xpThisWeek,
            _that.xpToday,
            _that.currentStreakDays,
            _that.maxStreakDays,
            _that.lastSessionDate,
            _that.sessionsCompleted,
            _that.totalMinutesLearned,
            _that.preferredRewardStyle,
            _that.muteCelebrations,
            _that.reducedVisuals,
            _that.showBadges,
            _that.showStreaks,
            _that.showXp,
            _that.xpToNextLevel,
            _that.xpProgress,
            _that.xpNeeded,
            _that.progressPercent);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// As opposed to `map`, this offers destructuring.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case Subclass2(:final field2):
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult when<TResult extends Object?>(
    TResult Function(
            String id,
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
            int progressPercent)
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EngagementProfile():
        return $default(
            _that.id,
            _that.tenantId,
            _that.learnerId,
            _that.level,
            _that.xpTotal,
            _that.xpThisWeek,
            _that.xpToday,
            _that.currentStreakDays,
            _that.maxStreakDays,
            _that.lastSessionDate,
            _that.sessionsCompleted,
            _that.totalMinutesLearned,
            _that.preferredRewardStyle,
            _that.muteCelebrations,
            _that.reducedVisuals,
            _that.showBadges,
            _that.showStreaks,
            _that.showXp,
            _that.xpToNextLevel,
            _that.xpProgress,
            _that.xpNeeded,
            _that.progressPercent);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `when` that fallback to returning `null`
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>(
    TResult? Function(
            String id,
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
            int progressPercent)?
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EngagementProfile() when $default != null:
        return $default(
            _that.id,
            _that.tenantId,
            _that.learnerId,
            _that.level,
            _that.xpTotal,
            _that.xpThisWeek,
            _that.xpToday,
            _that.currentStreakDays,
            _that.maxStreakDays,
            _that.lastSessionDate,
            _that.sessionsCompleted,
            _that.totalMinutesLearned,
            _that.preferredRewardStyle,
            _that.muteCelebrations,
            _that.reducedVisuals,
            _that.showBadges,
            _that.showStreaks,
            _that.showXp,
            _that.xpToNextLevel,
            _that.xpProgress,
            _that.xpNeeded,
            _that.progressPercent);
      case _:
        return null;
    }
  }
}

/// @nodoc
@JsonSerializable()
class _EngagementProfile implements EngagementProfile {
  const _EngagementProfile(
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
  factory _EngagementProfile.fromJson(Map<String, dynamic> json) =>
      _$EngagementProfileFromJson(json);

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

  /// Create a copy of EngagementProfile
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$EngagementProfileCopyWith<_EngagementProfile> get copyWith =>
      __$EngagementProfileCopyWithImpl<_EngagementProfile>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$EngagementProfileToJson(
      this,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _EngagementProfile &&
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

  @override
  String toString() {
    return 'EngagementProfile(id: $id, tenantId: $tenantId, learnerId: $learnerId, level: $level, xpTotal: $xpTotal, xpThisWeek: $xpThisWeek, xpToday: $xpToday, currentStreakDays: $currentStreakDays, maxStreakDays: $maxStreakDays, lastSessionDate: $lastSessionDate, sessionsCompleted: $sessionsCompleted, totalMinutesLearned: $totalMinutesLearned, preferredRewardStyle: $preferredRewardStyle, muteCelebrations: $muteCelebrations, reducedVisuals: $reducedVisuals, showBadges: $showBadges, showStreaks: $showStreaks, showXp: $showXp, xpToNextLevel: $xpToNextLevel, xpProgress: $xpProgress, xpNeeded: $xpNeeded, progressPercent: $progressPercent)';
  }
}

/// @nodoc
abstract mixin class _$EngagementProfileCopyWith<$Res>
    implements $EngagementProfileCopyWith<$Res> {
  factory _$EngagementProfileCopyWith(
          _EngagementProfile value, $Res Function(_EngagementProfile) _then) =
      __$EngagementProfileCopyWithImpl;
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
class __$EngagementProfileCopyWithImpl<$Res>
    implements _$EngagementProfileCopyWith<$Res> {
  __$EngagementProfileCopyWithImpl(this._self, this._then);

  final _EngagementProfile _self;
  final $Res Function(_EngagementProfile) _then;

  /// Create a copy of EngagementProfile
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
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
    return _then(_EngagementProfile(
      id: null == id
          ? _self.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      tenantId: null == tenantId
          ? _self.tenantId
          : tenantId // ignore: cast_nullable_to_non_nullable
              as String,
      learnerId: null == learnerId
          ? _self.learnerId
          : learnerId // ignore: cast_nullable_to_non_nullable
              as String,
      level: null == level
          ? _self.level
          : level // ignore: cast_nullable_to_non_nullable
              as int,
      xpTotal: null == xpTotal
          ? _self.xpTotal
          : xpTotal // ignore: cast_nullable_to_non_nullable
              as int,
      xpThisWeek: null == xpThisWeek
          ? _self.xpThisWeek
          : xpThisWeek // ignore: cast_nullable_to_non_nullable
              as int,
      xpToday: null == xpToday
          ? _self.xpToday
          : xpToday // ignore: cast_nullable_to_non_nullable
              as int,
      currentStreakDays: null == currentStreakDays
          ? _self.currentStreakDays
          : currentStreakDays // ignore: cast_nullable_to_non_nullable
              as int,
      maxStreakDays: null == maxStreakDays
          ? _self.maxStreakDays
          : maxStreakDays // ignore: cast_nullable_to_non_nullable
              as int,
      lastSessionDate: freezed == lastSessionDate
          ? _self.lastSessionDate
          : lastSessionDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      sessionsCompleted: null == sessionsCompleted
          ? _self.sessionsCompleted
          : sessionsCompleted // ignore: cast_nullable_to_non_nullable
              as int,
      totalMinutesLearned: null == totalMinutesLearned
          ? _self.totalMinutesLearned
          : totalMinutesLearned // ignore: cast_nullable_to_non_nullable
              as int,
      preferredRewardStyle: null == preferredRewardStyle
          ? _self.preferredRewardStyle
          : preferredRewardStyle // ignore: cast_nullable_to_non_nullable
              as RewardStyle,
      muteCelebrations: null == muteCelebrations
          ? _self.muteCelebrations
          : muteCelebrations // ignore: cast_nullable_to_non_nullable
              as bool,
      reducedVisuals: null == reducedVisuals
          ? _self.reducedVisuals
          : reducedVisuals // ignore: cast_nullable_to_non_nullable
              as bool,
      showBadges: null == showBadges
          ? _self.showBadges
          : showBadges // ignore: cast_nullable_to_non_nullable
              as bool,
      showStreaks: null == showStreaks
          ? _self.showStreaks
          : showStreaks // ignore: cast_nullable_to_non_nullable
              as bool,
      showXp: null == showXp
          ? _self.showXp
          : showXp // ignore: cast_nullable_to_non_nullable
              as bool,
      xpToNextLevel: null == xpToNextLevel
          ? _self.xpToNextLevel
          : xpToNextLevel // ignore: cast_nullable_to_non_nullable
              as int,
      xpProgress: null == xpProgress
          ? _self.xpProgress
          : xpProgress // ignore: cast_nullable_to_non_nullable
              as int,
      xpNeeded: null == xpNeeded
          ? _self.xpNeeded
          : xpNeeded // ignore: cast_nullable_to_non_nullable
              as int,
      progressPercent: null == progressPercent
          ? _self.progressPercent
          : progressPercent // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
mixin _$Badge {
  String get code;
  String get name;
  String get description;
  BadgeCategory get category;
  String get iconKey;
  bool get isSecret;

  /// Create a copy of Badge
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $BadgeCopyWith<Badge> get copyWith =>
      _$BadgeCopyWithImpl<Badge>(this as Badge, _$identity);

  /// Serializes this Badge to a JSON map.
  Map<String, dynamic> toJson();

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is Badge &&
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

  @override
  String toString() {
    return 'Badge(code: $code, name: $name, description: $description, category: $category, iconKey: $iconKey, isSecret: $isSecret)';
  }
}

/// @nodoc
abstract mixin class $BadgeCopyWith<$Res> {
  factory $BadgeCopyWith(Badge value, $Res Function(Badge) _then) =
      _$BadgeCopyWithImpl;
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
class _$BadgeCopyWithImpl<$Res> implements $BadgeCopyWith<$Res> {
  _$BadgeCopyWithImpl(this._self, this._then);

  final Badge _self;
  final $Res Function(Badge) _then;

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
    return _then(_self.copyWith(
      code: null == code
          ? _self.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _self.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _self.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _self.category
          : category // ignore: cast_nullable_to_non_nullable
              as BadgeCategory,
      iconKey: null == iconKey
          ? _self.iconKey
          : iconKey // ignore: cast_nullable_to_non_nullable
              as String,
      isSecret: null == isSecret
          ? _self.isSecret
          : isSecret // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// Adds pattern-matching-related methods to [Badge].
extension BadgePatterns on Badge {
  /// A variant of `map` that fallback to returning `orElse`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>(
    TResult Function(_Badge value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _Badge() when $default != null:
        return $default(_that);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// Callbacks receives the raw object, upcasted.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case final Subclass2 value:
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult map<TResult extends Object?>(
    TResult Function(_Badge value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _Badge():
        return $default(_that);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `map` that fallback to returning `null`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>(
    TResult? Function(_Badge value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _Badge() when $default != null:
        return $default(_that);
      case _:
        return null;
    }
  }

  /// A variant of `when` that fallback to an `orElse` callback.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>(
    TResult Function(String code, String name, String description,
            BadgeCategory category, String iconKey, bool isSecret)?
        $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _Badge() when $default != null:
        return $default(_that.code, _that.name, _that.description,
            _that.category, _that.iconKey, _that.isSecret);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// As opposed to `map`, this offers destructuring.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case Subclass2(:final field2):
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult when<TResult extends Object?>(
    TResult Function(String code, String name, String description,
            BadgeCategory category, String iconKey, bool isSecret)
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _Badge():
        return $default(_that.code, _that.name, _that.description,
            _that.category, _that.iconKey, _that.isSecret);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `when` that fallback to returning `null`
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>(
    TResult? Function(String code, String name, String description,
            BadgeCategory category, String iconKey, bool isSecret)?
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _Badge() when $default != null:
        return $default(_that.code, _that.name, _that.description,
            _that.category, _that.iconKey, _that.isSecret);
      case _:
        return null;
    }
  }
}

/// @nodoc
@JsonSerializable()
class _Badge implements Badge {
  const _Badge(
      {required this.code,
      required this.name,
      required this.description,
      required this.category,
      required this.iconKey,
      this.isSecret = false});
  factory _Badge.fromJson(Map<String, dynamic> json) => _$BadgeFromJson(json);

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

  /// Create a copy of Badge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$BadgeCopyWith<_Badge> get copyWith =>
      __$BadgeCopyWithImpl<_Badge>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$BadgeToJson(
      this,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _Badge &&
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

  @override
  String toString() {
    return 'Badge(code: $code, name: $name, description: $description, category: $category, iconKey: $iconKey, isSecret: $isSecret)';
  }
}

/// @nodoc
abstract mixin class _$BadgeCopyWith<$Res> implements $BadgeCopyWith<$Res> {
  factory _$BadgeCopyWith(_Badge value, $Res Function(_Badge) _then) =
      __$BadgeCopyWithImpl;
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
class __$BadgeCopyWithImpl<$Res> implements _$BadgeCopyWith<$Res> {
  __$BadgeCopyWithImpl(this._self, this._then);

  final _Badge _self;
  final $Res Function(_Badge) _then;

  /// Create a copy of Badge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $Res call({
    Object? code = null,
    Object? name = null,
    Object? description = null,
    Object? category = null,
    Object? iconKey = null,
    Object? isSecret = null,
  }) {
    return _then(_Badge(
      code: null == code
          ? _self.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _self.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _self.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _self.category
          : category // ignore: cast_nullable_to_non_nullable
              as BadgeCategory,
      iconKey: null == iconKey
          ? _self.iconKey
          : iconKey // ignore: cast_nullable_to_non_nullable
              as String,
      isSecret: null == isSecret
          ? _self.isSecret
          : isSecret // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
mixin _$LearnerBadge {
  String get id;
  String get badgeCode;
  String get badgeName;
  String get badgeDescription;
  BadgeCategory get category;
  String get iconKey;
  DateTime get awardedAt;
  DateTime? get firstSeenAt;
  String get source;
  String? get note;

  /// Create a copy of LearnerBadge
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $LearnerBadgeCopyWith<LearnerBadge> get copyWith =>
      _$LearnerBadgeCopyWithImpl<LearnerBadge>(
          this as LearnerBadge, _$identity);

  /// Serializes this LearnerBadge to a JSON map.
  Map<String, dynamic> toJson();

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is LearnerBadge &&
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

  @override
  String toString() {
    return 'LearnerBadge(id: $id, badgeCode: $badgeCode, badgeName: $badgeName, badgeDescription: $badgeDescription, category: $category, iconKey: $iconKey, awardedAt: $awardedAt, firstSeenAt: $firstSeenAt, source: $source, note: $note)';
  }
}

/// @nodoc
abstract mixin class $LearnerBadgeCopyWith<$Res> {
  factory $LearnerBadgeCopyWith(
          LearnerBadge value, $Res Function(LearnerBadge) _then) =
      _$LearnerBadgeCopyWithImpl;
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
class _$LearnerBadgeCopyWithImpl<$Res> implements $LearnerBadgeCopyWith<$Res> {
  _$LearnerBadgeCopyWithImpl(this._self, this._then);

  final LearnerBadge _self;
  final $Res Function(LearnerBadge) _then;

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
    return _then(_self.copyWith(
      id: null == id
          ? _self.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      badgeCode: null == badgeCode
          ? _self.badgeCode
          : badgeCode // ignore: cast_nullable_to_non_nullable
              as String,
      badgeName: null == badgeName
          ? _self.badgeName
          : badgeName // ignore: cast_nullable_to_non_nullable
              as String,
      badgeDescription: null == badgeDescription
          ? _self.badgeDescription
          : badgeDescription // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _self.category
          : category // ignore: cast_nullable_to_non_nullable
              as BadgeCategory,
      iconKey: null == iconKey
          ? _self.iconKey
          : iconKey // ignore: cast_nullable_to_non_nullable
              as String,
      awardedAt: null == awardedAt
          ? _self.awardedAt
          : awardedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      firstSeenAt: freezed == firstSeenAt
          ? _self.firstSeenAt
          : firstSeenAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      source: null == source
          ? _self.source
          : source // ignore: cast_nullable_to_non_nullable
              as String,
      note: freezed == note
          ? _self.note
          : note // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// Adds pattern-matching-related methods to [LearnerBadge].
extension LearnerBadgePatterns on LearnerBadge {
  /// A variant of `map` that fallback to returning `orElse`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>(
    TResult Function(_LearnerBadge value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _LearnerBadge() when $default != null:
        return $default(_that);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// Callbacks receives the raw object, upcasted.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case final Subclass2 value:
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult map<TResult extends Object?>(
    TResult Function(_LearnerBadge value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _LearnerBadge():
        return $default(_that);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `map` that fallback to returning `null`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>(
    TResult? Function(_LearnerBadge value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _LearnerBadge() when $default != null:
        return $default(_that);
      case _:
        return null;
    }
  }

  /// A variant of `when` that fallback to an `orElse` callback.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>(
    TResult Function(
            String id,
            String badgeCode,
            String badgeName,
            String badgeDescription,
            BadgeCategory category,
            String iconKey,
            DateTime awardedAt,
            DateTime? firstSeenAt,
            String source,
            String? note)?
        $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _LearnerBadge() when $default != null:
        return $default(
            _that.id,
            _that.badgeCode,
            _that.badgeName,
            _that.badgeDescription,
            _that.category,
            _that.iconKey,
            _that.awardedAt,
            _that.firstSeenAt,
            _that.source,
            _that.note);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// As opposed to `map`, this offers destructuring.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case Subclass2(:final field2):
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult when<TResult extends Object?>(
    TResult Function(
            String id,
            String badgeCode,
            String badgeName,
            String badgeDescription,
            BadgeCategory category,
            String iconKey,
            DateTime awardedAt,
            DateTime? firstSeenAt,
            String source,
            String? note)
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _LearnerBadge():
        return $default(
            _that.id,
            _that.badgeCode,
            _that.badgeName,
            _that.badgeDescription,
            _that.category,
            _that.iconKey,
            _that.awardedAt,
            _that.firstSeenAt,
            _that.source,
            _that.note);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `when` that fallback to returning `null`
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>(
    TResult? Function(
            String id,
            String badgeCode,
            String badgeName,
            String badgeDescription,
            BadgeCategory category,
            String iconKey,
            DateTime awardedAt,
            DateTime? firstSeenAt,
            String source,
            String? note)?
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _LearnerBadge() when $default != null:
        return $default(
            _that.id,
            _that.badgeCode,
            _that.badgeName,
            _that.badgeDescription,
            _that.category,
            _that.iconKey,
            _that.awardedAt,
            _that.firstSeenAt,
            _that.source,
            _that.note);
      case _:
        return null;
    }
  }
}

/// @nodoc
@JsonSerializable()
class _LearnerBadge implements LearnerBadge {
  const _LearnerBadge(
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
  factory _LearnerBadge.fromJson(Map<String, dynamic> json) =>
      _$LearnerBadgeFromJson(json);

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

  /// Create a copy of LearnerBadge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$LearnerBadgeCopyWith<_LearnerBadge> get copyWith =>
      __$LearnerBadgeCopyWithImpl<_LearnerBadge>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$LearnerBadgeToJson(
      this,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _LearnerBadge &&
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

  @override
  String toString() {
    return 'LearnerBadge(id: $id, badgeCode: $badgeCode, badgeName: $badgeName, badgeDescription: $badgeDescription, category: $category, iconKey: $iconKey, awardedAt: $awardedAt, firstSeenAt: $firstSeenAt, source: $source, note: $note)';
  }
}

/// @nodoc
abstract mixin class _$LearnerBadgeCopyWith<$Res>
    implements $LearnerBadgeCopyWith<$Res> {
  factory _$LearnerBadgeCopyWith(
          _LearnerBadge value, $Res Function(_LearnerBadge) _then) =
      __$LearnerBadgeCopyWithImpl;
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
class __$LearnerBadgeCopyWithImpl<$Res>
    implements _$LearnerBadgeCopyWith<$Res> {
  __$LearnerBadgeCopyWithImpl(this._self, this._then);

  final _LearnerBadge _self;
  final $Res Function(_LearnerBadge) _then;

  /// Create a copy of LearnerBadge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
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
    return _then(_LearnerBadge(
      id: null == id
          ? _self.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      badgeCode: null == badgeCode
          ? _self.badgeCode
          : badgeCode // ignore: cast_nullable_to_non_nullable
              as String,
      badgeName: null == badgeName
          ? _self.badgeName
          : badgeName // ignore: cast_nullable_to_non_nullable
              as String,
      badgeDescription: null == badgeDescription
          ? _self.badgeDescription
          : badgeDescription // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _self.category
          : category // ignore: cast_nullable_to_non_nullable
              as BadgeCategory,
      iconKey: null == iconKey
          ? _self.iconKey
          : iconKey // ignore: cast_nullable_to_non_nullable
              as String,
      awardedAt: null == awardedAt
          ? _self.awardedAt
          : awardedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      firstSeenAt: freezed == firstSeenAt
          ? _self.firstSeenAt
          : firstSeenAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      source: null == source
          ? _self.source
          : source // ignore: cast_nullable_to_non_nullable
              as String,
      note: freezed == note
          ? _self.note
          : note // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
mixin _$BadgeProgress {
  String get badgeCode;
  String get badgeName;
  String get badgeDescription;
  BadgeCategory get category;
  String get iconKey;
  int get progress;
  int get target;
  int get progressPercent;
  bool get earned;

  /// Create a copy of BadgeProgress
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $BadgeProgressCopyWith<BadgeProgress> get copyWith =>
      _$BadgeProgressCopyWithImpl<BadgeProgress>(
          this as BadgeProgress, _$identity);

  /// Serializes this BadgeProgress to a JSON map.
  Map<String, dynamic> toJson();

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is BadgeProgress &&
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

  @override
  String toString() {
    return 'BadgeProgress(badgeCode: $badgeCode, badgeName: $badgeName, badgeDescription: $badgeDescription, category: $category, iconKey: $iconKey, progress: $progress, target: $target, progressPercent: $progressPercent, earned: $earned)';
  }
}

/// @nodoc
abstract mixin class $BadgeProgressCopyWith<$Res> {
  factory $BadgeProgressCopyWith(
          BadgeProgress value, $Res Function(BadgeProgress) _then) =
      _$BadgeProgressCopyWithImpl;
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
class _$BadgeProgressCopyWithImpl<$Res>
    implements $BadgeProgressCopyWith<$Res> {
  _$BadgeProgressCopyWithImpl(this._self, this._then);

  final BadgeProgress _self;
  final $Res Function(BadgeProgress) _then;

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
    return _then(_self.copyWith(
      badgeCode: null == badgeCode
          ? _self.badgeCode
          : badgeCode // ignore: cast_nullable_to_non_nullable
              as String,
      badgeName: null == badgeName
          ? _self.badgeName
          : badgeName // ignore: cast_nullable_to_non_nullable
              as String,
      badgeDescription: null == badgeDescription
          ? _self.badgeDescription
          : badgeDescription // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _self.category
          : category // ignore: cast_nullable_to_non_nullable
              as BadgeCategory,
      iconKey: null == iconKey
          ? _self.iconKey
          : iconKey // ignore: cast_nullable_to_non_nullable
              as String,
      progress: null == progress
          ? _self.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as int,
      target: null == target
          ? _self.target
          : target // ignore: cast_nullable_to_non_nullable
              as int,
      progressPercent: null == progressPercent
          ? _self.progressPercent
          : progressPercent // ignore: cast_nullable_to_non_nullable
              as int,
      earned: null == earned
          ? _self.earned
          : earned // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// Adds pattern-matching-related methods to [BadgeProgress].
extension BadgeProgressPatterns on BadgeProgress {
  /// A variant of `map` that fallback to returning `orElse`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>(
    TResult Function(_BadgeProgress value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _BadgeProgress() when $default != null:
        return $default(_that);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// Callbacks receives the raw object, upcasted.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case final Subclass2 value:
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult map<TResult extends Object?>(
    TResult Function(_BadgeProgress value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _BadgeProgress():
        return $default(_that);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `map` that fallback to returning `null`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>(
    TResult? Function(_BadgeProgress value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _BadgeProgress() when $default != null:
        return $default(_that);
      case _:
        return null;
    }
  }

  /// A variant of `when` that fallback to an `orElse` callback.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>(
    TResult Function(
            String badgeCode,
            String badgeName,
            String badgeDescription,
            BadgeCategory category,
            String iconKey,
            int progress,
            int target,
            int progressPercent,
            bool earned)?
        $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _BadgeProgress() when $default != null:
        return $default(
            _that.badgeCode,
            _that.badgeName,
            _that.badgeDescription,
            _that.category,
            _that.iconKey,
            _that.progress,
            _that.target,
            _that.progressPercent,
            _that.earned);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// As opposed to `map`, this offers destructuring.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case Subclass2(:final field2):
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult when<TResult extends Object?>(
    TResult Function(
            String badgeCode,
            String badgeName,
            String badgeDescription,
            BadgeCategory category,
            String iconKey,
            int progress,
            int target,
            int progressPercent,
            bool earned)
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _BadgeProgress():
        return $default(
            _that.badgeCode,
            _that.badgeName,
            _that.badgeDescription,
            _that.category,
            _that.iconKey,
            _that.progress,
            _that.target,
            _that.progressPercent,
            _that.earned);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `when` that fallback to returning `null`
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>(
    TResult? Function(
            String badgeCode,
            String badgeName,
            String badgeDescription,
            BadgeCategory category,
            String iconKey,
            int progress,
            int target,
            int progressPercent,
            bool earned)?
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _BadgeProgress() when $default != null:
        return $default(
            _that.badgeCode,
            _that.badgeName,
            _that.badgeDescription,
            _that.category,
            _that.iconKey,
            _that.progress,
            _that.target,
            _that.progressPercent,
            _that.earned);
      case _:
        return null;
    }
  }
}

/// @nodoc
@JsonSerializable()
class _BadgeProgress implements BadgeProgress {
  const _BadgeProgress(
      {required this.badgeCode,
      required this.badgeName,
      required this.badgeDescription,
      required this.category,
      required this.iconKey,
      required this.progress,
      required this.target,
      required this.progressPercent,
      required this.earned});
  factory _BadgeProgress.fromJson(Map<String, dynamic> json) =>
      _$BadgeProgressFromJson(json);

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

  /// Create a copy of BadgeProgress
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$BadgeProgressCopyWith<_BadgeProgress> get copyWith =>
      __$BadgeProgressCopyWithImpl<_BadgeProgress>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$BadgeProgressToJson(
      this,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _BadgeProgress &&
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

  @override
  String toString() {
    return 'BadgeProgress(badgeCode: $badgeCode, badgeName: $badgeName, badgeDescription: $badgeDescription, category: $category, iconKey: $iconKey, progress: $progress, target: $target, progressPercent: $progressPercent, earned: $earned)';
  }
}

/// @nodoc
abstract mixin class _$BadgeProgressCopyWith<$Res>
    implements $BadgeProgressCopyWith<$Res> {
  factory _$BadgeProgressCopyWith(
          _BadgeProgress value, $Res Function(_BadgeProgress) _then) =
      __$BadgeProgressCopyWithImpl;
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
class __$BadgeProgressCopyWithImpl<$Res>
    implements _$BadgeProgressCopyWith<$Res> {
  __$BadgeProgressCopyWithImpl(this._self, this._then);

  final _BadgeProgress _self;
  final $Res Function(_BadgeProgress) _then;

  /// Create a copy of BadgeProgress
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
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
    return _then(_BadgeProgress(
      badgeCode: null == badgeCode
          ? _self.badgeCode
          : badgeCode // ignore: cast_nullable_to_non_nullable
              as String,
      badgeName: null == badgeName
          ? _self.badgeName
          : badgeName // ignore: cast_nullable_to_non_nullable
              as String,
      badgeDescription: null == badgeDescription
          ? _self.badgeDescription
          : badgeDescription // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _self.category
          : category // ignore: cast_nullable_to_non_nullable
              as BadgeCategory,
      iconKey: null == iconKey
          ? _self.iconKey
          : iconKey // ignore: cast_nullable_to_non_nullable
              as String,
      progress: null == progress
          ? _self.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as int,
      target: null == target
          ? _self.target
          : target // ignore: cast_nullable_to_non_nullable
              as int,
      progressPercent: null == progressPercent
          ? _self.progressPercent
          : progressPercent // ignore: cast_nullable_to_non_nullable
              as int,
      earned: null == earned
          ? _self.earned
          : earned // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
mixin _$Kudos {
  String get id;
  String get tenantId;
  String get learnerId;
  String get fromUserId;
  String get fromRole;
  String? get fromName;
  String get message;
  String? get emoji;
  String get context;
  String? get linkedSessionId;
  String? get linkedActionPlanId;
  bool get visibleToLearner;
  DateTime? get readAt;
  DateTime get createdAt;

  /// Create a copy of Kudos
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $KudosCopyWith<Kudos> get copyWith =>
      _$KudosCopyWithImpl<Kudos>(this as Kudos, _$identity);

  /// Serializes this Kudos to a JSON map.
  Map<String, dynamic> toJson();

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is Kudos &&
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

  @override
  String toString() {
    return 'Kudos(id: $id, tenantId: $tenantId, learnerId: $learnerId, fromUserId: $fromUserId, fromRole: $fromRole, fromName: $fromName, message: $message, emoji: $emoji, context: $context, linkedSessionId: $linkedSessionId, linkedActionPlanId: $linkedActionPlanId, visibleToLearner: $visibleToLearner, readAt: $readAt, createdAt: $createdAt)';
  }
}

/// @nodoc
abstract mixin class $KudosCopyWith<$Res> {
  factory $KudosCopyWith(Kudos value, $Res Function(Kudos) _then) =
      _$KudosCopyWithImpl;
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
class _$KudosCopyWithImpl<$Res> implements $KudosCopyWith<$Res> {
  _$KudosCopyWithImpl(this._self, this._then);

  final Kudos _self;
  final $Res Function(Kudos) _then;

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
    return _then(_self.copyWith(
      id: null == id
          ? _self.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      tenantId: null == tenantId
          ? _self.tenantId
          : tenantId // ignore: cast_nullable_to_non_nullable
              as String,
      learnerId: null == learnerId
          ? _self.learnerId
          : learnerId // ignore: cast_nullable_to_non_nullable
              as String,
      fromUserId: null == fromUserId
          ? _self.fromUserId
          : fromUserId // ignore: cast_nullable_to_non_nullable
              as String,
      fromRole: null == fromRole
          ? _self.fromRole
          : fromRole // ignore: cast_nullable_to_non_nullable
              as String,
      fromName: freezed == fromName
          ? _self.fromName
          : fromName // ignore: cast_nullable_to_non_nullable
              as String?,
      message: null == message
          ? _self.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      emoji: freezed == emoji
          ? _self.emoji
          : emoji // ignore: cast_nullable_to_non_nullable
              as String?,
      context: null == context
          ? _self.context
          : context // ignore: cast_nullable_to_non_nullable
              as String,
      linkedSessionId: freezed == linkedSessionId
          ? _self.linkedSessionId
          : linkedSessionId // ignore: cast_nullable_to_non_nullable
              as String?,
      linkedActionPlanId: freezed == linkedActionPlanId
          ? _self.linkedActionPlanId
          : linkedActionPlanId // ignore: cast_nullable_to_non_nullable
              as String?,
      visibleToLearner: null == visibleToLearner
          ? _self.visibleToLearner
          : visibleToLearner // ignore: cast_nullable_to_non_nullable
              as bool,
      readAt: freezed == readAt
          ? _self.readAt
          : readAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      createdAt: null == createdAt
          ? _self.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
    ));
  }
}

/// Adds pattern-matching-related methods to [Kudos].
extension KudosPatterns on Kudos {
  /// A variant of `map` that fallback to returning `orElse`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>(
    TResult Function(_Kudos value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _Kudos() when $default != null:
        return $default(_that);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// Callbacks receives the raw object, upcasted.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case final Subclass2 value:
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult map<TResult extends Object?>(
    TResult Function(_Kudos value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _Kudos():
        return $default(_that);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `map` that fallback to returning `null`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>(
    TResult? Function(_Kudos value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _Kudos() when $default != null:
        return $default(_that);
      case _:
        return null;
    }
  }

  /// A variant of `when` that fallback to an `orElse` callback.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>(
    TResult Function(
            String id,
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
            DateTime createdAt)?
        $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _Kudos() when $default != null:
        return $default(
            _that.id,
            _that.tenantId,
            _that.learnerId,
            _that.fromUserId,
            _that.fromRole,
            _that.fromName,
            _that.message,
            _that.emoji,
            _that.context,
            _that.linkedSessionId,
            _that.linkedActionPlanId,
            _that.visibleToLearner,
            _that.readAt,
            _that.createdAt);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// As opposed to `map`, this offers destructuring.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case Subclass2(:final field2):
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult when<TResult extends Object?>(
    TResult Function(
            String id,
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
            DateTime createdAt)
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _Kudos():
        return $default(
            _that.id,
            _that.tenantId,
            _that.learnerId,
            _that.fromUserId,
            _that.fromRole,
            _that.fromName,
            _that.message,
            _that.emoji,
            _that.context,
            _that.linkedSessionId,
            _that.linkedActionPlanId,
            _that.visibleToLearner,
            _that.readAt,
            _that.createdAt);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `when` that fallback to returning `null`
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>(
    TResult? Function(
            String id,
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
            DateTime createdAt)?
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _Kudos() when $default != null:
        return $default(
            _that.id,
            _that.tenantId,
            _that.learnerId,
            _that.fromUserId,
            _that.fromRole,
            _that.fromName,
            _that.message,
            _that.emoji,
            _that.context,
            _that.linkedSessionId,
            _that.linkedActionPlanId,
            _that.visibleToLearner,
            _that.readAt,
            _that.createdAt);
      case _:
        return null;
    }
  }
}

/// @nodoc
@JsonSerializable()
class _Kudos implements Kudos {
  const _Kudos(
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
  factory _Kudos.fromJson(Map<String, dynamic> json) => _$KudosFromJson(json);

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

  /// Create a copy of Kudos
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$KudosCopyWith<_Kudos> get copyWith =>
      __$KudosCopyWithImpl<_Kudos>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$KudosToJson(
      this,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _Kudos &&
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

  @override
  String toString() {
    return 'Kudos(id: $id, tenantId: $tenantId, learnerId: $learnerId, fromUserId: $fromUserId, fromRole: $fromRole, fromName: $fromName, message: $message, emoji: $emoji, context: $context, linkedSessionId: $linkedSessionId, linkedActionPlanId: $linkedActionPlanId, visibleToLearner: $visibleToLearner, readAt: $readAt, createdAt: $createdAt)';
  }
}

/// @nodoc
abstract mixin class _$KudosCopyWith<$Res> implements $KudosCopyWith<$Res> {
  factory _$KudosCopyWith(_Kudos value, $Res Function(_Kudos) _then) =
      __$KudosCopyWithImpl;
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
class __$KudosCopyWithImpl<$Res> implements _$KudosCopyWith<$Res> {
  __$KudosCopyWithImpl(this._self, this._then);

  final _Kudos _self;
  final $Res Function(_Kudos) _then;

  /// Create a copy of Kudos
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
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
    return _then(_Kudos(
      id: null == id
          ? _self.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      tenantId: null == tenantId
          ? _self.tenantId
          : tenantId // ignore: cast_nullable_to_non_nullable
              as String,
      learnerId: null == learnerId
          ? _self.learnerId
          : learnerId // ignore: cast_nullable_to_non_nullable
              as String,
      fromUserId: null == fromUserId
          ? _self.fromUserId
          : fromUserId // ignore: cast_nullable_to_non_nullable
              as String,
      fromRole: null == fromRole
          ? _self.fromRole
          : fromRole // ignore: cast_nullable_to_non_nullable
              as String,
      fromName: freezed == fromName
          ? _self.fromName
          : fromName // ignore: cast_nullable_to_non_nullable
              as String?,
      message: null == message
          ? _self.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      emoji: freezed == emoji
          ? _self.emoji
          : emoji // ignore: cast_nullable_to_non_nullable
              as String?,
      context: null == context
          ? _self.context
          : context // ignore: cast_nullable_to_non_nullable
              as String,
      linkedSessionId: freezed == linkedSessionId
          ? _self.linkedSessionId
          : linkedSessionId // ignore: cast_nullable_to_non_nullable
              as String?,
      linkedActionPlanId: freezed == linkedActionPlanId
          ? _self.linkedActionPlanId
          : linkedActionPlanId // ignore: cast_nullable_to_non_nullable
              as String?,
      visibleToLearner: null == visibleToLearner
          ? _self.visibleToLearner
          : visibleToLearner // ignore: cast_nullable_to_non_nullable
              as bool,
      readAt: freezed == readAt
          ? _self.readAt
          : readAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      createdAt: null == createdAt
          ? _self.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
    ));
  }
}

/// @nodoc
mixin _$EngagementEventResult {
  int get xpAwarded;
  int get newLevel;
  int get newXpTotal;
  int get streakDays;
  bool get leveledUp;
  int get previousLevel;
  bool get streakUpdated;
  int get previousStreak;
  List<BadgeAward> get awardedBadges;

  /// Create a copy of EngagementEventResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $EngagementEventResultCopyWith<EngagementEventResult> get copyWith =>
      _$EngagementEventResultCopyWithImpl<EngagementEventResult>(
          this as EngagementEventResult, _$identity);

  /// Serializes this EngagementEventResult to a JSON map.
  Map<String, dynamic> toJson();

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is EngagementEventResult &&
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
                .equals(other.awardedBadges, awardedBadges));
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
      const DeepCollectionEquality().hash(awardedBadges));

  @override
  String toString() {
    return 'EngagementEventResult(xpAwarded: $xpAwarded, newLevel: $newLevel, newXpTotal: $newXpTotal, streakDays: $streakDays, leveledUp: $leveledUp, previousLevel: $previousLevel, streakUpdated: $streakUpdated, previousStreak: $previousStreak, awardedBadges: $awardedBadges)';
  }
}

/// @nodoc
abstract mixin class $EngagementEventResultCopyWith<$Res> {
  factory $EngagementEventResultCopyWith(EngagementEventResult value,
          $Res Function(EngagementEventResult) _then) =
      _$EngagementEventResultCopyWithImpl;
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
class _$EngagementEventResultCopyWithImpl<$Res>
    implements $EngagementEventResultCopyWith<$Res> {
  _$EngagementEventResultCopyWithImpl(this._self, this._then);

  final EngagementEventResult _self;
  final $Res Function(EngagementEventResult) _then;

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
    return _then(_self.copyWith(
      xpAwarded: null == xpAwarded
          ? _self.xpAwarded
          : xpAwarded // ignore: cast_nullable_to_non_nullable
              as int,
      newLevel: null == newLevel
          ? _self.newLevel
          : newLevel // ignore: cast_nullable_to_non_nullable
              as int,
      newXpTotal: null == newXpTotal
          ? _self.newXpTotal
          : newXpTotal // ignore: cast_nullable_to_non_nullable
              as int,
      streakDays: null == streakDays
          ? _self.streakDays
          : streakDays // ignore: cast_nullable_to_non_nullable
              as int,
      leveledUp: null == leveledUp
          ? _self.leveledUp
          : leveledUp // ignore: cast_nullable_to_non_nullable
              as bool,
      previousLevel: null == previousLevel
          ? _self.previousLevel
          : previousLevel // ignore: cast_nullable_to_non_nullable
              as int,
      streakUpdated: null == streakUpdated
          ? _self.streakUpdated
          : streakUpdated // ignore: cast_nullable_to_non_nullable
              as bool,
      previousStreak: null == previousStreak
          ? _self.previousStreak
          : previousStreak // ignore: cast_nullable_to_non_nullable
              as int,
      awardedBadges: null == awardedBadges
          ? _self.awardedBadges
          : awardedBadges // ignore: cast_nullable_to_non_nullable
              as List<BadgeAward>,
    ));
  }
}

/// Adds pattern-matching-related methods to [EngagementEventResult].
extension EngagementEventResultPatterns on EngagementEventResult {
  /// A variant of `map` that fallback to returning `orElse`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>(
    TResult Function(_EngagementEventResult value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _EngagementEventResult() when $default != null:
        return $default(_that);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// Callbacks receives the raw object, upcasted.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case final Subclass2 value:
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult map<TResult extends Object?>(
    TResult Function(_EngagementEventResult value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EngagementEventResult():
        return $default(_that);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `map` that fallback to returning `null`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>(
    TResult? Function(_EngagementEventResult value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EngagementEventResult() when $default != null:
        return $default(_that);
      case _:
        return null;
    }
  }

  /// A variant of `when` that fallback to an `orElse` callback.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>(
    TResult Function(
            int xpAwarded,
            int newLevel,
            int newXpTotal,
            int streakDays,
            bool leveledUp,
            int previousLevel,
            bool streakUpdated,
            int previousStreak,
            List<BadgeAward> awardedBadges)?
        $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _EngagementEventResult() when $default != null:
        return $default(
            _that.xpAwarded,
            _that.newLevel,
            _that.newXpTotal,
            _that.streakDays,
            _that.leveledUp,
            _that.previousLevel,
            _that.streakUpdated,
            _that.previousStreak,
            _that.awardedBadges);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// As opposed to `map`, this offers destructuring.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case Subclass2(:final field2):
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult when<TResult extends Object?>(
    TResult Function(
            int xpAwarded,
            int newLevel,
            int newXpTotal,
            int streakDays,
            bool leveledUp,
            int previousLevel,
            bool streakUpdated,
            int previousStreak,
            List<BadgeAward> awardedBadges)
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EngagementEventResult():
        return $default(
            _that.xpAwarded,
            _that.newLevel,
            _that.newXpTotal,
            _that.streakDays,
            _that.leveledUp,
            _that.previousLevel,
            _that.streakUpdated,
            _that.previousStreak,
            _that.awardedBadges);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `when` that fallback to returning `null`
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>(
    TResult? Function(
            int xpAwarded,
            int newLevel,
            int newXpTotal,
            int streakDays,
            bool leveledUp,
            int previousLevel,
            bool streakUpdated,
            int previousStreak,
            List<BadgeAward> awardedBadges)?
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EngagementEventResult() when $default != null:
        return $default(
            _that.xpAwarded,
            _that.newLevel,
            _that.newXpTotal,
            _that.streakDays,
            _that.leveledUp,
            _that.previousLevel,
            _that.streakUpdated,
            _that.previousStreak,
            _that.awardedBadges);
      case _:
        return null;
    }
  }
}

/// @nodoc
@JsonSerializable()
class _EngagementEventResult implements EngagementEventResult {
  const _EngagementEventResult(
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
  factory _EngagementEventResult.fromJson(Map<String, dynamic> json) =>
      _$EngagementEventResultFromJson(json);

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

  /// Create a copy of EngagementEventResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$EngagementEventResultCopyWith<_EngagementEventResult> get copyWith =>
      __$EngagementEventResultCopyWithImpl<_EngagementEventResult>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$EngagementEventResultToJson(
      this,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _EngagementEventResult &&
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

  @override
  String toString() {
    return 'EngagementEventResult(xpAwarded: $xpAwarded, newLevel: $newLevel, newXpTotal: $newXpTotal, streakDays: $streakDays, leveledUp: $leveledUp, previousLevel: $previousLevel, streakUpdated: $streakUpdated, previousStreak: $previousStreak, awardedBadges: $awardedBadges)';
  }
}

/// @nodoc
abstract mixin class _$EngagementEventResultCopyWith<$Res>
    implements $EngagementEventResultCopyWith<$Res> {
  factory _$EngagementEventResultCopyWith(_EngagementEventResult value,
          $Res Function(_EngagementEventResult) _then) =
      __$EngagementEventResultCopyWithImpl;
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
class __$EngagementEventResultCopyWithImpl<$Res>
    implements _$EngagementEventResultCopyWith<$Res> {
  __$EngagementEventResultCopyWithImpl(this._self, this._then);

  final _EngagementEventResult _self;
  final $Res Function(_EngagementEventResult) _then;

  /// Create a copy of EngagementEventResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
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
    return _then(_EngagementEventResult(
      xpAwarded: null == xpAwarded
          ? _self.xpAwarded
          : xpAwarded // ignore: cast_nullable_to_non_nullable
              as int,
      newLevel: null == newLevel
          ? _self.newLevel
          : newLevel // ignore: cast_nullable_to_non_nullable
              as int,
      newXpTotal: null == newXpTotal
          ? _self.newXpTotal
          : newXpTotal // ignore: cast_nullable_to_non_nullable
              as int,
      streakDays: null == streakDays
          ? _self.streakDays
          : streakDays // ignore: cast_nullable_to_non_nullable
              as int,
      leveledUp: null == leveledUp
          ? _self.leveledUp
          : leveledUp // ignore: cast_nullable_to_non_nullable
              as bool,
      previousLevel: null == previousLevel
          ? _self.previousLevel
          : previousLevel // ignore: cast_nullable_to_non_nullable
              as int,
      streakUpdated: null == streakUpdated
          ? _self.streakUpdated
          : streakUpdated // ignore: cast_nullable_to_non_nullable
              as bool,
      previousStreak: null == previousStreak
          ? _self.previousStreak
          : previousStreak // ignore: cast_nullable_to_non_nullable
              as int,
      awardedBadges: null == awardedBadges
          ? _self._awardedBadges
          : awardedBadges // ignore: cast_nullable_to_non_nullable
              as List<BadgeAward>,
    ));
  }
}

/// @nodoc
mixin _$BadgeAward {
  String get code;
  String get name;
  bool get isNew;

  /// Create a copy of BadgeAward
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $BadgeAwardCopyWith<BadgeAward> get copyWith =>
      _$BadgeAwardCopyWithImpl<BadgeAward>(this as BadgeAward, _$identity);

  /// Serializes this BadgeAward to a JSON map.
  Map<String, dynamic> toJson();

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is BadgeAward &&
            (identical(other.code, code) || other.code == code) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.isNew, isNew) || other.isNew == isNew));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, code, name, isNew);

  @override
  String toString() {
    return 'BadgeAward(code: $code, name: $name, isNew: $isNew)';
  }
}

/// @nodoc
abstract mixin class $BadgeAwardCopyWith<$Res> {
  factory $BadgeAwardCopyWith(
          BadgeAward value, $Res Function(BadgeAward) _then) =
      _$BadgeAwardCopyWithImpl;
  @useResult
  $Res call({String code, String name, bool isNew});
}

/// @nodoc
class _$BadgeAwardCopyWithImpl<$Res> implements $BadgeAwardCopyWith<$Res> {
  _$BadgeAwardCopyWithImpl(this._self, this._then);

  final BadgeAward _self;
  final $Res Function(BadgeAward) _then;

  /// Create a copy of BadgeAward
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? code = null,
    Object? name = null,
    Object? isNew = null,
  }) {
    return _then(_self.copyWith(
      code: null == code
          ? _self.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _self.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      isNew: null == isNew
          ? _self.isNew
          : isNew // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// Adds pattern-matching-related methods to [BadgeAward].
extension BadgeAwardPatterns on BadgeAward {
  /// A variant of `map` that fallback to returning `orElse`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>(
    TResult Function(_BadgeAward value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _BadgeAward() when $default != null:
        return $default(_that);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// Callbacks receives the raw object, upcasted.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case final Subclass2 value:
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult map<TResult extends Object?>(
    TResult Function(_BadgeAward value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _BadgeAward():
        return $default(_that);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `map` that fallback to returning `null`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>(
    TResult? Function(_BadgeAward value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _BadgeAward() when $default != null:
        return $default(_that);
      case _:
        return null;
    }
  }

  /// A variant of `when` that fallback to an `orElse` callback.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>(
    TResult Function(String code, String name, bool isNew)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _BadgeAward() when $default != null:
        return $default(_that.code, _that.name, _that.isNew);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// As opposed to `map`, this offers destructuring.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case Subclass2(:final field2):
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult when<TResult extends Object?>(
    TResult Function(String code, String name, bool isNew) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _BadgeAward():
        return $default(_that.code, _that.name, _that.isNew);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `when` that fallback to returning `null`
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>(
    TResult? Function(String code, String name, bool isNew)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _BadgeAward() when $default != null:
        return $default(_that.code, _that.name, _that.isNew);
      case _:
        return null;
    }
  }
}

/// @nodoc
@JsonSerializable()
class _BadgeAward implements BadgeAward {
  const _BadgeAward(
      {required this.code, required this.name, required this.isNew});
  factory _BadgeAward.fromJson(Map<String, dynamic> json) =>
      _$BadgeAwardFromJson(json);

  @override
  final String code;
  @override
  final String name;
  @override
  final bool isNew;

  /// Create a copy of BadgeAward
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$BadgeAwardCopyWith<_BadgeAward> get copyWith =>
      __$BadgeAwardCopyWithImpl<_BadgeAward>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$BadgeAwardToJson(
      this,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _BadgeAward &&
            (identical(other.code, code) || other.code == code) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.isNew, isNew) || other.isNew == isNew));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, code, name, isNew);

  @override
  String toString() {
    return 'BadgeAward(code: $code, name: $name, isNew: $isNew)';
  }
}

/// @nodoc
abstract mixin class _$BadgeAwardCopyWith<$Res>
    implements $BadgeAwardCopyWith<$Res> {
  factory _$BadgeAwardCopyWith(
          _BadgeAward value, $Res Function(_BadgeAward) _then) =
      __$BadgeAwardCopyWithImpl;
  @override
  @useResult
  $Res call({String code, String name, bool isNew});
}

/// @nodoc
class __$BadgeAwardCopyWithImpl<$Res> implements _$BadgeAwardCopyWith<$Res> {
  __$BadgeAwardCopyWithImpl(this._self, this._then);

  final _BadgeAward _self;
  final $Res Function(_BadgeAward) _then;

  /// Create a copy of BadgeAward
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $Res call({
    Object? code = null,
    Object? name = null,
    Object? isNew = null,
  }) {
    return _then(_BadgeAward(
      code: null == code
          ? _self.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _self.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      isNew: null == isNew
          ? _self.isNew
          : isNew // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
mixin _$EffectiveSettings {
  bool get xpEnabled;
  bool get streaksEnabled;
  bool get badgesEnabled;
  bool get kudosEnabled;
  bool get celebrationsEnabled;
  bool get levelsEnabled;
  bool get showComparisons; // Learner preferences
  RewardStyle get preferredRewardStyle;
  bool get muteCelebrations;
  bool get reducedVisuals;
  bool get showBadges;
  bool get showStreaks;
  bool get showXp;

  /// Create a copy of EffectiveSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $EffectiveSettingsCopyWith<EffectiveSettings> get copyWith =>
      _$EffectiveSettingsCopyWithImpl<EffectiveSettings>(
          this as EffectiveSettings, _$identity);

  /// Serializes this EffectiveSettings to a JSON map.
  Map<String, dynamic> toJson();

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is EffectiveSettings &&
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

  @override
  String toString() {
    return 'EffectiveSettings(xpEnabled: $xpEnabled, streaksEnabled: $streaksEnabled, badgesEnabled: $badgesEnabled, kudosEnabled: $kudosEnabled, celebrationsEnabled: $celebrationsEnabled, levelsEnabled: $levelsEnabled, showComparisons: $showComparisons, preferredRewardStyle: $preferredRewardStyle, muteCelebrations: $muteCelebrations, reducedVisuals: $reducedVisuals, showBadges: $showBadges, showStreaks: $showStreaks, showXp: $showXp)';
  }
}

/// @nodoc
abstract mixin class $EffectiveSettingsCopyWith<$Res> {
  factory $EffectiveSettingsCopyWith(
          EffectiveSettings value, $Res Function(EffectiveSettings) _then) =
      _$EffectiveSettingsCopyWithImpl;
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
class _$EffectiveSettingsCopyWithImpl<$Res>
    implements $EffectiveSettingsCopyWith<$Res> {
  _$EffectiveSettingsCopyWithImpl(this._self, this._then);

  final EffectiveSettings _self;
  final $Res Function(EffectiveSettings) _then;

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
    return _then(_self.copyWith(
      xpEnabled: null == xpEnabled
          ? _self.xpEnabled
          : xpEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      streaksEnabled: null == streaksEnabled
          ? _self.streaksEnabled
          : streaksEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      badgesEnabled: null == badgesEnabled
          ? _self.badgesEnabled
          : badgesEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      kudosEnabled: null == kudosEnabled
          ? _self.kudosEnabled
          : kudosEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      celebrationsEnabled: null == celebrationsEnabled
          ? _self.celebrationsEnabled
          : celebrationsEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      levelsEnabled: null == levelsEnabled
          ? _self.levelsEnabled
          : levelsEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      showComparisons: null == showComparisons
          ? _self.showComparisons
          : showComparisons // ignore: cast_nullable_to_non_nullable
              as bool,
      preferredRewardStyle: null == preferredRewardStyle
          ? _self.preferredRewardStyle
          : preferredRewardStyle // ignore: cast_nullable_to_non_nullable
              as RewardStyle,
      muteCelebrations: null == muteCelebrations
          ? _self.muteCelebrations
          : muteCelebrations // ignore: cast_nullable_to_non_nullable
              as bool,
      reducedVisuals: null == reducedVisuals
          ? _self.reducedVisuals
          : reducedVisuals // ignore: cast_nullable_to_non_nullable
              as bool,
      showBadges: null == showBadges
          ? _self.showBadges
          : showBadges // ignore: cast_nullable_to_non_nullable
              as bool,
      showStreaks: null == showStreaks
          ? _self.showStreaks
          : showStreaks // ignore: cast_nullable_to_non_nullable
              as bool,
      showXp: null == showXp
          ? _self.showXp
          : showXp // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// Adds pattern-matching-related methods to [EffectiveSettings].
extension EffectiveSettingsPatterns on EffectiveSettings {
  /// A variant of `map` that fallback to returning `orElse`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>(
    TResult Function(_EffectiveSettings value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _EffectiveSettings() when $default != null:
        return $default(_that);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// Callbacks receives the raw object, upcasted.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case final Subclass2 value:
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult map<TResult extends Object?>(
    TResult Function(_EffectiveSettings value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EffectiveSettings():
        return $default(_that);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `map` that fallback to returning `null`.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case final Subclass value:
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>(
    TResult? Function(_EffectiveSettings value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EffectiveSettings() when $default != null:
        return $default(_that);
      case _:
        return null;
    }
  }

  /// A variant of `when` that fallback to an `orElse` callback.
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return orElse();
  /// }
  /// ```

  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>(
    TResult Function(
            bool xpEnabled,
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
            bool showXp)?
        $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _EffectiveSettings() when $default != null:
        return $default(
            _that.xpEnabled,
            _that.streaksEnabled,
            _that.badgesEnabled,
            _that.kudosEnabled,
            _that.celebrationsEnabled,
            _that.levelsEnabled,
            _that.showComparisons,
            _that.preferredRewardStyle,
            _that.muteCelebrations,
            _that.reducedVisuals,
            _that.showBadges,
            _that.showStreaks,
            _that.showXp);
      case _:
        return orElse();
    }
  }

  /// A `switch`-like method, using callbacks.
  ///
  /// As opposed to `map`, this offers destructuring.
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case Subclass2(:final field2):
  ///     return ...;
  /// }
  /// ```

  @optionalTypeArgs
  TResult when<TResult extends Object?>(
    TResult Function(
            bool xpEnabled,
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
            bool showXp)
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EffectiveSettings():
        return $default(
            _that.xpEnabled,
            _that.streaksEnabled,
            _that.badgesEnabled,
            _that.kudosEnabled,
            _that.celebrationsEnabled,
            _that.levelsEnabled,
            _that.showComparisons,
            _that.preferredRewardStyle,
            _that.muteCelebrations,
            _that.reducedVisuals,
            _that.showBadges,
            _that.showStreaks,
            _that.showXp);
      case _:
        throw StateError('Unexpected subclass');
    }
  }

  /// A variant of `when` that fallback to returning `null`
  ///
  /// It is equivalent to doing:
  /// ```dart
  /// switch (sealedClass) {
  ///   case Subclass(:final field):
  ///     return ...;
  ///   case _:
  ///     return null;
  /// }
  /// ```

  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>(
    TResult? Function(
            bool xpEnabled,
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
            bool showXp)?
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EffectiveSettings() when $default != null:
        return $default(
            _that.xpEnabled,
            _that.streaksEnabled,
            _that.badgesEnabled,
            _that.kudosEnabled,
            _that.celebrationsEnabled,
            _that.levelsEnabled,
            _that.showComparisons,
            _that.preferredRewardStyle,
            _that.muteCelebrations,
            _that.reducedVisuals,
            _that.showBadges,
            _that.showStreaks,
            _that.showXp);
      case _:
        return null;
    }
  }
}

/// @nodoc
@JsonSerializable()
class _EffectiveSettings implements EffectiveSettings {
  const _EffectiveSettings(
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
  factory _EffectiveSettings.fromJson(Map<String, dynamic> json) =>
      _$EffectiveSettingsFromJson(json);

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

  /// Create a copy of EffectiveSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$EffectiveSettingsCopyWith<_EffectiveSettings> get copyWith =>
      __$EffectiveSettingsCopyWithImpl<_EffectiveSettings>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$EffectiveSettingsToJson(
      this,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _EffectiveSettings &&
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

  @override
  String toString() {
    return 'EffectiveSettings(xpEnabled: $xpEnabled, streaksEnabled: $streaksEnabled, badgesEnabled: $badgesEnabled, kudosEnabled: $kudosEnabled, celebrationsEnabled: $celebrationsEnabled, levelsEnabled: $levelsEnabled, showComparisons: $showComparisons, preferredRewardStyle: $preferredRewardStyle, muteCelebrations: $muteCelebrations, reducedVisuals: $reducedVisuals, showBadges: $showBadges, showStreaks: $showStreaks, showXp: $showXp)';
  }
}

/// @nodoc
abstract mixin class _$EffectiveSettingsCopyWith<$Res>
    implements $EffectiveSettingsCopyWith<$Res> {
  factory _$EffectiveSettingsCopyWith(
          _EffectiveSettings value, $Res Function(_EffectiveSettings) _then) =
      __$EffectiveSettingsCopyWithImpl;
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
class __$EffectiveSettingsCopyWithImpl<$Res>
    implements _$EffectiveSettingsCopyWith<$Res> {
  __$EffectiveSettingsCopyWithImpl(this._self, this._then);

  final _EffectiveSettings _self;
  final $Res Function(_EffectiveSettings) _then;

  /// Create a copy of EffectiveSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
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
    return _then(_EffectiveSettings(
      xpEnabled: null == xpEnabled
          ? _self.xpEnabled
          : xpEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      streaksEnabled: null == streaksEnabled
          ? _self.streaksEnabled
          : streaksEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      badgesEnabled: null == badgesEnabled
          ? _self.badgesEnabled
          : badgesEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      kudosEnabled: null == kudosEnabled
          ? _self.kudosEnabled
          : kudosEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      celebrationsEnabled: null == celebrationsEnabled
          ? _self.celebrationsEnabled
          : celebrationsEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      levelsEnabled: null == levelsEnabled
          ? _self.levelsEnabled
          : levelsEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      showComparisons: null == showComparisons
          ? _self.showComparisons
          : showComparisons // ignore: cast_nullable_to_non_nullable
              as bool,
      preferredRewardStyle: null == preferredRewardStyle
          ? _self.preferredRewardStyle
          : preferredRewardStyle // ignore: cast_nullable_to_non_nullable
              as RewardStyle,
      muteCelebrations: null == muteCelebrations
          ? _self.muteCelebrations
          : muteCelebrations // ignore: cast_nullable_to_non_nullable
              as bool,
      reducedVisuals: null == reducedVisuals
          ? _self.reducedVisuals
          : reducedVisuals // ignore: cast_nullable_to_non_nullable
              as bool,
      showBadges: null == showBadges
          ? _self.showBadges
          : showBadges // ignore: cast_nullable_to_non_nullable
              as bool,
      showStreaks: null == showStreaks
          ? _self.showStreaks
          : showStreaks // ignore: cast_nullable_to_non_nullable
              as bool,
      showXp: null == showXp
          ? _self.showXp
          : showXp // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

// dart format on
