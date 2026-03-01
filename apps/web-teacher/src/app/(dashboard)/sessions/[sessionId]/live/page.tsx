/**
 * Live Session Monitoring Page (Container 09 — Page 4 of 4)
 *
 * Real-time classroom monitoring with student activity feed,
 * focus indicators, help queue, class statistics, and intervention actions.
 * Uses WebSocket for live updates and REST API for initial data load.
 *
 * Uses: monitoring API (REST), useClassroomMonitor (WebSocket),
 *       existing LiveClassroomView + StudentActivityCard components
 */

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { LiveClassroomView } from '@/components/monitoring/LiveClassroomView';
import { useAccessToken } from '@/hooks/use-access-token';
import { useClassroomMonitor } from '@/hooks/useClassroomMonitor';
import {
  fetchActiveSessions,
  fetchMonitoringStats,
  fetchHelpRequests,
  acknowledgeHelpRequest,
  resolveHelpRequest,
  sendNudge,
  type StudentSession,
  type MonitoringStats,
  type HelpRequest,
} from '@/lib/api/monitoring';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function LiveSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { accessToken } = useAccessToken();

  // The sessionId doubles as the classId for monitoring purposes
  const classId = sessionId;

  // Real-time WebSocket monitoring
  const {
    students: wsStudents,
    metrics: wsMetrics,
    alerts,
    isConnected,
    acknowledgeAlert,
    sendIntervention,
  } = useClassroomMonitor({ classroomId: classId, teacherId: 'current' });

  // REST API fallback state
  const [restSessions, setRestSessions] = React.useState<StudentSession[]>([]);
  const [restStats, setRestStats] = React.useState<MonitoringStats | null>(null);
  const [helpRequests, setHelpRequests] = React.useState<HelpRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Nudge modal state
  const [nudgeStudentId, setNudgeStudentId] = React.useState<string | null>(null);
  const [nudgeStudentName, setNudgeStudentName] = React.useState('');
  const [nudgeMessage, setNudgeMessage] = React.useState('');
  const [nudgeSending, setNudgeSending] = React.useState(false);

  // Auto-refresh interval
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const refreshIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial data load via REST
  const loadData = React.useCallback(async () => {
    if (!classId || !accessToken) return;

    try {
      const [sessions, stats, help] = await Promise.all([
        fetchActiveSessions(classId, accessToken),
        fetchMonitoringStats(classId, accessToken),
        fetchHelpRequests(accessToken, classId),
      ]);
      setRestSessions(sessions);
      setRestStats(stats);
      setHelpRequests(help);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  }, [classId, accessToken]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  // Auto-refresh every 30 seconds
  React.useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(loadData, 30000);
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, loadData]);

  // Use WebSocket data if connected, otherwise REST data
  const hasWsData = isConnected && wsStudents.size > 0;

  // Stats from WS or REST
  const displayStats: MonitoringStats | null = React.useMemo(() => {
    if (hasWsData && wsMetrics) {
      return {
        totalActive: wsMetrics.activeStudents,
        focusedCount: wsMetrics.focusDistribution.focused,
        distractedCount: wsMetrics.focusDistribution.struggling,
        idleCount: wsMetrics.focusDistribution.idle,
        onBreakCount: 0,
        needsHelpCount: wsMetrics.focusDistribution.help_requested,
        avgProgress: wsMetrics.averageProgress,
      };
    }
    return restStats;
  }, [hasWsData, wsMetrics, restStats]);

  // Handle help request actions
  const handleAcknowledgeHelp = async (requestId: string) => {
    if (!accessToken) return;
    try {
      await acknowledgeHelpRequest(requestId, accessToken, classId);
      setHelpRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'acknowledged' as const } : r))
      );
    } catch {
      // Silently handle for now
    }
  };

  const handleResolveHelp = async (requestId: string) => {
    if (!accessToken) return;
    try {
      await resolveHelpRequest(requestId, accessToken, classId);
      setHelpRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'resolved' as const } : r))
      );
    } catch {
      // Silently handle
    }
  };

  // Handle nudge
  const handleSendNudge = async () => {
    if (!nudgeStudentId || !nudgeMessage.trim() || !accessToken) return;
    setNudgeSending(true);
    try {
      await sendNudge(nudgeStudentId, nudgeMessage, accessToken, classId);
      setNudgeStudentId(null);
      setNudgeMessage('');
    } catch {
      // Silently handle
    } finally {
      setNudgeSending(false);
    }
  };

  // Handle student click — open student detail
  const handleStudentClick = (studentId: string) => {
    router.push(`/students/${studentId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-gray-200" />
        <div className="h-4 w-48 rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-200" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && restSessions.length === 0) {
    return (
      <div>
        <PageHeader title="Live Session" description="Real-time classroom monitoring" />
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-600">{error}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={loadData}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              Retry
            </button>
            <Link href="/monitoring" className="text-sm text-primary-600 hover:underline">
              ← Back to Monitoring
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pendingHelp = helpRequests.filter((r) => r.status === 'pending');

  return (
    <div>
      <PageHeader
        title="Live Session"
        description="Real-time classroom monitoring"
        actions={
          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <div
                className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500')}
              />
              <span className="text-xs text-gray-600">{isConnected ? 'Live' : 'Polling'}</span>
            </div>

            {/* Auto-refresh toggle */}
            <label className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => {
                  setAutoRefresh(e.target.checked);
                }}
                className="rounded border-gray-300"
              />
              <span className="text-xs text-gray-600">Auto-refresh</span>
            </label>

            {/* Manual refresh */}
            <button
              onClick={loadData}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              🔄 Refresh
            </button>

            <Link
              href="/monitoring"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              ← Monitoring
            </Link>
          </div>
        }
      />

      {/* Stats Bar */}
      {displayStats && (
        <div className="mt-6 grid gap-4 sm:grid-cols-6">
          <StatCard label="Active" value={displayStats.totalActive} icon="👥" />
          <StatCard
            label="Focused"
            value={displayStats.focusedCount}
            icon="🎯"
            color="text-green-600"
          />
          <StatCard
            label="Distracted"
            value={displayStats.distractedCount}
            icon="⚠️"
            color="text-amber-600"
          />
          <StatCard label="Idle" value={displayStats.idleCount} icon="⏸️" color="text-gray-500" />
          <StatCard
            label="Need Help"
            value={displayStats.needsHelpCount}
            icon="🆘"
            color="text-red-600"
          />
          <StatCard label="Avg Progress" value={`${displayStats.avgProgress}%`} icon="📊" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main Grid — Live Classroom (takes 2 cols) */}
        <div className="lg:col-span-2">
          {hasWsData ? (
            <LiveClassroomView
              students={wsStudents}
              metrics={wsMetrics}
              alerts={alerts}
              isConnected={isConnected}
              isLoading={false}
              onStudentClick={handleStudentClick}
              onAcknowledgeAlert={(alertId) => acknowledgeAlert(alertId)}
              onSendIntervention={(studentId, type, message) => {
                if (type === 'nudge') {
                  const student = wsStudents.get(studentId);
                  setNudgeStudentId(studentId);
                  setNudgeStudentName(student?.studentName ?? studentId);
                } else {
                  void sendIntervention(studentId, type, message);
                }
              }}
              onRefresh={loadData}
            />
          ) : (
            <RestStudentsGrid
              sessions={restSessions}
              onStudentClick={handleStudentClick}
              onNudge={(id, name) => {
                setNudgeStudentId(id);
                setNudgeStudentName(name);
              }}
            />
          )}
        </div>

        {/* Sidebar — Help Queue + Activity Feed */}
        <div className="space-y-6">
          {/* Help Queue */}
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                🆘 Help Queue
                {pendingHelp.length > 0 && (
                  <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    {pendingHelp.length}
                  </span>
                )}
              </h3>
            </div>

            {helpRequests.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No help requests at this time.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {helpRequests.map((req) => (
                  <div
                    key={req.id}
                    className={cn(
                      'rounded-lg border p-3',
                      req.status === 'pending' && 'border-red-200 bg-red-50',
                      req.status === 'acknowledged' && 'border-yellow-200 bg-yellow-50',
                      req.status === 'resolved' && 'border-green-200 bg-green-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {req.studentName}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{req.activity}</p>
                        <p className="text-xs text-gray-400">
                          {req.subject} · {req.requestTime}
                        </p>
                      </div>
                      <HelpRequestStatusBadge status={req.status} />
                    </div>
                    {req.status !== 'resolved' && (
                      <div className="mt-2 flex gap-2">
                        {req.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeHelp(req.id)}
                            className="rounded bg-yellow-600 px-2 py-1 text-xs text-white hover:bg-yellow-700"
                          >
                            Acknowledge
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleResolveHelp(req.id)}
                          className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNudgeStudentId(req.studentId);
                            setNudgeStudentName(req.studentName);
                          }}
                          className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          💬 Message
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed from REST data */}
          <div className="rounded-xl border bg-white p-4">
            <h3 className="font-semibold text-gray-900 mb-3">📊 Student Activities</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {restSessions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No active sessions.</p>
              ) : (
                restSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      handleStudentClick(session.studentId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleStudentClick(session.studentId);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <FocusIndicator state={session.focusState} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.studentName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{session.currentActivity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-900">{session.progress}%</p>
                      <p className="text-xs text-gray-400">{session.duration}m</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nudge Modal */}
      {nudgeStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              💬 Send Message to {nudgeStudentName}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Send an encouraging message or gentle nudge to the student.
            </p>

            <div className="mt-4 space-y-3">
              {/* Quick messages */}
              <div className="flex flex-wrap gap-2">
                {[
                  'Keep up the great work! 🌟',
                  "Need any help? I'm here for you.",
                  "Try to stay focused — you've got this!",
                  'Take a short break if you need one.',
                ].map((msg) => (
                  <button
                    key={msg}
                    type="button"
                    onClick={() => {
                      setNudgeMessage(msg);
                    }}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs',
                      nudgeMessage === msg
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    {msg}
                  </button>
                ))}
              </div>

              <textarea
                className="w-full rounded-lg border p-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                rows={2}
                placeholder="Or write a custom message..."
                value={nudgeMessage}
                onChange={(e) => {
                  setNudgeMessage(e.target.value);
                }}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setNudgeStudentId(null);
                  setNudgeMessage('');
                }}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendNudge}
                disabled={nudgeSending || !nudgeMessage.trim()}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {nudgeSending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REST STUDENTS GRID — Fallback when WebSocket is not connected
// ═══════════════════════════════════════════════════════════════════════════

function RestStudentsGrid({
  sessions,
  onStudentClick,
  onNudge,
}: Readonly<{
  sessions: StudentSession[];
  onStudentClick: (id: string) => void;
  onNudge: (id: string, name: string) => void;
}>) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-12 text-center text-gray-500">
        <p className="text-4xl mb-4">📡</p>
        <p className="font-medium">No active sessions</p>
        <p className="text-sm mt-1">Students will appear here when they start activities.</p>
      </div>
    );
  }

  // Sort: needs help first, then distracted, then focused, then idle
  const sorted = [...sessions].sort((a, b) => {
    const priority: Record<string, number> = {
      distracted: 0,
      idle: 1,
      break: 2,
      focused: 3,
    };
    const helpA = a.needsHelp ? -10 : 0;
    const helpB = b.needsHelp ? -10 : 0;
    return helpA + (priority[a.focusState] ?? 3) - (helpB + (priority[b.focusState] ?? 3));
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Students</h2>
        <span className="text-sm text-gray-500">{sessions.length} active</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((session) => (
          <div
            key={session.id}
            className={cn(
              'rounded-xl border bg-white p-4 transition-colors hover:shadow-sm cursor-pointer',
              session.needsHelp && 'border-red-200 bg-red-50',
              session.focusState === 'distracted' && !session.needsHelp && 'border-amber-200'
            )}
            onClick={() => {
              onStudentClick(session.studentId);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onStudentClick(session.studentId);
            }}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FocusIndicator state={session.focusState} />
                <span className="font-medium text-gray-900 truncate">{session.studentName}</span>
              </div>
              {session.needsHelp && (
                <span className="rounded bg-red-600 px-2 py-0.5 text-xs text-white animate-pulse">
                  HELP
                </span>
              )}
            </div>

            <p className="mt-2 text-sm text-gray-600 truncate">{session.currentActivity}</p>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{session.subject}</span>
                <span>·</span>
                <span>{session.duration}m</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-16 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-600 transition-all"
                    style={{ width: `${session.progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{session.progress}%</span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNudge(session.studentId, session.studentName);
                }}
                className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                💬 Nudge
              </button>
              <Link
                href={`/students/${session.studentId}/ai-conversations`}
                className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                🤖 AI Log
              </Link>
            </div>

            {/* Streak / Score */}
            {(session.recentScore != null || session.streakCount != null) && (
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                {session.recentScore != null && <span>Last: {session.recentScore}%</span>}
                {session.streakCount != null && session.streakCount > 0 && (
                  <span>🔥 {session.streakCount} streak</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════════════════════════════════════

function FocusIndicator({ state }: Readonly<{ state: string }>) {
  const colors: Record<string, string> = {
    focused: 'bg-green-500',
    distracted: 'bg-amber-500',
    idle: 'bg-gray-400',
    break: 'bg-blue-400',
  };
  return <div className={cn('h-3 w-3 rounded-full', colors[state] ?? 'bg-gray-400')} />;
}

function StatCard({
  label,
  value,
  icon,
  color = 'text-gray-900',
}: Readonly<{
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}>) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="flex items-center gap-1.5">
        <span>{icon}</span>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className={cn('mt-0.5 text-xl font-bold', color)}>{value}</p>
    </div>
  );
}

function HelpRequestStatusBadge({ status }: Readonly<{ status: string }>) {
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-red-100 text-red-700' },
    acknowledged: { label: 'Acknowledged', color: 'bg-yellow-100 text-yellow-700' },
    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  };
  const c = config[status] ?? config.pending;
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', c.color)}>
      {c.label}
    </span>
  );
}
