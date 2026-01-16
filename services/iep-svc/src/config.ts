/**
 * AIVO IEP Service - Configuration
 */

export const config = {
  port: parseInt(process.env.PORT || '4070', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || '/etc/secrets/jwt-public.pem',
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Compliance timelines (in days)
  compliance: {
    initialEvaluationDays: 60,      // Days to complete initial evaluation
    annualReviewWarningDays: 30,    // Days before annual review to alert
    reevaluationYears: 3,           // Years between reevaluations
    meetingNoticeDays: 10,          // Days notice for meetings
    progressReportingPeriods: 4,    // Reports per year (quarterly)
    transitionPlanAge: 16,          // Age when transition planning required
  },

  // Notifications
  notifications: {
    enabled: process.env.NOTIFICATIONS_ENABLED === 'true',
    batchSize: 50,
  },
};
