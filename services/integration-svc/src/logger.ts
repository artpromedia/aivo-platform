/**
 * Integration Service Logger
 *
 * Provides structured logging for the integration service.
 * Uses pino for production-ready, JSON-formatted logging.
 */

import pino from 'pino';

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = pino({
  level,
  formatters: {
    level: (label) => ({ level: label }),
  },
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : undefined,
});

/**
 * Create a child logger with a specific context
 */
export function createLogger(context: string): pino.Logger {
  return logger.child({ context });
}
