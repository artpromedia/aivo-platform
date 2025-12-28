// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'messages_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$conversationsHash() => r'38341780fad9f097cffb0a1aa94b5aea6e4f58b5';

/// See also [conversations].
@ProviderFor(conversations)
final conversationsProvider =
    AutoDisposeFutureProvider<List<Conversation>>.internal(
  conversations,
  name: r'conversationsProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$conversationsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef ConversationsRef = AutoDisposeFutureProviderRef<List<Conversation>>;
String _$conversationDetailHash() =>
    r'09c0c313e1327e74439120178f2ee5f4a8d3e533';

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

/// See also [conversationDetail].
@ProviderFor(conversationDetail)
const conversationDetailProvider = ConversationDetailFamily();

/// See also [conversationDetail].
class ConversationDetailFamily extends Family<AsyncValue<ConversationDetail>> {
  /// See also [conversationDetail].
  const ConversationDetailFamily();

  /// See also [conversationDetail].
  ConversationDetailProvider call(
    String conversationId,
  ) {
    return ConversationDetailProvider(
      conversationId,
    );
  }

  @override
  ConversationDetailProvider getProviderOverride(
    covariant ConversationDetailProvider provider,
  ) {
    return call(
      provider.conversationId,
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
  String? get name => r'conversationDetailProvider';
}

/// See also [conversationDetail].
class ConversationDetailProvider
    extends AutoDisposeFutureProvider<ConversationDetail> {
  /// See also [conversationDetail].
  ConversationDetailProvider(
    String conversationId,
  ) : this._internal(
          (ref) => conversationDetail(
            ref as ConversationDetailRef,
            conversationId,
          ),
          from: conversationDetailProvider,
          name: r'conversationDetailProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$conversationDetailHash,
          dependencies: ConversationDetailFamily._dependencies,
          allTransitiveDependencies:
              ConversationDetailFamily._allTransitiveDependencies,
          conversationId: conversationId,
        );

  ConversationDetailProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.conversationId,
  }) : super.internal();

  final String conversationId;

  @override
  Override overrideWith(
    FutureOr<ConversationDetail> Function(ConversationDetailRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ConversationDetailProvider._internal(
        (ref) => create(ref as ConversationDetailRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        conversationId: conversationId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<ConversationDetail> createElement() {
    return _ConversationDetailProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ConversationDetailProvider &&
        other.conversationId == conversationId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, conversationId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin ConversationDetailRef
    on AutoDisposeFutureProviderRef<ConversationDetail> {
  /// The parameter `conversationId` of this provider.
  String get conversationId;
}

class _ConversationDetailProviderElement
    extends AutoDisposeFutureProviderElement<ConversationDetail>
    with ConversationDetailRef {
  _ConversationDetailProviderElement(super.provider);

  @override
  String get conversationId =>
      (origin as ConversationDetailProvider).conversationId;
}

String _$availableTeachersHash() => r'df4f63f556ac4bbcab4a897d963954c5b0601fc7';

/// See also [availableTeachers].
@ProviderFor(availableTeachers)
final availableTeachersProvider =
    AutoDisposeFutureProvider<List<Teacher>>.internal(
  availableTeachers,
  name: r'availableTeachersProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$availableTeachersHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef AvailableTeachersRef = AutoDisposeFutureProviderRef<List<Teacher>>;
String _$parentChildrenHash() => r'331e968c9bf4663d1c6b93caedbdcd769d8dd18a';

/// See also [parentChildren].
@ProviderFor(parentChildren)
final parentChildrenProvider =
    AutoDisposeFutureProvider<List<ChildInfo>>.internal(
  parentChildren,
  name: r'parentChildrenProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$parentChildrenHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef ParentChildrenRef = AutoDisposeFutureProviderRef<List<ChildInfo>>;
String _$sendMessageHash() => r'c2b9ec6413e12f62c4f8f24a2978a27b7741e212';

/// See also [sendMessage].
@ProviderFor(sendMessage)
const sendMessageProvider = SendMessageFamily();

/// See also [sendMessage].
class SendMessageFamily extends Family<AsyncValue<void>> {
  /// See also [sendMessage].
  const SendMessageFamily();

  /// See also [sendMessage].
  SendMessageProvider call({
    required String teacherId,
    required String studentId,
    required String subject,
    required String message,
  }) {
    return SendMessageProvider(
      teacherId: teacherId,
      studentId: studentId,
      subject: subject,
      message: message,
    );
  }

  @override
  SendMessageProvider getProviderOverride(
    covariant SendMessageProvider provider,
  ) {
    return call(
      teacherId: provider.teacherId,
      studentId: provider.studentId,
      subject: provider.subject,
      message: provider.message,
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
  String? get name => r'sendMessageProvider';
}

/// See also [sendMessage].
class SendMessageProvider extends AutoDisposeFutureProvider<void> {
  /// See also [sendMessage].
  SendMessageProvider({
    required String teacherId,
    required String studentId,
    required String subject,
    required String message,
  }) : this._internal(
          (ref) => sendMessage(
            ref as SendMessageRef,
            teacherId: teacherId,
            studentId: studentId,
            subject: subject,
            message: message,
          ),
          from: sendMessageProvider,
          name: r'sendMessageProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$sendMessageHash,
          dependencies: SendMessageFamily._dependencies,
          allTransitiveDependencies:
              SendMessageFamily._allTransitiveDependencies,
          teacherId: teacherId,
          studentId: studentId,
          subject: subject,
          message: message,
        );

  SendMessageProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.teacherId,
    required this.studentId,
    required this.subject,
    required this.message,
  }) : super.internal();

  final String teacherId;
  final String studentId;
  final String subject;
  final String message;

  @override
  Override overrideWith(
    FutureOr<void> Function(SendMessageRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: SendMessageProvider._internal(
        (ref) => create(ref as SendMessageRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        teacherId: teacherId,
        studentId: studentId,
        subject: subject,
        message: message,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<void> createElement() {
    return _SendMessageProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is SendMessageProvider &&
        other.teacherId == teacherId &&
        other.studentId == studentId &&
        other.subject == subject &&
        other.message == message;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, teacherId.hashCode);
    hash = _SystemHash.combine(hash, studentId.hashCode);
    hash = _SystemHash.combine(hash, subject.hashCode);
    hash = _SystemHash.combine(hash, message.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin SendMessageRef on AutoDisposeFutureProviderRef<void> {
  /// The parameter `teacherId` of this provider.
  String get teacherId;

  /// The parameter `studentId` of this provider.
  String get studentId;

  /// The parameter `subject` of this provider.
  String get subject;

  /// The parameter `message` of this provider.
  String get message;
}

class _SendMessageProviderElement extends AutoDisposeFutureProviderElement<void>
    with SendMessageRef {
  _SendMessageProviderElement(super.provider);

  @override
  String get teacherId => (origin as SendMessageProvider).teacherId;
  @override
  String get studentId => (origin as SendMessageProvider).studentId;
  @override
  String get subject => (origin as SendMessageProvider).subject;
  @override
  String get message => (origin as SendMessageProvider).message;
}

String _$sendReplyHash() => r'24fd0ec457d8456fdba68381f1777cef303aca9f';

/// See also [sendReply].
@ProviderFor(sendReply)
const sendReplyProvider = SendReplyFamily();

/// See also [sendReply].
class SendReplyFamily extends Family<AsyncValue<void>> {
  /// See also [sendReply].
  const SendReplyFamily();

  /// See also [sendReply].
  SendReplyProvider call({
    required String conversationId,
    required String message,
  }) {
    return SendReplyProvider(
      conversationId: conversationId,
      message: message,
    );
  }

  @override
  SendReplyProvider getProviderOverride(
    covariant SendReplyProvider provider,
  ) {
    return call(
      conversationId: provider.conversationId,
      message: provider.message,
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
  String? get name => r'sendReplyProvider';
}

/// See also [sendReply].
class SendReplyProvider extends AutoDisposeFutureProvider<void> {
  /// See also [sendReply].
  SendReplyProvider({
    required String conversationId,
    required String message,
  }) : this._internal(
          (ref) => sendReply(
            ref as SendReplyRef,
            conversationId: conversationId,
            message: message,
          ),
          from: sendReplyProvider,
          name: r'sendReplyProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$sendReplyHash,
          dependencies: SendReplyFamily._dependencies,
          allTransitiveDependencies: SendReplyFamily._allTransitiveDependencies,
          conversationId: conversationId,
          message: message,
        );

  SendReplyProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.conversationId,
    required this.message,
  }) : super.internal();

  final String conversationId;
  final String message;

  @override
  Override overrideWith(
    FutureOr<void> Function(SendReplyRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: SendReplyProvider._internal(
        (ref) => create(ref as SendReplyRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        conversationId: conversationId,
        message: message,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<void> createElement() {
    return _SendReplyProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is SendReplyProvider &&
        other.conversationId == conversationId &&
        other.message == message;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, conversationId.hashCode);
    hash = _SystemHash.combine(hash, message.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin SendReplyRef on AutoDisposeFutureProviderRef<void> {
  /// The parameter `conversationId` of this provider.
  String get conversationId;

  /// The parameter `message` of this provider.
  String get message;
}

class _SendReplyProviderElement extends AutoDisposeFutureProviderElement<void>
    with SendReplyRef {
  _SendReplyProviderElement(super.provider);

  @override
  String get conversationId => (origin as SendReplyProvider).conversationId;
  @override
  String get message => (origin as SendReplyProvider).message;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
