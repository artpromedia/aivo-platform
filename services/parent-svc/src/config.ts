/**
 * Parent Service Configuration
 */

import { z } from 'zod';
import 'dotenv/config';

const configSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  port: z.coerce.number().default(3010),
  databaseUrl: z.string(),
  redisUrl: z.string().optional(),
  corsOrigins: z.string().transform((val) => val.split(',')),
  jwtSecret: z.string(),
  appUrl: z.string().default('http://localhost:3000'),

  // Token expiry settings (in seconds)
  accessTokenExpiresIn: z.coerce.number().default(3600), // 1 hour
  refreshTokenExpiresIn: z.coerce.number().default(2592000), // 30 days

  // Email configuration
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().default(587),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  emailFrom: z.string().default('noreply@aivolearning.com'),

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
  moderationProvider: z.enum(['perspective', 'comprehend', 'none']).default('none'),
  moderationApiKey: z.string().optional(), // Perspective API key
  awsRegion: z.string().default('us-east-1'),
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),

  // COPPA compliance
  coppaMinAge: z.coerce.number().default(13),
  parentInviteExpiryDays: z.coerce.number().default(7),

  // Internal service URLs
  learnerModelSvcUrl: z.string().default('http://localhost:4022'),
  notifySvcUrl: z.string().default('http://localhost:4040'),

  // External URLs
  parentPortalUrl: z.string().default('http://localhost:3000'),

  // Registration settings
  registrationEmailVerificationExpiryHours: z.coerce.number().default(24),
  registrationSchoolCodeExpiryDays: z.coerce.number().default(7),
  registrationMaxFailedAttempts: z.coerce.number().default(5),
  registrationLockoutMinutes: z.coerce.number().default(30),

  // CAPTCHA
  captchaEnabled: z.coerce.boolean().default(false),
  recaptchaSiteKey: z.string().optional(),
  recaptchaSecretKey: z.string().optional(),
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
    moderationProvider: process.env.MODERATION_PROVIDER,
    moderationApiKey: process.env.MODERATION_API_KEY,
    awsRegion: process.env.AWS_REGION,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    coppaMinAge: process.env.COPPA_MIN_AGE,
    parentInviteExpiryDays: process.env.PARENT_INVITE_EXPIRY_DAYS,
    learnerModelSvcUrl: process.env.LEARNER_MODEL_SVC_URL,
    notifySvcUrl: process.env.NOTIFY_SVC_URL,
    parentPortalUrl: process.env.PARENT_PORTAL_URL,
    registrationEmailVerificationExpiryHours: process.env.REGISTRATION_EMAIL_VERIFICATION_EXPIRY_HOURS,
    registrationSchoolCodeExpiryDays: process.env.REGISTRATION_SCHOOL_CODE_EXPIRY_DAYS,
    registrationMaxFailedAttempts: process.env.REGISTRATION_MAX_FAILED_ATTEMPTS,
    registrationLockoutMinutes: process.env.REGISTRATION_LOCKOUT_MINUTES,
    captchaEnabled: process.env.CAPTCHA_ENABLED,
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
    recaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY,
  });

  if (!result.success) {
    console.error('Configuration validation failed:', result.error.format());
    throw new Error('Invalid configuration');
  }

  return result.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof configSchema>;
