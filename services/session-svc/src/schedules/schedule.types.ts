/**
 * Visual Schedule Types - ND-1.3
 *
 * Type definitions for the Visual Schedule system.
 * Provides predictable visual schedules for neurodiverse learners,
 * helping them understand daily activities and reduce transition anxiety.
 */

// Re-export enums from Prisma client
export { ScheduleType, ScheduleDisplayStyle } from '@prisma/client';

// Import for local use in type definitions
import type {
  ScheduleType as ScheduleTypeEnum,
  ScheduleDisplayStyle as ScheduleDisplayStyleEnum,
  VisualSchedule,
  ScheduleTemplate,
  SchedulePreferences,
} from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE ITEM TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Types of items that can appear in a schedule */
export type ScheduleItemType =
  | 'activity'
  | 'break'
  | 'transition'
  | 'reward'
  | 'meal'
  | 'custom';

/** Status of a schedule item */
export type ScheduleItemStatus =
  | 'upcoming'
  | 'current'
  | 'completed'
  | 'skipped'
  | 'in_progress';

/** A single item in a visual schedule */
export interface ScheduleItem {
  id: string;
  title: string;
  type: ScheduleItemType;
  status: ScheduleItemStatus;
  scheduledTime?: string; // HH:mm format
  estimatedDuration: number; // minutes
  actualDuration?: number;
  activityId?: string;
  activityType?: string;
  icon: string;
  color: string;
  image?: string;
  symbolUrl?: string; // For AAC/symbol-based communication
  isFlexible: boolean;
  notes?: string;
  completedAt?: string;
  subItems?: ScheduleSubItem[]; // For breaking down activities into steps
}

/** Sub-item for breaking down activities into smaller steps */
export interface ScheduleSubItem {
  id: string;
  title: string;
  icon?: string;
  completed: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE CREATION
// ══════════════════════════════════════════════════════════════════════════════

/** Input for creating a new schedule */
export interface CreateScheduleInput {
  learnerId: string;
  tenantId: string;
  date: Date;
  type?: ScheduleTypeEnum;
  items: Omit<ScheduleItem, 'id' | 'status'>[];
  displayStyle?: ScheduleDisplayStyleEnum;
  showTimes?: boolean;
  showDuration?: boolean;
  showImages?: boolean;
  useSymbols?: boolean;
  generatedBy?: string;
}

/** Input for updating a schedule */
export interface UpdateScheduleInput {
  items?: ScheduleItem[];
  displayStyle?: ScheduleDisplayStyleEnum;
  showTimes?: boolean;
  showDuration?: boolean;
  showImages?: boolean;
  useSymbols?: boolean;
  currentItemIndex?: number;
  completedCount?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE PROGRESS
// ══════════════════════════════════════════════════════════════════════════════

/** Progress information for a schedule */
export interface ScheduleProgress {
  completed: number;
  total: number;
  percentComplete: number;
}

/** Schedule with computed progress and current state */
export interface ScheduleWithProgress {
  schedule: VisualSchedule;
  items: ScheduleItem[];
  currentItem: ScheduleItem | null;
  nextItem: ScheduleItem | null;
  progress: ScheduleProgress;
  timeUntilNext?: number; // minutes
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

/** Template item (times are relative to session start) */
export interface ScheduleTemplateItem {
  title: string;
  type: ScheduleItemType;
  relativeTime?: number; // minutes from session start
  estimatedDuration: number;
  activityType?: string;
  icon: string;
  color: string;
  image?: string;
  symbolUrl?: string;
  isFlexible: boolean;
  notes?: string;
}

/** Input for creating a schedule template */
export interface CreateTemplateInput {
  tenantId: string;
  name: string;
  description?: string;
  items: ScheduleTemplateItem[];
  targetAgeMin?: number;
  targetAgeMax?: number;
  dayOfWeek?: number[];
  displayStyle?: ScheduleDisplayStyleEnum;
  showTimes?: boolean;
  isDefault?: boolean;
  createdBy: string;
}

/** Input for updating a template */
export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  items?: ScheduleTemplateItem[];
  targetAgeMin?: number | null;
  targetAgeMax?: number | null;
  dayOfWeek?: number[];
  displayStyle?: ScheduleDisplayStyleEnum;
  showTimes?: boolean;
  isDefault?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE PREFERENCES
// ══════════════════════════════════════════════════════════════════════════════

/** Input for updating learner schedule preferences */
export interface UpdatePreferencesInput {
  preferredStyle?: ScheduleDisplayStyleEnum;
  showTimes?: boolean;
  showDuration?: boolean;
  showImages?: boolean;
  useSymbols?: boolean;
  showCountdownToNext?: boolean;
  warnBeforeTransition?: boolean;
  transitionWarningMinutes?: number;
  iconSize?: 'small' | 'medium' | 'large';
  colorCoding?: boolean;
  highContrast?: boolean;
  announceItems?: boolean;
  playChimeOnChange?: boolean;
  celebrateCompletion?: boolean;
  showProgressBar?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION SCHEDULE GENERATION
// ══════════════════════════════════════════════════════════════════════════════

/** Activity info for session schedule generation */
export interface SessionActivity {
  id: string;
  type: string;
  title: string;
  estimatedMinutes: number;
  thumbnail?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY BREAKDOWNS
// ══════════════════════════════════════════════════════════════════════════════

/** Predefined activity breakdowns by type */
export const ACTIVITY_BREAKDOWNS: Record<string, ScheduleSubItem[]> = {
  lesson: [
    { id: '1', title: 'Watch or read', icon: 'visibility', completed: false },
    { id: '2', title: 'Think about it', icon: 'psychology', completed: false },
    { id: '3', title: 'Try the practice', icon: 'edit', completed: false },
    { id: '4', title: 'Check your work', icon: 'check_circle', completed: false },
  ],
  quiz: [
    { id: '1', title: 'Read the question', icon: 'article', completed: false },
    { id: '2', title: 'Think of answer', icon: 'psychology', completed: false },
    { id: '3', title: 'Pick your choice', icon: 'touch_app', completed: false },
    { id: '4', title: 'Move to next', icon: 'arrow_forward', completed: false },
  ],
  video: [
    { id: '1', title: 'Press play', icon: 'play_circle', completed: false },
    { id: '2', title: 'Watch and listen', icon: 'visibility', completed: false },
    { id: '3', title: 'Answer questions', icon: 'quiz', completed: false },
  ],
  interactive: [
    { id: '1', title: 'Read instructions', icon: 'article', completed: false },
    { id: '2', title: 'Try the activity', icon: 'games', completed: false },
    { id: '3', title: 'Keep trying!', icon: 'refresh', completed: false },
    { id: '4', title: 'Finish up', icon: 'flag', completed: false },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// ICON AND COLOR MAPPINGS
// ══════════════════════════════════════════════════════════════════════════════

/** Default icons for activity types */
export const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  lesson: 'menu_book',
  video: 'play_circle',
  quiz: 'quiz',
  assessment: 'assignment',
  interactive: 'games',
  practice: 'edit',
  review: 'replay',
  reading: 'auto_stories',
  writing: 'edit_note',
  math: 'calculate',
  science: 'science',
  art: 'palette',
  music: 'music_note',
  break: 'coffee',
  transition: 'swap_horiz',
  reward: 'celebration',
  meal: 'restaurant',
};

/** Default colors for activity types */
export const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  lesson: '#4CAF50',
  video: '#2196F3',
  quiz: '#FF9800',
  assessment: '#F44336',
  interactive: '#9C27B0',
  practice: '#00BCD4',
  review: '#607D8B',
  reading: '#8BC34A',
  writing: '#3F51B5',
  math: '#E91E63',
  science: '#009688',
  art: '#FF5722',
  music: '#673AB7',
  break: '#8BC34A',
  transition: '#9E9E9E',
  reward: '#FFD700',
  meal: '#795548',
};

// ══════════════════════════════════════════════════════════════════════════════
// RE-EXPORT PRISMA TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type { VisualSchedule, ScheduleTemplate, SchedulePreferences };
