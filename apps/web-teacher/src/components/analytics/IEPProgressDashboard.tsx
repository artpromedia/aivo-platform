/**
 * IEP Progress Dashboard
 *
 * Dashboard for tracking IEP (Individualized Education Program) student progress.
 * Provides overview of all IEP students in a class with goal tracking.
 *
 * Features:
 * - Summary statistics for IEP goals
 * - Upcoming review dates
 * - Individual student goal progress
 * - Progress logging capability
 * - WCAG 2.1 AA compliant
 */

'use client';

import {
  Target,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  PlusCircle,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import * as React from 'react';

import { analyticsApi } from '@/lib/api/analytics';
import type { IEPClassReport, IEPStudentReport, IEPGoalDetail } from '@/lib/types';
import { cn } from '@/lib/utils';

interface IEPProgressDashboardProps {
  classId: string;
}

interface DashboardState {
  report: IEPClassReport | null;
  isLoading: boolean;
  error: Error | null;
}

interface ProgressDialogState {
  isOpen: boolean;
  goalId: string | null;
  studentId: string | null;
}

export function IEPProgressDashboard({ classId }: IEPProgressDashboardProps) {
  const [state, setState] = React.useState<DashboardState>({
    report: null,
    isLoading: true,
    error: null,
  });

  const [expandedStudents, setExpandedStudents] = React.useState<Set<string>>(new Set());
  const [progressDialog, setProgressDialog] = React.useState<ProgressDialogState>({
    isOpen: false,
    goalId: null,
    studentId: null,
  });

  const fetchReport = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const report = await analyticsApi.getIEPProgressReport(classId);
      setState({ report, isLoading: false, error: null });
    } catch (error) {
      setState({
        report: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load IEP report'),
      });
    }
  }, [classId]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const toggleStudent = (studentId: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const openProgressDialog = (goalId: string, studentId: string) => {
    setProgressDialog({ isOpen: true, goalId, studentId });
  };

  const closeProgressDialog = () => {
    setProgressDialog({ isOpen: false, goalId: null, studentId: null });
  };

  if (state.isLoading) {
    return <IEPDashboardSkeleton />;
  }

  if (state.error) {
    return (
      <div className="text-center py-12" role="alert">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" aria-hidden="true" />
        <h3 className="text-lg font-semibold mb-2">Unable to load IEP report</h3>
        <p className="text-muted-foreground mb-4">{state.error.message}</p>
        <button
          onClick={fetchReport}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { report } = state;

  if (!report || report.totalStudentsWithIEP === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold mb-1">No IEP Students</h3>
          <p className="text-muted-foreground">
            There are no students with IEP goals in this class.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          icon={<Target className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          label="Students with IEP"
          value={report.totalStudentsWithIEP}
        />
        <SummaryCard
          icon={<FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          label="Total Goals"
          value={report.totalGoals}
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />}
          label="On Track"
          value={report.goalsOnTrack}
          valueColor="text-green-600"
          subtitle={`${Math.round((report.goalsOnTrack / report.totalGoals) * 100)}% of goals`}
        />
        <SummaryCard
          icon={<AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />}
          label="Needs Attention"
          value={report.goalsAtRisk}
          valueColor="text-yellow-600"
          highlight={report.goalsAtRisk > 0}
        />
      </div>

      {/* Upcoming Review Dates */}
      {report.upcomingReviewDates.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-base font-medium flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Upcoming IEP Reviews
          </h3>
          <div className="flex flex-wrap gap-2">
            {report.upcomingReviewDates.map((review) => (
              <span
                key={review.studentId}
                className={cn(
                  'inline-flex items-center px-3 py-1.5 rounded-full text-sm',
                  review.daysUntil <= 7 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                )}
              >
                <span className="font-normal">{review.studentName}</span>
                <span className="mx-1">•</span>
                <span>{formatDate(review.reviewDate)}</span>
                <span className="text-xs ml-1">
                  ({review.daysUntil === 0 ? 'Today' : `${review.daysUntil}d`})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Student Progress Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Student IEP Progress</h2>
          <button className="inline-flex items-center px-3 py-1.5 text-sm border rounded-md hover:bg-accent">
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Export All Reports
          </button>
        </div>

        <div className="space-y-2">
          {report.students.map((student) => (
            <StudentIEPCard
              key={student.studentId}
              student={student}
              isExpanded={expandedStudents.has(student.studentId)}
              onToggle={() => {
                toggleStudent(student.studentId);
              }}
              onLogProgress={(goalId) => {
                openProgressDialog(goalId, student.studentId);
              }}
            />
          ))}
        </div>
      </div>

      {/* Progress Entry Dialog */}
      {progressDialog.isOpen && progressDialog.goalId && (
        <ProgressEntryDialog
          goalId={progressDialog.goalId}
          onClose={closeProgressDialog}
          onSuccess={() => {
            closeProgressDialog();
            fetchReport();
          }}
        />
      )}
    </div>
  );
}

// Summary Card Component
interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  valueColor?: string;
  subtitle?: string;
  highlight?: boolean;
}

function SummaryCard({ icon, label, value, valueColor, subtitle, highlight }: SummaryCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', highlight && 'border-yellow-300')}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
        {icon}
        {label}
      </div>
      <div className={cn('text-2xl font-bold', valueColor)}>{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

// Student IEP Card Component
interface StudentIEPCardProps {
  student: IEPStudentReport;
  isExpanded: boolean;
  onToggle: () => void;
  onLogProgress: (goalId: string) => void;
}

function StudentIEPCard({ student, isExpanded, onToggle, onLogProgress }: StudentIEPCardProps) {
  return (
    <div className="border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
            {getInitials(student.studentName)}
          </div>
          <div className="text-left">
            <p className="font-medium">{student.studentName}</p>
            <p className="text-sm text-muted-foreground">
              {student.goals.length} goal{student.goals.length !== 1 ? 's' : ''}
              {student.goalsAtRisk > 0 && (
                <span className="text-yellow-600 ml-2">
                  • {student.goalsAtRisk} need{student.goalsAtRisk !== 1 ? '' : 's'} attention
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-sm text-muted-foreground">Overall Progress</p>
            <p className="font-medium">{Math.round(student.overallProgress)}%</p>
          </div>
          <div className="w-24 hidden md:block">
            <ProgressBar value={student.overallProgress} />
          </div>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t">
          {/* Accommodations */}
          {student.accommodations.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4">
              <span className="text-sm text-muted-foreground">Accommodations:</span>
              {student.accommodations.map((acc, index) => (
                <span
                  key={index}
                  className="inline-flex px-2 py-1 text-xs rounded-full bg-secondary"
                >
                  {acc.type}
                </span>
              ))}
            </div>
          )}

          {/* Goals */}
          <div className="space-y-3 pt-2">
            {student.goals.map((goal) => (
              <GoalCard key={goal.goalId} goal={goal} onLogProgress={onLogProgress} />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <a
              href={`/students/${student.studentId}/iep`}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
            >
              View Full IEP
            </a>
            <button className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent flex items-center">
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Export Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Goal Card Component
interface GoalCardProps {
  goal: IEPGoalDetail;
  onLogProgress: (goalId: string) => void;
}

function GoalCard({ goal, onLogProgress }: GoalCardProps) {
  const statusConfig = getStatusConfig(goal.status);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {statusConfig.icon}
            <span
              className={cn(
                'inline-flex px-2 py-0.5 text-xs font-medium rounded-full',
                statusConfig.badgeClass
              )}
            >
              {goal.status.replace('-', ' ')}
            </span>
            {goal.category && (
              <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-gray-100">
                {goal.category}
              </span>
            )}
          </div>
          <p className="text-sm">{goal.description}</p>
          {goal.relatedSkill && (
            <p className="text-xs text-muted-foreground mt-1">Related Skill: {goal.relatedSkill}</p>
          )}
        </div>
        <button
          onClick={() => {
            onLogProgress(goal.goalId);
          }}
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent flex items-center shrink-0"
        >
          <PlusCircle className="h-4 w-4 mr-1" aria-hidden="true" />
          Log Progress
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>Progress: {Math.round(goal.currentProgress)}%</span>
          <span className="text-muted-foreground">
            Expected: {Math.round(goal.expectedProgress)}%
          </span>
        </div>
        <div className="relative">
          <ProgressBar value={goal.currentProgress} />
          {/* Expected progress marker */}
          <div
            className="absolute top-0 h-2 w-0.5 bg-gray-500"
            style={{ left: `${Math.min(goal.expectedProgress, 100)}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Target: {formatDate(goal.targetDate)}</span>
          <span>{getDaysRemaining(goal.targetDate)} days remaining</span>
        </div>
      </div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 bg-gray-200 rounded-full overflow-hidden', className)}>
      <div
        className="h-full bg-primary rounded-full transition-all"
        style={{ width: `${Math.min(value, 100)}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

// Progress Entry Dialog
interface ProgressEntryDialogProps {
  goalId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function ProgressEntryDialog({ goalId, onClose, onSuccess }: ProgressEntryDialogProps) {
  const [progressValue, setProgressValue] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressValue) return;

    setIsSubmitting(true);
    try {
      await analyticsApi.logIEPProgress(goalId, {
        value: parseFloat(progressValue),
        notes: notes || undefined,
        recordedAt: new Date().toISOString(),
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to log progress:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-md p-6"
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-lg font-semibold mb-4">Log IEP Goal Progress</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="progress" className="block text-sm font-medium mb-1">
              Progress Value (%)
            </label>
            <input
              id="progress"
              type="number"
              min="0"
              max="100"
              value={progressValue}
              onChange={(e) => {
                setProgressValue(e.target.value);
              }}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter progress percentage (0-100)"
              required
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
              }}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Add observations..."
              rows={4}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!progressValue || isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Progress'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Skeleton Loader
function IEPDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
      <div className="h-32 bg-gray-200 rounded-lg" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// Helper Functions
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDaysRemaining(targetDate: Date | string): number {
  const target = new Date(targetDate);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'met':
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />,
        badgeClass: 'bg-green-100 text-green-800',
      };
    case 'on-track':
      return {
        icon: <TrendingUp className="h-4 w-4 text-blue-500" aria-hidden="true" />,
        badgeClass: 'bg-blue-100 text-blue-800',
      };
    case 'at-risk':
      return {
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />,
        badgeClass: 'bg-yellow-100 text-yellow-800',
      };
    case 'behind':
      return {
        icon: <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />,
        badgeClass: 'bg-red-100 text-red-800',
      };
    default:
      return {
        icon: <Clock className="h-4 w-4 text-gray-500" aria-hidden="true" />,
        badgeClass: 'bg-gray-100 text-gray-800',
      };
  }
}
