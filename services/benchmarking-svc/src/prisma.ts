/**
 * Prisma client singleton for benchmarking-svc
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

export { Prisma } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient();

// Re-export enums
export {
  ParticipationStatus,
  DistrictSize,
  GeographicType,
  MetricCategory,
  ReportStatus,
} from '../generated/prisma-client/index.js';

// Re-export PrismaClient type
export type { PrismaClient } from '../generated/prisma-client/index.js';
