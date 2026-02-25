'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

import { OrganizationStep } from './steps/OrganizationStep';
import { AdminAccountStep } from './steps/AdminAccountStep';
import { PlanSelectionStep } from './steps/PlanSelectionStep';
import { ReviewStep } from './steps/ReviewStep';
import { ProvisioningStep } from './steps/ProvisioningStep';

// ============================================================================
// TYPES
// ============================================================================

export interface SignUpFormData {
  // Organization
  organizationName: string;
  organizationType: 'K12_DISTRICT' | 'CHARTER_NETWORK' | 'PRIVATE_SCHOOL' | 'HIGHER_ED' | 'OTHER';
  districtSize: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  stateCode: string;
  zipCode: string;

  // Admin
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminPhone: string;

  // Plan
  planId: string;
}

export interface ProvisioningStatus {
  id: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  progress: number;
  stepLog: Array<{
    step: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    error?: string;
  }>;
  tenantId?: string;
  failedStep?: string;
  failedReason?: string;
}

export interface SignUpStepProps {
  formData: SignUpFormData;
  onUpdate: (updates: Partial<SignUpFormData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

const STEPS = [
  { id: 'organization', label: 'Organization', icon: '🏫' },
  { id: 'admin', label: 'Admin Account', icon: '👤' },
  { id: 'plan', label: 'Select Plan', icon: '📋' },
  { id: 'review', label: 'Review', icon: '✅' },
  { id: 'provisioning', label: 'Setting Up', icon: '🚀' },
] as const;

const API_BASE = process.env.NEXT_PUBLIC_TENANT_API || '/api/tenant';

// ============================================================================
// SIGN-UP WIZARD
// ============================================================================

export function SignUpWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<SignUpFormData>({
    organizationName: '',
    organizationType: 'K12_DISTRICT',
    districtSize: 'SMALL',
    stateCode: '',
    zipCode: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '',
    planId: 'trial',
  });
  const [provisioningJobId, setProvisioningJobId] = useState<string | null>(null);
  const [provisioningStatus, setProvisioningStatus] = useState<ProvisioningStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleUpdate = useCallback((updates: Partial<SignUpFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // Start provisioning when we reach the provisioning step
  const startProvisioning = useCallback(async () => {
    if (provisioningJobId) return; // Already started
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/provisioning/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: formData.organizationName,
          adminEmail: formData.adminEmail,
          adminName: formData.adminName,
          organizationType: formData.organizationType,
          planId: formData.planId,
          districtSize: formData.districtSize,
          stateCode: formData.stateCode,
          zipCode: formData.zipCode,
          idempotencyKey: `signup-${formData.adminEmail}-${Date.now()}`,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Failed to start provisioning');
      }

      const result = (await res.json()) as { job: { id: string } };
      setProvisioningJobId(result.job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  }, [formData, provisioningJobId]);

  // Poll for provisioning status
  useEffect(() => {
    if (!provisioningJobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/provisioning/${provisioningJobId}`);
        if (res.ok) {
          const data = (await res.json()) as { job: ProvisioningStatus };
          setProvisioningStatus(data.job);

          if (data.job.status === 'COMPLETED' || data.job.status === 'FAILED') {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          }
        }
      } catch {
        // Polling failure is transient; keep trying
      }
    };

    void poll();
    pollRef.current = setInterval(() => void poll(), 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [provisioningJobId]);

  // Trigger provisioning when user reaches the final step
  const handleStartProvisioning = useCallback(() => {
    setCurrentStep(STEPS.length - 1);
    void startProvisioning();
  }, [startProvisioning]);

  const stepProps: SignUpStepProps = {
    formData,
    onUpdate: handleUpdate,
    onNext: handleNext,
    ...(currentStep > 0 && currentStep < STEPS.length - 1 ? { onBack: handleBack } : {}),
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Create Your District Account</h1>
        <p className="mt-2 text-gray-600">
          Get started with a 30-day free trial. No credit card required.
        </p>
      </div>

      {/* Progress Steps */}
      {currentStep < STEPS.length - 1 && (
        <nav className="mb-8">
          <ol className="flex items-center justify-center gap-1">
            {STEPS.slice(0, -1).map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <li key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      isCurrent
                        ? 'bg-blue-100 text-blue-700'
                        : isCompleted
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <span>{isCompleted ? '✓' : step.icon}</span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {index < STEPS.length - 2 && (
                    <div
                      className={`mx-1 h-0.5 w-8 ${
                        index < currentStep ? 'bg-green-300' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Something went wrong</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm font-medium text-red-800 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {currentStep === 0 && <OrganizationStep {...stepProps} />}
        {currentStep === 1 && <AdminAccountStep {...stepProps} />}
        {currentStep === 2 && <PlanSelectionStep {...stepProps} />}
        {currentStep === 3 && (
          <ReviewStep
            {...stepProps}
            onSubmit={handleStartProvisioning}
            submitting={submitting}
          />
        )}
        {currentStep === 4 && (
          <ProvisioningStep
            status={provisioningStatus}
            error={error}
            onRetry={() => {
              setProvisioningJobId(null);
              setProvisioningStatus(null);
              setError(null);
              void startProvisioning();
            }}
          />
        )}
      </div>

      {/* Login Link */}
      {currentStep < STEPS.length - 1 && (
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Sign in
          </a>
        </p>
      )}
    </div>
  );
}
