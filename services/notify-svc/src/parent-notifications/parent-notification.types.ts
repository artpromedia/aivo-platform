/**
 * ND-3.1: Parent Notification Types
 *
 * Type definitions for the parent notification system with granular controls
 * for urgency levels, frequency, delivery channels, and content types.
 */

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable no-redeclare */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS (Mirror Prisma enums for TypeScript usage)
// ══════════════════════════════════════════════════════════════════════════════

export const ParentNotificationCategory = {
  EMOTIONAL_STATE: 'EMOTIONAL_STATE',
  ACHIEVEMENT: 'ACHIEVEMENT',
  SESSION_ACTIVITY: 'SESSION_ACTIVITY',
  LEARNING_PROGRESS: 'LEARNING_PROGRESS',
  SAFETY_CONCERN: 'SAFETY_CONCERN',
  CARE_TEAM: 'CARE_TEAM',
  GOAL_UPDATE: 'GOAL_UPDATE',
  SYSTEM: 'SYSTEM',
  REMINDER: 'REMINDER',
} as const;

export type ParentNotificationCategory =
  (typeof ParentNotificationCategory)[keyof typeof ParentNotificationCategory];

export const ParentNotificationUrgency = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
} as const;

export type ParentNotificationUrgency =
  (typeof ParentNotificationUrgency)[keyof typeof ParentNotificationUrgency];

export const ParentNotificationStatus = {
  PENDING: 'PENDING',
  SCHEDULED: 'SCHEDULED',
  QUEUED_FOR_DIGEST: 'QUEUED_FOR_DIGEST',
  SENDING: 'SENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ParentNotificationStatus =
  (typeof ParentNotificationStatus)[keyof typeof ParentNotificationStatus];

export const DeliveryChannel = {
  PUSH: 'push',
  EMAIL: 'email',
  SMS: 'sms',
  IN_APP: 'in_app',
} as const;

export type DeliveryChannel = (typeof DeliveryChannel)[keyof typeof DeliveryChannel];

// ══════════════════════════════════════════════════════════════════════════════
// URGENCY SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

export interface UrgencyChannelSettings {
  enabled: boolean;
  channels: DeliveryChannel[];
  bypassQuietHours: boolean;
  bypassDigest: boolean;
  digestOnly?: boolean;
}

export interface UrgencySettings {
  critical: UrgencyChannelSettings;
  high: UrgencyChannelSettings;
  medium: UrgencyChannelSettings;
  low: UrgencyChannelSettings;
  info: UrgencyChannelSettings;
}

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORY SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

export interface EmotionalStateCategorySettings {
  enabled: boolean;
  minUrgency: ParentNotificationUrgency;
  notifyOn: string[]; // ['anxious', 'overwhelmed', 'meltdown_risk']
  includePositive: boolean;
}

export interface AchievementCategorySettings {
  enabled: boolean;
  minUrgency: ParentNotificationUrgency;
  notifyOn: string[]; // ['badge_earned', 'level_up', 'streak_milestone', 'goal_completed']
}

export interface SessionActivityCategorySettings {
  enabled: boolean;
  notifyOnStart: boolean;
  notifyOnComplete: boolean;
  includeSummary: boolean;
}

export interface LearningProgressCategorySettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  includeStrengths: boolean;
  includeChallenges: boolean;
}

export interface SafetyConcernCategorySettings {
  enabled: boolean;
  alwaysNotify: boolean;
  channels: DeliveryChannel[];
}

export interface GoalUpdateCategorySettings {
  enabled: boolean;
  digestOnly: boolean;
}

export interface SystemCategorySettings {
  enabled: boolean;
  digestOnly: boolean;
}

export interface CategorySettings {
  emotional_state: EmotionalStateCategorySettings;
  achievements: AchievementCategorySettings;
  session_activity: SessionActivityCategorySettings;
  learning_progress: LearningProgressCategorySettings;
  safety_concerns: SafetyConcernCategorySettings;
  goal_update: GoalUpdateCategorySettings;
  care_team: { enabled: boolean };
  system: SystemCategorySettings;
}

// ══════════════════════════════════════════════════════════════════════════════
// DEVICE TOKEN
// ══════════════════════════════════════════════════════════════════════════════

export interface PushDeviceToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
  model?: string;
  registeredAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PREFERENCES
// ══════════════════════════════════════════════════════════════════════════════

export interface ParentNotificationPreferencesData {
  id: string;
  parentId: string;
  learnerId: string;
  tenantId: string;

  // Global settings
  notificationsEnabled: boolean;

  // Urgency & category settings
  urgencySettings: UrgencySettings;
  categorySettings: CategorySettings;

  // Delivery preferences
  preferredChannels: DeliveryChannel[];

  // Push settings
  pushEnabled: boolean;
  pushDeviceTokens: PushDeviceToken[];

  // Email settings
  emailEnabled: boolean;
  emailAddress?: string;
  emailFormat: 'html' | 'plain' | 'brief';

  // SMS settings
  smsEnabled: boolean;
  smsPhoneNumber?: string;
  smsForCriticalOnly: boolean;

  // In-app settings
  inAppEnabled: boolean;
  inAppBadgeCount: boolean;

  // Timing preferences
  timezone: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursWeekendOnly: boolean;

  // Digest settings
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | 'none';
  digestTime: string;
  digestDayOfWeek?: number;
  digestIncludeDetails: boolean;

  // Rate limiting
  maxNotificationsPerHour: number;
  maxNotificationsPerDay: number;
  cooldownMinutes: number;

  // Language & format
  language: string;
  useSimpleLanguage: boolean;
  includeActionItems: boolean;
  includeResources: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION PAYLOAD
// ══════════════════════════════════════════════════════════════════════════════

export interface NotificationPayload {
  parentId: string;
  learnerId: string;
  tenantId: string;
  category: ParentNotificationCategory;
  event: string;
  eventId?: string;
  sessionId?: string;
  data: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION CONTENT
// ══════════════════════════════════════════════════════════════════════════════

export interface NotificationRichContent {
  headline?: string;
  details?: string;
  highlights?: string[];
  actionItems?: string[];
  resources?: { title: string; url: string }[];
  childName?: string;
  timestamp?: string;
  emotionalContext?: {
    state: string;
    intensity: number;
    trend: string;
  };
}

export interface NotificationContent {
  title: string;
  body: string;
  richContent?: NotificationRichContent;
  actionUrl?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION QUEUE ENTRY
// ══════════════════════════════════════════════════════════════════════════════

export interface ParentNotificationQueueEntry {
  id: string;
  parentId: string;
  learnerId: string;
  tenantId: string;
  category: ParentNotificationCategory;
  urgency: ParentNotificationUrgency;
  title: string;
  body: string;
  richContent?: NotificationRichContent;
  actionUrl?: string;
  sourceEvent: string;
  sourceEventId?: string;
  relatedSessionId?: string;
  status: ParentNotificationStatus;
  scheduledFor?: Date;
  digestEligible: boolean;
  addedToDigest: boolean;
  channels: DeliveryChannel[];
  deliveredVia: DeliveryChannel[];
  deliveredAt?: Date;
  readAt?: Date;
  similarNotificationKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// DIGEST
// ══════════════════════════════════════════════════════════════════════════════

export interface DigestNotificationSummary {
  id: string;
  category: ParentNotificationCategory;
  urgency: ParentNotificationUrgency;
  title: string;
  body: string;
  sourceEvent: string;
  createdAt: string;
}

export interface DigestSummary {
  totalSessions: number;
  totalMinutes: number;
  achievements: number;
  emotionalStateEvents: number;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

export interface ParentNotificationDigestData {
  id: string;
  parentId: string;
  learnerId: string;
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  digestType: 'daily' | 'weekly';
  notifications: DigestNotificationSummary[];
  summary: DigestSummary;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  sentVia: DeliveryChannel[];
  createdAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// DELIVERY LOG
// ══════════════════════════════════════════════════════════════════════════════

export interface ParentNotificationLogEntry {
  id: string;
  notificationId?: string;
  digestId?: string;
  parentId: string;
  learnerId: string;
  tenantId: string;
  channel: DeliveryChannel;
  status: 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  metadata?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENTS (For NATS subscriptions)
// ══════════════════════════════════════════════════════════════════════════════

export interface EmotionalStateAlertEvent {
  sessionId: string;
  learnerId: string;
  tenantId: string;
  state: string;
  intensity: number;
  urgency: string;
  trend?: string;
  suggestedInterventions?: { name: string; type: string }[];
}

export interface SessionCompletedEvent {
  sessionId: string;
  learnerId: string;
  tenantId: string;
  summary: {
    durationMinutes: number;
    contentCompleted: number;
    xpEarned: number;
    badgesEarned?: string[];
    streakMaintained?: boolean;
    emotionalSummary?: string;
  };
}

export interface AchievementEvent {
  learnerId: string;
  tenantId: string;
  badgeId?: string;
  badgeName?: string;
  badgeDescription?: string;
  newLevel?: number;
  streakDays?: number;
}

export interface SafetyConcernEvent {
  learnerId: string;
  tenantId: string;
  sessionId?: string;
  concernType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
}

export interface GoalUpdateEvent {
  learnerId: string;
  tenantId: string;
  goalId: string;
  objectiveId: string;
  goalTitle: string;
  objectiveTitle: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATIONS
// ══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_URGENCY_SETTINGS: UrgencySettings = {
  critical: {
    enabled: true,
    channels: ['push', 'sms', 'email'],
    bypassQuietHours: true,
    bypassDigest: true,
  },
  high: {
    enabled: true,
    channels: ['push', 'email'],
    bypassQuietHours: false,
    bypassDigest: true,
  },
  medium: {
    enabled: true,
    channels: ['push'],
    bypassQuietHours: false,
    bypassDigest: false,
  },
  low: {
    enabled: true,
    channels: [],
    bypassQuietHours: false,
    bypassDigest: false,
    digestOnly: true,
  },
  info: {
    enabled: false,
    channels: [],
    bypassQuietHours: false,
    bypassDigest: false,
    digestOnly: true,
  },
};

export const DEFAULT_CATEGORY_SETTINGS: CategorySettings = {
  emotional_state: {
    enabled: true,
    minUrgency: ParentNotificationUrgency.MEDIUM,
    notifyOn: ['anxious', 'highly_anxious', 'overwhelmed', 'meltdown_risk', 'shutdown_risk'],
    includePositive: false,
  },
  achievements: {
    enabled: true,
    minUrgency: ParentNotificationUrgency.LOW,
    notifyOn: ['badge_earned', 'level_up', 'streak_milestone'],
  },
  session_activity: {
    enabled: true,
    notifyOnStart: false,
    notifyOnComplete: true,
    includeSummary: true,
  },
  learning_progress: {
    enabled: true,
    frequency: 'weekly',
    includeStrengths: true,
    includeChallenges: true,
  },
  safety_concerns: {
    enabled: true,
    alwaysNotify: true,
    channels: ['push', 'sms', 'email'],
  },
  goal_update: {
    enabled: true,
    digestOnly: false,
  },
  care_team: {
    enabled: true,
  },
  system: {
    enabled: true,
    digestOnly: true,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get urgency level as a numeric value for comparison
 */
export function getUrgencyLevel(urgency: ParentNotificationUrgency): number {
  const levels: Record<ParentNotificationUrgency, number> = {
    [ParentNotificationUrgency.INFO]: 0,
    [ParentNotificationUrgency.LOW]: 1,
    [ParentNotificationUrgency.MEDIUM]: 2,
    [ParentNotificationUrgency.HIGH]: 3,
    [ParentNotificationUrgency.CRITICAL]: 4,
  };
  return levels[urgency] ?? 0;
}

/**
 * Check if urgency meets a minimum threshold
 */
export function meetsUrgencyThreshold(
  actual: ParentNotificationUrgency,
  minimum: ParentNotificationUrgency
): boolean {
  return getUrgencyLevel(actual) >= getUrgencyLevel(minimum);
}

/**
 * Check if a state is considered positive
 */
export function isPositiveState(state: string): boolean {
  const positiveStates = [
    'calm',
    'focused',
    'engaged',
    'happy',
    'excited',
    'proud',
    'curious',
    'confident',
  ];
  return positiveStates.includes(state.toLowerCase());
}

/**
 * Format emotional state for display
 */
export function formatEmotionalState(state: string): string {
  const stateLabels: Record<string, string> = {
    anxious: 'anxiety',
    highly_anxious: 'significant anxiety',
    overwhelmed: 'feeling overwhelmed',
    frustrated: 'frustration',
    highly_frustrated: 'significant frustration',
    stressed: 'stress',
    meltdown_risk: 'distress',
    shutdown_risk: 'shutting down',
    calm: 'calm and focused',
    engaged: 'engaged and happy',
    focused: 'focused',
    happy: 'happy',
    curious: 'curious',
    confident: 'confident',
  };
  return stateLabels[state.toLowerCase()] ?? state;
}
