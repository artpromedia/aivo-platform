'use client';

/**
 * GroundingExercise Component
 * 5-4-3-2-1 Grounding technique for sensory awareness
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GROUNDING_STEPS, type GradeBand, type GroundingStep } from '@/lib/self-regulation/regulation-types';

// ============================================================================
// Types
// ============================================================================

interface GroundingExerciseProps {
  gradeBand: GradeBand;
  onComplete: () => void;
  onCancel?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function GroundingExercise({
  gradeBand,
  onComplete,
  onCancel,
}: Readonly<GroundingExerciseProps>) {
  const { t } = useTranslation('learner');
  // State
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentItemIndex, setCurrentItemIndex] = useState<number>(0);
  const [userInputs, setUserInputs] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [phase, setPhase] = useState<'intro' | 'exercise' | 'transition' | 'complete'>('intro');
  const [showHint, setShowHint] = useState<boolean>(false);

  // Get current step
  const currentStep = GROUNDING_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === GROUNDING_STEPS.length - 1;
  const isLastItem = currentItemIndex === currentStep.count - 1;
  const totalItems = GROUNDING_STEPS.reduce((sum, step) => sum + step.count, 0);
  const completedItems = GROUNDING_STEPS.slice(0, currentStepIndex).reduce(
    (sum, step) => sum + step.count,
    0
  ) + currentItemIndex;

  // Get age-appropriate text from i18n
  const getText = useCallback(
    (key: string): string => t(`grounding.${gradeBand}.${key}`),
    [gradeBand, t]
  );

  // Handle input submission
  const handleSubmit = useCallback(() => {
    if (!currentInput.trim() && !showHint) {
      return; // Require input unless using hint/skip
    }

    const input = currentInput.trim() || `(${currentStep.examples[currentItemIndex] || 'skipped'})`;
    setUserInputs((prev) => [...prev, input]);
    setCurrentInput('');
    setShowHint(false);

    if (isLastItem) {
      if (isLastStep) {
        setPhase('complete');
      } else {
        // Show transition before next step
        setPhase('transition');
      }
    } else {
      setCurrentItemIndex((prev) => prev + 1);
    }
  }, [currentInput, currentStep, currentItemIndex, isLastItem, isLastStep, showHint]);

  // Handle skip
  const handleSkip = useCallback(() => {
    setCurrentInput('');
    setShowHint(false);
    setUserInputs((prev) => [...prev, '(skipped)']);

    if (isLastItem) {
      if (isLastStep) {
        setPhase('complete');
      } else {
        setPhase('transition');
      }
    } else {
      setCurrentItemIndex((prev) => prev + 1);
    }
  }, [isLastItem, isLastStep]);

  // Move to next step after transition
  const proceedToNextStep = useCallback(() => {
    setCurrentStepIndex((prev) => prev + 1);
    setCurrentItemIndex(0);
    setPhase('exercise');
  }, []);

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && currentInput.trim()) {
        handleSubmit();
      }
    },
    [currentInput, handleSubmit]
  );

  // ============================================================================
  // Render - Intro
  // ============================================================================

  if (phase === 'intro') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-6">
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-slate-600 hover:text-slate-900"
            >
              {t('grounding.back')}
            </button>
          )}
          <div className="w-12" />
        </div>

        {/* Content */}
        <div className="text-center">
          <span className="text-6xl block mb-4">🌿</span>
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            {getText('introTitle')}
          </h2>
          <p className="text-slate-600 mb-6">{getText('introDesc')}</p>

          {/* Steps preview */}
          <div className="flex justify-center gap-2 mb-6">
            {GROUNDING_STEPS.map((step, index) => (
              <div
                key={step.sense}
                className={`flex items-center justify-center w-10 h-10 rounded-full text-xl ${step.color}`}
              >
                {step.emoji}
              </div>
            ))}
          </div>

          <p className="text-sm text-slate-500 mb-6">
            {getText('stepsPreview')}
          </p>

          <button
            onClick={() => setPhase('exercise')}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            {getText('startBtn')}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render - Transition between steps
  // ============================================================================

  if (phase === 'transition') {
    const nextStep = GROUNDING_STEPS[currentStepIndex + 1];

    return (
      <div
        className={`rounded-xl shadow-lg p-6 max-w-md mx-auto text-center ${nextStep.color.replace(
          'text-',
          'bg-'
        )} bg-opacity-20`}
      >
        <span className="text-6xl block mb-4">{nextStep.emoji}</span>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          {getText('transitionTitle')}
        </h2>
        <p className="text-slate-600 mb-4">
          {t(`grounding.${gradeBand}.transitionDesc`, { count: nextStep.count, sense: nextStep.sense })}
        </p>

        <button
          onClick={proceedToNextStep}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
        >
          {getText('nextBtn')}
        </button>
      </div>
    );
  }

  // ============================================================================
  // Render - Complete
  // ============================================================================

  if (phase === 'complete') {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 max-w-md mx-auto text-center">
        <span className="text-6xl block mb-4">🌟</span>
        <h2 className="text-2xl font-semibold text-slate-900 mb-3">
          {getText('completeTitle')}
        </h2>
        <p className="text-slate-600 mb-6">{getText('completeDesc')}</p>

        {/* Summary of what they noticed */}
        <div className="bg-white rounded-lg p-4 mb-6 text-left">
          <p className="text-sm font-medium text-slate-700 mb-3">
            {getText('summaryLabel')}
          </p>
          <div className="space-y-2">
            {GROUNDING_STEPS.map((step, stepIdx) => {
              const stepInputs = userInputs.slice(
                GROUNDING_STEPS.slice(0, stepIdx).reduce((sum, s) => sum + s.count, 0),
                GROUNDING_STEPS.slice(0, stepIdx + 1).reduce((sum, s) => sum + s.count, 0)
              );
              return (
                <div key={step.sense} className="flex items-start gap-2">
                  <span>{step.emoji}</span>
                  <span className="text-sm text-slate-600">
                    {stepInputs.filter((i) => !i.includes('skipped')).join(', ') || '(skipped)'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onComplete}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
        >
          {getText('doneBtn')}
        </button>
      </div>
    );
  }

  // ============================================================================
  // Render - Exercise
  // ============================================================================

  return (
    <div className={`rounded-xl shadow-lg p-6 max-w-md mx-auto ${currentStep.color.split(' ')[0]} bg-opacity-30`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onCancel}
          className="text-slate-600 hover:text-slate-900 text-sm"
        >
          {t('grounding.exit')}
        </button>
        <span className="text-sm text-slate-600">
          {t('grounding.progressOf', { current: completedItems + 1, total: totalItems })}
        </span>
        <div className="w-12" />
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/50 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((completedItems + 1) / totalItems) * 100}%` }}
        />
      </div>

      {/* Step indicator */}
      <div className="flex justify-center gap-2 mb-6">
        {GROUNDING_STEPS.map((step, index) => (
          <div
            key={step.sense}
            className={`flex items-center justify-center w-10 h-10 rounded-full text-xl transition-all ${
              index === currentStepIndex
                ? `${step.color} ring-2 ring-offset-2 ring-current scale-110`
                : index < currentStepIndex
                ? 'bg-green-100 text-green-600'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {index < currentStepIndex ? '✓' : step.emoji}
          </div>
        ))}
      </div>

      {/* Current step content */}
      <div className="text-center mb-6">
        <span className="text-5xl block mb-4">{currentStep.emoji}</span>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          {currentStep.instruction}
        </h2>
        <p className="text-slate-600">
          {t(`grounding.${gradeBand}.itemOf`, { current: currentItemIndex + 1, total: currentStep.count })}
        </p>
      </div>

      {/* Input area */}
      <div className="space-y-3 mb-6">
        <input
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t(`grounding.${gradeBand}.inputPlaceholder`, { sense: currentStep.sense })}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          autoFocus
        />

        {/* Hint button */}
        {!showHint && (
          <button
            onClick={() => setShowHint(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            {getText('needHelp')}
          </button>
        )}

        {/* Hint display */}
        {showHint && (
          <div className="p-3 bg-white rounded-lg text-sm text-slate-600">
            <p className="font-medium mb-1">
              {getText('hintLabel')}
            </p>
            <p>{currentStep.examples.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSkip}
          className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
        >
          {getText('skipBtn')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!currentInput.trim()}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {getText('nextBtn')}
        </button>
      </div>

      {/* What you've found so far */}
      {userInputs.length > 0 && (
        <div className="mt-6 p-3 bg-white/50 rounded-lg">
          <p className="text-xs text-slate-500 mb-2">
            {getText('foundLabel')}
          </p>
          <div className="flex flex-wrap gap-2">
            {userInputs
              .filter((input) => !input.includes('skipped'))
              .map((input, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-white rounded text-xs text-slate-700"
                >
                  {input}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GroundingExercise;
