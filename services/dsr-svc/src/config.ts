import * as fs from 'node:fs';
import * as path from 'node:path';

import 'dotenv/config';

function readKey(keyEnv: string | undefined, fileEnv: string | undefined): string {
  if (keyEnv) return keyEnv;
  if (fileEnv) {
    const abs = path.resolve(fileEnv);
    return fs.readFileSync(abs, 'utf-8');
  }
  throw new Error('JWT public key not provided');
}

export const config = {
  port: Number(process.env.PORT || 4006),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aivo',
  ssl: process.env.PGSSL === 'true',
  jwtPublicKey: readKey(process.env.JWT_PUBLIC_KEY, process.env.JWT_PUBLIC_KEY_PATH),
  exportEventLimit: Number(process.env.EXPORT_EVENT_LIMIT || 500),
};
