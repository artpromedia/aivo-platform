// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tutor_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$tutorAddonsHash() => r'5017c975826c40c61d670954b608848428232d3b';

/// Provider for the list of available tutor add-ons.
///
/// Copied from [tutorAddons].
@ProviderFor(tutorAddons)
final tutorAddonsProvider =
    AutoDisposeFutureProvider<List<TutorAddon>>.internal(
  tutorAddons,
  name: r'tutorAddonsProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$tutorAddonsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef TutorAddonsRef = AutoDisposeFutureProviderRef<List<TutorAddon>>;
String _$tutorSessionsHash() => r'912842762c1a28ff0bb820388e5ee36c2d3845a4';

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

/// Provider for a child's tutor session history.
///
/// Copied from [tutorSessions].
@ProviderFor(tutorSessions)
const tutorSessionsProvider = TutorSessionsFamily();

/// Provider for a child's tutor session history.
///
/// Copied from [tutorSessions].
class TutorSessionsFamily extends Family<AsyncValue<List<TutorSession>>> {
  /// Provider for a child's tutor session history.
  ///
  /// Copied from [tutorSessions].
  const TutorSessionsFamily();

  /// Provider for a child's tutor session history.
  ///
  /// Copied from [tutorSessions].
  TutorSessionsProvider call(
    String childId,
  ) {
    return TutorSessionsProvider(
      childId,
    );
  }

  @override
  TutorSessionsProvider getProviderOverride(
    covariant TutorSessionsProvider provider,
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
  String? get name => r'tutorSessionsProvider';
}

/// Provider for a child's tutor session history.
///
/// Copied from [tutorSessions].
class TutorSessionsProvider
    extends AutoDisposeFutureProvider<List<TutorSession>> {
  /// Provider for a child's tutor session history.
  ///
  /// Copied from [tutorSessions].
  TutorSessionsProvider(
    String childId,
  ) : this._internal(
          (ref) => tutorSessions(
            ref as TutorSessionsRef,
            childId,
          ),
          from: tutorSessionsProvider,
          name: r'tutorSessionsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$tutorSessionsHash,
          dependencies: TutorSessionsFamily._dependencies,
          allTransitiveDependencies:
              TutorSessionsFamily._allTransitiveDependencies,
          childId: childId,
        );

  TutorSessionsProvider._internal(
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
    FutureOr<List<TutorSession>> Function(TutorSessionsRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: TutorSessionsProvider._internal(
        (ref) => create(ref as TutorSessionsRef),
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
  AutoDisposeFutureProviderElement<List<TutorSession>> createElement() {
    return _TutorSessionsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is TutorSessionsProvider && other.childId == childId;
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
mixin TutorSessionsRef on AutoDisposeFutureProviderRef<List<TutorSession>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _TutorSessionsProviderElement
    extends AutoDisposeFutureProviderElement<List<TutorSession>>
    with TutorSessionsRef {
  _TutorSessionsProviderElement(super.provider);

  @override
  String get childId => (origin as TutorSessionsProvider).childId;
}

String _$tutorSessionReportHash() =>
    r'a6d6e217afa45e08a376b4edf4971074755c61e6';

/// Provider for a single session's detailed report.
///
/// Copied from [tutorSessionReport].
@ProviderFor(tutorSessionReport)
const tutorSessionReportProvider = TutorSessionReportFamily();

/// Provider for a single session's detailed report.
///
/// Copied from [tutorSessionReport].
class TutorSessionReportFamily extends Family<AsyncValue<TutorSessionReport>> {
  /// Provider for a single session's detailed report.
  ///
  /// Copied from [tutorSessionReport].
  const TutorSessionReportFamily();

  /// Provider for a single session's detailed report.
  ///
  /// Copied from [tutorSessionReport].
  TutorSessionReportProvider call(
    String childId,
    String sessionId,
  ) {
    return TutorSessionReportProvider(
      childId,
      sessionId,
    );
  }

  @override
  TutorSessionReportProvider getProviderOverride(
    covariant TutorSessionReportProvider provider,
  ) {
    return call(
      provider.childId,
      provider.sessionId,
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
  String? get name => r'tutorSessionReportProvider';
}

/// Provider for a single session's detailed report.
///
/// Copied from [tutorSessionReport].
class TutorSessionReportProvider
    extends AutoDisposeFutureProvider<TutorSessionReport> {
  /// Provider for a single session's detailed report.
  ///
  /// Copied from [tutorSessionReport].
  TutorSessionReportProvider(
    String childId,
    String sessionId,
  ) : this._internal(
          (ref) => tutorSessionReport(
            ref as TutorSessionReportRef,
            childId,
            sessionId,
          ),
          from: tutorSessionReportProvider,
          name: r'tutorSessionReportProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$tutorSessionReportHash,
          dependencies: TutorSessionReportFamily._dependencies,
          allTransitiveDependencies:
              TutorSessionReportFamily._allTransitiveDependencies,
          childId: childId,
          sessionId: sessionId,
        );

  TutorSessionReportProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
    required this.sessionId,
  }) : super.internal();

  final String childId;
  final String sessionId;

  @override
  Override overrideWith(
    FutureOr<TutorSessionReport> Function(TutorSessionReportRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: TutorSessionReportProvider._internal(
        (ref) => create(ref as TutorSessionReportRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
        sessionId: sessionId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<TutorSessionReport> createElement() {
    return _TutorSessionReportProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is TutorSessionReportProvider &&
        other.childId == childId &&
        other.sessionId == sessionId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);
    hash = _SystemHash.combine(hash, sessionId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin TutorSessionReportRef
    on AutoDisposeFutureProviderRef<TutorSessionReport> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `sessionId` of this provider.
  String get sessionId;
}

class _TutorSessionReportProviderElement
    extends AutoDisposeFutureProviderElement<TutorSessionReport>
    with TutorSessionReportRef {
  _TutorSessionReportProviderElement(super.provider);

  @override
  String get childId => (origin as TutorSessionReportProvider).childId;
  @override
  String get sessionId => (origin as TutorSessionReportProvider).sessionId;
}

String _$tutorAnalyticsSummaryHash() =>
    r'6a5e018ef036cfee8c67995f21bae60575406c75';

/// Provider for the aggregated analytics summary.
///
/// Copied from [tutorAnalyticsSummary].
@ProviderFor(tutorAnalyticsSummary)
const tutorAnalyticsSummaryProvider = TutorAnalyticsSummaryFamily();

/// Provider for the aggregated analytics summary.
///
/// Copied from [tutorAnalyticsSummary].
class TutorAnalyticsSummaryFamily
    extends Family<AsyncValue<TutorAnalyticsSummary>> {
  /// Provider for the aggregated analytics summary.
  ///
  /// Copied from [tutorAnalyticsSummary].
  const TutorAnalyticsSummaryFamily();

  /// Provider for the aggregated analytics summary.
  ///
  /// Copied from [tutorAnalyticsSummary].
  TutorAnalyticsSummaryProvider call({
    String? learnerId,
    int days = 30,
  }) {
    return TutorAnalyticsSummaryProvider(
      learnerId: learnerId,
      days: days,
    );
  }

  @override
  TutorAnalyticsSummaryProvider getProviderOverride(
    covariant TutorAnalyticsSummaryProvider provider,
  ) {
    return call(
      learnerId: provider.learnerId,
      days: provider.days,
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
  String? get name => r'tutorAnalyticsSummaryProvider';
}

/// Provider for the aggregated analytics summary.
///
/// Copied from [tutorAnalyticsSummary].
class TutorAnalyticsSummaryProvider
    extends AutoDisposeFutureProvider<TutorAnalyticsSummary> {
  /// Provider for the aggregated analytics summary.
  ///
  /// Copied from [tutorAnalyticsSummary].
  TutorAnalyticsSummaryProvider({
    String? learnerId,
    int days = 30,
  }) : this._internal(
          (ref) => tutorAnalyticsSummary(
            ref as TutorAnalyticsSummaryRef,
            learnerId: learnerId,
            days: days,
          ),
          from: tutorAnalyticsSummaryProvider,
          name: r'tutorAnalyticsSummaryProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$tutorAnalyticsSummaryHash,
          dependencies: TutorAnalyticsSummaryFamily._dependencies,
          allTransitiveDependencies:
              TutorAnalyticsSummaryFamily._allTransitiveDependencies,
          learnerId: learnerId,
          days: days,
        );

  TutorAnalyticsSummaryProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.learnerId,
    required this.days,
  }) : super.internal();

  final String? learnerId;
  final int days;

  @override
  Override overrideWith(
    FutureOr<TutorAnalyticsSummary> Function(TutorAnalyticsSummaryRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: TutorAnalyticsSummaryProvider._internal(
        (ref) => create(ref as TutorAnalyticsSummaryRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        learnerId: learnerId,
        days: days,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<TutorAnalyticsSummary> createElement() {
    return _TutorAnalyticsSummaryProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is TutorAnalyticsSummaryProvider &&
        other.learnerId == learnerId &&
        other.days == days;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, learnerId.hashCode);
    hash = _SystemHash.combine(hash, days.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin TutorAnalyticsSummaryRef
    on AutoDisposeFutureProviderRef<TutorAnalyticsSummary> {
  /// The parameter `learnerId` of this provider.
  String? get learnerId;

  /// The parameter `days` of this provider.
  int get days;
}

class _TutorAnalyticsSummaryProviderElement
    extends AutoDisposeFutureProviderElement<TutorAnalyticsSummary>
    with TutorAnalyticsSummaryRef {
  _TutorAnalyticsSummaryProviderElement(super.provider);

  @override
  String? get learnerId => (origin as TutorAnalyticsSummaryProvider).learnerId;
  @override
  int get days => (origin as TutorAnalyticsSummaryProvider).days;
}

String _$tutorAnalyticsSessionsHash() =>
    r'b96cff54aed7bdc66476469d6707a9b112756920';

/// Provider for paginated analytics sessions.
///
/// Copied from [tutorAnalyticsSessions].
@ProviderFor(tutorAnalyticsSessions)
const tutorAnalyticsSessionsProvider = TutorAnalyticsSessionsFamily();

/// Provider for paginated analytics sessions.
///
/// Copied from [tutorAnalyticsSessions].
class TutorAnalyticsSessionsFamily
    extends Family<AsyncValue<AnalyticsSessionsResponse>> {
  /// Provider for paginated analytics sessions.
  ///
  /// Copied from [tutorAnalyticsSessions].
  const TutorAnalyticsSessionsFamily();

  /// Provider for paginated analytics sessions.
  ///
  /// Copied from [tutorAnalyticsSessions].
  TutorAnalyticsSessionsProvider call({
    required String learnerId,
    String? subject,
    int page = 1,
  }) {
    return TutorAnalyticsSessionsProvider(
      learnerId: learnerId,
      subject: subject,
      page: page,
    );
  }

  @override
  TutorAnalyticsSessionsProvider getProviderOverride(
    covariant TutorAnalyticsSessionsProvider provider,
  ) {
    return call(
      learnerId: provider.learnerId,
      subject: provider.subject,
      page: provider.page,
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
  String? get name => r'tutorAnalyticsSessionsProvider';
}

/// Provider for paginated analytics sessions.
///
/// Copied from [tutorAnalyticsSessions].
class TutorAnalyticsSessionsProvider
    extends AutoDisposeFutureProvider<AnalyticsSessionsResponse> {
  /// Provider for paginated analytics sessions.
  ///
  /// Copied from [tutorAnalyticsSessions].
  TutorAnalyticsSessionsProvider({
    required String learnerId,
    String? subject,
    int page = 1,
  }) : this._internal(
          (ref) => tutorAnalyticsSessions(
            ref as TutorAnalyticsSessionsRef,
            learnerId: learnerId,
            subject: subject,
            page: page,
          ),
          from: tutorAnalyticsSessionsProvider,
          name: r'tutorAnalyticsSessionsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$tutorAnalyticsSessionsHash,
          dependencies: TutorAnalyticsSessionsFamily._dependencies,
          allTransitiveDependencies:
              TutorAnalyticsSessionsFamily._allTransitiveDependencies,
          learnerId: learnerId,
          subject: subject,
          page: page,
        );

  TutorAnalyticsSessionsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.learnerId,
    required this.subject,
    required this.page,
  }) : super.internal();

  final String learnerId;
  final String? subject;
  final int page;

  @override
  Override overrideWith(
    FutureOr<AnalyticsSessionsResponse> Function(
            TutorAnalyticsSessionsRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: TutorAnalyticsSessionsProvider._internal(
        (ref) => create(ref as TutorAnalyticsSessionsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        learnerId: learnerId,
        subject: subject,
        page: page,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<AnalyticsSessionsResponse> createElement() {
    return _TutorAnalyticsSessionsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is TutorAnalyticsSessionsProvider &&
        other.learnerId == learnerId &&
        other.subject == subject &&
        other.page == page;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, learnerId.hashCode);
    hash = _SystemHash.combine(hash, subject.hashCode);
    hash = _SystemHash.combine(hash, page.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin TutorAnalyticsSessionsRef
    on AutoDisposeFutureProviderRef<AnalyticsSessionsResponse> {
  /// The parameter `learnerId` of this provider.
  String get learnerId;

  /// The parameter `subject` of this provider.
  String? get subject;

  /// The parameter `page` of this provider.
  int get page;
}

class _TutorAnalyticsSessionsProviderElement
    extends AutoDisposeFutureProviderElement<AnalyticsSessionsResponse>
    with TutorAnalyticsSessionsRef {
  _TutorAnalyticsSessionsProviderElement(super.provider);

  @override
  String get learnerId => (origin as TutorAnalyticsSessionsProvider).learnerId;
  @override
  String? get subject => (origin as TutorAnalyticsSessionsProvider).subject;
  @override
  int get page => (origin as TutorAnalyticsSessionsProvider).page;
}

String _$tutorTranscriptHash() => r'32773aa6c9004fb5e60464eafe928db3ff322b9d';

/// Provider for a session transcript.
///
/// Copied from [tutorTranscript].
@ProviderFor(tutorTranscript)
const tutorTranscriptProvider = TutorTranscriptFamily();

/// Provider for a session transcript.
///
/// Copied from [tutorTranscript].
class TutorTranscriptFamily extends Family<AsyncValue<TranscriptResponse>> {
  /// Provider for a session transcript.
  ///
  /// Copied from [tutorTranscript].
  const TutorTranscriptFamily();

  /// Provider for a session transcript.
  ///
  /// Copied from [tutorTranscript].
  TutorTranscriptProvider call(
    String sessionId,
  ) {
    return TutorTranscriptProvider(
      sessionId,
    );
  }

  @override
  TutorTranscriptProvider getProviderOverride(
    covariant TutorTranscriptProvider provider,
  ) {
    return call(
      provider.sessionId,
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
  String? get name => r'tutorTranscriptProvider';
}

/// Provider for a session transcript.
///
/// Copied from [tutorTranscript].
class TutorTranscriptProvider
    extends AutoDisposeFutureProvider<TranscriptResponse> {
  /// Provider for a session transcript.
  ///
  /// Copied from [tutorTranscript].
  TutorTranscriptProvider(
    String sessionId,
  ) : this._internal(
          (ref) => tutorTranscript(
            ref as TutorTranscriptRef,
            sessionId,
          ),
          from: tutorTranscriptProvider,
          name: r'tutorTranscriptProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$tutorTranscriptHash,
          dependencies: TutorTranscriptFamily._dependencies,
          allTransitiveDependencies:
              TutorTranscriptFamily._allTransitiveDependencies,
          sessionId: sessionId,
        );

  TutorTranscriptProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.sessionId,
  }) : super.internal();

  final String sessionId;

  @override
  Override overrideWith(
    FutureOr<TranscriptResponse> Function(TutorTranscriptRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: TutorTranscriptProvider._internal(
        (ref) => create(ref as TutorTranscriptRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        sessionId: sessionId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<TranscriptResponse> createElement() {
    return _TutorTranscriptProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is TutorTranscriptProvider && other.sessionId == sessionId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, sessionId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin TutorTranscriptRef on AutoDisposeFutureProviderRef<TranscriptResponse> {
  /// The parameter `sessionId` of this provider.
  String get sessionId;
}

class _TutorTranscriptProviderElement
    extends AutoDisposeFutureProviderElement<TranscriptResponse>
    with TutorTranscriptRef {
  _TutorTranscriptProviderElement(super.provider);

  @override
  String get sessionId => (origin as TutorTranscriptProvider).sessionId;
}

String _$tutorPurchaseNotifierHash() =>
    r'49c13a2356073ff2d8a486c15197d2931732fa25';

/// Notifier for purchasing a tutor add-on.
///
/// Copied from [TutorPurchaseNotifier].
@ProviderFor(TutorPurchaseNotifier)
final tutorPurchaseNotifierProvider = AutoDisposeNotifierProvider<
    TutorPurchaseNotifier, AsyncValue<void>>.internal(
  TutorPurchaseNotifier.new,
  name: r'tutorPurchaseNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$tutorPurchaseNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$TutorPurchaseNotifier = AutoDisposeNotifier<AsyncValue<void>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
