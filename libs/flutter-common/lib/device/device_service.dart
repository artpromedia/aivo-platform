import 'dart:async';
import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

import 'device_models.dart';

/// Service for device registration, check-in, and policy retrieval.
///
/// This service handles:
/// - Device registration on first launch
/// - Periodic check-in (heartbeat) with backend
/// - Policy retrieval and caching
/// - Device identity management
///
/// Usage:
/// ```dart
/// final service = DeviceService(
///   baseUrl: 'https://api.aivo.com',
///   tenantId: 'tenant-uuid',
/// );
/// await service.initialize();
/// await service.registerDevice();
/// ```
class DeviceService {
  final String baseUrl;
  final String tenantId;
  final String? schoolId;
  final http.Client _httpClient;
  final DeviceInfoPlugin _deviceInfo;
  
  static const String _deviceIdKey = 'aivo_device_id';
  static const String _registrationKey = 'aivo_device_registration';
  static const String _policiesKey = 'aivo_device_policies';
  static const String _lastCheckInKey = 'aivo_last_check_in';
  
  /// Current device registration (null if not registered)
  DeviceRegistration? _registration;
  DeviceRegistration? get registration => _registration;
  
  /// Current effective policy (merged from all pools)
  DevicePolicy _effectivePolicy = DevicePolicy.defaults();
  DevicePolicy get effectivePolicy => _effectivePolicy;
  
  /// Device identifier (unique per device)
  String? _deviceIdentifier;
  String? get deviceIdentifier => _deviceIdentifier;
  
  /// Last check-in time
  DateTime? _lastCheckIn;
  DateTime? get lastCheckIn => _lastCheckIn;
  
  /// Check-in timer for periodic heartbeat
  Timer? _checkInTimer;
  
  /// Stream controller for policy updates
  final _policyController = StreamController<DevicePolicy>.broadcast();
  Stream<DevicePolicy> get policyUpdates => _policyController.stream;
  
  /// Stream controller for registration status
  final _registrationController = StreamController<DeviceRegistration?>.broadcast();
  Stream<DeviceRegistration?> get registrationUpdates => _registrationController.stream;

  DeviceService({
    required this.baseUrl,
    required this.tenantId,
    this.schoolId,
    http.Client? httpClient,
    DeviceInfoPlugin? deviceInfo,
  })  : _httpClient = httpClient ?? http.Client(),
        _deviceInfo = deviceInfo ?? DeviceInfoPlugin();

  /// Initialize the device service
  /// 
  /// Loads cached registration and policies, generates device identifier
  Future<void> initialize() async {
    await _loadDeviceIdentifier();
    await _loadCachedRegistration();
    await _loadCachedPolicies();
  }

  /// Register this device with the backend
  /// 
  /// Returns the registration response with device ID and policies
  Future<DeviceRegistration> registerDevice() async {
    final packageInfo = await PackageInfo.fromPlatform();
    final osVersion = await _getOsVersion();
    
    final response = await _httpClient.post(
      Uri.parse('$baseUrl/devices/register'),
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId,
      },
      body: jsonEncode({
        'tenantId': tenantId,
        if (schoolId != null) 'schoolId': schoolId,
        'deviceIdentifier': _deviceIdentifier,
        'deviceType': _getDeviceType().name.toUpperCase(),
        'appVersion': packageInfo.version,
        'osVersion': osVersion,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw DeviceServiceException(
        'Failed to register device: ${response.statusCode}',
        response.statusCode,
      );
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    _registration = DeviceRegistration.fromJson(json);
    
    // Update effective policy from registration
    _updateEffectivePolicy(_registration!.policies);
    
    // Cache registration
    await _cacheRegistration(_registration!);
    
    // Notify listeners
    _registrationController.add(_registration);
    
    return _registration!;
  }

  /// Check in with the backend (heartbeat)
  /// 
  /// Updates last check-in time and retrieves latest policies
  Future<CheckInResponse> checkIn() async {
    if (_registration == null) {
      throw DeviceServiceException('Device not registered', null);
    }
    
    final packageInfo = await PackageInfo.fromPlatform();
    final osVersion = await _getOsVersion();
    
    final response = await _httpClient.post(
      Uri.parse('$baseUrl/devices/check-in'),
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId,
      },
      body: jsonEncode({
        'deviceId': _registration!.deviceId,
        'appVersion': packageInfo.version,
        'osVersion': osVersion,
      }),
    );

    if (response.statusCode != 200) {
      throw DeviceServiceException(
        'Failed to check in: ${response.statusCode}',
        response.statusCode,
      );
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final checkInResponse = CheckInResponse.fromJson(json);
    
    // Update last check-in time
    _lastCheckIn = checkInResponse.checkedInAt;
    await _cacheLastCheckIn(_lastCheckIn!);
    
    // Update policies if changed
    if (checkInResponse.policies.isNotEmpty) {
      _updateEffectivePolicy(checkInResponse.policies);
      await _cachePolicies(checkInResponse.policies);
    }
    
    return checkInResponse;
  }

  /// Start periodic check-in
  /// 
  /// [interval] - How often to check in (default: 1 hour)
  void startPeriodicCheckIn({Duration interval = const Duration(hours: 1)}) {
    _checkInTimer?.cancel();
    _checkInTimer = Timer.periodic(interval, (_) async {
      try {
        await checkIn();
      } catch (e) {
        debugPrint('Check-in failed: $e');
      }
    });
  }

  /// Stop periodic check-in
  void stopPeriodicCheckIn() {
    _checkInTimer?.cancel();
    _checkInTimer = null;
  }

  /// Get days since last check-in
  int get daysSinceLastCheckIn {
    if (_lastCheckIn == null) return 999;
    return DateTime.now().difference(_lastCheckIn!).inDays;
  }

  /// Check if device is within offline limit
  bool get isWithinOfflineLimit {
    return daysSinceLastCheckIn <= _effectivePolicy.maxOfflineDays;
  }

  /// Dispose resources
  void dispose() {
    _checkInTimer?.cancel();
    _policyController.close();
    _registrationController.close();
    _httpClient.close();
  }

  // ─────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────

  Future<void> _loadDeviceIdentifier() async {
    final prefs = await SharedPreferences.getInstance();
    _deviceIdentifier = prefs.getString(_deviceIdKey);
    
    if (_deviceIdentifier == null) {
      _deviceIdentifier = await _generateDeviceIdentifier();
      await prefs.setString(_deviceIdKey, _deviceIdentifier!);
    }
  }

  Future<String> _generateDeviceIdentifier() async {
    if (kIsWeb) {
      // For web, generate a random UUID and store it
      return 'web-${DateTime.now().millisecondsSinceEpoch}-${_randomString(8)}';
    }
    
    if (Platform.isAndroid) {
      final androidInfo = await _deviceInfo.androidInfo;
      return 'android-${androidInfo.id}';
    }
    
    if (Platform.isIOS) {
      final iosInfo = await _deviceInfo.iosInfo;
      return 'ios-${iosInfo.identifierForVendor ?? _randomString(16)}';
    }
    
    if (Platform.isMacOS) {
      final macInfo = await _deviceInfo.macOsInfo;
      return 'macos-${macInfo.systemGUID ?? _randomString(16)}';
    }
    
    if (Platform.isWindows) {
      final windowsInfo = await _deviceInfo.windowsInfo;
      return 'windows-${windowsInfo.deviceId}';
    }
    
    if (Platform.isLinux) {
      final linuxInfo = await _deviceInfo.linuxInfo;
      return 'linux-${linuxInfo.machineId ?? _randomString(16)}';
    }
    
    return 'unknown-${_randomString(16)}';
  }

  String _randomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final random = DateTime.now().millisecondsSinceEpoch;
    return List.generate(length, (i) => chars[(random + i) % chars.length]).join();
  }

  DeviceType _getDeviceType() {
    if (kIsWeb) return DeviceType.webBrowser;
    if (Platform.isIOS) return DeviceType.iosTablet;
    if (Platform.isAndroid) return DeviceType.androidTablet;
    if (Platform.isMacOS) return DeviceType.macos;
    if (Platform.isWindows) return DeviceType.windowsPc;
    return DeviceType.chromebook;
  }

  Future<String> _getOsVersion() async {
    if (kIsWeb) return 'Web';
    
    if (Platform.isAndroid) {
      final info = await _deviceInfo.androidInfo;
      return 'Android ${info.version.release}';
    }
    
    if (Platform.isIOS) {
      final info = await _deviceInfo.iosInfo;
      return 'iOS ${info.systemVersion}';
    }
    
    if (Platform.isMacOS) {
      final info = await _deviceInfo.macOsInfo;
      return 'macOS ${info.osRelease}';
    }
    
    if (Platform.isWindows) {
      final info = await _deviceInfo.windowsInfo;
      return 'Windows ${info.buildNumber}';
    }
    
    return Platform.operatingSystemVersion;
  }

  void _updateEffectivePolicy(List<DevicePolicy> policies) {
    _effectivePolicy = DevicePolicy.merge(policies);
    _policyController.add(_effectivePolicy);
  }

  Future<void> _loadCachedRegistration() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_registrationKey);
    if (json != null) {
      try {
        _registration = DeviceRegistration.fromJson(jsonDecode(json));
      } catch (e) {
        debugPrint('Failed to load cached registration: $e');
      }
    }
    
    final lastCheckInStr = prefs.getString(_lastCheckInKey);
    if (lastCheckInStr != null) {
      _lastCheckIn = DateTime.tryParse(lastCheckInStr);
    }
  }

  Future<void> _cacheRegistration(DeviceRegistration registration) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_registrationKey, jsonEncode(registration.toJson()));
  }

  Future<void> _cacheLastCheckIn(DateTime checkInTime) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_lastCheckInKey, checkInTime.toIso8601String());
  }

  Future<void> _loadCachedPolicies() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_policiesKey);
    if (json != null) {
      try {
        final list = jsonDecode(json) as List;
        final policies = list
            .map((e) => DevicePolicy.fromJson(e as Map<String, dynamic>))
            .toList();
        _updateEffectivePolicy(policies);
      } catch (e) {
        debugPrint('Failed to load cached policies: $e');
      }
    }
  }

  Future<void> _cachePolicies(List<DevicePolicy> policies) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _policiesKey,
      jsonEncode(policies.map((p) => p.toJson()).toList()),
    );
  }
}

/// Exception thrown by DeviceService
class DeviceServiceException implements Exception {
  final String message;
  final int? statusCode;

  DeviceServiceException(this.message, this.statusCode);

  @override
  String toString() => 'DeviceServiceException: $message (status: $statusCode)';
}
