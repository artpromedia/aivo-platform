'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { OnboardingStepProps } from '../../types';

const ASSESSMENT_FEATURES = [
  {
    emoji: '🎯',
    title: "It's Not a Test!",
    description: "There are no wrong answers. We just want to learn how you think!",
  },
  {
    emoji: '🎮',
    title: 'Fun Activities',
    description: 'Play games and answer questions about different subjects.',
  },
  {
    emoji: '⏱️',
    title: 'Take Your Time',
    description: "About 15-20 minutes. You can take breaks whenever you need!",
  },
  {
    emoji: '🧠',
    title: 'Build Your Brain',
    description: "AIVO will create a special learning brain just for you!",
  },
];

export function BaselineAssessmentIntro({ onComplete, onBack }: OnboardingStepProps) {
  const [isReady, setIsReady] = useState(false);

  const handleStart = () => {
    setIsReady(true);
    // Small delay for animation
    setTimeout(() => {
      onComplete({});
    }, 500);
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <motion.div
          animate={isReady ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
          className="w-28 h-28 mx-auto bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-xl"
        >
          <span className="text-6xl">🧪</span>
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Ready for an Adventure?
        </h2>
        <p className="text-lg text-gray-600">
          Let&apos;s discover what you know so AIVO can help you learn better!
        </p>
      </motion.div>

      <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-indigo-100">
        <h3 className="text-xl font-bold text-gray-900 text-center mb-6">
          Here&apos;s what to expect:
        </h3>

        <div className="grid gap-4">
          {ASSESSMENT_FEATURES.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-4 p-4 bg-indigo-50 rounded-xl"
            >
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-3xl">{feature.emoji}</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900">
                  {feature.title}
                </h4>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-indigo-50 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <p className="text-sm text-gray-700">
              <strong>Tip:</strong> Find a quiet spot and make sure you&apos;re comfortable.
              You can always pause if you need a break!
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={onBack}
          className="px-6 py-3 text-indigo-600 hover:text-indigo-700
            font-medium transition-colors"
        >
          Back
        </button>
        <motion.button
          onClick={handleStart}
          disabled={isReady}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-12 py-5 bg-gradient-to-r from-indigo-500 to-indigo-600
            text-white text-xl font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all
            disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isReady ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Getting Ready...
            </span>
          ) : (
            "Let's Go!"
          )}
        </motion.button>
      </div>
    </div>
  );
}
