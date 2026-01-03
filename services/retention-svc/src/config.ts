import 'dotenv/config';

export interface DbConfig {
  connectionString: string;
  ssl: boolean;
}

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config: DbConfig = {
  connectionString: requireEnvInProduction('DATABASE_URL', 'postgres://localhost:5432/aivo_retention'),
  ssl: process.env.PGSSL === 'true',
};
