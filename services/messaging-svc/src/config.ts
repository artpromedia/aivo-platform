/**
 * Messaging Service Configuration
 */

export const config = {
  port: Number.parseInt(process.env.PORT || '4041', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // NATS configuration
  nats: {
    enabled: process.env.NATS_ENABLED === 'true',
    url: process.env.NATS_URL || 'nats://localhost:4222',
  },

  // Limits
  limits: {
    maxMessageLength: Number.parseInt(process.env.MAX_MESSAGE_LENGTH || '4000', 10),
    maxParticipants: Number.parseInt(process.env.MAX_PARTICIPANTS || '100', 10),
    maxFileSize: Number.parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  },

  // Cloudflare R2 storage (S3-compatible)
  r2: {
    endpoint: process.env.R2_ENDPOINT || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.STORAGE_ACCESS_KEY || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.STORAGE_SECRET_KEY || '',
    bucket: process.env.R2_ATTACHMENTS_BUCKET || 'aivo-message-attachments',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  },

  // Real-time (future: WebSocket config)
  realtime: {
    enabled: process.env.REALTIME_ENABLED === 'true',
  },
} as const;
