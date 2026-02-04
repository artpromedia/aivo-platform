// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ai_brain_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$aiBrainApiHash() => r'ee2ef7e9f3ce4e96d70cd08ad6cfc454b846526e';

/// Provider for AI Brain API client.
///
/// Copied from [aiBrainApi].
@ProviderFor(aiBrainApi)
final aiBrainApiProvider = AutoDisposeProvider<AIBrainApi>.internal(
  aiBrainApi,
  name: r'aiBrainApiProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$aiBrainApiHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef AiBrainApiRef = AutoDisposeProviderRef<AIBrainApi>;
String _$aiBrainStateHash() => r'8adb3ccd267626b8b3105dc7090ba3eea621a16d';

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

/// Fetch AI brain state for a child.
///
/// Copied from [aiBrainState].
@ProviderFor(aiBrainState)
const aiBrainStateProvider = AiBrainStateFamily();

/// Fetch AI brain state for a child.
///
/// Copied from [aiBrainState].
class AiBrainStateFamily extends Family<AsyncValue<AIBrainState>> {
  /// Fetch AI brain state for a child.
  ///
  /// Copied from [aiBrainState].
  const AiBrainStateFamily();

  /// Fetch AI brain state for a child.
  ///
  /// Copied from [aiBrainState].
  AiBrainStateProvider call(
    String childId,
  ) {
    return AiBrainStateProvider(
      childId,
    );
  }

  @override
  AiBrainStateProvider getProviderOverride(
    covariant AiBrainStateProvider provider,
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
  String? get name => r'aiBrainStateProvider';
}

/// Fetch AI brain state for a child.
///
/// Copied from [aiBrainState].
class AiBrainStateProvider extends AutoDisposeFutureProvider<AIBrainState> {
  /// Fetch AI brain state for a child.
  ///
  /// Copied from [aiBrainState].
  AiBrainStateProvider(
    String childId,
  ) : this._internal(
          (ref) => aiBrainState(
            ref as AiBrainStateRef,
            childId,
          ),
          from: aiBrainStateProvider,
          name: r'aiBrainStateProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$aiBrainStateHash,
          dependencies: AiBrainStateFamily._dependencies,
          allTransitiveDependencies:
              AiBrainStateFamily._allTransitiveDependencies,
          childId: childId,
        );

  AiBrainStateProvider._internal(
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
    FutureOr<AIBrainState> Function(AiBrainStateRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: AiBrainStateProvider._internal(
        (ref) => create(ref as AiBrainStateRef),
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
  AutoDisposeFutureProviderElement<AIBrainState> createElement() {
    return _AiBrainStateProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AiBrainStateProvider && other.childId == childId;
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
mixin AiBrainStateRef on AutoDisposeFutureProviderRef<AIBrainState> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _AiBrainStateProviderElement
    extends AutoDisposeFutureProviderElement<AIBrainState>
    with AiBrainStateRef {
  _AiBrainStateProviderElement(super.provider);

  @override
  String get childId => (origin as AiBrainStateProvider).childId;
}

String _$aiAdaptationsHash() => r'51e862d1199e8633c5d69b4c7a44a9e4148713c5';

/// Fetch recent AI adaptations for a child.
///
/// Copied from [aiAdaptations].
@ProviderFor(aiAdaptations)
const aiAdaptationsProvider = AiAdaptationsFamily();

/// Fetch recent AI adaptations for a child.
///
/// Copied from [aiAdaptations].
class AiAdaptationsFamily extends Family<AsyncValue<List<LearningAdaptation>>> {
  /// Fetch recent AI adaptations for a child.
  ///
  /// Copied from [aiAdaptations].
  const AiAdaptationsFamily();

  /// Fetch recent AI adaptations for a child.
  ///
  /// Copied from [aiAdaptations].
  AiAdaptationsProvider call(
    String childId, {
    int limit = 20,
  }) {
    return AiAdaptationsProvider(
      childId,
      limit: limit,
    );
  }

  @override
  AiAdaptationsProvider getProviderOverride(
    covariant AiAdaptationsProvider provider,
  ) {
    return call(
      provider.childId,
      limit: provider.limit,
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
  String? get name => r'aiAdaptationsProvider';
}

/// Fetch recent AI adaptations for a child.
///
/// Copied from [aiAdaptations].
class AiAdaptationsProvider
    extends AutoDisposeFutureProvider<List<LearningAdaptation>> {
  /// Fetch recent AI adaptations for a child.
  ///
  /// Copied from [aiAdaptations].
  AiAdaptationsProvider(
    String childId, {
    int limit = 20,
  }) : this._internal(
          (ref) => aiAdaptations(
            ref as AiAdaptationsRef,
            childId,
            limit: limit,
          ),
          from: aiAdaptationsProvider,
          name: r'aiAdaptationsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$aiAdaptationsHash,
          dependencies: AiAdaptationsFamily._dependencies,
          allTransitiveDependencies:
              AiAdaptationsFamily._allTransitiveDependencies,
          childId: childId,
          limit: limit,
        );

  AiAdaptationsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
    required this.limit,
  }) : super.internal();

  final String childId;
  final int limit;

  @override
  Override overrideWith(
    FutureOr<List<LearningAdaptation>> Function(AiAdaptationsRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: AiAdaptationsProvider._internal(
        (ref) => create(ref as AiAdaptationsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
        limit: limit,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<List<LearningAdaptation>> createElement() {
    return _AiAdaptationsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AiAdaptationsProvider &&
        other.childId == childId &&
        other.limit == limit;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);
    hash = _SystemHash.combine(hash, limit.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin AiAdaptationsRef
    on AutoDisposeFutureProviderRef<List<LearningAdaptation>> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `limit` of this provider.
  int get limit;
}

class _AiAdaptationsProviderElement
    extends AutoDisposeFutureProviderElement<List<LearningAdaptation>>
    with AiAdaptationsRef {
  _AiAdaptationsProviderElement(super.provider);

  @override
  String get childId => (origin as AiAdaptationsProvider).childId;
  @override
  int get limit => (origin as AiAdaptationsProvider).limit;
}

String _$learningPathHash() => r'846a19e7bfc1865e1fef0b0b17f6e05f0dfa2230';

/// Fetch learning path for a child and subject.
///
/// Copied from [learningPath].
@ProviderFor(learningPath)
const learningPathProvider = LearningPathFamily();

/// Fetch learning path for a child and subject.
///
/// Copied from [learningPath].
class LearningPathFamily extends Family<AsyncValue<LearningPath>> {
  /// Fetch learning path for a child and subject.
  ///
  /// Copied from [learningPath].
  const LearningPathFamily();

  /// Fetch learning path for a child and subject.
  ///
  /// Copied from [learningPath].
  LearningPathProvider call({
    required String childId,
    required String subject,
  }) {
    return LearningPathProvider(
      childId: childId,
      subject: subject,
    );
  }

  @override
  LearningPathProvider getProviderOverride(
    covariant LearningPathProvider provider,
  ) {
    return call(
      childId: provider.childId,
      subject: provider.subject,
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
  String? get name => r'learningPathProvider';
}

/// Fetch learning path for a child and subject.
///
/// Copied from [learningPath].
class LearningPathProvider extends AutoDisposeFutureProvider<LearningPath> {
  /// Fetch learning path for a child and subject.
  ///
  /// Copied from [learningPath].
  LearningPathProvider({
    required String childId,
    required String subject,
  }) : this._internal(
          (ref) => learningPath(
            ref as LearningPathRef,
            childId: childId,
            subject: subject,
          ),
          from: learningPathProvider,
          name: r'learningPathProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$learningPathHash,
          dependencies: LearningPathFamily._dependencies,
          allTransitiveDependencies:
              LearningPathFamily._allTransitiveDependencies,
          childId: childId,
          subject: subject,
        );

  LearningPathProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
    required this.subject,
  }) : super.internal();

  final String childId;
  final String subject;

  @override
  Override overrideWith(
    FutureOr<LearningPath> Function(LearningPathRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: LearningPathProvider._internal(
        (ref) => create(ref as LearningPathRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
        subject: subject,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<LearningPath> createElement() {
    return _LearningPathProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is LearningPathProvider &&
        other.childId == childId &&
        other.subject == subject;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);
    hash = _SystemHash.combine(hash, subject.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin LearningPathRef on AutoDisposeFutureProviderRef<LearningPath> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `subject` of this provider.
  String get subject;
}

class _LearningPathProviderElement
    extends AutoDisposeFutureProviderElement<LearningPath>
    with LearningPathRef {
  _LearningPathProviderElement(super.provider);

  @override
  String get childId => (origin as LearningPathProvider).childId;
  @override
  String get subject => (origin as LearningPathProvider).subject;
}

String _$aiDecisionLogHash() => r'd5de59d8db2bd3e37ce34aff086cc79cf8ba1919';

/// Fetch AI decision log for a child.
///
/// Copied from [aiDecisionLog].
@ProviderFor(aiDecisionLog)
const aiDecisionLogProvider = AiDecisionLogFamily();

/// Fetch AI decision log for a child.
///
/// Copied from [aiDecisionLog].
class AiDecisionLogFamily extends Family<AsyncValue<List<AIDecision>>> {
  /// Fetch AI decision log for a child.
  ///
  /// Copied from [aiDecisionLog].
  const AiDecisionLogFamily();

  /// Fetch AI decision log for a child.
  ///
  /// Copied from [aiDecisionLog].
  AiDecisionLogProvider call(
    String childId, {
    DateTime? startDate,
    DateTime? endDate,
  }) {
    return AiDecisionLogProvider(
      childId,
      startDate: startDate,
      endDate: endDate,
    );
  }

  @override
  AiDecisionLogProvider getProviderOverride(
    covariant AiDecisionLogProvider provider,
  ) {
    return call(
      provider.childId,
      startDate: provider.startDate,
      endDate: provider.endDate,
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
  String? get name => r'aiDecisionLogProvider';
}

/// Fetch AI decision log for a child.
///
/// Copied from [aiDecisionLog].
class AiDecisionLogProvider
    extends AutoDisposeFutureProvider<List<AIDecision>> {
  /// Fetch AI decision log for a child.
  ///
  /// Copied from [aiDecisionLog].
  AiDecisionLogProvider(
    String childId, {
    DateTime? startDate,
    DateTime? endDate,
  }) : this._internal(
          (ref) => aiDecisionLog(
            ref as AiDecisionLogRef,
            childId,
            startDate: startDate,
            endDate: endDate,
          ),
          from: aiDecisionLogProvider,
          name: r'aiDecisionLogProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$aiDecisionLogHash,
          dependencies: AiDecisionLogFamily._dependencies,
          allTransitiveDependencies:
              AiDecisionLogFamily._allTransitiveDependencies,
          childId: childId,
          startDate: startDate,
          endDate: endDate,
        );

  AiDecisionLogProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
    required this.startDate,
    required this.endDate,
  }) : super.internal();

  final String childId;
  final DateTime? startDate;
  final DateTime? endDate;

  @override
  Override overrideWith(
    FutureOr<List<AIDecision>> Function(AiDecisionLogRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: AiDecisionLogProvider._internal(
        (ref) => create(ref as AiDecisionLogRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
        startDate: startDate,
        endDate: endDate,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<List<AIDecision>> createElement() {
    return _AiDecisionLogProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AiDecisionLogProvider &&
        other.childId == childId &&
        other.startDate == startDate &&
        other.endDate == endDate;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);
    hash = _SystemHash.combine(hash, startDate.hashCode);
    hash = _SystemHash.combine(hash, endDate.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin AiDecisionLogRef on AutoDisposeFutureProviderRef<List<AIDecision>> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `startDate` of this provider.
  DateTime? get startDate;

  /// The parameter `endDate` of this provider.
  DateTime? get endDate;
}

class _AiDecisionLogProviderElement
    extends AutoDisposeFutureProviderElement<List<AIDecision>>
    with AiDecisionLogRef {
  _AiDecisionLogProviderElement(super.provider);

  @override
  String get childId => (origin as AiDecisionLogProvider).childId;
  @override
  DateTime? get startDate => (origin as AiDecisionLogProvider).startDate;
  @override
  DateTime? get endDate => (origin as AiDecisionLogProvider).endDate;
}

String _$aiSubjectsHash() => r'50525c9541e56d4eebb13711ce70c4290067f67c';

/// Fetch available subjects for a child.
///
/// Copied from [aiSubjects].
@ProviderFor(aiSubjects)
const aiSubjectsProvider = AiSubjectsFamily();

/// Fetch available subjects for a child.
///
/// Copied from [aiSubjects].
class AiSubjectsFamily extends Family<AsyncValue<List<SubjectInfo>>> {
  /// Fetch available subjects for a child.
  ///
  /// Copied from [aiSubjects].
  const AiSubjectsFamily();

  /// Fetch available subjects for a child.
  ///
  /// Copied from [aiSubjects].
  AiSubjectsProvider call(
    String childId,
  ) {
    return AiSubjectsProvider(
      childId,
    );
  }

  @override
  AiSubjectsProvider getProviderOverride(
    covariant AiSubjectsProvider provider,
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
  String? get name => r'aiSubjectsProvider';
}

/// Fetch available subjects for a child.
///
/// Copied from [aiSubjects].
class AiSubjectsProvider extends AutoDisposeFutureProvider<List<SubjectInfo>> {
  /// Fetch available subjects for a child.
  ///
  /// Copied from [aiSubjects].
  AiSubjectsProvider(
    String childId,
  ) : this._internal(
          (ref) => aiSubjects(
            ref as AiSubjectsRef,
            childId,
          ),
          from: aiSubjectsProvider,
          name: r'aiSubjectsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$aiSubjectsHash,
          dependencies: AiSubjectsFamily._dependencies,
          allTransitiveDependencies:
              AiSubjectsFamily._allTransitiveDependencies,
          childId: childId,
        );

  AiSubjectsProvider._internal(
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
    FutureOr<List<SubjectInfo>> Function(AiSubjectsRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: AiSubjectsProvider._internal(
        (ref) => create(ref as AiSubjectsRef),
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
  AutoDisposeFutureProviderElement<List<SubjectInfo>> createElement() {
    return _AiSubjectsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AiSubjectsProvider && other.childId == childId;
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
mixin AiSubjectsRef on AutoDisposeFutureProviderRef<List<SubjectInfo>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _AiSubjectsProviderElement
    extends AutoDisposeFutureProviderElement<List<SubjectInfo>>
    with AiSubjectsRef {
  _AiSubjectsProviderElement(super.provider);

  @override
  String get childId => (origin as AiSubjectsProvider).childId;
}

String _$aiPersonalityHash() => r'9804dd18859b8bdd971db39e557d84c194c9b7c0';

/// Fetch AI personality for a child.
///
/// Copied from [aiPersonality].
@ProviderFor(aiPersonality)
const aiPersonalityProvider = AiPersonalityFamily();

/// Fetch AI personality for a child.
///
/// Copied from [aiPersonality].
class AiPersonalityFamily extends Family<AsyncValue<AIPersonality>> {
  /// Fetch AI personality for a child.
  ///
  /// Copied from [aiPersonality].
  const AiPersonalityFamily();

  /// Fetch AI personality for a child.
  ///
  /// Copied from [aiPersonality].
  AiPersonalityProvider call(
    String childId,
  ) {
    return AiPersonalityProvider(
      childId,
    );
  }

  @override
  AiPersonalityProvider getProviderOverride(
    covariant AiPersonalityProvider provider,
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
  String? get name => r'aiPersonalityProvider';
}

/// Fetch AI personality for a child.
///
/// Copied from [aiPersonality].
class AiPersonalityProvider extends AutoDisposeFutureProvider<AIPersonality> {
  /// Fetch AI personality for a child.
  ///
  /// Copied from [aiPersonality].
  AiPersonalityProvider(
    String childId,
  ) : this._internal(
          (ref) => aiPersonality(
            ref as AiPersonalityRef,
            childId,
          ),
          from: aiPersonalityProvider,
          name: r'aiPersonalityProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$aiPersonalityHash,
          dependencies: AiPersonalityFamily._dependencies,
          allTransitiveDependencies:
              AiPersonalityFamily._allTransitiveDependencies,
          childId: childId,
        );

  AiPersonalityProvider._internal(
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
    FutureOr<AIPersonality> Function(AiPersonalityRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: AiPersonalityProvider._internal(
        (ref) => create(ref as AiPersonalityRef),
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
  AutoDisposeFutureProviderElement<AIPersonality> createElement() {
    return _AiPersonalityProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AiPersonalityProvider && other.childId == childId;
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
mixin AiPersonalityRef on AutoDisposeFutureProviderRef<AIPersonality> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _AiPersonalityProviderElement
    extends AutoDisposeFutureProviderElement<AIPersonality>
    with AiPersonalityRef {
  _AiPersonalityProviderElement(super.provider);

  @override
  String get childId => (origin as AiPersonalityProvider).childId;
}

String _$selectedSubjectHash() => r'832dabc01f8ad29f327656dea206aa58c2357fc4';

/// Selected subject for learning path view.
///
/// Copied from [SelectedSubject].
@ProviderFor(SelectedSubject)
final selectedSubjectProvider =
    AutoDisposeNotifierProvider<SelectedSubject, String?>.internal(
  SelectedSubject.new,
  name: r'selectedSubjectProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$selectedSubjectHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$SelectedSubject = AutoDisposeNotifier<String?>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
