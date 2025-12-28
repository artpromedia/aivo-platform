// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reports_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$reportChildrenHash() => r'fb82332dcb79d729d20109e94092819b4dc5d73a';

/// See also [reportChildren].
@ProviderFor(reportChildren)
final reportChildrenProvider =
    AutoDisposeFutureProvider<List<ChildInfo>>.internal(
  reportChildren,
  name: r'reportChildrenProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$reportChildrenHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef ReportChildrenRef = AutoDisposeFutureProviderRef<List<ChildInfo>>;
String _$progressReportHash() => r'6ebda2a93940987959bf0260089683a214b4d435';

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

/// See also [progressReport].
@ProviderFor(progressReport)
const progressReportProvider = ProgressReportFamily();

/// See also [progressReport].
class ProgressReportFamily extends Family<AsyncValue<ProgressReport>> {
  /// See also [progressReport].
  const ProgressReportFamily();

  /// See also [progressReport].
  ProgressReportProvider call({
    required String studentId,
    required String period,
  }) {
    return ProgressReportProvider(
      studentId: studentId,
      period: period,
    );
  }

  @override
  ProgressReportProvider getProviderOverride(
    covariant ProgressReportProvider provider,
  ) {
    return call(
      studentId: provider.studentId,
      period: provider.period,
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
  String? get name => r'progressReportProvider';
}

/// See also [progressReport].
class ProgressReportProvider extends AutoDisposeFutureProvider<ProgressReport> {
  /// See also [progressReport].
  ProgressReportProvider({
    required String studentId,
    required String period,
  }) : this._internal(
          (ref) => progressReport(
            ref as ProgressReportRef,
            studentId: studentId,
            period: period,
          ),
          from: progressReportProvider,
          name: r'progressReportProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$progressReportHash,
          dependencies: ProgressReportFamily._dependencies,
          allTransitiveDependencies:
              ProgressReportFamily._allTransitiveDependencies,
          studentId: studentId,
          period: period,
        );

  ProgressReportProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.studentId,
    required this.period,
  }) : super.internal();

  final String studentId;
  final String period;

  @override
  Override overrideWith(
    FutureOr<ProgressReport> Function(ProgressReportRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ProgressReportProvider._internal(
        (ref) => create(ref as ProgressReportRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        studentId: studentId,
        period: period,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<ProgressReport> createElement() {
    return _ProgressReportProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgressReportProvider &&
        other.studentId == studentId &&
        other.period == period;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, studentId.hashCode);
    hash = _SystemHash.combine(hash, period.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin ProgressReportRef on AutoDisposeFutureProviderRef<ProgressReport> {
  /// The parameter `studentId` of this provider.
  String get studentId;

  /// The parameter `period` of this provider.
  String get period;
}

class _ProgressReportProviderElement
    extends AutoDisposeFutureProviderElement<ProgressReport>
    with ProgressReportRef {
  _ProgressReportProviderElement(super.provider);

  @override
  String get studentId => (origin as ProgressReportProvider).studentId;
  @override
  String get period => (origin as ProgressReportProvider).period;
}

String _$downloadReportHash() => r'27fbe2dfcb936a1de3fc72e8342d99d23ca0da02';

/// See also [downloadReport].
@ProviderFor(downloadReport)
const downloadReportProvider = DownloadReportFamily();

/// See also [downloadReport].
class DownloadReportFamily extends Family<AsyncValue<void>> {
  /// See also [downloadReport].
  const DownloadReportFamily();

  /// See also [downloadReport].
  DownloadReportProvider call({
    required String studentId,
    required String period,
  }) {
    return DownloadReportProvider(
      studentId: studentId,
      period: period,
    );
  }

  @override
  DownloadReportProvider getProviderOverride(
    covariant DownloadReportProvider provider,
  ) {
    return call(
      studentId: provider.studentId,
      period: provider.period,
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
  String? get name => r'downloadReportProvider';
}

/// See also [downloadReport].
class DownloadReportProvider extends AutoDisposeFutureProvider<void> {
  /// See also [downloadReport].
  DownloadReportProvider({
    required String studentId,
    required String period,
  }) : this._internal(
          (ref) => downloadReport(
            ref as DownloadReportRef,
            studentId: studentId,
            period: period,
          ),
          from: downloadReportProvider,
          name: r'downloadReportProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$downloadReportHash,
          dependencies: DownloadReportFamily._dependencies,
          allTransitiveDependencies:
              DownloadReportFamily._allTransitiveDependencies,
          studentId: studentId,
          period: period,
        );

  DownloadReportProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.studentId,
    required this.period,
  }) : super.internal();

  final String studentId;
  final String period;

  @override
  Override overrideWith(
    FutureOr<void> Function(DownloadReportRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: DownloadReportProvider._internal(
        (ref) => create(ref as DownloadReportRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        studentId: studentId,
        period: period,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<void> createElement() {
    return _DownloadReportProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is DownloadReportProvider &&
        other.studentId == studentId &&
        other.period == period;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, studentId.hashCode);
    hash = _SystemHash.combine(hash, period.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin DownloadReportRef on AutoDisposeFutureProviderRef<void> {
  /// The parameter `studentId` of this provider.
  String get studentId;

  /// The parameter `period` of this provider.
  String get period;
}

class _DownloadReportProviderElement
    extends AutoDisposeFutureProviderElement<void> with DownloadReportRef {
  _DownloadReportProviderElement(super.provider);

  @override
  String get studentId => (origin as DownloadReportProvider).studentId;
  @override
  String get period => (origin as DownloadReportProvider).period;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
