// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'settings_api.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$parentSettingsHash() => r'12d19cc951d8f0454e4435789ea9aebebdb255d8';

/// Get parent settings (profile, app settings, notifications)
///
/// Copied from [parentSettings].
@ProviderFor(parentSettings)
final parentSettingsProvider =
    AutoDisposeFutureProvider<ParentSettings>.internal(
  parentSettings,
  name: r'parentSettingsProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$parentSettingsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef ParentSettingsRef = AutoDisposeFutureProviderRef<ParentSettings>;
String _$updateParentProfileHash() =>
    r'28012127aaac1224847e330c82e4d430db3f7466';

/// Copied from Dart SDK
class _SystemHash {
  _SystemHash._();

  static int combine(int hash, int value) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + value);
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
    return hash ^ (hash >> 6);
  }

  static int finish(int hash) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
    // ignore: parameter_assignments
    hash = hash ^ (hash >> 11);
    return 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
  }
}

/// Update parent profile
///
/// Copied from [updateParentProfile].
@ProviderFor(updateParentProfile)
const updateParentProfileProvider = UpdateParentProfileFamily();

/// Update parent profile
///
/// Copied from [updateParentProfile].
class UpdateParentProfileFamily
    extends Family<AsyncValue<ParentProfileSettings>> {
  /// Update parent profile
  ///
  /// Copied from [updateParentProfile].
  const UpdateParentProfileFamily();

  /// Update parent profile
  ///
  /// Copied from [updateParentProfile].
  UpdateParentProfileProvider call({
    required Map<String, dynamic> profile,
  }) {
    return UpdateParentProfileProvider(
      profile: profile,
    );
  }

  @override
  UpdateParentProfileProvider getProviderOverride(
    covariant UpdateParentProfileProvider provider,
  ) {
    return call(
      profile: provider.profile,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'updateParentProfileProvider';
}

/// Update parent profile
///
/// Copied from [updateParentProfile].
class UpdateParentProfileProvider
    extends AutoDisposeFutureProvider<ParentProfileSettings> {
  /// Update parent profile
  ///
  /// Copied from [updateParentProfile].
  UpdateParentProfileProvider({
    required Map<String, dynamic> profile,
  }) : this._internal(
          (ref) => updateParentProfile(
            ref as UpdateParentProfileRef,
            profile: profile,
          ),
          from: updateParentProfileProvider,
          name: r'updateParentProfileProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$updateParentProfileHash,
          dependencies: UpdateParentProfileFamily._dependencies,
          allTransitiveDependencies:
              UpdateParentProfileFamily._allTransitiveDependencies,
          profile: profile,
        );

  UpdateParentProfileProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.profile,
  }) : super.internal();

  final Map<String, dynamic> profile;

  @override
  Override overrideWith(
    FutureOr<ParentProfileSettings> Function(UpdateParentProfileRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UpdateParentProfileProvider._internal(
        (ref) => create(ref as UpdateParentProfileRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        profile: profile,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<ParentProfileSettings> createElement() {
    return _UpdateParentProfileProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UpdateParentProfileProvider && other.profile == profile;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, profile.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin UpdateParentProfileRef
    on AutoDisposeFutureProviderRef<ParentProfileSettings> {
  /// The parameter `profile` of this provider.
  Map<String, dynamic> get profile;
}

class _UpdateParentProfileProviderElement
    extends AutoDisposeFutureProviderElement<ParentProfileSettings>
    with UpdateParentProfileRef {
  _UpdateParentProfileProviderElement(super.provider);

  @override
  Map<String, dynamic> get profile =>
      (origin as UpdateParentProfileProvider).profile;
}

String _$updateAppSettingsHash() => r'4f4acb7ce64c0245b234653a1431bda1baedc2d9';

/// Update app settings
///
/// Copied from [updateAppSettings].
@ProviderFor(updateAppSettings)
const updateAppSettingsProvider = UpdateAppSettingsFamily();

/// Update app settings
///
/// Copied from [updateAppSettings].
class UpdateAppSettingsFamily extends Family<AsyncValue<AppSettings>> {
  /// Update app settings
  ///
  /// Copied from [updateAppSettings].
  const UpdateAppSettingsFamily();

  /// Update app settings
  ///
  /// Copied from [updateAppSettings].
  UpdateAppSettingsProvider call({
    required Map<String, dynamic> settings,
  }) {
    return UpdateAppSettingsProvider(
      settings: settings,
    );
  }

  @override
  UpdateAppSettingsProvider getProviderOverride(
    covariant UpdateAppSettingsProvider provider,
  ) {
    return call(
      settings: provider.settings,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'updateAppSettingsProvider';
}

/// Update app settings
///
/// Copied from [updateAppSettings].
class UpdateAppSettingsProvider extends AutoDisposeFutureProvider<AppSettings> {
  /// Update app settings
  ///
  /// Copied from [updateAppSettings].
  UpdateAppSettingsProvider({
    required Map<String, dynamic> settings,
  }) : this._internal(
          (ref) => updateAppSettings(
            ref as UpdateAppSettingsRef,
            settings: settings,
          ),
          from: updateAppSettingsProvider,
          name: r'updateAppSettingsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$updateAppSettingsHash,
          dependencies: UpdateAppSettingsFamily._dependencies,
          allTransitiveDependencies:
              UpdateAppSettingsFamily._allTransitiveDependencies,
          settings: settings,
        );

  UpdateAppSettingsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.settings,
  }) : super.internal();

  final Map<String, dynamic> settings;

  @override
  Override overrideWith(
    FutureOr<AppSettings> Function(UpdateAppSettingsRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UpdateAppSettingsProvider._internal(
        (ref) => create(ref as UpdateAppSettingsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        settings: settings,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<AppSettings> createElement() {
    return _UpdateAppSettingsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UpdateAppSettingsProvider && other.settings == settings;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, settings.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin UpdateAppSettingsRef on AutoDisposeFutureProviderRef<AppSettings> {
  /// The parameter `settings` of this provider.
  Map<String, dynamic> get settings;
}

class _UpdateAppSettingsProviderElement
    extends AutoDisposeFutureProviderElement<AppSettings>
    with UpdateAppSettingsRef {
  _UpdateAppSettingsProviderElement(super.provider);

  @override
  Map<String, dynamic> get settings =>
      (origin as UpdateAppSettingsProvider).settings;
}

String _$updateNotificationSettingsHash() =>
    r'2a06100c300c8fa871dfe9be39e567b140930848';

/// Update notification settings
///
/// Copied from [updateNotificationSettings].
@ProviderFor(updateNotificationSettings)
const updateNotificationSettingsProvider = UpdateNotificationSettingsFamily();

/// Update notification settings
///
/// Copied from [updateNotificationSettings].
class UpdateNotificationSettingsFamily
    extends Family<AsyncValue<NotificationSettings>> {
  /// Update notification settings
  ///
  /// Copied from [updateNotificationSettings].
  const UpdateNotificationSettingsFamily();

  /// Update notification settings
  ///
  /// Copied from [updateNotificationSettings].
  UpdateNotificationSettingsProvider call({
    required Map<String, dynamic> settings,
  }) {
    return UpdateNotificationSettingsProvider(
      settings: settings,
    );
  }

  @override
  UpdateNotificationSettingsProvider getProviderOverride(
    covariant UpdateNotificationSettingsProvider provider,
  ) {
    return call(
      settings: provider.settings,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'updateNotificationSettingsProvider';
}

/// Update notification settings
///
/// Copied from [updateNotificationSettings].
class UpdateNotificationSettingsProvider
    extends AutoDisposeFutureProvider<NotificationSettings> {
  /// Update notification settings
  ///
  /// Copied from [updateNotificationSettings].
  UpdateNotificationSettingsProvider({
    required Map<String, dynamic> settings,
  }) : this._internal(
          (ref) => updateNotificationSettings(
            ref as UpdateNotificationSettingsRef,
            settings: settings,
          ),
          from: updateNotificationSettingsProvider,
          name: r'updateNotificationSettingsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$updateNotificationSettingsHash,
          dependencies: UpdateNotificationSettingsFamily._dependencies,
          allTransitiveDependencies:
              UpdateNotificationSettingsFamily._allTransitiveDependencies,
          settings: settings,
        );

  UpdateNotificationSettingsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.settings,
  }) : super.internal();

  final Map<String, dynamic> settings;

  @override
  Override overrideWith(
    FutureOr<NotificationSettings> Function(
            UpdateNotificationSettingsRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UpdateNotificationSettingsProvider._internal(
        (ref) => create(ref as UpdateNotificationSettingsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        settings: settings,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<NotificationSettings> createElement() {
    return _UpdateNotificationSettingsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UpdateNotificationSettingsProvider &&
        other.settings == settings;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, settings.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin UpdateNotificationSettingsRef
    on AutoDisposeFutureProviderRef<NotificationSettings> {
  /// The parameter `settings` of this provider.
  Map<String, dynamic> get settings;
}

class _UpdateNotificationSettingsProviderElement
    extends AutoDisposeFutureProviderElement<NotificationSettings>
    with UpdateNotificationSettingsRef {
  _UpdateNotificationSettingsProviderElement(super.provider);

  @override
  Map<String, dynamic> get settings =>
      (origin as UpdateNotificationSettingsProvider).settings;
}

String _$parentalControlsHash() => r'c3a5259c379916ae2792187a30fd9116b027ff8b';

/// Get parental controls for a specific child
///
/// Copied from [parentalControls].
@ProviderFor(parentalControls)
const parentalControlsProvider = ParentalControlsFamily();

/// Get parental controls for a specific child
///
/// Copied from [parentalControls].
class ParentalControlsFamily
    extends Family<AsyncValue<ParentalControlSettings>> {
  /// Get parental controls for a specific child
  ///
  /// Copied from [parentalControls].
  const ParentalControlsFamily();

  /// Get parental controls for a specific child
  ///
  /// Copied from [parentalControls].
  ParentalControlsProvider call({
    required String childId,
  }) {
    return ParentalControlsProvider(
      childId: childId,
    );
  }

  @override
  ParentalControlsProvider getProviderOverride(
    covariant ParentalControlsProvider provider,
  ) {
    return call(
      childId: provider.childId,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'parentalControlsProvider';
}

/// Get parental controls for a specific child
///
/// Copied from [parentalControls].
class ParentalControlsProvider
    extends AutoDisposeFutureProvider<ParentalControlSettings> {
  /// Get parental controls for a specific child
  ///
  /// Copied from [parentalControls].
  ParentalControlsProvider({
    required String childId,
  }) : this._internal(
          (ref) => parentalControls(
            ref as ParentalControlsRef,
            childId: childId,
          ),
          from: parentalControlsProvider,
          name: r'parentalControlsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$parentalControlsHash,
          dependencies: ParentalControlsFamily._dependencies,
          allTransitiveDependencies:
              ParentalControlsFamily._allTransitiveDependencies,
          childId: childId,
        );

  ParentalControlsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
  }) : super.internal();

  final String childId;

  @override
  Override overrideWith(
    FutureOr<ParentalControlSettings> Function(ParentalControlsRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ParentalControlsProvider._internal(
        (ref) => create(ref as ParentalControlsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<ParentalControlSettings> createElement() {
    return _ParentalControlsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ParentalControlsProvider && other.childId == childId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin ParentalControlsRef
    on AutoDisposeFutureProviderRef<ParentalControlSettings> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _ParentalControlsProviderElement
    extends AutoDisposeFutureProviderElement<ParentalControlSettings>
    with ParentalControlsRef {
  _ParentalControlsProviderElement(super.provider);

  @override
  String get childId => (origin as ParentalControlsProvider).childId;
}

String _$updateScreenTimeHash() => r'0090ba96204b1694042571e6597d11921c920f2b';

/// Update screen time settings for a child
///
/// Copied from [updateScreenTime].
@ProviderFor(updateScreenTime)
const updateScreenTimeProvider = UpdateScreenTimeFamily();

/// Update screen time settings for a child
///
/// Copied from [updateScreenTime].
class UpdateScreenTimeFamily extends Family<AsyncValue<ScreenTimeSettings>> {
  /// Update screen time settings for a child
  ///
  /// Copied from [updateScreenTime].
  const UpdateScreenTimeFamily();

  /// Update screen time settings for a child
  ///
  /// Copied from [updateScreenTime].
  UpdateScreenTimeProvider call({
    required String childId,
    required Map<String, dynamic> settings,
    String? pinToken,
  }) {
    return UpdateScreenTimeProvider(
      childId: childId,
      settings: settings,
      pinToken: pinToken,
    );
  }

  @override
  UpdateScreenTimeProvider getProviderOverride(
    covariant UpdateScreenTimeProvider provider,
  ) {
    return call(
      childId: provider.childId,
      settings: provider.settings,
      pinToken: provider.pinToken,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'updateScreenTimeProvider';
}

/// Update screen time settings for a child
///
/// Copied from [updateScreenTime].
class UpdateScreenTimeProvider
    extends AutoDisposeFutureProvider<ScreenTimeSettings> {
  /// Update screen time settings for a child
  ///
  /// Copied from [updateScreenTime].
  UpdateScreenTimeProvider({
    required String childId,
    required Map<String, dynamic> settings,
    String? pinToken,
  }) : this._internal(
          (ref) => updateScreenTime(
            ref as UpdateScreenTimeRef,
            childId: childId,
            settings: settings,
            pinToken: pinToken,
          ),
          from: updateScreenTimeProvider,
          name: r'updateScreenTimeProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$updateScreenTimeHash,
          dependencies: UpdateScreenTimeFamily._dependencies,
          allTransitiveDependencies:
              UpdateScreenTimeFamily._allTransitiveDependencies,
          childId: childId,
          settings: settings,
          pinToken: pinToken,
        );

  UpdateScreenTimeProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
    required this.settings,
    required this.pinToken,
  }) : super.internal();

  final String childId;
  final Map<String, dynamic> settings;
  final String? pinToken;

  @override
  Override overrideWith(
    FutureOr<ScreenTimeSettings> Function(UpdateScreenTimeRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UpdateScreenTimeProvider._internal(
        (ref) => create(ref as UpdateScreenTimeRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
        settings: settings,
        pinToken: pinToken,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<ScreenTimeSettings> createElement() {
    return _UpdateScreenTimeProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UpdateScreenTimeProvider &&
        other.childId == childId &&
        other.settings == settings &&
        other.pinToken == pinToken;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);
    hash = _SystemHash.combine(hash, settings.hashCode);
    hash = _SystemHash.combine(hash, pinToken.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin UpdateScreenTimeRef on AutoDisposeFutureProviderRef<ScreenTimeSettings> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `settings` of this provider.
  Map<String, dynamic> get settings;

  /// The parameter `pinToken` of this provider.
  String? get pinToken;
}

class _UpdateScreenTimeProviderElement
    extends AutoDisposeFutureProviderElement<ScreenTimeSettings>
    with UpdateScreenTimeRef {
  _UpdateScreenTimeProviderElement(super.provider);

  @override
  String get childId => (origin as UpdateScreenTimeProvider).childId;
  @override
  Map<String, dynamic> get settings =>
      (origin as UpdateScreenTimeProvider).settings;
  @override
  String? get pinToken => (origin as UpdateScreenTimeProvider).pinToken;
}

String _$updateContentFilterHash() =>
    r'b15730c4fb53b6fb82a618e72b5d0b0efcab6efc';

/// Update content filter settings for a child
///
/// Copied from [updateContentFilter].
@ProviderFor(updateContentFilter)
const updateContentFilterProvider = UpdateContentFilterFamily();

/// Update content filter settings for a child
///
/// Copied from [updateContentFilter].
class UpdateContentFilterFamily
    extends Family<AsyncValue<ContentFilterSettings>> {
  /// Update content filter settings for a child
  ///
  /// Copied from [updateContentFilter].
  const UpdateContentFilterFamily();

  /// Update content filter settings for a child
  ///
  /// Copied from [updateContentFilter].
  UpdateContentFilterProvider call({
    required String childId,
    required Map<String, dynamic> settings,
    String? pinToken,
  }) {
    return UpdateContentFilterProvider(
      childId: childId,
      settings: settings,
      pinToken: pinToken,
    );
  }

  @override
  UpdateContentFilterProvider getProviderOverride(
    covariant UpdateContentFilterProvider provider,
  ) {
    return call(
      childId: provider.childId,
      settings: provider.settings,
      pinToken: provider.pinToken,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'updateContentFilterProvider';
}

/// Update content filter settings for a child
///
/// Copied from [updateContentFilter].
class UpdateContentFilterProvider
    extends AutoDisposeFutureProvider<ContentFilterSettings> {
  /// Update content filter settings for a child
  ///
  /// Copied from [updateContentFilter].
  UpdateContentFilterProvider({
    required String childId,
    required Map<String, dynamic> settings,
    String? pinToken,
  }) : this._internal(
          (ref) => updateContentFilter(
            ref as UpdateContentFilterRef,
            childId: childId,
            settings: settings,
            pinToken: pinToken,
          ),
          from: updateContentFilterProvider,
          name: r'updateContentFilterProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$updateContentFilterHash,
          dependencies: UpdateContentFilterFamily._dependencies,
          allTransitiveDependencies:
              UpdateContentFilterFamily._allTransitiveDependencies,
          childId: childId,
          settings: settings,
          pinToken: pinToken,
        );

  UpdateContentFilterProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
    required this.settings,
    required this.pinToken,
  }) : super.internal();

  final String childId;
  final Map<String, dynamic> settings;
  final String? pinToken;

  @override
  Override overrideWith(
    FutureOr<ContentFilterSettings> Function(UpdateContentFilterRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UpdateContentFilterProvider._internal(
        (ref) => create(ref as UpdateContentFilterRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
        settings: settings,
        pinToken: pinToken,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<ContentFilterSettings> createElement() {
    return _UpdateContentFilterProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UpdateContentFilterProvider &&
        other.childId == childId &&
        other.settings == settings &&
        other.pinToken == pinToken;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);
    hash = _SystemHash.combine(hash, settings.hashCode);
    hash = _SystemHash.combine(hash, pinToken.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin UpdateContentFilterRef
    on AutoDisposeFutureProviderRef<ContentFilterSettings> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `settings` of this provider.
  Map<String, dynamic> get settings;

  /// The parameter `pinToken` of this provider.
  String? get pinToken;
}

class _UpdateContentFilterProviderElement
    extends AutoDisposeFutureProviderElement<ContentFilterSettings>
    with UpdateContentFilterRef {
  _UpdateContentFilterProviderElement(super.provider);

  @override
  String get childId => (origin as UpdateContentFilterProvider).childId;
  @override
  Map<String, dynamic> get settings =>
      (origin as UpdateContentFilterProvider).settings;
  @override
  String? get pinToken => (origin as UpdateContentFilterProvider).pinToken;
}

String _$updateSubjectAccessHash() =>
    r'988f420998f45bf8ba2620683515061c4197b18e';

/// Update subject access settings for a child
///
/// Copied from [updateSubjectAccess].
@ProviderFor(updateSubjectAccess)
const updateSubjectAccessProvider = UpdateSubjectAccessFamily();

/// Update subject access settings for a child
///
/// Copied from [updateSubjectAccess].
class UpdateSubjectAccessFamily
    extends Family<AsyncValue<SubjectAccessSettings>> {
  /// Update subject access settings for a child
  ///
  /// Copied from [updateSubjectAccess].
  const UpdateSubjectAccessFamily();

  /// Update subject access settings for a child
  ///
  /// Copied from [updateSubjectAccess].
  UpdateSubjectAccessProvider call({
    required String childId,
    required Map<String, dynamic> settings,
    String? pinToken,
  }) {
    return UpdateSubjectAccessProvider(
      childId: childId,
      settings: settings,
      pinToken: pinToken,
    );
  }

  @override
  UpdateSubjectAccessProvider getProviderOverride(
    covariant UpdateSubjectAccessProvider provider,
  ) {
    return call(
      childId: provider.childId,
      settings: provider.settings,
      pinToken: provider.pinToken,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'updateSubjectAccessProvider';
}

/// Update subject access settings for a child
///
/// Copied from [updateSubjectAccess].
class UpdateSubjectAccessProvider
    extends AutoDisposeFutureProvider<SubjectAccessSettings> {
  /// Update subject access settings for a child
  ///
  /// Copied from [updateSubjectAccess].
  UpdateSubjectAccessProvider({
    required String childId,
    required Map<String, dynamic> settings,
    String? pinToken,
  }) : this._internal(
          (ref) => updateSubjectAccess(
            ref as UpdateSubjectAccessRef,
            childId: childId,
            settings: settings,
            pinToken: pinToken,
          ),
          from: updateSubjectAccessProvider,
          name: r'updateSubjectAccessProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$updateSubjectAccessHash,
          dependencies: UpdateSubjectAccessFamily._dependencies,
          allTransitiveDependencies:
              UpdateSubjectAccessFamily._allTransitiveDependencies,
          childId: childId,
          settings: settings,
          pinToken: pinToken,
        );

  UpdateSubjectAccessProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
    required this.settings,
    required this.pinToken,
  }) : super.internal();

  final String childId;
  final Map<String, dynamic> settings;
  final String? pinToken;

  @override
  Override overrideWith(
    FutureOr<SubjectAccessSettings> Function(UpdateSubjectAccessRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UpdateSubjectAccessProvider._internal(
        (ref) => create(ref as UpdateSubjectAccessRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
        settings: settings,
        pinToken: pinToken,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<SubjectAccessSettings> createElement() {
    return _UpdateSubjectAccessProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UpdateSubjectAccessProvider &&
        other.childId == childId &&
        other.settings == settings &&
        other.pinToken == pinToken;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);
    hash = _SystemHash.combine(hash, settings.hashCode);
    hash = _SystemHash.combine(hash, pinToken.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin UpdateSubjectAccessRef
    on AutoDisposeFutureProviderRef<SubjectAccessSettings> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `settings` of this provider.
  Map<String, dynamic> get settings;

  /// The parameter `pinToken` of this provider.
  String? get pinToken;
}

class _UpdateSubjectAccessProviderElement
    extends AutoDisposeFutureProviderElement<SubjectAccessSettings>
    with UpdateSubjectAccessRef {
  _UpdateSubjectAccessProviderElement(super.provider);

  @override
  String get childId => (origin as UpdateSubjectAccessProvider).childId;
  @override
  Map<String, dynamic> get settings =>
      (origin as UpdateSubjectAccessProvider).settings;
  @override
  String? get pinToken => (origin as UpdateSubjectAccessProvider).pinToken;
}

String _$updateSafetyHash() => r'e3182b5c60824e4d5b99310d1223fe03882ad3ed';

/// Update safety settings for a child
///
/// Copied from [updateSafety].
@ProviderFor(updateSafety)
const updateSafetyProvider = UpdateSafetyFamily();

/// Update safety settings for a child
///
/// Copied from [updateSafety].
class UpdateSafetyFamily extends Family<AsyncValue<SafetySettings>> {
  /// Update safety settings for a child
  ///
  /// Copied from [updateSafety].
  const UpdateSafetyFamily();

  /// Update safety settings for a child
  ///
  /// Copied from [updateSafety].
  UpdateSafetyProvider call({
    required String childId,
    required Map<String, dynamic> settings,
    String? pinToken,
  }) {
    return UpdateSafetyProvider(
      childId: childId,
      settings: settings,
      pinToken: pinToken,
    );
  }

  @override
  UpdateSafetyProvider getProviderOverride(
    covariant UpdateSafetyProvider provider,
  ) {
    return call(
      childId: provider.childId,
      settings: provider.settings,
      pinToken: provider.pinToken,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'updateSafetyProvider';
}

/// Update safety settings for a child
///
/// Copied from [updateSafety].
class UpdateSafetyProvider extends AutoDisposeFutureProvider<SafetySettings> {
  /// Update safety settings for a child
  ///
  /// Copied from [updateSafety].
  UpdateSafetyProvider({
    required String childId,
    required Map<String, dynamic> settings,
    String? pinToken,
  }) : this._internal(
          (ref) => updateSafety(
            ref as UpdateSafetyRef,
            childId: childId,
            settings: settings,
            pinToken: pinToken,
          ),
          from: updateSafetyProvider,
          name: r'updateSafetyProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$updateSafetyHash,
          dependencies: UpdateSafetyFamily._dependencies,
          allTransitiveDependencies:
              UpdateSafetyFamily._allTransitiveDependencies,
          childId: childId,
          settings: settings,
          pinToken: pinToken,
        );

  UpdateSafetyProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
    required this.settings,
    required this.pinToken,
  }) : super.internal();

  final String childId;
  final Map<String, dynamic> settings;
  final String? pinToken;

  @override
  Override overrideWith(
    FutureOr<SafetySettings> Function(UpdateSafetyRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UpdateSafetyProvider._internal(
        (ref) => create(ref as UpdateSafetyRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
        settings: settings,
        pinToken: pinToken,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<SafetySettings> createElement() {
    return _UpdateSafetyProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UpdateSafetyProvider &&
        other.childId == childId &&
        other.settings == settings &&
        other.pinToken == pinToken;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);
    hash = _SystemHash.combine(hash, settings.hashCode);
    hash = _SystemHash.combine(hash, pinToken.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin UpdateSafetyRef on AutoDisposeFutureProviderRef<SafetySettings> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `settings` of this provider.
  Map<String, dynamic> get settings;

  /// The parameter `pinToken` of this provider.
  String? get pinToken;
}

class _UpdateSafetyProviderElement
    extends AutoDisposeFutureProviderElement<SafetySettings>
    with UpdateSafetyRef {
  _UpdateSafetyProviderElement(super.provider);

  @override
  String get childId => (origin as UpdateSafetyProvider).childId;
  @override
  Map<String, dynamic> get settings =>
      (origin as UpdateSafetyProvider).settings;
  @override
  String? get pinToken => (origin as UpdateSafetyProvider).pinToken;
}

String _$updateChildNotificationsHash() =>
    r'9bd7035fa6081b440e523eeb47698435efc30020';

/// Update child notification settings
///
/// Copied from [updateChildNotifications].
@ProviderFor(updateChildNotifications)
const updateChildNotificationsProvider = UpdateChildNotificationsFamily();

/// Update child notification settings
///
/// Copied from [updateChildNotifications].
class UpdateChildNotificationsFamily
    extends Family<AsyncValue<NotificationSettings>> {
  /// Update child notification settings
  ///
  /// Copied from [updateChildNotifications].
  const UpdateChildNotificationsFamily();

  /// Update child notification settings
  ///
  /// Copied from [updateChildNotifications].
  UpdateChildNotificationsProvider call({
    required String childId,
    required Map<String, dynamic> settings,
  }) {
    return UpdateChildNotificationsProvider(
      childId: childId,
      settings: settings,
    );
  }

  @override
  UpdateChildNotificationsProvider getProviderOverride(
    covariant UpdateChildNotificationsProvider provider,
  ) {
    return call(
      childId: provider.childId,
      settings: provider.settings,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'updateChildNotificationsProvider';
}

/// Update child notification settings
///
/// Copied from [updateChildNotifications].
class UpdateChildNotificationsProvider
    extends AutoDisposeFutureProvider<NotificationSettings> {
  /// Update child notification settings
  ///
  /// Copied from [updateChildNotifications].
  UpdateChildNotificationsProvider({
    required String childId,
    required Map<String, dynamic> settings,
  }) : this._internal(
          (ref) => updateChildNotifications(
            ref as UpdateChildNotificationsRef,
            childId: childId,
            settings: settings,
          ),
          from: updateChildNotificationsProvider,
          name: r'updateChildNotificationsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$updateChildNotificationsHash,
          dependencies: UpdateChildNotificationsFamily._dependencies,
          allTransitiveDependencies:
              UpdateChildNotificationsFamily._allTransitiveDependencies,
          childId: childId,
          settings: settings,
        );

  UpdateChildNotificationsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
    required this.settings,
  }) : super.internal();

  final String childId;
  final Map<String, dynamic> settings;

  @override
  Override overrideWith(
    FutureOr<NotificationSettings> Function(
            UpdateChildNotificationsRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UpdateChildNotificationsProvider._internal(
        (ref) => create(ref as UpdateChildNotificationsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
        settings: settings,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<NotificationSettings> createElement() {
    return _UpdateChildNotificationsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UpdateChildNotificationsProvider &&
        other.childId == childId &&
        other.settings == settings;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);
    hash = _SystemHash.combine(hash, settings.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin UpdateChildNotificationsRef
    on AutoDisposeFutureProviderRef<NotificationSettings> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `settings` of this provider.
  Map<String, dynamic> get settings;
}

class _UpdateChildNotificationsProviderElement
    extends AutoDisposeFutureProviderElement<NotificationSettings>
    with UpdateChildNotificationsRef {
  _UpdateChildNotificationsProviderElement(super.provider);

  @override
  String get childId => (origin as UpdateChildNotificationsProvider).childId;
  @override
  Map<String, dynamic> get settings =>
      (origin as UpdateChildNotificationsProvider).settings;
}

String _$pinStatusHash() => r'a11f88914442d76c79524b1d3664a0171a9b840c';

/// Check if PIN protection is enabled
///
/// Copied from [pinStatus].
@ProviderFor(pinStatus)
final pinStatusProvider = AutoDisposeFutureProvider<PinStatus>.internal(
  pinStatus,
  name: r'pinStatusProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$pinStatusHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef PinStatusRef = AutoDisposeFutureProviderRef<PinStatus>;
String _$verifyPinHash() => r'88e267805f4f809470498f74f432a0fed11f5dc2';

/// Verify PIN and get temporary token
///
/// Copied from [verifyPin].
@ProviderFor(verifyPin)
const verifyPinProvider = VerifyPinFamily();

/// Verify PIN and get temporary token
///
/// Copied from [verifyPin].
class VerifyPinFamily extends Family<AsyncValue<VerifyPinResponse>> {
  /// Verify PIN and get temporary token
  ///
  /// Copied from [verifyPin].
  const VerifyPinFamily();

  /// Verify PIN and get temporary token
  ///
  /// Copied from [verifyPin].
  VerifyPinProvider call({
    required String pin,
    required String action,
  }) {
    return VerifyPinProvider(
      pin: pin,
      action: action,
    );
  }

  @override
  VerifyPinProvider getProviderOverride(
    covariant VerifyPinProvider provider,
  ) {
    return call(
      pin: provider.pin,
      action: provider.action,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'verifyPinProvider';
}

/// Verify PIN and get temporary token
///
/// Copied from [verifyPin].
class VerifyPinProvider extends AutoDisposeFutureProvider<VerifyPinResponse> {
  /// Verify PIN and get temporary token
  ///
  /// Copied from [verifyPin].
  VerifyPinProvider({
    required String pin,
    required String action,
  }) : this._internal(
          (ref) => verifyPin(
            ref as VerifyPinRef,
            pin: pin,
            action: action,
          ),
          from: verifyPinProvider,
          name: r'verifyPinProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$verifyPinHash,
          dependencies: VerifyPinFamily._dependencies,
          allTransitiveDependencies: VerifyPinFamily._allTransitiveDependencies,
          pin: pin,
          action: action,
        );

  VerifyPinProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.pin,
    required this.action,
  }) : super.internal();

  final String pin;
  final String action;

  @override
  Override overrideWith(
    FutureOr<VerifyPinResponse> Function(VerifyPinRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: VerifyPinProvider._internal(
        (ref) => create(ref as VerifyPinRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        pin: pin,
        action: action,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<VerifyPinResponse> createElement() {
    return _VerifyPinProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is VerifyPinProvider &&
        other.pin == pin &&
        other.action == action;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, pin.hashCode);
    hash = _SystemHash.combine(hash, action.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin VerifyPinRef on AutoDisposeFutureProviderRef<VerifyPinResponse> {
  /// The parameter `pin` of this provider.
  String get pin;

  /// The parameter `action` of this provider.
  String get action;
}

class _VerifyPinProviderElement
    extends AutoDisposeFutureProviderElement<VerifyPinResponse>
    with VerifyPinRef {
  _VerifyPinProviderElement(super.provider);

  @override
  String get pin => (origin as VerifyPinProvider).pin;
  @override
  String get action => (origin as VerifyPinProvider).action;
}

String _$setPinHash() => r'182c72ce677e956d686e52b0c439abcd253a363e';

/// Set or update PIN
///
/// Copied from [setPin].
@ProviderFor(setPin)
const setPinProvider = SetPinFamily();

/// Set or update PIN
///
/// Copied from [setPin].
class SetPinFamily extends Family<AsyncValue<void>> {
  /// Set or update PIN
  ///
  /// Copied from [setPin].
  const SetPinFamily();

  /// Set or update PIN
  ///
  /// Copied from [setPin].
  SetPinProvider call({
    required String newPin,
    String? currentPin,
  }) {
    return SetPinProvider(
      newPin: newPin,
      currentPin: currentPin,
    );
  }

  @override
  SetPinProvider getProviderOverride(
    covariant SetPinProvider provider,
  ) {
    return call(
      newPin: provider.newPin,
      currentPin: provider.currentPin,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'setPinProvider';
}

/// Set or update PIN
///
/// Copied from [setPin].
class SetPinProvider extends AutoDisposeFutureProvider<void> {
  /// Set or update PIN
  ///
  /// Copied from [setPin].
  SetPinProvider({
    required String newPin,
    String? currentPin,
  }) : this._internal(
          (ref) => setPin(
            ref as SetPinRef,
            newPin: newPin,
            currentPin: currentPin,
          ),
          from: setPinProvider,
          name: r'setPinProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$setPinHash,
          dependencies: SetPinFamily._dependencies,
          allTransitiveDependencies: SetPinFamily._allTransitiveDependencies,
          newPin: newPin,
          currentPin: currentPin,
        );

  SetPinProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.newPin,
    required this.currentPin,
  }) : super.internal();

  final String newPin;
  final String? currentPin;

  @override
  Override overrideWith(
    FutureOr<void> Function(SetPinRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: SetPinProvider._internal(
        (ref) => create(ref as SetPinRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        newPin: newPin,
        currentPin: currentPin,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<void> createElement() {
    return _SetPinProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is SetPinProvider &&
        other.newPin == newPin &&
        other.currentPin == currentPin;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, newPin.hashCode);
    hash = _SystemHash.combine(hash, currentPin.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin SetPinRef on AutoDisposeFutureProviderRef<void> {
  /// The parameter `newPin` of this provider.
  String get newPin;

  /// The parameter `currentPin` of this provider.
  String? get currentPin;
}

class _SetPinProviderElement extends AutoDisposeFutureProviderElement<void>
    with SetPinRef {
  _SetPinProviderElement(super.provider);

  @override
  String get newPin => (origin as SetPinProvider).newPin;
  @override
  String? get currentPin => (origin as SetPinProvider).currentPin;
}

String _$removePinHash() => r'04e718ecb8abaf913628431d98eaeb335b698cb8';

/// Remove PIN protection
///
/// Copied from [removePin].
@ProviderFor(removePin)
const removePinProvider = RemovePinFamily();

/// Remove PIN protection
///
/// Copied from [removePin].
class RemovePinFamily extends Family<AsyncValue<void>> {
  /// Remove PIN protection
  ///
  /// Copied from [removePin].
  const RemovePinFamily();

  /// Remove PIN protection
  ///
  /// Copied from [removePin].
  RemovePinProvider call({
    required String currentPin,
  }) {
    return RemovePinProvider(
      currentPin: currentPin,
    );
  }

  @override
  RemovePinProvider getProviderOverride(
    covariant RemovePinProvider provider,
  ) {
    return call(
      currentPin: provider.currentPin,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'removePinProvider';
}

/// Remove PIN protection
///
/// Copied from [removePin].
class RemovePinProvider extends AutoDisposeFutureProvider<void> {
  /// Remove PIN protection
  ///
  /// Copied from [removePin].
  RemovePinProvider({
    required String currentPin,
  }) : this._internal(
          (ref) => removePin(
            ref as RemovePinRef,
            currentPin: currentPin,
          ),
          from: removePinProvider,
          name: r'removePinProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$removePinHash,
          dependencies: RemovePinFamily._dependencies,
          allTransitiveDependencies: RemovePinFamily._allTransitiveDependencies,
          currentPin: currentPin,
        );

  RemovePinProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.currentPin,
  }) : super.internal();

  final String currentPin;

  @override
  Override overrideWith(
    FutureOr<void> Function(RemovePinRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: RemovePinProvider._internal(
        (ref) => create(ref as RemovePinRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        currentPin: currentPin,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<void> createElement() {
    return _RemovePinProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is RemovePinProvider && other.currentPin == currentPin;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, currentPin.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin RemovePinRef on AutoDisposeFutureProviderRef<void> {
  /// The parameter `currentPin` of this provider.
  String get currentPin;
}

class _RemovePinProviderElement extends AutoDisposeFutureProviderElement<void>
    with RemovePinRef {
  _RemovePinProviderElement(super.provider);

  @override
  String get currentPin => (origin as RemovePinProvider).currentPin;
}

String _$settingsSyncMetadataHash() =>
    r'e11d28667c9fdda29e36232040a91ea119dd3079';

/// Get settings sync metadata
///
/// Copied from [settingsSyncMetadata].
@ProviderFor(settingsSyncMetadata)
final settingsSyncMetadataProvider =
    AutoDisposeFutureProvider<SettingsSyncMetadata>.internal(
  settingsSyncMetadata,
  name: r'settingsSyncMetadataProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$settingsSyncMetadataHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef SettingsSyncMetadataRef
    = AutoDisposeFutureProviderRef<SettingsSyncMetadata>;
String _$syncFromServerHash() => r'a78b6392a2c30e28e0938f7d1bc4c2d4475109b5';

/// Force sync settings from server
///
/// Copied from [syncFromServer].
@ProviderFor(syncFromServer)
final syncFromServerProvider =
    AutoDisposeFutureProvider<ParentSettings>.internal(
  syncFromServer,
  name: r'syncFromServerProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$syncFromServerHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef SyncFromServerRef = AutoDisposeFutureProviderRef<ParentSettings>;
String _$syncToServerHash() => r'feeb648c0312afd1f1f6add3fc549b2212179afe';

/// Push local settings to server
///
/// Copied from [syncToServer].
@ProviderFor(syncToServer)
const syncToServerProvider = SyncToServerFamily();

/// Push local settings to server
///
/// Copied from [syncToServer].
class SyncToServerFamily extends Family<AsyncValue<ParentSettings>> {
  /// Push local settings to server
  ///
  /// Copied from [syncToServer].
  const SyncToServerFamily();

  /// Push local settings to server
  ///
  /// Copied from [syncToServer].
  SyncToServerProvider call({
    required Map<String, dynamic> settings,
  }) {
    return SyncToServerProvider(
      settings: settings,
    );
  }

  @override
  SyncToServerProvider getProviderOverride(
    covariant SyncToServerProvider provider,
  ) {
    return call(
      settings: provider.settings,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'syncToServerProvider';
}

/// Push local settings to server
///
/// Copied from [syncToServer].
class SyncToServerProvider extends AutoDisposeFutureProvider<ParentSettings> {
  /// Push local settings to server
  ///
  /// Copied from [syncToServer].
  SyncToServerProvider({
    required Map<String, dynamic> settings,
  }) : this._internal(
          (ref) => syncToServer(
            ref as SyncToServerRef,
            settings: settings,
          ),
          from: syncToServerProvider,
          name: r'syncToServerProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$syncToServerHash,
          dependencies: SyncToServerFamily._dependencies,
          allTransitiveDependencies:
              SyncToServerFamily._allTransitiveDependencies,
          settings: settings,
        );

  SyncToServerProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.settings,
  }) : super.internal();

  final Map<String, dynamic> settings;

  @override
  Override overrideWith(
    FutureOr<ParentSettings> Function(SyncToServerRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: SyncToServerProvider._internal(
        (ref) => create(ref as SyncToServerRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        settings: settings,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<ParentSettings> createElement() {
    return _SyncToServerProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is SyncToServerProvider && other.settings == settings;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, settings.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin SyncToServerRef on AutoDisposeFutureProviderRef<ParentSettings> {
  /// The parameter `settings` of this provider.
  Map<String, dynamic> get settings;
}

class _SyncToServerProviderElement
    extends AutoDisposeFutureProviderElement<ParentSettings>
    with SyncToServerRef {
  _SyncToServerProviderElement(super.provider);

  @override
  Map<String, dynamic> get settings =>
      (origin as SyncToServerProvider).settings;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
