/**
 * Tests for enhanced DSR functionality including:
 * - Admin endpoints for listing/approving/rejecting requests
 * - Job processing and worker logic
 * - AI call log export
 * - Consent log export
 */

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

  // Learners table
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

  // Sessions table
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

  // AI call logs table (new)
  await db.query(`
    CREATE TABLE ai_call_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      prompt_token_count INT,
      completion_token_count INT,
      latency_ms INT,
      status TEXT NOT NULL,
      input_text TEXT,
      output_text TEXT,
      input_tokens INT,
      output_tokens INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Consent logs table (new)
  await db.query(`
    CREATE TABLE consent_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      learner_id TEXT,
      consent_type TEXT NOT NULL,
      consent_action TEXT NOT NULL,
      consent_version TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Supporting tables
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

  // Enhanced DSR tables
  await db.query(`
    CREATE TYPE dsr_request_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'FAILED');
    CREATE TYPE dsr_request_type AS ENUM ('EXPORT', 'DELETE');
    CREATE TYPE dsr_job_status AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
  `);

  await db.query(`
    CREATE TABLE dsr_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      requested_by_user_id TEXT NOT NULL,
      learner_id TEXT NOT NULL,
      request_type dsr_request_type NOT NULL,
      status dsr_request_status NOT NULL DEFAULT 'PENDING',
      reason TEXT,
      export_location TEXT,
      result_uri TEXT,
      reviewed_by_user_id TEXT,
      reviewed_at TIMESTAMPTZ,
      error_message TEXT,
      metadata_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      completed_at TIMESTAMPTZ
    );
  `);

  await db.query(`
    CREATE TABLE dsr_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dsr_request_id UUID NOT NULL REFERENCES dsr_requests(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL,
      status dsr_job_status NOT NULL DEFAULT 'QUEUED',
      progress_percent INT DEFAULT 0,
      progress_message TEXT,
      error_code TEXT,
      error_message TEXT,
      retry_count INT DEFAULT 0,
      max_retries INT DEFAULT 3,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      worker_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`
    CREATE TABLE dsr_export_artifacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dsr_request_id UUID NOT NULL REFERENCES dsr_requests(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size_bytes BIGINT,
      storage_uri TEXT NOT NULL,
      encryption_key_id TEXT,
      checksum_sha256 TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      downloaded_count INT DEFAULT 0,
      last_downloaded_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query('CREATE INDEX idx_dsr_requests_tenant_user ON dsr_requests(tenant_id, requested_by_user_id)');
  await db.query('CREATE INDEX idx_dsr_requests_status ON dsr_requests(status)');
  await db.query('CREATE INDEX idx_dsr_jobs_status ON dsr_jobs(status)');
}

async function seedData(db: pg.Pool) {
  // Create learner
  await db.query(
    `INSERT INTO learners (id, tenant_id, parent_id, first_name, last_name, grade_level, email, phone, zip_code, status)
     VALUES ('learner-1', 'tenant-1', 'parent-1', 'Jamie', 'Rivera', '5', 'jamie@example.com', '555-1111', '98101', 'ACTIVE')`
  );

  // Create session
  await db.query(
    `INSERT INTO sessions (id, tenant_id, learner_id, started_at, ended_at, summary)
     VALUES ('session-1', 'tenant-1', 'learner-1', now() - INTERVAL '5 days', now() - INTERVAL '5 days' + INTERVAL '45 minutes', 'weekly practice session')`
  );

  // Create AI call logs for the session
  await db.query(
    `INSERT INTO ai_call_logs (id, tenant_id, session_id, model_id, prompt_token_count, completion_token_count, latency_ms, status, input_text, output_text, created_at)
     VALUES 
       ('ai-log-1', 'tenant-1', 'session-1', 'gpt-4o', 150, 250, 1200, 'success', 'Help me understand fractions', 'Fractions represent parts of a whole...', now() - INTERVAL '5 days'),
       ('ai-log-2', 'tenant-1', 'session-1', 'gpt-4o', 100, 180, 800, 'success', 'What is 1/2 + 1/4?', 'To add fractions with different denominators...', now() - INTERVAL '5 days' + INTERVAL '10 minutes')`
  );

  // Create consent logs
  await db.query(
    `INSERT INTO consent_logs (id, tenant_id, parent_id, learner_id, consent_type, consent_action, consent_version, created_at)
     VALUES 
       ('11111111-1111-1111-1111-111111111111', 'tenant-1', 'parent-1', 'learner-1', 'PLATFORM', 'GRANTED', '1.0', now() - INTERVAL '30 days'),
       ('22222222-2222-2222-2222-222222222222', 'tenant-1', 'parent-1', 'learner-1', 'AI_TUTORING', 'GRANTED', '1.0', now() - INTERVAL '30 days'),
       ('33333333-3333-3333-3333-333333333333', 'tenant-1', 'parent-1', NULL, 'MARKETING', 'DENIED', '1.0', now() - INTERVAL '20 days')`
  );

  // Create supporting records
  await db.query(
    `INSERT INTO assessments (id, tenant_id, learner_id, baseline_score, taken_at)
     VALUES ('assessment-1', 'tenant-1', 'learner-1', 82, now() - INTERVAL '10 days')`
  );
  await db.query(
    `INSERT INTO events (id, tenant_id, learner_id, event_type, metadata, created_at)
     VALUES ('event-1', 'tenant-1', 'learner-1', 'PROGRESS', '{"summary": "lesson complete"}', now() - INTERVAL '4 days')`
  );
  await db.query(
    `INSERT INTO recommendations (id, tenant_id, learner_id, content, rationale)
     VALUES ('rec-1', 'tenant-1', 'learner-1', 'Daily reading for 20 minutes', 'Based on prior scores')`
  );
  await db.query(
    `INSERT INTO subscriptions (id, tenant_id, parent_id, learner_id, plan, status, started_at)
     VALUES ('sub-1', 'tenant-1', 'parent-1', 'learner-1', 'FAMILY', 'ACTIVE', now() - INTERVAL '30 days')`
  );

  // Create additional learner and parent for multi-tenant tests
  await db.query(
    `INSERT INTO learners (id, tenant_id, parent_id, first_name, last_name, grade_level, status)
     VALUES ('learner-2', 'tenant-1', 'parent-2', 'Alex', 'Chen', '3', 'ACTIVE')`
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

describe('DSR API - Enhanced Export', () => {
  it('includes AI call logs in export bundle', async () => {
    const parentToken = await signToken('parent-1', ['PARENT']);

    const exportRes = await app.inject({
      method: 'POST',
      url: '/dsr/requests',
      headers: { authorization: `Bearer ${parentToken}` },
      payload: {
        learnerId: 'learner-1',
        requestType: 'EXPORT',
        reason: 'Data portability request',
      },
    });

    expect(exportRes.statusCode).toBe(201);
    const body = exportRes.json();
    expect(body.request.status).toBe('COMPLETED');

    // Verify AI call logs are included
    expect(body.export.ai_call_logs).toBeDefined();
    expect(body.export.ai_call_logs.length).toBe(2);

    const aiLog = body.export.ai_call_logs[0];
    expect(aiLog.model_id).toBe('gpt-4o');
    expect(aiLog.status).toBe('success');
    // Input/output should be summarized, not full text
    expect(aiLog.input_summary).toBeDefined();
    expect(aiLog.output_summary).toBeDefined();
  });

  it('includes consent logs in export bundle', async () => {
    const parentToken = await signToken('parent-1', ['PARENT']);

    const exportRes = await app.inject({
      method: 'POST',
      url: '/dsr/requests',
      headers: { authorization: `Bearer ${parentToken}` },
      payload: {
        learnerId: 'learner-1',
        requestType: 'EXPORT',
      },
    });

    expect(exportRes.statusCode).toBe(201);
    const body = exportRes.json();

    // Verify consent logs are included
    expect(body.export.consent_logs).toBeDefined();
    expect(body.export.consent_logs.length).toBeGreaterThanOrEqual(2);

    const consentTypes = body.export.consent_logs.map((c: { consent_type: string }) => c.consent_type);
    expect(consentTypes).toContain('PLATFORM');
    expect(consentTypes).toContain('AI_TUTORING');
  });
});

describe('DSR API - Delete De-identification', () => {
  it('anonymizes AI call logs on delete', async () => {
    // First verify AI logs have content
    const beforeLogs = await pool.query(
      `SELECT input_text, output_text FROM ai_call_logs WHERE session_id = 'session-1'`
    );
    expect(beforeLogs.rows[0].input_text).not.toBeNull();

    const parentToken = await signToken('parent-1', ['PARENT']);

    const deleteRes = await app.inject({
      method: 'POST',
      url: '/dsr/requests',
      headers: { authorization: `Bearer ${parentToken}` },
      payload: {
        learnerId: 'learner-1',
        requestType: 'DELETE',
        reason: 'COPPA deletion request',
      },
    });

    expect(deleteRes.statusCode).toBe(201);
    expect(deleteRes.json().request.status).toBe('COMPLETED');

    // Verify AI logs are anonymized but structure preserved
    const afterLogs = await pool.query(
      `SELECT id, model_id, status, input_text, output_text, prompt_token_count FROM ai_call_logs WHERE session_id = 'session-1'`
    );
    expect(afterLogs.rows.length).toBe(2); // Records preserved
    expect(afterLogs.rows[0].input_text).toBeNull(); // Content anonymized
    expect(afterLogs.rows[0].output_text).toBeNull();
    expect(afterLogs.rows[0].model_id).toBe('gpt-4o'); // Metadata preserved
  });
});

describe('DSR Admin API', () => {
  beforeAll(async () => {
    // Re-seed data for admin tests
    await pool.query('DELETE FROM dsr_requests');
    await pool.query(`
      INSERT INTO learners (id, tenant_id, parent_id, first_name, last_name, grade_level, status)
      VALUES ('learner-3', 'tenant-1', 'parent-3', 'Taylor', 'Smith', '4', 'ACTIVE')
      ON CONFLICT (id) DO NOTHING
    `);
  });

  it('allows district admin to list DSR requests for tenant', async () => {
    // Create a pending request first
    const parentToken = await signToken('parent-3', ['PARENT']);
    await app.inject({
      method: 'POST',
      url: '/dsr/requests',
      headers: { authorization: `Bearer ${parentToken}` },
      payload: {
        learnerId: 'learner-3',
        requestType: 'EXPORT',
      },
    });

    const adminToken = await signToken('admin-1', ['DISTRICT_ADMIN']);

    const listRes = await app.inject({
      method: 'GET',
      url: '/dsr/admin/requests',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(listRes.statusCode).toBe(200);
    const body = listRes.json();
    expect(body.requests).toBeDefined();
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('allows filtering by status', async () => {
    const adminToken = await signToken('admin-1', ['DISTRICT_ADMIN']);

    const listRes = await app.inject({
      method: 'GET',
      url: '/dsr/admin/requests?status=COMPLETED',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(listRes.statusCode).toBe(200);
    const body = listRes.json();
    body.requests.forEach((req: { status: string }) => {
      expect(req.status).toBe('COMPLETED');
    });
  });

  it('allows platform admin to list requests across all tenants', async () => {
    const platformToken = await signToken('platform-admin-1', ['PLATFORM_ADMIN']);

    const listRes = await app.inject({
      method: 'GET',
      url: '/dsr/admin/requests/all',
      headers: { authorization: `Bearer ${platformToken}` },
    });

    expect(listRes.statusCode).toBe(200);
    const body = listRes.json();
    expect(body.requests).toBeDefined();
  });

  it('denies district admin access to cross-tenant endpoint', async () => {
    const adminToken = await signToken('admin-1', ['DISTRICT_ADMIN']);

    const listRes = await app.inject({
      method: 'GET',
      url: '/dsr/admin/requests/all',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(listRes.statusCode).toBe(403);
  });
});
