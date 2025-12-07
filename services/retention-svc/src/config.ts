import 'dotenv/config';

export interface DbConfig {
  connectionString: string;
  ssl: boolean;
}

export const config: DbConfig = {
  connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/aivo',
  ssl: process.env.PGSSL === 'true',
};
