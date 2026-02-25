'use client';

import { useState, useCallback, useEffect } from 'react';

import { BrandingStep } from './steps/BrandingStep';
import { SsoSetupStep } from './steps/SsoSetupStep';
import { RosterImportStep } from './steps/RosterImportStep';
import { InviteAdminsStep } from './steps/InviteAdminsStep';
import { LaunchStep } from './steps/LaunchStep';

// ============================================================================
// TYPES
// ============================================================================

export interface SetupStatus {
  tenantId: string;
  tenantName: string;
  completedSteps: string[];
  isComplete: boolean;
}

export interface SetupStepProps {
  tenantId: string;
  accessToken: string | null;
  onComplete: () => void;
  onSkip?: () => void;
  onBack?: () => void;
  isCompleted: boolean;
}

const STEPS = [
  { id: 'branding', label: 'Branding & Logo', icon: '🎨', skippable: true },
  { id: 'sso', label: 'Single Sign-On', icon: '🔐', skippable: true },
  { id: 'roster', label: 'Import Roster', icon: '📋', skippable: true },
  { id: 'invite', label: 'Invite Admins', icon: '👥', skippable: true },
  { id: 'launch', label: 'Launch', icon: '🚀', skippable: false },
] as const;

const API_BASE = process.env.NEXT_PUBLIC_TENANT_API || '/api/tenant';

// ============================================================================
// POST SIGN-UP SETUP WIZARD
// ============================================================================

interface PostSignUpSetupProps {
  readonly tenantId: string;
  readonly accessToken: string | null;
}

export function PostSignUpSetup({ tenantId, accessToken }: PostSignUpSetupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load current setup status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/onboarding/tenants/${tenantId}/status`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (res.ok) {
        const data = (await res.json()) as SetupStatus;
        const completed = new Set(data.completedSteps ?? []);
        setCompletedSteps(completed);

        // Auto-advance to first incomplete setup step
        const firstIncomplete = STEPS.findIndex((s) => !completed.has(s.id));
        if (firstIncomplete >= 0) {
          setCurrentStep(firstIncomplete);
        }
      }
    } catch {
      // OK — status might not exist yet
    } finally {
      setLoading(false);
    }
  }, [tenantId, accessToken]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const markComplete = useCallback((stepId: string) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
  }, []);

  const handleStepComplete = useCallback(() => {
    const stepId = STEPS[currentStep].id;
    markComplete(stepId);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, markComplete]);

  const handleSkip = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-gray-600">Loading setup status...</p>
        </div>
      </div>
    );
  }

  const allDone = STEPS.every((s) => completedSteps.has(s.id));
  const progress = Math.round((completedSteps.size / STEPS.length) * 100);

  const stepProps: SetupStepProps = {
    tenantId,
    accessToken,
    onComplete: handleStepComplete,
    ...(STEPS[currentStep].skippable ? { onSkip: handleSkip } : {}),
    ...(currentStep > 0 ? { onBack: handleBack } : {}),
    isCompleted: completedSteps.has(STEPS[currentStep].id),
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Complete Your Setup</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure your district to get the most out of Aivo. Optional steps can be completed later.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600">{progress}%</span>
        </div>
      </div>

      {/* Step Navigation */}
      <nav className="mb-6">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = index === currentStep;
            const isAccessible = index <= currentStep || isCompleted;

            return (
              <li key={step.id} className="flex-1">
                <button
                  onClick={() => isAccessible && setCurrentStep(index)}
                  disabled={!isAccessible}
                  className={`flex w-full flex-col items-center rounded-lg border-2 px-2 py-2.5 text-center transition-all ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : isCompleted
                        ? 'border-green-400 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-400'
                  } ${isAccessible ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed'}`}
                >
                  <span className="text-lg">{isCompleted ? '✅' : step.icon}</span>
                  <span className="mt-0.5 text-[11px] font-medium leading-tight">{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {currentStep === 0 && <BrandingStep {...stepProps} />}
        {currentStep === 1 && <SsoSetupStep {...stepProps} />}
        {currentStep === 2 && <RosterImportStep {...stepProps} />}
        {currentStep === 3 && <InviteAdminsStep {...stepProps} />}
        {currentStep === 4 && <LaunchStep {...stepProps} allSetupComplete={allDone} />}
      </div>
    </div>
  );
}
