/// Offline Manager - ND-3.2
///
/// Manages connectivity status and coordinates offline content synchronization.
/// Ensures regulation activities are always available regardless of network state.
/// Integrates with flutter-common's ConnectivityService for consistency.

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_common/offline/offline.dart' as common;
import 'offline_storage.dart';

/// Connection status enum
enum ConnectionStatus {
  online,
  offline,
  limited, // Connected but slow/unreliable
}

/// Manages offline state and content synchronization
class OfflineManager extends ChangeNotifier {
  static OfflineManager? _instance;
  static OfflineManager get instance => _instance ??= OfflineManager._();

  OfflineManager._() {
    _initialize();
  }

  /// Create with injected dependencies for testing
  factory OfflineManager.withService(common.ConnectivityService connectivityService) {
    final manager = OfflineManager._();
    manager._connectivityService = connectivityService;
    return manager;
  }

  common.ConnectivityService? _connectivityService;
  StreamSubscription<common.ConnectionState>? _connectivitySubscription;

  ConnectionStatus _status = ConnectionStatus.online;
  DateTime? _lastOnline;
  bool _syncInProgress = false;
  bool _initialized = false;
  OfflineSyncStatus _syncStatus = OfflineSyncStatus.initial();

  final OfflineStorage _storage = OfflineStorage();
  
  // Stream controllers for reactive updates
  final _connectionController = StreamController<ConnectionStatus>.broadcast();
  final _syncStatusController = StreamController<OfflineSyncStatus>.broadcast();

  ConnectionStatus get status => _status;
  ConnectionStatus get connectionStatus => _status;
  bool get isOffline => _status == ConnectionStatus.offline;
  bool get isOnline => _status == ConnectionStatus.online;
  DateTime? get lastOnline => _lastOnline;
  bool get syncInProgress => _syncInProgress;
  bool get initialized => _initialized;
  OfflineSyncStatus get syncStatus => _syncStatus;
  
  /// Stream of connection status changes
  Stream<ConnectionStatus> get connectionStream => _connectionController.stream;
  
  /// Stream of sync status changes
  Stream<OfflineSyncStatus> get syncStatusStream => _syncStatusController.stream;

  Future<void> _initialize() async {
    if (_initialized) return;

    try {
      // Initialize storage
      await _storage.initialize();

      // Get or create connectivity service
      _connectivityService ??= common.ConnectivityService();
      
      // Get initial state
      _updateStatus(_connectivityService!.currentState);

      // Listen for changes
      _connectivitySubscription = _connectivityService!.stateStream.listen(_updateStatus);

      _initialized = true;
      notifyListeners();

      // Initial sync if online
      if (isOnline) {
        await syncOfflineContent();
      }
    } catch (e) {
      debugPrint('OfflineManager initialization failed: $e');
    }
  }

  /// Ensure initialization is complete
  Future<void> ensureInitialized() async {
    if (_initialized) return;
    await _initialize();
  }

  void _updateStatus(common.ConnectionState state) {
    final previousStatus = _status;
    
    switch (state) {
      case common.ConnectionState.online:
        _status = ConnectionStatus.online;
        _lastOnline = DateTime.now();
        break;
      case common.ConnectionState.offline:
        _status = ConnectionStatus.offline;
        break;
      case common.ConnectionState.unknown:
        _status = ConnectionStatus.limited;
        break;
    }

    if (previousStatus != _status) {
      _connectionController.add(_status);
      notifyListeners();

      // Trigger sync when coming back online
      if (_status == ConnectionStatus.online && 
          previousStatus == ConnectionStatus.offline) {
        syncOfflineContent();
      }
    }
  }

  /// Sync regulation content for offline use
  Future<void> syncOfflineContent() async {
    if (_syncInProgress) return;
    if (!isOnline) return;

    _syncInProgress = true;
    notifyListeners();

    try {
      // Regulation activities are built-in (cached_activities.dart)
      // so no network sync is needed for basic functionality
      
      // Sync custom activities from server if any
      // await _syncCustomActivities();

      // Sync learner preferences from server
      // await _syncLearnerPreferences();

      // Update last sync time
      await _storage.setLastSyncTime(DateTime.now());
      
      debugPrint('Offline sync completed successfully');
    } catch (e) {
      debugPrint('Offline sync failed: $e');
    } finally {
      _syncInProgress = false;
      notifyListeners();
    }
  }

  /// Force sync even if already synced
  Future<void> forceSyncOfflineContent() async {
    if (_syncInProgress) return;
    
    _syncInProgress = true;
    notifyListeners();

    try {
      // Force sync all content
      await _storage.setLastSyncTime(DateTime.now());
    } catch (e) {
      debugPrint('Force sync failed: $e');
    } finally {
      _syncInProgress = false;
      notifyListeners();
    }
  }

  /// Check if specific content is available offline
  Future<bool> isContentAvailable(String contentId) async {
    return _storage.hasContent(contentId);
  }

  /// Get offline content
  Future<T?> getOfflineContent<T>(String key) async {
    return _storage.get<T>(key);
  }

  /// Store content for offline use
  Future<void> storeForOffline(String key, dynamic content) async {
    await _storage.put(key, content);
  }

  /// Get sync status
  Future<OfflineSyncStatus> getSyncStatus() async {
    return OfflineSyncStatus(
      lastSyncTime: await _storage.getLastSyncTime(),
      regulationActivitiesCount: await _storage.getRegulationActivityCount(),
      audioAssetsCount: await _storage.getAudioAssetCount(),
      imageAssetsCount: await _storage.getImageAssetCount(),
      totalStorageUsed: await _storage.getTotalStorageUsed(),
    );
  }

  /// Clear all offline content
  Future<void> clearOfflineContent() async {
    await _storage.clearAll();
    notifyListeners();
  }

  /// Get storage instance for direct access
  OfflineStorage get storage => _storage;

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    _connectionController.close();
    _syncStatusController.close();
    super.dispose();
  }
}

/// Status of offline content sync
class OfflineSyncStatus {
  final DateTime? lastSyncTime;
  final int regulationActivitiesCount;
  final int audioAssetsCount;
  final int imageAssetsCount;
  final int totalStorageUsed; // bytes
  final bool isSyncing;
  final int pendingCount;
  final int syncedCount;
  final String? lastError;

  OfflineSyncStatus({
    this.lastSyncTime,
    this.regulationActivitiesCount = 0,
    this.audioAssetsCount = 0,
    this.imageAssetsCount = 0,
    this.totalStorageUsed = 0,
    this.isSyncing = false,
    this.pendingCount = 0,
    this.syncedCount = 0,
    this.lastError,
  });

  /// Create initial empty sync status
  factory OfflineSyncStatus.initial() => OfflineSyncStatus(
    isSyncing: false,
    pendingCount: 0,
    syncedCount: 0,
  );

  String get formattedStorageUsed {
    if (totalStorageUsed < 1024) return '$totalStorageUsed B';
    if (totalStorageUsed < 1024 * 1024) {
      return '${(totalStorageUsed / 1024).toStringAsFixed(1)} KB';
    }
    return '${(totalStorageUsed / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String get formattedLastSync {
    if (lastSyncTime == null) return 'Never';
    final now = DateTime.now();
    final diff = now.difference(lastSyncTime!);
    
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} minutes ago';
    if (diff.inHours < 24) return '${diff.inHours} hours ago';
    return '${diff.inDays} days ago';
  }

  bool get isStale {
    if (lastSyncTime == null) return true;
    return DateTime.now().difference(lastSyncTime!).inHours > 24;
  }
}
