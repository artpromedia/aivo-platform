/**
 * Teacher Dashboard Page
 *
 * Main dashboard with overview of classes, upcoming, and alerts
 */

import Link from 'next/link';
import * as React from 'react';

import { StatCard } from '@/components/analytics/progress-chart';
import { PageHeader } from '@/components/layout/breadcrumb';

// Mock data - in production would fetch from API
const stats = [
  {
    title: 'Total Students',
    value: 127,
    change: { value: 5, label: 'this week' },
    trend: 'up' as const,
  },
  { title: 'Active Classes', value: 5, trend: 'neutral' as const },
  {
    title: 'Pending Grades',
    value: 23,
    change: { value: -8, label: 'from yesterday' },
    trend: 'down' as const,
  },
  { title: 'Unread Messages', value: 7, change: { value: 3, label: 'new' }, trend: 'up' as const },
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

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      <PageHeader
        title="Good morning, Jane! 👋"
        description={today}
        actions={
          <Link
            href="/assignments/new"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + New Assignment
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Upcoming */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-white">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold text-gray-900">Upcoming</h2>
              <Link href="/calendar" className="text-sm text-primary-600 hover:underline">
                View Calendar
              </Link>
            </div>
            <div className="divide-y">
              {upcomingItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-lg">
                    {item.type === 'assignment' && '📝'}
                    {item.type === 'event' && '📅'}
                    {item.type === 'meeting' && '👥'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    {item.class && <p className="text-sm text-gray-500">{item.class}</p>}
                  </div>
                  <p className="text-sm text-gray-500">{item.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="rounded-xl border bg-white">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="divide-y">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-4">
                  <p className="text-sm">
                    <span className="text-gray-500">{activity.action}</span>{' '}
                    <span className="font-medium text-gray-900">{activity.student}</span>
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                    {activity.class && <span>{activity.class}</span>}
                    {activity.class && <span>·</span>}
                    <span>{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h2 className="mb-4 font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/gradebook"
            icon="📊"
            title="Open Gradebook"
            description="Grade assignments"
          />
          <QuickAction
            href="/students"
            icon="👥"
            title="View Students"
            description="Manage roster"
          />
          <QuickAction
            href="/reports"
            icon="📈"
            title="Generate Reports"
            description="Progress reports"
          />
          <QuickAction
            href="/messages"
            icon="✉️"
            title="Messages"
            description="Parent communication"
          />
        </div>
      </div>
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
      className="flex items-center gap-4 rounded-xl border bg-white p-4 transition-shadow hover:shadow-md"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}
