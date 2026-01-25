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

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  port: Number(process.env.PORT || 4011),
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/aivo_baseline'),
  aiOrchestratorUrl: process.env.AI_ORCHESTRATOR_URL || 'http://localhost:4010',
  aiOrchestratorApiKey: process.env.AI_ORCHESTRATOR_API_KEY || 'dev-internal-key',
  learnerModelSvcUrl: process.env.LEARNER_MODEL_SVC_URL || 'http://localhost:4015',
  iepSvcUrl: process.env.IEP_SVC_URL || 'http://localhost:4016',
  notifySvcUrl: process.env.NOTIFY_SVC_URL || 'http://localhost:4012',
  serviceToken: process.env.SERVICE_TOKEN || '',
  jwtPublicKey: readKey(process.env.JWT_PUBLIC_KEY, process.env.JWT_PUBLIC_KEY_PATH),

  /**
   * Dev Mode: Use curated question bank instead of AI generation.
   *
   * When enabled, questions are served directly from the curated question bank,
   * bypassing the AI orchestrator. This is useful for:
   * - Local development when Ollama is slow
   * - Testing without AI dependencies
   * - Offline development
   *
   * Set BASELINE_DEV_MODE=true to enable.
   * In dev mode, AI is skipped entirely and all questions come from the curated bank.
   */
  devMode: process.env.BASELINE_DEV_MODE === 'true' || process.env.NODE_ENV === 'development',

  /**
   * Force AI generation even in dev mode.
   * Set BASELINE_FORCE_AI=true to override devMode and use AI generation.
   */
  forceAI: process.env.BASELINE_FORCE_AI === 'true',
};
