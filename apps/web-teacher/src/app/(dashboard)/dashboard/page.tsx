/**
 * Teacher Dashboard Page
 *
 * Main dashboard with overview of classes, metrics, analytics, and AI tools
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/lib/utils';

// Mock data - in production would fetch from API
const stats = [
  {
    title: 'Total Students',
    value: 127,
    change: { value: 5, label: 'this week' },
    trend: 'up' as const,
    icon: '👥',
    color: 'primary',
  },
  {
    title: 'Active Classes',
    value: 5,
    trend: 'neutral' as const,
    icon: '📚',
    color: 'secondary',
  },
  {
    title: 'Pending Grades',
    value: 23,
    change: { value: -8, label: 'from yesterday' },
    trend: 'down' as const,
    icon: '📝',
    color: 'warning',
  },
  {
    title: 'Unread Messages',
    value: 7,
    change: { value: 3, label: 'new' },
    trend: 'up' as const,
    icon: '✉️',
    color: 'info',
  },
];

const classPerformance = [
  { name: 'Algebra I - Period 1', average: 87, students: 28, trend: 'up' },
  { name: 'Algebra I - Period 3', average: 82, students: 26, trend: 'stable' },
  { name: 'Geometry - Period 2', average: 79, students: 24, trend: 'down' },
  { name: 'Pre-Calculus - Period 5', average: 91, students: 22, trend: 'up' },
  { name: 'Statistics - Period 6', average: 84, students: 27, trend: 'stable' },
];

const iepStudents = [
  { id: '1', name: 'Alex Smith', goals: 3, onTrack: 2, atRisk: 1, nextReview: '2026-01-25' },
  { id: '2', name: 'Jordan Lee', goals: 4, onTrack: 3, atRisk: 1, nextReview: '2026-02-10' },
  { id: '3', name: 'Taylor Brown', goals: 2, onTrack: 2, atRisk: 0, nextReview: '2026-02-15' },
];

const upcomingItems = [
  {
    id: '1',
    type: 'assignment',
    title: 'Algebra Quiz due',
    class: 'Algebra I',
    time: 'Tomorrow, 3:00 PM',
  },
  { id: '2', type: 'event', title: 'Parent-Teacher Conference', class: '', time: 'Wed, 4:00 PM' },
  {
    id: '3',
    type: 'assignment',
    title: 'Science Lab Report due',
    class: 'Biology',
    time: 'Thu, 11:59 PM',
  },
  { id: '4', type: 'meeting', title: 'IEP Meeting - Alex Smith', class: '', time: 'Fri, 2:00 PM' },
];

const recentActivity = [
  {
    id: '1',
    action: 'Submitted assignment',
    student: 'Emma Wilson',
    class: 'Algebra I',
    time: '5 min ago',
  },
  {
    id: '2',
    action: 'New message from',
    student: 'Parent: Sarah Johnson',
    class: '',
    time: '15 min ago',
  },
  {
    id: '3',
    action: 'Grade updated for',
    student: 'Michael Chen',
    class: 'Biology',
    time: '1 hour ago',
  },
  {
    id: '4',
    action: 'Submitted assignment',
    student: 'Olivia Brown',
    class: 'English',
    time: '2 hours ago',
  },
];

const atRiskStudents = [
  { id: '1', name: 'Michael Davis', class: 'Algebra I', issue: '3 missing assignments', severity: 'high' },
  { id: '2', name: 'Sarah Kim', class: 'Geometry', issue: 'Grade dropped 15%', severity: 'medium' },
  { id: '3', name: 'James Wilson', class: 'Pre-Calculus', issue: 'Low engagement', severity: 'low' },
];

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted uppercase tracking-wide font-medium">Welcome back</p>
          <h1 className="text-2xl font-bold text-text">{greeting}, Jane! 👋</h1>
          <p className="text-muted text-sm mt-1">{today}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/assignments/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            + New Assignment
          </Link>
          <Link
            href="/settings"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted transition-colors"
          >
            ⚙️ Settings
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* AI Tools Section */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-primary/5 to-accent/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
              🤖
            </div>
            <div>
              <h2 className="font-semibold text-text">AI-Powered Tools</h2>
              <p className="text-sm text-muted">Leverage AI to save time and improve outcomes</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AIToolCard
            href="/iep/create"
            icon="📋"
            title="AI IEP Creator"
            description="Generate personalized IEP goals"
            badge="New"
          />
          <AIToolCard
            href="/lessons/ai-generate"
            icon="📖"
            title="Lesson Generator"
            description="Create engaging lesson plans"
          />
          <AIToolCard
            href="/assessments/ai-create"
            icon="✏️"
            title="Quiz Builder"
            description="Generate assessments instantly"
          />
          <AIToolCard
            href="/feedback/ai-assist"
            icon="💬"
            title="Feedback Assistant"
            description="Personalized student feedback"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Class Performance */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-semibold text-text">Class Performance</h2>
              <Link href="/reports" className="text-sm text-primary hover:underline">
                View All Reports
              </Link>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {classPerformance.map((cls, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-text truncate">{cls.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text">{cls.average}%</span>
                          {cls.trend === 'up' && <span className="text-success text-xs">↑</span>}
                          {cls.trend === 'down' && <span className="text-error text-xs">↓</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              cls.average >= 85 ? 'bg-success' : cls.average >= 70 ? 'bg-warning' : 'bg-error'
                            )}
                            style={{ width: `${cls.average}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted">{cls.students} students</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* At Risk Students */}
        <div>
          <div className="rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-semibold text-text flex items-center gap-2">
                <span className="text-warning">⚠️</span> At-Risk Students
              </h2>
              <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning font-medium">
                {atRiskStudents.length} alerts
              </span>
            </div>
            <div className="divide-y divide-border">
              {atRiskStudents.map((student) => (
                <Link
                  key={student.id}
                  href={`/students/${student.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-surface-muted transition-colors"
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      student.severity === 'high' ? 'bg-error' : student.severity === 'medium' ? 'bg-warning' : 'bg-info'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text">{student.name}</p>
                    <p className="text-sm text-muted truncate">{student.issue}</p>
                  </div>
                  <span className="text-xs text-muted">{student.class}</span>
                </Link>
              ))}
            </div>
            <div className="p-3 border-t border-border">
              <Link href="/students?filter=at-risk" className="text-sm text-primary hover:underline block text-center">
                View all at-risk students
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* IEP Students Section */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <h2 className="font-semibold text-text">IEP Student Progress</h2>
              <p className="text-sm text-muted">{iepStudents.length} students with active IEP goals</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/iep/create"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              <span>🤖</span> AI Create IEP
            </Link>
            <Link href="/iep" className="text-sm text-primary hover:underline flex items-center">
              View All →
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50">
                <th className="text-left p-3 text-sm font-medium text-muted">Student</th>
                <th className="text-center p-3 text-sm font-medium text-muted">Goals</th>
                <th className="text-center p-3 text-sm font-medium text-muted">On Track</th>
                <th className="text-center p-3 text-sm font-medium text-muted">At Risk</th>
                <th className="text-left p-3 text-sm font-medium text-muted">Next Review</th>
                <th className="text-right p-3 text-sm font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {iepStudents.map((student) => (
                <tr key={student.id} className="hover:bg-surface-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium text-text">{student.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center text-text">{student.goals}</td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                      {student.onTrack}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {student.atRisk > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                        {student.atRisk}
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="p-3 text-muted text-sm">{formatDate(student.nextReview)}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/students/${student.id}/iep`}
                      className="text-sm text-primary hover:underline"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid: Upcoming & Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming */}
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-semibold text-text">📅 Upcoming</h2>
            <Link href="/calendar" className="text-sm text-primary hover:underline">
              View Calendar
            </Link>
          </div>
          <div className="divide-y divide-border">
            {upcomingItems.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-lg">
                  {item.type === 'assignment' && '📝'}
                  {item.type === 'event' && '📅'}
                  {item.type === 'meeting' && '👥'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-text">{item.title}</p>
                  {item.class && <p className="text-sm text-muted">{item.class}</p>}
                </div>
                <p className="text-sm text-muted">{item.time}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-semibold text-text">🕐 Recent Activity</h2>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="p-4">
                <p className="text-sm">
                  <span className="text-muted">{activity.action}</span>{' '}
                  <span className="font-medium text-text">{activity.student}</span>
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                  {activity.class && <span>{activity.class}</span>}
                  {activity.class && <span>·</span>}
                  <span>{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 font-semibold text-text">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/gradebook" icon="📊" title="Open Gradebook" description="Grade assignments" />
          <QuickAction href="/students" icon="👥" title="View Students" description="Manage roster" />
          <QuickAction href="/reports" icon="📈" title="Generate Reports" description="Progress reports" />
          <QuickAction href="/messages" icon="✉️" title="Messages" description="Parent communication" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  trend,
  icon,
}: {
  title: string;
  value: number;
  change?: { value: number; label: string };
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {trend !== 'neutral' && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              trend === 'up' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
            )}
          >
            {trend === 'up' ? '↑' : '↓'} {change?.value && Math.abs(change.value)}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-text">{value}</p>
      <p className="text-sm text-muted">{title}</p>
      {change && (
        <p className="mt-1 text-xs text-muted">
          {change.value > 0 ? '+' : ''}
          {change.value} {change.label}
        </p>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-md hover:border-primary/50"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-medium text-text">{title}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
    </Link>
  );
}

function AIToolCard({
  href,
  icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-all hover:shadow-md hover:border-primary/50 relative"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-text">{title}</p>
          {badge && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-white font-medium">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted">{description}</p>
      </div>
    </Link>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
