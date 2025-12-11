/**
 * API Key Authentication Service
 * 
 * Handles API key generation, validation, and rate limiting for public APIs.
 */

import { PrismaClient, ApiKeyStatus, ApiScope } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { API_KEY_PREFIX } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKeyId?: string;
  tenantId?: string;
  scopes?: ApiScope[];
  error?: string;
  errorCode?: 'INVALID_KEY' | 'EXPIRED' | 'REVOKED' | 'RATE_LIMITED' | 'IP_BLOCKED';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// ══════════════════════════════════════════════════════════════════════════════
// API KEY SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class ApiKeyService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generate a new API key
   * 
   * @returns Object containing the key (shown once) and prefix for storage
   */
  async createApiKey(params: {
    tenantId: string;
    name: string;
    description?: string;
    scopes: ApiScope[];
    createdBy: string;
    expiresAt?: Date;
    rateLimitPerMinute?: number;
    rateLimitPerDay?: number;
    allowedIps?: string[];
  }): Promise<{ apiKey: ApiKey; rawKey: string }> {
    // Generate a secure random key
    const rawKey = `${API_KEY_PREFIX}${randomBytes(32).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 16); // "aivo_pk_" + first 8 hex chars
    const keyHash = this.hashKey(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId: params.tenantId,
        name: params.name,
        description: params.description,
        keyPrefix,
        keyHash,
        scopes: params.scopes,
        createdBy: params.createdBy,
        expiresAt: params.expiresAt,
        rateLimitPerMinute: params.rateLimitPerMinute ?? 60,
        rateLimitPerDay: params.rateLimitPerDay ?? 10000,
        allowedIps: params.allowedIps ?? [],
      },
    });

    return { apiKey, rawKey };
  }

  /**
   * Validate an API key
   */
  async validateApiKey(
    rawKey: string,
    clientIp?: string
  ): Promise<ApiKeyValidationResult> {
    // Check key format
    if (!rawKey.startsWith(API_KEY_PREFIX)) {
      return { valid: false, error: 'Invalid API key format', errorCode: 'INVALID_KEY' };
    }

    const keyPrefix = rawKey.substring(0, 16);
    const keyHash = this.hashKey(rawKey);

    // Find API key by prefix and hash
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        keyPrefix,
        keyHash,
      },
    });

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key', errorCode: 'INVALID_KEY' };
    }

    // Check status
    if (apiKey.status === ApiKeyStatus.REVOKED) {
      return { valid: false, error: 'API key has been revoked', errorCode: 'REVOKED' };
    }

    if (apiKey.status === ApiKeyStatus.EXPIRED) {
      return { valid: false, error: 'API key has expired', errorCode: 'EXPIRED' };
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      // Update status to expired
      await this.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { status: ApiKeyStatus.EXPIRED },
      });
      return { valid: false, error: 'API key has expired', errorCode: 'EXPIRED' };
    }

    // Check IP allowlist
    if (apiKey.allowedIps.length > 0 && clientIp) {
      if (!apiKey.allowedIps.includes(clientIp)) {
        return { valid: false, error: 'IP address not allowed', errorCode: 'IP_BLOCKED' };
      }
    }

    // Check rate limits
    const rateLimitResult = await this.checkRateLimit(apiKey.id, apiKey.rateLimitPerMinute);
    if (!rateLimitResult.allowed) {
      return { valid: false, error: 'Rate limit exceeded', errorCode: 'RATE_LIMITED' };
    }

    // Update last used
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });

    return {
      valid: true,
      apiKeyId: apiKey.id,
      tenantId: apiKey.tenantId,
      scopes: apiKey.scopes,
    };
  }

  /**
   * Check if the API key has a required scope
   */
  hasScope(scopes: ApiScope[], required: ApiScope): boolean {
    return scopes.includes(required);
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(
    apiKeyId: string,
    revokedBy: string,
    reason?: string
  ): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        status: ApiKeyStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy,
        revokeReason: reason,
      },
    });
  }

  /**
   * List API keys for a tenant
   */
  async listApiKeys(tenantId: string): Promise<ApiKeyListItem[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        scopes: true,
        status: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        createdBy: true,
      },
    });

    return keys;
  }

  /**
   * Log API key usage
   */
  async logUsage(params: {
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.apiKeyUsageLog.create({
      data: {
        apiKeyId: params.apiKeyId,
        endpoint: params.endpoint,
        method: params.method,
        statusCode: params.statusCode,
        responseTimeMs: params.responseTimeMs,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Hash an API key for storage
   */
  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Check rate limit for an API key
   */
  private async checkRateLimit(
    apiKeyId: string,
    limitPerMinute: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const key = `rate:${apiKeyId}`;

    let entry = rateLimitStore.get(key);

    // Reset if window expired
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(key, entry);
    }

    // Check limit
    if (entry.count >= limitPerMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.resetAt),
      };
    }

    // Increment count
    entry.count++;

    return {
      allowed: true,
      remaining: limitPerMinute - entry.count,
      resetAt: new Date(entry.resetAt),
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES FOR LIST RESPONSE
// ══════════════════════════════════════════════════════════════════════════════

type ApiKey = Awaited<ReturnType<PrismaClient['apiKey']['create']>>;

interface ApiKeyListItem {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: ApiScope[];
  status: ApiKeyStatus;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  usageCount: number;
  createdAt: Date;
  createdBy: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// STANDALONE FUNCTIONS (for backwards compatibility and testing)
// ══════════════════════════════════════════════════════════════════════════════

export class ApiKeyValidationError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_KEY' | 'EXPIRED' | 'REVOKED' | 'RATE_LIMITED' | 'IP_BLOCKED' | 'INSUFFICIENT_SCOPE'
  ) {
    super(message);
    this.name = 'ApiKeyValidationError';
  }
}

/**
 * Hash an API key for storage (standalone function)
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Create a new API key (standalone function for testing)
 */
export async function createApiKey(params: {
  tenantId: string;
  name: string;
  description?: string;
  scopes: string[];
  createdBy: string;
  expiresAt?: Date;
  rateLimitPerMinute?: number;
}): Promise<{ id: string; rawKey: string }> {
  // This is a simplified version for module-level exports
  // In production, use the ApiKeyService class instance
  const { prisma } = await import('./prisma.js');
  
  const rawKey = `${API_KEY_PREFIX}${randomBytes(32).toString('hex')}`;
  const keyPrefix = rawKey.substring(0, 16);
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      tenantId: params.tenantId,
      name: params.name,
      description: params.description,
      keyPrefix,
      keyHash,
      scopes: params.scopes as ApiScope[],
      createdBy: params.createdBy,
      expiresAt: params.expiresAt,
      rateLimitPerMinute: params.rateLimitPerMinute ?? 60,
      rateLimitPerDay: 10000,
      allowedIps: [],
    },
  });

  return { id: apiKey.id, rawKey };
}

/**
 * Validate an API key (standalone function for testing)
 */
export async function validateApiKey(
  rawKey: string,
  requiredScope: string
): Promise<{ valid: boolean; tenantId?: string; apiKeyId?: string }> {
  const { prisma } = await import('./prisma.js');
  
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey) {
    throw new ApiKeyValidationError('Invalid API key', 'INVALID_KEY');
  }

  if (apiKey.status === 'REVOKED') {
    throw new ApiKeyValidationError('API key has been revoked', 'REVOKED');
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new ApiKeyValidationError('API key has expired', 'EXPIRED');
  }

  if (!apiKey.scopes.includes(requiredScope as ApiScope)) {
    throw new ApiKeyValidationError('Insufficient scope', 'INSUFFICIENT_SCOPE');
  }

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  });

  return {
    valid: true,
    tenantId: apiKey.tenantId,
    apiKeyId: apiKey.id,
  };
}

/**
 * Revoke an API key (standalone function for testing)
 */
export async function revokeApiKey(
  apiKeyId: string,
  tenantId: string,
  reason?: string
): Promise<void> {
  const { prisma } = await import('./prisma.js');
  
  await prisma.apiKey.update({
    where: {
      id: apiKeyId,
      tenantId,
    },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
      revocationReason: reason,
    },
  });
}
