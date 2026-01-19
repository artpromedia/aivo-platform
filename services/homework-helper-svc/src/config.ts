import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

function loadPublicKey(): string | undefined {
  const keyPath = process.env.JWT_PUBLIC_KEY_PATH;
  if (!keyPath) return undefined;
  try {
    return readFileSync(resolve(keyPath), 'utf-8');
  } catch {
    console.warn(`Could not load JWT public key from ${keyPath}`);
    return undefined;
  }
}

export const config = {
  port: Number.parseInt(process.env.PORT ?? '4025', 10),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  jwtPublicKey: loadPublicKey(),
  isDev: process.env.NODE_ENV !== 'production',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // AI Orchestrator
  aiOrchestratorUrl: requireEnvInProduction('AI_ORCHESTRATOR_URL', 'http://localhost:4010'),
  aiOrchestratorApiKey: process.env.AI_ORCHESTRATOR_API_KEY ?? '',

  // Session Service
  sessionSvcUrl: requireEnvInProduction('SESSION_SVC_URL', 'http://localhost:4020'),
  sessionSvcApiKey: process.env.SESSION_SVC_API_KEY ?? '',

  // Storage
  storageBucket: process.env.STORAGE_BUCKET ?? 'aivo-homework-uploads',
  storageEndpoint: requireEnvInProduction('STORAGE_ENDPOINT', 'http://localhost:9000'),
  storageAccessKey: process.env.STORAGE_ACCESS_KEY ?? '',
  storageSecretKey: process.env.STORAGE_SECRET_KEY ?? '',
} as const;
