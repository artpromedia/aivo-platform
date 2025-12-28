/// Offline Initialization for Teacher App
///
/// This module handles initialization of offline services and provides
/// Riverpod provider overrides for the teacher app.
library;

import 'dart:async';

import 'package:flutter/material.dart' hide ConnectionState;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart' 
    hide ConnectionState;
import 'package:flutter_common/offline/connectivity_service.dart' 
    show ConnectionState, ConnectivityService;

import 'offline_api_clients.dart';

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

/// Initializes offline services for the Teacher app.
///
/// Call this before creating the ProviderScope:
/// ```dart
/// void main() async {
///   WidgetsFlutterBinding.ensureInitialized();
///   await initializeOfflineServices();
///   runApp(const ProviderScope(child: TeacherApp()));
/// }
/// ```
Future<void> initializeOfflineServices() async {
  // Pre-initialize the database to ensure tables are created
  OfflineDatabase();

  // Start connectivity monitoring
  final connectivity = ConnectivityService();
  await connectivity.initialize();
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

/// Provider for the offline database.
final offlineDatabaseProvider = Provider<OfflineDatabase>((ref) {
  final db = OfflineDatabase();
  ref.onDispose(() => db.closeDatabase());
  return db;
});

/// Provider for connectivity service.
final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();
  service.initialize();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Provider for connectivity state stream.
final connectivityStateProvider = StreamProvider<ConnectionState>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return service.stateStream;
});

/// Provider factory for creating a configured teacher sync manager.
///
/// Usage:
/// ```dart
/// final syncManager = ref.watch(
///   configuredTeacherSyncManagerProvider(dio),
/// );
/// ```
final configuredTeacherSyncManagerProvider =
    Provider.family<SyncManager, dynamic>((ref, dio) {
  final db = ref.watch(offlineDatabaseProvider);
  final connectivity = ref.watch(connectivityServiceProvider);

  return SyncManager(
    database: db,
    connectivityService: connectivity,
    planApi: TeacherPlanApiClient(dio: dio),
    contentApi: TeacherContentApiClient(dio: dio),
    sessionApi: TeacherSessionApiClient(dio: dio),
    eventApi: TeacherEventApiClient(dio: dio),
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// TEACHER-SPECIFIC SYNC HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/// Extension methods for teacher-specific sync operations.
extension TeacherSyncManagerExtensions on SyncManager {
  /// Preload data for a class/group for today.
  Future<PreloadResult> preloadForClass(String classId) async {
    return preloadForToday(classId);
  }
}

/// Helper class for syncing attendance records.
class AttendanceSyncHelper {
  AttendanceSyncHelper({
    required this.database,
    required this.attendanceApi,
  });

  final OfflineDatabase database;
  final AttendanceApiClient attendanceApi;

  /// Record attendance locally.
  Future<void> recordAttendance({
    required String classId,
    required String learnerId,
    required String date,
    required String status,
    required String recordedBy,
    String? note,
  }) async {
    await database.recordAttendance(OfflineAttendanceRecordsCompanion.insert(
      learnerId: learnerId,
      classId: classId,
      date: date,
      attendanceStatus: status,
      recordedAt: DateTime.now().millisecondsSinceEpoch,
      recordedBy: recordedBy,
    ));
  }

  /// Sync pending attendance records.
  Future<int> syncPendingAttendance() async {
    final pending = await database.getPendingAttendance();
    if (pending.isEmpty) return 0;

    final records = pending
        .map((a) => {
              'learnerId': a.learnerId,
              'classId': a.classId,
              'date': a.date,
              'status': a.attendanceStatus,
              'recordedAt': a.recordedAt,
            })
        .toList();

    await attendanceApi.batchUploadAttendance(records);
    return pending.length;
  }
}

/// Helper class for syncing teacher notes.
class TeacherNotesSyncHelper {
  TeacherNotesSyncHelper({
    required this.database,
    required this.notesApi,
  });

  final OfflineDatabase database;
  final TeacherNotesApiClient notesApi;

  /// Record a note locally.
  Future<void> recordNote({
    required String noteId,
    required String learnerId,
    required String content,
    required String createdBy,
    String? category,
  }) async {
    await database.insertTeacherNote(OfflineTeacherNote(
      localNoteId: noteId,
      serverNoteId: null,
      learnerId: learnerId,
      content: content,
      category: category,
      syncStatus: SyncStatus.pendingSync.name,
      createdAt: DateTime.now().millisecondsSinceEpoch,
      createdBy: createdBy,
    ));
  }

  /// Sync pending notes.
  Future<int> syncPendingNotes() async {
    final pending = await database.getPendingTeacherNotes();
    if (pending.isEmpty) return 0;

    final notes = pending
        .map((n) => {
              'localId': n.localNoteId,
              'learnerId': n.learnerId,
              'content': n.content,
              'category': n.category,
              'createdAt': n.createdAt,
            })
        .toList();

    await notesApi.batchUploadNotes(notes);
    return pending.length;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

/// A banner that shows when the device is offline.
class OfflineStatusBanner extends StatelessWidget {
  const OfflineStatusBanner({
    super.key,
    required this.connectivityState,
  });

  final AsyncValue<ConnectionState> connectivityState;

  @override
  Widget build(BuildContext context) {
    return connectivityState.when(
      data: (state) {
        if (state == ConnectionState.online) {
          return const SizedBox.shrink();
        }

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
          color: Colors.orange.shade100,
          child: SafeArea(
            bottom: false,
            child: Row(
              children: [
                Icon(Icons.cloud_off, color: Colors.orange.shade800, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Offline mode. Attendance and notes will sync when connected.',
                    style: TextStyle(
                      color: Colors.orange.shade900,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}

/// Widget showing pending sync count for teachers.
class PendingSyncIndicator extends ConsumerWidget {
  const PendingSyncIndicator({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final db = ref.watch(offlineDatabaseProvider);

    return FutureBuilder<int>(
      future: _getPendingCount(db),
      builder: (context, snapshot) {
        final count = snapshot.data ?? 0;
        if (count == 0) return const SizedBox.shrink();

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.orange,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.sync, size: 14, color: Colors.white),
              const SizedBox(width: 4),
              Text(
                '$count pending',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<int> _getPendingCount(OfflineDatabase db) async {
    final eventCount = await db.getPendingEventCount();
    final attendance = await db.getPendingAttendance();
    final notes = await db.getPendingTeacherNotes();
    return eventCount + attendance.length + notes.length;
  }
}
