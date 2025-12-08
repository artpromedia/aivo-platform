'use client';

import { Card, Badge, Heading, Button } from '@aivo/ui-web';
import { useState, useCallback } from 'react';

import {
  createSessionPlan,
  createProgressNote,
  updateSessionPlan,
  type SessionPlan,
  type ProgressNote,
  type SessionPlanType,
  type SessionPlanStatus,
  type ProgressRating,
} from '../../../../../lib/teacher-planning-api';
import { cn } from '@/lib/cn';

import { useLearnerProfile } from './context';

/**
 * Plans & Notes Tab
 *
 * Displays:
 * - Session plans list with filtering and Create Plan form
 * - Progress notes timeline with Add Note modal
 */
export function PlansNotesTab() {
  const { learner, classroomId, goals, sessionPlans, progressNotes, refetchSessionPlans, refetchProgressNotes } =
    useLearnerProfile();
  const [activeSection, setActiveSection] = useState<'plans' | 'notes'>('plans');
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreatePlan = useCallback(
    async (input: {
      sessionType: SessionPlanType;
      scheduledFor?: string;
      templateName?: string;
      goalIds?: string[];
    }) => {
      setIsLoading(true);
      try {
        await createSessionPlan(learner.id, input);
        await refetchSessionPlans();
        setShowCreatePlanModal(false);
      } catch (error) {
        console.error('Failed to create session plan:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [learner.id, refetchSessionPlans]
  );

  const handleUpdatePlanStatus = useCallback(
    async (planId: string, status: SessionPlanStatus) => {
      try {
        await updateSessionPlan(planId, { status });
        await refetchSessionPlans();
      } catch (error) {
        console.error('Failed to update session plan:', error);
      }
    },
    [refetchSessionPlans]
  );

  const handleAddNote = useCallback(
    async (input: {
      noteText: string;
      goalId?: string;
      sessionPlanId?: string;
      rating?: ProgressRating;
    }) => {
      setIsLoading(true);
      try {
        await createProgressNote({
          learnerId: learner.id,
          ...input,
        });
        await refetchProgressNotes();
        setShowAddNoteModal(false);
      } catch (error) {
        console.error('Failed to create progress note:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [learner.id, refetchProgressNotes]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Section Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveSection('plans')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeSection === 'plans'
              ? 'bg-primary text-white'
              : 'bg-surface text-muted hover:text-text'
          )}
        >
          Session Plans ({sessionPlans.length})
        </button>
        <button
          onClick={() => setActiveSection('notes')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeSection === 'notes'
              ? 'bg-primary text-white'
              : 'bg-surface text-muted hover:text-text'
          )}
        >
          Progress Notes ({progressNotes.length})
        </button>
      </div>

      {/* Session Plans Section */}
      {activeSection === 'plans' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <Heading level={2}>Session Plans</Heading>
            <Button variant="primary" onClick={() => setShowCreatePlanModal(true)}>
              + Create Plan
            </Button>
          </div>

          {sessionPlans.length === 0 ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-muted mb-4">No session plans have been created yet.</p>
                <Button variant="primary" onClick={() => setShowCreatePlanModal(true)}>
                  Create First Plan
                </Button>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {sessionPlans.map((plan) => (
                <SessionPlanCard
                  key={plan.id}
                  plan={plan}
                  classroomId={classroomId}
                  onUpdateStatus={handleUpdatePlanStatus}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Progress Notes Section */}
      {activeSection === 'notes' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <Heading level={2}>Progress Notes</Heading>
            <Button variant="primary" onClick={() => setShowAddNoteModal(true)}>
              + Add Note
            </Button>
          </div>

          {progressNotes.length === 0 ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-muted mb-4">No progress notes have been recorded yet.</p>
                <Button variant="primary" onClick={() => setShowAddNoteModal(true)}>
                  Add First Note
                </Button>
              </div>
            </Card>
          ) : (
            <NotesTimeline notes={progressNotes} goals={goals} />
          )}
        </section>
      )}

      {/* Create Plan Modal */}
      {showCreatePlanModal && (
        <CreatePlanModal
          goals={goals}
          onClose={() => setShowCreatePlanModal(false)}
          onSubmit={handleCreatePlan}
          isLoading={isLoading}
        />
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <AddNoteModal
          goals={goals}
          sessionPlans={sessionPlans}
          onClose={() => setShowAddNoteModal(false)}
          onSubmit={handleAddNote}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN CARD
// ══════════════════════════════════════════════════════════════════════════════

interface SessionPlanCardProps {
  plan: SessionPlan;
  classroomId: string;
  onUpdateStatus: (planId: string, status: SessionPlanStatus) => void;
}

function SessionPlanCard({ plan, classroomId, onUpdateStatus }: SessionPlanCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const canStart = plan.status === 'DRAFT' || plan.status === 'PLANNED';

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <a
                href={`/classrooms/${classroomId}/learner/${plan.learnerId}/session-plans/${plan.id}`}
                className="font-medium hover:text-primary hover:underline"
              >
                {plan.sessionTemplateName || `${plan.sessionType} Session`}
              </a>
              <Badge tone={getSessionTypeTone(plan.sessionType)}>
                {formatSessionType(plan.sessionType)}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
              {plan.scheduledFor && (
                <span>
                  <CalendarIcon className="w-4 h-4 inline mr-1" />
                  {new Date(plan.scheduledFor).toLocaleDateString()} at{' '}
                  {new Date(plan.scheduledFor).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              {plan.estimatedDurationMinutes && (
                <span>
                  <ClockIcon className="w-4 h-4 inline mr-1" />
                  {plan.estimatedDurationMinutes} min
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canStart && (
              <a
                href={`/classrooms/${classroomId}/learner/${plan.learnerId}/session-plans/${plan.id}`}
                className="px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90"
              >
                View & Start
              </a>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="flex items-center gap-1"
              >
                <Badge tone={getStatusTone(plan.status)}>
                  {formatStatus(plan.status)}
                </Badge>
                <ChevronDownIcon className="w-4 h-4 text-muted" />
              </button>

              {showStatusMenu && (
                <div className="absolute top-8 right-0 z-10 bg-background border border-border rounded-md shadow-lg py-1 min-w-[140px]">
                  {(
                    ['DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as SessionPlanStatus[]
                  ).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        onUpdateStatus(plan.id, s);
                        setShowStatusMenu(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-sm hover:bg-surface',
                        plan.status === s && 'font-medium bg-surface'
                      )}
                    >
                      {formatStatus(s)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTES TIMELINE
// ══════════════════════════════════════════════════════════════════════════════

interface NotesTimelineProps {
  notes: ProgressNote[];
  goals: { id: string; title: string }[];
}

function NotesTimeline({ notes, goals }: NotesTimelineProps) {
  const getGoalTitle = (goalId: string | null) => {
    if (!goalId) return null;
    return goals.find((g) => g.id === goalId)?.title ?? 'Unknown Goal';
  };

  // Sort notes by date, newest first
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

      <div className="flex flex-col gap-4">
        {sortedNotes.map((note) => (
          <div key={note.id} className="relative pl-10">
            {/* Timeline dot */}
            <div
              className={cn(
                'absolute left-2 top-2 w-4 h-4 rounded-full border-2 bg-background',
                note.rating !== null && note.rating >= 3
                  ? 'border-green-500'
                  : note.rating !== null && note.rating <= 1
                  ? 'border-red-500'
                  : 'border-primary'
              )}
            />

            <Card>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted">
                      {new Date(note.createdAt).toLocaleDateString()} at{' '}
                      {new Date(note.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {note.goalId && (
                      <Badge tone="info">
                        {getGoalTitle(note.goalId)}
                      </Badge>
                    )}
                  </div>
                  {note.rating !== null && <RatingStars rating={note.rating as ProgressRating} />}
                </div>

                <p className="text-sm whitespace-pre-wrap">{note.noteText}</p>

                {note.evidenceUri && (
                  <a
                    href={note.evidenceUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline mt-2 inline-block"
                  >
                    View Evidence
                  </a>
                )}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RATING STARS
// ══════════════════════════════════════════════════════════════════════════════

function RatingStars({ rating }: { rating: ProgressRating }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating} out of 4`}>
      {[1, 2, 3, 4].map((star) => (
        <StarIcon
          key={star}
          className={cn('w-4 h-4', star <= rating ? 'text-yellow-500' : 'text-border')}
          filled={star <= rating}
        />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CREATE PLAN MODAL
// ══════════════════════════════════════════════════════════════════════════════

interface CreatePlanModalProps {
  goals: { id: string; title: string }[];
  onClose: () => void;
  onSubmit: (input: {
    sessionType: SessionPlanType;
    scheduledFor?: string;
    templateName?: string;
    goalIds?: string[];
  }) => void;
  isLoading: boolean;
}

function CreatePlanModal({ goals, onClose, onSubmit, isLoading }: CreatePlanModalProps) {
  const [sessionType, setSessionType] = useState<SessionPlanType>('LEARNING');
  const [templateName, setTemplateName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const input: {
      sessionType: SessionPlanType;
      scheduledFor?: string;
      templateName?: string;
      goalIds?: string[];
    } = { sessionType };

    if (scheduledDate && scheduledTime) {
      input.scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    } else if (scheduledDate) {
      input.scheduledFor = new Date(`${scheduledDate}T09:00`).toISOString();
    }

    if (templateName.trim()) {
      input.templateName = templateName.trim();
    }

    if (selectedGoalIds.length > 0) {
      input.goalIds = selectedGoalIds;
    }

    onSubmit(input);
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoalIds((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    );
  };

  return (
    <Modal title="Create Session Plan" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="plan-type" className="block text-sm font-medium mb-1">
            Session Type <span className="text-red-500">*</span>
          </label>
          <select
            id="plan-type"
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as SessionPlanType)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="LEARNING">Learning</option>
            <option value="THERAPY">Therapy</option>
            <option value="GROUP">Group</option>
            <option value="ASSESSMENT">Assessment</option>
            <option value="PRACTICE">Practice</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="plan-name" className="block text-sm font-medium mb-1">
            Session Name
          </label>
          <input
            id="plan-name"
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., Reading Fluency Practice"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="plan-date" className="block text-sm font-medium mb-1">
              Scheduled Date
            </label>
            <input
              id="plan-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="plan-time" className="block text-sm font-medium mb-1">
              Time
            </label>
            <input
              id="plan-time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Goal Selection */}
        {goals.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Associated Goals (optional)
            </label>
            <div className="max-h-32 overflow-y-auto border border-border rounded-md p-2">
              {goals.map((goal) => (
                <label
                  key={goal.id}
                  className="flex items-center gap-2 p-1 hover:bg-surface rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedGoalIds.includes(goal.id)}
                    onChange={() => toggleGoal(goal.id)}
                    className="rounded border-border"
                  />
                  <span className="text-sm truncate">{goal.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADD NOTE MODAL
// ══════════════════════════════════════════════════════════════════════════════

interface AddNoteModalProps {
  goals: { id: string; title: string }[];
  sessionPlans: { id: string; sessionTemplateName: string | null; sessionType: SessionPlanType }[];
  onClose: () => void;
  onSubmit: (input: {
    noteText: string;
    goalId?: string;
    sessionPlanId?: string;
    rating?: ProgressRating;
  }) => void;
  isLoading: boolean;
}

function AddNoteModal({ goals, sessionPlans, onClose, onSubmit, isLoading }: AddNoteModalProps) {
  const [noteText, setNoteText] = useState('');
  const [goalId, setGoalId] = useState('');
  const [sessionPlanId, setSessionPlanId] = useState('');
  const [rating, setRating] = useState<ProgressRating | ''>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const input: {
      noteText: string;
      goalId?: string;
      sessionPlanId?: string;
      rating?: ProgressRating;
    } = { noteText: noteText.trim() };

    if (goalId) {
      input.goalId = goalId;
    }
    if (sessionPlanId) {
      input.sessionPlanId = sessionPlanId;
    }
    if (rating !== '') {
      input.rating = rating;
    }

    onSubmit(input);
  };

  return (
    <Modal title="Add Progress Note" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="note-text" className="block text-sm font-medium mb-1">
            Note <span className="text-red-500">*</span>
          </label>
          <textarea
            id="note-text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]"
            placeholder="Describe the learner's progress, observations, or achievements..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {goals.length > 0 && (
            <div>
              <label htmlFor="note-goal" className="block text-sm font-medium mb-1">
                Related Goal
              </label>
              <select
                id="note-goal"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">None</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {sessionPlans.length > 0 && (
            <div>
              <label htmlFor="note-session" className="block text-sm font-medium mb-1">
                Related Session
              </label>
              <select
                id="note-session"
                value={sessionPlanId}
                onChange={(e) => setSessionPlanId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">None</option>
                {sessionPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sessionTemplateName || formatSessionType(p.sessionType)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Progress Rating</label>
          <div className="flex items-center gap-2">
            {([0, 1, 2, 3, 4] as ProgressRating[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRating(rating === r ? '' : r)}
                className={cn(
                  'w-10 h-10 rounded-md border-2 flex items-center justify-center text-sm font-medium transition-colors',
                  rating === r
                    ? 'border-primary bg-primary text-white'
                    : 'border-border hover:border-primary'
                )}
                aria-label={`Rating ${r}`}
              >
                {r}
              </button>
            ))}
            <span className="text-sm text-muted ml-2">
              {rating === 0
                ? 'No progress'
                : rating === 1
                ? 'Minimal'
                : rating === 2
                ? 'Some'
                : rating === 3
                ? 'Good'
                : rating === 4
                ? 'Excellent'
                : 'Optional'}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || !noteText.trim()}>
            {isLoading ? 'Adding...' : 'Add Note'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 id="modal-title" className="text-lg font-semibold">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            aria-label="Close modal"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ICONS
// ══════════════════════════════════════════════════════════════════════════════

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function StarIcon({ className, filled }: { className?: string; filled: boolean }) {
  return (
    <svg
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getSessionTypeTone(type: SessionPlanType): 'info' | 'success' | 'warning' | 'error' {
  switch (type) {
    case 'LEARNING':
      return 'info';
    case 'THERAPY':
      return 'success';
    case 'GROUP':
      return 'info';
    case 'ASSESSMENT':
      return 'warning';
    case 'PRACTICE':
      return 'success';
    default:
      return 'info';
  }
}

function formatSessionType(type: SessionPlanType): string {
  switch (type) {
    case 'LEARNING':
      return 'Learning';
    case 'THERAPY':
      return 'Therapy';
    case 'GROUP':
      return 'Group';
    case 'ASSESSMENT':
      return 'Assessment';
    case 'PRACTICE':
      return 'Practice';
    case 'OTHER':
      return 'Other';
    default:
      return type;
  }
}

function getStatusTone(status: SessionPlanStatus): 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'PLANNED':
      return 'info';
    case 'DRAFT':
      return 'info';
    case 'CANCELLED':
      return 'error';
    default:
      return 'info';
  }
}

function formatStatus(status: SessionPlanStatus): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'In Progress';
    default:
      return status.charAt(0) + status.slice(1).toLowerCase();
  }
}
