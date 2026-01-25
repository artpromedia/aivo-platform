import { PrismaClient, Prisma } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient();

// Re-export Prisma namespace for types
export { Prisma };

// Re-export all enums from the generated Prisma client
export {
  // Risk & Status Enums
  RiskLevel,
  AssessmentType,
  AssessmentStatus,
  QuestionType,
  CheckInType,
  
  // Activity Enums
  ActivityType,
  Difficulty,
  
  // Intervention Enums
  InterventionType,
  InterventionStatus,
  
  // Progress & Goal Enums
  ProgressLevel,
  GoalStatus,
  
  // Alert Enums
  SELAlertType,
  AlertSeverity,
  AlertStatus,
} from '../generated/prisma-client/index.js';
