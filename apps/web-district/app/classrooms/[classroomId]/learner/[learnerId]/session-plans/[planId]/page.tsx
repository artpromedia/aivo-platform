'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, Badge, Button, Heading } from '@aivo/ui-web';

import {
  fetchSessionPlanDetail,
  type SessionPlanDetail,
  type SessionPlanStatus,
  type SessionPlanItem,
  type Goal,
} from '@/lib/teacher-planning-api';
import { startSessionFromPlan } from '@/lib/session-api';

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function formatSessionType(type: string): string {
  const map: Record<string, string> = {
    LEARNING: 'Learning',
    THERAPY: 'Therapy',
    GROUP: 'Group',
    ASSESSMENT: 'Assessment',
    PRACTICE: 'Practice',
    OTHER: 'Other',
  };
  return map[type] ?? type;
}

function formatStatus(status: SessionPlanStatus): string {
  const map: Record<SessionPlanStatus, string> = {
    DRAFT: 'Draft',
    PLANNED: 'Planned',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return map[status] ?? status;
}

function getStatusTone(status: SessionPlanStatus): 'neutral' | 'info' | 'warning' | 'success' | 'error' {
  const map: Record<SessionPlanStatus, 'neutral' | 'info' | 'warning' | 'success' | 'error'> = {
    DRAFT: 'neutral',
    PLANNED: 'info',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    CANCELLED: 'error',
  };
  return map[status] ?? 'neutral';
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function SessionPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;
  // These are available for future use (e.g., navigation back)
  const _classroomId = params.classroomId as string;
  const _learnerId = params.learnerId as string;

  const [plan, setPlan] = useState<SessionPlanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchSessionPlanDetail(planId);
        setPlan(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load session plan');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [planId]);

  const handleStartSession = async () => {
    if (!plan) return;
    
    setIsStarting(true);
    try {
      const { sessionId } = await startSessionFromPlan({
        learnerId: plan.learnerId,
        sessionPlanId: plan.id,
      });
      // Navigate to run session page
      router.push(`/sessions/${sessionId}/run`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start session');
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-error">{error || 'Session plan not found'}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const canStart = plan.status === 'PLANNED' || plan.status === 'DRAFT';

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-muted hover:text-text mb-2 flex items-center gap-1"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back to Learner Profile
          </button>
          <Heading level={1}>
            {plan.sessionTemplateName || `${formatSessionType(plan.sessionType)} Session`}
          </Heading>
          <div className="flex items-center gap-3 mt-2">
            <Badge tone={getStatusTone(plan.status)}>{formatStatus(plan.status)}</Badge>
            <Badge tone="info">{formatSessionType(plan.sessionType)}</Badge>
            {plan.estimatedDurationMinutes && (
              <span className="text-sm text-muted">
                <ClockIcon className="w-4 h-4 inline mr-1" />
                {plan.estimatedDurationMinutes} min
              </span>
            )}
          </div>
        </div>

        {canStart && (
          <Button
            variant="primary"
            onClick={handleStartSession}
            disabled={isStarting}
            className="shrink-0"
          >
            {isStarting ? 'Starting...' : 'Start Session'}
          </Button>
        )}
      </div>

      {/* Schedule Info */}
      {plan.scheduledFor && (
        <Card>
          <div className="p-4 flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-muted" />
            <div>
              <p className="font-medium">Scheduled For</p>
              <p className="text-sm text-muted">
                {new Date(plan.scheduledFor).toLocaleDateString()} at{' '}
                {new Date(plan.scheduledFor).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Session Items */}
      <section>
        <Heading level={2} className="mb-4">
          Session Activities ({plan.items?.length ?? 0})
        </Heading>

        {!plan.items || plan.items.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-muted">
              No activities have been added to this session plan yet.
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {plan.items.map((item: SessionPlanItem, index: number) => {
              const goal = item.goalId ? plan.goals[item.goalId] : null;
              
              return (
                <Card key={item.id}>
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Order Number */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
                        {index + 1}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{item.activityType}</span>
                          {item.estimatedDurationMinutes && (
                            <span className="text-sm text-muted">
                              ({item.estimatedDurationMinutes} min)
                            </span>
                          )}
                        </div>

                        {item.activityDescription && (
                          <p className="text-sm text-muted mb-2">{item.activityDescription}</p>
                        )}

                        {/* Goal Badge */}
                        {goal && (
                          <GoalBadge goal={goal} />
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Linked Goals */}
      {plan.linkedGoalIds.length > 0 && (
        <section>
          <Heading level={2} className="mb-4">
            Linked Goals ({plan.linkedGoalIds.length})
          </Heading>

          <div className="flex flex-col gap-3">
            {plan.linkedGoalIds.map((goalId: string) => {
              const goal = plan.goals[goalId];
              if (!goal) return null;
              
              return (
                <Card key={goalId}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-medium">{goal.title}</h4>
                        {goal.description && (
                          <p className="text-sm text-muted mt-1">{goal.description}</p>
                        )}
                      </div>
                      <Badge tone={goal.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {goal.domain}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function GoalBadge({ goal }: { goal: Goal }) {
  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 bg-surface rounded text-sm">
      <TargetIcon className="w-3.5 h-3.5 text-primary" />
      <span className="text-muted">Goal:</span>
      <span className="font-medium truncate max-w-[200px]">{goal.title}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ICONS
// ══════════════════════════════════════════════════════════════════════════════

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
