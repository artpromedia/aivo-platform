'use client';

import { useState, useEffect } from 'react';

export interface ClassroomEngagementStats {
  classroomId: string;
  classroomName: string;
  averageLevel: number;
  totalBadgesEarned: number;
  activeStreaks: number;
  averageStreakDays: number;
  kudosSent: number;
  topBadges: { code: string; name: string; icon: string; count: number }[];
  recentActivity: {
    learnerId: string;
    learnerName: string;
    type: 'badge' | 'level_up' | 'streak_milestone';
    description: string;
    occurredAt: string;
  }[];
}

export interface StudentEngagementSummary {
  learnerId: string;
  learnerName: string;
  level: number;
  totalXp: number;
  streakDays: number;
  badgesEarned: number;
  lastActivityAt: string | null;
}

interface ClassroomEngagementCardProps {
  classroomId: string;
  classroomName: string;
}

export function ClassroomEngagementCard({
  classroomId,
  classroomName,
}: ClassroomEngagementCardProps) {
  const [stats, setStats] = useState<ClassroomEngagementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [classroomId]);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/engagement/classrooms/${classroomId}/stats`);
      if (!res.ok) throw new Error('Failed to fetch engagement stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <span className="text-red-500">⚠️</span>
          <span className="text-red-700">{error}</span>
          <button
            onClick={fetchStats}
            className="ml-auto text-sm text-red-600 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Classroom Engagement</h3>
        <span className="text-sm text-muted">{classroomName}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon="⭐"
          label="Avg Level"
          value={stats.averageLevel.toFixed(1)}
        />
        <StatCard
          icon="🏆"
          label="Badges Earned"
          value={stats.totalBadgesEarned.toString()}
        />
        <StatCard
          icon="🔥"
          label="Active Streaks"
          value={stats.activeStreaks.toString()}
        />
        <StatCard
          icon="💖"
          label="Kudos Sent"
          value={stats.kudosSent.toString()}
        />
      </div>

      {/* Top badges */}
      {stats.topBadges.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted mb-3">Popular Badges</h4>
          <div className="flex gap-3 flex-wrap">
            {stats.topBadges.slice(0, 5).map((badge) => (
              <div
                key={badge.code}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200"
              >
                <span className="text-lg">{badge.icon}</span>
                <span className="text-sm font-medium">{badge.name}</span>
                <span className="text-xs text-muted">×{badge.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {stats.recentActivity.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted mb-3">Recent Achievements</h4>
          <div className="space-y-2">
            {stats.recentActivity.slice(0, 5).map((activity, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-border last:border-0"
              >
                <span className="text-lg">
                  {activity.type === 'badge'
                    ? '🏆'
                    : activity.type === 'level_up'
                      ? '⬆️'
                      : '🔥'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {activity.learnerName}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {activity.description}
                  </p>
                </div>
                <span className="text-xs text-muted whitespace-nowrap">
                  {formatTimeAgo(activity.occurredAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-lg bg-gray-50 p-4 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-xl font-bold mt-1">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface StudentEngagementTableProps {
  students: StudentEngagementSummary[];
  onSendKudos?: (learnerId: string, learnerName: string) => void;
}

export function StudentEngagementTable({
  students,
  onSendKudos,
}: StudentEngagementTableProps) {
  const sortedStudents = [...students].sort((a, b) => b.totalXp - a.totalXp);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold">Student Engagement</h3>
        <p className="text-sm text-muted">
          Track individual progress and send encouragement
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Student</th>
              <th className="px-4 py-3 text-center font-medium">Level</th>
              <th className="px-4 py-3 text-center font-medium">XP</th>
              <th className="px-4 py-3 text-center font-medium">Streak</th>
              <th className="px-4 py-3 text-center font-medium">Badges</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((student) => (
              <tr
                key={student.learnerId}
                className="border-b border-border last:border-0 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {student.learnerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{student.learnerName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1">
                    <span className="text-amber-500">⭐</span>
                    {student.level}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-medium">
                  {student.totalXp.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  {student.streakDays > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-orange-500">🔥</span>
                      {student.streakDays}d
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1">
                    <span>🏆</span>
                    {student.badgesEarned}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {onSendKudos && (
                    <button
                      onClick={() =>
                        onSendKudos(student.learnerId, student.learnerName)
                      }
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors"
                    >
                      💖 Send Kudos
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 && (
        <div className="p-8 text-center text-muted">
          No student engagement data available yet.
        </div>
      )}
    </div>
  );
}

interface SendKudosDialogProps {
  learnerId: string;
  learnerName: string;
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: string) => Promise<void>;
}

export function SendKudosDialog({
  learnerName,
  isOpen,
  onClose,
  onSend,
}: SendKudosDialogProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const quickMessages = [
    'Great work today! 🌟',
    "I'm proud of your progress! 💪",
    'Keep up the amazing effort! 🎉',
    "You're doing fantastic! ⭐",
  ];

  if (!isOpen) return null;

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      await onSend(message);
      setMessage('');
      onClose();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">
          Send Kudos to {learnerName}
        </h3>

        <p className="text-sm text-muted mb-3">
          Send an encouraging message:
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {quickMessages.map((msg) => (
            <button
              key={msg}
              onClick={() => setMessage(msg)}
              className="px-3 py-1.5 text-sm rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {msg}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Or write your own message..."
          className="w-full border border-border rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary"
          maxLength={280}
        />

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <span>💖</span>
            )}
            Send Kudos
          </button>
        </div>
      </div>
    </div>
  );
}
