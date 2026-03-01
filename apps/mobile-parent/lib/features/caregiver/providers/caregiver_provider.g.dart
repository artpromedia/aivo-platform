// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'caregiver_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$studentCaregiversHash() => r'fd790b0a2efdb53ef5dbbb5f9b3f613bd2d7f4d3';

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

/// Fetches the caregiver summary (active + pending) for a student.
///
/// Copied from [studentCaregivers].
@ProviderFor(studentCaregivers)
const studentCaregiversProvider = StudentCaregiversFamily();

/// Fetches the caregiver summary (active + pending) for a student.
///
/// Copied from [studentCaregivers].
class StudentCaregiversFamily
    extends Family<AsyncValue<StudentCaregiverSummary>> {
  /// Fetches the caregiver summary (active + pending) for a student.
  ///
  /// Copied from [studentCaregivers].
  const StudentCaregiversFamily();

  /// Fetches the caregiver summary (active + pending) for a student.
  ///
  /// Copied from [studentCaregivers].
  StudentCaregiversProvider call(
    String studentId,
  ) {
    return StudentCaregiversProvider(
      studentId,
    );
  }

  @override
  StudentCaregiversProvider getProviderOverride(
    covariant StudentCaregiversProvider provider,
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
  String? get name => r'studentCaregiversProvider';
}

/// Fetches the caregiver summary (active + pending) for a student.
///
/// Copied from [studentCaregivers].
class StudentCaregiversProvider
    extends AutoDisposeFutureProvider<StudentCaregiverSummary> {
  /// Fetches the caregiver summary (active + pending) for a student.
  ///
  /// Copied from [studentCaregivers].
  StudentCaregiversProvider(
    String studentId,
  ) : this._internal(
          (ref) => studentCaregivers(
            ref as StudentCaregiversRef,
            studentId,
          ),
          from: studentCaregiversProvider,
          name: r'studentCaregiversProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$studentCaregiversHash,
          dependencies: StudentCaregiversFamily._dependencies,
          allTransitiveDependencies:
              StudentCaregiversFamily._allTransitiveDependencies,
          studentId: studentId,
        );

  StudentCaregiversProvider._internal(
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
    FutureOr<StudentCaregiverSummary> Function(StudentCaregiversRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: StudentCaregiversProvider._internal(
        (ref) => create(ref as StudentCaregiversRef),
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
  AutoDisposeFutureProviderElement<StudentCaregiverSummary> createElement() {
    return _StudentCaregiversProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is StudentCaregiversProvider && other.studentId == studentId;
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
mixin StudentCaregiversRef
    on AutoDisposeFutureProviderRef<StudentCaregiverSummary> {
  /// The parameter `studentId` of this provider.
  String get studentId;
}

class _StudentCaregiversProviderElement
    extends AutoDisposeFutureProviderElement<StudentCaregiverSummary>
    with StudentCaregiversRef {
  _StudentCaregiversProviderElement(super.provider);

  @override
  String get studentId => (origin as StudentCaregiversProvider).studentId;
}

String _$caregiverLimitHash() => r'71af90867ef758cfc7c3d551e2e8a0fd90725be8';

/// Fetches caregiver slot limit information for a student.
///
/// Copied from [caregiverLimit].
@ProviderFor(caregiverLimit)
const caregiverLimitProvider = CaregiverLimitFamily();

/// Fetches caregiver slot limit information for a student.
///
/// Copied from [caregiverLimit].
class CaregiverLimitFamily extends Family<AsyncValue<CaregiverLimitInfo>> {
  /// Fetches caregiver slot limit information for a student.
  ///
  /// Copied from [caregiverLimit].
  const CaregiverLimitFamily();

  /// Fetches caregiver slot limit information for a student.
  ///
  /// Copied from [caregiverLimit].
  CaregiverLimitProvider call(
    String studentId,
  ) {
    return CaregiverLimitProvider(
      studentId,
    );
  }

  @override
  CaregiverLimitProvider getProviderOverride(
    covariant CaregiverLimitProvider provider,
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
  String? get name => r'caregiverLimitProvider';
}

/// Fetches caregiver slot limit information for a student.
///
/// Copied from [caregiverLimit].
class CaregiverLimitProvider
    extends AutoDisposeFutureProvider<CaregiverLimitInfo> {
  /// Fetches caregiver slot limit information for a student.
  ///
  /// Copied from [caregiverLimit].
  CaregiverLimitProvider(
    String studentId,
  ) : this._internal(
          (ref) => caregiverLimit(
            ref as CaregiverLimitRef,
            studentId,
          ),
          from: caregiverLimitProvider,
          name: r'caregiverLimitProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$caregiverLimitHash,
          dependencies: CaregiverLimitFamily._dependencies,
          allTransitiveDependencies:
              CaregiverLimitFamily._allTransitiveDependencies,
          studentId: studentId,
        );

  CaregiverLimitProvider._internal(
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
    FutureOr<CaregiverLimitInfo> Function(CaregiverLimitRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: CaregiverLimitProvider._internal(
        (ref) => create(ref as CaregiverLimitRef),
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
  AutoDisposeFutureProviderElement<CaregiverLimitInfo> createElement() {
    return _CaregiverLimitProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is CaregiverLimitProvider && other.studentId == studentId;
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
mixin CaregiverLimitRef on AutoDisposeFutureProviderRef<CaregiverLimitInfo> {
  /// The parameter `studentId` of this provider.
  String get studentId;
}

class _CaregiverLimitProviderElement
    extends AutoDisposeFutureProviderElement<CaregiverLimitInfo>
    with CaregiverLimitRef {
  _CaregiverLimitProviderElement(super.provider);

  @override
  String get studentId => (origin as CaregiverLimitProvider).studentId;
}

String _$inviteCaregiverNotifierHash() =>
    r'8468b76579678ec5c8dcefbed3419e2dcd05e3ec';

/// Notifier for creating caregiver invitations.
///
/// Copied from [InviteCaregiverNotifier].
@ProviderFor(InviteCaregiverNotifier)
final inviteCaregiverNotifierProvider = AutoDisposeNotifierProvider<
    InviteCaregiverNotifier, AsyncValue<CaregiverInviteResponse?>>.internal(
  InviteCaregiverNotifier.new,
  name: r'inviteCaregiverNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$inviteCaregiverNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$InviteCaregiverNotifier
    = AutoDisposeNotifier<AsyncValue<CaregiverInviteResponse?>>;
String _$revokeCaregiverNotifierHash() =>
    r'334eb4ba0585dec586777b53bde9fea367d1c334';

/// Notifier for revoking caregiver access.
///
/// Copied from [RevokeCaregiverNotifier].
@ProviderFor(RevokeCaregiverNotifier)
final revokeCaregiverNotifierProvider = AutoDisposeNotifierProvider<
    RevokeCaregiverNotifier, AsyncValue<void>>.internal(
  RevokeCaregiverNotifier.new,
  name: r'revokeCaregiverNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$revokeCaregiverNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$RevokeCaregiverNotifier = AutoDisposeNotifier<AsyncValue<void>>;
String _$updatePermissionsNotifierHash() =>
    r'7431128d3c73315f8b4325f23de77a172fcdec80';

/// Notifier for updating caregiver permissions.
///
/// Copied from [UpdatePermissionsNotifier].
@ProviderFor(UpdatePermissionsNotifier)
final updatePermissionsNotifierProvider = AutoDisposeNotifierProvider<
    UpdatePermissionsNotifier, AsyncValue<void>>.internal(
  UpdatePermissionsNotifier.new,
  name: r'updatePermissionsNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$updatePermissionsNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$UpdatePermissionsNotifier = AutoDisposeNotifier<AsyncValue<void>>;
String _$resendInviteNotifierHash() =>
    r'28049fa53a5e371d8fd0091b1a21290c9e4bd3a3';

/// Notifier for resending caregiver invitations.
///
/// Copied from [ResendInviteNotifier].
@ProviderFor(ResendInviteNotifier)
final resendInviteNotifierProvider = AutoDisposeNotifierProvider<
    ResendInviteNotifier, AsyncValue<void>>.internal(
  ResendInviteNotifier.new,
  name: r'resendInviteNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$resendInviteNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$ResendInviteNotifier = AutoDisposeNotifier<AsyncValue<void>>;
String _$cancelInviteNotifierHash() =>
    r'3dfc7b1096932999091bd76b2c23dbefb19779f3';

/// Notifier for cancelling caregiver invitations.
///
/// Copied from [CancelInviteNotifier].
@ProviderFor(CancelInviteNotifier)
final cancelInviteNotifierProvider = AutoDisposeNotifierProvider<
    CancelInviteNotifier, AsyncValue<void>>.internal(
  CancelInviteNotifier.new,
  name: r'cancelInviteNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$cancelInviteNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$CancelInviteNotifier = AutoDisposeNotifier<AsyncValue<void>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
