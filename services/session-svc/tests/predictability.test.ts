/**
 * Predictability Service Tests - ND-2.2
 *
 * Unit tests for the predictability enforcement service.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  DEFAULT_SESSION_STRUCTURE,
  MINIMAL_SESSION_STRUCTURE,
  HIGH_SUPPORT_SESSION_STRUCTURE,
  buildSessionOutline,
  updateOutlineProgress,
  getOutlineProgress,
  findNextItem,
  findPreviousItem,
  insertActivityIntoOutline,
  removeActivityFromOutline,
  extendItemTime,
  reorderOutlineItems,
  validateSessionStructure,
  validateOutlineAgainstStructure,
  getActivityIcon,
  getActivityColor,
  getPhaseDisplayName,
  getStatusDisplayInfo,
  calculateTotalDuration,
} from '../src/predictability/session-structure.js';

import {
  getSystemDefaultRoutine,
  getAllSystemDefaultRoutines,
  getRoutineTemplates,
  validateRoutineSteps,
  calculateRoutineDuration,
  getRoutineDisplayInfo,
} from '../src/predictability/routine-manager.js';

import type {
  SessionOutlineItem,
  SessionRoutineData,
  SessionActivityInput,
} from '../src/predictability/predictability.types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION STRUCTURE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Session Structure', () => {
  describe('buildSessionOutline', () => {
    it('should build outline with welcome, activities, and goodbye', () => {
      const activities: SessionActivityInput[] = [
        { id: '1', title: 'Math Practice', type: 'practice', estimatedMinutes: 10 },
        { id: '2', title: 'Reading', type: 'reading', estimatedMinutes: 15 },
      ];

      const welcomeRoutine: SessionRoutineData = {
        id: 'welcome',
        type: 'WELCOME',
        name: 'Welcome',
        steps: [{ type: 'greeting', durationSeconds: 10 }],
        totalDurationSeconds: 10,
      };

      const goodbyeRoutine: SessionRoutineData = {
        id: 'goodbye',
        type: 'GOODBYE',
        name: 'Goodbye',
        steps: [{ type: 'farewell', durationSeconds: 10 }],
        totalDurationSeconds: 10,
      };

      const outline = buildSessionOutline(activities, {
        welcomeRoutine,
        goodbyeRoutine,
      });

      expect(outline.length).toBe(4); // welcome + 2 activities + goodbye
      expect(outline[0].id).toBe('welcome');
      expect(outline[1].id).toBe('activity_1');
      expect(outline[2].id).toBe('activity_2');
      expect(outline[3].id).toBe('goodbye');
    });

    it('should add breaks after N activities', () => {
      const activities: SessionActivityInput[] = [
        { id: '1', title: 'Activity 1', type: 'practice', estimatedMinutes: 10 },
        { id: '2', title: 'Activity 2', type: 'practice', estimatedMinutes: 10 },
        { id: '3', title: 'Activity 3', type: 'practice', estimatedMinutes: 10 },
        { id: '4', title: 'Activity 4', type: 'practice', estimatedMinutes: 10 },
      ];

      const breakRoutine: SessionRoutineData = {
        id: 'break',
        type: 'BREAK',
        name: 'Break',
        steps: [{ type: 'stretch', durationSeconds: 30 }],
        totalDurationSeconds: 30,
      };

      const outline = buildSessionOutline(activities, {
        breakRoutine,
        breakAfterActivities: 2,
      });

      // 4 activities + 1 break (after 2nd activity, before 3rd)
      expect(outline.length).toBe(5);
      expect(outline[2].type).toBe('break');
    });

    it('should mark new activities', () => {
      const activities: SessionActivityInput[] = [
        { id: '1', title: 'Old Activity', type: 'practice', estimatedMinutes: 10, isNew: false },
        { id: '2', title: 'New Activity', type: 'practice', estimatedMinutes: 10, isNew: true },
      ];

      const outline = buildSessionOutline(activities, { warnAboutNewContent: true });

      expect(outline[0].isNew).toBe(false);
      expect(outline[1].isNew).toBe(true);
      expect(outline[1].description).toBe('New content!');
    });
  });

  describe('updateOutlineProgress', () => {
    const baseOutline: SessionOutlineItem[] = [
      { id: 'welcome', title: 'Welcome', type: 'routine', estimatedMinutes: 2, status: 'upcoming' },
      { id: 'activity_1', title: 'Activity 1', type: 'activity', estimatedMinutes: 10, status: 'upcoming' },
      { id: 'activity_2', title: 'Activity 2', type: 'activity', estimatedMinutes: 10, status: 'upcoming' },
      { id: 'goodbye', title: 'Goodbye', type: 'routine', estimatedMinutes: 2, status: 'upcoming' },
    ];

    it('should mark items as completed before current', () => {
      const { outline } = updateOutlineProgress(baseOutline, 'activity_1');

      expect(outline[0].status).toBe('completed');
      expect(outline[1].status).toBe('current');
      expect(outline[2].status).toBe('upcoming');
      expect(outline[3].status).toBe('upcoming');
    });

    it('should return correct phase', () => {
      const { phase: welcomePhase } = updateOutlineProgress(baseOutline, 'welcome');
      expect(welcomePhase).toBe('welcome');

      const { phase: mainPhase } = updateOutlineProgress(baseOutline, 'activity_1');
      expect(mainPhase).toBe('main');

      const { phase: goodbyePhase } = updateOutlineProgress(baseOutline, 'goodbye');
      expect(goodbyePhase).toBe('goodbye');
    });

    it('should track activity index', () => {
      const { activityIndex: idx1 } = updateOutlineProgress(baseOutline, 'activity_1');
      expect(idx1).toBe(0);

      const { activityIndex: idx2 } = updateOutlineProgress(baseOutline, 'activity_2');
      expect(idx2).toBe(1);
    });
  });

  describe('getOutlineProgress', () => {
    it('should calculate progress correctly', () => {
      const outline: SessionOutlineItem[] = [
        { id: '1', title: 'A', type: 'routine', estimatedMinutes: 5, status: 'completed' },
        { id: '2', title: 'B', type: 'activity', estimatedMinutes: 10, status: 'completed' },
        { id: '3', title: 'C', type: 'activity', estimatedMinutes: 10, status: 'current' },
        { id: '4', title: 'D', type: 'routine', estimatedMinutes: 5, status: 'upcoming' },
      ];

      const progress = getOutlineProgress(outline);

      expect(progress.completed).toBe(2);
      expect(progress.total).toBe(4);
      expect(progress.percentage).toBe(50);
      expect(progress.remainingMinutes).toBe(25); // current + upcoming
      expect(progress.currentItem?.id).toBe('3');
    });
  });

  describe('findNextItem / findPreviousItem', () => {
    const outline: SessionOutlineItem[] = [
      { id: '1', title: 'A', type: 'routine', estimatedMinutes: 5, status: 'completed' },
      { id: '2', title: 'B', type: 'activity', estimatedMinutes: 10, status: 'current' },
      { id: '3', title: 'C', type: 'activity', estimatedMinutes: 10, status: 'upcoming' },
    ];

    it('should find next item', () => {
      const next = findNextItem(outline);
      expect(next?.id).toBe('3');
    });

    it('should find previous item', () => {
      const prev = findPreviousItem(outline);
      expect(prev?.id).toBe('1');
    });

    it('should return null at boundaries', () => {
      const atStart: SessionOutlineItem[] = [
        { id: '1', title: 'A', type: 'routine', estimatedMinutes: 5, status: 'current' },
        { id: '2', title: 'B', type: 'activity', estimatedMinutes: 10, status: 'upcoming' },
      ];
      expect(findPreviousItem(atStart)).toBeNull();

      const atEnd: SessionOutlineItem[] = [
        { id: '1', title: 'A', type: 'routine', estimatedMinutes: 5, status: 'completed' },
        { id: '2', title: 'B', type: 'activity', estimatedMinutes: 10, status: 'current' },
      ];
      expect(findNextItem(atEnd)).toBeNull();
    });
  });

  describe('insertActivityIntoOutline', () => {
    it('should insert before goodbye if no position specified', () => {
      const outline: SessionOutlineItem[] = [
        { id: 'activity_1', title: 'A', type: 'activity', estimatedMinutes: 10, status: 'upcoming' },
        { id: 'goodbye', title: 'Goodbye', type: 'routine', estimatedMinutes: 5, status: 'upcoming' },
      ];

      const newActivity: SessionActivityInput = {
        id: '2',
        title: 'New Activity',
        type: 'practice',
        estimatedMinutes: 10,
      };

      const updated = insertActivityIntoOutline([...outline], newActivity);

      expect(updated.length).toBe(3);
      expect(updated[1].title).toBe('New Activity');
      expect(updated[2].id).toBe('goodbye');
    });

    it('should insert after specified item', () => {
      const outline: SessionOutlineItem[] = [
        { id: 'activity_1', title: 'A', type: 'activity', estimatedMinutes: 10, status: 'upcoming' },
        { id: 'activity_2', title: 'B', type: 'activity', estimatedMinutes: 10, status: 'upcoming' },
      ];

      const newActivity: SessionActivityInput = {
        id: '3',
        title: 'Inserted',
        type: 'practice',
        estimatedMinutes: 5,
      };

      const updated = insertActivityIntoOutline([...outline], newActivity, 'activity_1');

      expect(updated.length).toBe(3);
      expect(updated[1].title).toBe('Inserted');
    });
  });

  describe('validateSessionStructure', () => {
    it('should validate default structure', () => {
      const result = validateSessionStructure(DEFAULT_SESSION_STRUCTURE);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid structure', () => {
      const invalid = {
        mainContent: {
          minActivities: 5,
          maxActivities: 2, // Less than min!
          breakAfterActivities: 0, // Invalid!
        },
      };

      const result = validateSessionStructure(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('utility functions', () => {
    it('should return correct activity icons', () => {
      expect(getActivityIcon('lesson')).toBe('menu_book');
      expect(getActivityIcon('video')).toBe('play_circle');
      expect(getActivityIcon('quiz')).toBe('quiz');
      expect(getActivityIcon('unknown')).toBe('school');
    });

    it('should return correct activity colors', () => {
      expect(getActivityColor('lesson')).toBe('#4CAF50');
      expect(getActivityColor('quiz')).toBe('#FF9800');
    });

    it('should return phase display names', () => {
      expect(getPhaseDisplayName('welcome')).toBe('Welcome!');
      expect(getPhaseDisplayName('main')).toBe('Learning Time');
      expect(getPhaseDisplayName('goodbye')).toBe('All Done!');
    });

    it('should return status display info', () => {
      const current = getStatusDisplayInfo('current');
      expect(current.label).toBe('Now');
      expect(current.icon).toBe('play_circle');

      const completed = getStatusDisplayInfo('completed');
      expect(completed.label).toBe('Done');
    });

    it('should calculate total duration', () => {
      const outline: SessionOutlineItem[] = [
        { id: '1', title: 'A', type: 'routine', estimatedMinutes: 5, status: 'upcoming' },
        { id: '2', title: 'B', type: 'activity', estimatedMinutes: 10, status: 'upcoming' },
        { id: '3', title: 'C', type: 'activity', estimatedMinutes: 15, status: 'upcoming' },
      ];

      expect(calculateTotalDuration(outline)).toBe(30);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTINE MANAGER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Routine Manager', () => {
  describe('getSystemDefaultRoutine', () => {
    it('should return welcome routine', () => {
      const routine = getSystemDefaultRoutine('WELCOME');
      expect(routine).toBeDefined();
      expect(routine!.type).toBe('WELCOME');
      expect(routine!.steps.length).toBeGreaterThan(0);
    });

    it('should return goodbye routine', () => {
      const routine = getSystemDefaultRoutine('GOODBYE');
      expect(routine).toBeDefined();
      expect(routine!.type).toBe('GOODBYE');
    });

    it('should return break routine', () => {
      const routine = getSystemDefaultRoutine('BREAK');
      expect(routine).toBeDefined();
      expect(routine!.type).toBe('BREAK');
    });

    it('should return calming routine', () => {
      const routine = getSystemDefaultRoutine('CALMING');
      expect(routine).toBeDefined();
      expect(routine!.type).toBe('CALMING');
    });

    it('should return undefined for unknown type', () => {
      const routine = getSystemDefaultRoutine('UNKNOWN' as any);
      expect(routine).toBeUndefined();
    });
  });

  describe('getAllSystemDefaultRoutines', () => {
    it('should return all routine types', () => {
      const routines = getAllSystemDefaultRoutines();
      expect(Object.keys(routines).length).toBe(8);
      expect(routines.WELCOME).toBeDefined();
      expect(routines.CHECKIN).toBeDefined();
      expect(routines.TRANSITION).toBeDefined();
      expect(routines.BREAK).toBeDefined();
      expect(routines.RETURN).toBeDefined();
      expect(routines.GOODBYE).toBeDefined();
      expect(routines.CELEBRATION).toBeDefined();
      expect(routines.CALMING).toBeDefined();
    });
  });

  describe('getRoutineTemplates', () => {
    it('should return templates for welcome', () => {
      const templates = getRoutineTemplates('WELCOME');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some((t) => t.isDefault)).toBe(true);
    });

    it('should return templates for calming', () => {
      const templates = getRoutineTemplates('CALMING');
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('validateRoutineSteps', () => {
    it('should validate valid steps', () => {
      const steps = [
        { type: 'greeting', durationSeconds: 10 },
        { type: 'breathing', durationSeconds: 20 },
      ];
      const result = validateRoutineSteps(steps);
      expect(result.valid).toBe(true);
    });

    it('should reject empty steps', () => {
      const result = validateRoutineSteps([]);
      expect(result.valid).toBe(false);
    });

    it('should reject steps with invalid duration', () => {
      const steps = [
        { type: 'greeting', durationSeconds: 0 },
      ];
      const result = validateRoutineSteps(steps);
      expect(result.valid).toBe(false);
    });

    it('should reject too many steps', () => {
      const steps = Array(15).fill({ type: 'step', durationSeconds: 5 });
      const result = validateRoutineSteps(steps);
      expect(result.valid).toBe(false);
    });
  });

  describe('calculateRoutineDuration', () => {
    it('should sum step durations', () => {
      const steps = [
        { type: 'a', durationSeconds: 10 },
        { type: 'b', durationSeconds: 20 },
        { type: 'c', durationSeconds: 30 },
      ];
      expect(calculateRoutineDuration(steps)).toBe(60);
    });
  });

  describe('getRoutineDisplayInfo', () => {
    it('should return display info for welcome', () => {
      const info = getRoutineDisplayInfo('WELCOME');
      expect(info.icon).toBeDefined();
      expect(info.color).toBeDefined();
      expect(info.description).toBeDefined();
    });

    it('should return default info for unknown type', () => {
      const info = getRoutineDisplayInfo('UNKNOWN' as any);
      expect(info.icon).toBe('star');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURE TEMPLATES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Structure Templates', () => {
  it('should have valid default structure', () => {
    expect(DEFAULT_SESSION_STRUCTURE.mainContent.minActivities).toBe(1);
    expect(DEFAULT_SESSION_STRUCTURE.mainContent.maxActivities).toBe(5);
    expect(DEFAULT_SESSION_STRUCTURE.welcome?.required).toBe(true);
    expect(DEFAULT_SESSION_STRUCTURE.goodbye?.required).toBe(true);
  });

  it('should have valid minimal structure', () => {
    expect(MINIMAL_SESSION_STRUCTURE.mainContent.maxActivities).toBe(10);
    expect(MINIMAL_SESSION_STRUCTURE.goodbye?.required).toBe(false);
  });

  it('should have valid high-support structure', () => {
    expect(HIGH_SUPPORT_SESSION_STRUCTURE.mainContent.maxActivities).toBe(3);
    expect(HIGH_SUPPORT_SESSION_STRUCTURE.mainContent.breakAfterActivities).toBe(1);
  });
});
