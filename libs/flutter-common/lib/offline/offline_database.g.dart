// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'offline_database.dart';

// ignore_for_file: type=lint
class $OfflineLearnersTable extends OfflineLearners
    with TableInfo<$OfflineLearnersTable, OfflineLearner> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineLearnersTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _learnerIdMeta =
      const VerificationMeta('learnerId');
  @override
  late final GeneratedColumn<String> learnerId = GeneratedColumn<String>(
      'learner_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _displayNameMeta =
      const VerificationMeta('displayName');
  @override
  late final GeneratedColumn<String> displayName = GeneratedColumn<String>(
      'display_name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _gradeBandMeta =
      const VerificationMeta('gradeBand');
  @override
  late final GeneratedColumn<String> gradeBand = GeneratedColumn<String>(
      'grade_band', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _avatarUrlMeta =
      const VerificationMeta('avatarUrl');
  @override
  late final GeneratedColumn<String> avatarUrl = GeneratedColumn<String>(
      'avatar_url', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _preferencesJsonMeta =
      const VerificationMeta('preferencesJson');
  @override
  late final GeneratedColumn<String> preferencesJson = GeneratedColumn<String>(
      'preferences_json', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _tenantIdMeta =
      const VerificationMeta('tenantId');
  @override
  late final GeneratedColumn<String> tenantId = GeneratedColumn<String>(
      'tenant_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _lastSyncedAtMeta =
      const VerificationMeta('lastSyncedAt');
  @override
  late final GeneratedColumn<int> lastSyncedAt = GeneratedColumn<int>(
      'last_synced_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        learnerId,
        displayName,
        gradeBand,
        avatarUrl,
        preferencesJson,
        tenantId,
        lastSyncedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_learners';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineLearner> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('learner_id')) {
      context.handle(_learnerIdMeta,
          learnerId.isAcceptableOrUnknown(data['learner_id']!, _learnerIdMeta));
    } else if (isInserting) {
      context.missing(_learnerIdMeta);
    }
    if (data.containsKey('display_name')) {
      context.handle(
          _displayNameMeta,
          displayName.isAcceptableOrUnknown(
              data['display_name']!, _displayNameMeta));
    } else if (isInserting) {
      context.missing(_displayNameMeta);
    }
    if (data.containsKey('grade_band')) {
      context.handle(_gradeBandMeta,
          gradeBand.isAcceptableOrUnknown(data['grade_band']!, _gradeBandMeta));
    } else if (isInserting) {
      context.missing(_gradeBandMeta);
    }
    if (data.containsKey('avatar_url')) {
      context.handle(_avatarUrlMeta,
          avatarUrl.isAcceptableOrUnknown(data['avatar_url']!, _avatarUrlMeta));
    }
    if (data.containsKey('preferences_json')) {
      context.handle(
          _preferencesJsonMeta,
          preferencesJson.isAcceptableOrUnknown(
              data['preferences_json']!, _preferencesJsonMeta));
    }
    if (data.containsKey('tenant_id')) {
      context.handle(_tenantIdMeta,
          tenantId.isAcceptableOrUnknown(data['tenant_id']!, _tenantIdMeta));
    } else if (isInserting) {
      context.missing(_tenantIdMeta);
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
          _lastSyncedAtMeta,
          lastSyncedAt.isAcceptableOrUnknown(
              data['last_synced_at']!, _lastSyncedAtMeta));
    } else if (isInserting) {
      context.missing(_lastSyncedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {learnerId};
  @override
  OfflineLearner map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineLearner(
      learnerId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}learner_id'])!,
      displayName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}display_name'])!,
      gradeBand: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}grade_band'])!,
      avatarUrl: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}avatar_url']),
      preferencesJson: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}preferences_json']),
      tenantId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}tenant_id'])!,
      lastSyncedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}last_synced_at'])!,
    );
  }

  @override
  $OfflineLearnersTable createAlias(String alias) {
    return $OfflineLearnersTable(attachedDatabase, alias);
  }
}

class OfflineLearner extends DataClass implements Insertable<OfflineLearner> {
  /// Learner's server ID (primary key).
  final String learnerId;

  /// Display name for UI.
  final String displayName;

  /// Grade band: K-2, 3-5, 6-8, 9-12.
  final String gradeBand;

  /// Cached avatar URL (may be null).
  final String? avatarUrl;

  /// JSON-encoded accessibility/focus preferences.
  final String? preferencesJson;

  /// Tenant ID for multi-tenancy.
  final String tenantId;

  /// Unix timestamp of last successful sync.
  final int lastSyncedAt;
  const OfflineLearner(
      {required this.learnerId,
      required this.displayName,
      required this.gradeBand,
      this.avatarUrl,
      this.preferencesJson,
      required this.tenantId,
      required this.lastSyncedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['learner_id'] = Variable<String>(learnerId);
    map['display_name'] = Variable<String>(displayName);
    map['grade_band'] = Variable<String>(gradeBand);
    if (!nullToAbsent || avatarUrl != null) {
      map['avatar_url'] = Variable<String>(avatarUrl);
    }
    if (!nullToAbsent || preferencesJson != null) {
      map['preferences_json'] = Variable<String>(preferencesJson);
    }
    map['tenant_id'] = Variable<String>(tenantId);
    map['last_synced_at'] = Variable<int>(lastSyncedAt);
    return map;
  }

  OfflineLearnersCompanion toCompanion(bool nullToAbsent) {
    return OfflineLearnersCompanion(
      learnerId: Value(learnerId),
      displayName: Value(displayName),
      gradeBand: Value(gradeBand),
      avatarUrl: avatarUrl == null && nullToAbsent
          ? const Value.absent()
          : Value(avatarUrl),
      preferencesJson: preferencesJson == null && nullToAbsent
          ? const Value.absent()
          : Value(preferencesJson),
      tenantId: Value(tenantId),
      lastSyncedAt: Value(lastSyncedAt),
    );
  }

  factory OfflineLearner.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineLearner(
      learnerId: serializer.fromJson<String>(json['learnerId']),
      displayName: serializer.fromJson<String>(json['displayName']),
      gradeBand: serializer.fromJson<String>(json['gradeBand']),
      avatarUrl: serializer.fromJson<String?>(json['avatarUrl']),
      preferencesJson: serializer.fromJson<String?>(json['preferencesJson']),
      tenantId: serializer.fromJson<String>(json['tenantId']),
      lastSyncedAt: serializer.fromJson<int>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'learnerId': serializer.toJson<String>(learnerId),
      'displayName': serializer.toJson<String>(displayName),
      'gradeBand': serializer.toJson<String>(gradeBand),
      'avatarUrl': serializer.toJson<String?>(avatarUrl),
      'preferencesJson': serializer.toJson<String?>(preferencesJson),
      'tenantId': serializer.toJson<String>(tenantId),
      'lastSyncedAt': serializer.toJson<int>(lastSyncedAt),
    };
  }

  OfflineLearner copyWith(
          {String? learnerId,
          String? displayName,
          String? gradeBand,
          Value<String?> avatarUrl = const Value.absent(),
          Value<String?> preferencesJson = const Value.absent(),
          String? tenantId,
          int? lastSyncedAt}) =>
      OfflineLearner(
        learnerId: learnerId ?? this.learnerId,
        displayName: displayName ?? this.displayName,
        gradeBand: gradeBand ?? this.gradeBand,
        avatarUrl: avatarUrl.present ? avatarUrl.value : this.avatarUrl,
        preferencesJson: preferencesJson.present
            ? preferencesJson.value
            : this.preferencesJson,
        tenantId: tenantId ?? this.tenantId,
        lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      );
  OfflineLearner copyWithCompanion(OfflineLearnersCompanion data) {
    return OfflineLearner(
      learnerId: data.learnerId.present ? data.learnerId.value : this.learnerId,
      displayName:
          data.displayName.present ? data.displayName.value : this.displayName,
      gradeBand: data.gradeBand.present ? data.gradeBand.value : this.gradeBand,
      avatarUrl: data.avatarUrl.present ? data.avatarUrl.value : this.avatarUrl,
      preferencesJson: data.preferencesJson.present
          ? data.preferencesJson.value
          : this.preferencesJson,
      tenantId: data.tenantId.present ? data.tenantId.value : this.tenantId,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineLearner(')
          ..write('learnerId: $learnerId, ')
          ..write('displayName: $displayName, ')
          ..write('gradeBand: $gradeBand, ')
          ..write('avatarUrl: $avatarUrl, ')
          ..write('preferencesJson: $preferencesJson, ')
          ..write('tenantId: $tenantId, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(learnerId, displayName, gradeBand, avatarUrl,
      preferencesJson, tenantId, lastSyncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineLearner &&
          other.learnerId == this.learnerId &&
          other.displayName == this.displayName &&
          other.gradeBand == this.gradeBand &&
          other.avatarUrl == this.avatarUrl &&
          other.preferencesJson == this.preferencesJson &&
          other.tenantId == this.tenantId &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class OfflineLearnersCompanion extends UpdateCompanion<OfflineLearner> {
  final Value<String> learnerId;
  final Value<String> displayName;
  final Value<String> gradeBand;
  final Value<String?> avatarUrl;
  final Value<String?> preferencesJson;
  final Value<String> tenantId;
  final Value<int> lastSyncedAt;
  final Value<int> rowid;
  const OfflineLearnersCompanion({
    this.learnerId = const Value.absent(),
    this.displayName = const Value.absent(),
    this.gradeBand = const Value.absent(),
    this.avatarUrl = const Value.absent(),
    this.preferencesJson = const Value.absent(),
    this.tenantId = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineLearnersCompanion.insert({
    required String learnerId,
    required String displayName,
    required String gradeBand,
    this.avatarUrl = const Value.absent(),
    this.preferencesJson = const Value.absent(),
    required String tenantId,
    required int lastSyncedAt,
    this.rowid = const Value.absent(),
  })  : learnerId = Value(learnerId),
        displayName = Value(displayName),
        gradeBand = Value(gradeBand),
        tenantId = Value(tenantId),
        lastSyncedAt = Value(lastSyncedAt);
  static Insertable<OfflineLearner> custom({
    Expression<String>? learnerId,
    Expression<String>? displayName,
    Expression<String>? gradeBand,
    Expression<String>? avatarUrl,
    Expression<String>? preferencesJson,
    Expression<String>? tenantId,
    Expression<int>? lastSyncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (learnerId != null) 'learner_id': learnerId,
      if (displayName != null) 'display_name': displayName,
      if (gradeBand != null) 'grade_band': gradeBand,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      if (preferencesJson != null) 'preferences_json': preferencesJson,
      if (tenantId != null) 'tenant_id': tenantId,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineLearnersCompanion copyWith(
      {Value<String>? learnerId,
      Value<String>? displayName,
      Value<String>? gradeBand,
      Value<String?>? avatarUrl,
      Value<String?>? preferencesJson,
      Value<String>? tenantId,
      Value<int>? lastSyncedAt,
      Value<int>? rowid}) {
    return OfflineLearnersCompanion(
      learnerId: learnerId ?? this.learnerId,
      displayName: displayName ?? this.displayName,
      gradeBand: gradeBand ?? this.gradeBand,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      preferencesJson: preferencesJson ?? this.preferencesJson,
      tenantId: tenantId ?? this.tenantId,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (learnerId.present) {
      map['learner_id'] = Variable<String>(learnerId.value);
    }
    if (displayName.present) {
      map['display_name'] = Variable<String>(displayName.value);
    }
    if (gradeBand.present) {
      map['grade_band'] = Variable<String>(gradeBand.value);
    }
    if (avatarUrl.present) {
      map['avatar_url'] = Variable<String>(avatarUrl.value);
    }
    if (preferencesJson.present) {
      map['preferences_json'] = Variable<String>(preferencesJson.value);
    }
    if (tenantId.present) {
      map['tenant_id'] = Variable<String>(tenantId.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<int>(lastSyncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineLearnersCompanion(')
          ..write('learnerId: $learnerId, ')
          ..write('displayName: $displayName, ')
          ..write('gradeBand: $gradeBand, ')
          ..write('avatarUrl: $avatarUrl, ')
          ..write('preferencesJson: $preferencesJson, ')
          ..write('tenantId: $tenantId, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflineSessionsTable extends OfflineSessions
    with TableInfo<$OfflineSessionsTable, OfflineSession> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineSessionsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _localSessionIdMeta =
      const VerificationMeta('localSessionId');
  @override
  late final GeneratedColumn<String> localSessionId = GeneratedColumn<String>(
      'local_session_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _serverSessionIdMeta =
      const VerificationMeta('serverSessionId');
  @override
  late final GeneratedColumn<String> serverSessionId = GeneratedColumn<String>(
      'server_session_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _learnerIdMeta =
      const VerificationMeta('learnerId');
  @override
  late final GeneratedColumn<String> learnerId = GeneratedColumn<String>(
      'learner_id', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES offline_learners (learner_id)'));
  static const VerificationMeta _subjectMeta =
      const VerificationMeta('subject');
  @override
  late final GeneratedColumn<String> subject = GeneratedColumn<String>(
      'subject', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _sessionTypeMeta =
      const VerificationMeta('sessionType');
  @override
  late final GeneratedColumn<String> sessionType = GeneratedColumn<String>(
      'session_type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pendingSync'));
  static const VerificationMeta _originMeta = const VerificationMeta('origin');
  @override
  late final GeneratedColumn<String> origin = GeneratedColumn<String>(
      'origin', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _startedAtMeta =
      const VerificationMeta('startedAt');
  @override
  late final GeneratedColumn<int> startedAt = GeneratedColumn<int>(
      'started_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _endedAtMeta =
      const VerificationMeta('endedAt');
  @override
  late final GeneratedColumn<int> endedAt = GeneratedColumn<int>(
      'ended_at', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _planJsonMeta =
      const VerificationMeta('planJson');
  @override
  late final GeneratedColumn<String> planJson = GeneratedColumn<String>(
      'plan_json', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _errorMessageMeta =
      const VerificationMeta('errorMessage');
  @override
  late final GeneratedColumn<String> errorMessage = GeneratedColumn<String>(
      'error_message', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _retryCountMeta =
      const VerificationMeta('retryCount');
  @override
  late final GeneratedColumn<int> retryCount = GeneratedColumn<int>(
      'retry_count', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _lastUpdatedAtMeta =
      const VerificationMeta('lastUpdatedAt');
  @override
  late final GeneratedColumn<int> lastUpdatedAt = GeneratedColumn<int>(
      'last_updated_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        localSessionId,
        serverSessionId,
        learnerId,
        subject,
        sessionType,
        status,
        origin,
        startedAt,
        endedAt,
        planJson,
        errorMessage,
        retryCount,
        lastUpdatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_sessions';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineSession> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('local_session_id')) {
      context.handle(
          _localSessionIdMeta,
          localSessionId.isAcceptableOrUnknown(
              data['local_session_id']!, _localSessionIdMeta));
    } else if (isInserting) {
      context.missing(_localSessionIdMeta);
    }
    if (data.containsKey('server_session_id')) {
      context.handle(
          _serverSessionIdMeta,
          serverSessionId.isAcceptableOrUnknown(
              data['server_session_id']!, _serverSessionIdMeta));
    }
    if (data.containsKey('learner_id')) {
      context.handle(_learnerIdMeta,
          learnerId.isAcceptableOrUnknown(data['learner_id']!, _learnerIdMeta));
    } else if (isInserting) {
      context.missing(_learnerIdMeta);
    }
    if (data.containsKey('subject')) {
      context.handle(_subjectMeta,
          subject.isAcceptableOrUnknown(data['subject']!, _subjectMeta));
    } else if (isInserting) {
      context.missing(_subjectMeta);
    }
    if (data.containsKey('session_type')) {
      context.handle(
          _sessionTypeMeta,
          sessionType.isAcceptableOrUnknown(
              data['session_type']!, _sessionTypeMeta));
    } else if (isInserting) {
      context.missing(_sessionTypeMeta);
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('origin')) {
      context.handle(_originMeta,
          origin.isAcceptableOrUnknown(data['origin']!, _originMeta));
    } else if (isInserting) {
      context.missing(_originMeta);
    }
    if (data.containsKey('started_at')) {
      context.handle(_startedAtMeta,
          startedAt.isAcceptableOrUnknown(data['started_at']!, _startedAtMeta));
    } else if (isInserting) {
      context.missing(_startedAtMeta);
    }
    if (data.containsKey('ended_at')) {
      context.handle(_endedAtMeta,
          endedAt.isAcceptableOrUnknown(data['ended_at']!, _endedAtMeta));
    }
    if (data.containsKey('plan_json')) {
      context.handle(_planJsonMeta,
          planJson.isAcceptableOrUnknown(data['plan_json']!, _planJsonMeta));
    }
    if (data.containsKey('error_message')) {
      context.handle(
          _errorMessageMeta,
          errorMessage.isAcceptableOrUnknown(
              data['error_message']!, _errorMessageMeta));
    }
    if (data.containsKey('retry_count')) {
      context.handle(
          _retryCountMeta,
          retryCount.isAcceptableOrUnknown(
              data['retry_count']!, _retryCountMeta));
    }
    if (data.containsKey('last_updated_at')) {
      context.handle(
          _lastUpdatedAtMeta,
          lastUpdatedAt.isAcceptableOrUnknown(
              data['last_updated_at']!, _lastUpdatedAtMeta));
    } else if (isInserting) {
      context.missing(_lastUpdatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {localSessionId};
  @override
  OfflineSession map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineSession(
      localSessionId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}local_session_id'])!,
      serverSessionId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}server_session_id']),
      learnerId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}learner_id'])!,
      subject: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}subject'])!,
      sessionType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}session_type'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      origin: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}origin'])!,
      startedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}started_at'])!,
      endedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}ended_at']),
      planJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}plan_json']),
      errorMessage: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}error_message']),
      retryCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}retry_count'])!,
      lastUpdatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}last_updated_at'])!,
    );
  }

  @override
  $OfflineSessionsTable createAlias(String alias) {
    return $OfflineSessionsTable(attachedDatabase, alias);
  }
}

class OfflineSession extends DataClass implements Insertable<OfflineSession> {
  /// UUID generated locally (primary key).
  final String localSessionId;

  /// Server-assigned session ID after sync (null until synced).
  final String? serverSessionId;

  /// Foreign key to offline_learners.
  final String learnerId;

  /// Domain/subject: MATH, ELA, SCIENCE, etc.
  final String subject;

  /// Type of session (stored as string for Drift compatibility).
  final String sessionType;

  /// Sync status (stored as string).
  final String status;

  /// Origin: online or offline (stored as string).
  final String origin;

  /// Unix timestamp when session started.
  final int startedAt;

  /// Unix timestamp when session ended (null if ongoing).
  final int? endedAt;

  /// JSON-encoded today plan for this session.
  final String? planJson;

  /// Error message if sync failed.
  final String? errorMessage;

  /// Number of sync retry attempts.
  final int retryCount;

  /// Unix timestamp of last modification.
  final int lastUpdatedAt;
  const OfflineSession(
      {required this.localSessionId,
      this.serverSessionId,
      required this.learnerId,
      required this.subject,
      required this.sessionType,
      required this.status,
      required this.origin,
      required this.startedAt,
      this.endedAt,
      this.planJson,
      this.errorMessage,
      required this.retryCount,
      required this.lastUpdatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['local_session_id'] = Variable<String>(localSessionId);
    if (!nullToAbsent || serverSessionId != null) {
      map['server_session_id'] = Variable<String>(serverSessionId);
    }
    map['learner_id'] = Variable<String>(learnerId);
    map['subject'] = Variable<String>(subject);
    map['session_type'] = Variable<String>(sessionType);
    map['status'] = Variable<String>(status);
    map['origin'] = Variable<String>(origin);
    map['started_at'] = Variable<int>(startedAt);
    if (!nullToAbsent || endedAt != null) {
      map['ended_at'] = Variable<int>(endedAt);
    }
    if (!nullToAbsent || planJson != null) {
      map['plan_json'] = Variable<String>(planJson);
    }
    if (!nullToAbsent || errorMessage != null) {
      map['error_message'] = Variable<String>(errorMessage);
    }
    map['retry_count'] = Variable<int>(retryCount);
    map['last_updated_at'] = Variable<int>(lastUpdatedAt);
    return map;
  }

  OfflineSessionsCompanion toCompanion(bool nullToAbsent) {
    return OfflineSessionsCompanion(
      localSessionId: Value(localSessionId),
      serverSessionId: serverSessionId == null && nullToAbsent
          ? const Value.absent()
          : Value(serverSessionId),
      learnerId: Value(learnerId),
      subject: Value(subject),
      sessionType: Value(sessionType),
      status: Value(status),
      origin: Value(origin),
      startedAt: Value(startedAt),
      endedAt: endedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(endedAt),
      planJson: planJson == null && nullToAbsent
          ? const Value.absent()
          : Value(planJson),
      errorMessage: errorMessage == null && nullToAbsent
          ? const Value.absent()
          : Value(errorMessage),
      retryCount: Value(retryCount),
      lastUpdatedAt: Value(lastUpdatedAt),
    );
  }

  factory OfflineSession.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineSession(
      localSessionId: serializer.fromJson<String>(json['localSessionId']),
      serverSessionId: serializer.fromJson<String?>(json['serverSessionId']),
      learnerId: serializer.fromJson<String>(json['learnerId']),
      subject: serializer.fromJson<String>(json['subject']),
      sessionType: serializer.fromJson<String>(json['sessionType']),
      status: serializer.fromJson<String>(json['status']),
      origin: serializer.fromJson<String>(json['origin']),
      startedAt: serializer.fromJson<int>(json['startedAt']),
      endedAt: serializer.fromJson<int?>(json['endedAt']),
      planJson: serializer.fromJson<String?>(json['planJson']),
      errorMessage: serializer.fromJson<String?>(json['errorMessage']),
      retryCount: serializer.fromJson<int>(json['retryCount']),
      lastUpdatedAt: serializer.fromJson<int>(json['lastUpdatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'localSessionId': serializer.toJson<String>(localSessionId),
      'serverSessionId': serializer.toJson<String?>(serverSessionId),
      'learnerId': serializer.toJson<String>(learnerId),
      'subject': serializer.toJson<String>(subject),
      'sessionType': serializer.toJson<String>(sessionType),
      'status': serializer.toJson<String>(status),
      'origin': serializer.toJson<String>(origin),
      'startedAt': serializer.toJson<int>(startedAt),
      'endedAt': serializer.toJson<int?>(endedAt),
      'planJson': serializer.toJson<String?>(planJson),
      'errorMessage': serializer.toJson<String?>(errorMessage),
      'retryCount': serializer.toJson<int>(retryCount),
      'lastUpdatedAt': serializer.toJson<int>(lastUpdatedAt),
    };
  }

  OfflineSession copyWith(
          {String? localSessionId,
          Value<String?> serverSessionId = const Value.absent(),
          String? learnerId,
          String? subject,
          String? sessionType,
          String? status,
          String? origin,
          int? startedAt,
          Value<int?> endedAt = const Value.absent(),
          Value<String?> planJson = const Value.absent(),
          Value<String?> errorMessage = const Value.absent(),
          int? retryCount,
          int? lastUpdatedAt}) =>
      OfflineSession(
        localSessionId: localSessionId ?? this.localSessionId,
        serverSessionId: serverSessionId.present
            ? serverSessionId.value
            : this.serverSessionId,
        learnerId: learnerId ?? this.learnerId,
        subject: subject ?? this.subject,
        sessionType: sessionType ?? this.sessionType,
        status: status ?? this.status,
        origin: origin ?? this.origin,
        startedAt: startedAt ?? this.startedAt,
        endedAt: endedAt.present ? endedAt.value : this.endedAt,
        planJson: planJson.present ? planJson.value : this.planJson,
        errorMessage:
            errorMessage.present ? errorMessage.value : this.errorMessage,
        retryCount: retryCount ?? this.retryCount,
        lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
      );
  OfflineSession copyWithCompanion(OfflineSessionsCompanion data) {
    return OfflineSession(
      localSessionId: data.localSessionId.present
          ? data.localSessionId.value
          : this.localSessionId,
      serverSessionId: data.serverSessionId.present
          ? data.serverSessionId.value
          : this.serverSessionId,
      learnerId: data.learnerId.present ? data.learnerId.value : this.learnerId,
      subject: data.subject.present ? data.subject.value : this.subject,
      sessionType:
          data.sessionType.present ? data.sessionType.value : this.sessionType,
      status: data.status.present ? data.status.value : this.status,
      origin: data.origin.present ? data.origin.value : this.origin,
      startedAt: data.startedAt.present ? data.startedAt.value : this.startedAt,
      endedAt: data.endedAt.present ? data.endedAt.value : this.endedAt,
      planJson: data.planJson.present ? data.planJson.value : this.planJson,
      errorMessage: data.errorMessage.present
          ? data.errorMessage.value
          : this.errorMessage,
      retryCount:
          data.retryCount.present ? data.retryCount.value : this.retryCount,
      lastUpdatedAt: data.lastUpdatedAt.present
          ? data.lastUpdatedAt.value
          : this.lastUpdatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineSession(')
          ..write('localSessionId: $localSessionId, ')
          ..write('serverSessionId: $serverSessionId, ')
          ..write('learnerId: $learnerId, ')
          ..write('subject: $subject, ')
          ..write('sessionType: $sessionType, ')
          ..write('status: $status, ')
          ..write('origin: $origin, ')
          ..write('startedAt: $startedAt, ')
          ..write('endedAt: $endedAt, ')
          ..write('planJson: $planJson, ')
          ..write('errorMessage: $errorMessage, ')
          ..write('retryCount: $retryCount, ')
          ..write('lastUpdatedAt: $lastUpdatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      localSessionId,
      serverSessionId,
      learnerId,
      subject,
      sessionType,
      status,
      origin,
      startedAt,
      endedAt,
      planJson,
      errorMessage,
      retryCount,
      lastUpdatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineSession &&
          other.localSessionId == this.localSessionId &&
          other.serverSessionId == this.serverSessionId &&
          other.learnerId == this.learnerId &&
          other.subject == this.subject &&
          other.sessionType == this.sessionType &&
          other.status == this.status &&
          other.origin == this.origin &&
          other.startedAt == this.startedAt &&
          other.endedAt == this.endedAt &&
          other.planJson == this.planJson &&
          other.errorMessage == this.errorMessage &&
          other.retryCount == this.retryCount &&
          other.lastUpdatedAt == this.lastUpdatedAt);
}

class OfflineSessionsCompanion extends UpdateCompanion<OfflineSession> {
  final Value<String> localSessionId;
  final Value<String?> serverSessionId;
  final Value<String> learnerId;
  final Value<String> subject;
  final Value<String> sessionType;
  final Value<String> status;
  final Value<String> origin;
  final Value<int> startedAt;
  final Value<int?> endedAt;
  final Value<String?> planJson;
  final Value<String?> errorMessage;
  final Value<int> retryCount;
  final Value<int> lastUpdatedAt;
  final Value<int> rowid;
  const OfflineSessionsCompanion({
    this.localSessionId = const Value.absent(),
    this.serverSessionId = const Value.absent(),
    this.learnerId = const Value.absent(),
    this.subject = const Value.absent(),
    this.sessionType = const Value.absent(),
    this.status = const Value.absent(),
    this.origin = const Value.absent(),
    this.startedAt = const Value.absent(),
    this.endedAt = const Value.absent(),
    this.planJson = const Value.absent(),
    this.errorMessage = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.lastUpdatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineSessionsCompanion.insert({
    required String localSessionId,
    this.serverSessionId = const Value.absent(),
    required String learnerId,
    required String subject,
    required String sessionType,
    this.status = const Value.absent(),
    required String origin,
    required int startedAt,
    this.endedAt = const Value.absent(),
    this.planJson = const Value.absent(),
    this.errorMessage = const Value.absent(),
    this.retryCount = const Value.absent(),
    required int lastUpdatedAt,
    this.rowid = const Value.absent(),
  })  : localSessionId = Value(localSessionId),
        learnerId = Value(learnerId),
        subject = Value(subject),
        sessionType = Value(sessionType),
        origin = Value(origin),
        startedAt = Value(startedAt),
        lastUpdatedAt = Value(lastUpdatedAt);
  static Insertable<OfflineSession> custom({
    Expression<String>? localSessionId,
    Expression<String>? serverSessionId,
    Expression<String>? learnerId,
    Expression<String>? subject,
    Expression<String>? sessionType,
    Expression<String>? status,
    Expression<String>? origin,
    Expression<int>? startedAt,
    Expression<int>? endedAt,
    Expression<String>? planJson,
    Expression<String>? errorMessage,
    Expression<int>? retryCount,
    Expression<int>? lastUpdatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (localSessionId != null) 'local_session_id': localSessionId,
      if (serverSessionId != null) 'server_session_id': serverSessionId,
      if (learnerId != null) 'learner_id': learnerId,
      if (subject != null) 'subject': subject,
      if (sessionType != null) 'session_type': sessionType,
      if (status != null) 'status': status,
      if (origin != null) 'origin': origin,
      if (startedAt != null) 'started_at': startedAt,
      if (endedAt != null) 'ended_at': endedAt,
      if (planJson != null) 'plan_json': planJson,
      if (errorMessage != null) 'error_message': errorMessage,
      if (retryCount != null) 'retry_count': retryCount,
      if (lastUpdatedAt != null) 'last_updated_at': lastUpdatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineSessionsCompanion copyWith(
      {Value<String>? localSessionId,
      Value<String?>? serverSessionId,
      Value<String>? learnerId,
      Value<String>? subject,
      Value<String>? sessionType,
      Value<String>? status,
      Value<String>? origin,
      Value<int>? startedAt,
      Value<int?>? endedAt,
      Value<String?>? planJson,
      Value<String?>? errorMessage,
      Value<int>? retryCount,
      Value<int>? lastUpdatedAt,
      Value<int>? rowid}) {
    return OfflineSessionsCompanion(
      localSessionId: localSessionId ?? this.localSessionId,
      serverSessionId: serverSessionId ?? this.serverSessionId,
      learnerId: learnerId ?? this.learnerId,
      subject: subject ?? this.subject,
      sessionType: sessionType ?? this.sessionType,
      status: status ?? this.status,
      origin: origin ?? this.origin,
      startedAt: startedAt ?? this.startedAt,
      endedAt: endedAt ?? this.endedAt,
      planJson: planJson ?? this.planJson,
      errorMessage: errorMessage ?? this.errorMessage,
      retryCount: retryCount ?? this.retryCount,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (localSessionId.present) {
      map['local_session_id'] = Variable<String>(localSessionId.value);
    }
    if (serverSessionId.present) {
      map['server_session_id'] = Variable<String>(serverSessionId.value);
    }
    if (learnerId.present) {
      map['learner_id'] = Variable<String>(learnerId.value);
    }
    if (subject.present) {
      map['subject'] = Variable<String>(subject.value);
    }
    if (sessionType.present) {
      map['session_type'] = Variable<String>(sessionType.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (origin.present) {
      map['origin'] = Variable<String>(origin.value);
    }
    if (startedAt.present) {
      map['started_at'] = Variable<int>(startedAt.value);
    }
    if (endedAt.present) {
      map['ended_at'] = Variable<int>(endedAt.value);
    }
    if (planJson.present) {
      map['plan_json'] = Variable<String>(planJson.value);
    }
    if (errorMessage.present) {
      map['error_message'] = Variable<String>(errorMessage.value);
    }
    if (retryCount.present) {
      map['retry_count'] = Variable<int>(retryCount.value);
    }
    if (lastUpdatedAt.present) {
      map['last_updated_at'] = Variable<int>(lastUpdatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineSessionsCompanion(')
          ..write('localSessionId: $localSessionId, ')
          ..write('serverSessionId: $serverSessionId, ')
          ..write('learnerId: $learnerId, ')
          ..write('subject: $subject, ')
          ..write('sessionType: $sessionType, ')
          ..write('status: $status, ')
          ..write('origin: $origin, ')
          ..write('startedAt: $startedAt, ')
          ..write('endedAt: $endedAt, ')
          ..write('planJson: $planJson, ')
          ..write('errorMessage: $errorMessage, ')
          ..write('retryCount: $retryCount, ')
          ..write('lastUpdatedAt: $lastUpdatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflineEventsTable extends OfflineEvents
    with TableInfo<$OfflineEventsTable, OfflineEvent> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineEventsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _localSessionIdMeta =
      const VerificationMeta('localSessionId');
  @override
  late final GeneratedColumn<String> localSessionId = GeneratedColumn<String>(
      'local_session_id', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'REFERENCES offline_sessions (local_session_id)'));
  static const VerificationMeta _eventTypeMeta =
      const VerificationMeta('eventType');
  @override
  late final GeneratedColumn<String> eventType = GeneratedColumn<String>(
      'event_type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _eventJsonMeta =
      const VerificationMeta('eventJson');
  @override
  late final GeneratedColumn<String> eventJson = GeneratedColumn<String>(
      'event_json', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pendingSync'));
  static const VerificationMeta _sequenceNumMeta =
      const VerificationMeta('sequenceNum');
  @override
  late final GeneratedColumn<int> sequenceNum = GeneratedColumn<int>(
      'sequence_num', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
      'created_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _syncedAtMeta =
      const VerificationMeta('syncedAt');
  @override
  late final GeneratedColumn<int> syncedAt = GeneratedColumn<int>(
      'synced_at', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _errorMessageMeta =
      const VerificationMeta('errorMessage');
  @override
  late final GeneratedColumn<String> errorMessage = GeneratedColumn<String>(
      'error_message', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        localSessionId,
        eventType,
        eventJson,
        status,
        sequenceNum,
        createdAt,
        syncedAt,
        errorMessage
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_events';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineEvent> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('local_session_id')) {
      context.handle(
          _localSessionIdMeta,
          localSessionId.isAcceptableOrUnknown(
              data['local_session_id']!, _localSessionIdMeta));
    } else if (isInserting) {
      context.missing(_localSessionIdMeta);
    }
    if (data.containsKey('event_type')) {
      context.handle(_eventTypeMeta,
          eventType.isAcceptableOrUnknown(data['event_type']!, _eventTypeMeta));
    } else if (isInserting) {
      context.missing(_eventTypeMeta);
    }
    if (data.containsKey('event_json')) {
      context.handle(_eventJsonMeta,
          eventJson.isAcceptableOrUnknown(data['event_json']!, _eventJsonMeta));
    } else if (isInserting) {
      context.missing(_eventJsonMeta);
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('sequence_num')) {
      context.handle(
          _sequenceNumMeta,
          sequenceNum.isAcceptableOrUnknown(
              data['sequence_num']!, _sequenceNumMeta));
    } else if (isInserting) {
      context.missing(_sequenceNumMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('synced_at')) {
      context.handle(_syncedAtMeta,
          syncedAt.isAcceptableOrUnknown(data['synced_at']!, _syncedAtMeta));
    }
    if (data.containsKey('error_message')) {
      context.handle(
          _errorMessageMeta,
          errorMessage.isAcceptableOrUnknown(
              data['error_message']!, _errorMessageMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  OfflineEvent map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineEvent(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      localSessionId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}local_session_id'])!,
      eventType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}event_type'])!,
      eventJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}event_json'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      sequenceNum: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}sequence_num'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}created_at'])!,
      syncedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}synced_at']),
      errorMessage: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}error_message']),
    );
  }

  @override
  $OfflineEventsTable createAlias(String alias) {
    return $OfflineEventsTable(attachedDatabase, alias);
  }
}

class OfflineEvent extends DataClass implements Insertable<OfflineEvent> {
  /// Auto-incrementing local event ID.
  final int id;

  /// Foreign key to offline_sessions.
  final String localSessionId;

  /// Event type: LEARNING_EVENT, FOCUS_EVENT, ANSWER_EVENT, etc.
  final String eventType;

  /// Full JSON payload of the event.
  final String eventJson;

  /// Sync status (stored as string).
  final String status;

  /// Sequence number for ordering within session.
  final int sequenceNum;

  /// Unix timestamp when event was created.
  final int createdAt;

  /// Unix timestamp when event was synced (null until synced).
  final int? syncedAt;

  /// Error message if sync failed.
  final String? errorMessage;
  const OfflineEvent(
      {required this.id,
      required this.localSessionId,
      required this.eventType,
      required this.eventJson,
      required this.status,
      required this.sequenceNum,
      required this.createdAt,
      this.syncedAt,
      this.errorMessage});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['local_session_id'] = Variable<String>(localSessionId);
    map['event_type'] = Variable<String>(eventType);
    map['event_json'] = Variable<String>(eventJson);
    map['status'] = Variable<String>(status);
    map['sequence_num'] = Variable<int>(sequenceNum);
    map['created_at'] = Variable<int>(createdAt);
    if (!nullToAbsent || syncedAt != null) {
      map['synced_at'] = Variable<int>(syncedAt);
    }
    if (!nullToAbsent || errorMessage != null) {
      map['error_message'] = Variable<String>(errorMessage);
    }
    return map;
  }

  OfflineEventsCompanion toCompanion(bool nullToAbsent) {
    return OfflineEventsCompanion(
      id: Value(id),
      localSessionId: Value(localSessionId),
      eventType: Value(eventType),
      eventJson: Value(eventJson),
      status: Value(status),
      sequenceNum: Value(sequenceNum),
      createdAt: Value(createdAt),
      syncedAt: syncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(syncedAt),
      errorMessage: errorMessage == null && nullToAbsent
          ? const Value.absent()
          : Value(errorMessage),
    );
  }

  factory OfflineEvent.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineEvent(
      id: serializer.fromJson<int>(json['id']),
      localSessionId: serializer.fromJson<String>(json['localSessionId']),
      eventType: serializer.fromJson<String>(json['eventType']),
      eventJson: serializer.fromJson<String>(json['eventJson']),
      status: serializer.fromJson<String>(json['status']),
      sequenceNum: serializer.fromJson<int>(json['sequenceNum']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      syncedAt: serializer.fromJson<int?>(json['syncedAt']),
      errorMessage: serializer.fromJson<String?>(json['errorMessage']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'localSessionId': serializer.toJson<String>(localSessionId),
      'eventType': serializer.toJson<String>(eventType),
      'eventJson': serializer.toJson<String>(eventJson),
      'status': serializer.toJson<String>(status),
      'sequenceNum': serializer.toJson<int>(sequenceNum),
      'createdAt': serializer.toJson<int>(createdAt),
      'syncedAt': serializer.toJson<int?>(syncedAt),
      'errorMessage': serializer.toJson<String?>(errorMessage),
    };
  }

  OfflineEvent copyWith(
          {int? id,
          String? localSessionId,
          String? eventType,
          String? eventJson,
          String? status,
          int? sequenceNum,
          int? createdAt,
          Value<int?> syncedAt = const Value.absent(),
          Value<String?> errorMessage = const Value.absent()}) =>
      OfflineEvent(
        id: id ?? this.id,
        localSessionId: localSessionId ?? this.localSessionId,
        eventType: eventType ?? this.eventType,
        eventJson: eventJson ?? this.eventJson,
        status: status ?? this.status,
        sequenceNum: sequenceNum ?? this.sequenceNum,
        createdAt: createdAt ?? this.createdAt,
        syncedAt: syncedAt.present ? syncedAt.value : this.syncedAt,
        errorMessage:
            errorMessage.present ? errorMessage.value : this.errorMessage,
      );
  OfflineEvent copyWithCompanion(OfflineEventsCompanion data) {
    return OfflineEvent(
      id: data.id.present ? data.id.value : this.id,
      localSessionId: data.localSessionId.present
          ? data.localSessionId.value
          : this.localSessionId,
      eventType: data.eventType.present ? data.eventType.value : this.eventType,
      eventJson: data.eventJson.present ? data.eventJson.value : this.eventJson,
      status: data.status.present ? data.status.value : this.status,
      sequenceNum:
          data.sequenceNum.present ? data.sequenceNum.value : this.sequenceNum,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      syncedAt: data.syncedAt.present ? data.syncedAt.value : this.syncedAt,
      errorMessage: data.errorMessage.present
          ? data.errorMessage.value
          : this.errorMessage,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineEvent(')
          ..write('id: $id, ')
          ..write('localSessionId: $localSessionId, ')
          ..write('eventType: $eventType, ')
          ..write('eventJson: $eventJson, ')
          ..write('status: $status, ')
          ..write('sequenceNum: $sequenceNum, ')
          ..write('createdAt: $createdAt, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('errorMessage: $errorMessage')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, localSessionId, eventType, eventJson,
      status, sequenceNum, createdAt, syncedAt, errorMessage);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineEvent &&
          other.id == this.id &&
          other.localSessionId == this.localSessionId &&
          other.eventType == this.eventType &&
          other.eventJson == this.eventJson &&
          other.status == this.status &&
          other.sequenceNum == this.sequenceNum &&
          other.createdAt == this.createdAt &&
          other.syncedAt == this.syncedAt &&
          other.errorMessage == this.errorMessage);
}

class OfflineEventsCompanion extends UpdateCompanion<OfflineEvent> {
  final Value<int> id;
  final Value<String> localSessionId;
  final Value<String> eventType;
  final Value<String> eventJson;
  final Value<String> status;
  final Value<int> sequenceNum;
  final Value<int> createdAt;
  final Value<int?> syncedAt;
  final Value<String?> errorMessage;
  const OfflineEventsCompanion({
    this.id = const Value.absent(),
    this.localSessionId = const Value.absent(),
    this.eventType = const Value.absent(),
    this.eventJson = const Value.absent(),
    this.status = const Value.absent(),
    this.sequenceNum = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.errorMessage = const Value.absent(),
  });
  OfflineEventsCompanion.insert({
    this.id = const Value.absent(),
    required String localSessionId,
    required String eventType,
    required String eventJson,
    this.status = const Value.absent(),
    required int sequenceNum,
    required int createdAt,
    this.syncedAt = const Value.absent(),
    this.errorMessage = const Value.absent(),
  })  : localSessionId = Value(localSessionId),
        eventType = Value(eventType),
        eventJson = Value(eventJson),
        sequenceNum = Value(sequenceNum),
        createdAt = Value(createdAt);
  static Insertable<OfflineEvent> custom({
    Expression<int>? id,
    Expression<String>? localSessionId,
    Expression<String>? eventType,
    Expression<String>? eventJson,
    Expression<String>? status,
    Expression<int>? sequenceNum,
    Expression<int>? createdAt,
    Expression<int>? syncedAt,
    Expression<String>? errorMessage,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (localSessionId != null) 'local_session_id': localSessionId,
      if (eventType != null) 'event_type': eventType,
      if (eventJson != null) 'event_json': eventJson,
      if (status != null) 'status': status,
      if (sequenceNum != null) 'sequence_num': sequenceNum,
      if (createdAt != null) 'created_at': createdAt,
      if (syncedAt != null) 'synced_at': syncedAt,
      if (errorMessage != null) 'error_message': errorMessage,
    });
  }

  OfflineEventsCompanion copyWith(
      {Value<int>? id,
      Value<String>? localSessionId,
      Value<String>? eventType,
      Value<String>? eventJson,
      Value<String>? status,
      Value<int>? sequenceNum,
      Value<int>? createdAt,
      Value<int?>? syncedAt,
      Value<String?>? errorMessage}) {
    return OfflineEventsCompanion(
      id: id ?? this.id,
      localSessionId: localSessionId ?? this.localSessionId,
      eventType: eventType ?? this.eventType,
      eventJson: eventJson ?? this.eventJson,
      status: status ?? this.status,
      sequenceNum: sequenceNum ?? this.sequenceNum,
      createdAt: createdAt ?? this.createdAt,
      syncedAt: syncedAt ?? this.syncedAt,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (localSessionId.present) {
      map['local_session_id'] = Variable<String>(localSessionId.value);
    }
    if (eventType.present) {
      map['event_type'] = Variable<String>(eventType.value);
    }
    if (eventJson.present) {
      map['event_json'] = Variable<String>(eventJson.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (sequenceNum.present) {
      map['sequence_num'] = Variable<int>(sequenceNum.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (syncedAt.present) {
      map['synced_at'] = Variable<int>(syncedAt.value);
    }
    if (errorMessage.present) {
      map['error_message'] = Variable<String>(errorMessage.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineEventsCompanion(')
          ..write('id: $id, ')
          ..write('localSessionId: $localSessionId, ')
          ..write('eventType: $eventType, ')
          ..write('eventJson: $eventJson, ')
          ..write('status: $status, ')
          ..write('sequenceNum: $sequenceNum, ')
          ..write('createdAt: $createdAt, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('errorMessage: $errorMessage')
          ..write(')'))
        .toString();
  }
}

class $OfflineContentCacheTable extends OfflineContentCache
    with TableInfo<$OfflineContentCacheTable, OfflineContent> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineContentCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _contentKeyMeta =
      const VerificationMeta('contentKey');
  @override
  late final GeneratedColumn<String> contentKey = GeneratedColumn<String>(
      'content_key', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _contentTypeMeta =
      const VerificationMeta('contentType');
  @override
  late final GeneratedColumn<String> contentType = GeneratedColumn<String>(
      'content_type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _subjectMeta =
      const VerificationMeta('subject');
  @override
  late final GeneratedColumn<String> subject = GeneratedColumn<String>(
      'subject', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _gradeBandMeta =
      const VerificationMeta('gradeBand');
  @override
  late final GeneratedColumn<String> gradeBand = GeneratedColumn<String>(
      'grade_band', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _jsonPayloadMeta =
      const VerificationMeta('jsonPayload');
  @override
  late final GeneratedColumn<String> jsonPayload = GeneratedColumn<String>(
      'json_payload', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _mediaPathsJsonMeta =
      const VerificationMeta('mediaPathsJson');
  @override
  late final GeneratedColumn<String> mediaPathsJson = GeneratedColumn<String>(
      'media_paths_json', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _sizeBytesMeta =
      const VerificationMeta('sizeBytes');
  @override
  late final GeneratedColumn<int> sizeBytes = GeneratedColumn<int>(
      'size_bytes', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _expiresAtMeta =
      const VerificationMeta('expiresAt');
  @override
  late final GeneratedColumn<int> expiresAt = GeneratedColumn<int>(
      'expires_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
      'created_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _lastAccessedAtMeta =
      const VerificationMeta('lastAccessedAt');
  @override
  late final GeneratedColumn<int> lastAccessedAt = GeneratedColumn<int>(
      'last_accessed_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        contentKey,
        contentType,
        subject,
        gradeBand,
        jsonPayload,
        mediaPathsJson,
        sizeBytes,
        expiresAt,
        createdAt,
        lastAccessedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_content_cache';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineContent> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('content_key')) {
      context.handle(
          _contentKeyMeta,
          contentKey.isAcceptableOrUnknown(
              data['content_key']!, _contentKeyMeta));
    } else if (isInserting) {
      context.missing(_contentKeyMeta);
    }
    if (data.containsKey('content_type')) {
      context.handle(
          _contentTypeMeta,
          contentType.isAcceptableOrUnknown(
              data['content_type']!, _contentTypeMeta));
    } else if (isInserting) {
      context.missing(_contentTypeMeta);
    }
    if (data.containsKey('subject')) {
      context.handle(_subjectMeta,
          subject.isAcceptableOrUnknown(data['subject']!, _subjectMeta));
    } else if (isInserting) {
      context.missing(_subjectMeta);
    }
    if (data.containsKey('grade_band')) {
      context.handle(_gradeBandMeta,
          gradeBand.isAcceptableOrUnknown(data['grade_band']!, _gradeBandMeta));
    } else if (isInserting) {
      context.missing(_gradeBandMeta);
    }
    if (data.containsKey('json_payload')) {
      context.handle(
          _jsonPayloadMeta,
          jsonPayload.isAcceptableOrUnknown(
              data['json_payload']!, _jsonPayloadMeta));
    } else if (isInserting) {
      context.missing(_jsonPayloadMeta);
    }
    if (data.containsKey('media_paths_json')) {
      context.handle(
          _mediaPathsJsonMeta,
          mediaPathsJson.isAcceptableOrUnknown(
              data['media_paths_json']!, _mediaPathsJsonMeta));
    }
    if (data.containsKey('size_bytes')) {
      context.handle(_sizeBytesMeta,
          sizeBytes.isAcceptableOrUnknown(data['size_bytes']!, _sizeBytesMeta));
    } else if (isInserting) {
      context.missing(_sizeBytesMeta);
    }
    if (data.containsKey('expires_at')) {
      context.handle(_expiresAtMeta,
          expiresAt.isAcceptableOrUnknown(data['expires_at']!, _expiresAtMeta));
    } else if (isInserting) {
      context.missing(_expiresAtMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('last_accessed_at')) {
      context.handle(
          _lastAccessedAtMeta,
          lastAccessedAt.isAcceptableOrUnknown(
              data['last_accessed_at']!, _lastAccessedAtMeta));
    } else if (isInserting) {
      context.missing(_lastAccessedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {contentKey};
  @override
  OfflineContent map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineContent(
      contentKey: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}content_key'])!,
      contentType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}content_type'])!,
      subject: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}subject'])!,
      gradeBand: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}grade_band'])!,
      jsonPayload: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}json_payload'])!,
      mediaPathsJson: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}media_paths_json']),
      sizeBytes: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}size_bytes'])!,
      expiresAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}expires_at'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}created_at'])!,
      lastAccessedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}last_accessed_at'])!,
    );
  }

  @override
  $OfflineContentCacheTable createAlias(String alias) {
    return $OfflineContentCacheTable(attachedDatabase, alias);
  }
}

class OfflineContent extends DataClass implements Insertable<OfflineContent> {
  /// Content key: LO_VERSION:{id}:locale:{locale}
  final String contentKey;

  /// Type of content (stored as string).
  final String contentType;

  /// Domain/subject for filtering.
  final String subject;

  /// Target grade band for filtering.
  final String gradeBand;

  /// Full JSON payload of the content.
  final String jsonPayload;

  /// JSON array of local media file paths.
  final String? mediaPathsJson;

  /// Size in bytes for cache management.
  final int sizeBytes;

  /// Unix timestamp when cache expires.
  final int expiresAt;

  /// Unix timestamp when cached.
  final int createdAt;

  /// Unix timestamp of last access (for LRU).
  final int lastAccessedAt;
  const OfflineContent(
      {required this.contentKey,
      required this.contentType,
      required this.subject,
      required this.gradeBand,
      required this.jsonPayload,
      this.mediaPathsJson,
      required this.sizeBytes,
      required this.expiresAt,
      required this.createdAt,
      required this.lastAccessedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['content_key'] = Variable<String>(contentKey);
    map['content_type'] = Variable<String>(contentType);
    map['subject'] = Variable<String>(subject);
    map['grade_band'] = Variable<String>(gradeBand);
    map['json_payload'] = Variable<String>(jsonPayload);
    if (!nullToAbsent || mediaPathsJson != null) {
      map['media_paths_json'] = Variable<String>(mediaPathsJson);
    }
    map['size_bytes'] = Variable<int>(sizeBytes);
    map['expires_at'] = Variable<int>(expiresAt);
    map['created_at'] = Variable<int>(createdAt);
    map['last_accessed_at'] = Variable<int>(lastAccessedAt);
    return map;
  }

  OfflineContentCacheCompanion toCompanion(bool nullToAbsent) {
    return OfflineContentCacheCompanion(
      contentKey: Value(contentKey),
      contentType: Value(contentType),
      subject: Value(subject),
      gradeBand: Value(gradeBand),
      jsonPayload: Value(jsonPayload),
      mediaPathsJson: mediaPathsJson == null && nullToAbsent
          ? const Value.absent()
          : Value(mediaPathsJson),
      sizeBytes: Value(sizeBytes),
      expiresAt: Value(expiresAt),
      createdAt: Value(createdAt),
      lastAccessedAt: Value(lastAccessedAt),
    );
  }

  factory OfflineContent.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineContent(
      contentKey: serializer.fromJson<String>(json['contentKey']),
      contentType: serializer.fromJson<String>(json['contentType']),
      subject: serializer.fromJson<String>(json['subject']),
      gradeBand: serializer.fromJson<String>(json['gradeBand']),
      jsonPayload: serializer.fromJson<String>(json['jsonPayload']),
      mediaPathsJson: serializer.fromJson<String?>(json['mediaPathsJson']),
      sizeBytes: serializer.fromJson<int>(json['sizeBytes']),
      expiresAt: serializer.fromJson<int>(json['expiresAt']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      lastAccessedAt: serializer.fromJson<int>(json['lastAccessedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'contentKey': serializer.toJson<String>(contentKey),
      'contentType': serializer.toJson<String>(contentType),
      'subject': serializer.toJson<String>(subject),
      'gradeBand': serializer.toJson<String>(gradeBand),
      'jsonPayload': serializer.toJson<String>(jsonPayload),
      'mediaPathsJson': serializer.toJson<String?>(mediaPathsJson),
      'sizeBytes': serializer.toJson<int>(sizeBytes),
      'expiresAt': serializer.toJson<int>(expiresAt),
      'createdAt': serializer.toJson<int>(createdAt),
      'lastAccessedAt': serializer.toJson<int>(lastAccessedAt),
    };
  }

  OfflineContent copyWith(
          {String? contentKey,
          String? contentType,
          String? subject,
          String? gradeBand,
          String? jsonPayload,
          Value<String?> mediaPathsJson = const Value.absent(),
          int? sizeBytes,
          int? expiresAt,
          int? createdAt,
          int? lastAccessedAt}) =>
      OfflineContent(
        contentKey: contentKey ?? this.contentKey,
        contentType: contentType ?? this.contentType,
        subject: subject ?? this.subject,
        gradeBand: gradeBand ?? this.gradeBand,
        jsonPayload: jsonPayload ?? this.jsonPayload,
        mediaPathsJson:
            mediaPathsJson.present ? mediaPathsJson.value : this.mediaPathsJson,
        sizeBytes: sizeBytes ?? this.sizeBytes,
        expiresAt: expiresAt ?? this.expiresAt,
        createdAt: createdAt ?? this.createdAt,
        lastAccessedAt: lastAccessedAt ?? this.lastAccessedAt,
      );
  OfflineContent copyWithCompanion(OfflineContentCacheCompanion data) {
    return OfflineContent(
      contentKey:
          data.contentKey.present ? data.contentKey.value : this.contentKey,
      contentType:
          data.contentType.present ? data.contentType.value : this.contentType,
      subject: data.subject.present ? data.subject.value : this.subject,
      gradeBand: data.gradeBand.present ? data.gradeBand.value : this.gradeBand,
      jsonPayload:
          data.jsonPayload.present ? data.jsonPayload.value : this.jsonPayload,
      mediaPathsJson: data.mediaPathsJson.present
          ? data.mediaPathsJson.value
          : this.mediaPathsJson,
      sizeBytes: data.sizeBytes.present ? data.sizeBytes.value : this.sizeBytes,
      expiresAt: data.expiresAt.present ? data.expiresAt.value : this.expiresAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      lastAccessedAt: data.lastAccessedAt.present
          ? data.lastAccessedAt.value
          : this.lastAccessedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineContent(')
          ..write('contentKey: $contentKey, ')
          ..write('contentType: $contentType, ')
          ..write('subject: $subject, ')
          ..write('gradeBand: $gradeBand, ')
          ..write('jsonPayload: $jsonPayload, ')
          ..write('mediaPathsJson: $mediaPathsJson, ')
          ..write('sizeBytes: $sizeBytes, ')
          ..write('expiresAt: $expiresAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('lastAccessedAt: $lastAccessedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      contentKey,
      contentType,
      subject,
      gradeBand,
      jsonPayload,
      mediaPathsJson,
      sizeBytes,
      expiresAt,
      createdAt,
      lastAccessedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineContent &&
          other.contentKey == this.contentKey &&
          other.contentType == this.contentType &&
          other.subject == this.subject &&
          other.gradeBand == this.gradeBand &&
          other.jsonPayload == this.jsonPayload &&
          other.mediaPathsJson == this.mediaPathsJson &&
          other.sizeBytes == this.sizeBytes &&
          other.expiresAt == this.expiresAt &&
          other.createdAt == this.createdAt &&
          other.lastAccessedAt == this.lastAccessedAt);
}

class OfflineContentCacheCompanion extends UpdateCompanion<OfflineContent> {
  final Value<String> contentKey;
  final Value<String> contentType;
  final Value<String> subject;
  final Value<String> gradeBand;
  final Value<String> jsonPayload;
  final Value<String?> mediaPathsJson;
  final Value<int> sizeBytes;
  final Value<int> expiresAt;
  final Value<int> createdAt;
  final Value<int> lastAccessedAt;
  final Value<int> rowid;
  const OfflineContentCacheCompanion({
    this.contentKey = const Value.absent(),
    this.contentType = const Value.absent(),
    this.subject = const Value.absent(),
    this.gradeBand = const Value.absent(),
    this.jsonPayload = const Value.absent(),
    this.mediaPathsJson = const Value.absent(),
    this.sizeBytes = const Value.absent(),
    this.expiresAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.lastAccessedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineContentCacheCompanion.insert({
    required String contentKey,
    required String contentType,
    required String subject,
    required String gradeBand,
    required String jsonPayload,
    this.mediaPathsJson = const Value.absent(),
    required int sizeBytes,
    required int expiresAt,
    required int createdAt,
    required int lastAccessedAt,
    this.rowid = const Value.absent(),
  })  : contentKey = Value(contentKey),
        contentType = Value(contentType),
        subject = Value(subject),
        gradeBand = Value(gradeBand),
        jsonPayload = Value(jsonPayload),
        sizeBytes = Value(sizeBytes),
        expiresAt = Value(expiresAt),
        createdAt = Value(createdAt),
        lastAccessedAt = Value(lastAccessedAt);
  static Insertable<OfflineContent> custom({
    Expression<String>? contentKey,
    Expression<String>? contentType,
    Expression<String>? subject,
    Expression<String>? gradeBand,
    Expression<String>? jsonPayload,
    Expression<String>? mediaPathsJson,
    Expression<int>? sizeBytes,
    Expression<int>? expiresAt,
    Expression<int>? createdAt,
    Expression<int>? lastAccessedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (contentKey != null) 'content_key': contentKey,
      if (contentType != null) 'content_type': contentType,
      if (subject != null) 'subject': subject,
      if (gradeBand != null) 'grade_band': gradeBand,
      if (jsonPayload != null) 'json_payload': jsonPayload,
      if (mediaPathsJson != null) 'media_paths_json': mediaPathsJson,
      if (sizeBytes != null) 'size_bytes': sizeBytes,
      if (expiresAt != null) 'expires_at': expiresAt,
      if (createdAt != null) 'created_at': createdAt,
      if (lastAccessedAt != null) 'last_accessed_at': lastAccessedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineContentCacheCompanion copyWith(
      {Value<String>? contentKey,
      Value<String>? contentType,
      Value<String>? subject,
      Value<String>? gradeBand,
      Value<String>? jsonPayload,
      Value<String?>? mediaPathsJson,
      Value<int>? sizeBytes,
      Value<int>? expiresAt,
      Value<int>? createdAt,
      Value<int>? lastAccessedAt,
      Value<int>? rowid}) {
    return OfflineContentCacheCompanion(
      contentKey: contentKey ?? this.contentKey,
      contentType: contentType ?? this.contentType,
      subject: subject ?? this.subject,
      gradeBand: gradeBand ?? this.gradeBand,
      jsonPayload: jsonPayload ?? this.jsonPayload,
      mediaPathsJson: mediaPathsJson ?? this.mediaPathsJson,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      expiresAt: expiresAt ?? this.expiresAt,
      createdAt: createdAt ?? this.createdAt,
      lastAccessedAt: lastAccessedAt ?? this.lastAccessedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (contentKey.present) {
      map['content_key'] = Variable<String>(contentKey.value);
    }
    if (contentType.present) {
      map['content_type'] = Variable<String>(contentType.value);
    }
    if (subject.present) {
      map['subject'] = Variable<String>(subject.value);
    }
    if (gradeBand.present) {
      map['grade_band'] = Variable<String>(gradeBand.value);
    }
    if (jsonPayload.present) {
      map['json_payload'] = Variable<String>(jsonPayload.value);
    }
    if (mediaPathsJson.present) {
      map['media_paths_json'] = Variable<String>(mediaPathsJson.value);
    }
    if (sizeBytes.present) {
      map['size_bytes'] = Variable<int>(sizeBytes.value);
    }
    if (expiresAt.present) {
      map['expires_at'] = Variable<int>(expiresAt.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (lastAccessedAt.present) {
      map['last_accessed_at'] = Variable<int>(lastAccessedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineContentCacheCompanion(')
          ..write('contentKey: $contentKey, ')
          ..write('contentType: $contentType, ')
          ..write('subject: $subject, ')
          ..write('gradeBand: $gradeBand, ')
          ..write('jsonPayload: $jsonPayload, ')
          ..write('mediaPathsJson: $mediaPathsJson, ')
          ..write('sizeBytes: $sizeBytes, ')
          ..write('expiresAt: $expiresAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('lastAccessedAt: $lastAccessedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflineSyncQueueTable extends OfflineSyncQueue
    with TableInfo<$OfflineSyncQueueTable, OfflineSyncQueueEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineSyncQueueTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _operationTypeMeta =
      const VerificationMeta('operationType');
  @override
  late final GeneratedColumn<String> operationType = GeneratedColumn<String>(
      'operation_type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _payloadJsonMeta =
      const VerificationMeta('payloadJson');
  @override
  late final GeneratedColumn<String> payloadJson = GeneratedColumn<String>(
      'payload_json', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _priorityMeta =
      const VerificationMeta('priority');
  @override
  late final GeneratedColumn<int> priority = GeneratedColumn<int>(
      'priority', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(5));
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
      'created_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _lastAttemptAtMeta =
      const VerificationMeta('lastAttemptAt');
  @override
  late final GeneratedColumn<int> lastAttemptAt = GeneratedColumn<int>(
      'last_attempt_at', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _retryCountMeta =
      const VerificationMeta('retryCount');
  @override
  late final GeneratedColumn<int> retryCount = GeneratedColumn<int>(
      'retry_count', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _errorMessageMeta =
      const VerificationMeta('errorMessage');
  @override
  late final GeneratedColumn<String> errorMessage = GeneratedColumn<String>(
      'error_message', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        operationType,
        payloadJson,
        priority,
        status,
        createdAt,
        lastAttemptAt,
        retryCount,
        errorMessage
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_sync_queue';
  @override
  VerificationContext validateIntegrity(
      Insertable<OfflineSyncQueueEntry> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('operation_type')) {
      context.handle(
          _operationTypeMeta,
          operationType.isAcceptableOrUnknown(
              data['operation_type']!, _operationTypeMeta));
    } else if (isInserting) {
      context.missing(_operationTypeMeta);
    }
    if (data.containsKey('payload_json')) {
      context.handle(
          _payloadJsonMeta,
          payloadJson.isAcceptableOrUnknown(
              data['payload_json']!, _payloadJsonMeta));
    } else if (isInserting) {
      context.missing(_payloadJsonMeta);
    }
    if (data.containsKey('priority')) {
      context.handle(_priorityMeta,
          priority.isAcceptableOrUnknown(data['priority']!, _priorityMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('last_attempt_at')) {
      context.handle(
          _lastAttemptAtMeta,
          lastAttemptAt.isAcceptableOrUnknown(
              data['last_attempt_at']!, _lastAttemptAtMeta));
    }
    if (data.containsKey('retry_count')) {
      context.handle(
          _retryCountMeta,
          retryCount.isAcceptableOrUnknown(
              data['retry_count']!, _retryCountMeta));
    }
    if (data.containsKey('error_message')) {
      context.handle(
          _errorMessageMeta,
          errorMessage.isAcceptableOrUnknown(
              data['error_message']!, _errorMessageMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  OfflineSyncQueueEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineSyncQueueEntry(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      operationType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}operation_type'])!,
      payloadJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}payload_json'])!,
      priority: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}priority'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}created_at'])!,
      lastAttemptAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}last_attempt_at']),
      retryCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}retry_count'])!,
      errorMessage: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}error_message']),
    );
  }

  @override
  $OfflineSyncQueueTable createAlias(String alias) {
    return $OfflineSyncQueueTable(attachedDatabase, alias);
  }
}

class OfflineSyncQueueEntry extends DataClass
    implements Insertable<OfflineSyncQueueEntry> {
  /// Auto-incrementing queue entry ID.
  final int id;

  /// Type of operation (stored as string).
  final String operationType;

  /// JSON payload for the operation.
  final String payloadJson;

  /// Priority: 1 = highest, 10 = lowest.
  final int priority;

  /// Status: PENDING, IN_PROGRESS, DONE, FAILED.
  final String status;

  /// Unix timestamp when entry was created.
  final int createdAt;

  /// Unix timestamp of last sync attempt.
  final int? lastAttemptAt;

  /// Number of retry attempts.
  final int retryCount;

  /// Error message if sync failed.
  final String? errorMessage;
  const OfflineSyncQueueEntry(
      {required this.id,
      required this.operationType,
      required this.payloadJson,
      required this.priority,
      required this.status,
      required this.createdAt,
      this.lastAttemptAt,
      required this.retryCount,
      this.errorMessage});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['operation_type'] = Variable<String>(operationType);
    map['payload_json'] = Variable<String>(payloadJson);
    map['priority'] = Variable<int>(priority);
    map['status'] = Variable<String>(status);
    map['created_at'] = Variable<int>(createdAt);
    if (!nullToAbsent || lastAttemptAt != null) {
      map['last_attempt_at'] = Variable<int>(lastAttemptAt);
    }
    map['retry_count'] = Variable<int>(retryCount);
    if (!nullToAbsent || errorMessage != null) {
      map['error_message'] = Variable<String>(errorMessage);
    }
    return map;
  }

  OfflineSyncQueueCompanion toCompanion(bool nullToAbsent) {
    return OfflineSyncQueueCompanion(
      id: Value(id),
      operationType: Value(operationType),
      payloadJson: Value(payloadJson),
      priority: Value(priority),
      status: Value(status),
      createdAt: Value(createdAt),
      lastAttemptAt: lastAttemptAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastAttemptAt),
      retryCount: Value(retryCount),
      errorMessage: errorMessage == null && nullToAbsent
          ? const Value.absent()
          : Value(errorMessage),
    );
  }

  factory OfflineSyncQueueEntry.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineSyncQueueEntry(
      id: serializer.fromJson<int>(json['id']),
      operationType: serializer.fromJson<String>(json['operationType']),
      payloadJson: serializer.fromJson<String>(json['payloadJson']),
      priority: serializer.fromJson<int>(json['priority']),
      status: serializer.fromJson<String>(json['status']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      lastAttemptAt: serializer.fromJson<int?>(json['lastAttemptAt']),
      retryCount: serializer.fromJson<int>(json['retryCount']),
      errorMessage: serializer.fromJson<String?>(json['errorMessage']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'operationType': serializer.toJson<String>(operationType),
      'payloadJson': serializer.toJson<String>(payloadJson),
      'priority': serializer.toJson<int>(priority),
      'status': serializer.toJson<String>(status),
      'createdAt': serializer.toJson<int>(createdAt),
      'lastAttemptAt': serializer.toJson<int?>(lastAttemptAt),
      'retryCount': serializer.toJson<int>(retryCount),
      'errorMessage': serializer.toJson<String?>(errorMessage),
    };
  }

  OfflineSyncQueueEntry copyWith(
          {int? id,
          String? operationType,
          String? payloadJson,
          int? priority,
          String? status,
          int? createdAt,
          Value<int?> lastAttemptAt = const Value.absent(),
          int? retryCount,
          Value<String?> errorMessage = const Value.absent()}) =>
      OfflineSyncQueueEntry(
        id: id ?? this.id,
        operationType: operationType ?? this.operationType,
        payloadJson: payloadJson ?? this.payloadJson,
        priority: priority ?? this.priority,
        status: status ?? this.status,
        createdAt: createdAt ?? this.createdAt,
        lastAttemptAt:
            lastAttemptAt.present ? lastAttemptAt.value : this.lastAttemptAt,
        retryCount: retryCount ?? this.retryCount,
        errorMessage:
            errorMessage.present ? errorMessage.value : this.errorMessage,
      );
  OfflineSyncQueueEntry copyWithCompanion(OfflineSyncQueueCompanion data) {
    return OfflineSyncQueueEntry(
      id: data.id.present ? data.id.value : this.id,
      operationType: data.operationType.present
          ? data.operationType.value
          : this.operationType,
      payloadJson:
          data.payloadJson.present ? data.payloadJson.value : this.payloadJson,
      priority: data.priority.present ? data.priority.value : this.priority,
      status: data.status.present ? data.status.value : this.status,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      lastAttemptAt: data.lastAttemptAt.present
          ? data.lastAttemptAt.value
          : this.lastAttemptAt,
      retryCount:
          data.retryCount.present ? data.retryCount.value : this.retryCount,
      errorMessage: data.errorMessage.present
          ? data.errorMessage.value
          : this.errorMessage,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineSyncQueueEntry(')
          ..write('id: $id, ')
          ..write('operationType: $operationType, ')
          ..write('payloadJson: $payloadJson, ')
          ..write('priority: $priority, ')
          ..write('status: $status, ')
          ..write('createdAt: $createdAt, ')
          ..write('lastAttemptAt: $lastAttemptAt, ')
          ..write('retryCount: $retryCount, ')
          ..write('errorMessage: $errorMessage')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, operationType, payloadJson, priority,
      status, createdAt, lastAttemptAt, retryCount, errorMessage);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineSyncQueueEntry &&
          other.id == this.id &&
          other.operationType == this.operationType &&
          other.payloadJson == this.payloadJson &&
          other.priority == this.priority &&
          other.status == this.status &&
          other.createdAt == this.createdAt &&
          other.lastAttemptAt == this.lastAttemptAt &&
          other.retryCount == this.retryCount &&
          other.errorMessage == this.errorMessage);
}

class OfflineSyncQueueCompanion extends UpdateCompanion<OfflineSyncQueueEntry> {
  final Value<int> id;
  final Value<String> operationType;
  final Value<String> payloadJson;
  final Value<int> priority;
  final Value<String> status;
  final Value<int> createdAt;
  final Value<int?> lastAttemptAt;
  final Value<int> retryCount;
  final Value<String?> errorMessage;
  const OfflineSyncQueueCompanion({
    this.id = const Value.absent(),
    this.operationType = const Value.absent(),
    this.payloadJson = const Value.absent(),
    this.priority = const Value.absent(),
    this.status = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.lastAttemptAt = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.errorMessage = const Value.absent(),
  });
  OfflineSyncQueueCompanion.insert({
    this.id = const Value.absent(),
    required String operationType,
    required String payloadJson,
    this.priority = const Value.absent(),
    this.status = const Value.absent(),
    required int createdAt,
    this.lastAttemptAt = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.errorMessage = const Value.absent(),
  })  : operationType = Value(operationType),
        payloadJson = Value(payloadJson),
        createdAt = Value(createdAt);
  static Insertable<OfflineSyncQueueEntry> custom({
    Expression<int>? id,
    Expression<String>? operationType,
    Expression<String>? payloadJson,
    Expression<int>? priority,
    Expression<String>? status,
    Expression<int>? createdAt,
    Expression<int>? lastAttemptAt,
    Expression<int>? retryCount,
    Expression<String>? errorMessage,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (operationType != null) 'operation_type': operationType,
      if (payloadJson != null) 'payload_json': payloadJson,
      if (priority != null) 'priority': priority,
      if (status != null) 'status': status,
      if (createdAt != null) 'created_at': createdAt,
      if (lastAttemptAt != null) 'last_attempt_at': lastAttemptAt,
      if (retryCount != null) 'retry_count': retryCount,
      if (errorMessage != null) 'error_message': errorMessage,
    });
  }

  OfflineSyncQueueCompanion copyWith(
      {Value<int>? id,
      Value<String>? operationType,
      Value<String>? payloadJson,
      Value<int>? priority,
      Value<String>? status,
      Value<int>? createdAt,
      Value<int?>? lastAttemptAt,
      Value<int>? retryCount,
      Value<String?>? errorMessage}) {
    return OfflineSyncQueueCompanion(
      id: id ?? this.id,
      operationType: operationType ?? this.operationType,
      payloadJson: payloadJson ?? this.payloadJson,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      retryCount: retryCount ?? this.retryCount,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (operationType.present) {
      map['operation_type'] = Variable<String>(operationType.value);
    }
    if (payloadJson.present) {
      map['payload_json'] = Variable<String>(payloadJson.value);
    }
    if (priority.present) {
      map['priority'] = Variable<int>(priority.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (lastAttemptAt.present) {
      map['last_attempt_at'] = Variable<int>(lastAttemptAt.value);
    }
    if (retryCount.present) {
      map['retry_count'] = Variable<int>(retryCount.value);
    }
    if (errorMessage.present) {
      map['error_message'] = Variable<String>(errorMessage.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineSyncQueueCompanion(')
          ..write('id: $id, ')
          ..write('operationType: $operationType, ')
          ..write('payloadJson: $payloadJson, ')
          ..write('priority: $priority, ')
          ..write('status: $status, ')
          ..write('createdAt: $createdAt, ')
          ..write('lastAttemptAt: $lastAttemptAt, ')
          ..write('retryCount: $retryCount, ')
          ..write('errorMessage: $errorMessage')
          ..write(')'))
        .toString();
  }
}

class $OfflineAttendanceRecordsTable extends OfflineAttendanceRecords
    with TableInfo<$OfflineAttendanceRecordsTable, OfflineAttendance> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineAttendanceRecordsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _learnerIdMeta =
      const VerificationMeta('learnerId');
  @override
  late final GeneratedColumn<String> learnerId = GeneratedColumn<String>(
      'learner_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _classIdMeta =
      const VerificationMeta('classId');
  @override
  late final GeneratedColumn<String> classId = GeneratedColumn<String>(
      'class_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _dateMeta = const VerificationMeta('date');
  @override
  late final GeneratedColumn<String> date = GeneratedColumn<String>(
      'date', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _attendanceStatusMeta =
      const VerificationMeta('attendanceStatus');
  @override
  late final GeneratedColumn<String> attendanceStatus = GeneratedColumn<String>(
      'attendance_status', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _noteMeta = const VerificationMeta('note');
  @override
  late final GeneratedColumn<String> note = GeneratedColumn<String>(
      'note', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pendingSync'));
  static const VerificationMeta _recordedAtMeta =
      const VerificationMeta('recordedAt');
  @override
  late final GeneratedColumn<int> recordedAt = GeneratedColumn<int>(
      'recorded_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _recordedByMeta =
      const VerificationMeta('recordedBy');
  @override
  late final GeneratedColumn<String> recordedBy = GeneratedColumn<String>(
      'recorded_by', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        learnerId,
        classId,
        date,
        attendanceStatus,
        note,
        syncStatus,
        recordedAt,
        recordedBy
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_attendance_records';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineAttendance> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('learner_id')) {
      context.handle(_learnerIdMeta,
          learnerId.isAcceptableOrUnknown(data['learner_id']!, _learnerIdMeta));
    } else if (isInserting) {
      context.missing(_learnerIdMeta);
    }
    if (data.containsKey('class_id')) {
      context.handle(_classIdMeta,
          classId.isAcceptableOrUnknown(data['class_id']!, _classIdMeta));
    } else if (isInserting) {
      context.missing(_classIdMeta);
    }
    if (data.containsKey('date')) {
      context.handle(
          _dateMeta, date.isAcceptableOrUnknown(data['date']!, _dateMeta));
    } else if (isInserting) {
      context.missing(_dateMeta);
    }
    if (data.containsKey('attendance_status')) {
      context.handle(
          _attendanceStatusMeta,
          attendanceStatus.isAcceptableOrUnknown(
              data['attendance_status']!, _attendanceStatusMeta));
    } else if (isInserting) {
      context.missing(_attendanceStatusMeta);
    }
    if (data.containsKey('note')) {
      context.handle(
          _noteMeta, note.isAcceptableOrUnknown(data['note']!, _noteMeta));
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('recorded_at')) {
      context.handle(
          _recordedAtMeta,
          recordedAt.isAcceptableOrUnknown(
              data['recorded_at']!, _recordedAtMeta));
    } else if (isInserting) {
      context.missing(_recordedAtMeta);
    }
    if (data.containsKey('recorded_by')) {
      context.handle(
          _recordedByMeta,
          recordedBy.isAcceptableOrUnknown(
              data['recorded_by']!, _recordedByMeta));
    } else if (isInserting) {
      context.missing(_recordedByMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  OfflineAttendance map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineAttendance(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      learnerId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}learner_id'])!,
      classId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}class_id'])!,
      date: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}date'])!,
      attendanceStatus: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}attendance_status'])!,
      note: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}note']),
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_status'])!,
      recordedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}recorded_at'])!,
      recordedBy: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}recorded_by'])!,
    );
  }

  @override
  $OfflineAttendanceRecordsTable createAlias(String alias) {
    return $OfflineAttendanceRecordsTable(attachedDatabase, alias);
  }
}

class OfflineAttendance extends DataClass
    implements Insertable<OfflineAttendance> {
  /// Auto-incrementing local ID.
  final int id;

  /// Learner being marked.
  final String learnerId;

  /// Class/section ID.
  final String classId;

  /// Date (YYYY-MM-DD format).
  final String date;

  /// Status: PRESENT, ABSENT, TARDY.
  final String attendanceStatus;

  /// Optional note.
  final String? note;

  /// Sync status.
  final String syncStatus;

  /// Unix timestamp when recorded.
  final int recordedAt;

  /// Teacher ID who recorded.
  final String recordedBy;
  const OfflineAttendance(
      {required this.id,
      required this.learnerId,
      required this.classId,
      required this.date,
      required this.attendanceStatus,
      this.note,
      required this.syncStatus,
      required this.recordedAt,
      required this.recordedBy});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['learner_id'] = Variable<String>(learnerId);
    map['class_id'] = Variable<String>(classId);
    map['date'] = Variable<String>(date);
    map['attendance_status'] = Variable<String>(attendanceStatus);
    if (!nullToAbsent || note != null) {
      map['note'] = Variable<String>(note);
    }
    map['sync_status'] = Variable<String>(syncStatus);
    map['recorded_at'] = Variable<int>(recordedAt);
    map['recorded_by'] = Variable<String>(recordedBy);
    return map;
  }

  OfflineAttendanceRecordsCompanion toCompanion(bool nullToAbsent) {
    return OfflineAttendanceRecordsCompanion(
      id: Value(id),
      learnerId: Value(learnerId),
      classId: Value(classId),
      date: Value(date),
      attendanceStatus: Value(attendanceStatus),
      note: note == null && nullToAbsent ? const Value.absent() : Value(note),
      syncStatus: Value(syncStatus),
      recordedAt: Value(recordedAt),
      recordedBy: Value(recordedBy),
    );
  }

  factory OfflineAttendance.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineAttendance(
      id: serializer.fromJson<int>(json['id']),
      learnerId: serializer.fromJson<String>(json['learnerId']),
      classId: serializer.fromJson<String>(json['classId']),
      date: serializer.fromJson<String>(json['date']),
      attendanceStatus: serializer.fromJson<String>(json['attendanceStatus']),
      note: serializer.fromJson<String?>(json['note']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      recordedAt: serializer.fromJson<int>(json['recordedAt']),
      recordedBy: serializer.fromJson<String>(json['recordedBy']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'learnerId': serializer.toJson<String>(learnerId),
      'classId': serializer.toJson<String>(classId),
      'date': serializer.toJson<String>(date),
      'attendanceStatus': serializer.toJson<String>(attendanceStatus),
      'note': serializer.toJson<String?>(note),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'recordedAt': serializer.toJson<int>(recordedAt),
      'recordedBy': serializer.toJson<String>(recordedBy),
    };
  }

  OfflineAttendance copyWith(
          {int? id,
          String? learnerId,
          String? classId,
          String? date,
          String? attendanceStatus,
          Value<String?> note = const Value.absent(),
          String? syncStatus,
          int? recordedAt,
          String? recordedBy}) =>
      OfflineAttendance(
        id: id ?? this.id,
        learnerId: learnerId ?? this.learnerId,
        classId: classId ?? this.classId,
        date: date ?? this.date,
        attendanceStatus: attendanceStatus ?? this.attendanceStatus,
        note: note.present ? note.value : this.note,
        syncStatus: syncStatus ?? this.syncStatus,
        recordedAt: recordedAt ?? this.recordedAt,
        recordedBy: recordedBy ?? this.recordedBy,
      );
  OfflineAttendance copyWithCompanion(OfflineAttendanceRecordsCompanion data) {
    return OfflineAttendance(
      id: data.id.present ? data.id.value : this.id,
      learnerId: data.learnerId.present ? data.learnerId.value : this.learnerId,
      classId: data.classId.present ? data.classId.value : this.classId,
      date: data.date.present ? data.date.value : this.date,
      attendanceStatus: data.attendanceStatus.present
          ? data.attendanceStatus.value
          : this.attendanceStatus,
      note: data.note.present ? data.note.value : this.note,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      recordedAt:
          data.recordedAt.present ? data.recordedAt.value : this.recordedAt,
      recordedBy:
          data.recordedBy.present ? data.recordedBy.value : this.recordedBy,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineAttendance(')
          ..write('id: $id, ')
          ..write('learnerId: $learnerId, ')
          ..write('classId: $classId, ')
          ..write('date: $date, ')
          ..write('attendanceStatus: $attendanceStatus, ')
          ..write('note: $note, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('recordedAt: $recordedAt, ')
          ..write('recordedBy: $recordedBy')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, learnerId, classId, date,
      attendanceStatus, note, syncStatus, recordedAt, recordedBy);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineAttendance &&
          other.id == this.id &&
          other.learnerId == this.learnerId &&
          other.classId == this.classId &&
          other.date == this.date &&
          other.attendanceStatus == this.attendanceStatus &&
          other.note == this.note &&
          other.syncStatus == this.syncStatus &&
          other.recordedAt == this.recordedAt &&
          other.recordedBy == this.recordedBy);
}

class OfflineAttendanceRecordsCompanion
    extends UpdateCompanion<OfflineAttendance> {
  final Value<int> id;
  final Value<String> learnerId;
  final Value<String> classId;
  final Value<String> date;
  final Value<String> attendanceStatus;
  final Value<String?> note;
  final Value<String> syncStatus;
  final Value<int> recordedAt;
  final Value<String> recordedBy;
  const OfflineAttendanceRecordsCompanion({
    this.id = const Value.absent(),
    this.learnerId = const Value.absent(),
    this.classId = const Value.absent(),
    this.date = const Value.absent(),
    this.attendanceStatus = const Value.absent(),
    this.note = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.recordedAt = const Value.absent(),
    this.recordedBy = const Value.absent(),
  });
  OfflineAttendanceRecordsCompanion.insert({
    this.id = const Value.absent(),
    required String learnerId,
    required String classId,
    required String date,
    required String attendanceStatus,
    this.note = const Value.absent(),
    this.syncStatus = const Value.absent(),
    required int recordedAt,
    required String recordedBy,
  })  : learnerId = Value(learnerId),
        classId = Value(classId),
        date = Value(date),
        attendanceStatus = Value(attendanceStatus),
        recordedAt = Value(recordedAt),
        recordedBy = Value(recordedBy);
  static Insertable<OfflineAttendance> custom({
    Expression<int>? id,
    Expression<String>? learnerId,
    Expression<String>? classId,
    Expression<String>? date,
    Expression<String>? attendanceStatus,
    Expression<String>? note,
    Expression<String>? syncStatus,
    Expression<int>? recordedAt,
    Expression<String>? recordedBy,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (learnerId != null) 'learner_id': learnerId,
      if (classId != null) 'class_id': classId,
      if (date != null) 'date': date,
      if (attendanceStatus != null) 'attendance_status': attendanceStatus,
      if (note != null) 'note': note,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (recordedAt != null) 'recorded_at': recordedAt,
      if (recordedBy != null) 'recorded_by': recordedBy,
    });
  }

  OfflineAttendanceRecordsCompanion copyWith(
      {Value<int>? id,
      Value<String>? learnerId,
      Value<String>? classId,
      Value<String>? date,
      Value<String>? attendanceStatus,
      Value<String?>? note,
      Value<String>? syncStatus,
      Value<int>? recordedAt,
      Value<String>? recordedBy}) {
    return OfflineAttendanceRecordsCompanion(
      id: id ?? this.id,
      learnerId: learnerId ?? this.learnerId,
      classId: classId ?? this.classId,
      date: date ?? this.date,
      attendanceStatus: attendanceStatus ?? this.attendanceStatus,
      note: note ?? this.note,
      syncStatus: syncStatus ?? this.syncStatus,
      recordedAt: recordedAt ?? this.recordedAt,
      recordedBy: recordedBy ?? this.recordedBy,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (learnerId.present) {
      map['learner_id'] = Variable<String>(learnerId.value);
    }
    if (classId.present) {
      map['class_id'] = Variable<String>(classId.value);
    }
    if (date.present) {
      map['date'] = Variable<String>(date.value);
    }
    if (attendanceStatus.present) {
      map['attendance_status'] = Variable<String>(attendanceStatus.value);
    }
    if (note.present) {
      map['note'] = Variable<String>(note.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (recordedAt.present) {
      map['recorded_at'] = Variable<int>(recordedAt.value);
    }
    if (recordedBy.present) {
      map['recorded_by'] = Variable<String>(recordedBy.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineAttendanceRecordsCompanion(')
          ..write('id: $id, ')
          ..write('learnerId: $learnerId, ')
          ..write('classId: $classId, ')
          ..write('date: $date, ')
          ..write('attendanceStatus: $attendanceStatus, ')
          ..write('note: $note, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('recordedAt: $recordedAt, ')
          ..write('recordedBy: $recordedBy')
          ..write(')'))
        .toString();
  }
}

class $OfflineTeacherNotesTable extends OfflineTeacherNotes
    with TableInfo<$OfflineTeacherNotesTable, OfflineTeacherNote> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineTeacherNotesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _localNoteIdMeta =
      const VerificationMeta('localNoteId');
  @override
  late final GeneratedColumn<String> localNoteId = GeneratedColumn<String>(
      'local_note_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _serverNoteIdMeta =
      const VerificationMeta('serverNoteId');
  @override
  late final GeneratedColumn<String> serverNoteId = GeneratedColumn<String>(
      'server_note_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _learnerIdMeta =
      const VerificationMeta('learnerId');
  @override
  late final GeneratedColumn<String> learnerId = GeneratedColumn<String>(
      'learner_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _contentMeta =
      const VerificationMeta('content');
  @override
  late final GeneratedColumn<String> content = GeneratedColumn<String>(
      'content', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _categoryMeta =
      const VerificationMeta('category');
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
      'category', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pendingSync'));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
      'created_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _createdByMeta =
      const VerificationMeta('createdBy');
  @override
  late final GeneratedColumn<String> createdBy = GeneratedColumn<String>(
      'created_by', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        localNoteId,
        serverNoteId,
        learnerId,
        content,
        category,
        syncStatus,
        createdAt,
        createdBy
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_teacher_notes';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineTeacherNote> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('local_note_id')) {
      context.handle(
          _localNoteIdMeta,
          localNoteId.isAcceptableOrUnknown(
              data['local_note_id']!, _localNoteIdMeta));
    } else if (isInserting) {
      context.missing(_localNoteIdMeta);
    }
    if (data.containsKey('server_note_id')) {
      context.handle(
          _serverNoteIdMeta,
          serverNoteId.isAcceptableOrUnknown(
              data['server_note_id']!, _serverNoteIdMeta));
    }
    if (data.containsKey('learner_id')) {
      context.handle(_learnerIdMeta,
          learnerId.isAcceptableOrUnknown(data['learner_id']!, _learnerIdMeta));
    } else if (isInserting) {
      context.missing(_learnerIdMeta);
    }
    if (data.containsKey('content')) {
      context.handle(_contentMeta,
          content.isAcceptableOrUnknown(data['content']!, _contentMeta));
    } else if (isInserting) {
      context.missing(_contentMeta);
    }
    if (data.containsKey('category')) {
      context.handle(_categoryMeta,
          category.isAcceptableOrUnknown(data['category']!, _categoryMeta));
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('created_by')) {
      context.handle(_createdByMeta,
          createdBy.isAcceptableOrUnknown(data['created_by']!, _createdByMeta));
    } else if (isInserting) {
      context.missing(_createdByMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {localNoteId};
  @override
  OfflineTeacherNote map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineTeacherNote(
      localNoteId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}local_note_id'])!,
      serverNoteId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}server_note_id']),
      learnerId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}learner_id'])!,
      content: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}content'])!,
      category: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}category']),
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_status'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}created_at'])!,
      createdBy: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}created_by'])!,
    );
  }

  @override
  $OfflineTeacherNotesTable createAlias(String alias) {
    return $OfflineTeacherNotesTable(attachedDatabase, alias);
  }
}

class OfflineTeacherNote extends DataClass
    implements Insertable<OfflineTeacherNote> {
  /// UUID generated locally.
  final String localNoteId;

  /// Server ID after sync.
  final String? serverNoteId;

  /// Learner the note is about.
  final String learnerId;

  /// Note content.
  final String content;

  /// Note category/tag.
  final String? category;

  /// Sync status.
  final String syncStatus;

  /// Unix timestamp when created.
  final int createdAt;

  /// Teacher ID who created.
  final String createdBy;
  const OfflineTeacherNote(
      {required this.localNoteId,
      this.serverNoteId,
      required this.learnerId,
      required this.content,
      this.category,
      required this.syncStatus,
      required this.createdAt,
      required this.createdBy});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['local_note_id'] = Variable<String>(localNoteId);
    if (!nullToAbsent || serverNoteId != null) {
      map['server_note_id'] = Variable<String>(serverNoteId);
    }
    map['learner_id'] = Variable<String>(learnerId);
    map['content'] = Variable<String>(content);
    if (!nullToAbsent || category != null) {
      map['category'] = Variable<String>(category);
    }
    map['sync_status'] = Variable<String>(syncStatus);
    map['created_at'] = Variable<int>(createdAt);
    map['created_by'] = Variable<String>(createdBy);
    return map;
  }

  OfflineTeacherNotesCompanion toCompanion(bool nullToAbsent) {
    return OfflineTeacherNotesCompanion(
      localNoteId: Value(localNoteId),
      serverNoteId: serverNoteId == null && nullToAbsent
          ? const Value.absent()
          : Value(serverNoteId),
      learnerId: Value(learnerId),
      content: Value(content),
      category: category == null && nullToAbsent
          ? const Value.absent()
          : Value(category),
      syncStatus: Value(syncStatus),
      createdAt: Value(createdAt),
      createdBy: Value(createdBy),
    );
  }

  factory OfflineTeacherNote.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineTeacherNote(
      localNoteId: serializer.fromJson<String>(json['localNoteId']),
      serverNoteId: serializer.fromJson<String?>(json['serverNoteId']),
      learnerId: serializer.fromJson<String>(json['learnerId']),
      content: serializer.fromJson<String>(json['content']),
      category: serializer.fromJson<String?>(json['category']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
      createdBy: serializer.fromJson<String>(json['createdBy']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'localNoteId': serializer.toJson<String>(localNoteId),
      'serverNoteId': serializer.toJson<String?>(serverNoteId),
      'learnerId': serializer.toJson<String>(learnerId),
      'content': serializer.toJson<String>(content),
      'category': serializer.toJson<String?>(category),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'createdAt': serializer.toJson<int>(createdAt),
      'createdBy': serializer.toJson<String>(createdBy),
    };
  }

  OfflineTeacherNote copyWith(
          {String? localNoteId,
          Value<String?> serverNoteId = const Value.absent(),
          String? learnerId,
          String? content,
          Value<String?> category = const Value.absent(),
          String? syncStatus,
          int? createdAt,
          String? createdBy}) =>
      OfflineTeacherNote(
        localNoteId: localNoteId ?? this.localNoteId,
        serverNoteId:
            serverNoteId.present ? serverNoteId.value : this.serverNoteId,
        learnerId: learnerId ?? this.learnerId,
        content: content ?? this.content,
        category: category.present ? category.value : this.category,
        syncStatus: syncStatus ?? this.syncStatus,
        createdAt: createdAt ?? this.createdAt,
        createdBy: createdBy ?? this.createdBy,
      );
  OfflineTeacherNote copyWithCompanion(OfflineTeacherNotesCompanion data) {
    return OfflineTeacherNote(
      localNoteId:
          data.localNoteId.present ? data.localNoteId.value : this.localNoteId,
      serverNoteId: data.serverNoteId.present
          ? data.serverNoteId.value
          : this.serverNoteId,
      learnerId: data.learnerId.present ? data.learnerId.value : this.learnerId,
      content: data.content.present ? data.content.value : this.content,
      category: data.category.present ? data.category.value : this.category,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      createdBy: data.createdBy.present ? data.createdBy.value : this.createdBy,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineTeacherNote(')
          ..write('localNoteId: $localNoteId, ')
          ..write('serverNoteId: $serverNoteId, ')
          ..write('learnerId: $learnerId, ')
          ..write('content: $content, ')
          ..write('category: $category, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('createdAt: $createdAt, ')
          ..write('createdBy: $createdBy')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(localNoteId, serverNoteId, learnerId, content,
      category, syncStatus, createdAt, createdBy);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineTeacherNote &&
          other.localNoteId == this.localNoteId &&
          other.serverNoteId == this.serverNoteId &&
          other.learnerId == this.learnerId &&
          other.content == this.content &&
          other.category == this.category &&
          other.syncStatus == this.syncStatus &&
          other.createdAt == this.createdAt &&
          other.createdBy == this.createdBy);
}

class OfflineTeacherNotesCompanion extends UpdateCompanion<OfflineTeacherNote> {
  final Value<String> localNoteId;
  final Value<String?> serverNoteId;
  final Value<String> learnerId;
  final Value<String> content;
  final Value<String?> category;
  final Value<String> syncStatus;
  final Value<int> createdAt;
  final Value<String> createdBy;
  final Value<int> rowid;
  const OfflineTeacherNotesCompanion({
    this.localNoteId = const Value.absent(),
    this.serverNoteId = const Value.absent(),
    this.learnerId = const Value.absent(),
    this.content = const Value.absent(),
    this.category = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.createdBy = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineTeacherNotesCompanion.insert({
    required String localNoteId,
    this.serverNoteId = const Value.absent(),
    required String learnerId,
    required String content,
    this.category = const Value.absent(),
    this.syncStatus = const Value.absent(),
    required int createdAt,
    required String createdBy,
    this.rowid = const Value.absent(),
  })  : localNoteId = Value(localNoteId),
        learnerId = Value(learnerId),
        content = Value(content),
        createdAt = Value(createdAt),
        createdBy = Value(createdBy);
  static Insertable<OfflineTeacherNote> custom({
    Expression<String>? localNoteId,
    Expression<String>? serverNoteId,
    Expression<String>? learnerId,
    Expression<String>? content,
    Expression<String>? category,
    Expression<String>? syncStatus,
    Expression<int>? createdAt,
    Expression<String>? createdBy,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (localNoteId != null) 'local_note_id': localNoteId,
      if (serverNoteId != null) 'server_note_id': serverNoteId,
      if (learnerId != null) 'learner_id': learnerId,
      if (content != null) 'content': content,
      if (category != null) 'category': category,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (createdAt != null) 'created_at': createdAt,
      if (createdBy != null) 'created_by': createdBy,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineTeacherNotesCompanion copyWith(
      {Value<String>? localNoteId,
      Value<String?>? serverNoteId,
      Value<String>? learnerId,
      Value<String>? content,
      Value<String?>? category,
      Value<String>? syncStatus,
      Value<int>? createdAt,
      Value<String>? createdBy,
      Value<int>? rowid}) {
    return OfflineTeacherNotesCompanion(
      localNoteId: localNoteId ?? this.localNoteId,
      serverNoteId: serverNoteId ?? this.serverNoteId,
      learnerId: learnerId ?? this.learnerId,
      content: content ?? this.content,
      category: category ?? this.category,
      syncStatus: syncStatus ?? this.syncStatus,
      createdAt: createdAt ?? this.createdAt,
      createdBy: createdBy ?? this.createdBy,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (localNoteId.present) {
      map['local_note_id'] = Variable<String>(localNoteId.value);
    }
    if (serverNoteId.present) {
      map['server_note_id'] = Variable<String>(serverNoteId.value);
    }
    if (learnerId.present) {
      map['learner_id'] = Variable<String>(learnerId.value);
    }
    if (content.present) {
      map['content'] = Variable<String>(content.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    if (createdBy.present) {
      map['created_by'] = Variable<String>(createdBy.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineTeacherNotesCompanion(')
          ..write('localNoteId: $localNoteId, ')
          ..write('serverNoteId: $serverNoteId, ')
          ..write('learnerId: $learnerId, ')
          ..write('content: $content, ')
          ..write('category: $category, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('createdAt: $createdAt, ')
          ..write('createdBy: $createdBy, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflineParentCacheTable extends OfflineParentCache
    with TableInfo<$OfflineParentCacheTable, OfflineParentCacheEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineParentCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _cacheKeyMeta =
      const VerificationMeta('cacheKey');
  @override
  late final GeneratedColumn<String> cacheKey = GeneratedColumn<String>(
      'cache_key', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _learnerIdMeta =
      const VerificationMeta('learnerId');
  @override
  late final GeneratedColumn<String> learnerId = GeneratedColumn<String>(
      'learner_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _dataTypeMeta =
      const VerificationMeta('dataType');
  @override
  late final GeneratedColumn<String> dataType = GeneratedColumn<String>(
      'data_type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _jsonPayloadMeta =
      const VerificationMeta('jsonPayload');
  @override
  late final GeneratedColumn<String> jsonPayload = GeneratedColumn<String>(
      'json_payload', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _cachedAtMeta =
      const VerificationMeta('cachedAt');
  @override
  late final GeneratedColumn<int> cachedAt = GeneratedColumn<int>(
      'cached_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _expiresAtMeta =
      const VerificationMeta('expiresAt');
  @override
  late final GeneratedColumn<int> expiresAt = GeneratedColumn<int>(
      'expires_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns =>
      [cacheKey, learnerId, dataType, jsonPayload, cachedAt, expiresAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_parent_cache';
  @override
  VerificationContext validateIntegrity(
      Insertable<OfflineParentCacheEntry> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('cache_key')) {
      context.handle(_cacheKeyMeta,
          cacheKey.isAcceptableOrUnknown(data['cache_key']!, _cacheKeyMeta));
    } else if (isInserting) {
      context.missing(_cacheKeyMeta);
    }
    if (data.containsKey('learner_id')) {
      context.handle(_learnerIdMeta,
          learnerId.isAcceptableOrUnknown(data['learner_id']!, _learnerIdMeta));
    } else if (isInserting) {
      context.missing(_learnerIdMeta);
    }
    if (data.containsKey('data_type')) {
      context.handle(_dataTypeMeta,
          dataType.isAcceptableOrUnknown(data['data_type']!, _dataTypeMeta));
    } else if (isInserting) {
      context.missing(_dataTypeMeta);
    }
    if (data.containsKey('json_payload')) {
      context.handle(
          _jsonPayloadMeta,
          jsonPayload.isAcceptableOrUnknown(
              data['json_payload']!, _jsonPayloadMeta));
    } else if (isInserting) {
      context.missing(_jsonPayloadMeta);
    }
    if (data.containsKey('cached_at')) {
      context.handle(_cachedAtMeta,
          cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta));
    } else if (isInserting) {
      context.missing(_cachedAtMeta);
    }
    if (data.containsKey('expires_at')) {
      context.handle(_expiresAtMeta,
          expiresAt.isAcceptableOrUnknown(data['expires_at']!, _expiresAtMeta));
    } else if (isInserting) {
      context.missing(_expiresAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {cacheKey};
  @override
  OfflineParentCacheEntry map(Map<String, dynamic> data,
      {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineParentCacheEntry(
      cacheKey: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}cache_key'])!,
      learnerId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}learner_id'])!,
      dataType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}data_type'])!,
      jsonPayload: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}json_payload'])!,
      cachedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}cached_at'])!,
      expiresAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}expires_at'])!,
    );
  }

  @override
  $OfflineParentCacheTable createAlias(String alias) {
    return $OfflineParentCacheTable(attachedDatabase, alias);
  }
}

class OfflineParentCacheEntry extends DataClass
    implements Insertable<OfflineParentCacheEntry> {
  /// Cache key: {learnerId}:{dataType}
  final String cacheKey;

  /// Learner ID.
  final String learnerId;

  /// Type of cached data: SUMMARY, PROGRESS, MESSAGES.
  final String dataType;

  /// JSON payload.
  final String jsonPayload;

  /// Unix timestamp when cached.
  final int cachedAt;

  /// Unix timestamp when cache expires.
  final int expiresAt;
  const OfflineParentCacheEntry(
      {required this.cacheKey,
      required this.learnerId,
      required this.dataType,
      required this.jsonPayload,
      required this.cachedAt,
      required this.expiresAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['cache_key'] = Variable<String>(cacheKey);
    map['learner_id'] = Variable<String>(learnerId);
    map['data_type'] = Variable<String>(dataType);
    map['json_payload'] = Variable<String>(jsonPayload);
    map['cached_at'] = Variable<int>(cachedAt);
    map['expires_at'] = Variable<int>(expiresAt);
    return map;
  }

  OfflineParentCacheCompanion toCompanion(bool nullToAbsent) {
    return OfflineParentCacheCompanion(
      cacheKey: Value(cacheKey),
      learnerId: Value(learnerId),
      dataType: Value(dataType),
      jsonPayload: Value(jsonPayload),
      cachedAt: Value(cachedAt),
      expiresAt: Value(expiresAt),
    );
  }

  factory OfflineParentCacheEntry.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineParentCacheEntry(
      cacheKey: serializer.fromJson<String>(json['cacheKey']),
      learnerId: serializer.fromJson<String>(json['learnerId']),
      dataType: serializer.fromJson<String>(json['dataType']),
      jsonPayload: serializer.fromJson<String>(json['jsonPayload']),
      cachedAt: serializer.fromJson<int>(json['cachedAt']),
      expiresAt: serializer.fromJson<int>(json['expiresAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'cacheKey': serializer.toJson<String>(cacheKey),
      'learnerId': serializer.toJson<String>(learnerId),
      'dataType': serializer.toJson<String>(dataType),
      'jsonPayload': serializer.toJson<String>(jsonPayload),
      'cachedAt': serializer.toJson<int>(cachedAt),
      'expiresAt': serializer.toJson<int>(expiresAt),
    };
  }

  OfflineParentCacheEntry copyWith(
          {String? cacheKey,
          String? learnerId,
          String? dataType,
          String? jsonPayload,
          int? cachedAt,
          int? expiresAt}) =>
      OfflineParentCacheEntry(
        cacheKey: cacheKey ?? this.cacheKey,
        learnerId: learnerId ?? this.learnerId,
        dataType: dataType ?? this.dataType,
        jsonPayload: jsonPayload ?? this.jsonPayload,
        cachedAt: cachedAt ?? this.cachedAt,
        expiresAt: expiresAt ?? this.expiresAt,
      );
  OfflineParentCacheEntry copyWithCompanion(OfflineParentCacheCompanion data) {
    return OfflineParentCacheEntry(
      cacheKey: data.cacheKey.present ? data.cacheKey.value : this.cacheKey,
      learnerId: data.learnerId.present ? data.learnerId.value : this.learnerId,
      dataType: data.dataType.present ? data.dataType.value : this.dataType,
      jsonPayload:
          data.jsonPayload.present ? data.jsonPayload.value : this.jsonPayload,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
      expiresAt: data.expiresAt.present ? data.expiresAt.value : this.expiresAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineParentCacheEntry(')
          ..write('cacheKey: $cacheKey, ')
          ..write('learnerId: $learnerId, ')
          ..write('dataType: $dataType, ')
          ..write('jsonPayload: $jsonPayload, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('expiresAt: $expiresAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      cacheKey, learnerId, dataType, jsonPayload, cachedAt, expiresAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineParentCacheEntry &&
          other.cacheKey == this.cacheKey &&
          other.learnerId == this.learnerId &&
          other.dataType == this.dataType &&
          other.jsonPayload == this.jsonPayload &&
          other.cachedAt == this.cachedAt &&
          other.expiresAt == this.expiresAt);
}

class OfflineParentCacheCompanion
    extends UpdateCompanion<OfflineParentCacheEntry> {
  final Value<String> cacheKey;
  final Value<String> learnerId;
  final Value<String> dataType;
  final Value<String> jsonPayload;
  final Value<int> cachedAt;
  final Value<int> expiresAt;
  final Value<int> rowid;
  const OfflineParentCacheCompanion({
    this.cacheKey = const Value.absent(),
    this.learnerId = const Value.absent(),
    this.dataType = const Value.absent(),
    this.jsonPayload = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.expiresAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineParentCacheCompanion.insert({
    required String cacheKey,
    required String learnerId,
    required String dataType,
    required String jsonPayload,
    required int cachedAt,
    required int expiresAt,
    this.rowid = const Value.absent(),
  })  : cacheKey = Value(cacheKey),
        learnerId = Value(learnerId),
        dataType = Value(dataType),
        jsonPayload = Value(jsonPayload),
        cachedAt = Value(cachedAt),
        expiresAt = Value(expiresAt);
  static Insertable<OfflineParentCacheEntry> custom({
    Expression<String>? cacheKey,
    Expression<String>? learnerId,
    Expression<String>? dataType,
    Expression<String>? jsonPayload,
    Expression<int>? cachedAt,
    Expression<int>? expiresAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (cacheKey != null) 'cache_key': cacheKey,
      if (learnerId != null) 'learner_id': learnerId,
      if (dataType != null) 'data_type': dataType,
      if (jsonPayload != null) 'json_payload': jsonPayload,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (expiresAt != null) 'expires_at': expiresAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineParentCacheCompanion copyWith(
      {Value<String>? cacheKey,
      Value<String>? learnerId,
      Value<String>? dataType,
      Value<String>? jsonPayload,
      Value<int>? cachedAt,
      Value<int>? expiresAt,
      Value<int>? rowid}) {
    return OfflineParentCacheCompanion(
      cacheKey: cacheKey ?? this.cacheKey,
      learnerId: learnerId ?? this.learnerId,
      dataType: dataType ?? this.dataType,
      jsonPayload: jsonPayload ?? this.jsonPayload,
      cachedAt: cachedAt ?? this.cachedAt,
      expiresAt: expiresAt ?? this.expiresAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (cacheKey.present) {
      map['cache_key'] = Variable<String>(cacheKey.value);
    }
    if (learnerId.present) {
      map['learner_id'] = Variable<String>(learnerId.value);
    }
    if (dataType.present) {
      map['data_type'] = Variable<String>(dataType.value);
    }
    if (jsonPayload.present) {
      map['json_payload'] = Variable<String>(jsonPayload.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<int>(cachedAt.value);
    }
    if (expiresAt.present) {
      map['expires_at'] = Variable<int>(expiresAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineParentCacheCompanion(')
          ..write('cacheKey: $cacheKey, ')
          ..write('learnerId: $learnerId, ')
          ..write('dataType: $dataType, ')
          ..write('jsonPayload: $jsonPayload, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('expiresAt: $expiresAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$OfflineDatabase extends GeneratedDatabase {
  _$OfflineDatabase(QueryExecutor e) : super(e);
  $OfflineDatabaseManager get managers => $OfflineDatabaseManager(this);
  late final $OfflineLearnersTable offlineLearners =
      $OfflineLearnersTable(this);
  late final $OfflineSessionsTable offlineSessions =
      $OfflineSessionsTable(this);
  late final $OfflineEventsTable offlineEvents = $OfflineEventsTable(this);
  late final $OfflineContentCacheTable offlineContentCache =
      $OfflineContentCacheTable(this);
  late final $OfflineSyncQueueTable offlineSyncQueue =
      $OfflineSyncQueueTable(this);
  late final $OfflineAttendanceRecordsTable offlineAttendanceRecords =
      $OfflineAttendanceRecordsTable(this);
  late final $OfflineTeacherNotesTable offlineTeacherNotes =
      $OfflineTeacherNotesTable(this);
  late final $OfflineParentCacheTable offlineParentCache =
      $OfflineParentCacheTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
        offlineLearners,
        offlineSessions,
        offlineEvents,
        offlineContentCache,
        offlineSyncQueue,
        offlineAttendanceRecords,
        offlineTeacherNotes,
        offlineParentCache
      ];
}

typedef $$OfflineLearnersTableCreateCompanionBuilder = OfflineLearnersCompanion
    Function({
  required String learnerId,
  required String displayName,
  required String gradeBand,
  Value<String?> avatarUrl,
  Value<String?> preferencesJson,
  required String tenantId,
  required int lastSyncedAt,
  Value<int> rowid,
});
typedef $$OfflineLearnersTableUpdateCompanionBuilder = OfflineLearnersCompanion
    Function({
  Value<String> learnerId,
  Value<String> displayName,
  Value<String> gradeBand,
  Value<String?> avatarUrl,
  Value<String?> preferencesJson,
  Value<String> tenantId,
  Value<int> lastSyncedAt,
  Value<int> rowid,
});

final class $$OfflineLearnersTableReferences extends BaseReferences<
    _$OfflineDatabase, $OfflineLearnersTable, OfflineLearner> {
  $$OfflineLearnersTableReferences(
      super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$OfflineSessionsTable, List<OfflineSession>>
      _offlineSessionsRefsTable(_$OfflineDatabase db) =>
          MultiTypedResultKey.fromTable(db.offlineSessions,
              aliasName: $_aliasNameGenerator(
                  db.offlineLearners.learnerId, db.offlineSessions.learnerId));

  $$OfflineSessionsTableProcessedTableManager get offlineSessionsRefs {
    final manager =
        $$OfflineSessionsTableTableManager($_db, $_db.offlineSessions).filter(
            (f) => f.learnerId.learnerId
                .sqlEquals($_itemColumn<String>('learner_id')!));

    final cache =
        $_typedResult.readTableOrNull(_offlineSessionsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$OfflineLearnersTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineLearnersTable> {
  $$OfflineLearnersTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get learnerId => $composableBuilder(
      column: $table.learnerId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get displayName => $composableBuilder(
      column: $table.displayName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get gradeBand => $composableBuilder(
      column: $table.gradeBand, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get avatarUrl => $composableBuilder(
      column: $table.avatarUrl, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get preferencesJson => $composableBuilder(
      column: $table.preferencesJson,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tenantId => $composableBuilder(
      column: $table.tenantId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => ColumnFilters(column));

  Expression<bool> offlineSessionsRefs(
      Expression<bool> Function($$OfflineSessionsTableFilterComposer f) f) {
    final $$OfflineSessionsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.learnerId,
        referencedTable: $db.offlineSessions,
        getReferencedColumn: (t) => t.learnerId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$OfflineSessionsTableFilterComposer(
              $db: $db,
              $table: $db.offlineSessions,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$OfflineLearnersTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineLearnersTable> {
  $$OfflineLearnersTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get learnerId => $composableBuilder(
      column: $table.learnerId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get displayName => $composableBuilder(
      column: $table.displayName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get gradeBand => $composableBuilder(
      column: $table.gradeBand, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get avatarUrl => $composableBuilder(
      column: $table.avatarUrl, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get preferencesJson => $composableBuilder(
      column: $table.preferencesJson,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tenantId => $composableBuilder(
      column: $table.tenantId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt,
      builder: (column) => ColumnOrderings(column));
}

class $$OfflineLearnersTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineLearnersTable> {
  $$OfflineLearnersTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get learnerId =>
      $composableBuilder(column: $table.learnerId, builder: (column) => column);

  GeneratedColumn<String> get displayName => $composableBuilder(
      column: $table.displayName, builder: (column) => column);

  GeneratedColumn<String> get gradeBand =>
      $composableBuilder(column: $table.gradeBand, builder: (column) => column);

  GeneratedColumn<String> get avatarUrl =>
      $composableBuilder(column: $table.avatarUrl, builder: (column) => column);

  GeneratedColumn<String> get preferencesJson => $composableBuilder(
      column: $table.preferencesJson, builder: (column) => column);

  GeneratedColumn<String> get tenantId =>
      $composableBuilder(column: $table.tenantId, builder: (column) => column);

  GeneratedColumn<int> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => column);

  Expression<T> offlineSessionsRefs<T extends Object>(
      Expression<T> Function($$OfflineSessionsTableAnnotationComposer a) f) {
    final $$OfflineSessionsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.learnerId,
        referencedTable: $db.offlineSessions,
        getReferencedColumn: (t) => t.learnerId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$OfflineSessionsTableAnnotationComposer(
              $db: $db,
              $table: $db.offlineSessions,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$OfflineLearnersTableTableManager extends RootTableManager<
    _$OfflineDatabase,
    $OfflineLearnersTable,
    OfflineLearner,
    $$OfflineLearnersTableFilterComposer,
    $$OfflineLearnersTableOrderingComposer,
    $$OfflineLearnersTableAnnotationComposer,
    $$OfflineLearnersTableCreateCompanionBuilder,
    $$OfflineLearnersTableUpdateCompanionBuilder,
    (OfflineLearner, $$OfflineLearnersTableReferences),
    OfflineLearner,
    PrefetchHooks Function({bool offlineSessionsRefs})> {
  $$OfflineLearnersTableTableManager(
      _$OfflineDatabase db, $OfflineLearnersTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineLearnersTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineLearnersTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineLearnersTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> learnerId = const Value.absent(),
            Value<String> displayName = const Value.absent(),
            Value<String> gradeBand = const Value.absent(),
            Value<String?> avatarUrl = const Value.absent(),
            Value<String?> preferencesJson = const Value.absent(),
            Value<String> tenantId = const Value.absent(),
            Value<int> lastSyncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineLearnersCompanion(
            learnerId: learnerId,
            displayName: displayName,
            gradeBand: gradeBand,
            avatarUrl: avatarUrl,
            preferencesJson: preferencesJson,
            tenantId: tenantId,
            lastSyncedAt: lastSyncedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String learnerId,
            required String displayName,
            required String gradeBand,
            Value<String?> avatarUrl = const Value.absent(),
            Value<String?> preferencesJson = const Value.absent(),
            required String tenantId,
            required int lastSyncedAt,
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineLearnersCompanion.insert(
            learnerId: learnerId,
            displayName: displayName,
            gradeBand: gradeBand,
            avatarUrl: avatarUrl,
            preferencesJson: preferencesJson,
            tenantId: tenantId,
            lastSyncedAt: lastSyncedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$OfflineLearnersTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: ({offlineSessionsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (offlineSessionsRefs) db.offlineSessions
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (offlineSessionsRefs)
                    await $_getPrefetchedData<OfflineLearner,
                            $OfflineLearnersTable, OfflineSession>(
                        currentTable: table,
                        referencedTable: $$OfflineLearnersTableReferences
                            ._offlineSessionsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$OfflineLearnersTableReferences(db, table, p0)
                                .offlineSessionsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.learnerId == item.learnerId),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$OfflineLearnersTableProcessedTableManager = ProcessedTableManager<
    _$OfflineDatabase,
    $OfflineLearnersTable,
    OfflineLearner,
    $$OfflineLearnersTableFilterComposer,
    $$OfflineLearnersTableOrderingComposer,
    $$OfflineLearnersTableAnnotationComposer,
    $$OfflineLearnersTableCreateCompanionBuilder,
    $$OfflineLearnersTableUpdateCompanionBuilder,
    (OfflineLearner, $$OfflineLearnersTableReferences),
    OfflineLearner,
    PrefetchHooks Function({bool offlineSessionsRefs})>;
typedef $$OfflineSessionsTableCreateCompanionBuilder = OfflineSessionsCompanion
    Function({
  required String localSessionId,
  Value<String?> serverSessionId,
  required String learnerId,
  required String subject,
  required String sessionType,
  Value<String> status,
  required String origin,
  required int startedAt,
  Value<int?> endedAt,
  Value<String?> planJson,
  Value<String?> errorMessage,
  Value<int> retryCount,
  required int lastUpdatedAt,
  Value<int> rowid,
});
typedef $$OfflineSessionsTableUpdateCompanionBuilder = OfflineSessionsCompanion
    Function({
  Value<String> localSessionId,
  Value<String?> serverSessionId,
  Value<String> learnerId,
  Value<String> subject,
  Value<String> sessionType,
  Value<String> status,
  Value<String> origin,
  Value<int> startedAt,
  Value<int?> endedAt,
  Value<String?> planJson,
  Value<String?> errorMessage,
  Value<int> retryCount,
  Value<int> lastUpdatedAt,
  Value<int> rowid,
});

final class $$OfflineSessionsTableReferences extends BaseReferences<
    _$OfflineDatabase, $OfflineSessionsTable, OfflineSession> {
  $$OfflineSessionsTableReferences(
      super.$_db, super.$_table, super.$_typedResult);

  static $OfflineLearnersTable _learnerIdTable(_$OfflineDatabase db) =>
      db.offlineLearners.createAlias($_aliasNameGenerator(
          db.offlineSessions.learnerId, db.offlineLearners.learnerId));

  $$OfflineLearnersTableProcessedTableManager get learnerId {
    final $_column = $_itemColumn<String>('learner_id')!;

    final manager =
        $$OfflineLearnersTableTableManager($_db, $_db.offlineLearners)
            .filter((f) => f.learnerId.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_learnerIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static MultiTypedResultKey<$OfflineEventsTable, List<OfflineEvent>>
      _offlineEventsRefsTable(_$OfflineDatabase db) =>
          MultiTypedResultKey.fromTable(db.offlineEvents,
              aliasName: $_aliasNameGenerator(db.offlineSessions.localSessionId,
                  db.offlineEvents.localSessionId));

  $$OfflineEventsTableProcessedTableManager get offlineEventsRefs {
    final manager = $$OfflineEventsTableTableManager($_db, $_db.offlineEvents)
        .filter((f) => f.localSessionId.localSessionId
            .sqlEquals($_itemColumn<String>('local_session_id')!));

    final cache = $_typedResult.readTableOrNull(_offlineEventsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$OfflineSessionsTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineSessionsTable> {
  $$OfflineSessionsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get localSessionId => $composableBuilder(
      column: $table.localSessionId,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get serverSessionId => $composableBuilder(
      column: $table.serverSessionId,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get subject => $composableBuilder(
      column: $table.subject, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get sessionType => $composableBuilder(
      column: $table.sessionType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get origin => $composableBuilder(
      column: $table.origin, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get startedAt => $composableBuilder(
      column: $table.startedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get endedAt => $composableBuilder(
      column: $table.endedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get planJson => $composableBuilder(
      column: $table.planJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get errorMessage => $composableBuilder(
      column: $table.errorMessage, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get lastUpdatedAt => $composableBuilder(
      column: $table.lastUpdatedAt, builder: (column) => ColumnFilters(column));

  $$OfflineLearnersTableFilterComposer get learnerId {
    final $$OfflineLearnersTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.learnerId,
        referencedTable: $db.offlineLearners,
        getReferencedColumn: (t) => t.learnerId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$OfflineLearnersTableFilterComposer(
              $db: $db,
              $table: $db.offlineLearners,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<bool> offlineEventsRefs(
      Expression<bool> Function($$OfflineEventsTableFilterComposer f) f) {
    final $$OfflineEventsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.localSessionId,
        referencedTable: $db.offlineEvents,
        getReferencedColumn: (t) => t.localSessionId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$OfflineEventsTableFilterComposer(
              $db: $db,
              $table: $db.offlineEvents,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$OfflineSessionsTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineSessionsTable> {
  $$OfflineSessionsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get localSessionId => $composableBuilder(
      column: $table.localSessionId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get serverSessionId => $composableBuilder(
      column: $table.serverSessionId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get subject => $composableBuilder(
      column: $table.subject, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get sessionType => $composableBuilder(
      column: $table.sessionType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get origin => $composableBuilder(
      column: $table.origin, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get startedAt => $composableBuilder(
      column: $table.startedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get endedAt => $composableBuilder(
      column: $table.endedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get planJson => $composableBuilder(
      column: $table.planJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get errorMessage => $composableBuilder(
      column: $table.errorMessage,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get lastUpdatedAt => $composableBuilder(
      column: $table.lastUpdatedAt,
      builder: (column) => ColumnOrderings(column));

  $$OfflineLearnersTableOrderingComposer get learnerId {
    final $$OfflineLearnersTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.learnerId,
        referencedTable: $db.offlineLearners,
        getReferencedColumn: (t) => t.learnerId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$OfflineLearnersTableOrderingComposer(
              $db: $db,
              $table: $db.offlineLearners,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$OfflineSessionsTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineSessionsTable> {
  $$OfflineSessionsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get localSessionId => $composableBuilder(
      column: $table.localSessionId, builder: (column) => column);

  GeneratedColumn<String> get serverSessionId => $composableBuilder(
      column: $table.serverSessionId, builder: (column) => column);

  GeneratedColumn<String> get subject =>
      $composableBuilder(column: $table.subject, builder: (column) => column);

  GeneratedColumn<String> get sessionType => $composableBuilder(
      column: $table.sessionType, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get origin =>
      $composableBuilder(column: $table.origin, builder: (column) => column);

  GeneratedColumn<int> get startedAt =>
      $composableBuilder(column: $table.startedAt, builder: (column) => column);

  GeneratedColumn<int> get endedAt =>
      $composableBuilder(column: $table.endedAt, builder: (column) => column);

  GeneratedColumn<String> get planJson =>
      $composableBuilder(column: $table.planJson, builder: (column) => column);

  GeneratedColumn<String> get errorMessage => $composableBuilder(
      column: $table.errorMessage, builder: (column) => column);

  GeneratedColumn<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => column);

  GeneratedColumn<int> get lastUpdatedAt => $composableBuilder(
      column: $table.lastUpdatedAt, builder: (column) => column);

  $$OfflineLearnersTableAnnotationComposer get learnerId {
    final $$OfflineLearnersTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.learnerId,
        referencedTable: $db.offlineLearners,
        getReferencedColumn: (t) => t.learnerId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$OfflineLearnersTableAnnotationComposer(
              $db: $db,
              $table: $db.offlineLearners,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  Expression<T> offlineEventsRefs<T extends Object>(
      Expression<T> Function($$OfflineEventsTableAnnotationComposer a) f) {
    final $$OfflineEventsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.localSessionId,
        referencedTable: $db.offlineEvents,
        getReferencedColumn: (t) => t.localSessionId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$OfflineEventsTableAnnotationComposer(
              $db: $db,
              $table: $db.offlineEvents,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$OfflineSessionsTableTableManager extends RootTableManager<
    _$OfflineDatabase,
    $OfflineSessionsTable,
    OfflineSession,
    $$OfflineSessionsTableFilterComposer,
    $$OfflineSessionsTableOrderingComposer,
    $$OfflineSessionsTableAnnotationComposer,
    $$OfflineSessionsTableCreateCompanionBuilder,
    $$OfflineSessionsTableUpdateCompanionBuilder,
    (OfflineSession, $$OfflineSessionsTableReferences),
    OfflineSession,
    PrefetchHooks Function({bool learnerId, bool offlineEventsRefs})> {
  $$OfflineSessionsTableTableManager(
      _$OfflineDatabase db, $OfflineSessionsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineSessionsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineSessionsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineSessionsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> localSessionId = const Value.absent(),
            Value<String?> serverSessionId = const Value.absent(),
            Value<String> learnerId = const Value.absent(),
            Value<String> subject = const Value.absent(),
            Value<String> sessionType = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String> origin = const Value.absent(),
            Value<int> startedAt = const Value.absent(),
            Value<int?> endedAt = const Value.absent(),
            Value<String?> planJson = const Value.absent(),
            Value<String?> errorMessage = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
            Value<int> lastUpdatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineSessionsCompanion(
            localSessionId: localSessionId,
            serverSessionId: serverSessionId,
            learnerId: learnerId,
            subject: subject,
            sessionType: sessionType,
            status: status,
            origin: origin,
            startedAt: startedAt,
            endedAt: endedAt,
            planJson: planJson,
            errorMessage: errorMessage,
            retryCount: retryCount,
            lastUpdatedAt: lastUpdatedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String localSessionId,
            Value<String?> serverSessionId = const Value.absent(),
            required String learnerId,
            required String subject,
            required String sessionType,
            Value<String> status = const Value.absent(),
            required String origin,
            required int startedAt,
            Value<int?> endedAt = const Value.absent(),
            Value<String?> planJson = const Value.absent(),
            Value<String?> errorMessage = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
            required int lastUpdatedAt,
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineSessionsCompanion.insert(
            localSessionId: localSessionId,
            serverSessionId: serverSessionId,
            learnerId: learnerId,
            subject: subject,
            sessionType: sessionType,
            status: status,
            origin: origin,
            startedAt: startedAt,
            endedAt: endedAt,
            planJson: planJson,
            errorMessage: errorMessage,
            retryCount: retryCount,
            lastUpdatedAt: lastUpdatedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$OfflineSessionsTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: (
              {learnerId = false, offlineEventsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (offlineEventsRefs) db.offlineEvents
              ],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (learnerId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.learnerId,
                    referencedTable:
                        $$OfflineSessionsTableReferences._learnerIdTable(db),
                    referencedColumn: $$OfflineSessionsTableReferences
                        ._learnerIdTable(db)
                        .learnerId,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [
                  if (offlineEventsRefs)
                    await $_getPrefetchedData<OfflineSession,
                            $OfflineSessionsTable, OfflineEvent>(
                        currentTable: table,
                        referencedTable: $$OfflineSessionsTableReferences
                            ._offlineEventsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$OfflineSessionsTableReferences(db, table, p0)
                                .offlineEventsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems.where(
                                (e) => e.localSessionId == item.localSessionId),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$OfflineSessionsTableProcessedTableManager = ProcessedTableManager<
    _$OfflineDatabase,
    $OfflineSessionsTable,
    OfflineSession,
    $$OfflineSessionsTableFilterComposer,
    $$OfflineSessionsTableOrderingComposer,
    $$OfflineSessionsTableAnnotationComposer,
    $$OfflineSessionsTableCreateCompanionBuilder,
    $$OfflineSessionsTableUpdateCompanionBuilder,
    (OfflineSession, $$OfflineSessionsTableReferences),
    OfflineSession,
    PrefetchHooks Function({bool learnerId, bool offlineEventsRefs})>;
typedef $$OfflineEventsTableCreateCompanionBuilder = OfflineEventsCompanion
    Function({
  Value<int> id,
  required String localSessionId,
  required String eventType,
  required String eventJson,
  Value<String> status,
  required int sequenceNum,
  required int createdAt,
  Value<int?> syncedAt,
  Value<String?> errorMessage,
});
typedef $$OfflineEventsTableUpdateCompanionBuilder = OfflineEventsCompanion
    Function({
  Value<int> id,
  Value<String> localSessionId,
  Value<String> eventType,
  Value<String> eventJson,
  Value<String> status,
  Value<int> sequenceNum,
  Value<int> createdAt,
  Value<int?> syncedAt,
  Value<String?> errorMessage,
});

final class $$OfflineEventsTableReferences extends BaseReferences<
    _$OfflineDatabase, $OfflineEventsTable, OfflineEvent> {
  $$OfflineEventsTableReferences(
      super.$_db, super.$_table, super.$_typedResult);

  static $OfflineSessionsTable _localSessionIdTable(_$OfflineDatabase db) =>
      db.offlineSessions.createAlias($_aliasNameGenerator(
          db.offlineEvents.localSessionId, db.offlineSessions.localSessionId));

  $$OfflineSessionsTableProcessedTableManager get localSessionId {
    final $_column = $_itemColumn<String>('local_session_id')!;

    final manager =
        $$OfflineSessionsTableTableManager($_db, $_db.offlineSessions)
            .filter((f) => f.localSessionId.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_localSessionIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }
}

class $$OfflineEventsTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineEventsTable> {
  $$OfflineEventsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get eventType => $composableBuilder(
      column: $table.eventType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get eventJson => $composableBuilder(
      column: $table.eventJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get sequenceNum => $composableBuilder(
      column: $table.sequenceNum, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get syncedAt => $composableBuilder(
      column: $table.syncedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get errorMessage => $composableBuilder(
      column: $table.errorMessage, builder: (column) => ColumnFilters(column));

  $$OfflineSessionsTableFilterComposer get localSessionId {
    final $$OfflineSessionsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.localSessionId,
        referencedTable: $db.offlineSessions,
        getReferencedColumn: (t) => t.localSessionId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$OfflineSessionsTableFilterComposer(
              $db: $db,
              $table: $db.offlineSessions,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$OfflineEventsTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineEventsTable> {
  $$OfflineEventsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get eventType => $composableBuilder(
      column: $table.eventType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get eventJson => $composableBuilder(
      column: $table.eventJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get sequenceNum => $composableBuilder(
      column: $table.sequenceNum, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get syncedAt => $composableBuilder(
      column: $table.syncedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get errorMessage => $composableBuilder(
      column: $table.errorMessage,
      builder: (column) => ColumnOrderings(column));

  $$OfflineSessionsTableOrderingComposer get localSessionId {
    final $$OfflineSessionsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.localSessionId,
        referencedTable: $db.offlineSessions,
        getReferencedColumn: (t) => t.localSessionId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$OfflineSessionsTableOrderingComposer(
              $db: $db,
              $table: $db.offlineSessions,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$OfflineEventsTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineEventsTable> {
  $$OfflineEventsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get eventType =>
      $composableBuilder(column: $table.eventType, builder: (column) => column);

  GeneratedColumn<String> get eventJson =>
      $composableBuilder(column: $table.eventJson, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<int> get sequenceNum => $composableBuilder(
      column: $table.sequenceNum, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get syncedAt =>
      $composableBuilder(column: $table.syncedAt, builder: (column) => column);

  GeneratedColumn<String> get errorMessage => $composableBuilder(
      column: $table.errorMessage, builder: (column) => column);

  $$OfflineSessionsTableAnnotationComposer get localSessionId {
    final $$OfflineSessionsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.localSessionId,
        referencedTable: $db.offlineSessions,
        getReferencedColumn: (t) => t.localSessionId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$OfflineSessionsTableAnnotationComposer(
              $db: $db,
              $table: $db.offlineSessions,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$OfflineEventsTableTableManager extends RootTableManager<
    _$OfflineDatabase,
    $OfflineEventsTable,
    OfflineEvent,
    $$OfflineEventsTableFilterComposer,
    $$OfflineEventsTableOrderingComposer,
    $$OfflineEventsTableAnnotationComposer,
    $$OfflineEventsTableCreateCompanionBuilder,
    $$OfflineEventsTableUpdateCompanionBuilder,
    (OfflineEvent, $$OfflineEventsTableReferences),
    OfflineEvent,
    PrefetchHooks Function({bool localSessionId})> {
  $$OfflineEventsTableTableManager(
      _$OfflineDatabase db, $OfflineEventsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineEventsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineEventsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineEventsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> localSessionId = const Value.absent(),
            Value<String> eventType = const Value.absent(),
            Value<String> eventJson = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int> sequenceNum = const Value.absent(),
            Value<int> createdAt = const Value.absent(),
            Value<int?> syncedAt = const Value.absent(),
            Value<String?> errorMessage = const Value.absent(),
          }) =>
              OfflineEventsCompanion(
            id: id,
            localSessionId: localSessionId,
            eventType: eventType,
            eventJson: eventJson,
            status: status,
            sequenceNum: sequenceNum,
            createdAt: createdAt,
            syncedAt: syncedAt,
            errorMessage: errorMessage,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String localSessionId,
            required String eventType,
            required String eventJson,
            Value<String> status = const Value.absent(),
            required int sequenceNum,
            required int createdAt,
            Value<int?> syncedAt = const Value.absent(),
            Value<String?> errorMessage = const Value.absent(),
          }) =>
              OfflineEventsCompanion.insert(
            id: id,
            localSessionId: localSessionId,
            eventType: eventType,
            eventJson: eventJson,
            status: status,
            sequenceNum: sequenceNum,
            createdAt: createdAt,
            syncedAt: syncedAt,
            errorMessage: errorMessage,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$OfflineEventsTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: ({localSessionId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (localSessionId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.localSessionId,
                    referencedTable:
                        $$OfflineEventsTableReferences._localSessionIdTable(db),
                    referencedColumn: $$OfflineEventsTableReferences
                        ._localSessionIdTable(db)
                        .localSessionId,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ));
}

typedef $$OfflineEventsTableProcessedTableManager = ProcessedTableManager<
    _$OfflineDatabase,
    $OfflineEventsTable,
    OfflineEvent,
    $$OfflineEventsTableFilterComposer,
    $$OfflineEventsTableOrderingComposer,
    $$OfflineEventsTableAnnotationComposer,
    $$OfflineEventsTableCreateCompanionBuilder,
    $$OfflineEventsTableUpdateCompanionBuilder,
    (OfflineEvent, $$OfflineEventsTableReferences),
    OfflineEvent,
    PrefetchHooks Function({bool localSessionId})>;
typedef $$OfflineContentCacheTableCreateCompanionBuilder
    = OfflineContentCacheCompanion Function({
  required String contentKey,
  required String contentType,
  required String subject,
  required String gradeBand,
  required String jsonPayload,
  Value<String?> mediaPathsJson,
  required int sizeBytes,
  required int expiresAt,
  required int createdAt,
  required int lastAccessedAt,
  Value<int> rowid,
});
typedef $$OfflineContentCacheTableUpdateCompanionBuilder
    = OfflineContentCacheCompanion Function({
  Value<String> contentKey,
  Value<String> contentType,
  Value<String> subject,
  Value<String> gradeBand,
  Value<String> jsonPayload,
  Value<String?> mediaPathsJson,
  Value<int> sizeBytes,
  Value<int> expiresAt,
  Value<int> createdAt,
  Value<int> lastAccessedAt,
  Value<int> rowid,
});

class $$OfflineContentCacheTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineContentCacheTable> {
  $$OfflineContentCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get contentKey => $composableBuilder(
      column: $table.contentKey, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get contentType => $composableBuilder(
      column: $table.contentType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get subject => $composableBuilder(
      column: $table.subject, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get gradeBand => $composableBuilder(
      column: $table.gradeBand, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get jsonPayload => $composableBuilder(
      column: $table.jsonPayload, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get mediaPathsJson => $composableBuilder(
      column: $table.mediaPathsJson,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get sizeBytes => $composableBuilder(
      column: $table.sizeBytes, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get expiresAt => $composableBuilder(
      column: $table.expiresAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get lastAccessedAt => $composableBuilder(
      column: $table.lastAccessedAt,
      builder: (column) => ColumnFilters(column));
}

class $$OfflineContentCacheTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineContentCacheTable> {
  $$OfflineContentCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get contentKey => $composableBuilder(
      column: $table.contentKey, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get contentType => $composableBuilder(
      column: $table.contentType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get subject => $composableBuilder(
      column: $table.subject, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get gradeBand => $composableBuilder(
      column: $table.gradeBand, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get jsonPayload => $composableBuilder(
      column: $table.jsonPayload, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get mediaPathsJson => $composableBuilder(
      column: $table.mediaPathsJson,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get sizeBytes => $composableBuilder(
      column: $table.sizeBytes, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get expiresAt => $composableBuilder(
      column: $table.expiresAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get lastAccessedAt => $composableBuilder(
      column: $table.lastAccessedAt,
      builder: (column) => ColumnOrderings(column));
}

class $$OfflineContentCacheTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineContentCacheTable> {
  $$OfflineContentCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get contentKey => $composableBuilder(
      column: $table.contentKey, builder: (column) => column);

  GeneratedColumn<String> get contentType => $composableBuilder(
      column: $table.contentType, builder: (column) => column);

  GeneratedColumn<String> get subject =>
      $composableBuilder(column: $table.subject, builder: (column) => column);

  GeneratedColumn<String> get gradeBand =>
      $composableBuilder(column: $table.gradeBand, builder: (column) => column);

  GeneratedColumn<String> get jsonPayload => $composableBuilder(
      column: $table.jsonPayload, builder: (column) => column);

  GeneratedColumn<String> get mediaPathsJson => $composableBuilder(
      column: $table.mediaPathsJson, builder: (column) => column);

  GeneratedColumn<int> get sizeBytes =>
      $composableBuilder(column: $table.sizeBytes, builder: (column) => column);

  GeneratedColumn<int> get expiresAt =>
      $composableBuilder(column: $table.expiresAt, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get lastAccessedAt => $composableBuilder(
      column: $table.lastAccessedAt, builder: (column) => column);
}

class $$OfflineContentCacheTableTableManager extends RootTableManager<
    _$OfflineDatabase,
    $OfflineContentCacheTable,
    OfflineContent,
    $$OfflineContentCacheTableFilterComposer,
    $$OfflineContentCacheTableOrderingComposer,
    $$OfflineContentCacheTableAnnotationComposer,
    $$OfflineContentCacheTableCreateCompanionBuilder,
    $$OfflineContentCacheTableUpdateCompanionBuilder,
    (
      OfflineContent,
      BaseReferences<_$OfflineDatabase, $OfflineContentCacheTable,
          OfflineContent>
    ),
    OfflineContent,
    PrefetchHooks Function()> {
  $$OfflineContentCacheTableTableManager(
      _$OfflineDatabase db, $OfflineContentCacheTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineContentCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineContentCacheTableOrderingComposer(
                  $db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineContentCacheTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> contentKey = const Value.absent(),
            Value<String> contentType = const Value.absent(),
            Value<String> subject = const Value.absent(),
            Value<String> gradeBand = const Value.absent(),
            Value<String> jsonPayload = const Value.absent(),
            Value<String?> mediaPathsJson = const Value.absent(),
            Value<int> sizeBytes = const Value.absent(),
            Value<int> expiresAt = const Value.absent(),
            Value<int> createdAt = const Value.absent(),
            Value<int> lastAccessedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineContentCacheCompanion(
            contentKey: contentKey,
            contentType: contentType,
            subject: subject,
            gradeBand: gradeBand,
            jsonPayload: jsonPayload,
            mediaPathsJson: mediaPathsJson,
            sizeBytes: sizeBytes,
            expiresAt: expiresAt,
            createdAt: createdAt,
            lastAccessedAt: lastAccessedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String contentKey,
            required String contentType,
            required String subject,
            required String gradeBand,
            required String jsonPayload,
            Value<String?> mediaPathsJson = const Value.absent(),
            required int sizeBytes,
            required int expiresAt,
            required int createdAt,
            required int lastAccessedAt,
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineContentCacheCompanion.insert(
            contentKey: contentKey,
            contentType: contentType,
            subject: subject,
            gradeBand: gradeBand,
            jsonPayload: jsonPayload,
            mediaPathsJson: mediaPathsJson,
            sizeBytes: sizeBytes,
            expiresAt: expiresAt,
            createdAt: createdAt,
            lastAccessedAt: lastAccessedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineContentCacheTableProcessedTableManager = ProcessedTableManager<
    _$OfflineDatabase,
    $OfflineContentCacheTable,
    OfflineContent,
    $$OfflineContentCacheTableFilterComposer,
    $$OfflineContentCacheTableOrderingComposer,
    $$OfflineContentCacheTableAnnotationComposer,
    $$OfflineContentCacheTableCreateCompanionBuilder,
    $$OfflineContentCacheTableUpdateCompanionBuilder,
    (
      OfflineContent,
      BaseReferences<_$OfflineDatabase, $OfflineContentCacheTable,
          OfflineContent>
    ),
    OfflineContent,
    PrefetchHooks Function()>;
typedef $$OfflineSyncQueueTableCreateCompanionBuilder
    = OfflineSyncQueueCompanion Function({
  Value<int> id,
  required String operationType,
  required String payloadJson,
  Value<int> priority,
  Value<String> status,
  required int createdAt,
  Value<int?> lastAttemptAt,
  Value<int> retryCount,
  Value<String?> errorMessage,
});
typedef $$OfflineSyncQueueTableUpdateCompanionBuilder
    = OfflineSyncQueueCompanion Function({
  Value<int> id,
  Value<String> operationType,
  Value<String> payloadJson,
  Value<int> priority,
  Value<String> status,
  Value<int> createdAt,
  Value<int?> lastAttemptAt,
  Value<int> retryCount,
  Value<String?> errorMessage,
});

class $$OfflineSyncQueueTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineSyncQueueTable> {
  $$OfflineSyncQueueTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get operationType => $composableBuilder(
      column: $table.operationType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get payloadJson => $composableBuilder(
      column: $table.payloadJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get priority => $composableBuilder(
      column: $table.priority, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get lastAttemptAt => $composableBuilder(
      column: $table.lastAttemptAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get errorMessage => $composableBuilder(
      column: $table.errorMessage, builder: (column) => ColumnFilters(column));
}

class $$OfflineSyncQueueTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineSyncQueueTable> {
  $$OfflineSyncQueueTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get operationType => $composableBuilder(
      column: $table.operationType,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get payloadJson => $composableBuilder(
      column: $table.payloadJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get priority => $composableBuilder(
      column: $table.priority, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get lastAttemptAt => $composableBuilder(
      column: $table.lastAttemptAt,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get errorMessage => $composableBuilder(
      column: $table.errorMessage,
      builder: (column) => ColumnOrderings(column));
}

class $$OfflineSyncQueueTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineSyncQueueTable> {
  $$OfflineSyncQueueTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get operationType => $composableBuilder(
      column: $table.operationType, builder: (column) => column);

  GeneratedColumn<String> get payloadJson => $composableBuilder(
      column: $table.payloadJson, builder: (column) => column);

  GeneratedColumn<int> get priority =>
      $composableBuilder(column: $table.priority, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<int> get lastAttemptAt => $composableBuilder(
      column: $table.lastAttemptAt, builder: (column) => column);

  GeneratedColumn<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => column);

  GeneratedColumn<String> get errorMessage => $composableBuilder(
      column: $table.errorMessage, builder: (column) => column);
}

class $$OfflineSyncQueueTableTableManager extends RootTableManager<
    _$OfflineDatabase,
    $OfflineSyncQueueTable,
    OfflineSyncQueueEntry,
    $$OfflineSyncQueueTableFilterComposer,
    $$OfflineSyncQueueTableOrderingComposer,
    $$OfflineSyncQueueTableAnnotationComposer,
    $$OfflineSyncQueueTableCreateCompanionBuilder,
    $$OfflineSyncQueueTableUpdateCompanionBuilder,
    (
      OfflineSyncQueueEntry,
      BaseReferences<_$OfflineDatabase, $OfflineSyncQueueTable,
          OfflineSyncQueueEntry>
    ),
    OfflineSyncQueueEntry,
    PrefetchHooks Function()> {
  $$OfflineSyncQueueTableTableManager(
      _$OfflineDatabase db, $OfflineSyncQueueTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineSyncQueueTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineSyncQueueTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineSyncQueueTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> operationType = const Value.absent(),
            Value<String> payloadJson = const Value.absent(),
            Value<int> priority = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int> createdAt = const Value.absent(),
            Value<int?> lastAttemptAt = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
            Value<String?> errorMessage = const Value.absent(),
          }) =>
              OfflineSyncQueueCompanion(
            id: id,
            operationType: operationType,
            payloadJson: payloadJson,
            priority: priority,
            status: status,
            createdAt: createdAt,
            lastAttemptAt: lastAttemptAt,
            retryCount: retryCount,
            errorMessage: errorMessage,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String operationType,
            required String payloadJson,
            Value<int> priority = const Value.absent(),
            Value<String> status = const Value.absent(),
            required int createdAt,
            Value<int?> lastAttemptAt = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
            Value<String?> errorMessage = const Value.absent(),
          }) =>
              OfflineSyncQueueCompanion.insert(
            id: id,
            operationType: operationType,
            payloadJson: payloadJson,
            priority: priority,
            status: status,
            createdAt: createdAt,
            lastAttemptAt: lastAttemptAt,
            retryCount: retryCount,
            errorMessage: errorMessage,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineSyncQueueTableProcessedTableManager = ProcessedTableManager<
    _$OfflineDatabase,
    $OfflineSyncQueueTable,
    OfflineSyncQueueEntry,
    $$OfflineSyncQueueTableFilterComposer,
    $$OfflineSyncQueueTableOrderingComposer,
    $$OfflineSyncQueueTableAnnotationComposer,
    $$OfflineSyncQueueTableCreateCompanionBuilder,
    $$OfflineSyncQueueTableUpdateCompanionBuilder,
    (
      OfflineSyncQueueEntry,
      BaseReferences<_$OfflineDatabase, $OfflineSyncQueueTable,
          OfflineSyncQueueEntry>
    ),
    OfflineSyncQueueEntry,
    PrefetchHooks Function()>;
typedef $$OfflineAttendanceRecordsTableCreateCompanionBuilder
    = OfflineAttendanceRecordsCompanion Function({
  Value<int> id,
  required String learnerId,
  required String classId,
  required String date,
  required String attendanceStatus,
  Value<String?> note,
  Value<String> syncStatus,
  required int recordedAt,
  required String recordedBy,
});
typedef $$OfflineAttendanceRecordsTableUpdateCompanionBuilder
    = OfflineAttendanceRecordsCompanion Function({
  Value<int> id,
  Value<String> learnerId,
  Value<String> classId,
  Value<String> date,
  Value<String> attendanceStatus,
  Value<String?> note,
  Value<String> syncStatus,
  Value<int> recordedAt,
  Value<String> recordedBy,
});

class $$OfflineAttendanceRecordsTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineAttendanceRecordsTable> {
  $$OfflineAttendanceRecordsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get learnerId => $composableBuilder(
      column: $table.learnerId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get classId => $composableBuilder(
      column: $table.classId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get date => $composableBuilder(
      column: $table.date, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get attendanceStatus => $composableBuilder(
      column: $table.attendanceStatus,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get note => $composableBuilder(
      column: $table.note, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get recordedBy => $composableBuilder(
      column: $table.recordedBy, builder: (column) => ColumnFilters(column));
}

class $$OfflineAttendanceRecordsTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineAttendanceRecordsTable> {
  $$OfflineAttendanceRecordsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get learnerId => $composableBuilder(
      column: $table.learnerId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get classId => $composableBuilder(
      column: $table.classId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get date => $composableBuilder(
      column: $table.date, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get attendanceStatus => $composableBuilder(
      column: $table.attendanceStatus,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get note => $composableBuilder(
      column: $table.note, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get recordedBy => $composableBuilder(
      column: $table.recordedBy, builder: (column) => ColumnOrderings(column));
}

class $$OfflineAttendanceRecordsTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineAttendanceRecordsTable> {
  $$OfflineAttendanceRecordsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get learnerId =>
      $composableBuilder(column: $table.learnerId, builder: (column) => column);

  GeneratedColumn<String> get classId =>
      $composableBuilder(column: $table.classId, builder: (column) => column);

  GeneratedColumn<String> get date =>
      $composableBuilder(column: $table.date, builder: (column) => column);

  GeneratedColumn<String> get attendanceStatus => $composableBuilder(
      column: $table.attendanceStatus, builder: (column) => column);

  GeneratedColumn<String> get note =>
      $composableBuilder(column: $table.note, builder: (column) => column);

  GeneratedColumn<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<int> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => column);

  GeneratedColumn<String> get recordedBy => $composableBuilder(
      column: $table.recordedBy, builder: (column) => column);
}

class $$OfflineAttendanceRecordsTableTableManager extends RootTableManager<
    _$OfflineDatabase,
    $OfflineAttendanceRecordsTable,
    OfflineAttendance,
    $$OfflineAttendanceRecordsTableFilterComposer,
    $$OfflineAttendanceRecordsTableOrderingComposer,
    $$OfflineAttendanceRecordsTableAnnotationComposer,
    $$OfflineAttendanceRecordsTableCreateCompanionBuilder,
    $$OfflineAttendanceRecordsTableUpdateCompanionBuilder,
    (
      OfflineAttendance,
      BaseReferences<_$OfflineDatabase, $OfflineAttendanceRecordsTable,
          OfflineAttendance>
    ),
    OfflineAttendance,
    PrefetchHooks Function()> {
  $$OfflineAttendanceRecordsTableTableManager(
      _$OfflineDatabase db, $OfflineAttendanceRecordsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineAttendanceRecordsTableFilterComposer(
                  $db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineAttendanceRecordsTableOrderingComposer(
                  $db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineAttendanceRecordsTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> learnerId = const Value.absent(),
            Value<String> classId = const Value.absent(),
            Value<String> date = const Value.absent(),
            Value<String> attendanceStatus = const Value.absent(),
            Value<String?> note = const Value.absent(),
            Value<String> syncStatus = const Value.absent(),
            Value<int> recordedAt = const Value.absent(),
            Value<String> recordedBy = const Value.absent(),
          }) =>
              OfflineAttendanceRecordsCompanion(
            id: id,
            learnerId: learnerId,
            classId: classId,
            date: date,
            attendanceStatus: attendanceStatus,
            note: note,
            syncStatus: syncStatus,
            recordedAt: recordedAt,
            recordedBy: recordedBy,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String learnerId,
            required String classId,
            required String date,
            required String attendanceStatus,
            Value<String?> note = const Value.absent(),
            Value<String> syncStatus = const Value.absent(),
            required int recordedAt,
            required String recordedBy,
          }) =>
              OfflineAttendanceRecordsCompanion.insert(
            id: id,
            learnerId: learnerId,
            classId: classId,
            date: date,
            attendanceStatus: attendanceStatus,
            note: note,
            syncStatus: syncStatus,
            recordedAt: recordedAt,
            recordedBy: recordedBy,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineAttendanceRecordsTableProcessedTableManager
    = ProcessedTableManager<
        _$OfflineDatabase,
        $OfflineAttendanceRecordsTable,
        OfflineAttendance,
        $$OfflineAttendanceRecordsTableFilterComposer,
        $$OfflineAttendanceRecordsTableOrderingComposer,
        $$OfflineAttendanceRecordsTableAnnotationComposer,
        $$OfflineAttendanceRecordsTableCreateCompanionBuilder,
        $$OfflineAttendanceRecordsTableUpdateCompanionBuilder,
        (
          OfflineAttendance,
          BaseReferences<_$OfflineDatabase, $OfflineAttendanceRecordsTable,
              OfflineAttendance>
        ),
        OfflineAttendance,
        PrefetchHooks Function()>;
typedef $$OfflineTeacherNotesTableCreateCompanionBuilder
    = OfflineTeacherNotesCompanion Function({
  required String localNoteId,
  Value<String?> serverNoteId,
  required String learnerId,
  required String content,
  Value<String?> category,
  Value<String> syncStatus,
  required int createdAt,
  required String createdBy,
  Value<int> rowid,
});
typedef $$OfflineTeacherNotesTableUpdateCompanionBuilder
    = OfflineTeacherNotesCompanion Function({
  Value<String> localNoteId,
  Value<String?> serverNoteId,
  Value<String> learnerId,
  Value<String> content,
  Value<String?> category,
  Value<String> syncStatus,
  Value<int> createdAt,
  Value<String> createdBy,
  Value<int> rowid,
});

class $$OfflineTeacherNotesTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineTeacherNotesTable> {
  $$OfflineTeacherNotesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get localNoteId => $composableBuilder(
      column: $table.localNoteId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get serverNoteId => $composableBuilder(
      column: $table.serverNoteId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get learnerId => $composableBuilder(
      column: $table.learnerId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get content => $composableBuilder(
      column: $table.content, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get category => $composableBuilder(
      column: $table.category, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get createdBy => $composableBuilder(
      column: $table.createdBy, builder: (column) => ColumnFilters(column));
}

class $$OfflineTeacherNotesTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineTeacherNotesTable> {
  $$OfflineTeacherNotesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get localNoteId => $composableBuilder(
      column: $table.localNoteId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get serverNoteId => $composableBuilder(
      column: $table.serverNoteId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get learnerId => $composableBuilder(
      column: $table.learnerId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get content => $composableBuilder(
      column: $table.content, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get category => $composableBuilder(
      column: $table.category, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get createdBy => $composableBuilder(
      column: $table.createdBy, builder: (column) => ColumnOrderings(column));
}

class $$OfflineTeacherNotesTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineTeacherNotesTable> {
  $$OfflineTeacherNotesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get localNoteId => $composableBuilder(
      column: $table.localNoteId, builder: (column) => column);

  GeneratedColumn<String> get serverNoteId => $composableBuilder(
      column: $table.serverNoteId, builder: (column) => column);

  GeneratedColumn<String> get learnerId =>
      $composableBuilder(column: $table.learnerId, builder: (column) => column);

  GeneratedColumn<String> get content =>
      $composableBuilder(column: $table.content, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);

  GeneratedColumn<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get createdBy =>
      $composableBuilder(column: $table.createdBy, builder: (column) => column);
}

class $$OfflineTeacherNotesTableTableManager extends RootTableManager<
    _$OfflineDatabase,
    $OfflineTeacherNotesTable,
    OfflineTeacherNote,
    $$OfflineTeacherNotesTableFilterComposer,
    $$OfflineTeacherNotesTableOrderingComposer,
    $$OfflineTeacherNotesTableAnnotationComposer,
    $$OfflineTeacherNotesTableCreateCompanionBuilder,
    $$OfflineTeacherNotesTableUpdateCompanionBuilder,
    (
      OfflineTeacherNote,
      BaseReferences<_$OfflineDatabase, $OfflineTeacherNotesTable,
          OfflineTeacherNote>
    ),
    OfflineTeacherNote,
    PrefetchHooks Function()> {
  $$OfflineTeacherNotesTableTableManager(
      _$OfflineDatabase db, $OfflineTeacherNotesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineTeacherNotesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineTeacherNotesTableOrderingComposer(
                  $db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineTeacherNotesTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> localNoteId = const Value.absent(),
            Value<String?> serverNoteId = const Value.absent(),
            Value<String> learnerId = const Value.absent(),
            Value<String> content = const Value.absent(),
            Value<String?> category = const Value.absent(),
            Value<String> syncStatus = const Value.absent(),
            Value<int> createdAt = const Value.absent(),
            Value<String> createdBy = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineTeacherNotesCompanion(
            localNoteId: localNoteId,
            serverNoteId: serverNoteId,
            learnerId: learnerId,
            content: content,
            category: category,
            syncStatus: syncStatus,
            createdAt: createdAt,
            createdBy: createdBy,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String localNoteId,
            Value<String?> serverNoteId = const Value.absent(),
            required String learnerId,
            required String content,
            Value<String?> category = const Value.absent(),
            Value<String> syncStatus = const Value.absent(),
            required int createdAt,
            required String createdBy,
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineTeacherNotesCompanion.insert(
            localNoteId: localNoteId,
            serverNoteId: serverNoteId,
            learnerId: learnerId,
            content: content,
            category: category,
            syncStatus: syncStatus,
            createdAt: createdAt,
            createdBy: createdBy,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineTeacherNotesTableProcessedTableManager = ProcessedTableManager<
    _$OfflineDatabase,
    $OfflineTeacherNotesTable,
    OfflineTeacherNote,
    $$OfflineTeacherNotesTableFilterComposer,
    $$OfflineTeacherNotesTableOrderingComposer,
    $$OfflineTeacherNotesTableAnnotationComposer,
    $$OfflineTeacherNotesTableCreateCompanionBuilder,
    $$OfflineTeacherNotesTableUpdateCompanionBuilder,
    (
      OfflineTeacherNote,
      BaseReferences<_$OfflineDatabase, $OfflineTeacherNotesTable,
          OfflineTeacherNote>
    ),
    OfflineTeacherNote,
    PrefetchHooks Function()>;
typedef $$OfflineParentCacheTableCreateCompanionBuilder
    = OfflineParentCacheCompanion Function({
  required String cacheKey,
  required String learnerId,
  required String dataType,
  required String jsonPayload,
  required int cachedAt,
  required int expiresAt,
  Value<int> rowid,
});
typedef $$OfflineParentCacheTableUpdateCompanionBuilder
    = OfflineParentCacheCompanion Function({
  Value<String> cacheKey,
  Value<String> learnerId,
  Value<String> dataType,
  Value<String> jsonPayload,
  Value<int> cachedAt,
  Value<int> expiresAt,
  Value<int> rowid,
});

class $$OfflineParentCacheTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineParentCacheTable> {
  $$OfflineParentCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get cacheKey => $composableBuilder(
      column: $table.cacheKey, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get learnerId => $composableBuilder(
      column: $table.learnerId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get dataType => $composableBuilder(
      column: $table.dataType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get jsonPayload => $composableBuilder(
      column: $table.jsonPayload, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get cachedAt => $composableBuilder(
      column: $table.cachedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get expiresAt => $composableBuilder(
      column: $table.expiresAt, builder: (column) => ColumnFilters(column));
}

class $$OfflineParentCacheTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineParentCacheTable> {
  $$OfflineParentCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get cacheKey => $composableBuilder(
      column: $table.cacheKey, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get learnerId => $composableBuilder(
      column: $table.learnerId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get dataType => $composableBuilder(
      column: $table.dataType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get jsonPayload => $composableBuilder(
      column: $table.jsonPayload, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get cachedAt => $composableBuilder(
      column: $table.cachedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get expiresAt => $composableBuilder(
      column: $table.expiresAt, builder: (column) => ColumnOrderings(column));
}

class $$OfflineParentCacheTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineParentCacheTable> {
  $$OfflineParentCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get cacheKey =>
      $composableBuilder(column: $table.cacheKey, builder: (column) => column);

  GeneratedColumn<String> get learnerId =>
      $composableBuilder(column: $table.learnerId, builder: (column) => column);

  GeneratedColumn<String> get dataType =>
      $composableBuilder(column: $table.dataType, builder: (column) => column);

  GeneratedColumn<String> get jsonPayload => $composableBuilder(
      column: $table.jsonPayload, builder: (column) => column);

  GeneratedColumn<int> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);

  GeneratedColumn<int> get expiresAt =>
      $composableBuilder(column: $table.expiresAt, builder: (column) => column);
}

class $$OfflineParentCacheTableTableManager extends RootTableManager<
    _$OfflineDatabase,
    $OfflineParentCacheTable,
    OfflineParentCacheEntry,
    $$OfflineParentCacheTableFilterComposer,
    $$OfflineParentCacheTableOrderingComposer,
    $$OfflineParentCacheTableAnnotationComposer,
    $$OfflineParentCacheTableCreateCompanionBuilder,
    $$OfflineParentCacheTableUpdateCompanionBuilder,
    (
      OfflineParentCacheEntry,
      BaseReferences<_$OfflineDatabase, $OfflineParentCacheTable,
          OfflineParentCacheEntry>
    ),
    OfflineParentCacheEntry,
    PrefetchHooks Function()> {
  $$OfflineParentCacheTableTableManager(
      _$OfflineDatabase db, $OfflineParentCacheTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineParentCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineParentCacheTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineParentCacheTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> cacheKey = const Value.absent(),
            Value<String> learnerId = const Value.absent(),
            Value<String> dataType = const Value.absent(),
            Value<String> jsonPayload = const Value.absent(),
            Value<int> cachedAt = const Value.absent(),
            Value<int> expiresAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineParentCacheCompanion(
            cacheKey: cacheKey,
            learnerId: learnerId,
            dataType: dataType,
            jsonPayload: jsonPayload,
            cachedAt: cachedAt,
            expiresAt: expiresAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String cacheKey,
            required String learnerId,
            required String dataType,
            required String jsonPayload,
            required int cachedAt,
            required int expiresAt,
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineParentCacheCompanion.insert(
            cacheKey: cacheKey,
            learnerId: learnerId,
            dataType: dataType,
            jsonPayload: jsonPayload,
            cachedAt: cachedAt,
            expiresAt: expiresAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineParentCacheTableProcessedTableManager = ProcessedTableManager<
    _$OfflineDatabase,
    $OfflineParentCacheTable,
    OfflineParentCacheEntry,
    $$OfflineParentCacheTableFilterComposer,
    $$OfflineParentCacheTableOrderingComposer,
    $$OfflineParentCacheTableAnnotationComposer,
    $$OfflineParentCacheTableCreateCompanionBuilder,
    $$OfflineParentCacheTableUpdateCompanionBuilder,
    (
      OfflineParentCacheEntry,
      BaseReferences<_$OfflineDatabase, $OfflineParentCacheTable,
          OfflineParentCacheEntry>
    ),
    OfflineParentCacheEntry,
    PrefetchHooks Function()>;

class $OfflineDatabaseManager {
  final _$OfflineDatabase _db;
  $OfflineDatabaseManager(this._db);
  $$OfflineLearnersTableTableManager get offlineLearners =>
      $$OfflineLearnersTableTableManager(_db, _db.offlineLearners);
  $$OfflineSessionsTableTableManager get offlineSessions =>
      $$OfflineSessionsTableTableManager(_db, _db.offlineSessions);
  $$OfflineEventsTableTableManager get offlineEvents =>
      $$OfflineEventsTableTableManager(_db, _db.offlineEvents);
  $$OfflineContentCacheTableTableManager get offlineContentCache =>
      $$OfflineContentCacheTableTableManager(_db, _db.offlineContentCache);
  $$OfflineSyncQueueTableTableManager get offlineSyncQueue =>
      $$OfflineSyncQueueTableTableManager(_db, _db.offlineSyncQueue);
  $$OfflineAttendanceRecordsTableTableManager get offlineAttendanceRecords =>
      $$OfflineAttendanceRecordsTableTableManager(
          _db, _db.offlineAttendanceRecords);
  $$OfflineTeacherNotesTableTableManager get offlineTeacherNotes =>
      $$OfflineTeacherNotesTableTableManager(_db, _db.offlineTeacherNotes);
  $$OfflineParentCacheTableTableManager get offlineParentCache =>
      $$OfflineParentCacheTableTableManager(_db, _db.offlineParentCache);
}
