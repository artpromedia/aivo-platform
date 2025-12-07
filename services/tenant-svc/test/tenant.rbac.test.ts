import { beforeAll, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { SignJWT } from 'jose';

// JWT keypair for auth middleware
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.JWT_PUBLIC_KEY = publicKey.export({ type: 'spki', format: 'pem' }).toString();

const sampleTenant = {
  id: 'tenant-xyz',
  type: 'DISTRICT',
  name: 'District X',
  primaryDomain: 'districtx.aivo.app',
  settingsJson: {},
  createdAt: new Date(),
};

// Mock prisma before importing app
vi.mock('../src/prisma', () => ({
  prisma: {
    tenant: {
      create: vi.fn(async ({ data }: any) => ({
        ...sampleTenant,
        type: data.type,
        name: data.name,
        primaryDomain: data.primaryDomain,
      })),
    },
  },
}));

async function loadApp() {
  const mod = await import('../src/app');
  return mod.createApp;
}

function signToken(roles: string[]) {
  return new SignJWT({ sub: 'user-1', tenant_id: 'tenant-xyz', roles })
    .setProtectedHeader({ alg: 'RS256' })
    .sign(privateKey);
}

describe('RBAC for /tenants', () => {
  let app: ReturnType<Awaited<ReturnType<typeof loadApp>>>;

  beforeAll(async () => {
    const createApp = await loadApp();
    app = createApp();
  });

  it('rejects unauthenticated request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tenants',
      payload: {
        type: 'DISTRICT',
        name: 'Test District',
        primary_domain: 'test.example.com',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('rejects user without PLATFORM_ADMIN role', async () => {
    const token = await signToken(['PARENT']);
    const res = await app.inject({
      method: 'POST',
      url: '/tenants',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: 'DISTRICT',
        name: 'Test District',
        primary_domain: 'test.example.com',
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('allows PLATFORM_ADMIN to create tenant', async () => {
    const token = await signToken(['PLATFORM_ADMIN']);
    const res = await app.inject({
      method: 'POST',
      url: '/tenants',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: 'DISTRICT',
        name: 'Test District',
        primary_domain: 'test.example.com',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('Test District');
    expect(body.primaryDomain).toBe('test.example.com');
    expect(body.type).toBe('DISTRICT');
  });
});
