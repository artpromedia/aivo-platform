import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT ?? '4040', 10),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  
  // NATS
  nats: {
    enabled: process.env.NATS_ENABLED === 'true',
    url: process.env.NATS_URL ?? 'nats://localhost:4222',
  },
  
  // Push notifications
  fcm: {
    enabled: process.env.FCM_ENABLED === 'true',
    projectId: process.env.FCM_PROJECT_ID ?? '',
    serviceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH ?? '',
  },
  
  apns: {
    enabled: process.env.APNS_ENABLED === 'true',
    keyId: process.env.APNS_KEY_ID ?? '',
    teamId: process.env.APNS_TEAM_ID ?? '',
    keyPath: process.env.APNS_KEY_PATH ?? '',
    bundleId: process.env.APNS_BUNDLE_ID ?? '',
    production: process.env.NODE_ENV === 'production',
  },
  
  // Email
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    provider: process.env.EMAIL_PROVIDER ?? 'sendgrid', // 'sendgrid' | 'ses'
    sendgridApiKey: process.env.SENDGRID_API_KEY ?? '',
    fromEmail: process.env.EMAIL_FROM ?? 'noreply@aivo.app',
    fromName: process.env.EMAIL_FROM_NAME ?? 'AIVO',
  },
  
  // SMS
  sms: {
    enabled: process.env.SMS_ENABLED === 'true',
    provider: process.env.SMS_PROVIDER ?? 'twilio',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? '',
  },
  
  // Rate limiting
  rateLimits: {
    pushPerMinute: parseInt(process.env.PUSH_RATE_LIMIT ?? '100', 10),
    emailPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT ?? '50', 10),
    smsPerMinute: parseInt(process.env.SMS_RATE_LIMIT ?? '10', 10),
  },
};
