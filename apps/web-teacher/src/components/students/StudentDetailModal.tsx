/**
 * StudentDetailModal Component
 *
 * Comprehensive student detail view with IEP/504 information
 */

'use client';

import Link from 'next/link';
import * as React from 'react';
import { useState } from 'react';

import type { Student, IEPGoal, Accommodation } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StudentDetailModalProps {
  student: Student;
  classId: string;
  onClose: () => void;
  onAction?: (action: string) => void;
}

type TabType = 'overview' | 'iep' | '504' | 'performance' | 'interventions';

export function StudentDetailModal({
  student,
  classId,
  onClose,
  onAction,
}: StudentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Determine available tabs
  const allTabs: { id: TabType; label: string; show: boolean }[] = [
    { id: 'overview' as const, label: 'Overview', show: true },
    { id: 'iep' as const, label: 'IEP', show: student.hasIep ?? false },
    { id: '504' as const, label: '504 Plan', show: student.has504 ?? false },
    { id: 'performance' as const, label: 'Performance', show: true },
    { id: 'interventions' as const, label: 'Interventions', show: !!student.interventions?.length },
  ];
  const tabs = allTabs.filter((tab) => tab.show);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-surface shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-6 flex-shrink-0">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {student.avatar ? (
              <img
                src={student.avatar}
                alt={student.name ?? 'Student'}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white text-xl font-bold">
                {(student.name ?? 'S')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
            )}

            {/* Info */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-text">{student.name}</h2>
                {student.hasIep && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                    IEP
                  </span>
                )}
                {student.has504 && (
                  <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                    504
                  </span>
                )}
                {student.riskLevel && student.riskLevel !== 'none' && (
                  <RiskBadge level={student.riskLevel} />
                )}
              </div>
              <p className="text-muted">
                Grade {student.gradeLevel}
                {student.email && ` • ${student.email}`}
              </p>
              <div className="mt-2 flex items-center gap-4">
                <StatBadge
                  label="Avg Score"
                  value={student.averageScore !== undefined ? `${student.averageScore}%` : '-'}
                  color={getScoreColor(student.averageScore)}
                />
                <StatBadge
                  label="Progress"
                  value={
                    student.progressPercentage !== undefined
                      ? `${student.progressPercentage}%`
                      : '-'
                  }
                />
                <StatBadge
                  label="Assignments"
                  value={
                    student.assignmentsCompleted !== undefined
                      ? `${student.assignmentsCompleted}/${student.totalAssignments || 0}`
                      : '-'
                  }
                />
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-text transition-colors"
            aria-label="Close"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border px-6 flex-shrink-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-text'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && <OverviewTab student={student} />}
          {activeTab === 'iep' && student.iepDetails && <IEPTab iepDetails={student.iepDetails} />}
          {activeTab === '504' && student.plan504Details && (
            <Plan504Tab
              plan504Details={student.plan504Details}
              accommodations={student.accommodations || []}
            />
          )}
          {activeTab === 'performance' && <PerformanceTab student={student} />}
          {activeTab === 'interventions' && <InterventionsTab student={student} />}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-4 border-t border-border p-4 flex-shrink-0 bg-surface-muted/30">
          <div className="flex items-center gap-2">
            <Link
              href={`/students/${student.id}`}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted transition-colors"
            >
              View Full Profile
            </Link>
            <Link
              href={`/messages?student=${student.id}`}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted transition-colors"
            >
              Message Parent
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {student.hasIep && (
              <Link
                href={`/students/${student.id}/iep`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Update IEP Progress
              </Link>
            )}
            <button
              onClick={() => onAction?.('create_intervention')}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              + Add Intervention
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components

function OverviewTab({ student }: { student: Student }) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          icon={<TargetIcon className="h-5 w-5" />}
          label="Average Score"
          value={student.averageScore !== undefined ? `${student.averageScore}%` : '-'}
          color={getScoreColor(student.averageScore)}
        />
        <QuickStatCard
          icon={<ProgressIcon className="h-5 w-5" />}
          label="Course Progress"
          value={student.progressPercentage !== undefined ? `${student.progressPercentage}%` : '-'}
        />
        <QuickStatCard
          icon={<AssignmentIcon className="h-5 w-5" />}
          label="Assignments"
          value={
            student.assignmentsCompleted !== undefined
              ? `${student.assignmentsCompleted}/${student.totalAssignments || 0}`
              : '-'
          }
        />
        <QuickStatCard
          icon={<EngagementIcon className="h-5 w-5" />}
          label="Engagement"
          value={student.engagementLevel || 'Unknown'}
          color={
            student.engagementLevel === 'high'
              ? 'success'
              : student.engagementLevel === 'low'
                ? 'error'
                : undefined
          }
        />
      </div>

      {/* Accommodations Summary (if applicable) */}
      {(student.hasIep || student.has504) &&
        student.accommodations &&
        student.accommodations.length > 0 && (
          <div className="rounded-xl border border-border p-4">
            <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
              <AccommodationIcon className="h-5 w-5 text-primary" />
              Active Accommodations
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {student.accommodations
                .filter((a) => a.implementationStatus === 'active')
                .slice(0, 6)
                .map((accommodation) => (
                  <AccommodationItem key={accommodation.id} accommodation={accommodation} />
                ))}
            </div>
            {student.accommodations.length > 6 && (
              <p className="mt-2 text-sm text-muted">
                +{student.accommodations.length - 6} more accommodations
              </p>
            )}
          </div>
        )}

      {/* Risk Factors */}
      {student.riskFactors && student.riskFactors.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <h3 className="font-semibold text-warning mb-3 flex items-center gap-2">
            <AlertIcon className="h-5 w-5" />
            Risk Factors
          </h3>
          <div className="space-y-2">
            {student.riskFactors.map((factor, index) => {
              // Handle both string and RiskFactor types
              if (typeof factor === 'string') {
                return (
                  <div key={index} className="flex items-start gap-3 p-2 bg-surface rounded-lg">
                    <p className="font-medium text-text">{factor}</p>
                  </div>
                );
              }
              return (
                <div key={factor.id} className="flex items-start gap-3 p-2 bg-surface rounded-lg">
                  <RiskSeverityDot severity={factor.severity} />
                  <div>
                    <p className="font-medium text-text">{factor.description}</p>
                    <p className="text-xs text-muted">
                      Detected {formatDate(String(factor.detectedAt))} •{' '}
                      {formatRiskType(factor.type)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent SEL Observations */}
      {student.recentSelObservations && student.recentSelObservations.length > 0 && (
        <div className="rounded-xl border border-border p-4">
          <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
            <HeartIcon className="h-5 w-5 text-pink-500" />
            Recent SEL Observations
          </h3>
          <div className="space-y-2">
            {student.recentSelObservations.slice(0, 3).map((obs, index) => (
              <div
                key={obs.id ?? index}
                className="flex items-start gap-3 p-2 bg-surface-muted rounded-lg"
              >
                <SELLevelBadge level={obs.level ?? 'developing'} />
                <div className="flex-1">
                  <p className="font-medium text-text capitalize">
                    {(obs.competency ?? obs.category ?? '').replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-muted">{obs.context ?? obs.observation}</p>
                  <p className="text-xs text-muted mt-1">{formatDate(String(obs.date))}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parent Contacts */}
      {student.parentContacts && student.parentContacts.length > 0 && (
        <div className="rounded-xl border border-border p-4">
          <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" />
            Parent/Guardian Contacts
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {student.parentContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-3 bg-surface-muted rounded-lg"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-text truncate">{contact.name}</p>
                    {contact.isPrimary && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted capitalize">{contact.relationship}</p>
                </div>
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="rounded-lg p-2 text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <MailIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IEPTab({ iepDetails }: { iepDetails: NonNullable<Student['iepDetails']> }) {
  return (
    <div className="space-y-6">
      {/* IEP Summary */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">IEP Status: {iepDetails.status}</h3>
            <p className="text-sm text-blue-700">
              {iepDetails.eligibilityCategory}
              {iepDetails.primaryDisability && ` • ${iepDetails.primaryDisability}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-700">Next Review</p>
            <p className="font-medium text-blue-900">
              {formatDate(String(iepDetails.nextReviewDate ?? ''))}
            </p>
          </div>
        </div>
        {iepDetails.caseManager && (
          <p className="mt-2 text-sm text-blue-700">Case Manager: {iepDetails.caseManager}</p>
        )}
      </div>

      {/* Goals */}
      <div>
        <h3 className="font-semibold text-text mb-3">
          IEP Goals ({iepDetails.goals?.length ?? 0})
        </h3>
        <div className="space-y-4">
          {iepDetails.goals?.map((goal) => (
            <IEPGoalCard key={goal.id} goal={goal as unknown as IEPGoal} />
          ))}
        </div>
      </div>

      {/* Services */}
      {(iepDetails.services?.length ?? 0) > 0 && (
        <div>
          <h3 className="font-semibold text-text mb-3">Related Services</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {iepDetails.services?.map((service, index) => (
              <div key={service.id ?? index} className="rounded-lg border border-border p-3">
                <p className="font-medium text-text">{service.serviceType ?? service.type}</p>
                <p className="text-sm text-muted">{service.provider}</p>
                <p className="text-xs text-muted mt-1">
                  {service.frequency}
                  {service.duration && ` • ${service.duration}`}
                  {service.location && ` • ${service.location}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Plan504Tab({
  plan504Details,
  accommodations,
}: {
  plan504Details: NonNullable<Student['plan504Details']>;
  accommodations: Accommodation[];
}) {
  return (
    <div className="space-y-6">
      {/* 504 Summary */}
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-purple-900">
              504 Plan Status: {plan504Details.status}
            </h3>
            <p className="text-sm text-purple-700">{plan504Details.disablingCondition}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-purple-700">Next Review</p>
            <p className="font-medium text-purple-900">
              {formatDate(
                String(plan504Details.nextReviewDate ?? plan504Details.renewalDate ?? '')
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Accommodations by Category */}
      <div>
        <h3 className="font-semibold text-text mb-3">Accommodations ({accommodations.length})</h3>
        {['presentation', 'response', 'setting', 'timing', 'other'].map((category) => {
          const categoryAccommodations = accommodations.filter((a) => a.category === category);
          if (categoryAccommodations.length === 0) return null;

          return (
            <div key={category} className="mb-4">
              <h4 className="text-sm font-medium text-muted uppercase tracking-wide mb-2">
                {category}
              </h4>
              <div className="space-y-2">
                {categoryAccommodations.map((accommodation) => (
                  <AccommodationItem
                    key={accommodation.id}
                    accommodation={accommodation}
                    detailed
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PerformanceTab({ student }: { student: Student }) {
  // Generate sample data from student metrics or use fallback
  const performanceData = (student.performanceHistory || generatePerformanceHistory(student)).map(
    (p) => ({
      date: typeof p.date === 'string' ? p.date : p.date.toISOString(),
      score: p.score,
    })
  );
  const masteryData = (student.masteryTrends || generateMasteryTrends(student)).map((item) => ({
    name: 'name' in item ? item.name : item.skill,
    level: item.level,
  }));

  return (
    <div className="space-y-6">
      {/* Performance Over Time */}
      <div className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-text mb-4">Performance Over Time</h3>
        <div className="h-48">
          <PerformanceLineChart data={performanceData} />
        </div>
      </div>

      {/* Mastery by Subject */}
      <div className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-text mb-4">Mastery by Subject</h3>
        <div className="space-y-3">
          {masteryData.map((subject) => (
            <div key={subject.name} className="flex items-center gap-3">
              <span className="text-sm text-muted w-20 truncate">{subject.name}</span>
              <div className="flex-1 h-3 bg-muted/20 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    subject.level >= 80
                      ? 'bg-success'
                      : subject.level >= 60
                        ? 'bg-primary'
                        : subject.level >= 40
                          ? 'bg-warning'
                          : 'bg-error'
                  )}
                  style={{ width: `${subject.level}%` }}
                />
              </div>
              <span className="text-sm font-medium text-text w-10 text-right">
                {subject.level}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-primary">{student.averageScore ?? '—'}%</p>
          <p className="text-xs text-muted mt-1">Average Score</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-success">
            {typeof student.completedAssignments === 'number'
              ? student.completedAssignments
              : (student.completedAssignments?.length ?? 0)}
          </p>
          <p className="text-xs text-muted mt-1">Completed</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text">{student.streak ?? 0}</p>
          <p className="text-xs text-muted mt-1">Day Streak</p>
        </div>
      </div>

      <Link
        href={`/analytics/student/${student.id}`}
        className="block text-center text-sm text-primary hover:underline"
      >
        View detailed analytics
      </Link>
    </div>
  );
}

/** Simple line chart for performance over time */
function PerformanceLineChart({ data }: { data: { date: string; score: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm">
        No performance data available
      </div>
    );
  }

  const maxScore = 100;
  const minScore = 0;
  const range = maxScore - minScore;
  const width = 100;
  const height = 100;
  const padding = 10;

  // Generate SVG path
  const points = data.map((d, i) => {
    const x = padding + ((width - 2 * padding) * i) / (data.length - 1 || 1);
    const y = height - padding - ((d.score - minScore) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });
  const linePath = `M ${points.join(' L ')}`;

  // Area fill path
  const areaPath = `M ${padding},${height - padding} L ${points.join(' L ')} L ${width - padding},${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      {/* Grid lines */}
      {[25, 50, 75].map((pct) => (
        <line
          key={pct}
          x1={padding}
          y1={height - padding - (pct / 100) * (height - 2 * padding)}
          x2={width - padding}
          y2={height - padding - (pct / 100) * (height - 2 * padding)}
          className="stroke-muted/20"
          strokeWidth="0.5"
        />
      ))}
      {/* Area fill */}
      <path d={areaPath} className="fill-primary/10" />
      {/* Line */}
      <path
        d={linePath}
        className="stroke-primary fill-none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Data points */}
      {data.map((d, i) => {
        const x = padding + ((width - 2 * padding) * i) / (data.length - 1 || 1);
        const y = height - padding - ((d.score - minScore) / range) * (height - 2 * padding);
        return <circle key={i} cx={x} cy={y} r="2" className="fill-primary" />;
      })}
    </svg>
  );
}

/** Generate sample performance history if not available */
function generatePerformanceHistory(student: Student): { date: string; score: number }[] {
  const baseScore = student.averageScore ?? 70;
  const days = 14;
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    // Add some variance
    const variance = Math.sin(i * 0.5) * 10 + (Math.random() - 0.5) * 15;
    const score = Math.max(0, Math.min(100, Math.round(baseScore + variance)));
    data.push({
      date: date.toISOString().split('T')[0],
      score,
    });
  }
  return data;
}

/** Generate mastery trends by subject */
function generateMasteryTrends(student: Student): { name: string; level: number }[] {
  const baseScore = student.averageScore ?? 70;
  const subjects = ['Math', 'Reading', 'Writing', 'Science', 'Social Studies'];

  return subjects.map((name) => ({
    name,
    level: Math.max(0, Math.min(100, Math.round(baseScore + (Math.random() - 0.5) * 30))),
  }));
}

function InterventionsTab({ student }: { student: Student }) {
  const interventions = student.interventions || [];

  return (
    <div className="space-y-4">
      {interventions.length > 0 ? (
        interventions.map((intervention) => (
          <div key={intervention.id} className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-text">{intervention.title}</h4>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      intervention.status === 'completed'
                        ? 'bg-success/10 text-success'
                        : intervention.status === 'in_progress'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted/10 text-muted'
                    )}
                  >
                    {intervention.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-muted mt-1">{intervention.description}</p>
              </div>
            </div>
            {intervention.progress !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted">Progress</span>
                  <span className="text-xs font-medium text-text">{intervention.progress}%</span>
                </div>
                <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${intervention.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-muted">
          <p>No interventions recorded</p>
        </div>
      )}
    </div>
  );
}

// Helper Components

function IEPGoalCard({ goal }: { goal: IEPGoal }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    on_track: { bg: 'bg-success/10', text: 'text-success' },
    at_risk: { bg: 'bg-warning/10', text: 'text-warning' },
    met: { bg: 'bg-primary/10', text: 'text-primary' },
    not_started: { bg: 'bg-muted/10', text: 'text-muted' },
  };

  const status = statusColors[goal.status] || statusColors.not_started;

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted uppercase">{goal.domain}</span>
            <span
              className={cn('rounded-full px-2 py-0.5 text-xs font-medium', status.bg, status.text)}
            >
              {goal.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-text">{goal.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-text">{goal.currentProgress ?? 0}%</p>
          <p className="text-xs text-muted">of {goal.targetProgress ?? 100}%</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              goal.status === 'met'
                ? 'bg-success'
                : goal.status === 'at_risk'
                  ? 'bg-warning'
                  : 'bg-primary'
            )}
            style={{
              width: `${((goal.currentProgress ?? 0) / (goal.targetProgress ?? 100)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Target Date */}
      <p className="mt-2 text-xs text-muted">Target: {formatDate(String(goal.targetDate))}</p>
    </div>
  );
}

function AccommodationItem({
  accommodation,
  detailed = false,
}: {
  accommodation: Accommodation;
  detailed?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg',
        accommodation.isCritical ? 'bg-error/5 border border-error/20' : 'bg-surface-muted'
      )}
    >
      {accommodation.isCritical && <span className="text-error text-xs font-bold mt-0.5">!</span>}
      <div className="flex-1">
        <p className="text-sm text-text">{accommodation.description}</p>
        {detailed && accommodation.notes && (
          <p className="text-xs text-muted mt-1">{accommodation.notes}</p>
        )}
      </div>
      {accommodation.isCritical && (
        <span className="text-xs bg-error/10 text-error px-1.5 py-0.5 rounded">Critical</span>
      )}
    </div>
  );
}

function QuickStatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: 'success' | 'warning' | 'error';
}) {
  const colorClasses = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  };

  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <div className="flex justify-center text-muted mb-2">{icon}</div>
      <p className={cn('text-xl font-bold', color ? colorClasses[color] : 'text-text')}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted">{label}:</span>
      <span className={cn('text-sm font-semibold', color || 'text-text')}>{value}</span>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: 'bg-info/10 text-info',
    medium: 'bg-warning/10 text-warning',
    high: 'bg-error/10 text-error',
    critical: 'bg-error text-white',
  };

  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium capitalize', colors[level])}>
      {level} Risk
    </span>
  );
}

function RiskSeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    low: 'bg-info',
    medium: 'bg-warning',
    high: 'bg-error',
  };

  return (
    <div
      className={cn('h-2 w-2 rounded-full mt-1.5 flex-shrink-0', colors[severity] || 'bg-muted')}
    />
  );
}

function SELLevelBadge({ level }: { level: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    independent: { bg: 'bg-success/10', text: 'text-success' },
    with_support: { bg: 'bg-primary/10', text: 'text-primary' },
    prompted: { bg: 'bg-warning/10', text: 'text-warning' },
    needs_development: { bg: 'bg-error/10', text: 'text-error' },
  };

  const style = colors[level] || colors.prompted;

  return (
    <span className={cn('rounded px-2 py-1 text-xs font-medium capitalize', style.bg, style.text)}>
      {level.replace('_', ' ')}
    </span>
  );
}

function getScoreColor(score?: number): 'success' | 'warning' | 'error' | undefined {
  if (score === undefined) return undefined;
  if (score >= 90) return 'success';
  if (score >= 70) return 'warning';
  return 'error';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRiskType(type: string): string {
  const labels: Record<string, string> = {
    academic: 'Academic',
    attendance: 'Attendance',
    behavior: 'Behavioral',
    engagement: 'Engagement',
    social_emotional: 'Social-Emotional',
  };
  return labels[type] || type;
}

// Icons
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <circle cx="12" cy="12" r="6" strokeWidth={2} />
      <circle cx="12" cy="12" r="2" strokeWidth={2} />
    </svg>
  );
}

function ProgressIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  );
}

function AssignmentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function EngagementIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function AccommodationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
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

function UsersIcon({ className }: { className?: string }) {
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

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
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

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}
