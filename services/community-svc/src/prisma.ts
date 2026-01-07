/**
 * Prisma Client Instance
 */

import { PrismaClient } from '../generated/prisma-client/index.js';
import { config } from './config.js';

export const prisma = new PrismaClient({
  log:
    config.nodeEnv === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
});

// Re-export types for convenience
export {
  PostCategory,
  ResourceType,
  UserRole,
} from '../generated/prisma-client/index.js';
