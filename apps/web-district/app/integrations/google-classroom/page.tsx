'use client';

import { Badge, Button, Card, Heading } from '@aivo/ui-web';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../providers';

// ============================================================================
// Types
// ============================================================================

interface ConnectionStatus {
  connected: boolean;
  email: string | undefined;
  scopes: string[] | undefined;
  coursesLinked: number;
  lastSyncAt: string | undefined;
}

interface GoogleCourse {
  id: string;
  name: string;
  section: string | undefined;
  linkedClassroomId: string | undefined;
  linkedClassroomName: string | undefined;
  studentCount: number;
  lastSyncedAt: string | undefined;
  gradePassbackEnabled: boolean;
}

interface AivoClassroom {
  id: string;
  name: string;
}

interface SyncHistoryEntry {
  id: string;
  date: string;
  status: 'success' | 'partial' | 'failed';
  studentsAdded: number;
  studentsRemoved: number;
  studentsUpdated: number;
  errors: string[];
}

interface CourseMappingPayload {
  googleCourseId: string;
  aivoClassroomId: string;
}

// ============================================================================
// API base
// ============================================================================

const API = '/api/integrations/google-classroom';

// ============================================================================
// Helpers
// ============================================================================

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function statusTone(status: string): 'success' | 'warning' | 'error' {
  if (status === 'success') return 'success';
  if (status === 'partial') return 'warning';
  return 'error';
}

// ============================================================================
// Sub-Components
// ============================================================================

/* ---------- Connection Status Card ---------- */

interface ConnectionStatusCardProps {
  status: ConnectionStatus | null;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
}

function ConnectionStatusCard({
  status,
  loading,
  onConnect,
  onDisconnect,
  connecting,
}: ConnectionStatusCardProps) {
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <span className="ml-3 text-sm text-muted">Checking connection status…</span>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Google Classroom icon */}
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-2xl">
              🎓
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text">Google Classroom</h3>
              {status?.connected ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-green-700">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
                  <span className="text-sm text-muted">Not Connected</span>
                </div>
              )}
            </div>
          </div>

          <div>
            {status?.connected ? (
              <>
                {showDisconnectConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600">Disconnect?</span>
                    <Button
                      variant="destructive"
                      className="text-xs px-3 py-1"
                      onClick={() => {
                        onDisconnect();
                        setShowDisconnectConfirm(false);
                      }}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-xs px-3 py-1"
                      onClick={() => {
                        setShowDisconnectConfirm(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="text-sm"
                    onClick={() => {
                      setShowDisconnectConfirm(true);
                    }}
                  >
                    Disconnect
                  </Button>
                )}
              </>
            ) : (
              <Button
                className="text-sm"
                disabled={connecting}
                onClick={onConnect}
              >
                {connecting ? 'Connecting…' : 'Connect Google Classroom'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats row */}
        {status?.connected && (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-xs font-medium text-muted">Account</div>
              <div className="mt-0.5 text-sm font-semibold text-text truncate">
                {status.email ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Scopes</div>
              <div className="mt-0.5 text-sm font-semibold text-text">
                {status.scopes?.length ?? 0} granted
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Courses Linked</div>
              <div className="mt-0.5 text-sm font-semibold text-text">
                {status.coursesLinked}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted">Last Sync</div>
              <div className="mt-0.5 text-sm font-semibold text-text">
                {status.lastSyncAt ? formatDateTime(status.lastSyncAt) : 'Never'}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------- Course Mapping Table ---------- */

interface CourseMappingTableProps {
  courses: GoogleCourse[];
  aivoClassrooms: AivoClassroom[];
  onLinkCourse: (payload: CourseMappingPayload) => void;
  onUnlinkCourse: (courseId: string) => void;
  onSyncCourse: (courseId: string) => void;
  onToggleGradePassback: (courseId: string, enabled: boolean) => void;
  syncingCourseId: string | null;
  onSyncAll: () => void;
  syncingAll: boolean;
}

function CourseMappingTable({
  courses,
  aivoClassrooms,
  onLinkCourse,
  onUnlinkCourse,
  onSyncCourse,
  onToggleGradePassback,
  syncingCourseId,
  onSyncAll,
  syncingAll,
}: CourseMappingTableProps) {
  return (
    <Card
      title="Course Mapping"
      subtitle={`${courses.length} course${courses.length !== 1 ? 's' : ''}`}
    >
      {/* Actions bar */}
      <div className="flex items-center justify-end border-b border-border px-4 py-2">
        <Button
          className="text-sm gap-2"
          onClick={onSyncAll}
          disabled={syncingAll}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {syncingAll ? 'Syncing All…' : 'Sync All Courses'}
        </Button>
      </div>

      {courses.length === 0 ? (
        <div className="p-8 text-center text-muted">
          No Google Classroom courses found. Make sure your account is connected.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-muted text-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Course Name</th>
                <th className="px-4 py-3 text-left font-semibold">Section</th>
                <th className="px-4 py-3 text-left font-semibold">Linked AIVO Classroom</th>
                <th className="px-4 py-3 text-center font-semibold">Students</th>
                <th className="px-4 py-3 text-left font-semibold">Last Synced</th>
                <th className="px-4 py-3 text-center font-semibold">Grade Passback</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {courses.map((course) => (
                <tr key={course.id} className="transition hover:bg-surface-muted/80">
                  <td className="px-4 py-3 font-medium text-text">{course.name}</td>
                  <td className="px-4 py-3 text-muted">{course.section ?? '—'}</td>
                  <td className="px-4 py-3">
                    {course.linkedClassroomId ? (
                      <Badge tone="success">{course.linkedClassroomName ?? course.linkedClassroomId.slice(0, 8)}</Badge>
                    ) : (
                      <select
                        className="rounded border border-border bg-surface px-2 py-1 text-sm focus:border-primary focus:outline-none"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            onLinkCourse({
                              googleCourseId: course.id,
                              aivoClassroomId: e.target.value,
                            });
                          }
                        }}
                      >
                        <option value="" disabled>
                          Link to classroom…
                        </option>
                        {aivoClassrooms.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-muted">{course.studentCount}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {course.lastSyncedAt ? formatDateTime(course.lastSyncedAt) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={course.gradePassbackEnabled}
                        onChange={(e) => {
                          onToggleGradePassback(course.id, e.target.checked);
                        }}
                        className="peer sr-only"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-primary/20" />
                    </label>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        disabled={syncingCourseId === course.id}
                        onClick={() => {
                          onSyncCourse(course.id);
                        }}
                      >
                        {syncingCourseId === course.id ? 'Syncing…' : 'Sync Now'}
                      </Button>
                      {course.linkedClassroomId && (
                        <Button
                          variant="ghost"
                          className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
                          onClick={() => {
                            onUnlinkCourse(course.id);
                          }}
                        >
                          Unlink
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ---------- Sync History Table ---------- */

interface SyncHistoryTableProps {
  history: SyncHistoryEntry[];
  loading: boolean;
}

function SyncHistoryTable({ history, loading }: SyncHistoryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Card
      title="Sync History"
      subtitle={loading ? 'Loading…' : `${history.length} recent run${history.length !== 1 ? 's' : ''}`}
    >
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <span className="ml-3 text-sm text-muted">Loading sync history…</span>
        </div>
      ) : history.length === 0 ? (
        <div className="p-8 text-center text-muted">No sync runs recorded yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-muted text-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Added</th>
                <th className="px-4 py-3 text-center font-semibold">Removed</th>
                <th className="px-4 py-3 text-center font-semibold">Updated</th>
                <th className="px-4 py-3 text-center font-semibold">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {history.map((entry) => (
                <>
                  <tr
                    key={entry.id}
                    className={`transition hover:bg-surface-muted/80 ${
                      entry.errors.length > 0 ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => {
                      if (entry.errors.length > 0) {
                        setExpandedId((prev) => (prev === entry.id ? null : entry.id));
                      }
                    }}
                  >
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {formatDateTime(entry.date)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(entry.status)}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-green-700">
                      {entry.studentsAdded > 0 ? `+${entry.studentsAdded}` : '0'}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-red-700">
                      {entry.studentsRemoved > 0 ? `-${entry.studentsRemoved}` : '0'}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-blue-700">
                      {entry.studentsUpdated > 0 ? entry.studentsUpdated.toString() : '0'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {entry.errors.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
                          {entry.errors.length} error{entry.errors.length !== 1 ? 's' : ''}
                          <svg
                            className={`h-3 w-3 transition-transform ${
                              expandedId === entry.id ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                  {expandedId === entry.id && entry.errors.length > 0 && (
                    <tr key={`${entry.id}-errors`} className="bg-red-50/50">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="text-xs font-medium text-red-800 mb-1">Error Details:</div>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-red-700">
                          {entry.errors.map((err) => (
                            <li key={err}>{err}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function GoogleClassroomPage() {
  const { accessToken, tenantId } = useAuth();

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // Courses
  const [courses, setCourses] = useState<GoogleCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [aivoClassrooms, setAivoClassrooms] = useState<AivoClassroom[]>([]);

  // Sync
  const [syncingCourseId, setSyncingCourseId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  // Sync history
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Error
  const [error, setError] = useState<string | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────
  const headers = useCallback((): HeadersInit => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) h.Authorization = `Bearer ${accessToken}`;
    if (tenantId) h['x-tenant-id'] = tenantId;
    return h;
  }, [accessToken, tenantId]);

  // ── Fetch connection status ────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch(`${API}/status`, { headers: headers() });
      if (!res.ok) throw new Error(`Status check failed (${res.status})`);
      const data = (await res.json()) as ConnectionStatus;
      setConnectionStatus(data);
    } catch {
      setConnectionStatus({ connected: false, email: undefined, scopes: undefined, coursesLinked: 0, lastSyncAt: undefined });
    } finally {
      setStatusLoading(false);
    }
  }, [headers]);

  // ── Fetch courses ──────────────────────────────────────────────────────
  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const res = await fetch(`${API}/courses`, { headers: headers() });
      if (!res.ok) throw new Error(`Failed to fetch courses (${res.status})`);
      const data = (await res.json()) as { courses?: GoogleCourse[] };
      setCourses(data.courses ?? []);
    } catch {
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  }, [headers]);

  // ── Fetch AIVO classrooms for linking ──────────────────────────────────
  const fetchAivoClassrooms = useCallback(async () => {
    try {
      const res = await fetch(`/api/classrooms?tenantId=${tenantId ?? ''}`, {
        headers: headers(),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { classrooms?: AivoClassroom[]; items?: AivoClassroom[] };
      setAivoClassrooms(data.classrooms ?? data.items ?? []);
    } catch {
      // Non-critical — dropdown will be empty
    }
  }, [headers, tenantId]);

  // ── Fetch sync history ─────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/sync/history`, { headers: headers() });
      if (!res.ok) throw new Error(`Failed to fetch history (${res.status})`);
      const data = (await res.json()) as { history?: SyncHistoryEntry[] };
      setSyncHistory(data.history ?? []);
    } catch {
      setSyncHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [headers]);

  // ── Load all data on mount ─────────────────────────────────────────────
  useEffect(() => {
    void fetchStatus();
    void fetchCourses();
    void fetchAivoClassrooms();
    void fetchHistory();
  }, [fetchStatus, fetchCourses, fetchAivoClassrooms, fetchHistory]);

  // ── Connect ────────────────────────────────────────────────────────────
  const handleConnect = () => {
    setConnecting(true);
    // Redirect to OAuth flow — the backend returns the OAuth URL
    window.location.href = `${API}/auth/connect?tenantId=${tenantId ?? ''}`;
  };

  // ── Disconnect ─────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    try {
      const res = await fetch(`${API}/auth/disconnect`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (!res.ok) throw new Error('Disconnect failed');
      setConnectionStatus({ connected: false, email: undefined, scopes: undefined, coursesLinked: 0, lastSyncAt: undefined });
      setCourses([]);
      setSyncHistory([]);
    } catch {
      setError('Failed to disconnect Google Classroom');
    }
  };

  // ── Link course ────────────────────────────────────────────────────────
  const handleLinkCourse = async (payload: CourseMappingPayload) => {
    try {
      const res = await fetch(`${API}/mappings`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Linking failed');
      void fetchCourses();
    } catch {
      setError('Failed to link course');
    }
  };

  // ── Unlink course ──────────────────────────────────────────────────────
  const handleUnlinkCourse = async (courseId: string) => {
    try {
      const res = await fetch(`${API}/mappings/${courseId}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (!res.ok) throw new Error('Unlinking failed');
      void fetchCourses();
    } catch {
      setError('Failed to unlink course');
    }
  };

  // ── Sync single course ────────────────────────────────────────────────
  const handleSyncCourse = async (courseId: string) => {
    setSyncingCourseId(courseId);
    try {
      const res = await fetch(`${API}/courses/${courseId}/sync`, {
        method: 'POST',
        headers: headers(),
      });
      if (!res.ok) throw new Error('Sync failed');
      void fetchCourses();
      void fetchHistory();
    } catch {
      setError('Failed to sync course');
    } finally {
      setSyncingCourseId(null);
    }
  };

  // ── Sync all courses ──────────────────────────────────────────────────
  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch(`${API}/sync/all`, {
        method: 'POST',
        headers: headers(),
      });
      if (!res.ok) throw new Error('Sync all failed');
      void fetchCourses();
      void fetchHistory();
      void fetchStatus();
    } catch {
      setError('Failed to sync all courses');
    } finally {
      setSyncingAll(false);
    }
  };

  // ── Toggle grade passback ─────────────────────────────────────────────
  const handleToggleGradePassback = async (courseId: string, enabled: boolean) => {
    try {
      const res = await fetch(`${API}/grades/auto-sync`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ courseId, enabled }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId ? { ...c, gradePassbackEnabled: enabled } : c
        )
      );
    } catch {
      setError('Failed to update grade passback setting');
      // Revert optimistic update
      void fetchCourses();
    }
  };

  return (
    <section className="space-y-6" data-testid="google-classroom-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="Integrations" className="text-headline font-semibold">
          Google Classroom
        </Heading>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-red-800">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
              }}
              className="text-red-500 hover:text-red-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <ConnectionStatusCard
        status={connectionStatus}
        loading={statusLoading}
        onConnect={handleConnect}
        onDisconnect={() => {
          void handleDisconnect();
        }}
        connecting={connecting}
      />

      {/* Course Mapping — only show when connected */}
      {connectionStatus?.connected && (
        <>
          {coursesLoading ? (
            <Card>
              <div className="flex items-center justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                <span className="ml-3 text-sm text-muted">Loading courses…</span>
              </div>
            </Card>
          ) : (
            <CourseMappingTable
              courses={courses}
              aivoClassrooms={aivoClassrooms}
              onLinkCourse={(p) => {
                void handleLinkCourse(p);
              }}
              onUnlinkCourse={(id) => {
                void handleUnlinkCourse(id);
              }}
              onSyncCourse={(id) => {
                void handleSyncCourse(id);
              }}
              onToggleGradePassback={(id, enabled) => {
                void handleToggleGradePassback(id, enabled);
              }}
              syncingCourseId={syncingCourseId}
              onSyncAll={() => {
                void handleSyncAll();
              }}
              syncingAll={syncingAll}
            />
          )}

          {/* Sync History */}
          <SyncHistoryTable history={syncHistory} loading={historyLoading} />
        </>
      )}
    </section>
  );
}
