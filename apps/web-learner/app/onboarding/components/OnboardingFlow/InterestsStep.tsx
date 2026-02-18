'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { OnboardingStepProps } from '../../types';
import { SUBJECT_INTERESTS, HOBBY_OPTIONS, LEARNING_GOALS } from '../../types';

type InterestCategory = 'subjects' | 'hobbies' | 'goals';

interface CategoryConfig {
  id: InterestCategory;
  title: string;
  subtitle: string;
  emoji: string;
  minSelection: number;
  options: { id: string; emoji: string; label: string }[];
  dataKey: 'favoriteSubjects' | 'hobbies' | 'learningGoals';
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'subjects',
    title: 'What subjects do you enjoy?',
    subtitle: 'Pick at least 2 that you like!',
    emoji: '📚',
    minSelection: 2,
    options: SUBJECT_INTERESTS,
    dataKey: 'favoriteSubjects',
  },
  {
    id: 'hobbies',
    title: 'What do you like to do for fun?',
    subtitle: 'Pick as many as you want!',
    emoji: '🎮',
    minSelection: 1,
    options: HOBBY_OPTIONS,
    dataKey: 'hobbies',
  },
  {
    id: 'goals',
    title: 'What are your learning goals?',
    subtitle: 'What do you want to achieve?',
    emoji: '🎯',
    minSelection: 1,
    options: LEARNING_GOALS,
    dataKey: 'learningGoals',
  },
];

export function InterestsStep({ data, onComplete, onBack }: OnboardingStepProps) {
  const [currentCategory, setCurrentCategory] = useState(0);
  const [selections, setSelections] = useState({
    favoriteSubjects: data.favoriteSubjects || [],
    hobbies: data.hobbies || [],
    learningGoals: data.learningGoals || [],
  });

  const category = CATEGORIES[currentCategory];
  const currentSelections = selections[category.dataKey];
  const canContinue = currentSelections.length >= category.minSelection;
  const isLastCategory = currentCategory === CATEGORIES.length - 1;

  const toggleSelection = (id: string) => {
    setSelections((prev) => {
      const current = prev[category.dataKey];
      const newSelection = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      return { ...prev, [category.dataKey]: newSelection };
    });
  };

  const handleContinue = () => {
    if (isLastCategory) {
      onComplete(selections);
    } else {
      setCurrentCategory((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentCategory > 0) {
      setCurrentCategory((prev) => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">{category.emoji}</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {category.title}
        </h2>
        <p className="text-gray-600">{category.subtitle}</p>
      </motion.div>

      {/* Progress indicator */}
      <div className="flex justify-center gap-2 mb-6">
        {CATEGORIES.map((cat, idx) => (
          <div
            key={cat.id}
            className={`w-3 h-3 rounded-full transition-colors ${
              idx === currentCategory
                ? 'bg-indigo-600'
                : idx < currentCategory
                  ? 'bg-indigo-400'
                  : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <motion.div
        key={category.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white rounded-3xl shadow-xl p-6 border-2 border-indigo-100"
      >
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {category.options.map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => toggleSelection(option.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                currentSelections.includes(option.id)
                  ? 'border-indigo-600 bg-indigo-50 shadow-md scale-105'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              <span className="text-3xl block mb-1">{option.emoji}</span>
              <span
                className={`text-xs font-medium block ${
                  currentSelections.includes(option.id)
                    ? 'text-indigo-600'
                    : 'text-gray-600'
                }`}
              >
                {option.label}
              </span>
              {currentSelections.includes(option.id) && (
                <span className="absolute top-1 right-1 text-indigo-600 text-sm">
                  ✓
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {currentSelections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 p-4 bg-indigo-50 rounded-xl"
          >
            <p className="text-sm text-indigo-700">
              <span className="font-semibold">{currentSelections.length}</span> selected
              {currentSelections.length < category.minSelection && (
                <span className="ml-2">(need at least {category.minSelection})</span>
              )}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={handleBack}
          className="px-6 py-3 text-indigo-600 hover:text-indigo-700
            font-medium transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500
            text-white text-lg font-bold rounded-xl shadow-lg hover:opacity-90 transition-all
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLastCategory ? 'Continue' : 'Next'}
        </button>
      </div>
    </div>
  );
}
