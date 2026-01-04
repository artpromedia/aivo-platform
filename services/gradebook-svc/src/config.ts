/**
 * Service Configuration
 */

export const config = {
  port: process.env.PORT ?? '3030',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  natsUrl: process.env.NATS_URL ?? 'nats://localhost:4222',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  // Gradebook settings
  defaultGradingScale: 'PERCENTAGE' as const,
  defaultCalculationType: 'WEIGHTED_CATEGORIES' as const,
  maxGradeHistoryEntries: 100,

  // Assessment settings
  maxQuestionsPerAssessment: 100,
  maxQuestionBankSize: 10000,
  defaultTimeLimit: 60, // minutes

  // Export settings
  maxExportRows: 5000,
};
