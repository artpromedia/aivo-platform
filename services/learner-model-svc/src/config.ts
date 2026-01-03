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
  // In production, require JWT key
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH is required in production');
  }
  return 'test-jwt-key';
}

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  port: Number(process.env.PORT || 4015),
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/aivo_learner_model'),
  baselineSvcUrl: process.env.BASELINE_SVC_URL || 'http://localhost:4010',
  aiOrchestratorUrl: process.env.AI_ORCHESTRATOR_URL || 'http://localhost:4005',
  aiOrchestratorApiKey: process.env.AI_ORCHESTRATOR_API_KEY || '',
  jwtPublicKey: readKey(process.env.JWT_PUBLIC_KEY, process.env.JWT_PUBLIC_KEY_PATH),
};
