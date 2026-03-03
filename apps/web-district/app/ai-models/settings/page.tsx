'use client';

import { Card } from '@aivo/ui-web';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../providers';

// ============================================================================
// Types
// ============================================================================

interface FeatureFlags {
  aiTutoring: boolean;
  baselineAssessment: boolean;
  focusAssistant: boolean;
  writingAssistant: boolean;
}

type SafetyLevel = 'STRICT' | 'STANDARD' | 'RELAXED';

interface SafetyConfig {
  featureFlags: FeatureFlags;
  safetyLevel: SafetyLevel;
}

interface UsageStat {
  schoolName: string;
  sessions7d: number;
  avgDurationMin: number;
  mostUsedFeature: string;
  flaggedInteractions: number;
}

interface Violation {
  id: string;
  date: string;
  studentLabel: string;
  feature: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============================================================================
// Constants
// ============================================================================

const API = '/api/ai/safety';

const DEFAULT_FLAGS: FeatureFlags = {
  aiTutoring: true,
  baselineAssessment: true,
  focusAssistant: true,
  writingAssistant: false,
};

const DEFAULT_CONFIG: SafetyConfig = {
  featureFlags: DEFAULT_FLAGS,
  safetyLevel: 'STANDARD',
};

const SAFETY_LEVELS: { value: SafetyLevel; label: string; description: string }[] = [
  {
    value: 'STRICT',
    label: 'Strict',
    description: 'Maximum content filtering. Blocks borderline content. Best for K-5 settings.',
  },
  {
    value: 'STANDARD',
    label: 'Standard',
    description:
      'Balanced filtering suitable for most districts. Blocks clearly harmful content.',
  },
  {
    value: 'RELAXED',
    label: 'Relaxed',
    description:
      'Lighter filtering for mature student populations. Still blocks overtly harmful content.',
  },
];

const FEATURE_LABELS: Record<keyof FeatureFlags, { name: string; description: string }> = {
  aiTutoring: {
    name: 'AI Tutoring',
    description: 'Socratic tutoring powered by Claude Opus 4.6 for guided discovery and reasoning.',
  },
  baselineAssessment: {
    name: 'Baseline Assessment',
    description:
      'AI-assisted analysis of learner responses to determine starting skill levels.',
  },
  focusAssistant: {
    name: 'Focus Assistant',
    description:
      'Real-time engagement monitoring and focus optimization using Gemini Flash.',
  },
  writingAssistant: {
    name: 'Writing Assistant',
    description:
      'AI-powered writing feedback including grammar, structure, and style suggestions.',
  },
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  HIGH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_USAGE: UsageStat[] = [
  {
    schoolName: 'Lincoln Elementary',
    sessions7d: 482,
    avgDurationMin: 12.3,
    mostUsedFeature: 'AI Tutoring',
    flaggedInteractions: 2,
  },
  {
    schoolName: 'Washington Middle School',
    sessions7d: 1024,
    avgDurationMin: 18.7,
    mostUsedFeature: 'Writing Assistant',
    flaggedInteractions: 5,
  },
  {
    schoolName: 'Jefferson High',
    sessions7d: 763,
    avgDurationMin: 22.1,
    mostUsedFeature: 'AI Tutoring',
    flaggedInteractions: 1,
  },
];

const MOCK_VIOLATIONS: Violation[] = [
  {
    id: '1',
    date: '2026-02-18T14:32:00Z',
    studentLabel: 'Student #4821',
    feature: 'AI Tutoring',
    reason: 'Attempted prompt injection to bypass safety filter',
    severity: 'HIGH',
  },
  {
    id: '2',
    date: '2026-02-17T09:15:00Z',
    studentLabel: 'Student #3192',
    feature: 'Writing Assistant',
    reason: 'Content flagged for age-inappropriate topic request',
    severity: 'MEDIUM',
  },
  {
    id: '3',
    date: '2026-02-16T16:45:00Z',
    studentLabel: 'Student #5534',
    feature: 'AI Tutoring',
    reason: 'Repeated attempts to access restricted topic area',
    severity: 'MEDIUM',
  },
  {
    id: '4',
    date: '2026-02-15T11:20:00Z',
    studentLabel: 'Student #2087',
    feature: 'Focus Assistant',
    reason: 'Unusual input pattern detected and blocked',
    severity: 'LOW',
  },
];

// ============================================================================
// Sub-Components
// ============================================================================

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        onChange(!checked);
      }}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full
          bg-white shadow ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

function FeatureTogglesSection({
  flags,
  saving,
  onToggle,
}: {
  flags: FeatureFlags;
  saving: boolean;
  onToggle: (key: keyof FeatureFlags) => void;
}) {
  return (
    <Card>
      <div className="p-5">
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <span className="text-xl">⚡</span>
          Feature Controls
        </h2>
        <p className="text-sm text-muted mt-1">
          Enable or disable AI features across your district. Changes take effect immediately.
        </p>

        <div className="mt-5 divide-y divide-border">
          {(Object.keys(FEATURE_LABELS) as (keyof FeatureFlags)[]).map((key) => {
            const feat = FEATURE_LABELS[key];
            return (
              <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="pr-4">
                  <h3 className="text-sm font-medium text-text">{feat.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{feat.description}</p>
                </div>
                <Toggle checked={flags[key]} onChange={() => { onToggle(key); }} disabled={saving} />
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function SafetyThresholdSection({
  level,
  saving,
  onChange,
}: {
  level: SafetyLevel;
  saving: boolean;
  onChange: (level: SafetyLevel) => void;
}) {
  return (
    <Card>
      <div className="p-5">
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          Safety Threshold
        </h2>
        <p className="text-sm text-muted mt-1">
          Set the content safety filtering level for all AI interactions in your district.
        </p>

        <div className="mt-5 space-y-3">
          {SAFETY_LEVELS.map((sl) => (
            <label
              key={sl.value}
              className={`
                flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors
                ${
                  level === sl.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }
                ${saving ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              <input
                type="radio"
                name="safetyLevel"
                value={sl.value}
                checked={level === sl.value}
                onChange={() => { onChange(sl.value); }}
                disabled={saving}
                className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-text">{sl.label}</span>
                <p className="text-xs text-muted mt-0.5">{sl.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </Card>
  );
}

function UsageStatsSection({
  stats,
  loading,
}: {
  stats: UsageStat[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <div className="p-5">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <span className="text-xl">📊</span>
            Usage Statistics
          </h2>
          <div className="mt-4 flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <span className="ml-3 text-sm text-muted">Loading usage data…</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-5">
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <span className="text-xl">📊</span>
          Usage Statistics
          <span className="text-xs font-normal text-muted">(last 7 days)</span>
        </h2>

        {stats.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No usage data available yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted">School</th>
                  <th className="pb-2 font-medium text-muted text-right">Sessions</th>
                  <th className="pb-2 font-medium text-muted text-right">Avg Duration</th>
                  <th className="pb-2 font-medium text-muted">Top Feature</th>
                  <th className="pb-2 font-medium text-muted text-right">Flagged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.map((s) => (
                  <tr key={s.schoolName}>
                    <td className="py-2.5 text-text">{s.schoolName}</td>
                    <td className="py-2.5 text-right text-text">{s.sessions7d.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-text">{s.avgDurationMin.toFixed(1)} min</td>
                    <td className="py-2.5 text-muted">{s.mostUsedFeature}</td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.flaggedInteractions > 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        }`}
                      >
                        {s.flaggedInteractions}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

function ViolationsSection({
  violations,
  loading,
}: {
  violations: Violation[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <div className="p-5">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <span className="text-xl">🚫</span>
            Blocked Content Log
          </h2>
          <div className="mt-4 flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <span className="ml-3 text-sm text-muted">Loading violation log…</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-5">
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <span className="text-xl">🚫</span>
          Blocked Content Log
          <span className="text-xs font-normal text-muted">(recent)</span>
        </h2>

        {violations.length === 0 ? (
          <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-800 dark:text-green-200">
            No blocked interactions recorded. All AI interactions are operating within safety
            parameters.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted">Date</th>
                  <th className="pb-2 font-medium text-muted">Student</th>
                  <th className="pb-2 font-medium text-muted">Feature</th>
                  <th className="pb-2 font-medium text-muted">Reason</th>
                  <th className="pb-2 font-medium text-muted">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {violations.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2.5 text-muted whitespace-nowrap">
                      {new Date(v.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-2.5 text-text">{v.studentLabel}</td>
                    <td className="py-2.5 text-muted">{v.feature}</td>
                    <td className="py-2.5 text-text max-w-xs truncate">{v.reason}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[v.severity] ?? ''}`}
                      >
                        {v.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default function AISettingsPage() {
  const { accessToken } = useAuth();

  // State
  const [config, setConfig] = useState<SafetyConfig>(DEFAULT_CONFIG);
  const [usage, setUsage] = useState<UsageStat[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [loadingViolations, setLoadingViolations] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Helpers
  const buildHeaders = useCallback(
    (): Record<string, string> => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  // Fetch safety config
  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`${API}?type=config`, { headers: buildHeaders() });
      if (res.ok) {
        const data = (await res.json()) as SafetyConfig;
        setConfig(data);
      }
    } catch {
      // Fallback to defaults
    } finally {
      setLoadingConfig(false);
    }
  }, [buildHeaders]);

  // Fetch usage stats
  const fetchUsage = useCallback(async () => {
    setLoadingUsage(true);
    try {
      const res = await fetch(`${API}?type=usage`, { headers: buildHeaders() });
      if (res.ok) {
        const data = (await res.json()) as UsageStat[];
        setUsage(data);
        return;
      }
    } catch {
      // fallthrough
    }
    // Fallback to mock data
    setUsage(MOCK_USAGE);
    setLoadingUsage(false);
  }, [buildHeaders]);

  // Fetch violations
  const fetchViolations = useCallback(async () => {
    setLoadingViolations(true);
    try {
      const res = await fetch(`${API}?type=violations`, { headers: buildHeaders() });
      if (res.ok) {
        const data = (await res.json()) as Violation[];
        setViolations(data);
        return;
      }
    } catch {
      // fallthrough
    }
    // Fallback to mock data
    setViolations(MOCK_VIOLATIONS);
    setLoadingViolations(false);
  }, [buildHeaders]);

  // Save config
  const saveConfig = useCallback(
    async (newConfig: SafetyConfig) => {
      setSaving(true);
      setSaveMessage(null);
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify(newConfig),
        });
        if (res.ok) {
          setSaveMessage({ type: 'success', text: 'Settings saved successfully.' });
        } else {
          setSaveMessage({ type: 'error', text: 'Failed to save settings. Using local state.' });
        }
      } catch {
        setSaveMessage({ type: 'error', text: 'Failed to save settings. Using local state.' });
      } finally {
        setSaving(false);
        setTimeout(() => { setSaveMessage(null); }, 4000);
      }
    },
    [buildHeaders],
  );

  // Toggle a feature flag
  const handleToggle = useCallback(
    (key: keyof FeatureFlags) => {
      const updated: SafetyConfig = {
        ...config,
        featureFlags: {
          ...config.featureFlags,
          [key]: !config.featureFlags[key],
        },
      };
      setConfig(updated);
      void saveConfig(updated);
    },
    [config, saveConfig],
  );

  // Change safety level
  const handleSafetyChange = useCallback(
    (level: SafetyLevel) => {
      const updated: SafetyConfig = { ...config, safetyLevel: level };
      setConfig(updated);
      void saveConfig(updated);
    },
    [config, saveConfig],
  );

  // Load on mount
  useEffect(() => {
    void fetchConfig();
    void fetchUsage();
    void fetchViolations();
  }, [fetchConfig, fetchUsage, fetchViolations]);

  // ---

  if (loadingConfig) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <span className="ml-3 text-muted">Loading AI settings…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      {/* Save feedback banner */}
      {saveMessage && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Feature Toggles */}
      <FeatureTogglesSection flags={config.featureFlags} saving={saving} onToggle={handleToggle} />

      {/* Safety Threshold */}
      <SafetyThresholdSection level={config.safetyLevel} saving={saving} onChange={handleSafetyChange} />

      {/* Usage Statistics */}
      <UsageStatsSection stats={usage} loading={loadingUsage} />

      {/* Blocked Content Log */}
      <ViolationsSection violations={violations} loading={loadingViolations} />
    </div>
  );
}

// ============================================================================
// Page Header
// ============================================================================

function PageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/ai-models"
            className="text-sm text-muted hover:text-text transition-colors"
          >
            ← AI Overview
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-text">AI Safety &amp; Feature Controls</h1>
        <p className="text-muted mt-1">
          Manage AI feature availability and content safety filtering for your district.
        </p>
      </div>
    </div>
  );
}
