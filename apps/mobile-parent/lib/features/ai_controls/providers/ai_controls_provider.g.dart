// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ai_controls_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$autonomySettingsHash() => r'7f6a96cb608e3e3aa62c5cc5c01946acb5ddc11b';

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

/// Provider for autonomy settings for a child.
///
/// Copied from [autonomySettings].
@ProviderFor(autonomySettings)
const autonomySettingsProvider = AutonomySettingsFamily();

/// Provider for autonomy settings for a child.
///
/// Copied from [autonomySettings].
class AutonomySettingsFamily extends Family<AsyncValue<AIAutonomySettings>> {
  /// Provider for autonomy settings for a child.
  ///
  /// Copied from [autonomySettings].
  const AutonomySettingsFamily();

  /// Provider for autonomy settings for a child.
  ///
  /// Copied from [autonomySettings].
  AutonomySettingsProvider call(
    String childId,
  ) {
    return AutonomySettingsProvider(
      childId,
    );
  }

  @override
  AutonomySettingsProvider getProviderOverride(
    covariant AutonomySettingsProvider provider,
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
  String? get name => r'autonomySettingsProvider';
}

/// Provider for autonomy settings for a child.
///
/// Copied from [autonomySettings].
class AutonomySettingsProvider
    extends AutoDisposeFutureProvider<AIAutonomySettings> {
  /// Provider for autonomy settings for a child.
  ///
  /// Copied from [autonomySettings].
  AutonomySettingsProvider(
    String childId,
  ) : this._internal(
          (ref) => autonomySettings(
            ref as AutonomySettingsRef,
            childId,
          ),
          from: autonomySettingsProvider,
          name: r'autonomySettingsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$autonomySettingsHash,
          dependencies: AutonomySettingsFamily._dependencies,
          allTransitiveDependencies:
              AutonomySettingsFamily._allTransitiveDependencies,
          childId: childId,
        );

  AutonomySettingsProvider._internal(
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
    FutureOr<AIAutonomySettings> Function(AutonomySettingsRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: AutonomySettingsProvider._internal(
        (ref) => create(ref as AutonomySettingsRef),
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
  AutoDisposeFutureProviderElement<AIAutonomySettings> createElement() {
    return _AutonomySettingsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AutonomySettingsProvider && other.childId == childId;
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
mixin AutonomySettingsRef on AutoDisposeFutureProviderRef<AIAutonomySettings> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _AutonomySettingsProviderElement
    extends AutoDisposeFutureProviderElement<AIAutonomySettings>
    with AutonomySettingsRef {
  _AutonomySettingsProviderElement(super.provider);

  @override
  String get childId => (origin as AutonomySettingsProvider).childId;
}

String _$pendingApprovalsHash() => r'7196931ac426a0a946cf577a34a5cf39b9785e30';

/// Provider for pending approval requests.
///
/// Copied from [pendingApprovals].
@ProviderFor(pendingApprovals)
const pendingApprovalsProvider = PendingApprovalsFamily();

/// Provider for pending approval requests.
///
/// Copied from [pendingApprovals].
class PendingApprovalsFamily extends Family<AsyncValue<List<ApprovalRequest>>> {
  /// Provider for pending approval requests.
  ///
  /// Copied from [pendingApprovals].
  const PendingApprovalsFamily();

  /// Provider for pending approval requests.
  ///
  /// Copied from [pendingApprovals].
  PendingApprovalsProvider call(
    String childId,
  ) {
    return PendingApprovalsProvider(
      childId,
    );
  }

  @override
  PendingApprovalsProvider getProviderOverride(
    covariant PendingApprovalsProvider provider,
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
  String? get name => r'pendingApprovalsProvider';
}

/// Provider for pending approval requests.
///
/// Copied from [pendingApprovals].
class PendingApprovalsProvider
    extends AutoDisposeFutureProvider<List<ApprovalRequest>> {
  /// Provider for pending approval requests.
  ///
  /// Copied from [pendingApprovals].
  PendingApprovalsProvider(
    String childId,
  ) : this._internal(
          (ref) => pendingApprovals(
            ref as PendingApprovalsRef,
            childId,
          ),
          from: pendingApprovalsProvider,
          name: r'pendingApprovalsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$pendingApprovalsHash,
          dependencies: PendingApprovalsFamily._dependencies,
          allTransitiveDependencies:
              PendingApprovalsFamily._allTransitiveDependencies,
          childId: childId,
        );

  PendingApprovalsProvider._internal(
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
    FutureOr<List<ApprovalRequest>> Function(PendingApprovalsRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: PendingApprovalsProvider._internal(
        (ref) => create(ref as PendingApprovalsRef),
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
  AutoDisposeFutureProviderElement<List<ApprovalRequest>> createElement() {
    return _PendingApprovalsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is PendingApprovalsProvider && other.childId == childId;
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
mixin PendingApprovalsRef
    on AutoDisposeFutureProviderRef<List<ApprovalRequest>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _PendingApprovalsProviderElement
    extends AutoDisposeFutureProviderElement<List<ApprovalRequest>>
    with PendingApprovalsRef {
  _PendingApprovalsProviderElement(super.provider);

  @override
  String get childId => (origin as PendingApprovalsProvider).childId;
}

String _$approvalHistoryHash() => r'e7ec9e34a0ea03dd7111493f84267a3fb5cc0a06';

/// Provider for approval request history.
///
/// Copied from [approvalHistory].
@ProviderFor(approvalHistory)
const approvalHistoryProvider = ApprovalHistoryFamily();

/// Provider for approval request history.
///
/// Copied from [approvalHistory].
class ApprovalHistoryFamily extends Family<AsyncValue<List<ApprovalRequest>>> {
  /// Provider for approval request history.
  ///
  /// Copied from [approvalHistory].
  const ApprovalHistoryFamily();

  /// Provider for approval request history.
  ///
  /// Copied from [approvalHistory].
  ApprovalHistoryProvider call(
    String childId,
  ) {
    return ApprovalHistoryProvider(
      childId,
    );
  }

  @override
  ApprovalHistoryProvider getProviderOverride(
    covariant ApprovalHistoryProvider provider,
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
  String? get name => r'approvalHistoryProvider';
}

/// Provider for approval request history.
///
/// Copied from [approvalHistory].
class ApprovalHistoryProvider
    extends AutoDisposeFutureProvider<List<ApprovalRequest>> {
  /// Provider for approval request history.
  ///
  /// Copied from [approvalHistory].
  ApprovalHistoryProvider(
    String childId,
  ) : this._internal(
          (ref) => approvalHistory(
            ref as ApprovalHistoryRef,
            childId,
          ),
          from: approvalHistoryProvider,
          name: r'approvalHistoryProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$approvalHistoryHash,
          dependencies: ApprovalHistoryFamily._dependencies,
          allTransitiveDependencies:
              ApprovalHistoryFamily._allTransitiveDependencies,
          childId: childId,
        );

  ApprovalHistoryProvider._internal(
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
    FutureOr<List<ApprovalRequest>> Function(ApprovalHistoryRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ApprovalHistoryProvider._internal(
        (ref) => create(ref as ApprovalHistoryRef),
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
  AutoDisposeFutureProviderElement<List<ApprovalRequest>> createElement() {
    return _ApprovalHistoryProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ApprovalHistoryProvider && other.childId == childId;
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
mixin ApprovalHistoryRef
    on AutoDisposeFutureProviderRef<List<ApprovalRequest>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _ApprovalHistoryProviderElement
    extends AutoDisposeFutureProviderElement<List<ApprovalRequest>>
    with ApprovalHistoryRef {
  _ApprovalHistoryProviderElement(super.provider);

  @override
  String get childId => (origin as ApprovalHistoryProvider).childId;
}

String _$autonomyPresetsHash() => r'45aeee440376fb7f6f26ac80a10046bfa5202a1a';

/// Provider for available autonomy presets.
///
/// Copied from [autonomyPresets].
@ProviderFor(autonomyPresets)
final autonomyPresetsProvider =
    AutoDisposeFutureProvider<List<AutonomyPreset>>.internal(
  autonomyPresets,
  name: r'autonomyPresetsProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$autonomyPresetsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef AutonomyPresetsRef = AutoDisposeFutureProviderRef<List<AutonomyPreset>>;
String _$aiActivityLogHash() => r'e44045324f96cf54a2efa05ab580ec90d526e31e';

/// Provider for AI activity log.
///
/// Copied from [aiActivityLog].
@ProviderFor(aiActivityLog)
const aiActivityLogProvider = AiActivityLogFamily();

/// Provider for AI activity log.
///
/// Copied from [aiActivityLog].
class AiActivityLogFamily extends Family<AsyncValue<List<AIActivityEntry>>> {
  /// Provider for AI activity log.
  ///
  /// Copied from [aiActivityLog].
  const AiActivityLogFamily();

  /// Provider for AI activity log.
  ///
  /// Copied from [aiActivityLog].
  AiActivityLogProvider call(
    String childId,
  ) {
    return AiActivityLogProvider(
      childId,
    );
  }

  @override
  AiActivityLogProvider getProviderOverride(
    covariant AiActivityLogProvider provider,
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
  String? get name => r'aiActivityLogProvider';
}

/// Provider for AI activity log.
///
/// Copied from [aiActivityLog].
class AiActivityLogProvider
    extends AutoDisposeFutureProvider<List<AIActivityEntry>> {
  /// Provider for AI activity log.
  ///
  /// Copied from [aiActivityLog].
  AiActivityLogProvider(
    String childId,
  ) : this._internal(
          (ref) => aiActivityLog(
            ref as AiActivityLogRef,
            childId,
          ),
          from: aiActivityLogProvider,
          name: r'aiActivityLogProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$aiActivityLogHash,
          dependencies: AiActivityLogFamily._dependencies,
          allTransitiveDependencies:
              AiActivityLogFamily._allTransitiveDependencies,
          childId: childId,
        );

  AiActivityLogProvider._internal(
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
    FutureOr<List<AIActivityEntry>> Function(AiActivityLogRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: AiActivityLogProvider._internal(
        (ref) => create(ref as AiActivityLogRef),
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
  AutoDisposeFutureProviderElement<List<AIActivityEntry>> createElement() {
    return _AiActivityLogProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AiActivityLogProvider && other.childId == childId;
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
mixin AiActivityLogRef on AutoDisposeFutureProviderRef<List<AIActivityEntry>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _AiActivityLogProviderElement
    extends AutoDisposeFutureProviderElement<List<AIActivityEntry>>
    with AiActivityLogRef {
  _AiActivityLogProviderElement(super.provider);

  @override
  String get childId => (origin as AiActivityLogProvider).childId;
}

String _$pendingApprovalCountHash() =>
    r'b4ada39eb54996878e2b6f58f4bcb05a2f8ec7f8';

/// Provider for pending approval count (for badges).
///
/// Copied from [pendingApprovalCount].
@ProviderFor(pendingApprovalCount)
const pendingApprovalCountProvider = PendingApprovalCountFamily();

/// Provider for pending approval count (for badges).
///
/// Copied from [pendingApprovalCount].
class PendingApprovalCountFamily extends Family<AsyncValue<int>> {
  /// Provider for pending approval count (for badges).
  ///
  /// Copied from [pendingApprovalCount].
  const PendingApprovalCountFamily();

  /// Provider for pending approval count (for badges).
  ///
  /// Copied from [pendingApprovalCount].
  PendingApprovalCountProvider call(
    String childId,
  ) {
    return PendingApprovalCountProvider(
      childId,
    );
  }

  @override
  PendingApprovalCountProvider getProviderOverride(
    covariant PendingApprovalCountProvider provider,
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
  String? get name => r'pendingApprovalCountProvider';
}

/// Provider for pending approval count (for badges).
///
/// Copied from [pendingApprovalCount].
class PendingApprovalCountProvider extends AutoDisposeFutureProvider<int> {
  /// Provider for pending approval count (for badges).
  ///
  /// Copied from [pendingApprovalCount].
  PendingApprovalCountProvider(
    String childId,
  ) : this._internal(
          (ref) => pendingApprovalCount(
            ref as PendingApprovalCountRef,
            childId,
          ),
          from: pendingApprovalCountProvider,
          name: r'pendingApprovalCountProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$pendingApprovalCountHash,
          dependencies: PendingApprovalCountFamily._dependencies,
          allTransitiveDependencies:
              PendingApprovalCountFamily._allTransitiveDependencies,
          childId: childId,
        );

  PendingApprovalCountProvider._internal(
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
    FutureOr<int> Function(PendingApprovalCountRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: PendingApprovalCountProvider._internal(
        (ref) => create(ref as PendingApprovalCountRef),
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
  AutoDisposeFutureProviderElement<int> createElement() {
    return _PendingApprovalCountProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is PendingApprovalCountProvider && other.childId == childId;
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
mixin PendingApprovalCountRef on AutoDisposeFutureProviderRef<int> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _PendingApprovalCountProviderElement
    extends AutoDisposeFutureProviderElement<int> with PendingApprovalCountRef {
  _PendingApprovalCountProviderElement(super.provider);

  @override
  String get childId => (origin as PendingApprovalCountProvider).childId;
}

String _$isAIPausedHash() => r'9e830a457442878918ed4be0f1cb9a87e926cd19';

/// Provider for checking if AI is currently paused.
///
/// Copied from [isAIPaused].
@ProviderFor(isAIPaused)
const isAIPausedProvider = IsAIPausedFamily();

/// Provider for checking if AI is currently paused.
///
/// Copied from [isAIPaused].
class IsAIPausedFamily extends Family<AsyncValue<bool>> {
  /// Provider for checking if AI is currently paused.
  ///
  /// Copied from [isAIPaused].
  const IsAIPausedFamily();

  /// Provider for checking if AI is currently paused.
  ///
  /// Copied from [isAIPaused].
  IsAIPausedProvider call(
    String childId,
  ) {
    return IsAIPausedProvider(
      childId,
    );
  }

  @override
  IsAIPausedProvider getProviderOverride(
    covariant IsAIPausedProvider provider,
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
  String? get name => r'isAIPausedProvider';
}

/// Provider for checking if AI is currently paused.
///
/// Copied from [isAIPaused].
class IsAIPausedProvider extends AutoDisposeFutureProvider<bool> {
  /// Provider for checking if AI is currently paused.
  ///
  /// Copied from [isAIPaused].
  IsAIPausedProvider(
    String childId,
  ) : this._internal(
          (ref) => isAIPaused(
            ref as IsAIPausedRef,
            childId,
          ),
          from: isAIPausedProvider,
          name: r'isAIPausedProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$isAIPausedHash,
          dependencies: IsAIPausedFamily._dependencies,
          allTransitiveDependencies:
              IsAIPausedFamily._allTransitiveDependencies,
          childId: childId,
        );

  IsAIPausedProvider._internal(
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
    FutureOr<bool> Function(IsAIPausedRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: IsAIPausedProvider._internal(
        (ref) => create(ref as IsAIPausedRef),
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
  AutoDisposeFutureProviderElement<bool> createElement() {
    return _IsAIPausedProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is IsAIPausedProvider && other.childId == childId;
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
mixin IsAIPausedRef on AutoDisposeFutureProviderRef<bool> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _IsAIPausedProviderElement extends AutoDisposeFutureProviderElement<bool>
    with IsAIPausedRef {
  _IsAIPausedProviderElement(super.provider);

  @override
  String get childId => (origin as IsAIPausedProvider).childId;
}

String _$autonomySettingsNotifierHash() =>
    r'b84e522c781570deeeca3889af607e3e29e233ef';

abstract class _$AutonomySettingsNotifier
    extends BuildlessAutoDisposeAsyncNotifier<AIAutonomySettings> {
  late final String childId;

  FutureOr<AIAutonomySettings> build(
    String childId,
  );
}

/// Notifier for managing autonomy settings.
///
/// Copied from [AutonomySettingsNotifier].
@ProviderFor(AutonomySettingsNotifier)
const autonomySettingsNotifierProvider = AutonomySettingsNotifierFamily();

/// Notifier for managing autonomy settings.
///
/// Copied from [AutonomySettingsNotifier].
class AutonomySettingsNotifierFamily
    extends Family<AsyncValue<AIAutonomySettings>> {
  /// Notifier for managing autonomy settings.
  ///
  /// Copied from [AutonomySettingsNotifier].
  const AutonomySettingsNotifierFamily();

  /// Notifier for managing autonomy settings.
  ///
  /// Copied from [AutonomySettingsNotifier].
  AutonomySettingsNotifierProvider call(
    String childId,
  ) {
    return AutonomySettingsNotifierProvider(
      childId,
    );
  }

  @override
  AutonomySettingsNotifierProvider getProviderOverride(
    covariant AutonomySettingsNotifierProvider provider,
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
  String? get name => r'autonomySettingsNotifierProvider';
}

/// Notifier for managing autonomy settings.
///
/// Copied from [AutonomySettingsNotifier].
class AutonomySettingsNotifierProvider
    extends AutoDisposeAsyncNotifierProviderImpl<AutonomySettingsNotifier,
        AIAutonomySettings> {
  /// Notifier for managing autonomy settings.
  ///
  /// Copied from [AutonomySettingsNotifier].
  AutonomySettingsNotifierProvider(
    String childId,
  ) : this._internal(
          () => AutonomySettingsNotifier()..childId = childId,
          from: autonomySettingsNotifierProvider,
          name: r'autonomySettingsNotifierProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$autonomySettingsNotifierHash,
          dependencies: AutonomySettingsNotifierFamily._dependencies,
          allTransitiveDependencies:
              AutonomySettingsNotifierFamily._allTransitiveDependencies,
          childId: childId,
        );

  AutonomySettingsNotifierProvider._internal(
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
  FutureOr<AIAutonomySettings> runNotifierBuild(
    covariant AutonomySettingsNotifier notifier,
  ) {
    return notifier.build(
      childId,
    );
  }

  @override
  Override overrideWith(AutonomySettingsNotifier Function() create) {
    return ProviderOverride(
      origin: this,
      override: AutonomySettingsNotifierProvider._internal(
        () => create()..childId = childId,
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
  AutoDisposeAsyncNotifierProviderElement<AutonomySettingsNotifier,
      AIAutonomySettings> createElement() {
    return _AutonomySettingsNotifierProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AutonomySettingsNotifierProvider &&
        other.childId == childId;
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
mixin AutonomySettingsNotifierRef
    on AutoDisposeAsyncNotifierProviderRef<AIAutonomySettings> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _AutonomySettingsNotifierProviderElement
    extends AutoDisposeAsyncNotifierProviderElement<AutonomySettingsNotifier,
        AIAutonomySettings> with AutonomySettingsNotifierRef {
  _AutonomySettingsNotifierProviderElement(super.provider);

  @override
  String get childId => (origin as AutonomySettingsNotifierProvider).childId;
}

String _$approvalQueueNotifierHash() =>
    r'b891c09bf51973efcd538d4bbe0fa712fec40fb2';

abstract class _$ApprovalQueueNotifier
    extends BuildlessAutoDisposeAsyncNotifier<List<ApprovalRequest>> {
  late final String childId;

  FutureOr<List<ApprovalRequest>> build(
    String childId,
  );
}

/// Notifier for managing approval requests.
///
/// Copied from [ApprovalQueueNotifier].
@ProviderFor(ApprovalQueueNotifier)
const approvalQueueNotifierProvider = ApprovalQueueNotifierFamily();

/// Notifier for managing approval requests.
///
/// Copied from [ApprovalQueueNotifier].
class ApprovalQueueNotifierFamily
    extends Family<AsyncValue<List<ApprovalRequest>>> {
  /// Notifier for managing approval requests.
  ///
  /// Copied from [ApprovalQueueNotifier].
  const ApprovalQueueNotifierFamily();

  /// Notifier for managing approval requests.
  ///
  /// Copied from [ApprovalQueueNotifier].
  ApprovalQueueNotifierProvider call(
    String childId,
  ) {
    return ApprovalQueueNotifierProvider(
      childId,
    );
  }

  @override
  ApprovalQueueNotifierProvider getProviderOverride(
    covariant ApprovalQueueNotifierProvider provider,
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
  String? get name => r'approvalQueueNotifierProvider';
}

/// Notifier for managing approval requests.
///
/// Copied from [ApprovalQueueNotifier].
class ApprovalQueueNotifierProvider
    extends AutoDisposeAsyncNotifierProviderImpl<ApprovalQueueNotifier,
        List<ApprovalRequest>> {
  /// Notifier for managing approval requests.
  ///
  /// Copied from [ApprovalQueueNotifier].
  ApprovalQueueNotifierProvider(
    String childId,
  ) : this._internal(
          () => ApprovalQueueNotifier()..childId = childId,
          from: approvalQueueNotifierProvider,
          name: r'approvalQueueNotifierProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$approvalQueueNotifierHash,
          dependencies: ApprovalQueueNotifierFamily._dependencies,
          allTransitiveDependencies:
              ApprovalQueueNotifierFamily._allTransitiveDependencies,
          childId: childId,
        );

  ApprovalQueueNotifierProvider._internal(
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
  FutureOr<List<ApprovalRequest>> runNotifierBuild(
    covariant ApprovalQueueNotifier notifier,
  ) {
    return notifier.build(
      childId,
    );
  }

  @override
  Override overrideWith(ApprovalQueueNotifier Function() create) {
    return ProviderOverride(
      origin: this,
      override: ApprovalQueueNotifierProvider._internal(
        () => create()..childId = childId,
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
  AutoDisposeAsyncNotifierProviderElement<ApprovalQueueNotifier,
      List<ApprovalRequest>> createElement() {
    return _ApprovalQueueNotifierProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ApprovalQueueNotifierProvider && other.childId == childId;
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
mixin ApprovalQueueNotifierRef
    on AutoDisposeAsyncNotifierProviderRef<List<ApprovalRequest>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _ApprovalQueueNotifierProviderElement
    extends AutoDisposeAsyncNotifierProviderElement<ApprovalQueueNotifier,
        List<ApprovalRequest>> with ApprovalQueueNotifierRef {
  _ApprovalQueueNotifierProviderElement(super.provider);

  @override
  String get childId => (origin as ApprovalQueueNotifierProvider).childId;
}

String _$restrictionsNotifierHash() =>
    r'e18d1e0906c5ef4cf2326699f443887d7976dbd9';

abstract class _$RestrictionsNotifier
    extends BuildlessAutoDisposeAsyncNotifier<List<AIRestriction>> {
  late final String childId;

  FutureOr<List<AIRestriction>> build(
    String childId,
  );
}

/// Notifier for managing restrictions.
///
/// Copied from [RestrictionsNotifier].
@ProviderFor(RestrictionsNotifier)
const restrictionsNotifierProvider = RestrictionsNotifierFamily();

/// Notifier for managing restrictions.
///
/// Copied from [RestrictionsNotifier].
class RestrictionsNotifierFamily
    extends Family<AsyncValue<List<AIRestriction>>> {
  /// Notifier for managing restrictions.
  ///
  /// Copied from [RestrictionsNotifier].
  const RestrictionsNotifierFamily();

  /// Notifier for managing restrictions.
  ///
  /// Copied from [RestrictionsNotifier].
  RestrictionsNotifierProvider call(
    String childId,
  ) {
    return RestrictionsNotifierProvider(
      childId,
    );
  }

  @override
  RestrictionsNotifierProvider getProviderOverride(
    covariant RestrictionsNotifierProvider provider,
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
  String? get name => r'restrictionsNotifierProvider';
}

/// Notifier for managing restrictions.
///
/// Copied from [RestrictionsNotifier].
class RestrictionsNotifierProvider extends AutoDisposeAsyncNotifierProviderImpl<
    RestrictionsNotifier, List<AIRestriction>> {
  /// Notifier for managing restrictions.
  ///
  /// Copied from [RestrictionsNotifier].
  RestrictionsNotifierProvider(
    String childId,
  ) : this._internal(
          () => RestrictionsNotifier()..childId = childId,
          from: restrictionsNotifierProvider,
          name: r'restrictionsNotifierProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$restrictionsNotifierHash,
          dependencies: RestrictionsNotifierFamily._dependencies,
          allTransitiveDependencies:
              RestrictionsNotifierFamily._allTransitiveDependencies,
          childId: childId,
        );

  RestrictionsNotifierProvider._internal(
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
  FutureOr<List<AIRestriction>> runNotifierBuild(
    covariant RestrictionsNotifier notifier,
  ) {
    return notifier.build(
      childId,
    );
  }

  @override
  Override overrideWith(RestrictionsNotifier Function() create) {
    return ProviderOverride(
      origin: this,
      override: RestrictionsNotifierProvider._internal(
        () => create()..childId = childId,
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
  AutoDisposeAsyncNotifierProviderElement<RestrictionsNotifier,
      List<AIRestriction>> createElement() {
    return _RestrictionsNotifierProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is RestrictionsNotifierProvider && other.childId == childId;
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
mixin RestrictionsNotifierRef
    on AutoDisposeAsyncNotifierProviderRef<List<AIRestriction>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _RestrictionsNotifierProviderElement
    extends AutoDisposeAsyncNotifierProviderElement<RestrictionsNotifier,
        List<AIRestriction>> with RestrictionsNotifierRef {
  _RestrictionsNotifierProviderElement(super.provider);

  @override
  String get childId => (origin as RestrictionsNotifierProvider).childId;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
