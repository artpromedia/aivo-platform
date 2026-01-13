/**
 * PD Compliance Dashboard Component
 *
 * Shows compliance status and requirements
 */

'use client';

import * as React from 'react';

import type { PDComplianceStatus, PDRequirement, PDProgress } from '@/lib/api/professional-development';
import { isRequirementAtRisk, formatCreditHours } from '@/lib/api/professional-development';
import { cn } from '@/lib/utils';

interface PDComplianceDashboardProps {
  compliance: PDComplianceStatus;
  progress: PDProgress | null;
  className?: string;
}

export function PDComplianceDashboard({
  compliance,
  progress,
  className,
}: PDComplianceDashboardProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Compliance Status Card */}
      <div
        className={cn(
          'rounded-xl border p-6',
          compliance.isCompliant
            ? 'border-green-200 bg-green-50'
            : 'border-red-200 bg-red-50'
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full',
              compliance.isCompliant ? 'bg-green-100' : 'bg-red-100'
            )}
          >
            {compliance.isCompliant ? (
              <CheckIcon className="h-6 w-6 text-green-600" />
            ) : (
              <AlertIcon className="h-6 w-6 text-red-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {compliance.isCompliant ? 'You\'re in Compliance!' : 'Action Required'}
            </h3>
            <p className="text-sm text-gray-600">
              {compliance.completedRequirements} of {compliance.totalRequirements} requirements
              completed
            </p>
          </div>
        </div>

        {/* Credit Hours Summary */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-white/60 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {compliance.creditHoursSummary.completed}
            </p>
            <p className="text-xs text-gray-500">Hours Earned</p>
          </div>
          <div className="rounded-lg bg-white/60 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {compliance.creditHoursSummary.inProgress}
            </p>
            <p className="text-xs text-gray-500">In Progress</p>
          </div>
          <div className="rounded-lg bg-white/60 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {compliance.creditHoursSummary.required}
            </p>
            <p className="text-xs text-gray-500">Required</p>
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      {progress && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Completed"
            value={progress.completedPrograms}
            icon={<CompletedIcon />}
          />
          <StatCard
            label="In Progress"
            value={progress.inProgressPrograms}
            icon={<InProgressIcon />}
          />
          <StatCard
            label="Total Credits"
            value={progress.earnedCreditHours}
            suffix="hrs"
            icon={<CreditIcon />}
          />
          <StatCard
            label="Streak"
            value={progress.currentStreak}
            suffix="days"
            icon={<StreakIcon />}
          />
        </div>
      )}

      {/* Upcoming Deadlines */}
      {compliance.upcomingDeadlines.length > 0 && (
        <div className="rounded-xl border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
          <div className="space-y-3">
            {compliance.upcomingDeadlines.map(({ requirement, daysUntilDue }) => (
              <div
                key={requirement.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-3',
                  daysUntilDue <= 7
                    ? 'border-red-200 bg-red-50'
                    : daysUntilDue <= 30
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-gray-200 bg-gray-50'
                )}
              >
                <div>
                  <p className="font-medium text-gray-900">{requirement.title}</p>
                  <p className="text-sm text-gray-500">
                    {requirement.creditHoursCompleted} / {requirement.creditHoursRequired} hours
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'font-semibold',
                      daysUntilDue <= 7
                        ? 'text-red-600'
                        : daysUntilDue <= 30
                          ? 'text-yellow-600'
                          : 'text-gray-600'
                    )}
                  >
                    {daysUntilDue} days
                  </p>
                  <p className="text-xs text-gray-500">remaining</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, suffix, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {value}
            {suffix && <span className="text-sm font-normal text-gray-500"> {suffix}</span>}
          </p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * PD Requirements List Component
 */
interface PDRequirementsListProps {
  requirements: PDRequirement[];
  className?: string;
}

export function PDRequirementsList({ requirements, className }: PDRequirementsListProps) {
  if (requirements.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <span className="text-4xl">📋</span>
        <p className="mt-2">No requirements assigned</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {requirements.map((req) => (
        <RequirementCard key={req.id} requirement={req} />
      ))}
    </div>
  );
}

function RequirementCard({ requirement }: { requirement: PDRequirement }) {
  const progress = (requirement.creditHoursCompleted / requirement.creditHoursRequired) * 100;
  const atRisk = isRequirementAtRisk(requirement);

  const statusStyles: Record<string, string> = {
    NOT_STARTED: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4',
        atRisk && 'border-yellow-300',
        requirement.status === 'OVERDUE' && 'border-red-300'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{requirement.title}</h4>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                statusStyles[requirement.status]
              )}
            >
              {requirement.status.replace('_', ' ')}
            </span>
            {atRisk && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                At Risk
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">{requirement.description}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Due</p>
          <p className="font-medium text-gray-900">
            {new Date(requirement.dueDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>
            {formatCreditHours(requirement.creditHoursCompleted)} /{' '}
            {formatCreditHours(requirement.creditHoursRequired)}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className={cn(
              'h-full transition-all',
              requirement.status === 'COMPLETED'
                ? 'bg-green-500'
                : requirement.status === 'OVERDUE'
                  ? 'bg-red-500'
                  : atRisk
                    ? 'bg-yellow-500'
                    : 'bg-primary-500'
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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

function CompletedIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function InProgressIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CreditIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
      />
    </svg>
  );
}

function StreakIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
      />
    </svg>
  );
}
