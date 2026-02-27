/**
 * Tests for status-page-svc SQLite database layer.
 *
 * Tests initDb, migrations, schema integrity, and helper queries
 * using an in-memory SQLite database.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We mock only the config to point to :memory:
vi.mock('../src/config.js', () => ({
  config: {
    databasePath: ':memory:',
    detection: {
      pollIntervalSeconds: 30,
      downThresholdSeconds: 120,
      errorRateThreshold: 0.05,
      errorRateDurationSeconds: 300,
      latencyFactor: 2,
      latencyDurationSeconds: 600,
    },
    prometheusUrl: 'http://localhost:9090',
    host: '0.0.0.0',
    port: 3091,
  },
}));

describe('status-page database', () => {
  describe('initDb', () => {
    it('creates and returns a database instance', async () => {
      const { initDb, closeDb } = await import('../src/db/database.js');
      const db = initDb();
      expect(db).toBeDefined();
      closeDb();
    });

    it('runs migrations on first init', async () => {
      vi.resetModules();
      const { initDb, getDb, closeDb } = await import('../src/db/database.js');
      initDb();
      const db = getDb();

      // Check migrations table exists and has entries
      const migrations = db.prepare('SELECT name FROM _migrations').all() as any[];
      expect(migrations.length).toBeGreaterThan(0);
      expect(migrations[0].name).toBe('001_initial_schema');

      closeDb();
    });
  });

  describe('getDb', () => {
    it('throws when database not initialized', async () => {
      vi.resetModules();
      const { getDb } = await import('../src/db/database.js');
      expect(() => getDb()).toThrow('Database not initialised');
    });
  });

  describe('schema tables', () => {
    let db: any;
    let closeDbFn: () => void;

    beforeEach(async () => {
      vi.resetModules();
      const mod = await import('../src/db/database.js');
      db = mod.initDb();
      closeDbFn = mod.closeDb;
    });

    afterEach(() => {
      closeDbFn();
    });

    it('creates incidents table', () => {
      const info = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'incidents'").get();
      expect(info).toBeDefined();
      expect(info.sql).toContain('title');
      expect(info.sql).toContain('severity');
      expect(info.sql).toContain('status');
      expect(info.sql).toContain('components');
    });

    it('creates incident_updates table', () => {
      const info = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'incident_updates'").get();
      expect(info).toBeDefined();
      expect(info.sql).toContain('incident_id');
    });

    it('creates maintenance_windows table', () => {
      const info = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'maintenance_windows'").get();
      expect(info).toBeDefined();
      expect(info.sql).toContain('scheduled_start');
      expect(info.sql).toContain('scheduled_end');
    });

    it('creates subscribers table', () => {
      const info = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'subscribers'").get();
      expect(info).toBeDefined();
      expect(info.sql).toContain('email');
      expect(info.sql).toContain('verification_token');
    });

    it('creates uptime_daily table', () => {
      const info = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'uptime_daily'").get();
      expect(info).toBeDefined();
      expect(info.sql).toContain('component_id');
      expect(info.sql).toContain('uptime_percent');
    });

    it('creates component_status table', () => {
      const info = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'component_status'").get();
      expect(info).toBeDefined();
      expect(info.sql).toContain('down_since');
      expect(info.sql).toContain('error_since');
      expect(info.sql).toContain('latency_since');
    });
  });

  describe('CRUD operations', () => {
    let db: any;
    let closeDbFn: () => void;

    beforeEach(async () => {
      vi.resetModules();
      const mod = await import('../src/db/database.js');
      db = mod.initDb();
      closeDbFn = mod.closeDb;
    });

    afterEach(() => {
      closeDbFn();
    });

    it('inserts and retrieves an incident', () => {
      db.prepare(
        `INSERT INTO incidents (id, title, severity, status, message, components) 
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('inc-1', 'Test Incident', 'major', 'investigating', 'Something broke', '["auth-svc"]');

      const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get('inc-1');
      expect(row.title).toBe('Test Incident');
      expect(row.severity).toBe('major');
      expect(row.status).toBe('investigating');
    });

    it('enforces severity check constraint', () => {
      expect(() => {
        db.prepare(
          `INSERT INTO incidents (id, title, severity, status) VALUES (?, ?, ?, ?)`,
        ).run('inc-bad', 'Bad', 'invalid_severity', 'investigating');
      }).toThrow();
    });

    it('enforces status check constraint', () => {
      expect(() => {
        db.prepare(
          `INSERT INTO incidents (id, title, severity, status) VALUES (?, ?, ?, ?)`,
        ).run('inc-bad', 'Bad', 'minor', 'invalid_status');
      }).toThrow();
    });

    it('inserts uptime_daily records', () => {
      db.prepare(
        `INSERT INTO uptime_daily (component_id, date, total_checks, failed_checks, uptime_percent) 
         VALUES (?, ?, ?, ?, ?)`,
      ).run('auth-svc', '2025-06-01', 100, 2, 98.0);

      const row = db.prepare(
        'SELECT * FROM uptime_daily WHERE component_id = ? AND date = ?',
      ).get('auth-svc', '2025-06-01');
      expect(row.uptime_percent).toBe(98.0);
      expect(row.failed_checks).toBe(2);
    });

    it('inserts and tracks component_status', () => {
      db.prepare(
        `INSERT INTO component_status (component_id, status) VALUES (?, ?)`,
      ).run('api-gw', 'operational');

      const row = db.prepare('SELECT * FROM component_status WHERE component_id = ?').get('api-gw');
      expect(row.status).toBe('operational');
      expect(row.down_since).toBeNull();
    });

    it('cascades incident_updates on incident delete', () => {
      db.prepare(
        `INSERT INTO incidents (id, title, severity, status) VALUES (?, ?, ?, ?)`,
      ).run('inc-del', 'Delete Test', 'minor', 'resolved');

      db.prepare(
        `INSERT INTO incident_updates (id, incident_id, status, message) VALUES (?, ?, ?, ?)`,
      ).run('upd-1', 'inc-del', 'investigating', 'Looking into it');

      db.prepare('DELETE FROM incidents WHERE id = ?').run('inc-del');

      const updates = db.prepare(
        'SELECT * FROM incident_updates WHERE incident_id = ?',
      ).all('inc-del');
      expect(updates).toHaveLength(0);
    });
  });
});
