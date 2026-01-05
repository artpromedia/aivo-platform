/**
 * Monitoring Page
 *
 * Real-time monitoring dashboard for student activity, progress,
 * and focus states during learning sessions.
 */

'use client';

import * as React from 'react';

import {
  fetchActiveSessions,
  acknowledgeHelpRequest,
  type StudentSession,
  type FocusState,
} from '../../../../lib/api/monitoring';

import { PageHeader } from '@/components/layout/breadcrumb';

const focusStateConfig: Record<FocusState, { label: string; color: string; icon: string }> = {
  focused: {
    label: 'Focused',
    color: 'bg-green-100 text-green-700',
    icon: '🟢',
  },
  distracted: {
    label: 'Distracted',
    color: 'bg-amber-100 text-amber-700',
    icon: '🟡',
  },
  idle: {
    label: 'Idle',
    color: 'bg-gray-100 text-gray-600',
    icon: '⚪',
  },
  break: {
    label: 'On Break',
    color: 'bg-blue-100 text-blue-700',
    icon: '🔵',
  },
};

export default function MonitoringPage() {
  const [sessions, setSessions] = React.useState<StudentSession[]>([]);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadSessions() {
      try {
        const accessToken = 'mock-token';
        const data = await fetchActiveSessions(undefined, accessToken);
        setSessions(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setIsLoading(false);
      }
    }
    void loadSessions();
    // Refresh every 5 seconds for real-time monitoring
    const interval = setInterval(loadSessions, 5000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleOfferHelp = async (studentId: string) => {
    try {
      const accessToken = 'mock-token';
      await acknowledgeHelpRequest(`help-${studentId}`, accessToken);
      // Refresh sessions to update help status
      const data = await fetchActiveSessions(undefined, accessToken);
      setSessions(data);
    } catch (err) {
      console.error('Failed to acknowledge help request:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const needsHelpCount = sessions.filter((s) => s.needsHelp).length;
  const focusedCount = sessions.filter((s) => s.focusState === 'focused').length;
  const avgProgress =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.progress, 0) / sessions.length)
      : 0;

  return (
    <div>
      <PageHeader
        title="Live Monitoring"
        description="Real-time view of student learning sessions"
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              {sessions.length} active
            </span>
            <button
              onClick={() => {
                setViewMode(viewMode === 'grid' ? 'list' : 'grid');
              }}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            >
              {viewMode === 'grid' ? '📋 List' : '📊 Grid'}
            </button>
          </div>
        }
      />

      {/* Summary Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Active Sessions</p>
          <p className="mt-1 text-2xl font-bold">{sessions.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Focused Students</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {focusedCount}/{sessions.length}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Average Progress</p>
          <p className="mt-1 text-2xl font-bold">{avgProgress}%</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Need Help</p>
          <p className={`mt-1 text-2xl font-bold ${needsHelpCount > 0 ? 'text-red-600' : ''}`}>
            {needsHelpCount}
          </p>
        </div>
      </div>

      {/* Alerts Section */}
      {needsHelpCount > 0 && (
        <div className="mt-6 rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <span className="font-medium text-red-800">
              {needsHelpCount} student{needsHelpCount > 1 ? 's' : ''} may need assistance
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {sessions
              .filter((s) => s.needsHelp)
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleOfferHelp(s.studentId)}
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100"
                >
                  Help {s.studentName}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Session Grid/List */}
      <div className="mt-6">
        {viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} onOfferHelp={handleOfferHelp} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} onOfferHelp={handleOfferHelp} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  onOfferHelp,
}: {
  session: StudentSession;
  onOfferHelp: (studentId: string) => void;
}) {
  const focusConfig = focusStateConfig[session.focusState];

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${
        session.needsHelp ? 'border-red-300 ring-2 ring-red-100' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-medium">
            {session.studentName.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-gray-900">{session.studentName}</p>
            <p className="text-xs text-gray-500">{session.subject}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs ${focusConfig.color}`}>
          {focusConfig.icon} {focusConfig.label}
        </span>
      </div>

      {/* Activity */}
      <div className="mt-3">
        <p className="text-sm text-gray-600">{session.currentActivity}</p>
        <p className="text-xs text-gray-400">
          Started {session.startTime} · {session.duration} min
        </p>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Progress</span>
          <span className="font-medium">{session.progress}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-primary-500 transition-all"
            style={{ width: `${session.progress}%` }}
          />
        </div>
      </div>

      {/* Recent Score */}
      {session.recentScore !== undefined && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
          <span className="text-xs text-gray-500">Recent Score</span>
          <span
            className={`text-sm font-bold ${
              session.recentScore >= 80
                ? 'text-green-600'
                : session.recentScore >= 60
                  ? 'text-amber-600'
                  : 'text-red-600'
            }`}
          >
            {session.recentScore}%
          </span>
        </div>
      )}

      {/* Help Button */}
      {session.needsHelp && (
        <button
          onClick={() => {
            onOfferHelp(session.studentId);
          }}
          className="mt-3 w-full rounded-lg bg-red-50 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          🙋 Offer Help
        </button>
      )}
    </div>
  );
}

function SessionRow({
  session,
  onOfferHelp,
}: {
  session: StudentSession;
  onOfferHelp: (studentId: string) => void;
}) {
  const focusConfig = focusStateConfig[session.focusState];

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border bg-white p-4 ${
        session.needsHelp ? 'border-red-300' : ''
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-medium">
        {session.studentName.charAt(0)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">{session.studentName}</p>
        <p className="truncate text-sm text-gray-500">{session.currentActivity}</p>
      </div>

      <div className="text-right">
        <p className="text-sm text-gray-600">{session.subject}</p>
        <p className="text-xs text-gray-400">{session.duration} min</p>
      </div>

      <div className="w-24">
        <div className="flex items-center justify-between text-xs">
          <span>{session.progress}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-primary-500"
            style={{ width: `${session.progress}%` }}
          />
        </div>
      </div>

      <span className={`rounded-full px-2 py-0.5 text-xs ${focusConfig.color}`}>
        {focusConfig.label}
      </span>

      {session.needsHelp && (
        <button
          onClick={() => {
            onOfferHelp(session.studentId);
          }}
          className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Help
        </button>
      )}
    </div>
  );
}
