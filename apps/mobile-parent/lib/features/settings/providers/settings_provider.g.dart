// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'settings_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$settingsHash() => r'fe68dbb60fdbcaf35ef177957501bd771bd26f57';

/// See also [settings].
@ProviderFor(settings)
final settingsProvider = AutoDisposeFutureProvider<AppSettings>.internal(
  settings,
  name: r'settingsProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$settingsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef SettingsRef = AutoDisposeFutureProviderRef<AppSettings>;
String _$updateSettingHash() => r'3f8d210032b64ffff2bbda440644a40fd12150c6';

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

/// See also [updateSetting].
@ProviderFor(updateSetting)
const updateSettingProvider = UpdateSettingFamily();

/// See also [updateSetting].
class UpdateSettingFamily extends Family<AsyncValue<void>> {
  /// See also [updateSetting].
  const UpdateSettingFamily();

  /// See also [updateSetting].
  UpdateSettingProvider call({
    required String key,
    required dynamic value,
  }) {
    return UpdateSettingProvider(
      key: key,
      value: value,
    );
  }

  @override
  UpdateSettingProvider getProviderOverride(
    covariant UpdateSettingProvider provider,
  ) {
    return call(
      key: provider.key,
      value: provider.value,
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
  String? get name => r'updateSettingProvider';
}

/// See also [updateSetting].
class UpdateSettingProvider extends AutoDisposeFutureProvider<void> {
  /// See also [updateSetting].
  UpdateSettingProvider({
    required String key,
    required dynamic value,
  }) : this._internal(
          (ref) => updateSetting(
            ref as UpdateSettingRef,
            key: key,
            value: value,
          ),
          from: updateSettingProvider,
          name: r'updateSettingProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$updateSettingHash,
          dependencies: UpdateSettingFamily._dependencies,
          allTransitiveDependencies:
              UpdateSettingFamily._allTransitiveDependencies,
          key: key,
          value: value,
        );

  UpdateSettingProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.key,
    required this.value,
  }) : super.internal();

  final String key;
  final dynamic value;

  @override
  Override overrideWith(
    FutureOr<void> Function(UpdateSettingRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UpdateSettingProvider._internal(
        (ref) => create(ref as UpdateSettingRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        key: key,
        value: value,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<void> createElement() {
    return _UpdateSettingProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UpdateSettingProvider &&
        other.key == key &&
        other.value == value;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, key.hashCode);
    hash = _SystemHash.combine(hash, value.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin UpdateSettingRef on AutoDisposeFutureProviderRef<void> {
  /// The parameter `key` of this provider.
  String get key;

  /// The parameter `value` of this provider.
  dynamic get value;
}

class _UpdateSettingProviderElement
    extends AutoDisposeFutureProviderElement<void> with UpdateSettingRef {
  _UpdateSettingProviderElement(super.provider);

  @override
  String get key => (origin as UpdateSettingProvider).key;
  @override
  dynamic get value => (origin as UpdateSettingProvider).value;
}

String _$updateProfileHash() => r'c8036754e4fdc8387a5eae94952af5bf8ce64f32';

/// See also [updateProfile].
@ProviderFor(updateProfile)
const updateProfileProvider = UpdateProfileFamily();

/// See also [updateProfile].
class UpdateProfileFamily extends Family<AsyncValue<void>> {
  /// See also [updateProfile].
  const UpdateProfileFamily();

  /// See also [updateProfile].
  UpdateProfileProvider call({
    required String firstName,
    required String lastName,
  }) {
    return UpdateProfileProvider(
      firstName: firstName,
      lastName: lastName,
    );
  }

  @override
  UpdateProfileProvider getProviderOverride(
    covariant UpdateProfileProvider provider,
  ) {
    return call(
      firstName: provider.firstName,
      lastName: provider.lastName,
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
  String? get name => r'updateProfileProvider';
}

/// See also [updateProfile].
class UpdateProfileProvider extends AutoDisposeFutureProvider<void> {
  /// See also [updateProfile].
  UpdateProfileProvider({
    required String firstName,
    required String lastName,
  }) : this._internal(
          (ref) => updateProfile(
            ref as UpdateProfileRef,
            firstName: firstName,
            lastName: lastName,
          ),
          from: updateProfileProvider,
          name: r'updateProfileProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$updateProfileHash,
          dependencies: UpdateProfileFamily._dependencies,
          allTransitiveDependencies:
              UpdateProfileFamily._allTransitiveDependencies,
          firstName: firstName,
          lastName: lastName,
        );

  UpdateProfileProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.firstName,
    required this.lastName,
  }) : super.internal();

  final String firstName;
  final String lastName;

  @override
  Override overrideWith(
    FutureOr<void> Function(UpdateProfileRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UpdateProfileProvider._internal(
        (ref) => create(ref as UpdateProfileRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        firstName: firstName,
        lastName: lastName,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<void> createElement() {
    return _UpdateProfileProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UpdateProfileProvider &&
        other.firstName == firstName &&
        other.lastName == lastName;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, firstName.hashCode);
    hash = _SystemHash.combine(hash, lastName.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin UpdateProfileRef on AutoDisposeFutureProviderRef<void> {
  /// The parameter `firstName` of this provider.
  String get firstName;

  /// The parameter `lastName` of this provider.
  String get lastName;
}

class _UpdateProfileProviderElement
    extends AutoDisposeFutureProviderElement<void> with UpdateProfileRef {
  _UpdateProfileProviderElement(super.provider);

  @override
  String get firstName => (origin as UpdateProfileProvider).firstName;
  @override
  String get lastName => (origin as UpdateProfileProvider).lastName;
}

String _$changePasswordHash() => r'f37a8beae31ac22a9b933d561b27628c33e1ce26';

/// See also [changePassword].
@ProviderFor(changePassword)
const changePasswordProvider = ChangePasswordFamily();

/// See also [changePassword].
class ChangePasswordFamily extends Family<AsyncValue<void>> {
  /// See also [changePassword].
  const ChangePasswordFamily();

  /// See also [changePassword].
  ChangePasswordProvider call({
    required String currentPassword,
    required String newPassword,
  }) {
    return ChangePasswordProvider(
      currentPassword: currentPassword,
      newPassword: newPassword,
    );
  }

  @override
  ChangePasswordProvider getProviderOverride(
    covariant ChangePasswordProvider provider,
  ) {
    return call(
      currentPassword: provider.currentPassword,
      newPassword: provider.newPassword,
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
  String? get name => r'changePasswordProvider';
}

/// See also [changePassword].
class ChangePasswordProvider extends AutoDisposeFutureProvider<void> {
  /// See also [changePassword].
  ChangePasswordProvider({
    required String currentPassword,
    required String newPassword,
  }) : this._internal(
          (ref) => changePassword(
            ref as ChangePasswordRef,
            currentPassword: currentPassword,
            newPassword: newPassword,
          ),
          from: changePasswordProvider,
          name: r'changePasswordProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$changePasswordHash,
          dependencies: ChangePasswordFamily._dependencies,
          allTransitiveDependencies:
              ChangePasswordFamily._allTransitiveDependencies,
          currentPassword: currentPassword,
          newPassword: newPassword,
        );

  ChangePasswordProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.currentPassword,
    required this.newPassword,
  }) : super.internal();

  final String currentPassword;
  final String newPassword;

  @override
  Override overrideWith(
    FutureOr<void> Function(ChangePasswordRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ChangePasswordProvider._internal(
        (ref) => create(ref as ChangePasswordRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        currentPassword: currentPassword,
        newPassword: newPassword,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<void> createElement() {
    return _ChangePasswordProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ChangePasswordProvider &&
        other.currentPassword == currentPassword &&
        other.newPassword == newPassword;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, currentPassword.hashCode);
    hash = _SystemHash.combine(hash, newPassword.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin ChangePasswordRef on AutoDisposeFutureProviderRef<void> {
  /// The parameter `currentPassword` of this provider.
  String get currentPassword;

  /// The parameter `newPassword` of this provider.
  String get newPassword;
}

class _ChangePasswordProviderElement
    extends AutoDisposeFutureProviderElement<void> with ChangePasswordRef {
  _ChangePasswordProviderElement(super.provider);

  @override
  String get currentPassword =>
      (origin as ChangePasswordProvider).currentPassword;
  @override
  String get newPassword => (origin as ChangePasswordProvider).newPassword;
}

String _$logoutHash() => r'e71ca3e853e2c7cb3923b9071b216e5b81923e9a';

/// See also [logout].
@ProviderFor(logout)
final logoutProvider = AutoDisposeFutureProvider<void>.internal(
  logout,
  name: r'logoutProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$logoutHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef LogoutRef = AutoDisposeFutureProviderRef<void>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
