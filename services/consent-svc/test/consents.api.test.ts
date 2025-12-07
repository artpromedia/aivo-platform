import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { SignJWT } from 'jose';
import pg from 'pg';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { FastifyInstance } from 'fastify';

let container: StartedPostgreSqlContainer;
let pool: pg.Pool;
let app: FastifyInstance;
let privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'];

async function runMigrations(db: pg.Pool) {
  await db.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await db.query(`
    CREATE TABLE consents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      learner_id TEXT NOT NULL,
      consent_type TEXT NOT NULL CHECK (consent_type IN ('BASELINE_ASSESSMENT', 'AI_TUTOR', 'RESEARCH_ANALYTICS')),
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'GRANTED', 'REVOKED', 'EXPIRED')),
      granted_by_parent_id TEXT NULL,
      granted_at TIMESTAMPTZ NULL,
      revoked_at TIMESTAMPTZ NULL,
      expires_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query(
    'CREATE UNIQUE INDEX idx_consents_unique ON consents(tenant_id, learner_id, consent_type)'
  );
  await db.query(`
    CREATE TABLE consent_audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      consent_id UUID NOT NULL REFERENCES consents(id) ON DELETE CASCADE,
      previous_status TEXT NOT NULL CHECK (previous_status IN ('PENDING', 'GRANTED', 'REVOKED', 'EXPIRED')),
      new_status TEXT NOT NULL CHECK (new_status IN ('PENDING', 'GRANTED', 'REVOKED', 'EXPIRED')),
      changed_by_user_id TEXT NULL,
      change_reason TEXT NOT NULL,
      metadata_json JSONB NULL,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function signToken(userId: string, roles: string[], tenantId = 'tenant-1') {
  const token = await new SignJWT({ sub: userId, tenant_id: tenantId, roles })
    .setProtectedHeader({ alg: 'RS256' })
    .sign(privateKey);
  return token;
}

beforeAll(async () => {
  const keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  privateKey = keyPair.privateKey;
  process.env.JWT_PUBLIC_KEY = keyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

  container = await new PostgreSqlContainer().start();
  pool = new pg.Pool({ connectionString: container.getConnectionUri() });
  process.env.DATABASE_URL = container.getConnectionUri();
  await runMigrations(pool);

  const mod = await import('../src/app.js');
  const createApp = mod.createApp;
  app = createApp({ pool, logger: false });
  await app.ready();
});

afterAll(async () => {
  await app?.close();
  await pool?.end();
  await container?.stop();
});

describe('consent API', () => {
  it('creates, transitions, and rejects invalid transitions with audit log', async () => {
    const teacherToken = await signToken('teacher-1', ['TEACHER']);
    const parentToken = await signToken('parent-1', ['PARENT']);

    const createRes = await app.inject({
      method: 'POST',
      url: '/consents',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        learnerId: 'learner-1',
        consentType: 'BASELINE_ASSESSMENT',
      },
    });

    expect(createRes.statusCode).toBe(201);
    const created = createRes.json().consent;
    expect(created.status).toBe('PENDING');

    const grantRes = await app.inject({
      method: 'POST',
      url: `/consents/${created.id}/grant`,
      headers: { authorization: `Bearer ${parentToken}` },
      payload: {
        reason: 'parent approved',
        metadata: { channel: 'web' },
      },
    });
    expect(grantRes.statusCode).toBe(200);
    const granted = grantRes.json().consent;
    expect(granted.status).toBe('GRANTED');
    expect(granted.granted_at).toBeDefined();

    const revokeRes = await app.inject({
      method: 'POST',
      url: `/consents/${created.id}/revoke`,
      headers: { authorization: `Bearer ${parentToken}` },
      payload: {
        reason: 'parent changed mind',
      },
    });
    expect(revokeRes.statusCode).toBe(200);
    const revoked = revokeRes.json().consent;
    expect(revoked.status).toBe('REVOKED');

    const invalidRes = await app.inject({
      method: 'POST',
      url: `/consents/${created.id}/grant`,
      headers: { authorization: `Bearer ${parentToken}` },
      payload: {
        reason: 'cannot re-grant',
      },
    });
    expect(invalidRes.statusCode).toBe(400);

    const listRes = await app.inject({
      method: 'GET',
      url: `/consents?learnerId=learner-1`,
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = listRes.json();
    const target = listBody.consents.find((c: any) => c.id === created.id);
    expect(target?.status).toBe('REVOKED');

    const audit = await pool.query('SELECT * FROM consent_audit_log WHERE consent_id = $1', [
      created.id,
    ]);
    expect(audit.rowCount).toBeGreaterThanOrEqual(2); // grant + revoke (idempotent guard)
  });

  it('returns consent config for parent and aggregates for admin', async () => {
    const parentToken = await signToken('parent-2', ['PARENT']);
    const adminToken = await signToken('admin-1', ['DISTRICT_ADMIN']);

    const configRes = await app.inject({
      method: 'GET',
      url: '/privacy/consent-config?learnerId=learner-99',
      headers: { authorization: `Bearer ${parentToken}` },
    });

    expect(configRes.statusCode).toBe(200);
    const configBody = configRes.json();
    expect(configBody.privacyPolicyUrl).toContain('privacy');
    expect(Array.isArray(configBody.consents)).toBe(true);
    const baseline = configBody.consents.find((c: any) => c.type === 'BASELINE_ASSESSMENT');
    expect(baseline?.required).toBe(true);
    expect(baseline?.status).toBe('PENDING');
    expect(baseline?.consentId).toBeTruthy();

    const aggregateRes = await app.inject({
      method: 'GET',
      url: '/privacy/consent-aggregates',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(aggregateRes.statusCode).toBe(200);
    const aggregateBody = aggregateRes.json();
    expect(aggregateBody.tenantId).toBe('tenant-1');
    expect(Array.isArray(aggregateBody.aggregates)).toBe(true);
    expect(aggregateBody.aggregates.length).toBeGreaterThan(0);
  });
});
