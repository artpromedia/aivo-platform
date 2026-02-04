// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'intervention_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$interventionApiHash() => r'800998bfa4e36df036d97d192aff9a6472febd43';

/// Provider for Intervention API client.
///
/// Copied from [interventionApi].
@ProviderFor(interventionApi)
final interventionApiProvider = AutoDisposeProvider<InterventionApi>.internal(
  interventionApi,
  name: r'interventionApiProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$interventionApiHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef InterventionApiRef = AutoDisposeProviderRef<InterventionApi>;
String _$interventionHistoryHash() =>
    r'f0c053fa25007b1b23012a39db036f83cd083e44';

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

/// Fetch intervention history for a child.
///
/// Copied from [interventionHistory].
@ProviderFor(interventionHistory)
const interventionHistoryProvider = InterventionHistoryFamily();

/// Fetch intervention history for a child.
///
/// Copied from [interventionHistory].
class InterventionHistoryFamily
    extends Family<AsyncValue<List<InterventionRecord>>> {
  /// Fetch intervention history for a child.
  ///
  /// Copied from [interventionHistory].
  const InterventionHistoryFamily();

  /// Fetch intervention history for a child.
  ///
  /// Copied from [interventionHistory].
  InterventionHistoryProvider call(
    String childId,
  ) {
    return InterventionHistoryProvider(
      childId,
    );
  }

  @override
  InterventionHistoryProvider getProviderOverride(
    covariant InterventionHistoryProvider provider,
  ) {
    return call(
      provider.childId,
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
  String? get name => r'interventionHistoryProvider';
}

/// Fetch intervention history for a child.
///
/// Copied from [interventionHistory].
class InterventionHistoryProvider
    extends AutoDisposeFutureProvider<List<InterventionRecord>> {
  /// Fetch intervention history for a child.
  ///
  /// Copied from [interventionHistory].
  InterventionHistoryProvider(
    String childId,
  ) : this._internal(
          (ref) => interventionHistory(
            ref as InterventionHistoryRef,
            childId,
          ),
          from: interventionHistoryProvider,
          name: r'interventionHistoryProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$interventionHistoryHash,
          dependencies: InterventionHistoryFamily._dependencies,
          allTransitiveDependencies:
              InterventionHistoryFamily._allTransitiveDependencies,
          childId: childId,
        );

  InterventionHistoryProvider._internal(
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
    FutureOr<List<InterventionRecord>> Function(InterventionHistoryRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: InterventionHistoryProvider._internal(
        (ref) => create(ref as InterventionHistoryRef),
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
  AutoDisposeFutureProviderElement<List<InterventionRecord>> createElement() {
    return _InterventionHistoryProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is InterventionHistoryProvider && other.childId == childId;
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
mixin InterventionHistoryRef
    on AutoDisposeFutureProviderRef<List<InterventionRecord>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _InterventionHistoryProviderElement
    extends AutoDisposeFutureProviderElement<List<InterventionRecord>>
    with InterventionHistoryRef {
  _InterventionHistoryProviderElement(super.provider);

  @override
  String get childId => (origin as InterventionHistoryProvider).childId;
}

String _$activeInterventionsHash() =>
    r'547d0f7b668a2aae30dfcb421242d81c7e37b1eb';

/// Fetch active interventions for a child.
///
/// Copied from [activeInterventions].
@ProviderFor(activeInterventions)
const activeInterventionsProvider = ActiveInterventionsFamily();

/// Fetch active interventions for a child.
///
/// Copied from [activeInterventions].
class ActiveInterventionsFamily
    extends Family<AsyncValue<List<InterventionRecord>>> {
  /// Fetch active interventions for a child.
  ///
  /// Copied from [activeInterventions].
  const ActiveInterventionsFamily();

  /// Fetch active interventions for a child.
  ///
  /// Copied from [activeInterventions].
  ActiveInterventionsProvider call(
    String childId,
  ) {
    return ActiveInterventionsProvider(
      childId,
    );
  }

  @override
  ActiveInterventionsProvider getProviderOverride(
    covariant ActiveInterventionsProvider provider,
  ) {
    return call(
      provider.childId,
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
  String? get name => r'activeInterventionsProvider';
}

/// Fetch active interventions for a child.
///
/// Copied from [activeInterventions].
class ActiveInterventionsProvider
    extends AutoDisposeFutureProvider<List<InterventionRecord>> {
  /// Fetch active interventions for a child.
  ///
  /// Copied from [activeInterventions].
  ActiveInterventionsProvider(
    String childId,
  ) : this._internal(
          (ref) => activeInterventions(
            ref as ActiveInterventionsRef,
            childId,
          ),
          from: activeInterventionsProvider,
          name: r'activeInterventionsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$activeInterventionsHash,
          dependencies: ActiveInterventionsFamily._dependencies,
          allTransitiveDependencies:
              ActiveInterventionsFamily._allTransitiveDependencies,
          childId: childId,
        );

  ActiveInterventionsProvider._internal(
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
    FutureOr<List<InterventionRecord>> Function(ActiveInterventionsRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ActiveInterventionsProvider._internal(
        (ref) => create(ref as ActiveInterventionsRef),
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
  AutoDisposeFutureProviderElement<List<InterventionRecord>> createElement() {
    return _ActiveInterventionsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ActiveInterventionsProvider && other.childId == childId;
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
mixin ActiveInterventionsRef
    on AutoDisposeFutureProviderRef<List<InterventionRecord>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _ActiveInterventionsProviderElement
    extends AutoDisposeFutureProviderElement<List<InterventionRecord>>
    with ActiveInterventionsRef {
  _ActiveInterventionsProviderElement(super.provider);

  @override
  String get childId => (origin as ActiveInterventionsProvider).childId;
}

String _$interventionDetailsHash() =>
    r'96e7814d1c5bdeef51e242d0fc19ff172a3ea75e';

/// Fetch details of a specific intervention.
///
/// Copied from [interventionDetails].
@ProviderFor(interventionDetails)
const interventionDetailsProvider = InterventionDetailsFamily();

/// Fetch details of a specific intervention.
///
/// Copied from [interventionDetails].
class InterventionDetailsFamily extends Family<AsyncValue<InterventionRecord>> {
  /// Fetch details of a specific intervention.
  ///
  /// Copied from [interventionDetails].
  const InterventionDetailsFamily();

  /// Fetch details of a specific intervention.
  ///
  /// Copied from [interventionDetails].
  InterventionDetailsProvider call(
    String interventionId,
  ) {
    return InterventionDetailsProvider(
      interventionId,
    );
  }

  @override
  InterventionDetailsProvider getProviderOverride(
    covariant InterventionDetailsProvider provider,
  ) {
    return call(
      provider.interventionId,
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
  String? get name => r'interventionDetailsProvider';
}

/// Fetch details of a specific intervention.
///
/// Copied from [interventionDetails].
class InterventionDetailsProvider
    extends AutoDisposeFutureProvider<InterventionRecord> {
  /// Fetch details of a specific intervention.
  ///
  /// Copied from [interventionDetails].
  InterventionDetailsProvider(
    String interventionId,
  ) : this._internal(
          (ref) => interventionDetails(
            ref as InterventionDetailsRef,
            interventionId,
          ),
          from: interventionDetailsProvider,
          name: r'interventionDetailsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$interventionDetailsHash,
          dependencies: InterventionDetailsFamily._dependencies,
          allTransitiveDependencies:
              InterventionDetailsFamily._allTransitiveDependencies,
          interventionId: interventionId,
        );

  InterventionDetailsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.interventionId,
  }) : super.internal();

  final String interventionId;

  @override
  Override overrideWith(
    FutureOr<InterventionRecord> Function(InterventionDetailsRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: InterventionDetailsProvider._internal(
        (ref) => create(ref as InterventionDetailsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        interventionId: interventionId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<InterventionRecord> createElement() {
    return _InterventionDetailsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is InterventionDetailsProvider &&
        other.interventionId == interventionId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, interventionId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin InterventionDetailsRef
    on AutoDisposeFutureProviderRef<InterventionRecord> {
  /// The parameter `interventionId` of this provider.
  String get interventionId;
}

class _InterventionDetailsProviderElement
    extends AutoDisposeFutureProviderElement<InterventionRecord>
    with InterventionDetailsRef {
  _InterventionDetailsProviderElement(super.provider);

  @override
  String get interventionId =>
      (origin as InterventionDetailsProvider).interventionId;
}

String _$interventionOutcomesHash() =>
    r'9d4593d4e0d2e03d13dca05015ea9f2d3d0bb8fc';

/// Fetch outcomes for an intervention.
///
/// Copied from [interventionOutcomes].
@ProviderFor(interventionOutcomes)
const interventionOutcomesProvider = InterventionOutcomesFamily();

/// Fetch outcomes for an intervention.
///
/// Copied from [interventionOutcomes].
class InterventionOutcomesFamily
    extends Family<AsyncValue<InterventionOutcome?>> {
  /// Fetch outcomes for an intervention.
  ///
  /// Copied from [interventionOutcomes].
  const InterventionOutcomesFamily();

  /// Fetch outcomes for an intervention.
  ///
  /// Copied from [interventionOutcomes].
  InterventionOutcomesProvider call(
    String interventionId,
  ) {
    return InterventionOutcomesProvider(
      interventionId,
    );
  }

  @override
  InterventionOutcomesProvider getProviderOverride(
    covariant InterventionOutcomesProvider provider,
  ) {
    return call(
      provider.interventionId,
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
  String? get name => r'interventionOutcomesProvider';
}

/// Fetch outcomes for an intervention.
///
/// Copied from [interventionOutcomes].
class InterventionOutcomesProvider
    extends AutoDisposeFutureProvider<InterventionOutcome?> {
  /// Fetch outcomes for an intervention.
  ///
  /// Copied from [interventionOutcomes].
  InterventionOutcomesProvider(
    String interventionId,
  ) : this._internal(
          (ref) => interventionOutcomes(
            ref as InterventionOutcomesRef,
            interventionId,
          ),
          from: interventionOutcomesProvider,
          name: r'interventionOutcomesProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$interventionOutcomesHash,
          dependencies: InterventionOutcomesFamily._dependencies,
          allTransitiveDependencies:
              InterventionOutcomesFamily._allTransitiveDependencies,
          interventionId: interventionId,
        );

  InterventionOutcomesProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.interventionId,
  }) : super.internal();

  final String interventionId;

  @override
  Override overrideWith(
    FutureOr<InterventionOutcome?> Function(InterventionOutcomesRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: InterventionOutcomesProvider._internal(
        (ref) => create(ref as InterventionOutcomesRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        interventionId: interventionId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<InterventionOutcome?> createElement() {
    return _InterventionOutcomesProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is InterventionOutcomesProvider &&
        other.interventionId == interventionId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, interventionId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin InterventionOutcomesRef
    on AutoDisposeFutureProviderRef<InterventionOutcome?> {
  /// The parameter `interventionId` of this provider.
  String get interventionId;
}

class _InterventionOutcomesProviderElement
    extends AutoDisposeFutureProviderElement<InterventionOutcome?>
    with InterventionOutcomesRef {
  _InterventionOutcomesProviderElement(super.provider);

  @override
  String get interventionId =>
      (origin as InterventionOutcomesProvider).interventionId;
}

String _$interventionSummaryHash() =>
    r'27da7af98a89c5c0607e9cd239a9db9e21f7d173';

/// Fetch intervention summary for a child.
///
/// Copied from [interventionSummary].
@ProviderFor(interventionSummary)
const interventionSummaryProvider = InterventionSummaryFamily();

/// Fetch intervention summary for a child.
///
/// Copied from [interventionSummary].
class InterventionSummaryFamily
    extends Family<AsyncValue<InterventionSummary>> {
  /// Fetch intervention summary for a child.
  ///
  /// Copied from [interventionSummary].
  const InterventionSummaryFamily();

  /// Fetch intervention summary for a child.
  ///
  /// Copied from [interventionSummary].
  InterventionSummaryProvider call(
    String childId,
  ) {
    return InterventionSummaryProvider(
      childId,
    );
  }

  @override
  InterventionSummaryProvider getProviderOverride(
    covariant InterventionSummaryProvider provider,
  ) {
    return call(
      provider.childId,
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
  String? get name => r'interventionSummaryProvider';
}

/// Fetch intervention summary for a child.
///
/// Copied from [interventionSummary].
class InterventionSummaryProvider
    extends AutoDisposeFutureProvider<InterventionSummary> {
  /// Fetch intervention summary for a child.
  ///
  /// Copied from [interventionSummary].
  InterventionSummaryProvider(
    String childId,
  ) : this._internal(
          (ref) => interventionSummary(
            ref as InterventionSummaryRef,
            childId,
          ),
          from: interventionSummaryProvider,
          name: r'interventionSummaryProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$interventionSummaryHash,
          dependencies: InterventionSummaryFamily._dependencies,
          allTransitiveDependencies:
              InterventionSummaryFamily._allTransitiveDependencies,
          childId: childId,
        );

  InterventionSummaryProvider._internal(
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
    FutureOr<InterventionSummary> Function(InterventionSummaryRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: InterventionSummaryProvider._internal(
        (ref) => create(ref as InterventionSummaryRef),
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
  AutoDisposeFutureProviderElement<InterventionSummary> createElement() {
    return _InterventionSummaryProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is InterventionSummaryProvider && other.childId == childId;
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
mixin InterventionSummaryRef
    on AutoDisposeFutureProviderRef<InterventionSummary> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _InterventionSummaryProviderElement
    extends AutoDisposeFutureProviderElement<InterventionSummary>
    with InterventionSummaryRef {
  _InterventionSummaryProviderElement(super.provider);

  @override
  String get childId => (origin as InterventionSummaryProvider).childId;
}

String _$interventionEvidenceHash() =>
    r'4edd21cbedf89d9a09239da7f115cd89a8f0fe92';

/// Fetch evidence for an intervention.
///
/// Copied from [interventionEvidence].
@ProviderFor(interventionEvidence)
const interventionEvidenceProvider = InterventionEvidenceFamily();

/// Fetch evidence for an intervention.
///
/// Copied from [interventionEvidence].
class InterventionEvidenceFamily
    extends Family<AsyncValue<List<InterventionEvidence>>> {
  /// Fetch evidence for an intervention.
  ///
  /// Copied from [interventionEvidence].
  const InterventionEvidenceFamily();

  /// Fetch evidence for an intervention.
  ///
  /// Copied from [interventionEvidence].
  InterventionEvidenceProvider call(
    String interventionId,
  ) {
    return InterventionEvidenceProvider(
      interventionId,
    );
  }

  @override
  InterventionEvidenceProvider getProviderOverride(
    covariant InterventionEvidenceProvider provider,
  ) {
    return call(
      provider.interventionId,
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
  String? get name => r'interventionEvidenceProvider';
}

/// Fetch evidence for an intervention.
///
/// Copied from [interventionEvidence].
class InterventionEvidenceProvider
    extends AutoDisposeFutureProvider<List<InterventionEvidence>> {
  /// Fetch evidence for an intervention.
  ///
  /// Copied from [interventionEvidence].
  InterventionEvidenceProvider(
    String interventionId,
  ) : this._internal(
          (ref) => interventionEvidence(
            ref as InterventionEvidenceRef,
            interventionId,
          ),
          from: interventionEvidenceProvider,
          name: r'interventionEvidenceProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$interventionEvidenceHash,
          dependencies: InterventionEvidenceFamily._dependencies,
          allTransitiveDependencies:
              InterventionEvidenceFamily._allTransitiveDependencies,
          interventionId: interventionId,
        );

  InterventionEvidenceProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.interventionId,
  }) : super.internal();

  final String interventionId;

  @override
  Override overrideWith(
    FutureOr<List<InterventionEvidence>> Function(
            InterventionEvidenceRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: InterventionEvidenceProvider._internal(
        (ref) => create(ref as InterventionEvidenceRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        interventionId: interventionId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<List<InterventionEvidence>> createElement() {
    return _InterventionEvidenceProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is InterventionEvidenceProvider &&
        other.interventionId == interventionId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, interventionId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin InterventionEvidenceRef
    on AutoDisposeFutureProviderRef<List<InterventionEvidence>> {
  /// The parameter `interventionId` of this provider.
  String get interventionId;
}

class _InterventionEvidenceProviderElement
    extends AutoDisposeFutureProviderElement<List<InterventionEvidence>>
    with InterventionEvidenceRef {
  _InterventionEvidenceProviderElement(super.provider);

  @override
  String get interventionId =>
      (origin as InterventionEvidenceProvider).interventionId;
}

String _$interventionFilterHash() =>
    r'c0fadacc0bdb93cc302382c793fcf890e9b5a289';

/// Selected filter state for intervention list.
///
/// Copied from [InterventionFilter].
@ProviderFor(InterventionFilter)
final interventionFilterProvider = AutoDisposeNotifierProvider<
    InterventionFilter, InterventionFilterState>.internal(
  InterventionFilter.new,
  name: r'interventionFilterProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$interventionFilterHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$InterventionFilter = AutoDisposeNotifier<InterventionFilterState>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
