'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { OnboardingFlow, OnboardingProgress, StepWithStatus } from './types.js';
import { getCompletionPercentage, getNextIncompleteStep, getStepsWithStatus, isFlowComplete } from './types.js';

// ─── Context ──────────────────────────────────────────────────────────────────

interface OnboardingContextValue {
  flow: OnboardingFlow | null;
  progress: OnboardingProgress | null;
  steps: StepWithStatus[];
  percentage: number;
  isComplete: boolean;
  isDismissed: boolean;
  loading: boolean;
  completeStep: (stepId: string) => Promise<void>;
  skipStep: (stepId: string) => Promise<void>;
  dismiss: () => Promise<void>;
  reset: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  flow: null,
  progress: null,
  steps: [],
  percentage: 0,
  isComplete: false,
  isDismissed: false,
  loading: true,
  completeStep: async () => { /* noop */ },
  skipStep: async () => { /* noop */ },
  dismiss: async () => { /* noop */ },
  reset: async () => { /* noop */ },
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface OnboardingProviderProps {
  flow: OnboardingFlow;
  apiBase?: string;
  children: React.ReactNode;
}

export function OnboardingProvider({
  flow,
  apiBase = '/api/onboarding',
  children,
}: OnboardingProviderProps) {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch progress on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}/progress/${flow.id}`, { credentials: 'include' });
        if (res.ok) {
          setProgress(await res.json());
        } else if (res.status === 404) {
          // No progress yet — initialize locally
          setProgress({
            userId: '',
            tenantId: '',
            flowId: flow.id,
            completedSteps: [],
            skippedSteps: [],
            currentStepId: flow.steps[0]?.id ?? null,
            startedAt: new Date().toISOString(),
            completedAt: null,
            dismissed: false,
          });
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBase, flow.id, flow.steps]);

  const completeStep = useCallback(
    async (stepId: string) => {
      try {
        await fetch(`${apiBase}/progress/${flow.id}/complete`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepId }),
        });
      } catch {
        // Continue optimistically
      }

      setProgress((prev) => {
        if (!prev) return prev;
        const completedSteps = prev.completedSteps.includes(stepId)
          ? prev.completedSteps
          : [...prev.completedSteps, stepId];
        const nextStep = getNextIncompleteStep(flow, {
          completedSteps,
          skippedSteps: prev.skippedSteps,
        });
        return {
          ...prev,
          completedSteps,
          currentStepId: nextStep?.id ?? null,
          completedAt: isFlowComplete(flow, { completedSteps })
            ? new Date().toISOString()
            : null,
        };
      });
    },
    [apiBase, flow],
  );

  const skipStep = useCallback(
    async (stepId: string) => {
      try {
        await fetch(`${apiBase}/progress/${flow.id}/skip`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepId }),
        });
      } catch {
        // Continue optimistically
      }

      setProgress((prev) => {
        if (!prev) return prev;
        const skippedSteps = prev.skippedSteps.includes(stepId)
          ? prev.skippedSteps
          : [...prev.skippedSteps, stepId];
        const nextStep = getNextIncompleteStep(flow, {
          completedSteps: prev.completedSteps,
          skippedSteps,
        });
        return { ...prev, skippedSteps, currentStepId: nextStep?.id ?? null };
      });
    },
    [apiBase, flow],
  );

  const dismiss = useCallback(async () => {
    try {
      await fetch(`${apiBase}/progress/${flow.id}/dismiss`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Continue optimistically
    }
    setProgress((prev) => (prev ? { ...prev, dismissed: true } : prev));
  }, [apiBase, flow.id]);

  const reset = useCallback(async () => {
    try {
      await fetch(`${apiBase}/progress/${flow.id}/reset`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Continue optimistically
    }
    setProgress((prev) =>
      prev
        ? {
            ...prev,
            completedSteps: [],
            skippedSteps: [],
            currentStepId: flow.steps[0]?.id ?? null,
            completedAt: null,
            dismissed: false,
          }
        : prev,
    );
  }, [apiBase, flow]);

  const steps = useMemo(() => {
    if (!progress) return [];
    return getStepsWithStatus(flow, progress);
  }, [flow, progress]);

  const percentage = useMemo(() => {
    if (!progress) return 0;
    return getCompletionPercentage(flow, progress);
  }, [flow, progress]);

  const complete = useMemo(() => {
    if (!progress) return false;
    return isFlowComplete(flow, progress);
  }, [flow, progress]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      flow,
      progress,
      steps,
      percentage,
      isComplete: complete,
      isDismissed: progress?.dismissed ?? false,
      loading,
      completeStep,
      skipStep,
      dismiss,
      reset,
    }),
    [flow, progress, steps, percentage, complete, loading, completeStep, skipStep, dismiss, reset],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

// ─── Inline Styles ────────────────────────────────────────────────────────────

const wizardStyles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  } as React.CSSProperties,

  header: {
    padding: '20px 24px 16px',
  } as React.CSSProperties,

  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 4px',
  } as React.CSSProperties,

  description: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 16px',
  } as React.CSSProperties,

  progressBar: {
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
  } as React.CSSProperties,

  progressFill: (pct: number) =>
    ({
      height: '100%',
      width: `${pct}%`,
      backgroundColor: '#3b82f6',
      borderRadius: '3px',
      transition: 'width 0.3s ease',
    }) as React.CSSProperties,

  progressText: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '6px',
    textAlign: 'right' as const,
  } as React.CSSProperties,

  stepList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  } as React.CSSProperties,

  stepItem: (status: string) =>
    ({
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      padding: '14px 24px',
      borderTop: '1px solid #f3f4f6',
      backgroundColor: status === 'current' ? '#f0f9ff' : 'transparent',
      transition: 'background-color 0.15s ease',
    }) as React.CSSProperties,

  stepIndicator: (status: string) => {
    const base: React.CSSProperties = {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '13px',
      fontWeight: 600,
      flexShrink: 0,
      marginTop: '2px',
    };
    if (status === 'completed') {
      return { ...base, backgroundColor: '#10b981', color: '#ffffff' };
    }
    if (status === 'current') {
      return { ...base, backgroundColor: '#3b82f6', color: '#ffffff' };
    }
    if (status === 'skipped') {
      return { ...base, backgroundColor: '#f3f4f6', color: '#9ca3af' };
    }
    return { ...base, backgroundColor: '#f3f4f6', color: '#9ca3af' };
  },

  stepContent: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,

  stepTitle: (status: string) =>
    ({
      fontSize: '14px',
      fontWeight: 600,
      color: status === 'completed' ? '#6b7280' : '#111827',
      textDecoration: status === 'skipped' ? 'line-through' : 'none',
      margin: '0 0 2px',
    }) as React.CSSProperties,

  stepDescription: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 6px',
    lineHeight: '1.4',
  } as React.CSSProperties,

  stepActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  } as React.CSSProperties,

  primaryButton: {
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as React.CSSProperties,

  skipButton: {
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as React.CSSProperties,

  estimatedTime: {
    fontSize: '11px',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,

  helpText: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic',
    margin: '4px 0 0',
  } as React.CSSProperties,

  footer: {
    padding: '12px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
  } as React.CSSProperties,

  dismissButton: {
    fontSize: '13px',
    color: '#9ca3af',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
  } as React.CSSProperties,

  completionBanner: {
    padding: '32px 24px',
    textAlign: 'center' as const,
    backgroundColor: '#f0fdf4',
  } as React.CSSProperties,

  completionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#166534',
    margin: '0 0 8px',
  } as React.CSSProperties,

  completionMessage: {
    fontSize: '14px',
    color: '#4ade80',
    margin: 0,
  } as React.CSSProperties,
};

// ─── Checkmark Icon ───────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── OnboardingWizard Component ───────────────────────────────────────────────

export interface OnboardingWizardProps {
  /** Called when user clicks a step's action button */
  onStepAction?: (stepId: string, targetRoute?: string) => void;
  /** Custom class name for the container */
  className?: string;
  /** Custom style for the container */
  style?: React.CSSProperties;
}

export function OnboardingWizard({
  onStepAction,
  className,
  style,
}: OnboardingWizardProps) {
  const { flow, steps, percentage, isComplete, isDismissed, loading, completeStep, skipStep, dismiss } =
    useOnboarding();

  if (loading || !flow || isDismissed) return null;

  if (isComplete) {
    return (
      <div style={{ ...wizardStyles.container, ...style }} className={className}>
        <div style={wizardStyles.completionBanner}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
          <h3 style={wizardStyles.completionTitle}>All Done!</h3>
          <p style={wizardStyles.completionMessage}>{flow.completionMessage}</p>
        </div>
        <div style={wizardStyles.footer}>
          <button type="button" style={wizardStyles.dismissButton} onClick={dismiss}>
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...wizardStyles.container, ...style }} className={className}>
      {/* Header */}
      <div style={wizardStyles.header}>
        <h3 style={wizardStyles.title}>{flow.title}</h3>
        <p style={wizardStyles.description}>{flow.description}</p>
        <div style={wizardStyles.progressBar}>
          <div style={wizardStyles.progressFill(percentage)} />
        </div>
        <div style={wizardStyles.progressText}>{percentage}% complete</div>
      </div>

      {/* Steps */}
      <ul style={wizardStyles.stepList}>
        {steps.map((step) => (
          <li key={step.id} style={wizardStyles.stepItem(step.status)}>
            {/* Step indicator */}
            <div style={wizardStyles.stepIndicator(step.status)}>
              {step.status === 'completed' ? (
                <CheckIcon />
              ) : step.status === 'skipped' ? (
                '—'
              ) : (
                step.stepNumber
              )}
            </div>

            {/* Step content */}
            <div style={wizardStyles.stepContent}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={wizardStyles.stepTitle(step.status)}>{step.title}</h4>
                {step.estimatedTime && step.status !== 'completed' && step.status !== 'skipped' && (
                  <span style={wizardStyles.estimatedTime}>⏱ {step.estimatedTime}</span>
                )}
              </div>

              {step.status === 'current' && (
                <>
                  <p style={wizardStyles.stepDescription}>{step.description}</p>
                  {step.helpText && <p style={wizardStyles.helpText}>{step.helpText}</p>}
                  <div style={wizardStyles.stepActions}>
                    <button
                      type="button"
                      style={wizardStyles.primaryButton}
                      onClick={() => {
                        if (step.targetRoute && onStepAction) {
                          onStepAction(step.id, step.targetRoute);
                        } else {
                          void completeStep(step.id);
                        }
                      }}
                    >
                      {step.targetRoute ? 'Get Started' : 'Mark Complete'}
                    </button>
                    {step.skippable && (
                      <button
                        type="button"
                        style={wizardStyles.skipButton}
                        onClick={() => void skipStep(step.id)}
                      >
                        Skip for now
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div style={wizardStyles.footer}>
        <button type="button" style={wizardStyles.dismissButton} onClick={dismiss}>
          I&apos;ll finish later
        </button>
      </div>
    </div>
  );
}

// ─── Compact Onboarding Banner ────────────────────────────────────────────────

const bannerStyles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 20px',
    backgroundColor: '#eff6ff',
    borderRadius: '10px',
    border: '1px solid #bfdbfe',
  } as React.CSSProperties,

  text: {
    flex: 1,
    fontSize: '14px',
    color: '#1d4ed8',
    fontWeight: 500,
  } as React.CSSProperties,

  progressBadge: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
    padding: '4px 10px',
    borderRadius: '12px',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  resumeButton: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#93c5fd',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,
};

export interface OnboardingBannerProps {
  onResume?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function OnboardingBanner({ onResume, style, className }: OnboardingBannerProps) {
  const { flow, percentage, isComplete, isDismissed, loading, dismiss } = useOnboarding();

  if (loading || !flow || isDismissed || isComplete) return null;

  return (
    <div style={{ ...bannerStyles.container, ...style }} className={className}>
      <div style={bannerStyles.text}>
        Continue setting up: <strong>{flow.title}</strong>
      </div>
      <span style={bannerStyles.progressBadge}>{percentage}%</span>
      <button type="button" style={bannerStyles.resumeButton} onClick={onResume}>
        Resume
      </button>
      <button
        type="button"
        style={bannerStyles.closeButton}
        onClick={dismiss}
        aria-label="Dismiss onboarding"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
