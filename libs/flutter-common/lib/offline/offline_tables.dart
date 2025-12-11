/// Offline database schema using Drift (SQLite).
///
/// This file defines the local data model for offline-first functionality
/// in the Aivo Flutter apps. See docs/mobile/offline_architecture.md for
/// the full architecture documentation.
library;

import 'package:drift/drift.dart';

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

/// Sync status for offline records.
enum SyncStatus {
  /// Record created locally, not yet synced to server.
  pendingSync,

  /// Record successfully synchronized with server.
  synchronized,

  /// Sync attempted but failed (will retry).
  failed,

  /// Sync permanently failed, requires manual intervention.
  abandoned,
}

/// Origin of a session record.
enum SessionOrigin {
  /// Session started while online (plan fetched from server).
  online,

  /// Session started while offline (using cached plan).
  offline,
}

/// Type of learning session.
enum SessionType {
  /// Regular learning activities.
  learning,

  /// Assessment/quiz session.
  assessment,

  /// Homework helper session.
  homework,

  /// Baseline assessment.
  baseline,
}

/// Type of cached content.
enum ContentType {
  lesson,
  exercise,
  video,
  game,
  reading,
  assessment,
}

/// Type of sync operation in the queue.
enum SyncOperationType {
  sessionCreate,
  sessionUpdate,
  sessionEnd,
  eventsBatch,
  attendanceSync,
  noteSync,
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLE: offline_learners
// ══════════════════════════════════════════════════════════════════════════════

/// Cached learner profiles for offline display and session attribution.
///
/// This table stores minimal learner data needed to:
/// - Display learner name/avatar in offline mode
/// - Attribute events to the correct learner
/// - Apply grade-appropriate content filtering
@DataClassName('OfflineLearner')
class OfflineLearners extends Table {
  /// Learner's server ID (primary key).
  TextColumn get learnerId => text()();

  /// Display name for UI.
  TextColumn get displayName => text()();

  /// Grade band: K-2, 3-5, 6-8, 9-12.
  TextColumn get gradeBand => text()();

  /// Cached avatar URL (may be null).
  TextColumn get avatarUrl => text().nullable()();

  /// JSON-encoded accessibility/focus preferences.
  TextColumn get preferencesJson => text().nullable()();

  /// Tenant ID for multi-tenancy.
  TextColumn get tenantId => text()();

  /// Unix timestamp of last successful sync.
  IntColumn get lastSyncedAt => integer()();

  @override
  Set<Column> get primaryKey => {learnerId};
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLE: offline_sessions
// ══════════════════════════════════════════════════════════════════════════════

/// Local session records for both offline-started and online sessions.
///
/// Sessions track the learner's activity period and serve as the parent
/// for all events recorded during that time. They may be created offline
/// and synced later, or created online and used as containers for offline events.
@DataClassName('OfflineSession')
class OfflineSessions extends Table {
  /// UUID generated locally (primary key).
  TextColumn get localSessionId => text()();

  /// Server-assigned session ID after sync (null until synced).
  TextColumn get serverSessionId => text().nullable()();

  /// Foreign key to offline_learners.
  TextColumn get learnerId => text().references(OfflineLearners, #learnerId)();

  /// Domain/subject: MATH, ELA, SCIENCE, etc.
  TextColumn get subject => text()();

  /// Type of session (stored as string for Drift compatibility).
  TextColumn get sessionType => text()();

  /// Sync status (stored as string).
  TextColumn get status => text().withDefault(const Constant('pendingSync'))();

  /// Origin: online or offline (stored as string).
  TextColumn get origin => text()();

  /// Unix timestamp when session started.
  IntColumn get startedAt => integer()();

  /// Unix timestamp when session ended (null if ongoing).
  IntColumn get endedAt => integer().nullable()();

  /// JSON-encoded today plan for this session.
  TextColumn get planJson => text().nullable()();

  /// Error message if sync failed.
  TextColumn get errorMessage => text().nullable()();

  /// Number of sync retry attempts.
  IntColumn get retryCount => integer().withDefault(const Constant(0))();

  /// Unix timestamp of last modification.
  IntColumn get lastUpdatedAt => integer()();

  @override
  Set<Column> get primaryKey => {localSessionId};
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLE: offline_events
// ══════════════════════════════════════════════════════════════════════════════

/// Event queue for all learner interactions awaiting sync.
///
/// Events are the atomic units of learner activity data. They are created
/// during activities (answers, focus signals, completions) and queued
/// for upload when connectivity is available.
@DataClassName('OfflineEvent')
class OfflineEvents extends Table {
  /// Auto-incrementing local event ID.
  IntColumn get id => integer().autoIncrement()();

  /// Foreign key to offline_sessions.
  TextColumn get localSessionId =>
      text().references(OfflineSessions, #localSessionId)();

  /// Event type: LEARNING_EVENT, FOCUS_EVENT, ANSWER_EVENT, etc.
  TextColumn get eventType => text()();

  /// Full JSON payload of the event.
  TextColumn get eventJson => text()();

  /// Sync status (stored as string).
  TextColumn get status => text().withDefault(const Constant('pendingSync'))();

  /// Sequence number for ordering within session.
  IntColumn get sequenceNum => integer()();

  /// Unix timestamp when event was created.
  IntColumn get createdAt => integer()();

  /// Unix timestamp when event was synced (null until synced).
  IntColumn get syncedAt => integer().nullable()();

  /// Error message if sync failed.
  TextColumn get errorMessage => text().nullable()();
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLE: offline_content_cache
// ══════════════════════════════════════════════════════════════════════════════

/// Cached learning content for offline activities.
///
/// Content is pre-fetched during online windows and stored locally so
/// learners can continue activities without network access. Cache is
/// managed with LRU eviction and expiration policies.
@DataClassName('OfflineContent')
class OfflineContentCache extends Table {
  /// Content key: LO_VERSION:{id}:locale:{locale}
  TextColumn get contentKey => text()();

  /// Type of content (stored as string).
  TextColumn get contentType => text()();

  /// Domain/subject for filtering.
  TextColumn get subject => text()();

  /// Target grade band for filtering.
  TextColumn get gradeBand => text()();

  /// Full JSON payload of the content.
  TextColumn get jsonPayload => text()();

  /// JSON array of local media file paths.
  TextColumn get mediaPathsJson => text().nullable()();

  /// Size in bytes for cache management.
  IntColumn get sizeBytes => integer()();

  /// Unix timestamp when cache expires.
  IntColumn get expiresAt => integer()();

  /// Unix timestamp when cached.
  IntColumn get createdAt => integer()();

  /// Unix timestamp of last access (for LRU).
  IntColumn get lastAccessedAt => integer()();

  @override
  Set<Column> get primaryKey => {contentKey};
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLE: offline_sync_queue
// ══════════════════════════════════════════════════════════════════════════════

/// High-level sync queue for batch operations.
///
/// This queue manages sync operations at a higher level than individual
/// events, allowing for prioritization and retry logic.
@DataClassName('OfflineSyncQueueEntry')
class OfflineSyncQueue extends Table {
  /// Auto-incrementing queue entry ID.
  IntColumn get id => integer().autoIncrement()();

  /// Type of operation (stored as string).
  TextColumn get operationType => text()();

  /// JSON payload for the operation.
  TextColumn get payloadJson => text()();

  /// Priority: 1 = highest, 10 = lowest.
  IntColumn get priority => integer().withDefault(const Constant(5))();

  /// Status: PENDING, IN_PROGRESS, DONE, FAILED.
  TextColumn get status => text().withDefault(const Constant('pending'))();

  /// Unix timestamp when entry was created.
  IntColumn get createdAt => integer()();

  /// Unix timestamp of last sync attempt.
  IntColumn get lastAttemptAt => integer().nullable()();

  /// Number of retry attempts.
  IntColumn get retryCount => integer().withDefault(const Constant(0))();

  /// Error message if sync failed.
  TextColumn get errorMessage => text().nullable()();
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLE: offline_attendance (Teacher App)
// ══════════════════════════════════════════════════════════════════════════════

/// Offline attendance records for teacher app.
@DataClassName('OfflineAttendance')
class OfflineAttendanceRecords extends Table {
  /// Auto-incrementing local ID.
  IntColumn get id => integer().autoIncrement()();

  /// Learner being marked.
  TextColumn get learnerId => text()();

  /// Class/section ID.
  TextColumn get classId => text()();

  /// Date (YYYY-MM-DD format).
  TextColumn get date => text()();

  /// Status: PRESENT, ABSENT, TARDY.
  TextColumn get attendanceStatus => text()();

  /// Optional note.
  TextColumn get note => text().nullable()();

  /// Sync status.
  TextColumn get syncStatus =>
      text().withDefault(const Constant('pendingSync'))();

  /// Unix timestamp when recorded.
  IntColumn get recordedAt => integer()();

  /// Teacher ID who recorded.
  TextColumn get recordedBy => text()();
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLE: offline_teacher_notes (Teacher App)
// ══════════════════════════════════════════════════════════════════════════════

/// Offline quick notes for teacher app.
@DataClassName('OfflineTeacherNote')
class OfflineTeacherNotes extends Table {
  /// UUID generated locally.
  TextColumn get localNoteId => text()();

  /// Server ID after sync.
  TextColumn get serverNoteId => text().nullable()();

  /// Learner the note is about.
  TextColumn get learnerId => text()();

  /// Note content.
  TextColumn get content => text()();

  /// Note category/tag.
  TextColumn get category => text().nullable()();

  /// Sync status.
  TextColumn get syncStatus =>
      text().withDefault(const Constant('pendingSync'))();

  /// Unix timestamp when created.
  IntColumn get createdAt => integer()();

  /// Teacher ID who created.
  TextColumn get createdBy => text()();

  @override
  Set<Column> get primaryKey => {localNoteId};
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLE: offline_parent_cache (Parent App)
// ══════════════════════════════════════════════════════════════════════════════

/// Cached summaries for parent app offline viewing.
@DataClassName('OfflineParentCacheEntry')
class OfflineParentCache extends Table {
  /// Cache key: {learnerId}:{dataType}
  TextColumn get cacheKey => text()();

  /// Learner ID.
  TextColumn get learnerId => text()();

  /// Type of cached data: SUMMARY, PROGRESS, MESSAGES.
  TextColumn get dataType => text()();

  /// JSON payload.
  TextColumn get jsonPayload => text()();

  /// Unix timestamp when cached.
  IntColumn get cachedAt => integer()();

  /// Unix timestamp when cache expires.
  IntColumn get expiresAt => integer()();

  @override
  Set<Column> get primaryKey => {cacheKey};
}
