/**
 * Settings Page
 *
 * Four tabs: Profile · Grading · Notifications · Integrations.
 * Each form fetches from + saves to its respective back-end service
 * via the Next.js API proxy routes under /api/teacher/*.
 */

'use client';

import * as React from 'react';

import { PageHeader, Tabs } from '@/components/layout/breadcrumb';
import {
  useTeacherProfile,
  useUpdateTeacherProfile,
  useGradingSettings,
  useUpdateGradingSettings,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/use-teacher-settings';

/* ─── tab definitions ─────────────────────────────────────────────────── */
const tabs = [
  { id: 'profile', label: 'Profile' },
  { id: 'grading', label: 'Grading' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'integrations', label: 'Integrations' },
];

/* ─── shared components ───────────────────────────────────────────────── */

function StatusBanner({
  status,
  error,
}: {
  status: 'idle' | 'pending' | 'success' | 'error';
  error: Error | null;
}) {
  if (status === 'success') {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
        Saved successfully.
      </p>
    );
  }
  if (status === 'error') {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {error?.message || 'Something went wrong.'}
      </p>
    );
  }
  return null;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  PAGE                                                                  */
/* ═══════════════════════════════════════════════════════════════════════ */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState('profile');

  return (
    <div>
      <PageHeader title="Settings" description="Manage your preferences" />
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'grading' && <GradingSettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'integrations' && <IntegrationSettings />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  PROFILE TAB                                                           */
/* ═══════════════════════════════════════════════════════════════════════ */

function ProfileSettings() {
  const { data: profile, isLoading } = useTeacherProfile();
  const updateProfile = useUpdateTeacherProfile();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');

  // Seed form from fetched data
  React.useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setEmail(profile.email);
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({ firstName, lastName, email });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl rounded-xl border bg-white p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl rounded-xl border bg-white p-6">
      <h3 className="font-semibold text-gray-900">Profile Information</h3>

      <StatusBanner status={updateProfile.status} error={updateProfile.error} />

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            required
          />
        </div>
        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  GRADING TAB                                                           */
/* ═══════════════════════════════════════════════════════════════════════ */

const GRADING_SCALE_OPTIONS = [
  { value: 'standard', label: 'Standard (A-F)' },
  { value: 'points', label: 'Points-based' },
  { value: 'standards', label: 'Standards-based' },
];

const LATE_WORK_OPTIONS = [
  { value: '10_per_day_max_50', label: '10 % per day, max 50 %' },
  { value: 'none', label: 'No late work accepted' },
  { value: 'full_credit', label: 'Full credit always' },
];

function GradingSettings() {
  const { data: settings, isLoading } = useGradingSettings();
  const updateGrading = useUpdateGradingSettings();

  const [gradingScale, setGradingScale] = React.useState('standard');
  const [lateWorkPolicy, setLateWorkPolicy] = React.useState('10_per_day_max_50');
  const [dropLowest, setDropLowest] = React.useState(true);

  React.useEffect(() => {
    if (settings) {
      setGradingScale(settings.gradingScale);
      setLateWorkPolicy(settings.lateWorkPolicy);
      setDropLowest(settings.dropLowest);
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGrading.mutate({ gradingScale, lateWorkPolicy, dropLowest });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl rounded-xl border bg-white p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-6 w-64" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl rounded-xl border bg-white p-6">
      <h3 className="font-semibold text-gray-900">Grading Preferences</h3>

      <StatusBanner status={updateGrading.status} error={updateGrading.error} />

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Grading Scale
          </label>
          <select
            value={gradingScale}
            onChange={(e) => setGradingScale(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          >
            {GRADING_SCALE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Late Work Policy
          </label>
          <select
            value={lateWorkPolicy}
            onChange={(e) => setLateWorkPolicy(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          >
            {LATE_WORK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={dropLowest}
            onChange={(e) => setDropLowest(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">
            Drop lowest grade in each category
          </span>
        </label>

        <button
          type="submit"
          disabled={updateGrading.isPending}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {updateGrading.isPending ? 'Saving…' : 'Save Preferences'}
        </button>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  NOTIFICATIONS TAB                                                     */
/* ═══════════════════════════════════════════════════════════════════════ */

type NotifKey =
  | 'sessionUpdates'
  | 'achievements'
  | 'messages'
  | 'reminders'
  | 'alerts';

const NOTIFICATION_ITEMS: { key: NotifKey; label: string }[] = [
  { key: 'sessionUpdates', label: 'New submissions' },
  { key: 'achievements', label: 'Student achievements' },
  { key: 'messages', label: 'Parent messages' },
  { key: 'reminders', label: 'At-risk student alerts' },
  { key: 'alerts', label: 'Weekly digest' },
];

function NotificationSettings() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const toggle = (key: NotifKey) => {
    if (!prefs) return;
    updatePrefs.mutate({ [key]: !prefs[key] });
  };

  if (isLoading || !prefs) {
    return (
      <div className="max-w-2xl rounded-xl border bg-white p-6 space-y-3">
        <Skeleton className="h-5 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl rounded-xl border bg-white p-6">
      <h3 className="font-semibold text-gray-900">Notification Preferences</h3>

      {updatePrefs.status === 'error' && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {updatePrefs.error?.message || 'Failed to update preference.'}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {NOTIFICATION_ITEMS.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-gray-50"
          >
            <span className="text-sm text-gray-700">{label}</span>
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={() => toggle(key)}
              className="rounded"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  INTEGRATIONS TAB                                                      */
/* ═══════════════════════════════════════════════════════════════════════ */

const INTEGRATIONS = [
  { name: 'Google Classroom', connected: true },
  { name: 'Canvas LMS', connected: false },
  { name: 'Microsoft Teams', connected: true },
  { name: 'Clever', connected: false },
] as const;

function IntegrationSettings() {
  return (
    <div className="max-w-2xl rounded-xl border bg-white p-6">
      <h3 className="font-semibold text-gray-900">Connected Integrations</h3>
      <div className="mt-4 space-y-3">
        {INTEGRATIONS.map((integration) => (
          <div
            key={integration.name}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <span className="font-medium text-gray-900">{integration.name}</span>
            <button
              className={`rounded-lg px-4 py-1.5 text-sm ${
                integration.connected
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              }`}
            >
              {integration.connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
