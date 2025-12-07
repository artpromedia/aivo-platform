import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { runRetentionEnforcement } from '../src/jobs/enforceRetention.js';

let container: StartedPostgreSqlContainer;
let pool: pg.Pool;

async function setupSchema(client: pg.Pool) {
  await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await client.query(`
    CREATE TABLE retention_policies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NULL,
      resource_type TEXT NOT NULL,
      retention_days INTEGER NOT NULL,
      config_json JSONB NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await client.query('CREATE INDEX ON retention_policies(resource_type, tenant_id NULLS LAST)');

  await client.query(`
    CREATE TABLE events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      payload JSONB DEFAULT '{}'::jsonb
    );
  `);

  await client.query(`
    CREATE TABLE homework_uploads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      file_path TEXT,
      deleted_at TIMESTAMPTZ NULL
    );
  `);

  await client.query(`
    CREATE TABLE ai_incidents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      details JSONB DEFAULT '{}'::jsonb
    );
  `);
}

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  pool = new pg.Pool({ connectionString: container.getConnectionUri() });
  await setupSchema(pool);

  // Seed policies: global defaults and a tenant override for events
  await pool.query(
    `INSERT INTO retention_policies (tenant_id, resource_type, retention_days, config_json)
     VALUES
       (NULL, 'EVENT', 730, '{}'::jsonb),
       (NULL, 'HOMEWORK_UPLOAD', 365, '{}'::jsonb),
       (NULL, 'AI_INCIDENT', 730, '{}'::jsonb),
       ('tenant-1', 'EVENT', 30, '{}'::jsonb)
    `
  );
});

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});

describe('retention enforcement', () => {
  it('deletes or marks resources beyond retention and honors tenant overrides', async () => {
    const old30 = '2023-01-01T00:00:00Z'; // older than 30 days
    const old800 = '2021-01-01T00:00:00Z'; // older than global 730 days
    const recent = new Date().toISOString();

    await pool.query(
      `INSERT INTO events (tenant_id, created_at) VALUES
        ('tenant-1', $1),
        ('tenant-1', $2),
        (NULL, $3),
        (NULL, $4)
      `,
      [old30, recent, old800, recent]
    );

    await pool.query(
      `INSERT INTO homework_uploads (tenant_id, created_at, file_path, deleted_at) VALUES
        ('tenant-1', $1, 's3://old.pdf', NULL),
        ('tenant-1', $2, 's3://new.pdf', NULL)
      `,
      [old30, recent]
    );

    await pool.query(
      `INSERT INTO ai_incidents (tenant_id, created_at) VALUES
        ('tenant-1', $1),
        (NULL, $2)
      `,
      [old30, old800]
    );

    await runRetentionEnforcement(pool);

    const events = await pool.query('SELECT tenant_id, created_at FROM events ORDER BY created_at');
    expect(events.rows.map((r: { tenant_id: string | null }) => r.tenant_id)).toEqual([
      'tenant-1',
      null,
    ]);

    const uploads = await pool.query(
      'SELECT file_path, deleted_at FROM homework_uploads ORDER BY created_at'
    );
    expect(uploads.rows[0].file_path).toBeNull();
    expect(uploads.rows[0].deleted_at).not.toBeNull();
    expect(uploads.rows[1].file_path).toBe('s3://new.pdf');
    expect(uploads.rows[1].deleted_at).toBeNull();

    const incidents = await pool.query('SELECT * FROM ai_incidents');
    expect(incidents.rowCount).toBe(0);
  });
});
