import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  console.log('📦 Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('📦 Database disconnected');
}
