'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { OnboardingStepProps } from '../../types';

interface SensoryQuestion {
  id: string;
  emoji: string;
  question: string;
  options: { value: string; label: string; emoji: string }[];
}

const SENSORY_QUESTIONS: SensoryQuestion[] = [
  {
    id: 'soundSensitivity',
    emoji: '🔊',
    question: 'How do you feel about sounds while learning?',
    options: [
      { value: 'low', label: "I like it lively!", emoji: '🎵' },
      { value: 'medium', label: 'Some sounds are okay', emoji: '🔉' },
      { value: 'high', label: 'I prefer quiet', emoji: '🤫' },
    ],
  },
  {
    id: 'visualBusyness',
    emoji: '🎨',
    question: 'How do you like your screen to look?',
    options: [
      { value: 'minimal', label: 'Simple and clean', emoji: '⬜' },
      { value: 'moderate', label: 'Some fun details', emoji: '🌈' },
      { value: 'full', label: 'Lots of colors and pictures!', emoji: '🎪' },
    ],
  },
  {
    id: 'breakFrequency',
    emoji: '⏰',
    question: 'How often do you like to take breaks?',
    options: [
      { value: 'rarely', label: "I can focus for a long time", emoji: '🧘' },
      { value: 'sometimes', label: 'Regular short breaks', emoji: '☕' },
      { value: 'often', label: 'Lots of quick breaks', emoji: '🎯' },
    ],
  },
  {
    id: 'preferredEnvironment',
    emoji: '🏠',
    question: 'What kind of background do you like?',
    options: [
      { value: 'quiet', label: 'Complete silence', emoji: '🤫' },
      { value: 'background-music', label: 'Soft music', emoji: '🎶' },
      { value: 'nature-sounds', label: 'Nature sounds', emoji: '🌿' },
    ],
  },
  {
    id: 'lightingPreference',
    emoji: '💡',
    question: 'How bright do you like your screen?',
    options: [
      { value: 'dim', label: 'Dim and cozy', emoji: '🌙' },
      { value: 'normal', label: 'Just right', emoji: '☀️' },
      { value: 'bright', label: 'Nice and bright!', emoji: '🌟' },
    ],
  },
];

export function SensoryProfileStep({ data, onComplete, onBack }: OnboardingStepProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({
    soundSensitivity: data.soundSensitivity || '',
    visualBusyness: data.visualBusyness || '',
    breakFrequency: data.breakFrequency || '',
    preferredEnvironment: data.preferredEnvironment || '',
    lightingPreference: data.lightingPreference || '',
  });

  const question = SENSORY_QUESTIONS[currentQuestion];
  const isLastQuestion = currentQuestion === SENSORY_QUESTIONS.length - 1;
  const allAnswered = Object.values(answers).every((v) => v !== '');

  const handleSelect = (value: string) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));

    setTimeout(() => {
      if (!isLastQuestion) {
        setCurrentQuestion((prev) => prev + 1);
      }
    }, 300);
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleSubmit = () => {
    onComplete({
      soundSensitivity: answers.soundSensitivity as 'low' | 'medium' | 'high',
      visualBusyness: answers.visualBusyness as 'minimal' | 'moderate' | 'full',
      breakFrequency: answers.breakFrequency as 'rarely' | 'sometimes' | 'often',
      preferredEnvironment: answers.preferredEnvironment as 'quiet' | 'background-music' | 'nature-sounds',
      lightingPreference: answers.lightingPreference as 'dim' | 'normal' | 'bright',
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[var(--aivo-teal-100)] to-[var(--aivo-purple-100)] rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">🧠</span>
        </div>
        <h2 className="text-3xl font-bold text-[var(--aivo-brand-navy)] mb-2">
          Sensory Profile
        </h2>
        <p className="text-[var(--aivo-neutral-600)]">
          Help us create the perfect learning environment for you!
        </p>
      </motion.div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-6">
        {SENSORY_QUESTIONS.map((_, idx) => (
          <div
            key={idx}
            className={`w-3 h-3 rounded-full transition-colors ${
              idx === currentQuestion
                ? 'bg-[var(--aivo-brand-primary)]'
                : idx < currentQuestion || answers[SENSORY_QUESTIONS[idx].id]
                  ? 'bg-[var(--aivo-teal-400)]'
                  : 'bg-[var(--aivo-neutral-200)]'
            }`}
          />
        ))}
      </div>

      <motion.div
        key={currentQuestion}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="bg-white rounded-3xl shadow-xl p-8 border-2 border-[var(--aivo-teal-100)]"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[var(--aivo-teal-100)] to-[var(--aivo-purple-100)] rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">{question.emoji}</span>
          </div>
          <h3 className="text-xl font-bold text-[var(--aivo-brand-navy)]">
            {question.question}
          </h3>
        </div>

        <div className="space-y-3">
          {question.options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                answers[question.id] === option.value
                  ? 'border-[var(--aivo-brand-primary)] bg-[var(--aivo-purple-50)] shadow-md'
                  : 'border-[var(--aivo-neutral-200)] hover:border-[var(--aivo-purple-300)] hover:bg-[var(--aivo-purple-50)]'
              }`}
            >
              <span className="text-3xl">{option.emoji}</span>
              <span
                className={`font-medium ${
                  answers[question.id] === option.value
                    ? 'text-[var(--aivo-brand-primary)]'
                    : 'text-[var(--aivo-brand-navy)]'
                }`}
              >
                {option.label}
              </span>
              {answers[question.id] === option.value && (
                <span className="ml-auto text-[var(--aivo-brand-primary)]">✓</span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={handleBack}
          className="px-6 py-3 text-[var(--aivo-brand-primary)] hover:text-[var(--aivo-purple-700)]
            font-medium transition-colors"
        >
          Back
        </button>
        {(isLastQuestion || allAnswered) && (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="px-10 py-4 bg-gradient-to-r from-[var(--aivo-brand-primary)] to-[var(--aivo-purple-500)]
              text-white text-lg font-bold rounded-xl shadow-lg hover:opacity-90 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
