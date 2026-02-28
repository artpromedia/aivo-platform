'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { GradeBand, RegulationActivity } from '../../lib/focus/focus-api';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface FocusBreakModalProps {
  /** The break activity being performed */
  activity: RegulationActivity;
  /** Learner's grade band for age-appropriate messaging */
  gradeBand: GradeBand;
  /** When the break started */
  startTime: Date;
  /** Callback when break is completed */
  onComplete: (completedFully: boolean, helpfulnessRating?: number) => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGING (sourced from i18n learner namespace)
// ══════════════════════════════════════════════════════════════════════════════

interface CompletionMessaging {
  title: string;
  ratingPrompt: string;
  doneButtonText: string;
  skipButtonText: string;
  completionMessage: string;
  earlyEndPrompt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Modal for performing a focus break activity.
 * Guides the learner through the activity with a timer and step-by-step instructions.
 *
 * @example
 * ```tsx
 * <FocusBreakModal
 *   activity={currentActivity}
 *   gradeBand="G6_8"
 *   startTime={breakStartTime}
 *   onComplete={handleBreakComplete}
 * />
 * ```
 */
export function FocusBreakModal({
  activity,
  gradeBand,
  startTime,
  onComplete,
}: FocusBreakModalProps) {
  const { t } = useTranslation('learner');
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [helpfulnessRating, setHelpfulnessRating] = useState<number | null>(null);

  const messaging: CompletionMessaging = t(`focus.completion.${gradeBand}`, {
    returnObjects: true,
  }) as CompletionMessaging;
  const activityStepsData = t(
    `focus.activitySteps.${activity.activityType}`,
    { returnObjects: true, defaultValue: null },
  ) as { title: string; steps: string[] } | null;
  const fallbackSteps = t('focus.activitySteps.breathing', {
    returnObjects: true,
  }) as { title: string; steps: string[] };
  const activitySteps = activityStepsData ?? fallbackSteps;
  const steps = activity.instructions?.length ? activity.instructions : activitySteps.steps;
  const totalSteps = steps.length;
  const estimatedDuration = activity.estimatedDurationSeconds;

  // Calculate progress percentage
  const progress = Math.min((elapsedSeconds / estimatedDuration) * 100, 100);
  const isTimeComplete = elapsedSeconds >= estimatedDuration;

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Auto-advance steps based on time
  useEffect(() => {
    if (totalSteps > 0 && !isCompleted) {
      const stepDuration = estimatedDuration / totalSteps;
      const expectedStep = Math.min(
        Math.floor(elapsedSeconds / stepDuration),
        totalSteps - 1
      );
      if (expectedStep > currentStep) {
        setCurrentStep(expectedStep);
      }
    }
  }, [elapsedSeconds, estimatedDuration, totalSteps, currentStep, isCompleted]);

  // Format time display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle completion
  const handleComplete = (completedFully: boolean) => {
    if (!isCompleted) {
      setIsCompleted(true);
    }
    onComplete(completedFully, helpfulnessRating ?? undefined);
  };

  // Handle step navigation
  const handleNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Rating stars
  const RatingStars = () => (
    <div className="mt-4 flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => setHelpfulnessRating(star)}
          className={`text-3xl transition ${
            helpfulnessRating && helpfulnessRating >= star
              ? 'text-yellow-400 scale-110'
              : 'text-slate-300 hover:text-yellow-300'
          }`}
          aria-label={t('focus.rateStarAriaLabel', { star })}
        >
          ★
        </button>
      ))}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('focus.focusBreakAriaLabel')}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 text-white">
          <h2 className="text-xl font-bold">
            {isCompleted ? messaging.title : activity.title}
          </h2>
          {!isCompleted && (
            <p className="mt-1 text-sm text-white/80">{activity.description}</p>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {!isCompleted ? (
            <>
              {/* Timer */}
              <div className="mb-6 text-center">
                <div className="mb-2 text-4xl font-bold text-slate-900">
                  {formatTime(elapsedSeconds)}
                </div>
                <p className="text-sm text-slate-500">
                  {isTimeComplete
                    ? t('focus.timeComplete')
                    : t('focus.ofTime', { time: formatTime(estimatedDuration) })}
                </p>
                {/* Progress bar */}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Current step */}
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                  <span>
                    {t('focus.stepOf', { current: currentStep + 1, total: totalSteps })}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={handlePrevStep}
                      disabled={currentStep === 0}
                      className="rounded p-1 hover:bg-slate-200 disabled:opacity-30"
                      aria-label={t('focus.previousStep')}
                    >
                      ◀
                    </button>
                    <button
                      onClick={handleNextStep}
                      disabled={currentStep === totalSteps - 1}
                      className="rounded p-1 hover:bg-slate-200 disabled:opacity-30"
                      aria-label={t('focus.nextStep')}
                    >
                      ▶
                    </button>
                  </div>
                </div>
                <p className="text-lg font-medium text-slate-800">
                  {steps[currentStep]}
                </p>
              </div>

              {/* Step indicators */}
              <div className="mt-4 flex justify-center gap-1.5">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep
                        ? 'w-6 bg-blue-500'
                        : index < currentStep
                          ? 'w-2 bg-blue-300'
                          : 'w-2 bg-slate-300'
                    }`}
                    aria-label={t('focus.goToStep', { step: index + 1 })}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Completion state */}
              <div className="text-center">
                <div className="mb-4 text-6xl">🎉</div>
                <p className="text-lg text-slate-700">{messaging.completionMessage}</p>

                {/* Rating */}
                <div className="mt-6">
                  <p className="text-sm font-medium text-slate-600">
                    {messaging.ratingPrompt}
                  </p>
                  <RatingStars />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          {!isCompleted ? (
            <div className="flex gap-3">
              <button
                onClick={() => handleComplete(false)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {messaging.skipButtonText}
              </button>
              {(isTimeComplete || currentStep === totalSteps - 1) && (
                <button
                  onClick={() => setIsCompleted(true)}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:from-blue-600 hover:to-purple-600"
                >
                  {messaging.doneButtonText}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => handleComplete(true)}
              className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:from-green-600 hover:to-emerald-600"
            >
              {messaging.doneButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
