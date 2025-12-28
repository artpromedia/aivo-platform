/// Sync Scheduler & Backoff Service
///
/// Manages sync scheduling with exponential backoff, retry logic,
/// and persistent state tracking. Handles transient vs permanent errors
/// and coordinates with background task execution.
library;

import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import 'offline_database.dart';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/// Maximum retry attempts before marking as abandoned
const int _maxRetryAttempts = 10;

/// HTTP status codes considered permanent failures
const Set<int> _permanentFailureStatusCodes = {
  400, // Bad Request
  401, // Unauthorized
  403, // Forbidden
  404, // Not Found (for event/session refs)
  422, // Unprocessable Entity
};

/// HTTP status codes considered transient (will retry)
const Set<int> _transientFailureStatusCodes = {
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
};

// ══════════════════════════════════════════════════════════════════════════════
// SYNC STATE STATUS
// ══════════════════════════════════════════════════════════════════════════════

/// Overall sync state status for UI display.
enum SyncStateStatus {
  /// Not currently syncing, no pending operations.
  idle,

  /// Currently syncing data.
  syncing,

  /// In backoff due to previous failure.
  backoff,

  /// Sync paused (e.g., offline or disabled).
  paused,

  /// Error state requiring attention.
  error,

  /// Unknown state (default fallback).
  unknown,
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC STATE MODELS
// ══════════════════════════════════════════════════════════════════════════════

/// Persistent sync state for the device.
class SyncState {
  const SyncState({
    required this.status,
    required this.consecutiveFailures,
    required this.currentBackoffLevel,
    this.lastSyncAttempt,
    this.lastSuccessfulSync,
    this.nextScheduledSync,
    this.lastError,
  });

  final SyncStateStatus status;
  final int consecutiveFailures;
  final int currentBackoffLevel;
  final DateTime? lastSyncAttempt;
  final DateTime? lastSuccessfulSync;
  final DateTime? nextScheduledSync;
  final String? lastError;

  /// Whether we should attempt sync based on schedule.
  bool get shouldSync {
    if (nextScheduledSync == null) return true;
    return DateTime.now().isAfter(nextScheduledSync!);
  }

  /// Calculate time until next allowed sync.
  Duration get timeUntilNextSync {
    if (nextScheduledSync == null) return Duration.zero;
    final diff = nextScheduledSync!.difference(DateTime.now());
    return diff.isNegative ? Duration.zero : diff;
  }

  /// Create initial state.
  factory SyncState.initial() => const SyncState(
        status: SyncStateStatus.idle,
        consecutiveFailures: 0,
        currentBackoffLevel: 0,
        lastSyncAttempt: null,
        lastSuccessfulSync: null,
        nextScheduledSync: null,
      );

  /// Create from database row.
  factory SyncState.fromJson(Map<String, dynamic> json) => SyncState(
        status: SyncStateStatus.values.firstWhere(
          (e) => e.name == json['status'],
          orElse: () => SyncStateStatus.unknown,
        ),
        consecutiveFailures: json['consecutiveFailures'] as int? ?? 0,
        currentBackoffLevel: json['currentBackoffLevel'] as int? ?? 0,
        lastSyncAttempt: json['lastSyncAttempt'] != null
            ? DateTime.fromMillisecondsSinceEpoch(json['lastSyncAttempt'] as int)
            : null,
        lastSuccessfulSync: json['lastSuccessfulSync'] != null
            ? DateTime.fromMillisecondsSinceEpoch(json['lastSuccessfulSync'] as int)
            : null,
        nextScheduledSync: json['nextScheduledSync'] != null
            ? DateTime.fromMillisecondsSinceEpoch(json['nextScheduledSync'] as int)
            : null,
        lastError: json['lastError'] as String?,
      );

  /// Convert to database row.
  Map<String, dynamic> toJson() => {
        'status': status.name,
        'consecutiveFailures': consecutiveFailures,
        'currentBackoffLevel': currentBackoffLevel,
        'lastSyncAttempt': lastSyncAttempt?.millisecondsSinceEpoch,
        'lastSuccessfulSync': lastSuccessfulSync?.millisecondsSinceEpoch,
        'nextScheduledSync': nextScheduledSync?.millisecondsSinceEpoch,
        'lastError': lastError,
      };

  SyncState copyWith({
    SyncStateStatus? status,
    int? consecutiveFailures,
    int? currentBackoffLevel,
    DateTime? lastSyncAttempt,
    DateTime? lastSuccessfulSync,
    DateTime? nextScheduledSync,
    String? lastError,
    bool clearNextScheduledSync = false,
    bool clearLastError = false,
  }) =>
      SyncState(
        status: status ?? this.status,
        consecutiveFailures: consecutiveFailures ?? this.consecutiveFailures,
        currentBackoffLevel: currentBackoffLevel ?? this.currentBackoffLevel,
        lastSyncAttempt: lastSyncAttempt ?? this.lastSyncAttempt,
        lastSuccessfulSync: lastSuccessfulSync ?? this.lastSuccessfulSync,
        nextScheduledSync:
            clearNextScheduledSync ? null : (nextScheduledSync ?? this.nextScheduledSync),
        lastError: clearLastError ? null : (lastError ?? this.lastError),
      );
}

/// Error category for classification.
enum ErrorCategory {
  /// Network unreachable or connection failed.
  network,

  /// Server returned 5xx error.
  serverError,

  /// Server returned 4xx error (permanent).
  clientError,

  /// Request timed out.
  timeout,

  /// Data validation failed.
  validation,

  /// Conflict (409) - handled specially.
  conflict,

  /// Rate limited (429).
  rateLimited,

  /// Unknown error type.
  unknown,
}

/// Utility class for classifying sync errors.
class ErrorClassification {
  const ErrorClassification._();

  /// Classify an error/exception into a category.
  static ErrorCategory classifyError(Object error) {
    final errorStr = error.toString().toLowerCase();

    // Network errors
    if (errorStr.contains('socketexception') ||
        errorStr.contains('connection refused') ||
        errorStr.contains('network is unreachable') ||
        errorStr.contains('host lookup') ||
        errorStr.contains('no internet')) {
      return ErrorCategory.network;
    }

    // Timeout
    if (errorStr.contains('timeout') || errorStr.contains('timed out')) {
      return ErrorCategory.timeout;
    }

    // HTTP status codes
    final statusMatch = RegExp(r'(\d{3})').firstMatch(errorStr);
    if (statusMatch != null) {
      final statusCode = int.parse(statusMatch.group(1)!);
      return classifyStatusCode(statusCode);
    }

    return ErrorCategory.unknown;
  }

  /// Classify an HTTP status code into a category.
  static ErrorCategory classifyStatusCode(int statusCode) {
    if (statusCode == 409) {
      return ErrorCategory.conflict;
    }

    if (statusCode == 429) {
      return ErrorCategory.rateLimited;
    }

    if (_permanentFailureStatusCodes.contains(statusCode)) {
      return ErrorCategory.clientError;
    }

    if (_transientFailureStatusCodes.contains(statusCode)) {
      return ErrorCategory.serverError;
    }

    return ErrorCategory.unknown;
  }

  /// Check if an error category is transient (should retry).
  static bool isTransient(ErrorCategory category) {
    return switch (category) {
      ErrorCategory.network => true,
      ErrorCategory.serverError => true,
      ErrorCategory.timeout => true,
      ErrorCategory.rateLimited => true,
      ErrorCategory.clientError => false,
      ErrorCategory.validation => false,
      ErrorCategory.conflict => false,
      ErrorCategory.unknown => true, // Treat unknown as transient for safety
    };
  }

  /// Check if an error category represents a conflict.
  static bool isConflict(ErrorCategory category) {
    return category == ErrorCategory.conflict;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ITEM RETRY TRACKER
// ══════════════════════════════════════════════════════════════════════════════

/// Tracks retry state for individual sync items in memory.
class ItemRetryTracker {
  ItemRetryTracker({
    this.maxRetries = 10,
  });

  final int maxRetries;

  final Map<String, int> _retryCounts = {};
  final Map<String, String> _lastErrors = {};

  /// Get the current retry count for an item.
  int getRetryCount(String itemId) => _retryCounts[itemId] ?? 0;

  /// Check if an item can be retried.
  bool canRetry(String itemId) => getRetryCount(itemId) < maxRetries;

  /// Record a failure for an item.
  void recordFailure(String itemId, String error) {
    _retryCounts[itemId] = getRetryCount(itemId) + 1;
    _lastErrors[itemId] = error;
  }

  /// Record a success for an item (clears retry count).
  void recordSuccess(String itemId) {
    _retryCounts.remove(itemId);
    _lastErrors.remove(itemId);
  }

  /// Reset retry count for a single item.
  void resetItem(String itemId) {
    _retryCounts.remove(itemId);
    _lastErrors.remove(itemId);
  }

  /// Get all items that have reached max retries (abandoned).
  List<String> getAbandonedItems() {
    return _retryCounts.entries
        .where((e) => e.value >= maxRetries)
        .map((e) => e.key)
        .toList();
  }

  /// Get the last error for an item.
  String? getLastError(String itemId) => _lastErrors[itemId];

  /// Clear all tracking data.
  void clear() {
    _retryCounts.clear();
    _lastErrors.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC SCHEDULER
// ══════════════════════════════════════════════════════════════════════════════

/// Manages sync scheduling with exponential backoff.
///
/// Key responsibilities:
/// - Track sync state persistently
/// - Calculate next sync time using exponential backoff
/// - Classify errors as transient vs permanent
/// - Coordinate with background task scheduling
class SyncScheduler {
  SyncScheduler({
    required this.database,
    this.onSyncDue,
    List<int>? backoffIntervals,
  }) : backoffIntervals = backoffIntervals ?? defaultBackoffIntervals;

  /// Default backoff intervals in minutes: 1, 5, 15, 60, 360 (6h max)
  static const List<int> defaultBackoffIntervals = [1, 5, 15, 60, 360];

  final OfflineDatabase database;
  final List<int> backoffIntervals;

  /// Callback when sync is due (for background worker).
  final Future<void> Function()? onSyncDue;

  SyncState _state = SyncState.initial();
  Timer? _syncTimer;

  /// Current sync state.
  SyncState get state => _state;

  /// Initialize scheduler and load persisted state.
  Future<void> initialize() async {
    _state = await _loadState();

    // Start timer if sync is scheduled
    _scheduleNextTimer();
  }

  /// Record a successful sync.
  Future<void> recordSuccess() async {
    _state = _state.copyWith(
      status: SyncStateStatus.idle,
      lastSyncAttempt: DateTime.now(),
      lastSuccessfulSync: DateTime.now(),
      consecutiveFailures: 0,
      currentBackoffLevel: 0,
      clearNextScheduledSync: true,
      clearLastError: true,
    );
    await _saveState();
    _scheduleNextTimer();
  }

  /// Record a failed sync and schedule retry.
  Future<void> recordFailure(Object error) async {
    final category = ErrorClassification.classifyError(error);
    final shouldRetry = ErrorClassification.isTransient(category);
    final failures = _state.consecutiveFailures + 1;
    final newBackoffLevel = math.min(
      _state.currentBackoffLevel + 1,
      backoffIntervals.length - 1,
    );

    DateTime? nextSync;
    if (shouldRetry && failures < _maxRetryAttempts) {
      nextSync = _calculateNextSyncTime(newBackoffLevel);
    }

    _state = _state.copyWith(
      status: shouldRetry ? SyncStateStatus.backoff : SyncStateStatus.error,
      lastSyncAttempt: DateTime.now(),
      consecutiveFailures: failures,
      currentBackoffLevel: newBackoffLevel,
      nextScheduledSync: nextSync,
      lastError: error.toString(),
    );
    await _saveState();
    _scheduleNextTimer();
  }

  /// Calculate next sync time with exponential backoff.
  DateTime _calculateNextSyncTime(int backoffLevel) {
    final delayMinutes = backoffIntervals[backoffLevel];
    return DateTime.now().add(Duration(minutes: delayMinutes));
  }

  /// Schedule sync for a specific time.
  Future<void> scheduleSync(DateTime at) async {
    _state = _state.copyWith(nextScheduledSync: at);
    await _saveState();
    _scheduleNextTimer();
  }

  /// Force immediate sync (reset backoff).
  Future<void> forceSync() async {
    _state = _state.copyWith(
      status: SyncStateStatus.idle,
      consecutiveFailures: 0,
      currentBackoffLevel: 0,
      clearNextScheduledSync: true,
    );
    await _saveState();
    onSyncDue?.call();
  }

  /// Get formatted time since last sync.
  String getLastSyncDisplay() {
    if (_state.lastSuccessfulSync == null) {
      return 'Never synced';
    }

    final diff = DateTime.now().difference(_state.lastSuccessfulSync!);

    if (diff.inMinutes < 1) {
      return 'Just now';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else {
      return '${diff.inDays}d ago';
    }
  }

  void _scheduleNextTimer() {
    _syncTimer?.cancel();

    if (_state.nextScheduledSync == null) return;

    final delay = _state.timeUntilNextSync;
    if (delay <= Duration.zero) {
      // Already due
      onSyncDue?.call();
    } else {
      _syncTimer = Timer(delay, () => onSyncDue?.call());
    }
  }

  Future<SyncState> _loadState() async {
    try {
      final json = await database.getSyncStateJson();
      if (json != null) {
        return SyncState.fromJson(json);
      }
    } catch (e) {
      // Ignore parse errors, use default - but log in debug mode
      assert(() {
        debugPrint('[SyncScheduler] Failed to load state: $e');
        return true;
      }());
    }
    return SyncState.initial();
  }

  Future<void> _saveState() async {
    await database.saveSyncStateJson(_state.toJson());
  }

  void dispose() {
    _syncTimer?.cancel();
  }
}
