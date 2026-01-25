import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient();

// Re-export Prisma namespace for types
export { Prisma };

// Re-export all enums from the generated Prisma client
export {
  StudentStatus,
  IEPType,
  IEPStatus,
  GoalDomain,
  GoalStatus,
  AccommodationCategory,
  ServiceType,
  TeamRole,
  MeetingType,
  MeetingStatus,
  AttendanceStatus,
  ProgressLevel,
  EvaluationType,
  EvalStatus,
  ComplianceAlertType,
  AlertStatus,
} from '../generated/prisma-client/index.js';
