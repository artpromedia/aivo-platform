'use client';

import { useState } from 'react';

interface HomeworkStepsProps {
  learnerId: string;
  sessionId: string;
  onComplete: () => void;
}

interface Step {
  id: string;
  stepNumber: number;
  prompt: string;
  hint: string;
  isCompleted: boolean;
  learnerResponse?: string;
  feedback?: string;
  isCorrect?: boolean;
}

// Mock data for demonstration
const MOCK_STEPS: Step[] = [
  {
    id: '1',
    stepNumber: 1,
    prompt: 'First, let\'s understand the problem. What information are we given?',
    hint: 'Look for the numbers and what they represent.',
    isCompleted: false,
  },
  {
    id: '2',
    stepNumber: 2,
    prompt: 'What operation do we need to use to solve this?',
    hint: 'Think about whether we\'re combining things or taking them away.',
    isCompleted: false,
  },
  {
    id: '3',
    stepNumber: 3,
    prompt: 'Now, write out the equation or expression.',
    hint: 'Use the numbers from step 1 and the operation from step 2.',
    isCompleted: false,
  },
  {
    id: '4',
    stepNumber: 4,
    prompt: 'Solve the equation. What is the answer?',
    hint: 'Take your time and double-check your arithmetic.',
    isCompleted: false,
  },
  {
    id: '5',
    stepNumber: 5,
    prompt: 'Write your final answer in a complete sentence.',
    hint: 'Make sure to include the units if applicable.',
    isCompleted: false,
  },
];

export function HomeworkSteps({ learnerId: _learnerId, sessionId: _sessionId, onComplete }: Readonly<HomeworkStepsProps>) {
  const [steps, setSteps] = useState<Step[]>(MOCK_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = steps[currentStepIndex];
  const progress = (steps.filter((s) => s.isCompleted).length / steps.length) * 100;

  const handleSubmitStep = async () => {
    if (!response.trim()) return;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Update step with response
    const updatedSteps = steps.map((step, index) =>
      index === currentStepIndex
        ? {
            ...step,
            isCompleted: true,
            learnerResponse: response,
            feedback: 'Great job! That\'s correct. Let\'s move to the next step.',
            isCorrect: true,
          }
        : step
    );
    
    setSteps(updatedSteps);
    setResponse('');
    setShowHint(false);
    setIsSubmitting(false);

    // Move to next step or complete
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  const allCompleted = steps.every((s) => s.isCompleted);

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <span className="text-sm font-medium text-blue-600">{Math.round(progress)}% Complete</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          let bgClass: string;
          if (step.isCompleted) {
            bgClass = 'bg-green-500 text-white';
          } else if (index === currentStepIndex) {
            bgClass = 'bg-blue-500 text-white';
          } else {
            bgClass = 'bg-slate-200 text-slate-500';
          }
          return (
            <div
              key={step.id}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${bgClass}`}
            >
              {step.isCompleted ? '✓' : step.stepNumber}
            </div>
          );
        })}
      </div>

      {/* Current Step */}
      {!allCompleted && (
        <div className="space-y-4">
          <div className="rounded-xl bg-blue-50 p-6">
            <h3 className="text-lg font-semibold text-blue-900">
              Step {currentStep.stepNumber}: {currentStep.prompt}
            </h3>
          </div>

          {/* Response Input */}
          <textarea
            value={response}
            onChange={(e) => { setResponse(e.target.value); }}
            placeholder="Type your answer here..."
            className="h-32 w-full resize-none rounded-xl border border-slate-300 p-4 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />

          {/* Hint Section */}
          {showHint ? (
            <div className="rounded-xl bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <div className="font-medium text-amber-900">Hint</div>
                  <div className="mt-1 text-amber-800">{currentStep.hint}</div>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setShowHint(true); }}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Need a hint? 💡
            </button>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSubmitStep}
              disabled={!response.trim() || isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Checking...</span>
                </>
              ) : (
                <span>Submit Answer →</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Completed Steps Review */}
      {steps.some((s) => s.isCompleted) && (
        <div className="space-y-3">
          <h4 className="font-medium text-slate-700">Your Progress</h4>
          {steps
            .filter((s) => s.isCompleted)
            .map((step) => (
              <div
                key={step.id}
                className="rounded-xl border border-green-200 bg-green-50 p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-xs text-white">
                    ✓
                  </span>
                  <div>
                    <div className="text-sm font-medium text-green-900">
                      Step {step.stepNumber}
                    </div>
                    <div className="mt-1 text-sm text-green-800">
                      Your answer: {step.learnerResponse}
                    </div>
                    {step.feedback && (
                      <div className="mt-2 text-sm text-green-700 italic">
                        {step.feedback}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Completion Section */}
      {allCompleted && (
        <div className="space-y-4 text-center">
          <div className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 p-8 text-white">
            <span className="text-6xl">🎉</span>
            <h3 className="mt-4 text-2xl font-bold">Great job!</h3>
            <p className="mt-2 text-green-100">
              You&apos;ve completed all the steps. Your problem-solving skills are improving!
            </p>
          </div>
          <button
            onClick={handleComplete}
            className="w-full rounded-xl bg-blue-600 py-4 font-semibold text-white hover:bg-blue-700"
          >
            Finish Session
          </button>
        </div>
      )}
    </div>
  );
}
