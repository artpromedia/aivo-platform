/**
 * Realtime Service Logger
 *
 * Provides structured logging using the @aivo/ts-observability logger.
 */

import { createLogger } from '@aivo/ts-observability';

export const logger = createLogger({
  serviceName: 'realtime-svc',
  environment: process.env.NODE_ENV ?? 'development',
  level: process.env.LOG_LEVEL ?? 'info',
  prettyPrint: process.env.NODE_ENV === 'development',
});
