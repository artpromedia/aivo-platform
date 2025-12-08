/**
 * Static Regulation Activity Catalog
 *
 * Curated list of simple, non-clinical regulation activities
 * appropriate for different grade bands and moods.
 *
 * All activities are:
 * - Age-appropriate
 * - Simple to follow
 * - Non-clinical (no therapy/counseling)
 * - Short duration (30-120 seconds)
 */

import type {
  GradeBand,
  SelfReportedMood,
  RegulationActivityType,
  RegulationRecommendation,
  FocusLossReason,
} from '../types/telemetry.js';

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

interface ActivityDefinition {
  activityType: RegulationActivityType;
  title: string;
  description: string;
  estimatedDurationSeconds: number;
  instructions: string[];
  /** Grade bands this activity is appropriate for */
  gradeBands: GradeBand[];
  /** Moods this activity is particularly good for */
  targetMoods: SelfReportedMood[];
  /** Focus loss reasons this helps with */
  helpsWithReasons: FocusLossReason[];
}

const ACTIVITY_CATALOG: ActivityDefinition[] = [
  // ─── Breathing Activities ────────────────────────────────────────────────────
  {
    activityType: 'breathing',
    title: 'Balloon Breaths',
    description: 'Imagine blowing up a big colorful balloon with slow, deep breaths.',
    estimatedDurationSeconds: 45,
    instructions: [
      'Sit comfortably in your chair',
      'Take a deep breath in through your nose (count to 4)',
      'Imagine a balloon getting bigger in your belly',
      'Slowly breathe out through your mouth (count to 6)',
      'Watch the balloon gently deflate',
      'Repeat 3 more times',
    ],
    gradeBands: ['K5'],
    targetMoods: ['frustrated', 'tired', 'confused'],
    helpsWithReasons: ['extended_idle', 'self_reported_frustrated', 'self_reported_tired'],
  },
  {
    activityType: 'breathing',
    title: 'Box Breathing',
    description: 'A simple breathing technique to help you reset and refocus.',
    estimatedDurationSeconds: 60,
    instructions: [
      'Breathe in slowly for 4 counts',
      'Hold your breath for 4 counts',
      'Breathe out slowly for 4 counts',
      'Hold empty for 4 counts',
      'Repeat 3 times',
    ],
    gradeBands: ['G6_8', 'G9_12'],
    targetMoods: ['frustrated', 'tired', 'confused'],
    helpsWithReasons: ['extended_idle', 'self_reported_frustrated', 'self_reported_tired'],
  },
  {
    activityType: 'breathing',
    title: 'Star Breathing',
    description: 'Trace a star shape while breathing deeply.',
    estimatedDurationSeconds: 50,
    instructions: [
      'Hold up your hand like a star',
      'Trace up one finger while breathing in',
      'Trace down while breathing out',
      'Continue around all 5 fingers',
    ],
    gradeBands: ['K5', 'G6_8'],
    targetMoods: ['frustrated', 'confused', 'okay'],
    helpsWithReasons: ['rapid_switching', 'self_reported_frustrated'],
  },

  // ─── Stretching Activities ───────────────────────────────────────────────────
  {
    activityType: 'stretching',
    title: 'Reach for the Sky',
    description: 'A quick stretch to wake up your body.',
    estimatedDurationSeconds: 30,
    instructions: [
      'Stand up tall',
      "Reach your arms up high like you're touching the clouds",
      'Stretch side to side like a tree in the wind',
      'Roll your shoulders back',
      'Shake out your hands',
    ],
    gradeBands: ['K5', 'G6_8'],
    targetMoods: ['tired', 'okay'],
    helpsWithReasons: ['extended_idle', 'self_reported_tired', 'app_backgrounded'],
  },
  {
    activityType: 'stretching',
    title: 'Desk Stretches',
    description: 'Quick stretches you can do right at your desk.',
    estimatedDurationSeconds: 45,
    instructions: [
      'Roll your neck gently in circles',
      'Shrug your shoulders up, then drop them',
      'Stretch your arms out wide',
      'Twist gently left, then right',
      'Wiggle your fingers and toes',
    ],
    gradeBands: ['G6_8', 'G9_12'],
    targetMoods: ['tired', 'okay', 'confused'],
    helpsWithReasons: ['extended_idle', 'self_reported_tired'],
  },

  // ─── Movement Activities ─────────────────────────────────────────────────────
  {
    activityType: 'movement',
    title: 'Wiggle Break',
    description: 'Shake out the wiggles with some fun movement!',
    estimatedDurationSeconds: 30,
    instructions: [
      'Stand up and shake your arms',
      'Wiggle like a noodle',
      'Jump in place 5 times',
      'Do 3 big arm circles',
      'Take a deep breath and sit back down',
    ],
    gradeBands: ['K5'],
    targetMoods: ['frustrated', 'tired', 'okay'],
    helpsWithReasons: ['extended_idle', 'rapid_switching', 'rapid_exit'],
  },
  {
    activityType: 'movement',
    title: 'Quick Energy Boost',
    description: 'A minute of movement to refresh your energy.',
    estimatedDurationSeconds: 60,
    instructions: [
      'Stand up and march in place',
      'Do 10 jumping jacks (or step-taps)',
      'Touch your toes',
      'Reach up high',
      'Roll your shoulders and sit back down',
    ],
    gradeBands: ['G6_8', 'G9_12'],
    targetMoods: ['tired', 'okay'],
    helpsWithReasons: ['extended_idle', 'self_reported_tired', 'app_backgrounded'],
  },

  // ─── Grounding Activities ────────────────────────────────────────────────────
  {
    activityType: 'grounding',
    title: '5-4-3-2-1 Senses',
    description: 'Notice things around you to feel more present.',
    estimatedDurationSeconds: 60,
    instructions: [
      'Name 5 things you can SEE',
      'Name 4 things you can TOUCH',
      'Name 3 things you can HEAR',
      'Name 2 things you can SMELL',
      'Name 1 thing you can TASTE',
    ],
    gradeBands: ['K5', 'G6_8', 'G9_12'],
    targetMoods: ['frustrated', 'confused'],
    helpsWithReasons: ['self_reported_frustrated', 'rapid_switching', 'rapid_exit'],
  },
  {
    activityType: 'grounding',
    title: 'Feet on the Floor',
    description: 'A quick grounding exercise to feel centered.',
    estimatedDurationSeconds: 30,
    instructions: [
      'Put both feet flat on the floor',
      'Press your feet down gently',
      'Feel the floor supporting you',
      'Take 3 slow breaths',
      'Notice how your body feels',
    ],
    gradeBands: ['G6_8', 'G9_12'],
    targetMoods: ['frustrated', 'confused', 'tired'],
    helpsWithReasons: ['self_reported_frustrated', 'self_reported_tired'],
  },

  // ─── Mindful Pause Activities ────────────────────────────────────────────────
  {
    activityType: 'mindful_pause',
    title: 'Cloud Watching',
    description: 'Imagine watching clouds drift by to relax your mind.',
    estimatedDurationSeconds: 45,
    instructions: [
      'Close your eyes or look at a blank space',
      "Imagine you're lying on soft grass",
      'Watch fluffy clouds slowly drift by',
      'Notice their shapes - maybe one looks like an animal?',
      'Take 3 slow breaths and open your eyes',
    ],
    gradeBands: ['K5'],
    targetMoods: ['frustrated', 'tired', 'confused'],
    helpsWithReasons: ['extended_idle', 'self_reported_frustrated', 'self_reported_tired'],
  },
  {
    activityType: 'mindful_pause',
    title: 'Thought Reset',
    description: 'A quick mental reset before continuing.',
    estimatedDurationSeconds: 30,
    instructions: [
      'Close your eyes for a moment',
      'Take one deep breath',
      'Think: "I can do this"',
      'Open your eyes',
      'Ready to continue!',
    ],
    gradeBands: ['G6_8', 'G9_12'],
    targetMoods: ['frustrated', 'confused', 'okay'],
    helpsWithReasons: ['rapid_switching', 'self_reported_frustrated'],
  },

  // ─── Simple Game Activities ──────────────────────────────────────────────────
  {
    activityType: 'simple_game',
    title: 'Color Hunt',
    description: 'A quick visual game to give your brain a break.',
    estimatedDurationSeconds: 45,
    instructions: [
      'Look around the room',
      'Find 3 things that are BLUE',
      'Find 3 things that are GREEN',
      'Find something with your favorite color',
      'Great job! Ready to continue?',
    ],
    gradeBands: ['K5'],
    targetMoods: ['tired', 'okay', 'frustrated'],
    helpsWithReasons: ['extended_idle', 'app_backgrounded'],
  },
  {
    activityType: 'simple_game',
    title: 'Quick Brain Teaser',
    description: 'A simple puzzle to refresh your thinking.',
    estimatedDurationSeconds: 30,
    instructions: [
      'Count backwards from 20 by 2s',
      'Or: Name 5 animals that start with the same letter',
      'Done? Nice work!',
    ],
    gradeBands: ['G6_8', 'G9_12'],
    targetMoods: ['tired', 'okay'],
    helpsWithReasons: ['extended_idle', 'app_backgrounded'],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export interface RecommendationContext {
  gradeBand: GradeBand;
  mood?: SelfReportedMood;
  focusLossReasons?: FocusLossReason[];
}

/**
 * Get a regulation recommendation based on context.
 * Uses scoring to find the best match from the static catalog.
 *
 * @param context - Learner context for personalization
 * @returns A suitable regulation recommendation
 */
export function getRecommendation(context: RecommendationContext): RegulationRecommendation {
  // Filter to grade-appropriate activities
  const eligible = ACTIVITY_CATALOG.filter((a) => a.gradeBands.includes(context.gradeBand));

  if (eligible.length === 0) {
    // Fallback to any activity if none match grade band
    return toRecommendation(ACTIVITY_CATALOG[0]);
  }

  // Score each activity based on context match
  const scored = eligible.map((activity) => ({
    activity,
    score: scoreActivity(activity, context),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Add some randomness among top choices to avoid repetition
  const topChoices = scored.filter((s) => s.score >= scored[0].score * 0.8);
  const selected = topChoices[Math.floor(Math.random() * topChoices.length)];

  return toRecommendation(selected.activity);
}

/**
 * Get all available activities for a grade band.
 * Useful for letting learners choose their own activity.
 */
export function getAvailableActivities(gradeBand: GradeBand): RegulationRecommendation[] {
  return ACTIVITY_CATALOG.filter((a) => a.gradeBands.includes(gradeBand)).map(toRecommendation);
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function scoreActivity(activity: ActivityDefinition, context: RecommendationContext): number {
  let score = 1; // Base score

  // Mood match
  if (context.mood && activity.targetMoods.includes(context.mood)) {
    score += 3;
  }

  // Focus loss reason match
  if (context.focusLossReasons) {
    for (const reason of context.focusLossReasons) {
      if (activity.helpsWithReasons.includes(reason)) {
        score += 2;
      }
    }
  }

  return score;
}

function toRecommendation(activity: ActivityDefinition): RegulationRecommendation {
  return {
    activityType: activity.activityType,
    title: activity.title,
    description: activity.description,
    estimatedDurationSeconds: activity.estimatedDurationSeconds,
    instructions: activity.instructions,
    source: 'static',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// AI INTEGRATION POINT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * FUTURE: Get AI-generated recommendation.
 *
 * This would call the ai-orchestrator FOCUS agent to generate
 * a personalized regulation activity based on:
 * - Learner profile (from Virtual Brain)
 * - Current emotional state
 * - Recent activity history
 * - Time of day
 * - Previous regulation activity effectiveness
 *
 * For MVP, we use the static catalog above.
 */
export async function getAiRecommendation(
  _context: RecommendationContext
): Promise<RegulationRecommendation | null> {
  // TODO: Implement AI integration
  // const response = await aiOrchestratorClient.callFocusAgent({
  //   agentType: 'FOCUS',
  //   payload: {
  //     gradeBand: context.gradeBand,
  //     mood: context.mood,
  //     focusLossReasons: context.focusLossReasons,
  //     requestType: 'regulation_activity',
  //   },
  // });
  // return parseAiResponse(response);

  return null; // Fall back to static catalog
}
