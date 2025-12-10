/**
 * ETL Database Connection
 *
 * Provides database connections for ETL operations.
 * Uses raw SQL for performance-critical ETL queries.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-redundant-type-constituents */

// eslint-disable-next-line import/no-unresolved
import pg from 'pg';

const { Pool } = pg;

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTION POOLS
// ══════════════════════════════════════════════════════════════════════════════

/** OLTP source database (read-only for ETL) */
let sourcePool: pg.Pool | null = null;

/** Analytics warehouse database (read-write for ETL) */
let warehousePool: pg.Pool | null = null;

export function getSourcePool(): pg.Pool {
  if (!sourcePool) {
    sourcePool = new Pool({
      connectionString: process.env.OLTP_DATABASE_URL || process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return sourcePool;
}

export function getWarehousePool(): pg.Pool {
  if (!warehousePool) {
    warehousePool = new Pool({
      connectionString: process.env.WAREHOUSE_DATABASE_URL || process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return warehousePool;
}

// ══════════════════════════════════════════════════════════════════════════════
// TRANSACTION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════════════════
// CLEANUP
// ══════════════════════════════════════════════════════════════════════════════

export async function closeConnections(): Promise<void> {
  if (sourcePool) {
    await sourcePool.end();
    sourcePool = null;
  }
  if (warehousePool) {
    await warehousePool.end();
    warehousePool = null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Execute a query and return rows.
 */
export async function query<T = Record<string, unknown>>(
  pool: pg.Pool,
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

/**
 * Execute an INSERT/UPDATE/DELETE and return row count.
 */
export async function execute(pool: pg.Pool, sql: string, params?: unknown[]): Promise<number> {
  const result = await pool.query(sql, params);
  return result.rowCount ?? 0;
}

/**
 * Batch insert with ON CONFLICT handling.
 */
export async function batchUpsert(
  client: pg.PoolClient,
  table: string,
  columns: string[],
  rows: unknown[][],
  conflictColumns: string[],
  updateColumns: string[]
): Promise<{ inserted: number; updated: number }> {
  if (rows.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  // Build parameterized values
  const placeholders = rows.map((_, rowIndex) => {
    const rowPlaceholders = columns.map(
      (_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`
    );
    return `(${rowPlaceholders.join(', ')})`;
  });

  const flatValues = rows.flat();

  // Build UPDATE SET clause
  const updateSet = updateColumns.map((col) => `${col} = EXCLUDED.${col}`).join(', ');

  const sql = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (${conflictColumns.join(', ')})
    DO UPDATE SET ${updateSet}
  `;

  const result = await client.query(sql, flatValues);

  // PostgreSQL doesn't distinguish inserted vs updated in ON CONFLICT
  // We approximate: rowCount is total affected
  return {
    inserted: result.rowCount ?? 0,
    updated: 0, // Would need xmax trick to distinguish
  };
}

/**
 * Delete rows for a specific date partition (idempotency).
 */
export async function deleteForDate(
  client: pg.PoolClient,
  table: string,
  dateColumn: string,
  targetDate: Date
): Promise<number> {
  const result = await client.query(`DELETE FROM ${table} WHERE ${dateColumn} = $1::date`, [
    targetDate.toISOString().split('T')[0],
  ]);
  return result.rowCount ?? 0;
}
