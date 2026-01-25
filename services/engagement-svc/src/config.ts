/**
 * Engagement Service Configuration
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadPublicKey(): string {
  const keyPath = process.env.JWT_PUBLIC_KEY_PATH;
  if (!keyPath) {
    // Return a placeholder in development/test
    return process.env.JWT_PUBLIC_KEY || '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWyf8HpZ8myfM4g\n-----END PUBLIC KEY-----';
  }
  try {
    return readFileSync(resolve(keyPath), 'utf-8');
  } catch {
    console.warn(`Could not load JWT public key from ${keyPath}`);
    return process.env.JWT_PUBLIC_KEY || '';
  }
}

export const config = {
  port: Number.parseInt(process.env.PORT || '3021', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // NATS
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',

  // JWT
  jwtPublicKey: loadPublicKey(),
  jwtIssuer: process.env.JWT_ISSUER || 'https://auth.aivo.dev',
  jwtAudience: process.env.JWT_AUDIENCE || 'aivo-api',
  
  // Engagement defaults
  defaults: {
    maxDailyXp: 100,
    maxDailyCelebrations: 3,
    streakGracePeriodHours: 24,
  },
} as const;
