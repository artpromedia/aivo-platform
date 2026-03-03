/**
 * Teacher Onboarding Wizard
 *
 * Renders a step-by-step checklist sidebar on first login.
 * Tracks completion via the /api/teacher/onboarding BFF endpoint.
 */

'use client';

import {
  teacherFlow,
  getStepsWithStatus,
  getCompletionPercentage,
  isFlowComplete,
  type OnboardingProgress,
  type StepWithStatus,
} from '@aivo/onboarding-wizard';
import Link from 'next/link';
import * as React from 'react';

// ─── Icons (inline SVGs to avoid dependency) ────────────────────────────────

const icons: Record<string, React.ReactNode> = {
  sparkles: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  ),
  user: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
  users: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  'book-open': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  send: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
  ),
  check: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  ),
};

function StepIcon({ icon, status }: { icon?: string; status: StepWithStatus['status'] }) {
  if (status === 'completed') {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
        {icons.check}
      </div>
    );
  }
  if (status === 'skipped') {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l4-4 4 4M7 4v16M21 16l-4 4-4-4m4 4V4" />
        </svg>
      </div>
    );
  }
  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-full ${
        status === 'current'
          ? 'bg-primary-100 text-primary-600'
          : 'bg-gray-100 text-gray-400'
      }`}
    >
      {(icon && icons[icon]) ?? icons.sparkles}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface TeacherOnboardingWizardProps {
  onComplete?: () => void;
  onDismiss?: () => void;
}

export function TeacherOnboardingWizard({ onComplete, onDismiss }: TeacherOnboardingWizardProps) {
  const [progress, setProgress] = React.useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [dismissed, setDismissed] = React.useState(false);
  const [completing, setCompleting] = React.useState<string | null>(null);

  // Fetch onboarding progress on mount
  React.useEffect(() => {
    let cancelled = false;
    async function fetchProgress() {
      try {
        const res = await fetch('/api/teacher/onboarding');
        if (!res.ok) {
          // If 404, user has no progress yet — treat as fresh start
          setProgress({
            userId: '',
            tenantId: '',
            flowId: 'teacher',
            completedSteps: [],
            skippedSteps: [],
            currentStepId: teacherFlow.steps[0]?.id ?? null,
            startedAt: new Date().toISOString(),
            completedAt: null,
            dismissed: false,
          });
          return;
        }
        const data = (await res.json()) as OnboardingProgress;
        if (!cancelled) {
          setProgress(data);
          if (data.dismissed) {
            setDismissed(true);
          }
        }
      } catch {
        // On error, show wizard with empty progress
        if (!cancelled) {
          setProgress({
            userId: '',
            tenantId: '',
            flowId: 'teacher',
            completedSteps: [],
            skippedSteps: [],
            currentStepId: teacherFlow.steps[0]?.id ?? null,
            startedAt: new Date().toISOString(),
            completedAt: null,
            dismissed: false,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void fetchProgress();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleComplete = React.useCallback(
    async (stepId: string, completionKey: string) => {
      if (!progress) return;
      setCompleting(stepId);
      try {
        await fetch('/api/teacher/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completionKey, stepId }),
        });

        const updated: OnboardingProgress = {
          ...progress,
          completedSteps: [...progress.completedSteps, stepId],
          currentStepId:
            teacherFlow.steps.find(
              (s) => !progress.completedSteps.includes(s.id) && s.id !== stepId,
            )?.id ?? null,
        };
        setProgress(updated);

        if (isFlowComplete(teacherFlow, updated)) {
          onComplete?.();
        }
      } finally {
        setCompleting(null);
      }
    },
    [progress, onComplete],
  );

  const handleSkip = React.useCallback(
    async (stepId: string) => {
      if (!progress) return;
      try {
        await fetch('/api/teacher/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepId, skipped: true }),
        });

        const updated: OnboardingProgress = {
          ...progress,
          skippedSteps: [...progress.skippedSteps, stepId],
          currentStepId:
            teacherFlow.steps.find(
              (s) =>
                !progress.completedSteps.includes(s.id) &&
                !progress.skippedSteps.includes(s.id) &&
                s.id !== stepId,
            )?.id ?? null,
        };
        setProgress(updated);
      } catch {
        // Silently fail UI update
      }
    },
    [progress],
  );

  const handleDismiss = React.useCallback(async () => {
    setDismissed(true);
    try {
      await fetch('/api/teacher/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed: true }),
      });
    } catch {
      // Silently fail
    }
    onDismiss?.();
  }, [onDismiss]);

  const handleReopen = React.useCallback(() => {
    setDismissed(false);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) return null;
  if (!progress) return null;
  if (isFlowComplete(teacherFlow, progress)) return null;

  const steps = getStepsWithStatus(teacherFlow, progress);
  const pct = getCompletionPercentage(teacherFlow, progress);

  // Collapsed pill when dismissed
  if (dismissed) {
    return (
      <button
        onClick={handleReopen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl"
      >
        {icons.sparkles}
        <span>Resume Setup ({pct}%)</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icons.sparkles}
            <h3 className="text-base font-semibold">{teacherFlow.title}</h3>
          </div>
          <button
            onClick={() => {
              void handleDismiss();
            }}
            className="rounded-lg p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
            aria-label="Dismiss onboarding wizard"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mt-1 text-sm text-white/80">{teacherFlow.description}</p>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-1.5 rounded-full bg-white transition-all duration-500"
              style={{ width: `${String(pct)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-white/90">{pct}%</span>
        </div>
      </div>

      {/* Steps list */}
      <div className="max-h-80 overflow-y-auto px-4 py-3">
        <ul className="space-y-1">
          {steps.map((step) => (
            <li key={step.id}>
              <div
                className={`flex items-start gap-3 rounded-xl p-3 transition ${
                  step.status === 'current'
                    ? 'bg-primary-50'
                    : step.status === 'completed'
                      ? 'bg-green-50/50'
                      : ''
                }`}
              >
                <StepIcon icon={step.icon} status={step.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm font-medium ${
                        step.status === 'completed'
                          ? 'text-green-700 line-through'
                          : step.status === 'current'
                            ? 'text-gray-900'
                            : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </p>
                    {step.estimatedTime && step.status !== 'completed' && (
                      <span className="shrink-0 text-xs text-gray-400">{step.estimatedTime}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{step.description}</p>
                  {step.helpText && step.status === 'current' && (
                    <p className="mt-1 text-xs italic text-primary-600">{step.helpText}</p>
                  )}

                  {/* Action buttons for current/upcoming steps */}
                  {step.status === 'current' && (
                    <div className="mt-2 flex items-center gap-2">
                      {step.targetRoute ? (
                        <Link
                          href={step.targetRoute}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700"
                        >
                          Get Started →
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            void handleComplete(step.id, step.completionKey);
                          }}
                          disabled={completing === step.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
                        >
                          {completing === step.id ? 'Saving...' : "Mark Complete"}
                        </button>
                      )}
                      {step.skippable && (
                        <button
                          onClick={() => {
                            void handleSkip(step.id);
                          }}
                          className="text-xs text-gray-400 transition hover:text-gray-600"
                        >
                          Skip for now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="border-t px-5 py-3">
        <button
          onClick={() => {
            void handleDismiss();
          }}
          className="text-xs text-gray-400 transition hover:text-gray-600"
        >
          Complete Later
        </button>
      </div>
    </div>
  );
}

export default TeacherOnboardingWizard;
