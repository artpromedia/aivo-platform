// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dashboard_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$parentProfileHash() => r'2e792ca0036c0ae4ec32e72301f61c55eb0e2f3a';

/// See also [parentProfile].
@ProviderFor(parentProfile)
final parentProfileProvider = AutoDisposeFutureProvider<ParentProfile>.internal(
  parentProfile,
  name: r'parentProfileProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$parentProfileHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef ParentProfileRef = AutoDisposeFutureProviderRef<ParentProfile>;
String _$studentSummaryHash() => r'c9fe783eee342330f4c0a836dbe3aa7a1fae1687';

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

/// See also [studentSummary].
@ProviderFor(studentSummary)
const studentSummaryProvider = StudentSummaryFamily();

/// See also [studentSummary].
class StudentSummaryFamily extends Family<AsyncValue<StudentSummary>> {
  /// See also [studentSummary].
  const StudentSummaryFamily();

  /// See also [studentSummary].
  StudentSummaryProvider call(
    String studentId,
  ) {
    return StudentSummaryProvider(
      studentId,
    );
  }

  @override
  StudentSummaryProvider getProviderOverride(
    covariant StudentSummaryProvider provider,
  ) {
    return call(
      provider.studentId,
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
  String? get name => r'studentSummaryProvider';
}

/// See also [studentSummary].
class StudentSummaryProvider extends AutoDisposeFutureProvider<StudentSummary> {
  /// See also [studentSummary].
  StudentSummaryProvider(
    String studentId,
  ) : this._internal(
          (ref) => studentSummary(
            ref as StudentSummaryRef,
            studentId,
          ),
          from: studentSummaryProvider,
          name: r'studentSummaryProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$studentSummaryHash,
          dependencies: StudentSummaryFamily._dependencies,
          allTransitiveDependencies:
              StudentSummaryFamily._allTransitiveDependencies,
          studentId: studentId,
        );

  StudentSummaryProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.studentId,
  }) : super.internal();

  final String studentId;

  @override
  Override overrideWith(
    FutureOr<StudentSummary> Function(StudentSummaryRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: StudentSummaryProvider._internal(
        (ref) => create(ref as StudentSummaryRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        studentId: studentId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<StudentSummary> createElement() {
    return _StudentSummaryProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is StudentSummaryProvider && other.studentId == studentId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, studentId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin StudentSummaryRef on AutoDisposeFutureProviderRef<StudentSummary> {
  /// The parameter `studentId` of this provider.
  String get studentId;
}

class _StudentSummaryProviderElement
    extends AutoDisposeFutureProviderElement<StudentSummary>
    with StudentSummaryRef {
  _StudentSummaryProviderElement(super.provider);

  @override
  String get studentId => (origin as StudentSummaryProvider).studentId;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
