// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'device_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

DeviceRegistration _$DeviceRegistrationFromJson(Map<String, dynamic> json) =>
    DeviceRegistration(
      deviceId: json['deviceId'] as String,
      tenantId: json['tenantId'] as String,
      schoolId: json['schoolId'] as String?,
      deviceIdentifier: json['deviceIdentifier'] as String,
      deviceType: $enumDecode(_$DeviceTypeEnumMap, json['deviceType']),
      appVersion: json['appVersion'] as String?,
      osVersion: json['osVersion'] as String?,
      lastCheckInAt: json['lastCheckInAt'] == null
          ? null
          : DateTime.parse(json['lastCheckInAt'] as String),
      pools: (json['pools'] as List<dynamic>?)
              ?.map((e) => DevicePoolInfo.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      policies: (json['policies'] as List<dynamic>?)
              ?.map((e) => DevicePolicy.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$DeviceRegistrationToJson(DeviceRegistration instance) =>
    <String, dynamic>{
      'deviceId': instance.deviceId,
      'tenantId': instance.tenantId,
      'schoolId': instance.schoolId,
      'deviceIdentifier': instance.deviceIdentifier,
      'deviceType': _$DeviceTypeEnumMap[instance.deviceType]!,
      'appVersion': instance.appVersion,
      'osVersion': instance.osVersion,
      'lastCheckInAt': instance.lastCheckInAt?.toIso8601String(),
      'pools': instance.pools,
      'policies': instance.policies,
    };

const _$DeviceTypeEnumMap = {
  DeviceType.iosTablet: 'IOS_TABLET',
  DeviceType.androidTablet: 'ANDROID_TABLET',
  DeviceType.chromebook: 'CHROMEBOOK',
  DeviceType.windowsPc: 'WINDOWS_PC',
  DeviceType.macos: 'MACOS',
  DeviceType.webBrowser: 'WEB_BROWSER',
};

DevicePoolInfo _$DevicePoolInfoFromJson(Map<String, dynamic> json) =>
    DevicePoolInfo(
      id: json['id'] as String,
      name: json['name'] as String,
      gradeBand: $enumDecodeNullable(_$GradeBandEnumMap, json['gradeBand']),
    );

Map<String, dynamic> _$DevicePoolInfoToJson(DevicePoolInfo instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'gradeBand': _$GradeBandEnumMap[instance.gradeBand],
    };

const _$GradeBandEnumMap = {
  GradeBand.k2: 'K_2',
  GradeBand.g35: 'G3_5',
  GradeBand.g68: 'G6_8',
  GradeBand.g912: 'G9_12',
};

DevicePolicy _$DevicePolicyFromJson(Map<String, dynamic> json) => DevicePolicy(
      kioskMode: json['kioskMode'] as bool? ?? false,
      maxOfflineDays: (json['maxOfflineDays'] as num?)?.toInt() ?? 7,
      gradeBand: $enumDecodeNullable(_$GradeBandEnumMap, json['gradeBand']),
      dailyScreenTimeLimit: (json['dailyScreenTimeLimit'] as num?)?.toInt(),
      allowedStartHour: (json['allowedStartHour'] as num?)?.toInt(),
      allowedEndHour: (json['allowedEndHour'] as num?)?.toInt(),
      restrictExternalLinks: json['restrictExternalLinks'] as bool? ?? true,
      requireWifiForSync: json['requireWifiForSync'] as bool? ?? false,
      autoUpdateEnabled: json['autoUpdateEnabled'] as bool? ?? true,
      minimumAppVersion: json['minimumAppVersion'] as String?,
    );

Map<String, dynamic> _$DevicePolicyToJson(DevicePolicy instance) =>
    <String, dynamic>{
      'kioskMode': instance.kioskMode,
      'maxOfflineDays': instance.maxOfflineDays,
      'gradeBand': _$GradeBandEnumMap[instance.gradeBand],
      'dailyScreenTimeLimit': instance.dailyScreenTimeLimit,
      'allowedStartHour': instance.allowedStartHour,
      'allowedEndHour': instance.allowedEndHour,
      'restrictExternalLinks': instance.restrictExternalLinks,
      'requireWifiForSync': instance.requireWifiForSync,
      'autoUpdateEnabled': instance.autoUpdateEnabled,
      'minimumAppVersion': instance.minimumAppVersion,
    };

CheckInResponse _$CheckInResponseFromJson(Map<String, dynamic> json) =>
    CheckInResponse(
      checkedInAt: DateTime.parse(json['checkedInAt'] as String),
      policies: (json['policies'] as List<dynamic>?)
              ?.map((e) => DevicePolicy.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      requiresUpdate: json['requiresUpdate'] as bool? ?? false,
      latestAppVersion: json['latestAppVersion'] as String?,
    );

Map<String, dynamic> _$CheckInResponseToJson(CheckInResponse instance) =>
    <String, dynamic>{
      'checkedInAt': instance.checkedInAt.toIso8601String(),
      'policies': instance.policies,
      'requiresUpdate': instance.requiresUpdate,
      'latestAppVersion': instance.latestAppVersion,
    };
