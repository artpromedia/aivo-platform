/**
 * Sync Service Logger
 *
 * Provides structured logging using pino for service-level components.
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  name: 'sync-svc',
  level: process.env.LOG_LEVEL ?? 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});
