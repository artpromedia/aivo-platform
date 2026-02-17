'use client';

import { useState, useCallback, useEffect } from 'react';

import { DistrictInfoStep } from './steps/DistrictInfoStep';
import { MasterAgreementStep } from './steps/MasterAgreementStep';
import { SisIntegrationStep } from './steps/SisIntegrationStep';
import { SchoolConfigStep } from './steps/SchoolConfigStep';
import { ConsentFormsStep } from './steps/ConsentFormsStep';
import { VerificationStep } from './steps/VerificationStep';

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingStatus {
  tenantId: string;
  tenantName: string;
  overallProgress: number;
  isComplete: boolean;
  steps: Array<{
    id: string;
    label: string;
    completed: boolean;
    completedAt?: string;
    details?: Record<string, unknown>;
  }>;
}

export interface WizardStepProps {
  tenantId: string;
  onComplete: () => void;
  onBack?: (() => void) | undefined;
  status: OnboardingStatus | null;
}

const STEPS = [
  { id: 'district-info', label: 'District Information', icon: '🏫' },
  { id: 'agreement', label: 'Master Agreement', icon: '📋' },
  { id: 'sis-integration', label: 'SIS Integration', icon: '🔗' },
  { id: 'schools', label: 'School Configuration', icon: '🏫' },
  { id: 'consent-forms', label: 'Consent Forms', icon: '📄' },
  { id: 'verification', label: 'Verification & Launch', icon: '🚀' },
] as const;

const API_BASE = process.env.NEXT_PUBLIC_TENANT_API || '/api/tenant';

// ============================================================================
// WIZARD COMPONENT
// ============================================================================

interface OnboardingWizardProps {
  readonly tenantId: string;
}

export function OnboardingWizard({ tenantId }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/onboarding/tenants/${tenantId}/status`);
      if (res.ok) {
        const data = (await res.json()) as OnboardingStatus;
        setStatus(data);

        // Auto-advance to first incomplete step
        const firstIncomplete = data.steps.findIndex((s) => !s.completed);
        if (firstIncomplete >= 0) {
          setCurrentStep(firstIncomplete);
        } else {
          setCurrentStep(STEPS.length - 1);
        }
      }
    } catch {
      // Tenant may not exist yet — that's fine, start from step 0
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleStepComplete = useCallback(() => {
    void fetchStatus();
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, fetchStatus]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-gray-600">Loading onboarding status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        <h2 className="mb-2 text-lg font-semibold">Error</h2>
        <p>{error}</p>
        <button
          onClick={() => {
            setError(null);
            void fetchStatus();
          }}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const stepProps: WizardStepProps = {
    tenantId: status?.tenantId ?? tenantId,
    onComplete: handleStepComplete,
    ...(currentStep > 0 ? { onBack: handleBack } : {}),
    status,
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">District Onboarding</h1>
        <p className="mt-2 text-gray-600">
          Set up your district on the AIVO platform. Complete each step to get started.
        </p>
        {status && (
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 flex-1 rounded-full bg-gray-200">
              <div
                className="h-2.5 rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${status.overallProgress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-600">
              {status.overallProgress}% complete
            </span>
          </div>
        )}
      </div>

      {/* Step Navigation */}
      <nav className="mb-8">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((step, index) => {
            const isCompleted = status?.steps[index]?.completed ?? false;
            const isCurrent = index === currentStep;
            const isAccessible = index <= currentStep || isCompleted;

            return (
              <li key={step.id} className="flex-1">
                <button
                  onClick={() => isAccessible && setCurrentStep(index)}
                  disabled={!isAccessible}
                  className={`flex w-full flex-col items-center rounded-lg border-2 px-3 py-3 text-center transition-all ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : isCompleted
                        ? 'border-green-400 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-400'
                  } ${isAccessible ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed'}`}
                >
                  <span className="text-xl">{isCompleted ? '✅' : step.icon}</span>
                  <span className="mt-1 text-xs font-medium leading-tight">{step.label}</span>
                  <span className="mt-0.5 text-[10px]">
                    {isCompleted ? 'Done' : isCurrent ? `Step ${index + 1}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {currentStep === 0 && <DistrictInfoStep {...stepProps} />}
        {currentStep === 1 && <MasterAgreementStep {...stepProps} />}
        {currentStep === 2 && <SisIntegrationStep {...stepProps} />}
        {currentStep === 3 && <SchoolConfigStep {...stepProps} />}
        {currentStep === 4 && <ConsentFormsStep {...stepProps} />}
        {currentStep === 5 && <VerificationStep {...stepProps} />}
      </div>
    </div>
  );
}
