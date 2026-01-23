/// Settings Types for Mobile Parent App
///
/// Type definitions for settings and parental controls.
/// Mirrors the TypeScript types from @aivo/ts-types.

import 'package:freezed_annotation/freezed_annotation.dart';

part 'settings_types.freezed.dart';
part 'settings_types.g.dart';

// ============================================================================
// SCREEN TIME SETTINGS
// ============================================================================

@freezed
class DailySchedule with _$DailySchedule {
  const factory DailySchedule({
    required bool enabled,
    required String start,
    required String end,
  }) = _DailySchedule;

  factory DailySchedule.fromJson(Map<String, dynamic> json) =>
      _$DailyScheduleFromJson(json);
}

@freezed
class ScreenTimeSettings with _$ScreenTimeSettings {
  const factory ScreenTimeSettings({
    required int dailyLimit,
    required bool scheduleEnabled,
    required Map<String, DailySchedule> schedule,
    required bool breakReminders,
    required int breakInterval,
    required int breakDuration,
  }) = _ScreenTimeSettings;

  factory ScreenTimeSettings.fromJson(Map<String, dynamic> json) =>
      _$ScreenTimeSettingsFromJson(json);

  factory ScreenTimeSettings.defaults() => ScreenTimeSettings(
        dailyLimit: 120,
        scheduleEnabled: false,
        schedule: {
          'monday': const DailySchedule(enabled: true, start: '08:00', end: '20:00'),
          'tuesday': const DailySchedule(enabled: true, start: '08:00', end: '20:00'),
          'wednesday': const DailySchedule(enabled: true, start: '08:00', end: '20:00'),
          'thursday': const DailySchedule(enabled: true, start: '08:00', end: '20:00'),
          'friday': const DailySchedule(enabled: true, start: '08:00', end: '20:00'),
          'saturday': const DailySchedule(enabled: true, start: '09:00', end: '21:00'),
          'sunday': const DailySchedule(enabled: true, start: '09:00', end: '21:00'),
        },
        breakReminders: true,
        breakInterval: 30,
        breakDuration: 5,
      );
}

// ============================================================================
// CONTENT FILTER SETTINGS
// ============================================================================

enum RestrictionLevel {
  @JsonValue('strict')
  strict,
  @JsonValue('moderate')
  moderate,
  @JsonValue('minimal')
  minimal,
}

@freezed
class ContentFilterSettings with _$ContentFilterSettings {
  const factory ContentFilterSettings({
    required RestrictionLevel restrictionLevel,
    required bool blockExternalLinks,
    required bool safeSearch,
    required bool hideAchievementLeaderboards,
    required bool restrictChat,
    required List<String> blockedTopics,
    required List<String> allowedTopics,
  }) = _ContentFilterSettings;

  factory ContentFilterSettings.fromJson(Map<String, dynamic> json) =>
      _$ContentFilterSettingsFromJson(json);

  factory ContentFilterSettings.defaults() => const ContentFilterSettings(
        restrictionLevel: RestrictionLevel.moderate,
        blockExternalLinks: true,
        safeSearch: true,
        hideAchievementLeaderboards: false,
        restrictChat: true,
        blockedTopics: [],
        allowedTopics: [],
      );
}

// ============================================================================
// SUBJECT ACCESS SETTINGS
// ============================================================================

@freezed
class SubjectConfig with _$SubjectConfig {
  const factory SubjectConfig({
    required bool enabled,
    int? maxLevel,
  }) = _SubjectConfig;

  factory SubjectConfig.fromJson(Map<String, dynamic> json) =>
      _$SubjectConfigFromJson(json);
}

@freezed
class SubjectAccessSettings with _$SubjectAccessSettings {
  const factory SubjectAccessSettings({
    required Map<String, SubjectConfig> subjects,
    required bool requireParentApprovalForNewSubjects,
    required bool allowAdvancedContent,
  }) = _SubjectAccessSettings;

  factory SubjectAccessSettings.fromJson(Map<String, dynamic> json) =>
      _$SubjectAccessSettingsFromJson(json);

  factory SubjectAccessSettings.defaults() => const SubjectAccessSettings(
        subjects: {},
        requireParentApprovalForNewSubjects: true,
        allowAdvancedContent: false,
      );
}

// ============================================================================
// SAFETY SETTINGS
// ============================================================================

@freezed
class PrivacySettings with _$PrivacySettings {
  const factory PrivacySettings({
    required bool hideFromClassmates,
    required bool hideProfilePhoto,
    required bool hideProgress,
    required bool anonymousMode,
  }) = _PrivacySettings;

  factory PrivacySettings.fromJson(Map<String, dynamic> json) =>
      _$PrivacySettingsFromJson(json);
}

@freezed
class DataPreferences with _$DataPreferences {
  const factory DataPreferences({
    required bool allowAnalytics,
    required bool allowPersonalization,
    required bool allowThirdPartySharing,
  }) = _DataPreferences;

  factory DataPreferences.fromJson(Map<String, dynamic> json) =>
      _$DataPreferencesFromJson(json);
}

@freezed
class AccessControlSettings with _$AccessControlSettings {
  const factory AccessControlSettings({
    required bool requirePinForSettings,
    String? pinHash,
    String? pinSalt,
    required bool allowAccountDeletion,
    required bool twoFactorEnabled,
  }) = _AccessControlSettings;

  factory AccessControlSettings.fromJson(Map<String, dynamic> json) =>
      _$AccessControlSettingsFromJson(json);
}

@freezed
class EmergencySettings with _$EmergencySettings {
  const factory EmergencySettings({
    required bool emergencyContactEnabled,
    String? emergencyEmail,
    String? emergencyPhone,
  }) = _EmergencySettings;

  factory EmergencySettings.fromJson(Map<String, dynamic> json) =>
      _$EmergencySettingsFromJson(json);
}

@freezed
class SafetySettings with _$SafetySettings {
  const factory SafetySettings({
    required PrivacySettings privacy,
    required DataPreferences data,
    required AccessControlSettings access,
    required EmergencySettings emergency,
  }) = _SafetySettings;

  factory SafetySettings.fromJson(Map<String, dynamic> json) =>
      _$SafetySettingsFromJson(json);
}

// ============================================================================
// NOTIFICATION SETTINGS
// ============================================================================

@freezed
class EmailNotificationSettings with _$EmailNotificationSettings {
  const factory EmailNotificationSettings({
    required bool enabled,
    required bool dailyDigest,
    required bool weeklyReport,
    required bool achievements,
    required bool concerns,
    required bool teacherMessages,
  }) = _EmailNotificationSettings;

  factory EmailNotificationSettings.fromJson(Map<String, dynamic> json) =>
      _$EmailNotificationSettingsFromJson(json);
}

@freezed
class PushNotificationSettings with _$PushNotificationSettings {
  const factory PushNotificationSettings({
    required bool enabled,
    required bool achievements,
    required bool milestones,
    required bool concerns,
    required bool teacherMessages,
    required bool screenTimeAlerts,
  }) = _PushNotificationSettings;

  factory PushNotificationSettings.fromJson(Map<String, dynamic> json) =>
      _$PushNotificationSettingsFromJson(json);
}

@freezed
class InAppNotificationSettings with _$InAppNotificationSettings {
  const factory InAppNotificationSettings({
    required bool enabled,
    required bool achievements,
    required bool progress,
    required bool recommendations,
  }) = _InAppNotificationSettings;

  factory InAppNotificationSettings.fromJson(Map<String, dynamic> json) =>
      _$InAppNotificationSettingsFromJson(json);
}

@freezed
class QuietHoursSettings with _$QuietHoursSettings {
  const factory QuietHoursSettings({
    required bool enabled,
    required String start,
    required String end,
  }) = _QuietHoursSettings;

  factory QuietHoursSettings.fromJson(Map<String, dynamic> json) =>
      _$QuietHoursSettingsFromJson(json);
}

@freezed
class NotificationSettings with _$NotificationSettings {
  const factory NotificationSettings({
    required EmailNotificationSettings email,
    required PushNotificationSettings push,
    required InAppNotificationSettings inApp,
    required QuietHoursSettings quietHours,
  }) = _NotificationSettings;

  factory NotificationSettings.fromJson(Map<String, dynamic> json) =>
      _$NotificationSettingsFromJson(json);

  factory NotificationSettings.defaults() => const NotificationSettings(
        email: EmailNotificationSettings(
          enabled: true,
          dailyDigest: false,
          weeklyReport: true,
          achievements: true,
          concerns: true,
          teacherMessages: true,
        ),
        push: PushNotificationSettings(
          enabled: true,
          achievements: true,
          milestones: true,
          concerns: true,
          teacherMessages: true,
          screenTimeAlerts: true,
        ),
        inApp: InAppNotificationSettings(
          enabled: true,
          achievements: true,
          progress: true,
          recommendations: true,
        ),
        quietHours: QuietHoursSettings(
          enabled: false,
          start: '21:00',
          end: '07:00',
        ),
      );
}

// ============================================================================
// PARENTAL CONTROL SETTINGS (COMBINED)
// ============================================================================

@freezed
class ParentalControlSettings with _$ParentalControlSettings {
  const factory ParentalControlSettings({
    required ScreenTimeSettings screenTime,
    required ContentFilterSettings contentFilter,
    required SubjectAccessSettings subjectAccess,
    required NotificationSettings notifications,
    required SafetySettings safety,
  }) = _ParentalControlSettings;

  factory ParentalControlSettings.fromJson(Map<String, dynamic> json) =>
      _$ParentalControlSettingsFromJson(json);
}

// ============================================================================
// APP SETTINGS
// ============================================================================

enum ThemeMode {
  @JsonValue('light')
  light,
  @JsonValue('dark')
  dark,
  @JsonValue('system')
  system,
}

@freezed
class AppSettings with _$AppSettings {
  const factory AppSettings({
    required String locale,
    required ThemeMode themeMode,
    required String timezone,
  }) = _AppSettings;

  factory AppSettings.fromJson(Map<String, dynamic> json) =>
      _$AppSettingsFromJson(json);
}

// ============================================================================
// PARENT PROFILE SETTINGS
// ============================================================================

@freezed
class ParentProfileSettings with _$ParentProfileSettings {
  const factory ParentProfileSettings({
    required String firstName,
    required String lastName,
    required String email,
    String? phone,
    String? avatarUrl,
  }) = _ParentProfileSettings;

  factory ParentProfileSettings.fromJson(Map<String, dynamic> json) =>
      _$ParentProfileSettingsFromJson(json);
}

// ============================================================================
// PARENT SETTINGS (COMBINED)
// ============================================================================

@freezed
class ParentSettings with _$ParentSettings {
  const factory ParentSettings({
    required ParentProfileSettings profile,
    required AppSettings app,
    required NotificationSettings notifications,
  }) = _ParentSettings;

  factory ParentSettings.fromJson(Map<String, dynamic> json) =>
      _$ParentSettingsFromJson(json);
}

// ============================================================================
// PIN PROTECTION
// ============================================================================

@freezed
class PinStatus with _$PinStatus {
  const factory PinStatus({
    required bool enabled,
  }) = _PinStatus;

  factory PinStatus.fromJson(Map<String, dynamic> json) =>
      _$PinStatusFromJson(json);
}

@freezed
class VerifyPinResponse with _$VerifyPinResponse {
  const factory VerifyPinResponse({
    required bool valid,
    String? token,
    String? expiresAt,
    int? remainingAttempts,
  }) = _VerifyPinResponse;

  factory VerifyPinResponse.fromJson(Map<String, dynamic> json) =>
      _$VerifyPinResponseFromJson(json);
}

// ============================================================================
// SETTINGS SYNC
// ============================================================================

@freezed
class SettingsSyncMetadata with _$SettingsSyncMetadata {
  const factory SettingsSyncMetadata({
    required String lastSyncedAt,
    required String lastModifiedBy,
    required int version,
  }) = _SettingsSyncMetadata;

  factory SettingsSyncMetadata.fromJson(Map<String, dynamic> json) =>
      _$SettingsSyncMetadataFromJson(json);
}

// ============================================================================
// ACCESSIBILITY SETTINGS
// ============================================================================

enum ColorBlindMode {
  @JsonValue('none')
  none,
  @JsonValue('protanopia')
  protanopia,
  @JsonValue('deuteranopia')
  deuteranopia,
  @JsonValue('tritanopia')
  tritanopia,
  @JsonValue('achromatopsia')
  achromatopsia,
}

@freezed
class AccessibilitySettings with _$AccessibilitySettings {
  const factory AccessibilitySettings({
    required double textScaleFactor,
    required bool highContrast,
    required bool boldText,
    required ColorBlindMode colorBlindMode,
    required bool reduceTransparency,
    required bool reduceMotion,
    required bool screenReaderOptimized,
    required bool hapticFeedbackEnabled,
    required bool soundEffectsEnabled,
    required double soundVolume,
    required bool readAloudEnabled,
    required double readAloudSpeed,
  }) = _AccessibilitySettings;

  factory AccessibilitySettings.fromJson(Map<String, dynamic> json) =>
      _$AccessibilitySettingsFromJson(json);

  factory AccessibilitySettings.defaults() => const AccessibilitySettings(
        textScaleFactor: 1.0,
        highContrast: false,
        boldText: false,
        colorBlindMode: ColorBlindMode.none,
        reduceTransparency: false,
        reduceMotion: false,
        screenReaderOptimized: false,
        hapticFeedbackEnabled: true,
        soundEffectsEnabled: true,
        soundVolume: 0.7,
        readAloudEnabled: false,
        readAloudSpeed: 1.0,
      );
}
