import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  port: Number.parseInt(process.env.PORT ?? '4020', 10),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  jwtPublicKey: loadPublicKey(),
  isDev: process.env.NODE_ENV !== 'production',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // NATS configuration for event publishing
  nats: {
    servers: process.env.NATS_SERVERS ?? 'nats://localhost:4222',
    enabled: process.env.NATS_ENABLED !== 'false',
    token: process.env.NATS_TOKEN,
    user: process.env.NATS_USER,
    pass: process.env.NATS_PASS,
  },

  // Billing service configuration
  billingServiceUrl: process.env.BILLING_SERVICE_URL ?? 'http://localhost:4060',
  billingCheckDisabled: process.env.BILLING_CHECK_DISABLED === 'true',
} as const;
