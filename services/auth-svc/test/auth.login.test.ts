import { beforeAll, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import Fastify, { type FastifyRequest } from 'fastify';

// Prepare env before importing app/config
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.JWT_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
process.env.JWT_PUBLIC_KEY = publicKey.export({ type: 'spki', format: 'pem' }).toString();
process.env.CONSUMER_TENANT_ID = '11111111-1111-1111-1111-111111111111';

// Mock prisma before importing routes
const users = new Map<string, any>();
const passwordHash = bcrypt.hashSync('P@ssw0rd123', 10);
const baseUser = {
  id: 'user-1',
  email: 'parent@example.com',
  tenantId: process.env.CONSUMER_TENANT_ID!,
  passwordHash,
  status: 'ACTIVE',
  roles: [{ id: 'role-1', role: 'PARENT', userId: 'user-1', createdAt: new Date() }],
};
users.set(baseUser.email, baseUser);

vi.mock('../src/prisma', () => {
  return {
    prisma: {
      user: {
        findFirst: vi.fn(async ({ where }: any) => {
          const found = users.get(where.email);
          if (found && found.tenantId === where.tenantId) return found;
          return null;
        }),
        create: vi.fn(async ({ data }: any) => {
          const id = `user-${users.size + 1}`;
          const user = {
            id,
            email: data.email,
            tenantId: data.tenantId,
            passwordHash: data.passwordHash,
            status: data.status,
            roles:
              data.roles?.create?.map((r: any, idx: number) => ({
                id: `role-${idx + 1}`,
                role: r.role,
                userId: id,
                createdAt: new Date(),
              })) ?? [],
          };
          users.set(user.email, user);
          return user;
        }),
      },
    },
  };
});

async function loadApp() {
  const mod = await import('../src/app');
  return mod.createApp;
}

describe('auth routes', () => {
  let app: ReturnType<Awaited<ReturnType<typeof loadApp>>>;

  beforeAll(async () => {
    const createApp = await loadApp();
    app = createApp();
  });

  it('registers a new user and returns tokens + roles', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'newparent@example.com',
        password: 'Str0ngPwd!23',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe('newparent@example.com');
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.user.roles).toContain('PARENT');
  });

  it('logs in with valid credentials and returns tokens', async () => {
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

    const decoded = await jwtVerify(body.accessToken, publicKey);
    expect(decoded.payload.sub).toBe(baseUser.id);
    expect(decoded.payload.tenant_id).toBe(baseUser.tenantId);
    expect(decoded.payload.roles).toContain('PARENT');
  });

  it('rejects login with wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'parent@example.com',
        password: 'WrongPass1!',
      },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('auth middleware', () => {
  let server: ReturnType<typeof Fastify>;
  let authMiddleware: any;

  beforeAll(async () => {
    ({ authMiddleware } = await import('../src/middleware/authMiddleware.js'));
    server = Fastify();
    server.register(authMiddleware);
    server.get('/protected', async (request: FastifyRequest) => {
      return { auth: (request as any).auth };
    });
  });

  it('rejects missing token', async () => {
    const res = await server.inject({ method: 'GET', url: '/protected' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer not-a-jwt' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts valid token and attaches auth context', async () => {
    const token = await new SignJWT({ sub: 'user-xyz', tenant_id: 'tenant-123', roles: ['PARENT'] })
      .setProtectedHeader({ alg: 'RS256' })
      .sign(privateKey);

    const res = await server.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.auth.userId).toBe('user-xyz');
    expect(body.auth.tenantId).toBe('tenant-123');
    expect(body.auth.roles).toContain('PARENT');
  });
});
