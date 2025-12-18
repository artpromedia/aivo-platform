/**
 * Session Structure - ND-2.2
 *
 * Utilities for building and managing predictable session structures.
 * Handles session templates, outline generation, and progress tracking.
 */

import type {
  SessionStructureDefinition,
  SessionOutlineItem,
  SessionActivityInput,
  SessionRoutineData,
  SessionPhase,
  OutlineItemStatus,
} from './predictability.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULT STRUCTURE TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Default session structure for predictable sessions
 */
export const DEFAULT_SESSION_STRUCTURE: SessionStructureDefinition = {
  welcome: {
    routineId: 'system_welcome',
    required: true,
  },
  checkin: {
    routineId: 'system_checkin',
    required: true,
  },
  mainContent: {
    minActivities: 1,
    maxActivities: 5,
    breakAfterActivities: 2,
  },
  breaks: {
    routineId: 'system_break',
    minDurationMinutes: 1,
  },
  goodbye: {
    routineId: 'system_goodbye',
    required: true,
  },
};

/**
 * Minimal session structure (less scaffolding)
 */
export const MINIMAL_SESSION_STRUCTURE: SessionStructureDefinition = {
  mainContent: {
    minActivities: 1,
    maxActivities: 10,
    breakAfterActivities: 4,
  },
  goodbye: {
    routineId: 'system_goodbye',
    required: false,
  },
};

/**
 * High-support session structure (maximum scaffolding)
 */
export const HIGH_SUPPORT_SESSION_STRUCTURE: SessionStructureDefinition = {
  welcome: {
    routineId: 'system_welcome',
    required: true,
  },
  checkin: {
    routineId: 'system_checkin',
    required: true,
  },
  mainContent: {
    minActivities: 1,
    maxActivities: 3,
    breakAfterActivities: 1, // Break after every activity
  },
  breaks: {
    routineId: 'system_break',
    minDurationMinutes: 2,
  },
  goodbye: {
    routineId: 'system_goodbye',
    required: true,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// OUTLINE BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

export interface OutlineBuilderOptions {
  welcomeRoutine?: SessionRoutineData;
  checkInRoutine?: SessionRoutineData;
  breakRoutine?: SessionRoutineData;
  goodbyeRoutine?: SessionRoutineData;
  breakAfterActivities?: number;
  warnAboutNewContent?: boolean;
}

/**
 * Build a session outline from activities and routines
 */
export function buildSessionOutline(
  activities: SessionActivityInput[],
  options: OutlineBuilderOptions
): SessionOutlineItem[] {
  const outline: SessionOutlineItem[] = [];
  const breakAfterActivities = options.breakAfterActivities ?? 2;

  // Add welcome routine
  if (options.welcomeRoutine) {
    outline.push(createRoutineOutlineItem('welcome', 'Welcome', options.welcomeRoutine, {
      icon: 'waving_hand',
      color: '#4CAF50',
    }));
  }

  // Add check-in routine
  if (options.checkInRoutine) {
    outline.push(createRoutineOutlineItem('checkin', 'How are you feeling?', options.checkInRoutine, {
      icon: 'mood',
      color: '#2196F3',
    }));
  }

  // Add activities with breaks
  let activityCount = 0;
  for (const activity of activities) {
    outline.push(createActivityOutlineItem(activity, options.warnAboutNewContent));
    activityCount++;

    // Add break after every N activities (except last)
    if (
      options.breakRoutine &&
      activityCount % breakAfterActivities === 0 &&
      activityCount < activities.length
    ) {
      outline.push(createBreakOutlineItem(`break_${activityCount}`, options.breakRoutine));
    }
  }

  // Add goodbye routine
  if (options.goodbyeRoutine) {
    outline.push(createRoutineOutlineItem('goodbye', 'All Done!', options.goodbyeRoutine, {
      icon: 'celebration',
      color: '#FFD700',
    }));
  }

  return outline;
}

/**
 * Create a routine outline item
 */
function createRoutineOutlineItem(
  id: string,
  title: string,
  routine: SessionRoutineData,
  display: { icon: string; color: string }
): SessionOutlineItem {
  return {
    id,
    title,
    type: 'routine',
    estimatedMinutes: Math.ceil(routine.totalDurationSeconds / 60),
    status: 'upcoming',
    icon: display.icon,
    color: display.color,
  };
}

/**
 * Create an activity outline item
 */
function createActivityOutlineItem(
  activity: SessionActivityInput,
  warnAboutNew?: boolean
): SessionOutlineItem {
  return {
    id: `activity_${activity.id}`,
    title: activity.title,
    type: 'activity',
    estimatedMinutes: activity.estimatedMinutes,
    status: 'upcoming',
    icon: getActivityIcon(activity.type),
    color: getActivityColor(activity.type),
    isNew: activity.isNew,
    description: warnAboutNew && activity.isNew ? 'New content!' : undefined,
  };
}

/**
 * Create a break outline item
 */
function createBreakOutlineItem(id: string, breakRoutine: SessionRoutineData): SessionOutlineItem {
  return {
    id,
    title: 'Quick Break',
    type: 'break',
    estimatedMinutes: Math.ceil(breakRoutine.totalDurationSeconds / 60),
    status: 'upcoming',
    icon: 'self_improvement',
    color: '#8BC34A',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS TRACKING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Update outline item statuses based on current item
 */
export function updateOutlineProgress(
  outline: SessionOutlineItem[],
  currentItemId: string
): { outline: SessionOutlineItem[]; phase: SessionPhase; activityIndex: number } {
  let foundCurrent = false;
  let phase: SessionPhase = 'main';
  let activityIndex = -1;

  const updatedOutline = outline.map((item) => {
    const updatedItem = { ...item };

    if (item.id === currentItemId) {
      updatedItem.status = 'current';
      foundCurrent = true;

      // Determine phase
      if (item.id === 'welcome') phase = 'welcome';
      else if (item.id === 'checkin') phase = 'checkin';
      else if (item.id === 'goodbye') phase = 'goodbye';
      else if (item.type === 'break') phase = 'break';
      else phase = 'main';

      // Track activity index
      if (item.type === 'activity') {
        activityIndex = outline
          .filter((i) => i.type === 'activity')
          .findIndex((i) => i.id === currentItemId);
      }
    } else if (!foundCurrent) {
      updatedItem.status = 'completed';
    } else {
      updatedItem.status = 'upcoming';
    }

    return updatedItem;
  });

  return { outline: updatedOutline, phase, activityIndex };
}

/**
 * Get progress summary for an outline
 */
export function getOutlineProgress(outline: SessionOutlineItem[]): {
  completed: number;
  total: number;
  percentage: number;
  remainingMinutes: number;
  currentItem?: SessionOutlineItem;
} {
  const completed = outline.filter((i) => i.status === 'completed').length;
  const total = outline.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remainingMinutes = outline
    .filter((i) => i.status !== 'completed')
    .reduce((sum, i) => sum + i.estimatedMinutes, 0);
  const currentItem = outline.find((i) => i.status === 'current');

  return {
    completed,
    total,
    percentage,
    remainingMinutes,
    currentItem,
  };
}

/**
 * Find next item in outline
 */
export function findNextItem(outline: SessionOutlineItem[]): SessionOutlineItem | null {
  const currentIndex = outline.findIndex((i) => i.status === 'current');
  if (currentIndex === -1 || currentIndex >= outline.length - 1) {
    return null;
  }
  return outline[currentIndex + 1];
}

/**
 * Find previous item in outline
 */
export function findPreviousItem(outline: SessionOutlineItem[]): SessionOutlineItem | null {
  const currentIndex = outline.findIndex((i) => i.status === 'current');
  if (currentIndex <= 0) {
    return null;
  }
  return outline[currentIndex - 1];
}

// ══════════════════════════════════════════════════════════════════════════════
// OUTLINE MODIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Insert an activity into the outline
 */
export function insertActivityIntoOutline(
  outline: SessionOutlineItem[],
  activity: SessionActivityInput,
  afterItemId?: string
): SessionOutlineItem[] {
  const newItem = createActivityOutlineItem(activity, true);
  newItem.isNew = true;

  if (!afterItemId) {
    // Insert before goodbye (or at end if no goodbye)
    const goodbyeIndex = outline.findIndex((i) => i.id === 'goodbye');
    if (goodbyeIndex > -1) {
      outline.splice(goodbyeIndex, 0, newItem);
    } else {
      outline.push(newItem);
    }
  } else {
    const afterIndex = outline.findIndex((i) => i.id === afterItemId);
    if (afterIndex > -1) {
      outline.splice(afterIndex + 1, 0, newItem);
    } else {
      outline.push(newItem);
    }
  }

  return outline;
}

/**
 * Remove an activity from the outline
 */
export function removeActivityFromOutline(
  outline: SessionOutlineItem[],
  itemId: string
): SessionOutlineItem[] {
  return outline.filter((i) => i.id !== itemId);
}

/**
 * Extend time for an item
 */
export function extendItemTime(
  outline: SessionOutlineItem[],
  itemId: string,
  additionalMinutes: number
): SessionOutlineItem[] {
  return outline.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        estimatedMinutes: item.estimatedMinutes + additionalMinutes,
      };
    }
    return item;
  });
}

/**
 * Reorder items in outline
 */
export function reorderOutlineItems(
  outline: SessionOutlineItem[],
  fromIndex: number,
  toIndex: number
): SessionOutlineItem[] {
  // Don't allow reordering fixed items (welcome, checkin, goodbye)
  const fixedIds = ['welcome', 'checkin', 'goodbye'];
  const item = outline[fromIndex];
  const targetItem = outline[toIndex];

  if (fixedIds.includes(item.id) || fixedIds.includes(targetItem.id)) {
    return outline; // No change
  }

  const newOutline = [...outline];
  const [removed] = newOutline.splice(fromIndex, 1);
  newOutline.splice(toIndex, 0, removed);

  return newOutline;
}

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate session structure
 */
export function validateSessionStructure(
  structure: SessionStructureDefinition
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (structure.mainContent.minActivities < 1) {
    errors.push('Minimum activities must be at least 1');
  }

  if (structure.mainContent.maxActivities < structure.mainContent.minActivities) {
    errors.push('Maximum activities must be greater than or equal to minimum');
  }

  if (structure.mainContent.breakAfterActivities < 1) {
    errors.push('Break after activities must be at least 1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if outline meets structure requirements
 */
export function validateOutlineAgainstStructure(
  outline: SessionOutlineItem[],
  structure: SessionStructureDefinition
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const activityCount = outline.filter((i) => i.type === 'activity').length;

  if (activityCount < structure.mainContent.minActivities) {
    errors.push(`Need at least ${structure.mainContent.minActivities} activities, have ${activityCount}`);
  }

  if (activityCount > structure.mainContent.maxActivities) {
    errors.push(`Maximum ${structure.mainContent.maxActivities} activities allowed, have ${activityCount}`);
  }

  if (structure.welcome?.required && !outline.find((i) => i.id === 'welcome')) {
    errors.push('Welcome routine is required');
  }

  if (structure.checkin?.required && !outline.find((i) => i.id === 'checkin')) {
    errors.push('Check-in routine is required');
  }

  if (structure.goodbye?.required && !outline.find((i) => i.id === 'goodbye')) {
    errors.push('Goodbye routine is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get icon for activity type
 */
export function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    lesson: 'menu_book',
    video: 'play_circle',
    quiz: 'quiz',
    practice: 'edit',
    game: 'games',
    reading: 'auto_stories',
    writing: 'create',
    math: 'calculate',
    interactive: 'touch_app',
  };
  return icons[type.toLowerCase()] || 'school';
}

/**
 * Get color for activity type
 */
export function getActivityColor(type: string): string {
  const colors: Record<string, string> = {
    lesson: '#4CAF50',
    video: '#2196F3',
    quiz: '#FF9800',
    practice: '#9C27B0',
    game: '#E91E63',
    reading: '#009688',
    writing: '#673AB7',
    math: '#3F51B5',
    interactive: '#00BCD4',
  };
  return colors[type.toLowerCase()] || '#757575';
}

/**
 * Get phase display name
 */
export function getPhaseDisplayName(phase: SessionPhase): string {
  const names: Record<SessionPhase, string> = {
    welcome: 'Welcome!',
    checkin: 'Check-In',
    main: 'Learning Time',
    break: 'Break Time',
    goodbye: 'All Done!',
  };
  return names[phase];
}

/**
 * Get status display info
 */
export function getStatusDisplayInfo(status: OutlineItemStatus): {
  label: string;
  icon: string;
  color: string;
} {
  const info: Record<OutlineItemStatus, { label: string; icon: string; color: string }> = {
    upcoming: { label: 'Coming up', icon: 'schedule', color: '#9E9E9E' },
    current: { label: 'Now', icon: 'play_circle', color: '#2196F3' },
    completed: { label: 'Done', icon: 'check_circle', color: '#4CAF50' },
    skipped: { label: 'Skipped', icon: 'skip_next', color: '#FF9800' },
  };
  return info[status];
}

/**
 * Calculate total session duration from outline
 */
export function calculateTotalDuration(outline: SessionOutlineItem[]): number {
  return outline.reduce((sum, item) => sum + item.estimatedMinutes, 0);
}
