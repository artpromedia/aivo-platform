import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
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
  subdomain: null,
  customDomain: null,
  domainVerified: false,
  domainVerifiedAt: null,
  region: 'us-east-1',
  isActive: true,
  status: 'ACTIVE',
  deletedAt: null,
  deleteGraceEndsAt: null,
  deletedByUserId: null,
  logoUrl: null,
  primaryColor: null,
  billingPlanId: null,
  settingsJson: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Create a mock transaction function that executes the callback with the same mock
const createMockTransaction = (mockPrisma: any) => {
  return async (callback: any) => {
    return callback(mockPrisma);
  };
};

// Mock prisma before importing app
vi.mock('../src/prisma', () => {
  const mockPrisma = {
    tenant: {
      create: vi.fn(async ({ data }: any) => ({
        ...sampleTenant,
        id: `tenant-${Date.now()}`,
        type: data.type,
        name: data.name,
        primaryDomain: data.primaryDomain,
        subdomain: data.subdomain ?? null,
        customDomain: data.customDomain ?? null,
        region: data.region ?? 'us-east-1',
        logoUrl: data.logoUrl ?? null,
        primaryColor: data.primaryColor ?? null,
        billingPlanId: data.billingPlanId ?? null,
        settingsJson: data.settingsJson ?? {},
        status: data.status ?? 'ACTIVE',
        isActive: data.isActive ?? true,
      })),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    tenantConfig: {
      create: vi.fn().mockResolvedValue({ id: 'config-1', tenantId: 'tenant-xyz' }),
    },
    tenantAuditEvent: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
    $transaction: vi.fn(),
  };
  
  // Set up $transaction to call the callback with mockPrisma
  mockPrisma.$transaction = vi.fn(async (callback: any) => callback(mockPrisma));
  
  return { prisma: mockPrisma };
});

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
  let app: Awaited<ReturnType<Awaited<ReturnType<typeof loadApp>>>>;

  beforeAll(async () => {
    const createApp = await loadApp();
    app = createApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
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
