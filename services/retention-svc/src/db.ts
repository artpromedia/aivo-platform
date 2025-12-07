import { Pool } from 'pg';

import { config } from './config.js';

export function createPool() {
  return new Pool({
    connectionString: config.connectionString,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  });
}
