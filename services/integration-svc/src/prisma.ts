/**
 * Prisma client singleton for integration-svc
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

export { Prisma } from '../generated/prisma-client/index.js';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
export const prisma = globalThis.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;

// Re-export types for convenience
export type {
  WebhookEndpoint,
  WebhookDelivery,
  ApiKey,
  ExternalLearningEvent,
  GoogleClassroomCredential,
  GoogleClassroomAssignment,
  GoogleClassroomSubmission,
  Enrollment,
  GoogleClassroomSyncLog,
} from '../generated/prisma-client/index.js';

// Re-export enums
export {
  WebhookEventType,
  WebhookDeliveryStatus,
  ApiKeyStatus,
  ApiScope,
  EnrollmentRole,
  EnrollmentStatus,
  ClassStatus,
} from '../generated/prisma-client/index.js';

// Re-export PrismaClient type
export type { PrismaClient } from '../generated/prisma-client/index.js';
