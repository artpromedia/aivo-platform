/**
 * Messaging Service Configuration
 */

export const config = {
  port: parseInt(process.env.PORT || '4041', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // NATS configuration
  nats: {
    enabled: process.env.NATS_ENABLED === 'true',
    url: process.env.NATS_URL || 'nats://localhost:4222',
  },

  // Limits
  limits: {
    maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '4000', 10),
    maxParticipants: parseInt(process.env.MAX_PARTICIPANTS || '100', 10),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  },

  // Real-time (future: WebSocket config)
  realtime: {
    enabled: process.env.REALTIME_ENABLED === 'true',
  },
} as const;
