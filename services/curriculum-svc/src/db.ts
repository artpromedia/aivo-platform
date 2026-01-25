/**
 * Database connection for Curriculum Service
 */

export { prisma } from './prisma.js';

// Import locally for use in functions below
import { prisma } from './prisma.js';

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
