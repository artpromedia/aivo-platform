import { Pool } from 'pg';

export type SafetyStatus = 'OK' | 'BLOCKED' | 'NEEDS_REVIEW';

export type AiCallStatus = 'SUCCESS' | 'ERROR';

/**
 * Use-case metadata for homework/focus agents, enabling fine-grained observability.
 * Known use cases are typed for discoverability, but custom strings are allowed.
 */
export type HomeworkUseCase =
  | 'HOMEWORK_STEP_SCAFFOLD'
  | 'HOMEWORK_HINT'
  | 'HOMEWORK_EXPLANATION'
  | 'HOMEWORK_VALIDATION';

export type FocusUseCase =
  | 'FOCUS_BREAK_SUGGESTION'
  | 'FOCUS_MOOD_CHECK'
  | 'FOCUS_SESSION_START'
  | 'FOCUS_ENCOURAGEMENT';

/** All known use cases. For custom use cases, use string type directly. */
export type KnownUseCase = HomeworkUseCase | FocusUseCase;

/** UseCase can be a known use case or any custom string. */
export type UseCase = string;

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
  /** Use-case metadata for observability (e.g., HOMEWORK_STEP_SCAFFOLD, FOCUS_BREAK_SUGGESTION) */
  useCase?: UseCase | undefined;
}

export interface AiCallSummary {
  totalCalls: number;
  totalTokens: number;
  estimatedCostUsd: number;
  safetyCounts: Record<SafetyStatus, number>;
}

/**
 * Extended metrics summary with agent-type breakdown for observability dashboards.
 */
export interface AgentMetricsSummary {
  /** Total calls by agent type */
  callsByAgent: Record<string, number>;
  /** Safety violations (BLOCKED) by agent type */
  safetyViolationsByAgent: Record<string, number>;
  /** Needs review counts by agent type */
  needsReviewByAgent: Record<string, number>;
  /** Average latency by agent type (ms) */
  avgLatencyByAgent: Record<string, number>;
  /** Calls by use case */
  callsByUseCase: Record<string, number>;
}

interface SummaryRow {
  total_calls: number | string | null;
  total_tokens: number | string | null;
  estimated_cost_usd: number | string | null;
  ok_count: number | string | null;
  blocked_count: number | string | null;
  needs_review_count: number | string | null;
}

interface AgentMetricsRow {
  agent_type: string;
  call_count: number | string | null;
  blocked_count: number | string | null;
  needs_review_count: number | string | null;
  avg_latency_ms: number | string | null;
}

interface UseCaseMetricsRow {
  use_case: string | null;
  call_count: number | string | null;
}

export interface TelemetryStore {
  record(log: AiCallLogInsert): Promise<void>;
  summary(tenantId?: string): Promise<AiCallSummary>;
  /** Get agent-specific metrics breakdown for observability */
  agentMetrics?(tenantId?: string): Promise<AgentMetricsSummary>;
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
      safetyCounts[row.safetyStatus] = safetyCounts[row.safetyStatus] + 1;
    }
    const estimatedCostUsd = filtered.reduce(
      (acc: number, r: AiCallLogInsert) => acc + r.estimatedCostUsd,
      0
    );
    return {
      totalCalls: filtered.length,
      totalTokens,
      estimatedCostUsd,
      safetyCounts,
    };
  }

  async agentMetrics(tenantId?: string): Promise<AgentMetricsSummary> {
    const filtered = tenantId ? this.rows.filter((r) => r.tenantId === tenantId) : this.rows;

    const callsByAgent: Record<string, number> = {};
    const safetyViolationsByAgent: Record<string, number> = {};
    const needsReviewByAgent: Record<string, number> = {};
    const latencySumByAgent: Record<string, number> = {};
    const callsByUseCase: Record<string, number> = {};

    for (const row of filtered) {
      const agent = row.agentType;
      callsByAgent[agent] = (callsByAgent[agent] ?? 0) + 1;
      latencySumByAgent[agent] = (latencySumByAgent[agent] ?? 0) + row.latencyMs;

      if (row.safetyStatus === 'BLOCKED') {
        safetyViolationsByAgent[agent] = (safetyViolationsByAgent[agent] ?? 0) + 1;
      }
      if (row.safetyStatus === 'NEEDS_REVIEW') {
        needsReviewByAgent[agent] = (needsReviewByAgent[agent] ?? 0) + 1;
      }

      if (row.useCase) {
        callsByUseCase[row.useCase] = (callsByUseCase[row.useCase] ?? 0) + 1;
      }
    }

    const avgLatencyByAgent: Record<string, number> = {};
    for (const [agent, total] of Object.entries(latencySumByAgent)) {
      avgLatencyByAgent[agent] = total / (callsByAgent[agent] ?? 1);
    }

    return {
      callsByAgent,
      safetyViolationsByAgent,
      needsReviewByAgent,
      avgLatencyByAgent,
      callsByUseCase,
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

  async agentMetrics(tenantId?: string): Promise<AgentMetricsSummary> {
    const where = tenantId ? 'WHERE tenant_id = $1' : '';
    const values = tenantId ? [tenantId] : [];

    // Query agent-level aggregates
    const agentRes = await this.pool.query<AgentMetricsRow>(
      `SELECT
        agent_type,
        COUNT(*)::int AS call_count,
        COALESCE(SUM((safety_status = 'BLOCKED')::int), 0)::int AS blocked_count,
        COALESCE(SUM((safety_status = 'NEEDS_REVIEW')::int), 0)::int AS needs_review_count,
        COALESCE(AVG(latency_ms), 0)::numeric AS avg_latency_ms
      FROM ai_call_logs
      ${where}
      GROUP BY agent_type
    `,
      values
    );

    // Query use-case level aggregates (use_case may be NULL for older logs)
    const useCaseRes = await this.pool.query<UseCaseMetricsRow>(
      `SELECT
        use_case,
        COUNT(*)::int AS call_count
      FROM ai_call_logs
      ${where}
      ${where ? 'AND' : 'WHERE'} use_case IS NOT NULL
      GROUP BY use_case
    `,
      values
    );

    const callsByAgent: Record<string, number> = {};
    const safetyViolationsByAgent: Record<string, number> = {};
    const needsReviewByAgent: Record<string, number> = {};
    const avgLatencyByAgent: Record<string, number> = {};

    for (const row of agentRes.rows) {
      const agent = row.agent_type;
      callsByAgent[agent] = Number(row.call_count ?? 0);
      safetyViolationsByAgent[agent] = Number(row.blocked_count ?? 0);
      needsReviewByAgent[agent] = Number(row.needs_review_count ?? 0);
      avgLatencyByAgent[agent] = Number(row.avg_latency_ms ?? 0);
    }

    const callsByUseCase: Record<string, number> = {};
    for (const row of useCaseRes.rows) {
      if (row.use_case) {
        callsByUseCase[row.use_case] = Number(row.call_count ?? 0);
      }
    }

    return {
      callsByAgent,
      safetyViolationsByAgent,
      needsReviewByAgent,
      avgLatencyByAgent,
      callsByUseCase,
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
