/**
 * Community Service Configuration
 */

import * as dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string, devDefault?: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment variable ${name} is required in production`);
    }
    if (devDefault !== undefined) {
      return devDefault;
    }
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: 'community-svc',

  // Database
  databaseUrl: requireEnv(
    'DATABASE_URL',
    'postgresql://aivo:aivo_dev_password@localhost:5432/aivo_community'
  ),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};
