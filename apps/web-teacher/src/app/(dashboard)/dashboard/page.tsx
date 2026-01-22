/**
 * Teacher Dashboard Page
 *
 * Main dashboard with multi-class management, student monitoring, and comprehensive analytics
 * Sprint 9: Enhanced with ClassSelector, StudentRoster with IEP/504 support
 */

'use client';

import Link from 'next/link';
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

import {
  ClassSelector,
  QuickStats,
  InterventionAlerts,
  UpcomingLessons,
  RecentActivity,
  ClassPerformanceChart,
} from '@/components/classroom';
import { RealTimeMonitor } from '@/components/dashboard/real-time-monitor';
import { SELObservationRecorder } from '@/components/dashboard/sel-observation-recorder';
import { StudentRoster } from '@/components/students';
import { mockClasses, getClassDashboardData } from '@/lib/mock-data';
import type { Class, DashboardData } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSELRecorder, setShowSELRecorder] = useState(false);
  const [selectedStudentForSEL, setSelectedStudentForSEL] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'roster'>('overview');

  // Load classes on mount
  useEffect(() => {
    const loadClasses = async () => {
      // In production, this would be an API call
      // const teacherId = localStorage.getItem('user_id');
      // const { data } = await supabase.from('classes').select('*').eq('teacher_id', teacherId);

      setClasses(mockClasses);
      if (mockClasses.length > 0) {
        setSelectedClass(mockClasses[0]);
      }
      setIsLoading(false);
    };

    loadClasses();
  }, []);

  // Load dashboard data when class changes
  useEffect(() => {
    if (selectedClass) {
      const loadDashboardData = async () => {
        // In production, this would fetch from API
        const data = getClassDashboardData(selectedClass.id);
        setDashboardData(data);
      };

      loadDashboardData();
    }
  }, [selectedClass]);

  const handleClassChange = useCallback((cls: Class) => {
    setSelectedClass(cls);
  }, []);

  const handleStudentAction = useCallback(
    async (studentId: string, action: string) => {
      // Handle various student actions via API
      if (action === 'view_details') {
        window.location.href = `/students/${studentId}`;
        return;
      }
      if (action === 'send_message') {
        window.location.href = `/messages/new?studentId=${studentId}`;
        return;
      }
      if (action === 'sel_observation') {
        const student = selectedClass?.students?.find((s) => s.learnerId === studentId);
        if (student) {
          const learnerName =
            student.learner.name ??
            `${student.learner.firstName ?? ''} ${student.learner.lastName ?? ''}`.trim();
          setSelectedStudentForSEL({
            id: studentId,
            name: learnerName || 'Unknown',
          });
          setShowSELRecorder(true);
        }
      }
    },
    [selectedClass]
  );

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const greeting = getGreeting();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted uppercase tracking-wide font-medium">Welcome back</p>
          <h1 className="text-2xl font-bold text-text">{greeting}!</h1>
          <p className="text-muted text-sm mt-1">{today}</p>
        </div>

        <div className="flex items-center gap-3">
          <ClassSelector classes={classes} selected={selectedClass} onChange={handleClassChange} />
          <Link
            href="/assignments/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            + New Assignment
          </Link>
        </div>
      </div>

      {selectedClass && dashboardData && (
        <>
          {/* Quick Stats */}
          <QuickStats stats={dashboardData.stats} />

          {/* Intervention Alerts */}
          {dashboardData.alerts.length > 0 && (
            <InterventionAlerts
              alerts={dashboardData.alerts}
              onDismiss={async (alertId) => {
                await fetch(`/api/alerts/${alertId}/dismiss`, { method: 'POST' });
                setDashboardData((prev) =>
                  prev
                    ? {
                        ...prev,
                        alerts: prev.alerts.filter((a) => a.id !== alertId),
                      }
                    : null
                );
              }}
              onActionTaken={async (alertId, action) => {
                await fetch(`/api/alerts/${alertId}/action`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action }),
                });
                setDashboardData((prev) =>
                  prev
                    ? {
                        ...prev,
                        alerts: prev.alerts.map((a) =>
                          a.id === alertId ? { ...a, actionTaken: action } : a
                        ),
                      }
                    : null
                );
              }}
            />
          )}

          {/* View Toggle */}
          <div className="flex items-center gap-2 border-b border-border">
            <button
              onClick={() => {
                setActiveView('overview');
              }}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeView === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-text'
              )}
            >
              Class Overview
            </button>
            <button
              onClick={() => {
                setActiveView('roster');
              }}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeView === 'roster'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-text'
              )}
            >
              Student Roster
            </button>
          </div>

          {/* Main Content */}
          {activeView === 'overview' ? (
            <>
              {/* AI Tools Section */}
              <div className="rounded-xl border border-border bg-gradient-to-r from-primary/5 to-accent/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
                      <AIIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-text">AI-Powered Tools</h2>
                      <p className="text-sm text-muted">
                        Leverage AI to save time and improve outcomes
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <AIToolCard
                    href="/iep/create"
                    icon={<IEPIcon className="h-5 w-5" />}
                    title="AI IEP Creator"
                    description="Generate personalized IEP goals"
                    badge="New"
                  />
                  <AIToolCard
                    href="/lessons/ai-generate"
                    icon={<LessonIcon className="h-5 w-5" />}
                    title="Lesson Generator"
                    description="Create engaging lesson plans"
                  />
                  <AIToolCard
                    href="/assessments/ai-create"
                    icon={<QuizIcon className="h-5 w-5" />}
                    title="Quiz Builder"
                    description="Generate assessments instantly"
                  />
                  <AIToolCard
                    href="/feedback/ai-assist"
                    icon={<FeedbackIcon className="h-5 w-5" />}
                    title="Feedback Assistant"
                    description="Personalized student feedback"
                  />
                </div>
              </div>

              {/* Real-Time & SEL Section */}
              <div className="grid gap-6 lg:grid-cols-2">
                <RealTimeMonitor
                  onStudentClick={(student) => {
                    window.location.href = `/students/${student.id}`;
                  }}
                  onSendMessage={(studentId) => {
                    window.location.href = `/messages/new?studentId=${studentId}`;
                  }}
                />

                {/* SEL Quick Actions */}
                <div className="rounded-xl border border-border bg-surface">
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <div className="flex items-center gap-3">
                      <HeartIcon className="h-5 w-5 text-pink-500" />
                      <div>
                        <h2 className="font-semibold text-text">SEL Observations</h2>
                        <p className="text-sm text-muted">
                          Record social-emotional learning moments
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowSELRecorder(true);
                      }}
                      className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                    >
                      + New Observation
                    </button>
                  </div>
                  <div className="p-4">
                    <SELObservationsList />
                  </div>
                </div>
              </div>

              {/* Performance & Schedule */}
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <ClassPerformanceChart data={dashboardData.performance} />
                </div>
                <div>
                  <UpcomingLessons
                    lessons={dashboardData.lessons}
                    events={dashboardData.upcomingEvents}
                  />
                </div>
              </div>

              {/* Activity */}
              <div className="grid gap-6 lg:grid-cols-2">
                <RecentActivity activities={dashboardData.activities} />

                {/* Quick Actions */}
                <div className="rounded-xl border border-border bg-surface p-4">
                  <h2 className="font-semibold text-text mb-4">Quick Actions</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <QuickAction
                      href="/gradebook"
                      icon={<GradebookIcon className="h-5 w-5" />}
                      title="Open Gradebook"
                      description="Grade assignments"
                    />
                    <QuickAction
                      href="/students"
                      icon={<StudentsIcon className="h-5 w-5" />}
                      title="View Students"
                      description="Manage roster"
                    />
                    <QuickAction
                      href="/reports"
                      icon={<ReportsIcon className="h-5 w-5" />}
                      title="Generate Reports"
                      description="Progress reports"
                    />
                    <QuickAction
                      href="/messages"
                      icon={<MessagesIcon className="h-5 w-5" />}
                      title="Messages"
                      description="Parent communication"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Student Roster View */
            <StudentRoster
              students={selectedClass.students || []}
              classId={selectedClass.id}
              onStudentAction={handleStudentAction}
            />
          )}
        </>
      )}

      {/* SEL Observation Modal */}
      {showSELRecorder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <SELObservationRecorder
              studentId={selectedStudentForSEL?.id || ''}
              studentName={selectedStudentForSEL?.name || 'Select Student'}
              isOpen={showSELRecorder}
              onSubmit={async (observation) => {
                await fetch('/api/sel/observations', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...observation,
                    studentId: selectedStudentForSEL?.id,
                    classId: selectedClass?.id,
                  }),
                });
                setShowSELRecorder(false);
                setSelectedStudentForSEL(null);
              }}
              onCancel={() => {
                setShowSELRecorder(false);
                setSelectedStudentForSEL(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components

function SELObservationsList() {
  const observations = [
    {
      id: '1',
      studentName: 'Emma Wilson',
      competency: 'Self-Management',
      level: 'Independent',
      time: 'Today, 10:30 AM',
      note: 'Showed excellent focus during independent work',
      color: 'green',
    },
    {
      id: '2',
      studentName: 'Liam Chen',
      competency: 'Relationship Skills',
      level: 'With Support',
      time: 'Today, 9:15 AM',
      note: 'Working on group collaboration skills',
      color: 'blue',
    },
    {
      id: '3',
      studentName: 'Sophia Martinez',
      competency: 'Social Awareness',
      level: 'Prompted',
      time: 'Yesterday',
      note: 'Follow-up needed',
      color: 'amber',
      followUp: true,
    },
  ];

  return (
    <div className="space-y-3">
      {observations.map((obs) => (
        <div
          key={obs.id}
          className={cn(
            'p-3 rounded-lg border',
            obs.color === 'green' && 'bg-green-50 border-green-200',
            obs.color === 'blue' && 'bg-blue-50 border-blue-200',
            obs.color === 'amber' && 'bg-amber-50 border-amber-200'
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={cn(
                'font-medium',
                obs.color === 'green' && 'text-green-800',
                obs.color === 'blue' && 'text-blue-800',
                obs.color === 'amber' && 'text-amber-800'
              )}
            >
              {obs.studentName}
            </span>
            <span
              className={cn(
                'text-xs',
                obs.color === 'green' && 'text-green-600',
                obs.color === 'blue' && 'text-blue-600',
                obs.color === 'amber' && 'text-amber-600'
              )}
            >
              {obs.time}
            </span>
          </div>
          <p
            className={cn(
              'text-sm',
              obs.color === 'green' && 'text-green-700',
              obs.color === 'blue' && 'text-blue-700',
              obs.color === 'amber' && 'text-amber-700'
            )}
          >
            {obs.competency} - {obs.level}
          </p>
          <p
            className={cn(
              'text-xs mt-1',
              obs.color === 'green' && 'text-green-600',
              obs.color === 'blue' && 'text-blue-600',
              obs.color === 'amber' && 'text-amber-600'
            )}
          >
            {obs.followUp ? '! ' : ''}
            {obs.note}
          </p>
        </div>
      ))}
      <Link
        href="/sel/observations"
        className="block text-center text-sm text-primary hover:underline pt-2"
      >
        View All SEL Observations
      </Link>
    </div>
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
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-all hover:shadow-md hover:border-primary/50 relative"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="flex-1">
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

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-all hover:shadow-md hover:border-primary/50"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted text-text">
        {icon}
      </div>
      <div>
        <p className="font-medium text-text text-sm">{title}</p>
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

// Icons
function AIIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function IEPIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function LessonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function QuizIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function FeedbackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function GradebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  );
}

function StudentsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function ReportsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function MessagesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}
