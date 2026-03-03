'use client';

import { Button, Card } from '@aivo/ui-web';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../providers';

// ============================================================================
// Types
// ============================================================================

type DigestFrequency = 'REALTIME' | 'DAILY' | 'WEEKLY' | 'OFF';

interface AlertThresholds {
  seatUsagePercent: number;
  notifyOnSyncFailure: boolean;
  notifyOnComplianceAlert: boolean;
}

interface CategoryToggles {
  compliance: boolean;
  integrations: boolean;
  billing: boolean;
  security: boolean;
}

interface NotificationPreferences {
  digestFrequency: DigestFrequency;
  thresholds: AlertThresholds;
  categories: CategoryToggles;
  recipients: string[];
}

// ============================================================================
// Constants
// ============================================================================

const API = '/api/settings/notifications';

const FREQUENCY_OPTIONS: { value: DigestFrequency; label: string; description: string }[] = [
  { value: 'REALTIME', label: 'Real-time', description: 'Get notified immediately for every event' },
  { value: 'DAILY', label: 'Daily Digest', description: 'Receive a summary email once per day' },
  { value: 'WEEKLY', label: 'Weekly Digest', description: 'Receive a summary email once per week' },
  { value: 'OFF', label: 'Off', description: 'No email notifications' },
];

const CATEGORY_LABELS: Record<keyof CategoryToggles, { label: string; description: string; icon: string }> = {
  compliance: { label: 'Compliance', description: 'FERPA, COPPA, and data privacy alerts', icon: '🛡️' },
  integrations: { label: 'Integrations', description: 'SIS sync failures, API connection issues', icon: '🔗' },
  billing: { label: 'Billing', description: 'Invoice reminders, payment failures, seat usage', icon: '💳' },
  security: { label: 'Security', description: 'Login anomalies, permission changes, API key usage', icon: '🔐' },
};

const DEFAULTS: NotificationPreferences = {
  digestFrequency: 'DAILY',
  thresholds: { seatUsagePercent: 80, notifyOnSyncFailure: true, notifyOnComplianceAlert: true },
  categories: { compliance: true, integrations: true, billing: true, security: true },
  recipients: [],
};

// ============================================================================
// Page Component
// ============================================================================

export default function NotificationPreferencesPage() {
  const { accessToken } = useAuth();

  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newRecipient, setNewRecipient] = useState('');

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
  const fetchPrefs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: buildHeaders() });
      if (res.ok) {
        const data = (await res.json()) as NotificationPreferences;
        setPrefs(data);
      }
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, [buildHeaders]);

  useEffect(() => { void fetchPrefs(); }, [fetchPrefs]);

  // ---- Save ----
  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: 'PUT',
        headers: buildHeaders(),
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        showFeedback('success', 'Notification preferences saved.');
      } else {
        showFeedback('error', 'Failed to save preferences.');
      }
    } catch {
      showFeedback('error', 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  }, [buildHeaders, prefs, showFeedback]);

  // ---- Recipient helpers ----
  const addRecipient = useCallback(() => {
    const email = newRecipient.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (prefs.recipients.includes(email)) return;
    setPrefs((p) => ({ ...p, recipients: [...p.recipients, email] }));
    setNewRecipient('');
  }, [newRecipient, prefs.recipients]);

  const removeRecipient = useCallback((email: string) => {
    setPrefs((p) => ({ ...p, recipients: p.recipients.filter((r) => r !== email) }));
  }, []);

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
            <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
          <p className="text-sm text-gray-500">Configure how and when your district receives notifications</p>
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

      {/* Email Digest Frequency */}
      <Card>
        <div className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-xl">📧</span>
            Email Digest Frequency
          </h2>
          <p className="text-sm text-gray-500 mt-1">Choose how often to receive email notification digests.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                  prefs.digestFrequency === opt.value
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="digestFrequency"
                  value={opt.value}
                  checked={prefs.digestFrequency === opt.value}
                  onChange={() => { setPrefs((p) => ({ ...p, digestFrequency: opt.value })); }}
                  className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <div className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            Alert Thresholds
          </h2>
          <p className="text-sm text-gray-500 mt-1">Set conditions that trigger immediate notifications.</p>

          <div className="mt-4 space-y-4">
            {/* Seat usage */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Seat Usage Warning</h3>
                <p className="text-xs text-gray-500">Notify when licensed seat usage exceeds this threshold</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={prefs.thresholds.seatUsagePercent}
                  onChange={(e) => {
                    setPrefs((p) => ({
                      ...p,
                      thresholds: { ...p.thresholds, seatUsagePercent: Number(e.target.value) },
                    }));
                  }}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>

            {/* Sync failure */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Sync Failure Alerts</h3>
                <p className="text-xs text-gray-500">Notify when SIS sync or integration sync fails</p>
              </div>
              <ToggleSwitch
                checked={prefs.thresholds.notifyOnSyncFailure}
                onChange={(v) => {
                  setPrefs((p) => ({
                    ...p,
                    thresholds: { ...p.thresholds, notifyOnSyncFailure: v },
                  }));
                }}
              />
            </div>

            {/* Compliance alert */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Compliance Alerts</h3>
                <p className="text-xs text-gray-500">Notify on FERPA, COPPA, or policy violations</p>
              </div>
              <ToggleSwitch
                checked={prefs.thresholds.notifyOnComplianceAlert}
                onChange={(v) => {
                  setPrefs((p) => ({
                    ...p,
                    thresholds: { ...p.thresholds, notifyOnComplianceAlert: v },
                  }));
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Per-Category Toggles */}
      <Card>
        <div className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-xl">📂</span>
            Notification Categories
          </h2>
          <p className="text-sm text-gray-500 mt-1">Enable or disable notifications by category.</p>

          <div className="mt-4 space-y-3">
            {(Object.keys(CATEGORY_LABELS) as (keyof CategoryToggles)[]).map((key) => {
              const cat = CATEGORY_LABELS[key];
              return (
                <div key={key} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat.icon}</span>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{cat.label}</h3>
                      <p className="text-xs text-gray-500">{cat.description}</p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={prefs.categories[key]}
                    onChange={(v) => {
                      setPrefs((p) => ({
                        ...p,
                        categories: { ...p.categories, [key]: v },
                      }));
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Recipient Management */}
      <Card>
        <div className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-xl">👥</span>
            Notification Recipients
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage email addresses that receive admin notifications for this district.
          </p>

          <div className="mt-4 flex gap-2">
            <input
              type="email"
              value={newRecipient}
              placeholder="admin@district.edu"
              onChange={(e) => { setNewRecipient(e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') addRecipient(); }}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Button onClick={addRecipient} variant="outline">Add</Button>
          </div>

          {prefs.recipients.length > 0 ? (
            <ul className="mt-3 divide-y divide-gray-100">
              {prefs.recipients.map((email) => (
                <li key={email} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-gray-900">{email}</span>
                  <button
                    type="button"
                    onClick={() => { removeRecipient(email); }}
                    className="text-xs text-red-600 hover:text-red-800 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-400">No recipients added yet.</p>
          )}
        </div>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save Preferences'}
        </Button>
      </div>
    </section>
  );
}

// ============================================================================
// Toggle Switch
// ============================================================================

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => { onChange(!checked); }}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        ${checked ? 'bg-indigo-600' : 'bg-gray-300'}
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
