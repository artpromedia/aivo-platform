/**
 * Database Client for Experimentation Service
 *
 * Connects to:
 * - Main OLTP database (for experiments, assignments, exposures)
 * - Warehouse database (for exposure analytics)
 * - Policy database (for tenant opt-out checks)
 */

import pg from 'pg';

import { config } from './config.js';

const { Pool } = pg;

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTION POOLS
// ══════════════════════════════════════════════════════════════════════════════

let mainPool: pg.Pool | null = null;
let warehousePool: pg.Pool | null = null;
let policyPool: pg.Pool | null = null;

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

    mainPool.on('error', (err: Error) => {
      console.error('Main pool error:', err);
    });
  }
  return mainPool;
}

/**
 * Get the warehouse database pool (for exposure analytics).
 */
export function getWarehousePool(): pg.Pool {
  if (!warehousePool) {
    warehousePool = new Pool({
      connectionString: config.warehouseUrl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    warehousePool.on('error', (err: Error) => {
      console.error('Warehouse pool error:', err);
    });
  }
  return warehousePool;
}

/**
 * Get the policy database pool.
 */
export function getPolicyPool(): pg.Pool {
  if (!policyPool) {
    policyPool = new Pool({
      connectionString: config.policyDbUrl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    policyPool.on('error', (err: Error) => {
      console.error('Policy pool error:', err);
    });
  }
  return policyPool;
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
  if (policyPool) {
    await policyPool.end();
    policyPool = null;
  }
}

/**
 * Initialize all pools at startup.
 */
export function initPools(): void {
  getMainPool();
  getWarehousePool();
  getPolicyPool();
}

/**
 * Health check for all database connections.
 */
export async function checkDatabaseHealth(): Promise<{
  main: boolean;
  warehouse: boolean;
  policy: boolean;
}> {
  const results = {
    main: false,
    warehouse: false,
    policy: false,
  };

  try {
    await getMainPool().query('SELECT 1');
    results.main = true;
  } catch (err) {
    console.error('Main database health check failed:', err);
  }

  try {
    await getWarehousePool().query('SELECT 1');
    results.warehouse = true;
  } catch (err) {
    console.error('Warehouse database health check failed:', err);
  }

  try {
    await getPolicyPool().query('SELECT 1');
    results.policy = true;
  } catch (err) {
    console.error('Policy database health check failed:', err);
  }

  return results;
}
