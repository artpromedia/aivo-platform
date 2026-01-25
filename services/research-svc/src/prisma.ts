import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

// Re-export Prisma namespace and all enums for use throughout the service
export { Prisma };
export {
  ProjectType,
  ProjectStatus,
  DUAStatus,
  DatasetGranularity,
  ExportJobStatus,
  ExportFormat,
  AccessGrantScope,
  AccessGrantStatus,
  AuditAction,
} from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
