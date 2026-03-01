/**
 * Provider Router Module
 *
 * Intelligent, tenant-aware provider selection with failover support.
 * Responsibilities:
 * - Context-aware model selection based on task characteristics
 * - Cost-optimized routing with budget-aware downshift
 * - Education-optimized agent-type → model mapping
 * - Per-tenant configuration overrides
 * - Structured observability logging for all routing decisions
 * - Failover with circuit-breaker resilience
 *
 * Design:
 * - `selectOptimalModel()` replaces static mapping with intelligent selection
 * - Budget tracking auto-downgrades to cheaper models when >80% consumed
 * - Each agent type maps to the best-fit model for K-12 education tasks
 */

import { EventEmitter } from 'node:events';

import type { LLMProvider, IAgentResponse, GenerateParams } from '../types/agent.js';
import type {
  AiAgentType,
  AiProvider,
  AiRequest,
  AiRequestMeta,
  ProviderSelection,
  TenantAiConfig,
} from '../types/aiRequest.js';

import { ProviderFailoverRegistry, CircuitState, type ProviderHealth } from './failover.js';
import { MockLLMProvider } from './MockLLMProvider.js';

// ────────────────────────────────────────────────────────────────────────────
// MODEL SELECTION CONTEXT
// ────────────────────────────────────────────────────────────────────────────

/**
 * Context used by the intelligent model selector to pick the best model.
 */
export interface ModelSelectionContext {
  /** Agent type for this request */
  agentType: AiAgentType;
  /** Estimated input token count (0 if unknown) */
  estimatedInputTokens: number;
  /** Whether the request involves code generation / structured output */
  requiresCodeGeneration?: boolean;
  /** Whether the request requires agentic multi-step reasoning */
  requiresAgenticReasoning?: boolean;
  /** Whether the request contains vision/image input */
  requiresVision?: boolean;
  /** Whether low-latency is critical (e.g., real-time tutoring) */
  requiresLowLatency?: boolean;
  /** Educational metadata (subject, grade band, etc.) */
  meta?: AiRequestMeta;
  /** Tenant ID for budget lookup */
  tenantId?: string;
}

/**
 * Result from intelligent model selection with explanation.
 */
export interface ModelSelectionResult {
  /** Selected provider */
  provider: AiProvider;
  /** Selected model */
  model: string;
  /** Human-readable reason for the selection */
  reason: string;
  /** Whether cost-based downshift was applied */
  downshiftApplied: boolean;
  /** Original model before downshift (if any) */
  originalModel?: string;
  /** Original provider before downshift (if any) */
  originalProvider?: AiProvider;
}

/**
 * Routing decision log entry for observability.
 */
export interface RoutingDecisionLog {
  timestamp: string;
  tenantId: string;
  agentType: AiAgentType;
  selectedProvider: AiProvider;
  selectedModel: string;
  reason: string;
  downshiftApplied: boolean;
  budgetUtilization?: number;
  contextSignals: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// DEFAULT CONFIGURATIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Education-optimized model mapping per provider and agent type.
 *
 * Rationale for each agent type:
 * - TUTOR:           Opus 4.6 — best at Socratic reasoning & scaffolded pedagogy
 * - BASELINE:        Gemini Flash — fast & cheap for diagnostic assessments
 * - IEP_GOAL:        Opus 4.6 — critical IEP/504 goals need highest quality
 * - HOMEWORK_HELPER: GPT-5.2-pro — strong at structured math/science problems
 * - FOCUS:           Gemini Flash — sub-second latency for ADHD focus mode
 * - INSIGHTS:        Opus 4.6 — deep analysis of learner patterns
 * - VIRTUAL_BRAIN:   GPT-5.3-Codex — structured knowledge graph generation
 * - LESSON_PLANNER:  Opus 4.6 — curriculum design & differentiation
 * - PROGRESS:        Gemini Flash — quick metric summaries
 * - SAFETY:          GPT-5.2-instant — fast safety screening
 * - OTHER:           Gemini Flash — default to cheapest capable model
 */
const DEFAULT_MODEL_MAPPING: Record<AiProvider, Record<AiAgentType, string>> = {
  OPENAI: {
    BASELINE: 'gpt-5.2-instant',
    TUTOR: 'gpt-5.2-pro',
    HOMEWORK_HELPER: 'gpt-5.2-pro',
    FOCUS: 'gpt-5.2-instant',
    INSIGHTS: 'gpt-5.2-pro',
    VIRTUAL_BRAIN: 'gpt-5.3-codex',
    LESSON_PLANNER: 'gpt-5.2-pro',
    PROGRESS: 'gpt-5.2-instant',
    SAFETY: 'gpt-5.2-instant',
    IEP_GOAL: 'gpt-5.2-pro',
    OTHER: 'gpt-5.2-instant',
  },
  ANTHROPIC: {
    BASELINE: 'claude-sonnet-4-6-20260201',
    TUTOR: 'claude-opus-4-6-20260201',
    HOMEWORK_HELPER: 'claude-sonnet-4-6-20260201',
    FOCUS: 'claude-sonnet-4-6-20260201',
    INSIGHTS: 'claude-opus-4-6-20260201',
    VIRTUAL_BRAIN: 'claude-opus-4-6-20260201',
    LESSON_PLANNER: 'claude-opus-4-6-20260201',
    PROGRESS: 'claude-sonnet-4-6-20260201',
    SAFETY: 'claude-sonnet-4-6-20260201',
    IEP_GOAL: 'claude-opus-4-6-20260201',
    OTHER: 'claude-sonnet-4-6-20260201',
  },
  GEMINI: {
    BASELINE: 'gemini-3.1-flash',
    TUTOR: 'gemini-3.1-pro',
    HOMEWORK_HELPER: 'gemini-3.1-pro',
    FOCUS: 'gemini-3.1-flash',
    INSIGHTS: 'gemini-3.1-pro',
    VIRTUAL_BRAIN: 'gemini-3.1-pro',
    LESSON_PLANNER: 'gemini-3.1-pro',
    PROGRESS: 'gemini-3.1-flash',
    SAFETY: 'gemini-3.1-flash',
    IEP_GOAL: 'gemini-3.1-pro',
    OTHER: 'gemini-3.1-flash',
  },
  MOCK: {
    BASELINE: 'mock-model',
    TUTOR: 'mock-model',
    HOMEWORK_HELPER: 'mock-model',
    FOCUS: 'mock-model',
    INSIGHTS: 'mock-model',
    VIRTUAL_BRAIN: 'mock-model',
    LESSON_PLANNER: 'mock-model',
    PROGRESS: 'mock-model',
    SAFETY: 'mock-model',
    IEP_GOAL: 'mock-model',
    OTHER: 'mock-model',
  },
};

/**
 * Education-optimized PREFERRED provider per agent type.
 *
 * When smart routing is enabled, this determines which provider is the
 * best fit for each educational task, overriding the default priority order.
 */
const EDUCATION_OPTIMAL_PROVIDER: Record<AiAgentType, AiProvider> = {
  TUTOR: 'ANTHROPIC',           // Opus 4.6 — Socratic reasoning
  BASELINE: 'GEMINI',           // Flash — fast diagnostics
  IEP_GOAL: 'ANTHROPIC',       // Opus 4.6 — high-stakes IEP goals
  HOMEWORK_HELPER: 'OPENAI',   // GPT-5.2-pro — structured problems
  FOCUS: 'GEMINI',             // Flash — sub-second for ADHD
  INSIGHTS: 'ANTHROPIC',       // Opus 4.6 — deep learner analysis
  VIRTUAL_BRAIN: 'OPENAI',     // GPT-5.3-Codex — knowledge graphs
  LESSON_PLANNER: 'ANTHROPIC', // Opus 4.6 — curriculum design
  PROGRESS: 'GEMINI',          // Flash — quick metric rolls
  SAFETY: 'OPENAI',            // GPT-5.2-instant — fast screening
  OTHER: 'GEMINI',             // Flash — default cheap
};

/**
 * Cost-optimized downshift mapping.
 *
 * When budget utilization exceeds the threshold, expensive models are
 * automatically downgraded to cheaper alternatives that are still capable.
 */
const COST_DOWNSHIFT_MAP: Record<string, { provider: AiProvider; model: string }> = {
  // Opus → Sonnet (Anthropic)
  'ANTHROPIC:claude-opus-4-6-20260201': { provider: 'ANTHROPIC', model: 'claude-sonnet-4-6-20260201' },
  // GPT-5.2-pro → GPT-5.2-instant (OpenAI)
  'OPENAI:gpt-5.2-pro': { provider: 'OPENAI', model: 'gpt-5.2-instant' },
  // GPT-5.3-codex → GPT-5.2-instant (OpenAI)
  'OPENAI:gpt-5.3-codex': { provider: 'OPENAI', model: 'gpt-5.2-instant' },
  // Gemini Pro → Gemini Flash (Google)
  'GEMINI:gemini-3.1-pro': { provider: 'GEMINI', model: 'gemini-3.1-flash' },
};

/**
 * Default provider priority order.
 */
const DEFAULT_PROVIDER_PRIORITY: AiProvider[] = ['GEMINI', 'OPENAI', 'ANTHROPIC'];

/**
 * Default tenant AI configuration.
 */
const DEFAULT_TENANT_CONFIG: TenantAiConfig = {
  allowedProviders: ['OPENAI', 'ANTHROPIC', 'GEMINI', 'MOCK'],
  providerPriority: DEFAULT_PROVIDER_PRIORITY,
  dailyTokenLimit: 0, // Unlimited
  contentFilterLevel: 'STANDARD',
  enablePiiRedaction: true,
  dailyCostBudgetUsd: 0, // Unlimited — tenants can set a budget
  costDownshiftThreshold: 0.8, // Auto-downshift at 80% budget consumed
  enableSmartRouting: true, // Use context-aware routing by default
};

/**
 * Cost per 1K tokens by provider and model (in USD).
 */
const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  // OpenAI (2026 generation)
  'OPENAI:gpt-5.2-instant': { input: 0.00015, output: 0.0006 },
  'OPENAI:gpt-5.2-pro': { input: 0.0025, output: 0.01 },
  'OPENAI:gpt-5.3-codex': { input: 0.005, output: 0.02 },
  // OpenAI (legacy)
  'OPENAI:gpt-4o': { input: 0.0025, output: 0.01 },
  'OPENAI:gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'OPENAI:gpt-4-turbo': { input: 0.01, output: 0.03 },

  // Anthropic (2026 generation)
  'ANTHROPIC:claude-opus-4-6-20260201': { input: 0.015, output: 0.075 },
  'ANTHROPIC:claude-sonnet-4-6-20260201': { input: 0.003, output: 0.015 },
  // Anthropic (legacy)
  'ANTHROPIC:claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'ANTHROPIC:claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },

  // Gemini (2026 generation)
  'GEMINI:gemini-3.1-pro': { input: 0.00125, output: 0.005 },
  'GEMINI:gemini-3.1-flash': { input: 0.000075, output: 0.0003 },
  // Gemini (legacy)
  'GEMINI:gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'GEMINI:gemini-1.5-flash': { input: 0.000075, output: 0.0003 },

  // Mock
  'MOCK:mock-model': { input: 0, output: 0 },
};

// ────────────────────────────────────────────────────────────────────────────
// PROVIDER ROUTER CLASS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Events emitted by the ProviderRouter.
 */
export interface ProviderRouterEvents {
  providerSelected: (tenantId: string, provider: AiProvider, model: string) => void;
  failoverInitiated: (tenantId: string, from: AiProvider, to: AiProvider, reason: string) => void;
  allProvidersFailed: (tenantId: string, error: Error) => void;
  quotaExceeded: (tenantId: string, current: number, limit: number) => void;
  routingDecision: (log: RoutingDecisionLog) => void;
}

/**
 * Result from invoking a provider.
 */
export interface ProviderInvocationResult {
  success: boolean;
  response?: IAgentResponse<string> | undefined;
  provider: AiProvider;
  model: string;
  failoverOccurred: boolean;
  originalProvider?: AiProvider | undefined;
  error?: Error | undefined;
  latencyMs: number;
}

/**
 * Provider Router - Manages provider selection and failover.
 */
export class ProviderRouter extends EventEmitter {
  private readonly failoverRegistry: ProviderFailoverRegistry;
  private readonly tenantConfigs = new Map<string, TenantAiConfig>();
  private readonly providers = new Map<AiProvider, LLMProvider>();
  /** In-memory daily cost tracker per tenant (tenantId → accumulated USD). */
  private readonly dailyCostAccumulator = new Map<string, { date: string; costUsd: number }>();

  constructor(failoverRegistry?: ProviderFailoverRegistry) {
    super();
    this.failoverRegistry = failoverRegistry ?? new ProviderFailoverRegistry();

    // Initialize default mock provider
    this.providers.set('MOCK', new MockLLMProvider('default-seed'));
  }

  /**
   * Register a provider implementation.
   */
  registerProvider(providerType: AiProvider, provider: LLMProvider): void {
    this.providers.set(providerType, provider);

    // Also register with failover registry
    const priority = DEFAULT_PROVIDER_PRIORITY.indexOf(providerType);
    this.failoverRegistry.registerProvider({
      name: providerType,
      priority: priority >= 0 ? priority : 99,
      provider,
      maxFailures: 3,
      resetTimeout: 30000,
      healthCheckInterval: 60000,
    });
  }

  /**
   * Set tenant-specific configuration.
   */
  setTenantConfig(tenantId: string, config: Partial<TenantAiConfig>): void {
    const existing = this.tenantConfigs.get(tenantId) ?? { ...DEFAULT_TENANT_CONFIG };
    this.tenantConfigs.set(tenantId, { ...existing, ...config });
  }

  /**
   * Get tenant configuration.
   */
  getTenantConfig(tenantId: string): TenantAiConfig {
    return this.tenantConfigs.get(tenantId) ?? DEFAULT_TENANT_CONFIG;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTELLIGENT MODEL SELECTION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Select the optimal model based on task context, budget, and education fit.
   *
   * Decision cascade:
   * 1. Tenant model overrides (highest priority)
   * 2. Context-aware signals (long context, code gen, vision, latency)
   * 3. Education-optimized provider mapping
   * 4. Cost-based downshift if budget threshold exceeded
   * 5. Static DEFAULT_MODEL_MAPPING fallback
   *
   * @param context - Rich context about the request
   * @returns Selection result with provider, model, and reasoning
   */
  selectOptimalModel(context: ModelSelectionContext): ModelSelectionResult {
    const tenantId = context.tenantId ?? 'default';
    const config = this.getTenantConfig(tenantId);
    const contextSignals: string[] = [];

    // ── Step 1: Check tenant-level model override ──
    if (config.modelOverrides?.[context.agentType]) {
      const ovr = config.modelOverrides[context.agentType]!;
      const result: ModelSelectionResult = {
        provider: ovr.provider,
        model: ovr.model,
        reason: `Tenant override for ${context.agentType}`,
        downshiftApplied: false,
      };
      this.emitRoutingDecision(tenantId, context, result, 0, ['tenant-override']);
      return result;
    }

    // ── Step 2: Context-aware signal detection ──
    let selectedProvider: AiProvider;
    let selectedModel: string;
    let reason: string;

    // 2a. Long context (>100K tokens) → prefer Gemini 3.1 Pro (1M window) or Opus 4.6 (1M)
    if (context.estimatedInputTokens > 100_000) {
      contextSignals.push('long-context');
      if (this.isProviderAllowed('GEMINI', config)) {
        selectedProvider = 'GEMINI';
        selectedModel = 'gemini-3.1-pro';
        reason = 'Long context (>100K tokens) → Gemini 3.1 Pro (1M context window)';
      } else if (this.isProviderAllowed('ANTHROPIC', config)) {
        selectedProvider = 'ANTHROPIC';
        selectedModel = 'claude-opus-4-6-20260201';
        reason = 'Long context (>100K tokens) → Opus 4.6 (1M context window)';
      } else {
        selectedProvider = 'OPENAI';
        selectedModel = 'gpt-5.2-pro';
        reason = 'Long context (>100K tokens) → GPT-5.2-pro (best available)';
      }
    }
    // 2b. Code generation → GPT-5.3-Codex
    else if (context.requiresCodeGeneration) {
      contextSignals.push('code-generation');
      if (this.isProviderAllowed('OPENAI', config)) {
        selectedProvider = 'OPENAI';
        selectedModel = 'gpt-5.3-codex';
        reason = 'Code generation → GPT-5.3-Codex (optimized for code)';
      } else if (this.isProviderAllowed('ANTHROPIC', config)) {
        selectedProvider = 'ANTHROPIC';
        selectedModel = 'claude-opus-4-6-20260201';
        reason = 'Code generation (OpenAI unavailable) → Opus 4.6';
      } else {
        selectedProvider = 'GEMINI';
        selectedModel = 'gemini-3.1-pro';
        reason = 'Code generation (fallback) → Gemini 3.1 Pro';
      }
    }
    // 2c. Agentic multi-step reasoning → Opus 4.6
    else if (context.requiresAgenticReasoning) {
      contextSignals.push('agentic-reasoning');
      if (this.isProviderAllowed('ANTHROPIC', config)) {
        selectedProvider = 'ANTHROPIC';
        selectedModel = 'claude-opus-4-6-20260201';
        reason = 'Agentic reasoning → Opus 4.6 (best at multi-step planning)';
      } else if (this.isProviderAllowed('OPENAI', config)) {
        selectedProvider = 'OPENAI';
        selectedModel = 'gpt-5.2-pro';
        reason = 'Agentic reasoning (Anthropic unavailable) → GPT-5.2-pro';
      } else {
        selectedProvider = 'GEMINI';
        selectedModel = 'gemini-3.1-pro';
        reason = 'Agentic reasoning (fallback) → Gemini 3.1 Pro';
      }
    }
    // 2d. Vision / image input → Gemini 3.1 Pro or Opus 4.6
    else if (context.requiresVision) {
      contextSignals.push('vision');
      if (this.isProviderAllowed('GEMINI', config)) {
        selectedProvider = 'GEMINI';
        selectedModel = 'gemini-3.1-pro';
        reason = 'Vision input → Gemini 3.1 Pro (native multimodal)';
      } else if (this.isProviderAllowed('ANTHROPIC', config)) {
        selectedProvider = 'ANTHROPIC';
        selectedModel = 'claude-opus-4-6-20260201';
        reason = 'Vision input → Opus 4.6 (multimodal)';
      } else {
        selectedProvider = 'OPENAI';
        selectedModel = 'gpt-5.2-pro';
        reason = 'Vision input (fallback) → GPT-5.2-pro';
      }
    }
    // 2e. Low-latency critical → Flash/instant models
    else if (context.requiresLowLatency) {
      contextSignals.push('low-latency');
      if (this.isProviderAllowed('GEMINI', config)) {
        selectedProvider = 'GEMINI';
        selectedModel = 'gemini-3.1-flash';
        reason = 'Low latency required → Gemini 3.1 Flash (fastest)';
      } else if (this.isProviderAllowed('OPENAI', config)) {
        selectedProvider = 'OPENAI';
        selectedModel = 'gpt-5.2-instant';
        reason = 'Low latency required → GPT-5.2-instant';
      } else {
        selectedProvider = 'ANTHROPIC';
        selectedModel = 'claude-sonnet-4-6-20260201';
        reason = 'Low latency required → Sonnet 4.6 (fastest Anthropic)';
      }
    }
    // ── Step 3: Education-optimized provider selection ──
    else if (config.enableSmartRouting !== false) {
      contextSignals.push('education-optimized');
      const optimalProvider = EDUCATION_OPTIMAL_PROVIDER[context.agentType];

      if (this.isProviderAllowed(optimalProvider, config)) {
        selectedProvider = optimalProvider;
      } else {
        // Fall through allowed providers in priority order
        selectedProvider = config.providerPriority.find((p) =>
          config.allowedProviders.includes(p)
        ) ?? 'MOCK';
      }
      selectedModel = DEFAULT_MODEL_MAPPING[selectedProvider][context.agentType];
      reason = `Education-optimized: ${context.agentType} → ${selectedProvider} (${selectedModel})`;
    }
    // ── Step 5: Static fallback ──
    else {
      contextSignals.push('static-mapping');
      const fallbackProvider = config.providerPriority.find((p) =>
        config.allowedProviders.includes(p)
      ) ?? 'MOCK';
      selectedProvider = fallbackProvider;
      selectedModel = DEFAULT_MODEL_MAPPING[selectedProvider][context.agentType];
      reason = `Static mapping: ${context.agentType} → ${selectedProvider}`;
    }

    // ── Step 4: Cost-based downshift ──
    const budgetResult = this.applyCostDownshift(
      tenantId,
      config,
      selectedProvider,
      selectedModel,
      contextSignals,
    );

    const result: ModelSelectionResult = {
      provider: budgetResult.provider,
      model: budgetResult.model,
      reason: budgetResult.downshifted
        ? `${reason} [DOWNSHIFTED: budget >${(config.costDownshiftThreshold ?? 0.8) * 100}% consumed]`
        : reason,
      downshiftApplied: budgetResult.downshifted,
      originalModel: budgetResult.downshifted ? selectedModel : undefined,
      originalProvider: budgetResult.downshifted ? selectedProvider : undefined,
    };

    this.emitRoutingDecision(
      tenantId,
      context,
      result,
      budgetResult.utilization,
      contextSignals,
    );

    return result;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // COST-AWARE ROUTING HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Record cost for a completed request (accumulates daily spend per tenant).
   */
  recordCost(tenantId: string, costUsd: number): void {
    const today = new Date().toISOString().slice(0, 10);
    const entry = this.dailyCostAccumulator.get(tenantId);
    if (entry && entry.date === today) {
      entry.costUsd += costUsd;
    } else {
      this.dailyCostAccumulator.set(tenantId, { date: today, costUsd });
    }
  }

  /**
   * Get current daily spend for a tenant.
   */
  getDailySpend(tenantId: string): number {
    const today = new Date().toISOString().slice(0, 10);
    const entry = this.dailyCostAccumulator.get(tenantId);
    if (entry && entry.date === today) {
      return entry.costUsd;
    }
    return 0;
  }

  /**
   * Apply cost-based downshift if budget threshold is exceeded.
   */
  private applyCostDownshift(
    tenantId: string,
    config: TenantAiConfig,
    provider: AiProvider,
    model: string,
    signals: string[],
  ): { provider: AiProvider; model: string; downshifted: boolean; utilization: number } {
    const budget = config.dailyCostBudgetUsd ?? 0;
    if (budget <= 0) {
      return { provider, model, downshifted: false, utilization: 0 };
    }

    const spent = this.getDailySpend(tenantId);
    const utilization = spent / budget;
    const threshold = config.costDownshiftThreshold ?? 0.8;

    if (utilization < threshold) {
      return { provider, model, downshifted: false, utilization };
    }

    // Budget threshold exceeded — attempt downshift
    signals.push(`cost-downshift(${Math.round(utilization * 100)}%)`);
    const key = `${provider}:${model}`;
    const downshifted = COST_DOWNSHIFT_MAP[key];

    if (downshifted && this.isProviderAllowed(downshifted.provider, config)) {
      if (utilization >= 1.0) {
        this.emit('quotaExceeded', tenantId, spent, budget);
      }
      return {
        provider: downshifted.provider,
        model: downshifted.model,
        downshifted: true,
        utilization,
      };
    }

    // Model is already cheap or downshift target not available
    return { provider, model, downshifted: false, utilization };
  }

  /**
   * Check if a provider is allowed for a tenant.
   */
  private isProviderAllowed(provider: AiProvider, config: TenantAiConfig): boolean {
    return config.allowedProviders.includes(provider);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OBSERVABILITY
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Emit structured routing decision for observability.
   */
  private emitRoutingDecision(
    tenantId: string,
    context: ModelSelectionContext,
    result: ModelSelectionResult,
    budgetUtilization: number,
    contextSignals: string[],
  ): void {
    const log: RoutingDecisionLog = {
      timestamp: new Date().toISOString(),
      tenantId,
      agentType: context.agentType,
      selectedProvider: result.provider,
      selectedModel: result.model,
      reason: result.reason,
      downshiftApplied: result.downshiftApplied,
      budgetUtilization: budgetUtilization > 0 ? budgetUtilization : undefined,
      contextSignals,
    };
    this.emit('routingDecision', log);
  }

  /**
   * Select the best provider for a request.
   *
   * @param request - The AI request
   * @returns Provider selection with provider and model
   */
  selectProvider(request: AiRequest): ProviderSelection {
    const config = this.getTenantConfig(request.tenantId);

    // Check for agent-type override
    if (config.modelOverrides?.[request.agentType]) {
      const override = config.modelOverrides[request.agentType]!;
      return {
        provider: override.provider,
        model: override.model,
        priority: 0,
      };
    }

    // Use priority order from tenant config
    const providerOrder = config.providerPriority.filter((p) =>
      config.allowedProviders.includes(p)
    );

    // Find first healthy provider
    for (let i = 0; i < providerOrder.length; i++) {
      const providerType = providerOrder[i];
      if (!providerType) continue;

      const health = this.failoverRegistry.getProviderHealth(providerType);

      if (
        !health ||
        health.state === CircuitState.CLOSED ||
        health.state === CircuitState.HALF_OPEN
      ) {
        const model = DEFAULT_MODEL_MAPPING[providerType][request.agentType];
        this.emit('providerSelected', request.tenantId, providerType, model);

        return {
          provider: providerType,
          model,
          priority: i,
        };
      }
    }

    // Fallback to mock if all others are unhealthy
    return {
      provider: 'MOCK',
      model: 'mock-model',
      priority: 99,
    };
  }

  /**
   * Get a list of fallback providers for a request.
   */
  getFallbackProviders(request: AiRequest): ProviderSelection[] {
    const config = this.getTenantConfig(request.tenantId);
    const providerOrder = config.providerPriority.filter((p) =>
      config.allowedProviders.includes(p)
    );

    return providerOrder
      .filter((providerType): providerType is AiProvider => providerType !== undefined)
      .map((providerType, index) => ({
        provider: providerType,
        model: DEFAULT_MODEL_MAPPING[providerType][request.agentType],
        priority: index,
      }));
  }

  /**
   * Invoke a provider with automatic failover.
   *
   * @param request - The AI request
   * @param prompt - The prompt to send
   * @param params - Additional generation params
   * @returns Invocation result with response and metadata
   */
  async invokeWithFailover(
    request: AiRequest,
    prompt: string,
    params?: Partial<GenerateParams>
  ): Promise<ProviderInvocationResult> {
    const startTime = Date.now();
    const fallbacks = this.getFallbackProviders(request);
    const primary = fallbacks[0];

    // Ensure we have at least one provider
    if (!primary) {
      return {
        success: false,
        provider: 'MOCK',
        model: 'mock-model',
        failoverOccurred: false,
        error: new Error('No providers configured'),
        latencyMs: Date.now() - startTime,
      };
    }

    let lastError: Error | null = null;
    let originalProvider: AiProvider | undefined;
    let failoverOccurred = false;

    for (let i = 0; i < fallbacks.length; i++) {
      const selection = fallbacks[i];
      if (!selection) continue;

      const provider = this.providers.get(selection.provider);

      if (!provider) {
        continue; // Provider not registered
      }

      // Track if this is a failover
      if (i > 0) {
        failoverOccurred = true;
        originalProvider = primary.provider;
        const prevSelection = fallbacks[i - 1];
        if (prevSelection) {
          this.emit(
            'failoverInitiated',
            request.tenantId,
            prevSelection.provider,
            selection.provider,
            lastError?.message ?? 'Previous provider failed'
          );
        }
      }

      try {
        const response = await this.invokeProvider(provider, prompt, selection.model, params);

        return {
          success: true,
          response,
          provider: selection.provider,
          model: selection.model,
          failoverOccurred,
          originalProvider,
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error as Error;
        // Continue to next provider
      }
    }

    // All providers failed
    this.emit(
      'allProvidersFailed',
      request.tenantId,
      lastError ?? new Error('All providers failed')
    );

    return {
      success: false,
      provider: primary.provider,
      model: primary.model,
      failoverOccurred,
      originalProvider,
      error: lastError ?? new Error('All providers failed'),
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Invoke a single provider.
   */
  private async invokeProvider(
    provider: LLMProvider,
    prompt: string,
    model: string,
    params?: Partial<GenerateParams>
  ): Promise<IAgentResponse<string>> {
    return provider.generateCompletion({
      prompt,
      modelName: model,
      ...params,
    });
  }

  /**
   * Calculate estimated cost for a request.
   */
  estimateCost(
    provider: AiProvider,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const key = `${provider}:${model}`;
    const rates = COST_PER_1K_TOKENS[key];

    if (!rates) {
      return 0;
    }

    const inputCost = (inputTokens / 1000) * rates.input;
    const outputCost = (outputTokens / 1000) * rates.output;

    // Return cost in cents
    return Math.round((inputCost + outputCost) * 100);
  }

  /**
   * Get health status for all providers.
   */
  getProvidersHealth(): ProviderHealth[] {
    return this.failoverRegistry.getHealthStatus();
  }

  /**
   * Manually reset a circuit breaker.
   */
  resetCircuit(provider: AiProvider): boolean {
    return this.failoverRegistry.resetCircuit(provider);
  }

  /**
   * Start health check monitoring.
   */
  startHealthChecks(): void {
    this.failoverRegistry.startHealthChecks();
  }

  /**
   * Stop health check monitoring.
   */
  stopHealthChecks(): void {
    this.failoverRegistry.stopHealthChecks();
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.failoverRegistry.destroy();
    this.removeAllListeners();
    this.tenantConfigs.clear();
    this.providers.clear();
    this.dailyCostAccumulator.clear();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SINGLETON & FACTORY
// ────────────────────────────────────────────────────────────────────────────

let globalRouter: ProviderRouter | null = null;

/**
 * Get or create the global provider router.
 */
export function getProviderRouter(): ProviderRouter {
  globalRouter ??= new ProviderRouter();
  return globalRouter;
}

/**
 * Create a new provider router instance.
 */
export function createProviderRouter(failoverRegistry?: ProviderFailoverRegistry): ProviderRouter {
  return new ProviderRouter(failoverRegistry);
}

/**
 * Reset the global router (for testing).
 */
export function resetProviderRouter(): void {
  if (globalRouter) {
    globalRouter.destroy();
    globalRouter = null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get the default model for a provider and agent type.
 */
export function getDefaultModel(provider: AiProvider, agentType: AiAgentType): string {
  return DEFAULT_MODEL_MAPPING[provider]?.[agentType] ?? 'mock-model';
}

/**
 * Get cost rates for a provider and model.
 */
export function getCostRates(
  provider: AiProvider,
  model: string
): { input: number; output: number } | null {
  const key = `${provider}:${model}`;
  return COST_PER_1K_TOKENS[key] ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────────────

export {
  DEFAULT_MODEL_MAPPING,
  DEFAULT_PROVIDER_PRIORITY,
  DEFAULT_TENANT_CONFIG,
  COST_PER_1K_TOKENS,
  EDUCATION_OPTIMAL_PROVIDER,
  COST_DOWNSHIFT_MAP,
};
