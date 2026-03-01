import * as fs from 'fs';
import * as path from 'path';

import * as dotenv from 'dotenv';

dotenv.config();

function requireEnvInProduction(key: string, defaultValue: string): string {
  const value = process.env[key];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${key} is required in production`);
  }
  return defaultValue;
}

function readKey(keyEnv: string | undefined, fileEnv: string | undefined): string {
  if (keyEnv) return keyEnv;
  if (fileEnv) {
    try {
      return fs.readFileSync(path.resolve(fileEnv), 'utf-8');
    } catch {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT key file not found');
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH required in production');
  }
  return 'test-jwt-key';
}

export const config = {
  port: Number(process.env.PORT || 4020),

  databaseUrl: requireEnvInProduction(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/aivo_brain_orchestrator'
  ),

  jwtSecret: process.env.JWT_SECRET || 'test-jwt-secret',
  jwtPublicKey: readKey(process.env.JWT_PUBLIC_KEY, process.env.JWT_PUBLIC_KEY_PATH),

  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],

  services: {
    learnerModel: process.env.LEARNER_MODEL_SVC_URL || 'http://localhost:4015',
    lesson: process.env.LESSON_SVC_URL || 'http://localhost:4016',
    assessment: process.env.ASSESSMENT_SVC_URL || 'http://localhost:3006',
    homeworkHelper: process.env.HOMEWORK_HELPER_SVC_URL || 'http://localhost:4017',
    focus: process.env.FOCUS_SVC_URL || 'http://localhost:4018',
    virtualBrain: process.env.VIRTUAL_BRAIN_SVC_URL || 'http://localhost:4019',
    aiOrchestrator: process.env.AI_ORCHESTRATOR_URL || 'http://localhost:4005',
    training: process.env.TRAINING_SVC_URL || 'http://localhost:4079',
    analytics: process.env.ANALYTICS_SVC_URL || 'http://localhost:4030',
    rlTutoring: process.env.RL_TUTORING_SVC_URL || 'http://localhost:8000',
    cognitiveLoad: process.env.COGNITIVE_LOAD_SVC_URL || 'http://localhost:8000',
  },

  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',

  cognitive: {
    updateIntervalMs: Number(process.env.COGNITIVE_LOAD_UPDATE_INTERVAL_MS || 100),
    defaultBreakIntervalMinutes: Number(process.env.DEFAULT_BREAK_INTERVAL_MINUTES || 25),
    maxCognitiveLoadScore: Number(process.env.MAX_COGNITIVE_LOAD_SCORE || 100),
    fatigueThreshold: Number(process.env.FATIGUE_THRESHOLD || 70),
  },

  performance: {
    maxConcurrentTasksPerLearner: Number(process.env.MAX_CONCURRENT_TASKS_PER_LEARNER || 5),
    taskTimeoutMs: Number(process.env.TASK_TIMEOUT_MS || 300000),
  },
};
