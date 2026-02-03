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

// ==========================================================================
// PASSBACK SETTINGS & QUEUE PROVIDERS
// ==========================================================================

/// State for passback settings
class PassbackSettingsState {
  const PassbackSettingsState({
    this.settings = const PassbackSettings(),
    this.isLoading = false,
    this.isSaving = false,
    this.error,
  });

  final PassbackSettings settings;
  final bool isLoading;
  final bool isSaving;
  final String? error;

  PassbackSettingsState copyWith({
    PassbackSettings? settings,
    bool? isLoading,
    bool? isSaving,
    String? error,
  }) {
    return PassbackSettingsState(
      settings: settings ?? this.settings,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: error,
    );
  }
}

/// Notifier for passback settings
class PassbackSettingsNotifier extends StateNotifier<PassbackSettingsState> {
  PassbackSettingsNotifier(this._repository) : super(const PassbackSettingsState());

  final LmsRepository _repository;

  /// Load passback settings
  Future<void> loadSettings() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final settings = await _repository.getPassbackSettings();
      state = state.copyWith(
        settings: settings,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Update passback settings
  Future<bool> updateSettings(PassbackSettings settings) async {
    state = state.copyWith(isSaving: true, error: null);

    try {
      final updatedSettings = await _repository.updatePassbackSettings(settings);
      state = state.copyWith(
        settings: updatedSettings,
        isSaving: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: e.toString(),
      );
      return false;
    }
  }

  /// Toggle auto-sync
  Future<bool> toggleAutoSync() async {
    return updateSettings(
      state.settings.copyWith(autoSyncEnabled: !state.settings.autoSyncEnabled),
    );
  }

  /// Toggle sync on grade submit
  Future<bool> toggleSyncOnGradeSubmit() async {
    return updateSettings(
      state.settings.copyWith(syncOnGradeSubmit: !state.settings.syncOnGradeSubmit),
    );
  }

  /// Toggle require confirmation
  Future<bool> toggleRequireConfirmation() async {
    return updateSettings(
      state.settings.copyWith(requireConfirmation: !state.settings.requireConfirmation),
    );
  }

  /// Set retry policy
  Future<bool> setRetryPolicy(PassbackRetryPolicy policy) async {
    return updateSettings(
      state.settings.copyWith(retryPolicy: policy),
    );
  }

  /// Clear error
  void clearError() {
    state = state.copyWith(error: null);
  }
}

/// Provider for passback settings
final passbackSettingsProvider =
    StateNotifierProvider<PassbackSettingsNotifier, PassbackSettingsState>((ref) {
  final repository = ref.watch(lmsRepositoryProvider);
  final notifier = PassbackSettingsNotifier(repository);
  notifier.loadSettings();
  return notifier;
});

/// State for passback queue
class PassbackQueueState {
  const PassbackQueueState({
    this.items = const [],
    this.isLoading = false,
    this.isProcessing = false,
    this.error,
    this.lastProcessResult,
  });

  final List<GradePassbackQueueItem> items;
  final bool isLoading;
  final bool isProcessing;
  final String? error;
  final GradePassbackResult? lastProcessResult;

  /// Number of pending items
  int get pendingCount =>
      items.where((i) => i.status == GradeSyncStatus.pending).length;

  /// Number of failed items
  int get failedCount =>
      items.where((i) => i.status == GradeSyncStatus.failed).length;

  /// Number of synced items
  int get syncedCount =>
      items.where((i) => i.status == GradeSyncStatus.synced).length;

  /// Whether there are items to process
  bool get hasItemsToProcess => pendingCount > 0 || failedCount > 0;

  PassbackQueueState copyWith({
    List<GradePassbackQueueItem>? items,
    bool? isLoading,
    bool? isProcessing,
    String? error,
    GradePassbackResult? lastProcessResult,
  }) {
    return PassbackQueueState(
      items: items ?? this.items,
      isLoading: isLoading ?? this.isLoading,
      isProcessing: isProcessing ?? this.isProcessing,
      error: error,
      lastProcessResult: lastProcessResult ?? this.lastProcessResult,
    );
  }
}

/// Notifier for passback queue
class PassbackQueueNotifier extends StateNotifier<PassbackQueueState> {
  PassbackQueueNotifier(this._repository) : super(const PassbackQueueState());

  final LmsRepository _repository;

  /// Load queue items
  Future<void> loadQueue() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final items = await _repository.getPassbackQueue();
      state = state.copyWith(
        items: items,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Process all pending items in the queue
  Future<GradePassbackResult?> processQueue() async {
    if (!state.hasItemsToProcess) return null;

    state = state.copyWith(isProcessing: true, error: null);

    try {
      final result = await _repository.processPassbackQueue();

      // Reload queue to get updated statuses
      await loadQueue();

      state = state.copyWith(
        isProcessing: false,
        lastProcessResult: result,
      );

      return result;
    } catch (e) {
      state = state.copyWith(
        isProcessing: false,
        error: e.toString(),
      );
      return null;
    }
  }

  /// Retry failed passbacks from server
  Future<GradePassbackResult?> retryFailed({String? courseId}) async {
    state = state.copyWith(isProcessing: true, error: null);

    try {
      final result = await _repository.retryFailedPassbacks(courseId: courseId);

      // Reload to get updated statuses
      await loadQueue();

      state = state.copyWith(
        isProcessing: false,
        lastProcessResult: result,
      );

      return result;
    } catch (e) {
      state = state.copyWith(
        isProcessing: false,
        error: e.toString(),
      );
      return null;
    }
  }

  /// Add a grade to the queue
  Future<void> queueGrade({
    required String gradeId,
    required String studentId,
    required String studentName,
    required String assignmentId,
    required String assignmentTitle,
    required double score,
    required double maxPoints,
  }) async {
    await _repository.queueGradeForPassback(
      gradeId: gradeId,
      studentId: studentId,
      studentName: studentName,
      assignmentId: assignmentId,
      assignmentTitle: assignmentTitle,
      score: score,
      maxPoints: maxPoints,
    );

    await loadQueue();
  }

  /// Refresh queue
  Future<void> refresh() async {
    await loadQueue();
  }

  /// Clear error
  void clearError() {
    state = state.copyWith(error: null);
  }
}

/// Provider for passback queue
final passbackQueueProvider =
    StateNotifierProvider<PassbackQueueNotifier, PassbackQueueState>((ref) {
  final repository = ref.watch(lmsRepositoryProvider);
  return PassbackQueueNotifier(repository);
});

/// Computed provider for total queue count (pending + failed)
final passbackQueueCountProvider = Provider<int>((ref) {
  final queueState = ref.watch(passbackQueueProvider);
  return queueState.pendingCount + queueState.failedCount;
});

/// Computed provider for whether sync is needed
final needsGradeSyncProvider = Provider<bool>((ref) {
  final gradeState = ref.watch(gradePassbackProvider);
  final queueState = ref.watch(passbackQueueProvider);
  return gradeState.hasGradesToSync || queueState.hasItemsToProcess;
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

// ==========================================================================
// STUDENT ROSTER & MAPPING PROVIDERS
// ==========================================================================

/// State for course student roster with mappings
class CourseStudentsState {
  const CourseStudentsState({
    this.students = const [],
    this.isLoading = false,
    this.isAutoMapping = false,
    this.error,
    this.lastUpdated,
  });

  final List<GoogleClassroomStudent> students;
  final bool isLoading;
  final bool isAutoMapping;
  final String? error;
  final DateTime? lastUpdated;

  /// Students that are already mapped to AIVO
  List<GoogleClassroomStudent> get mappedStudents =>
      students.where((s) => s.isMapped).toList();

  /// Students that need to be mapped
  List<GoogleClassroomStudent> get unmappedStudents =>
      students.where((s) => !s.isMapped).toList();

  /// Count of mapped students
  int get mappedCount => mappedStudents.length;

  /// Count of unmapped students
  int get unmappedCount => unmappedStudents.length;

  /// Percentage of students mapped
  double get mappingProgress =>
      students.isEmpty ? 0 : mappedCount / students.length;

  CourseStudentsState copyWith({
    List<GoogleClassroomStudent>? students,
    bool? isLoading,
    bool? isAutoMapping,
    String? error,
    DateTime? lastUpdated,
  }) {
    return CourseStudentsState(
      students: students ?? this.students,
      isLoading: isLoading ?? this.isLoading,
      isAutoMapping: isAutoMapping ?? this.isAutoMapping,
      error: error,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

/// Notifier for course students and mappings
class CourseStudentsNotifier extends StateNotifier<CourseStudentsState> {
  CourseStudentsNotifier(this._repository, this.courseId)
      : super(const CourseStudentsState());

  final LmsRepository _repository;
  final String courseId;

  /// Load students for this course
  Future<void> loadStudents() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final students = await _repository.getCourseStudents(courseId);
      state = state.copyWith(
        students: students,
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

  /// Map a Google Classroom student to an AIVO student
  Future<void> mapStudent({
    required String googleUserId,
    required String aivoStudentId,
  }) async {
    try {
      await _repository.mapStudentToAivo(
        googleUserId: googleUserId,
        aivoStudentId: aivoStudentId,
        courseId: courseId,
      );
      await loadStudents();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  /// Remove a student mapping
  Future<void> unmapStudent(String mappingId) async {
    try {
      await _repository.unmapStudent(mappingId, courseId: courseId);
      await loadStudents();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  /// Auto-map students by email
  Future<List<StudentMapping>> autoMapStudents() async {
    state = state.copyWith(isAutoMapping: true, error: null);

    try {
      final mappings = await _repository.autoMapStudents(courseId);
      await loadStudents();
      state = state.copyWith(isAutoMapping: false);
      return mappings;
    } catch (e) {
      state = state.copyWith(
        isAutoMapping: false,
        error: e.toString(),
      );
      rethrow;
    }
  }

  /// Refresh students
  Future<void> refresh() => loadStudents();

  /// Clear error
  void clearError() {
    state = state.copyWith(error: null);
  }
}

/// Family provider for course students - one per course
final courseStudentsProvider = StateNotifierProvider.family
    .autoDispose<CourseStudentsNotifier, CourseStudentsState, String>(
  (ref, courseId) {
    final repository = ref.watch(lmsRepositoryProvider);
    final notifier = CourseStudentsNotifier(repository, courseId);
    notifier.loadStudents();
    return notifier;
  },
);

/// Provider for AIVO students available for mapping
final aivoStudentsForMappingProvider = FutureProvider.family
    .autoDispose<List<Map<String, dynamic>>, ({String classId, String? search})>(
  (ref, params) async {
    final repository = ref.watch(lmsRepositoryProvider);
    return repository.getAivoStudentsForMapping(
      params.classId,
      searchQuery: params.search,
    );
  },
);

/// Computed provider for total unmapped students across all linked courses
final totalUnmappedStudentsProvider = Provider<int>((ref) {
  final connectionState = ref.watch(lmsConnectionProvider);
  var total = 0;
  
  for (final mapping in connectionState.mappings) {
    try {
      final courseState = ref.watch(courseStudentsProvider(mapping.googleCourseId));
      total += courseState.unmappedCount;
    } catch (_) {
      // Course students not loaded yet
    }
  }
  
  return total;
});

/// Computed provider for sync progress indicator
final syncProgressProvider = Provider<DetailedSyncStatus?>((ref) {
  final syncState = ref.watch(syncOperationProvider);
  if (!syncState.isSyncing) return null;
  
  // Return a basic status while syncing
  return DetailedSyncStatus(
    courseId: '',
    phase: SyncPhase.processingChanges,
    progress: 0.5,
    message: 'Syncing courses...',
  );
});
