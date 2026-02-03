/**
 * Social Stories Types - ND-1.2
 *
 * Type definitions for the Social Stories Library & Content Service.
 * Following Carol Gray's Social Stories™ framework for evidence-based
 * visual narratives supporting neurodiverse learners.
 */

// Re-export enums from Prisma
export {
  SocialStoryCategory,
  SocialStoryReadingLevel,
  SocialStoryVisualStyle,
  LearningObjectGradeBand,
} from '../prisma-types.js';

// Aliases for backward compatibility
export { SocialStoryReadingLevel as StoryReadingLevel } from '../prisma-types.js';
export { SocialStoryVisualStyle as StoryVisualStyle } from '../prisma-types.js';

// Import for local use in type definitions
import type {
  SocialStoryCategory as SocialStoryCategoryType,
  SocialStoryReadingLevel as SocialStoryReadingLevelType,
  SocialStoryVisualStyle as SocialStoryVisualStyleType,
  LearningObjectGradeBand as LearningObjectGradeBandType,
} from '../prisma-types.js';

/** Trigger types for when a social story should be shown */
export enum StoryTriggerType {
  MANUAL = 'MANUAL',
  TRANSITION = 'TRANSITION',
  SCHEDULE = 'SCHEDULE',
  EMOTIONAL = 'EMOTIONAL',
  ASSIGNMENT = 'ASSIGNMENT',
}

// ══════════════════════════════════════════════════════════════════════════════
// STORY PAGE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Sentence types following Carol Gray's Social Stories framework */
export enum SentenceType {
  DESCRIPTIVE = 'DESCRIPTIVE',
  PERSPECTIVE = 'PERSPECTIVE',
  DIRECTIVE = 'DIRECTIVE',
  AFFIRMATIVE = 'AFFIRMATIVE',
  COOPERATIVE = 'COOPERATIVE',
  CONTROL = 'CONTROL',
  PARTIAL = 'PARTIAL',
}

/** A single sentence within a story page */
export interface StorySentence {
  id: string;
  text: string;
  type: SentenceType;
  audioUrl?: string;
  emphasisWords?: string[];
  personalizationTokens?: string[];
}

/** Visual media for a story page */
export interface StoryVisual {
  id: string;
  type: 'IMAGE' | 'ICON' | 'VIDEO' | 'ANIMATION' | 'LOTTIE';
  url: string;
  altText: string;
  style: SocialStoryVisualStyleType;
  position: 'TOP' | 'CENTER' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'BACKGROUND';
  aspectRatio?: string;
  variants?: Record<string, string>;
}

/** Interactive element on a page */
export interface StoryInteraction {
  id: string;
  type: 'TAP_TO_REVEAL' | 'CHOICE' | 'DRAG' | 'EMOTION_CHECK' | 'PRACTICE';
  config: Record<string, unknown>;
  required: boolean;
}

/** A single page in a social story */
export interface StoryPage {
  id: string;
  pageNumber: number;
  sentences: StorySentence[];
  visual?: StoryVisual;
  interactions?: StoryInteraction[];
  backgroundColor?: string;
  transitionEffect?: 'FADE' | 'SLIDE' | 'NONE';
  audioNarration?: string;
  displayDuration?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY FEATURES
// ══════════════════════════════════════════════════════════════════════════════

/** Accessibility configuration for a story */
export interface StoryAccessibilityFeatures {
  hasAltText: boolean;
  hasAudioNarration: boolean;
  hasTtsSupport: boolean;
  hasHighContrastMode: boolean;
  hasLargeTextMode: boolean;
  hasReducedMotion: boolean;
  supportedLanguages: string[];
  ariaLabels?: Record<string, string>;
}

// ══════════════════════════════════════════════════════════════════════════════
// STORY CREATION & MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

/** Input for creating a new social story */
export interface CreateSocialStoryInput {
  tenantId?: string | null;
  slug: string;
  title: string;
  description?: string;
  category: SocialStoryCategoryType;
  pages: StoryPage[];
  readingLevel?: SocialStoryReadingLevelType;
  estimatedDuration?: number;
  minAge?: number;
  maxAge?: number;
  gradeBands?: LearningObjectGradeBandType[];
  supportsPersonalization?: boolean;
  personalizationTokens?: string[];
  defaultVisualStyle?: SocialStoryVisualStyleType;
  hasAudio?: boolean;
  hasVideo?: boolean;
  accessibilityFeatures?: StoryAccessibilityFeatures;
  translations?: Record<string, TranslatedStoryContent>;
  isBuiltIn?: boolean;
  sourceTemplate?: string;
}

/** Translated content for a story */
export interface TranslatedStoryContent {
  title: string;
  description?: string;
  pages: StoryPage[];
}

/** Input for updating a social story */
export interface UpdateSocialStoryInput {
  title?: string;
  description?: string;
  pages?: StoryPage[];
  readingLevel?: SocialStoryReadingLevelType;
  estimatedDuration?: number;
  minAge?: number;
  maxAge?: number;
  gradeBands?: LearningObjectGradeBandType[];
  supportsPersonalization?: boolean;
  personalizationTokens?: string[];
  defaultVisualStyle?: SocialStoryVisualStyleType;
  hasAudio?: boolean;
  hasVideo?: boolean;
  accessibilityFeatures?: StoryAccessibilityFeatures;
  translations?: Record<string, TranslatedStoryContent>;
  isActive?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// STORY VIEWS & ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

/** Input for recording a story view */
export interface RecordStoryViewInput {
  storyId: string;
  learnerId: string;
  sessionId?: string;
  triggerType: StoryTriggerType;
  triggerContext?: Record<string, unknown>;
  pagesViewed: number;
  totalPages: number;
  completedAt?: Date;
  durationSeconds?: number;
  replayCount?: number;
  audioPlayed?: boolean;
  preEmotionalState?: string;
  postEmotionalState?: string;
  helpfulnessRating?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// STORY ASSIGNMENTS
// ══════════════════════════════════════════════════════════════════════════════

/** Schedule time for story assignment */
export interface ScheduledTime {
  dayOfWeek?: number;
  timeOfDay: string;
  timezone: string;
}

/** Input for creating a story assignment */
export interface CreateAssignmentInput {
  storyId: string;
  learnerId: string;
  priority?: number;
  isRequired?: boolean;
  showBefore?: string[];
  showAfter?: string[];
  scheduledTimes?: ScheduledTime[];
  maxDailyViews?: number;
  minHoursBetween?: number;
  expiresAt?: Date;
  notes?: string;
}

/** Input for updating a story assignment */
export interface UpdateAssignmentInput {
  priority?: number;
  isRequired?: boolean;
  showBefore?: string[];
  showAfter?: string[];
  scheduledTimes?: ScheduledTime[];
  maxDailyViews?: number;
  minHoursBetween?: number;
  isActive?: boolean;
  expiresAt?: Date;
  notes?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER PREFERENCES
// ══════════════════════════════════════════════════════════════════════════════

/** Input for updating learner story preferences */
export interface UpdateLearnerPreferencesInput {
  preferredVisualStyle?: SocialStoryVisualStyleType;
  preferredReadingLevel?: SocialStoryReadingLevelType;
  enableAudio?: boolean;
  enableTts?: boolean;
  ttsVoice?: string;
  ttsSpeed?: number;
  autoAdvance?: boolean;
  pageDisplayTime?: number;
  characterName?: string;
  favoriteColor?: string;
  interests?: string[];
  highContrast?: boolean;
  largeText?: boolean;
  reducedMotion?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// PERSONALIZATION
// ══════════════════════════════════════════════════════════════════════════════

/** Available personalization tokens */
export const PERSONALIZATION_TOKENS = {
  NAME: '{{NAME}}',
  TEACHER: '{{TEACHER}}',
  HELPER: '{{HELPER}}',
  SCHOOL: '{{SCHOOL}}',
  CLASSROOM: '{{CLASSROOM}}',
  FAVORITE_ACTIVITY: '{{FAVORITE_ACTIVITY}}',
  CALM_PLACE: '{{CALM_PLACE}}',
  COMFORT_ITEM: '{{COMFORT_ITEM}}',
  CHARACTER_NAME: '{{CHARACTER_NAME}}',
  BREAK_SIGNAL: '{{BREAK_SIGNAL}}',
  HELP_SIGNAL: '{{HELP_SIGNAL}}',
} as const;

export type PersonalizationToken = keyof typeof PERSONALIZATION_TOKENS;

/** Context for personalizing a story */
export interface PersonalizationContext {
  learnerName?: string;
  teacherName?: string;
  helperName?: string;
  schoolName?: string;
  classroomName?: string;
  favoriteActivity?: string;
  calmPlace?: string;
  comfortItem?: string;
  characterName?: string;
  breakSignal?: string;
  helpSignal?: string;
  customTokens?: Record<string, string>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL VIEW TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Context about what triggered a story view */
export interface StoryTriggerContext {
  triggerType: StoryTriggerType;
  activityType?: string;
  transitionType?: string;
  recommendationScore?: number;
  assignmentId?: string;
  previousActivityId?: string;
  nextActivityId?: string;
}

/** Individual interaction event during story viewing */
export interface StoryInteractionEvent {
  timestamp: Date;
  pageId: string;
  interactionType: string;
  data?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATIONS
// ══════════════════════════════════════════════════════════════════════════════

/** Story recommendation with context */
export interface StoryRecommendation {
  storyId: string;
  story: SocialStoryWithMetadata;
  score: number;
  reason: RecommendationReason;
  context?: Record<string, unknown>;
}

/** Reasons for recommending a story */
export type RecommendationReason =
  | 'TRANSITION_SUPPORT'
  | 'EMOTIONAL_SUPPORT'
  | 'SCHEDULED'
  | 'TEACHER_ASSIGNED'
  | 'FREQUENTLY_HELPFUL'
  | 'SIMILAR_SITUATION'
  | 'NEW_SCENARIO';

/** Context for getting recommendations */
export interface RecommendationContext {
  tenantId: string;
  learnerId: string;
  currentActivityType?: string;
  nextActivityType?: string;
  detectedEmotionalState?: string;
  timeOfDay?: string;
  dayOfWeek?: number;
  recentChallenges?: string[];
  excludeStoryIds?: string[];
  maxResults?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Social story with computed metadata */
export interface SocialStoryWithMetadata {
  id: string;
  tenantId: string | null;
  slug: string;
  title: string;
  description: string | null;
  category: SocialStoryCategoryType;
  pages: StoryPage[];
  readingLevel: SocialStoryReadingLevelType;
  estimatedDuration: number;
  minAge: number | null;
  maxAge: number | null;
  gradeBands: LearningObjectGradeBandType[];
  supportsPersonalization: boolean;
  personalizationTokens: string[];
  defaultVisualStyle: SocialStoryVisualStyleType;
  hasAudio: boolean;
  hasVideo: boolean;
  accessibilityFeatures: StoryAccessibilityFeatures;
  translations: Record<string, TranslatedStoryContent>;
  isBuiltIn: boolean;
  sourceTemplate: string | null;
  version: number;
  isActive: boolean;
  isApproved: boolean;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Computed
  pageCount: number;
  viewCount?: number;
  averageRating?: number;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Learner story statistics */
export interface LearnerStoryStats {
  learnerId: string;
  totalViews: number;
  uniqueStoriesViewed: number;
  completionRate: number;
  averageRating: number | null;
  mostViewedCategory: SocialStoryCategoryType | null;
  recentViews: {
    storyId: string;
    title: string;
    viewedAt: Date;
    completed: boolean;
  }[];
  preferredCategories: SocialStoryCategoryType[];
}

/** Story effectiveness metrics */
export interface StoryEffectivenessMetrics {
  storyId: string;
  totalViews: number;
  completionRate: number;
  averageRating: number | null;
  emotionalImpact: {
    improved: number;
    unchanged: number;
    declined: number;
  };
  replayRate: number;
  averageDuration: number;
}
