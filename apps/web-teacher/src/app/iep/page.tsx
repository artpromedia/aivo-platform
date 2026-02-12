'use client';

import { Card, Heading, Button } from '@aivo/ui-web';
import { useState, useEffect } from 'react';

import { iepApi } from '@/lib/api/iep';

// IEP Types matching the backend iep-svc
type IEPStatus = 'draft' | 'active' | 'review_pending' | 'expired';
type GoalStatus =
  | 'not_started'
  | 'in_progress'
  | 'on_track'
  | 'at_risk'
  | 'mastered'
  | 'discontinued';
type GoalDomain =
  | 'Reading'
  | 'Writing'
  | 'Math'
  | 'Communication'
  | 'Social/Emotional'
  | 'Behavior'
  | 'Motor Skills'
  | 'Self-Help'
  | 'Transition';

interface IEPGoal {
  id: string;
  domain: GoalDomain;
  description: string;
  baseline: string;
  target: string;
  currentProgress: number;
  targetProgress: number;
  status: GoalStatus;
  targetDate: string;
  lastUpdated: string;
  progressHistory: { date: string; value: number; notes?: string }[];
}

interface IEPService {
  id: string;
  type: string;
  provider: string;
  frequency: string;
  duration: string;
  location: string;
  minutesDelivered: number;
  minutesRequired: number;
}

interface IEPStudent {
  id: string;
  name: string;
  grade: string;
  avatar?: string;
  iepId: string;
  iepStatus: IEPStatus;
  eligibilityCategory: string;
  caseManager: string;
  nextMeetingDate: string;
  annualReviewDate: string;
  goals: IEPGoal[];
  services: IEPService[];
  accommodations: string[];
  complianceAlerts: {
    type: string;
    message: string;
    dueDate: string;
    severity: 'warning' | 'urgent';
  }[];
}

function getStatusColor(status: GoalStatus): string {
  switch (status) {
    case 'mastered':
      return 'bg-green-100 text-green-800';
    case 'on_track':
      return 'bg-blue-100 text-blue-800';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'at_risk':
      return 'bg-red-100 text-red-800';
    case 'not_started':
      return 'bg-gray-100 text-gray-800';
    case 'discontinued':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getIEPStatusBadge(status: IEPStatus): { color: string; label: string } {
  switch (status) {
    case 'active':
      return { color: 'bg-green-100 text-green-800', label: 'Active' };
    case 'draft':
      return { color: 'bg-gray-100 text-gray-800', label: 'Draft' };
    case 'review_pending':
      return { color: 'bg-orange-100 text-orange-800', label: 'Review Pending' };
    case 'expired':
      return { color: 'bg-red-100 text-red-800', label: 'Expired' };
    default:
      return { color: 'bg-gray-100 text-gray-800', label: status };
  }
}

function ProgressBar({
  current,
  target,
  label,
}: {
  current: number;
  target: number;
  label?: string;
}) {
  const percentage = Math.min(100, (current / target) * 100);
  const color =
    percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="w-full">
      {label && <p className="text-xs text-muted mb-1">{label}</p>}
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted mt-1">
        {current} / {target} ({percentage.toFixed(0)}%)
      </p>
    </div>
  );
}

export default function IEPManagerPage() {
  const [students, setStudents] = useState<IEPStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<IEPStudent | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showProgressModal, setShowProgressModal] = useState<IEPGoal | null>(null);
  const [progressNote, setProgressNote] = useState('');
  const [progressValue, setProgressValue] = useState('');

  // Fetch IEP students on mount
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await iepApi.getStudentsWithIEP();
        // Transform API response to local types
        const transformed: IEPStudent[] = (data as unknown as IEPStudent[]).map((s) => ({
          ...s,
          goals: Array.isArray(s.goals) ? s.goals : [],
          services: Array.isArray(s.services) ? s.services : [],
          accommodations: Array.isArray(s.accommodations) ? s.accommodations : [],
          complianceAlerts: Array.isArray(s.complianceAlerts) ? s.complianceAlerts : [],
        }));
        setStudents(transformed);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to load IEP students'));
      } finally {
        setLoading(false);
      }
    };
    void fetchStudents();
  }, []);

  const urgentAlerts = students.flatMap((s) =>
    s.complianceAlerts
      .filter((a) => a.severity === 'urgent')
      .map((a) => ({ ...a, studentName: s.name, studentId: s.id }))
  );

  const handleRecordProgress = async (goal: IEPGoal) => {
    try {
      if (!selectedStudent) return;
      await iepApi.addProgress(selectedStudent.id, goal.id, {
        value: parseFloat(progressValue),
        notes: progressNote,
        date: new Date().toISOString(),
      });
      setShowProgressModal(null);
      setProgressNote('');
      setProgressValue('');
    } catch {
      // Error handling - could add toast notification
      setShowProgressModal(null);
    }
  };

  if (loading) {
    return (
      <section className="space-y-6">
        <Heading kicker="Special Education" className="text-headline font-semibold">
          IEP Manager
        </Heading>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="ml-3 text-gray-500">Loading IEP students...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <Heading kicker="Special Education" className="text-headline font-semibold">
          IEP Manager
        </Heading>
        <Card className="p-6 text-center">
          <p className="text-red-600">{error.message}</p>
          <button
            onClick={() => {
              globalThis.location.reload();
            }}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </Card>
      </section>
    );
  }

  const renderStudentList = () => (
    <div className="space-y-6">
      {/* Urgent Alerts Banner */}
      {urgentAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">&#9888;</span>
            <div>
              <h3 className="font-semibold text-red-800">Compliance Alerts</h3>
              <ul className="mt-2 space-y-1">
                {urgentAlerts.map((alert, idx) => (
                  <li key={idx} className="text-sm text-red-700">
                    <button
                      onClick={() => {
                        const student = students.find((s) => s.id === alert.studentId);
                        if (student) {
                          setSelectedStudent(student);
                          setView('detail');
                        }
                      }}
                      className="underline hover:no-underline"
                    >
                      {alert.studentName}
                    </button>
                    : {alert.message} (Due: {new Date(alert.dueDate).toLocaleDateString()})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted">Students with IEPs</p>
          <p className="text-2xl font-bold text-primary">{students.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Active IEPs</p>
          <p className="text-2xl font-bold text-green-600">
            {students.filter((s) => s.iepStatus === 'active').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Reviews Pending</p>
          <p className="text-2xl font-bold text-orange-600">
            {students.filter((s) => s.iepStatus === 'review_pending').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Goals At Risk</p>
          <p className="text-2xl font-bold text-red-600">
            {students.reduce(
              (count, s) => count + s.goals.filter((g) => g.status === 'at_risk').length,
              0
            )}
          </p>
        </Card>
      </div>

      {/* Student List */}
      <div className="space-y-4">
        {students.map((student) => {
          const statusBadge = getIEPStatusBadge(student.iepStatus);
          const goalsOnTrack = student.goals.filter(
            (g) => g.status === 'on_track' || g.status === 'mastered'
          ).length;
          const totalGoals = student.goals.length;

          return (
            <Card
              key={student.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedStudent(student);
                setView('detail');
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-medium text-primary">
                    {student.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold">{student.name}</h3>
                    <p className="text-sm text-muted">
                      {student.grade} Grade | {student.eligibilityCategory}
                    </p>
                    <p className="text-xs text-muted">Case Manager: {student.caseManager}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusBadge.color}`}
                    >
                      {statusBadge.label}
                    </span>
                    <p className="text-xs text-muted mt-1">
                      Goals: {goalsOnTrack}/{totalGoals} on track
                    </p>
                  </div>
                  {student.complianceAlerts.length > 0 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {student.complianceAlerts.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Goal Status */}
              <div className="mt-4 flex gap-2 flex-wrap">
                {student.goals.map((goal) => (
                  <span
                    key={goal.id}
                    className={`inline-block rounded px-2 py-1 text-xs ${getStatusColor(goal.status)}`}
                  >
                    {goal.domain}: {goal.status.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderStudentDetail = () => {
    if (!selectedStudent) return null;

    const statusBadge = getIEPStatusBadge(selectedStudent.iepStatus);

    return (
      <div className="space-y-6">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedStudent(null);
              setView('list');
            }}
          >
            &#8592; Back to List
          </Button>
        </div>

        {/* Student Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-medium text-primary">
                {selectedStudent.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedStudent.name}</h2>
                <p className="text-muted">
                  {selectedStudent.grade} Grade | {selectedStudent.eligibilityCategory}
                </p>
                <p className="text-sm text-muted">Case Manager: {selectedStudent.caseManager}</p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${statusBadge.color}`}
              >
                {statusBadge.label}
              </span>
              <p className="text-sm text-muted mt-2">
                Annual Review: {new Date(selectedStudent.annualReviewDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-muted">
                Next Meeting: {new Date(selectedStudent.nextMeetingDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>

        {/* Compliance Alerts */}
        {selectedStudent.complianceAlerts.length > 0 && (
          <Card className="border-red-200 bg-red-50 p-4">
            <h3 className="font-semibold text-red-800 mb-2">Compliance Alerts</h3>
            <ul className="space-y-2">
              {selectedStudent.complianceAlerts.map((alert, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm text-red-700">
                  <span>{alert.message}</span>
                  <span className="font-medium">
                    Due: {new Date(alert.dueDate).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Goals Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">IEP Goals</h3>
            <Button variant="primary" className="text-sm">
              + Add Goal
            </Button>
          </div>
          <div className="space-y-4">
            {selectedStudent.goals.map((goal) => (
              <Card key={goal.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${getStatusColor(goal.status)} mb-2`}
                    >
                      {goal.domain} - {goal.status.replace('_', ' ')}
                    </span>
                    <p className="text-sm">{goal.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="text-sm"
                    onClick={() => {
                      setShowProgressModal(goal);
                    }}
                  >
                    Record Progress
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div>
                    <p className="text-xs text-muted mb-1">Baseline: {goal.baseline}</p>
                    <p className="text-xs text-muted">Target: {goal.target}</p>
                  </div>
                  <ProgressBar
                    current={goal.currentProgress}
                    target={goal.targetProgress}
                    label="Progress toward goal"
                  />
                </div>

                <div className="mt-4 border-t pt-4">
                  <p className="text-xs text-muted mb-2">Progress History</p>
                  <div className="flex items-end gap-1 h-16">
                    {goal.progressHistory.map((entry, idx) => {
                      const height = (entry.value / goal.targetProgress) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className="w-full bg-primary/60 rounded-t transition-all hover:bg-primary"
                            style={{ height: `${Math.min(100, height)}%` }}
                          />
                          <span className="text-[10px] text-muted mt-1">
                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          {entry.notes && (
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded shadow-lg whitespace-nowrap">
                              {entry.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-xs text-muted mt-2">
                  Target Date: {new Date(goal.targetDate).toLocaleDateString()} | Last Updated:{' '}
                  {new Date(goal.lastUpdated).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Services Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Related Services</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {selectedStudent.services.map((service) => (
              <Card key={service.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{service.type}</h4>
                    <p className="text-sm text-muted">{service.provider}</p>
                  </div>
                  <div className="text-right text-sm text-muted">
                    <p>{service.frequency}</p>
                    <p>{service.duration}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar
                    current={service.minutesDelivered}
                    target={service.minutesRequired}
                    label="Minutes this month"
                  />
                </div>
                <p className="text-xs text-muted mt-2">Location: {service.location}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Accommodations Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Accommodations</h3>
          <Card className="p-4">
            <ul className="grid gap-2 md:grid-cols-2">
              {selectedStudent.accommodations.map((accommodation, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500">&#10003;</span>
                  {accommodation}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Heading kicker="Special Education" className="text-headline font-semibold">
            IEP Manager
          </Heading>
          <p className="text-muted mt-1">
            Track IEP goals, services, and compliance for your students
          </p>
        </div>

        {view === 'list' && (
          <div className="flex gap-2">
            <Button variant="ghost" className="text-sm">
              Export Reports
            </Button>
            <Button variant="primary" className="text-sm">
              Schedule Meeting
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {view === 'list' ? renderStudentList() : renderStudentDetail()}

      {/* Progress Recording Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Record Progress</h3>
            <p className="text-sm text-muted mb-4">{showProgressModal.description}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Current Value</label>
                <input
                  type="number"
                  value={progressValue}
                  onChange={(e) => {
                    setProgressValue(e.target.value);
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2"
                  placeholder={`Target: ${showProgressModal.targetProgress}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={progressNote}
                  onChange={(e) => {
                    setProgressNote(e.target.value);
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2"
                  rows={3}
                  placeholder="Add any observations or notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowProgressModal(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={() => handleRecordProgress(showProgressModal)}>
                Save Progress
              </Button>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
