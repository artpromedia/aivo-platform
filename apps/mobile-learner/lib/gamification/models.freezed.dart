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
mixin _$BadgeRequirement {
  String get type;
  int get targetValue;
  String? get skillId;

  /// Create a copy of BadgeRequirement
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $BadgeRequirementCopyWith<BadgeRequirement> get copyWith =>
      _$BadgeRequirementCopyWithImpl<BadgeRequirement>(
          this as BadgeRequirement, _$identity);

  /// Serializes this BadgeRequirement to a JSON map.
  Map<String, dynamic> toJson();

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is BadgeRequirement &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.targetValue, targetValue) ||
                other.targetValue == targetValue) &&
            (identical(other.skillId, skillId) || other.skillId == skillId));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, type, targetValue, skillId);

  @override
  String toString() {
    return 'BadgeRequirement(type: $type, targetValue: $targetValue, skillId: $skillId)';
  }
}

/// @nodoc
abstract mixin class $BadgeRequirementCopyWith<$Res> {
  factory $BadgeRequirementCopyWith(
          BadgeRequirement value, $Res Function(BadgeRequirement) _then) =
      _$BadgeRequirementCopyWithImpl;
  @useResult
  $Res call({String type, int targetValue, String? skillId});
}

/// @nodoc
class _$BadgeRequirementCopyWithImpl<$Res>
    implements $BadgeRequirementCopyWith<$Res> {
  _$BadgeRequirementCopyWithImpl(this._self, this._then);

  final BadgeRequirement _self;
  final $Res Function(BadgeRequirement) _then;

  /// Create a copy of BadgeRequirement
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? type = null,
    Object? targetValue = null,
    Object? skillId = freezed,
  }) {
    return _then(_self.copyWith(
      type: null == type
          ? _self.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      targetValue: null == targetValue
          ? _self.targetValue
          : targetValue // ignore: cast_nullable_to_non_nullable
              as int,
      skillId: freezed == skillId
          ? _self.skillId
          : skillId // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// Adds pattern-matching-related methods to [BadgeRequirement].
extension BadgeRequirementPatterns on BadgeRequirement {
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
    TResult Function(_BadgeRequirement value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _BadgeRequirement() when $default != null:
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
    TResult Function(_BadgeRequirement value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _BadgeRequirement():
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
    TResult? Function(_BadgeRequirement value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _BadgeRequirement() when $default != null:
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
    TResult Function(String type, int targetValue, String? skillId)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _BadgeRequirement() when $default != null:
        return $default(_that.type, _that.targetValue, _that.skillId);
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
    TResult Function(String type, int targetValue, String? skillId) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _BadgeRequirement():
        return $default(_that.type, _that.targetValue, _that.skillId);
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
    TResult? Function(String type, int targetValue, String? skillId)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _BadgeRequirement() when $default != null:
        return $default(_that.type, _that.targetValue, _that.skillId);
      case _:
        return null;
    }
  }
}

/// @nodoc
@JsonSerializable()
class _BadgeRequirement implements BadgeRequirement {
  const _BadgeRequirement(
      {required this.type, required this.targetValue, this.skillId});
  factory _BadgeRequirement.fromJson(Map<String, dynamic> json) =>
      _$BadgeRequirementFromJson(json);

  @override
  final String type;
  @override
  final int targetValue;
  @override
  final String? skillId;

  /// Create a copy of BadgeRequirement
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$BadgeRequirementCopyWith<_BadgeRequirement> get copyWith =>
      __$BadgeRequirementCopyWithImpl<_BadgeRequirement>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$BadgeRequirementToJson(
      this,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _BadgeRequirement &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.targetValue, targetValue) ||
                other.targetValue == targetValue) &&
            (identical(other.skillId, skillId) || other.skillId == skillId));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, type, targetValue, skillId);

  @override
  String toString() {
    return 'BadgeRequirement(type: $type, targetValue: $targetValue, skillId: $skillId)';
  }
}

/// @nodoc
abstract mixin class _$BadgeRequirementCopyWith<$Res>
    implements $BadgeRequirementCopyWith<$Res> {
  factory _$BadgeRequirementCopyWith(
          _BadgeRequirement value, $Res Function(_BadgeRequirement) _then) =
      __$BadgeRequirementCopyWithImpl;
  @override
  @useResult
  $Res call({String type, int targetValue, String? skillId});
}

/// @nodoc
class __$BadgeRequirementCopyWithImpl<$Res>
    implements _$BadgeRequirementCopyWith<$Res> {
  __$BadgeRequirementCopyWithImpl(this._self, this._then);

  final _BadgeRequirement _self;
  final $Res Function(_BadgeRequirement) _then;

  /// Create a copy of BadgeRequirement
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $Res call({
    Object? type = null,
    Object? targetValue = null,
    Object? skillId = freezed,
  }) {
    return _then(_BadgeRequirement(
      type: null == type
          ? _self.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      targetValue: null == targetValue
          ? _self.targetValue
          : targetValue // ignore: cast_nullable_to_non_nullable
              as int,
      skillId: freezed == skillId
          ? _self.skillId
          : skillId // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
mixin _$GamificationBadge {
  String get id;
  String get name;
  String get description;
  String get iconUrl;
  String get category;
  BadgeRarity get rarity;
  int get pointsValue;
  BadgeRequirement? get requirement;

  /// Create a copy of GamificationBadge
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $GamificationBadgeCopyWith<GamificationBadge> get copyWith =>
      _$GamificationBadgeCopyWithImpl<GamificationBadge>(
          this as GamificationBadge, _$identity);

  /// Serializes this GamificationBadge to a JSON map.
  Map<String, dynamic> toJson();

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is GamificationBadge &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.iconUrl, iconUrl) || other.iconUrl == iconUrl) &&
            (identical(other.category, category) ||
                other.category == category) &&
            (identical(other.rarity, rarity) || other.rarity == rarity) &&
            (identical(other.pointsValue, pointsValue) ||
                other.pointsValue == pointsValue) &&
            (identical(other.requirement, requirement) ||
                other.requirement == requirement));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, name, description, iconUrl,
      category, rarity, pointsValue, requirement);

  @override
  String toString() {
    return 'GamificationBadge(id: $id, name: $name, description: $description, iconUrl: $iconUrl, category: $category, rarity: $rarity, pointsValue: $pointsValue, requirement: $requirement)';
  }
}

/// @nodoc
abstract mixin class $GamificationBadgeCopyWith<$Res> {
  factory $GamificationBadgeCopyWith(
          GamificationBadge value, $Res Function(GamificationBadge) _then) =
      _$GamificationBadgeCopyWithImpl;
  @useResult
  $Res call(
      {String id,
      String name,
      String description,
      String iconUrl,
      String category,
      BadgeRarity rarity,
      int pointsValue,
      BadgeRequirement? requirement});

  $BadgeRequirementCopyWith<$Res>? get requirement;
}

/// @nodoc
class _$GamificationBadgeCopyWithImpl<$Res>
    implements $GamificationBadgeCopyWith<$Res> {
  _$GamificationBadgeCopyWithImpl(this._self, this._then);

  final GamificationBadge _self;
  final $Res Function(GamificationBadge) _then;

  /// Create a copy of GamificationBadge
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = null,
    Object? iconUrl = null,
    Object? category = null,
    Object? rarity = null,
    Object? pointsValue = null,
    Object? requirement = freezed,
  }) {
    return _then(_self.copyWith(
      id: null == id
          ? _self.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _self.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _self.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      iconUrl: null == iconUrl
          ? _self.iconUrl
          : iconUrl // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _self.category
          : category // ignore: cast_nullable_to_non_nullable
              as String,
      rarity: null == rarity
          ? _self.rarity
          : rarity // ignore: cast_nullable_to_non_nullable
              as BadgeRarity,
      pointsValue: null == pointsValue
          ? _self.pointsValue
          : pointsValue // ignore: cast_nullable_to_non_nullable
              as int,
      requirement: freezed == requirement
          ? _self.requirement
          : requirement // ignore: cast_nullable_to_non_nullable
              as BadgeRequirement?,
    ));
  }

  /// Create a copy of GamificationBadge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $BadgeRequirementCopyWith<$Res>? get requirement {
    if (_self.requirement == null) {
      return null;
    }

    return $BadgeRequirementCopyWith<$Res>(_self.requirement!, (value) {
      return _then(_self.copyWith(requirement: value));
    });
  }
}

/// Adds pattern-matching-related methods to [GamificationBadge].
extension GamificationBadgePatterns on GamificationBadge {
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
    TResult Function(_GamificationBadge value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _GamificationBadge() when $default != null:
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
    TResult Function(_GamificationBadge value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _GamificationBadge():
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
    TResult? Function(_GamificationBadge value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _GamificationBadge() when $default != null:
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
            String name,
            String description,
            String iconUrl,
            String category,
            BadgeRarity rarity,
            int pointsValue,
            BadgeRequirement? requirement)?
        $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _GamificationBadge() when $default != null:
        return $default(_that.id, _that.name, _that.description, _that.iconUrl,
            _that.category, _that.rarity, _that.pointsValue, _that.requirement);
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
            String name,
            String description,
            String iconUrl,
            String category,
            BadgeRarity rarity,
            int pointsValue,
            BadgeRequirement? requirement)
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _GamificationBadge():
        return $default(_that.id, _that.name, _that.description, _that.iconUrl,
            _that.category, _that.rarity, _that.pointsValue, _that.requirement);
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
            String name,
            String description,
            String iconUrl,
            String category,
            BadgeRarity rarity,
            int pointsValue,
            BadgeRequirement? requirement)?
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _GamificationBadge() when $default != null:
        return $default(_that.id, _that.name, _that.description, _that.iconUrl,
            _that.category, _that.rarity, _that.pointsValue, _that.requirement);
      case _:
        return null;
    }
  }
}

/// @nodoc
@JsonSerializable()
class _GamificationBadge implements GamificationBadge {
  const _GamificationBadge(
      {required this.id,
      required this.name,
      required this.description,
      required this.iconUrl,
      required this.category,
      this.rarity = BadgeRarity.common,
      this.pointsValue = 0,
      this.requirement});
  factory _GamificationBadge.fromJson(Map<String, dynamic> json) =>
      _$GamificationBadgeFromJson(json);

  @override
  final String id;
  @override
  final String name;
  @override
  final String description;
  @override
  final String iconUrl;
  @override
  final String category;
  @override
  @JsonKey()
  final BadgeRarity rarity;
  @override
  @JsonKey()
  final int pointsValue;
  @override
  final BadgeRequirement? requirement;

  /// Create a copy of GamificationBadge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$GamificationBadgeCopyWith<_GamificationBadge> get copyWith =>
      __$GamificationBadgeCopyWithImpl<_GamificationBadge>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$GamificationBadgeToJson(
      this,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _GamificationBadge &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.iconUrl, iconUrl) || other.iconUrl == iconUrl) &&
            (identical(other.category, category) ||
                other.category == category) &&
            (identical(other.rarity, rarity) || other.rarity == rarity) &&
            (identical(other.pointsValue, pointsValue) ||
                other.pointsValue == pointsValue) &&
            (identical(other.requirement, requirement) ||
                other.requirement == requirement));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, name, description, iconUrl,
      category, rarity, pointsValue, requirement);

  @override
  String toString() {
    return 'GamificationBadge(id: $id, name: $name, description: $description, iconUrl: $iconUrl, category: $category, rarity: $rarity, pointsValue: $pointsValue, requirement: $requirement)';
  }
}

/// @nodoc
abstract mixin class _$GamificationBadgeCopyWith<$Res>
    implements $GamificationBadgeCopyWith<$Res> {
  factory _$GamificationBadgeCopyWith(
          _GamificationBadge value, $Res Function(_GamificationBadge) _then) =
      __$GamificationBadgeCopyWithImpl;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String description,
      String iconUrl,
      String category,
      BadgeRarity rarity,
      int pointsValue,
      BadgeRequirement? requirement});

  @override
  $BadgeRequirementCopyWith<$Res>? get requirement;
}

/// @nodoc
class __$GamificationBadgeCopyWithImpl<$Res>
    implements _$GamificationBadgeCopyWith<$Res> {
  __$GamificationBadgeCopyWithImpl(this._self, this._then);

  final _GamificationBadge _self;
  final $Res Function(_GamificationBadge) _then;

  /// Create a copy of GamificationBadge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = null,
    Object? iconUrl = null,
    Object? category = null,
    Object? rarity = null,
    Object? pointsValue = null,
    Object? requirement = freezed,
  }) {
    return _then(_GamificationBadge(
      id: null == id
          ? _self.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _self.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _self.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      iconUrl: null == iconUrl
          ? _self.iconUrl
          : iconUrl // ignore: cast_nullable_to_non_nullable
              as String,
      category: null == category
          ? _self.category
          : category // ignore: cast_nullable_to_non_nullable
              as String,
      rarity: null == rarity
          ? _self.rarity
          : rarity // ignore: cast_nullable_to_non_nullable
              as BadgeRarity,
      pointsValue: null == pointsValue
          ? _self.pointsValue
          : pointsValue // ignore: cast_nullable_to_non_nullable
              as int,
      requirement: freezed == requirement
          ? _self.requirement
          : requirement // ignore: cast_nullable_to_non_nullable
              as BadgeRequirement?,
    ));
  }

  /// Create a copy of GamificationBadge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $BadgeRequirementCopyWith<$Res>? get requirement {
    if (_self.requirement == null) {
      return null;
    }

    return $BadgeRequirementCopyWith<$Res>(_self.requirement!, (value) {
      return _then(_self.copyWith(requirement: value));
    });
  }
}

/// @nodoc
mixin _$EarnedBadge {
  String get id;
  GamificationBadge get badge;
  String get earnedAt;
  String? get earnedForActivity;

  /// Create a copy of EarnedBadge
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $EarnedBadgeCopyWith<EarnedBadge> get copyWith =>
      _$EarnedBadgeCopyWithImpl<EarnedBadge>(this as EarnedBadge, _$identity);

  /// Serializes this EarnedBadge to a JSON map.
  Map<String, dynamic> toJson();

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is EarnedBadge &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.badge, badge) || other.badge == badge) &&
            (identical(other.earnedAt, earnedAt) ||
                other.earnedAt == earnedAt) &&
            (identical(other.earnedForActivity, earnedForActivity) ||
                other.earnedForActivity == earnedForActivity));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, id, badge, earnedAt, earnedForActivity);

  @override
  String toString() {
    return 'EarnedBadge(id: $id, badge: $badge, earnedAt: $earnedAt, earnedForActivity: $earnedForActivity)';
  }
}

/// @nodoc
abstract mixin class $EarnedBadgeCopyWith<$Res> {
  factory $EarnedBadgeCopyWith(
          EarnedBadge value, $Res Function(EarnedBadge) _then) =
      _$EarnedBadgeCopyWithImpl;
  @useResult
  $Res call(
      {String id,
      GamificationBadge badge,
      String earnedAt,
      String? earnedForActivity});

  $GamificationBadgeCopyWith<$Res> get badge;
}

/// @nodoc
class _$EarnedBadgeCopyWithImpl<$Res> implements $EarnedBadgeCopyWith<$Res> {
  _$EarnedBadgeCopyWithImpl(this._self, this._then);

  final EarnedBadge _self;
  final $Res Function(EarnedBadge) _then;

  /// Create a copy of EarnedBadge
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? badge = null,
    Object? earnedAt = null,
    Object? earnedForActivity = freezed,
  }) {
    return _then(_self.copyWith(
      id: null == id
          ? _self.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      badge: null == badge
          ? _self.badge
          : badge // ignore: cast_nullable_to_non_nullable
              as GamificationBadge,
      earnedAt: null == earnedAt
          ? _self.earnedAt
          : earnedAt // ignore: cast_nullable_to_non_nullable
              as String,
      earnedForActivity: freezed == earnedForActivity
          ? _self.earnedForActivity
          : earnedForActivity // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }

  /// Create a copy of EarnedBadge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $GamificationBadgeCopyWith<$Res> get badge {
    return $GamificationBadgeCopyWith<$Res>(_self.badge, (value) {
      return _then(_self.copyWith(badge: value));
    });
  }
}

/// Adds pattern-matching-related methods to [EarnedBadge].
extension EarnedBadgePatterns on EarnedBadge {
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
    TResult Function(_EarnedBadge value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _EarnedBadge() when $default != null:
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
    TResult Function(_EarnedBadge value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EarnedBadge():
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
    TResult? Function(_EarnedBadge value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EarnedBadge() when $default != null:
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
    TResult Function(String id, GamificationBadge badge, String earnedAt,
            String? earnedForActivity)?
        $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _EarnedBadge() when $default != null:
        return $default(
            _that.id, _that.badge, _that.earnedAt, _that.earnedForActivity);
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
    TResult Function(String id, GamificationBadge badge, String earnedAt,
            String? earnedForActivity)
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EarnedBadge():
        return $default(
            _that.id, _that.badge, _that.earnedAt, _that.earnedForActivity);
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
    TResult? Function(String id, GamificationBadge badge, String earnedAt,
            String? earnedForActivity)?
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _EarnedBadge() when $default != null:
        return $default(
            _that.id, _that.badge, _that.earnedAt, _that.earnedForActivity);
      case _:
        return null;
    }
  }
}

/// @nodoc
@JsonSerializable()
class _EarnedBadge implements EarnedBadge {
  const _EarnedBadge(
      {required this.id,
      required this.badge,
      required this.earnedAt,
      this.earnedForActivity});
  factory _EarnedBadge.fromJson(Map<String, dynamic> json) =>
      _$EarnedBadgeFromJson(json);

  @override
  final String id;
  @override
  final GamificationBadge badge;
  @override
  final String earnedAt;
  @override
  final String? earnedForActivity;

  /// Create a copy of EarnedBadge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$EarnedBadgeCopyWith<_EarnedBadge> get copyWith =>
      __$EarnedBadgeCopyWithImpl<_EarnedBadge>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$EarnedBadgeToJson(
      this,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _EarnedBadge &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.badge, badge) || other.badge == badge) &&
            (identical(other.earnedAt, earnedAt) ||
                other.earnedAt == earnedAt) &&
            (identical(other.earnedForActivity, earnedForActivity) ||
                other.earnedForActivity == earnedForActivity));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, id, badge, earnedAt, earnedForActivity);

  @override
  String toString() {
    return 'EarnedBadge(id: $id, badge: $badge, earnedAt: $earnedAt, earnedForActivity: $earnedForActivity)';
  }
}

/// @nodoc
abstract mixin class _$EarnedBadgeCopyWith<$Res>
    implements $EarnedBadgeCopyWith<$Res> {
  factory _$EarnedBadgeCopyWith(
          _EarnedBadge value, $Res Function(_EarnedBadge) _then) =
      __$EarnedBadgeCopyWithImpl;
  @override
  @useResult
  $Res call(
      {String id,
      GamificationBadge badge,
      String earnedAt,
      String? earnedForActivity});

  @override
  $GamificationBadgeCopyWith<$Res> get badge;
}

/// @nodoc
class __$EarnedBadgeCopyWithImpl<$Res> implements _$EarnedBadgeCopyWith<$Res> {
  __$EarnedBadgeCopyWithImpl(this._self, this._then);

  final _EarnedBadge _self;
  final $Res Function(_EarnedBadge) _then;

  /// Create a copy of EarnedBadge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $Res call({
    Object? id = null,
    Object? badge = null,
    Object? earnedAt = null,
    Object? earnedForActivity = freezed,
  }) {
    return _then(_EarnedBadge(
      id: null == id
          ? _self.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      badge: null == badge
          ? _self.badge
          : badge // ignore: cast_nullable_to_non_nullable
              as GamificationBadge,
      earnedAt: null == earnedAt
          ? _self.earnedAt
          : earnedAt // ignore: cast_nullable_to_non_nullable
              as String,
      earnedForActivity: freezed == earnedForActivity
          ? _self.earnedForActivity
          : earnedForActivity // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }

  /// Create a copy of EarnedBadge
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $GamificationBadgeCopyWith<$Res> get badge {
    return $GamificationBadgeCopyWith<$Res>(_self.badge, (value) {
      return _then(_self.copyWith(badge: value));
    });
  }
}

/// @nodoc
mixin _$GamificationProfile {
  String get learnerId;
  int get totalPoints;
  int get level;
  int get pointsToNextLevel;
  int get streakDays;
  int get longestStreak;
  List<EarnedBadge> get recentBadges;
  int get totalBadges;

  /// Create a copy of GamificationProfile
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $GamificationProfileCopyWith<GamificationProfile> get copyWith =>
      _$GamificationProfileCopyWithImpl<GamificationProfile>(
          this as GamificationProfile, _$identity);

  /// Serializes this GamificationProfile to a JSON map.
  Map<String, dynamic> toJson();

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is GamificationProfile &&
            (identical(other.learnerId, learnerId) ||
                other.learnerId == learnerId) &&
            (identical(other.totalPoints, totalPoints) ||
                other.totalPoints == totalPoints) &&
            (identical(other.level, level) || other.level == level) &&
            (identical(other.pointsToNextLevel, pointsToNextLevel) ||
                other.pointsToNextLevel == pointsToNextLevel) &&
            (identical(other.streakDays, streakDays) ||
                other.streakDays == streakDays) &&
            (identical(other.longestStreak, longestStreak) ||
                other.longestStreak == longestStreak) &&
            const DeepCollectionEquality()
                .equals(other.recentBadges, recentBadges) &&
            (identical(other.totalBadges, totalBadges) ||
                other.totalBadges == totalBadges));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      learnerId,
      totalPoints,
      level,
      pointsToNextLevel,
      streakDays,
      longestStreak,
      const DeepCollectionEquality().hash(recentBadges),
      totalBadges);

  @override
  String toString() {
    return 'GamificationProfile(learnerId: $learnerId, totalPoints: $totalPoints, level: $level, pointsToNextLevel: $pointsToNextLevel, streakDays: $streakDays, longestStreak: $longestStreak, recentBadges: $recentBadges, totalBadges: $totalBadges)';
  }
}

/// @nodoc
abstract mixin class $GamificationProfileCopyWith<$Res> {
  factory $GamificationProfileCopyWith(
          GamificationProfile value, $Res Function(GamificationProfile) _then) =
      _$GamificationProfileCopyWithImpl;
  @useResult
  $Res call(
      {String learnerId,
      int totalPoints,
      int level,
      int pointsToNextLevel,
      int streakDays,
      int longestStreak,
      List<EarnedBadge> recentBadges,
      int totalBadges});
}

/// @nodoc
class _$GamificationProfileCopyWithImpl<$Res>
    implements $GamificationProfileCopyWith<$Res> {
  _$GamificationProfileCopyWithImpl(this._self, this._then);

  final GamificationProfile _self;
  final $Res Function(GamificationProfile) _then;

  /// Create a copy of GamificationProfile
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? learnerId = null,
    Object? totalPoints = null,
    Object? level = null,
    Object? pointsToNextLevel = null,
    Object? streakDays = null,
    Object? longestStreak = null,
    Object? recentBadges = null,
    Object? totalBadges = null,
  }) {
    return _then(_self.copyWith(
      learnerId: null == learnerId
          ? _self.learnerId
          : learnerId // ignore: cast_nullable_to_non_nullable
              as String,
      totalPoints: null == totalPoints
          ? _self.totalPoints
          : totalPoints // ignore: cast_nullable_to_non_nullable
              as int,
      level: null == level
          ? _self.level
          : level // ignore: cast_nullable_to_non_nullable
              as int,
      pointsToNextLevel: null == pointsToNextLevel
          ? _self.pointsToNextLevel
          : pointsToNextLevel // ignore: cast_nullable_to_non_nullable
              as int,
      streakDays: null == streakDays
          ? _self.streakDays
          : streakDays // ignore: cast_nullable_to_non_nullable
              as int,
      longestStreak: null == longestStreak
          ? _self.longestStreak
          : longestStreak // ignore: cast_nullable_to_non_nullable
              as int,
      recentBadges: null == recentBadges
          ? _self.recentBadges
          : recentBadges // ignore: cast_nullable_to_non_nullable
              as List<EarnedBadge>,
      totalBadges: null == totalBadges
          ? _self.totalBadges
          : totalBadges // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// Adds pattern-matching-related methods to [GamificationProfile].
extension GamificationProfilePatterns on GamificationProfile {
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
    TResult Function(_GamificationProfile value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _GamificationProfile() when $default != null:
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
    TResult Function(_GamificationProfile value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _GamificationProfile():
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
    TResult? Function(_GamificationProfile value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _GamificationProfile() when $default != null:
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
            String learnerId,
            int totalPoints,
            int level,
            int pointsToNextLevel,
            int streakDays,
            int longestStreak,
            List<EarnedBadge> recentBadges,
            int totalBadges)?
        $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _GamificationProfile() when $default != null:
        return $default(
            _that.learnerId,
            _that.totalPoints,
            _that.level,
            _that.pointsToNextLevel,
            _that.streakDays,
            _that.longestStreak,
            _that.recentBadges,
            _that.totalBadges);
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
            String learnerId,
            int totalPoints,
            int level,
            int pointsToNextLevel,
            int streakDays,
            int longestStreak,
            List<EarnedBadge> recentBadges,
            int totalBadges)
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _GamificationProfile():
        return $default(
            _that.learnerId,
            _that.totalPoints,
            _that.level,
            _that.pointsToNextLevel,
            _that.streakDays,
            _that.longestStreak,
            _that.recentBadges,
            _that.totalBadges);
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
            String learnerId,
            int totalPoints,
            int level,
            int pointsToNextLevel,
            int streakDays,
            int longestStreak,
            List<EarnedBadge> recentBadges,
            int totalBadges)?
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _GamificationProfile() when $default != null:
        return $default(
            _that.learnerId,
            _that.totalPoints,
            _that.level,
            _that.pointsToNextLevel,
            _that.streakDays,
            _that.longestStreak,
            _that.recentBadges,
            _that.totalBadges);
      case _:
        return null;
    }
  }
}

/// @nodoc
@JsonSerializable()
class _GamificationProfile implements GamificationProfile {
  const _GamificationProfile(
      {required this.learnerId,
      this.totalPoints = 0,
      this.level = 1,
      this.pointsToNextLevel = 100,
      this.streakDays = 0,
      this.longestStreak = 0,
      final List<EarnedBadge> recentBadges = const [],
      this.totalBadges = 0})
      : _recentBadges = recentBadges;
  factory _GamificationProfile.fromJson(Map<String, dynamic> json) =>
      _$GamificationProfileFromJson(json);

  @override
  final String learnerId;
  @override
  @JsonKey()
  final int totalPoints;
  @override
  @JsonKey()
  final int level;
  @override
  @JsonKey()
  final int pointsToNextLevel;
  @override
  @JsonKey()
  final int streakDays;
  @override
  @JsonKey()
  final int longestStreak;
  final List<EarnedBadge> _recentBadges;
  @override
  @JsonKey()
  List<EarnedBadge> get recentBadges {
    if (_recentBadges is EqualUnmodifiableListView) return _recentBadges;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_recentBadges);
  }

  @override
  @JsonKey()
  final int totalBadges;

  /// Create a copy of GamificationProfile
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$GamificationProfileCopyWith<_GamificationProfile> get copyWith =>
      __$GamificationProfileCopyWithImpl<_GamificationProfile>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$GamificationProfileToJson(
      this,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _GamificationProfile &&
            (identical(other.learnerId, learnerId) ||
                other.learnerId == learnerId) &&
            (identical(other.totalPoints, totalPoints) ||
                other.totalPoints == totalPoints) &&
            (identical(other.level, level) || other.level == level) &&
            (identical(other.pointsToNextLevel, pointsToNextLevel) ||
                other.pointsToNextLevel == pointsToNextLevel) &&
            (identical(other.streakDays, streakDays) ||
                other.streakDays == streakDays) &&
            (identical(other.longestStreak, longestStreak) ||
                other.longestStreak == longestStreak) &&
            const DeepCollectionEquality()
                .equals(other._recentBadges, _recentBadges) &&
            (identical(other.totalBadges, totalBadges) ||
                other.totalBadges == totalBadges));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      learnerId,
      totalPoints,
      level,
      pointsToNextLevel,
      streakDays,
      longestStreak,
      const DeepCollectionEquality().hash(_recentBadges),
      totalBadges);

  @override
  String toString() {
    return 'GamificationProfile(learnerId: $learnerId, totalPoints: $totalPoints, level: $level, pointsToNextLevel: $pointsToNextLevel, streakDays: $streakDays, longestStreak: $longestStreak, recentBadges: $recentBadges, totalBadges: $totalBadges)';
  }
}

/// @nodoc
abstract mixin class _$GamificationProfileCopyWith<$Res>
    implements $GamificationProfileCopyWith<$Res> {
  factory _$GamificationProfileCopyWith(_GamificationProfile value,
          $Res Function(_GamificationProfile) _then) =
      __$GamificationProfileCopyWithImpl;
  @override
  @useResult
  $Res call(
      {String learnerId,
      int totalPoints,
      int level,
      int pointsToNextLevel,
      int streakDays,
      int longestStreak,
      List<EarnedBadge> recentBadges,
      int totalBadges});
}

/// @nodoc
class __$GamificationProfileCopyWithImpl<$Res>
    implements _$GamificationProfileCopyWith<$Res> {
  __$GamificationProfileCopyWithImpl(this._self, this._then);

  final _GamificationProfile _self;
  final $Res Function(_GamificationProfile) _then;

  /// Create a copy of GamificationProfile
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $Res call({
    Object? learnerId = null,
    Object? totalPoints = null,
    Object? level = null,
    Object? pointsToNextLevel = null,
    Object? streakDays = null,
    Object? longestStreak = null,
    Object? recentBadges = null,
    Object? totalBadges = null,
  }) {
    return _then(_GamificationProfile(
      learnerId: null == learnerId
          ? _self.learnerId
          : learnerId // ignore: cast_nullable_to_non_nullable
              as String,
      totalPoints: null == totalPoints
          ? _self.totalPoints
          : totalPoints // ignore: cast_nullable_to_non_nullable
              as int,
      level: null == level
          ? _self.level
          : level // ignore: cast_nullable_to_non_nullable
              as int,
      pointsToNextLevel: null == pointsToNextLevel
          ? _self.pointsToNextLevel
          : pointsToNextLevel // ignore: cast_nullable_to_non_nullable
              as int,
      streakDays: null == streakDays
          ? _self.streakDays
          : streakDays // ignore: cast_nullable_to_non_nullable
              as int,
      longestStreak: null == longestStreak
          ? _self.longestStreak
          : longestStreak // ignore: cast_nullable_to_non_nullable
              as int,
      recentBadges: null == recentBadges
          ? _self._recentBadges
          : recentBadges // ignore: cast_nullable_to_non_nullable
              as List<EarnedBadge>,
      totalBadges: null == totalBadges
          ? _self.totalBadges
          : totalBadges // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
mixin _$GamificationBadgeProgress {
  String get badgeId;
  int get progress;
  int get target;
  double get percentComplete;
  bool get earned;

  /// Create a copy of GamificationBadgeProgress
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  $GamificationBadgeProgressCopyWith<GamificationBadgeProgress> get copyWith =>
      _$GamificationBadgeProgressCopyWithImpl<GamificationBadgeProgress>(
          this as GamificationBadgeProgress, _$identity);

  /// Serializes this GamificationBadgeProgress to a JSON map.
  Map<String, dynamic> toJson();

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is GamificationBadgeProgress &&
            (identical(other.badgeId, badgeId) || other.badgeId == badgeId) &&
            (identical(other.progress, progress) ||
                other.progress == progress) &&
            (identical(other.target, target) || other.target == target) &&
            (identical(other.percentComplete, percentComplete) ||
                other.percentComplete == percentComplete) &&
            (identical(other.earned, earned) || other.earned == earned));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, badgeId, progress, target, percentComplete, earned);

  @override
  String toString() {
    return 'GamificationBadgeProgress(badgeId: $badgeId, progress: $progress, target: $target, percentComplete: $percentComplete, earned: $earned)';
  }
}

/// @nodoc
abstract mixin class $GamificationBadgeProgressCopyWith<$Res> {
  factory $GamificationBadgeProgressCopyWith(GamificationBadgeProgress value,
          $Res Function(GamificationBadgeProgress) _then) =
      _$GamificationBadgeProgressCopyWithImpl;
  @useResult
  $Res call(
      {String badgeId,
      int progress,
      int target,
      double percentComplete,
      bool earned});
}

/// @nodoc
class _$GamificationBadgeProgressCopyWithImpl<$Res>
    implements $GamificationBadgeProgressCopyWith<$Res> {
  _$GamificationBadgeProgressCopyWithImpl(this._self, this._then);

  final GamificationBadgeProgress _self;
  final $Res Function(GamificationBadgeProgress) _then;

  /// Create a copy of GamificationBadgeProgress
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? badgeId = null,
    Object? progress = null,
    Object? target = null,
    Object? percentComplete = null,
    Object? earned = null,
  }) {
    return _then(_self.copyWith(
      badgeId: null == badgeId
          ? _self.badgeId
          : badgeId // ignore: cast_nullable_to_non_nullable
              as String,
      progress: null == progress
          ? _self.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as int,
      target: null == target
          ? _self.target
          : target // ignore: cast_nullable_to_non_nullable
              as int,
      percentComplete: null == percentComplete
          ? _self.percentComplete
          : percentComplete // ignore: cast_nullable_to_non_nullable
              as double,
      earned: null == earned
          ? _self.earned
          : earned // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// Adds pattern-matching-related methods to [GamificationBadgeProgress].
extension GamificationBadgeProgressPatterns on GamificationBadgeProgress {
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
    TResult Function(_GamificationBadgeProgress value)? $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _GamificationBadgeProgress() when $default != null:
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
    TResult Function(_GamificationBadgeProgress value) $default,
  ) {
    final _that = this;
    switch (_that) {
      case _GamificationBadgeProgress():
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
    TResult? Function(_GamificationBadgeProgress value)? $default,
  ) {
    final _that = this;
    switch (_that) {
      case _GamificationBadgeProgress() when $default != null:
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
    TResult Function(String badgeId, int progress, int target,
            double percentComplete, bool earned)?
        $default, {
    required TResult orElse(),
  }) {
    final _that = this;
    switch (_that) {
      case _GamificationBadgeProgress() when $default != null:
        return $default(_that.badgeId, _that.progress, _that.target,
            _that.percentComplete, _that.earned);
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
    TResult Function(String badgeId, int progress, int target,
            double percentComplete, bool earned)
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _GamificationBadgeProgress():
        return $default(_that.badgeId, _that.progress, _that.target,
            _that.percentComplete, _that.earned);
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
    TResult? Function(String badgeId, int progress, int target,
            double percentComplete, bool earned)?
        $default,
  ) {
    final _that = this;
    switch (_that) {
      case _GamificationBadgeProgress() when $default != null:
        return $default(_that.badgeId, _that.progress, _that.target,
            _that.percentComplete, _that.earned);
      case _:
        return null;
    }
  }
}

/// @nodoc
@JsonSerializable()
class _GamificationBadgeProgress implements GamificationBadgeProgress {
  const _GamificationBadgeProgress(
      {required this.badgeId,
      this.progress = 0,
      this.target = 1,
      this.percentComplete = 0,
      this.earned = false});
  factory _GamificationBadgeProgress.fromJson(Map<String, dynamic> json) =>
      _$GamificationBadgeProgressFromJson(json);

  @override
  final String badgeId;
  @override
  @JsonKey()
  final int progress;
  @override
  @JsonKey()
  final int target;
  @override
  @JsonKey()
  final double percentComplete;
  @override
  @JsonKey()
  final bool earned;

  /// Create a copy of GamificationBadgeProgress
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  @pragma('vm:prefer-inline')
  _$GamificationBadgeProgressCopyWith<_GamificationBadgeProgress>
      get copyWith =>
          __$GamificationBadgeProgressCopyWithImpl<_GamificationBadgeProgress>(
              this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$GamificationBadgeProgressToJson(
      this,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _GamificationBadgeProgress &&
            (identical(other.badgeId, badgeId) || other.badgeId == badgeId) &&
            (identical(other.progress, progress) ||
                other.progress == progress) &&
            (identical(other.target, target) || other.target == target) &&
            (identical(other.percentComplete, percentComplete) ||
                other.percentComplete == percentComplete) &&
            (identical(other.earned, earned) || other.earned == earned));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, badgeId, progress, target, percentComplete, earned);

  @override
  String toString() {
    return 'GamificationBadgeProgress(badgeId: $badgeId, progress: $progress, target: $target, percentComplete: $percentComplete, earned: $earned)';
  }
}

/// @nodoc
abstract mixin class _$GamificationBadgeProgressCopyWith<$Res>
    implements $GamificationBadgeProgressCopyWith<$Res> {
  factory _$GamificationBadgeProgressCopyWith(_GamificationBadgeProgress value,
          $Res Function(_GamificationBadgeProgress) _then) =
      __$GamificationBadgeProgressCopyWithImpl;
  @override
  @useResult
  $Res call(
      {String badgeId,
      int progress,
      int target,
      double percentComplete,
      bool earned});
}

/// @nodoc
class __$GamificationBadgeProgressCopyWithImpl<$Res>
    implements _$GamificationBadgeProgressCopyWith<$Res> {
  __$GamificationBadgeProgressCopyWithImpl(this._self, this._then);

  final _GamificationBadgeProgress _self;
  final $Res Function(_GamificationBadgeProgress) _then;

  /// Create a copy of GamificationBadgeProgress
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $Res call({
    Object? badgeId = null,
    Object? progress = null,
    Object? target = null,
    Object? percentComplete = null,
    Object? earned = null,
  }) {
    return _then(_GamificationBadgeProgress(
      badgeId: null == badgeId
          ? _self.badgeId
          : badgeId // ignore: cast_nullable_to_non_nullable
              as String,
      progress: null == progress
          ? _self.progress
          : progress // ignore: cast_nullable_to_non_nullable
              as int,
      target: null == target
          ? _self.target
          : target // ignore: cast_nullable_to_non_nullable
              as int,
      percentComplete: null == percentComplete
          ? _self.percentComplete
          : percentComplete // ignore: cast_nullable_to_non_nullable
              as double,
      earned: null == earned
          ? _self.earned
          : earned // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

// dart format on
