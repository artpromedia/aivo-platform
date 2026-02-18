'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { OnboardingStepProps, OnboardingData } from '../../types';

interface AccessibilityOption {
  id: keyof OnboardingData;
  emoji: string;
  title: string;
  description: string;
  type: 'toggle' | 'select';
  options?: { value: string; label: string }[];
}

const ACCESSIBILITY_OPTIONS: AccessibilityOption[] = [
  {
    id: 'textSize',
    emoji: '🔤',
    title: 'Text Size',
    description: 'Choose how big you want the text to be',
    type: 'select',
    options: [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' },
      { value: 'extra-large', label: 'Extra Large' },
    ],
  },
  {
    id: 'highContrast',
    emoji: '🎨',
    title: 'High Contrast',
    description: 'Makes colors easier to see',
    type: 'toggle',
  },
  {
    id: 'reducedMotion',
    emoji: '🌀',
    title: 'Reduce Motion',
    description: 'Turns off animations and moving things',
    type: 'toggle',
  },
  {
    id: 'dyslexiaFont',
    emoji: '📖',
    title: 'Dyslexia-Friendly Font',
    description: 'Uses a special font that\'s easier to read',
    type: 'toggle',
  },
  {
    id: 'screenReader',
    emoji: '🔊',
    title: 'Screen Reader Support',
    description: 'Optimizes the app for screen readers',
    type: 'toggle',
  },
  {
    id: 'colorBlindMode',
    emoji: '👁️',
    title: 'Color Vision Support',
    description: 'Adjusts colors for different types of color vision',
    type: 'select',
    options: [
      { value: 'none', label: 'Standard Colors' },
      { value: 'protanopia', label: 'Red-Green (Protanopia)' },
      { value: 'deuteranopia', label: 'Red-Green (Deuteranopia)' },
      { value: 'tritanopia', label: 'Blue-Yellow (Tritanopia)' },
    ],
  },
  {
    id: 'readingSpeed',
    emoji: '⏱️',
    title: 'Reading Speed',
    description: 'How fast should text appear and auto-read?',
    type: 'select',
    options: [
      { value: 'slow', label: 'Slow & Steady' },
      { value: 'medium', label: 'Just Right' },
      { value: 'fast', label: 'Quick Reader' },
    ],
  },
];

export function AccessibilityStep({ data, onComplete, onBack }: OnboardingStepProps) {
  const [settings, setSettings] = useState({
    textSize: data.textSize || 'medium',
    highContrast: data.highContrast || false,
    reducedMotion: data.reducedMotion || false,
    dyslexiaFont: data.dyslexiaFont || false,
    screenReader: data.screenReader || false,
    colorBlindMode: data.colorBlindMode || 'none',
    readingSpeed: data.readingSpeed || 'medium',
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelect = (key: keyof typeof settings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = () => {
    onComplete(settings);
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">♿</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Your Learning Preferences
        </h2>
        <p className="text-gray-600">
          Let&apos;s make AIVO work best for you. You can change these anytime!
        </p>
      </motion.div>

      <div className="bg-white rounded-3xl shadow-xl p-6 border-2 border-indigo-100 space-y-4">
        {ACCESSIBILITY_OPTIONS.map((option, index) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-xl border-2 border-gray-100 hover:border-indigo-200 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">{option.emoji}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {option.title}
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  {option.description}
                </p>

                {option.type === 'toggle' ? (
                  <button
                    onClick={() => handleToggle(option.id as keyof typeof settings)}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      settings[option.id as keyof typeof settings]
                        ? 'bg-indigo-600'
                        : 'bg-gray-300'
                    }`}
                    role="switch"
                    aria-checked={!!settings[option.id as keyof typeof settings]}
                  >
                    <span
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                        settings[option.id as keyof typeof settings]
                          ? 'translate-x-7'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {option.options?.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          handleSelect(option.id as keyof typeof settings, opt.value)
                        }
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          settings[option.id as keyof typeof settings] === opt.value
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-indigo-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-indigo-50 rounded-2xl">
        <p className="text-sm text-indigo-700 text-center">
          Don&apos;t worry if you&apos;re not sure - you can always change these settings later!
        </p>
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
          className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500
            text-white text-lg font-bold rounded-xl shadow-lg hover:opacity-90 transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
