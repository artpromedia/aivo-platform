/**
 * Baseline Assessment with IEP Upload Component
 *
 * Combines the baseline assessment flow with optional IEP upload functionality.
 * This component manages the full flow:
 * 1. (Optional) Upload existing IEP
 * 2. Complete baseline assessment
 * 3. Compare IEP with assessment results
 * 4. Parent makes decision
 * 5. System generates learning brain
 */

'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  Circle,
  FileText,
  Brain,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { IepUploadCard } from './IepUploadCard';
import { IepComparisonResults } from './IepComparisonResults';
import {
  useIepStatus,
  useIepComparison,
  useTriggerComparison,
} from '@/lib/hooks/useIepUpload';
import type { IepOverallStatus } from '@/lib/types/iep-upload';

interface BaselineWithIepUploadProps {
  profileId: string;
  learnerId: string;
  childName: string;
  baselineStatus: string;
  hasCompletedAssessment: boolean;
  onAssessmentStart?: () => void;
  onComplete?: () => void;
}

export function BaselineWithIepUpload({
  profileId,
  learnerId,
  childName,
  baselineStatus,
  hasCompletedAssessment,
  onAssessmentStart,
  onComplete,
}: BaselineWithIepUploadProps) {
  const [activeStep, setActiveStep] = useState<number>(1);

  // Fetch IEP status
  const { data: iepStatus, isLoading: statusLoading, refetch: refetchStatus } = useIepStatus(profileId);
  const triggerComparison = useTriggerComparison();

  // Fetch comparison results if available
  const comparisonId = iepStatus?.comparison?.comparisonId;
  const { data: comparisonDetails } = useIepComparison(comparisonId);

  // Determine current step based on status
  useEffect(() => {
    if (!iepStatus) return;

    if (iepStatus.overallStatus === 'DECISION_MADE') {
      setActiveStep(4);
    } else if (
      iepStatus.overallStatus === 'AWAITING_DECISION' ||
      iepStatus.overallStatus === 'READY_FOR_COMPARISON'
    ) {
      setActiveStep(3);
    } else if (hasCompletedAssessment) {
      setActiveStep(3);
    } else if (
      iepStatus.iepUpload ||
      iepStatus.overallStatus === 'AWAITING_ASSESSMENT'
    ) {
      setActiveStep(2);
    } else {
      setActiveStep(1);
    }
  }, [iepStatus, hasCompletedAssessment, comparisonDetails]);

  const handleCompare = async () => {
    try {
      await triggerComparison.mutateAsync({ profileId });
      refetchStatus();
    } catch (error) {
      console.error('Failed to trigger comparison:', error);
    }
  };

  const steps = [
    {
      number: 1,
      title: 'Upload IEP (Optional)',
      description: 'Upload existing IEP for comparison',
    },
    {
      number: 2,
      title: 'Baseline Assessment',
      description: `${childName} completes the assessment`,
    },
    {
      number: 3,
      title: 'Review & Compare',
      description: 'Compare IEP with assessment results',
    },
    {
      number: 4,
      title: 'Learning Brain',
      description: 'Create personalized learning plan',
    },
  ];

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-bold text-gray-900">
          {childName}'s Learning Journey Setup
        </h2>

        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    activeStep > step.number
                      ? 'bg-green-100'
                      : activeStep === step.number
                      ? 'bg-violet-100'
                      : 'bg-gray-100'
                  }`}
                >
                  {activeStep > step.number ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : activeStep === step.number ? (
                    <StepIcon step={step.number} />
                  ) : (
                    <Circle className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={`text-xs font-medium ${
                      activeStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="mt-0.5 hidden text-xs text-gray-500 sm:block">
                    {step.description}
                  </p>
                </div>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`mx-2 h-0.5 w-12 sm:w-24 ${
                    activeStep > step.number ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {activeStep === 1 && (
        <div className="space-y-4">
          <IepUploadCard
            profileId={profileId}
            existingDocument={
              iepStatus?.iepUpload
                ? {
                    id: iepStatus.iepUpload.documentId,
                    filename: iepStatus.iepUpload.filename,
                    status: iepStatus.iepUpload.status,
                    processingError: iepStatus.iepUpload.processingError,
                    uploadedAt: iepStatus.iepUpload.uploadedAt,
                  }
                : null
            }
            hasCompletedAssessment={hasCompletedAssessment}
            onUploadComplete={() => {
              refetchStatus();
              setActiveStep(2);
            }}
            onDocumentDeleted={() => refetchStatus()}
          />

          {/* Skip IEP Upload */}
          {!iepStatus?.iepUpload && (
            <div className="text-center">
              <button
                onClick={() => setActiveStep(2)}
                className="text-sm text-gray-500 underline hover:text-gray-700"
              >
                Skip this step and continue without an existing IEP
              </button>
            </div>
          )}

          {/* Continue to Assessment */}
          {iepStatus?.iepUpload &&
            ['PROCESSED', 'COMPARISON_READY'].includes(iepStatus.iepUpload.status) && (
              <button
                onClick={() => setActiveStep(2)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-700"
              >
                Continue to Assessment
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
        </div>
      )}

      {activeStep === 2 && (
        <div className="space-y-4">
          {/* Show IEP status if uploaded */}
          {iepStatus?.iepUpload && (
            <IepUploadCard
              profileId={profileId}
              existingDocument={{
                id: iepStatus.iepUpload.documentId,
                filename: iepStatus.iepUpload.filename,
                status: iepStatus.iepUpload.status,
                processingError: iepStatus.iepUpload.processingError,
                uploadedAt: iepStatus.iepUpload.uploadedAt,
              }}
              hasCompletedAssessment={hasCompletedAssessment}
            />
          )}

          {/* Assessment Status */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100">
                <Brain className="h-6 w-6 text-violet-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Baseline Assessment</h3>
                {hasCompletedAssessment ? (
                  <>
                    <p className="mt-1 text-sm text-green-600">
                      Assessment completed successfully!
                    </p>
                    <button
                      onClick={() => setActiveStep(3)}
                      className="mt-4 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
                    >
                      Continue to Review
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-gray-600">
                      {childName} needs to complete a fun, adaptive assessment to understand
                      their learning level across different subjects.
                    </p>
                    <button
                      onClick={onAssessmentStart}
                      className="mt-4 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
                    >
                      Start Assessment
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStep === 3 && (
        <div className="space-y-4">
          {/* Comparison Results or Trigger Comparison */}
          {comparisonDetails ? (
            <IepComparisonResults
              comparison={comparisonDetails}
              profileId={profileId}
              childName={childName}
              onDecisionMade={() => {
                refetchStatus();
                setActiveStep(4);
              }}
            />
          ) : iepStatus?.iepUpload &&
            iepStatus.iepUpload.status === 'PROCESSED' &&
            hasCompletedAssessment ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Ready to Compare</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Both the IEP and assessment are ready. Click below to compare them
                    and see how they align.
                  </p>
                  <button
                    onClick={handleCompare}
                    disabled={triggerComparison.isPending}
                    className="mt-4 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
                  >
                    {triggerComparison.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Comparing...
                      </>
                    ) : (
                      <>
                        Compare IEP with Assessment
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : hasCompletedAssessment && !iepStatus?.iepUpload ? (
            // No IEP uploaded, proceed directly
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Assessment Complete!</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    No existing IEP was uploaded. The system will create a personalized
                    learning plan based on the assessment results.
                  </p>
                  <button
                    onClick={() => {
                      setActiveStep(4);
                      onComplete?.();
                    }}
                    className="mt-4 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
                  >
                    Create Learning Brain
                    <Sparkles className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                <p className="text-sm text-amber-700">
                  Please complete the baseline assessment before proceeding to the review step.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeStep === 4 && (
        <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Sparkles className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {childName}'s Learning Brain is Ready!
          </h2>
          <p className="mt-2 text-gray-600">
            A personalized learning plan has been created based on the assessment
            {iepStatus?.comparison ? ' and IEP comparison' : ''}.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {childName} can now start their personalized learning journey!
          </p>
          <button
            onClick={onComplete}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700"
          >
            Go to Dashboard
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function StepIcon({ step }: { step: number }) {
  switch (step) {
    case 1:
      return <FileText className="h-5 w-5 text-violet-600" />;
    case 2:
      return <Brain className="h-5 w-5 text-violet-600" />;
    case 3:
      return <CheckCircle className="h-5 w-5 text-violet-600" />;
    case 4:
      return <Sparkles className="h-5 w-5 text-violet-600" />;
    default:
      return <Circle className="h-5 w-5 text-violet-600" />;
  }
}
