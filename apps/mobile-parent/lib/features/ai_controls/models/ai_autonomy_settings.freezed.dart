// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'ai_autonomy_settings.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

AIAutonomySettings _$AIAutonomySettingsFromJson(Map<String, dynamic> json) {
  return _AIAutonomySettings.fromJson(json);
}

/// @nodoc
mixin _$AIAutonomySettings {
  String get childId => throw _privateConstructorUsedError;
  AutonomyLevel get overallLevel => throw _privateConstructorUsedError;
  Map<DecisionCategory, CategoryAutonomy> get categorySettings =>
      throw _privateConstructorUsedError;
  NotificationSettings get notifications => throw _privateConstructorUsedError;
  List<AIRestriction> get restrictions => throw _privateConstructorUsedError;
  bool get pauseAllAI => throw _privateConstructorUsedError;
  DateTime? get pauseUntil => throw _privateConstructorUsedError;
  String? get pauseReason => throw _privateConstructorUsedError;
  DateTime? get lastModified => throw _privateConstructorUsedError;
  String? get modifiedBy => throw _privateConstructorUsedError;

  /// Serializes this AIAutonomySettings to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AIAutonomySettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AIAutonomySettingsCopyWith<AIAutonomySettings> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AIAutonomySettingsCopyWith<$Res> {
  factory $AIAutonomySettingsCopyWith(
          AIAutonomySettings value, $Res Function(AIAutonomySettings) then) =
      _$AIAutonomySettingsCopyWithImpl<$Res, AIAutonomySettings>;
  @useResult
  $Res call(
      {String childId,
      AutonomyLevel overallLevel,
      Map<DecisionCategory, CategoryAutonomy> categorySettings,
      NotificationSettings notifications,
      List<AIRestriction> restrictions,
      bool pauseAllAI,
      DateTime? pauseUntil,
      String? pauseReason,
      DateTime? lastModified,
      String? modifiedBy});

  $NotificationSettingsCopyWith<$Res> get notifications;
}

/// @nodoc
class _$AIAutonomySettingsCopyWithImpl<$Res, $Val extends AIAutonomySettings>
    implements $AIAutonomySettingsCopyWith<$Res> {
  _$AIAutonomySettingsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AIAutonomySettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? overallLevel = null,
    Object? categorySettings = null,
    Object? notifications = null,
    Object? restrictions = null,
    Object? pauseAllAI = null,
    Object? pauseUntil = freezed,
    Object? pauseReason = freezed,
    Object? lastModified = freezed,
    Object? modifiedBy = freezed,
  }) {
    return _then(_value.copyWith(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      overallLevel: null == overallLevel
          ? _value.overallLevel
          : overallLevel // ignore: cast_nullable_to_non_nullable
              as AutonomyLevel,
      categorySettings: null == categorySettings
          ? _value.categorySettings
          : categorySettings // ignore: cast_nullable_to_non_nullable
              as Map<DecisionCategory, CategoryAutonomy>,
      notifications: null == notifications
          ? _value.notifications
          : notifications // ignore: cast_nullable_to_non_nullable
              as NotificationSettings,
      restrictions: null == restrictions
          ? _value.restrictions
          : restrictions // ignore: cast_nullable_to_non_nullable
              as List<AIRestriction>,
      pauseAllAI: null == pauseAllAI
          ? _value.pauseAllAI
          : pauseAllAI // ignore: cast_nullable_to_non_nullable
              as bool,
      pauseUntil: freezed == pauseUntil
          ? _value.pauseUntil
          : pauseUntil // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      pauseReason: freezed == pauseReason
          ? _value.pauseReason
          : pauseReason // ignore: cast_nullable_to_non_nullable
              as String?,
      lastModified: freezed == lastModified
          ? _value.lastModified
          : lastModified // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      modifiedBy: freezed == modifiedBy
          ? _value.modifiedBy
          : modifiedBy // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }

  /// Create a copy of AIAutonomySettings
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
abstract class _$$AIAutonomySettingsImplCopyWith<$Res>
    implements $AIAutonomySettingsCopyWith<$Res> {
  factory _$$AIAutonomySettingsImplCopyWith(_$AIAutonomySettingsImpl value,
          $Res Function(_$AIAutonomySettingsImpl) then) =
      __$$AIAutonomySettingsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String childId,
      AutonomyLevel overallLevel,
      Map<DecisionCategory, CategoryAutonomy> categorySettings,
      NotificationSettings notifications,
      List<AIRestriction> restrictions,
      bool pauseAllAI,
      DateTime? pauseUntil,
      String? pauseReason,
      DateTime? lastModified,
      String? modifiedBy});

  @override
  $NotificationSettingsCopyWith<$Res> get notifications;
}

/// @nodoc
class __$$AIAutonomySettingsImplCopyWithImpl<$Res>
    extends _$AIAutonomySettingsCopyWithImpl<$Res, _$AIAutonomySettingsImpl>
    implements _$$AIAutonomySettingsImplCopyWith<$Res> {
  __$$AIAutonomySettingsImplCopyWithImpl(_$AIAutonomySettingsImpl _value,
      $Res Function(_$AIAutonomySettingsImpl) _then)
      : super(_value, _then);

  /// Create a copy of AIAutonomySettings
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? childId = null,
    Object? overallLevel = null,
    Object? categorySettings = null,
    Object? notifications = null,
    Object? restrictions = null,
    Object? pauseAllAI = null,
    Object? pauseUntil = freezed,
    Object? pauseReason = freezed,
    Object? lastModified = freezed,
    Object? modifiedBy = freezed,
  }) {
    return _then(_$AIAutonomySettingsImpl(
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      overallLevel: null == overallLevel
          ? _value.overallLevel
          : overallLevel // ignore: cast_nullable_to_non_nullable
              as AutonomyLevel,
      categorySettings: null == categorySettings
          ? _value._categorySettings
          : categorySettings // ignore: cast_nullable_to_non_nullable
              as Map<DecisionCategory, CategoryAutonomy>,
      notifications: null == notifications
          ? _value.notifications
          : notifications // ignore: cast_nullable_to_non_nullable
              as NotificationSettings,
      restrictions: null == restrictions
          ? _value._restrictions
          : restrictions // ignore: cast_nullable_to_non_nullable
              as List<AIRestriction>,
      pauseAllAI: null == pauseAllAI
          ? _value.pauseAllAI
          : pauseAllAI // ignore: cast_nullable_to_non_nullable
              as bool,
      pauseUntil: freezed == pauseUntil
          ? _value.pauseUntil
          : pauseUntil // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      pauseReason: freezed == pauseReason
          ? _value.pauseReason
          : pauseReason // ignore: cast_nullable_to_non_nullable
              as String?,
      lastModified: freezed == lastModified
          ? _value.lastModified
          : lastModified // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      modifiedBy: freezed == modifiedBy
          ? _value.modifiedBy
          : modifiedBy // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AIAutonomySettingsImpl implements _AIAutonomySettings {
  const _$AIAutonomySettingsImpl(
      {required this.childId,
      required this.overallLevel,
      required final Map<DecisionCategory, CategoryAutonomy> categorySettings,
      required this.notifications,
      required final List<AIRestriction> restrictions,
      this.pauseAllAI = false,
      this.pauseUntil,
      this.pauseReason,
      this.lastModified,
      this.modifiedBy})
      : _categorySettings = categorySettings,
        _restrictions = restrictions;

  factory _$AIAutonomySettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$AIAutonomySettingsImplFromJson(json);

  @override
  final String childId;
  @override
  final AutonomyLevel overallLevel;
  final Map<DecisionCategory, CategoryAutonomy> _categorySettings;
  @override
  Map<DecisionCategory, CategoryAutonomy> get categorySettings {
    if (_categorySettings is EqualUnmodifiableMapView) return _categorySettings;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_categorySettings);
  }

  @override
  final NotificationSettings notifications;
  final List<AIRestriction> _restrictions;
  @override
  List<AIRestriction> get restrictions {
    if (_restrictions is EqualUnmodifiableListView) return _restrictions;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_restrictions);
  }

  @override
  @JsonKey()
  final bool pauseAllAI;
  @override
  final DateTime? pauseUntil;
  @override
  final String? pauseReason;
  @override
  final DateTime? lastModified;
  @override
  final String? modifiedBy;

  @override
  String toString() {
    return 'AIAutonomySettings(childId: $childId, overallLevel: $overallLevel, categorySettings: $categorySettings, notifications: $notifications, restrictions: $restrictions, pauseAllAI: $pauseAllAI, pauseUntil: $pauseUntil, pauseReason: $pauseReason, lastModified: $lastModified, modifiedBy: $modifiedBy)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AIAutonomySettingsImpl &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.overallLevel, overallLevel) ||
                other.overallLevel == overallLevel) &&
            const DeepCollectionEquality()
                .equals(other._categorySettings, _categorySettings) &&
            (identical(other.notifications, notifications) ||
                other.notifications == notifications) &&
            const DeepCollectionEquality()
                .equals(other._restrictions, _restrictions) &&
            (identical(other.pauseAllAI, pauseAllAI) ||
                other.pauseAllAI == pauseAllAI) &&
            (identical(other.pauseUntil, pauseUntil) ||
                other.pauseUntil == pauseUntil) &&
            (identical(other.pauseReason, pauseReason) ||
                other.pauseReason == pauseReason) &&
            (identical(other.lastModified, lastModified) ||
                other.lastModified == lastModified) &&
            (identical(other.modifiedBy, modifiedBy) ||
                other.modifiedBy == modifiedBy));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      childId,
      overallLevel,
      const DeepCollectionEquality().hash(_categorySettings),
      notifications,
      const DeepCollectionEquality().hash(_restrictions),
      pauseAllAI,
      pauseUntil,
      pauseReason,
      lastModified,
      modifiedBy);

  /// Create a copy of AIAutonomySettings
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AIAutonomySettingsImplCopyWith<_$AIAutonomySettingsImpl> get copyWith =>
      __$$AIAutonomySettingsImplCopyWithImpl<_$AIAutonomySettingsImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AIAutonomySettingsImplToJson(
      this,
    );
  }
}

abstract class _AIAutonomySettings implements AIAutonomySettings {
  const factory _AIAutonomySettings(
      {required final String childId,
      required final AutonomyLevel overallLevel,
      required final Map<DecisionCategory, CategoryAutonomy> categorySettings,
      required final NotificationSettings notifications,
      required final List<AIRestriction> restrictions,
      final bool pauseAllAI,
      final DateTime? pauseUntil,
      final String? pauseReason,
      final DateTime? lastModified,
      final String? modifiedBy}) = _$AIAutonomySettingsImpl;

  factory _AIAutonomySettings.fromJson(Map<String, dynamic> json) =
      _$AIAutonomySettingsImpl.fromJson;

  @override
  String get childId;
  @override
  AutonomyLevel get overallLevel;
  @override
  Map<DecisionCategory, CategoryAutonomy> get categorySettings;
  @override
  NotificationSettings get notifications;
  @override
  List<AIRestriction> get restrictions;
  @override
  bool get pauseAllAI;
  @override
  DateTime? get pauseUntil;
  @override
  String? get pauseReason;
  @override
  DateTime? get lastModified;
  @override
  String? get modifiedBy;

  /// Create a copy of AIAutonomySettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AIAutonomySettingsImplCopyWith<_$AIAutonomySettingsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

CategoryAutonomy _$CategoryAutonomyFromJson(Map<String, dynamic> json) {
  return _CategoryAutonomy.fromJson(json);
}

/// @nodoc
mixin _$CategoryAutonomy {
  DecisionCategory get category => throw _privateConstructorUsedError;
  AutonomyLevel get level => throw _privateConstructorUsedError;
  bool get enabled => throw _privateConstructorUsedError;
  String? get customMessage => throw _privateConstructorUsedError;
  List<String>? get allowedValues => throw _privateConstructorUsedError;
  List<String>? get blockedValues => throw _privateConstructorUsedError;
  Map<String, dynamic>? get limits => throw _privateConstructorUsedError;

  /// Serializes this CategoryAutonomy to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CategoryAutonomy
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CategoryAutonomyCopyWith<CategoryAutonomy> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CategoryAutonomyCopyWith<$Res> {
  factory $CategoryAutonomyCopyWith(
          CategoryAutonomy value, $Res Function(CategoryAutonomy) then) =
      _$CategoryAutonomyCopyWithImpl<$Res, CategoryAutonomy>;
  @useResult
  $Res call(
      {DecisionCategory category,
      AutonomyLevel level,
      bool enabled,
      String? customMessage,
      List<String>? allowedValues,
      List<String>? blockedValues,
      Map<String, dynamic>? limits});
}

/// @nodoc
class _$CategoryAutonomyCopyWithImpl<$Res, $Val extends CategoryAutonomy>
    implements $CategoryAutonomyCopyWith<$Res> {
  _$CategoryAutonomyCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CategoryAutonomy
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? category = null,
    Object? level = null,
    Object? enabled = null,
    Object? customMessage = freezed,
    Object? allowedValues = freezed,
    Object? blockedValues = freezed,
    Object? limits = freezed,
  }) {
    return _then(_value.copyWith(
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as DecisionCategory,
      level: null == level
          ? _value.level
          : level // ignore: cast_nullable_to_non_nullable
              as AutonomyLevel,
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      customMessage: freezed == customMessage
          ? _value.customMessage
          : customMessage // ignore: cast_nullable_to_non_nullable
              as String?,
      allowedValues: freezed == allowedValues
          ? _value.allowedValues
          : allowedValues // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      blockedValues: freezed == blockedValues
          ? _value.blockedValues
          : blockedValues // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      limits: freezed == limits
          ? _value.limits
          : limits // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CategoryAutonomyImplCopyWith<$Res>
    implements $CategoryAutonomyCopyWith<$Res> {
  factory _$$CategoryAutonomyImplCopyWith(_$CategoryAutonomyImpl value,
          $Res Function(_$CategoryAutonomyImpl) then) =
      __$$CategoryAutonomyImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {DecisionCategory category,
      AutonomyLevel level,
      bool enabled,
      String? customMessage,
      List<String>? allowedValues,
      List<String>? blockedValues,
      Map<String, dynamic>? limits});
}

/// @nodoc
class __$$CategoryAutonomyImplCopyWithImpl<$Res>
    extends _$CategoryAutonomyCopyWithImpl<$Res, _$CategoryAutonomyImpl>
    implements _$$CategoryAutonomyImplCopyWith<$Res> {
  __$$CategoryAutonomyImplCopyWithImpl(_$CategoryAutonomyImpl _value,
      $Res Function(_$CategoryAutonomyImpl) _then)
      : super(_value, _then);

  /// Create a copy of CategoryAutonomy
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? category = null,
    Object? level = null,
    Object? enabled = null,
    Object? customMessage = freezed,
    Object? allowedValues = freezed,
    Object? blockedValues = freezed,
    Object? limits = freezed,
  }) {
    return _then(_$CategoryAutonomyImpl(
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as DecisionCategory,
      level: null == level
          ? _value.level
          : level // ignore: cast_nullable_to_non_nullable
              as AutonomyLevel,
      enabled: null == enabled
          ? _value.enabled
          : enabled // ignore: cast_nullable_to_non_nullable
              as bool,
      customMessage: freezed == customMessage
          ? _value.customMessage
          : customMessage // ignore: cast_nullable_to_non_nullable
              as String?,
      allowedValues: freezed == allowedValues
          ? _value._allowedValues
          : allowedValues // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      blockedValues: freezed == blockedValues
          ? _value._blockedValues
          : blockedValues // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      limits: freezed == limits
          ? _value._limits
          : limits // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CategoryAutonomyImpl implements _CategoryAutonomy {
  const _$CategoryAutonomyImpl(
      {required this.category,
      required this.level,
      this.enabled = true,
      this.customMessage,
      final List<String>? allowedValues,
      final List<String>? blockedValues,
      final Map<String, dynamic>? limits})
      : _allowedValues = allowedValues,
        _blockedValues = blockedValues,
        _limits = limits;

  factory _$CategoryAutonomyImpl.fromJson(Map<String, dynamic> json) =>
      _$$CategoryAutonomyImplFromJson(json);

  @override
  final DecisionCategory category;
  @override
  final AutonomyLevel level;
  @override
  @JsonKey()
  final bool enabled;
  @override
  final String? customMessage;
  final List<String>? _allowedValues;
  @override
  List<String>? get allowedValues {
    final value = _allowedValues;
    if (value == null) return null;
    if (_allowedValues is EqualUnmodifiableListView) return _allowedValues;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  final List<String>? _blockedValues;
  @override
  List<String>? get blockedValues {
    final value = _blockedValues;
    if (value == null) return null;
    if (_blockedValues is EqualUnmodifiableListView) return _blockedValues;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  final Map<String, dynamic>? _limits;
  @override
  Map<String, dynamic>? get limits {
    final value = _limits;
    if (value == null) return null;
    if (_limits is EqualUnmodifiableMapView) return _limits;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  String toString() {
    return 'CategoryAutonomy(category: $category, level: $level, enabled: $enabled, customMessage: $customMessage, allowedValues: $allowedValues, blockedValues: $blockedValues, limits: $limits)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CategoryAutonomyImpl &&
            (identical(other.category, category) ||
                other.category == category) &&
            (identical(other.level, level) || other.level == level) &&
            (identical(other.enabled, enabled) || other.enabled == enabled) &&
            (identical(other.customMessage, customMessage) ||
                other.customMessage == customMessage) &&
            const DeepCollectionEquality()
                .equals(other._allowedValues, _allowedValues) &&
            const DeepCollectionEquality()
                .equals(other._blockedValues, _blockedValues) &&
            const DeepCollectionEquality().equals(other._limits, _limits));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      category,
      level,
      enabled,
      customMessage,
      const DeepCollectionEquality().hash(_allowedValues),
      const DeepCollectionEquality().hash(_blockedValues),
      const DeepCollectionEquality().hash(_limits));

  /// Create a copy of CategoryAutonomy
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CategoryAutonomyImplCopyWith<_$CategoryAutonomyImpl> get copyWith =>
      __$$CategoryAutonomyImplCopyWithImpl<_$CategoryAutonomyImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CategoryAutonomyImplToJson(
      this,
    );
  }
}

abstract class _CategoryAutonomy implements CategoryAutonomy {
  const factory _CategoryAutonomy(
      {required final DecisionCategory category,
      required final AutonomyLevel level,
      final bool enabled,
      final String? customMessage,
      final List<String>? allowedValues,
      final List<String>? blockedValues,
      final Map<String, dynamic>? limits}) = _$CategoryAutonomyImpl;

  factory _CategoryAutonomy.fromJson(Map<String, dynamic> json) =
      _$CategoryAutonomyImpl.fromJson;

  @override
  DecisionCategory get category;
  @override
  AutonomyLevel get level;
  @override
  bool get enabled;
  @override
  String? get customMessage;
  @override
  List<String>? get allowedValues;
  @override
  List<String>? get blockedValues;
  @override
  Map<String, dynamic>? get limits;

  /// Create a copy of CategoryAutonomy
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CategoryAutonomyImplCopyWith<_$CategoryAutonomyImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AIRestriction _$AIRestrictionFromJson(Map<String, dynamic> json) {
  return _AIRestriction.fromJson(json);
}

/// @nodoc
mixin _$AIRestriction {
  String get id => throw _privateConstructorUsedError;
  RestrictionType get type => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  bool get isActive => throw _privateConstructorUsedError;
  Map<String, dynamic>? get parameters => throw _privateConstructorUsedError;
  DateTime? get startTime => throw _privateConstructorUsedError;
  DateTime? get endTime => throw _privateConstructorUsedError;
  List<String>? get daysOfWeek => throw _privateConstructorUsedError;
  DateTime? get createdAt => throw _privateConstructorUsedError;

  /// Serializes this AIRestriction to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AIRestriction
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AIRestrictionCopyWith<AIRestriction> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AIRestrictionCopyWith<$Res> {
  factory $AIRestrictionCopyWith(
          AIRestriction value, $Res Function(AIRestriction) then) =
      _$AIRestrictionCopyWithImpl<$Res, AIRestriction>;
  @useResult
  $Res call(
      {String id,
      RestrictionType type,
      String name,
      String description,
      bool isActive,
      Map<String, dynamic>? parameters,
      DateTime? startTime,
      DateTime? endTime,
      List<String>? daysOfWeek,
      DateTime? createdAt});
}

/// @nodoc
class _$AIRestrictionCopyWithImpl<$Res, $Val extends AIRestriction>
    implements $AIRestrictionCopyWith<$Res> {
  _$AIRestrictionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AIRestriction
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? type = null,
    Object? name = null,
    Object? description = null,
    Object? isActive = null,
    Object? parameters = freezed,
    Object? startTime = freezed,
    Object? endTime = freezed,
    Object? daysOfWeek = freezed,
    Object? createdAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as RestrictionType,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      parameters: freezed == parameters
          ? _value.parameters
          : parameters // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      startTime: freezed == startTime
          ? _value.startTime
          : startTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      endTime: freezed == endTime
          ? _value.endTime
          : endTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      daysOfWeek: freezed == daysOfWeek
          ? _value.daysOfWeek
          : daysOfWeek // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AIRestrictionImplCopyWith<$Res>
    implements $AIRestrictionCopyWith<$Res> {
  factory _$$AIRestrictionImplCopyWith(
          _$AIRestrictionImpl value, $Res Function(_$AIRestrictionImpl) then) =
      __$$AIRestrictionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      RestrictionType type,
      String name,
      String description,
      bool isActive,
      Map<String, dynamic>? parameters,
      DateTime? startTime,
      DateTime? endTime,
      List<String>? daysOfWeek,
      DateTime? createdAt});
}

/// @nodoc
class __$$AIRestrictionImplCopyWithImpl<$Res>
    extends _$AIRestrictionCopyWithImpl<$Res, _$AIRestrictionImpl>
    implements _$$AIRestrictionImplCopyWith<$Res> {
  __$$AIRestrictionImplCopyWithImpl(
      _$AIRestrictionImpl _value, $Res Function(_$AIRestrictionImpl) _then)
      : super(_value, _then);

  /// Create a copy of AIRestriction
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? type = null,
    Object? name = null,
    Object? description = null,
    Object? isActive = null,
    Object? parameters = freezed,
    Object? startTime = freezed,
    Object? endTime = freezed,
    Object? daysOfWeek = freezed,
    Object? createdAt = freezed,
  }) {
    return _then(_$AIRestrictionImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as RestrictionType,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      parameters: freezed == parameters
          ? _value._parameters
          : parameters // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      startTime: freezed == startTime
          ? _value.startTime
          : startTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      endTime: freezed == endTime
          ? _value.endTime
          : endTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      daysOfWeek: freezed == daysOfWeek
          ? _value._daysOfWeek
          : daysOfWeek // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AIRestrictionImpl implements _AIRestriction {
  const _$AIRestrictionImpl(
      {required this.id,
      required this.type,
      required this.name,
      required this.description,
      required this.isActive,
      final Map<String, dynamic>? parameters,
      this.startTime,
      this.endTime,
      final List<String>? daysOfWeek,
      this.createdAt})
      : _parameters = parameters,
        _daysOfWeek = daysOfWeek;

  factory _$AIRestrictionImpl.fromJson(Map<String, dynamic> json) =>
      _$$AIRestrictionImplFromJson(json);

  @override
  final String id;
  @override
  final RestrictionType type;
  @override
  final String name;
  @override
  final String description;
  @override
  final bool isActive;
  final Map<String, dynamic>? _parameters;
  @override
  Map<String, dynamic>? get parameters {
    final value = _parameters;
    if (value == null) return null;
    if (_parameters is EqualUnmodifiableMapView) return _parameters;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  final DateTime? startTime;
  @override
  final DateTime? endTime;
  final List<String>? _daysOfWeek;
  @override
  List<String>? get daysOfWeek {
    final value = _daysOfWeek;
    if (value == null) return null;
    if (_daysOfWeek is EqualUnmodifiableListView) return _daysOfWeek;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  final DateTime? createdAt;

  @override
  String toString() {
    return 'AIRestriction(id: $id, type: $type, name: $name, description: $description, isActive: $isActive, parameters: $parameters, startTime: $startTime, endTime: $endTime, daysOfWeek: $daysOfWeek, createdAt: $createdAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AIRestrictionImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive) &&
            const DeepCollectionEquality()
                .equals(other._parameters, _parameters) &&
            (identical(other.startTime, startTime) ||
                other.startTime == startTime) &&
            (identical(other.endTime, endTime) || other.endTime == endTime) &&
            const DeepCollectionEquality()
                .equals(other._daysOfWeek, _daysOfWeek) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      type,
      name,
      description,
      isActive,
      const DeepCollectionEquality().hash(_parameters),
      startTime,
      endTime,
      const DeepCollectionEquality().hash(_daysOfWeek),
      createdAt);

  /// Create a copy of AIRestriction
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AIRestrictionImplCopyWith<_$AIRestrictionImpl> get copyWith =>
      __$$AIRestrictionImplCopyWithImpl<_$AIRestrictionImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AIRestrictionImplToJson(
      this,
    );
  }
}

abstract class _AIRestriction implements AIRestriction {
  const factory _AIRestriction(
      {required final String id,
      required final RestrictionType type,
      required final String name,
      required final String description,
      required final bool isActive,
      final Map<String, dynamic>? parameters,
      final DateTime? startTime,
      final DateTime? endTime,
      final List<String>? daysOfWeek,
      final DateTime? createdAt}) = _$AIRestrictionImpl;

  factory _AIRestriction.fromJson(Map<String, dynamic> json) =
      _$AIRestrictionImpl.fromJson;

  @override
  String get id;
  @override
  RestrictionType get type;
  @override
  String get name;
  @override
  String get description;
  @override
  bool get isActive;
  @override
  Map<String, dynamic>? get parameters;
  @override
  DateTime? get startTime;
  @override
  DateTime? get endTime;
  @override
  List<String>? get daysOfWeek;
  @override
  DateTime? get createdAt;

  /// Create a copy of AIRestriction
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AIRestrictionImplCopyWith<_$AIRestrictionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

NotificationSettings _$NotificationSettingsFromJson(Map<String, dynamic> json) {
  return _NotificationSettings.fromJson(json);
}

/// @nodoc
mixin _$NotificationSettings {
  NotificationPriority get priority => throw _privateConstructorUsedError;
  bool get approvalRequests => throw _privateConstructorUsedError;
  bool get majorDecisions => throw _privateConstructorUsedError;
  bool get allDecisions => throw _privateConstructorUsedError;
  bool get dailySummary => throw _privateConstructorUsedError;
  bool get weeklyReport => throw _privateConstructorUsedError;
  bool get interventionAlerts => throw _privateConstructorUsedError;
  bool get progressMilestones => throw _privateConstructorUsedError;
  String? get preferredTime => throw _privateConstructorUsedError;

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
      {NotificationPriority priority,
      bool approvalRequests,
      bool majorDecisions,
      bool allDecisions,
      bool dailySummary,
      bool weeklyReport,
      bool interventionAlerts,
      bool progressMilestones,
      String? preferredTime});
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
    Object? priority = null,
    Object? approvalRequests = null,
    Object? majorDecisions = null,
    Object? allDecisions = null,
    Object? dailySummary = null,
    Object? weeklyReport = null,
    Object? interventionAlerts = null,
    Object? progressMilestones = null,
    Object? preferredTime = freezed,
  }) {
    return _then(_value.copyWith(
      priority: null == priority
          ? _value.priority
          : priority // ignore: cast_nullable_to_non_nullable
              as NotificationPriority,
      approvalRequests: null == approvalRequests
          ? _value.approvalRequests
          : approvalRequests // ignore: cast_nullable_to_non_nullable
              as bool,
      majorDecisions: null == majorDecisions
          ? _value.majorDecisions
          : majorDecisions // ignore: cast_nullable_to_non_nullable
              as bool,
      allDecisions: null == allDecisions
          ? _value.allDecisions
          : allDecisions // ignore: cast_nullable_to_non_nullable
              as bool,
      dailySummary: null == dailySummary
          ? _value.dailySummary
          : dailySummary // ignore: cast_nullable_to_non_nullable
              as bool,
      weeklyReport: null == weeklyReport
          ? _value.weeklyReport
          : weeklyReport // ignore: cast_nullable_to_non_nullable
              as bool,
      interventionAlerts: null == interventionAlerts
          ? _value.interventionAlerts
          : interventionAlerts // ignore: cast_nullable_to_non_nullable
              as bool,
      progressMilestones: null == progressMilestones
          ? _value.progressMilestones
          : progressMilestones // ignore: cast_nullable_to_non_nullable
              as bool,
      preferredTime: freezed == preferredTime
          ? _value.preferredTime
          : preferredTime // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
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
      {NotificationPriority priority,
      bool approvalRequests,
      bool majorDecisions,
      bool allDecisions,
      bool dailySummary,
      bool weeklyReport,
      bool interventionAlerts,
      bool progressMilestones,
      String? preferredTime});
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
    Object? priority = null,
    Object? approvalRequests = null,
    Object? majorDecisions = null,
    Object? allDecisions = null,
    Object? dailySummary = null,
    Object? weeklyReport = null,
    Object? interventionAlerts = null,
    Object? progressMilestones = null,
    Object? preferredTime = freezed,
  }) {
    return _then(_$NotificationSettingsImpl(
      priority: null == priority
          ? _value.priority
          : priority // ignore: cast_nullable_to_non_nullable
              as NotificationPriority,
      approvalRequests: null == approvalRequests
          ? _value.approvalRequests
          : approvalRequests // ignore: cast_nullable_to_non_nullable
              as bool,
      majorDecisions: null == majorDecisions
          ? _value.majorDecisions
          : majorDecisions // ignore: cast_nullable_to_non_nullable
              as bool,
      allDecisions: null == allDecisions
          ? _value.allDecisions
          : allDecisions // ignore: cast_nullable_to_non_nullable
              as bool,
      dailySummary: null == dailySummary
          ? _value.dailySummary
          : dailySummary // ignore: cast_nullable_to_non_nullable
              as bool,
      weeklyReport: null == weeklyReport
          ? _value.weeklyReport
          : weeklyReport // ignore: cast_nullable_to_non_nullable
              as bool,
      interventionAlerts: null == interventionAlerts
          ? _value.interventionAlerts
          : interventionAlerts // ignore: cast_nullable_to_non_nullable
              as bool,
      progressMilestones: null == progressMilestones
          ? _value.progressMilestones
          : progressMilestones // ignore: cast_nullable_to_non_nullable
              as bool,
      preferredTime: freezed == preferredTime
          ? _value.preferredTime
          : preferredTime // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$NotificationSettingsImpl implements _NotificationSettings {
  const _$NotificationSettingsImpl(
      {this.priority = NotificationPriority.important,
      this.approvalRequests = true,
      this.majorDecisions = true,
      this.allDecisions = false,
      this.dailySummary = true,
      this.weeklyReport = false,
      this.interventionAlerts = true,
      this.progressMilestones = true,
      this.preferredTime});

  factory _$NotificationSettingsImpl.fromJson(Map<String, dynamic> json) =>
      _$$NotificationSettingsImplFromJson(json);

  @override
  @JsonKey()
  final NotificationPriority priority;
  @override
  @JsonKey()
  final bool approvalRequests;
  @override
  @JsonKey()
  final bool majorDecisions;
  @override
  @JsonKey()
  final bool allDecisions;
  @override
  @JsonKey()
  final bool dailySummary;
  @override
  @JsonKey()
  final bool weeklyReport;
  @override
  @JsonKey()
  final bool interventionAlerts;
  @override
  @JsonKey()
  final bool progressMilestones;
  @override
  final String? preferredTime;

  @override
  String toString() {
    return 'NotificationSettings(priority: $priority, approvalRequests: $approvalRequests, majorDecisions: $majorDecisions, allDecisions: $allDecisions, dailySummary: $dailySummary, weeklyReport: $weeklyReport, interventionAlerts: $interventionAlerts, progressMilestones: $progressMilestones, preferredTime: $preferredTime)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$NotificationSettingsImpl &&
            (identical(other.priority, priority) ||
                other.priority == priority) &&
            (identical(other.approvalRequests, approvalRequests) ||
                other.approvalRequests == approvalRequests) &&
            (identical(other.majorDecisions, majorDecisions) ||
                other.majorDecisions == majorDecisions) &&
            (identical(other.allDecisions, allDecisions) ||
                other.allDecisions == allDecisions) &&
            (identical(other.dailySummary, dailySummary) ||
                other.dailySummary == dailySummary) &&
            (identical(other.weeklyReport, weeklyReport) ||
                other.weeklyReport == weeklyReport) &&
            (identical(other.interventionAlerts, interventionAlerts) ||
                other.interventionAlerts == interventionAlerts) &&
            (identical(other.progressMilestones, progressMilestones) ||
                other.progressMilestones == progressMilestones) &&
            (identical(other.preferredTime, preferredTime) ||
                other.preferredTime == preferredTime));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      priority,
      approvalRequests,
      majorDecisions,
      allDecisions,
      dailySummary,
      weeklyReport,
      interventionAlerts,
      progressMilestones,
      preferredTime);

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
      {final NotificationPriority priority,
      final bool approvalRequests,
      final bool majorDecisions,
      final bool allDecisions,
      final bool dailySummary,
      final bool weeklyReport,
      final bool interventionAlerts,
      final bool progressMilestones,
      final String? preferredTime}) = _$NotificationSettingsImpl;

  factory _NotificationSettings.fromJson(Map<String, dynamic> json) =
      _$NotificationSettingsImpl.fromJson;

  @override
  NotificationPriority get priority;
  @override
  bool get approvalRequests;
  @override
  bool get majorDecisions;
  @override
  bool get allDecisions;
  @override
  bool get dailySummary;
  @override
  bool get weeklyReport;
  @override
  bool get interventionAlerts;
  @override
  bool get progressMilestones;
  @override
  String? get preferredTime;

  /// Create a copy of NotificationSettings
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$NotificationSettingsImplCopyWith<_$NotificationSettingsImpl>
      get copyWith => throw _privateConstructorUsedError;
}

ApprovalRequest _$ApprovalRequestFromJson(Map<String, dynamic> json) {
  return _ApprovalRequest.fromJson(json);
}

/// @nodoc
mixin _$ApprovalRequest {
  String get id => throw _privateConstructorUsedError;
  String get childId => throw _privateConstructorUsedError;
  DecisionCategory get category => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  ApprovalStatus get status => throw _privateConstructorUsedError;
  DateTime get requestedAt => throw _privateConstructorUsedError;
  String? get aiReasoning => throw _privateConstructorUsedError;
  Map<String, dynamic>? get proposedChange =>
      throw _privateConstructorUsedError;
  Map<String, dynamic>? get currentState => throw _privateConstructorUsedError;
  DateTime? get expiresAt => throw _privateConstructorUsedError;
  DateTime? get respondedAt => throw _privateConstructorUsedError;
  String? get parentResponse => throw _privateConstructorUsedError;
  bool get isUrgent => throw _privateConstructorUsedError;

  /// Serializes this ApprovalRequest to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ApprovalRequestCopyWith<ApprovalRequest> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ApprovalRequestCopyWith<$Res> {
  factory $ApprovalRequestCopyWith(
          ApprovalRequest value, $Res Function(ApprovalRequest) then) =
      _$ApprovalRequestCopyWithImpl<$Res, ApprovalRequest>;
  @useResult
  $Res call(
      {String id,
      String childId,
      DecisionCategory category,
      String title,
      String description,
      ApprovalStatus status,
      DateTime requestedAt,
      String? aiReasoning,
      Map<String, dynamic>? proposedChange,
      Map<String, dynamic>? currentState,
      DateTime? expiresAt,
      DateTime? respondedAt,
      String? parentResponse,
      bool isUrgent});
}

/// @nodoc
class _$ApprovalRequestCopyWithImpl<$Res, $Val extends ApprovalRequest>
    implements $ApprovalRequestCopyWith<$Res> {
  _$ApprovalRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? childId = null,
    Object? category = null,
    Object? title = null,
    Object? description = null,
    Object? status = null,
    Object? requestedAt = null,
    Object? aiReasoning = freezed,
    Object? proposedChange = freezed,
    Object? currentState = freezed,
    Object? expiresAt = freezed,
    Object? respondedAt = freezed,
    Object? parentResponse = freezed,
    Object? isUrgent = null,
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
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as DecisionCategory,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as ApprovalStatus,
      requestedAt: null == requestedAt
          ? _value.requestedAt
          : requestedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      aiReasoning: freezed == aiReasoning
          ? _value.aiReasoning
          : aiReasoning // ignore: cast_nullable_to_non_nullable
              as String?,
      proposedChange: freezed == proposedChange
          ? _value.proposedChange
          : proposedChange // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      currentState: freezed == currentState
          ? _value.currentState
          : currentState // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      expiresAt: freezed == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      respondedAt: freezed == respondedAt
          ? _value.respondedAt
          : respondedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      parentResponse: freezed == parentResponse
          ? _value.parentResponse
          : parentResponse // ignore: cast_nullable_to_non_nullable
              as String?,
      isUrgent: null == isUrgent
          ? _value.isUrgent
          : isUrgent // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ApprovalRequestImplCopyWith<$Res>
    implements $ApprovalRequestCopyWith<$Res> {
  factory _$$ApprovalRequestImplCopyWith(_$ApprovalRequestImpl value,
          $Res Function(_$ApprovalRequestImpl) then) =
      __$$ApprovalRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String childId,
      DecisionCategory category,
      String title,
      String description,
      ApprovalStatus status,
      DateTime requestedAt,
      String? aiReasoning,
      Map<String, dynamic>? proposedChange,
      Map<String, dynamic>? currentState,
      DateTime? expiresAt,
      DateTime? respondedAt,
      String? parentResponse,
      bool isUrgent});
}

/// @nodoc
class __$$ApprovalRequestImplCopyWithImpl<$Res>
    extends _$ApprovalRequestCopyWithImpl<$Res, _$ApprovalRequestImpl>
    implements _$$ApprovalRequestImplCopyWith<$Res> {
  __$$ApprovalRequestImplCopyWithImpl(
      _$ApprovalRequestImpl _value, $Res Function(_$ApprovalRequestImpl) _then)
      : super(_value, _then);

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? childId = null,
    Object? category = null,
    Object? title = null,
    Object? description = null,
    Object? status = null,
    Object? requestedAt = null,
    Object? aiReasoning = freezed,
    Object? proposedChange = freezed,
    Object? currentState = freezed,
    Object? expiresAt = freezed,
    Object? respondedAt = freezed,
    Object? parentResponse = freezed,
    Object? isUrgent = null,
  }) {
    return _then(_$ApprovalRequestImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      childId: null == childId
          ? _value.childId
          : childId // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as DecisionCategory,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as ApprovalStatus,
      requestedAt: null == requestedAt
          ? _value.requestedAt
          : requestedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      aiReasoning: freezed == aiReasoning
          ? _value.aiReasoning
          : aiReasoning // ignore: cast_nullable_to_non_nullable
              as String?,
      proposedChange: freezed == proposedChange
          ? _value._proposedChange
          : proposedChange // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      currentState: freezed == currentState
          ? _value._currentState
          : currentState // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      expiresAt: freezed == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      respondedAt: freezed == respondedAt
          ? _value.respondedAt
          : respondedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      parentResponse: freezed == parentResponse
          ? _value.parentResponse
          : parentResponse // ignore: cast_nullable_to_non_nullable
              as String?,
      isUrgent: null == isUrgent
          ? _value.isUrgent
          : isUrgent // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ApprovalRequestImpl implements _ApprovalRequest {
  const _$ApprovalRequestImpl(
      {required this.id,
      required this.childId,
      required this.category,
      required this.title,
      required this.description,
      required this.status,
      required this.requestedAt,
      this.aiReasoning,
      final Map<String, dynamic>? proposedChange,
      final Map<String, dynamic>? currentState,
      this.expiresAt,
      this.respondedAt,
      this.parentResponse,
      this.isUrgent = false})
      : _proposedChange = proposedChange,
        _currentState = currentState;

  factory _$ApprovalRequestImpl.fromJson(Map<String, dynamic> json) =>
      _$$ApprovalRequestImplFromJson(json);

  @override
  final String id;
  @override
  final String childId;
  @override
  final DecisionCategory category;
  @override
  final String title;
  @override
  final String description;
  @override
  final ApprovalStatus status;
  @override
  final DateTime requestedAt;
  @override
  final String? aiReasoning;
  final Map<String, dynamic>? _proposedChange;
  @override
  Map<String, dynamic>? get proposedChange {
    final value = _proposedChange;
    if (value == null) return null;
    if (_proposedChange is EqualUnmodifiableMapView) return _proposedChange;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  final Map<String, dynamic>? _currentState;
  @override
  Map<String, dynamic>? get currentState {
    final value = _currentState;
    if (value == null) return null;
    if (_currentState is EqualUnmodifiableMapView) return _currentState;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  final DateTime? expiresAt;
  @override
  final DateTime? respondedAt;
  @override
  final String? parentResponse;
  @override
  @JsonKey()
  final bool isUrgent;

  @override
  String toString() {
    return 'ApprovalRequest(id: $id, childId: $childId, category: $category, title: $title, description: $description, status: $status, requestedAt: $requestedAt, aiReasoning: $aiReasoning, proposedChange: $proposedChange, currentState: $currentState, expiresAt: $expiresAt, respondedAt: $respondedAt, parentResponse: $parentResponse, isUrgent: $isUrgent)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ApprovalRequestImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.childId, childId) || other.childId == childId) &&
            (identical(other.category, category) ||
                other.category == category) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.requestedAt, requestedAt) ||
                other.requestedAt == requestedAt) &&
            (identical(other.aiReasoning, aiReasoning) ||
                other.aiReasoning == aiReasoning) &&
            const DeepCollectionEquality()
                .equals(other._proposedChange, _proposedChange) &&
            const DeepCollectionEquality()
                .equals(other._currentState, _currentState) &&
            (identical(other.expiresAt, expiresAt) ||
                other.expiresAt == expiresAt) &&
            (identical(other.respondedAt, respondedAt) ||
                other.respondedAt == respondedAt) &&
            (identical(other.parentResponse, parentResponse) ||
                other.parentResponse == parentResponse) &&
            (identical(other.isUrgent, isUrgent) ||
                other.isUrgent == isUrgent));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      childId,
      category,
      title,
      description,
      status,
      requestedAt,
      aiReasoning,
      const DeepCollectionEquality().hash(_proposedChange),
      const DeepCollectionEquality().hash(_currentState),
      expiresAt,
      respondedAt,
      parentResponse,
      isUrgent);

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ApprovalRequestImplCopyWith<_$ApprovalRequestImpl> get copyWith =>
      __$$ApprovalRequestImplCopyWithImpl<_$ApprovalRequestImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ApprovalRequestImplToJson(
      this,
    );
  }
}

abstract class _ApprovalRequest implements ApprovalRequest {
  const factory _ApprovalRequest(
      {required final String id,
      required final String childId,
      required final DecisionCategory category,
      required final String title,
      required final String description,
      required final ApprovalStatus status,
      required final DateTime requestedAt,
      final String? aiReasoning,
      final Map<String, dynamic>? proposedChange,
      final Map<String, dynamic>? currentState,
      final DateTime? expiresAt,
      final DateTime? respondedAt,
      final String? parentResponse,
      final bool isUrgent}) = _$ApprovalRequestImpl;

  factory _ApprovalRequest.fromJson(Map<String, dynamic> json) =
      _$ApprovalRequestImpl.fromJson;

  @override
  String get id;
  @override
  String get childId;
  @override
  DecisionCategory get category;
  @override
  String get title;
  @override
  String get description;
  @override
  ApprovalStatus get status;
  @override
  DateTime get requestedAt;
  @override
  String? get aiReasoning;
  @override
  Map<String, dynamic>? get proposedChange;
  @override
  Map<String, dynamic>? get currentState;
  @override
  DateTime? get expiresAt;
  @override
  DateTime? get respondedAt;
  @override
  String? get parentResponse;
  @override
  bool get isUrgent;

  /// Create a copy of ApprovalRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ApprovalRequestImplCopyWith<_$ApprovalRequestImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AutonomyPreset _$AutonomyPresetFromJson(Map<String, dynamic> json) {
  return _AutonomyPreset.fromJson(json);
}

/// @nodoc
mixin _$AutonomyPreset {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  AutonomyLevel get defaultLevel => throw _privateConstructorUsedError;
  Map<DecisionCategory, AutonomyLevel> get categoryLevels =>
      throw _privateConstructorUsedError;
  IconType? get icon => throw _privateConstructorUsedError;
  bool get isRecommended => throw _privateConstructorUsedError;

  /// Serializes this AutonomyPreset to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AutonomyPreset
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AutonomyPresetCopyWith<AutonomyPreset> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AutonomyPresetCopyWith<$Res> {
  factory $AutonomyPresetCopyWith(
          AutonomyPreset value, $Res Function(AutonomyPreset) then) =
      _$AutonomyPresetCopyWithImpl<$Res, AutonomyPreset>;
  @useResult
  $Res call(
      {String id,
      String name,
      String description,
      AutonomyLevel defaultLevel,
      Map<DecisionCategory, AutonomyLevel> categoryLevels,
      IconType? icon,
      bool isRecommended});
}

/// @nodoc
class _$AutonomyPresetCopyWithImpl<$Res, $Val extends AutonomyPreset>
    implements $AutonomyPresetCopyWith<$Res> {
  _$AutonomyPresetCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AutonomyPreset
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = null,
    Object? defaultLevel = null,
    Object? categoryLevels = null,
    Object? icon = freezed,
    Object? isRecommended = null,
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
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      defaultLevel: null == defaultLevel
          ? _value.defaultLevel
          : defaultLevel // ignore: cast_nullable_to_non_nullable
              as AutonomyLevel,
      categoryLevels: null == categoryLevels
          ? _value.categoryLevels
          : categoryLevels // ignore: cast_nullable_to_non_nullable
              as Map<DecisionCategory, AutonomyLevel>,
      icon: freezed == icon
          ? _value.icon
          : icon // ignore: cast_nullable_to_non_nullable
              as IconType?,
      isRecommended: null == isRecommended
          ? _value.isRecommended
          : isRecommended // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AutonomyPresetImplCopyWith<$Res>
    implements $AutonomyPresetCopyWith<$Res> {
  factory _$$AutonomyPresetImplCopyWith(_$AutonomyPresetImpl value,
          $Res Function(_$AutonomyPresetImpl) then) =
      __$$AutonomyPresetImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String description,
      AutonomyLevel defaultLevel,
      Map<DecisionCategory, AutonomyLevel> categoryLevels,
      IconType? icon,
      bool isRecommended});
}

/// @nodoc
class __$$AutonomyPresetImplCopyWithImpl<$Res>
    extends _$AutonomyPresetCopyWithImpl<$Res, _$AutonomyPresetImpl>
    implements _$$AutonomyPresetImplCopyWith<$Res> {
  __$$AutonomyPresetImplCopyWithImpl(
      _$AutonomyPresetImpl _value, $Res Function(_$AutonomyPresetImpl) _then)
      : super(_value, _then);

  /// Create a copy of AutonomyPreset
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = null,
    Object? defaultLevel = null,
    Object? categoryLevels = null,
    Object? icon = freezed,
    Object? isRecommended = null,
  }) {
    return _then(_$AutonomyPresetImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      defaultLevel: null == defaultLevel
          ? _value.defaultLevel
          : defaultLevel // ignore: cast_nullable_to_non_nullable
              as AutonomyLevel,
      categoryLevels: null == categoryLevels
          ? _value._categoryLevels
          : categoryLevels // ignore: cast_nullable_to_non_nullable
              as Map<DecisionCategory, AutonomyLevel>,
      icon: freezed == icon
          ? _value.icon
          : icon // ignore: cast_nullable_to_non_nullable
              as IconType?,
      isRecommended: null == isRecommended
          ? _value.isRecommended
          : isRecommended // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AutonomyPresetImpl implements _AutonomyPreset {
  const _$AutonomyPresetImpl(
      {required this.id,
      required this.name,
      required this.description,
      required this.defaultLevel,
      required final Map<DecisionCategory, AutonomyLevel> categoryLevels,
      this.icon,
      this.isRecommended = false})
      : _categoryLevels = categoryLevels;

  factory _$AutonomyPresetImpl.fromJson(Map<String, dynamic> json) =>
      _$$AutonomyPresetImplFromJson(json);

  @override
  final String id;
  @override
  final String name;
  @override
  final String description;
  @override
  final AutonomyLevel defaultLevel;
  final Map<DecisionCategory, AutonomyLevel> _categoryLevels;
  @override
  Map<DecisionCategory, AutonomyLevel> get categoryLevels {
    if (_categoryLevels is EqualUnmodifiableMapView) return _categoryLevels;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_categoryLevels);
  }

  @override
  final IconType? icon;
  @override
  @JsonKey()
  final bool isRecommended;

  @override
  String toString() {
    return 'AutonomyPreset(id: $id, name: $name, description: $description, defaultLevel: $defaultLevel, categoryLevels: $categoryLevels, icon: $icon, isRecommended: $isRecommended)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AutonomyPresetImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.defaultLevel, defaultLevel) ||
                other.defaultLevel == defaultLevel) &&
            const DeepCollectionEquality()
                .equals(other._categoryLevels, _categoryLevels) &&
            (identical(other.icon, icon) || other.icon == icon) &&
            (identical(other.isRecommended, isRecommended) ||
                other.isRecommended == isRecommended));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      name,
      description,
      defaultLevel,
      const DeepCollectionEquality().hash(_categoryLevels),
      icon,
      isRecommended);

  /// Create a copy of AutonomyPreset
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AutonomyPresetImplCopyWith<_$AutonomyPresetImpl> get copyWith =>
      __$$AutonomyPresetImplCopyWithImpl<_$AutonomyPresetImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AutonomyPresetImplToJson(
      this,
    );
  }
}

abstract class _AutonomyPreset implements AutonomyPreset {
  const factory _AutonomyPreset(
      {required final String id,
      required final String name,
      required final String description,
      required final AutonomyLevel defaultLevel,
      required final Map<DecisionCategory, AutonomyLevel> categoryLevels,
      final IconType? icon,
      final bool isRecommended}) = _$AutonomyPresetImpl;

  factory _AutonomyPreset.fromJson(Map<String, dynamic> json) =
      _$AutonomyPresetImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  String get description;
  @override
  AutonomyLevel get defaultLevel;
  @override
  Map<DecisionCategory, AutonomyLevel> get categoryLevels;
  @override
  IconType? get icon;
  @override
  bool get isRecommended;

  /// Create a copy of AutonomyPreset
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AutonomyPresetImplCopyWith<_$AutonomyPresetImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AIActivityEntry _$AIActivityEntryFromJson(Map<String, dynamic> json) {
  return _AIActivityEntry.fromJson(json);
}

/// @nodoc
mixin _$AIActivityEntry {
  String get id => throw _privateConstructorUsedError;
  DateTime get timestamp => throw _privateConstructorUsedError;
  DecisionCategory get category => throw _privateConstructorUsedError;
  String get action => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  ApprovalStatus? get approvalStatus => throw _privateConstructorUsedError;
  String? get parentAction => throw _privateConstructorUsedError;
  Map<String, dynamic>? get details => throw _privateConstructorUsedError;

  /// Serializes this AIActivityEntry to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AIActivityEntry
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AIActivityEntryCopyWith<AIActivityEntry> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AIActivityEntryCopyWith<$Res> {
  factory $AIActivityEntryCopyWith(
          AIActivityEntry value, $Res Function(AIActivityEntry) then) =
      _$AIActivityEntryCopyWithImpl<$Res, AIActivityEntry>;
  @useResult
  $Res call(
      {String id,
      DateTime timestamp,
      DecisionCategory category,
      String action,
      String description,
      ApprovalStatus? approvalStatus,
      String? parentAction,
      Map<String, dynamic>? details});
}

/// @nodoc
class _$AIActivityEntryCopyWithImpl<$Res, $Val extends AIActivityEntry>
    implements $AIActivityEntryCopyWith<$Res> {
  _$AIActivityEntryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AIActivityEntry
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? timestamp = null,
    Object? category = null,
    Object? action = null,
    Object? description = null,
    Object? approvalStatus = freezed,
    Object? parentAction = freezed,
    Object? details = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as DecisionCategory,
      action: null == action
          ? _value.action
          : action // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      approvalStatus: freezed == approvalStatus
          ? _value.approvalStatus
          : approvalStatus // ignore: cast_nullable_to_non_nullable
              as ApprovalStatus?,
      parentAction: freezed == parentAction
          ? _value.parentAction
          : parentAction // ignore: cast_nullable_to_non_nullable
              as String?,
      details: freezed == details
          ? _value.details
          : details // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AIActivityEntryImplCopyWith<$Res>
    implements $AIActivityEntryCopyWith<$Res> {
  factory _$$AIActivityEntryImplCopyWith(_$AIActivityEntryImpl value,
          $Res Function(_$AIActivityEntryImpl) then) =
      __$$AIActivityEntryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      DateTime timestamp,
      DecisionCategory category,
      String action,
      String description,
      ApprovalStatus? approvalStatus,
      String? parentAction,
      Map<String, dynamic>? details});
}

/// @nodoc
class __$$AIActivityEntryImplCopyWithImpl<$Res>
    extends _$AIActivityEntryCopyWithImpl<$Res, _$AIActivityEntryImpl>
    implements _$$AIActivityEntryImplCopyWith<$Res> {
  __$$AIActivityEntryImplCopyWithImpl(
      _$AIActivityEntryImpl _value, $Res Function(_$AIActivityEntryImpl) _then)
      : super(_value, _then);

  /// Create a copy of AIActivityEntry
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? timestamp = null,
    Object? category = null,
    Object? action = null,
    Object? description = null,
    Object? approvalStatus = freezed,
    Object? parentAction = freezed,
    Object? details = freezed,
  }) {
    return _then(_$AIActivityEntryImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as DecisionCategory,
      action: null == action
          ? _value.action
          : action // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      approvalStatus: freezed == approvalStatus
          ? _value.approvalStatus
          : approvalStatus // ignore: cast_nullable_to_non_nullable
              as ApprovalStatus?,
      parentAction: freezed == parentAction
          ? _value.parentAction
          : parentAction // ignore: cast_nullable_to_non_nullable
              as String?,
      details: freezed == details
          ? _value._details
          : details // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AIActivityEntryImpl implements _AIActivityEntry {
  const _$AIActivityEntryImpl(
      {required this.id,
      required this.timestamp,
      required this.category,
      required this.action,
      required this.description,
      this.approvalStatus,
      this.parentAction,
      final Map<String, dynamic>? details})
      : _details = details;

  factory _$AIActivityEntryImpl.fromJson(Map<String, dynamic> json) =>
      _$$AIActivityEntryImplFromJson(json);

  @override
  final String id;
  @override
  final DateTime timestamp;
  @override
  final DecisionCategory category;
  @override
  final String action;
  @override
  final String description;
  @override
  final ApprovalStatus? approvalStatus;
  @override
  final String? parentAction;
  final Map<String, dynamic>? _details;
  @override
  Map<String, dynamic>? get details {
    final value = _details;
    if (value == null) return null;
    if (_details is EqualUnmodifiableMapView) return _details;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  String toString() {
    return 'AIActivityEntry(id: $id, timestamp: $timestamp, category: $category, action: $action, description: $description, approvalStatus: $approvalStatus, parentAction: $parentAction, details: $details)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AIActivityEntryImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.timestamp, timestamp) ||
                other.timestamp == timestamp) &&
            (identical(other.category, category) ||
                other.category == category) &&
            (identical(other.action, action) || other.action == action) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.approvalStatus, approvalStatus) ||
                other.approvalStatus == approvalStatus) &&
            (identical(other.parentAction, parentAction) ||
                other.parentAction == parentAction) &&
            const DeepCollectionEquality().equals(other._details, _details));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      timestamp,
      category,
      action,
      description,
      approvalStatus,
      parentAction,
      const DeepCollectionEquality().hash(_details));

  /// Create a copy of AIActivityEntry
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AIActivityEntryImplCopyWith<_$AIActivityEntryImpl> get copyWith =>
      __$$AIActivityEntryImplCopyWithImpl<_$AIActivityEntryImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AIActivityEntryImplToJson(
      this,
    );
  }
}

abstract class _AIActivityEntry implements AIActivityEntry {
  const factory _AIActivityEntry(
      {required final String id,
      required final DateTime timestamp,
      required final DecisionCategory category,
      required final String action,
      required final String description,
      final ApprovalStatus? approvalStatus,
      final String? parentAction,
      final Map<String, dynamic>? details}) = _$AIActivityEntryImpl;

  factory _AIActivityEntry.fromJson(Map<String, dynamic> json) =
      _$AIActivityEntryImpl.fromJson;

  @override
  String get id;
  @override
  DateTime get timestamp;
  @override
  DecisionCategory get category;
  @override
  String get action;
  @override
  String get description;
  @override
  ApprovalStatus? get approvalStatus;
  @override
  String? get parentAction;
  @override
  Map<String, dynamic>? get details;

  /// Create a copy of AIActivityEntry
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AIActivityEntryImplCopyWith<_$AIActivityEntryImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
