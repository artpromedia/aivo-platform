// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'engagement_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$engagementApiHash() => r'af97cbd7381397ac4e4424cc7a45b175026cefa8';

/// Provider for engagement API.
///
/// Copied from [engagementApi].
@ProviderFor(engagementApi)
final engagementApiProvider = AutoDisposeProvider<EngagementApi>.internal(
  engagementApi,
  name: r'engagementApiProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$engagementApiHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef EngagementApiRef = AutoDisposeProviderRef<EngagementApi>;
String _$streakHistoryHash() => r'3bae195fde476b5c76b0dbea05d4d6d5098910f2';

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

/// Provider for streak history calendar data.
///
/// Copied from [streakHistory].
@ProviderFor(streakHistory)
const streakHistoryProvider = StreakHistoryFamily();

/// Provider for streak history calendar data.
///
/// Copied from [streakHistory].
class StreakHistoryFamily extends Family<AsyncValue<List<StreakDay>>> {
  /// Provider for streak history calendar data.
  ///
  /// Copied from [streakHistory].
  const StreakHistoryFamily();

  /// Provider for streak history calendar data.
  ///
  /// Copied from [streakHistory].
  StreakHistoryProvider call(
    String childId, {
    required DateTime startDate,
    required DateTime endDate,
  }) {
    return StreakHistoryProvider(
      childId,
      startDate: startDate,
      endDate: endDate,
    );
  }

  @override
  StreakHistoryProvider getProviderOverride(
    covariant StreakHistoryProvider provider,
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
  String? get name => r'streakHistoryProvider';
}

/// Provider for streak history calendar data.
///
/// Copied from [streakHistory].
class StreakHistoryProvider extends AutoDisposeFutureProvider<List<StreakDay>> {
  /// Provider for streak history calendar data.
  ///
  /// Copied from [streakHistory].
  StreakHistoryProvider(
    String childId, {
    required DateTime startDate,
    required DateTime endDate,
  }) : this._internal(
          (ref) => streakHistory(
            ref as StreakHistoryRef,
            childId,
            startDate: startDate,
            endDate: endDate,
          ),
          from: streakHistoryProvider,
          name: r'streakHistoryProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$streakHistoryHash,
          dependencies: StreakHistoryFamily._dependencies,
          allTransitiveDependencies:
              StreakHistoryFamily._allTransitiveDependencies,
          childId: childId,
          startDate: startDate,
          endDate: endDate,
        );

  StreakHistoryProvider._internal(
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
  final DateTime startDate;
  final DateTime endDate;

  @override
  Override overrideWith(
    FutureOr<List<StreakDay>> Function(StreakHistoryRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: StreakHistoryProvider._internal(
        (ref) => create(ref as StreakHistoryRef),
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
  AutoDisposeFutureProviderElement<List<StreakDay>> createElement() {
    return _StreakHistoryProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is StreakHistoryProvider &&
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
mixin StreakHistoryRef on AutoDisposeFutureProviderRef<List<StreakDay>> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `startDate` of this provider.
  DateTime get startDate;

  /// The parameter `endDate` of this provider.
  DateTime get endDate;
}

class _StreakHistoryProviderElement
    extends AutoDisposeFutureProviderElement<List<StreakDay>>
    with StreakHistoryRef {
  _StreakHistoryProviderElement(super.provider);

  @override
  String get childId => (origin as StreakHistoryProvider).childId;
  @override
  DateTime get startDate => (origin as StreakHistoryProvider).startDate;
  @override
  DateTime get endDate => (origin as StreakHistoryProvider).endDate;
}

String _$currentMonthStreakHash() =>
    r'b1f737e61a78cf0bae210dd9dfb13f54df9daa6b';

/// Provider for current month's streak calendar.
///
/// Copied from [currentMonthStreak].
@ProviderFor(currentMonthStreak)
const currentMonthStreakProvider = CurrentMonthStreakFamily();

/// Provider for current month's streak calendar.
///
/// Copied from [currentMonthStreak].
class CurrentMonthStreakFamily extends Family<AsyncValue<List<StreakDay>>> {
  /// Provider for current month's streak calendar.
  ///
  /// Copied from [currentMonthStreak].
  const CurrentMonthStreakFamily();

  /// Provider for current month's streak calendar.
  ///
  /// Copied from [currentMonthStreak].
  CurrentMonthStreakProvider call(
    String childId,
  ) {
    return CurrentMonthStreakProvider(
      childId,
    );
  }

  @override
  CurrentMonthStreakProvider getProviderOverride(
    covariant CurrentMonthStreakProvider provider,
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
  String? get name => r'currentMonthStreakProvider';
}

/// Provider for current month's streak calendar.
///
/// Copied from [currentMonthStreak].
class CurrentMonthStreakProvider
    extends AutoDisposeFutureProvider<List<StreakDay>> {
  /// Provider for current month's streak calendar.
  ///
  /// Copied from [currentMonthStreak].
  CurrentMonthStreakProvider(
    String childId,
  ) : this._internal(
          (ref) => currentMonthStreak(
            ref as CurrentMonthStreakRef,
            childId,
          ),
          from: currentMonthStreakProvider,
          name: r'currentMonthStreakProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$currentMonthStreakHash,
          dependencies: CurrentMonthStreakFamily._dependencies,
          allTransitiveDependencies:
              CurrentMonthStreakFamily._allTransitiveDependencies,
          childId: childId,
        );

  CurrentMonthStreakProvider._internal(
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
    FutureOr<List<StreakDay>> Function(CurrentMonthStreakRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: CurrentMonthStreakProvider._internal(
        (ref) => create(ref as CurrentMonthStreakRef),
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
  AutoDisposeFutureProviderElement<List<StreakDay>> createElement() {
    return _CurrentMonthStreakProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is CurrentMonthStreakProvider && other.childId == childId;
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
mixin CurrentMonthStreakRef on AutoDisposeFutureProviderRef<List<StreakDay>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _CurrentMonthStreakProviderElement
    extends AutoDisposeFutureProviderElement<List<StreakDay>>
    with CurrentMonthStreakRef {
  _CurrentMonthStreakProviderElement(super.provider);

  @override
  String get childId => (origin as CurrentMonthStreakProvider).childId;
}

String _$todayUsageHash() => r'40f6f37ad610233b7b9e6ca50c0cb672cdfb5561';

/// Provider for today's usage data.
///
/// Copied from [todayUsage].
@ProviderFor(todayUsage)
const todayUsageProvider = TodayUsageFamily();

/// Provider for today's usage data.
///
/// Copied from [todayUsage].
class TodayUsageFamily extends Family<AsyncValue<DailyUsage>> {
  /// Provider for today's usage data.
  ///
  /// Copied from [todayUsage].
  const TodayUsageFamily();

  /// Provider for today's usage data.
  ///
  /// Copied from [todayUsage].
  TodayUsageProvider call(
    String childId,
  ) {
    return TodayUsageProvider(
      childId,
    );
  }

  @override
  TodayUsageProvider getProviderOverride(
    covariant TodayUsageProvider provider,
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
  String? get name => r'todayUsageProvider';
}

/// Provider for today's usage data.
///
/// Copied from [todayUsage].
class TodayUsageProvider extends AutoDisposeFutureProvider<DailyUsage> {
  /// Provider for today's usage data.
  ///
  /// Copied from [todayUsage].
  TodayUsageProvider(
    String childId,
  ) : this._internal(
          (ref) => todayUsage(
            ref as TodayUsageRef,
            childId,
          ),
          from: todayUsageProvider,
          name: r'todayUsageProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$todayUsageHash,
          dependencies: TodayUsageFamily._dependencies,
          allTransitiveDependencies:
              TodayUsageFamily._allTransitiveDependencies,
          childId: childId,
        );

  TodayUsageProvider._internal(
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
    FutureOr<DailyUsage> Function(TodayUsageRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: TodayUsageProvider._internal(
        (ref) => create(ref as TodayUsageRef),
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
  AutoDisposeFutureProviderElement<DailyUsage> createElement() {
    return _TodayUsageProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is TodayUsageProvider && other.childId == childId;
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
mixin TodayUsageRef on AutoDisposeFutureProviderRef<DailyUsage> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _TodayUsageProviderElement
    extends AutoDisposeFutureProviderElement<DailyUsage> with TodayUsageRef {
  _TodayUsageProviderElement(super.provider);

  @override
  String get childId => (origin as TodayUsageProvider).childId;
}

String _$dailyUsageHash() => r'298292ed6584ac34ca0dd427ffe8bb161674f065';

/// Provider for usage on a specific date.
///
/// Copied from [dailyUsage].
@ProviderFor(dailyUsage)
const dailyUsageProvider = DailyUsageFamily();

/// Provider for usage on a specific date.
///
/// Copied from [dailyUsage].
class DailyUsageFamily extends Family<AsyncValue<DailyUsage>> {
  /// Provider for usage on a specific date.
  ///
  /// Copied from [dailyUsage].
  const DailyUsageFamily();

  /// Provider for usage on a specific date.
  ///
  /// Copied from [dailyUsage].
  DailyUsageProvider call(
    String childId,
    DateTime date,
  ) {
    return DailyUsageProvider(
      childId,
      date,
    );
  }

  @override
  DailyUsageProvider getProviderOverride(
    covariant DailyUsageProvider provider,
  ) {
    return call(
      provider.childId,
      provider.date,
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
  String? get name => r'dailyUsageProvider';
}

/// Provider for usage on a specific date.
///
/// Copied from [dailyUsage].
class DailyUsageProvider extends AutoDisposeFutureProvider<DailyUsage> {
  /// Provider for usage on a specific date.
  ///
  /// Copied from [dailyUsage].
  DailyUsageProvider(
    String childId,
    DateTime date,
  ) : this._internal(
          (ref) => dailyUsage(
            ref as DailyUsageRef,
            childId,
            date,
          ),
          from: dailyUsageProvider,
          name: r'dailyUsageProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$dailyUsageHash,
          dependencies: DailyUsageFamily._dependencies,
          allTransitiveDependencies:
              DailyUsageFamily._allTransitiveDependencies,
          childId: childId,
          date: date,
        );

  DailyUsageProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.childId,
    required this.date,
  }) : super.internal();

  final String childId;
  final DateTime date;

  @override
  Override overrideWith(
    FutureOr<DailyUsage> Function(DailyUsageRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: DailyUsageProvider._internal(
        (ref) => create(ref as DailyUsageRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        childId: childId,
        date: date,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<DailyUsage> createElement() {
    return _DailyUsageProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is DailyUsageProvider &&
        other.childId == childId &&
        other.date == date;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, childId.hashCode);
    hash = _SystemHash.combine(hash, date.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin DailyUsageRef on AutoDisposeFutureProviderRef<DailyUsage> {
  /// The parameter `childId` of this provider.
  String get childId;

  /// The parameter `date` of this provider.
  DateTime get date;
}

class _DailyUsageProviderElement
    extends AutoDisposeFutureProviderElement<DailyUsage> with DailyUsageRef {
  _DailyUsageProviderElement(super.provider);

  @override
  String get childId => (origin as DailyUsageProvider).childId;
  @override
  DateTime get date => (origin as DailyUsageProvider).date;
}

String _$weeklyUsageHash() => r'f5bf5feda92c0c551f79f36e2771508c210654b9';

/// Provider for weekly usage summary.
///
/// Copied from [weeklyUsage].
@ProviderFor(weeklyUsage)
const weeklyUsageProvider = WeeklyUsageFamily();

/// Provider for weekly usage summary.
///
/// Copied from [weeklyUsage].
class WeeklyUsageFamily extends Family<AsyncValue<UsageSummary>> {
  /// Provider for weekly usage summary.
  ///
  /// Copied from [weeklyUsage].
  const WeeklyUsageFamily();

  /// Provider for weekly usage summary.
  ///
  /// Copied from [weeklyUsage].
  WeeklyUsageProvider call(
    String childId,
  ) {
    return WeeklyUsageProvider(
      childId,
    );
  }

  @override
  WeeklyUsageProvider getProviderOverride(
    covariant WeeklyUsageProvider provider,
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
  String? get name => r'weeklyUsageProvider';
}

/// Provider for weekly usage summary.
///
/// Copied from [weeklyUsage].
class WeeklyUsageProvider extends AutoDisposeFutureProvider<UsageSummary> {
  /// Provider for weekly usage summary.
  ///
  /// Copied from [weeklyUsage].
  WeeklyUsageProvider(
    String childId,
  ) : this._internal(
          (ref) => weeklyUsage(
            ref as WeeklyUsageRef,
            childId,
          ),
          from: weeklyUsageProvider,
          name: r'weeklyUsageProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$weeklyUsageHash,
          dependencies: WeeklyUsageFamily._dependencies,
          allTransitiveDependencies:
              WeeklyUsageFamily._allTransitiveDependencies,
          childId: childId,
        );

  WeeklyUsageProvider._internal(
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
    FutureOr<UsageSummary> Function(WeeklyUsageRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: WeeklyUsageProvider._internal(
        (ref) => create(ref as WeeklyUsageRef),
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
  AutoDisposeFutureProviderElement<UsageSummary> createElement() {
    return _WeeklyUsageProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is WeeklyUsageProvider && other.childId == childId;
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
mixin WeeklyUsageRef on AutoDisposeFutureProviderRef<UsageSummary> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _WeeklyUsageProviderElement
    extends AutoDisposeFutureProviderElement<UsageSummary> with WeeklyUsageRef {
  _WeeklyUsageProviderElement(super.provider);

  @override
  String get childId => (origin as WeeklyUsageProvider).childId;
}

String _$monthlyUsageHash() => r'58d9fdf1677b2f0d1f5a73961cc4b608e6258387';

/// Provider for monthly usage summary.
///
/// Copied from [monthlyUsage].
@ProviderFor(monthlyUsage)
const monthlyUsageProvider = MonthlyUsageFamily();

/// Provider for monthly usage summary.
///
/// Copied from [monthlyUsage].
class MonthlyUsageFamily extends Family<AsyncValue<UsageSummary>> {
  /// Provider for monthly usage summary.
  ///
  /// Copied from [monthlyUsage].
  const MonthlyUsageFamily();

  /// Provider for monthly usage summary.
  ///
  /// Copied from [monthlyUsage].
  MonthlyUsageProvider call(
    String childId,
  ) {
    return MonthlyUsageProvider(
      childId,
    );
  }

  @override
  MonthlyUsageProvider getProviderOverride(
    covariant MonthlyUsageProvider provider,
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
  String? get name => r'monthlyUsageProvider';
}

/// Provider for monthly usage summary.
///
/// Copied from [monthlyUsage].
class MonthlyUsageProvider extends AutoDisposeFutureProvider<UsageSummary> {
  /// Provider for monthly usage summary.
  ///
  /// Copied from [monthlyUsage].
  MonthlyUsageProvider(
    String childId,
  ) : this._internal(
          (ref) => monthlyUsage(
            ref as MonthlyUsageRef,
            childId,
          ),
          from: monthlyUsageProvider,
          name: r'monthlyUsageProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$monthlyUsageHash,
          dependencies: MonthlyUsageFamily._dependencies,
          allTransitiveDependencies:
              MonthlyUsageFamily._allTransitiveDependencies,
          childId: childId,
        );

  MonthlyUsageProvider._internal(
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
    FutureOr<UsageSummary> Function(MonthlyUsageRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: MonthlyUsageProvider._internal(
        (ref) => create(ref as MonthlyUsageRef),
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
  AutoDisposeFutureProviderElement<UsageSummary> createElement() {
    return _MonthlyUsageProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is MonthlyUsageProvider && other.childId == childId;
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
mixin MonthlyUsageRef on AutoDisposeFutureProviderRef<UsageSummary> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _MonthlyUsageProviderElement
    extends AutoDisposeFutureProviderElement<UsageSummary>
    with MonthlyUsageRef {
  _MonthlyUsageProviderElement(super.provider);

  @override
  String get childId => (origin as MonthlyUsageProvider).childId;
}

String _$recentSessionsHash() => r'7fadafe1a4f2045527b15476be3f181337aab256';

/// Provider for recent usage sessions.
///
/// Copied from [recentSessions].
@ProviderFor(recentSessions)
const recentSessionsProvider = RecentSessionsFamily();

/// Provider for recent usage sessions.
///
/// Copied from [recentSessions].
class RecentSessionsFamily extends Family<AsyncValue<List<UsageSession>>> {
  /// Provider for recent usage sessions.
  ///
  /// Copied from [recentSessions].
  const RecentSessionsFamily();

  /// Provider for recent usage sessions.
  ///
  /// Copied from [recentSessions].
  RecentSessionsProvider call(
    String childId,
  ) {
    return RecentSessionsProvider(
      childId,
    );
  }

  @override
  RecentSessionsProvider getProviderOverride(
    covariant RecentSessionsProvider provider,
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
  String? get name => r'recentSessionsProvider';
}

/// Provider for recent usage sessions.
///
/// Copied from [recentSessions].
class RecentSessionsProvider
    extends AutoDisposeFutureProvider<List<UsageSession>> {
  /// Provider for recent usage sessions.
  ///
  /// Copied from [recentSessions].
  RecentSessionsProvider(
    String childId,
  ) : this._internal(
          (ref) => recentSessions(
            ref as RecentSessionsRef,
            childId,
          ),
          from: recentSessionsProvider,
          name: r'recentSessionsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$recentSessionsHash,
          dependencies: RecentSessionsFamily._dependencies,
          allTransitiveDependencies:
              RecentSessionsFamily._allTransitiveDependencies,
          childId: childId,
        );

  RecentSessionsProvider._internal(
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
    FutureOr<List<UsageSession>> Function(RecentSessionsRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: RecentSessionsProvider._internal(
        (ref) => create(ref as RecentSessionsRef),
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
  AutoDisposeFutureProviderElement<List<UsageSession>> createElement() {
    return _RecentSessionsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is RecentSessionsProvider && other.childId == childId;
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
mixin RecentSessionsRef on AutoDisposeFutureProviderRef<List<UsageSession>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _RecentSessionsProviderElement
    extends AutoDisposeFutureProviderElement<List<UsageSession>>
    with RecentSessionsRef {
  _RecentSessionsProviderElement(super.provider);

  @override
  String get childId => (origin as RecentSessionsProvider).childId;
}

String _$screenTimeStatusHash() => r'417d6c6520e4b01d1a4fbe03915bc02c64034b94';

/// Provider for current screen time status.
///
/// Copied from [screenTimeStatus].
@ProviderFor(screenTimeStatus)
const screenTimeStatusProvider = ScreenTimeStatusFamily();

/// Provider for current screen time status.
///
/// Copied from [screenTimeStatus].
class ScreenTimeStatusFamily extends Family<AsyncValue<ScreenTimeStatus>> {
  /// Provider for current screen time status.
  ///
  /// Copied from [screenTimeStatus].
  const ScreenTimeStatusFamily();

  /// Provider for current screen time status.
  ///
  /// Copied from [screenTimeStatus].
  ScreenTimeStatusProvider call(
    String childId,
  ) {
    return ScreenTimeStatusProvider(
      childId,
    );
  }

  @override
  ScreenTimeStatusProvider getProviderOverride(
    covariant ScreenTimeStatusProvider provider,
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
  String? get name => r'screenTimeStatusProvider';
}

/// Provider for current screen time status.
///
/// Copied from [screenTimeStatus].
class ScreenTimeStatusProvider
    extends AutoDisposeFutureProvider<ScreenTimeStatus> {
  /// Provider for current screen time status.
  ///
  /// Copied from [screenTimeStatus].
  ScreenTimeStatusProvider(
    String childId,
  ) : this._internal(
          (ref) => screenTimeStatus(
            ref as ScreenTimeStatusRef,
            childId,
          ),
          from: screenTimeStatusProvider,
          name: r'screenTimeStatusProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$screenTimeStatusHash,
          dependencies: ScreenTimeStatusFamily._dependencies,
          allTransitiveDependencies:
              ScreenTimeStatusFamily._allTransitiveDependencies,
          childId: childId,
        );

  ScreenTimeStatusProvider._internal(
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
    FutureOr<ScreenTimeStatus> Function(ScreenTimeStatusRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ScreenTimeStatusProvider._internal(
        (ref) => create(ref as ScreenTimeStatusRef),
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
  AutoDisposeFutureProviderElement<ScreenTimeStatus> createElement() {
    return _ScreenTimeStatusProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ScreenTimeStatusProvider && other.childId == childId;
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
mixin ScreenTimeStatusRef on AutoDisposeFutureProviderRef<ScreenTimeStatus> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _ScreenTimeStatusProviderElement
    extends AutoDisposeFutureProviderElement<ScreenTimeStatus>
    with ScreenTimeStatusRef {
  _ScreenTimeStatusProviderElement(super.provider);

  @override
  String get childId => (origin as ScreenTimeStatusProvider).childId;
}

String _$engagementMilestonesHash() =>
    r'1634fd11a476c1253a0f15704a1620a1adb3041f';

/// Provider for engagement milestones.
///
/// Copied from [engagementMilestones].
@ProviderFor(engagementMilestones)
const engagementMilestonesProvider = EngagementMilestonesFamily();

/// Provider for engagement milestones.
///
/// Copied from [engagementMilestones].
class EngagementMilestonesFamily
    extends Family<AsyncValue<List<EngagementMilestone>>> {
  /// Provider for engagement milestones.
  ///
  /// Copied from [engagementMilestones].
  const EngagementMilestonesFamily();

  /// Provider for engagement milestones.
  ///
  /// Copied from [engagementMilestones].
  EngagementMilestonesProvider call(
    String childId,
  ) {
    return EngagementMilestonesProvider(
      childId,
    );
  }

  @override
  EngagementMilestonesProvider getProviderOverride(
    covariant EngagementMilestonesProvider provider,
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
  String? get name => r'engagementMilestonesProvider';
}

/// Provider for engagement milestones.
///
/// Copied from [engagementMilestones].
class EngagementMilestonesProvider
    extends AutoDisposeFutureProvider<List<EngagementMilestone>> {
  /// Provider for engagement milestones.
  ///
  /// Copied from [engagementMilestones].
  EngagementMilestonesProvider(
    String childId,
  ) : this._internal(
          (ref) => engagementMilestones(
            ref as EngagementMilestonesRef,
            childId,
          ),
          from: engagementMilestonesProvider,
          name: r'engagementMilestonesProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$engagementMilestonesHash,
          dependencies: EngagementMilestonesFamily._dependencies,
          allTransitiveDependencies:
              EngagementMilestonesFamily._allTransitiveDependencies,
          childId: childId,
        );

  EngagementMilestonesProvider._internal(
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
    FutureOr<List<EngagementMilestone>> Function(
            EngagementMilestonesRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: EngagementMilestonesProvider._internal(
        (ref) => create(ref as EngagementMilestonesRef),
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
  AutoDisposeFutureProviderElement<List<EngagementMilestone>> createElement() {
    return _EngagementMilestonesProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is EngagementMilestonesProvider && other.childId == childId;
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
mixin EngagementMilestonesRef
    on AutoDisposeFutureProviderRef<List<EngagementMilestone>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _EngagementMilestonesProviderElement
    extends AutoDisposeFutureProviderElement<List<EngagementMilestone>>
    with EngagementMilestonesRef {
  _EngagementMilestonesProviderElement(super.provider);

  @override
  String get childId => (origin as EngagementMilestonesProvider).childId;
}

String _$achievedMilestonesHash() =>
    r'8e5027371be5af375f123890e7c1e08d2e5b166e';

/// Provider for achieved milestones only.
///
/// Copied from [achievedMilestones].
@ProviderFor(achievedMilestones)
const achievedMilestonesProvider = AchievedMilestonesFamily();

/// Provider for achieved milestones only.
///
/// Copied from [achievedMilestones].
class AchievedMilestonesFamily
    extends Family<AsyncValue<List<EngagementMilestone>>> {
  /// Provider for achieved milestones only.
  ///
  /// Copied from [achievedMilestones].
  const AchievedMilestonesFamily();

  /// Provider for achieved milestones only.
  ///
  /// Copied from [achievedMilestones].
  AchievedMilestonesProvider call(
    String childId,
  ) {
    return AchievedMilestonesProvider(
      childId,
    );
  }

  @override
  AchievedMilestonesProvider getProviderOverride(
    covariant AchievedMilestonesProvider provider,
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
  String? get name => r'achievedMilestonesProvider';
}

/// Provider for achieved milestones only.
///
/// Copied from [achievedMilestones].
class AchievedMilestonesProvider
    extends AutoDisposeFutureProvider<List<EngagementMilestone>> {
  /// Provider for achieved milestones only.
  ///
  /// Copied from [achievedMilestones].
  AchievedMilestonesProvider(
    String childId,
  ) : this._internal(
          (ref) => achievedMilestones(
            ref as AchievedMilestonesRef,
            childId,
          ),
          from: achievedMilestonesProvider,
          name: r'achievedMilestonesProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$achievedMilestonesHash,
          dependencies: AchievedMilestonesFamily._dependencies,
          allTransitiveDependencies:
              AchievedMilestonesFamily._allTransitiveDependencies,
          childId: childId,
        );

  AchievedMilestonesProvider._internal(
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
    FutureOr<List<EngagementMilestone>> Function(AchievedMilestonesRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: AchievedMilestonesProvider._internal(
        (ref) => create(ref as AchievedMilestonesRef),
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
  AutoDisposeFutureProviderElement<List<EngagementMilestone>> createElement() {
    return _AchievedMilestonesProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AchievedMilestonesProvider && other.childId == childId;
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
mixin AchievedMilestonesRef
    on AutoDisposeFutureProviderRef<List<EngagementMilestone>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _AchievedMilestonesProviderElement
    extends AutoDisposeFutureProviderElement<List<EngagementMilestone>>
    with AchievedMilestonesRef {
  _AchievedMilestonesProviderElement(super.provider);

  @override
  String get childId => (origin as AchievedMilestonesProvider).childId;
}

String _$inProgressMilestonesHash() =>
    r'410baf6e39e27e2c081cf037ebe0c1a3d16822e2';

/// Provider for in-progress milestones.
///
/// Copied from [inProgressMilestones].
@ProviderFor(inProgressMilestones)
const inProgressMilestonesProvider = InProgressMilestonesFamily();

/// Provider for in-progress milestones.
///
/// Copied from [inProgressMilestones].
class InProgressMilestonesFamily
    extends Family<AsyncValue<List<EngagementMilestone>>> {
  /// Provider for in-progress milestones.
  ///
  /// Copied from [inProgressMilestones].
  const InProgressMilestonesFamily();

  /// Provider for in-progress milestones.
  ///
  /// Copied from [inProgressMilestones].
  InProgressMilestonesProvider call(
    String childId,
  ) {
    return InProgressMilestonesProvider(
      childId,
    );
  }

  @override
  InProgressMilestonesProvider getProviderOverride(
    covariant InProgressMilestonesProvider provider,
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
  String? get name => r'inProgressMilestonesProvider';
}

/// Provider for in-progress milestones.
///
/// Copied from [inProgressMilestones].
class InProgressMilestonesProvider
    extends AutoDisposeFutureProvider<List<EngagementMilestone>> {
  /// Provider for in-progress milestones.
  ///
  /// Copied from [inProgressMilestones].
  InProgressMilestonesProvider(
    String childId,
  ) : this._internal(
          (ref) => inProgressMilestones(
            ref as InProgressMilestonesRef,
            childId,
          ),
          from: inProgressMilestonesProvider,
          name: r'inProgressMilestonesProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$inProgressMilestonesHash,
          dependencies: InProgressMilestonesFamily._dependencies,
          allTransitiveDependencies:
              InProgressMilestonesFamily._allTransitiveDependencies,
          childId: childId,
        );

  InProgressMilestonesProvider._internal(
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
    FutureOr<List<EngagementMilestone>> Function(
            InProgressMilestonesRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: InProgressMilestonesProvider._internal(
        (ref) => create(ref as InProgressMilestonesRef),
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
  AutoDisposeFutureProviderElement<List<EngagementMilestone>> createElement() {
    return _InProgressMilestonesProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is InProgressMilestonesProvider && other.childId == childId;
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
mixin InProgressMilestonesRef
    on AutoDisposeFutureProviderRef<List<EngagementMilestone>> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _InProgressMilestonesProviderElement
    extends AutoDisposeFutureProviderElement<List<EngagementMilestone>>
    with InProgressMilestonesRef {
  _InProgressMilestonesProviderElement(super.provider);

  @override
  String get childId => (origin as InProgressMilestonesProvider).childId;
}

String _$weeklyReportHash() => r'cab5eefa5c5ed4185d3f65c70440ad30cbdcabe1';

/// Provider for weekly engagement report.
///
/// Copied from [weeklyReport].
@ProviderFor(weeklyReport)
const weeklyReportProvider = WeeklyReportFamily();

/// Provider for weekly engagement report.
///
/// Copied from [weeklyReport].
class WeeklyReportFamily extends Family<AsyncValue<WeeklyEngagementReport>> {
  /// Provider for weekly engagement report.
  ///
  /// Copied from [weeklyReport].
  const WeeklyReportFamily();

  /// Provider for weekly engagement report.
  ///
  /// Copied from [weeklyReport].
  WeeklyReportProvider call(
    String childId,
  ) {
    return WeeklyReportProvider(
      childId,
    );
  }

  @override
  WeeklyReportProvider getProviderOverride(
    covariant WeeklyReportProvider provider,
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
  String? get name => r'weeklyReportProvider';
}

/// Provider for weekly engagement report.
///
/// Copied from [weeklyReport].
class WeeklyReportProvider
    extends AutoDisposeFutureProvider<WeeklyEngagementReport> {
  /// Provider for weekly engagement report.
  ///
  /// Copied from [weeklyReport].
  WeeklyReportProvider(
    String childId,
  ) : this._internal(
          (ref) => weeklyReport(
            ref as WeeklyReportRef,
            childId,
          ),
          from: weeklyReportProvider,
          name: r'weeklyReportProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$weeklyReportHash,
          dependencies: WeeklyReportFamily._dependencies,
          allTransitiveDependencies:
              WeeklyReportFamily._allTransitiveDependencies,
          childId: childId,
        );

  WeeklyReportProvider._internal(
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
    FutureOr<WeeklyEngagementReport> Function(WeeklyReportRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: WeeklyReportProvider._internal(
        (ref) => create(ref as WeeklyReportRef),
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
  AutoDisposeFutureProviderElement<WeeklyEngagementReport> createElement() {
    return _WeeklyReportProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is WeeklyReportProvider && other.childId == childId;
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
mixin WeeklyReportRef on AutoDisposeFutureProviderRef<WeeklyEngagementReport> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _WeeklyReportProviderElement
    extends AutoDisposeFutureProviderElement<WeeklyEngagementReport>
    with WeeklyReportRef {
  _WeeklyReportProviderElement(super.provider);

  @override
  String get childId => (origin as WeeklyReportProvider).childId;
}

String _$streakNotifierHash() => r'62d99015e80b0aca0b427ea8512dca85d1877d44';

abstract class _$StreakNotifier
    extends BuildlessAutoDisposeAsyncNotifier<LearningStreak> {
  late final String childId;

  FutureOr<LearningStreak> build(
    String childId,
  );
}

/// Provider for learning streak data.
///
/// Copied from [StreakNotifier].
@ProviderFor(StreakNotifier)
const streakNotifierProvider = StreakNotifierFamily();

/// Provider for learning streak data.
///
/// Copied from [StreakNotifier].
class StreakNotifierFamily extends Family<AsyncValue<LearningStreak>> {
  /// Provider for learning streak data.
  ///
  /// Copied from [StreakNotifier].
  const StreakNotifierFamily();

  /// Provider for learning streak data.
  ///
  /// Copied from [StreakNotifier].
  StreakNotifierProvider call(
    String childId,
  ) {
    return StreakNotifierProvider(
      childId,
    );
  }

  @override
  StreakNotifierProvider getProviderOverride(
    covariant StreakNotifierProvider provider,
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
  String? get name => r'streakNotifierProvider';
}

/// Provider for learning streak data.
///
/// Copied from [StreakNotifier].
class StreakNotifierProvider extends AutoDisposeAsyncNotifierProviderImpl<
    StreakNotifier, LearningStreak> {
  /// Provider for learning streak data.
  ///
  /// Copied from [StreakNotifier].
  StreakNotifierProvider(
    String childId,
  ) : this._internal(
          () => StreakNotifier()..childId = childId,
          from: streakNotifierProvider,
          name: r'streakNotifierProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$streakNotifierHash,
          dependencies: StreakNotifierFamily._dependencies,
          allTransitiveDependencies:
              StreakNotifierFamily._allTransitiveDependencies,
          childId: childId,
        );

  StreakNotifierProvider._internal(
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
  FutureOr<LearningStreak> runNotifierBuild(
    covariant StreakNotifier notifier,
  ) {
    return notifier.build(
      childId,
    );
  }

  @override
  Override overrideWith(StreakNotifier Function() create) {
    return ProviderOverride(
      origin: this,
      override: StreakNotifierProvider._internal(
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
  AutoDisposeAsyncNotifierProviderElement<StreakNotifier, LearningStreak>
      createElement() {
    return _StreakNotifierProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is StreakNotifierProvider && other.childId == childId;
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
mixin StreakNotifierRef on AutoDisposeAsyncNotifierProviderRef<LearningStreak> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _StreakNotifierProviderElement
    extends AutoDisposeAsyncNotifierProviderElement<StreakNotifier,
        LearningStreak> with StreakNotifierRef {
  _StreakNotifierProviderElement(super.provider);

  @override
  String get childId => (origin as StreakNotifierProvider).childId;
}

String _$screenTimeSettingsNotifierHash() =>
    r'b93b86d971b27514a637cf13f2b98541449d3401';

abstract class _$ScreenTimeSettingsNotifier
    extends BuildlessAutoDisposeAsyncNotifier<ScreenTimeSettings> {
  late final String childId;

  FutureOr<ScreenTimeSettings> build(
    String childId,
  );
}

/// Notifier for screen time settings.
///
/// Copied from [ScreenTimeSettingsNotifier].
@ProviderFor(ScreenTimeSettingsNotifier)
const screenTimeSettingsNotifierProvider = ScreenTimeSettingsNotifierFamily();

/// Notifier for screen time settings.
///
/// Copied from [ScreenTimeSettingsNotifier].
class ScreenTimeSettingsNotifierFamily
    extends Family<AsyncValue<ScreenTimeSettings>> {
  /// Notifier for screen time settings.
  ///
  /// Copied from [ScreenTimeSettingsNotifier].
  const ScreenTimeSettingsNotifierFamily();

  /// Notifier for screen time settings.
  ///
  /// Copied from [ScreenTimeSettingsNotifier].
  ScreenTimeSettingsNotifierProvider call(
    String childId,
  ) {
    return ScreenTimeSettingsNotifierProvider(
      childId,
    );
  }

  @override
  ScreenTimeSettingsNotifierProvider getProviderOverride(
    covariant ScreenTimeSettingsNotifierProvider provider,
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
  String? get name => r'screenTimeSettingsNotifierProvider';
}

/// Notifier for screen time settings.
///
/// Copied from [ScreenTimeSettingsNotifier].
class ScreenTimeSettingsNotifierProvider
    extends AutoDisposeAsyncNotifierProviderImpl<ScreenTimeSettingsNotifier,
        ScreenTimeSettings> {
  /// Notifier for screen time settings.
  ///
  /// Copied from [ScreenTimeSettingsNotifier].
  ScreenTimeSettingsNotifierProvider(
    String childId,
  ) : this._internal(
          () => ScreenTimeSettingsNotifier()..childId = childId,
          from: screenTimeSettingsNotifierProvider,
          name: r'screenTimeSettingsNotifierProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$screenTimeSettingsNotifierHash,
          dependencies: ScreenTimeSettingsNotifierFamily._dependencies,
          allTransitiveDependencies:
              ScreenTimeSettingsNotifierFamily._allTransitiveDependencies,
          childId: childId,
        );

  ScreenTimeSettingsNotifierProvider._internal(
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
  FutureOr<ScreenTimeSettings> runNotifierBuild(
    covariant ScreenTimeSettingsNotifier notifier,
  ) {
    return notifier.build(
      childId,
    );
  }

  @override
  Override overrideWith(ScreenTimeSettingsNotifier Function() create) {
    return ProviderOverride(
      origin: this,
      override: ScreenTimeSettingsNotifierProvider._internal(
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
  AutoDisposeAsyncNotifierProviderElement<ScreenTimeSettingsNotifier,
      ScreenTimeSettings> createElement() {
    return _ScreenTimeSettingsNotifierProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ScreenTimeSettingsNotifierProvider &&
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
mixin ScreenTimeSettingsNotifierRef
    on AutoDisposeAsyncNotifierProviderRef<ScreenTimeSettings> {
  /// The parameter `childId` of this provider.
  String get childId;
}

class _ScreenTimeSettingsNotifierProviderElement
    extends AutoDisposeAsyncNotifierProviderElement<ScreenTimeSettingsNotifier,
        ScreenTimeSettings> with ScreenTimeSettingsNotifierRef {
  _ScreenTimeSettingsNotifierProviderElement(super.provider);

  @override
  String get childId => (origin as ScreenTimeSettingsNotifierProvider).childId;
}

String _$screenTimeExtensionNotifierHash() =>
    r'f80020abc838f023e5606e70170a0e3ada09558d';

/// Notifier for granting screen time extensions.
///
/// Copied from [ScreenTimeExtensionNotifier].
@ProviderFor(ScreenTimeExtensionNotifier)
final screenTimeExtensionNotifierProvider = AutoDisposeNotifierProvider<
    ScreenTimeExtensionNotifier, AsyncValue<void>>.internal(
  ScreenTimeExtensionNotifier.new,
  name: r'screenTimeExtensionNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$screenTimeExtensionNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$ScreenTimeExtensionNotifier = AutoDisposeNotifier<AsyncValue<void>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
