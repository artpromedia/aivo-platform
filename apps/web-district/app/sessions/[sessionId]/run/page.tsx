'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Button, Heading } from '@aivo/ui-web';

import {
  fetchSessionPlanDetail,
  createProgressNote,
  type SessionPlanDetail,
  type SessionPlanItem,
  type Goal,
  type ProgressRating,
} from '@/lib/teacher-planning-api';
import {
  fetchSession,
  addSessionEvent,
  completeSession,
  type Session,
  type ActivityProgress,
  type SessionMetadata,
} from '@/lib/session-api';
import { cn } from '@/lib/cn';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface LocalActivityState {
  itemId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function RunSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [plan, setPlan] = useState<SessionPlanDetail | null>(null);
  const [activityStates, setActivityStates] = useState<Map<string, LocalActivityState>>(new Map());
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load session and plan data
  useEffect(() => {
    async function load() {
      try {
        const sessionData = await fetchSession(sessionId);
        setSession(sessionData);

        // Extract session plan ID from metadata
        const metadata = sessionData.metadataJson as SessionMetadata | null;
        const planId = metadata?.sessionPlanId;

        if (planId) {
          const planData = await fetchSessionPlanDetail(planId);
          setPlan(planData);

          // Initialize activity states
          const states = new Map<string, LocalActivityState>();
          const existingProgress = metadata?.activityProgress ?? [];
          
          planData.items?.forEach((item: SessionPlanItem) => {
            const existing = existingProgress.find((p: ActivityProgress) => p.itemId === item.id);
            states.set(item.id, existing ?? {
              itemId: item.id,
              status: 'not_started',
            });
          });
          setActivityStates(states);

          // Find current item (first non-completed)
          const items = planData.items ?? [];
          const currentIdx = items.findIndex((item: SessionPlanItem) => {
            const state = states.get(item.id);
            return state?.status !== 'completed' && state?.status !== 'skipped';
          });
          setCurrentItemIndex(currentIdx >= 0 ? currentIdx : 0);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load session');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [sessionId]);

  // Timer
  useEffect(() => {
    if (!session) return;
    
    const startTime = new Date(session.startedAt).getTime();
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const updateActivityState = useCallback(async (
    itemId: string,
    status: LocalActivityState['status']
  ) => {
    const now = new Date().toISOString();
    
    setActivityStates(prev => {
      const newStates = new Map(prev);
      const current = newStates.get(itemId) ?? { itemId, status: 'not_started' };
      
      newStates.set(itemId, {
        ...current,
        status,
        ...(status === 'in_progress' && { startedAt: now }),
        ...(status === 'completed' || status === 'skipped' ? { completedAt: now } : {}),
      });
      
      return newStates;
    });

    // Send event to backend
    try {
      if (status === 'in_progress') {
        await addSessionEvent(sessionId, {
          eventType: 'ACTIVITY_STARTED',
          metadataJson: { itemId },
        });
      } else if (status === 'completed') {
        await addSessionEvent(sessionId, {
          eventType: 'ACTIVITY_COMPLETED',
          metadataJson: { itemId },
        });
      } else if (status === 'skipped') {
        await addSessionEvent(sessionId, {
          eventType: 'ACTIVITY_SKIPPED',
          metadataJson: { itemId },
        });
      }
    } catch (e) {
      console.error('Failed to send activity event:', e);
    }
  }, [sessionId]);

  const handleStartActivity = useCallback((index: number) => {
    const items = plan?.items ?? [];
    const item = items[index];
    if (!item) return;
    
    void updateActivityState(item.id, 'in_progress');
    setCurrentItemIndex(index);
  }, [plan, updateActivityState]);

  const handleCompleteActivity = useCallback((index: number) => {
    const items = plan?.items ?? [];
    const item = items[index];
    if (!item) return;
    
    void updateActivityState(item.id, 'completed');
    
    // Auto-advance to next incomplete item
    const nextIndex = items.findIndex((i: SessionPlanItem, idx: number) => {
      if (idx <= index) return false;
      const state = activityStates.get(i.id);
      return state?.status !== 'completed' && state?.status !== 'skipped';
    });
    
    if (nextIndex >= 0) {
      setCurrentItemIndex(nextIndex);
    }
  }, [plan, activityStates, updateActivityState]);

  const handleSkipActivity = useCallback((index: number) => {
    const items = plan?.items ?? [];
    const item = items[index];
    if (!item) return;
    
    void updateActivityState(item.id, 'skipped');
    
    // Auto-advance to next incomplete item
    const nextIndex = items.findIndex((i: SessionPlanItem, idx: number) => {
      if (idx <= index) return false;
      const state = activityStates.get(i.id);
      return state?.status !== 'completed' && state?.status !== 'skipped';
    });
    
    if (nextIndex >= 0) {
      setCurrentItemIndex(nextIndex);
    }
  }, [plan, activityStates, updateActivityState]);

  const handleEndSession = useCallback(async () => {
    setIsEnding(true);
    try {
      await completeSession(sessionId);
      router.push(`/sessions/${sessionId}/summary`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to end session');
      setIsEnding(false);
    }
  }, [sessionId, router]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !session || !plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-error">{error || 'Session not found'}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const items = plan.items ?? [];
  const completedCount = Array.from(activityStates.values()).filter(
    s => s.status === 'completed'
  ).length;

  return (
    <div className="flex flex-col min-h-screen bg-surface-secondary">
      {/* Top Bar */}
      <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">
              {plan.sessionTemplateName || 'Session in Progress'}
            </h1>
            <Badge tone="warning">Live</Badge>
          </div>

          <div className="flex items-center gap-6">
            {/* Timer */}
            <div className="flex items-center gap-2 text-lg font-mono">
              <ClockIcon className="w-5 h-5 text-muted" />
              <span>{formatTime(elapsedTime)}</span>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${items.length ? (completedCount / items.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm text-muted">
                {completedCount}/{items.length}
              </span>
            </div>

            {/* Actions */}
            <Button
              variant="secondary"
              onClick={() => setShowNoteModal(true)}
            >
              <NoteIcon className="w-4 h-4 mr-1" />
              Add Note
            </Button>
            <Button
              variant="primary"
              onClick={handleEndSession}
              disabled={isEnding}
            >
              {isEnding ? 'Ending...' : 'End Session'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-12 gap-6">
          {/* Activity List (Sidebar) */}
          <aside className="col-span-4">
            <Card className="sticky top-24">
              <div className="p-4 border-b border-border">
                <Heading level={3}>Activities</Heading>
              </div>
              <div className="divide-y divide-border max-h-[calc(100vh-200px)] overflow-y-auto">
                {items.map((item: SessionPlanItem, index: number) => {
                  const state = activityStates.get(item.id);
                  const isActive = index === currentItemIndex;
                  const goal = item.goalId ? plan.goals[item.goalId] : null;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentItemIndex(index)}
                      className={cn(
                        'w-full p-4 text-left transition-colors',
                        isActive ? 'bg-primary/5' : 'hover:bg-surface',
                        state?.status === 'completed' && 'opacity-60'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <StatusIndicator status={state?.status ?? 'not_started'} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.activityType}</p>
                          {goal && (
                            <p className="text-xs text-muted truncate mt-0.5">
                              Goal: {goal.title}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </aside>

          {/* Current Activity (Main) */}
          <section className="col-span-8">
            <CurrentActivityPanel
              item={items[currentItemIndex]}
              index={currentItemIndex}
              total={items.length}
              state={activityStates.get(items[currentItemIndex]?.id ?? '')}
              goal={items[currentItemIndex]?.goalId ? (plan.goals[items[currentItemIndex].goalId!] ?? null) : null}
              onStart={() => handleStartActivity(currentItemIndex)}
              onComplete={() => handleCompleteActivity(currentItemIndex)}
              onSkip={() => handleSkipActivity(currentItemIndex)}
              onPrevious={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
              onNext={() => setCurrentItemIndex(Math.min(items.length - 1, currentItemIndex + 1))}
            />
          </section>
        </div>
      </main>

      {/* Note Modal */}
      {showNoteModal && (
        <QuickNoteModal
          learnerId={plan.learnerId}
          sessionId={sessionId}
          sessionPlanId={plan.id}
          items={items}
          goals={plan.goals}
          onClose={() => setShowNoteModal(false)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

interface StatusIndicatorProps {
  status: LocalActivityState['status'];
}

function StatusIndicator({ status }: StatusIndicatorProps) {
  if (status === 'completed') {
    return (
      <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center">
        <CheckIcon className="w-4 h-4" />
      </div>
    );
  }
  if (status === 'skipped') {
    return (
      <div className="w-6 h-6 rounded-full bg-neutral-400 text-white flex items-center justify-center">
        <SkipIcon className="w-4 h-4" />
      </div>
    );
  }
  if (status === 'in_progress') {
    return (
      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
        <PlayIcon className="w-3 h-3" />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full border-2 border-muted" />
  );
}

interface CurrentActivityPanelProps {
  item: SessionPlanItem | undefined;
  index: number;
  total: number;
  state: LocalActivityState | undefined;
  goal: Goal | null;
  onStart: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

function CurrentActivityPanel({
  item,
  index,
  total,
  state,
  goal,
  onStart,
  onComplete,
  onSkip,
  onPrevious,
  onNext,
}: CurrentActivityPanelProps) {
  if (!item) {
    return (
      <Card>
        <div className="p-8 text-center text-muted">
          No activity selected
        </div>
      </Card>
    );
  }

  const isNotStarted = state?.status === 'not_started';
  const isInProgress = state?.status === 'in_progress';
  const isCompleted = state?.status === 'completed';
  const isSkipped = state?.status === 'skipped';

  return (
    <Card>
      <div className="p-6">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onPrevious}
            disabled={index === 0}
            className="p-2 hover:bg-surface rounded disabled:opacity-30"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted">
            Activity {index + 1} of {total}
          </span>
          <button
            onClick={onNext}
            disabled={index === total - 1}
            className="p-2 hover:bg-surface rounded disabled:opacity-30"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Activity Content */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Badge tone={isCompleted ? 'success' : isSkipped ? 'neutral' : 'info'}>
              {item.activityType}
            </Badge>
            {item.estimatedDurationMinutes && (
              <span className="text-sm text-muted">
                ~{item.estimatedDurationMinutes} min
              </span>
            )}
          </div>
          
          {item.activityDescription && (
            <p className="text-lg mb-4">{item.activityDescription}</p>
          )}

          {goal && (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-surface rounded-lg">
              <TargetIcon className="w-4 h-4 text-primary" />
              <span className="text-sm">
                <span className="text-muted">Goal:</span>{' '}
                <span className="font-medium">{goal.title}</span>
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          {isNotStarted && (
            <>
              <Button variant="secondary" onClick={onSkip}>
                Skip
              </Button>
              <Button variant="primary" onClick={onStart}>
                <PlayIcon className="w-4 h-4 mr-2" />
                Start Activity
              </Button>
            </>
          )}
          
          {isInProgress && (
            <>
              <Button variant="secondary" onClick={onSkip}>
                Skip
              </Button>
              <Button variant="primary" onClick={onComplete}>
                <CheckIcon className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            </>
          )}
          
          {(isCompleted || isSkipped) && (
            <div className="flex items-center gap-2 text-muted">
              {isCompleted ? (
                <>
                  <CheckIcon className="w-5 h-5 text-green-500" />
                  <span>Completed</span>
                </>
              ) : (
                <>
                  <SkipIcon className="w-5 h-5" />
                  <span>Skipped</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

interface QuickNoteModalProps {
  learnerId: string;
  sessionId: string;
  sessionPlanId: string;
  items: SessionPlanItem[];
  goals: Record<string, Goal>;
  onClose: () => void;
}

function QuickNoteModal({
  learnerId,
  sessionId,
  sessionPlanId,
  items,
  goals,
  onClose,
}: QuickNoteModalProps) {
  const [noteText, setNoteText] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [rating, setRating] = useState<ProgressRating | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uniqueGoalIds = [...new Set(items.map(i => i.goalId).filter((id): id is string => !!id))];

  const handleSubmit = async () => {
    if (!noteText.trim()) return;
    
    setIsSubmitting(true);
    try {
      const noteInput: {
        learnerId: string;
        sessionId: string;
        sessionPlanId: string;
        goalId?: string;
        noteText: string;
        rating?: ProgressRating;
      } = {
        learnerId,
        sessionId,
        sessionPlanId,
        noteText: noteText.trim(),
      };
      
      if (selectedGoalId) {
        noteInput.goalId = selectedGoalId;
      }
      if (rating !== null) {
        noteInput.rating = rating;
      }
      
      await createProgressNote(noteInput);
      
      // Also send event
      await addSessionEvent(sessionId, {
        eventType: 'NOTE_ADDED',
        metadataJson: { goalId: selectedGoalId || null },
      });
      
      onClose();
    } catch (e) {
      console.error('Failed to save note:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative w-full max-w-lg mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading level={3}>Quick Note</Heading>
            <button onClick={onClose} className="p-1 hover:bg-surface rounded">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="What did you observe?"
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {uniqueGoalIds.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Related Goal (optional)</label>
                <select
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No specific goal</option>
                  {uniqueGoalIds.map(id => {
                    const goal = goals[id];
                    return goal ? (
                      <option key={id} value={id}>{goal.title}</option>
                    ) : null;
                  })}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Progress Rating (optional)</label>
              <div className="flex gap-2">
                {([0, 1, 2, 3, 4] as ProgressRating[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRating(rating === r ? null : r)}
                    className={cn(
                      'w-10 h-10 rounded-full border-2 transition-colors',
                      rating === r
                        ? 'border-primary bg-primary text-white'
                        : 'border-border hover:border-primary'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!noteText.trim() || isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ICONS
// ══════════════════════════════════════════════════════════════════════════════

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
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

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
