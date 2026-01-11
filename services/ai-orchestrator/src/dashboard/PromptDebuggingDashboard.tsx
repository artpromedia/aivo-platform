/**
 * Prompt Debugging Dashboard
 *
 * Real-time visibility into prompt performance, A/B tests,
 * learning patterns, and self-learning system health.
 *
 * This is a standalone React component that can be integrated
 * into any admin dashboard application.
 */

import React, { useState, useEffect, useCallback } from 'react';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface SystemHealth {
  totalActionsTracked: number;
  feedbackRate: number;
  acceptanceRate: number;
  avgUserRating: number;
  activeExperiments: number;
  patternsDetected: number;
  trainingExamplesReady: number;
  signalsProcessed24h: number;
  lastLearningCycle: string | null;
  systemStatus: 'healthy' | 'degraded' | 'unhealthy';
}

interface PromptMetrics {
  templateId: string;
  templateName: string;
  category: string;
  agentType: string | null;
  version: number;
  totalUses: number;
  successRate: number | null;
  avgRating: number | null;
  avgLatencyMs: number | null;
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  lastUsed: string | null;
}

interface ExperimentSummary {
  id: string;
  name: string;
  status: string;
  variants: {
    id: string;
    name: string;
    isControl: boolean;
    sampleSize: number;
    successRate: number;
    avgRating: number | null;
  }[];
  winner: string | null;
  statisticalSignificance: number | null;
  startedAt: string | null;
  daysRunning: number;
}

interface LearningPattern {
  id: string;
  patternType: string;
  agentType: string;
  actionType: string;
  description: string;
  confidence: number;
  supportCount: number;
  recommendations: string[];
  detectedAt: string;
  isValidated: boolean;
}

interface SignalTrend {
  timeBucket: string;
  signalType: string;
  agentType: string;
  meanValue: number;
  signalCount: number;
  trend: number | null;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ════════════════════════════════════════════════════════════════════════════════

const API_BASE = '/api/ai-orchestrator';

async function fetchHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/prompt-debugging/health`);
  if (!res.ok) throw new Error('Failed to fetch health');
  return res.json();
}

async function fetchPrompts(page = 1, limit = 10): Promise<PaginatedResponse<PromptMetrics>> {
  const res = await fetch(`${API_BASE}/prompt-debugging/prompts?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch prompts');
  return res.json();
}

async function fetchExperiments(page = 1, limit = 10): Promise<PaginatedResponse<ExperimentSummary>> {
  const res = await fetch(`${API_BASE}/prompt-debugging/experiments?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch experiments');
  return res.json();
}

async function fetchPatterns(page = 1, limit = 10): Promise<PaginatedResponse<LearningPattern>> {
  const res = await fetch(`${API_BASE}/prompt-debugging/patterns?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch patterns');
  return res.json();
}

async function fetchSignalTrends(): Promise<{ data: SignalTrend[] }> {
  const res = await fetch(`${API_BASE}/prompt-debugging/signals/trends`);
  if (!res.ok) throw new Error('Failed to fetch signal trends');
  return res.json();
}

// ════════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ════════════════════════════════════════════════════════════════════════════════

interface StatusBadgeProps {
  status: 'healthy' | 'degraded' | 'unhealthy' | string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colors: Record<string, string> = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    unhealthy: 'bg-red-100 text-red-800',
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    paused: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.toUpperCase()}
    </span>
  );
};

interface TrendIndicatorProps {
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ trend }) => {
  const indicators: Record<string, { icon: string; color: string }> = {
    improving: { icon: '^', color: 'text-green-600' },
    stable: { icon: '-', color: 'text-gray-600' },
    declining: { icon: 'v', color: 'text-red-600' },
    insufficient_data: { icon: '?', color: 'text-gray-400' },
  };

  const { icon, color } = indicators[trend] || indicators.insufficient_data;

  return <span className={`font-mono ${color}`}>{icon}</span>;
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, trend }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <span className={trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}>
            {trend === 'up' ? '^' : trend === 'down' ? 'v' : '-'}
          </span>
        )}
      </div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// TAB COMPONENTS
// ════════════════════════════════════════════════════════════════════════════════

interface HealthTabProps {
  health: SystemHealth | null;
  loading: boolean;
}

const HealthTab: React.FC<HealthTabProps> = ({ health, loading }) => {
  if (loading) return <div className="p-4">Loading...</div>;
  if (!health) return <div className="p-4">Failed to load health data</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">System Health</h2>
        <StatusBadge status={health.systemStatus} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Actions Tracked (30d)"
          value={health.totalActionsTracked.toLocaleString()}
        />
        <MetricCard
          title="Feedback Rate"
          value={`${health.feedbackRate.toFixed(1)}%`}
          trend={health.feedbackRate > 20 ? 'up' : health.feedbackRate < 10 ? 'down' : 'neutral'}
        />
        <MetricCard
          title="Acceptance Rate"
          value={`${health.acceptanceRate.toFixed(1)}%`}
          trend={health.acceptanceRate > 70 ? 'up' : health.acceptanceRate < 50 ? 'down' : 'neutral'}
        />
        <MetricCard
          title="Avg User Rating"
          value={health.avgUserRating.toFixed(2)}
          subtitle="out of 5"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Experiments" value={health.activeExperiments} />
        <MetricCard title="Patterns Detected" value={health.patternsDetected} />
        <MetricCard title="Training Examples" value={health.trainingExamplesReady} />
        <MetricCard title="Signals (24h)" value={health.signalsProcessed24h.toLocaleString()} />
      </div>

      {health.lastLearningCycle && (
        <div className="text-sm text-gray-500">
          Last learning cycle: {new Date(health.lastLearningCycle).toLocaleString()}
        </div>
      )}
    </div>
  );
};

interface PromptsTabProps {
  prompts: PromptMetrics[];
  pagination: { page: number; totalPages: number };
  loading: boolean;
  onPageChange: (page: number) => void;
}

const PromptsTab: React.FC<PromptsTabProps> = ({ prompts, pagination, loading, onPageChange }) => {
  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Prompt Performance</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Uses</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Success</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rating</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Trend</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {prompts.map((prompt) => (
              <tr key={prompt.templateId} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="font-medium">{prompt.templateName}</div>
                  <div className="text-xs text-gray-400">v{prompt.version}</div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">{prompt.category}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">{prompt.agentType || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{prompt.totalUses.toLocaleString()}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                  {prompt.successRate !== null ? `${(prompt.successRate * 100).toFixed(1)}%` : '-'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                  {prompt.avgRating !== null ? prompt.avgRating.toFixed(2) : '-'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-center">
                  <TrendIndicator trend={prompt.trend} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-500">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

interface ExperimentsTabProps {
  experiments: ExperimentSummary[];
  pagination: { page: number; totalPages: number };
  loading: boolean;
  onPageChange: (page: number) => void;
}

const ExperimentsTab: React.FC<ExperimentsTabProps> = ({ experiments, pagination, loading, onPageChange }) => {
  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">A/B Experiments</h2>

      <div className="space-y-4">
        {experiments.map((exp) => (
          <div key={exp.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium">{exp.name}</h3>
                <div className="text-sm text-gray-500">{exp.daysRunning} days running</div>
              </div>
              <StatusBadge status={exp.status} />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th className="text-left py-1">Variant</th>
                    <th className="text-right py-1">Samples</th>
                    <th className="text-right py-1">Success Rate</th>
                    <th className="text-right py-1">Avg Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {exp.variants.map((variant) => (
                    <tr
                      key={variant.id}
                      className={variant.id === exp.winner ? 'bg-green-50' : ''}
                    >
                      <td className="py-1">
                        {variant.name}
                        {variant.isControl && (
                          <span className="ml-1 text-xs text-gray-400">(control)</span>
                        )}
                        {variant.id === exp.winner && (
                          <span className="ml-1 text-xs text-green-600">(winner)</span>
                        )}
                      </td>
                      <td className="text-right py-1">{variant.sampleSize}</td>
                      <td className="text-right py-1">{(variant.successRate * 100).toFixed(1)}%</td>
                      <td className="text-right py-1">
                        {variant.avgRating !== null ? variant.avgRating.toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {exp.statisticalSignificance !== null && (
              <div className="mt-2 text-xs text-gray-500">
                Statistical significance: {(exp.statisticalSignificance * 100).toFixed(1)}%
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-500">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

interface PatternsTabProps {
  patterns: LearningPattern[];
  pagination: { page: number; totalPages: number };
  loading: boolean;
  onPageChange: (page: number) => void;
}

const PatternsTab: React.FC<PatternsTabProps> = ({ patterns, pagination, loading, onPageChange }) => {
  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Learning Patterns</h2>

      <div className="space-y-3">
        {patterns.map((pattern) => (
          <div key={pattern.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                    {pattern.patternType}
                  </span>
                  <span className="text-sm text-gray-500">
                    {pattern.agentType} / {pattern.actionType}
                  </span>
                </div>
                <p className="mt-2 text-sm">{pattern.description}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-medium">{(pattern.confidence * 100).toFixed(0)}%</div>
                <div className="text-xs text-gray-500">confidence</div>
              </div>
            </div>

            {pattern.recommendations.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs font-medium text-gray-500 mb-1">Recommendations:</div>
                <ul className="text-sm text-gray-700 list-disc list-inside">
                  {pattern.recommendations.slice(0, 3).map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
              <span>Support: {pattern.supportCount} signals</span>
              <span>Detected: {new Date(pattern.detectedAt).toLocaleDateString()}</span>
              {pattern.isValidated && <span className="text-green-600">Validated</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-500">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

interface SignalsTabProps {
  trends: SignalTrend[];
  loading: boolean;
}

const SignalsTab: React.FC<SignalsTabProps> = ({ trends, loading }) => {
  if (loading) return <div className="p-4">Loading...</div>;

  // Group by agent type
  const byAgent = trends.reduce(
    (acc, t) => {
      if (!acc[t.agentType]) acc[t.agentType] = [];
      acc[t.agentType].push(t);
      return acc;
    },
    {} as Record<string, SignalTrend[]>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Signal Trends (7 Days)</h2>

      {Object.entries(byAgent).map(([agent, agentTrends]) => (
        <div key={agent} className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-3">{agent}</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left py-2">Signal Type</th>
                  <th className="text-right py-2">Mean Value</th>
                  <th className="text-right py-2">Signal Count</th>
                  <th className="text-right py-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {agentTrends.slice(0, 10).map((t, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2">{t.signalType}</td>
                    <td className="text-right py-2">{t.meanValue.toFixed(3)}</td>
                    <td className="text-right py-2">{t.signalCount}</td>
                    <td className="text-right py-2">
                      {t.trend !== null ? (
                        <span className={t.trend > 0 ? 'text-green-600' : t.trend < 0 ? 'text-red-600' : ''}>
                          {t.trend > 0 ? '+' : ''}{t.trend.toFixed(3)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

type TabType = 'health' | 'prompts' | 'experiments' | 'patterns' | 'signals';

export const PromptDebuggingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('health');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [prompts, setPrompts] = useState<PromptMetrics[]>([]);
  const [promptsPagination, setPromptsPagination] = useState({ page: 1, totalPages: 1 });
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [experimentsPagination, setExperimentsPagination] = useState({ page: 1, totalPages: 1 });
  const [patterns, setPatterns] = useState<LearningPattern[]>([]);
  const [patternsPagination, setPatternsPagination] = useState({ page: 1, totalPages: 1 });
  const [signals, setSignals] = useState<SignalTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to load health:', err);
    }
  }, []);

  const loadPrompts = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const data = await fetchPrompts(page);
      setPrompts(data.data);
      setPromptsPagination({ page: data.pagination.page, totalPages: data.pagination.totalPages });
    } catch (err) {
      console.error('Failed to load prompts:', err);
    }
    setLoading(false);
  }, []);

  const loadExperiments = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const data = await fetchExperiments(page);
      setExperiments(data.data);
      setExperimentsPagination({ page: data.pagination.page, totalPages: data.pagination.totalPages });
    } catch (err) {
      console.error('Failed to load experiments:', err);
    }
    setLoading(false);
  }, []);

  const loadPatterns = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const data = await fetchPatterns(page);
      setPatterns(data.data);
      setPatternsPagination({ page: data.pagination.page, totalPages: data.pagination.totalPages });
    } catch (err) {
      console.error('Failed to load patterns:', err);
    }
    setLoading(false);
  }, []);

  const loadSignals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSignalTrends();
      setSignals(data.data);
    } catch (err) {
      console.error('Failed to load signals:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadHealth();
      } catch (err) {
        setError('Failed to initialize dashboard');
      }
      setLoading(false);
    };
    init();
  }, [loadHealth]);

  useEffect(() => {
    switch (activeTab) {
      case 'health':
        loadHealth();
        break;
      case 'prompts':
        loadPrompts(1);
        break;
      case 'experiments':
        loadExperiments(1);
        break;
      case 'patterns':
        loadPatterns(1);
        break;
      case 'signals':
        loadSignals();
        break;
    }
  }, [activeTab, loadHealth, loadPrompts, loadExperiments, loadPatterns, loadSignals]);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'health', label: 'System Health' },
    { id: 'prompts', label: 'Prompts' },
    { id: 'experiments', label: 'Experiments' },
    { id: 'patterns', label: 'Patterns' },
    { id: 'signals', label: 'Signals' },
  ];

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-800 rounded-lg">
        <h2 className="font-bold mb-2">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Prompt Debugging Dashboard</h1>
          <p className="text-gray-500">Real-time visibility into AI self-learning system</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-50 rounded-lg p-6">
          {activeTab === 'health' && <HealthTab health={health} loading={loading} />}
          {activeTab === 'prompts' && (
            <PromptsTab
              prompts={prompts}
              pagination={promptsPagination}
              loading={loading}
              onPageChange={(page) => loadPrompts(page)}
            />
          )}
          {activeTab === 'experiments' && (
            <ExperimentsTab
              experiments={experiments}
              pagination={experimentsPagination}
              loading={loading}
              onPageChange={(page) => loadExperiments(page)}
            />
          )}
          {activeTab === 'patterns' && (
            <PatternsTab
              patterns={patterns}
              pagination={patternsPagination}
              loading={loading}
              onPageChange={(page) => loadPatterns(page)}
            />
          )}
          {activeTab === 'signals' && <SignalsTab trends={signals} loading={loading} />}
        </div>
      </div>
    </div>
  );
};

export default PromptDebuggingDashboard;
