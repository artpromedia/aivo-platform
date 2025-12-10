/**
 * Database Client for Personalization Service
 *
 * Connects to:
 * - Main OLTP database (for personalization_signals table)
 * - Warehouse database (for reading fact tables)
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-redundant-type-constituents */

// eslint-disable-next-line import/no-unresolved
import pg from 'pg';

import { config } from './config.js';

const { Pool } = pg;

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTION POOLS
// ══════════════════════════════════════════════════════════════════════════════

let mainPool: pg.Pool | null = null;
let warehousePool: pg.Pool | null = null;

/**
 * Get the main OLTP database pool.
 */
export function getMainPool(): pg.Pool {
  if (!mainPool) {
    mainPool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    mainPool.on('error', (err) => {
      console.error('Main pool error:', err);
    });
  }
  return mainPool;
}

/**
 * Get the warehouse database pool (read-only).
 */
export function getWarehousePool(): pg.Pool {
  if (!warehousePool) {
    warehousePool = new Pool({
      connectionString: config.warehouseUrl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    warehousePool.on('error', (err) => {
      console.error('Warehouse pool error:', err);
    });
  }
  return warehousePool;
}

/**
 * Close all database connections.
 */
export async function closeConnections(): Promise<void> {
  if (mainPool) {
    await mainPool.end();
    mainPool = null;
  }
  if (warehousePool) {
    await warehousePool.end();
    warehousePool = null;
  }
}

/**
 * Execute a query in a transaction.
 */
export async function withTransaction<T>(
  pool: pg.Pool,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
