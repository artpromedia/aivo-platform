import * as fs from 'node:fs';
import * as path from 'node:path';

import * as dotenv from 'dotenv';

dotenv.config();

function readKey(keyEnv: string | undefined, fileEnv: string | undefined): string {
  if (keyEnv) return keyEnv;
  if (fileEnv) {
    const abs = path.resolve(fileEnv);
    return fs.readFileSync(abs, 'utf-8');
  }
  throw new Error('JWT key not provided');
}

export const config = {
  port: Number(process.env.PORT || 4015),
  databaseUrl:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aivo_learner_model',
  baselineSvcUrl: process.env.BASELINE_SVC_URL || 'http://localhost:4010',
  jwtPublicKey: readKey(process.env.JWT_PUBLIC_KEY, process.env.JWT_PUBLIC_KEY_PATH),
};
