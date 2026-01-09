/// Offline Queue - HIGH-006
///
/// Provides a robust offline queue for queueing operations when offline
/// and automatically syncing when connectivity is restored.
///
/// Features:
/// - Queue operations (API calls) while offline
/// - Automatic retry with exponential backoff
/// - Operation ordering and dependencies
/// - Conflict resolution strategies
/// - Progress tracking and notifications
///
/// Usage:
/// ```dart
/// final queue = OfflineQueue.instance;
/// await queue.initialize();
///
/// // Queue an operation when offline
/// await queue.enqueue(QueuedOperation(
///   type: OperationType.createHomeworkResponse,
///   data: {'homeworkId': '123', 'response': 'answer'},
///   priority: OperationPriority.high,
/// ));
///
/// // Operations sync automatically when online
/// // Or manually trigger sync:
/// await queue.processQueue();
/// ```

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'offline_manager.dart';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/// Operation types that can be queued
enum OperationType {
  // Session operations
  createSessionEvent,
  updateSessionProgress,
  completeSession,

  // Homework operations
  createHomeworkResponse,
  updateHomeworkResponse,
  submitHomework,

  // Assessment operations
  submitAssessmentResponse,
  updateAssessmentProgress,

  // Engagement/SEL operations
  submitEmotionCheckIn,
  recordRegulationUsage,

  // Gamification operations
  claimReward,
  updateStreak,
  submitChallenge,

  // Profile operations
  updatePreferences,
  updateSensoryProfile,

  // Generic
  apiCall,
  custom,
}

/// Priority levels for queue processing
enum OperationPriority {
  /// Process first - user-critical operations
  critical,
  /// Process soon - important but not blocking
  high,
  /// Normal processing order
  normal,
  /// Process when idle
  low,
  /// Only process when on wifi
  background,
}

/// Status of a queued operation
enum OperationStatus {
  /// Waiting to be processed
  pending,
  /// Currently being processed
  processing,
  /// Successfully completed
  completed,
  /// Failed but will retry
  retrying,
  /// Failed permanently
  failed,
  /// Cancelled by user or system
  cancelled,
}

/// Strategy for handling conflicts when syncing
enum ConflictStrategy {
  /// Server wins - discard local changes
  serverWins,
  /// Client wins - overwrite server
  clientWins,
  /// Merge changes (if possible)
  merge,
  /// Keep both versions
  duplicate,
  /// Ask user to resolve
  manual,
}

// ══════════════════════════════════════════════════════════════════════════════
// MODELS
// ══════════════════════════════════════════════════════════════════════════════

/// A queued operation waiting to be synced
class QueuedOperation {
  /// Unique identifier for this operation
  final String id;

  /// Type of operation
  final OperationType type;

  /// Custom type name for custom operations
  final String? customType;

  /// HTTP method (GET, POST, PUT, DELETE)
  final String method;

  /// API endpoint path
  final String? endpoint;

  /// Request payload
  final Map<String, dynamic> data;

  /// Additional headers
  final Map<String, String>? headers;

  /// Priority level
  final OperationPriority priority;

  /// Current status
  OperationStatus status;

  /// When the operation was created
  final DateTime createdAt;

  /// When the operation was last attempted
  DateTime? lastAttemptAt;

  /// Number of retry attempts
  int retryCount;

  /// Maximum retry attempts
  final int maxRetries;

  /// Error message if failed
  String? errorMessage;

  /// Response data if completed
  Map<String, dynamic>? response;

  /// ID of operation this depends on (must complete first)
  final String? dependsOn;

  /// Conflict resolution strategy
  final ConflictStrategy conflictStrategy;

  /// Version for optimistic concurrency
  final int? version;

  /// Entity ID for conflict detection
  final String? entityId;

  /// Tags for grouping operations
  final List<String> tags;

  QueuedOperation({
    String? id,
    required this.type,
    this.customType,
    this.method = 'POST',
    this.endpoint,
    required this.data,
    this.headers,
    this.priority = OperationPriority.normal,
    this.status = OperationStatus.pending,
    DateTime? createdAt,
    this.lastAttemptAt,
    this.retryCount = 0,
    this.maxRetries = 3,
    this.errorMessage,
    this.response,
    this.dependsOn,
    this.conflictStrategy = ConflictStrategy.serverWins,
    this.version,
    this.entityId,
    List<String>? tags,
  }) : id = id ?? _generateId(),
       createdAt = createdAt ?? DateTime.now(),
       tags = tags ?? [];

  static String _generateId() {
    return '${DateTime.now().millisecondsSinceEpoch}_${DateTime.now().microsecond}';
  }

  /// Create from JSON
  factory QueuedOperation.fromJson(Map<String, dynamic> json) {
    return QueuedOperation(
      id: json['id'] as String,
      type: OperationType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => OperationType.custom,
      ),
      customType: json['customType'] as String?,
      method: json['method'] as String? ?? 'POST',
      endpoint: json['endpoint'] as String?,
      data: Map<String, dynamic>.from(json['data'] as Map),
      headers: json['headers'] != null
        ? Map<String, String>.from(json['headers'] as Map)
        : null,
      priority: OperationPriority.values.firstWhere(
        (p) => p.name == json['priority'],
        orElse: () => OperationPriority.normal,
      ),
      status: OperationStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => OperationStatus.pending,
      ),
      createdAt: DateTime.parse(json['createdAt'] as String),
      lastAttemptAt: json['lastAttemptAt'] != null
        ? DateTime.parse(json['lastAttemptAt'] as String)
        : null,
      retryCount: json['retryCount'] as int? ?? 0,
      maxRetries: json['maxRetries'] as int? ?? 3,
      errorMessage: json['errorMessage'] as String?,
      response: json['response'] != null
        ? Map<String, dynamic>.from(json['response'] as Map)
        : null,
      dependsOn: json['dependsOn'] as String?,
      conflictStrategy: ConflictStrategy.values.firstWhere(
        (c) => c.name == json['conflictStrategy'],
        orElse: () => ConflictStrategy.serverWins,
      ),
      version: json['version'] as int?,
      entityId: json['entityId'] as String?,
      tags: (json['tags'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'customType': customType,
      'method': method,
      'endpoint': endpoint,
      'data': data,
      'headers': headers,
      'priority': priority.name,
      'status': status.name,
      'createdAt': createdAt.toIso8601String(),
      'lastAttemptAt': lastAttemptAt?.toIso8601String(),
      'retryCount': retryCount,
      'maxRetries': maxRetries,
      'errorMessage': errorMessage,
      'response': response,
      'dependsOn': dependsOn,
      'conflictStrategy': conflictStrategy.name,
      'version': version,
      'entityId': entityId,
      'tags': tags,
    };
  }

  /// Check if operation can be retried
  bool get canRetry => status == OperationStatus.retrying && retryCount < maxRetries;

  /// Check if operation is terminal (won't change)
  bool get isTerminal =>
    status == OperationStatus.completed ||
    status == OperationStatus.failed ||
    status == OperationStatus.cancelled;

  /// Calculate exponential backoff delay
  Duration get retryDelay {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, etc (with jitter)
    final baseDelay = Duration(seconds: 1 << retryCount);
    final jitter = Duration(milliseconds: (baseDelay.inMilliseconds * 0.2 * (0.5 - _random())).round());
    return baseDelay + jitter;
  }

  static double _random() => DateTime.now().microsecond / 1000000;

  @override
  String toString() => 'QueuedOperation($id, $type, $status)';
}

/// Queue statistics
class QueueStats {
  final int pendingCount;
  final int processingCount;
  final int completedCount;
  final int failedCount;
  final int totalCount;
  final DateTime? lastSyncTime;
  final DateTime? nextSyncTime;

  QueueStats({
    required this.pendingCount,
    required this.processingCount,
    required this.completedCount,
    required this.failedCount,
    required this.totalCount,
    this.lastSyncTime,
    this.nextSyncTime,
  });

  factory QueueStats.empty() => QueueStats(
    pendingCount: 0,
    processingCount: 0,
    completedCount: 0,
    failedCount: 0,
    totalCount: 0,
  );

  bool get isEmpty => totalCount == 0;
  bool get hasPending => pendingCount > 0 || processingCount > 0;
  double get completionRate => totalCount > 0 ? completedCount / totalCount : 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// OPERATION HANDLER
// ══════════════════════════════════════════════════════════════════════════════

/// Handler for executing queued operations
abstract class OperationHandler {
  /// Execute the operation and return the result
  Future<Map<String, dynamic>> execute(QueuedOperation operation);

  /// Check if this handler can process the operation type
  bool canHandle(OperationType type);
}

/// Default HTTP-based operation handler
class HttpOperationHandler implements OperationHandler {
  final Future<Map<String, dynamic>> Function(
    String method,
    String endpoint,
    Map<String, dynamic> data,
    Map<String, String>? headers,
  ) httpClient;

  HttpOperationHandler(this.httpClient);

  @override
  bool canHandle(OperationType type) => true;

  @override
  Future<Map<String, dynamic>> execute(QueuedOperation operation) async {
    if (operation.endpoint == null) {
      throw ArgumentError('HTTP operation requires an endpoint');
    }

    return httpClient(
      operation.method,
      operation.endpoint!,
      operation.data,
      operation.headers,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// OFFLINE QUEUE
// ══════════════════════════════════════════════════════════════════════════════

/// Main offline queue manager
class OfflineQueue extends ChangeNotifier {
  static OfflineQueue? _instance;
  static OfflineQueue get instance => _instance ??= OfflineQueue._();

  OfflineQueue._();

  /// Create with custom dependencies for testing
  factory OfflineQueue.withDependencies({
    required OfflineManager offlineManager,
    required OperationHandler defaultHandler,
  }) {
    final queue = OfflineQueue._();
    queue._offlineManager = offlineManager;
    queue._defaultHandler = defaultHandler;
    return queue;
  }

  // Dependencies
  OfflineManager? _offlineManager;
  OperationHandler? _defaultHandler;
  final Map<OperationType, OperationHandler> _handlers = {};

  // State
  final List<QueuedOperation> _operations = [];
  bool _initialized = false;
  bool _processing = false;
  Timer? _retryTimer;
  DateTime? _lastSyncTime;
  StreamSubscription? _connectivitySubscription;

  // Storage
  File? _queueFile;

  // Stream controllers
  final _operationController = StreamController<QueuedOperation>.broadcast();
  final _statsController = StreamController<QueueStats>.broadcast();

  // Getters
  bool get initialized => _initialized;
  bool get isProcessing => _processing;
  DateTime? get lastSyncTime => _lastSyncTime;
  int get pendingCount => _operations.where((o) => o.status == OperationStatus.pending).length;
  int get totalCount => _operations.length;

  /// Stream of operation updates
  Stream<QueuedOperation> get operationStream => _operationController.stream;

  /// Stream of queue stats updates
  Stream<QueueStats> get statsStream => _statsController.stream;

  /// All pending operations
  List<QueuedOperation> get pendingOperations =>
    _operations.where((o) => !o.isTerminal).toList();

  /// Initialize the queue
  Future<void> initialize() async {
    if (_initialized) return;

    try {
      // Get storage directory
      final appDir = await getApplicationDocumentsDirectory();
      _queueFile = File('${appDir.path}/offline_queue.json');

      // Load persisted operations
      await _loadQueue();

      // Get offline manager
      _offlineManager ??= OfflineManager.instance;
      await _offlineManager!.ensureInitialized();

      // Listen for connectivity changes
      _connectivitySubscription = _offlineManager!.connectionStream.listen((status) {
        if (status == ConnectionStatus.online) {
          processQueue();
        }
      });

      _initialized = true;
      notifyListeners();

      // Process any pending operations if online
      if (_offlineManager!.isOnline) {
        processQueue();
      }
    } catch (e) {
      debugPrint('OfflineQueue initialization failed: $e');
      rethrow;
    }
  }

  /// Register a custom operation handler
  void registerHandler(OperationType type, OperationHandler handler) {
    _handlers[type] = handler;
  }

  /// Set the default operation handler
  void setDefaultHandler(OperationHandler handler) {
    _defaultHandler = handler;
  }

  /// Enqueue an operation
  Future<QueuedOperation> enqueue(QueuedOperation operation) async {
    _ensureInitialized();

    // Add to queue
    _operations.add(operation);

    // Persist
    await _saveQueue();

    // Notify listeners
    _operationController.add(operation);
    _emitStats();
    notifyListeners();

    // Try to process immediately if online
    if (_offlineManager!.isOnline && !_processing) {
      processQueue();
    }

    debugPrint('OfflineQueue: Enqueued ${operation.type} (${operation.id})');
    return operation;
  }

  /// Enqueue multiple operations
  Future<List<QueuedOperation>> enqueueAll(List<QueuedOperation> operations) async {
    for (final op in operations) {
      await enqueue(op);
    }
    return operations;
  }

  /// Process the queue
  Future<void> processQueue() async {
    if (!_initialized) return;
    if (_processing) return;
    if (!_offlineManager!.isOnline) return;

    _processing = true;
    notifyListeners();

    try {
      // Sort by priority and creation time
      final pending = _operations
        .where((o) => o.status == OperationStatus.pending || o.status == OperationStatus.retrying)
        .toList()
        ..sort((a, b) {
          final priorityCompare = a.priority.index.compareTo(b.priority.index);
          if (priorityCompare != 0) return priorityCompare;
          return a.createdAt.compareTo(b.createdAt);
        });

      for (final operation in pending) {
        // Check connectivity before each operation
        if (!_offlineManager!.isOnline) break;

        // Check dependencies
        if (operation.dependsOn != null) {
          final dependency = _operations.firstWhere(
            (o) => o.id == operation.dependsOn,
            orElse: () => operation, // Self-reference means no dependency found
          );
          if (dependency.id != operation.id && !dependency.isTerminal) {
            continue; // Skip until dependency is resolved
          }
          if (dependency.status == OperationStatus.failed) {
            operation.status = OperationStatus.failed;
            operation.errorMessage = 'Dependency failed: ${operation.dependsOn}';
            continue;
          }
        }

        await _processOperation(operation);
      }

      _lastSyncTime = DateTime.now();
      await _saveQueue();
      _emitStats();

    } finally {
      _processing = false;
      notifyListeners();
    }

    // Schedule retry for failed operations
    _scheduleRetry();
  }

  /// Process a single operation
  Future<void> _processOperation(QueuedOperation operation) async {
    operation.status = OperationStatus.processing;
    operation.lastAttemptAt = DateTime.now();
    _operationController.add(operation);
    notifyListeners();

    try {
      // Get handler
      final handler = _handlers[operation.type] ?? _defaultHandler;
      if (handler == null) {
        throw StateError('No handler registered for ${operation.type}');
      }

      // Execute
      final result = await handler.execute(operation);

      // Success
      operation.status = OperationStatus.completed;
      operation.response = result;
      operation.errorMessage = null;

      debugPrint('OfflineQueue: Completed ${operation.type} (${operation.id})');

    } catch (e) {
      operation.retryCount++;

      if (operation.canRetry) {
        operation.status = OperationStatus.retrying;
        operation.errorMessage = e.toString();
        debugPrint('OfflineQueue: Retrying ${operation.type} (${operation.id}) - attempt ${operation.retryCount}');
      } else {
        operation.status = OperationStatus.failed;
        operation.errorMessage = e.toString();
        debugPrint('OfflineQueue: Failed ${operation.type} (${operation.id}): $e');
      }
    }

    _operationController.add(operation);
    notifyListeners();
  }

  /// Schedule retry for operations that need it
  void _scheduleRetry() {
    _retryTimer?.cancel();

    final needsRetry = _operations
      .where((o) => o.status == OperationStatus.retrying)
      .toList();

    if (needsRetry.isEmpty) return;

    // Find shortest delay
    final minDelay = needsRetry
      .map((o) => o.retryDelay)
      .reduce((a, b) => a < b ? a : b);

    _retryTimer = Timer(minDelay, () {
      if (_offlineManager!.isOnline) {
        processQueue();
      }
    });
  }

  /// Cancel an operation
  Future<bool> cancel(String operationId) async {
    _ensureInitialized();

    final operation = _operations.firstWhere(
      (o) => o.id == operationId,
      orElse: () => throw ArgumentError('Operation not found: $operationId'),
    );

    if (operation.isTerminal) {
      return false;
    }

    operation.status = OperationStatus.cancelled;
    _operationController.add(operation);

    await _saveQueue();
    _emitStats();
    notifyListeners();

    return true;
  }

  /// Retry a failed operation
  Future<bool> retry(String operationId) async {
    _ensureInitialized();

    final operation = _operations.firstWhere(
      (o) => o.id == operationId,
      orElse: () => throw ArgumentError('Operation not found: $operationId'),
    );

    if (operation.status != OperationStatus.failed) {
      return false;
    }

    operation.status = OperationStatus.pending;
    operation.retryCount = 0;
    operation.errorMessage = null;
    _operationController.add(operation);

    await _saveQueue();
    notifyListeners();

    if (_offlineManager!.isOnline) {
      processQueue();
    }

    return true;
  }

  /// Remove completed operations older than a duration
  Future<int> cleanup({Duration olderThan = const Duration(days: 7)}) async {
    _ensureInitialized();

    final cutoff = DateTime.now().subtract(olderThan);
    final toRemove = _operations
      .where((o) => o.isTerminal && o.createdAt.isBefore(cutoff))
      .toList();

    for (final op in toRemove) {
      _operations.remove(op);
    }

    await _saveQueue();
    _emitStats();
    notifyListeners();

    return toRemove.length;
  }

  /// Get operations by type
  List<QueuedOperation> getByType(OperationType type) {
    return _operations.where((o) => o.type == type).toList();
  }

  /// Get operations by tag
  List<QueuedOperation> getByTag(String tag) {
    return _operations.where((o) => o.tags.contains(tag)).toList();
  }

  /// Get operations by entity ID
  List<QueuedOperation> getByEntityId(String entityId) {
    return _operations.where((o) => o.entityId == entityId).toList();
  }

  /// Get current queue statistics
  QueueStats getStats() {
    final pending = _operations.where((o) => o.status == OperationStatus.pending).length;
    final processing = _operations.where((o) => o.status == OperationStatus.processing).length;
    final completed = _operations.where((o) => o.status == OperationStatus.completed).length;
    final failed = _operations.where((o) => o.status == OperationStatus.failed).length;

    return QueueStats(
      pendingCount: pending,
      processingCount: processing,
      completedCount: completed,
      failedCount: failed,
      totalCount: _operations.length,
      lastSyncTime: _lastSyncTime,
    );
  }

  /// Clear all operations
  Future<void> clear() async {
    _ensureInitialized();
    _operations.clear();
    await _saveQueue();
    _emitStats();
    notifyListeners();
  }

  // === Private Methods ===

  void _ensureInitialized() {
    if (!_initialized) {
      throw StateError('OfflineQueue not initialized. Call initialize() first.');
    }
  }

  Future<void> _loadQueue() async {
    if (_queueFile == null) return;

    try {
      if (await _queueFile!.exists()) {
        final content = await _queueFile!.readAsString();
        final data = jsonDecode(content) as Map<String, dynamic>;

        _lastSyncTime = data['lastSyncTime'] != null
          ? DateTime.parse(data['lastSyncTime'] as String)
          : null;

        final operations = (data['operations'] as List<dynamic>?)
          ?.map((o) => QueuedOperation.fromJson(Map<String, dynamic>.from(o)))
          .toList() ?? [];

        _operations.clear();
        _operations.addAll(operations);

        debugPrint('OfflineQueue: Loaded ${_operations.length} operations');
      }
    } catch (e) {
      debugPrint('OfflineQueue: Failed to load queue: $e');
    }
  }

  Future<void> _saveQueue() async {
    if (_queueFile == null) return;

    try {
      final data = {
        'lastSyncTime': _lastSyncTime?.toIso8601String(),
        'operations': _operations.map((o) => o.toJson()).toList(),
      };
      await _queueFile!.writeAsString(jsonEncode(data));
    } catch (e) {
      debugPrint('OfflineQueue: Failed to save queue: $e');
    }
  }

  void _emitStats() {
    _statsController.add(getStats());
  }

  @override
  void dispose() {
    _retryTimer?.cancel();
    _connectivitySubscription?.cancel();
    _operationController.close();
    _statsController.close();
    super.dispose();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/// Quick helper to enqueue a homework response
Future<QueuedOperation> queueHomeworkResponse({
  required String homeworkId,
  required Map<String, dynamic> response,
  OperationPriority priority = OperationPriority.high,
}) {
  return OfflineQueue.instance.enqueue(QueuedOperation(
    type: OperationType.createHomeworkResponse,
    endpoint: '/api/homework/$homeworkId/response',
    data: response,
    priority: priority,
    entityId: homeworkId,
    tags: ['homework'],
  ));
}

/// Quick helper to enqueue an assessment response
Future<QueuedOperation> queueAssessmentResponse({
  required String assessmentId,
  required String questionId,
  required Map<String, dynamic> response,
}) {
  return OfflineQueue.instance.enqueue(QueuedOperation(
    type: OperationType.submitAssessmentResponse,
    endpoint: '/api/assessments/$assessmentId/questions/$questionId/response',
    data: response,
    priority: OperationPriority.high,
    entityId: assessmentId,
    tags: ['assessment'],
  ));
}

/// Quick helper to enqueue an emotion check-in
Future<QueuedOperation> queueEmotionCheckIn({
  required String learnerId,
  required String emotion,
  required int intensity,
  String? note,
}) {
  return OfflineQueue.instance.enqueue(QueuedOperation(
    type: OperationType.submitEmotionCheckIn,
    endpoint: '/api/learners/$learnerId/emotions',
    data: {
      'emotion': emotion,
      'intensity': intensity,
      'note': note,
      'timestamp': DateTime.now().toIso8601String(),
    },
    priority: OperationPriority.normal,
    tags: ['sel', 'emotion'],
  ));
}

/// Quick helper to record regulation activity usage
Future<QueuedOperation> queueRegulationUsage({
  required String learnerId,
  required String activityId,
  required int durationSeconds,
  required bool completed,
}) {
  return OfflineQueue.instance.enqueue(QueuedOperation(
    type: OperationType.recordRegulationUsage,
    endpoint: '/api/learners/$learnerId/regulation/usage',
    data: {
      'activityId': activityId,
      'durationSeconds': durationSeconds,
      'completed': completed,
      'timestamp': DateTime.now().toIso8601String(),
    },
    priority: OperationPriority.low,
    tags: ['regulation'],
  ));
}
