export const config = {
  port: parseInt(process.env.PORT || '4076', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtPublicKey: process.env.JWT_PUBLIC_KEY || '',
  internalApiKey: process.env.INTERNAL_API_KEY || '',
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || '',
  escalationCheckInterval: parseInt(process.env.ESCALATION_CHECK_INTERVAL || '60000', 10),
};
