import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4002),
  databaseUrl:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aivo_tenant',
  jwtPublicKey: process.env.JWT_PUBLIC_KEY,
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH,
};
