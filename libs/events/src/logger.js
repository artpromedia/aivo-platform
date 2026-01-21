// =============================================================================
// @aivo/events - Logger
// =============================================================================
//
// Structured logging for the events library using pino.
import pino from 'pino';
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
export const logger = pino({
  name: 'aivo-events',
  level,
  formatters: {
    level: (label) => ({ level: label }),
  },
});
/**
 * Create a child logger with a specific context
 */
export function createLogger(context) {
  return logger.child({ context });
}
//# sourceMappingURL=logger.js.map
