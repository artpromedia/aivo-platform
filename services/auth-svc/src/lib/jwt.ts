import { randomUUID } from 'node:crypto';

import type { Role } from '@aivo/ts-rbac';
import { SignJWT, importPKCS8, importSPKI, jwtVerify, type KeyLike } from 'jose';

import { config } from '../config.js';

let privateKeyPromise: Promise<KeyLike> | null = null;
let publicKeyPromise: Promise<KeyLike> | null = null;

async function getKeys() {
  if (!privateKeyPromise) {
    privateKeyPromise = importPKCS8(config.jwtPrivateKey, 'RS256');
  }
  if (!publicKeyPromise) {
    publicKeyPromise = importSPKI(config.jwtPublicKey, 'RS256');
  }
  const [privateKey, publicKey] = await Promise.all([privateKeyPromise, publicKeyPromise]);
  return { privateKey, publicKey };
}

export interface TokenPayload {
  sub: string;
  tenant_id: string;
  roles: Role[];
  jti?: string;
}

export async function signAccessToken(payload: TokenPayload) {
  const { privateKey } = await getKeys();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(config.accessTokenTtl)
    .setJti(payload.jti ?? randomUUID())
    .sign(privateKey);
}

export async function signRefreshToken(payload: TokenPayload) {
  const { privateKey } = await getKeys();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(config.refreshTokenTtl)
    .setJti(payload.jti ?? randomUUID())
    .sign(privateKey);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { publicKey } = await getKeys();
  const { payload } = await jwtVerify(token, publicKey);
  const typedPayload = payload as Partial<TokenPayload>;
  if (
    typeof typedPayload.sub !== 'string' ||
    typeof typedPayload.tenant_id !== 'string' ||
    !Array.isArray(typedPayload.roles)
  ) {
    throw new Error('Invalid token payload');
  }
  return typedPayload as TokenPayload;
}
