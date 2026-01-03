/**
 * Personalization Service Configuration
 */

export const config = {
  port: parseInt(process.env.PORT ?? '3012', 10),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/aivo_personalization',
  warehouseUrl: process.env.WAREHOUSE_URL ?? 'postgresql://localhost:5432/aivo_warehouse',

  // Signal generation thresholds (configurable)
  thresholds: {
    // Engagement
    lowEngagementSessionsPerWeek: parseInt(process.env.THRESHOLD_LOW_ENGAGEMENT_SESSIONS ?? '2', 10),
    highEngagementSessionsPerWeek: parseInt(process.env.THRESHOLD_HIGH_ENGAGEMENT_SESSIONS ?? '10', 10),
    shortSessionMinutes: parseInt(process.env.THRESHOLD_SHORT_SESSION_MINUTES ?? '5', 10),
    longSessionMinutes: parseInt(process.env.THRESHOLD_LONG_SESSION_MINUTES ?? '60', 10),

    // Difficulty/Mastery
    struggleMasteryThreshold: parseFloat(process.env.THRESHOLD_STRUGGLE_MASTERY ?? '0.4'),
    readyForChallengeThreshold: parseFloat(process.env.THRESHOLD_READY_CHALLENGE ?? '0.75'),
    minSessionsForDifficultySignal: parseInt(process.env.THRESHOLD_MIN_SESSIONS_DIFFICULTY ?? '3', 10),
    lowCorrectRateThreshold: parseFloat(process.env.THRESHOLD_LOW_CORRECT_RATE ?? '0.5'),

    // Focus
    highFocusBreaksPerSession: parseFloat(process.env.THRESHOLD_HIGH_FOCUS_BREAKS ?? '4.0'),
    lowFocusBreaksPerSession: parseFloat(process.env.THRESHOLD_LOW_FOCUS_BREAKS ?? '0.5'),

    // Homework
    homeworkAvoidanceThreshold: parseFloat(process.env.THRESHOLD_HOMEWORK_AVOIDANCE ?? '0.3'),
    homeworkHintHeavyThreshold: parseFloat(process.env.THRESHOLD_HINT_HEAVY ?? '0.6'),

    // Recommendation feedback
    highAcceptanceRate: parseFloat(process.env.THRESHOLD_HIGH_REC_ACCEPTANCE ?? '0.7'),
    lowAcceptanceRate: parseFloat(process.env.THRESHOLD_LOW_REC_ACCEPTANCE ?? '0.3'),

    // Signal confidence
    minSampleSizeForConfidence: parseInt(process.env.THRESHOLD_MIN_SAMPLE_SIZE ?? '5', 10),
  },

  // Signal expiration (days)
  signalExpirationDays: {
    ENGAGEMENT: 7,
    DIFFICULTY: 14,
    FOCUS: 7,
    HOMEWORK: 14,
    MODULE_UPTAKE: 30,
    PREFERENCE: 30,
    PROGRESSION: 14,
    RECOMMENDATION: 14,
  } as Record<string, number>,

  // API settings
  defaultRecentDays: 7,
  maxRecentDays: 90,

  // JWT verification (required in production)
  jwtSecret: (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    return secret || 'dev-only-secret';
  })(),
  jwtIssuer: process.env.JWT_ISSUER ?? 'aivo-auth',
};

export type Config = typeof config;
