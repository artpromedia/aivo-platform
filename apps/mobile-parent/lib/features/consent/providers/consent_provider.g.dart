// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'consent_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$consentRecordsHash() => r'e132a480375eb20590fb2ad6196a311e564049fc';

/// See also [consentRecords].
@ProviderFor(consentRecords)
final consentRecordsProvider =
    AutoDisposeFutureProvider<List<ConsentRecord>>.internal(
  consentRecords,
  name: r'consentRecordsProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$consentRecordsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef ConsentRecordsRef = AutoDisposeFutureProviderRef<List<ConsentRecord>>;
String _$updateConsentHash() => r'5462ec1f9e666291512a4aa6c4e7878b10ac0f90';

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

/// See also [updateConsent].
@ProviderFor(updateConsent)
const updateConsentProvider = UpdateConsentFamily();

/// See also [updateConsent].
class UpdateConsentFamily extends Family<AsyncValue<void>> {
  /// See also [updateConsent].
  const UpdateConsentFamily();

  /// See also [updateConsent].
  UpdateConsentProvider call({
    required String type,
    required bool granted,
  }) {
    return UpdateConsentProvider(
      type: type,
      granted: granted,
    );
  }

  @override
  UpdateConsentProvider getProviderOverride(
    covariant UpdateConsentProvider provider,
  ) {
    return call(
      type: provider.type,
      granted: provider.granted,
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
  String? get name => r'updateConsentProvider';
}

/// See also [updateConsent].
class UpdateConsentProvider extends AutoDisposeFutureProvider<void> {
  /// See also [updateConsent].
  UpdateConsentProvider({
    required String type,
    required bool granted,
  }) : this._internal(
          (ref) => updateConsent(
            ref as UpdateConsentRef,
            type: type,
            granted: granted,
          ),
          from: updateConsentProvider,
          name: r'updateConsentProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$updateConsentHash,
          dependencies: UpdateConsentFamily._dependencies,
          allTransitiveDependencies:
              UpdateConsentFamily._allTransitiveDependencies,
          type: type,
          granted: granted,
        );

  UpdateConsentProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.type,
    required this.granted,
  }) : super.internal();

  final String type;
  final bool granted;

  @override
  Override overrideWith(
    FutureOr<void> Function(UpdateConsentRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UpdateConsentProvider._internal(
        (ref) => create(ref as UpdateConsentRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        type: type,
        granted: granted,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<void> createElement() {
    return _UpdateConsentProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UpdateConsentProvider &&
        other.type == type &&
        other.granted == granted;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, type.hashCode);
    hash = _SystemHash.combine(hash, granted.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin UpdateConsentRef on AutoDisposeFutureProviderRef<void> {
  /// The parameter `type` of this provider.
  String get type;

  /// The parameter `granted` of this provider.
  bool get granted;
}

class _UpdateConsentProviderElement
    extends AutoDisposeFutureProviderElement<void> with UpdateConsentRef {
  _UpdateConsentProviderElement(super.provider);

  @override
  String get type => (origin as UpdateConsentProvider).type;
  @override
  bool get granted => (origin as UpdateConsentProvider).granted;
}

String _$requestDataExportHash() => r'b7f1b4a6a708d5fc9266c606de912361efa07081';

/// See also [requestDataExport].
@ProviderFor(requestDataExport)
final requestDataExportProvider = AutoDisposeFutureProvider<void>.internal(
  requestDataExport,
  name: r'requestDataExportProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$requestDataExportHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef RequestDataExportRef = AutoDisposeFutureProviderRef<void>;
String _$requestDataDeletionHash() =>
    r'07432cd588f721cde888a1110d71c44a7954f660';

/// See also [requestDataDeletion].
@ProviderFor(requestDataDeletion)
final requestDataDeletionProvider = AutoDisposeFutureProvider<void>.internal(
  requestDataDeletion,
  name: r'requestDataDeletionProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$requestDataDeletionHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef RequestDataDeletionRef = AutoDisposeFutureProviderRef<void>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
