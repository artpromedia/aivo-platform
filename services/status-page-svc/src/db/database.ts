// ==============================================================================
// AIVO Status Page Service — SQLite Database
// ==============================================================================
// Uses better-sqlite3 for an independent, file-based database that survives
// full platform outages (no dependency on the platform PostgreSQL cluster).

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialised — call initDb() first');
  }
  return db;
}

export function initDb(): Database.Database {
  // Ensure directory exists
  const dir = dirname(config.databasePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(config.databasePath);

  // WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------
function runMigrations(database: Database.Database): void {
  database.exec(`
    -- Track which migrations have run
    CREATE TABLE IF NOT EXISTS _migrations (
      id   INTEGER PRIMARY KEY,
      name TEXT    NOT NULL,
      run_at TEXT  NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    database
      .prepare('SELECT name FROM _migrations')
      .all()
      .map((r: any) => r.name),
  );

  for (const m of MIGRATIONS) {
    if (!applied.has(m.name)) {
      database.exec(m.sql);
      database.prepare('INSERT INTO _migrations (name) VALUES (?)').run(m.name);
    }
  }
}

const MIGRATIONS = [
  {
    name: '001_initial_schema',
    sql: `
      -- Incidents
      CREATE TABLE incidents (
        id          TEXT PRIMARY KEY,
        title       TEXT    NOT NULL,
        severity    TEXT    NOT NULL CHECK (severity IN ('minor','major','critical')),
        status      TEXT    NOT NULL CHECK (status IN ('investigating','identified','monitoring','resolved','postmortem')),
        message     TEXT    NOT NULL DEFAULT '',
        components  TEXT    NOT NULL DEFAULT '[]',   -- JSON array of component IDs
        is_auto     INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT
      );

      CREATE INDEX idx_incidents_status     ON incidents(status);
      CREATE INDEX idx_incidents_created_at ON incidents(created_at);

      -- Incident updates (timeline entries)
      CREATE TABLE incident_updates (
        id          TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        status      TEXT NOT NULL,
        message     TEXT NOT NULL DEFAULT '',
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_incident_updates_incident ON incident_updates(incident_id);

      -- Maintenance windows
      CREATE TABLE maintenance_windows (
        id              TEXT PRIMARY KEY,
        title           TEXT NOT NULL,
        description     TEXT NOT NULL DEFAULT '',
        components      TEXT NOT NULL DEFAULT '[]',
        status          TEXT NOT NULL CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
        scheduled_start TEXT NOT NULL,
        scheduled_end   TEXT NOT NULL,
        actual_start    TEXT,
        actual_end      TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_maintenance_status ON maintenance_windows(status);

      -- Subscribers (email + optional webhook)
      CREATE TABLE subscribers (
        id                 TEXT PRIMARY KEY,
        email              TEXT NOT NULL UNIQUE,
        webhook_url        TEXT,
        components         TEXT,  -- NULL = all, otherwise JSON array
        verified           INTEGER NOT NULL DEFAULT 0,
        verification_token TEXT NOT NULL,
        unsubscribe_token  TEXT NOT NULL,
        created_at         TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE UNIQUE INDEX idx_subscribers_email ON subscribers(email);

      -- Daily uptime records (one row per component per day)
      CREATE TABLE uptime_daily (
        component_id   TEXT NOT NULL,
        date           TEXT NOT NULL,  -- YYYY-MM-DD
        uptime_percent REAL NOT NULL DEFAULT 100.0,
        total_checks   INTEGER NOT NULL DEFAULT 0,
        failed_checks  INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (component_id, date)
      );

      -- Component status snapshots (for current state tracking)
      CREATE TABLE component_status (
        component_id    TEXT PRIMARY KEY,
        status          TEXT NOT NULL DEFAULT 'operational',
        last_checked_at TEXT,
        down_since      TEXT,  -- when the component went down (for threshold tracking)
        error_since     TEXT,  -- when error rate exceeded threshold
        latency_since   TEXT   -- when latency exceeded threshold
      );
    `,
  },
];
