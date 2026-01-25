/**
 * AIVO Audit Service - Prisma Client
 *
 * Database client singleton for the audit service.
 */

import {
  PrismaClient,
  Prisma,
  AuditCategory,
  AuditSeverity,
  AuditOutcome,
  ExportStatus,
  ExportFormat,
} from '../generated/prisma-client/index.js';

// Re-export Prisma namespace and types
export { Prisma };
export type { PrismaClient };

// Re-export all enums from the schema
export { AuditCategory, AuditSeverity, AuditOutcome, ExportStatus, ExportFormat };

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
});
