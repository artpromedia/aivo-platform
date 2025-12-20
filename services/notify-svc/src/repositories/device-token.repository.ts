/**
 * Device Token Repository
 *
 * Manages device tokens for push notifications.
 * Handles:
 * - Token registration and refresh
 * - Multiple devices per user
 * - Stale token pruning (not used in 60 days)
 * - Token invalidation
 */

import { prisma } from '../prisma.js';
import type { DeviceToken } from '../prisma.js';
import type { RegisterDeviceInput } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const STALE_TOKEN_DAYS = 60;
const MAX_DEVICES_PER_USER = 10;

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface DeviceTokenRecord {
  id: string;
  tenantId: string;
  userId: string;
  token: string;
  platform: string;
  deviceId: string | null;
  appVersion: string | null;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenRefreshInput {
  oldToken: string;
  newToken: string;
  userId: string;
  tenantId: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Register a new device token or update existing one
 */
export async function registerDeviceToken(
  input: RegisterDeviceInput
): Promise<DeviceTokenRecord> {
  const { tenantId, userId, token, platform, deviceId, appVersion } = input;

  // Check if token already exists
  const existing = await prisma.deviceToken.findUnique({
    where: { token },
  });

  if (existing) {
    // Update existing token
    const updated = await prisma.deviceToken.update({
      where: { token },
      data: {
        userId,
        tenantId,
        platform,
        deviceId,
        appVersion,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });

    console.log('[DeviceTokenRepo] Token updated:', {
      id: updated.id,
      userId,
      platform,
    });

    return updated as DeviceTokenRecord;
  }

  // Create new token
  const newToken = await prisma.deviceToken.create({
    data: {
      tenantId,
      userId,
      token,
      platform,
      deviceId,
      appVersion,
      isActive: true,
      lastUsedAt: new Date(),
    },
  });

  console.log('[DeviceTokenRepo] Token registered:', {
    id: newToken.id,
    userId,
    platform,
  });

  // Clean up old tokens if user has too many devices
  await pruneUserDevices(userId, tenantId);

  return newToken as DeviceTokenRecord;
}

/**
 * Handle token refresh (old token -> new token)
 */
export async function refreshToken(input: TokenRefreshInput): Promise<DeviceTokenRecord | null> {
  const { oldToken, newToken, userId, tenantId } = input;

  // Find the old token
  const existing = await prisma.deviceToken.findFirst({
    where: {
      token: oldToken,
      userId,
      tenantId,
    },
  });

  if (!existing) {
    console.warn('[DeviceTokenRepo] Old token not found for refresh:', {
      userId,
      tenantId,
    });
    return null;
  }

  // Update with new token
  const updated = await prisma.deviceToken.update({
    where: { id: existing.id },
    data: {
      token: newToken,
      lastUsedAt: new Date(),
      isActive: true,
    },
  });

  console.log('[DeviceTokenRepo] Token refreshed:', {
    id: updated.id,
    userId,
  });

  return updated as DeviceTokenRecord;
}

// ══════════════════════════════════════════════════════════════════════════════
// RETRIEVAL
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get all active tokens for a user
 */
export async function getActiveTokensForUser(
  userId: string,
  tenantId: string
): Promise<DeviceTokenRecord[]> {
  const tokens = await prisma.deviceToken.findMany({
    where: {
      userId,
      tenantId,
      isActive: true,
    },
    orderBy: {
      lastUsedAt: 'desc',
    },
  });

  return tokens as DeviceTokenRecord[];
}

/**
 * Get all active tokens for multiple users
 */
export async function getActiveTokensForUsers(
  userIds: string[],
  tenantId: string
): Promise<Map<string, DeviceTokenRecord[]>> {
  const tokens = await prisma.deviceToken.findMany({
    where: {
      userId: { in: userIds },
      tenantId,
      isActive: true,
    },
  });

  const tokenMap = new Map<string, DeviceTokenRecord[]>();
  
  for (const token of tokens) {
    const userTokens = tokenMap.get(token.userId) || [];
    userTokens.push(token as DeviceTokenRecord);
    tokenMap.set(token.userId, userTokens);
  }

  return tokenMap;
}

/**
 * Get all active tokens for a tenant
 */
export async function getActiveTokensForTenant(
  tenantId: string,
  limit = 1000
): Promise<DeviceTokenRecord[]> {
  const tokens = await prisma.deviceToken.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    take: limit,
    orderBy: {
      lastUsedAt: 'desc',
    },
  });

  return tokens as DeviceTokenRecord[];
}

/**
 * Get token by value
 */
export async function getTokenByValue(token: string): Promise<DeviceTokenRecord | null> {
  const record = await prisma.deviceToken.findUnique({
    where: { token },
  });

  return record as DeviceTokenRecord | null;
}

/**
 * Get tokens by platform
 */
export async function getTokensByPlatform(
  tenantId: string,
  platform: 'ios' | 'android' | 'web'
): Promise<DeviceTokenRecord[]> {
  const tokens = await prisma.deviceToken.findMany({
    where: {
      tenantId,
      platform,
      isActive: true,
    },
  });

  return tokens as DeviceTokenRecord[];
}

// ══════════════════════════════════════════════════════════════════════════════
// DEACTIVATION & DELETION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Unregister a device token
 */
export async function unregisterToken(token: string): Promise<boolean> {
  try {
    await prisma.deviceToken.delete({
      where: { token },
    });

    console.log('[DeviceTokenRepo] Token unregistered:', {
      token: token.substring(0, 20) + '...',
    });

    return true;
  } catch (error) {
    console.warn('[DeviceTokenRepo] Token not found for unregistration');
    return false;
  }
}

/**
 * Mark a token as inactive (invalid token from provider)
 */
export async function deactivateToken(token: string): Promise<boolean> {
  try {
    await prisma.deviceToken.update({
      where: { token },
      data: { isActive: false },
    });

    console.log('[DeviceTokenRepo] Token deactivated:', {
      token: token.substring(0, 20) + '...',
    });

    return true;
  } catch (error) {
    console.warn('[DeviceTokenRepo] Token not found for deactivation');
    return false;
  }
}

/**
 * Deactivate all tokens for a user (e.g., on logout from all devices)
 */
export async function deactivateAllUserTokens(
  userId: string,
  tenantId: string
): Promise<number> {
  const result = await prisma.deviceToken.updateMany({
    where: {
      userId,
      tenantId,
    },
    data: { isActive: false },
  });

  console.log('[DeviceTokenRepo] All user tokens deactivated:', {
    userId,
    count: result.count,
  });

  return result.count;
}

/**
 * Update token last used timestamp
 */
export async function touchToken(token: string): Promise<void> {
  try {
    await prisma.deviceToken.update({
      where: { token },
      data: { lastUsedAt: new Date() },
    });
  } catch (error) {
    // Token may have been deleted, ignore
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PRUNING & CLEANUP
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Prune stale tokens (not used in STALE_TOKEN_DAYS days)
 */
export async function pruneStaleTokens(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - STALE_TOKEN_DAYS);

  const result = await prisma.deviceToken.deleteMany({
    where: {
      OR: [
        { lastUsedAt: { lt: cutoffDate } },
        { lastUsedAt: null, createdAt: { lt: cutoffDate } },
      ],
    },
  });

  console.log('[DeviceTokenRepo] Stale tokens pruned:', {
    count: result.count,
    cutoffDate,
  });

  return result.count;
}

/**
 * Prune inactive tokens
 */
export async function pruneInactiveTokens(): Promise<number> {
  // Delete tokens that have been inactive for 7 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  const result = await prisma.deviceToken.deleteMany({
    where: {
      isActive: false,
      updatedAt: { lt: cutoffDate },
    },
  });

  console.log('[DeviceTokenRepo] Inactive tokens pruned:', {
    count: result.count,
  });

  return result.count;
}

/**
 * Prune user's old devices (keep only the most recent MAX_DEVICES_PER_USER)
 */
async function pruneUserDevices(userId: string, tenantId: string): Promise<void> {
  const tokens = await prisma.deviceToken.findMany({
    where: {
      userId,
      tenantId,
    },
    orderBy: {
      lastUsedAt: 'desc',
    },
  });

  if (tokens.length <= MAX_DEVICES_PER_USER) {
    return;
  }

  // Delete oldest tokens beyond the limit
  const tokensToDelete = tokens.slice(MAX_DEVICES_PER_USER);
  const idsToDelete = tokensToDelete.map((t) => t.id);

  await prisma.deviceToken.deleteMany({
    where: {
      id: { in: idsToDelete },
    },
  });

  console.log('[DeviceTokenRepo] Excess user devices pruned:', {
    userId,
    deleted: idsToDelete.length,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get token statistics for a tenant
 */
export async function getTokenStats(tenantId: string): Promise<{
  total: number;
  active: number;
  byPlatform: Record<string, number>;
}> {
  const [total, active, platformCounts] = await Promise.all([
    prisma.deviceToken.count({
      where: { tenantId },
    }),
    prisma.deviceToken.count({
      where: { tenantId, isActive: true },
    }),
    prisma.deviceToken.groupBy({
      by: ['platform'],
      where: { tenantId, isActive: true },
      _count: true,
    }),
  ]);

  const byPlatform: Record<string, number> = {};
  for (const p of platformCounts) {
    byPlatform[p.platform] = p._count;
  }

  return { total, active, byPlatform };
}

/**
 * Get unique user count with active tokens
 */
export async function getActiveUserCount(tenantId: string): Promise<number> {
  const result = await prisma.deviceToken.findMany({
    where: { tenantId, isActive: true },
    select: { userId: true },
    distinct: ['userId'],
  });

  return result.length;
}
