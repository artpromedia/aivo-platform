import { vi } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_ISSUER = 'test';

// Mock Redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      subscribe: vi.fn(),
      publish: vi.fn(),
      on: vi.fn(),
      quit: vi.fn(),
    })),
  };
});

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn((fn) => fn({})),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    syncConflict: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    syncHistory: {
      create: vi.fn(),
    },
  },
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));
