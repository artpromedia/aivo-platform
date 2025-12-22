/// Offline Storage - ND-3.2
///
/// Local storage for offline regulation content using SharedPreferences and file system.
/// Manages regulation activities, assets, preferences, and metadata.

import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OfflineStorage {
  // Prefixes used to namespace SharedPreferences keys
  static const String _preferencesPrefix = 'prefs_';
  static const String _metadataPrefix = 'metadata_';
  static const String _usagePrefix = 'usage_';
  static const String _assetsFolder = 'offline_assets';
  static const String _dataFolder = 'offline_data';

  SharedPreferences? _prefs;
  Directory? _assetsDirectory;
  Directory? _dataDirectory;
  bool _initialized = false;

  // In-memory caches
  final Map<String, Map<String, dynamic>> _regulationCache = {};
  final Map<String, Map<String, dynamic>> _usageCache = {};

  bool get initialized => _initialized;

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      _prefs = await SharedPreferences.getInstance();

      final appDir = await getApplicationDocumentsDirectory();
      
      _assetsDirectory = Directory('${appDir.path}/$_assetsFolder');
      if (!await _assetsDirectory!.exists()) {
        await _assetsDirectory!.create(recursive: true);
      }

      _dataDirectory = Directory('${appDir.path}/$_dataFolder');
      if (!await _dataDirectory!.exists()) {
        await _dataDirectory!.create(recursive: true);
      }

      // Load cached data from files
      await _loadRegulationCache();
      await _loadUsageCache();

      _initialized = true;
    } catch (e) {
      debugPrint('OfflineStorage initialization failed: $e');
      rethrow;
    }
  }

  Future<void> _loadRegulationCache() async {
    final file = File('${_dataDirectory!.path}/regulation_activities.json');
    if (await file.exists()) {
      try {
        final content = await file.readAsString();
        final data = jsonDecode(content) as Map<String, dynamic>;
        data.forEach((key, value) {
          _regulationCache[key] = Map<String, dynamic>.from(value);
        });
      } catch (e) {
        debugPrint('Failed to load regulation cache: $e');
      }
    }
  }

  Future<void> _loadUsageCache() async {
    final file = File('${_dataDirectory!.path}/activity_usage.json');
    if (await file.exists()) {
      try {
        final content = await file.readAsString();
        final data = jsonDecode(content) as Map<String, dynamic>;
        data.forEach((key, value) {
          _usageCache[key] = Map<String, dynamic>.from(value);
        });
      } catch (e) {
        debugPrint('Failed to load usage cache: $e');
      }
    }
  }

  Future<void> _saveRegulationCache() async {
    final file = File('${_dataDirectory!.path}/regulation_activities.json');
    await file.writeAsString(jsonEncode(_regulationCache));
  }

  Future<void> _saveUsageCache() async {
    final file = File('${_dataDirectory!.path}/activity_usage.json');
    await file.writeAsString(jsonEncode(_usageCache));
  }

  void _ensureInitialized() {
    if (!_initialized) {
      throw StateError('OfflineStorage not initialized. Call initialize() first.');
    }
  }

  // === Regulation Activities ===

  Future<void> saveRegulationActivity(String id, Map<String, dynamic> activity) async {
    _ensureInitialized();
    _regulationCache[id] = activity;
    await _saveRegulationCache();
  }

  Future<void> saveRegulationActivities(List<Map<String, dynamic>> activities) async {
    _ensureInitialized();
    for (final activity in activities) {
      final id = activity['id'] as String?;
      if (id != null) {
        _regulationCache[id] = activity;
      }
    }
    await _saveRegulationCache();
  }

  Future<Map<String, dynamic>?> getRegulationActivity(String id) async {
    _ensureInitialized();
    return _regulationCache[id];
  }

  Future<List<Map<String, dynamic>>> getAllRegulationActivities() async {
    _ensureInitialized();
    return _regulationCache.values.toList();
  }

  Future<List<Map<String, dynamic>>> getRegulationActivitiesByType(String type) async {
    final all = await getAllRegulationActivities();
    return all.where((a) => a['type'] == type).toList();
  }

  Future<int> getRegulationActivityCount() async {
    _ensureInitialized();
    return _regulationCache.length;
  }

  Future<void> deleteRegulationActivity(String id) async {
    _ensureInitialized();
    _regulationCache.remove(id);
    await _saveRegulationCache();
  }

  // === Asset Storage ===

  Future<void> saveAsset(String id, Uint8List data, String extension) async {
    _ensureInitialized();
    final file = File('${_assetsDirectory!.path}/$id.$extension');
    await file.writeAsBytes(data);
  }

  Future<Uint8List?> getAsset(String id, String extension) async {
    _ensureInitialized();
    final file = File('${_assetsDirectory!.path}/$id.$extension');
    if (await file.exists()) {
      return file.readAsBytes();
    }
    return null;
  }

  Future<String?> getAssetPath(String id, String extension) async {
    _ensureInitialized();
    final file = File('${_assetsDirectory!.path}/$id.$extension');
    if (await file.exists()) {
      return file.path;
    }
    return null;
  }

  Future<bool> hasAsset(String id, String extension) async {
    _ensureInitialized();
    final file = File('${_assetsDirectory!.path}/$id.$extension');
    return file.exists();
  }

  Future<void> deleteAsset(String id, String extension) async {
    _ensureInitialized();
    final file = File('${_assetsDirectory!.path}/$id.$extension');
    if (await file.exists()) {
      await file.delete();
    }
  }

  Future<int> getAudioAssetCount() async {
    _ensureInitialized();
    final files = await _assetsDirectory!.list().toList();
    return files.where((f) => 
      f.path.endsWith('.mp3') || 
      f.path.endsWith('.wav') ||
      f.path.endsWith('.m4a')
    ).length;
  }

  Future<int> getImageAssetCount() async {
    _ensureInitialized();
    final files = await _assetsDirectory!.list().toList();
    return files.where((f) =>
      f.path.endsWith('.png') ||
      f.path.endsWith('.jpg') ||
      f.path.endsWith('.jpeg') ||
      f.path.endsWith('.gif') ||
      f.path.endsWith('.webp')
    ).length;
  }

  Future<List<String>> listAssets() async {
    _ensureInitialized();
    final files = await _assetsDirectory!.list().toList();
    return files.whereType<File>().map((f) => f.path).toList();
  }

  // === Preferences ===

  Future<void> savePreferences(String learnerId, Map<String, dynamic> prefs) async {
    _ensureInitialized();
    await _prefs!.setString('$_preferencesPrefix$learnerId', jsonEncode(prefs));
  }

  Future<Map<String, dynamic>?> getPreferences(String learnerId) async {
    _ensureInitialized();
    final data = _prefs!.getString('$_preferencesPrefix$learnerId');
    return data != null ? Map<String, dynamic>.from(jsonDecode(data)) : null;
  }

  Future<void> deletePreferences(String learnerId) async {
    _ensureInitialized();
    await _prefs!.remove('$_preferencesPrefix$learnerId');
  }

  // === Activity Usage Tracking ===

  Future<void> saveActivityUsage(Map<String, dynamic> usage) async {
    _ensureInitialized();
    final key = '${_usagePrefix}${DateTime.now().millisecondsSinceEpoch}';
    _usageCache[key] = usage;
    await _saveUsageCache();
  }

  Future<List<Map<String, dynamic>>> getUnsyncedUsage() async {
    _ensureInitialized();
    return _usageCache.values
        .where((u) => u['synced'] != true)
        .toList();
  }

  Future<void> markUsageSynced(String key) async {
    _ensureInitialized();
    if (_usageCache.containsKey(key)) {
      _usageCache[key]!['synced'] = true;
      await _saveUsageCache();
    }
  }

  Future<void> clearSyncedUsage() async {
    _ensureInitialized();
    _usageCache.removeWhere((key, value) => value['synced'] == true);
    await _saveUsageCache();
  }

  // === Metadata ===

  Future<void> setLastSyncTime(DateTime time) async {
    _ensureInitialized();
    await _prefs!.setString('${_metadataPrefix}lastSyncTime', time.toIso8601String());
  }

  Future<DateTime?> getLastSyncTime() async {
    _ensureInitialized();
    final timeStr = _prefs!.getString('${_metadataPrefix}lastSyncTime');
    return timeStr != null ? DateTime.parse(timeStr) : null;
  }

  Future<void> setMetadata(String key, dynamic value) async {
    _ensureInitialized();
    if (value is String) {
      await _prefs!.setString('$_metadataPrefix$key', value);
    } else if (value is int) {
      await _prefs!.setInt('$_metadataPrefix$key', value);
    } else if (value is double) {
      await _prefs!.setDouble('$_metadataPrefix$key', value);
    } else if (value is bool) {
      await _prefs!.setBool('$_metadataPrefix$key', value);
    } else {
      await _prefs!.setString('$_metadataPrefix$key', jsonEncode(value));
    }
  }

  Future<T?> getMetadata<T>(String key) async {
    _ensureInitialized();
    final value = _prefs!.get('$_metadataPrefix$key');
    return value as T?;
  }

  // === General ===

  Future<void> put(String key, dynamic value) async {
    await setMetadata(key, value);
  }

  Future<T?> get<T>(String key) async {
    return getMetadata<T>(key);
  }

  Future<bool> hasContent(String contentId) async {
    _ensureInitialized();
    
    // Check in regulation activities
    if (_regulationCache.containsKey(contentId)) {
      return true;
    }
    
    // Check in assets (try common extensions)
    for (final ext in ['mp3', 'wav', 'png', 'jpg', 'gif']) {
      if (await hasAsset(contentId, ext)) {
        return true;
      }
    }
    
    return false;
  }

  Future<int> getTotalStorageUsed() async {
    _ensureInitialized();
    int total = 0;

    // Estimate cache sizes
    total += _regulationCache.length * 1024; // ~1KB per activity
    total += _usageCache.length * 128;

    // Calculate actual asset file sizes
    await for (final entity in _assetsDirectory!.list()) {
      if (entity is File) {
        try {
          total += await entity.length();
        } catch (e) {
          // Ignore errors reading file size
        }
      }
    }

    // Calculate data file sizes
    await for (final entity in _dataDirectory!.list()) {
      if (entity is File) {
        try {
          total += await entity.length();
        } catch (e) {
          // Ignore errors reading file size
        }
      }
    }

    return total;
  }

  Future<void> clearAll() async {
    _ensureInitialized();
    
    _regulationCache.clear();
    _usageCache.clear();
    
    // Clear all our keys from SharedPreferences
    final keys = _prefs!.getKeys().where((k) => 
      k.startsWith(_preferencesPrefix) || 
      k.startsWith(_metadataPrefix)
    );
    for (final key in keys) {
      await _prefs!.remove(key);
    }

    // Delete data files
    if (await _dataDirectory!.exists()) {
      await _dataDirectory!.delete(recursive: true);
      await _dataDirectory!.create();
    }

    // Delete asset files
    if (await _assetsDirectory!.exists()) {
      await _assetsDirectory!.delete(recursive: true);
      await _assetsDirectory!.create();
    }
  }

  Future<void> clearActivities() async {
    _ensureInitialized();
    _regulationCache.clear();
    await _saveRegulationCache();
  }

  Future<void> close() async {
    // SharedPreferences doesn't need to be closed
    _initialized = false;
  }
}
