import { beforeAll, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';

// Mock prisma before importing app
const sampleTenant = {
  id: 'tenant-1',
  type: 'DISTRICT',
  name: 'North Valley',
  primaryDomain: 'districtx.aivo.app',
};

vi.mock('../src/prisma', () => ({
  prisma: {
    tenant: {
      findFirst: vi.fn(async ({ where }: any) => {
        if (where.primaryDomain === sampleTenant.primaryDomain) return sampleTenant;
        return null;
      }),
    },
  },
}));

// Provide dummy JWT key to satisfy config (not used in resolve endpoint)
const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.JWT_PUBLIC_KEY = publicKey.export({ type: 'spki', format: 'pem' }).toString();

async function loadApp() {
  const mod = await import('../src/app');
  return mod.createApp;
}

describe('GET /tenant/resolve', () => {
  let app: ReturnType<Awaited<ReturnType<typeof loadApp>>>;

  beforeAll(async () => {
    const createApp = await loadApp();
    app = createApp();
  });

  it('resolves tenant by host', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/tenant/resolve?host=${sampleTenant.primaryDomain}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.tenant_id).toBe(sampleTenant.id);
    expect(body.primary_domain).toBe(sampleTenant.primaryDomain);
  });
});
