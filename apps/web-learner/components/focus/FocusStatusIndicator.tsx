'use client';

import { useState } from 'react';

import type { SelfReportedMood } from '../../lib/focus/focus-api';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface FocusStatusIndicatorProps {
  /** Whether focus monitoring is active */
  isMonitoring: boolean;
  /** Current self-reported mood */
  currentMood: SelfReportedMood | null;
  /** Current intervention suggestion level */
  suggestedIntervention: 'none' | 'light_prompt' | 'regulation_break';
  /** Callback when mood is changed */
  onMoodChange: (mood: SelfReportedMood) => void;
  /** Callback when break is requested */
  onRequestBreak: () => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOOD CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

interface MoodConfig {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
}

const MOOD_CONFIG: Record<SelfReportedMood, MoodConfig> = {
  happy: {
    emoji: '😊',
    label: 'Happy',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  okay: {
    emoji: '😐',
    label: 'Okay',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  frustrated: {
    emoji: '😤',
    label: 'Frustrated',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  tired: {
    emoji: '😴',
    label: 'Tired',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  confused: {
    emoji: '🤔',
    label: 'Confused',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Visual indicator showing focus monitoring status and mood selector.
 * Displayed in a corner of the screen during learning sessions.
 *
 * @example
 * ```tsx
 * <FocusStatusIndicator
 *   isMonitoring={true}
 *   currentMood="okay"
 *   suggestedIntervention="none"
 *   onMoodChange={handleMoodChange}
 *   onRequestBreak={handleRequestBreak}
 * />
 * ```
 */
export function FocusStatusIndicator({
  isMonitoring,
  currentMood,
  suggestedIntervention,
  onMoodChange,
  onRequestBreak,
}: FocusStatusIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  // Determine status indicator color and pulse
  const getStatusColor = () => {
    if (!isMonitoring) return 'bg-slate-400';
    if (suggestedIntervention === 'regulation_break') return 'bg-orange-500';
    if (suggestedIntervention === 'light_prompt') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const shouldPulse = suggestedIntervention !== 'none';

  const currentMoodConfig = currentMood ? MOOD_CONFIG[currentMood] : null;

  return (
    <div className="fixed right-4 top-20 z-40">
      {/* Main indicator */}
      <div className="relative">
        {/* Collapsed state - just the status dot */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-lg transition hover:shadow-xl"
          aria-label={isExpanded ? 'Collapse focus status' : 'Expand focus status'}
        >
          {/* Status dot */}
          <div className="relative">
            <div className={`h-3 w-3 rounded-full ${getStatusColor()}`} />
            {shouldPulse && (
              <div
                className={`absolute inset-0 h-3 w-3 animate-ping rounded-full ${getStatusColor()} opacity-50`}
              />
            )}
          </div>

          {/* Current mood */}
          {currentMoodConfig && (
            <span className="text-lg">{currentMoodConfig.emoji}</span>
          )}

          {/* Expand/collapse chevron */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-slate-400 transition ${isExpanded ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Expanded panel */}
        {isExpanded && (
          <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl bg-white shadow-xl">
            {/* Status section */}
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${getStatusColor()}`} />
                <span className="text-sm font-medium text-slate-700">
                  {isMonitoring ? 'Focus Monitoring Active' : 'Monitoring Paused'}
                </span>
              </div>
              {suggestedIntervention !== 'none' && (
                <p className="mt-1 text-xs text-slate-500">
                  {suggestedIntervention === 'regulation_break'
                    ? 'A break might help you refocus'
                    : 'How are you feeling?'}
                </p>
              )}
            </div>

            {/* Mood section */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">How do you feel?</span>
                <button
                  onClick={() => setShowMoodPicker(!showMoodPicker)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${
                    currentMoodConfig
                      ? `${currentMoodConfig.bgColor} ${currentMoodConfig.color}`
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <span>{currentMoodConfig?.emoji || '🤷'}</span>
                  <span>{currentMoodConfig?.label || 'Select'}</span>
                </button>
              </div>

              {/* Mood picker */}
              {showMoodPicker && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(Object.keys(MOOD_CONFIG) as SelfReportedMood[]).map((mood) => {
                    const config = MOOD_CONFIG[mood];
                    const isSelected = currentMood === mood;
                    return (
                      <button
                        key={mood}
                        onClick={() => {
                          onMoodChange(mood);
                          setShowMoodPicker(false);
                        }}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${
                          isSelected
                            ? `${config.bgColor} ${config.color} ring-2 ring-offset-1`
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        aria-pressed={isSelected}
                      >
                        <span>{config.emoji}</span>
                        <span>{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Break button */}
            <div className="border-t border-slate-100 px-4 py-3">
              <button
                onClick={() => {
                  onRequestBreak();
                  setIsExpanded(false);
                }}
                className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-purple-600"
              >
                Take a Break
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
