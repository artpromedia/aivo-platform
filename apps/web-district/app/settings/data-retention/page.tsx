'use client';

import { Button, Card } from '@aivo/ui-web';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../providers';

// ============================================================================
// Types
// ============================================================================

interface RetentionPolicy {
  aiInteractionLogsDays: number;
  sessionEventLogsDays: number;
  auditLogsDays: number;
  studentDataAfterWithdrawalDays: number;
}

// ============================================================================
// Constants
// ============================================================================

const API = '/api/settings/retention';

const DEFAULTS: RetentionPolicy = {
  aiInteractionLogsDays: 90,
  sessionEventLogsDays: 365,
  auditLogsDays: 2555, // ~7 years (FERPA)
  studentDataAfterWithdrawalDays: 365,
};

/** Regulatory minimums — days below these trigger warnings. */
const REGULATORY_MINIMUMS: Record<keyof RetentionPolicy, { min: number; regulation: string }> = {
  aiInteractionLogsDays: { min: 30, regulation: 'Best practice: retain at least 30 days for incident investigation' },
  sessionEventLogsDays: { min: 90, regulation: 'NIST recommends at least 90 days for session logs' },
  auditLogsDays: { min: 2555, regulation: 'FERPA requires audit logs be retained for at least 7 years (2,555 days)' },
  studentDataAfterWithdrawalDays: { min: 180, regulation: 'Most states require student records be retained at least 180 days after withdrawal' },
};

const FIELD_META: Record<keyof RetentionPolicy, { label: string; description: string; icon: string }> = {
  aiInteractionLogsDays: {
    label: 'AI Interaction Logs',
    description: 'Chat messages, AI tutoring sessions, and safety flagged interactions',
    icon: '🤖',
  },
  sessionEventLogsDays: {
    label: 'Session Event Logs',
    description: 'User login/logout events, page views, and session activity',
    icon: '📊',
  },
  auditLogsDays: {
    label: 'Audit Logs',
    description: 'Administrative actions, data access events, and compliance records',
    icon: '📝',
  },
  studentDataAfterWithdrawalDays: {
    label: 'Student Data After Withdrawal',
    description: 'Retain student PII and academic records after they leave the district',
    icon: '🎓',
  },
};

// ============================================================================
// Page Component
// ============================================================================

export default function DataRetentionPage() {
  const { accessToken } = useAuth();

  const [policy, setPolicy] = useState<RetentionPolicy>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const buildHeaders = useCallback(
    (): Record<string, string> => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const showFeedback = useCallback((type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => { setFeedback(null); }, 5000);
  }, []);

  // ---- Fetch ----
  const fetchPolicy = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: buildHeaders() });
      if (res.ok) {
        const data = (await res.json()) as RetentionPolicy;
        setPolicy(data);
      }
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, [buildHeaders]);

  useEffect(() => { void fetchPolicy(); }, [fetchPolicy]);

  // ---- Save ----
  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: 'PATCH',
        headers: buildHeaders(),
        body: JSON.stringify(policy),
      });
      if (res.ok) {
        const data = (await res.json()) as RetentionPolicy;
        setPolicy(data);
        showFeedback('success', 'Retention policies saved successfully.');
      } else {
        showFeedback('error', 'Failed to save retention policies.');
      }
    } catch {
      showFeedback('error', 'Failed to save retention policies.');
    } finally {
      setSaving(false);
    }
  }, [buildHeaders, policy, showFeedback]);

  // ---- Helpers ----
  const getWarnings = useCallback(() => {
    const warnings: { field: keyof RetentionPolicy; message: string }[] = [];
    for (const [key, rule] of Object.entries(REGULATORY_MINIMUMS)) {
      const k = key as keyof RetentionPolicy;
      if (policy[k] < rule.min) {
        warnings.push({ field: k, message: rule.regulation });
      }
    }
    return warnings;
  }, [policy]);

  const warnings = getWarnings();

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Back to settings">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Retention Settings</h1>
            <p className="text-sm text-gray-500">Loading…</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Back to settings">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Retention Settings</h1>
          <p className="text-sm text-gray-500">
            Configure how long different types of data are retained before automatic deletion
          </p>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {feedback.text}
        </div>
      )}

      {/* Regulatory Warning Banner */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <h2 className="text-sm font-semibold text-amber-900">Regulatory Compliance Warning</h2>
              <p className="text-sm text-amber-800 mt-1">
                One or more retention periods are below recommended regulatory minimums:
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                {warnings.map((w) => (
                  <li key={w.field} className="text-sm text-amber-800">
                    <span className="font-medium">{FIELD_META[w.field].label}:</span>{' '}
                    {w.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <svg className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h2 className="text-sm font-semibold text-blue-900">About Data Retention</h2>
            <p className="text-sm text-blue-800 mt-1">
              These policies control automated data lifecycle management. Data older than the configured
              retention period is permanently deleted. Ensure your settings comply with FERPA, COPPA,
              and your state&apos;s data privacy regulations.
            </p>
          </div>
        </div>
      </div>

      {/* Retention Fields */}
      <Card>
        <div className="p-5">
          <h2 className="text-lg font-semibold text-gray-900">Retention Periods</h2>
          <p className="text-sm text-gray-500 mt-1">
            Set the number of days to retain each data category before automatic purge.
          </p>

          <div className="mt-5 space-y-4">
            {(Object.keys(FIELD_META) as (keyof RetentionPolicy)[]).map((key) => {
              const meta = FIELD_META[key];
              const reg = REGULATORY_MINIMUMS[key];
              const belowMin = policy[key] < reg.min;

              return (
                <div
                  key={key}
                  className={`rounded-lg border p-4 ${
                    belowMin ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{meta.icon}</span>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{meta.label}</h3>
                        <p className="text-xs text-gray-500">{meta.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Recommended minimum: {reg.min} days
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={36500}
                        value={policy[key]}
                        onChange={(e) => {
                          setPolicy((p) => ({ ...p, [key]: Number(e.target.value) }));
                        }}
                        className={`w-28 rounded-lg border px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-1 ${
                          belowMin
                            ? 'border-amber-400 text-amber-900 focus:border-amber-500 focus:ring-amber-400'
                            : 'border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500'
                        }`}
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">days</span>
                    </div>
                  </div>

                  {belowMin && (
                    <p className="mt-2 text-xs text-amber-700 flex items-center gap-1">
                      <span>⚠️</span> {reg.regulation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Save */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => { setPolicy(DEFAULTS); }}
          className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
        >
          Reset to defaults
        </button>
        <Button disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save Retention Policies'}
        </Button>
      </div>
    </section>
  );
}
