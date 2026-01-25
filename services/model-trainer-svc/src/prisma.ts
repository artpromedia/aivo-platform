import {
  PrismaClient,
  Prisma,
  DataSourceType,
  DatasetStatus,
  ExperimentStatus,
  MLFramework,
  ComputeType,
  JobStatus,
  SearchStrategy,
  RunStatus,
  TrainingPhase,
  LogLevel,
  ResourceStatus,
  QueueStatus,
} from '../generated/prisma-client/index.js';

export const prisma = new PrismaClient();

export {
  Prisma,
  DataSourceType,
  DatasetStatus,
  ExperimentStatus,
  MLFramework,
  ComputeType,
  JobStatus,
  SearchStrategy,
  RunStatus,
  TrainingPhase,
  LogLevel,
  ResourceStatus,
  QueueStatus,
};
