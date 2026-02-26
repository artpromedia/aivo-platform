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
  port: Number(process.env.PORT || 4025),
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/aivo_tutor'),
  jwtPublicKey: readKey(process.env.JWT_PUBLIC_KEY, process.env.JWT_PUBLIC_KEY_PATH),
  aiOrchestratorUrl: process.env.AI_ORCHESTRATOR_URL || 'http://localhost:4005',
  learnerModelUrl: process.env.LEARNER_MODEL_URL || 'http://localhost:4015',
  billingSvcUrl: process.env.BILLING_SVC_URL || 'http://localhost:3150',
  realtimeSvcUrl: process.env.REALTIME_SVC_URL || 'http://localhost:4030',
  azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
  azureSpeechRegion: process.env.AZURE_SPEECH_REGION || 'eastus',
  // Audio storage (S3/R2)
  audioBucket: process.env.AUDIO_S3_BUCKET || 'aivo-tutor-audio',
  audioS3Endpoint: process.env.AUDIO_S3_ENDPOINT || '',
  audioS3Region: process.env.AUDIO_S3_REGION || 'us-east-1',
  audioCdnBase: process.env.AUDIO_CDN_BASE || '',
};
