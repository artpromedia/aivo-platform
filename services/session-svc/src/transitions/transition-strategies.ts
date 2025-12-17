/**
 * Transition Strategies
 *
 * Default transition routines and strategies for different
 * learner needs and activity types.
 */

import type { TransitionRoutineStep } from './transition.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM ROUTINES
// Predefined routines that are available to all tenants
// ══════════════════════════════════════════════════════════════════════════════

export interface SystemRoutineDefinition {
  name: string;
  description: string;
  steps: Omit<TransitionRoutineStep, 'id'>[];
  targetGradeBands: string[];
  targetActivityTypes: string[];
}

export const SYSTEM_ROUTINES: SystemRoutineDefinition[] = [
  // ─── K-5 Routines ───────────────────────────────────────────────────────────
  {
    name: 'Quick Calm (K-5)',
    description: 'A short routine with breathing and movement for younger learners',
    targetGradeBands: ['K5', 'K_2', 'G3_5'],
    targetActivityTypes: [],
    steps: [
      {
        type: 'breathing',
        duration: 15,
        instruction:
          'Take 3 big balloon breaths - breathe in through your nose, out through your mouth',
        requiresCompletion: false,
      },
      {
        type: 'movement',
        duration: 10,
        instruction: 'Wiggle your fingers and toes, then stretch your arms up high like a giraffe!',
        requiresCompletion: false,
      },
      {
        type: 'preview',
        duration: 10,
        instruction: "Let's see what fun thing is coming next!",
        requiresCompletion: false,
      },
      {
        type: 'ready_check',
        duration: 5,
        instruction: "Give a thumbs up when you're ready! 👍",
        requiresCompletion: true,
      },
    ],
  },
  {
    name: 'Sensory Reset (K-5)',
    description: 'Grounding routine for learners who need sensory breaks',
    targetGradeBands: ['K5', 'K_2', 'G3_5'],
    targetActivityTypes: [],
    steps: [
      {
        type: 'sensory',
        duration: 10,
        instruction: 'Put your feet flat on the floor and feel how solid it is',
        requiresCompletion: false,
      },
      {
        type: 'sensory',
        duration: 10,
        instruction: 'Squeeze your hands tight for 3 seconds, then let go and feel them relax',
        requiresCompletion: false,
      },
      {
        type: 'breathing',
        duration: 10,
        instruction: "Take a slow deep breath and let it out like you're blowing a dandelion",
        requiresCompletion: false,
      },
      {
        type: 'ready_check',
        duration: 5,
        instruction: 'Tap the screen when your body feels calm and ready',
        requiresCompletion: true,
      },
    ],
  },
  {
    name: 'Picture Preview (K-5)',
    description: 'Visual routine using the First/Then board for predictability',
    targetGradeBands: ['K5', 'K_2', 'G3_5'],
    targetActivityTypes: [],
    steps: [
      {
        type: 'preview',
        duration: 15,
        instruction:
          'Look at the First/Then board. First we finish this activity, Then we start something new!',
        requiresCompletion: false,
      },
      {
        type: 'countdown',
        duration: 10,
        instruction: "Let's count down together: 10... 9... 8...",
        requiresCompletion: false,
      },
      {
        type: 'ready_check',
        duration: 5,
        instruction: "Give me a big smile when you're ready! 😊",
        requiresCompletion: true,
      },
    ],
  },

  // ─── Grade 6-8 Routines ─────────────────────────────────────────────────────
  {
    name: 'Quick Reset (6-8)',
    description: 'Brief transition routine for middle schoolers',
    targetGradeBands: ['G6_8'],
    targetActivityTypes: [],
    steps: [
      {
        type: 'breathing',
        duration: 15,
        instruction: 'Take 3 box breaths: in for 4, hold for 4, out for 4, hold for 4',
        requiresCompletion: false,
      },
      {
        type: 'movement',
        duration: 10,
        instruction: 'Roll your shoulders back 3 times and shake out your hands',
        requiresCompletion: false,
      },
      {
        type: 'preview',
        duration: 5,
        instruction: "Here's what's coming up next",
        requiresCompletion: false,
      },
    ],
  },
  {
    name: 'Focus Transition (6-8)',
    description: 'Mindful transition for maintaining focus between activities',
    targetGradeBands: ['G6_8'],
    targetActivityTypes: [],
    steps: [
      {
        type: 'breathing',
        duration: 10,
        instruction: 'Close your eyes and take one deep breath',
        requiresCompletion: false,
      },
      {
        type: 'sensory',
        duration: 10,
        instruction: 'Notice 3 things you can hear right now',
        requiresCompletion: false,
      },
      {
        type: 'preview',
        duration: 10,
        instruction: 'Set your intention: What do you want to accomplish in the next activity?',
        requiresCompletion: false,
      },
      {
        type: 'ready_check',
        duration: 5,
        instruction: 'Tap when ready to continue',
        requiresCompletion: true,
      },
    ],
  },

  // ─── Grade 9-12 Routines ────────────────────────────────────────────────────
  {
    name: 'Brief Pause (9-12)',
    description: 'Quick, non-intrusive transition for high schoolers',
    targetGradeBands: ['G9_12'],
    targetActivityTypes: [],
    steps: [
      {
        type: 'breathing',
        duration: 10,
        instruction: 'Take a moment: 3 deep breaths',
        requiresCompletion: false,
      },
      {
        type: 'preview',
        duration: 10,
        instruction: "Review what's next and mentally prepare",
        requiresCompletion: false,
      },
    ],
  },
  {
    name: 'Mindful Transition (9-12)',
    description: 'Longer transition with grounding for students who need more time',
    targetGradeBands: ['G9_12'],
    targetActivityTypes: [],
    steps: [
      {
        type: 'breathing',
        duration: 15,
        instruction: 'Practice 4-7-8 breathing: inhale for 4, hold for 7, exhale for 8',
        requiresCompletion: false,
      },
      {
        type: 'sensory',
        duration: 15,
        instruction: 'Ground yourself: feet on floor, hands on desk, notice your surroundings',
        requiresCompletion: false,
      },
      {
        type: 'preview',
        duration: 10,
        instruction: "Here's what's coming up - take a moment to prepare",
        requiresCompletion: false,
      },
      {
        type: 'ready_check',
        duration: 5,
        instruction: 'Continue when ready',
        requiresCompletion: true,
      },
    ],
  },

  // ─── Activity-Specific Routines ─────────────────────────────────────────────
  {
    name: 'Quiz Preparation',
    description: 'Helps learners prepare mentally before assessments',
    targetGradeBands: [],
    targetActivityTypes: ['quiz', 'assessment', 'test'],
    steps: [
      {
        type: 'breathing',
        duration: 15,
        instruction: "Take a few calming breaths - you've got this!",
        requiresCompletion: false,
      },
      {
        type: 'preview',
        duration: 15,
        instruction: "Coming up: a quiz. Remember, it's just to help us understand what you know.",
        requiresCompletion: false,
      },
      {
        type: 'sensory',
        duration: 10,
        instruction: 'Shake out any nervous energy - wiggle your fingers, roll your shoulders',
        requiresCompletion: false,
      },
      {
        type: 'ready_check',
        duration: 5,
        instruction: "I'm ready to show what I know!",
        requiresCompletion: true,
      },
    ],
  },
  {
    name: 'Video to Activity',
    description: 'Transition from passive watching to active engagement',
    targetGradeBands: [],
    targetActivityTypes: ['practice', 'interactive', 'game'],
    steps: [
      {
        type: 'movement',
        duration: 10,
        instruction: 'Stretch and get ready to participate actively',
        requiresCompletion: false,
      },
      {
        type: 'preview',
        duration: 10,
        instruction: 'Time to put what you learned into practice!',
        requiresCompletion: false,
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate total duration for a list of steps.
 */
export function calculateRoutineDuration(steps: Omit<TransitionRoutineStep, 'id'>[]): number {
  return steps.reduce((sum, step) => sum + step.duration, 0);
}

/**
 * Find the best matching system routine for a given context.
 */
export function findMatchingRoutine(
  gradeBand?: string,
  activityType?: string
): SystemRoutineDefinition | null {
  // First, try to find an activity-specific routine
  if (activityType) {
    const activityMatch = SYSTEM_ROUTINES.find(
      (r) => r.targetActivityTypes.length > 0 && r.targetActivityTypes.includes(activityType)
    );
    if (activityMatch) {
      return activityMatch;
    }
  }

  // Then, find a grade-band specific routine
  if (gradeBand) {
    const gradeMatch = SYSTEM_ROUTINES.find(
      (r) =>
        r.targetGradeBands.length > 0 &&
        r.targetActivityTypes.length === 0 &&
        r.targetGradeBands.includes(gradeBand)
    );
    if (gradeMatch) {
      return gradeMatch;
    }
  }

  // Default to first K-5 routine as fallback
  return SYSTEM_ROUTINES[0] ?? null;
}

/**
 * Get recommended transition duration based on learner factors.
 */
export function getRecommendedDuration(context: {
  gradeBand?: string;
  requiresPredictableFlow?: boolean;
  currentMood?: string;
  activityChange?: 'same_type' | 'different_type' | 'to_assessment';
}): number {
  let baseDuration = 30;

  // Younger learners need more time
  if (context.gradeBand === 'K5' || context.gradeBand === 'K_2') {
    baseDuration = 45;
  }

  // Predictability needs = more time
  if (context.requiresPredictableFlow) {
    baseDuration = Math.max(baseDuration, 45);
  }

  // Mood-based adjustments
  if (context.currentMood === 'frustrated' || context.currentMood === 'tired') {
    baseDuration = Math.round(baseDuration * 1.5);
  }

  // Activity type changes
  if (context.activityChange === 'to_assessment') {
    baseDuration = Math.round(baseDuration * 1.5);
  } else if (context.activityChange === 'different_type') {
    baseDuration = Math.round(baseDuration * 1.2);
  }

  return baseDuration;
}

/**
 * Determine warning intervals based on total duration.
 */
export function getWarningIntervals(totalDuration: number): number[] {
  if (totalDuration <= 15) {
    return [10, 5];
  }
  if (totalDuration <= 30) {
    return [20, 10, 5];
  }
  if (totalDuration <= 60) {
    return [30, 15, 5];
  }
  if (totalDuration <= 120) {
    return [60, 30, 10];
  }
  return [120, 60, 30, 10];
}
