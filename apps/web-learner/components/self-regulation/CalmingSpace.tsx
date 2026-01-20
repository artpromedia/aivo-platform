'use client';

/**
 * CalmingSpace Component
 * A soothing environment with calming activities for emotional regulation
 */

import { useState, useCallback, useEffect } from 'react';
import type { GradeBand, CalmingActivity, CalmingActivityType } from '@/lib/self-regulation/regulation-types';

// ============================================================================
// Types
// ============================================================================

interface CalmingSpaceProps {
  gradeBand: GradeBand;
  onActivitySelect: (activityType: CalmingActivityType) => void;
  onExit: () => void;
}

// ============================================================================
// Calming Activities Data
// ============================================================================

const CALMING_ACTIVITIES: CalmingActivity[] = [
  {
    id: 'breathing',
    name: 'Breathing Exercises',
    type: 'breathing',
    description: 'Slow, guided breathing to calm your body',
    emoji: '🌬️',
    duration: '2-3 min',
    gradeBands: ['K5', 'G6_8', 'G9_12'],
  },
  {
    id: 'grounding',
    name: '5-4-3-2-1 Grounding',
    type: 'grounding',
    description: 'Use your senses to feel present and calm',
    emoji: '🌿',
    duration: '3-5 min',
    gradeBands: ['K5', 'G6_8', 'G9_12'],
  },
  {
    id: 'sounds',
    name: 'Calming Sounds',
    type: 'sounds',
    description: 'Listen to peaceful nature sounds',
    emoji: '🎵',
    duration: 'Any time',
    gradeBands: ['K5', 'G6_8', 'G9_12'],
  },
  {
    id: 'visuals',
    name: 'Visual Calm',
    type: 'visuals',
    description: 'Watch soothing animations and colors',
    emoji: '🌈',
    duration: 'Any time',
    gradeBands: ['K5', 'G6_8', 'G9_12'],
  },
  {
    id: 'movement',
    name: 'Gentle Movement',
    type: 'movement',
    description: 'Simple stretches and movements',
    emoji: '🧘',
    duration: '2-3 min',
    gradeBands: ['K5', 'G6_8', 'G9_12'],
  },
];

const SOUND_OPTIONS = [
  { id: 'rain', name: 'Rain', emoji: '🌧️' },
  { id: 'ocean', name: 'Ocean Waves', emoji: '🌊' },
  { id: 'birds', name: 'Birds', emoji: '🐦' },
  { id: 'fire', name: 'Fireplace', emoji: '🔥' },
  { id: 'wind', name: 'Gentle Wind', emoji: '🍃' },
];

const VISUAL_OPTIONS = [
  { id: 'lava', name: 'Lava Lamp', color: 'from-purple-500 to-pink-500' },
  { id: 'aurora', name: 'Aurora', color: 'from-green-400 to-blue-500' },
  { id: 'sunset', name: 'Sunset', color: 'from-orange-400 to-pink-500' },
  { id: 'ocean', name: 'Ocean', color: 'from-blue-400 to-cyan-500' },
];

// ============================================================================
// Component
// ============================================================================

export function CalmingSpace({
  gradeBand,
  onActivitySelect,
  onExit,
}: Readonly<CalmingSpaceProps>) {
  // State
  const [lowStimulationMode, setLowStimulationMode] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<CalmingActivity | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [selectedVisual, setSelectedVisual] = useState<string | null>(null);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  // Handle activity selection
  const handleActivitySelect = useCallback(
    (activity: CalmingActivity) => {
      if (activity.type === 'sounds' || activity.type === 'visuals') {
        setSelectedActivity(activity);
      } else {
        onActivitySelect(activity.type);
      }
    },
    [onActivitySelect]
  );

  // Set timer duration
  const setTimerDuration = useCallback((minutes: number) => {
    setTimerSeconds(minutes * 60);
    setIsTimerRunning(true);
  }, []);

  // Format timer display
  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter activities by grade band
  const availableActivities = CALMING_ACTIVITIES.filter((activity) =>
    activity.gradeBands.includes(gradeBand)
  );

  // Get background classes based on mode
  const getBgClasses = () => {
    if (lowStimulationMode) {
      return 'bg-slate-100';
    }
    return 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50';
  };

  // ============================================================================
  // Render - Sound Player
  // ============================================================================

  if (selectedActivity?.type === 'sounds') {
    return (
      <div className={`min-h-[400px] rounded-xl p-6 ${getBgClasses()}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setSelectedActivity(null)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <h2 className="text-lg font-semibold text-slate-900">Calming Sounds</h2>
          <div className="w-16" />
        </div>

        {/* Sound options */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {SOUND_OPTIONS.map((sound) => (
            <button
              key={sound.id}
              onClick={() => setSelectedSound(selectedSound === sound.id ? null : sound.id)}
              className={`p-4 rounded-xl text-center transition-all ${
                selectedSound === sound.id
                  ? 'bg-indigo-100 border-2 border-indigo-400 shadow-md'
                  : 'bg-white border-2 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-4xl block mb-2">{sound.emoji}</span>
              <span className="text-sm font-medium text-slate-700">{sound.name}</span>
            </button>
          ))}
        </div>

        {/* Timer */}
        {selectedSound && (
          <div className="bg-white rounded-xl p-4 mb-6">
            <p className="text-sm text-slate-600 mb-3">Set a timer (optional):</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 5, 10].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => setTimerDuration(minutes)}
                  className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium hover:bg-slate-200"
                >
                  {minutes} min
                </button>
              ))}
            </div>

            {timerSeconds > 0 && (
              <div className="mt-4 text-center">
                <p className="text-3xl font-mono font-bold text-indigo-600">
                  {formatTimer(timerSeconds)}
                </p>
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="mt-2 px-4 py-1 text-sm text-slate-600 hover:text-slate-900"
                >
                  {isTimerRunning ? 'Pause' : 'Resume'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Playing indicator */}
        {selectedSound && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full">
              <span className="animate-pulse text-green-600">🎵</span>
              <span className="text-green-700 font-medium">
                Playing: {SOUND_OPTIONS.find((s) => s.id === selectedSound)?.name}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              (Audio would play from sound library)
            </p>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // Render - Visual Calm
  // ============================================================================

  if (selectedActivity?.type === 'visuals') {
    return (
      <div className={`min-h-[400px] rounded-xl p-6 ${getBgClasses()}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setSelectedActivity(null)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <h2 className="text-lg font-semibold text-slate-900">Visual Calm</h2>
          <div className="w-16" />
        </div>

        {/* Visual options */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {VISUAL_OPTIONS.map((visual) => (
            <button
              key={visual.id}
              onClick={() => setSelectedVisual(selectedVisual === visual.id ? null : visual.id)}
              className={`h-24 rounded-xl bg-gradient-to-r ${visual.color} text-white font-medium transition-all ${
                selectedVisual === visual.id
                  ? 'ring-4 ring-indigo-400 ring-offset-2 scale-105'
                  : 'hover:scale-102'
              }`}
            >
              {visual.name}
            </button>
          ))}
        </div>

        {/* Visual display */}
        {selectedVisual && (
          <div
            className={`h-64 rounded-xl bg-gradient-to-r ${
              VISUAL_OPTIONS.find((v) => v.id === selectedVisual)?.color
            } animate-pulse flex items-center justify-center`}
          >
            <p className="text-white text-lg font-medium opacity-75">
              Breathe and relax...
            </p>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // Render - Main Calming Space
  // ============================================================================

  return (
    <div className={`min-h-[400px] rounded-xl ${getBgClasses()} transition-colors duration-500`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200/50">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {gradeBand === 'K5' ? 'Calming Space' : 'Calming Space'}
          </h2>
          <div className="flex items-center gap-3">
            {/* Low stimulation toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-slate-600">
                {lowStimulationMode ? '🌙' : '☀️'}
              </span>
              <div
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  lowStimulationMode ? 'bg-slate-400' : 'bg-indigo-400'
                }`}
                onClick={() => setLowStimulationMode(!lowStimulationMode)}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    lowStimulationMode ? 'left-0.5' : 'left-5'
                  }`}
                />
              </div>
              <span className="text-xs text-slate-500">Quiet mode</span>
            </label>
          </div>
        </div>
        <p className="mt-2 text-slate-600">
          {gradeBand === 'K5'
            ? 'Take a break and feel calm'
            : 'Take a moment to relax and reset'}
        </p>
      </div>

      {/* Activities grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableActivities.map((activity) => (
            <button
              key={activity.id}
              onClick={() => handleActivitySelect(activity)}
              className={`p-5 rounded-xl text-left transition-all ${
                lowStimulationMode
                  ? 'bg-white border border-slate-200 hover:border-slate-300'
                  : 'bg-white/80 backdrop-blur border border-white/50 hover:bg-white hover:shadow-md'
              }`}
            >
              <span className="text-3xl block mb-3">{activity.emoji}</span>
              <h3 className="font-semibold text-slate-900">{activity.name}</h3>
              <p className="text-sm text-slate-600 mt-1">{activity.description}</p>
              <p className="text-xs text-slate-500 mt-2">{activity.duration}</p>
            </button>
          ))}
        </div>

        {/* Quick tips section */}
        <div className={`mt-6 p-4 rounded-xl ${lowStimulationMode ? 'bg-white' : 'bg-white/60'}`}>
          <h3 className="font-medium text-slate-900 mb-2">
            {gradeBand === 'K5' ? '💡 Try this!' : '💡 Quick tip'}
          </h3>
          <p className="text-sm text-slate-600">
            {gradeBand === 'K5'
              ? 'Take 3 deep breaths. In through your nose, out through your mouth!'
              : 'Even one minute of deep breathing can help activate your relaxation response.'}
          </p>
        </div>

        {/* Exit button */}
        <div className="mt-6 text-center">
          <button
            onClick={onExit}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            {gradeBand === 'K5' ? "I'm ready to learn again!" : "I'm ready to continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CalmingSpace;
