// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'settings_types.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

DailySchedule _$DailyScheduleFromJson(Map<String, dynamic> json) {
  return _DailySchedule.fromJson(json);
}

/// @nodoc
mixin _$DailySchedule {
  bool get enabled => throw _privateConstructorUsedError;
  String get start => throw _privateConstructorUsedError;
  String get end => throw _privateConstructorUsedError;

  /// Serializes this DailySchedule to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of DailySchedule
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DailyScheduleCopyWith<DailySchedule> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DailyScheduleCopyWith<$Res> {
  factory $DailyScheduleCopyWith(
          DailySchedule value, $Res Function(DailySchedule) then) =
      _$DailyScheduleCopyWithImpl<$Res, DailySchedule>;
  @useResult
  $Res call({bool enabled, String start, String end});
}

/// @nodoc
class _$DailyScheduleCopyWithImpl<$Res, $Val extends DailySchedule>
    implements $DailyScheduleCopyWith<$Res> {
  _$DailyScheduleCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DailySchedule
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
    Object? start = null,
    Object? end = null,
  }) {
    return _then(_value.copyWith(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      start: null == start
          ? _value.start
          : start // ignore: cast_nullable_to_non_nullable
              as String,
      end: null == end
          ? _value.end
          : end // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$DailyScheduleImplCopyWith<$Res>
    implements $DailyScheduleCopyWith<$Res> {
  factory _$$DailyScheduleImplCopyWith(
          _$DailyScheduleImpl value, $Res Function(_$DailyScheduleImpl) then) =
      __$$DailyScheduleImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({bool enabled, String start, String end});
}

/// @nodoc
class __$$DailyScheduleImplCopyWithImpl<$Res>
    extends _$DailyScheduleCopyWithImpl<$Res, _$DailyScheduleImpl>
    implements _$$DailyScheduleImplCopyWith<$Res> {
  __$$DailyScheduleImplCopyWithImpl(
      _$DailyScheduleImpl _value, $Res Function(_$DailyScheduleImpl) _then)
      : super(_value, _then);

  /// Create a copy of DailySchedule
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
    Object? start = null,
    Object? end = null,
  }) {
    return _then(_$DailyScheduleImpl(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      start: null == start
          ? _value.start
          : start // ignore: cast_nullable_to_non_nullable
              as String,
      end: null == end
          ? _value.end
          : end // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$DailyScheduleImpl implements _DailySchedule {
  const _$DailyScheduleImpl(
      {required this.enabled, required this.start, required this.end});

  factory _$DailyScheduleImpl.fromJson(Map<String, dynamic> json) =>
      _$$DailyScheduleImplFromJson(json);

  @override
  final bool enabled;
  @override
  final String start;
  @override
  final String end;

  @override
  String toString() {
    return 'DailySchedule(enabled: $enabled, start: $start, end: $end)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DailyScheduleImpl &&
            (identical(other.enabled, enabled) || other.enabled == enabled) &&
            (identical(other.start, start) || other.start == start) &&
            (identical(other.end, end) || other.end == end));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, enabled, start, end);

  /// Create a copy of DailySchedule
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DailyScheduleImplCopyWith<_$DailyScheduleImpl> get copyWith =>
      __$$DailyScheduleImplCopyWithImpl<_$DailyScheduleImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$DailyScheduleImplToJson(
      this,
    );
  }
}

abstract class _DailySchedule implements DailySchedule {
  const factory _DailySchedule(
      {required final bool enabled,
      required final String start,
      required final String end}) = _$DailyScheduleImpl;

  factory _DailySchedule.fromJson(Map<String, dynamic> json) =
      _$DailyScheduleImpl.fromJson;

  @override
  bool get enabled;
  @override
  String get start;
  @override
  String get end;

  /// Create a copy of DailySchedule
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DailyScheduleImplCopyWith<_$DailyScheduleImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ScreenTimeSettings _$ScreenTimeSettingsFromJson(Map<String, dynamic> json) {
  return _ScreenTimeSettings.fromJson(json);
}

/// @nodoc
mixin _$ScreenTimeSettings {
  int get dailyLimit => throw _privateConstructorUsedError;
  bool get scheduleEnabled => throw _privateConstructorUsedError;
  Map<String, DailySchedule> get schedule => throw _privateConstructorUsedError;
  bool get breakReminders => throw _privateConstructorUsedError;
  int get breakInterval => throw _privateConstructorUsedError;
  int get breakDuration => throw _privateConstructorUsedError;

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
      {int dailyLimit,
      bool scheduleEnabled,
      Map<String, DailySchedule> schedule,
      bool breakReminders,
      int breakInterval,
      int breakDuration});
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
    Object? dailyLimit = null,
    Object? scheduleEnabled = null,
    Object? schedule = null,
    Object? breakReminders = null,
    Object? breakInterval = null,
    Object? breakDuration = null,
  }) {
    return _then(_value.copyWith(
      dailyLimit: null == dailyLimit
          ? _value.dailyLimit
          : dailyLimit // ignore: cast_nullable_to_non_nullable
              as int,
      scheduleEnabled: null == scheduleEnabled
          ? _value.scheduleEnabled
          : scheduleEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      schedule: null == schedule
          ? _value.schedule
          : schedule // ignore: cast_nullable_to_non_nullable
              as Map<String, DailySchedule>,
      breakReminders: null == breakReminders
          ? _value.breakReminders
          : breakReminders // ignore: cast_nullable_to_non_nullable
              as bool,
      breakInterval: null == breakInterval
          ? _value.breakInterval
          : breakInterval // ignore: cast_nullable_to_non_nullable
              as int,
      breakDuration: null == breakDuration
          ? _value.breakDuration
          : breakDuration // ignore: cast_nullable_to_non_nullable
              as int,
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
      {int dailyLimit,
      bool scheduleEnabled,
      Map<String, DailySchedule> schedule,
      bool breakReminders,
      int breakInterval,
      int breakDuration});
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
    Object? dailyLimit = null,
    Object? scheduleEnabled = null,
    Object? schedule = null,
    Object? breakReminders = null,
    Object? breakInterval = null,
    Object? breakDuration = null,
  }) {
    return _then(_$ScreenTimeSettingsImpl(
      dailyLimit: null == dailyLimit
          ? _value.dailyLimit
          : dailyLimit // ignore: cast_nullable_to_non_nullable
              as int,
      scheduleEnabled: null == scheduleEnabled
          ? _value.scheduleEnabled
          : scheduleEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      schedule: null == schedule
          ? _value._schedule
          : schedule // ignore: cast_nullable_to_non_nullable
              as Map<String, DailySchedule>,
      breakReminders: null == breakReminders
          ? _value.breakReminders
          : breakReminders // ignore: cast_nullable_to_non_nullable
              as bool,
      breakInterval: null == breakInterval
          ? _value.breakInterval
          : breakInterval // ignore: cast_nullable_to_non_nullable
              as int,
      breakDuration: null == breakDuration
          ? _value.breakDuration
          : breakDuration // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ScreenTimeSettingsImpl implements _ScreenTimeSettings {
  const _$ScreenTimeSettingsImpl(
      {required this.dailyLimit,
      required this.scheduleEnabled,
      required final Map<String, DailySchedule> schedule,
      required this.breakReminders,
      required this.breakInterval,
      required this.breakDuration})
      : _schedule = schedule;

  factory _$ScreenTimeSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$ScreenTimeSettingsImplFromJson(json);

  @override
  final int dailyLimit;
  @override
  final bool scheduleEnabled;
  final Map<String, DailySchedule> _schedule;
  @override
  Map<String, DailySchedule> get schedule {
    if (_schedule is EqualUnmodifiableMapView) return _schedule;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_schedule);
  }

  @override
  final bool breakReminders;
  @override
  final int breakInterval;
  @override
  final int breakDuration;

  @override
  String toString() {
    return 'ScreenTimeSettings(dailyLimit: $dailyLimit, scheduleEnabled: $scheduleEnabled, schedule: $schedule, breakReminders: $breakReminders, breakInterval: $breakInterval, breakDuration: $breakDuration)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ScreenTimeSettingsImpl &&
            (identical(other.dailyLimit, dailyLimit) ||
                other.dailyLimit == dailyLimit) &&
            (identical(other.scheduleEnabled, scheduleEnabled) ||
                other.scheduleEnabled == scheduleEnabled) &&
            const DeepCollectionEquality().equals(other._schedule, _schedule) &&
            (identical(other.breakReminders, breakReminders) ||
                other.breakReminders == breakReminders) &&
            (identical(other.breakInterval, breakInterval) ||
                other.breakInterval == breakInterval) &&
            (identical(other.breakDuration, breakDuration) ||
                other.breakDuration == breakDuration));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      dailyLimit,
      scheduleEnabled,
      const DeepCollectionEquality().hash(_schedule),
      breakReminders,
      breakInterval,
      breakDuration);

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
      {required final int dailyLimit,
      required final bool scheduleEnabled,
      required final Map<String, DailySchedule> schedule,
      required final bool breakReminders,
      required final int breakInterval,
      required final int breakDuration}) = _$ScreenTimeSettingsImpl;

  factory _ScreenTimeSettings.fromJson(Map<String, dynamic> json) =
      _$ScreenTimeSettingsImpl.fromJson;

  @override
  int get dailyLimit;
  @override
  bool get scheduleEnabled;
  @override
  Map<String, DailySchedule> get schedule;
  @override
  bool get breakReminders;
  @override
  int get breakInterval;
  @override
  int get breakDuration;

  /// Create a copy of ScreenTimeSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ScreenTimeSettingsImplCopyWith<_$ScreenTimeSettingsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ContentFilterSettings _$ContentFilterSettingsFromJson(
    Map<String, dynamic> json) {
  return _ContentFilterSettings.fromJson(json);
}

/// @nodoc
mixin _$ContentFilterSettings {
  RestrictionLevel get restrictionLevel => throw _privateConstructorUsedError;
  bool get blockExternalLinks => throw _privateConstructorUsedError;
  bool get safeSearch => throw _privateConstructorUsedError;
  bool get hideAchievementLeaderboards => throw _privateConstructorUsedError;
  bool get restrictChat => throw _privateConstructorUsedError;
  List<String> get blockedTopics => throw _privateConstructorUsedError;
  List<String> get allowedTopics => throw _privateConstructorUsedError;

  /// Serializes this ContentFilterSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ContentFilterSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ContentFilterSettingsCopyWith<ContentFilterSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ContentFilterSettingsCopyWith<$Res> {
  factory $ContentFilterSettingsCopyWith(ContentFilterSettings value,
          $Res Function(ContentFilterSettings) then) =
      _$ContentFilterSettingsCopyWithImpl<$Res, ContentFilterSettings>;
  @useResult
  $Res call(
      {RestrictionLevel restrictionLevel,
      bool blockExternalLinks,
      bool safeSearch,
      bool hideAchievementLeaderboards,
      bool restrictChat,
      List<String> blockedTopics,
      List<String> allowedTopics});
}

/// @nodoc
class _$ContentFilterSettingsCopyWithImpl<$Res,
        $Val extends ContentFilterSettings>
    implements $ContentFilterSettingsCopyWith<$Res> {
  _$ContentFilterSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ContentFilterSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? restrictionLevel = null,
    Object? blockExternalLinks = null,
    Object? safeSearch = null,
    Object? hideAchievementLeaderboards = null,
    Object? restrictChat = null,
    Object? blockedTopics = null,
    Object? allowedTopics = null,
  }) {
    return _then(_value.copyWith(
      restrictionLevel: null == restrictionLevel
          ? _value.restrictionLevel
          : restrictionLevel // ignore: cast_nullable_to_non_nullable
              as RestrictionLevel,
      blockExternalLinks: null == blockExternalLinks
          ? _value.blockExternalLinks
          : blockExternalLinks // ignore: cast_nullable_to_non_nullable
              as bool,
      safeSearch: null == safeSearch
          ? _value.safeSearch
          : safeSearch // ignore: cast_nullable_to_non_nullable
              as bool,
      hideAchievementLeaderboards: null == hideAchievementLeaderboards
          ? _value.hideAchievementLeaderboards
          : hideAchievementLeaderboards // ignore: cast_nullable_to_non_nullable
              as bool,
      restrictChat: null == restrictChat
          ? _value.restrictChat
          : restrictChat // ignore: cast_nullable_to_non_nullable
              as bool,
      blockedTopics: null == blockedTopics
          ? _value.blockedTopics
          : blockedTopics // ignore: cast_nullable_to_non_nullable
              as List<String>,
      allowedTopics: null == allowedTopics
          ? _value.allowedTopics
          : allowedTopics // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ContentFilterSettingsImplCopyWith<$Res>
    implements $ContentFilterSettingsCopyWith<$Res> {
  factory _$$ContentFilterSettingsImplCopyWith(
          _$ContentFilterSettingsImpl value,
          $Res Function(_$ContentFilterSettingsImpl) then) =
      __$$ContentFilterSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {RestrictionLevel restrictionLevel,
      bool blockExternalLinks,
      bool safeSearch,
      bool hideAchievementLeaderboards,
      bool restrictChat,
      List<String> blockedTopics,
      List<String> allowedTopics});
}

/// @nodoc
class __$$ContentFilterSettingsImplCopyWithImpl<$Res>
    extends _$ContentFilterSettingsCopyWithImpl<$Res,
        _$ContentFilterSettingsImpl>
    implements _$$ContentFilterSettingsImplCopyWith<$Res> {
  __$$ContentFilterSettingsImplCopyWithImpl(_$ContentFilterSettingsImpl _value,
      $Res Function(_$ContentFilterSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of ContentFilterSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? restrictionLevel = null,
    Object? blockExternalLinks = null,
    Object? safeSearch = null,
    Object? hideAchievementLeaderboards = null,
    Object? restrictChat = null,
    Object? blockedTopics = null,
    Object? allowedTopics = null,
  }) {
    return _then(_$ContentFilterSettingsImpl(
      restrictionLevel: null == restrictionLevel
          ? _value.restrictionLevel
          : restrictionLevel // ignore: cast_nullable_to_non_nullable
              as RestrictionLevel,
      blockExternalLinks: null == blockExternalLinks
          ? _value.blockExternalLinks
          : blockExternalLinks // ignore: cast_nullable_to_non_nullable
              as bool,
      safeSearch: null == safeSearch
          ? _value.safeSearch
          : safeSearch // ignore: cast_nullable_to_non_nullable
              as bool,
      hideAchievementLeaderboards: null == hideAchievementLeaderboards
          ? _value.hideAchievementLeaderboards
          : hideAchievementLeaderboards // ignore: cast_nullable_to_non_nullable
              as bool,
      restrictChat: null == restrictChat
          ? _value.restrictChat
          : restrictChat // ignore: cast_nullable_to_non_nullable
              as bool,
      blockedTopics: null == blockedTopics
          ? _value._blockedTopics
          : blockedTopics // ignore: cast_nullable_to_non_nullable
              as List<String>,
      allowedTopics: null == allowedTopics
          ? _value._allowedTopics
          : allowedTopics // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ContentFilterSettingsImpl implements _ContentFilterSettings {
  const _$ContentFilterSettingsImpl(
      {required this.restrictionLevel,
      required this.blockExternalLinks,
      required this.safeSearch,
      required this.hideAchievementLeaderboards,
      required this.restrictChat,
      required final List<String> blockedTopics,
      required final List<String> allowedTopics})
      : _blockedTopics = blockedTopics,
        _allowedTopics = allowedTopics;

  factory _$ContentFilterSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$ContentFilterSettingsImplFromJson(json);

  @override
  final RestrictionLevel restrictionLevel;
  @override
  final bool blockExternalLinks;
  @override
  final bool safeSearch;
  @override
  final bool hideAchievementLeaderboards;
  @override
  final bool restrictChat;
  final List<String> _blockedTopics;
  @override
  List<String> get blockedTopics {
    if (_blockedTopics is EqualUnmodifiableListView) return _blockedTopics;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_blockedTopics);
  }

  final List<String> _allowedTopics;
  @override
  List<String> get allowedTopics {
    if (_allowedTopics is EqualUnmodifiableListView) return _allowedTopics;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_allowedTopics);
  }

  @override
  String toString() {
    return 'ContentFilterSettings(restrictionLevel: $restrictionLevel, blockExternalLinks: $blockExternalLinks, safeSearch: $safeSearch, hideAchievementLeaderboards: $hideAchievementLeaderboards, restrictChat: $restrictChat, blockedTopics: $blockedTopics, allowedTopics: $allowedTopics)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ContentFilterSettingsImpl &&
            (identical(other.restrictionLevel, restrictionLevel) ||
                other.restrictionLevel == restrictionLevel) &&
            (identical(other.blockExternalLinks, blockExternalLinks) ||
                other.blockExternalLinks == blockExternalLinks) &&
            (identical(other.safeSearch, safeSearch) ||
                other.safeSearch == safeSearch) &&
            (identical(other.hideAchievementLeaderboards,
                    hideAchievementLeaderboards) ||
                other.hideAchievementLeaderboards ==
                    hideAchievementLeaderboards) &&
            (identical(other.restrictChat, restrictChat) ||
                other.restrictChat == restrictChat) &&
            const DeepCollectionEquality()
                .equals(other._blockedTopics, _blockedTopics) &&
            const DeepCollectionEquality()
                .equals(other._allowedTopics, _allowedTopics));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      restrictionLevel,
      blockExternalLinks,
      safeSearch,
      hideAchievementLeaderboards,
      restrictChat,
      const DeepCollectionEquality().hash(_blockedTopics),
      const DeepCollectionEquality().hash(_allowedTopics));

  /// Create a copy of ContentFilterSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ContentFilterSettingsImplCopyWith<_$ContentFilterSettingsImpl>
      get copyWith => __$$ContentFilterSettingsImplCopyWithImpl<
          _$ContentFilterSettingsImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ContentFilterSettingsImplToJson(
      this,
    );
  }
}

abstract class _ContentFilterSettings implements ContentFilterSettings {
  const factory _ContentFilterSettings(
      {required final RestrictionLevel restrictionLevel,
      required final bool blockExternalLinks,
      required final bool safeSearch,
      required final bool hideAchievementLeaderboards,
      required final bool restrictChat,
      required final List<String> blockedTopics,
      required final List<String> allowedTopics}) = _$ContentFilterSettingsImpl;

  factory _ContentFilterSettings.fromJson(Map<String, dynamic> json) =
      _$ContentFilterSettingsImpl.fromJson;

  @override
  RestrictionLevel get restrictionLevel;
  @override
  bool get blockExternalLinks;
  @override
  bool get safeSearch;
  @override
  bool get hideAchievementLeaderboards;
  @override
  bool get restrictChat;
  @override
  List<String> get blockedTopics;
  @override
  List<String> get allowedTopics;

  /// Create a copy of ContentFilterSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ContentFilterSettingsImplCopyWith<_$ContentFilterSettingsImpl>
      get copyWith => throw _privateConstructorUsedError;
}

SubjectConfig _$SubjectConfigFromJson(Map<String, dynamic> json) {
  return _SubjectConfig.fromJson(json);
}

/// @nodoc
mixin _$SubjectConfig {
  bool get enabled => throw _privateConstructorUsedError;
  int? get maxLevel => throw _privateConstructorUsedError;

  /// Serializes this SubjectConfig to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SubjectConfig
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SubjectConfigCopyWith<SubjectConfig> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SubjectConfigCopyWith<$Res> {
  factory $SubjectConfigCopyWith(
          SubjectConfig value, $Res Function(SubjectConfig) then) =
      _$SubjectConfigCopyWithImpl<$Res, SubjectConfig>;
  @useResult
  $Res call({bool enabled, int? maxLevel});
}

/// @nodoc
class _$SubjectConfigCopyWithImpl<$Res, $Val extends SubjectConfig>
    implements $SubjectConfigCopyWith<$Res> {
  _$SubjectConfigCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SubjectConfig
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
    Object? maxLevel = freezed,
  }) {
    return _then(_value.copyWith(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      maxLevel: freezed == maxLevel
          ? _value.maxLevel
          : maxLevel // ignore: cast_nullable_to_non_nullable
              as int?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SubjectConfigImplCopyWith<$Res>
    implements $SubjectConfigCopyWith<$Res> {
  factory _$$SubjectConfigImplCopyWith(
          _$SubjectConfigImpl value, $Res Function(_$SubjectConfigImpl) then) =
      __$$SubjectConfigImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({bool enabled, int? maxLevel});
}

/// @nodoc
class __$$SubjectConfigImplCopyWithImpl<$Res>
    extends _$SubjectConfigCopyWithImpl<$Res, _$SubjectConfigImpl>
    implements _$$SubjectConfigImplCopyWith<$Res> {
  __$$SubjectConfigImplCopyWithImpl(
      _$SubjectConfigImpl _value, $Res Function(_$SubjectConfigImpl) _then)
      : super(_value, _then);

  /// Create a copy of SubjectConfig
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
    Object? maxLevel = freezed,
  }) {
    return _then(_$SubjectConfigImpl(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      maxLevel: freezed == maxLevel
          ? _value.maxLevel
          : maxLevel // ignore: cast_nullable_to_non_nullable
              as int?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SubjectConfigImpl implements _SubjectConfig {
  const _$SubjectConfigImpl({required this.enabled, this.maxLevel});

  factory _$SubjectConfigImpl.fromJson(Map<String, dynamic> json) =>
      _$$SubjectConfigImplFromJson(json);

  @override
  final bool enabled;
  @override
  final int? maxLevel;

  @override
  String toString() {
    return 'SubjectConfig(enabled: $enabled, maxLevel: $maxLevel)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SubjectConfigImpl &&
            (identical(other.enabled, enabled) || other.enabled == enabled) &&
            (identical(other.maxLevel, maxLevel) ||
                other.maxLevel == maxLevel));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, enabled, maxLevel);

  /// Create a copy of SubjectConfig
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SubjectConfigImplCopyWith<_$SubjectConfigImpl> get copyWith =>
      __$$SubjectConfigImplCopyWithImpl<_$SubjectConfigImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SubjectConfigImplToJson(
      this,
    );
  }
}

abstract class _SubjectConfig implements SubjectConfig {
  const factory _SubjectConfig(
      {required final bool enabled, final int? maxLevel}) = _$SubjectConfigImpl;

  factory _SubjectConfig.fromJson(Map<String, dynamic> json) =
      _$SubjectConfigImpl.fromJson;

  @override
  bool get enabled;
  @override
  int? get maxLevel;

  /// Create a copy of SubjectConfig
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SubjectConfigImplCopyWith<_$SubjectConfigImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

SubjectAccessSettings _$SubjectAccessSettingsFromJson(
    Map<String, dynamic> json) {
  return _SubjectAccessSettings.fromJson(json);
}

/// @nodoc
mixin _$SubjectAccessSettings {
  Map<String, SubjectConfig> get subjects => throw _privateConstructorUsedError;
  bool get requireParentApprovalForNewSubjects =>
      throw _privateConstructorUsedError;
  bool get allowAdvancedContent => throw _privateConstructorUsedError;

  /// Serializes this SubjectAccessSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SubjectAccessSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SubjectAccessSettingsCopyWith<SubjectAccessSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SubjectAccessSettingsCopyWith<$Res> {
  factory $SubjectAccessSettingsCopyWith(SubjectAccessSettings value,
          $Res Function(SubjectAccessSettings) then) =
      _$SubjectAccessSettingsCopyWithImpl<$Res, SubjectAccessSettings>;
  @useResult
  $Res call(
      {Map<String, SubjectConfig> subjects,
      bool requireParentApprovalForNewSubjects,
      bool allowAdvancedContent});
}

/// @nodoc
class _$SubjectAccessSettingsCopyWithImpl<$Res,
        $Val extends SubjectAccessSettings>
    implements $SubjectAccessSettingsCopyWith<$Res> {
  _$SubjectAccessSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SubjectAccessSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? subjects = null,
    Object? requireParentApprovalForNewSubjects = null,
    Object? allowAdvancedContent = null,
  }) {
    return _then(_value.copyWith(
      subjects: null == subjects
          ? _value.subjects
          : subjects // ignore: cast_nullable_to_non_nullable
              as Map<String, SubjectConfig>,
      requireParentApprovalForNewSubjects: null ==
              requireParentApprovalForNewSubjects
          ? _value.requireParentApprovalForNewSubjects
          : requireParentApprovalForNewSubjects // ignore: cast_nullable_to_non_nullable
              as bool,
      allowAdvancedContent: null == allowAdvancedContent
          ? _value.allowAdvancedContent
          : allowAdvancedContent // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SubjectAccessSettingsImplCopyWith<$Res>
    implements $SubjectAccessSettingsCopyWith<$Res> {
  factory _$$SubjectAccessSettingsImplCopyWith(
          _$SubjectAccessSettingsImpl value,
          $Res Function(_$SubjectAccessSettingsImpl) then) =
      __$$SubjectAccessSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {Map<String, SubjectConfig> subjects,
      bool requireParentApprovalForNewSubjects,
      bool allowAdvancedContent});
}

/// @nodoc
class __$$SubjectAccessSettingsImplCopyWithImpl<$Res>
    extends _$SubjectAccessSettingsCopyWithImpl<$Res,
        _$SubjectAccessSettingsImpl>
    implements _$$SubjectAccessSettingsImplCopyWith<$Res> {
  __$$SubjectAccessSettingsImplCopyWithImpl(_$SubjectAccessSettingsImpl _value,
      $Res Function(_$SubjectAccessSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of SubjectAccessSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? subjects = null,
    Object? requireParentApprovalForNewSubjects = null,
    Object? allowAdvancedContent = null,
  }) {
    return _then(_$SubjectAccessSettingsImpl(
      subjects: null == subjects
          ? _value._subjects
          : subjects // ignore: cast_nullable_to_non_nullable
              as Map<String, SubjectConfig>,
      requireParentApprovalForNewSubjects: null ==
              requireParentApprovalForNewSubjects
          ? _value.requireParentApprovalForNewSubjects
          : requireParentApprovalForNewSubjects // ignore: cast_nullable_to_non_nullable
              as bool,
      allowAdvancedContent: null == allowAdvancedContent
          ? _value.allowAdvancedContent
          : allowAdvancedContent // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SubjectAccessSettingsImpl implements _SubjectAccessSettings {
  const _$SubjectAccessSettingsImpl(
      {required final Map<String, SubjectConfig> subjects,
      required this.requireParentApprovalForNewSubjects,
      required this.allowAdvancedContent})
      : _subjects = subjects;

  factory _$SubjectAccessSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$SubjectAccessSettingsImplFromJson(json);

  final Map<String, SubjectConfig> _subjects;
  @override
  Map<String, SubjectConfig> get subjects {
    if (_subjects is EqualUnmodifiableMapView) return _subjects;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_subjects);
  }

  @override
  final bool requireParentApprovalForNewSubjects;
  @override
  final bool allowAdvancedContent;

  @override
  String toString() {
    return 'SubjectAccessSettings(subjects: $subjects, requireParentApprovalForNewSubjects: $requireParentApprovalForNewSubjects, allowAdvancedContent: $allowAdvancedContent)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SubjectAccessSettingsImpl &&
            const DeepCollectionEquality().equals(other._subjects, _subjects) &&
            (identical(other.requireParentApprovalForNewSubjects,
                    requireParentApprovalForNewSubjects) ||
                other.requireParentApprovalForNewSubjects ==
                    requireParentApprovalForNewSubjects) &&
            (identical(other.allowAdvancedContent, allowAdvancedContent) ||
                other.allowAdvancedContent == allowAdvancedContent));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_subjects),
      requireParentApprovalForNewSubjects,
      allowAdvancedContent);

  /// Create a copy of SubjectAccessSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SubjectAccessSettingsImplCopyWith<_$SubjectAccessSettingsImpl>
      get copyWith => __$$SubjectAccessSettingsImplCopyWithImpl<
          _$SubjectAccessSettingsImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SubjectAccessSettingsImplToJson(
      this,
    );
  }
}

abstract class _SubjectAccessSettings implements SubjectAccessSettings {
  const factory _SubjectAccessSettings(
      {required final Map<String, SubjectConfig> subjects,
      required final bool requireParentApprovalForNewSubjects,
      required final bool allowAdvancedContent}) = _$SubjectAccessSettingsImpl;

  factory _SubjectAccessSettings.fromJson(Map<String, dynamic> json) =
      _$SubjectAccessSettingsImpl.fromJson;

  @override
  Map<String, SubjectConfig> get subjects;
  @override
  bool get requireParentApprovalForNewSubjects;
  @override
  bool get allowAdvancedContent;

  /// Create a copy of SubjectAccessSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SubjectAccessSettingsImplCopyWith<_$SubjectAccessSettingsImpl>
      get copyWith => throw _privateConstructorUsedError;
}

PrivacySettings _$PrivacySettingsFromJson(Map<String, dynamic> json) {
  return _PrivacySettings.fromJson(json);
}

/// @nodoc
mixin _$PrivacySettings {
  bool get hideFromClassmates => throw _privateConstructorUsedError;
  bool get hideProfilePhoto => throw _privateConstructorUsedError;
  bool get hideProgress => throw _privateConstructorUsedError;
  bool get anonymousMode => throw _privateConstructorUsedError;

  /// Serializes this PrivacySettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of PrivacySettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $PrivacySettingsCopyWith<PrivacySettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $PrivacySettingsCopyWith<$Res> {
  factory $PrivacySettingsCopyWith(
          PrivacySettings value, $Res Function(PrivacySettings) then) =
      _$PrivacySettingsCopyWithImpl<$Res, PrivacySettings>;
  @useResult
  $Res call(
      {bool hideFromClassmates,
      bool hideProfilePhoto,
      bool hideProgress,
      bool anonymousMode});
}

/// @nodoc
class _$PrivacySettingsCopyWithImpl<$Res, $Val extends PrivacySettings>
    implements $PrivacySettingsCopyWith<$Res> {
  _$PrivacySettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of PrivacySettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? hideFromClassmates = null,
    Object? hideProfilePhoto = null,
    Object? hideProgress = null,
    Object? anonymousMode = null,
  }) {
    return _then(_value.copyWith(
      hideFromClassmates: null == hideFromClassmates
          ? _value.hideFromClassmates
          : hideFromClassmates // ignore: cast_nullable_to_non_nullable
              as bool,
      hideProfilePhoto: null == hideProfilePhoto
          ? _value.hideProfilePhoto
          : hideProfilePhoto // ignore: cast_nullable_to_non_nullable
              as bool,
      hideProgress: null == hideProgress
          ? _value.hideProgress
          : hideProgress // ignore: cast_nullable_to_non_nullable
              as bool,
      anonymousMode: null == anonymousMode
          ? _value.anonymousMode
          : anonymousMode // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$PrivacySettingsImplCopyWith<$Res>
    implements $PrivacySettingsCopyWith<$Res> {
  factory _$$PrivacySettingsImplCopyWith(_$PrivacySettingsImpl value,
          $Res Function(_$PrivacySettingsImpl) then) =
      __$$PrivacySettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool hideFromClassmates,
      bool hideProfilePhoto,
      bool hideProgress,
      bool anonymousMode});
}

/// @nodoc
class __$$PrivacySettingsImplCopyWithImpl<$Res>
    extends _$PrivacySettingsCopyWithImpl<$Res, _$PrivacySettingsImpl>
    implements _$$PrivacySettingsImplCopyWith<$Res> {
  __$$PrivacySettingsImplCopyWithImpl(
      _$PrivacySettingsImpl _value, $Res Function(_$PrivacySettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of PrivacySettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? hideFromClassmates = null,
    Object? hideProfilePhoto = null,
    Object? hideProgress = null,
    Object? anonymousMode = null,
  }) {
    return _then(_$PrivacySettingsImpl(
      hideFromClassmates: null == hideFromClassmates
          ? _value.hideFromClassmates
          : hideFromClassmates // ignore: cast_nullable_to_non_nullable
              as bool,
      hideProfilePhoto: null == hideProfilePhoto
          ? _value.hideProfilePhoto
          : hideProfilePhoto // ignore: cast_nullable_to_non_nullable
              as bool,
      hideProgress: null == hideProgress
          ? _value.hideProgress
          : hideProgress // ignore: cast_nullable_to_non_nullable
              as bool,
      anonymousMode: null == anonymousMode
          ? _value.anonymousMode
          : anonymousMode // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$PrivacySettingsImpl implements _PrivacySettings {
  const _$PrivacySettingsImpl(
      {required this.hideFromClassmates,
      required this.hideProfilePhoto,
      required this.hideProgress,
      required this.anonymousMode});

  factory _$PrivacySettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$PrivacySettingsImplFromJson(json);

  @override
  final bool hideFromClassmates;
  @override
  final bool hideProfilePhoto;
  @override
  final bool hideProgress;
  @override
  final bool anonymousMode;

  @override
  String toString() {
    return 'PrivacySettings(hideFromClassmates: $hideFromClassmates, hideProfilePhoto: $hideProfilePhoto, hideProgress: $hideProgress, anonymousMode: $anonymousMode)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PrivacySettingsImpl &&
            (identical(other.hideFromClassmates, hideFromClassmates) ||
                other.hideFromClassmates == hideFromClassmates) &&
            (identical(other.hideProfilePhoto, hideProfilePhoto) ||
                other.hideProfilePhoto == hideProfilePhoto) &&
            (identical(other.hideProgress, hideProgress) ||
                other.hideProgress == hideProgress) &&
            (identical(other.anonymousMode, anonymousMode) ||
                other.anonymousMode == anonymousMode));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, hideFromClassmates,
      hideProfilePhoto, hideProgress, anonymousMode);

  /// Create a copy of PrivacySettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$PrivacySettingsImplCopyWith<_$PrivacySettingsImpl> get copyWith =>
      __$$PrivacySettingsImplCopyWithImpl<_$PrivacySettingsImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$PrivacySettingsImplToJson(
      this,
    );
  }
}

abstract class _PrivacySettings implements PrivacySettings {
  const factory _PrivacySettings(
      {required final bool hideFromClassmates,
      required final bool hideProfilePhoto,
      required final bool hideProgress,
      required final bool anonymousMode}) = _$PrivacySettingsImpl;

  factory _PrivacySettings.fromJson(Map<String, dynamic> json) =
      _$PrivacySettingsImpl.fromJson;

  @override
  bool get hideFromClassmates;
  @override
  bool get hideProfilePhoto;
  @override
  bool get hideProgress;
  @override
  bool get anonymousMode;

  /// Create a copy of PrivacySettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$PrivacySettingsImplCopyWith<_$PrivacySettingsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

DataPreferences _$DataPreferencesFromJson(Map<String, dynamic> json) {
  return _DataPreferences.fromJson(json);
}

/// @nodoc
mixin _$DataPreferences {
  bool get allowAnalytics => throw _privateConstructorUsedError;
  bool get allowPersonalization => throw _privateConstructorUsedError;
  bool get allowThirdPartySharing => throw _privateConstructorUsedError;

  /// Serializes this DataPreferences to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of DataPreferences
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DataPreferencesCopyWith<DataPreferences> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DataPreferencesCopyWith<$Res> {
  factory $DataPreferencesCopyWith(
          DataPreferences value, $Res Function(DataPreferences) then) =
      _$DataPreferencesCopyWithImpl<$Res, DataPreferences>;
  @useResult
  $Res call(
      {bool allowAnalytics,
      bool allowPersonalization,
      bool allowThirdPartySharing});
}

/// @nodoc
class _$DataPreferencesCopyWithImpl<$Res, $Val extends DataPreferences>
    implements $DataPreferencesCopyWith<$Res> {
  _$DataPreferencesCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DataPreferences
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? allowAnalytics = null,
    Object? allowPersonalization = null,
    Object? allowThirdPartySharing = null,
  }) {
    return _then(_value.copyWith(
      allowAnalytics: null == allowAnalytics
          ? _value.allowAnalytics
          : allowAnalytics // ignore: cast_nullable_to_non_nullable
              as bool,
      allowPersonalization: null == allowPersonalization
          ? _value.allowPersonalization
          : allowPersonalization // ignore: cast_nullable_to_non_nullable
              as bool,
      allowThirdPartySharing: null == allowThirdPartySharing
          ? _value.allowThirdPartySharing
          : allowThirdPartySharing // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$DataPreferencesImplCopyWith<$Res>
    implements $DataPreferencesCopyWith<$Res> {
  factory _$$DataPreferencesImplCopyWith(_$DataPreferencesImpl value,
          $Res Function(_$DataPreferencesImpl) then) =
      __$$DataPreferencesImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool allowAnalytics,
      bool allowPersonalization,
      bool allowThirdPartySharing});
}

/// @nodoc
class __$$DataPreferencesImplCopyWithImpl<$Res>
    extends _$DataPreferencesCopyWithImpl<$Res, _$DataPreferencesImpl>
    implements _$$DataPreferencesImplCopyWith<$Res> {
  __$$DataPreferencesImplCopyWithImpl(
      _$DataPreferencesImpl _value, $Res Function(_$DataPreferencesImpl) _then)
      : super(_value, _then);

  /// Create a copy of DataPreferences
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? allowAnalytics = null,
    Object? allowPersonalization = null,
    Object? allowThirdPartySharing = null,
  }) {
    return _then(_$DataPreferencesImpl(
      allowAnalytics: null == allowAnalytics
          ? _value.allowAnalytics
          : allowAnalytics // ignore: cast_nullable_to_non_nullable
              as bool,
      allowPersonalization: null == allowPersonalization
          ? _value.allowPersonalization
          : allowPersonalization // ignore: cast_nullable_to_non_nullable
              as bool,
      allowThirdPartySharing: null == allowThirdPartySharing
          ? _value.allowThirdPartySharing
          : allowThirdPartySharing // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$DataPreferencesImpl implements _DataPreferences {
  const _$DataPreferencesImpl(
      {required this.allowAnalytics,
      required this.allowPersonalization,
      required this.allowThirdPartySharing});

  factory _$DataPreferencesImpl.fromJson(Map<String, dynamic> json) =>
      _$$DataPreferencesImplFromJson(json);

  @override
  final bool allowAnalytics;
  @override
  final bool allowPersonalization;
  @override
  final bool allowThirdPartySharing;

  @override
  String toString() {
    return 'DataPreferences(allowAnalytics: $allowAnalytics, allowPersonalization: $allowPersonalization, allowThirdPartySharing: $allowThirdPartySharing)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DataPreferencesImpl &&
            (identical(other.allowAnalytics, allowAnalytics) ||
                other.allowAnalytics == allowAnalytics) &&
            (identical(other.allowPersonalization, allowPersonalization) ||
                other.allowPersonalization == allowPersonalization) &&
            (identical(other.allowThirdPartySharing, allowThirdPartySharing) ||
                other.allowThirdPartySharing == allowThirdPartySharing));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, allowAnalytics,
      allowPersonalization, allowThirdPartySharing);

  /// Create a copy of DataPreferences
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DataPreferencesImplCopyWith<_$DataPreferencesImpl> get copyWith =>
      __$$DataPreferencesImplCopyWithImpl<_$DataPreferencesImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$DataPreferencesImplToJson(
      this,
    );
  }
}

abstract class _DataPreferences implements DataPreferences {
  const factory _DataPreferences(
      {required final bool allowAnalytics,
      required final bool allowPersonalization,
      required final bool allowThirdPartySharing}) = _$DataPreferencesImpl;

  factory _DataPreferences.fromJson(Map<String, dynamic> json) =
      _$DataPreferencesImpl.fromJson;

  @override
  bool get allowAnalytics;
  @override
  bool get allowPersonalization;
  @override
  bool get allowThirdPartySharing;

  /// Create a copy of DataPreferences
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DataPreferencesImplCopyWith<_$DataPreferencesImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AccessControlSettings _$AccessControlSettingsFromJson(
    Map<String, dynamic> json) {
  return _AccessControlSettings.fromJson(json);
}

/// @nodoc
mixin _$AccessControlSettings {
  bool get requirePinForSettings => throw _privateConstructorUsedError;
  String? get pinHash => throw _privateConstructorUsedError;
  String? get pinSalt => throw _privateConstructorUsedError;
  bool get allowAccountDeletion => throw _privateConstructorUsedError;
  bool get twoFactorEnabled => throw _privateConstructorUsedError;

  /// Serializes this AccessControlSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AccessControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AccessControlSettingsCopyWith<AccessControlSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AccessControlSettingsCopyWith<$Res> {
  factory $AccessControlSettingsCopyWith(AccessControlSettings value,
          $Res Function(AccessControlSettings) then) =
      _$AccessControlSettingsCopyWithImpl<$Res, AccessControlSettings>;
  @useResult
  $Res call(
      {bool requirePinForSettings,
      String? pinHash,
      String? pinSalt,
      bool allowAccountDeletion,
      bool twoFactorEnabled});
}

/// @nodoc
class _$AccessControlSettingsCopyWithImpl<$Res,
        $Val extends AccessControlSettings>
    implements $AccessControlSettingsCopyWith<$Res> {
  _$AccessControlSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AccessControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? requirePinForSettings = null,
    Object? pinHash = freezed,
    Object? pinSalt = freezed,
    Object? allowAccountDeletion = null,
    Object? twoFactorEnabled = null,
  }) {
    return _then(_value.copyWith(
      requirePinForSettings: null == requirePinForSettings
          ? _value.requirePinForSettings
          : requirePinForSettings // ignore: cast_nullable_to_non_nullable
              as bool,
      pinHash: freezed == pinHash
          ? _value.pinHash
          : pinHash // ignore: cast_nullable_to_non_nullable
              as String?,
      pinSalt: freezed == pinSalt
          ? _value.pinSalt
          : pinSalt // ignore: cast_nullable_to_non_nullable
              as String?,
      allowAccountDeletion: null == allowAccountDeletion
          ? _value.allowAccountDeletion
          : allowAccountDeletion // ignore: cast_nullable_to_non_nullable
              as bool,
      twoFactorEnabled: null == twoFactorEnabled
          ? _value.twoFactorEnabled
          : twoFactorEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AccessControlSettingsImplCopyWith<$Res>
    implements $AccessControlSettingsCopyWith<$Res> {
  factory _$$AccessControlSettingsImplCopyWith(
          _$AccessControlSettingsImpl value,
          $Res Function(_$AccessControlSettingsImpl) then) =
      __$$AccessControlSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool requirePinForSettings,
      String? pinHash,
      String? pinSalt,
      bool allowAccountDeletion,
      bool twoFactorEnabled});
}

/// @nodoc
class __$$AccessControlSettingsImplCopyWithImpl<$Res>
    extends _$AccessControlSettingsCopyWithImpl<$Res,
        _$AccessControlSettingsImpl>
    implements _$$AccessControlSettingsImplCopyWith<$Res> {
  __$$AccessControlSettingsImplCopyWithImpl(_$AccessControlSettingsImpl _value,
      $Res Function(_$AccessControlSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of AccessControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? requirePinForSettings = null,
    Object? pinHash = freezed,
    Object? pinSalt = freezed,
    Object? allowAccountDeletion = null,
    Object? twoFactorEnabled = null,
  }) {
    return _then(_$AccessControlSettingsImpl(
      requirePinForSettings: null == requirePinForSettings
          ? _value.requirePinForSettings
          : requirePinForSettings // ignore: cast_nullable_to_non_nullable
              as bool,
      pinHash: freezed == pinHash
          ? _value.pinHash
          : pinHash // ignore: cast_nullable_to_non_nullable
              as String?,
      pinSalt: freezed == pinSalt
          ? _value.pinSalt
          : pinSalt // ignore: cast_nullable_to_non_nullable
              as String?,
      allowAccountDeletion: null == allowAccountDeletion
          ? _value.allowAccountDeletion
          : allowAccountDeletion // ignore: cast_nullable_to_non_nullable
              as bool,
      twoFactorEnabled: null == twoFactorEnabled
          ? _value.twoFactorEnabled
          : twoFactorEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AccessControlSettingsImpl implements _AccessControlSettings {
  const _$AccessControlSettingsImpl(
      {required this.requirePinForSettings,
      this.pinHash,
      this.pinSalt,
      required this.allowAccountDeletion,
      required this.twoFactorEnabled});

  factory _$AccessControlSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$AccessControlSettingsImplFromJson(json);

  @override
  final bool requirePinForSettings;
  @override
  final String? pinHash;
  @override
  final String? pinSalt;
  @override
  final bool allowAccountDeletion;
  @override
  final bool twoFactorEnabled;

  @override
  String toString() {
    return 'AccessControlSettings(requirePinForSettings: $requirePinForSettings, pinHash: $pinHash, pinSalt: $pinSalt, allowAccountDeletion: $allowAccountDeletion, twoFactorEnabled: $twoFactorEnabled)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AccessControlSettingsImpl &&
            (identical(other.requirePinForSettings, requirePinForSettings) ||
                other.requirePinForSettings == requirePinForSettings) &&
            (identical(other.pinHash, pinHash) || other.pinHash == pinHash) &&
            (identical(other.pinSalt, pinSalt) || other.pinSalt == pinSalt) &&
            (identical(other.allowAccountDeletion, allowAccountDeletion) ||
                other.allowAccountDeletion == allowAccountDeletion) &&
            (identical(other.twoFactorEnabled, twoFactorEnabled) ||
                other.twoFactorEnabled == twoFactorEnabled));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, requirePinForSettings, pinHash,
      pinSalt, allowAccountDeletion, twoFactorEnabled);

  /// Create a copy of AccessControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AccessControlSettingsImplCopyWith<_$AccessControlSettingsImpl>
      get copyWith => __$$AccessControlSettingsImplCopyWithImpl<
          _$AccessControlSettingsImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AccessControlSettingsImplToJson(
      this,
    );
  }
}

abstract class _AccessControlSettings implements AccessControlSettings {
  const factory _AccessControlSettings(
      {required final bool requirePinForSettings,
      final String? pinHash,
      final String? pinSalt,
      required final bool allowAccountDeletion,
      required final bool twoFactorEnabled}) = _$AccessControlSettingsImpl;

  factory _AccessControlSettings.fromJson(Map<String, dynamic> json) =
      _$AccessControlSettingsImpl.fromJson;

  @override
  bool get requirePinForSettings;
  @override
  String? get pinHash;
  @override
  String? get pinSalt;
  @override
  bool get allowAccountDeletion;
  @override
  bool get twoFactorEnabled;

  /// Create a copy of AccessControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AccessControlSettingsImplCopyWith<_$AccessControlSettingsImpl>
      get copyWith => throw _privateConstructorUsedError;
}

EmergencySettings _$EmergencySettingsFromJson(Map<String, dynamic> json) {
  return _EmergencySettings.fromJson(json);
}

/// @nodoc
mixin _$EmergencySettings {
  bool get emergencyContactEnabled => throw _privateConstructorUsedError;
  String? get emergencyEmail => throw _privateConstructorUsedError;
  String? get emergencyPhone => throw _privateConstructorUsedError;

  /// Serializes this EmergencySettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of EmergencySettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $EmergencySettingsCopyWith<EmergencySettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $EmergencySettingsCopyWith<$Res> {
  factory $EmergencySettingsCopyWith(
          EmergencySettings value, $Res Function(EmergencySettings) then) =
      _$EmergencySettingsCopyWithImpl<$Res, EmergencySettings>;
  @useResult
  $Res call(
      {bool emergencyContactEnabled,
      String? emergencyEmail,
      String? emergencyPhone});
}

/// @nodoc
class _$EmergencySettingsCopyWithImpl<$Res, $Val extends EmergencySettings>
    implements $EmergencySettingsCopyWith<$Res> {
  _$EmergencySettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of EmergencySettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? emergencyContactEnabled = null,
    Object? emergencyEmail = freezed,
    Object? emergencyPhone = freezed,
  }) {
    return _then(_value.copyWith(
      emergencyContactEnabled: null == emergencyContactEnabled
          ? _value.emergencyContactEnabled
          : emergencyContactEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      emergencyEmail: freezed == emergencyEmail
          ? _value.emergencyEmail
          : emergencyEmail // ignore: cast_nullable_to_non_nullable
              as String?,
      emergencyPhone: freezed == emergencyPhone
          ? _value.emergencyPhone
          : emergencyPhone // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$EmergencySettingsImplCopyWith<$Res>
    implements $EmergencySettingsCopyWith<$Res> {
  factory _$$EmergencySettingsImplCopyWith(_$EmergencySettingsImpl value,
          $Res Function(_$EmergencySettingsImpl) then) =
      __$$EmergencySettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool emergencyContactEnabled,
      String? emergencyEmail,
      String? emergencyPhone});
}

/// @nodoc
class __$$EmergencySettingsImplCopyWithImpl<$Res>
    extends _$EmergencySettingsCopyWithImpl<$Res, _$EmergencySettingsImpl>
    implements _$$EmergencySettingsImplCopyWith<$Res> {
  __$$EmergencySettingsImplCopyWithImpl(_$EmergencySettingsImpl _value,
      $Res Function(_$EmergencySettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of EmergencySettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? emergencyContactEnabled = null,
    Object? emergencyEmail = freezed,
    Object? emergencyPhone = freezed,
  }) {
    return _then(_$EmergencySettingsImpl(
      emergencyContactEnabled: null == emergencyContactEnabled
          ? _value.emergencyContactEnabled
          : emergencyContactEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      emergencyEmail: freezed == emergencyEmail
          ? _value.emergencyEmail
          : emergencyEmail // ignore: cast_nullable_to_non_nullable
              as String?,
      emergencyPhone: freezed == emergencyPhone
          ? _value.emergencyPhone
          : emergencyPhone // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$EmergencySettingsImpl implements _EmergencySettings {
  const _$EmergencySettingsImpl(
      {required this.emergencyContactEnabled,
      this.emergencyEmail,
      this.emergencyPhone});

  factory _$EmergencySettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$EmergencySettingsImplFromJson(json);

  @override
  final bool emergencyContactEnabled;
  @override
  final String? emergencyEmail;
  @override
  final String? emergencyPhone;

  @override
  String toString() {
    return 'EmergencySettings(emergencyContactEnabled: $emergencyContactEnabled, emergencyEmail: $emergencyEmail, emergencyPhone: $emergencyPhone)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$EmergencySettingsImpl &&
            (identical(
                    other.emergencyContactEnabled, emergencyContactEnabled) ||
                other.emergencyContactEnabled == emergencyContactEnabled) &&
            (identical(other.emergencyEmail, emergencyEmail) ||
                other.emergencyEmail == emergencyEmail) &&
            (identical(other.emergencyPhone, emergencyPhone) ||
                other.emergencyPhone == emergencyPhone));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, emergencyContactEnabled, emergencyEmail, emergencyPhone);

  /// Create a copy of EmergencySettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$EmergencySettingsImplCopyWith<_$EmergencySettingsImpl> get copyWith =>
      __$$EmergencySettingsImplCopyWithImpl<_$EmergencySettingsImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$EmergencySettingsImplToJson(
      this,
    );
  }
}

abstract class _EmergencySettings implements EmergencySettings {
  const factory _EmergencySettings(
      {required final bool emergencyContactEnabled,
      final String? emergencyEmail,
      final String? emergencyPhone}) = _$EmergencySettingsImpl;

  factory _EmergencySettings.fromJson(Map<String, dynamic> json) =
      _$EmergencySettingsImpl.fromJson;

  @override
  bool get emergencyContactEnabled;
  @override
  String? get emergencyEmail;
  @override
  String? get emergencyPhone;

  /// Create a copy of EmergencySettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$EmergencySettingsImplCopyWith<_$EmergencySettingsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

SafetySettings _$SafetySettingsFromJson(Map<String, dynamic> json) {
  return _SafetySettings.fromJson(json);
}

/// @nodoc
mixin _$SafetySettings {
  PrivacySettings get privacy => throw _privateConstructorUsedError;
  DataPreferences get data => throw _privateConstructorUsedError;
  AccessControlSettings get access => throw _privateConstructorUsedError;
  EmergencySettings get emergency => throw _privateConstructorUsedError;

  /// Serializes this SafetySettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SafetySettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SafetySettingsCopyWith<SafetySettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SafetySettingsCopyWith<$Res> {
  factory $SafetySettingsCopyWith(
          SafetySettings value, $Res Function(SafetySettings) then) =
      _$SafetySettingsCopyWithImpl<$Res, SafetySettings>;
  @useResult
  $Res call(
      {PrivacySettings privacy,
      DataPreferences data,
      AccessControlSettings access,
      EmergencySettings emergency});

  $PrivacySettingsCopyWith<$Res> get privacy;
  $DataPreferencesCopyWith<$Res> get data;
  $AccessControlSettingsCopyWith<$Res> get access;
  $EmergencySettingsCopyWith<$Res> get emergency;
}

/// @nodoc
class _$SafetySettingsCopyWithImpl<$Res, $Val extends SafetySettings>
    implements $SafetySettingsCopyWith<$Res> {
  _$SafetySettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SafetySettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? privacy = null,
    Object? data = null,
    Object? access = null,
    Object? emergency = null,
  }) {
    return _then(_value.copyWith(
      privacy: null == privacy
          ? _value.privacy
          : privacy // ignore: cast_nullable_to_non_nullable
              as PrivacySettings,
      data: null == data
          ? _value.data
          : data // ignore: cast_nullable_to_non_nullable
              as DataPreferences,
      access: null == access
          ? _value.access
          : access // ignore: cast_nullable_to_non_nullable
              as AccessControlSettings,
      emergency: null == emergency
          ? _value.emergency
          : emergency // ignore: cast_nullable_to_non_nullable
              as EmergencySettings,
    ) as $Val);
  }

  /// Create a copy of SafetySettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $PrivacySettingsCopyWith<$Res> get privacy {
    return $PrivacySettingsCopyWith<$Res>(_value.privacy, (value) {
      return _then(_value.copyWith(privacy: value) as $Val);
    });
  }

  /// Create a copy of SafetySettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $DataPreferencesCopyWith<$Res> get data {
    return $DataPreferencesCopyWith<$Res>(_value.data, (value) {
      return _then(_value.copyWith(data: value) as $Val);
    });
  }

  /// Create a copy of SafetySettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $AccessControlSettingsCopyWith<$Res> get access {
    return $AccessControlSettingsCopyWith<$Res>(_value.access, (value) {
      return _then(_value.copyWith(access: value) as $Val);
    });
  }

  /// Create a copy of SafetySettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $EmergencySettingsCopyWith<$Res> get emergency {
    return $EmergencySettingsCopyWith<$Res>(_value.emergency, (value) {
      return _then(_value.copyWith(emergency: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$SafetySettingsImplCopyWith<$Res>
    implements $SafetySettingsCopyWith<$Res> {
  factory _$$SafetySettingsImplCopyWith(_$SafetySettingsImpl value,
          $Res Function(_$SafetySettingsImpl) then) =
      __$$SafetySettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {PrivacySettings privacy,
      DataPreferences data,
      AccessControlSettings access,
      EmergencySettings emergency});

  @override
  $PrivacySettingsCopyWith<$Res> get privacy;
  @override
  $DataPreferencesCopyWith<$Res> get data;
  @override
  $AccessControlSettingsCopyWith<$Res> get access;
  @override
  $EmergencySettingsCopyWith<$Res> get emergency;
}

/// @nodoc
class __$$SafetySettingsImplCopyWithImpl<$Res>
    extends _$SafetySettingsCopyWithImpl<$Res, _$SafetySettingsImpl>
    implements _$$SafetySettingsImplCopyWith<$Res> {
  __$$SafetySettingsImplCopyWithImpl(
      _$SafetySettingsImpl _value, $Res Function(_$SafetySettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of SafetySettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? privacy = null,
    Object? data = null,
    Object? access = null,
    Object? emergency = null,
  }) {
    return _then(_$SafetySettingsImpl(
      privacy: null == privacy
          ? _value.privacy
          : privacy // ignore: cast_nullable_to_non_nullable
              as PrivacySettings,
      data: null == data
          ? _value.data
          : data // ignore: cast_nullable_to_non_nullable
              as DataPreferences,
      access: null == access
          ? _value.access
          : access // ignore: cast_nullable_to_non_nullable
              as AccessControlSettings,
      emergency: null == emergency
          ? _value.emergency
          : emergency // ignore: cast_nullable_to_non_nullable
              as EmergencySettings,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SafetySettingsImpl implements _SafetySettings {
  const _$SafetySettingsImpl(
      {required this.privacy,
      required this.data,
      required this.access,
      required this.emergency});

  factory _$SafetySettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$SafetySettingsImplFromJson(json);

  @override
  final PrivacySettings privacy;
  @override
  final DataPreferences data;
  @override
  final AccessControlSettings access;
  @override
  final EmergencySettings emergency;

  @override
  String toString() {
    return 'SafetySettings(privacy: $privacy, data: $data, access: $access, emergency: $emergency)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SafetySettingsImpl &&
            (identical(other.privacy, privacy) || other.privacy == privacy) &&
            (identical(other.data, data) || other.data == data) &&
            (identical(other.access, access) || other.access == access) &&
            (identical(other.emergency, emergency) ||
                other.emergency == emergency));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, privacy, data, access, emergency);

  /// Create a copy of SafetySettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SafetySettingsImplCopyWith<_$SafetySettingsImpl> get copyWith =>
      __$$SafetySettingsImplCopyWithImpl<_$SafetySettingsImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SafetySettingsImplToJson(
      this,
    );
  }
}

abstract class _SafetySettings implements SafetySettings {
  const factory _SafetySettings(
      {required final PrivacySettings privacy,
      required final DataPreferences data,
      required final AccessControlSettings access,
      required final EmergencySettings emergency}) = _$SafetySettingsImpl;

  factory _SafetySettings.fromJson(Map<String, dynamic> json) =
      _$SafetySettingsImpl.fromJson;

  @override
  PrivacySettings get privacy;
  @override
  DataPreferences get data;
  @override
  AccessControlSettings get access;
  @override
  EmergencySettings get emergency;

  /// Create a copy of SafetySettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SafetySettingsImplCopyWith<_$SafetySettingsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

EmailNotificationSettings _$EmailNotificationSettingsFromJson(
    Map<String, dynamic> json) {
  return _EmailNotificationSettings.fromJson(json);
}

/// @nodoc
mixin _$EmailNotificationSettings {
  bool get enabled => throw _privateConstructorUsedError;
  bool get dailyDigest => throw _privateConstructorUsedError;
  bool get weeklyReport => throw _privateConstructorUsedError;
  bool get achievements => throw _privateConstructorUsedError;
  bool get concerns => throw _privateConstructorUsedError;
  bool get teacherMessages => throw _privateConstructorUsedError;

  /// Serializes this EmailNotificationSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of EmailNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $EmailNotificationSettingsCopyWith<EmailNotificationSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $EmailNotificationSettingsCopyWith<$Res> {
  factory $EmailNotificationSettingsCopyWith(EmailNotificationSettings value,
          $Res Function(EmailNotificationSettings) then) =
      _$EmailNotificationSettingsCopyWithImpl<$Res, EmailNotificationSettings>;
  @useResult
  $Res call(
      {bool enabled,
      bool dailyDigest,
      bool weeklyReport,
      bool achievements,
      bool concerns,
      bool teacherMessages});
}

/// @nodoc
class _$EmailNotificationSettingsCopyWithImpl<$Res,
        $Val extends EmailNotificationSettings>
    implements $EmailNotificationSettingsCopyWith<$Res> {
  _$EmailNotificationSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of EmailNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
    Object? dailyDigest = null,
    Object? weeklyReport = null,
    Object? achievements = null,
    Object? concerns = null,
    Object? teacherMessages = null,
  }) {
    return _then(_value.copyWith(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      dailyDigest: null == dailyDigest
          ? _value.dailyDigest
          : dailyDigest // ignore: cast_nullable_to_non_nullable
              as bool,
      weeklyReport: null == weeklyReport
          ? _value.weeklyReport
          : weeklyReport // ignore: cast_nullable_to_non_nullable
              as bool,
      achievements: null == achievements
          ? _value.achievements
          : achievements // ignore: cast_nullable_to_non_nullable
              as bool,
      concerns: null == concerns
          ? _value.concerns
          : concerns // ignore: cast_nullable_to_non_nullable
              as bool,
      teacherMessages: null == teacherMessages
          ? _value.teacherMessages
          : teacherMessages // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$EmailNotificationSettingsImplCopyWith<$Res>
    implements $EmailNotificationSettingsCopyWith<$Res> {
  factory _$$EmailNotificationSettingsImplCopyWith(
          _$EmailNotificationSettingsImpl value,
          $Res Function(_$EmailNotificationSettingsImpl) then) =
      __$$EmailNotificationSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool enabled,
      bool dailyDigest,
      bool weeklyReport,
      bool achievements,
      bool concerns,
      bool teacherMessages});
}

/// @nodoc
class __$$EmailNotificationSettingsImplCopyWithImpl<$Res>
    extends _$EmailNotificationSettingsCopyWithImpl<$Res,
        _$EmailNotificationSettingsImpl>
    implements _$$EmailNotificationSettingsImplCopyWith<$Res> {
  __$$EmailNotificationSettingsImplCopyWithImpl(
      _$EmailNotificationSettingsImpl _value,
      $Res Function(_$EmailNotificationSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of EmailNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
    Object? dailyDigest = null,
    Object? weeklyReport = null,
    Object? achievements = null,
    Object? concerns = null,
    Object? teacherMessages = null,
  }) {
    return _then(_$EmailNotificationSettingsImpl(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      dailyDigest: null == dailyDigest
          ? _value.dailyDigest
          : dailyDigest // ignore: cast_nullable_to_non_nullable
              as bool,
      weeklyReport: null == weeklyReport
          ? _value.weeklyReport
          : weeklyReport // ignore: cast_nullable_to_non_nullable
              as bool,
      achievements: null == achievements
          ? _value.achievements
          : achievements // ignore: cast_nullable_to_non_nullable
              as bool,
      concerns: null == concerns
          ? _value.concerns
          : concerns // ignore: cast_nullable_to_non_nullable
              as bool,
      teacherMessages: null == teacherMessages
          ? _value.teacherMessages
          : teacherMessages // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$EmailNotificationSettingsImpl implements _EmailNotificationSettings {
  const _$EmailNotificationSettingsImpl(
      {required this.enabled,
      required this.dailyDigest,
      required this.weeklyReport,
      required this.achievements,
      required this.concerns,
      required this.teacherMessages});

  factory _$EmailNotificationSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$EmailNotificationSettingsImplFromJson(json);

  @override
  final bool enabled;
  @override
  final bool dailyDigest;
  @override
  final bool weeklyReport;
  @override
  final bool achievements;
  @override
  final bool concerns;
  @override
  final bool teacherMessages;

  @override
  String toString() {
    return 'EmailNotificationSettings(enabled: $enabled, dailyDigest: $dailyDigest, weeklyReport: $weeklyReport, achievements: $achievements, concerns: $concerns, teacherMessages: $teacherMessages)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$EmailNotificationSettingsImpl &&
            (identical(other.enabled, enabled) || other.enabled == enabled) &&
            (identical(other.dailyDigest, dailyDigest) ||
                other.dailyDigest == dailyDigest) &&
            (identical(other.weeklyReport, weeklyReport) ||
                other.weeklyReport == weeklyReport) &&
            (identical(other.achievements, achievements) ||
                other.achievements == achievements) &&
            (identical(other.concerns, concerns) ||
                other.concerns == concerns) &&
            (identical(other.teacherMessages, teacherMessages) ||
                other.teacherMessages == teacherMessages));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, enabled, dailyDigest,
      weeklyReport, achievements, concerns, teacherMessages);

  /// Create a copy of EmailNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$EmailNotificationSettingsImplCopyWith<_$EmailNotificationSettingsImpl>
      get copyWith => __$$EmailNotificationSettingsImplCopyWithImpl<
          _$EmailNotificationSettingsImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$EmailNotificationSettingsImplToJson(
      this,
    );
  }
}

abstract class _EmailNotificationSettings implements EmailNotificationSettings {
  const factory _EmailNotificationSettings(
      {required final bool enabled,
      required final bool dailyDigest,
      required final bool weeklyReport,
      required final bool achievements,
      required final bool concerns,
      required final bool teacherMessages}) = _$EmailNotificationSettingsImpl;

  factory _EmailNotificationSettings.fromJson(Map<String, dynamic> json) =
      _$EmailNotificationSettingsImpl.fromJson;

  @override
  bool get enabled;
  @override
  bool get dailyDigest;
  @override
  bool get weeklyReport;
  @override
  bool get achievements;
  @override
  bool get concerns;
  @override
  bool get teacherMessages;

  /// Create a copy of EmailNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$EmailNotificationSettingsImplCopyWith<_$EmailNotificationSettingsImpl>
      get copyWith => throw _privateConstructorUsedError;
}

PushNotificationSettings _$PushNotificationSettingsFromJson(
    Map<String, dynamic> json) {
  return _PushNotificationSettings.fromJson(json);
}

/// @nodoc
mixin _$PushNotificationSettings {
  bool get enabled => throw _privateConstructorUsedError;
  bool get achievements => throw _privateConstructorUsedError;
  bool get milestones => throw _privateConstructorUsedError;
  bool get concerns => throw _privateConstructorUsedError;
  bool get teacherMessages => throw _privateConstructorUsedError;
  bool get screenTimeAlerts => throw _privateConstructorUsedError;

  /// Serializes this PushNotificationSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of PushNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $PushNotificationSettingsCopyWith<PushNotificationSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $PushNotificationSettingsCopyWith<$Res> {
  factory $PushNotificationSettingsCopyWith(PushNotificationSettings value,
          $Res Function(PushNotificationSettings) then) =
      _$PushNotificationSettingsCopyWithImpl<$Res, PushNotificationSettings>;
  @useResult
  $Res call(
      {bool enabled,
      bool achievements,
      bool milestones,
      bool concerns,
      bool teacherMessages,
      bool screenTimeAlerts});
}

/// @nodoc
class _$PushNotificationSettingsCopyWithImpl<$Res,
        $Val extends PushNotificationSettings>
    implements $PushNotificationSettingsCopyWith<$Res> {
  _$PushNotificationSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of PushNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
    Object? achievements = null,
    Object? milestones = null,
    Object? concerns = null,
    Object? teacherMessages = null,
    Object? screenTimeAlerts = null,
  }) {
    return _then(_value.copyWith(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      achievements: null == achievements
          ? _value.achievements
          : achievements // ignore: cast_nullable_to_non_nullable
              as bool,
      milestones: null == milestones
          ? _value.milestones
          : milestones // ignore: cast_nullable_to_non_nullable
              as bool,
      concerns: null == concerns
          ? _value.concerns
          : concerns // ignore: cast_nullable_to_non_nullable
              as bool,
      teacherMessages: null == teacherMessages
          ? _value.teacherMessages
          : teacherMessages // ignore: cast_nullable_to_non_nullable
              as bool,
      screenTimeAlerts: null == screenTimeAlerts
          ? _value.screenTimeAlerts
          : screenTimeAlerts // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$PushNotificationSettingsImplCopyWith<$Res>
    implements $PushNotificationSettingsCopyWith<$Res> {
  factory _$$PushNotificationSettingsImplCopyWith(
          _$PushNotificationSettingsImpl value,
          $Res Function(_$PushNotificationSettingsImpl) then) =
      __$$PushNotificationSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool enabled,
      bool achievements,
      bool milestones,
      bool concerns,
      bool teacherMessages,
      bool screenTimeAlerts});
}

/// @nodoc
class __$$PushNotificationSettingsImplCopyWithImpl<$Res>
    extends _$PushNotificationSettingsCopyWithImpl<$Res,
        _$PushNotificationSettingsImpl>
    implements _$$PushNotificationSettingsImplCopyWith<$Res> {
  __$$PushNotificationSettingsImplCopyWithImpl(
      _$PushNotificationSettingsImpl _value,
      $Res Function(_$PushNotificationSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of PushNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
    Object? achievements = null,
    Object? milestones = null,
    Object? concerns = null,
    Object? teacherMessages = null,
    Object? screenTimeAlerts = null,
  }) {
    return _then(_$PushNotificationSettingsImpl(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      achievements: null == achievements
          ? _value.achievements
          : achievements // ignore: cast_nullable_to_non_nullable
              as bool,
      milestones: null == milestones
          ? _value.milestones
          : milestones // ignore: cast_nullable_to_non_nullable
              as bool,
      concerns: null == concerns
          ? _value.concerns
          : concerns // ignore: cast_nullable_to_non_nullable
              as bool,
      teacherMessages: null == teacherMessages
          ? _value.teacherMessages
          : teacherMessages // ignore: cast_nullable_to_non_nullable
              as bool,
      screenTimeAlerts: null == screenTimeAlerts
          ? _value.screenTimeAlerts
          : screenTimeAlerts // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$PushNotificationSettingsImpl implements _PushNotificationSettings {
  const _$PushNotificationSettingsImpl(
      {required this.enabled,
      required this.achievements,
      required this.milestones,
      required this.concerns,
      required this.teacherMessages,
      required this.screenTimeAlerts});

  factory _$PushNotificationSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$PushNotificationSettingsImplFromJson(json);

  @override
  final bool enabled;
  @override
  final bool achievements;
  @override
  final bool milestones;
  @override
  final bool concerns;
  @override
  final bool teacherMessages;
  @override
  final bool screenTimeAlerts;

  @override
  String toString() {
    return 'PushNotificationSettings(enabled: $enabled, achievements: $achievements, milestones: $milestones, concerns: $concerns, teacherMessages: $teacherMessages, screenTimeAlerts: $screenTimeAlerts)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PushNotificationSettingsImpl &&
            (identical(other.enabled, enabled) || other.enabled == enabled) &&
            (identical(other.achievements, achievements) ||
                other.achievements == achievements) &&
            (identical(other.milestones, milestones) ||
                other.milestones == milestones) &&
            (identical(other.concerns, concerns) ||
                other.concerns == concerns) &&
            (identical(other.teacherMessages, teacherMessages) ||
                other.teacherMessages == teacherMessages) &&
            (identical(other.screenTimeAlerts, screenTimeAlerts) ||
                other.screenTimeAlerts == screenTimeAlerts));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, enabled, achievements,
      milestones, concerns, teacherMessages, screenTimeAlerts);

  /// Create a copy of PushNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$PushNotificationSettingsImplCopyWith<_$PushNotificationSettingsImpl>
      get copyWith => __$$PushNotificationSettingsImplCopyWithImpl<
          _$PushNotificationSettingsImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$PushNotificationSettingsImplToJson(
      this,
    );
  }
}

abstract class _PushNotificationSettings implements PushNotificationSettings {
  const factory _PushNotificationSettings(
      {required final bool enabled,
      required final bool achievements,
      required final bool milestones,
      required final bool concerns,
      required final bool teacherMessages,
      required final bool screenTimeAlerts}) = _$PushNotificationSettingsImpl;

  factory _PushNotificationSettings.fromJson(Map<String, dynamic> json) =
      _$PushNotificationSettingsImpl.fromJson;

  @override
  bool get enabled;
  @override
  bool get achievements;
  @override
  bool get milestones;
  @override
  bool get concerns;
  @override
  bool get teacherMessages;
  @override
  bool get screenTimeAlerts;

  /// Create a copy of PushNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$PushNotificationSettingsImplCopyWith<_$PushNotificationSettingsImpl>
      get copyWith => throw _privateConstructorUsedError;
}

InAppNotificationSettings _$InAppNotificationSettingsFromJson(
    Map<String, dynamic> json) {
  return _InAppNotificationSettings.fromJson(json);
}

/// @nodoc
mixin _$InAppNotificationSettings {
  bool get enabled => throw _privateConstructorUsedError;
  bool get achievements => throw _privateConstructorUsedError;
  bool get progress => throw _privateConstructorUsedError;
  bool get recommendations => throw _privateConstructorUsedError;

  /// Serializes this InAppNotificationSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of InAppNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $InAppNotificationSettingsCopyWith<InAppNotificationSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $InAppNotificationSettingsCopyWith<$Res> {
  factory $InAppNotificationSettingsCopyWith(InAppNotificationSettings value,
          $Res Function(InAppNotificationSettings) then) =
      _$InAppNotificationSettingsCopyWithImpl<$Res, InAppNotificationSettings>;
  @useResult
  $Res call(
      {bool enabled, bool achievements, bool progress, bool recommendations});
}

/// @nodoc
class _$InAppNotificationSettingsCopyWithImpl<$Res,
        $Val extends InAppNotificationSettings>
    implements $InAppNotificationSettingsCopyWith<$Res> {
  _$InAppNotificationSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of InAppNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
    Object? achievements = null,
    Object? progress = null,
    Object? recommendations = null,
  }) {
    return _then(_value.copyWith(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      achievements: null == achievements
          ? _value.achievements
          : achievements // ignore: cast_nullable_to_non_nullable
              as bool,
      progress: null == progress
          ? _value.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as bool,
      recommendations: null == recommendations
          ? _value.recommendations
          : recommendations // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$InAppNotificationSettingsImplCopyWith<$Res>
    implements $InAppNotificationSettingsCopyWith<$Res> {
  factory _$$InAppNotificationSettingsImplCopyWith(
          _$InAppNotificationSettingsImpl value,
          $Res Function(_$InAppNotificationSettingsImpl) then) =
      __$$InAppNotificationSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool enabled, bool achievements, bool progress, bool recommendations});
}

/// @nodoc
class __$$InAppNotificationSettingsImplCopyWithImpl<$Res>
    extends _$InAppNotificationSettingsCopyWithImpl<$Res,
        _$InAppNotificationSettingsImpl>
    implements _$$InAppNotificationSettingsImplCopyWith<$Res> {
  __$$InAppNotificationSettingsImplCopyWithImpl(
      _$InAppNotificationSettingsImpl _value,
      $Res Function(_$InAppNotificationSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of InAppNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
    Object? achievements = null,
    Object? progress = null,
    Object? recommendations = null,
  }) {
    return _then(_$InAppNotificationSettingsImpl(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      achievements: null == achievements
          ? _value.achievements
          : achievements // ignore: cast_nullable_to_non_nullable
              as bool,
      progress: null == progress
          ? _value.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as bool,
      recommendations: null == recommendations
          ? _value.recommendations
          : recommendations // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$InAppNotificationSettingsImpl implements _InAppNotificationSettings {
  const _$InAppNotificationSettingsImpl(
      {required this.enabled,
      required this.achievements,
      required this.progress,
      required this.recommendations});

  factory _$InAppNotificationSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$InAppNotificationSettingsImplFromJson(json);

  @override
  final bool enabled;
  @override
  final bool achievements;
  @override
  final bool progress;
  @override
  final bool recommendations;

  @override
  String toString() {
    return 'InAppNotificationSettings(enabled: $enabled, achievements: $achievements, progress: $progress, recommendations: $recommendations)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$InAppNotificationSettingsImpl &&
            (identical(other.enabled, enabled) || other.enabled == enabled) &&
            (identical(other.achievements, achievements) ||
                other.achievements == achievements) &&
            (identical(other.progress, progress) ||
                other.progress == progress) &&
            (identical(other.recommendations, recommendations) ||
                other.recommendations == recommendations));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, enabled, achievements, progress, recommendations);

  /// Create a copy of InAppNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$InAppNotificationSettingsImplCopyWith<_$InAppNotificationSettingsImpl>
      get copyWith => __$$InAppNotificationSettingsImplCopyWithImpl<
          _$InAppNotificationSettingsImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$InAppNotificationSettingsImplToJson(
      this,
    );
  }
}

abstract class _InAppNotificationSettings implements InAppNotificationSettings {
  const factory _InAppNotificationSettings(
      {required final bool enabled,
      required final bool achievements,
      required final bool progress,
      required final bool recommendations}) = _$InAppNotificationSettingsImpl;

  factory _InAppNotificationSettings.fromJson(Map<String, dynamic> json) =
      _$InAppNotificationSettingsImpl.fromJson;

  @override
  bool get enabled;
  @override
  bool get achievements;
  @override
  bool get progress;
  @override
  bool get recommendations;

  /// Create a copy of InAppNotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$InAppNotificationSettingsImplCopyWith<_$InAppNotificationSettingsImpl>
      get copyWith => throw _privateConstructorUsedError;
}

QuietHoursSettings _$QuietHoursSettingsFromJson(Map<String, dynamic> json) {
  return _QuietHoursSettings.fromJson(json);
}

/// @nodoc
mixin _$QuietHoursSettings {
  bool get enabled => throw _privateConstructorUsedError;
  String get start => throw _privateConstructorUsedError;
  String get end => throw _privateConstructorUsedError;

  /// Serializes this QuietHoursSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of QuietHoursSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $QuietHoursSettingsCopyWith<QuietHoursSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $QuietHoursSettingsCopyWith<$Res> {
  factory $QuietHoursSettingsCopyWith(
          QuietHoursSettings value, $Res Function(QuietHoursSettings) then) =
      _$QuietHoursSettingsCopyWithImpl<$Res, QuietHoursSettings>;
  @useResult
  $Res call({bool enabled, String start, String end});
}

/// @nodoc
class _$QuietHoursSettingsCopyWithImpl<$Res, $Val extends QuietHoursSettings>
    implements $QuietHoursSettingsCopyWith<$Res> {
  _$QuietHoursSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of QuietHoursSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
    Object? start = null,
    Object? end = null,
  }) {
    return _then(_value.copyWith(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      start: null == start
          ? _value.start
          : start // ignore: cast_nullable_to_non_nullable
              as String,
      end: null == end
          ? _value.end
          : end // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$QuietHoursSettingsImplCopyWith<$Res>
    implements $QuietHoursSettingsCopyWith<$Res> {
  factory _$$QuietHoursSettingsImplCopyWith(_$QuietHoursSettingsImpl value,
          $Res Function(_$QuietHoursSettingsImpl) then) =
      __$$QuietHoursSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({bool enabled, String start, String end});
}

/// @nodoc
class __$$QuietHoursSettingsImplCopyWithImpl<$Res>
    extends _$QuietHoursSettingsCopyWithImpl<$Res, _$QuietHoursSettingsImpl>
    implements _$$QuietHoursSettingsImplCopyWith<$Res> {
  __$$QuietHoursSettingsImplCopyWithImpl(_$QuietHoursSettingsImpl _value,
      $Res Function(_$QuietHoursSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of QuietHoursSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
    Object? start = null,
    Object? end = null,
  }) {
    return _then(_$QuietHoursSettingsImpl(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      start: null == start
          ? _value.start
          : start // ignore: cast_nullable_to_non_nullable
              as String,
      end: null == end
          ? _value.end
          : end // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$QuietHoursSettingsImpl implements _QuietHoursSettings {
  const _$QuietHoursSettingsImpl(
      {required this.enabled, required this.start, required this.end});

  factory _$QuietHoursSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$QuietHoursSettingsImplFromJson(json);

  @override
  final bool enabled;
  @override
  final String start;
  @override
  final String end;

  @override
  String toString() {
    return 'QuietHoursSettings(enabled: $enabled, start: $start, end: $end)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$QuietHoursSettingsImpl &&
            (identical(other.enabled, enabled) || other.enabled == enabled) &&
            (identical(other.start, start) || other.start == start) &&
            (identical(other.end, end) || other.end == end));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, enabled, start, end);

  /// Create a copy of QuietHoursSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$QuietHoursSettingsImplCopyWith<_$QuietHoursSettingsImpl> get copyWith =>
      __$$QuietHoursSettingsImplCopyWithImpl<_$QuietHoursSettingsImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$QuietHoursSettingsImplToJson(
      this,
    );
  }
}

abstract class _QuietHoursSettings implements QuietHoursSettings {
  const factory _QuietHoursSettings(
      {required final bool enabled,
      required final String start,
      required final String end}) = _$QuietHoursSettingsImpl;

  factory _QuietHoursSettings.fromJson(Map<String, dynamic> json) =
      _$QuietHoursSettingsImpl.fromJson;

  @override
  bool get enabled;
  @override
  String get start;
  @override
  String get end;

  /// Create a copy of QuietHoursSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$QuietHoursSettingsImplCopyWith<_$QuietHoursSettingsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

NotificationSettings _$NotificationSettingsFromJson(Map<String, dynamic> json) {
  return _NotificationSettings.fromJson(json);
}

/// @nodoc
mixin _$NotificationSettings {
  EmailNotificationSettings get email => throw _privateConstructorUsedError;
  PushNotificationSettings get push => throw _privateConstructorUsedError;
  InAppNotificationSettings get inApp => throw _privateConstructorUsedError;
  QuietHoursSettings get quietHours => throw _privateConstructorUsedError;

  /// Serializes this NotificationSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of NotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $NotificationSettingsCopyWith<NotificationSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $NotificationSettingsCopyWith<$Res> {
  factory $NotificationSettingsCopyWith(NotificationSettings value,
          $Res Function(NotificationSettings) then) =
      _$NotificationSettingsCopyWithImpl<$Res, NotificationSettings>;
  @useResult
  $Res call(
      {EmailNotificationSettings email,
      PushNotificationSettings push,
      InAppNotificationSettings inApp,
      QuietHoursSettings quietHours});

  $EmailNotificationSettingsCopyWith<$Res> get email;
  $PushNotificationSettingsCopyWith<$Res> get push;
  $InAppNotificationSettingsCopyWith<$Res> get inApp;
  $QuietHoursSettingsCopyWith<$Res> get quietHours;
}

/// @nodoc
class _$NotificationSettingsCopyWithImpl<$Res,
        $Val extends NotificationSettings>
    implements $NotificationSettingsCopyWith<$Res> {
  _$NotificationSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of NotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? email = null,
    Object? push = null,
    Object? inApp = null,
    Object? quietHours = null,
  }) {
    return _then(_value.copyWith(
      email: null == email
          ? _value.email
          : email // ignore: cast_nullable_to_non_nullable
              as EmailNotificationSettings,
      push: null == push
          ? _value.push
          : push // ignore: cast_nullable_to_non_nullable
              as PushNotificationSettings,
      inApp: null == inApp
          ? _value.inApp
          : inApp // ignore: cast_nullable_to_non_nullable
              as InAppNotificationSettings,
      quietHours: null == quietHours
          ? _value.quietHours
          : quietHours // ignore: cast_nullable_to_non_nullable
              as QuietHoursSettings,
    ) as $Val);
  }

  /// Create a copy of NotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $EmailNotificationSettingsCopyWith<$Res> get email {
    return $EmailNotificationSettingsCopyWith<$Res>(_value.email, (value) {
      return _then(_value.copyWith(email: value) as $Val);
    });
  }

  /// Create a copy of NotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $PushNotificationSettingsCopyWith<$Res> get push {
    return $PushNotificationSettingsCopyWith<$Res>(_value.push, (value) {
      return _then(_value.copyWith(push: value) as $Val);
    });
  }

  /// Create a copy of NotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $InAppNotificationSettingsCopyWith<$Res> get inApp {
    return $InAppNotificationSettingsCopyWith<$Res>(_value.inApp, (value) {
      return _then(_value.copyWith(inApp: value) as $Val);
    });
  }

  /// Create a copy of NotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $QuietHoursSettingsCopyWith<$Res> get quietHours {
    return $QuietHoursSettingsCopyWith<$Res>(_value.quietHours, (value) {
      return _then(_value.copyWith(quietHours: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$NotificationSettingsImplCopyWith<$Res>
    implements $NotificationSettingsCopyWith<$Res> {
  factory _$$NotificationSettingsImplCopyWith(_$NotificationSettingsImpl value,
          $Res Function(_$NotificationSettingsImpl) then) =
      __$$NotificationSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {EmailNotificationSettings email,
      PushNotificationSettings push,
      InAppNotificationSettings inApp,
      QuietHoursSettings quietHours});

  @override
  $EmailNotificationSettingsCopyWith<$Res> get email;
  @override
  $PushNotificationSettingsCopyWith<$Res> get push;
  @override
  $InAppNotificationSettingsCopyWith<$Res> get inApp;
  @override
  $QuietHoursSettingsCopyWith<$Res> get quietHours;
}

/// @nodoc
class __$$NotificationSettingsImplCopyWithImpl<$Res>
    extends _$NotificationSettingsCopyWithImpl<$Res, _$NotificationSettingsImpl>
    implements _$$NotificationSettingsImplCopyWith<$Res> {
  __$$NotificationSettingsImplCopyWithImpl(_$NotificationSettingsImpl _value,
      $Res Function(_$NotificationSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of NotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? email = null,
    Object? push = null,
    Object? inApp = null,
    Object? quietHours = null,
  }) {
    return _then(_$NotificationSettingsImpl(
      email: null == email
          ? _value.email
          : email // ignore: cast_nullable_to_non_nullable
              as EmailNotificationSettings,
      push: null == push
          ? _value.push
          : push // ignore: cast_nullable_to_non_nullable
              as PushNotificationSettings,
      inApp: null == inApp
          ? _value.inApp
          : inApp // ignore: cast_nullable_to_non_nullable
              as InAppNotificationSettings,
      quietHours: null == quietHours
          ? _value.quietHours
          : quietHours // ignore: cast_nullable_to_non_nullable
              as QuietHoursSettings,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$NotificationSettingsImpl implements _NotificationSettings {
  const _$NotificationSettingsImpl(
      {required this.email,
      required this.push,
      required this.inApp,
      required this.quietHours});

  factory _$NotificationSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$NotificationSettingsImplFromJson(json);

  @override
  final EmailNotificationSettings email;
  @override
  final PushNotificationSettings push;
  @override
  final InAppNotificationSettings inApp;
  @override
  final QuietHoursSettings quietHours;

  @override
  String toString() {
    return 'NotificationSettings(email: $email, push: $push, inApp: $inApp, quietHours: $quietHours)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$NotificationSettingsImpl &&
            (identical(other.email, email) || other.email == email) &&
            (identical(other.push, push) || other.push == push) &&
            (identical(other.inApp, inApp) || other.inApp == inApp) &&
            (identical(other.quietHours, quietHours) ||
                other.quietHours == quietHours));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, email, push, inApp, quietHours);

  /// Create a copy of NotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$NotificationSettingsImplCopyWith<_$NotificationSettingsImpl>
      get copyWith =>
          __$$NotificationSettingsImplCopyWithImpl<_$NotificationSettingsImpl>(
              this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$NotificationSettingsImplToJson(
      this,
    );
  }
}

abstract class _NotificationSettings implements NotificationSettings {
  const factory _NotificationSettings(
          {required final EmailNotificationSettings email,
          required final PushNotificationSettings push,
          required final InAppNotificationSettings inApp,
          required final QuietHoursSettings quietHours}) =
      _$NotificationSettingsImpl;

  factory _NotificationSettings.fromJson(Map<String, dynamic> json) =
      _$NotificationSettingsImpl.fromJson;

  @override
  EmailNotificationSettings get email;
  @override
  PushNotificationSettings get push;
  @override
  InAppNotificationSettings get inApp;
  @override
  QuietHoursSettings get quietHours;

  /// Create a copy of NotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$NotificationSettingsImplCopyWith<_$NotificationSettingsImpl>
      get copyWith => throw _privateConstructorUsedError;
}

ParentalControlSettings _$ParentalControlSettingsFromJson(
    Map<String, dynamic> json) {
  return _ParentalControlSettings.fromJson(json);
}

/// @nodoc
mixin _$ParentalControlSettings {
  ScreenTimeSettings get screenTime => throw _privateConstructorUsedError;
  ContentFilterSettings get contentFilter => throw _privateConstructorUsedError;
  SubjectAccessSettings get subjectAccess => throw _privateConstructorUsedError;
  NotificationSettings get notifications => throw _privateConstructorUsedError;
  SafetySettings get safety => throw _privateConstructorUsedError;

  /// Serializes this ParentalControlSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ParentalControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ParentalControlSettingsCopyWith<ParentalControlSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ParentalControlSettingsCopyWith<$Res> {
  factory $ParentalControlSettingsCopyWith(ParentalControlSettings value,
          $Res Function(ParentalControlSettings) then) =
      _$ParentalControlSettingsCopyWithImpl<$Res, ParentalControlSettings>;
  @useResult
  $Res call(
      {ScreenTimeSettings screenTime,
      ContentFilterSettings contentFilter,
      SubjectAccessSettings subjectAccess,
      NotificationSettings notifications,
      SafetySettings safety});

  $ScreenTimeSettingsCopyWith<$Res> get screenTime;
  $ContentFilterSettingsCopyWith<$Res> get contentFilter;
  $SubjectAccessSettingsCopyWith<$Res> get subjectAccess;
  $NotificationSettingsCopyWith<$Res> get notifications;
  $SafetySettingsCopyWith<$Res> get safety;
}

/// @nodoc
class _$ParentalControlSettingsCopyWithImpl<$Res,
        $Val extends ParentalControlSettings>
    implements $ParentalControlSettingsCopyWith<$Res> {
  _$ParentalControlSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ParentalControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? screenTime = null,
    Object? contentFilter = null,
    Object? subjectAccess = null,
    Object? notifications = null,
    Object? safety = null,
  }) {
    return _then(_value.copyWith(
      screenTime: null == screenTime
          ? _value.screenTime
          : screenTime // ignore: cast_nullable_to_non_nullable
              as ScreenTimeSettings,
      contentFilter: null == contentFilter
          ? _value.contentFilter
          : contentFilter // ignore: cast_nullable_to_non_nullable
              as ContentFilterSettings,
      subjectAccess: null == subjectAccess
          ? _value.subjectAccess
          : subjectAccess // ignore: cast_nullable_to_non_nullable
              as SubjectAccessSettings,
      notifications: null == notifications
          ? _value.notifications
          : notifications // ignore: cast_nullable_to_non_nullable
              as NotificationSettings,
      safety: null == safety
          ? _value.safety
          : safety // ignore: cast_nullable_to_non_nullable
              as SafetySettings,
    ) as $Val);
  }

  /// Create a copy of ParentalControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $ScreenTimeSettingsCopyWith<$Res> get screenTime {
    return $ScreenTimeSettingsCopyWith<$Res>(_value.screenTime, (value) {
      return _then(_value.copyWith(screenTime: value) as $Val);
    });
  }

  /// Create a copy of ParentalControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $ContentFilterSettingsCopyWith<$Res> get contentFilter {
    return $ContentFilterSettingsCopyWith<$Res>(_value.contentFilter, (value) {
      return _then(_value.copyWith(contentFilter: value) as $Val);
    });
  }

  /// Create a copy of ParentalControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $SubjectAccessSettingsCopyWith<$Res> get subjectAccess {
    return $SubjectAccessSettingsCopyWith<$Res>(_value.subjectAccess, (value) {
      return _then(_value.copyWith(subjectAccess: value) as $Val);
    });
  }

  /// Create a copy of ParentalControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $NotificationSettingsCopyWith<$Res> get notifications {
    return $NotificationSettingsCopyWith<$Res>(_value.notifications, (value) {
      return _then(_value.copyWith(notifications: value) as $Val);
    });
  }

  /// Create a copy of ParentalControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $SafetySettingsCopyWith<$Res> get safety {
    return $SafetySettingsCopyWith<$Res>(_value.safety, (value) {
      return _then(_value.copyWith(safety: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$ParentalControlSettingsImplCopyWith<$Res>
    implements $ParentalControlSettingsCopyWith<$Res> {
  factory _$$ParentalControlSettingsImplCopyWith(
          _$ParentalControlSettingsImpl value,
          $Res Function(_$ParentalControlSettingsImpl) then) =
      __$$ParentalControlSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {ScreenTimeSettings screenTime,
      ContentFilterSettings contentFilter,
      SubjectAccessSettings subjectAccess,
      NotificationSettings notifications,
      SafetySettings safety});

  @override
  $ScreenTimeSettingsCopyWith<$Res> get screenTime;
  @override
  $ContentFilterSettingsCopyWith<$Res> get contentFilter;
  @override
  $SubjectAccessSettingsCopyWith<$Res> get subjectAccess;
  @override
  $NotificationSettingsCopyWith<$Res> get notifications;
  @override
  $SafetySettingsCopyWith<$Res> get safety;
}

/// @nodoc
class __$$ParentalControlSettingsImplCopyWithImpl<$Res>
    extends _$ParentalControlSettingsCopyWithImpl<$Res,
        _$ParentalControlSettingsImpl>
    implements _$$ParentalControlSettingsImplCopyWith<$Res> {
  __$$ParentalControlSettingsImplCopyWithImpl(
      _$ParentalControlSettingsImpl _value,
      $Res Function(_$ParentalControlSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of ParentalControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? screenTime = null,
    Object? contentFilter = null,
    Object? subjectAccess = null,
    Object? notifications = null,
    Object? safety = null,
  }) {
    return _then(_$ParentalControlSettingsImpl(
      screenTime: null == screenTime
          ? _value.screenTime
          : screenTime // ignore: cast_nullable_to_non_nullable
              as ScreenTimeSettings,
      contentFilter: null == contentFilter
          ? _value.contentFilter
          : contentFilter // ignore: cast_nullable_to_non_nullable
              as ContentFilterSettings,
      subjectAccess: null == subjectAccess
          ? _value.subjectAccess
          : subjectAccess // ignore: cast_nullable_to_non_nullable
              as SubjectAccessSettings,
      notifications: null == notifications
          ? _value.notifications
          : notifications // ignore: cast_nullable_to_non_nullable
              as NotificationSettings,
      safety: null == safety
          ? _value.safety
          : safety // ignore: cast_nullable_to_non_nullable
              as SafetySettings,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ParentalControlSettingsImpl implements _ParentalControlSettings {
  const _$ParentalControlSettingsImpl(
      {required this.screenTime,
      required this.contentFilter,
      required this.subjectAccess,
      required this.notifications,
      required this.safety});

  factory _$ParentalControlSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$ParentalControlSettingsImplFromJson(json);

  @override
  final ScreenTimeSettings screenTime;
  @override
  final ContentFilterSettings contentFilter;
  @override
  final SubjectAccessSettings subjectAccess;
  @override
  final NotificationSettings notifications;
  @override
  final SafetySettings safety;

  @override
  String toString() {
    return 'ParentalControlSettings(screenTime: $screenTime, contentFilter: $contentFilter, subjectAccess: $subjectAccess, notifications: $notifications, safety: $safety)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ParentalControlSettingsImpl &&
            (identical(other.screenTime, screenTime) ||
                other.screenTime == screenTime) &&
            (identical(other.contentFilter, contentFilter) ||
                other.contentFilter == contentFilter) &&
            (identical(other.subjectAccess, subjectAccess) ||
                other.subjectAccess == subjectAccess) &&
            (identical(other.notifications, notifications) ||
                other.notifications == notifications) &&
            (identical(other.safety, safety) || other.safety == safety));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, screenTime, contentFilter,
      subjectAccess, notifications, safety);

  /// Create a copy of ParentalControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ParentalControlSettingsImplCopyWith<_$ParentalControlSettingsImpl>
      get copyWith => __$$ParentalControlSettingsImplCopyWithImpl<
          _$ParentalControlSettingsImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ParentalControlSettingsImplToJson(
      this,
    );
  }
}

abstract class _ParentalControlSettings implements ParentalControlSettings {
  const factory _ParentalControlSettings(
      {required final ScreenTimeSettings screenTime,
      required final ContentFilterSettings contentFilter,
      required final SubjectAccessSettings subjectAccess,
      required final NotificationSettings notifications,
      required final SafetySettings safety}) = _$ParentalControlSettingsImpl;

  factory _ParentalControlSettings.fromJson(Map<String, dynamic> json) =
      _$ParentalControlSettingsImpl.fromJson;

  @override
  ScreenTimeSettings get screenTime;
  @override
  ContentFilterSettings get contentFilter;
  @override
  SubjectAccessSettings get subjectAccess;
  @override
  NotificationSettings get notifications;
  @override
  SafetySettings get safety;

  /// Create a copy of ParentalControlSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ParentalControlSettingsImplCopyWith<_$ParentalControlSettingsImpl>
      get copyWith => throw _privateConstructorUsedError;
}

AppSettings _$AppSettingsFromJson(Map<String, dynamic> json) {
  return _AppSettings.fromJson(json);
}

/// @nodoc
mixin _$AppSettings {
  String get locale => throw _privateConstructorUsedError;
  ThemeMode get themeMode => throw _privateConstructorUsedError;
  String get timezone => throw _privateConstructorUsedError;

  /// Serializes this AppSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AppSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AppSettingsCopyWith<AppSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AppSettingsCopyWith<$Res> {
  factory $AppSettingsCopyWith(
          AppSettings value, $Res Function(AppSettings) then) =
      _$AppSettingsCopyWithImpl<$Res, AppSettings>;
  @useResult
  $Res call({String locale, ThemeMode themeMode, String timezone});
}

/// @nodoc
class _$AppSettingsCopyWithImpl<$Res, $Val extends AppSettings>
    implements $AppSettingsCopyWith<$Res> {
  _$AppSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AppSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? locale = null,
    Object? themeMode = null,
    Object? timezone = null,
  }) {
    return _then(_value.copyWith(
      locale: null == locale
          ? _value.locale
          : locale // ignore: cast_nullable_to_non_nullable
              as String,
      themeMode: null == themeMode
          ? _value.themeMode
          : themeMode // ignore: cast_nullable_to_non_nullable
              as ThemeMode,
      timezone: null == timezone
          ? _value.timezone
          : timezone // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AppSettingsImplCopyWith<$Res>
    implements $AppSettingsCopyWith<$Res> {
  factory _$$AppSettingsImplCopyWith(
          _$AppSettingsImpl value, $Res Function(_$AppSettingsImpl) then) =
      __$$AppSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String locale, ThemeMode themeMode, String timezone});
}

/// @nodoc
class __$$AppSettingsImplCopyWithImpl<$Res>
    extends _$AppSettingsCopyWithImpl<$Res, _$AppSettingsImpl>
    implements _$$AppSettingsImplCopyWith<$Res> {
  __$$AppSettingsImplCopyWithImpl(
      _$AppSettingsImpl _value, $Res Function(_$AppSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of AppSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? locale = null,
    Object? themeMode = null,
    Object? timezone = null,
  }) {
    return _then(_$AppSettingsImpl(
      locale: null == locale
          ? _value.locale
          : locale // ignore: cast_nullable_to_non_nullable
              as String,
      themeMode: null == themeMode
          ? _value.themeMode
          : themeMode // ignore: cast_nullable_to_non_nullable
              as ThemeMode,
      timezone: null == timezone
          ? _value.timezone
          : timezone // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AppSettingsImpl implements _AppSettings {
  const _$AppSettingsImpl(
      {required this.locale, required this.themeMode, required this.timezone});

  factory _$AppSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$AppSettingsImplFromJson(json);

  @override
  final String locale;
  @override
  final ThemeMode themeMode;
  @override
  final String timezone;

  @override
  String toString() {
    return 'AppSettings(locale: $locale, themeMode: $themeMode, timezone: $timezone)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AppSettingsImpl &&
            (identical(other.locale, locale) || other.locale == locale) &&
            (identical(other.themeMode, themeMode) ||
                other.themeMode == themeMode) &&
            (identical(other.timezone, timezone) ||
                other.timezone == timezone));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, locale, themeMode, timezone);

  /// Create a copy of AppSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AppSettingsImplCopyWith<_$AppSettingsImpl> get copyWith =>
      __$$AppSettingsImplCopyWithImpl<_$AppSettingsImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AppSettingsImplToJson(
      this,
    );
  }
}

abstract class _AppSettings implements AppSettings {
  const factory _AppSettings(
      {required final String locale,
      required final ThemeMode themeMode,
      required final String timezone}) = _$AppSettingsImpl;

  factory _AppSettings.fromJson(Map<String, dynamic> json) =
      _$AppSettingsImpl.fromJson;

  @override
  String get locale;
  @override
  ThemeMode get themeMode;
  @override
  String get timezone;

  /// Create a copy of AppSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AppSettingsImplCopyWith<_$AppSettingsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ParentProfileSettings _$ParentProfileSettingsFromJson(
    Map<String, dynamic> json) {
  return _ParentProfileSettings.fromJson(json);
}

/// @nodoc
mixin _$ParentProfileSettings {
  String get firstName => throw _privateConstructorUsedError;
  String get lastName => throw _privateConstructorUsedError;
  String get email => throw _privateConstructorUsedError;
  String? get phone => throw _privateConstructorUsedError;
  String? get avatarUrl => throw _privateConstructorUsedError;

  /// Serializes this ParentProfileSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ParentProfileSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ParentProfileSettingsCopyWith<ParentProfileSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ParentProfileSettingsCopyWith<$Res> {
  factory $ParentProfileSettingsCopyWith(ParentProfileSettings value,
          $Res Function(ParentProfileSettings) then) =
      _$ParentProfileSettingsCopyWithImpl<$Res, ParentProfileSettings>;
  @useResult
  $Res call(
      {String firstName,
      String lastName,
      String email,
      String? phone,
      String? avatarUrl});
}

/// @nodoc
class _$ParentProfileSettingsCopyWithImpl<$Res,
        $Val extends ParentProfileSettings>
    implements $ParentProfileSettingsCopyWith<$Res> {
  _$ParentProfileSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ParentProfileSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? firstName = null,
    Object? lastName = null,
    Object? email = null,
    Object? phone = freezed,
    Object? avatarUrl = freezed,
  }) {
    return _then(_value.copyWith(
      firstName: null == firstName
          ? _value.firstName
          : firstName // ignore: cast_nullable_to_non_nullable
              as String,
      lastName: null == lastName
          ? _value.lastName
          : lastName // ignore: cast_nullable_to_non_nullable
              as String,
      email: null == email
          ? _value.email
          : email // ignore: cast_nullable_to_non_nullable
              as String,
      phone: freezed == phone
          ? _value.phone
          : phone // ignore: cast_nullable_to_non_nullable
              as String?,
      avatarUrl: freezed == avatarUrl
          ? _value.avatarUrl
          : avatarUrl // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ParentProfileSettingsImplCopyWith<$Res>
    implements $ParentProfileSettingsCopyWith<$Res> {
  factory _$$ParentProfileSettingsImplCopyWith(
          _$ParentProfileSettingsImpl value,
          $Res Function(_$ParentProfileSettingsImpl) then) =
      __$$ParentProfileSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String firstName,
      String lastName,
      String email,
      String? phone,
      String? avatarUrl});
}

/// @nodoc
class __$$ParentProfileSettingsImplCopyWithImpl<$Res>
    extends _$ParentProfileSettingsCopyWithImpl<$Res,
        _$ParentProfileSettingsImpl>
    implements _$$ParentProfileSettingsImplCopyWith<$Res> {
  __$$ParentProfileSettingsImplCopyWithImpl(_$ParentProfileSettingsImpl _value,
      $Res Function(_$ParentProfileSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of ParentProfileSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? firstName = null,
    Object? lastName = null,
    Object? email = null,
    Object? phone = freezed,
    Object? avatarUrl = freezed,
  }) {
    return _then(_$ParentProfileSettingsImpl(
      firstName: null == firstName
          ? _value.firstName
          : firstName // ignore: cast_nullable_to_non_nullable
              as String,
      lastName: null == lastName
          ? _value.lastName
          : lastName // ignore: cast_nullable_to_non_nullable
              as String,
      email: null == email
          ? _value.email
          : email // ignore: cast_nullable_to_non_nullable
              as String,
      phone: freezed == phone
          ? _value.phone
          : phone // ignore: cast_nullable_to_non_nullable
              as String?,
      avatarUrl: freezed == avatarUrl
          ? _value.avatarUrl
          : avatarUrl // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ParentProfileSettingsImpl implements _ParentProfileSettings {
  const _$ParentProfileSettingsImpl(
      {required this.firstName,
      required this.lastName,
      required this.email,
      this.phone,
      this.avatarUrl});

  factory _$ParentProfileSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$ParentProfileSettingsImplFromJson(json);

  @override
  final String firstName;
  @override
  final String lastName;
  @override
  final String email;
  @override
  final String? phone;
  @override
  final String? avatarUrl;

  @override
  String toString() {
    return 'ParentProfileSettings(firstName: $firstName, lastName: $lastName, email: $email, phone: $phone, avatarUrl: $avatarUrl)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ParentProfileSettingsImpl &&
            (identical(other.firstName, firstName) ||
                other.firstName == firstName) &&
            (identical(other.lastName, lastName) ||
                other.lastName == lastName) &&
            (identical(other.email, email) || other.email == email) &&
            (identical(other.phone, phone) || other.phone == phone) &&
            (identical(other.avatarUrl, avatarUrl) ||
                other.avatarUrl == avatarUrl));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, firstName, lastName, email, phone, avatarUrl);

  /// Create a copy of ParentProfileSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ParentProfileSettingsImplCopyWith<_$ParentProfileSettingsImpl>
      get copyWith => __$$ParentProfileSettingsImplCopyWithImpl<
          _$ParentProfileSettingsImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ParentProfileSettingsImplToJson(
      this,
    );
  }
}

abstract class _ParentProfileSettings implements ParentProfileSettings {
  const factory _ParentProfileSettings(
      {required final String firstName,
      required final String lastName,
      required final String email,
      final String? phone,
      final String? avatarUrl}) = _$ParentProfileSettingsImpl;

  factory _ParentProfileSettings.fromJson(Map<String, dynamic> json) =
      _$ParentProfileSettingsImpl.fromJson;

  @override
  String get firstName;
  @override
  String get lastName;
  @override
  String get email;
  @override
  String? get phone;
  @override
  String? get avatarUrl;

  /// Create a copy of ParentProfileSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ParentProfileSettingsImplCopyWith<_$ParentProfileSettingsImpl>
      get copyWith => throw _privateConstructorUsedError;
}

ParentSettings _$ParentSettingsFromJson(Map<String, dynamic> json) {
  return _ParentSettings.fromJson(json);
}

/// @nodoc
mixin _$ParentSettings {
  ParentProfileSettings get profile => throw _privateConstructorUsedError;
  AppSettings get app => throw _privateConstructorUsedError;
  NotificationSettings get notifications => throw _privateConstructorUsedError;

  /// Serializes this ParentSettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ParentSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ParentSettingsCopyWith<ParentSettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ParentSettingsCopyWith<$Res> {
  factory $ParentSettingsCopyWith(
          ParentSettings value, $Res Function(ParentSettings) then) =
      _$ParentSettingsCopyWithImpl<$Res, ParentSettings>;
  @useResult
  $Res call(
      {ParentProfileSettings profile,
      AppSettings app,
      NotificationSettings notifications});

  $ParentProfileSettingsCopyWith<$Res> get profile;
  $AppSettingsCopyWith<$Res> get app;
  $NotificationSettingsCopyWith<$Res> get notifications;
}

/// @nodoc
class _$ParentSettingsCopyWithImpl<$Res, $Val extends ParentSettings>
    implements $ParentSettingsCopyWith<$Res> {
  _$ParentSettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ParentSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? profile = null,
    Object? app = null,
    Object? notifications = null,
  }) {
    return _then(_value.copyWith(
      profile: null == profile
          ? _value.profile
          : profile // ignore: cast_nullable_to_non_nullable
              as ParentProfileSettings,
      app: null == app
          ? _value.app
          : app // ignore: cast_nullable_to_non_nullable
              as AppSettings,
      notifications: null == notifications
          ? _value.notifications
          : notifications // ignore: cast_nullable_to_non_nullable
              as NotificationSettings,
    ) as $Val);
  }

  /// Create a copy of ParentSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $ParentProfileSettingsCopyWith<$Res> get profile {
    return $ParentProfileSettingsCopyWith<$Res>(_value.profile, (value) {
      return _then(_value.copyWith(profile: value) as $Val);
    });
  }

  /// Create a copy of ParentSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $AppSettingsCopyWith<$Res> get app {
    return $AppSettingsCopyWith<$Res>(_value.app, (value) {
      return _then(_value.copyWith(app: value) as $Val);
    });
  }

  /// Create a copy of ParentSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $NotificationSettingsCopyWith<$Res> get notifications {
    return $NotificationSettingsCopyWith<$Res>(_value.notifications, (value) {
      return _then(_value.copyWith(notifications: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$ParentSettingsImplCopyWith<$Res>
    implements $ParentSettingsCopyWith<$Res> {
  factory _$$ParentSettingsImplCopyWith(_$ParentSettingsImpl value,
          $Res Function(_$ParentSettingsImpl) then) =
      __$$ParentSettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {ParentProfileSettings profile,
      AppSettings app,
      NotificationSettings notifications});

  @override
  $ParentProfileSettingsCopyWith<$Res> get profile;
  @override
  $AppSettingsCopyWith<$Res> get app;
  @override
  $NotificationSettingsCopyWith<$Res> get notifications;
}

/// @nodoc
class __$$ParentSettingsImplCopyWithImpl<$Res>
    extends _$ParentSettingsCopyWithImpl<$Res, _$ParentSettingsImpl>
    implements _$$ParentSettingsImplCopyWith<$Res> {
  __$$ParentSettingsImplCopyWithImpl(
      _$ParentSettingsImpl _value, $Res Function(_$ParentSettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of ParentSettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? profile = null,
    Object? app = null,
    Object? notifications = null,
  }) {
    return _then(_$ParentSettingsImpl(
      profile: null == profile
          ? _value.profile
          : profile // ignore: cast_nullable_to_non_nullable
              as ParentProfileSettings,
      app: null == app
          ? _value.app
          : app // ignore: cast_nullable_to_non_nullable
              as AppSettings,
      notifications: null == notifications
          ? _value.notifications
          : notifications // ignore: cast_nullable_to_non_nullable
              as NotificationSettings,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ParentSettingsImpl implements _ParentSettings {
  const _$ParentSettingsImpl(
      {required this.profile, required this.app, required this.notifications});

  factory _$ParentSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$ParentSettingsImplFromJson(json);

  @override
  final ParentProfileSettings profile;
  @override
  final AppSettings app;
  @override
  final NotificationSettings notifications;

  @override
  String toString() {
    return 'ParentSettings(profile: $profile, app: $app, notifications: $notifications)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ParentSettingsImpl &&
            (identical(other.profile, profile) || other.profile == profile) &&
            (identical(other.app, app) || other.app == app) &&
            (identical(other.notifications, notifications) ||
                other.notifications == notifications));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, profile, app, notifications);

  /// Create a copy of ParentSettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ParentSettingsImplCopyWith<_$ParentSettingsImpl> get copyWith =>
      __$$ParentSettingsImplCopyWithImpl<_$ParentSettingsImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ParentSettingsImplToJson(
      this,
    );
  }
}

abstract class _ParentSettings implements ParentSettings {
  const factory _ParentSettings(
          {required final ParentProfileSettings profile,
          required final AppSettings app,
          required final NotificationSettings notifications}) =
      _$ParentSettingsImpl;

  factory _ParentSettings.fromJson(Map<String, dynamic> json) =
      _$ParentSettingsImpl.fromJson;

  @override
  ParentProfileSettings get profile;
  @override
  AppSettings get app;
  @override
  NotificationSettings get notifications;

  /// Create a copy of ParentSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ParentSettingsImplCopyWith<_$ParentSettingsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

PinStatus _$PinStatusFromJson(Map<String, dynamic> json) {
  return _PinStatus.fromJson(json);
}

/// @nodoc
mixin _$PinStatus {
  bool get enabled => throw _privateConstructorUsedError;

  /// Serializes this PinStatus to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of PinStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $PinStatusCopyWith<PinStatus> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $PinStatusCopyWith<$Res> {
  factory $PinStatusCopyWith(PinStatus value, $Res Function(PinStatus) then) =
      _$PinStatusCopyWithImpl<$Res, PinStatus>;
  @useResult
  $Res call({bool enabled});
}

/// @nodoc
class _$PinStatusCopyWithImpl<$Res, $Val extends PinStatus>
    implements $PinStatusCopyWith<$Res> {
  _$PinStatusCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of PinStatus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
  }) {
    return _then(_value.copyWith(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$PinStatusImplCopyWith<$Res>
    implements $PinStatusCopyWith<$Res> {
  factory _$$PinStatusImplCopyWith(
          _$PinStatusImpl value, $Res Function(_$PinStatusImpl) then) =
      __$$PinStatusImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({bool enabled});
}

/// @nodoc
class __$$PinStatusImplCopyWithImpl<$Res>
    extends _$PinStatusCopyWithImpl<$Res, _$PinStatusImpl>
    implements _$$PinStatusImplCopyWith<$Res> {
  __$$PinStatusImplCopyWithImpl(
      _$PinStatusImpl _value, $Res Function(_$PinStatusImpl) _then)
      : super(_value, _then);

  /// Create a copy of PinStatus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? enabled = null,
  }) {
    return _then(_$PinStatusImpl(
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$PinStatusImpl implements _PinStatus {
  const _$PinStatusImpl({required this.enabled});

  factory _$PinStatusImpl.fromJson(Map<String, dynamic> json) =>
      _$$PinStatusImplFromJson(json);

  @override
  final bool enabled;

  @override
  String toString() {
    return 'PinStatus(enabled: $enabled)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PinStatusImpl &&
            (identical(other.enabled, enabled) || other.enabled == enabled));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, enabled);

  /// Create a copy of PinStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$PinStatusImplCopyWith<_$PinStatusImpl> get copyWith =>
      __$$PinStatusImplCopyWithImpl<_$PinStatusImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$PinStatusImplToJson(
      this,
    );
  }
}

abstract class _PinStatus implements PinStatus {
  const factory _PinStatus({required final bool enabled}) = _$PinStatusImpl;

  factory _PinStatus.fromJson(Map<String, dynamic> json) =
      _$PinStatusImpl.fromJson;

  @override
  bool get enabled;

  /// Create a copy of PinStatus
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$PinStatusImplCopyWith<_$PinStatusImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

VerifyPinResponse _$VerifyPinResponseFromJson(Map<String, dynamic> json) {
  return _VerifyPinResponse.fromJson(json);
}

/// @nodoc
mixin _$VerifyPinResponse {
  bool get valid => throw _privateConstructorUsedError;
  String? get token => throw _privateConstructorUsedError;
  String? get expiresAt => throw _privateConstructorUsedError;
  int? get remainingAttempts => throw _privateConstructorUsedError;

  /// Serializes this VerifyPinResponse to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of VerifyPinResponse
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $VerifyPinResponseCopyWith<VerifyPinResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $VerifyPinResponseCopyWith<$Res> {
  factory $VerifyPinResponseCopyWith(
          VerifyPinResponse value, $Res Function(VerifyPinResponse) then) =
      _$VerifyPinResponseCopyWithImpl<$Res, VerifyPinResponse>;
  @useResult
  $Res call(
      {bool valid, String? token, String? expiresAt, int? remainingAttempts});
}

/// @nodoc
class _$VerifyPinResponseCopyWithImpl<$Res, $Val extends VerifyPinResponse>
    implements $VerifyPinResponseCopyWith<$Res> {
  _$VerifyPinResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of VerifyPinResponse
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? valid = null,
    Object? token = freezed,
    Object? expiresAt = freezed,
    Object? remainingAttempts = freezed,
  }) {
    return _then(_value.copyWith(
      valid: null == valid
          ? _value.valid
          : valid // ignore: cast_nullable_to_non_nullable
              as bool,
      token: freezed == token
          ? _value.token
          : token // ignore: cast_nullable_to_non_nullable
              as String?,
      expiresAt: freezed == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as String?,
      remainingAttempts: freezed == remainingAttempts
          ? _value.remainingAttempts
          : remainingAttempts // ignore: cast_nullable_to_non_nullable
              as int?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$VerifyPinResponseImplCopyWith<$Res>
    implements $VerifyPinResponseCopyWith<$Res> {
  factory _$$VerifyPinResponseImplCopyWith(_$VerifyPinResponseImpl value,
          $Res Function(_$VerifyPinResponseImpl) then) =
      __$$VerifyPinResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool valid, String? token, String? expiresAt, int? remainingAttempts});
}

/// @nodoc
class __$$VerifyPinResponseImplCopyWithImpl<$Res>
    extends _$VerifyPinResponseCopyWithImpl<$Res, _$VerifyPinResponseImpl>
    implements _$$VerifyPinResponseImplCopyWith<$Res> {
  __$$VerifyPinResponseImplCopyWithImpl(_$VerifyPinResponseImpl _value,
      $Res Function(_$VerifyPinResponseImpl) _then)
      : super(_value, _then);

  /// Create a copy of VerifyPinResponse
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? valid = null,
    Object? token = freezed,
    Object? expiresAt = freezed,
    Object? remainingAttempts = freezed,
  }) {
    return _then(_$VerifyPinResponseImpl(
      valid: null == valid
          ? _value.valid
          : valid // ignore: cast_nullable_to_non_nullable
              as bool,
      token: freezed == token
          ? _value.token
          : token // ignore: cast_nullable_to_non_nullable
              as String?,
      expiresAt: freezed == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as String?,
      remainingAttempts: freezed == remainingAttempts
          ? _value.remainingAttempts
          : remainingAttempts // ignore: cast_nullable_to_non_nullable
              as int?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$VerifyPinResponseImpl implements _VerifyPinResponse {
  const _$VerifyPinResponseImpl(
      {required this.valid,
      this.token,
      this.expiresAt,
      this.remainingAttempts});

  factory _$VerifyPinResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$VerifyPinResponseImplFromJson(json);

  @override
  final bool valid;
  @override
  final String? token;
  @override
  final String? expiresAt;
  @override
  final int? remainingAttempts;

  @override
  String toString() {
    return 'VerifyPinResponse(valid: $valid, token: $token, expiresAt: $expiresAt, remainingAttempts: $remainingAttempts)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$VerifyPinResponseImpl &&
            (identical(other.valid, valid) || other.valid == valid) &&
            (identical(other.token, token) || other.token == token) &&
            (identical(other.expiresAt, expiresAt) ||
                other.expiresAt == expiresAt) &&
            (identical(other.remainingAttempts, remainingAttempts) ||
                other.remainingAttempts == remainingAttempts));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, valid, token, expiresAt, remainingAttempts);

  /// Create a copy of VerifyPinResponse
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$VerifyPinResponseImplCopyWith<_$VerifyPinResponseImpl> get copyWith =>
      __$$VerifyPinResponseImplCopyWithImpl<_$VerifyPinResponseImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$VerifyPinResponseImplToJson(
      this,
    );
  }
}

abstract class _VerifyPinResponse implements VerifyPinResponse {
  const factory _VerifyPinResponse(
      {required final bool valid,
      final String? token,
      final String? expiresAt,
      final int? remainingAttempts}) = _$VerifyPinResponseImpl;

  factory _VerifyPinResponse.fromJson(Map<String, dynamic> json) =
      _$VerifyPinResponseImpl.fromJson;

  @override
  bool get valid;
  @override
  String? get token;
  @override
  String? get expiresAt;
  @override
  int? get remainingAttempts;

  /// Create a copy of VerifyPinResponse
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$VerifyPinResponseImplCopyWith<_$VerifyPinResponseImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

SettingsSyncMetadata _$SettingsSyncMetadataFromJson(Map<String, dynamic> json) {
  return _SettingsSyncMetadata.fromJson(json);
}

/// @nodoc
mixin _$SettingsSyncMetadata {
  String get lastSyncedAt => throw _privateConstructorUsedError;
  String get lastModifiedBy => throw _privateConstructorUsedError;
  int get version => throw _privateConstructorUsedError;

  /// Serializes this SettingsSyncMetadata to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SettingsSyncMetadata
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SettingsSyncMetadataCopyWith<SettingsSyncMetadata> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SettingsSyncMetadataCopyWith<$Res> {
  factory $SettingsSyncMetadataCopyWith(SettingsSyncMetadata value,
          $Res Function(SettingsSyncMetadata) then) =
      _$SettingsSyncMetadataCopyWithImpl<$Res, SettingsSyncMetadata>;
  @useResult
  $Res call({String lastSyncedAt, String lastModifiedBy, int version});
}

/// @nodoc
class _$SettingsSyncMetadataCopyWithImpl<$Res,
        $Val extends SettingsSyncMetadata>
    implements $SettingsSyncMetadataCopyWith<$Res> {
  _$SettingsSyncMetadataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SettingsSyncMetadata
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? lastSyncedAt = null,
    Object? lastModifiedBy = null,
    Object? version = null,
  }) {
    return _then(_value.copyWith(
      lastSyncedAt: null == lastSyncedAt
          ? _value.lastSyncedAt
          : lastSyncedAt // ignore: cast_nullable_to_non_nullable
              as String,
      lastModifiedBy: null == lastModifiedBy
          ? _value.lastModifiedBy
          : lastModifiedBy // ignore: cast_nullable_to_non_nullable
              as String,
      version: null == version
          ? _value.version
          : version // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SettingsSyncMetadataImplCopyWith<$Res>
    implements $SettingsSyncMetadataCopyWith<$Res> {
  factory _$$SettingsSyncMetadataImplCopyWith(_$SettingsSyncMetadataImpl value,
          $Res Function(_$SettingsSyncMetadataImpl) then) =
      __$$SettingsSyncMetadataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String lastSyncedAt, String lastModifiedBy, int version});
}

/// @nodoc
class __$$SettingsSyncMetadataImplCopyWithImpl<$Res>
    extends _$SettingsSyncMetadataCopyWithImpl<$Res, _$SettingsSyncMetadataImpl>
    implements _$$SettingsSyncMetadataImplCopyWith<$Res> {
  __$$SettingsSyncMetadataImplCopyWithImpl(_$SettingsSyncMetadataImpl _value,
      $Res Function(_$SettingsSyncMetadataImpl) _then)
      : super(_value, _then);

  /// Create a copy of SettingsSyncMetadata
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? lastSyncedAt = null,
    Object? lastModifiedBy = null,
    Object? version = null,
  }) {
    return _then(_$SettingsSyncMetadataImpl(
      lastSyncedAt: null == lastSyncedAt
          ? _value.lastSyncedAt
          : lastSyncedAt // ignore: cast_nullable_to_non_nullable
              as String,
      lastModifiedBy: null == lastModifiedBy
          ? _value.lastModifiedBy
          : lastModifiedBy // ignore: cast_nullable_to_non_nullable
              as String,
      version: null == version
          ? _value.version
          : version // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SettingsSyncMetadataImpl implements _SettingsSyncMetadata {
  const _$SettingsSyncMetadataImpl(
      {required this.lastSyncedAt,
      required this.lastModifiedBy,
      required this.version});

  factory _$SettingsSyncMetadataImpl.fromJson(Map<String, dynamic> json) =>
      _$$SettingsSyncMetadataImplFromJson(json);

  @override
  final String lastSyncedAt;
  @override
  final String lastModifiedBy;
  @override
  final int version;

  @override
  String toString() {
    return 'SettingsSyncMetadata(lastSyncedAt: $lastSyncedAt, lastModifiedBy: $lastModifiedBy, version: $version)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SettingsSyncMetadataImpl &&
            (identical(other.lastSyncedAt, lastSyncedAt) ||
                other.lastSyncedAt == lastSyncedAt) &&
            (identical(other.lastModifiedBy, lastModifiedBy) ||
                other.lastModifiedBy == lastModifiedBy) &&
            (identical(other.version, version) || other.version == version));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, lastSyncedAt, lastModifiedBy, version);

  /// Create a copy of SettingsSyncMetadata
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SettingsSyncMetadataImplCopyWith<_$SettingsSyncMetadataImpl>
      get copyWith =>
          __$$SettingsSyncMetadataImplCopyWithImpl<_$SettingsSyncMetadataImpl>(
              this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SettingsSyncMetadataImplToJson(
      this,
    );
  }
}

abstract class _SettingsSyncMetadata implements SettingsSyncMetadata {
  const factory _SettingsSyncMetadata(
      {required final String lastSyncedAt,
      required final String lastModifiedBy,
      required final int version}) = _$SettingsSyncMetadataImpl;

  factory _SettingsSyncMetadata.fromJson(Map<String, dynamic> json) =
      _$SettingsSyncMetadataImpl.fromJson;

  @override
  String get lastSyncedAt;
  @override
  String get lastModifiedBy;
  @override
  int get version;

  /// Create a copy of SettingsSyncMetadata
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SettingsSyncMetadataImplCopyWith<_$SettingsSyncMetadataImpl>
      get copyWith => throw _privateConstructorUsedError;
}

AccessibilitySettings _$AccessibilitySettingsFromJson(
    Map<String, dynamic> json) {
  return _AccessibilitySettings.fromJson(json);
}

/// @nodoc
mixin _$AccessibilitySettings {
  double get textScaleFactor => throw _privateConstructorUsedError;
  bool get highContrast => throw _privateConstructorUsedError;
  bool get boldText => throw _privateConstructorUsedError;
  ColorBlindMode get colorBlindMode => throw _privateConstructorUsedError;
  bool get reduceTransparency => throw _privateConstructorUsedError;
  bool get reduceMotion => throw _privateConstructorUsedError;
  bool get screenReaderOptimized => throw _privateConstructorUsedError;
  bool get hapticFeedbackEnabled => throw _privateConstructorUsedError;
  bool get soundEffectsEnabled => throw _privateConstructorUsedError;
  double get soundVolume => throw _privateConstructorUsedError;
  bool get readAloudEnabled => throw _privateConstructorUsedError;
  double get readAloudSpeed => throw _privateConstructorUsedError;

  /// Serializes this AccessibilitySettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AccessibilitySettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AccessibilitySettingsCopyWith<AccessibilitySettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AccessibilitySettingsCopyWith<$Res> {
  factory $AccessibilitySettingsCopyWith(AccessibilitySettings value,
          $Res Function(AccessibilitySettings) then) =
      _$AccessibilitySettingsCopyWithImpl<$Res, AccessibilitySettings>;
  @useResult
  $Res call(
      {double textScaleFactor,
      bool highContrast,
      bool boldText,
      ColorBlindMode colorBlindMode,
      bool reduceTransparency,
      bool reduceMotion,
      bool screenReaderOptimized,
      bool hapticFeedbackEnabled,
      bool soundEffectsEnabled,
      double soundVolume,
      bool readAloudEnabled,
      double readAloudSpeed});
}

/// @nodoc
class _$AccessibilitySettingsCopyWithImpl<$Res,
        $Val extends AccessibilitySettings>
    implements $AccessibilitySettingsCopyWith<$Res> {
  _$AccessibilitySettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AccessibilitySettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? textScaleFactor = null,
    Object? highContrast = null,
    Object? boldText = null,
    Object? colorBlindMode = null,
    Object? reduceTransparency = null,
    Object? reduceMotion = null,
    Object? screenReaderOptimized = null,
    Object? hapticFeedbackEnabled = null,
    Object? soundEffectsEnabled = null,
    Object? soundVolume = null,
    Object? readAloudEnabled = null,
    Object? readAloudSpeed = null,
  }) {
    return _then(_value.copyWith(
      textScaleFactor: null == textScaleFactor
          ? _value.textScaleFactor
          : textScaleFactor // ignore: cast_nullable_to_non_nullable
              as double,
      highContrast: null == highContrast
          ? _value.highContrast
          : highContrast // ignore: cast_nullable_to_non_nullable
              as bool,
      boldText: null == boldText
          ? _value.boldText
          : boldText // ignore: cast_nullable_to_non_nullable
              as bool,
      colorBlindMode: null == colorBlindMode
          ? _value.colorBlindMode
          : colorBlindMode // ignore: cast_nullable_to_non_nullable
              as ColorBlindMode,
      reduceTransparency: null == reduceTransparency
          ? _value.reduceTransparency
          : reduceTransparency // ignore: cast_nullable_to_non_nullable
              as bool,
      reduceMotion: null == reduceMotion
          ? _value.reduceMotion
          : reduceMotion // ignore: cast_nullable_to_non_nullable
              as bool,
      screenReaderOptimized: null == screenReaderOptimized
          ? _value.screenReaderOptimized
          : screenReaderOptimized // ignore: cast_nullable_to_non_nullable
              as bool,
      hapticFeedbackEnabled: null == hapticFeedbackEnabled
          ? _value.hapticFeedbackEnabled
          : hapticFeedbackEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      soundEffectsEnabled: null == soundEffectsEnabled
          ? _value.soundEffectsEnabled
          : soundEffectsEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      soundVolume: null == soundVolume
          ? _value.soundVolume
          : soundVolume // ignore: cast_nullable_to_non_nullable
              as double,
      readAloudEnabled: null == readAloudEnabled
          ? _value.readAloudEnabled
          : readAloudEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      readAloudSpeed: null == readAloudSpeed
          ? _value.readAloudSpeed
          : readAloudSpeed // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AccessibilitySettingsImplCopyWith<$Res>
    implements $AccessibilitySettingsCopyWith<$Res> {
  factory _$$AccessibilitySettingsImplCopyWith(
          _$AccessibilitySettingsImpl value,
          $Res Function(_$AccessibilitySettingsImpl) then) =
      __$$AccessibilitySettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {double textScaleFactor,
      bool highContrast,
      bool boldText,
      ColorBlindMode colorBlindMode,
      bool reduceTransparency,
      bool reduceMotion,
      bool screenReaderOptimized,
      bool hapticFeedbackEnabled,
      bool soundEffectsEnabled,
      double soundVolume,
      bool readAloudEnabled,
      double readAloudSpeed});
}

/// @nodoc
class __$$AccessibilitySettingsImplCopyWithImpl<$Res>
    extends _$AccessibilitySettingsCopyWithImpl<$Res,
        _$AccessibilitySettingsImpl>
    implements _$$AccessibilitySettingsImplCopyWith<$Res> {
  __$$AccessibilitySettingsImplCopyWithImpl(_$AccessibilitySettingsImpl _value,
      $Res Function(_$AccessibilitySettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of AccessibilitySettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? textScaleFactor = null,
    Object? highContrast = null,
    Object? boldText = null,
    Object? colorBlindMode = null,
    Object? reduceTransparency = null,
    Object? reduceMotion = null,
    Object? screenReaderOptimized = null,
    Object? hapticFeedbackEnabled = null,
    Object? soundEffectsEnabled = null,
    Object? soundVolume = null,
    Object? readAloudEnabled = null,
    Object? readAloudSpeed = null,
  }) {
    return _then(_$AccessibilitySettingsImpl(
      textScaleFactor: null == textScaleFactor
          ? _value.textScaleFactor
          : textScaleFactor // ignore: cast_nullable_to_non_nullable
              as double,
      highContrast: null == highContrast
          ? _value.highContrast
          : highContrast // ignore: cast_nullable_to_non_nullable
              as bool,
      boldText: null == boldText
          ? _value.boldText
          : boldText // ignore: cast_nullable_to_non_nullable
              as bool,
      colorBlindMode: null == colorBlindMode
          ? _value.colorBlindMode
          : colorBlindMode // ignore: cast_nullable_to_non_nullable
              as ColorBlindMode,
      reduceTransparency: null == reduceTransparency
          ? _value.reduceTransparency
          : reduceTransparency // ignore: cast_nullable_to_non_nullable
              as bool,
      reduceMotion: null == reduceMotion
          ? _value.reduceMotion
          : reduceMotion // ignore: cast_nullable_to_non_nullable
              as bool,
      screenReaderOptimized: null == screenReaderOptimized
          ? _value.screenReaderOptimized
          : screenReaderOptimized // ignore: cast_nullable_to_non_nullable
              as bool,
      hapticFeedbackEnabled: null == hapticFeedbackEnabled
          ? _value.hapticFeedbackEnabled
          : hapticFeedbackEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      soundEffectsEnabled: null == soundEffectsEnabled
          ? _value.soundEffectsEnabled
          : soundEffectsEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      soundVolume: null == soundVolume
          ? _value.soundVolume
          : soundVolume // ignore: cast_nullable_to_non_nullable
              as double,
      readAloudEnabled: null == readAloudEnabled
          ? _value.readAloudEnabled
          : readAloudEnabled // ignore: cast_nullable_to_non_nullable
              as bool,
      readAloudSpeed: null == readAloudSpeed
          ? _value.readAloudSpeed
          : readAloudSpeed // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AccessibilitySettingsImpl implements _AccessibilitySettings {
  const _$AccessibilitySettingsImpl(
      {required this.textScaleFactor,
      required this.highContrast,
      required this.boldText,
      required this.colorBlindMode,
      required this.reduceTransparency,
      required this.reduceMotion,
      required this.screenReaderOptimized,
      required this.hapticFeedbackEnabled,
      required this.soundEffectsEnabled,
      required this.soundVolume,
      required this.readAloudEnabled,
      required this.readAloudSpeed});

  factory _$AccessibilitySettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$AccessibilitySettingsImplFromJson(json);

  @override
  final double textScaleFactor;
  @override
  final bool highContrast;
  @override
  final bool boldText;
  @override
  final ColorBlindMode colorBlindMode;
  @override
  final bool reduceTransparency;
  @override
  final bool reduceMotion;
  @override
  final bool screenReaderOptimized;
  @override
  final bool hapticFeedbackEnabled;
  @override
  final bool soundEffectsEnabled;
  @override
  final double soundVolume;
  @override
  final bool readAloudEnabled;
  @override
  final double readAloudSpeed;

  @override
  String toString() {
    return 'AccessibilitySettings(textScaleFactor: $textScaleFactor, highContrast: $highContrast, boldText: $boldText, colorBlindMode: $colorBlindMode, reduceTransparency: $reduceTransparency, reduceMotion: $reduceMotion, screenReaderOptimized: $screenReaderOptimized, hapticFeedbackEnabled: $hapticFeedbackEnabled, soundEffectsEnabled: $soundEffectsEnabled, soundVolume: $soundVolume, readAloudEnabled: $readAloudEnabled, readAloudSpeed: $readAloudSpeed)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AccessibilitySettingsImpl &&
            (identical(other.textScaleFactor, textScaleFactor) ||
                other.textScaleFactor == textScaleFactor) &&
            (identical(other.highContrast, highContrast) ||
                other.highContrast == highContrast) &&
            (identical(other.boldText, boldText) ||
                other.boldText == boldText) &&
            (identical(other.colorBlindMode, colorBlindMode) ||
                other.colorBlindMode == colorBlindMode) &&
            (identical(other.reduceTransparency, reduceTransparency) ||
                other.reduceTransparency == reduceTransparency) &&
            (identical(other.reduceMotion, reduceMotion) ||
                other.reduceMotion == reduceMotion) &&
            (identical(other.screenReaderOptimized, screenReaderOptimized) ||
                other.screenReaderOptimized == screenReaderOptimized) &&
            (identical(other.hapticFeedbackEnabled, hapticFeedbackEnabled) ||
                other.hapticFeedbackEnabled == hapticFeedbackEnabled) &&
            (identical(other.soundEffectsEnabled, soundEffectsEnabled) ||
                other.soundEffectsEnabled == soundEffectsEnabled) &&
            (identical(other.soundVolume, soundVolume) ||
                other.soundVolume == soundVolume) &&
            (identical(other.readAloudEnabled, readAloudEnabled) ||
                other.readAloudEnabled == readAloudEnabled) &&
            (identical(other.readAloudSpeed, readAloudSpeed) ||
                other.readAloudSpeed == readAloudSpeed));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      textScaleFactor,
      highContrast,
      boldText,
      colorBlindMode,
      reduceTransparency,
      reduceMotion,
      screenReaderOptimized,
      hapticFeedbackEnabled,
      soundEffectsEnabled,
      soundVolume,
      readAloudEnabled,
      readAloudSpeed);

  /// Create a copy of AccessibilitySettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AccessibilitySettingsImplCopyWith<_$AccessibilitySettingsImpl>
      get copyWith => __$$AccessibilitySettingsImplCopyWithImpl<
          _$AccessibilitySettingsImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AccessibilitySettingsImplToJson(
      this,
    );
  }
}

abstract class _AccessibilitySettings implements AccessibilitySettings {
  const factory _AccessibilitySettings(
      {required final double textScaleFactor,
      required final bool highContrast,
      required final bool boldText,
      required final ColorBlindMode colorBlindMode,
      required final bool reduceTransparency,
      required final bool reduceMotion,
      required final bool screenReaderOptimized,
      required final bool hapticFeedbackEnabled,
      required final bool soundEffectsEnabled,
      required final double soundVolume,
      required final bool readAloudEnabled,
      required final double readAloudSpeed}) = _$AccessibilitySettingsImpl;

  factory _AccessibilitySettings.fromJson(Map<String, dynamic> json) =
      _$AccessibilitySettingsImpl.fromJson;

  @override
  double get textScaleFactor;
  @override
  bool get highContrast;
  @override
  bool get boldText;
  @override
  ColorBlindMode get colorBlindMode;
  @override
  bool get reduceTransparency;
  @override
  bool get reduceMotion;
  @override
  bool get screenReaderOptimized;
  @override
  bool get hapticFeedbackEnabled;
  @override
  bool get soundEffectsEnabled;
  @override
  double get soundVolume;
  @override
  bool get readAloudEnabled;
  @override
  double get readAloudSpeed;

  /// Create a copy of AccessibilitySettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AccessibilitySettingsImplCopyWith<_$AccessibilitySettingsImpl>
      get copyWith => throw _privateConstructorUsedError;
}
