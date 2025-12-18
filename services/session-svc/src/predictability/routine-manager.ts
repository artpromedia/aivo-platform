/**
 * Routine Manager - ND-2.2
 *
 * Manages session routines including system defaults and custom routines.
 * Provides routine templates for welcome, goodbye, breaks, and calming.
 */

import type {
  RoutineType,
  SessionRoutineData,
  RoutineStep,
} from './predictability.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM DEFAULT ROUTINES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get system default routine by type
 */
export function getSystemDefaultRoutine(type: RoutineType): SessionRoutineData {
  const routines: Record<RoutineType, SessionRoutineData> = {
    WELCOME: {
      id: 'system_welcome',
      name: 'Welcome Routine',
      type: 'WELCOME',
      steps: [
        {
          id: 'w1',
          type: 'greeting',
          title: 'Say Hello!',
          instruction: 'Wave to your learning buddy!',
          durationSeconds: 5,
          isSkippable: false,
          requiresInteraction: true,
        },
        {
          id: 'w2',
          type: 'preview',
          title: "See What's Planned",
          instruction: "Let's see what we'll do today!",
          durationSeconds: 10,
          isSkippable: false,
          requiresInteraction: false,
        },
      ],
      totalDurationSeconds: 15,
    },

    CHECKIN: {
      id: 'system_checkin',
      name: 'Check-In Routine',
      type: 'CHECKIN',
      steps: [
        {
          id: 'c1',
          type: 'checkin',
          title: 'How Are You Feeling?',
          instruction: 'Tap the face that shows how you feel',
          durationSeconds: 15,
          isSkippable: false,
          requiresInteraction: true,
        },
      ],
      totalDurationSeconds: 15,
    },

    TRANSITION: {
      id: 'system_transition',
      name: 'Transition Routine',
      type: 'TRANSITION',
      steps: [
        {
          id: 't1',
          type: 'breathing',
          title: 'Take a Breath',
          instruction: 'Take one deep breath',
          durationSeconds: 5,
          isSkippable: true,
          requiresInteraction: false,
        },
      ],
      totalDurationSeconds: 5,
    },

    BREAK: {
      id: 'system_break',
      name: 'Break Routine',
      type: 'BREAK',
      steps: [
        {
          id: 'b1',
          type: 'movement',
          title: 'Stretch Time!',
          instruction: 'Stand up and stretch your arms up high!',
          durationSeconds: 15,
          isSkippable: true,
          requiresInteraction: false,
        },
        {
          id: 'b2',
          type: 'breathing',
          title: 'Calm Breaths',
          instruction: 'Take 3 slow, deep breaths',
          durationSeconds: 15,
          isSkippable: true,
          requiresInteraction: false,
        },
      ],
      totalDurationSeconds: 30,
    },

    RETURN: {
      id: 'system_return',
      name: 'Return from Break',
      type: 'RETURN',
      steps: [
        {
          id: 'r1',
          type: 'preview',
          title: 'Ready to Continue?',
          instruction: "Let's see what's next!",
          durationSeconds: 10,
          isSkippable: false,
          requiresInteraction: true,
        },
      ],
      totalDurationSeconds: 10,
    },

    GOODBYE: {
      id: 'system_goodbye',
      name: 'Goodbye Routine',
      type: 'GOODBYE',
      steps: [
        {
          id: 'g1',
          type: 'affirmation',
          title: 'Great Job Today!',
          instruction: 'You did amazing! Give yourself a pat on the back!',
          durationSeconds: 10,
          isSkippable: false,
          requiresInteraction: false,
        },
        {
          id: 'g2',
          type: 'greeting',
          title: 'See You Next Time!',
          instruction: 'Wave goodbye!',
          durationSeconds: 5,
          isSkippable: false,
          requiresInteraction: true,
        },
      ],
      totalDurationSeconds: 15,
    },

    CELEBRATION: {
      id: 'system_celebration',
      name: 'Celebration Routine',
      type: 'CELEBRATION',
      steps: [
        {
          id: 'cel1',
          type: 'affirmation',
          title: 'You Did It!',
          instruction: 'Amazing work! You should be proud!',
          durationSeconds: 10,
          isSkippable: false,
          requiresInteraction: false,
        },
      ],
      totalDurationSeconds: 10,
    },

    CALMING: {
      id: 'system_calming',
      name: 'Calming Routine',
      type: 'CALMING',
      steps: [
        {
          id: 'calm1',
          type: 'breathing',
          title: "Let's Calm Down",
          instruction: 'Breathe in slowly... and out...',
          durationSeconds: 30,
          isSkippable: false,
          requiresInteraction: false,
        },
        {
          id: 'calm2',
          type: 'affirmation',
          title: "You're Okay",
          instruction: "Everything is okay. You're safe. You're doing great.",
          durationSeconds: 10,
          isSkippable: false,
          requiresInteraction: false,
        },
      ],
      totalDurationSeconds: 40,
    },
  };

  return routines[type];
}

/**
 * Get all system default routines
 */
export function getAllSystemDefaultRoutines(): SessionRoutineData[] {
  const types: RoutineType[] = [
    'WELCOME',
    'CHECKIN',
    'TRANSITION',
    'BREAK',
    'RETURN',
    'GOODBYE',
    'CELEBRATION',
    'CALMING',
  ];

  return types.map(getSystemDefaultRoutine);
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTINE TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Routine template for quick customization
 */
export interface RoutineTemplate {
  name: string;
  description: string;
  type: RoutineType;
  ageRange?: { min: number; max: number };
  steps: RoutineStep[];
}

/**
 * Get routine templates for a specific type
 */
export function getRoutineTemplates(type: RoutineType): RoutineTemplate[] {
  const templates: Record<RoutineType, RoutineTemplate[]> = {
    WELCOME: [
      {
        name: 'Simple Welcome',
        description: 'Quick wave and preview for older learners',
        type: 'WELCOME',
        ageRange: { min: 10, max: 18 },
        steps: [
          {
            id: 'sw1',
            type: 'greeting',
            title: 'Hello!',
            instruction: 'Welcome back!',
            durationSeconds: 3,
            isSkippable: true,
            requiresInteraction: false,
          },
        ],
      },
      {
        name: 'Friendly Character Welcome',
        description: 'Fun welcome with character interaction',
        type: 'WELCOME',
        ageRange: { min: 4, max: 9 },
        steps: [
          {
            id: 'fcw1',
            type: 'greeting',
            title: 'Hi Friend!',
            instruction: "Your buddy is so happy to see you! Wave hello! 👋",
            durationSeconds: 5,
            isSkippable: false,
            requiresInteraction: true,
          },
          {
            id: 'fcw2',
            type: 'preview',
            title: "Today's Adventure",
            instruction: "Let's see what fun things we'll do today!",
            durationSeconds: 10,
            isSkippable: false,
            requiresInteraction: false,
          },
        ],
      },
    ],

    CHECKIN: [
      {
        name: 'Emoji Check-In',
        description: 'Simple emoji-based mood check',
        type: 'CHECKIN',
        steps: [
          {
            id: 'eci1',
            type: 'checkin',
            title: 'How Do You Feel?',
            instruction: 'Pick the emoji that matches how you feel right now',
            durationSeconds: 15,
            isSkippable: false,
            requiresInteraction: true,
          },
        ],
      },
      {
        name: 'Body Check-In',
        description: 'Check in with how your body feels',
        type: 'CHECKIN',
        steps: [
          {
            id: 'bci1',
            type: 'checkin',
            title: 'Body Check',
            instruction: 'How does your body feel? Tap where you feel something.',
            durationSeconds: 20,
            isSkippable: false,
            requiresInteraction: true,
          },
        ],
      },
    ],

    TRANSITION: [
      {
        name: 'Quick Breath',
        description: 'Single breath between activities',
        type: 'TRANSITION',
        steps: [
          {
            id: 'qb1',
            type: 'breathing',
            title: 'One Breath',
            instruction: 'Take one deep breath before we continue',
            durationSeconds: 5,
            isSkippable: true,
            requiresInteraction: false,
          },
        ],
      },
    ],

    BREAK: [
      {
        name: 'Movement Break',
        description: 'Active break with stretches',
        type: 'BREAK',
        steps: [
          {
            id: 'mb1',
            type: 'movement',
            title: 'Shake It Out!',
            instruction: 'Stand up and shake your whole body!',
            durationSeconds: 10,
            isSkippable: true,
            requiresInteraction: false,
          },
          {
            id: 'mb2',
            type: 'movement',
            title: 'Stretch High',
            instruction: 'Reach your arms up to the sky!',
            durationSeconds: 10,
            isSkippable: true,
            requiresInteraction: false,
          },
        ],
      },
      {
        name: 'Calm Break',
        description: 'Quiet break with breathing',
        type: 'BREAK',
        steps: [
          {
            id: 'cb1',
            type: 'breathing',
            title: 'Quiet Time',
            instruction: 'Close your eyes and breathe slowly',
            durationSeconds: 30,
            isSkippable: true,
            requiresInteraction: false,
          },
        ],
      },
    ],

    RETURN: [
      {
        name: 'Ready Check',
        description: 'Confirm readiness to continue',
        type: 'RETURN',
        steps: [
          {
            id: 'rc1',
            type: 'preview',
            title: 'Ready?',
            instruction: 'Tap when you\'re ready to continue!',
            durationSeconds: 10,
            isSkippable: false,
            requiresInteraction: true,
          },
        ],
      },
    ],

    GOODBYE: [
      {
        name: 'Celebration Goodbye',
        description: 'End with celebration',
        type: 'GOODBYE',
        steps: [
          {
            id: 'cg1',
            type: 'affirmation',
            title: 'You Did It!',
            instruction: 'Amazing job today! 🎉',
            durationSeconds: 8,
            isSkippable: false,
            requiresInteraction: false,
          },
          {
            id: 'cg2',
            type: 'greeting',
            title: 'See You Soon!',
            instruction: 'Wave goodbye to your buddy!',
            durationSeconds: 5,
            isSkippable: false,
            requiresInteraction: true,
          },
        ],
      },
    ],

    CELEBRATION: [
      {
        name: 'Star Celebration',
        description: 'Celebrate achievements with stars',
        type: 'CELEBRATION',
        steps: [
          {
            id: 'sc1',
            type: 'affirmation',
            title: '⭐ Star Moment! ⭐',
            instruction: 'You earned a star! You\'re amazing!',
            durationSeconds: 10,
            isSkippable: false,
            requiresInteraction: false,
          },
        ],
      },
    ],

    CALMING: [
      {
        name: 'Deep Breathing',
        description: 'Extended breathing exercise',
        type: 'CALMING',
        steps: [
          {
            id: 'db1',
            type: 'breathing',
            title: 'Breathe With Me',
            instruction: 'Breathe in for 4... hold for 4... out for 4...',
            durationSeconds: 60,
            isSkippable: false,
            requiresInteraction: false,
          },
          {
            id: 'db2',
            type: 'affirmation',
            title: 'You\'re Safe',
            instruction: 'You\'re doing great. Everything is okay.',
            durationSeconds: 10,
            isSkippable: false,
            requiresInteraction: false,
          },
        ],
      },
      {
        name: 'Grounding Exercise',
        description: '5-4-3-2-1 grounding technique',
        type: 'CALMING',
        steps: [
          {
            id: 'ge1',
            type: 'custom',
            title: '5 Things You See',
            instruction: 'Look around. Name 5 things you can see.',
            durationSeconds: 20,
            isSkippable: false,
            requiresInteraction: true,
          },
          {
            id: 'ge2',
            type: 'custom',
            title: '4 Things You Can Touch',
            instruction: 'What can you touch? Find 4 things.',
            durationSeconds: 20,
            isSkippable: false,
            requiresInteraction: true,
          },
          {
            id: 'ge3',
            type: 'breathing',
            title: 'Calm Breath',
            instruction: 'Now take a slow, deep breath.',
            durationSeconds: 10,
            isSkippable: false,
            requiresInteraction: false,
          },
        ],
      },
    ],
  };

  return templates[type] || [];
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTINE VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate routine steps
 */
export function validateRoutineSteps(steps: RoutineStep[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (steps.length === 0) {
    errors.push('Routine must have at least one step');
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    if (!step.id) {
      errors.push(`Step ${i + 1}: Missing id`);
    }

    if (!step.title || step.title.trim().length === 0) {
      errors.push(`Step ${i + 1}: Missing title`);
    }

    if (!step.instruction || step.instruction.trim().length === 0) {
      errors.push(`Step ${i + 1}: Missing instruction`);
    }

    if (step.durationSeconds < 1) {
      errors.push(`Step ${i + 1}: Duration must be at least 1 second`);
    }

    if (step.durationSeconds > 300) {
      errors.push(`Step ${i + 1}: Duration should not exceed 5 minutes`);
    }

    const validTypes = ['greeting', 'breathing', 'preview', 'checkin', 'movement', 'affirmation', 'custom'];
    if (!validTypes.includes(step.type)) {
      errors.push(`Step ${i + 1}: Invalid type "${step.type}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate total duration of routine steps
 */
export function calculateRoutineDuration(steps: RoutineStep[]): number {
  return steps.reduce((sum, step) => sum + step.durationSeconds, 0);
}

/**
 * Get routine display info
 */
export function getRoutineDisplayInfo(type: RoutineType): { icon: string; color: string; label: string } {
  const info: Record<RoutineType, { icon: string; color: string; label: string }> = {
    WELCOME: { icon: 'waving_hand', color: '#4CAF50', label: 'Welcome' },
    CHECKIN: { icon: 'mood', color: '#2196F3', label: 'Check-In' },
    TRANSITION: { icon: 'swap_horiz', color: '#9E9E9E', label: 'Transition' },
    BREAK: { icon: 'self_improvement', color: '#8BC34A', label: 'Break' },
    RETURN: { icon: 'replay', color: '#03A9F4', label: 'Return' },
    GOODBYE: { icon: 'celebration', color: '#FFD700', label: 'Goodbye' },
    CELEBRATION: { icon: 'star', color: '#FFC107', label: 'Celebration' },
    CALMING: { icon: 'spa', color: '#7986CB', label: 'Calming' },
  };

  return info[type];
}
