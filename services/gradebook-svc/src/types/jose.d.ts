/**
 * Type declarations for jose module
 *
 * This provides minimal type declarations for jose JWT verification.
 */

declare module 'jose' {
  export interface JWTPayload {
    iss?: string;
    sub?: string;
    aud?: string | string[];
    jti?: string;
    nbf?: number;
    exp?: number;
    iat?: number;
    [key: string]: unknown;
  }

  export interface JWTVerifyResult<T = JWTPayload> {
    payload: T & JWTPayload;
    protectedHeader: {
      alg: string;
      typ?: string;
      kid?: string;
      [key: string]: unknown;
    };
  }

  export interface JWTVerifyOptions {
    algorithms?: string[];
    audience?: string | string[];
    issuer?: string | string[];
    subject?: string;
    clockTolerance?: number | string;
    maxTokenAge?: number | string;
    currentDate?: Date;
    requiredClaims?: string[];
  }

  export type KeyLike = Uint8Array | CryptoKey | { type: string };

  export function jwtVerify<T = JWTPayload>(
    jwt: string | Uint8Array,
    key: KeyLike | Uint8Array,
    options?: JWTVerifyOptions
  ): Promise<JWTVerifyResult<T>>;

  export function createRemoteJWKSet(
    url: URL,
    options?: {
      timeoutDuration?: number;
      cooldownDuration?: number;
      cacheMaxAge?: number;
      headers?: Record<string, string>;
    }
  ): (protectedHeader: { alg: string; kid?: string }, token: { payload: string }) => Promise<KeyLike>;

  export class SignJWT {
    constructor(payload: JWTPayload);
    setProtectedHeader(header: { alg: string; typ?: string }): this;
    setIssuedAt(input?: number | Date): this;
    setIssuer(issuer: string): this;
    setAudience(audience: string | string[]): this;
    setSubject(subject: string): this;
    setExpirationTime(input: number | string | Date): this;
    setNotBefore(input: number | string | Date): this;
    setJti(jti: string): this;
    sign(key: KeyLike | Uint8Array): Promise<string>;
  }

  export function importSPKI(spki: string, alg: string): Promise<KeyLike>;
  export function importPKCS8(pkcs8: string, alg: string): Promise<KeyLike>;
  export function importX509(x509: string, alg: string): Promise<KeyLike>;
  export function exportSPKI(key: KeyLike): Promise<string>;
  export function exportPKCS8(key: KeyLike): Promise<string>;

  export function generateKeyPair(
    alg: string,
    options?: { extractable?: boolean; modulusLength?: number }
  ): Promise<{ publicKey: KeyLike; privateKey: KeyLike }>;

  export function generateSecret(
    alg: string,
    options?: { extractable?: boolean }
  ): Promise<KeyLike>;

  export class errors {
    static JWTExpired: typeof JWTExpired;
    static JWTClaimValidationFailed: typeof JWTClaimValidationFailed;
    static JWSInvalid: typeof JWSInvalid;
    static JWSSignatureVerificationFailed: typeof JWSSignatureVerificationFailed;
  }

  export class JWTExpired extends Error {
    claim: string;
    reason: string;
  }

  export class JWTClaimValidationFailed extends Error {
    claim: string;
    reason: string;
  }

  export class JWSInvalid extends Error {}
  export class JWSSignatureVerificationFailed extends Error {}
}
