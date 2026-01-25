import {
  PrismaClient,
  Prisma,
  SkillDomain,
  GradeBand,
  OnboardingStatus,
} from '../generated/prisma-client/index.js';

import { config } from './config.js';

export const prisma = new PrismaClient({
  datasources: { db: { url: config.databaseUrl } },
});

export { Prisma, SkillDomain, GradeBand, OnboardingStatus };
export type { PrismaClient };
