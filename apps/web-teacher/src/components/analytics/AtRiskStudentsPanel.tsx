/**
 * At-Risk Students Panel
 *
 * Early warning system showing students who need attention.
 * Prioritized by risk level with actionable intervention suggestions.
 *
 * WCAG 2.1 AA compliant with keyboard navigation and screen reader support.
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  AlertCircle,
  Eye,
  Target,
  MessageSquare,
  Calendar,
  ChevronRight,
  X,
} from 'lucide-react';
import * as React from 'react';

import { analyticsApi } from '@/lib/api/analytics';
import type { EarlyWarningReport, EarlyWarningStudent, RiskLevel, RiskFactor } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AtRiskStudentsPanelProps {
  classId: string;
  onStudentClick?: (studentId: string) => void;
  onScheduleMeeting?: (studentId: string) => void;
  onLogContact?: (studentId: string) => void;
}

interface PanelState {
  report: EarlyWarningReport | null;
  isLoading: boolean;
  error: Error | null;
}

export function AtRiskStudentsPanel({
  classId,
  onStudentClick,
  onScheduleMeeting,
  onLogContact,
}: AtRiskStudentsPanelProps) {
  const [selectedStudent, setSelectedStudent] = React.useState<EarlyWarningStudent | null>(null);
  const [state, setState] = React.useState<PanelState>({
    report: null,
    isLoading: true,
    error: null,
  });

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const report = await analyticsApi.getEarlyWarningReport(classId);
        setState({ report, isLoading: false, error: null });
      } catch (err) {
        setState({
          report: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Failed to load early warning data'),
        });
      }
    };
    void fetchData();
  }, [classId]);

  if (state.isLoading) {
    return <PanelSkeleton />;
  }

  if (state.error || !state.report) {
    return (
      <div className="text-center py-12" role="alert">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Unable to load early warning data
        </h3>
        <p className="text-gray-500">{state.error?.message || 'An error occurred.'}</p>
      </div>
    );
  }

  const { report } = state;
  const allAtRiskStudents = [
    ...report.criticalStudents,
    ...report.atRiskStudents,
    ...report.watchStudents,
  ];

  // No students at risk
  if (allAtRiskStudents.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <Target className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">All Students On Track</h3>
        <p className="text-gray-500">No students are currently showing early warning signs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Class-Level Warnings */}
      {report.classLevelWarnings.length > 0 && (
        <div className="space-y-2">
          {report.classLevelWarnings.map((warning, index) => (
            <div
              key={index}
              className={cn(
                'p-4 rounded-lg border flex items-start gap-3',
                warning.severity === 'high' && 'bg-red-50 border-red-200',
                warning.severity === 'medium' && 'bg-yellow-50 border-yellow-200',
                warning.severity === 'low' && 'bg-blue-50 border-blue-200'
              )}
              role="alert"
            >
              <AlertTriangle
                className={cn(
                  'h-5 w-5 mt-0.5 flex-shrink-0',
                  warning.severity === 'high' && 'text-red-500',
                  warning.severity === 'medium' && 'text-yellow-500',
                  warning.severity === 'low' && 'text-blue-500'
                )}
              />
              <div>
                <p className="font-medium text-gray-900">{warning.message}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Affects {warning.affectedCount} student{warning.affectedCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Critical"
          count={report.criticalStudents.length}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant="critical"
          description="Immediate intervention needed"
        />
        <SummaryCard
          title="At-Risk"
          count={report.atRiskStudents.length}
          icon={<AlertCircle className="h-4 w-4" />}
          variant="at-risk"
          description="Need attention this week"
        />
        <SummaryCard
          title="Watch"
          count={report.watchStudents.length}
          icon={<Eye className="h-4 w-4" />}
          variant="watch"
          description="Monitor closely"
        />
      </div>

      {/* Student List */}
      <div className="rounded-xl border bg-white">
        <div className="border-b p-4">
          <h3 className="font-semibold text-gray-900">Students Needing Attention</h3>
          <p className="text-sm text-gray-500">
            Sorted by risk score. Click on a student to see details.
          </p>
        </div>

        <div className="divide-y">
          {/* Critical Students */}
          {report.criticalStudents.length > 0 && (
            <StudentSection
              title="Critical"
              students={report.criticalStudents}
              variant="critical"
              onSelect={setSelectedStudent}
            />
          )}

          {/* At-Risk Students */}
          {report.atRiskStudents.length > 0 && (
            <StudentSection
              title="At-Risk"
              students={report.atRiskStudents}
              variant="at-risk"
              onSelect={setSelectedStudent}
            />
          )}

          {/* Watch Students */}
          {report.watchStudents.length > 0 && (
            <StudentSection
              title="Watch"
              students={report.watchStudents}
              variant="watch"
              onSelect={setSelectedStudent}
            />
          )}
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => {
            setSelectedStudent(null);
          }}
          onViewProfile={() => {
            onStudentClick?.(selectedStudent.studentId);
            setSelectedStudent(null);
          }}
          onScheduleMeeting={() => {
            onScheduleMeeting?.(selectedStudent.studentId);
          }}
          onLogContact={() => {
            onLogContact?.(selectedStudent.studentId);
          }}
        />
      )}
    </div>
  );
}

// Summary Card Component
interface SummaryCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  variant: 'critical' | 'at-risk' | 'watch';
  description: string;
}

function SummaryCard({ title, count, icon, variant, description }: SummaryCardProps) {
  const colors = {
    critical: 'border-red-300 bg-red-50',
    'at-risk': 'border-orange-300 bg-orange-50',
    watch: 'border-yellow-300 bg-yellow-50',
  };

  const iconColors = {
    critical: 'text-red-500',
    'at-risk': 'text-orange-500',
    watch: 'text-yellow-500',
  };

  const countColors = {
    critical: 'text-red-600',
    'at-risk': 'text-orange-600',
    watch: 'text-yellow-600',
  };

  return (
    <div className={cn('rounded-xl border p-4', count > 0 ? colors[variant] : 'bg-white')}>
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColors[variant]}>{icon}</span>
        <span className="text-sm font-medium text-gray-700">{title}</span>
      </div>
      <div className={cn('text-3xl font-bold', countColors[variant])}>{count}</div>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  );
}

// Student Section Component
interface StudentSectionProps {
  title: string;
  students: EarlyWarningStudent[];
  variant: 'critical' | 'at-risk' | 'watch';
  onSelect: (student: EarlyWarningStudent) => void;
}

function StudentSection({ title, students, variant, onSelect }: StudentSectionProps) {
  const colors = {
    critical: 'text-red-600',
    'at-risk': 'text-orange-600',
    watch: 'text-yellow-600',
  };

  const icons = {
    critical: <AlertTriangle className="h-4 w-4" />,
    'at-risk': <AlertCircle className="h-4 w-4" />,
    watch: <Eye className="h-4 w-4" />,
  };

  return (
    <div className="p-4">
      <h4 className={cn('text-sm font-medium flex items-center gap-1 mb-3', colors[variant])}>
        {icons[variant]}
        {title} ({students.length})
      </h4>
      <div className="space-y-2">
        {students.map((student) => (
          <StudentCard
            key={student.studentId}
            student={student}
            onSelect={() => {
              onSelect(student);
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Student Card Component
interface StudentCardProps {
  student: EarlyWarningStudent;
  onSelect: () => void;
}

function StudentCard({ student, onSelect }: StudentCardProps) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
          {student.studentName
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </div>
        <div>
          <p className="font-medium text-gray-900">{student.studentName}</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <span>Risk Score: {student.riskScore}</span>
            {student.daysAtRisk > 0 && (
              <>
                <span>•</span>
                <span>At risk for {student.daysAtRisk} days</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex flex-wrap gap-1 max-w-xs">
          {student.primaryRiskFactors.slice(0, 2).map((factor, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
            >
              {factor.factor}
            </span>
          ))}
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
      </div>
    </button>
  );
}

// Student Detail Modal
interface StudentDetailModalProps {
  student: EarlyWarningStudent;
  onClose: () => void;
  onViewProfile: () => void;
  onScheduleMeeting: () => void;
  onLogContact: () => void;
}

function StudentDetailModal({
  student,
  onClose,
  onViewProfile,
  onScheduleMeeting,
  onLogContact,
}: StudentDetailModalProps) {
  const riskBadgeColors = {
    'on-track': 'bg-green-100 text-green-800',
    watch: 'bg-yellow-100 text-yellow-800',
    'at-risk': 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium text-gray-600">
              {student.studentName
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{student.studentName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    riskBadgeColors[student.riskLevel]
                  )}
                >
                  {student.riskLevel.replace('-', ' ')}
                </span>
                <span className="text-sm text-gray-500">Risk Score: {student.riskScore}/100</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Risk Factors */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Risk Factors</h3>
            <div className="space-y-2">
              {student.primaryRiskFactors.map((factor, index) => (
                <RiskFactorCard key={index} factor={factor} />
              ))}
            </div>
          </div>

          {/* Suggested Interventions */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Suggested Interventions</h3>
            <div className="space-y-2">
              {student.suggestedInterventions.map((intervention, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Target className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{intervention}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Last Teacher Contact */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                Last teacher contact:{' '}
                {student.lastTeacherContact
                  ? formatDistanceToNow(new Date(student.lastTeacherContact), {
                      addSuffix: true,
                    })
                  : 'No record'}
              </span>
            </div>
            <button
              onClick={onLogContact}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary-600 bg-white border border-primary-300 rounded-lg hover:bg-primary-50"
            >
              <MessageSquare className="h-4 w-4" />
              Log Contact
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onScheduleMeeting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            <Calendar className="h-4 w-4" />
            Schedule Meeting
          </button>
          <button
            onClick={onViewProfile}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            View Full Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// Risk Factor Card Component
function RiskFactorCard({ factor }: { factor: RiskFactor }) {
  const severityColors = {
    high: 'bg-red-500',
    medium: 'bg-orange-500',
    low: 'bg-yellow-500',
  };

  const severity = factor.severity >= 25 ? 'high' : factor.severity >= 15 ? 'medium' : 'low';

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className={cn('w-2 h-2 rounded-full mt-2', severityColors[severity])} />
      <div>
        <p className="font-medium text-gray-900">{factor.factor}</p>
        <p className="text-sm text-gray-600">{factor.description}</p>
      </div>
    </div>
  );
}

// Skeleton loader
function PanelSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  );
}
