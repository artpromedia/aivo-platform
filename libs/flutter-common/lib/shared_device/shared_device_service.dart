import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../device/device_models.dart';
import '../device/device_service.dart';
import 'shared_device_models.dart';

/// Service for shared device / kiosk mode operations.
///
/// Handles:
/// - Class code validation and roster fetching
/// - Learner PIN validation for shared devices
/// - Session lifecycle on shared devices
/// - Local state persistence for offline support
///
/// Usage:
/// ```dart
/// final service = SharedDeviceService(
///   baseUrl: 'https://api.aivolearning.com',
///   tenantId: 'tenant-uuid',
///   deviceService: deviceService,
/// );
/// await service.initialize();
/// if (service.isSharedMode) {
///   final roster = await service.fetchRoster('ABC123');
///   await service.startSession(learnerId, pin);
/// }
/// ```
class SharedDeviceService {
  final String baseUrl;
  final String tenantId;
  final DeviceService deviceService;
  final http.Client _httpClient;
  
  static const String _rosterCacheKey = 'aivo_shared_roster';
  static const String _sessionKey = 'aivo_shared_session';
  static const String _lastClassCodeKey = 'aivo_last_class_code';
  
  /// Current roster (loaded from class code)
  ClassroomRoster? _roster;
  ClassroomRoster? get roster => _roster;
  
  /// Current active session
  SharedDeviceSession? _activeSession;
  SharedDeviceSession? get activeSession => _activeSession;
  
  /// Stream controller for session changes
  final _sessionController = StreamController<SharedDeviceSession?>.broadcast();
  Stream<SharedDeviceSession?> get sessionUpdates => _sessionController.stream;
  
  /// Stream controller for roster changes
  final _rosterController = StreamController<ClassroomRoster?>.broadcast();
  Stream<ClassroomRoster?> get rosterUpdates => _rosterController.stream;

  SharedDeviceService({
    required this.baseUrl,
    required this.tenantId,
    required this.deviceService,
    http.Client? httpClient,
  }) : _httpClient = httpClient ?? http.Client();

  /// Check if device is in shared/kiosk mode based on policy
  bool get isSharedMode {
    final policy = deviceService.effectivePolicy;
    // Shared mode if kiosk enabled OR device has grade band from pool
    return policy.kioskMode || _hasPoolGradeBand();
  }

  bool _hasPoolGradeBand() {
    final registration = deviceService.registration;
    if (registration == null) return false;
    return registration.pools.any((pool) => pool.gradeBand != null);
  }

  /// Get the grade band for shared mode (from pool if available)
  GradeBand? get sharedModeGradeBand {
    final registration = deviceService.registration;
    if (registration == null) return null;
    
    // Find first pool with a grade band
    for (final pool in registration.pools) {
      if (pool.gradeBand != null) return pool.gradeBand;
    }
    
    // Fall back to policy grade band
    return deviceService.effectivePolicy.gradeBand;
  }

  /// Get current learner ID if session is active
  String? get currentLearnerId => _activeSession?.learnerId;

  /// Initialize the service, loading cached data
  Future<void> initialize() async {
    await _loadCachedRoster();
    await _loadCachedSession();
  }

  /// Validate a class code and fetch the roster
  ///
  /// Returns the classroom roster on success.
  /// Throws [SharedDeviceException] on failure.
  Future<ClassroomRoster> validateClassCode(String code) async {
    final normalizedCode = code.toUpperCase().trim();
    
    final response = await _httpClient.post(
      Uri.parse('$baseUrl/classrooms/session-codes/validate'),
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId,
      },
      body: jsonEncode({
        'code': normalizedCode,
        'deviceId': deviceService.registration?.deviceId,
      }),
    );

    if (response.statusCode == 404) {
      throw SharedDeviceException('Invalid class code', code: 'INVALID_CODE');
    }

    if (response.statusCode == 410) {
      throw SharedDeviceException('Class code has expired', code: 'CODE_EXPIRED');
    }

    if (response.statusCode != 200) {
      throw SharedDeviceException(
        'Failed to validate code: ${response.statusCode}',
        code: 'VALIDATION_FAILED',
      );
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    _roster = ClassroomRoster.fromJson(json);
    
    // Cache roster and code for offline use
    await _cacheRoster(_roster!);
    await _saveLastClassCode(normalizedCode);
    
    _rosterController.add(_roster);
    return _roster!;
  }

  /// Fetch roster using a previously validated class code
  Future<ClassroomRoster> refreshRoster() async {
    final lastCode = await _getLastClassCode();
    if (lastCode == null) {
      throw SharedDeviceException('No class code saved', code: 'NO_CODE');
    }
    return validateClassCode(lastCode);
  }

  /// Start a session for a learner after PIN validation
  ///
  /// [learnerId] - The learner selected from roster
  /// [pin] - The learner's PIN for validation
  Future<SharedDeviceSession> startSession(String learnerId, String pin) async {
    if (_roster == null) {
      throw SharedDeviceException('No roster loaded', code: 'NO_ROSTER');
    }

    // Find learner in roster
    final learner = _roster!.learners.firstWhere(
      (l) => l.learnerId == learnerId,
      orElse: () => throw SharedDeviceException('Learner not in roster', code: 'LEARNER_NOT_FOUND'),
    );

    // Validate PIN with backend
    final response = await _httpClient.post(
      Uri.parse('$baseUrl/shared-device/validate-pin'),
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId,
      },
      body: jsonEncode({
        'learnerId': learnerId,
        'pin': pin,
        'classroomId': _roster!.classroomId,
        'deviceId': deviceService.registration?.deviceId,
      }),
    );

    if (response.statusCode == 401) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      final remaining = json['remainingAttempts'] as int?;
      throw SharedDeviceException(
        remaining != null 
          ? 'Incorrect PIN. $remaining attempts remaining.'
          : 'Incorrect PIN',
        code: 'INVALID_PIN',
      );
    }

    if (response.statusCode == 423) {
      throw SharedDeviceException(
        'Too many attempts. Ask your teacher for help.',
        code: 'PIN_LOCKED',
      );
    }

    if (response.statusCode != 200) {
      throw SharedDeviceException(
        'Failed to validate PIN: ${response.statusCode}',
        code: 'PIN_VALIDATION_FAILED',
      );
    }

    // Create session
    final sessionId = const Uuid().v4();
    _activeSession = SharedDeviceSession(
      sessionId: sessionId,
      classroomId: _roster!.classroomId,
      classroomName: _roster!.classroomName,
      learnerId: learnerId,
      learnerDisplayName: learner.displayName,
      startedAt: DateTime.now(),
      gradeBand: learner.gradeBand ?? _roster!.gradeBand,
    );

    await _cacheSession(_activeSession!);
    _sessionController.add(_activeSession);

    return _activeSession!;
  }

  /// End the current session and return to roster selection
  ///
  /// This clears in-memory state but preserves offline data.
  /// Unsynced events remain in local DB for later sync.
  Future<void> endSession() async {
    if (_activeSession == null) return;

    // Notify backend session ended (best effort, offline-safe)
    try {
      await _httpClient.post(
        Uri.parse('$baseUrl/shared-device/end-session'),
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
        },
        body: jsonEncode({
          'sessionId': _activeSession!.sessionId,
          'learnerId': _activeSession!.learnerId,
          'deviceId': deviceService.registration?.deviceId,
          'endedAt': DateTime.now().toIso8601String(),
        }),
      );
    } catch (e) {
      // Offline - session end will sync later
      debugPrint('Failed to notify session end: $e');
    }

    // Clear in-memory session state
    _activeSession = null;
    await _clearCachedSession();
    _sessionController.add(null);
  }

  /// Clear all shared device state (full reset)
  Future<void> clearAll() async {
    _roster = null;
    _activeSession = null;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_rosterCacheKey);
    await prefs.remove(_sessionKey);
    await prefs.remove(_lastClassCodeKey);
    
    _rosterController.add(null);
    _sessionController.add(null);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHING HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  Future<void> _loadCachedRoster() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_rosterCacheKey);
      if (json != null) {
        _roster = ClassroomRoster.fromJson(jsonDecode(json) as Map<String, dynamic>);
        _rosterController.add(_roster);
      }
    } catch (e) {
      debugPrint('Failed to load cached roster: $e');
    }
  }

  Future<void> _cacheRoster(ClassroomRoster roster) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_rosterCacheKey, jsonEncode(roster.toJson()));
    } catch (e) {
      debugPrint('Failed to cache roster: $e');
    }
  }

  Future<void> _loadCachedSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_sessionKey);
      if (json != null) {
        _activeSession = SharedDeviceSession.fromJson(
          jsonDecode(json) as Map<String, dynamic>,
        );
        _sessionController.add(_activeSession);
      }
    } catch (e) {
      debugPrint('Failed to load cached session: $e');
    }
  }

  Future<void> _cacheSession(SharedDeviceSession session) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_sessionKey, jsonEncode(session.toJson()));
    } catch (e) {
      debugPrint('Failed to cache session: $e');
    }
  }

  Future<void> _clearCachedSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_sessionKey);
    } catch (e) {
      debugPrint('Failed to clear cached session: $e');
    }
  }

  Future<String?> _getLastClassCode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_lastClassCodeKey);
  }

  Future<void> _saveLastClassCode(String code) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_lastClassCodeKey, code);
  }
}

/// Exception thrown by SharedDeviceService operations
class SharedDeviceException implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;

  SharedDeviceException(this.message, {this.code, this.originalError});

  @override
  String toString() => 'SharedDeviceException: $message (code: $code)';
}
