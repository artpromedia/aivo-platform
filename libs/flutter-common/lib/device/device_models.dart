import 'package:json_annotation/json_annotation.dart';

part 'device_models.g.dart';

/// Supported device types
enum DeviceType {
  @JsonValue('IOS_TABLET')
  iosTablet,
  @JsonValue('ANDROID_TABLET')
  androidTablet,
  @JsonValue('CHROMEBOOK')
  chromebook,
  @JsonValue('WINDOWS_PC')
  windowsPc,
  @JsonValue('MACOS')
  macos,
  @JsonValue('WEB_BROWSER')
  webBrowser,
}

/// Grade band for content filtering
enum GradeBand {
  @JsonValue('K_2')
  k2,
  @JsonValue('G3_5')
  g35,
  @JsonValue('G6_8')
  g68,
  @JsonValue('G9_12')
  g912,
}

/// Device registration response from backend
@JsonSerializable()
class DeviceRegistration {
  final String deviceId;
  final String tenantId;
  final String? schoolId;
  final String deviceIdentifier;
  final DeviceType deviceType;
  final String? appVersion;
  final String? osVersion;
  final DateTime? lastCheckInAt;
  final List<DevicePoolInfo> pools;
  final List<DevicePolicy> policies;

  DeviceRegistration({
    required this.deviceId,
    required this.tenantId,
    this.schoolId,
    required this.deviceIdentifier,
    required this.deviceType,
    this.appVersion,
    this.osVersion,
    this.lastCheckInAt,
    this.pools = const [],
    this.policies = const [],
  });

  factory DeviceRegistration.fromJson(Map<String, dynamic> json) =>
      _$DeviceRegistrationFromJson(json);

  Map<String, dynamic> toJson() => _$DeviceRegistrationToJson(this);
}

/// Device pool information
@JsonSerializable()
class DevicePoolInfo {
  final String id;
  final String name;
  final GradeBand? gradeBand;

  DevicePoolInfo({
    required this.id,
    required this.name,
    this.gradeBand,
  });

  factory DevicePoolInfo.fromJson(Map<String, dynamic> json) =>
      _$DevicePoolInfoFromJson(json);

  Map<String, dynamic> toJson() => _$DevicePoolInfoToJson(this);
}

/// Device policy configuration
@JsonSerializable()
class DevicePolicy {
  /// Enable kiosk mode (locks device to Aivo app)
  final bool kioskMode;

  /// Maximum days device can operate offline
  final int maxOfflineDays;

  /// Grade band for content filtering
  final GradeBand? gradeBand;

  /// Daily screen time limit in minutes (null = unlimited)
  final int? dailyScreenTimeLimit;

  /// Start hour for allowed usage (24h format)
  final int? allowedStartHour;

  /// End hour for allowed usage (24h format)
  final int? allowedEndHour;

  /// Block external links
  final bool restrictExternalLinks;

  /// Require WiFi for sync operations
  final bool requireWifiForSync;

  /// Enable automatic app updates
  final bool autoUpdateEnabled;

  /// Minimum required app version
  final String? minimumAppVersion;

  DevicePolicy({
    this.kioskMode = false,
    this.maxOfflineDays = 7,
    this.gradeBand,
    this.dailyScreenTimeLimit,
    this.allowedStartHour,
    this.allowedEndHour,
    this.restrictExternalLinks = true,
    this.requireWifiForSync = false,
    this.autoUpdateEnabled = true,
    this.minimumAppVersion,
  });

  factory DevicePolicy.fromJson(Map<String, dynamic> json) =>
      _$DevicePolicyFromJson(json);

  Map<String, dynamic> toJson() => _$DevicePolicyToJson(this);

  /// Default policy when no policies are assigned
  factory DevicePolicy.defaults() => DevicePolicy();

  /// Merge multiple policies (most restrictive wins)
  static DevicePolicy merge(List<DevicePolicy> policies) {
    if (policies.isEmpty) return DevicePolicy.defaults();
    if (policies.length == 1) return policies.first;

    return DevicePolicy(
      // Kiosk mode: enabled if any policy enables it
      kioskMode: policies.any((p) => p.kioskMode),
      // Max offline days: use the minimum
      maxOfflineDays: policies
          .map((p) => p.maxOfflineDays)
          .reduce((a, b) => a < b ? a : b),
      // Grade band: use the most restrictive (lowest)
      gradeBand: _mostRestrictiveGradeBand(policies),
      // Screen time: use the minimum if any set
      dailyScreenTimeLimit: _minNonNull(
        policies.map((p) => p.dailyScreenTimeLimit).whereType<int>(),
      ),
      // Allowed hours: use the most restrictive window
      allowedStartHour: _maxNonNull(
        policies.map((p) => p.allowedStartHour).whereType<int>(),
      ),
      allowedEndHour: _minNonNull(
        policies.map((p) => p.allowedEndHour).whereType<int>(),
      ),
      // Restrict links: enabled if any policy enables it
      restrictExternalLinks: policies.any((p) => p.restrictExternalLinks),
      // Require WiFi: enabled if any policy enables it
      requireWifiForSync: policies.any((p) => p.requireWifiForSync),
      // Auto update: disabled if any policy disables it
      autoUpdateEnabled: policies.every((p) => p.autoUpdateEnabled),
      // Min version: use the highest
      minimumAppVersion: _highestVersion(
        policies.map((p) => p.minimumAppVersion).whereType<String>(),
      ),
    );
  }

  static GradeBand? _mostRestrictiveGradeBand(List<DevicePolicy> policies) {
    final bands = policies.map((p) => p.gradeBand).whereType<GradeBand>();
    if (bands.isEmpty) return null;
    return bands.reduce((a, b) => a.index < b.index ? a : b);
  }

  static int? _minNonNull(Iterable<int> values) {
    if (values.isEmpty) return null;
    return values.reduce((a, b) => a < b ? a : b);
  }

  static int? _maxNonNull(Iterable<int> values) {
    if (values.isEmpty) return null;
    return values.reduce((a, b) => a > b ? a : b);
  }

  static String? _highestVersion(Iterable<String> versions) {
    if (versions.isEmpty) return null;
    return versions.reduce((a, b) => _compareVersions(a, b) > 0 ? a : b);
  }

  static int _compareVersions(String a, String b) {
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

/// Check-in response from backend
@JsonSerializable()
class CheckInResponse {
  final DateTime checkedInAt;
  final List<DevicePolicy> policies;
  final bool requiresUpdate;
  final String? latestAppVersion;

  CheckInResponse({
    required this.checkedInAt,
    this.policies = const [],
    this.requiresUpdate = false,
    this.latestAppVersion,
  });

  factory CheckInResponse.fromJson(Map<String, dynamic> json) =>
      _$CheckInResponseFromJson(json);

  Map<String, dynamic> toJson() => _$CheckInResponseToJson(this);
}

/// Policy compliance result
class PolicyComplianceResult {
  final bool compliant;
  final List<PolicyViolation> violations;
  final DevicePolicy effectivePolicy;

  PolicyComplianceResult({
    required this.compliant,
    required this.violations,
    required this.effectivePolicy,
  });
}

/// A specific policy violation
class PolicyViolation {
  final PolicyViolationType type;
  final String message;
  final bool blocking;

  PolicyViolation({
    required this.type,
    required this.message,
    this.blocking = true,
  });
}

/// Types of policy violations
enum PolicyViolationType {
  /// Device has been offline too long
  offlineTooLong,
  
  /// App version is below minimum
  appVersionTooOld,
  
  /// Outside allowed hours
  outsideAllowedHours,
  
  /// Screen time limit exceeded
  screenTimeLimitExceeded,
  
  /// Content grade band mismatch
  gradeBandMismatch,
  
  /// WiFi required but not connected
  wifiRequired,
}
