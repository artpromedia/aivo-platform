/**
 * SCIM Token Service
 *
 * Manages SCIM bearer tokens for tenant directory sync.
 * Tokens are stored as SHA-256 hashes — the raw token is returned only once on creation.
 */

import crypto from 'node:crypto';

import type { PrismaClient } from '../../generated/prisma-client/index.js';

export class ScimTokenService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a new SCIM bearer token for a tenant.
   * Returns the raw token once — it is never stored in plain text.
   */
  async generateToken(
    tenantId: string,
    label: string
  ): Promise<{ token: string; id: string }> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const record = await this.prisma.scimToken.create({
      data: {
        tenantId,
        label,
        tokenHash,
        active: true,
      },
    });

    return { token: rawToken, id: record.id };
  }

  /**
   * Revoke a SCIM token.
   */
  async revokeToken(tenantId: string, tokenId: string): Promise<void> {
    await this.prisma.scimToken.update({
      where: { id: tokenId },
      data: { active: false },
    });
  }

  /**
   * List all SCIM tokens for a tenant (without raw tokens).
   */
  async listTokens(
    tenantId: string
  ): Promise<Array<{ id: string; label: string; active: boolean; lastUsedAt: Date | null; createdAt: Date }>> {
    return this.prisma.scimToken.findMany({
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

  /**
   * Validate a bearer token and return the associated tenantId.
   * Updates lastUsedAt timestamp on successful validation.
   */
  async validateToken(rawToken: string): Promise<{ tenantId: string } | null> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const record = await this.prisma.scimToken.findFirst({
      where: { tokenHash, active: true },
    });

    if (!record) {
      return null;
    }

    // Update lastUsedAt in the background — don't await
    this.prisma.scimToken
      .update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        // Ignore update errors — validation still succeeded
      });

    return { tenantId: record.tenantId };
  }
}
