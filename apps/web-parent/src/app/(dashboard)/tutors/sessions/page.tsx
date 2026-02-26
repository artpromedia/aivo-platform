'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  BookOpen,
  BarChart3,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';

/* ─── Types ─── */

interface SubjectBreakdown {
  subject: string;
  sessions: number;
  minutes: number;
  topTopics: string[];
  color: string;
}

interface WeeklyUsage {
  week: string;
  sessions: number;
  minutes: number;
}

interface LearnerSummary {
  learnerId: string;
  totalSessions: number;
  totalMinutes: number;
  favoriteSubject: string | null;
  lastSessionAt: string | null;
}

interface AnalyticsSummary {
  totalSessions: number;
  totalMinutes: number;
  totalMessages: number;
  averageSessionMinutes: number;
  subjectBreakdown: SubjectBreakdown[];
  weeklyUsage: WeeklyUsage[];
  learners: LearnerSummary[];
}

interface SessionItem {
  id: string;
  subject: string;
  persona: { name: string; slug: string; avatar: string | null };
  topic: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  messageCount: number;
  locale: string;
  status: string;
  color: string;
}

interface TranscriptMessage {
  id: string;
  role: string;
  content: string;
  emotion: string | null;
  createdAt: string;
}

/* ─── Constants ─── */

const API_BASE = process.env.NEXT_PUBLIC_TUTOR_API_URL ?? '/api/tutor';

const SUBJECT_LABELS: Record<string, string> = {
  MATH: 'Mathematics',
  ELA: 'Reading & Writing',
  SCIENCE: 'Science',
  HISTORY: 'History',
  CODING: 'Coding',
};

/* ─── Page Component ─── */

export default function TutorSessionsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [page, setPage] = useState(1);
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);

  // Load summary
  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch(`${API_BASE}/analytics/summary?days=30`);
        if (res.ok) {
          setSummary(await res.json());
        }
      } catch {
        // silent fail — empty state shown
      } finally {
        setIsLoadingSummary(false);
      }
    }
    loadSummary();
  }, []);

  // Load paginated sessions
  useEffect(() => {
    async function loadSessions() {
      setIsLoadingSessions(true);
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: '20' });
        if (subjectFilter) params.set('subject', subjectFilter);
        // Use first learner if available
        if (summary?.learners[0]?.learnerId) {
          params.set('learnerId', summary.learners[0].learnerId);
        }
        const res = await fetch(`${API_BASE}/analytics/sessions?${params}`);
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions);
          setTotalSessions(data.total);
        }
      } catch {
        // silent
      } finally {
        setIsLoadingSessions(false);
      }
    }
    if (!isLoadingSummary) loadSessions();
  }, [page, subjectFilter, summary, isLoadingSummary]);

  const loadTranscript = useCallback(async (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      return;
    }
    setExpandedSessionId(sessionId);
    setIsLoadingTranscript(true);
    try {
      const res = await fetch(`${API_BASE}/analytics/sessions/${sessionId}/transcript`);
      if (res.ok) {
        const data = await res.json();
        setTranscript(data.messages);
      }
    } catch {
      setTranscript([]);
    } finally {
      setIsLoadingTranscript(false);
    }
  }, [expandedSessionId]);

  const formatDuration = (minutes: number) => {
    if (minutes < 1) return '<1 min';
    if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${minutes} min`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <a
        href="/tutors"
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Tutors
      </a>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tutor Session Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          See how your child is using AI tutoring and what they&apos;re learning.
        </p>
      </div>

      {/* ── Summary Cards ─── */}
      {isLoadingSummary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            icon={<BarChart3 className="h-5 w-5 text-indigo-600" />}
            label="Total Sessions"
            value={String(summary.totalSessions)}
            bg="bg-indigo-50"
          />
          <SummaryCard
            icon={<Clock className="h-5 w-5 text-emerald-600" />}
            label="Total Time"
            value={formatDuration(summary.totalMinutes)}
            bg="bg-emerald-50"
          />
          <SummaryCard
            icon={<MessageSquare className="h-5 w-5 text-purple-600" />}
            label="Messages"
            value={String(summary.totalMessages)}
            bg="bg-purple-50"
          />
          <SummaryCard
            icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
            label="Avg. Session"
            value={formatDuration(summary.averageSessionMinutes)}
            bg="bg-amber-50"
          />
        </div>
      ) : null}

      {/* ── Weekly Usage Chart ─── */}
      {summary && summary.weeklyUsage.length > 0 && (
        <div className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Usage</h2>
          <WeeklyChart data={summary.weeklyUsage} />
        </div>
      )}

      {/* ── Subject Breakdown ─── */}
      {summary && summary.subjectBreakdown.length > 0 && (
        <div className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Time by Subject</h2>
          <div className="space-y-3">
            {summary.subjectBreakdown.map((s) => {
              const maxMin = Math.max(...summary.subjectBreakdown.map((x) => x.minutes), 1);
              return (
                <div key={s.subject} className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-gray-700 truncate">
                    {SUBJECT_LABELS[s.subject] ?? s.subject}
                  </span>
                  <div className="flex-1 h-6 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(s.minutes / maxMin) * 100}%`,
                        backgroundColor: s.color,
                      }}
                    />
                  </div>
                  <span className="w-20 text-sm text-gray-500 text-right">
                    {s.minutes} min
                  </span>
                  <span className="w-16 text-sm text-gray-400 text-right">
                    {s.sessions} sess.
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Per-Learner Cards ─── */}
      {summary && summary.learners.length > 1 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" /> Per Child
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.learners.map((l) => (
              <div
                key={l.learnerId}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{l.learnerId.slice(0, 8)}...</p>
                    <p className="text-sm text-gray-500">
                      {l.totalSessions} sessions &middot; {formatDuration(l.totalMinutes)}
                    </p>
                  </div>
                  {l.favoriteSubject && (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {SUBJECT_LABELS[l.favoriteSubject] ?? l.favoriteSubject}
                    </span>
                  )}
                </div>
                {l.lastSessionAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    Last session: {new Date(l.lastSessionAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Session List ─── */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Session History</h2>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={subjectFilter}
              onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All Subjects</option>
              {Object.entries(SUBJECT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoadingSessions ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-50" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500 px-6">
            <BookOpen className="mx-auto h-12 w-12 mb-3 text-gray-300" />
            <p>No tutor sessions yet.</p>
            <p className="text-sm mt-1">Sessions will appear here once your child starts learning with a tutor.</p>
          </div>
        ) : (
          <div>
            {sessions.map((s) => (
              <div key={s.id} className="border-b border-gray-50 last:border-0">
                <button
                  onClick={() => loadTranscript(s.id)}
                  className="flex w-full items-center gap-4 px-6 py-4 transition hover:bg-gray-50 text-left"
                >
                  {/* Subject badge */}
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.subject.slice(0, 2)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {s.persona.name}
                      </h3>
                      <span className="rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-600">
                        {SUBJECT_LABELS[s.subject] ?? s.subject}
                      </span>
                      {s.status === 'COMPLETED' && (
                        <span className="rounded-full px-2 py-0.5 text-xs bg-green-50 text-green-700">
                          Completed
                        </span>
                      )}
                    </div>
                    {s.topic && <p className="text-sm text-gray-500 truncate">{s.topic}</p>}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 shrink-0">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {formatDuration(s.durationMinutes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" /> {s.messageCount}
                    </span>
                    <span className="hidden md:inline">{new Date(s.startedAt).toLocaleDateString()}</span>
                    {expandedSessionId === s.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Expanded transcript */}
                {expandedSessionId === s.id && (
                  <div className="px-6 pb-4">
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 max-h-80 overflow-y-auto">
                      {isLoadingTranscript ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
                          ))}
                        </div>
                      ) : transcript.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No messages to display.</p>
                      ) : (
                        <div className="space-y-2">
                          {transcript.map((msg) => (
                            <div
                              key={msg.id}
                              className={`rounded-lg p-3 ${
                                msg.role === 'USER'
                                  ? 'bg-indigo-50 border border-indigo-100 ml-8'
                                  : 'bg-white border border-gray-100 mr-8'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-medium text-gray-500">
                                  {msg.role === 'USER' ? 'Your child' : s.persona.name}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {totalSessions > 20 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, totalSessions)} of {totalSessions}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * 20 >= totalSessions}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Summary Card ─── */

function SummaryCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${bg}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Weekly Bar Chart (SVG) ─── */

function WeeklyChart({ data }: { data: WeeklyUsage[] }) {
  const maxSessions = Math.max(...data.map((d) => d.sessions), 1);
  const barWidth = 40;
  const gap = 12;
  const chartHeight = 120;
  const chartWidth = data.length * (barWidth + gap);

  return (
    <div className="overflow-x-auto">
      <svg width={chartWidth} height={chartHeight + 30} className="mx-auto">
        {data.map((d, i) => {
          const x = i * (barWidth + gap);
          const barHeight = (d.sessions / maxSessions) * chartHeight;
          const weekLabel = new Date(d.week).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          });
          return (
            <g key={d.week}>
              <rect
                x={x}
                y={chartHeight - barHeight}
                width={barWidth}
                height={barHeight}
                rx={4}
                className="fill-indigo-500"
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight - barHeight - 6}
                textAnchor="middle"
                className="fill-gray-600 text-xs"
                fontSize={11}
              >
                {d.sessions}
              </text>
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                className="fill-gray-400 text-xs"
                fontSize={10}
              >
                {weekLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
