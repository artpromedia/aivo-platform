/**
 * SCIM Token Service
 *
 * Manages bearer tokens for SCIM directory sync integrations.
 * Tokens are stored as SHA-256 hashes — the raw value is returned only once on creation.
 */

import { createHash, randomBytes } from 'node:crypto';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a new SCIM bearer token for a tenant.
 * Returns the raw token exactly once; only the SHA-256 hash is persisted.
 */
export async function generateToken(
  tenantId: string,
  label: string
): Promise<{ id: string; rawToken: string }> {
  const rawToken = randomBytes(32).toString('hex'); // 64-char hex string
  const tokenHash = hashToken(rawToken);

  const record = await prisma.scimToken.create({
    data: { tenantId, label, tokenHash },
  });

  return { id: record.id, rawToken };
}

/**
 * Validate an incoming bearer token.
 * Returns the tenantId if valid, or null if invalid / revoked.
 * Also updates `lastUsedAt` on successful validation.
 */
export async function validateToken(rawToken: string): Promise<string | null> {
  const tokenHash = hashToken(rawToken);

  const record = await prisma.scimToken.findFirst({
    where: { tokenHash, active: true },
    select: { id: true, tenantId: true },
  });

  if (!record) return null;

  // Fire-and-forget timestamp update (non-blocking)
  void prisma.scimToken.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return record.tenantId;
}

/**
 * Revoke a SCIM token (soft-delete: sets active = false).
 */
export async function revokeToken(tenantId: string, tokenId: string): Promise<boolean> {
  const result = await prisma.scimToken.updateMany({
    where: { id: tokenId, tenantId, active: true },
    data: { active: false },
  });

  return result.count > 0;
}

/**
 * List all tokens for a tenant (never exposes hashes).
 */
export async function listTokens(tenantId: string) {
  return prisma.scimToken.findMany({
    where: { tenantId },
    select: {
      id: true,
      label: true,
      active: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
