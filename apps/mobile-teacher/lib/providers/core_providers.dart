/// Core Providers
///
/// Foundation providers for services and repositories.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import '../config/env_config.dart';
import '../services/database/local_database.dart';
import '../services/sync/sync_service.dart';
import '../services/sync/connectivity_monitor.dart';
import '../repositories/repositories.dart';

// ============================================================================
// Core Services
// ============================================================================

/// API client provider.
final apiClientProvider = Provider<AivoApiClient>((ref) {
  return AivoApiClient.instance;
});

/// Offline database provider.
final offlineDatabaseProvider = Provider<OfflineDatabase>((ref) {
  return OfflineDatabase();
});

/// Teacher local database provider.
final localDatabaseProvider = Provider<TeacherLocalDatabase>((ref) {
  final offlineDb = ref.watch(offlineDatabaseProvider);
  return TeacherLocalDatabase(database: offlineDb);
});

/// Connectivity service provider.
final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  return ConnectivityService();
});

/// Connectivity monitor provider.
final connectivityMonitorProvider = Provider<ConnectivityMonitor>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return ConnectivityMonitor(connectivityService: service);
});

/// Sync service provider.
final syncServiceProvider = Provider<SyncService>((ref) {
  final db = ref.watch(localDatabaseProvider);
  final api = ref.watch(apiClientProvider);
  final connectivity = ref.watch(connectivityMonitorProvider);
  
  final service = SyncService(
    localDb: db,
    apiClient: api,
    connectivity: connectivity,
  );
  
  // Start background sync
  service.startBackgroundSync();
  
  ref.onDispose(() {
    service.dispose();
  });
  
  return service;
});

// ============================================================================
// Repositories
// ============================================================================

/// Student repository provider.
final studentRepositoryProvider = Provider<StudentRepository>((ref) {
  return StudentRepository(
    api: ref.watch(apiClientProvider),
    db: ref.watch(localDatabaseProvider),
    sync: ref.watch(syncServiceProvider),
    connectivity: ref.watch(connectivityMonitorProvider),
  );
});

/// Session repository provider.
final sessionRepositoryProvider = Provider<SessionRepository>((ref) {
  return SessionRepository(
    api: ref.watch(apiClientProvider),
    db: ref.watch(localDatabaseProvider),
    sync: ref.watch(syncServiceProvider),
    connectivity: ref.watch(connectivityMonitorProvider),
  );
});

/// IEP repository provider.
final iepRepositoryProvider = Provider<IepRepository>((ref) {
  return IepRepository(
    api: ref.watch(apiClientProvider),
    db: ref.watch(localDatabaseProvider),
    sync: ref.watch(syncServiceProvider),
    connectivity: ref.watch(connectivityMonitorProvider),
  );
});

/// Message repository provider.
final messageRepositoryProvider = Provider<MessageRepository>((ref) {
  return MessageRepository(
    api: ref.watch(apiClientProvider),
    db: ref.watch(localDatabaseProvider),
    sync: ref.watch(syncServiceProvider),
    connectivity: ref.watch(connectivityMonitorProvider),
  );
});

/// Class repository provider.
final classRepositoryProvider = Provider<ClassRepository>((ref) {
  return ClassRepository(
    api: ref.watch(apiClientProvider),
    connectivity: ref.watch(connectivityMonitorProvider),
  );
});

// ============================================================================
// Connectivity State
// ============================================================================

/// Current connectivity state provider.
final connectivityStateProvider = StreamProvider<bool>((ref) {
  final monitor = ref.watch(connectivityMonitorProvider);
  return monitor.stateStream;
});

/// Is online provider.
final isOnlineProvider = Provider<bool>((ref) {
  final state = ref.watch(connectivityStateProvider);
  return state.maybeWhen(
    data: (isOnline) => isOnline,
    orElse: () => true, // Assume online by default
  );
});
