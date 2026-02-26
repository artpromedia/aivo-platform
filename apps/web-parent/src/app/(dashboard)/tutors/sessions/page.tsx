'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MessageSquare, BookOpen } from 'lucide-react';

import { TutorSessionReport } from '../components/tutor-session-report';

interface SessionSummary {
  id: string;
  subject: string;
  topic: string | null;
  persona: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  messageCount: number;
}

interface AnalyticsSummary {
  totalSessions: number;
  totalDurationSeconds: number;
  totalMessages: number;
  averageSessionDurationSeconds: number;
}

const API_BASE = process.env.NEXT_PUBLIC_TUTOR_API_URL ?? '/api/tutor';

export default function TutorSessionsPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        // TODO: Get actual learnerId from parent context
        const res = await fetch(`${API_BASE}/analytics?learnerId=demo&days=30`);
        if (res.ok) {
          const data = await res.json() as {
            summary: AnalyticsSummary;
            recentSessions: SessionSummary[];
          };
          setSummary(data.summary);
          setSessions(data.recentSessions);
        }
      } catch {
        // Use demo data
        setSessions([
          {
            id: '1',
            subject: 'MATH',
            topic: 'Fractions',
            persona: 'Nova',
            status: 'COMPLETED',
            startedAt: new Date(Date.now() - 86400000).toISOString(),
            endedAt: new Date(Date.now() - 84600000).toISOString(),
            durationSeconds: 1800,
            messageCount: 24,
          },
          {
            id: '2',
            subject: 'SCIENCE',
            topic: 'Water Cycle',
            persona: 'Spark',
            status: 'COMPLETED',
            startedAt: new Date(Date.now() - 172800000).toISOString(),
            endedAt: new Date(Date.now() - 171000000).toISOString(),
            durationSeconds: 1200,
            messageCount: 18,
          },
        ]);
        setSummary({
          totalSessions: 2,
          totalDurationSeconds: 3000,
          totalMessages: 42,
          averageSessionDurationSeconds: 1500,
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    return `${m} min`;
  };

  if (selectedSession) {
    return (
      <TutorSessionReport
        sessionId={selectedSession}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <a
        href="/tutors"
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Tutors
      </a>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tutor Session History</h1>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-sm text-gray-500">Total Sessions</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalSessions}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-sm text-gray-500">Total Time</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatDuration(summary.totalDurationSeconds)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-sm text-gray-500">Total Messages</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalMessages}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-sm text-gray-500">Avg. Session</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatDuration(summary.averageSessionDurationSeconds)}
            </p>
          </div>
        </div>
      )}

      {/* Session list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <BookOpen className="mx-auto h-12 w-12 mb-3 text-gray-300" />
          <p>No tutor sessions yet.</p>
          <p className="text-sm mt-1">Sessions will appear here once your child starts learning with a tutor.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSession(s.id)}
              className="flex w-full items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm text-left"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">
                    {s.persona} - {s.subject}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      s.status === 'COMPLETED'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                {s.topic && <p className="text-sm text-gray-500">{s.topic}</p>}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {formatDuration(s.durationSeconds)}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> {s.messageCount}
                </span>
                <span>{new Date(s.startedAt).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
