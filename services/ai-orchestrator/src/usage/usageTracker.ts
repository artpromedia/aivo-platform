/**
 * Per-Tenant AI Usage Tracking
 *
 * Tracks token usage and estimated costs per tenant.
 * Provides:
 * - Daily aggregation by tenant/provider/model/agent
 * - Usage queries for dashboards
 * - Quota enforcement support
 */

import { randomUUID } from 'node:crypto';

import type { Pool } from 'pg';

import type { AiAgentType, AiProvider } from '../types/aiRequest.js';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface UsageRecord {
  tenantId: string;
  date: string; // ISO date YYYY-MM-DD
  provider: AiProvider;
  model: string;
  agentType: AiAgentType;
  tokensInput: number;
  tokensOutput: number;
  estimatedCostCents: number;
  callCount: number;
}

export interface UsageSummary {
  tenantId: string;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCostCents: number;
  totalCalls: number;
  byProvider: Record<string, { tokens: number; costCents: number; calls: number }>;
  byAgent: Record<string, { tokens: number; costCents: number; calls: number }>;
  byDate: Record<string, { tokens: number; costCents: number; calls: number }>;
}

export interface UsageFilters {
  tenantId: string;
  from?: string; // ISO date
  to?: string; // ISO date
  provider?: AiProvider;
  agentType?: AiAgentType;
}

// ────────────────────────────────────────────────────────────────────────────
// USAGE TRACKER
// ────────────────────────────────────────────────────────────────────────────

/**
 * AI Usage Tracker - Tracks per-tenant token usage and costs.
 */
export class AiUsageTracker {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Record a usage event.
   * Uses upsert to aggregate by (date, tenant, provider, model, agent).
   */
  async recordUsage(record: UsageRecord): Promise<void> {
    const query = `
      INSERT INTO ai_usage (
        id, tenant_id, date, provider, model, agent_type,
        tokens_input, tokens_output, estimated_cost_cents, call_count,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        NOW(), NOW()
      )
      ON CONFLICT (tenant_id, date, provider, model, agent_type)
      DO UPDATE SET
        tokens_input = ai_usage.tokens_input + EXCLUDED.tokens_input,
        tokens_output = ai_usage.tokens_output + EXCLUDED.tokens_output,
        estimated_cost_cents = ai_usage.estimated_cost_cents + EXCLUDED.estimated_cost_cents,
        call_count = ai_usage.call_count + EXCLUDED.call_count,
        updated_at = NOW()
    `;

    await this.pool.query(query, [
      randomUUID(),
      record.tenantId,
      record.date,
      record.provider,
      record.model,
      record.agentType,
      record.tokensInput,
      record.tokensOutput,
      record.estimatedCostCents,
      record.callCount,
    ]);
  }

  /**
   * Get daily usage for a tenant.
   */
  async getDailyUsage(tenantId: string, date: string): Promise<UsageRecord[]> {
    const query = `
      SELECT * FROM ai_usage
      WHERE tenant_id = $1 AND date = $2
      ORDER BY agent_type, provider
    `;

    const result = await this.pool.query(query, [tenantId, date]);

    return result.rows.map(mapRowToUsageRecord);
  }

  /**
   * Get usage summary for a tenant over a date range.
   */
  async getUsageSummary(filters: UsageFilters): Promise<UsageSummary> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [filters.tenantId];
    let paramIndex = 2;

    if (filters.from) {
      conditions.push(`date >= $${paramIndex++}`);
      params.push(filters.from);
    }

    if (filters.to) {
      conditions.push(`date <= $${paramIndex++}`);
      params.push(filters.to);
    }

    if (filters.provider) {
      conditions.push(`provider = $${paramIndex++}`);
      params.push(filters.provider);
    }

    if (filters.agentType) {
      conditions.push(`agent_type = $${paramIndex++}`);
      params.push(filters.agentType);
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT 
        date,
        provider,
        agent_type,
        SUM(tokens_input) as tokens_input,
        SUM(tokens_output) as tokens_output,
        SUM(estimated_cost_cents) as cost_cents,
        SUM(call_count) as calls
      FROM ai_usage
      WHERE ${whereClause}
      GROUP BY date, provider, agent_type
      ORDER BY date DESC
    `;

    const result = await this.pool.query(query, params);

    // Aggregate results
    let totalTokensInput = 0;
    let totalTokensOutput = 0;
    let totalCostCents = 0;
    let totalCalls = 0;
    const byProvider: Record<string, { tokens: number; costCents: number; calls: number }> = {};
    const byAgent: Record<string, { tokens: number; costCents: number; calls: number }> = {};
    const byDate: Record<string, { tokens: number; costCents: number; calls: number }> = {};

    for (const row of result.rows) {
      const tokensInput = Number.parseInt(row.tokens_input, 10);
      const tokensOutput = Number.parseInt(row.tokens_output, 10);
      const costCents = Number.parseInt(row.cost_cents, 10);
      const calls = Number.parseInt(row.calls, 10);
      const tokens = tokensInput + tokensOutput;

      totalTokensInput += tokensInput;
      totalTokensOutput += tokensOutput;
      totalCostCents += costCents;
      totalCalls += calls;

      // By provider
      const provider = row.provider as string;
      byProvider[provider] ??= { tokens: 0, costCents: 0, calls: 0 };
      byProvider[provider].tokens += tokens;
      byProvider[provider].costCents += costCents;
      byProvider[provider].calls += calls;

      // By agent
      const agent = row.agent_type as string;
      byAgent[agent] ??= { tokens: 0, costCents: 0, calls: 0 };
      byAgent[agent].tokens += tokens;
      byAgent[agent].costCents += costCents;
      byAgent[agent].calls += calls;

      // By date
      const date = row.date as string;
      byDate[date] ??= { tokens: 0, costCents: 0, calls: 0 };
      byDate[date].tokens += tokens;
      byDate[date].costCents += costCents;
      byDate[date].calls += calls;
    }

    return {
      tenantId: filters.tenantId,
      totalTokensInput,
      totalTokensOutput,
      totalCostCents,
      totalCalls,
      byProvider,
      byAgent,
      byDate,
    };
  }

  /**
   * Get total token usage for a tenant on a specific date.
   * Used for quota enforcement.
   */
  async getTotalDailyTokens(tenantId: string, date: string): Promise<number> {
    const query = `
      SELECT 
        COALESCE(SUM(tokens_input + tokens_output), 0) as total_tokens
      FROM ai_usage
      WHERE tenant_id = $1 AND date = $2
    `;

    const result = await this.pool.query(query, [tenantId, date]);
    return Number.parseInt(result.rows[0]?.total_tokens ?? '0', 10);
  }

  /**
   * Check if tenant has exceeded their daily token quota.
   */
  async checkQuota(
    tenantId: string,
    dailyLimit: number
  ): Promise<{
    withinQuota: boolean;
    currentUsage: number;
    limit: number;
    remainingTokens: number;
  }> {
    const todayDate = new Date().toISOString().split('T')[0];
    const today = todayDate ?? new Date().toISOString().slice(0, 10);
    const currentUsage = await this.getTotalDailyTokens(tenantId, today);

    return {
      withinQuota: dailyLimit === 0 || currentUsage < dailyLimit,
      currentUsage,
      limit: dailyLimit,
      remainingTokens: dailyLimit === 0 ? Infinity : Math.max(0, dailyLimit - currentUsage),
    };
  }

  /**
   * Get top tenants by usage.
   */
  async getTopTenantsByUsage(
    from: string,
    to: string,
    limit = 10
  ): Promise<{ tenantId: string; totalTokens: number; totalCostCents: number }[]> {
    const query = `
      SELECT 
        tenant_id,
        SUM(tokens_input + tokens_output) as total_tokens,
        SUM(estimated_cost_cents) as total_cost_cents
      FROM ai_usage
      WHERE date >= $1 AND date <= $2
      GROUP BY tenant_id
      ORDER BY total_tokens DESC
      LIMIT $3
    `;

    const result = await this.pool.query(query, [from, to, limit]);

    return result.rows.map((row) => ({
      tenantId: row.tenant_id as string,
      totalTokens: Number.parseInt(row.total_tokens, 10),
      totalCostCents: Number.parseInt(row.total_cost_cents, 10),
    }));
  }

  /**
   * Get usage trends over time.
   */
  async getUsageTrends(
    tenantId: string,
    from: string,
    to: string,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<{ period: string; totalTokens: number; totalCostCents: number; calls: number }[]> {
    let dateFormat: string;
    switch (groupBy) {
      case 'week':
        dateFormat = "TO_CHAR(date, 'IYYY-IW')";
        break;
      case 'month':
        dateFormat = "TO_CHAR(date, 'YYYY-MM')";
        break;
      default:
        dateFormat = "TO_CHAR(date, 'YYYY-MM-DD')";
    }

    const query = `
      SELECT 
        ${dateFormat} as period,
        SUM(tokens_input + tokens_output) as total_tokens,
        SUM(estimated_cost_cents) as total_cost_cents,
        SUM(call_count) as calls
      FROM ai_usage
      WHERE tenant_id = $1 AND date >= $2 AND date <= $3
      GROUP BY ${dateFormat}
      ORDER BY period ASC
    `;

    const result = await this.pool.query(query, [tenantId, from, to]);

    return result.rows.map((row) => ({
      period: row.period as string,
      totalTokens: Number.parseInt(row.total_tokens, 10),
      totalCostCents: Number.parseInt(row.total_cost_cents, 10),
      calls: Number.parseInt(row.calls, 10),
    }));
  }
}

// ────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Map database row to usage record.
 */
function mapRowToUsageRecord(row: Record<string, unknown>): UsageRecord {
  return {
    tenantId: row.tenant_id as string,
    date: row.date as string,
    provider: row.provider as AiProvider,
    model: row.model as string,
    agentType: row.agent_type as AiAgentType,
    tokensInput: Number.parseInt(row.tokens_input as string, 10),
    tokensOutput: Number.parseInt(row.tokens_output as string, 10),
    estimatedCostCents: Number.parseInt(row.estimated_cost_cents as string, 10),
    callCount: Number.parseInt(row.call_count as string, 10),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// FACTORY
// ────────────────────────────────────────────────────────────────────────────

/**
 * Create a usage tracker instance.
 */
export function createUsageTracker(pool: Pool): AiUsageTracker {
  return new AiUsageTracker(pool);
}
