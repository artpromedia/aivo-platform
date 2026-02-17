'use client';

import { Card, Heading, Button } from '@aivo/ui-web';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { iepApi } from '@/lib/api/iep';
import type { IEPStudentSummary } from '@/lib/api/iep';
import type { IEPGoal, IEPGoalStatus, IEPGoalCategory, CreateIEPGoalDto } from '@/lib/types/iep';

// Re-export convenience aliases used throughout the page
type IEPStatus = IEPStudentSummary['iepStatus'];
type GoalStatus = IEPGoalStatus;
type GoalDomain = IEPGoalCategory;

function getStatusColor(status: GoalStatus): string {
  switch (status) {
    case 'mastered':
    case 'met':
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
  const [students, setStudents] = useState<IEPStudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<IEPStudentSummary | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showProgressModal, setShowProgressModal] = useState<IEPGoal | null>(null);
  const [progressNote, setProgressNote] = useState('');
  const [progressValue, setProgressValue] = useState('');
  const [progressLevel, setProgressLevel] = useState<GoalStatus>('in_progress');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Add-Goal modal state
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [newGoalDomain, setNewGoalDomain] = useState<GoalDomain>('Reading');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalBaseline, setNewGoalBaseline] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalTargetValue, setNewGoalTargetValue] = useState('100');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  // Schedule-Meeting modal state
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingType, setMeetingType] = useState('annual_review');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingStudentId, setMeetingStudentId] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startVoiceRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setVoiceBlob(blob);
        stream.getTracks().forEach((t) => {
          t.stop();
        });
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
    } catch {
      // Microphone access denied or unavailable
    }
  }, []);

  const stopVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
    }
  }, [isRecordingVoice]);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Fetch IEP students on mount
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await iepApi.getStudentsWithIEP();
      // Normalise arrays defensively
      const transformed: IEPStudentSummary[] = data.map((s) => ({
        ...s,
        goals: Array.isArray(s.goals) ? s.goals : [],
        services: Array.isArray(s.services) ? s.services : [],
        accommodations: Array.isArray(s.accommodations) ? s.accommodations : [],
        complianceAlerts: Array.isArray(s.complianceAlerts) ? s.complianceAlerts : [],
      }));
      setStudents(transformed);
      // Keep selected student in sync after refresh
      if (selectedStudent) {
        const updated = transformed.find((s) => s.id === selectedStudent.id);
        if (updated) setSelectedStudent(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load IEP students'));
    } finally {
      setLoading(false);
    }
  }, [selectedStudent]);

  useEffect(() => {
    void fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => {
      clearTimeout(timer);
    };
  }, [toastMessage]);

  const urgentAlerts = students.flatMap((s) =>
    s.complianceAlerts
      .filter((a) => a.severity === 'urgent')
      .map((a) => ({ ...a, studentName: s.name, studentId: s.id }))
  );

  const handleRecordProgress = async (goal: IEPGoal) => {
    try {
      if (!selectedStudent) return;
      setSavingProgress(true);

      // Build evidence URLs from voice blob and photo file
      const evidenceUrls: string[] = [];
      if (voiceBlob) {
        // Convert voice blob to data-URI for inclusion as evidence
        const voiceDataUri = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(voiceBlob);
        });
        evidenceUrls.push(voiceDataUri);
      }
      if (photoFile) {
        const photoDataUri = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(photoFile);
        });
        evidenceUrls.push(photoDataUri);
      }

      await iepApi.addProgress(selectedStudent.iepId, goal.id, {
        value: parseFloat(progressValue),
        notes: progressNote || undefined,
        date: new Date().toISOString(),
        evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
        dataSource: voiceBlob ? 'observation' : photoFile ? 'work_sample' : undefined,
      });

      // Also update the goal status if the teacher changed the level picker
      if (progressLevel !== goal.status) {
        await iepApi.updateGoal(selectedStudent.iepId, goal.id, { status: progressLevel });
      }

      setToastMessage({ text: 'Progress recorded successfully', type: 'success' });
      setShowProgressModal(null);
      setProgressNote('');
      setProgressValue('');
      setProgressLevel('in_progress');
      setVoiceBlob(null);
      setPhotoFile(null);
      setPhotoPreview(null);

      // Refresh data so the UI reflects the new progress entry
      void fetchStudents();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save progress';
      setToastMessage({ text: msg, type: 'error' });
    } finally {
      setSavingProgress(false);
    }
  };

  // -- Add Goal handler --
  const handleAddGoal = async () => {
    if (!selectedStudent || !newGoalDescription.trim()) return;
    try {
      setSavingGoal(true);
      const dto: CreateIEPGoalDto = {
        category: newGoalDomain,
        areaOfNeed: newGoalDomain,
        description: newGoalDescription,
        baseline: newGoalBaseline,
        targetCriteria: newGoalTarget,
        targetValue: parseFloat(newGoalTargetValue) || 100,
        measurementMethod: 'teacher observation',
        targetDate: newGoalTargetDate
          ? new Date(newGoalTargetDate)
          : new Date(Date.now() + 365 * 86400000),
      };
      await iepApi.addGoal(selectedStudent.iepId, dto);
      setToastMessage({ text: 'Goal added successfully', type: 'success' });
      setShowAddGoalModal(false);
      setNewGoalDescription('');
      setNewGoalBaseline('');
      setNewGoalTarget('');
      setNewGoalTargetValue('100');
      setNewGoalTargetDate('');
      void fetchStudents();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add goal';
      setToastMessage({ text: msg, type: 'error' });
    } finally {
      setSavingGoal(false);
    }
  };

  // -- Schedule Meeting handler --
  const handleScheduleMeeting = async () => {
    const targetStudent = meetingStudentId
      ? students.find((s) => s.id === meetingStudentId)
      : selectedStudent;
    if (!targetStudent || !meetingDate) return;
    try {
      setSavingMeeting(true);
      await iepApi.scheduleMeeting(targetStudent.iepId, {
        type: meetingType,
        scheduledDate: new Date(meetingDate).toISOString(),
        notes: meetingNotes || undefined,
      });
      setToastMessage({ text: 'Meeting scheduled successfully', type: 'success' });
      setShowMeetingModal(false);
      setMeetingDate('');
      setMeetingNotes('');
      setMeetingStudentId('');
      void fetchStudents();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule meeting';
      setToastMessage({ text: msg, type: 'error' });
    } finally {
      setSavingMeeting(false);
    }
  };

  // -- Export Reports handler --
  const handleExportReports = async () => {
    try {
      // Gather all student IEP data to generate a CSV download
      const csvRows = ['Student,Grade,IEP Status,Goals On Track,Goals At Risk,Annual Review Date'];
      for (const s of students) {
        const onTrack = s.goals.filter(
          (g) => g.status === 'on_track' || g.status === 'mastered'
        ).length;
        const atRisk = s.goals.filter((g) => g.status === 'at_risk').length;
        csvRows.push(
          `"${s.name}","${s.grade}","${s.iepStatus}",${onTrack},${atRisk},"${s.annualReviewDate}"`
        );
      }
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iep-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToastMessage({ text: 'Report exported', type: 'success' });
    } catch {
      setToastMessage({ text: 'Failed to export report', type: 'error' });
    }
  };

  // Determine which students need a progress update (no update in last 14 days)
  const studentsNeedingUpdate = new Set(
    students
      .filter((s) =>
        s.goals.some((g) => {
          if (g.status === 'mastered' || g.status === 'discontinued') return false;
          const lastEntry = g.progressHistory[g.progressHistory.length - 1];
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (!lastEntry) return true;
          const daysSince =
            (Date.now() - new Date(lastEntry.date).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince > 14;
        })
      )
      .map((s) => s.id)
  );

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
                {urgentAlerts.map((alert) => (
                  <li
                    key={`alert-${alert.studentId}-${alert.message.slice(0, 20)}`}
                    className="text-sm text-red-700"
                  >
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
                  {studentsNeedingUpdate.has(student.id) && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 animate-pulse"
                      title="Progress update needed — no data recorded in 14+ days"
                    >
                      &#9200; Update Due
                    </span>
                  )}
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
                    {goal.domain || goal.category}: {goal.status.replace('_', ' ')}
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
              {selectedStudent.complianceAlerts.map((alert) => (
                <li
                  key={`ca-${alert.message.slice(0, 20)}`}
                  className="flex items-center justify-between text-sm text-red-700"
                >
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
            <Button
              variant="primary"
              className="text-sm"
              onClick={() => {
                setShowAddGoalModal(true);
              }}
            >
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
                      {goal.domain || goal.category} - {goal.status.replace('_', ' ')}
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
                    <p className="text-xs text-muted">Target: {goal.targetCriteria}</p>
                  </div>
                  <ProgressBar
                    current={goal.currentProgress ?? goal.currentValue}
                    target={goal.targetProgress ?? goal.targetValue}
                    label="Progress toward goal"
                  />
                </div>

                {/* Progress Trend Chart */}
                <div className="mt-4 border-t pt-4">
                  <p className="text-xs font-medium text-muted mb-2">Progress Trend</p>
                  {goal.progressHistory.length >= 2 ? (
                    <div className="relative h-32 w-full">
                      <svg
                        viewBox="0 0 400 120"
                        className="w-full h-full"
                        role="img"
                        aria-label={`Progress trend chart for ${goal.domain || goal.category}`}
                      >
                        {/* Grid lines */}
                        {[0, 25, 50, 75, 100].map((pct) => (
                          <line
                            key={pct}
                            x1="40"
                            y1={100 - pct}
                            x2="390"
                            y2={100 - pct}
                            stroke="#e5e7eb"
                            strokeWidth="0.5"
                          />
                        ))}
                        {/* Target line */}
                        <line
                          x1="40"
                          y1={100 - ((goal.targetProgress ?? goal.targetValue) > 0 ? 100 : 0)}
                          x2="390"
                          y2={100 - ((goal.targetProgress ?? goal.targetValue) > 0 ? 100 : 0)}
                          stroke="#22c55e"
                          strokeWidth="1"
                          strokeDasharray="4 2"
                        />
                        <text
                          x="42"
                          y={100 - ((goal.targetProgress ?? goal.targetValue) > 0 ? 100 : 0) - 3}
                          fontSize="8"
                          fill="#22c55e"
                        >
                          Target
                        </text>
                        {/* Trend line */}
                        <polyline
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeLinejoin="round"
                          points={goal.progressHistory
                            .map((entry, idx) => {
                              const x = 40 + (idx / (goal.progressHistory.length - 1)) * 350;
                              const tp = goal.targetProgress ?? goal.targetValue;
                              const y = 100 - Math.min(100, (entry.value / (tp || 1)) * 100);
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                        {/* Data points */}
                        {goal.progressHistory.map((entry) => {
                          const entryIdx = goal.progressHistory.indexOf(entry);
                          const x = 40 + (entryIdx / (goal.progressHistory.length - 1)) * 350;
                          const tp2 = goal.targetProgress ?? goal.targetValue;
                          const y = 100 - Math.min(100, (entry.value / (tp2 || 1)) * 100);
                          return (
                            <g key={`ph-${entry.date}`}>
                              <circle
                                cx={x}
                                cy={y}
                                r="3"
                                fill="#3b82f6"
                                stroke="#fff"
                                strokeWidth="1"
                              />
                              <text x={x} y="115" fontSize="7" textAnchor="middle" fill="#9ca3af">
                                {new Date(entry.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </text>
                            </g>
                          );
                        })}
                        {/* Y-axis labels */}
                        <text x="2" y="103" fontSize="7" fill="#9ca3af">
                          0
                        </text>
                        <text x="2" y="53" fontSize="7" fill="#9ca3af">
                          {Math.round((goal.targetProgress ?? goal.targetValue) / 2)}
                        </text>
                        <text x="2" y="5" fontSize="7" fill="#9ca3af">
                          {goal.targetProgress ?? goal.targetValue}
                        </text>
                      </svg>
                    </div>
                  ) : (
                    <div className="flex items-end gap-1 h-16">
                      {goal.progressHistory.map((entry) => {
                        const height =
                          (entry.value / ((goal.targetProgress ?? goal.targetValue) || 1)) * 100;
                        return (
                          <div
                            key={`bar-${entry.date}`}
                            className="flex-1 flex flex-col items-center group relative"
                          >
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
                  )}
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
              {selectedStudent.accommodations.map((accommodation) => (
                <li key={accommodation} className="flex items-start gap-2 text-sm">
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
            <Button variant="ghost" className="text-sm" onClick={() => void handleExportReports()}>
              Export Reports
            </Button>
            <Button
              variant="primary"
              className="text-sm"
              onClick={() => {
                setMeetingStudentId('');
                setShowMeetingModal(true);
              }}
            >
              Schedule Meeting
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {view === 'list' ? renderStudentList() : renderStudentDetail()}

      {/* Progress Recording Modal — Enhanced with level, voice, and photo */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-1">Record Progress</h3>
            <p className="text-sm text-muted mb-4">{showProgressModal.description}</p>

            <div className="space-y-4">
              {/* Progress Level */}
              <div>
                <label className="block text-sm font-medium mb-1">Progress Level</label>
                <select
                  value={progressLevel}
                  onChange={(e) => {
                    setProgressLevel(e.target.value as GoalStatus);
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2 bg-white"
                  aria-label="Progress level"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">Emerging / In Progress</option>
                  <option value="on_track">Developing / On Track</option>
                  <option value="at_risk">At Risk</option>
                  <option value="mastered">Mastered</option>
                </select>
              </div>

              {/* Numeric Value */}
              <div>
                <label className="block text-sm font-medium mb-1">Current Value</label>
                <input
                  type="number"
                  value={progressValue}
                  onChange={(e) => {
                    setProgressValue(e.target.value);
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2"
                  placeholder={`Target: ${showProgressModal.targetProgress ?? showProgressModal.targetValue}`}
                  aria-label="Current progress value"
                />
              </div>

              {/* Written Notes */}
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
                  aria-label="Progress notes"
                />
              </div>

              {/* Voice Note Recording */}
              <div>
                <label className="block text-sm font-medium mb-2">Voice Note</label>
                <div className="flex items-center gap-3">
                  {!isRecordingVoice && !voiceBlob && (
                    <button
                      type="button"
                      onClick={() => void startVoiceRecording()}
                      className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                      aria-label="Start voice recording"
                    >
                      <span className="text-lg">&#127908;</span> Record Voice Note
                    </button>
                  )}
                  {isRecordingVoice && (
                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      className="flex items-center gap-2 rounded-lg bg-red-100 border border-red-300 px-4 py-2 text-sm text-red-700 animate-pulse"
                      aria-label="Stop voice recording"
                    >
                      <span className="h-3 w-3 rounded-full bg-red-600" /> Stop Recording
                    </button>
                  )}
                  {voiceBlob && (
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">&#10003;</span>
                      <span className="text-sm text-muted">Voice note recorded</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceBlob(null);
                        }}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Photo / Evidence</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  aria-label="Upload photo evidence"
                />
                {!photoPreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-muted hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <span className="text-2xl">&#128247;</span>
                    <span>Click to upload photo evidence</span>
                  </button>
                ) : (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreview}
                      alt="Photo evidence preview"
                      className="w-full max-h-48 object-contain rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs hover:bg-red-600"
                      aria-label="Remove photo"
                    >
                      &#10005;
                    </button>
                    <p className="text-xs text-muted mt-1">{photoFile?.name}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowProgressModal(null);
                  setProgressLevel('in_progress');
                  setVoiceBlob(null);
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleRecordProgress(showProgressModal)}
                disabled={savingProgress}
              >
                {savingProgress ? 'Saving…' : 'Save Progress'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoalModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add IEP Goal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Domain / Category</label>
                <select
                  value={newGoalDomain}
                  onChange={(e) => {
                    setNewGoalDomain(e.target.value as GoalDomain);
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2 bg-white"
                >
                  <option value="Reading">Reading</option>
                  <option value="Writing">Writing</option>
                  <option value="Math">Math</option>
                  <option value="Communication">Communication</option>
                  <option value="Social/Emotional">Social/Emotional</option>
                  <option value="Behavior">Behavior</option>
                  <option value="Motor Skills">Motor Skills</option>
                  <option value="Self-Help">Self-Help</option>
                  <option value="Transition">Transition</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Goal Description</label>
                <textarea
                  value={newGoalDescription}
                  onChange={(e) => {
                    setNewGoalDescription(e.target.value);
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2"
                  rows={3}
                  placeholder="By [date], [student] will [measurable behavior]..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Baseline</label>
                  <input
                    value={newGoalBaseline}
                    onChange={(e) => {
                      setNewGoalBaseline(e.target.value);
                    }}
                    className="w-full rounded-lg border border-border px-3 py-2"
                    placeholder="e.g., 30% accuracy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Target Criteria</label>
                  <input
                    value={newGoalTarget}
                    onChange={(e) => {
                      setNewGoalTarget(e.target.value);
                    }}
                    className="w-full rounded-lg border border-border px-3 py-2"
                    placeholder="e.g., 80% accuracy"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Value</label>
                  <input
                    type="number"
                    value={newGoalTargetValue}
                    onChange={(e) => {
                      setNewGoalTargetValue(e.target.value);
                    }}
                    className="w-full rounded-lg border border-border px-3 py-2"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Target Date</label>
                  <input
                    type="date"
                    value={newGoalTargetDate}
                    onChange={(e) => {
                      setNewGoalTargetDate(e.target.value);
                    }}
                    className="w-full rounded-lg border border-border px-3 py-2"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddGoalModal(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleAddGoal()}
                disabled={savingGoal || !newGoalDescription.trim()}
              >
                {savingGoal ? 'Adding…' : 'Add Goal'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Schedule IEP Meeting</h3>
            <div className="space-y-4">
              {!selectedStudent && (
                <div>
                  <label className="block text-sm font-medium mb-1">Student</label>
                  <select
                    value={meetingStudentId}
                    onChange={(e) => {
                      setMeetingStudentId(e.target.value);
                    }}
                    className="w-full rounded-lg border border-border px-3 py-2 bg-white"
                  >
                    <option value="">Select a student…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Meeting Type</label>
                <select
                  value={meetingType}
                  onChange={(e) => {
                    setMeetingType(e.target.value);
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2 bg-white"
                >
                  <option value="annual_review">Annual Review</option>
                  <option value="initial">Initial IEP</option>
                  <option value="amendment">Amendment</option>
                  <option value="reevaluation">Re-evaluation</option>
                  <option value="transition">Transition</option>
                  <option value="parent_conference">Parent Conference</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => {
                    setMeetingDate(e.target.value);
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={meetingNotes}
                  onChange={(e) => {
                    setMeetingNotes(e.target.value);
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2"
                  rows={2}
                  placeholder="Additional notes for the meeting…"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowMeetingModal(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleScheduleMeeting()}
                disabled={savingMeeting || !meetingDate || (!selectedStudent && !meetingStudentId)}
              >
                {savingMeeting ? 'Scheduling…' : 'Schedule Meeting'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Toast notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toastMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toastMessage.text}
        </div>
      )}
    </section>
  );
}
