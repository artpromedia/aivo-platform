/**
 * Parent Service Configuration
 */

import { z } from 'zod';

const configSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  port: z.coerce.number().default(3010),
  databaseUrl: z.string(),
  redisUrl: z.string().optional(),
  corsOrigins: z.string().transform((val) => val.split(',')),
  jwtSecret: z.string(),
  appUrl: z.string().default('http://localhost:3000'),

  // Email configuration
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().default(587),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  emailFrom: z.string().default('noreply@aivo.com'),

  // Push notification configuration
  firebaseProjectId: z.string().optional(),
  firebasePrivateKey: z.string().optional(),
  firebaseClientEmail: z.string().optional(),

  // Rate limiting
  rateLimitWindowMs: z.coerce.number().default(60000),
  rateLimitMaxRequests: z.coerce.number().default(100),
  messagingRateLimitPerDay: z.coerce.number().default(50),

  // Content moderation
  moderationEnabled: z.coerce.boolean().default(true),
  moderationApiKey: z.string().optional(),

  // COPPA compliance
  coppaMinAge: z.coerce.number().default(13),
  parentInviteExpiryDays: z.coerce.number().default(7),
});

function loadConfig() {
  const result = configSchema.safeParse({
    environment: process.env.NODE_ENV,
    port: process.env.PORT,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
    jwtSecret: process.env.JWT_SECRET,
    appUrl: process.env.APP_URL,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    emailFrom: process.env.EMAIL_FROM,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
    firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
    messagingRateLimitPerDay: process.env.MESSAGING_RATE_LIMIT_PER_DAY,
    moderationEnabled: process.env.MODERATION_ENABLED,
    moderationApiKey: process.env.MODERATION_API_KEY,
    coppaMinAge: process.env.COPPA_MIN_AGE,
    parentInviteExpiryDays: process.env.PARENT_INVITE_EXPIRY_DAYS,
  });

  if (!result.success) {
    console.error('Configuration validation failed:', result.error.format());
    throw new Error('Invalid configuration');
  }

  return result.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof configSchema>;
