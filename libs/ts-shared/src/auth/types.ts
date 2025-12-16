/**
 * Authentication Types for AIVO Platform
 * @module @aivo/ts-shared/auth/types
 */

import type { JWTPayload } from 'jose';

/**
 * Token payload structure for access and refresh tokens
 */
export interface TokenPayload extends JWTPayload {
  /** User ID (subject) */
  sub: string;
  /** User email */
  email: string;
  /** Tenant ID for multi-tenancy */
  tenantId: string;
  /** User roles */
  roles: string[];
  /** User permissions derived from roles */
  permissions: string[];
  /** Session ID for token revocation */
  sessionId: string;
  /** Token type discriminator */
  type: 'access' | 'refresh' | 'service';
  /** JWT ID for tracking */
  jti?: string;
}

/**
 * Service token payload for inter-service communication
 */
export interface ServiceTokenPayload extends JWTPayload {
  /** Service identifier as subject */
  sub: string;
  /** Token type */
  type: 'service';
  /** Source service name */
  service: string;
  /** Target service name */
  target: string;
}

/**
 * Token pair returned after authentication
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

/**
 * JWT configuration options
 */
export interface JWTConfig {
  /** Private key for signing (PEM format or file path) */
  privateKey: string;
  /** Public key for verification (PEM format or file path) */
  publicKey: string;
  /** Access token TTL (e.g., '15m', '1h') */
  accessTokenTTL: string;
  /** Refresh token TTL (e.g., '7d', '30d') */
  refreshTokenTTL: string;
  /** Token issuer identifier */
  issuer: string;
  /** Token audience */
  audience: string;
  /** Key ID for key rotation */
  keyId?: string;
}

/**
 * Session information
 */
export interface SessionInfo {
  id: string;
  userId: string;
  tenantId: string;
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  lastActivityAt?: Date;
}

/**
 * Device info for session tracking
 */
export interface DeviceInfo {
  userAgent: string;
  ip: string;
  deviceId?: string;
  platform?: string;
  browser?: string;
}

/**
 * Authentication result after login/register
 */
export interface AuthResult<TUser = unknown> {
  user: TUser;
  tokens: TokenPair;
  session: SessionInfo;
}

/**
 * User registration input
 */
export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  role?: string;
  phone?: string;
}

/**
 * User login input
 */
export interface LoginInput {
  email: string;
  password: string;
  tenantId?: string;
  deviceInfo?: DeviceInfo;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
  tenantId?: string;
}

/**
 * Password reset completion
 */
export interface PasswordResetCompletion {
  token: string;
  newPassword: string;
}

/**
 * Password change request (authenticated)
 */
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}
