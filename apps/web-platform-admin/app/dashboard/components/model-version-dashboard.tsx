/**
 * Model Version Dashboard Widget
 *
 * Shows active models per provider, current spend by model,
 * model health status, and one-click rollback capability.
 */

'use client';

import * as React from 'react';

import { useHasWriteAccess } from '../../providers';

// ── Types ────────────────────────────────────────────────────────────────────

type ModelHealth = 'healthy' | 'degraded' | 'down';

interface ModelVersion {
  id: string;
  name: string;
  provider: 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'MISTRAL';
  model: string;
  version: string;
  stage: 'production' | 'shadow' | 'staging' | 'retired';
  health: ModelHealth;
  latencyP50Ms: number;
  latencyP99Ms: number;
  errorRate: number;
  requestsToday: number;
  spendToday: number;
  spendMtd: number;
  lastDeployed: string;
  previousVersion: string | null;
}

// ── Cost table (March 2026 pricing, per 1K tokens) ──────────────────────────

const COST_PER_1K: Record<string, { input: number; output: number }> = {
  'gpt-5.2-pro': { input: 0.005, output: 0.015 },
  'gpt-5.2-instant': { input: 0.0003, output: 0.001 },
  'gpt-5.2-thinking': { input: 0.01, output: 0.03 },
  'gpt-5.3-codex': { input: 0.006, output: 0.018 },
  'claude-opus-4-6-20260201': { input: 0.015, output: 0.075 },
  'claude-sonnet-4-6-20260201': { input: 0.003, output: 0.015 },
  'gemini-3.1-pro': { input: 0.00125, output: 0.005 },
  'gemini-3.1-flash': { input: 0.000075, output: 0.0003 },
  'mistral-large-2': { input: 0.002, output: 0.006 },
};

// ── Mock data ───────────────────────────────────────────────────────────────

const MOCK_MODELS: ModelVersion[] = [
  {
    id: 'mv-1',
    name: 'Aivo AI Tutor',
    provider: 'ANTHROPIC',
    model: 'claude-opus-4-6-20260201',
    version: '3.0.1',
    stage: 'production',
    health: 'healthy',
    latencyP50Ms: 420,
    latencyP99Ms: 1800,
    errorRate: 0.12,
    requestsToday: 48_230,
    spendToday: 127.45,
    spendMtd: 2_841.3,
    lastDeployed: '2026-02-20T14:30:00Z',
    previousVersion: '3.0.0',
  },
  {
    id: 'mv-2',
    name: 'Aivo Baseline Assessment',
    provider: 'ANTHROPIC',
    model: 'claude-sonnet-4-6-20260201',
    version: '2.1.0',
    stage: 'production',
    health: 'healthy',
    latencyP50Ms: 310,
    latencyP99Ms: 1200,
    errorRate: 0.08,
    requestsToday: 12_450,
    spendToday: 18.72,
    spendMtd: 423.6,
    lastDeployed: '2026-02-18T10:00:00Z',
    previousVersion: '2.0.3',
  },
  {
    id: 'mv-3',
    name: 'Aivo Focus Assistant',
    provider: 'GEMINI',
    model: 'gemini-3.1-flash',
    version: '2.0.0',
    stage: 'production',
    health: 'healthy',
    latencyP50Ms: 85,
    latencyP99Ms: 340,
    errorRate: 0.03,
    requestsToday: 95_100,
    spendToday: 4.28,
    spendMtd: 98.4,
    lastDeployed: '2026-02-15T09:00:00Z',
    previousVersion: '1.2.1',
  },
  {
    id: 'mv-4',
    name: 'Code Review Agent',
    provider: 'OPENAI',
    model: 'gpt-5.3-codex',
    version: '1.0.0',
    stage: 'shadow',
    health: 'healthy',
    latencyP50Ms: 580,
    latencyP99Ms: 2400,
    errorRate: 0.22,
    requestsToday: 3_200,
    spendToday: 8.64,
    spendMtd: 64.8,
    lastDeployed: '2026-02-25T16:45:00Z',
    previousVersion: null,
  },
  {
    id: 'mv-5',
    name: 'IEP Goal Writer',
    provider: 'OPENAI',
    model: 'gpt-5.2-pro',
    version: '1.2.0',
    stage: 'production',
    health: 'degraded',
    latencyP50Ms: 1200,
    latencyP99Ms: 4500,
    errorRate: 2.1,
    requestsToday: 5_600,
    spendToday: 22.4,
    spendMtd: 312.0,
    lastDeployed: '2026-02-22T11:00:00Z',
    previousVersion: '1.1.3',
  },
];

// ── Provider colors ─────────────────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  OPENAI: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  ANTHROPIC: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200' },
  GEMINI: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200' },
  MISTRAL: { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200' },
};

const HEALTH_CONFIG: Record<ModelHealth, { icon: string; color: string; label: string }> = {
  healthy: { icon: '●', color: 'text-green-500', label: 'Healthy' },
  degraded: { icon: '●', color: 'text-amber-500', label: 'Degraded' },
  down: { icon: '●', color: 'text-red-500', label: 'Down' },
};

const STAGE_BADGES: Record<string, string> = {
  production: 'bg-green-100 text-green-700',
  shadow: 'bg-purple-100 text-purple-700',
  staging: 'bg-blue-100 text-blue-700',
  retired: 'bg-gray-100 text-gray-500',
};

// ── Component ───────────────────────────────────────────────────────────────

export function ModelVersionDashboard() {
  const canWrite = useHasWriteAccess();
  const [models] = React.useState<ModelVersion[]>(MOCK_MODELS);
  const [rollbackTarget, setRollbackTarget] = React.useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = React.useState(false);

  // ── Derived metrics ───────────────────────────────────────────────────
  const productionModels = models.filter((m) => m.stage === 'production');
  const shadowModels = models.filter((m) => m.stage === 'shadow');

  const totalSpendMtd = models
    .filter((m) => m.stage === 'production' || m.stage === 'shadow')
    .reduce((sum, m) => sum + m.spendMtd, 0);

  const totalSpendToday = models
    .filter((m) => m.stage === 'production' || m.stage === 'shadow')
    .reduce((sum, m) => sum + m.spendToday, 0);

  const totalRequestsToday = models
    .filter((m) => m.stage === 'production' || m.stage === 'shadow')
    .reduce((sum, m) => sum + m.requestsToday, 0);

  const providerBreakdown = React.useMemo(() => {
    const grouped: Record<string, { count: number; spend: number }> = {};
    for (const m of productionModels) {
      if (!grouped[m.provider]) grouped[m.provider] = { count: 0, spend: 0 };
      grouped[m.provider].count += 1;
      grouped[m.provider].spend += m.spendMtd;
    }
    return grouped;
  }, [productionModels]);

  const degradedCount = models.filter(
    (m) => m.health !== 'healthy' && (m.stage === 'production' || m.stage === 'shadow')
  ).length;

  // ── Rollback handler ──────────────────────────────────────────────────
  const handleRollback = React.useCallback(async (modelId: string) => {
    setIsRollingBack(true);
    setRollbackTarget(modelId);
    try {
      // In production, this would call: POST /api/models/{modelId}/rollback
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log(`Rolled back model ${modelId}`);
    } finally {
      setIsRollingBack(false);
      setRollbackTarget(null);
    }
  }, []);

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white"
      data-testid="model-version-dashboard"
    >
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-xl text-white">
            🔄
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Model Versions</h2>
            <p className="text-sm text-gray-500">Active deployments, spend tracking &amp; health</p>
          </div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-4 gap-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50/30 p-4">
        <SummaryMetric
          icon="🚀"
          value={productionModels.length.toString()}
          label="Production"
          color="green"
        />
        <SummaryMetric
          icon="👻"
          value={shadowModels.length.toString()}
          label="Shadow"
          color="purple"
        />
        <SummaryMetric
          icon="💰"
          value={`$${totalSpendMtd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          label="MTD Spend"
          color="blue"
        />
        <SummaryMetric
          icon={degradedCount > 0 ? '⚠️' : '✅'}
          value={
            degradedCount > 0
              ? `${degradedCount} issue${degradedCount > 1 ? 's' : ''}`
              : 'All healthy'
          }
          label="Health"
          color={degradedCount > 0 ? 'amber' : 'green'}
        />
      </div>

      {/* Provider Breakdown */}
      <div className="border-b border-gray-200 p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-700">Active Models by Provider</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(providerBreakdown).map(([provider, data]) => {
            const colors = PROVIDER_COLORS[provider] ?? PROVIDER_COLORS.OPENAI;
            return (
              <div
                key={provider}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ring-1 ${colors.bg} ${colors.ring}`}
              >
                <div>
                  <span className={`text-sm font-semibold ${colors.text}`}>{provider}</span>
                  <p className="text-xs text-gray-500">
                    {data.count} model{data.count !== 1 ? 's' : ''} · ${data.spend.toFixed(0)} MTD
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Model Cards */}
      <div className="divide-y divide-gray-100">
        {models
          .filter((m) => m.stage === 'production' || m.stage === 'shadow')
          .sort((a, b) => b.spendMtd - a.spendMtd)
          .map((model) => (
            <ModelRow
              key={model.id}
              model={model}
              canRollback={canWrite && model.previousVersion !== null}
              isRollingBack={isRollingBack && rollbackTarget === model.id}
              onRollback={() => handleRollback(model.id)}
            />
          ))}
      </div>

      {/* Spend by Model Chart (simplified) */}
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-700">Today&apos;s Spend Breakdown</h3>
        <div className="space-y-2">
          {models
            .filter((m) => m.stage === 'production' || m.stage === 'shadow')
            .sort((a, b) => b.spendToday - a.spendToday)
            .map((model) => {
              const pct = totalSpendToday > 0 ? (model.spendToday / totalSpendToday) * 100 : 0;
              const pricing = COST_PER_1K[model.model];
              return (
                <div key={model.id} className="flex items-center gap-3">
                  <span className="w-36 truncate text-sm text-gray-700">{model.name}</span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-20 text-right text-sm font-medium text-gray-900">
                    ${model.spendToday.toFixed(2)}
                  </span>
                  {pricing && (
                    <span className="w-32 text-right text-xs text-gray-400">
                      ${pricing.input}/{pricing.output} per 1K
                    </span>
                  )}
                </div>
              );
            })}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
          <span className="text-sm font-medium text-gray-700">Total today</span>
          <span className="text-sm font-semibold text-gray-900">${totalSpendToday.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Total requests</span>
          <span className="text-sm text-gray-700">{totalRequestsToday.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SummaryMetric({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  color: 'green' | 'blue' | 'purple' | 'amber';
}) {
  const colorClasses: Record<string, string> = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    amber: 'text-amber-600',
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className={`text-xl font-bold ${colorClasses[color]}`}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function ModelRow({
  model,
  canRollback,
  isRollingBack,
  onRollback,
}: {
  model: ModelVersion;
  canRollback: boolean;
  isRollingBack: boolean;
  onRollback: () => void;
}) {
  const healthCfg = HEALTH_CONFIG[model.health];
  const stageBadge = STAGE_BADGES[model.stage];
  const providerColors = PROVIDER_COLORS[model.provider] ?? PROVIDER_COLORS.OPENAI;

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
      {/* Health indicator + Name */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={`text-lg ${healthCfg.color}`} title={healthCfg.label}>
          {healthCfg.icon}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate font-medium text-gray-900">{model.name}</h4>
            <span className="text-xs text-gray-400">v{model.version}</span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${stageBadge}`}
            >
              {model.stage}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`rounded px-1.5 py-0.5 ${providerColors.bg} ${providerColors.text}`}>
              {model.provider}
            </span>
            <span>{model.model}</span>
            <span>·</span>
            <span>p50: {model.latencyP50Ms}ms</span>
            <span>·</span>
            <span>p99: {model.latencyP99Ms}ms</span>
            <span>·</span>
            <span className={model.errorRate > 1 ? 'text-red-600 font-medium' : ''}>
              err: {model.errorRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Spend */}
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">${model.spendToday.toFixed(2)}</p>
        <p className="text-xs text-gray-500">${model.spendMtd.toFixed(0)} MTD</p>
      </div>

      {/* Requests */}
      <div className="w-20 text-right">
        <p className="text-sm font-medium text-gray-700">
          {(model.requestsToday / 1000).toFixed(1)}K
        </p>
        <p className="text-xs text-gray-500">today</p>
      </div>

      {/* Rollback */}
      <div className="w-24">
        {canRollback ? (
          <button
            onClick={onRollback}
            disabled={isRollingBack}
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600
              hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            title={`Rollback to v${model.previousVersion}`}
          >
            {isRollingBack ? 'Rolling…' : `↩ v${model.previousVersion}`}
          </button>
        ) : (
          <span className="block text-center text-xs text-gray-400">—</span>
        )}
      </div>
    </div>
  );
}

export default ModelVersionDashboard;
