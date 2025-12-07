import { beforeAll, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import bcrypt from 'bcryptjs';

// Prepare env before importing app/config
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.JWT_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
process.env.JWT_PUBLIC_KEY = publicKey.export({ type: 'spki', format: 'pem' }).toString();
process.env.CONSUMER_TENANT_ID = '11111111-1111-1111-1111-111111111111';

// Mock prisma before importing routes
const mockUser = {
  id: 'user-1',
  email: 'parent@example.com',
  tenantId: process.env.CONSUMER_TENANT_ID!,
  passwordHash: bcrypt.hashSync('P@ssw0rd123', 10),
  status: 'ACTIVE',
  roles: [{ id: 'role-1', role: 'PARENT', userId: 'user-1', createdAt: new Date() }],
};

vi.mock('../src/prisma', () => {
  return {
    prisma: {
      user: {
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.email === mockUser.email && where.tenantId === mockUser.tenantId) {
            return mockUser;
          }
          return null;
        }),
        create: vi.fn(),
      },
      userRole: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

describe('POST /auth/login', () => {
  let app: ReturnType<Awaited<ReturnType<typeof importApp>>>;

  async function importApp() {
    const mod = await import('../src/app');
    return mod.createApp;
  }

  beforeAll(async () => {
    const createApp = await importApp();
    app = createApp();
  });

  it('returns tokens and user info on valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'parent@example.com',
        password: 'P@ssw0rd123',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.email).toBe('parent@example.com');
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });
});
