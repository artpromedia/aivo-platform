import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
  port: parseInt(process.env.PORT ?? '4026', 10),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  jwtPublicKey: loadPublicKey(),
  isDev: process.env.NODE_ENV !== 'production',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Session Service
  sessionSvcUrl: process.env.SESSION_SVC_URL ?? 'http://localhost:4020',
  sessionSvcApiKey: process.env.SESSION_SVC_API_KEY ?? '',

  // Learner Model Service (Virtual Brain)
  learnerModelSvcUrl: process.env.LEARNER_MODEL_SVC_URL ?? 'http://localhost:4022',
  learnerModelSvcApiKey: process.env.LEARNER_MODEL_SVC_API_KEY ?? '',

  // AI Orchestrator (for future FOCUS agent)
  aiOrchestratorUrl: process.env.AI_ORCHESTRATOR_URL ?? 'http://localhost:4010',
  aiOrchestratorApiKey: process.env.AI_ORCHESTRATOR_API_KEY ?? '',

  // Focus Detection Thresholds
  idleThresholdMs: parseInt(process.env.IDLE_THRESHOLD_MS ?? '30000', 10),
  rapidSwitchThreshold: parseInt(process.env.RAPID_SWITCH_THRESHOLD ?? '3', 10),
  rapidSwitchWindowMs: parseInt(process.env.RAPID_SWITCH_WINDOW_MS ?? '60000', 10),
} as const;
