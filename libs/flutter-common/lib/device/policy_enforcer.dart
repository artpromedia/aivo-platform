import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import 'device_models.dart';
import 'device_service.dart';

/// Policy enforcer for device management.
///
/// This class checks device compliance against policies and takes
/// appropriate actions when violations occur.
///
/// Usage:
/// ```dart
/// final enforcer = PolicyEnforcer(
///   deviceService: deviceService,
/// );
/// await enforcer.initialize();
/// final result = await enforcer.checkCompliance();
/// if (!result.compliant) {
///   // Handle violations
/// }
/// ```
class PolicyEnforcer {
  final DeviceService deviceService;
  final Connectivity _connectivity;
  
  /// Callback when a blocking violation occurs
  final void Function(PolicyViolation)? onBlockingViolation;
  
  /// Callback when a warning violation occurs
  final void Function(PolicyViolation)? onWarningViolation;
  
  /// Screen time tracking
  int _todayScreenTimeMinutes = 0;
  DateTime? _screenTimeDate;
  Timer? _screenTimeTimer;
  
  /// Stream controller for compliance updates
  final _complianceController = StreamController<PolicyComplianceResult>.broadcast();
  Stream<PolicyComplianceResult> get complianceUpdates => _complianceController.stream;

  PolicyEnforcer({
    required this.deviceService,
    this.onBlockingViolation,
    this.onWarningViolation,
    Connectivity? connectivity,
  }) : _connectivity = connectivity ?? Connectivity();

  /// Initialize the policy enforcer
  Future<void> initialize() async {
    // Listen for policy updates
    deviceService.policyUpdates.listen((_) {
      _checkComplianceAndNotify();
    });
    
    // Start screen time tracking
    _startScreenTimeTracking();
  }

  /// Check compliance against current policies
  Future<PolicyComplianceResult> checkCompliance() async {
    final policy = deviceService.effectivePolicy;
    final violations = <PolicyViolation>[];
    
    // Check offline duration
    final offlineViolation = await _checkOfflineCompliance(policy);
    if (offlineViolation != null) violations.add(offlineViolation);
    
    // Check app version
    final versionViolation = await _checkVersionCompliance(policy);
    if (versionViolation != null) violations.add(versionViolation);
    
    // Check allowed hours
    final hoursViolation = _checkAllowedHours(policy);
    if (hoursViolation != null) violations.add(hoursViolation);
    
    // Check screen time
    final screenTimeViolation = _checkScreenTime(policy);
    if (screenTimeViolation != null) violations.add(screenTimeViolation);
    
    // Check WiFi requirement
    final wifiViolation = await _checkWifiRequirement(policy);
    if (wifiViolation != null) violations.add(wifiViolation);
    
    final result = PolicyComplianceResult(
      compliant: violations.isEmpty || violations.every((v) => !v.blocking),
      violations: violations,
      effectivePolicy: policy,
    );
    
    _complianceController.add(result);
    
    // Notify callbacks for violations
    for (final violation in violations) {
      if (violation.blocking) {
        onBlockingViolation?.call(violation);
      } else {
        onWarningViolation?.call(violation);
      }
    }
    
    return result;
  }

  /// Check if current time is within allowed hours
  bool get isWithinAllowedHours {
    final policy = deviceService.effectivePolicy;
    return _checkAllowedHours(policy) == null;
  }

  /// Check if screen time is within limit
  bool get isWithinScreenTimeLimit {
    final policy = deviceService.effectivePolicy;
    return _checkScreenTime(policy) == null;
  }

  /// Get remaining screen time in minutes
  int get remainingScreenTimeMinutes {
    final policy = deviceService.effectivePolicy;
    final limit = policy.dailyScreenTimeLimit;
    if (limit == null) return -1; // Unlimited
    return (limit - _todayScreenTimeMinutes).clamp(0, limit);
  }

  /// Check if kiosk mode is enabled
  bool get isKioskModeEnabled => deviceService.effectivePolicy.kioskMode;

  /// Check if external links are restricted
  bool get areExternalLinksRestricted =>
      deviceService.effectivePolicy.restrictExternalLinks;

  /// Get the effective grade band restriction
  GradeBand? get gradeBandRestriction =>
      deviceService.effectivePolicy.gradeBand;

  /// Report screen time usage
  void reportScreenTime(int minutes) {
    _resetScreenTimeIfNewDay();
    _todayScreenTimeMinutes += minutes;
  }

  /// Dispose resources
  void dispose() {
    _screenTimeTimer?.cancel();
    _complianceController.close();
  }

  // ─────────────────────────────────────────────────────────────
  // Private compliance checks
  // ─────────────────────────────────────────────────────────────

  Future<PolicyViolation?> _checkOfflineCompliance(DevicePolicy policy) async {
    final daysSinceCheckIn = deviceService.daysSinceLastCheckIn;
    
    if (daysSinceCheckIn > policy.maxOfflineDays) {
      return PolicyViolation(
        type: PolicyViolationType.offlineTooLong,
        message: 'Device has been offline for $daysSinceCheckIn days '
            '(maximum allowed: ${policy.maxOfflineDays} days). '
            'Please connect to the internet to continue.',
        blocking: true,
      );
    }
    
    // Warning when approaching limit
    if (daysSinceCheckIn >= policy.maxOfflineDays - 1) {
      return PolicyViolation(
        type: PolicyViolationType.offlineTooLong,
        message: 'Device will require internet connection tomorrow. '
            'Please sync when possible.',
        blocking: false,
      );
    }
    
    return null;
  }

  Future<PolicyViolation?> _checkVersionCompliance(DevicePolicy policy) async {
    final minVersion = policy.minimumAppVersion;
    if (minVersion == null) return null;
    
    final packageInfo = await PackageInfo.fromPlatform();
    final currentVersion = packageInfo.version;
    
    if (_compareVersions(currentVersion, minVersion) < 0) {
      return PolicyViolation(
        type: PolicyViolationType.appVersionTooOld,
        message: 'App version $currentVersion is below the required minimum '
            'version $minVersion. Please update the app to continue.',
        blocking: policy.autoUpdateEnabled,
      );
    }
    
    return null;
  }

  PolicyViolation? _checkAllowedHours(DevicePolicy policy) {
    final startHour = policy.allowedStartHour;
    final endHour = policy.allowedEndHour;
    
    if (startHour == null || endHour == null) return null;
    
    final currentHour = DateTime.now().hour;
    
    final inAllowedHours = startHour <= endHour
        ? currentHour >= startHour && currentHour < endHour
        : currentHour >= startHour || currentHour < endHour;
    
    if (!inAllowedHours) {
      final startTime = _formatHour(startHour);
      final endTime = _formatHour(endHour);
      
      return PolicyViolation(
        type: PolicyViolationType.outsideAllowedHours,
        message: 'This device can only be used between $startTime and $endTime.',
        blocking: true,
      );
    }
    
    return null;
  }

  PolicyViolation? _checkScreenTime(DevicePolicy policy) {
    final limit = policy.dailyScreenTimeLimit;
    if (limit == null) return null;
    
    _resetScreenTimeIfNewDay();
    
    if (_todayScreenTimeMinutes >= limit) {
      return PolicyViolation(
        type: PolicyViolationType.screenTimeLimitExceeded,
        message: 'Daily screen time limit of ${_formatDuration(limit)} has been reached.',
        blocking: true,
      );
    }
    
    // Warning when approaching limit (90%)
    if (_todayScreenTimeMinutes >= limit * 0.9) {
      final remaining = limit - _todayScreenTimeMinutes;
      return PolicyViolation(
        type: PolicyViolationType.screenTimeLimitExceeded,
        message: 'Only ${_formatDuration(remaining)} of screen time remaining today.',
        blocking: false,
      );
    }
    
    return null;
  }

  Future<PolicyViolation?> _checkWifiRequirement(DevicePolicy policy) async {
    if (!policy.requireWifiForSync) return null;
    
    final connectivityResult = await _connectivity.checkConnectivity();
    
    if (!connectivityResult.contains(ConnectivityResult.wifi)) {
      return PolicyViolation(
        type: PolicyViolationType.wifiRequired,
        message: 'WiFi connection is required for syncing data. '
            'Please connect to WiFi.',
        blocking: false, // Warning only, don't block usage
      );
    }
    
    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  void _startScreenTimeTracking() {
    _screenTimeTimer = Timer.periodic(
      const Duration(minutes: 1),
      (_) {
        _resetScreenTimeIfNewDay();
        _todayScreenTimeMinutes++;
        _checkComplianceAndNotify();
      },
    );
  }

  void _resetScreenTimeIfNewDay() {
    final today = DateTime.now();
    if (_screenTimeDate == null ||
        _screenTimeDate!.day != today.day ||
        _screenTimeDate!.month != today.month ||
        _screenTimeDate!.year != today.year) {
      _screenTimeDate = today;
      _todayScreenTimeMinutes = 0;
    }
  }

  void _checkComplianceAndNotify() {
    checkCompliance().catchError((e) {
      debugPrint('Compliance check failed: $e');
      return PolicyComplianceResult(
        compliant: true,
        violations: [],
        effectivePolicy: DevicePolicy.defaults(),
      );
    });
  }

  String _formatHour(int hour) {
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '$displayHour:00 $period';
  }

  String _formatDuration(int minutes) {
    if (minutes < 60) return '$minutes minutes';
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    if (mins == 0) return '$hours hour${hours > 1 ? 's' : ''}';
    return '$hours hour${hours > 1 ? 's' : ''} $mins minutes';
  }

  int _compareVersions(String a, String b) {
    final partsA = a.split('.').map((s) => int.tryParse(s) ?? 0).toList();
    final partsB = b.split('.').map((s) => int.tryParse(s) ?? 0).toList();
    final maxLen = partsA.length > partsB.length ? partsA.length : partsB.length;

    for (var i = 0; i < maxLen; i++) {
      final numA = i < partsA.length ? partsA[i] : 0;
      final numB = i < partsB.length ? partsB[i] : 0;
      if (numA < numB) return -1;
      if (numA > numB) return 1;
    }
    return 0;
  }
}

/// Widget mixin for policy-aware screens
///
/// Use this mixin to easily integrate policy enforcement into your screens.
mixin PolicyAwareMixin {
  PolicyEnforcer get policyEnforcer;

  /// Check if content is allowed for the current grade band
  bool isContentAllowed(GradeBand? contentGradeBand) {
    final restriction = policyEnforcer.gradeBandRestriction;
    if (restriction == null || contentGradeBand == null) return true;
    return contentGradeBand.index <= restriction.index;
  }

  /// Check if an external link should be blocked
  bool shouldBlockExternalLink(String url) {
    if (!policyEnforcer.areExternalLinksRestricted) return false;
    
    // Allow whitelisted domains
    final allowedDomains = ['aivolearning.com', 'aivo.ai'];
    final uri = Uri.tryParse(url);
    if (uri == null) return true;
    
    return !allowedDomains.any((domain) => uri.host.endsWith(domain));
  }
}
