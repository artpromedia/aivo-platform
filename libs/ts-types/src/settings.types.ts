/**
 * Settings Types
 *
 * Comprehensive type definitions for settings and parental controls.
 * Supports COPPA/GDPR compliance, WCAG 2.1 AA accessibility, and
 * cross-device synchronization.
 *
 * @packageDocumentation
 */

// ============================================================================
// PARENTAL CONTROLS
// ============================================================================

/**
 * Screen time management settings
 * Controls daily limits, schedules, and break reminders
 */
export interface ScreenTimeSettings {
  /** Daily screen time limit in minutes */
  dailyLimit: number;
  /** Whether scheduled access is enabled */
  scheduleEnabled: boolean;
  /** Daily schedule by day of week */
  schedule: Record<
    'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
    DailySchedule
  >;
  /** Whether to show break reminders */
  breakReminders: boolean;
  /** Minutes between break reminders */
  breakInterval: number;
  /** Break duration in minutes */
  breakDuration: number;
}

/**
 * Daily schedule for a single day
 */
export interface DailySchedule {
  /** Whether this day's schedule is enabled */
  enabled: boolean;
  /** Start time in HH:MM format */
  start: string;
  /** End time in HH:MM format */
  end: string;
}

/**
 * Content filtering settings
 * Controls what content is accessible to the learner
 */
export interface ContentFilterSettings {
  /** Content restriction level */
  restrictionLevel: 'strict' | 'moderate' | 'minimal';
  /** Block external links in content */
  blockExternalLinks: boolean;
  /** Enable safe search for any search functionality */
  safeSearch: boolean;
  /** Hide achievement leaderboards (for privacy) */
  hideAchievementLeaderboards: boolean;
  /** Restrict chat/messaging features */
  restrictChat: boolean;
  /** Topics explicitly blocked */
  blockedTopics: string[];
  /** Topics explicitly allowed (overrides restrictions) */
  allowedTopics: string[];
}

/**
 * Subject access controls
 * Controls which subjects and levels are accessible
 */
export interface SubjectAccessSettings {
  /** Per-subject access configuration */
  subjects: Record<string, SubjectConfig>;
  /** Require parent approval before accessing new subjects */
  requireParentApprovalForNewSubjects: boolean;
  /** Allow access to advanced/accelerated content */
  allowAdvancedContent: boolean;
}

/**
 * Configuration for a single subject
 */
export interface SubjectConfig {
  /** Whether the subject is enabled */
  enabled: boolean;
  /** Maximum level allowed (optional cap) */
  maxLevel?: number;
}

/**
 * Privacy and safety settings
 */
export interface SafetySettings {
  /** Privacy visibility settings */
  privacy: PrivacySettings;
  /** Data collection preferences (GDPR/COPPA) */
  data: DataPreferences;
  /** Access control settings */
  access: AccessControlSettings;
  /** Emergency contact settings */
  emergency: EmergencySettings;
}

/**
 * Privacy visibility settings
 */
export interface PrivacySettings {
  /** Hide learner from classmate lists */
  hideFromClassmates: boolean;
  /** Hide profile photo */
  hideProfilePhoto: boolean;
  /** Hide progress from other students */
  hideProgress: boolean;
  /** Enable anonymous mode for social features */
  anonymousMode: boolean;
}

/**
 * Data collection preferences (COPPA/GDPR compliant)
 */
export interface DataPreferences {
  /** Allow analytics collection */
  allowAnalytics: boolean;
  /** Allow AI personalization */
  allowPersonalization: boolean;
  /** Allow third-party data sharing */
  allowThirdPartySharing: boolean;
}

/**
 * Access control settings
 */
export interface AccessControlSettings {
  /** Require PIN for changing parental control settings */
  requirePinForSettings: boolean;
  /** Hashed PIN (never store plaintext) */
  pinHash?: string;
  /** Salt for PIN hashing */
  pinSalt?: string;
  /** Allow account deletion by learner */
  allowAccountDeletion: boolean;
  /** Two-factor authentication enabled */
  twoFactorEnabled: boolean;
}

/**
 * Emergency contact settings
 */
export interface EmergencySettings {
  /** Emergency contact feature enabled */
  emergencyContactEnabled: boolean;
  /** Emergency contact email */
  emergencyEmail?: string;
  /** Emergency contact phone */
  emergencyPhone?: string;
}

/**
 * Complete parental controls configuration
 */
export interface ParentalControlSettings {
  /** Screen time management */
  screenTime: ScreenTimeSettings;
  /** Content filtering */
  contentFilter: ContentFilterSettings;
  /** Subject access controls */
  subjectAccess: SubjectAccessSettings;
  /** Notification preferences */
  notifications: NotificationSettings;
  /** Safety and privacy settings */
  safety: SafetySettings;
}

// ============================================================================
// NOTIFICATION SETTINGS
// ============================================================================

/**
 * Email notification preferences
 */
export interface EmailNotificationSettings {
  /** Master email toggle */
  enabled: boolean;
  /** Daily digest email */
  dailyDigest: boolean;
  /** Weekly report email */
  weeklyReport: boolean;
  /** Achievement notifications */
  achievements: boolean;
  /** Concern/issue notifications */
  concerns: boolean;
  /** Teacher message notifications */
  teacherMessages: boolean;
}

/**
 * Push notification preferences
 */
export interface PushNotificationSettings {
  /** Master push toggle */
  enabled: boolean;
  /** Achievement notifications */
  achievements: boolean;
  /** Milestone notifications */
  milestones: boolean;
  /** Concern notifications */
  concerns: boolean;
  /** Teacher message notifications */
  teacherMessages: boolean;
  /** Screen time limit alerts */
  screenTimeAlerts: boolean;
}

/**
 * In-app notification preferences
 */
export interface InAppNotificationSettings {
  /** Master in-app toggle */
  enabled: boolean;
  /** Achievement notifications */
  achievements: boolean;
  /** Progress notifications */
  progress: boolean;
  /** Recommendation notifications */
  recommendations: boolean;
}

/**
 * Quiet hours configuration
 */
export interface QuietHoursSettings {
  /** Quiet hours enabled */
  enabled: boolean;
  /** Start time in HH:MM format */
  start: string;
  /** End time in HH:MM format */
  end: string;
}

/**
 * Complete notification settings
 */
export interface NotificationSettings {
  /** Email notification preferences */
  email: EmailNotificationSettings;
  /** Push notification preferences */
  push: PushNotificationSettings;
  /** In-app notification preferences */
  inApp: InAppNotificationSettings;
  /** Quiet hours configuration */
  quietHours: QuietHoursSettings;
}

// ============================================================================
// ACCESSIBILITY SETTINGS
// ============================================================================

/**
 * Color blind mode options
 */
export type ColorBlindMode =
  | 'none'
  | 'protanopia' // Red-blind
  | 'deuteranopia' // Green-blind
  | 'tritanopia' // Blue-blind
  | 'achromatopsia'; // Total color blindness

/**
 * Text size presets
 */
export type TextSizePreset = 'small' | 'default' | 'large' | 'extra-large';

/**
 * Accessibility settings for visual, motor, and sensory accommodations
 * Compliant with WCAG 2.1 AA standards
 */
export interface AccessibilitySettings {
  // Visual accommodations
  /** Text scale factor (1.0 = 100%, 1.5 = 150%, etc.) */
  textScaleFactor: number;
  /** Enable high contrast mode */
  highContrast: boolean;
  /** Enable bold text throughout */
  boldText: boolean;
  /** Color blind mode selection */
  colorBlindMode: ColorBlindMode;
  /** Reduce transparency/blur effects */
  reduceTransparency: boolean;

  // Motion accommodations
  /** Reduce motion/animations (prefers-reduced-motion) */
  reduceMotion: boolean;

  // Screen reader support
  /** Optimize UI for screen readers */
  screenReaderOptimized: boolean;

  // Audio/sensory accommodations
  /** Enable haptic feedback */
  hapticFeedbackEnabled: boolean;
  /** Enable sound effects */
  soundEffectsEnabled: boolean;
  /** Sound volume (0.0 - 1.0) */
  soundVolume: number;
  /** Enable read-aloud feature */
  readAloudEnabled: boolean;
  /** Read-aloud speed (0.5 - 2.0) */
  readAloudSpeed: number;
}

// ============================================================================
// APP SETTINGS
// ============================================================================

/**
 * Theme mode options
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Supported locales
 */
export type Locale = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ja' | 'ko' | 'ar' | 'hi';

/**
 * General app settings
 */
export interface AppSettings {
  /** User's preferred locale */
  locale: Locale;
  /** Theme mode preference */
  themeMode: ThemeMode;
  /** Timezone (IANA format, e.g., 'America/New_York') */
  timezone: string;
}

// ============================================================================
// PARENT SETTINGS (COMBINED)
// ============================================================================

/**
 * Complete parent settings including profile and preferences
 */
export interface ParentSettings {
  /** Parent profile information */
  profile: ParentProfileSettings;
  /** General app settings */
  app: AppSettings;
  /** Notification preferences */
  notifications: NotificationSettings;
}

/**
 * Parent profile settings
 */
export interface ParentProfileSettings {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

// ============================================================================
// LEARNER SETTINGS (COMBINED)
// ============================================================================

/**
 * Complete learner settings
 */
export interface LearnerSettings {
  /** General app settings */
  app: AppSettings;
  /** Accessibility settings */
  accessibility: AccessibilitySettings;
  /** Learning preferences */
  learning: LearningPreferences;
}

/**
 * Learning preference settings
 */
export interface LearningPreferences {
  /** Preferred learning style */
  preferredStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  /** Daily goal in minutes */
  dailyGoalMinutes: number;
  /** Show hints automatically */
  autoShowHints: boolean;
  /** Preferred difficulty */
  preferredDifficulty: 'easier' | 'normal' | 'challenging';
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Request to update parental controls
 */
export interface UpdateParentalControlsRequest<
  K extends keyof ParentalControlSettings = keyof ParentalControlSettings,
> {
  /** Child/student ID */
  childId: string;
  /** Section being updated */
  section: K;
  /** New settings for that section */
  settings: ParentalControlSettings[K];
}

/**
 * Request to verify PIN
 */
export interface VerifyPinRequest {
  /** PIN to verify */
  pin: string;
  /** Action being performed (for audit) */
  action: string;
}

/**
 * Response from PIN verification
 */
export interface VerifyPinResponse {
  /** Whether PIN is correct */
  valid: boolean;
  /** Temporary token for subsequent protected operations */
  token?: string;
  /** Token expiry time */
  expiresAt?: string;
  /** Remaining attempts before lockout */
  remainingAttempts?: number;
}

/**
 * Request to set/update PIN
 */
export interface SetPinRequest {
  /** New PIN (4-6 digits) */
  newPin: string;
  /** Current PIN (required if updating) */
  currentPin?: string;
}

/**
 * Request to update accessibility settings
 */
export interface UpdateAccessibilityRequest {
  settings: Partial<AccessibilitySettings>;
}

/**
 * Settings sync metadata
 */
export interface SettingsSyncMetadata {
  /** Last sync timestamp */
  lastSyncedAt: string;
  /** Device that last modified */
  lastModifiedBy: string;
  /** Settings version for conflict resolution */
  version: number;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default screen time settings
 */
export const DEFAULT_SCREEN_TIME_SETTINGS: ScreenTimeSettings = {
  dailyLimit: 120, // 2 hours
  scheduleEnabled: false,
  schedule: {
    monday: { enabled: true, start: '08:00', end: '20:00' },
    tuesday: { enabled: true, start: '08:00', end: '20:00' },
    wednesday: { enabled: true, start: '08:00', end: '20:00' },
    thursday: { enabled: true, start: '08:00', end: '20:00' },
    friday: { enabled: true, start: '08:00', end: '20:00' },
    saturday: { enabled: true, start: '09:00', end: '21:00' },
    sunday: { enabled: true, start: '09:00', end: '21:00' },
  },
  breakReminders: true,
  breakInterval: 30,
  breakDuration: 5,
};

/**
 * Default content filter settings
 */
export const DEFAULT_CONTENT_FILTER_SETTINGS: ContentFilterSettings = {
  restrictionLevel: 'moderate',
  blockExternalLinks: true,
  safeSearch: true,
  hideAchievementLeaderboards: false,
  restrictChat: true,
  blockedTopics: [],
  allowedTopics: [],
};

/**
 * Default accessibility settings
 */
export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  textScaleFactor: 1.0,
  highContrast: false,
  boldText: false,
  colorBlindMode: 'none',
  reduceTransparency: false,
  reduceMotion: false,
  screenReaderOptimized: false,
  hapticFeedbackEnabled: true,
  soundEffectsEnabled: true,
  soundVolume: 0.7,
  readAloudEnabled: false,
  readAloudSpeed: 1.0,
};

/**
 * Default notification settings
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email: {
    enabled: true,
    dailyDigest: false,
    weeklyReport: true,
    achievements: true,
    concerns: true,
    teacherMessages: true,
  },
  push: {
    enabled: true,
    achievements: true,
    milestones: true,
    concerns: true,
    teacherMessages: true,
    screenTimeAlerts: true,
  },
  inApp: {
    enabled: true,
    achievements: true,
    progress: true,
    recommendations: true,
  },
  quietHours: {
    enabled: false,
    start: '21:00',
    end: '07:00',
  },
};
