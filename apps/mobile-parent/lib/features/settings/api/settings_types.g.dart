// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'settings_types.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$DailyScheduleImpl _$$DailyScheduleImplFromJson(Map<String, dynamic> json) =>
    _$DailyScheduleImpl(
      enabled: json['enabled'] as bool,
      start: json['start'] as String,
      end: json['end'] as String,
    );

Map<String, dynamic> _$$DailyScheduleImplToJson(_$DailyScheduleImpl instance) =>
    <String, dynamic>{
      'enabled': instance.enabled,
      'start': instance.start,
      'end': instance.end,
    };

_$ScreenTimeSettingsImpl _$$ScreenTimeSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$ScreenTimeSettingsImpl(
      dailyLimit: (json['dailyLimit'] as num).toInt(),
      scheduleEnabled: json['scheduleEnabled'] as bool,
      schedule: (json['schedule'] as Map<String, dynamic>).map(
        (k, e) =>
            MapEntry(k, DailySchedule.fromJson(e as Map<String, dynamic>)),
      ),
      breakReminders: json['breakReminders'] as bool,
      breakInterval: (json['breakInterval'] as num).toInt(),
      breakDuration: (json['breakDuration'] as num).toInt(),
    );

Map<String, dynamic> _$$ScreenTimeSettingsImplToJson(
        _$ScreenTimeSettingsImpl instance) =>
    <String, dynamic>{
      'dailyLimit': instance.dailyLimit,
      'scheduleEnabled': instance.scheduleEnabled,
      'schedule': instance.schedule,
      'breakReminders': instance.breakReminders,
      'breakInterval': instance.breakInterval,
      'breakDuration': instance.breakDuration,
    };

_$ContentFilterSettingsImpl _$$ContentFilterSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$ContentFilterSettingsImpl(
      restrictionLevel:
          $enumDecode(_$RestrictionLevelEnumMap, json['restrictionLevel']),
      blockExternalLinks: json['blockExternalLinks'] as bool,
      safeSearch: json['safeSearch'] as bool,
      hideAchievementLeaderboards: json['hideAchievementLeaderboards'] as bool,
      restrictChat: json['restrictChat'] as bool,
      blockedTopics: (json['blockedTopics'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      allowedTopics: (json['allowedTopics'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$$ContentFilterSettingsImplToJson(
        _$ContentFilterSettingsImpl instance) =>
    <String, dynamic>{
      'restrictionLevel': _$RestrictionLevelEnumMap[instance.restrictionLevel]!,
      'blockExternalLinks': instance.blockExternalLinks,
      'safeSearch': instance.safeSearch,
      'hideAchievementLeaderboards': instance.hideAchievementLeaderboards,
      'restrictChat': instance.restrictChat,
      'blockedTopics': instance.blockedTopics,
      'allowedTopics': instance.allowedTopics,
    };

const _$RestrictionLevelEnumMap = {
  RestrictionLevel.strict: 'strict',
  RestrictionLevel.moderate: 'moderate',
  RestrictionLevel.minimal: 'minimal',
};

_$SubjectConfigImpl _$$SubjectConfigImplFromJson(Map<String, dynamic> json) =>
    _$SubjectConfigImpl(
      enabled: json['enabled'] as bool,
      maxLevel: (json['maxLevel'] as num?)?.toInt(),
    );

Map<String, dynamic> _$$SubjectConfigImplToJson(_$SubjectConfigImpl instance) =>
    <String, dynamic>{
      'enabled': instance.enabled,
      'maxLevel': instance.maxLevel,
    };

_$SubjectAccessSettingsImpl _$$SubjectAccessSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$SubjectAccessSettingsImpl(
      subjects: (json['subjects'] as Map<String, dynamic>).map(
        (k, e) =>
            MapEntry(k, SubjectConfig.fromJson(e as Map<String, dynamic>)),
      ),
      requireParentApprovalForNewSubjects:
          json['requireParentApprovalForNewSubjects'] as bool,
      allowAdvancedContent: json['allowAdvancedContent'] as bool,
    );

Map<String, dynamic> _$$SubjectAccessSettingsImplToJson(
        _$SubjectAccessSettingsImpl instance) =>
    <String, dynamic>{
      'subjects': instance.subjects,
      'requireParentApprovalForNewSubjects':
          instance.requireParentApprovalForNewSubjects,
      'allowAdvancedContent': instance.allowAdvancedContent,
    };

_$PrivacySettingsImpl _$$PrivacySettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$PrivacySettingsImpl(
      hideFromClassmates: json['hideFromClassmates'] as bool,
      hideProfilePhoto: json['hideProfilePhoto'] as bool,
      hideProgress: json['hideProgress'] as bool,
      anonymousMode: json['anonymousMode'] as bool,
    );

Map<String, dynamic> _$$PrivacySettingsImplToJson(
        _$PrivacySettingsImpl instance) =>
    <String, dynamic>{
      'hideFromClassmates': instance.hideFromClassmates,
      'hideProfilePhoto': instance.hideProfilePhoto,
      'hideProgress': instance.hideProgress,
      'anonymousMode': instance.anonymousMode,
    };

_$DataPreferencesImpl _$$DataPreferencesImplFromJson(
        Map<String, dynamic> json) =>
    _$DataPreferencesImpl(
      allowAnalytics: json['allowAnalytics'] as bool,
      allowPersonalization: json['allowPersonalization'] as bool,
      allowThirdPartySharing: json['allowThirdPartySharing'] as bool,
    );

Map<String, dynamic> _$$DataPreferencesImplToJson(
        _$DataPreferencesImpl instance) =>
    <String, dynamic>{
      'allowAnalytics': instance.allowAnalytics,
      'allowPersonalization': instance.allowPersonalization,
      'allowThirdPartySharing': instance.allowThirdPartySharing,
    };

_$AccessControlSettingsImpl _$$AccessControlSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$AccessControlSettingsImpl(
      requirePinForSettings: json['requirePinForSettings'] as bool,
      pinHash: json['pinHash'] as String?,
      pinSalt: json['pinSalt'] as String?,
      allowAccountDeletion: json['allowAccountDeletion'] as bool,
      twoFactorEnabled: json['twoFactorEnabled'] as bool,
    );

Map<String, dynamic> _$$AccessControlSettingsImplToJson(
        _$AccessControlSettingsImpl instance) =>
    <String, dynamic>{
      'requirePinForSettings': instance.requirePinForSettings,
      'pinHash': instance.pinHash,
      'pinSalt': instance.pinSalt,
      'allowAccountDeletion': instance.allowAccountDeletion,
      'twoFactorEnabled': instance.twoFactorEnabled,
    };

_$EmergencySettingsImpl _$$EmergencySettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$EmergencySettingsImpl(
      emergencyContactEnabled: json['emergencyContactEnabled'] as bool,
      emergencyEmail: json['emergencyEmail'] as String?,
      emergencyPhone: json['emergencyPhone'] as String?,
    );

Map<String, dynamic> _$$EmergencySettingsImplToJson(
        _$EmergencySettingsImpl instance) =>
    <String, dynamic>{
      'emergencyContactEnabled': instance.emergencyContactEnabled,
      'emergencyEmail': instance.emergencyEmail,
      'emergencyPhone': instance.emergencyPhone,
    };

_$SafetySettingsImpl _$$SafetySettingsImplFromJson(Map<String, dynamic> json) =>
    _$SafetySettingsImpl(
      privacy:
          PrivacySettings.fromJson(json['privacy'] as Map<String, dynamic>),
      data: DataPreferences.fromJson(json['data'] as Map<String, dynamic>),
      access: AccessControlSettings.fromJson(
          json['access'] as Map<String, dynamic>),
      emergency:
          EmergencySettings.fromJson(json['emergency'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$SafetySettingsImplToJson(
        _$SafetySettingsImpl instance) =>
    <String, dynamic>{
      'privacy': instance.privacy,
      'data': instance.data,
      'access': instance.access,
      'emergency': instance.emergency,
    };

_$EmailNotificationSettingsImpl _$$EmailNotificationSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$EmailNotificationSettingsImpl(
      enabled: json['enabled'] as bool,
      dailyDigest: json['dailyDigest'] as bool,
      weeklyReport: json['weeklyReport'] as bool,
      achievements: json['achievements'] as bool,
      concerns: json['concerns'] as bool,
      teacherMessages: json['teacherMessages'] as bool,
    );

Map<String, dynamic> _$$EmailNotificationSettingsImplToJson(
        _$EmailNotificationSettingsImpl instance) =>
    <String, dynamic>{
      'enabled': instance.enabled,
      'dailyDigest': instance.dailyDigest,
      'weeklyReport': instance.weeklyReport,
      'achievements': instance.achievements,
      'concerns': instance.concerns,
      'teacherMessages': instance.teacherMessages,
    };

_$PushNotificationSettingsImpl _$$PushNotificationSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$PushNotificationSettingsImpl(
      enabled: json['enabled'] as bool,
      achievements: json['achievements'] as bool,
      milestones: json['milestones'] as bool,
      concerns: json['concerns'] as bool,
      teacherMessages: json['teacherMessages'] as bool,
      screenTimeAlerts: json['screenTimeAlerts'] as bool,
    );

Map<String, dynamic> _$$PushNotificationSettingsImplToJson(
        _$PushNotificationSettingsImpl instance) =>
    <String, dynamic>{
      'enabled': instance.enabled,
      'achievements': instance.achievements,
      'milestones': instance.milestones,
      'concerns': instance.concerns,
      'teacherMessages': instance.teacherMessages,
      'screenTimeAlerts': instance.screenTimeAlerts,
    };

_$InAppNotificationSettingsImpl _$$InAppNotificationSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$InAppNotificationSettingsImpl(
      enabled: json['enabled'] as bool,
      achievements: json['achievements'] as bool,
      progress: json['progress'] as bool,
      recommendations: json['recommendations'] as bool,
    );

Map<String, dynamic> _$$InAppNotificationSettingsImplToJson(
        _$InAppNotificationSettingsImpl instance) =>
    <String, dynamic>{
      'enabled': instance.enabled,
      'achievements': instance.achievements,
      'progress': instance.progress,
      'recommendations': instance.recommendations,
    };

_$QuietHoursSettingsImpl _$$QuietHoursSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$QuietHoursSettingsImpl(
      enabled: json['enabled'] as bool,
      start: json['start'] as String,
      end: json['end'] as String,
    );

Map<String, dynamic> _$$QuietHoursSettingsImplToJson(
        _$QuietHoursSettingsImpl instance) =>
    <String, dynamic>{
      'enabled': instance.enabled,
      'start': instance.start,
      'end': instance.end,
    };

_$NotificationSettingsImpl _$$NotificationSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$NotificationSettingsImpl(
      email: EmailNotificationSettings.fromJson(
          json['email'] as Map<String, dynamic>),
      push: PushNotificationSettings.fromJson(
          json['push'] as Map<String, dynamic>),
      inApp: InAppNotificationSettings.fromJson(
          json['inApp'] as Map<String, dynamic>),
      quietHours: QuietHoursSettings.fromJson(
          json['quietHours'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$NotificationSettingsImplToJson(
        _$NotificationSettingsImpl instance) =>
    <String, dynamic>{
      'email': instance.email,
      'push': instance.push,
      'inApp': instance.inApp,
      'quietHours': instance.quietHours,
    };

_$ParentalControlSettingsImpl _$$ParentalControlSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$ParentalControlSettingsImpl(
      screenTime: ScreenTimeSettings.fromJson(
          json['screenTime'] as Map<String, dynamic>),
      contentFilter: ContentFilterSettings.fromJson(
          json['contentFilter'] as Map<String, dynamic>),
      subjectAccess: SubjectAccessSettings.fromJson(
          json['subjectAccess'] as Map<String, dynamic>),
      notifications: NotificationSettings.fromJson(
          json['notifications'] as Map<String, dynamic>),
      safety: SafetySettings.fromJson(json['safety'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$ParentalControlSettingsImplToJson(
        _$ParentalControlSettingsImpl instance) =>
    <String, dynamic>{
      'screenTime': instance.screenTime,
      'contentFilter': instance.contentFilter,
      'subjectAccess': instance.subjectAccess,
      'notifications': instance.notifications,
      'safety': instance.safety,
    };

_$AppSettingsImpl _$$AppSettingsImplFromJson(Map<String, dynamic> json) =>
    _$AppSettingsImpl(
      locale: json['locale'] as String,
      themeMode: $enumDecode(_$ThemeModeEnumMap, json['themeMode']),
      timezone: json['timezone'] as String,
    );

Map<String, dynamic> _$$AppSettingsImplToJson(_$AppSettingsImpl instance) =>
    <String, dynamic>{
      'locale': instance.locale,
      'themeMode': _$ThemeModeEnumMap[instance.themeMode]!,
      'timezone': instance.timezone,
    };

const _$ThemeModeEnumMap = {
  ThemeMode.light: 'light',
  ThemeMode.dark: 'dark',
  ThemeMode.system: 'system',
};

_$ParentProfileSettingsImpl _$$ParentProfileSettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$ParentProfileSettingsImpl(
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
    );

Map<String, dynamic> _$$ParentProfileSettingsImplToJson(
        _$ParentProfileSettingsImpl instance) =>
    <String, dynamic>{
      'firstName': instance.firstName,
      'lastName': instance.lastName,
      'email': instance.email,
      'phone': instance.phone,
      'avatarUrl': instance.avatarUrl,
    };

_$ParentSettingsImpl _$$ParentSettingsImplFromJson(Map<String, dynamic> json) =>
    _$ParentSettingsImpl(
      profile: ParentProfileSettings.fromJson(
          json['profile'] as Map<String, dynamic>),
      app: AppSettings.fromJson(json['app'] as Map<String, dynamic>),
      notifications: NotificationSettings.fromJson(
          json['notifications'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$ParentSettingsImplToJson(
        _$ParentSettingsImpl instance) =>
    <String, dynamic>{
      'profile': instance.profile,
      'app': instance.app,
      'notifications': instance.notifications,
    };

_$PinStatusImpl _$$PinStatusImplFromJson(Map<String, dynamic> json) =>
    _$PinStatusImpl(
      enabled: json['enabled'] as bool,
    );

Map<String, dynamic> _$$PinStatusImplToJson(_$PinStatusImpl instance) =>
    <String, dynamic>{
      'enabled': instance.enabled,
    };

_$VerifyPinResponseImpl _$$VerifyPinResponseImplFromJson(
        Map<String, dynamic> json) =>
    _$VerifyPinResponseImpl(
      valid: json['valid'] as bool,
      token: json['token'] as String?,
      expiresAt: json['expiresAt'] as String?,
      remainingAttempts: (json['remainingAttempts'] as num?)?.toInt(),
    );

Map<String, dynamic> _$$VerifyPinResponseImplToJson(
        _$VerifyPinResponseImpl instance) =>
    <String, dynamic>{
      'valid': instance.valid,
      'token': instance.token,
      'expiresAt': instance.expiresAt,
      'remainingAttempts': instance.remainingAttempts,
    };

_$SettingsSyncMetadataImpl _$$SettingsSyncMetadataImplFromJson(
        Map<String, dynamic> json) =>
    _$SettingsSyncMetadataImpl(
      lastSyncedAt: json['lastSyncedAt'] as String,
      lastModifiedBy: json['lastModifiedBy'] as String,
      version: (json['version'] as num).toInt(),
    );

Map<String, dynamic> _$$SettingsSyncMetadataImplToJson(
        _$SettingsSyncMetadataImpl instance) =>
    <String, dynamic>{
      'lastSyncedAt': instance.lastSyncedAt,
      'lastModifiedBy': instance.lastModifiedBy,
      'version': instance.version,
    };

_$AccessibilitySettingsImpl _$$AccessibilitySettingsImplFromJson(
        Map<String, dynamic> json) =>
    _$AccessibilitySettingsImpl(
      textScaleFactor: (json['textScaleFactor'] as num).toDouble(),
      highContrast: json['highContrast'] as bool,
      boldText: json['boldText'] as bool,
      colorBlindMode:
          $enumDecode(_$ColorBlindModeEnumMap, json['colorBlindMode']),
      reduceTransparency: json['reduceTransparency'] as bool,
      reduceMotion: json['reduceMotion'] as bool,
      screenReaderOptimized: json['screenReaderOptimized'] as bool,
      hapticFeedbackEnabled: json['hapticFeedbackEnabled'] as bool,
      soundEffectsEnabled: json['soundEffectsEnabled'] as bool,
      soundVolume: (json['soundVolume'] as num).toDouble(),
      readAloudEnabled: json['readAloudEnabled'] as bool,
      readAloudSpeed: (json['readAloudSpeed'] as num).toDouble(),
    );

Map<String, dynamic> _$$AccessibilitySettingsImplToJson(
        _$AccessibilitySettingsImpl instance) =>
    <String, dynamic>{
      'textScaleFactor': instance.textScaleFactor,
      'highContrast': instance.highContrast,
      'boldText': instance.boldText,
      'colorBlindMode': _$ColorBlindModeEnumMap[instance.colorBlindMode]!,
      'reduceTransparency': instance.reduceTransparency,
      'reduceMotion': instance.reduceMotion,
      'screenReaderOptimized': instance.screenReaderOptimized,
      'hapticFeedbackEnabled': instance.hapticFeedbackEnabled,
      'soundEffectsEnabled': instance.soundEffectsEnabled,
      'soundVolume': instance.soundVolume,
      'readAloudEnabled': instance.readAloudEnabled,
      'readAloudSpeed': instance.readAloudSpeed,
    };

const _$ColorBlindModeEnumMap = {
  ColorBlindMode.none: 'none',
  ColorBlindMode.protanopia: 'protanopia',
  ColorBlindMode.deuteranopia: 'deuteranopia',
  ColorBlindMode.tritanopia: 'tritanopia',
  ColorBlindMode.achromatopsia: 'achromatopsia',
};
