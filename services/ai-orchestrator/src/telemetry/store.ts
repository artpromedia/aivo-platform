import { Pool } from 'pg';

export type SafetyStatus = 'OK' | 'BLOCKED' | 'NEEDS_REVIEW';

export type AiCallStatus = 'SUCCESS' | 'ERROR';

export interface AiCallLogInsert {
  id: string;
  tenantId?: string | undefined;
  agentType: string;
  modelName: string;
  provider: string;
  version: string;
  requestId: string;
  startedAt: Date;
  completedAt: Date;
  latencyMs: number;
  tokensPrompt: number;
  tokensCompletion: number;
  estimatedCostUsd: number;
  safetyStatus: SafetyStatus;
  status: AiCallStatus;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
}

export interface AiCallSummary {
  totalCalls: number;
  totalTokens: number;
  estimatedCostUsd: number;
  safetyCounts: Record<SafetyStatus, number>;
}

interface SummaryRow {
  total_calls: number | string | null;
  total_tokens: number | string | null;
  estimated_cost_usd: number | string | null;
  ok_count: number | string | null;
  blocked_count: number | string | null;
  needs_review_count: number | string | null;
}

export interface TelemetryStore {
  record(log: AiCallLogInsert): Promise<void>;
  summary(tenantId?: string): Promise<AiCallSummary>;
  dispose?(): Promise<void>;
}

export class InMemoryTelemetryStore implements TelemetryStore {
  private rows: AiCallLogInsert[] = [];

  async record(log: AiCallLogInsert): Promise<void> {
    this.rows.push(log);
  }

  async summary(tenantId?: string): Promise<AiCallSummary> {
    const filtered = tenantId ? this.rows.filter((r) => r.tenantId === tenantId) : this.rows;
    const totalTokens = filtered.reduce((acc, r) => acc + r.tokensPrompt + r.tokensCompletion, 0);
    const safetyCounts: Record<SafetyStatus, number> = {
      OK: 0,
      BLOCKED: 0,
      NEEDS_REVIEW: 0,
    };
    for (const row of filtered) {
      safetyCounts[row.safetyStatus] = (safetyCounts[row.safetyStatus] ?? 0) + 1;
    }
    const estimatedCostUsd = filtered.reduce((acc, r) => acc + r.estimatedCostUsd, 0);
    return {
      totalCalls: filtered.length,
      totalTokens,
      estimatedCostUsd,
      safetyCounts,
    };
  }
}

export class PgTelemetryStore implements TelemetryStore {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async record(log: AiCallLogInsert): Promise<void> {
    await this.pool.query(
      `INSERT INTO ai_call_logs (
        id, tenant_id, agent_type, model_name, provider, version, request_id,
        started_at, completed_at, latency_ms,
        tokens_prompt, tokens_completion, estimated_cost_usd,
        safety_status, status, error_code, error_message
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16, $17
      )`,
      [
        log.id,
        log.tenantId ?? null,
        log.agentType,
        log.modelName,
        log.provider,
        log.version,
        log.requestId,
        log.startedAt,
        log.completedAt,
        log.latencyMs,
        log.tokensPrompt,
        log.tokensCompletion,
        log.estimatedCostUsd,
        log.safetyStatus,
        log.status,
        log.errorCode ?? null,
        log.errorMessage ?? null,
      ]
    );
  }

  async summary(tenantId?: string): Promise<AiCallSummary> {
    const where = tenantId ? 'WHERE tenant_id = $1' : '';
    const values = tenantId ? [tenantId] : [];
    const res = await this.pool.query<SummaryRow>(
      `SELECT
        COUNT(*)::int AS total_calls,
        COALESCE(SUM(tokens_prompt + tokens_completion), 0)::int AS total_tokens,
        COALESCE(SUM(estimated_cost_usd), 0)::numeric AS estimated_cost_usd,
        COALESCE(SUM((safety_status = 'OK')::int), 0)::int AS ok_count,
        COALESCE(SUM((safety_status = 'BLOCKED')::int), 0)::int AS blocked_count,
        COALESCE(SUM((safety_status = 'NEEDS_REVIEW')::int), 0)::int AS needs_review_count
      FROM ai_call_logs
      ${where}
    `,
      values
    );
    const row = res.rows[0] ?? {
      total_calls: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
      ok_count: 0,
      blocked_count: 0,
      needs_review_count: 0,
    };
    return {
      totalCalls: Number(row.total_calls ?? 0),
      totalTokens: Number(row.total_tokens ?? 0),
      estimatedCostUsd: Number(row.estimated_cost_usd ?? 0),
      safetyCounts: {
        OK: Number(row.ok_count ?? 0),
        BLOCKED: Number(row.blocked_count ?? 0),
        NEEDS_REVIEW: Number(row.needs_review_count ?? 0),
      },
    };
  }

  async dispose(): Promise<void> {
    await this.pool.end();
  }
}

export function createTelemetryStore(databaseUrl?: string): TelemetryStore {
  if (databaseUrl) {
    return new PgTelemetryStore(new Pool({ connectionString: databaseUrl }));
  }
  return new InMemoryTelemetryStore();
}
