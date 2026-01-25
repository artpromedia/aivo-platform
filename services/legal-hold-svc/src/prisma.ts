/**
 * AIVO Legal Hold Service - Prisma Client
 */

import {
  PrismaClient,
  Prisma,
  // Enums
  MatterType,
  MatterStatus,
  RiskLevel,
  HoldStatus,
  HoldPriority,
  CustodianStatus,
  HoldCustodianStatus,
  DataSourceType,
  PreservationStatus,
  NotificationType,
  NotificationStatus,
  ReleaseType,
  DocumentType,
  ReportType,
  ReportStatus,
} from '../generated/prisma-client/index.js';

import { config } from './config.js';

// Re-export Prisma namespace and enums for use by other modules
export { Prisma };
export {
  MatterType,
  MatterStatus,
  RiskLevel,
  HoldStatus,
  HoldPriority,
  CustodianStatus,
  HoldCustodianStatus,
  DataSourceType,
  PreservationStatus,
  NotificationType,
  NotificationStatus,
  ReleaseType,
  DocumentType,
  ReportType,
  ReportStatus,
};

export const prisma = new PrismaClient({
  log: config.nodeEnv === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
