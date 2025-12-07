import { Pool } from 'pg';

import { config } from './config.js';

export function createPool() {
  return new Pool({
    connectionString: config.databaseUrl,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  });
}
