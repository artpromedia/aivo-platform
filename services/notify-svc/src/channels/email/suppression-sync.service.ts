/**
 * Suppression Sync Service
 *
 * Bidirectional synchronisation between AIVO's local EmailSuppression table
 * and OonruMail's suppression API:
 *
 *  1. syncLocalToOonruMail  — push un-synced local suppressions to OonruMail.
 *  2. reconcileFromOonruMail — pull OonruMail-only suppressions into local DB.
 *  3. filterSuppressed      — pre-send check that merges both sources.
 *
 * All operations are idempotent.
 */

import { AivolearningEmail } from '@enterprise-email/aivolearning-email';

import { config } from '../../config.js';
import { prisma } from '../../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface SyncResult {
  synced: number;
  errors: number;
}

export interface FilterResult {
  allowed: string[];
  suppressed: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class SuppressionSyncService {
  private client: AivolearningEmail | null = null;

  /**
   * Initialise the OonruMail client. Safe to call multiple times.
   */
  initialize(): void {
    if (this.client) return;
    if (config.email.oonrumail.enabled && config.email.oonrumail.apiKey) {
      this.client = new AivolearningEmail({ apiKey: config.email.oonrumail.apiKey });
    }
  }

  /** Whether the service has a working OonruMail client. */
  get isAvailable(): boolean {
    return this.client !== null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LOCAL → OONRUMAIL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Push un-synced local suppressions to OonruMail.
   * Processes up to 500 records per invocation.
   */
  async syncLocalToOonruMail(): Promise<SyncResult> {
    if (!this.client) return { synced: 0, errors: 0 };

    const localSuppressions = await prisma.emailSuppression.findMany({
      where: { syncedToProvider: false },
      take: 500,
    });

    let synced = 0;
    let errors = 0;

    for (const suppression of localSuppressions) {
      try {
        await this.client.sdk.suppressions.create({
          email: suppression.email,
          reason: this.mapReason(suppression.reason),
          description: `Synced from AIVO: ${suppression.reason}`,
        });

        await prisma.emailSuppression.update({
          where: { id: suppression.id },
          data: { syncedToProvider: true },
        });

        synced++;
      } catch (err) {
        console.error('[SuppressionSync] Error syncing to OonruMail:', suppression.email, err);
        errors++;
      }
    }

    return { synced, errors };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OONRUMAIL → LOCAL  (reconciliation)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Check OonruMail for suppressions that are NOT in the local DB and create
   * them locally. Returns the list of newly-created local suppressions.
   */
  async reconcileFromOonruMail(emails: string[]): Promise<string[]> {
    if (!this.client || emails.length === 0) return [];

    const result = await this.client.sdk.suppressions.check({ emails });
    const newlySuppressed: string[] = [];

    for (const [email, status] of Object.entries(
      result.results as Record<string, { suppressed?: boolean }>,
    )) {
      if (status?.suppressed) {
        const exists = await prisma.emailSuppression.findUnique({ where: { email } });
        if (!exists) {
          await prisma.emailSuppression.create({
            data: {
              email,
              reason: 'HARD_BOUNCE', // closest enum value for provider-originated suppression
              source: 'oonrumail_reconciliation',
              syncedToProvider: true,
            },
          });
          newlySuppressed.push(email);
        }
      }
    }

    return newlySuppressed;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRE-SEND FILTER
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Verify a batch of recipient addresses against both local and OonruMail
   * suppression lists. Returns allowed and suppressed partitions.
   */
  async filterSuppressed(emails: string[]): Promise<FilterResult> {
    // 1. Check local suppressions first (fast, no network)
    const localSuppressed = await prisma.emailSuppression.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });
    const suppressedSet = new Set(localSuppressed.map((s) => s.email));

    // 2. Check remaining addresses against OonruMail (if available)
    const remaining = emails.filter((e) => !suppressedSet.has(e));
    if (remaining.length > 0 && this.client) {
      try {
        const oonruCheck = await this.client.sdk.suppressions.check({ emails: remaining });
        for (const [email, status] of Object.entries(
          oonruCheck.results as Record<string, { suppressed?: boolean }>,
        )) {
          if (status?.suppressed) {
            suppressedSet.add(email);
          }
        }
      } catch (err) {
        // Non-blocking: if OonruMail check fails, rely on local data only
        console.error('[SuppressionSync] OonruMail check failed, using local only:', err);
      }
    }

    return {
      allowed: emails.filter((e) => !suppressedSet.has(e)),
      suppressed: emails.filter((e) => suppressedSet.has(e)),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Map our SuppressionReason enum to OonruMail's reason string.
   */
  private mapReason(reason: string): string {
    const map: Record<string, string> = {
      HARD_BOUNCE: 'hard_bounce',
      SOFT_BOUNCE: 'soft_bounce',
      SPAM_COMPLAINT: 'spam_complaint',
      UNSUBSCRIBED: 'unsubscribe',
      INVALID_EMAIL: 'invalid_email',
      MANUAL: 'manual',
    };
    return map[reason] ?? 'manual';
  }
}

export const suppressionSyncService = new SuppressionSyncService();
