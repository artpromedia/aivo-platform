/**
 * Shared database pool for modules that use raw pg queries
 * (consent/coppa and DSR modules migrated from consent-svc and dsr-svc)
 */

import { Pool } from 'pg';

import { config } from '../../config.js';

let _pool: Pool | null = null;

/**
 * Get or create a shared pg Pool for raw SQL queries.
 * Modules that were originally built on raw pg (consent, DSR) use this
 * alongside the Prisma client used by compliance-core and legal-hold.
 */
export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.pgSsl ? { rejectUnauthorized: false } : false,
    });
    // Prevent unhandled 'error' events from crashing the process
    _pool.on('error', (err) => {
      console.error('Unexpected pg pool error:', err);
    });
  }
  return _pool;
}

/**
 * Gracefully close the pool (called during shutdown)
 */
export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
