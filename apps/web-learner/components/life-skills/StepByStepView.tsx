'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AICoachPanel } from './AICoachPanel';
import {
  SkillGuide,
  PromptLevel,
  PROMPT_LEVEL_INFO,
  AIGuidance,
  LearnerSkillProgress,
} from './types';

interface StepByStepViewProps {
  tenantId: string;
  learnerId: string;
  guide: SkillGuide;
  existingProgress?: LearnerSkillProgress;
  apiBaseUrl: string;
  onComplete: () => void;
  onExit: () => void;
}

export function StepByStepView({
  tenantId,
  learnerId,
  guide,
  existingProgress,
  apiBaseUrl,
  onComplete,
  onExit,
}: StepByStepViewProps) {
  const { skill, steps } = guide;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentPromptLevel, setCurrentPromptLevel] = useState(PromptLevel.FULL_PHYSICAL);
  const [guidance, setGuidance] = useState<AIGuidance | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Start session on mount
  useEffect(() => {
    async function startSession() {
      try {
        const res = await fetch(`${apiBaseUrl}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            learnerId,
            skillId: skill.id,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setSessionId(data.session.id);
        }
      } catch (err) {
        console.error('Failed to start session:', err);
      }
    }

    // Determine starting step based on existing progress
    if (existingProgress) {
      const completedSteps = existingProgress.stepProgress.filter(
        (sp) => sp.status === 'ACHIEVED'
      ).length;
      setCurrentStepIndex(Math.min(completedSteps, steps.length - 1));

      const currentStepProgress = existingProgress.stepProgress.find(
        (sp) => sp.stepId === steps[Math.min(completedSteps, steps.length - 1)]?.id
      );
      if (currentStepProgress) {
        setCurrentPromptLevel(currentStepProgress.currentPromptLevel as PromptLevel);
      }
    }

    void startSession();
  }, [apiBaseUrl, tenantId, learnerId, skill.id, existingProgress, steps]);

  // Load AI guidance when step or prompt level changes
  const loadGuidance = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiBaseUrl}/ai-coach/guidance?` +
          new URLSearchParams({
            tenantId,
            learnerId,
            skillId: skill.id,
            stepId: currentStep.id,
            currentPromptLevel,
          })
      );

      if (res.ok) {
        const data = await res.json();
        setGuidance(data.guidance);
      }
    } catch (err) {
      console.error('Failed to load guidance:', err);
    }
  }, [apiBaseUrl, tenantId, learnerId, skill.id, currentStep?.id, currentPromptLevel]);

  useEffect(() => {
    if (currentStep) {
      loadGuidance();
    }
  }, [currentStep, loadGuidance]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        fetch(`${apiBaseUrl}/sessions/${sessionId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            completedSuccessfully: currentStepIndex >= steps.length - 1,
          }),
        }).catch(console.error);
      }
    };
  }, [sessionId, apiBaseUrl, tenantId, currentStepIndex, steps.length]);

  const recordAttempt = async (success: boolean) => {
    if (!sessionId) return;

    setIsLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/sessions/${sessionId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          stepId: currentStep.id,
          promptLevel: currentPromptLevel,
          success,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newPromptLevel = data.attempt.promptLevel as PromptLevel;

        if (success) {
          if (isLastStep) {
            onComplete();
          } else {
            setCelebrationMessage(guidance?.encouragement || 'Great job! 🎉');
            setShowCelebration(true);
            setTimeout(() => {
              setShowCelebration(false);
              setCurrentStepIndex((prev) => prev + 1);
              setCurrentPromptLevel(newPromptLevel);
            }, 1500);
          }
        } else {
          setCurrentPromptLevel(newPromptLevel);
          setShowAIPanel(true);
        }
      }
    } catch (err) {
      console.error('Failed to record attempt:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const goToStep = (index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onExit}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h1 className="font-semibold text-gray-900">{skill.name}</h1>

          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`p-2 rounded-full transition-colors ${
              showAIPanel ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-100 py-3 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStepIndex
                    ? 'w-6 bg-blue-600'
                    : index < currentStepIndex
                    ? 'w-2 bg-green-500'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* AI Guidance panel */}
      {showAIPanel && guidance && (
        <AICoachPanel
          guidance={guidance}
          onDismiss={() => setShowAIPanel(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full overflow-auto">
        {/* Step title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Step {currentStepIndex + 1}: {currentStep.title}
        </h2>

        {/* Step media */}
        <div className="mb-6">
          {currentStep.videoUrl ? (
            <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden">
              <video
                src={currentStep.videoUrl}
                poster={currentStep.imageUrl}
                controls
                className="w-full h-full object-cover"
              />
            </div>
          ) : currentStep.imageUrl ? (
            <img
              src={currentStep.imageUrl}
              alt={currentStep.title}
              className="w-full h-64 object-cover rounded-xl"
            />
          ) : currentStep.symbolUrl ? (
            <div className="flex justify-center">
              <img
                src={currentStep.symbolUrl}
                alt={currentStep.title}
                className="h-48 w-48 object-contain"
              />
            </div>
          ) : (
            <div className="h-48 bg-gray-100 rounded-xl flex items-center justify-center">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
        </div>

        {/* Instruction card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 text-blue-600 mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">What to do</span>
          </div>
          <p className="text-gray-700 text-lg">{currentStep.instruction}</p>
        </div>

        {/* Prompt for current level */}
        {guidance && (
          <div className="bg-blue-50 rounded-xl p-6 mb-6 border border-blue-100">
            <div className="flex items-center gap-2 text-blue-700 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="font-medium">
                Try this ({PROMPT_LEVEL_INFO[currentPromptLevel].label})
              </span>
            </div>
            <p className="text-blue-800">{guidance.promptForLevel}</p>
          </div>
        )}

        {/* Teaching note */}
        {currentStep.teachingNote && (
          <details className="bg-gray-50 rounded-xl border border-gray-200 mb-6">
            <summary className="px-6 py-4 cursor-pointer flex items-center gap-2 text-gray-700 font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
              Teaching Tip
            </summary>
            <div className="px-6 pb-4 text-gray-600">{currentStep.teachingNote}</div>
          </details>
        )}
      </div>

      {/* Prompt level slider */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Support Level
            </span>
            <span className="text-sm text-gray-500">
              {PROMPT_LEVEL_INFO[currentPromptLevel].label}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">More Help</span>
            <input
              type="range"
              min={0}
              max={Object.keys(PromptLevel).length - 1}
              value={Object.values(PromptLevel).indexOf(currentPromptLevel)}
              onChange={(e) => {
                const levels = Object.values(PromptLevel);
                setCurrentPromptLevel(levels[parseInt(e.target.value)]);
              }}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-xs text-gray-400">Independent</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          {!isFirstStep && (
            <button
              onClick={() => goToStep(currentStepIndex - 1)}
              className="p-3 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div className="flex-1 flex gap-3 justify-end">
            <button
              onClick={() => recordAttempt(false)}
              disabled={isLoading}
              className="px-6 py-3 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Need Help
            </button>

            <button
              onClick={() => recordAttempt(true)}
              disabled={isLoading}
              className="px-6 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isLastStep ? 'Complete!' : 'I Did It!'}
            </button>
          </div>
        </div>
      </div>

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 text-center transform animate-bounce-in">
            <div className="text-6xl mb-4">⭐</div>
            <p className="text-xl font-bold text-gray-900">{celebrationMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
