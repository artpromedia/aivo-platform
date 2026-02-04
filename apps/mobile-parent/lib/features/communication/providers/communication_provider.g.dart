// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'communication_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$communicationApiHash() => r'772c9e92a2a79ef643e32936020453df270c56a4';

/// Provider for communication API.
///
/// Copied from [communicationApi].
@ProviderFor(communicationApi)
final communicationApiProvider = AutoDisposeProvider<CommunicationApi>.internal(
  communicationApi,
  name: r'communicationApiProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$communicationApiHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef CommunicationApiRef = AutoDisposeProviderRef<CommunicationApi>;
String _$transcriptHash() => r'22255c295518421447d41188082664b5daa5b0e2';

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

/// Provider for a single transcript.
///
/// Copied from [transcript].
@ProviderFor(transcript)
const transcriptProvider = TranscriptFamily();

/// Provider for a single transcript.
///
/// Copied from [transcript].
class TranscriptFamily extends Family<AsyncValue<HomeworkTranscript>> {
  /// Provider for a single transcript.
  ///
  /// Copied from [transcript].
  const TranscriptFamily();

  /// Provider for a single transcript.
  ///
  /// Copied from [transcript].
  TranscriptProvider call(
    String childId,
    String transcriptId,
  ) {
    return TranscriptProvider(
      childId,
      transcriptId,
    );
  }

  @override
  TranscriptProvider getProviderOverride(
    covariant TranscriptProvider provider,
  ) {
    return call(
      provider.childId,
      provider.transcriptId,
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
  String? get name => r'transcriptProvider';
}

/// Provider for a single transcript.
///
/// Copied from [transcript].
class TranscriptProvider extends AutoDisposeFutureProvider<HomeworkTranscript> {
  /// Provider for a single transcript.
  ///
  /// Copied from [transcript].
  TranscriptProvider(
    String childId,
    String transcriptId,
  ) : this._internal(
          (ref) => transcript(
            ref as TranscriptRef,
            childId,
            transcriptId,
          ),
          from: transcriptProvider,
          name: r'transcriptProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$transcriptHash,
          dependencies: TranscriptFamily._dependencies,
          allTransitiveDependencies:
              TranscriptFamily._allTransitiveDependencies,
          childId: childId,
          transcriptId: transcriptId,
        );

  TranscriptProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
    required this.transcriptId,
  }) : super.internal();

  final String childId;
  final String transcriptId;

  @override
  Override overrideWith(
    FutureOr<HomeworkTranscript> Function(TranscriptRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: TranscriptProvider._internal(
        (ref) => create(ref as TranscriptRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
        transcriptId: transcriptId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<HomeworkTranscript> createElement() {
    return _TranscriptProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is TranscriptProvider &&
        other.childId == childId &&
        other.transcriptId == transcriptId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);
    hash = _SystemHash.combine(hash, transcriptId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin TranscriptRef on AutoDisposeFutureProviderRef<HomeworkTranscript> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `transcriptId` of this provider.
  String get transcriptId;
}

class _TranscriptProviderElement
    extends AutoDisposeFutureProviderElement<HomeworkTranscript>
    with TranscriptRef {
  _TranscriptProviderElement(super.provider);

  @override
  String get childId => (origin as TranscriptProvider).childId;
  @override
  String get transcriptId => (origin as TranscriptProvider).transcriptId;
}

String _$recentTranscriptsHash() => r'4811397d3b5b905c79cd8c8574c00ecdc4a2d8c4';

/// Provider for recent transcripts.
///
/// Copied from [recentTranscripts].
@ProviderFor(recentTranscripts)
const recentTranscriptsProvider = RecentTranscriptsFamily();

/// Provider for recent transcripts.
///
/// Copied from [recentTranscripts].
class RecentTranscriptsFamily
    extends Family<AsyncValue<List<HomeworkTranscript>>> {
  /// Provider for recent transcripts.
  ///
  /// Copied from [recentTranscripts].
  const RecentTranscriptsFamily();

  /// Provider for recent transcripts.
  ///
  /// Copied from [recentTranscripts].
  RecentTranscriptsProvider call(
    String childId,
  ) {
    return RecentTranscriptsProvider(
      childId,
    );
  }

  @override
  RecentTranscriptsProvider getProviderOverride(
    covariant RecentTranscriptsProvider provider,
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
  String? get name => r'recentTranscriptsProvider';
}

/// Provider for recent transcripts.
///
/// Copied from [recentTranscripts].
class RecentTranscriptsProvider
    extends AutoDisposeFutureProvider<List<HomeworkTranscript>> {
  /// Provider for recent transcripts.
  ///
  /// Copied from [recentTranscripts].
  RecentTranscriptsProvider(
    String childId,
  ) : this._internal(
          (ref) => recentTranscripts(
            ref as RecentTranscriptsRef,
            childId,
          ),
          from: recentTranscriptsProvider,
          name: r'recentTranscriptsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$recentTranscriptsHash,
          dependencies: RecentTranscriptsFamily._dependencies,
          allTransitiveDependencies:
              RecentTranscriptsFamily._allTransitiveDependencies,
          childId: childId,
        );

  RecentTranscriptsProvider._internal(
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
    FutureOr<List<HomeworkTranscript>> Function(RecentTranscriptsRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: RecentTranscriptsProvider._internal(
        (ref) => create(ref as RecentTranscriptsRef),
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
  AutoDisposeFutureProviderElement<List<HomeworkTranscript>> createElement() {
    return _RecentTranscriptsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is RecentTranscriptsProvider && other.childId == childId;
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
mixin RecentTranscriptsRef
    on AutoDisposeFutureProviderRef<List<HomeworkTranscript>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _RecentTranscriptsProviderElement
    extends AutoDisposeFutureProviderElement<List<HomeworkTranscript>>
    with RecentTranscriptsRef {
  _RecentTranscriptsProviderElement(super.provider);

  @override
  String get childId => (origin as RecentTranscriptsProvider).childId;
}

String _$teacherNoteHash() => r'2ac3255b61f249d50f06dafca11e16b68d3d98c9';

/// Provider for a single teacher note.
///
/// Copied from [teacherNote].
@ProviderFor(teacherNote)
const teacherNoteProvider = TeacherNoteFamily();

/// Provider for a single teacher note.
///
/// Copied from [teacherNote].
class TeacherNoteFamily extends Family<AsyncValue<TeacherNote>> {
  /// Provider for a single teacher note.
  ///
  /// Copied from [teacherNote].
  const TeacherNoteFamily();

  /// Provider for a single teacher note.
  ///
  /// Copied from [teacherNote].
  TeacherNoteProvider call(
    String childId,
    String noteId,
  ) {
    return TeacherNoteProvider(
      childId,
      noteId,
    );
  }

  @override
  TeacherNoteProvider getProviderOverride(
    covariant TeacherNoteProvider provider,
  ) {
    return call(
      provider.childId,
      provider.noteId,
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
  String? get name => r'teacherNoteProvider';
}

/// Provider for a single teacher note.
///
/// Copied from [teacherNote].
class TeacherNoteProvider extends AutoDisposeFutureProvider<TeacherNote> {
  /// Provider for a single teacher note.
  ///
  /// Copied from [teacherNote].
  TeacherNoteProvider(
    String childId,
    String noteId,
  ) : this._internal(
          (ref) => teacherNote(
            ref as TeacherNoteRef,
            childId,
            noteId,
          ),
          from: teacherNoteProvider,
          name: r'teacherNoteProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$teacherNoteHash,
          dependencies: TeacherNoteFamily._dependencies,
          allTransitiveDependencies:
              TeacherNoteFamily._allTransitiveDependencies,
          childId: childId,
          noteId: noteId,
        );

  TeacherNoteProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
    required this.noteId,
  }) : super.internal();

  final String childId;
  final String noteId;

  @override
  Override overrideWith(
    FutureOr<TeacherNote> Function(TeacherNoteRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: TeacherNoteProvider._internal(
        (ref) => create(ref as TeacherNoteRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
        noteId: noteId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<TeacherNote> createElement() {
    return _TeacherNoteProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is TeacherNoteProvider &&
        other.childId == childId &&
        other.noteId == noteId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);
    hash = _SystemHash.combine(hash, noteId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin TeacherNoteRef on AutoDisposeFutureProviderRef<TeacherNote> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `noteId` of this provider.
  String get noteId;
}

class _TeacherNoteProviderElement
    extends AutoDisposeFutureProviderElement<TeacherNote> with TeacherNoteRef {
  _TeacherNoteProviderElement(super.provider);

  @override
  String get childId => (origin as TeacherNoteProvider).childId;
  @override
  String get noteId => (origin as TeacherNoteProvider).noteId;
}

String _$unreadNoteCountHash() => r'5cc5366102f7bc8e951c891b94e64382ec5977e9';

/// Provider for unread note count.
///
/// Copied from [unreadNoteCount].
@ProviderFor(unreadNoteCount)
const unreadNoteCountProvider = UnreadNoteCountFamily();

/// Provider for unread note count.
///
/// Copied from [unreadNoteCount].
class UnreadNoteCountFamily extends Family<AsyncValue<int>> {
  /// Provider for unread note count.
  ///
  /// Copied from [unreadNoteCount].
  const UnreadNoteCountFamily();

  /// Provider for unread note count.
  ///
  /// Copied from [unreadNoteCount].
  UnreadNoteCountProvider call(
    String childId,
  ) {
    return UnreadNoteCountProvider(
      childId,
    );
  }

  @override
  UnreadNoteCountProvider getProviderOverride(
    covariant UnreadNoteCountProvider provider,
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
  String? get name => r'unreadNoteCountProvider';
}

/// Provider for unread note count.
///
/// Copied from [unreadNoteCount].
class UnreadNoteCountProvider extends AutoDisposeFutureProvider<int> {
  /// Provider for unread note count.
  ///
  /// Copied from [unreadNoteCount].
  UnreadNoteCountProvider(
    String childId,
  ) : this._internal(
          (ref) => unreadNoteCount(
            ref as UnreadNoteCountRef,
            childId,
          ),
          from: unreadNoteCountProvider,
          name: r'unreadNoteCountProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$unreadNoteCountHash,
          dependencies: UnreadNoteCountFamily._dependencies,
          allTransitiveDependencies:
              UnreadNoteCountFamily._allTransitiveDependencies,
          childId: childId,
        );

  UnreadNoteCountProvider._internal(
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
    FutureOr<int> Function(UnreadNoteCountRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UnreadNoteCountProvider._internal(
        (ref) => create(ref as UnreadNoteCountRef),
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
    return _UnreadNoteCountProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UnreadNoteCountProvider && other.childId == childId;
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
mixin UnreadNoteCountRef on AutoDisposeFutureProviderRef<int> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _UnreadNoteCountProviderElement
    extends AutoDisposeFutureProviderElement<int> with UnreadNoteCountRef {
  _UnreadNoteCountProviderElement(super.provider);

  @override
  String get childId => (origin as UnreadNoteCountProvider).childId;
}

String _$urgentNotesHash() => r'084c33c59809971d59955793594aa25a5eb6d6bf';

/// Provider for notes filtered by priority.
///
/// Copied from [urgentNotes].
@ProviderFor(urgentNotes)
const urgentNotesProvider = UrgentNotesFamily();

/// Provider for notes filtered by priority.
///
/// Copied from [urgentNotes].
class UrgentNotesFamily extends Family<AsyncValue<List<TeacherNote>>> {
  /// Provider for notes filtered by priority.
  ///
  /// Copied from [urgentNotes].
  const UrgentNotesFamily();

  /// Provider for notes filtered by priority.
  ///
  /// Copied from [urgentNotes].
  UrgentNotesProvider call(
    String childId,
  ) {
    return UrgentNotesProvider(
      childId,
    );
  }

  @override
  UrgentNotesProvider getProviderOverride(
    covariant UrgentNotesProvider provider,
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
  String? get name => r'urgentNotesProvider';
}

/// Provider for notes filtered by priority.
///
/// Copied from [urgentNotes].
class UrgentNotesProvider extends AutoDisposeFutureProvider<List<TeacherNote>> {
  /// Provider for notes filtered by priority.
  ///
  /// Copied from [urgentNotes].
  UrgentNotesProvider(
    String childId,
  ) : this._internal(
          (ref) => urgentNotes(
            ref as UrgentNotesRef,
            childId,
          ),
          from: urgentNotesProvider,
          name: r'urgentNotesProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$urgentNotesHash,
          dependencies: UrgentNotesFamily._dependencies,
          allTransitiveDependencies:
              UrgentNotesFamily._allTransitiveDependencies,
          childId: childId,
        );

  UrgentNotesProvider._internal(
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
    FutureOr<List<TeacherNote>> Function(UrgentNotesRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UrgentNotesProvider._internal(
        (ref) => create(ref as UrgentNotesRef),
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
  AutoDisposeFutureProviderElement<List<TeacherNote>> createElement() {
    return _UrgentNotesProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UrgentNotesProvider && other.childId == childId;
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
mixin UrgentNotesRef on AutoDisposeFutureProviderRef<List<TeacherNote>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _UrgentNotesProviderElement
    extends AutoDisposeFutureProviderElement<List<TeacherNote>>
    with UrgentNotesRef {
  _UrgentNotesProviderElement(super.provider);

  @override
  String get childId => (origin as UrgentNotesProvider).childId;
}

String _$reportHash() => r'3ea196497320fbfdfc3a9364b0a1e117c807d785';

/// Provider for a single report.
///
/// Copied from [report].
@ProviderFor(report)
const reportProvider = ReportFamily();

/// Provider for a single report.
///
/// Copied from [report].
class ReportFamily extends Family<AsyncValue<ProgressReport>> {
  /// Provider for a single report.
  ///
  /// Copied from [report].
  const ReportFamily();

  /// Provider for a single report.
  ///
  /// Copied from [report].
  ReportProvider call(
    String childId,
    String reportId,
  ) {
    return ReportProvider(
      childId,
      reportId,
    );
  }

  @override
  ReportProvider getProviderOverride(
    covariant ReportProvider provider,
  ) {
    return call(
      provider.childId,
      provider.reportId,
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
  String? get name => r'reportProvider';
}

/// Provider for a single report.
///
/// Copied from [report].
class ReportProvider extends AutoDisposeFutureProvider<ProgressReport> {
  /// Provider for a single report.
  ///
  /// Copied from [report].
  ReportProvider(
    String childId,
    String reportId,
  ) : this._internal(
          (ref) => report(
            ref as ReportRef,
            childId,
            reportId,
          ),
          from: reportProvider,
          name: r'reportProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$reportHash,
          dependencies: ReportFamily._dependencies,
          allTransitiveDependencies: ReportFamily._allTransitiveDependencies,
          childId: childId,
          reportId: reportId,
        );

  ReportProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
    required this.reportId,
  }) : super.internal();

  final String childId;
  final String reportId;

  @override
  Override overrideWith(
    FutureOr<ProgressReport> Function(ReportRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ReportProvider._internal(
        (ref) => create(ref as ReportRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
        reportId: reportId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<ProgressReport> createElement() {
    return _ReportProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ReportProvider &&
        other.childId == childId &&
        other.reportId == reportId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);
    hash = _SystemHash.combine(hash, reportId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin ReportRef on AutoDisposeFutureProviderRef<ProgressReport> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `reportId` of this provider.
  String get reportId;
}

class _ReportProviderElement
    extends AutoDisposeFutureProviderElement<ProgressReport> with ReportRef {
  _ReportProviderElement(super.provider);

  @override
  String get childId => (origin as ReportProvider).childId;
  @override
  String get reportId => (origin as ReportProvider).reportId;
}

String _$latestReportHash() => r'e20f948b024b5e29d35508ddc27f025536d13f8b';

/// Provider for the latest report.
///
/// Copied from [latestReport].
@ProviderFor(latestReport)
const latestReportProvider = LatestReportFamily();

/// Provider for the latest report.
///
/// Copied from [latestReport].
class LatestReportFamily extends Family<AsyncValue<ProgressReport?>> {
  /// Provider for the latest report.
  ///
  /// Copied from [latestReport].
  const LatestReportFamily();

  /// Provider for the latest report.
  ///
  /// Copied from [latestReport].
  LatestReportProvider call(
    String childId,
  ) {
    return LatestReportProvider(
      childId,
    );
  }

  @override
  LatestReportProvider getProviderOverride(
    covariant LatestReportProvider provider,
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
  String? get name => r'latestReportProvider';
}

/// Provider for the latest report.
///
/// Copied from [latestReport].
class LatestReportProvider extends AutoDisposeFutureProvider<ProgressReport?> {
  /// Provider for the latest report.
  ///
  /// Copied from [latestReport].
  LatestReportProvider(
    String childId,
  ) : this._internal(
          (ref) => latestReport(
            ref as LatestReportRef,
            childId,
          ),
          from: latestReportProvider,
          name: r'latestReportProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$latestReportHash,
          dependencies: LatestReportFamily._dependencies,
          allTransitiveDependencies:
              LatestReportFamily._allTransitiveDependencies,
          childId: childId,
        );

  LatestReportProvider._internal(
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
    FutureOr<ProgressReport?> Function(LatestReportRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: LatestReportProvider._internal(
        (ref) => create(ref as LatestReportRef),
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
  AutoDisposeFutureProviderElement<ProgressReport?> createElement() {
    return _LatestReportProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is LatestReportProvider && other.childId == childId;
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
mixin LatestReportRef on AutoDisposeFutureProviderRef<ProgressReport?> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _LatestReportProviderElement
    extends AutoDisposeFutureProviderElement<ProgressReport?>
    with LatestReportRef {
  _LatestReportProviderElement(super.provider);

  @override
  String get childId => (origin as LatestReportProvider).childId;
}

String _$communicationDashboardHash() =>
    r'fead3cfd09bfe032a23bf16d3fb4d2ee066c177d';

/// Provider for communication dashboard data.
///
/// Copied from [communicationDashboard].
@ProviderFor(communicationDashboard)
const communicationDashboardProvider = CommunicationDashboardFamily();

/// Provider for communication dashboard data.
///
/// Copied from [communicationDashboard].
class CommunicationDashboardFamily
    extends Family<AsyncValue<CommunicationDashboard>> {
  /// Provider for communication dashboard data.
  ///
  /// Copied from [communicationDashboard].
  const CommunicationDashboardFamily();

  /// Provider for communication dashboard data.
  ///
  /// Copied from [communicationDashboard].
  CommunicationDashboardProvider call(
    String childId,
  ) {
    return CommunicationDashboardProvider(
      childId,
    );
  }

  @override
  CommunicationDashboardProvider getProviderOverride(
    covariant CommunicationDashboardProvider provider,
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
  String? get name => r'communicationDashboardProvider';
}

/// Provider for communication dashboard data.
///
/// Copied from [communicationDashboard].
class CommunicationDashboardProvider
    extends AutoDisposeFutureProvider<CommunicationDashboard> {
  /// Provider for communication dashboard data.
  ///
  /// Copied from [communicationDashboard].
  CommunicationDashboardProvider(
    String childId,
  ) : this._internal(
          (ref) => communicationDashboard(
            ref as CommunicationDashboardRef,
            childId,
          ),
          from: communicationDashboardProvider,
          name: r'communicationDashboardProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$communicationDashboardHash,
          dependencies: CommunicationDashboardFamily._dependencies,
          allTransitiveDependencies:
              CommunicationDashboardFamily._allTransitiveDependencies,
          childId: childId,
        );

  CommunicationDashboardProvider._internal(
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
    FutureOr<CommunicationDashboard> Function(
            CommunicationDashboardRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: CommunicationDashboardProvider._internal(
        (ref) => create(ref as CommunicationDashboardRef),
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
  AutoDisposeFutureProviderElement<CommunicationDashboard> createElement() {
    return _CommunicationDashboardProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is CommunicationDashboardProvider && other.childId == childId;
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
mixin CommunicationDashboardRef
    on AutoDisposeFutureProviderRef<CommunicationDashboard> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _CommunicationDashboardProviderElement
    extends AutoDisposeFutureProviderElement<CommunicationDashboard>
    with CommunicationDashboardRef {
  _CommunicationDashboardProviderElement(super.provider);

  @override
  String get childId => (origin as CommunicationDashboardProvider).childId;
}

String _$transcriptsNotifierHash() =>
    r'f5e19cdbc2373dfe035575feae5b4ea904b335b5';

abstract class _$TranscriptsNotifier
    extends BuildlessAutoDisposeAsyncNotifier<List<HomeworkTranscript>> {
  late final String childId;

  FutureOr<List<HomeworkTranscript>> build(
    String childId,
  );
}

/// Provider for homework transcripts list.
///
/// Copied from [TranscriptsNotifier].
@ProviderFor(TranscriptsNotifier)
const transcriptsNotifierProvider = TranscriptsNotifierFamily();

/// Provider for homework transcripts list.
///
/// Copied from [TranscriptsNotifier].
class TranscriptsNotifierFamily
    extends Family<AsyncValue<List<HomeworkTranscript>>> {
  /// Provider for homework transcripts list.
  ///
  /// Copied from [TranscriptsNotifier].
  const TranscriptsNotifierFamily();

  /// Provider for homework transcripts list.
  ///
  /// Copied from [TranscriptsNotifier].
  TranscriptsNotifierProvider call(
    String childId,
  ) {
    return TranscriptsNotifierProvider(
      childId,
    );
  }

  @override
  TranscriptsNotifierProvider getProviderOverride(
    covariant TranscriptsNotifierProvider provider,
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
  String? get name => r'transcriptsNotifierProvider';
}

/// Provider for homework transcripts list.
///
/// Copied from [TranscriptsNotifier].
class TranscriptsNotifierProvider extends AutoDisposeAsyncNotifierProviderImpl<
    TranscriptsNotifier, List<HomeworkTranscript>> {
  /// Provider for homework transcripts list.
  ///
  /// Copied from [TranscriptsNotifier].
  TranscriptsNotifierProvider(
    String childId,
  ) : this._internal(
          () => TranscriptsNotifier()..childId = childId,
          from: transcriptsNotifierProvider,
          name: r'transcriptsNotifierProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$transcriptsNotifierHash,
          dependencies: TranscriptsNotifierFamily._dependencies,
          allTransitiveDependencies:
              TranscriptsNotifierFamily._allTransitiveDependencies,
          childId: childId,
        );

  TranscriptsNotifierProvider._internal(
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
  FutureOr<List<HomeworkTranscript>> runNotifierBuild(
    covariant TranscriptsNotifier notifier,
  ) {
    return notifier.build(
      childId,
    );
  }

  @override
  Override overrideWith(TranscriptsNotifier Function() create) {
    return ProviderOverride(
      origin: this,
      override: TranscriptsNotifierProvider._internal(
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
  AutoDisposeAsyncNotifierProviderElement<TranscriptsNotifier,
      List<HomeworkTranscript>> createElement() {
    return _TranscriptsNotifierProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is TranscriptsNotifierProvider && other.childId == childId;
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
mixin TranscriptsNotifierRef
    on AutoDisposeAsyncNotifierProviderRef<List<HomeworkTranscript>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _TranscriptsNotifierProviderElement
    extends AutoDisposeAsyncNotifierProviderElement<TranscriptsNotifier,
        List<HomeworkTranscript>> with TranscriptsNotifierRef {
  _TranscriptsNotifierProviderElement(super.provider);

  @override
  String get childId => (origin as TranscriptsNotifierProvider).childId;
}

String _$teacherNotesNotifierHash() =>
    r'2f34d0364f9f04d8bea9bfa3daa980ef90c2bc35';

abstract class _$TeacherNotesNotifier
    extends BuildlessAutoDisposeAsyncNotifier<List<TeacherNote>> {
  late final String childId;

  FutureOr<List<TeacherNote>> build(
    String childId,
  );
}

/// Notifier for teacher notes.
///
/// Copied from [TeacherNotesNotifier].
@ProviderFor(TeacherNotesNotifier)
const teacherNotesNotifierProvider = TeacherNotesNotifierFamily();

/// Notifier for teacher notes.
///
/// Copied from [TeacherNotesNotifier].
class TeacherNotesNotifierFamily extends Family<AsyncValue<List<TeacherNote>>> {
  /// Notifier for teacher notes.
  ///
  /// Copied from [TeacherNotesNotifier].
  const TeacherNotesNotifierFamily();

  /// Notifier for teacher notes.
  ///
  /// Copied from [TeacherNotesNotifier].
  TeacherNotesNotifierProvider call(
    String childId,
  ) {
    return TeacherNotesNotifierProvider(
      childId,
    );
  }

  @override
  TeacherNotesNotifierProvider getProviderOverride(
    covariant TeacherNotesNotifierProvider provider,
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
  String? get name => r'teacherNotesNotifierProvider';
}

/// Notifier for teacher notes.
///
/// Copied from [TeacherNotesNotifier].
class TeacherNotesNotifierProvider extends AutoDisposeAsyncNotifierProviderImpl<
    TeacherNotesNotifier, List<TeacherNote>> {
  /// Notifier for teacher notes.
  ///
  /// Copied from [TeacherNotesNotifier].
  TeacherNotesNotifierProvider(
    String childId,
  ) : this._internal(
          () => TeacherNotesNotifier()..childId = childId,
          from: teacherNotesNotifierProvider,
          name: r'teacherNotesNotifierProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$teacherNotesNotifierHash,
          dependencies: TeacherNotesNotifierFamily._dependencies,
          allTransitiveDependencies:
              TeacherNotesNotifierFamily._allTransitiveDependencies,
          childId: childId,
        );

  TeacherNotesNotifierProvider._internal(
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
  FutureOr<List<TeacherNote>> runNotifierBuild(
    covariant TeacherNotesNotifier notifier,
  ) {
    return notifier.build(
      childId,
    );
  }

  @override
  Override overrideWith(TeacherNotesNotifier Function() create) {
    return ProviderOverride(
      origin: this,
      override: TeacherNotesNotifierProvider._internal(
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
  AutoDisposeAsyncNotifierProviderElement<TeacherNotesNotifier,
      List<TeacherNote>> createElement() {
    return _TeacherNotesNotifierProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is TeacherNotesNotifierProvider && other.childId == childId;
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
mixin TeacherNotesNotifierRef
    on AutoDisposeAsyncNotifierProviderRef<List<TeacherNote>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _TeacherNotesNotifierProviderElement
    extends AutoDisposeAsyncNotifierProviderElement<TeacherNotesNotifier,
        List<TeacherNote>> with TeacherNotesNotifierRef {
  _TeacherNotesNotifierProviderElement(super.provider);

  @override
  String get childId => (origin as TeacherNotesNotifierProvider).childId;
}

String _$reportsNotifierHash() => r'a2a12cbcd34700aa735878e2d366b75a64923ce9';

abstract class _$ReportsNotifier
    extends BuildlessAutoDisposeAsyncNotifier<List<ProgressReport>> {
  late final String childId;

  FutureOr<List<ProgressReport>> build(
    String childId,
  );
}

/// Notifier for progress reports.
///
/// Copied from [ReportsNotifier].
@ProviderFor(ReportsNotifier)
const reportsNotifierProvider = ReportsNotifierFamily();

/// Notifier for progress reports.
///
/// Copied from [ReportsNotifier].
class ReportsNotifierFamily extends Family<AsyncValue<List<ProgressReport>>> {
  /// Notifier for progress reports.
  ///
  /// Copied from [ReportsNotifier].
  const ReportsNotifierFamily();

  /// Notifier for progress reports.
  ///
  /// Copied from [ReportsNotifier].
  ReportsNotifierProvider call(
    String childId,
  ) {
    return ReportsNotifierProvider(
      childId,
    );
  }

  @override
  ReportsNotifierProvider getProviderOverride(
    covariant ReportsNotifierProvider provider,
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
  String? get name => r'reportsNotifierProvider';
}

/// Notifier for progress reports.
///
/// Copied from [ReportsNotifier].
class ReportsNotifierProvider extends AutoDisposeAsyncNotifierProviderImpl<
    ReportsNotifier, List<ProgressReport>> {
  /// Notifier for progress reports.
  ///
  /// Copied from [ReportsNotifier].
  ReportsNotifierProvider(
    String childId,
  ) : this._internal(
          () => ReportsNotifier()..childId = childId,
          from: reportsNotifierProvider,
          name: r'reportsNotifierProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$reportsNotifierHash,
          dependencies: ReportsNotifierFamily._dependencies,
          allTransitiveDependencies:
              ReportsNotifierFamily._allTransitiveDependencies,
          childId: childId,
        );

  ReportsNotifierProvider._internal(
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
  FutureOr<List<ProgressReport>> runNotifierBuild(
    covariant ReportsNotifier notifier,
  ) {
    return notifier.build(
      childId,
    );
  }

  @override
  Override overrideWith(ReportsNotifier Function() create) {
    return ProviderOverride(
      origin: this,
      override: ReportsNotifierProvider._internal(
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
  AutoDisposeAsyncNotifierProviderElement<ReportsNotifier, List<ProgressReport>>
      createElement() {
    return _ReportsNotifierProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ReportsNotifierProvider && other.childId == childId;
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
mixin ReportsNotifierRef
    on AutoDisposeAsyncNotifierProviderRef<List<ProgressReport>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _ReportsNotifierProviderElement
    extends AutoDisposeAsyncNotifierProviderElement<ReportsNotifier,
        List<ProgressReport>> with ReportsNotifierRef {
  _ReportsNotifierProviderElement(super.provider);

  @override
  String get childId => (origin as ReportsNotifierProvider).childId;
}

String _$reportGenerationNotifierHash() =>
    r'666b5bc261cc9b74ae923f828430f950e42b7cab';

/// Notifier for report generation state.
///
/// Copied from [ReportGenerationNotifier].
@ProviderFor(ReportGenerationNotifier)
final reportGenerationNotifierProvider = AutoDisposeNotifierProvider<
    ReportGenerationNotifier, AsyncValue<ProgressReport?>>.internal(
  ReportGenerationNotifier.new,
  name: r'reportGenerationNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$reportGenerationNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$ReportGenerationNotifier
    = AutoDisposeNotifier<AsyncValue<ProgressReport?>>;
String _$reportShareNotifierHash() =>
    r'1db64abd4314f865a833eba7915d017909f26131';

/// Notifier for report sharing.
///
/// Copied from [ReportShareNotifier].
@ProviderFor(ReportShareNotifier)
final reportShareNotifierProvider =
    AutoDisposeNotifierProvider<ReportShareNotifier, AsyncValue<void>>.internal(
  ReportShareNotifier.new,
  name: r'reportShareNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$reportShareNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$ReportShareNotifier = AutoDisposeNotifier<AsyncValue<void>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
