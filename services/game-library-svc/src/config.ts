import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',

  database: {
    url: process.env.DATABASE_URL || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'development-secret',
    jwtIssuer: process.env.JWT_ISSUER || 'aivo-platform',
  },

  gamification: {
    baseXpReward: 10,
    baseCoinReward: 5,
    brainTrainingBonusXp: 50, // Bonus for completing daily brain training
    streakBonusMultiplier: 0.1, // 10% bonus per streak day (up to 5 days)
  },

  brainTraining: {
    defaultDurationMinutes: 15,
    gamesPerSession: 3,
    maxGamesPerDay: 10,
  },

  recommendations: {
    maxRecentGames: 10,
    rotationThreshold: 3, // Don't recommend same game within last 3 plays
  },
} as const;
