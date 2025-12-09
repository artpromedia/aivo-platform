'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';

import type {
  EffectivePolicy,
  Policy,
  PolicyDocument,
  SafetyPolicy,
  AiPolicy,
  RetentionPolicy,
} from '../lib/types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface PolicyTabProps {
  tenantId: string;
  effectivePolicy: EffectivePolicy | null;
  tenantOverride: PolicyDocument | null;
}

type PolicySection = 'safety' | 'ai' | 'retention';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const SECTION_LABELS: Record<PolicySection, string> = {
  safety: 'Safety & Moderation',
  ai: 'AI Model Access',
  retention: 'Data Retention',
};

const DEFAULT_SAFETY_POLICY: SafetyPolicy = {
  severity_thresholds: {
    low_max_per_session: 5,
    medium_escalates_immediately: false,
    high_blocks_response: true,
  },
  blocked_categories: [],
  require_human_review_above: 'MEDIUM',
};

const DEFAULT_AI_POLICY: AiPolicy = {
  allowed_providers: ['openai', 'anthropic'],
  allowed_models: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet'],
  max_tokens_per_request: 4096,
  max_requests_per_minute: 100,
  latency_budget_ms: 30000,
  cost_limit_cents_per_day: 50000,
};

const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  ai_call_logs_days: 90,
  session_events_days: 365,
  homework_uploads_days: 730,
  consent_logs_days: 2555,
  ai_incidents_days: 365,
  dsr_exports_days: 90,
  prefer_soft_delete: false,
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function PolicyTab({ tenantId, effectivePolicy, tenantOverride }: PolicyTabProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<PolicySection>('safety');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPolicy, setEditedPolicy] = useState<Partial<Policy>>({});
  const [error, setError] = useState<string | null>(null);

  // Initialize edited policy from existing override
  useEffect(() => {
    if (tenantOverride) {
      setEditedPolicy(tenantOverride.policyJson);
    }
  }, [tenantOverride]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/policies/tenant/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyJson: editedPolicy }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to save policy');
      }

      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save policy');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to remove the tenant policy override? This will revert to global defaults.'
      )
    ) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/policies/tenant/${tenantId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete policy');
      }

      setEditedPolicy({});
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete policy');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedPolicy(tenantOverride?.policyJson ?? {});
    setIsEditing(false);
    setError(null);
  };

  const updateSection = useCallback(
    <T extends keyof Policy>(section: T, value: Partial<Policy[T]>) => {
      setEditedPolicy((prev) => ({
        ...prev,
        [section]: {
          ...((prev[section] as object) ?? {}),
          ...value,
        },
      }));
    },
    []
  );

  const getEffectiveValue = <T extends keyof Policy>(section: T): Policy[T] => {
    if (effectivePolicy) {
      return effectivePolicy[section];
    }
    // Fallback to defaults
    switch (section) {
      case 'safety':
        return DEFAULT_SAFETY_POLICY as Policy[T];
      case 'ai':
        return DEFAULT_AI_POLICY as Policy[T];
      case 'retention':
        return DEFAULT_RETENTION_POLICY as Policy[T];
      default:
        throw new Error(`Unknown section: ${section}`);
    }
  };

  const hasOverride = (section: PolicySection): boolean => {
    return (
      editedPolicy[section] !== undefined && Object.keys(editedPolicy[section] ?? {}).length > 0
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Policy Configuration</h2>
          <p className="text-sm text-slate-600">
            {tenantOverride
              ? 'This tenant has custom policy overrides.'
              : 'Using global defaults. Create an override to customize.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              {tenantOverride && (
                <button
                  onClick={handleDelete}
                  className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200"
                >
                  Remove Override
                </button>
              )}
              <button
                onClick={() => {
                  setIsEditing(true);
                }}
                className="rounded-md bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200"
              >
                {tenantOverride ? 'Edit Override' : 'Create Override'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Section Tabs */}
      <div className="flex gap-2">
        {(Object.entries(SECTION_LABELS) as [PolicySection, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              setActiveSection(id);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              activeSection === id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            } ${hasOverride(id) ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
          >
            {label}
            {hasOverride(id) && <span className="ml-1 text-xs">•</span>}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {activeSection === 'safety' && (
          <SafetySection
            effective={getEffectiveValue('safety')}
            override={editedPolicy.safety}
            isEditing={isEditing}
            onUpdate={(value) => {
              updateSection('safety', value);
            }}
          />
        )}
        {activeSection === 'ai' && (
          <AiSection
            effective={getEffectiveValue('ai')}
            override={editedPolicy.ai}
            isEditing={isEditing}
            onUpdate={(value) => {
              updateSection('ai', value);
            }}
          />
        )}
        {activeSection === 'retention' && (
          <RetentionSection
            effective={getEffectiveValue('retention')}
            override={editedPolicy.retention}
            isEditing={isEditing}
            onUpdate={(value) => {
              updateSection('retention', value);
            }}
          />
        )}
      </div>

      {/* Policy Info */}
      <div className="rounded-lg border bg-slate-50 p-4">
        <h3 className="text-sm font-medium text-slate-700">How Policy Inheritance Works</h3>
        <p className="mt-1 text-sm text-slate-600">
          Policies are merged using deep merge. Global policy values are used as defaults. Tenant
          overrides replace specific fields while keeping others from the global policy. Arrays are
          replaced entirely (not merged).
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

interface SectionProps<T> {
  effective: T;
  override?: Partial<T>;
  isEditing: boolean;
  onUpdate: (value: Partial<T>) => void;
}

function SafetySection({ effective, override, isEditing, onUpdate }: SectionProps<SafetyPolicy>) {
  const displayValue = (field: keyof SafetyPolicy) => override?.[field] ?? effective[field];

  return (
    <div className="space-y-4">
      <h3 className="text-md font-semibold">Safety & Moderation Settings</h3>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Severity Thresholds */}
        <div className="space-y-3 rounded-md border p-4">
          <h4 className="text-sm font-medium">Severity Thresholds</h4>

          <FieldRow
            label="Low severity max per session"
            value={String(effective.severity_thresholds.low_max_per_session)}
            override={override?.severity_thresholds?.low_max_per_session?.toString()}
            isEditing={isEditing}
            inputType="number"
            onChange={(val) => {
              onUpdate({
                severity_thresholds: {
                  ...effective.severity_thresholds,
                  ...override?.severity_thresholds,
                  low_max_per_session: parseInt(val, 10),
                },
              });
            }}
          />

          <FieldRow
            label="Medium escalates immediately"
            value={effective.severity_thresholds.medium_escalates_immediately ? 'Yes' : 'No'}
            override={
              override?.severity_thresholds?.medium_escalates_immediately !== undefined
                ? override.severity_thresholds.medium_escalates_immediately
                  ? 'Yes'
                  : 'No'
                : undefined
            }
            isEditing={isEditing}
            inputType="toggle"
            onChange={(val) => {
              onUpdate({
                severity_thresholds: {
                  ...effective.severity_thresholds,
                  ...override?.severity_thresholds,
                  medium_escalates_immediately: val === 'true',
                },
              });
            }}
          />

          <FieldRow
            label="High blocks response"
            value={effective.severity_thresholds.high_blocks_response ? 'Yes' : 'No'}
            override={
              override?.severity_thresholds?.high_blocks_response !== undefined
                ? override.severity_thresholds.high_blocks_response
                  ? 'Yes'
                  : 'No'
                : undefined
            }
            isEditing={isEditing}
            inputType="toggle"
            onChange={(val) => {
              onUpdate({
                severity_thresholds: {
                  ...effective.severity_thresholds,
                  ...override?.severity_thresholds,
                  high_blocks_response: val === 'true',
                },
              });
            }}
          />
        </div>

        {/* Review & Categories */}
        <div className="space-y-3 rounded-md border p-4">
          <h4 className="text-sm font-medium">Review & Blocked Categories</h4>

          <FieldRow
            label="Require human review above"
            value={effective.require_human_review_above}
            override={override?.require_human_review_above}
            isEditing={isEditing}
            inputType="select"
            options={['LOW', 'MEDIUM', 'HIGH']}
            onChange={(val) => {
              onUpdate({ require_human_review_above: val as 'LOW' | 'MEDIUM' | 'HIGH' });
            }}
          />

          <FieldRow
            label="Blocked categories"
            value={
              effective.blocked_categories.length > 0
                ? effective.blocked_categories.join(', ')
                : 'None'
            }
            override={
              override?.blocked_categories ? override.blocked_categories.join(', ') : undefined
            }
            isEditing={isEditing}
            inputType="text"
            placeholder="Comma-separated list"
            onChange={(val) => {
              onUpdate({
                blocked_categories: val
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

function AiSection({ effective, override, isEditing, onUpdate }: SectionProps<AiPolicy>) {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-semibold">AI Model Access Settings</h3>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Providers & Models */}
        <div className="space-y-3 rounded-md border p-4">
          <h4 className="text-sm font-medium">Allowed Providers & Models</h4>

          <FieldRow
            label="Allowed providers"
            value={effective.allowed_providers.join(', ')}
            override={override?.allowed_providers?.join(', ')}
            isEditing={isEditing}
            inputType="text"
            placeholder="openai, anthropic, google"
            onChange={(val) => {
              onUpdate({
                allowed_providers: val
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
            }}
          />

          <FieldRow
            label="Allowed models"
            value={effective.allowed_models.join(', ')}
            override={override?.allowed_models?.join(', ')}
            isEditing={isEditing}
            inputType="text"
            placeholder="gpt-4o, claude-3-5-sonnet"
            onChange={(val) => {
              onUpdate({
                allowed_models: val
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
            }}
          />
        </div>

        {/* Limits */}
        <div className="space-y-3 rounded-md border p-4">
          <h4 className="text-sm font-medium">Usage Limits</h4>

          <FieldRow
            label="Max tokens per request"
            value={effective.max_tokens_per_request.toLocaleString()}
            override={override?.max_tokens_per_request?.toLocaleString()}
            isEditing={isEditing}
            inputType="number"
            onChange={(val) => {
              onUpdate({ max_tokens_per_request: parseInt(val, 10) });
            }}
          />

          <FieldRow
            label="Max requests per minute"
            value={String(effective.max_requests_per_minute)}
            override={override?.max_requests_per_minute?.toString()}
            isEditing={isEditing}
            inputType="number"
            onChange={(val) => {
              onUpdate({ max_requests_per_minute: parseInt(val, 10) });
            }}
          />

          <FieldRow
            label="Latency budget (ms)"
            value={effective.latency_budget_ms.toLocaleString()}
            override={override?.latency_budget_ms?.toLocaleString()}
            isEditing={isEditing}
            inputType="number"
            onChange={(val) => {
              onUpdate({ latency_budget_ms: parseInt(val, 10) });
            }}
          />

          <FieldRow
            label="Daily cost limit (cents)"
            value={effective.cost_limit_cents_per_day.toLocaleString()}
            override={override?.cost_limit_cents_per_day?.toLocaleString()}
            isEditing={isEditing}
            inputType="number"
            onChange={(val) => {
              onUpdate({ cost_limit_cents_per_day: parseInt(val, 10) });
            }}
          />
        </div>
      </div>
    </div>
  );
}

function RetentionSection({
  effective,
  override,
  isEditing,
  onUpdate,
}: SectionProps<RetentionPolicy>) {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-semibold">Data Retention Settings</h3>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Retention Periods */}
        <div className="space-y-3 rounded-md border p-4">
          <h4 className="text-sm font-medium">Retention Periods (days)</h4>

          <FieldRow
            label="AI call logs"
            value={String(effective.ai_call_logs_days)}
            override={override?.ai_call_logs_days?.toString()}
            isEditing={isEditing}
            inputType="number"
            onChange={(val) => {
              onUpdate({ ai_call_logs_days: parseInt(val, 10) });
            }}
          />

          <FieldRow
            label="Session events"
            value={String(effective.session_events_days)}
            override={override?.session_events_days?.toString()}
            isEditing={isEditing}
            inputType="number"
            onChange={(val) => {
              onUpdate({ session_events_days: parseInt(val, 10) });
            }}
          />

          <FieldRow
            label="Homework uploads"
            value={String(effective.homework_uploads_days)}
            override={override?.homework_uploads_days?.toString()}
            isEditing={isEditing}
            inputType="number"
            onChange={(val) => {
              onUpdate({ homework_uploads_days: parseInt(val, 10) });
            }}
          />
        </div>

        {/* More Retention */}
        <div className="space-y-3 rounded-md border p-4">
          <h4 className="text-sm font-medium">Additional Settings</h4>

          <FieldRow
            label="Consent logs"
            value={String(effective.consent_logs_days)}
            override={override?.consent_logs_days?.toString()}
            isEditing={isEditing}
            inputType="number"
            onChange={(val) => {
              onUpdate({ consent_logs_days: parseInt(val, 10) });
            }}
          />

          <FieldRow
            label="AI incidents"
            value={String(effective.ai_incidents_days)}
            override={override?.ai_incidents_days?.toString()}
            isEditing={isEditing}
            inputType="number"
            onChange={(val) => {
              onUpdate({ ai_incidents_days: parseInt(val, 10) });
            }}
          />

          <FieldRow
            label="DSR exports"
            value={String(effective.dsr_exports_days)}
            override={override?.dsr_exports_days?.toString()}
            isEditing={isEditing}
            inputType="number"
            onChange={(val) => {
              onUpdate({ dsr_exports_days: parseInt(val, 10) });
            }}
          />

          <FieldRow
            label="Prefer soft delete"
            value={effective.prefer_soft_delete ? 'Yes' : 'No'}
            override={
              override?.prefer_soft_delete !== undefined
                ? override.prefer_soft_delete
                  ? 'Yes'
                  : 'No'
                : undefined
            }
            isEditing={isEditing}
            inputType="toggle"
            onChange={(val) => {
              onUpdate({ prefer_soft_delete: val === 'true' });
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FIELD COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

interface FieldRowProps {
  label: string;
  value: string;
  override?: string;
  isEditing: boolean;
  inputType?: 'text' | 'number' | 'toggle' | 'select';
  options?: string[];
  placeholder?: string;
  onChange: (value: string) => void;
}

function FieldRow({
  label,
  value,
  override,
  isEditing,
  inputType = 'text',
  options,
  placeholder,
  onChange,
}: FieldRowProps) {
  const displayValue = override ?? value;
  const hasOverride = override !== undefined && override !== value;

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">{label}</span>
        <span className={`text-sm font-medium ${hasOverride ? 'text-blue-700' : ''}`}>
          {displayValue}
          {hasOverride && <span className="ml-1 text-xs text-blue-500">(override)</span>}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-slate-600">{label}</label>
      {inputType === 'toggle' ? (
        <button
          type="button"
          onClick={() => {
            onChange(displayValue === 'Yes' ? 'false' : 'true');
          }}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            displayValue === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {displayValue}
        </button>
      ) : inputType === 'select' ? (
        <select
          value={displayValue}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          className="rounded-md border px-2 py-1 text-sm"
        >
          {options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={inputType}
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          className="w-48 rounded-md border px-2 py-1 text-sm"
        />
      )}
    </div>
  );
}
