// ─── Onboarding Wizard Types ──────────────────────────────────────────────────

export type OnboardingRole = 'district_admin' | 'teacher' | 'parent';

export interface OnboardingStep {
  /** Unique step identifier within the flow */
  id: string;
  /** Display title */
  title: string;
  /** Short description for the step */
  description: string;
  /** Icon name hint (consumer maps to actual icon) */
  icon?: string;
  /** The route/page this step directs the user to */
  targetRoute?: string;
  /** Whether this step can be skipped */
  skippable?: boolean;
  /** Key used to check completion status */
  completionKey: string;
  /** Optional help text shown below the step content */
  helpText?: string;
  /** Estimated time to complete (e.g., '2 min') */
  estimatedTime?: string;
}

export interface OnboardingFlow {
  /** Unique flow identifier (matches role) */
  id: string;
  /** Flow display name */
  title: string;
  /** Flow description */
  description: string;
  /** Target role for this flow */
  role: OnboardingRole;
  /** Ordered list of steps */
  steps: OnboardingStep[];
  /** Route to redirect to after all steps complete */
  completionRoute: string;
  /** Congratulations message */
  completionMessage: string;
}

export interface OnboardingProgress {
  userId: string;
  tenantId: string;
  flowId: string;
  completedSteps: string[];
  skippedSteps: string[];
  currentStepId: string | null;
  startedAt: string;
  completedAt: string | null;
  dismissed: boolean;
}

export type StepStatus = 'completed' | 'current' | 'skipped' | 'upcoming';

export interface StepWithStatus extends OnboardingStep {
  status: StepStatus;
  stepNumber: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getStepsWithStatus(
  flow: OnboardingFlow,
  progress: Pick<OnboardingProgress, 'completedSteps' | 'skippedSteps' | 'currentStepId'>,
): StepWithStatus[] {
  return flow.steps.map((step, index) => {
    let status: StepStatus = 'upcoming';
    if (progress.completedSteps.includes(step.id)) {
      status = 'completed';
    } else if (progress.skippedSteps.includes(step.id)) {
      status = 'skipped';
    } else if (step.id === progress.currentStepId) {
      status = 'current';
    }
    return { ...step, status, stepNumber: index + 1 };
  });
}

export function getCompletionPercentage(
  flow: OnboardingFlow,
  progress: Pick<OnboardingProgress, 'completedSteps'>,
): number {
  if (flow.steps.length === 0) return 100;
  return Math.round((progress.completedSteps.length / flow.steps.length) * 100);
}

export function getNextIncompleteStep(
  flow: OnboardingFlow,
  progress: Pick<OnboardingProgress, 'completedSteps' | 'skippedSteps'>,
): OnboardingStep | null {
  const done = new Set([...progress.completedSteps, ...progress.skippedSteps]);
  return flow.steps.find((s) => !done.has(s.id)) ?? null;
}

export function isFlowComplete(
  flow: OnboardingFlow,
  progress: Pick<OnboardingProgress, 'completedSteps'>,
): boolean {
  return flow.steps.every((s) => progress.completedSteps.includes(s.id));
}
