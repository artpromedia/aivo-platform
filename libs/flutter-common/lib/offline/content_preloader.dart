/// Content Preloader Service
///
/// Manages bulk content preloading and delta updates for efficient
/// offline content delivery to devices in school environments.
///
/// Features:
/// - Package manifest download and validation
/// - Content item download with checksum verification
/// - Delta sync for efficient updates (only changed LOs)
/// - Progress tracking and resumable downloads
/// - WiFi-only mode support
/// - Storage quota management
library;

import 'dart:async';
import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;

import 'offline_database.dart';
import 'connectivity_service.dart';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/// Configuration for content preloading.
class PreloadConfiguration {
  final String tenantId;
  final List<String> gradeBands;
  final List<String> subjects;
  final List<String> locales;
  final String syncWindowStart; // "HH:mm" format
  final String syncWindowEnd; // "HH:mm" format
  final int maxStorageBytes;
  final bool wifiOnly;
  final bool autoUpdate;

  const PreloadConfiguration({
    required this.tenantId,
    required this.gradeBands,
    required this.subjects,
    this.locales = const ['en'],
    this.syncWindowStart = '06:00',
    this.syncWindowEnd = '08:00',
    this.maxStorageBytes = 500 * 1024 * 1024, // 500MB default
    this.wifiOnly = true,
    this.autoUpdate = true,
  });

  Map<String, dynamic> toJson() => {
        'tenantId': tenantId,
        'gradeBands': gradeBands,
        'subjects': subjects,
        'locales': locales,
        'syncWindowStart': syncWindowStart,
        'syncWindowEnd': syncWindowEnd,
        'maxStorageBytes': maxStorageBytes,
        'wifiOnly': wifiOnly,
        'autoUpdate': autoUpdate,
      };

  factory PreloadConfiguration.fromJson(Map<String, dynamic> json) {
    return PreloadConfiguration(
      tenantId: json['tenantId'] as String,
      gradeBands: List<String>.from(json['gradeBands'] as List),
      subjects: List<String>.from(json['subjects'] as List),
      locales: List<String>.from(json['locales'] as List? ?? ['en']),
      syncWindowStart: json['syncWindowStart'] as String? ?? '06:00',
      syncWindowEnd: json['syncWindowEnd'] as String? ?? '08:00',
      maxStorageBytes: json['maxStorageBytes'] as int? ?? 500 * 1024 * 1024,
      wifiOnly: json['wifiOnly'] as bool? ?? true,
      autoUpdate: json['autoUpdate'] as bool? ?? true,
    );
  }
}

/// Item in a content package manifest.
class ManifestItem {
  final String loVersionId;
  final String learningObjectId;
  final String contentKey;
  final String checksum;
  final String contentUrl;
  final int sizeBytes;
  final String subject;
  final String gradeBand;
  final int versionNumber;
  final String locale;
  final DateTime publishedAt;
  final DateTime updatedAt;

  ManifestItem({
    required this.loVersionId,
    required this.learningObjectId,
    required this.contentKey,
    required this.checksum,
    required this.contentUrl,
    required this.sizeBytes,
    required this.subject,
    required this.gradeBand,
    required this.versionNumber,
    required this.locale,
    required this.publishedAt,
    required this.updatedAt,
  });

  factory ManifestItem.fromJson(Map<String, dynamic> json) {
    return ManifestItem(
      loVersionId: json['loVersionId'] as String,
      learningObjectId: json['learningObjectId'] as String,
      contentKey: json['contentKey'] as String,
      checksum: json['checksum'] as String,
      contentUrl: json['contentUrl'] as String,
      sizeBytes: json['sizeBytes'] as int,
      subject: json['subject'] as String,
      gradeBand: json['gradeBand'] as String,
      versionNumber: json['versionNumber'] as int,
      locale: json['locale'] as String,
      publishedAt: DateTime.parse(json['publishedAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}

/// Content package manifest.
class ContentPackageManifest {
  final String packageId;
  final String manifestVersion;
  final String tenantId;
  final List<String> gradeBands;
  final List<String> subjects;
  final List<String> locales;
  final DateTime generatedAt;
  final DateTime expiresAt;
  final int totalItems;
  final int totalSizeBytes;
  final List<ManifestItem> items;

  ContentPackageManifest({
    required this.packageId,
    required this.manifestVersion,
    required this.tenantId,
    required this.gradeBands,
    required this.subjects,
    required this.locales,
    required this.generatedAt,
    required this.expiresAt,
    required this.totalItems,
    required this.totalSizeBytes,
    required this.items,
  });

  factory ContentPackageManifest.fromJson(Map<String, dynamic> json) {
    return ContentPackageManifest(
      packageId: json['packageId'] as String,
      manifestVersion: json['manifestVersion'] as String,
      tenantId: json['tenantId'] as String,
      gradeBands: List<String>.from(json['gradeBands'] as List),
      subjects: List<String>.from(json['subjects'] as List),
      locales: List<String>.from(json['locales'] as List),
      generatedAt: DateTime.parse(json['generatedAt'] as String),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      totalItems: json['totalItems'] as int,
      totalSizeBytes: json['totalSizeBytes'] as int,
      items: (json['items'] as List)
          .map((e) => ManifestItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Delta change item.
class DeltaItem {
  final String loVersionId;
  final String learningObjectId;
  final String contentKey;
  final String changeType; // ADDED, UPDATED, REMOVED
  final String? checksum;
  final String? contentUrl;
  final int? sizeBytes;
  final String subject;
  final String gradeBand;
  final int versionNumber;
  final String locale;
  final DateTime changedAt;

  DeltaItem({
    required this.loVersionId,
    required this.learningObjectId,
    required this.contentKey,
    required this.changeType,
    this.checksum,
    this.contentUrl,
    this.sizeBytes,
    required this.subject,
    required this.gradeBand,
    required this.versionNumber,
    required this.locale,
    required this.changedAt,
  });

  factory DeltaItem.fromJson(Map<String, dynamic> json) {
    return DeltaItem(
      loVersionId: json['loVersionId'] as String,
      learningObjectId: json['learningObjectId'] as String,
      contentKey: json['contentKey'] as String,
      changeType: json['changeType'] as String,
      checksum: json['checksum'] as String?,
      contentUrl: json['contentUrl'] as String?,
      sizeBytes: json['sizeBytes'] as int?,
      subject: json['subject'] as String,
      gradeBand: json['gradeBand'] as String,
      versionNumber: json['versionNumber'] as int,
      locale: json['locale'] as String,
      changedAt: DateTime.parse(json['changedAt'] as String),
    );
  }
}

/// Delta update response.
class DeltaUpdateResponse {
  final String tenantId;
  final DateTime sinceTimestamp;
  final DateTime currentTimestamp;
  final bool hasMore;
  final String? nextCursor;
  final int totalChanges;
  final int totalSizeBytes;
  final List<DeltaItem> items;

  DeltaUpdateResponse({
    required this.tenantId,
    required this.sinceTimestamp,
    required this.currentTimestamp,
    required this.hasMore,
    this.nextCursor,
    required this.totalChanges,
    required this.totalSizeBytes,
    required this.items,
  });

  factory DeltaUpdateResponse.fromJson(Map<String, dynamic> json) {
    return DeltaUpdateResponse(
      tenantId: json['tenantId'] as String,
      sinceTimestamp: DateTime.parse(json['sinceTimestamp'] as String),
      currentTimestamp: DateTime.parse(json['currentTimestamp'] as String),
      hasMore: json['hasMore'] as bool,
      nextCursor: json['nextCursor'] as String?,
      totalChanges: json['totalChanges'] as int,
      totalSizeBytes: json['totalSizeBytes'] as int,
      items: (json['items'] as List)
          .map((e) => DeltaItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Sync checkpoint stored locally.
class SyncCheckpoint {
  final String tenantId;
  final List<String> gradeBands;
  final List<String> subjects;
  final List<String> locales;
  final DateTime lastSyncTimestamp;
  final int cachedItemCount;
  final int cachedSizeBytes;

  SyncCheckpoint({
    required this.tenantId,
    required this.gradeBands,
    required this.subjects,
    required this.locales,
    required this.lastSyncTimestamp,
    required this.cachedItemCount,
    required this.cachedSizeBytes,
  });

  Map<String, dynamic> toJson() => {
        'tenantId': tenantId,
        'gradeBands': gradeBands,
        'subjects': subjects,
        'locales': locales,
        'lastSyncTimestamp': lastSyncTimestamp.toIso8601String(),
        'cachedItemCount': cachedItemCount,
        'cachedSizeBytes': cachedSizeBytes,
      };

  factory SyncCheckpoint.fromJson(Map<String, dynamic> json) {
    return SyncCheckpoint(
      tenantId: json['tenantId'] as String,
      gradeBands: List<String>.from(json['gradeBands'] as List),
      subjects: List<String>.from(json['subjects'] as List),
      locales: List<String>.from(json['locales'] as List),
      lastSyncTimestamp: DateTime.parse(json['lastSyncTimestamp'] as String),
      cachedItemCount: json['cachedItemCount'] as int,
      cachedSizeBytes: json['cachedSizeBytes'] as int,
    );
  }
}

/// Progress information during preload operations.
class PreloadProgress {
  final int totalItems;
  final int downloadedItems;
  final int totalBytes;
  final int downloadedBytes;
  final int failedItems;
  final String? currentItem;
  final PreloadState state;
  final String? errorMessage;

  const PreloadProgress({
    this.totalItems = 0,
    this.downloadedItems = 0,
    this.totalBytes = 0,
    this.downloadedBytes = 0,
    this.failedItems = 0,
    this.currentItem,
    this.state = PreloadState.idle,
    this.errorMessage,
  });

  double get progressPercent =>
      totalItems > 0 ? downloadedItems / totalItems : 0.0;

  double get bytesPercent =>
      totalBytes > 0 ? downloadedBytes / totalBytes : 0.0;

  PreloadProgress copyWith({
    int? totalItems,
    int? downloadedItems,
    int? totalBytes,
    int? downloadedBytes,
    int? failedItems,
    String? currentItem,
    PreloadState? state,
    String? errorMessage,
  }) {
    return PreloadProgress(
      totalItems: totalItems ?? this.totalItems,
      downloadedItems: downloadedItems ?? this.downloadedItems,
      totalBytes: totalBytes ?? this.totalBytes,
      downloadedBytes: downloadedBytes ?? this.downloadedBytes,
      failedItems: failedItems ?? this.failedItems,
      currentItem: currentItem ?? this.currentItem,
      state: state ?? this.state,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

/// State of the preload operation.
enum PreloadState {
  /// No operation in progress.
  idle,

  /// Checking for updates.
  checking,

  /// Downloading manifest.
  downloadingManifest,

  /// Downloading content items.
  downloading,

  /// Verifying checksums.
  verifying,

  /// Operation completed successfully.
  completed,

  /// Operation failed.
  failed,

  /// Operation was cancelled.
  cancelled,

  /// Paused (e.g., waiting for WiFi).
  paused,
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT PRELOADER SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/// Service for preloading content packages and performing delta updates.
class ContentPreloader {
  final OfflineDatabase _db;
  final ConnectivityService _connectivity;
  final String _baseUrl;
  final http.Client _httpClient;

  PreloadConfiguration? _config;
  SyncCheckpoint? _checkpoint;
  bool _isCancelled = false;
  final _progressController = StreamController<PreloadProgress>.broadcast();

  ContentPreloader({
    required OfflineDatabase database,
    required ConnectivityService connectivity,
    required String baseUrl,
    http.Client? httpClient,
  })  : _db = database,
        _connectivity = connectivity,
        _baseUrl = baseUrl,
        _httpClient = httpClient ?? http.Client();

  /// Stream of progress updates during preload operations.
  Stream<PreloadProgress> get progressStream => _progressController.stream;

  /// Current preload configuration.
  PreloadConfiguration? get configuration => _config;

  /// Current sync checkpoint.
  SyncCheckpoint? get checkpoint => _checkpoint;

  /// Configure preloading for a tenant/grades/subjects.
  Future<void> configure(PreloadConfiguration config) async {
    _config = config;
    await _loadCheckpoint();
  }

  /// Check if currently within the sync window.
  bool isInSyncWindow() {
    if (_config == null) return false;

    final now = DateTime.now();
    final startParts = _config!.syncWindowStart.split(':');
    final endParts = _config!.syncWindowEnd.split(':');

    final windowStart = DateTime(
      now.year,
      now.month,
      now.day,
      int.parse(startParts[0]),
      int.parse(startParts[1]),
    );

    final windowEnd = DateTime(
      now.year,
      now.month,
      now.day,
      int.parse(endParts[0]),
      int.parse(endParts[1]),
    );

    return now.isAfter(windowStart) && now.isBefore(windowEnd);
  }

  /// Check if preloading should proceed based on config.
  Future<bool> canProceed() async {
    if (_config == null) return false;

    final state = _connectivity.currentState;
    if (state == ConnectionState.offline || state == ConnectionState.unknown) {
      return false;
    }

    // Note: WiFi-only mode is not currently implemented as ConnectivityService
    // doesn't expose connection type details. The wifiOnly config option is
    // preserved for future implementation.
    // TODO: Extend ConnectivityService to expose connection type if needed.

    return true;
  }

  /// Request a new content package and download it.
  ///
  /// This is the full preload flow:
  /// 1. Request package creation from server
  /// 2. Poll for package completion
  /// 3. Download manifest
  /// 4. Download content items with checksum validation
  /// 5. Update local cache
  Future<void> downloadPackage() async {
    if (_config == null) {
      throw StateError('ContentPreloader not configured');
    }

    _isCancelled = false;

    try {
      _emitProgress(const PreloadProgress(state: PreloadState.checking));

      // Check if we can proceed
      if (!await canProceed()) {
        _emitProgress(PreloadProgress(
          state: PreloadState.paused,
          errorMessage: _config!.wifiOnly ? 'Waiting for WiFi' : 'No network',
        ));
        return;
      }

      // Request package creation
      final packageId = await _requestPackage();

      // Poll for completion
      final manifestUrl = await _waitForPackage(packageId);

      // Download manifest
      _emitProgress(const PreloadProgress(
        state: PreloadState.downloadingManifest,
      ));
      final manifest = await _downloadManifest(manifestUrl);

      // Filter items already cached
      final itemsToDownload = await _filterUncachedItems(manifest.items);

      if (itemsToDownload.isEmpty) {
        _emitProgress(const PreloadProgress(state: PreloadState.completed));
        await _updateCheckpoint(manifest);
        return;
      }

      // Check storage quota
      final availableSpace = await _getAvailableSpace();
      final requiredSpace = itemsToDownload.fold<int>(
        0,
        (sum, item) => sum + item.sizeBytes,
      );

      if (requiredSpace > availableSpace) {
        // Evict LRU content to make space
        await _evictContent(requiredSpace - availableSpace);
      }

      // Download content items
      await _downloadItems(itemsToDownload);

      // Update checkpoint
      await _updateCheckpoint(manifest);

      _emitProgress(const PreloadProgress(state: PreloadState.completed));
    } catch (e) {
      _emitProgress(PreloadProgress(
        state: PreloadState.failed,
        errorMessage: e.toString(),
      ));
      rethrow;
    }
  }

  /// Perform a delta sync to get only changed content.
  ///
  /// This is more efficient than full package download:
  /// 1. Query for changes since last sync
  /// 2. Download only added/updated items
  /// 3. Remove deleted items from cache
  Future<void> syncDeltas() async {
    if (_config == null) {
      throw StateError('ContentPreloader not configured');
    }

    _isCancelled = false;

    try {
      _emitProgress(const PreloadProgress(state: PreloadState.checking));

      if (!await canProceed()) {
        _emitProgress(PreloadProgress(
          state: PreloadState.paused,
          errorMessage: _config!.wifiOnly ? 'Waiting for WiFi' : 'No network',
        ));
        return;
      }

      // Get last sync timestamp
      final sinceTimestamp = _checkpoint?.lastSyncTimestamp ??
          DateTime.now().subtract(const Duration(days: 365));

      // Fetch all delta pages
      final allItems = <DeltaItem>[];
      String? cursor;
      DateTime? latestTimestamp;

      do {
        final response = await _fetchDeltaPage(sinceTimestamp, cursor);
        allItems.addAll(response.items);
        cursor = response.nextCursor;
        latestTimestamp = response.currentTimestamp;

        if (_isCancelled) {
          _emitProgress(const PreloadProgress(state: PreloadState.cancelled));
          return;
        }
      } while (cursor != null);

      if (allItems.isEmpty) {
        _emitProgress(const PreloadProgress(state: PreloadState.completed));
        return;
      }

      // Process changes
      final additions = allItems.where((i) => i.changeType != 'REMOVED').toList();
      final removals = allItems.where((i) => i.changeType == 'REMOVED').toList();

      // Remove deleted content
      if (removals.isNotEmpty) {
        final keysToRemove = removals.map((i) => i.contentKey).toList();
        await _db.deleteContentByKeys(keysToRemove);
      }

      // Download new/updated content
      if (additions.isNotEmpty) {
        await _downloadDeltaItems(additions);
      }

      // Update checkpoint
      final cacheSize = await _db.getTotalCacheSize();
      _checkpoint = SyncCheckpoint(
        tenantId: _config!.tenantId,
        gradeBands: _config!.gradeBands,
        subjects: _config!.subjects,
        locales: _config!.locales,
        lastSyncTimestamp: latestTimestamp,
        cachedItemCount: (_checkpoint?.cachedItemCount ?? 0) +
            additions.length -
            removals.length,
        cachedSizeBytes: cacheSize,
      );
      await _saveCheckpoint();
    
      _emitProgress(const PreloadProgress(state: PreloadState.completed));
    } catch (e) {
      _emitProgress(PreloadProgress(
        state: PreloadState.failed,
        errorMessage: e.toString(),
      ));
      rethrow;
    }
  }

  /// Cancel the current operation.
  void cancel() {
    _isCancelled = true;
  }

  /// Clear all cached content.
  Future<void> clearCache() async {
    await _db.customStatement('DELETE FROM offline_content_cache');
    _checkpoint = null;
  }

  /// Dispose resources.
  void dispose() {
    _progressController.close();
    _httpClient.close();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  void _emitProgress(PreloadProgress progress) {
    if (!_progressController.isClosed) {
      _progressController.add(progress);
    }
  }

  Future<void> _loadCheckpoint() async {
    // In a real implementation, load from secure storage or DB
    // For now, checkpoint is kept in memory
  }

  Future<void> _saveCheckpoint() async {
    // In a real implementation, persist to secure storage or DB
  }

  Future<String> _requestPackage() async {
    final response = await _httpClient.post(
      Uri.parse('$_baseUrl/api/content/packages'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'tenantId': _config!.tenantId,
        'gradeBands': _config!.gradeBands,
        'subjects': _config!.subjects,
        'locales': _config!.locales,
      }),
    );

    if (response.statusCode != 202) {
      throw Exception('Failed to request package: ${response.statusCode}');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return data['packageId'] as String;
  }

  Future<String> _waitForPackage(String packageId) async {
    const maxAttempts = 60;
    const pollInterval = Duration(seconds: 2);

    for (var i = 0; i < maxAttempts; i++) {
      if (_isCancelled) {
        throw Exception('Operation cancelled');
      }

      final response = await _httpClient.get(
        Uri.parse('$_baseUrl/api/content/packages/$packageId'),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to get package status: ${response.statusCode}');
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final pkg = data['package'] as Map<String, dynamic>;
      final status = pkg['status'] as String;

      if (status == 'READY') {
        return data['manifestDownloadUrl'] as String;
      } else if (status == 'FAILED') {
        throw Exception('Package build failed: ${pkg['errorMessage']}');
      }

      await Future<void>.delayed(pollInterval);
    }

    throw Exception('Package build timeout');
  }

  Future<ContentPackageManifest> _downloadManifest(String url) async {
    final response = await _httpClient.get(Uri.parse(url));

    if (response.statusCode != 200) {
      throw Exception('Failed to download manifest: ${response.statusCode}');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return ContentPackageManifest.fromJson(data);
  }

  Future<List<ManifestItem>> _filterUncachedItems(
    List<ManifestItem> items,
  ) async {
    final keys = items.map((i) => i.contentKey).toList();
    final uncachedKeys = await _db.findUncachedContent(keys);
    return items.where((i) => uncachedKeys.contains(i.contentKey)).toList();
  }

  Future<int> _getAvailableSpace() async {
    final currentSize = await _db.getTotalCacheSize();
    return _config!.maxStorageBytes - currentSize;
  }

  Future<void> _evictContent(int bytesNeeded) async {
    final keysToEvict = await _db.getLRUContentKeys(targetBytes: bytesNeeded);
    await _db.deleteContentByKeys(keysToEvict);
  }

  Future<void> _downloadItems(List<ManifestItem> items) async {
    final totalItems = items.length;
    final totalBytes = items.fold<int>(0, (sum, item) => sum + item.sizeBytes);
    var downloadedItems = 0;
    var downloadedBytes = 0;
    var failedItems = 0;

    _emitProgress(PreloadProgress(
      state: PreloadState.downloading,
      totalItems: totalItems,
      totalBytes: totalBytes,
    ));

    for (final item in items) {
      if (_isCancelled) {
        _emitProgress(PreloadProgress(
          state: PreloadState.cancelled,
          totalItems: totalItems,
          downloadedItems: downloadedItems,
          totalBytes: totalBytes,
          downloadedBytes: downloadedBytes,
          failedItems: failedItems,
        ));
        return;
      }

      // Check connectivity before each download
      if (!await canProceed()) {
        _emitProgress(PreloadProgress(
          state: PreloadState.paused,
          totalItems: totalItems,
          downloadedItems: downloadedItems,
          totalBytes: totalBytes,
          downloadedBytes: downloadedBytes,
          failedItems: failedItems,
          errorMessage: 'Network unavailable',
        ));
        return;
      }

      _emitProgress(PreloadProgress(
        state: PreloadState.downloading,
        totalItems: totalItems,
        downloadedItems: downloadedItems,
        totalBytes: totalBytes,
        downloadedBytes: downloadedBytes,
        failedItems: failedItems,
        currentItem: item.contentKey,
      ));

      try {
        await _downloadAndCacheItem(item);
        downloadedItems++;
        downloadedBytes += item.sizeBytes;
      } catch (e) {
        failedItems++;
        // Continue with next item
      }
    }

    if (failedItems > 0 && failedItems == totalItems) {
      _emitProgress(PreloadProgress(
        state: PreloadState.failed,
        totalItems: totalItems,
        downloadedItems: downloadedItems,
        totalBytes: totalBytes,
        downloadedBytes: downloadedBytes,
        failedItems: failedItems,
        errorMessage: 'All downloads failed',
      ));
    }
  }

  Future<void> _downloadAndCacheItem(ManifestItem item) async {
    final response = await _httpClient.get(Uri.parse(item.contentUrl));

    if (response.statusCode != 200) {
      throw Exception('Download failed: ${response.statusCode}');
    }

    final content = response.body;

    // Verify checksum
    final computedChecksum = _computeChecksum(content);
    final expectedChecksum = item.checksum.replaceFirst('sha256:', '');

    if (computedChecksum != expectedChecksum) {
      throw Exception('Checksum mismatch for ${item.contentKey}');
    }

    // Cache content
    final now = DateTime.now();
    final expiresAt = now.add(const Duration(days: 30));

    await _db.upsertContent(OfflineContent(
      contentKey: item.contentKey,
      contentType: item.subject.toLowerCase(),
      subject: item.subject,
      gradeBand: item.gradeBand,
      jsonPayload: content,
      sizeBytes: item.sizeBytes,
      expiresAt: expiresAt.millisecondsSinceEpoch,
      createdAt: now.millisecondsSinceEpoch,
      lastAccessedAt: now.millisecondsSinceEpoch,
    ));
  }

  Future<DeltaUpdateResponse> _fetchDeltaPage(
    DateTime sinceTimestamp,
    String? cursor,
  ) async {
    final queryParams = {
      'tenantId': _config!.tenantId,
      'sinceTimestamp': sinceTimestamp.toIso8601String(),
      'limit': '100',
      for (final g in _config!.gradeBands) 'gradeBands': g,
      for (final s in _config!.subjects) 'subjects': s,
      for (final l in _config!.locales) 'locales': l,
      if (cursor != null) 'cursor': cursor,
    };

    final uri = Uri.parse('$_baseUrl/api/content/packages/diff')
        .replace(queryParameters: queryParams);

    final response = await _httpClient.get(uri);

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch deltas: ${response.statusCode}');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return DeltaUpdateResponse.fromJson(data);
  }

  Future<void> _downloadDeltaItems(List<DeltaItem> items) async {
    final manifestItems = items
        .where((i) => i.contentUrl != null)
        .map((i) => ManifestItem(
              loVersionId: i.loVersionId,
              learningObjectId: i.learningObjectId,
              contentKey: i.contentKey,
              checksum: i.checksum ?? '',
              contentUrl: i.contentUrl!,
              sizeBytes: i.sizeBytes ?? 0,
              subject: i.subject,
              gradeBand: i.gradeBand,
              versionNumber: i.versionNumber,
              locale: i.locale,
              publishedAt: i.changedAt,
              updatedAt: i.changedAt,
            ))
        .toList();

    await _downloadItems(manifestItems);
  }

  Future<void> _updateCheckpoint(ContentPackageManifest manifest) async {
    final cacheSize = await _db.getTotalCacheSize();
    _checkpoint = SyncCheckpoint(
      tenantId: manifest.tenantId,
      gradeBands: manifest.gradeBands,
      subjects: manifest.subjects,
      locales: manifest.locales,
      lastSyncTimestamp: manifest.generatedAt,
      cachedItemCount: manifest.totalItems,
      cachedSizeBytes: cacheSize,
    );
    await _saveCheckpoint();
  }

  String _computeChecksum(String content) {
    return sha256.convert(utf8.encode(content)).toString();
  }
}
