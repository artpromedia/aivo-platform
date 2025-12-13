/**
 * Prisma Client Instance
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
});

export type {
  Notification,
  NotificationPreference,
  DeviceToken,
  DeliveryLog,
  NotificationTemplate,
  NotificationQueue,
} from '../generated/prisma-client/index.js';

export {
  NotificationType,
  DeliveryChannel,
  DeliveryStatus,
  NotificationPriority,
} from '../generated/prisma-client/index.js';
