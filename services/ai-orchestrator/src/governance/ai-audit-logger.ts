/**
 * AI Audit Logger (Governance)
 *
 * Buffered batch logger that flushes AI interaction audit events to
 * audit-svc every 5 seconds or when the buffer hits 100 entries.
 *
 * On flush failure the events are written to a local JSONL fallback
 * file so that nothing is silently lost.
 *
 * @module governance/ai-audit-logger
 */

import { createHash } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AuditEvent {
  type: string;
  tenantId: string;
  userId: string;
  resourceId: string;
  category: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface AiAuditLoggerOptions {
  auditSvcUrl: string;
  flushIntervalMs?: number;
  flushThreshold?: number;
  fallbackDir?: string;
}

export interface StudentAuditHistoryParams {
  tenantId: string;
  studentId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditHistoryEntry {
  id: string;
  type: string;
  tenantId: string;
  userId: string;
  resourceId: string;
  category: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_FLUSH_INTERVAL = 5_000;  // 5 s
const DEFAULT_FLUSH_THRESHOLD = 100;

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class AiAuditLogger {
  private buffer: AuditEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly auditSvcUrl: string;
  private readonly flushThreshold: number;
  private readonly fallbackDir: string;

  constructor(options: AiAuditLoggerOptions) {
    this.auditSvcUrl = options.auditSvcUrl.replace(/\/+$/, '');
    this.flushThreshold = options.flushThreshold ?? DEFAULT_FLUSH_THRESHOLD;
    this.fallbackDir = options.fallbackDir ?? join(tmpdir(), 'aivo-audit-fallback');

    const intervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, intervalMs);
    if (this.flushTimer.unref) this.flushTimer.unref();
  }

  // ──────────────────────── Hashing helpers ────────────────────────

  static hashInput(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  static hashOutput(output: string): string {
    return createHash('sha256').update(output).digest('hex');
  }

  // ──────────────────────── Log ────────────────────────

  log(event: AuditEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= this.flushThreshold) {
      void this.flush();
    }
  }

  logAiInteraction(params: {
    tenantId: string;
    userId: string;
    studentId: string;
    model: string;
    context: string;
    inputTokens: number;
    outputTokens: number;
    processingMs: number;
    confidence?: number;
    rawInput: string;
    rawOutput: string;
  }): void {
    const event: AuditEvent = {
      type: 'AI_INTERACTION',
      tenantId: params.tenantId,
      userId: params.userId,
      resourceId: params.studentId,
      category: 'AI_INTERACTION',
      payload: {
        model: params.model,
        context: params.context,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        processingMs: params.processingMs,
        confidence: params.confidence ?? null,
        inputHash: AiAuditLogger.hashInput(params.rawInput),
        outputHash: AiAuditLogger.hashOutput(params.rawOutput),
      },
      timestamp: new Date().toISOString(),
    };
    this.log(event);
  }

  // ──────────────────────── Query ────────────────────────

  async queryStudentHistory(
    params: StudentAuditHistoryParams,
  ): Promise<{ entries: AuditHistoryEntry[]; total: number }> {
    const qs = new URLSearchParams({
      tenantId: params.tenantId,
      resourceId: params.studentId,
      category: 'AI_INTERACTION',
      limit: String(params.limit ?? 50),
      offset: String(params.offset ?? 0),
    });
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);

    try {
      const resp = await fetch(`${this.auditSvcUrl}/audit/query?${qs.toString()}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!resp.ok) {
        throw new Error(`audit-svc returned ${resp.status}`);
      }
      const body = (await resp.json()) as { entries: AuditHistoryEntry[]; total: number };
      return body;
    } catch (err) {
      // Caller decides how to handle
      throw new Error(
        `Failed to query audit history: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ──────────────────────── Flush ────────────────────────

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.flushThreshold);

    try {
      const resp = await fetch(`${this.auditSvcUrl}/audit/ingest/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      });

      if (!resp.ok) {
        await this.writeFallback(batch);
      }
    } catch {
      await this.writeFallback(batch);
    }
  }

  // ──────────────────────── Fallback ────────────────────────

  private async writeFallback(events: AuditEvent[]): Promise<void> {
    try {
      await mkdir(this.fallbackDir, { recursive: true });
      const filename = `audit-fallback-${Date.now()}.jsonl`;
      const content = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await writeFile(join(this.fallbackDir, filename), content, 'utf-8');
    } catch {
      // Last resort — nothing more we can do
    }
  }

  // ──────────────────────── Lifecycle ────────────────────────

  async close(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flush();
  }

  /** Current buffer length (for testing / metrics) */
  get pendingCount(): number {
    return this.buffer.length;
  }
}
