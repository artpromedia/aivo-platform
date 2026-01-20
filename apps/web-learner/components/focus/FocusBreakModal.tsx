'use client';

import { useCallback, useEffect, useState } from 'react';

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
// MESSAGING
// ══════════════════════════════════════════════════════════════════════════════

interface CompletionMessaging {
  title: string;
  ratingPrompt: string;
  doneButtonText: string;
  skipButtonText: string;
  completionMessage: string;
  earlyEndPrompt: string;
}

const COMPLETION_MESSAGING: Record<GradeBand, CompletionMessaging> = {
  K5: {
    title: 'Great Job!',
    ratingPrompt: 'Did the break help you?',
    doneButtonText: 'All Done!',
    skipButtonText: "I'm Ready to Go Back",
    completionMessage: "You did awesome! You're ready to learn more!",
    earlyEndPrompt: "That's okay! Ready to keep learning?",
  },
  G6_8: {
    title: 'Break Complete',
    ratingPrompt: 'How helpful was this break?',
    doneButtonText: 'Complete',
    skipButtonText: 'End Early',
    completionMessage: 'Nice work! You should feel more focused now.',
    earlyEndPrompt: 'Ready to continue?',
  },
  G9_12: {
    title: 'Break Finished',
    ratingPrompt: 'Rate this break:',
    doneButtonText: 'Done',
    skipButtonText: 'Skip',
    completionMessage: 'Break completed. Ready to continue.',
    earlyEndPrompt: 'Continue to learning?',
  },
};

// Activity step content based on type
const ACTIVITY_STEPS: Record<string, { title: string; steps: string[] }> = {
  breathing: {
    title: 'Breathing Exercise',
    steps: [
      'Find a comfortable position',
      'Breathe in slowly through your nose for 4 counts',
      'Hold your breath gently for 4 counts',
      'Exhale slowly through your mouth for 4 counts',
      'Repeat 3-4 times',
    ],
  },
  stretching: {
    title: 'Quick Stretch',
    steps: [
      'Stand up or sit up straight',
      'Reach your arms up high above your head',
      'Gently lean to each side',
      'Roll your shoulders forward and back',
      'Take a deep breath and relax',
    ],
  },
  movement: {
    title: 'Movement Break',
    steps: [
      'Stand up from your seat',
      'March in place for 10 steps',
      'Shake out your arms and legs',
      'Do 5 jumping jacks or arm circles',
      'Take a deep breath and return to your seat',
    ],
  },
  grounding: {
    title: 'Grounding Exercise',
    steps: [
      'Place your feet flat on the floor',
      'Notice 5 things you can see around you',
      'Notice 4 things you can hear',
      'Notice 3 things you can touch',
      'Take 2 deep breaths',
    ],
  },
  mindful_pause: {
    title: 'Mindful Pause',
    steps: [
      'Close your eyes or look at one spot',
      'Focus on your breathing',
      'Notice how your body feels',
      'Let any thoughts pass like clouds',
      'When ready, gently return your attention',
    ],
  },
  simple_game: {
    title: 'Brain Break Game',
    steps: [
      'Look around the room',
      'Find something blue',
      'Find something that starts with the letter A',
      'Think of 3 things you are grateful for',
      'Smile and take a deep breath',
    ],
  },
};

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
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [helpfulnessRating, setHelpfulnessRating] = useState<number | null>(null);

  const messaging = COMPLETION_MESSAGING[gradeBand];
  const activitySteps =
    ACTIVITY_STEPS[activity.activityType] || ACTIVITY_STEPS.breathing;
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
          aria-label={`Rate ${star} out of 5`}
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
      aria-label="Focus break activity"
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
                    ? 'Time complete! Finish when ready.'
                    : `of ${formatTime(estimatedDuration)}`}
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
                    Step {currentStep + 1} of {totalSteps}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={handlePrevStep}
                      disabled={currentStep === 0}
                      className="rounded p-1 hover:bg-slate-200 disabled:opacity-30"
                      aria-label="Previous step"
                    >
                      ◀
                    </button>
                    <button
                      onClick={handleNextStep}
                      disabled={currentStep === totalSteps - 1}
                      className="rounded p-1 hover:bg-slate-200 disabled:opacity-30"
                      aria-label="Next step"
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
                    aria-label={`Go to step ${index + 1}`}
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
