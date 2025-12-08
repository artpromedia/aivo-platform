'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, Badge, Button, Heading } from '@aivo/ui-web';

import {
  fetchSessionPlanDetail,
  fetchProgressNotes,
  type SessionPlanDetail,
  type SessionPlanItem,
  type ProgressNote,
} from '@/lib/teacher-planning-api';
import {
  getSessionSummary,
  type SessionSummary,
} from '@/lib/session-api';

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function SessionSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [plan, setPlan] = useState<SessionPlanDetail | null>(null);
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const summaryData = await getSessionSummary(sessionId);
        setSummary(summaryData);

        // Load plan if available
        const metadata = summaryData.session.metadataJson as SessionMetadata | null;
        const planId = metadata?.sessionPlanId;

        if (planId) {
          const [planData, notesResponse] = await Promise.all([
            fetchSessionPlanDetail(planId),
            fetchProgressNotes(summaryData.session.learnerId, { sessionId }),
          ]);
          setPlan(planData);
          setNotes(notesResponse.data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load session summary');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-error">{error || 'Session not found'}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const { session, durationMinutes, activitiesCompleted, activitiesTotal, notesAdded, events } = summary;

  return (
    <div className="min-h-screen bg-surface-secondary p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
            <CheckCircleIcon className="w-8 h-8" />
          </div>
          <Heading level={1}>Session Complete!</Heading>
          <p className="text-muted mt-2">
            {plan?.sessionTemplateName || 'Learning Session'} •{' '}
            {new Date(session.startedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <div className="p-6 text-center">
              <ClockIcon className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold">{durationMinutes}</p>
              <p className="text-sm text-muted">Minutes</p>
            </div>
          </Card>

          <Card>
            <div className="p-6 text-center">
              <CheckIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-3xl font-bold">
                {activitiesCompleted}
                {activitiesTotal > 0 && <span className="text-lg text-muted">/{activitiesTotal}</span>}
              </p>
              <p className="text-sm text-muted">Activities</p>
            </div>
          </Card>

          <Card>
            <div className="p-6 text-center">
              <NoteIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-3xl font-bold">{notesAdded}</p>
              <p className="text-sm text-muted">Notes Added</p>
            </div>
          </Card>
        </div>

        {/* Activity Summary */}
        {plan && plan.items && plan.items.length > 0 && (
          <Card className="mb-6">
            <div className="p-6">
              <Heading level={2} className="mb-4">Activities Completed</Heading>
              <div className="space-y-3">
                {plan.items.map((item: SessionPlanItem) => {
                  const completedEvent = events.find(
                    e => e.eventType === 'ACTIVITY_COMPLETED' && 
                    (e.metadataJson as Record<string, unknown> | null)?.itemId === item.id
                  );
                  const skippedEvent = events.find(
                    e => e.eventType === 'ACTIVITY_SKIPPED' && 
                    (e.metadataJson as Record<string, unknown> | null)?.itemId === item.id
                  );
                  const isCompleted = !!completedEvent;
                  const isSkipped = !!skippedEvent;
                  const goal = item.goalId ? plan.goals[item.goalId] : null;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg',
                        isCompleted ? 'bg-green-50' : isSkipped ? 'bg-neutral-100' : 'bg-surface'
                      )}
                    >
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center">
                          <CheckIcon className="w-4 h-4" />
                        </div>
                      ) : isSkipped ? (
                        <div className="w-6 h-6 rounded-full bg-neutral-400 text-white flex items-center justify-center">
                          <SkipIcon className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-muted" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.activityType}</p>
                        {goal && (
                          <p className="text-xs text-muted">Goal: {goal.title}</p>
                        )}
                      </div>
                      <Badge tone={isCompleted ? 'success' : isSkipped ? 'neutral' : 'warning'}>
                        {isCompleted ? 'Completed' : isSkipped ? 'Skipped' : 'Not Done'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Notes */}
        {notes.length > 0 && (
          <Card className="mb-6">
            <div className="p-6">
              <Heading level={2} className="mb-4">Progress Notes</Heading>
              <div className="space-y-4">
                {notes.map((note) => {
                  const goal = note.goalId && plan ? plan.goals[note.goalId] : null;
                  
                  return (
                    <div key={note.id} className="border-l-2 border-primary pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-muted">
                          {new Date(note.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {goal && (
                          <Badge tone="info">{goal.title}</Badge>
                        )}
                        {note.rating !== null && (
                          <Badge tone={note.rating >= 3 ? 'success' : note.rating <= 1 ? 'error' : 'warning'}>
                            Rating: {note.rating}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{note.noteText}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="secondary"
            onClick={() => {
              // Navigate back to dashboard (classroomId not available in session context)
              router.push('/dashboard');
            }}
          >
            Back to Dashboard
          </Button>
          {plan && (
            <Button
              variant="primary"
              onClick={() => {
                // Could navigate to create a new session from same plan
                router.push(`/classrooms/default/learner/${session.learnerId}/session-plans/${plan.id}`);
              }}
            >
              View Plan Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ICONS
// ══════════════════════════════════════════════════════════════════════════════

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function NoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function SkipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  );
}
