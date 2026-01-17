/// Riverpod providers for LMS/Google Classroom integration
/// Manages connection state, courses, sync, and grade passback
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/lms_integration.dart';
import '../repositories/lms_repository.dart';
import 'core_providers.dart';

// ==========================================================================
// STATE CLASSES
// ==========================================================================

/// State for Google Classroom connection
class LmsConnectionState {
  const LmsConnectionState({
    this.status,
    this.courses = const [],
    this.mappings = const [],
    this.isLoading = false,
    this.isConnecting = false,
    this.error,
    this.lastUpdated,
  });

  final GoogleClassroomConnectionStatus? status;
  final List<ClassroomCourse> courses;
  final List<CourseMapping> mappings;
  final bool isLoading;
  final bool isConnecting;
  final String? error;
  final DateTime? lastUpdated;

  /// Whether connected to Google Classroom
  bool get isConnected => status?.connected ?? false;

  /// Number of linked courses
  int get linkedCourseCount =>
      courses.where((c) => c.isLinked).length;

  /// Active courses only
  List<ClassroomCourse> get activeCourses =>
      courses.where((c) => c.isActive).toList();

  LmsConnectionState copyWith({
    GoogleClassroomConnectionStatus? status,
    List<ClassroomCourse>? courses,
    List<CourseMapping>? mappings,
    bool? isLoading,
    bool? isConnecting,
    String? error,
    DateTime? lastUpdated,
  }) {
    return LmsConnectionState(
      status: status ?? this.status,
      courses: courses ?? this.courses,
      mappings: mappings ?? this.mappings,
      isLoading: isLoading ?? this.isLoading,
      isConnecting: isConnecting ?? this.isConnecting,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

/// State for grade passback
class GradePassbackState {
  const GradePassbackState({
    this.pendingGrades = const [],
    this.isLoading = false,
    this.isSyncing = false,
    this.error,
    this.lastSyncResult,
  });

  final List<PendingGrade> pendingGrades;
  final bool isLoading;
  final bool isSyncing;
  final String? error;
  final GradePassbackResult? lastSyncResult;

  /// Number of grades pending sync
  int get pendingCount =>
      pendingGrades.where((g) => g.syncStatus == GradeSyncStatus.pending).length;

  /// Number of failed grades
  int get failedCount =>
      pendingGrades.where((g) => g.syncStatus == GradeSyncStatus.failed).length;

  /// Whether there are any grades to sync
  bool get hasGradesToSync => pendingCount > 0 || failedCount > 0;

  GradePassbackState copyWith({
    List<PendingGrade>? pendingGrades,
    bool? isLoading,
    bool? isSyncing,
    String? error,
    GradePassbackResult? lastSyncResult,
  }) {
    return GradePassbackState(
      pendingGrades: pendingGrades ?? this.pendingGrades,
      isLoading: isLoading ?? this.isLoading,
      isSyncing: isSyncing ?? this.isSyncing,
      error: error,
      lastSyncResult: lastSyncResult ?? this.lastSyncResult,
    );
  }
}

/// State for sync operations
class SyncOperationState {
  const SyncOperationState({
    this.history = const [],
    this.isSyncing = false,
    this.error,
    this.lastResult,
  });

  final List<SyncHistoryEntry> history;
  final bool isSyncing;
  final String? error;
  final SyncResult? lastResult;

  SyncOperationState copyWith({
    List<SyncHistoryEntry>? history,
    bool? isSyncing,
    String? error,
    SyncResult? lastResult,
  }) {
    return SyncOperationState(
      history: history ?? this.history,
      isSyncing: isSyncing ?? this.isSyncing,
      error: error,
      lastResult: lastResult ?? this.lastResult,
    );
  }
}

// ==========================================================================
// STATE NOTIFIERS
// ==========================================================================

/// Notifier for LMS connection state
class LmsConnectionNotifier extends StateNotifier<LmsConnectionState> {
  LmsConnectionNotifier(this._repository) : super(const LmsConnectionState());

  final LmsRepository _repository;

  /// Load connection status and courses
  Future<void> loadConnectionData() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final results = await Future.wait([
        _repository.getConnectionStatus(),
        _repository.getCourses(),
        _repository.getMappings(),
      ]);

      state = state.copyWith(
        status: results[0] as GoogleClassroomConnectionStatus,
        courses: results[1] as List<ClassroomCourse>,
        mappings: results[2] as List<CourseMapping>,
        isLoading: false,
        lastUpdated: DateTime.now(),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Get OAuth URL and initiate connection
  Future<String> initiateConnection() async {
    state = state.copyWith(isConnecting: true, error: null);

    try {
      final url = await _repository.getConnectUrl();
      return url;
    } catch (e) {
      state = state.copyWith(
        isConnecting: false,
        error: e.toString(),
      );
      rethrow;
    }
  }

  /// Complete connection after OAuth callback
  Future<void> completeConnection() async {
    state = state.copyWith(isConnecting: false);
    await loadConnectionData();
  }

  /// Handle connection error
  void handleConnectionError(String error) {
    state = state.copyWith(
      isConnecting: false,
      error: error,
    );
  }

  /// Disconnect from Google Classroom
  Future<void> disconnect() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _repository.disconnect();
      state = const LmsConnectionState();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Create a course mapping
  Future<void> linkCourse({
    required String googleCourseId,
    required String classId,
    bool autoSync = true,
    bool syncGuardians = false,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _repository.createMapping(
        googleCourseId: googleCourseId,
        classId: classId,
        autoSync: autoSync,
        syncGuardians: syncGuardians,
      );

      // Refresh data
      await loadConnectionData();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Remove a course mapping
  Future<void> unlinkCourse(String mappingId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _repository.deleteMapping(mappingId);
      await loadConnectionData();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Refresh connection data
  Future<void> refresh() async {
    await loadConnectionData();
  }

  /// Clear state
  void clear() {
    state = const LmsConnectionState();
  }
}

/// Notifier for grade passback state
class GradePassbackNotifier extends StateNotifier<GradePassbackState> {
  GradePassbackNotifier(this._repository) : super(const GradePassbackState());

  final LmsRepository _repository;
  String? _currentCourseId;

  /// Load pending grades
  Future<void> loadPendingGrades({String? courseId}) async {
    _currentCourseId = courseId;
    state = state.copyWith(isLoading: true, error: null);

    try {
      final grades = await _repository.getPendingGrades(courseId: courseId);
      state = state.copyWith(
        pendingGrades: grades,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Sync selected grades
  Future<GradePassbackResult?> syncGrades(List<String> gradeIds) async {
    if (gradeIds.isEmpty) return null;

    state = state.copyWith(isSyncing: true, error: null);

    try {
      final result = await _repository.syncGradesBatch(
        courseId: _currentCourseId ?? '',
        gradeIds: gradeIds,
      );

      // Refresh pending grades
      await loadPendingGrades(courseId: _currentCourseId);

      state = state.copyWith(
        isSyncing: false,
        lastSyncResult: result,
      );

      return result;
    } catch (e) {
      state = state.copyWith(
        isSyncing: false,
        error: e.toString(),
      );
      return null;
    }
  }

  /// Sync all pending grades
  Future<GradePassbackResult?> syncAllGrades() async {
    state = state.copyWith(isSyncing: true, error: null);

    try {
      final result = await _repository.autoSyncGrades();

      // Refresh pending grades
      await loadPendingGrades(courseId: _currentCourseId);

      state = state.copyWith(
        isSyncing: false,
        lastSyncResult: result,
      );

      return result;
    } catch (e) {
      state = state.copyWith(
        isSyncing: false,
        error: e.toString(),
      );
      return null;
    }
  }

  /// Refresh pending grades
  Future<void> refresh() async {
    await loadPendingGrades(courseId: _currentCourseId);
  }

  /// Clear state
  void clear() {
    _currentCourseId = null;
    state = const GradePassbackState();
  }
}

/// Notifier for sync operations
class SyncOperationNotifier extends StateNotifier<SyncOperationState> {
  SyncOperationNotifier(this._repository) : super(const SyncOperationState());

  final LmsRepository _repository;

  /// Load sync history
  Future<void> loadHistory({String? courseId}) async {
    try {
      final history = await _repository.getSyncHistory(courseId: courseId);
      state = state.copyWith(history: history);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Sync a single course
  Future<SyncResult?> syncCourse(
    String courseId, {
    bool fullSync = false,
    bool syncGuardians = false,
  }) async {
    state = state.copyWith(isSyncing: true, error: null);

    try {
      final result = await _repository.syncCourse(
        courseId,
        fullSync: fullSync,
        syncGuardians: syncGuardians,
      );

      // Refresh history
      await loadHistory(courseId: courseId);

      state = state.copyWith(
        isSyncing: false,
        lastResult: result,
      );

      return result;
    } catch (e) {
      state = state.copyWith(
        isSyncing: false,
        error: e.toString(),
      );
      return null;
    }
  }

  /// Sync all courses
  Future<List<SyncResult>> syncAllCourses() async {
    state = state.copyWith(isSyncing: true, error: null);

    try {
      final results = await _repository.syncAllCourses();

      // Refresh history
      await loadHistory();

      state = state.copyWith(isSyncing: false);

      return Future.value(results);
    } catch (e) {
      state = state.copyWith(
        isSyncing: false,
        error: e.toString(),
      );
      return [];
    }
  }

  /// Clear state
  void clear() {
    state = const SyncOperationState();
  }
}

// ==========================================================================
// PROVIDERS
// ==========================================================================

/// Provider for the LMS repository
final lmsRepositoryProvider = Provider<LmsRepository>((ref) {
  return LmsRepository(
    api: ref.watch(apiClientProvider),
    db: ref.watch(localDatabaseProvider),
    sync: ref.watch(syncServiceProvider),
    connectivity: ref.watch(connectivityMonitorProvider),
  );
});

/// Provider for LMS connection state
final lmsConnectionProvider =
    StateNotifierProvider<LmsConnectionNotifier, LmsConnectionState>((ref) {
  final repository = ref.watch(lmsRepositoryProvider);
  return LmsConnectionNotifier(repository);
});

/// Provider for grade passback state
final gradePassbackProvider =
    StateNotifierProvider<GradePassbackNotifier, GradePassbackState>((ref) {
  final repository = ref.watch(lmsRepositoryProvider);
  return GradePassbackNotifier(repository);
});

/// Provider for sync operations state
final syncOperationProvider =
    StateNotifierProvider<SyncOperationNotifier, SyncOperationState>((ref) {
  final repository = ref.watch(lmsRepositoryProvider);
  return SyncOperationNotifier(repository);
});

/// Computed provider for whether Google Classroom is connected
final isLmsConnectedProvider = Provider<bool>((ref) {
  final state = ref.watch(lmsConnectionProvider);
  return state.isConnected;
});

/// Computed provider for linked courses count
final linkedCoursesCountProvider = Provider<int>((ref) {
  final state = ref.watch(lmsConnectionProvider);
  return state.linkedCourseCount;
});

/// Computed provider for pending grades count
final pendingGradesCountProvider = Provider<int>((ref) {
  final state = ref.watch(gradePassbackProvider);
  return state.pendingCount;
});

/// Computed provider for whether there are grades to sync
final hasGradesToSyncProvider = Provider<bool>((ref) {
  final state = ref.watch(gradePassbackProvider);
  return state.hasGradesToSync;
});

/// Family provider for loading course assignments
final courseAssignmentsProvider = FutureProvider.family
    .autoDispose<List<AssignmentLink>, String>((ref, courseId) async {
  final repository = ref.watch(lmsRepositoryProvider);
  return repository.getAssignments(courseId: courseId);
});

/// Family provider for loading sync history for a course
final courseSyncHistoryProvider = FutureProvider.family
    .autoDispose<List<SyncHistoryEntry>, String?>((ref, courseId) async {
  final repository = ref.watch(lmsRepositoryProvider);
  return repository.getSyncHistory(courseId: courseId);
});
