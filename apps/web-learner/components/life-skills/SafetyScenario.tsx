'use client';

import React, { useState } from 'react';
import {
  SafetyScenario as SafetyScenarioType,
  SafetyChoice,
  DecisionOutcome,
  SAFETY_SCENARIO_INFO,
  AIGuidance,
} from './types';

interface SafetyScenarioProps {
  readonly tenantId: string;
  readonly learnerId: string;
  readonly scenario: SafetyScenarioType;
  readonly apiBaseUrl: string;
  readonly onComplete: () => void;
  readonly onBack: () => void;
}

// Helper component for selection indicator to avoid nested ternary
function SelectionIndicator({ 
  showResult, 
  isCorrect, 
  isSelected 
}: { 
  readonly showResult: boolean; 
  readonly isCorrect: boolean; 
  readonly isSelected: boolean; 
}) {
  if (showResult) {
    return (
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isCorrect ? 'bg-green-500' : 'bg-orange-500'}`}>
        {isCorrect ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
    );
  }
  
  if (isSelected) {
    return (
      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }
  
  return <div className="w-6 h-6 rounded-full border-2 border-gray-300" />;
}

export function SafetyScenario({
  tenantId,
  learnerId,
  scenario,
  apiBaseUrl,
  onComplete,
  onBack,
}: SafetyScenarioProps) {
  const [selectedChoice, setSelectedChoice] = useState<SafetyChoice | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [outcome, setOutcome] = useState<DecisionOutcome | null>(null);
  const [coaching, setCoaching] = useState<AIGuidance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [startTime] = useState<number>(Date.now());

  const scenarioInfo = SAFETY_SCENARIO_INFO[scenario.scenarioType];

  const submitChoice = async () => {
    if (!selectedChoice) return;

    setIsLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/safety/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          learnerId,
          scenarioId: scenario.id,
          choiceId: selectedChoice.id,
          timeToDecideMs: Date.now() - startTime,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOutcome(data.attempt.outcome as DecisionOutcome);
        setHasSubmitted(true);

        // Get coaching
        try {
          const coachRes = await fetch(
            `${apiBaseUrl}/ai-coach/safety-coaching?` +
              new URLSearchParams({
                tenantId,
                learnerId,
                scenarioId: scenario.id,
                wasCorrect: String(data.attempt.outcome === DecisionOutcome.CORRECT),
              })
          );

          if (coachRes.ok) {
            const coachData = await coachRes.json();
            setCoaching(coachData.coaching);
          }
        } catch (err) {
          console.error('Failed to get coaching:', err);
        }
      }
    } catch (err) {
      console.error('Failed to submit choice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const tryAgain = () => {
    setSelectedChoice(null);
    setHasSubmitted(false);
    setOutcome(null);
    setCoaching(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
              style={{ backgroundColor: `${scenarioInfo.color}20`, color: scenarioInfo.color }}
            >
              <span>{scenarioInfo.icon}</span>
              <span>{scenarioInfo.label}</span>
            </span>
          </div>

          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Scenario image */}
        <div className="mb-6">
          {scenario.imageUrl ? (
            <img
              src={scenario.imageUrl}
              alt={scenario.title}
              className="w-full h-64 object-cover rounded-xl"
            />
          ) : (
            <div
              className="w-full h-48 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${scenarioInfo.color}20, ${scenarioInfo.color}10)`,
              }}
            >
              <span className="text-7xl">{scenarioInfo.icon}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{scenario.title}</h1>

        {/* Situation description */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">The Situation</h2>
              <p className="text-gray-700">{scenario.situationDescription}</p>
            </div>
          </div>
        </div>

        {/* Question prompt */}
        <div
          className="rounded-xl p-6 mb-6"
          style={{ backgroundColor: `${scenarioInfo.color}10` }}
        >
          <div className="flex items-center gap-3">
            <svg
              className="w-6 h-6"
              style={{ color: scenarioInfo.color }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-bold" style={{ color: scenarioInfo.color }}>
              {scenario.questionPrompt}
            </h2>
          </div>
        </div>

        {/* Choices */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What would you do?</h3>
          <div className="space-y-3">
            {scenario.choices.map((choice) => {
              const isSelected = selectedChoice?.id === choice.id;
              const showResult = hasSubmitted && isSelected;
              const isCorrect = choice.outcome === DecisionOutcome.CORRECT;

              let cardStyle = 'bg-white border-gray-200';
              if (showResult) {
                cardStyle = isCorrect
                  ? 'bg-green-50 border-green-500'
                  : 'bg-orange-50 border-orange-500';
              } else if (isSelected) {
                cardStyle = 'bg-blue-50 border-blue-500';
              }

              return (
                <button
                  key={choice.id}
                  onClick={() => {
                    if (!hasSubmitted) setSelectedChoice(choice);
                  }}
                  disabled={hasSubmitted}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${cardStyle} ${
                    hasSubmitted ? 'cursor-default' : 'hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection indicator */}
                    <div className="mt-0.5">
                      <SelectionIndicator 
                        showResult={showResult} 
                        isCorrect={isCorrect} 
                        isSelected={isSelected} 
                      />
                    </div>

                    {/* Choice content */}
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          isSelected ? 'text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        {choice.choiceText}
                      </p>
                      {choice.symbolUrl && (
                        <img
                          src={choice.symbolUrl}
                          alt=""
                          className="h-10 mt-2"
                        />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Result section */}
        {hasSubmitted && (
          <div className="space-y-4 animate-fade-in">
            {/* Result card */}
            <div
              className={`rounded-xl p-6 border ${
                outcome === DecisionOutcome.CORRECT
                  ? 'bg-green-50 border-green-500'
                  : 'bg-orange-50 border-orange-500'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">
                  {outcome === DecisionOutcome.CORRECT ? '✅' : '🤔'}
                </span>
                <div>
                  <h3
                    className={`text-lg font-bold mb-2 ${
                      outcome === DecisionOutcome.CORRECT
                        ? 'text-green-700'
                        : 'text-orange-700'
                    }`}
                  >
                    {outcome === DecisionOutcome.CORRECT
                      ? 'Great choice! 🎉'
                      : "Let's think about this"}
                  </h3>
                  <p className="text-gray-700">{selectedChoice?.feedback}</p>
                </div>
              </div>
            </div>

            {/* Correct answer (if wrong) */}
            {outcome !== DecisionOutcome.CORRECT && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-2 text-green-700 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="font-semibold">The Safest Choice</span>
                </div>
                {scenario.choices
                  .filter((c) => c.outcome === DecisionOutcome.CORRECT)
                  .map((c) => (
                    <p key={c.id} className="text-green-800">
                      ✓ {c.choiceText}
                    </p>
                  ))}
              </div>
            )}

            {/* AI Coaching */}
            {coaching && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 text-purple-600 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="font-semibold">Coach Says</span>
                </div>
                <p className="text-gray-700 mb-3">{coaching.encouragement}</p>
                {coaching.tips.length > 0 && (
                  <ul className="space-y-2">
                    {coaching.tips.map((tip) => (
                      <li key={tip} className="flex items-start gap-2 text-gray-600">
                        <span>💡</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          {hasSubmitted ? (
            <div className="flex gap-4">
              <button
                onClick={tryAgain}
                className="flex-1 px-6 py-3 rounded-full border border-gray-300 hover:bg-gray-50 font-semibold transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onComplete}
                className="flex-1 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
              >
                Continue
              </button>
            </div>
          ) : (
            <button
              onClick={submitChoice}
              disabled={!selectedChoice || isLoading}
              className="w-full px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Submitting...' : 'Submit My Answer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
