import 'dotenv/config';

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4040', 10),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  
  // NATS
  nats: {
    enabled: process.env.NATS_ENABLED === 'true',
    url: process.env.NATS_URL ?? 'nats://localhost:4222',
  },
  
  // Push notifications - FCM
  fcm: {
    enabled: process.env.FCM_ENABLED === 'true',
    projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.FCM_PROJECT_ID ?? '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY ?? '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
    serviceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH ?? '',
  },
  
  // Push notifications - APNs
  apns: {
    enabled: process.env.APNS_ENABLED === 'true',
    keyId: process.env.APNS_KEY_ID ?? '',
    teamId: process.env.APNS_TEAM_ID ?? '',
    privateKey: process.env.APNS_PRIVATE_KEY ?? '',
    keyPath: process.env.APNS_KEY_PATH ?? '',
    bundleId: process.env.APNS_BUNDLE_ID ?? '',
    production: process.env.APNS_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production',
  },
  
  // Email - Primary configuration
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    
    // Default sender
    fromEmail: process.env.EMAIL_FROM ?? 'noreply@aivo.app',
    fromName: process.env.EMAIL_FROM_NAME ?? 'AIVO',
    replyToEmail: process.env.EMAIL_REPLY_TO ?? 'support@aivo.app',
    
    // Provider selection
    primaryProvider: process.env.EMAIL_PRIMARY_PROVIDER ?? 'sendgrid', // 'sendgrid' | 'ses'
    fallbackProvider: process.env.EMAIL_FALLBACK_PROVIDER ?? 'ses',
    fallbackEnabled: process.env.EMAIL_FALLBACK_ENABLED !== 'false',
    
    // SendGrid configuration
    sendgrid: {
      enabled: process.env.SENDGRID_ENABLED !== 'false',
      apiKey: process.env.SENDGRID_API_KEY ?? '',
      webhookVerificationKey: process.env.SENDGRID_WEBHOOK_KEY ?? '',
      sandboxMode: process.env.SENDGRID_SANDBOX_MODE === 'true',
      ipPoolName: process.env.SENDGRID_IP_POOL ?? '',
      // SendGrid-hosted template IDs (optional, can use local Handlebars templates instead)
      templates: {
        welcome: process.env.SENDGRID_TEMPLATE_WELCOME ?? '',
        passwordReset: process.env.SENDGRID_TEMPLATE_PASSWORD_RESET ?? '',
        emailVerification: process.env.SENDGRID_TEMPLATE_EMAIL_VERIFICATION ?? '',
      },
    },
    
    // AWS SES configuration
    ses: {
      enabled: process.env.SES_ENABLED !== 'false',
      region: process.env.AWS_SES_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? '',
      configurationSetName: process.env.SES_CONFIGURATION_SET ?? '',
      // SES template ARNs (optional)
      templates: {
        welcome: process.env.SES_TEMPLATE_WELCOME ?? '',
        passwordReset: process.env.SES_TEMPLATE_PASSWORD_RESET ?? '',
        emailVerification: process.env.SES_TEMPLATE_EMAIL_VERIFICATION ?? '',
      },
    },
    
    // Rate limiting (per second)
    rateLimit: {
      perSecond: parseInt(process.env.EMAIL_RATE_LIMIT_PER_SECOND ?? '100', 10),
      perMinute: parseInt(process.env.EMAIL_RATE_LIMIT_PER_MINUTE ?? '1000', 10),
      perHour: parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR ?? '10000', 10),
    },
    
    // Validation settings
    validation: {
      checkMx: process.env.EMAIL_CHECK_MX !== 'false',
      checkDisposable: process.env.EMAIL_CHECK_DISPOSABLE !== 'false',
      checkRoleBased: process.env.EMAIL_CHECK_ROLE_BASED === 'true', // Default off for schools
      mxTimeout: parseInt(process.env.EMAIL_MX_TIMEOUT ?? '5000', 10),
    },
    
    // Template settings
    templates: {
      directory: process.env.EMAIL_TEMPLATES_DIR ?? './src/channels/email/templates',
      localesDirectory: process.env.EMAIL_LOCALES_DIR ?? './src/channels/email/locales',
      defaultLocale: process.env.EMAIL_DEFAULT_LOCALE ?? 'en',
      cacheEnabled: process.env.EMAIL_TEMPLATE_CACHE !== 'false',
    },
    
    // Tracking settings
    tracking: {
      openTracking: process.env.EMAIL_TRACK_OPENS !== 'false',
      clickTracking: process.env.EMAIL_TRACK_CLICKS !== 'false',
      subscriptionTracking: process.env.EMAIL_SUBSCRIPTION_TRACKING !== 'false',
      unsubscribeUrl: process.env.EMAIL_UNSUBSCRIBE_URL ?? 'https://app.aivo.app/unsubscribe',
      preferencesUrl: process.env.EMAIL_PREFERENCES_URL ?? 'https://app.aivo.app/email-preferences',
    },
    
    // Provider health check settings
    healthCheck: {
      intervalMs: parseInt(process.env.EMAIL_HEALTH_CHECK_INTERVAL ?? '30000', 10),
      recoveryDelayMs: parseInt(process.env.EMAIL_RECOVERY_DELAY ?? '60000', 10),
    },
    
    // COPPA compliance
    coppa: {
      requireParentEmail: process.env.COPPA_REQUIRE_PARENT_EMAIL !== 'false',
      noticeEnabled: process.env.COPPA_NOTICE_ENABLED !== 'false',
    },
  },
  
  // SMS
  sms: {
    enabled: process.env.SMS_ENABLED === 'true',
    provider: process.env.SMS_PROVIDER ?? 'twilio',
    
    // Twilio configuration
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
      authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
      fromNumber: process.env.TWILIO_FROM_NUMBER ?? '',
      // Messaging Service for A2P 10DLC compliance
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID ?? '',
      // Twilio Verify for OTP
      verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID ?? '',
      // Status callback webhook URL
      statusCallbackUrl: process.env.TWILIO_STATUS_CALLBACK_URL ?? '',
    },
    
    // Webhook configuration
    webhookUrl: process.env.SMS_WEBHOOK_URL ?? '',
    validateWebhookSignature: process.env.SMS_VALIDATE_WEBHOOK_SIGNATURE !== 'false',
    
    // Rate limiting
    rateLimit: {
      perPhonePerSecond: parseInt(process.env.SMS_RATE_PER_PHONE_SECOND ?? '0.1', 10), // 1 per 10 seconds
      perPhonePerMinute: parseInt(process.env.SMS_RATE_PER_PHONE_MINUTE ?? '6', 10),
      perTenantPerDay: parseInt(process.env.SMS_RATE_PER_TENANT_DAY ?? '1000', 10),
      otpPerPhonePerMinute: parseInt(process.env.SMS_OTP_RATE_PER_PHONE_MINUTE ?? '10', 10),
    },
    dailyLimitPerTenant: parseInt(process.env.SMS_DAILY_LIMIT_PER_TENANT ?? '1000', 10),
    
    // TCPA Compliance
    tcpa: {
      consentExpiryMonths: parseInt(process.env.SMS_CONSENT_EXPIRY_MONTHS ?? '18', 10),
      renewalWarningDays: parseInt(process.env.SMS_RENEWAL_WARNING_DAYS ?? '30', 10),
      quietHoursStart: parseInt(process.env.SMS_QUIET_HOURS_START ?? '21', 10), // 9 PM
      quietHoursEnd: parseInt(process.env.SMS_QUIET_HOURS_END ?? '8', 10), // 8 AM
      enforceQuietHours: process.env.SMS_ENFORCE_QUIET_HOURS !== 'false',
    },
    
    // Phone validation
    validation: {
      requireMobile: process.env.SMS_REQUIRE_MOBILE !== 'false',
      checkCarrier: process.env.SMS_CHECK_CARRIER === 'true',
      carrierCacheTtlHours: parseInt(process.env.SMS_CARRIER_CACHE_TTL_HOURS ?? '24', 10),
      supportedCountries: (process.env.SMS_SUPPORTED_COUNTRIES ?? 'US,CA,GB,AU,NZ,IE').split(','),
    },
    
    // Content filtering
    contentFilter: {
      enabled: process.env.SMS_CONTENT_FILTER !== 'false',
      maxLength: parseInt(process.env.SMS_MAX_LENGTH ?? '1600', 10),
    },
    
    // Feature flags
    features: {
      otpEnabled: process.env.SMS_OTP_ENABLED !== 'false',
      mmsEnabled: process.env.SMS_MMS_ENABLED === 'true',
      schedulingEnabled: process.env.SMS_SCHEDULING_ENABLED === 'true',
    },
  },
  
  // Rate limiting (legacy - use email.rateLimit for email)
  rateLimits: {
    pushPerMinute: parseInt(process.env.PUSH_RATE_LIMIT ?? '100', 10),
    emailPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT ?? '50', 10),
    smsPerMinute: parseInt(process.env.SMS_RATE_LIMIT ?? '10', 10),
  },
  
  // Token cleanup
  tokenCleanup: {
    staleTokenDays: parseInt(process.env.STALE_TOKEN_DAYS ?? '60', 10),
    maxDevicesPerUser: parseInt(process.env.MAX_DEVICES_PER_USER ?? '10', 10),
  },
};

