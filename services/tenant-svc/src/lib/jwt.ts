import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Role } from '@aivo/ts-rbac';
import { importSPKI, jwtVerify, type KeyLike } from 'jose';

import { config } from '../config.js';

let publicKeyPromise: Promise<KeyLike> | null = null;

function readKey(): string {
  if (config.jwtPublicKey) return config.jwtPublicKey;
  if (config.jwtPublicKeyPath) {
    const abs = path.resolve(config.jwtPublicKeyPath);
    return fs.readFileSync(abs, 'utf-8');
  }
  throw new Error('JWT_PUBLIC_KEY not provided');
}

async function getPublicKey() {
  if (!publicKeyPromise) {
    publicKeyPromise = importSPKI(readKey(), 'RS256');
  }
  return publicKeyPromise;
}

export interface TokenPayload {
  sub: string;
  tenant_id: string;
  roles: Role[];
}

export async function verifyJwt(token: string): Promise<TokenPayload> {
  const publicKey = await getPublicKey();
  const { payload } = await jwtVerify(token, publicKey);
  return payload as TokenPayload;
}

export function getPublicKeyPem(): string {
  return readKey();
}
