/**
 * Monitoring Page
 *
 * Real-time monitoring dashboard for student activity, progress,
 * and focus states during learning sessions.
 */

'use client';

import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';

interface StudentSession {
  id: string;
  studentName: string;
  avatarUrl?: string;
  currentActivity: string;
  subject: string;
  startTime: string;
  duration: number;
  progress: number;
  focusState: 'focused' | 'distracted' | 'idle' | 'break';
  needsHelp: boolean;
  recentScore?: number;
}

// Mock active session data
const mockActiveSessions: StudentSession[] = [
  {
    id: '1',
    studentName: 'Emma Wilson',
    currentActivity: 'Fraction Addition Practice',
    subject: 'Math',
    startTime: '10:15 AM',
    duration: 18,
    progress: 65,
    focusState: 'focused',
    needsHelp: false,
    recentScore: 92,
  },
  {
    id: '2',
    studentName: 'Michael Chen',
    currentActivity: 'Reading Comprehension Quiz',
    subject: 'Reading',
    startTime: '10:20 AM',
    duration: 13,
    progress: 40,
    focusState: 'focused',
    needsHelp: false,
    recentScore: 85,
  },
  {
    id: '3',
    studentName: 'Olivia Brown',
    currentActivity: 'Multiplication Facts',
    subject: 'Math',
    startTime: '10:12 AM',
    duration: 21,
    progress: 80,
    focusState: 'distracted',
    needsHelp: true,
  },
  {
    id: '4',
    studentName: 'Alex Smith',
    currentActivity: 'Vocabulary Matching',
    subject: 'Reading',
    startTime: '10:25 AM',
    duration: 8,
    progress: 25,
    focusState: 'focused',
    needsHelp: false,
    recentScore: 78,
  },
  {
    id: '5',
    studentName: 'Sarah Johnson',
    currentActivity: 'Breathing Exercise',
    subject: 'Focus Break',
    startTime: '10:28 AM',
    duration: 2,
    progress: 50,
    focusState: 'break',
    needsHelp: false,
  },
  {
    id: '6',
    studentName: 'James Miller',
    currentActivity: 'Word Problems',
    subject: 'Math',
    startTime: '10:10 AM',
    duration: 23,
    progress: 55,
    focusState: 'idle',
    needsHelp: true,
  },
];

const focusStateConfig = {
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
  const [sessions] = React.useState(mockActiveSessions);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');

  const needsHelpCount = sessions.filter((s) => s.needsHelp).length;
  const focusedCount = sessions.filter((s) => s.focusState === 'focused').length;
  const avgProgress = Math.round(
    sessions.reduce((sum, s) => sum + s.progress, 0) / sessions.length
  );

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
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session }: { session: StudentSession }) {
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
        <button className="mt-3 w-full rounded-lg bg-red-50 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
          🙋 Offer Help
        </button>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: StudentSession }) {
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
        <button className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">
          Help
        </button>
      )}
    </div>
  );
}
