import { PrismaClient, Prisma, WorkflowStatus, ExecutionStatus, StepType, TriggerType } from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient();

// Re-export enums and Prisma namespace for use by other modules
export { Prisma, WorkflowStatus, ExecutionStatus, StepType, TriggerType };
