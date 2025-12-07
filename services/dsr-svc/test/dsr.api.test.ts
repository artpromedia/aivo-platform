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
    CREATE TABLE learners (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      grade_level TEXT,
      email TEXT,
      phone TEXT,
      zip_code TEXT,
      status TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );
  `);
  await db.query(`
    CREATE TABLE assessments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      learner_id TEXT NOT NULL,
      baseline_score INT,
      taken_at TIMESTAMPTZ NOT NULL
    );
  `);
  await db.query(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      learner_id TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL,
      ended_at TIMESTAMPTZ,
      summary TEXT
    );
  `);
  await db.query(`
    CREATE TABLE events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      learner_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query(`
    CREATE TABLE recommendations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      learner_id TEXT NOT NULL,
      content TEXT NOT NULL,
      rationale TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.query(`
    CREATE TABLE subscriptions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      learner_id TEXT NOT NULL,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ
    );
  `);

  await db.query(`
    CREATE TABLE dsr_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      learner_id TEXT NOT NULL,
      request_type TEXT NOT NULL CHECK (request_type IN ('EXPORT', 'DELETE')),
      status TEXT NOT NULL CHECK (status IN ('RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED')),
      reason TEXT,
      export_location TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      completed_at TIMESTAMPTZ
    );
  `);
  await db.query('CREATE INDEX idx_dsr_requests_parent ON dsr_requests(tenant_id, parent_id)');
  await db.query('CREATE INDEX idx_dsr_requests_learner ON dsr_requests(tenant_id, learner_id)');
}

async function seedData(db: pg.Pool) {
  await db.query(
    `INSERT INTO learners (id, tenant_id, parent_id, first_name, last_name, grade_level, email, phone, zip_code, status)
     VALUES ('learner-1', 'tenant-1', 'parent-1', 'Jamie', 'Rivera', '5', 'jamie@example.com', '555-1111', '98101', 'ACTIVE')`
  );
  await db.query(
    `INSERT INTO assessments (id, tenant_id, learner_id, baseline_score, taken_at)
     VALUES ('assessment-1', 'tenant-1', 'learner-1', 82, now() - INTERVAL '10 days')`
  );
  await db.query(
    `INSERT INTO sessions (id, tenant_id, learner_id, started_at, ended_at, summary)
     VALUES ('session-1', 'tenant-1', 'learner-1', now() - INTERVAL '5 days', now() - INTERVAL '5 days' + INTERVAL '45 minutes', 'weekly practice session')`
  );
  await db.query(
    `INSERT INTO events (id, tenant_id, learner_id, event_type, metadata, created_at)
     VALUES ('event-1', 'tenant-1', 'learner-1', 'PROGRESS', '{"summary": "lesson complete", "actor_email": "child@example.com"}', now() - INTERVAL '4 days')`
  );
  await db.query(
    `INSERT INTO recommendations (id, tenant_id, learner_id, content, rationale)
     VALUES ('rec-1', 'tenant-1', 'learner-1', 'Daily reading for 20 minutes', 'Based on prior scores')`
  );
  await db.query(
    `INSERT INTO subscriptions (id, tenant_id, parent_id, learner_id, plan, status, started_at)
     VALUES ('sub-1', 'tenant-1', 'parent-1', 'learner-1', 'FAMILY', 'ACTIVE', now() - INTERVAL '30 days')`
  );
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
  await seedData(pool);

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

describe('DSR API (parent)', () => {
  it('creates export and delete DSRs with filtered payloads and de-identification', async () => {
    const parentToken = await signToken('parent-1', ['PARENT']);

    const exportRes = await app.inject({
      method: 'POST',
      url: '/dsr/requests',
      headers: { authorization: `Bearer ${parentToken}` },
      payload: {
        learnerId: 'learner-1',
        requestType: 'EXPORT',
        reason: 'Parent requested copy',
      },
    });

    expect(exportRes.statusCode).toBe(201);
    const exportBody = exportRes.json();
    expect(exportBody.request.status).toBe('COMPLETED');
    expect(exportBody.export.learner.first_name).toBe('Jamie');
    expect(exportBody.export.learner).not.toHaveProperty('email');
    const event = exportBody.export.events[0];
    expect(event.metadata).toBeDefined();
    expect(event.metadata).not.toHaveProperty('actor_email');

    const listRes = await app.inject({
      method: 'GET',
      url: '/dsr/requests',
      headers: { authorization: `Bearer ${parentToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().requests.length).toBeGreaterThanOrEqual(1);

    const deleteRes = await app.inject({
      method: 'POST',
      url: '/dsr/requests',
      headers: { authorization: `Bearer ${parentToken}` },
      payload: {
        learnerId: 'learner-1',
        requestType: 'DELETE',
        reason: 'Erase data',
      },
    });

    expect(deleteRes.statusCode).toBe(201);
    const deleteBody = deleteRes.json();
    expect(deleteBody.request.status).toBe('COMPLETED');

    const learnerRow = await pool.query(
      'SELECT first_name, last_name, email, phone, zip_code, status, deleted_at FROM learners WHERE id = $1',
      ['learner-1']
    );
    expect(learnerRow.rows[0].first_name).toBeNull();
    expect(learnerRow.rows[0].email).toBeNull();
    expect(learnerRow.rows[0].status).toBe('DELETED');
    expect(learnerRow.rows[0].deleted_at).not.toBeNull();

    const eventRow = await pool.query(
      'SELECT metadata FROM events WHERE learner_id = $1 AND tenant_id = $2',
      ['learner-1', 'tenant-1']
    );
    expect(eventRow.rows[0].metadata).toBeNull();

    const sessionRow = await pool.query(
      'SELECT summary FROM sessions WHERE learner_id = $1 AND tenant_id = $2',
      ['learner-1', 'tenant-1']
    );
    expect(sessionRow.rows[0].summary).toBeNull();
  });
});
