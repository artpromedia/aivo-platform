'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { OnboardingStepProps } from '../../types';
import { GRADE_LEVELS, AVATAR_OPTIONS } from '../../types';

export function ProfileSetupStep({ data, onComplete, onBack }: OnboardingStepProps) {
  const [displayName, setDisplayName] = useState(data.displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(data.avatar || '');
  const [gradeLevel, setGradeLevel] = useState(data.gradeLevel || '');

  const canContinue = displayName.trim().length >= 2 && selectedAvatar && gradeLevel;

  const handleSubmit = () => {
    if (canContinue) {
      onComplete({
        displayName: displayName.trim(),
        avatar: selectedAvatar,
        gradeLevel,
      });
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
          <span className="text-4xl">
            {selectedAvatar ? AVATAR_OPTIONS.find(a => a.id === selectedAvatar)?.emoji : '👤'}
          </span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Tell us about yourself!
        </h2>
        <p className="text-gray-600">
          Let&apos;s create your learning profile
        </p>
      </motion.div>

      <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-indigo-100 space-y-8">
        {/* Name Input */}
        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-3">
            What should we call you?
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name or nickname"
            className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl
              focus:border-indigo-600 focus:outline-none focus:ring-2
              focus:ring-indigo-100 transition-all"
            maxLength={30}
          />
          {displayName && displayName.length < 2 && (
            <p className="mt-2 text-sm text-amber-600">Name should be at least 2 characters</p>
          )}
        </div>

        {/* Avatar Selection */}
        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-3">
            Choose your avatar
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {AVATAR_OPTIONS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setSelectedAvatar(avatar.id)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  selectedAvatar === avatar.id
                    ? 'border-indigo-600 bg-indigo-50 shadow-md scale-105'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                <span className="text-3xl block">{avatar.emoji}</span>
                <span className="text-xs text-gray-500 mt-1 block">
                  {avatar.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Grade Level */}
        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-3">
            What grade are you in?
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {GRADE_LEVELS.map((grade) => (
              <button
                key={grade.value}
                onClick={() => setGradeLevel(grade.value)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  gradeLevel === grade.value
                    ? 'border-indigo-600 bg-indigo-50 shadow-md'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                <span className="text-xl block">{grade.emoji}</span>
                <span className="text-xs font-medium text-gray-900 block mt-1">
                  {grade.label}
                </span>
              </button>
            ))}
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
        <button
          onClick={handleSubmit}
          disabled={!canContinue}
          className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500
            text-white text-lg font-bold rounded-xl shadow-lg hover:opacity-90 transition-all
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
