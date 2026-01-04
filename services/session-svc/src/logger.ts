/**
 * Session Service Logger
 *
 * Provides structured logging using pino for service-level components.
 */

import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  name: 'session-svc',
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  ...(config.nodeEnv !== 'production' && {
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
