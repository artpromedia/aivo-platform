'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { BreakSuggestionProps } from './types';

const BREAK_OPTIONS = [
  {
    id: 'game',
    emoji: '🎮',
    title: 'Play a Game',
    description: 'A quick game can help you refocus',
    href: '/games/picker',
  },
  {
    id: 'breathing',
    emoji: '🧘',
    title: 'Breathing Exercise',
    description: 'Calm your mind with deep breaths',
    href: '/focus/breathing',
  },
  {
    id: 'movement',
    emoji: '💃',
    title: 'Movement Break',
    description: 'Stretch and move your body',
    href: '/focus/movement',
  },
];

export function BreakSuggestion({
  onTakeBreak,
  onDismiss,
  breakType,
}: BreakSuggestionProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(
    breakType || null
  );

  const handleSelectOption = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleTakeBreak = () => {
    if (selectedOption) {
      const option = BREAK_OPTIONS.find(o => o.id === selectedOption);
      if (option) {
        window.location.href = option.href;
      }
    }
    onTakeBreak();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="inline-block text-6xl mb-4"
          >
            🧠
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Time for a brain break!
          </h2>
          <p className="text-gray-600">
            You&apos;ve been working hard! A quick break can help you refocus and learn better.
          </p>
        </div>

        {/* Break options */}
        <div className="space-y-3 mb-6">
          {BREAK_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelectOption(option.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${
                selectedOption === option.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <span className="text-3xl">{option.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{option.title}</p>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
              {selectedOption === option.id && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-purple-500 text-xl"
                >
                  ✓
                </motion.span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-3 px-6 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
          >
            Keep Learning
          </button>
          <button
            onClick={handleTakeBreak}
            disabled={!selectedOption}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
              selectedOption
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Take a Break
          </button>
        </div>

        {/* Skip hint */}
        <p className="text-center text-sm text-gray-400 mt-4">
          Taking breaks helps you learn better! 🌟
        </p>
      </motion.div>
    </motion.div>
  );
}
