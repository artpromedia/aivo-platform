import { Pool } from 'pg';

import { config } from './config.js';

let warehousePool: Pool | null = null;

/**
 * Get connection pool to the analytics warehouse (read-only)
 */
export function getWarehousePool(): Pool {
  if (!warehousePool) {
    warehousePool = new Pool({
      connectionString: config.warehouseDatabaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return warehousePool;
}

/**
 * Close warehouse pool connections
 */
export async function closeWarehousePool(): Promise<void> {
  if (warehousePool) {
    await warehousePool.end();
    warehousePool = null;
  }
}
